// Personajes GLB del sistema de personajes 3D (tools/chars genera los .glb con Blender).
// Carga con GLTFLoader, clona con SkeletonUtils, elige Idle/Walk/Run según la velocidad,
// gestiona la cara por visibilidad de mallas (boca, cejas, párpados, manos), el parpadeo,
// la mirada (offset de la textura del ojo) y muelles en los huesos Hair_* y Scarf_*.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
// personajes KayKit Adventurers 2.0 (CC0, Kay Lousberg, www.kaylousberg.com): modelo y animaciones del rig común
const KK = {};
for (const [p, u] of Object.entries(import.meta.glob('../assets/kaykit/*.glb', { eager: true, query: '?url', import: 'default' }))) KK[p.split('/').pop().replace('.glb', '')] = u;
const KK_PICS = {};
for (const [p, u] of Object.entries(import.meta.glob('../assets/kaykit/portraits/*.png', { eager: true, query: '?url', import: 'default' }))) KK_PICS[p.split('/').pop().replace('.png', '')] = u;
// sus clips con los nombres que usa el juego
const KK_CLIPS = { Idle: 'Idle_A', Walk: 'Walking_A', Run: 'Running_A', Jump_Start: 'Jump_Start', Jump_Loop: 'Jump_Idle', Land: 'Jump_Land', Wave: 'Interact', Celebrate: 'Jump_Full_Short', Talk: 'Idle_B', Hit: 'Throw', Scared: 'Hit_A', Ready: 'Idle_B', Pick: 'PickUp' };

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

/** Personaje KayKit: su modelo con los clips del rig común renombrados como los del juego y escalado a su altura. */
export async function loadKayKit(name, height = 1.5) {
  const key = 'kaykit:' + name;
  if (!cache.has(key)) cache.set(key, (async () => {
    const [ch, mv, gen] = await Promise.all([loadChar(KK[name]), loadChar(KK.Rig_Medium_MovementBasic), loadChar(KK.Rig_Medium_General)]);
    const src = [...mv.animations, ...gen.animations], animations = [];
    for (const [want, have] of Object.entries(KK_CLIPS)) { const c = src.find(a => a.name === have); if (c) { const k = c.clone(); k.name = want; animations.push(k); } }
    const box = new THREE.Box3().setFromObject(ch.scene), fit = height / Math.max(0.1, box.max.y - box.min.y);
    return { scene: ch.scene, animations, userData: { fit, kaykit: true } };
  })());
  return cache.get(key);
}
/** Carga (una sola vez por url) el GLB de un personaje. */
export function loadChar(url) {
  if (!cache.has(url)) {
    loader = loader || new GLTFLoader();
    cache.set(url, loader.loadAsync(url));
  }
  return cache.get(url);
}

// velocidades de referencia de los clips (m/s): el timeScale sale de la velocidad real
const WALK_REF = 4.3, RUN_REF = 7.2;
const FADE = 0.2;
const GROUPS = { mouth: 'Mouth_', brow: 'Brow_', lid: 'Eyelid_' };

