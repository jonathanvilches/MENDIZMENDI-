// El mapa 3D de Navarra del inicio: las comarcas con su relieve de verdad (sierras, valles y ríos), cada una en su color y
// separada de las demás, con todos los pueblos del juego señalados encima, y una cámara para recorrerlo. Las comarcas por
// descubrir salen apagadas y bajas; a medida que sellas sus pueblos se encienden y crecen, hasta brillar del todo: así se
// ve lo que falta para conquistar Navarra. Se mueve como en un juego: arrastrar (o WASD y las flechas) para ir adelante,
// atrás y a los lados, la rueda o el pellizco para acercarse, el botón derecho (o Q y E, o girar con dos dedos) para
// rotar, y los botones de la esquina.
// Al tocar una comarca, la cámara vuela hasta ella; al tocar un pueblo, también, y se abre su ficha.
// Usa el renderizador del menú (src/hub/stage.js: un solo contexto WebGL para todo el menú) y se para solo en cuanto su
// caja sale de la página o deja de verse. Los nombres van en HTML encima del lienzo, nítidos a cualquier tamaño.
import * as THREE from 'three';
import { hubRenderer, rendererVivo } from './stage.js';
import { escala } from '../util/tele.js';
import { esc } from '../util/html.js';
import { mapaXY } from '../util/geo.js';
import { MAPA_IDS, loadMapa } from '../data/reales/index.js';
import { CENTROS } from '../data/reales/centros.js';
import { MAPA_RELIEVE } from '../data/mapa-relieve.js';
import SOMBRA from '../assets/relieve/sombra.webp?url';
import ENTORNO from '../assets/relieve/entorno.webp?url';
import ESPANA from '../assets/relieve/espana.webp?url';
import { webUrl } from '../web/hd.js';
import { haceMaqueta } from './maqueta.js';
import { compilarAsync } from '../util/compilar.js';
import { apunta } from '../util/diag.js';
import { CX, CY, S, W, contorno, GROSOR, EXA, ruidoV, suave, hacerRelieve, losa, panza, enComarca, enPoligono } from './mapa3dFormas.js';
import { BALIZA, CRISTAL_Y, MIRA_VS, MIRA_FS, HILO_VS, HILO_FS, CRISTAL_VS, CRISTAL_FS, ORBITA_FS, HALO_VS, HALO_FS, BORDE_VS, BORDE_FS, PALETA, RELIEVE_VS, NUBES, RELIEVE_FS, PARCHE_VS } from './mapa3dSombreadores.js';

