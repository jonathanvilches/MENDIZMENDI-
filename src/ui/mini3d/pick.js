// Recoger lo maduro, en 3D: se va andando despacio a lo largo de la hilera (la viña con sus cepas, alambres y hojas;
// los pimientos del piquillo; las alcachofas) con la cesta delante, y se tocan los racimos morados, los pimientos
// rojos o las alcachofas bien cerradas: vuelan a la cesta. Los verdes, o las alcachofas ya abiertas en flor, no.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { play3d, blip } from './play.js';
import { outdoors, texMat, uvScale, rbox, lathe, tube } from './kit.js';

// hoja de parra: cinco lóbulos, con los nervios marcados (se curva hacia dentro)
function vineLeaf() {
  const s = new THREE.Shape(), N = 60;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = 0.09 * (0.78 + 0.22 * Math.cos(a * 5) + 0.05 * Math.cos(a * 15)) * (1 - 0.25 * Math.max(0, -Math.sin(a))); const x = Math.cos(a) * r, y = Math.sin(a) * r + 0.03; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ShapeGeometry(s, 4), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -(x * x + y * y) * 2.2 + Math.abs(x) * 0.08); }
  g.computeVertexNormals(); return g;
}
// hoja lanceolada y ondulada (pimiento) o larga y aserrada (alcachofa)
function longLeaf(len, wid, saw = 0) {
  const s = new THREE.Shape(), N = 40, L = [], R = [];
  for (let i = 0; i <= N; i++) { const t = i / N, w = Math.sin(t * Math.PI) ** 0.8 * wid * (1 + (saw ? 0.35 * Math.sin(t * Math.PI * saw) : 0)); L.push([w, t * len]); R.push([-w, t * len]); }
  s.moveTo(0, 0); for (const [x, y] of L) s.lineTo(x, y); for (const [x, y] of R.reverse()) s.lineTo(x, y);
  const g = new THREE.ShapeGeometry(s, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * 6 + Math.sin(y / len * Math.PI) * len * 0.12 + Math.sin(y * 40) * 0.004); }
  g.computeVertexNormals(); return g;
}
// racimo de uvas: granos (esferas) en cono, con su raspón; una sola malla
function bunchGeo(seed) {
  let s = seed; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const parts = [], b = new THREE.SphereGeometry(0.014, 10, 8);
  for (let l = 0; l < 9; l++) { const n = Math.max(1, Math.round(9 - l * 0.9)), rr = 0.045 * (1 - l / 10); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + l * 0.7 + r(); parts.push(b.clone().scale(1, 1.08, 1).translate(Math.cos(a) * rr * (0.7 + r() * 0.3), -l * 0.019 - r() * 0.006, Math.sin(a) * rr * (0.7 + r() * 0.3))); } }
  const g = mergeGeometries(parts); parts.forEach(x => x.dispose()); b.dispose(); return g;
}
// pimiento del piquillo: rojo o verde, en pico
const pepperGeo = () => lathe(Array.from({ length: 12 }, (_, i) => { const t = i / 11; return [Math.sin(t * Math.PI * 0.92) * 0.028 * (1 - t * 0.72) + 0.002, -t * 0.12]; }), 14);
// alcachofa cerrada: brácteas en espiral; abierta: brácteas separadas y la flor morada en medio
function artichoke(S, open, mat) {
  const g = new THREE.Group(), br = S.own(new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), v = new THREE.Vector3();
  // cerrada: brácteas solapadas sobre un huevo (más ancho abajo); abierta: las de fuera se abren hacia los lados
  const ROWS = 8;
  for (let row = 0; row < ROWS; row++) for (let i = 0; i < 10; i++) {
    const k = row / (ROWS - 1), a = i / 10 * Math.PI * 2 + row * 0.33, y = 0.01 + k * 0.1, r = 0.058 * Math.sqrt(Math.max(0.05, 1 - ((k - 0.32) / 0.78) ** 2)) * (open ? 1 + (1 - k) * 0.5 : 1);
    const m = new THREE.Mesh(br, mat); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.scale.set(0.85 - k * 0.25, 1.5, 0.42);
    const out = v.set(Math.cos(a), open ? 0.15 + k * 0.6 : 0.55 + k * 0.9, Math.sin(a)).normalize();
    m.lookAt(m.position.clone().add(out)); m.castShadow = true; g.add(m);
  }
  if (open) {   // la flor: un penacho de pelos morados que se abre en cúpula
    const fm = S.mat('#9a3ac8', { roughness: 0.55 }), fg = S.own(new THREE.CylinderGeometry(0.0018, 0.0022, 0.06, 4).translate(0, 0.03, 0));
    for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, tilt = Math.random() * 0.9, f = new THREE.Mesh(fg, fm); f.position.set(0, 0.1, 0); f.rotation.set(Math.cos(a) * tilt, 0, Math.sin(a) * tilt); g.add(f); }
  }
  return g;
}

