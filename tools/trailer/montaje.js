// El montaje del tráiler, dentro de una página: cada fotograma del vídeo (24 por segundo, 1920 × 1080) se compone en un
// lienzo 2D con lo rodado por rodar.mjs, las fotos fijas, el color de cada momento, los textos que se mueven, las palabras
// en euskera, el móvil de la realidad aumentada y el logo con humo y luz. montar.mjs lo carga y pide los fotogramas.
//   /p/<plano>/<n>.jpg  lo rodado · /f/<archivo>  las fotos fijas · /a/<ruta>  src/assets · /font/<archivo>  las letras
export const FPS = 24, W = 1920, H = 1080, DURA = 60;

// la dirección del juego (una capa aparte: cambiarla aquí si cambia el sitio)
export const URL_JUEGO = 'jonathanvilches.github.io/MENDIZMENDI-';

// ---------- las tomas ----------
// a-b: cuándo sale en el vídeo · src: 'p:plano' (rodado) o 'f:archivo' / 'a:ruta' (foto fija) · desde: segundos que se
// salta del plano · luz: el color del momento · entra/sale: fundido ('funde', con la toma anterior), negro o blanco ·
// kb: la foto fija se acerca despacio [zoom inicial, zoom final, x0, y0, x1, y1] (centro en 0-1 de la imagen)
const TOMAS = [
  // 0-8 s: amanecer con niebla en el valle; el pastor sube con su rebaño
  { a: 0, b: 4.6, src: 'p:amanecer', luz: 'alba', entra: ['negro', 1.6] },
  { a: 4.6, b: 8, src: 'p:pastor', luz: 'alba', entra: ['funde', 0.6], sale: ['negro', 0.3] },
  // 8-18 s: la noche en la selva; ojos, criaturas y la huida (cortes en los golpes de metal)
  { a: 8, b: 10.5, src: 'p:ojos', luz: 'noche', entra: ['negro', 0.35] },
  { a: 10.5, b: 12.3, src: 'p:basajaun', luz: 'noche', golpe: '#b6ff9a' },
  { a: 12.3, b: 13.8, src: 'p:lamia', luz: 'noche', golpe: '#9ff3ff' },
  { a: 13.8, b: 15.3, src: 'p:momotxorro', luz: 'noche', golpe: '#ff9a6a' },
  { a: 15.3, b: 18, src: 'p:huida', luz: 'noche', golpe: '#c9b8ff' },
  // 18-35 s: el montaje, al pulso de la música (120: un corte cada medio segundo o cada segundo)
  { a: 18, b: 19.5, src: 'p:plaza', luz: 'dia', entra: ['blanco', 0.5] },
  { a: 19.5, b: 20.5, src: 'p:fauna', luz: 'dia' },
  { a: 20.5, b: 21.5, src: 'p:flores', luz: 'dia' },
  { a: 21.5, b: 23.5, src: 'p:pelota', luz: 'dia', entra: ['blanco', 0.25] },
  { a: 23.5, b: 24.5, src: 'f:dio-aizkora.png', luz: 'dia', kb: [1.45, 1.7, 0.475, 0.5, 0.475, 0.47] },
  { a: 24.5, b: 25.5, src: 'f:dio-harri.png', luz: 'dia', kb: [1.75, 1.5, 0.48, 0.56, 0.48, 0.54] },
  { a: 25.5, b: 26.5, src: 'f:dio-fragua.png', luz: 'dia', kb: [1.45, 1.7, 0.5, 0.45, 0.5, 0.42] },
  { a: 26.5, b: 28, src: 'p:mercado', luz: 'dia', entra: ['blanco', 0.25] },
  { a: 28, b: 29, src: 'f:menu-instrumentos.png', luz: 'menu', kb: [1.5, 1.65, 0.46, 0.46, 0.54, 0.46] },
  { a: 29, b: 30, src: 'f:menu-avatars.png', luz: 'menu', kb: [1.0, 1.1, 0.5, 0.5, 0.42, 0.52] },
  { a: 30, b: 31, src: 'a:personajes/2560/blanca.webp', luz: 'ilus', kb: [1.0, 1.1, 0.5, 0.42, 0.5, 0.4], rotulo: ['Mujeres de Navarra', 'Blanca I de Navarra'] },
  { a: 31, b: 32, src: 'a:personajes/2560/julia.webp', luz: 'ilus', kb: [1.1, 1.0, 0.5, 0.4, 0.5, 0.42], rotulo: ['Mujeres de Navarra', 'Julia Álvarez Resano'] },
  { a: 32, b: 35, src: 'p:subida', luz: 'ocaso' },
  // 35-48 s: Olite y Javier al atardecer, y el móvil con la realidad aumentada
  { a: 35, b: 40, src: 'p:olite', luz: 'ocaso', entra: ['blanco', 0.9], rotulo: ['Olite', 'Palacio Real'] },
  { a: 40, b: 44, src: 'p:javier', luz: 'ocaso', entra: ['funde', 0.7], rotulo: ['Javier', 'Castillo de Javier'] },
  { a: 44, b: 48, src: 'p:javierSuelo', luz: 'ocaso', entra: ['funde', 0.4], ra: true },
  // 48-55 s: vecinos, familias y la grada; palabras en euskera
  { a: 48, b: 51.5, src: 'p:vecinos', luz: 'ocaso', entra: ['funde', 0.6] },
  { a: 51.5, b: 55, src: 'p:publico', luz: 'calido', entra: ['funde', 0.35], sale: ['negro', 0.45] },
  // 55-60 s: silencio; el pastor mira el horizonte; el golpe final y el logo
  { a: 55, b: 60, src: 'p:horizonte', luz: 'ocaso', entra: ['negro', 0.9], logo: 57 },
];

