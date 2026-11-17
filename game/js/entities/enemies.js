// The dream's residents. Each one is a flat picture (a "sprite") that always
// faces you, driven by a tiny brain: sleep -> notice you -> chase -> attack.
import * as THREE from 'three';
import { playSfx } from '../audio/sfx.js';

const DEFS = {
  // Floating porcelain mask. Keeps its distance and spits slow orbs.
  mask: { hp: 30, speed: 1.3, radius: 0.32, size: 0.75, lift: 0.3, float: true, range: 9, cooldown: [1.6, 2.6], keep: 3.5, attack: 'orb' },
  // TV-headed runner. Fast, bites up close, fills your screen with static.
  hound: { hp: 40, speed: 3.2, radius: 0.3, size: 0.8, lift: 0, range: 0.95, cooldown: [0.7, 0.95], keep: 0, attack: 'bite', damage: 9 },
  // Liquid-chrome mime. Blinks to a new spot and throws a fan of orbs.
  mime: { hp: 80, speed: 1.9, radius: 0.3, size: 1.0, lift: 0, range: 10, cooldown: [1.8, 2.6], keep: 2.5, attack: 'fan', blink: 4.5 },
  // The boss: a giant alarm clock with one eye.
  snooze: { hp: 1100, speed: 0.9, radius: 0.9, size: 2.6, lift: 0.1, float: true, range: 40, cooldown: [2.2, 2.2], keep: 4.5, attack: 'boss' },
};

const CARDBOARD = new THREE.Color(0xd9b98a);
const WHITE = new THREE.Color(0xffffff);
let nextId = 1;

const rand = (min, max) => min + Math.random() * (max - min);

class Enemy {
  constructor(type, x, z, frames) {
    const d = DEFS[type];
    this.id = nextId++;
    this.type = type;
    this.def = d;
    this.x = x;
    this.z = z;
    this.hp = d.hp;
    this.radius = d.radius;
    this.height = d.size;
    this.frames = frames[type];
    this.awake = false;
    this.dead = false;
    this.cool = rand(0.5, 1.5);
    this.attackT = 0;
    this.painT = 0;
    this.blinkT = d.blink || 0;
    this.blinkFrame = 0;
    this.anim = Math.random() * 10;
    this.summonT = 6;
    const mat = new THREE.SpriteMaterial({ map: this.frames.idle[0], fog: true, alphaTest: 0.35 });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.center.set(0.5, 0);
    this.sprite.scale.set(d.size, d.size, 1);
    this.sprite.position.set(x, d.lift, z);
  }
}

export class Enemies {
  constructor(game, spawns) {
    this.game = game;
    this.list = spawns.map((s) => new Enemy(s.type, s.x + 0.5, s.y + 0.5, game.frames.enemies));
    this.shots = [];
    this.flowTimer = 0;
    this.hurtSoundT = 0;
    this.time = 0;
  }

  get total() {
    return this.list.length;
  }

  attach(scene) {
    this.scene = scene;
    for (const e of this.list) scene.add(e.sprite);
  }

  alertNear(x, z, r) {
    for (const e of this.list) if (Math.hypot(e.x - x, e.z - z) < r) e.awake = true;
  }

  wakeAll() {
    for (const e of this.list) e.awake = true;
  }

  // How much TV static the nearest Channel Hound puts on your screen.
  staticLevel() {
    const p = this.game.player;
    let s = 0;
    for (const e of this.list) {
      if (e.dead || e.type !== 'hound') continue;
      s = Math.max(s, 1 - Math.hypot(e.x - p.x, e.z - p.z) / 3.5);
    }
    return s;
  }

  damage(e, amount) {
    if (e.dead) return;
    e.hp -= amount;
    e.awake = true;
    if (e.type !== 'snooze' || Math.random() < 0.15) e.painT = 0.15;
    if (this.hurtSoundT <= 0) {
      playSfx(e.type === 'snooze' ? 'bossHit' : 'enemyHurt');
      this.hurtSoundT = 0.08;
    }
    if (e.hp <= 0) {
      e.dead = true;
      e.sprite.material.map = e.frames.dead;
      e.sprite.material.color.copy(WHITE);
      e.sprite.material.rotation = 0;
      e.sprite.position.y = 0;
      this.game.stats.kills++;
      playSfx('enemyDie');
      this.game.sparks.burst(e.x, e.height * 0.5, e.z, 14, 0xff2bd6);
      if (e.type === 'snooze') this.game.onBossDefeated();
    }
  }

