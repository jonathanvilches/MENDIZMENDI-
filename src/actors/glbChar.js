// Personajes GLB del sistema de personajes 3D (tools/chars genera los .glb con Blender).
// Carga con GLTFLoader, clona con SkeletonUtils, elige Idle/Walk/Run según la velocidad,
// gestiona la cara por visibilidad de mallas (boca, cejas, párpados, manos), el parpadeo,
// la mirada (offset de la textura del ojo) y muelles en los huesos Hair_* y Scarf_*.
import { fillMaterial, sharpMap } from '../engine/charLight.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadGLB } from '../util/glb.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { hdTable } from '../web/hd.js';
import { loadChica } from './chicas.js';   // (solo se usa al cargar un avatar: chicas.js importa de aquí, y al arrancar no se llama)
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';   // modelos de Meshy comprimidos
import { pelotaMoves, poseArmado } from './pelotaMoves.js';
import { ponDedos, Dedos } from './dedos.js';

const cache = new Map();
let loader = null;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _Y = new THREE.Vector3(0, 1, 0);
// nombres de variante: los del encargo nuevo y, como reserva, los antiguos
const ALIAS = { Normal: ['Neutral', 'Normal'], Neutral: ['Neutral', 'Normal'], Happy: ['Smile', 'Happy', 'SmileOpen'], Smile: ['Smile', 'Happy'],
  SmileOpen: ['SmileOpen', 'Happy'], Talk_A: ['TalkA', 'Talk_A'], TalkA: ['TalkA', 'Talk_A'], Talk_O: ['TalkO', 'Talk_O'], TalkO: ['TalkO', 'Talk_O'] };
