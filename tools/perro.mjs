// Perro compañero: elegir raza, caminar al lado del jugador y las cuatro razas juntas.
// Uso: node tools/perro.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/perro'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
// presentación y selector (sale solo a los 5 s)
await p.evaluate(() => { const G = window.__game; G.dogHi = true; document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.mode = 'play'; G.perro.choose(); });
await p.waitForFunction(() => document.querySelector('.dogpick'), null, { timeout: 20000 });
await p.evaluate(() => document.querySelector('[data-b="pachon"]').click()); await shot('elegir');
await p.evaluate(() => document.querySelector('[data-ok]').click());
await p.waitForTimeout(1500);
// caminar: mover al jugador en línea recta unos segundos
await p.keyboard.down('w'); await p.waitForTimeout(5000);
const st = await p.evaluate(() => { const G = window.__game, P = G.player.pos, D = G.perro.dog.pos, h = G.player.heading; const dx = D.x - P.x, dz = D.z - P.z; return { side: (dx * Math.cos(h) - dz * Math.sin(h)).toFixed(2), ahead: (dx * Math.sin(h) + dz * Math.cos(h)).toFixed(2), dist: Math.hypot(dx, dz).toFixed(2) }; });
console.log('perro respecto al jugador', JSON.stringify(st));
await shot('andando'); await p.keyboard.up('w');
await p.waitForTimeout(2500); await shot('parado');
// las cuatro razas juntas
await p.evaluate(async () => { const G = window.__game, T = window.__THREE, P = G.player.pos; const { DOG_BREEDS } = await import('/src/actors/beasts.js'); Object.keys(DOG_BREEDS).forEach((b, i) => { const a = G.fauna.add('dog', P.x - 3 + i * 2, P.z + 4, { range: 0.5, walk: 0, run: 0, flee: 0, breed: b, scale: DOG_BREEDS[b].scale }); a.heading = Math.PI; a.state = 'idle'; a.timer = 999; }); const pos = new T.Vector3(P.x, P.y + 1.7, P.z + 9.5), lk = new T.Vector3(P.x, P.y + 0.5, P.z + 4); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); });
await p.waitForTimeout(3000); await shot('razas');
await browser.close();
