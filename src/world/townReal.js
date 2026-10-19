// Construcción de un pueblo con su trazado de verdad (src/levels/townReal.js): cada casa sobre el rectángulo de su
// contorno real, con la fachada a su calle y su altura; los puentes de piedra donde están, con sus pretiles; y los
// muros del cauce en el casco. La iglesia, los monumentos, la plaza y la granja los pone townBuilder.js como siempre.
import * as THREE from 'three';
import { box, M, MM, builderQuality } from './builder.js';
import { terrainHeight, addPlatform } from './heightfield.js';
import { addBox } from './colliders.js';
import { riverInfo, villageMask, MOD } from './layout.js';
import { clamp } from '../util/math.js';

/** La iglesia de los datos: su eje largo y la fachada (+z local) hacia el lado de la plaza o de su calle. */
export function realChurchRy(b, plaza) {
  // (en los datos, ry mira a la calle más cercana y d es el fondo en esa dirección; la fachada va en un extremo del eje largo)
  const along = b.d >= b.w ? [b.ry, b.ry + Math.PI] : [b.ry + Math.PI / 2, b.ry - Math.PI / 2];
  const tx = plaza.x - b.x, tz = plaza.z - b.z;
  return along.reduce((a, r) => (Math.sin(r) * tx + Math.cos(r) * tz > Math.sin(a) * tx + Math.cos(a) * tz ? r : a));
}

/** Puentes de piedra sobre los tramos de calle que son puente: tablero con algo de lomo, pretiles, bóveda y suelo pisable. */
export function realBridges(B, real) {
  for (const P of real.puentes) {
    const pts = P.pts; if (pts.length < 2) continue;
    // longitud acumulada y alturas de los extremos (en tierra firme); el lomo, por encima del agua
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1]; if (L < 3) continue;
    const a = pts[0], b = pts[pts.length - 1];
    const ya = terrainHeight(a[0], a[1]), yb = terrainHeight(b[0], b[1]);
    let water = -Infinity; for (let i = 0; i <= 8; i++) { const t = i / 8, k = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))); const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * (t * (pts.length - 1) - k), z = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * (t * (pts.length - 1) - k); const r = riverInfo(x, z); if (r.edge < 0.5) water = Math.max(water, r.level); }
    // (solo los que cruzan agua, y el de la misión del pueblo: los datos marcan también como puente los pasos sobre una
    // carretera o una vaguada seca, y aquí salían puentes de piedra con lomo en mitad de la calle)
    if (!(water > -1e8) && !P.mision) continue;
    const hump = Math.max(0.3, (water > -1e8 ? water + 2.2 : -Infinity) - (ya + yb) / 2);
    // (t, acotado: al final del último tramo la suma da L y una millonésima, el seno sale negativo y su potencia, NaN)
    const deck = (s) => { const t = clamp(s / L, 0, 1); return ya + (yb - ya) * t + hump * Math.max(0, Math.sin(Math.PI * t)) ** 0.8; };
    const Wd = 2 * P.w + 1.0, stone = 'stone', cap = 'ashlar';
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], sl = cum[i + 1] - cum[i]; if (sl < 0.2) continue;
      const dx = (x1 - x0) / sl, dz = (z1 - z0) / sl, ry = Math.atan2(dx, dz);
      // (en trozos de 2 m, para que el tablero siga el lomo)
      const n = Math.max(1, Math.round(sl / 2));
      for (let k = 0; k < n; k++) {
        const s0 = cum[i] + sl * k / n, s1 = cum[i] + sl * (k + 1) / n, y0 = deck(s0), y1 = deck(s1), len = s1 - s0;
        const cx = x0 + dx * (s0 + s1 - 2 * cum[i]) / 2, cz = z0 + dz * (s0 + s1 - 2 * cum[i]) / 2, pitch = -Math.atan2(y1 - y0, len), ym = (y0 + y1) / 2;
        const T = M(cx, ym, cz, ry, pitch);
        B.add(stone, box(Wd, 0.6, len + 0.06, 2), MM(T, M(0, -0.3, 0)));
        // costados de sillería bajo el tablero (de lejos se lee como un puente de piedra; el agua pasa por debajo)
        for (const side of [-1, 1]) {
          B.add(stone, box(0.42, 0.85, len + 0.04, 1.6), MM(T, M(side * (Wd / 2 - 0.21), 0.42, 0)));
          B.add(cap, box(0.55, 0.14, len + 0.06, 1), MM(T, M(side * (Wd / 2 - 0.21), 0.9, 0)));
          B.add(stone, box(0.5, 1.5, len + 0.06, 1.8), MM(T, M(side * (Wd / 2 - 0.25), -1.3, 0)));
        }
        addPlatform(cx, cz, ry, -Wd / 2 + 0.4, Wd / 2 - 0.4, -len / 2 - 0.02, len / 2 + 0.02, y0, y1);
      }
      for (const side of [-1, 1]) addBox(x0 + (x1 - x0) / 2 + side * Math.cos(ry) * (Wd / 2 - 0.2), z0 + (z1 - z0) / 2 - side * Math.sin(ry) * (Wd / 2 - 0.2), 0.45, Math.max(0.5, sl - (i === 0 || i === pts.length - 2 ? 1.2 : 0)), ry);
    }
    // la bóveda: un arco de piedra a cada lado, bajo el tramo que cruza el agua
    if (water > -1e8 && L > 4) {
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
      const span = Math.min(L - 1.6, 14), rise = Math.max(0.8, deck(L / 2) - 0.7 - water);
      const s = new THREE.Shape();
      s.moveTo(-span / 2 - 0.6, water - 1.2); s.lineTo(-span / 2 - 0.6, deck(L / 2 - span / 2) - 0.55); s.lineTo(span / 2 + 0.6, deck(L / 2 + span / 2) - 0.55); s.lineTo(span / 2 + 0.6, water - 1.2);
      const h = new THREE.Path(); h.moveTo(span / 2, water - 1.2); h.lineTo(span / 2, water); for (let i = 1; i < 18; i++) { const t = Math.PI * i / 18; h.lineTo(Math.cos(t) * span / 2, water + Math.sin(t) * Math.min(rise, span / 2)); } h.lineTo(-span / 2, water); h.lineTo(-span / 2, water - 1.2); h.lineTo(span / 2, water - 1.2);
      s.holes.push(h);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); g.translate(0, 0, -0.25);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2);
      const ry = Math.atan2(-dz, dx);   // (el eje x de la forma, a lo largo del puente)
      for (const side of [-1, 1]) B.add(stone, g, M(mx - side * dz * (Wd / 2 - 0.3), 0, mz + side * dx * (Wd / 2 - 0.3), ry));
    }
  }
}

