// El GLB del pelotari con todos sus movimientos, para entregar: los 4 de Meshy (Run, Walk, Slash, Fist) y, con nombre, los que el juego
// recorta de ellos (src/actors/glbChar.js, MESHY_BY.pelotari). Se hace en Chromium con el servidor de desarrollo, con el
// cargador y el exportador de three.js. uso: node tools/pelotari-glb.mjs <modelo: pelotari | pelotari_rojo> <salida.glb>
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'fs';
const [, , who = 'pelotari', out = 'pelotari.glb'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
await p.waitForFunction(() => window.__THREE, null, { timeout: 300000 });
const res = await p.evaluate(async (who) => {
  const THREE = window.__THREE;
  const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
  const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
  const g = await L.loadAsync(`/src/assets/meshy/${who}.glb`);
  const by = Object.fromEntries(g.animations.map(a => [a.name, a]));
  // (un tramo del clip, muestreado a 30 por segundo; ida y vuelta si se pide, y a la velocidad del juego)
  const corta = (src, name, t0, t1, ida = false, vel = 1, fps = 30) => {
    const clip = by[src], n = Math.max(2, Math.round((t1 - t0) * fps) + 1), tracks = [];
    for (const tr of clip.tracks) {
      const I = tr.createInterpolant(), vs = tr.getValueSize(), m = ida ? 2 * n - 1 : n, times = new Float32Array(m), values = new Float32Array(m * vs);
      for (let i = 0; i < m; i++) { const k = i < n ? i : 2 * n - 2 - i, t = t0 + (t1 - t0) * k / (n - 1); times[i] = (i * (t1 - t0) / (n - 1)) / vel; values.set(I.evaluate(t), i * vs); }
      tracks.push(new tr.constructor(tr.name, times, values));
    }
    const d = ((ida ? 2 : 1) * (t1 - t0)) / vel;
    return new THREE.AnimationClip(name, d, tracks);
  };
  // (los del juego: [nombre, clip de origen, desde, hasta, ida y vuelta, velocidad])
  const JUEGO = [['Reposo', 'Fist', 0, 0.1, true, 0.12], ['Preparado', 'Slash', 0.02, 0.12, true, 0.15], ['Golpe', 'Slash', 0.52, 1.25], ['Celebra', 'Fist', 0, 1.58],
    ['Saluda', 'Fist', 0.15, 1.4], ['Asustado', 'Slash', 1.1, 1.5], ['Recoge', 'Slash', 0.1, 0.4], ['Habla', 'Fist', 0, 0.12, true, 0.25]];
  const clips = [...g.animations.map(a => { const c = a.clone(); c.name = { Run: 'Correr', Walk: 'Andar', Slash: 'Golpe completo', Fist: 'Puño en alto' }[a.name] || a.name; return c; }),
    ...JUEGO.map(([n, s, a, z, ida, vel]) => corta(s, n, a, z, ida, vel))];
  g.scene.traverse(o => { if (o.material?.map) o.material.map.userData.mimeType = 'image/webp'; });
  const buf = await new GLTFExporter().parseAsync(g.scene, { binary: true, animations: clips, embedImages: true });
  const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), clips: clips.map(c => `${c.name} ${c.duration.toFixed(2)} s`) };
}, who);
writeFileSync(out, Buffer.from(res.b64, 'base64'));
console.log(JSON.stringify(res.clips));
await b.close();
