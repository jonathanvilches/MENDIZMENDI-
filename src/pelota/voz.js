// La voz del comentarista de pelota (las frases, comenta.js). Primero, la grabación de esa frase, si está:
// src/assets/voz/<hombre|mujer>/<es|eu>/<clave>.mp3 (la clave, «dejada-2», sale en el guion de grabación); si no está la
// de esa voz, la de la otra. Si no hay ninguna grabada, la voz del sistema (la del teléfono o el ordenador) de ese idioma,
// de hombre o de mujer si se distinguen por el nombre; si el aparato no tiene voz en ese idioma (en euskera es lo normal),
// no se dice nada. Una frase cada vez: si llega otra mientras habla, espera, y solo la última.
const CLIPS = import.meta.glob('../assets/voz/*/*/*.mp3', { query: '?url', import: 'default' });
const clip = (voz, lang, id) => CLIPS[`../assets/voz/${voz}/${lang}/${id}.mp3`];
// (las voces del sistema no dicen si son de hombre o de mujer: se adivina por el nombre, el de las más comunes en iPhone,
// Android, Windows y Mac)
const HOMBRE = /jorge|diego|juan|carlos|enrique|pablo|eddy|reed|rocko|grandpa|abuelo|[aá]lvaro|dar[ií]o|ra[uú]l|pedro|manuel|miguel|antonio|andr[eé]s|aitor|\bjon\b|iker|male|hombre/i;
const MUJER = /m[oó]nica|marisol|paulina|helena|laura|elvira|luc[ií]a|\bflo\b|sandy|shelley|grandma|abuela|conchita|carmen|sabina|ainhoa|elena|isabel|female|mujer/i;

export class Voz {
  constructor() { this.cola = null; this.habla_ = false; this.buf = new Map(); }
  get sintesis() { return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' ? speechSynthesis : null; }
  /** Dice la frase c ({ id, texto, r, voz, lang }). true si se va a oír */
  habla(c) {
    if (!c || !c.voz) return false;
    if (this.habla_) { this.cola = { c, t: performance.now() }; return true; }
    const L = clip(c.voz, c.lang, c.id) || clip(c.voz === 'hombre' ? 'mujer' : 'hombre', c.lang, c.id);
    if (L) { this.grabada(L, c); return true; }
    return this.sistema(c);
  }
  // (al acabar una, la que esperaba, si no es de hace más de 5 s)
  sigue() { this.habla_ = false; const q = this.cola; this.cola = null; if (q && performance.now() - q.t < 5000) this.habla(q.c); }
  async grabada(L, c) {
    const S = window.__sound, ctx = S?.ctx; this.habla_ = true;
    try {
      if (!ctx) throw new Error('sin audio');
      let b = this.buf.get(c.id); if (!b) { const url = await L(); b = await new Promise((res, rej) => fetch(url).then(r => r.arrayBuffer()).then(a => { const p = ctx.decodeAudioData(a, res, rej); if (p?.then) p.then(res, rej); }).catch(rej)); if (this.buf.size > 40) this.buf.clear(); this.buf.set(c.id, b); }
      const s = this.src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 1.1; s.buffer = b; s.connect(g); g.connect(S.master); s.onended = () => { if (this.src === s) this.src = null; this.sigue(); }; s.start();
    } catch (e) { this.habla_ = false; this.sistema(c); }
  }
  /** La voz del sistema para ese idioma y esa voz (o null) */
  vozSistema(lang, voz) {
    const S = this.sintesis; if (!S) return null;
    const V = S.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith(lang)); if (!V.length) return null;
    // (en castellano, mejor la de España; y la de hombre o mujer, si se sabe)
    const es = lang === 'es' ? V.filter(v => /es[-_]es/i.test(v.lang)) : V, B = es.length ? es : V, re = voz === 'mujer' ? MUJER : HOMBRE;
    return B.find(v => re.test(v.name)) || B.find(v => !(voz === 'mujer' ? HOMBRE : MUJER).test(v.name)) || B[0];
  }
  sistema(c) {
    const S = this.sintesis, v = S && this.vozSistema(c.lang, c.voz); if (!v) return false;
    try {
      const u = new SpeechSynthesisUtterance(c.texto); u.voice = v; u.lang = v.lang;
      // (la jugada, algo más deprisa; la explicación, un poco más grave y pausada)
      u.rate = c.r === 'e' ? 1 : 1.08; u.pitch = c.r === 'e' ? 0.92 : 1.02; u.volume = Math.max(0.2, Math.min(1, (window.__sound?.master?.gain?.value ?? 0.8) * 1.15));
      this.habla_ = true; u.onend = u.onerror = () => this.sigue();
      S.speak(u); return true;
    } catch (e) { this.habla_ = false; return false; }
  }
  /** Calla al momento (al salir del partido o en la pausa) */
  calla() {
    this.cola = null; this.habla_ = false;
    try { this.src?.stop(); } catch (e) { /* ya había acabado */ } this.src = null;
    try { this.sintesis?.cancel(); } catch (e) { /* sin voz del sistema */ }
  }
}
// (en algunos navegadores la lista de voces llega tarde: se pide al cargar para que esté cuando haga falta)
try { if (typeof speechSynthesis !== 'undefined') { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices()); } } catch (e) { /* sin voz del sistema */ }