const CROPS = {
  uva: { good: 'racimos morados', bad: 'Ese racimo está verde: déjalo madurar', hint: 'Toca los racimos morados (maduros) y deja los verdes. Llena la cesta.', y: 0.85 },
  pimiento: { good: 'pimientos rojos', bad: 'Ese aún no está para coger: está verde', hint: 'Coge los pimientos rojos; los verdes, todavía no. Llena la cesta.', y: 0.42 },
  alcachofa: { good: 'alcachofas cerradas', bad: 'Esa ya se ha abierto en flor: ha pasado', hint: 'Corta las alcachofas bien cerradas; las abiertas (con flor morada) ya han pasado.', y: 0.62 },
};

export function pickGame(ui, { title = 'La vendimia', icon = 'grapes', kind = 'uva', need = 12, seconds = 24, hint } = {}) {
  const C = CROPS[kind] || CROPS.uva;
  return play3d(ui, { title, icon, hint: hint || C.hint,
    stage: { bg: '#9cc6ea', hemi: ['#f4f8ff', '#7a6a4a', 1.15], sun: { color: '#fff1d6', intensity: 2.5, pos: [4, 7, 5], extent: 3 } } }, async (S, H, end, isOver) => {
    outdoors(S, { ground: 'soil', groundColor: kind === 'uva' ? '#c8a888' : '#b89a78', hills: kind === 'uva' ? '#8a9a5a' : '#6f9a4f', size: 80 });
    const LEN = 11, X0 = -2;   // se recorren unos ocho metros de hilera mientras dura
    const items = [], leaves = [], rnd = (() => { let s = 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const hitM = S.own(new THREE.MeshBasicMaterial({ visible: false })), hitGeo = S.own(new THREE.SphereGeometry(kind === 'uva' ? 0.085 : 0.07, 8, 6));
    const addItem = (obj, ripe, x, y, z) => { obj.position.set(x, y, z); S.add(obj); const hit = new THREE.Mesh(hitGeo, hitM); hit.position.set(0, kind === 'uva' ? -0.07 : -0.03, 0); obj.add(hit); items.push({ obj, ripe, hit, alive: true }); hit.userData.item = items[items.length - 1]; };
    if (kind === 'uva') {
      // la espaldera: postes, dos alambres, cepas retorcidas con sus brazos y las hojas
      for (let x = X0 - 1; x <= X0 + LEN + 1; x += 2.6) S.mesh(rbox(0.08, 1.5, 0.08, 0.015), texMat(S, 'wood', '#8a7058'), x, 0.75, 0);
      for (const y of [0.9, 1.3]) { const w = S.mesh(new THREE.CylinderGeometry(0.0025, 0.0025, LEN + 3, 4), S.mat('#9aa0a8', { metalness: 0.8, roughness: 0.4 }), X0 + LEN / 2, y, 0); w.rotation.z = Math.PI / 2; w.castShadow = false; }
      const bark = texMat(S, 'bark', '#a08a78');
      for (let x = X0; x <= X0 + LEN; x += 1.1) {
        const tw = [[x, 0, 0], [x + 0.03, 0.3, 0.02], [x - 0.02, 0.6, -0.01], [x + 0.01, 0.86, 0.01]];
        S.mesh(tube(tw, 0.035, 16, 8), bark);
        S.mesh(tube([[x - 0.5, 0.92, 0], [x - 0.2, 0.9, 0.02], [x, 0.87, 0], [x + 0.25, 0.9, -0.02], [x + 0.55, 0.92, 0]], 0.018, 20, 6), bark);
        for (let k = 0; k < 36; k++) leaves.push([x + (rnd() - 0.5) * 1.15, 0.72 + rnd() * 0.85, (rnd() - 0.5) * 0.42, rnd()]);   // la parra frondosa
        for (let k = 0; k < 4; k++) {
          const bx = x - 0.42 + k * 0.28 + (rnd() - 0.5) * 0.08, ripe = rnd() < 0.68;
          const bg = new THREE.Group(); const bm = S.mesh(bunchGeo(Math.floor(rnd() * 1e6)), S.mat(ripe ? '#3e1840' : '#9cc45c', { roughness: 0.32, metalness: 0.05 }), 0, 0, 0, bg);
          bm.rotation.z = (rnd() - 0.5) * 0.3; S.mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.05, 5), S.mat('#6a5030'), 0, 0.025, 0, bg);
          bg.scale.setScalar(1.15); addItem(bg, ripe, bx, 0.78 - rnd() * 0.1, 0.12 + (rnd() - 0.5) * 0.05);
        }
      }
      const lm = new THREE.InstancedMesh(S.own(vineLeaf()), S.mat('#ffffff', { roughness: 0.75, side: THREE.DoubleSide }), leaves.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      leaves.forEach(([x, y, z, r], i) => { lm.setMatrixAt(i, M4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(-0.4 + r * 0.8, r * 6, (r - 0.5) * 0.8)), new THREE.Vector3(1, 1, 1).multiplyScalar(1.4 + r * 0.9))); lm.setColorAt(i, c.set(['#4f7f2e', '#5d8f36', '#6a9a3a', '#47722a'][Math.floor(r * 4)])); });
      lm.castShadow = lm.receiveShadow = !S.low; S.add(lm);
    } else if (kind === 'pimiento') {
      const lg = S.own(longLeaf(0.11, 0.03)), lm2 = [], stem = S.mat('#5a8a3a');
      for (let x = X0; x <= X0 + LEN; x += 0.5) {
        S.mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.45, 6), stem, x, 0.22, 0);
        for (let k = 0; k < 34; k++) lm2.push([x + (rnd() - 0.5) * 0.42, 0.12 + rnd() * 0.42, (rnd() - 0.5) * 0.36, rnd()]);
        for (let k = 0; k < 3; k++) { const ripe = rnd() < 0.62, pg = new THREE.Group(); S.mesh(pepperGeo(), S.mat(ripe ? '#c8141a' : '#3f8a2a', { roughness: 0.25 }), 0, 0, 0, pg); S.mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.03, 6), stem, 0, 0.012, 0, pg); pg.rotation.z = (rnd() - 0.5) * 0.6; pg.scale.setScalar(1.2); addItem(pg, ripe, x - 0.15 + k * 0.15, 0.28 + rnd() * 0.14, 0.15); }
      }
      const lm = new THREE.InstancedMesh(lg, S.mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), lm2.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      lm2.forEach(([x, y, z, r], i) => { lm.setMatrixAt(i, M4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(-0.9 + r * 0.6, r * 6.28, 0.3)), new THREE.Vector3(1, 1, 1).multiplyScalar(1.0 + r * 0.6))); lm.setColorAt(i, c.set(['#3f7a2a', '#4f8a32', '#356a24'][Math.floor(r * 3)])); });
      lm.castShadow = !S.low; S.add(lm);
    } else {
      const lg = S.own(longLeaf(0.55, 0.07, 9)), lm2 = [], green = S.mat('#5f7f45', { roughness: 0.65 }), purple = S.mat('#76704e', { roughness: 0.7 });
      for (let x = X0; x <= X0 + LEN; x += 0.62) {
        for (let k = 0; k < 10; k++) lm2.push([x, 0.05, 0, k / 10 * 6.28 + rnd() * 0.4, rnd()]);
        for (let k = 0; k < 2; k++) {   // cada planta saca dos o tres cabezas, cada una en su tallo
          const ox = (k ? 0.13 : -0.13) + (rnd() - 0.5) * 0.04, hy = 0.42 + rnd() * 0.18;
          const st2 = S.mesh(new THREE.CylinderGeometry(0.011, 0.015, hy, 7), S.mat('#8aa07a'), x + ox * 0.5, hy / 2, 0.06); st2.rotation.z = -ox * 0.9;
          const ripe = rnd() < 0.65, a = artichoke(S, !ripe, ripe ? green : purple); a.scale.setScalar(1.25); addItem(a, ripe, x + ox, hy, 0.07);
        }
      }
      const lm = new THREE.InstancedMesh(lg, S.mat('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), lm2.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      lm2.forEach(([x, y, z, a, r], i) => { lm.setMatrixAt(i, M4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(-1.0 - r * 0.3, a, 0, 'YXZ')), new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + r * 0.4))); lm.setColorAt(i, c.set(['#7f9a7a', '#8aa486', '#6e8a68'][Math.floor(r * 3)])); });
      lm.castShadow = !S.low; S.add(lm);
    }
    // la cesta (de mimbre, delante de quien recoge) y lo que va dentro
    const basket = new THREE.Group(); basket.scale.setScalar(0.72); S.add(basket);
    S.mesh(uvScale(lathe([[0.001, 0], [0.13, 0], [0.15, 0.02], [0.17, 0.1], [0.18, 0.15], [0.175, 0.16], [0.16, 0.155], [0.15, 0.1], [0.13, 0.03], [0.001, 0.025]], 36), 7, 2.5), texMat(S, 'braid', '#c8a468', { side: THREE.DoubleSide }), 0, 0, 0, basket);
    S.mesh(new THREE.TorusGeometry(0.177, 0.012, 8, 36), texMat(S, 'braid', '#a8844e'), 0, 0.158, 0, basket).rotation.x = Math.PI / 2;
    S.mesh(new THREE.TorusGeometry(0.17, 0.011, 8, 30, Math.PI), texMat(S, 'braid', '#a8844e'), 0, 0.158, 0, basket);   // asa
    const inBasket = new THREE.Group(); basket.add(inBasket);

    const fwd = new THREE.Vector3(0, -0.12, -1).normalize();
    // la cámara va despacio a lo largo de la hilera, cerca de las plantas y un poco por encima
    const camAt = (t) => [X0 + 1.5 + Math.min(1, t / seconds) * (LEN - 3), C.y - 0.04, 0.1];
    S.frame(camAt(0), 0.5, [0, 0.2, 1], 44);
    const flying = [];
    let got = 0, bad = 0, t = 0;
    const pick = (e) => {
      if (isOver()) return;
      const h = S.pick(e, items.filter(i => i.alive).map(i => i.hit), false)[0]; if (!h) return;
      const it = h.object.userData.item;
      if (!it.ripe) { bad++; ui.sound?.ui?.('error'); H.fb.textContent = C.bad; it.obj.rotation.z += 0.3; setTimeout(() => { it.obj.rotation.z -= 0.3; }, 160); return; }
      it.alive = false; got++; blip(ui, 600 + got * 30); ui.onMiniHit?.(true);
      flying.push({ it, from: it.obj.getWorldPosition(new THREE.Vector3()), k: 0 });
      H.fb.textContent = got < need * 0.5 ? '¡A la cesta!' : got < need ? '¡Ya pesa la cesta!' : '';
      if (got >= need) end({ win: true }, '¡Cesta llena! Buena cosecha');
    };
    H.cap.addEventListener('pointerdown', pick);
    H.keys(() => {});
    const cp = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3(), right = new THREE.Vector3();
    S.every((dt) => {
      if (!isOver()) { t += dt; H.time(seconds - t); if (t >= seconds) end({ win: got >= need }, got >= need ? '¡Cesta llena!' : `Se acabó: ${got} de ${need}. ¡Más rápido la próxima vez!`); }
      // la cámara avanza por la hilera (se encuadra de nuevo con el centro movido)
      S.view.center.set(...camAt(t)); S.reframe();
      // la cesta, abajo a la derecha delante de la cámara
      S.camera.getWorldDirection(dir); right.crossVectors(dir, S.camera.up).normalize();
      basket.position.copy(S.camera.position).addScaledVector(dir, 0.62).addScaledVector(right, 0.2); basket.position.y -= 0.34;
      to.copy(basket.position).y += 0.14;
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i]; f.k = Math.min(1, f.k + dt * 2.6);
        cp.copy(f.from).lerp(to, f.k); cp.y += Math.sin(f.k * Math.PI) * 0.25; f.it.obj.position.copy(cp); f.it.obj.rotation.y += dt * 6;
        if (f.k >= 1) { flying.splice(i, 1); f.it.obj.removeFromParent(); inBasket.add(f.it.obj); f.it.obj.position.set((Math.random() - 0.5) * 0.18, 0.1 + inBasket.children.length * 0.006, (Math.random() - 0.5) * 0.18); f.it.obj.scale.setScalar(0.8); }
      }
      H.prog(got / need);
    });
    H.time(seconds);
    H.o.state = () => ({ got, items: items.filter(i => i.alive).map(i => ({ ...S.toScreen(i.hit.getWorldPosition(new THREE.Vector3())), ripe: i.ripe })).filter(p => p.front && p.x > 0 && p.x < innerWidth && p.y > 0 && p.y < innerHeight) });
  });
}
