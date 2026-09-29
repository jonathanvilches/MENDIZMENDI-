// Frontón y partido de pelota a mano a 5 tantos.
// Reglas simplificadas para niños: la pelota tiene que dar en el frontis por encima de la chapa,
// puede botar una vez en la cancha y la tiene que devolver el otro jugador. Si bota dos veces,
// sale por la derecha o por detrás, o da en la chapa, el tanto es para el rival.
import * as THREE from 'three';
import { terrainHeight, waterLevelAt } from '../world/heightfield.js';
import { addBox, isFree } from '../world/colliders.js';
import { clamp, lerp } from '../util/math.js';
import { clearGrass } from '../world/nature.js';

const W = 10, LEN = 26, HWALL = 9, CHAPA = 0.9;   // anchura, longitud de cancha, altura del frontis, chapa

function floorTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 640; const g = c.getContext('2d');
  g.fillStyle = '#7f8c86'; g.fillRect(0, 0, 256, 640);
  for (let i = 0; i < 3000; i++) { const v = 110 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v + 8},${v + 4},0.25)`; g.fillRect(Math.random() * 256, Math.random() * 640, 2, 2); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.fillStyle = '#ffffff'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center';
  for (let i = 1; i <= 7; i++) { const y = i * 640 / 7.4; g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); g.fillText(String(i), 228, y - 10); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function wallTexture(front) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 460; const g = c.getContext('2d');
  g.fillStyle = front ? '#7fa392' : '#8aab9c'; g.fillRect(0, 0, 512, 460);
  for (let i = 0; i < 2500; i++) { const v = Math.random() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v},0.08)`; g.fillRect(Math.random() * 512, Math.random() * 460, 3, 3); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 4;
  if (front) {
    const yc = 460 - CHAPA / HWALL * 460; g.fillStyle = '#b8c0c4'; g.fillRect(0, yc, 512, 460 - yc); g.strokeStyle = '#d42f2f'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, yc); g.lineTo(512, yc); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 8); g.lineTo(512, 8); g.stroke();
  } else {
    for (let i = 1; i <= 7; i++) { const x = i * 512 / 7.4; g.beginPath(); g.moveTo(x, 460); g.lineTo(x, 380); g.stroke(); }
    g.beginPath(); g.moveTo(0, 8); g.lineTo(512, 8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ballMesh() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), new THREE.MeshStandardMaterial({ color: '#f4efe0', roughness: 0.5 })));
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.131, 0.008, 6, 30, Math.PI), new THREE.MeshStandardMaterial({ color: '#8a1a1a' })); t.rotation.set(0, s * 0.5, Math.PI / 2); g.add(t); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Busca un sitio llano y libre cerca de la plaza
export function findFrontonSpot(plaza) {
  let best = null, bs = 1e9;
  for (let r = 30; r <= 110; r += 8) for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const x = plaza.x + Math.cos(a) * r, z = plaza.z + Math.sin(a) * r, ry = Math.atan2(plaza.x - x, plaza.z - z);
    const c = Math.cos(ry), s = Math.sin(ry); let mn = 1e9, mx = -1e9, ok = true;
    for (let u = -0.6; u <= 0.6; u += 0.3) for (let v = -0.1; v <= 1.05; v += 0.2) {
      const lx = u * W, lz = v * LEN, X = x + lx * c + lz * s, Z = z - lx * s + lz * c;
      if (!isFree(X, Z, 1.2) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.3) { ok = false; break; }
      const h = terrainHeight(X, Z); mn = Math.min(mn, h); mx = Math.max(mx, h);
    }
    if (!ok) continue;
    const score = (mx - mn) * 10 + r * 0.05;
    if (score < bs) { bs = score; best = { x, z, ry, y: mx + 0.05 }; }
  }
  return best;
}

