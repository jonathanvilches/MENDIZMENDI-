// Personajes GLB del sistema de personajes 3D (tools/chars genera los .glb con Blender).
// Carga con GLTFLoader, clona con SkeletonUtils, elige Idle/Walk/Run según la velocidad,
// gestiona la cara por visibilidad de mallas (boca, cejas, párpados, manos), el parpadeo,
// la mirada (offset de la textura del ojo) y muelles en los huesos Hair_* y Scarf_*.
import { fillMaterial } from '../engine/charLight.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';   // modelos de Meshy comprimidos

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
for (const [p, u] of Object.entries(import.meta.glob('../assets/meshy/*.glb', { eager: true, query: '?url', import: 'default' }))) MESHY[p.split('/').pop().replace('.glb', '')] = u;
for (const [p, u] of Object.entries(import.meta.glob('../assets/meshy/portraits/*.{png,webp}', { eager: true, query: '?url', import: 'default' }))) MESHY_PICS[p.split('/').pop().replace(/\.(png|webp)$/, '')] = u;
// versión ligera de cada uno (tools/meshy-lod.mjs: ~1/3 de triángulos y textura de 512 px) para cuando salen muchos a la
// vez: vecinos, corredores, futbolistas
const MESHY_LOD = {};
for (const [p, u] of Object.entries(import.meta.glob('../assets/meshy/lod/*.glb', { eager: true, query: '?url', import: 'default' }))) MESHY_LOD[p.split('/').pop().replace('.glb', '')] = u;
export const MESHY_NAMES = Object.keys(MESHY);
// nombre del juego: [clip de origen, desde (s), hasta (s), ida y vuelta, sin subir la cadera (el salto lo hace el juego)]
const MESHY_CUTS = {
  Idle: ['Celebrate', 6.9, 9.3, true], Talk: ['Celebrate', 6.4, 9.3, true], Wave: ['Celebrate', 3.55, 6.1], Celebrate: ['Celebrate', 0.3, 1.75],
  Jump_Start: ['Jump_Full', 0, 0.58, false, true], Jump_Loop: ['Jump_Full', 0.62, 0.95, true, true], Land: ['Jump_Full', 1.05, 1.96, false, true],
  Ready: ['Jump_Full', 0.22, 0.42, true, true], Scared: ['Jump_Full', 1.1, 1.62, false, true], Pick: ['Jump_Full', 1.05, 1.62, false, true], Hit: ['Celebrate', 0.35, 1.05],
};
// cortes propios de cada personaje (el pelotari trae un golpe con la derecha y un puño en alto en vez de la celebración)
const MESHY_BY = {
  // el pastor: quieto y hablando, del principio y el final tranquilos de su charla; el salto, de saltar un obstáculo
  pastor: { Idle: ['TalkP', 7.2, 10.3, true], Talk: ['TalkP', 1.3, 6.8], Wave: ['TalkP', 3.0, 4.6], Celebrate: ['Hop', 0, 0.62, false, true],
    Jump_Start: ['Hop', 0, 0.3, false, true], Jump_Loop: ['Hop', 0.3, 0.55, true, true], Land: ['Hop', 0.6, 0.96, false, true],
    Ready: ['Hop', 0.02, 0.18, true, true], Scared: ['Hop', 0.62, 0.96, false, true], Pick: ['Hop', 0.62, 0.96, false, true], Hit: ['TalkP', 3.2, 3.9] },
  // (reposo y postura de pelotari: una décima de segundo de ida y vuelta, despacio, como quien respira y se balancea.
  // Antes la postura era el primer tercio de segundo del golpe en bucle: el brazo subía y bajaba 73° sin parar, como si
  // empezase el gesto una y otra vez; ahora se mueve unos 3°. El gesto de verdad lo ponen el golpe y el brazo atrás)
  pelotari: { Idle: ['Fist', 0, 0.1, true, false, 0.12], Talk: ['Fist', 0, 0.12, true, false, 0.25], Ready: ['Slash', 0.02, 0.12, true, false, 0.15], Hit: ['Slash', 0.52, 1.25],
    Celebrate: ['Fist', 0, 1.58], Wave: ['Fist', 0.15, 1.4], Scared: ['Slash', 1.1, 1.5], Pick: ['Slash', 0.1, 0.4] },
};
MESHY_BY.pelotari_rojo = MESHY_BY.pelotari;   // el colorado se mueve igual que el azul
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
// su textura viene a 2048 px (con todo el detalle); en calidad baja (móviles) se usa a 1024 para no agotar la memoria
let MESHY_TEX = 2048;
export const setMeshyTexMax = (px) => { MESHY_TEX = px; };
// personajes que van con su textura completa (2048 px) aunque se reduzcan las demás: el del jugador y el rival del frontón,
// que se ven de cerca. También en calidad baja: a 1024 se veían borrosos y con fallos de color en la cara y la ropa
const FULL_TEX = new Set();
const MESHY_FILL = 0.3;   // cuánto de su color pone de luz propia cada personaje de Meshy
export const fullTexFor = (name) => FULL_TEX.add(name);
// textura más nítida de lejos: la de Meshy va troceada en muchas piezas pequeñas y, al alejarse, los niveles de detalle
// menores mezclan los colores de piezas vecinas (manchas y fallos de color en la ropa y la cara). Se lee un nivel más fino
// del que tocaría (sesgo de -0,7)
export function sharpMap(m) {
  if (!m.map || m.userData.sharp) return; m.userData.sharp = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('texture2D( map, vMapUv )', 'texture2D( map, vMapUv, -0.7 )').replace('texture2D( emissiveMap, vEmissiveMapUv )', 'texture2D( emissiveMap, vEmissiveMapUv, -0.7 )'); };
  const key = m.customProgramCacheKey?.bind(m); m.customProgramCacheKey = () => (key ? key() : '') + '|sharp';
  m.needsUpdate = true;
}
// la textura pasa siempre por un lienzo (a su tamaño o reducida): subida tal cual desde la imagen del modelo, en algunos
// iPhone los personajes salían negros, sin color; por el lienzo es el camino que siempre ha funcionado en el móvil
function shrinkMap(m, max = MESHY_TEX) {
  const t = m.map, img = t?.image; if (!img || !img.width || t.isCanvasTexture) return;
  const S = Math.min(max, img.width), c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(img, 0, 0, S, S);
  const n = new THREE.CanvasTexture(c); n.colorSpace = t.colorSpace; n.flipY = t.flipY; n.wrapS = t.wrapS; n.wrapT = t.wrapT; n.anisotropy = 4;
  m.map = n; m.needsUpdate = true; t.dispose(); img.close?.();
}
// altura de cada personaje (m): una sola para todo el juego, así el mismo modelo se carga una vez aunque salga como
// jugador, como vecino o en un partido
const MESHY_H = { sanfermin: 1.6, pastor: 1.6, osasuna: 1.6, osasuna_fuera: 1.6, pelotari: 1.62, pelotari_rojo: 1.62 };
/** Ritmo de las piernas de los personajes de Meshy según su zancada real (tools/zancada.mjs: andar ~0,92 m/s y correr
 *  ~1,62 m/s a ritmo 1). Andando, su clip de andar (hasta ×2,1); corriendo (desde 3,6 m/s), el de correr (hasta ×2,8). */
