// Los peces de los ríos (noviembre de 2026): bancos de truchas, salmones, barbos, madrillas y chipas que nadan bajo el
// agua cerca de donde va el jugador, cada río con los suyos: en los de la cuenca del Bidasoa, la trucha y el salmón
// atlántico (que sube desde el mar a desovar); en los del Pirineo, la trucha común y las chipas; en los del Prepirineo y la
// zona media, truchas, barbos y madrillas; en los de la Ribera, el barbo de Graells y la madrilla. Las especies son las de
// las normas de pesca del Gobierno de Navarra para esas cuencas.
// Cada pez mira contra la corriente, como de verdad, y se mantiene en su sitio meneando la cola; de vez en cuando uno da un
// acelerón y vuelve. Si el jugador se acerca a la orilla o pasa por encima por un puente, el banco sale disparado río abajo y
// se vuelve a juntar más allá. Un banco que queda lejos se va a otro trozo de río cerca del jugador: así siempre hay peces
// donde mira, con pocos en total.
// Cada especie es una malla repetida (una llamada de dibujo), con su librea pintada en una textura pequeña; el meneo de la
// cola va en el sombreador. Se dibujan después del agua, algo transparentes y teñidos del color del río, para que se vean a
// través de ella como en un río limpio (bajo el agua, que no escribe profundidad, quedarían casi tapados por su color).
//   new Peces(scene, { quality, comarca }) · update(dt, t, player, night, oculto) · onVisto(especie): un banco que sale
//   huyendo al acercarse el jugador (la especie se apunta en la fauna, game/townGame.js)
import * as THREE from 'three';
import { riverInfo, riverPointNear, MOD } from './layout.js';
import { mulberry32 } from '../util/math.js';

// L: largo (m); prof: a qué hondura nada bajo la superficie; banco: cuántos juntos; pinta: la librea
const ESPECIES = {
  trucha: { L: 0.32, alto: 0.21, prof: [0.25, 0.5], banco: [4, 7], vel: 1.0, pinta: { lomo: '#363d24', flanco: '#a99550', vientre: '#efe2bd', motas: ['#1c1810', '#1c1810', '#c2321f'], halo: '#f1e3c4', linea: null } },
  salmon: { L: 0.72, alto: 0.2, prof: [0.45, 0.8], banco: [2, 4], vel: 1.25, pinta: { lomo: '#283640', flanco: '#c3ccd0', vientre: '#f2f4f2', motas: ['#1d252b'], halo: null, linea: '#8a979e' } },
  barbo: { L: 0.46, alto: 0.2, prof: [0.4, 0.75], banco: [3, 6], vel: 0.8, pinta: { lomo: '#43391f', flanco: '#b0924e', vientre: '#eadcb5', motas: [], halo: null, linea: '#8c7744' } },
  madrilla: { L: 0.17, alto: 0.22, prof: [0.15, 0.4], banco: [7, 11], vel: 1.4, pinta: { lomo: '#45524c', flanco: '#c3cbc3', vientre: '#eef0ea', motas: [], halo: null, linea: '#5d6660' } },
  chipa: { L: 0.09, alto: 0.2, prof: [0.08, 0.25], banco: [9, 14], vel: 1.7, pinta: { lomo: '#43503a', flanco: '#a7ae8a', vientre: '#e8e3ca', motas: ['#2a2f22'], halo: null, linea: '#3a4232' } },
};
// qué peces hay en los ríos de cada comarca (y en qué proporción salen los bancos)
const POR_COMARCA = {
  bidasoa: [['trucha', 3], ['salmon', 2], ['chipa', 2]],
  pirineo: [['trucha', 4], ['chipa', 2]],
  'larraun-leitzaldea': [['trucha', 3], ['chipa', 2]],
  sakana: [['trucha', 2], ['madrilla', 2], ['chipa', 1]],
  prepirineo: [['trucha', 2], ['barbo', 2], ['madrilla', 2]],
  pamplona: [['barbo', 2], ['madrilla', 2], ['trucha', 1]],
  sanguesa: [['barbo', 3], ['madrilla', 2], ['trucha', 1]],
  'valdizarbe-novenera': [['barbo', 3], ['madrilla', 2], ['trucha', 1]],
  'tierra-estella': [['barbo', 3], ['madrilla', 2], ['trucha', 1]],
  'zona-media': [['barbo', 3], ['madrilla', 2]],
  ribera: [['barbo', 3], ['madrilla', 3]],
  'ribera-alta': [['barbo', 3], ['madrilla', 3]],
};
export const PECES_NOMBRE = { trucha: 'Trucha común', salmon: 'Salmón atlántico', barbo: 'Barbo de Graells', madrilla: 'Madrilla', chipa: 'Chipa' };

