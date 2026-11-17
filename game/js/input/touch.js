// Phone controls, built on Pointer Events so several fingers work at once.
//  - left half:  a floating stick appears wherever your thumb lands
//  - right half: drag to turn
//  - buttons:    FIRE (hold, and drag it to aim too), USE, SWAP, PAUSE
import { input } from './input.js';

const STICK_RADIUS = 52; // pixels the knob can travel

export function setupTouch(settings) {
  const root = document.getElementById('touch');
  const moveZone = document.getElementById('zone-move');
  const lookZone = document.getElementById('zone-look');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');

  let stickId = null;
  let stickX = 0;
  let stickY = 0;
  const lookers = new Map(); // pointerId -> last x

  const turnBy = (dx) => {
    input.turn += dx * 0.0065 * settings.lookSens;
  };

  moveZone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    moveZone.setPointerCapture(e.pointerId);
    stickX = e.clientX;
    stickY = e.clientY;
    stick.style.transform = `translate(${stickX}px, ${stickY}px)`;
    knob.style.transform = 'translate(0px, 0px)';
    stick.classList.add('active');
  });
  moveZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - stickX;
    let dy = e.clientY - stickY;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // a small dead zone stops tiny thumb wobbles from drifting you
    const dead = (v) => (Math.abs(v) < 0.12 ? 0 : v);
    input.moveX = dead(dx / STICK_RADIUS);
    input.moveY = dead(-dy / STICK_RADIUS);
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    input.moveX = input.moveY = 0;
    stick.classList.remove('active');
  };
  moveZone.addEventListener('pointerup', endStick);
  moveZone.addEventListener('pointercancel', endStick);

  const startLook = (el) => (e) => {
    el.setPointerCapture(e.pointerId);
    lookers.set(e.pointerId, e.clientX);
  };
  const moveLook = (e) => {
    if (!lookers.has(e.pointerId)) return;
    turnBy(e.clientX - lookers.get(e.pointerId));
    lookers.set(e.pointerId, e.clientX);
  };
  const endLook = (e) => lookers.delete(e.pointerId);
  lookZone.addEventListener('pointerdown', startLook(lookZone));
  lookZone.addEventListener('pointermove', moveLook);
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // FIRE is also a look pad, so one thumb can shoot and aim at the same time.
  const fire = document.getElementById('btn-fire');
  fire.addEventListener('pointerdown', (e) => {
    input.fire = true;
    startLook(fire)(e);
    fire.classList.add('down');
  });
  fire.addEventListener('pointermove', moveLook);
  const endFire = (e) => {
    input.fire = false;
    endLook(e);
    fire.classList.remove('down');
  };
  fire.addEventListener('pointerup', endFire);
  fire.addEventListener('pointercancel', endFire);

  const tap = (id, action) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      action();
      el.classList.add('down');
    });
    const up = () => el.classList.remove('down');
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  tap('btn-use', () => (input.use = true));
  tap('btn-weapon', () => (input.nextWeapon = true));
  tap('btn-pause', () => (input.pause = true));

  root.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    // Show touch controls once we know a finger is being used.
    show(visible) {
      root.hidden = !visible;
    },
    applySettings() {
      root.style.setProperty('--touch-opacity', settings.touchOpacity);
      document.body.classList.toggle('lefty', settings.leftHanded);
    },
  };
}
