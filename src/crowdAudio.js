// El público de los partidos (el frontón y El Sadar), sintetizado: sin archivos de sonido, así no pesa nada en el
// archivo único. Antes era ruido filtrado y sonaba a viento; ahora es gente:
// · murmullo: treinta voces de hombres y mujeres que hablan a la vez, cada una con sus vocales (formantes), su
//   entonación, sus consonantes y sus pausas, a lo lejos y con el eco del frontón o del estadio
// · aplauso: ciento sesenta personas que arrancan a la vez, cada una con su ritmo, su fuerza y el timbre de sus manos
// · «¡oooh!» (casi), «¡ohhh…!» (el lamento) y «¡eeeh!» (el estallido): todas las voces a la vez en la misma vocal
// Se calculan una sola vez, poco a poco (sin parar el juego), y sirven para todos los partidos.
// (apagado por ahora: en los partidos suena su música de estadio y no el público; el código se queda para volver a usarlo)
export const PUBLICO = false;
const SR = 22050;
let READY = null;
let NOISE = null;

// vocales del castellano y del euskera (formantes F1, F2 y F3 de una voz de hombre; en las mujeres, algo más arriba)
const V = { a: [730, 1250, 2500], e: [480, 1850, 2550], i: [310, 2250, 2900], o: [500, 900, 2450], u: [340, 760, 2400] };
const VOW = 'aaeeeiooua';   // (más aes, es y oes, como al hablar)
const rnd = Math.random, pick = (s) => s[(rnd() * s.length) | 0];
const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;

function noiseTable() {
  if (NOISE) return NOISE;
  const n = 1 << 16, a = new Float32Array(n); let s = 0x2545f491;
  for (let i = 0; i < n; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; a[i] = (s >>> 0) / 2147483648 - 1; }
  return (NOISE = a);
}
// paso de banda de ganancia 1 en su centro: [b0, a1, a2] (b1 = 0, b2 = −b0)
function bpc(f, q, o, k) {
  const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  o[k] = al / a0; o[k + 1] = -2 * Math.cos(w) / a0; o[k + 2] = (1 - al) / a0;
}
const pause = () => new Promise(r => setTimeout(r, 0));
const pans = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

/** Una voz: una lista de sílabas { a, b (muestras), f0a, f0b (tono al empezar y al acabar), v (formantes), amp, c
 *  (consonante: 0 ninguna, 1 «s», 2 nasal, 3 oclusiva) } que se suma a L y R. P: { fs (escala de formantes), pan, gain,
 *  asp (soplo), hiss (lo que se oyen las eses y las oclusivas) } */