export const MESHY_GAIT = { walkAt: 0.15, runAt: 3.6, gait: (v, n) => n === 'Run' ? Math.min(2.8, Math.max(0.8, v / 1.62)) : Math.min(2.1, Math.max(0.4, v / 0.92)) };
/** Velocidades del jugador con un personaje de Meshy (m/s): andar a paso vivo y correr; con ellas los pies casi no
 *  patinan y se distingue bien andar de correr. */
export const MESHY_SPEEDS = { walk: 2.4, run: 5.8 };
/** ¿Está ya cargado (o cargándose) este personaje de Meshy? */
export const loadedMeshy = (name) => cache.has('meshy:' + name);
/** Personaje de Meshy con los clips del juego, escalado a su altura. lod: la versión ligera (para multitudes). */
export async function loadMeshy(name, lod = false) {
  lod = lod && !!MESHY_LOD[name];
  const key = 'meshy:' + name + (lod ? ':lod' : ''), height = MESHY_H[name] || 1.5;
  if (!cache.has(key)) cache.set(key, (async () => {
    const g = await loadChar(lod ? MESHY_LOD[name] : MESHY[name]);
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
    const cuts = { ...MESHY_CUTS, ...(src.Kick ? { Hit: ['Kick', 0.46, 1.15] } : {}), ...(MESHY_BY[name] || {}) };
    for (const [want, [from, t0, t1, pp, flat, rate]] of Object.entries(cuts)) {
      if (!src[from]) continue;
      const k = cutClip(src[from], want, t0, Math.min(t1, src[from].duration), flat); k.userData = { ...(pp ? { pingpong: true } : {}), ...(rate ? { rate } : {}) }; animations.push(k);
    }
    const box = new THREE.Box3().setFromObject(g.scene), fit = height / Math.max(0.1, box.max.y - box.min.y);
    return { scene: g.scene, animations, userData: { fit, meshy: true } };
  })());
  return cache.get(key);
}
/** Carga (una sola vez por url) el GLB de un personaje. */
export function loadChar(url) {
  if (!cache.has(url)) {
    if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
    cache.set(url, loader.loadAsync(url));
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
    this.headBone = this.bones.Head || this.bones.mixamorigHead || null; this.headYaw = 0;
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
  playOnce(name, secs, fit = false, then = null) {
    const a = this.actions[name];
    if (!a) return;
    const dur = a.getClip().duration;
    this.oneShot = { name, t: secs ?? dur, then };
    a.timeScale = fit && secs ? dur / secs : 1;
    this.play(name);
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
      if (gn === 'Run' && this.actions.Run) { want = 'Run'; scale = ts * (gait ? gait(v, 'Run') : Math.max(0.6, v / RUN_REF)); }
      else if (gn !== 'Idle' && this.actions.Walk) { want = 'Walk'; scale = ts * (gait ? gait(v, 'Walk') : Math.max(0.35, v / WALK_REF)); }
      else if (this.talking && this.actions.Talk) want = 'Talk';
      if (want !== 'Walk' && want !== 'Run') scale *= (this.clipExtras[want]?.rate || 1) * this.idleRate;
      else if (this.back) scale = -scale;   // hacia atrás sin darse la vuelta (el pelotari, mirando al frontis): el paso al revés
      this.play(want);
      if (this.current) this.current.timeScale = scale;
    }
    // los huesos que se tocan después del mixer vuelven a su base (un clip puede no animarlos)
    for (const b of this.postBones) b.quaternion.copy(b.userData.q0);
    this.mixer.update(dt);
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
    this.post?.(this, dt);   // ajustes encima de la animación (p. ej. el brazo de golpear en la pelota)
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

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    if (this.eyeMat) { this.eyeMat.map && this.eyeMat.map.dispose(); this.eyeMat.dispose(); }
    // la textura de los huesos de cada copia (si no, queda una en la memoria gráfica por personaje que se va)
    this.root.traverse(o => { if (o.isSkinnedMesh) o.skeleton?.dispose(); });
  }
}

