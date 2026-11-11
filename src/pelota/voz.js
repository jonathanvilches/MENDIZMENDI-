// La voz del comentarista de pelota (las frases, comenta.js): siempre la grabada por el autor, nunca una voz sintética.
// src/assets/voz/<hombre|mujer>/<es|eu>/<clave>.mp3 (la clave, «dejada-2», sale en el guion de grabación); si no está la
// de esa voz, la de la otra; y si en ese idioma no hay grabación (el euskera, de momento), la misma frase en castellano.
// Con los dos comentaristas (Ajustes, de serie), las que narran («n», comenta.js) con la voz de hombre y las que explican
// la jugada («e») con la de mujer (util/comentarios.js, vozDe); mientras falte una de las dos, todas con la otra.
// (Hubo una segunda voz sacada de la misma grabación, más grave: sonaba robótica y se quitó, noviembre de 2026.) Sin
// ninguna grabación de esa frase, no se dice nada. Antes, sin grabación, hablaba la voz del sistema (la del teléfono
// o el ordenador), y el autor no la quiere: solo su voz. Una frase cada vez: si llega otra mientras habla, espera, y solo
// la última. Mientras habla, la música baja a un tercio para que no lo tape (audio.js, voz) y vuelve al acabar.
// Los diálogos entre los dos (comenta.js, DIALOGO): cada turno con su voz y sin la otra de repuesto (estricta), y el
// siguiente turno (.sigue) justo detrás del anterior; tiene() dice si están grabados todos antes de empezar.
const CLIPS = import.meta.glob('../assets/voz/*/*/*.mp3', { query: '?url', import: 'default' });
const clip = (voz, lang, id) => CLIPS[`../assets/voz/${voz}/${lang}/${id}.mp3`];
const otra = (v) => (v === 'hombre' ? 'mujer' : 'hombre');

const busca = (c) => { const quien = c.estricta ? [c.voz] : [c.voz, otra(c.voz)]; let L = null; for (const lang of [c.lang, 'es']) { for (const v of quien) if ((L = clip(v, lang, c.id))) break; if (L) break; } return L; };
/** ¿Está grabada la frase (o todos los turnos de un diálogo)? */
export const tiene = (c) => Array.isArray(c) ? c.length > 0 && c.every(tiene) : !!(c && c.voz && busca(c));

export class Voz {
  constructor() { this.cola = null; this.habla_ = false; this.buf = new Map(); }
  /** Dice la frase c ({ id, texto, r, voz, lang }) con la grabación. true si se va a oír */
  habla(c) {
    if (!c || !c.voz) return false;
    // (primero el idioma, luego la voz elegida y, si falta, la otra; en los diálogos, solo la suya)
    const L = busca(c);
    if (!L) return false;
    // (si la anterior no avisó de su final —el iPhone para el sonido al ir la app de fondo—, se da por acabada a su tiempo:
    // si no, se quedaba «hablando» para siempre y ya no se oía ninguna frase más)
    if (this.habla_ && performance.now() > (this.fin || 0) + 1500) this.sigue();
    if (this.habla_) { this.cola = { c, t: performance.now() }; return true; }
    this.grabada(L, c); return true;
  }
  // (al acabar una, la que esperaba, si no es de hace más de 5 s; si no hay otra, la música vuelve)
  sigue() {
    this.habla_ = false; const nx = this.actual?.sigue; this.actual = null;
    // (el turno siguiente de un diálogo va antes que lo que esperaba y entra en cuanto acaba el otro: la grabación ya está
    // descodificada y cada frase trae 50 ms de silencio en cada borde, que hacen de respiro. Antes, 250 ms y luego 110 de
    // espera, más lo que tardaba en bajarse)
    if (nx) { this.habla_ = false; this.habla(nx); if (!this.habla_) this.musica(false); return; }
    const q = this.cola; this.cola = null; if (q && performance.now() - q.t < 5000) this.habla(q.c); if (!this.habla_) this.musica(false);
  }
  musica(on) { try { window.__sound?.voz?.(on); } catch (e) { /* sin audio */ } }
  // (la grabación descodificada, una sola vez: la promesa se guarda, así el turno siguiente de un diálogo se pide mientras
  // habla el primero y, cuando le toca, ya está lista. Antes se bajaba y descodificaba al acabar el primero, y entre la
  // frase de Miren y la de Iñaki quedaba un hueco)
  carga(L, ctx) {
    let p = this.buf.get(L);
    if (!p) { p = L().then(url => fetch(url)).then(r => r.arrayBuffer()).then(a => new Promise((res, rej) => { const q = ctx.decodeAudioData(a, res, rej); if (q?.then) q.then(res, rej); })); if (this.buf.size > 40) this.buf.clear(); this.buf.set(L, p); p.catch(() => this.buf.delete(L)); }
    return p;
  }
  async grabada(L, c) {
    const S = window.__sound, ctx = S?.ctx; this.habla_ = true; this.actual = c;
    // (mientras se baja, un plazo provisional: con el de la frase anterior, una que llegaba entonces la daba por acabada y
    // sonaban las dos a la vez)
    this.fin = performance.now() + 6000;
    try {
      if (!ctx) throw new Error('sin audio');
      const nx = c.sigue && busca(c.sigue); if (nx) this.carga(nx, ctx).catch(() => {});   // (el turno siguiente, ya pedido)
      const tk = this.tok, b = await this.carga(L, ctx); if (tk !== this.tok) return;   // (si mientras se bajaba se calló, nada)
      // (si el contexto está parado —el iPhone lo deja «interrupted» tras una llamada o al volver de fondo—, se despierta
      // antes: una frase que empieza con él parado no suena ni avisa de su final)
      if (ctx.state !== 'running') { try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 400))]); } catch (e) { /* sin permiso aún */ } if (tk !== this.tok) return; }
      const s = this.src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 1.1; s.buffer = b; s.connect(g); g.connect(S.master); s.onended = () => { if (this.src === s) this.src = null; this.sigue(); }; this.fin = performance.now() + b.duration * 1000; this.musica(true); s.start();
    } catch (e) { this.habla_ = false; this.musica(false); }
  }
  /** Calla al momento (al salir del partido o en la pausa) */
  calla() {
    this.cola = null; this.habla_ = false; this.actual = null; this.tok = (this.tok || 0) + 1; this.musica(false);
    try { this.src?.stop(); } catch (e) { /* ya había acabado */ } this.src = null;
  }
}
