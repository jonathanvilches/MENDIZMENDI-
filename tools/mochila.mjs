// Mochila del explorador: equipo en el avatar, fuente (cantimplora), recoger moras, energía y panel.
// Uso: node tools/mochila.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/mochila'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const shot = async (n) => { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${town}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const clickCards = async () => { for (let i = 0; i < 6; i++) { await p.waitForTimeout(700); const b = await p.evaluate(() => { const b = document.querySelector('.mg-overlay:not(.out):not(.bagpanel) button'); if (b) { b.click(); return true; } return false; }); if (!b) break; } };
// todo el equipo para verlo puesto
await p.evaluate(() => { const G = window.__game; G.P.gear = ['mochila']; G.P.bag = { agua: 0, food: { pan: 2 } }; G.P.energy = 100; G.gearProps.set(G.P.gear); });
await shot('hud');
// fuente: cantimplora
await p.evaluate(() => { const G = window.__game; G.interact({ kind: 'fountain', x: 0, z: 0 }); });
await p.waitForTimeout(1200); await shot('cantimplora'); await clickCards();
// moras
await p.evaluate(() => { const G = window.__game, it = G.items.find(i => i.kind === 'berries'); if (it) G.pick(it); });
for (const id of ['prismaticos', 'baston', 'farol']) { await p.evaluate((id) => { window.__game.mochila.give(id); }, id); await p.waitForTimeout(600); await clickCards(); }
await p.evaluate(() => { const G = window.__game; G.P.energy = 18; G.mochila.paint(); });
// el avatar con el equipo, de espaldas y de lado
const view = (ox, oz, oy) => p.evaluate(([ox, oz, oy]) => { const G = window.__game, T = window.__THREE, P = G.player.pos; G.player.heading = 0; const pos = new T.Vector3(P.x + ox, P.y + oy, P.z + oz), lk = new T.Vector3(P.x, P.y + 0.95, P.z); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, [ox, oz, oy]);
await view(0.6, -2.6, 1.4); await p.waitForTimeout(1500); await shot('espalda');
await view(2.4, 1.2, 1.2); await p.waitForTimeout(1500); await shot('lado');
await view(-0.4, 2.8, 1.3); await p.waitForTimeout(1500); await shot('frente');
await p.evaluate(() => { window.__game.follow.cinematic = null; window.__game.mochila.open(); });
await shot('panel');
await browser.close();
