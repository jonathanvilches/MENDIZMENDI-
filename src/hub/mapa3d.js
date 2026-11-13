// El mapa 3D de Navarra del inicio: las comarcas con su relieve de verdad (sierras, valles y ríos), cada una en su color y
// separada de las demás, con todos los pueblos del juego señalados encima, y una cámara para recorrerlo. Las comarcas por
// descubrir salen apagadas y bajas; a medida que sellas sus pueblos se encienden y crecen, hasta brillar del todo: así se
// ve lo que falta para descubrir Navarra. Se mueve como en un juego: arrastrar (o WASD y las flechas) para ir adelante,
// atrás y a los lados, la rueda o el pellizco para acercarse, el botón derecho (o Q y E, o girar con dos dedos) para
// rotar, y los botones de la esquina.
// Al tocar una comarca, la cámara vuela hasta ella; al tocar un pueblo, también, y se abre su ficha.
// Usa el renderizador del menú (src/hub/stage.js: un solo contexto WebGL para todo el menú) y se para solo en cuanto su
// caja sale de la página o deja de verse. Los nombres van en HTML encima del lienzo, nítidos a cualquier tamaño.
import * as THREE from 'three';
import { hubRenderer, rendererVivo, sueltaEscenario } from './stage.js';
import { hazIsla, texturasIsla, cieloShader } from './mapa3dIsla.js';
import { hazNubes } from './mapa3dNubes.js';
import { VIDEOS_ISLA } from '../data/videos-isla.js';
import { puedenVideos } from '../ui/videos.js';
import { escala } from '../util/tele.js';
import { esc } from '../util/html.js';
import { mapaXY } from '../util/geo.js';
import { iconSVG } from '../ui/icons.js';
import { MAPA_IDS, loadMapa } from '../data/reales/index.js';
import { levelById } from '../data/levels.js';
import { CENTROS } from '../data/reales/centros.js';
import { MAPA_RELIEVE } from '../data/mapa-relieve.js';
import MOUNTAINS from '../data/mountains.json';
import { MONTES_MAPA } from '../data/montes-mapa.js';
import SOMBRA from '../assets/relieve/sombra.webp?url';
import FINO from '../assets/relieve/fino.webp?url';
import ENTORNO from '../assets/relieve/entorno.webp?url';
import ESPANA from '../assets/relieve/espana.webp?url';
import ORTO from '../assets/relieve/orto.webp?url';
import { MAPA_ORTO } from '../data/mapa-orto.js';
import { ORTO_PUEBLOS } from '../data/mapa-orto-pueblos.js';
import { webUrl } from '../web/hd.js';
import { haceMaqueta, casasMaqueta, ordenaMaqueta } from './maqueta.js';
import { EMB, SUELTOS, haceEmblema, materialEmblema } from './emblemas.js';
import { compilarAsync } from '../util/compilar.js';
import { hacePajaros } from './pajaros.js';
import { calidadJuego } from '../util/gpu.js';
import { apunta } from '../util/diag.js';
import { CX, CY, S, W, contorno, GROSOR, EXA, ruidoV, suave, hacerRelieve, losa, panza, enComarca, enPoligono } from './mapa3dFormas.js';
import { BALIZA, CRISTAL_Y, MIRA_VS, MIRA_FS, HILO_VS, HILO_FS, PIN_VS, PIN_FS, HALO_VS, HALO_FS, BORDE_VS, BORDE_FS, PALETA, RELIEVE_VS, NUBES, RELIEVE_FS, PARCHE_VS } from './mapa3dSombreadores.js';

const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const mezcla = (a, b, t) => a + (b - a) * t;
// (la entrada grande, con Navarra despegándose de la península, solo la primera vez que se abre el mapa)
let ENTRADA_VISTA = false;
const rampa = (s, a, b) => Math.min(1, Math.max(0, (s - a) / (b - a)));
// (el fondo del mapa, el mismo que el borde del suelo; y el borde de las comarcas, morado muy oscuro)
const FONDO = 0x101626, OSCURO = new THREE.Color('#1d1240'), BLANCO = new THREE.Color('#ffffff');
const NIEBLA_LEJOS = new THREE.Color(FONDO), NIEBLA_CERCA = new THREE.Color('#d4cde6'), CIELO_BRUMA = new THREE.Color('#b4d2ec');
// (las comarcas que no son la elegida se quedan con sus colores de mapa, más suaves, como bajo una bruma clara: en negro,
// el mapa se quedaba a oscuras, y en lila no gustaba)
const BRUMA = '#d8ccb2';
// (un dibujo en un lienzo, como textura)
function lienzo(w, h, pinta) { const c = document.createElement('canvas'); c.width = w; c.height = h; pinta(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// (la cinta de un río: clara en el centro y difuminada a los lados)
const rioTex = () => lienzo(4, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); for (const [k, a] of [[0, 0], [0.22, 0.25], [0.36, 1], [0.64, 1], [0.78, 0.25], [1, 0]]) gr.addColorStop(k, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); });
const hazTex = () => lienzo(4, 128, (g) => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); });
// (el relieve fino de cada comarca: en la web, sus imágenes, a 28 m y a 56 m para el móvil; en el archivo único, las de
// la web publicada, si se llega a ella: src/web/hd.js)
const porId = (g) => Object.fromEntries(Object.entries(g).map(([p, f]) => [p.split('/').pop().replace('.webp', ''), f]));
const DET_FULL = porId(import.meta.glob('@relieve-full/*.webp', { query: '?url', import: 'default' })), DET_MEDIO = porId(import.meta.glob('@relieve-medio/*.webp', { query: '?url', import: 'default' }));
const urlDetalle = async (id, fino) => { const f = (fino ? DET_FULL[id] : DET_MEDIO[id]) || DET_FULL[id] || DET_MEDIO[id]; return f ? f() : webUrl('relieve', id, fino ? 2 : 1); };
// (y su ortofoto, en la misma rejilla: tools/relieve/ortofoto.py)
const ORTO_FULL = porId(import.meta.glob('@orto-full/*.webp', { query: '?url', import: 'default' })), ORTO_MEDIO = porId(import.meta.glob('@orto-medio/*.webp', { query: '?url', import: 'default' }));
// (y la ortofoto fina de cada pueblo, medio metro por píxel, para su núcleo y su maqueta: tools/relieve/ortofoto.py
// pueblos-hacer; a 2.048 px, o a 1.024 en el móvil y en los equipos flojos. Si no la hay o no llega, null: se pinta como antes)
const ORTO_P = porId(import.meta.glob('@orto-pueblos/*.webp', { query: '?url', import: 'default' })), ORTO_P_MEDIO = porId(import.meta.glob('@orto-pueblos-medio/*.webp', { query: '?url', import: 'default' }));
const fotoPueblo = async (id, fino) => { const f = (fino ? ORTO_P[id] : ORTO_P_MEDIO[id]) || ORTO_P_MEDIO[id] || ORTO_P[id]; if (!f || !ORTO_PUEBLOS[id]) return null;
  try { const img = new Image(); img.decoding = 'async'; img.src = await f(); await img.decode(); return img; } catch (e) { return null; } };
const urlOrto = async (id, fino) => { const f = (fino ? ORTO_FULL[id] : ORTO_MEDIO[id]) || ORTO_FULL[id] || ORTO_MEDIO[id]; return f ? f() : webUrl('orto', id, fino ? 2 : 1); };
const srgb = (hex) => new THREE.Color(hex).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
// (la bruma: en el relieve, que pinta sus colores tal cual, y en los árboles, que van con la luz de la escena)
const BRUMA_C = srgb(BRUMA), BRUMA_A = `vec3(${new THREE.Color(BRUMA).toArray().map(x => x.toFixed(3)).join(', ')})`;

/**
 * host: la caja donde va el mapa. o: { comarcas: [{ id, name, color, path, pct, done }], towns: [{ id, name, comarca,
 * sx, sy, state: ''|'go'|'ok', bosque, here }], onTown(id), onSelect(comarcaId|null), hueco(), tapa, icono(nombre), falla(),
 * ligero, intro, abiertas }. falla: el mapa dejó de pintarse y se soltó (quien lo puso lo vuelve a hacer); ligero: el modo
 * sencillo; intro: false, sin la entrada grande; abiertas: todas las comarcas encendidas, como en el didáctico.
 * hueco: los píxeles que tapa lo de encima ({ t: arriba, r: a la derecha, b: abajo }): Navarra se encaja y lo elegido
 * se centra en lo que queda libre. tapa: un selector de lo de encima (el saludo, los botones…), para que ningún nombre quede debajo.
 * Devuelve { select(id), vista(), dispose() }.
 */
