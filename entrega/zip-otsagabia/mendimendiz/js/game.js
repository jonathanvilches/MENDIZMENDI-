(() => {
'use strict';
const T = THREE;
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- Guardado ----------
const SAVE_KEY = 'mendimendiz-otsagabia-v1';
const fresh = () => ({ step: 0, cards: [], palaces: [], water: 100, done: false, started: false });
let S = fresh();
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} };

// ---------- Geografía (trazado adaptado para jugar) ----------
const riverX = z => 2.4 * Math.sin(z * 0.035);
const zatZ = x => 60 + 2 * Math.sin(x * 0.05);
function riverDist(x, z) {
  let d = Math.abs(x - riverX(z));
  if (x > riverX(z) - 1) d = Math.min(d, Math.abs(z - zatZ(x)));
  return d;
}
function baseHeight(x, z) {
  let h = 7.5 * Math.exp(-((x + 42) ** 2 + (z + 22) ** 2) / (2 * 15 * 15));
  h += 0.7 * Math.sin(x * 0.05 + 1) * Math.sin(z * 0.04);
  const r = Math.hypot(x, z);
  if (r > 72) h += Math.pow(r - 72, 1.45) * 0.09;
  return h;
}
// Frontón (pelota a mano): el frontis mira al oeste y la cancha se abre hacia el pueblo
const FRONTON = { x: 66, z: 24, ry: -Math.PI / 2 };
const frontonLocal = (x, z) => { const dx = x - FRONTON.x, dz = z - FRONTON.z, c = Math.cos(FRONTON.ry), s = Math.sin(FRONTON.ry); return [dx * c - dz * s, dx * s + dz * c]; };
const frontonWorld = (lx, lz) => { const c = Math.cos(FRONTON.ry), s = Math.sin(FRONTON.ry); return { x: FRONTON.x + lx * c + lz * s, z: FRONTON.z - lx * s + lz * c }; };
function frontonPad(x, z) { const [lx, lz] = frontonLocal(x, z); return Math.hypot(Math.max(-7 - lx, lx - 12, 0), Math.max(-2 - lz, lz - 36.5, 0)); }
FRONTON.y = baseHeight(FRONTON.x - 17, FRONTON.z);
function terrainHeight(x, z) {
  let b = baseHeight(x, z); const rd = riverDist(x, z);
  const pd = frontonPad(x, z); if (pd < 10) b = lerp(FRONTON.y, b, smooth(pd / 10));
  if (rd < 3.6) return -1.8;
  if (rd < 7) return lerp(-1.8, b, smooth((rd - 3.6) / 3.4));
  return b;
}
const WATER_Y = -0.75;

// Puentes: el medieval en la calle principal y otros dos de piedra
const BRIDGES = [
  { z: 5, w: 3.4, arch: 1.5, main: true },
  { z: -42, w: 2.8, arch: 0.9 },
  { z: 34, w: 2.8, arch: 0.9 }
];
BRIDGES.forEach(b => {
  b.cx = riverX(b.z); b.xa = b.cx - 7.5; b.xb = b.cx + 7.5;
  b.ha = terrainHeight(b.xa, b.z); b.hb = terrainHeight(b.xb, b.z);
});
function deckY(b, x) {
  const t = clamp((x - b.xa) / (b.xb - b.xa), 0, 1);
  return lerp(b.ha, b.hb, t) + b.arch * (1 - (2 * t - 1) ** 2) + 0.02;
}
function bridgeAt(x, z) {
  for (const b of BRIDGES) if (Math.abs(z - b.z) < b.w / 2 && x > b.xa && x < b.xb) return b;
  return null;
}
function groundY(x, z) {
  const b = bridgeAt(x, z);
  const t = terrainHeight(x, z);
  return b ? Math.max(t, deckY(b, x)) : t;
}

// Calles: cada una une dos lugares concretos
const STREETS = [
  { name: 'Camino de entrada', pts: [[-34, 96], [-20, 70], [-8, 54]] },
  { name: 'Calle principal (orilla oeste)', pts: [[-8, 54], [-10, 30], [-10, 5], [-11, -20], [-11, -42], [-12, -62]] },
  { name: 'Puente medieval', pts: [[-10, 5], [10, 5]] },
  { name: 'Calle de la orilla este', pts: [[16, 50], [16, 34], [16, 5], [16, -20], [16, -42], [15, -60]] },
  { name: 'Plaza', pts: [[10, 5], [22, 5]] },
  { name: 'Subida a la iglesia', pts: [[-11, -14], [-20, -17], [-29, -21]] },
  { name: 'Puente norte', pts: [[-11, -42], [16, -42]] },
  { name: 'Puente sur', pts: [[-10, 34], [16, 34]] },
  { name: 'Camino del prado', pts: [[22, 5], [38, 2], [48, -4]] }
];
const SEGS = [];
STREETS.forEach(s => { for (let i = 0; i < s.pts.length - 1; i++) SEGS.push([s.pts[i], s.pts[i + 1]]); });
function streetDist(x, z) {
  let m = 1e9;
  for (const [a, b] of SEGS) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
    m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return m;
}

// ---------- Escena ----------
const app = $('app');
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = T.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
app.appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;

const scene = new T.Scene();
const HORIZON = new T.Color('#9fd2ff');
scene.fog = new T.Fog(HORIZON, 110, 340);
const camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600);

scene.add(new T.HemisphereLight('#cfe6ff', '#3f5f26', 0.62));
const sun = new T.DirectionalLight('#ffe0a8', 1.35);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
const SC = sun.shadow.camera; SC.left = -45; SC.right = 45; SC.top = 45; SC.bottom = -45; SC.near = 1; SC.far = 200;
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

// Cielo
{
  const g = new T.SphereGeometry(500, 24, 16);
  const col = [], p = g.attributes.position, top = new T.Color('#2a78dc'), c = new T.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 500; c.copy(HORIZON).lerp(top, clamp(y * 1.6, 0, 1)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  scene.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false })));
  const cm = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.92, fog: false });
  for (let i = 0; i < 14; i++) {
    const cl = new T.Group(), a = rnd() * Math.PI * 2, d = 250 + rnd() * 120, y = 70 + rnd() * 50;
    for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.SphereGeometry(8 + rnd() * 7, 10, 8), cm); s.position.set(k * 10 - 15, rnd() * 4, rnd() * 6); s.scale.y = 0.55; cl.add(s); }
    cl.position.set(Math.cos(a) * d, y, Math.sin(a) * d); cl.lookAt(0, y, 0); scene.add(cl);
  }
}

// Texturas pintadas por código
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function stoneBlocks(g, w, h, base, joints, rows = 9) {
  g.fillStyle = joints; g.fillRect(0, 0, w, h);
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -(r % 2) * 18;
    while (x < w) {
      const bw = 26 + rnd() * 30; const l = 0.9 + rnd() * 0.22;
      const c = new T.Color(base).multiplyScalar(l);
      g.fillStyle = '#' + c.getHexString();
      g.fillRect(x + 1.5, r * rh + 1.5, bw - 3, rh - 3); x += bw;
    }
  }
}
const stoneTex = canvasTex(256, 256, (g, w, h) => stoneBlocks(g, w, h, '#cfc2a8', '#8f8472', 10), [2, 2]);
const churchTex = canvasTex(256, 256, (g, w, h) => stoneBlocks(g, w, h, '#c9b99a', '#857863', 8), [3, 4]);
function facade(variant) {
  return canvasTex(256, 256, (g, w, h) => {
    stoneBlocks(g, w, h, ['#dccaa6', '#cdb892', '#e8dcc6', '#d9c29a', '#e3cfae'][variant], '#8f7f66', 11);
    const plaster = [null, null, 'rgba(250,246,236,.8)', 'rgba(244,205,140,.72)', 'rgba(240,196,178,.7)'][variant];
    if (plaster) { g.fillStyle = plaster; g.fillRect(0, 0, w, h); }
    // portalón de arco
    g.fillStyle = '#9b8d74'; g.beginPath(); g.moveTo(92, 256); g.lineTo(92, 186); g.arc(128, 186, 36, Math.PI, 0); g.lineTo(164, 256); g.fill();
    g.fillStyle = ['#6b3a1c', '#2f6e3e', '#8a2b22', '#274f8f', '#6b3a1c'][variant]; g.beginPath(); g.moveTo(100, 256); g.lineTo(100, 188); g.arc(128, 188, 28, Math.PI, 0); g.lineTo(156, 256); g.fill();
    g.strokeStyle = '#3e2715'; g.lineWidth = 2; for (let x = 106; x < 156; x += 9) { g.beginPath(); g.moveTo(x, 256); g.lineTo(x, 170); g.stroke(); }
    // ventanas geminadas con contraventanas
    const shutter = ['#2f9a52', '#c8342a', '#2f6fd0', '#1f8a7a', '#e0801e'][variant];
    [[40, 70], [168, 70], [40, 140], [168, 140]].forEach(([x, y], i) => {
      if (i >= 2 && variant === 1) return;
      g.fillStyle = '#8c7f69'; g.fillRect(x - 3, y - 3, 54, 50);
      for (const dx of [0, 26]) {
        g.fillStyle = '#2d3440'; g.beginPath(); g.moveTo(x + dx, y + 44); g.lineTo(x + dx, y + 10); g.arc(x + dx + 11, y + 10, 11, Math.PI, 0); g.lineTo(x + dx + 22, y + 44); g.fill();
        g.fillStyle = 'rgba(160,200,230,.35)'; g.fillRect(x + dx + 3, y + 12, 7, 28);
      }
      g.fillStyle = shutter; g.fillRect(x - 14, y, 10, 44); g.fillRect(x + 52, y, 10, 44);
    });
  });
}
const FACADES = [0, 1, 2, 3, 4].map(facade);
const FACADE_MATS = FACADES.map(f => new T.MeshStandardMaterial({ map: f, roughness: 0.95 }));
const sideTex = canvasTex(256, 256, (g, w, h) => {
  stoneBlocks(g, w, h, '#d3c6ab', '#978b76', 11);
  g.fillStyle = '#2d3440'; g.fillRect(110, 80, 34, 44); g.fillStyle = '#6b4a2e'; g.fillRect(100, 80, 8, 44); g.fillRect(146, 80, 8, 44);
});
const shieldTex = canvasTex(128, 128, (g) => {
  g.fillStyle = '#b9ab8e'; g.beginPath(); g.moveTo(14, 10); g.lineTo(114, 10); g.lineTo(114, 60); g.quadraticCurveTo(114, 110, 64, 122); g.quadraticCurveTo(14, 110, 14, 60); g.closePath(); g.fill();
  g.strokeStyle = '#7e715b'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#8d7f66'; g.fillRect(58, 22, 12, 80); g.fillRect(30, 48, 68, 12);
});
const waterTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#149ad6'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(255,255,255,${0.12 + rnd() * 0.22})`; g.lineWidth = 1 + rnd() * 2; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 8, x + 2, y + 18 + rnd() * 14); g.stroke(); }
}, [1, 8]);

const M = {
  stone: new T.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 }),
  church: new T.MeshStandardMaterial({ map: churchTex, roughness: 0.95 }),
  side: new T.MeshStandardMaterial({ map: sideTex, roughness: 0.95 }),
  roofs: ['#c4432a', '#a3321e', '#d8663a', '#3f4b66'].map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true })),
  wood: new T.MeshStandardMaterial({ color: '#8a4a22', roughness: 0.85 }),
  dark: new T.MeshStandardMaterial({ color: '#2b2630', roughness: 1 }),
  plain: new T.MeshStandardMaterial({ color: '#f1e5c9', roughness: 1 }),
  shield: new T.MeshStandardMaterial({ map: shieldTex, transparent: true, roughness: 1 }),
  water: new T.MeshStandardMaterial({ map: waterTex, color: '#ffffff', roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.9, side: T.DoubleSide }),
  flowers: ['#ff2d6f', '#ff8a1f', '#ffd21f', '#c04dff'].map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.8 })),
  leaf: new T.MeshStandardMaterial({ color: '#4d8a3a', roughness: 0.9 })
};

