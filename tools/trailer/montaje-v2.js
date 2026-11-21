// El montaje del tráiler v2 (21 de noviembre de 2026; el autor: «espectacular, muy gaming y cinematográfico», «a partir de
// ahora dale prioridad al tráiler»). Mismo motor que montaje.js (montar.mjs lo carga con MONTAJE=montaje-v2.js): cada
// fotograma se compone en un lienzo 2D con lo rodado (rodar.mjs con planos-v2.mjs y planos-inversores.mjs, y la isla de
// rodar-mapa.mjs), las láminas y las capturas.
// La música es la épica del juego (musica-torneos, la del autor), cortada a su pulso (126,7 por minuto, el compás de
// 1,895 s): la intro de 8 compases con la isla y la noche, el silencio de 2 s antes del golpe, tres frases de 8 compases
// (Explora: la manada roja de momotxorros y los pueblos; Juega: la pelotari; Descubre: castillos, leyendas y láminas) y
// la caída con el logo. Lo de videojuego: bandas de cine en la intro que se abren con el golpe, cortes al compás, golpe de
// cámara y temblor en los impactos, aberración de color, barridos, los avisos de misión del juego y textos que entran de
// golpe con un poco de interferencia. tools/trailer/mezcla-v2.py hace el sonido (la música cortada y los golpes).
//   /p/<plano>/<n>.jpg  lo rodado · /f/<archivo>  las capturas · /a/<ruta>  src/assets · /font/<archivo>  las letras
export const FPS = 24, W = 1920, H = 1080, DURA = 69.5;
export const URL_JUEGO = 'jonathanvilches.github.io/MENDIZMENDI-';

// ---------- el pulso de la música ----------
// (musica-torneos: el golpe en el segundo 22,98 de la canción; aquí empieza 8 compases antes, en el 7,82)
const BEAT = 0.4737, BAR = BEAT * 4, DROP = 15.158;
const B = (k) => Math.round((DROP + k * BAR) * 1000) / 1000;   // (el compás k desde el golpe; negativos, la intro)
const SILENCIO = 13.18;   // (de aquí al golpe, la música calla)

