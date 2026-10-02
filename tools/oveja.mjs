// La oveja latxa de cerca (de lado y de frente), para revisar su vellón de lana y que no lleve cuernos.
// Uso: node tools/oveja.mjs [salida.png]
import { chromium } from 'playwright-core';
const [,, out = '/tmp/claude-0/oveja.png'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 400 } }); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log(m.text().slice(0, 300)); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const shots = await p.evaluate(async () => {
  const THREE = window.__THREE, A = await import('/src/actors/animalGlb.js'); await A.ensureAnimal('sheep');
  const s = new THREE.Scene(); s.background = new THREE.Color('#8fb56a'); s.add(new THREE.HemisphereLight('#fff6e0', '#5a6a4a', 1.8)); const d = new THREE.DirectionalLight('#fff', 2.4); d.position.set(3, 5, 4); s.add(d);
  const sh = A.buildAnimal('sheep'); s.add(sh.root); sh.update(0.5, { speed: 0, graze: false });
  const R = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true }); R.setSize(400, 400); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const res = [];
  for (const [x, z] of [[2.2, 0.6], [0.4, 2.2]]) { const c = new THREE.PerspectiveCamera(32, 1, 0.05, 50); c.position.set(x, 0.9, z); c.lookAt(0, 0.6, 0); R.render(s, c); res.push(R.domElement.toDataURL()); }
  return res;
});
const fs = await import('fs'); shots.forEach((s, i) => fs.writeFileSync(`/tmp/claude-0/oveja${i}.png`, Buffer.from(s.split(',')[1], 'base64')));
const { execSync } = await import('child_process');
execSync(`python3 -c "
from PIL import Image
a=Image.open('/tmp/claude-0/oveja0.png'); b=Image.open('/tmp/claude-0/oveja1.png')
c=Image.new('RGB',(800,400)); c.paste(a,(0,0)); c.paste(b,(400,0)); c.save('${out}')"`);
await b.close(); console.log('hecho', out);
