// Settings and progress live in this browser's localStorage.
// Private browsing can block storage, so every read and write is wrapped:
// the game still works, it just won't remember anything.
const KEY = 'neonSomnia.v1';

export const DEFAULT_SETTINGS = {
  musicVol: 0.5,
  sfxVol: 0.8,
  lookSens: 1,
  touchOpacity: 0.55,
  leftHanded: false,
  fx: 'full', // full | soft | off  (soft/off reduce flashing)
  quality: 'med', // low | med | high
  vibrate: true,
};

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked: ignore
  }
}

export function loadSave() {
  const data = read();
  return {
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    unlocked: Math.min(3, Math.max(1, data.unlocked || 1)),
    best: data.best || {},
  };
}

export function storeSave(save) {
  write({ settings: save.settings, unlocked: save.unlocked, best: save.best });
}
