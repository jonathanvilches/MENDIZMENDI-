// La fragua del herrero, en 3D: el hogar de ladrillo con las brasas, el fuelle de cuero que se aprieta, el yunque sobre
// su tocón y el hierro cogido con las tenazas. Se sopla hasta que el hierro está al rojo vivo (naranja), y al golpear,
// las tenazas lo llevan al yunque, el martillo cae, saltan chispas y el hierro se curva un poco más hacia la
// herradura; luego vuelve al fuego. Frío, el martillo rebota; blanco, se quema.
import * as THREE from 'three';
import { play3d, blip } from './play.js';
import { workshop, texMat, uvScale, rbox, lathe, lumpy, particles } from './kit.js';

/** Color del hierro según el calor (0 frío … 1,15 blanco): negro, rojo oscuro, cereza, naranja, amarillo, blanco. */
export function heatColor(h, out = new THREE.Color()) {
  const K = [[0, '#2a2a2e'], [0.35, '#5a1a10'], [0.55, '#c42a0c'], [0.75, '#ff6a10'], [0.95, '#ffc040'], [1.15, '#fff4d8']];
  for (let i = 0; i < K.length - 1; i++) if (h <= K[i + 1][0]) return out.set(K[i][1]).lerp(new THREE.Color(K[i + 1][1]), (h - K[i][0]) / (K[i + 1][0] - K[i][0]));
  return out.set(K[K.length - 1][1]);
}
/** Curva de la pieza: barra recta (k=0) que se va doblando hasta la herradura (k=1). */
export function shoeCurve(k, len = 0.3) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const s = i / 24 * 2 - 1, a = s * Math.PI * 0.78, R = len / (Math.PI * 1.56);
    const straight = new THREE.Vector3(s * len / 2, 0, 0), bent = new THREE.Vector3(Math.sin(a) * R, 0, -Math.cos(a) * R + R * 0.4);
    pts.push(straight.lerp(bent, k));
  }
  return new THREE.CatmullRomCurve3(pts);
}
/** Yunque con su cuerno: perfil de lado extruido con chaflanes y el cuerno redondo, sobre un tocón de madera. */
export function anvil(S) {
  const g = new THREE.Group(), iron = S.mat('#4a4e55', { metalness: 0.75, roughness: 0.38 }), face = S.mat('#8a9098', { metalness: 0.85, roughness: 0.22 });
  const sh = new THREE.Shape();
  sh.moveTo(-0.3, 0.3); sh.lineTo(-0.3, 0.38); sh.lineTo(0.17, 0.38); sh.lineTo(0.17, 0.28);
  sh.quadraticCurveTo(0.09, 0.27, 0.07, 0.17); sh.quadraticCurveTo(0.08, 0.07, 0.17, 0.04); sh.lineTo(0.17, 0); sh.lineTo(-0.22, 0); sh.lineTo(-0.22, 0.04);
  sh.quadraticCurveTo(-0.12, 0.07, -0.12, 0.17); sh.quadraticCurveTo(-0.14, 0.27, -0.22, 0.29); sh.lineTo(-0.3, 0.3);
  const body = S.mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.13, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 12 }).translate(0, 0, -0.065), iron, 0, 0, 0, g);
  S.mesh(rbox(0.47, 0.012, 0.145, 0.004), face, -0.065, 0.392, 0, g);                                         // la cara pulida
  const horn = S.mesh(lathe([[0.001, 0], [0.06, 0], [0.058, 0.04], [0.045, 0.1], [0.025, 0.16], [0.006, 0.2], [0.001, 0.205]], 24), iron, 0.17, 0.34, 0, g); horn.rotation.z = -Math.PI / 2; horn.scale.set(1, 1, 0.95);
  const stump = S.mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.42, 28), texMat(S, 'bark', '#9a8270'), -0.04, -0.21, 0, g);
  const top = S.mesh(new THREE.CircleGeometry(0.26, 28), S.mat('#c8a678', { roughness: 0.9 }), -0.04, 0.0, 0, g); top.rotation.x = -Math.PI / 2;
  for (let k = 1; k < 5; k++) { const r = S.mesh(new THREE.RingGeometry(k * 0.05, k * 0.05 + 0.004, 28), S.mat('#9a7a52'), -0.04, 0.002, 0, g); r.rotation.x = -Math.PI / 2; r.castShadow = false; }
  g.position.y = 0.42; return { g, faceY: 0.42 + 0.4 };
}
/** Martillo de herrero: cabeza con boca y peña, mango torneado. */
export function hammer(S) {
  const g = new THREE.Group(), steel = S.mat('#5a5f66', { metalness: 0.8, roughness: 0.32 });
  S.mesh(rbox(0.13, 0.05, 0.05, 0.012), steel, 0, 0, 0, g);
  const pein = S.mesh(new THREE.CylinderGeometry(0.012, 0.025, 0.04, 14), steel, -0.08, 0, 0, g); pein.rotation.z = Math.PI / 2;
  const handle = S.mesh(lathe([[0.001, 0], [0.016, 0], [0.014, 0.1], [0.012, 0.2], [0.015, 0.3], [0.017, 0.36], [0.001, 0.37]], 14), S.mat('#9a6a3a', { roughness: 0.6 }), 0.02, -0.02, 0, g); handle.rotation.z = Math.PI;
  return g;
}
/** Tenazas: dos brazos largos curvados que se cruzan en el pasador y muerden la pieza. */
export function tongs(S) {
  const g = new THREE.Group(), m = S.mat('#3a3d42', { metalness: 0.7, roughness: 0.45 });
  for (const s of [-1, 1]) S.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.02, 0, s * 0.012], [0.08, 0, s * 0.004], [0.14, 0, -s * 0.01], [0.4, 0.02, -s * 0.03], [0.62, 0.05, -s * 0.035]].map(p => new THREE.Vector3(...p))), 24, 0.008, 8), m, 0, 0, 0, g);
  S.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), m, 0.11, 0, 0, g).rotation.x = Math.PI / 2;
  return g;
}
/** El hogar de la fragua: bloque de ladrillo, el lecho de brasas, la campana y el fuelle de cuero. */
function hearth(S) {
  const g = new THREE.Group(), brick = texMat(S, 'brick', '#ffffff');
  S.mesh(uvScale(new THREE.BoxGeometry(1.3, 0.8, 0.95), 1.6, 1), brick, 0, 0.4, 0, g);
  S.mesh(uvScale(rbox(1.38, 0.08, 1.02, 0.02), 1.4, 1), texMat(S, 'stone', '#b8ad98'), 0, 0.83, 0, g);
  S.mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.06, 28), S.mat('#1a1410', { roughness: 1 }), 0, 0.86, 0.05, g);
  // brasas: piedras de carbón con su brillo (el brillo crece con el fuelle)
  const coalGeo = lumpy(new THREE.IcosahedronGeometry(0.04, 1), 0.3, 40, 5), coalM = S.mat('#2a2420', { roughness: 0.9, emissive: '#ff5a10', emissiveIntensity: 0.6 });
  const coals = new THREE.InstancedMesh(S.own(coalGeo), coalM, 46); const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.3; M4.compose(new THREE.Vector3(Math.cos(a) * r, 0.9 + Math.random() * 0.04, 0.05 + Math.sin(a) * r * 0.9), q.setFromEuler(e.set(Math.random() * 6, Math.random() * 6, 0)), new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 + Math.random() * 0.8)); coals.setMatrixAt(i, M4); }
  g.add(coals);
  // campana de la chimenea
  const hood = S.mesh(new THREE.CylinderGeometry(0.28, 0.72, 0.7, 4, 1, true), texMat(S, 'plaster', '#d8ccb8', { side: THREE.DoubleSide }), 0, 1.75, -0.05, g); hood.rotation.y = Math.PI / 4; hood.scale.set(1, 1, 0.75);
  S.mesh(uvScale(new THREE.BoxGeometry(0.42, 1.2, 0.36), 0.5, 1.4), texMat(S, 'brick', '#e0d0c0'), 0, 2.7, -0.2, g);
  return { g, coalM, fire: new THREE.Vector3(0, 0.95, 0.05) };
}
/** El fuelle: dos tablas en forma de pera, el cuero con sus pliegues entre ellas y la tobera de hierro. */
function bellows(S) {
  const g = new THREE.Group(), wood = texMat(S, 'wood', '#9a7450'), leather = texMat(S, 'leather', '#ffffff', { roughness: 0.8 });
  const pear = new THREE.Shape(); pear.moveTo(0, -0.06); pear.quadraticCurveTo(0.42, -0.34, 0.62, -0.02); pear.quadraticCurveTo(0.66, 0.02, 0.62, 0.06); pear.quadraticCurveTo(0.42, 0.34, 0, 0.06); pear.closePath();
  const boardGeo = new THREE.ExtrudeGeometry(pear, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 16 });
  const bottom = S.mesh(boardGeo, wood, 0, 0, 0, g); bottom.rotation.x = -Math.PI / 2;
  const topP = new THREE.Group(); g.add(topP); const top = S.mesh(boardGeo.clone(), wood, 0, 0, 0, topP); top.rotation.x = -Math.PI / 2;
  S.mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.5, 8), S.mat('#7a5232'), 0.88, 0.06, 0, topP).rotation.z = Math.PI / 2;   // asidero
  // el cuero: anillos de la forma de pera (de abajo arriba), con pliegues que entran y salen
  const ring = pear.getPoints(24), pos = [], idx = [], N = 7;
  for (let j = 0; j <= N; j++) for (const p of ring) { const k = j / N, fold = 1 + 0.06 * Math.sin(k * Math.PI * N) * Math.sin(k * Math.PI); pos.push(p.x * fold, k, -p.y * fold); }
  const L = ring.length; for (let j = 0; j < N; j++) for (let i = 0; i < L - 1; i++) { const a = j * L + i, b = a + 1, c = a + L, d = c + 1; idx.push(a, c, b, b, c, d); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setIndex(idx);
  const uv = []; for (let j = 0; j <= N; j++) for (let i = 0; i < L; i++) uv.push(i / (L - 1) * 3, j / N); lg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); lg.computeVertexNormals();
  const bag = S.mesh(lg, leather, 0, 0.03, 0, g); bag.material.side = THREE.DoubleSide;
  const noz = S.mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.3, 14), S.mat('#3a3d42', { metalness: 0.7, roughness: 0.4 }), -0.13, 0.03, 0, g); noz.rotation.z = Math.PI / 2;
  return { g, set(k) { const gap = 0.2 - 0.14 * k; topP.position.y = gap + 0.03; topP.rotation.z = -0.02 * k; bag.scale.set(1, gap, 1); } };
}

