import * as THREE from 'three';
import { rx, zz, CONF, FA, FZ, riverHalfA, RIVER_HALF_Z, HALF, RIVERS, PONDS, KIND } from './layout.js';

const waterVS = `
varying vec3 vWP; varying vec2 vUv; varying float vEdge;
attribute float aEdge;
#include <fog_pars_vertex>
void main(){
  vUv = uv; vEdge = aEdge;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const waterFS = `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSky; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uFlow; uniform float uNight;
varying vec3 vWP; varying vec2 vUv; varying float vEdge;
#include <fog_pars_fragment>
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
#ifdef LOWQ
// móvil: olas de dos capas de ruido y un solo tren de ondas (8 ruidos por píxel en vez de 21)
float wav(vec2 p){ return vnoise(p) * 0.66 + vnoise(p * 2.3) * 0.34; }
#define WAVES(q) (wav((q) * vec2(1.3, 2.1) - flow * 1.3) * 1.5)
#else
float wav(vec2 p){ return vnoise(p) * 0.6 + vnoise(p * 2.3) * 0.3 + vnoise(p * 5.1) * 0.1; }
#define WAVES(q) (wav((q) * vec2(1.0, 1.6) - flow) + wav((q) * vec2(2.1, 3.3) - flow * 1.7 + 3.1) * 0.5)
#endif
void main(){
  vec2 flow = vec2(0.0, uTime * uFlow);
  vec2 p = vec2(vUv.x * 3.0, vUv.y);
  float e = 0.08;
  float h0 = WAVES(p);
  float hx = WAVES(p + vec2(e, 0.0));
  float hy = WAVES(p + vec2(0.0, e));
  vec3 n = normalize(vec3((h0 - hx) * 1.4, 1.0, (h0 - hy) * 1.4));
  vec3 V = normalize(cameraPosition - vWP);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  float edge = vEdge;
  vec3 base = mix(uDeep, uShallow, smoothstep(0.45, 1.0, edge));
  vec3 col = mix(base, uSky, 0.08 + fres * 0.5);
  vec3 Hh = normalize(normalize(uSunDir) + V);
  float spec = pow(max(dot(n, Hh), 0.0), 260.0) * 2.2 + pow(max(dot(n, Hh), 0.0), 40.0) * 0.08;
  col += uSunCol * spec * (1.0 - uNight * 0.6);
  // espuma en orillas y corrientes
  float foamN = wav(vec2(vUv.x * 9.0, vUv.y * 4.0) - flow * 2.2);
  float foam = smoothstep(0.9, 1.02, edge + foamN * 0.12) * 0.7 + smoothstep(0.9, 0.98, h0 * 0.75 + foamN * 0.3) * 0.25 * uFlow;
  col = mix(col, vec3(0.92, 0.96, 0.98) * mix(1.0, 0.4, uNight), clamp(foam, 0.0, 1.0) * 0.7);
  float alpha = mix(0.88, 0.6, smoothstep(0.8, 1.0, edge)) + fres * 0.1;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

let LOWQ = false;
function makeMat(flow) {
  return new THREE.ShaderMaterial({ defines: LOWQ ? { LOWQ: 1 } : {},
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#fff') },
      uSky: { value: new THREE.Color('#bfe0f7') }, uDeep: { value: new THREE.Color('#174e5a') }, uShallow: { value: new THREE.Color('#3d8580') },
      uFlow: { value: flow }, uNight: { value: 0 },
    }]),
    vertexShader: waterVS, fragmentShader: waterFS, transparent: true, depthWrite: false, fog: true,
  });
}

