// El campo trabajando: tractores (algunos en marcha), cosechadoras, pacas, remolques de uva, según el cultivo
// de cada parcela. Modelos de diseño propio y genérico (sin marcas). Al acercarse se puede ver cómo se hacía
// antes y cómo se hace ahora.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fieldInfo, PLACES, HALF } from './layout.js';
import { terrainHeight, groundHeight } from './heightfield.js';
import { addBox } from './colliders.js';
import { TOWN } from './townBuilder.js';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.15 });
const GLASS = new THREE.MeshStandardMaterial({ color: '#3a4a58', roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 });
const WHEEL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

const tint = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const part = (geo, hex, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return tint(g, hex); };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, n = 12) => new THREE.CylinderGeometry(r1, r2, h, n);

// rueda de tractor: neumático con tacos y llanta de color
function wheel(r, w, rim) {
  const parts = [part(cyl(r, r, w, 20), '#26262a', 0, 0, 0, 0, 0, Math.PI / 2), part(cyl(r * 0.62, r * 0.62, w + 0.02, 16), rim, 0, 0, 0, 0, 0, Math.PI / 2), part(cyl(r * 0.18, r * 0.18, w + 0.06, 8), '#4a4a4a', 0, 0, 0, 0, 0, Math.PI / 2)];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; parts.push(part(box(w * 0.9, 0.08, 0.12), '#1c1c20', 0, Math.cos(a) * r, Math.sin(a) * r, a)); }
  const m = new THREE.Mesh(mergeGeometries(parts), WHEEL); m.castShadow = true; return m;
}

// Tractor: capó, cabina con cristales, ruedas grandes detrás y pequeñas delante. Mira hacia +z.
export function tractor(color = '#3f8a3a', implement = null) {
  const g = new THREE.Group(), P = [];
  P.push(part(box(0.9, 0.45, 2.6), '#2c2c30', 0, 0.75, 0.2));                       // bastidor
  P.push(part(box(0.86, 0.75, 1.5), color, 0, 1.25, 0.85));                          // capó
  P.push(part(box(0.8, 0.12, 1.45), color, 0, 1.66, 0.85));
  P.push(part(box(0.7, 0.5, 0.06), '#202024', 0, 1.2, 1.61));                        // rejilla
  for (const s of [-1, 1]) P.push(part(box(0.12, 0.08, 0.04), '#fff6c8', s * 0.3, 1.5, 1.62));   // faros
  P.push(part(cyl(0.05, 0.05, 0.9, 8), '#3a3a3a', 0.28, 2.05, 1.25));                // tubo de escape
  P.push(part(box(1.1, 0.1, 1.3), '#2c2c30', 0, 1.05, -0.55));                       // piso de cabina
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(part(box(0.06, 1.45, 0.06), '#202024', sx * 0.52, 1.8, -0.55 + sz * 0.6));
  P.push(part(box(1.22, 0.1, 1.42), color, 0, 2.55, -0.55));                         // techo
  P.push(part(box(0.5, 0.12, 0.45), '#3a3a3a', 0, 1.35, -0.75));                     // asiento
  P.push(part(cyl(0.16, 0.16, 0.04, 12), '#202024', 0, 1.75, -0.2, 1.0));            // volante
  for (const s of [-1, 1]) P.push(part(box(0.45, 0.06, 1.2), color, s * 0.78, 1.72, -0.6));   // guardabarros
  if (implement === 'plough') {
    P.push(part(box(0.12, 0.12, 1.6), '#5a5a5a', 0, 0.75, -1.9));
    for (let i = 0; i < 3; i++) P.push(part(box(0.06, 0.55, 0.5), '#b8b8b8', -0.4 + i * 0.4, 0.35, -2.1 - i * 0.45, 0, 0.6, 0.35));
  } else if (implement === 'trailer') {
    P.push(part(box(0.1, 0.1, 1.1), '#3a3a3a', 0, 0.7, -1.75));
    P.push(part(box(1.9, 0.12, 3.2), '#8a3a2a', 0, 0.95, -3.9));
    for (const s of [-1, 1]) P.push(part(box(0.06, 0.6, 3.2), '#8a3a2a', s * 0.95, 1.3, -3.9));
    for (const s of [-1, 1]) P.push(part(box(1.9, 0.6, 0.06), '#8a3a2a', 0, 1.3, -3.9 + s * 1.6));
  } else if (implement === 'grapes') {
    P.push(part(box(0.1, 0.1, 1.1), '#3a3a3a', 0, 0.7, -1.75));
    P.push(part(box(1.5, 0.7, 2.2), '#9aa0a6', 0, 1.2, -3.4));
    P.push(part(box(1.4, 0.2, 2.1), '#4a1f4a', 0, 1.58, -3.4));
  }
  const body = new THREE.Mesh(mergeGeometries(P), MAT); body.castShadow = true; g.add(body);
  const gl = new THREE.Mesh(mergeGeometries([part(box(1.04, 1.2, 0.03), '#fff', 0, 1.85, 0.06), part(box(1.04, 1.2, 0.03), '#fff', 0, 1.85, -1.16), part(box(0.03, 1.2, 1.16), '#fff', 0.53, 1.85, -0.55), part(box(0.03, 1.2, 1.16), '#fff', -0.53, 1.85, -0.55)]), GLASS);
  g.add(gl);
  const wheels = [];
  for (const s of [-1, 1]) { const w = wheel(0.78, 0.45, '#e2b62a'); w.position.set(s * 0.82, 0.78, -0.6); g.add(w); wheels.push([w, 0.78]); }
  for (const s of [-1, 1]) { const w = wheel(0.42, 0.28, '#e2b62a'); w.position.set(s * 0.62, 0.42, 1.25); g.add(w); wheels.push([w, 0.42]); }
  if (implement === 'trailer' || implement === 'grapes') for (const s of [-1, 1]) { const w = wheel(0.45, 0.3, '#9a9a9a'); w.position.set(s * 1.05, 0.45, implement === 'grapes' ? -3.4 : -3.9); g.add(w); wheels.push([w, 0.45]); }
  g.userData.wheels = wheels;
  return g;
}

