// Los caseríos del mapa del inicio: cada pueblo del juego, a la vista sobre el relieve, como en un mapa ilustrado.
// Lo pidió el autor el 14 de noviembre de 2026, con su imagen de referencia (una isla con su pueblo de tejados naranjas
// entre los árboles): «los pueblos tienen que estar muy bien integrados dentro del mapa». Hasta entonces, a la distancia de
// una comarca, un pueblo era solo su ficha con foto flotando encima: a su tamaño de verdad mide dos o tres píxeles, y sus
// casas reales no se levantan hasta estar muy cerca (los núcleos de mapa3d.js).
// Ahora cada pueblo tiene su caserío: un puñado de casas de paredes claras y tejado a dos aguas alrededor de su iglesia
// con torre, puestas sobre el terreno, cada una a la altura del suelo que pisa. Van agrandadas, como el relieve: son un
// dibujo del pueblo, no su plano. Más casas cuanto mayor es el pueblo; las ciudades, el doble. De teja en casi toda
// Navarra y de pizarra en el Pirineo; de cal blanca en el norte y de ocre en la Ribera. Las zonas de naturaleza no llevan.
// Crecen algo al alejarse la cámara, para que se sigan viendo con toda Navarra a la vista, y al acercarse mucho se encogen
// y se van: ahí salen las casas de verdad del pueblo, con su trazado.
// Una malla con instancias por comarca, hija de la comarca: sube con ella cuando flota como isla.
import * as THREE from 'three';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ALERO = 1, CUMBRE = 1.58;   // (la casa mide 1 hasta el alero; el caballete, a lo largo de x)

// (una casa: cuatro paredes, que bajan por debajo del suelo para no quedar en el aire en las cuestas, dos hastiales y el
// tejado a dos aguas con algo de alero. Las paredes, blancas, más oscuras abajo, como si les llegara menos luz junto al
// suelo; el tejado, de su color. El color de cada casa, el de su instancia, tiñe las dos cosas)
function casaGeo(tejado) {
  const P = [], K = [], t = new THREE.Color(tejado), x0 = -0.5, x1 = 0.5, z0 = -0.5, z1 = 0.5, B = -0.7, H = ALERO, R = CUMBRE, a = 0.07, h = H - 0.04;
  const v = (p, c) => { P.push(p[0], p[1], p[2]); K.push(c.r, c.g, c.b); };
  const pie = new THREE.Color(0.66, 0.64, 0.66), cal = new THREE.Color(1, 1, 1), te2 = t.clone().multiplyScalar(0.86);
  const pared = (A, Bv, Cv, D) => { v(A, pie); v(Bv, pie); v(Cv, cal); v(A, pie); v(Cv, cal); v(D, cal); };
  pared([x0, B, z1], [x1, B, z1], [x1, H, z1], [x0, H, z1]); pared([x1, B, z0], [x0, B, z0], [x0, H, z0], [x1, H, z0]);
  pared([x1, B, z1], [x1, B, z0], [x1, H, z0], [x1, H, z1]); pared([x0, B, z0], [x0, B, z1], [x0, H, z1], [x0, H, z0]);
  for (const p of [[x1, H, z1], [x1, H, z0], [x1, R, 0], [x0, H, z0], [x0, H, z1], [x0, R, 0]]) v(p, cal);
  const faldon = (A, Bv, Cv, D, c) => { for (const p of [A, Bv, Cv, A, Cv, D]) v(p, c); };
  faldon([x0 - a, h, z1 + a], [x1 + a, h, z1 + a], [x1 + a, R, 0], [x0 - a, R, 0], t); faldon([x1 + a, h, z0 - a], [x0 - a, h, z0 - a], [x0 - a, R, 0], [x1 + a, R, 0], te2);
  // (el solar: un trozo de suelo claro, de tierra batida y piedra, alrededor de cada casa; los de unas y otras se juntan y
  // hacen el suelo del pueblo, sus calles y su plaza. Sin él, desde arriba las casas eran tejados sueltos sobre el campo)
  const so = new THREE.Color(0.8, 0.73, 0.6), sx = 0.86, sz = 0.92, y = 0.03;
  for (const p of [[-sx, y, sz], [sx, y, sz], [sx, y, -sz], [-sx, y, sz], [sx, y, -sz], [-sx, y, -sz]]) v(p, so);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(K, 3)); g.computeVertexNormals();
  return g;
}

// (las paredes: cal en el norte y el Pirineo, piedra dorada en la Zona Media, ocre y ladrillo en la Ribera)
const CAL = { norte: [0xfbf6ec, 0xf6eedf, 0xf1e6d2], centro: [0xf3e3c0, 0xecd3a4, 0xf8ecd2, 0xe6c692], sur: [0xf0d9ae, 0xe6c08a, 0xf6e6c6, 0xdcab7a] };
const ZONA = { bidasoa: 'norte', 'larraun-leitzaldea': 'norte', sakana: 'norte', pirineo: 'norte', prepirineo: 'norte', ribera: 'sur', 'ribera-alta': 'sur' };
const PIEDRA = 0xe9dcc4;
// (la luz, pintada y limpia: mucha luz de ambiente y el sol del mapa por encima, para que los tejados se vean de su color y
// no pardos, como salían con la luz de la escena; con la niebla del mapa. El color sale en valores de pantalla, como el
// relieve, y la niebla se mezcla en ellos)
const VS = `uniform vec3 uSol; varying vec3 vC;
#include <fog_pars_vertex>
void main() {
  vec3 e = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 n = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * (normal / (e * e))));
  vC = color * instanceColor * (0.7 + 0.46 * max(0.0, dot(n, uSol)) + 0.08 * n.y);
  vec4 mvPosition = viewMatrix * (modelMatrix * (instanceMatrix * vec4(position, 1.0))); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const FS = `uniform float uK; varying vec3 vC;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = linearToOutputTexel(vec4(vC * uK, 1.0));
