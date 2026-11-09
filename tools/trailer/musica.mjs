// La música del tráiler, compuesta y sintetizada aquí (obra propia, sin muestras de nadie): 60 s, estéreo, 48 kHz.
// Latido y silencio (0-8 s) · noche: ostinato de cuerdas, tambores y la txalaparta que entra, golpes de metal en cada
// criatura (8-18) · montaje: todo el ritmo a 120 pulsos, la txalaparta en semicorcheas y el tema en los metales (18-35) ·
// clímax en el 35: orquesta, coro y tambores grandes (35-48) · emoción: cuerdas y una flauta como el txistu (48-55) ·
// silencio, un latido y el golpe final con su cola (55-60).
// Uso: node tools/trailer/musica.mjs <salida.wav>
import { writeFileSync } from 'node:fs';
const SR = 48000, DUR = 60, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const busRev = [new Float32Array(N), new Float32Array(N)];   // (lo que va a la reverberación)
const BEAT = 0.5;   // 120 pulsos por minuto
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// (escribe una muestra mono con panorama y envío a la reverberación)
const put = (i, v, pan = 0, rev = 0.25) => { if (i < 0 || i >= N) return; const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4); L[i] += v * l; R[i] += v * r; busRev[0][i] += v * l * rev; busRev[1][i] += v * r * rev; };

// ---------- instrumentos ----------
function boom(t, g = 1, f0 = 90, f1 = 34, dec = 1.6, pan = 0) {   // golpe grave (latido, impactos)
  const i0 = Math.round(t * SR), n = Math.round(dec * 1.6 * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const s = k / SR, f = f1 + (f0 - f1) * Math.exp(-s * 18); ph += 2 * Math.PI * f / SR; const e = Math.exp(-s / (dec * 0.35)) * Math.min(1, s * 400); put(i0 + k, Math.sin(ph) * e * g, pan, 0.15); }
}
function taiko(t, g = 1, f0 = 140, pan = 0) {   // tambor grande: cuerpo que baja de tono y el golpe del parche
  const i0 = Math.round(t * SR), n = Math.round(1.4 * SR); let ph = 0, lp = 0;
  for (let k = 0; k < n; k++) { const s = k / SR, f = f0 * (0.5 + 0.5 * Math.exp(-s * 22)); ph += 2 * Math.PI * f / SR;
    const nz = rnd() * 2 - 1; lp += (nz - lp) * 0.08; const body = Math.sin(ph) * Math.exp(-s * 4.2), skin = lp * Math.exp(-s * 30) * 1.6;
    put(i0 + k, (body + skin) * g * Math.min(1, s * 600), pan, 0.35); }
}
function txala(t, g = 1, f = 210, pan = 0) {   // tabla de txalaparta: parciales inarmónicos de madera y el chasquido
  const i0 = Math.round(t * SR), n = Math.round(0.5 * SR), P = [[1, 1, 26], [2.71, 0.45, 40], [5.15, 0.22, 60], [8.6, 0.1, 85]], ph = P.map(() => rnd() * 6.28);
  const ff = f * (0.985 + rnd() * 0.03);
  for (let k = 0; k < n; k++) { const s = k / SR; let v = 0; for (let j = 0; j < P.length; j++) { ph[j] += 2 * Math.PI * ff * P[j][0] / SR; v += Math.sin(ph[j]) * P[j][1] * Math.exp(-s * P[j][2]); }
    v += (rnd() * 2 - 1) * Math.exp(-s * 900) * 0.5; put(i0 + k, v * g * Math.min(1, s * 2000), pan, 0.3); }
}
// paso banda (biquad de RBJ, 0 dB en el centro); st: x1, x2, y1, y2
function bp(x, fc, q, st) { const w = 2 * Math.PI * fc / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al, a1 = -2 * Math.cos(w), a2 = 1 - al;
  const y = (al * x - al * st[1] - a1 * st[2] - a2 * st[3]) / a0; st[1] = st[0]; st[0] = x; st[3] = st[2]; st[2] = y; return y; }
