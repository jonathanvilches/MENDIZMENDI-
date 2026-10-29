// Depura qué tapa un punto de la cara de un traje: lanza un rayo de frente a la altura de los ojos y lista lo que toca
// Uso: node tools/trajes/rayo.mjs <traje> [x] [y]   (x, y en fracción de la altura del modelo; por defecto el ojo derecho)
import { chromium } from 'playwright-core';
const [,, name = 'zipotero', fx = '0.055', fy = '0.787'] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const r = await p.evaluate(async ([name, fx, fy]) => {
  const G = window.__game, T = window.__THREE, { Actor } = await import('/src/actors/people.js'), { FOLK } = await import('/src/game/townGame.js');
  const a = new Actor({ id: 'tr', name, x: 0, z: 0, heading: 0, look: FOLK[name] }, G.scene); a.wander = 0; a.obj.updateMatrixWorld(true);
  let body = null; a.obj.traverse(o => { if (o.isSkinnedMesh && !o.userData.traje && !body) body = o; });
  const bb = body.geometry.boundingBox, H = bb.max.y - bb.min.y;
  // el punto en reposo, llevado a donde está ahora con la piel (el vértice del cuerpo más cercano)
  const P = body.geometry.attributes.position, v = new T.Vector3(), tgt = new T.Vector3(fx * H, bb.min.y + fy * H, 0); let best = -1, bd = 1e9;
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.z < 0) continue; const d = Math.hypot(v.x - tgt.x, v.y - tgt.y); if (d < bd) { bd = d; best = i; } }
  v.fromBufferAttribute(P, best); const rest = v.clone(); body.applyBoneTransform(best, v); v.applyMatrix4(body.matrixWorld);
  const ray = new T.Raycaster(new T.Vector3(v.x, v.y, v.z + 2), new T.Vector3(0, 0, -1));
  const hits = ray.intersectObject(a.obj, true).slice(0, 6).map(h => ({ traje: !!h.object.userData.traje, dist: +h.distance.toFixed(4), uv: h.uv ? [+h.uv.x.toFixed(3), +h.uv.y.toFixed(3)] : null, alphaTest: h.object.material.alphaTest, mapKey: h.object.material.map?.image?.width }));
  return { H, restZ: +(rest.z / H).toFixed(3), restY: +((rest.y - bb.min.y) / H).toFixed(3), hits };
}, [name, +fx, +fy]);
console.log(JSON.stringify(r, null, 1));
await b.close();
