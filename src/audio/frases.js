// La música del paseo: frases cortas y mucho silencio. Mientras se explora un pueblo no suena una canción de continuo:
// cada medio minuto más o menos, un instrumento dice una frase de seis a diez segundos y calla, y lo que queda es el
// ambiente (el viento, el agua, los pájaros, los cencerros, los pasos). Cada familia de comarcas tiene sus timbres:
// txistu y txalaparta en la atlántica, txistu y violín en el Pirineo, acordeón y guitarra en la Zona Media, guitarra y
// acordeón en la Ribera. La música de verdad (las canciones grabadas, audio.js MUSICA) vuelve sola cuando pasa algo:
// una misión con persecución, una leyenda de noche, un minijuego, un partido, una fiesta.
// Los instrumentos son sintetizados (osciladores y ruido filtrado), a la espera de frases grabadas con instrumentos de
// verdad; las melodías son propias, sobre escalas sencillas, y no citan ninguna canción.
const SEMI = (n) => Math.pow(2, n / 12);
// cada frase: [semitonos sobre la tónica, tiempos]; null es un silencio
const FRASES = {
  // dórico, aire de zortziko lento: sube, se posa y vuelve
  atlantica: { tonica: 293.66, tempo: 76, frases: [
    [[0, 1], [3, 0.5], [5, 0.5], [7, 1.5], [5, 0.5], [3, 1], [2, 1], [0, 2]],
    [[7, 1], [10, 0.5], [9, 0.5], [7, 1], [5, 1], [7, 0.5], [3, 0.5], [0, 2.5]],
    [[0, 0.5], [2, 0.5], [3, 1], [7, 2], [null, 0.5], [5, 0.5], [3, 0.5], [2, 0.5], [0, 2]],
  ], voces: ['txistu', 'txistu', 'txalaparta'] },
  // eólico, más alto y más quieto: notas largas con eco de valle
  pirenaica: { tonica: 220, tempo: 62, frases: [
    [[0, 2], [7, 2], [5, 1], [3, 1], [0, 3]],
    [[12, 1.5], [10, 0.5], [8, 1], [7, 2], [3, 1], [5, 1], [0, 3]],
    [[0, 1], [3, 1], [7, 1], [8, 1.5], [7, 0.5], [3, 1], [2, 1], [0, 2.5]],
  ], voces: ['txistu', 'violin', 'violin'] },
  // mayor y a tres, con aire de jota tranquila
  media: { tonica: 196, tempo: 104, frases: [
    [[0, 1], [4, 1], [7, 1], [12, 2], [11, 1], [9, 1], [7, 1], [4, 1], [0, 3]],
    [[7, 0.5], [9, 0.5], [11, 1], [12, 1], [7, 2], [null, 1], [5, 1], [4, 1], [2, 1], [0, 3]],
    [[4, 1], [5, 1], [7, 2], [4, 1], [2, 1], [0, 1], [-5, 1], [0, 3]],
  ], voces: ['acordeon', 'guitarra', 'acordeon'] },
  // mayor con la sexta y la séptima bajas al caer: guitarra punteada, seca y luminosa
  ribera: { tonica: 164.81, tempo: 96, frases: [
    [[0, 0.5], [4, 0.5], [7, 0.5], [12, 1.5], [10, 0.5], [8, 0.5], [7, 1], [4, 1], [0, 3]],
    [[12, 1], [11, 0.5], [12, 0.5], [16, 1], [12, 1], [7, 1], [8, 0.5], [7, 0.5], [4, 1], [0, 3]],
    [[7, 1], [5, 0.5], [4, 0.5], [5, 1], [4, 0.5], [1, 0.5], [0, 2], [null, 0.5], [7, 0.5], [12, 2.5]],
  ], voces: ['guitarra', 'guitarra', 'acordeon'] },
};