#ifdef USE_FOG
  gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(fogColor, 1.0)).rgb, smoothstep(fogNear, fogFar, vFogDepth));
#endif
}`;

/** C: las comarcas ({ id, mesh, Pw, sy, fondo }); T: los pueblos ({ id, X, Z, c, tipo, size }); sobre(c, x, z): la altura
 *  de la cara de arriba de la comarca; dentro(P, x, z, r): si un punto cae dentro de un contorno con ese margen; grosor:
 *  el de la base de las comarcas; ligero: en el móvil y en los equipos flojos, algo menos de casas; geos y mats, para
 *  soltarlo todo; sol: hacia dónde está el sol del mapa. */
export function hazCaserios({ C, T, sobre, dentro, grosor, ligero = false, sol = new THREE.Vector3(-50, 38, -22), geos, mats }) {
  const gTeja = casaGeo(0xea6f38), gPizarra = casaGeo(0x7f7b8c), SOL = sol.clone().normalize(); geos.push(gTeja, gPizarra);
  const col = new THREE.Color(), M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const grupos = [];
  for (const c of C) {
    const casas = [];
    for (const t of T) {
      if (t.c !== c || t.tipo === 2) continue;
      let seed = 11; for (const ch of t.id) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0; const R = rnd(seed);
      const ciudad = t.tipo === 1, n = Math.round((ciudad ? 16 : 6 + 4 * Math.min(1, Math.max(0, ((t.size || 40) - 20) / 60))) * (ligero ? 0.8 : 1));
      const radio = 0.4 + 0.024 * n, eje = R() * Math.PI, cal = CAL[ZONA[c.id] || 'centro'], sitios = [];
      const cabe = (x, z, r) => sitios.every(o => Math.hypot(o[0] - x, o[1] - z) > o[2] + r) && dentro(c.Pw, t.X + x * 1.5, t.Z + z * 1.5, 0.22);
      const pon = (x, z, ry, w, d, h, color) => { sitios.push([x, z, Math.max(w, d) * 0.56]); casas.push({ X: t.X, Z: t.Z, x, z, ry, w, d, h, color }); };
      // (la iglesia, junto a la plaza, con su torre a los pies; de piedra)
      const ai = R() * Math.PI * 2, ix = Math.cos(ai) * 0.2, iz = Math.sin(ai) * 0.2;
      if (cabe(ix, iz, 0.18)) { pon(ix, iz, eje, 0.42, 0.22, 0.2, PIEDRA); pon(ix - Math.cos(eje) * 0.29, iz + Math.sin(eje) * 0.29, eje, 0.15, 0.15, 0.44, PIEDRA); }
      // (las casas: sueltas alrededor, más juntas hacia el centro, casi todas a lo largo de una de las dos calles del pueblo)
      for (let k = 0, i = 0; i < n && k < n * 30; k++) {
        const a = R() * Math.PI * 2, r = (0.28 + 0.72 * Math.sqrt(R())) * radio, x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.2 + R() * 0.08, d = 0.15 + R() * 0.05;
        if (!cabe(x, z, Math.max(w, d) * 0.56)) continue;
        pon(x, z, eje + (R() < 0.5 ? 0 : Math.PI / 2) + (R() - 0.5) * 0.14, w, d, 0.11 + R() * 0.04 + (ciudad && r < radio * 0.5 ? 0.05 : 0), cal[(R() * cal.length) | 0]); i++;
      }
    }
    if (!casas.length) continue;
    const m = new THREE.ShaderMaterial({ vertexColors: true, fog: true, vertexShader: VS, fragmentShader: FS, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSol: { value: SOL.clone() }, uK: { value: 1 } }]) }); mats.push(m);
    const malla = new THREE.InstancedMesh(c.id === 'pirineo' ? gPizarra : gTeja, m, casas.length); malla.name = 'caserios-' + c.id; malla.frustumCulled = false; malla.visible = false;
    casas.forEach((h, i) => malla.setColorAt(i, col.set(h.color).multiplyScalar(0.94 + 0.06 * ((i * 7) % 5) / 4)));
    c.mesh.add(malla); grupos.push({ c, casas, malla, m, f: -1, sy: -1 });
  }
  return {
    cuantas: grupos.reduce((n, g) => n + g.casas.length, 0),
    /** d: la distancia de la cámara. Con toda Navarra a la vista crecen; muy de cerca se encogen y se van */
    update(d) {
      const f = Math.min(1.55, Math.max(0.8, d / 30)) * suave(5.5, 9.5, d);
      for (const g of grupos) {
        const c = g.c, sy = Math.max(0.3, c.sy || 1), ver = f > 0.03 && (c.sy || 0) > 0.3; g.malla.visible = ver; if (!ver) continue;
        g.m.uniforms.uK.value = 1 - 0.3 * (c.fondo || 0);   // (las de las comarcas que quedan al fondo, apagadas con ellas)
        if (Math.abs(f - g.f) < 0.004 * f && Math.abs(sy - g.sy) < 0.004) continue; g.f = f; g.sy = sy;
        g.casas.forEach((h, i) => { const x = h.X + h.x * f, z = h.Z + h.z * f;
          M.compose(p.set(x, grosor + sobre(c, x, z), z), q.setFromAxisAngle(UP, h.ry), s.set(h.w * f, h.h * f / sy, h.d * f)); g.malla.setMatrixAt(i, M); });
        g.malla.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
