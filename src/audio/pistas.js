// Las pistas grabadas (src/assets/sonidos, con licencia de Envato Elements para este juego: LICENCIAS.md, allí mismo):
// las músicas del menú, de Torneos y de los pueblos, el público de los partidos, la ovación del último tanto de pelota
// y el gol. Las músicas suenan desde un elemento <audio> conectado al bus de música del juego (src/audio.js): se leen
// a medida que suenan, sin descomprimirlas enteras (cada una, más de 30 MB en memoria; el iPhone cierra la página si se
// pasa). El público y los efectos, cortos, sí se descomprimen. Si una música no puede sonar, no suena nada (la
// sintetizada de antes ya no existe: se mezclaba con estas); si un efecto no puede, su sonido sintetizado.
const URLS = Object.fromEntries(Object.entries(import.meta.glob('../assets/sonidos/*.mp3', { eager: true, query: '?url', import: 'default' }))
  .map(([p, u]) => [p.split('/').pop().replace('.mp3', ''), u]));
// (el volumen de cada una, para que suenen como la música sintetizada, unos −33 dB a la salida)
const VOL = { 'musica-inicio': 0.35, 'musica-juego': 0.47, 'musica-torneos': 0.5 };

/** Las músicas grabadas de un contexto de audio: quiere(nombre) cada cuarto de segundo con la que toca (o null). Cambia
 *  de una a otra con un fundido corto. */
export class Musica {
  constructor(ctx, dest) {
    this.ctx = ctx; this.dest = dest; this.P = {}; this.cur = null;
    // (un contexto fuera de línea, el de tools/musica-inicio.mjs, no puede leer un <audio>: allí, la sintetizada)
    this.ok = typeof ctx.createMediaElementSource === 'function' && typeof Audio !== 'undefined';
  }
  pista(n) {
    if (this.P[n] || !this.ok || !URLS[n]) return this.P[n] || null;
    try {
      const a = new Audio(); a.preload = 'auto'; a.loop = true; a.src = URLS[n];
      const g = this.ctx.createGain(); g.gain.value = 0; this.ctx.createMediaElementSource(a).connect(g); g.connect(this.dest);
      const p = this.P[n] = { a, g, estado: 'nada' };
      a.addEventListener('error', () => { p.estado = 'fallo'; }, { once: true });
      return p;
    } catch (e) { console.warn('música', n, e); this.ok = false; return null; }
  }
  // (en el iPhone, un <audio> solo empieza a sonar la primera vez dentro de un toque: si no le deja, espera al siguiente)
  suena(p) {
    if (p.estado === 'suena' || p.estado === 'fallo') return;
    p.estado = 'pide';
    const r = p.a.play();
    if (!r?.then) { p.estado = 'suena'; return; }
    r.then(() => { if (p.estado === 'pide') p.estado = 'suena'; else p.a.pause(); }, (e) => {
      if (e?.name !== 'NotAllowedError') { p.estado = 'fallo'; return; }
      p.estado = 'bloqueada';
      const toque = () => { removeEventListener('pointerup', toque, true); removeEventListener('keydown', toque, true); this.ctx.resume?.(); if (p.estado === 'bloqueada' && this.cur === p) this.suena(p); };
      addEventListener('pointerup', toque, true); addEventListener('keydown', toque, true);
    });
  }
  /** Las crea ya, sin sonar, para que se vayan cargando: al pedir una, entra enseguida */
  prepara(ns) { for (const n of ns) this.pista(n); }
  quiere(n) {
    const p = n ? this.pista(n) : null, t = this.ctx.currentTime;
    if (p !== this.cur) {
      const q = this.cur; this.cur = p;
      if (q) { q.g.gain.cancelScheduledValues(t); q.g.gain.setTargetAtTime(0, t, 0.4); clearTimeout(q.calla); q.calla = setTimeout(() => { if (this.cur !== q) { q.a.pause(); q.estado = q.estado === 'fallo' ? 'fallo' : 'nada'; } }, 2000); }
      if (p) { clearTimeout(p.calla); if (p.estado !== 'suena') try { p.a.currentTime = 0; } catch (e) { } p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(VOL[n] || 0.4, t + 0.8); this.suena(p); }
    }
  }
  // (con la página escondida, calla y luego sigue donde iba)
  pausa(si) { const p = this.cur; if (!p || p.estado === 'fallo') return; if (si) { if (!p.a.paused) p.a.pause(); p.estado = 'nada'; } else if (p.estado === 'nada') this.suena(p); }
  /** En el primer toque (src/audio.js, init): la del menú empieza ya, dentro del toque, para que el iPhone la deje sonar */
  arranca(n) { const p = this.pista(n); if (p) { this.cur = p; p.g.gain.value = 0; p.g.gain.setTargetAtTime(VOL[n] || 0.4, this.ctx.currentTime, 0.5); this.suena(p); } }
}

