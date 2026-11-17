// One shared Web Audio context with separate volume knobs for music and effects.
// Phones only allow sound after the player taps something, so `unlock()` is
// called from the first button press.
export const audio = {
  ctx: null,
  master: null,
  sfx: null,
  music: null,
  noiseBuffer: null,

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createDynamicsCompressor();
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      // One second of white noise, reused for hiss, static and explosions.
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.setVolumes(this.pendingMusic ?? 0.5, this.pendingSfx ?? 0.8);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  setVolumes(music, sfx) {
    this.pendingMusic = music;
    this.pendingSfx = sfx;
    if (!this.ctx) return;
    this.music.gain.value = music * 0.5;
    this.sfx.gain.value = sfx;
  },

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  },
};
