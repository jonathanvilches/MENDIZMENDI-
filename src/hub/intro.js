// Intro cinemática al abrir el juego: la historia del Pasaporte Mendi contada en 3D
// (vuelo de cámara sobre los dioramas de varias comarcas, bandas de cine y narración).
import * as THREE from 'three';
import { buildDiorama } from './diorama.js';
import { buildMinifig, MinifigAnimator, COSTUMES } from '../actors/minifig.js';

const SHOTS = [
  { c: 'pirineo', from: [40, 60, 120], to: [10, 30, 40], look: [0, 25, -200], k: 'Navarra', t: 'Hace mucho tiempo, cada pueblo de Navarra guardaba un sello en su plaza. Quien lo conseguía se llevaba un pedacito de su historia.' },
  { c: 'bidasoa', from: [-30, 14, 30], to: [12, 9, 6], look: [0, 6, -60], k: 'La tormenta', ex: 0.45, t: 'Pero una noche de tormenta, el viento del Pirineo arrancó las páginas del viejo Pasaporte Mendi… y los sellos volvieron a sus pueblos.' },
  { c: 'ribera', from: [0, 30, 60], to: [-8, 12, 18], look: [0, 4, -60], k: 'La promesa', t: 'Dicen que sólo los devolverán a quien ayude a su gente, aprenda sus oficios, baile sus danzas y escuche sus leyendas.' },
  { c: 'pirineo', from: [18, 8, 14], to: [4, 2.6, 6], look: [0, 1.4, 0], k: 'Muskilda', t: 'Y en Otsagabia, la Virgen de Muskilda perdió sus ocho cintas de colores. Sin ellas no hay fiesta…', ribbons: true },
  { c: 'bidasoa', from: [2, 3, 9], to: [0.6, 1.3, 4.2], look: [0, 1.1, 0], k: 'Tu aventura', t: 'Tu cuadrilla te espera. Ha llegado la hora de recorrer Navarra, pueblo a pueblo. ¿Preparado?', hero: true },
];

export function playIntro({ avatar = 'leire', sound } = {}) {
  return new Promise((res) => {
    const o = document.createElement('div'); o.className = 'cine-intro';
    o.innerHTML = `<canvas></canvas><div class="ci-bar top"></div><div class="ci-bar bot"></div>
      <div class="ci-text"><small></small><p></p></div><div class="ci-dots">${SHOTS.map(() => '<i></i>').join('')}</div>
      <button class="ci-skip">Saltar ▸▸</button>`;
    document.body.appendChild(o);
    const cv = o.querySelector('canvas');
    let R;
    try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { o.remove(); return res(); }
    R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    const scenes = {};
    const getScene = (c) => scenes[c] ||= buildDiorama(c, { live: true });
    // personaje y cintas de colores para los planos cercanos
    const fig = buildMinifig(COSTUMES[avatar] || COSTUMES.leire, { hero: true }); const anim = new MinifigAnimator(fig);
    const ribbons = new THREE.Group();
    ['#e03c3c', '#f2c230', '#f4f1ea', '#3ca05a', '#3a8fd6', '#ff8c42', '#9b59d0', '#ff7eb6'].forEach((c, i) => {
      const geo = new THREE.PlaneGeometry(0.12, 1.4, 1, 12); geo.translate(0, -0.7, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.6, emissive: c, emissiveIntensity: 0.25 }));
      m.userData.ph = i * 0.8; m.userData.a = i / 8 * Math.PI * 2; ribbons.add(m);
    });
    let i = -1, t = 0, cur = null, done = false, last = performance.now();
    const text = o.querySelector('.ci-text p'), kick = o.querySelector('.ci-text small'), dots = o.querySelectorAll('.ci-dots i');
    const DUR = 7.2;
    const next = () => {
      i++; t = 0;
      if (i >= SHOTS.length) return finish();
      const S = SHOTS[i];
      if (cur) { cur.scene.remove(fig); cur.scene.remove(ribbons); }
      cur = getScene(S.c);
      if (S.hero) { fig.position.set(0, 0, 0); fig.rotation.y = 0.35; cur.scene.add(fig); }
      if (S.ribbons) { ribbons.position.set(0, 2.2, 0); cur.scene.add(ribbons); }
      R.toneMappingExposure = S.ex || 1;
      kick.textContent = S.k; text.textContent = ''; o.querySelector('.ci-text').classList.remove('in'); void o.offsetWidth; o.querySelector('.ci-text').classList.add('in');
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
      o.classList.add('cut'); setTimeout(() => o.classList.remove('cut'), 450);
      let n = 0; clearInterval(o.tw); o.tw = setInterval(() => { n += 2; text.textContent = S.t.slice(0, n); if (n >= S.t.length) clearInterval(o.tw); }, 28);
    };
    const finish = () => {
      if (done) return; done = true; clearInterval(o.tw);
      o.classList.add('out');
      setTimeout(() => { o.remove(); R.dispose(); for (const D of Object.values(scenes)) D.scene.traverse(x => x.geometry?.dispose?.()); res(); }, 600);
    };
    const skip = (e) => { e?.stopPropagation(); sound?.ui?.('click'); finish(); };
    o.querySelector('.ci-skip').onclick = skip;
    o.addEventListener('pointerdown', (e) => { if (e.target.closest('.ci-skip')) return; if (t > 1.2) next(); });
    const key = (e) => { if (e.key === 'Escape') skip(); else if (e.key === ' ' || e.key === 'Enter') next(); };
    addEventListener('keydown', key);
    const loop = (now) => {
      if (done) { removeEventListener('keydown', key); return; }
      requestAnimationFrame(loop);
      const real = Math.min(0.5, (now - last) / 1000), dt = Math.min(0.05, real); last = now; t += real;
      const w = innerWidth, h = innerHeight;
      if (cv.width !== Math.round(w * R.getPixelRatio())) { R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1 ? 55 : 40; cam.updateProjectionMatrix(); }
      if (t > DUR) next();
      if (done || !cur) return;
      const S = SHOTS[i], k = Math.min(1, t / DUR), e = k * k * (3 - 2 * k);
      cam.position.set(S.from[0] + (S.to[0] - S.from[0]) * e, S.from[1] + (S.to[1] - S.from[1]) * e, S.from[2] + (S.to[2] - S.from[2]) * e);
      cam.lookAt(S.look[0], S.look[1], S.look[2]);
      cur.update(dt);
      if (S.hero) anim.update(dt, { speed: 0, grounded: true, wave: t > 2.5 && t < 4.5 ? 1 : 0 });
      if (S.ribbons) ribbons.children.forEach(m => { const a = m.userData.a + t * 0.5; m.position.set(Math.cos(a) * 1.1, Math.sin(t * 1.5 + m.userData.ph) * 0.2, Math.sin(a) * 1.1); m.rotation.set(Math.sin(t * 2 + m.userData.ph) * 0.3, -a, Math.sin(t * 3 + m.userData.ph) * 0.2); });
      R.render(cur.scene, cam);
    };
    next(); requestAnimationFrame(loop);
  });
}
