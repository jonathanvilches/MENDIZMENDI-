// Postprocesado en un único pase (solo en calidad media y alta; se apaga en Ajustes, con ?post=0, o solo si el juego va
// justo: runtime.js). El pueblo se dibuja en una imagen aparte, igual que se vería en pantalla (mismo tono de cine y
// mismos colores: la imagen guarda ya el color final), y un solo rectángulo la lleva a la pantalla añadiendo, de una vez:
//  · niebla por capas: además de la niebla con la distancia de siempre, una bruma que se posa en lo hondo del valle y
//    se aclara al subir (con la profundidad de cada píxel se sabe a qué altura está), teñida por el sol si se mira hacia él
//  · sombras de nubes que cruzan el suelo y el pueblo con el mismo viento que mueve las del cielo
//  · resplandor solo de lo que da luz (ventanas encendidas, farolas, fuegos): de noche se nota, de día casi nada
//  · color según la hora (mediodía limpio, tarde cálida, noche azulada) y viñeteado suave
//  · el suavizado de bordes, con las muestras de la propia imagen (2 en media, 4 en alta)
// Con todo a cero, la imagen es la misma que sin él. Las escenas propias (fútbol, encierro, menús) no pasan por aquí.
import * as THREE from 'three';

const _size = new THREE.Vector2(), _c = new THREE.Color();
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
uniform sampler2D tColor, tDepth;
uniform mat4 uProjInv, uCamW;
uniform vec3 uCam, uNieblaCol, uSolCol, uSolDir, uTinte;
uniform vec4 uNiebla;      // altura del fondo del valle, 1 / espesor de la capa, densidad, cuánto tapan las nubes
uniform vec4 uAjuste;      // resplandor, viñeteado, saturación, sombra de nube
uniform float uT, uAspecto;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float d = texture2D(tDepth, vUv).r;
  if (d < 0.99995) {
    vec4 p = uProjInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    vec3 w = (uCamW * vec4(p.xyz / p.w, 1.0)).xyz, rd = w - uCam;
    float dist = length(rd); rd /= max(dist, 1e-4);
    // sombras de nubes: el mismo dibujo de ruido que se desplaza con el viento
    if (uAjuste.w > 0.001) {
      vec2 cp = w.xz * 0.0021 + uT * vec2(0.0115, 0.0043);
      float n = vnoise(cp) * 0.62 + vnoise(cp * 2.3 + 7.1) * 0.38;
      float nube = smoothstep(1.0 - uNiebla.w, 1.0 - uNiebla.w + 0.3, n);
      col *= 1.0 - uAjuste.w * nube * (1.0 - smoothstep(900.0, 2200.0, dist));
    }
    // bruma del valle: densa abajo, se aclara con la altura (integrada a lo largo de la mirada)
    if (uNiebla.z > 0.0) {
      float b = uNiebla.y, t = rd.y * b * dist;
      float f = abs(t) > 0.002 ? (1.0 - exp(-t)) / t : 1.0 - 0.5 * t;
      float a = 1.0 - exp(-uNiebla.z * dist * exp(-max(uCam.y - uNiebla.x, -8.0) * b) * f);
      vec3 nc = mix(uNieblaCol, uSolCol, pow(max(dot(rd, uSolDir), 0.0), 6.0) * 0.4);
      col = mix(col, nc, clamp(a, 0.0, 0.92));
    }
  }
  // resplandor: lo muy claro de alrededor, tomado de las copias pequeñas de la imagen (cada toma ya es un promedio)
  if (uAjuste.x > 0.001) {
    vec3 acc = vec3(0.0); vec2 px = vec2(1.0, uAspecto) * 0.011;
    for (int i = 0; i < 10; i++) {
      float fi = float(i), an = fi * 2.39996, r = 0.35 + 0.65 * sqrt((fi + 0.5) / 10.0);
      vec3 s = textureLod(tColor, vUv + vec2(cos(an), sin(an)) * r * px * (i < 5 ? 1.0 : 2.4), i < 5 ? 2.5 : 4.0).rgb;
      acc += s * smoothstep(0.8, 1.0, max(s.r, max(s.g, s.b)));
    }
    col += acc * (uAjuste.x / 10.0);
  }
  // color de la hora y viñeteado
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uAjuste.z) * uTinte;
  vec2 q = (vUv - 0.5) * vec2(1.0, 1.0 / max(uAspecto, 1.0)) * 2.0;
  col *= 1.0 - uAjuste.y * smoothstep(0.55, 1.45, length(q));
  gl_FragColor = vec4(col, 1.0);
}`;

/** ¿Lo quiere el jugador? (Ajustes y ?post=0|1; por defecto, sí) */
export function postElegido() {
  const q = new URLSearchParams(location.search).get('post'); if (q === '0' || q === '1') return q === '1';
  try { return localStorage.getItem('herrizherri-post') !== '0'; } catch (e) { return true; }
}

let ACTUAL = null;
/** Lo enciende o lo apaga desde Ajustes: se recuerda y, si el juego está abierto, cambia al momento. */
export function ponPost(on) { try { localStorage.setItem('herrizherri-post', on ? '1' : '0'); } catch (e) { } ACTUAL?.pon(on); }

export class Post {
  constructor(renderer, quality) {
    this.r = renderer; this.quality = quality; this.on = false; this.ok = false; ACTUAL = this;
    if (quality === 'low' || !renderer.capabilities.isWebGL2) return;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { samples: quality === 'high' ? 4 : 2, type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthTexture: new THREE.DepthTexture(4, 4) });
    // (la imagen guarda el color final, con el tono de cine ya aplicado, como la pantalla: three.js solo lo hace así
    // con las imágenes que marca de esta manera, pensada para los visores)
    this.rt.isXRRenderTarget = true;
    // (y el formato, dicho a mano: si no, la imagen con suavizado y la textura a la que se vuelca salen con formatos
    // distintos y el volcado falla, con toda la pantalla en negro)
    this.rt.texture.internalFormat = 'RGBA8';
    this.U = {
      tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, uProjInv: { value: new THREE.Matrix4() }, uCamW: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
      uNieblaCol: { value: new THREE.Color() }, uSolCol: { value: new THREE.Color() }, uSolDir: { value: new THREE.Vector3(0, 1, 0) }, uTinte: { value: new THREE.Vector3(1, 1, 1) },
      uNiebla: { value: new THREE.Vector4(0, 0.03, 0, 0.5) }, uAjuste: { value: new THREE.Vector4(0, 0, 1, 0) }, uT: { value: 0 }, uAspecto: { value: 1 },
    };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.escena = new THREE.Scene(); this.escena.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.ok = true; this.on = postElegido();
  }
  /** Lo que cambia con la hora, el tiempo y el valle: cada fotograma, antes de dibujar.
   *  o: { fondo: altura del fondo del valle, cubierto: 0 a 1 (lluvia, nieve o niebla), interior: a cubierto o con focos } */
  ajusta(sky, elapsed, o = {}) {
    if (!this.ok) return;
    const U = this.U, noche = sky.night || 0, dia = 1 - noche, dor = sky.dorada || 0, crep = sky.crep || 0, tapa = o.cubierto || 0, dentro = o.interior ? 1 : 0;
    U.uT.value = elapsed;
    // (los colores sin luz propia, en el espacio de la pantalla: como la niebla de siempre)
    U.uNieblaCol.value.copy(_c.copy(sky.fog.color).convertLinearToSRGB());
    U.uSolCol.value.copy(_c.copy(sky.sun.color).convertLinearToSRGB()).multiplyScalar(dia);
    U.uSolDir.value.copy(sky.sunDir);
    // la bruma del valle: sobre todo al amanecer y al caer la tarde, y con lluvia; a mediodía, un velo
    const bruma = (0.0005 + 0.0016 * Math.max(dor, crep * 0.8) + 0.0006 * noche + 0.0012 * tapa) / (sky.aire?.bruma || 1) * (1 - dentro);
    U.uNiebla.value.set(o.fondo ?? 0, 1 / 34, bruma, sky.uniforms.uCloud.value);
    // (las sombras de nubes, solo de día y sin lluvia: con el cielo cubierto no hay sol que tapar)
    const sombra = 0.24 * dia * (1 - crep) * (1 - tapa) * (1 - dentro);
    U.uAjuste.value.set(0.12 + 0.75 * Math.max(noche, crep * 0.6), 0.14, 1.05 - 0.07 * noche, sombra);
    U.uTinte.value.set(1 + 0.03 * dor - 0.03 * noche, 1 - 0.005 * noche, 1 - 0.035 * dor + 0.045 * noche);
  }
  /** Dibuja la escena con el pase. Devuelve false si no ha podido (y entonces hay que dibujarla como siempre). */
  render(scene, camera) {
    if (!this.ok || !this.on) return false;
    const r = this.r, rt = this.rt; r.getDrawingBufferSize(_size);
    if (rt.width !== _size.x || rt.height !== _size.y) rt.setSize(_size.x, _size.y);
    const U = this.U; U.uProjInv.value.copy(camera.projectionMatrixInverse); U.uCamW.value.copy(camera.matrixWorld); U.uCam.value.setFromMatrixPosition(camera.matrixWorld); U.uAspecto.value = _size.x / Math.max(1, _size.y);
    // (la cuenta de lo dibujado, la del fotograma entero: la escena, que three.js pone a cero como siempre al
    // dibujarla, y el rectángulo, que se suma)
    const auto = r.info.autoReset;
    try { r.setRenderTarget(rt); r.render(scene, camera); r.setRenderTarget(null); r.info.autoReset = false; r.render(this.escena, this.cam); }
    finally { r.setRenderTarget(null); r.info.autoReset = auto; }
    return true;
  }
  /** Encender o apagar (y recordarlo, si lo pide el jugador). */
  pon(on, recordar = false) { this.on = !!on && this.ok; if (recordar) try { localStorage.setItem('herrizherri-post', on ? '1' : '0'); } catch (e) { } return this.on; }
  dispose() { this.rt?.dispose(); this.rt?.depthTexture?.dispose(); this.mat?.dispose(); this.quad?.geometry.dispose(); this.ok = this.on = false; }
}
