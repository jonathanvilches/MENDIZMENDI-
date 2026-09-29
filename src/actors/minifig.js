// Minifiguras estilo bloques de construcción: jugador, vecinos y seres de leyenda
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const S = 1.62 / 1.72;   // escala: la minifigura mide ~1,62 m en el mundo
const plastic = new Map();
export function plasticMat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!plastic.has(key)) plastic.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0, ...o }));
  return plastic.get(key);
}
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function rounded(w, h, d, r = 0.03) {
  // caja con cantos suaves (aspecto de pieza de plástico)
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const ax = Math.abs(v.x) > w / 2 - 1e-4, ay = Math.abs(v.y) > h / 2 - 1e-4, az = Math.abs(v.z) > d / 2 - 1e-4;
    if ((ax && ay) || (ax && az) || (ay && az)) { v.x -= Math.sign(v.x) * r * (ax ? 1 : 0) * 0.6; v.y -= Math.sign(v.y) * r * (ay ? 1 : 0) * 0.6; v.z -= Math.sign(v.z) * r * (az ? 1 : 0) * 0.6; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
function trapezoid(wb, wt, h, db, dt) {
  const g = new THREE.BoxGeometry(1, h, 1, 1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    p.setX(i, p.getX(i) * (top ? wt : wb));
    p.setZ(i, p.getZ(i) * (top ? dt : db));
  }
  g.computeVertexNormals();
  return g;
}

// ---------- Estampados (cara y torso) ----------
function faceTex(o) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = o.skin; g.fillRect(0, 0, 256, 128);
  const fx = 192; // frente del cilindro (u = 0,75)
  const ink = '#1b1410';
  if (o.face === 'angry') {
    g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * 17, 56, 10, 9, 0, 0, 7); g.fill(); }
    g.fillStyle = ink; for (const s of [-1, 1]) { g.beginPath(); g.arc(fx + s * 15, 58, 5, 0, 7); g.fill(); }
    g.lineWidth = 6; g.strokeStyle = ink; g.beginPath(); g.moveTo(fx - 30, 36); g.lineTo(fx - 6, 46); g.moveTo(fx + 30, 36); g.lineTo(fx + 6, 46); g.stroke();
    g.fillStyle = '#b8434a'; g.beginPath(); g.ellipse(fx, 80, 12, 16, 0, 0, 7); g.fill();
    g.lineWidth = 4; g.beginPath(); g.moveTo(fx - 16, 100); g.quadraticCurveTo(fx, 90, fx + 16, 100); g.stroke();
  } else {
    // ojos
    g.fillStyle = ink;
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * 17, 58, 5.5, 7, 0, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(fx + s * 17 - 1.5, 55.5, 1.8, 0, 7); g.fill(); }
    // cejas
    g.strokeStyle = o.brows || ink; g.lineWidth = 4; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(fx + s * 9, 43 - (o.face === 'brave' ? -2 : 0)); g.quadraticCurveTo(fx + s * 17, 38, fx + s * 25, 43 + (o.face === 'brave' ? 2 : 0)); g.stroke(); }
    // sonrisa
    g.lineWidth = 4; g.strokeStyle = ink; g.beginPath(); g.arc(fx, 70, 15, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    if (o.cheeks !== false) { g.fillStyle = 'rgba(230,110,100,.35)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * 30, 74, 7, 5, 0, 0, 7); g.fill(); } }
    if (o.freckles) { g.fillStyle = 'rgba(120,60,30,.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(fx - 30 + (i % 3) * 6 + (i > 2 ? 48 : 0), 68 + (i % 2) * 4, 1.4, 0, 7); g.fill(); } }
  }
  if (o.beard) { g.fillStyle = o.beard; g.beginPath(); g.moveTo(fx - 40, 64); g.quadraticCurveTo(fx - 38, 124, fx, 126); g.quadraticCurveTo(fx + 38, 124, fx + 40, 64); g.lineTo(fx + 26, 70); g.quadraticCurveTo(fx, 104, fx - 26, 70); g.fill(); }
  if (o.moustache) { g.fillStyle = o.moustache; g.beginPath(); g.ellipse(fx - 9, 80, 11, 4, 0.25, 0, 7); g.ellipse(fx + 9, 80, 11, 4, -0.25, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function torsoTex(o) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = o.shirt || '#e8e0cc'; g.fillRect(0, 0, 256, 256);
  const pr = o.print || '';
  if (o.vest) { g.fillStyle = o.vest; g.fillRect(0, 0, 76, 256); g.fillRect(180, 0, 76, 256); g.beginPath(); g.moveTo(76, 0); g.lineTo(110, 150); g.lineTo(76, 256); g.fill(); g.beginPath(); g.moveTo(180, 0); g.lineTo(146, 150); g.lineTo(180, 256); g.fill(); g.fillStyle = '#d9b36a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(88, 90 + i * 40, 5, 0, 7); g.fill(); } }
  if (o.apron) { g.fillStyle = o.apron; g.fillRect(60, 110, 136, 146); g.fillRect(80, 30, 96, 90); }
  if (pr === 'osasuna') { g.fillStyle = '#1c2a4a'; g.fillRect(0, 0, 256, 18); g.fillStyle = '#ffffff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText('OSASUNA', 128, 120); g.beginPath(); g.arc(190, 60, 14, 0, 7); g.fill(); }
  if (pr === 'bishop') { g.fillStyle = '#e8c34a'; g.fillRect(104, 0, 48, 256); g.fillStyle = '#b8862a'; for (let y = 10; y < 256; y += 30) { g.beginPath(); g.moveTo(128, y); g.lineTo(140, y + 12); g.lineTo(128, y + 24); g.lineTo(116, y + 12); g.fill(); } }
  if (pr === 'sheet') { g.fillStyle = '#b3242a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(40 + (i * 53) % 190, 60 + (i * 71) % 170, 10 + (i % 3) * 5, 7, i, 0, 7); g.fill(); } }
  if (pr === 'coat') { g.fillStyle = '#e8e0cc'; g.fillRect(100, 0, 56, 256); g.fillStyle = '#d9b36a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(92, 50 + i * 45, 6, 0, 7); g.arc(164, 50 + i * 45, 6, 0, 7); g.fill(); } }
  if (pr === 'buttons') { g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(128, 60 + i * 45, 5, 0, 7); g.fill(); } }
  if (o.sash) { g.fillStyle = o.sash; g.fillRect(0, 214, 256, 42); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 214, 256, 4); }
  if (o.scarf) { g.fillStyle = o.scarf; g.beginPath(); g.moveTo(70, 0); g.lineTo(186, 0); g.lineTo(128, 70); g.fill(); g.beginPath(); g.moveTo(118, 50); g.lineTo(138, 50); g.lineTo(146, 110); g.lineTo(110, 110); g.fill(); }
  if (o.ribbons) ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a', '#b34fc4'].forEach((col, i) => { g.fillStyle = col; g.fillRect(60 + i * 30, 20, 12, 190); });
  if (o.fur) { g.fillStyle = o.fur; for (let i = 0; i < 60; i++) { g.beginPath(); g.ellipse((i * 37) % 256, (i * 53) % 256, 14, 22, i, 0, 7); g.fill(); } }
  // cuello
  g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(128, 0, 34, 14, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- Construcción ----------
// look: { skin, hair, hairStyle, shirt, sleeves, pants, shoes, vest, sash, scarf, apron, print, hat, hatColor, txapela,
//         skirt, beard, moustache, fur, horns, staff, axe, fork, crozier, ball, basket, comb, bell, castanets, height, build, face }
export function buildMinifig(look) {
  const L = { skin: '#f1c7a5', shirt: '#e8e0cc', pants: '#3b3a40', ...look };
  const k = (L.height ? L.height / 1.62 : 1) * S;
  const B = L.build || 1;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.78 * k; body.add(hips);
  const J = {};
  const pants = plasticMat(L.pants), shoes = plasticMat(L.shoes || L.pants);
  // cadera y piernas
  hips.add(mesh(rounded(0.62 * B * k, 0.14 * k, 0.34 * k), pants, 0, 0.02 * k, 0));
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.155 * B * k, -0.03 * k, 0); hips.add(leg);
    leg.add(mesh(rounded(0.29 * B * k, 0.58 * k, 0.32 * k), pants, 0, -0.3 * k, 0));
    if (L.socks) leg.add(mesh(rounded(0.3 * B * k, 0.18 * k, 0.33 * k), plasticMat(L.socks), 0, -0.5 * k, 0));
    leg.add(mesh(rounded(0.3 * B * k, 0.1 * k, 0.42 * k), shoes, 0, -0.62 * k, 0.04 * k));
    J[s < 0 ? 'legL' : 'legR'] = leg;
    const knee = new THREE.Group(); leg.add(knee); J[s < 0 ? 'kneeL' : 'kneeR'] = knee;
  }
  if (L.skirt) { const sk = mesh(new THREE.CylinderGeometry(0.32 * B * k, 0.44 * B * k, 0.5 * k, 16, 1, true), plasticMat(L.skirt, { side: THREE.DoubleSide }), 0, -0.2 * k, 0); hips.add(sk); }
  // torso
  const torso = new THREE.Group(); torso.position.y = 0.09 * k; hips.add(torso); J.torso = torso;
  const tmat = new THREE.MeshStandardMaterial({ map: torsoTex(L), roughness: 0.32 });
  const side = plasticMat(L.shirt);
  const tg = trapezoid(0.66 * B * k, 0.46 * B * k, 0.62 * k, 0.34 * k, 0.28 * k);
  const tm = new THREE.Mesh(tg, [side, side, side, side, tmat, side]); tm.position.y = 0.31 * k; tm.castShadow = true; torso.add(tm);
  if (L.fur) { const f = mesh(new THREE.SphereGeometry(0.42 * k, 10, 8), plasticMat(L.fur, { flatShading: true }), 0, 0.42 * k, -0.08 * k); f.scale.set(1.05, 0.9, 0.7); torso.add(f); }
  if (L.cape) { const cp = mesh(trapezoid(0.62 * k, 0.5 * k, 1.1 * k, 0.04 * k, 0.04 * k), plasticMat(L.cape), 0, 0.1 * k, -0.2 * k); cp.rotation.x = 0.12; torso.add(cp); }
  // brazos
  const armMat = plasticMat(L.sleeves || L.shirt), handMat = plasticMat(L.gloves || L.skin);
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.29 * B * k, 0.52 * k, 0); torso.add(sh);
    const up = mesh(rounded(0.17 * k, 0.44 * k, 0.19 * k, 0.05), armMat, s * 0.06 * k, -0.2 * k, 0); up.rotation.z = s * 0.14; sh.add(up);
    if (L.shortSleeves) { const bare = mesh(rounded(0.15 * k, 0.24 * k, 0.17 * k), handMat, s * 0.09 * k, -0.34 * k, 0); bare.rotation.z = s * 0.14; sh.add(bare); }
    const el = new THREE.Group(); el.position.set(s * 0.1 * k, -0.42 * k, 0.02 * k); sh.add(el);
    // mano en C
    const hand = mesh(new THREE.TorusGeometry(0.07 * k, 0.035 * k, 6, 12, Math.PI * 1.5), handMat, 0, -0.06 * k, 0.06 * k);
    hand.rotation.set(Math.PI / 2, 0, Math.PI * 0.75); el.add(hand);
    el.add(mesh(new THREE.CylinderGeometry(0.05 * k, 0.05 * k, 0.08 * k, 8), handMat, 0, -0.01 * k, 0.02 * k));
    J[s < 0 ? 'armL' : 'armR'] = sh; J[s < 0 ? 'elbowL' : 'elbowR'] = el;
  }
  // cabeza
  const neck = new THREE.Group(); neck.position.y = 0.62 * k; torso.add(neck);
  neck.add(mesh(new THREE.CylinderGeometry(0.09 * k, 0.09 * k, 0.06 * k, 12), plasticMat(L.skin), 0, 0.03 * k, 0));
  const head = new THREE.Group(); head.position.y = 0.06 * k; neck.add(head); J.head = head;
  const big = L.bigHead ? 1.9 : 1;
  const hr = 0.2 * k * big, hh = 0.34 * k * big;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex(L), roughness: 0.3 });
  const hdGeo = new THREE.CylinderGeometry(hr, hr, hh, 28, 1, false);
  const hm = new THREE.Mesh(hdGeo, [faceMat, plasticMat(L.skin), plasticMat(L.skin)]); hm.position.y = hh / 2; hm.rotation.y = Math.PI / 2; hm.castShadow = true; head.add(hm);
  head.add(mesh(new THREE.CylinderGeometry(hr * 0.6, hr * 0.6, 0.07 * k, 16), plasticMat(L.skin), 0, hh + 0.035 * k, 0)); // tetón
  const mouth = new THREE.Object3D(); head.add(mouth); J.mouth = mouth;
  const lids = new THREE.Group(); head.add(lids); J.lids = lids; lids.visible = false;
  for (const s of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(0.06 * k * big, 0.03 * k * big, 0.01), plasticMat(L.skin), s * 0.055 * k * big, hh * 0.56, hr * 0.99); lids.add(l); }
  // pelo y sombreros
  const hairC = L.hair;
  const top = hh + 0.02 * k;
  if (hairC && !L.hat && !L.txapela && L.hairStyle !== 'bald') {
    const hmat = plasticMat(hairC);
    const cap = mesh(new THREE.SphereGeometry(hr * 1.12, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hmat, 0, hh * 0.72, -0.01 * k); cap.scale.set(1, 0.95, 1.02); head.add(cap);
    const back = mesh(new THREE.CylinderGeometry(hr * 1.1, hr * 1.12, hh * 0.7, 20, 1, true, Math.PI * 0.25, Math.PI * 1.5), hmat, 0, hh * 0.5, 0); head.add(back);
    if (L.hairStyle === 'bun') head.add(mesh(new THREE.SphereGeometry(0.1 * k, 12, 10), hmat, 0, hh * 0.95, -hr * 0.9));
    if (L.hairStyle === 'ponytail') { const p = mesh(new THREE.CapsuleGeometry(0.07 * k, 0.3 * k, 4, 8), hmat, 0, hh * 0.5, -hr * 1.15); p.rotation.x = 0.3; head.add(p); }
    if (L.hairStyle === 'long') head.add(mesh(rounded(hr * 2.2, hh * 1.2, 0.1 * k), hmat, 0, hh * 0.1, -hr * 0.95));
    if (L.hairStyle === 'braids') for (const s of [-1, 1]) head.add(mesh(new THREE.CapsuleGeometry(0.045 * k, 0.32 * k, 4, 8), hmat, s * hr * 1.02, 0, -0.03 * k));
    if (L.hairStyle === 'spiky' || L.hairStyle === 'curly') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const sp = mesh(L.hairStyle === 'spiky' ? new THREE.ConeGeometry(0.05 * k, 0.12 * k, 5) : new THREE.SphereGeometry(0.07 * k, 8, 6), hmat, Math.sin(a) * hr * 0.8, hh * 1.02, Math.cos(a) * hr * 0.8 - 0.02 * k); sp.rotation.set(Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6); head.add(sp); }
  }
  if (L.headband) head.add(mesh(new THREE.CylinderGeometry(hr * 1.03, hr * 1.03, 0.05 * k, 20, 1, true), plasticMat(L.headband), 0, hh * 0.78, 0));
  if (L.txapela) { const tx = mesh(new THREE.CylinderGeometry(hr * 1.35, hr * 1.2, 0.07 * k, 24), plasticMat(L.txapela), 0.02 * k, top + 0.02 * k, 0); tx.rotation.z = 0.12; head.add(tx); head.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05 * k, 5), plasticMat(L.txapela), 0, top + 0.08 * k, 0)); }
  const hc = plasticMat(L.hatColor || '#c23b3b');
  if (L.hat === 'straw') { head.add(mesh(new THREE.CylinderGeometry(hr * 2.1, hr * 2.1, 0.03 * k, 24), plasticMat('#e2c46a'), 0, top - 0.02 * k, 0)); head.add(mesh(new THREE.CylinderGeometry(hr * 1.05, hr * 1.1, 0.14 * k, 20), plasticMat('#e2c46a'), 0, top + 0.05 * k, 0)); }
  if (L.hat === 'mitre') { const m = mesh(new THREE.ConeGeometry(hr * 1.05, 0.5 * k, 4), plasticMat('#f4efe0'), 0, top + 0.25 * k, 0); m.scale.z = 0.6; head.add(m); head.add(mesh(new THREE.BoxGeometry(0.04 * k, 0.45 * k, hr * 1.3), plasticMat('#e8c34a'), 0, top + 0.2 * k, 0)); }
  if (L.hat === 'bicorne') { const b = mesh(new THREE.CylinderGeometry(hr * 1.9, hr * 1.9, 0.08 * k, 3, 1), plasticMat('#1a1a1a'), 0, hh * 1.02, 0); b.scale.set(1.1, 1, 0.45); b.rotation.y = Math.PI / 2; head.add(b); head.add(mesh(new THREE.SphereGeometry(hr * 0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), plasticMat('#1a1a1a'), 0, hh * 0.95, 0)); head.add(mesh(new THREE.SphereGeometry(0.06 * k, 8, 6), plasticMat('#c0392b'), hr * 0.4, hh * 1.12, hr * 0.55)); }
  if (L.hat === 'cone') { head.add(mesh(new THREE.ConeGeometry(hr * 1.15, 0.7 * k, 12), hc, 0, top + 0.35 * k, 0)); for (let i = 0; i < 6; i++) { const r = mesh(new THREE.BoxGeometry(0.03 * k, 0.5 * k, 0.005), plasticMat(['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a'][i % 4]), Math.sin(i) * 0.09 * k, top + 0.3 * k, Math.cos(i) * 0.09 * k - 0.05 * k); r.rotation.x = 0.35; head.add(r); } }
  if (L.hat === 'mask') { head.add(mesh(new THREE.CylinderGeometry(hr * 1.06, hr * 1.06, hh * 0.9, 20, 1, true, -Math.PI * 0.35 + Math.PI / 2, Math.PI * 0.7), plasticMat('#f1e7d6', { side: THREE.DoubleSide }), 0, hh * 0.5, 0)); head.add(mesh(new THREE.ConeGeometry(hr * 1.15, 0.5 * k, 12), hc, 0, top + 0.25 * k, 0)); }
  if (L.horns) for (const s of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.06 * k, 0.5 * k, 8), plasticMat('#e8dcc0'), s * hr * 1.2, hh + 0.12 * k, 0); h.rotation.z = -s * 0.9; head.add(h); }
  if (L.crown) head.add(mesh(new THREE.TorusGeometry(hr * 0.95, 0.02 * k, 6, 20), plasticMat('#e8c34a', { metalness: 0.6, roughness: 0.3 }), 0, top, 0)).rotation.x = Math.PI / 2;
  if (L.helmet) head.add(mesh(new THREE.SphereGeometry(hr * 1.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), plasticMat(L.helmet), 0, hh * 0.7, 0));
  if (L.scarf) { const sc = mesh(new THREE.TorusGeometry(0.12 * k, 0.045 * k, 6, 14), plasticMat(L.scarf), 0, 0.62 * k, 0); sc.rotation.x = Math.PI / 2; torso.add(sc); }
  // accesorios en las manos
  const R = J.elbowR, Lh = J.elbowL;
  const wood = plasticMat('#7a5230'), metal = plasticMat('#9aa0a6', { metalness: 0.6, roughness: 0.3 });
  if (L.staff) { R.add(mesh(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, 1.5 * k, 8), wood, 0, -0.1 * k, 0.07 * k)); if (L.staff === 'crook') R.add(mesh(new THREE.TorusGeometry(0.1 * k, 0.03 * k, 6, 12, Math.PI), wood, 0.1 * k, 0.65 * k, 0.07 * k)); J.staff = true; }
  if (L.crozier) { R.add(mesh(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, 1.8 * k, 8), plasticMat('#e8c34a'), 0, 0.2 * k, 0.07 * k)); R.add(mesh(new THREE.TorusGeometry(0.12 * k, 0.03 * k, 6, 14, Math.PI * 1.5), plasticMat('#e8c34a'), 0.12 * k, 1.1 * k, 0.07 * k)); J.staff = true; }
  if (L.axe) { const ax = new THREE.Group(); ax.add(mesh(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, 0.8 * k, 8), wood, 0, 0.3 * k, 0)); ax.add(mesh(rounded(0.24 * k, 0.16 * k, 0.03 * k), metal, 0.1 * k, 0.62 * k, 0)); ax.position.set(0, -0.06 * k, 0.07 * k); R.add(ax); J.tool = ax; }
  if (L.fork) { const f = new THREE.Group(); f.add(mesh(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, 1.5 * k, 8), wood, 0, 0.2 * k, 0)); for (const x of [-0.07, 0, 0.07]) f.add(mesh(new THREE.CylinderGeometry(0.012 * k, 0.012 * k, 0.28 * k, 5), metal, x * k, 1.05 * k, 0)); f.add(mesh(rounded(0.18 * k, 0.03 * k, 0.03 * k), metal, 0, 0.92 * k, 0)); f.position.set(0, -0.06 * k, 0.07 * k); R.add(f); }
  if (L.ball) Lh.add(mesh(new THREE.SphereGeometry(0.11 * k, 14, 10), plasticMat(L.ball), 0, -0.14 * k, 0.1 * k));
  if (L.bladder) { R.add(mesh(new THREE.CylinderGeometry(0.02 * k, 0.02 * k, 0.6 * k, 6), wood, 0, 0.2 * k, 0.07 * k)); R.add(mesh(new THREE.SphereGeometry(0.14 * k, 12, 10), plasticMat('#e8d9a0'), 0, 0.55 * k, 0.07 * k)); }
  if (L.basket) Lh.add(mesh(new THREE.CylinderGeometry(0.16 * k, 0.12 * k, 0.18 * k, 12, 1, true), plasticMat('#a57a45', { side: THREE.DoubleSide }), 0, -0.2 * k, 0.08 * k));
  if (L.comb) R.add(mesh(rounded(0.14 * k, 0.05 * k, 0.02 * k), plasticMat('#ffd24a', { metalness: 0.7, roughness: 0.3 }), 0, -0.1 * k, 0.08 * k));
  if (L.castanets) for (const e of [R, Lh]) e.add(mesh(new THREE.SphereGeometry(0.05 * k, 8, 6), plasticMat('#5a3a1e'), 0, -0.1 * k, 0.08 * k));
  if (L.bell) { const bl = new THREE.Group(); bl.position.set(0, 0.2 * k, -0.25 * k); torso.add(bl); bl.add(mesh(new THREE.CylinderGeometry(0.1 * k, 0.16 * k, 0.28 * k, 10), plasticMat('#6f6552', { metalness: 0.5, roughness: 0.4 }))); J.bell = bl; }
  if (L.glove) R.add(mesh(new THREE.SphereGeometry(0.1 * k, 10, 8), plasticMat(L.glove), 0, -0.06 * k, 0.05 * k));
  root.userData.J = J; root.userData.H = 1.62 * k / S * S + (L.hat || L.txapela ? 0.15 : 0);
  return root;
}