// ---------- Terreno ----------
{
  const size = 260, seg = isTouch ? 150 : 190;
  const g = new T.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = [];
  const grassA = new T.Color('#5bbd3a'), grassB = new T.Color('#3a9630'), cobble = new T.Color('#c9a26e'),
        gravel = new T.Color('#b9a57f'), rock = new T.Color('#8f8f86'), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = terrainHeight(x, z); p.setY(i, y);
    const n = 0.5 + 0.5 * Math.sin(x * 0.31 + Math.sin(z * 0.17) * 2) * Math.cos(z * 0.23);
    c.copy(grassA).lerp(grassB, n);
    const rd = riverDist(x, z);
    if (rd < 6.5) c.lerp(gravel, smooth(clamp((6.5 - rd) / 2.5, 0, 1)));
    const sd = streetDist(x, z);
    if (sd < 2.6 && rd > 5.5) c.lerp(cobble, smooth(clamp((2.6 - sd) / 0.8, 0, 1)) * (0.9 + 0.1 * n));
    if (y > 14) c.lerp(rock, clamp((y - 14) / 16, 0, 0.85));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.receiveShadow = true; scene.add(m);
}

// Montañas del Pirineo alrededor
{
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + rnd() * 0.2, d = 175 + rnd() * 60, r = 40 + rnd() * 35, h = 45 + rnd() * 60;
    const g = new T.ConeGeometry(r, h, 9, 4); const p = g.attributes.position, col = [], c = new T.Color();
    for (let k = 0; k < p.count; k++) {
      const t = (p.getY(k) + h / 2) / h;
      p.setX(k, p.getX(k) * (0.9 + rnd() * 0.2)); p.setZ(k, p.getZ(k) * (0.9 + rnd() * 0.2));
      c.set('#2c7d36').lerp(new T.Color('#8a8f82'), smooth(clamp((t - 0.45) / 0.35, 0, 1)));
      if (t > 0.86) c.lerp(new T.Color('#eef1f2'), 0.6);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new T.Mesh(g, mat); m.position.set(Math.cos(a) * d, h / 2 - 8, Math.sin(a) * d); scene.add(m);
  }
}

// ---------- Ríos Anduña y Zatoya ----------
function ribbon(points, half) {
  const pos = [], uv = [], idx = [];
  let len = 0;
  points.forEach((pt, i) => {
    if (i) len += Math.hypot(pt[0] - points[i - 1][0], pt[1] - points[i - 1][1]);
    const nx = pt[2], nz = pt[3];
    pos.push(pt[0] - nx * half, WATER_Y, pt[1] - nz * half, pt[0] + nx * half, WATER_Y, pt[1] + nz * half);
    uv.push(0, len / 16, 1, len / 16);
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.setAttribute('normal', new T.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
  return g;
}
const waterMeshes = [];
{
  const pts = [];
  for (let z = -130; z <= 130; z += 2) pts.push([riverX(z), z, 1, 0]);
  const w1 = new T.Mesh(ribbon(pts, 3.9), M.water);
  const pts2 = [];
  for (let x = riverX(60); x <= 130; x += 2) pts2.push([x, zatZ(x), 0, 1]);
  const m2 = M.water.clone(); m2.map = waterTex.clone(); m2.map.needsUpdate = true; m2.map.repeat.set(1, 8);
  const w2 = new T.Mesh(ribbon(pts2, 3.9), m2);
  w1.receiveShadow = w2.receiveShadow = true;
  scene.add(w1, w2); waterMeshes.push(w1, w2);
}

// ---------- Colisiones ----------
const BOXES = []; // {x,z,r,hw,hd}
function addBox(x, z, r, w, d) { BOXES.push({ x, z, r, hw: w / 2, hd: d / 2 }); }
function shadowAll(o) { o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); return o; }

// ---------- Puentes ----------
function buildBridge(b) {
  const sh = new T.Shape(), N = 24, L = b.xb - b.xa, archR = b.main ? 2.5 : 2.1, archY = -1.9;
  const top = x => deckY(b, x);
  sh.moveTo(-L / 2, -2.4);
  for (let i = 0; i <= N; i++) { const lx = -L / 2 + L * i / N; sh.lineTo(lx, top(b.cx + lx)); }
  sh.lineTo(L / 2, -2.4); sh.lineTo(archR, -2.4); sh.lineTo(archR, archY);
  for (let i = 1; i < 16; i++) { const a = Math.PI * i / 16; sh.lineTo(Math.cos(a) * archR, archY + Math.sin(a) * archR * 1.02); }
  sh.lineTo(-archR, archY); sh.lineTo(-archR, -2.4); sh.lineTo(-L / 2, -2.4);
  const g = new T.ExtrudeGeometry(sh, { depth: b.w, bevelEnabled: false });
  const uvs = g.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 0.25, uvs.getY(i) * 0.25);
  const m = new T.Mesh(g, M.stone); m.position.set(b.cx, 0, b.z - b.w / 2);
  const grp = new T.Group(); grp.add(m);
  // pretiles
  for (const side of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const x0 = b.xa + L * i / 14, x1 = b.xa + L * (i + 1) / 14, y0 = top(x0), y1 = top(x1);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const p = new T.Mesh(new T.BoxGeometry(len + 0.05, 0.62, 0.34), M.stone);
      p.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.31, b.z + side * (b.w / 2 - 0.17));
      p.rotation.z = Math.atan2(y1 - y0, x1 - x0); grp.add(p);
    }
  }
  scene.add(shadowAll(grp));
}
BRIDGES.forEach(buildBridge);

// ---------- Casas pirenaicas ----------
function roofGeo(w, d, rise, over) {
  const hw = w / 2 + over, hd = d / 2 + over;
  const v = [
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, 0, rise, -hd, 0, rise, hd
  ];
  const idx = [0, 3, 5, 0, 5, 4, 2, 1, 4, 2, 4, 5, 3, 2, 5, 1, 0, 4, 0, 1, 2, 0, 2, 3];
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
function hipRoofGeo(w, d, rise, over) {
  const hw = w / 2 + over, hd = d / 2 + over, r = Math.min(hw, hd) * 0.55;
  const v = [-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, 0, rise, -hd + r, 0, rise, hd - r];
  const idx = [0, 3, 5, 0, 5, 4, 2, 1, 4, 2, 4, 5, 3, 2, 5, 1, 0, 4, 0, 1, 2, 0, 2, 3];
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
function house(x, z, face, o = {}) {
  // face: ángulo hacia el que mira la fachada principal
  const w = o.w || 7 + rnd() * 2, d = o.d || 8 + rnd() * 2, h = o.h || 7.5 + rnd() * 2.5;
  if (!o.force && BOXES.some(b => Math.hypot(x - b.x, z - b.z) < (Math.max(w, d) / 2 + Math.max(b.hw, b.hd)) * 0.95)) return null;
  const grp = new T.Group();
  const y0 = Math.min(terrainHeight(x - w / 2, z), terrainHeight(x + w / 2, z), terrainHeight(x, z - d / 2), terrainHeight(x, z + d / 2)) - 0.4;
  const mats = [M.side, M.side, M.plain, M.plain, FACADE_MATS[o.variant != null ? o.variant : Math.floor(rnd() * 5)], M.side];
  const body = new T.Mesh(new T.BoxGeometry(w, h, d), mats); body.position.y = h / 2; grp.add(body);
  const roofM = M.roofs[o.roof != null ? o.roof : Math.floor(rnd() * 3)];
  const rise = w * (0.62 + rnd() * 0.12);
  const roof = new T.Mesh(rnd() < 0.35 && !o.gable ? hipRoofGeo(w, d, rise, 0.55) : roofGeo(w, d, rise, 0.55), roofM);
  roof.position.y = h; grp.add(roof);
  const ch = new T.Mesh(new T.BoxGeometry(0.8, 1.8, 0.8), M.plain); ch.position.set(w * 0.22, h + rise * 0.6, -d * 0.2); grp.add(ch);
  if (o.shield || rnd() < 0.3) { const s = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), M.shield); s.position.set(0, h * 0.44, d / 2 + 0.03); grp.add(s); }
  if (o.balcony || rnd() < 0.55) {
    const bal = new T.Group();
    const floor = new T.Mesh(new T.BoxGeometry(w * 0.7, 0.18, 1.1), M.wood); bal.add(floor);
    for (let i = 0; i <= 4; i++) { const pst = new T.Mesh(new T.BoxGeometry(0.1, 0.95, 0.1), M.wood); pst.position.set(-w * 0.35 + i * w * 0.7 / 4, 0.5, 0.5); bal.add(pst); }
    const rail = new T.Mesh(new T.BoxGeometry(w * 0.7, 0.1, 0.12), M.wood); rail.position.set(0, 0.98, 0.5); bal.add(rail);
    for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.SphereGeometry(0.26, 7, 5), M.flowers[i % 4]); f.position.set(-w * 0.27 + i * w * 0.18, 1.05, 0.55); f.scale.y = 0.7; bal.add(f); }
    bal.position.set(0, h * 0.58, d / 2 + 0.55); grp.add(bal);
  }
  grp.position.set(x, y0, z); grp.rotation.y = face;
  scene.add(shadowAll(grp));
  addBox(x, z, face, w + 0.3, d + 0.3);
  return { x, z, face, w, d, h, y0 };
}
// Coloca una casa a un lado de la calle y orientada hacia ella
function houseToward(x, z, sx, sz, o) { return house(x, z, Math.atan2(sx - x, sz - z), o); }

// Plaza
houseToward(26, 13, 16, 7, { balcony: true, force: true }); houseToward(26, -2.5, 16, 3, { variant: 2, force: true });

// Palacios (más grandes, con escudo)
const PALACES = [
  { id: 'urrutia', name: 'Palacio de Urrutia', x: -21, z: -38, sx: -11, sz: -38 },
  { id: 'iriarte', name: 'Palacio de Iriarte', x: 25, z: -20, sx: 16, sz: -20 },
  { id: 'donamaria', name: 'Palacio de Donamaría', x: 25, z: 28, sx: 16, sz: 28 }
];
PALACES.forEach(p => {
  const hInfo = houseToward(p.x, p.z, p.sx, p.sz, { w: 10, d: 10, h: 10.5, shield: true, balcony: true, gable: true, roof: 3, variant: 0, force: true });
  const dir = Math.atan2(p.sx - p.x, p.sz - p.z);
  p.dx = p.x + Math.sin(dir) * 6.6; p.dz = p.z + Math.cos(dir) * 6.6;
});

// Iglesia de San Juan Evangelista (parte alta)
const CHURCH = { x: -44, z: -22 };
{
  const g = new T.Group(), y0 = Math.min(...[[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9], [7, 7], [-7, -7], [7, -7], [-7, 7]].map(([a, b]) => terrainHeight(CHURCH.x + a, CHURCH.z + b))) - 0.3, face = Math.atan2(-29 - CHURCH.x, -21 - CHURCH.z);
  const nave = new T.Mesh(new T.BoxGeometry(10, 9, 18), M.church); nave.position.set(0, 4.5, -2); g.add(nave);
  const nr = new T.Mesh(roofGeo(10, 18, 4.2, 0.4), M.roofs[1]); nr.position.set(0, 9, -2); g.add(nr);
  const tower = new T.Mesh(new T.BoxGeometry(5.2, 21, 5.2), M.church); tower.position.set(-3.2, 10.5, 8); g.add(tower);
  for (const [px, pz, ry] of [[0, 2.62, 0], [0, -2.62, 0], [2.62, 0, Math.PI / 2], [-2.62, 0, Math.PI / 2]]) {
    const o = new T.Mesh(new T.BoxGeometry(1.4, 2.6, 0.2), M.dark); o.position.set(-3.2 + px, 17.5, 8 + pz); o.rotation.y = ry; g.add(o);
  }
  const spire = new T.Mesh(new T.ConeGeometry(4, 5.5, 4), M.roofs[3]); spire.rotation.y = Math.PI / 4; spire.position.set(-3.2, 23.7, 8); g.add(spire);
  const door = new T.Mesh(new T.BoxGeometry(2.6, 4, 0.3), M.wood); door.position.set(1.6, 2.2, 7.05); g.add(door);
  const porch = new T.Mesh(new T.BoxGeometry(4.2, 0.5, 2.2), M.church); porch.position.set(1.6, 4.5, 7.9); g.add(porch);
  g.position.set(CHURCH.x, y0, CHURCH.z); g.rotation.y = face; scene.add(shadowAll(g));
  const c = Math.cos(face), s = Math.sin(face);
  const wx = (lx, lz) => [CHURCH.x + lx * c + lz * s, CHURCH.z - lx * s + lz * c];
  let [nx, nz] = wx(0, -2); addBox(nx, nz, face, 10.4, 18.4);
  [nx, nz] = wx(-3.2, 8); addBox(nx, nz, face, 5.6, 5.6);
  const [dx, dz] = wx(1.6, 10.5); CHURCH.dx = dx; CHURCH.dz = dz;
  const [ix, iz] = wx(5.6, 11.5); CHURCH.ix = ix; CHURCH.iz = iz;
}

