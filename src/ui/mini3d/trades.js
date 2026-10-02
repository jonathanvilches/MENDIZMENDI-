// Los pasos de los talleres que se hacen con la barra de precisión (golpe en el momento justo) o pulsando deprisa,
// en 3D: cada oficio tiene su escena y el trabajo avanza con cada golpe bueno (la muesca del tronco se hace más honda,
// la piedra queda escuadrada, la cesta sube, el huso se llena, los panes entran al horno, la masa queda lisa, los aros
// bajan, el hierro se enfría en el agua, las palomas bajan a las redes, la piedra sube al hombro, la carbonera se tapa,
// la herradura se dobla, la suela se cose). Todo con curvas: tornos, tubos, extrusiones y piezas redondeadas.
import * as THREE from 'three';
import { play3d, blip } from './play.js';
import { workshop, outdoors, texMat, uvScale, rbox, lathe, lumpy, particles, puffs, tube, stool, tree } from './kit.js';
import { anvil, hammer, tongs, shoeCurve, heatColor } from './forge.js';
import { soleMesh, soleOutline } from './stitch.js';
import { worker } from './worker.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (k) => k * k * (3 - 2 * k);
// golpe con herramienta: arriba (up) → cae en 0,14 s hasta el impacto (ti) → se queda un momento → vuelve a subir
// martillo que pega hacia abajo: el mango sale de la mano hacia «d» (horizontal), la boca mira al suelo; «raise» lo
// levanta girando sobre la muñeca
const _mx = new THREE.Matrix4(), _qa = new THREE.Quaternion(), _ax = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0), _down = new THREE.Vector3(0, -1, 0), _z = new THREE.Vector3();
function hammerQ(d, raise, out) {
  _z.crossVectors(_down, d).normalize(); _mx.makeBasis(_down, d, _z); out.setFromRotationMatrix(_mx);
  _ax.crossVectors(d, _Y).normalize(); return out.premultiply(_qa.setFromAxisAngle(_ax, raise));
}
const swingAngle = (hit, up, ti, t) => hit < 0.14 ? up + (ti - up) * (hit / 0.14) ** 2 : hit < 0.3 ? ti : hit < 0.75 ? ti + (up - ti) * ease((hit - 0.3) / 0.45) : up + Math.sin(t * 1.6) * 0.04;
// material con «cortes» (madera recién cortada en la muesca): el atributo cutw mezcla la corteza con madera clara
function cutMat(S, base, fresh = '#e8c99a') {
  const m = base.clone(); S.own(m);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float cutw; varying float vCutW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCutW = cutw;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vCutW;`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${new THREE.Color(fresh).toArray().map(v => v.toFixed(3)).join(',')}) * (0.85 + 0.3 * fract(sin(dot(floor(vMapUv * 60.0), vec2(12.9, 78.2))) * 43758.5)), vCutW);`);
  };
  m.customProgramCacheKey = () => 'corte' + fresh;
  return m;
}
// hacha de aizkolari: hoja ancha extruida con bisel y mango largo torneado
function axe(S) {
  const g = new THREE.Group(), sh = new THREE.Shape();
  sh.moveTo(0, -0.03); sh.lineTo(0.1, -0.05); sh.quadraticCurveTo(0.17, -0.09, 0.19, -0.11); sh.quadraticCurveTo(0.22, 0, 0.19, 0.11); sh.quadraticCurveTo(0.17, 0.09, 0.1, 0.05); sh.lineTo(0, 0.03); sh.closePath();
  const head = S.mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 10 }).translate(0, 0, -0.011), S.mat('#9aa0a8', { metalness: 0.85, roughness: 0.28 }), 0, 0, 0, g);
  head.rotation.y = -Math.PI / 2;
  S.mesh(lathe([[0.001, 0], [0.017, 0], [0.015, 0.25], [0.013, 0.5], [0.016, 0.72], [0.019, 0.8], [0.001, 0.81]], 12), S.mat('#c89a5a', { roughness: 0.55 }), 0, -0.79, 0, g);
  return g;
}

// ------------------------------------------------------------------------------------------------ escenas
// cada una: build(S) → { set(p, hit, ok, dt), frame: { box, dir }, ready? }; p = avance 0…1, hit = s desde el
// último golpe, ok = si fue bueno
const SCENES = {
  // -------- el tronco del aizkolari (primer lado: la V hasta la mitad; segundo lado: hasta partirlo)
  chop: (S) => chopScene(S, 0), chop2: (S) => chopScene(S, 1),
  // -------- el sillar: de piedra bruta a bloque escuadrado (desbaste) y de bloque a cara lisa (talla)
  stone: (S) => stoneScene(S, 0), ashlar: (S) => stoneScene(S, 1),
  basket: (S) => basketScene(S), spin: (S) => spinScene(S), oven: (S) => ovenScene(S), knead: (S) => kneadScene(S),
  hoops: (S) => hoopsScene(S), quench: (S) => quenchScene(S), dove: (S) => doveScene(S, 0), net: (S) => doveScene(S, 1),
  lift: (S) => liftScene(S), mound: (S) => moundScene(S), anvil: (S) => anvilScene(S), sole: (S) => soleScene(S),
};
const STAGE = {
  chop: { bg: '#9cc6ea', hemi: ['#f4f8ff', '#6a7a4a', 1.1], sun: { intensity: 2.4, pos: [3, 6, 4], extent: 2 } },
  out: { bg: '#9cc6ea', hemi: ['#f4f8ff', '#6a7a4a', 1.1], sun: { intensity: 2.4, pos: [3, 6, 4], extent: 2.5 } },
  shop: { bg: '#3a2c22', hemi: ['#fff2dc', '#5a4632', 0.95], sun: { color: '#fff0d6', intensity: 2.0, pos: [1.5, 4, 2.5], extent: 1.5 } },
  fire: { bg: '#1e1612', env: 0.25, hemi: ['#ffd8b0', '#3a2a20', 0.6], sun: { color: '#ffe6c8', intensity: 1.2, pos: [2, 4, 3], extent: 1.5 } },
};
const STAGE_OF = { chop: 'chop', chop2: 'chop', dove: 'out', net: 'out', lift: 'out', mound: 'out', oven: 'fire', anvil: 'fire', quench: 'fire' };

function chopScene(S, side) {
  outdoors(S, { ground: 'soil', groundColor: '#c8b494', hills: '#6f8f4f' });
  // el tronco tumbado sobre dos cuñas, en un corro de serrín con astillas de otras apuestas
  const L = 1.4, R = 0.2, Y = R + 0.03, geo = new THREE.CylinderGeometry(R, R, L, 64, 84, false); geo.rotateZ(Math.PI / 2);
  uvScale(geo, 3, 2);
  const P = geo.attributes.position, base = new Float32Array(P.array), cw = new THREE.BufferAttribute(new Float32Array(P.count), 1); geo.setAttribute('cutw', cw);
  const log = S.mesh(geo, cutMat(S, texMat(S, 'bark', '#b0947a')), 0, Y, 0);
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d'), gr = sg.createRadialGradient(64, 64, 20, 64, 64, 64);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.75, '#ccc'); gr.addColorStop(1, '#000'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const sawA = S.own(new THREE.CanvasTexture(sc));
  const saw = S.mesh(uvScale(new THREE.CircleGeometry(1.2, 48), 1, 1).rotateX(-Math.PI / 2), texMat(S, 'straw', '#f4e2b8', { roughness: 1, alphaMap: sawA, transparent: true, depthWrite: false }), 0, 0.003, 0); saw.scale.set(1.35, 1, 1); saw.castShadow = false;
  for (const x of [-0.5, 0.5]) for (const z of [-1, 1]) { const w = S.mesh(rbox(0.12, 0.06, 0.07, 0.012), texMat(S, 'wood', '#9a7a58'), x, 0.03, z * (R * 0.8)); w.rotation.y = z * 0.1; }
  { const n = 46, cg = S.own(rbox(0.05, 0.008, 0.026, 0.003, 1)), im = new THREE.InstancedMesh(cg, S.mat('#ead2a4', { roughness: 0.9 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 0.35 + Math.random() * 1.0; e.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4); m4.compose(V(Math.cos(a) * r * 1.3, 0.006, Math.sin(a) * r), q.setFromEuler(e), V(1, 1, 1).multiplyScalar(0.7 + Math.random() * 0.8)); im.setMatrixAt(i, m4); }
    im.receiveShadow = true; S.add(im); }
  // los anillos de la testa
  const ringsC = document.createElement('canvas'); ringsC.width = ringsC.height = 256; const rg = ringsC.getContext('2d');
  rg.fillStyle = '#e2c290'; rg.fillRect(0, 0, 256, 256); rg.strokeStyle = 'rgba(150,100,50,0.5)'; for (let k = 6; k < 128; k += 7 + Math.random() * 4) { rg.lineWidth = 1 + Math.random() * 2; rg.beginPath(); rg.arc(128 + Math.random() * 3, 128, k, 0, 7); rg.stroke(); }
  const rt = S.own(new THREE.CanvasTexture(ringsC)); rt.colorSpace = THREE.SRGBColorSpace;
  const caps = [-1, 1].map(s => { const c = S.mesh(new THREE.CircleGeometry(R * 0.985, 48), S.mat('#ffffff', { map: rt, roughness: 0.85 }), s * (L / 2 + 0.001), Y, 0); c.rotation.y = s * Math.PI / 2; return c; });
  // la muesca en V se abre en la cara de delante (primer lado) y en la de atrás (segundo lado), como en las apuestas:
  // el aizkolari, de pie sobre el tronco, corta entre sus pies hasta la mitad, se da la vuelta y corta por el otro lado
  const carve = (d1, d2, apart) => {
    for (let i = 0; i < P.count; i++) {
      let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], w = 0;
      const zF = R - d1 * 2 * R + Math.abs(x) * 1.15, zB = -R + d2 * 2 * R - Math.abs(x) * 1.15;
      if (d1 > 0 && z > zF) { z = zF; w = 1; }
      if (d2 > 0 && z < zB) { z = zB; w = 1; }
      if (apart) { const s = Math.sign(x || 1); x += s * apart; y -= Math.abs(x) * apart * 0.4; }
      P.setXYZ(i, x, y, z); cw.setX(i, w);
    }
    P.needsUpdate = true; cw.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    caps.forEach((c, i) => { c.position.x = (i ? 1 : -1) * (L / 2 + 0.001 + apart); });
  };
  // el aizkolari, de pie sobre el tronco con los pies a los lados de la muesca; el hacha gira en sus manos y la hoja
  // muerde la muesca de lado
  const rig = new THREE.Group(); rig.rotation.y = side ? Math.PI : 0; S.add(rig);
  const piv = new THREE.Group(); rig.add(piv); const AX = axe(S); AX.position.y = 0.72; piv.add(AX);
  const UP = -0.95, L1 = 0.72, L2 = 0.17, RR = Math.hypot(L1, L2), BA = Math.atan2(L2, L1);
  const chips = particles(S, { geo: rbox(0.03, 0.006, 0.018, 0.002, 1), color: '#ead2a4', max: 120, gravity: -7, drag: 0.4, ground: 0.005 });
  const bark = particles(S, { geo: rbox(0.02, 0.006, 0.014, 0.002, 1), color: '#6a5444', max: 40, gravity: -7, drag: 0.4, ground: 0.005 });
  let W = null; const top = Y + R;
  const ready = worker(S, 'sanfermin', { height: 1.75 }).then(w => {
    W = w; if (!W) return;
    rig.add(W.obj); W.obj.position.set(0, top, -0.04); rig.updateMatrixWorld(true);
    W.plant([rig.localToWorld(V(0.21, top, -0.02)), rig.localToWorld(V(-0.21, top, -0.02))]);
  });
  let last = -1, shown = 0, prev = 9;
  const hi = V(0, 0, 0), lo = V(0, 0, 0), pl = V(0, 0, 0), dir = V(0, 0, 0), hl = V(0, 0, 0), hr = V(0, 0, 0), q = new THREE.Quaternion();
  return {
    ready, frame: { box: [[-0.75, 0, -0.5], [0.75, 1.95, 0.5]], dir: [0.42, 0.3, side ? -1 : 1] },
    set(p, hit, ok) {
      if (hit >= 0.14) shown = p;   // la muesca crece cuando el hacha llega
      const qd = shown, d1 = side ? 0.5 : qd * 0.5, d2 = side ? qd * 0.5 : 0, apart = side && qd >= 1 ? 0.06 : 0, key = Math.round(d1 * 400) + Math.round(d2 * 400) * 1000 + apart;
      if (key !== last) { carve(d1, d2, apart); last = key; }
      // dónde muerde el filo: el fondo de la muesca (o la corteza de al lado si el golpe va mal); las manos quedan
      // delante de la tripa, a la distancia justa del filo, y de ahí sale el ángulo del hacha
      const depth = side ? d2 : d1, ez = R - depth * 2 * R - 0.02 + (ok ? 0 : 0.1), ey = Y + 0.03, hz = 0.3;
      lo.set(ok ? 0 : 0.2, ey + Math.sqrt(Math.max(0.01, RR * RR - (hz - ez) ** 2)), hz);
      const TI = Math.atan2(ez - hz, ey - lo.y) - BA;
      hi.set(-0.42, top + 0.86, 0.02);   // arriba, junto al hombro derecho (la cabeza es grande)
      const th = swingAngle(hit, UP, TI, S.t), k = THREE.MathUtils.clamp((th - UP) / (TI - UP), 0, 1);
      // las manos bajan en arco por delante del cuerpo
      pl.lerpVectors(hi, lo, ease(k)); pl.z += Math.sin(k * Math.PI) * 0.15;
      // levantada, el hacha asoma por encima del hombro (inclinada hacia fuera); al bajar se endereza
      piv.rotation.set(th, 0, 0.75 * (1 - ease(k))); piv.position.copy(pl);
      if (W) {
        rig.updateMatrixWorld(true);
        dir.set(0, 1, 0).applyQuaternion(piv.getWorldQuaternion(q));
        rig.localToWorld(hl.copy(pl)); hr.copy(hl).addScaledVector(dir, 0.17);
        W.pose({ crouch: 0.03 + 0.1 * k, bend: -0.1 + 0.4 * k, twist: -0.3 * (1 - k), nod: 0.2 * k, hands: [hl, hr] });
        // el hacha sigue a la mano de abajo donde de verdad ha llegado
        W.handAt(0, hl); piv.position.copy(rig.worldToLocal(hl));
      }
      if (prev < 0.14 && hit >= 0.14) {
        const at = V(ok ? 0 : 0.2, ey, ez + 0.04); if (side) at.z = -at.z;
        (ok ? chips : bark).emit([at.x, at.y, at.z], ok ? 12 : 6, { speed: 2, spread: 1.4, dir: [0, 0.9, side ? -1 : 1], life: 1.6 });
      }
      prev = hit;
    },
  };
}

