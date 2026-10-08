// Frontón en 3D (compatible con three.js r128 y posteriores: THREE se recibe como parámetro).
// Origen del grupo: suelo, centro del frontis. La cancha crece hacia +z; la pared izquierda en x = −W/2.
import { COURT } from './rules.js';
import { freeCanvasOnUpload } from '../util/freeCanvas.js';

function srgb(THREE, tex) {
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  return tex;
}
// escala de las texturas pintadas (opts.texScale): en los móviles se pintan a la mitad (cuatro veces menos memoria)
let TEX_K = 1;
function canvasTex(THREE, w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = Math.round(w * TEX_K); c.height = Math.round(h * TEX_K);
  const g = c.getContext('2d'); g.scale(TEX_K, TEX_K);
  draw(g, w, h);
  const t = freeCanvasOnUpload(srgb(THREE, new THREE.CanvasTexture(c)));
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function grain(g, w, h, n, a, dark = true) {
  for (let i = 0; i < n; i++) {
    const v = dark ? (Math.random() * 60) | 0 : 200 + ((Math.random() * 55) | 0);
    g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 2, 2 + Math.random() * 2);
  }
}

// pared de hormigón pintada: juntas de encofrado muy suaves y chorreones de lluvia desde arriba
function weather(c, w, h, mH, mW) {
  c.strokeStyle = 'rgba(0,0,0,.07)'; c.lineWidth = Math.max(1, w / 400);
  for (let y = 2.5; y < mH; y += 2.5) { const Y = h - y / mH * h; c.beginPath(); c.moveTo(0, Y); c.lineTo(w, Y); c.stroke(); }
  for (let x = 3.3; x < mW; x += 3.3) { const X = x / mW * w; c.beginPath(); c.moveTo(X, 0); c.lineTo(X, h); c.stroke(); }
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w, len = h * (0.08 + Math.random() * 0.35), wd = w * (0.004 + Math.random() * 0.012);
    const gr = c.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(40,45,40,.16)'); gr.addColorStop(1, 'rgba(40,45,40,0)');
    c.fillStyle = gr; c.fillRect(x, 0, wd, len);
  }
  const gb = c.createLinearGradient(0, h * 0.82, 0, h); gb.addColorStop(0, 'rgba(60,50,35,0)'); gb.addColorStop(1, 'rgba(60,50,35,.22)');
  c.fillStyle = gb; c.fillRect(0, h * 0.82, w, h * 0.18);   // salpicaduras y tierra abajo
}
// letrero pintado con el nombre del pueblo (letras claras con sombra), ajustado al ancho disponible
function paintName(c, text, cx, cy, maxW, size, color = '#f6f1e4') {
  if (!text) return;
  let fs = size; c.font = `900 ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`;
  const tw = c.measureText(text).width; if (tw > maxW) { fs = size * maxW / tw; c.font = `900 ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`; }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,.28)'; c.fillText(text, cx + fs * 0.05, cy + fs * 0.06);
  c.fillStyle = color; c.fillText(text, cx, cy);
}

