// Pista polideportiva del pueblo (fútbol sala): una pista exterior de 40 × 20 m con su zona de seguridad de 2 m, las
// líneas reglamentarias pintadas, dos porterías de 3 × 2 m con red y un murete alrededor, como las de los
// polideportivos de los pueblos de Navarra. Se busca un sitio llano y libre cerca de la plaza; si el pueblo no tiene
// sitio, no tiene pista. El partido se juega en el módulo de fútbol (src/futbol, campo 'pista').
// (Adaptación: el sitio no está comprobado con la ortofoto de IDENA.)
import * as THREE from 'three';
import { terrainHeight, waterLevelAt, addPlatform } from '../world/heightfield.js';
import { addBox, isFree } from '../world/colliders.js';
import { clearGrass } from '../world/nature.js';
import { VENUES } from '../futbol/rules.js';

const PL = 40, PW = 20, M = 2, HL = PL / 2 + M, HW = PW / 2 + M;   // pista y zona de seguridad (44 × 24 m)

/** Sitio llano y libre para la pista (44 × 24 m más un margen), cerca de un punto; null si no cabe. */
export function findPistaSpot(near) {
  let best = null, bs = 1e9;
  for (let r = 40; r <= 230; r += 10) for (let a = 0; a < Math.PI * 2; a += 0.18) {
    const x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r, ry = Math.atan2(near.x - x, near.z - z) + Math.PI / 2;   // la banda larga mira hacia el pueblo
    const c = Math.cos(ry), s = Math.sin(ry); let mn = 1e9, mx = -1e9, ok = true;
    for (let lx = -HL - 1; lx <= HL + 1.01 && ok; lx += 3) for (let lz = -HW - 1; lz <= HW + 1.01; lz += 3) {
      const X = x + lx * c + lz * s, Z = z - lx * s + lz * c;
      if (!isFree(X, Z, 1.2) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.3) { ok = false; break; }
      const h = terrainHeight(X, Z); mn = Math.min(mn, h); mx = Math.max(mx, h);
    }
    if (!ok || mx - mn > 2.2) continue;
    const score = (mx - mn) * 10 + r * 0.04;
    if (score < bs) { bs = score; best = { x, z, ry, y: mx + 0.06 }; }
  }
  return best;
}