// ---- personajes GLB elegibles como avatar del jugador ----

export const GLB_AVATARS = {};
// personajes propios (Meshy) elegibles: el sanferminero, el pastor, el futbolista de Osasuna y el pelotari
for (const id of ['sanfermin', 'pastor', 'osasuna', 'pelotari']) if (MESHY[id]) GLB_AVATARS[id] = { meshy: id, bust: MESHY_PICS[id + '_bust'], full: MESHY_PICS[id + '_full'], hero: MESHY_PICS[id + '_hero'] };   // (hero: el grande de la portada)
export const hasMeshy = (id) => !!MESHY[id];
export const isGlbAvatar = id => !!GLB_AVATARS[id];
export const loadGlbAvatar = (id) => {
  const d = GLB_AVATARS[id];
  if (d.meshy) { fullTexFor(d.meshy); return loadMeshy(d.meshy); }   // el del jugador, con su textura completa
  return loadChar(d.url);
};

const EXPR = {
  happy: ['Happy', 'Normal'], surprised: ['Surprised', 'Normal'], scared: ['Scared', 'Worried'], worried: ['Normal', 'Worried'],
  sad: ['Tired', 'Worried'], tired: ['Tired', 'Worried'], angry: ['Normal', 'Angry'], thinking: ['Normal', 'Worried'], neutral: ['Normal', 'Normal'],
};

