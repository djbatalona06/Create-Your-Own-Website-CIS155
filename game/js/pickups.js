// Things lying around the dream. Walk over one to grab it.
import * as THREE from 'three';
import { playSfx } from './audio/sfx.js';
import { MAX_VOLTS } from './entities/player.js';
import { WEAPONS } from './weapons.js';

export class Pickups {
  constructor(game, spawns) {
    this.game = game;
    this.time = 0;
    this.list = spawns.map((s) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: game.frames.pickups[s.type], fog: true, alphaTest: 0.3 }));
      sprite.center.set(0.5, 0);
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.set(s.x + 0.5, 0.05, s.y + 0.5);
      return { type: s.type, x: s.x + 0.5, z: s.y + 0.5, sprite, taken: false, phase: Math.random() * 6 };
    });
  }

  attach(scene) {
    for (const pk of this.list) scene.add(pk.sprite);
  }

  update(dt) {
    const p = this.game.player;
    this.time += dt;
    for (const pk of this.list) {
      if (pk.taken) continue;
      pk.sprite.position.y = 0.05 + Math.sin(this.time * 2 + pk.phase) * 0.05;
      // squash the width back and forth so it looks like it's spinning
      pk.sprite.scale.x = 0.5 * Math.max(0.15, Math.abs(Math.cos(this.time * 1.5 + pk.phase)));
      if (!p.dead && Math.hypot(pk.x - p.x, pk.z - p.z) < 0.55 && this.apply(pk.type)) {
        pk.taken = true;
        pk.sprite.visible = false;
      }
    }
  }

  // Returns false if you don't need it (so it stays on the floor for later).
  apply(type) {
    const game = this.game;
    const p = game.player;
    switch (type) {
      case 'health':
        if (p.hp >= 100) return false;
        p.hp = Math.min(100, p.hp + 25);
        game.message('+25 health. You feel more awake.');
        break;
      case 'armor':
        if (p.armor >= 100) return false;
        p.armor = Math.min(100, p.armor + 50);
        game.message('+50 armor. A dream-shell hardens around you.');
        break;
      case 'volts':
        if (p.volts >= MAX_VOLTS) return false;
        p.volts = Math.min(MAX_VOLTS, p.volts + 20);
        game.message('+20 volts.');
        break;
      case 'lucid':
        p.lucid = 10;
        playSfx('lucid');
        game.message('LUCID. For 10 seconds you control the dream. Double damage!', 3);
        return true;
      case 'keyRed':
      case 'keyBlue':
        p.keys.add(type);
        playSfx('key');
        game.message(type === 'keyRed' ? 'Picked up the RED keycard.' : 'Picked up the BLUE keycard.', 2);
        return true;
      case 'scatter':
      case 'lance': {
        const isNew = !p.weapons.has(type);
        p.weapons.add(type);
        p.volts = Math.min(MAX_VOLTS, p.volts + 20);
        game.weapons.select(type);
        playSfx('weapon');
        game.message(isNew ? `You found the ${WEAPONS[type].name}!` : '+20 volts.', 2.5);
        return true;
      }
      default:
        return false;
    }
    playSfx('pickup');
    return true;
  }
}
