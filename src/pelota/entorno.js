// Lo que rodea a cada frontón de pueblo, para que no haya dos iguales (el estilo de cada pueblo lo elige
// src/game/fronton.js):
//  · plaza: el de siempre, en la plaza, con su grada de tres escalones a lo largo de la contracancha
//  · iglesia: detrás del frontis, la iglesia con su torre de campanas, como el de la plaza mayor de Etxalar, junto a la
//    iglesia de la Asunción
//  · consistorio: detrás del frontis, la casa consistorial con su espadaña y su reloj, como el de la plaza del
//    ayuntamiento de Leitza
//  · calle: un frontón en la calle, como se jugaba antes de que hubiera frontones: la pared izquierda es la fila de casas
//    con sus ventanas y, enfrente, en vez de grada, otra fila de casas con la gente en los balcones y de pie en la acera
// Son recreaciones con el estilo de cada comarca, no copias de un edificio concreto.
import { COURT } from './rules.js';
import { canvasTex, grain, weather, ashlar, boxesGeo } from './court.js';

const W = COURT.W;
// lo que ocupa cada estilo más allá de la cancha y la grada (para buscarle sitio en el pueblo sin pisar casas)
const CALLE_ACERA = 1.5, CALLE_FONDO = 6, IZQ_FONDO = 5;
export function entornoExtent(estilo, CONTRA = 2.6) {
  const E = { x0: -W / 2 - 0.6, x1: W / 2 + CONTRA + 3.3, z0: -0.8, z1: COURT.L + 3 + 0.4 };
  if (estilo === 'iglesia') { E.x0 = -W / 2 - 6.4; E.z0 = -13; }   // (la torre, a la izquierda o, a la derecha, dentro de la huella de la grada)
  else if (estilo === 'consistorio') E.z0 = -10.8;
  else if (estilo === 'calle') { E.x0 = -W / 2 - 0.6 - IZQ_FONDO; E.x1 = W / 2 + CONTRA + CALLE_ACERA + CALLE_FONDO; }
  return E;
}

