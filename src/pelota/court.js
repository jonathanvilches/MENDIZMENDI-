// Frontón en 3D (compatible con three.js r128 y posteriores: THREE se recibe como parámetro).
// Origen del grupo: suelo, centro del frontis. La cancha crece hacia +z; la pared izquierda en x = −W/2.
import { COURT } from './rules.js';

function srgb(THREE, tex) {
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  return tex;
}
function canvasTex(THREE, w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = srgb(THREE, new THREE.CanvasTexture(c));
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

export const THEMES = {
  plaza: { frontis: '#6f9c8a', wall: '#7aa595', floor: '#8b948f', contra: '#b7ad98', line: '#ffffff', mark: '#e0392f', stands: '#c9b89a' },
};

export class PelotaCourt {
  constructor(THREE, opts = {}) {
    const T = THREE, C = COURT, th = THEMES[opts.theme] || THEMES.plaza;
    this.THREE = T;
    const g = this.group = new T.Group(); g.name = 'Fronton';
    const W = C.W, L = C.L, EXT = L + 3, CONTRA = 2.6;
    const std = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.88, metalness: 0 }, o));
    this.materials = [];
    const M = (o) => { const m = std(o); this.materials.push(m); return m; };

    // --- suelo: cancha, cuadros, rayas de falta y pasa, contracancha
    const PX = 44;   // píxeles por metro
    const fw = W + CONTRA, fl = EXT;
    const floorTex = canvasTex(T, 512, 2048, (c, w, h) => {
      const sx = w / fw, sz = h / fl, X = (x) => (x + W / 2) * sx, Z = (z) => z * sz;
      c.fillStyle = th.floor; c.fillRect(0, 0, X(W / 2), h);
      c.fillStyle = th.contra; c.fillRect(X(W / 2), 0, w - X(W / 2), h);
      grain(c, w, h, 9000, 0.07); grain(c, w, h, 3000, 0.05, false);
      c.strokeStyle = th.line; c.lineWidth = 5;
      for (let k = 1; k * C.CUADRO <= L + 0.01; k++) {
        const z = Z(k * C.CUADRO);
        c.beginPath(); c.moveTo(0, z); c.lineTo(X(W / 2), z); c.stroke();
        c.fillStyle = th.line; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.save(); c.translate(X(-W / 2) + 34, z - 30); c.fillText(String(k), 0, 0); c.restore();
      }
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
      c.fillStyle = th.frontis; c.fillRect(0, 0, w, h); grain(c, w, h, 16000, 0.06); grain(c, w, h, 5000, 0.05, false);
      weather(c, w, h, C.FRONT_H, W + 0.6);
      const Y = (y) => h - y / C.FRONT_H * h;
      // nombre del pueblo en lo alto del frontis, como en los frontones de verdad
      paintName(c, title, w / 2, Y(7.7), w * 0.86, h * 0.1);
      c.fillStyle = th.mark; c.fillRect(0, Y(C.FRONT_TOP) - 12, w, 24);            // raya superior
      c.strokeStyle = th.line; c.lineWidth = 12; c.beginPath(); c.moveTo(w - 6, 0); c.lineTo(w - 6, h); c.stroke(); // raya lateral derecha
    });
    // trasera del frontis (da a la calle): el nombre y «FRONTÓN» sobre la pared
    const backTex = canvasTex(T, 1024, 1024, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 16000, 0.06); grain(c, w, h, 5000, 0.05, false);
      weather(c, w, h, C.FRONT_H, W + 0.6);
      paintName(c, title ? 'FRONTÓN' : '', w / 2, h * 0.3, w * 0.5, h * 0.06, '#fdfaf2');
      paintName(c, title, w / 2, h * 0.42, w * 0.84, h * 0.11, '#fdfaf2');
    });
    const front = new T.Mesh(new T.BoxGeometry(W + 0.6, C.FRONT_H, 0.8), [M({ color: th.frontis }), M({ color: th.frontis }), M({ color: th.frontis }), M({ color: th.frontis }), M({ map: frontTex }), M({ map: backTex })]);
    front.position.set(-0.3, C.FRONT_H / 2, -0.4); front.castShadow = true; front.receiveShadow = true; g.add(front);
    // albardilla de piedra que remata el frontis y la pared izquierda
    const capMat = M({ color: '#ddd6c6', roughness: 0.8 });
    const cap = new T.Mesh(new T.BoxGeometry(W + 0.9, 0.24, 1.05), capMat); cap.position.set(-0.3, C.FRONT_H + 0.12, -0.4); cap.castShadow = true; g.add(cap);
    const capL = new T.Mesh(new T.BoxGeometry(0.85, 0.2, EXT + 0.2), capMat); capL.position.set(-W / 2 - 0.3, C.LEFT_H + 0.1, EXT / 2 - 0.1); capL.castShadow = true; g.add(capL);
    const chapa = this.chapa = new T.Mesh(new T.BoxGeometry(W, C.CHAPA, 0.05), M({ color: '#c9d0d4', metalness: 0.3, roughness: 0.4, emissive: '#000000' }));
    chapa.position.set(0, C.CHAPA / 2, 0.025); chapa.receiveShadow = true; g.add(chapa);
    const chapaLine = new T.Mesh(new T.BoxGeometry(W, 0.08, 0.07), M({ color: th.mark, roughness: 0.6 }));
    chapaLine.position.set(0, C.CHAPA, 0.035); g.add(chapaLine);

    // --- pared izquierda con los números de los cuadros
    const leftTex = canvasTex(T, 2048, 512, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 12000, 0.06); grain(c, w, h, 3000, 0.05, false);
      weather(c, w, h, C.LEFT_H, EXT);
      const X = (z) => w - z / EXT * w, Y = (y) => h - y / C.LEFT_H * h;   // vista desde la cancha: el frontis queda a la derecha
      c.fillStyle = th.mark; c.fillRect(0, Y(C.LEFT_H - 0.5) - 6, w, 12);
      c.strokeStyle = th.line; c.lineWidth = 5; c.fillStyle = th.line; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let k = 1; k * C.CUADRO <= L + 0.01; k++) {
        const x = X(k * C.CUADRO);
        c.beginPath(); c.moveTo(x, h); c.lineTo(x, Y(1.4)); c.stroke();
        c.fillText(String(k), X((k - 0.5) * C.CUADRO), Y(0.8));
      }
    });
    const left = new T.Mesh(new T.BoxGeometry(0.6, C.LEFT_H, EXT), [M({ map: leftTex }), M({ color: th.wall }), M({ color: th.wall }), M({ color: th.wall }), M({ color: th.wall }), M({ color: th.wall })]);
    // la cara +x (hacia la cancha) lleva la textura; en BoxGeometry su u va de +z a −z
    left.position.set(-W / 2 - 0.3, C.LEFT_H / 2, EXT / 2); left.castShadow = true; left.receiveShadow = true; g.add(left);

    // --- muro bajo del fondo y gradas de la contracancha
    // muro bajo del fondo: solo detrás de la cancha, para poder entrar por la contracancha
    const back = new T.Mesh(new T.BoxGeometry(W + 0.6, 2.2, 0.4), M({ color: th.wall }));
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
