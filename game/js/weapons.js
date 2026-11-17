// Your three dream-weapons, plus the picture of the weapon in your hands.
// Shots are "hitscan": an invisible ray that hits instantly, like a laser.
import * as THREE from 'three';
import { playSfx } from './audio/sfx.js';

export const WEAPONS = {
  pulse: { name: 'PULSE PISTOL', cost: 0, cooldown: 0.32, damage: 14, pellets: 1, spread: 0.015, pierce: false, sfx: 'pulse' },
  scatter: { name: 'PRISM SCATTER', cost: 1, cooldown: 0.85, damage: 9, pellets: 7, spread: 0.11, pierce: false, sfx: 'scatter' },
  lance: { name: 'ARC LANCE', cost: 2, cooldown: 0.75, damage: 45, pellets: 1, spread: 0, pierce: true, sfx: 'lance' },
};
export const WEAPON_ORDER = ['pulse', 'scatter', 'lance'];

const AIM_ASSIST = 0.09; // radians; helps thumbs aim at things near the crosshair

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.cooldown = 0;
    this.kick = 0;
    this.fireFrame = 0;
    this.switchT = 0; // 0..1 lowering/raising animation
    this.frames = game.frames.weapons;

    const mat = new THREE.MeshBasicMaterial({ map: this.frames.pulse.idle, transparent: true, depthTest: false });
    this.view = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), mat);
    game.renderer.hudScene.add(this.view);

    // The Arc Lance draws a bright line for a split second.
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0x9cfbff, transparent: true, opacity: 0 }));
    this.beam.frustumCulled = false;
    this.beamLife = 0;
  }

  attach(scene) {
    scene.add(this.beam);
  }

  dispose() {
    this.game.renderer.hudScene.remove(this.view);
  }

  select(id) {
    const p = this.game.player;
    if (!p.weapons.has(id) || p.weapon === id) return;
    p.weapon = id;
    this.switchT = 1;
    playSfx('pickup');
  }

  cycle() {
    const p = this.game.player;
    const owned = WEAPON_ORDER.filter((w) => p.weapons.has(w));
    const i = owned.indexOf(p.weapon);
    this.select(owned[(i + 1) % owned.length]);
  }

  update(dt, wantFire) {
    const p = this.game.player;
    this.cooldown -= dt;
    this.kick = Math.max(0, this.kick - dt * 6);
    this.fireFrame -= dt;
    this.switchT = Math.max(0, this.switchT - dt * 4);
    if (wantFire && this.cooldown <= 0 && this.switchT < 0.3 && !p.dead) this.fire();

    // Sway and bob the weapon as you walk.
    const bobX = Math.sin(p.bobPhase) * 0.05 * p.moving;
    const bobY = Math.abs(Math.cos(p.bobPhase)) * 0.04 * p.moving;
    this.view.position.set(bobX,-0.42 - bobY - this.kick * 0.1 - this.switchT * 0.9, -1);
    const set = this.frames[p.weapon];
    this.view.material.map = this.fireFrame > 0 ? set.fire : set.idle;
    this.view.visible = !p.dead;

    if (this.beamLife > 0) {
      this.beamLife -= dt;
      this.beam.material.opacity = Math.max(0, this.beamLife / 0.15);
    }
  }

  fire() {
    const game = this.game;
    const p = game.player;
    let w = WEAPONS[p.weapon];
    if (p.volts < w.cost) {
      playSfx('empty');
      game.message('Out of volts. Back to the Pulse Pistol.', 1.5);
      this.select('pulse');
      this.cooldown = 0.3;
      return;
    }
    p.volts -= w.cost;
    this.cooldown = w.cooldown;
    this.kick = 1;
    this.fireFrame = 0.08;
    game.fx.flash = 1;
    playSfx(w.sfx);
    game.enemies.alertNear(p.x, p.z, 9);

    const aim = this.autoAim(p);
    const mult = p.lucid > 0 ? 2 : 1;
    for (let i = 0; i < w.pellets; i++) {
      const angle = aim + (Math.random() * 2 - 1) * w.spread;
      this.hitscan(angle, w.damage * mult, w.pierce, p.weapon === 'lance');
    }
  }

  autoAim(p) {
    let best = p.yaw;
    let bestDiff = AIM_ASSIST;
    for (const e of this.game.enemies.list) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 25) continue;
      const target = Math.atan2(-dx, -dz);
      let diff = target - p.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < bestDiff && this.game.grid.lineOfSight(p.x, p.z, e.x, e.z)) {
        bestDiff = Math.abs(diff);
        best = target;
      }
    }
    return best;
  }

  hitscan(angle, damage, pierce, showBeam) {
    const game = this.game;
    const p = game.player;
    const dx = -Math.sin(angle);
    const dz = -Math.cos(angle);
    const wall = game.grid.raycast(p.x, p.z, dx, dz, 40);

    const hits = [];
    for (const e of game.enemies.list) {
      if (e.dead) continue;
      const rx = e.x - p.x;
      const rz = e.z - p.z;
      const along = rx * dx + rz * dz;
      if (along <= 0 || along > wall.dist) continue;
      const side = Math.abs(rx * dz - rz * dx);
      if (side < e.radius) hits.push({ e, along });
    }
    hits.sort((a, b) => a.along - b.along);

    let endDist = wall.dist;
    for (const h of pierce ? hits : hits.slice(0, 1)) {
      game.enemies.damage(h.e, damage);
      game.sparks.burst(h.e.x, h.e.sprite.position.y + h.e.height * 0.5, h.e.z, 4, 0xffffff);
      if (!pierce) endDist = h.along;
    }
    if (!hits.length || pierce) {
      const hx = p.x + dx * (wall.dist - 0.02);
      const hz = p.z + dz * (wall.dist - 0.02);
      game.sparks.burst(hx, 0.5, hz, 3, 0xffe6ff);
      if (wall.hit) game.dream.shotWall(wall.cx, wall.cy);
    }
    if (showBeam) {
      const pos = this.beam.geometry.attributes.position;
      pos.setXYZ(0, p.x + dx * 0.3 - dz * 0.08, 0.45, p.z + dz * 0.3 + dx * 0.08);
      pos.setXYZ(1, p.x + dx * endDist, 0.5, p.z + dz * endDist);
      pos.needsUpdate = true;
      this.beamLife = 0.15;
    }
  }
}