function voice(L, R, syl, P) {
  const N = noiseTable(), n = L.length, C = new Float64Array(9), [gl, gr] = pans(P.pan);
  let ph = rnd(), lp = 0, ni = (rnd() * 65536) | 0, nzp = 0;
  let f1 = syl[0].v[0] * P.fs, f2 = syl[0].v[1] * P.fs, f3 = syl[0].v[2] * P.fs;
  let x1 = 0, x2 = 0, a1 = 0, a2 = 0, b1 = 0, b2 = 0, c1 = 0, c2 = 0;
  const g = P.gain, asp = P.asp;
  for (const s of syl) {
    // (subida y caída de cada sílaba; en los gritos de todos, la subida es lenta y el primer tramo empalma con el segundo)
    const atk = SR * (s.at ?? 0.022), rel = SR * (s.rl ?? 0.05);
    const a = Math.max(0, s.a | 0), b = Math.min(n, s.b | 0), len = Math.max(1, b - a);
    const cl = s.c === 1 ? SR * (0.05 + rnd() * 0.03) : s.c === 2 ? SR * 0.05 : s.c === 3 ? SR * 0.03 : 0;
    const T1 = s.v[0] * P.fs, T2 = s.v[1] * P.fs, T3 = s.v[2] * P.fs, df = (s.f0b - s.f0a) / len;
    let f0 = s.f0a, drift = 0;
    for (let i = a; i < b; i++) {
      const j = i - a;
      if ((j & 31) === 0) {
        // (cada 32 muestras: las formantes van hacia la vocal, o hacia la nasal al empezar la sílaba)
        const nas = s.c === 2 && j < cl, t1 = nas ? 280 * P.fs : T1, t2 = nas ? 1150 * P.fs : T2;
        f1 += (t1 - f1) * 0.32; f2 += (t2 - f2) * 0.26; f3 += (T3 - f3) * 0.2;
        bpc(f1, 5.5, C, 0); bpc(f2, 9, C, 3); bpc(f3, 12, C, 6);
        drift += (rnd() - 0.5) * 0.012; drift *= 0.96;
      }
      f0 += df;
      ph += f0 * (1 + drift) / SR; if (ph >= 1) ph -= 1;
      lp += 0.32 * ((2 * ph - 1) - lp);   // (la pendiente de la glotis: menos agudos)
      const nz = N[ni++ & 65535];
      let e = (atk > 0 ? Math.min(1, j / atk) : 1) * (rel > 0 ? Math.min(1, (b - i) / rel) : 1) * s.amp, voiced = 1, hiss = 0;
      if (j < cl) {
        if (s.c === 1) { voiced = 0.15; hiss = 0.55 * Math.min(1, (cl - j) / (SR * 0.02)); }
        else if (s.c === 3) { if (j < cl * 0.7) { e = 0; } else { voiced = 0.3; hiss = 0.9; } }
        else if (s.c === 2) e *= 0.55;
      }
      const x = lp * voiced + nz * asp;
      const ya = C[0] * (x - x2) - C[1] * a1 - C[2] * a2; a2 = a1; a1 = ya;
      const yb = C[3] * (x - x2) - C[4] * b1 - C[5] * b2; b2 = b1; b1 = yb;
      const yc = C[6] * (x - x2) - C[7] * c1 - C[8] * c2; c2 = c1; c1 = yc;
      x2 = x1; x1 = x;
      const out = ((ya + yb * 0.75 + yc * 0.35) * e + (nz - nzp) * hiss * e * P.hiss) * g; nzp = nz;
      L[i] += out * gl; R[i] += out * gr;
    }
  }
}
/** Una persona que habla: frases de 3 a 11 sílabas, con el tono que baja al final de cada frase y alguna sílaba
 *  acentuada, y pausas entre frase y frase */
