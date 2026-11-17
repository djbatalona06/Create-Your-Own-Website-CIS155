// Level checker. Run from the repo root:  node game/tests/levels.test.mjs
// It proves every level can be finished: you can reach the exit (or the boss)
// from the start, picking up keys, opening doors, riding teleports, and breaking
// the hallway loop with the eye painting.
import { LEVELS } from '../js/world/levels.js';
import { parseLevel, WALL_CHARS } from '../js/world/levelParse.js';

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  FAIL ' + msg);
};

for (const level of LEVELS) {
  console.log(`Level ${level.id}: ${level.name}`);
  let p;
  try {
    p = parseLevel(level);
  } catch (err) {
    fail(err.message);
    continue;
  }
  const { w, h } = p;
  const key = (x, y) => y * w + x;

  // 1. The outer edge must be solid so nobody walks off the world.
  for (let x = 0; x < w; x++) {
    if (!WALL_CHARS.has(level.map[0][x]) || !WALL_CHARS.has(level.map[h - 1][x])) fail(`edge open at column ${x}`);
  }
  for (let y = 0; y < h; y++) {
    if (!WALL_CHARS.has(level.map[y][0]) || !WALL_CHARS.has(level.map[y][w - 1])) fail(`edge open at row ${y}`);
  }

  // 2. Flood fill from the start. Repeat while new keys or loop-breaks unlock more.
  const doors = new Map(p.doors.map((d) => [key(d.x, d.y), d]));
  const teleports = new Map(p.teleports.map((t) => [key(t.x, t.y), t]));
  // Gate walls only close behind you, and breathing walls open on a timer,
  // so for "can you finish it?" we treat every moving wall as passable.
  const keys = new Set();
  const brokenLoops = new Set();
  let seen;
  let grew = true;
  while (grew) {
    grew = false;
    seen = new Set([key(p.start.x, p.start.y)]);
    const queue = [[p.start.x, p.start.y]];
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = x + dx;
        let ny = y + dy;
        if (p.walls[ny][nx] !== '.') {
          // Standing next to the eye painting lets you break the loop.
          if (level.map[ny][nx] === 'E' && level.eye && !brokenLoops.has(level.eye.breakLoop)) {
            brokenLoops.add(level.eye.breakLoop);
            grew = true;
          }
          continue;
        }
        const door = doors.get(key(nx, ny));
        if (door && door.key && !keys.has(door.key)) continue;
        const tp = teleports.get(key(nx, ny));
        if (tp && !(tp.loop && brokenLoops.has(tp.loop))) {
          if (!seen.has(key(nx, ny))) seen.add(key(nx, ny));
          nx = tp.tx;
          ny = tp.ty;
        }
        if (seen.has(key(nx, ny))) continue;
        seen.add(key(nx, ny));
        queue.push([nx, ny]);
      }
    }
    for (const pk of p.pickups) {
      if ((pk.type === 'keyRed' || pk.type === 'keyBlue') && seen.has(key(pk.x, pk.y)) && !keys.has(pk.type)) {
        keys.add(pk.type);
        grew = true;
      }
    }
  }

  const goals = p.exits.length ? p.exits : p.enemies.filter((e) => e.type === 'snooze');
  if (!goals.length) fail('no exit (X) and no boss (Z)');
  for (const g of goals) {
    if (!seen.has(key(g.x, g.y))) fail(`goal at ${g.x},${g.y} cannot be reached`);
    else console.log(`  ok   goal at ${g.x},${g.y} is reachable`);
  }

  // 3. Every enemy and pickup should be reachable (otherwise it's wasted).
  for (const thing of [...p.enemies, ...p.pickups]) {
    if (!seen.has(key(thing.x, thing.y))) fail(`${thing.type} at ${thing.x},${thing.y} is unreachable`);
  }
  console.log(`  info ${p.enemies.length} enemies, ${p.pickups.length} pickups, ${p.teleports.length} teleports, ${p.movers.length} moving walls`);
}

if (failures) {
  console.log(`\n${failures} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll levels can be finished.');