// ---- los cortos: descomprimidos una vez por contexto de audio ----
const CACHE = new WeakMap();
const decodifica = (ctx, b) => new Promise((res, rej) => { const p = ctx.decodeAudioData(b, res, rej); if (p?.then) p.then(res, rej); });   // (Safari antiguo: solo con funciones)
/** La pista n de ese contexto, descomprimida (una promesa; null si no se puede) */
export function carga(ctx, n) {
  let M = CACHE.get(ctx); if (!M) CACHE.set(ctx, M = new Map());
  if (!M.has(n)) {
    const pr = URLS[n] ? fetch(URLS[n]).then(r => r.arrayBuffer()).then(b => decodifica(ctx, b)).catch((e) => { console.warn('sonido', n, e); return null; }) : Promise.resolve(null);
    pr.then(b => { pr.buf = b; }); M.set(n, pr);
  }
  return M.get(n);
}
/** Suena una vez, si ya está descomprimida (si aún no, empieza a descomprimirla y devuelve false: entonces, el sonido
 *  sintetizado de antes). carga(ctx, n) al empezar el partido la deja a punto */
export function efecto(ctx, n, dest, vol = 1) {
  const b = carga(ctx, n).buf; if (!b) return false;
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(dest); s.start(); return true;
}

/** El público de la grada (pelota y fútbol): un rumor de estadio lleno en bucle, que sube y baja con el partido. Se
 *  queda con 40 s en un canal (unos 8 MB en vez de 25) y funde su final con su principio para que el bucle no se note */
export class Grada {
  constructor(ctx, dest) {
    this.ctx = ctx; this.g = ctx.createGain(); this.g.gain.value = 0; this.g.connect(dest); this.v = 0.3;
    carga(ctx, 'publico-grada').then(b => { if (!b || this.fin) return; const s = this.s = ctx.createBufferSource(); s.buffer = bucle(ctx, b, 40, 3); s.loop = true; s.connect(this.g); s.start(); this.nivel(this.v, 1.2); });
  }
  /** v de 0 a 1: la emoción del partido (tc, lo que tarda en llegar) */
  nivel(v, tc = 0.3) { this.v = v; if (this.s) this.g.gain.setTargetAtTime(0.75 * v, this.ctx.currentTime, tc); }
  para(s = 0.8) { this.fin = true; const t = this.ctx.currentTime; this.g.gain.cancelScheduledValues(t); this.g.gain.setTargetAtTime(0, t, s / 3); if (this.s) this.s.stop(t + s + 0.1); }
}
// (los primeros seg segundos en mono; los últimos f, fundidos sobre el principio)
function bucle(ctx, b, seg, f) {
  const sr = b.sampleRate, n = Math.min(b.length, Math.round(seg * sr)), F = Math.min(Math.round(f * sr), n >> 2), L = n - F;
  const out = ctx.createBuffer(1, L, sr), o = out.getChannelData(0), ch = [...Array(b.numberOfChannels)].map((_, i) => b.getChannelData(i)), k = 1 / ch.length;
  const m = (i) => { let v = 0; for (const c of ch) v += c[i]; return v * k; };
  for (let i = 0; i < L; i++) o[i] = m(i);
  for (let i = 0; i < F; i++) { const u = i / F; o[i] = o[i] * Math.sin(u * Math.PI / 2) + m(L + i) * Math.cos(u * Math.PI / 2); }
  return out;
}
