// Little bursts of light when shots hit walls or enemies.
// A fixed pool of sprites is reused so the game never creates garbage mid-fight.
import * as THREE from 'three';

const POOL = 80;

export class Sparks {
  constructor(map) {
    this.items = [];
    this.group = new THREE.Group();
    for (let i = 0; i < POOL; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true })
      );
      sprite.visible = false;
      sprite.scale.set(0.08, 0.08, 1);
      this.group.add(sprite);
      this.items.push({ sprite, life: 0, vx: 0, vy: 0, vz: 0 });
    }
    this.next = 0;
  }

  burst(x, y, z, count, color) {
    for (let i = 0; i < count; i++) {
      const s = this.items[this.next];
      this.next = (this.next + 1) % POOL;
      s.sprite.position.set(x, y, z);
      s.sprite.material.color.setHex(color);
      s.sprite.visible = true;
      s.life = 0.3 + Math.random() * 0.3;
      s.vx = (Math.random() - 0.5) * 3;
      s.vy = Math.random() * 2.5;
      s.vz = (Math.random() - 0.5) * 3;
    }
  }

  update(dt) {
    for (const s of this.items) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vy -= 6 * dt;
      s.sprite.position.x += s.vx * dt;
      s.sprite.position.y = Math.max(0.02, s.sprite.position.y + s.vy * dt);
      s.sprite.position.z += s.vz * dt;
      s.sprite.material.opacity = Math.min(1, s.life * 4);
      if (s.life <= 0) s.sprite.visible = false;
    }
  }
}
