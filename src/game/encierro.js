// El encierro de San Fermín en su propia pantalla: la calle Estafeta con sus balcones llenos de gente vestida de
// blanco y rojo, corredores, cabestros y toros. Se corre hacia la plaza de toros esquivando a los toros que llegan
// por detrás; si uno te alcanza, te caes (tres caídas y se acaba). Al llegar a la plaza, la historia del encierro.
// En la vida real solo pueden correr las personas mayores de 18 años: el juego lo recuerda.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { beast } from '../actors/beasts.js';
import { buildAnimal } from '../actors/animalGlb.js';
import { buildNpc } from '../actors/npcGlb.js';
import { infoCard } from '../ui/minigames.js';

const L = 230;          // largo de la Estafeta en la escena (m); luego el callejón vallado y la plaza
const END = L + 34;     // meta: la entrada a la plaza de toros
const HALF = 2.9;       // media anchura de la calle
const FACTS = [
  { title: 'El encierro', text: 'Del 7 al 14 de julio, a las ocho de la mañana, seis toros y los cabestros, bueyes mansos que los guían, recorren unos 850 metros: desde los corrales de Santo Domingo hasta la plaza de toros. Tarda unos tres minutos.' },
  { title: 'El canto a San Fermín', text: 'Antes de empezar, los corredores cantan tres veces a San Fermín ante su imagen en la cuesta de Santo Domingo y le piden que los proteja. Llevan un periódico enrollado en la mano.' },
  { title: 'Los cohetes', text: 'Un cohete avisa de que se abren los corrales, otro de que todos los toros han salido, el tercero de que han entrado en la plaza y el cuarto de que ya están en los corrales: el encierro ha terminado.' },
  { title: 'Pastores y dobladores', text: 'Detrás de los toros van los pastores con sus varas, para que ninguno se quede atrás. En la plaza, los dobladores llevan a los toros hasta los corrales con sus capotes.' },
  { title: 'Solo para mayores', text: 'Correr el encierro es muy peligroso: solo pueden hacerlo las personas mayores de 18 años. Los niños y las niñas lo ven desde los balcones o por la tele… ¡o en este juego!' },
];