/** Muros de piedra del cauce donde el río pasa por el casco (en los trozos sin puente). */
export function realRiverWalls(B, real, fam) {
  const nearBridge = (x, z) => real.puentes.some(P => P.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < P.w + 3.5));
  for (const R of real.rios) {
    if (R.half < 1.2) continue;
    const pts = R.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], sl = Math.hypot(x1 - x0, z1 - z0); if (sl < 0.5) continue;
      const tx = (x1 - x0) / sl, tz = (z1 - z0) / sl, nx = tz, nz = -tx, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
      if (villageMask(xm, zm) < 0.5 || nearBridge(xm, zm)) continue;
      const level = (R.lv[i] + R.lv[i + 1]) / 2;
      for (const side of [-1, 1]) {
        const off = R.half + 0.5, wx = xm + side * nx * off, wz = zm + side * nz * off;
        const top = terrainHeight(xm + side * nx * (R.half + 2.4), zm + side * nz * (R.half + 2.4)) + 0.6, bot = level - 1.4;
        if (top - bot < 1.0 || top - bot > 9) continue;
        const ry = Math.atan2(tx, tz);
        B.add(fam === 'ribera' ? 'brick' : 'stone', box(0.8, top - bot, sl + 0.08, 2), M(wx, (top + bot) / 2, wz, ry));
        B.add('ashlar', box(0.95, 0.14, sl + 0.1, 1), M(wx, top + 0.07, wz, ry));
        addBox(wx, wz, 0.8, sl, ry);
      }
    }
  }
}