// hex → [r, g, b] y un tono algo más claro u oscuro (k > 1 aclara)
const rgb = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const tone = (c, k) => `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
// sillería: hiladas de unos 45 cm con sillares de largo distinto, cada uno con su tono, llagas de mortero y una sombra
// fina bajo cada piedra (mW × mH: metros que cubre el lienzo)
function ashlar(c, w, h, mW, mH, base) {
  const B = rgb(base), px = w / mW, py = h / mH;
  c.fillStyle = tone(B, 1.12); c.fillRect(0, 0, w, h);
  for (let y = 0, row = 0; y < mH; row++) {
    const rh = 0.5 + Math.random() * 0.14;
    for (let x = row % 2 ? -0.6 : 0; x < mW;) {
      const bw = 0.8 + Math.random() * 0.8, k = 0.9 + Math.random() * 0.17, X = x * px + 1.5, Y = h - (y + rh) * py + 1.5, BW = bw * px - 3, BH = rh * py - 3;
      c.fillStyle = tone(B, k); c.fillRect(X, Y, BW, BH);
      // vetas y manchas de la piedra dentro de cada sillar
      for (let i = 0; i < 5; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,245,225,.07)'; c.beginPath(); c.ellipse(X + Math.random() * BW, Y + Math.random() * BH, BW * (0.08 + Math.random() * 0.2), BH * (0.08 + Math.random() * 0.2), 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(X, h - y * py - 4, BW, 2.5);
      x += bw;
    }
    y += rh;
  }
  grain(c, w, h, w * h / 60, 0.06); grain(c, w, h, w * h / 200, 0.05, false);
}
// ladrillo (la Ribera): hiladas a soga, trabadas, con el tono de cada pieza algo distinto y el tendel claro
function bricks(c, w, h, mW, mH, base) {
  const B = rgb(base), px = w / mW, py = h / mH, bh = 0.14, bl = 0.42;
  c.fillStyle = 'rgb(214,200,176)'; c.fillRect(0, 0, w, h);
  for (let y = 0, row = 0; y < mH; y += bh, row++) for (let x = row % 2 ? -bl / 2 : 0; x < mW; x += bl) {
    c.fillStyle = tone(B, 0.82 + Math.random() * 0.3); c.fillRect(x * px + 1, h - (y + bh) * py + 1, bl * px - 2, bh * py - 2);
  }
  grain(c, w, h, w * h / 80, 0.06);
}

// junta muchas cajas (o planos) en una sola geometría: {w, h, d, x, y, z, rz} (giro sobre z) o {plane, w, d, up}
function boxesGeo(T, list) {
  const pos = [], nrm = [], uv = [], m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), one = new T.Vector3(1, 1, 1);
  for (const b of list) {
    const g = b.plane ? new T.PlaneGeometry(b.w, b.d) : new T.BoxGeometry(b.w, b.h, b.d).toNonIndexed();
    const G = b.plane ? g.toNonIndexed() : g;
    e.set(b.plane ? (b.up ? -Math.PI / 2 : Math.PI / 2) : (b.rx || 0), b.ry || 0, b.rz || 0, 'ZYX'); q.setFromEuler(e); m.compose(v.set(b.x, b.y, b.z), q, one);
    G.applyMatrix4(m);
    pos.push(...G.attributes.position.array); nrm.push(...G.attributes.normal.array); uv.push(...G.attributes.uv.array);
    g.dispose(); if (G !== g) G.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.computeBoundingSphere(); return geo;
}

export const THEMES = {
  // stone: color de la sillería del frontis (sin ella, hormigón pintado); chapa: el color de la chapa de abajo (colchón)
  // y chapaMetal si es de metal; brick: ladrillo por fuera; roof: cubierta ('wood' o 'metal')
  plaza: { frontis: '#6f9c8a', wall: '#7aa595', floor: '#8b948f', contra: '#b7ad98', line: '#ffffff', mark: '#e0392f', stands: '#c9b89a',
    chapa: '#c9d0d4', chapaMetal: true, cap: '#ddd6c6', stone: null, brick: false, roof: null },
};

// el Labrit: contracancha ancha y la huella del edificio entero (con los torreones y la escalinata), para buscarle sitio en Iruña
export const LABRIT_CONTRA = 4.4;
// el frontón cubierto de los campeonatos: alto hasta el techo y contracancha algo más ancha (con la grada al lado)
export const HALL_H = 13, HALL_CONTRA = 3.4, HALL_ROWS = 7;
export function labritExtent() {
  const W = COURT.W, EXT = COURT.L + 3, xr = W / 2 + LABRIT_CONTRA, zf = EXT + 0.3, xa = -W / 2 - 0.6, xb = xr + 14.6, za = -1.0, zb = zf + 14.6;
  return { x0: xa - 4.9, x1: xb + 4.9, z0: za - 4.9, z1: zb + 6.5 };
}

export class PelotaCourt {
  constructor(THREE, opts = {}) {
    const T = THREE, C = COURT, th = Object.assign({}, THEMES[opts.theme] || THEMES.plaza, opts.look || {});
    this.THREE = T; TEX_K = opts.texScale || 1;
    this.look = th;   // (cómo es: con cubierta, frontis de piedra... de ahí sale cómo se juega en él, courtFeel)
    const g = this.group = new T.Group(); g.name = 'Fronton';
    const HALL = !!opts.hall && !opts.labrit;   // (frontón cubierto y cerrado: el de los campeonatos)
    const W = C.W, L = C.L, EXT = L + 3, CONTRA = opts.labrit ? LABRIT_CONTRA : HALL ? HALL_CONTRA : 2.6;   // (el Labrit, con su contracancha ancha de tarima)
    const std = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.88, metalness: 0 }, o));
    this.materials = [];
    const M = (o) => { const m = std(o); this.materials.push(m); return m; };

    // --- suelo: cancha, rayas de los cuadros (sin números: esos van en la pared izquierda), falta y pasa, contracancha
    const fw = W + CONTRA, fl = EXT;
    const floorTex = canvasTex(T, 512, 2048, (c, w, h) => {
      const sx = w / fw, sz = h / fl, X = (x) => (x + W / 2) * sx, Z = (z) => z * sz;
      c.fillStyle = th.floor; c.fillRect(0, 0, X(W / 2), h);
      c.fillStyle = th.contra; c.fillRect(X(W / 2), 0, w - X(W / 2), h);
      if (th.parquet) {   // tarima de madera clara en tablillas, como la del Labrit
        const pw = (w - X(W / 2)) / 7, ph = h / (fl / 0.45);
        for (let j = 0, z = 0; z < h; z += ph, j++) for (let i = 0; i < 7; i++) { const t = 0.9 + ((i * 7 + j * 13) % 9) / 40; c.fillStyle = `rgb(${Math.round(214 * t)},${Math.round(160 * t)},${Math.round(98 * t)})`; c.fillRect(X(W / 2) + i * pw + 1, z + ((i % 2) * ph) / 2, pw - 2, ph - 2); }
      }
      grain(c, w, h, 9000, 0.07); grain(c, w, h, 3000, 0.05, false);
      c.strokeStyle = th.line; c.lineWidth = 4;
      for (let k = 1; k * C.CUADRO <= L + 0.01; k++) { const z = Z(k * C.CUADRO); c.beginPath(); c.moveTo(0, z); c.lineTo(X(W / 2), z); c.stroke(); }
      // falta (4) y pasa (7), más gruesas y rojas
      c.strokeStyle = th.mark; c.lineWidth = 9;
      for (const z of [C.FALTA, C.PASA]) { c.beginPath(); c.moveTo(0, Z(z)); c.lineTo(X(W / 2), Z(z)); c.stroke(); }
      // raya de la derecha (contracancha) y del fondo
      c.strokeStyle = th.line; c.lineWidth = 8;
      c.beginPath(); c.moveTo(X(W / 2), 0); c.lineTo(X(W / 2), Z(L)); c.lineTo(0, Z(L)); c.stroke();
    });
    floorTex.minFilter = T.LinearMipmapLinearFilter;
    const floor = new T.Mesh(new T.PlaneGeometry(fw, fl), M({ map: floorTex, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(-W / 2 + fw / 2, 0, fl / 2); floor.receiveShadow = true; g.add(floor);
    // zócalo bajo la cancha para que no flote en terrenos con pendiente
    const base = new T.Mesh(new T.BoxGeometry(fw + 1.2, 3, fl + 1), M({ color: '#8d8578', roughness: 0.95 }));
    base.position.set(-W / 2 + fw / 2, -1.52, fl / 2 - 0.3); base.receiveShadow = true; g.add(base);

    // --- frontis con la chapa y la raya de arriba
    const title = (opts.title || '').toUpperCase();
    const frontTex = canvasTex(T, 1024, 1024, (c, w, h) => {
      if (th.stone) ashlar(c, w, h, W + 0.6, C.FRONT_H, th.stone);
      else { c.fillStyle = th.frontis; c.fillRect(0, 0, w, h); grain(c, w, h, 16000, 0.06); grain(c, w, h, 5000, 0.05, false); }
      weather(c, w, h, C.FRONT_H, W + 0.6);
      const Y = (y) => h - y / C.FRONT_H * h;
      // nombre del pueblo en lo alto del frontis, como en los frontones de verdad
      // (sin el nombre del pueblo: va solo en la pared izquierda)
      c.fillStyle = th.mark; c.fillRect(0, Y(C.FRONT_TOP) - 12, w, 24);            // raya superior
      c.strokeStyle = th.line; c.lineWidth = 12; c.beginPath(); c.moveTo(w - 6, 0); c.lineTo(w - 6, h); c.stroke(); // raya lateral derecha
    });
    // trasera del frontis (da a la calle): el nombre y «FRONTÓN» sobre la pared
    const backTex = canvasTex(T, 1024, 1024, (c, w, h) => {
      if (th.stone) ashlar(c, w, h, W + 0.6, C.FRONT_H, th.stone);
      else if (th.brick) bricks(c, w, h, W + 0.6, C.FRONT_H, '#a85c3e');
      else { c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 16000, 0.06); grain(c, w, h, 5000, 0.05, false); }
      weather(c, w, h, C.FRONT_H, W + 0.6);
      paintName(c, title ? 'FRONTÓN' : '', w / 2, h * 0.36, w * 0.5, h * 0.07, '#fdfaf2');   // (el nombre del pueblo, solo en la pared izquierda)
    });
    const frontEnd = canvasTex(T, 256, 1024, (c, w, h) => { if (th.stone) ashlar(c, w, h, 0.8, C.FRONT_H, th.stone); else { c.fillStyle = th.frontis; c.fillRect(0, 0, w, h); grain(c, w, h, 6000, 0.06); grain(c, w, h, 2000, 0.05, false); } weather(c, w, h, C.FRONT_H, 0.8); });
    const front = new T.Mesh(new T.BoxGeometry(W + 0.6, C.FRONT_H, 0.8), [M({ map: frontEnd }), M({ map: frontEnd }), M({ color: th.stone || th.frontis }), M({ color: th.stone || th.frontis }), M({ map: frontTex }), M({ map: backTex })]);
    front.position.set(-0.3, C.FRONT_H / 2, -0.4); front.castShadow = true; front.receiveShadow = true; g.add(front);
    // albardilla de piedra que remata el frontis y la pared izquierda
    const capMat = M({ color: th.cap, roughness: 0.8 });
    const cap = new T.Mesh(new T.BoxGeometry(W + 0.9, 0.24, 1.05), capMat); cap.position.set(-0.3, C.FRONT_H + 0.12, -0.4); cap.castShadow = true; g.add(cap);
    // el marcador grande, encima del frontis: los nombres y los tantos de los azules y los colorados, que se leen desde
    // cualquier sitio de la cancha (sin anuncios ni escudos de clubes: solo el tanteo)
    { const bc = this.bigCanvas = document.createElement('canvas'); bc.width = 1024; bc.height = 192;
      const bt = this.bigTex = srgb(T, new T.CanvasTexture(bc));
      const bw = 5.8, bh = bw * 192 / 1024, by = C.FRONT_H + 0.24 + bh / 2 + 0.06;
      const big = new T.Mesh(new T.PlaneGeometry(bw, bh), new T.MeshBasicMaterial({ map: bt, toneMapped: false })); big.position.set(0, by, 0.15); big.name = 'marcador-frontis'; g.add(big);
      const back = new T.Mesh(new T.BoxGeometry(bw + 0.2, bh + 0.2, 0.16), M({ color: '#24282c', roughness: 0.6, metalness: 0.3 })); back.position.set(0, by, 0.05); g.add(back);
      this.setScore('', '', 0, 0); }
    const capL = new T.Mesh(new T.BoxGeometry(0.85, 0.2, EXT + 0.2), capMat); capL.position.set(-W / 2 - 0.3, C.LEFT_H + 0.1, EXT / 2 - 0.1); capL.castShadow = true; g.add(capL);
    // la chapa de abajo (el colchón): de metal o pintada del color del frontón de cada sitio
    const chapa = this.chapa = new T.Mesh(new T.BoxGeometry(W, C.CHAPA, 0.05), M(th.chapaMetal ? { color: th.chapa, metalness: 0.15, roughness: 0.45, emissive: '#000000' } : { color: th.chapa, roughness: 0.7, emissive: '#000000' }));
    chapa.position.set(0, C.CHAPA / 2, 0.025); chapa.receiveShadow = true; g.add(chapa);
    const chapaLine = new T.Mesh(new T.BoxGeometry(W, 0.08, 0.07), M({ color: th.mark, roughness: 0.6 }));
    chapaLine.position.set(0, C.CHAPA, 0.035); g.add(chapaLine);

    // --- pared izquierda (lisa, con la raya roja de arriba)
    const leftTex = canvasTex(T, 2048, 512, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 12000, 0.06); grain(c, w, h, 3000, 0.05, false);
      weather(c, w, h, C.LEFT_H, EXT);
      const Y = (y) => h - y / C.LEFT_H * h;
      c.fillStyle = th.mark; c.fillRect(0, Y(C.LEFT_LINE) - 6, w, 12);   // raya roja: por encima es mala
    });
    // números de los cuadros, como en los frontones de verdad: en la pared izquierda, una raya blanca vertical
    // desde el suelo en cada raya de cuadro y, arriba, el número dentro de un círculo (pintura algo gastada)
    const nK = Math.floor(L / C.CUADRO + 0.01), CW = 128, CH = 480, MW = 0.9, MH = MW * CH / CW;
    const markTex = canvasTex(T, CW * nK, CH, (c, w, h) => {
      for (let k = 1; k <= nK; k++) {
        const cx = (k - 0.5) * CW, R = CW * 0.4, cy = R + 8;
        c.fillStyle = th.line; c.strokeStyle = th.line;
        c.fillRect(cx - 11, cy + R + 16, 22, h - (cy + R + 16));
        c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R - 5, 0, Math.PI * 2); c.stroke();
        c.font = `bold ${R * 1.12}px "Trebuchet MS", Nunito, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(k), cx, cy + R * 0.06);
        // desconchones: motas del color de la pared sobre la pintura blanca
        c.fillStyle = th.wall;
        for (let i = 0; i < 70; i++) { const yy = cy + R + 16 + Math.random() * (h - cy - R - 16), xx = cx - 11 + Math.random() * 22; c.fillRect(xx, yy, 1 + Math.random() * 3, 1 + Math.random() * 4); }
        for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, rr = R - 5 + (Math.random() - 0.5) * 9; c.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 2); }
      }
    });
    { const pos = [], uv = [], nrm = [], x = -W / 2 + 0.012;
      for (let k = 1; k <= nK; k++) {
        const z = k * C.CUADRO, u0 = (k - 1) / nK, u1 = k / nK;
        // mira a +x (hacia la cancha); la u crece hacia −z, que es la derecha de quien mira la pared
        const q = [[z + MW / 2, 0, u0, 0], [z - MW / 2, 0, u1, 0], [z - MW / 2, MH, u1, 1], [z + MW / 2, 0, u0, 0], [z - MW / 2, MH, u1, 1], [z + MW / 2, MH, u0, 1]];
        for (const [zz, yy, uu, vv] of q) { pos.push(x, yy, zz); uv.push(uu, vv); nrm.push(1, 0, 0); }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      const marks = new T.Mesh(geo, M({ map: markTex, alphaTest: 0.5, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      marks.receiveShadow = true; marks.name = 'cuadros'; g.add(marks); }
    // y encima del 4 y del 7, sus nombres: FALTA y PASA, las rayas del saque (así se aprenden mientras se juega)
    for (const [z, word] of [[C.FALTA, 'FALTA'], [C.PASA, 'PASA']]) {
      const tex = canvasTex(T, 320, 96, (c, w, h) => { c.fillStyle = th.line; c.font = `900 ${h * 0.78}px "Lilita One", "Trebuchet MS", Nunito, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(word, w / 2, h * 0.54); });
      const lab = new T.Mesh(new T.PlaneGeometry(1.7, 0.51), M({ map: tex, alphaTest: 0.5, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      lab.position.set(-W / 2 + 0.014, MH + 0.42, z); lab.rotation.y = Math.PI / 2; lab.name = 'raya-' + word.toLowerCase(); g.add(lab);
    }
    // nombre y escudo del pueblo pintados en lo alto de la pared izquierda
    if (opts.wallName || opts.shield) {
      // (centrado a lo largo de la pared, y el escudo con el nombre centrados en su cartel)
      const DW = 11, DH = 2.75, dz = opts.signAt?.z ?? EXT / 2, dy = opts.signAt?.y ?? C.LEFT_H - 0.5 - 0.35 - DH / 2;
      const nameTex = canvasTex(T, 1536, 384, (c, w, h) => {
        const font = (fs, weight) => `${weight} ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`;
        const sw = opts.shield ? h * 0.95 : 0, max = w * 0.94 - sw;
        const lines = [[opts.wallName, h * 0.4, h * 0.36, '900'], [opts.wallSub, h * 0.76, h * 0.17, '700']].filter(l => l[0]).map(([text, y, size, weight]) => {
          c.font = font(size, weight); const tw = c.measureText(text).width, fs = tw > max ? size * max / tw : size;
          c.font = font(fs, weight); return { text, y, fs, weight, tw: c.measureText(text).width }; });
        const textW = Math.max(0, ...lines.map(l => l.tw)), x0 = (w - sw - textW) / 2, tc = x0 + sw + textW / 2;
        if (opts.shield) opts.shield(c, x0 + h * 0.44, h * 0.03, h * 0.94);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        for (const l of lines) { c.font = font(l.fs, l.weight);
          c.fillStyle = 'rgba(0,0,0,.22)'; c.fillText(l.text, tc + l.fs * 0.04, l.y + l.fs * 0.05);
          c.fillStyle = '#fbf8f0'; c.fillText(l.text, tc, l.y); }
        const tx = x0;
        // pintura algo gastada, como las marcas de los cuadros
        c.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`; c.fillRect(tx + Math.random() * (w - 2 * tx), Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); }
        c.globalCompositeOperation = 'source-over';
      });
      const x = -W / 2 + 0.014, z0 = dz + DW / 2, z1 = dz - DW / 2, y0 = dy - DH / 2, y1 = dy + DH / 2;
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y0, z0, x, y1, z1, x, y1, z0], 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
      const sign = new T.Mesh(geo, M({ map: nameTex, alphaTest: 0.35, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      sign.receiveShadow = true; sign.name = 'nombre'; g.add(sign);
    }
    // caras exteriores (la trasera de la pared izquierda da a la calle y se ve desde el pueblo): hormigón revocado con
    // grano, juntas horizontales del encofrado, churretes y humedad al pie, en vez de un plano de color liso
    const outerTex = canvasTex(T, 1024, 512, (c, w, h) => {
      if (th.brick) { bricks(c, w, h, EXT, C.LEFT_H, '#a85c3e'); weather(c, w, h, C.LEFT_H, EXT); return; }
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 12000, 0.07); grain(c, w, h, 4000, 0.05, false);
      weather(c, w, h, C.LEFT_H, EXT);
      c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 2;
      for (let k = 1; k * 1.3 < C.LEFT_H; k++) { const y = h - k * 1.3 / C.LEFT_H * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.08)'; for (let k = 1; k * 1.3 < C.LEFT_H; k++) { const y = h - k * 1.3 / C.LEFT_H * h + 2; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    });
    outerTex.wrapS = outerTex.wrapT = T.RepeatWrapping;
    const outer = () => M({ map: outerTex });
    const left = new T.Mesh(new T.BoxGeometry(0.6, C.LEFT_H, EXT), [M({ map: leftTex }), outer(), outer(), outer(), outer(), outer()]);
    // la cara +x (hacia la cancha) lleva la textura; en BoxGeometry su u va de +z a −z
    left.position.set(-W / 2 - 0.3, C.LEFT_H / 2, EXT / 2); left.castShadow = true; left.receiveShadow = true; g.add(left);

    // --- el rebote (la pared del fondo) y las gradas de la contracancha
    // el rebote cierra la cancha por detrás, tan alto como la pared izquierda (solo detrás de la cancha: se entra por la
    // contracancha). En el Labrit, el muro bajo con la grada en herradura detrás. Cuando la cámara queda detrás de él,
    // se ve a través, como en los dibujos de las partes del frontón
    const RH = this.reboteH = opts.labrit ? 2.2 : HALL ? HALL_H : C.LEFT_H;
    const rebTex = canvasTex(T, 512, 512, (c, w, h) => {
      if (th.brick) bricks(c, w, h, W + 0.6, RH, '#a85c3e');
      else { c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 9000, 0.06); grain(c, w, h, 3000, 0.05, false); }
      weather(c, w, h, RH, W + 0.6);
    });
    const rebIn = M({ map: rebTex, transparent: true }), rebOut = M({ map: outerTex, transparent: true }), rebCap = M({ color: th.cap, roughness: 0.8, transparent: true });
    const back = new T.Mesh(new T.BoxGeometry(W + 0.6, RH, 0.4), [rebOut, rebOut, rebCap, rebOut, rebOut, rebIn]);
    back.position.set(-0.3, RH / 2, EXT + 0.2); back.castShadow = true; back.receiveShadow = true; g.add(back);
    if (!opts.labrit && !HALL) { const capR = new T.Mesh(new T.BoxGeometry(W + 0.9, 0.2, 0.85), rebCap); capR.position.set(-0.3, RH + 0.1, EXT + 0.2); capR.castShadow = true; g.add(capR); }
    this.rebMats = [rebIn, rebOut, rebCap]; this.rebFade = 1; this.contra = CONTRA;
    if (!opts.labrit && !HALL) for (let i = 0; i < 3; i++) {
      const st = new T.Mesh(new T.BoxGeometry(1.1, 0.42 * (i + 1), L * 0.78), M({ color: th.stands, roughness: 0.9 }));
      st.position.set(W / 2 + CONTRA + 0.55 + i * 1.1, 0.21 * (i + 1), L * 0.52); st.castShadow = true; st.receiveShadow = true; g.add(st);
    }
    // bancos corridos de tablas de madera sobre cada escalón (como en las gradas de los frontones de pueblo) y los sitios
    // del público que viene a ver el partido (sentado en ellos, mirando a la cancha)
    const benchM = M({ color: '#8a5a34', roughness: 0.7 }), benchG = new T.BoxGeometry(0.42, 0.06, L * 0.76);
    this.standSpots = [];
    if (!opts.labrit && !HALL) for (let i = 0; i < 3; i++) {
      const x = W / 2 + CONTRA + 0.42 + i * 1.1, y = 0.42 * (i + 1);
      for (const dx of [0, 0.2]) { const b = new T.Mesh(benchG, benchM); b.position.set(x + dx - 0.1, y + 0.05, L * 0.52); b.castShadow = true; b.receiveShadow = true; g.add(b); }
      for (let z = L * 0.52 - L * 0.37; z < L * 0.52 + L * 0.37; z += 0.58) this.standSpots.push([x + 0.05, y + 0.02, z + (Math.random() - 0.5) * 0.12, -Math.PI / 2]);
    }
    this.extent = { x0: -W / 2 - 0.6, x1: W / 2 + CONTRA + 3.3, z0: -0.8, z1: EXT + 0.4 };
    this.entry = { x: W / 2 + CONTRA / 2, z: EXT - 0.6 };   // por donde se entra a la cancha (esquina de la contracancha)
    // cajas de colisión (locales): frontis, pared izquierda, fondo, gradas
    this.boxes = [
      { x: -0.3, z: -0.4, w: W + 0.6, d: 0.8 },
      { x: -W / 2 - 0.3, z: EXT / 2, w: 0.6, d: EXT },
      { x: -0.3, z: EXT + 0.2, w: W + 0.6, d: 0.4 },
      { x: W / 2 + CONTRA + 1.65, z: L * 0.52, w: 3.3, d: L * 0.78 },
    ];
    if (opts.labrit) this.buildLabrit(T, M, th, W, CONTRA, EXT, L, opts);
    else if (HALL) this.buildHall(T, M, th, W, CONTRA, EXT, L, opts);
    else if (th.roof) this.buildRoof(T, M, th, -W / 2 - 0.6, W / 2 + CONTRA + 3.3, -0.9, EXT + 0.5);
    if (!opts.labrit && !HALL) this.buildFloods(T, M, !!th.roof, W, CONTRA, EXT);

    // --- pelota, sombra, estela y ayudas
    const ball = this.ball = new T.Group();
    const ballMat = this.ballMat = M({ color: '#f4eedd', roughness: 0.55, emissive: '#000000' });
    ball.add(new T.Mesh(new T.SphereGeometry(C.BALL_R, 18, 12), ballMat));
    const seam = M({ color: '#8a1d1d', roughness: 0.7 });
    for (const s of [-1, 1]) { const t = new T.Mesh(new T.TorusGeometry(C.BALL_R * 1.01, C.BALL_R * 0.07, 5, 24, Math.PI), seam); t.rotation.set(0, s * 0.6, Math.PI / 2); ball.add(t); }
    ball.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(ball);
    const shadowMat = new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false });
    this.shadow = new T.Mesh(new T.CircleGeometry(C.BALL_R * 1.1, 16), shadowMat); this.shadow.rotation.x = -Math.PI / 2; g.add(this.shadow);
    const trailMat = new T.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.35, depthWrite: false });
    const trailGeo = new T.SphereGeometry(C.BALL_R, 8, 6);
    this.trail = [];
    for (let i = 0; i < 9; i++) { const m = new T.Mesh(trailGeo, trailMat); m.scale.setScalar(0.85 - i * 0.08); g.add(m); this.trail.push(m); }
    this.trailPts = [];
    const ring = (inner, outer, color, op) => { const m = new T.Mesh(new T.RingGeometry(inner, outer, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; g.add(m); return m; };
    this.landRing = ring(0.28, 0.42, '#c9b2ff', 0.9);
    this.spotRing = ring(0.55, 0.78, '#ff2bd6', 0.85);
    const zone = this.serveZone = new T.Mesh(new T.PlaneGeometry(W, C.PASA - C.FALTA), new T.MeshBasicMaterial({ color: '#ff2bd6', transparent: true, opacity: 0.22, depthWrite: false }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.015, (C.FALTA + C.PASA) / 2); zone.visible = false; g.add(zone);
    const flash = this.flash = new T.Mesh(new T.RingGeometry(0.1, 0.35, 28), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
    flash.visible = false; g.add(flash);
    // marca de puntería en el frontis (cortada y dejada): un aro amarillo que sube con la fuerza
    const aim = this.aimMark = new T.Mesh(new T.RingGeometry(0.2, 0.32, 28), new T.MeshBasicMaterial({ color: '#ff7ac8', transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }));
    aim.add(new T.Mesh(new T.CircleGeometry(0.06, 12), aim.material)); aim.visible = false; aim.renderOrder = 3; g.add(aim);
    // golpe apuntado (con el botón mantenido): el camino previsto de la pelota (frontis, pared izquierda a dos paredes)
    // a trazos, el bote marcado en el suelo y el punto de la pared
    const pathMat = new T.LineDashedMaterial({ color: '#ff7ac8', dashSize: 0.35, gapSize: 0.22, transparent: true, opacity: 0.9, depthWrite: false });
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(new Float32Array(96 * 3), 3)); pg.setDrawRange(0, 0);
    this.aimPath = new T.Line(pg, pathMat); this.aimPath.visible = false; this.aimPath.frustumCulled = false; this.aimPath.renderOrder = 3; g.add(this.aimPath);
    this.aimLand = ring(0.3, 0.46, '#ff7ac8', 0.95); this.aimLand.renderOrder = 3;
    this.aimLand.add(new T.Mesh(new T.CircleGeometry(0.1, 14), this.aimLand.material));
    const wd = this.aimWall = new T.Mesh(new T.RingGeometry(0.16, 0.26, 24), aim.material); wd.rotation.y = Math.PI / 2; wd.visible = false; wd.renderOrder = 3; g.add(wd);
    this.materials?.push(pathMat, aim.material, this.aimLand.material);
    this.hideBall();
  }
  // ---------- frontón Labrit (Iruña, 1952): donde se juegan las finales ----------
  // Lo que cuentan las fuentes (Ayuntamiento de Pamplona, Federación Navarra de Pelota, Noticias de Navarra): frontón
  // corto cubierto de 36 × 13 m, con las gradas en tres alturas «prácticamente encima del pavimento» (de ahí lo de
  // «la Bombonera»), cubierta de chapa con una franja translúcida, fachada de ladrillo con tres torreones de teja,
  // junto a las murallas y al baluarte de Labrit. Las paredes, verdes. Es una recreación para el juego: el aforo, las
  // alturas y los colores exactos se han simplificado.
  buildLabrit(T, M, th, W, CONTRA, EXT, L, opts = {}) {
    const C = COURT, g = this.group, HW = 13.6, inTown = !!opts.inTown, D = inTown ? 9 : 0;   // (en Iruña, en la ciudad: con zócalo hasta el terreno)
    const cream = M({ color: '#e9e2d2', roughness: 0.9 }), white = M({ color: '#f1efe9', roughness: 0.92 }), green = M({ color: th.wall, roughness: 0.9 });
    const wood = M({ color: '#d29a5a', roughness: 0.6 }), woodDark = M({ color: '#b07a40', roughness: 0.65 }), rail = M({ color: '#cf9a5c', roughness: 0.55 });
    const steel = M({ color: '#4a5056', roughness: 0.5, metalness: 0.4 }), grey = M({ color: '#9a978f', roughness: 0.9 });
    const box = (w, h, d, mat, x, y, z, ry = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); return m; };
    this.standSpots = [];
    // --- la planta de las gradas: a lo largo de la contracancha y, con una curva, por el fondo (en herradura)
    const xr = W / 2 + CONTRA, zf = EXT + 0.3, R = 4.5, path = [[xr, 2.2], [xr, zf - R]];
    for (let k = 1; k <= 5; k++) { const a = k / 5 * Math.PI / 2; path.push([xr - R + R * Math.cos(a), zf - R + R * Math.sin(a)]); }
    path.push([-W / 2 - 0.3, zf]);
    // recorre la planta desplazada «off» metros hacia fuera: tramos con su centro, largo, giro y la normal hacia fuera
    const segs = (off) => { const out = []; for (let i = 0; i < path.length - 1; i++) { const [x0, z0] = path[i], [x1, z1] = path[i + 1], dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = dz / l, nz = -dx / l;
      out.push({ x: (x0 + x1) / 2 + nx * off, z: (z0 + z1) / 2 + nz * off, l: l + off * (i > 0 && i < path.length - 2 ? 0.32 : 0.16) + 0.05, ry: Math.atan2(dx, dz), nx, nz }); } return out; };
    // fila: escalón, asiento de madera y respaldo, y los sitios del público mirando a la cancha
    // butacas de madera, una a una, como las del Labrit: concha de tablero curvado color miel (asiento y respaldo),
    // reposabrazos de madera y pie de hierro; abajo, claras; en los anfiteatros, algo más oscuras
    const seatsLo = [], seatsHi = [];
    const row = (off, y, seats = true, step = 0.8, hi = false) => { for (const s of segs(off)) {
      box(s.l, y, step, grey, s.x + s.nx * step / 2, y / 2, s.z + s.nz * step / 2, s.ry + Math.PI / 2);
      box(s.l, 0.04, 0.05, cream, s.x + s.nx * 0.02, y + 0.02, s.z + s.nz * 0.02, s.ry + Math.PI / 2);   // el canto del escalón
      if (!seats) continue;
      const n = Math.floor(s.l / 0.54), fy = Math.atan2(-s.nx, -s.nz), dx = Math.sin(s.ry), dz = Math.cos(s.ry);
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n - 0.5, x = s.x + dx * t * s.l + s.nx * 0.4, z = s.z + dz * t * s.l + s.nz * 0.4;
        (hi ? seatsHi : seatsLo).push([x, y, z, fy]);
        if (k % 2 === 0) this.standSpots.push([x - s.nx * 0.05, y + 0.44, z - s.nz * 0.05, fy]); } } };
    // grada baja: el antepecho de madera junto a la contracancha y diez filas de butacas de madera
    // (el antepecho, forrado de tablas verticales de madera barnizada, como la tarima)
    const panelTex = canvasTex(T, 512, 128, (c, w, h) => { const n = 16, bw = w / n; for (let i = 0; i < n; i++) { const t = 0.86 + Math.random() * 0.2; c.fillStyle = `rgb(${Math.round(214 * t)},${Math.round(152 * t)},${Math.round(88 * t)})`; c.fillRect(i * bw + 1, 0, bw - 2, h);
      c.strokeStyle = 'rgba(110,62,22,.18)'; c.lineWidth = 1; for (let k = 0; k < 2; k++) { const gx = i * bw + 3 + Math.random() * (bw - 6); c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + 2, h * 0.3, gx - 2, h * 0.7, gx, h); c.stroke(); } } }, [3, 1]);
    const panel = M({ map: panelTex, roughness: 0.45 });
    for (const s of segs(0.15)) { box(s.l, 1.05, 0.22, panel, s.x, 0.52, s.z, s.ry + Math.PI / 2); box(s.l, 0.1, 0.34, rail, s.x, 1.1, s.z, s.ry + Math.PI / 2); }
    for (let r = 0; r < 10; r++) row(0.5 + r * 0.8, 0.3 + r * 0.36);
    // dos anfiteatros volados, curvos, de hormigón claro con su barandilla de madera, sobre pilares
    const balc = (off0, y0, rows) => {
      for (const s of segs(off0)) { box(s.l, 1.0, 0.24, cream, s.x, y0 + 0.5, s.z, s.ry + Math.PI / 2); box(s.l, 0.12, 0.36, rail, s.x, y0 + 1.05, s.z, s.ry + Math.PI / 2);
        box(s.l, 0.55, rows * 0.8 + 0.4, cream, s.x + s.nx * (rows * 0.4 + 0.2), y0 - 0.28, s.z + s.nz * (rows * 0.4 + 0.2), s.ry + Math.PI / 2); }   // el forjado (por debajo, el techo escalonado)
      for (let r = 0; r < rows; r++) row(off0 + 0.4 + r * 0.8, y0 + r * 0.4, true, 0.8, true);
      for (const s of segs(off0 + 0.6)) { const dx = Math.sin(s.ry), dz = Math.cos(s.ry); for (let t = -0.5; t <= 0.5; t += 0.5) if (s.l > 4 || t === 0) box(0.32, y0 - 0.5, 0.32, cream, s.x + dx * t * s.l * 0.9, (y0 - 0.5) / 2, s.z + dz * t * s.l * 0.9); }
    };
    balc(8.2, 5.2, 4); balc(10.4, 8.6, 4);
    { const shell = boxesGeo(T, [{ w: 0.46, h: 0.045, d: 0.42, x: 0, y: 0.44, z: 0.04 }, { w: 0.46, h: 0.5, d: 0.04, x: 0, y: 0.72, z: -0.2, rx: -0.2 },
        { w: 0.05, h: 0.04, d: 0.36, x: -0.255, y: 0.64, z: 0.02 }, { w: 0.05, h: 0.04, d: 0.36, x: 0.255, y: 0.64, z: 0.02 }]);
      const frame = boxesGeo(T, [{ w: 0.05, h: 0.44, d: 0.05, x: -0.255, y: 0.22, z: -0.08 }, { w: 0.05, h: 0.44, d: 0.05, x: 0.255, y: 0.22, z: -0.08 },
        { w: 0.04, h: 0.22, d: 0.04, x: -0.255, y: 0.54, z: 0.14 }, { w: 0.04, h: 0.22, d: 0.04, x: 0.255, y: 0.54, z: 0.14 }]);
      const woodLo = M({ color: '#d89c56', roughness: 0.42 }), woodHi = M({ color: '#a8703a', roughness: 0.48 }), iron = M({ color: '#2c2f33', roughness: 0.5, metalness: 0.5 });
      const mt = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), one = new T.Vector3(1, 1, 1), v = new T.Vector3();
      const inst = (geo, mat, list) => { if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length);
        list.forEach(([x, y, z, ry], i) => { q.setFromAxisAngle(up, ry); mt.compose(v.set(x, y, z), q, one); im.setMatrixAt(i, mt); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere?.(); im.receiveShadow = true; im.name = 'butacas'; g.add(im); };
      inst(shell, woodLo, seatsLo); inst(shell, woodHi, seatsHi); if (TEX_K >= 1) inst(frame, iron, seatsLo.concat(seatsHi)); }   // (en el móvil, sin los pies de hierro: casi no se ven y pesan)
    // la tarima de la contracancha: tablillas estrechas de haya clara, a lo largo de la cancha y a juntas
    // encontradas, barnizadas y con brillo (lo más reconocible del Labrit)
    { const PW = 1.3, PL = 2.6, tex = canvasTex(T, 512, 1024, (c, w, h) => {
        const n = 20, sw = w / n;
        for (let i = 0; i < n; i++) { let z = -Math.random() * h * 0.4; while (z < h) { const L = h * (0.2 + Math.random() * 0.26), t = 0.86 + Math.random() * 0.2;
          const r = Math.round(222 * t), gg = Math.round(166 * t), bb = Math.round(100 * t); c.fillStyle = `rgb(${r},${gg},${bb})`; c.fillRect(i * sw + 0.6, z + 0.6, sw - 1.2, L - 1.2);
          c.strokeStyle = `rgba(120,70,25,${0.12 + Math.random() * 0.1})`; c.lineWidth = 1;
          for (let k = 0; k < 3; k++) { const gx = i * sw + 2 + Math.random() * (sw - 4); c.beginPath(); c.moveTo(gx, z + 2); c.bezierCurveTo(gx + 2, z + L * 0.3, gx - 2, z + L * 0.7, gx + 1, z + L - 2); c.stroke(); }
          z += L; } }
        c.fillStyle = 'rgba(255,245,220,.06)'; c.fillRect(0, 0, w, h); }, [CONTRA / PW, (EXT + 0.4) / PL]);
      const par = new T.Mesh(new T.PlaneGeometry(CONTRA + 0.02, EXT + 0.4), M({ map: tex, roughness: 0.32, metalness: 0.02 }));
      par.rotation.x = -Math.PI / 2; par.position.set(W / 2 + CONTRA / 2, 0.006, (EXT + 0.4) / 2); par.receiveShadow = true; g.add(par);
      // la raya blanca que separa la cancha de la contracancha
      box(0.1, 0.012, EXT + 0.4, white, W / 2, 0.007, (EXT + 0.4) / 2); }
    // --- el edificio por dentro: paredes verdes altas a la izquierda y detrás del frontis, blanco a la derecha del frontis
    const xa = -W / 2 - 0.6, xb = xr + 14.6, za = -1.0, zb = zf + 14.6;
    const brick = M({ color: '#a4583c', roughness: 0.9 });
    const wall = (w, h, d, x, y, z, inner, mIn) => { const mats = [brick, brick, brick, brick, brick, brick]; mats[inner] = mIn; const m = new T.Mesh(new T.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
    wall(0.5, HW, zb - za, xa - 0.25, HW / 2, (za + zb) / 2, 0, green);                                    // izquierda, alta y verde
    wall(W + 0.9, HW, 0.5, (xa + W / 2 + 0.3) / 2, HW / 2, za - 0.25, 4, green);                         // detrás del frontis, verde
    wall(xb - W / 2 - 0.3, HW, 0.5, (W / 2 + 0.3 + xb) / 2, HW / 2, za - 0.25, 4, white);                // a la derecha del frontis, blanca
    wall(0.5, HW, zb - za, xb + 0.25, HW / 2, (za + zb) / 2, 1, white);
    wall(xb - xa, HW, 0.5, (xa + xb) / 2, HW / 2, zb + 0.25, 5, white);
    // la raya blanca que remata el verde y la fila de ventanas cuadradas arriba de la pared izquierda
    box(0.06, 0.12, zb - za, white, xa + 0.03, 10.2, (za + zb) / 2);
    const winM = new T.MeshBasicMaterial({ color: '#d9ecf6' });
    for (let z = 2.5; z < zf; z += 4.2) { const wn = new T.Mesh(new T.PlaneGeometry(1.1, 1.0), winM); wn.position.set(xa + 0.02, 11.6, z); wn.rotation.y = Math.PI / 2; g.add(wn); box(0.08, 1.2, 1.3, white, xa + 0.04, 11.6, z); }
    // el frontis con su raya blanca alrededor (arriba y a la derecha) y la franja clara de abajo
    box(W + 0.2, 0.14, 0.06, white, -0.1, C.FRONT_TOP, 0.04); box(0.14, C.FRONT_TOP, 0.06, white, W / 2 - 0.05, C.FRONT_TOP / 2, 0.04);
    // --- techo: a la izquierda, liso y claro sobre la cancha; a la derecha, el gran lucernario con la fila de focos
    const xs = W / 2 + 0.6;
    const ceil = new T.Mesh(new T.PlaneGeometry(xs - xa, zb - za), M({ color: '#d9cdb3', roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.set((xa + xs) / 2, HW - 0.2, (za + zb) / 2); g.add(ceil);
    const skyTex = canvasTex(T, 512, 512, (c, w, h) => { c.fillStyle = '#f4f7f8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8d0d4'; c.lineWidth = 3; for (let k = 0; k <= 16; k++) { c.beginPath(); c.moveTo(k * w / 16, 0); c.lineTo(k * w / 16, h); c.stroke(); c.beginPath(); c.moveTo(0, k * h / 16); c.lineTo(w, k * h / 16); c.stroke(); } }, [2, 4]);
    const sky = new T.Mesh(new T.PlaneGeometry(xb - xs, zb - za), new T.MeshBasicMaterial({ map: skyTex })); sky.rotation.x = Math.PI / 2; sky.position.set((xs + xb) / 2, HW + 0.4, (za + zb) / 2); g.add(sky);
    box(0.4, 0.5, zb - za, steel, xs, HW - 0.3, (za + zb) / 2);
    for (let z = za + 3; z < zb; z += 4) box(xb - xs, 0.18, 0.18, steel, (xs + xb) / 2, HW + 0.25, z);
    // focos: la fila de proyectores colgada de la viga, apuntando a la cancha (siempre encendidos)
    const face = this.floodFace = new T.MeshBasicMaterial({ color: '#fffaf0' });
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'), gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,.5)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
    const glowMat = this.floodGlow = new T.SpriteMaterial({ map: srgb(T, new T.CanvasTexture(gc)), transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    for (let z = 1.5; z < zf; z += 2.6) { const h = new T.Group(); h.position.set(xs - 0.2, HW - 0.75, z); h.rotation.z = 0.5;
      h.add(new T.Mesh(new T.BoxGeometry(0.7, 0.3, 0.5), steel)); const f = new T.Mesh(new T.PlaneGeometry(0.6, 0.4), face); f.rotation.x = Math.PI / 2; f.position.y = -0.16; h.add(f);
      const sp = new T.Sprite(glowMat); sp.scale.set(2, 2, 1); sp.position.y = -0.35; h.add(sp); g.add(h); }
    this._lk = 1;
    // --- el marcador: la pantalla en la pared blanca, a la derecha del frontis
    const sc = this.scoreCanvas = document.createElement('canvas'); sc.width = 512; sc.height = 256;
    const st = this.scoreTex = srgb(T, new T.CanvasTexture(sc));
    const board = new T.Mesh(new T.PlaneGeometry(3.6, 1.8), new T.MeshBasicMaterial({ map: st })); board.position.set(xr + 2.6, 7.6, za + 0.03); g.add(board);
    box(3.9, 2.1, 0.12, steel, xr + 2.6, 7.6, za - 0.03);
    this.setScore('', '', 0, 0);
    // --- fuera, como el de verdad: ladrillo caravista amarillo ocre (llagas claras), pilastras, zócalo, recercados,
    // impostas y cornisa de piedra beige; ventanas recercadas abajo, óculos y una fila de ventanas en arco de ladrillo
    // arriba; torreones con alero y tejado de teja a cuatro aguas; cubierta clara a dos aguas con el hastial liso
    const STONE = '#cdbf9c';
    const brickTex = canvasTex(T, 1024, 512, (c, w, h) => {
      const mW = 12, mH = 6, px = w / mW, py = h / mH, bh = 0.075, bl = 0.25;
      c.fillStyle = '#ddd2b8'; c.fillRect(0, 0, w, h);   // llagas claras
      for (let y = 0, r = 0; y < mH; y += bh, r++) for (let x = r % 2 ? -bl / 2 : 0; x < mW; x += bl) {
        const t = 0.9 + Math.random() * 0.16, warm = Math.random() < 0.18 ? 0.9 : 1;
        c.fillStyle = `rgb(${Math.round(206 * t)},${Math.round(178 * t * warm)},${Math.round(122 * t * warm)})`;
        c.fillRect(x * px + 1, h - (y + bh) * py + 1, bl * px - 2, bh * py - 1.5); }
      weather(c, w, h, 6, 12); });
    brickTex.wrapS = brickTex.wrapT = T.RepeatWrapping; brickTex.repeat.set(4, 2.2); brick.map = brickTex; brick.color.set('#ffffff');
    const stone = M({ color: STONE, roughness: 0.9 }), tile = M({ color: '#b5583e', roughness: 0.8 }), dark = M({ color: '#2a2c2e', roughness: 0.6 });
    const archTex = canvasTex(T, 128, 192, (c, w, h) => {   // ventana en arco con su rosca de ladrillo
      c.clearRect(0, 0, w, h); c.fillStyle = '#b8945e'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, w / 2); c.arc(w / 2, w / 2, w / 2, Math.PI, 0); c.lineTo(w, h); c.fill();
      c.strokeStyle = '#d9cbaa'; c.lineWidth = 2; for (let a = 0; a <= 12; a++) { const t = Math.PI + a / 12 * Math.PI; c.beginPath(); c.moveTo(w / 2 + Math.cos(t) * w * 0.3, w / 2 + Math.sin(t) * w * 0.3); c.lineTo(w / 2 + Math.cos(t) * w / 2, w / 2 + Math.sin(t) * w / 2); c.stroke(); }
      c.fillStyle = '#23272b'; c.beginPath(); c.moveTo(w * 0.2, h); c.lineTo(w * 0.2, w / 2); c.arc(w / 2, w / 2, w * 0.3, Math.PI, 0); c.lineTo(w * 0.8, h); c.fill(); });
    const archM = M({ map: archTex, transparent: true, alphaTest: 0.4, roughness: 0.7 });
    const sn = [], dk = [], ar = [];
    // una fachada: centro (cx, cz), largo, giro (su +z local mira hacia fuera); se reparte en vanos entre pilastras
    const front = (cx, cz, len, ry, skip = 0) => {
      const c = Math.cos(ry), s = Math.sin(ry), P = (u, y, n, b) => ({ ...b, x: cx + c * u + s * n, y, z: cz - s * u + c * n, ry });
      sn.push(P(0, 0.8, 0.12, { w: len + 0.3, h: 1.6, d: 0.3 }), P(0, 9.4, 0.12, { w: len + 0.3, h: 0.28, d: 0.3 }), P(0, HW - 0.25, 0.2, { w: len + 0.9, h: 0.5, d: 0.5 }));
      const n = Math.max(2, Math.round(len / 6)), bw = len / n;
      for (let k = 0; k <= n; k++) sn.push(P(-len / 2 + k * bw, HW / 2, 0.1, { w: 0.7, h: HW, d: 0.24 }));
      for (let k = 0; k < n; k++) { const u = -len / 2 + (k + 0.5) * bw; if (Math.abs(u) < skip) continue;
        for (const [y, ww, hh] of [[2.6, 0.8, 0.7], [5.6, 1.1, 1.5]]) { sn.push(P(u, y, 0.05, { w: ww + 0.36, h: hh + 0.36, d: 0.14 })); dk.push(P(u, y, 0.13, { w: ww, h: hh, d: 0.02 })); }
        sn.push(P(u, 7.9, 0.05, { w: 0.78, h: 0.78, d: 0.12 })); dk.push(P(u, 7.9, 0.12, { w: 0.42, h: 0.42, d: 0.02 }));   // óculo
        for (const du of bw > 4.5 ? [-0.9, 0, 0.9] : [0]) ar.push(P(u + du, 11.2, 0.04, { w: 0.7, h: 1.05, d: 0.02 })); }   // ventanas en arco
    };
    front((xa + xb) / 2, zb + 0.5, xb - xa + 1, 0, 3.5); front((xa + xb) / 2, za - 0.5, xb - xa + 1, Math.PI); front(xb + 0.5, (za + zb) / 2, zb - za + 1, Math.PI / 2); front(xa - 0.5, (za + zb) / 2, zb - za + 1, -Math.PI / 2);
    // torreones: ladrillo con esquinas de piedra, alero ancho y tejado de teja a cuatro aguas; arriba, tres ventanas en arco
    for (const [tx, tz] of [[xb + 1.6, za - 1.6], [xb + 1.6, zb + 1.6], [xa - 1.6, zb + 1.6]]) {
      const TH = HW + 3.6, tw = 5;
      box(tw, TH + D, tw, brick, tx, (TH - D) / 2, tz);
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) sn.push({ w: 0.55, h: TH, d: 0.55, x: tx + dx * (tw / 2 - 0.2), y: TH / 2, z: tz + dz * (tw / 2 - 0.2) });
      sn.push({ w: tw + 0.3, h: 1.6 + D, d: tw + 0.3, x: tx, y: (1.6 - D) / 2, z: tz }, { w: tw + 0.2, h: 0.3, d: tw + 0.2, x: tx, y: TH - 3.2, z: tz }, { w: tw + 1.4, h: 0.35, d: tw + 1.4, x: tx, y: TH + 0.1, z: tz });
      const rf = new T.Mesh(new T.ConeGeometry((tw + 1.3) * 0.71, 1.8, 4), tile); rf.position.set(tx, TH + 1.17, tz); rf.rotation.y = Math.PI / 4; g.add(rf);
      for (const [ry, ox, oz] of [[0, 0, 1], [Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) {
        const c = Math.cos(ry), s = Math.sin(ry);
        for (const du of [-1, 0, 1]) ar.push({ w: 0.75, h: 1.2, d: 0.02, x: tx + ox * (tw / 2 + 0.02) + c * du * 1.05, y: TH - 1.6, z: tz + oz * (tw / 2 + 0.02) - s * du * 1.05, ry });
        sn.push({ w: 1.4, h: 1.8, d: 0.14, x: tx + ox * (tw / 2 + 0.05), y: 6.2, z: tz + oz * (tw / 2 + 0.05), ry }); dk.push({ w: 1.0, h: 1.4, d: 0.02, x: tx + ox * (tw / 2 + 0.13), y: 6.2, z: tz + oz * (tw / 2 + 0.13), ry });
      }
    }
    // frontón triangular de piedra sobre la entrada, como el del lado largo del edificio
    const xcE = (xa + xb) / 2, ped = new T.Shape(); ped.moveTo(-5, 0); ped.lineTo(5, 0); ped.lineTo(0, 2.2); ped.closePath();
    const pm = new T.Mesh(new T.ExtrudeGeometry(ped, { depth: 0.4, bevelEnabled: false }), stone); pm.position.set(xcE, HW + 0.05, zb + 0.4); g.add(pm);
    const xcE2 = (xa + xb) / 2, zm2 = (za + zb) / 2;
    if (inTown) {   // el zócalo de piedra hasta el terreno (el edificio se asienta en lo más alto de su planta) y la escalinata de la puerta
      sn.push({ w: 1.6, h: D + 0.3, d: zb - za + 1.6, x: xa - 0.5, y: (0.3 - D) / 2, z: zm2 }, { w: 1.6, h: D + 0.3, d: zb - za + 1.6, x: xb + 0.5, y: (0.3 - D) / 2, z: zm2 },
        { w: xb - xa + 1.6, h: D + 0.3, d: 1.6, x: xcE2, y: (0.3 - D) / 2, z: za - 0.5 }, { w: xb - xa + 1.6, h: D + 0.3, d: 1.6, x: xcE2, y: (0.3 - D) / 2, z: zb + 0.5 });
      for (let k = 0; k < 4; k++) { const top = 0.3 - (3 - k) * 0.15; sn.push({ w: 9 - k * 0.6, h: D + top, d: 3.2 - k * 0.6, x: xcE2, y: (top - D) / 2, z: zb + 0.66 + (3.2 - k * 0.6) / 2 }); }
    }
    const mk = (list, mat) => { if (!list.length) return; const m = new T.Mesh(boxesGeo(T, list), mat); m.receiveShadow = true; g.add(m); };
    mk(sn, stone); mk(dk, dark); mk(ar, archM);
    // cubierta a dos aguas, clara, de chapa, con el hastial liso en los dos extremos
    { const hw = (xb - xa) / 2 + 0.6, rise = 3.6, a = Math.atan2(rise, hw), sl = Math.hypot(hw, rise), xm = (xa + xb) / 2, zm = (za + zb) / 2, D = zb - za + 1.2;
      const roofM = M({ color: '#dcdedd', roughness: 0.55, metalness: 0.2 });
      mk([{ w: sl, h: 0.16, d: D, x: xm - hw / 2, y: HW + rise / 2, z: zm, rz: a }, { w: sl, h: 0.16, d: D, x: xm + hw / 2, y: HW + rise / 2, z: zm, rz: -a }], roofM);
      const tri = new T.Shape(); tri.moveTo(-hw, 0); tri.lineTo(hw, 0); tri.lineTo(0, rise); tri.closePath();
      for (const z of [za - 0.55, zb + 0.15]) { const t = new T.Mesh(new T.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }), M({ color: '#e6dfcd', roughness: 0.9 })); t.position.set(xm, HW, z); g.add(t); } }
    const xc = (xa + xb) / 2;
    const door = new T.Mesh(new T.PlaneGeometry(3.6, 3.4), dark); door.position.set(xc, 1.7, zb + 0.66); g.add(door);
    const signTex = canvasTex(T, 1024, 256, (c, w, h) => { c.fillStyle = '#d6cbaa'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a89a76'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); paintName(c, 'FRONTÓN LABRIT', w / 2, h * 0.5, w * 0.86, h * 0.48, '#5d5240'); });
    const sign = new T.Mesh(new T.PlaneGeometry(7, 1.5), M({ map: signTex, roughness: 0.8 })); sign.position.set(xc, 4.5, zb + 0.66); g.add(sign);
    if (!inTown) {   // (fuera de la ciudad, en la final: la calle, la muralla, los árboles y las casas alrededor)
    const pave = new T.Mesh(new T.PlaneGeometry(220, 220), M({ color: '#8f8b83', roughness: 0.95 })); pave.rotation.x = -Math.PI / 2; pave.position.set(xc, -0.04, (za + zb) / 2); pave.receiveShadow = true; g.add(pave);
    const wallTex = canvasTex(T, 1024, 256, (c, w, h) => ashlar(c, w, h, 40, 10, '#b9a27e'), [3, 1]);
    const mur = new T.Mesh(new T.BoxGeometry(4, 10, 130), M({ map: wallTex, roughness: 0.95 })); mur.position.set(xa - 24, 5, (za + zb) / 2 + 10); mur.rotation.y = 0.06; g.add(mur);
    const leaf = M({ color: '#4c7a3e', roughness: 0.9 }), trunk = M({ color: '#5d4630', roughness: 0.9 });
    for (let i = 0; i < 6; i++) { const tz = zb + 10 + (i % 3) * 7, tx = i < 3 ? xa - 6 : xb + 4;
      box(0.4, 3, 0.4, trunk, tx, 1.5, tz); const cr = new T.Mesh(new T.IcosahedronGeometry(2.2, 0), leaf); cr.position.set(tx, 4.2, tz); g.add(cr); }
    // --- la ciudad alrededor: el Labrit está en pleno Iruña, entre casas de pisos de cinco y seis alturas con balcones,
    // calles con farolas y, a un lado, la muralla y el baluarte
    { const facade = (base) => canvasTex(T, 512, 512, (c, w, h) => {
        const fl = 6, fh = h / fl, cols = 4, cw = w / cols;
        c.fillStyle = base; c.fillRect(0, 0, w, h); grain(c, w, h, 4000, 0.05);
        c.fillStyle = '#7d7466'; c.fillRect(0, h - fh, w, fh);   // bajo de piedra con los portales y las tiendas
        for (let i = 0; i < cols; i++) { c.fillStyle = i % 2 ? '#2d3236' : '#3b2f27'; c.fillRect(i * cw + cw * 0.18, h - fh * 0.92, cw * 0.64, fh * 0.82); }
        for (let f = 1; f < fl; f++) for (let i = 0; i < cols; i++) {
          const x0 = i * cw + cw * 0.3, y0 = h - (f + 1) * fh + fh * 0.18, ww = cw * 0.4, hh = fh * 0.66;
          c.fillStyle = '#f4f1ea'; c.fillRect(x0 - 3, y0 - 3, ww + 6, hh + 6); c.fillStyle = '#2a3a46'; c.fillRect(x0, y0, ww, hh);
          c.fillStyle = '#4f6d5a'; c.fillRect(x0 - ww * 0.32, y0, ww * 0.28, hh); c.fillRect(x0 + ww * 1.04, y0, ww * 0.28, hh);   // contraventanas
          if (f < fl - 1) { c.strokeStyle = '#1e1e1e'; c.lineWidth = 2; c.strokeRect(x0 - 6, y0 + hh * 0.6, ww + 12, hh * 0.4); for (let k = 0; k <= 6; k++) { c.beginPath(); c.moveTo(x0 - 6 + k * (ww + 12) / 6, y0 + hh * 0.6); c.lineTo(x0 - 6 + k * (ww + 12) / 6, y0 + hh); c.stroke(); } }
        }
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 0, w, fh * 0.12); });
      const looks = ['#dcc39a', '#ece2cf', '#cf9c84', '#d7cdb3'].map(facade), roof = M({ color: '#94493a', roughness: 0.85 });
      const block = (x, z, w, d, k) => { const H = 18, mats = [];
        for (const len of [d, d, w, w]) { const t = looks[k % looks.length].clone(); t.needsUpdate = true; t.wrapS = T.RepeatWrapping; t.repeat.set(len / 12, 1); mats.push(M({ map: t, roughness: 0.9 })); }
        const m = new T.Mesh(new T.BoxGeometry(w, H, d), [mats[0], mats[1], roof, roof, mats[2], mats[3]]); m.position.set(x, H / 2, z); g.add(m);
        const r = new T.Mesh(new T.BoxGeometry(w + 0.6, 0.5, d + 0.6), roof); r.position.set(x, H + 0.25, z); g.add(r); };
      block(-8, za - 26, 30, 20, 0); block(28, za - 26, 30, 20, 1);
      block(xb + 25, 6, 20, 32, 2); block(xb + 25, 44, 20, 34, 3);
      block(-6, zb + 48, 32, 20, 1); block(32, zb + 48, 32, 20, 0);
      const lamp = M({ color: '#2b2e31', roughness: 0.5, metalness: 0.4 }), bulb = new T.MeshBasicMaterial({ color: '#fff3d6' });
      for (const [lx, lz] of [[xb + 7, 4], [xb + 7, 22], [xb + 7, 40], [4, za - 8], [22, za - 8], [xc - 10, zb + 9], [xc + 10, zb + 9]]) {
        box(0.14, 4.6, 0.14, lamp, lx, 2.3, lz); const b = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), bulb); b.position.set(lx, 4.7, lz); g.add(b); }
    }
    }
    this.extent = { x0: xa - 1, x1: xb + 1, z0: za - 1, z1: zb + 1 };
    this.boxes = this.boxes.filter(b => b.d !== L * 0.78);
    this.boxes.push({ x: (xr + xb) / 2, z: (2.2 + zf) / 2, w: xb - xr, d: zf - 2.2 }, { x: (xa + xr) / 2, z: (zf + zb) / 2, w: xr - xa, d: zb - zf });
    this.entry = { x: W / 2 + CONTRA / 2, z: EXT - 1.6 };
    if (inTown) {   // en Iruña: se entra por la puerta (el partido ya te pone en la cancha); los muros cierran el edificio por fuera
      const E = labritExtent(); this.extent = E;
      this.entry = { x: xcE2, z: zb + 0.66 + 3.2 + 1.6 }; this.out = { x: xcE2, z: zb + 40 };
      this.platform = { x0: xa - 1.3, x1: xb + 1.3, z0: za - 1.3, z1: zb + 1.3 };
      this.boxes.push({ x: xa - 0.5, z: zm2, w: 1.6, d: zb - za + 1.6 }, { x: xb + 0.5, z: zm2, w: 1.6, d: zb - za + 1.6 }, { x: xcE2, z: za - 0.5, w: xb - xa + 1.6, d: 1.6 }, { x: xcE2, z: zb + 0.5, w: xb - xa + 1.6, d: 1.6 },
        { x: xcE2, z: zb + 0.66 + 1.6, w: 9, d: 3.2 });
      for (const [tx, tz] of [[xb + 1.6, za - 1.6], [xb + 1.6, zb + 1.6], [xa - 1.6, zb + 1.6]]) this.boxes.push({ x: tx, z: tz, w: 5.4, d: 5.4 });
    }
    this.labrit = true;
    g.traverse(o => { if (o.isMesh) o.castShadow = false; });   // (dentro, bajo la cubierta: sin sombras del sol sobre la cancha)
  }
  // ---------- frontón cubierto (los campeonatos) ----------
  // Como los frontones municipales cubiertos de Navarra: cerrado por todas partes, con el frontis, la pared izquierda y el
  // rebote verdes hasta el techo (la pelota no se sale), la grada a lo largo de la contracancha con sus asientos, la pared
  // derecha con ventanales altos, el techo con sus cerchas y las filas de luces del pabellón, y el nombre del pueblo en
  // grande. Sin anuncios ni escudos de clubes. Dentro no se ve nada de fuera: no hace falta paisaje.
  buildHall(T, M, th, W, CONTRA, EXT, L, opts = {}) {
    const C = COURT, g = this.group, H = HALL_H, xs = W / 2 + CONTRA + 0.2, RD = 0.8, RU = 0.42, xr = xs + HALL_ROWS * RD + 0.5, za = -0.8, zb = EXT + 0.4;
    const box = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
    const wallM = M({ color: th.wall, roughness: 0.9 }), concrete = M({ color: '#8c8794', roughness: 0.95 }), dark = M({ color: '#24202c', roughness: 0.8 });
    const steel = M({ color: '#5d5a66', roughness: 0.5, metalness: 0.45 });
    // el muro alto: la pared izquierda sube hasta el techo con una franja de ventanales arriba (luz de día, sin sol directo)
    const winTex = canvasTex(T, 1024, 256, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 5000, 0.05);
      const n = 12, pw = w / n; for (let i = 0; i < n; i++) { const gr = c.createLinearGradient(0, h * 0.2, 0, h * 0.8); gr.addColorStop(0, '#e9f0ff'); gr.addColorStop(1, '#b9c4e6');
        c.fillStyle = gr; c.fillRect(i * pw + pw * 0.12, h * 0.22, pw * 0.76, h * 0.56); c.fillStyle = 'rgba(40,40,60,.55)'; c.fillRect(i * pw + pw * 0.5 - 2, h * 0.22, 4, h * 0.56); c.fillRect(i * pw + pw * 0.12, h * 0.5 - 2, pw * 0.76, 4); }
    });
    const upH = H - C.LEFT_H - 0.2, upL = new T.Mesh(new T.BoxGeometry(0.6, upH, EXT + 1.2), [M({ map: winTex, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: 0.25 }), wallM, wallM, wallM, wallM, wallM]);
    upL.position.set(-W / 2 - 0.3, C.LEFT_H + 0.2 + upH / 2, EXT / 2); g.add(upL);
    // por encima del frontis, hasta el techo, oscuro (así resalta el marcador); y la pared de delante de la contracancha
    box(xr - (-W / 2 - 0.6), H - C.FRONT_H, 0.6, dark, (xr + (-W / 2 - 0.6)) / 2, C.FRONT_H + (H - C.FRONT_H) / 2, za);
    box(xr - (W / 2 + 0.3), C.FRONT_H, 0.6, wallM, (xr + W / 2 + 0.3) / 2, C.FRONT_H / 2, za);
    // el fondo, detrás de la contracancha y de la grada (el rebote ya llega al techo)
    box(xr - (W / 2 + 0.3), H, 0.6, wallM, (xr + W / 2 + 0.3) / 2, H / 2, zb);
    // la pared derecha, detrás de la grada: el nombre del frontón en grande y ventanales arriba
    const name = (opts.hallName || 'FRONTÓN').toUpperCase(), sub = (opts.hallSub || '').toUpperCase();
    const rTex = canvasTex(T, 2048, 512, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 12000, 0.05); grain(c, w, h, 4000, 0.04, false);
      const n = 14, pw = w / n; for (let i = 0; i < n; i++) { c.fillStyle = '#d8e2fa'; c.fillRect(i * pw + pw * 0.15, h * 0.04, pw * 0.7, h * 0.16); }
      c.fillStyle = '#fbf8f0'; let fs = h * 0.26; c.font = `900 ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`;
      const tw = c.measureText(name).width; if (tw > w * 0.8) { fs *= w * 0.8 / tw; c.font = `900 ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`; }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h * 0.42);
      if (sub) { c.font = `700 ${h * 0.09}px "Lilita One", Nunito, Arial, sans-serif`; c.fillText(sub, w / 2, h * 0.6); }
      c.fillStyle = th.mark; c.fillRect(w * 0.2, h * 0.66, w * 0.6, h * 0.012);
    });
    const rw = new T.Mesh(new T.BoxGeometry(0.6, H, zb - za), [wallM, M({ map: rTex }), wallM, wallM, wallM, wallM]);   // (la cara −x mira a la cancha)
    rw.position.set(xr + 0.3, H / 2, (za + zb) / 2); g.add(rw);
    // el techo: oscuro, con cerchas de acero de lado a lado y filas de luces del pabellón (paneles blancos encendidos)
    box(xr - (-W / 2 - 0.6) + 0.6, 0.3, zb - za + 0.6, dark, (xr + (-W / 2 - 0.6)) / 2, H + 0.15, (za + zb) / 2);
    for (let z = 2; z < zb; z += 4) { box(xr + W / 2 + 0.6, 0.5, 0.18, steel, (xr + (-W / 2 - 0.6)) / 2, H - 0.45, z); }
    box(0.2, 0.6, zb - za, steel, 0, H - 0.75, (za + zb) / 2); box(0.2, 0.6, zb - za, steel, xs - 0.5, H - 0.75, (za + zb) / 2);
    const lampM = new T.MeshBasicMaterial({ color: '#fbfaff', toneMapped: false }), lampG = new T.BoxGeometry(1.5, 0.12, 0.7);
    const lamps = []; for (const x of [-W / 4, W / 4, xs + 1.6]) for (let z = 2.8; z < EXT - 0.5; z += 4) lamps.push([x, z]);
    const LI = new T.InstancedMesh(lampG, lampM, lamps.length), m4 = new T.Matrix4();
    lamps.forEach(([x, z], i) => LI.setMatrixAt(i, m4.makeTranslation(x, H - 1.1, z))); LI.name = 'luces-pabellon'; g.add(LI);
    // la grada: escalones de hormigón a lo largo de la contracancha, con su barandilla y los asientos (una sola llamada)
    const z0 = 1.6, z1 = EXT - 1.6, len = z1 - z0;
    for (let i = 0; i < HALL_ROWS; i++) { const top = 0.5 + i * RU; box(RD, top, len, concrete, xs + i * RD + RD / 2, top / 2, (z0 + z1) / 2); }
    box(0.08, 1.05, len, steel, xs - 0.04, 0.52, (z0 + z1) / 2);   // (el murete con la barandilla delante de la grada)
    // (cada asiento: el respaldo detrás y el asiento a 0,45 m del escalón; dos piezas, cada una una sola llamada)
    const seatG = new T.BoxGeometry(0.4, 0.08, 0.44).translate(0, 0.41, 0), backG = new T.BoxGeometry(0.06, 0.44, 0.44).translate(0.2, 0.62, 0), legG = new T.BoxGeometry(0.08, 0.37, 0.3).translate(0.08, 0.185, 0);
    const seats = []; this.standSpots = [];
    for (let i = 0; i < HALL_ROWS; i++) for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.52) {
      if (Math.abs(z - (z0 + len / 3)) < 0.5 || Math.abs(z - (z0 + 2 * len / 3)) < 0.5) continue;   // (dos pasillos para subir)
      const x = xs + i * RD + 0.42, y = 0.5 + i * RU; seats.push([x, y, z]); this.standSpots.push([x, y + 0.45, z, -Math.PI / 2]);   // (la altura del asiento)
    }
    const seatM = M({ color: '#ffffff', roughness: 0.6 }), col = new T.Color();
    for (const [geo, nm] of [[seatG, 'asientos'], [backG, 'respaldos'], [legG, 'patas']]) {
      const SI = new T.InstancedMesh(geo, nm === 'patas' ? steel : seatM, seats.length);
      seats.forEach(([x, y, z], i) => { SI.setMatrixAt(i, m4.makeTranslation(x, y, z)); if (nm !== 'patas') SI.setColorAt(i, col.set(i % 11 === 0 ? '#8e6ae8' : '#5b34c4')); });
      SI.receiveShadow = true; SI.name = nm; g.add(SI);
    }
    this.seated = true;   // (el público, sentado en sus asientos)
    this.extent = { x0: -W / 2 - 0.9, x1: xr + 0.9, z0: za - 0.6, z1: zb + 0.6 };
    this.platform = { x0: -W / 2 - 0.6, x1: xs, z0: za, z1: zb };   // (se anda por la cancha y la contracancha; la grada, no)
    this.boxes = this.boxes.filter(b => b.d !== L * 0.78);
    this.boxes.push({ x: (xs + xr) / 2, z: (z0 + z1) / 2, w: xr - xs, d: len }, { x: (xr + W / 2 + 0.3) / 2, z: za, w: xr - W / 2 - 0.3, d: 0.6 }, { x: (xr + W / 2 + 0.3) / 2, z: zb, w: xr - W / 2 - 0.3, d: 0.6 });
    this.entry = { x: W / 2 + CONTRA / 2, z: EXT - 1.2 };
    this.hall = true;
    g.traverse(o => { if (o.isMesh) o.castShadow = false; });   // (bajo techo, con la luz del pabellón: sin sombras que crucen la cancha)
  }
  /** El marcador del Labrit: los dos nombres con su color y los tantos. */
  setScore(you, rival, a, b) {
    // (la pantalla de la pared derecha, solo en el Labrit; el grande del frontis, en todos)
    const c = this.scoreCanvas?.getContext('2d');
    if (c) {
    c.fillStyle = '#101418'; c.fillRect(0, 0, 512, 256);
    const row = (y, name, n, col) => { c.fillStyle = col; c.fillRect(14, y, 18, 92); c.fillStyle = '#f2f2ea'; c.font = '900 50px "Lilita One", Nunito, Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      let t = String(name || '').toUpperCase(); while (t.length > 3 && c.measureText(t).width > 340) t = t.slice(0, -1); c.fillText(t, 46, y + 48);
      c.fillStyle = '#ffd23c'; c.font = '900 76px "Lilita One", Nunito, Arial, sans-serif'; c.textAlign = 'right'; c.fillText(String(n), 496, y + 50); };
    row(22, you, a, '#2f6fd0'); row(138, rival, b, '#d03a2f');
    this.scoreTex.needsUpdate = true;
    }
    // y el grande del frontis: azules a la izquierda y colorados a la derecha, con los tantos en el centro
    const d = this.bigCanvas?.getContext('2d'); if (!d) return;
    const W2 = 1024, H2 = 192, half = (x0, col, name, n, right) => {
      d.fillStyle = col; d.fillRect(x0, 12, W2 / 2 - 18, H2 - 24);
      d.fillStyle = '#ffffff'; d.font = '400 72px "MZ Display", "Lilita One", Nunito, Arial, sans-serif'; d.textBaseline = 'middle';
      let t = String(name || '').toUpperCase(); while (t.length > 3 && d.measureText(t).width > 300) t = t.slice(0, -1);
      d.textAlign = right ? 'right' : 'left'; d.fillText(t, right ? x0 + W2 / 2 - 48 : x0 + 30, H2 / 2 + 4);
      d.fillStyle = '#ffffff'; d.font = '400 140px "MZ Display", "Lilita One", Nunito, Arial, sans-serif'; d.textAlign = 'center';
      d.fillText(String(n), right ? x0 + 70 : x0 + W2 / 2 - 88, H2 / 2 + 8);
    };
    d.fillStyle = '#0b0618'; d.fillRect(0, 0, W2, H2);
    half(6, '#4b3cff', you, a, false); half(W2 / 2 + 12, '#e8247c', rival, b, true);
    d.strokeStyle = '#ff2bd6'; d.lineWidth = 6; d.strokeRect(3, 3, W2 - 6, H2 - 6);
    this.bigTex.needsUpdate = true;
  }
  // focos: proyectores sobre la pared izquierda y en torres junto a la grada (con cubierta, colgados de ella). De día
  // son hierro gris; de noche (setLights) la cara se enciende blanca con su halo. La luz de la cancha la ponen el cielo
  // y el juego (sin luces nuevas: en el móvil rehacen todos los sombreadores)
  buildFloods(T, M, roof, W, CONTRA, EXT) {
    const C = COURT, housing = M({ color: '#3a3f44', roughness: 0.5, metalness: 0.4 }), pole = M({ color: '#6b7176', roughness: 0.6, metalness: 0.3 });
    const face = this.floodFace = new T.MeshBasicMaterial({ color: '#8a8d90' });
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'), gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,.55)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
    const glowMat = this.floodGlow = new T.SpriteMaterial({ map: srgb(T, new T.CanvasTexture(gc)), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    const g = new T.Group(); g.name = 'focos'; this.group.add(g); this.floods = g;
    const head = (x, y, z, rx, rz) => {
      const h = new T.Group(); h.position.set(x, y, z); h.rotation.set(rx, 0, rz);
      const box = new T.Mesh(new T.BoxGeometry(1.3, 0.28, 0.6), housing); h.add(box);
      const f = new T.Mesh(new T.PlaneGeometry(1.15, 0.48), face); f.rotation.x = Math.PI / 2; f.position.y = -0.145; h.add(f);
      const s = new T.Sprite(glowMat); s.scale.set(3.4, 3.4, 1); s.position.y = -0.4; h.add(s);
      g.add(h);
    };
    const zs = [4, 12, 20, 28].filter(z => z < EXT);
    if (roof) {
      const y = C.FRONT_H + 0.6;
      for (const z of zs) { head(-W / 2 + 1.2, y, z, 0, 0.35); head(W / 2 + CONTRA * 0.5, y, z, 0, -0.35); }
    } else {
      // brazos sobre la pared izquierda, inclinados hacia la cancha
      for (const z of zs) {
        const arm = new T.Mesh(new T.BoxGeometry(1.6, 0.12, 0.12), pole); arm.position.set(-W / 2 + 0.5, C.LEFT_H + 0.9, z); g.add(arm);
        const up = new T.Mesh(new T.BoxGeometry(0.12, 1.0, 0.12), pole); up.position.set(-W / 2 - 0.25, C.LEFT_H + 0.45, z); g.add(up);
        head(-W / 2 + 1.25, C.LEFT_H + 0.75, z, 0, 0.45);
      }
      // torres detrás de la grada
      const px = W / 2 + CONTRA + 3.6, ph = 11.5;
      for (const z of [6, 17, 28].filter(z => z < EXT)) {
        const m = new T.Mesh(new T.CylinderGeometry(0.11, 0.16, ph, 8), pole); m.position.set(px, ph / 2, z); g.add(m);
        head(px - 0.4, ph, z, 0, -0.55);
      }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = false; });
  }
  /** Enciende los focos (k de 0 a 1: de noche, 1). */
  setLights(k) {
    if (!this.floodFace || this._lk === k) return; this._lk = k;
    this.floodFace.color.set('#8a8d90').lerp(new this.THREE.Color('#fffaf0'), k); this.floodGlow.opacity = 0.9 * k;
  }
  // cubierta: 'wood', pórticos de madera laminada atirantados con acero (como los frontones nuevos de la Cuenca y de la
  // montaña); 'metal', cerchas de acero con chapa y una franja translúcida junto a la cumbrera (como Labrit). A dos
  // aguas por encima del frontis; los pilares de la derecha, detrás de las gradas; los de la izquierda, sobre la pared.
  // Todo junto en pocas mallas (unas cinco llamadas de dibujo) y sin sombras, para que la cancha se vea clara.
  buildRoof(T, M, th, xa, xb, za, zb) {
    const C = COURT, wood = th.roof === 'wood', H0 = C.FRONT_H + 1.3, xm = (xa + xb) / 2, H1 = H0 + 1.7;
    const ang = Math.atan2(H1 - H0, xm - xa), run = Math.hypot(xm - xa, H1 - H0), ca = Math.cos(ang), sa = Math.sin(ang);
    const frame = [], steel = [], top = [], under = [], clear = [];
    const nP = 6, zs = Array.from({ length: nP }, (_, k) => za + 0.5 + k * (zb - za - 1) / (nP - 1));
    const depth = wood ? 0.75 : 0.9, sec = wood ? 0.24 : 0.16;
    for (const z of zs) {
      // pilar de la derecha (desde el suelo) y el de la izquierda (desde lo alto de la pared o del frontis)
      frame.push({ w: wood ? 0.34 : 0.26, h: H0, d: wood ? 0.34 : 0.26, x: xb - 0.25, y: H0 / 2, z });
      const yl = z < 0.2 ? C.FRONT_H : C.LEFT_H; frame.push({ w: 0.3, h: H0 - yl, d: 0.3, x: xa + 0.3, y: (H0 + yl) / 2, z });
      for (const s of [-1, 1]) {
        // los dos faldones del pórtico (vigas inclinadas); en metal, cordón de arriba y de abajo con montantes
        const cx = s < 0 ? (xa + xm) / 2 : (xm + xb) / 2, a = s < 0 ? ang : -ang;
        frame.push({ w: run + 0.2, h: wood ? depth : 0.2, d: sec, x: cx, y: (H0 + H1) / 2 - (wood ? depth / 2 : 0.1), z, rz: a });
        if (!wood) for (let k = 1; k < 6; k++) { const t = k / 6, x = s < 0 ? xa + (xm - xa) * t : xm + (xb - xm) * t, yt = H0 + (H1 - H0) * (s < 0 ? t : 1 - t);
          frame.push({ w: 0.08, h: yt - H0 + 0.1, d: 0.08, x, y: (yt + H0) / 2 - 0.1, z });
          frame.push({ w: Math.hypot((xm - xa) / 6, yt - H0), h: 0.07, d: 0.07, x: x - s * (xm - xa) / 12, y: (yt + H0) / 2 - 0.1, z, rz: s * Math.atan2(yt - H0, (xm - xa) / 6) }); }
      }
      // tirante de acero de lado a lado y la péndola del centro (en metal, el cordón de abajo)
      steel.push({ w: xb - xa - 0.6, h: wood ? 0.05 : 0.16, d: wood ? 0.05 : 0.12, x: xm, y: H0 - (wood ? 0.35 : 0.1), z });
      if (wood) steel.push({ w: 0.04, h: H1 - H0 - 0.4, d: 0.04, x: xm, y: (H0 + H1) / 2 - 0.55, z });
    }
    // correas a lo largo, sobre las vigas
    for (const s of [-1, 1]) for (let k = 0; k <= 4; k++) {
      const t = (k + 0.3) / 5, x = s < 0 ? xa + (xm - xa) * t : xb - (xb - xm) * t, y = H0 + (H1 - H0) * t;
      frame.push({ w: wood ? 0.14 : 0.1, h: wood ? 0.2 : 0.14, d: zb - za, x, y: y + 0.08, z: (za + zb) / 2 });
    }
    // tabicas: el canto de la cubierta en los aleros y en los dos hastiales (así se lee su grosor de lejos)
    for (const s of [-1, 1]) {
      frame.push({ w: 0.12, h: 0.5, d: zb - za + 0.4, x: s < 0 ? xa - 0.38 : xb + 0.38, y: H0 + 0.1, z: (za + zb) / 2 });
      for (const zz of [za - 0.2, zb + 0.2]) frame.push({ w: run + 0.45, h: 0.5, d: 0.12, x: s < 0 ? (xa + xm) / 2 - 0.15 : (xm + xb) / 2 + 0.15, y: (H0 + H1) / 2 + 0.2, z: zz, rz: s < 0 ? ang : -ang });
    }
    // faldones: por fuera la cubierta; por dentro, tablas de madera o la chapa clara; en metal, franja translúcida arriba
    const band = wood ? 0 : 1.3, D = zb - za + 0.4, zc = (za + zb) / 2;
    for (const s of [-1, 1]) {
      // punto a t metros del alero subiendo por el faldón (encima de vigas y correas)
      const at = (t) => [s < 0 ? xa + t * ca : xb - t * ca, H0 + t * sa + 0.24], a = s < 0 ? ang : -ang;
      const t0 = -0.35, t1 = run - band, [ox, oy] = at((t0 + t1) / 2);
      top.push({ plane: true, w: t1 - t0, d: D, x: ox, y: oy + 0.04, z: zc, rz: a, up: true });
      under.push({ plane: true, w: t1 - t0, d: D, x: ox, y: oy, z: zc, rz: a, up: false });
      if (band) { const [bx, by] = at(run - band / 2); clear.push({ plane: true, w: band, d: D, x: bx, y: by + 0.02, z: zc, rz: a, up: true }); }
    }
    const wTex = wood ? canvasTex(T, 256, 256, (c, w, h) => {   // tablas machihembradas, cada una con su veta
      for (let i = 0; i < 8; i++) { c.fillStyle = tone(rgb('#c8965e'), 0.88 + Math.random() * 0.2); c.fillRect(0, i * h / 8, w, h / 8 - 2); }
      c.fillStyle = 'rgba(90,55,25,.5)'; for (let i = 0; i < 8; i++) c.fillRect(0, i * h / 8 - 2, w, 2);
      grain(c, w, h, 1500, 0.05); }, [6, 30]) : canvasTex(T, 256, 64, (c, w, h) => {   // chapa grecada
      for (let x = 0; x < w; x += 16) { const gr = c.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#6f787e'); gr.addColorStop(0.5, '#9aa3a8'); gr.addColorStop(1, '#646d73'); c.fillStyle = gr; c.fillRect(x, 0, 16, h); } }, [1, 20]);
    const mk = (list, mat, name) => { if (!list.length) return; const m = new T.Mesh(boxesGeo(T, list), mat); m.name = name; m.castShadow = m.receiveShadow = false; this.group.add(m); };
    mk(frame, M({ color: wood ? '#b98a55' : (th.steel || '#5b6670'), roughness: wood ? 0.7 : 0.5, metalness: wood ? 0 : 0.35, emissive: wood ? '#2a1a0c' : '#111518' }), 'cubierta-estructura');
    mk(steel, M({ color: '#3d4247', roughness: 0.45, metalness: 0.5 }), 'cubierta-tirantes');
    mk(top, M({ color: th.roofTop || (wood ? '#5d6166' : '#a2a8ab'), roughness: 0.75, metalness: wood ? 0.1 : 0.3 }), 'cubierta');
    mk(under, M({ map: wTex, roughness: 0.85, emissive: wood ? '#3a2612' : '#262b2e' }), 'cubierta-techo');
    if (clear.length) { const m = M({ color: '#e9f1f2', roughness: 0.3, transparent: true, opacity: 0.72, depthWrite: false, side: T.DoubleSide, emissive: '#8a9a9e' }); mk(clear, m, 'cubierta-translucida'); }
    // pilares de la derecha: también chocan (los de dentro de las gradas ya están en su caja)
    for (const z of zs) this.boxes.push({ x: xb - 0.25, z, w: 0.4, d: 0.4 });
    this.postZ = zs;   // (el público no se sienta en la fila de arriba delante de un pilar)
  }
  /** El rebote, a través (on) cuando la cámara queda detrás de él; se funde poco a poco. */
  reboteSeeThrough(on, dt = 1 / 60) {
    const want = on ? 0.16 : 1, f = this.rebFade += (want - this.rebFade) * Math.min(1, dt * 8);
    for (const m of this.rebMats || []) { m.opacity = f; m.depthWrite = f > 0.98; }
  }
  hideBall() { this.ball.visible = false; this.shadow.visible = false; for (const m of this.trail) m.visible = false; this.trailPts = []; }
  showBall(p, glow = 0, t = 0) {
    const b = this.ball; b.visible = this.shadow.visible = true;
    b.position.set(p.x, p.y, p.z); b.rotation.x += 0.25; b.rotation.y += 0.1;
    this.ballMat.emissive.setRGB(glow * 0.9, glow * 0.75, glow * 0.2);
    this.shadow.position.set(p.x, 0.012, p.z);
    const s = Math.max(0.5, 1.4 - p.y * 0.12); this.shadow.scale.setScalar(s); this.shadow.material.opacity = Math.max(0.1, 0.34 - p.y * 0.025);
    this.trailPts.unshift({ x: p.x, y: p.y, z: p.z }); if (this.trailPts.length > 20) this.trailPts.pop();
    this.trail.forEach((m, i) => { const q = this.trailPts[(i + 1) * 2]; m.visible = !!q; if (q) m.position.set(q.x, q.y, q.z); });
  }
  pop(p, normal = 'z') {
    const f = this.flash; f.visible = true; f.position.set(p.x, Math.max(0.03, p.y), p.z + (normal === 'z' ? 0.06 : 0));
    f.rotation.set(normal === 'y' ? -Math.PI / 2 : 0, normal === 'x' ? Math.PI / 2 : 0, 0);
    f.material.opacity = 0.9; f.scale.setScalar(0.6); this.flashT = 0.35;
  }
  tick(dt) {
    if (this.flashT > 0) { this.flashT -= dt; const k = 1 - this.flashT / 0.35; this.flash.scale.setScalar(0.6 + k * 2.2); this.flash.material.opacity = 0.9 * (1 - k); if (this.flashT <= 0) this.flash.visible = false; }
    if (this.chapaT > 0) { this.chapaT -= dt; this.chapa.material.emissive.setRGB(this.chapaT * 1.6, 0.1 * this.chapaT, 0.1 * this.chapaT); }
  }
  dispose() {
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.materials) { if (m.map) m.map.dispose(); m.dispose(); }
  }
}
