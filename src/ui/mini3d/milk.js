// Ordeñar a mano, en 3D: la vaca pirenaica en la cuadra, la ubre con sus cuatro tetillas, las dos manos que aprietan
// (una y otra, alternando con calma), el chorro de leche al cubo de metal que se va llenando y la espuma. Si se aprieta
// muy deprisa o con la misma mano, la vaca se revuelve (su animación de susto) y se pierde algo de leche.
import * as THREE from 'three';
import { ensureAnimal, buildAnimal } from '../../actors/animalGlb.js';
import { play3d, blip } from './play.js';
import { barn, bucket, stool, lathe, particles, tube } from './kit.js';

const SKIN = '#e8b48c', SLEEVE = '#3a5f8a';

/** Pone el animal mirando hacia «dir» (la cabeza hacia allí) y devuelve sus ejes. */
export function faceAlong(A, dir) {
  A.root.updateMatrixWorld(true);
  const head = A.root.getObjectByName('Head'), c = new THREE.Box3().setFromObject(A.root).getCenter(new THREE.Vector3());
  const hp = head ? head.getWorldPosition(new THREE.Vector3()) : c.clone().add(new THREE.Vector3(0, 0, 1));
  const cur = Math.atan2(hp.x - c.x, hp.z - c.z), want = Math.atan2(dir[0], dir[2]);
  A.root.rotation.y += want - cur; A.root.updateMatrixWorld(true);
  const fwd = new THREE.Vector3(dir[0], 0, dir[2]).normalize();
  return { fwd, side: new THREE.Vector3(fwd.z, 0, -fwd.x) };
}

function udder(S) {
  const g = new THREE.Group(), pink = S.mat('#e9b2a2', { roughness: 0.55 }), teatM = S.mat('#e09a8c', { roughness: 0.5 });
  const bag = S.mesh(lathe([[0.001, -0.115], [0.05, -0.112], [0.09, -0.09], [0.115, -0.05], [0.12, -0.01], [0.105, 0.02], [0.06, 0.035], [0.001, 0.04]], 36), pink, 0, 0, 0, g);
  bag.scale.set(1.15, 1, 1.05);
  const teats = [];
  for (const [x, z] of [[0.055, 0.05], [-0.055, 0.05], [0.055, -0.05], [-0.055, -0.05]]) {
    const t = new THREE.Group(); t.position.set(x, -0.1, z); g.add(t);
    S.mesh(new THREE.CapsuleGeometry(0.016, 0.05, 6, 14), teatM, 0, -0.035, 0, t);
    teats.push(t);
  }
  return { g, teats };
}
// una mano que agarra la tetilla: palma, cuatro dedos curvados alrededor, el pulgar y la manga de la camisa
function hand(S, mirror) {
  const g = new THREE.Group(), skin = S.mat(SKIN, { roughness: 0.6 });
  const palm = S.mesh(new THREE.SphereGeometry(1, 20, 14), skin, 0, -0.03, 0.03, g); palm.scale.set(0.034, 0.042, 0.02);
  const fingers = new THREE.Group(); g.add(fingers);
  for (let k = 0; k < 4; k++) {
    const y = -0.006 - k * 0.0155, arc = [];
    for (let i = 0; i <= 8; i++) { const a = -0.3 + i / 8 * 3.6; arc.push([Math.sin(a) * 0.026 * mirror, y - i * 0.0006, Math.cos(a) * 0.026]); }
    S.mesh(tube(arc, 0.0082 - k * 0.0006, 20, 8), skin, 0, 0, 0, fingers);
  }
  const thumb = S.mesh(new THREE.CapsuleGeometry(0.0085, 0.03, 4, 10), skin, -0.018 * mirror, 0.008, 0.024, g); thumb.rotation.set(0.4, 0, 1.2 * mirror);
  // el antebrazo viene hacia nosotros desde abajo y de lado (quien ordeña está sentado en el taburete, con los codos
  // más bajos que las manos): sale por las esquinas de abajo de la pantalla. La manga, torneada con sus pliegues
  const d = new THREE.Vector3(0.62 * mirror, -0.5, 1).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const w0 = new THREE.Vector3(0.006 * mirror, -0.03, 0.045);
  const wrist = S.mesh(lathe([[0.0, 0], [0.021, 0.0], [0.023, 0.03], [0.025, 0.06], [0.0, 0.062]], 18), skin, 0, 0, 0, g); wrist.position.copy(w0); wrist.quaternion.copy(q);
  const prof = [[0.0, 0], [0.03, 0], [0.036, 0.012], [0.033, 0.03]];
  for (let i = 1; i <= 20; i++) { const y = 0.03 + i * 0.075; prof.push([0.04 + i * 0.0028 + (i % 2 ? 0.004 : -0.002), y]); }
  prof.push([0.0, 0.03 + 21 * 0.075]);
  const sleeve = S.mesh(lathe(prof, 22), S.mat(SLEEVE, { roughness: 0.9 }), 0, 0, 0, g); sleeve.position.copy(w0).addScaledVector(d, 0.05); sleeve.quaternion.copy(q);
  const cuff = S.mesh(new THREE.TorusGeometry(0.035, 0.007, 10, 28), S.mat('#2c4a6c', { roughness: 0.85 }), 0, 0, 0, g); cuff.position.copy(w0).addScaledVector(d, 0.058); cuff.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  return { g, fingers };
}

