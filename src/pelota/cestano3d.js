// La elección de material como en los frontones de verdad (foto del autor, 17 de noviembre de 2026): antes del partido,
// los dos pelotaris, de pie juntos delante del frontis y de cara a la cámara, sostienen entre los dos la caja de madera
// de las pelotas, con sus huecos forrados de fieltro: la mitad del de azul, de azul, y la del de colorado, de colorado. En
// la caja, el lote de diez pelotas; las que elige cada uno suben un poco y se les enciende un aro de su color. Encima, la
// tarjeta de siempre (match.js eleccion), abajo y compacta, para que se vea la escena.
//   new Cestano3D({ T, grp, cam, azul: lado, rojo: lado, lote })   ·   marca(azules, rojas)   ·   update(dt)   ·   dispose()
//   lado = { obj, animate, rig }

const COL = { azul: '#2f4fd0', rojo: '#c8183e' };
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const hueso = (ch, s) => Object.values(ch?.bones || {}).find((b) => new RegExp(s + '$').test(b.name)) || null;

const CSS = `.pel-panel.con-cestano{background:transparent!important;align-items:end!important;justify-items:center}
.pel-panel.con-cestano .pel-card{width:min(600px,calc(100% - 2 * var(--edge,16px)));margin-bottom:calc(env(safe-area-inset-bottom,0px) + 10px);padding-block:10px 12px;background:rgba(12,5,30,.88);max-height:52dvh;overflow:auto}
.pel-panel.con-cestano .pel-card h2{font-size:var(--fs-lg)}
.pel-panel.con-cestano .pel-mat-what:not([data-mat-what]){display:none}
@media (orientation:landscape) and (max-height:520px){.pel-panel.con-cestano .pel-card{max-height:58dvh;padding-block:8px 10px}.pel-panel.con-cestano .pel-sub{display:none}}`;

