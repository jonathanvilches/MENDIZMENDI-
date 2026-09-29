import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../util/math.js';

// Paleta por hora del día: [hora, cenit, horizonte, sol color, sol intensidad, hemi cielo, hemi suelo, hemi int]
const KEYS = [
  // noche de luna: azulada y misteriosa, pero con luz suficiente para ver el camino
  [0, '#0d1638', '#26365e', '#9fb4f0', 0.85, '#5a70b8', '#2a3350', 0.95],
  [5, '#1b2450', '#4a4a70', '#9fb0ea', 0.7, '#5a6aa8', '#2a3048', 0.85],
  [6.3, '#4d6fb0', '#f3a978', '#ffb27a', 1.2, '#9fb4dc', '#5d5040', 0.55],
  [8, '#3f8fe0', '#bfe0f7', '#ffe3bd', 2.6, '#bfdcff', '#6d7a4a', 0.8],
  [12, '#2f7fdc', '#cfe8fb', '#fff4e2', 3.1, '#c9e2ff', '#72804f', 0.9],
  [16.5, '#3a86dc', '#d2e6f6', '#ffe6c2', 2.8, '#c4dcff', '#6f7b4c', 0.85],
  [18.4, '#5f7cc4', '#ffc493', '#ffb277', 2.2, '#c7c6e2', '#6d6048', 0.8],
  [19.3, '#3d4488', '#e0906f', '#ff9a66', 1.0, '#8f8fbf', '#3f3a3a', 0.62],
  [20.1, '#1c2458', '#6c4d6a', '#9aa4e0', 0.6, '#5a64a0', '#2a2c3e', 0.8],
  [21, '#0f1a40', '#2a3a64', '#a4b8f4', 0.85, '#5a70b8', '#2a3350', 0.95],
  [24, '#0d1638', '#26365e', '#9fb4f0', 0.85, '#5a70b8', '#2a3350', 0.95],
];
const KC = KEYS.map(k => ({ t: k[0], zen: new THREE.Color(k[1]), hor: new THREE.Color(k[2]), sun: new THREE.Color(k[3]), si: k[4], hs: new THREE.Color(k[5]), hg: new THREE.Color(k[6]), hi: k[7] }));