// Cosechadora: cabina alta delante, cabezal de corte con molinete, tolva y tubo de descarga. Mira hacia +z.
export function combine(color = '#c8a227') {
  const g = new THREE.Group(), P = [];
  P.push(part(box(2.6, 2.2, 5.2), color, 0, 2.1, -0.6));                             // cuerpo
  P.push(part(box(2.4, 0.9, 2.6), color, 0, 3.6, -1.3));                             // tolva de grano
  P.push(part(box(2.2, 0.08, 2.4), '#c9a24a', 0, 4.06, -1.3));                        // grano asomando
  P.push(part(box(1.6, 0.12, 1.7), '#2c2c30', 0, 3.25, 1.65));                       // suelo de cabina
  P.push(part(box(1.7, 0.12, 1.8), color, 0, 4.55, 1.65));                           // techo cabina
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(part(box(0.07, 1.3, 0.07), '#202024', sx * 0.8, 3.9, 1.65 + sz * 0.82));
  P.push(part(box(1.0, 1.2, 1.4), '#2c2c30', 0, 1.7, 2.6));                          // canal de alimentación
  P.push(part(box(5.4, 0.5, 1.4), '#c8302a', 0, 0.75, 3.8));                         // cabezal de corte
  P.push(part(box(5.4, 0.08, 0.5), '#9a9a9a', 0, 0.45, 4.5));                        // barra de cuchillas
  for (const s of [-1, 1]) P.push(part(box(0.1, 1.2, 1.6), '#c8302a', s * 2.7, 1.0, 3.9));
  P.push(part(cyl(0.12, 0.12, 5.2, 8), '#c8302a', 0, 1.55, 4.3, 0, 0, Math.PI / 2));  // molinete
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.push(part(box(5.2, 0.05, 0.05), '#e8e0c8', 0, 1.55 + Math.cos(a) * 0.55, 4.3 + Math.sin(a) * 0.55)); }
  P.push(part(cyl(0.2, 0.2, 3.8, 10), '#5a5a5a', 1.45, 3.75, -1.6, Math.PI / 2 - 0.08));   // tubo de descarga, plegado a lo largo del costado
  P.push(part(cyl(0.07, 0.07, 1.4, 8), '#3a3a3a', -0.9, 4.6, -2.6));
  const body = new THREE.Mesh(mergeGeometries(P), MAT); body.castShadow = true; g.add(body);
  const gl = new THREE.Mesh(mergeGeometries([part(box(1.66, 1.2, 0.03), '#fff', 0, 3.9, 2.5), part(box(0.03, 1.2, 1.6), '#fff', 0.83, 3.9, 1.65), part(box(0.03, 1.2, 1.6), '#fff', -0.83, 3.9, 1.65)]), GLASS);
  g.add(gl);
  const wheels = [];
  for (const s of [-1, 1]) { const w = wheel(0.95, 0.6, '#9a9a9a'); w.position.set(s * 1.45, 0.95, 1.1); g.add(w); wheels.push([w, 0.95]); }
  for (const s of [-1, 1]) { const w = wheel(0.6, 0.4, '#9a9a9a'); w.position.set(s * 1.3, 0.6, -2.6); g.add(w); wheels.push([w, 0.6]); }
  g.userData.wheels = wheels;
  return g;
}

