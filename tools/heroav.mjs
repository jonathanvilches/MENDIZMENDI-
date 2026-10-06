// Personajes para la portada del menú (estilo portada de videojuego): cada personaje elegible en grande, de las
// rodillas para arriba, con luz de atardecer (sol dorado de lado, contraluz cálido y relleno frío), como las vistas
// de las comarcas (tools/comarcakey.mjs), y fondo transparente. Sale src/assets/portadas/heroe/av-<personaje>.webp.
// Uso: node tools/heroav.mjs [personaje,…]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const who = (process.argv[2] || 'sanfermin,pastor,osasuna,pelotari').split(','), W = 900, H = 1400;
mkdirSync('src/assets/portadas/heroe', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(URL + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__THREE, null, { timeout: 300000 });
for (const id of who) {
  const url = await p.evaluate(async ([id, W, H]) => {
    const THREE = window.__THREE, { loadMeshy, GlbChar } = await import('/src/actors/glbChar.js');
    const g = await loadMeshy(id), c = new GlbChar(g, {}); c.root.scale.setScalar(g.userData.fit);
    c.play('Idle', 0); c.update(0.6);
    const scene = new THREE.Scene(); scene.add(c.root);
    scene.add(new THREE.HemisphereLight('#ffd9a8', '#3a3f66', 1.5));
    const key = new THREE.DirectionalLight('#ffc27a', 3.0); key.position.set(3, 2.2, 2.5); scene.add(key);       // sol bajo de lado
    const rim = new THREE.DirectionalLight('#ffb060', 4.5); rim.position.set(-2.5, 2.5, -3); scene.add(rim);     // contraluz
    const fill = new THREE.DirectionalLight('#9fb8ff', 0.9); fill.position.set(-3, 1, 3); scene.add(fill);      // relleno frío
    c.root.rotation.y = 0.35; c.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c.root), h = box.max.y - box.min.y;
    const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setClearColor(0, 0);
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    // de debajo de las rodillas a encima de la cabeza, con la cámara algo baja (el personaje se ve más heroico)
    const ya = box.min.y + h * 0.2, yb = box.max.y + h * 0.04, cy = (ya + yb) / 2, span = yb - ya;
    const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 50), dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(12)) * 1.0;
    cam.position.set(0, cy - span * 0.1, dist); cam.lookAt(0, cy, 0);
    R.render(scene, cam); const u = R.domElement.toDataURL('image/png'); R.dispose(); return u;
  }, [id, W, H]);
  const f = `/tmp/heroav-${id}.png`; writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  console.log('·', id);
}
await b.close();
// se pasan al proyecto al final (si se escriben antes, el servidor de desarrollo recarga la página a medias)
for (const id of who) execFileSync('python3', ['-c', `from PIL import Image; Image.open('/tmp/heroav-${id}.png').save('src/assets/portadas/heroe/av-${id}.webp', 'WEBP', quality=86, alpha_quality=90, method=6)`]);
