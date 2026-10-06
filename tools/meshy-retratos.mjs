// Retratos de un personaje de Meshy para el selector y los diálogos: busto (256×256) y cuerpo entero (256×384) con
// fondo transparente, en su pose de reposo; y el de la portada del menú (cuerpo entero a 512×768, en WebP).
// Uso: node tools/meshy-retratos.mjs [personaje]   (SOLO=hero para hacer solo alguno: bust, full, hero)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
const [,, who = 'sanfermin'] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(URL + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__THREE, null, { timeout: 300000 });
const SIZES = [['bust', 256, 256, 0.47, 1.1], ['full', 256, 384, -0.03, 1.07], ['hero', 512, 768, -0.03, 1.07]].filter(s => !process.env.SOLO || process.env.SOLO.split(',').includes(s[0]));
const out = await p.evaluate(async ([who, SIZES]) => {
  const THREE = window.__THREE, { loadMeshy, GlbChar } = await import('/src/actors/glbChar.js');
  const g = await loadMeshy(who), c = new GlbChar(g, {}); c.root.scale.setScalar(g.userData.fit);
  c.play('Idle', 0); c.update(0.6);
  const scene = new THREE.Scene(); scene.add(c.root);
  scene.add(new THREE.HemisphereLight('#fff8ee', '#5a5868', 2.1)); const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(1.6, 3, 4); scene.add(sun);
  const fill = new THREE.DirectionalLight('#cfe0ff', 0.8); fill.position.set(-3, 1.5, 2); scene.add(fill);
  c.root.rotation.y = 0.3; c.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(c.root), H = box.max.y - box.min.y;
  const res = {};
  for (const [name, w, h, y0, y1] of SIZES) {
    const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(w, h); R.setClearColor(0x000000, 0);
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping;
    const cam = new THREE.PerspectiveCamera(22, w / h, 0.1, 50), ya = box.min.y + H * y0, yb = box.min.y + H * y1, cy = (ya + yb) / 2, span = yb - ya;
    const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(11)) * 1.02;
    cam.position.set(0, cy + span * 0.04, dist); cam.lookAt(0, cy, 0);
    R.render(scene, cam); res[name] = R.domElement.toDataURL('image/png'); R.dispose();
  }
  return res;
}, [who, SIZES]);
for (const [k, v] of Object.entries(out)) {
  const f = `src/assets/meshy/portraits/${who}_${k}.png`; writeFileSync(f, Buffer.from(v.split(',')[1], 'base64'));
  // en WebP con transparencia (pesa la sexta parte que el PNG)
  execFileSync('python3', ['-c', `from PIL import Image; import os; Image.open('${f}').save('${f.replace('.png', '.webp')}', 'WEBP', quality=90, alpha_quality=90, method=6); os.remove('${f}')`]);
  console.log(who + '_' + k);
}
await b.close();
