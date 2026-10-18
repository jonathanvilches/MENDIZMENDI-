// La pasaka en 3D, con los avatares del juego (data/pasaka.js: qué es; ui/pasaka.js: la ficha del menú y el premio).
// El sobreclaustro se monta una vez por pueblo, muy por encima y fuera de sus límites como el frontón cubierto
// (fronton.js, hallVenue): un pasillo largo con el techo de vigas, la arquería sobre el jardín del claustro con el
// público de pie, el banco de piedra con gente sentada, el frontis con su chapa, la red por la mitad, las líneas del
// suelo y una valla de madera a nuestra espalda (la cámara va detrás de ella). El partido mueve a tu avatar (tu rig de
// siempre, con el brazo del golpe), al canónigo de pareja y a los dos rivales (vecinos del pueblo), con la física de
// la pelota (gravedad, bote, paredes, techo y red), el saque con la mano que tiene que llegar al frontis, los quinces
// (15, 30, 40 y juego) y el partido a tres juegos. Se juega con el mismo mando que la pelota: palanca o flechas para
// moverse y dos botones, Golpe (fuerte, al fondo) y Dejada (corta, junto a la red).
import * as THREE from 'three';
import { PASAKA, PISTA } from '../data/pasaka.js';
import { TEX } from '../world/textures.js';
import { box } from '../world/builder.js';
import { addPlatform } from '../world/heightfield.js';
import { Actor } from '../actors/people.js';
import { armSwing } from '../actors/glbChar.js';
import { pelotaStyle, X_ICON } from '../pelota/hud.js';
import { fitCircles } from '../ui/fitlabel.js';
import { crowd3d } from '../actors/crowd3d.js';
import { drawArms } from '../world/heraldry.js';
import { armsReady, drawReady } from '../ui/escudoImg.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { tr, isEU } from '../i18n.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const { W, L, NETH, SAQUE, CHAPA } = PISTA, NETZ = L / 2, CEIL = 5.8, GRAV = 9.81, R = 0.034, VALLA = 1.6, Y = 2400;
const QN = ['0', '15', '30', '40'], SX = -1;   // (la cámara mira hacia +z: la derecha de la pantalla es -x en la cancha)

