// Trajes navarros para los personajes KayKit (CC0): se vuelve a pintar su atlas de colores (una rejilla de 8×4
// degradados) solo en las casillas de la ropa, manteniendo el sombreado del degradado, y se les ponen prendas de
// aquí cosidas a los huesos: txapela, pañuelico rojo y faja. Se quitan cascos, capas y sombreros de fantasía.
import * as THREE from 'three';

export const OUTFITS = [
  { id: 'original', name: 'Original' },
  { id: 'sanfermin', name: 'San Fermín', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#efe4cc', accent: '#d42f2f', scarf: '#d42f2f', sash: '#d42f2f' },
  { id: 'dantzari', name: 'Dantzari', shirt: '#f6f3ec', pants: '#f6f3ec', shoes: '#f2ece0', accent: '#c8102e', beret: '#c8102e', sash: '#c8102e' },
  { id: 'casero', name: 'Casero', shirt: '#ede6d4', pants: '#26262c', shoes: '#1e1a18', accent: '#1e1e24', beret: '#1d1d22', sash: '#1e1e24' },
  { id: 'osasuna', name: 'Osasuna', shirt: '#c41f2c', pants: '#16224a', shoes: '#151515', accent: '#16224a' },
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
// atlas repintado: cada casilla de ropa toma el color del traje con la luz de su degradado original
function repaint(map, assign, key) {
  if (textures.has(key)) return textures.get(key);
  const img = map.image, w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
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
export function applyOutfit(root, kk, outfitId) {
  const O = typeof outfitId === 'object' ? outfitId : OUTFITS.find(o => o.id === outfitId);
  if (!O || O.id === 'original') return [];
  const meshes = []; root.traverse(o => { if (o.isMesh && !o.userData.outline) meshes.push(o); });
  const part = (re) => meshes.filter(m => re.test(m.name) && !HIDE.test(m.name));
  for (const m of meshes) if (HIDE.test(m.name)) { m.visible = false; m.userData.want = false; for (const c of m.children) c.visible = false; }
  const head = part(/Head/), body = part(/Body/), arms = part(/Arm/), legs = part(/Leg/);
  const map = (body[0] || meshes[0])?.material?.map; if (!map?.image) return [];
  // casillas: las de la cabeza (piel, pelo, ojos) no se tocan; el resto se reparten entre camisa, pantalón y calzado
  const headCells = new Set(), headArea = new Map(); head.forEach(m => cellsOf(m).forEach((n, k) => { headCells.add(k); headArea.set(k, (headArea.get(k) || 0) + n); }));
  const headTot = [...headArea.values()].reduce((a, b) => a + b, 0) || 1;
  const count = (list) => { const t = new Map(); list.forEach(m => cellsOf(m).forEach((n, k) => { if (!headCells.has(k)) t.set(k, (t.get(k) || 0) + n); })); return [...t.entries()].sort((a, b) => b[1] - a[1]); };
  const assign = new Map(), bodyC = count([...body, ...arms]), legC = count(legs);
  // capuchas (casillas de la cabeza de color saturado verde o azul): pasan al color de la camisa
  for (const k of headCells) { if (headArea.get(k) < headTot * 0.15) continue; const [r, g, b] = avg(map, k); if ((g > r * 1.2 && g > b) || (b > r * 1.3 && b > g * 1.05)) assign.set(k, O.shirt); }
  if (legC.length) { const dark = legC.slice().sort((a, b) => lum(map, a[0]) - lum(map, b[0]))[0][0]; if (legC.length > 1) assign.set(dark, O.shoes); }
  legC.forEach(([k]) => { if (!assign.has(k)) assign.set(k, O.pants); });
  // la tela grande (más del 30 % de la mayor) es la camisa; los trozos pequeños (cinturón, correas, chaleco) el acento
  const top = bodyC[0]?.[1] || 1;
  bodyC.forEach(([k, n]) => { if (!assign.has(k)) assign.set(k, n >= top * 0.3 ? O.shirt : O.accent); });
  if (O.hairLong) {   // el pelo pintado en la cabeza: la casilla grande más oscura que no es piel
    const big = [...headArea.entries()].filter(([k, n]) => n > headTot * 0.06 && !assign.has(k)).sort((a, b) => lum(map, a[0]) - lum(map, b[0]));
    if (big.length > 1) assign.set(big[0][0], O.hairLong);
  }
  const tex = repaint(map, assign, kk + '|' + (O.id || [O.shirt, O.pants, O.shoes, O.accent].join()));
  for (const m of [...head, ...body, ...arms, ...legs]) { m.material = m.material.clone(); m.material.map = tex; }
  // prendas cosidas a los huesos, colocadas sobre la pose de reposo
  root.updateMatrixWorld(true);
  const bone = (n) => { const n2 = n.replace(/\./g, ''); let b = null; root.traverse(o => { if (o.isBone && (o.name === n || o.name === n2)) b = o; }); return b; };   // el cargador quita los puntos («foot.l» → «footl»)
  const box = (list) => { const b = new THREE.Box3(), t = new THREE.Box3(); list.forEach(m => { m.geometry.computeBoundingBox(); t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); b.union(t); }); return b; };
  const added = [], mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const hb = box(head), bb = box(body), sz = hb.getSize(new THREE.Vector3()), bs = bb.getSize(new THREE.Vector3()), hc = hb.getCenter(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3());
  const put = (mesh, boneName, pos) => { const b = bone(boneName) || root; mesh.position.copy(root.worldToLocal(pos.clone())); mesh.castShadow = true; root.add(mesh); mesh.updateMatrixWorld(); b.attach(mesh); added.push(mesh); };
  if (O.beret && head.length) {   // txapela: boina ancha y plana, ladeada, con el txertena (rabito) arriba
    const g = new THREE.Group(), r = sz.x * 0.56;
    const disc = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(O.beret)); disc.scale.y = 0.32; g.add(disc);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.86, r * 0.07, 6, 24), mat(O.beret)); band.rotation.x = Math.PI / 2; g.add(band);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.03, r * 0.05, r * 0.16, 6), mat(O.beret)); tip.position.y = r * 0.36; g.add(tip);
    g.rotation.z = 0.18; g.rotation.x = -0.08;
    put(g, 'head', new THREE.Vector3(hc.x, hb.max.y - sz.y * 0.12, hc.z));
  }
  if (O.cachirulo && head.length) {   // cachirulo: pañuelo atado a la cabeza, con el nudo atrás
    const g = new THREE.Group(), r = sz.x * 0.53;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(O.cachirulo)); cap.scale.y = 0.45; g.add(cap);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), mat(O.cachirulo)); knot.position.set(0, 0.02, -r * 0.95); g.add(knot);
    put(g, 'head', new THREE.Vector3(hc.x, hb.max.y - sz.y * 0.2, hc.z));
  }
  if (O.scarf && body.length) {   // pañuelico anudado al cuello, con el pico por delante
    const g = new THREE.Group(), r = bs.x * 0.34;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 20), mat(O.scarf)); ring.rotation.x = Math.PI / 2; g.add(ring);
    const pico = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 1.1, 3), mat(O.scarf)); pico.rotation.x = Math.PI; pico.position.set(0, -r * 0.5, r * 0.9); pico.scale.z = 0.35; g.add(pico);
    put(g, 'chest', new THREE.Vector3(bc.x, bb.max.y - bs.y * 0.05, bc.z));
  }
  if (O.sash && body.length) {   // faja ancha a la cintura, con las puntas colgando al costado
    const g = new THREE.Group(), rx = bs.x * 0.53, rz = bs.z * 0.6;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, bs.y * 0.16, 24, 1, true), mat(O.sash)); band.scale.set(rx, 1, rz); band.material.side = THREE.DoubleSide; g.add(band);
    const end = new THREE.Mesh(new THREE.BoxGeometry(rx * 0.25, bs.y * 0.32, rz * 0.12), mat(O.sash)); end.position.set(rx * 0.8, -bs.y * 0.16, rz * 0.4); end.rotation.z = 0.15; g.add(end);
    put(g, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.12, bc.z));
  }
  if (O.skirt && body.length) {   // falda larga (mujeres): campana desde la cintura hasta media pierna
    const lb = box(legs), len = (bb.min.y - lb.min.y) * (O.skirtLen || 0.75) + bs.y * 0.12;
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(bs.x * 0.5, bs.x * 0.78, len, 20, 1, true), mat(O.skirt)); sk.material.side = THREE.DoubleSide; sk.scale.z = Math.max(0.8, bs.z / bs.x * 1.1);
    put(sk, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.14 - len / 2, bc.z));
    if (O.apron) { const ap = new THREE.Mesh(new THREE.PlaneGeometry(bs.x * 0.75, len * 0.85), mat(O.apron)); ap.material.side = THREE.DoubleSide; put(ap, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.1 - len * 0.45, bb.max.z + bs.z * 0.25)); }
  }
  // ---- prendas de los seres de leyenda (Basajaun, lamias, sorginas) ----
  const lb = box(legs), lsz = lb.getSize(new THREE.Vector3());
  if (O.hairLong && head.length) {   // melena que cae por la espalda desde la nuca (el pelo de la cabeza se tiñe del mismo color)
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
  if (O.beard && head.length) {   // barba espesa del mentón hacia el pecho, con bigote
    const g = new THREE.Group(), w = sz.x * 0.3, len = sz.y * (O.beardLen || 0.5);
    const bd = new THREE.Mesh(new THREE.ConeGeometry(w, len, 12), mat(O.beard)); bd.rotation.x = Math.PI; bd.scale.z = 0.5; bd.position.y = -len / 2; g.add(bd);
    const mo = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.16, w * 0.9, 4, 8), mat(O.beard)); mo.rotation.z = Math.PI / 2; mo.position.set(0, w * 0.12, w * 0.12); g.add(mo);
    put(g, 'head', new THREE.Vector3(hc.x, hb.min.y + sz.y * 0.2, hb.max.z - sz.z * 0.06));
  }
  if (O.fur && body.length) {   // manto de pelo (o toquilla) sobre los hombros, con el borde deshilachado
    const geo = new THREE.CylinderGeometry(bs.x * 0.46, bs.x * 0.66, bs.y * (O.furLen || 0.6), 18, 3, true), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0) pos.setY(i, y - (O.shawl ? 0 : Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * bs.y * 0.25)); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(O.fur)); m.material.side = THREE.DoubleSide; m.scale.z = Math.max(0.8, bs.z / bs.x * 1.15);
    put(m, 'chest', new THREE.Vector3(bc.x, bb.max.y - bs.y * (O.furLen || 0.6) * 0.5, bc.z));
  }
  if (O.staff) {   // makila o cayado en la mano derecha, de pie
    const hand = bone('handslot.r') || bone('hand.r');
    if (hand) { const hp = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld), L = (bb.max.y - lb.min.y) * 1.25; const st = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.018, L * 0.024, L, 7), mat(O.staff)); put(st, hand.name, new THREE.Vector3(hp.x, lb.min.y + L / 2, hp.z)); }
  }
  if (O.comb && head.length) {   // peine de oro de la lamia, prendido en el pelo
    const g = new THREE.Group(), w = sz.x * 0.5;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.18, w * 0.08), new THREE.MeshStandardMaterial({ color: O.comb, metalness: 0.9, roughness: 0.25 })); g.add(top);
    for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(w * 0.05, w * 0.3, w * 0.05), top.material); t.position.set(-w * 0.42 + i * w * 0.14, -w * 0.2, 0); g.add(t); }
    g.rotation.x = -0.5; put(g, 'head', new THREE.Vector3(hc.x + sz.x * 0.2, hb.max.y - sz.y * 0.05, hc.z - sz.z * 0.25));
  }
  if (O.duckFeet) for (const sd of ['l', 'r']) {   // patas de pato: palmeadas, asomando bajo la falda
    const f = bone('foot.' + sd); if (!f) continue;
    const fp = new THREE.Vector3().setFromMatrixPosition(f.matrixWorld), w = lsz.x * 0.4;
    const g = new THREE.Group(), web = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), mat(O.duckFeet)); web.scale.set(w, w * 0.22, w * 1.4); web.position.z = w * 2.3; g.add(web);
    for (const a of [-0.45, 0, 0.45]) { const toe = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.12, w * 1.1, 3, 6), mat(O.duckFeet)); toe.rotation.set(Math.PI / 2, 0, 0); toe.rotation.y = a; toe.position.set(Math.sin(a) * w * 0.9, 0, w * 2.3 + Math.cos(a) * w * 0.9); g.add(toe); }
    put(g, f.name, new THREE.Vector3(fp.x, lb.min.y + w * 0.2, fp.z));
  }
  return added;
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
let choice = {};
export const setOutfitChoices = (c) => { choice = c || {}; };
export const outfitOf = (id) => choice[id] || 'original';