export class Fronton {
  constructor(scene, spot) {
    this.scene = scene; this.spot = spot;
    clearGrass(spot.x, spot.z, W + 6, LEN + 1, spot.ry);
    const g = this.group = new THREE.Group(); g.position.set(spot.x, spot.y, spot.z); g.rotation.y = spot.ry; scene.add(g);
    const mat = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: t ? 0.28 : 0, ...o });
    // cancha con los cuadros numerados y base de hormigón
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, LEN), [mat(null, { color: '#6f7a74' }), mat(null, { color: '#6f7a74' }), mat(floorTexture()), mat(null, { color: '#6f7a74' }), mat(null, { color: '#6f7a74' }), mat(null, { color: '#6f7a74' })]);
    floor.position.set(0, -0.15, LEN / 2); floor.receiveShadow = true; g.add(floor);
    const base = new THREE.Mesh(new THREE.BoxGeometry(W + 3, 6, LEN + 1), new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 0.95 })); base.position.set(-1.5, -3.3, LEN / 2); g.add(base);
    // frontis y pared izquierda
    const front = new THREE.Mesh(new THREE.BoxGeometry(W + 1, HWALL, 0.6), [mat(null, { color: '#7fa392' }), mat(null, { color: '#7fa392' }), mat(null, { color: '#6a8a7c' }), mat(null, { color: '#7fa392' }), mat(wallTexture(true)), mat(null, { color: '#7fa392' })]);
    front.position.set(-0.5, HWALL / 2, -0.3); front.castShadow = true; front.receiveShadow = true; g.add(front);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, HWALL * 0.85, LEN), [mat(wallTexture(false), { color: '#ffffff' }), mat(null, { color: '#8aab9c' }), mat(null, { color: '#6a8a7c' }), mat(null, { color: '#8aab9c' }), mat(null, { color: '#8aab9c' }), mat(null, { color: '#8aab9c' })]);
    left.material[0] = mat(null, { color: '#8aab9c' }); left.material[1] = mat(wallTexture(false));
    left.position.set(-W / 2 - 0.25, HWALL * 0.425, LEN / 2); left.castShadow = true; left.receiveShadow = true; g.add(left);
    // gradas a la derecha, como en los frontones de plaza
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45 * (i + 1), LEN * 0.8), new THREE.MeshStandardMaterial({ color: '#b8ae9c', roughness: 0.9 })); st.position.set(W / 2 + 1.4 + i * 1.2, 0.225 * (i + 1), LEN * 0.55); st.castShadow = true; st.receiveShadow = true; g.add(st); }
    // colisiones para no atravesar las paredes
    const c = Math.cos(spot.ry), s = Math.sin(spot.ry), P = (lx, lz) => ({ x: spot.x + lx * c + lz * s, z: spot.z - lx * s + lz * c });
    const fp = P(-0.5, -0.3), lp = P(-W / 2 - 0.25, LEN / 2);
    addBox(fp.x, fp.z, W + 1, 0.8, spot.ry); addBox(lp.x, lp.z, 0.6, LEN, spot.ry);
    this.ball = ballMesh(); this.ball.visible = false; g.add(this.ball);
    this.toWorld = (lx, ly, lz) => { const p = P(lx, lz); return new THREE.Vector3(p.x, spot.y + ly, p.z); };
    this.toLocal = (x, z) => { const dx = x - spot.x, dz = z - spot.z; return { x: dx * c - dz * s, z: dx * s + dz * c }; };
    this.entry = P(0, LEN + 3);
  }
  // Partido. Devuelve una promesa con { win, you, cpu }
  play(game, rival) {
    if (window.__autoWin) return Promise.resolve({ win: true, you: 5, cpu: 0 });
    const G = game, ui = G.ui, input = G.input, sound = G.sound, player = G.player;
    return new Promise(res => {
      const S = { you: 0, cpu: 0, serve: 'you', turn: null, p: new THREE.Vector3(), v: new THREE.Vector3(), bounces: 0, hitFront: false, pause: 1.2, msg: '', me: { x: 1.5, z: 14 }, cp: { x: -1.5, z: 16 }, swing: 0 };
      const g = -8.5;
      G.mode = 'pelota'; player.frozen = true; this.ball.visible = true;
      const cam = G.follow;
      const hud = () => ui.setMG(`<b>Pelota a mano · a 5 tantos</b><span class="big">${S.you} – ${S.cpu}</span><small>Tú – ${rival.name.split(',')[0]}${S.msg ? ' · ' + S.msg : ''}</small>`);
      const camObj = { pos: new THREE.Vector3(), look: new THREE.Vector3(), t: 0 };
      const camera = () => { camObj.pos.copy(this.toWorld(S.me.x * 0.5, 5.2, Math.min(LEN + 5, S.me.z + 9))); camObj.look.copy(this.toWorld(S.me.x * 0.3, 2.2, 2)); if (cam.cinematic !== camObj) { camObj.lookCur = camObj.look.clone(); cam.cinematic = camObj; cam.cam.position.copy(camObj.pos); } };
      const place = () => {
        const a = this.toWorld(S.me.x, 0, S.me.z), b = this.toWorld(S.cp.x, 0, S.cp.z);
        player.place(a.x, a.z, this.spot.ry + Math.PI); rival.setPos(b.x, b.z, this.spot.ry + Math.PI);
        rival.home = { x: b.x, z: b.z };
      };
      // lanzar la pelota contra el frontis hacia un punto (tx, ty) en T segundos
      const shoot = (tx, ty, T) => { const p = S.p; S.v.set((tx - p.x) / T, (ty - p.y - 0.5 * g * T * T) / T, (0 - p.z) / T); S.hitFront = false; S.bounces = 0; };
      const serve = () => {
        S.turn = S.serve; const who = S.serve === 'you' ? S.me : S.cp;
        S.p.set(who.x, 1.0, who.z - 0.6); shoot(clamp(who.x + (Math.random() - 0.5) * 3, -3.5, 3.5), 2.4 + Math.random(), 1.0);
        sound.pelota?.(0.8); S.msg = S.serve === 'you' ? 'Sacas tú' : 'Saca el rival';
        if (S.serve === 'you') player.rig.doAct('throw', 0.4); else rival.anim?.doAct?.('throw', 0.4);
        S.turn = S.serve === 'you' ? 'cpu' : 'you';   // tras el saque, devuelve el otro
        hud();
      };
      const point = (toYou, why) => {
        if (toYou) S.you++; else S.cpu++;
        S.msg = why; sound.ui(toYou ? 'coin' : 'error'); hud();
        if (toYou) player.rig.doCheer();
        S.serve = toYou ? 'you' : 'cpu'; S.pause = 1.6;
        if (S.you >= 5 || S.cpu >= 5) S.end = 1.8;
      };
      const tryHit = (who) => {
        const d = Math.hypot(S.p.x - who.x, S.p.z - who.z);
        if (!S.hitFront || d > 1.9 || S.p.y > 2.4) return false;
        // calidad del golpe: mejor cuanto más cerca y a media altura
        const q = clamp(1 - d / 1.9, 0, 1) * 0.6 + clamp(1 - Math.abs(S.p.y - 0.9) / 1.3, 0, 1) * 0.4;
        const ty = q < 0.12 ? CHAPA * 0.5 : 1.6 + q * 3.6;
        const tx = clamp(who.x + (Math.random() - 0.5) * 6, -4.2, 3.8);
        shoot(tx, ty, 0.75 + (1 - q) * 0.25);
        sound.pelota?.(1);
        return true;
      };
      const keys = (e) => { if (['e', ' ', 'enter'].includes(e.key.toLowerCase())) { e.preventDefault(); S.press = true; } };
      addEventListener('keydown', keys, true);
      const tick = (dt) => {
        if (S.end != null) { S.end -= dt; if (S.end <= 0) return finish(); }
        // mover al jugador por la cancha con el joystick o las flechas
        const mv = input.move, sp = 7;
        S.me.x = clamp(S.me.x - mv.x * sp * dt, -4.4, 4.6); S.me.z = clamp(S.me.z + mv.y * -sp * dt, 3, LEN - 1);
        if (input.consume('e') || input.consume(' ')) S.press = true;
        if (S.pause > 0) { S.pause -= dt; if (S.pause <= 0 && S.end == null) serve(); place(); this.ball.position.set(0, -5, 0); camera(); return; }
        // física de la pelota
        const p = S.p, v = S.v, prevZ = p.z;
        v.y += g * dt; p.addScaledVector(v, dt);
        if (p.z <= 0.13 && v.z < 0) {
          if (p.y < CHAPA) { point(S.turn === 'you', S.turn === 'you' ? '¡Chapa del rival!' : '¡Chapa! La pelota tiene que dar por encima de la raya roja'); return; }
          p.z = 0.13; v.z = -v.z * 0.82; v.x *= 0.9; S.hitFront = true; S.bounces = 0; sound.pelota?.(0.6);
        }
        if (p.x <= -W / 2 + 0.13 && v.x < 0) { p.x = -W / 2 + 0.13; v.x = -v.x * 0.8; sound.pelota?.(0.4); }
        if (p.y <= 0.13 && v.y < 0) {
          p.y = 0.13; v.y = -v.y * 0.62; v.x *= 0.85; v.z *= 0.85; S.bounces++; sound.pelota?.(0.35);
          if (S.hitFront && S.bounces >= 2) { point(S.turn !== 'you', S.turn === 'you' ? 'Ha botado dos veces' : '¡El rival no llega!'); return; }
          if (!S.hitFront) { point(S.turn === 'you', 'No ha llegado al frontis'); return; }
        }
        if (p.x > W / 2 + 0.5 || p.z > LEN + 1) { point(S.bounces >= 1 ? S.turn !== 'you' : S.turn === 'you', 'Fuera'); return; }
        // turno del jugador: golpear al pulsar acción
        S.swing = Math.max(0, S.swing - dt);
        if (S.press) { S.press = false; S.swing = 0.25; player.rig.doAct('throw', 0.35); }
        if (S.turn === 'you' && S.swing > 0 && tryHit(S.me)) { S.turn = 'cpu'; S.swing = 0; S.msg = '¡Buen golpe!'; hud(); }
        // rival: corre hacia donde va a caer la pelota y la devuelve (a veces falla)
        if (S.turn === 'cpu') {
          const tx = S.hitFront ? p.x + v.x * 0.4 : S.cp.x, tz = S.hitFront ? clamp(p.z + v.z * 0.5, 4, LEN - 2) : 16;
          S.cp.x += clamp(tx - S.cp.x, -6 * dt, 6 * dt); S.cp.z += clamp(tz - S.cp.z, -6 * dt, 6 * dt);
          if (S.hitFront && S.bounces >= 1 && p.y < 1.6 && Math.hypot(p.x - S.cp.x, p.z - S.cp.z) < 1.2) {
            if (S.cpuMiss == null) S.cpuMiss = Math.random() < 0.28;
            if (!S.cpuMiss && tryHit(S.cp)) { S.turn = 'you'; S.cpuMiss = null; rival.anim?.doAct?.('throw', 0.35); S.msg = 'Te toca'; hud(); }
          }
        } else S.cpuMiss = null;
        // el jugador se acerca solo un poco a la pelota para ayudar a los más pequeños
        if (S.turn === 'you' && S.hitFront) { S.me.x += clamp(p.x - S.me.x, -1.2 * dt, 1.2 * dt); }
        place();
        this.ball.position.set(p.x, p.y, p.z); this.ball.rotation.x += dt * 12;
        // cámara detrás del jugador mirando al frontis
        camera();
      };
      const finish = () => {
        removeEventListener('keydown', keys, true); G.pelotaTick = null;
        ui.setMG(null); this.ball.visible = false; cam.cinematic = null; player.frozen = false; G.mode = 'play';
        const e = this.entry; player.place(e.x, e.z, this.spot.ry); cam.snap(player);
        res({ win: S.you > S.cpu, you: S.you, cpu: S.cpu });
      };
      place(); hud(); G.pelotaTick = tick;
    });
  }
}
