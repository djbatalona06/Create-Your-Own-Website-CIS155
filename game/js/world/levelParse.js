// Turns a level's ASCII map into plain data (lists of walls, doors, enemies...).
// This file never touches Three.js, so the Node level test can use it too.

// Static walls. Each level decides which texture each character gets.
export const WALL_CHARS = new Set(['#', '%', '=', 'E']);

export const ENEMY_CHARS = { m: 'mask', h: 'hound', c: 'mime', Z: 'snooze' };

export const PICKUP_CHARS = {
  '+': 'health',
  '*': 'armor',
  $: 'volts',
  L: 'lucid',
  r: 'keyRed',
  b: 'keyBlue',
  2: 'scatter',
  3: 'lance',
};

// Door character -> the key it needs (null = anyone can open it).
export const DOOR_CHARS = { D: null, R: 'keyRed', B: 'keyBlue' };

export function parseLevel(level) {
  const rows = level.map;
  const h = rows.length;
  const w = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(`${level.name}: row ${y} is ${row.length} wide, expected ${w}`);
    }
  });

  const out = {
    w,
    h,
    walls: [], // one string per row: wall char or '.'
    start: null,
    exits: [],
    doors: [],
    enemies: [],
    pickups: [],
    movers: [],
    teleports: [],
    triggers: [],
    eyes: [],
    marks: {}, // custom marker char -> [{x,y}]
  };

  for (let y = 0; y < h; y++) {
    let wallRow = '';
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const marker = level.markers ? level.markers[ch] : undefined;
      wallRow += WALL_CHARS.has(ch) ? ch : '.';

      if (ch === 'E') out.eyes.push({ x, y });
      else if (ch === 'P') out.start = { x, y };
      else if (ch === 'X') out.exits.push({ x, y });
      else if (ch in DOOR_CHARS) out.doors.push({ x, y, key: DOOR_CHARS[ch] });
      else if (ch in ENEMY_CHARS) out.enemies.push({ x, y, type: ENEMY_CHARS[ch] });
      else if (ch in PICKUP_CHARS) out.pickups.push({ x, y, type: PICKUP_CHARS[ch] });
      else if (marker) {
        (out.marks[ch] ||= []).push({ x, y });
        if (marker.type === 'teleport') {
          out.teleports.push({ x, y, to: marker.to, loop: marker.loop || null, secret: !!marker.secret });
        } else if (marker.type === 'mover') {
          out.movers.push({ x, y, group: marker.group, up: !!marker.up, breathe: !!marker.breathe });
        } else if (marker.type === 'trigger') {
          out.triggers.push({ x, y, id: ch, actions: marker.actions || [] });
        }
      } else if (ch !== '.' && !WALL_CHARS.has(ch)) {
        throw new Error(`${level.name}: unknown map character "${ch}" at ${x},${y}`);
      }
    }
    out.walls.push(wallRow);
  }

  // Point each teleport at the cell its target marker sits on.
  for (const t of out.teleports) {
    const target = out.marks[t.to];
    if (!target || !target.length) throw new Error(`${level.name}: teleport target "${t.to}" missing`);
    t.tx = target[0].x;
    t.ty = target[0].y;
  }
  if (!out.start) throw new Error(`${level.name}: no player start (P)`);
  return out;
}