// fachadas de casas pintadas a lo largo de una pared (Lm × Hm metros): cada casa de su color, con zócalo de piedra,
// ventanas con sus contraventanas abiertas y, abajo, rejas y puertas. raya: la altura de la raya roja de la pared (la
// de la pared izquierda del frontón en la calle), o nada
const CASA_COL = ['#efe7d6', '#e9d9b4', '#dcc29a', '#f3efe7', '#d7dccf', '#e8cbab', '#e4ddcf'];
const CONTRA_COL = ['#2e8b57', '#b23a2a', '#6b4a30', '#2b6cb0', '#3f7a4a'];
export function casas(c, w, h, Lm, Hm, seed, o = {}) {
  let s = seed; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // (base: los metros de pared que quedan bajo el suelo, por si el terreno baja; arriba: solo un piso de ventanas, el que
  // asoma por encima de la pared)
  const B0 = o.base || 0, px = w / Lm, py = h / Hm, Y = (y) => h - (y + B0) * py;
  const filas = o.arriba ? [[Math.max(0.2, (Hm - 1.3) / 2), 1.3, false]] : [[1.5, 1.2, true], [4.2, 1.4, false], [6.9, 1.3, false], [9.5, 1.2, false]];
  for (let x = 0; x < Lm;) {
    const cw = Math.min(Lm - x, 5.5 + r() * 3), col = CASA_COL[Math.floor(r() * CASA_COL.length)], sh = CONTRA_COL[Math.floor(r() * CONTRA_COL.length)];
    c.fillStyle = col; c.fillRect(x * px, 0, cw * px + 1, h);
    // zócalo de piedra y la junta entre casa y casa
    if (!o.arriba) { c.fillStyle = '#8f877a'; c.fillRect(x * px, Y(1.1), cw * px + 1, (1.1 + B0) * py); }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x * px, 0, 3, h);
    const nv = Math.max(1, Math.floor(cw / 2.3)), paso = cw / nv;
    for (const [y0, hw, baja] of filas) {
      if (y0 + hw > Hm - B0 - 0.3) continue;
      for (let i = 0; i < nv; i++) {
        const cx = x + paso * (i + 0.5), ww = baja && i === Math.floor(nv / 2) ? 1.2 : 0.95, hh = baja && i === Math.floor(nv / 2) ? 2.3 : hw, yb = baja && i === Math.floor(nv / 2) ? 0 : y0;
        c.fillStyle = '#e8e2d2'; c.fillRect((cx - ww / 2 - 0.12) * px, Y(yb + hh + 0.14), (ww + 0.24) * px, (hh + 0.28) * py);   // (el marco de piedra)
        c.fillStyle = baja && yb === 0 ? '#4a3220' : '#2c3440'; c.fillRect((cx - ww / 2) * px, Y(yb + hh), ww * px, hh * py);
        if (baja && yb > 0) { c.strokeStyle = '#1d1d22'; c.lineWidth = Math.max(1.5, px * 0.04); for (let k = 1; k < 5; k++) { const X = (cx - ww / 2 + k * ww / 5) * px; c.beginPath(); c.moveTo(X, Y(yb + hh)); c.lineTo(X, Y(yb)); c.stroke(); } }   // (rejas)
        if (!baja) { c.fillStyle = sh; c.fillRect((cx - ww / 2 - 0.5) * px, Y(y0 + hw), 0.42 * px, hw * py); c.fillRect((cx + ww / 2 + 0.08) * px, Y(y0 + hw), 0.42 * px, hw * py); }   // (contraventanas abiertas)
        if (!baja && o.balcones && y0 < 8) { c.fillStyle = '#1f1f24'; c.fillRect((cx - ww / 2 - 0.3) * px, Y(y0 + 0.05), (ww + 0.6) * px, 0.08 * py); }
        if (!baja && r() < 0.5) { c.fillStyle = ['#ff2d55', '#ff7a1a', '#d23cff', '#ff3b30'][Math.floor(r() * 4)]; c.fillRect((cx - ww / 2) * px, Y(y0 + 0.22), ww * px, 0.2 * py); }   // (geranios en la ventana)
      }
    }
    x += cw;
  }
  grain(c, w, h, w * h / 70, 0.05); grain(c, w, h, w * h / 220, 0.04, false);
  if (!o.arriba) weather(c, w, h, Hm, Lm);
}
// reloj de la torre o de la espadaña: esfera blanca con números romanos marcados, agujas negras (las diez y diez)
function reloj(c, w, h) {
  const R = w * 0.46, cx = w / 2, cy = h / 2;
  c.fillStyle = '#2b2b30'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
  c.fillStyle = '#f5f1e6'; c.beginPath(); c.arc(cx, cy, R * 0.9, 0, 7); c.fill();
  c.strokeStyle = '#2b2b30'; c.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.lineWidth = i % 3 ? R * 0.03 : R * 0.07; c.beginPath(); c.moveTo(cx + Math.sin(a) * R * 0.7, cy - Math.cos(a) * R * 0.7); c.lineTo(cx + Math.sin(a) * R * 0.84, cy - Math.cos(a) * R * 0.84); c.stroke(); }
  for (const [a, l, lw] of [[-0.87, 0.45, 0.07], [0.52, 0.68, 0.045]]) { c.lineWidth = R * lw; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(a) * R * l, cy - Math.cos(a) * R * l); c.stroke(); }
}

/** Monta el entorno del estilo en el grupo del frontón. ctx: { T, M (material que se libera con el frontón), th (sus
 *  colores), CONTRA, EXT, roofCol, shield (escudo del pueblo, para la casa consistorial), boxes (choques), spots (público) } */
export function buildEntorno(estilo, ctx) {
  if (estilo === 'iglesia') iglesia(ctx); else if (estilo === 'consistorio') consistorio(ctx); else if (estilo === 'calle') calle(ctx);
}

const caja = (T, g, w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
// tejado a dos aguas con la cumbrera a lo largo de x (de xa a xb), entre za y zb
function tejado(T, g, mat, xa, xb, za, zb, y, rise, ov = 0.5) {
  const zm = (za + zb) / 2, half = (zb - za) / 2 + ov, sl = Math.hypot(half, rise), a = Math.atan2(rise, half);
  for (const s of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(xb - xa + ov * 2, 0.24, sl), mat); m.position.set((xa + xb) / 2, y + rise / 2, zm + s * half / 2); m.rotation.x = s * a; m.castShadow = true; g.add(m); }
}

