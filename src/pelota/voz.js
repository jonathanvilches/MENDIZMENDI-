// La voz del comentarista de pelota (las frases, comenta.js): siempre la grabada por el autor, nunca una voz sintética.
// src/assets/voz/<hombre|mujer>/<es|eu>/<clave>.mp3 (la clave, «dejada-2», sale en el guion de grabación); si no está la
// de esa voz, la de la otra; y si en ese idioma no hay grabación (el euskera, de momento), la misma frase en castellano.
// Sin ninguna grabación de esa frase, no se dice nada. Antes, sin grabación, hablaba la voz del sistema (la del teléfono
// o el ordenador), y el autor no la quiere: solo su voz. Una frase cada vez: si llega otra mientras habla, espera, y solo
// la última. Mientras habla, la música baja a un tercio para que no lo tape (audio.js, voz) y vuelve al acabar.
const CLIPS = import.meta.glob('../assets/voz/*/*/*.mp3', { query: '?url', import: 'default' });
const clip = (voz, lang, id) => CLIPS[`../assets/voz/${voz}/${lang}/${id}.mp3`];
const otra = (v) => (v === 'hombre' ? 'mujer' : 'hombre');

export class Voz {
  constructor() { this.cola = null; this.habla_ = false; this.buf = new Map(); }
  /** Dice la frase c ({ id, texto, r, voz, lang }) con la grabación. true si se va a oír */
  habla(c) {
    if (!c || !c.voz) return false;
    const L = clip(c.voz, c.lang, c.id) || clip(otra(c.voz), c.lang, c.id) || clip(c.voz, 'es', c.id) || clip(otra(c.voz), 'es', c.id);
    if (!L) return false;
    if (this.habla_) { this.cola = { c, t: performance.now() }; return true; }
    this.grabada(L, c); return true;
  }
  // (al acabar una, la que esperaba, si no es de hace más de 5 s; si no hay otra, la música vuelve)
  sigue() { this.habla_ = false; const q = this.cola; this.cola = null; if (q && performance.now() - q.t < 5000) this.habla(q.c); if (!this.habla_) this.musica(false); }
  musica(on) { try { window.__sound?.voz?.(on); } catch (e) { /* sin audio */ } }
  async grabada(L, c) {
    const S = window.__sound, ctx = S?.ctx; this.habla_ = true;
    try {
      if (!ctx) throw new Error('sin audio');
      const k = L; let b = this.buf.get(k); if (!b) { const url = await L(); b = await new Promise((res, rej) => fetch(url).then(r => r.arrayBuffer()).then(a => { const p = ctx.decodeAudioData(a, res, rej); if (p?.then) p.then(res, rej); }).catch(rej)); if (this.buf.size > 40) this.buf.clear(); this.buf.set(k, b); }
      const s = this.src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 1.1; s.buffer = b; s.connect(g); g.connect(S.master); s.onended = () => { if (this.src === s) this.src = null; this.sigue(); }; this.musica(true); s.start();
    } catch (e) { this.habla_ = false; this.musica(false); }
  }
  /** Calla al momento (al salir del partido o en la pausa) */
  calla() {
    this.cola = null; this.habla_ = false; this.musica(false);
    try { this.src?.stop(); } catch (e) { /* ya había acabado */ } this.src = null;
  }
}
