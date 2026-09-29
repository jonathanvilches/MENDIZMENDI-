// Escenario 3D en vivo para el centro de mando: el personaje elegido sobre un pedestal de hierba,
// girando despacio, respirando y saludando al tocarlo.
import * as THREE from 'three';
import { buildMinifig, MinifigAnimator, COSTUMES, setOutlines } from '../actors/minifig.js';

let R = null;
function renderer() {
  if (R) return R;
  const c = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  return R;
}

export class Stage {
  constructor(host, avatarId, { turntable = true } = {}) {
    this.host = host; this.turntable = turntable;
    this.r = renderer();
    Stage.current?.dispose(); Stage.current = this;
    host.appendChild(this.r.domElement);
    this.r.domElement.className = 'stage3d';
    const scene = this.scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e8', '#4a3a5a', 1.5));
    const key = new THREE.DirectionalLight('#fff0d8', 2.4); key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5, near: 0.5, far: 10 }); scene.add(key);
    const rim = new THREE.DirectionalLight('#9fd0ff', 1.6); rim.position.set(-3, 2, -2); scene.add(rim);
    // pedestal: isla de hierba con piedra
    const base = new THREE.Group(); scene.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.8, 0.12, 40), new THREE.MeshToonMaterial({ color: '#6fbf4f' })); top.position.y = -0.06; top.receiveShadow = true; base.add(top);
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.55, 0.4, 40), new THREE.MeshToonMaterial({ color: '#8a7a68' })); rock.position.y = -0.32; base.add(rock);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, b = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), new THREE.MeshToonMaterial({ color: i % 3 ? '#5aa83f' : '#7fcf5a' })); b.position.set(Math.cos(a) * 0.72, 0.04, Math.sin(a) * 0.72); base.add(b); }
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshToonMaterial({ color: ['#ffd23f', '#ffffff', '#ff8cb0'][i % 3] })); f.position.set(Math.cos(a) * 0.6, 0.02, Math.sin(a) * 0.6); base.add(f); }
    this.base = base;
    this.cam = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
    this.setAvatar(avatarId);
    this.t = 0; this.last = performance.now(); this.alive = true;
    this.onTap = () => { this.wave = 1.4; this.cheer = this.cheer > 0 ? 0 : 0; };
    this.r.domElement.addEventListener('pointerdown', this.onTap);
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  setAvatar(id) {
    if (this.fig) this.scene.remove(this.fig);
    this.fig = buildMinifig(COSTUMES[id] || COSTUMES.leire, { hero: true });
    setOutlines(this.fig, true);
    this.fig.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
    this.anim = new MinifigAnimator(this.fig);
    this.scene.add(this.fig);
    const H = this.fig.userData.H;
    this.cam.position.set(0, H * 0.62, H * 3.1 + 1.2); this.cam.lookAt(0, H * 0.48, 0);
    this.wave = 1.2;
  }
  loop(now) {
    if (!this.alive) return;
    requestAnimationFrame(this.loop);
    if (!this.host.isConnected) { this.dispose(); return; }
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    if (this.w !== w || this.h !== h) { this.w = w; this.h = h; this.r.setSize(w, h, false); this.r.domElement.style.width = w + 'px'; this.r.domElement.style.height = h + 'px'; this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    if (this.wave > 0) this.wave -= dt;
    if (this.turntable) { const a = Math.sin(this.t * 0.35) * 0.55; this.fig.rotation.y = a; this.base.rotation.y = a; }
    this.anim.update(dt, { speed: 0, grounded: true, wave: this.wave, talking: this.wave > 0 ? 1 : 0 });
    this.r.render(this.scene, this.cam);
  }
  dispose() { this.alive = false; this.r.domElement.removeEventListener('pointerdown', this.onTap); if (this.r.domElement.parentNode === this.host) this.r.domElement.remove(); }
}
