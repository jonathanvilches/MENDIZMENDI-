// Retratos de los botilleros que se eligen junto al pelotari (pelota/botilleroRetrato.js, BOTILLEROS): su figura del juego,
// una persona del público tal cual, con su ropa, en su reposo («Idle»), con fondo transparente: busto (256×256, para la
// burbuja y la charla) y cuerpo entero (320×480, para su carta). Salen en src/assets/pelota/botilleros.
// Uso, con el servidor de desarrollo en marcha: node tools/auditoria-retratos-botilleros.mjs   (URL=http://127.0.0.1:5176)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
const URL = process.env.URL || 'http://127.0.0.1:5176';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
if (process.env.DEBUG) p.on('response', r => { if (/\.glb/.test(r.url())) console.log(r.status(), r.headers()['content-type'], r.url()); });
// (en una página vacía del servidor de desarrollo, sin arrancar el juego: solo los módulos de los personajes)
await p.route(URL + '/retratos-botilleros.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
await p.addInitScript(() => { window.__WEB__ = true; window.__AF__ = false; window.__HDMAP__ = null; window.__VERSION__ = ''; });
await p.goto(URL + '/retratos-botilleros.html', { timeout: 300000 });
const out = await p.evaluate(async () => {
  const THREE = await import('/node_modules/three/build/three.module.js'), { loadMeshy, GlbChar } = await import('/src/actors/glbChar.js');
  const { BOTILLEROS } = await import('/src/pelota/botilleroRetrato.js');
  const res = {};
  for (const B of BOTILLEROS) {
    const g = await loadMeshy(B.persona, true), c = new GlbChar(g, {}); c.root.scale.setScalar(g.userData.fit);
    c.play('Idle', 0); for (let t = 0; t < 0.6; t += 0.05) c.update(0.05);
    const scene = new THREE.Scene(); scene.add(c.root);
    scene.add(new THREE.HemisphereLight('#fff8ee', '#5a5868', 2.1)); const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(1.6, 3, 4); scene.add(sun);
    const fill = new THREE.DirectionalLight('#cfe0ff', 0.8); fill.position.set(-3, 1.5, 2); scene.add(fill);
    c.root.rotation.y = 0.25; c.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c.root, true), H = box.max.y - box.min.y;
    for (const [name, w, h, y0, y1] of [['bust', 256, 256, 0.5, 1.04], ['full', 320, 480, -0.02, 1.04]]) {
      const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(w, h); R.setClearColor(0x000000, 0);
      R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping;
      const ya = box.min.y + H * y0, yb = box.min.y + H * y1, cam = new THREE.PerspectiveCamera(22, w / h, 0.1, 50), cy = (ya + yb) / 2, span = Math.max(yb - ya, (box.max.x - box.min.x) * h / w);
      const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(11)) * 1.02;
      cam.position.set(0, cy + span * 0.04, dist); cam.lookAt(0, cy, 0);
      R.render(scene, cam); res[`${B.id}${name === 'full' ? '-full' : ''}`] = R.domElement.toDataURL('image/png'); R.dispose();
    }
  }
  return res;
});
mkdirSync('src/assets/pelota/botilleros', { recursive: true });
for (const [k, v] of Object.entries(out)) {
  const png = `src/assets/pelota/botilleros/${k}.png`, webp = png.replace('.png', '.webp'); writeFileSync(png, Buffer.from(v.split(',')[1], 'base64'));
  // (en WebP con transparencia, con ffmpeg)
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '88', '-pix_fmt', 'yuva420p', webp]); unlinkSync(png);
  console.log(k);
}
await b.close();
