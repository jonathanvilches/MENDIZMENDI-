// Capturas de los vecinos (cuerpo KayKit con el traje de su comarca) en la plaza de un pueblo y llamadas de dibujo.
// Uso: node tools/vecinos.mjs [pueblos separados por comas] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, towns = 'lumbier', out = 'entrega/vecinos'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('console', m => { if (m.type() === 'warning' && /vecino|traje|KayKit/i.test(m.text())) console.log('WARN', m.text()); });
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  // los paseantes, juntos delante de la cámara
  const info = await p.evaluate(() => {
    const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight, P = window.__layout.PLACES.plaza, W = G.walkers || [];
    G.player.place(P.x, P.z, 0); G.follow.snap(G.player); if (G.P?.settings) G.P.settings.timeSpeed = 0;
    W.forEach((a, i) => { a.pos.set(P.x - 4 + (i % 5) * 2, 0, P.z + 6 + Math.floor(i / 5) * 2.2); a.pos.y = gh(a.pos.x, a.pos.z); a.route = null; a.heading = Math.PI; a.obj.position.copy(a.pos); a.obj.rotation.y = Math.PI; });
    const pos = new T.Vector3(P.x, gh(P.x, P.z) + 2.2, P.z + 15), look = new T.Vector3(P.x, gh(P.x, P.z) + 0.9, P.z + 7);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
    return W.length;
  });
  await p.waitForTimeout(4000);
  const calls = await p.evaluate(() => window.__rt.renderer.info.render.calls);
  await p.screenshot({ path: `${out}/${town}.png`, timeout: 180000 }); console.log(town, 'paseantes', info, 'llamadas', calls);
  await p.close();
}
await b.close();