// sierra con pocos armónicos (sin aliasing), para cuerdas, metales y coro
function saw(ph, nh) { let v = 0; for (let h = 1; h <= nh; h++) v += Math.sin(ph * h) / h; return v * 0.6; }
function nota(t, dur, midi, g, { tipo = 'cuerda', pan = 0, rev = 0.35, att = 0.12, rel = 0.35 } = {}) {
  const i0 = Math.round(t * SR), n = Math.round((dur + rel) * SR), f = mtof(midi);
  const voces = tipo === 'cuerda' ? [-0.12, 0, 0.11] : tipo === 'coro' ? [-0.08, 0.07] : [-0.05, 0.05];
  const ph = voces.map(() => rnd() * 6.28), f1 = [0, 0, 0, 0], f2 = [0, 0, 0, 0]; let lp = 0, lp2 = 0;
  const nh = Math.max(3, Math.min(tipo === 'metal' ? 18 : 12, Math.floor(9000 / f)));
  for (let k = 0; k < n; k++) {
    const s = k / SR, env = Math.min(1, s / att) * (s > dur ? Math.exp(-(s - dur) / (rel * 0.4)) : 1);
    const vib = 1 + 0.0035 * Math.sin(2 * Math.PI * 5.2 * s) * Math.min(1, s / 0.5);
    let v = 0; for (let j = 0; j < voces.length; j++) { ph[j] += 2 * Math.PI * f * vib * Math.pow(2, voces[j] / 12) / SR; v += saw(ph[j], nh); } v /= voces.length;
    if (tipo === 'metal') { const cut = 0.04 + 0.22 * Math.exp(-s * 3) + 0.05 * env; lp += (v - lp) * cut; lp2 += (lp - lp2) * cut; v = lp2 * 2.2; }
    else if (tipo === 'coro') { v = bp(v, 720, 5, f1) + 0.7 * bp(v, 1150, 6, f2); v *= 3.2; }   // (los dos formantes de la «a»)
    else { lp += (v - lp) * 0.11; lp2 += (lp - lp2) * 0.2; v = lp2 * 1.6; }
    put(i0 + k, v * env * g, pan, rev);
  }
}
function flauta(t, dur, midi, g, pan = 0.15) {   // como un txistu: casi pura, con soplo y vibrato
  const i0 = Math.round(t * SR), n = Math.round((dur + 0.25) * SR), f = mtof(midi); let ph = 0, nz = 0;
  for (let k = 0; k < n; k++) { const s = k / SR, env = Math.min(1, s / 0.06) * (s > dur ? Math.exp(-(s - dur) / 0.08) : 1), vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.6 * s) * Math.min(1, s / 0.3);
    ph += 2 * Math.PI * f * vib / SR; nz += ((rnd() * 2 - 1) - nz) * 0.2;
    put(i0 + k, (Math.sin(ph) + 0.18 * Math.sin(2 * ph) + 0.06 * Math.sin(3 * ph) + nz * 0.06) * env * g, pan, 0.45); }
}
function ruido(t, dur, g, { desde = 300, hasta = 8000, sube = true, pan = 0, rev = 0.4, forma = 'sube' } = {}) {   // subidas, platillos, ráfagas
  const i0 = Math.round(t * SR), n = Math.round(dur * SR); let lp = 0, hp = 0, prev = 0;
  for (let k = 0; k < n; k++) { const x = k / n, fc = desde * Math.pow(hasta / desde, sube ? x : 1 - x), a = Math.min(0.99, 2 * Math.PI * fc / SR);
    const w = rnd() * 2 - 1; lp += (w - lp) * a; hp = lp - prev; prev = lp;
    const env = forma === 'sube' ? Math.pow(x, 2.2) : forma === 'cae' ? Math.exp(-x * 6) : Math.sin(Math.PI * x);
    put(i0 + k, (lp * 0.6 + hp * 0.8) * env * g, pan, rev); }
}
function latido(t, g = 1) { boom(t, g, 70, 38, 0.5); boom(t + 0.22, g * 0.7, 66, 36, 0.45); }

