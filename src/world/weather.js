// Tiempo: lluvia o nieve en algunos pueblos (nieve en el Pirineo, lluvia más a menudo en el norte húmedo), con
// las gotas y los copos animados en la tarjeta gráfica alrededor de la cámara, el cielo más gris y, cuando nieva,
// los tejados, el suelo y las copas de los árboles blanqueando poco a poco.
import * as THREE from 'three';

export const SNOW = { value: 0 };   // 0…1: cuánta nieve cubre lo que mira hacia arriba (lo comparten los materiales)

/** Añade nieve a un material: las caras que miran al cielo se vuelven blancas según SNOW.
 *  k: cuánta nieve como mucho; lo/hi: desde qué inclinación empieza a cuajar (las copas de los árboles, solo arriba). */
export function snowable(m, k = 1, lo = 0.32, hi = 0.72) {
  if (!m || m.userData.snowable) return m;
  m.userData.snowable = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) {
    prev?.call(this, sh, r);
    sh.uniforms.uSnow = SNOW;
    // en los objetos repetidos (árboles, matas) la orientación de cada copia cuenta para saber qué mira arriba
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowN;')
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
#ifdef USE_INSTANCING
vSnowN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
#else
vSnowN = normalize(mat3(modelMatrix) * objectNormal);
#endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSnow; varying vec3 vSnowN;')
      .replace('#include <roughnessmap_fragment>', `{ float up = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, vSnowN.y) * uSnow * ${k.toFixed(2)};
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.91, 0.96) * (0.92 + 0.08 * diffuseColor.r), up); }
#include <roughnessmap_fragment>`);
  };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|snow' + k + ',' + lo + ',' + hi; };
  m.needsUpdate = true;
  return m;
}

// gotas y copos: posiciones fijas en una caja que la tarjeta gráfica hace caer y envuelve alrededor de la cámara
function precip(kind, n) {
  const W = kind === 'rain' ? 46 : 54, H = 26;
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * (kind === 'rain' ? 6 : 3)), seed = new Float32Array(n * (kind === 'rain' ? 2 : 1));
  for (let i = 0; i < n; i++) {
    const x = Math.random() * W, y = Math.random() * H, z = Math.random() * W, s = Math.random();
    if (kind === 'rain') { pos.set([x, y, z, x, y, z], i * 6); seed[i * 2] = s; seed[i * 2 + 1] = s; }
    else { pos.set([x, y, z], i * 3); seed[i] = s; }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  // uAmt: cuánto llueve o nieva ahora (0…1); al amainar quedan menos gotas en vez de gotas más transparentes
  const U = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector2(1.2, 0.4) }, uAmt: { value: 1 } };
  const vert = (body) => `uniform float uTime; uniform vec3 uCam; uniform vec2 uWind; uniform float uAmt; attribute float aSeed;
${body}`;
  const wrap = `
  float W = ${W.toFixed(1)}, H = ${H.toFixed(1)};
  vec3 p = position;
  p.y = mod(p.y - uTime * SPEED * (0.8 + 0.4 * aSeed), H);
  p.x += uWind.x * (H - p.y) * DRIFT + sin(uTime * 0.7 + aSeed * 30.0) * WOBBLE;
  p.z += uWind.y * (H - p.y) * DRIFT + cos(uTime * 0.6 + aSeed * 20.0) * WOBBLE;
  p.x = mod(p.x - uCam.x, W) - W * 0.5 + uCam.x;
  p.z = mod(p.z - uCam.z, W) - W * 0.5 + uCam.z;
  p.y += uCam.y - H * 0.4;`;
  let obj;
  if (kind === 'rain') {
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: false,
      vertexShader: vert(`varying float vA;
void main() {${wrap.replaceAll('SPEED', '17.0').replaceAll('DRIFT', '0.05').replaceAll('WOBBLE', '0.0')}
  if (mod(float(gl_VertexID), 2.0) > 0.5) p += vec3(uWind.x * 0.04, 0.55, uWind.y * 0.04);   // la estela de la gota (corta: lluvia fina)
  vA = (1.0 - smoothstep(14.0, 26.0, distance(p.xz, uCam.xz))) * step(aSeed, uAmt);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`),
      fragmentShader: 'varying float vA; void main() { if (vA < 0.01) discard; gl_FragColor = vec4(0.8, 0.85, 0.92, 0.32 * vA); }' });
    obj = new THREE.LineSegments(geo, mat);
  } else {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    U.tFlake = { value: tex }; U.uScale = { value: 300 };
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: false,
      vertexShader: vert(`uniform float uScale; varying float vA;
void main() {${wrap.replaceAll('SPEED', '1.6').replaceAll('DRIFT', '0.03').replaceAll('WOBBLE', '0.6')}
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * (0.11 + 0.1 * aSeed) / -mv.z;
  vA = (1.0 - smoothstep(16.0, 27.0, distance(p.xz, uCam.xz))) * step(aSeed, uAmt);
  gl_Position = projectionMatrix * mv; }`),
      fragmentShader: 'uniform sampler2D tFlake; varying float vA; void main() { vec4 t = texture2D(tFlake, gl_PointCoord); gl_FragColor = vec4(1.0, 1.0, 1.0, t.a * 0.9 * vA); }' });
    obj = new THREE.Points(geo, mat);
  }
  obj.frustumCulled = false; obj.renderOrder = 5; obj.userData.U = U;
  return obj;
}

