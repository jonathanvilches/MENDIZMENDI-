// Corta una grabación larga del comentarista en un archivo por frase, con el nombre de su clave (dejada-2.mp3).
// Uso:   node tools/corta-voz.mjs <grabación> <es|eu|kantari> [hombre|mujer] [--prueba <carpeta>]
// La grabación: las frases del guion en orden, con dos o tres segundos callado entre una y otra. Si una sale mal,
// una palmada y se repite: la palmada y la toma de antes se tiran. Los archivos van a src/assets/voz/<voz>/<es|eu>/
// (el kantari, siempre a eu), o a la carpeta de --prueba. Imprime un informe: cada frase con lo que dura y lo que
// debería durar según su texto; las raras salen marcadas para escucharlas.
//
// Cómo encuentra las frases: mide el volumen cada 10 ms, separa lo que suena de lo callado y reparte los trozos entre
// las frases del guion de forma que los cortes caigan en los silencios más largos y cada frase dure lo que le toca por
// su texto (programación dinámica). Así aguanta una pausa a mitad de frase o un silencio más corto de la cuenta.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { F } from '../src/pelota/comenta.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iP = args.indexOf('--prueba'), prueba = iP >= 0 ? args.splice(iP, 2)[1] : null;
const [ent, que = 'es', voz = 'hombre'] = args;
if (!ent || !existsSync(ent) || !['es', 'eu', 'kantari'].includes(que) || !['hombre', 'mujer'].includes(voz)) {
  console.error('Uso: node tools/corta-voz.mjs <grabación> <es|eu|kantari> [hombre|mujer] [--prueba <carpeta>]'); process.exit(1);
}

// ---- El guion, en el orden en que se lee ----
const EU = ['hutsa', 'bat', 'bi', 'hiru', 'lau', 'bost', 'sei', 'zazpi', 'zortzi', 'bederatzi', 'hamar', 'hamaika', 'hamabi', 'hamahiru', 'hamalau', 'hamabost', 'hamasei', 'hamazazpi', 'hamazortzi', 'hemeretzi', 'hogei', 'hogeita bat', 'hogeita bi'];
function guion() {
  if (que !== 'kantari') return Object.entries(F[que]).flatMap(([k, L]) => L.map(([, t], i) => ({ id: `${k}-${i + 1}`, texto: t })));
  // (el kantari: los tres de arriba y luego la tabla fila a fila, primero A y luego B; los trozos cantados duran más)
  const G = [{ id: 'kantari-gorriak', texto: 'gorriak!' }, { id: 'kantari-urdinak', texto: 'urdinak!' }, { id: 'kantari-berdin', texto: 'berdin!' }];
  for (let n = 0; n <= 22; n++) { if (n) G.push({ id: `kantari-a-${n}`, texto: EU[n] }); if (n < 22) G.push({ id: `kantari-b-${n}`, texto: `eta ${EU[n]}` }); }
  return G;
}
const FR = guion();
// (lo que pesa cada frase: las letras, más una pausa por cada punto o coma)
const peso = (t) => t.replace(/[^\p{L}\p{N}]/gu, '').length + 5 * (t.match(/[.,:;!?¡¿]/g) || []).filter((c, i, a) => !'¡¿'.includes(c)).length + 4;

// ---- El volumen, cada 10 ms ----
const SR = 16000, PASO = 160;
const pcm = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', ent, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
if (pcm.status !== 0) { console.error(String(pcm.stderr)); process.exit(1); }
const S = new Int16Array(pcm.stdout.buffer, pcm.stdout.byteOffset, pcm.stdout.length >> 1);
const nF = Math.floor(S.length / PASO), dB = new Float32Array(nF);
for (let f = 0; f < nF; f++) { let s = 0; for (let i = f * PASO; i < (f + 1) * PASO; i++) s += S[i] * S[i]; dB[f] = 10 * Math.log10(s / PASO / 32768 / 32768 + 1e-12); }
const orden = Float32Array.from(dB).sort(), pct = (p) => orden[Math.min(nF - 1, Math.floor(p * nF))];
const fondo = pct(0.1), voz95 = pct(0.97), umbral = Math.max(fondo + 10, Math.min(voz95 - 28, fondo + 22));
const t = (f) => f * PASO / SR;

// ---- Trozos que suenan ----
let tro = [];
for (let f = 0, ini = -1; f <= nF; f++) {
  const on = f < nF && dB[f] > umbral;
  if (on && ini < 0) ini = f; else if (!on && ini >= 0) { tro.push({ a: ini, b: f }); ini = -1; }
}
// (huecos de menos de 0,15 s, dentro del mismo trozo; trozos de menos de 40 ms, ruido)
tro = tro.reduce((o, x) => { const u = o.at(-1); if (u && t(x.a - u.b) < 0.15) u.b = x.b; else o.push({ ...x }); return o; }, []).filter(x => t(x.b - x.a) >= 0.04);
for (const x of tro) { let m = -99; for (let f = x.a; f < x.b; f++) m = Math.max(m, dB[f]); x.pico = m; }

