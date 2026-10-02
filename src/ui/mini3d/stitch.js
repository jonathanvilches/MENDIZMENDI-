// Coser la suela de la alpargata, en 3D: la suela es un cordón de yute trenzado enrollado en espiral (con su forma de
// pie), en el banco de la alpargatera, con la aguja grande y el hilo rojo. Se toca la puntada que brilla, una tras
// otra por el borde: la aguja atraviesa el cordón, queda la puntada y el hilo tira hacia la siguiente.
import * as THREE from 'three';
import { play3d, blip } from './play.js';
import { workshop, texMat, uvScale, lathe, rbox } from './kit.js';

// contorno de la suela (de pie: más ancha delante, cintura, talón), «inset» metros hacia dentro
export function soleOutline(phi, inset = 0, L = 0.27, W = 0.1) {
  const a = L / 2 - inset, x = Math.cos(phi), y = Math.sin(phi);
  const w = (W / 2) * (1 + 0.1 * x) * (1 - 0.1 * Math.exp(-((x + 0.15) ** 2) * 18)) - inset;   // más ancha delante y con cintura (sin saltos)
  return new THREE.Vector3(x * a, 0, y * Math.max(0.004, w));
}
/** La suela en espiral: un tubo trenzado que da vueltas de fuera adentro. Devuelve { mesh, top } (altura del cordón). */
export function soleMesh(S, { r = 0.0058, turns = 4.2 } = {}) {
  const pts = [], N = Math.round(turns * 110);
  for (let i = 0; i <= N; i++) { const t = i / N, phi = t * turns * Math.PI * 2 + Math.PI; const p = soleOutline(phi, t * turns * r * 2.05); p.y = r; pts.push(p); }
  const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength();
  const geo = uvScale(new THREE.TubeGeometry(curve, N * 2, r, 10, false), len / 0.022, 1);
  return { mesh: S.mesh(geo, texMat(S, 'braid', '#ffffff', { roughness: 0.95 })), top: r * 2 };
}