// destellos blancos en los golpes de la música (cuándo, cuánto, cuánto dura)
const DESTELLOS = [[18, 0.9, 0.5], [21.5, 0.45, 0.3], [26.5, 0.45, 0.3], [32, 0.3, 0.25], [57, 0.75, 0.6]];
// (el segundo 35: la imagen se va a blanco con la subida de la música y entra el clímax)
const A_BLANCO = [34.45, 35];

// ---------- los textos ----------
// frase: las palabras suben una a una y se abren despacio · golpe: una palabra grande que entra de golpe con el pulso ·
// palabras: van apareciendo en una línea · cierre: bajo el logo
const TEXTOS = [
  { a: 1.9, b: 7.3, t: 'Navarra guarda secretos.', estilo: 'frase', tono: 'alba' },
  { a: 13.0, b: 17.6, t: 'Las leyendas despiertan.', estilo: 'frase', tono: 'noche' },
  { a: 18.0, b: 19.5, t: 'Explora.', estilo: 'golpe' },
  { a: 21.5, b: 23.0, t: 'Juega.', estilo: 'golpe' },
  { a: 26.5, b: 28.0, t: 'Descubre.', estilo: 'golpe' },
  { a: 44.5, b: 47.8, t: 'Aprende jugando.', estilo: 'frase', tono: 'ocaso', lado: 'izq' },
  { a: 51.7, b: 54.6, t: 'Tradición. Cultura. Euskera.', estilo: 'palabras', cada: 0.95 },
];
// palabras en euskera con lo que quieren decir, flotando entre los vecinos
const EUSKERA = [
  { a: 48.25, b: 50.2, eu: 'Kaixo', es: 'hola', x: 0.2, y: 0.3 },
  { a: 49.05, b: 51.0, eu: 'Elkarrekin', es: 'juntos', x: 0.76, y: 0.26 },
  { a: 49.85, b: 51.5, eu: 'Ongi etorri', es: 'bienvenidos', x: 0.34, y: 0.74 },
];

// ---------- utilidades ----------
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const ease = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - cl(x), 3);
const easeOutExpo = (x) => (x = cl(x)) >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const DISP = "'MZ Display', sans-serif", TXT = "'MZ Texto', sans-serif";
let CUANTOS = {};   // fotogramas de cada plano rodado (lo pone montar.mjs)

const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
const ctx = cv.getContext('2d');
const capa = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const [bufC, bufX] = capa(), [tmpC, tmpX] = capa();

// ---------- imágenes: se piden al vuelo y se guardan unas pocas ----------
const cache = new Map();
function carga(url) {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((ok, mal) => { const im = new Image(); im.onload = () => im.decode().then(() => ok(im), () => ok(im)); im.onerror = () => mal(new Error('falta ' + url)); im.src = url; });
    cache.set(url, p);
    if (cache.size > 90) cache.delete(cache.keys().next().value);
  }
  return p;
}
const urlDe = (T, t) => {
  const [k, r] = [T.src.slice(0, 1), T.src.slice(2)];
  if (k === 'p') { const n = CUANTOS[r] || 1, i = cl(Math.round((t - T.a + (T.desde || 0)) * FPS), 0, n - 1); return `/p/${r}/${String(i).padStart(4, '0')}.jpg`; }
  return k === 'f' ? `/f/${r}` : `/a/${r}`;
};