// la iglesia detrás del frontis, de lado (la nave a lo largo del frontis) y la torre de campanas a la izquierda
function iglesia({ T, M, g, th, CONTRA, boxes, roofCol, seed = 7 }) {
  // (cada iglesia, la suya: la torre a un lado o al otro, más o menos alta, con tejado a cuatro aguas o chapitel, y la
  // nave más o menos alta)
  const xa = -W / 2 - 0.6, xb = W / 2 + CONTRA + 0.6, za = -12.6, zb = -0.85, H = 12.5 + (seed % 3), D = 6, stoneC = th.stone || '#bfb196';
  const nave = canvasTex(T, 1024, 512, (c, w, h) => {
    ashlar(c, w, h, xb - xa, H + D, stoneC);
    const px = w / (xb - xa), Y = (y) => h - (y + D) * (h / (H + D));
    // ventanales altos de medio punto, los que asoman por encima del frontis
    for (let x = 2.2; x < xb - xa - 1; x += 4.2) { c.fillStyle = '#28303a'; c.fillRect((x - 0.55) * px, Y(12.2), 1.1 * px, 2.2 * (h / (H + D))); c.beginPath(); c.arc(x * px, Y(12.2), 0.55 * px, Math.PI, 0); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, Y(H) - 3, w, 6);   // (la cornisa)
    weather(c, w, h, H + D, xb - xa);
  });
  const stone = M({ map: nave, roughness: 0.92 }), roof = M({ color: roofCol, roughness: 0.82 });
  caja(T, g, xb - xa, H + D, zb - za, stone, (xa + xb) / 2, (H - D) / 2, (za + zb) / 2);
  tejado(T, g, roof, xa, xb, za, zb, H, 3.6);
  // la torre: de sillería, con el campanario abierto, la cornisa, el tejado a cuatro aguas y la cruz; el reloj, hacia la cancha
  const dcha = seed % 2 === 1, TX = dcha ? W / 2 + CONTRA + 1.1 : -W / 2 - 3.6, TZ = -3.6, TW = 4.4, TH = 20 + (seed % 7), chapitel = seed % 3 === 0;
  const torre = canvasTex(T, 256, 1024, (c, w, h) => { ashlar(c, w, h, TW, TH + D, stoneC); weather(c, w, h, TH + D, TW); });
  caja(T, g, TW, TH + D, TW, M({ map: torre, roughness: 0.92 }), TX, (TH - D) / 2, TZ);
  const hueco = M({ color: '#1d2228', roughness: 1 }), bronce = M({ color: '#b98a3c', metalness: 0.6, roughness: 0.4 }), cornisa = M({ color: '#d8ccb3', roughness: 0.85 });
  for (const [dx, dz, ry] of [[0, TW / 2, 0], [0, -TW / 2, 0], [TW / 2, 0, Math.PI / 2], [-TW / 2, 0, Math.PI / 2]]) {
    const m = new T.Mesh(new T.BoxGeometry(1.5, 3, 0.12), hueco); m.position.set(TX + dx, TH - 4.2, TZ + dz); m.rotation.y = ry; g.add(m);
  }
  const bell = new T.Mesh(new T.CylinderGeometry(0.35, 0.6, 0.9, 10), bronce); bell.position.set(TX, TH - 4.5, TZ); g.add(bell);
  caja(T, g, TW + 0.5, 0.4, TW + 0.5, cornisa, TX, TH - 2.3, TZ); caja(T, g, TW + 0.6, 0.45, TW + 0.6, cornisa, TX, TH, TZ);
  const ch = chapitel ? 8 : 4.6, cono = new T.Mesh(new T.ConeGeometry(TW * (chapitel ? 0.62 : 0.78), ch, chapitel ? 8 : 4), roof); cono.position.set(TX, TH + 0.2 + ch / 2, TZ); cono.rotation.y = Math.PI / 4; cono.castShadow = true; g.add(cono);
  const hierro = M({ color: '#2a2a2e', roughness: 0.5, metalness: 0.6 });
  caja(T, g, 0.1, 1.5, 0.1, hierro, TX, TH + ch + 0.9, TZ); caja(T, g, 0.8, 0.1, 0.1, hierro, TX, TH + ch + 1.2, TZ);
  const rel = new T.Mesh(new T.CircleGeometry(0.9, 28), M({ map: canvasTex(T, 256, 256, reloj), roughness: 0.6 })); rel.position.set(TX, TH - 7.5, TZ + TW / 2 + 0.03); g.add(rel);
  boxes.push({ x: (xa + xb) / 2, z: (za + zb) / 2, w: xb - xa, d: zb - za }, { x: TX, z: TZ, w: TW, d: TW });
}