export function forgeGame(ui, { title = 'En la fragua', icon = 'anvil', need = 6, seconds = 30 } = {}) {
  return play3d(ui, { title, icon, hint: 'Sopla con el fuelle hasta que el hierro esté al rojo vivo (naranja) y entonces golpéalo en el yunque. Frío no se deja trabajar; si lo dejas blanco, se quema.',
    buttons: '<button class="btn big" data-a="fuelle">Fuelle</button><button class="btn primary big" data-a="golpe">Golpear</button>',
    extra: '<div class="m3-bar m3-heat"><i></i><span>frío</span><span>al rojo</span><span>se quema</span></div>',
    stage: { bg: '#1e1612', env: 0.25, hemi: ['#ffd8b0', '#3a2a20', 0.55], sun: { color: '#ffe6c8', intensity: 1.1, pos: [2, 4, 3], extent: 2 } } }, async (S, H, end, isOver) => {
    workshop(S, { wall: 'brick', bench: false });
    const HH = hearth(S); HH.g.position.set(-0.85, 0, -1.6); S.add(HH.g);
    const fireW = HH.fire.clone().add(HH.g.position);
    const glow = new THREE.PointLight('#ff7a2a', 3, 4, 1.6); glow.position.copy(fireW).add(new THREE.Vector3(0, 0.25, 0.2)); S.add(glow);
    // el fuelle grande, en su soporte de madera al lado del hogar, con la tobera metida en el fuego
    const BL = bellows(S); BL.g.scale.setScalar(1.5); BL.g.position.set(-1.62, 0.95, -1.5); BL.g.rotation.set(0, Math.PI, 0.18); S.add(BL.g); BL.set(0);
    for (const z of [-1.75, -1.25]) S.mesh(rbox(0.08, 0.95, 0.08, 0.015), texMat(S, 'wood', '#7a5a3a'), -2.05, 0.47, z);
    S.mesh(rbox(0.12, 0.08, 0.7, 0.015), texMat(S, 'wood', '#7a5a3a'), -2.05, 0.92, -1.5);
    const AN = anvil(S); AN.g.position.set(0.35, 0.42, -0.35); AN.g.rotation.y = -0.35; S.add(AN.g);
    const onAnvil = new THREE.Vector3(0.28, AN.faceY + 0.02, -0.32);
    // la pieza: tubo que se regenera al doblarse; su color y brillo según el calor
    const ironM = S.mat('#2a2a2e', { metalness: 0.5, roughness: 0.5, emissive: '#000000' });
    const piece = new THREE.Group(); S.add(piece);
    let pm = null; const reshape = (k) => { if (pm) { piece.remove(pm); pm.geometry.dispose(); } pm = new THREE.Mesh(new THREE.TubeGeometry(shoeCurve(k), 40, 0.011, 10), ironM); pm.castShadow = true; piece.add(pm); };
    reshape(0); S.own({ dispose: () => pm?.geometry.dispose() });
    const TG = tongs(S); piece.add(TG); TG.position.set(0.15, 0, 0); TG.rotation.y = 0;
    const HM = hammer(S); S.add(HM);
    const sparks = particles(S, { geo: new THREE.SphereGeometry(0.006, 5, 4), color: '#ffcc66', emissive: '#ffaa33', max: 140, gravity: -5, drag: 0.3, ground: 0 });
    const smoke = particles(S, { geo: lumpy(new THREE.IcosahedronGeometry(0.03, 1), 0.2, 30), color: '#ff9a3a', emissive: '#ff6a10', max: 40, gravity: 1.2, drag: 1.5 });
    S.frame([-0.45, 0.9, -0.95], 0.95, [0.38, 0.4, 1], 40);

    let heat = 0.15, hits = 0, t = 0, burnt = 0, flash = 0, stun = 0, blowT = 0, move = 0, strikeT = -1;
    const home = fireW.clone().add(new THREE.Vector3(0.05, 0.02, 0.05)), col = new THREE.Color();
    const heatBar = H.o.querySelector('.m3-heat i');
    const blow = () => { if (isOver()) return; heat = Math.min(1.15, heat + 0.07); blowT = 1; ui.sound?.noiseBurst?.(0.12, 400, 0.7, 0.12, ui.sound.sfx); smoke.emit([fireW.x, fireW.y + 0.05, fireW.z], 3, { speed: 0.5, spread: 0.6, life: 0.6, size: 1 }); };
    const strike = () => {
      if (isOver() || stun > 0 || move > 0) return;
      if (heat < 0.55) { stun = 0.7; H.fb.textContent = 'El martillo rebota: en frío no se deja. Aviva el fuego con el fuelle'; ui.sound?.tone?.(140, 0.08, 'square', 0.1, ui.sound.sfx); move = 0.9; strikeT = 0.35; return; }
      if (heat > 0.95) { burnt++; heat = 0.4; H.fb.textContent = '¡Demasiado caliente! El hierro se ha quemado un poco'; ui.sound?.ui?.('error'); smoke.emit([home.x, home.y, home.z], 8, { speed: 0.6, spread: 1, life: 0.8 }); return; }
      move = 0.9; strikeT = 0.35;   // a por el yunque; el martillo cae al llegar
    };
    const land = () => {
      if (heat < 0.55) { blip(ui, 140); return; }
      hits++; heat -= 0.22; flash = 1; ui.onMiniHit?.(true); reshape(Math.min(1, hits / need));
      sparks.emit(onAnvil.clone().add(new THREE.Vector3(0, 0.02, 0)), 22, { speed: 2.2, spread: 2.2, dir: [0, 1, 0], life: 0.7, size: 1 });
      ui.sound?.tone?.(900, 0.07, 'square', 0.14, ui.sound.sfx); ui.sound?.noiseBurst?.(0.06, 3200, 1.4, 0.3, ui.sound.sfx);
      H.fb.textContent = hits < need ? `¡Bien! Golpe ${hits} de ${need}` : '';
      if (hits >= need) end({ win: true }, '¡Herradura terminada! Al agua: ¡ssshhh!');
    };
    H.o.querySelectorAll('[data-a]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); b.dataset.a === 'fuelle' ? blow() : strike(); }));
    H.keys((e) => { const k = e.key.toLowerCase(); if (['f', 'a', 'arrowleft'].includes(k)) blow(); if ([' ', 'enter', 'e', 'd', 'arrowright'].includes(k)) { e.preventDefault(); strike(); } });
    const tmp = new THREE.Vector3();
    S.every((dt) => {
      if (!isOver()) { t += dt; H.time(seconds - t); if (t >= seconds) end({ win: hits >= need }, hits >= need ? '¡Terminada!' : `Se acabó: ${hits} de ${need} golpes buenos`); }
      // el hierro se enfría poco a poco (más fuera del fuego)
      heat = Math.max(0, heat - dt * (move > 0 ? 0.14 : 0.07)); flash = Math.max(0, flash - dt * 4); stun = Math.max(0, stun - dt); blowT = Math.max(0, blowT - dt * 4);
      // ida y vuelta de la pieza: del fuego al yunque y de vuelta
      if (move > 0) { move = Math.max(0, move - dt); if (strikeT > 0 && (strikeT -= dt) <= 0) land(); }
      const goK = move > 0 ? Math.min(1, (0.9 - move) / 0.2) * Math.min(1, move / 0.3) : 0;
      piece.position.copy(home).lerp(onAnvil, goK); piece.position.y += Math.sin(goK * Math.PI) * 0.15 * (goK < 1 ? 1 : 0);
      piece.rotation.y = -0.35 + goK * 0.2;
      // el martillo: arriba, y cae cuando la pieza está en el yunque
      const hk = strikeT > 0 ? Math.max(0, 1 - strikeT / 0.15) : Math.max(0, 1 - (0.35 - Math.min(0.35, move)) * 4);
      HM.position.copy(onAnvil).add(tmp.set(0.12, 0.35 - hk * 0.33 * (move > 0 ? 1 : 0), 0.05)); HM.rotation.set(0, -0.35, -0.6 + hk * 0.6);
      HM.visible = move > 0;
      // colores: la pieza, las brasas y la luz del fuego
      heatColor(heat, col); ironM.emissive.copy(col); ironM.emissiveIntensity = THREE.MathUtils.smoothstep(heat, 0.25, 0.7) * 1.4 + flash * 0.4; ironM.color.copy(col).multiplyScalar(0.3);
      HH.coalM.emissiveIntensity = 0.5 + blowT * 1.6 + Math.sin(t * 9) * 0.08; glow.intensity = 2.2 + blowT * 4 + Math.sin(t * 11) * 0.3;
      BL.set(blowT);
      heatBar.style.width = Math.round(Math.min(1, heat / 1.15) * 100) + '%'; heatBar.style.background = '#' + col.getHexString();
      H.prog(hits / need);
    });
    H.time(seconds);
    H.o.state = () => ({ heat, stun: stun + (move > 0 ? 1 : 0), hits, burnt });
  });
}
