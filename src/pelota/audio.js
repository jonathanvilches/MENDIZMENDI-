// Sonidos sintetizados (sin archivos): golpe de mano, frontis, chapa metálica, bote y el público.
const SHARED = { ctx: null };
export class PelotaAudio {
  constructor(ctx) { this.ctx = ctx || null; this.muted = false; }
  ensure() {
    if (this.muted) return null;
    try {
      // un solo contexto de sonido para todos los partidos (el iPhone admite pocos y no se liberan solos)
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = SHARED.ctx ||= new AC(); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (!this.noiseBuf && SHARED.noise && SHARED.ctx === this.ctx) this.noiseBuf = SHARED.noise;
      if (!this.noiseBuf) {
        const n = this.ctx.sampleRate * 1.2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = SHARED.noise = b;
      }
    } catch (e) { return null; }
    return this.ctx;
  }
  noise(t, dur, freq, q, gain, type = 'bandpass') {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
  }
  tone(t, dur, freq, gain, type = 'sine', slide = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // mano contra la pelota: «¡pac!» seco
  hit(power = 1) { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.noise(t, 0.06, 1900, 1.2, 0.5 * power); this.tone(t, 0.09, 190, 0.45 * power, 'sine', 0.5); }
  // pelota en el frontis: golpe con eco de pared
  front(power = 1) { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.noise(t, 0.08, 1200, 0.9, 0.45 * power); this.tone(t, 0.12, 140, 0.35 * power, 'sine', 0.6); this.noise(t + 0.11, 0.1, 900, 0.8, 0.08 * power); }
  // chapa: metálica, con parciales inarmónicos
  chapa() { const c = this.ensure(); if (!c) return; const t = c.currentTime; for (const [f, g] of [[620, 0.16], [1033, 0.12], [1710, 0.09], [2630, 0.06]]) this.tone(t, 0.55, f, g, 'triangle'); this.noise(t, 0.05, 3000, 1, 0.3); }
  floor(power = 1) { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.noise(t, 0.05, 700, 1, 0.3 * power); this.tone(t, 0.07, 110, 0.25 * power, 'sine', 0.7); }
  wall() { this.front(0.6); }
  // el golpe del «VS» de la presentación: un bombo grave con chasquido y el público que ruge
  slam() { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.tone(t, 0.7, 58, 0.6, 'sine', 0.35); this.tone(t, 0.25, 110, 0.3, 'triangle', 0.5); this.noise(t, 0.12, 2600, 0.7, 0.4); this.crowd('oh'); }
  // el público: «¡oooh!» (ruido filtrado que sube y baja) y aplausos
  crowd(kind = 'oh') {
    const c = this.ensure(); if (!c) return; const t = c.currentTime;
    if (kind === 'clap') { for (let i = 0; i < 22; i++) this.noise(t + Math.random() * 1.1, 0.04, 2400 + Math.random() * 1200, 1.5, 0.12); return; }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(640, t + 0.5); f.Q.value = 2.5;
    g.gain.setValueAtTime(0.0008, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 1.2);
  }
  // ovación del último tanto: todo el frontón en pie, cuatro segundos de aplausos que crecen y se apagan, y el rugido
  ovation() {
    const c = this.ensure(); if (!c) return; const t = c.currentTime;
    for (let i = 0; i < 160; i++) { const u = Math.random() * 4.2, k = Math.min(1, u / 0.5) * Math.min(1, (4.4 - u) / 1.4); this.noise(t + u, 0.035, 2000 + Math.random() * 1800, 1.4, 0.14 * k); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0008, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.5); g.gain.setValueAtTime(0.2, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0008, t + 4.4);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 4.5);
  }
  whistle() { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.tone(t, 0.25, 2300, 0.08, 'sine'); this.tone(t, 0.25, 2350, 0.05, 'sine'); }
}
