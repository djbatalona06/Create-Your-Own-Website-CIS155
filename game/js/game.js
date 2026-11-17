// One dream (level) being played: builds the world, runs every system each
// step, and tells main.js when you win, die, or reach the exit.
import * as THREE from 'three';
import { LEVELS } from './world/levels.js';
import { parseLevel } from './world/levelParse.js';
import { buildLevel } from './world/levelBuilder.js';
import { Grid } from './world/grid.js';
import { Dream } from './world/dreamLogic.js';
import { Player, MOVE_SPEED, EYE_HEIGHT } from './entities/player.js';
import { Enemies } from './entities/enemies.js';
import { Pickups } from './pickups.js';
import { WeaponSystem, WEAPON_ORDER } from './weapons.js';
import { Sparks } from './fx/sparks.js';
import { input } from './input/input.js';
import { playSfx } from './audio/sfx.js';
import { playMusic } from './audio/music.js';

export class Game {
  constructor({ renderer, frames, settings, hooks }) {
    this.renderer = renderer;
    this.frames = frames;
    this.settings = settings;
    this.hooks = hooks; // message, hud, levelClear, death, win
    this.scene = null;
    this.time = 0;
  }

  load(levelIndex, carry = null) {
    this.dispose();
    const level = LEVELS[levelIndex];
    const parsed = parseLevel(level);
    this.levelIndex = levelIndex;
    this.level = level;
    this.grid = new Grid(parsed);
    this.built = buildLevel(level, parsed, this.grid, this.frames);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(level.fog.color, level.fog.near, level.fog.far);
    this.scene.add(this.built.root);
    if (this.built.weather) this.scene.add(this.built.weather.points);

    this.player = new Player(parsed.start.x + 0.5, parsed.start.y + 0.5, level.startYaw, level.loadout, carry);
    this.enemies = new Enemies(this, parsed.enemies);
    this.enemies.attach(this.scene);
    this.pickups = new Pickups(this, parsed.pickups);
    this.pickups.attach(this.scene);
    this.sparks = new Sparks(this.frames.misc.spark);
    this.scene.add(this.sparks.group);
    this.weapons = new WeaponSystem(this);
    this.weapons.attach(this.scene);
    this.dream = new Dream(this, level, parsed, this.built);

    this.stats = { time: 0, kills: 0, total: this.enemies.total, secrets: 0, totalSecrets: this.dream.totalSecrets };
    this.fx = { flash: 0, warp: 0, alarm: 0, lucid: 0, fade: 0 };
    this.lastCell = this.grid.idx(Math.floor(this.player.x), Math.floor(this.player.z));
    this.deadT = 0;
    this.ending = 0;
    this.finished = false;
    this.lastFov = 0;
    input.reset();
    this.syncCamera(0);
  }

