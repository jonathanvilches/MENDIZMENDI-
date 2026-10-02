// El encierro de San Fermín en su propia pantalla: la calle Estafeta con sus balcones llenos de gente vestida de
// blanco y rojo, corredores, cabestros y toros. Se corre hacia la plaza de toros esquivando a los toros que llegan
// por detrás; si uno te alcanza, te caes (tres caídas y se acaba). Al llegar a la plaza, la historia del encierro.
// En la vida real solo pueden correr las personas mayores de 18 años: el juego lo recuerda.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { beast } from '../actors/beasts.js';
import { buildAnimal, preloadAnimals } from '../actors/animalGlb.js';
import { buildNpc } from '../actors/npcGlb.js';
import { infoCard } from '../ui/minigames.js';
import { buildPlaza, RO, RA } from './encierroPlaza.js';
import { crowd3d } from '../actors/crowd3d.js';
import { QUALITY } from '../util/quality.js';
import { GLB_AVATARS, GlbChar, loadMeshy, MESHY_GAIT } from '../actors/glbChar.js';
import { cobbleSet, ashlarSet, brickSet, woodSet, plasterSet, windowTex, railingTex, shopTex, SHOPS, plaqueTex, sandTex, archTex, flagNavarraTex, paverSet, stencilTex, bandTex, boardTex } from './encierroTex.js';

