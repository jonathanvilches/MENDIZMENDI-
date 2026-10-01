// Avatar del jugador de frente, de lado y andando (para revisar el modelo).
// Uso: node tools/avatar.mjs <benat|nerea|haritz> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, av = 'nerea', out = 'entrega/avatar'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1000, height: 700 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await p.addInitScript((av) => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, avatar: av, dogOn: false })); }, av);
await p.goto(`http://127.0.0.1:5173/?town=lumbier&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
console.log(await p.evaluate(() => { const r = window.__game.player.rig; return JSON.stringify({ tipo: r.constructor.name, clips: r.char?.clips }); }));
const cam = async (n, ang, h = 1.0, dist = 3.2, walk = false) => {
  await p.evaluate(([ang, h, dist, walk]) => { const G = window.__game, T = window.__THREE, P = G.player; document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false;
    window.__walk = walk; const pos = new T.Vector3(P.pos.x + Math.sin(P.heading + ang) * dist, P.pos.y + h + 0.4, P.pos.z + Math.cos(P.heading + ang) * dist), lk = new T.Vector3(P.pos.x, P.pos.y + h, P.pos.z);
    G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, [ang, h, dist, walk]);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${av}-${n}.png`, timeout: 180000 }); console.log('foto', n);
};
await cam('frente', 0); await cam('lado', Math.PI / 2); await cam('espalda', Math.PI);
// andar: forzar la animación de andar en el sitio
await p.evaluate(() => { const r = window.__game.player.rig; window.__game.player.frozen = true; const f = r.update.bind(r); r.update = (dt, sp, g, tr) => f(dt, 3.3, true, 0); });
await cam('andar', Math.PI / 2, 1.0, 3.4);
await p.evaluate(() => { const r = window.__game.player.rig; r.update = ((f) => (dt) => f(dt, 6.6, true, 0))(Object.getPrototypeOf(r).update.bind(r)); });
await cam('correr', 0.6, 1.0, 3.6);
await browser.close();
