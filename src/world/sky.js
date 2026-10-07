import * as THREE from 'three';
import { lerp, smoothstep } from '../util/math.js';
import { groundHeight } from './heightfield.js';

// texturas pintadas a mano en un lienzo: la luna con sus mares y su fase de hoy, su halo y niebla suave
// la fase de la luna del día de hoy (0 = nueva, 0,5 = llena), contada desde una luna nueva conocida (6-1-2000)
export function moonPhase(date = new Date()) { const syn = 29.530588853, d = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5; return ((d / syn) % 1 + 1) % 1; }
// la luna pintada: disco con oscurecimiento del borde, los mares en su sitio (Lluvias, Serenidad, Tranquilidad, Crisis,
// Fecundidad, Nubes y el gran Océano de las Tormentas), cráteres con su luz y los rayos de Tycho; la parte en sombra
// según la fase, con la luz cenicienta (la Tierra la ilumina un poco)
export function moonTex(phase = moonPhase()) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), R = N * 0.44, C = N / 2;
  let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.save(); g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.clip();
  const base = g.createRadialGradient(C - R * 0.2, C - R * 0.22, R * 0.05, C, C, R);
  base.addColorStop(0, '#fbf8ee'); base.addColorStop(0.7, '#ece6d4'); base.addColorStop(1, '#bdb6a2');
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  // mares: manchas grises de borde suave, en su sitio aproximado (vista desde el hemisferio norte)
  const MARIA = [[-0.38, -0.32, 0.27], [0.12, -0.38, 0.17], [0.28, -0.1, 0.19], [0.62, -0.22, 0.11], [0.5, 0.18, 0.15], [-0.15, 0.32, 0.15], [-0.62, -0.02, 0.3], [-0.5, 0.42, 0.12], [0.02, -0.02, 0.1], [-0.08, -0.6, 0.12]];
  for (const [x, y, r] of MARIA) for (let k = 0; k < 46; k++) {
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r * 0.85, rr = r * (0.22 + rnd() * 0.35), px = C + (x + Math.cos(a) * d) * R, py = C + (y + Math.sin(a) * d) * R;
    const gr = g.createRadialGradient(px, py, 0, px, py, rr * R); gr.addColorStop(0, 'rgba(124,122,116,0.13)'); gr.addColorStop(1, 'rgba(118,116,112,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, rr * R, 0, 7); g.fill();
  }
  // cráteres: pequeños y muchos, con el borde iluminado arriba a la izquierda y la sombra abajo
  for (let i = 0; i < 200; i++) {
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R * 0.97, x = C + Math.cos(a) * d, y = C + Math.sin(a) * d, r = 1 + rnd() * rnd() * rnd() * 16;
    const fore = 1 - (d / R) ** 2;   // cerca del borde se ven de lado (aplastados)
    g.save(); g.translate(x, y); g.rotate(a); g.scale(Math.max(0.35, Math.sqrt(fore)), 1);
    g.fillStyle = 'rgba(105,100,92,0.2)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,248,0.38)'; g.lineWidth = Math.max(0.6, r * 0.2); g.beginPath(); g.arc(0, 0, r, 3.6, 5.4); g.stroke();
    g.restore();
  }
  // Tycho y sus rayos (abajo), Copérnico (izquierda)
  const ray = (cx, cy, n, L) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, l = L * (0.4 + rnd() * 0.6); g.strokeStyle = 'rgba(255,253,240,0.16)'; g.lineWidth = 1.5 + rnd() * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); } g.fillStyle = 'rgba(255,255,250,0.85)'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill(); };
  ray(C - R * 0.12, C + R * 0.7, 22, R * 0.9); ray(C - R * 0.36, C - R * 0.02, 12, R * 0.35);
  // la fase: la parte de noche, en sombra (con un poco de luz cenicienta), con el terminador curvo
  const ill = phase, k = Math.cos(ill * 2 * Math.PI);   // 1 nueva, -1 llena
  if (Math.abs(ill - 0.5) < 0.485) {
    g.fillStyle = 'rgba(14,20,40,0.86)'; g.beginPath();
    const waxing = ill < 0.5;   // creciente: iluminada a la derecha (hemisferio norte)
    // medio disco oscuro + elipse del terminador
    if (waxing) { g.arc(C, C, R + 2, Math.PI / 2, Math.PI * 1.5); g.ellipse(C, C, Math.abs(k) * (R + 2), R + 2, 0, Math.PI * 1.5, Math.PI / 2, k < 0); }
    else { g.arc(C, C, R + 2, -Math.PI / 2, Math.PI / 2); g.ellipse(C, C, Math.abs(k) * (R + 2), R + 2, 0, Math.PI / 2, Math.PI * 1.5, k < 0); }
    g.filter = 'blur(3px)'; g.fill(); g.filter = 'none';
  }
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function moonGlowTex() {
  // halo en dos capas: un resplandor cercano y una aureola amplia y tenue
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(225,232,255,0.6)'); r.addColorStop(0.12, 'rgba(210,222,255,0.32)'); r.addColorStop(0.35, 'rgba(190,205,250,0.1)'); r.addColorStop(1, 'rgba(190,205,250,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mistTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 7; i++) { const x = 30 + Math.random() * 68, y = 44 + Math.random() * 40, rr = 26 + Math.random() * 26; const r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Paleta por hora del día: [hora, cenit, horizonte, sol color, sol intensidad, hemi cielo, hemi suelo, hemi int]
const KEYS = [
  // noche de luna: azulada y misteriosa, pero con luz suficiente para ver el camino
  [0, '#0d1638', '#26365e', '#a8bcf4', 1.05, '#6a80c8', '#34405e', 1.2],
  [5, '#1b2450', '#4a4a70', '#9fb0ea', 0.9, '#5a6aa8', '#2a3048', 1.05],
  [6.3, '#4d6fb0', '#f3a978', '#ffb27a', 1.2, '#9fb4dc', '#5d5040', 0.55],
  [8, '#3f8fe0', '#bfe0f7', '#ffe3bd', 2.6, '#bfdcff', '#6d7a4a', 0.8],
  [12, '#2f7fdc', '#cfe8fb', '#fff4e2', 3.1, '#c9e2ff', '#72804f', 0.9],
  [16.5, '#3a86dc', '#d2e6f6', '#ffe6c2', 2.8, '#c4dcff', '#6f7b4c', 0.85],
  [18.4, '#5f7cc4', '#ffc493', '#ffb277', 2.2, '#c7c6e2', '#6d6048', 0.8],
  [19.3, '#3d4488', '#e0906f', '#ff9a66', 1.0, '#8f8fbf', '#3f3a3a', 0.62],
  [20.1, '#1c2458', '#6c4d6a', '#9aa4e0', 0.6, '#5a64a0', '#2a2c3e', 0.8],
  [21, '#0f1a40', '#2a3a64', '#a8bcf4', 1.05, '#6a80c8', '#34405e', 1.2],
  [24, '#0d1638', '#26365e', '#a8bcf4', 1.05, '#6a80c8', '#34405e', 1.2],
];
const KC = KEYS.map(k => ({ t: k[0], zen: new THREE.Color(k[1]), hor: new THREE.Color(k[2]), sun: new THREE.Color(k[3]), si: k[4], hs: new THREE.Color(k[5]), hg: new THREE.Color(k[6]), hi: k[7] }));

const FLOOD_SKY = new THREE.Color('#d8e4fb'), FLOOD_GND = new THREE.Color('#857f72'), FLOOD_SUN = new THREE.Color('#fff3df'), FLOOD_DIR = new THREE.Vector3(0.25, 1, 0.35).normalize();
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
      // tormenta (weather.js): cielo cubierto de nubes negras y el relámpago que las ilumina hacia donde cae el rayo
      uStorm: { value: 0 }, uFlash: { value: 0 }, uFlashDir: { value: new THREE.Vector3(0, 1, 0) },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false, defines: quality === 'low' ? { LOWQ: 1 } : {},   // móvil: nubes con menos capas de ruido
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
uniform vec3 uZen, uHor, uSunDir, uSunCol, uFlashDir; uniform float uTime, uNight, uCloud, uStorm, uFlash; varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
#ifdef LOWQ
#define OCT 3
#else
#define OCT 5
#endif
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<OCT;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
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
  // (la luna es su propio disco, con su fase: ver moonTex)
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
  // tormenta: el cielo que asoma entre las nubes también se apaga; el relámpago lo aclara
  float fd = max(dot(d, uFlashDir), 0.0);
  col = mix(col, vec3(0.16, 0.18, 0.22), uStorm * 0.75);
  col += vec3(0.45, 0.5, 0.65) * uFlash * (0.15 + 0.8 * pow(fd, 4.0));
  // nubes
  if (h > 0.0) {
    vec2 cp = d.xz / (d.y + 0.12) * 1.3 + vec2(uTime * 0.004, uTime * 0.0015);
    float n = fbm(cp * 1.4);
    float c = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.28, n);
#ifdef LOWQ
    float shade = n - (vnoise(cp * 1.4 + vec2(0.05, 0.08)) - 0.5) * 0.12;   // móvil: la sombra de la nube con un solo ruido
#else
    float shade = fbm(cp * 1.4 + vec2(0.05, 0.08));
#endif
    vec3 cc = mix(vec3(1.0), uHor * 0.9 + 0.1, 0.35) * (0.8 + 0.35 * (n - shade) * 3.0);
    cc = mix(cc, uSunCol * 1.2, pow(sd, 6.0) * 0.5);
    cc *= mix(1.0, 0.35, uNight);
    // nubes de tormenta: casi negras, con relieve (los bordes algo más claros) y encendidas por dentro con el rayo
    vec3 dark = vec3(0.11, 0.12, 0.15) * (0.7 + 0.9 * (n - shade) * 3.0 + 0.4 * n) * mix(1.0, 0.5, uNight);
    cc = mix(cc, dark, uStorm);
    cc += vec3(0.75, 0.8, 1.0) * uFlash * (0.2 + 1.7 * pow(fd, 6.0)) * (0.5 + n);
    col = mix(col, cc, c * smoothstep(0.0, 0.18, h) * mix(0.92, 1.0, uStorm));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
    });
    this.dome = new THREE.Mesh(geo, this.mat);
    this.dome.frustumCulled = false;
    // el último de lo opaco: su profundidad es la del fondo (xyww), así que solo se calcula en los píxeles donde se ve
    // cielo; dibujado el primero, sombreaba la pantalla entera con sus nubes y luego el terreno y el pueblo lo tapaban
    this.dome.renderOrder = 1000;
    scene.add(this.dome);

    this.hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.8);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffffff', 3);
    this.sun.castShadow = true;
    const sm = quality === 'low' ? 1024 : 2048;   // 3072 en alta costaba mucho y apenas se notaba
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
    // luna visible (en la dirección de su luz) y niebla baja que se arrastra entre prados y calles de noche
    this.moonPhase = moonPhase();
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(this.moonPhase), transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    this.moon.scale.setScalar(115); this.moon.renderOrder = -8; scene.add(this.moon);
    // halo suave alrededor de la luna (detrás del disco)
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonGlowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0, blending: THREE.AdditiveBlending }));
    this.moonGlow.scale.setScalar(620); this.moonGlow.renderOrder = -9; scene.add(this.moonGlow);
    const mt = mistTex();
    this.mist = [];
    for (let i = 0; i < (quality === 'low' ? 10 : 18); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: '#c8d4ea', transparent: true, depthWrite: false, opacity: 0 }));
      const a = i / 18 * Math.PI * 2 * 3.1, r = 10 + (i * 37 % 60);
      s.userData.off = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r); s.scale.set(16 + (i % 4) * 5, 4 + (i % 3), 1);
      scene.add(s); this.mist.push(s);
    }
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
  // los focos del frontón: durante el partido la luz es siempre la misma, de día y de noche (la hora no cambia la cancha)
  floodK() { return this.flood || 0; }
  /** Luz de los focos: se aplica la última (después de la lluvia y la tormenta, que bajan la luz), así de noche la
   *  cancha se ve siempre bien. */
  applyFlood() {
    const fk = this.floodK(); if (fk <= 0) return;
    this.hemi.color.lerp(FLOOD_SKY, fk); this.hemi.groundColor.lerp(FLOOD_GND, fk); this.hemi.intensity += (1.3 - this.hemi.intensity) * fk;
    this.sun.color.lerp(FLOOD_SUN, fk); this.sun.intensity += (2.7 - this.sun.intensity) * fk;
    this.sun.shadow.intensity += (1 - this.sun.shadow.intensity) * fk;
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
    let lightDir = this.night > 0.5 ? new THREE.Vector3(-this.sunDir.x, Math.max(0.35, -this.sunDir.y), -this.sunDir.z).normalize() : this.sunDir;
    this.sun.color.copy(s.sun); this.sun.intensity = s.si;
    // focos (un partido de pelota de noche): la luz de la luna y la del cielo suben a la de unos focos blancos desde
    // arriba; sin luces nuevas (en el móvil, añadir luces rehace todos los sombreadores y da un tirón). Antes, de noche,
    // no se veía nada en el frontón
    const fk = this.floodK();
    if (fk > 0) lightDir = lightDir.clone().lerp(FLOOD_DIR, fk).normalize();   // (la intensidad, en applyFlood: después de la lluvia)
    // sombras: nítidas al sol; con la luna, más suaves y claras (la noche no tiene sombras negras)
    this.sun.shadow.intensity = 1 - 0.45 * this.night;
    const snap = 2;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    this.sun.position.set(fx + lightDir.x * 150, focus.y + lightDir.y * 150, fz + lightDir.z * 150);
    this.sun.target.position.set(fx, focus.y, fz);
    this.dome.position.set(focus.x, focus.y > 600 ? focus.y : 0, focus.z);   // (en el Labrit, muy alto, el cielo va con él)
    // la luna: sale baja y anaranjada por el horizonte y, alta, blanca; el halo, más fuerte cuanto más llena
    const md = new THREE.Vector3(-this.sunDir.x, Math.max(0.16, -this.sunDir.y), -this.sunDir.z).normalize();
    this.moon.position.set(focus.x + md.x * 2000, focus.y + md.y * 2000, focus.z + md.z * 2000);
    const low = 1 - smoothstep(0.16, 0.45, md.y), lit = 0.5 - 0.5 * Math.cos(this.moonPhase * Math.PI * 2);
    this.moon.material.color.setRGB(1, 1 - 0.12 * low, 1 - 0.3 * low);
    this.moon.material.opacity = this.night; this.moon.visible = this.night > 0.02;
    this.moonGlow.position.copy(this.moon.position); this.moonGlow.material.opacity = this.night * (0.3 + 0.6 * lit); this.moonGlow.visible = this.moon.visible;
    this.moonGlow.material.color.setRGB(1, 1 - 0.1 * low, 1 - 0.25 * low);
    const mo = this.night * 0.3;
    for (const s of this.mist) {
      s.visible = mo > 0.01; if (!s.visible) continue;
      const o = s.userData.off, drift = (elapsed * 0.6) % 140;
      let x = focus.x + o.x + drift, z = focus.z + o.y;
      x = focus.x + (((x - focus.x) + 70) % 140 + 140) % 140 - 70;          // la niebla rodea al jugador aunque se mueva
      s.position.set(x, groundHeight(x, z) + 0.9, z); s.material.opacity = mo;
    }
    return { night: this.night, isNight };
  }
  clock() {
    const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