// ---------- Fachadas sencillas ----------
// Las ventanas, la puerta y los balcones de las casas que no se levantan con todo su detalle (las lejanas y las que
// pasan del cupo del móvil) y, de lejos, también los de las detalladas: las piezas pequeñas de una casa (marcos,
// cristales, contraventanas) se dejan de dibujar a partir de unos 110 a 180 m (builder.js, DETAIL) y la casa se quedaba
// con las paredes lisas. Aquí cada casa lleva tres piezas grandes, una por material (cristales, carpintería y forja),
// que se ven desde la otra punta del pueblo. El estilo, el de cada comarca, como en src/world/houses.js: contraventanas
// rojas y verdes y balcón corrido de madera en la vertiente atlántica; madera oscura y ventanas pequeñas en el Pirineo;
// balcones de forja en la Zona Media y la Ribera.
const ESTILO = {
  atlantic: { contra: ['#7b3f2a', '#3e6b48', '#8a2f2f', '#2f5a3c'], marco: '#efe9dc', puerta: '#5a2f22', madera: '#5b3a24' },
  pyrenean: { contra: ['#6d5231', '#5a4128', '#3e6b48'], marco: '#d4c9b2', puerta: '#4a3220', chica: true },
  central: { contra: ['#6d5231', '#3e6b48', '#5a4128'], marco: '#ddd2b8', puerta: '#4a3220', forja: true },
  ribera: { contra: ['#3e6b48', '#6d5231', '#2f4f6e'], marco: '#e8dfcc', puerta: '#4a3220', forja: true },
  city: { contra: ['#3e6b48', '#2f4f6e', '#6d5231'], marco: '#e8dfcc', puerta: '#3a2a1c', forja: true },
};
// juntar rectángulos en una sola pieza: cada uno en el plano de una fachada (u a lo largo, y de altura, a «off» de la pared)
// (con color por vértice, o con coordenadas de textura a lo largo para la barandilla calada, que se repite cada 0,9 m)
class Lienzo {
  constructor(color) { this.p = []; this.n = []; this.c = []; this.t = []; this.i = []; this.color = color; }
  rect(F, u0, u1, y0, y1, off, col) {
    const k = this.p.length / 3, c = col && new THREE.Color(col), tu = (u1 - u0) / 0.9;
    for (const [u, y, a, b] of [[u0, y0, 0, 0], [u1, y0, tu, 0], [u1, y1, tu, 1], [u0, y1, 0, 1]]) {
      this.p.push(F.ox + F.ux * u + F.nx * off, y, F.oz + F.uz * u + F.nz * off); this.n.push(F.nx, 0, F.nz); this.t.push(a, b);
      if (this.color) this.c.push(c.r, c.g, c.b);
    }
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  geo() {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    if (this.color) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); return g;
  }
}
// (sin gastar el rnd del pueblo: un número por casa, de su posición)
const hashRnd = (x, z) => { let s = (Math.imul(Math.round(x * 10), 73856093) ^ Math.imul(Math.round(z * 10), 19349663)) >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5 >>> 0) % 10000) / 10000; };
/** La fachada sencilla de una casa de w × d con el alero a h (en el sistema de la casa, T: la puerta mira a +z). o: fam
 *  (familia de la comarca), wall (material de la pared), kind (house, industrial, school, shed, tower), tier (3: solo de
 *  lejos, para las casas con todo su detalle), floors (plantas, si la casa ya las tiene contadas). */