// adoquines dibujados
function cobbleTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#4a4540'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) {
    const ox = (y % 2) * 16, v = 120 + Math.random() * 50;
    g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.roundRect(x * 32 + ox + 2, y * 16 + 2, 28, 12, 4); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, L / 6); t.anisotropy = 4;
  return t;
}
// revoco de fachada: manchas suaves, desconchones y líneas de piedra (se multiplica por el color de cada pieza)
function plasterTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = mulberry(5);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = 205 + r() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v - 5},0.3)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2.5, 1 + r() * 2.5); }
  for (let i = 0; i < 10; i++) { const x = r() * 256, y = r() * 256, gr = g.createRadialGradient(x, y, 0, x, y, 10 + r() * 24); gr.addColorStop(0, 'rgba(170,160,145,0.18)'); gr.addColorStop(1, 'rgba(170,160,145,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(110,100,90,0.18)'; g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x += (r() - 0.5) * 16, y += r() * 10); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const colored = (geo, color, m) => {
  const g = (geo.index ? geo.toNonIndexed() : geo); if (m) g.applyMatrix4(m);
  const c = new THREE.Color(color), P = g.attributes.position, N = g.attributes.normal, n = P.count, a = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const [u, v] = nx >= ny && nx >= nz ? [z, y] : ny >= nz ? [x, z] : [x, y];
    uv[i * 2] = u / 2.2; uv[i * 2 + 1] = v / 2.2;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
};
const M4 = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

export class Encierro {
  constructor(G) { this.G = G; }

  // monta la escena: calle, fachadas con balcones, público, callejón y plaza
  build() {
    const S = this.scene = new THREE.Scene();
    S.background = new THREE.Color('#bcd6ec'); S.fog = new THREE.Fog('#cfe0ee', 60, 190);
    S.add(new THREE.HemisphereLight('#fff6e0', '#6a6258', 1.4));
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.position.set(30, 60, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 150 }); S.add(sun, sun.target);
    // suelo de adoquines
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, END + 60), new THREE.MeshStandardMaterial({ map: this.cobble = cobbleTex(), roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -(END + 60) / 2 + 30); ground.receiveShadow = true; S.add(ground);
    // fachadas: casas altas pegadas, con balcones de hierro en cada piso, contraventanas y gente asomada
    const parts = [], rnd = mulberry(7);
    const walls = ['#e9dcc0', '#d9b98a', '#e6cfa6', '#c98f6a', '#efe6d2', '#d6a77a', '#e2d2b0'];
    const people = [];
    for (const side of [-1, 1]) {
      let z = 8;
      while (z > -L) {
        const w = 7 + rnd() * 4, h = 12 + Math.floor(rnd() * 3) * 3, x = side * (HALF + 3.5), zc = z - w / 2, col = walls[Math.floor(rnd() * walls.length)];
        parts.push(colored(new THREE.BoxGeometry(7, h, w - 0.1), col, M4(x, h / 2, zc)));
        parts.push(colored(new THREE.BoxGeometry(7.6, 0.5, w + 0.2), '#8a4a32', M4(x, h + 0.25, zc)));            // alero
        parts.push(colored(new THREE.BoxGeometry(7.1, 1.0, w - 0.1), '#9a8f80', M4(x - side * 0.06, 0.5, zc)));     // zócalo de piedra
        for (let fl = 1; fl < Math.floor(h / 3); fl++) parts.push(colored(new THREE.BoxGeometry(7.12, 0.14, w - 0.1), '#d8ccb4', M4(x - side * 0.06, fl * 3 - 0.05, zc)));   // imposta
        if (rnd() < 0.3) { parts.push(colored(new THREE.BoxGeometry(0.5, 0.05, 0.05), '#1e1c1a', M4(side * (HALF + 0.25), 3.6, zc))); parts.push(colored(new THREE.BoxGeometry(0.22, 0.34, 0.22), '#2a2622', M4(side * (HALF - 0.02), 3.4, zc))); }   // farol
        const wins = Math.max(2, Math.floor(w / 2.6));
        for (let fl = 0; fl < Math.floor(h / 3); fl++) for (let k = 0; k < wins; k++) {
          const wz = zc - w / 2 + (k + 0.5) * (w / wins), wy = 1.6 + fl * 3, fx = side * (HALF + 0.02);
          if (fl === 0) { parts.push(colored(new THREE.BoxGeometry(0.06, 2.4, 1.3), k % 2 ? '#3a2a1e' : '#5a3a28', M4(fx, 1.2, wz))); continue; }
          parts.push(colored(new THREE.BoxGeometry(0.05, 2.1, 1.2), '#e9e1cf', M4(fx + side * 0.01, wy + 0.05, wz)));          // recerco
          parts.push(colored(new THREE.BoxGeometry(0.06, 1.9, 1.0), '#2a2622', M4(fx - side * 0.005, wy, wz)));                // ventana
          parts.push(colored(new THREE.BoxGeometry(0.08, 1.9, 0.45), '#3d6a4a', M4(fx - side * 0.02, wy, wz - 0.75)));   // contraventanas
          parts.push(colored(new THREE.BoxGeometry(0.08, 1.9, 0.45), '#3d6a4a', M4(fx - side * 0.02, wy, wz + 0.75)));
          parts.push(colored(new THREE.BoxGeometry(0.9, 0.12, 1.5), '#5a524a', M4(fx - side * 0.45, wy - 1.0, wz)));     // balcón
          parts.push(colored(new THREE.BoxGeometry(0.05, 0.85, 1.5), '#26221f', M4(fx - side * 0.88, wy - 0.5, wz)));    // barandilla
          if (rnd() < 0.55) people.push({ x: fx - side * 0.55, y: wy - 0.95, z: wz + (rnd() - 0.5) * 0.7, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
          if (rnd() < 0.3) people.push({ x: fx - side * 0.55, y: wy - 0.95, z: wz + (rnd() - 0.5) * 0.7, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
          if (rnd() < 0.25) parts.push(colored(new THREE.BoxGeometry(0.02, 0.9, 1.2), rnd() < 0.5 ? '#d42f2f' : '#ffffff', M4(fx - side * 0.92, wy - 1.3, wz)));   // pañuelo colgado
        }
        z -= w;
      }
    }
    // callejón: doble vallado de madera y, al fondo, la puerta de la plaza de toros
    for (let z = -L; z > -END + 2; z -= 2.2) for (const s of [-1, 1]) {
      parts.push(colored(new THREE.BoxGeometry(0.2, 1.7, 0.2), '#6a4a2a', M4(s * HALF, 0.85, z)));
      for (const y of [0.45, 0.95, 1.45]) parts.push(colored(new THREE.BoxGeometry(0.1, 0.18, 2.2), '#8a6a42', M4(s * (HALF - 0.12), y, z - 1.1)));
      parts.push(colored(new THREE.BoxGeometry(0.2, 1.7, 0.2), '#6a4a2a', M4(s * (HALF + 1.4), 0.85, z)));
    }
    const pz = -END - 4;
    parts.push(colored(new THREE.BoxGeometry(30, 14, 4), '#b85c3c', M4(0, 7, pz)));          // fachada de la plaza (ladrillo)
    parts.push(colored(new THREE.BoxGeometry(31, 1, 4.6), '#e8dcc0', M4(0, 14.3, pz)));
    parts.push(colored(new THREE.BoxGeometry(8, 1.6, 0.3), '#efe6d2', M4(0, 10.8, pz + 2.1)));  // cartel
    parts.push(colored(new THREE.BoxGeometry(5.6, 7, 0.4), '#2a1a12', M4(0, 3.5, pz + 2.05)));  // puerta abierta (oscuro)
    for (const s of [-1, 1]) parts.push(colored(new THREE.BoxGeometry(1.2, 8, 4.6), '#e8dcc0', M4(s * 3.5, 4, pz)));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: this.plaster = plasterTex() });
    const city = new THREE.Mesh(mergeGeometries(parts), mat); city.castShadow = city.receiveShadow = true; S.add(city);
    // cartel «PLAZA DE TOROS»
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 96; const sg = sc.getContext('2d');
    sg.fillStyle = '#efe6d2'; sg.fillRect(0, 0, 512, 96); sg.fillStyle = '#7a2a1a'; sg.font = '900 58px Georgia, serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('PLAZA DE TOROS', 256, 50);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.45), new THREE.MeshBasicMaterial({ map: st })); sign.position.set(0, 10.8, pz + 2.27); S.add(sign);
    // público en los balcones: figuras sencillas de blanco y rojo (una sola llamada de dibujo)
    const fig = mergeGeometries([
      colored(new THREE.CylinderGeometry(0.17, 0.2, 0.8, 8), '#f7f3ea', M4(0, 0.4, 0)),
      colored(new THREE.TorusGeometry(0.11, 0.045, 6, 10), '#d42f2f', new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0.82, 0)),
      colored(new THREE.SphereGeometry(0.15, 10, 8), '#e8b98e', M4(0, 1.0, 0)),
      colored(new THREE.SphereGeometry(0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#3a2418', M4(0, 1.03, 0)),
    ]);
    const crowd = new THREE.InstancedMesh(fig, mat, people.length), m = new THREE.Matrix4();
    people.forEach((p, i) => crowd.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry + (rnd() - 0.5) * 0.6, 0)), new THREE.Vector3(1, 0.9 + rnd() * 0.25, 1))));
    crowd.castShadow = false; S.add(crowd); this.crowd = crowd;
    this.camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 72 : 58, innerWidth / innerHeight, 0.2, 400);
    this.onResize = () => { this.camera.aspect = innerWidth / innerHeight; this.camera.fov = innerWidth < innerHeight ? 72 : 58; this.camera.updateProjectionMatrix(); };
    addEventListener('resize', this.onResize);
  }

  // corredores (el jugador y los demás, todos de blanco y rojo), toros y cabestros
  spawn() {
    const S = this.scene, rnd = mulberry(11), av = this.G.P.avatar;
    const white = { shirt: '#f7f3ea', pants: '#f7f3ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#efe6d0', espadrille: true };
    const me = buildNpc({ ...white, female: av === 'nerea', ponytail: av === 'nerea', hair: av === 'nerea' ? '#aa5c2a' : '#3a2418', skin: '#f1c4a0' });
    S.add(me.obj); this.me = { ...me, x: 0, z: -14, speed: 0, fall: 0, safe: 0 };
    this.runners = [];
    for (let i = 0; i < 12; i++) {
      const f = rnd() < 0.3, n = buildNpc({ ...white, female: f, ponytail: f, hair: ['#2a1a12', '#5a3a22', '#c9a46a', '#1d1d24'][i % 4], skin: ['#f1c4a0', '#e2b08a', '#c68a5e'][i % 3], height: 1.62 + rnd() * 0.2 });
      S.add(n.obj); this.runners.push({ ...n, x: (rnd() - 0.5) * 4.6, z: -6 - rnd() * 70, speed: 4.6 + rnd() * 1.6, want: 0 });
    }
    // la manada: cabestros y toros juntos; luego un toro suelto que se ha quedado atrás (el más peligroso)
    this.bulls = [];
    const herd = [['cabestro', -0.9, 0], ['bull', 0.7, -1.5], ['bull', -0.3, -3.4], ['cabestro', 1.0, -4.2], ['bull', -1.0, -5.6], ['bull', 0.4, -7.4], ['cabestro', -0.2, -8.6], ['bull', 0.9, -10]];
    for (const [k, x, dz] of herd) this.bulls.push(this.makeBeast(k, x, 14 - dz, 7.4, 0));
    this.bulls.push(this.makeBeast('bull', 0.3, 40, 8.1, 9));
    // nubes de polvo que levantan las pezuñas sobre el adoquín
    const dc = document.createElement('canvas'); dc.width = dc.height = 64; const dg = dc.getContext('2d'), gr = dg.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(190,175,150,0.9)'); gr.addColorStop(1, 'rgba(190,175,150,0)'); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    this.dustTex = new THREE.CanvasTexture(dc); this.dust = [];
    for (let i = 0; i < 70; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dustTex, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; S.add(sp); this.dust.push({ sp, life: 0 }); }
    this.dustI = 0; this.hoofT = 0; this.snortT = 3; this.shake = 0;
  }
  puff(x, z) {
    const d = this.dust[this.dustI++ % this.dust.length];
    d.life = 1; d.sp.visible = true; d.sp.position.set(x + (Math.random() - 0.5) * 0.6, 0.15, z + (Math.random() - 0.5) * 0.6); d.vy = 0.4 + Math.random() * 0.5; d.s0 = 0.5 + Math.random() * 0.4;
  }
  makeBeast(kind, x, z, speed, delay) {
    // toros y cabestros con el modelo animado de la fauna (galope real); si no está, el procedural
    const A = buildAnimal(kind);
    const q = A ? { root: A.root } : beast(kind, Math.random); if (!A) q.root.scale.setScalar(kind === 'bull' ? 1.2 : 1.08);
    q.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(q.root);
    return { q, A, kind, x, z, x0: x, speed, delay, ph: Math.random() * 6, out: false, charge: 0 };
  }

  // HUD propio: caídas que quedan, barra hasta la plaza y avisos
  hud() {
    const h = this.h = document.createElement('div'); h.className = 'enc-hud';
    h.innerHTML = `<div class="enc-top"><div class="enc-hearts"></div><div class="enc-bar"><i></i><b>Plaza</b></div></div><div class="enc-msg"></div><div class="enc-warn">¡Toro detrás! Apártate</div><div class="enc-help">${this.G.input.touch ? 'Mueve el dedo a los lados para esquivar · arriba para correr más' : 'A / D o ← → para esquivar · W o Mayús para correr más'}</div>`;
    document.body.appendChild(h);
  }
  msg(t, ms = 1800) { const m = this.h?.querySelector('.enc-msg'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(this.mt); this.mt = setTimeout(() => m.classList.remove('on'), ms); }

  // entra en la escena y devuelve una promesa que se resuelve al llegar a la plaza (o al rendirse)
  run() {
    const G = this.G;
    return new Promise(async (res) => {
      this.res = res;
      G.ui.hudVisible(false); G.player.frozen = true;
      await G.ui.fadeOut?.();
      this.build(); this.spawn(); this.hud();
      this.lives = 3; this.t = 0; this.started = false; this.done = false; this.closeCall = 0;
      G.encierro = this; G.altScene = this.scene; G.altCamera = this.camera; G.altUpdate = (dt) => this.update(dt); G.mode = 'encierro';
      this.place(); this.camCur = null;
      await G.ui.fadeIn?.();
      this.msg('Cantad a San Fermín… ¡y atentos al cohete! Cuando lleguen los toros, pégate a un lado.', 2700);
      G.sound.ui?.('open');
      setTimeout(() => { if (this.done) return; this.started = true; G.sound.fanfare?.(); this.msg('¡Pum! Primer cohete: se abren los corrales. ¡Corre!', 2400); }, 2800);
    });
  }

  update(dt) {
    const G = this.G, inp = G.input, me = this.me;
    this.t += dt;
    if (!this.started || this.done) { this.place(); this.cam(dt); return; }
    // jugador: corre solo hacia la plaza; adelante = más rápido, atrás = más despacio, a los lados = esquivar
    const fy = inp.move.y, fx = inp.move.x;
    if (me.fall > 0) { me.fall -= dt; me.speed = Math.max(0, me.speed - dt * 12); }
    else { const want = (inp.run || fy > 0.35) ? 7.2 : fy < -0.35 ? 3.0 : 5.3; me.speed += (want - me.speed) * Math.min(1, dt * 3); me.x += fx * 3.8 * dt; }
    me.x = Math.max(-HALF + 0.45, Math.min(HALF - 0.45, me.x)); me.z -= me.speed * dt; me.safe -= dt;
    // otros corredores: corren, y se apartan a la pared si llega un toro
    for (const r of this.runners) {
      const b = this.bulls.find(b => !b.out && b.z > r.z && b.z - r.z < 7 && Math.abs(b.x - r.x) < 1.6);
      r.want = b ? Math.sign(r.x || 1) * (HALF - 0.5) : r.want;
      if (!b && Math.random() < dt * 0.3) r.want = (Math.random() - 0.5) * 4;
      r.x += Math.max(-3, Math.min(3, (r.want - r.x) * 2)) * dt; r.z -= r.speed * dt;
      if (r.z < -END + 4) r.z = -END + 4;
      // el jugador no atraviesa a los demás
      const dx = me.x - r.x, dz = me.z - r.z, d = Math.hypot(dx, dz);
      if (d < 0.7 && d > 1e-3) { me.x += dx / d * (0.7 - d) * 0.8; if (dz > 0) me.speed *= 0.97; }
    }
    // toros y cabestros: corren en manada hacia la plaza haciendo eses; el que choca con el jugador lo tira
    let warn = false, near = 99;
    for (const d of this.dust) if (d.life > 0) { d.life -= dt * 0.9; d.sp.position.y += d.vy * dt; const k = 1 - d.life; d.sp.scale.setScalar(d.s0 + k * 1.6); d.sp.material.opacity = Math.max(0, d.life) * 0.55; if (d.life <= 0) d.sp.visible = false; }
    for (const b of this.bulls) {
      if (this.t < 2.8 + b.delay || b.out) continue;
      b.ph += dt * 6;
      // la manada va por el centro haciendo eses: pegarse a la pared es la forma de salvarse (como en la realidad)
      b.x = b.x0 + Math.sin(this.t * 0.7 + b.x0 * 2) * 0.55; b.x = Math.max(-1.45, Math.min(1.45, b.x));
      b.z -= b.speed * dt;
      if (b.z < -END + 2) { b.out = true; b.q.root.visible = false; continue; }
      const dz = b.z - me.z, dx = Math.abs(b.x - me.x);
      near = Math.min(near, Math.hypot(dz, dx));
      if (Math.random() < dt * 9) this.puff(b.x, b.z + 0.8);
      // el toro que ve a alguien delante baja la cabeza y embiste
      b.charge += ((b.kind === 'bull' && dz > 0 && dz < 6 && dx < 1.6 ? 1 : 0) - b.charge) * Math.min(1, dt * 4);
      if (b.kind === 'bull' && dz > 0 && dz < 11 && dx < 1.5) warn = true;
      if (dz > -1.2 && dz < 1.6 && dx < 0.95 && me.fall <= 0 && me.safe <= 0) this.hit(b);
      else if (b.kind === 'bull' && dz < 0 && dz > -2 && dx < 1.7 && dx > 0.95) this.closeCall += dt;
    }
    this.h.querySelector('.enc-warn').classList.toggle('on', warn && me.fall <= 0);
    // retumbar de pezuñas y bufidos más fuertes cuanto más cerca; la cámara tiembla
    const fear = Math.max(0, 1 - near / 16);
    this.shake = fear * 0.09;
    if (fear > 0 && (this.hoofT -= dt) <= 0) { this.hoofT = 0.32; this.G.sound.hooves?.(0.15 + fear * 0.6); }
    if (fear > 0.3 && (this.snortT -= dt) <= 0) { this.snortT = 1.6 + Math.random() * 2; this.G.sound.snort?.(fear); }
    this.h.querySelector('.enc-bar i').style.width = `${Math.min(100, (-me.z) / END * 100).toFixed(1)}%`;
    this.h.querySelector('.enc-hearts').innerHTML = [0, 1, 2].map(i => `<span class="${i < this.lives ? 'on' : ''}"></span>`).join('');
    if (me.z <= -END) this.finish(true);
    this.place(); this.cam(dt);
  }
  hit(b) {
    const me = this.me; this.lives--; me.fall = 1.3; me.safe = 3.2;
    this.G.sound.ui?.('error'); this.msg(this.lives > 0 ? (b.kind === 'bull' ? '¡Te ha alcanzado un toro! Pégate a la pared cuando pasen.' : '¡Un cabestro te ha arrollado! Apártate.') : '¡Uf! Mejor verlo desde el balcón.', 2400);
    me.char.playOnce?.('Scared', 1.2);
    if (this.lives <= 0) setTimeout(() => this.finish(false), 1400);
  }
  // coloca a todos (los cuadrúpedos con su galope)
  place() {
    const me = this.me;
    me.obj.position.set(me.x, 0, me.z); me.obj.rotation.y = Math.PI;
    me.anim.update(1 / 60, { speed: me.fall > 0 ? 0 : me.speed });
    if (me.fall > 0) me.obj.rotation.x = -Math.min(1.2, (1.3 - me.fall) * 4) * 0.35; else me.obj.rotation.x = 0;
    for (const r of this.runners) { r.obj.position.set(r.x, 0, r.z); r.obj.rotation.y = Math.PI; r.anim.update(1 / 60, { speed: this.started ? r.speed : 0 }); }
    for (const b of this.bulls) {
      const q = b.q, run = this.started && this.t > 2.8 + b.delay && !b.out, ph = b.ph;
      const off = [0.46, 0.58, 0.0, 0.12];
      if (b.A) { q.root.position.set(b.x, 0, b.z); q.root.rotation.y = Math.PI; b.A.update(1 / 60, { speed: run ? b.speed : 0, alt: !this.started }); continue; }
      q.root.position.set(b.x, run ? Math.max(0, Math.sin(ph + 0.6)) * 0.12 : 0, b.z); q.root.rotation.y = Math.PI;
      if (q.legs) q.legs.forEach((l, i) => { const w = ph + off[i] * Math.PI * 2; const ww = w + 0.38 * Math.sin(w); l.rotation.x = run ? Math.sin(ww) * 0.85 : 0; const kn = l.userData.knee; if (kn) kn.rotation.x = run ? (i < 2 ? 1.25 : -1.05) * Math.pow(Math.max(0, -Math.cos(ww)), 1.3) : 0; });
      if (q.chest) q.chest.rotation.x = run ? Math.sin(ph + 2.2) * 0.08 : 0;
      // con la cabeza baja y derrotes (golpes de cuerna hacia arriba) cuando embiste
      const ch = b.charge || 0;
      if (q.head) q.head.rotation.x = run ? (-0.1 + ch * 0.5) + Math.sin(ph) * 0.07 - ch * Math.max(0, Math.sin(ph * 0.5)) ** 6 * 0.6 : 0;
      if (q.body) q.body.rotation.x = run ? Math.sin(ph + 0.6) * 0.06 : 0;
    }
    this.sun.position.set(me.x + 30, 60, me.z + 20); this.sun.target.position.set(me.x, 0, me.z - 6);
  }
  cam(dt) {
    const me = this.me, c = this.camera;
    const want = new THREE.Vector3(me.x * 0.6, 3.3, me.z + 7.2), look = new THREE.Vector3(me.x * 0.5, 1.3, me.z - 7);
    if (!this.camCur) this.camCur = want.clone(); else this.camCur.lerp(want, Math.min(1, dt * 5));
    c.position.copy(this.camCur);
    if (me.fall > 0) c.position.y += Math.sin(this.t * 40) * 0.05;
    if (this.shake > 0) { c.position.x += (Math.random() - 0.5) * this.shake; c.position.y += (Math.random() - 0.5) * this.shake; }
    c.lookAt(look);
  }

  async finish(win) {
    if (this.done) return; this.done = true;
    const G = this.G;
    this.h?.querySelector('.enc-warn')?.classList.remove('on');
    if (win) { G.sound.fanfare?.(); this.msg(this.closeCall > 1.2 ? '¡En la plaza! Y corriste muy cerca de los toros.' : '¡En la plaza! ¡Lo has conseguido!', 2600); }
    await new Promise(r => setTimeout(r, 1800));
    if (this.h) this.h.style.display = 'none';   // sin avisos encima de las tarjetas
    for (const f of (win ? FACTS : FACTS.slice(-1))) await infoCard(G.ui, { icon: 'bull', kicker: 'San Fermín', title: f.title, text: f.text, button: 'Seguir' });
    await G.ui.fadeOut?.();
    this.dispose();
    G.altScene = null; G.altCamera = null; G.altUpdate = null; G.encierro = null; G.mode = 'play'; G.player.frozen = false; G.ui.hudVisible(true);
    await G.ui.fadeIn?.();
    this.res({ win, close: this.closeCall });
  }
  dispose() {
    removeEventListener('resize', this.onResize);
    this.h?.remove();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { m.map?.dispose(); m.dispose(); } });
    this.sun.shadow.map?.dispose(); this.cobble.dispose(); this.plaster?.dispose(); this.dustTex?.dispose();
    for (const n of [this.me, ...this.runners]) n.char?.dispose?.();
    this.scene = null;
  }
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
