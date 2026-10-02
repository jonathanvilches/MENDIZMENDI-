// Sonidos del fútbol, sintetizados: golpeo según la potencia, toques de conducción, postes, red, silbato del árbitro y un
// público de fondo que sube con las ocasiones y estalla con los goles. Usa el contexto de audio del juego si lo hay.
export class FutbolAudio {
  constructor({ ctx = null, out = null } = {}) {
    try { this.ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    if (!this.ctx) return;
    this.own = !ctx;
    const c = this.ctx;
    this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(out || c.destination);
    const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2; }
    this.noise = buf;
    // público: ruido filtrado en bucle, con su volumen según la emoción del partido
    this.crowd = c.createGain(); this.crowd.gain.value = 0; this.crowd.connect(this.out);
    for (const [f, q, v] of [[520, 0.7, 1], [1150, 0.9, 0.55], [2400, 1.2, 0.2]]) {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = 0.7 + Math.random() * 0.2;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = v; s.connect(bp); bp.connect(g); g.connect(this.crowd); s.start();
      (this.loops ||= []).push(s);
    }
    this.level = 0.25; this.target = 0.25;
  }
  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {}); }
  tone(f, dur, type = 'sine', vol = 0.2, t0 = 0, glide = null) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + t0;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  hiss(dur, f, q, vol, t0 = 0, type = 'bandpass') {
    const c = this.ctx; if (!c) return; const t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = this.noise; const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bf); bf.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  kick(power = 10) { const k = Math.min(1, power / 28); this.tone(150, 0.12, 'sine', 0.25 + 0.4 * k, 0, 55); this.hiss(0.05, 1800 + 1200 * k, 1, 0.25 + 0.5 * k); }
  touch() { this.tone(120, 0.06, 'sine', 0.1, 0, 70); this.hiss(0.03, 1200, 1, 0.06); }
  post() { this.tone(980, 0.5, 'triangle', 0.28); this.tone(1490, 0.35, 'triangle', 0.16); this.hiss(0.08, 4000, 2, 0.25); }
  net() { this.hiss(0.45, 1400, 0.5, 0.35, 0, 'lowpass'); this.hiss(0.25, 3200, 0.8, 0.12, 0.03); }
  board() { this.tone(90, 0.12, 'square', 0.12, 0, 60); this.hiss(0.08, 700, 1, 0.15); }
  /** Silbato: n = 1 corto (saque, falta), 2 dos cortos, 3 largo (final de parte) */
  whistle(n = 1) {
    const c = this.ctx; if (!c) return;
    const blow = (t0, dur) => {
      const t = c.currentTime + t0, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 2750; lfo.frequency.value = 32; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.setValueAtTime(0.16, t + dur - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.out); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    };
    if (n === 3) { blow(0, 0.28); blow(0.36, 0.28); blow(0.72, 0.9); } else if (n === 2) { blow(0, 0.18); blow(0.26, 0.18); } else blow(0, 0.35);
  }
  /** El público: «uyyy» en una ocasión, estallido en el gol, murmullo en los saques. */
  ooh() { this.hiss(1.1, 900, 0.7, 0.3); this.tone(330, 0.9, 'sawtooth', 0.025, 0, 230); this.bump(0.75, 1.4); }
  roar() { this.hiss(2.8, 800, 0.4, 0.45); this.hiss(2.4, 1700, 0.6, 0.3, 0.1); this.bump(1, 3.5); }
  groan() { this.hiss(1.0, 500, 0.6, 0.18); this.bump(0.5, 1); }
  bump(v, secs) { this.target = Math.max(this.target, v); this.bumpT = secs; }
  update(dt, tension = 0.25) {
    if (!this.ctx) return;
    if ((this.bumpT -= dt) <= 0) this.target = tension;
    this.level += (this.target - this.level) * Math.min(1, dt * 2.5);
    this.crowd.gain.setTargetAtTime(0.05 + this.level * 0.22, this.ctx.currentTime, 0.1);
  }
  dispose() {
    if (!this.ctx) return;
    for (const s of this.loops || []) try { s.stop(); } catch (e) { }
    try { this.out.disconnect(); } catch (e) { }
    if (this.own) this.ctx.close?.();
  }
}
