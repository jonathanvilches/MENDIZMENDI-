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
    e.set(b.plane ? (b.up ? -Math.PI / 2 : Math.PI / 2) : 0, 0, b.rz || 0, 'ZYX'); q.setFromEuler(e); m.compose(v.set(b.x, b.y, b.z), q, one);
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

export class PelotaCourt {
  constructor(THREE, opts = {}) {
    const T = THREE, C = COURT, th = Object.assign({}, THEMES[opts.theme] || THEMES.plaza, opts.look || {});
    this.THREE = T; TEX_K = opts.texScale || 1;
    const g = this.group = new T.Group(); g.name = 'Fronton';
    const W = C.W, L = C.L, EXT = L + 3, CONTRA = 2.6;
    const std = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.88, metalness: 0 }, o));
    this.materials = [];
    const M = (o) => { const m = std(o); this.materials.push(m); return m; };

    // --- suelo: cancha, rayas de los cuadros (sin números: esos van en la pared izquierda), falta y pasa, contracancha
    const fw = W + CONTRA, fl = EXT;
    const floorTex = canvasTex(T, 512, 2048, (c, w, h) => {
      const sx = w / fw, sz = h / fl, X = (x) => (x + W / 2) * sx, Z = (z) => z * sz;
      c.fillStyle = th.floor; c.fillRect(0, 0, X(W / 2), h);
      c.fillStyle = th.contra; c.fillRect(X(W / 2), 0, w - X(W / 2), h);
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
      paintName(c, title, w / 2, Y(7.7), w * 0.86, h * 0.1);
      c.fillStyle = th.mark; c.fillRect(0, Y(C.FRONT_TOP) - 12, w, 24);            // raya superior
      c.strokeStyle = th.line; c.lineWidth = 12; c.beginPath(); c.moveTo(w - 6, 0); c.lineTo(w - 6, h); c.stroke(); // raya lateral derecha
    });
    // trasera del frontis (da a la calle): el nombre y «FRONTÓN» sobre la pared
    const backTex = canvasTex(T, 1024, 1024, (c, w, h) => {
      if (th.stone) ashlar(c, w, h, W + 0.6, C.FRONT_H, th.stone);
      else if (th.brick) bricks(c, w, h, W + 0.6, C.FRONT_H, '#a85c3e');
      else { c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 16000, 0.06); grain(c, w, h, 5000, 0.05, false); }
      weather(c, w, h, C.FRONT_H, W + 0.6);
      paintName(c, title ? 'FRONTÓN' : '', w / 2, h * 0.3, w * 0.5, h * 0.06, '#fdfaf2');
      paintName(c, title, w / 2, h * 0.42, w * 0.84, h * 0.11, '#fdfaf2');
    });
    const frontEnd = canvasTex(T, 256, 1024, (c, w, h) => { if (th.stone) ashlar(c, w, h, 0.8, C.FRONT_H, th.stone); else { c.fillStyle = th.frontis; c.fillRect(0, 0, w, h); grain(c, w, h, 6000, 0.06); grain(c, w, h, 2000, 0.05, false); } weather(c, w, h, C.FRONT_H, 0.8); });
    const front = new T.Mesh(new T.BoxGeometry(W + 0.6, C.FRONT_H, 0.8), [M({ map: frontEnd }), M({ map: frontEnd }), M({ color: th.stone || th.frontis }), M({ color: th.stone || th.frontis }), M({ map: frontTex }), M({ map: backTex })]);
    front.position.set(-0.3, C.FRONT_H / 2, -0.4); front.castShadow = true; front.receiveShadow = true; g.add(front);
    // albardilla de piedra que remata el frontis y la pared izquierda
    const capMat = M({ color: th.cap, roughness: 0.8 });
    const cap = new T.Mesh(new T.BoxGeometry(W + 0.9, 0.24, 1.05), capMat); cap.position.set(-0.3, C.FRONT_H + 0.12, -0.4); cap.castShadow = true; g.add(cap);
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
    // nombre y escudo del pueblo pintados en lo alto de la pared izquierda, hacia el fondo de la cancha
    if (opts.wallName || opts.shield) {
      const DW = 11, DH = 2.75, dz = C.CUADRO * 6.9, dy = C.LEFT_H - 0.5 - 0.35 - DH / 2;
      const nameTex = canvasTex(T, 1536, 384, (c, w, h) => {
        let tx = w * 0.04;
        if (opts.shield) { opts.shield(c, h * 0.44, h * 0.03, h * 0.94); tx = h * 0.95; }
        c.textAlign = 'left'; c.textBaseline = 'middle';
        const fit = (text, y, size, weight) => {
          let fs = size; c.font = `${weight} ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`;
          const tw = c.measureText(text).width, max = w - tx - w * 0.03; if (tw > max) { fs *= max / tw; c.font = `${weight} ${fs}px "Lilita One", Nunito, "Arial Black", sans-serif`; }
          c.fillStyle = 'rgba(0,0,0,.22)'; c.fillText(text, tx + fs * 0.04, y + fs * 0.05);
          c.fillStyle = '#fbf8f0'; c.fillText(text, tx, y);
        };
        if (opts.wallName) fit(opts.wallName, h * 0.4, h * 0.36, '900');
        if (opts.wallSub) fit(opts.wallSub, h * 0.76, h * 0.17, '700');
        // pintura algo gastada, como las marcas de los cuadros
        c.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`; c.fillRect(tx + Math.random() * (w - tx), Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); }
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

    // --- muro bajo del fondo y gradas de la contracancha
    // muro bajo del fondo: solo detrás de la cancha, para poder entrar por la contracancha
    const back = new T.Mesh(new T.BoxGeometry(W + 0.6, 2.2, 0.4), outer());
    back.position.set(-0.3, 1.1, EXT + 0.2); back.castShadow = true; back.receiveShadow = true; g.add(back);
    for (let i = 0; i < 3; i++) {
      const st = new T.Mesh(new T.BoxGeometry(1.1, 0.42 * (i + 1), L * 0.78), M({ color: th.stands, roughness: 0.9 }));
      st.position.set(W / 2 + CONTRA + 0.55 + i * 1.1, 0.21 * (i + 1), L * 0.52); st.castShadow = true; st.receiveShadow = true; g.add(st);
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
    if (th.roof) this.buildRoof(T, M, th, -W / 2 - 0.6, W / 2 + CONTRA + 3.3, -0.9, EXT + 0.5);

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
    this.landRing = ring(0.28, 0.42, '#ffb03a', 0.9);
    this.spotRing = ring(0.55, 0.78, '#39d86b', 0.85);
    const zone = this.serveZone = new T.Mesh(new T.PlaneGeometry(W, C.PASA - C.FALTA), new T.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.26, depthWrite: false }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.015, (C.FALTA + C.PASA) / 2); zone.visible = false; g.add(zone);
    const flash = this.flash = new T.Mesh(new T.RingGeometry(0.1, 0.35, 28), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
    flash.visible = false; g.add(flash);
    this.hideBall();
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
