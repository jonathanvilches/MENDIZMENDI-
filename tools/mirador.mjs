// Sabio junto a un monumento y mirador con prismáticos: capturas.
// Uso: node tools/mirador.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'ujue', out = 'entrega/mirador'] = process.argv; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
console.log(await p.evaluate(() => JSON.stringify(window.__game.actors.filter(a => a.sabio).map(a => a.name + ' → ' + a.sabio.name))));
// sabio: hablar (el diálogo se ve en pantalla)
await p.evaluate(() => { const G = window.__game, a = G.actors.find(a => a.sabio); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.player.place(a.pos.x + 2, a.pos.z + 2, 0); G.follow.snap?.(G.player); G.talk(a); });
await p.waitForTimeout(2500); await shot('sabio');
for (let i = 0; i < 8; i++) { await p.keyboard.press('e'); await p.waitForTimeout(1000); await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button')?.click()); }
await p.waitForTimeout(1500);
// mirador: misión y prismáticos desde el mirador
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'mirador'); G.say = async () => {}; G.dialog(M, M.host); });
for (let i = 0; i < 6; i++) { await p.waitForTimeout(1200); await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button')?.click()); }
const info = await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'mirador'); const v = G.miradorSpot(); G.player.place(v.x, v.z, 0); return JSON.stringify({ montes: M.montes.map(m => `${m.name} ${m.dir} ${Math.round(m.km)}km`), step: M.step }); });
console.log(info);
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'mirador'); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.toggleBinoculars(); G.binoYaw = Math.PI - M.montes[0].bearing * Math.PI / 180; G.binoPitch = 0.12; });
await p.waitForTimeout(3000); await shot('prismaticos');
await p.keyboard.press('e'); await p.waitForTimeout(2500); await shot('monte');
console.log('cuenta', await p.evaluate(() => window.__game.missions.find(M => M.type === 'mirador').count), 'errores', await p.evaluate(() => JSON.stringify(window.__errors || [])));
await browser.close();