function stoneScene(S, stage) {
  outdoors(S, { ground: 'rock', groundColor: '#d8ccb4', hills: '#8a9a6a' });
  const rockM = texMat(S, 'rock', '#ffffff', { roughness: 0.95 });
  // el banco del cantero: dos troncos atravesados; al lado, sillares ya labrados y bloques sin desbastar
  for (const z of [-0.12, 0.12]) { const l = S.mesh(uvScale(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 20), 2, 1), texMat(S, 'bark', '#b0947a'), 0, 0.1, z); l.rotation.z = Math.PI / 2; }
  for (const [x, y, z, r] of [[0.75, 0.15, -0.35, 0.2], [0.75, 0.45, -0.32, -0.1], [-0.85, 0.15, -0.5, 0.4]]) S.mesh(uvScale(rbox(0.5, 0.3, 0.34, 0.01), 1, 0.6), rockM, x, y, z).rotation.y = r;
  for (const [x, z, sc] of [[-0.9, 0.35, 0.22], [1.0, 0.4, 0.16], [-1.3, -0.2, 0.3]]) S.mesh(lumpy(new THREE.IcosahedronGeometry(sc, 3), 0.25, 5, x * 7), rockM, x, sc * 0.5, z).scale.y = 0.6;
  // el bloque: de piedra bruta (esquinas saltadas en planos, bultos) a sillar de aristas vivas
  const BX = 0.25, BY = 0.15, BZ = 0.17, B0 = 0.2 + BY;
  const geo = new THREE.BoxGeometry(BX * 2, BY * 2, BZ * 2, 26, 16, 18), P = geo.attributes.position, base = new Float32Array(P.array);
  uvScale(geo, 0.6, 0.4);
  const cw = new THREE.BufferAttribute(new Float32Array(P.count), 1); geo.setAttribute('cutw', cw);
  const stoneM = cutMat(S, rockM, '#f2ead8');
  const block = S.mesh(geo, stoneM, 0, B0, 0);
  const rnd = ((sd) => () => ((sd = (sd * 16807) % 2147483647) / 2147483647))(stage ? 11 : 7);
  const waves = Array.from({ length: 7 }, () => ({ d: V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), f: 14 + rnd() * 16, ph: rnd() * 6, a: 0.4 + rnd() * 0.6 }));
  // planos que cortan esquinas y aristas (lo que salta con el pico): hacia cada esquina, con su hondura
  const cuts = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const n = V(sx * (0.6 + rnd()), sy * (0.6 + rnd()), sz * (0.6 + rnd())).normalize(); cuts.push({ n, o: n.x * sx * BX + n.y * sy * BY + n.z * sz * BZ, d: 0.07 + rnd() * 0.08 }); }
  // y las aristas (planos a lo largo de cada una)
  for (const [a, b] of [['x', 'y'], ['x', 'z'], ['y', 'z']]) for (const sa of [-1, 1]) for (const sb of [-1, 1]) { const n = V(0, 0, 0); n[a] = sa * (0.7 + rnd() * 0.6); n[b] = sb * (0.7 + rnd() * 0.6); n.normalize(); const hx = { x: BX, y: BY, z: BZ }; cuts.push({ n, o: Math.abs(n[a]) * hx[a] + Math.abs(n[b]) * hx[b], d: 0.025 + rnd() * 0.05 }); }
  const v = V(0, 0, 0);
  const shape = (rough, dressed) => {
    for (let i = 0; i < P.count; i++) {
      v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
      for (const c of cuts) { const e = v.dot(c.n) - (c.o - c.d * rough); if (e > 0) v.addScaledVector(c.n, -e); }
      let n = 0; for (const w of waves) n += w.a * Math.sin(v.dot(w.d) * w.f + w.ph);
      const k = 1 + n * 0.05 * rough; v.x *= k; v.y *= k; v.z *= k;
      P.setXYZ(i, v.x, v.y, v.z);
      // la cara labrada (talla): se aclara de izquierda a derecha según se avanza
      cw.setX(i, stage && base[i * 3 + 1] > BY - 1e-4 && base[i * 3] < -BX + dressed * BX * 2 ? 1 : 0);
    }
    P.needsUpdate = true; cw.needsUpdate = true; geo.computeVertexNormals();
  };
  // las herramientas: pico de cantero (desbaste) o puntero y maceta (talla)
  const steel = S.mat('#7a8088', { metalness: 0.8, roughness: 0.35 }), wood = S.mat('#a87848', { roughness: 0.6 });
  const piv = new THREE.Group(), chisel = new THREE.Group(), mallet = new THREE.Group(); S.add(piv);
  if (stage === 0) {
    S.mesh(lathe([[0.001, 0], [0.014, 0], [0.012, 0.2], [0.015, 0.33], [0.001, 0.34]], 10), wood, 0, -0.02, 0, piv);
    for (const s of [-1, 1]) S.mesh(new THREE.ConeGeometry(0.016, 0.13, 10).rotateX(s * Math.PI / 2).translate(0, 0.34, s * 0.065), steel, 0, 0, 0, piv);
    S.mesh(rbox(0.035, 0.04, 0.04, 0.008), steel, 0, 0.34, 0, piv);
  } else {
    S.add(chisel); S.mesh(lathe([[0.001, 0], [0.004, 0.004], [0.007, 0.03], [0.007, 0.14], [0.01, 0.15], [0.009, 0.16], [0.001, 0.162]], 10), steel, 0, 0, 0, chisel);
    piv.add(mallet); S.mesh(lathe([[0.001, 0], [0.013, 0], [0.012, 0.18], [0.001, 0.19]], 10), wood, 0, -0.01, 0, mallet);
    S.mesh(rbox(0.06, 0.06, 0.1, 0.012), S.mat('#6a6e74', { metalness: 0.7, roughness: 0.4 }), 0, 0.2, 0, mallet);
  }
  const square = new THREE.Group(); S.add(square); square.visible = false;
  S.mesh(rbox(0.28, 0.004, 0.025, 0.002), S.mat('#c0c6cc', { metalness: 0.8, roughness: 0.3 }), 0.14, 0, 0.0125, square); S.mesh(rbox(0.025, 0.004, 0.2, 0.002), S.mat('#c0c6cc', { metalness: 0.8, roughness: 0.3 }), 0.0125, 0, 0.1, square);
  square.position.set(-0.22, B0 + BY + 0.004, -0.14);
  const chips = particles(S, { geo: lumpy(new THREE.IcosahedronGeometry(0.01, 0), 0.3, 50), color: '#e8dcc4', max: 120, gravity: -7, drag: 0.4, ground: 0.005 });
  const dust = puffs(S, { color: '#efe8da', max: 20, rise: 0.25 });
  // el cantero, detrás del bloque
  let W = null; const WZ = -0.52;
  const ready = worker(S, 'pastor', { height: 1.72 }).then(w => { W = w; if (W) W.obj.position.set(0, 0, WZ); });
  let last = -1, prev = 9, tx = 0;
  const E = V(0, 0, 0), H = V(0, 0, 0), hi = V(0, 0, 0), dir = V(0, 0, 0), q = new THREE.Quaternion(), hr = V(0, 0, 0), ct = V(0, 0, 0), ax = V(0, 0, 0);
  const L1 = 0.34, L2 = 0.13, BA = Math.atan2(L2, L1), TI = Math.PI / 2 + 0.3, UP = -0.8;
  return {
    ready, frame: { box: [[-0.55, 0, -0.75], [0.4, 1.45, 0.3]], dir: [-0.85, 0.5, 0.8] },
    set(p, hit, ok) {
      const shown = hit >= 0.14 ? p : this._p ?? 0; this._p = shown;
      const rough = stage === 0 ? 1 - shown : 0, key = Math.round(rough * 60) * 100 + Math.round(shown * 60);
      if (key !== last) { shape(rough, shown); last = key; }
      if (prev >= 0.14 && hit < 0.14) tx = ok ? (Math.random() - 0.5) * 0.24 : 0.3;   // dónde va este golpe
      const top = B0 + BY * (stage === 0 ? 1 + 0.035 * rough : 1);
      if (stage === 0) {
        // el pico cae en arco desde encima del hombro y muerde el borde de arriba
        E.set(tx, top - 0.01, BZ * 0.4);
        const th = swingAngle(hit, UP, TI, S.t), k = THREE.MathUtils.clamp((th - UP) / (TI - UP), 0, 1);
        H.set(E.x, E.y - (L1 * Math.cos(TI) - L2 * Math.sin(TI)), E.z - (L1 * Math.sin(TI) + L2 * Math.cos(TI)));
        hi.set(-0.36, 0.95, WZ + 0.06); const pl = hi.clone().lerp(H, ease(k)); pl.z += Math.sin(k * Math.PI) * 0.12;
        piv.position.copy(pl); piv.rotation.set(th, 0, 0.7 * (1 - ease(k)));
        if (W) {
          piv.updateMatrixWorld(true); dir.set(0, 1, 0).applyQuaternion(piv.getWorldQuaternion(q));
          hr.copy(pl).addScaledVector(dir, 0.12);
          W.pose({ crouch: 0.05 + 0.08 * k, bend: 0.1 + 0.3 * k, twist: -0.3 * (1 - k), nod: 0.12, hands: [pl, hr] });
          W.handAt(0, pl); piv.position.copy(pl);
        }
        if (prev < 0.14 && hit >= 0.14) { chips.emit([E.x, E.y, E.z + 0.05], ok ? 14 : 5, { speed: 1.6, spread: 1.8, dir: [0, 1, 0.8], life: 1.4 }); if (ok) dust.emit([E.x, E.y, E.z + 0.05], 2, { size: 0.08, life: 1, spread: 0.1 }); }
      } else {
        // el puntero apoyado en la cara de arriba (inclinado hacia el cantero) y la maceta que le pega en la cabeza
        const cx = -BX + 0.04 + Math.min(1, shown + 0.04) * (BX * 2 - 0.08);
        ax.set(0.15, 1, -0.4).normalize(); chisel.position.set(cx, top - 0.004, 0.02); chisel.quaternion.setFromUnitVectors(V(0, 1, 0), ax);
        ct.copy(chisel.position).addScaledVector(ax, 0.162);
        const th = swingAngle(hit, -0.3, Math.PI / 2, S.t), k = THREE.MathUtils.clamp((th + 0.3) / (Math.PI / 2 + 0.3), 0, 1);
        // la maceta: mango hacia delante desde la mano derecha; al golpear, la cara de abajo cae sobre el puntero
        const yaw = 0.55; dir.set(Math.sin(yaw), 0, Math.cos(yaw));
        H.copy(ct).addScaledVector(dir, -0.2); H.y += 0.035 + (1 - k) * 0.08;
        piv.position.copy(H); piv.rotation.set(th, yaw, 0, 'YXZ');
        if (W) {
          const lh = chisel.position.clone().addScaledVector(ax, 0.1);
          W.pose({ crouch: 0.12, bend: 0.38, nod: 0.12, hands: [lh, H.clone()] });
          W.handAt(1, H); piv.position.copy(H);
        }
        if (prev < 0.14 && hit >= 0.14) { const at = chisel.position; chips.emit([at.x, at.y, at.z + 0.02], ok ? 10 : 3, { speed: 1.2, spread: 1.6, dir: [0, 1, 0.6], life: 1.2 }); if (ok) dust.emit([at.x, at.y, at.z], 1, { size: 0.06, life: 0.9, spread: 0.05 }); }
      }
      prev = hit; square.visible = stage === 1 && shown >= 1; chisel.visible = !square.visible;
    },
  };
}

