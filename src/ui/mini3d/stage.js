// Escenario 3D de los minijuegos: una escena propia con su cámara y sus luces que se dibuja con el renderer del
// juego (como los prismáticos del mirador o el fútbol: el pueblo queda en pausa y no se abre un segundo WebGL, que
// en el iPhone puede cerrar la página). Encuadra lo importante según el tamaño de la pantalla y deja libres el panel
// de arriba y los botones de abajo; convierte los toques en rayos para tocar cosas en 3D; y al acabar libera todo lo
// que ha creado (sin tocar los modelos compartidos, como la vaca o la oveja).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);
let LAB = null;   // en la página de pruebas (sin juego) hay un renderer propio
export function labHost() {
  if (LAB) return LAB;
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(innerWidth, innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  Object.assign(r.domElement.style, { position: 'fixed', inset: '0', zIndex: '0' });
  addEventListener('resize', () => r.setSize(innerWidth, innerHeight));
  let cur = null, last = performance.now();
  const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; if (!cur) return; cur.update(dt); r.render(cur.scene, cur.camera); };
  requestAnimationFrame(loop);
  LAB = { renderer: r, quality: 'high', show(scene, camera, update) { if (!r.domElement.isConnected) document.body.prepend(r.domElement); cur = { scene, camera, update }; }, hide() { cur = null; r.clear(); } };
  return LAB;
}

// reflejos suaves de una habitación (para que el metal, el agua o la leche brillen); uno por renderer, se guarda
const ENV = new WeakMap();
function envFor(renderer) {
  if (!renderer) return null;
  if (!ENV.has(renderer)) { const pm = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(); ENV.set(renderer, pm.fromScene(room, 0.04).texture); room.dispose?.(); pm.dispose(); }
  return ENV.get(renderer);
}
/** Calidad del dispositivo (en el juego, la del pueblo; en pruebas, alta). */
export const stageQuality = (ui) => ui?.stage3d?.quality || 'high';

