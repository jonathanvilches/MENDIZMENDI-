// Personajes GLB del sistema de personajes 3D (tools/chars genera los .glb con Blender).
// Carga con GLTFLoader, clona con SkeletonUtils, elige Idle/Walk/Run según la velocidad,
// gestiona la cara por visibilidad de mallas (boca, cejas, párpados, manos), el parpadeo,
// la mirada (offset de la textura del ojo) y muelles en los huesos Hair_* y Scarf_*.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const cache = new Map();
let loader = null;

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
   * @param {object} [opt] { timeScale: multiplicador de ritmo (Kike 1.15), walkAt, runAt: velocidades de cambio }
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
      if (o.isBone) this.bones[o.name] = o;
      else if (o.name.startsWith('Socket_')) this.sockets[o.name] = o;
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.castShadow = true;
      this.meshes[o.name] = o;
      const g = o.userData.group;
      if (g) {
        (this.groups[g] = this.groups[g] || []).push(o);
        o.visible = !!o.userData.default;
      }
    });
    // material de ojos propio para mover la pupila sin afectar a otros clones
    const eye = this.meshes.Eye_L;
    if (eye) {
      const mat = eye.material.clone();
      if (mat.map) { mat.map = mat.map.clone(); mat.map.needsUpdate = true; }
      this.eyeMat = mat;
      for (const n of ['Eye_L', 'Eye_R']) if (this.meshes[n]) this.meshes[n].material = mat;
    }
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
    this.face = { mouth: 'Normal', brow: 'Normal', hand: 'Open' };
    this.blinkT = 2 + Math.random() * 3;
    this.blinkLeft = 0;
    this.lookTarget = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.lookT = 1 + Math.random() * 2;
    this.talkT = 0;
    this._initSprings();
    this.play('Idle', 0);
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
    const ex = this.clipExtras[name];
    if (ex && ex.face && !this.faceLock) this.setFace(ex.face, ex.brow, ex.hand);
    return a;
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

  /** Cara: boca (Normal, Happy, Surprised, Scared, Talk_A, Talk_O, Tired), cejas (Normal, Angry, Worried), mano derecha (Open, Fist, Point). */
  setFace(mouth, brow, hand) {
    if (mouth) { this.face.mouth = mouth; this._show('mouth', 'Mouth_' + mouth); }
    if (brow) { this.face.brow = brow; this._show('brow', 'Brow_' + brow); }
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

  _show(group, name) {
    const list = this.groups[group];
    if (!list || !list.some(m => m.name === name)) return false;
    for (const m of list) m.visible = m.name === name;
    return true;
  }

  _lid(name) {
    const list = this.groups.lid;
    if (list) for (const m of list) m.visible = m.name === name;
  }

  /** Mirada en [-1,1] (x a la derecha de quien mira, y arriba). */
  lookAt2(x, y) { this.lookTarget.set(x, y); this.lookT = 2; }

  update(dt) {
    dt = Math.min(dt, 0.1);
    // locomoción
    if (!this.oneShot || (this.oneShot.t -= dt) <= 0) {
      if (this.oneShot) this.oneShot = null;
      const v = this.speed, ts = this.opt.timeScale;
      let want = 'Idle', scale = ts;
      if (v > this.opt.runAt && this.actions.Run) { want = 'Run'; scale = ts * Math.max(0.6, v / RUN_REF); }
      else if (v > this.opt.walkAt && this.actions.Walk) { want = 'Walk'; scale = ts * Math.max(0.35, v / WALK_REF); }
      else if (this.talking && this.actions.Talk) want = 'Talk';
      this.play(want);
      if (this.current) this.current.timeScale = scale;
    }
    this.mixer.update(dt);
    // expresión fijada
    if (this.faceLock > 0 && (this.faceLock -= dt) <= 0) {
      this.faceLock = 0;
      const ex = this.clipExtras[this.currentName];
      if (ex && ex.face) this.setFace(ex.face, ex.brow, ex.hand);
    }
    // boca al hablar: alterna A/O
    if (this.currentName === 'Talk' && !this.faceLock) {
      this.talkT -= dt;
      if (this.talkT <= 0) {
        this.talkT = 0.09 + Math.random() * 0.12;
        const r = Math.random();
        this._show('mouth', r < 0.45 ? 'Mouth_Talk_A' : r < 0.8 ? 'Mouth_Talk_O' : 'Mouth_Normal');
      }
    }
    // parpadeo cada 2–5 s durante 120 ms
    if (this.blinkLeft > 0) {
      this.blinkLeft -= dt;
      this._lid(this.blinkLeft > 0.04 && this.blinkLeft < 0.08 ? 'Eyelid_Closed' : this.blinkLeft > 0 ? 'Eyelid_Half' : '');
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
    if (this.eyeMat && this.eyeMat.map) this.eyeMat.map.offset.set(-this.look.x * 0.07, -this.look.y * 0.05);
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