function fachada(B, T, w, d, h, o) {
  const E = ESTILO[o.fam] || ESTILO.pyrenean, r = o.rnd, kind = o.kind || 'house', off = o.tier === 3 ? 0.09 : 0.03;
  const vid = new Lienzo(false), car = new Lienzo(true), forja = new Lienzo(false);
  const piedra = o.wall === 'stone' || o.wall === 'ashlar', marco = piedra ? '#cfc5b0' : o.wall === 'brick' ? '#e2d6bf' : E.marco;
  const contra = E.contra[Math.floor(r() * E.contra.length)];
  const caras = [
    { L: w, ox: 0, oz: d / 2, ux: 1, uz: 0, nx: 0, nz: 1, frente: true },
    { L: w, ox: 0, oz: -d / 2, ux: -1, uz: 0, nx: 0, nz: -1 },
    { L: d, ox: w / 2, oz: 0, ux: 0, uz: -1, nx: 1, nz: 0, lado: true },
    { L: d, ox: -w / 2, oz: 0, ux: 0, uz: 1, nx: -1, nz: 0, lado: true },
  ];
  // (de lejos y en calidad baja, sin marcos: a esa distancia no se distinguen y son la mitad de las piezas)
  const sinMarco = o.tier === 3 && builderQuality() === 'low';
  const ventana = (F, u, y, ww, wh, conContra) => {
    vid.rect(F, u - ww / 2, u + ww / 2, y - wh / 2, y + wh / 2, off);
    if (!sinMarco) {
      car.rect(F, u - ww / 2 - 0.14, u + ww / 2 + 0.14, y - wh / 2 - 0.16, y - wh / 2, off, marco);         // alféizar
      car.rect(F, u - ww / 2 - 0.14, u + ww / 2 + 0.14, y + wh / 2, y + wh / 2 + 0.18, off, marco);         // dintel
      car.rect(F, u - ww / 2 - 0.12, u - ww / 2, y - wh / 2, y + wh / 2, off, marco);
      car.rect(F, u + ww / 2, u + ww / 2 + 0.12, y - wh / 2, y + wh / 2, off, marco);
    }
    if (conContra) for (const s of [-1, 1]) car.rect(F, s < 0 ? u - ww - 0.14 : u + ww / 2 + 0.14, s < 0 ? u - ww / 2 - 0.14 : u + ww + 0.14, y - wh / 2, y + wh / 2, off + 0.02, contra);
  };
  // el vuelo del balcón (de cerca se ve el suelo; de lejos, solo la barandilla)
  const losa = (F, u, len, y, dep, mat) => { if (o.tier === 3) return; const ry = Math.atan2(F.nx, F.nz);
    B.add(mat, box(len, 0.13, dep, 1), MM(T, M(F.ox + F.ux * u + F.nx * dep / 2, y - 0.07, F.oz + F.uz * u + F.nz * dep / 2, ry))); };
  const puerta = (F, u, pw, ph, col) => {
    car.rect(F, u - pw / 2, u + pw / 2, 0, ph, off, col);
    car.rect(F, u - pw / 2 - 0.22, u - pw / 2, 0, ph + 0.25, off, marco); car.rect(F, u + pw / 2, u + pw / 2 + 0.22, 0, ph + 0.25, off, marco);
    car.rect(F, u - pw / 2 - 0.22, u + pw / 2 + 0.22, ph, ph + 0.25, off, marco);
  };
  if (kind === 'industrial' || kind === 'school') {
    // naves y colegios: una tira de ventanas altas o filas de ventanales, sin contraventanas, y un portón
    const nf = kind === 'school' ? Math.max(1, Math.round(h / 3.4)) : 1;
    for (const F of caras) {
      if (F.L < 4) continue;
      const nb = Math.max(1, Math.floor(F.L / (kind === 'school' ? 3.6 : 5)));
      for (let f = 0; f < nf; f++) for (let i = 0; i < nb; i++) {
        const u = -F.L / 2 + F.L / nb * (i + 0.5);
        if (F.frente && f === 0 && i === Math.floor(nb / 2)) { puerta(F, u, kind === 'school' ? 2.2 : 3.6, Math.min(h - 0.8, kind === 'school' ? 2.6 : 3.8), kind === 'school' ? E.puerta : '#6b6f73'); continue; }
        if (kind === 'school') ventana(F, u, f * (h / nf) + h / nf * 0.55, 2.0, 1.5, false);
        else vid.rect(F, u - 1.6, u + 1.6, h - 1.5, h - 0.6, off);
      }
    }
  } else if (kind === 'shed') {
    const F = caras[0]; puerta(F, 0, Math.min(w - 0.8, 2.4), Math.min(h - 0.3, 2.3), E.madera || '#5a4128');
  } else {
    const nf = o.floors || Math.max(1, Math.round(h / 3)), fh = h / nf, chica = E.chica || kind === 'tower' || kind === 'borda';
    const ww = chica ? 0.72 : 0.95, wh = Math.min(chica ? 1.0 : 1.4, fh * 0.48);
    for (const F of caras) {
      const nb = Math.max(1, Math.floor((F.L - 0.6) / (chica ? 3.4 : 3.0)));
      if (F.lado && F.L < 5 && r() < 0.5) continue;                     // (los costados estrechos, a veces ciegos: medianeras)
      const door = F.frente ? Math.floor(nb / 2) : -1;
      // balcón: corrido de madera en la vertiente atlántica, de forja en el resto (en la primera planta de la fachada)
      const balcon = F.frente && nf >= 2 && kind === 'house' && (E.madera ? F.L >= 6 && r() < 0.6 : E.forja && r() < 0.65);
      for (let f = 0; f < nf; f++) for (let i = 0; i < nb; i++) {
        const u = -F.L / 2 + F.L / nb * (i + 0.5);
        if (f === 0 && i === door) { puerta(F, u, chica ? 1.2 : 1.4, Math.min(2.4, fh * 0.82), E.puerta); continue; }
        if (f === 0 && !F.frente && r() < 0.35) continue;
        if (f === 1 && balcon) {
          // (la ventana del balcón llega al suelo de la planta, como una puerta balconera)
          const y0 = fh + 0.05, y1 = fh + Math.min(2.3, fh * 0.78);
          ventana(F, u, (y0 + y1) / 2, ww, y1 - y0, true);
          if (E.forja) { forja.rect(F, u - ww / 2 - 0.3, u + ww / 2 + 0.3, y0, y0 + 0.95, off + 0.55); losa(F, u, ww + 0.6, y0, 0.55, 'ashlar'); }
          continue;
        }
        ventana(F, u, f * fh + fh * 0.56, ww, wh, f > 0 && r() < 0.88);
      }
      if (balcon && E.madera) {
        // balcón corrido de madera: barandilla con balaustres sobre un vuelo
        const y0 = fh + 0.05, a = -F.L * 0.36, b = F.L * 0.36;
        car.rect(F, a, b, y0 - 0.14, y0 + 0.02, off + 0.6, E.madera); car.rect(F, a, b, y0 + 0.92, y0 + 1.02, off + 0.6, E.madera); losa(F, 0, b - a, y0, 0.6, 'wood');
        for (let u = a; u <= b; u += 0.3) car.rect(F, u - 0.035, u + 0.035, y0, y0 + 0.92, off + 0.6, E.madera);
      }
    }
  }
  const t = o.tier ?? 0;
  for (const [mat, L] of [['glass', vid], ['fachada', car], ['railing', forja]]) { const g = L.geo(); if (g) B.add(mat, g, T, t); }
}