// el cuero de la pelota: crema, con la costura en ocho
function cuero(T) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(120,90,50,${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 128, 2, 2); }
  g.strokeStyle = '#8a6a44'; g.lineWidth = 3; g.setLineDash([5, 3]);
  g.beginPath(); for (let x = 0; x <= 256; x += 4) { const y = 64 + Math.sin(x / 256 * Math.PI * 4) * 30; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

export class Cestano3D {
  constructor(o) {
    this.o = o; const T = this.T = o.T; this.t = 0; this.hecho = false;
    this.P = { x: 0.3, z: 2.6, y: 1.0 };
    this.grupo = new T.Group(); this.grupo.name = 'cestano'; o.grp.add(this.grupo);
    // la caja: madera, con los diez huecos en dos filas y el fieltro de cada mitad
    const caja = this.caja = new T.Group(), madera = new T.MeshStandardMaterial({ color: '#5a2e17', roughness: 0.55 });
    const W = 0.66, D = 0.36, H = 0.07, e = 0.014;
    const box = (w, h, d, x, y, z, m = madera) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; caja.add(b); return b; };
    box(W, 0.02, D, 0, 0.01, 0);
    box(W, H, e, 0, H / 2, D / 2 - e / 2); box(W, H, e, 0, H / 2, -D / 2 + e / 2); box(e, H, D, W / 2 - e / 2, H / 2, 0); box(e, H, D, -W / 2 + e / 2, H / 2, 0);
    for (let i = 1; i < 5; i++) box(0.008, H * 0.7, D - 2 * e, -W / 2 + i * W / 5, H * 0.35, 0);
    box(W - 2 * e, H * 0.7, 0.008, 0, H * 0.35, 0);
    for (const [lado, sx] of [['azul', -1], ['rojo', 1]]) { const f = new T.Mesh(new T.PlaneGeometry(W / 2 - e, D - 2 * e), new T.MeshStandardMaterial({ color: COL[lado], roughness: 1 })); f.rotation.x = -Math.PI / 2; f.position.set(sx * (W / 4 - e / 4), 0.021, 0); caja.add(f); }
    // (y un filo dorado por fuera, como el de la caja de la foto)
    const oro = new T.MeshStandardMaterial({ color: '#c99a3a', metalness: 0.8, roughness: 0.35 });
    box(W + 0.006, 0.008, 0.006, 0, H, D / 2 + 0.001, oro);
    this.grupo.add(caja); caja.position.set(this.P.x, this.P.y, this.P.z + 0.3);
    // las pelotas del lote, una en cada hueco
    this.tex = cuero(T);
    const geo = new T.SphereGeometry(0.031, 20, 14), mat = new T.MeshStandardMaterial({ map: this.tex, roughness: 0.62 });
    this.bolas = (o.lote || Array.from({ length: 10 }, (_, i) => ({ n: i + 1 }))).slice(0, 10).map((b, i) => {
      const m = new T.Mesh(geo, mat); const col = i % 5, fila = Math.floor(i / 5);
      m.position.set(-W / 2 + (col + 0.5) * W / 5, 0.02 + 0.031, fila ? D / 4 - 0.004 : -D / 4 + 0.004); m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      m.castShadow = true; caja.add(m);
      const aro = new T.Mesh(new T.TorusGeometry(0.04, 0.006, 8, 24), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 })); aro.rotation.x = -Math.PI / 2; aro.position.copy(m.position); aro.position.y = 0.024; caja.add(aro);
      return { b, m, aro, y0: m.position.y, k: 0, de: null };
    });
    this.geo = geo; this.mat = mat;
    // los dos pelotaris: el de azul a la izquierda y el de colorado a la derecha, como en la foto; cada uno coge la caja
    // por su punta con la mano de dentro
    this.gente = [['azul', -1], ['rojo', 1]].map(([c, s]) => {
      const l = o[c]; if (!l?.obj) return null;
      const p = { l, c, s, x: this.P.x + s * 0.45, mano: s < 0 ? 'L' : 'R', ch: l.rig?.char || null };
      if (p.ch) {
        const S = p.mano === 'L' ? 'Left' : 'Right';
        p.B = { brazo: hueso(p.ch, S + 'Arm'), ante: hueso(p.ch, S + 'ForeArm'), mano: hueso(p.ch, S + 'Hand') };
        p.post0 = p.ch.post; p.ch.post = (ch, dt) => { p.post0?.(ch, dt); this.agarra(p); };
        try { p.ch.mano?.(p.mano, 'mango'); } catch (e) { /* sin dedos */ }
      }
      return p;
    }).filter(Boolean);
    o.grp.updateMatrixWorld(true);
    const a = o.grp.localToWorld(new T.Vector3(0, 0, 0)), b = o.grp.localToWorld(new T.Vector3(0, 0, 1));
    this.yaw = Math.atan2(b.x - a.x, b.z - a.z);
    if (!document.getElementById('cestano-css')) { const st = document.createElement('style'); st.id = 'cestano-css'; st.textContent = CSS; document.head.appendChild(st); }
    this.camPos = new T.Vector3(); this.camLook = new T.Vector3(); this.camOk = false;
  }
  // las que ha elegido cada uno: suben un poco y se les enciende un aro de su color
  marca(azules = [], rojas = []) {
    const de = new Map(); for (const b of azules) de.set(b.n, 'azul'); for (const b of rojas) de.set(b.n, 'rojo');
    for (const q of this.bolas) { const c = de.get(q.b.n) || null; if (c !== q.de) { q.de = c; q.k = 0; if (c) q.aro.material.color.set(c === 'azul' ? '#6b8cff' : '#ff4f7b'); } }
  }
  // la mano de dentro en la punta de la caja: dos huesos (brazo y antebrazo) con el codo hacia abajo y hacia fuera
  agarra(p) {
    const B = p.B, T = this.T; if (!B?.brazo || !B.ante || !B.mano) return;
    p.ch.root.updateMatrixWorld(true);
    const g = this.o.grp, meta = g.localToWorld(new T.Vector3(this.P.x + p.s * 0.31, this.P.y + 0.035, this.P.z + 0.3));
    const S = B.brazo.getWorldPosition(new T.Vector3()), E = B.ante.getWorldPosition(new T.Vector3()), H = B.mano.getWorldPosition(new T.Vector3());
    const a = S.distanceTo(E), bl = E.distanceTo(H); let d = S.distanceTo(meta); d = Math.min(d, (a + bl) * 0.985);
    const dir = meta.clone().sub(S).normalize();
    const polo = new T.Vector3(0, -1, 0).add(g.localToWorld(new T.Vector3(p.s * -1, 0, 0)).sub(g.localToWorld(new T.Vector3(0, 0, 0))).multiplyScalar(0.6));
    polo.addScaledVector(dir, -polo.dot(dir)).normalize();
    const cosA = Math.max(-1, Math.min(1, (a * a + d * d - bl * bl) / (2 * a * d))), sinA = Math.sqrt(1 - cosA * cosA);
    const E2 = S.clone().addScaledVector(dir, cosA * a).addScaledVector(polo, sinA * a);
    const gira = (h, de, a2) => { const q = new T.Quaternion().setFromUnitVectors(de.normalize(), a2.normalize()); const wq = h.getWorldQuaternion(new T.Quaternion()); const pq = h.parent.getWorldQuaternion(new T.Quaternion()).invert(); h.quaternion.copy(pq.multiply(q.multiply(wq))); h.updateMatrixWorld(true); };
    gira(B.brazo, E.clone().sub(S), E2.clone().sub(S));
    const E3 = B.ante.getWorldPosition(new T.Vector3()), H3 = B.mano.getWorldPosition(new T.Vector3());
    gira(B.ante, H3.sub(E3), meta.clone().sub(E3));
  }
  update(dt) {
    if (this.hecho) return; dt = Math.min(dt, 0.05); this.t += dt;
    const T = this.T, g = this.o.grp;
    for (const p of this.gente) {
      const obj = p.l.obj; obj.position.copy(g.localToWorld(new T.Vector3(p.x, 0, this.P.z))); obj.visible = true;
      obj.rotation.y = this.yaw - p.s * 0.12;
      try { p.l.animate?.(obj, { speed: 0, entre: false, swing: -1, wind: 0, won: false, lost: false, saluda: false }, dt); } catch (e) { /* sigue */ }
    }
    for (const q of this.bolas) {
      q.k = Math.min(1, q.k + dt * 3); const on = q.de ? smooth(q.k) : 0;
      q.m.position.y = q.y0 + on * 0.035; q.aro.material.opacity = on * (0.75 + 0.25 * Math.sin(this.t * 5));
    }
    // la cámara, de frente y a la altura del pecho, con los dos y la caja; se acerca muy despacio
    const k = innerWidth < innerHeight ? 1.7 : 1, u = smooth(this.t / 6);
    const wp = g.localToWorld(new T.Vector3(this.P.x + 0.15, 1.4, this.P.z + (3.1 - u * 0.4) * k)), wl = g.localToWorld(new T.Vector3(this.P.x, 1.05 + (innerWidth < innerHeight ? 0 : 0.12), this.P.z));
    if (!this.camOk) { this.camPos.copy(wp); this.camLook.copy(wl); this.camOk = true; }
    const kk = 1 - Math.exp(-5 * dt); this.camPos.lerp(wp, kk); this.camLook.lerp(wl, kk);
    const cam = this.o.cam; cam.position.copy(this.camPos); cam.lookAt(this.camLook);
    const fv = innerWidth < innerHeight ? 58 : 40; if (Math.abs(cam.fov - fv) > 0.01) { cam.fov = fv; cam.updateProjectionMatrix(); }
  }
  dispose() {
    if (this.hecho) return; this.hecho = true;
    for (const p of this.gente) if (p.ch) { p.ch.post = p.post0 || null; try { p.ch.mano?.(p.mano, null); } catch (e) { /* sin dedos */ } }
    this.grupo.parent?.remove(this.grupo);
    this.grupo.traverse((o) => { if (o.isMesh) { if (o.geometry !== this.geo) o.geometry.dispose(); if (o.material !== this.mat) o.material.dispose(); } });
    this.geo.dispose(); this.mat.dispose(); this.tex.dispose();
  }
}