// Pacas: redondas (de hierba, envueltas o de paja) en hilera
export function bales(kind, n, rnd) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const x = (i % 3) * 2.6 + (rnd() - 0.5) * 0.6, z = Math.floor(i / 3) * 3 + (rnd() - 0.5) * 0.6;
    if (kind === 'straw') { P.push(part(box(1.2, 0.5, 0.8), '#e0c36a', x, 0.25, z)); P.push(part(box(1.2, 0.5, 0.8), '#d8bb62', x + 0.1, 0.75, z)); }
    else P.push(part(cyl(0.7, 0.7, 1.2, 18), kind === 'wrap' ? (i % 4 ? '#f2f2ee' : '#3f6a3a') : '#d6bd68', x, 0.7, z, 0, rnd() * 0.4, Math.PI / 2));
  }
  const m = new THREE.Mesh(mergeGeometries(P), MAT); m.castShadow = true; return m;
}

// Qué se cuenta de cada máquina: cómo se hacía antes y cómo ahora
export const AGRO_INFO = {
  plough: { icon: 'wheat', title: 'El tractor arando', text: 'Arar es dar la vuelta a la tierra para que se airee y la semilla pueda crecer.',
    then: 'Se araba con una pareja de bueyes o de mulas tirando de un arado de madera con reja de hierro. Arar un campo costaba días.', now: 'El tractor tira de un arado de varias rejas. Una sola persona ara en unas horas lo que antes llevaba una semana.' },
  combine: { icon: 'wheat', title: 'La cosechadora', text: 'En verano el trigo y la cebada se cosechan cuando la espiga está seca y dorada.',
    then: 'Se segaba a mano con la hoz, se ataban gavillas y se llevaban a la era. Allí el trillo, tirado por animales, separaba el grano de la paja, y se aventaba al viento.', now: 'La cosechadora corta, trilla y limpia el grano a la vez, y lo guarda en su tolva. La paja sale por detrás y luego se empaca.' },
  bales: { icon: 'wheat', title: 'Las pacas de hierba', text: 'La hierba se siega en primavera y verano, se deja secar al sol y se enrolla en pacas para dar de comer al ganado en invierno.',
    then: 'Se segaba con guadaña y se hacían almiares (metak): montones de hierba seca alrededor de un palo, colocados con la horca.', now: 'Una segadora corta, otra máquina la voltea y la empacadora hace pacas. Algunas se envuelven en plástico para que fermenten (silo).' },
  trailer: { icon: 'wheat', title: 'Tractor con remolque', text: 'El remolque lleva la cosecha, el forraje o el abono del campo a la granja.',
    then: 'Todo se movía en carros de madera con ruedas de radios, tirados por bueyes, mulas o burros.', now: 'Los tractores con remolque llevan muchas toneladas de una vez, por caminos agrícolas.' },
  grapes: { icon: 'grapes', title: 'La vendimia', text: 'En septiembre y octubre se recoge la uva para hacer vino.',
    then: 'Se vendimiaba a mano con navaja o tijera, en cestos que se vaciaban en comportas cargadas a lomos de caballerías.', now: 'Mucha uva se sigue cogiendo a mano, pero también hay máquinas vendimiadoras. El tractor la lleva rápido a la bodega para que no se estropee.' },
};