/** La fachada sencilla de una casa con todo su detalle (ho, la de buildHouse), solo para verla de lejos. */
export function fachadaLejana(B, T, ho, fam, x, z) {
  fachada(B, T, ho.w, ho.d, ho.h, { fam, wall: ho.wall, kind: 'house', floors: Math.max(2, Math.round(ho.h / 2.9)), tier: 3, rnd: hashRnd(x, z) });
}

// bloque sencillo con tejado a dos aguas (almacenes, naves, casetas y las casas del monte lejanas)
function block(B, x, y, z, ry, w, d, h, wall, roof, pitch = 0.45) {
  const T = M(x, y, z, ry);
  B.add(wall, box(w, h + 3, d, 2.6), MM(T, M(0, (h + 3) / 2 - 3, 0)));
  const rise = Math.min(w, d) / 2 * pitch, span = Math.min(w, d), along = Math.max(w, d), wideX = w >= d;
  const sl = Math.hypot(span / 2 + 0.4, rise), a = Math.atan2(rise, span / 2 + 0.4);
  for (const s of [-1, 1]) {
    if (wideX) B.add(roof, box(along + 0.6, 0.2, sl, 2), MM(T, M(0, h + rise / 2, s * (span / 4 + 0.2), 0, s * a)));
    else B.add(roof, box(sl, 0.2, along + 0.6, 2), MM(T, M(s * (span / 4 + 0.2), h + rise / 2, 0, 0, 0, -s * a)));
  }
  // los piñones
  const tri = new THREE.Shape(); tri.moveTo(-span / 2, 0); tri.lineTo(span / 2, 0); tri.lineTo(0, rise); tri.closePath();
  const g = new THREE.ShapeGeometry(tri);
  for (const s of [-1, 1]) B.add(wall, g, MM(T, wideX ? M(s * along / 2, h, 0, s * Math.PI / 2) : M(0, h, s * along / 2, s > 0 ? 0 : Math.PI)));
}

