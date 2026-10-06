// Trajes navarros para los personajes KayKit (CC0): se vuelve a pintar su atlas de colores (una rejilla de 8×4
// degradados) solo en las casillas de la ropa, manteniendo el sombreado del degradado, y se les ponen prendas de
// aquí cosidas a los huesos: txapela, pañuelico rojo y faja. Se quitan cascos, capas y sombreros de fantasía.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const OUTFITS = [
  { id: 'original', name: 'Original' },
  { id: 'sanfermin', name: 'San Fermín', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#d42f2f', scarf: '#d42f2f', sash: '#d42f2f' },
  { id: 'dantzari', name: 'Dantzari', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#f2ece0', accent: '#c8102e', beret: '#c8102e', sash: '#c8102e' },
  { id: 'casero', name: 'Casero', shirt: '#ede6d4', pants: '#26262c', shoes: '#1e1a18', accent: '#1e1e24', beret: '#1d1d22', sash: '#1e1e24' },
  { id: 'osasuna', name: 'Futbolista', shirt: '#c41f2c', pants: '#16224a', shoes: '#151515', accent: '#16224a' },
  // trajes de cada comarca, según los datos de cultura de comarcas.json (los conjuntos de sus danzas y fiestas),
  // simplificados a camisa, chaleco, pantalón o falda, calzado y prendas (bandas, fajas, pañuelos, boinas)
  { id: 'lesaka', region: 'bidasoa', name: 'Dantzari de Lesaka', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#c8102e', scarf: '#c8102e', sash: '#c8102e', skirtF: '#f6f3ec' },
  { id: 'leitza', region: 'larraun-leitzaldea', name: 'Ingurutxo de Leitza', shirt: '#efe9da', pants: '#2c2c34', shoes: '#2a221c', accent: '#1d1d22', beret: '#1d1d22', skirtF: '#3a2a4a' },
  { id: 'lakuntza', region: 'sakana', name: 'Alkate dantza de Lakuntza', shirt: '#f2eee4', pants: '#2a4a8a', shoes: '#1e1a18', accent: '#1d1d22', beret: '#1d1d22', sash: '#1d1d22', scarf: '#f2eee4', skirtF: '#24242c' },
  { id: 'ochagavia', region: 'pirineo', name: 'Danzante de Ochagavía', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#2a5aa8', sash: '#c8102e', scarf: '#2a5aa8', skirtF: '#18181c' },
  { id: 'aoiz', region: 'prepirineo', name: 'Danzante de Aoiz', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#7a1c3a', scarf: '#7a1c3a', sash: '#7a1c3a', skirtF: '#2a3a5a' },
  { id: 'jotavieja', region: 'sanguesa', name: 'Jota Vieja de Sangüesa', shirt: '#f2eee4', pants: '#1e1e22', shoes: '#1a1614', accent: '#1e1e22', sash: '#c8102e', skirtF: '#1e1e22' },
  { id: 'era', region: 'tierra-estella', name: 'Baile de la Era (Estella)', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#c8102e', scarf: '#c8102e', sash: '#c8102e', skirtF: '#1e3a6a' },
  { id: 'gares', region: 'valdizarbe-novenera', name: 'Fiesta en Puente la Reina', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#d42f2f', scarf: '#d42f2f', sash: '#d42f2f', skirtF: '#f6f3ec' },
  { id: 'tafalla', region: 'zona-media', name: 'Fiesta en Tafalla', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#d42f2f', scarf: '#d42f2f', sash: '#d42f2f', skirtF: '#f6f3ec' },
  { id: 'peralta', region: 'ribera-alta', name: 'Fiesta en Peralta', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#d42f2f', scarf: '#d42f2f', sash: '#d42f2f', skirtF: '#f6f3ec' },
  { id: 'paloteado', region: 'ribera', name: 'Paloteado de Cortes', shirt: '#efe2c4', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#7a1c2a', scarf: '#7a1c2a', sash: '#1e3a8a', skirtF: '#2e7a3a' },
  // oficios de antes (no son trajes de danza)
  { id: 'pastor', name: 'Pastor', shirt: '#33476a', pants: '#5b4a38', shoes: '#3a2a1e', accent: '#2a241f', beret: '#1d1d22', scarf: '#d8cfae', trade: true },
  { id: 'almadiero', name: 'Almadiero', shirt: '#efe9da', pants: '#26262c', shoes: '#4a3424', accent: '#26262c', beret: '#1d1d22', sash: '#c8102e', trade: true },
];
const HIDE = /Helmet|Visor|BearHat|Mage_Hat|Cape|Quiver|Mask/i;
const COLS = 8, ROWS = 4;

// casillas del atlas que usa cada pieza (cuántos vértices caen en cada una)
// (por superficie: un botón con muchos vértices pesa menos que la tela de la camisa)
function cellsOf(mesh) {
  const G = mesh.geometry, uv = G.attributes.uv, P = G.attributes.position, out = new Map(); if (!uv) return out;
  const idx = G.index, n = idx ? idx.count : P.count, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
    a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1); c.fromBufferAttribute(P, i2);
    const area = b.sub(a).cross(c.sub(a)).length() / 2;
    const u = (uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3, v = (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3;
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(u * COLS))), cy = Math.min(ROWS - 1, Math.max(0, Math.floor(v * ROWS))), k = cy * COLS + cx;
    out.set(k, (out.get(k) || 0) + area);
  }
  return out;
}
const textures = new Map();
let TEXMAX = 512;
/** Tamaño máximo de las texturas de ropa (256 en calidad baja: en el móvil cada lienzo cuenta). */
export const setOutfitTexMax = (n) => { TEXMAX = n; };
/** Al salir de un pueblo: fuera las texturas de ropa (antes se acumulaban pueblo tras pueblo hasta llenar la memoria). */
export function resetOutfitTextures() { for (const t of textures.values()) { t.dispose(); if (t.image?.getContext) t.image.width = t.image.height = 1; } textures.clear(); }
// atlas repintado: cada casilla de ropa toma el color del traje con la luz de su degradado original
function repaint(map, assign, key) {
  if (textures.has(key)) return textures.get(key);
  // a 512 px como mucho: las casillas son colores lisos y así cada traje ocupa 4 veces menos memoria gráfica
  // (con muchos vecinos de trajes distintos, a 1024 px los móviles se quedaban sin memoria y se apagaba la pantalla)
  const img = map.image, sc = Math.min(1, TEXMAX / Math.max(img.width, img.height)), w = Math.round(img.width * sc), h = Math.round(img.height * sc), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const cw = w / COLS, ch = h / ROWS, col = new THREE.Color();
  for (const [cell, hex] of assign) {
    const cx = cell % COLS, cy = cell / COLS | 0, x0 = cx * cw | 0, y0 = (map.flipY ? ROWS - 1 - cy : cy) * ch | 0;
    const d = g.getImageData(x0, y0, cw | 0, ch | 0), p = d.data;
    let mean = 0; for (let i = 0; i < p.length; i += 4) mean += p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11; mean /= p.length / 4;
    col.set(hex); const T = [col.r, col.g, col.b].map(v => Math.pow(v, 1 / 2.2) * 255);   // color del traje en sRGB
    for (let i = 0; i < p.length; i += 4) {
      const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / Math.max(1, mean), k = 0.55 + 0.45 * l;   // conserva el degradado, más suave
      p[i] = Math.min(255, T[0] * k); p[i + 1] = Math.min(255, T[1] * k); p[i + 2] = Math.min(255, T[2] * k);
    }
    g.putImageData(d, x0, y0);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = map.colorSpace; t.flipY = map.flipY; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  textures.set(key, t); return t;
}
const avg = (map, cell) => {
  const img = map.image, c = document.createElement('canvas'), cw = img.width / COLS, ch = img.height / ROWS; c.width = c.height = 4;
  const g = c.getContext('2d', { willReadFrequently: true }), cx = cell % COLS, cy = cell / COLS | 0;
  g.drawImage(img, cx * cw, (map.flipY ? ROWS - 1 - cy : cy) * ch, cw, ch, 0, 0, 4, 4);
  const p = g.getImageData(0, 0, 4, 4).data, s = [0, 0, 0]; for (let i = 0; i < p.length; i += 4) { s[0] += p[i]; s[1] += p[i + 1]; s[2] += p[i + 2]; } return s.map(v => v / 16);
};
const lum = (map, cell) => {   // luz media de una casilla (para saber cuál es el calzado: la más oscura de las piernas)
  const img = map.image, c = document.createElement('canvas'), cw = img.width / COLS, ch = img.height / ROWS; c.width = c.height = 4;
  const g = c.getContext('2d', { willReadFrequently: true }), cx = cell % COLS, cy = cell / COLS | 0;
  g.drawImage(img, cx * cw, (map.flipY ? ROWS - 1 - cy : cy) * ch, cw, ch, 0, 0, 4, 4);
  const p = g.getImageData(0, 0, 4, 4).data; let s = 0; for (let i = 0; i < p.length; i += 4) s += p[i] + p[i + 1] + p[i + 2]; return s / 48;
};

/** Viste el personaje (la copia ya montada en la escena) con un traje. Devuelve las prendas añadidas. */
// cada prenda (txapela, pañuelo, faja…) en una sola malla con sus colores por vértice y un material compartido:
// una llamada de dibujo por prenda en vez de una por pieza (las metálicas, como el peine o la corona, se quedan igual)
const ACC_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
function bakeGroup(g) {
  const parts = []; let metal = false;
  g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert();
  g.traverse(o => { if (o.isMesh) { parts.push(o); if (o.material.metalness > 0.3) metal = true; } });
  if (metal || !parts.length) return g;
  const geos = parts.map(m => {
    let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const c = m.material.color, n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  });
  const merged = mergeGeometries(geos); if (!merged) return g;
  const mesh = new THREE.Mesh(merged, ACC_MAT); mesh.position.copy(g.position); mesh.quaternion.copy(g.quaternion); mesh.scale.copy(g.scale);
  return mesh;
}
export function applyOutfit(root, kk, outfitId) {
  const O = typeof outfitId === 'object' ? outfitId : OUTFITS.find(o => o.id === outfitId);
  if (!O || O.id === 'original') return [];
  const meshes = []; root.traverse(o => { if (o.isMesh && !o.userData.outline) meshes.push(o); });
  // keep: se conserva el aspecto del personaje (solo se añaden prendas; para la mochila se quitan capa y carcaj)
  const hideRe = O.keep ? /Cape|Quiver/i : HIDE;
  const part = (re) => meshes.filter(m => re.test(m.name) && !hideRe.test(m.name));
  for (const m of meshes) if (hideRe.test(m.name)) { m.visible = false; m.userData.want = false; for (const c of m.children) c.visible = false; }
  const head = part(/Head/), body = part(/Body/), arms = part(/Arm/), legs = part(/Leg/);
  const map = (body[0] || meshes[0])?.material?.map; if (!map?.image) return [];
  // casillas: las de la cabeza (piel, pelo, ojos) no se tocan; el resto se reparten entre camisa, pantalón y calzado
  const headCells = new Set(), headArea = new Map(); head.forEach(m => cellsOf(m).forEach((n, k) => { headCells.add(k); headArea.set(k, (headArea.get(k) || 0) + n); }));
  const headTot = [...headArea.values()].reduce((a, b) => a + b, 0) || 1;
  const count = (list) => { const t = new Map(); list.forEach(m => cellsOf(m).forEach((n, k) => { if (!headCells.has(k)) t.set(k, (t.get(k) || 0) + n); })); return [...t.entries()].sort((a, b) => b[1] - a[1]); };
  const assign = new Map(), bodyC = count([...body, ...arms]), legC = count(legs);
  // capuchas (casillas de la cabeza de color saturado verde o azul): pasan al color de la camisa
  for (const k of headCells) { if (headArea.get(k) < headTot * 0.15) continue; const [r, g, b] = avg(map, k); if ((g > r * 1.2 && g > b) || (b > r * 1.3 && b > g * 1.05)) assign.set(k, O.hood || O.shirt); }
  if (legC.length) { const dark = legC.slice().sort((a, b) => lum(map, a[0]) - lum(map, b[0]))[0][0]; if (legC.length > 1) assign.set(dark, O.shoes); }
  legC.forEach(([k]) => { if (!assign.has(k)) assign.set(k, O.pants); });
  // la tela grande (más del 30 % de la mayor) es la camisa; los trozos pequeños (cinturón, correas, chaleco) el acento
  const top = bodyC[0]?.[1] || 1;
  bodyC.forEach(([k, n]) => { if (!assign.has(k)) assign.set(k, n >= top * 0.3 ? O.shirt : O.accent); });
  // en el atlas de los personajes nuevos la casilla 0 es la piel (cara y manos) y la 1 el pelo (o la barba)
  const SKIN_CELL = 0, HAIR_CELL = 1, hairTint = O.hair || O.hairLong;
  if (O.skin && headCells.has(SKIN_CELL)) assign.set(SKIN_CELL, O.skin);
  if (hairTint && headCells.has(HAIR_CELL) && !assign.has(HAIR_CELL)) assign.set(HAIR_CELL, hairTint);
  if (!O.keep) {
    const tex = repaint(map, assign, kk + '|' + (O.id || [O.shirt, O.pants, O.shoes, O.accent].join()) + '|' + (O.hair || '') + (O.skin || ''));
    for (const m of [...head, ...body, ...arms, ...legs]) { m.material = m.material.clone(); m.material.map = tex; }
  }
  // prendas cosidas a los huesos, colocadas sobre la pose de reposo
  root.updateMatrixWorld(true);
  const bone = (n) => { const n2 = n.replace(/\./g, ''); let b = null; root.traverse(o => { if (o.isBone && (o.name === n || o.name === n2)) b = o; }); return b; };   // el cargador quita los puntos («foot.l» → «footl»)
  const box = (list) => { const b = new THREE.Box3(), t = new THREE.Box3(); list.forEach(m => { m.geometry.computeBoundingBox(); t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); b.union(t); }); return b; };
  return garments(root, O, { hasHead: head.length > 0, hasBody: body.length > 0, hb: box(head), bb: box(body), lb: box(legs), bone });
}
// Prendas y complementos (boina, faja, falda, gorros de carnaval, cencerros, pieles, melenas…) colgados de los huesos.
// G: cajas de la cabeza (hb), el tronco (bb) y las piernas (lb) en reposo y bone(nombre) → hueso. Vale para los dos
// esqueletos: el de KayKit y el de los personajes de Meshy (dressMeshy).
function garments(root, O, G) {
  const bone = G.bone, added = [], mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const hb = G.hb, bb = G.bb, sz = hb.getSize(new THREE.Vector3()), bs = bb.getSize(new THREE.Vector3()), hc = hb.getCenter(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3());
  const put = (mesh, boneName, pos) => { mesh = bakeGroup(mesh); const b = bone(boneName) || root; mesh.position.copy(root.worldToLocal(pos.clone())); mesh.castShadow = true; root.add(mesh); mesh.updateMatrixWorld(); b.attach(mesh); added.push(mesh); };
  if (O.beret && G.hasHead) {   // txapela: boina ancha y plana, ladeada, con el txertena (rabito) arriba
    const g = new THREE.Group(), r = sz.x * 0.56;
    const disc = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(O.beret)); disc.scale.y = 0.32; g.add(disc);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.86, r * 0.07, 6, 24), mat(O.beret)); band.rotation.x = Math.PI / 2; g.add(band);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.03, r * 0.05, r * 0.16, 6), mat(O.beret)); tip.position.y = r * 0.36; g.add(tip);
    g.rotation.z = 0.18; g.rotation.x = -0.08;
    put(g, 'head', new THREE.Vector3(hc.x, hb.max.y - sz.y * 0.12, hc.z));
  }
  if (O.cachirulo && G.hasHead) {   // cachirulo: pañuelo atado a la cabeza, con el nudo atrás
    const g = new THREE.Group(), r = sz.x * 0.53;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(O.cachirulo)); cap.scale.y = 0.45; g.add(cap);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), mat(O.cachirulo)); knot.position.set(0, 0.02, -r * 0.95); g.add(knot);
    put(g, 'head', new THREE.Vector3(hc.x, hb.max.y - sz.y * 0.2, hc.z));
  }
  if (O.scarf && G.hasBody) {   // pañuelico anudado al cuello, con el pico por delante
    const g = new THREE.Group(), r = bs.x * 0.34;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 20), mat(O.scarf)); ring.rotation.x = Math.PI / 2; g.add(ring);
    const pico = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 1.1, 3), mat(O.scarf)); pico.rotation.x = Math.PI; pico.position.set(0, -r * 0.5, r * 0.9); pico.scale.z = 0.35; g.add(pico);
    put(g, 'chest', new THREE.Vector3(bc.x, bb.max.y - bs.y * 0.05, bc.z));
  }
  if (O.sash && G.hasBody) {   // faja ancha a la cintura, con las puntas colgando al costado
    const g = new THREE.Group(), rx = bs.x * 0.53, rz = bs.z * 0.6;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, bs.y * 0.16, 24, 1, true), mat(O.sash)); band.scale.set(rx, 1, rz); band.material.side = THREE.DoubleSide; g.add(band);
    const end = new THREE.Mesh(new THREE.BoxGeometry(rx * 0.25, bs.y * 0.32, rz * 0.12), mat(O.sash)); end.position.set(rx * 0.8, -bs.y * 0.16, rz * 0.4); end.rotation.z = 0.15; g.add(end);
    put(g, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.12, bc.z));
  }
  if (O.skirt && G.hasBody) {   // falda larga (mujeres): campana desde la cintura hasta media pierna
    const lb = G.lb, len = (bb.min.y - lb.min.y) * (O.skirtLen || 0.75) + bs.y * 0.12;
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(bs.x * 0.5, bs.x * 0.78, len, 20, 1, true), mat(O.skirt)); sk.material.side = THREE.DoubleSide; sk.scale.z = Math.max(0.8, bs.z / bs.x * 1.1);
    put(sk, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.14 - len / 2, bc.z));
    if (O.apron) { const ap = new THREE.Mesh(new THREE.PlaneGeometry(bs.x * 0.75, len * 0.85), mat(O.apron)); ap.material.side = THREE.DoubleSide; put(ap, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.1 - len * 0.45, bb.max.z + bs.z * 0.25)); }
  }
  // ---- prendas de los seres de leyenda (Basajaun, lamias, sorginas) ----
  const lb = G.lb, lsz = lb.getSize(new THREE.Vector3());
  if (O.hairLong && G.hasHead) {   // melena que cae por la espalda desde la nuca (el pelo de la cabeza se tiñe del mismo color)
    const g = new THREE.Group(), w = sz.x * 0.36, len = sz.y * (O.hairLen || 1.2);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(w, len, 6, 14), mat(O.hairLong)); back.scale.z = 0.45; back.position.y = -len / 2; g.add(back);
    if (O.shaggy) for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2, t = new THREE.Mesh(new THREE.ConeGeometry(w * 0.3, w * 1.1, 5), mat(O.hairLong)); t.position.set(Math.sin(a) * w * 0.9, -len - w * 0.2, Math.cos(a) * w * 0.2); t.rotation.z = Math.PI; g.add(t); }   // puntas desgreñadas
    put(g, 'head', new THREE.Vector3(hc.x, hc.y + sz.y * 0.12, hb.min.z + sz.z * 0.12));
    if (O.scalp) {   // pelambrera en lo alto de la cabeza (sin tapar la frente), con greñas hacia atrás
      const sc = new THREE.Group(), r = sz.x * 0.5;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(O.hairLong)); cap.scale.y = 0.32; sc.add(cap);
      for (let i = 0; i < 7; i++) { const a = Math.PI * 0.6 + i / 6 * Math.PI * 0.8, t = new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, r * 0.6, 5), mat(O.hairLong)); t.position.set(Math.sin(a) * r * 0.9, r * 0.1, Math.cos(a) * r * 0.9); t.rotation.set(Math.cos(a) * 1.9, 0, -Math.sin(a) * 1.9); sc.add(t); }
      put(sc, 'head', new THREE.Vector3(hc.x, hb.max.y - sz.y * 0.1, hc.z - sz.z * 0.04));
    }
  }
  if (O.beard && G.hasHead) {   // barba espesa del mentón hacia el pecho, con bigote
    const g = new THREE.Group(), w = sz.x * 0.3, len = sz.y * (O.beardLen || 0.5);
    const bd = new THREE.Mesh(new THREE.ConeGeometry(w, len, 12), mat(O.beard)); bd.rotation.x = Math.PI; bd.scale.z = 0.5; bd.position.y = -len / 2; g.add(bd);
    const mo = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.16, w * 0.9, 4, 8), mat(O.beard)); mo.rotation.z = Math.PI / 2; mo.position.set(0, w * 0.12, w * 0.12); g.add(mo);
    put(g, 'head', new THREE.Vector3(hc.x, hb.min.y + sz.y * 0.2, hb.max.z - sz.z * 0.06));
  }
  if (O.fur && G.hasBody) {   // manto de pelo (o toquilla) sobre los hombros, con el borde deshilachado
    const fw = O.furW || 1, geo = new THREE.CylinderGeometry(bs.x * 0.46 * fw, bs.x * 0.66 * fw, bs.y * (O.furLen || 0.6), 18, 3, true), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0) pos.setY(i, y - (O.shawl ? 0 : Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * bs.y * 0.25)); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(O.fur)); m.material.side = THREE.DoubleSide; m.scale.z = Math.max(0.8, bs.z / bs.x * 1.15);
    put(m, 'chest', new THREE.Vector3(bc.x, bb.max.y - bs.y * (O.furLen || 0.6) * 0.5, bc.z));
  }
  if (O.staff) {   // makila o cayado en la mano derecha, de pie
    const hand = bone('handslot.r') || bone('hand.r');
    if (hand) { const hp = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld), L = (bb.max.y - lb.min.y) * 1.25; const st = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.018, L * 0.024, L, 7), mat(O.staff)); put(st, hand.name, new THREE.Vector3(hp.x, lb.min.y + L / 2, hp.z)); }
  }
  if (O.comb && G.hasHead) {   // peine de oro de la lamia, prendido en el pelo
    const g = new THREE.Group(), w = sz.x * 0.5;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.18, w * 0.08), new THREE.MeshStandardMaterial({ color: O.comb, metalness: 0.9, roughness: 0.25 })); g.add(top);
    for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(w * 0.05, w * 0.3, w * 0.05), top.material); t.position.set(-w * 0.42 + i * w * 0.14, -w * 0.2, 0); g.add(t); }
    g.rotation.x = -0.5; put(g, 'head', new THREE.Vector3(hc.x + sz.x * 0.2, hb.max.y - sz.y * 0.05, hc.z - sz.z * 0.25));
  }
  if (O.duckFeet) for (const sd of ['l', 'r']) {   // patas de pato: palmeadas, asomando bajo la falda
    const f = bone('foot.' + sd); if (!f) continue;
    const fp = new THREE.Vector3().setFromMatrixPosition(f.matrixWorld), w = lsz.x * 0.2;
    const g = new THREE.Group(), web = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), mat(O.duckFeet)); web.scale.set(w, w * 0.22, w * 1.4); web.position.z = w * 2.3; g.add(web);
    for (const a of [-0.45, 0, 0.45]) { const toe = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.12, w * 1.1, 3, 6), mat(O.duckFeet)); toe.rotation.set(Math.PI / 2, 0, 0); toe.rotation.y = a; toe.position.set(Math.sin(a) * w * 0.9, 0, w * 2.3 + Math.cos(a) * w * 0.9); g.add(toe); }
    put(g, f.name, new THREE.Vector3(fp.x, lb.min.y + w * 0.2, fp.z));
  }
  if (O.backpack && G.hasBody) {   // mochila del explorador a la espalda: bolsa con solapa, bolsillo, manta enrollada y correas
    const g = new THREE.Group(), w = bs.x * 0.6, h = bs.y * 0.7, d = bs.z * 0.4, P = O.backpack;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(P.bag || '#3f6a4c')); g.add(bag);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.03, h * 0.38, d * 1.06), mat(P.flap || '#2f5239')); flap.position.y = h * 0.33; g.add(flap);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h * 0.32, d * 0.3), mat(P.flap || '#2f5239')); pocket.position.set(0, -h * 0.2, -d * 0.62); g.add(pocket);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.42, d * 0.42, w * 1.15, 12), mat(P.roll || '#b8322a')); roll.rotation.z = Math.PI / 2; roll.position.set(0, h * 0.62, 0); g.add(roll);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(w * 0.1, h * 0.9, d * 0.1), mat(P.strap || '#4a2f1c')); st.position.set(sx * w * 0.3, 0, -d * 0.52); g.add(st); }
    put(g, 'chest', new THREE.Vector3(bc.x, bc.y + bs.y * 0.2, bb.min.z - d * 0.4));
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(bs.x * 0.09, bs.y * 0.62, bs.z * 0.08), mat(P.strap || '#4a2f1c')); put(sh, 'chest', new THREE.Vector3(bc.x + sx * bs.x * 0.24, bc.y + bs.y * 0.12, bb.max.z + bs.z * 0.02)); }   // correas por delante
  }
  // ---- prendas de carnaval y de fiesta (joaldunak, momotxorros, zipoteros, gigantes…) ----
  const onHead = (g, dy = 0) => put(g, 'head', new THREE.Vector3(hc.x, hb.max.y - sz.y * 0.12 + dy, hc.z));
  if (O.cone && G.hasHead) {   // gorro cónico alto (joaldun, miel-otxin), con cintas de colores colgando
    const g = new THREE.Group(), r = sz.x * 0.42, H = sz.y * 1.5;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, H, 20), mat(O.cone)); c.position.y = H / 2; g.add(c);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, r * 0.08, 6, 20), mat(O.ribbons?.[0] || O.accent)); band.rotation.x = Math.PI / 2; band.position.y = r * 0.1; g.add(band);
    (O.ribbons || []).forEach((col, i) => { const a = i / O.ribbons.length * Math.PI * 2, rb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.22, H * 0.7, 0.01), mat(col)); rb.position.set(Math.sin(a) * r * 0.75, H * 0.62, Math.cos(a) * r * 0.75); rb.rotation.y = a; rb.material.side = THREE.DoubleSide; g.add(rb); });
    onHead(g, -sz.y * 0.08);
  }
  if (O.mask && G.hasHead) {   // máscara de carnaval que tapa la cara, con capucha del mismo color
    const g = new THREE.Group(), r = sz.x * 0.54;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), mat(O.mask)); hood.scale.set(1.02, 1.05, 1.02); g.add(hood);
    const face = new THREE.Mesh(new THREE.SphereGeometry(r * 0.78, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(O.maskFace || '#f1e7d6')); face.rotation.x = Math.PI / 2; face.position.z = r * 0.6; face.scale.set(0.95, 1, 0.55); g.add(face);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), mat('#141414')); e.position.set(sx * r * 0.3, r * 0.1, r * 1.06); e.scale.z = 0.5; g.add(e); }
    const m = new THREE.Mesh(new THREE.BoxGeometry(r * 0.5, r * 0.07, r * 0.05), mat('#3a1010')); m.position.set(0, -r * 0.3, r * 1.0); g.add(m);
    put(g, 'head', new THREE.Vector3(hc.x, hc.y, hc.z + sz.z * 0.02));
  }
  if (O.basketHat && G.hasHead) {   // cesta en la cabeza (momotxorro de Altsasu)
    const g = new THREE.Group(), r = sz.x * 0.5;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 0.85, r * 0.9, 16, 1, true), mat(O.basketHat)); b.material.side = THREE.DoubleSide; b.position.y = r * 0.3; g.add(b);
    for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * (0.87 + i * 0.05), r * 0.04, 4, 18), mat('#6a4a22')); ring.rotation.x = Math.PI / 2; ring.position.y = -r * 0.1 + i * r * 0.25; g.add(ring); }
    onHead(g);
  }
  if (O.bicorne && G.hasHead) {   // bicornio (lagunero, caravinagre)
    const g = new THREE.Group(), r = sz.x * 0.5;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.4, r * 1.4, r * 0.5, 3, 1), mat(O.bicorne)); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); b.scale.set(1, 0.35, 1); b.position.y = r * 0.3; g.add(b);
    const cock = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), mat('#c8102e')); cock.position.set(0, r * 0.55, r * 0.15); g.add(cock);
    onHead(g);
  }
  if (O.mitre && G.hasHead) {   // mitra (San Fermín)
    const g = new THREE.Group(), r = sz.x * 0.4;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.4, 4), mat(O.mitre)); m.rotation.y = Math.PI / 4; m.scale.z = 0.6; m.position.y = r * 1.1; g.add(m);
    const cr = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 1.6, r * 0.5), mat('#e8c34a')); cr.position.y = r * 0.9; g.add(cr);
    onHead(g, -sz.y * 0.05);
  }
  if (O.straw && G.hasHead) {   // sombrero de paja de ala ancha
    const g = new THREE.Group(), r = sz.x * 0.5;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.7, r * 1.7, r * 0.06, 24), mat(O.straw)); g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.85, r * 0.6, 18), mat(O.straw)); crown.position.y = r * 0.3; g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, r * 0.14, 18), mat(O.accent || '#7a2a1a')); band.position.y = r * 0.08; g.add(band);
    onHead(g, -sz.y * 0.05);
  }
  if (O.wool && G.hasHead) {   // gorro de lana con borla
    const g = new THREE.Group(), r = sz.x * 0.52;
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(O.wool)); c.scale.y = 0.75; g.add(c);
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 8, 6), mat(O.accent || '#f4f1ea')); p.position.y = r * 0.8; g.add(p);
    onHead(g, -sz.y * 0.12);
  }
  if (O.crown && G.hasHead) {   // corona de oro
    const g = new THREE.Group(), r = sz.x * 0.36, gold = new THREE.MeshStandardMaterial({ color: '#e8c34a', metalness: 0.85, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.35, 16, 1, true), gold); ring.material.side = THREE.DoubleSide; g.add(ring);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, t = new THREE.Mesh(new THREE.ConeGeometry(r * 0.16, r * 0.4, 4), gold); t.position.set(Math.sin(a) * r, r * 0.35, Math.cos(a) * r); g.add(t); }
    onHead(g, sz.y * 0.02);
  }
  if (O.horns && G.hasHead) {   // cuernos (momotxorro)
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(sz.x * 0.09, sz.y * 0.55, 8), mat('#efe6d0')); h.rotation.z = -sx * 0.5; put(h, 'head', new THREE.Vector3(hc.x + sx * sz.x * 0.36, hb.max.y + sz.y * 0.08, hc.z)); }
  }
  if (O.bells && G.hasBody) {   // cencerros a la espalda (joaldunak), colgados de la cintura
    for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(bs.x * 0.16, bs.x * 0.24, bs.y * 0.42, 10), new THREE.MeshStandardMaterial({ color: '#8a7a5a', metalness: 0.7, roughness: 0.4 })); put(b, 'hips', new THREE.Vector3(bc.x + sx * bs.x * 0.2, bb.min.y + bs.y * 0.05, bb.min.z - bs.z * 0.12)); }
  }
  if (O.ribbonsBody && G.hasBody) {   // cintas de colores colgando de los hombros (paloki, miel-otxin)
    O.ribbonsBody.forEach((col, i) => { const rb = new THREE.Mesh(new THREE.BoxGeometry(bs.x * 0.09, bs.y * 0.9, 0.01), mat(col)); rb.material.side = THREE.DoubleSide; const x = bc.x + (i / (O.ribbonsBody.length - 1) - 0.5) * bs.x * 0.9; put(rb, 'chest', new THREE.Vector3(x, bb.max.y - bs.y * 0.45, bb.max.z + 0.01)); });
  }
  return added;
}
/** Viste a un personaje de Meshy (esqueleto Mixamo, una sola malla) con las prendas de un traje: las cajas de cabeza,
 *  tronco y piernas salen de los vértices que mueve cada hueso (en reposo). Su textura no se toca. */
