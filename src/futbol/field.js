// Escena del campo de fútbol sala (todo sale de rules.js): césped con franjas de corte y las líneas a escala, porterías
// con postes, larguero y red que se mueve al recibir el balón, vallas a 2 m con rótulos propios (sin marcas), gradas
// (rojas como las de El Sadar, con cubierta y focos, o un graderío sencillo de pueblo con muro de piedra, árboles y
// casas) y la luz. Devuelve la escena y unas pocas funciones para animarla.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIELD as F, PHYS as K, VENUES } from './rules.js';

const PPM = 46;   // píxeles por metro de la textura del césped (las líneas de 8 cm, nítidas)

// césped: franjas de corte de 2,5 m, grano de hierba y las líneas blancas de 8 cm
function pitchTexture(venue) {
  const W = F.L + 2 * F.margin, H = F.W + 2 * F.margin, c = document.createElement('canvas');
  c.width = Math.round(W * PPM); c.height = Math.round(H * PPM);
  const g = c.getContext('2d'), X = (x) => (x + W / 2) * PPM, Y = (z) => (z + H / 2) * PPM;
  const [g1, g2] = venue.grass;
  for (let i = 0; i * 2.5 < W; i++) { g.fillStyle = i % 2 ? g1 : g2; g.fillRect(i * 2.5 * PPM, 0, 2.5 * PPM + 1, c.height); }
  // grano: motas claras y oscuras muy pequeñas (se ve hierba de cerca, liso de lejos)
  const rnd = mulberry(3);
  for (let i = 0; i < 90000; i++) {
    const x = rnd() * c.width, y = rnd() * c.height, l = rnd();
    g.fillStyle = l < 0.5 ? `rgba(20,60,20,${0.05 + rnd() * 0.08})` : `rgba(190,230,150,${0.03 + rnd() * 0.06})`;
    g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 3);
  }
  // sombra suave junto a las vallas
  const edge = g.createLinearGradient(0, 0, 0, c.height); edge.addColorStop(0, 'rgba(0,0,0,0.18)'); edge.addColorStop(0.05, 'rgba(0,0,0,0)'); edge.addColorStop(0.95, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = edge; g.fillRect(0, 0, c.width, c.height);
  // líneas
  g.strokeStyle = 'rgba(255,255,255,0.94)'; g.fillStyle = 'rgba(255,255,255,0.94)'; g.lineWidth = F.line * PPM; g.lineCap = 'butt';
  g.strokeRect(X(-F.HL), Y(-F.HW), F.L * PPM, F.W * PPM);
  g.beginPath(); g.moveTo(X(0), Y(-F.HW)); g.lineTo(X(0), Y(F.HW)); g.stroke();
  g.beginPath(); g.arc(X(0), Y(0), F.circle * PPM, 0, Math.PI * 2); g.stroke();
  const dot = (x, z, r = 0.1) => { g.beginPath(); g.arc(X(x), Y(z), r * PPM, 0, Math.PI * 2); g.fill(); };
  dot(0, 0, 0.12);
  for (const s of [-1, 1]) {
    const gx = s * F.HL, hw = F.goalW / 2;
    // área de fútbol sala: cuartos de círculo de 6 m desde cada poste unidos por una recta
    g.beginPath();
    g.arc(X(gx), Y(-hw), F.area * PPM, s > 0 ? Math.PI * 1.5 : -Math.PI / 2, s > 0 ? Math.PI : 0, s > 0);
    g.lineTo(X(gx - s * F.area), Y(hw));
    g.arc(X(gx), Y(hw), F.area * PPM, s > 0 ? Math.PI : 0, s > 0 ? Math.PI / 2 : Math.PI / 2, s > 0);
    g.stroke();
    dot(gx - s * F.spot, 0); dot(gx - s * F.spot2, 0);
    // cuartos de círculo de los córners (hacia dentro del campo)
    for (const sz of [-1, 1]) { const am = Math.atan2(-sz, -s); g.beginPath(); g.arc(X(gx), Y(sz * F.HW), 0.25 * PPM, am - Math.PI / 4, am + Math.PI / 4); g.stroke(); }
    // marcas de la distancia de 5 m en el córner
    for (const sz of [-1, 1]) { g.beginPath(); g.moveTo(X(gx - s * 5), Y(sz * F.HW)); g.lineTo(X(gx - s * 5), Y(sz * (F.HW + 0.4))); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
  return t;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// red: rejilla blanca con fondo transparente
function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 1.5); g.lineTo(64, 1.5); g.moveTo(1.5, 0); g.lineTo(1.5, 64); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
// balón de fútbol sala: blanco con paneles de color
export function ballTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, 512, 256);
  const pent = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.0); } g.closePath(); g.fill(); };
  for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) pent(x * 76 + (y % 2) * 38 + 18, y * 64 + 32, 19, (x + y) % 3 === 0 ? '#c41f2c' : '#1a1f3a');
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// rótulo de la valla (textos propios del juego)
function boardTexture(lines, bg, fg) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 64);
  g.font = '900 38px Nunito, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = fg;
  let x = 24; for (const l of lines) { g.fillText(l, x, 34); x += g.measureText(l).width + 60; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export function buildField(venueId = 'sadar', { quality = 'high', crowd = null } = {}) {
  const V = VENUES[venueId] || VENUES.sadar, S = new THREE.Scene();
  const owned = { geo: [], mat: [], tex: [] };
  const own = (o) => { if (o.isTexture) owned.tex.push(o); else if (o.isMaterial) owned.mat.push(o); else if (o.isBufferGeometry) owned.geo.push(o); return o; };
  // cielo y luz
  const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256; const sg = sky.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, V.sky[0]); gr.addColorStop(1, V.sky[1]); sg.fillStyle = gr; sg.fillRect(0, 0, 2, 256);
  const skyT = own(new THREE.CanvasTexture(sky)); skyT.colorSpace = THREE.SRGBColorSpace; S.background = skyT;
  S.fog = new THREE.Fog(V.sky[1], 90, 220);
  S.add(new THREE.HemisphereLight('#eef6ff', '#4e6a3c', 1.25));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.3); sun.position.set(-18, 34, 22);
  if (quality !== 'low') { sun.castShadow = true; sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 16, bottom: -16, near: 5, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; }
  S.add(sun, sun.target);

  // suelo: el campo con su margen (textura) y alrededor
  const pt = own(pitchTexture(V));
  const pitch = new THREE.Mesh(own(new THREE.PlaneGeometry(F.L + 2 * F.margin, F.W + 2 * F.margin)), own(new THREE.MeshStandardMaterial({ map: pt, roughness: 0.92, metalness: 0 })));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; S.add(pitch);
  const apron = new THREE.Mesh(own(new THREE.PlaneGeometry(140, 100)), own(new THREE.MeshStandardMaterial({ color: V.env === 'estadio' ? '#4d5248' : '#6f8a4a', roughness: 1 })));
  apron.rotation.x = -Math.PI / 2; apron.position.y = -0.02; apron.receiveShadow = true; S.add(apron);

  // porterías: postes y larguero blancos (8 cm), marco trasero y red con fondo de 1 m
  const white = own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.1 }));
  const frameMat = own(new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.5 }));
  const netT = own(netTexture()), nets = [];
  const hw = F.goalW / 2 + F.postR, H = F.goalH + F.postR, D = F.goalD;
  for (const s of [-1, 1]) {
    const gx = s * F.HL, g = new THREE.Group();
    const post = own(new THREE.CylinderGeometry(F.postR, F.postR, H + F.postR, 16));
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(post, white); m.position.set(gx, (H + F.postR) / 2, z); m.castShadow = true; g.add(m); }
    const bar = new THREE.Mesh(own(new THREE.CylinderGeometry(F.postR, F.postR, 2 * hw + 2 * F.postR, 16)), white); bar.rotation.x = Math.PI / 2; bar.position.set(gx, H, 0); bar.castShadow = true; g.add(bar);
    // marco del fondo: barras finas en el suelo y arriba atrás
    const thin = (len) => own(new THREE.CylinderGeometry(0.02, 0.02, len, 8));
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(thin(D), frameMat); m.rotation.z = Math.PI / 2; m.position.set(gx + s * D / 2, 0.02, z); g.add(m); const u = new THREE.Mesh(thin(D), frameMat); u.rotation.z = Math.PI / 2; u.position.set(gx + s * D / 2, H, z); g.add(u); }
    const bb = new THREE.Mesh(thin(2 * hw), frameMat); bb.rotation.x = Math.PI / 2; bb.position.set(gx + s * D, 0.02, 0); g.add(bb);
    const bt = new THREE.Mesh(thin(2 * hw), frameMat); bt.rotation.x = Math.PI / 2; bt.position.set(gx + s * D, H, 0); g.add(bt);
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(thin(H), frameMat); m.position.set(gx + s * D, H / 2, z); g.add(m); }
    // red: fondo (que se abomba), laterales y techo
    const mk = (w, h, rx, ry) => { const t = netT.clone(); t.needsUpdate = true; t.repeat.set(w / 0.1, h / 0.1); own(t); return own(new THREE.MeshStandardMaterial({ map: t, alphaMap: null, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, color: '#ffffff' })); };
    const backG = own(new THREE.PlaneGeometry(2 * hw, H, 18, 10)), back = new THREE.Mesh(backG, mk(2 * hw, H)); back.rotation.y = Math.PI / 2; back.position.set(gx + s * D, H / 2, 0); g.add(back);
    const base = backG.attributes.position.array.slice();
    for (const z of [-hw, hw]) { const m = new THREE.Mesh(own(new THREE.PlaneGeometry(D, H)), mk(D, H)); m.position.set(gx + s * D / 2, H / 2, z); g.add(m); }
    const top = new THREE.Mesh(own(new THREE.PlaneGeometry(D, 2 * hw)), mk(D, 2 * hw)); top.rotation.x = -Math.PI / 2; top.position.set(gx + s * D / 2, H, 0); g.add(top);
    S.add(g); nets.push({ s, back, base, hits: [] });
  }

  // vallas a 2 m de las líneas, con rótulos propios
  const BH = 0.9, bx = F.HL + F.margin, bz = F.HW + F.margin;
  const boardLines = V.env === 'estadio' ? ['MENDIMENDIZ', 'IRUÑA · PAMPLONA', 'NAFARROA', 'AUPA!', 'MENDIMENDIZ'] : ['MENDIMENDIZ', 'HERRIKO TALDEA', 'AUPA!', 'NAFARROA'];
  const bT1 = own(boardTexture(boardLines, '#c41f2c', '#ffffff')), bT2 = own(boardTexture(boardLines.slice().reverse(), '#16224a', '#ffffff'));
  const board = (len, x, z, ry, tex) => {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set(len / 16, 1); own(t);
    const m = new THREE.Mesh(own(new THREE.BoxGeometry(len, BH, 0.12)), [frameMat, frameMat, frameMat, frameMat, own(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })), own(new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.8 }))]);
    m.position.set(x, BH / 2, z); m.rotation.y = ry; m.receiveShadow = true; S.add(m);
  };
  if (V.env === 'estadio') {
    board(2 * bx, 0, -bz - 0.06, 0, bT1); board(2 * bx, 0, bz + 0.06, Math.PI, bT2);
    board(2 * bz, -bx - 0.06, 0, Math.PI / 2, bT2); board(2 * bz, bx + 0.06, 0, -Math.PI / 2, bT1);
  }

  // gradas
  const seats = [], spots = [];
  const stoneMat = own(new THREE.MeshStandardMaterial({ color: V.env === 'estadio' ? '#8a8a86' : '#a59a86', roughness: 0.95 }));
  const steps = [];
  // una grada recta: filas de 0,8 m de fondo y 0,42 m de alto, de len metros, a dist del centro, mirando al campo
  const stand = (len, dist, rows, ry, y0 = 0.5) => {
    const c = Math.cos(ry), sn = Math.sin(ry);
    for (let k = 0; k < rows; k++) {
      const d = dist + k * 0.8 + 0.4, y = y0 + (k + 1) * 0.42;
      const g = new THREE.BoxGeometry(len, y, 0.8); g.translate(0, y / 2, 0); g.rotateY(ry); g.translate(sn * d, 0, c * d); steps.push(g);
      for (let x = -len / 2 + 0.35; x < len / 2 - 0.2; x += 0.55) {
        const wx = c * x + sn * (d - 0.1), wz = -sn * x + c * (d - 0.1);
        seats.push([wx, y, wz, ry + Math.PI, k]);
      }
    }
    return { top: y0 + rows * 0.42, back: dist + rows * 0.8 };
  };
  let roofs = [];
  if (V.env === 'estadio') {
    // El Sadar: gradas muy pegadas al césped por los cuatro lados, con las esquinas cerradas
    // las de los lados largos siguen hasta cerrar las esquinas; la de la cámara de televisión es más baja (se ve por
    // encima de ella)
    const g0 = bz + 1.4, e0 = bx + 1.4, ends = 12 * 0.8;
    const b = stand(2 * (e0 + ends), g0, 15, Math.PI); stand(2 * (e0 + ends), g0, 6, 0);
    const cE = stand(2 * g0, e0, 12, Math.PI / 2), cW = stand(2 * g0, e0, 12, -Math.PI / 2);
    // cubierta: chapa oscura sobre el fondo y los lados (la del lado de la cámara, encima de ella, no se ve)
    const roofMat = own(new THREE.MeshStandardMaterial({ color: V.roof, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide }));
    const roof = (len, dist, depth, ry, y) => { const g = new THREE.BoxGeometry(len, 0.3, depth); g.rotateX(-0.12); g.translate(0, y, dist + depth / 2); g.rotateY(ry); roofs.push(g); };
    // (sin cubierta ni muro en la grada de la cámara de televisión, que está encima de ella)
    roof(2 * (e0 + ends), g0 - 1, 15, Math.PI, 15.5); roof(2 * g0 + 18, e0 - 1, 12, Math.PI / 2, 14.2); roof(2 * g0 + 18, e0 - 1, 12, -Math.PI / 2, 14.2);
    const rm = new THREE.Mesh(own(mergeGeometries(roofs)), roofMat); S.add(rm);
    // focos bajo el borde de la cubierta
    const lampMat = own(new THREE.MeshBasicMaterial({ color: '#fffbe8' }));
    const lamps = [];
    for (let x = -24; x <= 24; x += 4) for (const z of [-(g0 - 0.6), g0 - 0.6]) { const g = new THREE.BoxGeometry(1.2, 0.25, 0.4); g.translate(x, 15.1, z); lamps.push(g); }
    S.add(new THREE.Mesh(own(mergeGeometries(lamps)), lampMat));
    // muro trasero de las gradas (para que no se vea el vacío)
    const wall = [];
    for (const [len, d, ry] of [[2 * (e0 + ends), b.back + 0.3, Math.PI], [2 * g0 + 24, cE.back + 0.3, Math.PI / 2], [2 * g0 + 24, cW.back + 0.3, -Math.PI / 2]]) {
      const g = new THREE.BoxGeometry(len, 16, 0.5); g.translate(0, 8, d); g.rotateY(ry); wall.push(g);
    }
    S.add(new THREE.Mesh(own(mergeGeometries(wall)), own(new THREE.MeshStandardMaterial({ color: '#6a6c70', roughness: 0.9 }))));
  } else {
    // pueblo: muro de piedra a 2 m, un graderío sencillo en una banda, árboles y casas detrás
    const wallG = [];
    for (const [len, x, z, ry] of [[2 * bx + 0.8, 0, -bz - 0.3, 0], [2 * bx + 0.8, 0, bz + 0.3, 0], [2 * bz, -bx - 0.3, 0, Math.PI / 2], [2 * bz, bx + 0.3, 0, Math.PI / 2]]) {
      const g = new THREE.BoxGeometry(len, 1.1, 0.5); g.translate(0, 0.55, 0); g.rotateY(ry); g.translate(x, 0, z); wallG.push(g);
    }
    const wm = new THREE.Mesh(own(mergeGeometries(wallG)), stoneMat); wm.receiveShadow = true; S.add(wm);
    stand(26, bz + 1.2, 6, Math.PI, 0.2);
    const rnd = mulberry(11), trees = [], crowns = [], houses = [], roofsH = [];
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2, rx = 34 + rnd() * 18, rz = 24 + rnd() * 14, x = Math.cos(a) * rx, z = Math.sin(a) * rz;
      if (Math.abs(z) < bz + 9 && Math.abs(x) < bx + 6) continue;
      const h = 3 + rnd() * 3; const t = new THREE.CylinderGeometry(0.18, 0.26, h, 6); t.translate(x, h / 2, z); trees.push(t);
      const c = new THREE.IcosahedronGeometry(1.8 + rnd() * 1.4, 1); c.translate(x, h + 1.2, z); crowns.push(c);
    }
    for (let i = 0; i < 9; i++) {
      const x = -36 + i * 9 + rnd() * 3, z = -bz - 14 - rnd() * 6, w = 6 + rnd() * 3, h = 6 + rnd() * 4;
      const b = new THREE.BoxGeometry(w, h, 6); b.translate(x, h / 2, z); houses.push(b);
      const r = new THREE.ConeGeometry(w * 0.75, 2.4, 4); r.rotateY(Math.PI / 4); r.translate(x, h + 1.2, z); roofsH.push(r);
    }
    S.add(new THREE.Mesh(own(mergeGeometries(trees)), own(new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1 }))));
    S.add(new THREE.Mesh(own(mergeGeometries(crowns)), own(new THREE.MeshStandardMaterial({ color: '#3e6a2e', roughness: 1, flatShading: true }))));
    S.add(new THREE.Mesh(own(mergeGeometries(houses)), own(new THREE.MeshStandardMaterial({ color: '#e8dcc4', roughness: 0.95 }))));
    S.add(new THREE.Mesh(own(mergeGeometries(roofsH)), own(new THREE.MeshStandardMaterial({ color: '#a4482e', roughness: 0.9, flatShading: true }))));
  }
  if (steps.length) { const m = new THREE.Mesh(own(mergeGeometries(steps)), stoneMat); m.receiveShadow = true; S.add(m); }
  // asientos (instancias): rojos en El Sadar, de madera en el pueblo; algunos con público sentado
  if (seats.length) {
    const sg = own(mergeGeometries([new THREE.BoxGeometry(0.46, 0.08, 0.4).translate(0, 0.42, 0.02), new THREE.BoxGeometry(0.46, 0.42, 0.06).translate(0, 0.64, -0.2)]));
    const sm = own(new THREE.MeshStandardMaterial({ roughness: 0.6 })), im = new THREE.InstancedMesh(sg, sm, seats.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), c1 = new THREE.Color(V.seat), c2 = new THREE.Color(V.seatAlt);
    seats.forEach(([x, y, z, ry, k], i) => { m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), one); im.setMatrixAt(i, m4); im.setColorAt(i, (k % 5 === 4) ? c2 : c1); });
    S.add(im);
    const rnd = mulberry(29);
    for (const [x, y, z, ry] of seats) if (rnd() < (quality === 'low' ? 0.42 : 0.58)) spots.push([x, y + 0.1, z, ry]);
  }
  let people = null;
  if (crowd && spots.length) { try { people = crowd(spots); if (people) S.add(people); } catch (e) { console.warn('público del fútbol', e); } }

  // la red se abomba donde entra el balón y vuelve oscilando
  function netHit(side, z, y, strength = 1) { const n = nets.find(n => n.s === side); if (n) n.hits.push({ z, y, a: Math.min(0.5, 0.12 + strength * 0.03), t: 0 }); }
  function tick(dt, t, camera, excite = 0.3, focus = 0) {
    for (const n of nets) {
      if (!n.hits.length && !n.dirty) continue;
      const pos = n.back.geometry.attributes.position, arr = pos.array; arr.set(n.base);
      n.hits = n.hits.filter(h => (h.t += dt) < 1.4);
      for (let i = 0; i < arr.length; i += 3) {
        // plano girado: x local = −z del mundo (lado), y local = altura
        const lz = -arr[i], ly = arr[i + 1] + H / 2; let d = 0;
        for (const h of n.hits) { const w = Math.exp(-((lz - h.z) ** 2 + (ly - h.y) ** 2) / 0.35); d += h.a * w * Math.exp(-h.t * 3.2) * Math.cos(h.t * 11); }
        arr[i + 2] = n.base[i + 2] + d * n.s;
      }
      pos.needsUpdate = true; n.dirty = n.hits.length > 0;
    }
    people?.tick?.(t, excite, focus, camera);
  }
  function cheer(on) { people?.cheer?.(on); }
  function dispose() {
    S.traverse(o => { if (o.isInstancedMesh) o.dispose?.(); });
    for (const g of owned.geo) g.dispose(); for (const m of owned.mat) m.dispose(); for (const t of owned.tex) t.dispose();
    people?.dispose?.();
  }
  return { scene: S, sun, venue: V, netHit, tick, cheer, dispose, spots };
}