// Coloca la maquinaria por las parcelas del pueblo según su cultivo
export function buildAgro(scene, def, rnd) {
  const out = [], movers = [];
  const nearHouse = (x, z) => TOWN.houses.some(h => Math.abs(h.x - x) < 26 && Math.abs(h.z - z) < 26) || Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z) < 60;
  const cand = [];
  for (let z = -HALF + 40; z < HALF - 40; z += 13) for (let x = -HALF + 40; x < HALF - 40; x += 13) {
    const fi = fieldInfo(x, z);
    if (fi.mask < 0.95 || fi.edge < 9 || nearHouse(x, z)) continue;
    const h0 = terrainHeight(x, z), slope = Math.abs(terrainHeight(x + 4, z) - h0) + Math.abs(terrainHeight(x, z + 4) - h0);
    if (slope > 1.2) continue;
    cand.push({ x, z, fi });
  }
  // mezcla y una máquina por parcela como mucho
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const usedCell = new Set(), max = def.family === 'city' ? 4 : 8;
  const COL = ['#3f8a3a', '#c8302a', '#2f5fb3', '#3f8a3a', '#d9822a'];
  for (const c of cand) {
    if (out.length >= max) break;
    const t = c.fi.type; if (usedCell.has(c.fi.cell) || ![0, 1, 2, 3, 4, 5, 7].includes(t)) continue;
    if (out.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 45)) continue;
    usedCell.add(c.fi.cell);
    // dirección de los surcos: la de las filas del campo (se mide hacia dónde cambia menos la fila)
    const r0 = c.fi.row, ru = fieldInfo(c.x + 2, c.z).row - r0, rv = fieldInfo(c.x, c.z + 2).row - r0;
    const ang = Math.atan2(rv, -ru);   // a lo largo de la fila
    let obj, kind;
    if (t === 2) { obj = combine(); kind = 'combine'; }
    else if (t === 3) { obj = tractor(COL[out.length % COL.length], 'plough'); kind = 'plough'; }
    else if (t === 5) { obj = tractor(COL[(out.length + 1) % COL.length], 'grapes'); kind = 'grapes'; }
    else if (t === 0 || t === 4 || t === 1) { obj = rnd() < 0.5 ? bales(t === 1 ? 'straw' : rnd() < 0.5 ? 'wrap' : 'hay', 6 + Math.floor(rnd() * 4), rnd) : tractor(COL[out.length % COL.length], 'trailer'); kind = obj.userData.wheels ? 'trailer' : 'bales'; }
    else { obj = tractor(COL[out.length % COL.length], 'trailer'); kind = 'trailer'; }
    obj.position.set(c.x, groundHeight(c.x, c.z), c.z); obj.rotation.y = ang;
    scene.add(obj);
    const o = { kind, x: c.x, z: c.z, obj, info: AGRO_INFO[kind] };
    // algunos trabajan: van y vienen por el surco
    if ((kind === 'plough' || kind === 'combine') && movers.length < 2) {
      const L = 26; o.move = { x0: c.x, z0: c.z, dx: Math.sin(ang), dz: Math.cos(ang), L, s: 0, dir: 1, speed: kind === 'combine' ? 1.6 : 2.0, turn: 0 };
      movers.push(o);
    } else addBox(c.x, c.z, kind === 'combine' ? 5.6 : 2.4, kind === 'combine' ? 7 : kind === 'bales' ? 8 : 5.5, ang);
    out.push(o);
  }
  return {
    list: out,
    update(dt, player, particles) {
      for (const o of movers) {
        const m = o.move, obj = o.obj;
        if (Math.abs(player.pos.x - obj.position.x) + Math.abs(player.pos.z - obj.position.z) > 260) continue;
        // se para si el jugador está delante
        const ahead = Math.hypot(player.pos.x - (obj.position.x + m.dx * m.dir * 4), player.pos.z - (obj.position.z + m.dz * m.dir * 4)) < 4.5;
        if (m.turn > 0) { m.turn -= dt; obj.rotation.y += dt * Math.PI / 2.5; if (m.turn <= 0) { m.dir *= -1; obj.rotation.y = Math.atan2(m.dx * m.dir, m.dz * m.dir); } continue; }
        if (ahead) continue;
        m.s += m.dir * m.speed * dt;
        if (m.s > m.L || m.s < 0) { m.s = Math.max(0, Math.min(m.L, m.s)); m.turn = 2.5; continue; }
        const x = m.x0 + m.dx * m.s, z = m.z0 + m.dz * m.s;
        obj.position.set(x, groundHeight(x, z), z); o.x = x; o.z = z;
        for (const [w, r] of obj.userData.wheels) w.rotation.x += m.dir * m.speed * dt / r;
        if (particles && Math.random() < dt * 6) particles.emit({ x: x - m.dx * m.dir * 2.6, y: obj.position.y + 0.3, z: z - m.dz * m.dir * 2.6 }, { n: 3, color: o.kind === 'combine' ? ['#d9c27a', '#bba25a'] : ['#8a6a45', '#a5865a'], speed: 0.8, size: 0.5, life: 1.2 });
      }
    },
  };
}