// ---------- las tomas ----------
// a-b: cuándo · src: 'p:plano', 'f:archivo', 'a:ruta' o 'negro' · desde: segundos que se salta · vel: velocidad (0,5 a
// cámara lenta) · luz: el color · entra: ['funde'|'negro'|'blanco'|'barre', s] · kb: la foto se acerca [z0, z1, x0, y0,
// x1, y1] · impacto: golpe de cámara (0-1) · golpe: chispazo de color · rotulo: [arriba, nombre]
const L = 'a:laminas/grande/';
const TOMAS = [
  // ---- intro (bandas de cine): Navarra, la comarca se suelta y sube; la noche y las leyendas ----
  { a: 0, b: B(-3), src: 'p:isla', luz: 'mapa', entra: ['negro', 1.6] },
  { a: B(-3), b: B(-2), src: 'p:basajaun', luz: 'noche', entra: ['negro', 0.22], golpe: '#9ff3ff', desde: 0.3 },
  { a: B(-2), b: SILENCIO, src: 'p:lamia', luz: 'noche', desde: 0.5, sale: ['negro', 0.2] },
  // (el silencio: negro, una frase en euskera y tres destellos rojos de la manada)
  { a: SILENCIO, b: 14.42, src: 'negro' },
  { a: 14.42, b: 14.5, src: 'p:manadaBaile', luz: 'rojo', desde: 1.2, golpe: '#ff3a1c' },
  { a: 14.5, b: 14.66, src: 'negro' },
  { a: 14.66, b: 14.74, src: 'p:manadaCenital', luz: 'rojo', desde: 1.0, golpe: '#ff3a1c' },
  { a: 14.74, b: 14.9, src: 'negro' },
  { a: 14.9, b: 14.98, src: 'p:manadaBaile', luz: 'rojo', desde: 2.6, golpe: '#ff3a1c' },
  { a: 14.98, b: DROP, src: 'negro' },
  // ---- Explora: la manada llena la plaza roja de Altsasu; los pueblos y su gente ----
  { a: B(0), b: B(1), src: 'p:manadaBaile', luz: 'rojo', impacto: 1, entra: ['blanco', 0.35] },
  { a: B(1), b: B(1.5), src: 'p:manadaCenital', luz: 'rojo', desde: 0.5 },
  { a: B(1.5), b: B(2), src: 'p:manadaBaile', luz: 'rojo', desde: 2.3 },
  { a: B(2), b: B(3), src: 'p:manadaHuyen', luz: 'rojo', desde: 0.4, entra: ['barre', 0.2], rotulo: ['Altsasu', 'Momotxorros'] },
  { a: B(3), b: B(4), src: 'p:otsaVuelo', luz: 'dia', entra: ['blanco', 0.3], impacto: 1 },
  { a: B(4), b: B(4.5), src: 'p:subida', luz: 'dia', desde: 0.8 },
  { a: B(4.5), b: B(5), src: 'p:joxemari', luz: 'dia', desde: 0.6 },
  { a: B(5), b: B(6), src: 'p:foruPlaza', luz: 'dia', entra: ['barre', 0.2], rotulo: ['Altsasu', 'Foru Plaza'] },
  { a: B(6), b: B(6.5), src: 'p:maite', luz: 'dia', desde: 0.5 },
  { a: B(6.5), b: B(7), src: 'p:joaldun', luz: 'dia', desde: 0.8, golpe: '#ffe2b8' },
  { a: B(7), b: B(7.5), src: 'p:bobo', luz: 'dia', desde: 0.6 },
  { a: B(7.5), b: B(8), src: 'p:momotxorro', luz: 'calido', desde: 1.0, golpe: '#ff9a6a' },
  // ---- Juega: la pelotari en el Labrit ----
  { a: B(8), b: B(9), src: 'p:pelotari', luz: 'calido', desde: 0.4, entra: ['blanco', 0.3], impacto: 1 },
  { a: B(9), b: B(9.5), src: 'p:pelotaLabrit2', luz: 'calido', desde: 0.8 },
  { a: B(9.5), b: B(10), src: 'p:pelotariAtras', luz: 'calido', desde: 0.4 },
  { a: B(10), b: B(11), src: 'p:pelotaLabrit', luz: 'calido', entra: ['barre', 0.2] },
  { a: B(11), b: B(12), src: 'p:pelotari', luz: 'calido', desde: 1.2 },
  { a: B(12), b: B(13), src: 'p:publico', luz: 'calido', entra: ['blanco', 0.25], impacto: 0.7 },
  { a: B(13), b: B(13.5), src: 'p:pelota', luz: 'calido', desde: 0.4 },
  { a: B(13.5), b: B(14), src: 'p:pelotariAtras', luz: 'calido', desde: 1.6 },
  { a: B(14), b: B(15), src: 'p:pelotari', luz: 'calido', desde: 2.0, vel: 0.5, entra: ['barre', 0.2] },
  { a: B(15), b: B(15.25), src: 'p:pelotaLabrit2', luz: 'calido', desde: 1.8 },
  { a: B(15.25), b: B(15.5), src: 'p:publico', luz: 'calido', desde: 2.2 },
  { a: B(15.5), b: B(15.75), src: 'p:pelotariAtras', luz: 'calido', desde: 2.4 },
  { a: B(15.75), b: B(16), src: 'p:pelotari', luz: 'calido', desde: 2.6 },
  // ---- Descubre: castillos, leyendas, las láminas y el pasaporte ----
  { a: B(16), b: B(17), src: 'p:olite', luz: 'ocaso', entra: ['blanco', 0.35], impacto: 1, desde: 1 },
  { a: B(17), b: B(18), src: 'p:javier', luz: 'ocaso', desde: 1.2, rotulo: ['Javier', 'Castillo de Javier'] },
  { a: B(18), b: B(18.5), src: 'p:basajaun', luz: 'ocaso', desde: 1.0, golpe: '#b6ff9a' },
  { a: B(18.5), b: B(19), src: 'p:lamia', luz: 'ocaso', desde: 1.2, golpe: '#9ff3ff' },
  { a: B(19), b: B(19.25), src: L + 'altsasu-momotxorro.webp', luz: 'ilus', kb: [1.0, 1.1, 0.5, 0.5, 0.5, 0.45] },
  { a: B(19.25), b: B(19.5), src: L + 'amaiur-basajaun.webp', luz: 'ilus', kb: [1.0, 1.1, 0.5, 0.5, 0.5, 0.45] },
  { a: B(19.5), b: B(19.75), src: L + 'aribe-irati.webp', luz: 'ilus', kb: [1.0, 1.1, 0.5, 0.5, 0.52, 0.48] },
  { a: B(19.75), b: B(20), src: L + 'burgui-almadia.webp', luz: 'ilus', kb: [1.0, 1.1, 0.5, 0.5, 0.5, 0.46] },
  { a: B(20), b: B(21), src: 'f:menu-passport.png', luz: 'menu', entra: ['barre', 0.2], kb: [1.0, 1.08, 0.5, 0.5, 0.44, 0.46] },
  { a: B(21), b: B(21.5), src: 'p:vecinos', luz: 'ocaso', desde: 1.0 },
  { a: B(21.5), b: B(22), src: 'p:horizonte', luz: 'ocaso', desde: 2.0 },
  // (el remate: un corte por pulso y luego por medio pulso)
  { a: B(22), b: B(22.25), src: 'p:manadaBaile', luz: 'rojo', desde: 1.0 },
  { a: B(22.25), b: B(22.5), src: 'p:pelotari', luz: 'calido', desde: 0.8 },
  { a: B(22.5), b: B(22.625), src: 'p:joaldun', luz: 'dia', desde: 1.5 },
  { a: B(22.625), b: B(22.75), src: 'p:otsaVuelo', luz: 'dia', desde: 2.0 },
  { a: B(22.75), b: B(22.875), src: 'p:olite', luz: 'ocaso', desde: 3.0 },
  { a: B(22.875), b: B(23), src: 'p:publico', luz: 'calido', desde: 2.6 },
  { a: B(23), b: B(24), src: 'p:manadaCenital', luz: 'rojo', desde: 1.0, impacto: 0.6, entra: ['blanco', 0.25] },
  // ---- el logo, sobre la isla ----
  { a: B(24), b: DURA, src: 'p:isla', luz: 'mapa', desde: 10.0, vel: 0.3, logo: B(24) },
];
// (fogonazos blancos: cuándo, cuánto, cuánto dura)
const DESTELLOS = [[B(0), 0.95, 0.5], [B(3), 0.5, 0.3], [B(8), 0.6, 0.35], [B(12), 0.4, 0.3], [B(16), 0.7, 0.4], [B(23), 0.5, 0.3], [B(24), 0.85, 0.6]];
const A_BLANCO = [B(23.82), B(24)];   // (la imagen se va a blanco justo antes del logo)
// (los golpes de cámara: los de las tomas con impacto y los de los textos que entran de golpe)
const IMPACTOS = [...TOMAS.filter(T => T.impacto).map(T => [T.a, T.impacto]), [B(24), 0.8]];