/** Elige el tiempo de un pueblo (se puede forzar con ?weather=rain|snow|clear). */
export function pickWeather(def, rnd = Math.random) {
  const q = new URLSearchParams(location.search).get('weather');
  if (q) return q;
  if (def?.special) return 'clear';
  const c = def?.comarca, r = rnd();
  // en el norte nieva a menudo (más en el Pirineo): tejados blancos, niebla baja y copos
  if (c === 'pirineo') return r < 0.7 ? 'snow' : r < 0.8 ? 'rain' : 'clear';
  if (['bidasoa', 'larraun-leitzaldea', 'sakana', 'prepirineo'].includes(c)) return r < 0.42 ? 'snow' : r < 0.62 ? 'rain' : 'clear';
  if (['ribera', 'ribera-alta'].includes(c)) return r < 0.08 ? 'rain' : 'clear';
  return r < 0.2 ? 'rain' : 'clear';
}

// Tormenta: cuando llueve, el cielo se cubre de nubes negras y caen rayos a lo lejos (siempre por delante, donde se
// mira), con el destello que ilumina las nubes y el pueblo y el trueno que llega después (a la velocidad del sonido)
const STORM_ZEN = new THREE.Color('#2a3140'), STORM_HOR = new THREE.Color('#4a525e'), FLASH = new THREE.Color('#dfe8ff');
// el rayo: una línea quebrada desde la nube hasta el suelo, con un par de ramas; se dibuja como una cinta de cara a la
// cámara (núcleo blanco y halo azulado)
function boltGeometry(camPos, top, bottom, width, rnd) {
  const lines = [], main = [top.clone()], N = 16, side = new THREE.Vector3(), seg = new THREE.Vector3(), to = new THREE.Vector3();
  for (let i = 1; i <= N; i++) {
    const k = i / N, p = top.clone().lerp(bottom, k);
    if (i < N) { p.x += (rnd() - 0.5) * 34 * (1 - k * 0.4); p.z += (rnd() - 0.5) * 34 * (1 - k * 0.4); p.y += (rnd() - 0.5) * 8; }
    main.push(p);
  }
  lines.push([main, width]);
  for (let b = 0; b < 2 + Math.floor(rnd() * 2); b++) {   // ramas: salen de la mitad de arriba y se apagan antes de llegar al suelo
    const i0 = 2 + Math.floor(rnd() * N * 0.45), p0 = main[i0], br = [p0.clone()], dir = new THREE.Vector3((rnd() - 0.5) * 2, -1.2, (rnd() - 0.5) * 2).normalize();
    let p = p0.clone(); for (let j = 0; j < 5; j++) { p = p.clone().addScaledVector(dir, 16 + rnd() * 14); p.x += (rnd() - 0.5) * 12; p.z += (rnd() - 0.5) * 12; br.push(p); }
    lines.push([br, width * 0.5]);
  }
  const pos = [];
  for (const [L, w] of lines) for (let i = 0; i < L.length - 1; i++) {
    const a = L[i], b = L[i + 1]; seg.subVectors(b, a); to.subVectors(camPos, a); side.crossVectors(seg, to).normalize().multiplyScalar(w * 0.5);
    const a0 = a.clone().sub(side), a1 = a.clone().add(side), b0 = b.clone().sub(side), b1 = b.clone().add(side);
    pos.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, a0.x, a0.y, a0.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}

export class Weather {
  constructor(scene, kind = 'clear', quality = 'high') {
    this.kind = kind; this.scene = scene; this.t = 0; this.k = 0;
    const n = quality === 'low' ? 0.45 : quality === 'mid' ? 0.7 : 1;
    if (kind === 'rain') { this.fx = precip('rain', Math.round(3200 * n)); scene.add(this.fx); }
    if (kind === 'snow') { this.fx = precip('snow', Math.round(4200 * n)); scene.add(this.fx); }
    SNOW.value = kind === 'snow' ? 0.55 : 0;   // al llegar ya ha nevado: tejados y prados blancos
    this.grey = new THREE.Color(kind === 'snow' ? '#d6dde6' : '#6c757f');
    // la lluvia va a ratos: al llegar llueve, al cabo de un rato escampa y luego vuelve a llover
    this.raining = true; this.phaseT = 50 + Math.random() * 40;
  }
  // cada fotograma, después del cielo: cae la lluvia o la nieve, el cielo se agrisa y la nieve se va posando
  // hold: durante un partido (fútbol o pelota) no se ve caer nada sobre la cancha, con la misma luz
  update(dt, camera, sky, sound, hold = false) {
    if (this.kind === 'clear') return;
    this.t += dt;
    // durante un partido no cae nada sobre la cancha (no se ven gotas ni copos y no hay rayos), pero la luz se queda como
    // estaba y no cambia mientras se juega: antes escampaba de golpe al empezar y la luz del pueblo se aclaraba en un
    // segundo (y al acabar se oscurecía otra vez)
    if (this.kind === 'rain' && !hold && (this.phaseT -= dt) <= 0) { this.raining = !this.raining; this.phaseT = this.raining ? 40 + Math.random() * 50 : 30 + Math.random() * 45; }
    const target = this.raining ? 1 : 0;
    // entra en unos segundos y escampa despacio
    this.k = target > this.k ? Math.min(target, this.k + dt * 0.25) : Math.max(target, this.k - dt * 0.08);
    this.fx.visible = this.k > 0.02 && !hold;
    this.agePrints(dt);
    const U = this.fx.userData.U; U.uTime.value = this.t; U.uCam.value.copy(camera.position); U.uAmt.value = this.kind === 'rain' ? this.k : Math.min(1, this.k * 1.5);
    if (U.uScale) U.uScale.value = innerHeight * 0.55;
    if (this.kind === 'snow') SNOW.value = Math.min(0.92, SNOW.value + dt * 0.05);   // en un rato, todo blanco
    if (sky) {
      const k = this.k * (this.kind === 'rain' ? 0.55 : 0.45);
      sky.fog.color.lerp(this.grey, k);
      if (!this.fogBase) this.fogBase = [sky.fog.near, sky.fog.far];
      sky.fog.near = this.fogBase[0] * (1 - 0.6 * this.k); sky.fog.far = this.fogBase[1] * (1 - (this.kind === 'snow' ? 0.6 : 0.5) * this.k);
      sky.sun.intensity *= 1 - 0.55 * this.k;
      sky.hemi.intensity *= 1 + (this.kind === 'snow' ? 0.15 : -0.1) * this.k;
    }
    sound?.setRain?.(this.kind === 'rain' ? this.k : 0);
    if (this.kind === 'rain') this.storm(dt, camera, sky, sound, hold);
  }
  storm(dt, camera, sky, sound, hold = false) {
    if (!sky?.uniforms) return;
    const U = sky.uniforms, k = this.k; this.sky = sky;
    U.uStorm.value = k; U.uCloud.value = 0.55 + 0.43 * k;
    U.uZen.value.lerp(STORM_ZEN, 0.85 * k); U.uHor.value.lerp(STORM_HOR, 0.75 * k);
    // luz de tormenta (además de lo que ya baja con la lluvia): más oscuro y con la niebla gris plomo
    sky.sun.intensity *= 1 - 0.35 * k; sky.hemi.intensity *= 1 - 0.22 * k; sky.fog.color.lerp(this.grey, 0.35 * k);
    // un rayo cada 5 a 17 s mientras llueve fuerte
    // (un rayo cada 14 a 34 s; antes, cada pocos segundos, y la luz del pueblo saltaba sin parar)
    if (!hold && k > 0.55 && (this.boltT = (this.boltT ?? 8 + Math.random() * 6) - dt) <= 0) { this.boltT = 14 + Math.random() * 20; this.strike(camera, sound); }
    // destello: dos o tres fogonazos seguidos que se apagan enseguida
    let I = 0;
    if (this.strikeT != null) {
      const t = (this.strikeT += dt);
      for (const [t0, a] of this.pulses) if (t >= t0) I = Math.max(I, a * Math.exp(-(t - t0) / 0.07));
      if (t > 1.2) { this.strikeT = null; if (this.bolt) this.bolt.visible = false; }
    }
    U.uFlash.value = I;
    if (I > 0.01) {
      sky.hemi.intensity += I * 0.7; sky.fog.color.lerp(FLASH, I * 0.12);   // (el relámpago aclara el cielo y las nubes; en el pueblo, solo un poco)
      if (this.bolt) { this.bolt.visible = I > 0.15; this.bolt.children[0].material.opacity = Math.min(0.9, I * 1.2); this.bolt.children[1].material.opacity = Math.min(0.25, I * 0.3); }
    }
  }
  strike(camera, sound) {
    const rnd = Math.random, fw = new THREE.Vector3(); camera.getWorldDirection(fw); fw.y = 0; if (fw.lengthSq() < 1e-4) fw.set(0, 0, 1); fw.normalize();
    const camA = Math.atan2(fw.x, fw.z), a = camA + (rnd() - 0.5) * 2.1, dist = 300 + rnd() * 520, P = camera.position;
    const bottom = new THREE.Vector3(P.x + Math.sin(a) * dist, P.y - 25, P.z + Math.cos(a) * dist), top = bottom.clone(); top.y += 240 + rnd() * 90;
    top.x += (rnd() - 0.5) * 60; top.z += (rnd() - 0.5) * 60;
    if (!this.bolt) {
      const m = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
      this.bolt = new THREE.Group(); this.bolt.add(new THREE.Mesh(new THREE.BufferGeometry(), m('#f4f8ff', 1)), new THREE.Mesh(new THREE.BufferGeometry(), m('#8fb0ff', 0.4)));
      this.bolt.children.forEach(o => { o.frustumCulled = false; o.renderOrder = 1001; }); this.scene.add(this.bolt);
    }
    const [core, glow] = this.bolt.children; core.geometry.dispose(); glow.geometry.dispose();
    let s = (rnd() * 1e6) | 0; const r1 = () => ((s = (s * 9301 + 49297) % 233280) / 233280), s0 = s; const r2 = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    core.geometry = boltGeometry(P, top, bottom, 1.3, r1); s = s0; glow.geometry = boltGeometry(P, top, bottom, 5, r2);   // (la misma forma para los dos; fino, como un rayo, y no una franja ancha)
    this.bolt.visible = true;
    this.pulses = [[0, 1], [0.11 + rnd() * 0.05, 0.6 + rnd() * 0.3], ...(rnd() < 0.6 ? [[0.3 + rnd() * 0.1, 0.35 + rnd() * 0.2]] : [])];
    this.strikeT = 0;
    this.sky?.uniforms.uFlashDir.value.subVectors(top, P).normalize();
    sound?.thunder?.(dist, Math.max(-1, Math.min(1, -Math.sin(a - camA))) * 0.8);
  }
  // huellas en la nieve: una por paso, alternando pie izquierdo y derecho; las viejas se borran poco a poco
  footprint(pos, heading) {
    if (this.kind !== 'snow' || SNOW.value < 0.3) return;
    if (!this.prints) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
      const grad = (x, y, rx, ry) => { g.save(); g.translate(x, y); g.scale(rx, ry); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore(); };
      grad(32, 40, 22, 34); grad(32, 98, 17, 24);   // puntera y talón de la bota
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshStandardMaterial({ color: '#8e9db3', roughness: 1, alphaMap: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const geo = new THREE.PlaneGeometry(0.2, 0.36); geo.rotateX(-Math.PI / 2);
      this.N = 180; this.prints = new THREE.InstancedMesh(geo, mat, this.N); this.prints.count = 0; this.prints.frustumCulled = false; this.prints.renderOrder = 1;
      this.printAge = new Float32Array(this.N); this.printM = []; this.pi = 0; this.foot = 1; this.printTex = tex;
      this.scene.add(this.prints);
    }
    this.foot = -this.foot;
    const i = this.pi % this.N, m = new THREE.Matrix4(), sx = Math.cos(heading), sz = -Math.sin(heading);
    const x = pos.x + sx * this.foot * 0.12, z = pos.z + sz * this.foot * 0.12;
    m.compose(new THREE.Vector3(x, pos.y + 0.03, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading + Math.PI), new THREE.Vector3(1, 1, 1));   // la puntera hacia donde se camina
    this.prints.setMatrixAt(i, m); this.printM[i] = m; this.printAge[i] = 0;
    this.pi++; this.prints.count = Math.min(this.N, this.pi); this.prints.instanceMatrix.needsUpdate = true;
  }
  // las huellas viejas se van tapando (se encogen) a partir de los 40 s
  agePrints(dt) {
    if (!this.prints) return;
    this.printTick = (this.printTick || 0) + dt; if (this.printTick < 0.5) return;
    const step = this.printTick; this.printTick = 0; let dirty = false;
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < this.prints.count; i++) {
      const a = (this.printAge[i] += step); if (a < 40) continue;
      const k = Math.max(0, 1 - (a - 40) / 20); this.printM[i].decompose(p, q, sc); sc.setScalar(k);
      this.prints.setMatrixAt(i, new THREE.Matrix4().compose(p, q, sc)); dirty = true;
    }
    if (dirty) this.prints.instanceMatrix.needsUpdate = true;
  }
  dispose() { if (this.sky?.uniforms) { this.sky.uniforms.uStorm.value = 0; this.sky.uniforms.uFlash.value = 0; this.sky.uniforms.uCloud.value = 0.55; } if (this.bolt) { this.scene.remove(this.bolt); this.bolt.children.forEach(o => { o.geometry.dispose(); o.material.dispose(); }); } if (this.fx) { this.scene.remove(this.fx); this.fx.geometry.dispose(); this.fx.material.dispose(); } if (this.prints) { this.scene.remove(this.prints); this.prints.geometry.dispose(); this.prints.material.dispose(); this.printTex.dispose(); } SNOW.value = 0; }
}