function basketScene(S) {
  workshop(S, { bench: false });
  // el cestero, de pie ante un pie torneado con la cesta encima: la mano izquierda sujeta el borde y la derecha mete la
  // tira de mimbre por delante y por detrás de las varas; cada golpe bueno es una vuelta más
  const g = new THREE.Group(); g.position.set(0, 0, -1.6); S.add(g);
  const SY = 0.3, wood = texMat(S, 'wood', '#9a7a58');
  S.mesh(lathe([[0.001, 0], [0.2, 0], [0.19, 0.03], [0.06, 0.06], [0.045, 0.15], [0.055, 0.26], [0.22, 0.28], [0.23, SY], [0.001, SY]], 32), wood, 0, 0, 0, g);
  const bg = new THREE.Group(); bg.position.y = SY; g.add(bg);
  const N = 16, R0 = 0.14, R1 = 0.2, H = 0.26, rad = (y) => R0 + (R1 - R0) * (y / H);
  S.mesh(new THREE.CylinderGeometry(R0, R0, 0.02, 40), texMat(S, 'braid', '#c8a066'), 0, 0.01, 0, bg);
  const stakeM = S.mat('#caa070', { roughness: 0.7 });
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; S.mesh(tube([[Math.cos(a) * R0, 0.01, Math.sin(a) * R0], [Math.cos(a) * rad(H * 0.6), H * 0.6, Math.sin(a) * rad(H * 0.6)], [Math.cos(a) * (R1 + 0.012), H + 0.07, Math.sin(a) * (R1 + 0.012)]], 0.004, 12, 6), stakeM, 0, 0, 0, bg); }
  const ROWS = 20, rows = [], wM = [S.mat('#d8b07a', { roughness: 0.6 }), S.mat('#b98a52', { roughness: 0.65 })];
  for (let r = 0; r < ROWS; r++) {
    const y = 0.025 + r * (H - 0.03) / ROWS, pts = [];
    for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2, rr = rad(y) + 0.005 * Math.sin(a * N / 2 + r * Math.PI); pts.push([Math.cos(a) * rr, y + Math.sin(a * 3) * 0.001, Math.sin(a) * rr]); }
    const m = S.mesh(tube(pts, 0.0058, 160, 6, true), wM[r % 2], 0, 0, 0, bg); m.visible = false; rows.push(m);
  }
  const rim = S.mesh(new THREE.TorusGeometry(R1 + 0.005, 0.012, 10, 64), S.mat('#a87a44', { roughness: 0.6 }), 0, H + 0.01, 0, bg); rim.rotation.x = Math.PI / 2; rim.visible = false;
  // un haz de tiras en remojo, al lado
  for (let i = 0; i < 9; i++) { const a = i * 0.7; S.mesh(tube([[0.42 + Math.cos(a) * 0.02, 0.0, 0.12 + Math.sin(a) * 0.02], [0.45 + Math.cos(a) * 0.03, 0.25, 0.1], [0.55 + Math.cos(a) * 0.08, 0.55, 0.06 + Math.sin(a) * 0.05]], 0.0045, 14, 5), wM[i % 2], 0, 0, 0, g); }
  let loose = null; S.own({ dispose: () => loose?.geometry.dispose() });
  let W = null;
  const ready = worker(S, 'pastor', { height: 1.7 }).then(w => { W = w; if (W) { g.add(W.obj); W.obj.position.set(0, 0, -0.44); } });
  const lh = V(0, 0, 0), rh = V(0, 0, 0), from = V(0, 0, 0); let lastKey = '';
  return {
    ready, frame: { box: [[-0.32, 0, -2.08], [0.6, 1.35, -1.35]], dir: [0.3, 0.45, 1] },
    set(p, hit) {
      const n = Math.round(p * ROWS); rows.forEach((m, i) => { m.visible = i < n; }); rim.visible = p >= 1;
      // la mano derecha tira de la tira hacia fuera tras cada pasada; la izquierda sujeta el borde
      const y = SY + 0.025 + Math.min(n, ROWS - 1) * (H - 0.03) / ROWS, pull = hit < 0.4 ? Math.sin(hit / 0.4 * Math.PI) : 0, a0 = 0.35;
      from.set(Math.cos(a0) * rad(y - SY), y, Math.sin(a0) * rad(y - SY));
      rh.set(from.x + 0.05 + pull * 0.1, y + 0.04 + pull * 0.05, from.z + 0.06 + pull * 0.05);
      lh.set(-R1 - 0.01, SY + H * 0.9, -0.03);
      if (W) { W.pose({ crouch: 0.06, bend: 0.35, nod: 0.15, hands: [g.localToWorld(lh.clone()), g.localToWorld(rh.clone())] }); W.handAt(1, rh); g.worldToLocal(rh); }
      const key = n + ':' + Math.round(pull * 20);
      if (key !== lastKey && p < 1) { lastKey = key; if (loose) { g.remove(loose); loose.geometry.dispose(); }
        loose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from.clone(), from.clone().lerp(rh, 0.5).add(V(0, 0.02, 0)), rh.clone(), rh.clone().add(V(0.12, -0.08, 0.06)), rh.clone().add(V(0.2, -0.3, 0.1))]), 30, 0.0055, 6), wM[0]); g.add(loose); }
      if (loose) loose.visible = p < 1;
      bg.rotation.y = -n * 0.25;
    },
  };
}