// ---------- los textos ----------
const TEXTOS = [
  { a: 1.5, b: 7.4, t: 'Navarra guarda leyendas.', estilo: 'frase', tono: 'dia' },
  { a: 9.75, b: 13.0, t: 'Y esta noche despiertan.', estilo: 'frase', tono: 'noche' },
  { a: B(3) + 0.02, b: B(4) - 0.08, t: 'Explora', estilo: 'golpe', sobre: '12 comarcas · 38 pueblos' },
  { a: B(8) + 0.02, b: B(9) - 0.08, t: 'Juega', estilo: 'golpe', sobre: 'Pelota vasca' },
  { a: B(11) + 0.15, b: B(12) - 0.1, t: 'Elige tu pelotari.', estilo: 'frase', tono: 'ocaso', lado: 'izq' },
  { a: B(12) + 0.02, b: B(13) - 0.08, t: 'Campeonatos', estilo: 'golpe' },
  { a: B(16) + 0.02, b: B(17) - 0.08, t: 'Descubre', estilo: 'golpe', sobre: 'Leyendas · castillos · fiestas' },
  { a: B(23) + 0.1, b: B(23.85), t: 'Pueblo a pueblo.', estilo: 'palabras', cada: 0.45 },
];
const EUSKERA = [{ a: SILENCIO + 0.12, b: 14.34, eu: 'Herri bakoitzak, bere kondaira', es: 'cada pueblo, su leyenda', x: 0.5, y: 0.5 }];
// los avisos del juego, arriba a la izquierda (como al jugar: la misión que se acaba, la nueva y la insignia)
const AVISOS = [
  { a: B(0) + 0.35, b: B(1.6), tipo: 'hecha', sobre: 'Misión completada', t: 'Encuentra a los tres momotxorros' },
  { a: B(6) + 0.1, b: B(7.3), tipo: 'mision', sobre: 'Nueva misión', t: 'Los vecinos te necesitan' },
  { a: B(20) + 0.3, b: B(21.4), tipo: 'insignia', sobre: 'Insignia conseguida', t: 'Música de plaza' },
];

// ---------- utilidades ----------
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const ease = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - cl(x), 3);
const easeOutExpo = (x) => (x = cl(x)) >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const ruido = (t, k) => Math.sin(t * 91.7 + k * 13.1) * 0.6 + Math.sin(t * 57.3 + k * 4.7) * 0.4;   // (temblor, determinista)
const DISP = "'MZ Display', sans-serif", TXT = "'MZ Texto', sans-serif";
let CUANTOS = {};

const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
const ctx = cv.getContext('2d');
const capa = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const [tmpC, tmpX] = capa(), [prevC, prevX] = capa(), [rC, rX] = capa(), [gC, gX] = capa();

// ---------- imágenes ----------
const cache = new Map();
function carga(url) {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((ok, mal) => { const im = new Image(); im.onload = () => im.decode().then(() => ok(im), () => ok(im)); im.onerror = () => mal(new Error('falta ' + url)); im.src = url; });
    cache.set(url, p);
    if (cache.size > 120) cache.delete(cache.keys().next().value);
  }
  return p;
}
const urlDe = (T, t) => {
  const [k, r] = [T.src.slice(0, 1), T.src.slice(2)];
  if (k === 'p') { const n = CUANTOS[r] || 1, i = cl(Math.round(((t - T.a) * (T.vel || 1) + (T.desde || 0)) * FPS), 0, n - 1); return `/p/${r}/${String(i).padStart(4, '0')}.jpg`; }
  return k === 'f' ? `/f/${r}` : `/a/${r}`;
};

// ---------- el color de cada momento ----------
const LUZ = {
  noche: { f: 'saturate(0.86) contrast(1.14) brightness(0.92)', tono: ['#4a3ab8', 0.5], mult: ['#3a2f86', 0.18], velo: ['#a9a0ff', 0.06], vin: 0.62 },
  dia: { f: 'saturate(1.14) contrast(1.08)', tono: ['#ffcf80', 0.22], velo: ['#fff0cc', 0.1], vin: 0.36 },
  ocaso: { f: 'saturate(1.14) contrast(1.08)', tono: ['#ff9a52', 0.34], velo: ['#ffc58a', 0.14], vin: 0.46 },
  calido: { f: 'saturate(1.12) contrast(1.08)', tono: ['#ffb066', 0.26], velo: ['#ffd9a8', 0.1], vin: 0.44 },
  rojo: { f: 'saturate(1.22) contrast(1.14)', tono: ['#ff2a10', 0.42], velo: ['#ff7a4a', 0.1], vin: 0.58, rojo: 0.85 },
  menu: { f: 'none', vin: 0.24 },
  mapa: { f: 'saturate(1.08) contrast(1.05)', velo: ['#fff0cc', 0.06], vin: 0.3 },
  ilus: { f: 'saturate(1.06)', tono: ['#ffc890', 0.12], vin: 0.32 },
};
const [vinC, vinX] = capa(), [rojC, rojX] = capa();
(() => {
  const g = vinX.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 1.02); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,1)'); vinX.fillStyle = g; vinX.fillRect(0, 0, W, H);
  // (el rojo de la manada por los bordes, como el velo del juego: manada-velo de townLeyendas.js)
  const r = rojX.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62); r.addColorStop(0, 'rgba(255,40,10,0.05)'); r.addColorStop(0.55, 'rgba(220,24,0,0.3)'); r.addColorStop(1, 'rgba(140,0,0,0.6)'); rojX.fillStyle = r; rojX.fillRect(0, 0, W, H);
})();
function gradua(x, luz) {
  const L = LUZ[luz] || LUZ.dia;
  if (L.tono) { x.globalCompositeOperation = 'soft-light'; x.globalAlpha = L.tono[1]; x.fillStyle = L.tono[0]; x.fillRect(0, 0, W, H); }
  if (L.mult) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = L.mult[1]; x.fillStyle = L.mult[0]; x.fillRect(0, 0, W, H); }
  if (L.velo) { const g = x.createLinearGradient(0, 0, W * 0.3, H * 0.9); g.addColorStop(0, L.velo[0]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'screen'; x.globalAlpha = L.velo[1]; x.fillStyle = g; x.fillRect(0, 0, W, H); }
  x.globalCompositeOperation = 'source-over';
  if (L.rojo) { x.globalAlpha = L.rojo; x.drawImage(rojC, 0, 0); }
  x.globalAlpha = L.vin; x.drawImage(vinC, 0, 0); x.globalAlpha = 1;
}

