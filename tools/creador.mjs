// Creador de tu personaje: abre «Personajes», elige «Tu personaje», cambia cuerpo, piel, pelo, ropa y complementos,
// saca capturas y comprueba que se juega con él en un pueblo. Uso: node tools/creador.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/creador'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { if (!localStorage.getItem('mendimendiz-perfil-v1')) localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'benat', seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => window.__hub.go('avatars'));
await p.waitForTimeout(2500);
await p.click('[data-av="mio"]'); await p.waitForTimeout(5000);
await p.screenshot({ path: `${out}/1-creador.png` });
// cambios: chica, piel morena, pelo rubio con melena, txapela roja, camisa verde, falda azul, zamarra
for (const [k, v] of [['base', 'Rogue'], ['skin', '#8d5a3a'], ['hair', '#e2c46a'], ['hat', 'beret'], ['hatColor', '#c8102e'], ['shirt', '#3ca05a'], ['skirt', '#1e3a8a']]) { await p.click(`.mio-ed [data-k="${k}"][data-v="${v}"]`); await p.waitForTimeout(400); }
await p.click('.mio-ed [data-t="longHair"]'); await p.waitForTimeout(400);
await p.click('.mio-ed [data-t="fur"]'); await p.waitForTimeout(5000);
await p.screenshot({ path: `${out}/2-creado.png` });
const mio = await p.evaluate(() => JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).mio);
console.log('guardado', JSON.stringify(mio));
await p.click('.mio-rand'); await p.waitForTimeout(5000); await p.screenshot({ path: `${out}/3-al-azar.png` });
// jugar con él
await p.evaluate(() => { const P = JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')); P.avatar = 'mio'; localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify(P)); });
await p.goto('http://127.0.0.1:5173/?town=lesaka&q=mid&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(3000);
await p.evaluate(() => { const G = window.__game, P = G.player.pos, T = window.__THREE; G.player.frozen = true; const c = new T.Vector3(P.x + 1.2, P.y + 1.5, P.z + 2.8), l = new T.Vector3(P.x, P.y + 0.8, P.z); G.follow.cinematic = { pos: c, look: l, t: 0, lookCur: l.clone() }; G.camera.position.copy(c); G.camera.lookAt(l); G.player.heading = 0.4; });
await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/4-en-el-pueblo.png` });
console.log('avatar', await p.evaluate(() => window.__game.P?.avatar || JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).avatar));
console.log('errores', JSON.stringify(errs));
await b.close();