/** Adaptador con la misma interfaz que MinifigRig (update, doWave, doCheer, setExpr, doAct, carry). */
// las piernas del modelo son un 35 % más largas que las del diseño original: cada paso cubre más suelo
const LEGS = 1.3;
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
    if (grounded && !c.oneShot) {
      if (this.cheer > 0) c.playOnce('Celebrate', this.cheer);
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
  doCheer() { this.cheer = 2; this.char.oneShot = null; this.char.holdFace('Happy', 'Normal', 2.6, 'Fist'); }
  setExpr(name, dur = 2) { const e = EXPR[name] || EXPR.neutral; this.char.holdFace(e[0], e[1], dur); }
  /** Postura en parado (p. ej. 'Ready' en el frontón); null vuelve a Idle. */
  setStance(name) { this.char.idleName = name || null; }
  doAct(kind, t = 0.5) {
    const c = this.char;
    if (kind === 'hit' && c.actions.Hit) { c.playOnce('Hit', t); c.holdFace('SmileOpen', 'Angry', t, 'Open'); }
    else if (kind === 'pick') c.playOnce('Land', t);
    else if (kind === 'point') { c.playOnce('Talk', t); c.holdFace('Happy', 'Normal', t, 'Point'); }
    else { c.playOnce('Wave', t); c.holdFace('Happy', 'Normal', t, 'Fist'); }
  }
  dispose() { this.char.dispose(); }
}

// golpe a mano: el brazo derecho se echa atrás mientras llega la pelota (wind) y sale hacia delante al golpear (swing),
// con un giro del pecho; se aplica encima de la animación de cada pelotari
export function armSwing(char, get, { windOnly = false } = {}) {
  if (!char) return;
  const B = {}; char.root.traverse(o => { if (o.isBone) B[o.name] = o; });
  // KayKit (ejes locales conocidos) o Mixamo (los ejes del personaje se pasan al espacio de cada hueso)
  const mix = !B.upperarmr;
  const ua = B.upperarmr || B.mixamorigRightArm, la = B.lowerarmr || B.mixamorigRightForeArm, ch = B.chest || B.mixamorigSpine2; if (!ua) return;
  const q = new THREE.Quaternion(), qc = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3();
  // eje del personaje → espacio local del hueso (con la pose de este fotograma, no la del anterior)
  const local = (bone, axis) => { qc.identity(); for (let b = bone; b && b !== char.root; b = b.parent) qc.premultiply(b.quaternion); return ax.copy(axis).applyQuaternion(qc.invert()); };
  const turn = (bone, axis, a) => bone.quaternion.multiply(q.setFromAxisAngle(mix ? local(bone, axis) : axis, a));
  let w = 0;   // preparación suavizada
  char.post = (c, dt) => {
    const st = get(); if (!st) return;
    w += ((st.swing >= 0 ? 0 : st.wind || 0) - w) * Math.min(1, dt * 10);
    let arm = -2.3 * w, elbow = 1.0 * w, twist = 0.7 * w;   // brazo bien atrás, codo doblado y hombro girado
    if (st.swing >= 0 && windOnly) return;   // el golpe ya lo anima su clip
    if (st.swing >= 0) { const s = st.swing, up = Math.min(1, s / 0.3), back = s < 0.3 ? 1 : Math.max(0, 1 - (s - 0.3) / 0.7);   // latigazo rápido y vuelta
      arm = (-2.3 + 4.3 * up) * back; elbow = 1.0 * (1 - up) * back; twist = (0.7 - 1.4 * up) * back; }
    // en Mixamo el personaje mira a +Z: girar el brazo alrededor de +X lo lleva atrás, de ahí el signo
    if (Math.abs(arm) > 1e-3) turn(ua, X, mix ? -arm * 0.8 : arm);
    if (la && Math.abs(elbow) > 1e-3) turn(la, X, -elbow);
    if (ch && Math.abs(twist) > 1e-3) turn(ch, Y, twist);
  };
}