const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const mezcla = (a, b, t) => a + (b - a) * t;
// (la entrada grande, con Navarra despegándose de la península, solo la primera vez que se abre el mapa)
let ENTRADA_VISTA = false;
const rampa = (s, a, b) => Math.min(1, Math.max(0, (s - a) / (b - a)));
// (el fondo del mapa, el mismo que el borde del suelo; y el borde de las comarcas, morado muy oscuro)
const FONDO = 0x101626, OSCURO = new THREE.Color('#1d1240'), BLANCO = new THREE.Color('#ffffff');
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
const srgb = (hex) => new THREE.Color(hex).getRGB(new THREE.Color(), THREE.SRGBColorSpace);

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
  const suelo = (url, w, h, x, z, y, transp) => {
    const g = new THREE.PlaneGeometry(w, h); geos.push(g);
    const m = new THREE.MeshBasicMaterial({ color: FONDO, toneMapped: false, transparent: transp, opacity: transp ? 0 : 1, depthWrite: !transp }); mats.push(m);
    m.onBeforeCompile = (sh) => { sh.uniforms.uT = TIEMPO;   // (las mismas nubes que sobre Navarra)
      sh.vertexShader = 'varying vec2 vMun;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMun = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = 'varying vec2 vMun;\n' + NUBES + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= 1.0 - 0.3 * nubes(vMun);'); };
    m.customProgramCacheKey = () => 'mapa-suelo-nubes';
    new THREE.TextureLoader().load(url, (tx) => { if (!vivo) return tx.dispose(); cargas++; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; Object.assign(m, { map: tx, opacity: 1, needsUpdate: true }); m.color.set(0xffffff); });
    const s = new THREE.Mesh(g, m); s.rotation.x = -Math.PI / 2; s.position.set(x, y, z); scene.add(s); return s;
  };
  const [ex0, ey0, ex1, ey1] = [-3006, -451, 2824, 4150];   // (lo que cubre la imagen de la península, en unidades del mapa)
  suelo(ESPANA, (ex1 - ex0) * S, (ey1 - ey0) * S, ((ex0 + ex1) / 2 - CX) * S, ((ey0 + ey1) / 2 - CY) * S, -0.04, false);
  suelo(ENTORNO, 200, 152, 0, 0, -0.02, true).renderOrder = -2;

  // el sombreado fino, compartido por todas las comarcas (mientras llega, el de cada vértice)
  const R = MAPA_RELIEVE.sombra, LISTO = { value: 0 };
  const sombra = new THREE.TextureLoader().load(SOMBRA, () => { LISTO.value = 1; cargas++; });
  sombra.flipY = false; sombra.colorSpace = THREE.NoColorSpace; sombra.anisotropy = 4;
  const UNI = { uSombra: { value: sombra }, uListo: LISTO, uRect: { value: new THREE.Vector4(R.x0 - R.paso / 2, R.y0 - R.paso / 2, R.w * R.paso, R.h * R.paso) },
    uGrosor: { value: GROSOR }, uExa: { value: EXA }, uPal: { value: PALETA.map(([, h]) => srgb(h)) }, uCota: { value: PALETA.map(([m]) => m) } };
  const nada = new THREE.DataTexture(new Uint8Array([128, 140, 90, 255]), 1, 1); nada.needsUpdate = true;
  const CERCA = { value: 0 }, TEXK = { value: 0 };   // (lo cerca que está la cámara, de 0 a 1: el grano fino del terreno; y las texturas, desde la vista de una comarca)
  const relieveM = (c, vivo) => { const d = MAPA_RELIEVE.detalle[c.id], m = new THREE.ShaderMaterial({ vertexShader: RELIEVE_VS, fragmentShader: RELIEVE_FS, vertexColors: true, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...UNI, uDet: { value: nada }, uDetK: { value: 0 }, uCerca: CERCA, uTex: TEXK, uT: TIEMPO,
      uP0: { value: nada }, uP1: { value: nada }, uP2: { value: nada }, uP3: { value: nada }, uPR: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 1)) }, uPK: { value: [0, 0, 0, 0] }, uDetRect: { value: d ? new THREE.Vector4(d.x0, d.y0, d.w * d.paso, d.h * d.paso) : new THREE.Vector4(0, 0, 1, 1) }, uGris: { value: vivo ? 0 : 0.22 }, uTinte: { value: srgb(vivo ? c.color : '#8f7fd0') }, uTintK: { value: vivo ? 0.08 : 0.1 }, uBrillo: { value: 1 }, uHueco: { value: new THREE.Vector4(0, 0, 0, 0) } } });
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
  // (en el móvil, y en el modo sencillo (o.ligero, src/util/sencillo.js), 30 imágenes por segundo y el relieve algo menos fino)
  const LENTO = !!o.ligero || matchMedia?.('(pointer: coarse)').matches;
  // (la entrada grande: solo la primera vez y sin movimiento reducido; en las pruebas automáticas, solo si se pide)
  // (ni en el modo sencillo ni en el didáctico, o.intro false, donde el mapa no es la portada)
  // (con «Reducir movimiento» en el móvil, también, pero suave: sin el temblor, el destello ni la onda; antes no salía, y en
  // muchos iPhone está puesto)
  const INTRO = o.intro !== false && !o.ligero && !ENTRADA_VISTA && !(navigator.webdriver && !window.__intro); if (o.intro !== false) ENTRADA_VISTA = true;
  const SUAVE = !!matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const CINE = host.closest('#hub') || document.body; if (INTRO) CINE.classList.add('m3-cine');   // (en el menú, a toda la pantalla mientras dura)
  const alto = hacerRelieve();
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
    const { P, cx, cy } = contorno(c.path);
    const Pw = P.map(([x, y]) => W(x, y)), { g, hmax, malla } = losa(Pw, alto, LENTO ? 0.42 : 0.3); geos.push(g);
    // (empezada, con los colores del mapa y un toque del suyo; sin descubrir, apagada y hacia el malva, bajo la niebla)
    const vivo = !!o.abiertas || c.pct > 0 || c.done, top = relieveM(c, vivo);
    const side = bordeM(c, vivo, 0.2, 0.9), mesh = new THREE.Mesh(g, [top, side]); mesh.userData.c = c.id;
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
    lab.innerHTML = `${!vivo && o.icono ? `<i>${o.icono('lock')}</i>` : c.done && o.icono ? `<i>${o.icono('stamp')}</i>` : ''}<b>${esc(c.name)}</b>`;
    // (y su sitio en el mapa, sin encoger: el hueco que deja)
    const Ph = P.map(([x, y]) => W(cx + (x - cx) * 1.022, cy + (y - cy) * 1.022));
    return { ...c, vivo, Pw, Ph, hmax, malla, hc: GROSOR + alto(X, Z), mesh, top, linea, bajo, alzado, lift: 0, fondo: 0, gris: top.uniforms.uGris.value, lineaOp: vivo ? 1 : 0.85, X, Z, lab, d: 0.25 + i * 0.07, hov: 0 };
  });
  // el hueco de Navarra en el mapa de España: oscuro, bajo las comarcas (entre una y otra queda una raya oscura que las
  // separa, y alrededor, un borde). Va con lo transparente, después del suelo de alrededor y antes que lo demás
  { const pos = [], idx = [];
    for (const c of C) { const b = pos.length / 3; for (const [x, z] of c.Ph) pos.push(x, 0.003, z);
      for (const t of THREE.ShapeUtils.triangulateShape(c.Ph.map(([x, z]) => new THREE.Vector2(x, z)), [])) idx.push(b + t[0], b + t[2], b + t[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); geos.push(g);
    const m = new THREE.MeshBasicMaterial({ color: 0x06080c, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); mats.push(m);
    const hueco = new THREE.Mesh(g, m); hueco.renderOrder = -1; scene.add(hueco); }
  const byId = new Map(C.map(c => [c.id, c]));
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
    for (const q of Q) { const c = deQuien(q[0], q[1], de); if (c !== de) { if (de && tramo.length > 1) cinta(de, tramo, ANCHO[rio.k]); tramo = []; de = c; } if (c) tramo.push(q); }
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
  { let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    const tx = BOSQ.w / BOSQ.nx, ty = BOSQ.h / BOSQ.ny, dens = LENTO ? 1.1 : 2.2, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Vector3(), col = new THREE.Color();
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
      const fondo = { value: 0 }, m = M({ roughness: 0.9 }); c.arbolFondo = fondo;
      m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uInvExa: INVEXA, uTam: TAM, uFondo: fondo, uHueco: c.top.uniforms.uHueco });
        sh.vertexShader = 'uniform float uInvExa, uTam; uniform vec4 uHueco;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= uTam; transformed.y *= uInvExa;\nif (uHueco.w > 0.5 && distance(instanceMatrix[3].xz, uHueco.xy) < uHueco.z) transformed *= 0.0;');
        sh.fragmentShader = 'uniform float uFondo;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * 0.6, uFondo * 0.8);'); };
      m.customProgramCacheKey = () => 'mapa-arboles';
      const im = new THREE.InstancedMesh(arbolG, m, L.length); im.raycast = () => {};
      L.forEach(([X, y, Z, mt], n) => {
        const sc = 0.75 + azar() * 0.55, alt = mt > 900;   // (en lo alto, pinos y abetos, más oscuros; abajo, robles y hayas, más claros)
        im.setMatrixAt(n, m4.compose(e3.set(X, y, Z), q.identity(), new THREE.Vector3(sc, sc * (alt ? 1.15 : 0.9), sc)));
        im.setColorAt(n, col.set(alt ? '#2c5530' : '#4a7a36').offsetHSL((azar() - 0.5) * 0.03, 0, (azar() - 0.5) * 0.1));
      });
      im.frustumCulled = false; c.mesh.add(im); arboles.push(im);
    }
  }
  // (cada comarca, con su copia de los materiales del agua: se apaga con ella cuando pasa al fondo)
  // (el ancho de los ríos, según la distancia: de lejos, bien visibles; de cerca, más o menos el de verdad)
  const ANCHO_RIO = { value: 1 };
  // (y donde está la maqueta de un pueblo, el río no se pinta: allí va el suyo, pintado en el suelo)
  const anchoRio = (m, hueco) => { m.onBeforeCompile = (sh) => { sh.uniforms.uAncho = ANCHO_RIO; sh.uniforms.uHueco = hueco;
    sh.vertexShader = 'attribute vec3 lado; uniform float uAncho; varying vec2 vHx;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += lado * uAncho; vHx = transformed.xz;');
    sh.fragmentShader = 'uniform vec4 uHueco; varying vec2 vHx;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (uHueco.w > 0.5 && distance(vHx, uHueco.xy) < uHueco.z) discard;'); }; m.customProgramCacheKey = () => 'rio-ancho'; };
  for (const c of C) { c.rioM = rioM.clone(); anchoRio(c.rioM, c.top.uniforms.uHueco); c.lagoM = lagoM.clone(); mats.push(c.rioM, c.lagoM); for (const m of c.mesh.children) if (m.userData.lago) m.material = c.lagoM; }
  for (const [c, a] of cintas) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); g.setAttribute('lado', new THREE.Float32BufferAttribute(a.lado, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2)); g.setIndex(a.i); geos.push(g); const m = new THREE.Mesh(g, c.rioM); m.renderOrder = 1; c.mesh.add(m); }
  // los nombres de las sierras, de los ríos y de los embalses, como en los mapas (por debajo de los de las comarcas y los
  // pueblos: si no caben, se esconden)
  const N = [...MAPA_RELIEVE.sierras.map(x => ({ n: x.n, k: 0, xy: [x.x, x.y] })), ...MAPA_RELIEVE.rios.filter(x => x.k < 3).map(x => ({ n: x.n, k: x.k, xy: x.l })),
    ...MAPA_RELIEVE.lagos.filter(x => x.k).map(x => ({ n: x.n, k: 3, xy: x.l }))].map(({ n, k, xy }) => {
    const [X, Z] = W(...xy), lab = document.createElement('div'); lab.className = k ? 'm3-rl' : 'm3-sl'; lab.textContent = n; lab.hidden = true;
    return { lab, k, X, Z, h: GROSOR + alto(X, Z) + (k ? 0.25 : 0.6), c: deQuien(X, Z) };
  });
  // (lo que ocupa Navarra: sus esquinas, para encajarla en la pantalla)
  const caja = new THREE.Box3(); for (const c of C) { c.mesh.geometry.computeBoundingBox(); caja.union(c.mesh.geometry.boundingBox); }
  caja.max.y = GROSOR + Math.max(...C.map(c => c.hmax + c.alzado)) + 0.5;
  const esquinas = []; for (const x of [caja.min.x, caja.max.x]) for (const y of [0, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
  const centro = caja.getCenter(new THREE.Vector3());


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
    const lab = document.createElement('div'); lab.className = 'm3-tl' + (t.state ? ' ' + t.state : '') + (t.here ? ' here' : ''); lab.innerHTML = `<span>${esc(t.name)}</span>`;
    return { ...t, k: 1, g, bola, haz, hs: GROSOR + alto(X, Z), c: byId.get(t.comarca), lab, X, Z, ph: (i * 0.7) % 6.28, sen: 0, fija: 0,
      lleno: t.state === 'ok' ? 1 : t.state === 'go' ? Math.max(0.2, Math.min(0.85, t.pct || 0)) : 0 };
  });
  // (las cuatro piezas de las balizas de todos los pueblos: la mira, el hilo, el cristal y su halo)
  const NT = T.length, aCol = new THREE.InstancedBufferAttribute(new Float32Array(NT * 3), 3), aInf = new THREE.InstancedBufferAttribute(new Float32Array(NT * 4), 4).setUsage(THREE.DynamicDrawUsage);
  T.forEach((x, i) => { const c = srgb(BALIZA[x.state] || BALIZA['']); aCol.setXYZ(i, c.r, c.g, c.b); });
  const UT = { value: 0 }, UESC = { value: 1 };
  const balM = (vs, fs, o2) => { const m = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { uT: UT, uEsc: UESC }, transparent: true, depthWrite: false, ...o2 }); mats.push(m); return m; };
  const pieza = (g, m, orden) => { g.setAttribute('aCol', aCol); g.setAttribute('aInf', aInf); geos.push(g);
    const im = new THREE.InstancedMesh(g, m, NT); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.renderOrder = orden; scene.add(im); return im; };
  // (la mira, siempre encima del relieve: es luz proyectada; el cristal, con sus aristas marcadas)
  const mira = pieza(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), balM(MIRA_VS, MIRA_FS, { blending: THREE.AdditiveBlending, depthTest: false }), 3);
  const hilo = pieza(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0), balM(HILO_VS, HILO_FS, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 3);
  // (el cristal: dos pirámides de seis caras unidas por la base, con cada triángulo suelto para marcar sus aristas)
  const crisG = new THREE.BufferGeometry(), cp = [], bary = [];
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, b = a + Math.PI / 3, A = [Math.cos(a), 0, Math.sin(a)], B = [Math.cos(b), 0, Math.sin(b)];
    cp.push(...A, 0, 1, 0, ...B, ...B, 0, -1, 0, ...A); bary.push(1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1); }
  crisG.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); crisG.setAttribute('bary', new THREE.Float32BufferAttribute(bary, 3)); crisG.computeVertexNormals();
  const cristal = pieza(crisG, balM(CRISTAL_VS, CRISTAL_FS, {}), 5);
  const orbita = pieza(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), balM(MIRA_VS, ORBITA_FS, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 6);
  const haloG = new THREE.BufferGeometry(), haloP = new THREE.BufferAttribute(new Float32Array(NT * 3), 3).setUsage(THREE.DynamicDrawUsage), haloS = new THREE.BufferAttribute(new Float32Array(NT), 1).setUsage(THREE.DynamicDrawUsage);
  const haloI = new THREE.BufferAttribute(aInf.array, 4).setUsage(THREE.DynamicDrawUsage);
  haloG.setAttribute('position', haloP); haloG.setAttribute('aS', haloS); haloG.setAttribute('aCol', new THREE.BufferAttribute(aCol.array, 3)); haloG.setAttribute('aInf', haloI); geos.push(haloG);
  const halo = new THREE.Points(haloG, balM(HALO_VS, HALO_FS, { blending: THREE.AdditiveBlending })); halo.frustumCulled = false; halo.renderOrder = 4; scene.add(halo);
  const BM = new THREE.Matrix4(), BV = new THREE.Vector3(), BS = new THREE.Vector3(), BQ = new THREE.Quaternion(), Q0 = new THREE.Quaternion(), ARRIBA = new THREE.Vector3(0, 1, 0), BE = new THREE.Euler();
  const tById = new Map(T.map(t => [t.id, t]));
  const TR = T.filter(t => MAPA_IDS.includes(t.id));   // (los que tienen su trazado de verdad: a esos se puede uno acercar mucho más)

  // la capa de los nombres y los controles
  const capa = document.createElement('div'); capa.className = 'm3-capa';
  for (const c of C) capa.append(c.lab); for (const t of T) capa.append(t.lab); for (const x of N) capa.append(x.lab);
  const cv = r.domElement; cv.className = 'm3-cv'; cv.tabIndex = 0; cv.setAttribute('aria-label', 'Mapa 3D de Navarra: arrastra para moverte y toca una comarca o un pueblo');
  host.prepend(cv); host.append(capa);

  // ---------- la cámara: un punto del mapa al que mira, la distancia, el giro y la inclinación ----------
  // (la vista de toda Navarra: la distancia a la que cabe entera en lo que queda libre, más inclinada en las pantallas
  // anchas, para que se vea la profundidad, y más desde arriba en el móvil de pie)
  // (al entrar a jugar, lo de encima se va y la vista es toda la pantalla)
  let entrada = null, elegido = null;   // (y el pueblo elegido, con su ficha)
  const huecoAhora = () => entrada ? {} : o.hueco?.() || {};
  const libre = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1, hu = huecoAhora(); return { w: Math.max(80, w - (hu.r || 0)), h: Math.max(80, h - (hu.t || 0) - (hu.b || 0)), W: w, H: h }; };
  const camPos = (s, out = new THREE.Vector3()) => out.set(s.x + Math.sin(s.yaw) * Math.cos(s.pitch) * s.d, Math.sin(s.pitch) * s.d + (s.hy || 0), s.z + Math.cos(s.yaw) * Math.cos(s.pitch) * s.d);
  // (se prueba a qué distancia caben todas las esquinas de Navarra en el hueco libre, con la misma cámara)
  // (fb: cuánto de lo de abajo cuenta: con toda Navarra, casi todo, porque la tira de fotos de abajo tapa)
  const prueba = new THREE.PerspectiveCamera(cam.fov, 1, 0.5, 2000), pq = new THREE.Vector3();
  function encaja(pts, x, z, pitch, fb) {
    const L = libre(), hu = huecoAhora();
    prueba.aspect = L.W / L.H; prueba.setViewOffset(L.W, L.H, (hu.r || 0) / 2, ((hu.b || 0) - (hu.t || 0)) / 2, L.W, L.H);
    const s = { x, z, yaw: 0, pitch, d: 0, hy: 0.8 }, m = 0.025;
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
  let bajoC = null;   // (la comarca que queda debajo del punto al que mira la cámara)
  let vuelo = null;   // (un vuelo animado hasta un sitio: { de, a, t0, dur })
  const volar = (a, dur = 0.9) => { inercia = null; vuelo = { de: { ...v }, a: { ...v, ...a }, t: 0, dur }; Object.assign(goal, vuelo.a); };
  const lim = () => { goal.x = Math.max(-42, Math.min(42, goal.x)); goal.z = Math.max(-44, Math.min(44, goal.z)); goal.d = Math.max(TR.some(t => Math.hypot(t.X - goal.x, t.Z - goal.z) < 0.6) ? 0.12 : 1.4, Math.min(DMAX, goal.d)); goal.pitch = Math.max(0.45, Math.min(1.35, goal.pitch));
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
    // (como el arranque de un videojuego, a toda la pantalla: las esquinas del visor, una raya de luz que
    // cruza el nombre, la onda que levanta Navarra al posarse con un temblor de la cámara, y el aviso de que se puede pasar)
    E.innerHTML = `<canvas class="m3-nubes"></canvas><div class="m3-sol"></div><div class="m3-luz"></div><div class="m3-onda"></div><div class="m3-titulo"><b class="logo" data-notr>${[...'HERRIZHERRI'].map((l, i) => `<i style="--i:${i}">${l}</i>`).join('')}</b><span class="m3-raya"></span><small>Navarra, pueblo a pueblo</small></div><div class="m3-destello"></div><div class="m3-visor"></div><span class="m3-pasa">${LENTO ? 'Toca para pasar' : 'Clic para pasar'}</span>`;
    host.append(E);
    const nc = E.querySelector('.m3-nubes'), g2 = nc.getContext('2d'), sol = E.querySelector('.m3-sol'), luz = E.querySelector('.m3-luz'), tit = E.querySelector('.m3-titulo'), letras = [...tit.querySelectorAll('.logo i')], lema = tit.querySelector('small'), dest = E.querySelector('.m3-destello');
    const visor = E.querySelector('.m3-visor'), raya = E.querySelector('.m3-raya'), onda = E.querySelector('.m3-onda'), pasa = E.querySelector('.m3-pasa');
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
        // el visor: entra al empezar y se va con el nombre; el aviso de pasar, mientras tanto
        visor.style.opacity = (cine * 0.9).toFixed(3); pasa.style.opacity = (rampa(tI, 0.8, 1.2) * (1 - rampa(tI, 3.4, 3.8)) * 0.85).toFixed(3);
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
    const NP = LENTO ? 320 : 820, ND = LENTO ? 160 : 360, paso = Math.max(1, Math.round(borde.length / (ND * 0.45)));
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
      tam[i] = (0.35 + 1.6 * Math.random() ** 2.2) * (LENTO ? 1.25 : 1); vida[i] = 3; bote[i] = 0;
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
  // (qué hay debajo del dedo: el pueblo cuya chincheta o cuyo nombre queda más cerca en la pantalla y, si no, la comarca)
  const bw = new THREE.Vector3();
  function quien(e) {
    const b = cv.getBoundingClientRect(), k = b.width / (sz.w || 1) || 1, mx = (e.clientX - b.left) / k, my = (e.clientY - b.top) / k;
    let best = null, bd = (e.pointerType === 'mouse' ? 22 : 30);
    for (const t of T) {
      if (t.g.scale.x < 0.3) continue;
      t.bola.getWorldPosition(bw).project(cam); if (bw.z > 1) continue;
      const px = (bw.x + 1) / 2 * sz.w, py = (1 - bw.y) / 2 * sz.h, dd = Math.hypot(px - mx, py - my);
      if (dd < bd) { bd = dd; best = t; }
      if (t.lab._on && t.lab._w) { const ly = t.lab._y ?? py; if (Math.abs(mx - t.lab._x) < t.lab._w / 2 && my < ly && my > ly - t.lab._h) { best = t; bd = 0; } }
    }
    if (best) return { t: best.id };
    ray.setFromCamera(aNdc(e), cam);
    const hc = ray.intersectObjects(C.map(c => c.mesh), false)[0]; if (hc) return { c: hc.object.userData.c };
    return null;
  }
  let hover = null, sel = null;
  // Un dedo (o el ratón) agarra el mapa: el punto tocado se queda bajo el dedo. Se mide con la cámara de cuando se tocó: con la
  // de cada imagen, varios movimientos del dedo entre imagen e imagen sumaban el arrastre dos veces y el mapa daba saltos. Al
  // soltar, sigue un poco y frena. Dos dedos: pellizcar acerca o aleja hacia el punto de entre los dedos, que se queda debajo
  // de ellos, moverlos arrastra y girarlos gira. Al levantar uno, el otro sigue arrastrando
  const ptrs = new Map(); let arr = null, gesto = null, inercia = null;
  const usado = () => host.classList.add('m3-usado');   // (la ayuda de los controles se va en cuanto se usan)
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
    goal.x = g.s0.x + (q ? g.p.x - q.x : 0); goal.z = g.s0.z + (q ? g.p.z - q.z : 0); lim();
    for (const k of ['x', 'z', 'd', 'yaw', 'pitch']) v[k] = goal[k];
  }
  const onDown = (e) => {
    if (entrada || saltaIntro()) return;
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
    e.preventDefault(); if (entrada || saltaIntro()) return; usado(); vuelo = null; inercia = null; dron = null;
    if (!e.ctrlKey && e.deltaMode === 0 && (e.deltaX !== 0 || !Number.isInteger(e.deltaY))) {
      const k = goal.d * 0.0016, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      goal.x += (-fz * e.deltaX - fx * e.deltaY) * k; goal.z += (fx * e.deltaX - fz * e.deltaY) * k; lim(); return;
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
  const kd = (e) => { if (e.key === 'Escape' && visible && !document.querySelector('.sheet, .onb, [role="dialog"]:not([hidden])')) { if (saltaIntro()) return; if (elegido) cierraPueblo(); else if (sel) vista(); return; }
    const k = MOV[e.key.toLowerCase()];
    // (en la entrada grande, las flechas, el espacio y la tecla de entrar la pasan deprisa)
    if (!(k || e.key === ' ' || e.key === 'Enter') || e.ctrlKey || e.metaKey || e.altKey || !visible || document.hidden || e.target.closest?.('input,textarea,select,[contenteditable="true"]') || document.querySelector('.sheet, .onb, [role="dialog"]:not([hidden])')) return;
    if (saltaIntro()) { e.preventDefault(); return; }
    if (!k) return;
    e.preventDefault(); usado(); vuelo = null; inercia = null; keys.add(k); };
  const ku = (e) => { const k = MOV[e.key.toLowerCase()]; if (k) keys.delete(k); };
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', () => keys.clear());

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
    const t = tById.get(id); if (!t || entrada) return;
    if (sel !== t.comarca) select(t.comarca, false);
    elegido = t; o.onTown?.(id);   // (antes de volar: la ficha cambia el hueco donde se encaja)
    nucT = -1e9;   // (su núcleo, en la imagen siguiente: así sus casas se van haciendo durante el vuelo)
    // (hasta lo más cerca, casi a la altura de los tejados y de lado, para ver sus casas en pie; los bosques, sin maqueta,
    // desde algo más arriba). Al llegar, el vuelo de dron
    const real = TR.includes(t), d = real ? DRON_D : 2.4, pitch = real ? 0.5 : 0.85;
    volar({ x: t.X, z: t.Z, d, yaw: v.yaw, pitch }, Math.min(2.6, 1.3 + 0.18 * Math.log2(Math.max(1, v.d / d))));
    dron = { t: 0, id: t.id, X: t.X, Z: t.Z, d, pitch, yaw: v.yaw, real, listo: false };
  }
  // ---------- el vuelo de dron sobre el pueblo elegido ----------
  // La cámara pasa por encima del pueblo muy despacio, como un dron: le da la vuelta poco a poco (una vuelta en unos dos
  // minutos), se acerca y se aleja un poco y va y viene sobre sus calles, sin perderlo nunca de vista. Empieza al acabar el
  // vuelo hasta él y se para en cuanto se toca el mapa, se mueve con las teclas o la rueda, o se cierra el pueblo
  const DRON_D = 0.18;   // (cerca, casi entre los tejados: de más lejos el pueblo se veía pequeño)
  let dron = null;
  function sigueDron(dt) {
    if (!dron.listo) { if (vuelo) return; dron.listo = true; }
    const u = (dron.t += dt), k = Math.min(1, u / 4), r = dron.d * (dron.real ? 0.45 : 0.25);   // (arranca poco a poco)
    goal.yaw = dron.yaw + u * 0.05 * k;
    goal.x = dron.X + Math.sin(u * 0.083) * r * k; goal.z = dron.Z + Math.sin(u * 0.121 + 1.1) * r * 0.7 * k;
    goal.d = dron.d * (1 + 0.22 * Math.sin(u * 0.097) * k); goal.pitch = dron.pitch + 0.05 * Math.sin(u * 0.067) * k;
  }
  function cierraPueblo() { dron = null; if (!elegido) return; elegido = null; o.onTown?.(null); }
  // (toda Navarra, desde arriba)
  function vista() { select(null); volar(casa(), 1.1); }
  // ---------- elegir una comarca: vuela hasta ella y se levanta ----------
  function select(id, fly = true) {
    const c = id && byId.get(id);
    sel = c ? c.id : null; cierraPueblo();
    host.classList.toggle('con-sel', !!c);
    for (const x of C) x.lab.classList.toggle('sel', x.id === sel);
    o.onSelect?.(sel);   // (antes de volar: el panel que se abre cambia el hueco donde se encaja)
    if (c && fly) volar({ x: c.mid.x, z: c.mid.z, d: Math.max(22, encaja(c.esq, c.mid.x, c.mid.z, 0.95, 1)), yaw: 0, pitch: 0.95 });
  }

  // ---------- el relieve fino ----------
  // El de las comarcas que se ven de cerca (la elegida primero y, al acercarse, las de alrededor), unas pocas a la vez: en
  // el móvil, dos y a 56 m; en el ordenador, cuatro y a 28 m. Al llegar entra poco a poco sobre el de siempre, y la que
  // hace más que no se ve se suelta. Si no llega (en el archivo único, sin conexión), se vuelve a probar a los 15 s. Se
  // piden de una en una y solo con la cámara quieta, y la imagen se descomprime aparte (createImageBitmap): al moverse
  // por el mapa no hay tirones
  const MAXD = LENTO ? 2 : 4, carga = new THREE.TextureLoader().setCrossOrigin('anonymous'), det = new Map(), aniso = Math.min(8, r.capabilities.getMaxAnisotropy());
  const textura = (u) => (typeof createImageBitmap === 'function' ? fetch(u, { credentials: 'omit' }).then(x => x.ok ? x.blob() : Promise.reject())
    .then(b => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then(im => new THREE.Texture(im)) : Promise.reject())
    .catch(() => new Promise((ok, mal) => carga.load(u, ok, undefined, mal)));
  const suelta = (tx) => { tx.dispose(); tx.image?.close?.(); };
  let detT = -1e9, pidiendo = 0;
  const lejosDe = (c) => Math.hypot(c.mid.x - v.x, c.mid.z - v.z);
  function detalles(now, quieto) {
    if (now - detT < 400 || !quieto) return; detT = now;
    const cerca = v.d < 80 ? C.filter(c => MAPA_RELIEVE.detalle[c.id] && lejosDe(c) < v.d * 0.6 + 14).sort((a, b) => lejosDe(a) - lejosDe(b)) : [];
    if (sel) { const i = cerca.findIndex(c => c.id === sel); if (i >= 0) cerca.splice(i, 1); if (MAPA_RELIEVE.detalle[sel]) cerca.unshift(byId.get(sel)); }
    const quiere = new Set(cerca.slice(0, MAXD).map(c => c.id));
    for (const id of quiere) {
      let e = det.get(id); if (e?.fallo && now > e.fallo) { det.delete(id); e = null; }
      if (e) { e.t = now; continue; }
      if (pidiendo) continue;
      det.set(id, e = { t: now, tex: null, fallo: 0 }); pidiendo++;
      urlDetalle(id, !LENTO).then(u => u ? textura(u) : Promise.reject()).then(tx => {
        pidiendo--; if (!vivo || det.get(id) !== e) { suelta(tx); return; }
        tx.flipY = false; tx.colorSpace = THREE.NoColorSpace; tx.anisotropy = aniso; tx.needsUpdate = true;
        e.tex = tx; byId.get(id).top.uniforms.uDet.value = tx;
      }).catch(() => { pidiendo = Math.max(0, pidiendo - 1); e.fallo = performance.now() + 15000; });
    }
    // (las que sobran, primero las que hace más que no se ven)
    const sobran = [...det].filter(([id, e]) => !quiere.has(id) && e.tex).sort((a, b) => a[1].t - b[1].t);
    let n = [...det.values()].filter(e => e.tex).length;
    for (const [id, e] of sobran) { if (n <= MAXD + 1) break; const u = byId.get(id).top.uniforms; u.uDet.value = nada; u.uDetK.value = 0; suelta(e.tex); det.delete(id); n--; }
  }

  // ---------- los núcleos de los pueblos, al acercarse ----------
  // Solo los pueblos del juego, con su trazado de verdad (src/data/reales: casas, calles, ríos y plazas de OpenStreetMap):
  // al acercarse, su núcleo pintado sobre el relieve (las calles, las plazas, el agua y los tejados con su sombra) y, más
  // cerca aún, cada casa en pie. Los de alrededor, de uno en uno y con la cámara quieta; los lejanos se sueltan
  const REALES = new Set(MAPA_IDS), MU = 1 / 2076;   // (metros → unidades del mundo: una unidad son 2.076 m)
  const NUC_LEJOS = 26, NUC_CERCA = 16, CASAS_D = 10;
  const nuc = new Map(), cajaG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); geos.push(cajaG);
  let nucT = -1e9, nucPide = 0;
  // (el color de cada tejado: teja o pizarra en las casas, chapa gris en naves y fábricas, piedra en iglesias y torres)
  const tono = (b, pizarra) => { const v = ((b.x * 7 + b.z * 13) % 9 + 9) % 9 / 9;
    return b.k === 'industrial' || b.k === 'shed' ? [0.58, 0.06, 0.6 + v * 0.1] : b.k === 'church' || b.k === 'tower' ? [0.09, 0.18, 0.56 + v * 0.06]
      : pizarra ? [0.06, 0.08, 0.32 + v * 0.1] : [0.04 + v * 0.02, 0.5, 0.48 + v * 0.08]; };
  // (el núcleo pintado: un lienzo de un metro y medio por píxel, tres en el móvil, y el doble de fino en la maqueta; los
  // campos, huertas y parques, las calles y los ríos con su ancho de verdad, los puentes, la cancha de los frontones y
  // los tejados, de teja en casi toda Navarra y de pizarra en el Pirineo; hacia el borde se funde con el relieve)
  const USO = { cultivo: 'rgba(222, 204, 140, .55)', huerta: 'rgba(118, 168, 84, .6)', prado: 'rgba(140, 192, 98, .45)', vina: 'rgba(160, 150, 92, .55)', frutales: 'rgba(122, 165, 86, .55)',
    cesped: 'rgba(134, 192, 106, .6)', parque: 'rgba(110, 170, 92, .65)', deporte: 'rgba(104, 168, 96, .65)', juegos: 'rgba(206, 192, 160, .7)', escuela: 'rgba(214, 200, 170, .6)',
    cementerio: 'rgba(154, 165, 138, .65)', industria: 'rgba(185, 180, 172, .5)', plaza: 'rgba(230, 220, 203, .9)' };
  function pintaNucleo(D, R, pizarra, N = LENTO ? 512 : 1024, velo = true) {
    // (el de la maqueta, en el procesador y no en la tarjeta gráfica: son muchos trazos, y en ella se encolaban y paraban el mapa)
    const k = N / (2 * R), c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', velo ? undefined : { willReadFrequently: true });
    const P = (x, z) => [(x + R) * k, (z + R) * k];
    const linea = (pts, w, color) => { if (pts.length < 2) return; g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.lineWidth = Math.max(1, w * k); g.strokeStyle = color; g.lineCap = g.lineJoin = 'round'; g.stroke(); };
    const area = (pts, color) => { if (pts.length < 3) return; g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fillStyle = color; g.fill(); };
    const casa = (b, dx, dz, color) => { g.save(); const [a, bb] = P(b.x + dx, b.z + dz); g.translate(a, bb); g.rotate(-b.ry); g.fillStyle = color; g.fillRect(-b.w * k / 2, -b.d * k / 2, b.w * k, b.d * k); g.restore(); };
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
    for (const p of D.lugares.plazas || []) area(p.pts, 'rgba(236, 226, 206, .9)');
    // (y en las plazas, las losas: una cuadrícula de unos 2,5 m)
    if (!velo) { const L = Math.max(3, Math.round(2.5 * k)); const losas = dibujo(L, L, (q, w, h) => { q.fillStyle = 'rgba(120, 104, 84, .28)'; q.fillRect(0, 0, w, 1); q.fillRect(0, 0, 1, h); });
      for (const p of D.lugares.plazas || []) area(p.pts, losas); }
    // (los anchos de los datos son la mitad: de la orilla al centro)
    for (const r of D.rios) linea(r.pts, Math.max(4, 2 * (r.w || 2)), '#5ab8f0');
    for (const b of D.balsas || []) area(b.pts, '#5ab8f0');
    for (const b of D.piscinas || []) area(b.pts, '#7fd6f6');
    for (const s of D.calles) linea(s.pts, 2 * (s.w || 2) + 1.5, s.t === 'trail' ? 'rgba(150, 128, 96, .35)' : 'rgba(120, 104, 90, .55)');
    for (const s of D.calles) linea(s.pts, 2 * (s.w || 2), s.t === 'trail' ? 'rgba(214, 198, 166, .85)' : '#e7dfd0');
    // (en la maqueta, el empedrado de las calles, adoquines de algo más de un metro con sus juntas, y la tierra de los caminos)
    if (!velo) {
      const A = Math.max(3, Math.round(1.2 * k)), adoquin = dibujo(A * 2, A * 2, (q, w, h) => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const o = j % 2 ? A / 2 : 0; q.fillStyle = `rgba(${150 + Math.random() * 40}, ${134 + Math.random() * 34}, ${112 + Math.random() * 30}, .5)`; q.fillRect((i * A + o) % w + 1, j * A + 1, A - 1, A - 1); q.fillRect((i * A + o) % w + 1 - w, j * A + 1, A - 1, A - 1); } });
      const tierra = dibujo(32, 32, (q, w, h) => { for (let i = 0; i < 90; i++) { q.fillStyle = Math.random() < 0.5 ? 'rgba(120, 92, 60, .25)' : 'rgba(250, 238, 210, .2)'; q.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1); } });
      for (const s of D.calles) linea(s.pts, 2 * (s.w || 2) - 0.6, s.t === 'trail' ? tierra : adoquin);
    }
    for (const s of D.puentes || []) { linea(s.pts, 2 * (s.w || 2) + 2, 'rgba(90, 76, 62, .6)'); linea(s.pts, 2 * (s.w || 2), '#d6c8ae'); }
    for (const b of D.casas) casa(b, 3, 4, 'rgba(40, 24, 18, .35)');   // (la sombra, hacia el sureste)
    for (const b of D.casas) { const [h, sa, l] = b.k === 'fronton' ? [0.38, 0.3, 0.5] : tono(b, pizarra); casa(b, 0, 0, `hsl(${h * 360}, ${sa * 100}%, ${l * 92}%)`); }
    g.globalCompositeOperation = 'destination-in';
    const fin = g.createRadialGradient(N / 2, N / 2, N * 0.4, N / 2, N / 2, N / 2); fin.addColorStop(0, '#000'); fin.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = fin; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c); t.anisotropy = aniso; t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t;
  }
  // (el núcleo de un pueblo: su lienzo va pintado en el propio relieve de su comarca, en uno de sus cuatro huecos, y así
  // queda pegado al terreno; las casas en pie, una caja por casa con su altura algo exagerada, como el relieve)
  function haceNucleo(t, D) {
    const [cx, cy] = mapaXY(D.lat, D.lon), [X0, Z0] = W(cx, cy); let R = 120;
    for (const b of D.casas) R = Math.max(R, Math.hypot(b.x, b.z) + Math.max(b.w, b.d) / 2);
    for (const s of D.calles) for (const [x, z] of s.pts) R = Math.max(R, Math.hypot(x, z));
    R = Math.min(700, R + 20);
    const pizarra = t.comarca === 'pirineo', tex = pintaNucleo(D, R, pizarra), Rs = R / 207.6;
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
    if (now - nucT < 500 || !quieto && !entrada && !va) return; nucT = now;
    // (al entrar a jugar, solo el del pueblo: lo demás, después)
    const quiere = entrada ? (entrada.real ? [entrada.t] : []) : va ? (REALES.has(elegido.id) ? [elegido] : []) : v.d > NUC_LEJOS + 4 ? [] : T.filter(t => REALES.has(t.id) && (!sel || sel === t.comarca) && Math.hypot(t.X - v.x, t.Z - v.z) < v.d * 0.55 + 2)
      .sort((a, b) => Math.hypot(a.X - v.x, a.Z - v.z) - Math.hypot(b.X - v.x, b.Z - v.z)).slice(0, 6);
    for (const t of quiere) {
      const e = nuc.get(t.id); if (e) { e.t = now; continue; } if (nucPide) continue;
      const nuevo = { t: now }; nuc.set(t.id, nuevo); nucPide++;
      loadMapa(t.id).then(D => { nucPide--; if (!vivo || nuc.get(t.id) !== nuevo || !D?.casas) return;
        Object.assign(nuevo, haceNucleo(t, D)); if (!ponNucleo(nuevo)) { quitaNucleo(nuevo); nuc.delete(t.id); } }).catch(() => { nucPide = Math.max(0, nucPide - 1); });
    }
    // (si hay más de ocho, se sueltan los que hace más que no se ven)
    const viejos = [...nuc].filter(([id]) => !quiere.some(t => t.id === id)).sort((a, b) => a[1].t - b[1].t);
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
    calentado = true;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3)); g.setAttribute('hd', new THREE.Float32BufferAttribute([0, 0, 0], 1)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(9).fill(1), 3));
    const pm = new THREE.ShaderMaterial({ vertexShader: PARCHE_VS, fragmentShader: RELIEVE_FS, vertexColors: true, fog: true, uniforms: { ...C[0].top.uniforms, uHueco: { value: new THREE.Vector4() }, uMaqK: { value: 0 } } });
    const res = {}, pasos = haceMaqueta({ id: 'x', alt0: 0, dem: { step: 20, n: 2, h: [0, 0, 0, 0] }, casas: [], calles: [], rios: [] }, { X0: 0, Z0: 0, MU, EXA, GROSOR, R: 10, sobre: () => 0, P: [[-1, -1], [1, -1], [1, 1], [-1, 1]], lento: true, K: 1, alzado: { value: 1 } }, res);
    while (!pasos.next().done);
    const caja = new THREE.BoxGeometry(); caja.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(1), 1));
    const im = new THREE.InstancedMesh(caja, res.mat, 1); im.setColorAt(0, new THREE.Color());
    const cm2 = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), cn = new THREE.InstancedMesh(cajaG, cm2, 1); cn.setColorAt(0, new THREE.Color());
    const grupo = new THREE.Group(); grupo.add(new THREE.Mesh(g, pm), im, cn);
    geos.push(g, caja, res.geo); mats.push(pm, res.mat, cm2);
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
    const vaE = !entrada && elegido && vuelo ? nuc.get(elegido.id) : null, va = vaE?.D && vaE.slot >= 0 ? vaE : null;
    const quiere = entrada ? (maq?.e.t === entrada.t ? maq.e : null) : va || (v.d < MAQ_D ? [...nuc.values()].filter(e => e.D && e.slot >= 0 && Math.hypot(e.X0 - v.x, e.Z0 - v.z) < e.R * MU * 0.8)
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
    m.res.mat.opacity = m.op; m.res.casas.visible = m.op > 0.01; m.alz.value = 1 / Math.max(0.05, c.sy);
    if (!sigue && m.k.value < 0.01 && m.op < 0.01) quitaMaqueta();
  }
  // (un paso de la maqueta: el suelo pintado, sus piezas, las sombras de los árboles y, al final, la malla en la comarca;
  // devuelve true cuando ya está)
  function pasoMaqueta(m) {
    const e = m.e, c = e.c;
    if (!m.tex) { m.tex = pintaNucleo(e.D, e.R, e.pizarra, LENTO ? 1024 : 2048, false); return false; }
    if (!m.pasos) m.pasos = haceMaqueta(e.D, { X0: e.X0, Z0: e.Z0, MU, EXA, GROSOR, R: e.R, sobre: (X, Z) => sobre(c, X, Z), P: c.Pw, comarca: c.id, lento: LENTO, K: MAQ_K, alzado: m.alz }, m.res);
    if (!m.hecha) { m.hecha = m.pasos.next().done; return false; }
    // (la sombra de cada árbol en el suelo pintado, hacia el sureste; y la imagen, a la tarjeta gráfica en su propia imagen)
    if (!m.subida) { m.subida = true; const g = m.tex.image.getContext('2d', { willReadFrequently: true }), N = m.tex.image.width, k = N / (2 * e.R); g.fillStyle = 'rgba(28, 40, 18, .3)'; g.beginPath();
      for (const [x, z, rr] of m.res.sombras) { const a = (x + e.R + rr * 0.9) * k, b = (z + e.R + rr * 1.2) * k; g.moveTo(a + rr * 1.1 * k, b); g.ellipse(a, b, rr * 1.1 * k, rr * 0.8 * k, 0.5, 0, 6.2832); }
      g.fill(); m.tex.needsUpdate = true; r.initTexture(m.tex); return true; }
    const u = c.top.uniforms, pm = new THREE.ShaderMaterial({ vertexShader: PARCHE_VS, fragmentShader: RELIEVE_FS, vertexColors: true, fog: true, uniforms: { ...u, uHueco: { value: new THREE.Vector4(0, 0, 0, 0) }, uMaqK: m.k } });
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
    if (m.res.casas) { m.res.casas.removeFromParent(); for (const x of m.res.casas.children) x.geometry.dispose(); m.res.mat.dispose(); }
    m.tex?.dispose(); for (const x of m.labs || []) x.lab.remove();
  }
  // (la altura del suelo en un punto de una comarca, con la de la maqueta donde la hay)
  const pisoEn = (c, X, Z) => { const h = GROSOR + alto(X, Z); if (!maq?.malla || maq.e.c !== c || Math.hypot(X - maq.e.X0, Z - maq.e.Z0) > maq.e.R * MU) return h; return h + (maq.res.alto(X, Z) - h) * maq.k.value; };

  // ---------- entrar a jugar: un zoom rápido. Lo de encima se va, la cámara se lanza hasta el pueblo girando un poco y la
  // pantalla se funde; entonces empieza la partida (devuelve una promesa; null si no hay vuelo: sin movimiento) ----------
  function entrar(id) {
    const t = tById.get(id);
    if (!t || !vivo || !host.isConnected || !cv.offsetParent || matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    return new Promise((fin) => {
      if (sel !== t.comarca) select(t.comarca, false);
      host.classList.add('m3-entra'); keys.clear(); ptrs.clear(); arr = null; gesto = null; hover = null;
      entrada = { t, fin, t0: performance.now(), fase: 0, real: TR.includes(t) };
      const lejos = Math.hypot(v.x - t.X, v.z - t.Z) > 1 || v.d > 10; entrada.fase = lejos ? 0 : 1;
      if (lejos) volar({ x: t.X, z: t.Z, d: Math.min(Math.max(v.d, 3), 8), yaw: v.yaw, pitch: Math.min(v.pitch, 0.85) }, 0.6); else vuelo = null;
    });
  }
  function sigueEntrada(now) {
    const en = entrada; if (!en) return;
    if (en.fase === 1 && !en.va) { en.va = true; volar({ x: en.t.X, z: en.t.Z, d: en.real ? 0.2 : 1.2, yaw: v.yaw + 0.3, pitch: 0.55 }, 1.0); }
    else if (en.fase === 0 && !vuelo) en.fase = 1;
    else if (en.fase === 1 && (!vuelo || vuelo.t > 0.7)) { en.fase = 2; en.t2 = now; host.classList.add('m3-negro'); }
    else if ((en.fase === 2 && now - en.t2 > 320) || now - en.t0 > 4000) {
      entrada = null; en.fin(); setTimeout(() => host.classList.remove('m3-entra', 'm3-negro'), 4000);
    }
  }

  if (import.meta.env.DEV) window.__mapa3d = { det, nuc, v, goal, ren: r, calentado: () => calentado, maqueta: () => maq, ir: irPueblo, intro: () => intro, pueblos: () => T.map(x => ({ id: x.id, X: x.X, Z: x.Z })) };   // (para las pruebas en el servidor de desarrollo)

  // ---------- el bucle: solo mientras se ve ----------
  let vivo = true, visible = true, t0 = performance.now(), last = t0, raf = 0;
  const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting ?? true; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: 0.02 }); io.observe(host);
  const sz = { w: 0, h: 0, z: 0 }, off = { x: 0, y: 0 };
  // (la resolución máxima del lienzo, que baja si no llega: a 2 en las pantallas de retina el relieve iba a tirones)
  let prMax = o.ligero ? 1 : 1.5, prT = 0, prN = 0;
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
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(4); let liso = 0;
    for (const [x, y] of PUNTOS) { gl.readPixels(Math.floor(W * x), Math.floor(H * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (Math.abs(px[0] - fondo[0]) + Math.abs(px[1] - fondo[1]) + Math.abs(px[2] - fondo[2]) < 12) liso++; }
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
    if (o.pausado?.()) { last = now; return; }   // (con algo a pantalla completa encima, no se pinta)
    // (en el móvil, y en el ordenador mientras nada se mueve, 30 imágenes por segundo: las chinchetas que flotan no
    // necesitan más, y así el resto del menú va más suelto)
    const quieto = !keys.size && !vuelo && !ptrs.size && !inercia && Math.abs(goal.d - v.d) < 0.05 * v.d && Math.abs(goal.x - v.x) + Math.abs(goal.z - v.z) < 0.05;
    // (mientras se toca o se mueve, todas las imágenes; si no van a tiempo, el lienzo baja un poco su resolución)
    const toca = ptrs.size || inercia || vuelo || keys.size;
    if ((quieto || (LENTO && !toca)) && now - last < 30) return;
    if (toca) { const g = now - last; if (g < 200) { prT += g; prN++; } if (prN >= 40) { if (prT / prN > 25 && prMax > 1) { prMax = Math.max(1, prMax - 0.25); sz.z = -1; } prT = prN = 0; } }
    // (el tiempo de cada imagen, nunca hacia atrás: la marca del navegador puede ser anterior a la de al crear el mapa, y un
    // paso negativo hacía que la cámara se disparara)
    // (al entrar a jugar, al ritmo del reloj aunque vaya a tirones)
    const dt = Math.max(0, Math.min(entrada ? 0.1 : 0.05, (now - last) / 1000)); last = Math.max(last, now); const t = Math.max(0, now - t0) / 1000;
    // (el reloj de la entrada grande)
    let tI = 99, dI = 0;
    if (intro) { if (!intro.t && ((cargas < 3 && intro.espera < 2.5) || document.querySelector('.onb'))) intro.espera += dt; else { dI = dt * intro.rapido; intro.t += dI; } tI = intro.t; }
    // tamaño del lienzo
    const w = host.clientWidth, h = host.clientHeight, z = escala();
    if (w !== sz.w || h !== sz.h || z !== sz.z) { const antes = sz.w; Object.assign(sz, { w, h, z }); if (antes && !sel && !host.classList.contains('m3-usado')) Object.assign(goal, casa()); r.setPixelRatio(Math.min(prMax, (devicePixelRatio || 1) * z)); r.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); }
    // movimiento con las teclas y los botones
    if (dron && (ptrs.size || keys.size || inercia || entrada || elegido?.id !== dron.id)) dron = null;
    if (dron) sigueDron(dt);
    if (keys.size && !entrada) {
      const sp = goal.d * 0.9 * dt, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      if (keys.has('f')) { goal.x += fx * sp; goal.z += fz * sp; } if (keys.has('b')) { goal.x -= fx * sp; goal.z -= fz * sp; }
      if (keys.has('l')) { goal.x += fz * sp; goal.z -= fx * sp; } if (keys.has('r')) { goal.x -= fz * sp; goal.z += fx * sp; }
      if (keys.has('ql')) goal.yaw += dt * 1.4; if (keys.has('qr')) goal.yaw -= dt * 1.4;
      if (keys.has('in')) goal.d *= Math.exp(-dt * 1.6); if (keys.has('out')) goal.d *= Math.exp(dt * 1.6);
      lim();
    }
    // (la inercia al soltar el mapa: sigue y frena)
    if (inercia) { goal.x += inercia.vx * dt; goal.z += inercia.vz * dt; const f = Math.exp(-dt * 4.2); inercia.vx *= f; inercia.vz *= f; lim(); v.x = goal.x; v.z = goal.z; if (Math.hypot(inercia.vx, inercia.vz) < goal.d * 0.02) inercia = null; }
    if (intro && !intro.hecho) {
      // (en la entrada, la cámara baja desde lo alto de la península; la distancia, en proporción, para que el zoom no se frene)
      const a = intro.de, k = ease(rampa(tI, IT.vuelo, IT.vuelo + IT.vueloD)), d0 = a.d * (1 - 0.05 * Math.min(1, tI / IT.vuelo));
      for (const q of ['x', 'z', 'yaw', 'pitch']) v[q] = mezcla(a[q], goal[q], k);
      v.yaw += Math.sin(k * Math.PI) * 0.35;   // (baja girando un poco, como un avión que entra a tomar tierra)
      v.d = Math.exp(mezcla(Math.log(d0), Math.log(goal.d), k));
      if (tI >= IT.fin) acabaIntro();
    } else if (vuelo) {
      vuelo.t += dt / vuelo.dur; const k = ease(Math.min(1, vuelo.t)), de = vuelo.de, a = vuelo.a;
      // (la distancia, en proporción, para que al acercarse mucho no frene de golpe; y al acercarse, el sitio llega antes que
      // la distancia: de cerca ya no barre de lado)
      const kx = a.d < de.d * 0.5 ? ease(Math.min(1, vuelo.t / 0.7)) : k;
      for (const q of ['x', 'z']) v[q] = mezcla(de[q], a[q], kx);
      for (const q of ['yaw', 'pitch']) v[q] = mezcla(de[q], a[q], k);
      v.d = Math.exp(mezcla(Math.log(de.d), Math.log(a.d), k));
      if (vuelo.t >= 1) vuelo = null;
    } else { const k = 1 - Math.exp(-dt * 9); for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) v[q] += (goal[q] - v[q]) * k; }
    // (con el panel abierto, el centro de la vista se corre a lo que queda libre, poco a poco)
    const hu = huecoAhora(), kk = 1 - Math.exp(-dt * 8);
    off.x += ((hu.r || 0) / 2 - off.x) * kk; off.y += (((hu.b || 0) - (hu.t || 0)) / 2 - off.y) * kk;
    if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) cam.setViewOffset(w, h, off.x, off.y, w, h); else if (cam.view?.enabled) cam.clearViewOffset();
    // (de cerca, la cámara mira a la altura del suelo que tiene debajo: con una altura fija, el pueblo quedaba por encima del
    // centro, bajo la cabecera; de lejos, a la de siempre, con la que se calcula la vista de toda Navarra)
    const bajo = deQuien(v.x, v.z, bajoC); if (bajo) bajoC = bajo;
    const kh = Math.min(1, Math.max(0, (40 - v.d) / 24)), hs = bajo?.sy ? pisoEn(bajo, v.x, v.z) * bajo.sy + bajo.py : 0.8;
    v.hy += (0.8 + (hs - 0.8) * kh - v.hy) * (1 - Math.exp(-dt * 4));
    camPos(v, cam.position);
    if (intro && tI < IT.fin + 1) { const tb = temblor(tI) * v.d * 0.003; cam.position.x += Math.sin(tI * 71) * tb; cam.position.y += Math.sin(tI * 53 + 1) * tb; cam.position.z += Math.sin(tI * 61 + 2) * tb; }
    cam.lookAt(v.x, v.hy, v.z);
    // (lo más cerca que se pinta, según lo lejos que está la cámara: así el suelo, el hueco y lo de encima no se pisan desde lo alto)
    scene.fog.near = Math.max(4, v.d * 0.95); scene.fog.far = Math.max(10, v.d * 2.2); cam.near = Math.max(Math.min(0.5, v.d * 0.2), v.d * 0.1 - 1.5); cam.far = v.d * 2.6 + 60; cam.updateProjectionMatrix();
    // las comarcas: crecen al empezar (una tras otra), se levantan al pasar por encima o al elegirlas; y su relieve fino
    detalles(now, quieto);
    // (la altura, exagerada cinco veces de lejos para que se lean las sierras, y menos al acercarse, donde con tanta
    // exageración los montes parecían agujas; y de muy cerca, el grano fino del terreno)
    // (y aún menos en la maqueta de un pueblo, donde ya casi es la de verdad)
    const exa = v.d >= 4 ? 0.45 + 0.55 * Math.min(1, Math.max(0, (v.d - 8) / 32)) : 0.3 + 0.15 * Math.min(1, Math.max(0, (v.d - 1.5) / 2.5));
    CERCA.value = Math.min(1, Math.max(0, (14 - v.d) / 8)); TEXK.value = Math.min(1, Math.max(0.6, (95 - v.d) / 45)); ANCHO_RIO.value = Math.min(1, Math.max(0.12, v.d / 40));
    TIEMPO.value = t; INVEXA.value = 1 / exa; TAM.value = Math.min(1, Math.max(0, (v.d - 4) / 18));   // (las texturas, ya algo en la vista de toda Navarra: los campos, el bosque y la roca; y las nubes, que pasan)
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
      c.lift += ((sel === c.id ? 0.9 : 0) - c.lift) * (1 - Math.exp(-dt * 10));
      c.hov += ((hover === 'c:' + c.id ? 1 : 0) - c.hov) * (1 - Math.exp(-dt * 12));
      // (con otra elegida, pasa al fondo: más baja, oscura y casi gris, y su agua y su borde casi no se ven)
      c.fondo += ((sel && sel !== c.id ? 1 : 0) - c.fondo) * (1 - Math.exp(-dt * 6));
      // (crece del suelo al empezar; se levanta con sus sellos y al elegirla)
      c.sy = Math.max(0.01, nace) * exa; c.py = (c.alzado + c.lift - 0.35 * c.fondo) * nace + alza;
      c.mesh.scale.y = c.sy; c.mesh.position.y = c.py; c.linea.scale.y = c.sy; c.linea.position.y = c.py; if (c.arbolFondo) c.arbolFondo.value = c.fondo;
      const u = c.top.uniforms; u.uGris.value = c.gris + (0.7 - c.gris) * c.fondo;
      u.uBrillo.value = ((c.vivo ? 1 : 0.9) + c.lift * 0.16 + c.hov * 0.08 + (c.done ? Math.sin(t * 2 + c.d * 9) * 0.03 : 0)) * (1 - 0.55 * c.fondo)
        + (intro ? 0.35 * (1 - rampa(tI, IT.sube, IT.sube + 0.8)) * (0.5 - 0.5 * Math.cos(tI * 7)) + 0.45 * posa : 0);   // (en la entrada, Navarra late en el mapa antes de soltarse, y cada comarca brilla al posarse)
      c.rioM.opacity = 1 - 0.8 * c.fondo; c.lagoM.opacity = 0.92 * (1 - 0.7 * c.fondo); c.linea.material.opacity = c.lineaOp * (1 - 0.8 * c.fondo);
      const dk = c.top.uniforms.uDetK; dk.value += ((det.get(c.id)?.tex ? 1 : 0) - dk.value) * (1 - Math.exp(-dt * 4));
    }
    // (las balizas, algo más grandes de lejos para que se vean desde toda Navarra y pequeñas de cerca, para que no tapen el
    // pueblo; el cristal flota y gira)
    // (a media distancia, no menos de 0,42, para que se lean; dentro de la maqueta, diminutas)
    const lejos = v.d < 1.4 ? 0.035 * (v.d / 1.4) ** 1.5 : Math.min(1.7, Math.max(v.d / 45, Math.min(0.42, 0.035 + (v.d - 1.4) * 0.2)));
    UT.value = t; UESC.value = r.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360));
    T.forEach((x, i) => {
      const nace = ease(intro ? rampa(tI, IT.pines + x.c.d * 0.4, IT.pines + x.c.d * 0.4 + 0.5) : Math.max(0, Math.min(1, (t - 0.9 - x.c.d * 0.6) / 0.5)));
      // (con una comarca elegida, solo quedan las suyas: las demás se encogen hasta desaparecer)
      x.k += ((sel && sel !== x.comarca ? 0 : 1) - x.k) * (1 - Math.exp(-dt * 8));
      // (señalada, crece y brilla; elegida, la mira lo fija)
      x.sen += ((hover === 't:' + x.id ? 1 : 0) - x.sen) * (1 - Math.exp(-dt * 10)); x.fija += ((elegido === x ? 1 : 0) - x.fija) * (1 - Math.exp(-dt * 6));
      const gy = x.g.position.y = (maq?.malla && maq.e.t === x ? pisoEn(x.c, x.X, x.Z) : x.hs) * x.c.sy + x.c.py + 0.04 * Math.min(1, v.d / 4);
      const s = Math.max(0.01, nace * (1 + 0.35 * x.sen) * lejos * x.k), bob = Math.sin(t * 2.2 + x.ph) * 0.08, cy = gy + s * (CRISTAL_Y + bob);
      x.g.scale.setScalar(s);   // (la bola, lo que se toca y donde se ancla la ficha, se queda quieta: la ficha no se mece con el cristal)
      mira.setMatrixAt(i, BM.compose(BV.set(x.X, gy + 0.02, x.Z), Q0, BS.set(s * 0.85, 1, s * 0.85)));
      hilo.setMatrixAt(i, BM.compose(BV.set(x.X, gy, x.Z), Q0, BS.set(s * 0.06, s * (CRISTAL_Y - 0.6 + bob), s * 0.06)));
      cristal.setMatrixAt(i, BM.compose(BV.set(x.X, cy, x.Z), BQ.setFromAxisAngle(ARRIBA, t * 0.9 + x.ph), BS.set(s * 0.38, s * 0.64, s * 0.38)));
      orbita.setMatrixAt(i, BM.compose(BV, BQ.setFromEuler(BE.set(0.95, t * 0.5 + x.ph, 0.35, 'YXZ')), BS.set(s * 0.62, 1, s * 0.62)));
      haloP.setXYZ(i, x.X, cy, x.Z); haloS.setX(i, s * 2.3); aInf.setXYZW(i, x.ph + (x.here ? 10 : 0), x.lleno, x.sen, x.fija);
      if (x.haz) { const kh = Math.min(1, lejos); x.haz.scale.set(kh, Math.max(0.01, nace * kh), kh); x.haz.position.y = gy + 6 * nace * kh; hazM.opacity = (0.4 + Math.sin(t * 2.4) * 0.12) * nace * x.k; }
    });
    for (const a of [mira.instanceMatrix, hilo.instanceMatrix, cristal.instanceMatrix, orbita.instanceMatrix, aInf, haloP, haloS, haloI]) a.needsUpdate = true;
    // (los fragmentos y el polvo de la entrada; cuando ya no queda ninguno, se quitan)
    if (terr && !terr.fin) { if (!intro.hecho) terr.suelta(dI); terr.ESC.value = r.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360));
      if (!terr.mueve(dI || dt) && intro.hecho) { terr.fin = true; scene.remove(terr.im, terr.nube); } }
    // los núcleos: el pintado entra al acercarse y las casas en pie, ya muy cerca
    nucleos(now, quieto); maqueta(dt, quieto); sigueEntrada(now);
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
    const cerca = v.d < 46, ocupado = tapas.r.slice(), lista = [];
    for (const x of T) { const on = sel ? sel === x.comarca || hover === 't:' + x.id : cerca || x.here || hover === 't:' + x.id;
      lista.push([x.here || hover === 't:' + x.id ? 0 : cerca || sel === x.comarca ? 1 : 3, x.lab, x.X, x.g.position.y + 2.2 * x.g.scale.y, x.Z, on, x.g.position.y]); }
    for (const c of C) lista.push([sel === c.id && cerca ? 4 : 2, c.lab, c.X, c.hc * c.sy + c.py + 1.4, c.Z, !sel || sel === c.id]);
    for (const x of N) lista.push([x.k ? 5 + x.k : 5, x.lab, x.X, x.c ? x.h * x.c.sy + x.c.py : x.h, x.Z, sel ? x.c?.id === sel : v.d < 55]);
    if (maq?.labs) { const c = maq.e.c, on = v.d < 1.3 && maq.op > 0.6; for (const x of maq.labs) lista.push([9, x.lab, x.X, pisoEn(c, x.X, x.Z) * c.sy + c.py + 30 * MU, x.Z, on]); }
    lista.sort((a, b) => a[0] - b[0]);
    for (const [, el, x, y, z, on, y2] of lista) etiqueta(el, x, y, z, on, ocupado, y2);
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
  function etiqueta(el, x, y, z, on, ocupado, y2) {
    pv.set(x, y, z).project(cam);
    let ok = on && pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1, px = (pv.x + 1) / 2 * sz.w, py = (1 - pv.y) / 2 * sz.h, abajo = false;
    if (ok) {
      if (!el._w) { el.hidden = false; el.classList.add('fuera'); el._w = el.offsetWidth; el._h = el.offsetHeight; }
      const g = el._on ? -3 : 4, w = el._w / 2;
      if (!libreEn([px - w - g, py - el._h - g, px + w + g, py + 1 + g], g, ocupado)) {
        ok = false;
        if (y2 != null) { pv.set(x, y2, z).project(cam); const qx = (pv.x + 1) / 2 * sz.w, qy = (1 - pv.y) / 2 * sz.h + 6 + el._h;
          if (pv.z < 1 && libreEn([qx - w - g, qy - el._h - g, qx + w + g, qy + 1 + g], g, ocupado)) { ok = abajo = true; px = qx; py = qy; } }
      }
      if (ok) ocupado.push([px - w - 3, py - el._h - 3, px + w + 3, py + 1]);
    }
    if (ok !== !!el._on || !el._ya) { el._on = ok; el._ya = 1; el.classList.toggle('fuera', !ok); }   // (los que nunca se han visto, también fuera)
    if (!ok) return;
    if (Math.abs(px - (el._x ?? -1e9)) + Math.abs(py - (el._y ?? -1e9)) < 0.3) return;
    el._x = px; el._y = py; el.classList.toggle('abajo', abajo); el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }
  // (los tamaños de los nombres, otra vez cuando llega la letra)
  document.fonts?.ready.then(() => { for (const e of capa.children) e._w = 0; });
  raf = requestAnimationFrame(frame);

  function dispose() {
    if (!vivo) return; vivo = false; cancelAnimationFrame(raf); io.disconnect(); clearTimeout(perdido); cv.removeEventListener('webglcontextlost', pierde); cv.removeEventListener('webglcontextrestored', vuelve); document.removeEventListener('visibilitychange', otraVez); CINE.classList.remove('m3-cine', 'm3-cine-fin', 'm3-cine-sale'); clearTimeout(salida); show?.quita();
    const hm = CINE.querySelector?.('.hub-main'); if (hm) for (const k of ['left', 'top', 'right', 'bottom']) hm.style[k] = '';
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    for (const g of geos) g.dispose(); for (const m of mats) { m.map?.dispose(); m.alphaMap?.dispose(); m.dispose(); } sombra.dispose(); nada.dispose(); bqTex.dispose(); for (const a of arboles) a.dispose(); for (const e of det.values()) if (e.tex) suelta(e.tex); quitaMaqueta(); for (const e of [...nuc.values()]) quitaNucleo(e);
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
    if (cv.parentNode === host) cv.remove(); capa.remove(); pad.remove();
  }
  return { select, vista, dispose, volar: irPueblo, cierraPueblo, entrar };
}
