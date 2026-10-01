// Día de mercado en la plaza (algunos días, no siempre): puestos con toldo de colores alrededor de la plaza, cada uno
// con sus productos modelados como son (quesos con la corteza marcada, txistorra colgada en ristras, pimientos del
// piquillo, espárragos en manojo, alcachofas, pochas, cuajada en cuenco de barro, miel, hogazas, fruta…) y quien vende,
// con el traje de su comarca. Hablar con ellos abre la tienda (comprar o hacer trueque).
import * as THREE from 'three';
import { Actor } from '../actors/people.js';
import { addBox, isFree } from '../world/colliders.js';
import { groundHeight } from '../world/heightfield.js';
import { PLACES } from '../world/layout.js';
import { PRODUCTS, crateOf, mergeByMaterial } from '../world/products3d.js';

// puestos según la comarca (la huerta cambia: espárragos y alcachofas en la Ribera, piquillos en Tierra Estella…)
function stallsFor(comarca) {
  const huerta = { ribera: ['alcachofa', 'tomate', 'esparragos', 'berenjena'], 'ribera-alta': ['esparragos', 'piquillo', 'tomate', 'pimiento_verde'], 'tierra-estella': ['piquillo', 'tomate', 'pochas', 'pimiento_rojo'], sanguesa: ['pochas', 'tomate', 'piquillo', 'calabaza'] }[comarca] || ['pochas', 'lechuga', 'zanahoria', 'setas'];
  return [
    { name: 'Quesería', awn: ['#e8c040', '#f6f0dc'], crates: ['queso', 'queso', 'cuna'], hang: null },
    { name: 'Huerta', awn: ['#3a8a3a', '#f6f0dc'], crates: huerta, hang: null },
    { name: 'Txistorra y pan', awn: ['#c8202a', '#f6f0dc'], crates: ['hogaza', 'talo', 'huevos'], hang: 'txistorra' },
    { name: 'Miel y cuajada', awn: ['#d8901a', '#f6f0dc'], crates: ['miel', 'cuajada', 'miel'], hang: null },
    { name: 'Fruta y frutos secos', awn: ['#2a5aa8', '#f6f0dc'], crates: ['manzana', 'manzana_verde', 'uvas', 'almendras'], hang: null },
  ];
}
function awning(c1, c2) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 32, 0, 32, 64); }
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.beginPath(); g.arc(i * 32 + 16, 60, 16, 0, Math.PI); g.fill(); }   // fleco ondulado
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** ¿Hay mercado hoy? Uno de cada dos días (o forzado con ?market=1 / ?market=0). */
export function marketDay(def, rnd = Math.random) {
  const q = new URLSearchParams(location.search).get('market');
  if (q != null) return q === '1';
  return !def.special && rnd() < 0.5;
}

export class Mercado {
  constructor(game) {
    this.g = game; const d = game.def, c = PLACES.plaza, r = Math.max(9, (c.r || 14) - 4);
    this.texs = []; this.stalls = []; this.sellers = [];
    const list = stallsFor(d.comarca), raw = new THREE.Group(), awnings = new THREE.Group();
    let placed = 0; const wood = new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 0.85 });
    for (let k = 0; k < 16 && placed < list.length; k++) {
      const a = k / 16 * Math.PI * 2 + 0.2, x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r;
      if (!isFree(x, z, 2.0) || this.stalls.some(s => Math.hypot(s.x - x, s.z - z) < 5.5)) continue;
      const S = list[placed++], ry = Math.atan2(c.x - x, c.z - z), y = groundHeight(x, z);
      const st = new THREE.Group(); st.position.set(x, y, z); st.rotation.y = ry;
      const add = (o) => { st.add(o); return o; };
      const box = (w, h, dd, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), wood); m.position.set(px, py, pz); return add(m); };
      box(2.6, 0.08, 0.9, 0, 0.85, 0.15); for (const sx of [-1.2, 1.2]) for (const sz of [-0.2, 0.5]) box(0.07, 0.85, 0.07, sx, 0.42, sz);   // mesa de caballetes
      for (const sx of [-1.3, 1.3]) for (const sz of [-0.55, 0.6]) box(0.07, 2.3, 0.07, sx, 1.15, sz);                                      // postes del toldo
      S.crates.forEach((p, i, A) => { const cr = crateOf(p, p === 'queso' || p === 'calabaza' || p === 'lechuga' ? 3 : 6); cr.position.set((i - (A.length - 1) / 2) * (2.3 / A.length), 0.89, 0.15); if (A.length > 3) cr.scale.setScalar(0.85); add(cr); });
      if (S.hang) { box(2.5, 0.04, 0.04, 0, 1.95, 0.55); for (let i = 0; i < 7; i++) { const t = PRODUCTS[S.hang](); t.position.set(-1.05 + i * 0.35, 1.62, 0.55); add(t); } }   // ristras colgadas
      raw.add(st);
      const tex = awning(...S.awn); this.texs.push(tex);
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.5), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
      aw.position.set(0, 2.3, 0.05); aw.rotation.x = -Math.PI / 2 + 0.3; aw.castShadow = true;
      const ag = new THREE.Group(); ag.position.copy(st.position); ag.rotation.y = ry; ag.add(aw); awnings.add(ag);
      addBox(x, z, 2.7, 1.2, ry);
      this.stalls.push({ x, z, ry, name: S.name });
      // quien vende, detrás del puesto, con el traje de la comarca
      const ox = Math.sin(ry), oz = Math.cos(ry), fem = (placed + d.id.length) % 2 === 0;
      const v = new Actor({ id: 'mercado' + placed, name: `${S.name}`, x: x - ox * 0.9, z: z - oz * 0.9, heading: ry, look: { region: d.comarca, female: fem, apron: '#f4f1ea', seed: placed * 7 + d.id.length } }, game.scene);
      v.frozen = true; v.shop = true; v.market = S.name; game.actors.push(v); this.sellers.push(v);
    }
    // todo el género y la madera en pocas mallas (una por material)
    this.obj = mergeByMaterial(raw); this.obj.add(awnings);
    raw.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    game.scene.add(this.obj);
  }
  dispose() { this.g.scene.remove(this.obj); this.obj.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); this.texs.forEach(t => t.dispose()); }
}