// Orilla oeste: fila a lo largo de la calle principal
for (let z = 44; z > -60; z -= 11 + rnd() * 2) {
  if (Math.abs(z - 5) < 6 || (z < -8 && z > -31) || Math.abs(z + 42) < 5) continue; // puente y subida a la iglesia
  const sx = riverX(z) < 0 ? -10 : -10;
  houseToward(-19.5 - rnd() * 1.5, z, sx, z);
}
// Orilla este: casas a ambos lados de la calle; las de poniente dan la espalda al río
for (let z = 46; z > -58; z -= 10.5 + rnd() * 2) {
  if (Math.abs(z - 5) < 10 || Math.abs(z - 34) < 4.5 || Math.abs(z + 42) < 4.5) continue;
  houseToward(9.5, z, 16, z, { w: 6.5, d: 7 });
  houseToward(23.5 + rnd(), z, 16, z);
}
// Crucero del siglo XVI en la entrada, junto a la confluencia
const CROSS = { x: -7, z: 57 };
{
  const g = new T.Group();
  [[3.2, 0.4], [2.4, 0.4], [1.6, 0.4]].forEach(([s, hgt], i) => { const st = new T.Mesh(new T.BoxGeometry(s, hgt, s), M.stone); st.position.y = hgt / 2 + i * hgt; g.add(st); });
  const col = new T.Mesh(new T.CylinderGeometry(0.22, 0.28, 3.6, 10), M.plain); col.position.y = 1.2 + 1.8; g.add(col);
  const v = new T.Mesh(new T.BoxGeometry(0.28, 1.3, 0.28), M.plain); v.position.y = 5.3; g.add(v);
  const hz = new T.Mesh(new T.BoxGeometry(1.1, 0.26, 0.28), M.plain); hz.position.y = 5.5; g.add(hz);
  g.position.set(CROSS.x, terrainHeight(CROSS.x, CROSS.z) - 0.1, CROSS.z); scene.add(shadowAll(g));
  addBox(CROSS.x, CROSS.z, 0, 3.2, 3.2);
}

// Fuente de la plaza
const FOUNTAIN = { x: 19.2, z: 9.5 };
{
  const g = new T.Group();
  const basin = new T.Mesh(new T.CylinderGeometry(1.7, 1.8, 0.8, 18, 1, true), M.stone); basin.position.y = 0.4; g.add(basin);
  const ring = new T.Mesh(new T.TorusGeometry(1.72, 0.14, 6, 24), M.plain); ring.rotation.x = Math.PI / 2; ring.position.y = 0.8; g.add(ring);
  const wtr = new T.Mesh(new T.CircleGeometry(1.65, 20), M.water); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.66; g.add(wtr);
  const pil = new T.Mesh(new T.BoxGeometry(0.6, 2.2, 0.6), M.stone); pil.position.y = 1.1; g.add(pil);
  const cap = new T.Mesh(new T.SphereGeometry(0.4, 10, 8), M.plain); cap.position.y = 2.4; g.add(cap);
  const spout = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.5, 6), M.dark); spout.rotation.x = Math.PI / 2; spout.position.set(0, 1.6, 0.5); g.add(spout);
  const jet = new T.Mesh(new T.CylinderGeometry(0.04, 0.06, 0.95, 6), new T.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.7 }));
  jet.position.set(0, 1.15, 0.76); g.add(jet);
  g.position.set(FOUNTAIN.x, terrainHeight(FOUNTAIN.x, FOUNTAIN.z), FOUNTAIN.z); scene.add(shadowAll(g));
  addBox(FOUNTAIN.x, FOUNTAIN.z, 0, 3.4, 3.4);
}

// Postes indicadores en los cruces
function signpost(x, z, labels) {
  const g = new T.Group();
  const post = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 2.8, 8), M.wood); post.position.y = 1.4; g.add(post);
  labels.forEach(([text, ang], i) => {
    const tex = canvasTex(256, 64, (c) => { c.fillStyle = '#7a5231'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fbeed6'; c.font = '600 30px Space Grotesk, sans-serif'; c.textBaseline = 'middle'; c.fillText(text, 14, 34); });
    const board = new T.Mesh(new T.BoxGeometry(1.6, 0.4, 0.06), [M.wood, M.wood, M.wood, M.wood, new T.MeshStandardMaterial({ map: tex }), new T.MeshStandardMaterial({ map: tex })]);
    board.geometry.translate(0.75, 0, 0);
    board.position.y = 2.45 - i * 0.5; board.rotation.y = ang; g.add(board);
  });
  g.position.set(x, terrainHeight(x, z), z); scene.add(shadowAll(g));
}
signpost(-5, 50, [['Puente', Math.PI / 2], ['Iglesia', 1.98]]);
signpost(-12.5, 8, [['Plaza', 0], ['Iglesia', 2.23]]);
signpost(-13.5, -12, [['Iglesia', 2.65]]);
signpost(30, 5.8, [['Frontón', -1.49]]);

// Frontón con el motor común de pelota a mano (js/pelota.js)
let COURT3D = null;
if (window.Pelota) {
  COURT3D = new Pelota.PelotaCourt(T);
  const g = COURT3D.group; g.position.set(FRONTON.x, FRONTON.y + 0.02, FRONTON.z); g.rotation.y = FRONTON.ry; scene.add(g); g.updateMatrixWorld(true);
  COURT3D.boxes.forEach(b => { const p = frontonWorld(b.x, b.z); addBox(p.x, p.z, FRONTON.ry, b.w, b.d); });
  FRONTON.entry = frontonWorld(COURT3D.entry.x, COURT3D.entry.z);
  FRONTON.look = frontonWorld(0, 14);
}

// ---------- Vegetación ----------
{
  const trunkG = new T.CylinderGeometry(0.22, 0.32, 2.6, 6); trunkG.translate(0, 1.3, 0);
  const crownG = new T.IcosahedronGeometry(2.3, 1); crownG.translate(0, 4.1, 0);
  const firG = new T.ConeGeometry(1.9, 6.5, 7); firG.translate(0, 4.6, 0);
  const pts = [];
  let tries = 0;
  while (pts.length < (isTouch ? 520 : 800) && tries < 12000) {
    tries++;
    const a = rnd() * Math.PI * 2, r = 30 + Math.pow(rnd(), 0.7) * 110;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (riverDist(x, z) < 8 || streetDist(x, z) < 5) continue;
    const inVillage = x > -30 && x < 32 && z > -66 && z < 60;
    if (inVillage && rnd() < 0.9) continue;
    if (x > 34 && x < 62 && z > -18 && z < 12) continue; // prado de las ovejas
    if (Math.hypot(x - CHURCH.x, z - CHURCH.z) < 16) continue;
    let blocked = false; for (const b of BOXES) if (Math.hypot(x - b.x, z - b.z) < Math.max(b.hw, b.hd) + 3) { blocked = true; break; }
    if (blocked) continue;
    const y = terrainHeight(x, z);
    pts.push([x, y, z, 0.75 + rnd() * 0.6, y > 9 || rnd() < 0.3]);
  }
  const beech = pts.filter(p => !p[4]), firs = pts.filter(p => p[4]);
  const trunks = new T.InstancedMesh(trunkG, M.wood, pts.length);
  const crowns = new T.InstancedMesh(crownG, new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), beech.length);
  const firM = new T.InstancedMesh(firG, new T.MeshStandardMaterial({ color: '#1e6a3a', roughness: 0.9, flatShading: true }), firs.length);
  const dm = new T.Object3D(), cc = new T.Color();
  pts.forEach((p, i) => { dm.position.set(p[0], p[1] - 0.2, p[2]); dm.scale.setScalar(p[3]); dm.rotation.y = rnd() * 6; dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix); });
  beech.forEach((p, i) => {
    dm.position.set(p[0], p[1] - 0.2, p[2]); dm.scale.set(p[3], p[3] * (0.9 + rnd() * 0.3), p[3]); dm.rotation.y = rnd() * 6; dm.updateMatrix();
    crowns.setMatrixAt(i, dm.matrix); cc.set(['#3fa83a', '#5cc244', '#2f8f36', '#7fd154'][i % 4]); crowns.setColorAt(i, cc);
  });
  firs.forEach((p, i) => { dm.position.set(p[0], p[1] - 0.2, p[2]); dm.scale.setScalar(p[3]); dm.updateMatrix(); firM.setMatrixAt(i, dm.matrix); });
  [trunks, crowns, firM].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
  // Chopos junto al río, fuera del casco
  const pop = new T.InstancedMesh(new T.ConeGeometry(0.9, 7, 6).translate(0, 4.2, 0), new T.MeshStandardMaterial({ color: '#7aa84a', roughness: 0.9, flatShading: true }), 40);
  let k = 0;
  for (let z = -128; z < 128 && k < 40; z += 6) {
    if (z > -70 && z < 62) continue;
    for (const s of [-1, 1]) { if (k >= 40) break; dm.position.set(riverX(z) + s * (7.5 + rnd() * 2), terrainHeight(riverX(z) + s * 8, z) - 0.2, z + rnd() * 3); dm.scale.setScalar(0.8 + rnd() * 0.4); dm.updateMatrix(); pop.setMatrixAt(k++, dm.matrix); }
  }
  pop.count = k; pop.castShadow = true; scene.add(pop);
  // Matas y flores en el prado y orillas
  const bush = new T.InstancedMesh(new T.IcosahedronGeometry(0.6, 0), new T.MeshStandardMaterial({ color: '#4f8f3a', flatShading: true }), 260);
  const flw = new T.InstancedMesh(new T.SphereGeometry(0.12, 5, 4), new T.MeshStandardMaterial({ color: '#ffffff' }), 500);
  let nb = 0, nf = 0;
  for (let i = 0; i < 3000 && (nb < 260 || nf < 500); i++) {
    const x = -70 + rnd() * 140, z = -80 + rnd() * 160;
    if (streetDist(x, z) < 2.8 || riverDist(x, z) < 4.2) continue;
    let blocked = false; for (const b of BOXES) if (Math.abs(x - b.x) < b.hw + b.hd && Math.abs(z - b.z) < b.hw + b.hd) { blocked = true; break; }
    if (blocked) continue;
    const y = terrainHeight(x, z);
    if (riverDist(x, z) < 8 && nb < 260) { dm.position.set(x, y, z); dm.scale.set(1 + rnd(), 0.7 + rnd() * 0.5, 1 + rnd()); dm.updateMatrix(); bush.setMatrixAt(nb++, dm.matrix); continue; }
    if (nf < 500) { dm.position.set(x, y + 0.08, z); dm.scale.setScalar(0.7 + rnd() * 0.6); dm.updateMatrix(); flw.setMatrixAt(nf, dm.matrix); cc.set(['#ffffff', '#ffd21f', '#b57aff', '#ff4f8b'][nf % 4]); flw.setColorAt(nf, cc); nf++; }
  }
  bush.count = nb; flw.count = nf; bush.receiveShadow = true; scene.add(bush, flw);
}

