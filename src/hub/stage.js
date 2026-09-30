// Escenarios 3D en vivo del centro de mando:
//  · 'scene': el personaje en el camino de su pueblo (diorama de la comarca) — portada
//  · 'showcase': plataforma de selección con aro de luz, haz y chispas del color del personaje
import * as THREE from 'three';
import { buildMinifig, MinifigAnimator, COSTUMES, setOutlines } from '../actors/minifig.js';
import { buildDiorama } from './diorama.js';
import { castById } from '../data/cast.js';
import { GlbRig, isGlbAvatar, loadGlbAvatar } from '../actors/glbChar.js';

let R = null;
function renderer() {
  if (R) return R;
  const c = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  R.debug.checkShaderErrors = false;
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  return R;
}
const dioramas = new Map();

function glowTex(inner, outer = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Stage {
  constructor(host, avatarId, { mode = 'showcase', comarca = 'bidasoa' } = {}) {
    this.host = host; this.mode = mode;
    this.r = renderer();
    Stage.current?.dispose(); Stage.current = this;
    host.appendChild(this.r.domElement);
    this.r.domElement.className = 'stage3d';
    this.cam = new THREE.PerspectiveCamera(mode === 'scene' ? 38 : 26, 1, 0.1, 3000);
    if (mode === 'scene') this.buildScene(comarca); else this.buildShowcase();
    this.setAvatar(avatarId);
    this.t = 0; this.last = performance.now(); this.alive = true; this.yaw = 0; this.drag = null;
    const el = this.r.domElement;
    this.onDown = (e) => { this.drag = { x: e.clientX, yaw: this.yaw, moved: false }; };
    this.onMove = (e) => { if (!this.drag) return; const dx = e.clientX - this.drag.x; if (Math.abs(dx) > 6) this.drag.moved = true; this.yaw = this.drag.yaw + dx * 0.012; };
    this.onUp = () => { if (this.drag && !this.drag.moved) this.poke(); this.drag = null; };
    el.addEventListener('pointerdown', this.onDown); addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
    // los shaders se compilan en paralelo (si el navegador lo permite) antes del primer dibujo,
    // para no congelar la pantalla; mientras tanto el escenario aparece con un fundido
    this.ready = false; el.style.opacity = 0; el.style.transition = 'opacity .4s';
    const go = () => { this.ready = true; el.style.opacity = 1; };
    try { this.r.compileAsync(this.scene, this.cam).then(go, go); } catch (e) { go(); }
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  poke() { this.wave = 1.6; this.jump = 0.5; this.anim?.setExpr(Math.random() < 0.3 ? 'surprised' : 'happy', 1.8); this.onPoke?.(); }
  buildScene(comarca) {
    // el diorama se construye una vez por comarca y se reutiliza
    let D = dioramas.get(comarca);
    if (!D) { D = buildDiorama(comarca, { live: true }); dioramas.set(comarca, D); }
    this.D = D; this.scene = D.scene;
    this.r.setClearColor(0, 1);
  }
  buildShowcase() {
    const scene = this.scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#e8e0ff', '#2a1050', 1.1));
    const key = this.key = new THREE.SpotLight('#ffffff', 60, 14, 0.5, 0.6, 1.4); key.position.set(1.6, 5.5, 3.2); key.target.position.set(0, 0.6, 0);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; scene.add(key, key.target);
    const rim = this.rim = new THREE.DirectionalLight('#ffffff', 2.4); rim.position.set(-2.5, 2.5, -3); scene.add(rim);
    const front = new THREE.DirectionalLight('#fff1dc', 1.0); front.position.set(0, 1.5, 5); scene.add(front);
    const pad = this.pad = new THREE.Group(); scene.add(pad);
    const metal = new THREE.MeshStandardMaterial({ color: '#2a1d4a', metalness: 0.6, roughness: 0.35 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.16, 64), metal); top.position.y = -0.08; top.receiveShadow = true; pad.add(top);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.02, 64), new THREE.MeshStandardMaterial({ color: '#3b2a66', metalness: 0.3, roughness: 0.5 })); inner.position.y = 0.005; inner.receiveShadow = true; pad.add(inner);
    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.2, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#1a1030', metalness: 0.5, roughness: 0.45 })); step.position.y = -0.2; pad.add(step);
    this.ringMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.2 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.022, 10, 96), this.ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; pad.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.014, 8, 96), this.ringMat); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.14; pad.add(ring2);
    // marcas del aro (dan sensación de giro)
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.018), this.ringMat); b.position.set(Math.cos(a) * 0.86, 0.02, Math.sin(a) * 0.86); b.rotation.y = -a; pad.add(b); }
    // halo en el suelo y haz de luz
    this.glowMat = new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,255,255,0.9)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), this.glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = -0.26; scene.add(glow);
    const beamG = new THREE.CylinderGeometry(0.62, 0.95, 3.6, 48, 1, true); beamG.translate(0, 1.8, 0);
    const bc = beamG.attributes.position, alpha = new Float32Array(bc.count); for (let i = 0; i < bc.count; i++) alpha[i] = 1 - bc.getY(i) / 3.6; beamG.setAttribute('a', new THREE.BufferAttribute(alpha, 1));
    this.beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color('#ffffff') }, uT: { value: 0 } },
      vertexShader: 'attribute float a; varying float vA; varying vec3 vN; varying vec3 vV; void main(){ vA = a; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uC; varying float vA; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(vN, vV)); gl_FragColor = vec4(uC, pow(vA, 2.2) * (0.05 + f * 0.2)); }' });
    scene.add(new THREE.Mesh(beamG, this.beamMat));
    // chispas que suben
    const N = 70, pos = new Float32Array(N * 3); this.sparkData = [];
    for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, r = 0.3 + Math.random() * 0.75; this.sparkData.push({ a, r, y: Math.random() * 2.6, s: 0.25 + Math.random() * 0.45 }); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sparkMat = new THREE.PointsMaterial({ size: 0.045, map: glowTex('rgba(255,255,255,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff' });
    this.sparks = new THREE.Points(sg, this.sparkMat); scene.add(this.sparks);
    this.r.setClearColor(0, 0);
  }
  setColor(hex) {
    if (this.mode !== 'showcase') return;
    const c = new THREE.Color(hex), bright = c.clone().lerp(new THREE.Color('#ffffff'), 0.25);
    this.ringMat.color.copy(bright); this.ringMat.emissive.copy(bright);
    this.glowMat.color.copy(c); this.beamMat.uniforms.uC.value.copy(bright); this.sparkMat.color.copy(bright);
    this.rim.color.copy(bright);
  }
  setAvatar(id) {
    const token = this.avatarToken = (this.avatarToken || 0) + 1;
    if (isGlbAvatar(id)) {
      // personaje GLB: se carga en segundo plano; mientras tanto sigue el anterior
      loadGlbAvatar(id).then(g => { if (this.avatarToken === token && this.alive !== false) this.useFig(id, this.glbFig(g, id)); })
        .catch(e => { console.warn('avatar GLB', e); if (this.avatarToken === token) this.useFig(id, this.minifig(id)); });
      if (!this.fig) this.useFig(id, this.minifig(id));
      return;
    }
    this.useFig(id, this.minifig(id));
  }
  minifig(id) {
    const fig = buildMinifig(COSTUMES[id] || COSTUMES.leire, { hero: true });
    setOutlines(fig, true);
    fig.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
    return { fig, anim: new MinifigAnimator(fig), H: fig.userData.H };
  }
  glbFig(gltf, id) {
    const rig = new GlbRig(gltf, id);
    let prevWave = 0;
    // mismo contrato que MinifigAnimator: update(dt, estado) y setExpr
    const anim = {
      update: (dt, s) => { if ((s.wave || 0) > prevWave + 0.01) rig.doWave(); prevWave = s.wave || 0; rig.update(dt, 0, true, 0); },
      setExpr: (n, d) => rig.setExpr(n, d),
    };
    const box = new THREE.Box3().setFromObject(rig.obj);
    return { fig: rig.obj, anim, H: box.max.y - box.min.y, rig };
  }
  useFig(id, { fig, anim, H: h, rig }) {
    if (this.fig) this.scene.remove(this.fig);
    this.glbRig?.dispose(); this.glbRig = rig || null;
    this.fig = fig; this.anim = anim;
    this.scene.add(this.fig);
    const H = this.H = h;
    this.setColor(castById(id)?.color || '#FFD700');
    this.pop = this.mode === 'showcase' ? 0 : 1; this.wave = 1.4; this.yaw = 0;
    this.frame();
  }
  // encuadre según la forma del hueco
  frame() {
    const H = this.H || 1.4, a = this.cam.aspect || 1;
    if (this.mode === 'scene') {
      // personaje en el centro, el pueblo y los montes detrás
      const tall = a < 0.9;
      this.cam.fov = tall ? 40 : 34;
      // huecos poco altos: personaje algo más pequeño y más arriba para que no lo tapen los textos
      const k = tall ? Math.min(1, Math.max(0, (a - 0.55) / 0.3)) : 0;
      const d = tall ? 5.6 + k * 1.9 : 5.0;
      this.cam.position.set(0.5, 1.25, d);
      this.lookY = tall ? 0.62 - k * 0.36 : 0.72;
      this.cam.lookAt(0, this.lookY, 0);
      if (!tall && this.w) this.cam.setViewOffset(this.w, this.h, -this.w * 0.17, 0, this.w, this.h); else this.cam.clearViewOffset();
    } else {
      const d = a < 0.8 ? H * 4.4 + 1.6 : H * 3.3 + 1.3;
      this.cam.fov = 26;
      this.cam.position.set(0, H * 0.75, d); this.cam.lookAt(0, H * 0.5, 0);
    }
    this.cam.updateProjectionMatrix();
  }
  loop(now) {
    if (!this.alive) return;
    requestAnimationFrame(this.loop);
    if (!this.host.isConnected) { this.dispose(); return; }
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now; this.t += dt;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    if (this.w !== w || this.h !== h) { this.w = w; this.h = h; this.r.setSize(w, h, false); this.r.domElement.style.width = w + 'px'; this.r.domElement.style.height = h + 'px'; this.cam.aspect = w / h; this.frame(); }
    if (this.wave > 0) this.wave -= dt;
    let jumpY = 0; if (this.jump > 0) { this.jump -= dt; jumpY = Math.sin((1 - this.jump / 0.5) * Math.PI) * 0.25; }
    if (this.mode === 'scene') {
      this.D.update(dt);
      if (!this.drag) this.yaw *= Math.pow(0.1, dt);
      this.fig.rotation.y = 0.18 + Math.sin(this.t * 0.4) * 0.12 + this.yaw;
      this.fig.position.y = jumpY;
      // la cámara respira despacio
      const s = Math.sin(this.t * 0.18);
      this.cam.position.x = 0.5 + s * 0.3; this.cam.lookAt(s * 0.05, this.lookY, 0);
    } else {
      this.pop = Math.min(1, this.pop + dt * 3.2);
      const p = this.pop, k = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.12 - (1 - p) * 0.6 : 1;
      this.fig.scale.setScalar(Math.max(0.01, k));
      if (!this.drag) this.yaw *= Math.pow(0.3, dt);
      this.fig.rotation.y = Math.sin(this.t * 0.45) * 0.35 + this.yaw;
      this.fig.position.y = jumpY;
      this.pad.rotation.y += dt * 0.4;
      this.beamMat.uniforms.uT.value = this.t;
      const pos = this.sparks.geometry.attributes.position;
      this.sparkData.forEach((s, i) => { s.y += dt * s.s; if (s.y > 2.8) s.y = 0; s.a += dt * 0.4; pos.setXYZ(i, Math.cos(s.a) * s.r, s.y, Math.sin(s.a) * s.r); });
      pos.needsUpdate = true;
      this.sparkMat.opacity = 0.9;
    }
    this.anim.update(dt, { speed: 0, grounded: true, wave: this.wave, talking: this.wave > 0 ? 1 : 0 });
    if (this.ready) this.r.render(this.scene, this.cam);
  }
  dispose() {
    this.alive = false;
    this.r.domElement.removeEventListener('pointerdown', this.onDown); removeEventListener('pointermove', this.onMove); removeEventListener('pointerup', this.onUp);
    if (this.fig) this.scene.remove(this.fig);
    if (this.r.domElement.parentNode === this.host) this.r.domElement.remove();
  }
}