  update(dt) {
    const game = this.game;
    const p = game.player;
    const grid = game.grid;
    this.time += dt;
    this.hurtSoundT -= dt;

    // Rebuild the "path to the player" map twice a second.
    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      grid.buildFlow(p.x, p.z);
      this.flowTimer = 0.5;
    }

    const slow = p.lucid > 0 ? 0.5 : 1;
    for (const e of this.list) {
      if (e.dead) continue;
      const d = e.def;
      e.anim += dt * slow;
      e.cool -= dt * slow;
      e.painT -= dt;
      e.attackT -= dt;
      e.blinkFrame -= dt;

      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const dist = Math.hypot(dx, dz);
      const sees = dist < 20 && grid.lineOfSight(e.x, e.z, p.x, p.z);
      if (!e.awake && sees && dist < 11) e.awake = true;

      if (e.awake && !p.dead) {
        if (e.painT <= 0 && e.attackT <= 0) this.move(e, dt * slow, dx, dz, dist, sees);
        if (sees && dist < d.range && e.cool <= 0 && e.painT <= 0) this.attack(e, dist);
        if (d.blink) this.blink(e, dt * slow, sees);
        if (e.type === 'snooze') this.bossExtras(e, dt);
      }
      this.animate(e, p);
    }

    this.updateShots(dt * slow);
  }

  move(e, dt, dx, dz, dist, sees) {
    const d = e.def;
    let mx = 0;
    let mz = 0;
    if (sees && dist > d.keep) {
      mx = dx / dist;
      mz = dz / dist;
    } else if (sees && d.keep && dist < d.keep * 0.6) {
      mx = -dx / dist; // back off to a comfy range
      mz = -dz / dist;
    } else if (!sees) {
      const step = this.game.grid.flowStep(e.x, e.z);
      if (step) {
        const sx = step.x - e.x;
        const sz = step.z - e.z;
        const len = Math.hypot(sx, sz) || 1;
        mx = sx / len;
        mz = sz / len;
      }
    }
    // gently push away from other enemies so they don't stack up
    // ponytail: checks every pair (n²); fine for ~20 enemies, use a grid bucket if a level gets crowded
    for (const o of this.list) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x;
      const oz = e.z - o.z;
      const od = Math.hypot(ox, oz);
      if (od > 0 && od < 0.6) {
        mx += (ox / od) * 0.5;
        mz += (oz / od) * 0.5;
      }
    }
    const speed = d.speed * dt;
    this.game.grid.move(e, mx * speed, mz * speed, Math.min(e.radius, 0.3));
  }

  attack(e, dist) {
    const d = e.def;
    const p = this.game.player;
    e.cool = rand(d.cooldown[0], d.cooldown[1]);
    e.attackT = 0.3;
    const aim = Math.atan2(p.z - e.z, p.x - e.x);
    const misc = this.game.frames.misc;
    if (d.attack === 'orb') {
      this.shoot(e, aim, 5, 8, misc.orbPink, 0.55);
      playSfx('orb');
    } else if (d.attack === 'bite') {
      if (dist < d.range + p.radius) {
        this.game.hurtPlayer(d.damage);
        playSfx('bite');
      }
    } else if (d.attack === 'fan') {
      for (const off of [-0.22, 0, 0.22]) this.shoot(e, aim + off, 6, 7, misc.orbCyan, 0.6);
      playSfx('orb');
    } else if (d.attack === 'boss') {
      const phase = this.bossPhase(e);
      const count = [10, 14, 18][phase];
      const spin = this.time * 0.7;
      for (let i = 0; i < count; i++) this.shoot(e, spin + (i / count) * Math.PI * 2, 4 + phase * 0.6, 10, misc.orbGold, 1.0);
      if (phase >= 1) this.shoot(e, aim, 7, 12, misc.orbPink, 1.0);
      e.cool = [2.2, 1.8, 1.3][phase];
      playSfx('alarm');
      this.game.fx.alarm = phase >= 2 ? 1 : 0.4;
    }
  }

  shoot(e, angle, speed, damage, map, y) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    sprite.scale.set(0.45, 0.45, 1);
    sprite.position.set(e.x, y, e.z);
    this.scene.add(sprite);
    this.shots.push({ x: e.x, z: e.z, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, damage, sprite, life: 6 });
  }

  updateShots(dt) {
    const game = this.game;
    const p = game.player;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      s.life -= dt;
      s.sprite.position.x = s.x;
      s.sprite.position.z = s.z;
      let gone = s.life <= 0;
      if (game.grid.isSolid(Math.floor(s.x), Math.floor(s.z))) {
        game.sparks.burst(s.x, s.sprite.position.y, s.z, 3, 0xffe6ff);
        gone = true;
      } else if (!p.dead && Math.hypot(s.x - p.x, s.z - p.z) < 0.3 + p.radius) {
        game.hurtPlayer(s.damage);
        gone = true;
      }
      if (gone) {
        this.scene.remove(s.sprite);
        s.sprite.material.dispose();
        this.shots.splice(i, 1);
      }
    }
  }

  blink(e, dt, sees) {
    e.blinkT -= dt;
    if (e.blinkT > 0 || !sees) return;
    const p = this.game.player;
    const spot = this.game.grid.randomFloorNear(p.x, p.z, 2.5, 5);
    if (!spot || !this.game.grid.lineOfSight(spot.x, spot.z, p.x, p.z)) return;
    this.game.sparks.burst(e.x, 0.5, e.z, 8, 0xd0dcff);
    e.x = spot.x;
    e.z = spot.z;
    this.game.sparks.burst(e.x, 0.5, e.z, 8, 0xd0dcff);
    e.blinkT = e.def.blink + Math.random();
    e.blinkFrame = 0.25;
    e.cool = Math.min(e.cool, 0.6);
    playSfx('blink');
  }

  bossPhase(e) {
    const f = e.hp / e.def.hp;
    return f > 0.6 ? 0 : f > 0.25 ? 1 : 2;
  }

  bossExtras(e, dt) {
    if (this.bossPhase(e) === 0) return;
    e.summonT -= dt;
    const hounds = this.list.filter((o) => o.type === 'hound' && !o.dead).length;
    if (e.summonT <= 0 && hounds < 4) {
      e.summonT = 8;
      for (let i = 0; i < 2; i++) {
        const spot = this.game.grid.randomFloorNear(e.x, e.z, 1.5, 4);
        if (!spot) continue;
        const pup = new Enemy('hound', spot.x, spot.z, this.game.frames.enemies);
        pup.awake = true;
        this.list.push(pup);
        this.scene.add(pup.sprite);
        this.game.sparks.burst(spot.x, 0.3, spot.z, 10, 0xffe600);
        this.game.stats.total++;
      }
      this.game.message('The Snooze hits the button. More hounds wake up.', 2);
    }
  }

  animate(e, p) {
    const f = e.frames;
    const mat = e.sprite.material;
    let map;
    if (e.painT > 0) map = f.pain;
    else if (e.blinkFrame > 0 && f.blink) map = f.blink;
    else if (e.attackT > 0) map = f.attack;
    else {
      const rate = e.type === 'snooze' ? 3 + this.bossPhase(e) * 4 : e.type === 'hound' && e.awake ? 8 : 3;
      map = f.idle[Math.floor(e.anim * rate) % f.idle.length];
    }
    mat.map = map;
    e.sprite.position.x = e.x;
    e.sprite.position.z = e.z;
    e.sprite.position.y = e.def.lift + (e.def.float ? Math.sin(e.anim * 2) * 0.06 : 0);
    // Lucid Pill: everyone turns into wobbly cardboard cut-outs.
    if (p.lucid > 0) {
      mat.color.copy(CARDBOARD);
      mat.rotation = Math.sin(this.time * 3 + e.id) * 0.18;
    } else {
      mat.color.copy(WHITE);
      mat.rotation = 0;
    }
  }
}