export function milkGame(ui, { title = 'Ordeñar a mano', icon = 'milk', seconds = 18 } = {}) {
  return play3d(ui, { title, icon, hint: 'Aprieta una tetilla y luego la otra, alternando las manos y con calma: así baja la leche. Si repites mano o vas muy deprisa, la vaca se pone nerviosa.',
    buttons: '<button class="btn primary big" data-s="L">Mano izquierda</button><button class="btn primary big" data-s="R">Mano derecha</button>',
    stage: { bg: '#3a2c20', hemi: ['#ffe9c8', '#5a4632', 0.9], sun: { color: '#ffe0b8', intensity: 1.6, pos: [2.5, 4.5, 3.5], extent: 2.2 } } }, async (S, H, end, isOver) => {
    await ensureAnimal('cow');
    barn(S);
    const A = buildAnimal('cow'); if (!A) throw new Error('sin vaca');
    S.add(A.root); A.root.position.set(0, 0, 0);
    const { fwd, side } = faceAlong(A, [-1, 0, 0]);   // la cabeza hacia la izquierda; nosotros, a su costado
    A.play('Idle', 0);
    // la ubre: entre las patas de atrás, pegada a la barriga (se busca la barriga con un rayo desde abajo)
    A.root.updateMatrixWorld(true);
    const legs = ['BackUpperLeg.L', 'BackUpperLeg.R', 'BackLeg.L', 'BackLeg.R'].map(n => A.root.getObjectByName(n)).filter(Boolean);
    const mid = legs.reduce((a, b) => a.add(b.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, legs.length));
    const at = mid.clone().addScaledVector(fwd, 0.16); at.y = 0.05;
    const body = []; A.root.traverse(o => { if (o.isMesh) body.push(o); });
    const hit = new THREE.Raycaster(at.clone(), new THREE.Vector3(0, 1, 0)).intersectObjects(body, false)[0];
    const bellyY = hit ? hit.point.y : 0.75;
    const U = udder(S); U.g.position.set(at.x, bellyY - 0.02, at.z); U.g.rotation.y = A.root.rotation.y; S.add(U.g);
    const bones = []; A.root.traverse(o => { if (o.isBone && /Torso|Body|Back$/.test(o.name)) bones.push(o); });
    const near = bones.sort((a, b) => a.getWorldPosition(new THREE.Vector3()).distanceTo(U.g.position) - b.getWorldPosition(new THREE.Vector3()).distanceTo(U.g.position))[0];
    if (near) near.attach(U.g);
    // las manos en las dos tetillas de delante (las de nuestro lado)
    const teatW = (t) => t.getWorldPosition(new THREE.Vector3());
    U.g.updateMatrixWorld(true);
    const ours = [...U.teats].sort((a, b) => teatW(b).dot(side) - teatW(a).dot(side)).slice(0, 2).sort((a, b) => teatW(a).dot(fwd) - teatW(b).dot(fwd));
    const hands = { L: hand(S, -1), R: hand(S, 1) }, teatOf = { L: ours[1], R: ours[0] };
    // cada mano mira hacia nuestro lado (orientación en el mundo, pase lo que pase con los huesos de la vaca)
    const want = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(side.x, side.z));
    for (const s of ['L', 'R']) { const h = hands[s]; teatOf[s].add(h.g); h.g.quaternion.copy(teatOf[s].getWorldQuaternion(new THREE.Quaternion()).invert().multiply(want)); h.g.position.y = -0.012; }
    // el cubo debajo y el taburete
    const B = bucket(S, { r: 0.16, h: 0.3 }); const bp = U.g.getWorldPosition(new THREE.Vector3()); B.group.position.set(bp.x, 0.005, bp.z + side.z * 0.05); S.add(B.group);
    const st = stool(S); st.position.copy(bp).addScaledVector(side, 0.55).addScaledVector(fwd, 0.85); st.position.y = 0; S.add(st);   // a un lado, sin tapar
    // el chorro de leche y las gotas que salpican
    const streamM = S.mat('#fdfbf4', { roughness: 0.2, emissive: '#5a5a55' });
    const streams = { L: S.mesh(new THREE.CylinderGeometry(0.004, 0.0028, 1, 8, 1, true).translate(0, -0.5, 0), streamM), R: S.mesh(new THREE.CylinderGeometry(0.004, 0.0028, 1, 8, 1, true).translate(0, -0.5, 0), streamM) };
    for (const s of 'LR') { streams[s].visible = false; streams[s].castShadow = false; }
    const splash = particles(S, { geo: new THREE.SphereGeometry(0.006, 6, 4), color: '#ffffff', max: 80, gravity: -6, drag: 0.4 });
    // la cámara, a la altura de quien ordeña sentado en el taburete: un poco por debajo de la ubre, mirando arriba
    S.frame([bp.x, bellyY - 0.2, bp.z], 0.42, [side.x - fwd.x * 0.35, 0.05, side.z - fwd.z * 0.35], 40);

    let milk = 0, last = null, lastT = -1, t = 0, nerves = 0, react = 0;
    const sq = { L: 0, R: 0 }, flow = { L: 0, R: 0 };
    const press = (s) => {
      if (isOver()) return;
      const now = performance.now() / 1000;
      if (now - lastT < 0.16) { nerves = 1; milk = Math.max(0, milk - 3); H.fb.textContent = '¡Despacio! La vaca se mueve'; ui.sound?.ui?.('error'); lastT = now; if (react <= 0) { A.play('Idle_HitReact1', 0.1); react = 0.9; } return; }
      if (s === last) { H.fb.textContent = '¡Alterna! Ahora la otra mano'; blip(ui, 180); lastT = now; sq[s] = 0.5; return; }
      last = s; lastT = now; sq[s] = 1; flow[s] = 0.28; milk += 5.5; blip(ui, 520 + milk * 2);
      H.fb.textContent = milk < 40 ? '¡Bien! Sigue alternando' : milk < 80 ? 'El cubo se llena…' : '¡Ya casi!';
      ui.onMiniHit?.(true);
      if (milk >= 100) end({ win: true }, '¡Cubo lleno! Leche fresca para el queso');
    };
    H.o.querySelectorAll('[data-s]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); press(b.dataset.s); }));
    // tocar la escena: la mitad izquierda de la pantalla es la mano izquierda y la derecha, la derecha
    H.cap.addEventListener('pointerdown', e => press(e.clientX < innerWidth / 2 ? 'L' : 'R'));
    H.keys((e) => { const k = e.key.toLowerCase(); if (['a', 'arrowleft', 'j'].includes(k)) press('L'); if (['d', 'arrowright', 'k', 'l'].includes(k)) press('R'); });
    const tip = new THREE.Vector3();
    S.every((dt) => {
      A.mixer.update(dt);
      if (react > 0 && (react -= dt) <= 0) A.play('Idle', 0.3);
      if (!isOver()) { t += dt; H.time(seconds - t); if (t >= seconds) end({ win: false }, 'Se acabó el tiempo. ¡Con más ritmo la próxima vez!'); }
      nerves = Math.max(0, nerves - dt * 1.5);
      for (const s of 'LR') {
        sq[s] = Math.max(0, sq[s] - dt * 5); flow[s] = Math.max(0, flow[s] - dt);
        const k = sq[s], h = hands[s];
        h.fingers.scale.set(1 - k * 0.14, 1, 1 - k * 0.14); teatOf[s].children[0].scale.set(1 - k * 0.18, 1 - k * 0.08, 1 - k * 0.18);
        const st2 = streams[s];
        if (flow[s] > 0) {
          teatOf[s].children[0].getWorldPosition(tip); tip.y -= 0.06;
          const len = Math.max(0.01, tip.y - (B.group.position.y + B.surfaceY)); st2.visible = true; st2.position.copy(tip); st2.scale.set(1, len * Math.min(1, (0.28 - flow[s]) * 9 + 0.15), 1);
          if (Math.random() < dt * 30) splash.emit([B.group.position.x + (Math.random() - 0.5) * 0.04, B.group.position.y + B.surfaceY + 0.01, B.group.position.z + (Math.random() - 0.5) * 0.04], 2, { speed: 0.8, spread: 1.4, life: 0.4, size: 1 });
        } else st2.visible = false;
      }
      B.setLevel(Math.min(1, milk / 100) * 0.9);
      B.group.position.x = bp.x + (nerves ? Math.sin(t * 50) * 0.01 * nerves : 0);
      H.prog(milk / 100);
    });
    H.time(seconds);
    // para las pruebas automáticas
    H.o.state = () => ({ milk, t });
  });
}