// ---------- la librea: lomo oscuro, flanco, vientre claro, motas y la línea lateral ----------
function librea(p, rnd) {
  const W = 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  // (v = 0 el vientre, v = 1 el lomo: la textura da la vuelta al cuerpo de abajo arriba)
  const gr = g.createLinearGradient(0, H, 0, 0);
  gr.addColorStop(0, p.vientre); gr.addColorStop(0.32, p.vientre); gr.addColorStop(0.5, p.flanco); gr.addColorStop(0.72, p.flanco); gr.addColorStop(0.9, p.lomo); gr.addColorStop(1, p.lomo);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (p.linea) { g.strokeStyle = p.linea; g.globalAlpha = 0.7; g.lineWidth = 1.5; g.beginPath(); g.moveTo(6, H * 0.47); g.lineTo(W - 10, H * 0.5); g.stroke(); g.globalAlpha = 1; }
  for (let i = 0; i < (p.motas.length ? 70 : 0); i++) {
    const x = 10 + rnd() * (W - 26), y = H * (0.42 + rnd() * 0.5), r = 1 + rnd() * 1.6, col = p.motas[Math.floor(rnd() * p.motas.length)];
    if (p.halo && col !== p.motas[0]) { g.fillStyle = p.halo; g.beginPath(); g.arc(x, y, r + 1.2, 0, 7); g.fill(); }
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- el cuerpo: un huso algo aplastado de lado, con la cola en horquilla y las aletas ----------
// (z: de la cola, −L/2, a la boca, +L/2; aCola: 0 en la cabeza y 1 en la punta de la cola, para el meneo). Un tercio más
// grande que el de verdad y con el lomo más ancho: desde la orilla, a través del agua, el de su tamaño era una raya
const AUMENTO = 1.35;
function cuerpo(E) {
  const L = E.L * AUMENTO, R = 8, S = 10, pos = [], uv = [], cola = [], idx = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S, z = -L / 2 + u * L * 0.86, w = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.75), ry = E.alto * L * 0.5 * w, rx = ry * 0.62;
    for (let j = 0; j <= R; j++) { const a = -Math.PI / 2 + (j / R) * Math.PI * 2; pos.push(Math.cos(a) * rx, Math.sin(a) * ry, z); uv.push(u, (Math.sin(a) + 1) / 2); cola.push(Math.pow(1 - u, 1.6)); }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // la cola en horquilla, de pie
  const z0 = -L / 2 + 0.02 * L, z1 = -L / 2 - L * 0.2, h = E.alto * L * 0.55, b0 = pos.length / 3;
  pos.push(0, 0, z0, 0, h, z1, 0, h * 0.18, z1 + L * 0.06, 0, -h * 0.18, z1 + L * 0.06, 0, -h, z1); uv.push(0, 0.6, 0, 0.9, 0, 0.6, 0, 0.4, 0, 0.1); cola.push(1, 1.15, 1.1, 1.1, 1.15);
  idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 3, b0 + 4);
  // la aleta dorsal
  const zd = -L * 0.02, b1 = pos.length / 3, hy = E.alto * L * 0.5;
  pos.push(0, hy * 0.9, zd + L * 0.1, 0, hy * 1.55, zd - L * 0.02, 0, hy * 0.85, zd - L * 0.1); uv.push(0.5, 1, 0.5, 1, 0.45, 1); cola.push(0.3, 0.35, 0.4);
  idx.push(b1, b1 + 1, b1 + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aCola', new THREE.Float32BufferAttribute(cola, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// el material: la librea teñida del agua y el meneo de la cola (aFase, aBrio: lo que menea, más al acelerar)
function material(tex, E, agua) {
  const m = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide });
  const T = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = T; sh.uniforms.uAgua = { value: new THREE.Color(agua) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aCola; attribute float aFase; attribute float aBrio; uniform float uT;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float ond = sin(uT * ${(9 / Math.sqrt(E.L / 0.3)).toFixed(2)} * (0.7 + aBrio) + aFase - position.z * ${(9 / E.L).toFixed(2)});
transformed.x += ond * aCola * ${(E.L * 0.16).toFixed(3)} * (0.45 + aBrio);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uAgua;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uAgua, 0.3);');
  };
  m.customProgramCacheKey = () => 'pez' + E.L;
  return { m, T };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