// ---------- el color de cada momento ----------
// filtro de la imagen, un tono por encima (luz suave), un velo de luz desde arriba y el viñeteado
const LUZ = {
  alba: { f: 'saturate(1.06) contrast(1.05)', tono: ['#ffb27a', 0.34], velo: ['#ffe2b8', 0.16], vin: 0.42 },
  noche: { f: 'saturate(0.86) contrast(1.12) brightness(0.94)', tono: ['#4a3ab8', 0.5], mult: ['#3a2f86', 0.16], velo: ['#a9a0ff', 0.06], vin: 0.6 },
  dia: { f: 'saturate(1.12) contrast(1.06)', tono: ['#ffcf80', 0.26], velo: ['#fff0cc', 0.1], vin: 0.34 },
  ocaso: { f: 'saturate(1.12) contrast(1.07)', tono: ['#ff9a52', 0.36], velo: ['#ffc58a', 0.16], vin: 0.46 },
  calido: { f: 'saturate(1.1) contrast(1.06)', tono: ['#ffb066', 0.3], velo: ['#ffd9a8', 0.1], vin: 0.42 },
  menu: { f: 'none', vin: 0.22 },
  ilus: { f: 'saturate(1.04)', tono: ['#ffc890', 0.14], vin: 0.3 },
};
const [vinC, vinX] = capa();
(() => { const g = vinX.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 1.02); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,1)'); vinX.fillStyle = g; vinX.fillRect(0, 0, W, H); })();

