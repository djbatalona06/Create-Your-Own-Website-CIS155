// You: a night-shift courier stuck in a city's shared dream.
export const PLAYER_RADIUS = 0.25;
export const EYE_HEIGHT = 0.55;
export const MOVE_SPEED = 3.4; // tiles per second
export const MAX_VOLTS = 200;

export class Player {
  constructor(x, z, yaw, loadout, carry) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.radius = PLAYER_RADIUS;
    this.hp = carry ? carry.hp : 100;
    this.armor = carry ? carry.armor : 0;
    this.volts = Math.max(loadout.volts, carry ? carry.volts : 0);
    this.weapons = new Set([...loadout.weapons, ...(carry ? carry.weapons : [])]);
    this.weapon = carry && this.weapons.has(carry.weapon) ? carry.weapon : loadout.weapons[loadout.weapons.length - 1];
    this.keys = new Set();
    this.lucid = 0; // seconds of Lucid Pill left
    this.hurt = 0; // 0..1, fades out, drives the red glitch
    this.bobPhase = 0;
    this.moving = 0;
    this.dead = false;
  }

  // Armor soaks up half of every hit until it runs out.
  takeDamage(amount) {
    if (this.dead) return 0;
    const soaked = Math.min(this.armor, Math.floor(amount / 2));
    this.armor -= soaked;
    const taken = amount - soaked;
    this.hp = Math.max(0, this.hp - taken);
    this.hurt = Math.min(1, this.hurt + 0.25 + taken / 30);
    if (this.hp <= 0) this.dead = true;
    return taken;
  }

  // What carries over into the next dream.
  carry() {
    return {
      hp: Math.max(this.hp, 50),
      armor: this.armor,
      volts: this.volts,
      weapons: [...this.weapons],
      weapon: this.weapon,
    };
  }
}