/** Las casas de los datos. H: lo que hace falta de townBuilder (buildHouse, houseStyle, minGround, slopeBase, shieldAt…). */
export function realHouses(B, def, rnd, H) {
  const { buildHouse, houseStyle, minGround, slopeBase, shieldAt, TOWN, P, fam } = H;
  const real = MOD.real;
  const hall = real.data.lugares?.ayuntamiento;
  const fr = real.data.lugares?.fronton;
  let full = 0, simple = 0;
  // (las casas con todo su detalle, solo las más cercanas a la plaza: un pueblo real tiene cuatro o cinco veces más
  // casas que uno generado y en el móvil no caben todas así; el resto, como bloque con su tejado)
  const FULL = builderQuality() === 'low' ? 80 : builderQuality() === 'mid' ? 120 : 160;
  // el núcleo: las casas hasta real.nucleo de la plaza (300 m, el mismo radio que la máscara de pueblo de
  // src/levels/townReal.js), las sueltas fuera del casco solo cerca y, como mucho, las NMAX más cercanas. Con el pueblo
  // entero, hasta 470 m, eran cientos de bloques lisos alrededor; así queda la misma forma del casco, más recogida, y cada
  // casa con sus ventanas y su puerta (las detalladas, primero las de la plaza)
  const NMAX = builderQuality() === 'low' ? 360 : builderQuality() === 'mid' ? 480 : 600, R = real.nucleo || 470;
  const lista = real.casas.map(b => ({ b, dist: Math.hypot(b.x - P.x, b.z - P.z) })).filter(e => e.dist <= R).sort((a, c) => a.dist - c.dist);
  let n = 0;
  for (const { b, dist } of lista) {
    if (real.taken.has(b) || b.k === 'church') continue;
    if (fr && b.k === 'fronton') continue;           // (el frontón lo levanta el juego en su sitio)
    if (b.a < 9 || (b.k === 'shed' && b.a < 18 && dist > 120)) continue;
    const w = clamp(b.w, 3, 60), d = clamp(b.d, 3, 60), ry = b.ry, x = b.x, z = b.z;
    const g = minGround(x, z, w, d, ry);
    if (g.mx - g.mn > 6) continue;                   // (en un barranco: los datos no cuadran con el relieve)
    const vm = villageMask(x, z);
    if (vm < 0.3 && dist > 170) continue;            // (caseríos y bordas sueltos lejos del casco)
    if (++n > NMAX) break;
    const isHall = hall && Math.abs(hall.x - x) < 0.5 && Math.abs(hall.z - z) < 0.5;
    if (b.k === 'industrial' || b.k === 'shed' || (b.k === 'school' && b.a > 600)) {
      const hb = slopeBase(B, x, z, w, d, ry, g);
      const h = b.k === 'shed' ? 2.6 + Math.min(1.2, b.a / 40) : clamp(b.h ? b.h * 0.85 : 7.5, 4.5, 14);
      const wall = b.k === 'shed' ? (fam === 'ribera' ? 'brick' : rnd() < 0.5 ? 'stone' : 'plaster') : 'plasterCream';
      block(B, x, hb, z, ry, w, d, h, wall, b.k === 'shed' ? 'tile' : 'zinc', b.k === 'shed' ? 0.5 : 0.18);
      fachada(B, M(x, hb, z, ry), w, d, h, { fam, wall, kind: b.k === 'shed' ? 'shed' : b.k === 'school' ? 'school' : 'industrial', rnd: hashRnd(x, z) });
      addBox(x, z, w + 0.2, d + 0.2, ry, { solidView: true });
      simple++; continue;
    }
    const st = houseStyle(fam, rnd);
    // altura de alero: la de los datos (que incluye el tejado) o la de la comarca; las casas pequeñas, más bajas. Las
    // alturas de los datos son a menudo estimaciones muy bajas (en Lesaka, 5 m de mediana para casas de tres plantas: el
    // alero se quedaba en 4 m, con plantas de 2 m y la puerta más alta que la planta, y el pueblo parecía de juguete al
    // lado del personaje): una vivienda tiene como mínimo dos plantas de 3 m, y tres en el casco si es grande
    let h = b.h ? b.h * 0.78 : st.h[0] + rnd() * (st.h[1] - st.h[0]);
    if (b.a >= 60) h = Math.max(h, (vm > 0.55 && b.a >= 90 ? 3 : 2) * 3 + Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 0.6); // (sin gastar rnd: el resto del pueblo sale como antes)
    else if (!b.h) h = Math.min(h, 4.6 + b.a / 30);
    h = clamp(h, 3.4, 18);
    if (b.k === 'borda') Object.assign(st, { wall: 'stone', balcony: false, timber: false });
    const hb = slopeBase(B, x, z, w, d, ry, g);
    // lejos del casco y fuera del pueblo, la versión sencilla (de lejos no se ven los detalles y pesa mucho menos)
    if (!isHall && (full >= FULL || dist > 210 || (vm < 0.3 && dist > 140))) {
      block(B, x, hb, z, ry, w, d, h, st.wall, st.roof || 'tile', st.pitch || 0.45);
      fachada(B, M(x, hb, z, ry), w, d, h, { fam, wall: st.wall, kind: b.k, rnd: hashRnd(x, z) });
      addBox(x, z, w + 0.3, d + 0.3, ry, { solidView: true });
      TOWN.houses.push({ x, z, ry, w, d, door: { x: x + Math.sin(ry) * (d / 2 + 1.2), z: z + Math.cos(ry) * (d / 2 + 1.2) }, real: b.n || null });
      simple++; continue;
    }
    const ho = { arch: st.wall === 'stone' || st.wall === 'ashlar' ? rnd() < 0.5 : rnd() < 0.2, balconyW: Math.min(w - 2, 3 + rnd() * 2.5), shield: rnd() < 0.1 && w > 6, cornice: rnd() < 0.4, ...st, w, d, h };
    if (w < 6.5) Object.assign(ho, { balcony: false, gallery: false, balconyW: Math.max(1, w - 2), arch: false });
    if (isHall) Object.assign(ho, { shield: true, townhall: true, h: Math.max(h, 8.5), cornice: true, arch: true, doorX: 0, balcony: true, balconyW: Math.min(w - 2, 5), ironBalcony: true });
    buildHouse(B, M(x, hb, z, ry), ho, rnd);
    // (y de lejos, cuando sus ventanas de verdad ya no se dibujan, la fachada sencilla)
    fachadaLejana(B, M(x, hb, z, ry), ho, fam, x, z);
    if (ho.shieldLocal && isHall) { const [lx, ly, lz] = ho.shieldLocal, c = Math.cos(ry), sn = Math.sin(ry); TOWN.armsSpot = { x: x + lx * c + lz * sn, y: hb + ly, z: z - lx * sn + lz * c, ry, hall: true, base: hb, plateY: hb + ho.plateY, read: { x: x + lx * c + (lz + 2.6) * sn, z: z - lx * sn + (lz + 2.6) * c } }; }
    else if (ho.shieldLocal) shieldAt(x, hb, z, ry, ho.shieldLocal, false);
    addBox(x, z, w + 0.3, d + 0.3, ry, { solidView: true });
    TOWN.houses.push({ x, z, ry, w, d, door: { x: x + Math.sin(ry) * (d / 2 + 1.2), z: z + Math.cos(ry) * (d / 2 + 1.2) }, real: b.n || null });
    full++;
  }
  return { full, simple };
}
