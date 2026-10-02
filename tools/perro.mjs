// El perro compañero (por defecto el pastor vasco): quieto, siguiendo al jugador andando y corriendo, y sentado.
// Uso: node tools/perro.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = '/tmp/claude-0/perro'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', dogOn: true, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(2000);
const info = await p.evaluate(() => { const G = window.__game, D = G.perro?.dog; return D ? { raza: G.perro.breed, nombre: G.perro.name, modelo: !!D.A, x: D.pos.x } : 'sin perro'; });
console.log(JSON.stringify(info));
const shot = async (n, f, w = 1500) => { await p.evaluate(f); await p.waitForTimeout(w); await p.screenshot({ path: `${out}/${n}.png` }); console.log('foto', n); };
const camOn = () => { const G = window.__game, D = G.perro.dog, T = window.__THREE; const pos = new T.Vector3(D.pos.x + 2.2, D.pos.y + 1.1, D.pos.z + 2.2), look = new T.Vector3(D.pos.x, D.pos.y + 0.35, D.pos.z); G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; };
await shot('quieto', camOn);
await shot('andando', () => { const G = window.__game; G.follow.cinematic = null; G.input.keys.add('w'); }, 2500);
await shot('corriendo', () => { const G = window.__game; G.input.keys.add('shift'); }, 2500);
await shot('sentado', () => { const G = window.__game; G.input.keys.clear(); const D = G.perro.dog; D.sit = true; D.state = 'sit'; }, 3500);
await p.evaluate(camOn); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/sentado-cerca.png` });
console.log('errores', JSON.stringify(errs.slice(0, 4)));
await b.close();
