// Hoja de contactos de un personaje GLB: cada clip en varias fases, de frente y de lado, para revisarlo de un vistazo.
// Uso: node tools/glb-hoja.mjs <url del glb en el servidor> <salida.png> [altura en m]
import { chromium } from 'playwright-core';
const [,, glb, out = '/tmp/claude-0/hoja.png', H = '1.5'] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(([c, n]) => { window.__clip = c; window.__nf = n; }, [process.env.CLIP || '', +(process.env.N || 0)]);
await p.goto(URL + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__THREE, null, { timeout: 300000 });
const info = await p.evaluate(async ({ glb, H }) => {
  const THREE = window.__THREE;
  const { loadChar } = await import('/src/actors/glbChar.js');
  const g = await loadChar(glb);
  document.body.innerHTML = ''; document.body.style.background = '#2a2a33';
  const only = window.__clip, nf = window.__nf || 6, cols = only ? 10 : 6, cw = only ? 140 : 220, ch = only ? 190 : 300, clips = only ? Array.from({ length: Math.ceil(nf / 10) }, () => g.animations.find(c => c.name === only)) : g.animations, rows = clips.length;
  const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(cols * cw, rows * ch); R.setScissorTest(true);
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping;
  document.body.appendChild(R.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#3a3a46');
  scene.add(new THREE.HemisphereLight('#ffffff', '#606070', 2.0)); const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(2, 4, 3); scene.add(sun);
  scene.add(g.scene);
  const box = new THREE.Box3().setFromObject(g.scene), h = box.max.y - box.min.y, k = (+H) / h; g.scene.scale.setScalar(k);
  const mixer = new THREE.AnimationMixer(g.scene);
  const cam = new THREE.PerspectiveCamera(30, cw / ch, 0.1, 50);
  const res = { height: h.toFixed(3), clips: clips.map(c => c.name + ' ' + c.duration.toFixed(2) + 's') };
  rows && clips.forEach((clip, r) => {
    const a = mixer.clipAction(clip); mixer.stopAllAction(); a.reset().play();
    for (let c = 0; c < cols; c++) {
      const side = !only && c >= 4, t = only ? (r * 10 + c) / nf * clip.duration : side ? (c - 4 + 0.5) / 2 * clip.duration : c / 4 * clip.duration;
      a.time = t; mixer.update(0);
      const ang = side ? Math.PI / 2 : 0.35;
      cam.position.set(Math.sin(ang) * 4.6, 0.85 * +H / 1.5 + 0.1, Math.cos(ang) * 4.6); cam.lookAt(0, 0.75 * +H / 1.5, 0);
      const y = (rows - 1 - r) * ch; R.setViewport(c * cw, y, cw, ch); R.setScissor(c * cw, y, cw, ch); R.render(scene, cam);
    }
  });
  window.__hoja = R.domElement.toDataURL('image/png');
  return res;
}, { glb, H });
const data = await p.evaluate(() => window.__hoja);
const fs = await import('fs'); fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(JSON.stringify(info));
await b.close();
