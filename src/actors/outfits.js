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
  const tex = repaint(map, assign, kk + '|' + (O.id || [O.shirt, O.pants, O.shoes, O.accent].join()));
  for (const m of [...head, ...body, ...arms, ...legs]) { m.material = m.material.clone(); m.material.map = tex; }
  // prendas cosidas a los huesos, colocadas sobre la pose de reposo
  root.updateMatrixWorld(true);
  const bone = (n) => { let b = null; root.traverse(o => { if (o.isBone && o.name === n) b = o; }); return b; };
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
    const lb = box(legs), ls = lb.getSize(new THREE.Vector3()), len = (bb.min.y - lb.min.y) * 0.75 + bs.y * 0.12;
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(bs.x * 0.5, bs.x * 0.78, len, 20, 1, true), mat(O.skirt)); sk.material.side = THREE.DoubleSide; sk.scale.z = Math.max(0.8, bs.z / bs.x * 1.1);
    put(sk, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.14 - len / 2, bc.z));
    if (O.apron) { const ap = new THREE.Mesh(new THREE.PlaneGeometry(bs.x * 0.75, len * 0.85), mat(O.apron)); ap.material.side = THREE.DoubleSide; put(ap, 'hips', new THREE.Vector3(bc.x, bb.min.y + bs.y * 0.1 - len * 0.45, bb.max.z + bs.z * 0.25)); }
  }
  return added;
}
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