// ---------- Personajes de juguete (diseño propio de MENDIMENDIZ) ----------
function roundedBox(w, h, d, r, seg = 3) {
  const g = new T.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes.position, n = g.attributes.normal, v = new T.Vector3(), inn = new T.Vector3();
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inn.set(clamp(v.x, -hw, hw), clamp(v.y, -hh, hh), clamp(v.z, -hd, hd));
    v.sub(inn); const len = v.length() || 1; v.divideScalar(len);
    n.setXYZ(i, v.x, v.y, v.z);
    p.setXYZ(i, inn.x + v.x * r, inn.y + v.y * r, inn.z + v.z * r);
  }
  return g;
}
const mat = c => new T.MeshStandardMaterial({ color: c, roughness: 0.75 });
const PLASTIC = {};
const plastic = c => PLASTIC[c] || (PLASTIC[c] = new T.MeshStandardMaterial({ color: c, roughness: 0.36, metalness: 0 }));
function faceTex(o) {
  return canvasTex(128, 128, g => {
    const circ = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const ell = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
    g.fillStyle = o.skin; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,110,120,.38)'; circ(28, 80, 11); circ(100, 80, 11);
    if (o.freckles) { g.fillStyle = 'rgba(140,70,40,.55)'; [[24, 72], [32, 76], [27, 84], [96, 72], [104, 76], [99, 84]].forEach(([x, y]) => circ(x, y, 1.8)); }
    g.fillStyle = '#1c1426'; ell(44, 60, 7.5, 10.5); ell(84, 60, 7.5, 10.5);
    g.fillStyle = '#ffffff'; circ(47, 55, 2.8); circ(87, 55, 2.8);
    if (o.lashes) { g.strokeStyle = '#1c1426'; g.lineWidth = 3; g.lineCap = 'round'; [[36, 50, 31, 46], [92, 50, 97, 46]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }); }
    g.strokeStyle = o.brow || o.hair; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(34, 42); g.quadraticCurveTo(44, 36, 54, 40); g.stroke();
    g.beginPath(); g.moveTo(74, 40); g.quadraticCurveTo(84, 36, 94, 42); g.stroke();
    g.strokeStyle = '#7a2230'; g.lineWidth = 4.5;
    g.beginPath(); g.arc(64, 78, 15, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
    if (o.moustache) { g.fillStyle = o.hair; ell(54, 86, 12, 5.5); ell(74, 86, 12, 5.5); }
    if (o.glasses) { g.strokeStyle = '#2a2140'; g.lineWidth = 4; g.beginPath(); g.arc(44, 60, 15, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(84, 60, 15, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(59, 58); g.lineTo(69, 58); g.stroke(); }
  });
}
function torsoTex(o) {
  return canvasTex(128, 128, g => {
    g.fillStyle = o.shirt; g.fillRect(0, 0, 128, 128);
    if (o.stripes) { g.fillStyle = o.stripes; for (let y = 10; y < 128; y += 22) g.fillRect(0, y, 128, 9); }
    if (o.vest) {
      g.fillStyle = o.vest; g.fillRect(0, 0, 46, 128); g.fillRect(82, 0, 46, 128);
      g.fillStyle = '#f2c14e'; [42, 66, 90].forEach(y => { g.beginPath(); g.arc(40, y, 4, 0, Math.PI * 2); g.fill(); });
    }
    if (o.apron) { g.fillStyle = o.apron; g.beginPath(); g.moveTo(30, 58); g.lineTo(98, 58); g.lineTo(98, 128); g.lineTo(30, 128); g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(46, 80, 36, 22); }
    if (o.scarf) { g.fillStyle = o.scarf; g.beginPath(); g.moveTo(28, 0); g.lineTo(100, 0); g.lineTo(64, 46); g.closePath(); g.fill(); g.beginPath(); g.arc(64, 12, 9, 0, Math.PI * 2); g.fill(); }
    if (o.sash) { g.fillStyle = o.sash; g.fillRect(0, 110, 128, 18); }
  });
}
function person(o) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const skin = plastic(o.skin);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(s * 0.12, 0.8, 0);
    const l = new T.Mesh(roundedBox(0.21, 0.6, 0.26, 0.06), plastic(o.pants)); l.position.y = -0.3; leg.add(l);
    const bt = new T.Mesh(roundedBox(0.23, 0.17, 0.34, 0.06), plastic(o.boots)); bt.position.set(0, -0.72, 0.04); leg.add(bt);
    body.add(leg); legs.push(leg);
  }
  if (o.skirt) { const sk = new T.Mesh(new T.CylinderGeometry(0.26, 0.42, 0.5, 18), plastic(o.skirt)); sk.position.y = 0.7; body.add(sk); }
  const hips = new T.Mesh(roundedBox(0.47, 0.17, 0.31, 0.06), plastic(o.sash || o.pants)); hips.position.y = 0.87; body.add(hips);
  const side = plastic(o.vest || o.shirt);
  const front = new T.MeshStandardMaterial({ map: torsoTex(o), roughness: 0.36 });
  const torso = new T.Mesh(roundedBox(0.52, 0.56, 0.32, 0.09, 4), [side, side, side, side, front, side]); torso.position.y = 1.22; body.add(torso);
  const neck = new T.Mesh(new T.CylinderGeometry(0.09, 0.1, 0.12, 10), skin); neck.position.y = 1.55; body.add(neck);
  for (const s of [-1, 1]) {
    const arm = new T.Group(); arm.position.set(s * 0.345, 1.43, 0);
    const up = new T.Mesh(roundedBox(0.15, 0.42, 0.17, 0.06), plastic(o.sleeve || o.shirt)); up.position.y = -0.19; arm.add(up);
    const hand = new T.Mesh(new T.SphereGeometry(0.095, 12, 10), skin); hand.position.y = -0.45; arm.add(hand);
    arm.rotation.z = s * 0.07; body.add(arm); arms.push(arm);
  }
  const head = new T.Group(); head.position.y = 1.83; body.add(head);
  const faceM = new T.MeshStandardMaterial({ map: faceTex(o), roughness: 0.36 });
  const skull = new T.Mesh(roundedBox(0.5, 0.46, 0.44, 0.15, 5), [skin, skin, skin, skin, faceM, skin]); head.add(skull);
  const hm = plastic(o.hair);
  if (o.txapela) {
    const beret = new T.Mesh(new T.CylinderGeometry(0.33, 0.31, 0.09, 20), plastic('#1d1b2b')); beret.position.set(0.02, 0.27, -0.01); beret.rotation.z = -0.1; head.add(beret);
    const stem = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.07, 6), plastic('#1d1b2b')); stem.position.set(0.03, 0.34, 0); head.add(stem);
    const back = new T.Mesh(roundedBox(0.52, 0.18, 0.12, 0.05), hm); back.position.set(0, 0.06, -0.19); head.add(back);
  } else {
    const top = new T.Mesh(roundedBox(0.54, 0.17, 0.48, 0.08), hm); top.position.y = 0.245; head.add(top);
    const long = o.hairStyle === 'largo';
    const back = new T.Mesh(roundedBox(0.54, long ? 0.62 : 0.32, 0.15, 0.07), hm); back.position.set(0, long ? -0.08 : 0.08, -0.19); head.add(back);
    const fr = new T.Mesh(roundedBox(0.3, 0.11, 0.12, 0.05), hm); fr.position.set(-0.09, 0.17, 0.19); fr.rotation.z = 0.18; head.add(fr);
    for (const s of [-1, 1]) { const sd = new T.Mesh(roundedBox(0.07, long ? 0.5 : 0.22, 0.3, 0.035), hm); sd.position.set(s * 0.26, long ? 0 : 0.1, -0.05); head.add(sd); }
    if (o.hairStyle === 'bun') { const bun = new T.Mesh(new T.SphereGeometry(0.14, 14, 12), hm); bun.position.set(0, 0.26, -0.2); head.add(bun); }
  }
  root.userData = { legs, arms, head, body, phase: 0, wave: false };
  root.scale.setScalar(o.scale || 1.05);
  return shadowAll(root);
}
function animatePerson(p, speed, dt, t) {
  const u = p.userData; const k = clamp(speed / 4, 0, 1.2);
  u.phase += dt * (3 + speed * 1.6);
  const sw = Math.sin(u.phase) * 0.7 * k;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.85; u.arms[1].rotation.x = sw * 0.85;
  if (u.wave) { u.arms[1].rotation.x = 0; u.arms[1].rotation.z = 2.55 + Math.sin(t * 7) * 0.32; }
  else u.arms[1].rotation.z = 0.07;
  u.body.position.y = Math.abs(Math.cos(u.phase)) * 0.07 * k + (k < 0.05 ? Math.sin(t * 2.2) * 0.012 : 0);
  u.head.rotation.z = k < 0.05 ? Math.sin(t * 0.9) * 0.04 : 0;
}

// ---------- Personajes con forma humana (modelo del pastor + variantes) ----------
// Cada personaje es un contenedor; dentro va el modelo 3D con esqueleto o, si no carga, una figura de respaldo.
const AV = {
  skin: [['#f3c7a1', 'Clara'], ['#dca47a', 'Media'], ['#b07446', 'Morena'], ['#6e4127', 'Oscura']],
  hair: [['#2b1a10', 'Castaño oscuro'], ['#6e3c1e', 'Castaño'], ['#d9a846', 'Rubio'], ['#b8452a', 'Pelirrojo'], ['#141218', 'Negro']],
  style: [['corto', 'Corto'], ['largo', 'Melena'], ['bun', 'Moño'], ['txapela', 'Txapela']],
  vest: [['#6d2446', 'Ciruela'], ['#1f4f9a', 'Azul'], ['#23804a', 'Verde'], ['#d9731f', 'Naranja'], ['#5b34b0', 'Morado']],
  scarf: [['#d11f35', 'Rojo'], ['#f5c518', 'Amarillo'], ['#12b0a2', 'Turquesa'], ['#ec4f97', 'Rosa']]
};
if (!S.avatar || !AV.skin.some(s => s[0] === S.avatar.skin)) S.avatar = { skin: '#f3c7a1', hair: '#2b1a10', style: 'corto', vest: '#6d2446', scarf: '#d11f35' };
const playerLook = a => ({ skin: a.skin, hair: a.hair, style: a.style, shirt: '#f6ecd8', vest: a.vest, scarf: a.scarf, pants: '#3a3446', socks: '#efe6d2', boots: '#6b3a1c', iris: '#5a3516' });
const toyLook = l => Object.assign({}, l, { hairStyle: l.style, txapela: l.style === 'txapela', sash: '#4a2e22' });