// ---------- la partitura ----------
const Dm = [50, 53, 57], Bb = [46, 50, 53], F = [41, 45, 48], C = [48, 52, 55], Am = [45, 48, 52], Gm = [43, 46, 50], D = [50, 54, 57];
const acorde = (t, dur, ch, g, o = {}) => ch.forEach((m, i) => nota(t, dur, m + (o.oct || 0), g, { ...o, pan: (i - 1) * 0.35 }));
// 0-8: silencio, latidos y un pedal grave que aparece
for (let t = 0.6; t < 8; t += 1.15) latido(t, 0.55 + t * 0.05);
nota(1.5, 6.4, 38, 0.10, { tipo: 'cuerda', att: 3, rel: 0.8 }); nota(3.5, 4.4, 45, 0.06, { tipo: 'cuerda', att: 2.5, rel: 0.8 });
txala(5.2, 0.25, 205, -0.4); txala(6.4, 0.3, 255, 0.4); txala(6.65, 0.25, 205, -0.4);
ruido(6.2, 1.8, 0.22, { desde: 200, hasta: 5000 });
boom(8.0, 1.0, 110, 32, 2.2);
// 8-18: noche. Ostinato de cuerdas en corcheas, tambores que crecen, txalaparta, golpes de metal en cada criatura
const prog1 = [Dm, Dm, Bb, Bb, Gm, Gm, Am, Am, Dm, Dm];
for (let b = 0; b < 40; b++) { const t = 8 + b * BEAT / 2, ch = prog1[Math.floor(b / 4)], m = ch[b % 2 ? 2 : 0] - 12; nota(t, 0.2, m, 0.14 + b * 0.003, { tipo: 'cuerda', att: 0.01, rel: 0.12, rev: 0.25 }); nota(t, 0.2, m + 12, 0.07 + b * 0.002, { tipo: 'cuerda', att: 0.01, rel: 0.12, rev: 0.25, pan: 0.3 }); }
for (let b = 0; b < 20; b++) { const t = 8 + b * BEAT; if (b % 2 === 0 || b > 10) taiko(t, 0.35 + b * 0.025, 120, (b % 2 ? 0.3 : -0.3)); }
for (let b = 0; b < 32; b++) { const t = 10 + b * BEAT / 2; txala(t, 0.22 + b * 0.004, b % 2 ? 255 : 205, b % 2 ? 0.45 : -0.45); if (b % 4 === 3) txala(t + BEAT / 4, 0.16, 230, 0); }
for (const t of [10.5, 12.3, 13.8, 15.3]) { acorde(t, 1.1, [38, 45, 50], 0.22, { tipo: 'metal', att: 0.02, rel: 0.6 }); boom(t, 0.8, 95, 34, 1.4); ruido(t - 0.5, 0.6, 0.18, { desde: 400, hasta: 6000, forma: 'campana' }); }
ruido(16.2, 1.8, 0.35, { desde: 250, hasta: 9000 });
for (let k = 0; k < 8; k++) taiko(17 + k * 0.125, 0.4 + k * 0.05, 150, (k % 2 ? 0.4 : -0.4));
// 18-35: montaje a todo ritmo
const prog2 = [Dm, Bb, F, C];
const tema = [[0, 62, 1], [1, 69, 1], [2, 67, 0.5], [2.5, 65, 0.5], [3, 64, 1], [4, 62, 1.5], [5.5, 60, 0.5], [6, 62, 2]];   // (en pulsos)
for (let bar = 0; bar < 8.5; bar++) {
  const t0 = 18 + bar * 4 * BEAT, ch = prog2[bar % 4];
  for (let b = 0; b < 4; b++) { const t = t0 + b * BEAT; if (t >= 35) break; taiko(t, 0.55, 110, b % 2 ? 0.25 : -0.25); boom(t, b === 0 ? 0.55 : 0.3, 80, 40, 0.5); if (b === 1 || b === 3) taiko(t + BEAT / 2, 0.3, 170, 0.5); }
  for (let s = 0; s < 16; s++) { const t = t0 + s * BEAT / 4; if (t >= 35) break; txala(t, s % 4 === 0 ? 0.3 : 0.18, s % 2 ? 260 : 210, s % 2 ? 0.5 : -0.5); }
  for (let e = 0; e < 8; e++) { const t = t0 + e * BEAT / 2; if (t >= 35) break; nota(t, 0.22, ch[e % 3] - 12, 0.16, { tipo: 'cuerda', att: 0.01, rel: 0.1, rev: 0.2 }); }
  if (t0 < 34) acorde(t0, 4 * BEAT - 0.05, ch, 0.06, { tipo: 'cuerda', att: 0.3, rel: 0.4, oct: 12 });
}
for (const rep of [0, 1]) for (const [b, m, d] of tema) { const t = 18 + 4 + rep * 8 * 4 * BEAT / 2 + b * BEAT; if (t < 34.5) nota(t, d * BEAT * 0.95, m, 0.17, { tipo: 'metal', att: 0.04, rel: 0.3, pan: -0.1 }); }
ruido(32.6, 2.4, 0.5, { desde: 200, hasta: 12000 });
for (let k = 0; k < 16; k++) taiko(33.5 + k * 0.094, 0.35 + k * 0.04, 160, (k % 2 ? 0.5 : -0.5));
// 35: el clímax
boom(35, 1.3, 120, 30, 3); ruido(35, 3.5, 0.5, { desde: 9000, hasta: 1500, sube: false, forma: 'cae', rev: 0.6 });
const prog3 = [Bb, C, Dm, Dm, Bb, C, F, D];
for (let bar = 0; bar < 6.5; bar++) {
  const t0 = 35 + bar * 4 * BEAT, ch = prog3[bar % 8];
  acorde(t0, 4 * BEAT, ch, 0.12, { tipo: 'metal', att: 0.05, rel: 0.5 }); acorde(t0, 4 * BEAT, ch, 0.09, { tipo: 'coro', att: 0.4, rel: 0.6, oct: 12, rev: 0.6 });
  acorde(t0, 4 * BEAT, ch, 0.07, { tipo: 'cuerda', att: 0.2, rel: 0.5, oct: 24 });
  for (let b = 0; b < 4; b++) { const t = t0 + b * BEAT; if (t >= 48) break; taiko(t, 0.7, 100, b % 2 ? 0.3 : -0.3); boom(t, 0.4, 80, 38, 0.6); taiko(t + BEAT / 2, 0.32, 165, 0.45); }
  for (let s = 0; s < 16; s++) { const t = t0 + s * BEAT / 4; if (t >= 48) break; txala(t, 0.16, s % 2 ? 265 : 215, s % 2 ? 0.55 : -0.55); }
}
for (const rep of [0, 1]) for (const [b, m, d] of tema) { const t = 35 + rep * 6.5 + b * BEAT * 0.8; if (t < 47.6) nota(t, d * BEAT * 0.8, m + 12, 0.15, { tipo: 'metal', att: 0.03, rel: 0.35 }); }
ruido(46.3, 1.7, 0.3, { desde: 9000, hasta: 600, sube: false, forma: 'campana' });
// 48-55: emoción. Sin tambores: cuerdas cálidas, la flauta con el tema y la txalaparta suave
const prog4 = [F, C, Dm, Bb];
for (let bar = 0; bar < 3.5; bar++) { const t0 = 48 + bar * 2, ch = prog4[bar % 4]; acorde(t0, 2, ch, 0.11, { tipo: 'cuerda', att: 0.5, rel: 0.8, rev: 0.5 }); nota(t0, 2, ch[0] - 12, 0.1, { tipo: 'cuerda', att: 0.4, rel: 0.8 }); }
for (const [b, m, d] of tema) { const t = 48.3 + b * 0.75; if (t < 54.6) flauta(t, d * 0.7, m + 12, 0.12); }
for (let s = 0; s < 24; s++) { const t = 49 + s * 0.25; if (t < 54.8) txala(t, 0.08, s % 2 ? 260 : 210, s % 2 ? 0.5 : -0.5); }
// 55-57: silencio, un latido y la subida al revés
latido(55.9, 0.5);
ruido(56.1, 0.9, 0.45, { desde: 300, hasta: 11000 });
// 57: golpe final y cola
boom(57, 1.5, 130, 28, 3.2); acorde(57, 2.4, D, 0.2, { tipo: 'metal', att: 0.02, rel: 1.2 }); acorde(57, 2.4, D, 0.12, { tipo: 'coro', att: 0.08, rel: 1.4, oct: 12, rev: 0.7 });
taiko(57, 1.0, 90, 0); ruido(57, 3, 0.55, { desde: 10000, hasta: 1200, sube: false, forma: 'cae', rev: 0.7 });