export class SkySystem {
  constructor(scene, renderer, quality) {
    this.scene = scene;
    this.time = 9.5;
    this.speed = 24 / (16 * 60); // un día = 16 minutos reales
    const geo = new THREE.SphereGeometry(2400, 48, 24);
    this.uniforms = {
      uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
      uTime: { value: 0 }, uNight: { value: 0 }, uCloud: { value: 0.55 },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
uniform vec3 uZen, uHor, uSunDir, uSunCol; uniform float uTime, uNight, uCloud; varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -1.0, 1.0);
  float t = pow(clamp(h, 0.0, 1.0), 0.55);
  vec3 col = mix(uHor, uZen, t);
  col = mix(col, uHor * 0.8, smoothstep(0.0, -0.3, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(sd, 8.0) * 0.25 + pow(sd, 90.0) * 0.6) * (1.0 - uNight * 0.7);
  float disc = smoothstep(0.9993, 0.9996, sd);
  col = mix(col, vec3(1.0, 0.97, 0.9) * 1.6, disc * (1.0 - uNight));
  // luna
  float md = max(dot(d, normalize(-uSunDir)), 0.0);
  col = mix(col, vec3(0.9, 0.92, 1.0), smoothstep(0.9990, 0.9994, md) * uNight);
  col += vec3(0.5,0.55,0.8) * pow(md, 60.0) * 0.25 * uNight;
  // estrellas
  if (uNight > 0.01 && h > 0.0) {
    vec2 sp = d.xz / (d.y + 0.25) * 90.0;
    vec2 cell = floor(sp);
    float s = hash(cell);
    vec2 f = fract(sp) - 0.5 - (vec2(hash(cell+1.3), hash(cell+7.1)) - 0.5) * 0.6;
    float star = smoothstep(0.08, 0.0, length(f)) * step(0.965, s);
    star *= 0.6 + 0.4 * sin(uTime * 2.0 + s * 50.0);
    col += vec3(star) * uNight * smoothstep(0.0, 0.25, h);
  }
  // nubes
  if (h > 0.0) {
    vec2 cp = d.xz / (d.y + 0.12) * 1.3 + vec2(uTime * 0.004, uTime * 0.0015);
    float n = fbm(cp * 1.4);
    float c = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.28, n);
    float shade = fbm(cp * 1.4 + vec2(0.05, 0.08));
    vec3 cc = mix(vec3(1.0), uHor * 0.9 + 0.1, 0.35) * (0.8 + 0.35 * (n - shade) * 3.0);
    cc = mix(cc, uSunCol * 1.2, pow(sd, 6.0) * 0.5);
    cc *= mix(1.0, 0.35, uNight);
    col = mix(col, cc, c * smoothstep(0.0, 0.18, h) * 0.92);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
    });
    this.dome = new THREE.Mesh(geo, this.mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    this.hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.8);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffffff', 3);
    this.sun.castShadow = true;
    const sm = quality === 'low' ? 1024 : quality === 'mid' ? 2048 : 3072;
    this.sun.shadow.mapSize.set(sm, sm);
    const S = this.shadowSize = quality === 'low' ? 38 : 55;
    Object.assign(this.sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 400 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target);
    this.fog = new THREE.Fog('#cfe8fb', 160, 1500);
    scene.fog = this.fog;
    this.sunDir = new THREE.Vector3();
    this.night = 0;
    this.tmp = { zen: new THREE.Color(), hor: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color() };
  }
  sample(t) {
    let a = KC[0], b = KC[1];
    for (let i = 0; i < KC.length - 1; i++) if (t >= KC[i].t && t <= KC[i + 1].t) { a = KC[i]; b = KC[i + 1]; break; }
    const k = smoothstep(0, 1, (t - a.t) / (b.t - a.t || 1));
    const o = this.tmp;
    o.zen.copy(a.zen).lerp(b.zen, k); o.hor.copy(a.hor).lerp(b.hor, k); o.sun.copy(a.sun).lerp(b.sun, k);
    o.hs.copy(a.hs).lerp(b.hs, k); o.hg.copy(a.hg).lerp(b.hg, k);
    o.si = lerp(a.si, b.si, k); o.hi = lerp(a.hi, b.hi, k);
    return o;
  }
  update(dt, focus, elapsed, frozen) {
    if (!frozen) this.time = (this.time + dt * this.speed) % 24;
    const t = this.time;
    // Sol: sale por el este (+x) a las 6, pone por el oeste a las 19
    const dayF = (t - 6.2) / (19.4 - 6.2);
    const ang = dayF * Math.PI;
    const elev = Math.sin(ang);
    this.sunDir.set(Math.cos(ang), Math.max(elev, -0.3) * 0.95 + 0.05, -0.35).normalize();
    const isNight = t < 6 || t > 19.6;
    this.night = 1 - smoothstep(-0.12, 0.1, elev);
    const s = this.sample(t);
    this.uniforms.uZen.value.copy(s.zen); this.uniforms.uHor.value.copy(s.hor);
    this.uniforms.uSunDir.value.copy(this.sunDir); this.uniforms.uSunCol.value.copy(s.sun);
    this.uniforms.uTime.value = elapsed; this.uniforms.uNight.value = this.night;
    this.fog.color.copy(s.hor).lerp(s.zen, 0.12);
    this.hemi.color.copy(s.hs); this.hemi.groundColor.copy(s.hg); this.hemi.intensity = s.hi * 1.15;
    // Luz direccional: sol o luna
    const lightDir = this.night > 0.5 ? new THREE.Vector3(-this.sunDir.x, Math.max(0.35, -this.sunDir.y), -this.sunDir.z).normalize() : this.sunDir;
    this.sun.color.copy(s.sun); this.sun.intensity = s.si;
    const snap = 2;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    this.sun.position.set(fx + lightDir.x * 150, focus.y + lightDir.y * 150, fz + lightDir.z * 150);
    this.sun.target.position.set(fx, focus.y, fz);
    this.dome.position.set(focus.x, 0, focus.z);
    return { night: this.night, isNight };
  }
  clock() {
    const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
