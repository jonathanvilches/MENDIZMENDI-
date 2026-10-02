// ¿Se ve el jugador al empezar? En cada pueblo: el modelo cargado y visible, dentro del encuadre de la cámara, a una
// distancia normal y sin nada del pueblo tapándolo. Saca una foto por pueblo. Uso: node tools/jugador.mjs [pueblos] [carpeta] [avatar]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, only, out = '/tmp/claude-0/jugador', avatar = 'ranger'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p0 = await b.newPage(); await p0.goto('http://127.0.0.1:5173/', { timeout: 300000 });
const ids = only ? only.split(',') : await p0.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.filter(l => !l.special).map(l => l.id));
await p0.close();
const malos = [];
for (const id of ids) {
  const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.addInitScript((av) => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, avatar: av, seen: { heroBenat: true, dog: true } })); }, avatar);
  try {
    await p.goto(`http://127.0.0.1:5173/?town=${id}&q=low`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const G = window.__game, rt = window.__rt, T = window.__THREE, P = G.player, o = P.obj, cam = rt.camera;
      let meshes = 0, hidden = false; o.traverse(m => { if (m.isMesh && m.visible) meshes++; }); for (let n = o; n; n = n.parent) if (!n.visible) hidden = true;
      const c = P.pos.clone(); c.y += 0.9; const ndc = c.clone().project(cam), inView = Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1;
      const d = cam.position.distanceTo(c);
      // ¿algo tapa? rayo de la cámara al pecho del jugador contra la escena (salvo el propio jugador y lo transparente)
      const ray = new T.Raycaster(cam.position, c.clone().sub(cam.position).normalize(), 0.1, d - 0.4);
      const objs = []; rt.scene.traverseVisible(m => { if (m.isMesh && !m.isSkinnedMesh && !m.isInstancedMesh && m.geometry?.attributes.position?.array && !m.material?.transparent) { let mine = false; for (let n = m; n; n = n.parent) if (n === o) mine = true; if (!mine) objs.push(m); } });
      const hit = ray.intersectObjects(objs, false)[0];
      return { mallas: meshes, oculto: hidden, enCuadro: inView, dist: +d.toFixed(1), tapa: hit ? (hit.object.name || hit.object.parent?.name || hit.object.type) + ' a ' + hit.distance.toFixed(1) + ' m' : null, rig: P.rig?.constructor?.name, suelo: +(P.pos.y - window.__hf.groundHeight(P.pos.x, P.pos.z)).toFixed(2) };
    });
    await p.screenshot({ path: `${out}/${id}.png`, timeout: 120000 }).catch(() => {});
    const mal = !r.mallas || r.oculto || !r.enCuadro || r.dist > 20 || r.tapa || errs.length;
    console.log((mal ? '✗ ' : '✓ ') + id, JSON.stringify(r), errs.length ? 'errores: ' + errs.join(' | ') : '');
    if (mal) malos.push(id);
  } catch (e) { console.log('✗ ' + id, 'no carga', e.message.slice(0, 100)); malos.push(id); }
  await p.close();
}
console.log('con problemas:', malos.join(',') || 'ninguno');
await b.close();