// ---- Palmadas: la palmada y la toma de antes, fuera ----
const LARGO = 1.0;   // (un silencio así separa una toma de la anterior)
let tiradas = 0;
for (let i = 0; i < tro.length; i++) {
  const x = tro[i], dur = t(x.b - x.a), antes = i ? t(x.a - tro[i - 1].b) : 9, despues = i < tro.length - 1 ? t(tro[i + 1].a - x.b) : 9;
  if (dur <= 0.22 && x.pico > voz95 - 6 && antes >= 0.3 && despues >= 0.3) {
    let j = i - 1; while (j > 0 && t(tro[j].a - tro[j - 1].b) < LARGO) j--;
    tiradas++; tro.splice(Math.max(0, j), i - Math.max(0, j) + 1); i = Math.max(0, j) - 1;
  }
}

// ---- Reparto de los trozos entre las frases ----
const m = tro.length, n = FR.length;
if (m < n) { console.error(`Hay ${m} trozos con voz y ${n} frases: faltan pausas entre frases (o falta texto). Revisa la grabación.`); process.exit(2); }
const W = FR.map(x => peso(x.texto)), totW = W.reduce((a, b) => a + b, 0);
let voces = 0; for (let i = 0; i < m; i++) voces += t(tro[i].b - tro[i].a) + (i < m - 1 ? Math.min(0.6, t(tro[i + 1].a - tro[i].b)) : 0);
const c = voces / totW;
const hueco = (i) => t(tro[i + 1].a - tro[i].b);   // (silencio tras el trozo i)
const coste = (j, a, b) => {
  const D = t(tro[b].b - tro[a].a), e = W[j] * c; let g = 0; for (let i = a; i < b; i++) g += Math.max(0, hueco(i) - 0.25);
  return Math.log(D / e) ** 2 + 2.5 * g;
};
const INF = 1e18, P = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF)), Q = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
P[0][0] = 0;
const MAXT = 12;   // (una frase no lleva más de 12 trozos)
for (let j = 1; j <= n; j++) for (let b = j; b <= m - (n - j); b++) for (let a = Math.max(j, b - MAXT + 1); a <= b; a++) {
  const v = P[j - 1][a - 1] + coste(j - 1, a - 1, b - 1); if (v < P[j][b]) { P[j][b] = v; Q[j][b] = a; }
}
const grupos = []; for (let j = n, b = m; j > 0; j--) { const a = Q[j][b]; grupos.unshift({ a: a - 1, b: b - 1 }); b = a - 1; }

// ---- Salida ----
const dest = prueba || join(RAIZ, 'src/assets/voz', voz, que === 'kantari' ? 'eu' : que);
mkdirSync(dest, { recursive: true });
// (el mismo volumen para todas: se mide la grabación entera una vez, EBU R128, y se lleva a -16 LUFS)
const ln = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', ent, '-af', 'loudnorm=I=-16:TP=-1.5:print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
const ii = parseFloat((String(ln.stderr).match(/"input_i"\s*:\s*"(-?[\d.]+)"/) || [])[1]);
const gana = Number.isFinite(ii) ? Math.max(-12, Math.min(18, -16 - ii)) : 0;
const fila = [], raras = [];
grupos.forEach((g, j) => {
  const ini = Math.max(0, t(tro[g.a].a) - 0.12), fin = t(tro[g.b].b) + 0.22, D = t(tro[g.b].b - tro[g.a].a), e = W[j] * c, r = D / e;
  const antes = g.a ? hueco(g.a - 1) : 9, rara = r < 0.55 || r > 1.8 || antes < 0.5;
  const out = join(dest, `${FR[j].id}.mp3`);
  const ff = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-ss', ini.toFixed(3), '-to', fin.toFixed(3), '-i', ent,
    '-af', `highpass=f=70,volume=${gana.toFixed(2)}dB,alimiter=limit=0.84:level=false,afade=t=in:d=0.015,afade=t=out:st=${(fin - ini - 0.08).toFixed(3)}:d=0.08`,
    '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', out]);
  if (ff.status !== 0) { console.error(FR[j].id, String(ff.stderr)); process.exit(1); }
  fila.push(`${rara ? '¿?' : '  '} ${FR[j].id.padEnd(22)} ${ini.toFixed(2).padStart(7)} s  dura ${D.toFixed(2)} s (esperado ${e.toFixed(2)})  ${FR[j].texto}`);
  if (rara) raras.push(FR[j].id);
});
console.log(fila.join('\n'));
console.log(`\n${n} frases en ${dest}. Trozos con voz: ${m}. Tomas tiradas por palmada: ${tiradas}. Volumen: ${gana >= 0 ? '+' : ''}${gana.toFixed(1)} dB.`);
console.log(raras.length ? `Para escuchar (duración o pausa rara): ${raras.join(', ')}` : 'Ninguna frase rara.');