let GLB = null;
const IDLE = {"Root":{"p":[0,0,0],"q":[-2.1855694143368964e-08,0,0,1],"s":[1,1,1]},"Hips":{"p":[0,0.7599999904632568,0],"q":[0,0,0,1],"s":[1,1,1]},"Spine":{"p":[0,0.12000000476837158,0],"q":[0,0,0,1],"s":[1,1,1]},"Chest":{"p":[0,0.19000005722045898,0],"q":[0,0,0,1],"s":[1,1,1]},"Neck":{"p":[0,0.12999999523162842,0],"q":[0,0,0,1],"s":[1,1,1]},"Head":{"p":[0,0.1099998950958252,0],"q":[0,0,0,1],"s":[1,1,1]},"UpperArm.L":{"p":[0.2149999588727951,0.09999990463256836,-3.171987472683213e-08],"q":[-0.9574944972991943,-0.08076169341802597,-0.27593499422073364,0.02327416092157364],"s":[0.9999998807907104,1,1]},"Forearm.L":{"p":[-1.4268332071409873e-09,0.20895211398601532,9.167692383016401e-08],"q":[-0.06813455373048782,-0.036966972053050995,-0.011053386144340038,0.9969297647476196],"s":[1.0000001192092896,1,1.0000001192092896]},"Hand.L":{"p":[-2.7939677238464355e-09,0.21247583627700806,3.5390257835388184e-08],"q":[0.012279929593205452,-0.05232696980237961,-0.016224807128310204,0.9984226822853088],"s":[0.9999998211860657,0.9999995231628418,0.999999463558197]},"UpperArm.R":{"p":[-0.2149999588727951,0.09999990463256836,-3.171987472683213e-08],"q":[-0.9574944972991943,0.08076169341802597,0.27593499422073364,0.02327416092157364],"s":[0.9999998807907104,1,1]},"Forearm.R":{"p":[1.4268332071409873e-09,0.20895211398601532,9.167692383016401e-08],"q":[-0.06813455373048782,0.036966972053050995,0.011053386144340038,0.9969297647476196],"s":[1.0000001192092896,1,1.0000001192092896]},"Hand.R":{"p":[2.7939677238464355e-09,0.21247583627700806,3.5390257835388184e-08],"q":[0.012279929593205452,0.05232696980237961,0.016224807128310204,0.9984226822853088],"s":[0.9999998211860657,0.9999995231628418,0.999999463558197]},"Thigh.L":{"p":[0.1120000034570694,0,-1.8611111540778325e-09],"q":[0.99979168176651,0.004177270922809839,0.008024203591048717,0.018299898132681847],"s":[0.9999999403953552,0.9999999403953552,1.0000003576278687]},"Shin.L":{"p":[-1.0732037480920553e-07,0.3202250301837921,2.7706846594810486e-08],"q":[0.03787808492779732,-0.007786845322698355,0.0003075406712014228,0.9992520213127136],"s":[1.0000001192092896,1.0000001192092896,0.9999997019767761]},"Foot.L":{"p":[9.801686928767595e-08,0.30024001002311707,-1.8972711401943343e-08],"q":[-0.5411019921302795,-0.002181535353884101,0.003387155942618847,0.8409473896026611],"s":[0.9999998807907104,0.9999997615814209,1]},"Thigh.R":{"p":[-0.1120000034570694,0,-1.8611111540778325e-09],"q":[0.99979168176651,-0.004177270922809839,-0.008024203591048717,0.018299898132681847],"s":[0.9999999403953552,1.0000001192092896,1.000000238418579]},"Shin.R":{"p":[1.0798976290971041e-07,0.3202250599861145,2.8870999813079834e-08],"q":[0.03787807747721672,0.007786846254020929,-0.0003075410786550492,0.9992520213127136],"s":[0.9999999403953552,0.9999998807907104,0.9999997019767761]},"Foot.R":{"p":[-8.99877719007236e-08,0.30024003982543945,-2.1081241641240922e-08],"q":[-0.5411019921302795,0.002181535353884101,-0.003387155942618847,0.8409473299980164],"s":[0.9999998807907104,1,0.9999998211860657]}};
const lin = hex => new T.Color(hex).convertSRGBToLinear();
const grayCache = {};
function grayMap(tex, key) {
  if (grayCache[key]) return grayCache[key];
  const img = tex.image, c = document.createElement('canvas');
  c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data; let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
  const k = 225 / Math.max(1, sum / (px.length / 4));
  for (let i = 0; i < px.length; i += 4) { const l = Math.min(255, (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) * k); px[i] = px[i + 1] = px[i + 2] = l; }
  g.putImageData(d, 0, 0);
  const t = new T.CanvasTexture(c); t.flipY = false; t.encoding = T.sRGBEncoding; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  return (grayCache[key] = t);
}
function recolor(mat, look) {
  const m = mat.clone(), n = mat.name;
  const tint = hex => { if (m.map) m.map = grayMap(mat.map, n); m.color.copy(lin(hex)); };
  if (n === 'Linen cream') tint(look.shirt);
  else if (n === 'Waistcoat plum wool') tint(look.vest || look.shirt);
  else if (n === 'Neckerchief red') tint(look.scarf || look.shirt);
  else if (n === 'Trousers charcoal') tint(look.pants);
  else if (n === 'Wool socks') tint(look.socks || '#efe6d2');
  else if (n === 'Boot leather') m.color.copy(lin(look.boots || '#6b3a1c')).multiplyScalar(0.7);
  else if (n === 'Skin warm terracotta') m.color.copy(lin(look.skin));
  else if (n === 'Lid skin') m.color.copy(lin(look.skin)).multiplyScalar(0.93);
  else if (n === 'Ear and lips') m.color.copy(lin(look.skin)).lerp(lin('#b0443c'), 0.45);
  else if (n === 'Iris hazel') m.color.copy(lin(look.iris || '#5a3516'));
  else if (n === 'Hair dark brown') m.color.copy(lin(look.hair));
  else if (n === 'Hair highlights') m.color.copy(lin(look.hair)).multiplyScalar(1.6);
  m.roughness = Math.min(m.roughness, 0.8);
  return m;
}
function accessory(parent, geo, hex, pos, rot) {
  const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: lin(hex), roughness: 0.7 }));
  m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true; parent.add(m); return m;
}
function buildGLBChar(look) {
  const m = THREE.SkeletonUtils.clone(GLB.rig);
  const bones = {};
  m.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = recolor(o.material, look); }
  });
  for (const [name, t] of Object.entries(IDLE)) { const b = bones[name]; if (!b) continue; b.position.fromArray(t.p); b.quaternion.fromArray(t.q); b.scale.fromArray(t.s); }
  const head = bones.Head, hips = bones.Hips;
  const hairHex = look.hair;
  if (head) {
    if (look.style === 'largo') {
      accessory(head, roundedBox(0.44, 0.44, 0.12, 0.05), hairHex, [0, 0.13, -0.15]);
      for (const s of [-1, 1]) accessory(head, roundedBox(0.06, 0.3, 0.15, 0.03), hairHex, [s * 0.215, 0.14, -0.04]);
    }
    if (look.style === 'bun') accessory(head, new T.SphereGeometry(0.1, 16, 12), hairHex, [0, 0.36, -0.14]);
    if (look.style === 'txapela') {
      accessory(head, new T.CylinderGeometry(0.255, 0.24, 0.07, 24), '#1b1a26', [0.015, 0.435, 0], [0, 0, -0.12]);
      accessory(head, new T.CylinderGeometry(0.012, 0.012, 0.05, 6), '#1b1a26', [0.02, 0.48, 0]);
    }
    if (look.glasses) {
      for (const s of [-1, 1]) accessory(head, new T.TorusGeometry(0.036, 0.006, 6, 18), '#2a2140', [s * 0.047, 0.185, 0.186]);
      accessory(head, new T.BoxGeometry(0.03, 0.006, 0.006), '#2a2140', [0, 0.19, 0.188]);
    }
  }
  if (hips && look.skirt) accessory(hips, new T.CylinderGeometry(0.215, 0.33, 0.44, 22), look.skirt, [0, -0.1, 0]);
  const mixer = new T.AnimationMixer(m);
  const walk = mixer.clipAction(GLB.clip); walk.play(); walk.setEffectiveWeight(0);
  m.userData = { mixer, walk, bones, w: 0 };
  return m;
}
function setModel(w) {
  while (w.children.length) w.remove(w.children[0]);
  const look = w.userData.look;
  let m;
  if (GLB) { try { m = buildGLBChar(look); w.userData.kind = 'glb'; } catch (e) { m = null; } }
  if (!m) { m = person(toyLook(look)); w.userData.kind = 'toy'; } else m.scale.multiplyScalar(look.scale || 1);
  w.add(m); w.userData.model = m;
}
function makeChar(look) { const w = new T.Group(); w.userData.look = look; setModel(w); return w; }
function animateChar(w, speed, dt, t, talk) {
  const m = w.userData.model;
  if (w.userData.kind !== 'glb') { animatePerson(m, speed, dt, t); return; }
  const u = m.userData, target = clamp(speed / 1.4, 0, 1);
  u.w = lerp(u.w, target, 1 - Math.exp(-10 * dt));
  u.walk.setEffectiveWeight(u.w);
  u.walk.timeScale = clamp(speed / 2.4, 0.7, 2.3);
  u.mixer.update(dt);
  const b = u.bones;
  if (u.w < 0.3) {
    const idle = 1 - u.w / 0.3;
    if (b.Chest) b.Chest.rotation.x += Math.sin(t * 2.1) * 0.025 * idle;
    if (b.Head) { b.Head.rotation.y += Math.sin(t * 0.7) * 0.12 * idle; b.Head.rotation.x += (talk ? Math.sin(t * 7) * 0.06 : 0); }
  } else if (b.Spine) b.Spine.rotation.x += clamp((speed - 4.3) * 0.04, 0, 0.12);
}
let player = makeChar(playerLook(S.avatar));
scene.add(player);
function rebuildPlayer() { player.userData.look = playerLook(S.avatar); setModel(player); }
const P = { x: CROSS.x + 3, z: CROSS.z - 4, vx: 0, vz: 0, heading: Math.PI, speed: 0 };

// Vecinos: cada uno con su silueta, edad y ropa
const NPCS = [
  { id: 'maite', name: 'Maite', color: '#ffbe62', x: CROSS.x + 2.6, z: CROSS.z - 1.2, look: { skin: '#e7b28b', hair: '#6e3c1e', style: 'bun', shirt: '#ffffff', vest: '#1f4f9a', scarf: '#f5c518', pants: '#1f4f9a', skirt: '#d9731f', socks: '#1c1a26', boots: '#3b2418', iris: '#3d2512', scale: 0.96, lashes: true } },
  { id: 'amaia', name: 'Amaia', color: '#ff5da2', x: 12.5, z: 1.2, look: { skin: '#f2c6a4', hair: '#191216', style: 'largo', shirt: '#ff5d73', vest: '#ff5d73', scarf: '#ffffff', pants: '#2c2a6e', skirt: '#2c2a6e', socks: '#f2ece0', boots: '#402414', iris: '#2e5a3a', scale: 0.93, lashes: true, freckles: true } },
  { id: 'kike', name: 'Kike', color: '#63cfff', x: 30.2, z: 30.5, look: { skin: '#d49870', hair: '#8a5626', style: 'corto', shirt: '#3fb6f2', vest: '#f5c518', scarf: '#3fb6f2', pants: '#23804a', socks: '#ffffff', boots: '#553520', iris: '#5a3516', scale: 0.7, freckles: true } },
  { id: 'itziar', name: 'Itziar', color: '#a8e86f', x: CHURCH.ix, z: CHURCH.iz, look: { skin: '#eec2a0', hair: '#cfc9c2', brow: '#9a918a', style: 'bun', glasses: true, shirt: '#9be060', vest: '#5b34b0', scarf: '#5b34b0', pants: '#5b34b0', skirt: '#5b34b0', socks: '#1c1a26', boots: '#2e2420', iris: '#3a4f7a', scale: 0.92 } },
  { id: 'joxemari', name: 'Joxemari', color: '#bd98ff', x: 46, z: -4, look: { skin: '#d49a72', hair: '#e8e2d8', style: 'txapela', moustache: true, shirt: '#ffffff', vest: '#2b2940', scarf: '#d11f35', pants: '#2b2940', socks: '#e6ddc8', boots: '#3a2618', iris: '#4a3018', scale: 1.02 } }
];
NPCS.forEach(n => {
  n.obj = makeChar(n.look); n.obj.position.set(n.x, groundY(n.x, n.z), n.z);
  n.obj.rotation.y = rnd() * 6; scene.add(n.obj); addBox(n.x, n.z, 0, 0.7, 0.7);
});
// Carga del modelo 3D con esqueleto; si falla, se quedan las figuras de respaldo
function loadGLB(done) {
  try {
    if (!THREE.GLTFLoader || !THREE.SkeletonUtils) return done(false);
    fetch('assets/models/pastor.glb').then(r => { if (!r.ok) throw new Error('GLB'); return r.arrayBuffer(); }).then(ab => new THREE.GLTFLoader().parse(ab, '', gltf => {
      const rig = gltf.scene.getObjectByName('Aldeano_Rig');
      const clip = gltf.animations[0];
      if (!rig || !clip) return done(false);
      rig.parent.remove(rig); rig.position.set(0, 0, 0);
      GLB = { rig, clip };
      [player, ...NPCS.map(n => n.obj)].forEach(setModel);
      done(true);
    }, () => done(false))).catch(() => done(false));
  } catch (e) { done(false); }
}

