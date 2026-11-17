// Menu screens are plain HTML sections in index.html. Only one shows at a time.
// Buttons say what they do with a data-action="..." attribute, and this file
// routes every click to the matching handler in main.js.
import { LEVELS } from '../world/levels.js';
import { formatTime } from './hud.js';

export function setupMenus(handlers, save) {
  const screens = [...document.querySelectorAll('.screen')];
  let current = null;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    handlers[btn.dataset.action]?.(btn.dataset);
  });

  // Options: every input has a name that matches a setting.
  const form = document.getElementById('options-form');
  const syncForm = () => {
    for (const el of form.elements) {
      if (!el.name) continue;
      const v = save.settings[el.name];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    }
  };
  form.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.name) return;
    save.settings[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
    handlers.settingsChanged();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  return {
    get current() {
      return current;
    },

    show(id) {
      current = id;
      for (const s of screens) s.hidden = s.id !== `screen-${id}`;
      if (id === 'options') syncForm();
      // Move keyboard focus to the first button so menus work without a mouse.
      const first = document.querySelector(`#screen-${id} button, #screen-${id} input`);
      if (first) first.focus({ preventScroll: true });
    },

    hideAll() {
      current = null;
      for (const s of screens) s.hidden = true;
    },

    refreshTitle() {
      const cont = document.getElementById('btn-continue');
      cont.hidden = save.unlocked <= 1;
      cont.textContent = `Continue: Dream ${save.unlocked}`;
      const list = document.getElementById('level-list');
      list.replaceChildren(
        ...LEVELS.map((lv, i) => {
          const b = document.createElement('button');
          b.className = 'btn';
          b.dataset.action = 'pickLevel';
          b.dataset.level = String(i);
          const locked = i + 1 > save.unlocked;
          b.disabled = locked;
          const best = save.best[lv.id] ? ` · best ${formatTime(save.best[lv.id])}` : '';
          b.textContent = locked ? `Dream ${lv.id} · locked` : `Dream ${lv.id}: ${lv.name}${best}`;
          return b;
        })
      );
    },

    fillIntro(level) {
      document.getElementById('intro-number').textContent = `DREAM ${level.id} OF ${LEVELS.length}`;
      document.getElementById('intro-name').textContent = level.name;
      document.getElementById('intro-tagline').textContent = level.tagline;
    },

    fillStats(prefix, stats, best) {
      document.getElementById(`${prefix}-time`).textContent = formatTime(stats.time);
      document.getElementById(`${prefix}-kills`).textContent = `${stats.kills} / ${stats.total}`;
      const secrets = document.getElementById(`${prefix}-secrets`);
      if (secrets) secrets.textContent = `${stats.secrets} / ${stats.totalSecrets}`;
      const bestEl = document.getElementById(`${prefix}-best`);
      if (bestEl) bestEl.textContent = best ? formatTime(best) : '—';
    },
  };
}