export function mapa3d(host, o) {
  let r; try { r = hubRenderer(); } catch (e) { return null; }   // (sin WebGL: quien llama pone las comarcas en fotos)
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FONDO, 90, 190);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
  // (la luz, baja y del noroeste, como en los mapas de relieve: las laderas de sombra marcan las sierras)
  scene.add(new THREE.HemisphereLight(0xe6dcff, 0x241046, 1.15));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(-50, 38, -22); scene.add(sol);
  const mats = [], geos = [];
  const M = (o2) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05, toneMapped: false, ...o2 }); mats.push(m); return m; };

  // el suelo: la península entera, con su relieve en colores apagados, que se funde con el fondo hacia el borde, y encima,
  // más fino, lo que rodea a Navarra, de Bilbao a Zaragoza y del Cantábrico al Moncayo, que se funde con ella
  // (tools/relieve/mapa-relieve.py espana y entorno). Mientras llega cada imagen, del color del fondo o transparente
  let cargas = 0;   // (las imágenes del suelo y del sombreado que ya han llegado: la entrada grande las espera)
  const TIEMPO = { value: 0 };   // (el reloj de las nubes)
  // (lo de fuera de Navarra, apagado: la máscara de Navarra, nítida en rojo y difuminada en verde, dónde cae y cuánto se apaga)
  const NAV = { value: null }, NAVR = { value: new THREE.Vector4(0, 0, 1, 1) }, FUERA = { value: 0 }, CIELO = { value: 0 };   // (CIELO: con una isla en el aire, de día: lo de fuera, menos apagado)
  const FONDO_L = { value: new THREE.Color(FONDO) };
  // (funde: cuánto se funden sus bordes, oeste, este, sur y norte, en unidades del mapa; modo 1, en el fondo; 2, por transparencia)
  const suelo = (url, w, h, x, z, y, transp, funde = [0, 0, 0, 0], modo = 0) => {
    const g = new THREE.PlaneGeometry(w, h); geos.push(g);
    const m = new THREE.MeshBasicMaterial({ color: FONDO, toneMapped: false, transparent: transp, opacity: transp ? 0 : 1, depthWrite: !transp }); mats.push(m);
    m.onBeforeCompile = (sh) => { sh.uniforms.uT = TIEMPO; sh.uniforms.uNav = NAV; sh.uniforms.uNavR = NAVR; sh.uniforms.uFuera = FUERA;   // (las mismas nubes que sobre Navarra)
      sh.uniforms.uCielo = CIELO; sh.uniforms.uFunde = { value: new THREE.Vector4(...funde) }; sh.uniforms.uModo = { value: modo }; sh.uniforms.uTam = { value: new THREE.Vector2(w, h) }; sh.uniforms.uFondoL = FONDO_L;
      sh.vertexShader = 'varying vec2 vMun; varying vec2 vUs;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMun = (modelMatrix * vec4(position, 1.0)).xz; vUs = uv;');
      // (y el mar, el Cantábrico y los embalses de fuera, con ondas lentas y algún destello: es lo que tiene el azul por
      // encima del verde y del rojo)
      sh.fragmentShader = 'varying vec2 vMun; varying vec2 vUs; uniform sampler2D uNav; uniform vec4 uNavR; uniform float uFuera, uModo, uCielo; uniform vec4 uFunde; uniform vec2 uTam; uniform vec3 uFondoL;\n' + NUBES + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb *= 1.0 - 0.3 * nubes(vMun);
{ float mar = smoothstep(0.03, 0.07, diffuseColor.b - max(diffuseColor.r, diffuseColor.g));
  if (mar > 0.0) { vec2 q = vMun * 2.2; float w = sin(q.x * 1.7 + uT * 0.5 + sin(q.y * 1.1 + uT * 0.3) * 2.0) * sin(q.y * 2.3 - uT * 0.4 + sin(q.x * 0.9) * 1.5);
    diffuseColor.rgb += mar * (vec3(0.04, 0.07, 0.1) * smoothstep(0.55, 1.0, w) + vec3(0.0, 0.008, 0.016) * w); } }
// (fuera de Navarra, más apagado y algo frío, y junto a su borde, por fuera, una sombra suave: el relieve de alrededor era
// del mismo verde y con la misma luz, y Navarra no se distinguía)
{ vec2 nu = (vMun - uNavR.xy) / uNavR.zw; vec2 nm = nu.x < 0.0 || nu.y < 0.0 || nu.x > 1.0 || nu.y > 1.0 ? vec2(0.0) : texture2D(uNav, nu).rg;
  float fuera = (1.0 - nm.r) * uFuera, l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  // (desde el 12 de noviembre de 2026, oscuro y sin apenas contraste, de un añil como el del fondo: el relieve de fuera se
  // sigue adivinando, pero ya no compite con el de Navarra. Antes era un gris con todas sus sombras, y de cerca, apagado
  // a medias, se confundía con ella)
  vec3 apag = vec3(0.105, 0.095, 0.16) + (l - 0.42) * vec3(0.26, 0.26, 0.32);
  // (con una isla en el aire y el cielo de día, lo de fuera sigue siendo tierra, apagada pero con su luz, no de noche)
  apag = mix(apag, vec3(l) * vec3(0.86, 0.9, 0.96) * 0.9, uCielo);
  diffuseColor.rgb = mix(diffuseColor.rgb, apag, fuera * mix(0.92, 0.3, uCielo));
  diffuseColor.rgb *= 1.0 + 0.22 * uCielo;   // (de día, la imagen de alrededor, hecha para la noche, algo más clara)
  diffuseColor.rgb *= 1.0 - 0.45 * fuera * nm.g; }
// (los bordes de la imagen, fundidos en el fondo, con las esquinas redondas: la península, mucho por los lados lejanos y poco
// por el norte, que está pegado a Navarra; antes se veía su rectángulo flotando, como un cuadrado. La de alrededor de
// Navarra, que va encima, se funde por transparencia en la de debajo)
if (uModo > 0.0) { vec2 a = vUs * uTam, b = (1.0 - vUs) * uTam;
  float kx = max(max(uFunde.x - a.x, 0.0) / uFunde.x, max(uFunde.y - b.x, 0.0) / uFunde.y), ky = max(max(uFunde.z - a.y, 0.0) / uFunde.z, max(uFunde.w - b.y, 0.0) / uFunde.w);
  float e = smoothstep(0.0, 1.0, length(vec2(kx, ky)));
  if (uModo < 1.5) diffuseColor.rgb = mix(diffuseColor.rgb, uFondoL, e); else diffuseColor.a *= 1.0 - e; }`); };
    m.customProgramCacheKey = () => 'mapa-suelo-nubes-nav-funde';
    new THREE.TextureLoader().load(url, (tx) => { if (!vivo) return tx.dispose(); cargas++; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy()); Object.assign(m, { map: tx, opacity: 1, needsUpdate: true }); m.color.set(0xffffff); });
    const s = new THREE.Mesh(g, m); s.rotation.x = -Math.PI / 2; s.position.set(x, y, z); scene.add(s); return s;
  };
  const [ex0, ey0, ex1, ey1] = [-3006, -451, 2824, 4150];   // (lo que cubre la imagen de la península, en unidades del mapa)
  suelo(ESPANA, (ex1 - ex0) * S, (ey1 - ey0) * S, ((ex0 + ex1) / 2 - CX) * S, ((ey0 + ey1) / 2 - CY) * S, -0.04, false, [130, 130, 150, 26], 1);
  suelo(ENTORNO, 200, 152, 0, 0, -0.02, true, [14, 14, 14, 14], 2).renderOrder = -2;

  // el sombreado fino, compartido por todas las comarcas (mientras llega, el de cada vértice)
  const R = MAPA_RELIEVE.sombra, LISTO = { value: 0 };
  const sombra = new THREE.TextureLoader().load(SOMBRA, () => { LISTO.value = 1; cargas++; });
  sombra.flipY = false; sombra.colorSpace = THREE.NoColorSpace; sombra.anisotropy = 4;
  const UNI = { uSombra: { value: sombra }, uListo: LISTO, uRect: { value: new THREE.Vector4(R.x0 - R.paso / 2, R.y0 - R.paso / 2, R.w * R.paso, R.h * R.paso) },
    uGrosor: { value: GROSOR }, uExa: { value: EXA }, uPal: { value: PALETA.map(([, h]) => srgb(h)) }, uCota: { value: PALETA.map(([m]) => m) } };
  const nada = new THREE.DataTexture(new Uint8Array([128, 140, 90, 255]), 1, 1); nada.needsUpdate = true;
  // la ortofoto de toda Navarra (PNOA del Instituto Geográfico Nacional, CC BY 4.0; tools/relieve/ortofoto.py): el color de
  // verdad del suelo. Entra poco a poco al llegar (uOrtoK)
  const ORTO_K = { value: 0 }; let ortoListo = 0;
  const orto = new THREE.TextureLoader().load(ORTO, () => { ortoListo = 1; });
  orto.flipY = false; orto.colorSpace = THREE.NoColorSpace; orto.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
  Object.assign(UNI, { uOrto: { value: orto }, uOrtoK: ORTO_K, uOrtoR: { value: new THREE.Vector4(MAPA_ORTO.x0, MAPA_ORTO.y0, MAPA_ORTO.w * MAPA_ORTO.paso, MAPA_ORTO.h * MAPA_ORTO.paso) } });
  const CERCA = { value: 0 }, TEXK = { value: 0 };   // (lo cerca que está la cámara, de 0 a 1: el grano fino del terreno; y las texturas, desde la vista de una comarca)
  const relieveM = (c, vivo) => { const d = MAPA_RELIEVE.detalle[c.id], m = new THREE.ShaderMaterial({ vertexShader: RELIEVE_VS, fragmentShader: RELIEVE_FS, defines: { ...LIGERO }, vertexColors: true, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...UNI, uDet: { value: nada }, uDetK: { value: 0 }, uOrtoD: { value: nada }, uOrtoDK: { value: 0 }, uCerca: CERCA, uTex: TEXK, uT: TIEMPO,
      uP0: { value: nada }, uP1: { value: nada }, uP2: { value: nada }, uP3: { value: nada }, uPR: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 1)) }, uPK: { value: [0, 0, 0, 0] }, uDetRect: { value: d ? new THREE.Vector4(d.x0, d.y0, d.w * d.paso, d.h * d.paso) : new THREE.Vector4(0, 0, 1, 1) }, uGris: { value: vivo ? 0 : 0.1 }, uTinte: { value: srgb(c.color) }, uTintK: { value: vivo ? 0.16 : 0.2 }, uBrillo: { value: 1 }, uHueco: { value: new THREE.Vector4(0, 0, 0, 0) } } });
    mats.push(m); return m; };

  // (el borde: luz, la propia, para lo que queda a la sombra; filo, cuánto brilla su canto de arriba)
  const bordeM = (c, vivo, luz, filo) => {
    const m = M({ color: OSCURO.clone().lerp(new THREE.Color(c.color), vivo ? 0.3 : 0.14), roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide });
    const uFilo = new THREE.Color(c.color).lerp(BLANCO, 0.35).multiplyScalar(filo * (vivo ? 1 : 0.5));
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uLuzP: { value: luz }, uFilo: { value: uFilo } }); sh.vertexShader = BORDE_VS[0] + sh.vertexShader.replace('#include <begin_vertex>', BORDE_VS[1]);
      sh.fragmentShader = BORDE_FS[0] + sh.fragmentShader.replace('#include <color_fragment>', BORDE_FS[1]).replace('#include <emissivemap_fragment>', BORDE_FS[2]); };
    m.customProgramCacheKey = () => 'borde-comarca'; return m;
  };
  // las comarcas
  // (en el móvil, en el modo sencillo (o.ligero, src/util/sencillo.js) y en los ordenadores con una gráfica floja (el juego
  // en calidad baja, src/util/gpu.js), 30 imágenes por segundo y el relieve algo menos fino)
  const TACTIL = !!matchMedia?.('(pointer: coarse)').matches, LENTO = !!o.ligero || TACTIL || calidadJuego() === 'low';
  // (en el ordenador de calidad baja, el relieve sin la sombra de las nubes ni el grano fino de cerca: mapa3dSombreadores.js)
  const PC_LENTO = LENTO && !TACTIL, LIGERO = PC_LENTO ? { LIGERO: '' } : {};
  // (BAJA: la calidad rebajada del mapa, solo en el modo sencillo y en el ordenador con gráfica floja. El móvil, desde el 13 de
  // noviembre de 2026, con la del ordenador: relieve, bosques, bordes, texturas de los pueblos y relieve fino. Medido en el
  // móvil, el mapa entero pedía 116.000 triángulos y 112 llamadas, muy lejos de los 900.000 y 520 del presupuesto del iPhone,
  // y el autor lo veía de bajísima calidad al acercarse el dron. LENTO sigue mandando en las 30 imágenes por segundo en reposo)
  const BAJA = !!o.ligero || PC_LENTO;
  // (la entrada grande: solo la primera vez y sin movimiento reducido; en las pruebas automáticas, solo si se pide)
  // (ni en el modo sencillo ni en el didáctico, o.intro false, donde el mapa no es la portada)
  // (con «Reducir movimiento» en el móvil, también, pero suave: sin el temblor, el destello ni la onda; antes no salía, y en
  // muchos iPhone está puesto)
  // (apagada: el autor no quiere la entrada de nubes, «como humo»; del arranque, con la lámina animada de los Pirineos
  // (index.html, #portada-app), se pasa directamente al mapa. Con window.__intro, en las pruebas, sale aún)
  const INTRO = !!window.__intro && o.intro !== false && !o.ligero && !ENTRADA_VISTA; if (o.intro !== false) ENTRADA_VISTA = true;
  const SUAVE = !!matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const CINE = host.closest('#hub') || document.body; if (INTRO) CINE.classList.add('m3-cine');   // (en el menú, a toda la pantalla mientras dura)
  const alto = hacerRelieve();
  // (el relieve fino, src/assets/relieve/fino.webp de tools/relieve/fino.mjs: cada 0,7 unidades del mapa, unos 145 m, lo que
  // se aparta la altura de verdad de la gruesa, en pasos de 3 m. Se lee una vez en un lienzo, sin estorbar a la entrada; con
  // él, la comarca elegida se rehace con una malla densa y sus sierras toman su forma: crestas, barrancos y cumbres)
  const FINO_R = { x0: 15, y0: 12, paso: 0.7, w: 1025, h: 1106 }, FINO_G = 1.35 * 3 * EXA;   // (algo más marcado que el de verdad, como el grueso)
  let finoD = null;
  const finoEn = (X, Z) => {
    if (!finoD) return 0;
    const gx = Math.max(0, Math.min(FINO_R.w - 1.001, (X / S + CX - FINO_R.x0) / FINO_R.paso)), gy = Math.max(0, Math.min(FINO_R.h - 1.001, (Z / S + CY - FINO_R.y0) / FINO_R.paso));
    const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = j * FINO_R.w + i, D = finoD, w = FINO_R.w;
    return (((D[k] * (1 - fx) + D[k + 1] * fx) * (1 - fy) + (D[k + w] * (1 - fx) + D[k + w + 1] * fx) * fy) - 128) * FINO_G;
  };
  setTimeout(() => {
    if (typeof createImageBitmap !== 'function') return;
    fetch(FINO, { credentials: 'omit' }).then(x => x.ok ? x.blob() : Promise.reject()).then(b => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then(im => {
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data, a = new Uint8Array(im.width * im.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4];
      if (im.width === FINO_R.w && im.height === FINO_R.h && vivo) finoD = a; im.close?.();
    }).catch(() => { });
  }, INTRO ? 7000 : 900);
  // (dónde hay bosque: a rodales, en el monte de la mitad norte, entre unos 380 y 1.800 m. Una imagen pequeña de toda
  // Navarra con la que el relieve pinta el verde oscuro de las copas y se plantan los árboles: así coinciden)
  const BOSQ = { x0: 0, y0: 0, w: 760, h: 820, nx: 190, ny: 205 };
  const bosqueEn = (sx, sy) => { const [X, Z] = W(sx, sy), m = alto(X, Z) / EXA, sur = suave(430, 560, sy), n = ruidoV(sx * 0.03, sy * 0.03) * 0.65 + ruidoV(sx * 0.11 + 7, sy * 0.11 + 3) * 0.35;
    return suave(0.44, 0.6, n) * suave(380, 620, m) * (1 - suave(1650, 1900, m)) * (1 - sur * 0.9); };
  const bqD = new Uint8Array(BOSQ.nx * BOSQ.ny);
  for (let j = 0; j < BOSQ.ny; j++) for (let i = 0; i < BOSQ.nx; i++) bqD[j * BOSQ.nx + i] = Math.round(255 * bosqueEn(BOSQ.x0 + (i + 0.5) * BOSQ.w / BOSQ.nx, BOSQ.y0 + (j + 0.5) * BOSQ.h / BOSQ.ny));
  const bqTex = new THREE.DataTexture(bqD, BOSQ.nx, BOSQ.ny, THREE.RedFormat); bqTex.magFilter = bqTex.minFilter = THREE.LinearFilter; bqTex.needsUpdate = true;
  Object.assign(UNI, { uBosque: { value: bqTex }, uBosqueR: { value: new THREE.Vector4(BOSQ.x0, BOSQ.y0, BOSQ.w, BOSQ.h) } });
  const C = o.comarcas.map((c, i) => {
    const { P, cx, cy } = contorno(c);
    const Pw = P.map(([x, y]) => W(x, y)), { g, hmax, malla } = losa(Pw, alto, BAJA ? 0.42 : 0.3); geos.push(g); g.setAttribute('aFino', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
    // (empezada, con los colores del mapa y un toque del suyo; sin descubrir, apagada y hacia el malva, bajo la niebla)
    const vivo = !!o.abiertas || c.pct > 0 || c.done, top = relieveM(c, vivo);
    const side = bordeM(c, vivo, 0.2, 1.3), mesh = new THREE.Mesh(g, [top, side]); mesh.userData.c = c.id; const fk = top.uniforms.uFinoK = { value: 0 };
    // (la panza, solo en la entrada: a la sombra, con más luz propia para que se vea su forma)
    let bajo = null; if (INTRO) { const pg = panza(Pw); geos.push(pg); bajo = new THREE.Mesh(pg, bordeM(c, vivo, 0.6, 0)); mesh.add(bajo); }
    // (lo que se levanta la comarca con sus sellos)
    const alzado = 0.35 * c.pct + (c.done ? 0.35 : 0);
    mesh.scale.y = 0.01; scene.add(mesh);
    // (el borde de arriba, una línea clara del color de la comarca, por encima del relieve)
    const lg = new THREE.BufferGeometry().setFromPoints(Pw.map(([X, Z]) => new THREE.Vector3(X, GROSOR + alto(X, Z) + 0.05, Z))); geos.push(lg);
    const linea = new THREE.LineLoop(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(c.color).lerp(BLANCO, 0.4), transparent: true, opacity: vivo ? 1 : 0.85, toneMapped: false })); mats.push(linea.material);
    scene.add(linea);
    const [X, Z] = W(cx, cy);
    const lab = document.createElement('div'); lab.className = 'm3-cl' + (c.done ? ' ok' : vivo ? ' go' : ' lk'); lab.style.setProperty('--c', c.color);
    // (sin el candado, que ya sale en la fila de abajo, y sin «Comarca de»: los nombres, cortos, para que quepan todos)
    lab.innerHTML = `${c.done && o.icono ? `<i>${o.icono('stamp')}</i>` : ''}<b>${esc(c.name.replace(/^Comarca de /, ''))}</b>`;
    return { ...c, vivo, Pw, hmax, malla, hc: GROSOR + alto(X, Z), mesh, top, gGrueso: g, fk, linea, bajo, alzado, lift: 0, fondo: 0, gris: top.uniforms.uGris.value, tinte: top.uniforms.uTinte.value.clone(), tintK: top.uniforms.uTintK.value, lineaOp: vivo ? 1 : 0.85, X, Z, lab, d: 0.25 + i * 0.07, hov: 0 };
  });
  // el hueco de Navarra en el mapa de España: oscuro, bajo las comarcas, justo de su tamaño (las comarcas encajan sin raya
  // entre ellas: solo se ve el de la que se levanta). Va con lo transparente, después del suelo de alrededor y antes que lo demás
  { const pos = [], idx = [];
    for (const c of C) { const b = pos.length / 3; for (const [x, z] of c.Pw) pos.push(x, 0.003, z);
      for (const t of THREE.ShapeUtils.triangulateShape(c.Pw.map(([x, z]) => new THREE.Vector2(x, z)), [])) idx.push(b + t[0], b + t[2], b + t[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); geos.push(g);
    const m = new THREE.MeshBasicMaterial({ color: 0x150d26, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); mats.push(m);   // (violeta muy oscuro: con la isla en el aire se ve entero, y negro quedaba duro)
    const hueco = new THREE.Mesh(g, m); hueco.renderOrder = -1; scene.add(hueco); }
  const byId = new Map(C.map(c => [c.id, c]));
  // el cielo de fondo con una isla en el aire (mapa3dIsla.js cieloShader): una esfera alrededor de la cámara que se pinta
  // antes que nada, sin profundidad; con uK a cero es del color del fondo de siempre
  const cieloFondo = (() => { const m = new THREE.ShaderMaterial({ ...cieloShader(), depthTest: false, depthWrite: false, side: THREE.BackSide }); m.uniforms.uFondo.value.set(FONDO); mats.push(m);
    const gc = new THREE.SphereGeometry(50, 32, 16); geos.push(gc); const s2 = new THREE.Mesh(gc, m); s2.renderOrder = -100; s2.frustumCulled = false; s2.visible = false; scene.add(s2); return s2; })();
  // (el mapa, de día desde el principio: cielo azul, mar y tierra con su color, como un paisaje de verdad; 13 de noviembre de
  // 2026: el autor no quería que empezase con el mapa morado y solo al subir la isla pasase a ser de día)
  let cieloK = 1, islaFija = null;
  // la isla flotante de cada comarca (mapa3dIsla.js): la panza de roca, las cascadas y las piedras, la primera vez que se elige
  // (fuera: la altura del mapa de alrededor, la de la comarca vecina o el suelo, de donde se tira el agua al hueco)
  // (las texturas de la roca y del césped, de Higgsfield, una sola vez para todas las islas)
  let texIsla = null;
  const islaTex = () => texIsla || (texIsla = texturasIsla(Math.min(8, r.capabilities.getMaxAnisotropy())), mats.push(texIsla), texIsla);
  const islaDe = (c) => c.isla || (c.isla = hazIsla({ id: c.id, P: c.Pw, grosor: GROSOR, alto, salen: c.salen, entran: c.entran, tex: islaTex(), geos, mats, scene,
    fuera: (x, z) => { const o = deQuien(x, z); return o && o !== c ? (GROSOR + alto(x, z)) * o.sy + o.py : 0; } }));
  // (la altura de la cara de arriba de una comarca en un punto, la de su rejilla de triángulos y no la de los datos: en
  // los valles estrechos se apartan, y los ríos y las casas, con la de los datos, quedaban bajo el monte)
  const sobre = (c, x, z) => {
    const { x0, z0, paso } = c.malla, gx = (x - x0) / paso, gz = (z - z0) / paso, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const H = (a, b) => alto(x0 + a * paso, z0 + b * paso), ha = H(i, j), hc = H(i + 1, j + 1);
    if (fx > fz) { const hb = H(i + 1, j); return ha + fx * (hb - ha) + fz * (hc - hb); }
    const hd = H(i, j + 1); return ha + fz * (hd - ha) + fx * (hc - hd);
  };
  // (la comarca de un punto; antes que ninguna, la del punto anterior, que casi siempre es la misma)
  const en = (c, x, z) => { const b = c.mesh.geometry.boundingBox; return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && enPoligono(c.Pw, x, z); };
  const deQuien = (x, z, antes) => antes && en(antes, x, z) ? antes : C.find(c => c !== antes && en(c, x, z));

  // ---------- Navarra, que se distinga de lo de alrededor ----------
  // (la máscara para el suelo de fuera: Navarra en rojo, nítida, y en verde difuminada, para la sombra junto al borde. El
  // difuminado, dibujándola pequeña y agrandándola, sin filtros del lienzo, que Safari no siempre tiene)
  { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (const c of C) for (const [X, Z] of c.Pw) { x0 = Math.min(x0, X); z0 = Math.min(z0, Z); x1 = Math.max(x1, X); z1 = Math.max(z1, Z); }
    x0 -= 8; z0 -= 8; x1 += 8; z1 += 8;
    const N = 768, w = N, h = Math.round(N * (z1 - z0) / (x1 - x0)), k = w / (x1 - x0);
    const pinta = (g, kk, col) => { g.fillStyle = col; g.beginPath(); for (const c of C) c.Pw.forEach(([X, Z], i) => { const a = (X - x0) * kk, b = (Z - z0) * kk; i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.fill('nonzero'); };
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); pinta(g, k, '#f00');
    const sw = Math.round(w / 14), sh = Math.round(h / 14), cs = document.createElement('canvas'); cs.width = sw; cs.height = sh; const gs = cs.getContext('2d');
    gs.fillStyle = '#000'; gs.fillRect(0, 0, sw, sh); pinta(gs, sw / (x1 - x0), '#0f0');
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cs, 0, 0, w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.needsUpdate = true;
    NAV.value = t; NAVR.value.set(x0, z0, x1 - x0, z1 - z0);
    mats.push({ dispose: () => t.dispose() });
  }
  // (y su contorno de fuera, una cinta clara sobre el borde de las losas, con otra oscura debajo, algo más ancha, que la
  // recorta; y entre comarcas, una junta oscura y, a cada lado, una franja del color de cada comarca que se apaga hacia
  // dentro: así se ve dónde acaba una y empieza otra, aunque sean del mismo verde. Todo del mismo ancho en pantalla a
  // cualquier distancia (ANCHO_B) y en la losa de su comarca, que se levanta con ella)
  const ANCHO_B = { value: 0.1 };
  const haciaDentro = () => lienzo(4, 64, (g) => { const gr = g.createLinearGradient(0, 64, 0, 0); for (const [k, a] of [[0, 1], [0.3, 0.75], [1, 0]]) gr.addColorStop(k, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); });
  const cintaB = (color, op, fac, orden, map = rioTex()) => { const m = new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity: op, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    m.onBeforeCompile = (sh) => { sh.uniforms.uAnchoB = ANCHO_B; sh.uniforms.uFacB = { value: fac };
      sh.vertexShader = 'attribute vec3 lado; uniform float uAnchoB, uFacB;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += lado * uAnchoB * uFacB;'); };
    m.customProgramCacheKey = () => 'mapa-contorno'; mats.push(m); m.userData.orden = orden; return m; };
  // (finas: la raya oscura de la junta y, a cada lado, la luz de la comarca hacia dentro, estrecha, como un canto biselado.
  // En noviembre de 2026 se hicieron el doble de anchas y pesaban demás: se dejaron así)
  // (la junta entre comarcas, una raya fina y clara, crema como el contorno de Navarra: oscura, casi negra, no le gustaba
  // al autor, noviembre de 2026)
  const contornoM = [cintaB(0x1d1240, 0.6, 2.1, 2), cintaB(0xfff1cf, 0.9, 0.9, 3)], juntaM = cintaB(0xfff4dc, 0.62, 0.55, 3), gradB = haciaDentro();
  mats.push({ dispose: () => gradB.dispose() });
  // (los tramos seguidos de lados que cumplen algo, empezando donde cambia, para no partir ni repetir uno que da la vuelta)
  const tramos = (P, ok) => { const n = P.length, out = []; let s = 0; while (s < n && ok[(s - 1 + n) % n] === ok[s]) s++; if (s === n) s = 0;
    let cur = null; for (let k = 0; k < n; k++) { const i = (s + k) % n; if (ok[i]) { if (!cur) out.push(cur = [P[i]]); cur.push(P[(i + 1) % n]); } else cur = null; } return out; };
  // (una cinta a lo largo de unos puntos: par(ox, oz) da los dos desplazamientos de cada punto, en anchos)
  const cinta2 = (runs, par) => { const pos = [], lado = [], uv = [], idx = [];
    for (const pts of runs) { const b0 = pos.length / 3;
      pts.forEach(([X, Z], k) => {
        const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(pts.length - 1, k + 1)], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, ox = -(p1[1] - p0[1]) / L, oz = (p1[0] - p0[0]) / L, y = GROSOR + alto(X, Z) + 0.06, [a, b] = par(ox, oz);
        pos.push(X, y, Z, X, y, Z); lado.push(a[0], 0, a[1], b[0], 0, b[1]); uv.push(k * 0.1, 0, k * 0.1, 1);
        if (k) { const v = b0 + k * 2; idx.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      }); }
    if (!idx.length) return null;
    const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gb.setAttribute('lado', new THREE.Float32BufferAttribute(lado, 3)); gb.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gb.setIndex(idx); geos.push(gb);
    return gb; };
  const ponCinta = (c, gb, m) => { if (!gb) return; const me = new THREE.Mesh(gb, m); me.renderOrder = m.userData.orden; me.raycast = () => {}; me.frustumCulled = false; c.mesh.add(me); };
  for (const c of C) {
    const P = c.Pw, n = P.length, fuera = new Array(n), dentro = new Array(n), e = 0.22;
    const otro = (x, z) => C.some(o => o !== c && en(o, x, z));
    for (let i = 0; i < n; i++) {
      const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * e, nz = (bx - ax) / L * e, mx = (ax + bx) / 2, mz = (az + bz) / 2;
      fuera[i] = !otro(mx + nx, mz + nz) && !otro(mx - nx, mz - nz); dentro[i] = !fuera[i];
    }
    // (hacia dentro de la comarca: el lado izquierdo de sus bordes si va en sentido contrario a las agujas, si no, el derecho;
    // y se comprueba en su lado más largo, por si acaso)
    let area = 0, larga = 0, li = 0; for (let i = 0; i < n; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n]; area += ax * bz - bx * az; const L = Math.hypot(bx - ax, bz - az); if (L > larga) { larga = L; li = i; } }
    let sg = area > 0 ? 1 : -1; { const [ax, az] = P[li], [bx, bz] = P[(li + 1) % n]; if (!en(c, (ax + bx) / 2 - (bz - az) / larga * e * sg, (az + bz) / 2 + (bx - ax) / larga * e * sg)) sg = -sg; }
    const gFuera = cinta2(tramos(P, fuera), (ox, oz) => [[ox, oz], [-ox, -oz]]); for (const m of contornoM) ponCinta(c, gFuera, m);
    const junta = tramos(P, dentro), luz = cintaB(new THREE.Color(c.color).lerp(BLANCO, 0.55), 0.75, 1, 3, gradB); c.bordeIn = luz;
    ponCinta(c, cinta2(junta, (ox, oz) => [[ox, oz], [-ox, -oz]]), juntaM);
    ponCinta(c, cinta2(junta, (ox, oz) => [[ox * sg * 0.8, oz * sg * 0.8], [ox * sg * 2.6, oz * sg * 2.6]]), luz);
  }


  // los ríos: una cinta de luz azul sobre el relieve, cortada por comarcas (cada trozo va con la suya cuando se levanta)
  const rioM = new THREE.MeshBasicMaterial({ map: rioTex(), color: 0x7cd0ff, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); mats.push(rioM);
  const ANCHO = [0, 0.42, 0.32, 0.24], cintas = new Map();
  const cinta = (c, Q, w) => {
    let a = cintas.get(c); if (!a) cintas.set(c, a = { p: [], uv: [], i: [], lado: [] });
    const b = a.p.length / 3;
    for (let k = 0; k < Q.length; k++) {
      const p = Q[Math.max(0, k - 1)], n = Q[Math.min(Q.length - 1, k + 1)], L = Math.hypot(n[0] - p[0], n[1] - p[1]) || 1;
      const [x, z] = Q[k], ox = -(n[1] - p[1]) / L * w / 2, oz = (n[0] - p[0]) / L * w / 2;
      // (cada lado, en el centro y con lo que se aparta de él: el ancho, y su altura, cambian con la distancia de la cámara)
      const yc = GROSOR + sobre(c, x, z) + 0.05, yl = sobre(c, x + ox, z + oz) - sobre(c, x, z), yr = sobre(c, x - ox, z - oz) - sobre(c, x, z);
      a.p.push(x, yc, z, x, yc, z); a.lado.push(ox, yl, oz, -ox, yr, -oz); a.uv.push(k * 0.1, 0, k * 0.1, 1);
      if (k) { const v = b + k * 2; a.i.push(v - 2, v, v - 1, v - 1, v, v + 1); }
    }
  };
  for (const rio of MAPA_RELIEVE.rios) for (const tr of rio.p) {
    // (el trazo, redondeado: sin los picos de la línea simplificada, que de cerca se veían en zigzag; y con un punto cada
    // décimo de unidad, para que se pegue al relieve)
    let P = []; for (let i = 0; i + 1 < tr.length; i += 2) P.push(W(tr[i], tr[i + 1]));
    for (let it = 0; it < 3 && P.length > 2; it++) { const S = [P[0]]; for (let i = 0; i + 1 < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1]; S.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } S.push(P.at(-1)); P = S; }
    const Q = [];
    for (let i = 0; i + 1 < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1)); for (let k = 0; k < n; k++) Q.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); }
    Q.push(P.at(-1));
    let tramo = [], de = null;
    for (const q of Q) { const c = deQuien(q[0], q[1], de); if (c !== de) { if (de && tramo.length > 1) cinta(de, tramo, ANCHO[rio.k]); if (de && tramo.length) (de.salen ||= []).push([...tramo.at(-1), rio.k]); if (c) (c.entran ||= []).push([q[0], q[1], rio.k]); tramo = []; de = c; } if (c) tramo.push(q); }   // (y dónde sale o entra cada río por el borde, río abajo: las cascadas de la isla y del hueco, mapa3dIsla.js)
    if (de && tramo.length > 1) cinta(de, tramo, ANCHO[rio.k]);
  }
  // los embalses: una lámina de agua a su nivel (el relieve, alrededor, no pasa de él)
  const lagoM = new THREE.MeshBasicMaterial({ color: 0x5ab8f0, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); mats.push(lagoM);
  for (const lago of MAPA_RELIEVE.lagos) lago.p.forEach((tr, n) => {
    const P = []; for (let i = 0; i + 1 < tr.length; i += 2) P.push(W(tr[i], tr[i + 1]));
    let mx = 0, mz = 0; for (const [x, z] of P) { mx += x / P.length; mz += z / P.length; }
    const c = deQuien(mx, mz); if (!c) return;
    const pos = P.flatMap(([x, z]) => [x, GROSOR + lago.h[n] * EXA + 0.04, z]), idx = [];
    for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), [])) { const cr = (P[b][1] - P[a][1]) * (P[d][0] - P[a][0]) - (P[b][0] - P[a][0]) * (P[d][1] - P[a][1]); cr > 0 ? idx.push(a, b, d) : idx.push(a, d, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); geos.push(g);
    const m = new THREE.Mesh(g, lagoM); m.renderOrder = 1; m.userData.lago = true; c.mesh.add(m);
  });
  // los bosques: árboles diminutos, como en una maqueta, donde dice la máscara (más en lo espeso; en el móvil, la mitad).
  // Van con su comarca (se levantan y se apagan con ella) y con su alto de siempre aunque el relieve se exagere más o
  // menos; donde se levanta la maqueta de un pueblo, no salen (allí van sus propios árboles)
  // (TAM: de cerca, junto a la maqueta de un pueblo, los árboles del mapa menguan hasta irse: son maqueta de comarca, de
  // cientos de metros, y al lado de las casas de verdad parecían montañas)
  const INVEXA = { value: 1 }, TAM = { value: 1 }, arbolG = new THREE.ConeGeometry(0.07, 0.24, 6, 1, true), arboles = []; arbolG.translate(0, 0.12, 0); geos.push(arbolG);
  // (el material de los árboles de una comarca; crece: los del bosque denso de la elegida, que salen con su relieve fino)
  const arbolM = (c, fondo, crece) => { const m = M({ roughness: 0.9 });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uInvExa: INVEXA, uTam: TAM, uFondo: fondo, uHueco: c.top.uniforms.uHueco, uFinoK: c.fk });
      sh.vertexShader = 'uniform float uInvExa, uTam, uFinoK; uniform vec4 uHueco; attribute float aFinoI;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed *= uTam${crece ? ' * smoothstep(0.35, 1.0, uFinoK)' : ''}; transformed.y *= uInvExa; transformed.y += aFinoI * uFinoK / instanceMatrix[1][1];\nif (uHueco.w > 0.5 && distance(instanceMatrix[3].xz, uHueco.xy) < uHueco.z) transformed *= 0.0;`);
      // (con un poco de su propio verde como luz: con la luz malva del cielo, de lejos salían como motas negras)
      sh.fragmentShader = 'uniform float uFondo;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, ${BRUMA_A} * 0.45, uFondo * 0.55);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.3;'); };
    m.customProgramCacheKey = () => crece ? 'mapa-arboles-fino' : 'mapa-arboles'; return m; };
  { let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    const tx = BOSQ.w / BOSQ.nx, ty = BOSQ.h / BOSQ.ny, dens = BAJA ? 1.1 : 2.2, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Vector3(), col = new THREE.Color();
    for (const c of C) {
      const b = c.mesh.geometry.boundingBox, L = [];
      const i0 = Math.max(0, Math.floor(((b.min.x / S + CX) - BOSQ.x0) / tx)), i1 = Math.min(BOSQ.nx - 1, Math.ceil(((b.max.x / S + CX) - BOSQ.x0) / tx));
      const j0 = Math.max(0, Math.floor(((b.min.z / S + CY) - BOSQ.y0) / ty)), j1 = Math.min(BOSQ.ny - 1, Math.ceil(((b.max.z / S + CY) - BOSQ.y0) / ty));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = bqD[j * BOSQ.nx + i] / 255; if (k < 0.35) continue;
        for (let n = Math.floor(k * dens + azar()); n > 0; n--) {
          const [X, Z] = W(BOSQ.x0 + (i + azar()) * tx, BOSQ.y0 + (j + azar()) * ty); if (!enPoligono(c.Pw, X, Z)) continue;
          L.push([X, GROSOR + sobre(c, X, Z), Z, alto(X, Z) / EXA]);
        }
      }
      if (!L.length) continue;
      const fondo = { value: 0 }, m = arbolM(c, fondo, false); c.arbolFondo = fondo;
      const im = new THREE.InstancedMesh(arbolG, m, L.length); im.raycast = () => {};
      L.forEach(([X, y, Z, mt], n) => {
        const sc = 0.75 + azar() * 0.55, alt = mt > 900;   // (en lo alto, pinos y abetos, más oscuros; abajo, robles y hayas, más claros)
        im.setMatrixAt(n, m4.compose(e3.set(X, y, Z), q.identity(), new THREE.Vector3(sc, sc * (alt ? 1.15 : 0.9), sc)));
        im.setColorAt(n, col.set(alt ? '#33603a' : '#548640').offsetHSL((azar() - 0.5) * 0.03, 0, (azar() - 0.5) * 0.1));
      });
      im.frustumCulled = false; c.mesh.add(im); arboles.push(im);
      im.geometry = arbolG.clone(); im.geometry.setAttribute('aFinoI', new THREE.InstancedBufferAttribute(new Float32Array(L.length), 1)); geos.push(im.geometry); c.arboles = { im, L };   // (cada comarca, lo suyo del relieve fino)
    }
  }
  // (cada comarca, con su copia de los materiales del agua: se apaga con ella cuando pasa al fondo)
  // (el ancho de los ríos, según la distancia: de lejos, bien visibles; de cerca, más o menos el de verdad)
  const ANCHO_RIO = { value: 1 }, RIO_ESC = { value: 1 };
  // (y donde está la maqueta de un pueblo, el río no se pinta: allí va el suyo, pintado en el suelo)
  // (el agua corre: destellos que bajan por el río, más en el centro de la cinta; uv.x es lo andado a lo largo del río,
  // y RIO_ESC los hace más menudos al acercarse, para que no se vean como manchas grandes)
  const anchoRio = (m, hueco, fk) => { m.onBeforeCompile = (sh) => { sh.uniforms.uAncho = ANCHO_RIO; sh.uniforms.uHueco = hueco; sh.uniforms.uT = TIEMPO; sh.uniforms.uRioE = RIO_ESC; sh.uniforms.uFinoK = fk;
    sh.vertexShader = 'attribute vec3 lado; attribute float aFino; uniform float uAncho, uFinoK; varying vec2 vHx, vRuv;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += lado * uAncho; transformed.y += aFino * uFinoK; vHx = transformed.xz; vRuv = uv;');
    sh.fragmentShader = 'uniform vec4 uHueco; uniform float uT, uRioE; varying vec2 vHx, vRuv;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (uHueco.w > 0.5 && distance(vHx, uHueco.xy) < uHueco.z) discard;')
      .replace('#include <map_fragment>', `#include <map_fragment>
{ float x = vRuv.x * uRioE, cen = 1.0 - abs(vRuv.y - 0.5) * 2.0;
  float o1 = sin(x * 5.0 - uT * 1.6 + sin(x * 1.3 + vRuv.y * 3.0) * 1.5), o2 = sin(x * 13.0 - uT * 2.7 + vRuv.y * 5.0);
  diffuseColor.rgb = diffuseColor.rgb * (0.86 + 0.14 * o1) + vec3(0.55, 0.62, 0.6) * smoothstep(0.6, 1.0, o1 * 0.6 + o2 * 0.4) * cen * 0.75; }`); };
    m.customProgramCacheKey = () => 'rio-ancho'; };
  // (los embalses: ondas que se cruzan y algún destello, despacio)
  const aguaLago = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uT = TIEMPO; sh.uniforms.uRioE = RIO_ESC;
    sh.vertexShader = 'varying vec2 vLx;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLx = position.xz;');
    sh.fragmentShader = 'uniform float uT, uRioE; varying vec2 vLx;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 q = vLx * 5.0 * uRioE; float w = sin(q.x + uT * 0.9 + sin(q.y * 0.8 - uT * 0.5) * 1.6) * sin(q.y * 1.3 - uT * 0.7 + sin(q.x * 0.6) * 1.2);
  diffuseColor.rgb = diffuseColor.rgb * (0.94 + 0.06 * w) + vec3(0.5, 0.6, 0.62) * smoothstep(0.7, 1.0, w) * 0.35; }`); };
    m.customProgramCacheKey = () => 'mapa-lago'; };
  for (const c of C) { c.rioM = rioM.clone(); anchoRio(c.rioM, c.top.uniforms.uHueco, c.fk); c.lagoM = lagoM.clone(); aguaLago(c.lagoM); mats.push(c.rioM, c.lagoM); for (const m of c.mesh.children) if (m.userData.lago) m.material = c.lagoM; }
  for (const [c, a] of cintas) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); g.setAttribute('lado', new THREE.Float32BufferAttribute(a.lado, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2)); g.setAttribute('aFino', new THREE.BufferAttribute(new Float32Array(a.p.length / 3), 1)); g.setIndex(a.i); geos.push(g); const m = new THREE.Mesh(g, c.rioM); m.renderOrder = 1; c.mesh.add(m); c.rioG = g; }
  // los nombres de las sierras, de los ríos y de los embalses, como en los mapas (por debajo de los de las comarcas y los
  // pueblos: si no caben, se esconden)
  const N = [...MAPA_RELIEVE.sierras.map(x => ({ n: x.n, k: 0, xy: [x.x, x.y] })), ...MAPA_RELIEVE.rios.filter(x => x.k < 3).map(x => ({ n: x.n, k: x.k, xy: x.l })),
    ...MAPA_RELIEVE.lagos.filter(x => x.k).map(x => ({ n: x.n, k: 3, xy: x.l }))].map(({ n, k, xy }) => {
    const [X, Z] = W(...xy), lab = document.createElement('div'); lab.className = k ? 'm3-rl' : 'm3-sl'; lab.textContent = n; lab.hidden = true;
    return { lab, k, X, Z, h: GROSOR + alto(X, Z) + (k ? 0.25 : 0.6), c: deQuien(X, Z) };
  });
  // los montes de la colección (mountains.json), cada uno en su cima con su nombre y su altura: con una comarca elegida,
  // los suyos, del más alto al más bajo (el que no cabe, se esconde, como los demás nombres); sin elegir, solo de cerca.
  // La comarca es la del sitio donde está la cima; si cae justo en la raya de Navarra, la de su ficha. Fuera los que tienen
  // «dudoso»: su punto no está comprobado. Detrás, en las comarcas con pocos montes en la colección (la Ribera, la Zona
  // Media, Valdizarbe…), sus cimas de OpenStreetMap que más destacan (data/montes-mapa.js), que ceden el sitio a las otras
  const PK = [...MOUNTAINS.filter(m => m.lat && !m.dudoso).sort((a, b) => b.altitude - a.altitude).map(m => ({ n: m.name, h: m.altitude, lat: m.lat, lon: m.lon, c: m.region, p: 5.5 })),
    ...MONTES_MAPA.map(m => ({ ...m, p: 5.6 }))].map(m => {
    const [X, Z] = W(...mapaXY(m.lat, m.lon)), lab = document.createElement('div'); lab.className = 'm3-pk'; lab.dataset.notr = ''; lab.hidden = true;
    lab.innerHTML = `<b>${esc(m.n)}</b><small>${m.h.toLocaleString('es')} m</small>`;
    return { lab, X, Z, p: m.p, h: GROSOR + alto(X, Z) + 0.15, c: deQuien(X, Z) || byId.get(m.c) };
  });
  // la trashumancia: la Cañada Real de los Roncaleses, del valle de Roncal a las Bardenas Reales (trazado aproximado, por
  // Burgui, la sierra de Leyre, Sangüesa, Cáseda y Carcastillo), pintada sobre el relieve con una raya discontinua, y su
  // rebaño, que baja por ella poco a poco; tocándolo, su ficha (o.onTrashumancia). Una raya en una capa encima del mapa
  // (un polígono de unos 60 puntos) y un nombre: nada que dibuje la tarjeta gráfica
  const CANADA = [[42.81, -0.958], [42.725, -1.011], [42.663, -1.124], [42.59, -1.215], [42.52, -1.37], [42.38, -1.445], [42.2, -1.5]];
  const canP = []; { const Wp = CANADA.map(([la, lo]) => W(...mapaXY(la, lo)));
    for (let i = 0; i + 1 < Wp.length; i++) for (let k = 0; k < 10; k++) { const t = k / 10, X = Wp[i][0] + (Wp[i + 1][0] - Wp[i][0]) * t, Z = Wp[i][1] + (Wp[i + 1][1] - Wp[i][1]) * t; canP.push({ X, Z, h: GROSOR + alto(X, Z) + 0.12, c: deQuien(X, Z) }); }
    const [X, Z] = Wp[Wp.length - 1]; canP.push({ X, Z, h: GROSOR + alto(X, Z) + 0.12, c: deQuien(X, Z) }); }
  const canCom = new Set(canP.map(p => p.c?.id).filter(Boolean));
  const canSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); canSvg.setAttribute('class', 'm3-canada'); canSvg.innerHTML = '<path class="s"/><path class="r"/>';
  const rebano = document.createElement('button'); rebano.type = 'button'; rebano.className = 'm3-tr'; rebano.hidden = true;
  rebano.innerHTML = `${iconSVG('sheep', 20)}<span>Trashumancia</span>`; rebano.setAttribute('aria-label', 'La trashumancia: Cañada Real de los Roncaleses');
  for (const ev of ['pointerdown', 'pointerup', 'click']) rebano.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'click') o.onTrashumancia?.(); });
  // (lo que ocupa Navarra: sus esquinas, para encajarla en la pantalla)
  const caja = new THREE.Box3(); for (const c of C) { c.mesh.geometry.computeBoundingBox(); caja.union(c.mesh.geometry.boundingBox); }
  caja.max.y = GROSOR + Math.max(...C.map(c => c.hmax + c.alzado)) + 0.5;
  const esquinas = []; for (const x of [caja.min.x, caja.max.x]) for (const y of [0, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
  const centro = caja.getCenter(new THREE.Vector3());
  // (las nubes, que se apartan al acercarse la cámara: mapa3dNubes.js; en el móvil y en los equipos flojos, menos)
  const nubes = hazNubes({ scene, geos, mats, n: BAJA ? 26 : TACTIL ? 48 : 96, nav: centro, aniso: Math.min(4, r.capabilities.getMaxAnisotropy()) });


  // los pueblos: su baliza (arriba) y, en el pueblo donde estás, un haz de luz que se ve desde toda Navarra. Cada pueblo
  // lleva un grupo vacío, que solo marca su sitio y su tamaño: de ahí salen las piezas de su baliza y su nombre
  const hazG = new THREE.CylinderGeometry(0.16, 0.3, 12, 20, 1, true); geos.push(hazG);
  const hazM = new THREE.MeshBasicMaterial({ color: 0xff2bd6, alphaMap: hazTex(), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); mats.push(hazM);
  const T = o.towns.filter(t => byId.has(t.comarca)).map((t, i) => {
    // (en los pueblos con su trazado, en su plaza, que es donde se levanta su maqueta)
    const [X, Z] = CENTROS[t.id] ? W(...mapaXY(...CENTROS[t.id])) : W(t.sx, t.sy), g = new THREE.Group();
    const bola = new THREE.Object3D(); bola.position.y = CRISTAL_Y;   // (el cristal: lo que se toca)
    g.add(bola); g.position.set(X, 0, Z); g.scale.setScalar(0.01); scene.add(g);
    let haz = null; if (t.here) { haz = new THREE.Mesh(hazG, hazM); haz.position.set(X, 6, Z); haz.scale.y = 0.01; scene.add(haz); }
    // (desde noviembre de 2026, cada pueblo es una ficha pequeña: su foto en redondo, con el aro de su estado, y su nombre,
    // con un pico abajo que señala su sitio. Sin chinchetas ni puntos sobre el relieve; si no cabe, solo la foto)
    const lab = document.createElement('div'); lab.className = 'm3-tl' + (t.state ? ' ' + t.state : '') + (t.here ? ' here' : ''); lab.dataset.t = t.id;
    lab.style.setProperty('--p', t.state === 'ok' ? 1 : t.state === 'go' ? Math.max(0.12, Math.min(0.9, t.pct || 0)) : 0); lab._sp = [32, 40]; lab._siempre = true;
    lab.innerHTML = `<i class="m3-tf">${t.foto ? `<img src="${esc(t.foto)}" alt="" decoding="async" loading="lazy">` : ''}${t.state === 'ok' ? '<b class="m3-tk"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6.2 5.1 8.3 9 4" fill="none" stroke="#148a3f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></b>' : ''}</i><span>${esc(t.name)}</span>`;
    // (las ciudades, con la chincheta algo más grande; los pueblos, según su tamaño; las zonas de naturaleza, un poco menos)
    const tipo = t.bosque ? 2 : (t.size || 0) >= 85 ? 1 : 0, kt = tipo === 1 ? 1.3 : tipo === 2 ? 0.95 : 0.9 + 0.2 * Math.min(1, Math.max(0, ((t.size || 40) - 20) / 60));
    return { ...t, k: 1, g, bola, haz, hs: GROSOR + alto(X, Z), c: byId.get(t.comarca), lab, X, Z, ph: (i * 0.7) % 6.28, sen: 0, fija: 0, tipo, kt,
      lleno: t.state === 'ok' ? 1 : t.state === 'go' ? Math.max(0.2, Math.min(0.85, t.pct || 0)) : 0 };
  });
  // (las piezas de las chinchetas de todos los pueblos: su sombra en el suelo, el palito, la cabeza y, en las empezadas y en
  // la tuya, un halo suave)
  let medG = 1;
  const NT = T.length, aCol = new THREE.InstancedBufferAttribute(new Float32Array(NT * 3), 3), aInf = new THREE.InstancedBufferAttribute(new Float32Array(NT * 4), 4).setUsage(THREE.DynamicDrawUsage);
  T.forEach((x, i) => { const c = srgb(BALIZA[x.state] || BALIZA['']); aCol.setXYZ(i, c.r, c.g, c.b); });
  const UT = { value: 0 }, UESC = { value: 1 };
  const balM = (vs, fs, o2) => { const m = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { uT: UT, uEsc: UESC }, transparent: true, depthWrite: false, ...o2 }); mats.push(m); return m; };
  const pieza = (g, m, orden) => { g.setAttribute('aCol', aCol); g.setAttribute('aInf', aInf); geos.push(g);
    const im = new THREE.InstancedMesh(g, m, NT); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.renderOrder = orden; scene.add(im); return im; };
  // (la sombra, siempre encima del relieve; la cabeza, un disco de cara a la cámara: PIN_VS)
  const mira = pieza(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), balM(MIRA_VS, MIRA_FS, { depthTest: false }), 3);
  const hilo = pieza(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0), balM(HILO_VS, HILO_FS, { side: THREE.DoubleSide }), 3);
  const pinG = new THREE.PlaneGeometry(2, 2), aTip = new THREE.InstancedBufferAttribute(new Float32Array(NT * 3), 3);
  T.forEach((x, i) => aTip.setXYZ(i, x.tipo, x.state === 'ok' ? 2 : x.state === 'go' ? 1 : 0, i)); pinG.setAttribute('aTip', aTip);
  // (la foto de cada pueblo para su medallón: todas en una tira, en casillas de 96 px, recortadas en cuadrado; cada una se
  // pinta cuando llega, y hasta que llega la primera, el medallón va liso)
  const REJ = [8, Math.max(1, Math.ceil(NT / 8))], FCV = document.createElement('canvas'); FCV.width = REJ[0] * 96; FCV.height = REJ[1] * 96;
  const FCX = FCV.getContext('2d'); FCX.fillStyle = '#d9d2ef'; FCX.fillRect(0, 0, FCV.width, FCV.height);
  const fotosT = new THREE.CanvasTexture(FCV); fotosT.colorSpace = THREE.SRGBColorSpace; fotosT.anisotropy = 4; mats.push({ dispose: () => fotosT.dispose() });
  const FOTOK = { value: 0 };
  const cristal = pieza(pinG, balM(PIN_VS, PIN_FS, { uniforms: { uT: UT, uEsc: UESC, uFotos: { value: fotosT }, uRej: { value: new THREE.Vector2(...REJ) }, uFotoK: FOTOK } }), 5);
  const haloG = new THREE.BufferGeometry(), haloP = new THREE.BufferAttribute(new Float32Array(NT * 3), 3).setUsage(THREE.DynamicDrawUsage), haloS = new THREE.BufferAttribute(new Float32Array(NT), 1).setUsage(THREE.DynamicDrawUsage);
  const haloI = new THREE.BufferAttribute(aInf.array, 4).setUsage(THREE.DynamicDrawUsage);
  haloG.setAttribute('position', haloP); haloG.setAttribute('aS', haloS); haloG.setAttribute('aCol', new THREE.BufferAttribute(aCol.array, 3)); haloG.setAttribute('aInf', haloI); geos.push(haloG);
  const halo = new THREE.Points(haloG, balM(HALO_VS, HALO_FS, { blending: THREE.AdditiveBlending })); halo.frustumCulled = false; halo.renderOrder = 4; scene.add(halo);
  // (las chinchetas en 3D, apagadas: los pueblos son fichas encima del mapa, .m3-tl. Siguen ahí para tocar y anclar la ficha)
  for (const m of [mira, hilo, cristal, halo]) m.visible = false;
  const BM = new THREE.Matrix4(), BV = new THREE.Vector3(), BS = new THREE.Vector3(), Q0 = new THREE.Quaternion();
  const tById = new Map(T.map(t => [t.id, t]));
  const TR = T.filter(t => MAPA_IDS.includes(t.id));   // (los que tienen su trazado de verdad: a esos se puede uno acercar mucho más)

  // la capa de los nombres y los controles
  const capa = document.createElement('div'); capa.className = 'm3-capa';
  for (const c of C) capa.append(c.lab); for (const t of T) capa.append(t.lab); for (const x of N) capa.append(x.lab); for (const x of PK) capa.append(x.lab);
  const cv = r.domElement; cv.className = 'm3-cv'; cv.tabIndex = 0; cv.setAttribute('aria-label', 'Mapa 3D de Navarra: arrastra para moverte y toca una comarca o un pueblo');
  host.prepend(cv); host.append(capa);

  // ---------- la cámara: un punto del mapa al que mira, la distancia, el giro y la inclinación ----------
  // (la vista de toda Navarra: la distancia a la que cabe entera en lo que queda libre, más inclinada en las pantallas
  // anchas, para que se vea la profundidad, y más desde arriba en el móvil de pie)
  let elegido = null;   // (el pueblo elegido, con su ficha)
  const huecoAhora = () => o.hueco?.() || {};
  const libre = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1, hu = huecoAhora(); return { w: Math.max(80, w - (hu.r || 0)), h: Math.max(80, h - (hu.t || 0) - (hu.b || 0)), W: w, H: h }; };
  const camPos = (s, out = new THREE.Vector3()) => out.set(s.x + Math.sin(s.yaw) * Math.cos(s.pitch) * s.d, Math.sin(s.pitch) * s.d + (s.hy || 0), s.z + Math.cos(s.yaw) * Math.cos(s.pitch) * s.d);
  // (lo que tiene que subir la cámara de una vista s para que ni ella ni la línea hasta lo que mira entren en el relieve;
  // cp, su posición, si ya está calculada)
  const _cpD = new THREE.Vector3();
  function despeje(s, cp = camPos(s, _cpD)) {
    // (con el margen del plano cercano de la cámara: si no, este cortaba la ladera de delante y por el corte se veía el fondo)
    // (la línea, con la misma holgura que el dron, perfilDron, para que este no tenga que dar saltos)
    const nr = Math.max(Math.min(0.5, s.d * 0.2), s.d * 0.1 - 1.5), m = 0.004 + s.d * 0.03 + nr * 0.3; let need = 0;
    for (let k = 10; k >= 4; k--) { const f = k / 10, x = s.x + (cp.x - s.x) * f, z = s.z + (cp.z - s.z) * f, c = deQuien(x, z); if (!c?.sy) continue;
      const g = pisoEn(c, x, z) * c.sy + c.py + m, y = s.hy + (cp.y - s.hy) * f; if (y < g) need = Math.max(need, s.hy + (g - s.hy) / f - cp.y); }
    // (y alrededor de la propia cámara, a vuelta y media del plano cercano: una ladera al lado también se cortaba)
    for (let a = 0; a < 6; a++) { const x = cp.x + Math.cos(a * 1.0472) * nr * 1.5, z = cp.z + Math.sin(a * 1.0472) * nr * 1.5, c = deQuien(x, z); if (!c?.sy) continue;
      const g = pisoEn(c, x, z) * c.sy + c.py + nr * 1.1; if (cp.y < g) need = Math.max(need, g - cp.y); }
    return need;
  }
  // (se prueba a qué distancia caben todas las esquinas de Navarra en el hueco libre, con la misma cámara)
  // (fb: cuánto de lo de abajo cuenta: con toda Navarra, casi todo, porque la tira de fotos de abajo tapa)
  const prueba = new THREE.PerspectiveCamera(cam.fov, 1, 0.5, 2000), pq = new THREE.Vector3();
  function encaja(pts, x, z, pitch, fb, hy = 0.8) {   // (hy: a qué altura mira la cámara; la isla, a su mitad)
    const L = libre(), hu = huecoAhora();
    prueba.aspect = L.W / L.H; prueba.setViewOffset(L.W, L.H, (hu.r || 0) / 2, ((hu.b || 0) - (hu.t || 0)) / 2, L.W, L.H);
    const s = { x, z, yaw: 0, pitch, d: 0, hy }, m = 0.025;
    const cabe = (d) => { s.d = d; camPos(s, prueba.position); prueba.lookAt(x, s.hy, z); prueba.updateMatrixWorld(); prueba.updateProjectionMatrix();
      return pts.every(e => { pq.copy(e).project(prueba); const px = (pq.x + 1) / 2 * L.W, py = (1 - pq.y) / 2 * L.H;
        return pq.z < 1 && px > L.W * m && px < L.W - (hu.r || 0) - L.W * m && py > (hu.t || 0) + L.H * m && py < L.H - (hu.b || 0) * fb - L.H * m * fb; }); };
    let a = 8, b = 400; for (let i = 0; i < 18; i++) { const c = (a + b) / 2; if (cabe(c)) b = c; else a = c; }
    return b;
  }
  function casa() {
    const L = libre(), pitch = L.w / L.h < 1.05 ? 1.02 : L.w / L.h < 1.6 ? 0.82 : 0.7;
    return { x: centro.x, z: centro.z, d: encaja(esquinas, centro.x, centro.z, pitch, 0.9), yaw: 0, pitch };
  }
  // (una comarca: sus esquinas, con lo que sube al elegirla)
  for (const c of C) { const bb = c.mesh.geometry.boundingBox.clone(); bb.max.y = GROSOR + c.hmax + c.alzado + 1.1; c.esq = []; for (const x of [bb.min.x, bb.max.x]) for (const y of [0, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) c.esq.push(new THREE.Vector3(x, y, z)); c.mid = bb.getCenter(new THREE.Vector3()); }
  let DMAX = 150;
  const v = { x: 0, z: 4, d: 132, yaw: 0, pitch: 1.18, hy: 0.8 }, goal = casa();
  let bajoC = null, subida = 0; const hRef = { c: null, sy: 0, py: 0 };   // (la comarca que queda debajo del punto al que mira la cámara; y lo que sube la cámara para no meterse en el relieve)
  let vuelo = null;   // (un vuelo animado hasta un sitio: { de, a, t, dur, cm: su camino, dron: el del pueblo al que va })
  // (el camino de un vuelo, el de van Wijk y Nuij, «Smooth and efficient zooming and panning», 2003, el mismo de
  // d3.interpolateZoom: lo que corre el suelo, en proporción a lo lejos que está la cámara, va igual de suave todo el camino.
  // Para ir lejos, primero sube, cruza por alto y baja; para acercarse, se centra mientras aún está alta y luego baja. Antes
  // el sitio y la distancia se mezclaban cada uno por su lado y, a ras de tejado, el suelo salía disparado de lado al
  // arrancar y frenaba de golpe al llegar: el golpe de cámara. w: lo que se ve de ancho, la distancia por ANCHO_V; k: lo hecho
  // del camino, de 0 a 1; devuelve u, lo hecho del desplazamiento, y w)
  const RHO = 1.3, ANCHO_V = 1.6;
  function camino(de, a) {
    const u1 = Math.hypot(a.x - de.x, a.z - de.z), w0 = de.d * ANCHO_V, w1 = a.d * ANCHO_V, r2 = RHO * RHO;
    if (u1 < 1e-6) { const S = Math.log(w1 / w0) / RHO; return { S: Math.abs(S), en: (k) => ({ u: k, w: w0 * Math.exp(RHO * S * k) }) }; }
    const b0 = (w1 * w1 - w0 * w0 + r2 * r2 * u1 * u1) / (2 * w0 * r2 * u1), b1 = (w1 * w1 - w0 * w0 - r2 * r2 * u1 * u1) / (2 * w1 * r2 * u1);
    const r0 = -Math.asinh(b0), r1 = -Math.asinh(b1), S = (r1 - r0) / RHO, c0 = Math.cosh(r0), s0 = Math.sinh(r0);
    return { S, en: (k) => { const q = RHO * k * S + r0; return { u: w0 / (r2 * u1) * (c0 * Math.tanh(q) - s0), w: w0 * c0 / Math.cosh(q) }; } };
  }
  // (el tiempo, según lo largo del camino: de un pueblo a otro de la otra punta, 5,4 s; a una comarca, algo más de uno)
  const volar = (a, dur = 0.9) => {
    inercia = null; normaYaw();
    const de = { ...v }, A = { ...v, ...a };
    A.yaw = de.yaw + Math.atan2(Math.sin(A.yaw - de.yaw), Math.cos(A.yaw - de.yaw));   // (girando lo menos posible)
    const cm = camino(de, A);
    vuelo = { de, a: A, t: 0, dur: Math.max(dur, Math.min(5.4, 0.6 * cm.S + 0.6)), cm }; Object.assign(goal, vuelo.a);
  };
  // (el giro de la cámara, entre -π y π, y lo que va con él: con el dron, que da una vuelta cada tres minutos, crecía sin
  // parar y, al volar luego a una comarca, la cámara daba antes todas esas vueltas de golpe)
  function normaYaw() {
    const n = Math.round(v.yaw / (2 * Math.PI)) * 2 * Math.PI; if (!n) return;
    v.yaw -= n; goal.yaw -= n; if (dron) dron.yaw -= n; if (paseo) paseo.base.yaw -= n;
  }
  const lim = () => { goal.x = Math.max(-42, Math.min(42, goal.x)); goal.z = Math.max(-44, Math.min(44, goal.z)); goal.d = Math.max(TR.some(t => Math.hypot(t.X - goal.x, t.Z - goal.z) < 0.6) ? 0.12 : 1.4, Math.min(DMAX, goal.d)); goal.pitch = Math.max(sel && byId.get(sel)?.isla?.k > 0.2 ? 0.24 : 0.45, Math.min(1.35, goal.pitch));   // (con la isla en el aire, se puede mirar más de lado: así se ve la roca de debajo)
    if (goal.d < 3) goal.pitch = Math.min(goal.pitch, 0.62 + 0.11 * goal.d); };   // (muy cerca, más de lado: así se ve la maqueta en pie)
  DMAX = Math.max(150, goal.d * 1.35);
  // (el comienzo, sin la entrada grande: desde muy alto, la cámara baja y se inclina mientras las comarcas crecen una tras otra)
  if (!INTRO) { Object.assign(v, { d: goal.d * 1.45, pitch: 1.25 }); vuelo = { de: { ...v }, a: { ...goal }, t: 0, dur: 1.8 }; }

  // ---------- la entrada grande ----------
  // Navarra, pintada en el mapa de España, tiembla, se despega en una ola de noroeste a sureste con su panza, soltando
  // fragmentos y polvo morados por los bordes, sube y se vuelve a posar en su sitio con un botecito, mientras la cámara
  // baja desde lo alto de la península; luego salen las chinchetas y lo de encima. Con cualquier toque pasa deprisa. Su
  // reloj solo corre con el mapa a la vista, con las imágenes del suelo ya llegadas (o pasados 2,5 s) y sin la bienvenida
  const IT = { tiembla: 0.4, sube: 1.1, ola: 0.6, subeD: 1.3, alto: 8, baja: 3.3, bajaD: 0.85, vuelo: 0.7, vueloD: 3.9, pines: 4.4, fin: 5.1 };
  const intro = INTRO ? { t: 0, espera: 0, rapido: 1, hecho: false } : null;
  if (intro) {
    // (la península entera en la pantalla: unos 500 de ancho y 420 de alto, con su centro hacia Madrid)
    const L = libre(), tg = Math.tan(cam.fov * Math.PI / 360), asp = L.W / L.H;
    intro.de = { x: -50, z: 140, d: Math.min(1000, Math.max(430 / 2 / tg, 510 / 2 / (tg * asp)) * 1.08), yaw: -0.2, pitch: 1.32 };
    Object.assign(v, intro.de); host.classList.add('m3-intro');
    const pr = C.map(c => c.X * 0.8 + c.Z * 0.6), a = Math.min(...pr), b = Math.max(...pr); C.forEach((c, i) => { c.ola = (pr[i] - a) / (b - a || 1) * IT.ola; });
  }
  // (de una comarca en la entrada: cuánto ha crecido su relieve, de 0 a 1, lo que está subida, cuánto ha subido y bajado, y
  // desde cuándo está posada)
  function despegue(c, s) {
    const b0 = IT.baja + c.ola * 0.7, sube = rampa(s, IT.sube + c.ola, IT.sube + c.ola + IT.subeD), baja = rampa(s, b0, b0 + IT.bajaD), tl = s - b0 - IT.bajaD;
    return [ease(sube), IT.alto * (1 - (1 - sube) ** 3) * (1 - baja * baja) + (tl > 0 && tl < 0.32 ? 0.45 * Math.sin(tl / 0.32 * Math.PI) : 0), sube, baja, tl];
  }
  // (el temblor: al soltarse y al posarse)
  const temblor = (s) => { const p = IT.baja + IT.bajaD; return Math.max(rampa(s, IT.tiembla, IT.sube) * (1 - rampa(s, IT.sube + 0.3, IT.sube + 1)), 0.8 * rampa(s, p - 0.05, p) * (1 - rampa(s, p + 0.1, p + IT.ola * 0.7 + 0.5))); };
  function acabaIntro() {
    intro.hecho = true; host.classList.remove('m3-intro'); host.classList.add('m3-aparece');
    // el mapa, de la pantalla entera a su sitio en el menú poco a poco, mientras aparecen la barra y la cabecera: antes,
    // de golpe, se veía el salto. Se mide dónde va (en su sitio del menú), se deja a pantalla entera y se le da ese sitio
    // (inicio.css lo lleva con una transición); al llegar, vuelve a su sitio de siempre, que es el mismo
    const main = CINE.id === 'hub' && !CINE.classList.contains('juego') ? CINE.querySelector('.hub-main') : null;   // (jugando, el mapa ya está siempre a toda la pantalla)
    CINE.classList.remove('m3-cine');
    if (main) {
      const L = main.offsetLeft, T = main.offsetTop, R = CINE.clientWidth - L - main.offsetWidth, B = CINE.clientHeight - T - main.offsetHeight;
      CINE.classList.add('m3-cine-sale'); void main.offsetWidth;
      Object.assign(main.style, { left: L + 'px', top: T + 'px', right: R + 'px', bottom: B + 'px' });
    }
    CINE.classList.add('m3-cine-fin');
    salida = setTimeout(() => { host.classList.remove('m3-aparece'); CINE.classList.remove('m3-cine-fin', 'm3-cine-sale'); if (main) for (const k of ['left', 'top', 'right', 'bottom']) main.style[k] = ''; show?.quita(); }, 900);
    // (la ayuda de los controles cuenta su tiempo desde ahora)
    const ay = host.querySelector('.m3-ayuda'); if (ay) { ay.style.animation = 'none'; void ay.offsetWidth; ay.style.animation = ''; }
    for (const c of C) { if (c.bajo) c.bajo.visible = false; c.mesh.position.x = c.mesh.position.z = c.linea.position.x = c.linea.position.z = 0; }
  }
  const saltaIntro = () => { if (!intro || intro.hecho) return false; intro.rapido = 5; return true; };
  let salida = 0;
  // ---------- el espectáculo de la entrada ----------
  // Encima del mapa: las nubes, que al empezar lo tapan casi todo y que la cámara atraviesa al bajar (se abren hacia los
  // lados); el nombre del juego, letra a letra, con un brillo que lo recorre y el lema debajo, que se aleja hacia la
  // cámara cuando esta baja; la luz dorada bajo Navarra mientras está en el aire y el destello al posarse. Todo va con el
  // reloj de la entrada (si se toca para pasar deprisa, también deprisa)
  const show = intro && (() => {
    const E = document.createElement('div'); E.className = 'm3-show'; E.setAttribute('aria-hidden', 'true');
    // (como el arranque de un videojuego, a toda la pantalla: una raya de luz que
    // cruza el nombre, la onda que levanta Navarra al posarse con un temblor de la cámara, y el aviso de que se puede pasar)
    E.innerHTML = `<canvas class="m3-nubes"></canvas><div class="m3-sol"></div><div class="m3-luz"></div><div class="m3-onda"></div><div class="m3-titulo"><b class="logo" data-notr>${[...'HERRIZHERRI'].map((l, i) => `<i style="--i:${i}">${l}</i>`).join('')}</b><span class="m3-raya"></span><small>Navarra, pueblo a pueblo</small></div><div class="m3-destello"></div><span class="m3-pasa">${TACTIL ? 'Toca para pasar' : 'Clic para pasar'}</span>`;
    host.append(E);
    const nc = E.querySelector('.m3-nubes'), g2 = nc.getContext('2d'), sol = E.querySelector('.m3-sol'), luz = E.querySelector('.m3-luz'), tit = E.querySelector('.m3-titulo'), letras = [...tit.querySelectorAll('.logo i')], lema = tit.querySelector('small'), dest = E.querySelector('.m3-destello');
    const raya = E.querySelector('.m3-raya'), onda = E.querySelector('.m3-onda'), pasa = E.querySelector('.m3-pasa');
    // (una nube de bolas difusas, dibujada una vez; luego se pinta muchas veces, más grande cuanto más cerca de la cámara)
    const nube = document.createElement('canvas'); nube.width = nube.height = 256;
    // (con volumen: cada bola, su sombra malva un poco más abajo y su luz blanca encima)
    { const x = nube.getContext('2d'), B = Array.from({ length: 26 }, () => { const a = Math.random() * 6.28, rr = Math.random() * 70; return [128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr * 0.6, 40 + Math.random() * 50]; });
      for (const [col, dy] of [['178,160,222', 10], ['255,250,244', -6]]) for (const [px, py, s] of B) { const gr = x.createRadialGradient(px, py + dy, 0, px, py + dy, s); gr.addColorStop(0, `rgba(${col},.5)`); gr.addColorStop(1, `rgba(${col},0)`); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); } }
    const NB = Array.from({ length: 22 }, (_, i) => ({ a: i / 22 * 6.28 + Math.random() * 0.3, r: 0.12 + Math.random() * 0.9, z: 0.9 + Math.random() * 1.6, s: 0.7 + Math.random() * 0.8 }));
    // (el centro de Navarra, para la luz de debajo)
    const NC = new THREE.Vector3(); { let n = 0; for (const c of C) for (const q of c.Pw) { NC.x += q[0]; NC.z += q[1]; n++; } NC.divideScalar(n || 1); }
    const pc = new THREE.Vector3(); let w0 = 0, h0 = 0;
    const tPosa = IT.baja + IT.bajaD;
    return {
      tick(tI) {
        const W = host.clientWidth, H = host.clientHeight, M = Math.max(W, H);
        // las nubes
        const q = rampa(tI, 0.1, 1.9);
        if (q < 1) {
          const dpr = Math.min(1.5, devicePixelRatio || 1);
          if (W !== w0 || H !== h0) { w0 = W; h0 = H; nc.width = Math.round(W * dpr); nc.height = Math.round(H * dpr); }
          g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, H);
          g2.fillStyle = `rgba(206,196,234,${(0.5 * (1 - ease(q))).toFixed(3)})`; g2.fillRect(0, 0, W, H);
          for (const c of NB) {
            const z = c.z - q * 2.2; if (z <= 0.12) continue;
            const d = c.r * M * 0.32 / z, s = c.s * M * 0.55 / z;
            g2.globalAlpha = Math.min(1, z * 1.4) * (1 - q * q);
            g2.drawImage(nube, W / 2 + Math.cos(c.a) * d - s / 2, H / 2 + Math.sin(c.a) * d * 0.75 - s / 2, s, s);
          }
          g2.globalAlpha = 1; nc.style.display = '';
        } else nc.style.display = 'none';
        // el nombre: las letras caen una tras otra en medio de la pantalla, mientras se abren las nubes; luego el brillo y el
        // lema; cuando Navarra se suelta, sube a lo alto, más pequeño (sin el lema), para dejarla ver en el aire; al
        // posarse, se va hacia arriba y se desvanece
        const cine = ease(rampa(tI, 0, 0.5)) * (1 - ease(rampa(tI, 3.9, 4.6)));
        const arriba = ease(rampa(tI, 2.2, 2.9)), sale = ease(rampa(tI, 3.9, 4.5)), y0 = H * 0.3, y1 = Math.max(8, H * 0.03);
        letras.forEach((l, i) => { const p = rampa(tI, 0.35 + i * 0.07, 0.85 + i * 0.07), e = ease(p); l.style.opacity = Math.min(1, p * 1.8).toFixed(3); l.style.transform = `translateY(${((1 - e) * -0.5).toFixed(3)}em) scale(${(1 + (1 - e) * 1.8).toFixed(3)})`; });
        tit.style.setProperty('--brillo', rampa(tI, 1.3, 2.3).toFixed(3));
        lema.style.opacity = (rampa(tI, 1.4, 1.9) * (1 - rampa(tI, 2.1, 2.5))).toFixed(3); lema.style.letterSpacing = (0.2 + 0.5 * (1 - ease(rampa(tI, 1.4, 2.2)))).toFixed(3) + 'em';
        tit.style.opacity = (1 - sale).toFixed(3);
        tit.style.transform = `translate(-50%, ${(mezcla(y0, y1, arriba) - sale * 30).toFixed(1)}px) scale(${(mezcla(1, 0.55, arriba) * (1 + sale * 0.25)).toFixed(3)})`;
        // el sol que asoma entre las nubes
        sol.style.opacity = (rampa(tI, 0.6, 1.6) * (1 - rampa(tI, 3.0, 4.2))).toFixed(3);
        // la luz dorada en el suelo, bajo Navarra en el aire
        const lz = rampa(tI, IT.sube, IT.sube + 0.8) * (1 - rampa(tI, IT.baja, tPosa));
        luz.style.opacity = lz.toFixed(3);
        if (lz > 0) { pc.copy(NC).project(cam); const k = 0.9 + 0.1 * Math.sin(tI * 6); luz.style.transform = `translate(${((pc.x + 1) / 2 * W).toFixed(1)}px, ${((1 - pc.y) / 2 * H).toFixed(1)}px) scale(${k.toFixed(3)})`; }
        // el destello al posarse
        dest.style.opacity = (tI > tPosa && !SUAVE ? 0.55 * Math.exp(-(tI - tPosa) * 4.5) : 0).toFixed(3);
        // el aviso de pasar, mientras dura
        pasa.style.opacity = (rampa(tI, 0.8, 1.2) * (1 - rampa(tI, 3.4, 3.8)) * 0.85).toFixed(3);
        // la raya de luz que cruza el nombre cuando le llega el brillo
        const ry = rampa(tI, 1.25, 1.95); raya.style.opacity = (Math.sin(ry * Math.PI)).toFixed(3); raya.style.setProperty('--x', (ry * 140 - 20).toFixed(1) + '%');
        // la onda al posarse, desde el centro de Navarra, y el temblor de la cámara
        const od = tI - tPosa;
        if (od > 0 && od < 1.2 && !SUAVE) { pc.copy(NC).project(cam); onda.style.opacity = (0.9 * (1 - od / 1.2)).toFixed(3);
          onda.style.transform = `translate(${((pc.x + 1) / 2 * W).toFixed(1)}px, ${((1 - pc.y) / 2 * H).toFixed(1)}px) scale(${(0.2 + od * 3.2).toFixed(3)})`; } else onda.style.opacity = '0';
        const tb = od > 0 && od < 0.6 && !SUAVE ? 7 * Math.exp(-od * 7) : 0;
        cv.style.transform = tb > 0.2 ? `translate(${(Math.sin(tI * 83) * tb).toFixed(1)}px, ${(Math.cos(tI * 71) * tb).toFixed(1)}px)` : '';
      },
      quita() { E.remove(); cv.style.transform = ''; },
    };
  })();
  // los fragmentos y el polvo que caen por los bordes al despegarse: de los puntos del contorno de fuera de Navarra (los que
  // no dan a otra comarca), hacia fuera; botan una vez en el mapa y se deshacen
  const terr = intro && (() => {
    const borde = [];
    for (const c of C) {
      const P = c.Pw; let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; }
      for (let i = 0; i < P.length; i += 2) { const a = P[i], b = P[(i + 1) % P.length], L = (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1) / Math.sign(A), nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
        if (!deQuien(a[0] + nx * 0.9, a[1] + nz * 0.9)) borde.push({ c, x: a[0], z: a[1], nx, nz }); }
    }
    const NP = BAJA ? 320 : 820, ND = BAJA ? 160 : 360, paso = Math.max(1, Math.round(borde.length / (ND * 0.45)));
    const tg = new THREE.DodecahedronGeometry(0.5, 0), tm = new THREE.MeshLambertMaterial({ color: 0xffffff, toneMapped: false }); geos.push(tg); mats.push(tm);
    const im = new THREE.InstancedMesh(tg, tm, NP); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
    const TONOS = ['#2a1a4e', '#3a2468', '#4b3184', '#5d3fa0', '#7b5cc4', '#9a86d6'].map(h => new THREE.Color(h)), M0 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < NP; i++) { im.setColorAt(i, TONOS[(Math.random() * TONOS.length) | 0]); im.setMatrixAt(i, M0); }
    const p = new Float32Array(NP * 3), vel = new Float32Array(NP * 3), rot = new Float32Array(NP * 4), tam = new Float32Array(NP), vida = new Float32Array(NP), bote = new Uint8Array(NP);
    // (el polvo: puntos grandes y blandos que se abren, suben un poco y se deshacen)
    const pg = new THREE.BufferGeometry(), dp = new Float32Array(ND * 3), dv = new Float32Array(ND * 3), dS = new Float32Array(ND), dA = new Float32Array(ND), dEd = new Float32Array(ND), dVi = new Float32Array(ND), dS0 = new Float32Array(ND), dS1 = new Float32Array(ND);
    pg.setAttribute('position', new THREE.BufferAttribute(dp, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aS', new THREE.BufferAttribute(dS, 1).setUsage(THREE.DynamicDrawUsage)); pg.setAttribute('aA', new THREE.BufferAttribute(dA, 1).setUsage(THREE.DynamicDrawUsage));
    const ESC = { value: 1 }, pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uEsc: ESC, uCol: { value: srgb('#8a76c8') } },
      vertexShader: 'attribute float aS, aA; uniform float uEsc; varying float vA; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aA > 0.0 ? aS * uEsc / -mv.z : 0.0; vA = aA; }',
      fragmentShader: 'uniform vec3 uCol; varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(uCol, vA * (1.0 - r) * (1.0 - r)); }' });
    geos.push(pg); mats.push(pm);
    const nube = new THREE.Points(pg, pm); nube.frustumCulled = false; nube.renderOrder = 2; scene.add(im, nube);
    let ip = 0, id = 0, acum = 0;
    const polvo = (x, y, z, vx, vy, vz, s0, s1, vi) => { const i = id = (id + 1) % ND; dp.set([x, y, z], i * 3); dv.set([vx, vy, vz], i * 3); dEd[i] = 0; dVi[i] = vi; dS0[i] = s0; dS1[i] = s1; };
    const terron = (b) => {
      const c = b.c, i = ip = (ip + 1) % NP, k = i * 3, debajo = Math.random() < 0.3, dentro = debajo ? 0.4 + Math.random() * 2.4 : 0.1 + Math.random() * 0.3;
      p[k] = b.x - b.nx * dentro + (Math.random() - 0.5) * 0.5; p[k + 2] = b.z - b.nz * dentro + (Math.random() - 0.5) * 0.5;
      p[k + 1] = c.py + (debajo ? -dentro * 0.8 : Math.random() * GROSOR) * c.sy;
      const sp = 0.3 + Math.random() * 1.7; vel[k] = b.nx * sp; vel[k + 1] = Math.random() * 1.2 - 0.4; vel[k + 2] = b.nz * sp;
      rot.set([Math.random() * 6, Math.random() * 6, Math.random() * 6, (Math.random() - 0.5) * 9], i * 4);
      tam[i] = (0.35 + 1.6 * Math.random() ** 2.2) * (BAJA ? 1.25 : 1); vida[i] = 3; bote[i] = 0;
      if (Math.random() < 0.22) polvo(p[k], p[k + 1], p[k + 2], b.nx * 0.6, -1.2, b.nz * 0.6, 1.5, 4.5, 1.3);
    };
    const q = new THREE.Quaternion(), eu = new THREE.Euler(), pp = new THREE.Vector3(), sc = new THREE.Vector3(), MM = new THREE.Matrix4();
    return {
      im, nube, ESC,
      // (una nube de polvo por todo el contorno de una comarca, al soltarse y al posarse)
      anillo(c, fuerza, vi) { for (let i = (Math.random() * paso) | 0; i < borde.length; i += paso) { const b = borde[i], k = 0.6 + Math.random() * 0.8; if (b.c === c && Math.random() < 0.7) polvo(b.x + b.nx * 0.6, 0.4, b.z + b.nz * 0.6, b.nx * fuerza * k, 0.4 + Math.random() * 0.5, b.nz * fuerza * k, 2.5 * k, 7 * k, vi * k); } },
      // (los fragmentos que se sueltan, más mientras sube: c.suelta, de 0 a 1)
      suelta(dt) {
        acum = Math.min(40, acum + dt * NP / 2.3);
        for (; acum >= 1; acum--) { const b = borde[(Math.random() * borde.length) | 0]; if (Math.random() < b.c.suelta) terron(b); }
      },
      mueve(dt) {
        let vivos = 0;
        for (let i = 0; i < NP; i++) {
          if (vida[i] <= 0) continue;
          const k = i * 3; vida[i] -= dt;
          if (vida[i] <= 0) { im.setMatrixAt(i, M0); continue; }
          vivos++; vel[k + 1] -= 18 * dt; p[k] += vel[k] * dt; p[k + 1] += vel[k + 1] * dt; p[k + 2] += vel[k + 2] * dt;
          const piso = tam[i] * 0.3;
          if (p[k + 1] < piso) {
            p[k + 1] = piso;
            if (bote[i]++ < 1) { vel[k + 1] *= -0.28; vel[k] *= 0.45; vel[k + 2] *= 0.45; rot[i * 4 + 3] *= 0.5; if (tam[i] > 0.8 && Math.random() < 0.5) polvo(p[k], 0.4, p[k + 2], vel[k] * 0.5, 0.5, vel[k + 2] * 0.5, 2, 5.5, 1.1); }
            else { vel[k] = vel[k + 1] = vel[k + 2] = 0; rot[i * 4 + 3] = 0; vida[i] = Math.min(vida[i], 0.9); }
          }
          const w = rot[i * 4 + 3] * dt, s = tam[i] * Math.min(1, vida[i] / 0.5); rot[i * 4] += w; rot[i * 4 + 1] += w * 0.7;
          im.setMatrixAt(i, MM.compose(pp.set(p[k], p[k + 1], p[k + 2]), q.setFromEuler(eu.set(rot[i * 4], rot[i * 4 + 1], rot[i * 4 + 2])), sc.set(s, s * 0.8, s)));
        }
        im.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < ND; i++) {
          if (dVi[i] <= 0) continue;
          const k = i * 3, a = dEd[i] += dt / dVi[i];
          if (a >= 1) { dVi[i] = 0; dA[i] = 0; continue; }
          vivos++; const fr = Math.exp(-dt * 1.6); dv[k] *= fr; dv[k + 2] *= fr; dv[k + 1] = dv[k + 1] * fr + 0.6 * dt;
          dp[k] += dv[k] * dt; dp[k + 1] += dv[k + 1] * dt; dp[k + 2] += dv[k + 2] * dt;
          dS[i] = dS0[i] + (dS1[i] - dS0[i]) * (1 - (1 - a) ** 2); dA[i] = 0.42 * Math.min(1, a * 6) * (1 - a) ** 1.6;
        }
        for (const n of ['position', 'aS', 'aA']) pg.attributes[n].needsUpdate = true;
        return vivos;
      },
    };
  })();

  // ---------- tocar y arrastrar ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
  const aNdc = (e) => { const b = cv.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); return ndc; };
  // (qué hay debajo del dedo: el pueblo cuya chincheta o cuyo nombre queda más cerca en la pantalla y, si no, la comarca.
  // Primero la comarca: con toda Navarra a la vista, tocar cerca de un pueblo lleva a su comarca, y sus pueblos se eligen
  // ya con ella elegida (o con la cámara cerca, donde salen sus nombres). Antes, con las chinchetas tan juntas, casi
  // cualquier toque caía cerca de un pueblo y se iba directo a él)
  const bw = new THREE.Vector3(), PUEBLO_D = 46;
  function quien(e) {
    const b = cv.getBoundingClientRect(), k = b.width / (sz.w || 1) || 1, mx = (e.clientX - b.left) / k, my = (e.clientY - b.top) / k;
    let best = null, bd = (e.pointerType === 'mouse' ? 22 : 30) * Math.max(1, medG * 0.8);   // (los medallones grandes, con una comarca elegida, se tocan en todo su disco)
    for (const t of T) {
      if (t.g.scale.x < 0.3 || (sel ? t.comarca !== sel : v.d > PUEBLO_D)) continue;
      t.bola.getWorldPosition(bw).project(cam); if (bw.z > 1) continue;
      const px = (bw.x + 1) / 2 * sz.w, py = (1 - bw.y) / 2 * sz.h, dd = Math.hypot(px - mx, py - my);
      if (dd < bd) { bd = dd; best = t; }
      if (t.lab._on && t.lab._w) { const ly = t.lab._y ?? py; if (Math.abs(mx - t.lab._x) < t.lab._w / 2 + 4 && my < ly + 4 && my > ly - t.lab._h - 10) { best = t; bd = 0; } }   // (la ficha entera, con su pico)
    }
    if (best) return { t: best.id };
    ray.setFromCamera(aNdc(e), cam);
    const hc = ray.intersectObjects(C.map(c => c.mesh), false)[0]; if (hc) return { c: hc.object.userData.c };
    return null;
  }
  let hover = null, sel = null;
  // (con una comarca elegida, moverse por el mapa a mano lleva a la que queda en el centro: así se va de una a otra con la
  // cámara cerca, sin volver a toda Navarra. navega: se ha movido a mano desde que se eligió; cand: la de debajo del centro
  // y desde cuándo, para que no cambie al rozar una raya)
  let navega = false, cand = null;
  // (una colección en el mapa: la naturaleza, los escudos, los personajes o los torneos, cada cosa en su sitio. Mientras,
  // tocar no vuela ni abre fichas: se le dice a quien la pinta, inicio.js, qué pueblo o qué comarca se ha tocado)
  let COL = null;
  // Un dedo (o el ratón) agarra el mapa: el punto tocado se queda bajo el dedo. Se mide con la cámara de cuando se tocó: con la
  // de cada imagen, varios movimientos del dedo entre imagen e imagen sumaban el arrastre dos veces y el mapa daba saltos. Al
  // soltar, sigue un poco y frena. Dos dedos: pellizcar acerca o aleja hacia el punto de entre los dedos, que se queda debajo
  // de ellos, moverlos arrastra y girarlos gira. Al levantar uno, el otro sigue arrastrando
  const ptrs = new Map(); let arr = null, gesto = null, inercia = null;
  const usado = () => { host.classList.add('m3-usado'); quietoDesde = performance.now(); paseo = null; islaDron = null; };   // (la ayuda de los controles se va en cuanto se usan; y el paseo de dron se para)
  const camT = new THREE.PerspectiveCamera(), sT = { x: 0, z: 0, d: 1, yaw: 0, pitch: 1, hy: 0.8 };
  const aNdcXY = (x, y) => { const b = cv.getBoundingClientRect(); return ndc.set((x - b.left) / b.width * 2 - 1, -((y - b.top) / b.height) * 2 + 1); };
  const sueloCon = (c, x, y) => { ray.setFromCamera(aNdcXY(x, y), c); return ray.ray.intersectPlane(plano, new THREE.Vector3()); };
  // (la cámara de un estado de la vista, aparte, para saber dónde cae con ella un punto de la pantalla)
  const camDe = (s) => { camT.copy(cam); camPos(s, camT.position); camT.lookAt(s.x, s.hy, s.z); camT.updateMatrixWorld(); return camT; };
  const agarra = (id) => { const q = ptrs.get(id), c0 = cam.clone(); plano.constant = -v.hy; goal.x = v.x; goal.z = v.z;
    arr = { id, x: q.x, y: q.y, c0, p: sueloCon(c0, q.x, q.y), x0: v.x, z0: v.z, rot: q.rot, yaw: goal.yaw, pitch: goal.pitch, movido: q.movido, h: [] }; };
  const pellizca = () => { const [a, b] = [...ptrs.values()]; plano.constant = -v.hy;
    gesto = { dist: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), ang: Math.atan2(b.y - a.y, b.x - a.x), s0: { ...v }, p: sueloCon(cam, (a.x + b.x) / 2, (a.y + b.y) / 2) }; };
  function mueveGesto() {
    const [a, b] = [...ptrs.values()], g = gesto, ang = Math.atan2(b.y - a.y, b.x - a.x);
    goal.d = g.s0.d * g.dist / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)); goal.yaw = g.s0.yaw - (ang - g.ang); goal.pitch = g.s0.pitch; lim();
    Object.assign(sT, g.s0, { d: goal.d, yaw: goal.yaw, pitch: goal.pitch });
    const q = g.p && sueloCon(camDe(sT), (a.x + b.x) / 2, (a.y + b.y) / 2);
    goal.x = g.s0.x + (q ? g.p.x - q.x : 0); goal.z = g.s0.z + (q ? g.p.z - q.z : 0); lim(); navega = true;
    for (const k of ['x', 'z', 'd', 'yaw', 'pitch']) v[k] = goal[k];
  }
  const onDown = (e) => {
    if (saltaIntro()) return;
    usado(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    vuelo = null; inercia = null;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, rot: e.button === 2 || e.ctrlKey, movido: false });
    if (ptrs.size === 1) agarra(e.pointerId); else { arr = null; pellizca(); }
  };
  const onMove = (e) => {
    const q = ptrs.get(e.pointerId);
    if (!q) { if (e.pointerType === 'mouse') { const w = quien(e); const h = w?.t ? 't:' + w.t : w?.c ? 'c:' + w.c : null; if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; } } return; }
    q.x = e.clientX; q.y = e.clientY;
    if (gesto && ptrs.size >= 2) { mueveGesto(); return; }
    if (!arr || arr.id !== e.pointerId) return;
    // (hasta que el dedo se mueve unos píxeles es un toque; entonces se agarra desde ahí, sin saltar)
    if (!arr.movido) { if (Math.hypot(q.x - arr.x, q.y - arr.y) <= (e.pointerType === 'mouse' ? 4 : 9)) return; q.movido = true; const r0 = arr; agarra(e.pointerId); arr.movido = true; arr.x = r0.x; arr.y = r0.y; arr.p0 = r0.p; }
    cv.style.cursor = 'grabbing';
    if (!arr.rot) navega = true;
    if (arr.rot) { const b = cv.getBoundingClientRect(); goal.yaw = arr.yaw - (q.x - arr.x) / b.width * 3.2; goal.pitch = arr.pitch + (q.y - arr.y) / b.height * 1.6; lim(); return; }
    const p = arr.p && sueloCon(arr.c0, q.x, q.y); if (!p) return;
    goal.x = arr.x0 + arr.p.x - p.x; goal.z = arr.z0 + arr.p.z - p.z; lim(); v.x = goal.x; v.z = goal.z;
    // (las últimas posiciones, para la inercia al soltar)
    const now = performance.now(); arr.h.push([now, goal.x, goal.z]); while (arr.h.length > 2 && now - arr.h[0][0] > 110) arr.h.shift();
  };
  const onUp = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const era = arr && arr.id === e.pointerId ? arr : null; ptrs.delete(e.pointerId);
    if (ptrs.size >= 2) { pellizca(); return; }
    if (ptrs.size === 1) { gesto = null; const [id] = ptrs.keys(); ptrs.get(id).movido = true; agarra(id); return; }   // (de dos dedos a uno: el que queda sigue)
    arr = null; gesto = null; cv.style.cursor = hover ? 'pointer' : 'grab';
    if (!era) return;
    if (era.movido && !era.rot && e.type === 'pointerup' && era.h.length > 1) {
      const [t0, x0, z0] = era.h[0], [t1, x1, z1] = era.h.at(-1), s = (t1 - t0) / 1000;
      if (s > 0.012 && performance.now() - t1 < 90) { const vx = (x1 - x0) / s, vz = (z1 - z0) / s; if (Math.hypot(vx, vz) > goal.d * 0.12) inercia = { vx, vz }; }
    }
    if (e.type !== 'pointerup' || era.movido || era.rot) return;
    const q = quien(e);
    if (COL?.toque) { COL.toque(q?.t ? { town: q.t } : q?.c ? { comarca: q.c } : null); return; }
    if (q?.t) irPueblo(q.t);
    else if (q?.c) { if (elegido && q.c === sel) cierraPueblo(); else select(q.c); }   // (con un pueblo elegido, tocar su comarca solo cierra su ficha)
    else select(null);
  };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', () => { if (!ptrs.size) hover = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // (la rueda del ratón acerca y aleja; en el panel táctil del portátil, deslizar con dos dedos mueve el mapa, como en
  // los mapas de verdad, y pellizcar acerca: el deslizar llega con desplazamiento a los lados o en fracciones, la rueda no)
  cv.addEventListener('wheel', (e) => {
    e.preventDefault(); if (saltaIntro()) return; usado(); vuelo = null; inercia = null; dron = null;
    if (!e.ctrlKey && e.deltaMode === 0 && (e.deltaX !== 0 || !Number.isInteger(e.deltaY))) {
      const k = goal.d * 0.0016, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      goal.x += (-fz * e.deltaX - fx * e.deltaY) * k; goal.z += (fx * e.deltaX - fz * e.deltaY) * k; lim(); navega = true; return;
    }
    goal.d *= Math.exp(Math.max(-80, Math.min(80, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.0022)); lim();
  }, { passive: false });
  // (Safari en el iPhone: que el pellizco mueva el mapa y no amplíe la página)
  for (const ev of ['gesturestart', 'gesturechange']) cv.addEventListener(ev, (e) => e.preventDefault());

  // teclado: siempre que el mapa esté a la vista, aunque se acabe de tocar otra cosa (una comarca de la fila de abajo, el
  // panel): antes solo con el ratón encima, y al elegir una comarca abajo las flechas ya no movían nada. No mientras se
  // escribe ni con una ficha abierta encima
  const keys = new Set();
  const MOV = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', q: 'ql', e: 'qr', '+': 'in', '=': 'in', '-': 'out' };
  const kd = (e) => { if (e.key === 'Escape' && visible && !document.querySelector('.sheet, .onb, [role="dialog"]:not([hidden])')) { if (saltaIntro()) return; if (elegido) select(sel); else if (sel) vista(); return; }
    const k = MOV[e.key.toLowerCase()];
    // (en la entrada grande, las flechas, el espacio y la tecla de entrar la pasan deprisa)
    if (!(k || e.key === ' ' || e.key === 'Enter') || e.ctrlKey || e.metaKey || e.altKey || !visible || document.hidden || e.target.closest?.('input,textarea,select,[contenteditable="true"]') || document.querySelector('.sheet, .onb, [role="dialog"]:not([hidden])')) return;
    if (saltaIntro()) { e.preventDefault(); return; }
    if (!k) return;
    e.preventDefault(); usado(); vuelo = null; inercia = null; keys.add(k); if ('fblr'.includes(k)) navega = true; };
  const ku = (e) => { const k = MOV[e.key.toLowerCase()]; if (k) keys.delete(k); };
  // (y al perder la ventana, ninguna tecla se queda pulsada; con nombre, para quitarla al soltar el mapa: sin quitar, cada
  // vuelta al menú dejaba otra escucha que guardaba vivo el mapa anterior entero, con sus lienzos)
  const sueltaTeclas = () => keys.clear();
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', sueltaTeclas);

  // los botones de la esquina (mientras se mantienen pulsados)
  const pad = document.createElement('div'); pad.className = 'm3-pad';
  // (solo acercar, alejar y ver toda Navarra: moverse y girar ya van con el dedo, el ratón y el teclado)
  const B = [['in', 'Acercar', 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z'], ['home', 'Ver toda Navarra', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'], ['out', 'Alejar', 'M5 11h14v2H5z']];
  pad.innerHTML = B.map(([k, t, d]) => `<button type="button" class="m3-b b-${k}" data-k="${k}" aria-label="${t}" title="${t}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></button>`).join('');
  host.append(pad);
  pad.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); usado(); vuelo = null; if (b.dataset.k === 'home') { vista(); return; } keys.add(b.dataset.k); try { b.setPointerCapture(e.pointerId); } catch (x) { } const fin = () => { keys.delete(b.dataset.k); b.removeEventListener('pointerup', fin); b.removeEventListener('pointercancel', fin); }; b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); });

  // (un pueblo: si su comarca no estaba elegida, primero la comarca entera; si ya lo estaba, o desde el buscador, de cerca,
  // con su núcleo y lo de alrededor)
  // ---------- elegir un pueblo: la cámara se acerca hasta él y su ficha sale junto a su chincheta ----------
  function irPueblo(id) {
    const t = tById.get(id); if (!t) return;
    if (sel !== t.comarca) select(t.comarca, false);
    elegido = t; o.onTown?.(id);   // (antes de volar: la ficha cambia el hueco donde se encaja)
    nucT = -1e9;   // (su núcleo, en la imagen siguiente: así sus casas se van haciendo durante el vuelo)
    // (los programas de la maqueta, ya al tocar, antes de salir: en el móvil se compilaban a medio vuelo y la cámara se paraba)
    if (!calentado) calienta();
    normaYaw();
    // (hasta lo más cerca, casi a la altura de los tejados y de lado, para ver sus casas en pie; los bosques, sin maqueta,
    // desde algo más arriba). Al llegar, el vuelo de dron
    // (los espacios naturales, sin maqueta, con la cámara del lado de dentro de su comarca y más desde arriba: casi todos
    // están junto a su borde, y de lado, o desde fuera, se veía la pared de la comarca y el fondo negro detrás)
    const real = TR.includes(t), d = real ? DRON_D : 2.2, pitch = real ? 0.5 : 1.02, c = byId.get(t.comarca);
    const yaw = real || !c ? v.yaw : Math.atan2(c.mid.x - t.X, c.mid.z - t.Z);
    // (en los pueblos, al corazón de sus casas, si ya están cargadas; si no, a su chincheta, y al llegar las casas se va
    // corriendo poco a poco hasta ellas: sigueDron)
    const cc = real ? centroCasas(t.id) : null;
    dron = { t: 0, id: t.id, X: cc?.X ?? t.X, Z: cc?.Z ?? t.Z, vx: 0, vz: 0, cc, d, pitch, yaw, real, listo: false };
    dron.perfil = perfilDron(dron); dron.p0 = dron.perfil[0];
    // (y el vuelo hasta él, más tranquilo: de toda Navarra a los tejados en dos segundos y medio parecía un salto)
    volar({ x: dron.X, z: dron.Z, d, yaw, pitch: dron.p0 }, Math.min(4.2, 1.8 + 0.26 * Math.log2(Math.max(1, v.d / d)))); vuelo.dron = dron;
  }
  // ---------- el vuelo de dron sobre el pueblo elegido ----------
  // La cámara pasa por encima del pueblo muy despacio, como un dron: le da la vuelta poco a poco (una vuelta en tres
  // minutos), se acerca y se aleja un poco y va y viene sobre sus calles, sin perderlo nunca de vista. Los espacios
  // naturales, sin dar la vuelta: van y vienen en un arco mirando hacia dentro de su comarca. Empieza al acabar el vuelo
  // hasta él y se para en cuanto se toca el mapa, se mueve con las teclas o la rueda, o se cierra el pueblo.
  // Todos sus vaivenes son múltiplos de la vuelta (DRON_W), así que cada vuelta es igual a la anterior y su inclinación se
  // calcula una vez, antes de salir (perfilDron)
  const DRON_D = 0.18;   // (cerca, casi entre los tejados: de más lejos el pueblo se veía pequeño)
  const DRON_W = 2 * Math.PI / 180, DRON_PASO = 1.5, DRON_N = Math.round(2 * Math.PI / DRON_W / DRON_PASO), DRON_T = 6;
  let dron = null;
  // (el corazón de un pueblo: el centro de sus casas, contando más las grandes, y luego solo las que quedan a menos de
  // 350 m de él, sin los polígonos ni los caseríos sueltos; en unidades del mapa. La chincheta a veces queda a un lado)
  function centroCasas(id) {
    const e = nuc.get(id), C = e?.D?.casas; if (!C?.length || e.X0 == null) return null;
    let cx = 0, cz = 0;
    for (let pasada = 0; pasada < 2; pasada++) {
      let sx = 0, sz = 0, sw = 0;
      for (const b of C) { if (pasada && Math.hypot(b.x - cx, b.z - cz) > 350) continue; const w = Math.min(b.w * b.d, 600); sx += b.x * w; sz += b.z * w; sw += w; }
      if (sw) { cx = sx / sw; cz = sz / sw; }
    }
    return { X: e.X0 + cx * MU, Z: e.Z0 + cz * MU };
  }
  // (dónde está el dron a los u segundos, sin contar su inclinación; k: arranca poco a poco, en DRON_T segundos, sin
  // tirones: el giro va cogiendo velocidad, en vez de doblarla y luego bajarla de golpe a los 4 s como antes. El vaivén sobre
  // el pueblo, de unos 40 m: con 170 m, en Aoiz el centro de la vista acababa en el prado y el pueblo, en una esquina)
  const posDron = (D, u) => {
    const s = Math.min(1, u / DRON_T), k = s * s * (3 - 2 * s), r = D.d * (D.real ? 0.1 : 0.2);
    const giro = u < DRON_T ? u * u * u / (DRON_T * DRON_T) - u ** 4 / (2 * DRON_T ** 3) : u - DRON_T / 2;   // (lo girado: la integral de k)
    return { x: D.X + Math.sin(u * 2 * DRON_W) * r * k, z: D.Z + Math.sin(u * 3 * DRON_W + 1.1) * r * 0.7 * k, d: D.d * (1 + 0.18 * Math.sin(u * 2 * DRON_W) * k),
      yaw: D.real ? D.yaw + giro * DRON_W : D.yaw + 0.45 * Math.sin(u * DRON_W) * k, k };
  };
  // (lo exagerado del relieve a cada distancia de la cámara: el mismo cálculo que en cada imagen)
  // (desde noviembre de 2026, con el relieve fino en la comarca elegida, algo más alto a la distancia de una comarca: los
  // montes ya no salen en aguja; y su vista, algo más de lado, PITCH_C, para que se vean sus siluetas. Antes, 0,45 y 0,95)
  const ROCA_BORDE = new THREE.Color('#a68d6e'), PITCH_C = 0.82, PITCH_ISLA = 0.3, PITCH_ALTA = 0.74, exaDe = (d) => d >= 4 ? 0.52 + 0.48 * Math.min(1, Math.max(0, (d - 8) / 32)) : 0.3 + 0.22 * Math.min(1, Math.max(0, (d - 1.5) / 2.5));
  const nearDe = (d) => Math.max(Math.min(0.5, d * 0.2), d * 0.1 - 1.5);
  // (lo que le falta a una vista para no tocar el relieve, con este ya a la exageración de esa distancia)
  const _cpH = new THREE.Vector3();
  function holgura(X, Z, d, yaw, pitch, exa) {
    // (la línea hasta el pueblo, con algo de holgura, sin contar el último tramo junto a él: en un valle, la ladera de al lado
    // del pueblo ya tapa un poco y no pasa nada; y la cámara, con el margen de su plano cercano, abajo)
    const cT = deQuien(X, Z), hy = cT ? pisoEn(cT, X, Z) * exa : 0, cp = camPos({ x: X, z: Z, d, yaw, pitch, hy }, _cpH), m = 0.004 + d * 0.03 + nearDe(d) * 0.3;
    let need = 0;
    for (let k = 10; k >= 4; k--) { const f = k / 10, x = X + (cp.x - X) * f, z = Z + (cp.z - Z) * f, c = deQuien(x, z); if (!c) continue;
      const g = pisoEn(c, x, z) * exa + m, y = hy + (cp.y - hy) * f; if (y < g) need = Math.max(need, hy + (g - hy) / f - cp.y); }
    const nr = nearDe(d);   // (y alrededor de la cámara, como despeje)
    for (let a = 0; a < 6; a++) { const x = cp.x + Math.cos(a * 1.0472) * nr * 1.5, z = cp.z + Math.sin(a * 1.0472) * nr * 1.5, c = deQuien(x, z); if (!c) continue;
      const g = pisoEn(c, x, z) * exa + nr * 1.1; if (cp.y < g) need = Math.max(need, g - cp.y); }
    return need;
  }
  // (la inclinación del dron en cada momento de su vuelta, para que nunca se meta en el monte: se prueba la vuelta entera,
  // cada segundo y medio, buscando la menos inclinada con la que el relieve no se cruza; luego se ensancha y se suaviza,
  // para que suba antes de llegar al monte y baje despacio después. Antes iba siempre a 0,5 y, en los pueblos entre montes
  // (Lesaka, Leitza, Lekunberri, Orreaga, Ujué), la cámara saltaba hacia arriba de golpe una y otra vez)
  function perfilDron(D) {
    const P = new Float32Array(DRON_N), exa = exaDe(D.d), ok = (g, p) => holgura(g.x, g.z, g.d, g.yaw, p, exa) <= g.d * 0.02;
    for (let i = 0; i < DRON_N; i++) {
      const g = posDron(D, i * DRON_PASO); let lo = D.pitch, hi = 1.3;
      if (ok(g, lo)) { P[i] = lo; continue; }
      if (!ok(g, hi)) { P[i] = hi; continue; }
      for (let it = 0; it < 6; it++) { const mid = (lo + hi) / 2; if (ok(g, mid)) hi = mid; else lo = mid; }
      P[i] = Math.min(1.3, hi + 0.04);
    }
    const A = P.map((_, i) => { let m = 0; for (let j = -3; j <= 3; j++) m = Math.max(m, P[(i + j + DRON_N) % DRON_N]); return m; });
    return A.map((_, i) => { let s = 0; for (let j = -3; j <= 3; j++) s += A[(i + j + DRON_N) % DRON_N]; return s / 7; });
  }
  // (la inclinación del perfil a los u segundos, con una curva suave entre sus puntos: con rectas, cada segundo y medio
  // cambiaba de golpe la velocidad a la que se inclinaba)
  const enPerfil = (P, u) => { const q = ((u / DRON_PASO) % DRON_N + DRON_N) % DRON_N, i = Math.floor(q), f = q - i, a = P[(i + DRON_N - 1) % DRON_N], b = P[i], c = P[(i + 1) % DRON_N], d = P[(i + 2) % DRON_N];
    return b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a))); };
  function sigueDron(dt) {
    // (si las casas llegan después, el dron se va corriendo hasta su corazón, despacio y sin tirón, arrancando y frenando
    // como un muelle amortiguado; y su inclinación pasa poco a poco a la calculada allí, en 2 s. Antes saltaba a la nueva y
    // empezaba a correrse de golpe: si llegaban a medio vuelo, al acabar este la cámara pegaba un tirón hasta el centro)
    if (dron.real && !dron.cc) { const cc = centroCasas(dron.id); if (cc) { dron.cc = cc; dron.antes = dron.perfil; dron.mezP = 0; dron.perfil = perfilDron({ ...dron, X: cc.X, Z: cc.Z }); } }
    if (dron.cc) { const w = 1.6; dron.vx += (w * w * (dron.cc.X - dron.X) - 2 * w * dron.vx) * dt; dron.vz += (w * w * (dron.cc.Z - dron.Z) - 2 * w * dron.vz) * dt; dron.X += dron.vx * dt; dron.Z += dron.vz * dt; }
    if (dron.antes) { dron.mezP = Math.min(1, dron.mezP + dt / 2); }
    const incl = (u) => { const p = enPerfil(dron.perfil, u); return dron.antes ? mezcla(enPerfil(dron.antes, u), p, ease(dron.mezP)) : p; };
    if (dron.antes && dron.mezP >= 1) dron.antes = null;
    dron.p0 = incl(0);   // (a donde acaba el vuelo hasta él: frame)
    if (!dron.listo) { if (vuelo) return; dron.listo = true; }
    const u = (dron.t += dt), g = posDron(dron, u);
    goal.x = g.x; goal.z = g.z; goal.d = g.d; goal.yaw = g.yaw;
    goal.pitch = incl(u) + 0.03 * Math.sin(u * 3 * DRON_W) * g.k;
  }
  function cierraPueblo() { dron = null; if (!elegido) return; elegido = null; o.onTown?.(null); }
  // (toda Navarra, desde arriba)
  function vista() { select(null); volar(casa(), 1.1); }

  // ---------- el paseo de dron por Navarra ----------
  // En el inicio, con el mapa quieto unos segundos y nada elegido, la cámara baja, se acerca y recorre Navarra despacio de
  // norte a sur, como un dron: del Baztan y el Pirineo a la Ribera, y vuelve; se inclina para que se vea el relieve y se
  // mece un poco. Se para con cualquier toque, tecla o rueda y al elegir una comarca o un pueblo (se queda donde está), y
  // vuelve a los 10 s sin tocar nada. Antes Navarra se veía entera, pero pequeña encima de la tira de comarcas
  let paseo = null, islaDron = null, quietoDesde = performance.now(), paseoVisto = false;   // (la primera vez empieza a los 3 s)
  // (sin paseo con «menos movimiento» en el sistema; ni en el navegador de las pruebas, como la entrada, salvo que lo pidan)
  const MOV_REDUCIDO = matchMedia?.('(prefers-reduced-motion: reduce)').matches || (navigator.webdriver && !window.__paseo);
  // (el recorrido: la línea por el medio de Navarra, de su punta norte a la sur, por los centros de las comarcas)
  const rutaDron = (() => {
    const M = C.map(c => c.mid), z0 = Math.min(...M.map(m => m.z)) + 2, z1 = Math.max(...M.map(m => m.z)) - 2, P = [];
    for (let i = 0; i <= 24; i++) { const z = z0 + (z1 - z0) * i / 24; let sx = 0, sw = 0; for (const m of M) { const w = Math.exp(-((m.z - z) ** 2) / (2 * 14 * 14)); sx += m.x * w; sw += w; } P.push({ x: sw ? sx / sw : centro.x, z }); }
    let L = 0; for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z); P[i].l = L; } P[0].l = 0;
    return { P, L };
  })();
  const enRuta = (l) => { const P = rutaDron.P; for (let i = 1; i < P.length; i++) if (P[i].l >= l) { const a = P[i - 1], b = P[i], k = (l - a.l) / (b.l - a.l || 1); return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }; } return P.at(-1); };
  function sigueDronNavarra(dt) {
    const p = paseo; p.t += dt;
    const vel = Math.max(1.2, rutaDron.L / 42), ida = (p.t * vel) % (2 * rutaDron.L), l = ida < rutaDron.L ? ida : 2 * rutaDron.L - ida;   // (unos 42 s de ida y otros tantos de vuelta)
    const q = enRuta(l), base = p.base, k = ease(Math.min(1, p.t / 3.5));   // (al empezar, de la vista de toda Navarra al vuelo, poco a poco)
    const d = base.d * 0.4, pitch = 0.74 + 0.04 * Math.sin(p.t * 0.21), yaw = 0.12 * Math.sin(p.t * 0.09);
    goal.x = mezcla(base.x, q.x, k); goal.z = mezcla(base.z, q.z, k); goal.d = Math.exp(mezcla(Math.log(base.d), Math.log(d), k));
    goal.pitch = mezcla(base.pitch, pitch, k); goal.yaw = mezcla(base.yaw, yaw, k);
  }
  // (y sobre la isla de la comarca elegida, ya vista desde arriba: un vuelo de dron suave, que la recorre despacio, se acerca
  // y se aleja un poco y se mece; se para con cualquier toque, como el paseo. Lo pidió el autor: que la cámara acabe encima
  // del territorio «con ese vuelo de dron»)
  function sigueDronIsla(dt) {
    const p = islaDron; p.t += dt; const c = p.c, r = c.isla.rMed * 0.2, k = ease(Math.min(1, p.t / 3)), t = p.t;
    goal.x = p.base.x + r * Math.sin(t * 0.11) * k; goal.z = p.base.z + r * 0.6 * Math.sin(t * 0.07 + 1) * k;
    goal.d = p.base.d * (1 - 0.14 * (0.5 - 0.5 * Math.cos(t * 0.08)) * k);
    goal.yaw = p.base.yaw + 0.16 * Math.sin(t * 0.09) * k; goal.pitch = p.base.pitch + 0.04 * Math.sin(t * 0.17) * k;
  }
  // ---------- una colección en el mapa ----------
  // cfg: { items: [{ el, town | comarca, sel }], resalta: Set de comarcas (las demás, al fondo) | null, pines: Set de
  // pueblos con su chincheta | null, toque({ town } | { comarca } | null) }; null la quita. Los marcadores (el) son nombres
  // más del mapa: se colocan cada imagen sin pisarse con nada
  function coleccion(cfg) {
    if (COL) for (const it of COL.items) it.el.remove();
    if (!cfg) { COL = null; host.classList.remove('con-col'); return; }
    if (sel) select(null, false); cierraPueblo();
    COL = { ...cfg, items: cfg.items.map(it => ({ ...it, t: it.town ? tById.get(it.town) : null, c: it.comarca ? byId.get(it.comarca) : null })).filter(it => it.t || it.c) };
    for (const it of COL.items) { it.el.classList.add('fuera'); capa.append(it.el); }
    host.classList.add('con-col');
  }
  // (la cámara, para que se vea todo lo de una cosa: sus comarcas enteras o sus pueblos; sin nada, toda Navarra)
  function encuadra({ comarcas = [], towns = [] } = {}) {
    const esq = [];
    for (const id of comarcas) { const c = byId.get(id); if (c) esq.push(...c.esq); }
    for (const id of towns) { const t = tById.get(id); if (t) for (const [a, b] of [[-3, -3], [3, 3]]) esq.push(new THREE.Vector3(t.X + a, 0, t.Z + b)); }
    if (!esq.length) return vista();
    const mx = esq.reduce((a, q) => a + q.x, 0) / esq.length, mz = esq.reduce((a, q) => a + q.z, 0) / esq.length;
    volar({ x: mx, z: mz, d: Math.max(22, encaja(esq, mx, mz, PITCH_C, 1)), yaw: 0, pitch: PITCH_C });
  }
  // ---------- elegir una comarca: vuela hasta ella y se levanta ----------
  // ---------- el vídeo de la isla (Higgsfield) ----------
  // La primera vez que se elige una comarca que lo tiene, en una pantalla apaisada: la cámara va a la vista con que se
  // sacaron los fotogramas del vídeo, con la isla aún abajo y sin rótulos; ahí el vídeo se pone encima del mapa (debajo de
  // los rótulos y de lo de encima) y, mientras se ve, la isla sube de verdad detrás; al acabar se funde y queda el 3D, que
  // está igual que su último fotograma. Tocarlo lo salta. Si no llega a tiempo, la isla sube como siempre (13 de noviembre de
  // 2026: el autor pidió juntar Higgsfield con el mapa para que la tierra se desprenda)
  const vistosV = new Set(), FOV0 = cam.fov; let tv = null;
  function quitaVideoIsla(fundir) {
    if (!tv) return; const { vid } = tv; tv = null; capa.style.visibility = ''; capa.style.opacity = '';
    const fuera = () => { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.remove(); };
    if (fundir) { vid.style.transition = 'opacity 1.4s ease-in-out'; vid.style.opacity = '0'; setTimeout(fuera, 1500); } else fuera();   // (el paso al 3D, muy gradual: no se tiene que notar)
  }
  function videoIsla(c) {
    const P = VIDEOS_ISLA[c.id], A = (host.clientWidth || 1) / (host.clientHeight || 1);
    if (!P || vistosV.has(c.id) || !puedenVideos() || A < 1.3 || SUAVE || COL || window.__sinVideoIsla) return false;   // (__sinVideoIsla: para sacar sus fotogramas)
    vistosV.add(c.id);
    const vid = document.createElement('video'); vid.className = 'm3-vi'; vid.muted = true; vid.playsInline = true; vid.preload = 'auto';
    vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.src = `./videos/islas/${c.id}.mp4`;
    // (de alto, todo el mapa, como la cámara; si la pantalla es más ancha que el vídeo, de ancho, y la cámara se cierra un poco)
    const w = A <= P.ar ? P.ar / A * 100 : 100, h = A <= P.ar ? 100 : A / P.ar * 100;
    Object.assign(vid.style, { width: w + '%', height: h + '%', left: (100 - w) / 2 + '%', top: (100 - h) / 2 + '%', opacity: '0' });
    cv.after(vid);
    vid.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (tv?.vid === vid && tv.fase === 'video') tv.fin = true; });
    tv = { c, vid, fase: 'vuelo', t: 0, fov: 2 * Math.atan(Math.tan(FOV0 * Math.PI / 360) * Math.min(1, P.ar / A)) * 180 / Math.PI };
    capa.style.transition = 'opacity .4s'; capa.style.opacity = '0';
    volar({ x: P.x, z: P.z, d: P.d, yaw: P.yaw, pitch: P.pitch }, 1.1);
    return true;
  }
  function select(id, fly = true, moviendo = false) {
    const c = id && byId.get(id);
    if (tv && tv.c !== c) quitaVideoIsla(false);
    sel = c ? c.id : null; cierraPueblo(); navega = moviendo; cand = null;
    host.classList.toggle('con-sel', !!c);
    for (const x of C) { x.lab.classList.toggle('sel', x.id === sel); x.lab.classList.toggle('fondo', !!sel && x.id !== sel); }
    o.onSelect?.(sel);   // (antes de volar: el panel que se abre cambia el hueco donde se encaja)
    if (c && !calentado) calienta();   // (al tocar, con la cámara aún quieta; no a medio vuelo: maqueta)
    // (solo al elegirla volando: la ficha vuelve a llamar aquí sin vuelo, y eso no tiene que quitar la subida ni el dron)
    if (fly || !c) islaDron = null; if (c) { islaDe(c); if (fly) { c.vistaAlta = false; c.tAlta = 0; c.dronPend = false; } }
    if (c && fly && !videoIsla(c)) { const I = c.isla, esq = c.esq.map(q => q.clone().setY(q.y > 0.5 ? q.y + I.alto : I.alto - I.D));
      const hyI = c.alzado + I.alto + (GROSOR + c.hmax * 0.4 - I.D) / 2;
      volar({ x: c.mid.x, z: c.mid.z, d: Math.max(18, encaja(esq, c.mid.x, c.mid.z, PITCH_ISLA, 1, hyI)), yaw: 0, pitch: PITCH_ISLA }); }
  }

  // ---------- el relieve fino ----------
  // El de las comarcas que se ven de cerca (la elegida primero y, al acercarse, las de alrededor), unas pocas a la vez: en
  // el móvil, dos y a 56 m; en el ordenador, cuatro y a 28 m. Al llegar entra poco a poco sobre el de siempre, y la que
  // hace más que no se ve se suelta. Si no llega (en el archivo único, sin conexión), se vuelve a probar a los 15 s. Se
  // piden de una en una y solo con la cámara quieta, y la imagen se descomprime aparte (createImageBitmap): al moverse
  // por el mapa no hay tirones
  const MAXD = BAJA ? 2 : 4, carga = new THREE.TextureLoader().setCrossOrigin('anonymous'), det = new Map(), aniso = Math.min(8, r.capabilities.getMaxAnisotropy());
  const textura = (u) => (typeof createImageBitmap === 'function' ? fetch(u, { credentials: 'omit' }).then(x => x.ok ? x.blob() : Promise.reject())
    .then(b => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then(im => new THREE.Texture(im)) : Promise.reject())
    .catch(() => new Promise((ok, mal) => carga.load(u, ok, undefined, mal)));
  const suelta = (tx) => { tx.dispose(); tx.image?.close?.(); };
  let detT = -1e9, pidiendo = 0;
  // (la ortofoto de cerca de una comarca, en la rejilla de su relieve: la de la elegida, a 28 m; en el ordenador, también la
  // de las de alrededor, a 56 m. Si no llega, se queda la de toda Navarra)
  const quiereOrto = (id) => id === sel || !TACTIL;
  const cargaOrto = (id, e) => { e.pidOrto = true;
    urlOrto(id, id === sel && !BAJA || id === sel && TACTIL).then(u => u ? textura(u) : Promise.reject()).then(to => {
      e.pidOrto = false; if (!vivo || det.get(id) !== e || !quiereOrto(id)) { suelta(to); return; }
      to.flipY = false; to.colorSpace = THREE.NoColorSpace; to.anisotropy = aniso; to.needsUpdate = true;
      e.orto = to; byId.get(id).top.uniforms.uOrtoD.value = to;
    }).catch(() => { e.pidOrto = false; }); };
  const lejosDe = (c) => Math.hypot(c.mid.x - v.x, c.mid.z - v.z);
  function detalles(now, quieto) {
    // (con la cámara en marcha, solo el de la comarca elegida, si aún no está: el dron vuela hacia ella y, si se esperaba a
    // que parara, llegaba con el monte borroso)
    if (now - detT < 400) return;
    if (!quieto && !(sel && MAPA_RELIEVE.detalle[sel] && !det.get(sel) && !pidiendo)) return;
    detT = now;
    const cerca = quieto && v.d < 80 ? C.filter(c => MAPA_RELIEVE.detalle[c.id] && lejosDe(c) < v.d * 0.6 + 14).sort((a, b) => lejosDe(a) - lejosDe(b)) : [];
    if (sel) { const i = cerca.findIndex(c => c.id === sel); if (i >= 0) cerca.splice(i, 1); if (MAPA_RELIEVE.detalle[sel]) cerca.unshift(byId.get(sel)); }
    const quiere = new Set(cerca.slice(0, MAXD).map(c => c.id));
    for (const id of quiere) {
      let e = det.get(id); if (e?.fallo && now > e.fallo) { det.delete(id); e = null; }
      if (e) { e.t = now; if (e.tex && !e.orto && !e.pidOrto && quiereOrto(id)) cargaOrto(id, e); continue; }
      if (pidiendo) continue;
      det.set(id, e = { t: now, tex: null, fallo: 0 }); pidiendo++;
      // (en el móvil, la comarca elegida también a 28 m: a 56 m, de cerca, el monte se veía borroso; las de alrededor, a 56 m,
      // que con la ortofoto no cabían en los 80 MB de texturas del iPhone)
      urlDetalle(id, !BAJA && !TACTIL || id === sel).then(u => u ? textura(u) : Promise.reject()).then(tx => {
        pidiendo--; if (!vivo || det.get(id) !== e) { suelta(tx); return; }
        tx.flipY = false; tx.colorSpace = THREE.NoColorSpace; tx.anisotropy = aniso; tx.needsUpdate = true;
        e.tex = tx; byId.get(id).top.uniforms.uDet.value = tx;
        if (quiereOrto(id)) cargaOrto(id, e);
      }).catch(() => { pidiendo = Math.max(0, pidiendo - 1); e.fallo = performance.now() + 15000; });
    }
    // (en el móvil, la ortofoto de cerca solo en la elegida: la de las demás se suelta)
    for (const [id, e] of det) if (e.orto && !quiereOrto(id)) { const u = byId.get(id).top.uniforms; u.uOrtoD.value = nada; u.uOrtoDK.value = 0; suelta(e.orto); e.orto = null; }
    // (las que sobran, primero las que hace más que no se ven)
    const sobran = [...det].filter(([id, e]) => !quiere.has(id) && e.tex).sort((a, b) => a[1].t - b[1].t);
    let n = [...det.values()].filter(e => e.tex).length;
    for (const [id, e] of sobran) { if (n <= MAXD + 1) break; const u = byId.get(id).top.uniforms; u.uDet.value = nada; u.uDetK.value = 0; u.uOrtoD.value = nada; u.uOrtoDK.value = 0; suelta(e.tex); if (e.orto) suelta(e.orto); det.delete(id); n--; }
  }

  // ---------- el relieve fino de la comarca elegida ----------
  // Con la imagen del relieve fino ya leída (finoEn), la comarca elegida se rehace con una malla unas cuatro veces más densa
  // y cada punto sube o baja lo que dice: las sierras toman su forma de verdad. Junto a su borde, a cero, para que case con
  // sus paredes y con las vecinas; sus ríos, sus árboles, sus medallones y los nombres de sus montes suben o bajan con ella,
  // y la cámara también. Entra y sale suave (fk, de 0 a 1); con la maqueta de un pueblo, se va. Se hace con la cámara
  // quieta, en tres pasos (la distancia al borde, la malla y lo demás), y se guardan las de las tres últimas comarcas
  const DENSO = BAJA ? 0.1 : 0.075, finosHechos = [];
  const bordeDe = (c) => {
    if (c.bordeF) return c.bordeF;
    const b = c.gGrueso.boundingBox, P = c.Pw, st = 0.15, x0 = b.min.x - st, z0 = b.min.z - st, nx = Math.ceil((b.max.x - x0) / st) + 2, nz = Math.ceil((b.max.z - z0) / st) + 2, D = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * st, z = z0 + j * st; let m = 1e9;
      for (let a = 0, e = P.length - 1; a < P.length; e = a++) { const ax = P[e][0], az = P[e][1], dx = P[a][0] - ax, dz = P[a][1] - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1e-9))), ex = ax + dx * t - x, ez = az + dz * t - z, d2 = ex * ex + ez * ez; if (d2 < m) m = d2; }
      D[j * nx + i] = Math.sqrt(m);
    }
    return (c.bordeF = (x, z) => { const gx = Math.max(0, Math.min(nx - 1.001, (x - x0) / st)), gz = Math.max(0, Math.min(nz - 1.001, (z - z0) / st)), i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j, k = j * nx + i;
      return suave(0.12, 0.75, (D[k] * (1 - fx) + D[k + 1] * fx) * (1 - fz) + (D[k + nx] * (1 - fx) + D[k + nx + 1] * fx) * fz); });
  };
  function hazFino(c) {
    const f = bordeDe(c), dh = c.dhF = (x, z) => finoEn(x, z) * f(x, z);
    if (!c.gFino) {
      const { g } = losa(c.Pw, alto, DENSO), pa = g.attributes.position.array, a = new Float32Array(pa.length / 3);
      for (let v = 0; v < a.length; v++) if (pa[v * 3 + 1] > 0.01) a[v] = dh(pa[v * 3], pa[v * 3 + 2]);
      g.setAttribute('aFino', new THREE.BufferAttribute(a, 1)); c.gFino = g;
      finosHechos.push(c);
      while (finosHechos.length > 3) { const i = finosHechos.findIndex(o2 => o2 !== c && o2.mesh.geometry !== o2.gFino); if (i < 0) break; const o2 = finosHechos.splice(i, 1)[0]; o2.gFino.dispose(); o2.gFino = null; }
      return;   // (lo demás, en el paso siguiente: así ninguno se come más de un par de imágenes)
    }
    // (los ríos y los árboles se pusieron sobre la rejilla gruesa: pasan a la altura de los datos y suben o bajan con el fino)
    if (c.rioG) { const p = c.rioG.attributes.position.array, a = c.rioG.attributes.aFino; for (let v = 0; v < a.count; v++) { const x = p[v * 3], z = p[v * 3 + 2]; a.array[v] = alto(x, z) - sobre(c, x, z) + dh(x, z); } a.needsUpdate = true; }
    if (c.arboles) { const { im, L } = c.arboles, a = im.geometry.attributes.aFinoI; L.forEach(([X, , Z], n) => { a.array[n] = alto(X, Z) - sobre(c, X, Z) + dh(X, Z); }); a.needsUpdate = true; }
    // (el bosque denso: en la elegida, muchos más árboles donde hay bosque, sobre el relieve fino; salen con él)
    if (!c.bosqueFino) {
      let sem = 11 + c.d * 997; const az = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
      const b = c.gGrueso.boundingBox, tx = BOSQ.w / BOSQ.nx, ty = BOSQ.h / BOSQ.ny, dens = BAJA ? 7 : 14, L = [];
      const i0 = Math.max(0, Math.floor(((b.min.x / S + CX) - BOSQ.x0) / tx)), i1 = Math.min(BOSQ.nx - 1, Math.ceil(((b.max.x / S + CX) - BOSQ.x0) / tx));
      const j0 = Math.max(0, Math.floor(((b.min.z / S + CY) - BOSQ.y0) / ty)), j1 = Math.min(BOSQ.ny - 1, Math.ceil(((b.max.z / S + CY) - BOSQ.y0) / ty));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = bqD[j * BOSQ.nx + i] / 255; if (k < 0.3) continue;
        for (let n = Math.floor(k * k * dens + az()); n > 0; n--) { const [X, Z] = W(BOSQ.x0 + (i + az()) * tx, BOSQ.y0 + (j + az()) * ty); if (f(X, Z) > 0.05 && enPoligono(c.Pw, X, Z)) L.push([X, Z]); }
      }
      if (L.length) {
        const im = new THREE.InstancedMesh(arbolG.clone(), arbolM(c, c.arbolFondo || { value: 0 }, true), L.length), a = new Float32Array(L.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Vector3(), col = new THREE.Color();
        L.forEach(([X, Z], n) => { const mt = alto(X, Z) / EXA, sc = 0.55 + az() * 0.45, hi = mt > 900;
          im.setMatrixAt(n, m4.compose(e3.set(X, GROSOR + alto(X, Z), Z), q, new THREE.Vector3(sc, sc * (hi ? 1.2 : 0.9), sc))); a[n] = dh(X, Z);
          im.setColorAt(n, col.set(hi ? '#2f5a36' : '#4f803c').offsetHSL((az() - 0.5) * 0.04, 0, (az() - 0.5) * 0.12)); });
        im.geometry.setAttribute('aFinoI', new THREE.InstancedBufferAttribute(a, 1)); im.raycast = () => {}; im.frustumCulled = false; c.mesh.add(im); c.bosqueFino = im; geos.push(im.geometry);
      }
    }
    for (const x of T) if (x.c === c) x.dh = dh(x.X, x.Z);
    for (const x of N) if (x.c === c) x.dh = dh(x.X, x.Z);
    for (const x of PK) if (x.c === c) x.dh = dh(x.X, x.Z);
    c.finoListo = true;
  }
  let finoT = 0;
  function finos(dt, now, quieto) {
    const quiere = finoD && sel && !COL && !maq?.malla ? byId.get(sel) : null;
    if (quiere && !quiere.finoListo && quieto && now - finoT > 250) { const t0 = performance.now(); if (!quiere.bordeF) bordeDe(quiere); else hazFino(quiere); finoT = performance.now(); (quiere.finoMs ||= []).push(Math.round(finoT - t0)); }   // (tres pasos: el borde, la malla y lo demás)
    for (const c of C) {
      const want = c === quiere && c.finoListo && c.gFino ? 1 : 0;
      if (want && c.mesh.geometry !== c.gFino) c.mesh.geometry = c.gFino;
      c.fk.value += (want - c.fk.value) * (1 - Math.exp(-dt * (want ? 2.2 : 5)));
      if (!want && c.fk.value < 0.004 && c.fk.value) { c.fk.value = 0; if (c.mesh.geometry !== c.gGrueso) c.mesh.geometry = c.gGrueso; }
      if (!c.gFino && c.finoListo) c.finoListo = false;   // (soltada: se rehace si se vuelve a elegir)
      if (c.bosqueFino) c.bosqueFino.visible = c.fk.value > 0.01;
    }
  }

  // ---------- los núcleos de los pueblos, al acercarse ----------
  // Solo los pueblos del juego, con su trazado de verdad (src/data/reales: casas, calles, ríos y plazas de OpenStreetMap):
  // al acercarse, su núcleo pintado sobre el relieve (las calles, las plazas, el agua y los tejados con su sombra) y, más
  // cerca aún, cada casa en pie. Los de alrededor, de uno en uno y con la cámara quieta; los lejanos se sueltan
  const REALES = new Set(MAPA_IDS), MU = 1 / 2076;   // (metros → unidades del mundo: una unidad son 2.076 m)
  const NUC_LEJOS = 26, NUC_CERCA = 16, CASAS_D = 10;
  const nuc = new Map(), cajaG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); geos.push(cajaG);
  let nucT = -1e9, nucPide = 0;
  // (el color de cada tejado: teja o pizarra en las casas, chapa gris en naves y fábricas, piedra en iglesias, torres,
  // castillos, palacios, murallas, kioscos y lavaderos)
  const tono = (b, pizarra) => { const v = ((b.x * 7 + b.z * 13) % 9 + 9) % 9 / 9;
    // (de barro cocido, como en la maqueta: maqueta.js PAL; las naves, gris cálido y no azulado)
    return b.k === 'industrial' || b.k === 'shed' ? [0.09, 0.12, 0.6 + v * 0.08] : ['church', 'tower', 'palacio', 'castillo', 'muralla', 'kiosko', 'lavadero', 'pabellon'].includes(b.k) ? [0.09, 0.22, 0.56 + v * 0.06]
      : pizarra ? [0.04, 0.08, 0.32 + v * 0.1] : [0.035 + v * 0.02, 0.6, 0.47 + v * 0.07]; };
  // (el núcleo pintado: un lienzo de un metro y medio por píxel, tres en el móvil, y el doble de fino en la maqueta; los
  // campos, huertas y parques, las calles y los ríos con su ancho de verdad, los puentes, la cancha de los frontones y
  // los tejados, de teja en casi toda Navarra y de pizarra en el Pirineo; hacia el borde se funde con el relieve)
  const USO = { cultivo: 'rgba(222, 204, 140, .55)', huerta: 'rgba(118, 168, 84, .6)', prado: 'rgba(140, 192, 98, .45)', vina: 'rgba(160, 150, 92, .55)', frutales: 'rgba(122, 165, 86, .55)',
    cesped: 'rgba(134, 192, 106, .6)', parque: 'rgba(110, 170, 92, .65)', deporte: 'rgba(104, 168, 96, .65)', juegos: 'rgba(188, 170, 130, .55)', escuela: 'rgba(190, 172, 132, .5)',
    // (los patios, los terrenos industriales y las plazas, en tierra y piedra cálida: claros, con la luz del mapa salían como
    // losas grises que se leían como bloques blancos)
    cementerio: 'rgba(154, 165, 138, .65)', industria: 'rgba(160, 142, 108, .4)', plaza: 'rgba(214, 196, 162, .78)' };
  function pintaNucleo(D, R, pizarra, N = BAJA ? 512 : 1024, velo = true, foto = null) {
    // (el de la maqueta, en el procesador y no en la tarjeta gráfica: son muchos trazos, y en ella se encolaban y paraban el mapa)
    const k = N / (2 * R), c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', velo ? undefined : { willReadFrequently: true });
    const P = (x, z) => [(x + R) * k, (z + R) * k];
    const linea = (pts, w, color) => { if (pts.length < 2) return; g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.lineWidth = Math.max(1, w * k); g.strokeStyle = color; g.lineCap = g.lineJoin = 'round'; g.stroke(); };
    const area = (pts, color) => { if (pts.length < 3) return; g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fillStyle = color; g.fill(); };
    const casa = (b, dx, dz, color) => { g.save(); const [a, bb] = P(b.x + dx, b.z + dz); g.translate(a, bb); g.rotate(-b.ry); g.fillStyle = color; g.fillRect(-b.w * k / 2, -b.d * k / 2, b.w * k, b.d * k); g.restore(); };
    // (con la ortofoto fina del pueblo, el suelo es la foto de verdad, con sus calles, sus tejados, sus huertas y su río: no
    // se pinta nada encima, solo, en la maqueta, la sombra de las casas que se levantan. 13 de noviembre de 2026: el autor
    // pidió la mayor definición posible, también en el zoom de los pueblos)
    const Rf = foto && ORTO_PUEBLOS[D.id];
    if (Rf) { g.filter = 'saturate(1.14) brightness(1.06)'; g.drawImage(foto, (R - Rf) * k, (R - Rf) * k, 2 * Rf * k, 2 * Rf * k); g.filter = 'none'; }
    if (!Rf) {
    // (un velo claro bajo lo edificado, que de lejos se lee como el núcleo)
    if (velo) { g.filter = `blur(${Math.round(N / 50)}px)`; for (const b of D.casas) casa(b, 0, 0, 'rgba(246, 236, 214, .5)'); g.filter = 'none'; }
    // (en la maqueta, el suelo con su grano: motas de hierba más oscura y más clara, en un dibujo pequeño que se repite)
    const dibujo = (w, h, pinta) => { const t = document.createElement('canvas'); t.width = w; t.height = h; pinta(t.getContext('2d'), w, h); return g.createPattern(t, 'repeat'); };
    if (!velo) { g.fillStyle = dibujo(64, 64, (q, w, h) => { for (let i = 0; i < 260; i++) { q.fillStyle = Math.random() < 0.6 ? `rgba(36, 70, 28, ${0.1 + Math.random() * 0.14})` : `rgba(255, 250, 220, ${0.06 + Math.random() * 0.1})`; q.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }); g.fillRect(0, 0, N, N); }
    for (const u of D.usos || []) if (USO[u.k]) area(u.pts, USO[u.k]);
    // (en la maqueta, la textura de cada campo: surcos en los cereales, hileras en viñas y frutales, bancales en las
    // huertas, las pasadas del corte en los prados y las rayas de los campos de deporte; cada uno con su dirección)
    // (cada textura, un dibujo pequeño que se repite, girado a la dirección de cada campo: un solo relleno por campo)
    const rayas = new Map(), raya = (paso, ancho, color) => { const key = paso + ancho + color; let pt = rayas.get(key);
      if (!pt) { const t = document.createElement('canvas'), pp = Math.max(2, Math.round(paso * k)); t.width = pp; t.height = 2; const tg = t.getContext('2d'); tg.fillStyle = color; tg.fillRect(0, 0, Math.max(1, Math.round(ancho * k)), 2); rayas.set(key, pt = g.createPattern(t, 'repeat')); }
      return pt; };
    if (!velo) for (const u of D.usos || []) {
      const s0 = Math.abs(Math.sin(u.pts[0][0] * 12.9898 + u.pts[0][1] * 78.233)) % 1, ang = s0 * 180;
      const hileras = (paso, ancho, color) => { const pt = raya(paso, ancho, color); pt.setTransform(new DOMMatrix().rotateSelf(ang)); area(u.pts, pt); };
      if (u.k === 'cultivo') { area(u.pts, ['rgba(222, 196, 112, .45)', 'rgba(150, 176, 92, .4)', 'rgba(168, 128, 86, .4)'][Math.floor(s0 * 2.99)]); hileras(2.4, 0.7, 'rgba(90, 70, 40, .18)'); }
      else if (u.k === 'vina') hileras(2.6, 1, 'rgba(70, 92, 40, .5)');
      else if (u.k === 'huerta') { hileras(3.6, 1.6, 'rgba(56, 120, 48, .35)'); hileras(3.6, 0.5, 'rgba(120, 90, 60, .3)'); }
      else if (u.k === 'frutales') hileras(7, 2.2, 'rgba(80, 112, 52, .25)');
      else if (u.k === 'prado') hileras(6, 3, 'rgba(255, 255, 255, .06)');
      else if (u.k === 'deporte') { g.beginPath(); u.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.lineWidth = Math.max(1, 0.8 * k); g.strokeStyle = 'rgba(255, 255, 255, .7)'; g.stroke(); }
    }
    for (const p of D.lugares.plazas || []) area(p.pts, 'rgba(232, 220, 196, .9)');
    // (la piedra a motas: granos claros y oscuros de uno o dos píxeles, para el empedrado y las losas cuando sus juntas no
    // caben en el lienzo; con juntas de 3 píxeles, al acercarse, se veían cuadros de mantel de 4 m)
    const motas = !velo && dibujo(48, 48, (q, w, h) => { for (let i = 0; i < 420; i++) { const os = Math.random() < 0.55; q.fillStyle = os ? `rgba(110, 92, 70, ${0.1 + Math.random() * 0.14})` : `rgba(255, 248, 230, ${0.1 + Math.random() * 0.16})`; q.fillRect(Math.random() * w, Math.random() * h, 1 + (Math.random() < 0.3), 1); } });
    // (y en las plazas, las losas: una cuadrícula de unos 2,5 m, si cabe con sus juntas; si no, la piedra a motas)
    if (!velo) { const L = Math.round(2.5 * k), losas = L >= 6 ? dibujo(L, L, (q, w, h) => { q.fillStyle = 'rgba(120, 104, 84, .2)'; q.fillRect(0, 0, w, 1); q.fillRect(0, 0, 1, h); }) : motas;
      for (const p of D.lugares.plazas || []) area(p.pts, losas); }
    // (los anchos de los datos son la mitad: de la orilla al centro. El agua con su orilla más oscura y un brillo en el centro,
    // como si corriera; antes, una cinta lisa del mismo azul)
    for (const r of D.rios) linea(r.pts, Math.max(4, 2 * (r.w || 2)) + (velo ? 0 : 2.5), velo ? '#5ab8f0' : 'rgba(34, 104, 150, .6)');
    if (!velo) { for (const r of D.rios) linea(r.pts, Math.max(4, 2 * (r.w || 2)), '#54b0e8'); for (const r of D.rios) linea(r.pts, Math.max(1.2, 0.7 * (r.w || 2)), 'rgba(214, 242, 255, .32)'); }
    for (const b of D.balsas || []) area(b.pts, '#54b0e8');
    for (const b of D.piscinas || []) area(b.pts, '#7fd6f6');
    for (const s of D.calles) linea(s.pts, 2 * (s.w || 2) + 1.5, s.t === 'trail' ? 'rgba(150, 128, 96, .35)' : 'rgba(120, 104, 90, .55)');
    for (const s of D.calles) linea(s.pts, 2 * (s.w || 2), s.t === 'trail' ? 'rgba(214, 198, 166, .85)' : velo ? '#e7dfd0' : '#e0d5c0');
    // (en la maqueta, el empedrado de las calles, adoquines de algo más de un metro con sus juntas, y la tierra de los caminos)
    if (!velo) {
      const A = Math.max(3, Math.round(1.2 * k)), adoquin = dibujo(A * 2, A * 2, (q, w, h) => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const o = j % 2 ? A / 2 : 0; q.fillStyle = `rgba(${150 + Math.random() * 40}, ${134 + Math.random() * 34}, ${112 + Math.random() * 30}, .38)`; q.fillRect((i * A + o) % w + 1, j * A + 1, A - 1, A - 1); q.fillRect((i * A + o) % w + 1 - w, j * A + 1, A - 1, A - 1); } });
      const tierra = dibujo(32, 32, (q, w, h) => { for (let i = 0; i < 90; i++) { q.fillStyle = Math.random() < 0.5 ? 'rgba(120, 92, 60, .25)' : 'rgba(250, 238, 210, .2)'; q.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1); } });
      // (los adoquines, si caben con sus juntas, de 4 píxeles o más; si no, la piedra a motas)
      for (const s of D.calles) linea(s.pts, 2 * (s.w || 2) - 0.6, s.t === 'trail' ? tierra : 1.2 * k >= 4 ? adoquin : motas);
    }
    for (const s of D.puentes || []) { linea(s.pts, 2 * (s.w || 2) + 2, 'rgba(90, 76, 62, .6)'); linea(s.pts, 2 * (s.w || 2), '#d6c8ae'); }
    }
    // (en la maqueta, las mismas casas que se levantan, con los bloques grandes ya partidos: maqueta.js casasMaqueta. Si no,
    // bajo ellos quedaba su huella entera, una losa gris de hasta 130 m)
    const CS = velo ? D.casas : casasMaqueta(D);
    if (Rf) { if (!velo) for (const b of CS) casa(b, 2, 3, 'rgba(30, 20, 14, .26)'); }
    else { for (const b of CS) casa(b, 3, 4, 'rgba(40, 24, 18, .35)');   // (la sombra, hacia el sureste)
      for (const b of CS) { const [h, sa, l] = b.k === 'fronton' ? [0.38, 0.3, 0.5] : tono(b, pizarra); casa(b, 0, 0, `hsl(${h * 360}, ${sa * 100}%, ${l * 92}%)`); } }
    g.globalCompositeOperation = 'destination-in';
    const fin = g.createRadialGradient(N / 2, N / 2, N * 0.4, N / 2, N / 2, N / 2); fin.addColorStop(0, '#000'); fin.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = fin; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c); t.anisotropy = aniso; t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t;
  }
  // (el núcleo de un pueblo: su lienzo va pintado en el propio relieve de su comarca, en uno de sus cuatro huecos, y así
  // queda pegado al terreno; las casas en pie, una caja por casa con su altura algo exagerada, como el relieve)
  function haceNucleo(t, D, foto = null) {
    const [cx, cy] = mapaXY(D.lat, D.lon), [X0, Z0] = W(cx, cy); let R = 120;
    for (const b of D.casas) R = Math.max(R, Math.hypot(b.x, b.z) + Math.max(b.w, b.d) / 2);
    for (const s of D.calles) for (const [x, z] of s.pts) R = Math.max(R, Math.hypot(x, z));
    R = Math.min(700, R + 20);
    const pizarra = t.comarca === 'pirineo', tex = pintaNucleo(D, R, pizarra, undefined, true, foto), Rs = R / 207.6;
    const cm2 = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    // (en los pueblos junto al borde de su comarca, solo las casas que caen dentro: las demás quedaban en el aire, sobre la
    // comarca de al lado o colgando de la pared)
    const dentro = D.casas.filter(b => enComarca(t.c.Pw, X0 + b.x * MU, Z0 + b.z * MU, Math.hypot(b.w, b.d) / 2 * MU));
    const casas = new THREE.InstancedMesh(cajaG, cm2, Math.max(1, dentro.length)), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    casas.count = dentro.length;
    dentro.forEach((b, i) => { const x = X0 + b.x * MU, z = Z0 + b.z * MU;
      M4.compose(e3.set(x, GROSOR + sobre(t.c, x, z) - 0.004, z), q.setFromAxisAngle(up, b.ry), sc.set(b.w * MU, (b.h || 7) * MU * 2.5, b.d * MU)); casas.setMatrixAt(i, M4);
      casas.setColorAt(i, col.setHSL(...tono(b, pizarra))); });
    casas.visible = false; t.c.mesh.add(casas);
    return { tex, rect: [cx - Rs, cy - Rs, 2 * Rs, 2 * Rs], casas, c: t.c, X: t.X, Z: t.Z, slot: -1, op: 0, op2: 0, t, D, X0, Z0, R, pizarra };
  }
  // (un hueco libre en el relieve de su comarca; si no lo hay, se deja el del pueblo más lejos de la vista)
  function ponNucleo(e) {
    const c = e.c; c.pue ||= [null, null, null, null];
    let i = c.pue.indexOf(null);
    if (i < 0) { const lejos = (x) => Math.hypot(x.X - v.x, x.Z - v.z); i = c.pue.reduce((m, x, k) => lejos(x) > lejos(c.pue[m]) ? k : m, 0); if (lejos(c.pue[i]) <= lejos(e)) return false; quitaNucleo(c.pue[i]); }
    const u = c.top.uniforms; c.pue[i] = e; e.slot = i; u['uP' + i].value = e.tex; u.uPR.value[i].set(...e.rect); u.uPK.value[i] = 0;
    return true;
  }
  function nucleos(now, quieto) {
    const va = elegido && vuelo;   // (volando hasta un pueblo: el suyo se pide ya, para que sus casas estén al llegar)
    if (now - nucT < 500 || !quieto && !va) return; nucT = now;
    const quiere = va ? (REALES.has(elegido.id) ? [elegido] : []) : v.d > NUC_LEJOS + 4 ? [] : T.filter(t => REALES.has(t.id) && (!sel || sel === t.comarca) && Math.hypot(t.X - v.x, t.Z - v.z) < v.d * 0.55 + 2)
      .sort((a, b) => Math.hypot(a.X - v.x, a.Z - v.z) - Math.hypot(b.X - v.x, b.Z - v.z)).slice(0, 6);
    for (const t of quiere) {
      // (cuándo se vio por última vez va en «visto»: «t» es el pueblo, que pone haceNucleo. Antes las dos cosas iban en «t» y
      // la hora pisaba al pueblo: la maqueta no sabía de qué pueblo era, y sus rótulos salían sin la iglesia del juego)
      const e = nuc.get(t.id); if (e) { e.visto = now; continue; } if (nucPide) continue;
      const nuevo = { visto: now }; nuc.set(t.id, nuevo); nucPide++;
      Promise.all([loadMapa(t.id), fotoPueblo(t.id, !BAJA && !TACTIL)]).then(([D, foto]) => { nucPide--; if (!vivo || nuc.get(t.id) !== nuevo || !D?.casas) return;
        Object.assign(nuevo, haceNucleo(t, D, foto), { foto }); if (!ponNucleo(nuevo)) { quitaNucleo(nuevo); nuc.delete(t.id); } }).catch(() => { nucPide = Math.max(0, nucPide - 1); });
    }
    // (si hay más de ocho, se sueltan los que hace más que no se ven)
    const viejos = [...nuc].filter(([id]) => !quiere.some(t => t.id === id)).sort((a, b) => a[1].visto - b[1].visto);
    while (nuc.size > 8 && viejos.length) { const [id, e] = viejos.shift(); quitaNucleo(e); nuc.delete(id); }
  }
  function quitaNucleo(e) {
    if (maq?.e === e) quitaMaqueta();
    if (e.slot >= 0) { const u = e.c.top.uniforms; u['uP' + e.slot].value = nada; u.uPK.value[e.slot] = 0; e.c.pue[e.slot] = null; e.slot = -1; }
    e.tex?.dispose(); e.tex = null;
    if (e.casas) { e.casas.removeFromParent(); e.casas.material.dispose(); e.casas.dispose(); e.casas = null; }
    for (const [id, x] of nuc) if (x === e) nuc.delete(id);
  }

  // ---------- la maqueta: muy cerca de un pueblo, su relieve de verdad, sus casas en pie con tejado y sus árboles ----------
  // (una a la vez, la del pueblo del centro de la vista; se hace por pasos con la cámara quieta; entra subiendo el relieve
  // del pueblo y luego las casas, y se va al revés al alejarse: src/hub/maqueta.js)
  const MAQ_D = 3.2, MAQ_K = 1.6;   // (la distancia a la que se levanta, y lo que se exageran en alto casas y árboles: como el relieve de cerca)
  let maq = null, calentado = false;
  // (los programas de la maqueta y de las casas de los núcleos, compilados de antemano en cuanto el mapa está tranquilo
  // y estrenados en una imagen, debajo de todo: si no, se compilaban al llegar al pueblo, de golpe, y la imagen se paraba
  // medio segundo justo cuando se levantaban sus casas)
  function calienta() {
    calentado = true; aves.estrena();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3)); g.setAttribute('hd', new THREE.Float32BufferAttribute([0, 0, 0], 1)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(9).fill(1), 3));
    const pm = new THREE.ShaderMaterial({ vertexShader: PARCHE_VS, fragmentShader: RELIEVE_FS, defines: { ...LIGERO }, vertexColors: true, fog: true, uniforms: { ...C[0].top.uniforms, uHueco: { value: new THREE.Vector4() }, uMaqK: { value: 0 } } });
    const res = {}, pasos = haceMaqueta({ id: 'x', alt0: 0, dem: { step: 20, n: 2, h: [0, 0, 0, 0] }, casas: [], calles: [], rios: [] }, { X0: 0, Z0: 0, MU, EXA, GROSOR, R: 10, sobre: () => 0, P: [[-1, -1], [1, -1], [1, 1], [-1, 1]], lento: true, K: 1, alzado: { value: 1 }, tiempo: TIEMPO }, res);
    while (!pasos.next().done);
    const caja = new THREE.BoxGeometry(); caja.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(1), 1));
    const im = new THREE.InstancedMesh(caja, res.mat, 1); im.setColorAt(0, new THREE.Color());
    const cm2 = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), cn = new THREE.InstancedMesh(cajaG, cm2, 1); cn.setColorAt(0, new THREE.Color());
    // (y el de los lugares emblemáticos de los pueblos, el castillo de Olite y demás: no se calentaba y, en el primer pueblo
    // con uno, se compilaba al levantarse sus casas, a medio vuelo)
    const ge = g.clone(); ge.setAttribute('aBase', new THREE.Float32BufferAttribute([0, 0, 0], 1));
    const me = materialEmblema({ value: 1 }), em = new THREE.Mesh(ge, me);
    const grupo = new THREE.Group(); grupo.add(new THREE.Mesh(g, pm), im, cn, em);
    geos.push(g, ge, caja, res.geo); mats.push(pm, res.mat, cm2, me);
    compilarAsync(r, grupo, cam, scene).then(() => { if (!vivo) return;
      grupo.position.y = -500; grupo.traverse(x => { x.frustumCulled = false; }); scene.add(grupo); estreno = { grupo, n: 0 }; });
  }
  let estreno = null;   // (lo calentado, en la escena una sola imagen; luego fuera)
  function maqueta(dt, quieto) {
    if (estreno && estreno.n++) { estreno.grupo.removeFromParent(); estreno = null; }   // (ya pintado una vez, con sus programas estrenados: fuera)
    // (en el ordenador, a los 4 s; en el móvil, solo al acercarse, para no cargarle memoria nada más abrir. El mapa siempre se
    // mueve un poco: no se espera a que esté quieto)
    if (!calentado && (v.d < 8 || (!LENTO && (!intro || intro.hecho) && cargas >= 3 && performance.now() - t0 > 4000))) calienta();
    // (volando a un pueblo tocado, la suya se va haciendo por el camino: al llegar ya está y solo tiene que levantarse)
    const vaE = elegido && vuelo ? nuc.get(elegido.id) : null, va = vaE?.D && vaE.slot >= 0 ? vaE : null;
    const quiere = va || (v.d < MAQ_D ? [...nuc.values()].filter(e => e.D && e.slot >= 0 && Math.hypot(e.X0 - v.x, e.Z0 - v.z) < e.R * MU * 0.8)
      .sort((a, b) => Math.hypot(a.X0 - v.x, a.Z0 - v.z) - Math.hypot(b.X0 - v.x, b.Z0 - v.z))[0] : null);
    if (!maq) {
      if (quiere && (quieto || va)) maq = { e: quiere, k: { value: 0 }, alz: { value: 1 }, op: 0, res: {}, pasos: null, tex: null, malla: null };
      return;
    }
    const m = maq, e = m.e, c = e.c, sigue = quiere === e;
    if (!m.malla) {   // (aún haciéndose: unos pasos por imagen, los que quepan en unos milisegundos; si ya no se quiere, se deja)
      if (!sigue) { quitaMaqueta(); return; }
      if (!quieto && !va) return;
      const hasta = performance.now() + (quieto ? 14 : 7);
      do { if (pasoMaqueta(m)) return; } while (performance.now() < hasta);
      return;
    }
    // (el relieve del pueblo sube, ya al llegar; luego, las casas)
    const sube = sigue && v.d < MAQ_D * 1.6;
    m.k.value += ((sube ? 1 : 0) - m.k.value) * (1 - Math.exp(-dt * (sube ? 6 : 3)));
    m.op += ((sube && m.k.value > 0.6 ? 1 : 0) - m.op) * (1 - Math.exp(-dt * 8));
    // (las casas se estrenan en la imagen siguiente a hacerse, aún transparentes: así lo que cuesta pintarlas la primera vez,
    // subir sus instancias a la tarjeta gráfica, pasa al principio del vuelo, con la cámara casi quieta, y no al levantarse,
    // a media bajada, donde era un tirón)
    const primera = !m.estrenada; m.estrenada = true;
    m.res.mat.opacity = m.op; if (m.res.matEmb) m.res.matEmb.opacity = m.op; m.res.casas.visible = m.op > 0.01 || primera; m.alz.value = 1 / Math.max(0.05, c.sy);
    if (!sigue && m.k.value < 0.01 && m.op < 0.01) quitaMaqueta();
  }
  // (un paso de la maqueta: el suelo pintado, sus piezas, las sombras de los árboles y, al final, la malla en la comarca;
  // devuelve true cuando ya está, o cuando lo que queda va en la imagen siguiente)
  function pasoMaqueta(m) {
    const e = m.e, c = e.c;
    // (primero, las casas en orden, de poco en poco: maqueta.js ordenaMaqueta)
    if (!e.D._maq) { (m.orden ||= ordenaMaqueta(e.D)).next(); return false; }
    if (!m.tex) { m.tex = pintaNucleo(e.D, e.R, e.pizarra, BAJA ? 1024 : 2048, false, e.foto); return false; }
    if (!m.pasos) m.pasos = haceMaqueta(e.D, { X0: e.X0, Z0: e.Z0, MU, EXA, GROSOR, R: e.R, sobre: (X, Z) => sobre(c, X, Z), P: c.Pw, comarca: c.id, lento: BAJA, K: MAQ_K, alzado: m.alz, nivel: levelById(e.t?.id), tiempo: TIEMPO }, m.res);
    if (!m.hecha) { m.hecha = m.pasos.next().done; return false; }
    // (la sombra de cada árbol en el suelo pintado, hacia el sureste; y la imagen, a la tarjeta gráfica en su propia imagen)
    if (!m.subida) { m.subida = true; const g = m.tex.image.getContext('2d', { willReadFrequently: true }), N = m.tex.image.width, k = N / (2 * e.R); g.fillStyle = 'rgba(28, 40, 18, .3)'; g.beginPath();
      for (const [x, z, rr] of m.res.sombras) { const a = (x + e.R + rr * 0.9) * k, b = (z + e.R + rr * 1.2) * k; g.moveTo(a + rr * 1.1 * k, b); g.ellipse(a, b, rr * 1.1 * k, rr * 0.8 * k, 0.5, 0, 6.2832); }
      g.fill(); return true; }
    // (y la imagen, a la tarjeta gráfica, en su propia imagen y en un paso aparte: con las sombras en el mismo, era el paso
    // más largo y, volando hasta el pueblo, un tirón)
    if (!m.enviada) { m.enviada = true; m.tex.needsUpdate = true; r.initTexture(m.tex); return true; }
    const u = c.top.uniforms, pm = new THREE.ShaderMaterial({ vertexShader: PARCHE_VS, fragmentShader: RELIEVE_FS, defines: { ...LIGERO }, vertexColors: true, fog: true, uniforms: { ...u, uHueco: { value: new THREE.Vector4(0, 0, 0, 0) }, uMaqK: m.k } });
    m.malla = new THREE.Mesh(m.res.geo, pm); c.mesh.add(m.malla); c.mesh.add(m.res.casas);
    u.uHueco.value.set(e.X0, e.Z0, e.R * MU * 0.97, 1); if (e.slot >= 0) u['uP' + e.slot].value = m.tex;
    m.labs = m.res.monumentos.map(x => { const lab = document.createElement('div'); lab.className = 'm3-ml'; lab.textContent = x.n; lab.hidden = true; capa.append(lab); return { ...x, lab }; });
    return true;
  }
  function quitaMaqueta() {
    const m = maq; if (!m) return; maq = null;
    const e = m.e, u = e.c.top.uniforms;
    if (m.malla) { m.malla.removeFromParent(); m.malla.material.dispose(); u.uHueco.value.set(0, 0, 0, 0); if (e.slot >= 0 && e.tex) u['uP' + e.slot].value = e.tex; }
    m.res.geo?.dispose();
    if (m.res.casas) { m.res.casas.removeFromParent(); for (const x of m.res.casas.children) x.geometry.dispose(); m.res.mat.dispose(); m.res.matEmb?.dispose(); }
    m.tex?.dispose(); for (const x of m.labs || []) x.lab.remove();
  }
  // ---------- los lugares emblemáticos sueltos: la Ciudadela de Pamplona, El Sadar y Castildetierra (emblemas.js) ----------
  // (con su forma de verdad, sobre el relieve de su comarca; se levantan, una vez, al acercarse a ellos con el mapa quieto,
  // y se ven ya desde lo alto, antes que la maqueta de los pueblos; al elegir otra comarca, se apagan con ella)
  const sueltos = SUELTOS.map(id => { const E = EMB[id], [X, Z] = W(...mapaXY(E.lat, E.lon)); return { id, X, Z, c: deQuien(X, Z), mesh: null, op: 0, alz: { value: 1 } }; }).filter(s => s.c);
  function emblemas(dt, quieto) {
    for (const s of sueltos) {
      const quiere = v.d < 12 && Math.hypot(s.X - v.x, s.Z - v.z) < v.d * 1.4 + 1.5 && (!sel || sel === s.c.id);
      if (quiere && !s.mesh && quieto) {
        const g = haceEmblema(s.id, { ancla: (la, lo) => W(...mapaXY(la, lo)), MU, K: 2, suelo: (X, Z) => GROSOR + sobre(s.c, X, Z) }), m = materialEmblema(s.alz);
        s.mesh = new THREE.Mesh(g, m); s.mesh.frustumCulled = false; s.mesh.visible = false; s.c.mesh.add(s.mesh); geos.push(g); mats.push(m);
      }
      if (!s.mesh) continue;
      s.op += ((quiere ? 1 : 0) - s.op) * (1 - Math.exp(-dt * 5)); s.mesh.material.opacity = s.op; s.mesh.visible = s.op > 0.01; s.alz.value = 1 / Math.max(0.05, s.c.sy);
    }
  }
  // (la altura del suelo en un punto de una comarca, con la de la maqueta donde la hay)
  const pisoEn = (c, X, Z) => { const h = GROSOR + alto(X, Z) + (c.fk?.value && c.dhF ? c.dhF(X, Z) * c.fk.value : 0); if (!maq?.malla || maq.e.c !== c || Math.hypot(X - maq.e.X0, Z - maq.e.Z0) > maq.e.R * MU) return h; return h + (maq.res.alto(X, Z) - h) * maq.k.value; };
  // los pájaros: con un sitio elegido, sobre él (pajaros.js): en los pueblos y ciudades, sobre el corazón de sus casas; en
  // los espacios naturales, sobre su chincheta y a la escala de su cámara. En la vista general y en la de una comarca, ninguno
  const aves = hacePajaros({ scene, lento: BAJA, suelo: (x, z) => { const c = deQuien(x, z); return c?.sy ? pisoEn(c, x, z) * c.sy + c.py : null; },
    pueblo: () => { if (!elegido) return null; const real = TR.includes(elegido), f = real ? 1 : 2.2 / DRON_D;
      if (dron?.id === elegido.id) return { X: dron.cc?.X ?? dron.X, Z: dron.cc?.Z ?? dron.Z, f, natural: !real };
      const cc = real ? (elegido._cc ||= centroCasas(elegido.id)) : null; return { X: cc?.X ?? elegido.X, Z: cc?.Z ?? elegido.Z, f, natural: !real }; } });

  if (import.meta.env.DEV) window.__mapa3d = { islaK: (k) => { islaFija = k; }, det, nuc, v, goal, ren: r, scene, cam, fino: () => ({ datos: !!finoD, C: C.filter(c => c.gFino || c.fk.value).map(c => ({ id: c.id, k: +c.fk.value.toFixed(2), tris: c.gFino ? c.gFino.index.count / 3 | 0 : 0, ms: c.finoMs })) }), calentado: () => calentado, maqueta: () => maq, sueltos, ir: irPueblo, comarca: (id) => select(id ?? C[3].id), intro: () => intro, pueblos: () => T.map(x => ({ id: x.id, X: x.X, Z: x.Z })),
    // (la cámara frente al relieve: su altura, la del suelo bajo ella y lo que sube; y adelantar el vuelo de dron)
    relieve: () => { const cp = cam.position, c = deQuien(cp.x, cp.z); return { cam: cp.y, suelo: c?.sy ? pisoEn(c, cp.x, cp.z) * c.sy + c.py : 0, subida, dron: !!dron?.listo }; }, dronT: (t) => { if (dron) dron.t = t; }, saltaVuelo: () => { if (vuelo) vuelo.t = 1; }, fija: () => { Object.assign(v, goal); const c = deQuien(v.x, v.z); if (c?.sy) v.hy = pisoEn(c, v.x, v.z) * c.sy + c.py; }, despeje: () => despeje(v), dron: () => dron, vista: () => vista(), estado: () => ({ vuelo: !!vuelo, dron: dron?.id || null, listo: !!dron?.listo, paseo: !!paseo, sel, elegido: elegido?.id || null, intro: intro ? !!intro.hecho : null, maq: maq?.e?.t?.id || null, inercia: !!inercia, subida, py: hRef.py || 0, v: { ...v }, goal: { ...goal } }), centro: () => { if (!dron) return null; const X = dron.cc?.X ?? dron.X, Z = dron.cc?.Z ?? dron.Z, c = deQuien(X, Z); return { X, Z, Y: c?.sy ? pisoEn(c, X, Z) * c.sy + c.py : v.hy }; }, sonda: (u) => { const g = posDron(dron, u), q = (u / DRON_PASO) % DRON_N, P = dron.perfil[Math.floor(q)], c = deQuien(v.x, v.z), exa = exaDe(v.d); return { P, est: holgura(g.x, g.z, g.d, g.yaw, P, exa), real: despeje(v), vhy: v.hy, hyEst: c ? pisoEn(c, v.x, v.z) * exa : null, sy: c?.sy, py: c?.py, exa, vd: v.d, gd: g.d, vp: v.pitch, gp: goal.pitch, vx: v.x - g.x, vyaw: v.yaw - g.yaw }; }, paseo: () => paseo && { t: paseo.t }, paseoT: (t) => { if (paseo) paseo.t = t; }, chinchetas: () => T.map(t => { t.bola.getWorldPosition(bw).project(cam); return { id: t.id, c: t.comarca, px: Math.round((bw.x + 1) / 2 * sz.w), py: Math.round((1 - bw.y) / 2 * sz.h), s: t.g.scale.x }; }), montes: () => PK.map(x => { pv.set(x.X, x.c ? x.h * x.c.sy + x.c.py : x.h, x.Z).project(cam); return { n: x.lab.querySelector('b').textContent, c: x.c?.id || null, on: !!x.lab._on, px: Math.round((pv.x + 1) / 2 * sz.w), py: Math.round((1 - pv.y) / 2 * sz.h), w: x.lab._w || 0 }; }) };   // (para las pruebas en el servidor de desarrollo)

  // ---------- el bucle: solo mientras se ve ----------
  let vivo = true, visible = true, t0 = performance.now(), last = t0, raf = 0, compilado = false;
  const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting ?? true; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: 0.02 }); io.observe(host);
  const sz = { w: 0, h: 0, z: 0 }, off = { x: 0, y: 0 };
  // (la resolución máxima del lienzo, que baja si no llega: a 2 en las pantallas de retina el relieve iba a tirones)
  // (la resolución del lienzo: hasta 1,5; en el ordenador de calidad baja, con un presupuesto de unos 0,9 millones de píxeles
  // y, si mientras se mueve no llega, puede bajar hasta 0,75. En un portátil con una Intel UHD, a 1920 × 868 iba a 9
  // imágenes por segundo)
  // (hasta 2: con 1,5 los bordes y los nombres se veían blandos; baja solo si de verdad no da, por debajo de unas 28 imágenes por
  // segundo, y nunca de 1,5 en una pantalla de retina. En cuanto la cámara se para un segundo y medio, vuelve a la máxima.
  // Hasta el 13 de noviembre de 2026 bajaba ya por debajo de 40 imágenes, hasta 1, y no volvía a subir: tras el primer vuelo
  // del dron, el mapa del iPhone se quedaba a un tercio de su resolución y el autor lo veía de bajísima calidad)
  const PR_TOP = o.ligero ? 1 : 2;
  let prMax = PR_TOP, prT = 0, prN = 0, prQuieto = 0;
  const prSuelo = PC_LENTO ? 0.75 : Math.min(PR_TOP, Math.max(1, Math.min(1.5, devicePixelRatio || 1))), prPres = (w, h) => PC_LENTO ? Math.max(prSuelo, Math.sqrt(0.9e6 / Math.max(1, w * h))) : 9;
  const pv = new THREE.Vector3();
  // (si algo falla al pintar, se apunta una vez y se sigue; si falla imagen tras imagen, o el móvil se queda sin la tarjeta
  // gráfica y no la devuelve, el mapa se suelta y quien lo puso deja el plano: o.falla. Nunca una pantalla vacía)
  let fallos = 0, perdido = 0;
  const cae = () => { if (!vivo) return; if (document.hidden) { perdido = setTimeout(cae, 3000); return; } dispose(); o.falla?.(); };   // (con la app en segundo plano, se espera a volver)
  const pierde = () => { clearTimeout(perdido); perdido = setTimeout(cae, 3000); }, vuelve = () => clearTimeout(perdido);
  cv.addEventListener('webglcontextlost', pierde); cv.addEventListener('webglcontextrestored', vuelve);
  // ---------- ¿se ve? ----------
  // En un iPhone el lienzo se limpiaba pero no salía nada encima: el fondo liso y los nombres de las comarcas flotando.
  // Pasa si la tarjeta gráfica no acepta un sombreador (sin ningún aviso). Con el mapa ya cargado, y otra vez al volver a
  // la app, se miran unos puntos de la imagen recién pintada: si todos son del color del fondo, se miran los programas de
  // la tarjeta gráfica y se apunta lo que ha fallado (Ajustes › Diagnóstico, src/util/diag.js); los materiales que no han
  // podido compilar se cambian por otros sencillos y, si aun así no sale nada, el mapa se rehace (o.falla)
  const revisa = { cuando: 0, veces: 0, listo: false, malos: [] };
  const otraVez = () => { if (!document.hidden && revisa.listo) revisa.cuando = performance.now() + 1500; };
  document.addEventListener('visibilitychange', otraVez);
  const fondo = [(FONDO >> 16) & 255, (FONDO >> 8) & 255, FONDO & 255], PUNTOS = [[0.5, 0.5], [0.35, 0.42], [0.65, 0.42], [0.5, 0.33], [0.42, 0.62], [0.58, 0.62], [0.25, 0.55], [0.75, 0.55]];
  const gpu = (gl) => { const e = gl.getExtension('WEBGL_debug_renderer_info'); return String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).slice(0, 80); };
  function revisaImagen() {
    revisa.cuando = 0;
    const gl = r.getContext(); if (gl.isContextLost()) return;
    // (una sola lectura, una fila por en medio, y en ella los puntos: cada lectura para la tarjeta gráfica hasta acabar la
    // imagen, y con una por punto el arranque se quedaba parado más de un segundo en el móvil)
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, x0 = Math.floor(W * 0.2), w = Math.max(1, Math.floor(W * 0.6)), px = new Uint8Array(w * 4); let liso = 0;
    gl.readPixels(x0, Math.floor(H * 0.47), w, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let k = 0; k < PUNTOS.length; k++) { const i = Math.min(w - 1, Math.floor((k + 0.5) / PUNTOS.length * w)) * 4; if (Math.abs(px[i] - fondo[0]) + Math.abs(px[i + 1] - fondo[1]) + Math.abs(px[i + 2] - fondo[2]) < 12) liso++; }
    const base = { cuando: new Date().toISOString().slice(0, 19), gpu: gpu(gl), lienzo: W + '×' + H, ligero: !!o.ligero };
    if (liso < PUNTOS.length) { apunta(revisa.veces ? { ...base, ve: true, intento: revisa.veces, malos: revisa.malos } : { ...base, ve: true }); return; }
    revisa.veces++;
    const malos = (r.info.programs || []).filter(pr => pr.program && !gl.getProgramParameter(pr.program, gl.LINK_STATUS));
    revisa.malos = malos.slice(0, 6).map(pr => ({ nombre: pr.name || pr.cacheKey?.slice(0, 30) || '?',
      log: ((gl.getShaderInfoLog(pr.fragmentShader) || '') + ' ' + (gl.getShaderInfoLog(pr.vertexShader) || '') + ' ' + (gl.getProgramInfoLog(pr.program) || '')).trim().slice(0, 240) }));
    apunta({ ...base, ve: false, intento: revisa.veces, malos: revisa.malos });
    (window.__errors ||= []).push('mapa 3D: no se ve (' + malos.length + ' sombreadores rechazados)');
    if (revisa.veces === 1) { if (malos.length) sencillos(new Set(malos)); revisa.cuando = performance.now() + 2000; return; }
    cae();
  }
  // (cada material que la tarjeta gráfica no ha aceptado, por uno de los de siempre: el relieve, con el color de su altura y
  // su sombreado puestos en cada vértice; las balizas y los halos, puntos o líneas de su color; lo demás, mate)
  function sencillos(malos) {
    const cambia = (ob, m) => {
      const op = { transparent: !!m.transparent, opacity: m.opacity ?? 1, side: m.side ?? THREE.FrontSide, depthWrite: m.depthWrite !== false };
      const col = m.color || m.uniforms?.uCol?.value || m.uniforms?.uTinte?.value || new THREE.Color('#8a7fb0');
      if (ob.isPoints) return new THREE.PointsMaterial({ ...op, color: col, size: 3, sizeAttenuation: false });
      if (ob.isLine) return new THREE.LineBasicMaterial({ ...op, color: col });
      const U = m.uniforms, g = ob.geometry, pos = g?.attributes.position, som = g?.attributes.color;
      if (U?.uPal && pos && som) {
        const pal = U.uPal.value.map(c => c.clone().convertSRGBToLinear()), cota = U.uCota.value, cc = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
          const h = Math.max(0, (pos.getY(i) - U.uGrosor.value) / U.uExa.value); cc.copy(pal[0]);
          for (let k = 1; k < pal.length; k++) cc.lerp(pal[k], Math.min(1, Math.max(0, (h - cota[k - 1]) / (cota[k] - cota[k - 1]))));
          cc.multiplyScalar(Math.min(1.4, som.getX(i) * 1.2)); som.setXYZ(i, cc.r, cc.g, cc.b);
        }
        som.needsUpdate = true; return new THREE.MeshLambertMaterial({ ...op, vertexColors: true });
      }
      return new THREE.MeshLambertMaterial({ ...op, color: col, map: m.map || null, vertexColors: !!m.vertexColors });
    };
    scene.traverse((ob) => {
      if (!ob.material) return;
      const lista = Array.isArray(ob.material) ? ob.material : [ob.material];
      lista.forEach((m, i) => { if (!malos.has(r.properties.get(m)?.currentProgram)) return; const n = cambia(ob, m); mats.push(n); if (Array.isArray(ob.material)) ob.material[i] = n; else ob.material = n; });
    });
  }
  function frame(now) {
    raf = 0;
    if (!vivo) return;
    if (!host.isConnected || !rendererVivo(r)) { dispose(); return; }
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    try { pinta(now); fallos = 0; } catch (e) {
      if (!fallos++) { console.error('mapa 3D', e); (window.__errors ||= []).push('mapa 3D: ' + (e?.message || e)); }
      if (fallos > 20) cae();
    }
  }
  function pinta(now) {
    if (o.pausado?.() || !compilado) { last = now; return; }   // (con algo a pantalla completa encima, no se pinta)
    // (el selector de personaje usa este mismo lienzo, src/hub/stage.js: en la primera visita sale encima del mapa, se lo
    // lleva y, al cerrarse, no lo devolvía. El mapa seguía pintando fuera de la página y no se veían ni la entrada ni el
    // mapa. Ahora, en cuanto el mapa vuelve a verse, lo recupera con su tamaño)
    if (cv.parentNode !== host) { sueltaEscenario(); cv.className = 'm3-cv'; cv.style.opacity = cv.style.transition = ''; host.prepend(cv); sz.w = 0; }
    // (en el móvil, y en el ordenador mientras nada se mueve, 30 imágenes por segundo: las chinchetas que flotan no
    // necesitan más, y así el resto del menú va más suelto)
    const quieto = !keys.size && !vuelo && !ptrs.size && !inercia && Math.abs(goal.d - v.d) < 0.05 * v.d && Math.abs(goal.x - v.x) + Math.abs(goal.z - v.z) < 0.05;
    // (mientras se toca o se mueve, todas las imágenes; si no van a tiempo, el lienzo baja un poco su resolución. El vuelo de
    // dron sobre un pueblo y el paseo por Navarra también se mueven siempre: a 30 imágenes, el dron iba a trompicones)
    const toca = ptrs.size || inercia || vuelo || keys.size || dron?.listo || paseo;
    if ((quieto || LENTO) && !toca && now - last < 30) return;
    if (toca) { prQuieto = 0; const g = now - last; if (g < 200) { prT += g; prN++; } if (prN >= 40) { if (prT / prN > 36 && prMax > prSuelo) { prMax = Math.max(prSuelo, prMax - 0.25); sz.z = -1; } prT = prN = 0; } }
    else if (prMax < PR_TOP) { prQuieto ||= now; if (now - prQuieto > 1500) { prMax = PR_TOP; sz.z = -1; prQuieto = 0; prT = prN = 0; } }
    // (el tiempo de cada imagen, nunca hacia atrás: la marca del navegador puede ser anterior a la de al crear el mapa, y un
    // paso negativo hacía que la cámara se disparara)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now); const t = Math.max(0, now - t0) / 1000;
    // (el reloj de la entrada grande)
    let tI = 99, dI = 0;
    if (intro) { if (!intro.t && ((cargas < 3 && intro.espera < 2.5) || document.querySelector('.onb'))) intro.espera += dt; else { dI = dt * intro.rapido; intro.t += dI; } tI = intro.t; }
    // (el mapa, listo para verse: con el suelo y el sombreado ya llegados, o a los 2,5 s; entonces se va la lámina del
    // arranque, index.html, y no antes: así no asoma el mapa a medio pintar)
    if (!window.__mapaListo && (cargas >= 3 || t > 2.5)) window.__mapaListo = true;
    // tamaño del lienzo
    const w = host.clientWidth, h = host.clientHeight, z = escala();
    if (w !== sz.w || h !== sz.h || z !== sz.z) { const antes = sz.w; Object.assign(sz, { w, h, z }); if (antes && !sel && !host.classList.contains('m3-usado')) Object.assign(goal, casa()); r.setPixelRatio(Math.min(prMax, prPres(w, h), (devicePixelRatio || 1) * z)); r.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); }
    // movimiento con las teclas y los botones
    if (dron && (ptrs.size || keys.size || inercia || elegido?.id !== dron.id)) dron = null;
    if (dron) sigueDron(dt);
    // (el paseo de dron por Navarra: con todo quieto y nada elegido; se para en cuanto algo de eso cambia)
    const libreP = !ptrs.size && !keys.size && !inercia && !vuelo && !dron && !sel && !elegido && (!intro || intro.hecho) && !MOV_REDUCIDO;
    if (!libreP) { if (paseo) paseo = null; if (ptrs.size || keys.size || inercia || sel || elegido) quietoDesde = now; }
    else if (!paseo && now - quietoDesde > 10000 + (paseoVisto ? 0 : -7000)) { paseo = { t: 0, base: { ...goal } }; paseoVisto = true; }
    if (paseo) sigueDronNavarra(dt);
    if (islaDron) { if (sel !== islaDron.c.id || vuelo || dron || elegido || ptrs.size || keys.size || inercia) islaDron = null; else sigueDronIsla(dt); }
    if (keys.size) {
      const sp = goal.d * 0.9 * dt, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      if (keys.has('f')) { goal.x += fx * sp; goal.z += fz * sp; } if (keys.has('b')) { goal.x -= fx * sp; goal.z -= fz * sp; }
      if (keys.has('l')) { goal.x += fz * sp; goal.z -= fx * sp; } if (keys.has('r')) { goal.x -= fz * sp; goal.z += fx * sp; }
      if (keys.has('ql')) goal.yaw += dt * 1.4; if (keys.has('qr')) goal.yaw -= dt * 1.4;
      if (keys.has('in')) goal.d *= Math.exp(-dt * 1.6); if (keys.has('out')) goal.d *= Math.exp(dt * 1.6);
      lim();
    }
    // (la inercia al soltar el mapa: sigue y frena)
    if (inercia) { goal.x += inercia.vx * dt; goal.z += inercia.vz * dt; const f = Math.exp(-dt * 4.2); inercia.vx *= f; inercia.vz *= f; lim(); v.x = goal.x; v.z = goal.z; if (Math.hypot(inercia.vx, inercia.vz) < goal.d * 0.02) inercia = null; }
    // (la comarca de debajo del centro, moviéndose a mano con una elegida: si lleva 0,2 s en otra, pasa a ella sin volar; fuera
    // de Navarra se queda la que había. No con un pueblo elegido ni con una colección)
    if (navega && sel && !elegido && !COL && !vuelo) {
      const c = deQuien(goal.x, goal.z, byId.get(sel));
      if (!c || c.id === sel) cand = null;
      else if (cand?.id !== c.id) cand = { id: c.id, t: now };
      else if (now - cand.t > 200) select(c.id, false, true);
    }
    if (intro && !intro.hecho) {
      // (en la entrada, la cámara baja desde lo alto de la península; la distancia, en proporción, para que el zoom no se frene)
      const a = intro.de, k = ease(rampa(tI, IT.vuelo, IT.vuelo + IT.vueloD)), d0 = a.d * (1 - 0.05 * Math.min(1, tI / IT.vuelo));
      for (const q of ['x', 'z', 'yaw', 'pitch']) v[q] = mezcla(a[q], goal[q], k);
      v.yaw += Math.sin(k * Math.PI) * 0.35;   // (baja girando un poco, como un avión que entra a tomar tierra)
      v.d = Math.exp(mezcla(Math.log(d0), Math.log(goal.d), k));
      if (tI >= IT.fin) acabaIntro();
    } else if (vuelo) {
      // (por su camino, volar, arrancando y frenando suave; si va a un pueblo cuyas casas llegan por el camino, el final se
      // corre poco a poco hasta su corazón y su inclinación, sigueDron, y el vuelo acaba justo donde empieza el dron)
      // (k, con una curva que arranca y frena sin tirón ni en la velocidad ni en la aceleración: con la de siempre, a media
      // travesía, en lo más rápido, pasaba de golpe de acelerar a frenar)
      vuelo.t += dt / vuelo.dur; const tv = Math.min(1, vuelo.t), k = tv * tv * tv * (tv * (6 * tv - 15) + 10), de = vuelo.de, a = vuelo.a, cm = (vuelo.cm ||= camino(de, a));
      const P = vuelo.t >= 1 ? { u: 1, w: a.d * ANCHO_V } : cm.en(k), D = dron && vuelo.dron === dron ? dron : null;
      const fx = D ? D.X : a.x, fz = D ? D.Z : a.z, fp = D ? D.p0 : a.pitch;
      v.x = de.x + (fx - de.x) * P.u; v.z = de.z + (fz - de.z) * P.u; v.d = P.w / ANCHO_V; v.yaw = mezcla(de.yaw, a.yaw, k);
      // (en lo alto del camino, mirando más desde arriba, según lo que sube por encima de la mezcla de las dos distancias; con
      // una curva suave, sin pasar de 1,25: antes se recortaba y la inclinación daba tirones)
      const alto = Math.max(0, Math.log(v.d) - mezcla(Math.log(de.d), Math.log(a.d), k)), p = mezcla(de.pitch, fp, k);
      v.pitch = p + Math.max(0, 1.25 - p) * 0.6 * alto * alto / (alto * alto + 1.44);
      if (vuelo.t >= 1) vuelo = null;
    } else { const k = 1 - Math.exp(-dt * 9); for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) v[q] += (goal[q] - v[q]) * k; }
    // (con el panel abierto, el centro de la vista se corre a lo que queda libre, poco a poco)
    const hu = huecoAhora(), kk = 1 - Math.exp(-dt * 8);
    off.x += ((hu.r || 0) / 2 - off.x) * kk; off.y += (((hu.b || 0) - (hu.t || 0)) / 2 - off.y) * kk;
    if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) cam.setViewOffset(w, h, off.x, off.y, w, h); else if (cam.view?.enabled) cam.clearViewOffset();
    // las comarcas: crecen al empezar (una tras otra), se levantan al pasar por encima o al elegirlas; y su relieve fino
    detalles(now, quieto); finos(dt, now, quieto);
    // (la altura, exagerada cinco veces de lejos para que se lean las sierras, y menos al acercarse, donde con tanta
    // exageración los montes parecían agujas; y de muy cerca, el grano fino del terreno)
    // (y aún menos en la maqueta de un pueblo, donde ya casi es la de verdad)
    const exa = exaDe(v.d);
    CERCA.value = Math.min(1, Math.max(0, (14 - v.d) / 8)); TEXK.value = Math.min(1, Math.max(0.9, (95 - v.d) / 45)); ANCHO_RIO.value = Math.min(1, Math.max(0.12, v.d / 40)); ANCHO_B.value = Math.max(0.004, v.d * 0.0026); FUERA.value = 0.82 + 0.18 * Math.min(1, Math.max(0, (v.d - 6) / 24)); RIO_ESC.value = Math.min(10, Math.max(1, 25 / v.d));
    TIEMPO.value = t; aves.update(dt, t, v, !intro || intro.hecho); INVEXA.value = 1 / exa; TAM.value = Math.min(1, Math.max(0, (v.d - 4) / 18));   // (las texturas, ya algo en la vista de toda Navarra: los campos, el bosque y la roca; y las nubes, que pasan)
    const velC = Math.min(1, 0.15 + v.d / 3);
    for (const c of C) {
      let nace = ease(Math.max(0, Math.min(1, (t - c.d) / 0.7))), alza = 0, posa = 0;
      if (intro) {
        // (en la entrada: tiembla, crece mientras sube y se posa; suelta fragmentos mientras sube y aún algo arriba)
        const [k, y, sube, baja, tl] = despegue(c, tI), tb = 0.12 * rampa(tI, IT.tiembla, IT.sube) * (1 - sube);
        nace = k; alza = y; posa = tl > 0 ? Math.exp(-tl * 3.5) : 0; c.suelta = sube > 0.02 && baja < 0.3 ? (sube < 1 ? 1 : 0.4) * (1 - baja / 0.3) : 0;
        if (!intro.hecho) { c.mesh.position.x = c.linea.position.x = Math.sin(tI * 63 + c.d * 13) * tb; c.mesh.position.z = c.linea.position.z = Math.cos(tI * 49 + c.d * 7) * tb; }
        if (!c.solto && sube > 0.03) { c.solto = true; terr.anillo(c, 1.2, 1.6); }
        if (!c.posada && tl > 0) { c.posada = true; terr.anillo(c, 2.6, 1.9); }
      }
      // (solo la elegida se levanta; la de debajo del ratón solo se aclara: si se levantaba, dejaba de estar debajo del
      // puntero, bajaba y volvía a subir, y el mapa daba saltos al pasar por encima)
      // (con la cámara muy cerca, más despacio: así, al saltar de un pueblo a otro o al volver, la de debajo baja mientras la
      // cámara ya va subiendo, y no de golpe a ras de tejado; la cámara va con ella: frame)
      c.lift += ((sel === c.id ? 0.9 : 0) - c.lift) * (1 - Math.exp(-dt * 10 * velC));
      c.hov += ((hover === 'c:' + c.id ? 1 : 0) - c.hov) * (1 - Math.exp(-dt * 12));
      // (con otra elegida, pasa al fondo: más baja, casi sin color y más oscura bajo una bruma de piedra templada, y su agua y
      // su borde casi no se ven; la elegida, más viva. Antes las demás apenas cambiaban y no se distinguía cuál era)
      c.fondo += (((sel && sel !== c.id) || (COL?.resalta && !COL.resalta.has(c.id)) ? 1 : 0) - c.fondo) * (1 - Math.exp(-dt * 6 * velC));   // (con una colección, las que no tienen lo elegido, también)
      // (crece del suelo al empezar; se levanta con sus sellos y al elegirla)
      // (la isla: sube con un muelle, se pasa un poco y se posa en el aire; arriba, se mece despacio, y de cerca, quieta)
      let vuela = 0;
      if (c.isla) { const I = c.isla, ob = sel === c.id && !COL ? 1 : 0; I.v = (I.v || 0) + ((ob - (I.k || 0)) * 24 - (I.v || 0) * 6.5) * dt; I.k = Math.max(0, (I.k || 0) + I.v * dt);
        if (islaFija != null && sel === c.id) { I.k = islaFija; I.v = 0; }   // (en las pruebas: la isla quieta a esa altura)
        if (tv?.c === c && tv.fase === 'vuelo') { I.k = 0; I.v = 0; }   // (con vídeo, la isla espera abajo a que empiece)
        if (!ob && I.k < 0.002) { I.k = 0; I.v = 0; } vuela = I.alto * I.k + Math.sin(t * 0.8 + c.d * 5) * 0.14 * Math.min(1, I.k) * Math.min(1, Math.max(0, (v.d - 8) / 10)); }
      c.sy = Math.max(0.01, nace) * exa; c.py = (c.alzado + c.lift + vuela - 0.35 * c.fondo) * nace + alza;
      c.mesh.scale.y = c.sy; c.mesh.position.y = c.py; c.linea.scale.y = c.sy; c.linea.position.y = c.py; if (c.arbolFondo) c.arbolFondo.value = c.fondo * (1 - 0.6 * cieloK);
      // (ya en el aire, y acabado su vídeo si lo hay, la cámara sube y mira más desde arriba: se ve el territorio entero, sus
      // pueblos y sus montes; la vista de lado es para verla arrancarse. Si el jugador ya ha movido la cámara, no)
      if (c.isla && sel === c.id && !c.vistaAlta && (c.isla.k || 0) > 0.97 && !tv && !vuelo && !window.__sinVistaAlta) { c.tAlta = (c.tAlta || 0) + dt;   // (__sinVistaAlta: para sacar los fotogramas del vídeo)
        if (c.tAlta > 1.3) { c.vistaAlta = true;
          if (Math.abs(goal.pitch - PITCH_ISLA) < 0.03 && !gesto && !ptrs.size) { const I = c.isla, esq = c.esq.map(q => q.clone().setY(q.y > 0.5 ? q.y + I.alto : I.alto));
            volar({ x: c.mid.x, z: c.mid.z, d: Math.max(14, encaja(esq, c.mid.x, c.mid.z, PITCH_ALTA, 1, c.alzado + I.alto + GROSOR + c.hmax * 0.3)), yaw: 0, pitch: PITCH_ALTA }, 1.8); c.dronPend = true; } } }
      if (c.dronPend && sel === c.id && !vuelo) { c.dronPend = false; if (!MOV_REDUCIDO) islaDron = { c, t: 0, base: { ...goal } }; }
      if (c.isla) { c.isla.update(c.py, c.sy, Math.min(1.15, c.isla.k || 0), t, dt, r.domElement.height * cam.projectionMatrix.elements[5] * 0.5, cam);
        c.mesh.material[1].visible = (c.isla.k || 0) < 0.02; }   // (en el aire, la pared de la comarca se esconde: la tapan el canto de césped y la panza)
      // (y con el cielo, las paredes de todas, de roca: las de las vecinas se ven por el hueco, y Navarra flota como la isla)
      { const bm = c.mesh.material[1]; bm.userData.c0 ||= bm.color.clone(); bm.color.copy(bm.userData.c0).lerp(ROCA_BORDE, Math.max(c.isla ? Math.min(1, c.isla.k || 0) : 0, cieloK * 0.9)); }
      // (con una isla en el aire y el cielo de día, las demás no se quedan grises: guardan buena parte de su color de verdad)
      const fv = c.fondo * (1 - 0.6 * cieloK);
      const u = c.top.uniforms; u.uGris.value = c.gris + (0.8 - c.gris) * fv - 0.18 * c.lift;
      u.uTinte.value.copy(c.tinte).lerp(BRUMA_C, fv); u.uTintK.value = c.tintK * (1 - 0.7 * c.lift / 0.9) + (0.38 - c.tintK) * fv;   // (la elegida, casi sin su color encima: se ven el monte y el campo)
      u.uBrillo.value = ((c.vivo ? 1 : 0.9) + c.lift * 0.24 + c.hov * 0.08 + (c.done ? Math.sin(t * 2 + c.d * 9) * 0.03 : 0)) * (1 - 0.32 * fv)
        + (intro ? 0.35 * (1 - rampa(tI, IT.sube, IT.sube + 0.8)) * (0.5 - 0.5 * Math.cos(tI * 7)) + 0.45 * posa : 0);   // (en la entrada, Navarra late en el mapa antes de soltarse, y cada comarca brilla al posarse)
      c.rioM.opacity = 1 - 0.85 * fv; c.lagoM.opacity = 0.92 * (1 - 0.8 * fv); c.linea.material.opacity = c.lineaOp * (1 - 0.85 * c.fondo); if (c.bordeIn) c.bordeIn.opacity = 0.9 * (1 - 0.55 * c.fondo);
      const dk = c.top.uniforms.uDetK; dk.value += ((det.get(c.id)?.tex ? 1 : 0) - dk.value) * (1 - Math.exp(-dt * 4));
      const ok = c.top.uniforms.uOrtoDK; ok.value += ((det.get(c.id)?.orto ? 1 : 0) - ok.value) * (1 - Math.exp(-dt * 4));
    }
    // la cámara, ya con las comarcas en su sitio de esta imagen
    // (de cerca, la cámara mira a la altura del suelo que tiene debajo: con una altura fija, el pueblo quedaba por encima del
    // centro, bajo la cabecera; de lejos, a la de siempre, con la que se calcula la vista de toda Navarra)
    // (sobre un sitio, la de su comarca, aunque el vaivén del dron se asome a la de al lado, que está más baja: en los
    // espacios naturales, junto al borde, la cámara se hundía de golpe al cruzarlo)
    const bajo = deQuien(v.x, v.z, bajoC); if (bajo) bajoC = bajo;
    const ref = (dron?.listo && byId.get(tById.get(dron.id)?.comarca)) || bajo;
    const kh = Math.min(1, Math.max(0, (40 - v.d) / 24)), hs = ref?.sy ? pisoEn(ref, v.x, v.z) * ref.sy + ref.py : 0.8;
    // (y si esa comarca sube o baja, al elegir otra, al volver a toda Navarra o al cambiar lo exagerado del relieve, la cámara
    // va con ella, en la misma imagen: antes la comarca bajaba de golpe, más de cinco veces lo que la cámara estaba de cerca,
    // y la cámara la seguía después; era el golpe al elegir otro pueblo o al volver)
    if (ref && ref === hRef.c) v.hy += (pisoEn(ref, v.x, v.z) * (ref.sy - hRef.sy) + ref.py - hRef.py) * kh;
    hRef.c = ref; hRef.sy = ref?.sy; hRef.py = ref?.py;
    if (tv) { tv.t += dt;
      if (tv.fase === 'vuelo') {
        if (!vuelo && tv.vid.readyState >= 3) { tv.fase = 'video'; tv.vid.style.transition = 'opacity .5s ease'; tv.vid.style.opacity = '1'; capa.style.visibility = 'hidden'; const vv = tv.vid; vv.play().catch(() => { if (tv?.vid === vv) quitaVideoIsla(false); }); }
        else if (tv.t > 4.5) quitaVideoIsla(false);   // (no ha llegado: la isla sube como siempre)
      } else if (tv.fin || tv.vid.ended || (tv.vid.duration && tv.vid.currentTime > tv.vid.duration - 1.35)) quitaVideoIsla(true);
    }
    { const f = tv && tv.fase === 'video' ? tv.fov : FOV0; if (Math.abs(cam.fov - f) > 1e-3) { cam.fov = tv ? f : cam.fov + (f - cam.fov) * (1 - Math.exp(-dt * 2)); cam.updateProjectionMatrix(); } }
    const ci = sel && byId.get(sel), fi = ci?.isla ? Math.min(1, ci.isla.k || 0) * Math.min(1, Math.max(0, (v.d - 8) / 10)) : 0;
    const hyIsla = fi ? ci.py + ((GROSOR + ci.hmax * 0.5) * ci.sy - ci.isla.D * Math.min(1, ci.isla.k)) / 2 : 0;
    v.hy += (0.8 + (hs - 0.8) * kh + (hyIsla - 0.8 - (hs - 0.8) * kh) * fi - v.hy) * (1 - Math.exp(-dt * 4));   // (con la isla en el aire, la cámara mira a su mitad)
    camPos(v, cam.position);
    // (la cámara nunca entra en el relieve ni lo deja entre ella y lo que mira: si una sierra, o la comarca levantada, se
    // mete por medio, sube por la ladera lo justo, como un dron, y cuando ya no hace falta baja despacio. Antes, en el vuelo
    // sobre un pueblo con montes alrededor (Leitza), atravesaba la montaña y se veía negro: el fondo, por debajo del relieve)
    // (al subir, deprisa pero sin salto, sin quedarse nunca a menos de media holgura: antes subía de golpe, en una imagen)
    { const need = despeje(v, cam.position), hol = 0.5 * (0.004 + v.d * 0.03 + nearDe(v.d) * 0.3);
      subida += (need - subida) * (1 - Math.exp(-dt * (need > subida ? 12 : 2.5))); subida = Math.max(subida, need - hol); cam.position.y += subida; }
    if (intro && tI < IT.fin + 1) { const tb = temblor(tI) * v.d * 0.003; cam.position.x += Math.sin(tI * 71) * tb; cam.position.y += Math.sin(tI * 53 + 1) * tb; cam.position.z += Math.sin(tI * 61 + 2) * tb; }
    cam.lookAt(v.x, v.hy, v.z);
    // (lo más cerca que se pinta, según lo lejos que está la cámara: así el suelo, el hueco y lo de encima no se pisan desde lo alto)
    // (y la niebla de lo lejano: de lejos, del color del fondo, donde Navarra flota; de cerca, una bruma clara, como la del
    // aire sobre el monte, y no el azul casi negro del fondo)
    // (con una isla en el aire, el fondo se vuelve un cielo azul con nubes, como en las imágenes del autor, y la niebla de lo
    // lejano, la bruma clara de ese cielo; al bajar, vuelve el fondo de siempre)
    cieloK = 1;
    cieloFondo.visible = cieloK > 0.004; cieloFondo.material.uniforms.uK.value = cieloK; cieloFondo.material.uniforms.uT.value = t; cieloFondo.position.copy(cam.position);
    nubes.update(t, dt, v, cam, scene.fog.far, CIELO_BRUMA);
    FONDO_L.value.set(FONDO).lerp(CIELO_BRUMA, cieloK); CIELO.value = cieloK;
    ORTO_K.value += (ortoListo - ORTO_K.value) * (1 - Math.exp(-dt * 3));
    scene.fog.near = Math.max(4, v.d * 0.95); scene.fog.far = Math.max(10, v.d * 2.2); scene.fog.color.copy(NIEBLA_LEJOS).lerp(NIEBLA_CERCA, Math.min(1, Math.max(0, (14 - v.d) / 10))).lerp(CIELO_BRUMA, cieloK * 0.85); cam.near = Math.max(Math.min(0.5, v.d * 0.2), v.d * 0.1 - 1.5); cam.far = v.d * 2.6 + 60; cam.updateProjectionMatrix();
    cieloFondo.material.uniforms.uBruma.value.copy(scene.fog.color);   // (el cielo, junto al horizonte, del color de la bruma en la que se pierde la tierra)
    // (las chinchetas, algo más grandes de lejos para que se vean desde toda Navarra y pequeñas de cerca, para que no tapen
    // el pueblo)
    // (a media distancia, no menos de 0,42, para que se lean; dentro de la maqueta, diminutas)
    const lejos = v.d < 1.4 ? 0.035 * (v.d / 1.4) ** 1.5 : Math.min(1.7, Math.max(v.d / 45, Math.min(0.42, 0.035 + (v.d - 1.4) * 0.2)));
    UT.value = t; UESC.value = r.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360));
    // (con una comarca elegida, los medallones de sus pueblos, más grandes, con su foto; en toda Navarra y con un pueblo
    // abierto, pequeños)
    medG += ((sel && !COL && !elegido ? 1 + 1.2 * Math.min(1, Math.max(0, (v.d - 4) / 12)) : 1) - medG) * (1 - Math.exp(-dt * 5));   // (de cerca, sin agrandar: tapaban el monte)   // (con un pueblo abierto, pequeños: no tapan su maqueta)
    T.forEach((x, i) => {
      const nace = ease(intro ? rampa(tI, IT.pines + x.c.d * 0.4, IT.pines + x.c.d * 0.4 + 0.5) : Math.max(0, Math.min(1, (t - 0.9 - x.c.d * 0.6) / 0.5)));
      // (con una comarca elegida, solo quedan las suyas: las demás se encogen hasta desaparecer)
      x.k += ((COL ? (COL.pines?.has(x.id) ? 1 : 0) : sel && sel !== x.comarca ? 0 : 1) - x.k) * (1 - Math.exp(-dt * 8));   // (con una colección, solo las de sus pueblos)
      // (señalada, crece y brilla; elegida, la mira lo fija)
      x.sen += ((hover === 't:' + x.id ? 1 : 0) - x.sen) * (1 - Math.exp(-dt * 10)); x.fija += ((elegido === x ? 1 : 0) - x.fija) * (1 - Math.exp(-dt * 6));
      const gy = x.g.position.y = (maq?.malla && maq.e.t === x ? pisoEn(x.c, x.X, x.Z) : x.hs + (x.dh || 0) * x.c.fk.value) * x.c.sy + x.c.py + 0.04 * Math.min(1, v.d / 4);
      // (la chincheta, quieta: ni gira ni se mece)
      const s = Math.max(0.01, nace * (1 + 0.35 * x.sen) * lejos * x.k), cy = gy + s * CRISTAL_Y * (1 + (medG - 1) * 0.45);
      x.g.scale.setScalar(s); x.bola.position.y = 0;   // (la bola: lo que se toca y donde se ancla la ficha: el sitio del pueblo, donde apunta el pico de su ficha)
      mira.setMatrixAt(i, BM.compose(BV.set(x.X, gy + 0.02, x.Z), Q0, BS.set(s * 0.85 * x.kt, 1, s * 0.85 * x.kt)));
      hilo.setMatrixAt(i, BM.compose(BV.set(x.X, gy, x.Z), Q0, BS.set(s * 0.04, cy - gy - s * 0.2, s * 0.04)));
      cristal.setMatrixAt(i, BM.compose(BV.set(x.X, cy, x.Z), Q0, BS.setScalar(s * 0.5 * x.kt * medG)));
      haloP.setXYZ(i, x.X, cy, x.Z); haloS.setX(i, x.here || x.state === 'go' ? s * 1.8 * x.kt : 0); aInf.setXYZW(i, x.ph + (x.here ? 10 : 0), x.lleno, x.sen, x.fija);
      if (x.haz) { const kh = Math.min(1, lejos); x.haz.scale.set(kh, Math.max(0.01, nace * kh), kh); x.haz.position.y = gy + 6 * nace * kh; hazM.opacity = (0.4 + Math.sin(t * 2.4) * 0.12) * nace * x.k; }
    });
    for (const a of [mira.instanceMatrix, hilo.instanceMatrix, cristal.instanceMatrix, aInf, haloP, haloS, haloI]) a.needsUpdate = true;
    // (los fragmentos y el polvo de la entrada; cuando ya no queda ninguno, se quitan)
    if (terr && !terr.fin) { if (!intro.hecho) terr.suelta(dI); terr.ESC.value = r.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360));
      if (!terr.mueve(dI || dt) && intro.hecho) { terr.fin = true; scene.remove(terr.im, terr.nube); } }
    // los núcleos: el pintado entra al acercarse y las casas en pie, ya muy cerca
    nucleos(now, quieto); maqueta(dt, quieto); emblemas(dt, quieto);
    const kN = Math.min(1, Math.max(0, (NUC_LEJOS - v.d) / (NUC_LEJOS - NUC_CERCA))), kC = v.d < CASAS_D ? 1 : 0;
    for (const e of nuc.values()) {
      if (!(e.slot >= 0)) continue; const f = 1 - 0.85 * e.c.fondo;   // (en una comarca al fondo, casi no se ve)
      e.op += (kN * f - e.op) * (1 - Math.exp(-dt * 5)); e.c.top.uniforms.uPK.value[e.slot] = e.op;
      e.op2 += ((maq?.e === e && maq.malla ? 0 : kC) * f - e.op2) * (1 - Math.exp(-dt * 5)); e.casas.material.opacity = e.op2; e.casas.visible = e.op2 > 0.01;
    }
    r.setClearColor(FONDO, 1);
    if (show && !intro.hecho) show.tick(tI);
    r.render(scene, cam);
    if (!revisa.listo && cargas >= 3 && (!intro || intro.hecho)) { revisa.listo = true; otraVez(); }
    if (revisa.cuando && now >= revisa.cuando) revisaImagen();
    // los nombres encima, sin pisarse nunca ni quedar debajo de lo de encima: primero el pueblo donde estás y el que señalas;
    // de cerca, los pueblos antes que las comarcas; de lejos, al revés. El que no cabe, se esconde. Con una comarca
    // elegida, solo los suyos; sin elegir, de lejos solo las comarcas (y el pueblo donde estás), y al acercarse, lo demás
    if (now - tapas.t > 400) medirTapas(now);
    const cerca = v.d < PUEBLO_D, ocupado = tapas.r.slice(), lista = [];
    // (con una colección, sus marcadores primero, y fuera los nombres de pueblos, comarcas, ríos y montes: ya los dicen ellos)
    if (COL) for (const it of COL.items) { const x = it.t, c = it.c;
      if (x) lista.push([it.sel ? -2 : -1, it.el, x.X, x.g.position.y + 2.2 * x.g.scale.y, x.Z, true, x.g.position.y]);
      else lista.push([it.sel ? -2 : -1, it.el, c.X, c.hc * c.sy + c.py + 1.4, c.Z, true, c.py]); }   // (si encima no cabe, debajo)
    for (const x of T) { const on = !COL && (sel ? sel === x.comarca || hover === 't:' + x.id : cerca || x.here || hover === 't:' + x.id);
      const ya = elegido === x, sh = hover === 't:' + x.id; if (ya !== !!x._sel) { x._sel = ya; x.lab.classList.toggle('sel', ya); } if (sh !== !!x._hov) { x._hov = sh; x.lab.classList.toggle('hov', sh); }
      lista.push([x.here || sh || ya ? 0 : cerca || sel === x.comarca ? 1 : 3, x.lab, x.X, x.g.position.y, x.Z, on, x.g.position.y, true]); }   // (si encima no cabe, debajo, con el pico arriba; y si tampoco, solo la foto)
    // (con una comarca elegida, también los nombres de las de alrededor, apagados y los últimos, donde quepan: así se ve hacia
    // dónde ir arrastrando el mapa. No con un pueblo elegido)
    for (const c of C) { const suya = sel === c.id; lista.push([suya && cerca ? 4 : !sel || suya ? 2 : 10, c.lab, c.X, c.hc * c.sy + c.py + 1.4, c.Z, !COL && (!sel || suya || !elegido)]); }
    for (const x of N) lista.push([x.k ? 5 + x.k : 5, x.lab, x.X, x.c ? (x.h + (x.dh || 0) * x.c.fk.value) * x.c.sy + x.c.py : x.h, x.Z, !COL && (sel ? x.c?.id === sel : v.d < 55)]);
    // (los montes, si encima no caben, debajo de su cima, como los pueblos: así se leen aunque haya dos muy juntos)
    for (const x of PK) { const y = x.c ? (x.h + (x.dh || 0) * x.c.fk.value) * x.c.sy + x.c.py : x.h; lista.push([x.p, x.lab, x.X, y, x.Z, !COL && !maq && (sel ? x.c?.id === sel : v.d < 30), y, true]); }
    if (maq?.labs) { const c = maq.e.c, on = v.d < 1.3 && maq.op > 0.6; for (const x of maq.labs) lista.push([9, x.lab, x.X, pisoEn(c, x.X, x.Z) * c.sy + c.py + 30 * MU, x.Z, on]); }
    // (la cañada de la trashumancia y su rebaño: de lejos, o con una de las comarcas por las que pasa; no en un pueblo)
    // (en la vista de toda Navarra y con una comarca elegida por la que pasa; con otra comarca, con un pueblo o una maqueta,
    // no. Un tiempo solo salía con una de sus comarcas elegida y el autor la echaba de menos: noviembre de 2026)
    { const on = !COL && !elegido && !maq && v.d > 2.6 && (!sel || canCom.has(sel)), Y = (p) => p.c ? p.h * p.c.sy + p.c.py : p.h;
      if (!canSvg.isConnected) { capa.prepend(canSvg); capa.append(rebano); }
      canSvg.style.display = on ? '' : 'none';
      // (con una comarca subida como isla, la raya se corta en su orilla: si no, bajaba en vertical desde la isla al mapa)
      if (on) { let d = '', ant = null; const isla = (c) => c?.isla?.k > 0.05;
        for (const p of canP) { pv.set(p.X, Y(p), p.Z).project(cam);
          if (pv.z >= 1) { ant = null; continue; }
          d += `${!ant || (ant.c !== p.c && (isla(ant.c) || isla(p.c))) ? 'M' : 'L'}${((pv.x + 1) / 2 * sz.w).toFixed(1)},${((1 - pv.y) / 2 * sz.h).toFixed(1)} `; ant = p; }
        for (const pl of canSvg.children) pl.setAttribute('d', d); }
      const u = (now / 1000 / 80) % 1, f = u * (canP.length - 1), i = Math.floor(f), a = canP[i], b = canP[Math.min(i + 1, canP.length - 1)], t = f - i;
      lista.push([6, rebano, a.X + (b.X - a.X) * t, Y(a) + (Y(b) - Y(a)) * t + 0.3, a.Z + (b.Z - a.Z) * t, on]); }
    lista.sort((a, b) => a[0] - b[0]);
    for (const [, el, x, y, z, on, y2, punto] of lista) etiqueta(el, x, y, z, on, ocupado, y2, punto);
    // (dónde queda la cabeza de la chincheta del pueblo elegido: ahí se ancla su ficha)
    if (elegido && o.sigue) { elegido.bola.getWorldPosition(bw).project(cam); o.sigue((bw.x + 1) / 2 * sz.w, (1 - bw.y) / 2 * sz.h, bw.z < 1); }
  }
  // (lo de encima, medido de vez en cuando, en píxeles del mapa)
  const tapas = { t: -1e9, r: [] };
  function medirTapas(now) {
    tapas.t = now; tapas.r = []; if (!o.tapa) return;
    const b = host.getBoundingClientRect(), k = escala() || 1;
    // (también lo que el menú pone encima del mapa, fuera de él: el botón del menú y tu ficha)
    for (const e of (host.closest('#hub') || host).querySelectorAll(o.tapa)) { if (e.hidden || !e.offsetParent) continue; const r = e.getBoundingClientRect(); if (!r.width) continue;
      tapas.r.push([(r.left - b.left) / k, (r.top - b.top) / k, (r.right - b.left) / k, (r.bottom - b.top) / k]); }
  }
  // (cada nombre aparece y se va fundiéndose, y el que ya se ve guarda su sitio con algo de margen: al mover el mapa, los que
  // rozan a otro no parpadean. Solo se mueve si se ha movido de verdad)
  // (los de los pueblos, si encima no caben, debajo de su baliza: así se leen aunque dos pueblos estén muy juntos)
  const libreEn = (R, g, ocupado) => !(R[0] < -g || R[2] > sz.w + g || R[1] < -g || R[3] > sz.h + g || ocupado.some(q => R[0] < q[2] && q[0] < R[2] && R[1] < q[3] && q[1] < R[3]));
  // (punto: los montes, si su nombre no cabe ni encima ni debajo, se quedan solo con el triángulo de la cima, si ahí cabe:
  // así se ve que ahí hay un monte aunque su nombre salga solo al acercarse)
  function etiqueta(el, x, y, z, on, ocupado, y2, punto) {
    pv.set(x, y, z).project(cam);
    let ok = on && pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1, px = (pv.x + 1) / 2 * sz.w, py = (1 - pv.y) / 2 * sz.h, abajo = false, solo = false;
    if (ok) {
      // (al medirlo se esconde un momento; luego vuelve a decidirse si se ve: antes, al llegar la letra, todos los nombres se
      // volvían a medir y se quedaban escondidos hasta que se movía el mapa)
      if (!el._w) { el.hidden = false; el.classList.add('fuera'); el._w = el.offsetWidth; el._h = el.offsetHeight; el._ya = 0; }
      const g = el._on ? -3 : 4, w = el._w / 2;
      if (!libreEn([px - w - g, py - el._h - g, px + w + g, py + 1 + g], g, ocupado)) {
        ok = false;
        if (y2 != null) { pv.set(x, y2, z).project(cam); const qx = (pv.x + 1) / 2 * sz.w, qy = (1 - pv.y) / 2 * sz.h + 6 + el._h;
          if (pv.z < 1 && libreEn([qx - w - g, qy - el._h - g, qx + w + g, qy + 1 + g], g, ocupado)) { ok = abajo = true; px = qx; py = qy; } }
        const sp = el._sp || [12, 11];   // (lo que ocupa sin nombre: el triángulo de una cima o la foto de un pueblo)
        if (!ok && punto && libreEn([px - sp[0] / 2, py - sp[1], px + sp[0] / 2, py + 2], 2, ocupado)) ok = solo = true;
        if (!ok && punto && el._siempre) ok = solo = true;   // (un pueblo de la comarca elegida no se esconde nunca: al menos su foto)
      }
      if (ok) { const sp = el._sp || [12, 11]; ocupado.push(solo ? [px - sp[0] / 2, py - sp[1], px + sp[0] / 2, py + 2] : [px - w - 3, py - el._h - 3, px + w + 3, py + 1]); }
    }
    if (ok !== !!el._on || !el._ya) { el._on = ok; el._ya = 1; el.classList.toggle('fuera', !ok); }   // (los que nunca se han visto, también fuera)
    if (!ok) return;
    if (punto && solo !== !!el._solo) { el._solo = solo; el.classList.toggle('punto', solo); }
    if (Math.abs(px - (el._x ?? -1e9)) + Math.abs(py - (el._y ?? -1e9)) < 0.3) return;
    el._x = px; el._y = py; el.classList.toggle('abajo', abajo); el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }
  // (los tamaños de los nombres, otra vez cuando llega la letra)
  document.fonts?.ready.then(() => { for (const e of capa.children) e._w = 0; });
  // (los programas de la tarjeta gráfica, compilados antes de la primera imagen y en paralelo si el navegador puede: en un
  // portátil con gráfica Intel, la primera imagen paraba el menú dos o tres segundos. Mientras, el fondo; como mucho 4 s)
  Promise.race([compilarAsync(r, scene, cam), new Promise(res => setTimeout(res, 4000))]).catch(() => { }).then(() => { compilado = true; t0 = last = performance.now(); });
  raf = requestAnimationFrame(frame);

  function dispose() {
    if (!vivo) return; vivo = false; aves.dispose(); cancelAnimationFrame(raf); io.disconnect(); clearTimeout(perdido); cv.removeEventListener('webglcontextlost', pierde); cv.removeEventListener('webglcontextrestored', vuelve); document.removeEventListener('visibilitychange', otraVez); CINE.classList.remove('m3-cine', 'm3-cine-fin', 'm3-cine-sale'); clearTimeout(salida); show?.quita();
    const hm = CINE.querySelector?.('.hub-main'); if (hm) for (const k of ['left', 'top', 'right', 'bottom']) hm.style[k] = '';
    removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', sueltaTeclas);
    quitaVideoIsla(false); for (const c of C) c.isla?.dispose(); for (const g of geos) g.dispose(); for (const m of mats) { m.map?.dispose(); m.alphaMap?.dispose(); m.dispose(); } sombra.dispose(); orto.dispose(); nada.dispose(); bqTex.dispose(); for (const a of arboles) a.dispose(); for (const e of det.values()) { if (e.tex) suelta(e.tex); if (e.orto) suelta(e.orto); } quitaMaqueta(); for (const e of [...nuc.values()]) quitaNucleo(e);
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
    if (cv.parentNode === host) cv.remove(); capa.remove(); pad.remove();
  }
  return { select, vista, dispose, volar: irPueblo, cierraPueblo, coleccion, encuadra };
}