function variantNames(prefix, name) {
  if (prefix === 'Brow_') return [prefix + name, prefix + (name === 'Happy' || name === 'Surprised' ? 'Normal' : 'Normal')];
  return (ALIAS[name] || [name]).map(n => prefix + n);
}
// solo el cuerpo, la cabeza, el pelo y los accesorios grandes proyectan sombra (los ojos, la boca o las manos no se notan
// en la sombra y cada pieza costaría una llamada de dibujo más)
const SHADOW_PARTS = /^(Body|Head|Hair|Acc_)/;
const FACE_PARTS = /^(Brow|Eye|Glint|Mouth|Nose|Eyelid)/;
const outlines = new Map();
function outlineMat(w) {
  if (!outlines.has(w)) {
    const m = new THREE.MeshBasicMaterial({ color: '#2a1a14', side: THREE.BackSide });
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${w.toFixed(4)};`); };
    m.customProgramCacheKey = () => 'glbOutline' + w;
    outlines.set(w, m);
  }
  return outlines.get(w);
}

// personajes hechos con Meshy (los sube el usuario): un modelo con su propia textura y unos pocos clips (correr,
// andar, salto completo y celebración). Los que faltan se recortan de esos mismos clips: estar quieto y hablar (el final
// tranquilo de la celebración, de ida y vuelta para que no salte), saludar, celebrar, el impulso, el vuelo y la caída
const MESHY = {}, MESHY_PICS = {};
// (en el archivo único, los de textura a 1024 px: el alias @meshy-full de vite.config.js)
for (const [p, u] of Object.entries(import.meta.glob('@meshy-full/*.glb', { eager: true, query: '?url', import: 'default' }))) MESHY[p.split('/').pop().replace('.glb', '')] = u;
// (solo los retratos de busto y de cuerpo entero: las figuras de la pantalla VS las carga sportCard.js, y así no van dos veces)
for (const [p, u] of Object.entries(import.meta.glob('../assets/meshy/portraits/*_{bust,full}.{png,webp}', { eager: true, query: '?url', import: 'default' }))) MESHY_PICS[p.split('/').pop().replace(/\.(png|webp)$/, '')] = u;
// (y, solo en la web, el de cuerpo entero a 512 × 768 para el perfil, que se ve a 240 px de alto: el de 256 × 384 salía
// ampliado casi al doble en el iPhone; el alias @retratos del archivo único apunta a una carpeta que no existe)
for (const [p, u] of Object.entries(import.meta.glob('@retratos/*_hero.webp', { eager: true, query: '?url', import: 'default' }))) MESHY_PICS[p.split('/').pop().replace('.webp', '')] = u;
hdTable('retratos', MESHY_PICS);   // (archivo único con conexión: el de cuerpo entero, por el grande de la web; src/web/hd.js)
// versión ligera de cada uno (tools/meshy-lod.mjs: ~1/3 de triángulos y textura de 512 px) para cuando salen muchos a la
// vez: vecinos, corredores, futbolistas
const MESHY_LOD = {};
for (const [p, u] of Object.entries(import.meta.glob('../assets/meshy/lod/*.glb', { eager: true, query: '?url', import: 'default' }))) MESHY_LOD[p.split('/').pop().replace('.glb', '')] = u;
export const MESHY_NAMES = Object.keys(MESHY);
// (y los vecinos completos, con todos sus triángulos: solo en la web, para el que habla contigo de cerca; vecinoCerca.js)
const VEC_FULL = {};
for (const [p, u] of Object.entries(import.meta.glob('@vecinos-full/*.glb', { eager: true, query: '?url', import: 'default' }))) VEC_FULL[p.split('/').pop().replace('.glb', '')] = u;
export const hayVecinoCompleto = (name) => !!VEC_FULL[name];
// nombre del juego: [clip de origen, desde (s), hasta (s), ida y vuelta, sin subir la cadera (el salto lo hace el juego)]
const MESHY_CUTS = {
  Idle: ['Celebrate', 6.9, 9.3, true], Talk: ['Celebrate', 6.4, 9.3, true], Wave: ['Celebrate', 3.55, 6.1], Celebrate: ['Celebrate', 0.3, 1.75],
  Jump_Start: ['Jump_Full', 0, 0.58, false, true], Jump_Loop: ['Jump_Full', 0.62, 0.95, true, true], Land: ['Jump_Full', 1.05, 1.96, false, true],
  Ready: ['Jump_Full', 0.22, 0.42, true, true], Scared: ['Jump_Full', 1.1, 1.62, false, true], Pick: ['Jump_Full', 1.05, 1.62, false, true], Hit: ['Celebrate', 0.35, 1.05],
  // de pie y quieto, casi sin moverse (una décima de segundo del reposo, despacio): la postura neutra de la pasaka. La de
  // «Ready» es una flexión del salto en bucle y la cadera subía y bajaba 8 cm sin parar; el reposo normal se balancea 22 cm
  Still: ['Celebrate', 6.9, 7.0, true, false, 0.12],
};
// cortes propios de cada personaje (el pelotari trae un golpe con la derecha y un puño en alto en vez de la celebración)
const MESHY_BY = {
  // el explorador (el personaje del jugador): quieto, respirando y mirando alrededor; hablando, de su charla; saludar y
  // golpear, de un gesto de la charla; el salto, de saltar un obstáculo; y recoger algo, agachándose y mirándolo
  explorador: { Idle: ['Breathe', 0.05, 7.8], Still: ['Breathe', 0.1, 0.2, true, false, 0.12], Talk: ['TalkP', 1.3, 6.8], Wave: ['TalkP', 3.0, 4.6],
    Celebrate: ['Hop', 0, 0.62, false, true], Jump_Start: ['Hop', 0, 0.3, false, true], Jump_Loop: ['Hop', 0.3, 0.52, true, true], Land: ['Hop', 0.55, 0.86, false, true],
    Ready: ['Breathe', 0.1, 0.4, true], Scared: ['Hop', 0.55, 0.86, false, true], Pick: ['PickUp', 0.3, 3.5], Hit: ['TalkP', 3.2, 3.9] },
  // la exploradora (la chica del jugador; se elige chico o chica al empezar): trae otras animaciones que él, así que cada
  // gesto sale de la suya. Quieta, el final tranquilo de agacharse y levantarse; hablando, el tramo en que abre los brazos
  // de su pataleta (sin el enfado: ni el pisotón ni los brazos cruzados); saludar y golpear, de la mano en alto; celebrar,
  // su pirueta; el salto, el impulso y la caída del saltito de la mano en alto y, en el aire, la rodilla arriba de la
  // pataleta (la cadera la sube el juego; Meshy no le dio un salto como el de él); asustarse, agacharse; y recoger
  // algo, agacharse a tocar el suelo y levantarse
  exploradora: { Idle: ['Squat', 3.95, 4.73, true], Still: ['Squat', 4.5, 4.6, true, false, 0.12], Talk: ['Stomp', 1.5, 3.4, true], Wave: ['Cheer', 0.1, 1.25],
    Celebrate: ['Spin', 0, 1.3], Jump_Start: ['Cheer', 0.1, 0.4, false, true], Jump_Loop: ['Stomp', 0.76, 0.86, true, true], Land: ['Cheer', 0.62, 1.1, false, true],
    Ready: ['Squat', 4.3, 4.7, true], Scared: ['Squat', 0.15, 1.0], Pick: ['Squat', 0.15, 3.9], Hit: ['Cheer', 0.3, 0.9] },
  // el pastor: quieto y hablando, del principio y el final tranquilos de su charla; el salto, de saltar un obstáculo
  pastor: { Idle: ['TalkP', 7.2, 10.3, true], Talk: ['TalkP', 1.3, 6.8], Wave: ['TalkP', 3.0, 4.6], Celebrate: ['Hop', 0, 0.62, false, true],
    Jump_Start: ['Hop', 0, 0.3, false, true], Jump_Loop: ['Hop', 0.3, 0.55, true, true], Land: ['Hop', 0.6, 0.96, false, true],
    Ready: ['Hop', 0.02, 0.18, true, true], Scared: ['Hop', 0.62, 0.96, false, true], Pick: ['Hop', 0.62, 0.96, false, true], Hit: ['TalkP', 3.2, 3.9], Still: ['TalkP', 7.2, 7.3, true, false, 0.12] },
  // (reposo y postura de pelotari: una décima de segundo de ida y vuelta, despacio, como quien respira y se balancea.
  // Antes la postura era el primer tercio de segundo del golpe en bucle: el brazo subía y bajaba 73° sin parar, como si
  // empezase el gesto una y otra vez; ahora se mueve unos 3°. El gesto de verdad lo ponen el golpe y el brazo atrás)
  pelotari: { Idle: ['Fist', 0, 0.1, true, false, 0.12], Still: ['Fist', 0, 0.1, true, false, 0.12], Talk: ['Fist', 0, 0.12, true, false, 0.25], Ready: ['Slash', 0.02, 0.12, true, false, 0.15], Hit: ['Slash', 0.52, 1.25],
    Celebrate: ['Fist', 0, 1.58], Wave: ['Fist', 0.15, 1.4], Scared: ['Slash', 1.1, 1.5], Pick: ['Slash', 0.1, 0.4] },
};
MESHY_BY.pelotari_rojo = MESHY_BY.pelotari;   // el colorado se mueve igual que el azul
// los pelotaris nuevos (pelota/estiloPelotari.js): sus archivos traen los clips con los mismos nombres que el de siempre
for (const m of ['pelotari_nuevo', 'pelotari_nuevo_rojo', 'pelotari_nueva', 'pelotari_nueva_azul', 'pelotari_nueva2', 'pelotari_nueva2_azul', 'pelotari_nueva3', 'pelotari_nueva3_azul']) MESHY_BY[m] = MESHY_BY.pelotari;
// los vecinos (tools/vecinos-glb.mjs: todos traen estar de pie mirando alrededor, Alert, y charlar, Chat): quietos, mirando
// alrededor (el clip entero, que empieza y acaba igual); hablando, su charla entera; saludar, el gesto del principio de
// la charla; asustarse, el respingo de mirar alrededor; y golpear, el golpe con los dos brazos de los que lo traen
// (el clip de charla de Meshy está mal adaptado a estos dos: con él echaban la cabeza hacia atrás, hasta 80°, y se encogían
// un 12-15 %; medido en los 21 vecinos, los demás no pasan del 3 %. Hablan con su reposo, como los que no traen charla)
const CHARLA_MAL = new Set(['abuela_panuelo', 'abuelo']);
// LOS REDISEÑADOS (el autor, 17 de noviembre de 2026: «rehacer todos los personajes del videojuego con la misma identidad de
// diseño» que los pelotaris nuevos): Meshy desde una lámina de cuatro vistas de cada uno en el estilo de los pelotaris
// (proporciones de adulto de verdad, no cabezones), con su esqueleto y sus animaciones de Meshy (andar, correr, estar de
// pie y charlar). A estos no se les achica la cabeza (CABEZA), su charla está bien (CHARLA_MAL) y su versión ligera lleva
// otra textura (tools/meshy-lod-rehorneo.mjs), sin la máscara del pelo para teñirlo (npcGlb.js, tonosDe). Los mismos
// nombres que los de antes: el juego los coloca igual. El juez y la afición del frontón son nuevos
export const REDISENO = new Set(['juez', 'espectador', 'espectadora', 'abuelo_bigote', 'abuelo', 'abuelo_barba', 'abuela_mono', 'abuela_panuelo',
  'abuela_trenzas', 'mujer', 'hombre', 'carpintera', 'quesero']);
const cortesVecino = (src, name = '') => ({
  Idle: ['Alert', 0, 4], Still: ['Alert', 0, 0.1, true, false, 0.12], Ready: ['Alert', 0, 0.3, true], Scared: ['Alert', 1.85, 2.45],
  ...(src.Chat && (REDISENO.has(name) || !CHARLA_MAL.has(name)) ? { Talk: ['Chat', 0, src.Chat.duration], Wave: ['Chat', 0.7, 2.0] } : { Talk: ['Alert', 0.4, 1.8, true] }),
  ...(src.Attack ? { Hit: ['Attack', 0.5, 1.6] } : {}),
  ...(src.WaveH ? { Wave: ['WaveH', 0, src.WaveH.duration] } : {}),   // (los que traen saludar con la mano: ese)
});
MESHY_BY.pastor.Wave = ['Hello', 0.6, 3.7];   // saluda con la mano en alto
// bucle sin fotograma repetido: si el final coincide con el principio, el clip acaba un fotograma antes
function seamless(clip) {
  let dup = 0, all = 0, step = Infinity;
  for (const t of clip.tracks) {
    const n = t.times.length; if (n < 3) continue;
    const vs = t.getValueSize(), v = t.values; all++; step = Math.min(step, t.times[n - 1] - t.times[n - 2]);
    let same = true; for (let k = 0; k < vs; k++) if (Math.abs(v[k] - v[(n - 1) * vs + k]) > 2e-3 * Math.max(1, Math.abs(v[k]))) same = false;
    if (same) dup++;
  }
  if (!all || dup < all * 0.7 || !isFinite(step)) return clip;
  const end = clip.duration - step;
  for (const tr of clip.tracks) if (tr.times[tr.times.length - 1] > end + 1e-4) tr.trim(0, end);
  clip.duration = end; return clip;
}
// recorta un clip muestreándolo (así ningún hueso se queda sin pista aunque no tenga claves en ese tramo)
function cutClip(clip, name, t0, t1, flatHips, fps = 30) {
  const n = Math.max(2, Math.round((t1 - t0) * fps) + 1), tracks = [];
  for (const tr of clip.tracks) {
    const I = tr.createInterpolant(), vs = tr.getValueSize(), times = new Float32Array(n), values = new Float32Array(n * vs);
    for (let i = 0; i < n; i++) { const t = t0 + (t1 - t0) * i / (n - 1); times[i] = t - t0; values.set(I.evaluate(t), i * vs); }
    // la cadera no sube: el salto del clip se quedaría encima del salto del juego (sí baja, al agacharse)
    if (flatHips && /Hips\.position$/.test(tr.name)) { const [x0, y0, z0] = values; for (let i = 0; i < n; i++) { values[i * 3] = x0; values[i * 3 + 1] = Math.min(values[i * 3 + 1], y0); values[i * 3 + 2] = z0; } }
    tracks.push(new tr.constructor(tr.name, times, values));
  }
  return new THREE.AnimationClip(name, t1 - t0, tracks);
}
// (la charla, más tranquila: cada hueso se acerca a su postura media del clip, el cuerpo, la cadera y la cabeza a menos de
// la mitad de su vaivén y los brazos casi enteros. El clip de charlar de Meshy balancea todo el cuerpo de un lado a otro, y
// con la cámara de cerca en las charlas se notaba demasiado: «a veces los personajes se balancean demasiado al hablar»,
// 16 de noviembre de 2026. La media mantiene la postura y el bucle sigue sin salto, porque principio y final se acercan igual)
const _qm = new THREE.Quaternion(), _qa = new THREE.Quaternion();
function calmaClip(clip, kCuerpo = 0.4, kBrazos = 0.8) {
  for (const tr of clip.tracks) {
    const k = /(Shoulder|Arm|Hand)/i.test(tr.name) ? kBrazos : kCuerpo, v = tr.values, n = tr.times.length;
    if (/\.quaternion$/.test(tr.name)) {
      let x = 0, y = 0, z = 0, w = 0;
      for (let i = 0; i < n; i++) { const j = i * 4, sg = v[j] * v[0] + v[j + 1] * v[1] + v[j + 2] * v[2] + v[j + 3] * v[3] < 0 ? -1 : 1; x += sg * v[j]; y += sg * v[j + 1]; z += sg * v[j + 2]; w += sg * v[j + 3]; }
      _qm.set(x, y, z, w).normalize();
      for (let i = 0; i < n; i++) { _qa.fromArray(v, i * 4); _qa.copy(_qm.clone().slerp(_qa, k)).toArray(v, i * 4); }
    } else if (/\.position$/.test(tr.name)) {
      const m = [0, 0, 0]; for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) m[c] += v[i * 3 + c] / n;
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) v[i * 3 + c] = m[c] + (v[i * 3 + c] - m[c]) * k;
    }
  }
  return clip;
}
// su textura viene a 2048 px (con todo el detalle); en calidad baja (móviles) se usa a 1024 para no agotar la memoria
let MESHY_TEX = 2048;
export const setMeshyTexMax = (px) => { MESHY_TEX = px; };
// personajes que van con su textura completa (2048 px) aunque se reduzcan las demás: el del jugador y el rival del frontón,
// que se ven de cerca. También en calidad baja: a 1024 se veían borrosos y con fallos de color en la cara y la ropa
const FULL_TEX = new Set();
const MESHY_FILL = 0.3;   // cuánto de su color pone de luz propia cada personaje de Meshy
export const fullTexFor = (name) => FULL_TEX.add(name);
// la textura de una chica (chicas.js) se monta en un lienzo propio: a 2048 solo si es la del jugador (su avatar es una
// chica de ese modelo); si no, como los demás. Antes tomaba el tamaño de la textura del chico, que es de 2048 cuando el
// avatar del jugador es ese mismo chico, y en el iPhone la rival del frontón salía negra: el lienzo de 2048 de más
// (16 MB, y otros tantos en la tarjeta) era lo que faltaba de memoria para subirla bien
const FULL_CHICA = new Set();
export const chicaTexMax = (name) => (FULL_CHICA.has(name) ? 2048 : MESHY_TEX);
// (la textura de Meshy sin mezclar sus piezas: engine/charLight.js)
export { sharpMap };
// la textura pasa siempre por un lienzo (a su tamaño o reducida): subida tal cual desde la imagen del modelo, en algunos
// iPhone los personajes salían negros, sin color; por el lienzo es el camino que siempre ha funcionado en el móvil
// En el iPhone y en Safari la textura llega como imagen normal (util/glb.js), que sube bien tal cual: si no hay que
// reducirla, se queda como está. Copiarla al lienzo dejaba dos copias en memoria (la imagen, que no se puede cerrar como
// un ImageBitmap, y el lienzo): con los pelotaris a 2048 px eran 32 MB de más y el iPhone cerraba el juego al entrar
function shrinkMap(m, max = MESHY_TEX) {
  const t = m.map, img = t?.image; if (!img || !img.width || t.isCanvasTexture) return;
  const S = Math.min(max, img.width), isImg = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
  if (isImg && S >= img.width) return;
  // (si el iPhone no deja crear el lienzo, por memoria, se queda la textura de siempre: mejor que un personaje sin cargar)
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); if (!g) return; g.drawImage(img, 0, 0, S, S);
  const n = new THREE.CanvasTexture(c); n.colorSpace = t.colorSpace; n.flipY = t.flipY; n.wrapS = t.wrapS; n.wrapT = t.wrapT; n.anisotropy = 4;
  // (la original ya no hace falta: el ImageBitmap se cierra y la imagen se vacía, que si no seguía ocupando memoria)
  m.map = n; m.needsUpdate = true; t.dispose(); if (isImg) img.removeAttribute('src'); else img.close?.();
}
// altura de cada personaje (m): una sola para todo el juego, así el mismo modelo se carga una vez aunque salga como
// jugador, como vecino o en un partido
const MESHY_H = { explorador: 1.45, exploradora: 1.43, sanfermin: 1.6, pastor: 1.6, osasuna: 1.6, osasuna_fuera: 1.6, pelotari: 1.62, pelotari_rojo: 1.62,
  // (los pelotaris nuevos, de 19-20 años: adultos, a la altura de los vecinos jóvenes; pelota/estiloPelotari.js. Con la
  // talla de los pelotaris de verdad, que suelen pasar del 1,80: el autor, 17 de noviembre de 2026, los veía pequeños
  // frente al frontón, de 10 m)
  pelotari_nuevo: 1.84, pelotari_nuevo_rojo: 1.84, pelotari_nueva: 1.74, pelotari_nueva_azul: 1.74, pelotari_nueva2: 1.72, pelotari_nueva2_azul: 1.72, pelotari_nueva3: 1.7, pelotari_nueva3_azul: 1.7,
  // los vecinos (noviembre de 2026; actors/npcGlb.js, VECINOS), en metros. Regla: el explorador (1,45) y la exploradora
  // (1,43) tienen un tamaño intermedio, los adultos son claramente más grandes y los niños del pueblo, más pequeños. El
  // explorador tiene la cabeza muy grande y, con un 13 % más de alto, las mujeres parecían de su misma altura y más
  // delgadas (lo vio el autor el 12 de noviembre): ahora le sacan un 23-25 % y los hombres un 30-34 %. Con la variedad de
  // cada vecino (±3 %), el mayor más bajo mide 1,66 y el niño más alto 1,28. Las puertas de las casas miden 2,4 m
  abuelo_bigote: 1.79, abuelo_barba: 1.81, abuelo: 1.84, abuela_trenzas: 1.72, abuela_mono: 1.71, abuela_panuelo: 1.74,
  // (los niños, desde el 17 de noviembre de 2026, «un poquito más bajos» que los adultos, como pidió el autor, y aún por
  // debajo del explorador: antes medían 1,13-1,24 y parecían muñecos al lado de un adulto)
  nino_moreno: 1.36, nino_rubio: 1.4, nina_pelirroja: 1.34, nina_trenzas: 1.32,
  hombre: 1.93, mujer: 1.81, joven_rubia: 1.8, carpintero: 1.94, carpintera: 1.8, quesero: 1.9, quesera: 1.79,
  panadero: 1.88, panadera: 1.78, campesino: 1.93, campesina: 1.8,   // (el campesino, como el hombre: lo pidió el autor)
  // (los seres de leyenda: la lamia, de la altura de una mujer alta; el Basajaun, un gigante del bosque, como el de antes)
  lamia: 1.9, basajaun: 2.5,   // (la lamia, del tamaño del hombre, como pidió el autor el 17 de noviembre de 2026)
  // (y los del carnaval, de Meshy desde el 17 de noviembre de 2026: mozos altos, con el gorro, la cesta o los cuernos encima.
  // La altura cuenta el gorro, así que el joaldun, con un gorro de cintas que es casi un sexto de su alto y una cabeza más
  // pequeña que la de los vecinos, parecía un niño a su lado: el autor pidió que tuviera el tamaño de un adulto del juego.
  // Con 2,25 su cara queda a la altura de la de un vecino adulto; el Zarratrako, con el mismo problema por su gorro, 2,15)
  joaldun: 2.25, bobo: 1.9, momotxorro: 2.15, zarratrako: 2.15,
  // (el juez del frontón, a la altura de los pelotaris nuevos; npcGlb.js lo varía un poco. La afición, sentada en la grada:
  // algo más bajos que de verdad, para que de pie no se metan en la fila de detrás; crowd3d.js)
  juez: 1.8, espectador: 1.7, espectadora: 1.6 };
// LAS PROPORCIONES, iguales para todos (el autor, 17 de noviembre de 2026: «los personajes no tienen el mismo tamaño de
// cabeza, de cara; hay que unificarlos, estilo joaldun y el campesino»). Medido con los huesos de cada modelo (de la base
// del cráneo, Head, a la coronilla, HeadTop_End; tools/proporciones-personajes.mjs): el campesino mide 4,99 cabezas y el
// joaldun 4,88, pero el hombre, la mujer, los mayores, el explorador y los cuerpos de los trajes, 3,2-3,7 (cabezones), y
// la lamia y el Basajaun, 6,6-6,7 (cabeza pequeña). Hasta tener modelos nuevos de Meshy (la auditoría,
// entrega/personajes/auditoria-estilo.html), el hueso de la cabeza de cada uno se escala para llegar a unas 4,75 cabezas
// los adultos, 4,6 los mayores, 4,3 el explorador y 4,1 los niños (k = (cabezas - 1) / (objetivo - 1)), y después todo el
// personaje para que siga midiendo su altura: así el cuerpo y los hombros crecen lo que encoge la cabeza. Para volver a
// como estaban, PROPORCION = false
const PROPORCION = true;
const SIN_GIRO_CABEZA = new Set(['zarratrako']);
export const CABEZA = {
  hombre: 0.61, carpintero: 0.71, quesero: 0.93, panadero: 0.78, mujer: 0.69, joven_rubia: 0.7, carpintera: 0.71, panadera: 0.93,
  abuelo_bigote: 0.69, abuelo_barba: 0.63, abuelo: 0.64, abuela_trenzas: 0.69, abuela_mono: 0.73, abuela_panuelo: 0.69,
  nino_moreno: 0.82, nino_rubio: 0.8, nina_pelirroja: 0.82, nina_trenzas: 0.83,
  // (ni el pelotari ni el explorador y la exploradora: son el mismo personaje, el tuyo, y se quedan como son. El pelotari
  // ya mide 4,3 cabezas y sus golpes, su saque y la vista en primera persona salen de su esqueleto; al explorador se le
  // achicó la cabeza al 67 % y el cuerpo le crecía hasta su altura: dejó de parecerse a sí mismo en el partido, el autor,
  // 17 de noviembre de 2026)
  sanfermin: 0.58, pastor: 0.61, osasuna: 0.59, osasuna_fuera: 0.59,
  // (la lamia, el Bobo y el Basajaun, al revés: cabeza más grande; el Basajaun, gigante, se queda en unas 5,5)
  lamia: 1.52, bobo: 1.27, basajaun: 1.25,
};
/** Ritmo de las piernas de los personajes de Meshy según su zancada real (tools/zancada.mjs: andar ~0,92 m/s y correr
 *  ~1,62 m/s a ritmo 1). Andando, su clip de andar (hasta ×2,1); corriendo (desde 3,6 m/s), el de correr (hasta ×2,8). */
export const MESHY_GAIT = { walkAt: 0.15, runAt: 3.6, gait: (v, n) => n === 'Run' ? Math.min(2.8, Math.max(0.8, v / 1.62)) : Math.min(2.1, Math.max(0.4, v / 0.92)) };
/** Velocidades del jugador con un personaje de Meshy (m/s): andar a paso vivo y correr; con ellas los pies casi no
 *  patinan y se distingue bien andar de correr. */
export const MESHY_SPEEDS = { walk: 2.4, run: 5.8 };
/** ¿Está ya cargado (o cargándose) este personaje de Meshy? */
export const loadedMeshy = (name) => cache.has('meshy:' + name);
/** Personaje de Meshy con los clips del juego, escalado a su altura. lod: la versión ligera (para multitudes). */
// (los cuerpos de los vecinos disfrazados, npcGlb.js y trajes.js: llevan su versión ligera y cosas en la mano)
const DEDOS_LIGEROS = new Set(['sanfermin', 'pastor']);
// Los dedos que se doblan (dedos.js), apagados en todos los personajes: el autor, 16 de noviembre de 2026, «no deformes
// los dedos, está quedándote fatal; ya seguirás más adelante». Sin ellos, cada cosa vuelve a como iba antes: la pala y
// la pelota del saque junto a la mano (herramientas.js, glbChar.js), lo que llevan los disfrazados y el bastón de los
// mayores pegado a la mano (agarrar.js devuelve false) y la tarjeta del árbitro sobre la mano abierta. Para retomarlo,
// a true
const CON_DEDOS = false;
// (los golpes reales empiezan 0,3 s antes del instante del golpe: tools/blender/golpes-al-juego.py)
const REAL_GOLPE = 0.3;
function recortaReal(clip, nombre, t0) {
  const tracks = clip.tracks.map(tr => { const vs = tr.getValueSize(), i0 = Math.max(0, tr.times.findIndex(t => t >= t0 - 1e-4)); return new tr.constructor(tr.name, tr.times.slice(i0).map(t => t - tr.times[i0]), tr.values.slice(i0 * vs)); });
  return new THREE.AnimationClip(nombre, Math.max(0.05, clip.duration - t0), tracks);
}
// la postura de un clip en un instante, como la de poseArmado (pelotaMoves.js): el giro de cada hueso y el sitio de la cadera
function poseDeClip(scene, clip, t) {
  const huesos = []; scene.traverse(o => { if (o.isBone) huesos.push([o, o.quaternion.clone(), o.position.clone()]); });
  const mixer = new THREE.AnimationMixer(scene), act = mixer.clipAction(clip); act.play(); mixer.setTime(t);
  const out = { q: {}, pos: new THREE.Vector3() };
  for (const [b] of huesos) { out.q[b.name] = b.quaternion.clone(); if (/Hips$/.test(b.name)) out.pos.copy(b.position); }
  act.stop(); mixer.uncacheRoot(scene); for (const [b, q, p] of huesos) { b.quaternion.copy(q); b.position.copy(p); }
  return out;
}
// EL CUERPO FIRME DE LOS PELOTARIS NUEVOS. El autor, 17 de noviembre de 2026: «ni el torso ni el hombro se tienen que
// deformar; solo es movimiento de giro, de hombro y de cadera; el cuerpo es un bloque sólido». Su piel es de piezas
// rígidas (tools/blender/piel-rigida.py): cada parte del cuerpo va entera con su hueso, y solo pasa de un hueso al
// siguiente en una franja estrecha en cada articulación. Además:
//  - la franja se mezcla con cuaterniones duales: la articulación gira sin aplastarse ni vaciarse. Con la mezcla de
//    siempre, la de las matrices, un giro grande encoge la unión, como el envoltorio de un caramelo;
//  - las clavículas no mueven piel (van en el bloque del torso): su giro pasa al brazo, que acaba igual de orientado y
//    gira sobre el hombro quieto. Lo hace GlbChar en cada fotograma y loadMeshy en las posturas de armado.
export const PIEL_RIGIDA = /^pelotari_nuev/;
const DQS_PARS = /* glsl */`
#ifdef USE_SKINNING
vec4 dqsQuat( mat3 m ) {
  float t = m[0][0] + m[1][1] + m[2][2]; float s;
  if ( t > 0.0 ) { s = sqrt( t + 1.0 ) * 2.0; return vec4( ( m[1][2] - m[2][1] ) / s, ( m[2][0] - m[0][2] ) / s, ( m[0][1] - m[1][0] ) / s, 0.25 * s ); }
  if ( m[0][0] > m[1][1] && m[0][0] > m[2][2] ) { s = sqrt( 1.0 + m[0][0] - m[1][1] - m[2][2] ) * 2.0; return vec4( 0.25 * s, ( m[1][0] + m[0][1] ) / s, ( m[2][0] + m[0][2] ) / s, ( m[1][2] - m[2][1] ) / s ); }
  if ( m[1][1] > m[2][2] ) { s = sqrt( 1.0 + m[1][1] - m[0][0] - m[2][2] ) * 2.0; return vec4( ( m[1][0] + m[0][1] ) / s, 0.25 * s, ( m[2][1] + m[1][2] ) / s, ( m[2][0] - m[0][2] ) / s ); }
  s = sqrt( 1.0 + m[2][2] - m[0][0] - m[1][1] ) * 2.0; return vec4( ( m[2][0] + m[0][2] ) / s, ( m[2][1] + m[1][2] ) / s, 0.25 * s, ( m[0][1] - m[1][0] ) / s );
}
// (de la matriz de un hueso, su giro, su sitio como parte dual y su escala, que es la misma en los tres ejes)
void dqsDe( mat4 M, out vec4 r, out vec4 d, out float k ) {
  k = length( M[0].xyz ); r = normalize( dqsQuat( mat3( M ) / k ) ); vec3 t = M[3].xyz;
  d = 0.5 * vec4( r.w * t + cross( t, r.xyz ), - dot( t, r.xyz ) );
}
#endif
`;
const DQS_BASE = /* glsl */`
#ifdef USE_SKINNING
  mat4 boneMatX = getBoneMatrix( skinIndex.x );
  mat4 boneMatY = getBoneMatrix( skinIndex.y );
  mat4 boneMatZ = getBoneMatrix( skinIndex.z );
  mat4 boneMatW = getBoneMatrix( skinIndex.w );
  vec4 dqR0, dqD0, dqR1, dqD1, dqR2, dqD2, dqR3, dqD3; float dqK0, dqK1, dqK2, dqK3;
  dqsDe( boneMatX, dqR0, dqD0, dqK0 ); dqsDe( boneMatY, dqR1, dqD1, dqK1 ); dqsDe( boneMatZ, dqR2, dqD2, dqK2 ); dqsDe( boneMatW, dqR3, dqD3, dqK3 );
  // (todos los giros en el mismo hemisferio que el primero: q y -q son el mismo giro, pero mezclados se anulan)
  if ( dot( dqR0, dqR1 ) < 0.0 ) { dqR1 = - dqR1; dqD1 = - dqD1; }
  if ( dot( dqR0, dqR2 ) < 0.0 ) { dqR2 = - dqR2; dqD2 = - dqD2; }
  if ( dot( dqR0, dqR3 ) < 0.0 ) { dqR3 = - dqR3; dqD3 = - dqD3; }
  vec4 dqR = skinWeight.x * dqR0 + skinWeight.y * dqR1 + skinWeight.z * dqR2 + skinWeight.w * dqR3;
  vec4 dqD = skinWeight.x * dqD0 + skinWeight.y * dqD1 + skinWeight.z * dqD2 + skinWeight.w * dqD3;
  float dqK = skinWeight.x * dqK0 + skinWeight.y * dqK1 + skinWeight.z * dqK2 + skinWeight.w * dqK3;
  float dqL = length( dqR ); dqR /= dqL; dqD /= dqL;
#endif
`;
const DQS_NORMAL = /* glsl */`
#ifdef USE_SKINNING
  vec3 dqN = mat3( bindMatrix ) * objectNormal;
  dqN += 2.0 * cross( dqR.xyz, cross( dqR.xyz, dqN ) + dqR.w * dqN );
  objectNormal = mat3( bindMatrixInverse ) * dqN;
  #ifdef USE_TANGENT
    vec3 dqT = mat3( bindMatrix ) * objectTangent;
    dqT += 2.0 * cross( dqR.xyz, cross( dqR.xyz, dqT ) + dqR.w * dqT );
    objectTangent = mat3( bindMatrixInverse ) * dqT;
  #endif
#endif
`;
const DQS_POS = /* glsl */`
#ifdef USE_SKINNING
  vec3 dqP = ( bindMatrix * vec4( transformed, 1.0 ) ).xyz * dqK;
  dqP += 2.0 * cross( dqR.xyz, cross( dqR.xyz, dqP ) + dqR.w * dqP );
  dqP += 2.0 * ( dqR.w * dqD.xyz - dqD.w * dqR.xyz + cross( dqR.xyz, dqD.xyz ) );
  transformed = ( bindMatrixInverse * vec4( dqP, 1.0 ) ).xyz;
#endif
`;
/** La piel de un material mezclada con cuaterniones duales (encima de lo que ya cambie su onBeforeCompile). */
export function pielDQS(m) {
  if (!m || m.userData.dqs) return m;
  m.userData.dqs = true;
  const prev = m.onBeforeCompile, clave = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <skinning_pars_vertex>', '#include <skinning_pars_vertex>\n' + DQS_PARS)
      .replace('#include <skinbase_vertex>', DQS_BASE).replace('#include <skinnormal_vertex>', DQS_NORMAL).replace('#include <skinning_vertex>', DQS_POS);
  };
  m.customProgramCacheKey = function () { return (clave ? clave.call(this) : '') + '|dqs'; };
  m.needsUpdate = true;
  return m;
}
// (la sombra, con la misma piel: si no, la sombra del hombro iría por un lado y el hombro por otro)
let sombraDQS = null;
const sombraRigida = () => sombraDQS || (sombraDQS = pielDQS(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })));
// el giro de la clavícula, al brazo: el brazo queda igual de orientado (B = q0⁻¹·qClavícula·qBrazo) y la clavícula en su
// reposo. En una postura guardada ({q: {hueso: giro}}) o en los huesos
// (y el cuello a la cabeza: el cuello va en el bloque del torso y la cabeza gira encima. El autor, 18 de noviembre de 2026:
// «cuello, hombros, torso, core son un bloque sólido y firme»)
const CLAV = [['mixamorigLeftShoulder', 'mixamorigLeftArm'], ['mixamorigRightShoulder', 'mixamorigRightArm'], ['mixamorigNeck', 'mixamorigHead']];
function claviculaPose(pose, q0) {
  for (const [nS, nA] of CLAV) {
    const qs = pose.q[nS], qa = pose.q[nA];
    if (!qs || !qa || !q0[nS]) continue;
    pose.q[nA] = q0[nS].clone().invert().multiply(qs).multiply(qa); pose.q[nS] = q0[nS].clone();
  }
}
export async function loadMeshy(name, lod = false, completo = false) {
  lod = lod && !!MESHY_LOD[name]; completo = completo && !lod && !!VEC_FULL[name];
  const key = 'meshy:' + name + (lod ? ':lod' : completo ? ':full' : ''), height = MESHY_H[name] || 1.5;
  if (!cache.has(key)) cache.set(key, (async () => {
    // (los vecinos, actors/npcGlb.js: sus originales, en src/assets/meshy/vecinos, no se publican; el juego lleva su versión
    // ligera y solo el servidor de desarrollo sirve el original, para sus retratos: tools/meshy-retratos.mjs)
    const g = await loadChar(lod ? MESHY_LOD[name] : completo ? VEC_FULL[name] : MESHY[name] || (import.meta.env.DEV ? `/src/assets/meshy/vecinos/${name}.glb` : MESHY_LOD[name]));
    // (las proporciones de todos, CABEZA: la cabeza a su tamaño; sin la escala de la cabeza que traen algunos clips, que
    // la devolvería a 1 en cada fotograma)
    const kCab = PROPORCION && !REDISENO.has(name) ? CABEZA[name] || 1 : 1;
    if (kCab !== 1) { let head = null; g.scene.traverse(o => { if (!head && o.isBone && /Head$/.test(o.name)) head = o; });
      if (head) { head.scale.setScalar(kCab); head.userData.cabK = kCab; for (const a of g.animations) a.tracks = a.tracks.filter(t => !/Head\.scale$/.test(t.name)); } }
    // (el Zarratrako, con la cabeza quieta respecto al cuerpo: su cara va dentro de las cintas del gorro, que cuelgan del
    // cuerpo, y al girar la cabeza la cara se salía de ellas; lo vio el autor el 17 de noviembre de 2026. Sin el giro de la
    // cabeza de sus animaciones ni el de mirar a quien le habla, GlbChar con sinGiroCabeza)
    const quieta = SIN_GIRO_CABEZA.has(name);
    if (quieta) for (const a of g.animations) a.tracks = a.tracks.filter(t => !/(Head|Neck)\.quaternion$/.test(t.name));
    // (el pelotari: sus movimientos de pelota, hechos sobre su esqueleto en reposo antes de que nada lo mueva, y la postura
    // de armado de cada golpe, que se mezcla mientras llega la pelota; pelotaMoves.js)
    const pel = /^pelotari/.test(name) ? pelotaMoves(g.scene) : [];
    const armados = pel.length ? Object.fromEntries([['Hit', 'Hit', false], ['HitL', 'Hit', true], ['Low', 'Low', false], ['LowL', 'Low', true], ['High', 'High', false], ['HighL', 'High', true], ['Lleva', 'Lleva', false], ['LlevaC', 'LlevaC', false], ['Bota', 'Bota', false], ['Saque', 'Saque', false]].map(([k, c, iz]) => [k, poseArmado(g.scene, c, iz)])) : null;
    // (los golpes reales: movimientos de pelotaris de verdad sacados de vídeo y pasados a su esqueleto en Blender
    // (tools/blender/golpes-al-juego.py, «Real_Hit», «Real_Volea»...). Sustituyen a los hechos a mano de los golpes que
    // traen: el clip del juego empieza en el golpe y la postura de armado es la del pelotari de verdad un poco antes. El
    // autor, 17 de noviembre de 2026: «imitando la postura de los pelotaris»)
    if (pel.length) for (const r of g.animations.filter(a => /^Real_/.test(a.name))) {
      const n = r.name.slice(5); r.tracks = r.tracks.filter(t => /\.quaternion$/.test(t.name) || /Hips\.position$/.test(t.name));
      const k = recortaReal(r, n, REAL_GOLPE), i = pel.findIndex(c => c.name === n); if (i >= 0) pel[i] = k; else pel.push(k);
      if (armados && armados[n]) armados[n] = poseDeClip(g.scene, r, REAL_GOLPE - 0.08);
    }
    // (cuerpo firme: las posturas de armado, con la clavícula en su sitio y su giro en el brazo; y la piel con cuaterniones
    // duales. El reposo de cada clavícula, antes de que nada lo mueva)
    const rigida = PIEL_RIGIDA.test(name);
    if (rigida) {
      const q0 = {}; g.scene.traverse(o => { if (o.isBone && /(Shoulder|Neck)$/.test(o.name)) q0[o.name] = o.quaternion.clone(); });
      if (armados) for (const p of Object.values(armados)) claviculaPose(p, q0);
      // (y la tela por las dos caras: al cruzar el brazo por delante, el sobaco se pliega sobre sí mismo, como una
      // camiseta de verdad, y por el pliegue asomaba la cara de dentro, que sin pintar era un agujero; pintada, es una
      // arruga de la tela. Lo mismo en la garganta al girar la cabeza)
      g.scene.traverse(o => { if (o.isSkinnedMesh) for (const m of [].concat(o.material)) { pielDQS(m); m.side = THREE.DoubleSide; } });
    }
    // textura nítida también vista de lado (anisotropía); en el móvil se reduce salvo la del personaje del jugador
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; for (const m of [].concat(o.material)) { shrinkMap(m, FULL_TEX.has(name) ? 2048 : MESHY_TEX); sharpMap(m); if (m.map) { m.map.anisotropy = 8; m.map.needsUpdate = true; }
      // luz de relleno propia: la cámara va detrás y el sol suele darle de frente, así que se le veía siempre en sombra.
      // Un poco de su propio color como luz propia lo aclara desde cualquier lado sin tocar el resto de la escena
      if (m.map && m.emissive) { m.emissiveMap = m.map; fillMaterial(m, MESHY_FILL); m.needsUpdate = true; } } } });
    const src = Object.fromEntries(g.animations.map(a => [a.name, a]));
    // andar y correr dan vueltas: su último fotograma es el mismo que el primero y, al repetirse, esa postura salía dos
    // veces seguidas (un tirón en cada paso). Se quita ese fotograma repetido
    const animations = ['Walk', 'Run'].filter(n => src[n]).map(n => seamless(src[n]));
    // el futbolista trae su chut: es su golpe (pase y tiro), desde que echa la pierna atrás
    const cuts = { ...MESHY_CUTS, ...(src.Kick ? { Hit: ['Kick', 0.46, 1.15] } : {}), ...(src.Alert && !MESHY_BY[name] ? cortesVecino(src, name) : {}), ...(MESHY_BY[name] || {}) };
    for (const [want, [from, t0, t1, pp, flat, rate]] of Object.entries(cuts)) {
      if (!src[from]) continue;
      const k = cutClip(src[from], want, t0, Math.min(t1, src[from].duration), flat); if (want === 'Talk' && (from === 'Chat' || from === 'TalkP')) calmaClip(k); k.userData = { ...(pp ? { pingpong: true } : {}), ...(rate ? { rate } : {}) }; animations.push(k);
    }
    // (los del pelotari sustituyen a los recortes de los de Meshy; de pie y quieto, su reposo)
    if (pel.length) {
      const nuevos = new Set([...pel.map(c => c.name), 'Still']); for (let i = animations.length - 1; i >= 0; i--) if (nuevos.has(animations[i].name)) animations.splice(i, 1);
      for (const c of pel) { c.userData = {}; animations.push(c); }
      const q = pel.find(c => c.name === 'Idle'); if (q) { const st = q.clone(); st.name = 'Still'; st.userData = {}; animations.push(st); }
    }
    // (con la cabeza cambiada, la altura se mide con la malla deformada por sus huesos: si no, saldría la de antes)
    if (kCab !== 1) g.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g.scene, kCab !== 1), fit = height / Math.max(0.1, box.max.y - box.min.y);
    // (los dedos: huesos nuevos en cada falange, para que las manos se doblen y agarren; dedos.js. Después de las posturas de
    // armado, que no deben tocarlos. También en la versión ligera de los vecinos del pueblo, que es la que llevan siempre,
    // y en la de los cuerpos de los disfrazados (DEDOS_LIGEROS), que llevan en la mano el isipu, la escoba o la espada
    // (agarrar.js); no en las demás de las multitudes de la grada y el campo, que no se ven de cerca)
    let dedos = null;
    if (CON_DEDOS && (!lod || !MESHY[name] || DEDOS_LIGEROS.has(name))) { let h = null; g.scene.traverse(o => { if (!h && o.isBone && /RightHand$/.test(o.name)) h = o; });
      if (h) { g.scene.updateMatrixWorld(true); try { dedos = ponDedos(g.scene, h.getWorldScale(new THREE.Vector3()).x * fit); } catch (e) { console.warn('dedos', name, e); } } }
    return { scene: g.scene, animations, userData: { fit, meshy: true, ...(quieta ? { sinGiroCabeza: true } : {}), ...(armados ? { armados } : {}), ...(dedos ? { dedos } : {}), ...(rigida ? { rigida: true } : {}) } };
  })());
  return cache.get(key);
}
/** Carga (una sola vez por url) el GLB de un personaje. */
export function loadChar(url) {
  if (!cache.has(url)) {
    if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
    cache.set(url, loadGLB(loader, url));
  }
  return cache.get(url);
}

// velocidades de referencia de los clips (m/s): el timeScale sale de la velocidad real
const WALK_REF = 4.3, RUN_REF = 7.2;
const FADE = 0.2;

export class GlbChar {
  /**
   * @param {object} gltf resultado de loadChar
   * @param {object} [opt] { timeScale: multiplicador de ritmo (Kike 1.15), walkAt, runAt: velocidades de cambio,
   *   gait(v, 'Walk'|'Run'): ritmo del clip según la velocidad (por defecto v / 4,3 y v / 7,2 como en el encargo) }
   */
  constructor(gltf, opt = {}) {
    this.root = SkeletonUtils.clone(gltf.scene);
    this.armados = gltf.userData?.armados || null;   // (el pelotari: la postura de armado de cada golpe)
    // (los dedos de cada mano y, en la derecha, dónde queda el hueco del puño con el mango; dedos.js)
    this.dedos = gltf.userData?.dedos ? new Dedos(gltf.userData.dedos, null) : null;
    this.agarre = gltf.userData?.dedos?.R?.agarre || null;
    this.root.name = 'GlbChar'; this.root.userData.glbChar = this;   // (el vigía de las pruebas lo encuentra así)
    this.switches = 0;
    this.opt = { timeScale: 1, walkAt: 0.15, runAt: 3.2, ...opt };
    // vecinos (vary): cada uno con su ritmo de reposo y empezando en un punto distinto del clip; si no, todo el pueblo
    // respiraba y se balanceaba a la vez, como un baile ensayado
    this.vary = !!opt.vary; this.idleRate = this.vary ? 0.86 + Math.random() * 0.28 : 1;
    this.meshes = {};
    this.groups = {};
    this.bones = {};
    this.sockets = {};
    this.root.traverse(o => {
      if (o.isBone) { this.bones[o.name] = o; return; }
      if (o.name.startsWith('Socket_')) this.sockets[o.name] = o;
      if (o.isMesh) { o.frustumCulled = false; o.castShadow = SHADOW_PARTS.test(o.name); if (!o.castShadow) o.userData.noShadow = true; }
      if (o.name && !this.meshes[o.name]) this.meshes[o.name] = o;
      // variantes: nodos con «group» en sus extras (las bocas de dos materiales llegan como grupo)
      const g = o.userData.group;
      if (g) {
        (this.groups[g] = this.groups[g] || []).push(o);
        o.visible = !!o.userData.default;
      }
    });
    if (!Object.values(this.meshes).some(m => m.isMesh && m.castShadow)) this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; delete o.userData.noShadow; } });
    // (cuerpo firme, loadMeshy PIEL_RIGIDA: la sombra con la misma piel y las clavículas, con su reposo, para pasar su giro
    // al brazo en cada fotograma)
    this.clav = null;
    if (gltf.userData?.rigida) {
      this.root.traverse(o => { if (o.isSkinnedMesh && [].concat(o.material).some(m => m?.userData?.dqs)) o.customDepthMaterial = sombraRigida(); });
      this.clav = CLAV.map(([s, a]) => [this.bones[s], this.bones[a]]).filter(([a, b]) => a && b).map(([a, b]) => ({ s: a, a: b, q0: a.quaternion.clone(), qi: a.quaternion.clone().invert() }));
    }
    // mirada: con los huesos Eye_L/Eye_R si los hay; si no, moviendo la textura del ojo (personajes antiguos)
    this.eyeBones = ['Eye_L', 'Eye_R'].map(n => this.bones[n]).filter(Boolean);
    // ojos pintados sobre la cabeza (estilo juguete): el iris se mueve desplazando su textura
    const painted = this.meshes.Eye_L && this.meshes.Eye_L.parent && this.meshes.Eye_L.parent.name === 'Head';
    if (painted) this.eyeBones = [];
    const eye = !this.eyeBones.length && this.meshes.Eye_L;
    if (eye && eye.material) {
      const mat = eye.material.clone();
      if (mat.map) { mat.map = mat.map.clone(); mat.map.needsUpdate = true; }
      // un poco de luz propia: el blanco del ojo se lee blanco aunque la cara quede en sombra (como en un dibujo)
      if (painted && mat.map && mat.emissive) { fillMaterial(mat, 1); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.28; }
      this.eyeMat = mat;
      for (const n of ['Eye_L', 'Eye_R']) if (this.meshes[n]) this.meshes[n].material = mat;
    }
    this.lidOpen = this.groups.lid?.some(m => m.name === 'Eyelid_Open') ? 'Eyelid_Open' : '';
    // piezas de la cara: de lejos se ocultan (miden un par de píxeles) y se recuerdan para volver a mostrarlas
    this.faceMeshes = []; this.root.traverse(o => { if (o.isMesh && FACE_PARTS.test(o.name)) { o.userData.want = o.visible; this.faceMeshes.push(o); } });
    this.faceOn = true;
    this.mixer = new THREE.AnimationMixer(this.root);
    this.actions = {};
    this.clipExtras = {};
    for (const clip of gltf.animations) {
      const a = this.mixer.clipAction(clip);
      const loop = !/^(Jump_Start|Land|Caught|Roar|Dodge_[LR])$/.test(clip.name);
      if (!loop) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      else if (clip.userData?.pingpong) a.setLoop(THREE.LoopPingPong, Infinity);
      this.actions[clip.name] = a;
      this.clipExtras[clip.name] = clip.userData || {};
    }
    this.mixer.addEventListener('finished', e => this._onFinished(e.action));
    this.current = null;
    this.oneShot = null;
    this.speed = 0;
    this.talking = false;
    this.faceLock = 0;
    this.face = { mouth: 'Neutral', brow: 'Normal', hand: 'Open' };
    this.blinkT = 2 + Math.random() * 3;
    this.blinkLeft = 0;
    this.lookTarget = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.lookT = 1 + Math.random() * 2;
    this.talkT = 0;
    this._initSprings();
    this.headBone = gltf.userData?.sinGiroCabeza ? null : this.bones.Head || this.bones.mixamorigHead || null; this.headYaw = 0;
    this.postBones = [...this.eyeBones, ...this.springs.map(s => s.b), ...(this.headBone ? [this.headBone] : [])];
    for (const b of this.postBones) b.userData.q0 = b.quaternion.clone();
    if (opt.outline) this._addOutline(opt.outline);
    this.play('Idle', 0);
  }

  // contorno de dibujo (casco invertido) en las mallas grandes, a juego con las minifiguras
  _addOutline(w) {
    const mat = outlineMat(w);
    for (const n of ['Body', 'Head', 'Hair', 'Acc_Scarf']) {
      const m = this.meshes[n];
      if (!m || !m.isSkinnedMesh) continue;
      const o = new THREE.SkinnedMesh(m.geometry, mat);
      o.bind(m.skeleton, m.bindMatrix);
      o.frustumCulled = false; o.userData.outline = true; o.name = n + '_Outline';
      m.parent.add(o);
    }
  }

  get clips() { return Object.keys(this.actions); }

  /** Cambia al clip indicado con fundido. */
  play(name, fade = FADE) {
    const a = this.actions[name];
    if (!a || this.current === a) return a;
    a.reset().setEffectiveWeight(1).play(); this.switches++;
    if (this.vary && /^(Idle|Talk)/.test(name)) a.time = Math.random() * a.getClip().duration;
    if (this.current) this.current.crossFadeTo(a, fade, false);
    this.current = a; this.playT = 0;
    this.currentName = name;
    if (!this.faceLock) this._clipFace(name);
    return a;
  }

  _clipFace(name) {
    const ex = this.clipExtras[name]; if (!ex) return;
    const mouth = ex.mouth || ex.face, brow = ex.brows || ex.brow, hand = ex.hands || ex.hand;
    if (mouth) this.setFace(mouth, brow, hand);
  }

  /** Clip de una sola vez (saludo, celebrar…): al acabar vuelve a la locomoción. */
  /** Un gesto suelto durante secs segundos; con fit, el clip entero acelerado o frenado para caber en ese tiempo (si no,
   *  de un clip largo solo se veía el principio y se cortaba de golpe: el aterrizaje del salto iba «a trozos»). */
  playOnce(name, secs, fit = false, then = null, fade = undefined) {
    const a = this.actions[name];
    if (!a) return;
    const dur = a.getClip().duration;
    this.oneShot = { name, t: secs ?? dur, d: secs ?? dur, then };   // (d: lo que dura, para saber cuánto lleva)
    a.timeScale = fit && secs ? dur / secs : 1;
    if (this.current === a) a.reset().setEffectiveWeight(1).play();   // (el mismo movimiento otra vez, desde el principio: dos golpes seguidos del mismo lado)
    this.play(name, fade);
  }
  /** Un clip que se mantiene (el vuelo de un salto) hasta que se quite oneShot: sin volver a la locomoción entre medias. */
  hold(name) {
    const a = this.actions[name]; if (!a) return;
    a.timeScale = 1; this.oneShot = { name, t: Infinity, then: null }; this.play(name);
  }
  // fin del gesto: sigue con el encadenado (el impulso del salto pasa al vuelo) o vuelve a la locomoción
  _endOneShot() { const n = this.oneShot?.then; this.oneShot = null; if (n) this.hold(n); }

  _onFinished(action) {
    if (this.oneShot && this.actions[this.oneShot.name] === action) this._endOneShot();
  }

  /** Velocidad horizontal en m/s: elige Idle/Walk/Run y ajusta el ritmo. */
  setSpeed(v) { this.speed = v; }

  setTalking(on) {
    this.talking = on;
    if (on && !this.oneShot) this.play('Talk');
  }

  /** Cara: boca (Neutral, Smile, SmileOpen, Surprised, Scared, TalkA, TalkO, Tired), cejas (Normal, Happy, Angry,
   *  Worried, Surprised) y manos (Open, Fist, Point). Acepta también los nombres antiguos (Normal, Happy, Talk_A…). */
  setFace(mouth, brow, hand) {
    if (mouth) { this.face.mouth = mouth; this._show('mouth', ...variantNames('Mouth_', mouth)); }
    if (brow) { this.face.brow = brow; this._show('brow', ...variantNames('Brow_', brow)); }
    if (hand) {
      this.face.hand = hand;
      this._show('hand_R', 'Hand_R_' + hand) || this._show('hand_R', 'Hand_R_Open');
      this._show('hand_L', 'Hand_L_' + (hand === 'Point' ? 'Open' : hand)) || this._show('hand_L', 'Hand_L_Open');
    }
  }

  /** Mantiene una expresión durante unos segundos aunque cambie el clip. */
  holdFace(mouth, brow, secs = 1.5, hand) {
    this.setFace(mouth, brow, hand);
    this.faceLock = secs;
  }

  _show(group, ...names) {
    const list = this.groups[group]; if (!list) return false;
    const name = names.find(n => list.some(m => m.name === n));
    if (!name) return false;
    for (const m of list) { m.userData.want = m.name === name; m.visible = m.userData.want && this.faceOn; }
    return true;
  }
  /** Cara con detalle (ojos, cejas, boca…) o sin ella cuando el personaje está lejos. */
  setFaceVisible(on) {
    if (this.faceOn === on) return; this.faceOn = on;
    for (const m of this.faceMeshes) m.visible = on && m.userData.want !== false;
  }

  _lid(name) {
    const list = this.groups.lid;
    if (list) for (const m of list) { m.userData.want = m.name === name; m.visible = m.userData.want && this.faceOn; }
  }

  /** Mirada en [-1,1] (x a la derecha de quien mira, y arriba). */
  lookAt2(x, y) { this.lookTarget.set(x, y); this.lookT = 2; }

  update(dt) {
    dt = Math.min(dt, 0.35);
    // locomoción
    if (this.oneShot && (this.oneShot.t -= dt) <= 0) this._endOneShot();
    if (!this.oneShot) {
      const v = this.speed, ts = this.opt.timeScale;
      let want = this.idleName && this.actions[this.idleName] ? this.idleName : 'Idle', scale = ts;
      const gait = this.opt.gait;
      // paso con margen (histéresis) y un mínimo de 0,25 s en cada uno: a ritmo de trote, justo en el umbral, la figura
      // cambiaba de andar a correr (o de quieta a andar) varias veces por segundo y daba tirones
      // (arrancar es inmediato; lo que espera es frenar a un paso más lento)
      const g0 = this.gaitName || 'Idle', R = { Idle: 0, Walk: 1, Run: 2 };
      const runAt = this.opt.runAt * (g0 === 'Run' ? 0.92 : 1.08), walkAt = this.opt.walkAt * (g0 === 'Idle' ? 2 : 1);
      let gn = v > runAt ? 'Run' : v > walkAt ? 'Walk' : 'Idle';
      this.gaitT = (this.gaitT || 0) + dt;
      if (R[gn] < R[g0] && this.gaitT < 0.3 && v > 0.02) gn = g0;
      if (gn !== g0) { this.gaitName = gn; this.gaitT = 0; }
      // (de lado mirando al frontis, el pelotari se desplaza con pasos laterales en vez de andar de lado)
      // (solo a paso de ajuste, hasta 1,6 m/s, con margen hasta 2: más deprisa, el pelotari corre de verdad; a 2 o 3 m/s los
      // pasos laterales patinaban. Y con margen en el tiempo: entrar de lado es inmediato, pero salir o cambiar de lado
      // espera a llevar 0,25 s en el que está; la marca de lado del partido cambiaba de un fotograma a otro y la figura
      // daba tirones de un clip a otro)
      const quiereLat = this.lado && gn !== 'Idle' && v < (this.latName ? 2.0 : 1.6) ? (this.lado > 0 ? 'ShuffleL' : 'ShuffleR') : null;
      this.latT = (this.latT || 0) + dt;
      if (gn === 'Idle' || (this.latName && v >= 2.0)) { this.latName = null; this.latT = 0; }   // (pararse o arrancar a correr, al momento)
      else if (quiereLat !== (this.latName || null) && (!this.latName || this.latT > 0.25)) { this.latName = quiereLat; this.latT = 0; }
      const lat = this.latName ? this.actions[this.latName] : null;
      if (lat) { want = this.latName; scale = ts * Math.min(1.6, Math.max(0.7, v / 1.3)); }
      else if (gn === 'Run' && this.actions.Run) { want = 'Run'; scale = ts * (gait ? gait(v, 'Run') : Math.max(0.6, v / RUN_REF)); }
      else if (gn !== 'Idle' && this.actions.Walk) { want = 'Walk'; scale = ts * (gait ? gait(v, 'Walk') : Math.max(0.35, v / WALK_REF)); }
      else if (this.talking && this.actions.Talk) want = 'Talk';
      if (want !== 'Walk' && want !== 'Run' && !lat) scale *= (this.clipExtras[want]?.rate || 1) * this.idleRate;
      else if (this.back) scale = -scale;   // hacia atrás sin darse la vuelta (el pelotari, mirando al frontis): el paso al revés
      this.play(want);
      if (this.current) this.current.timeScale = scale;
    }
    // lo que el ajuste de después (post: el armado del brazo, el encorvado del cansancio, la postura al volante) dejó en los
    // huesos en la imagen anterior, se deshace antes de animar: el mixer solo escribe un hueso cuando su valor cambia de
    // una imagen a otra, así que en un hueso que el clip tiene quieto el ajuste se sumaba imagen tras imagen. Un pelotari
    // cansado, parado o celebrando, acababa con el tronco dando vueltas sobre sí mismo, más deprisa cuanto más cansado
    const A = this._antesPost;
    if (A?.vale) { for (let i = 0; i < A.b.length; i++) { A.b[i].quaternion.copy(A.q[i]); A.b[i].position.copy(A.p[i]); } A.vale = false; }
    // los huesos que se tocan después del mixer vuelven a su base (un clip puede no animarlos)
    for (const b of this.postBones) b.quaternion.copy(b.userData.q0);
    this.mixer.update(dt);
    // (cuerpo firme: el giro de cada clavícula, al brazo, antes de los ajustes de después, que ya trabajan con el hombro quieto)
    if (this.clav) for (const c of this.clav) { _q.copy(c.qi).multiply(c.s.quaternion); c.a.quaternion.premultiply(_q); c.s.quaternion.copy(c.q0); }
    // (los dedos, hacia la postura que toque: relajados, a medio cerrar corriendo o la que haya pedido el juego)
    if (this.dedos) { if (!this.dedos.listo) this.dedos.liga(this.bones); this.dedos.update(dt, this.gaitName === 'Run'); }
    // vigía: si la acción en curso se ha parado o se ha quedado sin peso (se vería la postura en cruz del modelo), vuelve
    const cur = this.current;
    this.playT = (this.playT || 0) + dt;
    if (cur && this.playT > FADE + 0.1 && (!cur.isRunning() || cur.getEffectiveWeight() < 0.05) && !cur.paused && cur.loop !== THREE.LoopOnce) { cur.reset().setEffectiveWeight(1).play(); this.fixes = (this.fixes || 0) + 1; }
    // expresión fijada
    if (this.faceLock > 0 && (this.faceLock -= dt) <= 0) {
      this.faceLock = 0;
      this._clipFace(this.currentName);
    }
    // boca al hablar: alterna A/O
    if (this.currentName === 'Talk' && !this.faceLock) {
      this.talkT -= dt;
      if (this.talkT <= 0) {
        this.talkT = 0.09 + Math.random() * 0.12;
        const r = Math.random();
        const m = r < 0.45 ? 'TalkA' : r < 0.8 ? 'TalkO' : 'Neutral';
        this._show('mouth', ...variantNames('Mouth_', m));
      }
    }
    // parpadeo cada 2–5 s durante 120 ms
    if (this.blinkLeft > 0) {
      this.blinkLeft -= dt;
      this._lid(this.blinkLeft > 0.04 && this.blinkLeft < 0.08 ? 'Eyelid_Closed' : this.blinkLeft > 0 ? 'Eyelid_Half' : this.lidOpen);
    } else if ((this.blinkT -= dt) <= 0) {
      this.blinkT = 2 + Math.random() * 3;
      this.blinkLeft = 0.12;
    }
    // mirada: pequeños saltos de la pupila
    if ((this.lookT -= dt) <= 0) {
      this.lookT = 1.2 + Math.random() * 2.5;
      this.lookTarget.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4);
    }
    this.look.lerp(this.lookTarget, Math.min(1, dt * 14));
    if (this.eyeMat && this.eyeMat.map) this.eyeMat.map.offset.set(-this.look.x * 0.035, -this.look.y * 0.025);
    // la cabeza se adelanta a los giros (mira hacia donde va a torcer)
    if (this.headBone && Math.abs(this.headYaw) > 1e-3) { _q.setFromAxisAngle(_Y, this.headYaw); this.headBone.quaternion.multiply(_q); }
    for (const b of this.eyeBones) { _q.setFromEuler(_e.set(-this.look.y * 0.18, 0, this.look.x * 0.22)); b.quaternion.multiply(_q); }
    if (this.post) {
      // (cómo quedan los huesos antes del ajuste, para deshacerlo en la imagen siguiente)
      let A = this._antesPost;
      if (!A) { const bs = []; this.root.traverse(o => { if (o.isBone) bs.push(o); }); A = this._antesPost = { b: bs, q: bs.map(o => o.quaternion.clone()), p: bs.map(o => o.position.clone()), vale: false }; }
      for (let i = 0; i < A.b.length; i++) { A.q[i].copy(A.b[i].quaternion); A.p[i].copy(A.b[i].position); }
      A.vale = true;
      this.post(this, dt);   // ajustes encima de la animación (p. ej. el brazo de golpear en la pelota)
    }
    this._updateSprings(dt);
  }

  // ---- muelles en pelo y pañuelo (después de mixer.update) ----
  _initSprings() {
    this.springs = [];
    for (const [name, b] of Object.entries(this.bones)) {
      if (!/^(Hair_|Scarf_)/.test(name)) continue;
      this.springs.push({ b, ang: new THREE.Vector2(), vel: new THREE.Vector2(), prev: null, tip: new THREE.Vector3() });
    }
  }

  _updateSprings(dt) {
    if (!this.springs.length || dt <= 0) return;
    // con pasos largos (personaje lejano que se anima a saltos) el muelle se descontrolaría: se deja en reposo
    if (dt > 0.06) { for (const s of this.springs) { s.prev = null; s.ang.set(0, 0); s.vel.set(0, 0); } return; }
    const K = 60, D = 8, wp = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
    this.root.updateMatrixWorld(true);
    for (const s of this.springs) {
      s.b.getWorldPosition(wp);
      if (!s.prev) { s.prev = wp.clone(); continue; }
      // la inercia empuja el hueso en contra de su aceleración (aprox. con la velocidad)
      const vx = (wp.x - s.prev.x) / dt, vz = (wp.z - s.prev.z) / dt, vy = (wp.y - s.prev.y) / dt;
      s.prev.copy(wp);
      // al espacio local del padre
      s.b.parent.getWorldQuaternion(q).invert();
      const lv = new THREE.Vector3(vx, vy, vz).applyQuaternion(q);
      const fx = -lv.z * 0.9 - lv.y * 0.3, fz = lv.x * 0.9;
      s.vel.x += (fx - K * s.ang.x - D * s.vel.x) * dt;
      s.vel.y += (fz - K * s.ang.y - D * s.vel.y) * dt;
      s.ang.x = THREE.MathUtils.clamp(s.ang.x + s.vel.x * dt, -0.6, 0.6);
      s.ang.y = THREE.MathUtils.clamp(s.ang.y + s.vel.y * dt, -0.6, 0.6);
      q.setFromEuler(e.set(s.ang.x, 0, s.ang.y));
      s.b.quaternion.multiply(q);
    }
  }

  /** Pone una mano ('R' o 'L') en una postura de dedos.js ('abierta', 'relajada', 'carrera', 'puno', 'mango', 'pelota');
   *  null: la de siempre (relajada, o a medio cerrar corriendo). */
  mano(lado, modo) { this.dedos?.pon(lado, modo); }
  /** Cierra (1) la mano derecha alrededor del mango de la herramienta, o la deja (0) como siempre */
  cierraMano(v) { this.mano('R', v ? 'mango' : null); }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    if (this.eyeMat) { this.eyeMat.map && this.eyeMat.map.dispose(); this.eyeMat.dispose(); }
    // la textura de los huesos de cada copia (si no, queda una en la memoria gráfica por personaje que se va)
    // (y los materiales propios de esta copia, como el del pelo teñido)
    this.root.traverse(o => { if (o.isSkinnedMesh) { o.skeleton?.dispose(); if (o.material?.userData?.own) o.material.dispose(); } });
  }
}

// ---- personajes GLB elegibles como avatar del jugador ----

export const GLB_AVATARS = {};
// personajes propios (Meshy) elegibles: el sanferminero, el pastor, el futbolista de Osasuna y el pelotari; y las chicas
// (chicas.js: Leire sobre el sanferminero, Nahia sobre el futbolista y Nerea sobre el pelotari), con sus retratos
// (tools/retratos.mjs)
for (const id of ['explorador', 'exploradora', 'sanfermin', 'pastor', 'osasuna', 'pelotari']) if (MESHY[id]) GLB_AVATARS[id] = { meshy: id, ...(id === 'exploradora' ? { ella: true } : {}), bust: MESHY_PICS[id + '_bust'], full: MESHY_PICS[id + '_full'], hero: MESHY_PICS[id + '_hero'] };   // (hero: el grande de la portada)
for (const [id, base] of [['leire', 'sanfermin'], ['nahia', 'osasuna'], ['nerea', 'pelotari']]) if (MESHY[base]) GLB_AVATARS[id] = { meshy: base, chica: 'coleta', bust: MESHY_PICS[id + '_bust'], full: MESHY_PICS[id + '_full'], hero: MESHY_PICS[id + '_hero'] };
/** Si el avatar es una de las chicas (las de chicas.js o la exploradora, con su propio modelo: ella). */
export const avatarIsGirl = (id) => !!(GLB_AVATARS[id]?.chica || GLB_AVATARS[id]?.ella);
export const hasMeshy = (id) => !!MESHY[id];
/** ¿Tiene versión ligera? (los vecinos solo tienen esa en el juego) */
export const hasMeshyLod = (id) => !!MESHY_LOD[id];
/** El retrato de busto de un personaje de Meshy (tools/meshy-retratos.mjs), para las charlas: el de los vecinos. */
export const meshyBust = (id) => MESHY_PICS[id + '_bust'] || null;
/** La altura de un personaje de Meshy en el juego (m). */
export const meshyHeight = (id) => MESHY_H[id] || 1.5;
export const isGlbAvatar = id => !!GLB_AVATARS[id];
export const loadGlbAvatar = (id) => {
  const d = GLB_AVATARS[id];
  if (d.meshy) { fullTexFor(d.meshy); if (d.chica) FULL_CHICA.add(d.meshy); return d.chica ? loadChica(d.meshy, d.chica) : loadMeshy(d.meshy); }   // el del jugador, con su textura completa (las chicas, chicas.js)
  return loadChar(d.url);
};

const EXPR = {
  happy: ['Happy', 'Normal'], surprised: ['Surprised', 'Normal'], scared: ['Scared', 'Worried'], worried: ['Normal', 'Worried'],
  sad: ['Tired', 'Worried'], tired: ['Tired', 'Worried'], angry: ['Normal', 'Angry'], thinking: ['Normal', 'Worried'], neutral: ['Normal', 'Normal'],
};

/** Adaptador con la misma interfaz que MinifigRig (update, doWave, doCheer, setExpr, doAct, carry). */
// las piernas del modelo son un 35 % más largas que las del diseño original: cada paso cubre más suelo
const LEGS = 1.3;
// los gestos que se hacen parado (celebrar, la pena, saludar, soplarse la mano, soltar el brazo, hablar): se cortan en
// cuanto echa a andar (GlbRig.update)
const GESTO = /^(Celebrate|Sad|Wave|Sopla|Suelta|Talk)/;
export class GlbRig {
  constructor(gltf, id = 'sanfermin') {
    const def = GLB_AVATARS[id] || {};
    this.id = id;
    if (gltf.userData?.meshy) this.speeds = MESHY_SPEEDS;   // el jugador anda y corre a su paso
    this.obj = new THREE.Group();
    // zancada natural de los clips: Walk ≈ 1,0 m/s y Run ≈ 2,5 m/s. Las velocidades del juego (3,3 y 6,8 m/s) son
    // mayores: el ritmo sube con la raíz de la velocidad para que las piernas no se vuelvan frenéticas
    // Walk avanza ~1,15 m por ciclo y Run ~2,5 m/s: el ritmo sigue casi a la velocidad (los pies apenas patinan)
    // personajes de Meshy: el ritmo de las piernas sale de su zancada real (medida con tools/zancada.mjs: el clip de
    // andar avanza ~0,92 m/s y el de correr ~1,62 m/s a ritmo 1), así los pies no patinan. Al paso del juego (3,3 m/s)
    // ya trotan con el clip de correr; andar es para ir despacio. El de correr no pasa de ×2,8 (no se vuelve frenético)
    this.char = gltf.userData?.meshy
      ? new GlbChar(gltf, { outline: 0.006, ...MESHY_GAIT })
      : new GlbChar(gltf, { outline: 0.006, walkAt: 0.2, runAt: 4.6, gait: (v, n) => n === 'Run' ? Math.pow(Math.max(0.3, v) / (2.5 * LEGS), 0.85) : Math.pow(Math.max(0.2, v) / (1.15 * LEGS), 0.8) });
    this.char.root.scale.setScalar(def.scale || gltf.userData?.fit || 1);
    this.obj.add(this.char.root);
    this.wave = 0; this.cheer = 0; this.talking = 0; this.carry = false;
    this.air = 0; this.wasGrounded = true;
    this.roll = 0; this.pitch = 0; this.lastSpeed = 0; this.headYaw = 0;
  }
  update(dt, speed, grounded, turnRate) {
    const c = this.char;
    if (this.wave > 0) this.wave -= dt;
    if (this.cheer > 0) this.cheer -= dt;
    if (this.talking > 0) this.talking -= dt;
    // saltos: impulso al despegar que enlaza con el vuelo (se mantiene todo el tiempo en el aire, sin volver a correr
    // entre medias: antes se reiniciaba cada 0,1 s y el cuerpo daba tirones) y caída al tocar suelo
    if (!grounded) this.air += dt;
    if (this.wasGrounded && !grounded) c.playOnce('Jump_Start', 0.28, true, 'Jump_Loop');
    else if (!grounded && !/^Jump_/.test(c.oneShot?.name || '')) c.hold('Jump_Loop');
    // al caer: el aterrizaje entero y rápido si la caída fue larga; si fue un saltito, se sigue andando sin cortes
    else if (!this.wasGrounded && grounded) { if (this.air > 0.45) c.playOnce('Land', speed > 1 ? 0.3 : 0.45, true); else c.oneShot = null; this.air = 0; }
    this.wasGrounded = grounded;
    // (si echa a correr, los gestos de quieto —celebrar, la pena, saludar— se cortan y entra la carrera: duran más que la
    // pausa entre tanto y tanto, y la figura volvía al saque celebrando o con las manos a la cabeza, como deslizándose)
    // (desde 0,8 m/s, que ya es andar: el partido grabado fotograma a fotograma, noviembre de 2026, enseñó al pelotari
    // volviendo al saque a 5 m/s mientras se soplaba la mano o soltaba el brazo, quieto de piernas)
    if (speed > 0.8 && (this.cheer > 0 || this.wave > 0 || GESTO.test(c.oneShot?.name || ''))) { this.cheer = 0; this.wave = 0; if (GESTO.test(c.oneShot?.name || '')) c.oneShot = null; }
    // (y el golpe: el clip empieza en el impacto y sigue con el brazo hasta medio segundo, de cuerpo entero. Si mientras
    // tanto sale corriendo a recolocarse, a las 15 centésimas del impacto entra la carrera; antes acababa el gesto entero
    // y se iba deslizando de pie más de dos metros)
    if (speed > 1.5 && c.oneShot?.golpe && c.oneShot.d - c.oneShot.t > 0.15) c.oneShot = null;
    if (grounded && !c.oneShot) {
      if (this.cheer > 0) c.playOnce(this.cheerClip && c.actions[this.cheerClip] ? this.cheerClip : 'Celebrate', this.cheer);
      else if (this.wave > 0 && speed < 1) c.playOnce('Wave', this.wave);
    }
    c.setTalking(this.talking > 0);
    // la velocidad que mueve las piernas se suaviza: medida fotograma a fotograma salta un poco (choques, cuestas,
    // fotogramas desiguales) y el ritmo de los pasos cambiaba de golpe
    this.legSpeed = this.legSpeed == null ? speed : this.legSpeed + (speed - this.legSpeed) * Math.min(1, dt * 10);
    if (speed < 0.05 && this.legSpeed < 0.3) this.legSpeed = speed;
    c.setSpeed(this.legSpeed);
    // cuerpo vivo: se inclina hacia dentro en las curvas (más cuanto más corre), hacia delante al arrancar
    // y al correr, y la cabeza se adelanta al giro
    if (dt > 0) {
      const tr = grounded ? (turnRate || 0) : 0, cl = THREE.MathUtils.clamp;
      const acc = (this.legSpeed - this.lastSpeed) / dt; this.lastSpeed = this.legSpeed;
      const wantRoll = cl(-tr * Math.min(speed, 7) * 0.028, -0.2, 0.2);
      const wantPitch = cl(acc * 0.01, -0.05, 0.09) + (speed > 4.6 ? 0.07 : speed > 0.4 ? 0.02 : 0);
      this.roll += (wantRoll - this.roll) * Math.min(1, dt * 7);
      this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 5);
      this.headYaw += (cl(tr * 0.16, -0.45, 0.45) - this.headYaw) * Math.min(1, dt * 9);
      c.root.rotation.set(this.pitch, 0, this.roll);
      c.headYaw = this.headYaw;
    }
    c.update(dt);
  }
  doWave() { this.wave = 1.4; this.char.oneShot = null; }
  // (el pelotari celebra de varias maneras, una cada vez: el puño, el salto con los brazos arriba o el aplauso a la grada)
  doCheer() { const A = this.char.actions, v = ['Celebrate', 'Celebrate2', 'Celebrate3'].filter(n => A[n]); this.cheerClip = v.length > 1 ? v[(this.cheerN = (this.cheerN || 0) + 1) % v.length] : 'Celebrate';
    this.cheer = A[this.cheerClip] ? Math.max(1.6, A[this.cheerClip].getClip().duration) : 2; this.char.oneShot = null; this.char.holdFace('Happy', 'Normal', 2.6, 'Fist'); }
  setExpr(name, dur = 2) { const e = EXPR[name] || EXPR.neutral; this.char.holdFace(e[0], e[1], dur); }
  /** Postura en parado (p. ej. 'Ready' en el frontón); null vuelve a Idle. */
  setStance(name) { this.char.idleName = name || null; }
  doAct(kind, t = 0.5, golpe = null) {
    const c = this.char;
    // (el pelotari: el golpe que toca, derecha o izquierda, sotamano o de aire, entero desde el armado)
    // (el pelotari con sus golpes: sin fundido, que el clip empieza en el impacto y tiene que verse en esa misma imagen)
    if (kind === 'hit' && c.actions.Hit) { const n = golpe && c.actions[golpe] ? golpe : 'Hit', d = c.armados ? c.actions[n].getClip().duration : t; c.playOnce(n, d, false, null, c.armados ? 0.03 : undefined); if (c.oneShot) c.oneShot.golpe = true; c.holdFace('SmileOpen', 'Angry', d, 'Open'); }
    // (el lamento, de dos maneras: las manos a la cabeza o los brazos en jarra, negando)
    else if (kind === 'sad' && c.actions.Sad) { const n = c.actions.Sad2 && (this.sadN = (this.sadN || 0) + 1) % 2 ? 'Sad2' : 'Sad'; c.playOnce(n); c.holdFace('Tired', 'Worried', 1.8); }
    // (los gestos de entre tanto y tanto: soplarse la mano, soltar el brazo. Solo si el pelotari los tiene)
    else if (kind === 'tic') { const v = ['Sopla', 'Suelta'].filter(n => c.actions[n]); if (v.length && !c.oneShot) c.playOnce(v[(this.ticN = (this.ticN || 0) + 1) % v.length]); }
    else if (kind === 'pick') c.playOnce('Land', t);
    else if (kind === 'point') { c.playOnce('Talk', t); c.holdFace('Happy', 'Normal', t, 'Point'); }
    else { c.playOnce('Wave', t); c.holdFace('Happy', 'Normal', t, 'Fist'); }
  }
  dispose() { this.char.dispose(); }
}

// golpe a mano: el brazo derecho se echa atrás mientras llega la pelota (wind) y sale hacia delante al golpear (swing),
// con un giro del pecho; se aplica encima de la animación de cada pelotari
/** La palma de una mano, en el espacio de su hueso: su centro (c), hacia dónde mira (n) y hacia dónde apuntan los dedos
 *  (d). Sale de la propia malla, de los vértices que mueve ese hueso en reposo: el eje más largo va de la muñeca a los
 *  dedos y el más corto es el grosor de la mano. En reposo, con los brazos en cruz, la palma mira al suelo. null si no
 *  se puede saber. Sirve para dejar algo agarrado en la mano de verdad, y no flotando junto a la muñeca. */
export function palmaDe(root, hand) {
  // (con dedos, la palma ya medida al ponérselos, con la mano entera: dedos.js)
  const Pm = hand.userData?.palma; if (Pm) return { c: new THREE.Vector3().fromArray(Pm.c), n: new THREE.Vector3().fromArray(Pm.n), d: new THREE.Vector3().fromArray(Pm.d), largo: Pm.largo, grosor: Pm.grosor };
  let mesh = null; root.traverse(o => { if (!mesh && o.isSkinnedMesh && o.skeleton?.bones.includes(hand)) mesh = o; });
  if (!mesh) return null;
  const ih = mesh.skeleton.bones.indexOf(hand), g = mesh.geometry, P = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const inv = mesh.skeleton.boneInverses[ih], bm = mesh.bindMatrix, v = new THREE.Vector3(), c = new THREE.Vector3(), pts = [];
  for (let i = 0; i < P.count; i++) {
    let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === ih) w += sw.getComponent(i, k);
    if (w < 0.6) continue;
    v.fromBufferAttribute(P, i).applyMatrix4(bm).applyMatrix4(inv); pts.push(v.clone()); c.add(v);
  }
  if (pts.length < 8) return null;
  c.divideScalar(pts.length);
  const C = [0, 0, 0, 0, 0, 0];
  for (const p of pts) { const x = p.x - c.x, y = p.y - c.y, z = p.z - c.z; C[0] += x * x; C[1] += x * y; C[2] += x * z; C[3] += y * y; C[4] += y * z; C[5] += z * z; }
  const por = (a) => new THREE.Vector3(C[0] * a.x + C[1] * a.y + C[2] * a.z, C[1] * a.x + C[3] * a.y + C[4] * a.z, C[2] * a.x + C[4] * a.y + C[5] * a.z);
  const mayor = (fuera) => { let a = new THREE.Vector3(0.61, 0.52, 0.6); for (let i = 0; i < 48; i++) { a = por(a); for (const f of fuera) a.addScaledVector(f, -a.dot(f)); if (a.lengthSq() < 1e-24) break; a.normalize(); } return a; };
  const d = mayor([]), ancho = mayor([d]), n = new THREE.Vector3().crossVectors(d, ancho).normalize();
  if (d.dot(c) < 0) d.negate();   // (los dedos, lejos de la muñeca, que es el origen del hueso)
  // (hacia qué lado mira la palma: hacia donde se doblan las puntas de los dedos, que siempre se curvan hacia ella. Antes
  // se suponía que en reposo la palma mira al suelo, como en la postura en cruz; los pelotaris de Meshy están en reposo
  // con los brazos abajo y la palma hacia delante, el juego la daba al revés y la pelota del saque iba en el dorso de la
  // mano, asomando por el canto y metiéndose entre los dedos; noviembre de 2026. Con los dedos rectos, como antes)
  let lo = Infinity, hi = -Infinity; for (const p of pts) { const t = v.copy(p).sub(c).dot(d); if (t < lo) lo = t; if (t > hi) hi = t; }
  let punta = 0, np = 0, medio = 0, nm = 0;
  for (const p of pts) { const r = v.copy(p).sub(c), t = (r.dot(d) - lo) / Math.max(1e-9, hi - lo), a = r.dot(n); if (t > 0.8) { punta += a; np++; } else if (t > 0.35 && t < 0.6) { medio += a; nm++; } }
  const curva = np && nm ? punta / np - medio / nm : 0;
  if (Math.abs(curva) > 0.02 * (hi - lo)) { if (curva < 0) n.negate(); }
  else if (n.dot(v.set(0, -1, 0).transformDirection(inv)) < 0) n.negate();
  let largo = 0, grosor = 0; for (const p of pts) { largo = Math.max(largo, p.dot(d)); grosor = Math.max(grosor, v.copy(p).sub(c).dot(n)); }
  return { c, n, d, largo, grosor };
}
/** Los puntos de la malla que mueve una mano (ella y sus dedos, y los tacos que lleve), cada uno pegado al hueso que más
 *  lo mueve: así se sabe dónde está la mano de verdad en cada imagen con un solo producto por punto, sin deformar la malla
 *  entera. [{ b: hueso, p: Float32Array x,y,z en el espacio de ese hueso }], o null si no se puede saber */
export function manoPuntos(root, hand) {
  const L = [], v = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    const bs = o.skeleton.bones; if (!bs.includes(hand)) return;
    const P = o.geometry.attributes.position, SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight; if (!P || !SI || !SW) return;
    const sub = new Set(); bs.forEach((b, i) => { for (let x = b; x; x = x.parent) if (x === hand) { sub.add(i); break; } });
    const porHueso = new Map();
    for (let i = 0; i < P.count; i++) {
      let w = 0, dom = -1, dw = 0;
      for (let k = 0; k < 4; k++) { const j = SI.getComponent(i, k), x = SW.getComponent(i, k); if (sub.has(j)) w += x; if (x > dw) { dw = x; dom = j; } }
      if (w < 0.5 || dom < 0) continue;
      v.fromBufferAttribute(P, i).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[dom]);
      let a = porHueso.get(dom); if (!a) porHueso.set(dom, a = []); a.push(v.x, v.y, v.z);
    }
    for (const [j, a] of porHueso) L.push({ b: bs[j], p: new Float32Array(a) });
  });
  return L.length ? L : null;
}
/** Aparta una esfera (centro B y radio r, en el mundo) de los puntos de una mano (manoPuntos), empujándola en la
 *  dirección dir (de largo 1) lo justo para que ninguno quede dentro. Mueve B y devuelve cuánto (0 si ya estaba fuera).
 *  Con los huesos ya colocados en esta imagen (matrixWorld al día) */
export function apartaDeMano(L, B, r, dir) {
  let s = 0; const R2 = r * r;
  for (const { b, p } of L) {
    const e = b.matrixWorld.elements;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12] - B.x, wy = e[1] * x + e[5] * y + e[9] * z + e[13] - B.y, wz = e[2] * x + e[6] * y + e[10] * z + e[14] - B.z;
      const a = wx * dir.x + wy * dir.y + wz * dir.z, q = wx * wx + wy * wy + wz * wz - a * a;
      if (q < R2) { const hace = a + Math.sqrt(R2 - q); if (hace > s) s = hace; }
    }
  }
  if (s > 0) B.addScaledVector(dir, s);
  return s;
}
// Las manos no se meten en la cabeza: al levantar los brazos (celebrar, la pena con las manos a la cabeza) la mano de la
// animación atravesaba la cara. Después de la animación, si una mano queda dentro de la cabeza (una esfera entre la base
// del cráneo y los ojos), el brazo gira desde el hombro lo justo para sacarla. Lo deshace solo la imagen siguiente, que
// vuelve a poner la animación (GlbChar, post). globalThis.__manosLibres lo apaga, para comparar
const _mA = new THREE.Vector3(), _mB = new THREE.Vector3(), _mC = new THREE.Vector3(), _mD = new THREE.Vector3(), _mH = new THREE.Vector3(), _mQ = new THREE.Quaternion(), _mP = new THREE.Quaternion();
// (el centro y el radio de la cabeza en el espacio del hueso de la cabeza, con los puntos de la malla que mueve sobre todo
// ese hueso o los que cuelgan de él —ojos, pelo—, en la postura de reposo; el radio, el del 90 % de los puntos más cerca)
function midoCabeza(c, head) {
  const pts = [], v = new THREE.Vector3(), m = new THREE.Matrix4();
  c.root.traverse(o => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    const bs = o.skeleton.bones, hi = bs.indexOf(head); if (hi < 0) return;
    const deCabeza = new Set(bs.map((b, i) => { for (let x = b; x; x = x.parent) if (x === head) return i; return -1; }).filter(i => i >= 0));
    const P = o.geometry.attributes.position, SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight; if (!SI || !SW) return;
    m.copy(o.skeleton.boneInverses[hi]).multiply(o.bindMatrix);   // (de la malla en reposo al espacio del hueso de la cabeza)
    const paso = Math.max(1, Math.floor(P.count / 8000));
    for (let i = 0; i < P.count; i += paso) {
      let w = 0; for (let k = 0; k < 4; k++) if (deCabeza.has(SI.getComponent(i, k))) w += SW.getComponent(i, k);
      if (w > 0.6) pts.push(v.fromBufferAttribute(P, i).applyMatrix4(m).clone());
    }
  });
  if (pts.length < 20) return null;
  const cen = new THREE.Vector3(); for (const p of pts) cen.add(p); cen.divideScalar(pts.length);
  const d = pts.map(p => p.distanceTo(cen)).sort((a, b) => a - b);
  return { c: cen, r: d[Math.floor(d.length * 0.9)] };
}
export function apartaManos(c) {
  if (globalThis.__manosLibres) return;
  const B = c.bones || {}, head = c.headBone || B.Head || B.head || B.mixamorigHead; if (!head) return;
  if (c._manos === undefined) {
    const brazo = (L) => {
      const ua = L ? B.upperarml || B.upperarm_l || B.mixamorigLeftArm : B.upperarmr || B.upperarm_r || B.mixamorigRightArm;
      const fa = L ? B.lowerarml || B.lowerarm_l || B.mixamorigLeftForeArm : B.lowerarmr || B.lowerarm_r || B.mixamorigRightForeArm;
      const h = L ? B.handl || B.hand_l || B.mixamorigLeftHand : B.handr || B.hand_r || B.mixamorigRightHand;
      return ua && fa && h ? { ua, fa, h } : null;
    };
    c._manos = [brazo(true), brazo(false)].filter(Boolean); if (!c._manos.length) c._manos = null;
  }
  const M = c._manos; if (!M) return;
  c.root.updateMatrixWorld(true);
  const K = M.length === 2 ? M[0].ua.getWorldPosition(_mA).distanceTo(M[1].ua.getWorldPosition(_mB)) / 0.34 : 1;
  // (la cabeza de verdad, medida una vez en la malla: los puntos que mueve el hueso de la cabeza, en su espacio. Estos
  // personajes son de dibujo, con la cabeza grande: a ojo salía demasiado pequeña)
  if (c._cabeza === undefined) c._cabeza = midoCabeza(c, head);
  const CB = c._cabeza; if (!CB) return;
  head.localToWorld(_mH.copy(CB.c)); const sc = head.getWorldScale(_mD).x, R = CB.r * sc;
  const lim = R + 0.015 * K;
  // (hasta tres pasos: el hombro está pegado a la cabeza y un solo giro no siempre saca la mano del todo, como en la pena
  // con las manos a la cabeza)
  for (const { ua, fa, h } of M) for (let it = 0; it < 3; it++) {
    const hp = h.getWorldPosition(_mA), dir = _mB.copy(hp).sub(fa.getWorldPosition(_mC)).normalize();
    hp.addScaledVector(dir, 0.06 * K);   // (la palma y los dedos, un poco más allá de la muñeca)
    const d = hp.distanceTo(_mH); if (d >= lim) break;
    const s0 = ua.getWorldPosition(_mC), v1 = _mB.copy(hp).sub(s0), v2 = _mD.copy(_mH).sub(s0), L = v1.length();
    const n = v2.cross(v1); if (n.lengthSq() < 1e-10 || L < 1e-4) break; n.normalize();
    const a = Math.min(0.6, (lim - d) / L * 1.3);
    // (el giro, en el mundo, pasado al espacio del hueso: el del padre por delante)
    ua.parent.getWorldQuaternion(_mP); _mQ.setFromAxisAngle(n, a);
    ua.quaternion.premultiply(_mP.clone().invert().multiply(_mQ).multiply(_mP));
    ua.updateMatrixWorld(true);
  }
}

export function armSwing(char, get, { windOnly = false } = {}) {
  if (!char) return;
  const B = {}; char.root.traverse(o => { if (o.isBone) B[o.name] = o; });
  // KayKit (ejes locales conocidos) o Mixamo (los ejes del personaje se pasan al espacio de cada hueso)
  const mix = !B.upperarmr;
  const ua = B.upperarmr || B.mixamorigRightArm, la = B.lowerarmr || B.mixamorigRightForeArm, ch = B.chest || B.mixamorigSpine2; if (!ua) return;
  const sp = B.spine || B.mixamorigSpine1 || B.mixamorigSpine, nk = B.neck || B.mixamorigNeck;
  const q = new THREE.Quaternion(), qc = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3();
  // eje del personaje → espacio local del hueso (con la pose de este fotograma, no la del anterior)
  const local = (bone, axis) => { qc.identity(); for (let b = bone; b && b !== char.root; b = b.parent) qc.premultiply(b.quaternion); return ax.copy(axis).applyQuaternion(qc.invert()); };
  const turn = (bone, axis, a) => bone.quaternion.multiply(q.setFromAxisAngle(mix ? local(bone, axis) : axis, a));
  let w = 0;   // preparación suavizada
  // (el pelotari de Meshy trae la postura de armado de cada golpe: se mezcla entera mientras llega la pelota, de cuerpo
  // entero si está parado y de cintura para arriba si va corriendo, para no frenarle las piernas)
  const AR = char.armados, ABAJO = /(Hips|UpLeg|Leg|Foot|ToeBase)$/, cad = B.mixamorigHips;
  const ARB = AR && Object.fromEntries(Object.entries(AR).map(([k, p]) => [k, Object.entries(p.q).filter(([n]) => B[n]).map(([n, q]) => [B[n], q, ABAJO.test(n)])]));
  let fat = 0, resp = 0;   // el cansancio, suavizado, y la fase de la respiración
  // (para el saque: las posturas de llevar y de botar la pelota, solo los huesos del brazo derecho; y la de ir al saque
  // con la pelota delante del pecho, los dos brazos)
  const BRAZO_D = /Right(Shoulder|Arm|ForeArm|ForeArmTwist|Hand)$/, BRAZOS = /(Left|Right)(Shoulder|Arm|ForeArm|ForeArmTwist|Hand)$/, ARD = {}; let llevaK = 0, llevaCK = 0, botaK = 0;
  if (ARB) for (const k of ['Lleva', 'LlevaC', 'Bota']) if (ARB[k]) ARD[k] = ARB[k].filter(([b]) => (k === 'LlevaC' ? BRAZOS : BRAZO_D).test(b.name));
  // (y los huesos de cada brazo, para llevar la mano a un sitio: hombro, codo y mano)
  const brazo = (s) => { const a = B['mixamorig' + s + 'Arm'], f = B['mixamorig' + s + 'ForeArm'], h = B['mixamorig' + s + 'Hand']; return a && f && h ? { a, f, h } : null; };
  const IKR = brazo('Right'), IKL = brazo('Left');
  let PAL, PALL; const palma = () => PAL !== undefined ? PAL : (PAL = IKR ? palmaDe(char.root, IKR.h) : null);
  const palmaL = () => PALL !== undefined ? PALL : (PALL = IKL ? palmaDe(char.root, IKL.h) : null);
  // (los puntos de cada mano, para que ni la pelota que lleva ni la que golpea se le metan dentro: manoPuntos)
  const PTS = {}; const puntos = (lado) => PTS[lado] !== undefined ? PTS[lado] : (PTS[lado] = (lado === 'R' ? IKR : IKL) ? manoPuntos(char.root, (lado === 'R' ? IKR : IKL).h) : null);
  const _pc = new THREE.Vector3(), _pn = new THREE.Vector3(), _pw = new THREE.Vector3(), _pt = new THREE.Vector3(), _pb = new THREE.Vector3(), _ps = new THREE.Vector3();
  // en el golpe, dónde tiene que ir la muñeca para que la palma quede pegada a la pelota por fuera (centro bola, radio r):
  // la palma mirando a la pelota, a su radio más el grosor de la mano. Antes la muñeca iba al centro de la pelota y la
  // pelota quedaba dentro de la mano
  const aPalma = (K, pal, bola, r) => {
    if (!pal) return bola;
    K.h.localToWorld(_pc.copy(pal.c)); _pn.copy(pal.n).transformDirection(K.h.matrixWorld); K.h.getWorldPosition(_pw);
    // (el grosor viene en las medidas del hueso, que en Mixamo van cien veces más grandes: al mundo, con su escala)
    return _pt.copy(bola).addScaledVector(_pn, -(r + pal.grosor * K.h.getWorldScale(_ps).x + 0.004)).sub(_pc).add(_pw);
  };
  const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _H = new THREE.Vector3(), _n = new THREE.Vector3(), _u = new THREE.Vector3(), _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion();
  // gira un hueso (en el mundo) para que la dirección de → a pase a ser la nueva, y lo deja en su giro local
  const gira = (b, de, a) => { _qa.setFromUnitVectors(de, a); b.getWorldQuaternion(_qb); _qa.multiply(_qb); b.parent.getWorldQuaternion(_qb); b.quaternion.copy(_qb.invert().multiply(_qa)); b.updateMatrixWorld(true); };
  // la mano de un brazo, a un punto del mundo (con peso k): dos huesos, el codo hacia donde ya iba; si no llega, estirado hacia él
  function manoA(K, obj, k) {
    if (!K) return;
    char.root.updateMatrixWorld(true);
    _q0.copy(K.a.quaternion); _q1.copy(K.f.quaternion);
    K.a.getWorldPosition(_S); K.f.getWorldPosition(_E); K.h.getWorldPosition(_H);
    const L1 = _S.distanceTo(_E), L2 = _E.distanceTo(_H); if (L1 < 1e-4 || L2 < 1e-4) return;
    _n.copy(obj).sub(_S); const dist = _n.length(); if (dist < 1e-4) return; _n.divideScalar(dist);
    const d = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, dist)), a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    _u.copy(_E).sub(_S); _u.addScaledVector(_n, -_u.dot(_n)); if (_u.lengthSq() < 1e-6) _u.set(0, -1, 0).addScaledVector(_n, _n.y); _u.normalize();
    // el codo nuevo y la mano nueva
    _d1.copy(_E).sub(_S).normalize(); _d2.copy(_n).multiplyScalar(a).addScaledVector(_u, h).normalize();
    gira(K.a, _d1, _d2);
    K.f.getWorldPosition(_E); K.h.getWorldPosition(_H);
    _d1.copy(_H).sub(_E).normalize(); _d2.copy(_S).addScaledVector(_n, d).sub(_E).normalize();
    gira(K.f, _d1, _d2);
    if (k < 1) { K.a.quaternion.slerpQuaternions(_q0, K.a.quaternion.clone(), k); K.f.quaternion.slerpQuaternions(_q1, K.f.quaternion.clone(), k); }
  }
  // tus brazos (la pelota en casa, con la cámara: st.cuerpo, de camaraCuerpo.js, brazos): cada hueso del brazo de tu
  // pelotari apunta hacia donde apunta el tuyo, en su cuerpo (x a su derecha, y arriba, z hacia delante; en Mixamo mira a +Z
  // y su derecha es −X), mezclado sobre la animación y con entrada y salida suaves. Agachado, el tronco se dobla
  let kCu = 0, cuU = null; const _qr = new THREE.Quaternion();
  const enMundo = (v, out) => out.set(-v[0], v[1], v[2]).applyQuaternion(char.root.getWorldQuaternion(_qr)).normalize();
  function brazosCuerpo(cu, dt) {
    kCu = cu ? Math.min(1, kCu + dt * 4) : Math.max(0, kCu - dt * 2.5); if (cu) cuU = cu; if (kCu <= 0.001 || !cuU) return;
    if (sp && cuU.agachado > 0.02) turn(sp, X, cuU.agachado * 0.38 * kCu);
    char.root.updateMatrixWorld(true);
    for (const [s, K] of [['R', IKR], ['L', IKL]]) {
      const b = cuU[s]; if (!K || !b) continue;
      _q0.copy(K.a.quaternion); _q1.copy(K.f.quaternion);
      K.a.getWorldPosition(_S); K.f.getWorldPosition(_E); _d1.copy(_E).sub(_S).normalize(); gira(K.a, _d1, enMundo(b.a, _d2));
      if (b.f) { K.f.getWorldPosition(_E); K.h.getWorldPosition(_H); _d1.copy(_H).sub(_E).normalize(); gira(K.f, _d1, enMundo(b.f, _d2)); }
      const k = kCu * 0.92; K.a.quaternion.slerpQuaternions(_q0, K.a.quaternion.clone(), k); K.f.quaternion.slerpQuaternions(_q1, K.f.quaternion.clone(), k); K.a.updateMatrixWorld(true);
    }
  }
  char.post = (c, dt) => {
    const st = get(); if (!st) return;
    // el cansancio se ve: el pelotari se encorva (más parado y entre tanto y tanto, como quien apoya las manos en las
    // rodillas) y respira deprisa, el pecho subiendo y bajando; la cabeza se levanta un poco para seguir mirando al frente
    fat += (Math.max(0, Math.min(1, st.tired || 0)) - fat) * Math.min(1, dt * 2.5);
    if (fat > 0.02) {
      resp += dt * (1.2 + fat * 1.3) * Math.PI * 2;
      const quieto = Math.max(0, 1 - (st.speed || 0) / 2.5), doblado = fat * (0.2 + 0.3 * quieto + (st.entre ? 0.4 : 0)), aire = Math.sin(resp) * 0.09 * fat;
      if (sp) turn(sp, X, doblado * 0.5);
      if (ch) turn(ch, X, doblado * 0.5 + aire);
      if (nk) turn(nk, X, -doblado * 0.45 - aire * 0.7);
    }
    w += ((st.swing >= 0 ? 0 : st.wind || 0) - w) * Math.min(1, dt * 10);
    if (ARB) {
      // (al golpear, el armado se quita de golpe: el clip del golpe empieza en el impacto)
      if (st.swing >= 0 && st.swing < 0.3) w = 0;
      // (el saque: se planta al botarla y va casi parado; las piernas del armado entran ya, aunque aún se mueva un poco)
      const cual = ARB[st.arma] ? st.arma : 'Hit', quieto = Math.max(0, 1 - (st.speed || 0) / (cual === 'Saque' ? 3 : 1.5));
      if (w > 0.003) { for (const [b, q, abajo] of ARB[cual]) b.quaternion.slerp(q, w * (abajo ? quieto : 1)); if (cad) cad.position.lerp(AR[cual].pos, w * quieto); }
      // el saque: mientras corre, el brazo derecho lleva la pelota en la mano; al botarla, baja con ella
      llevaK += ((st.lleva || 0) - llevaK) * Math.min(1, dt * 12); botaK += ((st.bota || 0) - botaK) * Math.min(1, dt * 18);
      llevaCK += ((st.llevaC || 0) - llevaCK) * Math.min(1, dt * 8);
      if (llevaK > 0.01 && ARD.Lleva) for (const [b, q] of ARD.Lleva) b.quaternion.slerp(q, llevaK);
      if (llevaCK > 0.01 && ARD.LlevaC) for (const [b, q] of ARD.LlevaC) b.quaternion.slerp(q, llevaCK);
      if (botaK > 0.01 && ARD.Bota) for (const [b, q] of ARD.Bota) b.quaternion.slerp(q, botaK);
      // la mano, a la pelota: en el golpe, el brazo que golpea llega justo al sitio donde está la pelota (st.contacto, en el
      // mundo) y lo suelta enseguida; llevándola o botándola, donde diga el juego (st.manoA)
      brazosCuerpo(st.cuerpo, dt);   // (con la cámara, tus brazos; antes del contacto con la pelota, que manda en el golpe)
      const izq = /L$/.test(st.golpe || ''), kC = st.contacto && st.swing >= 0 && st.swing < 0.22 ? 1 - st.swing / 0.22 : 0;
      if (kC > 0.02) {
        const K = izq ? IKL : IKR, pal = izq ? palmaL() : palma(), rB = st.bolaR || 0.05, k = Math.min(1, kC * 1.6);
        manoA(K, aPalma(K, pal, st.contacto, rB), k);
        if (k > 0.999 && K && pal) {
          // (al mover el brazo, la mano gira con él y la palma ya no mira a donde miraba: una segunda pasada con la palma
          // de ahora)
          c.root.updateMatrixWorld(true); manoA(K, aPalma(K, pal, st.contacto, rB), 1);
          // (y si aun así algún dedo queda dentro de la pelota, la mano se retira lo justo, desde la pelota hacia la palma)
          const L = puntos(izq ? 'L' : 'R');
          if (L) { c.root.updateMatrixWorld(true); K.h.localToWorld(_pc.copy(pal.c)); _pn.copy(st.contacto).sub(_pc); const dl = _pn.length();
            if (dl > 0.01) { _pn.divideScalar(dl); const s = apartaDeMano(L, _pb.copy(st.contacto), rB + 0.003, _pn); if (s > 0.002) { K.h.getWorldPosition(_pw); manoA(K, _pw.addScaledVector(_pn, -s), 1); } } }
        }
      }
      // (y dónde queda la mano derecha, para que el juego dibuje en ella la pelota que lleva)
      // (en la palma, no en la muñeca: su centro y hacia dónde mira, para que la pelota quede agarrada)
      // (o la izquierda, st.manoIzq: con la pala, la paleta o el xare en la derecha, la pelota del saque va en la otra)
      const IKM = st.manoIzq ? IKL : IKR;
      // (los dedos: la pelota del saque, recogida en la mano que la lleva; la que golpea, abierta en el golpe; con la pala, la
      // paleta o el xare, la derecha sigue cerrada en el mango; dedos.js)
      if (c.dedos) {
        const q = { R: null, L: null }; if (st.manoW) q[st.manoIzq ? 'L' : 'R'] = 'pelota'; if (kC > 0.02) q[izq ? 'L' : 'R'] = 'abierta';
        if (c.dedos.pedidos.R === 'mango') q.R = 'mango';
        c.mano('R', q.R); c.mano('L', q.L);
      }
      if (st.manoW && IKM) {
        c.root.updateMatrixWorld(true); const p = st.manoIzq ? palmaL() : palma();
        if (p) { IKM.h.localToWorld(st.manoW.copy(p.c)); st.manoN?.copy(p.n).transformDirection(IKM.h.matrixWorld); }
        else { IKM.h.getWorldPosition(st.manoW); st.manoN?.set(0, 0, 0); }
        // (y el centro de la pelota que lleva, apoyada en la palma por fuera: desde el centro de la mano hacia donde mira la
        // palma, lo justo para que ningún punto de la mano, de los dedos ni de los tacos quede dentro. Antes iba a tres
        // cuartos de su radio del centro de la mano y se hundía 4 cm en ella)
        // (con dedos, donde la cogen ellos: metida en el hueco de la mano, como la coge un pelotari; dedos.js, bola. Si la del
        // juego es de otro tamaño, se aparta de la palma lo que cambia el radio)
        const bo = st.bolaW && st.bolaR && c.dedos?.D?.[st.manoIzq ? 'L' : 'R']?.bola;
        if (bo) { IKM.h.localToWorld(st.bolaW.fromArray(bo.c)); if (p && st.manoN) st.bolaW.addScaledVector(st.manoN, st.bolaR - bo.r * IKM.h.getWorldScale(_ps).x); }
        else if (st.bolaW && st.bolaR && p) { st.bolaW.copy(st.manoW); const L = puntos(st.manoIzq ? 'L' : 'R'); if (L) apartaDeMano(L, st.bolaW, st.bolaR + 0.003, st.manoN); else st.bolaW.addScaledVector(st.manoN, st.bolaR + p.grosor * IKM.h.getWorldScale(_ps).x); }
      }
      return;
    }
    let arm = -2.3 * w, elbow = 1.0 * w, twist = 0.7 * w;   // brazo bien atrás, codo doblado y hombro girado
    if (st.swing >= 0 && windOnly) return;   // el golpe ya lo anima su clip
    if (st.swing >= 0) { const s = st.swing, up = Math.min(1, s / 0.3), back = s < 0.3 ? 1 : Math.max(0, 1 - (s - 0.3) / 0.7);   // latigazo rápido y vuelta
      arm = (-2.3 + 4.3 * up) * back; elbow = 1.0 * (1 - up) * back; twist = (0.7 - 1.4 * up) * back; }
    // en Mixamo el personaje mira a +Z: girar el brazo alrededor de +X lo lleva atrás, de ahí el signo
    if (Math.abs(arm) > 1e-3) turn(ua, X, mix ? -arm * 0.8 : arm);
    if (la && Math.abs(elbow) > 1e-3) turn(la, X, -elbow);
    if (ch && Math.abs(twist) > 1e-3) turn(ch, Y, twist);
    brazosCuerpo(st.cuerpo, dt);
  };
  // (y las manos, fuera de la cabeza: apartaManos, encima de todo lo demás)
  const p0 = char.post; char.post = (c, dt) => { p0(c, dt); apartaManos(c); };
  // para el juego, la última red: si la pelota que se dibuja (centro B y radio r, en el mundo) queda dentro de una de sus
  // manos, se aparta lo justo, desde el centro de esa palma hacia fuera (si está justo en el centro, hacia donde mira la
  // palma). Mueve B y devuelve cuánto. Lo usa pelota/match.js después de mover a todos
  const _fw = new THREE.Vector3(), _fc = new THREE.Vector3(), _fd = new THREE.Vector3();
  char.fueraDeManos = (Bc, r) => {
    let s = 0;
    for (const lado of ['R', 'L']) {
      const K = lado === 'R' ? IKR : IKL; if (!K) continue;
      K.h.getWorldPosition(_fw); if (_fw.distanceToSquared(Bc) > (0.32 + r) * (0.32 + r)) continue;
      // (la pelota del saque que cogen sus dedos, en su sitio: los dedos la aprietan a propósito, como los de un pelotari, y
      // apartarla la sacaba de la mano; dedos.js, bola)
      const bo = char.dedos?.pedidos?.[lado] === 'pelota' && char.dedos.D?.[lado]?.bola;
      if (bo && K.h.localToWorld(_fc.fromArray(bo.c)).distanceTo(Bc) < 0.5 * r) continue;
      const L = puntos(lado); if (!L) continue;
      const pal = lado === 'R' ? palma() : palmaL();
      if (pal) K.h.localToWorld(_fc.copy(pal.c)); else _fc.copy(_fw);
      _fd.copy(Bc).sub(_fc); const dl = _fd.length();
      if (dl > 0.01) _fd.divideScalar(dl); else if (pal) _fd.copy(pal.n).transformDirection(K.h.matrixWorld); else continue;
      s += apartaDeMano(L, Bc, r, _fd);
    }
    return s;
  };
}