function spinScene(S) {
  workshop(S, { bench: false });
  // junto al fuego de la cocina: la hilandera sentada en una silla baja, con la rueca sujeta a la cintura (la lana
  // arriba), saca las fibras con la izquierda y la derecha hace girar el huso que cuelga del hilo
  const g = new THREE.Group(); g.position.set(0, 0, -1.6); S.add(g);
  const st = stool(S); st.scale.setScalar(0.55); st.position.set(0, 0, -0.06); g.add(st);
  { const hearth = new THREE.Group(); hearth.position.set(-1.1, 0, -0.75); g.add(hearth);
    S.mesh(uvScale(rbox(0.9, 0.18, 0.7, 0.03), 1.5, 1), texMat(S, 'stone', '#c8bca4'), 0, 0.09, 0, hearth);
    const fire = S.mat('#3a2418', { emissive: '#ff6a18', emissiveIntensity: 1.4, roughness: 1 });
    for (let i = 0; i < 3; i++) { const l = S.mesh(uvScale(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), 1, 1), texMat(S, 'bark', '#9a8070'), -0.05 + i * 0.05, 0.22, 0, hearth); l.rotation.set(0, i * 1.1, Math.PI / 2); }
    S.mesh(lumpy(new THREE.IcosahedronGeometry(0.16, 2), 0.3, 6), fire, 0, 0.22, 0, hearth).scale.y = 0.4;
    const glow = new THREE.PointLight('#ff8a3a', 2.2, 3, 1.5); glow.position.set(0, 0.5, 0.1); hearth.add(glow); hearth.userData.glow = glow; g.userData.hearth = hearth; }
  // la rueca: vara torneada con la copa de lana arriba
  const D0 = V(0.14, 0.2, 0.1), D1 = V(0.56, 1.18, 0.28), dAx = D1.clone().sub(D0), dLen = dAx.length(); dAx.normalize();
  const distaff = new THREE.Group(); distaff.position.copy(D0); distaff.quaternion.setFromUnitVectors(V(0, 1, 0), dAx); g.add(distaff);
  S.mesh(lathe([[0.001, 0], [0.012, 0], [0.01, dLen * 0.6], [0.013, dLen * 0.62], [0.009, dLen], [0.001, dLen + 0.01]], 12), S.mat('#9a6a3a', { roughness: 0.55 }), 0, 0, 0, distaff);
  const woolM = texMat(S, 'leaves', '#f8f2e6', { roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) });
  const wool = S.mesh(lumpy(new THREE.IcosahedronGeometry(0.1, 4), 0.18, 9, 3), S.mat('#f4eee2', { roughness: 1 }), 0, dLen * 0.82, 0, distaff); wool.scale.set(1, 1.7, 1);
  S.mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 24), S.mat('#c8202a', { roughness: 0.7 }), 0, dLen * 0.7, 0, distaff).rotation.x = Math.PI / 2;   // la cinta que la ata
  // el huso: vara fina con la tortera abajo y el ovillo de hilo que crece
  const spindle = new THREE.Group(); g.add(spindle); spindle.scale.setScalar(1.45);
  S.mesh(lathe([[0.001, -0.2], [0.004, -0.19], [0.007, -0.08], [0.006, 0.0], [0.002, 0.03], [0.001, 0.03]], 10), S.mat('#c89a5a', { roughness: 0.5 }), 0, 0, 0, spindle);
  S.mesh(lathe([[0.001, -0.18], [0.026, -0.175], [0.03, -0.165], [0.012, -0.155], [0.001, -0.152]], 22), texMat(S, 'wood', '#8a6a48'), 0, 0, 0, spindle);
  const cop = S.mesh(lathe([[0.006, -0.15], [0.016, -0.12], [0.02, -0.08], [0.014, -0.04], [0.006, -0.02]], 20), S.mat('#f4ecd8', { roughness: 0.9 }), 0, 0, 0, spindle);
  const tm = S.mat('#efe6d2', { roughness: 0.9 }), thread = new THREE.Mesh(new THREE.BufferGeometry(), tm); g.add(thread); S.own({ dispose: () => thread.geometry.dispose() });
  let threadKey = '';
  let W = null;
  const ready = worker(S, 'sanfermin', { height: 1.6 }).then(w => {
    W = w; if (!W) return; g.add(W.obj); g.updateMatrixWorld(true);
    W.plant([g.localToWorld(V(0.1, 0, 0.2)), g.localToWorld(V(-0.1, 0, 0.2))]);
  });
  let a = 0; const lh = V(0, 0, 0), rh = V(0, 0, 0), wb = V(0, 0, 0), top = V(0, 0, 0);
  return {
    ready, frame: { box: [[-0.5, 0, -1.75], [0.68, 1.42, -1.25]], dir: [0.12, 0.22, 1] },
    set(p, hit, ok, dt) {
      a += dt * (5 + (hit < 0.6 && ok ? 22 * (1 - hit / 0.6) : 0)); spindle.rotation.y = a;
      cop.scale.set(0.5 + p * 1.0, 0.5 + p * 0.6, 0.5 + p * 1.0); wool.scale.set(1 - p * 0.45, 1.7 * (1 - p * 0.35), 1 - p * 0.45);
      // las manos: la izquierda estira las fibras bajo la lana; la derecha sujeta el hilo encima del huso (y lo hace girar)
      const tw = hit < 0.3 ? Math.sin(hit / 0.3 * Math.PI) : 0;
      wb.copy(D0).addScaledVector(dAx, dLen * (0.68 - p * 0.05));
      lh.set(wb.x - 0.08, wb.y - 0.12 - Math.sin(S.t * 2) * 0.01, wb.z + 0.06);
      rh.set(-0.3 - tw * 0.04, 0.5 + tw * 0.04, 0.2);
      if (W) { W.pose({ crouch: 0.06, bend: 0.12, nod: 0.12, twist: 0.05, hands: [g.localToWorld(lh.clone()), g.localToWorld(rh.clone())] }); W.handAt(0, lh); g.worldToLocal(lh); W.handAt(1, rh); g.worldToLocal(rh); }
      spindle.position.set(rh.x, rh.y - 0.07, rh.z); spindle.rotation.z = Math.sin(S.t * 1.3) * 0.05;
      top.set(rh.x, rh.y - 0.03, rh.z);
      // el hilo se rehace solo cuando las manos se han movido algo (no en cada fotograma)
      const key = [wb, lh, top].map(v => `${Math.round(v.x * 300)},${Math.round(v.y * 300)},${Math.round(v.z * 300)}`).join('|');
      if (key !== threadKey) { threadKey = key; thread.geometry.dispose(); thread.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([wb.clone(), lh.clone(), lh.clone().lerp(top, 0.5).add(V(0, -0.03, 0)), top.clone()]), 24, 0.0028, 5); }
      const H = g.userData.hearth?.userData.glow; if (H) H.intensity = 2 + Math.sin(S.t * 9) * 0.3 + Math.sin(S.t * 13) * 0.2;
    },
  };
}

function ovenScene(S) {
  workshop(S, { bench: false, wall: 'brick' });
  const g = new THREE.Group(); g.position.set(0, 0, -2.1); S.add(g);
  // el horno: base de piedra, cúpula de ladrillo (torno) con la boca en arco y el fuego dentro
  S.mesh(uvScale(rbox(1.7, 0.75, 1.5, 0.03), 2, 1), texMat(S, 'stone', '#c8bca4'), 0, 0.375, 0, g);
  // la cúpula entera, con la boca recortada delante (los triángulos que caen dentro del arco)
  const dg0 = uvScale(new THREE.SphereGeometry(0.72, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), 4, 2).toNonIndexed(), A = dg0.attributes, keep = [];
  for (let t = 0; t < A.position.count; t += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { x += A.position.getX(t + k) / 3; y += A.position.getY(t + k) / 3; z += A.position.getZ(t + k) / 3; }
    if (!(z > 0.25 && Math.abs(x) < 0.31 && (y < 0.2 || x * x + (y - 0.2) ** 2 < 0.31 * 0.31))) keep.push(t); }
  const domeG = new THREE.BufferGeometry(); for (const [name, at] of Object.entries(A)) { const a = new Float32Array(keep.length * 3 * at.itemSize); keep.forEach((t, j) => { for (let k = 0; k < 3 * at.itemSize; k++) a[j * 3 * at.itemSize + k] = at.array[t * at.itemSize + k]; }); domeG.setAttribute(name, new THREE.BufferAttribute(a, at.itemSize)); }
  dg0.dispose();
  const dome = S.mesh(domeG, texMat(S, 'brick', '#e8d0b8', { side: THREE.DoubleSide }), 0, 0.75, 0, g);
  const arch = new THREE.Shape(); arch.moveTo(-0.3, 0); arch.lineTo(-0.3, 0.2); arch.absarc(0, 0.2, 0.3, Math.PI, 0, true); arch.lineTo(0.3, 0); arch.lineTo(0.36, 0); arch.lineTo(0.36, 0.2); arch.absarc(0, 0.2, 0.36, 0, Math.PI, false); arch.lineTo(-0.36, 0); arch.closePath();
  S.mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.12, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 20 }), texMat(S, 'stone', '#d8ccb4'), 0, 0.75, 0.62, g);
  S.mesh(new THREE.CircleGeometry(0.71, 40).rotateX(-Math.PI / 2), S.mat('#2a1c14', { roughness: 1 }), 0, 0.752, 0, g);
  const embers = S.mat('#3a2418', { emissive: '#ff5a10', emissiveIntensity: 1.2, roughness: 1 });
  const em = new THREE.InstancedMesh(S.own(lumpy(new THREE.IcosahedronGeometry(0.04, 1), 0.3, 40)), embers, 30), M4 = new THREE.Matrix4();
  for (let i = 0; i < 30; i++) em.setMatrixAt(i, M4.makeTranslation((Math.random() - 0.5) * 0.7, 0.77, -0.45 + Math.random() * 0.2)); g.add(em);
  const glow = new THREE.PointLight('#ff7a2a', 4, 3, 1.4); glow.position.set(0, 1.0, 0); g.add(glow);
  // los panes (hogazas con sus cortes en cruz) en fila dentro de la boca, y la panadera con la pala larga
  const loafG = new THREE.SphereGeometry(0.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); loafG.scale(1, 0.55, 1);
  const SLOTS = [[-0.22, 0.12], [0.0, 0.08], [0.22, 0.12], [0.0, 0.32]];
  const loaves = SLOTS.map(([x, z]) => { const l = new THREE.Group(); S.mesh(loafG.clone(), S.mat('#c8843a', { roughness: 0.75 }), 0, 0, 0, l); for (const r of [0, Math.PI / 2]) { const c = S.mesh(rbox(0.12, 0.008, 0.012, 0.003), S.mat('#f0d8a8'), 0, 0.053, 0, l); c.rotation.y = r; } l.position.set(x, 0.755, z); l.visible = false; g.add(l); return l; });
  // la pala: el mango sale de la hoja hacia +z (hacia las manos)
  const peel = new THREE.Group(); g.add(peel);
  S.mesh(lathe([[0.001, 0], [0.016, 0], [0.015, 1.3], [0.001, 1.31]], 10), S.mat('#a87848', { roughness: 0.6 }), 0, 0, 0.14, peel).rotation.x = Math.PI / 2;
  const blade = S.mesh(lathe([[0.001, 0], [0.13, 0], [0.135, 0.006], [0.001, 0.012]], 28), texMat(S, 'wood', '#b08a5a'), 0, 0, 0, peel); blade.scale.set(1, 1, 1.1);
  const carried = loaves[0].clone(); peel.add(carried); carried.position.set(0, 0.012, 0); carried.visible = true;
  let W = null; const BASE = V(0.55, 0, 1.75);
  const ready = worker(S, 'sanfermin', { height: 1.6 }).then(w => {
    W = w; if (!W) return; g.add(W.obj); W.obj.position.copy(BASE); W.obj.rotation.y = Math.atan2(-BASE.x, -(BASE.z - 0.3));
  });
  const bp = V(0, 0, 0), out = V(0, 0.8, 0.95), hd = V(0, 0, 0), h1 = V(0, 0, 0), h2 = V(0, 0, 0), fw = V(0, 0, 0);
  return {
    ready, frame: { box: [[-0.9, 0, -2.85], [0.85, 1.5, -0.3]], dir: [-0.85, 0.34, 1] },
    set(p, hit, ok, dt) {
      const n = Math.min(4, Math.floor(p * 4 + 1e-6)); loaves.forEach((l, i) => { l.visible = i < n; });
      // empuje: la hoja entra hasta el sitio del pan siguiente, lo deja y vuelve a la boca
      const k = hit < 0.25 ? ease(hit / 0.25) : hit < 0.7 ? 1 - ease((hit - 0.25) / 0.45) : 0, slot = SLOTS[Math.min(3, ok ? Math.max(0, n - 1) : n)];
      bp.lerpVectors(out, V(slot[0], 0.762, slot[1]), k);
      carried.visible = n < 4 && !(ok && hit < 0.7 && hit > 0.25);
      hd.subVectors(V(BASE.x - 0.05, 0.86, BASE.z - 0.42), bp).normalize();   // el mango apunta a las manos
      peel.position.copy(bp); peel.lookAt(g.localToWorld(bp.clone().add(hd))); 
      h1.copy(bp).addScaledVector(hd, 0.95); h2.copy(bp).addScaledVector(hd, 1.25);
      if (W) {
        // da un paso hacia el horno al empujar (los pies van con ella) y se inclina
        fw.set(-BASE.x, 0, -(BASE.z - 0.3)).normalize(); W.obj.position.copy(BASE).addScaledVector(fw, k * 0.3); W.planted = null;
        W.pose({ crouch: 0.03 + 0.05 * k, bend: 0.15 + 0.3 * k, nod: 0.1, hands: [g.localToWorld(h1.clone()), g.localToWorld(h2.clone())] });
      }
      embers.emissiveIntensity = 1.1 + Math.sin(S.t * 7) * 0.2; glow.intensity = 3.5 + Math.sin(S.t * 9) * 0.5;
    },
  };
}

