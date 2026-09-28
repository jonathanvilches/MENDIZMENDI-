// Protagonista: modelo original del proyecto (GLB con esqueleto) + animación
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import heroUrl from '../../assets/hero.glb?url';
import idlePose from '../../assets/idle-pose.json';
import { clamp, lerp } from '../util/math.js';

export async function loadHero() {
  const gltf = await new GLTFLoader().loadAsync(heroUrl);
  const root = gltf.scene;
  const bones = {};
  root.traverse(o => {
    if (o.isBone || idlePose[o.name]) bones[o.name] = o;
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      o.frustumCulled = false;
      const m = o.material;
      if (m) { m.roughness = Math.max(m.roughness ?? 0.8, 0.6); m.metalness = 0; if (m.name === 'Eye glint') { m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = 0.6; } }
    }
  });
  // escala a 1,65 m
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = box.max.y - box.min.y;
  const s = 1.65 / h;
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(root);
  inner.scale.setScalar(s);
  inner.position.y = -box.min.y * s;
  holder.add(inner);
  // Clip de marcha: solo rotaciones (conserva la longitud de los huesos) + balanceo vertical de la raíz
  const src = gltf.animations[0];
  const tracks = src.tracks.filter(t => t.name.endsWith('.quaternion'));
  const walk = new THREE.AnimationClip('walk', src.duration, tracks);
  // Clip de reposo a partir de la pose original
  const idleTracks = [];
  for (const [name, t] of Object.entries(idlePose)) {
    if (!bones[name]) continue;
    idleTracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, [0, 1], [...t.q, ...t.q]));
  }
  const idle = new THREE.AnimationClip('idle', 1, idleTracks);
  const mixer = new THREE.AnimationMixer(root);
  const aWalk = mixer.clipAction(walk), aIdle = mixer.clipAction(idle);
  aWalk.play(); aIdle.play();
  aWalk.setEffectiveWeight(0); aIdle.setEffectiveWeight(1);
  return new HeroRig(holder, mixer, aWalk, aIdle, bones);
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler();

export class HeroRig {
  constructor(obj, mixer, walk, idle, bones) {
    this.obj = obj; this.mixer = mixer; this.walk = walk; this.idle = idle; this.bones = bones;
    this.t = 0; this.wave = 0; this.cheer = 0; this.airborne = 0; this.lean = 0;
    this.phase = 0;
  }
  // speed en m/s, grounded, turnRate para inclinarse en las curvas
  update(dt, speed, grounded, turnRate) {
    this.t += dt;
    const moving = clamp(speed / 2.2, 0, 1);
    this.walk.setEffectiveWeight(moving);
    this.idle.setEffectiveWeight(1 - moving);
    // La marcha original recorre ~1,5 m por ciclo
    this.walk.timeScale = clamp(speed / 1.55, 0.6, 3.2);
    this.mixer.update(dt);
    const b = this.bones;
    // respiración en reposo
    const breath = Math.sin(this.t * 2.1) * 0.025 * (1 - moving);
    if (b.Chest) b.Chest.rotateX(breath);
    if (b.Head) b.Head.rotateX(-breath * 0.6 + Math.sin(this.t * 0.7) * 0.03 * (1 - moving));
    // carrera: inclinación hacia delante
    const run = clamp((speed - 3.5) / 3, 0, 1);
    if (b.Spine) b.Spine.rotateX(run * 0.18);
    // salto: piernas recogidas y brazos arriba
    this.airborne = lerp(this.airborne, grounded ? 0 : 1, 1 - Math.exp(-12 * dt));
    if (this.airborne > 0.01) {
      const a = this.airborne;
      if (b['Thigh.L']) b['Thigh.L'].rotateX(-0.5 * a);
      if (b['Thigh.R']) b['Thigh.R'].rotateX(-0.2 * a);
      if (b['Shin.L']) b['Shin.L'].rotateX(0.9 * a);
      if (b['Shin.R']) b['Shin.R'].rotateX(0.5 * a);
      if (b['UpperArm.L']) b['UpperArm.L'].rotateZ(-0.5 * a);
      if (b['UpperArm.R']) b['UpperArm.R'].rotateZ(0.5 * a);
    }
    // saludo (brazo derecho) y celebración (ambos)
    if (this.wave > 0) {
      this.wave -= dt;
      const k = Math.min(1, this.wave * 2, (1.6 - this.wave) * 4);
      if (b['UpperArm.R']) b['UpperArm.R'].rotateZ(2.2 * k);
      if (b['Forearm.R']) b['Forearm.R'].rotateZ(0.6 * k + Math.sin(this.t * 14) * 0.35 * k);
    }
    if (this.cheer > 0) {
      this.cheer -= dt;
      const k = Math.min(1, this.cheer * 2, (2 - this.cheer) * 4);
      if (b['UpperArm.R']) b['UpperArm.R'].rotateZ(2.6 * k);
      if (b['UpperArm.L']) b['UpperArm.L'].rotateZ(-2.6 * k);
      if (b['Forearm.R']) b['Forearm.R'].rotateZ(Math.sin(this.t * 12) * 0.3 * k);
      if (b['Forearm.L']) b['Forearm.L'].rotateZ(-Math.sin(this.t * 12) * 0.3 * k);
    }
    // inclinación en curvas
    this.lean = lerp(this.lean, clamp(-turnRate * speed * 0.03, -0.18, 0.18), 1 - Math.exp(-6 * dt));
    this.obj.children[0].rotation.z = this.lean;
  }
  doWave() { this.wave = 1.6; }
  doCheer() { this.cheer = 2; }
}
