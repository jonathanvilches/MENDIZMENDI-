import * as THREE from 'three';
import { buildMinifig, COSTUMES, MinifigAnimator, lookToMinifig } from '../src/actors/minifig.js';
const q = new URLSearchParams(location.search);
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(innerWidth, innerHeight); r.shadowMap.enabled = true;
r.toneMapping = THREE.ACESFilmicToneMapping; document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#9cc3e0');
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
scene.add(new THREE.HemisphereLight('#dfefff', '#5a6a4a', 1.4));
const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(4, 8, 6); sun.castShadow = true; sun.shadow.camera.left = -10; sun.shadow.camera.right = 10; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#7ea35a' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const mode = q.get('mode') || 'lineup';
const figs = [];
const looks = mode === 'npc' ? JSON.parse(decodeURIComponent(q.get('looks') || '[]')).map(lookToMinifig) : Object.values(COSTUMES);
looks.forEach((c, i) => { const f = buildMinifig(c, { hero: mode === 'close' }); f.position.x = (i - (looks.length - 1) / 2) * 1.25; if (q.get('back')) f.rotation.y = Math.PI; scene.add(f); figs.push({ f, a: new MinifigAnimator(f) }); });
const speed = +(q.get('speed') || 0), fr = +(q.get('t') || 0);
const view = q.get('view');
if (mode === 'close') { figs.forEach((o, j) => { o.f.visible = j === +(q.get('i') || 0); o.f.position.x = 0; }); const i = +(q.get('i') || 0); cam.position.set(view === 'side' ? 3.2 : view === 'back' ? -0.9 : 0.8, view === 'back' ? 1.5 : 1.1, view === 'side' ? 0 : view === 'back' ? -3.0 : 3.1); cam.lookAt(0, 0.78, 0); }
else { cam.position.set(0, 1.4, looks.length > 6 ? 15 : 7); cam.lookAt(0, 0.8, 0); }
if (q.get('face')) { const i = +(q.get('i') || 0); cam.position.set(figs[i].f.position.x, 1.45, 1.4); cam.lookAt(figs[i].f.position.x, 1.42, 0); }
for (const { a } of figs) { a.t = 0; a.phase = 0; a.blinkT = 99; }
for (let s = 0; s < 60 + fr; s++) for (const { a } of figs) a.update(1 / 60, { speed, grounded: true, turnRate: 0, talking: q.get('talk') ? 1 : 0 });
r.render(scene, cam); window.__ready = true;
