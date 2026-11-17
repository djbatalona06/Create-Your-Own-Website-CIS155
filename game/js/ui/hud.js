// The on-screen numbers (health, armor, volts...). It only touches the page
// when a value actually changes, which keeps phones fast.
import { WEAPONS } from '../weapons.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    root: $('hud'),
    hp: $('hud-hp'),
    armor: $('hud-armor'),
    volts: $('hud-volts'),
    weapon: $('hud-weapon'),
    level: $('hud-level'),
    time: $('hud-time'),
    keyRed: $('hud-key-red'),
    keyBlue: $('hud-key-blue'),
    lucid: $('hud-lucid'),
    message: $('hud-message'),
  };
  const last = {};
  let messageTimer = 0;

  const set = (name, value, apply) => {
    if (last[name] === value) return;
    last[name] = value;
    apply(value);
  };

  return {
    show(visible) {
      els.root.hidden = !visible;
    },

    update(s) {
      set('hp', Math.ceil(s.hp), (v) => {
        els.hp.textContent = v;
        els.hp.parentElement.classList.toggle('low', v <= 25);
      });
      set('armor', Math.ceil(s.armor), (v) => (els.armor.textContent = v));
      set('volts', s.volts, (v) => (els.volts.textContent = v));
      set('weapon', s.weapon, (v) => (els.weapon.textContent = WEAPONS[v].name));
      set('level', s.level, (v) => (els.level.textContent = v));
      set('time', Math.floor(s.time), (v) => (els.time.textContent = formatTime(v)));
      set('keyRed', s.keys.has('keyRed'), (v) => (els.keyRed.hidden = !v));
      set('keyBlue', s.keys.has('keyBlue'), (v) => (els.keyBlue.hidden = !v));
      set('lucid', Math.ceil(s.lucid), (v) => {
        els.lucid.hidden = v <= 0;
        els.lucid.textContent = `LUCID ${v}`;
      });
    },

    message(text, seconds) {
      els.message.textContent = text;
      els.message.classList.add('show');
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => els.message.classList.remove('show'), seconds * 1000);
    },

    clearMessage() {
      clearTimeout(messageTimer);
      els.message.classList.remove('show');
    },
  };
}

export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