function talker(dur, f0) {
  const syl = []; let t = rnd() * 0.6;
  while (t < dur) {
    const k = 3 + ((rnd() * 9) | 0), up = 1.05 + rnd() * 0.15, down = 0.82 + rnd() * 0.1, acc = (rnd() * k) | 0;
    for (let s = 0; s < k && t < dur; s++) {
      const d = 0.1 + rnd() * 0.13, u = s / k, f = f0 * (up + (down - up) * u) * (s === acc ? 1.14 : 1) * (1 + (rnd() - 0.5) * 0.06);
      const r = rnd(), c = r < 0.3 ? 1 : r < 0.48 ? 2 : r < 0.68 ? 3 : 0;
      syl.push({ a: t * SR, b: (t + d) * SR, f0a: f, f0b: f * (0.96 + rnd() * 0.06), v: V[pick(VOW)], amp: (s === acc ? 1 : 0.7 + rnd() * 0.25), c });
      t += d + (rnd() < 0.12 ? 0.04 + rnd() * 0.08 : 0);
    }
    t += 0.18 + rnd() * 1.1;
  }
  return syl;
}
/** Todos a la vez en la misma vocal (el «¡oooh!», el lamento o el estallido): forma del tono y de la intensidad */
function chorus(dur, f0, shape) {
  const { v0, v1, t0, att, hold, up, peak, end } = shape, s = t0 + rnd() * 0.14, d = Math.min(dur - s - 0.02, hold + rnd() * 0.5);
  const mid = s + d * peak, f = f0 * (1 + (rnd() - 0.5) * 0.08);
  // (dos tramos: hasta lo más alto del grito y de ahí al final, con la vocal que cambia)
  return [{ a: s * SR, b: mid * SR, f0a: f, f0b: f * up, v: V[v0], amp: 1, c: 0, at: att * (0.7 + rnd() * 0.6), rl: 0 }, { a: mid * SR, b: (s + d) * SR, f0a: f * up, f0b: f * end, v: V[v1], amp: 1, c: 0, at: 0, rl: Math.min(0.45, d * 0.5) }];
}
// reverberación de Schroeder (cuatro peines y dos pasatodo): el eco del frontón o del estadio, que junta las voces
// (paso a paso, con un respiro entre filtro y filtro: así el cálculo nunca para el juego)
async function reverb(L, R, wet, fb = 0.8) {
  const D = [557, 593, 641, 677], AP = [113, 277];
  for (const [X, off] of [[L, 0], [R, 11]]) {
    const n = X.length, out = new Float32Array(n), dry = X.slice();
    for (const d0 of D) {
      const d = d0 + off, buf = new Float32Array(d); let k = 0, lpf = 0;
      for (let i = 0; i < n; i++) { const y = buf[k]; lpf = y * 0.62 + lpf * 0.38; buf[k] = dry[i] + lpf * fb; out[i] += y * 0.25; if (++k >= d) k = 0; }
      await pause();
    }
    for (const d0 of AP) {
      const d = d0 + off, buf = new Float32Array(d); let k = 0;
      for (let i = 0; i < n; i++) { const bv = buf[k], x = out[i], y = -0.5 * x + bv; buf[k] = x + 0.5 * y; out[i] = y; if (++k >= d) k = 0; }
    }
    for (let i = 0; i < n; i++) X[i] = dry[i] * (1 - wet * 0.5) + out[i] * wet;
    await pause();
  }
}
function lowpass(X, f) { const a = 1 - Math.exp(-2 * Math.PI * f / SR); let y = 0; for (let i = 0; i < X.length; i++) { y += a * (X[i] - y); X[i] = y; } }
function level(L, R, rms) {
  let s = 0; for (let i = 0; i < L.length; i++) s += L[i] * L[i] + R[i] * R[i];
  const k = rms / Math.max(1e-6, Math.sqrt(s / (2 * L.length)));
  let pk = 0; for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
  if (pk > 0.95) { const q = 0.95 / pk; for (let i = 0; i < L.length; i++) { L[i] *= q; R[i] *= q; } }
}
const someone = () => { const w = rnd() < 0.5; return { w, f0: w ? 185 + rnd() * 65 : 98 + rnd() * 42, fs: (w ? 1.15 : 1) * (0.96 + rnd() * 0.08) }; };

function makeBuf(ctx, sec) {
  const length = Math.round(sec * SR);
  try { return new AudioBuffer({ numberOfChannels: 2, length, sampleRate: SR }); } catch (e) { }
  try { return ctx.createBuffer(2, length, SR); } catch (e) { return null; }
}

