// Capturas del tiempo: nieve (tejados blancos), lluvia y la luna. Uso: node tools/clima.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/clima'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, t, name] of [['snow', 11, 'nieve'], ['rain', 12, 'lluvia'], ['clear', 23.5, 'luna']]) {
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=${w}&t=${t}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await p.waitForTimeout(3000);
  await p.evaluate((name) => {
    const G = window.__game, rt = window.__rt, T = window.__THREE, gh = window.__hf.groundHeight, P = window.__layout.PLACES.plaza;
    G.player.place(P.x, P.z + 8, Math.PI); G.follow.snap(G.player); if (G.P?.settings) G.P.settings.timeSpeed = 0;
    for (let i = 0; i < 25; i++) rt.weather?.update(1, rt.camera, rt.sky, null);
    const pos = new T.Vector3(P.x + 6, gh(P.x, P.z) + (name === 'luna' ? 3 : 9), P.z + 26), look = new T.Vector3(P.x, gh(P.x, P.z) + (name === 'luna' ? 14 : 3), P.z - 10);
    if (name === 'luna') { const m = rt.sky.moon.position; look.set(m.x, m.y, m.z); pos.set(P.x, gh(P.x, P.z) + 2, P.z); }
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
  }, name);
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${out}/${town}-${name}.png`, timeout: 180000 }); console.log('foto', name, await p.evaluate(() => window.__rt.weather?.kind));
  await p.close();
}
await b.close();
