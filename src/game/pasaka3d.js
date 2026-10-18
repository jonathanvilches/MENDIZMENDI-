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
import { crowd3d } from '../actors/crowd3d.js';
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
/** El sobreclaustro en `out` (coordenadas del mundo), a 2400 m: { group, toWorld, entry, ball, dispose }. */
export function pasakaVenue(scene, out) {
  if (VENUE && VENUE.group.parent === scene) return VENUE;
  if (VENUE) VENUE.dispose();
  const g = new THREE.Group(); g.position.set(out.x, Y, out.z); scene.add(g);
  const geos = [], mats = [], add = (geo, m, x, y, z, ry = 0, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = shadow; o.receiveShadow = true; g.add(o); geos.push(geo); return o; };
  const stone = mat(TEX.ashlar, '#d9c9a6'), stoneD = mat(TEX.ashlar, '#bfae8c'), floor = mat(TEX.cobble, '#c9a28c'), wood = mat(TEX.wood, '#a8784e'), plank = mat(TEX.woodDark, '#8a6244'), valla = mat(TEX.wood, '#8a6238');
  const white = new THREE.MeshStandardMaterial({ color: '#f4efe2', roughness: 0.8 }), chapa = new THREE.MeshStandardMaterial({ color: '#7a3b32', roughness: 0.5, metalness: 0.35 });
  const grass = mat(TEX.grass, '#8fae5e'), dark = new THREE.MeshStandardMaterial({ color: '#4a3b2e', roughness: 1 });
  mats.push(stone, stoneD, floor, wood, plank, valla, white, chapa, grass, dark);
  const Z0 = -9;   // (el pasillo sigue detrás de la cámara)
  // suelo y líneas
  add(box(W + 1.2, 0.3, L - Z0 + 1.2, 2.2), floor, 0, -0.15, (L + Z0) / 2, 0, false);
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15, 0]) add(box(0.08, 0.012, L, 1), white, x, 0.006, L / 2, 0, false);
  for (const z of [NETZ - SAQUE, NETZ, NETZ + SAQUE]) add(box(W, 0.012, 0.08, 1), white, 0, 0.006, z, 0, false);
  // pared izquierda con su banco y ventanas altas; la de la derecha, parapeto, columnas y arcos sobre el jardín
  add(box(0.6, CEIL + 0.6, L - Z0 + 1.2, 2.2), stone, -W / 2 - 0.3, (CEIL + 0.6) / 2, (L + Z0) / 2);
  add(box(0.45, 0.5, L - Z0, 1.5), stoneD, -W / 2 + 0.225, 0.25, (L + Z0) / 2);
  const win = new THREE.BoxGeometry(0.12, 1.3, 0.7), wins = new THREE.InstancedMesh(win, dark, 6), M4 = new THREE.Matrix4(); geos.push(win);
  for (let i = 0; i < 6; i++) { M4.makeTranslation(-W / 2 + 0.02, 3.3, 3 + i * 4.6); wins.setMatrixAt(i, M4); } g.add(wins);
  add(box(0.5, 1.0, L - Z0 + 1.2, 1.5), stone, W / 2 + 0.25, 0.5, (L + Z0) / 2);
  const colG = new THREE.BoxGeometry(0.5, 3.0, 0.5), cols = []; geos.push(colG);
  for (let z = Z0 + 0.5; z < L; z += 3.6) cols.push(z);
  const colM = new THREE.InstancedMesh(colG, stone, cols.length), capG = new THREE.BoxGeometry(0.72, 0.28, 0.72), capM = new THREE.InstancedMesh(capG, stoneD, cols.length); geos.push(capG);
  cols.forEach((z, i) => { M4.makeTranslation(W / 2 + 0.25, 2.5, z); colM.setMatrixAt(i, M4); M4.makeTranslation(W / 2 + 0.25, 4.14, z); capM.setMatrixAt(i, M4); });
  colM.castShadow = capM.castShadow = true; g.add(colM, capM);
  // (los arcos: una banda de pared con huecos semicirculares, hecha con una forma extruida por tramo)
  const span = 3.6, rA = span / 2 - 0.25, hA = CEIL + 0.6 - 4.28, arcShape = new THREE.Shape();
  arcShape.moveTo(-span / 2, 0); arcShape.lineTo(-rA, 0); arcShape.absarc(0, 0, rA, Math.PI, 0, true); arcShape.lineTo(span / 2, 0); arcShape.lineTo(span / 2, hA); arcShape.lineTo(-span / 2, hA); arcShape.closePath();
  const arcG = new THREE.ExtrudeGeometry(arcShape, { depth: 0.5, bevelEnabled: false, curveSegments: 10 }); arcG.rotateY(Math.PI / 2); geos.push(arcG);
  const arcM = new THREE.InstancedMesh(arcG, stone, cols.length);
  cols.forEach((z, i) => { M4.makeTranslation(W / 2, 4.28, z + span / 2); arcM.setMatrixAt(i, M4); }); arcM.castShadow = true; g.add(arcM);
  // techo de vigas y tablas
  add(box(W + 1.4, 0.16, L - Z0 + 1.2, 1.5), plank, 0, CEIL + 0.08, (L + Z0) / 2, 0, false);
  const beamG = new THREE.BoxGeometry(W + 1.2, 0.26, 0.22), nB = Math.floor((L - Z0) / 0.65), beams = new THREE.InstancedMesh(beamG, wood, nB); geos.push(beamG);
  for (let i = 0; i < nB; i++) { M4.makeTranslation(0, CEIL - 0.13, Z0 + 0.3 + i * 0.65); beams.setMatrixAt(i, M4); } beams.castShadow = true; g.add(beams);
  for (const x of [-W / 4, W / 4]) add(box(0.3, 0.3, L - Z0, 1.5), wood, x, CEIL - 0.3, (L + Z0) / 2);
  // el frontis con la chapa, y la valla de madera a nuestra espalda (detrás, el pasillo sigue y acaba en pared)
  add(box(W + 1.2, CEIL + 0.6, 0.6, 2.2), stone, 0, (CEIL + 0.6) / 2, L + 0.3);
  add(box(W, CHAPA, 0.06, 1), chapa, 0, CHAPA / 2, L - 0.03); add(box(W, 0.04, 0.07, 1), white, 0, CHAPA + 0.02, L - 0.03);
  add(box(W + 1.2, CEIL + 0.6, 0.6, 2.2), stone, 0, (CEIL + 0.6) / 2, Z0 - 0.3);
  add(box(W, 0.1, 0.12, 1), valla, 0, VALLA - 0.05, 0); add(box(W, 0.08, 0.1, 1), valla, 0, 0.5, 0);
  const slatG = new THREE.BoxGeometry(0.07, VALLA - 0.1, 0.05), nS = Math.floor(W / 0.22), slats = new THREE.InstancedMesh(slatG, valla, nS); geos.push(slatG);
  for (let i = 0; i < nS; i++) { M4.makeTranslation(-W / 2 + 0.11 + i * 0.22, (VALLA - 0.1) / 2, 0); slats.setMatrixAt(i, M4); } g.add(slats);
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) add(box(0.12, VALLA, 0.12, 1), valla, x, VALLA / 2, 0);
  // la red
  const netT = netTexture(), netM = new THREE.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }); mats.push(netM);
  const netG = new THREE.PlaneGeometry(W, NETH); add(netG, netM, 0, NETH / 2, NETZ, 0, false).castShadow = false;
  add(box(W + 0.2, 0.07, 0.04, 1), white, 0, NETH, NETZ);
  const postG = new THREE.CylinderGeometry(0.05, 0.06, NETH + 0.25, 10); geos.push(postG);
  for (const x of [-W / 2 - 0.08, W / 2 + 0.08]) add(postG, wood, x, (NETH + 0.25) / 2, NETZ);
  // fuera: el jardín del claustro y, enfrente, la otra panda con sus arcos y su tejado
  add(box(26, 0.2, L - Z0 + 1.2, 6), grass, W / 2 + 13.5, -0.12, (L + Z0) / 2, 0, false);
  add(new THREE.CylinderGeometry(1.1, 1.3, 0.5, 12), stoneD, W / 2 + 13.5, 0.25, NETZ); add(box(0.35, 3, 0.35, 1), stoneD, W / 2 + 13.5, 1.9, NETZ);
  add(box(0.6, CEIL + 0.6, L - Z0 + 1.2, 2.2), stone, W / 2 + 26.5, (CEIL + 0.6) / 2, (L + Z0) / 2);
  const far = new THREE.InstancedMesh(arcG, stone, cols.length); cols.forEach((z, i) => { M4.makeTranslation(W / 2 + 26.1, 4.28, z + span / 2); far.setMatrixAt(i, M4); }); g.add(far);
  const farCol = new THREE.InstancedMesh(colG, stone, cols.length); cols.forEach((z, i) => { M4.makeTranslation(W / 2 + 26.3, 2.5, z); farCol.setMatrixAt(i, M4); }); g.add(farCol);
  add(box(0.5, 1.0, L - Z0 + 1.2, 1.5), stone, W / 2 + 26.3, 0.5, (L + Z0) / 2);
  const roofM = mat(TEX.roofTile, '#b5684a'); mats.push(roofM); add(box(6, 0.25, L - Z0 + 2, 2), roofM, W / 2 + 24, CEIL + 2.0, (L + Z0) / 2).rotation.z = 0.32;
  add(box(6, 0.25, L - Z0 + 2, 2), roofM, W / 2 + 3, CEIL + 2.0, (L + Z0) / 2).rotation.z = -0.32;
  // la pelota y su sombra
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: '#f6ecd6', roughness: 0.55, emissive: '#5a4a30', emissiveIntensity: 0.35 })); ball.castShadow = true; g.add(ball); geos.push(ball.geometry); mats.push(ball.material);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.32, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; g.add(shadow); geos.push(shadow.geometry); mats.push(shadow.material);
  // (el círculo del bote: dónde va a caer la pelota en nuestro campo, para correr a tiempo)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.016; ring.visible = false; g.add(ring); geos.push(ring.geometry); mats.push(ring.material);
  g.traverse(o => { if (o.isInstancedMesh) o.instanceMatrix.needsUpdate = true; });
  g.updateMatrixWorld(true);
  const toWorld = (lx, lz, ly = 0) => { const v = new THREE.Vector3(lx, ly, lz); g.localToWorld(v); return v; };
  addPlatform(out.x, out.z, 0, -W / 2, W / 2 + 0.2, Z0, L, Y);   // el pasillo es suelo (los personajes se quedan a su altura)
  // el público: de pie en los huecos de la arquería y sentado en el banco (en coordenadas del mundo)
  const stand = [], sit = [];
  cols.forEach((z, i) => { if (z + 1 > 2 && z + span - 1 < L) for (const k of [0.95, 2.4]) if (Math.random() < 0.85) { const v = toWorld(W / 2 + 0.95, z + k + (Math.random() - 0.5) * 0.4); stand.push([v.x, v.y, v.z, -Math.PI / 2]); } });
  // (sentados en el banco: la figura algo adelantada y más baja que el asiento, como en la grada del frontón cubierto)
  for (let z = 3; z < L - 2; z += 2.4) if (Math.random() < 0.7) { const v = toWorld(-W / 2 + 0.6, z + Math.random() * 0.6, 0.1); sit.push([v.x, v.y, v.z, Math.PI / 2]); }
  const e = toWorld(1.4, NETZ - 7.5);
  VENUE = { group: g, toWorld, entry: { x: e.x, z: e.z }, ball, shadow, ring, stand, sit,
    dispose() { g.parent?.remove(g); for (const x of geos) x.dispose(); for (const m of mats) { m.map?.dispose?.(); m.dispose(); } netT.dispose(); if (VENUE === this) VENUE = null; } };
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
const mkPl = (team, x, z, me, i) => ({ team, x, z, tx: x, tz: z, hx: x, hz: z, me, speed: me ? 5.8 : 4.8 + i * 0.25, reach: me ? 1.9 : 1.35, moving: false, vNow: 0, want: 0, wantT: 0, take: false, miss: false, decided: -1, swingT: -1, wind: 0, heading: team ? Math.PI : 0 });

