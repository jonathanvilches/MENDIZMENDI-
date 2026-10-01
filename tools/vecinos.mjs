// Vecinos con el modelo del personaje principal: fila de vecinos del pueblo para verlos de cerca.
// Uso: node tools/vecinos.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'pamplona', out = 'entrega/vecinos'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
console.log(await p.evaluate(() => { const G = window.__game; const all = [...G.actors, ...G.walkers]; return JSON.stringify({ total: all.length, glb: all.filter(a => a.glb).length, nombres: all.map(a => a.name + ':' + a.obj.userData.sex).slice(0, 30) }); }));
// fila de vecinos delante de la cámara
await p.evaluate(() => {
  const G = window.__game, T = window.__THREE, P = G.player.pos.clone(); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.mode = 'play';
  const all = [...G.actors, ...G.walkers].filter(a => a.glb).slice(0, 8);
  all.forEach((a, i) => { a.frozen = true; a.route = null; a.wander = 0; a.state = 'idle'; a.target = null; a.wait = 999; a.setPos(P.x - 7 + i * 2, P.z + 6, 0); a.ignorePlayer = true; });
  G.player.pos.set(P.x, P.y, P.z - 30);
  const pos = new T.Vector3(P.x, P.y + 1.6, P.z + 13.5), lk = new T.Vector3(P.x, P.y + 1.0, P.z + 6);
  G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk);
});
await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/${town}-fila.png`, timeout: 180000 });
// de cerca: cuatro vecinas y vecinos, de frente y de espaldas
for (const [n, back] of [['frente', 0], ['espalda', 1]]) {
  await p.evaluate((back) => { const G = window.__game, T = window.__THREE; const all = [...G.actors, ...G.walkers].filter(a => a.glb); const girls = all.filter(a => a.obj.userData.sex === 'girl').slice(0, 3), boys = all.filter(a => a.obj.userData.sex === 'boy').slice(0, 2); const L = [...girls, ...boys];
    const c = L[0].pos.clone(); L.forEach((a, i) => { a.setPos(c.x - 3 + i * 1.5, c.z, back ? Math.PI : 0); a.obj.visible = true; });
    G.actors.concat(G.walkers).forEach(a => { if (!L.includes(a)) a.visible = false; });
    const pos = new T.Vector3(c.x, c.y + 1.5, c.z + 5.2), lk = new T.Vector3(c.x, c.y + 0.9, c.z); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, back);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-${n}.png`, timeout: 180000 });
}
await p.evaluate(() => { const G = window.__game, T = window.__THREE, a = [...G.actors, ...G.walkers].filter(a => a.glb)[0]; const P = a.pos; const pos = new T.Vector3(P.x + 1.2, P.y + 1.6, P.z - 2.6), lk = new T.Vector3(P.x, P.y + 1.35, P.z); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); });
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-cerca.png`, timeout: 180000 });
console.log('fotos');
await browser.close();
