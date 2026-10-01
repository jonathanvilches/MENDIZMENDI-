// Retratos (busto 256×256 y cuerpo entero 256×384, fondo transparente) de los avatares KayKit con su ropa propia.
// Uso: node tools/kkportraits.mjs [id …]   (por defecto benat nerea haritz) → src/assets/kaykit/portraits/<id>_bust|full.png
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['benat', 'nerea', 'haritz'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 400, height: 400 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://127.0.0.1:5173/lab/trajes.html', { timeout: 300000 });
const outs = {};
for (const id of ids) {
  const out = outs[id] = await p.evaluate(async (id) => {
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
    const G = await import('/src/actors/glbChar.js');
    const def = G.GLB_AVATARS[id], gltf = await G.loadGlbAvatar(id), rig = new G.GlbRig(gltf, id);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#6a5a4a', 1.7));
    const key = new THREE.DirectionalLight('#fff2dc', 2.3); key.position.set(1.5, 2.5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight('#9fd0ff', 1.1); rim.position.set(-2, 1.5, -2); scene.add(rim);
    rig.char.root.rotation.y = 0.3; rig.update(0.4, 0, true, 0); scene.add(rig.obj); rig.obj.updateMatrixWorld(true);
    const box = new THREE.Box3(), t = new THREE.Box3();
    rig.obj.traverse(o => { if (!o.isMesh || !o.visible) return; if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); t.copy(o.boundingBox); } else { o.geometry.computeBoundingBox(); t.copy(o.geometry.boundingBox); } box.union(t.applyMatrix4(o.matrixWorld)); });
    let head = null; rig.obj.traverse(o => { if (o.isBone && o.name === 'head') head = o; });
    const hp = new THREE.Vector3().setFromMatrixPosition(head.matrixWorld), H = box.max.y - box.min.y;
    const shot = (w, h, bust) => {
      const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(w, h); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.setClearColor(0, 0);
      const cam = new THREE.PerspectiveCamera(24, w / h, 0.05, 50);
      if (bust) { const cy = box.max.y - H * 0.29, d = H * 1.5; cam.position.set(d * 0.08, cy + d * 0.03, d); cam.lookAt(0, cy, 0); }
      else { const cy = (box.max.y + box.min.y) / 2, d = H * 2.75; cam.position.set(d * 0.08, cy + d * 0.05, d); cam.lookAt(0, cy, 0); }
      R.render(scene, cam); const u = R.domElement.toDataURL('image/png'); R.dispose(); return u;
    };
    return { bust: shot(256, 256, true), full: shot(256, 384, false) };
  }, id);
  console.log('retrato', id);
}
// se escriben al final: escribir en src/assets recarga la página de Vite
for (const [id, out] of Object.entries(outs)) for (const k of ['bust', 'full']) writeFileSync(`src/assets/kaykit/portraits/${id}_${k}.png`, Buffer.from(out[k].split(',')[1], 'base64'));
await browser.close();
