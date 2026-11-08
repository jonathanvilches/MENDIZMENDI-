// El GLB del pelotari con todos sus movimientos, para entregar: los de pelota (src/actors/pelotaMoves.js) y andar y correr
// de Meshy; o, con «base», el modelo sin movimientos, con su esqueleto, para animarlo en otro programa. Se hace en
// Chromium con el servidor de desarrollo, con el cargador y el exportador de three.js. uso: node tools/pelotari-glb.mjs <modelo: pelotari | pelotari_rojo> <salida.glb> [base]
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'fs';
const [, , who = 'pelotari', out = 'pelotari.glb', modo = ''] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
await p.waitForFunction(() => window.__THREE, null, { timeout: 300000 });
const res = await p.evaluate(async ({ who, base }) => {
  const THREE = window.__THREE;
  const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
  const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
  const g = await L.loadAsync(`/src/assets/meshy/${who}.glb`);
  // (los de pelota, hechos sobre su esqueleto en reposo: src/actors/pelotaMoves.js; y andar y correr, de Meshy. Con base,
  // sin ningún movimiento, para volver a animarlo en Meshy o en otro programa)
  const { pelotaMoves } = await import('/src/actors/pelotaMoves.js');
  const clips = base ? [] : [...g.animations.filter(a => a.name === 'Run' || a.name === 'Walk').map(a => { const c = a.clone(); c.name = a.name === 'Run' ? 'Correr' : 'Andar'; return c; }),
    ...pelotaMoves(g.scene, { archivo: true })];
  g.scene.traverse(o => { if (o.material?.map) o.material.map.userData.mimeType = 'image/webp'; });
  const buf = await new GLTFExporter().parseAsync(g.scene, { binary: true, animations: clips, embedImages: true });
  const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), clips: clips.map(c => `${c.name} ${c.duration.toFixed(2)} s`) };
}, { who, base: modo === 'base' });
writeFileSync(out, Buffer.from(res.b64, 'base64'));
console.log(JSON.stringify(res.clips));
await b.close();
