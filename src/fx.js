// Efectos: partículas, cascada, humo de chimeneas, luces nocturnas, marcadores y objetos coleccionables
import * as THREE from 'three';
import { glowTexture } from './actors/animals.js';
import { terrainHeight } from './world/heightfield.js';
import { clamp } from './util/math.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const GLOW = glowTexture();

export class Particles {
  constructor(scene, max = 600) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: GLOW }, scale: { value: innerHeight / 2 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float scale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a < 0.02) discard; gl_FragColor = vec4(vC * t.a, t.a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.normMat = this.mat.clone(); this.normMat.blending = THREE.NormalBlending;
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    scene.add(this.points);
    this.list = [];
    // confeti (no aditivo) en otro sistema
    const g2 = g.clone();
    this.cPos = new Float32Array(max * 3); this.cCol = new Float32Array(max * 3); this.cSize = new Float32Array(max);
    g2.setAttribute('position', new THREE.BufferAttribute(this.cPos, 3)); g2.setAttribute('color', new THREE.BufferAttribute(this.cCol, 3)); g2.setAttribute('size', new THREE.BufferAttribute(this.cSize, 1));
    const sq = document.createElement('canvas'); sq.width = sq.height = 16; const sg = sq.getContext('2d'); sg.fillStyle = '#fff'; sg.fillRect(3, 3, 10, 10);
    this.confMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: new THREE.CanvasTexture(sq) }, scale: { value: innerHeight / 2 } },
      vertexShader: this.mat.vertexShader, fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a < 0.5) discard; gl_FragColor = vec4(vC, 1.0); }`,
    });
    this.conf = new THREE.Points(g2, this.confMat); this.conf.frustumCulled = false; scene.add(this.conf);
    this.cList = [];
  }
  emit(p, o = {}) {
    const n = o.n || 10;
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const sp = o.speed ?? 2;
      const c = new THREE.Color(Array.isArray(o.color) ? o.color[i % o.color.length] : (o.color || '#ffffff'));
      this.list.push({ x: p.x + (Math.random() - 0.5) * (o.spread ?? 0.3), y: p.y + (Math.random() - 0.5) * (o.spread ?? 0.3), z: p.z + (Math.random() - 0.5) * (o.spread ?? 0.3),
        vx: (Math.random() - 0.5) * sp, vy: (o.up ?? 1) * (0.5 + Math.random()) * sp, vz: (Math.random() - 0.5) * sp,
        life: o.life ?? 1, max: o.life ?? 1, size: o.size ?? 0.3, g: o.gravity ?? 3, c, drag: o.drag ?? 0.5 });
    }
  }
  confetti(p, n = 120) {
    const cols = ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a', '#b34fc4', '#ff8c42'];
    for (let i = 0; i < n; i++) {
      if (this.cList.length >= this.max) this.cList.shift();
      const a = Math.random() * 6.28, s = 2 + Math.random() * 4;
      this.cList.push({ x: p.x, y: p.y + 1.5, z: p.z, vx: Math.cos(a) * s, vy: 5 + Math.random() * 5, vz: Math.sin(a) * s, life: 3 + Math.random(), c: new THREE.Color(cols[i % cols.length]), size: 0.12 + Math.random() * 0.08, ph: Math.random() * 6 });
    }
  }
  update(dt) {
    // (sin partículas vivas, nada que mover ni que subir a la tarjeta gráfica: la mayor parte del tiempo)
    if (!this.list.length && !this.cList.length) { if (this.idle) return; this.idle = true; } else this.idle = false;
    this.mat.uniforms.scale.value = this.confMat.uniforms.scale.value = innerHeight / 2;
    const P = this.pos, C = this.col, S = this.size;
    let k = 0;
    for (const p of this.list) {
      if ((p.life -= dt) <= 0) continue;
      p.vy -= p.g * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vz *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const a = clamp(p.life / p.max, 0, 1), i = k * 3;
      P[i] = p.x; P[i + 1] = p.y; P[i + 2] = p.z; C[i] = p.c.r * a; C[i + 1] = p.c.g * a; C[i + 2] = p.c.b * a; S[k] = p.size * (0.5 + a * 0.5);
      this.list[k++] = p;
    }
    this.list.length = k;
    S.fill(0, k);
    const g = this.points.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
    g.setDrawRange(0, Math.max(k, 1));
    const CP = this.cPos, CC = this.cCol, CS = this.cSize, drag = Math.exp(-1.5 * dt);
    let j = 0;
    for (const p of this.cList) {
      if ((p.life -= dt) <= 0) continue;
      p.vy -= 6 * dt; p.vx *= drag; p.vz *= drag; if (p.vy < -1.5) p.vy = -1.5;
      p.x += (p.vx + Math.sin(p.life * 5 + p.ph) * 0.6) * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const i = j * 3;
      CP[i] = p.x; CP[i + 1] = p.y; CP[i + 2] = p.z; CC[i] = p.c.r; CC[i + 1] = p.c.g; CC[i + 2] = p.c.b; CS[j] = p.size * (0.6 + Math.abs(Math.sin(p.life * 8 + p.ph)) * 0.4);
      this.cList[j++] = p;
    }
    this.cList.length = j;
    const g2 = this.conf.geometry; g2.attributes.position.needsUpdate = g2.attributes.color.needsUpdate = g2.attributes.size.needsUpdate = true;
    g2.setDrawRange(0, Math.max(j, 1));
    this.conf.visible = j > 0;
  }
}

// ---------- Cascada ----------
export class Waterfall {
  constructor(scene, info, particles) {
    const h = info.top - info.bottom;
    const g = new THREE.PlaneGeometry(4.2, h, 8, 16);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.y * 6.0) * 0.15 + (1.0 - uv.y) * (1.0 - uv.y) * 1.4; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ vec2 p = vec2(vUv.x * 8.0, vUv.y * 3.0 + uTime * 2.2);
          float s = n(p) * 0.6 + n(p * 2.3 + 4.0) * 0.4;
          float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          vec3 c = mix(vec3(0.55, 0.78, 0.85), vec3(1.0), smoothstep(0.45, 0.8, s));
          gl_FragColor = vec4(c, edge * (0.55 + s * 0.4)); }`,
    });
    const m = new THREE.Mesh(g, this.mat);
    m.position.set(info.x, info.bottom + h / 2, info.z);
    m.rotation.y = info.face;
    scene.add(m);
    this.base = new THREE.Vector3(info.x + Math.sin(info.face) * 1.4, info.bottom + 0.2, info.z + Math.cos(info.face) * 1.4);
    this.p = particles; this.t = 0;
  }
  update(dt, elapsed, near) {
    this.mat.uniforms.uTime.value = elapsed;
    this.t += dt;
    if (near && this.t > 0.05) { this.t = 0; this.p.emit(this.base, { n: 3, color: '#dff4ff', speed: 2.5, size: 0.9, life: 1.2, gravity: 1, spread: 2.5, up: 0.6 }); }
  }
}