// la pista pintada: zona de seguridad, pista y líneas de 8 cm (área en D, puntos de penalti a 6 y 10 m, círculo de 3 m)
function courtTexture(px = 1536) {
  const V = VENUES.pista, k = px / (2 * HL), H = Math.round(2 * HW * k);
  const c = document.createElement('canvas'); c.width = px; c.height = H; const g = c.getContext('2d');
  const X = (x) => (x + HL) * k, Y = (z) => (z + HW) * k;
  g.fillStyle = V.courtOut; g.fillRect(0, 0, px, H);
  g.fillStyle = V.court; g.fillRect(X(-PL / 2), Y(-PW / 2), PL * k, PW * k);
  for (let i = 0; i < px * H / 3; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; g.fillRect(Math.random() * px, Math.random() * H, 1, 1); }
  g.strokeStyle = '#f4f6f2'; g.fillStyle = '#f4f6f2'; g.lineWidth = Math.max(2, 0.08 * k);
  g.strokeRect(X(-PL / 2), Y(-PW / 2), PL * k, PW * k);
  g.beginPath(); g.moveTo(X(0), Y(-PW / 2)); g.lineTo(X(0), Y(PW / 2)); g.stroke();
  g.beginPath(); g.arc(X(0), Y(0), 3 * k, 0, Math.PI * 2); g.stroke();
  const dot = (x, z) => { g.beginPath(); g.arc(X(x), Y(z), 0.1 * k, 0, Math.PI * 2); g.fill(); };
  dot(0, 0);
  for (const s of [-1, 1]) {
    const gx = s * PL / 2;
    g.beginPath(); g.arc(X(gx), Y(1.5), 6 * k, s > 0 ? Math.PI / 2 : 0, s > 0 ? Math.PI : Math.PI / 2); g.stroke();
    g.beginPath(); g.arc(X(gx), Y(-1.5), 6 * k, s > 0 ? Math.PI : -Math.PI / 2, s > 0 ? 1.5 * Math.PI : 0); g.stroke();
    g.beginPath(); g.moveTo(X(gx - s * 6), Y(-1.5)); g.lineTo(X(gx - s * 6), Y(1.5)); g.stroke();
    dot(gx - s * 6, 0); dot(gx - s * 10, 0);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 1); g.lineTo(32, 1); g.moveTo(1, 0); g.lineTo(1, 32); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export class Pista {
  constructor(scene, spot) {
    this.spot = spot;
    const g = this.group = new THREE.Group(); g.position.set(spot.x, spot.y, spot.z); g.rotation.y = spot.ry;
    const owned = this.owned = [];
    const mesh = (geo, mat) => { owned.push(geo, mat); const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
    // base de hormigón (por si el terreno baja) y la pista pintada encima
    const base = mesh(new THREE.BoxGeometry(2 * HL + 0.6, 3, 2 * HW + 0.6), new THREE.MeshStandardMaterial({ color: '#9b978c', roughness: 0.95 }));
    base.position.y = -1.52; base.receiveShadow = true;
    const tex = courtTexture(); owned.push(tex);
    const floor = mesh(new THREE.PlaneGeometry(2 * HL, 2 * HW).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    floor.position.y = 0.005; floor.receiveShadow = true;
    // porterías: postes y larguero blancos de 8 cm y red de 1 m de fondo
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), nt = netTexture(); owned.push(white, nt);
    const post = new THREE.CylinderGeometry(0.04, 0.04, 2.04, 10), bar = new THREE.CylinderGeometry(0.04, 0.04, 3.08, 10); owned.push(post, bar);
    for (const s of [-1, 1]) {
      const gx = s * PL / 2;
      for (const z of [-1.54, 1.54]) { const m = new THREE.Mesh(post, white); m.position.set(gx, 1.02, z); m.castShadow = true; g.add(m); }
      const b = new THREE.Mesh(bar, white); b.rotation.x = Math.PI / 2; b.position.set(gx, 2.02, 0); b.castShadow = true; g.add(b);
      const netMat = (w, h) => { const t = nt.clone(); t.needsUpdate = true; t.repeat.set(w / 0.12, h / 0.12); owned.push(t); const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, transparent: true, side: THREE.DoubleSide, roughness: 0.9 }); owned.push(m); return m; };
      const back = mesh(new THREE.PlaneGeometry(3.08, 2.02), netMat(3.08, 2.02)); back.rotation.y = Math.PI / 2; back.position.set(gx + s * 1, 1.01, 0);
      for (const z of [-1.54, 1.54]) { const sd = mesh(new THREE.PlaneGeometry(1, 2.02), netMat(1, 2.02)); sd.position.set(gx + s * 0.5, 1.01, z); }
      const top = mesh(new THREE.PlaneGeometry(1, 3.08), netMat(1, 3.08)); top.rotation.x = -Math.PI / 2; top.position.set(gx + s * 0.5, 2.02, 0);
    }
    // murete de piedra con la entrada en el centro de la banda que mira al pueblo (+z local), y su colisión
    const stone = new THREE.MeshStandardMaterial({ color: '#a59a86', roughness: 0.95 }); owned.push(stone);
    const walls = [[2 * HL + 0.6, 0, -HW - 0.15, 0], [HL - 3, -(HL + 3) / 2 - 0.15, HW + 0.15, 0], [HL - 3, (HL + 3) / 2 + 0.15, HW + 0.15, 0], [2 * HW, -HL - 0.15, 0, Math.PI / 2], [2 * HW, HL + 0.15, 0, Math.PI / 2]];
    this.boxes = [];
    for (const [len, x, z, ry] of walls) {
      const m = mesh(new THREE.BoxGeometry(len, 0.7, 0.3), stone); m.position.set(x, 0.35, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
      this.boxes.push({ x, z, w: ry ? 0.3 : len, d: ry ? len : 0.3 });
    }
    // las porterías tampoco se atraviesan
    for (const s of [-1, 1]) this.boxes.push({ x: s * (PL / 2 + 0.5), z: 0, w: 1.0, d: 3.2 });
    scene.add(g); g.updateMatrixWorld(true);
    for (const b of this.boxes) { const p = this.toWorld(b.x, b.z); addBox(p.x, p.z, b.w, b.d, spot.ry, { solidView: true }); }
    addPlatform(spot.x, spot.z, spot.ry, -HL, HL, -HW, HW, spot.y);   // la pista es suelo
    // rampa de hormigón en la entrada (la pista queda a nivel del punto más alto del terreno): del borde de la pista
    // hasta el suelo, con la pendiente justa
    const end0 = this.toWorld(0, HW + 4), drop = Math.max(0, spot.y - terrainHeight(end0.x, end0.z));
    const RL = Math.min(10, Math.max(2, drop * 4)), endW = this.toWorld(0, HW + RL), yEnd = Math.min(spot.y, terrainHeight(endW.x, endW.z) + 0.02);
    if (spot.y - yEnd > 0.12) {
      const RW = 5.6, dy = spot.y - yEnd, geo = new THREE.BufferGeometry();
      // tablero inclinado y dos costados (en coordenadas locales de la pista)
      const v = [-RW / 2, 0, HW, RW / 2, 0, HW, RW / 2, -dy, HW + RL, -RW / 2, -dy, HW + RL,
        -RW / 2, -dy - 1.5, HW, -RW / 2, 0, HW, -RW / 2, -dy, HW + RL, -RW / 2, -dy - 1.5, HW + RL,
        RW / 2, 0, HW, RW / 2, -dy - 1.5, HW, RW / 2, -dy - 1.5, HW + RL, RW / 2, -dy, HW + RL];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex([0, 3, 2, 0, 2, 1, 4, 6, 5, 4, 7, 6, 8, 10, 9, 8, 11, 10]); geo.computeVertexNormals();
      const ramp = mesh(geo, new THREE.MeshStandardMaterial({ color: '#b3ada0', roughness: 0.95, side: THREE.DoubleSide })); ramp.receiveShadow = true;
      g.updateMatrixWorld(true);
      addPlatform(spot.x, spot.z, spot.ry, -RW / 2, RW / 2, HW - 0.01, HW + RL, spot.y, yEnd);
      for (const sx of [-1, 1]) { const p = this.toWorld(sx * (RW / 2 + 0.15), HW + RL / 2); addBox(p.x, p.z, 0.3, RL, spot.ry, { solidView: false }); }
    }
    this.rampL = RL;
    const mid = this.toWorld(0, -HW); clearGrass(mid.x, mid.z, 2 * HL, 2 * HW, spot.ry);
    this.entry = this.toWorld(4.6, HW + 1.4);   // junto a la entrada, al lado de la rampa
    this.center = this.toWorld(0, 0);
  }
  toWorld(lx, lz) { const v = new THREE.Vector3(lx, 0, lz); this.group.localToWorld(v); return v; }
  dispose() { this.group.parent?.remove(this.group); for (const o of this.owned) o.dispose?.(); }
}
