// Depura las piezas de una jugadora: dónde acaba cada una (con la piel aplicada) parada y corriendo
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const r = await p.evaluate(async () => {
  const T = window.__THREE, { makeCharacter } = await import('/src/game/futbol.js'), { TEAMS } = await import('/src/futbol/rules.js');
  const c = await makeCharacter({ team: TEAMS.osasuna, teamId: 'osasuna', side: 0, role: 'MC', num: 9, keeper: false, female: true });
  const out = {};
  for (const [tag, vel] of [['parada', 0], ['corriendo', 5]]) {
    c.anim.setSpeed(vel); for (let i = 0; i < 30; i++) c.anim.update(0.033); c.obj.updateMatrixWorld(true);
    const v = new T.Vector3(), rows = [];
    c.obj.traverse(o => { if (!o.isMesh) return; const P = o.geometry.attributes.position, bx = new T.Box3();
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); bx.expandByPoint(v); }
      rows.push([o.isSkinnedMesh ? 'S' : 'M', o.userData.traje ? 't' : '-', P.count, ...bx.min.toArray(), ...bx.max.toArray()].map(x => typeof x === 'number' ? +x.toFixed(2) : x).join(' ')); });
    out[tag] = rows;
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
