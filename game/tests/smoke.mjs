// Automated play-test in emulated phones.
//
//   1. From the repo root, start a server:  python3 -m http.server 8123
//   2. In another terminal:                 node game/tests/smoke.mjs
//
// It taps through the menus, walks and turns with fake thumbs, fires, tests
// each dream's surreal trick, and fails if the page logs any error.
// Screenshots go to SHOTS_DIR (default: your temp folder).
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const URL = process.env.GAME_URL || 'http://localhost:8123/game/';
const SHOTS = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'neon-shots');
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
};

async function run(deviceName) {
  console.log(`\n== ${deviceName} ==`);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const wait = (ms) => page.waitForTimeout(ms);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const vw = page.viewportSize().width;
  const vh = page.viewportSize().height;
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${deviceName.replace(/\W+/g, '-')}-${name}.png`) });

  await page.goto(URL);
  await page.waitForSelector('#screen-title:not([hidden])');
  await wait(600);
  await shot('0-title');
  check(true, 'title screen shows');

  await page.click('[data-action="play"]');
  await page.waitForSelector('#screen-intro:not([hidden])');
  await page.click('[data-action="begin"]');
  await wait(500);
  check((await g(() => window.__neon.state)) === 'playing', 'game starts from the menu');
  check(await page.isVisible('#touch'), 'touch controls are visible');

  // Walk: thumb down on the left half, slide up (= forward)
  const before = await g(() => ({ x: window.__neon.game.player.x, z: window.__neon.game.player.z }));
  const sx = vw * 0.2;
  const sy = vh * 0.6;
  await touch('touchStart', [{ x: sx, y: sy, id: 1 }]);
  await touch('touchMove', [{ x: sx, y: sy - 60, id: 1 }]);
  await wait(700);
  await touch('touchEnd', []);
  const after = await g(() => ({ x: window.__neon.game.player.x, z: window.__neon.game.player.z }));
  check(Math.hypot(after.x - before.x, after.z - before.z) > 0.5, `virtual stick walks the player (${Math.hypot(after.x - before.x, after.z - before.z).toFixed(2)} tiles)`);

  // Turn: drag on the right half
  const yaw0 = await g(() => window.__neon.game.player.yaw);
  await touch('touchStart', [{ x: vw * 0.6, y: vh * 0.4, id: 2 }]);
  for (let i = 1; i <= 5; i++) await touch('touchMove', [{ x: vw * 0.6 + i * 20, y: vh * 0.4, id: 2 }]);
  await touch('touchEnd', []);
  await wait(100);
  const yaw1 = await g(() => window.__neon.game.player.yaw);
  check(Math.abs(yaw1 - yaw0) > 0.2, `dragging the right side turns (${(yaw1 - yaw0).toFixed(2)} rad)`);

  // Fire: hold the FIRE button
  const fire = await page.locator('#btn-fire').boundingBox();
  await touch('touchStart', [{ x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 3 }]);
  await wait(250);
  await touch('touchEnd', []);
  check((await g(() => window.__neon.game.weapons.cooldown)) > -0.5, 'FIRE button shoots');
  await wait(300);
  await shot('1-rain-market');

  // Kiosk secret teleport (bigger on the inside)
  await g(() => {
    const p = window.__neon.game.player;
    p.x = 15.5;
    p.z = 9.5;
    p.yaw = 0;
  });
  await page.keyboard.down('KeyW');
  await wait(450);
  await page.keyboard.up('KeyW');
  const secret = await g(() => ({ z: window.__neon.game.player.z, s: window.__neon.game.stats.secrets }));
  check(secret.s === 1 && secret.z > 14, 'the kiosk teleports into the hidden hall');

  // Exit pad ends the level
  await g(() => {
    const p = window.__neon.game.player;
    p.x = 33.5;
    p.z = 11.5;
    p.yaw = Math.PI;
  });
  await page.keyboard.down('KeyW');
  await wait(400);
  await page.keyboard.up('KeyW');
  await page.waitForSelector('#screen-clear:not([hidden])', { timeout: 3000 }).catch(() => {});
  check((await g(() => window.__neon.state)) === 'clear', 'stepping on the exit clears the dream');
  await page.click('[data-action="next"]');
  await page.waitForSelector('#screen-intro:not([hidden])');
  check((await g(() => window.__neon.game.levelIndex)) === 1, '"Next Dream" loads the Static Motel');
  await page.click('[data-action="begin"]');
  await wait(800);
  await shot('2-static-motel');

  // The looping hallway
  await g(() => {
    const p = window.__neon.game.player;
    p.x = 25.6;
    p.z = 3.5;
    p.yaw = -Math.PI / 2;
  });
  await page.keyboard.down('KeyW');
  await wait(300);
  await page.keyboard.up('KeyW');
  const looped = await g(() => ({ x: window.__neon.game.player.x, n: window.__neon.game.dream.loopCount }));
  check(looped.n === 1 && looped.x < 20, `the hallway loops back (x=${looped.x.toFixed(2)})`);

  // Break the loop by poking the eye painting (north wall at column 20)
  await g(() => {
    const p = window.__neon.game.player;
    p.x = 20.5;
    p.z = 3.5;
    p.yaw = 0;
  });
  await page.keyboard.press('KeyE');
  await wait(200);
  check(await g(() => window.__neon.game.dream.eyeClosed), 'USE on the eye painting closes it');
  await wait(400);
  await shot('3-eye-closed');
  await g(() => {
    const p = window.__neon.game.player;
    p.x = 25.6;
    p.z = 3.5;
    p.yaw = -Math.PI / 2;
  });
  await page.keyboard.down('KeyW');
  await wait(400);
  await page.keyboard.up('KeyW');
  check((await g(() => window.__neon.game.player.x)) > 26, 'after the eye closes, the hallway lets you through');

  // Lucid Pill
  await g(() => (window.__neon.game.player.lucid = 10));
  await wait(900);
  await shot('4-lucid');
  check((await g(() => window.__neon.game.fx.lucid)) > 0.5, 'Lucid Pill effect ramps up');

  // Alarm Tower: breathing walls, boss gate, and the ending
  await g(() => window.__neon.startLevel(2));
  await wait(600);
  const h0 = await g(() => window.__neon.game.built.movers.map((m) => m.target).join(''));
  await wait(3800);
  const h1 = await g(() => window.__neon.game.built.movers.map((m) => m.target).join(''));
  check(h0 !== h1, 'Alarm Tower walls breathe on a timer');
  await shot('5-alarm-tower');
  await g(() => {
    const game = window.__neon.game;
    game.player.x = 20.5;
    game.player.z = 8.5;
    game.player.yaw = 0;
    game.dream.enterCell(20, 9);
  });
  await wait(1500);
  const gate = await g(() => window.__neon.game.built.movers.find((m) => m.group === 'gate').h);
  check(gate > 0.9, 'the boss gate slams shut behind you');
  await g(() => (window.__neon.game.player.hp = 1000));
  await wait(1500);
  await shot('6-the-snooze');
  await g(() => {
    const game = window.__neon.game;
    const boss = game.enemies.list.find((e) => e.type === 'snooze');
    game.enemies.damage(boss, 5000);
  });
  await page.waitForSelector('#screen-win:not([hidden])', { timeout: 6000 }).catch(() => {});
  check((await g(() => window.__neon.state)) === 'win', 'defeating The Snooze wakes you up');
  await shot('7-win');

  // Dying shows the game-over screen
  await g(() => window.__neon.startLevel(0));
  await wait(300);
  await g(() => window.__neon.game.hurtPlayer(999));
  await page.waitForSelector('#screen-dead:not([hidden])', { timeout: 4000 }).catch(() => {});
  check((await g(() => window.__neon.state)) === 'dead', 'losing all health shows game over');

  // Rough speed check (software rendering here, so real phones are faster)
  await g(() => window.__neon.startLevel(0));
  const fps = await g(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
          else resolve((n * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(tick);
      })
  );
  console.log(`  info ${fps.toFixed(0)} frames/sec in headless software rendering`);

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
}

for (const d of ['iPhone 13 landscape', 'Pixel 7 landscape']) await run(d);
console.log(`\nScreenshots: ${SHOTS}`);
if (failures) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All smoke checks passed.');