// la casa consistorial detrás del frontis: soportales abajo, balcón corrido, el escudo del pueblo en el centro, la
// cornisa y, encima, la espadaña con el reloj y la campana
function consistorio({ T, M, g, th, CONTRA, boxes, roofCol, shield }) {
  const xa = -W / 2 - 0.6, xb = W / 2 + CONTRA + 0.6, za = -10.4, zb = -0.85, H = 15, D = 6, LW = xb - xa;
  const piedra = !!th.stone, muro = piedra ? th.stone : '#ece3cf';
  const fach = canvasTex(T, 1024, 768, (c, w, h) => {
    if (piedra) ashlar(c, w, h, LW, H + D, muro); else { c.fillStyle = muro; c.fillRect(0, 0, w, h); grain(c, w, h, 9000, 0.05); grain(c, w, h, 3000, 0.04, false); }
    const px = w / LW, py = h / (H + D), Y = (y) => h - (y + D) * py, X = (x) => x * px;
    // soportales: arcos oscuros abajo, con su sillería clara alrededor
    const na = Math.max(3, Math.round(LW / 3.6)), pa = LW / na;
    for (let i = 0; i < na; i++) { const cx = pa * (i + 0.5); c.fillStyle = '#d6cbb2'; c.fillRect(X(cx - pa * 0.42), Y(4.2), pa * 0.84 * px, 4.2 * py); c.fillStyle = '#2a2622'; c.fillRect(X(cx - pa * 0.32), Y(3.0), pa * 0.64 * px, 3 * py); c.beginPath(); c.arc(X(cx), Y(3.0), pa * 0.32 * px, Math.PI, 0); c.fill(); }
    // dos plantas de balcones y ventanas, con su barandilla de forja; el escudo en el centro de la segunda
    const nv = Math.max(3, Math.round(LW / 3)), pv = LW / nv, mid = Math.floor(nv / 2);
    for (const [y0, hh, balc] of [[5.2, 2.4, true], [9.4, 2.1, false]]) for (let i = 0; i < nv; i++) {
      if (!balc && i === mid && shield) continue;
      const cx = pv * (i + 0.5);
      c.fillStyle = '#e9e3d4'; c.fillRect(X(cx - 0.65), Y(y0 + hh + 0.2), 1.3 * px, (hh + 0.35) * py);
      c.fillStyle = '#2c3440'; c.fillRect(X(cx - 0.5), Y(y0 + hh), 1.0 * px, hh * py);
      c.fillStyle = '#5a3a26'; c.fillRect(X(cx - 0.05), Y(y0 + hh), 0.1 * px, hh * py);
      if (balc) { c.strokeStyle = '#1f1f24'; c.lineWidth = Math.max(2, px * 0.05); c.strokeRect(X(cx - 0.8), Y(y0 + 1), 1.6 * px, 1 * py); for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(X(cx - 0.8 + k * 0.2), Y(y0 + 1)); c.lineTo(X(cx - 0.8 + k * 0.2), Y(y0)); c.stroke(); } }
    }
    if (shield) shield(c, X(LW / 2), Y(12.1), 2.9 * py);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, Y(H) - 4, w, 8); c.fillStyle = '#e2d7bf'; c.fillRect(0, Y(H) - 2, w, 4);   // (la cornisa)
    weather(c, w, h, H + D, LW);
  });
  const lado = M({ color: muro, roughness: 0.9 }), cara = M({ map: fach, roughness: 0.88 }), roof = M({ color: roofCol, roughness: 0.82 });
  const b = new T.Mesh(new T.BoxGeometry(LW, H + D, zb - za), [lado, lado, lado, lado, cara, cara]); b.position.set((xa + xb) / 2, (H - D) / 2, (za + zb) / 2); b.castShadow = true; b.receiveShadow = true; g.add(b);
  tejado(T, g, roof, xa, xb, za, zb, H, 2.6);
  // la espadaña: un muro alto en el centro, con el reloj y, arriba, la campana bajo su arco
  const cx = (xa + xb) / 2, ez = zb - 0.6, esp = M({ color: piedra ? th.stone : '#e2d7bf', roughness: 0.88 });
  caja(T, g, 4.2, 4.2, 0.8, esp, cx, H + 2.1, ez);
  const tri = new T.Shape(); tri.moveTo(-2.1, 0); tri.lineTo(2.1, 0); tri.lineTo(0, 1.4); tri.closePath();
  const pico = new T.Mesh(new T.ExtrudeGeometry(tri, { depth: 0.8, bevelEnabled: false }), esp); pico.position.set(cx, H + 4.2, ez - 0.4); g.add(pico);
  const rel = new T.Mesh(new T.CircleGeometry(1.1, 30), M({ map: canvasTex(T, 256, 256, reloj), roughness: 0.6 })); rel.position.set(cx, H + 1.9, ez + 0.41); g.add(rel);
  const ojo = new T.Mesh(new T.BoxGeometry(1.1, 1.3, 0.85), M({ color: '#1d2228', roughness: 1 })); ojo.position.set(cx, H + 3.6, ez); g.add(ojo);
  const bell = new T.Mesh(new T.CylinderGeometry(0.22, 0.38, 0.6, 10), M({ color: '#b98a3c', metalness: 0.6, roughness: 0.4 })); bell.position.set(cx, H + 3.5, ez); g.add(bell);
  boxes.push({ x: cx, z: (za + zb) / 2, w: LW, d: zb - za });
}

