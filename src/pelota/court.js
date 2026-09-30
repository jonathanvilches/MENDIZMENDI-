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
    const frontTex = canvasTex(T, 512, 512, (c, w, h) => {
      c.fillStyle = th.frontis; c.fillRect(0, 0, w, h); grain(c, w, h, 5000, 0.06); grain(c, w, h, 1500, 0.05, false);
      const Y = (y) => h - y / C.FRONT_H * h;
      c.fillStyle = th.mark; c.fillRect(0, Y(C.FRONT_TOP) - 7, w, 14);            // raya superior
      c.strokeStyle = th.line; c.lineWidth = 6; c.beginPath(); c.moveTo(w - 3, 0); c.lineTo(w - 3, h); c.stroke(); // raya lateral derecha
    });
    const front = new T.Mesh(new T.BoxGeometry(W + 0.6, C.FRONT_H, 0.8), [M({ color: th.frontis }), M({ color: th.frontis }), M({ color: th.frontis }), M({ color: th.frontis }), M({ map: frontTex }), M({ color: th.frontis })]);
    front.position.set(-0.3, C.FRONT_H / 2, -0.4); front.castShadow = true; front.receiveShadow = true; g.add(front);
    const chapa = this.chapa = new T.Mesh(new T.BoxGeometry(W, C.CHAPA, 0.05), M({ color: '#c9d0d4', metalness: 0.3, roughness: 0.4, emissive: '#000000' }));
    chapa.position.set(0, C.CHAPA / 2, 0.025); chapa.receiveShadow = true; g.add(chapa);
    const chapaLine = new T.Mesh(new T.BoxGeometry(W, 0.08, 0.07), M({ color: th.mark, roughness: 0.6 }));
    chapaLine.position.set(0, C.CHAPA, 0.035); g.add(chapaLine);

    // --- pared izquierda con los números de los cuadros
    const leftTex = canvasTex(T, 2048, 512, (c, w, h) => {
      c.fillStyle = th.wall; c.fillRect(0, 0, w, h); grain(c, w, h, 12000, 0.06); grain(c, w, h, 3000, 0.05, false);
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