// ---------- el recinto ----------
let VENUE = null;
const mat = (tex, color, o = {}) => new THREE.MeshStandardMaterial({ map: tex?.map || null, normalMap: tex?.normalMap || null, color, roughness: 0.92, metalness: 0, ...o });
function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(245,240,230,.95)'; g.lineWidth = 5; g.strokeRect(2.5, 2.5, 59, 59);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 0.12, NETH / 0.12); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** El sobreclaustro en `out` (coordenadas del mundo), a 2400 m: { group, toWorld, entry, ball, shadow, ring, setScore, dispose }. */
export function pasakaVenue(scene, out) {
  if (VENUE && VENUE.group.parent === scene) return VENUE;
  if (VENUE) VENUE.dispose();
  const g = new THREE.Group(); g.position.set(out.x, Y, out.z); scene.add(g);
  const geos = [], mats = [], M4 = new THREE.Matrix4();
  const add = (geo, m, x, y, z, ry = 0, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = shadow; o.receiveShadow = true; g.add(o); geos.push(geo); return o; };
  const inst = (geo, m, places, shadow = true) => { const im = new THREE.InstancedMesh(geo, m, places.length); places.forEach((t, i) => { M4.makeTranslation(t[0], t[1], t[2]); if (t[3]) M4.multiply(new THREE.Matrix4().makeRotationY(t[3])); im.setMatrixAt(i, M4); }); im.instanceMatrix.needsUpdate = true; im.castShadow = shadow; im.receiveShadow = true; g.add(im); geos.push(geo); return im; };
  const stone = mat(TEX.ashlar, '#dccca9'), stoneD = mat(TEX.ashlar, '#b9a784'), stoneW = mat(TEX.stoneWall, '#c9bb9c'), floor = mat(TEX.cobble, '#c48f7a'), border = mat(TEX.ashlar, '#cdbd9c');
  const wood = mat(TEX.wood, '#a8784e'), plank = mat(TEX.woodDark, '#8a6244'), valla = mat(TEX.wood, '#8a6238'), dirt = mat(TEX.dirt, '#c9b48e'), grass = mat(TEX.grass, '#86a85a');
  const white = new THREE.MeshStandardMaterial({ color: '#f4efe2', roughness: 0.8 }), chapa = new THREE.MeshStandardMaterial({ color: '#7a3b32', roughness: 0.5, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2e2620', roughness: 1 }), iron = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.6 });
  const glow = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb347', emissiveIntensity: 0.9, roughness: 0.4 }), hedge = new THREE.MeshStandardMaterial({ color: '#3f6a34', roughness: 1 });
  const cypress = new THREE.MeshStandardMaterial({ color: '#2f4a2a', roughness: 1 }), water = new THREE.MeshStandardMaterial({ color: '#5f8fb0', roughness: 0.15, metalness: 0.2, emissive: '#1f3a50', emissiveIntensity: 0.35 });
  mats.push(stone, stoneD, stoneW, floor, border, wood, plank, valla, dirt, grass, white, chapa, dark, iron, glow, hedge, cypress, water);
  const Z0 = -9, ZL = L - Z0 + 1.2, ZC = (L + Z0) / 2;   // (el pasillo sigue detrás de la cámara)
  // suelo de losas con una cenefa de piedra junto a las paredes y las líneas
  add(box(W + 1.2, 0.3, ZL, 1.4), floor, 0, -0.15, ZC, 0, false);
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) add(box(0.6, 0.02, ZL, 1.2), border, x, 0.004, ZC, 0, false);
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15, 0]) add(box(0.08, 0.012, L, 1), white, x, 0.012, L / 2, 0, false);
  for (const z of [NETZ - SAQUE, NETZ, NETZ + SAQUE]) add(box(W, 0.012, 0.08, 1), white, 0, 0.012, z, 0, false);
  // pared izquierda: sillares, zócalo, cornisa, ventanas apuntadas con alféizar y el banco corrido
  add(box(0.6, CEIL + 0.6, ZL, 2.2), stone, -W / 2 - 0.3, (CEIL + 0.6) / 2, ZC);
  add(box(0.12, 0.9, ZL, 1.2), stoneD, -W / 2 + 0.06, 0.45, ZC);
  add(box(0.22, 0.26, ZL, 1.2), stoneD, -W / 2 + 0.11, CEIL - 0.13, ZC);
  add(box(0.45, 0.5, L - Z0, 1.5), stoneD, -W / 2 + 0.225, 0.25, ZC);
  const winZ = []; for (let z = 3; z < L - 1; z += 4.6) winZ.push(z);
  inst(new THREE.BoxGeometry(0.1, 1.5, 0.7), dark, winZ.map(z => [-W / 2 + 0.03, 3.3, z]), false);
  inst(new THREE.BoxGeometry(0.16, 1.62, 0.84), stoneD, winZ.map(z => [-W / 2 + 0.02, 3.3, z]));
  inst(new THREE.BoxGeometry(0.3, 0.1, 0.95), stone, winZ.map(z => [-W / 2 + 0.12, 2.5, z]));
  inst(new THREE.ConeGeometry(0.5, 0.5, 4), stoneD, winZ.map(z => [-W / 2 + 0.02, 4.3, z, Math.PI / 4]));
  // derecha: parapeto con moldura, columnas torneadas con basa y capitel, arcos de medio punto y el muro sobre ellos
  add(box(0.5, 1.0, ZL, 1.5), stone, W / 2 + 0.25, 0.5, ZC);
  add(box(0.64, 0.12, ZL, 1.2), stoneD, W / 2 + 0.25, 1.06, ZC);
  const cols = []; for (let z = Z0 + 0.5; z < L; z += 3.6) cols.push(z);
  inst(new THREE.CylinderGeometry(0.22, 0.25, 2.5, 14), stone, cols.map(z => [W / 2 + 0.25, 2.37, z]));
  inst(new THREE.BoxGeometry(0.6, 0.22, 0.6), stoneD, cols.map(z => [W / 2 + 0.25, 1.23, z]));
  inst(new THREE.CylinderGeometry(0.34, 0.24, 0.3, 14), stoneD, cols.map(z => [W / 2 + 0.25, 3.77, z]));
  inst(new THREE.BoxGeometry(0.7, 0.2, 0.7), stoneD, cols.map(z => [W / 2 + 0.25, 4.02, z]));
  const span = 3.6, rA = span / 2 - 0.25, hA = CEIL + 0.6 - 4.12, arcShape = new THREE.Shape();
  arcShape.moveTo(-span / 2, 0); arcShape.lineTo(-rA, 0); arcShape.absarc(0, 0, rA, Math.PI, 0, true); arcShape.lineTo(span / 2, 0); arcShape.lineTo(span / 2, hA); arcShape.lineTo(-span / 2, hA); arcShape.closePath();
  const arcG = new THREE.ExtrudeGeometry(arcShape, { depth: 0.5, bevelEnabled: false, curveSegments: 12 }); arcG.rotateY(Math.PI / 2);
  inst(arcG, stone, cols.map(z => [W / 2, 4.12, z + span / 2]));
  add(box(0.22, 0.26, ZL, 1.2), stoneD, W / 2 + 0.11, CEIL - 0.13, ZC);
  // techo: tablas, vigas sobre ménsulas y dos jácenas; faroles de hierro colgando
  add(box(W + 1.4, 0.16, ZL, 1.5), plank, 0, CEIL + 0.08, ZC, 0, false);
  const beamZ = []; for (let z = Z0 + 0.3; z < L; z += 0.65) beamZ.push(z);
  inst(new THREE.BoxGeometry(W + 1.2, 0.26, 0.22), wood, beamZ.map(z => [0, CEIL - 0.13, z]));
  inst(new THREE.BoxGeometry(0.3, 0.2, 0.3), stoneD, beamZ.flatMap(z => [[-W / 2 + 0.15, CEIL - 0.36, z], [W / 2 - 0.15, CEIL - 0.36, z]]));
  for (const x of [-W / 4, W / 4]) add(box(0.3, 0.3, L - Z0, 1.5), wood, x, CEIL - 0.3, ZC);
  const lampZ = [2, 8, NETZ, 20, 26];
  inst(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), iron, lampZ.map(z => [0, CEIL - 0.6, z]), false);
  inst(new THREE.BoxGeometry(0.34, 0.42, 0.34), iron, lampZ.map(z => [0, CEIL - 1.1, z]), false);
  inst(new THREE.BoxGeometry(0.26, 0.3, 0.26), glow, lampZ.map(z => [0, CEIL - 1.1, z]), false);
  // el frontis con su chapa, el escudo y el marcador; la valla de madera a nuestra espalda y el muro del fondo del pasillo
  add(box(W + 1.2, CEIL + 0.6, 0.6, 2.2), stone, 0, (CEIL + 0.6) / 2, L + 0.3);
  add(box(W, CHAPA, 0.06, 1), chapa, 0, CHAPA / 2, L - 0.03); add(box(W, 0.04, 0.07, 1), white, 0, CHAPA + 0.02, L - 0.03);
  add(box(W + 1.2, CEIL + 0.6, 0.6, 2.2), stone, 0, (CEIL + 0.6) / 2, Z0 - 0.3);
  add(box(W, 0.1, 0.12, 1), valla, 0, VALLA - 0.05, 0); add(box(W, 0.08, 0.1, 1), valla, 0, 0.5, 0);
  const slat = []; for (let i = 0, n = Math.floor(W / 0.22); i < n; i++) slat.push([-W / 2 + 0.11 + i * 0.22, (VALLA - 0.1) / 2, 0]);
  inst(new THREE.BoxGeometry(0.07, VALLA - 0.1, 0.05), valla, slat);
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) add(box(0.12, VALLA, 0.12, 1), valla, x, VALLA / 2, 0);
  // (el marcador: una tabla de madera con los juegos y los quinces, que se repinta en cada tanto)
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 192; const scT = new THREE.CanvasTexture(sc); scT.colorSpace = THREE.SRGBColorSpace;
  const scM = new THREE.MeshStandardMaterial({ map: scT, roughness: 0.8 }); mats.push(scM);
  add(box(3.6, 1.4, 0.12, 1), plank, 0, 3.6, L - 0.06); add(new THREE.PlaneGeometry(3.3, 1.2), scM, 0, 3.6, L - 0.13, Math.PI, false);
  const setScore = (g0, q0, g1, q1, rojos = 'ROJOS', azules = 'AZULES') => {
    const c = sc.getContext('2d'); c.fillStyle = '#3b2a1c'; c.fillRect(0, 0, 512, 192); c.strokeStyle = '#d9c08a'; c.lineWidth = 6; c.strokeRect(10, 10, 492, 172);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff9a8a'; c.font = 'bold 34px Nunito, sans-serif'; c.fillText(rojos, 128, 50); c.fillStyle = '#9fc0ff'; c.fillText(azules, 384, 50);
    c.fillStyle = '#f6ecd6'; c.font = 'bold 92px Nunito, sans-serif'; c.fillText(String(g0), 128, 122); c.fillText(String(g1), 384, 122);
    c.fillStyle = '#ffe08a'; c.font = 'bold 40px Nunito, sans-serif'; c.fillText(`${q0} · ${q1}`, 256, 122); scT.needsUpdate = true;
  };
  setScore(0, 0, 0, 0);
  // (el escudo de Pamplona sobre el marcador: el del autor en cuanto llega su imagen, src/ui/escudoImg.js; mientras, el tallado en piedra)
  try { const A = armsOfTown('pamplona'); if (A) { const ac = document.createElement('canvas'); ac.width = 256; ac.height = 320; const ag = ac.getContext('2d'); drawArms(ag, 128, 10, 170, A, { stone: true }); const aT = new THREE.CanvasTexture(ac); aT.colorSpace = THREE.SRGBColorSpace; const aM = new THREE.MeshStandardMaterial({ map: aT, transparent: true, roughness: 0.9 }); mats.push(aM); add(new THREE.PlaneGeometry(1.1, 1.38), aM, 0, 4.95, L - 0.1, Math.PI, false);
    armsReady('pamplona').then(Lm => { if (!Lm) return; ag.clearRect(0, 0, 256, 320); drawReady(ag, Lm, 12, 8, 232, 304); aT.needsUpdate = true; }); } } catch (e) { console.warn('escudo pasaka', e); }
  // la red: paño, cinta, postes y la correa del centro
  const netT = netTexture(), netM = new THREE.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); mats.push(netM);
  add(new THREE.PlaneGeometry(W, NETH), netM, 0, NETH / 2, NETZ, 0, false).castShadow = false;
  add(box(W + 0.2, 0.07, 0.04, 1), white, 0, NETH, NETZ); add(box(0.05, NETH, 0.03, 1), white, 0, NETH / 2, NETZ);
  const postG = new THREE.CylinderGeometry(0.05, 0.06, NETH + 0.25, 10);
  for (const x of [-W / 2 - 0.08, W / 2 + 0.08]) add(postG, wood, x, (NETH + 0.25) / 2, NETZ);
  // fuera: el jardín del claustro con sus paseos en cruz, la fuente, cipreses y setos; enfrente, la otra panda con su tejado
  const GX = W / 2 + 13.5, GW = 26;
  add(box(GW, 0.2, ZL, 6), grass, GX, -0.12, ZC, 0, false);
  add(box(GW, 0.03, 1.8, 3), dirt, GX, 0.0, NETZ, 0, false); add(box(1.8, 0.03, ZL - 2, 3), dirt, GX, 0.0, ZC, 0, false);
  add(new THREE.CylinderGeometry(1.7, 1.8, 0.6, 8), stoneD, GX, 0.3, NETZ); add(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 8), water, GX, 0.58, NETZ, 0, false);
  add(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 10), stoneD, GX, 1.2, NETZ); add(new THREE.CylinderGeometry(0.55, 0.1, 0.25, 10), stoneD, GX, 1.95, NETZ);
  const cyp = [[GX - 6, Z0 + 6], [GX + 6, Z0 + 6], [GX - 6, L - 4], [GX + 6, L - 4], [GX - 9, NETZ - 7], [GX + 9, NETZ + 7]];
  inst(new THREE.ConeGeometry(0.75, 5.2, 9), cypress, cyp.map(([x, z]) => [x, 3.0, z]));
  inst(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 6), wood, cyp.map(([x, z]) => [x, 0.45, z]));
  const hedges = []; for (let z = Z0 + 3; z < L - 2; z += 3.2) if (Math.abs(z - NETZ) > 2.2) hedges.push([GX - 1.6, 0.3, z], [GX + 1.6, 0.3, z]);
  inst(new THREE.BoxGeometry(0.6, 0.6, 2.2), hedge, hedges);
  add(box(0.6, CEIL + 0.6, ZL, 2.2), stone, W / 2 + 26.5, (CEIL + 0.6) / 2, ZC);
  inst(arcG, stone, cols.map(z => [W / 2 + 26.1, 4.12, z + span / 2]));
  inst(new THREE.CylinderGeometry(0.22, 0.25, 2.5, 14), stone, cols.map(z => [W / 2 + 26.3, 2.37, z]));
  add(box(0.5, 1.0, ZL, 1.5), stone, W / 2 + 26.3, 0.5, ZC);
  const roofM = mat(TEX.roofTile, '#b5684a'); mats.push(roofM);
  add(box(6, 0.25, ZL + 2, 2), roofM, W / 2 + 24, CEIL + 2.0, ZC).rotation.z = 0.32;
  add(box(6, 0.25, ZL + 2, 2), roofM, W / 2 + 3, CEIL + 2.0, ZC).rotation.z = -0.32;
  // la pelota, su sombra y el círculo del bote (dónde va a caer en nuestro campo, para correr a tiempo)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: '#f6ecd6', roughness: 0.55, emissive: '#5a4a30', emissiveIntensity: 0.35 })); ball.castShadow = true; g.add(ball); geos.push(ball.geometry); mats.push(ball.material);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.32, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.014; g.add(shadow); geos.push(shadow.geometry); mats.push(shadow.material);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.018; ring.visible = false; g.add(ring); geos.push(ring.geometry); mats.push(ring.material);
  g.updateMatrixWorld(true);
  const toWorld = (lx, lz, ly = 0) => { const v = new THREE.Vector3(lx, ly, lz); g.localToWorld(v); return v; };
  addPlatform(out.x, out.z, 0, -W / 2, W / 2 + 0.2, Z0, L, Y);   // el pasillo es suelo (los personajes se quedan a su altura)
  // el público: de pie en los huecos de la arquería, detrás del parapeto (tres por hueco, más en el campo de los rivales)
  const stand = [];
  cols.forEach(z => { if (z + 1 < 2 || z + span - 1 > L) return; for (const k of [0.7, 1.75, 2.8]) if (Math.random() < (z > NETZ - 3 ? 0.9 : 0.6)) { const v = toWorld(W / 2 + 0.95 + Math.random() * 0.4, z + k + (Math.random() - 0.5) * 0.3); stand.push([v.x, v.y, v.z, -Math.PI / 2]); } });
  const e = toWorld(1.4, NETZ - 7.5);
  VENUE = { group: g, toWorld, entry: { x: e.x, z: e.z }, ball, shadow, ring, stand, sit: [], setScore,
    dispose() { g.parent?.remove(g); for (const x of geos) x.dispose(); for (const m of mats) { m.map?.dispose?.(); m.dispose(); } netT.dispose(); scT.dispose(); if (VENUE === this) VENUE = null; } };
  return VENUE;
}