// ---------- reverberación (como Freeverb: 8 peines y 4 pasatodo por canal) y mezcla ----------
function reverb(inp, sp) {
  const C = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(d => Math.round((d + sp) * SR / 44100)), A = [556, 441, 341, 225].map(d => Math.round((d + sp) * SR / 44100));
  const out = new Float32Array(N), fb = 0.86, damp = 0.25;
  for (const d of C) { const buf = new Float32Array(d); let idx = 0, f = 0; for (let i = 0; i < N; i++) { const y = buf[idx]; f = y * (1 - damp) + f * damp; buf[idx] = inp[i] + f * fb; idx = (idx + 1) % d; out[i] += y * 0.12; } }
  for (const d of A) { const buf = new Float32Array(d); let idx = 0; for (let i = 0; i < N; i++) { const b = buf[idx], x = out[i]; buf[idx] = x + b * 0.5; out[i] = b - x; idx = (idx + 1) % d; } }
  return out;
}
const rl = reverb(busRev[0], 0), rr = reverb(busRev[1], 23);
// (el volumen de cada parte, para que vaya a más hasta el clímax: la noche contenida, el montaje con fuerza y el clímax,
// lo más alto; suavizado entre una parte y otra)
const CURVA = [[0, 1], [8, 0.8], [18, 1.35], [35, 1.55], [48, 1.05], [57, 1.2], [60, 1.2]];
const ganancia = (t) => { let k = 0; while (k < CURVA.length - 2 && t > CURVA[k + 1][0]) k++; const [t0, g0] = CURVA[k], [t1, g1] = CURVA[k + 1], x = Math.min(1, Math.max(0, (t - t0) / 0.35)); return g0 + (g1 - g0) * 0 + (k > 0 ? (g0 - CURVA[k - 1][1]) * (x - 1) : 0); };
let pk = 0; for (let i = 0; i < N; i++) { const gk = ganancia(i / SR); L[i] = (L[i] + rl[i] * 0.9) * gk; R[i] = (R[i] + rr[i] * 0.9) * gk; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
// (al final, el silencio de verdad entre 55 y 55,9: se apagan las colas que lleguen)
for (let i = Math.round(54.7 * SR); i < Math.round(55.85 * SR); i++) { const k = Math.max(0, 1 - (i - 54.7 * SR) / (0.3 * SR)); L[i] *= k; R[i] *= k; }
// volumen y limitador suave
const g = 2.2 / pk, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { const fade = i > N - SR * 0.3 ? (N - i) / (SR * 0.3) : 1;
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 0.89 * fade * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 0.89 * fade * 32767), 46 + i * 4); }
writeFileSync(process.argv[2] || 'musica-trailer.wav', buf);
console.log('listo', (pk).toFixed(2));