function kneadScene(S) {
  workshop(S, { bench: false });
  const g = new THREE.Group(); g.position.set(0, 0, -1.6); S.add(g);
  // la artesa (a la altura de la panadera): cajón de madera de paredes inclinadas sobre sus patas
  const wood = texMat(S, 'wood', '#a0805a'), TY = 0.36;
  S.mesh(rbox(0.8, 0.04, 0.44, 0.01), wood, 0, TY, 0, g);
  for (const s of [-1, 1]) { const w = S.mesh(rbox(0.88, 0.16, 0.035, 0.01), wood, 0, TY + 0.07, s * 0.24, g); w.rotation.x = s * 0.35; const e = S.mesh(rbox(0.035, 0.16, 0.52, 0.01), wood, s * 0.44, TY + 0.07, 0, g); e.rotation.z = -s * 0.35; }
  for (const [x, z] of [[-0.34, -0.17], [0.34, -0.17], [-0.34, 0.17], [0.34, 0.17]]) S.mesh(lathe([[0.001, 0], [0.026, 0], [0.022, TY * 0.5], [0.027, TY - 0.02], [0.001, TY]], 10), wood, x, 0, z, g);
  // la masa: grumosa al principio y lisa y redonda al final; se aplasta con las palmas al amasar
  const dg = new THREE.IcosahedronGeometry(0.15, 5), P = dg.attributes.position, base = new Float32Array(P.array), v = V(0, 0, 0);
  const dough = S.mesh(dg, S.mat('#f2e2c2', { roughness: 0.62 }), 0, TY + 0.06, 0.02, g);
  const flour = S.mesh(new THREE.CircleGeometry(0.26, 30).rotateX(-Math.PI / 2), S.mat('#faf6ee', { roughness: 1, transparent: true, opacity: 0.7 }), 0, TY + 0.022, 0, g); flour.scale.set(1.25, 1, 0.65); flour.castShadow = false;
  S.mesh(lathe([[0.001, 0], [0.06, 0], [0.07, 0.04], [0.065, 0.1], [0.04, 0.12], [0.001, 0.12]], 20), S.mat('#c8b49a', { roughness: 0.8 }), 0.55, 0, 0.1, g);   // el saco de harina
  const dust = puffs(S, { color: '#ffffff', max: 24, rise: 0.3 });
  let W = null;
  const ready = worker(S, 'sanfermin', { height: 1.6 }).then(w => { W = w; if (W) { g.add(W.obj); W.obj.position.set(0, 0, -0.42); } });
  let last = -1, prev = 9; const L = V(0, 0, 0), R = V(0, 0, 0);
  return {
    ready, frame: { box: [[-0.5, 0, -2.1], [0.66, 1.3, -1.3]], dir: [0.85, 0.5, 0.75] },
    set(p, hit) {
      const key = Math.round(p * 40); if (key !== last) { last = key; const rough = 1 - p;
        for (let i = 0; i < P.count; i++) { v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]); const n = Math.sin(v.x * 50 + 1) * Math.sin(v.y * 47 + 2) * Math.sin(v.z * 53 + 3) + 0.6 * Math.sin(v.x * 110) * Math.sin(v.z * 97); v.multiplyScalar(1 + n * 0.12 * rough); P.setXYZ(i, v.x, v.y, v.z); }
        P.needsUpdate = true; dg.computeVertexNormals(); }
      // empuje con el talón de las manos: la masa se aplasta y se estira hacia delante
      const sq = hit < 0.12 ? hit / 0.12 : hit < 0.35 ? 1 - (hit - 0.12) / 0.23 : 0;
      dough.scale.set(1.25 + sq * 0.15, 0.6 - sq * 0.14 + p * 0.12, 1 + sq * 0.18);
      const topY = TY + 0.06 + 0.15 * (0.6 - sq * 0.14 + p * 0.12);
      L.set(0.07, topY + 0.01, -0.03 + sq * 0.05); R.set(-0.07, topY + 0.01, -0.03 + sq * 0.05);
      if (W) W.pose({ crouch: 0.03 + sq * 0.03, bend: 0.3 + sq * 0.15, nod: 0.15, hands: [g.localToWorld(L.clone()), g.localToWorld(R.clone())] });
      if (prev >= 0.02 && hit < 0.02) dust.emit([g.position.x, TY + 0.15, g.position.z], 2, { size: 0.05, life: 1, spread: 0.15 });
      prev = hit;
    },
  };
}

function hoopsScene(S) {
  workshop(S, { bench: false });
  const g = new THREE.Group(); g.position.set(0, 0, -1.5); S.add(g);
  // la barrica de duelas de roble (torno con panza, duelas en la textura); el tonelero, al lado, sujeta la tajadera
  // sobre el aro de arriba y le da con el martillo para que baje y apriete
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 64; const x2 = sc.getContext('2d');
  for (let i = 0; i < 24; i++) { const v = 0.85 + Math.random() * 0.3; x2.fillStyle = `rgb(${150 * v | 0},${100 * v | 0},${60 * v | 0})`; x2.fillRect(i * 512 / 24, 0, 512 / 24, 64); x2.fillStyle = 'rgba(40,24,12,0.7)'; x2.fillRect(i * 512 / 24, 0, 2, 64); for (let k = 0; k < 6; k++) { x2.fillStyle = 'rgba(60,36,18,0.25)'; x2.fillRect(i * 512 / 24 + Math.random() * 18, 0, 1, 64); } }
  const stx = S.own(new THREE.CanvasTexture(sc)); stx.colorSpace = THREE.SRGBColorSpace; stx.wrapS = THREE.RepeatWrapping;
  const H = 0.58, R0 = 0.19, BU = 0.045, prof = []; for (let i = 0; i <= 20; i++) { const t = i / 20; prof.push([R0 + BU * Math.sin(t * Math.PI), t * H]); }
  S.mesh(lathe(prof, 48), S.mat('#ffffff', { map: stx, roughness: 0.7 }), 0, 0, 0, g);
  S.mesh(new THREE.CircleGeometry(R0 - 0.005, 40).rotateX(-Math.PI / 2), texMat(S, 'wood', '#9a6a40'), 0, H - 0.015, 0, g);
  const hoopM = S.mat('#3c3f44', { metalness: 0.7, roughness: 0.45 });
  const radAt = (y) => R0 + BU * Math.sin(y / H * Math.PI);
  const goal = [0.05, 0.15, H - 0.15, H - 0.05], hoops = goal.map(() => { const h = S.mesh(new THREE.TorusGeometry(1, 0.01, 8, 64), hoopM, 0, 0, 0, g); h.rotation.x = Math.PI / 2; return h; });
  const steel = S.mat('#7a8088', { metalness: 0.8, roughness: 0.35 });
  const drv = new THREE.Group(); g.add(drv); S.mesh(rbox(0.035, 0.12, 0.018, 0.005), steel, 0, 0.06, 0, drv); S.mesh(lathe([[0.001, 0.12], [0.012, 0.12], [0.011, 0.2], [0.001, 0.205]], 10), S.mat('#a87848'), 0, 0, 0, drv);
  const piv = new THREE.Group(); g.add(piv); const HM = hammer(S); HM.position.y = 0.33; piv.add(HM);
  const sparks = particles(S, { geo: new THREE.SphereGeometry(0.004, 4, 3), color: '#ffe38a', emissive: '#ffcc55', max: 40, gravity: -6 });
  let W = null; const WP = V(-0.36, 0, -0.38), F = V(-WP.x, 0, -WP.z).normalize(), RT = V(-F.z, 0, F.x);
  const ready = worker(S, 'pastor', { height: 1.7 }).then(w => { W = w; if (W) { g.add(W.obj); W.obj.position.copy(WP); W.obj.rotation.y = Math.atan2(F.x, F.z); } });
  let prev = 9; const top = V(0, 0, 0), dp = V(0, 0, 0), hh = V(0, 0, 0), d = V(0, 0, 0), Y = V(0, 1, 0);
  return {
    ready, frame: { box: [[-0.72, 0, -2.0], [0.3, 1.35, -1.25]], dir: [0.5, 0.45, 1] },
    set(p, hit, ok) {
      // los aros empiezan flojos (más arriba de la panza) y bajan a su sitio
      goal.forEach((gy, i) => { const start = i < 2 ? H * 0.42 : H * 0.62, y = start + (gy - start) * Math.min(1, p * (i < 2 ? 1 : 1.25)), r = radAt(y) + 0.008; hoops[i].position.y = y; hoops[i].scale.set(r, r, 1); });
      // la tajadera apoyada en el aro de arriba, del lado del tonelero, algo inclinada hacia él
      const ty = hoops[3].position.y, r = radAt(ty) + 0.012; dp.copy(F).multiplyScalar(-r).setY(ty);
      drv.position.copy(dp); drv.quaternion.setFromUnitVectors(Y, V(0, 1, 0).addScaledVector(F, -0.3).normalize());
      top.copy(dp).addScaledVector(F, -0.06).setY(ty + 0.19);
      const th = swingAngle(hit, -1.2, 0.0, S.t), k = THREE.MathUtils.clamp((th + 1.2) / 1.2, 0, 1);
      // el martillo en la mano derecha: la cabeza baja sobre el mango de la tajadera
      hh.copy(top).addScaledVector(RT, 0.28).addScaledVector(F, -0.06); hh.y += 0.03 + (1 - k) * 0.1;
      if (W) { W.pose({ crouch: 0.04, bend: 0.25, nod: 0.12, hands: [g.localToWorld(dp.clone().addScaledVector(F, -0.04).setY(ty + 0.15)), g.localToWorld(hh.clone())] }); W.handAt(1, hh); g.worldToLocal(hh); }
      d.subVectors(top, hh).setY(0).normalize(); hammerQ(d, (1 - k) * 1.2, piv.quaternion); piv.position.copy(hh);
      if (ok && prev < 0.14 && hit >= 0.14) sparks.emit([g.position.x + top.x, top.y, g.position.z + top.z], 8, { speed: 1.2, spread: 2 });
      prev = hit;
    },
  };
}