const L = 230;          // largo de la Estafeta en la escena (m); luego el callejón vallado y la plaza
const GATE = L + 34;    // puerta de la plaza de toros (cara del muro)
const END = GATE + (RO - RA - 1.6) + 5;   // meta: ya dentro del ruedo, pasado el túnel
const HALF = 2.9;       // media anchura de la calle
const FACTS = [
  { title: 'El encierro', text: 'Del 7 al 14 de julio, a las ocho de la mañana, seis toros y los cabestros, bueyes mansos que los guían, recorren unos 850 metros: desde los corrales de Santo Domingo hasta la plaza de toros. Tarda unos tres minutos.' },
  { title: 'El canto a San Fermín', text: 'Antes de empezar, los corredores cantan tres veces a San Fermín ante su imagen en la cuesta de Santo Domingo y le piden que los proteja. Llevan un periódico enrollado en la mano.' },
  { title: 'Los cohetes', text: 'Un cohete avisa de que se abren los corrales, otro de que todos los toros han salido, el tercero de que han entrado en la plaza y el cuarto de que ya están en los corrales: el encierro ha terminado.' },
  { title: 'Pastores y dobladores', text: 'Detrás de los toros van los pastores con sus varas, para que ninguno se quede atrás. En la plaza, los dobladores llevan a los toros hasta los corrales con sus capotes.' },
  { title: 'Solo para mayores', text: 'Correr el encierro es muy peligroso: solo pueden hacerlo las personas mayores de 18 años. Los niños y las niñas lo ven desde los balcones o por la tele… ¡o en este juego!' },
];

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
    // adoquín de la calle y del callejón, y el ruedo de albero al final
    const GW = 2 * (HALF + 7), GL = GATE + 30 + 2;
    const CT = this.cobbleT = cobbleSet([GW / 1.3, GL / 1.3]);   // adoquín de unos 15 cm, como el de la Estafeta
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), new THREE.MeshStandardMaterial({ ...CT, roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 30 - GL / 2); ground.receiveShadow = true; S.add(ground);
    const cz0 = -GATE - RO, out = new THREE.Mesh(new THREE.PlaneGeometry(2 * RO + 40, 2 * RO + 40), new THREE.MeshStandardMaterial({ color: '#a8a296', roughness: 0.95 }));
    out.rotation.x = -Math.PI / 2; out.position.set(0, -0.02, cz0); out.receiveShadow = true; S.add(out);
    const sand = this.sandT = sandTex(); sand.anisotropy = 8;
    const arena = new THREE.Mesh(new THREE.CircleGeometry(RA + 1.8, 72), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
    arena.rotation.x = -Math.PI / 2; arena.position.set(0, 0.02, cz0); arena.receiveShadow = true; S.add(arena);
    // fachadas: casas altas pegadas, con balcones de hierro en cada piso, contraventanas y gente asomada
    const rnd = mulberry(7), B = { plaster: [], stone: [], wood: [], brick: [], plain: [], leaf: [] };
    const WIN = [[], [], []], RAIL = [], SHOP = Object.fromEntries(SHOPS.map(k => [k, []]));   // piezas dibujadas (instancias)
    const walls = ['#e9dcc0', '#d9b98a', '#e6cfa6', '#c98f6a', '#efe6d2', '#d6a77a', '#e2d2b0'];
    const people = [], sitters = [], BAL = [];   // BAL: balcones del primer piso (para las cámaras de televisión)
    // planta baja con relieve: pilastras de sillería con zócalo entre los huecos, dintel y cornisa corrida, y los bajos
    // metidos 45 cm (escaparates, portales, persianas bajadas o tablas de protección), con umbral y marco de madera
    const GF = 3.0, RD = 0.45;
    const groundFloor = (side, F, zc, w, bays) => {
      const z0 = zc - w / 2 + 0.05, z1 = zc + w / 2 - 0.05, bw = (z1 - z0) / bays, ow = Math.min(2.3, bw * 0.74), OH = 2.55;
      B.stone.push(colored(new THREE.BoxGeometry(7 - RD, GF, z1 - z0), '#8f857a', M4(side * (F + RD + (7 - RD) / 2), GF / 2, zc)));   // fondo de los huecos
      let prev = z0;
      for (let k = 0; k <= bays; k++) {
        const oz = k < bays ? z0 + (k + 0.5) * bw : null, a = oz === null ? z1 : oz - ow / 2, len = a - prev;
        if (len > 0.02) {
          const pz = prev + len / 2, tone = ['#cfc3aa', '#c6b99e', '#d6cbb3'][Math.floor(rnd() * 3)];
          B.stone.push(colored(new THREE.BoxGeometry(RD, GF, len), tone, M4(side * (F + RD / 2), GF / 2, pz)));                 // pilastra
          B.stone.push(colored(new THREE.BoxGeometry(RD + 0.07, 0.5, len + 0.05), '#8e8476', M4(side * (F + RD / 2 - 0.035), 0.25, pz)));   // zócalo
          B.stone.push(colored(new THREE.BoxGeometry(0.05, 0.12, len + 0.02), '#e2d8c2', M4(side * (F - 0.025), GF - 0.42, pz)));       // capitel sencillo
        }
        if (oz === null) break;
        prev = oz + ow / 2;
        // dintel encima del hueco, umbral de piedra y el bajo (dibujo) al fondo
        B.stone.push(colored(new THREE.BoxGeometry(RD, GF - OH, ow), '#d2c6ad', M4(side * (F + RD / 2), OH + (GF - OH) / 2, oz)));
        B.stone.push(colored(new THREE.BoxGeometry(RD + 0.04, 0.07, ow), '#b8ad98', M4(side * (F + RD / 2 - 0.02), 0.035, oz)));
        const kind = SHOPS[Math.floor(rnd() * SHOPS.length)];
        SHOP[kind].push({ x: side * (F + RD - 0.02), y: OH / 2, z: oz, side, sx: ow / 2.3, sy: OH / 2.9 });
        // marco de madera con relieve en los escaparates y portales (no en las persianas ni en las tablas)
        if (kind !== 'persiana' && kind !== 'tablas') {
          const wcol = kind === 'portal2' ? '#2e4a2e' : '#4a2c1a';
          for (const s2 of [-1, 1]) B.wood.push(colored(new THREE.BoxGeometry(0.12, OH, 0.1), wcol, M4(side * (F + RD - 0.08), OH / 2, oz + s2 * (ow / 2 - 0.05))));
          B.wood.push(colored(new THREE.BoxGeometry(0.12, 0.1, ow), wcol, M4(side * (F + RD - 0.08), OH - 0.05, oz)));
          if (!kind.startsWith('portal')) { B.wood.push(colored(new THREE.BoxGeometry(0.1, 0.08, ow * 0.62), wcol, M4(side * (F + RD - 0.07), 0.9, oz - ow * 0.17))); B.wood.push(colored(new THREE.BoxGeometry(0.1, OH - 0.62, 0.07), wcol, M4(side * (F + RD - 0.07), OH / 2 + 0.25, oz + ow * 0.16))); }
        } else B.plain.push(colored(new THREE.BoxGeometry(0.16, 0.22, ow + 0.06), kind === 'persiana' ? '#5a5f64' : '#5a4030', M4(side * (F + RD - 0.1), OH - 0.11, oz)));   // cajón de la persiana o travesaño
        // banderola de hierro con el letrero en algunos comercios
        if (!kind.startsWith('portal') && rnd() < 0.3) {
          B.plain.push(colored(new THREE.BoxGeometry(0.7, 0.04, 0.04), '#1e1c1a', M4(side * (F - 0.35), GF + 0.35, oz + ow / 2 + 0.25)));
          B.plain.push(colored(new THREE.BoxGeometry(0.55, 0.38, 0.04), ['#7a1c1c', '#2e4a3a', '#2a2a44', '#c9a24a'][Math.floor(rnd() * 4)], M4(side * (F - 0.42), GF + 0.1, oz + ow / 2 + 0.25)));
        }
      }
      B.stone.push(colored(new THREE.BoxGeometry(0.24, 0.18, z1 - z0), '#ddd2bb', M4(side * (F - 0.1), GF + 0.03, zc)));   // cornisa corrida sobre la planta baja
    };
    // casas de la calle (F = distancia de la fachada al eje); se usa en la Estafeta y en el tramo del callejón
    const ends = [];   // la testera de la última casa de cada acera (se ve desde el callejón)
    const street = (F, z0, z1) => { for (const side of [-1, 1]) {
      let z = z0;
      while (z > z1 + 2.5) {
        // la última casa acaba justo donde termina la calle (no se mete en el callejón)
        let w = 7 + rnd() * 4; if (z - w < z1 + 3) w = z - z1;
        const h = 12 + Math.floor(rnd() * 3) * 3, x = side * (F + 3.5), zc = z - w / 2, col = walls[Math.floor(rnd() * walls.length)];
        if (z - w <= z1 + 0.01) ends.push({ side, F, z: z - w, h, col });
        B.plaster.push(colored(new THREE.BoxGeometry(7, h - GF, w - 0.1), col, M4(x, GF + (h - GF) / 2, zc)));   // pisos de arriba (la planta baja, aparte)
        B.wood.push(colored(new THREE.BoxGeometry(7.6, 0.5, w + 0.2), '#8a4a32', M4(x, h + 0.25, zc)));            // alero
        for (let q = zc - w / 2 + 0.3; q < zc + w / 2 - 0.2; q += 0.62) B.wood.push(colored(new THREE.BoxGeometry(0.62, 0.16, 0.13), '#6a3a24', M4(side * (F - 0.28), h - 0.07, q)));   // canecillos bajo el alero
        for (let yy = 1.1, k = 0; yy < h - 0.4; yy += 0.55, k++) B.stone.push(colored(new THREE.BoxGeometry(0.12, 0.5, k % 2 ? 0.45 : 0.7), '#c8bca4', M4(side * (F - 0.04), yy + 0.25, zc + w / 2 - 0.05 - (k % 2 ? 0.225 : 0.35))));   // esquinal de sillares
        for (let fl = 2; fl < Math.floor(h / 3); fl++) B.plaster.push(colored(new THREE.BoxGeometry(7.12, 0.14, w - 0.1), '#d8ccb4', M4(x - side * 0.06, fl * 3 - 0.05, zc)));   // imposta
        groundFloor(side, F, zc, w, Math.max(2, Math.floor(w / 2.6)));
        if (rnd() < 0.3) { B.plain.push(colored(new THREE.BoxGeometry(0.5, 0.05, 0.05), '#1e1c1a', M4(side * (F + 0.25), 3.6, zc))); B.plain.push(colored(new THREE.BoxGeometry(0.22, 0.34, 0.22), '#2a2622', M4(side * (F - 0.02), 3.4, zc))); }   // farol
        const wins = Math.max(2, Math.floor(w / 2.6));
        for (let fl = 0; fl < Math.floor(h / 3); fl++) for (let k = 0; k < wins; k++) {
          const wz = zc - w / 2 + (k + 0.5) * (w / wins), wy = 1.6 + fl * 3, fx = side * (F + 0.02);
          if (fl === 0) continue;   // la planta baja la hace groundFloor
          // recerco de piedra con relieve: jambas, dintel con cornisa y alféizar
          for (const s2 of [-1, 1]) B.stone.push(colored(new THREE.BoxGeometry(0.1, 2.2, 0.16), '#e2d8c2', M4(side * (F - 0.05), wy + 0.05, wz + s2 * 0.58)));
          B.stone.push(colored(new THREE.BoxGeometry(0.12, 0.22, 1.38), '#e2d8c2', M4(side * (F - 0.06), wy + 1.2, wz)));
          B.stone.push(colored(new THREE.BoxGeometry(0.2, 0.08, 1.5), '#d4c8ae', M4(side * (F - 0.1), wy + 1.34, wz)));
          WIN[Math.floor(rnd() * 3)].push({ x: side * (F - 0.02), y: wy, z: wz, side });   // ventana con cristales y visillos
          B.wood.push(colored(new THREE.BoxGeometry(0.08, 1.9, 0.45), '#3d6a4a', M4(fx - side * 0.02, wy, wz - 0.75)));   // contraventanas
          B.wood.push(colored(new THREE.BoxGeometry(0.08, 1.9, 0.45), '#3d6a4a', M4(fx - side * 0.02, wy, wz + 0.75)));
          // balcón volado: losa con moldura, dos ménsulas debajo y barandilla de forja con pasamanos y laterales
          B.stone.push(colored(new THREE.BoxGeometry(0.95, 0.1, 1.6), '#b8ad98', M4(fx - side * 0.47, wy - 0.98, wz)));
          B.stone.push(colored(new THREE.BoxGeometry(0.85, 0.08, 1.48), '#a89c86', M4(fx - side * 0.42, wy - 1.07, wz)));
          for (const s2 of [-1, 1]) { B.stone.push(colored(new THREE.BoxGeometry(0.55, 0.16, 0.12), '#a89c86', M4(fx - side * 0.29, wy - 1.19, wz + s2 * 0.55))); B.stone.push(colored(new THREE.BoxGeometry(0.3, 0.18, 0.11), '#a89c86', M4(fx - side * 0.17, wy - 1.35, wz + s2 * 0.55))); }
          if (fl === 1) BAL.push({ fx, wy, wz, side });
          RAIL.push({ x: fx - side * 0.9, y: wy - 0.52, z: wz, side });   // barandilla de forja (frente)
          for (const s2 of [-1, 1]) RAIL.push({ x: fx - side * 0.47, y: wy - 0.52, z: wz + s2 * 0.76, side, ry: s2 > 0 ? 0 : Math.PI, sx: 0.58 });   // laterales
          B.plain.push(colored(new THREE.BoxGeometry(0.06, 0.05, 1.56), '#1c1a18', M4(fx - side * 0.9, wy - 0.08, wz)));     // pasamanos
          for (const s2 of [-1, 1]) B.plain.push(colored(new THREE.BoxGeometry(0.9, 0.05, 0.06), '#1c1a18', M4(fx - side * 0.47, wy - 0.08, wz + s2 * 0.77)));
          if (rnd() < 0.55) people.push({ x: fx - side * 0.55, y: wy - 0.95, z: wz + (rnd() - 0.5) * 0.7, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
          if (rnd() < 0.3) people.push({ x: fx - side * 0.55, y: wy - 0.95, z: wz + (rnd() - 0.5) * 0.7, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
          if (rnd() < 0.35) { const pz2 = wz + (rnd() - 0.5) * 0.9; B.plain.push(colored(new THREE.BoxGeometry(0.22, 0.2, 0.32), '#a5532e', M4(fx - side * 0.75, wy - 0.84, pz2))); B.plain.push(colored(new THREE.IcosahedronGeometry(0.2, 1), rnd() < 0.6 ? '#d81e2a' : '#f06aa0', M4(fx - side * 0.75, wy - 0.6, pz2, 0, 1, 0.7, 1.3))); B.plain.push(colored(new THREE.IcosahedronGeometry(0.17, 0), '#3f7a32', M4(fx - side * 0.72, wy - 0.68, pz2 + 0.1))); }   // geranios en el balcón
          if (rnd() < 0.25) B.plain.push(colored(new THREE.BoxGeometry(0.02, 0.9, 1.2), rnd() < 0.8 ? '#d42f2f' : '#f4efe2', M4(fx - side * 0.92, wy - 1.3, wz)));   // pañuelo colgado
        }
        z -= w;
      }
    } };
    street(HALF, 8, -L);
    // la testera de la última casa de la Estafeta, que da al callejón: ventanas con recerco y balcones, no una pared ciega
    for (const e of ends.splice(0)) for (let fl = 1; fl < Math.floor(e.h / 3); fl++) for (let k = 0; k < 3; k++) {
      const x = e.side * (e.F + 1.3 + k * 2.2), y = 1.6 + fl * 3, z = e.z - 0.02;
      WIN[(fl + k) % 3].push({ x, y, z, ry: Math.PI });
      B.stone.push(colored(new THREE.BoxGeometry(1.38, 0.22, 0.12), '#e2d8c2', M4(x, y + 1.2, z - 0.06)));
      for (const s2 of [-1, 1]) B.stone.push(colored(new THREE.BoxGeometry(0.16, 2.2, 0.1), '#e2d8c2', M4(x + s2 * 0.58, y + 0.05, z - 0.05)));
      B.stone.push(colored(new THREE.BoxGeometry(1.6, 0.1, 0.9), '#b8ad98', M4(x, y - 0.98, z - 0.45)));   // balcón
      RAIL.push({ x, y: y - 0.52, z: z - 0.9, ry: Math.PI });
      B.plain.push(colored(new THREE.BoxGeometry(1.56, 0.05, 0.06), '#1c1a18', M4(x, y - 0.08, z - 0.9)));
      if (rnd() < 0.6) people.push({ x: x + (rnd() - 0.5) * 0.6, y: y - 0.95, z: z - 0.5, ry: Math.PI });
    }
    // ---------------------------------------------------------------- el callejón de la plaza (como el de verdad)
    // la bajada hacia la plaza entre dos muros de hormigón con balaustrada de piedra arriba, desde donde mira la gente;
    // abajo, el doble vallado de postes gruesos y cuatro tablones, acuñados en el suelo, y el adoquín de hormigón gris
    const XW = HALF + 3.1, CZ0 = -L, CZ1 = -GATE + 0.6;
    const wallH = this.wallH = (z) => 2.4 + 1.5 * Math.min(1, Math.max(0, (-z - L) / (GATE - L)));   // el muro crece: la calle baja
    // caja con la base y la cima según z (para seguir la bajada)
    const sloped = (w, z0, z1, yb, yt, segs = 16) => {
      const g = new THREE.BoxGeometry(w, 1, z0 - z1, 1, 1, segs); g.translate(0, 0, (z0 + z1) / 2);
      const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const z = P.getZ(i); P.setY(i, P.getY(i) > 0 ? yt(z) : yb(z)); }
      g.computeVertexNormals(); return g;
    };
    for (const side of [-1, 1]) {
      B.plaster.push(colored(sloped(0.5, CZ0, CZ1, () => 0, wallH), '#bcb5a7', M4(side * (XW + 0.25), 0, 0)));                       // muro
      B.stone.push(colored(sloped(0.08, CZ0, CZ1, () => 0, () => 0.55), '#8f887c', M4(side * (XW - 0.03), 0, 0)));                   // zócalo
      B.stone.push(colored(sloped(0.78, CZ0, CZ1, wallH, (z) => wallH(z) + 0.15), '#d9d1c0', M4(side * (XW + 0.3), 0, 0)));           // albardilla
      B.stone.push(colored(sloped(0.36, CZ0, CZ1, (z) => wallH(z) + 0.15, (z) => wallH(z) + 0.3), '#d4ccba', M4(side * (XW + 0.3), 0, 0)));   // base de la balaustrada
      B.stone.push(colored(sloped(0.42, CZ0, CZ1, (z) => wallH(z) + 0.92, (z) => wallH(z) + 1.06), '#ddd5c4', M4(side * (XW + 0.3), 0, 0)));   // pasamanos
      B.stone.push(colored(sloped(7, CZ0, CZ1, (z) => wallH(z) - 0.3, wallH), '#a19b90', M4(side * (XW + 4.0), 0, 0)));               // acera de arriba
      // balaustres torneados y, cada cuatro metros y medio, un dado de piedra
      const bal = new THREE.LatheGeometry([[0.0, 0], [0.085, 0], [0.085, 0.05], [0.06, 0.09], [0.05, 0.16], [0.075, 0.28], [0.085, 0.36], [0.06, 0.46], [0.045, 0.52], [0.065, 0.56], [0.075, 0.62], [0, 0.62]].map(([x, y]) => new THREE.Vector2(x, y)), 8);
      for (let z = CZ0 - 0.2; z > CZ1; z -= 0.3) {
        if (((CZ0 - z) % 4.5) < 0.3) { B.stone.push(colored(new THREE.BoxGeometry(0.46, 0.95, 0.46), '#d9d1c0', M4(side * (XW + 0.3), wallH(z) + 0.6, z))); continue; }
        B.stone.push(colored(bal.clone(), '#e2dbcb', M4(side * (XW + 0.3), wallH(z) + 0.3, z)));
      }
      // arriba, gente asomada a la balaustrada
      for (let z = CZ0 - 1; z > CZ1 + 1; z -= 0.75) if (rnd() < 0.6) people.push({ x: side * (XW + 0.85 + rnd() * 0.7), y: wallH(z), z: z + rnd() * 0.3, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
    // plátanos en la acera de arriba de un lado (el paseo) y, detrás, las casas de la ciudad
    for (let z = CZ0 - 3; z > CZ1 + 2; z -= 6.5) {
      const x = -(XW + 5.2), y = wallH(z);
      B.wood.push(colored(new THREE.CylinderGeometry(0.16, 0.24, 4.2, 7), '#8d8170', M4(x, y + 2.1, z)));
      for (let k = 0; k < 5; k++) B.leaf.push(colored(new THREE.IcosahedronGeometry(1.5 + rnd() * 0.6, 2), ['#4f7a35', '#5d8a3e', '#46702f'][k % 3], M4(x + (rnd() - 0.5) * 2.2, y + 4.6 + rnd() * 1.6, z + (rnd() - 0.5) * 2.4, rnd() * 3, 1, 0.8, 1)));
    }
    street(XW + 11, -L - 1, -GATE + 7);
    // el doble vallado: postes de 24 cm cada dos metros metidos en el suelo con cuñas, cuatro tablones por el lado de
    // los corredores, y arriba una tabla donde se sienta la gente
    const PLANK = ['#a9a398', '#9d968a', '#b2ab9f', '#958e82', '#a39b8d'];
    for (let z = CZ0; z > CZ1; z -= 2.0) for (const s of [-1, 1]) for (const fx of [HALF, HALF + 1.4]) {
      B.wood.push(colored(new THREE.BoxGeometry(0.24, 2.0, 0.24), '#857c70', M4(s * (fx + 0.12), 1.0, z)));
      B.plain.push(colored(new THREE.BoxGeometry(0.42, 0.025, 0.42), '#3c3b38', M4(s * (fx + 0.12), 0.012, z)));   // el hueco del suelo, con su tapa
      for (const dz of [-1, 1]) B.wood.push(colored(new THREE.BoxGeometry(0.05, 0.14, 0.16), '#b08a5a', M4(s * (fx + 0.12), 0.07, z + dz * 0.15, 0, 1, 1, 1)));   // cuñas
      if (z - 2.0 > CZ1 - 0.4) for (const [k, y] of [0.42, 0.84, 1.26, 1.68].entries()) B.wood.push(colored(new THREE.BoxGeometry(0.07, 0.21, 2.0), PLANK[(Math.abs(Math.round(z)) + k) % PLANK.length], M4(s * (fx - 0.035), y, z - 1.0)));
      if (fx > HALF && z - 2.0 > CZ1 - 0.4) B.wood.push(colored(new THREE.BoxGeometry(0.3, 0.06, 2.0), '#a39b8d', M4(s * (fx + 0.12), 2.03, z - 1.0)));   // tabla de arriba
    }
    // el suelo del callejón: adoquín de hormigón gris en zigzag (encima del de la Estafeta)
    {
      const PT = this.paverT = paverSet([2 * XW / 1.8, (CZ0 - CZ1) / 1.8]);
      const pv = new THREE.Mesh(new THREE.PlaneGeometry(2 * XW, CZ0 - CZ1), new THREE.MeshStandardMaterial({ ...PT, roughness: 1, normalScale: new THREE.Vector2(1, 1) }));
      pv.rotation.x = -Math.PI / 2; pv.position.set(0, 0.006, (CZ0 + CZ1) / 2); pv.receiveShadow = true; S.add(pv);
    }
    // público en el callejón: de pie entre el vallado y el muro, y sentado encima de la valla de fuera
    for (let z = -L - 1; z > -GATE + 3; z -= 0.8) for (const s of [-1, 1]) {
      if (rnd() < 0.55) people.push({ x: s * (HALF + 2.0 + rnd() * 0.8), y: 0, z: z + rnd() * 0.4, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2, s: 1.5 });
      if (rnd() < 0.3) sitters.push({ x: s * (HALF + 1.52), y: 2.06, z, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 });   // sentados en lo alto de la valla
    }
    // cámaras de televisión: en balcones del primer piso, cada unos 40 m y alternando la acera, y una en una tarima
    // junto a la puerta de la plaza; con su operador o su operadora detrás
    this.tv = [];
    const tvAt = (x, y, z, side) => {
      const ry = side > 0 ? -Math.PI / 2 : Math.PI / 2, M = (g, c, dx, dy, dz, rx = 0, rz = 0) => B.plain.push(colored(g, c, new THREE.Matrix4().compose(new THREE.Vector3(x + dx, y + dy, z + dz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1))));
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + (side > 0 ? 0 : Math.PI); M(new THREE.CylinderGeometry(0.02, 0.025, 1.25, 5), '#2a2a2c', Math.cos(a) * 0.17, 0.6, Math.sin(a) * 0.17, Math.sin(a) * 0.28, -Math.cos(a) * 0.28); }   // trípode con las patas abiertas
      M(new THREE.BoxGeometry(0.62, 0.36, 0.3), '#3a3d42', -side * 0.05, 1.32, 0);                       // cuerpo
      M(new THREE.CylinderGeometry(0.11, 0.13, 0.4, 12), '#1a1a1c', -side * 0.45, 1.34, 0, 0, Math.PI / 2);   // objetivo
      M(new THREE.BoxGeometry(0.2, 0.14, 0.18), '#22262a', side * 0.1, 1.58, 0);                         // visor
      M(new THREE.BoxGeometry(0.05, 0.05, 0.05), '#ff2020', -side * 0.2, 1.53, 0);                       // piloto rojo
      M(new THREE.BoxGeometry(0.02, 0.09, 0.16), '#e8e4dc', -side * 0.05, 1.32, 0.16);                   // placa «TV»
      for (let i = people.length - 1; i >= 0; i--) if (Math.hypot(people[i].x - x, people[i].z - z) < 0.9 && Math.abs(people[i].y - y) < 1.5) people.splice(i, 1);
      people.push({ x: x + side * 0.42, y: y + 0.05, z: z + 0.15, ry });
      this.tv.push(new THREE.Vector3(x - side * 0.7, y + 1.34, z));
    };
    let lastTv = 99, tvSide = -1;
    for (const b of [...BAL].sort((a, c) => c.wz - a.wz)) {
      if (b.wz > -12 || b.wz < -L + 4 || lastTv - b.wz < 40 || b.side !== tvSide) continue;
      tvAt(b.fx - b.side * 0.5, b.wy - 0.93, b.wz, b.side); lastTv = b.wz; tvSide = -tvSide;
    }
    tvAt(XW + 1.0, wallH(-GATE + 9), -GATE + 9, 1);   // la de la entrada, arriba en la balaustrada
    // la plaza de toros, con el túnel por el que entra el encierro
    const PZ = this.plaza = buildPlaza(B, colored, M4, -GATE, HALF, rnd);
    // cada material con su textura, relieve y rugosidad (una llamada de dibujo por material)
    const T = { plaster: plasterSet(), stone: ashlarSet(), wood: woodSet(), brick: brickSet() };
    this.texs = Object.values(T).flatMap(t => Object.values(t)).concat(Object.values(this.cobbleT), Object.values(this.paverT), [this.sandT]);
    const mats = {
      plaster: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, ...T.plaster, normalScale: new THREE.Vector2(0.8, 0.8) }),
      stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, ...T.stone }),
      wood: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, ...T.wood }),
      brick: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, ...T.brick }),
      plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }),
      leaf: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    };
    for (const k in B) { if (!B[k].length) continue; const city = new THREE.Mesh(mergeGeometries(B[k]), mats[k]); city.castShadow = city.receiveShadow = true; S.add(city); }
    const mat = mats.plaster;
    // ventanas, barandillas y bajos (bares, tiendas y portales): planos dibujados, una llamada por dibujo
    const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), scl = new THREE.Vector3();
    const inst = (map, w, h, list, extra = {}) => {
      if (!list.length) return; this.texs.push(map);
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.55, ...extra }), list.length);
      list.forEach((o, i) => im.setMatrixAt(i, m4.compose(v3.set(o.x, o.y, o.z), q.setFromEuler(e.set(0, o.ry ?? -o.side * Math.PI / 2, 0)), scl.set(o.sx || 1, o.sy || 1, 1))));
      im.receiveShadow = true; S.add(im);
    };
    WIN.forEach((l, i) => inst(windowTex(i), 1.0, 1.9, l, { roughness: 0.25, metalness: 0.1 }));
    inst(railingTex(), 1.5, 0.85, RAIL, { transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
    for (const k of SHOPS) inst(shopTex(k), 2.3, 2.9, SHOP[k], k === 'persiana' ? { roughness: 0.45, metalness: 0.55 } : {});
    inst(archTex(), 1, 4.2, PZ.arches.map(o => ({ ...o, sx: o.w })), { alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    inst(flagNavarraTex(), 1.6, 1.0, PZ.flags, { side: THREE.DoubleSide, roughness: 0.8 });
    for (const o of PZ.flags) B.plain.push(colored(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 5), '#3a3530', M4(o.x, o.y - 0.6, o.z)));
    // banderines de fiestas cruzando la calle de balcón a balcón
    {
      const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0], 3)); tri.computeVertexNormals();
      const list = [], cols = ['#d42f2f', '#ffffff', '#2e8a3e', '#d42f2f', '#ffffff', '#e8c04a'].map(c => new THREE.Color(c));
      for (let z = -6; z > -L + 4; z -= 11) {
        const y0 = 7.6 + (Math.abs(z) % 3);
        for (let k = 0; k <= 16; k++) { const t = k / 16, x = -HALF + t * 2 * HALF, sag = Math.sin(t * Math.PI) * 0.9; list.push({ x, y: y0 - sag, z: z + Math.sin(k) * 0.05, c: cols[k % cols.length] }); }
      }
      const fl = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), list.length);
      list.forEach((o, i) => { fl.setMatrixAt(i, m4.makeTranslation(o.x, o.y, o.z)); fl.setColorAt(i, o.c); });
      S.add(fl);
      const cord = [];   // cordel
      for (let z = -6; z > -L + 4; z -= 11) { const y0 = 7.6 + (Math.abs(z) % 3); for (let k = 0; k < 16; k++) { const t0 = k / 16, t1 = (k + 1) / 16; cord.push(-HALF + t0 * 2 * HALF, y0 - Math.sin(t0 * Math.PI) * 0.9, z, -HALF + t1 * 2 * HALF, y0 - Math.sin(t1 * Math.PI) * 0.9, z); } }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cord, 3));
      S.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: '#3a3530' })));
    }
    // placas de la calle en las dos aceras, al principio
    for (const [s, z] of [[-1, -4], [1, -40], [-1, -120]]) inst(plaqueTex(), 0.8, 0.4, [{ x: s * (HALF - 0.03), y: 3.4, z, side: s }]);
    // la entrada: banda roja con el nombre sobre el hueco, carteles a los lados y «RESERVADO PRENSA» en una tabla
    { const bt = bandTex(); this.texs.push(bt); const b = PZ.band; const m = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.7 })); m.position.set(b.x, b.y, b.z); S.add(m); }
    PZ.boards.forEach((o, i) => { const t = boardTex(o.kind); this.texs.push(t); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.7), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); m.position.set(o.x, o.y, o.z); S.add(m); });
    { const t = stencilTex(); this.texs.push(t); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.2), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, depthWrite: false })); m.position.set(HALF - 0.073, 1.26, -GATE + 7); m.rotation.y = -Math.PI / 2; S.add(m); }
    // público: personajes de verdad (de blanco y rojo casi todos) dibujados en una lámina; en los balcones, en el
    // callejón y en los tendidos de la plaza, una llamada de dibujo para cada grupo
    // todos a la misma escala que los corredores (antes el público era más pequeño)
    const crowd = crowd3d(people.map(p => [p.x, p.y - 0.1, p.z, p.ry]), 'toros', 1.6); S.add(crowd); this.crowd = crowd;
    const seated = this.plaza.seats.concat(sitters);
    // (sentados: los pies delante y por debajo del asiento)
    const stands = crowd3d(seated.map(p => [p.x + Math.sin(p.ry) * 0.38, p.y - 0.59, p.z + Math.cos(p.ry) * 0.38, p.ry]), 'toros', 1.55, { sit: true }); S.add(stands); this.stands = stands;
    this.camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 72 : 58, innerWidth / innerHeight, 0.2, 400);
    this.onResize = () => { this.camera.aspect = innerWidth / innerHeight; this.camera.fov = innerWidth < innerHeight ? 72 : 58; this.camera.updateProjectionMatrix(); };
    addEventListener('resize', this.onResize);
  }

  // corredores (el jugador y los demás, todos de blanco y rojo), toros y cabestros
  async spawn() {
    await preloadAnimals(['bull', 'cabestro']);   // toros y cabestros (se descargan al empezar el encierro)
    const S = this.scene, rnd = mulberry(11), av = this.G.P.avatar, def = GLB_AVATARS[av];
    const white = { shirt: '#f7f3ea', pants: '#f7f3ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#efe6d0', espadrille: true };
    // el protagonista se pone su ropa de San Fermín (el modelo vestido de blanco y rojo); los aventureros, de blanco y rojo
    // el jugador y los demás corredores son el mismo personaje de San Fermín (blanco y rojo, todos del mismo tamaño);
    // si no carga, los vecinos vestidos de blanco y rojo
    let sf = null; try { sf = await loadMeshy('sanfermin'); } catch (e) { console.warn('corredor', e); }
    const sanfermin = (k = 1) => {
      const char = new GlbChar(sf, MESHY_GAIT); char.root.scale.setScalar((sf.userData.fit || 1) * k);
      const obj = new THREE.Group(); obj.add(char.root); obj.userData.H = 1.6 * k;
      return { obj, char, anim: { update: (dt, st) => { char.setSpeed(st.speed || 0); char.update(dt); } } };
    };
    let me = sf ? sanfermin() : null;
    me ||= buildNpc({ ...white, base: def?.kaykit, female: ['Rogue', 'Rogue_Hooded', 'Mage'].includes(def?.kaykit), height: 1.6 });
    S.add(me.obj); this.me = { ...me, x: 0, z: -14, speed: 0, fall: 0, safe: 0 };
    this.runners = [];
    const nR = QUALITY === 'low' ? 7 : 12;
    for (let i = 0; i < nR; i++) {
      const f = rnd() < 0.3, n = sf ? sanfermin(0.97 + rnd() * 0.06) : buildNpc({ ...white, female: f, ponytail: f, hair: ['#2a1a12', '#5a3a22', '#c9a46a', '#1d1d24'][i % 4], skin: ['#f1c4a0', '#e2b08a', '#c68a5e'][i % 3], height: 1.57 + rnd() * 0.06 });
      S.add(n.obj); this.runners.push({ ...n, x: (rnd() - 0.5) * 4.6, z: -6 - rnd() * 70, speed: 4.6 + rnd() * 1.6, want: 0 });
    }
    // la manada: cabestros y toros juntos; luego un toro suelto que se ha quedado atrás (el más peligroso)
    this.bulls = [];
    // la manada estirada por la calle (unos 5 m entre animales, cada uno a su ritmo) y un toro suelto que se ha quedado
    // atrás, el más peligroso
    const herd = [['cabestro', -0.9], ['bull', 0.8], ['bull', -0.6], ['cabestro', 1.0], ['bull', -1.1], ['bull', 0.3], ['cabestro', -0.2], ['bull', 1.0]];
    herd.forEach(([k, x], i) => this.bulls.push(this.makeBeast(k, x, 14 + i * (4.2 + rnd() * 2.6), 7.0 + rnd() * 0.9, i * 0.35)));
    this.bulls.push(this.makeBeast('bull', 0.3, 60, 8.1, 9));
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
    h.innerHTML = `<div class="enc-top"><div class="enc-hearts"></div><div class="enc-bar"><i></i><b>Plaza</b></div></div><div class="enc-msg"></div><div class="enc-warn">¡Toro detrás! Apártate</div><div class="enc-help">${this.G.input.touch ? 'Dedo a los lados: esquivar · arriba: correr · SALTAR los caídos · PERIÓDICO para guiar al toro' : 'A / D esquivar · W o Mayús correr · Espacio saltar · P periódico · C cámara'}</div>
      <div class="enc-btns"><button class="enc-b enc-jump" data-k="jump">SALTAR</button><button class="enc-b enc-paper" data-k="paper">PERIÓDICO</button></div>
      <button class="enc-cam" data-k="cam">CÁMARA</button><button class="enc-quit" data-k="quit" aria-label="Salir del encierro">✕</button><div class="enc-live"><i></i>EN DIRECTO</div>`;
    document.body.appendChild(h);
    for (const b of h.querySelectorAll('[data-k]')) b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); const k = b.dataset.k; if (k === 'quit') { this.finish(false, true); return; } if (k === 'jump') this.jumpQ = true; if (k === 'paper') this.paperQ = true; if (k === 'cam') this.nextCam(); });
  }
  msg(t, ms = 1800) { const m = this.h?.querySelector('.enc-msg'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(this.mt); this.mt = setTimeout(() => m.classList.remove('on'), ms); }

  // entra en la escena y devuelve una promesa que se resuelve al llegar a la plaza (o al rendirse)
  run() {
    const G = this.G;
    return new Promise(async (res) => {
      this.res = res;
      G.ui.hudVisible(false); G.player.frozen = true;
      await G.ui.fadeOut?.();
      // si la escena no se puede montar (un modelo que no llega, el móvil sin memoria), se vuelve al pueblo en vez de
      // quedarse con la pantalla en negro y el jugador quieto
      try { this.build(); await this.spawn(); this.hud(); }
      catch (e) {
        console.warn('encierro', e); try { this.dispose(); } catch { /* lo que haya */ }
        G.altScene = null; G.altCamera = null; G.altUpdate = null; G.encierro = null; G.mode = 'play'; G.player.frozen = false; G.ui.hudVisible(true);
        await G.ui.fadeIn?.(); G.ui.toast?.('No se ha podido preparar el encierro. Prueba otra vez en un momento.'); res({ win: false, error: true }); return;
      }
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
    // el público salta y saluda: poco antes del cohete, mucho al paso de la manada (el foco va con el primer toro)
    const lead = this.bulls?.filter(b => !b.out).reduce((m, b) => Math.min(m, b.z), 1e9);
    this.crowd?.tick(this.t, this.won ? 1 : this.started ? 1 : 0.4, this.started && lead < 1e9 ? lead : (this.me?.z ?? 0), this.camera);
    // los tendidos se levantan cuando la manada entra en el ruedo
    this.stands?.tick(this.t, this.won ? 1 : lead < -GATE ? 0.9 : 0.3, this.plaza?.cz ?? 0, this.camera);
    if (!this.started || this.done) { if (this.done) this.settle(dt); this.place(dt); this.cam(dt); return; }
    // jugador: corre solo hacia la plaza; adelante = más rápido, atrás = más despacio, a los lados = esquivar
    const fy = inp.move.y, fx = inp.move.x;
    if (inp.consume(' ')) this.jumpQ = true;
    if (inp.consume('p')) this.paperQ = true;
    if (inp.consume('c')) this.nextCam();
    // salto (para pasar por encima de los que se han caído)
    if (this.jumpQ) { this.jumpQ = false; if (!(me.jump > 0) && me.fall <= 0) { me.jump = 0.62; me.char.playOnce?.('Jump_Start', 0.2); this.G.sound.jump?.(); } }
    if (me.jump > 0) me.jump -= dt;
    me.y = me.jump > 0 ? Math.sin((1 - me.jump / 0.62) * Math.PI) * 0.75 : 0;
    // el periódico: como hacen los corredores, se agita delante del toro para que lo siga y no al corredor
    this.paperCd = Math.max(0, (this.paperCd || 0) - dt);
    if (this.paperQ) { this.paperQ = false;
      const b = this.bulls.filter(b => b.kind === 'bull' && !b.out && b.z > me.z && b.z - me.z < 9).sort((a, c) => a.z - c.z)[0];
      if (this.paperCd > 0) this.msg(`El periódico, en ${Math.ceil(this.paperCd)} s`, 900);
      else if (b) { this.paperCd = 8; b.lure = 1.6; b.lureX = me.x > 0 ? -1.4 : 1.4; me.char.playOnce?.('Wave', 0.6); this.msg('¡Bien! El toro sigue el periódico y se aparta de ti', 1800); this.closeCall += 0.4; }
      else this.msg('El periódico sirve cuando un toro está justo detrás', 1200); }
    if (me.fall > 0) { me.fall -= dt; me.speed = Math.max(0, me.speed - dt * 12); }
    else { const want = (inp.run || fy > 0.35) ? 7.2 : fy < -0.35 ? 3.0 : 5.3; me.speed += (want - me.speed) * Math.min(1, dt * 3); me.x += fx * 3.8 * dt; }
    me.x = Math.max(-HALF + 0.45, Math.min(HALF - 0.45, me.x)); me.z -= me.speed * dt; me.safe -= dt;
    // otros corredores: corren, y se apartan a la pared si llega un toro
    for (const r of this.runners) {
      const z0 = r.z, x0 = r.x;
      if (this.arena(r, dt)) { r.v = Math.hypot(r.z - z0, r.x - x0) / dt; continue; }
      const b = this.bulls.find(b => !b.out && b.z > r.z && b.z - r.z < 7 && Math.abs(b.x - r.x) < 1.6);
      r.want = b ? Math.sign(r.x || 1) * (HALF - 0.5) : r.want;
      if (!b && Math.random() < dt * 0.3) r.want = (Math.random() - 0.5) * 4;
      // algunos corredores tropiezan y caen delante: hay que esquivarlos o saltarlos
      if (r.fallen > 0) { r.fallen -= dt; if (r.fallen <= 0) r.char?.playOnce?.('Jump_Start', 0.3); }
      else {
        if (!this.fallT) this.fallT = 4; this.fallT -= dt / this.runners.length;
        if (this.fallT <= 0 && r.z < me.z - 7 && r.z > me.z - 16 && Math.abs(r.x - me.x) < 1.6) { this.fallT = 5 + Math.random() * 4; r.fallen = 3 + Math.random(); this.msg('¡Se ha caído un corredor! Sáltalo (SALTAR) o esquívalo', 2000); }
        else { r.x += Math.max(-3, Math.min(3, (r.want - r.x) * 2)) * dt; r.z -= r.speed * dt; }
      }
      r.v = r.fallen > 0 ? 0 : Math.hypot(r.z - z0, r.x - x0) / dt;
      // el jugador no atraviesa a los demás
      const dx = me.x - r.x, dz = me.z - r.z, d = Math.hypot(dx, dz);
      if (r.fallen > 0) {   // caído en el suelo: si no saltas, tropiezas
        if (Math.abs(dz) < 0.7 && Math.abs(dx) < 0.75 && !(me.y > 0.25) && me.fall <= 0 && !r.jumped) { r.jumped = true; me.speed *= 0.25; me.fall = 0.45; this.msg('¡Tropiezas con el caído! Pulsa SALTAR para pasar por encima', 1600); }
        else if (Math.abs(dz) < 0.7 && Math.abs(dx) < 0.75 && me.y > 0.25 && !r.jumped) { r.jumped = true; this.msg('¡Buen salto!', 900); }
        continue;
      }
      r.jumped = false;
      if (d < 0.7 && d > 1e-3) { me.x += dx / d * (0.7 - d) * 0.8; if (dz > 0) me.speed *= 0.97; }
    }
    // toros y cabestros: corren en manada hacia la plaza haciendo eses; el que choca con el jugador lo tira
    let warn = false, near = 99;
    for (const d of this.dust) if (d.life > 0) { d.life -= dt * 0.9; d.sp.position.y += d.vy * dt; const k = 1 - d.life; d.sp.scale.setScalar(d.s0 + k * 1.6); d.sp.material.opacity = Math.max(0, d.life) * 0.55; if (d.life <= 0) d.sp.visible = false; }
    for (const b of this.bulls) {
      if (!this.moveBull(b, dt)) continue;
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
    this.place(dt); this.cam(dt);
  }
  // un toro o cabestro avanza: por la calle haciendo eses, y en el ruedo derecho a la puerta de toriles, por la que
  // entra a los corrales (allí desaparece). Devuelve false si aún no ha salido o ya está dentro
  moveBull(b, dt) {
    if (this.t < 2.8 + b.delay || b.out) return false;
    b.ph += dt * 6;
    const T = this.plaza.toril, inRing = b.z < -GATE - (RO - RA - 1.6);
    if (inRing) b.x0 *= Math.max(0, 1 - dt * 1.6);   // en el ruedo se juntan hacia la puerta
    // la manada va por el centro haciendo eses: pegarse a la pared es la forma de salvarse (como en la realidad)
    b.x = b.x0 + Math.sin(this.t * 0.7 + b.x0 * 2) * (inRing ? 0.2 : 0.55); b.x = Math.max(-1.45, Math.min(1.45, b.x));
    if (b.lure > 0) { b.lure -= dt; b.lx = (b.lx ?? b.x) + ((b.lureX ?? b.x) - (b.lx ?? b.x)) * Math.min(1, dt * 3); b.x = b.lx; } else b.lx = b.x;
    // amago de embestida: un toro que tiene a alguien justo delante baja la cabeza, tira un derrote hacia ese lado y
    // acelera un instante; luego sigue su camino (como en la calle de verdad)
    b.feintCd = Math.max(0, (b.feintCd ?? 2 + Math.random() * 3) - dt);
    if (b.kind === 'bull' && !inRing && !(b.feint > 0) && b.feintCd <= 0) {
      const tgt = [this.me, ...this.runners].find(r => r && !(r.fallen > 0) && b.z - r.z > 2.2 && b.z - r.z < 6.5 && Math.abs(r.x - b.x) < 1.9);
      if (tgt) { b.feint = 0.7; b.feintDir = Math.sign(tgt.x - b.x) || 1; b.feintCd = 3 + Math.random() * 4; }
    }
    if (b.feint > 0) { b.feint -= dt; const k = Math.sin(Math.max(0, 1 - b.feint / 0.7) * Math.PI); b.x += b.feintDir * k * 0.9; b.x = Math.max(-1.45, Math.min(1.45, b.x)); b.charge = 1; }   // pegado a la pared sigues a salvo
    b.z -= b.speed * (b.feint > 0 ? 1.18 : 1) * dt;
    if (b.z < T.z - 4.5) { b.out = true; b.q.root.visible = false; if (this.bulls.every(q => q.out)) { this.bullsIn = true; this.msg?.('¡Cuarto cohete! Los toros ya están en los corrales.', 2200); } return false; }
    if (Math.random() < dt * 9) this.puff(b.x, b.z + 0.8);
    return true;
  }
  // en el ruedo: cada corredor busca un sitio a un lado (lejos del paso de los toros), frena y se queda quieto
  arena(r, dt) {
    const cz = this.plaza.cz;
    if (r.z > -GATE - (RO - RA - 1.6) - 1) return false;
    if (!r.spot) { const side = r.x >= 0 ? 1 : -1; r.spot = { x: side * (4.5 + Math.random() * 9), z: cz + RA * 0.55 - Math.random() * RA * 0.9 }; }
    const dx = r.spot.x - r.x, dz = r.spot.z - r.z, d = Math.hypot(dx, dz);
    r.speed = Math.max(0, Math.min(r.speed, d * 1.2, 5)); if (d < 0.4) { r.speed = 0; if (!r.cheered) { r.cheered = true; r.char?.playOnce?.('Celebrate', 1.6); } }
    if (d > 1e-3) { r.x += dx / d * r.speed * dt; r.z += dz / d * r.speed * dt; r.face = Math.atan2(dx, dz); }
    return true;
  }
  // al acabar (en la plaza o tras la última caída): el jugador frena, los corredores se reparten por el ruedo y los toros
  // terminan de entrar en los corrales; nadie se queda corriendo en el sitio
  settle(dt) {
    const me = this.me;
    me.speed = Math.max(0, me.speed - dt * (this.won ? 4 : 14)); me.z -= me.speed * dt;
    for (const r of this.runners) { const z0 = r.z, x0 = r.x; if (!this.arena(r, dt)) r.speed = 0; r.v = Math.hypot(r.z - z0, r.x - x0) / dt; }
    for (const b of this.bulls) this.moveBull(b, dt);
  }
  hit(b) {
    const me = this.me; this.lives--; me.fall = 1.3; me.safe = 3.2;
    this.G.sound.ui?.('error'); this.msg(this.lives > 0 ? (b.kind === 'bull' ? '¡Te ha alcanzado un toro! Pégate a la pared cuando pasen.' : '¡Un cabestro te ha arrollado! Apártate.') : '¡Uf! Mejor verlo desde el balcón.', 2400);
    me.char.playOnce?.('Scared', 1.2);
    if (this.lives <= 0) setTimeout(() => this.finish(false), 1400);
  }
  // coloca a todos (los cuadrúpedos con su galope)
  place(dt = 1 / 60) {
    const me = this.me; dt = Math.min(dt, 0.1);
    me.obj.position.set(me.x, me.y || 0, me.z); me.obj.rotation.y = Math.PI;
    me.anim.update(dt, { speed: me.fall > 0 || !this.started ? 0 : me.speed });
    if (me.fall > 0) me.obj.rotation.x = -Math.min(1.2, (1.3 - me.fall) * 4) * 0.35; else me.obj.rotation.x = 0;
    for (const r of this.runners) { const f = r.fallen > 0; r.obj.position.set(r.x, f ? 0.22 : 0, r.z); r.obj.rotation.set(f ? -Math.PI / 2 + 0.15 : 0, r.face ?? Math.PI, 0); r.anim.update(dt, { speed: this.started && !f ? (r.v || 0) : 0 }); }
    for (const b of this.bulls) {
      const q = b.q, run = this.started && this.t > 2.8 + b.delay && !b.out, ph = b.ph;
      const off = [0.46, 0.58, 0.0, 0.12];
      if (b.A) { q.root.position.set(b.x, 0, b.z); q.root.rotation.y = Math.PI + (b.feint > 0 ? -b.feintDir * 0.35 * Math.sin(Math.max(0, 1 - b.feint / 0.7) * Math.PI) : 0); b.A.update(dt, { speed: run ? b.speed : 0, alt: !this.started, attack: run && b.feint > 0 }); continue; }
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
    // ya en el ruedo: la cámara sube y gira despacio para enseñar la plaza llena
    if (this.won) {
      this.orb = (this.orb || 0) + dt * 0.18; const cz = this.plaza.cz, a = this.orb, k = Math.min(1, this.orb * 1.5);
      const want = new THREE.Vector3(Math.sin(a) * 15 * k + me.x * (1 - k), 3.3 + 7 * k, cz + (me.z + 7.2 - cz) * (1 - k) + Math.cos(a) * 15 * k);
      c.position.lerp(want, Math.min(1, dt * 3)); c.lookAt(0, 2.5 * k + 1.3 * (1 - k), cz * k + (me.z - 7) * (1 - k)); return;
    }
    // cámaras: detrás del corredor, desde un balcón, aérea o mirando atrás a la manada
    let M = this.camMode || 'detras';
    // cámara de la tele: la más cercana por delante del corredor, que lo sigue (como en la retransmisión)
    if (M === 'tele') {
      const tv = this.tv.filter(p => p.z < me.z + 6).sort((a, b) => b.z - a.z)[0] || this.tv[this.tv.length - 1];
      if (tv && tv !== this.tvCur) { this.tvCur = tv; this.camCur = null; }
      if (tv) { c.position.copy(tv); c.lookAt(me.x, 1.1, me.z); return; }
      M = 'detras';
    }
    const want = M === 'balcon' ? new THREE.Vector3(HALF * 0.9, 7.5, me.z + 4) : M === 'aerea' ? new THREE.Vector3(0, 25, me.z + 10) : M === 'toros' ? new THREE.Vector3(me.x * 0.6, 2.4, me.z - 5.5) : new THREE.Vector3(me.x * 0.6, 3.3, me.z + 7.2);
    const look = M === 'balcon' ? new THREE.Vector3(me.x, 1.0, me.z - 4) : M === 'aerea' ? new THREE.Vector3(me.x * 0.4, 0, me.z - 6) : M === 'toros' ? new THREE.Vector3(me.x * 0.5, 1.2, me.z + 8) : new THREE.Vector3(me.x * 0.5, 1.3, me.z - 7);
    if (!this.camCur) this.camCur = want.clone(); else this.camCur.lerp(want, Math.min(1, dt * 5));
    c.position.copy(this.camCur);
    if (me.fall > 0) c.position.y += Math.sin(this.t * 40) * 0.05;
    if (this.shake > 0) { c.position.x += (Math.random() - 0.5) * this.shake; c.position.y += (Math.random() - 0.5) * this.shake; }
    c.lookAt(look);
  }

  nextCam() {
    const L = ['detras', 'balcon', 'aerea', 'toros', 'tele'], i = L.indexOf(this.camMode || 'detras');
    this.camMode = L[(i + 1) % L.length]; this.camCur = null; this.tvCur = null;
    this.h?.querySelector('.enc-live')?.classList.toggle('on', this.camMode === 'tele');
    this.msg({ detras: 'Cámara: detrás del corredor', balcon: 'Cámara: desde el balcón', aerea: 'Cámara: aérea', toros: 'Cámara: mirando a los toros', tele: 'Cámara: la de la tele' }[this.camMode], 1100);
  }
  async finish(win, quit = false) {
    if (this.done) return; this.done = true; this.won = win; if (win) { this.stands?.cheer(true); this.crowd?.cheer(true); setTimeout(() => this.me?.char?.playOnce?.('Celebrate', 2.4), 900); }
    const G = this.G;
    this.h?.querySelector('.enc-warn')?.classList.remove('on');
    if (win) { G.sound.fanfare?.(); this.msg(this.closeCall > 1.2 ? '¡En la plaza! Y corriste muy cerca de los toros.' : '¡En la plaza! ¡Lo has conseguido!', 2600); }
    this.h?.querySelector('.enc-help')?.remove();
    await new Promise(r => setTimeout(r, win ? 5000 : quit ? 200 : 1800));   // tiempo para ver la plaza llena mientras la cámara gira
    if (this.h) this.h.style.display = 'none';   // sin avisos encima de las tarjetas
    if (!quit) for (const f of (win ? FACTS : FACTS.slice(-1))) await infoCard(G.ui, { icon: 'bull', kicker: 'San Fermín', title: f.title, text: f.text, button: 'Seguir' });
    await G.ui.fadeOut?.();
    this.dispose();
    G.altScene = null; G.altCamera = null; G.altUpdate = null; G.encierro = null; G.mode = 'play'; G.player.frozen = false; G.ui.hudVisible(true);
    await G.ui.fadeIn?.();
    this.res({ win, close: this.closeCall, quit });
  }
  dispose() {
    removeEventListener('resize', this.onResize);
    this.h?.remove(); if (!this.scene) return;
    this.scene.traverse(o => { if (o.isSkinnedMesh) o.skeleton?.dispose(); });
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { m.map?.dispose(); m.dispose(); } });
    this.sun.shadow.map?.dispose(); for (const t of this.texs || []) t.dispose(); this.dustTex?.dispose();
    for (const n of [this.me, ...this.runners]) n.char?.dispose?.();
    this.scene = null;
  }
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
