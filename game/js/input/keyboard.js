// Desktop controls: WASD or arrow keys to move, mouse to turn (click the game
// to lock the mouse), click or Ctrl to fire, E or Space to use, 1-3 or Q to
// swap weapons, Esc or P to pause.
import { input } from './input.js';

export function setupKeyboard(canvas, settings, isPlaying) {
  const held = new Set();

  const update = () => {
    const f = held.has('KeyW') || held.has('ArrowUp');
    const b = held.has('KeyS') || held.has('ArrowDown');
    const l = held.has('KeyA');
    const r = held.has('KeyD');
    input.moveY = (f ? 1 : 0) - (b ? 1 : 0);
    input.moveX = (r ? 1 : 0) - (l ? 1 : 0);
    input.fire = held.has('ControlLeft') || held.has('ControlRight') || held.has('Mouse0');
  };

  window.addEventListener('keydown', (e) => {
    if (!isPlaying()) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Space') input.use = true;
    if (e.code === 'KeyQ' || e.code === 'Tab') input.nextWeapon = true;
    if (e.code === 'Digit1') input.slot = 1;
    if (e.code === 'Digit2') input.slot = 2;
    if (e.code === 'Digit3') input.slot = 3;
    if (e.code === 'Escape' || e.code === 'KeyP') input.pause = true;
    update();
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
    update();
  });
  window.addEventListener('blur', () => {
    held.clear();
    update();
  });

  // Arrow keys turn smoothly while held.
  const turnHeld = (dt) => {
    const l = held.has('ArrowLeft');
    const r = held.has('ArrowRight');
    if (l || r) input.turn += ((r ? 1 : 0) - (l ? 1 : 0)) * 2.6 * dt;
  };

  canvas.addEventListener('mousedown', (e) => {
    if (!isPlaying() || e.button !== 0) return;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
      return;
    }
    held.add('Mouse0');
    update();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      held.delete('Mouse0');
      update();
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas && isPlaying()) {
      input.turn += e.movementX * 0.0025 * settings.lookSens;
    }
  });

  return { turnHeld, release: () => document.exitPointerLock?.() };
}