function quenchScene(S) {
  workshop(S, { bench: false, wall: 'brick' });
  const g = new THREE.Group(); g.position.set(0, 0, -1.5); S.add(g);
  // la pila de agua: madera con aros, agua que tiembla
  const wood = texMat(S, 'wood', '#8a6a48');
  for (const s of [-1, 1]) { S.mesh(rbox(1.0, 0.45, 0.05, 0.01), wood, 0, 0.45, s * 0.24, g); S.mesh(rbox(0.05, 0.45, 0.5, 0.01), wood, s * 0.5, 0.45, 0, g); }
  S.mesh(rbox(1.0, 0.04, 0.5, 0.01), wood, 0, 0.24, 0, g); for (const [x, z] of [[-0.42, -0.18], [0.42, -0.18], [-0.42, 0.18], [0.42, 0.18]]) S.mesh(rbox(0.06, 0.24, 0.06, 0.01), wood, x, 0.12, z, g);
  const waterG = new THREE.PlaneGeometry(0.95, 0.45, 40, 20).rotateX(-Math.PI / 2), WP = waterG.attributes.position;
  const water = S.mesh(waterG, S.mat('#3a6a86', { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 }), 0, 0.6, 0, g); water.castShadow = false;
  // la herradura (plana) cogida por un talón con las tenazas; el herrero, detrás de la pila, la mete en el agua
  const shoe = new THREE.Group(); g.add(shoe);
  const ironM = S.mat('#2a2a2e', { metalness: 0.5, roughness: 0.5 }), curve = shoeCurve(1, 0.36);
  S.mesh(new THREE.TubeGeometry(curve, 40, 0.012, 10), ironM, 0, 0, 0, shoe);
  const TG = tongs(S); g.add(TG);
  const steam = puffs(S, { color: '#f4f4f2', max: 30, rise: 0.7 });
  const col = new THREE.Color(), heel = V(0, 0, 0), hand = V(0, 0, 0), td = V(0, 0, 0), X = V(1, 0, 0);
  let W = null;
  const ready = worker(S, 'pastor', { height: 1.72 }).then(w => { W = w; if (W) { g.add(W.obj); W.obj.position.set(0.05, 0, -0.86); } });
  return {
    ready, frame: { box: [[-0.55, 0.15, -2.45], [0.55, 1.4, -1.2]], dir: [0.3, 0.45, 1] },
    set(p, hit, ok) {
      const dip = ok && hit < 0.9 ? Math.sin(Math.min(1, hit / 0.9) * Math.PI) : 0;
      shoe.position.set(0, 0.86 - dip * 0.3, 0.06); shoe.rotation.set(0.12 + dip * 0.2, 0.2, 0);
      // las tenazas muerden un talón y sus mangos van hacia las manos del herrero
      shoe.updateMatrixWorld(true); g.worldToLocal(shoe.localToWorld(heel.copy(curve.getPoint(1))));
      td.set(0, 0.28, -1).normalize(); TG.position.copy(heel); TG.quaternion.setFromUnitVectors(X, td);
      hand.copy(heel).addScaledVector(td, 0.58);
      if (W) W.pose({ crouch: 0.02 + dip * 0.08, bend: 0.2 + dip * 0.25, nod: 0.15, hands: [g.localToWorld(hand.clone().add(V(0.035, 0, 0.04))), g.localToWorld(hand.clone().add(V(-0.035, 0.01, -0.02)))] });
      const h = 0.95 - p * 0.9; heatColor(h, col); ironM.emissive.copy(col); ironM.emissiveIntensity = THREE.MathUtils.smoothstep(h, 0.3, 0.8) * 1.3; ironM.color.copy(col).multiplyScalar(0.3);
      for (let i = 0; i < WP.count; i++) { const x = WP.getX(i), z = WP.getZ(i), d = Math.hypot(x, z); WP.setY(i, Math.sin(d * 40 - S.t * 8) * 0.004 * Math.exp(-d * 4) * (dip > 0.1 ? 3 : 0.4)); }
      WP.needsUpdate = true; waterG.computeVertexNormals();
      if (dip > 0.6 && Math.random() < 0.5) steam.emit([g.position.x + (Math.random() - 0.5) * 0.2, 0.65, g.position.z], 2, { size: 0.07, life: 1.4, spread: 0.2 });
    },
  };
}

function doveScene(S, net) {
  outdoors(S, { ground: 'grass', groundColor: '#c8d0a0', hills: '#5a7a3a' });
  // el collado entre hayas (Etxalar): las redes altas colgadas entre postes y la torre de los paleteros
  for (const [x, z, h, sd] of [[-4.2, -3.6, 7, 1], [-2.0, -4.6, 7.5, 2], [2.2, -4.4, 7.2, 3], [4.4, -3.4, 6.8, 4], [-5.6, -1.6, 6, 5], [5.8, -1.2, 6.2, 6]]) tree(S, x, z, { h, r: 0.24, crown: 2.0, seed: sd });
  const nc = document.createElement('canvas'); nc.width = nc.height = 64; const ng = nc.getContext('2d');
  ng.fillStyle = 'rgba(40,32,24,0.16)'; ng.fillRect(0, 0, 64, 64); ng.strokeStyle = 'rgba(44,36,28,1)'; ng.lineWidth = 3;
  for (const t of [0, 64]) { ng.beginPath(); ng.moveTo(t, 0); ng.lineTo(t, 64); ng.stroke(); ng.beginPath(); ng.moveTo(0, t); ng.lineTo(64, t); ng.stroke(); }
  const nt = S.own(new THREE.CanvasTexture(nc)); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(10, 26); nt.anisotropy = 8;
  const netM = S.mat('#ffffff', { map: nt, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
  const poleM = texMat(S, 'bark', '#c8b8a8'), NZ = -2.8, NH = 5.2;
  for (const x of [-2.85, -0.95, 0.95, 2.85]) S.mesh(lathe([[0.001, 0], [0.07, 0], [0.06, NH * 0.6], [0.045, NH + 0.4], [0.001, NH + 0.42]], 10), poleM, x, 0, NZ);
  const nets = [-1.9, 0, 1.9].map(x => {
    const geo = new THREE.PlaneGeometry(1.86, NH - 0.3, 10, 20), P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin((P.getY(i) / NH + 0.5) * Math.PI) * 0.12 * (1 - Math.abs(P.getX(i)) / 0.93));   // la red cede en el centro
    geo.computeVertexNormals();
    const n = S.mesh(geo, netM, x, NH / 2 + 0.15, NZ); n.castShadow = false; n.userData.top = NH / 2 + 0.15; return n;
  });
  S.mesh(tube([[-2.85, NH, NZ], [0, NH - 0.12, NZ], [2.85, NH, NZ]], 0.012, 20, 5), S.mat('#3a3028'));   // la cuerda de arriba
  // la torre del paletero, a un lado, con su barandilla
  const tower = new THREE.Group(); tower.position.set(3.6, 0, -1.6); S.add(tower);
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) S.mesh(lathe([[0.001, 0], [0.06, 0], [0.05, 3.4], [0.001, 3.42]], 8), poleM, x, 0, z, tower);
  S.mesh(uvScale(rbox(1.1, 0.08, 1.1, 0.02), 2, 2), texMat(S, 'wood', '#9a7a58'), 0, 3.3, 0, tower);
  for (const [x, z, ry] of [[0, -0.52, 0], [0, 0.52, 0], [-0.52, 0, Math.PI / 2]]) S.mesh(rbox(1.04, 0.5, 0.05, 0.015), texMat(S, 'wood', '#8a6a48'), x, 3.6, z, tower).rotation.y = ry;
  // el bando: palomas torcaces (cuerpo torneado, cabeza, cola y alas que baten)
  const bodyM = S.mat('#8a909c', { roughness: 0.7 }), wingM = S.mat('#6a707c', { roughness: 0.7, side: THREE.DoubleSide }), neckM = S.mat('#e8e8ec', { roughness: 0.7 });
  const bodyG = S.own(lathe([[0.001, -0.13], [0.03, -0.1], [0.055, -0.03], [0.058, 0.02], [0.045, 0.08], [0.02, 0.12], [0.001, 0.13]], 12).rotateX(Math.PI / 2));
  const wingSh = new THREE.Shape(); wingSh.moveTo(0, 0.04); wingSh.quadraticCurveTo(0.16, 0.05, 0.3, -0.02); wingSh.quadraticCurveTo(0.18, -0.06, 0, -0.05); wingSh.closePath();
  const wingG = S.own(new THREE.ShapeGeometry(wingSh, 8));
  const birds = Array.from({ length: 18 }, (_, i) => {
    const b = new THREE.Group(); b.add(new THREE.Mesh(bodyG, bodyM)); S.mesh(new THREE.SphereGeometry(0.035, 12, 8), bodyM, 0, 0.03, 0.13, b); S.mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), neckM, 0, 0.02, 0.1, b);
    S.mesh(new THREE.ConeGeometry(0.05, 0.12, 10).rotateX(-Math.PI / 2).scale(1, 0.25, 1), bodyM, 0, 0, -0.17, b);
    // cada ala en su bisagra (gira sobre el eje del cuerpo); la forma del ala, tumbada
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.set(0.03, 0.02, 0.02); wr.position.set(-0.03, 0.02, 0.02); wr.scale.x = -1;
    for (const w of [wl, wr]) { const m = new THREE.Mesh(wingG, wingM); m.rotation.x = -Math.PI / 2; w.add(m); } b.add(wl, wr);
    b.scale.setScalar(1.7); S.add(b); return { b, wl, wr, ph: Math.random() * 6, off: i / 18, lane: (Math.random() - 0.5) * 2, h: Math.random() };
  });
  const paleta = S.mesh(rbox(0.36, 0.025, 0.14, 0.012), S.mat('#f4f1ea', { roughness: 0.6 }));
  // el paletero en lo alto de la torre: lanza la paleta con el brazo por encima de la cabeza
  let W = null;
  const ready = worker(S, 'pastor', { height: 1.7 }).then(w => { W = w; if (W) { tower.add(W.obj); W.obj.position.set(0.1, 3.34, 0.05); W.obj.rotation.y = -Math.PI / 2 - 0.25; } });
  const rh = V(0, 0, 0), lh = V(0, 0, 0);
  return {
    ready, frame: { box: [[-2.95, 0.1, -3.0], [2.95, 5.6, -1.6]], dir: [0, 0.1, 1], fov: 44 },
    set(p, hit, ok, dt) {
      const caught = net ? Math.floor(p * 10) : 0;
      birds.forEach((B, i) => {
        B.ph += dt * 14; const flap = Math.sin(B.ph) * 0.9;
        if (net && i < caught) {   // enredadas en la red: quietas y caídas hacia el fondo de la bolsa
          const k = i % 3; B.b.position.set(-1.9 + k * 1.9 + ((i * 37) % 10 / 10 - 0.5) * 1.2, 0.5 + (i % 4) * 0.25, NZ + 0.12); B.b.rotation.set(0.9, 0.3 * (i % 2 ? 1 : -1), 0.4); B.wl.rotation.z = 0.7; B.wr.rotation.z = 0.7; return;
        }
        B.wl.rotation.z = flap; B.wr.rotation.z = flap;
        // el bando cruza el collado; con cada paletazo bueno baja más (en la segunda parte, rozando las redes)
        const u = (S.t * 0.1 + B.off) % 1, x = -7 + u * 14, low = net ? 1 : p, y = 6.2 + B.lane * 0.5 + B.h * 0.4 - low * 4.0 + Math.sin(S.t * 1.3 + i) * 0.12;
        B.b.position.set(x, Math.max(1.0, y), NZ + 0.9 + B.lane * 0.7); B.b.rotation.set(0, Math.PI / 2, Math.sin(S.t * 2 + i) * 0.15);
      });
      nets.forEach(n => { n.position.y = net ? n.userData.top - Math.min(1, p * 1.2) * 0.35 : n.userData.top; });
      // la paleta blanca vuela desde la torre por encima del bando (las palomas la toman por un halcón y bajan)
      const k = !net && hit < 1.2 ? hit / 1.2 : 1; paleta.visible = k < 1;
      paleta.position.set(3.6 - k * 5.5, 3.8 + Math.sin(k * Math.PI) * 2.2, -1.6 + k * 0.4); paleta.rotation.set(k * 14, k * 9, 0);
      if (W) {   // el brazo: atrás, arriba al lanzar y vuelve
        const th = !net && hit < 0.6 ? Math.sin(hit / 0.6 * Math.PI) : 0;
        tower.localToWorld(rh.set(0.1 - 0.15 * th, 4.25 + 0.25 * th, 0.2 - 0.1 * th)); tower.localToWorld(lh.set(0.0, 4.0, -0.15));
        W.pose({ bend: -0.1 + 0.2 * th, twist: 0.3 * th, hands: [lh, rh] });
      }
    },
  };
}