// la corriente en un punto: el tramo de río más cercano, en el sentido en que baja su nivel (en los pueblos generados, a lo
// largo de z)
function corriente(x, z) {
  const R = MOD?.real?.rios; if (!R) return { dx: 0, dz: 1 };
  let best = null, bd = 1e9;
  for (const r of R) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)), d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
    if (d < bd) { bd = d; const sg = r.lv[i] >= r.lv[i + 1] ? 1 : -1, l = Math.sqrt(l2); best = { dx: vx / l * sg, dz: vz / l * sg }; }
  }
  return best || { dx: 0, dz: 1 };
}

export class Peces {
  constructor(scene, { quality = 'high', comarca = '', sound = null } = {}) {
    this.sound = sound;   // (el chapoteo al huir un banco y algún salto de vez en cuando, audio.js)
    this.scene = scene; const low = quality === 'low', rnd = this.rnd = mulberry32(4242);
    const lista = POR_COMARCA[comarca] || [['trucha', 3], ['chipa', 1]];
    this.bolsa = lista.flatMap(([k, n]) => Array(n).fill(k));
    const nB = low ? 4 : 6;
    this.esp = {}; this.bancos = [];
    const agua = '#2f6a6c';
    for (const k of new Set(lista.map(x => x[0]))) {
      const E = ESPECIES[k], cupo = E.banco[1] * Math.ceil(nB * 0.7), g = cuerpo(E);
      for (const a of ['aFase', 'aBrio']) g.setAttribute(a, new THREE.InstancedBufferAttribute(new Float32Array(cupo), 1));
      const { m, T } = material(librea(E.pinta, rnd), E, agua);
      const mesh = new THREE.InstancedMesh(g, m, cupo); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.name = 'peces ' + k; mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < cupo; i++) g.attributes.aFase.array[i] = i * 2.17;
      scene.add(mesh); this.esp[k] = { E, mesh, g, T, cupo, usados: 0 };
    }
    for (let i = 0; i < nB; i++) this.bancos.push({ k: this.bolsa[0], peces: [], lejos: true });
  }
  // un banco nuevo en un trozo de río a 10-34 m del jugador, que se vea (con agua de verdad y algo de anchura)
  coloca(B, px, pz) {
    for (let it = 0; it < 10; it++) {
      const a = this.rnd() * 6.28, r = 8 + this.rnd() * 20, q = riverPointNear(px + Math.cos(a) * r, pz + Math.sin(a) * r);
      if (!q || q.x > 9000) return false;
      const ri = riverInfo(q.x, q.z); if (ri.half < 1.4 || ri.edge > -0.8 || !(ri.level > -1e8)) continue;
      if (Math.hypot(q.x - px, q.z - pz) < 6) continue;
      // (cada vez que se va a otro sitio, otra especie de las del río: así salen todas al ir andando)
      B.k = this.bolsa[Math.floor(this.rnd() * this.bolsa.length)];
      const E = ESPECIES[B.k], c = corriente(q.x, q.z), n = E.banco[0] + Math.floor(this.rnd() * (E.banco[1] - E.banco[0] + 1));
      B.x = q.x; B.z = q.z; B.c = c; B.nivel = ri.level; B.half = ri.half; B.huye = 0; B.lejos = false;
      B.peces = Array.from({ length: n }, () => {
        const lat = (this.rnd() - 0.5) * Math.min(ri.half * 1.2, 2 + E.L * 8), lon = (this.rnd() - 0.5) * (1.5 + E.L * 10);
        return { lat, lon, ox: lat, oz: lon, prof: E.prof[0] + this.rnd() * (E.prof[1] - E.prof[0]), fase: this.rnd() * 6.28, brio: 0, dash: 0, gir: 0 };
      });
      return true;
    }
    return false;
  }
  update(dt, t, player, night = 0, oculto = false) {
    const ver = !oculto && night < 0.75;
    for (const k in this.esp) this.esp[k].mesh.visible = ver;
    if (!ver) return;
    const px = player.pos.x, pz = player.pos.z, py = player.pos.y;
    for (const k in this.esp) this.esp[k].usados = 0;
    for (const B of this.bancos) {
      if (B.lejos || Math.hypot(B.x - px, B.z - pz) > 46) { if (!this.coloca(B, px, pz)) { B.lejos = true; continue; } }
      const E = ESPECIES[B.k], S = this.esp[B.k];
      // (el jugador cerca de la orilla o encima, en un puente: salen río abajo y se juntan otra vez más allá)
      const dJ = Math.hypot(B.x - px, B.z - pz);
      if (dJ < 4.5 + E.L * 4 && B.huye <= 0 && py > B.nivel - 0.5) { B.huye = 1.6; for (const f of B.peces) f.dash = 1; if (dJ < 4 + E.L * 4) this.onVisto?.(B.k); this.sound?.chapoteo?.({ x: B.x, y: B.nivel, z: B.z }); }   // (onVisto: el juego apunta la especie en la fauna)
      // (cerca de un banco tranquilo, de vez en cuando un pez que salta o chapotea en la superficie: cada 10 a 25 s)
      else if (dJ < 22 && B.huye <= 0 && (B.salta = (B.salta ?? 5 + Math.random() * 10) - dt) <= 0) { B.salta = 10 + Math.random() * 15; this.sound?.chapoteo?.({ x: B.x, y: B.nivel, z: B.z }, E.L > 0.3 && Math.random() < 0.5); }
      if (B.huye > 0) {
        B.huye -= dt; const v = 3.2 * E.vel;
        const nx = B.x + B.c.dx * v * dt, nz = B.z + B.c.dz * v * dt, ri = riverInfo(nx, nz);
        if (ri.edge < -0.6 && ri.level > -1e8) { B.x = nx; B.z = nz; B.nivel = ri.level; B.half = ri.half; } else B.huye = 0;
        if (B.huye <= 0) B.c = corriente(B.x, B.z);
      }
      const yaw = Math.atan2(-B.c.dx, -B.c.dz), nxL = -B.c.dz, nzL = B.c.dx;   // (de cara a la corriente)
      for (const f of B.peces) {
        if (S.usados >= S.cupo) break;
        // (cada uno a su aire: un ir y venir pequeño, y de vez en cuando un acelerón hacia delante y vuelta a su sitio)
        if (f.dash <= 0 && this.rnd() < dt * 0.08) f.dash = 0.6 + this.rnd() * 0.5;
        f.dash = Math.max(0, f.dash - dt * 1.3); f.brio += ((f.dash > 0 ? 1 : 0.15) - f.brio) * Math.min(1, dt * 4);
        f.lon += ((f.dash > 0 ? f.oz + 1.4 + E.L * 4 : f.oz) - f.lon) * Math.min(1, dt * (f.dash > 0 ? 2.2 : 0.8));
        f.lat = f.ox + Math.sin(t * 0.37 + f.fase) * 0.3;
        f.gir = Math.sin(t * 0.6 + f.fase) * 0.22 + (f.dash > 0 ? Math.sin(t * 7 + f.fase) * 0.08 : 0);
        const x = B.x - B.c.dx * f.lon + nxL * f.lat, z = B.z - B.c.dz * f.lon + nzL * f.lat;
        const ri = riverInfo(x, z); if (ri.edge > -0.35) continue;   // (fuera del agua no)
        const y = (ri.level > -1e8 ? ri.level : B.nivel) - f.prof + Math.sin(t * 1.3 + f.fase) * 0.03;
        _q.setFromEuler(_e.set(0, yaw + f.gir, 0, 'YXZ')); _m.compose(_p.set(x, y, z), _q, _s);
        const i = S.usados++; S.mesh.setMatrixAt(i, _m); S.g.attributes.aBrio.array[i] = f.brio;
      }
    }
    for (const k in this.esp) { const S = this.esp[k]; S.mesh.count = S.usados; S.mesh.instanceMatrix.needsUpdate = true; S.g.attributes.aBrio.needsUpdate = true; S.T.value = t; }
  }
  dispose() { for (const k in this.esp) { const S = this.esp[k]; this.scene.remove(S.mesh); S.g.dispose(); S.mesh.material.map?.dispose(); S.mesh.material.dispose(); } }
}