export function dressMeshy(root, O) {
  if (!O || typeof O !== 'object') return [];
  root.updateMatrixWorld(true);
  root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o; });
  const MAP = { head: 'Head', chest: 'Spine2', hips: 'Hips', 'hand.r': 'RightHand', 'handslot.r': 'RightHand', 'foot.l': 'LeftFoot', 'foot.r': 'RightFoot' };
  const bone = (n) => bones[MAP[n] || n] || null;
  const zone = (nm) => /Head|Neck|headfront/.test(nm) ? 'h' : /Leg|Foot|Toe/.test(nm) ? 'l' : /Arm|Hand|Shoulder/.test(nm) ? 'a' : 'b';
  const box = { h: new THREE.Box3(), b: new THREE.Box3(), l: new THREE.Box3() }, v = new THREE.Vector3();
  root.traverse(m => {
    if (!m.isSkinnedMesh) return;
    const g = m.geometry, p = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, names = m.skeleton.bones.map(b => zone(b.name.replace(/^mixamorig:?/, '')));
    for (let i = 0; i < p.count; i += 2) {
      let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      const z = names[best]; if (z === 'a') continue;
      m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld); box[z].expandByPoint(v);   // con la piel aplicada (la malla va en otra escala que el esqueleto)
    }
  });
  if (box.h.isEmpty() || box.b.isEmpty()) return [];
  return garments(root, O, { hasHead: true, hasBody: true, hb: box.h, bb: box.b, lb: box.l.isEmpty() ? box.b : box.l, bone });
}
/** Seres de leyenda con el cuerpo de los personajes nuevos: cuerpo base, altura (m) y traje. */
export const MYTHS = {
  basajaun: { base: 'Barbarian', height: 3.2, female: false, outfit: { id: 'myth-basajaun', shirt: '#5a3e26', pants: '#4a3420', shoes: '#3a2a1c', accent: '#3a2814', hairLong: '#4e3420', hairLen: 0.8, shaggy: true, scalp: true, beard: '#4e3420', beardLen: 0.55, fur: '#5e4128' } },
  lamia: { base: 'Mage', height: 2.5, female: true, outfit: { id: 'myth-lamia', shirt: '#6ab0a0', pants: '#4a9a8a', shoes: '#4a9a8a', accent: '#3a8a7a', hairLong: '#e8c34a', hairLen: 1.5, comb: '#f2c230', skirt: '#4a9a8a', skirtLen: 0.9, duckFeet: '#e8a030' } },
  sorgina: { base: 'Mage', height: 2.3, female: true, outfit: { id: 'myth-sorgina', shirt: '#3d3350', pants: '#2a2440', shoes: '#1e1a22', accent: '#2a2440', hairLong: '#dcd7cf', hairLen: 0.6, cachirulo: '#3d3350', fur: '#2a2440', furLen: 0.5, shawl: true, skirt: '#2a2440', skirtLen: 1 } },
  roldan: { base: 'Knight', height: 2.6, female: false, outfit: 'original' },
};
/** Traje de una comarca para un vecino (mujeres con falda del color de la zona). */
const SKIRTS = { bidasoa: '#2a2a32', 'larraun-leitzaldea': '#3a2a4a', sakana: '#5a3a2a', pamplona: '#f6f3ec', pirineo: '#a8202a', prepirineo: '#2a3a5a', sanguesa: '#6a1e2a', 'tierra-estella': '#1e3a6a', 'valdizarbe-novenera': '#5a2a3a', 'zona-media': '#2a2a3a', 'ribera-alta': '#3a2a2a', ribera: '#4a2a5a' };
export function regionalOutfit(region, female, rnd = Math.random) {
  const base = region === 'pamplona' ? OUTFITS.find(o => o.id === 'sanfermin') : OUTFITS.find(o => o.region === region) || OUTFITS.find(o => o.id === 'casero');
  if (region === 'pamplona' && female) base.skirtF = '#f6f3ec';
  const O = { ...base, id: base.id + (female ? '-f' : '') };
  if (female) { O.skirt = base.skirtF || SKIRTS[region] || '#2a2a32'; O.apron = rnd() < 0.5 ? '#f4f1ea' : undefined; delete O.beret; if (O.cachirulo) { O.scarf = O.cachirulo; delete O.cachirulo; } }
  return O;
}

// elección de traje por personaje (se guarda en el perfil)