// Ovejas en el prado y aves
const sheep = [];
{
  const wool = mat('#f4f1ea'), face = mat('#2b2622');
  for (let i = 0; i < 9; i++) {
    const g = new T.Group();
    const b = new T.Mesh(new T.SphereGeometry(0.55, 10, 8), wool); b.scale.set(1.35, 0.95, 1); b.position.y = 0.8; b.rotation.y = Math.PI / 2; g.add(b);
    const h = new T.Mesh(new T.SphereGeometry(0.24, 8, 6), face); h.scale.z = 1.3; h.position.set(0, 0.95, 0.72); g.add(h);
    for (const [lx, lz] of [[-0.25, 0.35], [0.25, 0.35], [-0.25, -0.35], [0.25, -0.35]]) { const l = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.5, 6), face); l.position.set(lx, 0.25, lz); g.add(l); }
    const x = 40 + rnd() * 18, z = -14 + rnd() * 22;
    g.position.set(x, terrainHeight(x, z), z); g.rotation.y = rnd() * 6; scene.add(shadowAll(g));
    sheep.push({ g, head: h, tx: x, tz: z, t: rnd() * 5 });
  }
}
const birds = [];
{
  const bm = new T.MeshBasicMaterial({ color: '#2b2b33', side: T.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const g = new T.Group();
    for (const s of [-1, 1]) { const w = new T.Mesh(new T.PlaneGeometry(1.4, 0.35), bm); w.geometry.translate(s * 0.7, 0, 0); g.add(w); }
    scene.add(g); birds.push({ g, r: 30 + rnd() * 40, a: rnd() * 6, y: 32 + rnd() * 16, s: 0.1 + rnd() * 0.08, cx: rnd() * 40 - 20, cz: rnd() * 60 - 30 });
  }
}

// Marcador del objetivo
const marker = new T.Group();
{
  const gem = new T.Mesh(new T.OctahedronGeometry(0.55), new T.MeshStandardMaterial({ color: '#bd98ff', emissive: '#7a4fe0', emissiveIntensity: 0.9 }));
  gem.position.y = 3.2; marker.add(gem);
  const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 30, 12, 1, true), new T.MeshBasicMaterial({ color: '#bd98ff', transparent: true, opacity: 0.18, depthWrite: false }));
  beam.position.y = 15; marker.add(beam);
  const ring = new T.Mesh(new T.RingGeometry(0.9, 1.2, 28), new T.MeshBasicMaterial({ color: '#bd98ff', transparent: true, opacity: 0.7, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; marker.add(ring);
  marker.userData.gem = gem; scene.add(marker);
}

// ---------- Contenido: cartas del cuaderno ----------
const CARDS = [
  { id: 'crucero', emb: '✝', title: 'El crucero', text: 'A la entrada de la villa, donde el Zatoya se une al Anduña, se levanta un crucero de piedra de la primera mitad del siglo XVI.', src: 'Sobre España; Au sud des Pyrénées' },
  { id: 'puente', emb: '🌉', title: 'El puente medieval', text: 'Cruza el Anduña en la calle principal y es la imagen más conocida del pueblo. El río tiene otros cinco puentes de piedra.', src: 'Discover Navarra; Sobre España' },
  { id: 'barrios', emb: '🏘', title: 'Cuatro barrios', text: 'El caserío se reparte a ambos lados del río en cuatro barrios: Urrutia, Irigoyen, Iribarren y Labaria. Las casas son de piedra, separadas y con tejados muy inclinados.', src: 'Sinmapa; Sobre España' },
  { id: 'iglesia', emb: '⛪', title: 'San Juan Evangelista', text: 'En la parte alta del casco urbano, con una torre imponente. Guarda retablos renacentistas del escultor Miguel de Espinal.', src: 'Pueblos Españoles; Au sud des Pyrénées' },
  { id: 'palacios', emb: '🛡', title: 'Palacios y escudos', text: 'Destacan los palacios de Urrutia, Iriarte y Donamaría, junto a casas blasonadas de los siglos XVIII y XIX.', src: 'Sinmapa; Sobre España' },
  { id: 'muskilda', emb: '⛰', title: 'Muskilda', text: 'A unos cuatro kilómetros, en una colina, está el santuario románico de Nuestra Señora de Muskilda, de finales del siglo XII.', src: 'Discover Navarra; El Confidencial Digital' },
  { id: 'pelota', emb: '✋', title: 'Pelota a mano', text: 'Casi todos los pueblos de Navarra tienen frontón. Se juega con la mano desnuda: la pelota tiene que dar en el frontis por encima de la chapa, y el kantari canta el tanteo en euskera.', src: 'Reglas básicas de la pelota a mano' },
  { id: 'irati', emb: '🌳', title: 'Puerta de Irati', text: 'Ochagavía es una de las entradas a la Selva de Irati, uno de los bosques mejor conservados de Europa.', src: 'Discover Navarra' }
];
function giveCard(id) {
  if (S.cards.includes(id)) return;
  S.cards.push(id); save();
  const c = CARDS.find(c => c.id === id);
  toast(`Nueva carta en el cuaderno: ${c.title}`);
}

// ---------- Misión ----------
const STEPS = [
  { t: 'Habla con Maite junto al crucero', target: () => npc('maite') },
  { t: 'Cruza el puente medieval del Anduña', target: () => ({ x: BRIDGES[0].cx, z: 5 }) },
  { t: 'Llena la cantimplora en la fuente de la plaza', target: () => FOUNTAIN },
  { t: 'Sube a la iglesia de San Juan Evangelista', target: () => ({ x: CHURCH.dx, z: CHURCH.dz }) },
  { t: () => `Encuentra los tres palacios (${S.palaces.length} de 3)`, target: () => { let best = null, bd = 1e9; PALACES.forEach(p => { if (S.palaces.includes(p.id)) return; const d = Math.hypot(p.dx - P.x, p.dz - P.z); if (d < bd) { bd = d; best = { x: p.dx, z: p.dz }; } }); return best; } },
  { t: 'Vuelve con Maite para sellar el pasaporte', target: () => npc('maite') },
  { t: 'Paseo completado. Sigue explorando', target: () => null }
];
const npc = id => NPCS.find(n => n.id === id);
function setStep(n) { if (n === 4 && S.palaces.length >= 3) n = 5; S.step = n; save(); updateObjective(true); }

const DIALOGS = {
  maite: () => {
    if (S.step === 0) return { lines: ['¡Kaixo! Soy Maite. Bienvenido a Otsagabia.', 'Este crucero de piedra marca la entrada del pueblo, justo donde el Zatoya se junta con el Anduña.', 'Te propongo un paseo: cruza el puente medieval, llena la cantimplora en la fuente, sube a la iglesia y busca los tres palacios.', 'Cuando termines, vuelve aquí y te sello el pasaporte.'], end: () => { giveCard('crucero'); setStep(1); } };
    if (S.step === 5) return { lines: ['¡Lo has recorrido entero! Ya conoces el corazón de Otsagabia.', 'Aquí tienes el sello del Paseo del Anduña.'], end: () => { setStep(6); S.done = true; save(); showDone(); } };
    if (S.step >= 6) return { lines: ['Aún quedan rincones por mirar. Pregunta a los vecinos: cada uno sabe algo distinto.'] };
    return { lines: ['Sigue el marcador morado. Ahora toca: ' + stepText(S.step).toLowerCase() + '.'] };
  },
  amaia: () => ({ lines: ['Desde este puente se ve el pueblo reflejado en el agua.', 'El caserío se reparte a los dos lados del Anduña, en cuatro barrios: Urrutia, Irigoyen, Iribarren y Labaria.'], end: () => giveCard('barrios') }),
  kike: () => {
    if (!COURT3D) return { lines: ['¡Aupa! Hoy el frontón está cerrado. ¡Vuelve otro día!'] };
    const pl = S.pelota || {};
    if (!pl.played) return { lines: ['¡Aupa! Soy Kike. ¿Juegas a pelota a mano?', 'En el frontón se golpea la pelota con la mano desnuda contra el frontis, la pared grande, por encima de la chapa.', 'Ve al círculo verde y pulsa GOLPE cuando la pelota brille. ¿Echamos un partido a 5 tantos?'], end: startPelota };
    if (pl.won) return { lines: ['¡Me ganaste! Juegas como un pelotari de verdad.', '¿La revancha? ¡Vamos al frontón!'], end: startPelota };
    return { lines: ['¡Casi me ganas! ¿Otro partido?'], end: startPelota };
  },
  itziar: () => ({ lines: ['Dentro de la iglesia hay retablos renacentistas del escultor Miguel de Espinal.', 'Y en una colina, a unos cuatro kilómetros, está el santuario de Muskilda, románico, de finales del siglo XII.'], end: () => giveCard('muskilda') }),
  joxemari: () => ({ lines: ['Egun on. Estas ovejas saben más de montes que yo.', 'Desde aquí se entra a la Selva de Irati, uno de los bosques mejor conservados de Europa. Si vas, no te salgas de los senderos.'], end: () => giveCard('irati') })
};
const stepText = n => { const t = STEPS[n].t; return typeof t === 'function' ? t() : t; };

// ---------- Interacción ----------
function interactables() {
  const list = NPCS.map(n => ({ kind: 'npc', n, x: n.x, z: n.z, label: 'Hablar', name: n.name, r: 2.8 }));
  list.push({ kind: 'fountain', x: FOUNTAIN.x, z: FOUNTAIN.z, label: S.step === 2 ? 'Llenar' : 'Beber', name: 'Fuente de la plaza', r: 3.2 });
  PALACES.forEach(p => { if (!S.palaces.includes(p.id)) list.push({ kind: 'palace', p, x: p.dx, z: p.dz, label: 'Descubrir', name: p.name, r: 3.2 }); });
  if (COURT3D) list.push({ kind: 'fronton', x: FRONTON.entry.x, z: FRONTON.entry.z, label: 'Jugar a pelota', name: 'Frontón', r: 3.2 });
  return list;
}
let near = null;
function doInteract() {
  if (!near || dialogOpen) return;
  if (near.kind === 'npc') { near.n.obj.rotation.y = Math.atan2(P.x - near.n.x, P.z - near.n.z); openDialog(near.n.name, DIALOGS[near.n.id]()); }
  else if (near.kind === 'fountain') {
    S.water = 100; save(); updateWater();
    if (S.step === 2) { toast('Cantimplora llena'); setStep(3); } else toast('Has bebido agua fresca');
  } else if (near.kind === 'fronton') { startPelota();
  } else if (near.kind === 'palace') {
    S.palaces.push(near.p.id); save();
    giveCard('palacios');
    toast(`${near.p.name} descubierto (${S.palaces.length} de 3)`);
    if (S.step === 4 && S.palaces.length >= 3) setStep(5); else updateObjective(true);
  }
}

// ---------- Pelota a mano ----------
// El motor (js/pelota.js) lleva reglas, rival, marcador y cámara; aquí se ponen los personajes y se vuelve al paseo.
let pelota = null, pelotaRival = null;
function swingBones(w, st) {
  // GLTFLoader quita los puntos de los nombres: «UpperArm.R» se llama «UpperArmR»
  const m = w.userData.model; if (w.userData.kind !== 'glb' || !m) return;
  const b = m.userData.bones, k = st.swing >= 0 ? Math.sin(st.swing * Math.PI) : 0;
  if (k && b.UpperArmR) { b.UpperArmR.rotateX(-1.7 * k); if (b.ForearmR) b.ForearmR.rotateX(-0.6 * k); if (b.Chest) b.Chest.rotateY(0.3 * k); }
  if (st.won) { const up = 0.8 + 0.2 * Math.sin(clockT * 10); for (const n of ['UpperArmL', 'UpperArmR']) if (b[n]) b[n].rotateX(-2.4 * up); }
}
function animPelotari(w, st, dt) { animateChar(w, st.speed, dt, clockT, false); swingBones(w, st); }
function startPelota() {
  if (!COURT3D || pelota || mode !== 'play') return;
  const k = npc('kike'); pelotaRival = k;
  mode = 'pelota'; $('hud').hidden = true; $('action').hidden = true; $('tag').hidden = true;
  stick.id = null; stick.x = stick.y = 0; $('stick').hidden = true; $('stickHint').hidden = true;
  pelota = new Pelota.PelotaMatch({ THREE: T, court: COURT3D, camera, mode: 'match', target: 5, lang: 'es',
    you: { obj: player, name: 'Tú', animate: animPelotari }, rival: { obj: k.obj, name: 'Kike', animate: animPelotari },
    onEnd: endPelota, onExit: endPelota });
}
function endPelota(r) {
  pelota = null; mode = 'play'; paused = false; $('hud').hidden = false;
  const k = pelotaRival; pelotaRival = null;
  k.obj.position.set(k.x, groundY(k.x, k.z), k.z); k.obj.rotation.y = Math.atan2(FRONTON.look.x - k.x, FRONTON.look.z - k.z);
  const e = FRONTON.entry; P.x = e.x; P.z = e.z; P.vx = P.vz = 0; P.heading = Math.atan2(k.x - e.x, k.z - e.z); camYaw = P.heading + Math.PI;
  S.pelota = S.pelota || {}; S.pelota.played = (S.pelota.played || 0) + 1;
  if (r.win) { S.pelota.won = true; giveCard('pelota'); toast(`¡${r.score.you} a ${r.score.rival}! Le has ganado a Kike`); }
  else if (!r.quit) toast(`${r.score.you} a ${r.score.rival}. Habla con Kike para la revancha`);
  save(); cv.focus({ preventScroll: true });
}

// ---------- Interfaz ----------
let toastT = 0;
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); toastT = 3.2; }
let dialogOpen = false, dQueue = null, dIdx = 0, talkNpc = null;
function openDialog(name, d) {
  const n = NPCS.find(x => x.name === name); talkNpc = n || null;
  dialogOpen = true; dQueue = d; dIdx = 0;
  $('dName').textContent = name; $('dText').textContent = d.lines[0];
  $('dAvatar').textContent = name[0]; $('dAvatar').style.background = n ? n.color : 'var(--lav)';
  $('dialog').hidden = false; $('action').hidden = true; if (document.activeElement) document.activeElement.blur();
}
function nextLine() {
  if (!dialogOpen) return;
  dIdx++;
  if (dIdx < dQueue.lines.length) { $('dText').textContent = dQueue.lines[dIdx]; return; }
  $('dialog').hidden = true; dialogOpen = false; talkNpc = null; const end = dQueue.end; dQueue = null; if (end) end();
  renderer.domElement.focus({ preventScroll: true });
}
$('dNext').addEventListener('click', e => { e.stopPropagation(); nextLine(); });
$('dialog').addEventListener('click', e => { if (e.target.id !== 'dNext') nextLine(); });
$('action').addEventListener('click', e => { e.stopPropagation(); doInteract(); });
function updateWater() { $('waterBar').style.width = S.water + '%'; $('water').classList.toggle('low', S.water < 25); }