export class Stage {
  /**
   * @param ui  la interfaz del juego (ui.stage3d la pone el juego: show/hide con su renderer)
   * @param o   { bg, fog: [color, near, far], hemi: [cielo, suelo, intensidad], sun: { color, intensity, pos, shadow } }
   */
  constructor(ui, o = {}) {
    this.ui = ui; this.host = ui?.stage3d || labHost(); this.q = this.host.quality || 'high'; this.low = this.q === 'low';
    const S = this.scene = new THREE.Scene();
    S.background = new THREE.Color(o.bg || '#2a2018');
    if (o.fog) S.fog = new THREE.Fog(...o.fog);
    this.camera = new THREE.PerspectiveCamera(o.fov || 40, innerWidth / innerHeight, 0.05, 200);
    const env = envFor(this.host.renderer); if (env) { S.environment = env; S.environmentIntensity = o.env ?? 0.35; }
    const [hs, hg, hi] = o.hemi || ['#fff4e2', '#5a4a3a', 1.1];
    this.hemi = new THREE.HemisphereLight(hs, hg, hi); S.add(this.hemi);
    const sn = o.sun || {};
    this.sun = new THREE.DirectionalLight(sn.color || '#fff0d8', sn.intensity ?? 2.2);
    this.sun.position.set(...(sn.pos || [3, 6, 4])); S.add(this.sun, this.sun.target);
    if (!this.low && sn.shadow !== false) {
      this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
      const c = this.sun.shadow.camera, e = sn.extent || 3; Object.assign(c, { left: -e, right: e, top: e, bottom: -e, near: 0.5, far: 30 });
    }
    this.owned = []; this.ticks = []; this.t = 0; this.view = null; this.panels = { top: 0, bottom: 0 };
    this.mats = new Map();
    this.onResize = () => this.reframe(); addEventListener('resize', this.onResize);
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2();
  }
  /** Registra recursos propios para liberarlos al acabar (geometrías, materiales, texturas). */
  own(...xs) { for (const x of xs) if (x) { if (this.dead) x.dispose?.(); else this.owned.push(x); } return xs[0]; }   // (si ya se cerró mientras cargaba, se suelta al momento)
  /** Material estándar con caché (propio del escenario). */
  mat(color, o = {}) {
    const k = color + JSON.stringify(o, (key, v) => (v && v.isTexture ? v.uuid : v));
    if (!this.mats.has(k)) this.mats.set(k, this.own(new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o })));
    return this.mats.get(k);
  }
  /** Malla propia (la geometría se libera al acabar) colocada en (x, y, z). */
  mesh(geo, mat, x = 0, y = 0, z = 0, parent = this.scene) {
    const m = new THREE.Mesh(this.own(geo), typeof mat === 'string' ? this.mat(mat) : mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = !this.low; parent?.add(m); return m;
  }
  /** Libera una geometría de un objeto todavía no registrado (p. ej. una pieza recortada). */
  add(o) { this.scene.add(o); return o; }
  /** Algo que se anima en cada fotograma: fn(dt, t). */
  every(fn) { this.ticks.push(fn); }

  /**
   * Encuadre: «center» y «radius» (lo que tiene que verse entero) mirados desde la dirección «dir»; se aleja lo justo
   * para que quepa en la parte libre de la pantalla (entre el panel de arriba y los botones de abajo).
   */
  frame(center, radius, dir, fov = 38) { this.view = { center: new THREE.Vector3(...center), radius, dir: new THREE.Vector3(...dir).normalize(), fov, box: null }; this.reframe(); }
  /** Encuadre de una caja (Box3): más justo que la esfera para lo plano o alargado, de pie o en horizontal. */
  frameBox(box, dir, fov = 38) {
    this.view = { center: box.getCenter(new THREE.Vector3()), radius: box.getSize(new THREE.Vector3()).length() / 2, dir: new THREE.Vector3(...dir).normalize(), fov, box: box.clone() };
    this.reframe();
  }
  setPanels(top, bottom) { this.panels = { top, bottom }; this.reframe(); }
  reframe() {
    const c = this.camera, W = innerWidth, H = innerHeight; c.aspect = W / H;
    if (this.view) {
      const v = this.view, freeH = Math.max(0.35, (H - this.panels.top - this.panels.bottom) / H);
      const vHalf = THREE.MathUtils.degToRad(v.fov) / 2, hHalf = Math.atan(Math.tan(vHalf) * c.aspect);
      const fit = Math.min(Math.atan(Math.tan(vHalf) * freeH), hHalf) * 0.92;
      let d = v.radius / Math.sin(fit);
      if (v.box) {
        // la distancia justa para que las 8 esquinas queden dentro de la zona libre (en vertical, la parte libre)
        const f = _f.copy(v.dir).negate(), r = _r.crossVectors(f, _UP).normalize(), u = _u.crossVectors(r, f), b = v.box;
        const tV = Math.tan(vHalf) * freeH * 0.92, tH = Math.tan(hHalf) * 0.92; d = 0.1;
        for (let i = 0; i < 8; i++) {
          _q.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(v.center);
          const z = _q.dot(f); d = Math.max(d, Math.abs(_q.dot(r)) / tH - z, Math.abs(_q.dot(u)) / tV - z);
        }
      }
      c.fov = v.fov; c.position.copy(v.center).addScaledVector(v.dir, d); c.lookAt(v.center);
      // el centro de lo que se mira queda en el medio de la zona libre (desplazamiento de la imagen, sin girar)
      const shift = (this.panels.top - this.panels.bottom) / 2;
      if (Math.abs(shift) > 1) c.setViewOffset(W, H, 0, -shift, W, H); else c.clearViewOffset();
    }
    c.updateProjectionMatrix();
  }
  /** Rayo desde el punto de la pantalla (evento de puntero o {clientX, clientY}). */
  rayFrom(e) { this.v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); this.ray.setFromCamera(this.v2, this.camera); return this.ray; }
  pick(e, objects, recursive = true) { return this.rayFrom(e).intersectObjects(objects, recursive); }
  /** Punto 3D → píxeles de la pantalla (para los marcadores y las pruebas automáticas). */
  toScreen(v) { const p = v.clone().project(this.camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, front: p.z < 1 }; }

  start() { this.host.show(this.scene, this.camera, (dt) => this.tick(dt)); this.shown = true; this.reframe(); }
  tick(dt) { this.t += dt; for (const f of this.ticks) f(dt, this.t); }
  dispose() {
    if (this.dead) return; this.dead = true;
    removeEventListener('resize', this.onResize);
    if (this.shown) this.host.hide();   // (si no llegó a verse, la vista del juego no se toca)
    for (const x of this.owned) x.dispose?.();
    this.owned.length = 0; this.ticks.length = 0; this.mats.clear();
    this.scene.clear();
  }
}