/** El murmullo en bucle (sin que se note el empalme: la cola se funde con el principio) */
async function murmur(ctx, sec = 7, voices = 30) {
  const X = 0.6, n = Math.round(sec * SR), m = Math.round((sec + X) * SR), L = new Float32Array(m), R = new Float32Array(m);
  for (let v = 0; v < voices; v++) {
    const p = someone(), near = rnd() < 0.15;
    voice(L, R, talker(sec + X, p.f0), { fs: p.fs, pan: (rnd() * 2 - 1) * 0.9, gain: near ? 0.9 : 0.25 + rnd() * 0.4, asp: 0.05 + rnd() * 0.05, hiss: near ? 0.2 : 0.1 });
    await pause();
  }
  // (a lo lejos y con el eco: los agudos se pierden; las voces de cerca, algo más claras)
  for (const X of [L, R]) { lowpass(X, 2600); lowpass(X, 3200); }
  await reverb(L, R, 0.5); level(L, R, 0.12);
  const B = makeBuf(ctx, sec); if (!B) return null;
  const xl = Math.round(X * SR);
  for (const [src, ch] of [[L, 0], [R, 1]]) {
    const o = B.getChannelData(ch);
    for (let i = 0; i < n; i++) o[i] = src[i];
    for (let i = 0; i < xl; i++) { const w = i / xl; o[i] = src[i] * Math.sqrt(w) + src[n + i] * Math.sqrt(1 - w); }
  }
  return B;
}
/** El aplauso: todos arrancan a la vez (en un cuarto de segundo), cada uno con su ritmo, y se van apagando */
async function applause(ctx, sec = 5, K = 160) {
  const B = makeBuf(ctx, sec); if (!B) return null;
  const L = B.getChannelData(0), R = B.getChannelData(1), N = noiseTable(), n = L.length, C = new Float64Array(3);
  for (let k = 0; k < K; k++) {
    const [gl, gr] = pans((rnd() * 2 - 1) * 0.95), amp = rnd() < 0.07 ? 1 : 0.22 + rnd() * 0.45;
    let per = 1 / (3.6 + rnd() * 2.2), t = 0.02 + Math.abs(gauss()) * 0.11 + (rnd() < 0.1 ? rnd() * 0.5 : 0);
    const tEnd = sec * (0.48 + rnd() * 0.44), cup = rnd() < 0.35;
    bpc(cup ? 650 + rnd() * 450 : 1300 + rnd() * 1700, 0.9 + rnd() * 1.5, C, 0);
    while (t < tEnd) {
      const a = amp * Math.min(1, (tEnd - t) / 0.8) * (0.75 + rnd() * 0.5), i0 = Math.round(t * SR), tau = SR * (0.0028 + rnd() * 0.004);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0, ni = (rnd() * 65536) | 0;
      const len = Math.min(n - i0, Math.round(tau * 6));
      for (let j = 0; j < len; j++) {
        const x = N[ni++ & 65535] * Math.exp(-j / tau) * Math.min(1, j / 6);
        const y = C[0] * (x - x2) - C[1] * y1 - C[2] * y2; y2 = y1; y1 = y; x2 = x1; x1 = x;
        const o = (y * 1.6 + x * 0.25) * a; L[i0 + j] += o * gl; R[i0 + j] += o * gr;
      }
      t += per * (1 + (rnd() - 0.5) * 0.14); per *= 1 + (rnd() - 0.5) * 0.03;
    }
    if (k % 20 === 19) await pause();
  }
  lowpass(L, 6500); lowpass(R, 6500); await reverb(L, R, 0.32, 0.72); level(L, R, 0.16);
  return B;
}
/** Todas las voces a la vez: «oh» (casi), «groan» (lamento) y «roar» (el estallido de un gol o del último tanto) */
async function shout(ctx, kind) {
  const S = {
    oh: { sec: 1.7, voices: 30, shape: { v0: 'o', v1: 'u', t0: 0.02, att: 0.2, hold: 1.05, up: 1.28, peak: 0.42, end: 0.92 }, asp: 0.12, rms: 0.13, shout: 1 },
    groan: { sec: 1.6, voices: 28, shape: { v0: 'o', v1: 'o', t0: 0.02, att: 0.16, hold: 1.0, up: 1.08, peak: 0.2, end: 0.72 }, asp: 0.14, rms: 0.11, shout: 1 },
    roar: { sec: 3, voices: 44, shape: { v0: 'e', v1: 'a', t0: 0.0, att: 0.1, hold: 2.0, up: 1.12, peak: 0.35, end: 0.88 }, asp: 0.18, rms: 0.17, shout: 1.65 },
  }[kind];
  const B = makeBuf(ctx, S.sec); if (!B) return null;
  const L = B.getChannelData(0), R = B.getChannelData(1);
  for (let v = 0; v < S.voices; v++) {
    const p = someone();
    voice(L, R, chorus(S.sec, p.f0 * S.shout, S.shape), { fs: p.fs * (S.shout > 1 ? 1.08 : 1), pan: (rnd() * 2 - 1) * 0.9, gain: 0.3 + rnd() * 0.5, asp: S.asp, hiss: 0 });
    if (v % 2 === 1) await pause();
  }
  lowpass(L, 3400); lowpass(R, 3400); await reverb(L, R, 0.42); level(L, R, S.rms);
  return B;
}