const CSS = `
.pk-hud{position:fixed;inset:0;z-index:22;pointer-events:none;font-family:'Nunito',sans-serif;color:#fff;--thumb:16px}
.pk-hud .pk-sb{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);margin:0;background:rgba(14,6,30,.72);border-color:rgba(255,255,255,.22)}
.pk-hud .pk-fb{top:28%;left:0;right:0}
.pk-hud .pk-tip{position:absolute;left:50%;bottom:auto;top:calc(env(safe-area-inset-top,0px) + 66px);transform:translateX(-50%);padding:4px 12px;border-radius:999px;background:rgba(14,6,30,.6);font:800 var(--fs-sm)/1.2 inherit;white-space:nowrap}
.pk-hud .pk-x{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 10px);width:40px;height:40px;border-radius:50%;background:rgba(14,6,30,.7);border:1px solid rgba(255,255,255,.35);color:#fff;font-size:17px;display:grid;place-items:center;pointer-events:auto}
.pk-hud .pk-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:flex;gap:10px;pointer-events:auto}
.pk-hud .pk-btn{width:118px;height:62px}
.pk-stick{position:absolute;left:0;bottom:0;width:46vw;height:62dvh;pointer-events:auto;touch-action:none}
.pk-knob{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(28,11,58,.3);display:none}
.pk-knob i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.85)}
.pk-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--thumb));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb));width:120px;height:120px;border-radius:50%;border:3px dashed rgba(255,255,255,.5);display:grid;place-items:center;pointer-events:none}
.pk-hud.touch .pk-btn small{display:none}
.pk-hud .pk-btn.hot{box-shadow:0 0 0 4px rgba(255,209,102,.95),0 0 26px rgba(255,209,102,.85);border-color:#ffd166}
@media (max-height:470px){.pk-hud .pk-btn{width:104px;height:52px}.pk-hud .pk-tip{top:calc(env(safe-area-inset-top,0px) + 58px)}}`;

