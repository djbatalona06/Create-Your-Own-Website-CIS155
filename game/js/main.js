// Starts everything and runs the main loop.
//
// States: loading -> title -> intro -> playing <-> paused
//                                         |-> clear (next dream)
//                                         |-> dead  (retry)
//                                         |-> win   (back to title)
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { LEVELS } from './world/levels.js';
import { buildEnemyFrames, buildPickupFrames, buildMiscFrames, buildWeaponFrames } from './entities/sprites.js';
import { input } from './input/input.js';
import { setupTouch } from './input/touch.js';
import { setupKeyboard } from './input/keyboard.js';
import { createHud } from './ui/hud.js';
import { setupMenus } from './ui/menus.js';
import { loadSave, storeSave } from './save.js';
import { audio } from './audio/audio.js';
import { stopMusic } from './audio/music.js';

const STEP = 1 / 60; // game logic always runs at 60 steps per second

const save = loadSave();
const settings = save.settings;
const canvas = document.getElementById('view');
const renderer = new Renderer(canvas);
renderer.setQuality(settings.quality);

const frames = {
  enemies: buildEnemyFrames(),
  pickups: buildPickupFrames(),
  misc: buildMiscFrames(),
  weapons: buildWeaponFrames(),
};

const hud = createHud();
let state = 'loading';
let carry = null; // health/weapons carried between dreams
let optionsReturn = 'title';
let rotateDismissed = false;

const isPlaying = () => state === 'playing';
const touch = setupTouch(settings);
const keyboard = setupKeyboard(canvas, settings, isPlaying);
const coarse = window.matchMedia('(pointer: coarse)');
let usingTouch = coarse.matches;
window.addEventListener('touchstart', () => (usingTouch = true), { passive: true, once: true });

const game = new Game({
  renderer,
  frames,
  settings,
  hooks: {
    message: (text, seconds) => hud.message(text, seconds),
    hud: (s) => hud.update(s),
    levelClear: (stats, nextCarry) => {
      const id = LEVELS[game.levelIndex].id;
      if (!save.best[id] || stats.time < save.best[id]) save.best[id] = Math.floor(stats.time);
      save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, game.levelIndex + 2));
      storeSave(save);
      carry = nextCarry;
      menus.fillStats('clear', stats, save.best[id]);
      setTimeout(() => enter('clear'), 600);
    },
    death: (stats) => {
      menus.fillStats('dead', stats);
      enter('dead');
    },
    win: (stats) => {
      const id = LEVELS[game.levelIndex].id;
      if (!save.best[id] || stats.time < save.best[id]) save.best[id] = Math.floor(stats.time);
      storeSave(save);
      menus.fillStats('win', stats);
      enter('win');
    },
  },
});

function applySettings() {
  audio.setVolumes(settings.musicVol, settings.sfxVol);
  renderer.setQuality(settings.quality);
  touch.applySettings();
}

function startLevel(index, keepCarry) {
  game.load(index, keepCarry ? carry : null);
  menus.fillIntro(LEVELS[index]);
  enter('intro');
}

function enter(next) {
  state = next;
  const inGame = next === 'playing';
  hud.show(inGame || next === 'paused');
  touch.show(inGame && usingTouch);
  if (inGame) {
    menus.hideAll();
    game.startMusic();
  } else {
    menus.show(next);
    keyboard.release();
    input.reset();
  }
  if (next === 'title') {
    menus.refreshTitle();
    hud.clearMessage();
  }
  if (next === 'dead' || next === 'win' || next === 'title') stopMusic();
  updateRotateHint();
}

// Phones in portrait get a friendly "turn me sideways" card while playing.
function updateRotateHint() {
  const portrait = window.innerHeight > window.innerWidth;
  const show = isPlaying() && usingTouch && portrait && !rotateDismissed;
  document.getElementById('screen-rotate').hidden = !show;
}

function goFullscreen() {
  if (!usingTouch || document.fullscreenElement) return;
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

const menus = setupMenus(
  {
    play: () => {
      audio.unlock();
      goFullscreen();
      carry = null;
      startLevel(0, false);
    },
    continue: () => {
      audio.unlock();
      goFullscreen();
      carry = null;
      startLevel(save.unlocked - 1, false);
    },
    levels: () => menus.show('levels'),
    pickLevel: (data) => {
      audio.unlock();
      goFullscreen();
      carry = null;
      startLevel(Number(data.level), false);
    },
    options: () => {
      optionsReturn = state === 'paused' ? 'paused' : 'title';
      menus.show('options');
    },
    optionsBack: () => (optionsReturn === 'paused' ? menus.show('paused') : menus.show('title')),
    help: () => menus.show('help'),
    back: () => enter('title'),
    begin: () => {
      audio.unlock();
      enter('playing');
    },
    resume: () => enter('playing'),
    restart: () => startLevel(game.levelIndex, false),
    quit: () => {
      game.load(0);
      enter('title');
    },
    next: () => {
      if (game.levelIndex + 1 < LEVELS.length) startLevel(game.levelIndex + 1, true);
      else enter('title');
    },
    retry: () => startLevel(game.levelIndex, false),
    rotateOk: () => {
      rotateDismissed = true;
      updateRotateHint();
    },
    settingsChanged: () => {
      applySettings();
      storeSave(save);
    },
  },
  save
);

function pause() {
  if (state !== 'playing') return;
  enter('paused');
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('resize', () => {
  renderer.resize();
  updateRotateHint();
});

// The main loop. Rendering follows the screen's refresh rate, but the game
// itself always advances in exact 1/60 s steps, so it plays the same on a
// 60 Hz phone and a 120 Hz one.
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state === 'playing') {
    if (input.takePress('pause')) pause();
    const blocked = !document.getElementById('screen-rotate').hidden;
    if (!blocked) {
      keyboard.turnHeld(dt);
      acc += dt;
      while (acc >= STEP) {
        game.update(STEP);
        acc -= STEP;
      }
    }
  } else {
    acc = 0;
    if (state === 'title' || state === 'levels' || state === 'options' || state === 'help') game.attract(dt);
  }
  game.render();
  requestAnimationFrame(frame);
}

applySettings();
game.load(0);
enter('title');
document.getElementById('screen-loading').hidden = true;
requestAnimationFrame(frame);

// Offline support: cache the game so it opens without internet next time.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Handle for the automated smoke test (game/tests/smoke.mjs). Harmless to players.
window.__neon = {
  game,
  get state() {
    return state;
  },
  startLevel: (i) => {
    audio.unlock();
    startLevel(i, false);
    enter('playing');
  },
};
