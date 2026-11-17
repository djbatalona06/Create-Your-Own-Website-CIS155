// A tiny generative synthwave band: a pad, a bassline, an arpeggio and hi-hats.
// A "scheduler" looks a little ahead in time and books each note precisely,
// which keeps the beat steady even if the game stutters.
import { audio } from './audio.js';

const SONGS = {
  // root note (MIDI), chord offsets per bar, tempo, how wobbly the pitch is
  market: { bpm: 96, root: 45, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-7, 0, 5, 9]], arp: true, hats: true, wobble: 0 },
  motel: { bpm: 72, root: 43, chords: [[0, 3, 7, 10], [5, 8, 12, 15], [-2, 2, 5, 9], [0, 3, 7, 14]], arp: false, hats: false, wobble: 9 },
  tower: { bpm: 112, root: 40, chords: [[0, 3, 7, 12], [1, 5, 8, 13], [0, 3, 7, 12], [-2, 3, 7, 10]], arp: true, hats: true, wobble: 0 },
  boss: { bpm: 138, root: 40, chords: [[0, 3, 6, 12], [1, 4, 7, 13], [0, 3, 6, 12], [-1, 3, 6, 11]], arp: true, hats: true, wobble: 4, kick: true },
};

const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

let song = null;
let timer = null;
let step = 0;
let nextTime = 0;
let delay = null;

function voice(type, freq, start, length, volume, filterHz, detune = 0) {
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  if (song.wobble) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.3;
    depth.gain.value = song.wobble;
    lfo.connect(depth).connect(osc.detune);
    lfo.start(start);
    lfo.stop(start + length + 0.1);
  }
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterHz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.05, length * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(filter).connect(gain).connect(audio.music);
  if (delay && type === 'triangle') gain.connect(delay);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

function hat(start, volume) {
  const ctx = audio.ctx;
  const src = ctx.createBufferSource();
  src.buffer = audio.noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
  src.connect(filter).connect(gain).connect(audio.music);
  src.start(start, Math.random() * 0.5);
  src.stop(start + 0.06);
}

function kick(start) {
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(140, start);
  osc.frequency.exponentialRampToValueAtTime(40, start + 0.15);
  gain.gain.setValueAtTime(0.5, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
  osc.connect(gain).connect(audio.music);
  osc.start(start);
  osc.stop(start + 0.22);
}

function scheduleStep(t) {
  const sixteenth = 60 / song.bpm / 4;
  const bar = Math.floor(step / 16) % song.chords.length;
  const chord = song.chords[bar];
  const s = step % 16;
  if (s === 0) {
    for (const n of chord) {
      voice('sawtooth', midiToHz(song.root + 12 + n), t, sixteenth * 16, 0.035, 900, -7);
      voice('sawtooth', midiToHz(song.root + 12 + n), t, sixteenth * 16, 0.035, 900, 7);
    }
  }
  if (s % 4 === 0 || s === 6 || s === 14) {
    voice('square', midiToHz(song.root - 12 + chord[0]), t, sixteenth * 1.8, 0.09, 400);
  }
  if (song.arp && s % 2 === 0) {
    const note = chord[(s / 2) % chord.length] + (s >= 8 ? 12 : 0);
    voice('triangle', midiToHz(song.root + 24 + note), t, sixteenth * 1.5, 0.05, 3000);
  }
  if (song.hats && s % 2 === 1) hat(t, s % 4 === 3 ? 0.05 : 0.025);
  if (song.kick && s % 4 === 0) kick(t);
}

function tick() {
  if (!audio.ready || !song) return;
  const sixteenth = 60 / song.bpm / 4;
  while (nextTime < audio.ctx.currentTime + 0.15) {
    scheduleStep(nextTime);
    nextTime += sixteenth;
    step++;
  }
}

export function playMusic(name) {
  if (!audio.ctx) return;
  if (!delay) {
    // a simple echo for the arpeggio
    delay = audio.ctx.createDelay(1);
    delay.delayTime.value = 0.28;
    const feedback = audio.ctx.createGain();
    feedback.gain.value = 0.35;
    delay.connect(feedback).connect(delay);
    delay.connect(audio.music);
  }
  if (song === SONGS[name] && timer) return;
  song = SONGS[name] || SONGS.market;
  step = 0;
  nextTime = audio.ctx.currentTime + 0.1;
  clearInterval(timer);
  timer = setInterval(tick, 25);
}

export function stopMusic() {
  clearInterval(timer);
  timer = null;
  song = null;
}