export function stitchGame(ui, { title = 'Coser la alpargata', icon = 'espadrille', n = 14, seconds = 25, hint } = {}) {
  return play3d(ui, { title, icon, hint: hint || 'Da las puntadas una tras otra siguiendo el borde de la suela: toca el punto que brilla. Puntadas fuertes y en orden para que no se deshaga.',
    stage: { bg: '#3a2c22', hemi: ['#fff2dc', '#5a4632', 0.95], sun: { color: '#fff0d6', intensity: 2.0, pos: [1.5, 4, 2.5], extent: 1.2 } } }, async (S, H, end, isOver) => {
    workshop(S, { bench: true });
    const benchY = 0.905, cx = 0.25, cz = -2.4;
    // de pie (móvil vertical), la suela a lo largo de la pantalla
    const root = new THREE.Group(); root.position.set(cx, benchY, cz); root.rotation.y = innerWidth < innerHeight ? Math.PI / 2 + 0.1 : 0.15; S.add(root);
    const sole = soleMesh(S); root.add(sole.mesh);
    // la lona del empeine (doblada al lado), el carrete de hilo y las tijeras
    // la puntera de lona, cortada con su forma, con el dobladillo cosido
    { const sh = new THREE.Shape(); sh.moveTo(-0.07, 0); sh.quadraticCurveTo(-0.075, 0.07, 0, 0.085); sh.quadraticCurveTo(0.075, 0.07, 0.07, 0); sh.quadraticCurveTo(0, 0.02, -0.07, 0);
      const cg = new THREE.ShapeGeometry(sh, 16), cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getY(i) * 30) * 0.003 + cp.getX(i) ** 2 * 0.6); cg.computeVertexNormals();
      const cl = S.mesh(cg, S.mat('#ece2c8', { roughness: 1, side: THREE.DoubleSide }), 0.2, 0.004, 0.1, root); cl.rotation.set(-Math.PI / 2, 0, 0.4);
      const hem = sh.getPoints(30).map(v => new THREE.Vector3(v.x * 0.94, v.y * 0.94 + 0.003, 0.0)); for (const v of hem) v.z = Math.sin(v.y * 30) * 0.003 + v.x ** 2 * 0.6 + 0.0015;
      const hm = S.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hem), 60, 0.0009, 4), S.mat('#3a5a8a'), 0.2, 0.004, 0.1, root); hm.rotation.copy(cl.rotation); }
    const spool = new THREE.Group(); spool.position.set(-0.24, 0, -0.08); root.add(spool);
    S.mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 20), texMat(S, 'wood', '#b08a5a'), 0, 0.003, 0, spool);
    S.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 24), S.mat('#c8202a', { roughness: 0.7 }), 0, 0.03, 0, spool);
    S.mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 20), texMat(S, 'wood', '#b08a5a'), 0, 0.058, 0, spool);
    // los puntos de las puntadas por el borde de fuera, empezando por el talón
    const pts = [];
    for (let i = 0; i < n; i++) { const phi = Math.PI + i / n * Math.PI * 2, p = soleOutline(phi, 0); const out = p.clone().setY(0).normalize(); p.addScaledVector(out, 0.004); p.y = sole.top * 0.8; pts.push({ p, phi, out }); }
    const glowM = S.mat('#ffd84a', { emissive: '#ffb020', emissiveIntensity: 1.4, roughness: 0.4 });
    const marker = S.mesh(new THREE.TorusGeometry(0.011, 0.0025, 8, 24), glowM, 0, 0, 0, root); marker.castShadow = false;
    const hitDot = S.mesh(new THREE.SphereGeometry(0.02, 8, 6), S.own(new THREE.MeshBasicMaterial({ visible: false })), 0, 0, 0, root);
    // la aguja (acero, con su ojo) y el hilo rojo
    const needle = new THREE.Group(); root.add(needle);
    S.mesh(lathe([[0.001, 0], [0.0016, 0.004], [0.0018, 0.06], [0.0024, 0.072], [0.0016, 0.08], [0.001, 0.081]], 10), S.mat('#dfe3e8', { metalness: 0.9, roughness: 0.2 }), 0, -0.012, 0, needle);
    const threadM = S.mat('#c8202a', { roughness: 0.7 });
    let thread = null; const drawThread = (a, b) => { if (thread) { root.remove(thread); thread.geometry.dispose(); } const mid = a.clone().lerp(b, 0.5); mid.y += 0.03; thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.0012, 5), threadM); root.add(thread); };
    S.own({ dispose: () => thread?.geometry.dispose() });
    // una puntada hecha: el hilo pasa por encima del borde y entra en la vuelta de dentro
    const stitchDone = (i) => {
      const { p, out } = pts[i], inn = p.clone().addScaledVector(out, -0.024); inn.y = sole.top * 0.6;
      const o2 = p.clone().addScaledVector(out, 0.002); o2.y = sole.top * 0.25;
      const top = p.clone().addScaledVector(out, -0.01); top.y = sole.top + 0.0035;
      S.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([o2, p.clone().setY(sole.top * 0.95), top, inn]), 14, 0.0014, 6), threadM, 0, 0, 0, root);
    };
    S.frame([cx, benchY + 0.01, cz], 0.13, [0.12, 1.2, 0.7], 40);
    let k = 0, t = 0, miss = 0, push = 0; const needleBase = new THREE.Vector3(), needleDir = new THREE.Vector3();
    const tmpW = new THREE.Vector3();
    const place = () => {
      if (k >= n) { marker.visible = false; return; }
      const { p, out } = pts[k]; marker.position.copy(p); marker.lookAt(p.clone().add(out).applyMatrix4(root.matrixWorld)); hitDot.position.copy(p);
      // la punta de la aguja apoyada en el cordón; el resto hacia fuera y arriba (como la sujeta la mano)
      needleBase.copy(p).addScaledVector(out, 0.007); needleBase.y = sole.top + 0.006; needle.position.copy(needleBase);
      needleDir.copy(p).sub(needleBase).normalize();
      needle.lookAt(root.localToWorld(p.clone().addScaledVector(out, -0.02).setY(sole.top * 0.2))); needle.rotateX(-Math.PI / 2);
      drawThread(k ? pts[k - 1].p.clone().setY(sole.top) : new THREE.Vector3(-0.24, 0.03, -0.08), needle.position.clone());
    };
    const tap = (e) => {
      if (isOver() || k >= n) return;
      // se acierta tocando cerca del punto que brilla (en la pantalla, con margen para el dedo)
      root.localToWorld(tmpW.copy(pts[k].p)); const sp = S.toScreen(tmpW), d = Math.hypot(sp.x - e.clientX, sp.y - e.clientY);
      if (d < Math.max(34, innerWidth * 0.045)) {
        stitchDone(k); k++; push = 1; blip(ui, 500 + k * 25); ui.onMiniHit?.(true); H.fb.textContent = k < n ? `Puntada ${k} de ${n}` : '';
        if (k >= n) end({ win: true }, '¡Suela cosida! A andar con ellas'); else place();
      } else if (pts.some((q, i) => i !== k && (root.localToWorld(tmpW.copy(q.p)), Math.hypot(S.toScreen(tmpW).x - e.clientX, S.toScreen(tmpW).y - e.clientY) < 30))) { miss++; ui.sound?.ui?.('error'); H.fb.textContent = 'En orden: la puntada que brilla'; }
    };
    H.cap.addEventListener('pointerdown', tap);
    H.keys((e) => { if ([' ', 'enter', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); root.localToWorld(tmpW.copy(pts[k].p)); const sp = S.toScreen(tmpW); tap({ clientX: sp.x, clientY: sp.y }); } });
    root.updateMatrixWorld(true); place();
    S.every((dt) => {
      if (!isOver()) { t += dt; H.time(seconds - t); if (t >= seconds) end({ win: false }, `Se acabó el tiempo: ${k} de ${n} puntadas`); }
      const s = 1 + Math.sin(t * 6) * 0.18; marker.scale.setScalar(s); glowM.emissiveIntensity = 1.1 + Math.sin(t * 6) * 0.5;
      push = Math.max(0, push - dt * 4); needle.position.copy(needleBase).addScaledVector(needleDir, push * 0.014);   // la aguja entra al dar la puntada
      H.prog(k / n);
    });
    H.time(seconds);
    H.o.state = () => { if (k >= n) return { k, next: null }; root.localToWorld(tmpW.copy(pts[k].p)); return { k, next: S.toScreen(tmpW) }; };
  });
}