// ---------- el golpe de cámara ----------
// (cuánto pesa ahora el último impacto: sube de golpe y se apaga en un tercio de segundo)
const fuerza = (t) => IMPACTOS.reduce((m, [ti, k]) => t >= ti && t - ti < 0.6 ? Math.max(m, k * Math.exp(-(t - ti) * 9)) : m, 0);

// dibuja una toma (imagen, movimiento, acercamiento del corte, temblor y color) en el lienzo x; dx: desplazada (barridos)
async function toma(x, T, t, dx = 0) {
  if (T.src === 'negro') { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); return; }
  const im = await carga(urlDe(T, t)), L = LUZ[T.luz] || LUZ.dia, F = fuerza(t);
  // (cada corte entra un poco más cerca y se asienta; con impacto, más, y la imagen tiembla)
  const z = 1 + 0.035 * Math.exp(-(t - T.a) * 8) + F * 0.06 + (F > 0.01 ? 0.03 : 0), sx = F * 22 * ruido(t, 1), sy = F * 16 * ruido(t, 2);
  x.save(); x.filter = L.f;
  x.translate(W / 2 + sx + dx, H / 2 + sy); x.scale(z, z); x.translate(-W / 2, -H / 2);
  if (T.kb) {
    const [z0, z1, x0, y0, x1, y1] = T.kb, k = ease((t - T.a) / (T.b - T.a)), base = Math.max(W / im.width, H / im.height);
    const zz = Math.min(base * lerp(z0, z1, k), Math.max(base, 1)), w = im.width * zz, h = im.height * zz;
    const cx = lerp(x0, x1, k) * w, cy = lerp(y0, y1, k) * h;
    x.drawImage(im, cl(W / 2 - cx, W - w, 0), cl(H / 2 - cy, H - h, 0), w, h);
  } else x.drawImage(im, 0, 0, W, H);
  x.restore();
  gradua(x, T.luz);
}

// la aberración de color: el rojo a un lado y el verde-azul al otro, d píxeles
function aberracion(d) {
  if (d < 0.8) return;
  tmpX.globalCompositeOperation = 'source-over'; tmpX.drawImage(cv, 0, 0);
  rX.globalCompositeOperation = 'source-over'; rX.drawImage(tmpC, 0, 0); rX.globalCompositeOperation = 'multiply'; rX.fillStyle = '#ff0000'; rX.fillRect(0, 0, W, H);
  gX.globalCompositeOperation = 'source-over'; gX.drawImage(tmpC, 0, 0); gX.globalCompositeOperation = 'multiply'; gX.fillStyle = '#00ffff'; gX.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(gC, -d, 0); ctx.drawImage(rC, d, d * 0.3);
  ctx.restore();
}