function gradua(x, luz) {
  const L = LUZ[luz] || LUZ.dia;
  if (L.tono) { x.globalCompositeOperation = 'soft-light'; x.globalAlpha = L.tono[1]; x.fillStyle = L.tono[0]; x.fillRect(0, 0, W, H); }
  if (L.mult) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = L.mult[1]; x.fillStyle = L.mult[0]; x.fillRect(0, 0, W, H); }
  if (L.velo) { const g = x.createLinearGradient(0, 0, W * 0.3, H * 0.9); g.addColorStop(0, L.velo[0]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'screen'; x.globalAlpha = L.velo[1]; x.fillStyle = g; x.fillRect(0, 0, W, H); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = L.vin; x.drawImage(vinC, 0, 0); x.globalAlpha = 1;
}

// dibuja una toma entera (imagen, movimiento y color) en el lienzo x
async function toma(x, T, t) {
  const im = await carga(urlDe(T, t)), L = LUZ[T.luz] || LUZ.dia;
  x.save(); x.filter = L.f;
  if (T.kb) {
    // (la foto fija se acerca o se aleja; nunca más grande que su tamaño real)
    const [z0, z1, x0, y0, x1, y1] = T.kb, k = ease((t - T.a) / (T.b - T.a)), base = Math.max(W / im.width, H / im.height);
    const z = Math.min(base * lerp(z0, z1, k), 1), w = im.width * z, h = im.height * z;
    const cx = lerp(x0, x1, k) * w, cy = lerp(y0, y1, k) * h;
    x.drawImage(im, cl(W / 2 - cx, W - w, 0), cl(H / 2 - cy, H - h, 0), w, h);
  } else x.drawImage(im, 0, 0, W, H);
  x.restore();
  gradua(x, T.luz);
}

// ---------- la realidad aumentada: el móvil delante del castillo con Francisco de Javier en la pantalla ----------
const MOVIL = { x: 1130, y: 96, w: 430, h: 890, r: 64, borde: 14 };
const [raC, raX] = capa();
function redondo(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
async function realidad(x0, T, t) {
  const s = t - T.a, sube = easeOutExpo(s / 0.75), dy = (1 - sube) * 760, d = T.b - T.a;
  if (s < 0) return;
  // (todo en su capa; al final se desvanece entera, y el castillo vuelve a verse nítido)
  const x = raX; x.clearRect(0, 0, W, H);
  // (el mundo de detrás, desenfocado: lo nítido es la pantalla)
  x.save(); x.globalAlpha = ease(s / 0.6); x.filter = 'blur(7px) brightness(0.72) saturate(0.95)'; x.drawImage(bufC, 0, 0); x.restore();
  const M = MOVIL, X = M.x, Y = M.y + dy, sx = X + M.borde, sy = Y + M.borde, sw = M.w - M.borde * 2, sh = M.h - M.borde * 2;
  x.save();
  x.shadowColor = 'rgba(10,4,24,0.55)'; x.shadowBlur = 60; x.shadowOffsetY = 24;
  redondo(x, X, Y, M.w, M.h, M.r); x.fillStyle = '#121018'; x.fill();
  x.shadowColor = 'transparent';
  x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,0.16)'; x.stroke();
  // pantalla: lo que ve la cámara del móvil (la misma imagen, nítida y a su tamaño)
  redondo(x, sx, sy, sw, sh, M.r - M.borde); x.clip();
  x.drawImage(bufC, sx, sy - dy, sw, sh, sx, sy, sw, sh);
  x.restore();
  x.save(); redondo(x, sx, sy, sw, sh, M.r - M.borde); x.clip();
  // Francisco de Javier aparece a tamaño de persona, de pie sobre el suelo, con su anillo de luz
  const ap = easeOutExpo((s - 0.65) / 0.7), suelo = sy + sh * 0.8, cx = sx + sw / 2;
  if (s > 0.55) {
    const ar = easeOut((s - 0.55) / 0.6), rw = 150 + ar * 60;
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 2; i++) { x.beginPath(); x.ellipse(cx, suelo, rw - i * 26, (rw - i * 26) * 0.22, 0, 0, Math.PI * 2); x.lineWidth = 4 - i * 1.5; x.strokeStyle = `rgba(255,122,200,${0.9 * ar - i * 0.25})`; x.shadowColor = '#ff7ac8'; x.shadowBlur = 18; x.stroke(); }
    // (la onda que sale al aparecer)
    const on = cl((s - 0.6) / 0.8); if (on < 1) { x.beginPath(); x.ellipse(cx, suelo, 120 + on * 260, (120 + on * 260) * 0.22, 0, 0, Math.PI * 2); x.lineWidth = 3; x.strokeStyle = `rgba(255,214,242,${(1 - on) * 0.8})`; x.stroke(); }
    x.globalCompositeOperation = 'source-over'; x.shadowBlur = 0;
  }
  if (ap > 0) {
    const fig = await carga('/a/personajes/2560/javier.webp');
    const cw = 300 * (0.6 + 0.4 * ap), ch = cw * 1.38, fx = cx - cw / 2, fy = suelo - ch - 14;
    x.globalAlpha = cl(ap * 1.4);
    x.save(); x.shadowColor = 'rgba(255,122,200,0.7)'; x.shadowBlur = 34; redondo(x, fx, fy, cw, ch, 22); x.fillStyle = '#fff'; x.fill(); x.restore();
    x.save(); redondo(x, fx + 6, fy + 6, cw - 12, ch - 12, 17); x.clip();
    // (de la ilustración, solo él: cabeza, hombros y la cruz)
    x.drawImage(fig, 610, 60, 1060, 1463, fx + 6, fy + 6, cw - 12, ch - 12);
    const g = x.createLinearGradient(0, fy + ch * 0.6, 0, fy + ch); g.addColorStop(0, 'rgba(20,10,40,0)'); g.addColorStop(1, 'rgba(20,10,40,0.78)'); x.fillStyle = g; x.fillRect(fx, fy, cw, ch);
    x.restore();
    // (la línea que barre la figura al formarse)
    if (ap < 1) { const ly = fy + ch * (1 - ap); x.fillStyle = 'rgba(255,214,242,0.9)'; x.shadowColor = '#ff7ac8'; x.shadowBlur = 16; x.fillRect(fx - 10, ly, cw + 20, 3); x.shadowBlur = 0; }
    x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `400 40px ${DISP}`; x.shadowColor = 'rgba(10,4,24,0.8)'; x.shadowBlur = 12;
    x.fillText('Francisco de Javier', cx, fy + ch - 46);
    x.fillStyle = '#ffd36a'; x.font = `600 20px ${TXT}`; x.letterSpacing = '4px'; x.fillText('1506 – 1552', cx, fy + ch - 18); x.letterSpacing = '0px';
    x.shadowBlur = 0; x.globalAlpha = 1;
  }
  // el visor: las cuatro esquinas rosas del juego
  const vk = ease((s - 0.4) / 0.4), m = 26, l = 46;
  if (vk > 0) {
    x.globalAlpha = vk; x.strokeStyle = '#ff7ac8'; x.lineWidth = 3; x.shadowColor = '#ff7ac8'; x.shadowBlur = 10;
    for (const [ax, ay, dx, dy2] of [[sx + m, sy + m + 40, 1, 1], [sx + sw - m, sy + m + 40, -1, 1], [sx + m, sy + sh - m, 1, -1], [sx + sw - m, sy + sh - m, -1, -1]]) { x.beginPath(); x.moveTo(ax, ay + dy2 * l); x.lineTo(ax, ay); x.lineTo(ax + dx * l, ay); x.stroke(); }
    x.shadowBlur = 0; x.globalAlpha = 1;
  }
  x.restore();
  // la cámara del móvil: un punto arriba
  x.beginPath(); x.arc(X + M.w / 2, Y + M.borde + 22, 9, 0, Math.PI * 2); x.fillStyle = '#05040a'; x.fill();
  x0.save(); x0.globalAlpha = 1 - ease((s - (d - 0.55)) / 0.5); x0.drawImage(raC, 0, 0); x0.restore();
}