let mode = 'loading', paused = true;
const cv = renderer.domElement;
function openScreen(id) { $(id).hidden = false; paused = true; }
function closeScreen(id) { $(id).hidden = true; if (mode === 'play' && ['book', 'menu', 'done'].every(s => $(s).hidden)) { paused = false; cv.focus({ preventScroll: true }); } }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeScreen(b.dataset.close)));

const CARD_COLORS = ['#ffbe62', '#bd98ff', '#63cfff', '#a8e86f', '#ff8cc0', '#ffd96b', '#7fe0c2'];
function renderCards(grid) {
  grid.innerHTML = '';
  CARDS.forEach((c, i) => {
    const have = S.cards.includes(c.id);
    const b = document.createElement('button'); b.className = 'flip' + (have ? '' : ' locked');
    b.setAttribute('aria-label', have ? `${c.title}. Toca para leer` : 'Carta sin descubrir');
    b.innerHTML = `<div class="inner"><div class="face front" style="background:${CARD_COLORS[i % CARD_COLORS.length]}"><span class="emb" aria-hidden="true">${have ? c.emb : '?'}</span><b>${have ? c.title : 'Sin descubrir'}</b><span>${have ? 'Toca para leer' : 'Explora y habla con los vecinos'}</span></div><div class="face back">${have ? c.text : ''}<small>${have ? 'Fuente: ' + c.src : ''}</small></div></div>`;
    if (have) b.addEventListener('click', () => b.classList.toggle('on'));
    grid.appendChild(b);
  });
}
function renderBook() { $('bookCount').textContent = `${S.cards.length} de ${CARDS.length} cartas descubiertas`; renderCards($('cardGrid')); }
$('btnBook').addEventListener('click', () => { renderBook(); openScreen('book'); });
$('btnDoneBook').addEventListener('click', () => { $('done').hidden = true; renderBook(); openScreen('book'); });
const KEYS_TXT = isTouch
  ? 'Arrastra en la mitad izquierda para caminar (hasta el borde para correr) y en la derecha para girar la cámara. El botón amarillo aparece cuando puedes hablar o usar algo.'
  : 'WASD o flechas para caminar, Mayúsculas para correr. Arrastra con el ratón para girar la cámara y usa la rueda para acercarla. E o Espacio para hablar y usar. C abre el cuaderno y Esc pausa.';
$('menuKeys').textContent = KEYS_TXT;
$('btnMenu').addEventListener('click', () => openScreen('menu'));
$('btnRestart').addEventListener('click', () => { const av = S.avatar; S = fresh(); S.avatar = av; S.started = true; save(); resetPlayer(); closeScreen('menu'); updateObjective(true); updateWater(); toast('Paseo reiniciado'); });
$('btnToHome').addEventListener('click', () => go('home'));
function showDone() { $('doneText').textContent = `Has recorrido el puente, la plaza, la iglesia y los tres palacios. Cartas del cuaderno: ${S.cards.length} de ${CARDS.length}.`; openScreen('done'); }
function resetPlayer() { P.x = CROSS.x + 3; P.z = CROSS.z - 4; P.vx = P.vz = 0; P.heading = Math.PI; camYaw = 0; }
let lastObj = '';
function updateObjective(force) { const txt = stepText(S.step); if (force || txt !== lastObj) { $('objTitle').textContent = txt; lastObj = txt; } }

// ---------- Portada y secciones ----------
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
  pueblos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  personaje: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/></svg>',
  pasaporte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 17h6"/></svg>'
};
const TABS = [['home', 'Inicio'], ['pueblos', 'Pueblos'], ['personaje', 'Personaje'], ['pasaporte', 'Pasaporte']];
function renderTabs() {
  const html = TABS.map(([id, l]) => `<button class="tab" data-go="${id}" aria-current="${mode === id}">${ICONS[id]}<span>${l}</span></button>`).join('');
  $('tabs').innerHTML = html; $('tabbar').innerHTML = html;
}
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g && !g.disabled) go(g.dataset.go); });
const TOWNS = [
  { name: 'Otsagabia / Ochagavía', region: 'Pirineo, valle de Salazar', live: true },
  { name: 'Altsasu / Alsasua', region: 'Sakana', c: ['#ff5da2', '#6b3fc0'] },
  { name: 'Amaiur / Maya', region: 'Baztan-Bidasoa', c: ['#2fbf71', '#1f4f9a'] },
  { name: 'Orreaga / Roncesvalles', region: 'Pirineo', c: ['#63cfff', '#2f5fa8'] },
  { name: 'Erriberri / Olite', region: 'Zona Media', c: ['#ffbe62', '#d9531f'] },
  { name: 'Lizarra / Estella', region: 'Tierra Estella', c: ['#bd98ff', '#ff5da2'] }
];
let TOWN_THUMB = '';
const mountainSvg = '<svg viewBox="0 0 24 24" fill="rgba(255,255,255,.92)"><path d="M2 20 9 7l4 6 3-4 6 11z"/></svg>';
function renderTowns() {
  $('townList').innerHTML = TOWNS.map((t, i) => t.live
    ? `<button class="town live" id="townLive"><img src="${TOWN_THUMB}" alt=""><div><b>${t.name}</b><small>${t.region}</small><small>1 misión, 5 vecinos, ${CARDS.length} cartas y frontón</small><span class="tagl">${S.started ? 'Continuar' : 'Jugar ahora'}</span></div></button>`
    : `<div class="town soon" aria-disabled="true"><div class="ph" style="background:linear-gradient(135deg,${t.c[0]},${t.c[1]})">${mountainSvg}</div><div><b>${t.name}</b><small>${t.region}</small><span class="tagl">En construcción</span></div></div>`).join('');
  $('townLive').addEventListener('click', startPlay);
}
function renderHero() {
  $('heroPlay').lastElementChild.textContent = S.started ? 'Continuar en Otsagabia' : 'Jugar en Otsagabia';
  $('heroProgress').innerHTML = `<span><i class="dot" style="background:var(--pink)"></i>Sellos <b>${S.done ? 1 : 0}/${TOWNS.length}</b></span><span><i class="dot" style="background:var(--cyan)"></i>Cartas <b>${S.cards.length}/${CARDS.length}</b></span><span><i class="dot" style="background:var(--lime)"></i>Palacios <b>${S.palaces.length}/3</b></span>`;
}
function renderAvatar() {
  const groups = [['skin', 'Piel'], ['hair', 'Color del pelo'], ['style', 'Peinado'], ['vest', 'Chaleco'], ['scarf', 'Pañuelo']];
  $('avatarOpts').innerHTML = groups.map(([k, label]) => `<div class="sec">${label}</div><div class="opts">${AV[k].map(([v, name]) => k === 'style'
    ? `<button class="chip" data-av="${k}" data-v="${v}" aria-pressed="${S.avatar[k] === v}">${name}</button>`
    : `<button class="sw" data-av="${k}" data-v="${v}" aria-pressed="${S.avatar[k] === v}" aria-label="${name}" title="${name}" style="background:${v}"></button>`).join('')}</div>`).join('');
}
$('avatarOpts').addEventListener('click', e => {
  const b = e.target.closest('[data-av]'); if (!b) return;
  S.avatar[b.dataset.av] = b.dataset.v; save(); rebuildPlayer(); renderAvatar();
});
$('avatarPlay').addEventListener('click', startPlay);
$('heroPlay').addEventListener('click', startPlay);
function renderPass() {
  $('passStats').innerHTML = `<div class="stat"><b>${S.done ? 1 : 0}</b><small>sellos</small></div><div class="stat"><b>${S.cards.length}/${CARDS.length}</b><small>cartas</small></div><div class="stat"><b>${S.palaces.length}/3</b><small>palacios</small></div>`;
  $('stampGrid').innerHTML = TOWNS.map(t => t.live && S.done ? `<div class="stampc got">Otsagabia<br>sellado</div>` : `<div class="stampc">${t.name.split(' / ')[0]}</div>`).join('');
  renderCards($('passCards'));
}
let heroSpin = 0;
function placeHero() {
  const b = BRIDGES[0], x = b.cx - 1.4, z = 5.3;
  player.position.set(x, groundY(x, z), z);
}
function go(m) {
  mode = m; paused = true;
  ['book', 'menu', 'done'].forEach(s => $(s).hidden = true);
  $('hud').hidden = true; $('shell').hidden = false; $('dialog').hidden = true; dialogOpen = false; talkNpc = null;
  stick.id = null; stick.x = stick.y = 0; $('stick').hidden = true;
  $('hero').hidden = m !== 'home';
  ['pueblos', 'personaje', 'pasaporte'].forEach(k => $('p-' + k).hidden = k !== m);
  renderTabs();
  if (m === 'home') renderHero(); else if (m === 'pueblos') renderTowns(); else if (m === 'personaje') renderAvatar(); else if (m === 'pasaporte') renderPass();
  placeHero(); heroSpin = 0;
}
function startPlay() {
  mode = 'play'; paused = false;
  $('shell').hidden = true; $('hud').hidden = false;
  S.started = true; save();
  player.position.set(P.x, groundY(P.x, P.z), P.z); player.rotation.y = P.heading; camYaw = P.heading + Math.PI;
  camera.position.set(P.x + Math.sin(camYaw) * 8, groundY(P.x, P.z) + 4, P.z + Math.cos(camYaw) * 8);
  updateObjective(true); updateWater();
  if (isTouch && !S.hinted) { $('stickHint').hidden = false; S.hinted = true; save(); }
  cv.focus({ preventScroll: true });
}

