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
  oink(pos) { if (!this.ctx) return; const o = this.out(pos, 30, 0.5); if (!o) return; for (let i = 0; i < 2; i++) this.tone(150 + Math.random() * 40, 0.16, 'sawtooth', 0.12, o, i * 0.2, 0.02, 95); }
  // encierro: bufido de toro y retumbar de pezuñas sobre el adoquín
  snort(v = 0.6) { if (!this.ctx) return; this.noiseBurst(0.45, 380, 0.7, 0.5 * v, this.sfx, 0, 'lowpass'); this.tone(70, 0.5, 'sawtooth', 0.08 * v, this.sfx, 0.02, 0.04, 48); }
  hooves(v = 0.5) { if (!this.ctx) return; for (let i = 0; i < 4; i++) { this.noiseBurst(0.05, 160 + Math.random() * 120, 1.2, v * (0.6 + Math.random() * 0.4), this.sfx, i * 0.075); this.tone(55, 0.06, 'sine', 0.2 * v, this.sfx, i * 0.075); } }
  moo(pos) { if (!this.ctx) return; const o = this.out(pos, 50, 0.6); if (!o) return; this.tone(110, 1.3, 'sawtooth', 0.14, o, 0, 0.2, 85); }
  bark(pos) { if (!this.ctx) return; const o = this.out(pos, 45, 0.7); if (!o) return; for (let i = 0; i < 2; i++) { this.tone(420, 0.1, 'square', 0.12, o, i * 0.18, 0.005, 250); this.noiseBurst(0.08, 900, 1, 0.3, o, i * 0.18); } }
  cowbell(pos, v = 0.4) { if (!this.ctx) return; const o = this.out(pos, 45, v, 0.3); if (!o) return; const f = 520 + Math.random() * 90; this.tone(f, 0.5, 'square', 0.05, o); this.tone(f * 1.48, 0.4, 'triangle', 0.05, o); this.tone(f * 2.7, 0.2, 'sine', 0.03, o); }
  woodpecker(pos) { if (!this.ctx) return; const o = this.out(pos, 70, 0.8, 0.5); if (!o) return; for (let i = 0; i < 16; i++) this.noiseBurst(0.025, 1400, 3, 0.5 * (1 - i / 20), o, i * 0.055); }
  vulture() { }
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
  // sonido propio de cada criatura: 'call' al avisar de que se mueve, 'ambient' de fondo
  creature(who, kind, pos) {
    if (!this.ctx) return; const o = this.out(pos, 70, kind === 'call' ? 0.9 : 0.55, 0.7); if (!o) return;
    if (who === 'lamia') { this.tone(620, 1.1, 'sine', 0.08, o, 0, 0.2, kind === 'call' ? 980 : 700); this.tone(930, 0.9, 'sine', 0.04, o, 0.15, 0.3, 860); }
    else if (who === 'momotxorro') { for (let i = 0; i < (kind === 'call' ? 4 : 2); i++) this.cowbell(pos, 0.6); if (kind === 'call') this.noiseBurst(0.3, 300, 0.6, 0.35, o); }
    else { this.tone(62, kind === 'call' ? 1.2 : 0.8, 'sawtooth', 0.12, o, 0, 0.15, 48); this.noiseBurst(kind === 'call' ? 0.9 : 0.5, 180, 0.5, 0.3, o, 0, 'lowpass'); }
  }
  cricket() { if (!this.ctx) return; for (let i = 0; i < 3; i++) this.tone(4200, 0.03, 'sine', 0.015, this.sfx, i * 0.05); }
  // campana de la iglesia: tono grave con armónicos que se apagan despacio
  churchBell(n = 3) { if (!this.ctx) return; for (let i = 0; i < n; i++) { const t = i * 1.1; this.tone(392, 2.6, 'sine', 0.16, this.sfx, t, 0.004); this.tone(392 * 2.4, 1.6, 'sine', 0.06, this.sfx, t, 0.004); this.tone(392 * 0.5, 3, 'sine', 0.09, this.sfx, t, 0.01); this.tone(392 * 3.1, 0.8, 'triangle', 0.03, this.sfx, t, 0.002); } }
  magic() { if (!this.ctx) return; [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.06, this.sfx, i * 0.06)); }
  whoosh() { if (this.ctx) this.noiseBurst(0.4, 600, 0.4, 0.2, this.sfx, 0, 'lowpass'); }
  // público del estadio: rumor de muchas voces (ruido filtrado) que sube con las ocasiones y estalla en los goles
  crowd(v = 0.3) { if (!this.ctx) return; this.noiseBurst(1.3, 700, 0.6, 0.12 * v, this.sfx, 0, 'bandpass'); this.noiseBurst(1.1, 1500, 0.8, 0.05 * v, this.sfx, 0.1, 'bandpass'); }
  pelota(v = 1) { if (this.ctx) { this.tone(160, 0.08, 'sine', 0.3 * v, this.sfx); this.noiseBurst(0.06, 2500, 1.2, 0.5 * v, this.sfx); } }
  // ---- ambiente continuo ----
  update(dt, player, camYaw, night, inIrati) {
    if (!this.ctx) return;
    this.listener = { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: camYaw + Math.PI };
    const r = riverInfo(player.pos.x, player.pos.z);
    const wf = PLACES.waterfall, dp = wf ? Math.hypot(player.pos.x - wf.x, player.pos.z - wf.z) : 1e9;
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
  // ---- música generativa por ambiente ----
  // explore: txistu y tamboril (día) · night: arpa lenta y bordón suave · mystery: notas sueltas, tritono y
  // un latido grave (leyendas) · tension: ostinato rápido en menor con timbal (encierro, persecuciones) ·
  // game: aire alegre y saltarín con bajo (minijuegos, pelota, fútbol) · fiesta: charanga (San Fermín, carnaval)
  setMood(m) { if (m && m !== this.mood) { this.mood = m; this.moodT = 0; } }
  startMusic() {
    const ctx = this.ctx;
    const D = [293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];      // re dórico
    const A = [220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];        // la menor (eólico)
    const G = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.0];         // sol mayor
    const PH = {
      explore: [[4, 5, 6, 7, 6, 5, 4, 2, 3, 4, 3, 2, 1, 0, 1, 2], [7, 7, 6, 5, 6, 4, 5, 3, 4, 4, 2, 3, 1, 2, 0, -1], [0, 2, 4, 4, 5, 4, 3, 2, 4, 5, 6, 5, 4, 3, 2, 1], [4, 6, 7, 8, 7, 6, 5, 4, 5, 4, 3, 1, 2, 1, 0, -1]],
      night: [[0, -1, 2, -1, 4, -1, 2, -1, 3, -1, 5, -1, 4, -1, -1, -1], [4, -1, 3, -1, 2, -1, 0, -1, 1, -1, 2, -1, 0, -1, -1, -1]],
      mystery: [[0, -1, -1, 3, -1, -1, -1, -1, 5, -1, -1, 4, -1, -1, -1, -1], [6, -1, -1, -1, 5, -1, -1, 2, -1, -1, -1, -1, 1, -1, -1, -1]],
      tension: [[0, 0, 3, 0, 4, 0, 3, 2, 0, 0, 3, 0, 5, 4, 3, 2], [0, 0, 2, 0, 3, 0, 2, 1, 0, 0, 2, 0, 4, 3, 1, 0]],
      game: [[0, 2, 4, 2, 5, 4, 2, 4, 3, 5, 7, 5, 4, 2, 1, 2], [4, 4, 5, 7, 5, 4, 2, 0, 1, 2, 4, 2, 1, 0, 1, -1]],
      fiesta: [[4, 4, 4, 2, 4, 5, 7, -1, 7, 6, 5, 4, 5, 4, 2, -1], [2, 2, 2, 0, 2, 4, 5, -1, 5, 4, 2, 1, 2, 4, 0, -1]],
    };
    const MOOD = {
      explore: { sc: D, beat: 0.3, lead: 'flute', oct: 2, drum: 'tamboril', drone: 0.05 },
      night: { sc: D, beat: 0.42, lead: 'harp', oct: 1, drum: null, drone: 0.035, pad: true },
      mystery: { sc: A, beat: 0.38, lead: 'bell', oct: 2, drum: 'heart', drone: 0.06, pad: true, tritone: true },
      tension: { sc: A, beat: 0.16, lead: 'pluck', oct: 1, drum: 'timpani', drone: 0.07, bass: true },
      game: { sc: G, beat: 0.2, lead: 'flute', oct: 1, drum: 'pop', drone: 0, bass: true },
      fiesta: { sc: G, beat: 0.24, lead: 'brass', oct: 1, drum: 'banda', drone: 0, bass: true },
    };
    this.mood = this.mood || 'explore';
    let bar = 0, next = ctx.currentTime + 1, cur = this.mood;
    this.musicTimer = setInterval(() => {
      if (!this.musicOn || document.hidden) { next = ctx.currentTime + 0.5; return; }
      while (next < ctx.currentTime + 1.2) {
        // cambio de ambiente al empezar compás, con un pequeño fundido del bus
        if (this.mood !== cur) { cur = this.mood; bar = 0; const g = this.musicBus.gain, v = this.musicOn ? 0.32 : 0; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(v * 0.25, next); g.linearRampToValueAtTime(v, next + 1.2); }
        const M = MOOD[cur] || MOOD.explore, sc = M.sc, beat = M.beat, list = PH[cur] || PH.explore;
        const ph = list[(bar >> 1) % list.length], half = (bar % 2) * 8;
        for (let i = 0; i < 8; i++) {
          const n = ph[half + i], t = next + i * beat - ctx.currentTime;
          if (n >= 0 && (i % 2 === 0 || Math.random() < 0.85)) this.voice(M.lead, sc[n] * M.oct, beat * (i === 7 ? 1.8 : 0.95), t);
          if (M.tritone && n >= 0 && Math.random() < 0.25) this.voice('bell', sc[n] * M.oct * Math.SQRT2, beat * 3, t + beat * 0.5);
          const dr = M.drum;
          if (dr === 'tamboril') { if (i % 2 === 0) this.noiseBurst(0.08, 180, 1, i % 4 === 0 ? 0.45 : 0.25, this.musicBus, t, 'lowpass'); if (i % 4 === 2) this.noiseBurst(0.05, 2400, 2, 0.12, this.musicBus, t + beat * 0.5); }
          else if (dr === 'timpani') { this.tone(sc[0] / 4, 0.18, 'sine', i % 2 ? 0.12 : 0.22, this.musicBus, t, 0.003, sc[0] / 5); if (i % 2) this.noiseBurst(0.04, 3200, 1.5, 0.08, this.musicBus, t); }
          else if (dr === 'heart') { if (i === 0 || i === 1) this.tone(55, 0.22, 'sine', 0.18, this.musicBus, t + (i ? 0.05 : 0), 0.004, 42); }
          else if (dr === 'pop') { if (i % 2 === 0) this.noiseBurst(0.06, 160, 1, 0.3, this.musicBus, t, 'lowpass'); else this.noiseBurst(0.04, 3000, 2, 0.1, this.musicBus, t); }
          else if (dr === 'banda') { if (i % 2 === 0) this.noiseBurst(0.09, 120, 1, 0.42, this.musicBus, t, 'lowpass'); if (i % 2 === 1) this.noiseBurst(0.12, 5000, 0.8, 0.12, this.musicBus, t); }   // bombo y platillos
          if (M.bass && i % 2 === 0) this.tone(sc[[0, 0, 4, 3][(bar + (i >> 1)) % 4] % sc.length] / (cur === 'tension' ? 4 : 2), beat * 1.6, cur === 'tension' ? 'sawtooth' : 'triangle', cur === 'tension' ? 0.035 : 0.06, this.musicBus, t, 0.01);
        }
        if (M.drone) this.tone(sc[0] / 2, beat * 8, 'triangle', M.drone, this.musicBus, next - ctx.currentTime, 0.3);
        if (M.pad) { for (const k of [0, 2, 4]) this.tone(sc[k] / 2, beat * 8, 'sine', 0.025, this.musicBus, next - ctx.currentTime, beat * 2); }
        next += beat * 8; bar++;
      }
    }, 250);
  }
  // instrumentos: txistu (flauta), arpa, campana, cuerda pulsada, metales de charanga
  voice(kind, freq, dur, t0) {
    if (kind === 'flute') return this.flute(freq, dur, t0);
    const ctx = this.ctx, t = ctx.currentTime + t0, g = ctx.createGain(), o = ctx.createOscillator();
    if (kind === 'harp' || kind === 'pluck') {
      o.type = kind === 'harp' ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(freq, t);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(kind === 'harp' ? 2400 : 1800, t); f.frequency.exponentialRampToValueAtTime(400, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(kind === 'harp' ? 0.12 : 0.07, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (kind === 'harp' ? 2.2 : 0.9));
      o.connect(f); f.connect(g);
    } else if (kind === 'bell') {
      o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.76; const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + dur * 2.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 2.4);
      o.connect(g);
    } else {   // brass
      o.type = 'square'; o.frequency.setValueAtTime(freq, t);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2200, t + 0.06);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.03); g.gain.setValueAtTime(0.05, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g);
    }
    g.connect(this.musicBus); const vg = ctx.createGain(); vg.gain.value = kind === 'brass' ? 0.12 : 0.35; g.connect(vg); vg.connect(this.verb);
    o.start(t); o.stop(t + dur * 2.6);
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
  setMusic(on) { this.musicOn = on; if (this.musicBus) { this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime); this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.3); } }
  setVolume(v) { if (this.master) this.master.gain.value = v; }
}
