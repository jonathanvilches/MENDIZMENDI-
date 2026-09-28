// Sonido procedural con Web Audio: ambiente (río, viento, pájaros), pasos, animales, campanas, música
import { riverInfo, PLACES } from './world/layout.js';
import { clamp } from './util/math.js';

export class Sound {
  constructor() {
    this.ctx = null; this.enabled = true; this.musicOn = true;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.birdT = 1; this.bellT = 5;
  }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.32; this.musicBus.connect(this.master);
    // reverb sencilla
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.2); const vg = ctx.createGain(); vg.gain.value = 0.25; this.verb.connect(vg); vg.connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    // río: ruido filtrado en bucle
    this.river = this.loopNoise(700, 0.9); this.river.g.gain.value = 0;
    // viento
    this.wind = this.loopNoise(300, 0.4); this.wind.g.gain.value = 0.02;
    this.startMusic();
  }
  impulse(sec) {
    const ctx = this.ctx, len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  makeNoise(sec) {
    const ctx = this.ctx, b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
    return b;
  }
  loopNoise(freq, q) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start();
    return { src, f, g };
  }
  // posición 3D simple: atenuación + panorama
  spatial(pos, maxD = 40) {
    if (!pos) return { gain: 1, pan: 0 };
    const dx = pos.x - this.listener.x, dz = pos.z - this.listener.z, d = Math.hypot(dx, dz);
    const gain = clamp(1 - d / maxD, 0, 1) ** 1.5;
    const ang = Math.atan2(dx, dz) - this.listener.yaw;
    return { gain, pan: clamp(-Math.sin(ang), -1, 1) * 0.8 };
  }
  out(pos, maxD, vol = 1, verb = 0) {
    const ctx = this.ctx, s = this.spatial(pos, maxD);
    if (s.gain * vol < 0.005) return null;
    const g = ctx.createGain(); g.gain.value = s.gain * vol;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = s.pan; g.connect(p); p.connect(this.sfx); if (verb) { const vg = ctx.createGain(); vg.gain.value = verb; p.connect(vg); vg.connect(this.verb); } }
    else g.connect(this.sfx);
    return g;
  }
  tone(freq, dur, type, vol, dest, t0 = 0, attack = 0.005, glide) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noiseBurst(dur, freq, q, vol, dest, t0 = 0, type = 'bandpass') {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  // ---- efectos ----
  step(surf, speed) {
    if (!this.ctx) return;
    const v = 0.18 + clamp(speed / 7, 0, 1) * 0.15;
    const d = this.sfx;
    if (surf === 'stone') { this.noiseBurst(0.07, 1800, 1.2, v * 0.9, d); this.tone(140 + Math.random() * 30, 0.05, 'triangle', v * 0.3, d); }
    else if (surf === 'wood') { this.tone(190 + Math.random() * 40, 0.1, 'triangle', v * 0.7, d); this.noiseBurst(0.05, 900, 2, v * 0.3, d); }
    else if (surf === 'water') { this.noiseBurst(0.22, 1300, 0.7, v * 1.1, d); this.noiseBurst(0.15, 3000, 1, v * 0.5, d, 0.04); }
    else if (surf === 'leaves') { this.noiseBurst(0.16, 2600, 0.6, v * 0.9, d); }
    else if (surf === 'dirt') { this.noiseBurst(0.09, 900, 0.9, v * 0.9, d); }
    else this.noiseBurst(0.12, 2100, 0.5, v * 0.55, d);
  }
  jump() { if (this.ctx) this.noiseBurst(0.12, 1200, 0.8, 0.12, this.sfx); }
  land(v) { if (this.ctx) { this.noiseBurst(0.15, 500, 0.8, clamp(v / 10, 0.1, 0.4), this.sfx); } }
  splash(pos, v = 0.5) { if (!this.ctx) return; const o = this.out(pos, 30, v); if (o) { this.noiseBurst(0.35, 1500, 0.5, 1, o); this.noiseBurst(0.2, 3500, 1, 0.5, o, 0.05); } }
  ui(kind = 'click') {
    if (!this.ctx) return;
    const d = this.sfx;
    if (kind === 'click') this.tone(880, 0.06, 'sine', 0.12, d);
    else if (kind === 'open') { this.tone(520, 0.08, 'sine', 0.1, d); this.tone(780, 0.1, 'sine', 0.1, d, 0.05); }
    else if (kind === 'talk') this.tone(420 + Math.random() * 200, 0.05, 'triangle', 0.05, d);
    else if (kind === 'coin') { this.tone(988, 0.08, 'square', 0.06, d); this.tone(1319, 0.25, 'square', 0.06, d, 0.07); }
    else if (kind === 'card') { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, d, i * 0.07)); }
    else if (kind === 'error') this.tone(200, 0.15, 'square', 0.06, d, 0, 0.005, 150);
    else if (kind === 'photo') { this.noiseBurst(0.05, 4000, 1, 0.3, d); this.tone(1200, 0.04, 'square', 0.05, d, 0.06); }
  }
  fanfare() {
    if (!this.ctx) return;
    const d = this.sfx, notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((f, i) => { this.tone(f, 0.35, 'triangle', 0.14, d, i * 0.11); this.tone(f / 2, 0.35, 'sine', 0.08, d, i * 0.11); });
  }
  baa(pos) { if (!this.ctx) return; const o = this.out(pos, 35, 0.5); if (!o) return; const f0 = 280 + Math.random() * 120; const osc = this.tone(f0, 0.7, 'sawtooth', 0.12, o, 0, 0.05); const lfo = this.ctx.createOscillator(); lfo.frequency.value = 22; const lg = this.ctx.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(); lfo.stop(this.ctx.currentTime + 0.8); }
  moo(pos) { if (!this.ctx) return; const o = this.out(pos, 50, 0.6); if (!o) return; this.tone(110, 1.3, 'sawtooth', 0.14, o, 0, 0.2, 85); }
  bark(pos) { if (!this.ctx) return; const o = this.out(pos, 45, 0.7); if (!o) return; for (let i = 0; i < 2; i++) { this.tone(420, 0.1, 'square', 0.12, o, i * 0.18, 0.005, 250); this.noiseBurst(0.08, 900, 1, 0.3, o, i * 0.18); } }
  cowbell(pos, v = 0.4) { if (!this.ctx) return; const o = this.out(pos, 45, v, 0.3); if (!o) return; const f = 520 + Math.random() * 90; this.tone(f, 0.5, 'square', 0.05, o); this.tone(f * 1.48, 0.4, 'triangle', 0.05, o); this.tone(f * 2.7, 0.2, 'sine', 0.03, o); }
  woodpecker(pos) { if (!this.ctx) return; const o = this.out(pos, 70, 0.8, 0.5); if (!o) return; for (let i = 0; i < 16; i++) this.noiseBurst(0.025, 1400, 3, 0.5 * (1 - i / 20), o, i * 0.055); }
  vulture() { }
  churchBell(n, pos) {
    if (!this.ctx) return;
    const o = this.out(pos, 400, 0.9, 0.6); if (!o) return;
    for (let i = 0; i < n; i++) { const t = i * 1.6; [220, 440 * 1.19, 660, 880 * 1.5].forEach((f, k) => this.tone(f, 3, 'sine', [0.2, 0.08, 0.06, 0.03][k], o, t, 0.01)); }
  }
  bird(pos) {
    if (!this.ctx) return; const o = this.out(pos, 50, 0.35, 0.3); if (!o) return;
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 5), kind = Math.random();
    for (let i = 0; i < n; i++) {
      const t = i * (0.08 + Math.random() * 0.06);
      if (kind < 0.5) this.tone(base, 0.07, 'sine', 0.1, o, t, 0.005, base * (1.3 + Math.random() * 0.4));
      else this.tone(base * 1.2, 0.09, 'sine', 0.1, o, t, 0.005, base * 0.8);
    }
  }
  owl(pos) { if (!this.ctx) return; const o = this.out(pos, 80, 0.4, 0.6); if (!o) return; this.tone(380, 0.35, 'sine', 0.12, o, 0, 0.05, 360); this.tone(380, 0.6, 'sine', 0.12, o, 0.5, 0.05, 350); }
  cricket() { if (!this.ctx) return; for (let i = 0; i < 3; i++) this.tone(4200, 0.03, 'sine', 0.015, this.sfx, i * 0.05); }
  magic() { if (!this.ctx) return; [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.06, this.sfx, i * 0.06)); }
  whoosh() { if (this.ctx) this.noiseBurst(0.4, 600, 0.4, 0.2, this.sfx, 0, 'lowpass'); }
  pelota(v = 1) { if (this.ctx) { this.tone(160, 0.08, 'sine', 0.3 * v, this.sfx); this.noiseBurst(0.06, 2500, 1.2, 0.5 * v, this.sfx); } }
  // ---- ambiente continuo ----
  update(dt, player, camYaw, night, inIrati) {
    if (!this.ctx) return;
    this.listener = { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: camYaw + Math.PI };
    const r = riverInfo(player.pos.x, player.pos.z);
    const dp = Math.hypot(player.pos.x - PLACES.waterfall.x, player.pos.z - PLACES.waterfall.z);
    const rv = clamp(1 - r.edge / 30, 0, 1) ** 1.6 * 0.5 + clamp(1 - dp / 60, 0, 1) ** 1.5 * 0.7;
    this.river.g.gain.setTargetAtTime(rv, this.ctx.currentTime, 0.3);
    this.wind.g.gain.setTargetAtTime(0.03 + clamp((player.pos.y - 20) / 60, 0, 0.1), this.ctx.currentTime, 0.5);
    this.birdT -= dt;
    if (this.birdT < 0) {
      this.birdT = night > 0.5 ? 2 + Math.random() * 6 : (inIrati ? 0.6 : 1.2) + Math.random() * 2.5;
      const a = Math.random() * 6.28, d = 8 + Math.random() * 25;
      const p = { x: player.pos.x + Math.cos(a) * d, z: player.pos.z + Math.sin(a) * d };
      if (night > 0.5) { if (Math.random() < 0.3) this.owl(p); else this.cricket(); }
      else this.bird(p);
    }
  }
  // ---- música generativa: txistu (flauta) + tamboril ----
  startMusic() {
    const ctx = this.ctx;
    // escala dórica en re, motivos de aire popular
    const scale = [293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];
    const phrases = [
      [4, 5, 6, 7, 6, 5, 4, 2, 3, 4, 3, 2, 1, 0, 1, 2],
      [7, 7, 6, 5, 6, 4, 5, 3, 4, 4, 2, 3, 1, 2, 0, -1],
      [0, 2, 4, 4, 5, 4, 3, 2, 4, 5, 6, 5, 4, 3, 2, 1],
      [4, 6, 7, 8, 7, 6, 5, 4, 5, 4, 3, 1, 2, 1, 0, -1],
    ];
    let bar = 0, next = ctx.currentTime + 1;
    const beat = 0.3;
    this.musicTimer = setInterval(() => {
      if (!this.musicOn || document.hidden) { next = ctx.currentTime + 0.5; return; }
      while (next < ctx.currentTime + 1.2) {
        const ph = phrases[(bar >> 1) % phrases.length];
        const half = (bar % 2) * 8;
        for (let i = 0; i < 8; i++) {
          const n = ph[half + i];
          const t = next + i * beat - ctx.currentTime;
          if (n >= 0 && (i % 2 === 0 || Math.random() < 0.8)) this.flute(scale[n] * 2, beat * (i === 7 ? 1.8 : 0.95), t);
          // tamboril
          if (i % 2 === 0) this.noiseBurst(0.08, 180, 1, i % 4 === 0 ? 0.45 : 0.25, this.musicBus, t, 'lowpass');
          if (i % 4 === 2) this.noiseBurst(0.05, 2400, 2, 0.12, this.musicBus, t + beat * 0.5);
        }
        // bordón
        this.tone(scale[0] / 2, beat * 8, 'triangle', 0.05, this.musicBus, next - ctx.currentTime, 0.3);
        next += beat * 8; bar++;
      }
    }, 250);
  }
  flute(freq, dur, t0) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = freq * 0.008; vib.connect(vg); vg.connect(o.frequency);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * 2, t);
    const g2 = ctx.createGain(); g2.gain.value = 0.15; o2.connect(g2);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.03); g.gain.setValueAtTime(0.1, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g2.connect(g); g.connect(this.musicBus);
    const vgv = ctx.createGain(); vgv.gain.value = 0.3; g.connect(vgv); vgv.connect(this.verb);
    o.start(t); o2.start(t); vib.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    this.noiseBurst(0.05, 3000, 1, 0.03, this.musicBus, t0);
  }
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.3); }
  setVolume(v) { if (this.master) this.master.gain.value = v; }
}