  dispose() {
    if (this.weapons) this.weapons.dispose();
    if (!this.scene) return;
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.dispose) o.material.dispose();
    });
    this.scene = null;
  }

  startMusic() {
    playMusic(this.level.music);
  }

  message(text, seconds = 2) {
    this.hooks.message(text, seconds);
  }

  hurtPlayer(amount) {
    const p = this.player;
    if (p.dead || this.finished) return;
    const taken = p.takeDamage(amount);
    if (taken > 0) {
      playSfx('hurt');
      if (this.settings.vibrate && navigator.vibrate) navigator.vibrate(35);
    }
  }

  onExit() {
    if (this.finished) return;
    this.finished = true;
    playSfx('exit');
    this.hooks.levelClear(this.stats, this.player.carry());
  }

  onBossDefeated() {
    this.ending = 0.001;
    this.player.lucid = 0;
    this.message('...the ringing stops. Someone is shaking your shoulder.', 4);
  }

  // One fixed step of the simulation (called 60 times a second).
  update(dt) {
    const p = this.player;
    this.time += dt;
    if (!this.finished) this.stats.time += dt;

    // --- the player ---
    p.yaw -= input.takeTurn();
    if (!p.dead && !this.finished) {
      let mx = input.moveX;
      let my = input.moveY;
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
      const fx = -Math.sin(p.yaw);
      const fz = -Math.cos(p.yaw);
      const rx = Math.cos(p.yaw);
      const rz = -Math.sin(p.yaw);
      const speed = MOVE_SPEED * dt;
      this.grid.move(p, (fx * my + rx * mx) * speed, (fz * my + rz * mx) * speed, p.radius);
      p.moving = Math.min(1, len);
      p.bobPhase += dt * 9 * p.moving;

      if (input.takePress('use')) this.dream.use();
      if (input.takePress('nextWeapon')) this.weapons.cycle();
      const slot = input.takePress('slot');
      if (slot) this.weapons.select(WEAPON_ORDER[slot - 1]);

      const cell = this.grid.idx(Math.floor(p.x), Math.floor(p.z));
      if (cell !== this.lastCell) {
        this.lastCell = cell;
        this.dream.enterCell(Math.floor(p.x), Math.floor(p.z));
      }
    }
    p.lucid = Math.max(0, p.lucid - dt);
    p.hurt = Math.max(0, p.hurt - dt * 1.4);

    // --- the world ---
    this.weapons.update(dt, input.fire && !this.finished);
    if (!this.finished) this.enemies.update(dt);
    this.pickups.update(dt);
    this.dream.update(dt);
    this.sparks.update(dt);
    if (this.built.weather) this.built.weather.update(dt, p.x, p.z);

    // --- effects ---
    const fx = this.fx;
    fx.flash = Math.max(0, fx.flash - dt * 8);
    fx.warp = Math.max(0, fx.warp - dt * 1.5);
    fx.alarm = Math.max(0, fx.alarm - dt * 1.2);
    fx.lucid += ((p.lucid > 0 ? 1 : 0) - fx.lucid) * Math.min(1, dt * 3);

    // --- dying, or waking up after the boss ---
    if (p.dead && !this.finished) {
      this.deadT += dt;
      if (this.deadT > 1.4) {
        this.finished = true;
        this.hooks.death(this.stats);
      }
    }
    if (this.ending > 0 && !this.finished) {
      this.ending += dt;
      fx.fade = Math.min(1, this.ending / 3);
      if (this.ending > 3.4) {
        this.finished = true;
        this.hooks.win(this.stats);
      }
    }

    this.syncCamera(dt);
    this.hooks.hud(this.hudState());
  }

  hudState() {
    const p = this.player;
    return {
      hp: p.hp,
      armor: p.armor,
      volts: p.volts,
      weapon: p.weapon,
      keys: p.keys,
      lucid: p.lucid,
      level: this.level.name,
      time: this.stats.time,
    };
  }

  syncCamera(dt) {
    const p = this.player;
    const cam = this.renderer.camera;
    const bob = Math.sin(p.bobPhase * 2) * 0.025 * p.moving;
    const deadDrop = Math.min(1, this.deadT) * 0.4;
    cam.position.set(p.x, EYE_HEIGHT + bob - deadDrop, p.z);
    cam.rotation.set(0, p.yaw, this.deadT ? Math.min(1, this.deadT) * 0.4 : 0);
    // The Lucid Pill stretches your view in and out.
    const fov = 72 + this.fx.lucid * (10 + Math.sin(this.time * 2) * 12);
    if (Math.abs(fov - this.lastFov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
      this.lastFov = fov;
    }
    if (this.built.sky) {
      this.built.sky.position.set(p.x, 12, p.z);
      this.built.sky.rotation.y += dt * 0.01;
    }
  }

  // Slow look-around for the title screen.
  attract(dt) {
    this.player.yaw += dt * 0.15;
    this.time += dt;
    if (this.built.weather) this.built.weather.update(dt, this.player.x, this.player.z);
    this.pickups.update(0);
    this.syncCamera(dt);
  }

  render() {
    if (!this.scene) return;
    const u = this.renderer.post.uniforms;
    const fxScale = { full: 1, soft: 0.5, off: 0 }[this.settings.fx] ?? 1;
    u.uTime.value = this.time;
    u.uFx.value = fxScale;
    u.uHurt.value = Math.min(1, Math.max(this.player.hurt, this.fx.warp * 0.7, this.fx.alarm * 0.5));
    u.uLucid.value = this.fx.lucid;
    u.uStatic.value = Math.max(this.enemies.staticLevel(), this.fx.alarm * 0.4);
    u.uFlash.value = this.fx.flash * fxScale;
    u.uFade.value = this.fx.fade;
    this.renderer.render(this.scene);
  }
}
