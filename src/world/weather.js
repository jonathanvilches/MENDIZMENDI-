// Tiempo: lluvia o nieve en algunos pueblos (nieve en el Pirineo, lluvia más a menudo en el norte húmedo), con
// las gotas y los copos animados en la tarjeta gráfica alrededor de la cámara, el cielo más gris y, cuando nieva,
// los tejados, el suelo y las copas de los árboles blanqueando poco a poco.
import * as THREE from 'three';

export const SNOW = { value: 0 };   // 0…1: cuánta nieve cubre lo que mira hacia arriba (lo comparten los materiales)

/** Añade nieve a un material: las caras que miran al cielo se vuelven blancas según SNOW. */
export function snowable(m, k = 1) {
  if (!m || m.userData.snowable) return m;
  m.userData.snowable = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) {
    prev?.call(this, sh, r);
    sh.uniforms.uSnow = SNOW;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvSnowN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSnow; varying vec3 vSnowN;')
      .replace('#include <roughnessmap_fragment>', `{ float up = smoothstep(0.32, 0.72, vSnowN.y) * uSnow * ${k.toFixed(2)};
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.91, 0.96) * (0.92 + 0.08 * diffuseColor.r), up); }
#include <roughnessmap_fragment>`);
  };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|snow' + k; };
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
  const U = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector2(1.2, 0.4) } };
  const vert = (body) => `uniform float uTime; uniform vec3 uCam; uniform vec2 uWind; attribute float aSeed;
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
  if (mod(float(gl_VertexID), 2.0) > 0.5) p += vec3(uWind.x * 0.06, 0.9, uWind.y * 0.06);   // la estela de la gota
  vA = 1.0 - smoothstep(14.0, 26.0, distance(p.xz, uCam.xz));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`),
      fragmentShader: 'varying float vA; void main() { gl_FragColor = vec4(0.82, 0.87, 0.95, 0.6 * vA); }' });
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
  vA = 1.0 - smoothstep(16.0, 27.0, distance(p.xz, uCam.xz));
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

export class Weather {
  constructor(scene, kind = 'clear', quality = 'high') {
    this.kind = kind; this.scene = scene; this.t = 0; this.k = 0;
    const n = quality === 'low' ? 0.45 : quality === 'mid' ? 0.7 : 1;
    if (kind === 'rain') { this.fx = precip('rain', Math.round(5200 * n)); scene.add(this.fx); }
    if (kind === 'snow') { this.fx = precip('snow', Math.round(4200 * n)); scene.add(this.fx); }
    SNOW.value = kind === 'snow' ? 0.55 : 0;   // al llegar ya ha nevado: tejados y prados blancos
    this.grey = new THREE.Color(kind === 'snow' ? '#d6dde6' : '#8a949e');
  }
  // cada fotograma, después del cielo: cae la lluvia o la nieve, el cielo se agrisa y la nieve se va posando
  // hold: durante un partido (fútbol o pelota) deja de llover o nevar y se despeja, para ver bien el juego
  update(dt, camera, sky, sound, hold = false) {
    if (this.kind === 'clear') return;
    this.t += dt; this.k = hold ? Math.max(0, this.k - dt * 1.5) : Math.min(1, this.k + dt * 0.25);
    this.fx.visible = this.k > 0.02;
    this.agePrints(dt);
    const U = this.fx.userData.U; U.uTime.value = this.t; U.uCam.value.copy(camera.position);
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
  dispose() { if (this.fx) { this.scene.remove(this.fx); this.fx.geometry.dispose(); this.fx.material.dispose(); } if (this.prints) { this.scene.remove(this.prints); this.prints.geometry.dispose(); this.prints.material.dispose(); this.printTex.dispose(); } SNOW.value = 0; }
}