// ---------- textos ----------
function sombra(x, tono) {
  x.shadowColor = tono === 'noche' ? 'rgba(150,130,255,0.55)' : tono === 'ocaso' ? 'rgba(255,150,110,0.45)' : 'rgba(255,122,200,0.5)';
  x.shadowBlur = 34;
}
const [veloC, veloX] = capa();
(() => { const g = veloX.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.42); g.addColorStop(0, 'rgba(12,6,24,0.55)'); g.addColorStop(1, 'rgba(12,6,24,0)'); veloX.fillStyle = g; veloX.save(); veloX.translate(0, H / 2); veloX.scale(1, 0.5); veloX.translate(0, -H / 2); veloX.fillRect(0, -H / 2, W, H * 2); veloX.restore(); })();
const [txtC, txtX] = capa();
function texto(x, T, t) {
  const s = t - T.a, d = T.b - T.a;
  if (s < 0 || s > d) return;
  if (T.estilo !== 'golpe') { x.save(); x.globalAlpha = ease(s / 0.5) * (1 - ease((s - (d - 0.5)) / 0.5)) * 0.85; if (T.lado === 'izq') x.translate(-W * 0.26, 0); x.drawImage(veloC, 0, 0); x.restore(); }
  x.save(); x.textBaseline = 'alphabetic';
  if (T.estilo === 'frase') {
    const izq = T.lado === 'izq', pal = T.t.toUpperCase().split(' ');
    const size = izq ? 140 : 100, sale = cl((s - (d - 0.45)) / 0.45), abre = s / d;
    x.font = `400 ${size}px ${DISP}`; x.letterSpacing = (size * (0.06 + abre * 0.05)).toFixed(1) + 'px';
    const anchos = pal.map(p => x.measureText(p).width), hueco = size * 0.32;
    const lineas = izq ? pal.map((p, i) => [[p, anchos[i]]]) : [pal.map((p, i) => [p, anchos[i]])];
    const alto = size * 1.02, y0 = izq ? H / 2 - (lineas.length - 1) * alto / 2 + size * 0.35 : H * 0.5 + size * 0.35;
    let n = 0;
    lineas.forEach((ln, li) => {
      const total = ln.reduce((a, [, w]) => a + w, 0) + hueco * (ln.length - 1);
      let px = izq ? 150 : W / 2 - total / 2;
      for (const [p, w] of ln) {
        const k = easeOut((s - n * 0.22) / 0.6), a = k * (1 - sale), bl = (1 - k) * 14 + sale * 12;
        if (a > 0.01) { x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none'; sombra(x, T.tono); x.fillStyle = '#fff8f0'; x.fillText(p, px, y0 + li * alto + (1 - k) * 34 - sale * 10); }
        px += w + hueco; n++;
      }
    });
  } else if (T.estilo === 'golpe') {
    // (entra de golpe, grande, con dos copias de rastro y unas franjas desplazadas los primeros fotogramas)
    const entra = easeOutExpo(s / 0.2), sale = cl((s - (d - 0.2)) / 0.2);
    const esc = lerp(1.42, 1, entra) * (1 + s * 0.03) * (1 + sale * 0.14), a = cl(s / 0.04) * (1 - sale);
    const txt = T.t.toUpperCase(), bl = (1 - entra) * 16 + sale * 14;
    txtX.clearRect(0, 0, W, H); txtX.save();
    txtX.translate(W / 2, H / 2); txtX.scale(esc, esc); txtX.textAlign = 'center'; txtX.font = `400 250px ${DISP}`; txtX.letterSpacing = '6px';
    if (entra < 1) for (const [o, al] of [[0.18, 0.18], [0.09, 0.3]]) { txtX.globalAlpha = al * (1 - entra); txtX.save(); txtX.scale(1 + o, 1 + o); txtX.fillStyle = '#ffd6f0'; txtX.fillText(txt, 0, 88); txtX.restore(); }
    txtX.globalAlpha = 1; txtX.shadowColor = 'rgba(255,122,200,0.55)'; txtX.shadowBlur = 40; txtX.fillStyle = '#fff'; txtX.fillText(txt, 0, 88);
    txtX.restore();
    x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
    if (s < 0.16) {
      // (la interferencia: la palabra cortada en franjas que se desplazan, y desaparece en cuanto se asienta)
      const n = 9, hh = 300 / n, y0 = H / 2 - 170;
      for (let i = 0; i < n; i++) { const off = Math.round(ruido(s * 3 + i, i) * 60 * (1 - s / 0.16)); x.drawImage(txtC, 0, y0 + i * hh, W, hh, off, y0 + i * hh, W, hh); }
      x.drawImage(txtC, 0, 0, W, y0, 0, 0, W, y0); x.drawImage(txtC, 0, y0 + 300, W, H - y0 - 300, 0, y0 + 300, W, H - y0 - 300);
    } else x.drawImage(txtC, 0, 0);
    // (la línea pequeña de encima, en dorado)
    if (T.sobre) {
      const k = easeOut((s - 0.18) / 0.35) * (1 - sale);
      if (k > 0.01) { x.filter = 'none'; x.globalAlpha = k; x.textAlign = 'center'; x.font = `600 30px ${TXT}`; x.letterSpacing = '9px'; x.shadowColor = 'rgba(10,2,30,0.85)'; x.shadowBlur = 14; x.fillStyle = '#ffd36a'; x.fillText(T.sobre.toUpperCase(), W / 2, H / 2 - 150 + (1 - k) * 12); }
    }
  } else if (T.estilo === 'palabras') {
    const pal = T.t.toUpperCase().split(' '), size = 120, sale = cl((s - (d - 0.3)) / 0.3);
    x.font = `400 ${size}px ${DISP}`; x.letterSpacing = '6px';
    const anchos = pal.map(p => x.measureText(p).width), hueco = 56, total = anchos.reduce((a, b) => a + b, 0) + hueco * (pal.length - 1);
    let px = W / 2 - total / 2;
    pal.forEach((p, i) => {
      const k = easeOutExpo((s - i * T.cada) / 0.3), a = k * (1 - sale), bl = (1 - k) * 12 + sale * 10;
      if (a > 0.01) { x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none'; sombra(x); x.fillStyle = '#fff8f0'; x.save(); x.translate(px + anchos[i] / 2, H / 2 + 44); x.scale(lerp(1.3, 1, k), lerp(1.3, 1, k)); x.fillText(p, -anchos[i] / 2, 0); x.restore(); }
      px += anchos[i] + hueco;
    });
  }
  x.restore();
}
function euskera(x, E, t) {
  const s = t - E.a, d = E.b - E.a;
  if (s < 0 || s > d) return;
  const a = ease(s / 0.3) * (1 - ease((s - (d - 0.3)) / 0.3)), px = E.x * W, py = E.y * H - s * 10;
  x.save(); x.globalAlpha = a; x.textAlign = 'center';
  x.filter = a < 0.98 ? `blur(${((1 - a) * 6).toFixed(1)}px)` : 'none';
  x.font = `400 76px ${DISP}`; x.letterSpacing = '3px'; x.shadowColor = 'rgba(255,60,30,0.35)'; x.shadowBlur = 24; x.fillStyle = '#fff';
  x.fillText(E.eu, px, py);
  x.font = `600 24px ${TXT}`; x.letterSpacing = '6px'; x.fillStyle = '#ffd36a';
  x.fillText(E.es.toUpperCase(), px, py + 46);
  x.restore();
}
function rotulo(x, T, t) {
  const s = t - T.a, d = T.b - T.a, a = ease((s - 0.15) / 0.3) * (1 - ease((s - (d - 0.3)) / 0.25));
  if (a <= 0) return;
  const [arriba, nombre] = T.rotulo, px = 112, py = H - 118 + (1 - a) * 12;
  x.save(); x.globalAlpha = a; x.shadowColor = 'rgba(10,4,24,0.75)'; x.shadowBlur = 14;
  x.save(); x.translate(px - 30, py - 40); x.rotate(Math.PI / 4); x.fillStyle = '#ff7ac8'; x.fillRect(-6, -6, 12, 12); x.restore();
  x.font = `600 22px ${TXT}`; x.letterSpacing = '5px'; x.fillStyle = '#ffd36a'; x.fillText(arriba.toUpperCase(), px, py - 32);
  x.font = `400 54px ${DISP}`; x.letterSpacing = '1px'; x.fillStyle = '#fff'; x.fillText(nombre, px, py + 22);
  x.restore();
}
// ---------- los avisos del juego ----------
// (una tarjeta oscura con esquinas de 8 px y filo de neón de 1 px, el icono en su cuadrado, la línea dorada y el título;
// entra desde la izquierda y una luz le recorre el borde, como las tarjetas del juego)
function redondo(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function aviso(x, A, t) {
  const s = t - A.a, d = A.b - A.a;
  if (s < 0 || s > d) return;
  const e = easeOutExpo(s / 0.35), sale = ease((s - (d - 0.3)) / 0.3), a = cl(s / 0.12) * (1 - sale);
  x.save(); x.font = `400 44px ${DISP}`; x.letterSpacing = '1px';
  const tw = x.measureText(A.t).width, w = Math.max(520, tw + 176), h = 124, X = 92 - (1 - e) * 60 - sale * 30, Y = 92;
  x.globalAlpha = a;
  x.shadowColor = 'rgba(8,2,20,0.6)'; x.shadowBlur = 30; x.shadowOffsetY = 10;
  redondo(x, X, Y, w, h, 8); x.fillStyle = 'rgba(16,7,34,0.86)'; x.fill();
  x.shadowColor = 'transparent'; x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,122,200,0.75)'; x.stroke();
  // (la luz que recorre el borde al entrar)
  const lz = cl((s - 0.1) / 0.7);
  if (lz > 0 && lz < 1) { x.save(); redondo(x, X, Y, w, h, 8); x.clip(); const gx = X + lz * (w + 300) - 150, g = x.createLinearGradient(gx - 150, 0, gx + 150, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,230,250,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(X, Y, w, h); x.restore(); }
  // el icono
  const ix = X + 22, iy = Y + 22, is = 80, pop = easeOutExpo((s - 0.12) / 0.3);
  x.save(); x.translate(ix + is / 2, iy + is / 2); x.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
  const gi = x.createLinearGradient(-is / 2, -is / 2, is / 2, is / 2);
  if (A.tipo === 'hecha') { gi.addColorStop(0, '#7dffb0'); gi.addColorStop(1, '#1fa864'); } else if (A.tipo === 'insignia') { gi.addColorStop(0, '#ffe39a'); gi.addColorStop(1, '#e09a1e'); } else { gi.addColorStop(0, '#ff9ad6'); gi.addColorStop(1, '#a24bff'); }
  redondo(x, -is / 2, -is / 2, is, is, 8); x.fillStyle = gi; x.fill();
  x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
  if (A.tipo === 'hecha') { x.beginPath(); x.moveTo(-18, 1); x.lineTo(-5, 14); x.lineTo(19, -12); x.stroke(); }
  else if (A.tipo === 'insignia') { x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 25, an = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(an) * r, Math.sin(an) * r); } x.closePath(); x.fill(); }
  else { x.fillRect(-4, -22, 8, 28); x.beginPath(); x.arc(0, 16, 5, 0, Math.PI * 2); x.fill(); }
  x.restore();
  // los textos
  const tx = X + 22 + is + 26;
  x.font = `600 22px ${TXT}`; x.letterSpacing = '5px'; x.fillStyle = A.tipo === 'hecha' ? '#8dffbe' : '#ffd36a'; x.fillText(A.sobre.toUpperCase(), tx, Y + 50);
  x.font = `400 44px ${DISP}`; x.letterSpacing = '1px'; x.fillStyle = '#fff'; x.fillText(A.t, tx, Y + 96);
  x.restore();
}

// ---------- las bandas de cine de la intro ----------
function bandas(x, t) {
  const h0 = Math.round(H * 0.115), k = t < DROP ? 1 : 1 - easeOutExpo((t - DROP) / 0.28);
  if (k <= 0) return;
  const h = Math.round(h0 * k); x.fillStyle = '#000'; x.fillRect(0, 0, W, h); x.fillRect(0, H - h, W, h);
}

// ---------- el final: logo con humo y luz (el de montaje.js) ----------
const humo = [];
const [rayC, rayX] = capa(1800, 1800);
(() => {
  for (const color of ['255,170,220', '190,160,255', '255,214,170']) {
    const [c, g] = capa(512, 512);
    for (let i = 0; i < 46; i++) { const x = 256 + (rnd() - 0.5) * 300, y = 256 + (rnd() - 0.5) * 200, r = 40 + rnd() * 110, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${color},${0.1 + rnd() * 0.12})`); gr.addColorStop(1, `rgba(${color},0)`); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
    humo.push(c);
  }
  rayX.translate(900, 900);
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2 + rnd() * 0.05, w = 0.008 + rnd() * 0.03, Lr = 500 + rnd() * 400; const g = rayX.createRadialGradient(0, 0, 0, 0, 0, Lr); g.addColorStop(0, `rgba(255,236,200,${0.25 + rnd() * 0.5})`); g.addColorStop(1, 'rgba(255,236,200,0)'); rayX.fillStyle = g; rayX.beginPath(); rayX.moveTo(0, 0); rayX.arc(0, 0, Lr, a - w, a + w); rayX.closePath(); rayX.fill(); }
})();
const BOCANADAS = Array.from({ length: 16 }, (_, i) => ({ x: W / 2 + (rnd() - 0.5) * 1500, y: H * 0.45 + (rnd() - 0.5) * 360, s: 1.4 + rnd() * 1.8, vx: (rnd() - 0.5) * 50, vy: -10 - rnd() * 22, r: rnd() * 6, vr: (rnd() - 0.5) * 0.25, c: i % 3, a: 0.5 + rnd() * 0.5 }));
function logo(x, t0, t) {
  const s = t - t0;
  if (s >= 0) { x.save(); x.globalAlpha = 0.66 * ease(s / 0.5); x.fillStyle = '#100820'; x.fillRect(0, 0, W, H); x.restore(); }
  if (s < -0.2) return;
  const k = easeOutExpo(s / 0.5), a = cl(s / 0.12), esc = lerp(1.2, 1, k), bl = (1 - k) * 16, cy = H * 0.44;
  x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.12 * a * (0.85 + 0.15 * Math.sin(s * 2));
  x.translate(W / 2, cy); x.scale(1, 0.42); x.rotate(s * 0.05); x.drawImage(rayC, -900, -900); x.restore();
  x.save(); x.globalCompositeOperation = 'screen';
  for (const b of BOCANADAS) { const sz = 512 * b.s * (1 + s * 0.08), bx = b.x + b.vx * (s + 0.5), by = b.y + b.vy * (s + 0.5); x.globalAlpha = b.a * ease((s + 0.2) / 0.9) * 0.13; x.save(); x.translate(bx, by); x.rotate(b.r + b.vr * s); x.drawImage(humo[b.c], -sz / 2, -sz / 2, sz, sz); x.restore(); }
  x.restore();
  x.save(); x.translate(W / 2 + (s < 0.25 ? ruido(s, 3) * 14 * (1 - s / 0.25) : 0), cy); x.scale(esc, esc); x.textAlign = 'center';
  x.font = `400 250px ${DISP}`; x.letterSpacing = '5px';
  x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
  x.shadowColor = 'rgba(255,122,200,0.6)'; x.shadowBlur = 70; x.fillStyle = '#6d3b5c'; x.fillText('HERRIZHERRI', 0, 104);
  x.shadowColor = 'rgba(20,6,40,0.6)'; x.shadowBlur = 24; x.fillStyle = '#fff'; x.fillText('HERRIZHERRI', 0, 92);
  x.restore();
  const br = (s - 0.35) / 1.1;
  if (br > 0 && br < 1) {
    tmpX.clearRect(0, 0, W, H); tmpX.save(); tmpX.translate(W / 2, cy); tmpX.textAlign = 'center'; tmpX.font = `400 250px ${DISP}`; tmpX.letterSpacing = '5px'; tmpX.fillStyle = '#fff'; tmpX.fillText('HERRIZHERRI', 0, 92); tmpX.restore();
    tmpX.globalCompositeOperation = 'source-in'; const bx = lerp(-300, W + 300, br), g = tmpX.createLinearGradient(bx - 220, 0, bx + 220, 0);
    g.addColorStop(0, 'rgba(255,227,154,0)'); g.addColorStop(0.45, 'rgba(255,227,154,1)'); g.addColorStop(0.5, 'rgba(255,251,232,1)'); g.addColorStop(0.55, 'rgba(255,227,154,1)'); g.addColorStop(1, 'rgba(255,227,154,0)');
    tmpX.fillStyle = g; tmpX.fillRect(0, 0, W, H); tmpX.globalCompositeOperation = 'source-over';
    x.drawImage(tmpC, 0, 0);
  }
  const fl = Math.exp(-s * 3.2) * a;
  if (fl > 0.02) { x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = fl; const g = x.createRadialGradient(W / 2, cy, 0, W / 2, cy, 900); g.addColorStop(0, 'rgba(255,240,250,0.95)'); g.addColorStop(0.25, 'rgba(255,150,220,0.4)'); g.addColorStop(1, 'rgba(160,120,255,0)'); x.translate(0, cy); x.scale(1, 0.08); x.translate(0, -cy); x.fillStyle = g; x.fillRect(0, cy - 900, W, 1800); x.restore(); }
  const y1 = ease((s - 1.0) / 0.6), y2 = ease((s - 1.5) / 0.6);
  x.save(); x.textAlign = 'center'; x.shadowColor = 'rgba(10,2,30,0.85)'; x.shadowBlur = 16;
  if (y1 > 0) { x.globalAlpha = y1; x.font = `400 64px ${DISP}`; x.letterSpacing = '8px'; x.fillStyle = '#ffd36a'; x.fillText('YA PUEDES JUGAR.', W / 2, cy + 230 + (1 - y1) * 16); }
  if (y2 > 0) { x.globalAlpha = y2 * 0.92; x.font = `600 30px ${TXT}`; x.letterSpacing = '3px'; x.fillStyle = '#f1e8ff'; x.fillText(URL_JUEGO, W / 2, cy + 300 + (1 - y2) * 12); }
  x.restore();
}

// ---------- un fotograma ----------
const tomaEn = (t) => TOMAS.find(T => t >= T.a && t < T.b) || TOMAS[TOMAS.length - 1];
export async function cuadro(i) {
  const t = i / FPS, T = tomaEn(t), k = TOMAS.indexOf(T);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const [tipo, d] = T.entra || [];
  const e = d ? cl((t - T.a) / d) : 1;
  if (tipo === 'barre' && e < 1 && k > 0) {
    // (el barrido: la toma de antes sale por la izquierda y la nueva entra por la derecha, con estela)
    const ee = easeOutExpo(e), P = TOMAS[k - 1];
    for (const [o, al] of [[0, 1], [70, 0.35], [140, 0.2]]) {
      prevX.globalAlpha = 1; prevX.fillStyle = '#000'; prevX.fillRect(0, 0, W, H); await toma(prevX, P, t, -ee * W * 0.6 - o * (1 - e)); ctx.globalAlpha = al * (1 - e * 0.5); ctx.drawImage(prevC, 0, 0);
      tmpX.globalAlpha = 1; tmpX.fillStyle = '#000'; tmpX.fillRect(0, 0, W, H); await toma(tmpX, T, t, (1 - ee) * W * 0.6 + o * (1 - e)); ctx.globalAlpha = al * Math.min(1, e * 2.5); ctx.drawImage(tmpC, 0, 0);
    }
    ctx.globalAlpha = 1;
  } else {
    await toma(ctx, T, t);
    if (tipo && e < 1) {
      if (tipo === 'funde' && k > 0) { prevX.globalAlpha = 1; prevX.fillStyle = '#000'; prevX.fillRect(0, 0, W, H); await toma(prevX, TOMAS[k - 1], t); ctx.save(); ctx.globalAlpha = 1 - ease(e); ctx.drawImage(prevC, 0, 0); ctx.restore(); }
      else if (tipo === 'negro') { ctx.save(); ctx.globalAlpha = 1 - ease(e); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      else if (tipo === 'blanco') { ctx.save(); ctx.globalAlpha = 1 - easeOut(e); ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  }
  if (T.sale) { const [, sd] = T.sale, se = cl((t - (T.b - sd)) / sd); if (se > 0) { ctx.save(); ctx.globalAlpha = ease(se); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  if (T.golpe) { const g = t - T.a; if (g < 0.4) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.exp(-g * 9) * 0.55; ctx.fillStyle = T.golpe; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  // (la aberración de color en los impactos y en los cortes del remate)
  const F = fuerza(t); aberracion(F * 16 + (T.a >= B(22) && T.a < B(23) ? 6 : 0));
  if (T.rotulo) rotulo(ctx, T, t);
  for (const X of TEXTOS) texto(ctx, X, t);
  for (const E of EUSKERA) euskera(ctx, E, t);
  for (const A of AVISOS) aviso(ctx, A, t);
  if (T.logo) logo(ctx, T.logo, t);
  for (const [d0, f, dd] of DESTELLOS) { const g = t - d0; if (g >= 0 && g < dd) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = f * Math.pow(1 - g / dd, 2); ctx.fillStyle = '#fff4e6'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  if (t >= A_BLANCO[0] && t < A_BLANCO[1]) { ctx.save(); ctx.globalAlpha = Math.pow((t - A_BLANCO[0]) / (A_BLANCO[1] - A_BLANCO[0]), 2); ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  bandas(ctx, t);
  // (el final se va a negro)
  if (t > DURA - 1.4) { ctx.save(); ctx.globalAlpha = ease((t - (DURA - 1.4)) / 1.2); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  for (let j = 1; j <= 3; j++) { const t2 = (i + j) / FPS, T2 = tomaEn(t2); if (T2.src !== 'negro') carga(urlDe(T2, t2)).catch(() => { }); }
  return cv.toDataURL('image/jpeg', 0.95);
}

export async function prepara(cuantos) {
  CUANTOS = cuantos;
  const fuentes = [new FontFace('MZ Display', 'url(/font/barlow-condensed-latin-800-italic.woff2)', { weight: '400' }), new FontFace('MZ Texto', 'url(/font/barlow-latin-600-normal.woff2)', { weight: '600' })];
  for (const f of fuentes) { await f.load(); document.fonts.add(f); }
  await document.fonts.ready;
  return { tomas: TOMAS.length, fotogramas: Math.round(DURA * FPS) };
}