/**
 * Partido de pasaka en el sobreclaustro. G: el juego del pueblo (player, camera, follow, ui, sound, sky, walkers, rt);
 * V: el recinto (pasakaVenue); partner: el Actor que juega de pareja (el canónigo). Devuelve { win, g } o { quit }.
 * stay: al acabar no se vuelve al sitio (el menú de Campeonatos sigue en el claustro).
 */
export function playPasaka(G, V, partner, { games = 3, stay = false, home: home0 = null } = {}) {
  if (window.__autoWin) return Promise.resolve({ win: true, g: [games, 0] });
  return new Promise(res => {
    const P = G.player, rig0 = P.rig, S = G.sound, eu = isEU(), cam = G.camera;
    const home = home0 || { x: P.pos.x, z: P.pos.z, h: P.heading }, pHome = partner ? { x: partner.pos.x, z: partner.pos.z, h: partner.heading } : null;
    const st = { t: 0, phase: 'intro', phaseT: 0, g: [0, 0], q: [0, 0], server: 0, faults: 0, games, over: false, auto: false, hitId: 0,
      ball: { x: 0, y: 1, z: 7, vx: 0, vy: 0, vz: 0, last: 0, crossed: false, bounces: 0, dead: false, inPlay: false, serve: false, serveOk: false, serveB: 0, held: -1 },
      pl: [mkPl(0, 1.4, NETZ - 7.5, true, 0), mkPl(0, -2.4, NETZ - 5.5, false, 1), mkPl(1, -1.6, NETZ + 5.5, false, 2), mkPl(1, 2.3, NETZ + 7.5, false, 3)] };
    const b = st.ball, P0 = st.pl[0], T = { rojos: tr('Rojos'), azules: tr('Azules') };
    let ended = false, hud = null, keys = {}, stick = { id: null, x: 0, y: 0 }, fbT = 0, crowdS = null, crowdB = null, cheerT = 0, rivals = [], wasMusic = S?.musicOn, cine = null;
    const names = { partner: partner?.name || PASAKA.canonigo.name, r: PASAKA.rivales };
    // --- la interfaz
    if (!document.getElementById('pk-style')) { const s = document.createElement('style'); s.id = 'pk-style'; s.textContent = CSS; document.head.appendChild(s); }
    const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    hud = document.createElement('div'); hud.className = 'pk-hud' + (touch ? ' touch' : '');
    hud.innerHTML = `<button type="button" class="pk-x" aria-label="${esc(tr('Salir'))}">✕</button>
      <div class="pk-sb"><span class="pk-t r">${esc(T.rojos)}</span><b class="pk-g">0</b><i class="pk-q">0 · 0</i><b class="pk-g">0</b><span class="pk-t a">${esc(T.azules)}</span></div>
      <div class="pk-tip"></div><div class="pk-fb"></div>
      <div class="pk-stick"><div class="pk-knob"><i></i></div></div>${touch ? '<div class="pk-stickhint"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M24 6l6 7h-4v8h8v-4l7 7-7 7v-4h-8v8h4l-6 7-6-7h4v-8h-8v4l-7-7 7-7v4h8v-8h-4z" fill="#fff" opacity=".9"/></svg></div>' : ''}
      <div class="pk-btns"><button type="button" class="pk-btn" data-k="golpe"><b>${esc(tr('Golpe'))}</b><small>${esc(tr('espacio'))}</small></button><button type="button" class="pk-btn ghost" data-k="dejada"><b>${esc(tr('Dejada'))}</b><small>${esc(tr('mayús'))}</small></button></div>`;
    document.body.appendChild(hud);
    const $ = s => hud.querySelector(s), fb = $('.pk-fb'), tip = $('.pk-tip'), sbG = hud.querySelectorAll('.pk-g'), sbQ = $('.pk-q'), btnG = $('.pk-btn[data-k="golpe"]'); let lastHot = false, firstRally = true;
    const say = (why, sub = '', cls = '') => { fb.innerHTML = `<b>${esc(why)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; fb.className = 'pk-fb on ' + cls; fbT = 1.6; };
    const score = () => { sbG[0].textContent = st.g[0]; sbG[1].textContent = st.g[1]; sbQ.textContent = `${QN[st.q[0]] ?? '40'} · ${QN[st.q[1]] ?? '40'}`; };
    const setTip = (s) => { tip.textContent = s; tip.style.display = s ? '' : 'none'; };
    // --- las figuras: tú (tu rig), la pareja (el canónigo) y los rivales (dos vecinos de negro)
    const rig = rig0; P.rig = { update() { }, doAct() { }, doCheer() { }, doWave() { }, setExpr() { } };
    P.frozen = true; G.mode = 'pelota'; G.ui.hudVisible?.(false); G.ui.setPrompt?.(null); G.perro?.away?.(); G.rt?.boost?.(true);
    if (G.beacon) G.beacon.off = true; if (G.sky) { G.sky.flood = 1; G.sky.indoor = true; G.sky.floodCur = 1; }
    S?.setMusic?.(false);
    const figs = []; // { pl, obj, actor?, anim(dt) }
    const stY = { v: null }; if (rig?.char) armSwing(rig.char, () => stY.v, { windOnly: true }); rig?.setStance?.('Ready');
    figs.push({ pl: P0, obj: P.obj, st: stY, flag: {}, me: true });
    const mkActor = (a, pl) => { if (!a) return; a.frozen = true; a.talking = 0; a.speed = 0; const s2 = { v: null }; if (a.glb) try { armSwing(a.glb, () => s2.v); } catch (e) { } figs.push({ pl, obj: a.obj, actor: a, st: s2, flag: {} }); };
    mkActor(partner, st.pl[1]);
    try {
      const look = (seed) => ({ shirt: '#15131a', pants: '#15131a', hair: seed % 2 ? '#3a2a20' : '#6b6b6b', old: !!(seed % 2), region: G.def?.comarca, seed });
      names.r.forEach((nm, i) => { const e = V.toWorld(st.pl[2 + i].x, st.pl[2 + i].z); const a = new Actor({ id: 'pasaka' + i, name: nm, x: e.x, z: e.z, heading: Math.PI, look: look(11 + i * 7) }, G.scene); a.pos.y = Y; a.sync?.(); rivals.push(a); G.walkers?.push(a); mkActor(a, st.pl[2 + i]); });
    } catch (e) { console.warn('pasaka rivales', e); }
    try { if (V.stand.length) { crowdS = crowd3d(V.stand, 'pelota', 1.36, { sit: false, all3d: true }); G.scene.add(crowdS); } if (V.sit.length) { crowdB = crowd3d(V.sit, 'pelota', 1.36, { sit: true, all3d: true }); G.scene.add(crowdB); } } catch (e) { console.warn('pasaka público', e); crowdS = crowdB = null; }
    // --- el saque y los quinces (entre quince y quince cada uno vuelve andando a su sitio y el que saca, tras su línea)
    const homeAll = () => { for (const p of st.pl) { p.take = false; p.want = 0; p.tx = p.hx; p.tz = p.hz; } if (st.server === 0) P0.tz = Math.min(P0.z, NETZ - SAQUE - 1); else { st.pl[2].tx = -1.4; st.pl[2].tz = NETZ + SAQUE + 1.2; } };
    const setupServe = () => { st.phase = 'serve'; st.phaseT = 0; b.inPlay = false; b.dead = false; b.vx = b.vy = b.vz = 0; b.held = st.server; setTip(st.server === 0 ? tr('Pulsa Golpe para sacar') : tr('Sacan los azules')); };
    const nextPoint = () => { if (st.over) return; st.phase = 'dead'; st.phaseT = 0; homeAll(); };
    const cheer = (k) => { cheerT = k; crowdS?.cheer?.(true); crowdB?.cheer?.(true); };
    const point = (t, why) => {
      if (st.phase === 'dead' || st.over) return;
      st.q[t]++; st.faults = 0; S?.crowd?.(t === 0 ? 0.6 : 0.3); cheer(1.2);
      if (st.q[t] >= 4) {
        st.g[t]++; st.q = [0, 0]; st.server = 1 - st.server;
        if (st.g[t] >= st.games) { st.over = true; score(); say(tr(t === 0 ? '¡Partido para los rojos!' : 'Partido para los azules'), why, t === 0 ? 'ok' : 'bad'); fbT = 9; cheer(3); if (t === 0) { S?.fanfare?.(); rig?.doCheer?.(); } setTimeout(() => done({ win: t === 0 }), 2200); return; }
        say(tr(t === 0 ? '¡Juego para los rojos!' : 'Juego para los azules'), why, t === 0 ? 'ok' : 'bad'); cheer(2);
      } else say(why, `${QN[st.q[0]]} - ${QN[st.q[1]]}${st.q[0] === 3 && st.q[1] === 3 ? ' · ' + tr('iguales') : ''}`, t === 0 ? 'ok' : 'bad');
      score(); nextPoint();
    };
    const serveFault = () => { if (st.phase === 'dead' || st.over) return; st.faults++; if (st.faults >= 2) { st.faults = 0; return point(1 - st.server, tr('Falta de saque')); } say(tr('Falta de saque'), tr('Segundo saque'), 'bad'); nextPoint(); };
    const launch = (pl, kind, aim = 0) => {
      const t = pl.team, dir = t === 0 ? 1 : -1;
      let q = 1; if (b.y < 0.25) q -= 0.35; else if (b.y > 1.9) q -= 0.25;
      q -= Math.max(0, Math.hypot(b.x - pl.x, b.z - pl.z) - 0.6) * 0.3; if (Math.hypot(b.vx, b.vy, b.vz) > 16) q -= 0.15; if (!pl.me) q -= 0.05;
      if (kind === 'saque') q = 0.95; q = clamp(q, 0.2, 1);
      let xt, zt, Tf, yt = 0;
      if (kind === 'saque') { xt = aim * (W / 2 - 1.4); zt = t === 0 ? L - 0.1 : 0.1; yt = t === 0 ? 1.4 + Math.random() * 0.5 : 0.6 + Math.random() * 0.5; Tf = 1.0; }
      else if (kind === 'dejada') { xt = aim * (W / 2 - 1.0); zt = NETZ + dir * (1.5 + Math.random() * 0.9); Tf = 0.72; }
      else { xt = aim * (W / 2 - 0.9); zt = t === 0 ? L - 0.6 - Math.random() * 1.6 : 1.8 + Math.random() * 2.4; Tf = 1.0 + Math.random() * 0.12; }
      xt = clamp(xt + (1 - q) * (Math.random() - 0.5) * 3, -W / 2 + 0.3, W / 2 - 0.3);
      b.vx = (xt - b.x) / Tf; b.vz = (zt - b.z) / Tf; b.vy = (yt - b.y) / Tf + 0.5 * GRAV * Tf;
      const tn = (NETZ - b.z) / b.vz, yn = b.y + b.vy * tn - 0.5 * GRAV * tn * tn, need = NETH + 0.14;
      if (tn > 0 && yn < need) b.vy += (need - yn) / tn;
      b.vy -= (1 - q) * (kind === 'dejada' ? 1.4 : 1.1) * Math.random();
      b.last = t; b.crossed = false; b.bounces = 0; b.dead = false; b.serve = kind === 'saque'; b.serveOk = false; b.serveB = 0; b.inPlay = true; b.held = -1; st.hitId++;
      pl.swingT = 0; pl.want = 0; S?.pelota?.(kind === 'dejada' ? 0.5 : 0.9);
      if (st.phase === 'serve') { st.phase = 'flight'; setTip(firstRally ? tr('Corre al círculo y pulsa Golpe cuando brille') : ''); }
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
    const aiShot = (pl) => {
      const opp = st.pl.filter(p => p.team !== pl.team), far = opp.every(p => Math.abs(p.z - NETZ) > 6.5), kind = far && Math.random() < 0.4 ? 'dejada' : 'golpe';
      let best = 0, bd = -1; for (const a of [-0.85, -0.3, 0.3, 0.85]) { const d = Math.min(...opp.map(p => Math.abs(p.x - a * (W / 2 - 0.9)))) + Math.random() * 0.8; if (d > bd) { bd = d; best = a; } }
      launch(pl, kind, best);
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
        // tú: la palanca o las teclas; si no, el destino que fijó un toque (ir)
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
      if (pl.decided !== st.hitId) { pl.decided = st.hitId; const run = Math.hypot(pl.tx - pl.hx, pl.tz - pl.hz), fast = Math.hypot(b.vx, b.vz) > 15; const p = clamp(0.9 - 0.035 * run - (fast ? 0.18 : 0) + (pl.me ? 0.08 : 0) - (pl.team === 1 ? 0.06 : 0), 0.35, 0.95); pl.miss = Math.random() > p; }
      if (!pl.miss) aiShot(pl);
    };
    const aimOf = () => { const kx = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x) * SX; if (Math.abs(kx) > 0.25) return clamp(kx, -1, 1) * 0.85; return clamp((b.x - P0.x) / 1.2, -1, 1) * 0.5; };
    const press = (kind) => { if (ended || st.over) return; if (st.phase === 'serve' && st.server === 0 && b.held === 0) { launch(P0, 'saque', aimOf()); return; } P0.want = kind; P0.wantT = 0.55; };
    const update = (dt) => {
      st.t += dt; st.phaseT += dt;
      if (st.phase === 'intro') { if (st.phaseT > 1.6) setupServe(); }
      else if (st.phase === 'dead') { if (st.phaseT > 1.6) setupServe(); }
      for (const p of st.pl) { think(p, dt); movePl(p, dt); }
      for (const a of st.pl) for (const c of st.pl) if (a !== c && a.team === c.team) { const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 1e-3) { c.x += dx / d * (0.8 - d) * 0.5; c.z += dz / d * (0.8 - d) * 0.5; } }
      if (st.phase === 'serve' && b.held >= 0) { const srv = b.held === 0 ? P0 : st.pl[2]; b.x = srv.x + 0.3; b.y = 1.05; b.z = srv.z + (b.held === 0 ? 0.3 : -0.3); }
      if (P0.want && !st.auto) { P0.wantT -= dt; if (st.phase === 'flight' && b.inPlay && !b.dead && b.last !== 0 && inReach(P0, b)) launch(P0, P0.want, aimOf()); else if (P0.wantT <= 0) { P0.want = 0; P0.swingT = 0; } }
      for (let i = 0, n = Math.ceil(dt / (1 / 120)); i < n; i++) stepBall(dt / n);
      if (st.phase === 'flight' && !b.inPlay) nextPoint();
      if (fbT > 0 && (fbT -= dt) <= 0) fb.className = 'pk-fb';
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
      const hot = coming && inReach(P0, b); if (hot !== lastHot) { lastHot = hot; btnG?.classList.toggle('hot', hot); }
      // la cámara: detrás de la valla, a la altura de una galería, mirando al frontis (se mueve un poco contigo)
      const cx = clamp(P0.x * 0.35 + (b.inPlay ? b.x * 0.15 : 0), -2.2, 2.2), cp = V.toWorld(cx, -3.4, 4.7), cl = V.toWorld(clamp(b.inPlay ? b.x * 0.4 : 0, -1.5, 1.5), NETZ + 1.0, 0.8);
      if (!cine) { cine = G.follow.cinematic = { pos: cp.clone(), look: cl.clone(), t: 0, lookCur: cl.clone() }; cam.position.copy(cp); cam.lookAt(cl); }
      else { if (G.follow.cinematic !== cine) G.follow.cinematic = cine; cine.pos.copy(cp); cine.look.copy(cl); }
      try { crowdS?.tick?.(st.t, cheerT > 0 ? 1 : 0.15, 0, cam); crowdB?.tick?.(st.t, cheerT > 0 ? 1 : 0.15, 0, cam); } catch (e) { }
    };
    // --- mandos: palanca, teclas y botones
    const KEYMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    const onKey = (e) => { const k = e.key.toLowerCase(), down = e.type === 'keydown'; if (KEYMAP[k]) { keys[KEYMAP[k]] = down; e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (!down) return; if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); return done({ quit: true }); }
      if (k === ' ' || k === 'j' || k === 'enter' || k === '1') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) press('golpe'); } else if (k === 'shift' || k === 'k' || k === '2') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) press('dejada'); } };
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
    const zone = $('.pk-stick'), knob = $('.pk-knob'), RK = 56;
    const resetStick = () => { stick = { id: null, x: 0, y: 0 }; knob.style.display = 'none'; };
    zone.addEventListener('pointerdown', (e) => { if (stick.id !== null) return; e.preventDefault(); const zr = zone.getBoundingClientRect(); stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; knob.style.display = 'block'; knob.style.left = (e.clientX - zr.left) + 'px'; knob.style.top = (e.clientY - zr.top) + 'px'; knob.firstElementChild.style.transform = ''; $('.pk-stickhint')?.remove(); });
    const onPtrMove = (e) => { if (e.pointerId !== stick.id) return; let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy); if (d > RK) { dx *= RK / d; dy *= RK / d; } stick.x = dx / RK; stick.y = -dy / RK; knob.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; };
    const endStick = (e) => { if (e.pointerId === stick.id) resetStick(); };
    addEventListener('pointermove', onPtrMove, true); addEventListener('pointerup', endStick, true); addEventListener('pointercancel', endStick, true);
    // (si el dedo sale de la pantalla sin «pointerup», la palanca se suelta igual)
    const onTouchEnd = () => { if (stick.id !== null && !(navigator.maxTouchPoints > 0 && document.querySelector(':active') === zone)) resetStick(); };
    addEventListener('touchend', onTouchEnd, true); addEventListener('touchcancel', onTouchEnd, true);
    const onBlur = () => { keys = {}; resetStick(); }; addEventListener('blur', onBlur);
    hud.querySelectorAll('.pk-btn').forEach(bt => bt.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); bt.classList.add('flash'); setTimeout(() => bt.classList.remove('flash'), 140); press(bt.dataset.k); }));
    $('.pk-x').onclick = () => done({ quit: true });
    // --- el bucle (lo llama el pueblo en modo pelota) y el final
    G.pelotaMatch = { pasaka: true }; G.pelotaRig = rig; G.pelotaAbort = () => done({ quit: true, error: true });
    G.pelotaTick = (dt) => { update(dt); place(dt); };
    function done(r) {
      if (ended) return; ended = true;
      G.pelotaTick = null; G.pelotaMatch = null; G.pelotaRig = null; G.pelotaAbort = null; delete window.__pasaka;
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur); removeEventListener('pointermove', onPtrMove, true); removeEventListener('pointerup', endStick, true); removeEventListener('pointercancel', endStick, true); removeEventListener('touchend', onTouchEnd, true); removeEventListener('touchcancel', onTouchEnd, true);
      const safe = (f) => { try { f(); } catch (e) { console.warn('pasaka', e); } };
      safe(() => hud.remove());
      safe(() => { if (rig?.char) rig.char.post = null; rig?.setStance?.(null); });
      safe(() => { for (const a of rivals) { if (a.glb) a.glb.post = null; const i = G.walkers?.indexOf(a); if (i >= 0) G.walkers.splice(i, 1); a.obj.parent?.remove(a.obj); } });
      safe(() => { if (partner) { if (partner.glb) partner.glb.post = null; partner.frozen = false; partner.speed = 0; if (pHome) partner.setPos(pHome.x, pHome.z, pHome.h); } });
      safe(() => { for (const c of [crowdS, crowdB]) if (c) { c.parent?.remove(c); c.dispose?.(); } });
      safe(() => { V.ball.visible = V.shadow.visible = V.ring.visible = false; });
      safe(() => { if (G.beacon) G.beacon.off = false; if (G.sky) { G.sky.flood = 0; G.sky.indoor = false; } G.rt?.boost?.(false); S?.setMusic?.(wasMusic); });
      P.rig = rig0; P.frozen = !!stay; G.mode = 'play';
      if (!stay) { safe(() => G.ui.hudVisible?.(true)); safe(() => G.perro?.release?.()); safe(() => { P.place(home.x, home.z, home.h); G.follow.cinematic = null; G.follow.snap(P); }); }
      else safe(() => { P.place(V.entry.x, V.entry.z, 0); G.follow.cinematic = null; G.follow.snap(P); });
      res(r.quit ? { quit: true, g: st.g.slice() } : { win: !!r.win, g: st.g.slice() });
    }
    // (para las pruebas: el estado, golpear, ir a un punto, jugar solo y adelantar el partido sin dibujar)
    window.__pasaka = { estado: () => ({ phase: st.phase, g: st.g.slice(), q: st.q.slice(), server: st.server, ball: { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), inPlay: b.inPlay, last: b.last }, you: { x: +P0.x.toFixed(2), z: +P0.z.toFixed(2) }, over: st.over }),
      golpear: press, ir: (x, z) => { P0.tx = x; P0.tz = z; }, auto: (on) => { st.auto = !!on; }, simular: (sec) => { for (let i = 0; i < sec * 60 && !ended; i++) update(1 / 60); if (!ended) place(1 / 60); }, fin: () => ended };
    // (los jugadores, cada uno en su sitio desde el primer fotograma; el jugador llega andando desde la entrada)
    homeAll(); score(); say(tr('¡Prepárate!'), partner ? (eu ? `${partner.name}ekin` : `Con ${partner.name}`) : tr('Sobreclaustro de la catedral')); place(0);
  });
}