// ---------- el partido ----------
const side = z => (z < NETZ ? 0 : 1);
const inReach = (pl, b) => Math.abs(b.x - pl.x) < pl.reach && Math.abs(b.z - pl.z) < pl.reach * 1.15 && b.y < 2.3;
// la pelota en el aire, sin nadie: hasta su primer bote en el campo que la recibe (para saber adónde correr)
function predict(b) {
  const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz }, dt = 1 / 60;
  for (let i = 0; i < 180; i++) {
    c.vy -= GRAV * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    if (c.x < -W / 2 + R) { c.x = -W / 2 + R; c.vx = Math.abs(c.vx) * 0.7; } if (c.x > W / 2 - R) { c.x = W / 2 - R; c.vx = -Math.abs(c.vx) * 0.7; }
    if (c.z > L - R) { c.z = L - R; c.vz = -Math.abs(c.vz) * 0.72; } if (c.z < R && c.y < VALLA) { c.z = R; c.vz = Math.abs(c.vz) * 0.72; }
    if (c.y > CEIL - R) { c.y = CEIL - R; c.vy = -Math.abs(c.vy) * 0.5; }
    if (c.y < R && c.vy < 0) { if (side(c.z) !== b.last) return { x: c.x, z: c.z, t: i * dt }; c.y = R; c.vy = -c.vy * 0.58; c.vx *= 0.82; c.vz *= 0.82; }
  }
  return { x: c.x, z: c.z, t: 3 };
}
const mkPl = (team, x, z, me, i) => ({ team, x, z, tx: x, tz: z, hx: x, hz: z, me, speed: me ? 5.8 : 5.3 + i * 0.2, reach: me ? 1.9 : 1.55, moving: false, vNow: 0, want: null, wantT: 0, take: false, miss: false, decided: -1, swingT: -1, wind: 0, heading: team ? Math.PI : 0 });

// (la interfaz es la misma del partido de pelota, src/pelota/hud.js: la X, el marcador, los botones redondos, la palanca y
// el rótulo de la fuerza. Aquí solo lo propio de la pasaka)
const CSS = `
.pk-hud{z-index:22}
.pk-hud .pel-call.bad h3{color:#ffb4c8}
.pk-hud .pel-side span{max-width:none}
.pk-hud .pel-mid{min-width:72px;font-size:var(--fs-sm);letter-spacing:.06em;color:#fff}`;

/**
 * Partido de pasaka en el sobreclaustro. G: el juego del pueblo (player, camera, follow, ui, sound, sky, walkers, rt);
 * V: el recinto (pasakaVenue); partner: el Actor que juega de pareja (el canónigo). Devuelve { win, g } o { quit }.
 * stay: al acabar no se vuelve al sitio (el menú de Campeonatos sigue en el claustro).
 */