// el frontón en la calle: casas a la izquierda (detrás de la pared, con un piso más en alguna) y casas enfrente, con
// balcones llenos de gente y la acera con más gente de pie
function calle({ T, M, g, th, CONTRA, EXT, boxes, spots, roofCol, seed = 7 }) {
  const roof = M({ color: roofCol, roughness: 0.82 }), xl = -W / 2 - 0.6;
  // a la izquierda: el cuerpo de las casas detrás de la pared (su fachada a la otra calle) y los pisos que asoman por
  // encima de la raya, cada casa con su altura
  const back = canvasTex(T, 1024, 256, (c, w, h) => casas(c, w, h, EXT, COURT.LEFT_H + 6, seed + 3, { base: 6 })), liso = M({ color: '#d8cdb8', roughness: 0.9 });
  const cuerpo = new T.Mesh(new T.BoxGeometry(IZQ_FONDO, COURT.LEFT_H + 6, EXT), [liso, M({ map: back }), liso, liso, liso, liso]);
  cuerpo.position.set(xl - IZQ_FONDO / 2, (COURT.LEFT_H - 6) / 2, EXT / 2); cuerpo.castShadow = true; cuerpo.receiveShadow = true; g.add(cuerpo);
  let s = seed; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const chim = [], losas = [], hierros = [];   // (las chimeneas, los balcones y su forja: cada cosa, una sola malla)
  for (let z = 0; z < EXT;) {
    const len = Math.min(EXT - z, 6 + r() * 3), hh = COURT.LEFT_H + (r() < 0.6 ? 1.6 + r() * 1.4 : 0.3);
    const up = hh - COURT.LEFT_H;
    if (up > 0.5) {
      const tex = canvasTex(T, 256, 128, (c, w, h) => casas(c, w, h, len, up, Math.floor(r() * 9999), { arriba: true }));
      const m = new T.Mesh(new T.BoxGeometry(IZQ_FONDO + 0.6, up, len), M({ map: tex })); m.position.set(xl - IZQ_FONDO / 2 + 0.3, COURT.LEFT_H + up / 2, z + len / 2); m.castShadow = true; g.add(m);
    }
    const rr = new T.Group(); tejado(T, rr, roof, -len / 2, len / 2, -IZQ_FONDO / 2 - 0.3, IZQ_FONDO / 2 + 0.3, 0, 1.8, 0.4); rr.rotation.y = Math.PI / 2; rr.position.set(xl - IZQ_FONDO / 2 + 0.3, hh, z + len / 2); g.add(rr);
    if (r() < 0.6) chim.push({ w: 0.6, h: 1.4, d: 0.6, x: xl - 1.5 - r() * 2, y: hh + 1.6, z: z + len * (0.3 + r() * 0.4) });
    z += len;
  }
  // enfrente: la acera (CALLE_ACERA) y las casas, con balcones de dos plantas y gente en ellos
  const xs = W / 2 + CONTRA + CALLE_ACERA, xe = xs + CALLE_FONDO, losa = M({ color: '#b9b2a3', roughness: 0.9 }), forja = M({ color: '#24242a', roughness: 0.5, metalness: 0.5 });
  losas.push({ w: CALLE_ACERA, h: 0.12, d: EXT, x: W / 2 + CONTRA + CALLE_ACERA / 2, y: 0.06, z: EXT / 2 });
  for (let z = 0.6; z < EXT - 1;) {
    const len = Math.min(EXT - 0.6 - z, 6 + r() * 2.5), hh = 9 + r() * 3.5;
    const tex = canvasTex(T, 512, 512, (c, w, h) => casas(c, w, h, len, hh + 6, Math.floor(r() * 9999), { balcones: true, base: 6 }));
    const lado = M({ color: '#d8cdb8' }), cara = M({ map: tex });
    const m = new T.Mesh(new T.BoxGeometry(CALLE_FONDO, hh + 6, len), [lado, cara, lado, lado, lado, lado]); m.position.set((xs + xe) / 2, (hh - 6) / 2, z + len / 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const rr = new T.Group(); tejado(T, rr, roof, -len / 2, len / 2, -CALLE_FONDO / 2, CALLE_FONDO / 2, 0, 2, 0.5); rr.rotation.y = Math.PI / 2; rr.position.set((xs + xe) / 2, hh, z + len / 2); g.add(rr);
    // balcones en la primera y la segunda planta, de casi todo el ancho de la casa, con la barandilla y su gente
    for (const y of [3.6, 6.3]) {
      if (y > hh - 2) continue;
      const bl = len - 1.2, bz = z + len / 2;
      losas.push({ w: 0.9, h: 0.12, d: bl, x: xs - 0.45, y, z: bz });
      hierros.push({ w: 0.05, h: 0.05, d: bl, x: xs - 0.88, y: y + 0.98, z: bz });
      for (let k = -bl / 2; k <= bl / 2 + 0.01; k += 0.3) hierros.push({ w: 0.03, h: 0.95, d: 0.03, x: xs - 0.88, y: y + 0.5, z: bz + k });
      for (let k = -bl / 2 + 0.4; k < bl / 2 - 0.3; k += 0.62) spots.push([xs - 0.4, y + 0.07, bz + k, -Math.PI / 2]);
    }
    z += len;
  }
  for (const [L, mat] of [[chim, M({ color: '#9b8f80', roughness: 0.9 })], [losas, losa], [hierros, forja]]) { const m = new T.Mesh(boxesGeo(T, L), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  // la gente de pie en la acera, junto a la raya de la contracancha
  for (let z = 1.4; z < EXT - 1.6; z += 0.66) spots.push([W / 2 + CONTRA + 0.75 + (r() - 0.5) * 0.3, 0.12, z + (r() - 0.5) * 0.2, -Math.PI / 2]);
  boxes.push({ x: (xs + xe) / 2, z: EXT / 2, w: CALLE_FONDO, d: EXT }, { x: xl - IZQ_FONDO / 2, z: EXT / 2, w: IZQ_FONDO, d: EXT });
}
