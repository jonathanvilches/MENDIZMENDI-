// Depura una pieza con piel de un traje: posición en reposo, huesos, pesos y dónde acaba con la piel aplicada
import { chromium } from 'playwright-core';
const [,, name = 'joaldun', which = '164'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const r = await p.evaluate(async ([name, which]) => {
  const G = window.__game, T = window.__THREE, { Actor } = await import('/src/actors/people.js'), { FOLK } = await import('/src/game/townGame.js');
  const a = new Actor({ id: 'tr', name, x: 0, z: 0, heading: 0, look: FOLK[name] }, G.scene); a.wander = 0;
  a.obj.updateMatrixWorld(true);
  let body = null, sk = null; a.obj.traverse(o => { if (o.isSkinnedMesh && !o.userData.traje && !body) body = o; if (o.isSkinnedMesh && o.userData.traje && o.geometry.attributes.position.count == which && !sk) sk = o; });
  const out = { bodyBind: body.bindMode, skBind: sk.bindMode, sameSkel: body.skeleton === sk.skeleton, bodyMW: body.matrixWorld.elements.map(x => +x.toFixed(3)), skMW: sk.matrixWorld.elements.map(x => +x.toFixed(3)),
    bodyBM: body.bindMatrix.elements.map(x => +x.toFixed(3)), skBM: sk.bindMatrix.elements.map(x => +x.toFixed(3)), parentSame: body.parent === sk.parent, posAttr: sk.geometry.attributes.position.array.constructor.name, verts: [] };
  const P = sk.geometry.attributes.position, SI = sk.geometry.attributes.skinIndex, SW = sk.geometry.attributes.skinWeight, v = new T.Vector3();
  for (const i of [0, 3, 80, 163]) { v.fromBufferAttribute(P, i); const rest = v.toArray().map(x => +x.toFixed(3)); sk.applyBoneTransform(i, v); out.verts.push({ i, rest, idx: [0, 1, 2, 3].map(k => SI.getComponent(i, k)), w: [0, 1, 2, 3].map(k => +SW.getComponent(i, k).toFixed(2)), names: [0, 1, 2].map(k => sk.skeleton.bones[SI.getComponent(i, k)]?.name), skinned: v.toArray().map(x => +x.toFixed(3)) }); }
  // un vértice del cuerpo a la altura de la cintura
  const BP = body.geometry.attributes.position; for (let i = 0; i < BP.count; i++) { v.fromBufferAttribute(BP, i); if (Math.abs(v.y + 0.11) < 0.01 && v.z > 0.15) { const rest = v.toArray().map(x => +x.toFixed(3)); body.applyBoneTransform(i, v); out.bodyV = { rest, skinned: v.toArray().map(x => +x.toFixed(3)), idx: [0, 1, 2, 3].map(k => body.geometry.attributes.skinIndex.getComponent(i, k)) }; break; } }
  return out;
}, [name, which]);
console.log(JSON.stringify(r, null, 1));
await b.close();