export class Frases {
  constructor(ctx, destino, eco) {
    this.ctx = ctx; this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(destino);
    if (eco) { const e = ctx.createGain(); e.gain.value = 0.5; this.bus.connect(e); e.connect(eco); }
    this.espera = 5; this.ult = -1; this.suena = 0;
  }
  /** Cada cuarto de segundo. on: se está de paseo y con la música puesta; aire: la familia de la comarca; vol: el de la
   *  música; noche: de 0 a 1 (de noche, más espaciada y más bajo). */
  tick(dt, on, aire, vol, noche = 0) {
    const t = this.ctx.currentTime;
    this.bus.gain.setTargetAtTime(on ? vol * 1.05 * (1 - 0.3 * noche) : 0, t, on ? 0.4 : 0.25);
    if (!on) { this.espera = Math.min(this.espera, 6); return; }
    if ((this.suena -= dt) > 0) return;
    if ((this.espera -= dt) > 0) return;
    const F = FRASES[aire] || FRASES.media;
    let i = Math.floor(Math.random() * F.frases.length); if (i === this.ult) i = (i + 1) % F.frases.length; this.ult = i;
    const dur = this.toca(F, i);
    this.suena = dur; this.espera = (24 + Math.random() * 30) * (1 + 0.6 * noche);
  }
  toca(F, i) {
    const t0 = this.ctx.currentTime + 0.08, beat = 60 / F.tempo, voz = F.voces[i % F.voces.length];
    // (cada vez, en su tono o una cuarta arriba: la misma frase no suena dos veces igual)
    const base = F.tonica * (Math.random() < 0.35 ? SEMI(5) : 1) * (voz === 'txistu' ? 2 : 1);
    let t = t0;
    if (voz === 'txalaparta') {
      // la txalaparta no canta: responde con su ritmo de tablas, dos golpes y uno, y cierra
      for (const [n, d] of F.frases[i]) { if (n !== null) { this.tabla(t, n % 2 ? 620 : 470, 0.5); if (d >= 1) this.tabla(t + beat * 0.33, 540, 0.32); } t += d * beat; }
      return t - t0 + 0.6;
    }
    for (const [n, d] of F.frases[i]) { if (n !== null) this[voz](t, base * SEMI(n), d * beat); t += d * beat; }
    return t - t0 + 1.2;
  }
  env(g, t, dur, vol, ataque, cola) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.setValueAtTime(vol, t + Math.max(ataque, dur - cola)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + cola); }
  osc(tipo, f, t, fin, dest, desafina = 0) { const o = this.ctx.createOscillator(); o.type = tipo; o.frequency.value = f; o.detune.value = desafina; o.connect(dest); o.start(t); o.stop(fin); return o; }
  // txistu: una flauta de pico aguda y limpia, con un poco de soplo y un vibrato corto al final de las notas largas
  txistu(t, f, dur) {
    const c = this.ctx, g = c.createGain(), fin = t + dur + 0.25; g.connect(this.bus); this.env(g, t, dur * 0.92, 0.2, 0.035, 0.09);
    const o = this.osc('sine', f, t, fin, g), g2 = c.createGain(); g2.gain.value = 0.22; g2.connect(g); this.osc('sine', f * 2, t, fin, g2);
    if (dur > 0.7) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + dur * 0.8); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(fin); }
  }
  // violín: diente de sierra filtrado, ataque lento y vibrato
  violin(t, f, dur) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), fin = t + dur + 0.4; lp.type = 'lowpass'; lp.frequency.value = Math.min(5200, f * 6); lp.connect(g); g.connect(this.bus); this.env(g, t, dur, 0.13, 0.11, 0.18);
    const o = this.osc('sawtooth', f, t, fin, lp), l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.2; lg.gain.value = f * 0.007; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(fin);
  }
  // acordeón: dos lengüetas algo desafinadas entre sí y una octava por debajo, con el aire del fuelle
  acordeon(t, f, dur) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), fin = t + dur + 0.3; lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(g); g.connect(this.bus); this.env(g, t, dur * 0.96, 0.085, 0.05, 0.1);
    this.osc('sawtooth', f, t, fin, lp, -7); this.osc('sawtooth', f, t, fin, lp, 8); const g2 = c.createGain(); g2.gain.value = 0.5; g2.connect(lp); this.osc('square', f / 2, t, fin, g2);
  }
  // guitarra: cuerda punteada, que nace brillante y se apaga
  guitarra(t, f, dur) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), largo = Math.max(1.1, dur + 0.7), fin = t + largo + 0.1; lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(6000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), t + largo * 0.7); lp.connect(g); g.connect(this.bus);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + largo);
    this.osc('triangle', f, t, fin, lp); const g2 = c.createGain(); g2.gain.value = 0.35; g2.connect(lp); this.osc('sawtooth', f, t, fin, g2, 4);
  }
  // una tabla de la txalaparta: un golpe seco de madera, con su nota
  tabla(t, f, vol) {
    const c = this.ctx, g = c.createGain(); g.connect(this.bus); g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    const o = this.osc('sine', f, t, t + 0.2, g); o.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.12);
    const g2 = c.createGain(); g2.connect(this.bus); g2.gain.setValueAtTime(vol * 0.3, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); this.osc('square', f * 2.7, t, t + 0.06, g2);
  }
}
