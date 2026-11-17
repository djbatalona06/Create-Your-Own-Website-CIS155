// One shared "what is the player asking for?" object.
// Touch controls and the keyboard both write into it; the game only reads it.
export const input = {
  moveX: 0, // strafe, -1 (left) .. 1 (right)
  moveY: 0, // walk,   -1 (back) .. 1 (forward)
  turn: 0, // radians to turn, piled up since the last game step
  fire: false,
  use: false, // "pressed once" flags are cleared after the game reads them
  nextWeapon: false,
  slot: 0, // 1..3 to pick a weapon directly
  pause: false,

  takeTurn() {
    const t = this.turn;
    this.turn = 0;
    return t;
  },

  takePress(name) {
    const v = this[name];
    this[name] = name === 'slot' ? 0 : false;
    return v;
  },

  reset() {
    this.moveX = this.moveY = this.turn = 0;
    this.fire = this.use = this.nextWeapon = this.pause = false;
    this.slot = 0;
  },
};