// ---------- Humo de chimeneas (un solo sistema de puntos) ----------
export class Smoke {
  constructor(scene, houses) {
    this.spots = houses.filter((_, i) => i % 3 === 0).slice(0, 14).map(h => ({ x: h.x, z: h.z, y: h.top ?? terrainHeight(h.x, h.z) + 11 }));
    const n = this.spots.length * 5;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.alpha = new Float32Array(n); this.size = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: GLOW }, scale: { value: innerHeight / 2 }, color: { value: new THREE.Color('#d8d8d8') } },
      vertexShader: `attribute float size; attribute float alpha; varying float vA; uniform float scale;
        void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 color; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA); }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    scene.add(this.points);
    this.t = 0;
  }
  update(dt, wind = 1) {
    this.t += dt; this.mat.uniforms.scale.value = innerHeight / 2;
    let k = 0;
    for (const s of this.spots) for (let i = 0; i < 5; i++, k++) {
      const u = ((this.t + i / 5 * 4) % 4) / 4;
      this.pos[k * 3] = s.x + u * 2.5 * wind; this.pos[k * 3 + 1] = s.y + u * 5; this.pos[k * 3 + 2] = s.z + u * 1.2;
      this.size[k] = 1.6 + u * 6; this.alpha[k] = 0.32 * Math.sin(u * Math.PI);
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = g.attributes.alpha.needsUpdate = g.attributes.size.needsUpdate = true;
  }
}

// ---------- Luces nocturnas de farolas y ventanas ----------
// Charco de luz de una farola en el suelo: blanco en el centro que se apaga hacia el borde (el color lo pone el material)
function poolTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.75)'); r.addColorStop(0.6, 'rgba(255,255,255,.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class NightLights {
  constructor(scene, lamps, mats) {
    this.mats = mats;
    // de noche, la luz de cada farola en el suelo: un disco que sigue el relieve, con un degradado cálido que se suma al
    // color del empedrado (antes el suelo bajo las farolas quedaba tan azul como el resto). Todas en una sola malla
    if (lamps.length) {
      const R = 4.4, n = 8, geos = lamps.map(l => {
        const pg = new THREE.PlaneGeometry(R * 2, R * 2, n, n); pg.rotateX(-Math.PI / 2);
        const pp = pg.attributes.position;
        for (let i = 0; i < pp.count; i++) { const x = l.x + pp.getX(i), z = l.z + pp.getZ(i); pp.setXYZ(i, x, terrainHeight(x, z) + 0.05, z); }
        return pg;
      });
      this.poolMat = new THREE.MeshBasicMaterial({ map: poolTexture(), color: '#ffae58', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      this.pools = new THREE.Mesh(mergeGeometries(geos), this.poolMat); geos.forEach(q => q.dispose());
      this.pools.renderOrder = 1; this.pools.visible = false; this.pools.name = 'charcos de luz';
      scene.add(this.pools);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(lamps.flatMap(l => [l.x, l.y, l.z]), 3));
    this.mat = new THREE.PointsMaterial({ map: GLOW, color: '#ffc46b', size: 3.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, sizeAttenuation: true });
    this.points = new THREE.Points(g, this.mat);
    scene.add(this.points);
    // (sin luces reales: cada luz puntual encarece el dibujo de todo lo que se ve, también de día con la luz apagada. Las
    // farolas se ven encendidas por su brillo, su cristal y el charco de luz)
    this.lamps = lamps;
  }
  update(night, player) {
    const on = clamp((night - 0.3) * 2.5, 0, 1);
    this.mat.opacity = on * 0.85; this.points.visible = on > 0.01;
    if (this.pools) { this.poolMat.opacity = on * 0.5; this.pools.visible = on > 0.01; }
    this.mats.lamp.emissiveIntensity = on * 3;
    this.mats.glass.emissiveIntensity = on * 0.55;
    // otros materiales que se encienden de noche (la fachada de El Sadar): [de día, de noche]
    for (const m of this.mats.nightExtra || []) m.emissiveIntensity = m.userData.night[0] + (m.userData.night[1] - m.userData.night[0]) * on;
    // cuánto ilumina la farola más cercana al jugador (para la luz propia de los personajes: bajo la farola, cálida)
    let d2 = Infinity; for (const l of this.lamps) d2 = Math.min(d2, (l.x - player.pos.x) ** 2 + (l.z - player.pos.z) ** 2);
    this.lampK = d2 < Infinity ? on * Math.max(0, 1 - Math.sqrt(d2) / 8) ** 2 : 0;
  }
}

// ---------- Marcador de objetivo ----------
export class Beacon {
  constructor(scene) {
    // haz del objetivo: una columna fina y suave, más clara en el centro que en los bordes (sin las rayas que subían
    // parpadeando), que se apaga hacia arriba y aparece o se va poco a poco con la distancia (antes saltaba a los 12 m)
    const g = new THREE.CylinderGeometry(0.35, 0.35, 40, 16, 1, true);
    g.translate(0, 20, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffd34d') }, uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      vertexShader: `varying vec2 vUv; varying float vRim; void main(){ vUv = uv; vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vRim = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime, uK; uniform vec3 uColor; varying vec2 vUv; varying float vRim; void main(){ float a = pow(1.0 - vUv.y, 1.6) * 0.5 * vRim * (0.9 + 0.1 * sin(uTime * 1.6)); a *= smoothstep(0.0, 0.04, vUv.y) * uK; gl_FragColor = vec4(uColor * a, a); }`,
    });
    this.k = 0;
    this.beam = new THREE.Mesh(g, this.mat); this.beam.visible = false; this.beam.frustumCulled = false;
    scene.add(this.beam);
    // flecha flotante
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.5, 0.6); s.lineTo(0.2, 0.6); s.lineTo(0.2, 1.1); s.lineTo(-0.2, 1.1); s.lineTo(-0.2, 0.6); s.lineTo(-0.5, 0.6); s.closePath();
    const ag = new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: false }); ag.translate(0, 0, -0.075);
    this.arrow = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: '#ffd34d' }));
    this.arrow.visible = false; scene.add(this.arrow);
  }
  set(target, color = '#ffd34d') {
    this.target = target;
    this.mat.uniforms.uColor.value.set(color); this.arrow.material.color.set(color);
  }
  // hide: en las escenas (cinemáticas, diálogos, partidos) no se ve
  update(elapsed, player, hide = false, dt = 1 / 60) {
    const t = this.target;
    this.mat.uniforms.uTime.value = elapsed;
    // (off: durante un partido el haz del objetivo no se ve; era una columna de luz plana sobre el frontón)
    if (!t || this.off || hide) { this.k = 0; this.mat.uniforms.uK.value = 0; this.beam.visible = this.arrow.visible = false; return; }
    const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z);
    const y = t.y ?? terrainHeight(t.x, t.z);
    const want = Math.min(1, Math.max(0, (d - 14) / 16));   // de 14 a 30 m aparece poco a poco
    this.k += (want - this.k) * Math.min(1, dt * 3); this.mat.uniforms.uK.value = this.k;
    this.beam.visible = this.k > 0.01;
    this.beam.position.set(t.x, y, t.z);
    this.beam.scale.set(1 + d / 120, 1, 1 + d / 120);
    this.arrow.visible = d <= 25 && !t.noArrow;
    this.arrow.position.set(t.x, y + (t.h ?? 2.6) + Math.sin(elapsed * 3) * 0.2, t.z);
    this.arrow.rotation.y = elapsed * 2;
  }
}

// ---------- Objetos coleccionables ----------
export function makeEguzkilore() {
  // cardo del sol (Carlina acaulis): flor plana con brácteas plateadas y centro dorado, en una sola malla
  const parts = [];
  const col = (g, c) => { g = g.index ? g.toNonIndexed() : g; const cc = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
  const petals = new THREE.CircleGeometry(0.34, 22);
  const pos = petals.attributes.position;
  for (let i = 1; i < pos.count; i++) { const a = Math.atan2(pos.getY(i), pos.getX(i)); const r = 1 + 0.25 * Math.sin(a * 11); pos.setXY(i, pos.getX(i) * r, pos.getY(i) * r); }
  petals.rotateX(-Math.PI / 2);
  parts.push(col(petals, '#f4efe0'));
  const back = petals.clone(); back.rotateX(Math.PI); back.translate(0, -0.005, 0); parts.push(col(back, '#d9d2bf'));
  const center = new THREE.SphereGeometry(0.15, 12, 6); center.scale(1, 0.4, 1); center.translate(0, 0.02, 0);
  parts.push(col(center, '#e0a53a'));
  for (let i = 0; i < 14; i++) { const sp = new THREE.ConeGeometry(0.02, 0.22, 3); const a = i / 14 * 6.28; sp.rotateZ(Math.PI / 2); sp.rotateY(-a); sp.translate(Math.cos(a) * 0.36, -0.02, Math.sin(a) * 0.36); parts.push(col(sp, '#6f7a4a')); }
  const g = mergeGeometries(parts);
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, EGUZ_MAT));
  const glow = new THREE.Sprite(EGUZ_GLOW); glow.scale.setScalar(1.6); glow.position.y = 0.2; grp.add(glow);
  grp.userData.glow = glow;
  return grp;
}
const EGUZ_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: new THREE.Color('#5a4a20'), emissiveIntensity: 0.4 });
const EGUZ_GLOW = new THREE.SpriteMaterial({ map: GLOW, color: '#ffe38a', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
export function makeComb() {
  const grp = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.9, roughness: 0.2, emissive: new THREE.Color('#8a5a00'), emissiveIntensity: 0.6 });
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.04), gold));
  for (let i = 0; i < 10; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), gold); t.position.set(-0.18 + i * 0.04, -0.11, 0); grp.add(t); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#ffd84a', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(1.4); grp.add(glow);
  return grp;
}
export function makeLitter(kind) {
  const grp = new THREE.Group();
  if (kind === 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10), new THREE.MeshStandardMaterial({ color: '#c8322f', metalness: 0.7, roughness: 0.3 })); m.rotation.z = Math.PI / 2; m.position.y = 0.06; grp.add(m); }
  else if (kind === 1) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.32, 10), new THREE.MeshStandardMaterial({ color: '#8fd3e8', transparent: true, opacity: 0.7, roughness: 0.1 })); m.rotation.z = Math.PI / 2 - 0.2; m.position.y = 0.07; grp.add(m); }
  else { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: '#eeeeee', roughness: 0.9, flatShading: true })); m.scale.y = 0.6; m.position.y = 0.08; grp.add(m); }
  return grp;
}