// ---------- Controles ----------
const keys = {};
let camYaw = 0, camPitch = 0.36, camDist = 7, lastDrag = -10, clockT = 0;
addEventListener('keydown', e => {
  if (mode !== 'play') return;
  const k = e.key.toLowerCase(); keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (dialogOpen && (k === 'e' || k === ' ' || k === 'enter')) { nextLine(); return; }
  if (paused) { if (k === 'escape') ['book', 'menu', 'done'].forEach(s => { if (!$(s).hidden) closeScreen(s); }); return; }
  if (k === 'e' || k === ' ') doInteract();
  if (k === 'c') { renderBook(); openScreen('book'); }
  if (k === 'escape') openScreen('menu');
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const look = { id: null, lx: 0, ly: 0 };
cv.addEventListener('pointerdown', e => {
  if (mode === 'personaje') { look.id = e.pointerId; look.lx = e.clientX; cv.setPointerCapture(e.pointerId); return; }
  if (mode !== 'play' || paused) return;
  cv.setPointerCapture(e.pointerId);
  if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && stick.id === null) {
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0;
    const s = $('stick'); s.hidden = false; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; s.firstElementChild.style.transform = '';
    $('stickHint').hidden = true;
  } else if (look.id === null) { look.id = e.pointerId; look.lx = e.clientX; look.ly = e.clientY; }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerId === stick.id) {
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), R = 56;
    if (d > R) { dx *= R / d; dy *= R / d; }
    stick.x = dx / R; stick.y = -dy / R;
    $('stick').firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
  } else if (e.pointerId === look.id) {
    if (mode === 'personaje') { heroSpin += (e.clientX - look.lx) * 0.012; look.lx = e.clientX; return; }
    camYaw -= (e.clientX - look.lx) * 0.006; camPitch = clamp(camPitch + (e.clientY - look.ly) * 0.004, 0.08, 1.05);
    look.lx = e.clientX; look.ly = e.clientY; lastDrag = clockT;
  }
});
function endPtr(e) {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; $('stick').hidden = true; }
  if (e.pointerId === look.id) look.id = null;
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr); cv.addEventListener('lostpointercapture', endPtr);
cv.addEventListener('wheel', e => { if (mode !== 'play') return; e.preventDefault(); camDist = clamp(camDist + e.deltaY * 0.01, 3.5, 14); }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Física del jugador ----------
function blockedByWater(x, z) { return riverDist(x, z) < 4.1 && !bridgeAt(x, z); }
function resolveBoxes(x, z, R) {
  for (const b of BOXES) {
    const dx = x - b.x, dz = z - b.z;
    if (Math.abs(dx) > b.hw + b.hd + R || Math.abs(dz) > b.hw + b.hd + R) continue;
    const c = Math.cos(b.r), s = Math.sin(b.r);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const qx = clamp(lx, -b.hw, b.hw), qz = clamp(lz, -b.hd, b.hd);
    let px = lx - qx, pz = lz - qz; const d = Math.hypot(px, pz);
    if (d >= R) continue;
    let nlx, nlz;
    if (d > 1e-5) { nlx = qx + px / d * R; nlz = qz + pz / d * R; }
    else { const ex = b.hw - Math.abs(lx), ez = b.hd - Math.abs(lz); if (ex < ez) { nlx = Math.sign(lx || 1) * (b.hw + R); nlz = lz; } else { nlx = lx; nlz = Math.sign(lz || 1) * (b.hd + R); } }
    x = b.x + nlx * c + nlz * s; z = b.z - nlx * s + nlz * c;
  }
  return [x, z];
}
function movePlayer(dt) {
  let ix = 0, iy = 0;
  if (!dialogOpen) {
    if (keys['w'] || keys['arrowup']) iy += 1;
    if (keys['s'] || keys['arrowdown']) iy -= 1;
    if (keys['a'] || keys['arrowleft']) ix -= 1;
    if (keys['d'] || keys['arrowright']) ix += 1;
    ix += stick.x; iy += stick.y;
  }
  let mag = Math.min(1, Math.hypot(ix, iy));
  if (mag < 0.12) mag = 0;
  const run = keys['shift'] || (stick.id !== null && mag > 0.92);
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = -fz, rz = fx;
  let dx = fx * iy + rx * ix, dz = fz * iy + rz * ix; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  const target = mag * (run ? 7.2 : 4.3);
  const acc = mag > 0 ? 14 : 18;
  P.vx = lerp(P.vx, dx * target, 1 - Math.exp(-acc * dt));
  P.vz = lerp(P.vz, dz * target, 1 - Math.exp(-acc * dt));
  let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
  // Pretiles: dentro del puente no se sale por los lados
  const onB = bridgeAt(P.x, P.z);
  if (onB && riverDist(nx, nz) < 4.3) nz = clamp(nz, onB.z - onB.w / 2 + 0.35, onB.z + onB.w / 2 - 0.35);
  if (blockedByWater(nx, nz)) {
    if (!blockedByWater(nx, P.z)) nz = P.z; else if (!blockedByWater(P.x, nz)) nx = P.x; else { nx = P.x; nz = P.z; }
  }
  [nx, nz] = resolveBoxes(nx, nz, 0.42);
  const r = Math.hypot(nx, nz); if (r > 96) { nx *= 96 / r; nz *= 96 / r; }
  if (blockedByWater(nx, nz)) { nx = P.x; nz = P.z; }
  P.speed = Math.hypot(nx - P.x, nz - P.z) / Math.max(dt, 1e-4);
  P.x = nx; P.z = nz;
  if (mag > 0) {
    const h = Math.atan2(dx, dz); let d = h - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    P.heading += d * (1 - Math.exp(-12 * dt));
    if (clockT - lastDrag > 1.4 && iy > 0.3) { let cd = (P.heading + Math.PI) - camYaw; cd = Math.atan2(Math.sin(cd), Math.cos(cd)); camYaw += cd * (1 - Math.exp(-1.6 * dt)); }
    if (P.speed > 0.5) { S.water = Math.max(0, S.water - dt * (run ? 0.42 : 0.2)); }
  }
  player.position.set(P.x, groundY(P.x, P.z), P.z); player.rotation.y = P.heading;
}


// ---------- Bucle ----------
const clock = new T.Clock();
const camTarget = new T.Vector3(), tmpV = new T.Vector3(), lookV = new T.Vector3();
let waterSaveT = 0, lowWarned = false;
function checkZones() {
  if (S.step === 1 && bridgeAt(P.x, P.z) === BRIDGES[0] && Math.abs(P.x - BRIDGES[0].cx) < 2) { giveCard('puente'); setStep(2); }
  if (S.step === 3 && Math.hypot(P.x - CHURCH.dx, P.z - CHURCH.dz) < 5) { giveCard('iglesia'); setStep(4); }
  if (S.water < 20 && !lowWarned) { lowWarned = true; toast('La cantimplora está casi vacía. Rellénala en la fuente de la plaza.'); }
  if (S.water > 40) lowWarned = false;
}
function updateNear() {
  near = null; let bd = 1e9;
  for (const it of interactables()) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; near = it; } }
  const btn = $('action'), tag = $('tag');
  if (near && !dialogOpen && !paused) {
    btn.hidden = false; if (btn.textContent !== near.label) btn.textContent = near.label;
    tmpV.set(near.x, groundY(near.x, near.z) + (near.kind === 'npc' ? 2.3 : 3), near.z).project(camera);
    if (tmpV.z < 1) { tag.hidden = false; tag.textContent = near.name; tag.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; tag.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px'; } else tag.hidden = true;
  } else { btn.hidden = true; tag.hidden = true; }
}
function updateHudNav() {
  const tg = STEPS[S.step].target();
  if (!tg) { marker.visible = false; $('objDist').textContent = ''; $('objArrow').style.visibility = 'hidden'; return; }
  marker.visible = true; $('objArrow').style.visibility = 'visible';
  marker.position.set(tg.x, groundY(tg.x, tg.z), tg.z);
  const vx = tg.x - P.x, vz = tg.z - P.z, dist = Math.hypot(vx, vz);
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const ang = Math.atan2(vx * -fz + vz * fx, vx * fx + vz * fz);
  $('objArrow').firstElementChild.style.transform = `rotate(${ang}rad)`;
  $('objDist').textContent = dist < 4 ? 'Estás aquí' : `a ${Math.round(dist)} m`;
}
function showcaseCamera(dt, t) {
  const narrow = innerWidth < 760 || innerWidth / innerHeight < 1;
  const close = mode === 'personaje';
  const dist = close ? (narrow ? 4.6 : 3.3) : (narrow ? 6.8 : 5.4);
  const yaw = 0.72 + (close ? 0 : Math.sin(t * 0.12) * 0.22), pitch = close ? 0.1 : 0.13;
  const py = player.position.y;
  camTarget.set(player.position.x, py + (close ? 1.05 : 1.15), player.position.z);
  const cx = camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist, cz = camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist;
  tmpV.set(cx, camTarget.y + Math.sin(pitch) * dist, cz);
  camera.position.lerp(tmpV, 1 - Math.exp(-4 * dt));
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  lookV.copy(camTarget);
  if (narrow) lookV.y -= dist * (close ? 0.3 : 0.26);
  else if (mode === 'home') { lookV.x -= rx * dist * 0.34; lookV.z -= rz * dist * 0.34; }
  else { lookV.x += rx * dist * 0.3; lookV.z += rz * dist * 0.3; }
  camera.lookAt(lookV);
  player.rotation.y = yaw - (close ? 0 : 0.35) + heroSpin;
}
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); clockT += dt; const t = clockT;
  const playing = mode === 'play';
  if (playing && !paused) { movePlayer(dt); checkZones(); }
  if (pelota) pelota.update(dt); else animateChar(player, playing ? P.speed : 0, dt, t, false);
  NPCS.forEach(n => {
    if (pelota && n === pelotaRival) return;
    animateChar(n.obj, 0, dt, t + n.x, talkNpc === n);
    if (playing) {
      const d = Math.hypot(P.x - n.x, P.z - n.z);
      if (d < 6) { const want = Math.atan2(P.x - n.x, P.z - n.z); let dd = want - n.obj.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); n.obj.rotation.y += dd * (1 - Math.exp(-4 * dt)); }
    }
  });
  sheep.forEach(s => {
    s.t -= dt;
    if (s.t < 0) { s.t = 3 + rnd() * 5; s.tx = clamp(s.g.position.x + (rnd() - 0.5) * 6, 38, 60); s.tz = clamp(s.g.position.z + (rnd() - 0.5) * 6, -16, 10); }
    const dx = s.tx - s.g.position.x, dz = s.tz - s.g.position.z, d = Math.hypot(dx, dz);
    if (d > 0.2) { s.g.position.x += dx / d * dt * 0.6; s.g.position.z += dz / d * dt * 0.6; s.g.rotation.y = Math.atan2(dx, dz); s.head.position.y = 0.95; }
    else s.head.position.y = 0.6 + Math.sin(t * 3 + s.tx) * 0.04;
    s.g.position.y = terrainHeight(s.g.position.x, s.g.position.z);
  });
  birds.forEach(b => { b.a += b.s * dt; b.g.position.set(b.cx + Math.cos(b.a) * b.r, b.y, b.cz + Math.sin(b.a) * b.r); b.g.rotation.y = -b.a; const f = Math.sin(t * 6 + b.r) * 0.5; b.g.children[0].rotation.z = f; b.g.children[1].rotation.z = -f; });
  waterMeshes.forEach(w => { w.material.map.offset.y -= dt * 0.35; });
  marker.userData.gem.rotation.y += dt * 1.8; marker.userData.gem.position.y = 3.2 + Math.sin(t * 2.4) * 0.25;
  marker.visible = playing && marker.visible;

  if (playing) {
    const py = player.position.y;
    camTarget.set(P.x, py + 1.5, P.z);
    const cx = P.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, cz = P.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    let cy = py + 1.5 + Math.sin(camPitch) * camDist; cy = Math.max(cy, groundY(cx, cz) + 0.9);
    camera.position.lerp(tmpV.set(cx, cy, cz), 1 - Math.exp(-10 * dt)); camera.lookAt(camTarget);
    updateNear(); updateHudNav(); updateObjective(false);
  } else if (mode !== 'pelota') showcaseCamera(dt, t);
  sun.position.set(player.position.x + 40, 70, player.position.z + 25); sun.target.position.set(player.position.x, 0, player.position.z);

  waterSaveT += dt; if (waterSaveT > 1) { waterSaveT = 0; if (playing) { updateWater(); save(); } }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  renderer.render(scene, camera);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play' && !paused) openScreen('menu'); });


function snapshot() {
  try {
    const a = camera.aspect; camera.aspect = 1.3; camera.updateProjectionMatrix();
    camera.position.set(34, 24, 46); camera.lookAt(0, 1, -4);
    renderer.render(scene, camera);
    const c = document.createElement('canvas'); c.width = 260; c.height = 200;
    c.getContext('2d').drawImage(renderer.domElement, 0, 0, c.width, c.height);
    camera.aspect = a; camera.updateProjectionMatrix();
    return c.toDataURL('image/jpeg', 0.82);
  } catch (e) { return ''; }
}

// Arranque
resetPlayer(); updateWater(); updateObjective(true);
let started = false;
function boot() {
  if (started) return; started = true;
  TOWN_THUMB = snapshot();
  $('loading').hidden = true;
  go('home');
  frame();
}
loadGLB(boot);
setTimeout(boot, 6000);
window.__game = { startPelota, get pelota() { return pelota; }, FRONTON, P, get S() { return S; }, NPCS, BOXES, CHURCH, PALACES, bridgeAt, riverDist, setStep, go, get mode() { return mode; }, get glb() { return !!GLB; }, get player() { return player; } };
})();
