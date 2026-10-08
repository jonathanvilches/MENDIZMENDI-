// Dónde se queda el jugador: la vista al llegar al pueblo (salida) y la de la puerta del frontón mirando a la calle
// (donde deja el partido al acabar). Uso: node tools/vista-entrada.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'pamplona', out = 'entrega/vista'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(4000);
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 30); k(); }), n);
console.log('salida', JSON.stringify(await p.evaluate(() => { const P = window.__game.player; return { x: P.pos.x.toFixed(1), z: P.pos.z.toFixed(1), h: P.heading.toFixed(2) }; })));
await p.screenshot({ path: `${out}/${town}-salida.jpg`, quality: 70 });
console.log('puerta', JSON.stringify(await p.evaluate(() => { const G = window.__game, F = G.fronton, e = F.entry, c = F.out || F.toWorld(0, 12); G.player.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z)); G.follow.snap(G.player); return { x: e.x.toFixed(1), z: e.z.toFixed(1) }; })));
await frames(20); await p.screenshot({ path: `${out}/${town}-puerta.jpg`, quality: 70 });
await b.close();