// Cinta de agua a lo largo de una línea central
function ribbon(samples, widthFn, levelFn) {
  const pos = [], uv = [], edge = [], idx = [];
  let len = 0;
  const across = 6;
  for (let i = 0; i < samples.length; i++) {
    const [x, z, nx, nz] = samples[i];
    if (i) len += Math.hypot(x - samples[i - 1][0], z - samples[i - 1][1]);
    const w = widthFn(i) + 1.2;
    const y = levelFn(i);
    for (let a = 0; a <= across; a++) {
      const s = a / across * 2 - 1;
      pos.push(x + nx * w * s, y, z + nz * w * s);
      uv.push(a / across, len / 9);
      edge.push(Math.abs(s));
    }
    if (i) {
      const r0 = (i - 1) * (across + 1), r1 = i * (across + 1);
      for (let a = 0; a < across; a++) idx.push(r0 + a, r1 + a, r0 + a + 1, r0 + a + 1, r1 + a, r1 + a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export class Water {
  constructor(scene, quality = 'high') {
    LOWQ = quality === 'low';
    this.mats = [];
    this.meshes = [];
    const add = (m) => { m.renderOrder = 2; scene.add(m); this.meshes.push(m); };
    if (KIND === 'salazar') {
      // Anduña (fluye de norte a sur => +z)
      const sA = [];
      for (let z = -HALF - 40; z <= HALF + 40; z += 3) {
        const x = rx(z), dx = rx(z + 0.5) - rx(z - 0.5);
        const l = Math.hypot(dx, 1);
        sA.push([x, z, 1 / l, -dx / l]);
      }
      const mA = makeMat(0.55); this.mats.push(mA);
      add(new THREE.Mesh(ribbon(sA, i => riverHalfA(sA[i][1]), i => FA(sA[i][1]) - 0.9), mA));
      // Zatoya (fluye de este a oeste)
      const sZ = [];
      for (let x = HALF + 40; x >= CONF.x - 1; x -= 3) {
        const z = zz(x), dz = zz(x + 0.5) - zz(x - 0.5);
        const l = Math.hypot(1, dz);
        sZ.push([x, z, -dz / l, 1 / l]);
      }
      const mZ = makeMat(0.5); this.mats.push(mZ);
      add(new THREE.Mesh(ribbon(sZ, () => RIVER_HALF_Z, i => FZ(sZ[i][0]) - 0.9), mZ));
    } else {
      for (const rv of RIVERS || []) {
        const sA = [];
        for (let z = -HALF - 40; z <= HALF + 40; z += 3) {
          const x = rv.rx(z), dx = rv.rx(z + 0.5) - rv.rx(z - 0.5);
          const l = Math.hypot(dx, 1);
          sA.push([x, z, 1 / l, -dx / l]);
        }
        const m = makeMat(rv.half > 8 ? 0.35 : 0.55); this.mats.push(m);
        if (rv.half > 8) { m.uniforms.uDeep.value.set('#3b5f55'); m.uniforms.uShallow.value.set('#6f8f72'); }
        add(new THREE.Mesh(ribbon(sA, () => rv.half, i => rv.level(sA[i][1])), m));
      }
    }
    for (const pd of PONDS) {
      const mP = makeMat(0.0); this.mats.push(mP);
      mP.uniforms.uDeep.value.set('#143f4d'); mP.uniforms.uShallow.value.set('#3b7f78');
      const pg = new THREE.CircleGeometry(pd.r + 3, 64);
      pg.rotateX(-Math.PI / 2);
      const e = [], p = pg.attributes.position;
      for (let i = 0; i < p.count; i++) e.push(Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / (pd.r + 3)) * 0.9);
      pg.setAttribute('aEdge', new THREE.Float32BufferAttribute(e, 1));
      const uvp = pg.attributes.uv; for (let i = 0; i < uvp.count; i++) uvp.setXY(i, uvp.getX(i) * 6, uvp.getY(i) * 6);
      const pond = new THREE.Mesh(pg, mP);
      pond.position.set(pd.x, pd.level, pd.z);
      add(pond);
    }
  }
  update(elapsed, sky) {
    for (const m of this.mats) {
      m.uniforms.uTime.value = elapsed;
      m.uniforms.uSunDir.value.copy(sky.sunDir);
      m.uniforms.uSunCol.value.copy(sky.sun.color);
      m.uniforms.uSky.value.copy(sky.uniforms.uHor.value);
      m.uniforms.uNight.value = sky.night;
    }
  }
}
