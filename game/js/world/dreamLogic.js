// The "surreal" rules of each dream:
//  - teleports: the kiosk that is bigger inside, the closet that is a ballroom
//  - loops: a hallway that quietly sends you back to its start
//  - the eye painting: USE it or shoot it to break the loop
//  - doors and walls that rise, sink, or breathe on a timer
import { surfaceTexture } from '../gfx/textures.js';
import { WALL_H } from './levelBuilder.js';
import { playSfx } from '../audio/sfx.js';
import { playMusic } from '../audio/music.js';

export class Dream {
  constructor(game, level, parsed, built) {
    this.game = game;
    this.level = level;
    this.built = built;
    const g = game.grid;
    this.teleports = new Map(parsed.teleports.map((t) => [g.idx(t.x, t.y), t]));
    this.triggers = new Map(parsed.triggers.map((t) => [g.idx(t.x, t.y), t]));
    this.exits = new Set(parsed.exits.map((e) => g.idx(e.x, e.y)));
    this.firedTriggers = new Set();
    this.brokenLoops = new Set();
    this.foundSecrets = new Set();
    this.loopCount = 0;
    this.eyeClosed = false;
    this.breatheT = level.breathePeriod || 0;
    this.totalSecrets = parsed.teleports.filter((t) => t.secret).length;
  }

  // Called whenever the player steps into a new tile.
  enterCell(cx, cy) {
    const game = this.game;
    const p = game.player;
    const i = game.grid.idx(cx, cy);

    if (this.exits.has(i)) {
      game.onExit();
      return;
    }

    const trig = this.triggers.get(i);
    if (trig && !this.firedTriggers.has(trig.id)) {
      this.firedTriggers.add(trig.id);
      for (const a of trig.actions) this.runAction(a);
    }

    const tp = this.teleports.get(i);
    if (!tp || (tp.loop && this.brokenLoops.has(tp.loop))) return;
    if (tp.loop) {
      // Shift by the same amount the tiles are apart. The hallway looks the
      // same at both spots, so you don't notice the jump at all.
      p.x += tp.tx - tp.x;
      p.z += tp.ty - tp.y;
      this.loopCount++;
      const lines = this.level.loop.messages;
      const line = lines[Math.min(this.loopCount, lines.length - 1)];
      if (line) game.message(line, 3);
    } else {
      p.x = tp.tx + 0.5;
      p.z = tp.ty + 0.5;
      game.fx.warp = 1;
      playSfx('warp');
      if (tp.secret && !this.foundSecrets.has(i)) {
        this.foundSecrets.add(i);
        game.stats.secrets++;
        game.message('SECRET: this kiosk is much bigger on the inside.', 3);
      }
    }
    game.lastCell = game.grid.idx(Math.floor(p.x), Math.floor(p.z));
  }

  runAction(a) {
    const game = this.game;
    if (a.raise) this.setGroup(a.raise, 1);
    if (a.lower) this.setGroup(a.lower, 0);
    if (a.message) game.message(a.message, 3.5);
    if (a.wakeAll) game.enemies.wakeAll();
    if (a.music) playMusic(a.music);
  }

  setGroup(group, target) {
    for (const m of this.built.movers) if (m.group === group) m.target = target;
    playSfx('wall');
  }

  // USE button: open the door in front of you, or poke the eye painting.
  use() {
    const game = this.game;
    const p = game.player;
    const dx = -Math.sin(p.yaw);
    const dz = -Math.cos(p.yaw);
    const hit = game.grid.raycast(p.x, p.z, dx, dz, 1.6);
    if (!hit.hit) return;
    const door = this.built.doors.find((d) => d.x === hit.cx && d.y === hit.cy);
    if (door) {
      this.openDoor(door);
      return;
    }
    const ch = game.grid.wallChar[game.grid.idx(hit.cx, hit.cy)];
    if (ch === 'E') this.hitEye();
    else if (ch === '%' && this.level.textures['%'] === 'motelDoor') {
      game.message('Room 107. Locked from the dream side.', 2);
      playSfx('locked');
    }
  }

  openDoor(door) {
    if (door.opening) return;
    const p = this.game.player;
    if (door.key && !p.keys.has(door.key)) {
      this.game.message(door.key === 'keyRed' ? 'This door needs the RED keycard.' : 'This door needs the BLUE keycard.', 2);
      playSfx('locked');
      return;
    }
    door.opening = true;
    playSfx('door');
  }

  shotWall(cx, cy) {
    if (this.game.grid.wallChar[this.game.grid.idx(cx, cy)] === 'E') this.hitEye();
  }

  hitEye() {
    if (this.eyeClosed || !this.level.eye) return;
    this.eyeClosed = true;
    this.brokenLoops.add(this.level.eye.breakLoop);
    const mat = this.built.materials.E;
    if (mat) mat.map = surfaceTexture('eyeClosed');
    this.game.fx.warp = 1;
    this.game.message(this.level.eye.message, 3.5);
    playSfx('eye');
  }

  // A tile is "occupied" if the player or a living enemy overlaps it.
  occupied(x, y) {
    const game = this.game;
    const near = (ox, oz, r) => ox + r > x && ox - r < x + 1 && oz + r > y && oz - r < y + 1;
    if (near(game.player.x, game.player.z, game.player.radius)) return true;
    return game.enemies.list.some((e) => !e.dead && near(e.x, e.z, Math.min(e.radius, 0.3)));
  }

  update(dt) {
    for (const d of this.built.doors) {
      if (!d.opening || d.open >= 1) continue;
      d.open = Math.min(1, d.open + dt * 1.6);
      d.mesh.position.y = WALL_H / 2 + d.open * (WALL_H - 0.08);
      d.solid = d.open < 0.6;
    }

    if (this.breatheT) {
      this.breatheT -= dt;
      if (this.breatheT <= 0) {
        this.breatheT = this.level.breathePeriod;
        for (const m of this.built.movers) if (m.breathe) m.target = 1 - m.target;
        const p = this.game.player;
        if (this.built.movers.some((m) => m.breathe && Math.hypot(m.x - p.x, m.y - p.z) < 7)) playSfx('wall');
      }
    }

    for (const m of this.built.movers) {
      if (m.h === m.target) continue;
      // Never rise on top of someone. Wait until the tile is clear.
      if (m.target > m.h && this.occupied(m.x, m.y)) continue;
      const step = dt * 1.4;
      m.h = m.target > m.h ? Math.min(m.target, m.h + step) : Math.max(m.target, m.h - step);
      m.solid = m.h > 0.35;
      m.mesh.position.y = (m.h - 1) * WALL_H + WALL_H / 2;
    }
  }
}
