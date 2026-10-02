// El explorador (protagonista de Meshy) en un pueblo: quieto, andando, corriendo, saltando y hablando, y su ficha en
// el selector de personajes. Uso: node tools/explorador.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = '/tmp/claude-0/explorador'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'ranger', seen: { heroBenat: true, dog: true } })); });
// selector de personajes: el explorador sale el primero (y quien tenía el de antes por defecto pasa a él)
await p.goto(`${URL}/?screen=avatars`, { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 }); await p.waitForTimeout(6000);
await p.screenshot({ path: `${out}/selector.png` });
console.log('avatar', await p.evaluate(async () => (await import('/src/game/profile.js')).profile().avatar));
await p.goto(`${URL}/?town=${town}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(2500);
const pose = async (n, f, wait = 1500) => { await p.evaluate(f); await p.waitForTimeout(wait); await p.screenshot({ path: `${out}/${n}.png` }); console.log('foto', n, await p.evaluate(() => window.__rt.player.rig.char?.currentName)); };
await pose('quieto', () => {});
await pose('andando', () => { const K = window.__game.input.keys; K.add('w'); }, 1800);
await pose('corriendo', () => { const K = window.__game.input.keys; K.add('shift'); }, 1800);
await pose('saltando', () => { const G = window.__game; G.input.keys.delete('shift'); G.input.keys.delete('w'); G.input.jumpQ = true; G.input.keys.add(' '); }, 350);
await p.evaluate(() => window.__game.input.keys.clear());
await pose('hablando', () => { const G = window.__game, a = G.missions[0]?.host; if (a) { G.player.place(a.pos.x + 1.6, a.pos.z + 1.6, Math.atan2(-1.6, -1.6)); G.follow.snap(G.player); G.player.rig.talking = 3; } }, 2500);
console.log('errores', JSON.stringify(errs.slice(0, 5)));
await b.close();