/** Los sonidos del público, calculados una vez (promesa con { murmur, clap, oh, groan, roar }) */
export function crowdBuffers(ctx) {
  return READY ||= (async () => {
    const o = {};
    await pause(); o.clap = await applause(ctx);
    o.murmur = await murmur(ctx);
    o.oh = await shout(ctx, 'oh'); o.roar = await shout(ctx, 'roar'); o.groan = await shout(ctx, 'groan');
    return o;
  })().catch(e => { console.warn('público', e); READY = null; return {}; });
}

/** El público de un partido: el murmullo de fondo (más o menos alto según el momento) y lo que hace toda la grada a
 *  la vez. ctx: el contexto de sonido; out: a dónde va (el bus de efectos del juego o los altavoces) */
export class Crowd {
  constructor(ctx, out) {
    this.ctx = ctx; this.B = null; this.dead = false; this.level = 0.3; this.srcs = new Set();
    this.bus = ctx.createGain(); this.bus.gain.value = document.hidden ? 0 : 1; this.bus.connect(out || ctx.destination);
    this.mur = ctx.createGain(); this.mur.gain.value = 0; this.mur.connect(this.bus);
    this.onVis = () => { try { this.bus.gain.setTargetAtTime(document.hidden ? 0 : 1, ctx.currentTime, 0.08); } catch (e) { } };
    document.addEventListener('visibilitychange', this.onVis);
    this.ready = crowdBuffers(ctx).then(B => {
      if (this.dead || !B.murmur) return false; this.B = B;
      // (dos copias del mismo murmullo, desfasadas y a distinta velocidad: no se oye que se repite)
      for (const [rate, off, g] of [[1, 0, 1], [0.93, 3.1, 0.7]]) {
        const s = ctx.createBufferSource(), gg = ctx.createGain(); s.buffer = B.murmur; s.loop = true; s.playbackRate.value = rate; gg.gain.value = g;
        s.connect(gg); gg.connect(this.mur); s.start(ctx.currentTime + 0.02, off); this.srcs.add(s);
      }
      this.setLevel(this.level, 0.8);
      return true;
    });
  }
  /** Lo alto que se oye el murmullo (0 a 1): bajo al sacar, sube con un peloteo largo o una ocasión */
  setLevel(v, tc = 0.35) { this.level = v; if (this.B && !this.dead) this.mur.gain.setTargetAtTime(v * 1.6, this.ctx.currentTime, tc); }
  play(name, gain = 1, rate = 1, delay = 0) {
    const b = this.B?.[name]; if (!b || this.dead) return false;
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = b; s.playbackRate.value = rate; g.gain.value = gain; s.connect(g); g.connect(this.bus);
    s.start(c.currentTime + delay); this.srcs.add(s); s.onended = () => { this.srcs.delete(s); try { g.disconnect(); } catch (e) { } };
    return true;
  }
  // (cada vez a una velocidad un poco distinta: no suena dos veces igual)
  applause(k = 1, delay = 0) { return this.play('clap', k, 0.93 + rnd() * 0.14, delay); }
  ooh(k = 1) { return this.play('oh', k, 0.95 + rnd() * 0.1); }
  groan(k = 1) { return this.play('groan', k, 0.94 + rnd() * 0.1); }
  roar(k = 1) { return this.play('roar', k, 0.96 + rnd() * 0.08); }
  /** La ovación del final: el estallido y tres oleadas de aplausos de todo el público */
  ovation() { const ok = this.roar(0.9); this.applause(1, 0.1); this.applause(0.95, 1.9); this.applause(0.75, 3.6); return ok; }
  stop(fade = 0.5) {
    if (this.dead) return; this.dead = true;
    document.removeEventListener('visibilitychange', this.onVis);
    try { this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3); } catch (e) { }
    setTimeout(() => { for (const s of this.srcs) try { s.stop(); } catch (e) { } this.srcs.clear(); try { this.bus.disconnect(); } catch (e) { } }, fade * 1000 + 150);
  }
}