// ---------- Trajes de los personajes jugables (los nueve del juego original) ----------
export const COSTUMES = {
  aizkolari: { skin: '#e6b48f', hair: '#3b2418', hairStyle: 'bun', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', shoes: '#1a1a1a', socks: '#f4f1ea', axe: true, face: 'brave' },
  harrijasotzaile: { skin: '#d9a57f', hair: '#2a1a12', hairStyle: 'short', beard: '#2a1a12', headband: '#f4f1ea', shirt: '#1d1d24', sleeves: '#d9a57f', shortSleeves: true, vest: '#1d1d24', pants: '#f4f1ea', sash: '#5a3a22', shoes: '#4a2f1c', build: 1.18, face: 'brave' },
  momotxorro: { skin: '#e2b08a', hair: '#1a1a1a', beard: '#1a1a1a', shirt: '#f4f1ea', print: 'sheet', pants: '#2b3a6b', shoes: '#4a2f1c', fur: '#8a6a3a', horns: true, fork: true, face: 'angry' },
  'san-fermin': { skin: '#efc8a8', hair: '#6b4a2e', shirt: '#b8232a', print: 'bishop', pants: '#f4efe0', skirt: '#b8232a', cape: '#8f1a20', hat: 'mitre', crozier: true, shoes: '#e8c34a' },
  pelotari: { skin: '#eac1a0', hair: '#2a1a12', hairStyle: 'ponytail', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', shoes: '#f4f1ea', glove: '#1a1a1a', face: 'brave' },
  sanferminero: { skin: '#eac1a0', hair: '#3b2418', hairStyle: 'spiky', shirt: '#f4f1ea', pants: '#f4f1ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#f4f1ea', face: 'brave' },
  rojilla: { skin: '#d9a57f', hair: '#2a1a12', hairStyle: 'curly', shirt: '#d4002a', print: 'osasuna', pants: '#1c2a4a', socks: '#1c2a4a', shoes: '#f4f1ea', ball: '#ffffff', face: 'brave' },
  caravinagre: { skin: '#eab89a', hair: '#dcd7cf', shirt: '#2f6b3a', print: 'coat', pants: '#f4f1ea', shoes: '#1a1a1a', hat: 'bicorne', bigHead: true, bladder: true, face: 'angry' },
  'pastor-navarro': { skin: '#dba882', hair: '#2a1a12', beard: '#3a2a1a', txapela: '#1d1d24', shirt: '#efe9dc', vest: '#3a2a22', scarf: '#c0392b', pants: '#2b2630', shoes: '#4a2f1c', staff: 'crook' },
};

// Convierte el "look" antiguo de los vecinos al estilo de bloques
export function lookToMinifig(l) {
  const hairStyle = l.bun ? 'bun' : l.braids ? 'braids' : l.longHair ? 'long' : l.messy ? 'spiky' : l.bald ? 'bald' : 'short';
  let hat = l.hat === 'mask' ? 'mask' : l.hat === 'straw' ? 'straw' : null;
  return {
    skin: l.skin || '#f1c7a5', hair: l.hair, hairStyle, shirt: l.shirt, sleeves: l.sleeves, pants: l.skirt && !l.pants ? l.skirt : (l.pants || '#3b3a40'), skirt: l.skirt,
    shoes: l.shoes, socks: l.socks, vest: l.vest, sash: l.sash, scarf: l.scarf, apron: l.apron, txapela: l.txapela, hat, hatColor: l.hatColor,
    beard: l.beard, moustache: l.moustache, fur: l.fur, staff: l.staff, basket: l.basket, comb: l.comb, bell: l.bell, castanets: l.castanets,
    ribbons: l.ribbons, crown: l.crown, shortSleeves: l.shortSleeves, gloves: l.gloves, height: l.height ? Math.max(1.2, l.height * 0.95) : undefined, build: l.build,
    face: l.fur ? 'angry' : undefined, horns: l.horns,
  };
}

// ---------- Rig del jugador (misma interfaz que el antiguo protagonista) ----------
export class MinifigRig {
  constructor(look) {
    this.obj = new THREE.Group();
    this.inner = buildMinifig(look);
    this.obj.add(this.inner);
    this.J = this.inner.userData.J;
    this.t = 0; this.phase = 0; this.wave = 0; this.cheer = 0; this.air = 0; this.lean = 0; this.act = 0; this.actKind = null;
    this.inner.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }
  update(dt, speed, grounded, turnRate) {
    const J = this.J; this.t += dt;
    const walk = Math.min(1.3, speed / 3);
    this.phase += dt * (4 + speed * 1.6) * (walk > 0.05 ? 1 : 0);
    const sw = Math.sin(this.phase) * 0.75 * Math.min(1, walk);
    this.air += ((grounded ? 0 : 1) - this.air) * (1 - Math.exp(-12 * dt));
    J.legL.rotation.x = sw * (1 - this.air) + this.air * -0.7;
    J.legR.rotation.x = -sw * (1 - this.air) + this.air * 0.5;
    J.armL.rotation.x = -sw * 0.9 - this.air * 1.2;
    J.armR.rotation.x = sw * 0.9 - this.air * 1.2;
    J.armL.rotation.z = -0.05; J.armR.rotation.z = 0.05;
    J.torso.rotation.y = Math.sin(this.phase) * 0.08 * walk;
    const run = Math.max(0, (speed - 3.5) / 3);
    J.torso.rotation.x = run * 0.12 + Math.sin(this.t * 2) * 0.015 * (1 - walk);
    this.inner.children[0].position.y = Math.abs(Math.cos(this.phase)) * 0.05 * walk;
    J.head.rotation.x = -run * 0.1;
    J.head.rotation.y = Math.sin(this.t * 0.6) * 0.12 * (1 - walk);
    if (this.wave > 0) { this.wave -= dt; J.armR.rotation.x = -2.6 + Math.sin(this.t * 14) * 0.3; }
    if (this.cheer > 0) { this.cheer -= dt; J.armR.rotation.x = -2.9 + Math.sin(this.t * 12) * 0.25; J.armL.rotation.x = -2.9 - Math.sin(this.t * 12) * 0.25; this.inner.children[0].position.y = Math.abs(Math.sin(this.t * 9)) * 0.25; }
    if (this.act > 0) {
      // acciones de oficio: golpear (hacha, martillo), levantar
      this.act -= dt;
      const k = this.act;
      if (this.actKind === 'chop') { J.armR.rotation.x = -2.8 + (1 - Math.min(1, k * 4)) * 2.8; J.armL.rotation.x = J.armR.rotation.x; }
      else if (this.actKind === 'lift') { J.armR.rotation.x = J.armL.rotation.x = -3.0; J.legL.rotation.x = -0.3; J.legR.rotation.x = 0.3; }
      else if (this.actKind === 'pick') { J.torso.rotation.x = 0.7 * Math.sin(Math.min(1, k * 2) * Math.PI); J.armR.rotation.x = J.armL.rotation.x = -0.9; }
    }
    this.lean += (Math.max(-0.2, Math.min(0.2, -turnRate * speed * 0.03)) - this.lean) * (1 - Math.exp(-6 * dt));
    this.inner.rotation.z = this.lean;
    J.lids.visible = (this.t % 3.7) < 0.12;
  }
  doWave() { this.wave = 1.2; }
  doCheer() { this.cheer = 2; }
  doAct(kind, t = 0.5) { this.actKind = kind; this.act = t; }
}