export function playPasaka(G, V, partner, { games = 3, stay = false, home: home0 = null } = {}) {
  if (window.__autoWin) return Promise.resolve({ win: true, g: [games, 0] });
  if (window.__pasakaGames) games = window.__pasakaGames;   // (pruebas: partidos largos para medir)
  return new Promise(res => {
    const P = G.player, rig0 = P.rig, S = G.sound, eu = isEU(), cam = G.camera;
    const home = home0 || { x: P.pos.x, z: P.pos.z, h: P.heading }, pHome = partner ? { x: partner.pos.x, z: partner.pos.z, h: partner.heading } : null;
    const st = { t: 0, phase: 'intro', phaseT: 0, g: [0, 0], q: [0, 0], server: 0, faults: 0, games, over: false, auto: false, hitId: 0, charge: null, log: [], hits: 0,
      ball: { x: 0, y: 1, z: 7, vx: 0, vy: 0, vz: 0, last: 0, crossed: false, bounces: 0, dead: false, inPlay: false, serve: false, serveOk: false, serveB: 0, held: -1 },
      pl: [mkPl(0, 1.4, NETZ - 7.5, true, 0), mkPl(0, -2.4, NETZ - 5.5, false, 1), mkPl(1, -1.6, NETZ + 5.5, false, 2), mkPl(1, 2.3, NETZ + 7.5, false, 3)] };
    const b = st.ball, P0 = st.pl[0], T = { rojos: tr('Rojos'), azules: tr('Azules') };
    let ended = false, hud = null, keys = {}, stick = { id: null, x: 0, y: 0 }, fbT = 0, crowdS = null, crowdB = null, cheerT = 0, rivals = [], wasMusic = S?.musicOn, cine = null;
    const names = { partner: partner?.name || PASAKA.canonigo.name, r: PASAKA.rivales };
    // --- la interfaz
    if (!document.getElementById('pk-style')) { const s = document.createElement('style'); s.id = 'pk-style'; s.textContent = CSS; document.head.appendChild(s); }
    const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    pelotaStyle();
    hud = document.createElement('div'); hud.className = 'pel-root pk-hud' + (touch ? ' touch' : '');
    hud.innerHTML = `<button type="button" class="pel-exit" aria-label="${esc(tr('Salir'))}">${X_ICON}</button>
      <div class="pel-top"><div class="pel-score">
        <div class="pel-side pel-red"><i class="pel-serve"></i><span>${esc(T.rojos)}</span><b class="pk-g">0</b></div>
        <div class="pel-mid pk-q">0 · 0</div>
        <div class="pel-side pel-blue"><b class="pk-g">0</b><span>${esc(T.azules)}</span><i class="pel-serve"></i></div>
      </div></div>
      <div class="pel-call"><h3></h3><p></p></div>
      <div class="pel-tip"></div>
      <div class="pel-stick"><div class="pel-knob"><i></i></div></div>${touch ? '<div class="pel-stickhint"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M24 6l6 7h-4v8h8v-4l7 7-7 7v-4h-8v8h4l-6 7-6-7h4v-8h-8v4l-7-7 7-7v4h8v-8h-4z" fill="#fff" opacity=".9"/></svg></div>' : ''}
      <div class="pel-btns"><div class="pel-bcol"><button type="button" class="pel-btn pel-drop pel-cut" data-k="globo" aria-label="${esc(tr('Globo'))}"><span>${esc(tr('Globo'))}</span></button><button type="button" class="pel-btn pel-drop pel-dejada" data-k="dejada" aria-label="${esc(tr('Dejada'))}"><span>${esc(tr('Dejada'))}</span></button></div><button type="button" class="pel-btn pel-hit" data-k="golpe" aria-label="${esc(tr('Golpe'))}"><span class="pel-hl">${esc(tr('Golpe'))}</span></button></div>
      <div class="pel-force"><b></b><i><u></u></i></div>`;
    document.body.appendChild(hud);
    fitCircles(hud.querySelector('.pel-btns')); const onFit = () => fitCircles(hud.querySelector('.pel-btns')); addEventListener('resize', onFit);
    const $ = s => hud.querySelector(s), fb = $('.pel-call'), tip = $('.pel-tip'), sbG = hud.querySelectorAll('.pk-g'), sbS = hud.querySelectorAll('.pel-serve'), sbQ = $('.pk-q'), btnG = $('.pel-hit'), force = $('.pel-force'); let lastHot = false, firstRally = true;
    const say = (why, sub = '', cls = '') => { fb.querySelector('h3').textContent = why; fb.querySelector('p').textContent = sub; fb.className = 'pel-call on' + (cls ? ' ' + cls : ''); hud.classList.add('calling'); if (st.over) hud.classList.add('final'); fbT = 1.6; };
    const score = () => { sbG[0].textContent = st.g[0]; sbG[1].textContent = st.g[1]; sbS.forEach((e, i) => e.classList.toggle('on', st.server === i && !st.over)); sbQ.textContent = `${QN[st.q[0]] ?? '40'} · ${QN[st.q[1]] ?? '40'}`; try { V.setScore?.(st.g[0], QN[st.q[0]] ?? '40', st.g[1], QN[st.q[1]] ?? '40', T.rojos.toUpperCase(), T.azules.toUpperCase()); } catch (e) { } };
    const setTip = (s) => { tip.textContent = s; tip.classList.toggle('on', !!s); };
    // --- las figuras: tú (tu rig), la pareja (el canónigo) y los rivales (dos vecinos de negro)
    const rig = rig0; P.rig = { update() { }, doAct() { }, doCheer() { }, doWave() { }, setExpr() { } };
    P.frozen = true; G.mode = 'pelota'; G.ui.hudVisible?.(false); G.ui.setPrompt?.(null); G.perro?.away?.(); G.rt?.boost?.(true);
    if (G.beacon) G.beacon.off = true; if (G.sky) { G.sky.flood = 1; G.sky.indoor = true; G.sky.floodCur = 1; }
    S?.setMusic?.(false);
    const figs = []; // { pl, obj, actor?, anim(dt) }
    const stY = { v: null }; if (rig?.char) armSwing(rig.char, () => stY.v, { windOnly: true }); rig?.setStance?.('Still');   // (de pie y quieto: la postura «Ready» flexionaba las rodillas sin parar)
    figs.push({ pl: P0, obj: P.obj, st: stY, flag: {}, me: true });
    const mkActor = (a, pl) => { if (!a) return; a.frozen = true; a.talking = 0; a.speed = 0; if (a.glb?.actions?.Still) a.glb.idleName = 'Still'; const s2 = { v: null }; if (a.glb) try { armSwing(a.glb, () => s2.v); } catch (e) { } figs.push({ pl, obj: a.obj, actor: a, st: s2, flag: {} }); };
    mkActor(partner, st.pl[1]);
    try {
      const look = (seed) => ({ shirt: '#15131a', pants: '#15131a', hair: seed % 2 ? '#3a2a20' : '#6b6b6b', old: !!(seed % 2), region: G.def?.comarca, seed });
      names.r.forEach((nm, i) => { const e = V.toWorld(st.pl[2 + i].x, st.pl[2 + i].z); const a = new Actor({ id: 'pasaka' + i, name: nm, x: e.x, z: e.z, heading: Math.PI, look: look(11 + i * 7) }, G.scene); a.pos.y = Y; a.sync?.(); rivals.push(a); G.walkers?.push(a); mkActor(a, st.pl[2 + i]); });
    } catch (e) { console.warn('pasaka rivales', e); }
    try { if (V.stand.length) { crowdS = crowd3d(V.stand, 'pelota', 1.36, { sit: false, all3d: true }); G.scene.add(crowdS); } if (V.sit.length) { crowdB = crowd3d(V.sit, 'pelota', 1.36, { sit: true, all3d: true }); G.scene.add(crowdB); } } catch (e) { console.warn('pasaka público', e); crowdS = crowdB = null; }
    // --- el saque y los quinces (entre quince y quince cada uno vuelve andando a su sitio y el que saca, tras su línea)
    const homeAll = () => { for (const p of st.pl) { p.take = false; p.want = null; p.tx = p.hx; p.tz = p.hz; } if (st.server === 0) P0.tz = Math.min(P0.z, NETZ - SAQUE - 1); else { st.pl[2].tx = -1.4; st.pl[2].tz = NETZ + SAQUE + 1.2; } };
    const setupServe = () => { st.phase = 'serve'; st.phaseT = 0; b.inPlay = false; b.dead = false; b.vx = b.vy = b.vz = 0; b.held = st.server; score(); setTip(st.server === 0 ? tr('Pulsa Golpe para sacar') + (touch ? '' : ' · ' + tr('espacio')) : tr('Sacan los azules')); };
    const nextPoint = () => { if (st.over) return; st.phase = 'dead'; st.phaseT = 0; homeAll(); };
    const cheer = (k) => { cheerT = k; crowdS?.cheer?.(true); crowdB?.cheer?.(true); };
    const point = (t, why) => {
      if (st.phase === 'dead' || st.over) return;
      if (st.log.length < 400) { const los = st.pl.filter(p => p.team !== t), d = Math.min(...los.map(p => Math.hypot(p.x - b.x, p.z - b.z))); st.log.push({ t, why, hits: st.hits, srv: st.server, last: b.last, dist: +d.toFixed(1), miss: los.some(p => p.take && p.miss), take: los.some(p => p.take) }); }
      st.q[t]++; st.faults = 0; S?.crowd?.(t === 0 ? 0.6 : 0.3); cheer(1.2);
      if (st.q[t] >= 4) {
        st.g[t]++; st.q = [0, 0]; st.server = 1 - st.server;
        if (st.g[t] >= st.games) { st.over = true; score(); say(tr(t === 0 ? '¡Partido para los rojos!' : 'Partido para los azules'), why, t === 0 ? 'ok' : 'bad'); fbT = 9; cheer(3); if (t === 0) { S?.fanfare?.(); rig?.doCheer?.(); } setTimeout(() => done({ win: t === 0 }), 2200); return; }
        say(tr(t === 0 ? '¡Juego para los rojos!' : 'Juego para los azules'), why, t === 0 ? 'ok' : 'bad'); cheer(2);
      } else say(why, `${QN[st.q[0]]} - ${QN[st.q[1]]}${st.q[0] === 3 && st.q[1] === 3 ? ' · ' + tr('iguales') : ''}`, t === 0 ? 'ok' : 'bad');
      score(); nextPoint();
    };
    const serveFault = () => { if (st.phase === 'dead' || st.over) return; st.faults++; if (st.faults >= 2) { st.faults = 0; return point(1 - st.server, tr('Falta de saque')); } say(tr('Falta de saque'), tr('Segundo saque'), 'bad'); nextPoint(); };
    // kind: saque, golpe (con potencia 0..1 y largo aimY -1..1), dejada o globo; aim: a lo ancho, -1..1 (en coordenadas de la cancha)
    const launch = (pl, kind, aim = 0, power = 0.5, aimY = 0, bad = false) => {
      const t = pl.team, dir = t === 0 ? 1 : -1;
      let q = bad ? 0.3 : 1; if (b.y < 0.25) q -= 0.35; else if (b.y > 1.9) q -= 0.25;
      q -= Math.max(0, Math.hypot(b.x - pl.x, b.z - pl.z) - 0.6) * 0.3; if (Math.hypot(b.vx, b.vy, b.vz) > 16) q -= 0.15;
      if (kind === 'golpe') q -= 0.12 * Math.max(0, power - 0.5) * 2; if (kind === 'saque') q = 0.95; q = clamp(q, 0.2, bad ? 0.3 : 1);
      let xt, zt, Tf, yt = 0;
      if (kind === 'saque') { xt = aim * (W / 2 - 1.4); zt = t === 0 ? L - 0.1 : 0.1; yt = t === 0 ? 1.4 + Math.random() * 0.5 : 0.6 + Math.random() * 0.5; Tf = 1.0; }
      else if (kind === 'dejada') { xt = aim * (W / 2 - 1.0); zt = NETZ + dir * (1.5 + Math.random() * 0.9); Tf = 0.72; }
      else if (kind === 'globo') { xt = aim * (W / 2 - 1.2); zt = t === 0 ? L - 2.5 - Math.random() * 2 : 2.5 + Math.random() * 2; Tf = 1.7; }
      else { xt = aim * (W / 2 - 0.9); const deep = t === 0 ? L - 1.6 + aimY * 1.4 - Math.random() * 1.2 : 2.8 - aimY * 1.4 + Math.random() * 1.2; zt = t === 0 ? clamp(deep, NETZ + 3, L - 0.4) : clamp(deep, 0.6, NETZ - 3); Tf = 1.12 - 0.34 * power + Math.random() * 0.06; }
      xt = clamp(xt + (1 - q) * (Math.random() - 0.5) * 3, -W / 2 + 0.3, W / 2 - 0.3);
      b.vx = (xt - b.x) / Tf; b.vz = (zt - b.z) / Tf; b.vy = (yt - b.y) / Tf + 0.5 * GRAV * Tf;
      const tn = (NETZ - b.z) / b.vz, yn = b.y + b.vy * tn - 0.5 * GRAV * tn * tn, need = NETH + 0.14;
      if (tn > 0 && yn < need) b.vy += (need - yn) / tn;
      b.vy -= (1 - q) * (kind === 'dejada' ? 1.4 : kind === 'globo' ? 0.8 : 1.1) * Math.random();
      b.last = t; b.crossed = false; b.bounces = 0; b.dead = false; b.serve = kind === 'saque'; st.hits = kind === 'saque' ? 0 : st.hits + 1; b.serveOk = false; b.serveB = 0; b.inPlay = true; b.held = -1; st.hitId++;
      pl.swingT = 0; pl.want = null; S?.pelota?.(kind === 'dejada' ? 0.5 : kind === 'globo' ? 0.6 : 0.6 + 0.5 * power);
      if (st.phase === 'serve') { st.phase = 'flight'; setTip(firstRally ? tr('Mantén Golpe para cargar; al soltar, la palanca apunta. Suelta cuando brille') : ''); }
      if (pl.me && kind !== 'saque') { firstRally = false; setTip(''); }
      assign();
    };
    const assign = () => {
      const pr = predict(b), rec = st.pl.filter(p => p.team !== b.last), cost = p => Math.abs(p.x - pr.x) + 0.35 * Math.abs(p.z - pr.z);
      rec.sort((a, c) => cost(a) - cost(c)); for (const p of rec) p.take = false;
      let taker = rec[0];
      if (taker.me && !st.auto) { const other = rec[1]; taker = other && cost(other) < cost(taker) + 1.0 ? other : null; }
      if (taker) { taker.take = true; taker.decided = -1; taker.tx = clamp(pr.x, -W / 2 + 0.4, W / 2 - 0.4); taker.tz = pr.z + (taker.team === 1 ? 0.9 : -0.9); }
      for (const p of rec) if (!p.take && !(p.me && !st.auto)) { p.tx = clamp(-pr.x * 0.4, -W / 2 + 0.6, W / 2 - 0.6); p.tz = p.hz; }
    };
    const aiShot = (pl, bad = false) => {
      const opp = st.pl.filter(p => p.team !== pl.team), far = opp.every(p => Math.abs(p.z - NETZ) > 6.5), near = opp.every(p => Math.abs(p.z - NETZ) < 4);
      const kind = far && Math.random() < 0.4 ? 'dejada' : near && Math.random() < 0.35 ? 'globo' : 'golpe';
      let best = 0, bd = -1; for (const a of [-0.85, -0.3, 0.3, 0.85]) { const d = Math.min(...opp.map(p => Math.abs(p.x - a * (W / 2 - 0.9)))) + Math.random() * 0.8; if (d > bd) { bd = d; best = a; } }
      launch(pl, kind, best, 0.35 + Math.random() * 0.5, Math.random() * 2 - 1, bad);
    };
    const onFloor = () => {
      if (b.dead || !b.inPlay) return; S?.pelota?.(0.2);
      if (!b.crossed) { if (side(b.z) === b.last) { b.dead = true; return b.serve ? serveFault() : point(1 - b.last, tr('No pasó la red')); } return; }
      if (b.serve && !b.serveOk) { b.serveB++; if (b.serveB >= 2) { b.dead = true; return serveFault(); } }
      b.bounces++; if (b.bounces >= 2) { b.dead = true; point(b.last, tr('Dos botes')); }
    };
    const stepBall = (dt) => {
      if (!b.inPlay) return;
      const pz = b.z, k = 1 - 0.035 * dt;
      b.vy -= GRAV * dt; b.vx *= k; b.vz *= k; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if ((pz - NETZ) * (b.z - NETZ) < 0) {
        if (b.y < NETH + R && !b.dead) { b.z = pz < NETZ ? NETZ - 0.06 : NETZ + 0.06; b.vz = -b.vz * 0.12; b.vx *= 0.4; b.vy = Math.min(b.vy, 0.4) * 0.3; b.dead = true; S?.noiseBurst?.(0.12, 900, 0.8, 0.25, S.sfx); b.serve ? serveFault() : point(1 - b.last, tr('¡Red!')); }
        else b.crossed = true;
      }
      if (b.y < R) { b.y = R; if (b.vy < 0) { b.vy = -b.vy * 0.58; b.vx *= 0.82; b.vz *= 0.82; onFloor(); if (Math.abs(b.vy) < 0.4) b.vy = 0; } }
      if (b.x < -W / 2 + R) { b.x = -W / 2 + R; b.vx = Math.abs(b.vx) * 0.7; } else if (b.x > W / 2 - R) { b.x = W / 2 - R; b.vx = -Math.abs(b.vx) * 0.7; }
      if (b.z > L - R) { b.z = L - R; b.vz = -Math.abs(b.vz) * 0.72; if (b.serve && b.crossed && b.y > CHAPA) b.serveOk = true; S?.pelota?.(0.35); }
      else if (b.z < R) {
        if (b.y < VALLA) { b.z = R; b.vz = Math.abs(b.vz) * 0.72; if (b.serve && b.crossed && b.y > 0.3) b.serveOk = true; S?.pelota?.(0.35); }
        else if (!b.dead) { b.dead = true; point(1 - b.last, tr('Por encima de la valla')); }   // (se va por detrás: quince para los otros)
      }
      if (b.y > CEIL - R) { b.y = CEIL - R; b.vy = -Math.abs(b.vy) * 0.5; }
      if (b.dead && b.y <= R + 0.001 && Math.hypot(b.vx, b.vz) < 0.3) b.inPlay = false;
      if (b.z < -8) b.inPlay = false;
    };
    const movePl = (pl, dt) => {
      const x0 = pl.x, z0 = pl.z;
      if (pl.me && !st.auto) {
        // tú: la palanca o las teclas mandan siempre, también mientras cargas el golpe (al soltar, esa misma palanca
        // apunta); si no tocas nada, el destino que fijó un toque (ir). Antes, al cargar, el avatar corría solo hacia donde
        // iba a botar la pelota y se perdía el control
        const kx = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x) * SX, kz = (keys.up ? 1 : 0) - (keys.down ? 1 : 0) + stick.y, n = Math.hypot(kx, kz);
        if (n > 0.08) { const m = Math.min(1, n); pl.x += kx / n * m * pl.speed * dt; pl.z += kz / n * m * pl.speed * dt; pl.tx = pl.x; pl.tz = pl.z; }
        else { const dx = pl.tx - pl.x, dz = pl.tz - pl.z, d = Math.hypot(dx, dz); if (d > 0.05) { const k = Math.min(1, pl.speed * dt / d); pl.x += dx * k; pl.z += dz * k; } }
      } else { const dx = pl.tx - pl.x, dz = pl.tz - pl.z, d = Math.hypot(dx, dz); if (d > 0.05) { const k = Math.min(1, pl.speed * dt / d); pl.x += dx * k; pl.z += dz * k; } }
      const srv = st.phase === 'serve' && b.held === pl.team && (pl.me ? st.server === 0 : pl === st.pl[2]);
      if (pl.team === 0) pl.z = clamp(pl.z, 0.8, srv ? NETZ - SAQUE - 0.2 : NETZ - 0.7); else pl.z = clamp(pl.z, srv ? NETZ + SAQUE + 0.2 : NETZ + 0.7, L - 0.8);
      pl.x = clamp(pl.x, -W / 2 + 0.35, W / 2 - 0.35);
      const v = dt > 0 ? Math.hypot(pl.x - x0, pl.z - z0) / dt : 0; pl.vNow += (v - pl.vNow) * Math.min(1, dt * 12); pl.moving = v > 0.2;
      pl.back = pl.moving && ((pl.team === 0 && pl.z < z0) || (pl.team === 1 && pl.z > z0));
      if (pl.swingT >= 0) pl.swingT += dt; if (pl.swingT > 0.5) pl.swingT = -1;
      // el brazo se echa atrás cuando la pelota viene hacia él
      const coming = b.inPlay && !b.dead && b.last !== pl.team && Math.hypot(b.x - pl.x, b.z - pl.z) < 3.2;
      pl.wind += ((coming ? 1 : 0) - pl.wind) * Math.min(1, dt * 6);
    };
    const think = (pl, dt) => {
      if (st.phase === 'serve') {
        if (!pl.me && pl === st.pl[2] && st.server === 1 && st.phaseT > 1.3) { b.x = pl.x + 0.3; b.y = 1.05; b.z = pl.z - 0.3; launch(pl, 'saque', (Math.random() - 0.5) * 1.2); }
        if (pl.me && st.auto && st.server === 0 && st.phaseT > 0.8) { b.x = pl.x + 0.3; b.y = 1.05; b.z = pl.z + 0.3; launch(pl, 'saque', (Math.random() - 0.5) * 1.2); }
        return;
      }
      if (st.phase !== 'flight' || !b.inPlay || b.dead || b.last === pl.team) return;
      if (pl.me && !st.auto) return;
      if (!pl.take) { const tk = st.pl.find(p => p.team === pl.team && p.take); if (!(inReach(pl, b) && (!tk || Math.hypot(tk.x - b.x, tk.z - b.z) > 2.2))) return; }
      if (side(b.z) === pl.team && b.y < 2.5) { pl.tx = clamp(b.x, -W / 2 + 0.4, W / 2 - 0.4); if (Math.abs(b.z - pl.z) > 1.0) pl.tz = clamp(b.z + (pl.team === 1 ? 0.6 : -0.6), pl.team ? NETZ + 0.7 : 0.8, pl.team ? L - 0.8 : NETZ - 0.7); }
      if (!inReach(pl, b) || b.y < 0.2 || b.y > 2.0) return;
      if (pl.decided !== st.hitId) { pl.decided = st.hitId; const run = Math.hypot(pl.tx - pl.hx, pl.tz - pl.hz), fast = Math.hypot(b.vx, b.vz) > 15;
        const p = clamp(0.95 - 0.03 * Math.max(0, run - 1.5) - (fast ? 0.08 : 0) - (fast && run > 2.5 ? 0.1 : 0) + (pl.me ? 0.03 : 0) - (pl.team === 1 ? 0.02 : 0), 0.4, 0.97);
        pl.miss = Math.random() > p; pl.bad = pl.miss && Math.random() < 0.65; }
      // el que falla, la mitad de las veces le pega mal (a la red o fuera) y la otra mitad no llega
      if (!pl.miss) aiShot(pl); else if (pl.bad) { pl.bad = false; aiShot(pl, true); }
    };
    const aimOf = () => { const kx = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x) * SX; if (Math.abs(kx) > 0.25) return clamp(kx, -1, 1) * 0.85; return clamp((b.x - P0.x) / 1.2, -1, 1) * 0.5; };
    // un toque: golpe medio, dejada o globo; mantener Golpe carga la potencia (0,9 s a tope) y la palanca apunta a lo ancho y a lo largo
    const press = (kind, power = 0.5, aimX = null, aimY = 0) => { if (ended || st.over) return; if (st.phase === 'serve' && st.server === 0 && b.held === 0) { launch(P0, 'saque', aimX != null ? aimX * 0.85 : aimOf(), power); return; } P0.want = { kind, power, aimX, aimY }; P0.wantT = 0.55; };
    const chargeStart = () => { if (ended || st.over || st.charge) return; st.charge = { t: 0 }; btnG?.classList.add('charging'); btnG?.style.setProperty('--cp', '0%'); force?.classList.add('on'); firstRally = false; setTip(''); };
    const chargeEnd = () => { if (!st.charge) return; const c = st.charge; st.charge = null; btnG?.classList.remove('charging', 'full'); force?.classList.remove('on');
      const ax = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x) * SX, ay = (keys.up ? 1 : 0) - (keys.down ? 1 : 0) + stick.y;
      press('golpe', clamp(c.t / 0.9, 0.2, 1), Math.abs(ax) > 0.25 ? clamp(ax, -1, 1) : null, Math.abs(ay) > 0.25 ? clamp(ay, -1, 1) : 0); };
    const update = (dt) => {
      st.t += dt; st.phaseT += dt;
      if (st.phase === 'intro') { if (st.phaseT > 1.6) setupServe(); }
      else if (st.phase === 'dead') { if (st.phaseT > 1.6) setupServe(); }
      for (const p of st.pl) { think(p, dt); movePl(p, dt); }
      for (const a of st.pl) for (const c of st.pl) if (a !== c && a.team === c.team) { const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 1e-3) { c.x += dx / d * (0.8 - d) * 0.5; c.z += dz / d * (0.8 - d) * 0.5; } }
      if (st.phase === 'serve' && b.held >= 0) { const srv = b.held === 0 ? P0 : st.pl[2]; b.x = srv.x + 0.3; b.y = 1.05; b.z = srv.z + (b.held === 0 ? 0.3 : -0.3); }
      if (st.charge) { st.charge.t += dt; const pw = Math.min(1, st.charge.t / 0.9), p2 = 0.2 + pw * 0.8; btnG?.style.setProperty('--cp', Math.round(pw * 100) + '%'); btnG?.classList.toggle('full', pw >= 1);
        if (force) { const word = p2 < 0.4 ? tr('suave') : p2 < 0.75 ? tr('media') : p2 < 0.97 ? tr('fuerte') : tr('a tope'); force.firstChild.textContent = `${tr('Golpe')}: ${word} · ${Math.round(p2 * 100)} %`; force.querySelector('u').style.width = Math.round(p2 * 100) + '%'; force.style.setProperty('--fc', `hsl(${Math.round(120 - p2 * 120)} 85% 55%)`); } }
      if (P0.want && !st.auto) { P0.wantT -= dt; if (st.phase === 'flight' && b.inPlay && !b.dead && b.last !== 0 && inReach(P0, b)) { const w = P0.want; launch(P0, w.kind, w.aimX != null ? w.aimX * 0.85 : aimOf(), w.power, w.aimY); } else if (P0.wantT <= 0) { P0.want = null; P0.swingT = 0; } }
      for (let i = 0, n = Math.ceil(dt / (1 / 120)); i < n; i++) stepBall(dt / n);
      if (st.phase === 'flight' && !b.inPlay) nextPoint();
      if (fbT > 0 && (fbT -= dt) <= 0) { fb.classList.remove('on'); hud.classList.remove('calling'); }
      if (cheerT > 0 && (cheerT -= dt) <= 0) { crowdS?.cheer?.(false); crowdB?.cheer?.(false); }
    };
    // --- de la lógica a la escena: figuras, pelota y cámara
    const flag = (f, k, on, fn) => { if (on && !f[k]) { f[k] = true; fn(); } else if (!on) f[k] = false; };
    const place = (dt) => {
      for (const f of figs) {
        const pl = f.pl, w = V.toWorld(pl.x, pl.z), face = pl.team === 0 ? 0 : Math.PI;
        const s2 = { speed: pl.vNow, back: pl.back, wind: pl.wind, swing: pl.swingT >= 0 && pl.swingT < 0.4 ? pl.swingT / 0.4 : -1, won: st.over && st.g[pl.team] >= st.games };
        f.st.v = s2;
        if (f.me) { P.obj.position.copy(w); P.obj.rotation.y = face; P.pos.copy(w); P.heading = face; if (rig?.char) rig.char.back = pl.back; rig?.update?.(dt, pl.vNow, true, 0); flag(f.flag, 'swing', pl.swingT >= 0, () => rig?.doAct?.('hit', 0.5)); }
        else if (f.actor) { const a = f.actor; a.pos.copy(w); a.heading = face; a.speed = pl.vNow; a.frozen = true; a.talking = 0; if (a.glb) a.glb.back = pl.back; a.obj.position.copy(w); a.obj.rotation.y = face; flag(f.flag, 'swing', pl.swingT >= 0, () => a.anim?.doAct?.('throw', 0.35)); if (s2.won) a.cheer = 0.6; }
      }
      const show = b.inPlay || b.held >= 0; V.ball.visible = V.shadow.visible = show;
      if (show) { V.ball.position.set(b.x, b.y, b.z); V.shadow.position.set(b.x, 0.012, b.z); const k = 1 / (1 + b.y * 0.5); V.shadow.scale.setScalar(k); V.shadow.material.opacity = 0.32 * k; }
      // el círculo del bote cuando la pelota viene hacia nosotros, y el botón que brilla cuando está al alcance
      const coming = st.phase === 'flight' && b.inPlay && !b.dead && b.last === 1;
      if (coming) { const pr = predict(b); if (pr.z < NETZ) { V.ring.visible = true; V.ring.position.set(pr.x, 0.016, pr.z); const k = 1 + 0.08 * Math.sin(st.t * 9); V.ring.scale.set(k, k, 1); } else V.ring.visible = false; } else V.ring.visible = false;
      const hot = coming && inReach(P0, b); if (hot !== lastHot) { lastHot = hot; btnG?.classList.toggle('ready', hot); }
      // la cámara: detrás de la valla, a la altura de una galería, mirando al frontis (se mueve un poco contigo)
      const cx = clamp(P0.x * 0.35 + (b.inPlay ? b.x * 0.15 : 0), -2.2, 2.2), cp = V.toWorld(cx, -3.4 + clamp((P0.z - 6.75) * 0.3, -1.0, 1.6), 4.7), cl = V.toWorld(clamp(b.inPlay ? b.x * 0.4 : 0, -1.5, 1.5), NETZ + 1.0, 0.8);
      if (!cine) { cine = G.follow.cinematic = { pos: cp.clone(), look: cl.clone(), t: 0, lookCur: cl.clone() }; cam.position.copy(cp); cam.lookAt(cl); }
      else { if (G.follow.cinematic !== cine) G.follow.cinematic = cine; cine.pos.copy(cp); cine.look.copy(cl); }
      try { crowdS?.tick?.(st.t, cheerT > 0 ? 1 : 0.15, 0, cam); crowdB?.tick?.(st.t, cheerT > 0 ? 1 : 0.15, 0, cam); } catch (e) { }
    };
    // --- mandos: palanca, teclas y botones
    const KEYMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    const onKey = (e) => { const k = e.key.toLowerCase(), down = e.type === 'keydown'; if (KEYMAP[k]) { keys[KEYMAP[k]] = down; e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (!down) return; if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); return done({ quit: true }); }
      if (k === 'shift' || k === 'k' || k === '2') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) press('dejada'); } else if (k === 'l' || k === '3') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) press('globo'); } };
    const onSpace = (e) => { const k = e.key.toLowerCase(); if (!(k === ' ' || k === 'j' || k === 'enter' || k === '1')) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'keydown') { if (!e.repeat) chargeStart(); } else chargeEnd(); };
    addEventListener('keydown', onSpace, true); addEventListener('keyup', onSpace, true);
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
    const zone = $('.pel-stick'), knob = $('.pel-knob'), RK = 56;
    const resetStick = () => { stick = { id: null, x: 0, y: 0 }; knob.style.display = 'none'; };
    zone.addEventListener('pointerdown', (e) => { if (stick.id !== null) return; e.preventDefault(); const zr = zone.getBoundingClientRect(); stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; knob.style.display = 'block'; knob.style.left = (e.clientX - zr.left) + 'px'; knob.style.top = (e.clientY - zr.top) + 'px'; knob.firstElementChild.style.transform = ''; $('.pel-stickhint')?.remove(); });
    const onPtrMove = (e) => { if (e.pointerId !== stick.id) return; let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy); if (d > RK) { dx *= RK / d; dy *= RK / d; } stick.x = dx / RK; stick.y = -dy / RK; knob.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; };
    const endStick = (e) => { if (e.pointerId === stick.id) resetStick(); };
    addEventListener('pointermove', onPtrMove, true); addEventListener('pointerup', endStick, true); addEventListener('pointercancel', endStick, true);
    // (si el dedo sale de la pantalla sin «pointerup», la palanca se suelta igual)
    const onTouchEnd = () => { if (stick.id !== null && !(navigator.maxTouchPoints > 0 && document.querySelector(':active') === zone)) resetStick(); };
    addEventListener('touchend', onTouchEnd, true); addEventListener('touchcancel', onTouchEnd, true);
    const onBlur = () => { keys = {}; resetStick(); if (st.charge) { st.charge = null; btnG?.classList.remove('charging', 'full'); force?.classList.remove('on'); } }; addEventListener('blur', onBlur);
    hud.querySelectorAll('.pel-btn').forEach(bt => { const k = bt.dataset.k;
      bt.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); bt.classList.add('down'); setTimeout(() => bt.classList.remove('down'), 140); if (k === 'golpe') chargeStart(); else press(k); });
      if (k === 'golpe') { const up = (e) => { e.preventDefault?.(); chargeEnd(); }; bt.addEventListener('pointerup', up); bt.addEventListener('pointercancel', up); bt.addEventListener('pointerleave', up); } });
    $('.pel-exit').onclick = () => done({ quit: true });
    // --- el bucle (lo llama el pueblo en modo pelota) y el final
    G.pelotaMatch = { pasaka: true }; G.pelotaRig = rig; G.pelotaAbort = () => done({ quit: true, error: true });
    G.pelotaTick = (dt) => { update(dt); place(dt); };
    function done(r) {
      if (ended) return; ended = true;
      G.pelotaTick = null; G.pelotaMatch = null; G.pelotaRig = null; G.pelotaAbort = null; delete window.__pasaka;
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('keydown', onSpace, true); removeEventListener('keyup', onSpace, true); removeEventListener('blur', onBlur); removeEventListener('pointermove', onPtrMove, true); removeEventListener('pointerup', endStick, true); removeEventListener('pointercancel', endStick, true); removeEventListener('touchend', onTouchEnd, true); removeEventListener('touchcancel', onTouchEnd, true);
      const safe = (f) => { try { f(); } catch (e) { console.warn('pasaka', e); } };
      safe(() => hud.remove()); removeEventListener('resize', onFit);
      safe(() => { if (rig?.char) rig.char.post = null; rig?.setStance?.(null); });
      safe(() => { for (const a of rivals) { if (a.glb) a.glb.post = null; const i = G.walkers?.indexOf(a); if (i >= 0) G.walkers.splice(i, 1); a.obj.parent?.remove(a.obj); } });
      safe(() => { if (partner) { if (partner.glb) { partner.glb.post = null; partner.glb.idleName = null; } partner.frozen = false; partner.speed = 0; if (pHome) partner.setPos(pHome.x, pHome.z, pHome.h); } });
      safe(() => { for (const c of [crowdS, crowdB]) if (c) { c.parent?.remove(c); c.dispose?.(); } });
      safe(() => { V.ball.visible = V.shadow.visible = V.ring.visible = false; });
      safe(() => { if (G.beacon) G.beacon.off = false; if (G.sky && !stay) { G.sky.flood = 0; G.sky.indoor = false; } G.rt?.boost?.(false); S?.setMusic?.(wasMusic); });
      P.rig = rig0; P.frozen = !!stay; G.mode = 'play';
      if (!stay) { safe(() => G.ui.hudVisible?.(true)); safe(() => G.perro?.release?.()); safe(() => { P.place(home.x, home.z, home.h); G.follow.cinematic = null; G.follow.snap(P); }); }
      else safe(() => { P.place(V.entry.x, V.entry.z, 0); G.follow.cinematic = null; G.follow.snap(P); });
      res(r.quit ? { quit: true, g: st.g.slice() } : { win: !!r.win, g: st.g.slice() });
    }
    // (para las pruebas: el estado, golpear, ir a un punto, jugar solo y adelantar el partido sin dibujar)
    window.__pasaka = { estado: () => ({ phase: st.phase, g: st.g.slice(), q: st.q.slice(), server: st.server, log: st.log, ball: { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), inPlay: b.inPlay, last: b.last }, you: { x: +P0.x.toFixed(2), z: +P0.z.toFixed(2) }, over: st.over }),
      golpear: press, cargar: chargeStart, soltar: chargeEnd, ir: (x, z) => { P0.tx = x; P0.tz = z; }, auto: (on) => { st.auto = !!on; }, simular: (sec) => { for (let i = 0; i < sec * 60 && !ended; i++) update(1 / 60); if (!ended) place(1 / 60); }, fin: () => ended };
    // (los jugadores, cada uno en su sitio desde el primer fotograma; el jugador llega andando desde la entrada)
    homeAll(); score(); say(tr('¡Prepárate!'), partner ? (eu ? `${partner.name}ekin` : `Con ${partner.name}`) : tr('Sobreclaustro de la catedral')); place(0);
  });
}
