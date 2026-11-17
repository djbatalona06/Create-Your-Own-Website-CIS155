// Sound effects made from scratch: oscillators (beeps and buzzes) and noise
// (hiss), shaped with volume envelopes and filters. No sound files at all.
import { audio } from './audio.js';

function tone(type, freqStart, freqEnd, duration, volume = 0.3, delay = 0) {
  const ctx = audio.ctx;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(audio.sfx);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noise(duration, volume = 0.3, filterType = 'lowpass', freqStart = 4000, freqEnd = 300, delay = 0) {
  const ctx = audio.ctx;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = audio.noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freqStart, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(filter).connect(gain).connect(audio.sfx);
  src.start(t, Math.random() * 0.5);
  src.stop(t + duration + 0.02);
}

const SOUNDS = {
  pulse: () => {
    tone('square', 1400, 220, 0.12, 0.18);
    noise(0.06, 0.12, 'highpass', 6000, 2000);
  },
  scatter: () => {
    noise(0.35, 0.45, 'lowpass', 5000, 200);
    tone('sawtooth', 300, 60, 0.25, 0.2);
  },
  lance: () => {
    tone('sawtooth', 200, 2400, 0.25, 0.2);
    tone('sine', 2400, 600, 0.4, 0.15, 0.05);
  },
  empty: () => tone('square', 140, 120, 0.06, 0.12),
  orb: () => tone('sine', 520, 260, 0.35, 0.12),
  bite: () => noise(0.15, 0.3, 'bandpass', 1800, 600),
  blink: () => {
    tone('triangle', 2000, 200, 0.2, 0.15);
    noise(0.1, 0.15, 'highpass', 8000, 4000);
  },
  enemyHurt: () => tone('square', 400, 180, 0.08, 0.12),
  enemyDie: () => {
    tone('square', 600, 40, 0.5, 0.18);
    noise(0.4, 0.2, 'bandpass', 3000, 200);
  },
  hurt: () => {
    tone('sawtooth', 160, 70, 0.25, 0.25);
    noise(0.2, 0.25, 'lowpass', 2000, 200);
  },
  pickup: () => {
    tone('triangle', 660, 660, 0.08, 0.18);
    tone('triangle', 990, 990, 0.1, 0.18, 0.07);
  },
  weapon: () => {
    tone('triangle', 440, 440, 0.08, 0.2);
    tone('triangle', 660, 660, 0.08, 0.2, 0.08);
    tone('triangle', 880, 880, 0.15, 0.2, 0.16);
  },
  key: () => {
    for (let i = 0; i < 4; i++) tone('sine', 520 + i * 260, 520 + i * 260, 0.1, 0.15, i * 0.06);
  },
  door: () => noise(0.6, 0.25, 'lowpass', 300, 1500),
  locked: () => tone('square', 180, 160, 0.2, 0.15),
  lucid: () => {
    tone('sine', 200, 1600, 1.2, 0.18);
    tone('sine', 300, 2400, 1.2, 0.12, 0.1);
  },
  warp: () => {
    tone('sine', 1200, 80, 0.5, 0.2);
    noise(0.3, 0.12, 'highpass', 8000, 1000);
  },
  wall: () => noise(0.9, 0.2, 'lowpass', 120, 400),
  eye: () => {
    tone('sine', 880, 110, 1.4, 0.2);
    tone('triangle', 660, 82, 1.4, 0.15, 0.2);
  },
  alarm: () => {
    for (let i = 0; i < 6; i++) tone('square', i % 2 ? 1320 : 990, i % 2 ? 1320 : 990, 0.09, 0.12, i * 0.1);
  },
  bossHit: () => tone('square', 220, 110, 0.1, 0.15),
  exit: () => {
    for (let i = 0; i < 6; i++) tone('triangle', 330 * 2 ** (i / 4), 330 * 2 ** (i / 4), 0.25, 0.15, i * 0.09);
  },
};

export function playSfx(name) {
  if (!audio.ready || !SOUNDS[name]) return;
  try {
    SOUNDS[name]();
  } catch {
    // A sound failing must never break the game.
  }
}