function liftScene(S) {
  outdoors(S, { ground: 'stone', groundColor: '#d8ccb8', hills: '#7a9a5a' });
  // la plaza en fiestas: la tarima de madera, el frontón al fondo y la piedra cilíndrica del harrijasotzaile
  S.mesh(uvScale(rbox(2.2, 0.12, 1.8, 0.02), 4, 3), texMat(S, 'wood', '#b08a5a'), 0, 0.06, 0);
  S.mesh(uvScale(new THREE.BoxGeometry(9, 4, 0.4), 4, 2), texMat(S, 'plaster', '#efe6d6'), 0, 2, -3.2);
  S.mesh(uvScale(new THREE.BoxGeometry(9, 0.6, 0.45), 6, 0.4), texMat(S, 'stone', '#c0b49c'), 0, 0.3, -3.18);
  for (let i = -3; i <= 3; i++) S.mesh(rbox(0.06, 1.3, 0.04, 0.01), S.mat('#d42f2f'), i * 1.1, 1.6, -2.99);   // las rayas del frontón
  const stoneM = texMat(S, 'rock', '#c8c0b0', { roughness: 0.9 }), SR = 0.19;
  const stone = S.mesh(uvScale(lathe([[0.001, -0.16], [SR - 0.02, -0.16], [SR, -0.14], [SR, 0.14], [SR - 0.02, 0.16], [0.001, 0.16]], 32), 2, 1), stoneM);
  let W = null, wob = 0;
  const ready = worker(S, 'sanfermin', { height: 1.75 }).then(w => { W = w; if (W) W.obj.position.set(0, 0.12, -0.12); });
  // la subida: del suelo a los muslos, al pecho y al hombro (como en las exhibiciones)
  const KEYS = [
    { p: 0, pos: [0, 0.12 + SR, 0.2], crouch: 0.12, bend: 0.55, lean: 0, rot: 0 },
    { p: 0.35, pos: [0, 0.42, 0.14], crouch: 0.1, bend: 0.25, lean: 0, rot: 0.2 },
    { p: 0.7, pos: [0, 0.68, 0.12], crouch: 0.03, bend: -0.18, lean: 0, rot: 0.5 },
    { p: 1, pos: [-0.3, 0.98, 0.0], crouch: 0, bend: -0.06, lean: -0.12, rot: 0.9 },
  ];
  const cur = { pos: V(0, 0, 0) }, L = V(0, 0, 0), R = V(0, 0, 0);
  return {
    ready, frame: { box: [[-0.62, 0, -0.5], [0.62, 1.62, 0.42]], dir: [0.3, 0.2, 1] },
    set(p, hit) {
      let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
      const A = KEYS[i], B = KEYS[i + 1], t = ease(THREE.MathUtils.clamp((p - A.p) / (B.p - A.p), 0, 1));
      cur.pos.set(...A.pos).lerp(V(...B.pos), t);
      // cada empujón: un tirón hacia arriba que se asienta
      wob = hit < 0.25 ? Math.sin(hit / 0.25 * Math.PI) * 0.025 : 0; cur.pos.y += wob;
      stone.position.copy(cur.pos); stone.rotation.set(0, 0, Math.PI / 2); stone.rotateX(A.rot + (B.rot - A.rot) * t);
      if (W) {
        const sh = p > 0.85 ? (p - 0.85) / 0.15 : 0;   // al hombro: una mano encima y la otra detrás
        L.copy(cur.pos).add(V(0.17 + 0.03 * sh, -0.02 + 0.14 * sh, 0.0)); R.copy(cur.pos).add(V(-0.17 - 0.05 * sh, -0.02 - 0.06 * sh, -0.04 * sh));
        W.pose({ crouch: A.crouch + (B.crouch - A.crouch) * t, bend: A.bend + (B.bend - A.bend) * t, lean: A.lean + (B.lean - A.lean) * t, nod: 0.1, hands: [L, R] });
      }
    },
  };
}

function moundScene(S) {
  outdoors(S, { ground: 'leaves', groundColor: '#a07850', hills: '#4a6a3a', sky: ['#8ab0d0', '#d8e0d8'] });
  // el hayedo: árboles de copa redonda alrededor del claro
  for (const [x, z, h, sd] of [[-2.6, -2.6, 5.5, 1], [-0.6, -3.6, 6, 2], [1.7, -3.1, 5.2, 3], [3.2, -2.0, 5.8, 4], [-3.8, -0.6, 5, 5], [4.2, 0.4, 5.4, 6]]) tree(S, x, z, { h, r: 0.18, crown: 1.5, seed: sd });
  // la carbonera: cúpula de tierra y hojas, la chimenea arriba y las fugas (humo y brasa) que hay que tapar
  const MC = V(0, 0, -0.7);
  const dome = S.mesh(uvScale(lumpy(new THREE.SphereGeometry(1.0, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), 0.04, 6, 2), 3, 2), texMat(S, 'soil', '#e0c8a8', { roughness: 1 }), MC.x, 0, MC.z);
  dome.scale.set(1.15, 0.78, 1.15);   // tapada con tierra y cenizas
  S.mesh(lathe([[0.06, 0], [0.1, 0], [0.09, 0.1], [0.07, 0.12]], 16), S.mat('#2a2018', { roughness: 1 }), MC.x, 0.76, MC.z);
  const smoke = puffs(S, { color: '#d8d8d4', max: 40, rise: 0.8 });
  const ember = S.mat('#3a1a0a', { emissive: '#ff5a10', emissiveIntensity: 2, roughness: 1 });
  // las fugas, en la cara que da al carbonero
  const holes = [[0.25, 0.3], [0.5, 0.55], [0.85, 0.42], [1.15, 0.2], [0.6, 0.15], [0.05, 0.12]].map(([u, v], i) => {
    const a = u * 1.2, el = v * 1.2, n = V(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el));
    const hp = V(n.x * 1.15, n.y * 0.78, n.z * 1.15).add(MC);
    const glow = S.mesh(lumpy(new THREE.IcosahedronGeometry(0.09, 2), 0.3, 20, i), ember, hp.x, hp.y, hp.z); glow.scale.y = 0.6; glow.castShadow = false;
    const patch = S.mesh(lumpy(new THREE.SphereGeometry(0.12, 12, 8), 0.25, 18, i), texMat(S, 'soil', '#5a4430'), hp.x, hp.y, hp.z); patch.scale.set(1, 0.45, 1); patch.lookAt(hp.clone().add(n)); patch.rotateX(Math.PI / 2); patch.visible = false;
    return { glow, patch, hp, n };
  });
  const earth = particles(S, { geo: lumpy(new THREE.IcosahedronGeometry(0.025, 1), 0.3, 30), color: '#5a4430', max: 80, gravity: -6, drag: 0.2 });
  // la pala: mango torneado y hoja curva
  const shovel = new THREE.Group(); S.add(shovel);
  S.mesh(lathe([[0.001, 0], [0.016, 0], [0.015, 0.95], [0.02, 1.0], [0.001, 1.01]], 10), S.mat('#a87848'), 0, 0, 0, shovel);
  S.mesh(new THREE.SphereGeometry(0.14, 18, 8, 0, Math.PI, 0, Math.PI / 2).scale(1, 1.4, 0.35).rotateX(Math.PI), S.mat('#6a6e74', { metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }), 0, -0.02, 0, shovel);
  let W = null; const WP = V(1.45, 0, -0.25);
  const ready = worker(S, 'pastor', { height: 1.72 }).then(w => { W = w; if (W) { W.obj.position.copy(WP); W.obj.rotation.y = Math.atan2(MC.x - WP.x, MC.z - WP.z); } });
  let prev = 9; const blade = V(0, 0, 0), h1 = V(0, 0, 0), h2 = V(0, 0, 0), ax = V(0, 0, 0), side = V(0, 0, 0), fwd = V(0, 0, 0);
  return {
    ready, frame: { box: [[-1.2, 0, -1.9], [1.75, 1.35, 0.5]], dir: [0.3, 0.38, 1] },
    set(p, hit) {
      const open = Math.ceil((1 - p) * holes.length - 1e-6), target = holes[Math.max(0, Math.min(holes.length - 1, holes.length - open))];
      holes.forEach((h, i) => { const on = i >= holes.length - open; h.glow.visible = on; h.patch.visible = !on; if (on) { h.glow.scale.setScalar(0.9 + Math.sin(S.t * 9 + i) * 0.1); h.glow.scale.y *= 0.6; } });
      if (Math.random() < 0.25) { const h = holes.filter(h => h.glow.visible)[Math.random() * open | 0]; smoke.emit(h ? [h.hp.x, h.hp.y + 0.05, h.hp.z] : [MC.x, 0.85, MC.z], 1, { size: 0.1, life: 2, spread: 0.06 }); }
      if (Math.random() < 0.12) smoke.emit([MC.x, 0.88, MC.z], 1, { size: 0.14, life: 2.6, spread: 0.08 });
      // la palada: la hoja baja a coger tierra junto a los pies y sube en arco hasta la fuga
      fwd.set(MC.x - WP.x, 0, MC.z - WP.z).normalize(); side.set(fwd.z, 0, -fwd.x);
      const k = hit < 0.35 ? ease(hit / 0.35) : hit < 0.7 ? 1 - ease((hit - 0.35) / 0.35) : 0;
      const low = WP.clone().addScaledVector(fwd, 0.45).addScaledVector(side, 0.12).setY(0.04), tgt = target.hp.clone().addScaledVector(target.n, 0.1);
      blade.lerpVectors(low, tgt, k); blade.y += Math.sin(k * Math.PI) * 0.25;
      // el mango, de la hoja hacia las manos (detrás y arriba)
      h1.copy(WP).addScaledVector(fwd, 0.12).addScaledVector(side, -0.08).setY(0.42 + k * 0.2);
      ax.subVectors(h1, blade).normalize(); shovel.position.copy(blade); shovel.quaternion.setFromUnitVectors(V(0, 1, 0), ax);
      h2.copy(blade).addScaledVector(ax, 0.62);
      if (W) W.pose({ crouch: 0.08 * (1 - k), bend: 0.35 - 0.2 * k, nod: 0.1, hands: [h2.clone(), h1.clone().addScaledVector(ax, 0.12)] });
      if (prev < 0.35 && hit >= 0.35) earth.emit([tgt.x, tgt.y, tgt.z], 14, { speed: 0.8, spread: 0.6, dir: [target.n.x, target.n.y, target.n.z], life: 1 });
      prev = hit;
    },
  };
}