export class GlbChar {
  /**
   * @param {object} gltf resultado de loadChar
   * @param {object} [opt] { timeScale: multiplicador de ritmo (Kike 1.15), walkAt, runAt: velocidades de cambio,
   *   gait(v, 'Walk'|'Run'): ritmo del clip según la velocidad (por defecto v / 4,3 y v / 7,2 como en el encargo) }
   */
  constructor(gltf, opt = {}) {
    this.root = SkeletonUtils.clone(gltf.scene);
    this.root.name = 'GlbChar';
    this.opt = { timeScale: 1, walkAt: 0.15, runAt: 3.2, ...opt };
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
      if (painted && mat.map && mat.emissive) { mat.emissive.set('#ffffff'); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.28; }
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
    this.headBone = this.bones.Head || null; this.headYaw = 0;
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
    a.reset().setEffectiveWeight(1).play();
    if (this.current) this.current.crossFadeTo(a, fade, false);
    this.current = a;
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
  playOnce(name, secs) {
    const a = this.actions[name];
    if (!a) return;
    this.oneShot = { name, t: secs ?? a.getClip().duration * (a.loop === THREE.LoopOnce ? 1 : 1) };
    this.play(name);
  }

  _onFinished(action) {
    if (this.oneShot && this.actions[this.oneShot.name] === action) this.oneShot = null;
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
    if (!this.oneShot || (this.oneShot.t -= dt) <= 0) {
      if (this.oneShot) this.oneShot = null;
      const v = this.speed, ts = this.opt.timeScale;
      let want = this.idleName && this.actions[this.idleName] ? this.idleName : 'Idle', scale = ts;
      const gait = this.opt.gait;
      if (v > this.opt.runAt && this.actions.Run) { want = 'Run'; scale = ts * (gait ? gait(v, 'Run') : Math.max(0.6, v / RUN_REF)); }
      else if (v > this.opt.walkAt && this.actions.Walk) { want = 'Walk'; scale = ts * (gait ? gait(v, 'Walk') : Math.max(0.35, v / WALK_REF)); }
      else if (this.talking && this.actions.Talk) want = 'Talk';
      this.play(want);
      if (this.current) this.current.timeScale = scale;
    }
    // los huesos que se tocan después del mixer vuelven a su base (un clip puede no animarlos)
    for (const b of this.postBones) b.quaternion.copy(b.userData.q0);
    this.mixer.update(dt);
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
  }
}

// ---- personajes GLB elegibles como avatar del jugador ----

// todos los personajes con el mismo cuerpo (KayKit): Beñat, Nerea y Haritz llevan su propia ropa (own) si no se elige otra
export const GLB_AVATARS = {};
for (const [id, name] of [['benat', 'Rogue_Hooded'], ['nerea', 'Rogue'], ['haritz', 'Rogue_Hooded'], ['ranger', 'Ranger'], ['rogue', 'Rogue'], ['hooded', 'Rogue_Hooded'], ['knight', 'Knight'], ['barbarian', 'Barbarian'], ['mage', 'Mage']])
  if (KK[name]) GLB_AVATARS[id] = { kaykit: name, own: OWN_OUTFITS[id], bust: KK_PICS[id + '_bust'], full: KK_PICS[id + '_full'] };
export const isGlbAvatar = id => !!GLB_AVATARS[id];
export const loadGlbAvatar = id => GLB_AVATARS[id].kaykit ? loadKayKit(GLB_AVATARS[id].kaykit) : loadChar(GLB_AVATARS[id].url);

const EXPR = {
  happy: ['Happy', 'Normal'], surprised: ['Surprised', 'Normal'], scared: ['Scared', 'Worried'], worried: ['Normal', 'Worried'],
  sad: ['Tired', 'Worried'], tired: ['Tired', 'Worried'], angry: ['Normal', 'Angry'], thinking: ['Normal', 'Worried'], neutral: ['Normal', 'Normal'],
};

/** Adaptador con la misma interfaz que MinifigRig (update, doWave, doCheer, setExpr, doAct, carry). */
// las piernas del modelo son un 35 % más largas que las del diseño original: cada paso cubre más suelo
const LEGS = 1.3;
import { applyOutfit, outfitOf, OWN_OUTFITS } from './outfits.js';
export class GlbRig {
  constructor(gltf, id = 'benat') {
    const def = GLB_AVATARS[id] || {};
    this.obj = new THREE.Group();
    // zancada natural de los clips: Walk ≈ 1,0 m/s y Run ≈ 2,5 m/s. Las velocidades del juego (3,3 y 6,8 m/s) son
    // mayores: el ritmo sube con la raíz de la velocidad para que las piernas no se vuelvan frenéticas
    // Walk avanza ~1,15 m por ciclo y Run ~2,5 m/s: el ritmo sigue casi a la velocidad (los pies apenas patinan)
    this.char = new GlbChar(gltf, { outline: 0.006, walkAt: 0.2, runAt: 4.6, gait: (v, n) => n === 'Run' ? Math.pow(Math.max(0.3, v) / (2.5 * LEGS), 0.85) : Math.pow(Math.max(0.2, v) / (1.15 * LEGS), 0.8) });
    // personajes KayKit: traje navarro elegido (San Fermín, dantzari, pastor…)
    if (def.kaykit) { try { this.outfit = outfitOf(id); if (this.outfit === 'original' && def.own) this.outfit = def.own; applyOutfit(this.char.root, def.kaykit, this.outfit); } catch (e) { console.warn('traje', e); } }
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
    // saltos: impulso al despegar, bucle en el aire y caída al tocar suelo
    if (!grounded) this.air += dt;
    if (this.wasGrounded && !grounded) c.playOnce('Jump_Start', 0.25);
    else if (!grounded && !c.oneShot) c.playOnce('Jump_Loop', 0.1);
    else if (!this.wasGrounded && grounded) { if (this.air > 0.25) c.playOnce('Land', 0.25); else c.oneShot = null; this.air = 0; }
    this.wasGrounded = grounded;
    if (grounded && !c.oneShot) {
      if (this.cheer > 0) c.playOnce('Celebrate', this.cheer);
      else if (this.wave > 0 && speed < 1) c.playOnce('Wave', this.wave);
    }
    c.setTalking(this.talking > 0);
    c.setSpeed(speed);
    // cuerpo vivo: se inclina hacia dentro en las curvas (más cuanto más corre), hacia delante al arrancar
    // y al correr, y la cabeza se adelanta al giro
    if (dt > 0) {
      const tr = grounded ? (turnRate || 0) : 0, cl = THREE.MathUtils.clamp;
      const acc = (speed - this.lastSpeed) / dt; this.lastSpeed = speed;
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
