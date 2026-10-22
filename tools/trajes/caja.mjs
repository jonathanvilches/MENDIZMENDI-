// Mide cada pieza de un traje: caja en reposo y caja con la piel aplicada (posición real)
import { chromium } from 'playwright-core';
const [,, name = 'joaldun'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const r = await p.evaluate(async (name) => {
  const G = window.__game, T = window.__THREE, { Actor } = await import('/src/actors/people.js'), { FOLK } = await import('/src/game/townGame.js');
  const a = new Actor({ id: 'tr', name, x: 0, z: 0, heading: 0, look: FOLK[name] }, G.scene); a.wander = 0;
  a.obj.updateMatrixWorld(true);
  const out = []; const v = new T.Vector3();
  a.obj.traverse(o => { if (!o.isMesh) return; const g = o.geometry, P = g.attributes.position; const bx = new T.Box3();
    for (let i = 0; i < P.count; i += Math.max(1, P.count / 400 | 0)) { v.fromBufferAttribute(P, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); bx.expandByPoint(v); }
    out.push([o.isSkinnedMesh ? 'S' : 'M', o.userData.traje ? 't' : '-', P.count, ...bx.min.toArray().map(x => +x.toFixed(2)), ...bx.max.toArray().map(x => +x.toFixed(2))].join(' ')); });
  return out;
}, name);
console.log(r.join('\n'));
await b.close();