function anvilScene(S) {
  workshop(S, { bench: false, wall: 'brick' });
  // el yunque a la altura del herrero; él, detrás, sujeta la pieza con las tenazas (izquierda) y la dobla a martillazos
  const K = 0.72, AN = anvil(S); AN.g.scale.setScalar(K); AN.g.position.set(0, 0.42 * K, -1.4); S.add(AN.g); const FY = 0.82 * K;
  const ironM = S.mat('#2a2a2e', { metalness: 0.5, roughness: 0.5, emissive: '#ff6a10', emissiveIntensity: 1.3 }); ironM.color.set('#5a2010');
  const piece = new THREE.Group(); piece.position.set(-0.05, FY + 0.01, -1.4); piece.scale.setScalar(0.8); S.add(piece);
  let pm = null, lastK = -1; S.own({ dispose: () => pm?.geometry.dispose() });
  const piv = new THREE.Group(); S.add(piv); const HM = hammer(S); HM.position.y = 0.3; piv.add(HM);
  const TG = tongs(S); piece.add(TG); TG.setRotationFromEuler(new THREE.Euler(0, 0.93, 0.25, 'XYZ'));
  const sparks = particles(S, { geo: new THREE.SphereGeometry(0.006, 5, 4), color: '#ffcc66', emissive: '#ffaa33', max: 100, gravity: -5, drag: 0.3 });
  const glow = new THREE.PointLight('#ff7a2a', 0.45, 0.7, 2); glow.position.set(0.1, FY + 0.05, -1.25); S.add(glow);
  let W = null;
  const ready = worker(S, 'pastor', { height: 1.72 }).then(w => { W = w; if (W) W.obj.position.set(0, 0, -1.86); });
  let prev = 9; const hh = V(0, 0, 0), at = V(0, 0, 0), d = V(0, 0, 0), lh = V(0, 0, 0);
  return {
    ready, frame: { box: [[-0.42, 0, -2.1], [0.42, 1.35, -1.15]], dir: [0.55, 0.5, 1] },
    set(p, hit, ok) {
      const k0 = Math.round(p * 20) / 20; if (k0 !== lastK) { lastK = k0; if (pm) { piece.remove(pm); pm.geometry.dispose(); } const c = shoeCurve(k0); pm = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.011, 10), ironM); piece.add(pm); TG.position.copy(c.getPoint(1)); }
      const th = swingAngle(hit, -1.2, 0, S.t), k = THREE.MathUtils.clamp((th + 1.2) / 1.2, 0, 1);
      at.set(piece.position.x - 0.02, FY + 0.03, -1.4);
      hh.copy(at).add(V(-0.26, 0.03 + (1 - k) * 0.12, -0.12));
      piece.updateMatrixWorld(true); TG.localToWorld(lh.set(0.52, 0.03, 0));   // la mano izquierda, al final de los mangos
      if (W) { W.pose({ crouch: 0.04, bend: 0.3, nod: 0.12, hands: [lh.clone(), hh.clone()] }); W.handAt(1, hh); }
      d.subVectors(at, hh).setY(0).normalize(); hammerQ(d, (1 - k) * 1.2, piv.quaternion); piv.position.copy(hh);
      if (ok && prev < 0.14 && hit >= 0.14) sparks.emit([at.x, at.y, at.z], 18, { speed: 2, spread: 2.2, life: 0.7 });
      prev = hit; ironM.emissiveIntensity = 1.3 + Math.sin(S.t * 5) * 0.1;
    },
  };
}

function soleScene(S) {
  workshop(S, { bench: true });
  const root = new THREE.Group(); root.position.set(0.25, 0.905, -2.4); root.rotation.y = innerWidth < innerHeight ? Math.PI / 2 + 0.1 : 0.15; S.add(root);
  const sole = soleMesh(S); root.add(sole.mesh);
  const threadM = S.mat('#c8202a', { roughness: 0.7 }), N = 14, done = [], pts = [];
  for (let i = 0; i < N; i++) { const phi = Math.PI + i / N * Math.PI * 2, p = soleOutline(phi, 0), out = p.clone().setY(0).normalize(); p.addScaledVector(out, 0.004); const inn = p.clone().addScaledVector(out, -0.024); inn.y = sole.top * 0.6; const o2 = p.clone().addScaledVector(out, 0.002); o2.y = sole.top * 0.25; const top = p.clone().addScaledVector(out, -0.01); top.y = sole.top + 0.0035;
    const m = S.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([o2, p.clone().setY(sole.top * 0.95), top, inn]), 14, 0.0014, 6), threadM, 0, 0, 0, root); m.visible = false; done.push(m); pts.push({ p: p.setY(sole.top * 0.8), out }); }
  // la aguja de alpargatera, apoyada en la puntada siguiente; entra al dar el golpe y el hilo tira de la anterior
  const needle = new THREE.Group(); root.add(needle);
  S.mesh(lathe([[0.001, 0], [0.0016, 0.004], [0.0018, 0.06], [0.0024, 0.072], [0.0016, 0.08], [0.001, 0.081]], 10), S.mat('#dfe3e8', { metalness: 0.9, roughness: 0.2 }), 0, -0.012, 0, needle);
  let thread = null, lastN = -1; S.own({ dispose: () => thread?.geometry.dispose() });
  const base = V(0, 0, 0), dir = V(0, 0, 0);
  return { frame: { box: sole.mesh, dir: [0.12, 1.2, 0.7] }, set(p, hit) {
    const n = Math.round(p * N); done.forEach((m, i) => { m.visible = i < n; });
    if (n !== lastN) { lastN = n; needle.visible = n < N;
      if (n < N) { const { p: q, out } = pts[n]; base.copy(q).addScaledVector(out, 0.007); base.y = sole.top + 0.006; dir.copy(q).sub(base).normalize();
        root.updateMatrixWorld(true); needle.position.copy(base); needle.lookAt(root.localToWorld(q.clone().addScaledVector(out, -0.02).setY(sole.top * 0.2))); needle.rotateX(-Math.PI / 2); }
      if (thread) { root.remove(thread); thread.geometry.dispose(); thread = null; }
      if (n > 0 && n < N) { const a = pts[n - 1].p.clone().setY(sole.top), b = base.clone(), mid = a.clone().lerp(b, 0.5); mid.y += 0.03; thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.0012, 5), threadM); root.add(thread); }
    }
    const push = hit < 0.25 ? Math.sin(hit / 0.25 * Math.PI) : 0; if (n < N) needle.position.copy(base).addScaledVector(dir, push * 0.014);
  } };
}

// ------------------------------------------------------------------------------------------------ los juegos
export const has3DArt = (art) => !!SCENES[art];
// encuadre: [centro, radio, dirección, fov] o { box: [[mín], [máx]] o un objeto, dir, fov } (la caja entera en la zona libre)
async function mount(S, art) {
  const sc = SCENES[art](S); await sc.ready; const F = sc.frame;
  if (Array.isArray(F)) S.frame(...F);
  else { S.scene.updateMatrixWorld(true); const b = F.box.isObject3D ? new THREE.Box3().setFromObject(F.box) : new THREE.Box3(V(...F.box[0]), V(...F.box[1])); S.frameBox(b, F.dir, F.fov || 40); }
  return sc;
}

/** Barra de precisión en 3D: golpe cuando la marca pasa por la zona; el trabajo avanza con cada golpe bueno. */
export function timing3d(ui, { title, hint, icon = 'hammer', rounds = 5, zone = 0.18, speed = 0.7, need = 3, verb = 'Golpear', art }) {
  return play3d(ui, { title, hint, icon, buttons: `<button class="btn primary big" data-go>${verb}</button>`,
    extra: `<div class="m3-bar"><div class="tbar"><div class="zone"></div><div class="cursor"></div></div><div class="pips">${Array.from({ length: rounds }, () => '<i></i>').join('')}</div></div>`,
    stage: STAGE[STAGE_OF[art] || 'shop'] }, async (S, H, end, isOver) => {
    const sc = await mount(S, art);
    const zoneEl = H.o.querySelector('.zone'), cur = H.o.querySelector('.cursor'), pips = H.o.querySelectorAll('.pips i');
    let zc = 0.5, t = 0, round = 0, hits = 0, locked = 0, sp = speed, hitT = 9, ok = true;
    const place = () => { zc = 0.15 + Math.random() * 0.7; zoneEl.style.left = ((zc - zone / 2) * 100) + '%'; zoneEl.style.width = (zone * 100) + '%'; };
    place();
    const pos = () => 0.5 - 0.5 * Math.cos(t * Math.PI * 2 * sp);
    const hit = () => {
      if (isOver() || locked > 0) return;
      const p = pos(), good = Math.abs(p - zc) <= zone / 2 + 0.01;
      pips[round].className = good ? 'ok' : 'ko';
      if (good) { hits++; H.fb.textContent = Math.abs(p - zc) < zone * 0.2 ? '¡Perfecto!' : '¡Bien!'; ui.sound?.tone?.(660 + hits * 60, 0.12, 'square', 0.12, ui.sound.sfx); ui.sound?.noiseBurst?.(0.05, 3000, 1.5, 0.3, ui.sound.sfx); }
      else { H.fb.textContent = p < zc ? '¡Demasiado pronto!' : '¡Demasiado tarde!'; ui.sound?.ui?.('error'); }
      ui.onMiniHit?.(good); hitT = 0; ok = good; round++; locked = 0.55;
      if (round >= rounds) { const win = hits >= need; end({ win, hits }, win ? `¡Lo has conseguido! ${hits}/${rounds}` : `${hits}/${rounds}: necesitas ${need}. ¡Otra vez!`, 1500); }
    };
    H.o.querySelector('[data-go]').addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
    H.cap.addEventListener('pointerdown', hit);
    H.keys((e) => { if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) { e.preventDefault(); hit(); } });
    S.every((dt) => {
      hitT += dt;
      if (locked > 0 && (locked -= dt) <= 0 && round < rounds) { sp *= 1.1; place(); }
      if (locked <= 0 && !isOver()) t += dt;
      cur.style.left = (pos() * 100) + '%';
      const D = H.o.debug;   // (laboratorio) forzar el avance y el golpe para ver la escena
      sc.set(D ? D.p : Math.min(1, hits / need), D ? D.hit : hitT, ok, dt);
      H.prog(hits / need);
    });
    H.clock.textContent = '';
    H.o.state = () => ({ pos: pos(), zc, zone, locked, hits, round });
  });
}

/** Pulsar deprisa en 3D: cada pulsación empuja el trabajo (subir la piedra, amasar, tapar las fugas). */
export function mash3d(ui, { title, hint, icon = 'stone', seconds = 6, goal = 30, verb = '¡Empuja!', art }) {
  return play3d(ui, { title, hint, icon, buttons: `<button class="btn primary big" data-go>${verb}</button>`, stage: STAGE[STAGE_OF[art] || 'shop'] }, async (S, H, end, isOver) => {
    const sc = await mount(S, art);
    let n = 0, t = 0, started = false, hitT = 9;
    const press = () => {
      if (isOver()) return; started = true; n++; hitT = 0;
      ui.sound?.tone?.(200 + n * 12, 0.05, 'triangle', 0.08, ui.sound.sfx); ui.onMiniHit?.(true);
      H.fb.textContent = n < goal * 0.3 ? '¡Vamos!' : n < goal * 0.7 ? '¡Más fuerte!' : '¡Ya casi!';
      if (n >= goal) end({ win: true, n }, '¡Hecho! ¡Qué fuerza!');
    };
    H.o.querySelector('[data-go]').addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    H.cap.addEventListener('pointerdown', press);
    H.keys((e) => { if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) { e.preventDefault(); if (!e.repeat) press(); } });
    H.fb.textContent = 'Pulsa muchas veces seguidas';
    S.every((dt) => {
      hitT += dt;
      if (started && !isOver()) { t += dt; if (t >= seconds) end({ win: false, n }, '¡Casi! Prueba otra vez'); }
      const D = H.o.debug;
      H.time(seconds - t); sc.set(D ? D.p : Math.min(1, n / goal), D ? D.hit : hitT, true, dt); H.prog(n / goal);
    });
    H.time(seconds);
    H.o.state = () => ({ n, goal });
  });
}
