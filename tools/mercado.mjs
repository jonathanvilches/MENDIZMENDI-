// Capturas del día de mercado en la plaza (?market=1): vista general y de cerca de cada puesto.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/mercado'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&market=1&weather=clear`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const n = await p.evaluate(() => window.__game.mercado?.stalls.length || 0);
console.log(town, 'puestos', n, 'llamadas', await p.evaluate(() => window.__rt.renderer.info.render.calls));
const cam = async (name, f) => { await p.evaluate(f); await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${town}-${name}.png` }); console.log('foto', name); };
await cam('plaza', () => { const G = window.__game, T = window.__THREE, c = window.__layout.PLACES.plaza, gh = window.__hf.groundHeight; const pos = new T.Vector3(c.x + 4, gh(c.x, c.z) + 9, c.z + 20), look = new T.Vector3(c.x, gh(c.x, c.z) + 1, c.z); G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
for (let i = 0; i < Math.min(n, 5); i++) await cam('puesto' + i, new Function(`const G = window.__game, T = window.__THREE, s = G.mercado.stalls[${i}], gh = window.__hf.groundHeight; const ox = Math.sin(s.ry), oz = Math.cos(s.ry), y = gh(s.x, s.z); const pos = new T.Vector3(s.x + ox * 1.6 + oz * 0.4, y + 1.55, s.z + oz * 1.6 - ox * 0.4), look = new T.Vector3(s.x, y + 0.95, s.z); G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);`));
console.log('errores', JSON.stringify(errs));
await b.close();