// ---------- textos que se mueven ----------
function sombra(x, tono) {
  x.shadowColor = tono === 'noche' ? 'rgba(150,130,255,0.55)' : tono === 'alba' || tono === 'ocaso' ? 'rgba(255,150,110,0.45)' : 'rgba(255,122,200,0.5)';
  x.shadowBlur = 34;
}
const [veloC, veloX] = capa();
(() => { const g = veloX.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.42); g.addColorStop(0, 'rgba(12,6,24,0.55)'); g.addColorStop(1, 'rgba(12,6,24,0)'); veloX.fillStyle = g; veloX.save(); veloX.translate(0, H / 2); veloX.scale(1, 0.5); veloX.translate(0, -H / 2); veloX.fillRect(0, -H / 2, W, H * 2); veloX.restore(); })();
function texto(x, T, t) {
  const s = t - T.a, d = T.b - T.a;
  if (s < 0 || s > d) return;
  if (T.estilo !== 'golpe') { x.save(); x.globalAlpha = ease(s / 0.6) * (1 - ease((s - (d - 0.6)) / 0.6)) * 0.85; if (T.lado === 'izq') { x.translate(-W * 0.26, 0); } x.drawImage(veloC, 0, 0); x.restore(); }
  x.save(); x.textBaseline = 'alphabetic';
  if (T.estilo === 'frase') {
    const izq = T.lado === 'izq', pal = T.t.toUpperCase().split(' ');
    const size = izq ? 150 : 104, sale = cl((s - (d - 0.6)) / 0.6), abre = s / d;
    x.font = `400 ${size}px ${DISP}`;
    const esp = size * (0.06 + abre * 0.05);   // (las letras se van abriendo despacio)
    x.letterSpacing = esp.toFixed(1) + 'px';
    const anchos = pal.map(p => x.measureText(p).width), hueco = size * 0.32;
    // (de izquierda: una palabra por línea; en el centro: todas en una línea)
    let lineas = izq ? pal.map((p, i) => [[p, anchos[i]]]) : [pal.map((p, i) => [p, anchos[i]])];
    const alto = size * 1.02, y0 = izq ? H / 2 - (lineas.length - 1) * alto / 2 + size * 0.35 : H * 0.5 + size * 0.35;
    let n = 0;
    lineas.forEach((ln, li) => {
      const total = ln.reduce((a, [, w]) => a + w, 0) + hueco * (ln.length - 1);
      let px = izq ? 150 : W / 2 - total / 2;
      for (const [p, w] of ln) {
        const k = easeOut((s - n * 0.28) / 0.7), a = k * (1 - sale), bl = (1 - k) * 14 + sale * 12;
        if (a > 0.01) {
          x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
          sombra(x, T.tono); x.fillStyle = '#fff8f0';
          x.fillText(p, px, y0 + li * alto + (1 - k) * 34 - sale * 10);
        }
        px += w + hueco; n++;
      }
    });
  } else if (T.estilo === 'golpe') {
    const entra = easeOutExpo(s / 0.22), sale = cl((s - (d - 0.22)) / 0.22);
    const esc = lerp(1.38, 1, entra) * (1 + s * 0.025) * (1 + sale * 0.12), a = cl(s / 0.05) * (1 - sale);
    x.translate(W / 2 + (s < 0.16 ? Math.sin(s * 160) * 9 * (1 - s / 0.16) : 0), H / 2);
    x.scale(esc, esc); x.textAlign = 'center';
    x.font = `400 240px ${DISP}`; x.letterSpacing = '6px';
    const txt = T.t.toUpperCase(), bl = (1 - entra) * 18 + sale * 14;
    // (el rastro del golpe: dos copias más tenues detrás)
    if (entra < 1) for (const [o, al] of [[0.16, 0.18], [0.08, 0.3]]) { x.globalAlpha = a * al * (1 - entra); x.save(); x.scale(1 + o, 1 + o); x.fillStyle = '#ffd6f0'; x.fillText(txt, 0, 84); x.restore(); }
    x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
    sombra(x); x.fillStyle = '#fff';
    x.fillText(txt, 0, 84);
  } else if (T.estilo === 'palabras') {
    const pal = T.t.toUpperCase().split(' '), size = 100, sale = cl((s - (d - 0.5)) / 0.5);
    x.font = `400 ${size}px ${DISP}`; x.letterSpacing = '5px';
    const anchos = pal.map(p => x.measureText(p).width), hueco = 52, total = anchos.reduce((a, b) => a + b, 0) + hueco * (pal.length - 1);
    let px = W / 2 - total / 2;
    pal.forEach((p, i) => {
      const k = easeOut((s - i * T.cada) / 0.55), a = k * (1 - sale), bl = (1 - k) * 12 + sale * 10;
      if (a > 0.01) { x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none'; sombra(x, 'ocaso'); x.fillStyle = '#fff8f0'; x.fillText(p, px, H / 2 + 40 + (1 - k) * 26); }
      px += anchos[i] + hueco;
    });
  }
  x.restore();
}
function euskera(x, E, t) {
  const s = t - E.a, d = E.b - E.a;
  if (s < 0 || s > d) return;
  const a = ease(s / 0.5) * (1 - ease((s - (d - 0.5)) / 0.5)), sube = s * 14, px = E.x * W, py = E.y * H - sube;
  x.save(); x.globalAlpha = a; x.textAlign = 'center';
  x.filter = a < 0.98 ? `blur(${((1 - a) * 6).toFixed(1)}px)` : 'none';
  x.font = `400 88px ${DISP}`; x.letterSpacing = '2px'; x.shadowColor = 'rgba(20,8,40,0.6)'; x.shadowBlur = 24; x.fillStyle = '#fff';
  x.fillText(E.eu, px, py);
  x.font = `600 24px ${TXT}`; x.letterSpacing = '5px'; x.fillStyle = '#ffd36a';
  x.fillText(E.es.toUpperCase(), px, py + 44);
  x.restore();
}
// rótulo pequeño abajo a la izquierda (sitio o persona)
function rotulo(x, T, t) {
  const s = t - T.a, d = T.b - T.a, a = ease((s - 0.2) / 0.35) * (1 - ease((s - (d - 0.35)) / 0.3));
  if (a <= 0) return;
  const [arriba, nombre] = T.rotulo, px = 112, py = H - 118 + (1 - a) * 12;
  x.save(); x.globalAlpha = a; x.shadowColor = 'rgba(10,4,24,0.75)'; x.shadowBlur = 14;
  x.save(); x.translate(px - 30, py - 40); x.rotate(Math.PI / 4); x.fillStyle = '#ff7ac8'; x.fillRect(-6, -6, 12, 12); x.restore();
  x.font = `600 22px ${TXT}`; x.letterSpacing = '5px'; x.fillStyle = '#ffd36a'; x.fillText(arriba.toUpperCase(), px, py - 32);
  x.font = `400 54px ${DISP}`; x.letterSpacing = '1px'; x.fillStyle = '#fff'; x.fillText(nombre, px, py + 22);
  x.restore();
}

// ---------- el final: logo con humo y luz ----------
const humo = [];
const [rayC, rayX] = capa(1800, 1800);
(() => {
  // el humo: manchas suaves y desiguales, en rosa y en violeta
  for (const color of ['255,170,220', '190,160,255', '255,214,170']) {
    const [c, g] = capa(512, 512);
    for (let i = 0; i < 46; i++) {
      const x = 256 + (rnd() - 0.5) * 300, y = 256 + (rnd() - 0.5) * 200, r = 40 + rnd() * 110, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${color},${0.1 + rnd() * 0.12})`); gr.addColorStop(1, `rgba(${color},0)`); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    }
    humo.push(c);
  }
  // los rayos de luz detrás del logo
  rayX.translate(900, 900);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + rnd() * 0.05, w = 0.008 + rnd() * 0.03, L = 500 + rnd() * 400;
    const g = rayX.createRadialGradient(0, 0, 0, 0, 0, L); g.addColorStop(0, `rgba(255,236,200,${0.25 + rnd() * 0.5})`); g.addColorStop(1, 'rgba(255,236,200,0)');
    rayX.fillStyle = g; rayX.beginPath(); rayX.moveTo(0, 0); rayX.arc(0, 0, L, a - w, a + w); rayX.closePath(); rayX.fill();
  }
})();
const BOCANADAS = Array.from({ length: 16 }, (_, i) => ({ x: W / 2 + (rnd() - 0.5) * 1500, y: H * 0.45 + (rnd() - 0.5) * 360, s: 1.4 + rnd() * 1.8, vx: (rnd() - 0.5) * 50, vy: -10 - rnd() * 22, r: rnd() * 6, vr: (rnd() - 0.5) * 0.25, c: i % 3, a: 0.5 + rnd() * 0.5 }));
function logo(x, t0, t) {
  const s = t - t0;
  // (antes del golpe, el horizonte en silencio; después, la imagen se oscurece para el logo)
  const os = ease(s / 0.5);
  if (s >= 0) { x.save(); x.globalAlpha = 0.72 * os; x.fillStyle = '#100820'; x.fillRect(0, 0, W, H); x.restore(); }
  if (s < -0.2) return;
  const k = easeOutExpo(s / 0.55), a = cl(s / 0.16), esc = lerp(1.16, 1, k), bl = (1 - k) * 16;
  const cy = H * 0.44;
  // rayos, girando muy despacio
  x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.12 * a * (0.85 + 0.15 * Math.sin(s * 2));
  x.translate(W / 2, cy); x.scale(1, 0.42); x.rotate(s * 0.05); x.drawImage(rayC, -900, -900); x.restore();
  // el humo, saliendo despacio
  x.save(); x.globalCompositeOperation = 'screen';
  for (const b of BOCANADAS) {
    const sz = 512 * b.s * (1 + s * 0.08), bx = b.x + b.vx * (s + 0.5), by = b.y + b.vy * (s + 0.5);
    x.globalAlpha = b.a * ease((s + 0.2) / 0.9) * 0.13;
    x.save(); x.translate(bx, by); x.rotate(b.r + b.vr * s); x.drawImage(humo[b.c], -sz / 2, -sz / 2, sz, sz); x.restore();
  }
  x.restore();
  // el nombre: blanco con el borde rosa oscuro y el brillo rosa del juego
  x.save(); x.translate(W / 2, cy); x.scale(esc, esc); x.textAlign = 'center';
  x.font = `400 250px ${DISP}`; x.letterSpacing = '5px';
  x.globalAlpha = a; x.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
  x.shadowColor = 'rgba(255,122,200,0.6)'; x.shadowBlur = 70; x.fillStyle = '#6d3b5c'; x.fillText('HERRIZHERRI', 0, 92 + 12);
  x.shadowColor = 'rgba(20,6,40,0.6)'; x.shadowBlur = 24; x.fillStyle = '#fff'; x.fillText('HERRIZHERRI', 0, 92);
  x.restore();
  // la franja dorada que cruza las letras (como en la entrada del juego)
  const br = (s - 0.35) / 1.1;
  if (br > 0 && br < 1) {
    tmpX.clearRect(0, 0, W, H); tmpX.save(); tmpX.translate(W / 2, cy); tmpX.textAlign = 'center'; tmpX.font = `400 250px ${DISP}`; tmpX.letterSpacing = '5px'; tmpX.fillStyle = '#fff'; tmpX.fillText('HERRIZHERRI', 0, 92); tmpX.restore();
    tmpX.globalCompositeOperation = 'source-in'; const bx = lerp(-300, W + 300, br), g = tmpX.createLinearGradient(bx - 220, 0, bx + 220, 0);
    g.addColorStop(0, 'rgba(255,227,154,0)'); g.addColorStop(0.45, 'rgba(255,227,154,1)'); g.addColorStop(0.5, 'rgba(255,251,232,1)'); g.addColorStop(0.55, 'rgba(255,227,154,1)'); g.addColorStop(1, 'rgba(255,227,154,0)');
    tmpX.fillStyle = g; tmpX.fillRect(0, 0, W, H); tmpX.globalCompositeOperation = 'source-over';
    x.drawImage(tmpC, 0, 0);
  }
  // el destello alargado del golpe
  const fl = Math.exp(-s * 3.2) * a;
  if (fl > 0.02) {
    x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = fl;
    const g = x.createRadialGradient(W / 2, cy, 0, W / 2, cy, 900); g.addColorStop(0, 'rgba(255,240,250,0.95)'); g.addColorStop(0.25, 'rgba(255,150,220,0.4)'); g.addColorStop(1, 'rgba(160,120,255,0)');
    x.translate(0, cy); x.scale(1, 0.08); x.translate(0, -cy); x.fillStyle = g; x.fillRect(0, cy - 900, W, 1800); x.restore();
  }
  // «Ya puedes jugar.» y la dirección
  const y1 = ease((s - 1.1) / 0.6), y2 = ease((s - 1.6) / 0.6);
  x.save(); x.textAlign = 'center'; x.shadowColor = 'rgba(10,2,30,0.85)'; x.shadowBlur = 16;
  if (y1 > 0) { x.globalAlpha = y1; x.font = `400 64px ${DISP}`; x.letterSpacing = '8px'; x.fillStyle = '#ffd36a'; x.fillText('YA PUEDES JUGAR.', W / 2, cy + 230 + (1 - y1) * 16); }
  if (y2 > 0) { x.globalAlpha = y2 * 0.92; x.font = `600 30px ${TXT}`; x.letterSpacing = '3px'; x.fillStyle = '#f1e8ff'; x.fillText(URL_JUEGO, W / 2, cy + 300 + (1 - y2) * 12); }
  x.restore();
}

// ---------- un fotograma ----------
const tomaEn = (t) => TOMAS.find(T => t >= T.a && t < T.b) || TOMAS[TOMAS.length - 1];
export async function cuadro(i) {
  const t = i / FPS, T = tomaEn(t), k = TOMAS.indexOf(T);
  // lo de detrás en bufC (sin textos), por si hace falta para el móvil o el fundido
  bufX.globalAlpha = 1; bufX.fillStyle = '#000'; bufX.fillRect(0, 0, W, H);
  if (T.ra) await toma(bufX, T, t);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  await toma(ctx, T, t);
  // entradas: fundido con la anterior, desde negro o desde blanco
  if (T.entra) {
    const [tipo, d] = T.entra, e = cl((t - T.a) / d);
    if (e < 1) {
      if (tipo === 'funde' && k > 0) {
        const [c2, x2] = [tmpC, tmpX]; x2.globalAlpha = 1; x2.filter = 'none'; x2.fillStyle = '#000'; x2.fillRect(0, 0, W, H);
        await toma(x2, TOMAS[k - 1], t);
        ctx.save(); ctx.globalAlpha = 1 - ease(e); ctx.drawImage(c2, 0, 0); ctx.restore();
      } else if (tipo === 'negro') { ctx.save(); ctx.globalAlpha = 1 - ease(e); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      else if (tipo === 'blanco') { ctx.save(); ctx.globalAlpha = 1 - easeOut(e); ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  }
  if (T.sale) { const [, d] = T.sale, e = cl((t - (T.b - d)) / d); if (e > 0) { ctx.save(); ctx.globalAlpha = ease(e); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  // la criatura aparece con un chispazo de su color
  if (T.ra) await realidad(ctx, T, t);
  if (T.golpe) { const e = t - T.a; if (e < 0.4) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.exp(-e * 9) * 0.55; ctx.fillStyle = T.golpe; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  // rótulos, textos y palabras
  if (T.rotulo) rotulo(ctx, T, t);
  for (const X of TEXTOS) texto(ctx, X, t);
  for (const E of EUSKERA) euskera(ctx, E, t);
  if (T.logo) logo(ctx, T.logo, t);
  // destellos y el blanco del clímax
  for (const [d0, f, dd] of DESTELLOS) { const e = t - d0; if (e >= 0 && e < dd) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = f * Math.pow(1 - e / dd, 2); ctx.fillStyle = '#fff4e6'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  if (t >= A_BLANCO[0] && t < A_BLANCO[1]) { ctx.save(); ctx.globalAlpha = Math.pow((t - A_BLANCO[0]) / (A_BLANCO[1] - A_BLANCO[0]), 2.2); ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // (pide ya las imágenes de los fotogramas que vienen)
  for (let j = 1; j <= 3; j++) { const t2 = (i + j) / FPS, T2 = tomaEn(t2); carga(urlDe(T2, t2)).catch(() => { }); }
  return cv.toDataURL('image/jpeg', 0.95);
}

export async function prepara(cuantos) {
  CUANTOS = cuantos;
  const fuentes = [new FontFace('MZ Display', 'url(/font/barlow-condensed-latin-800-italic.woff2)', { weight: '400' }), new FontFace('MZ Texto', 'url(/font/barlow-latin-600-normal.woff2)', { weight: '600' })];
  for (const f of fuentes) { await f.load(); document.fonts.add(f); }
  await document.fonts.ready;
  return { tomas: TOMAS.length, fotogramas: DURA * FPS };
}
