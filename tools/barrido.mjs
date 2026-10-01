// Barrido de errores: habla con cada personaje del lugar, cierra diálogos y tarjetas y deja correr el juego.
// Uso: node tools/barrido.mjs <pueblo>  → errores capturados (página y bucle)
import { chromium } from 'playwright-core';
const town = process.argv[2] || 'otsagabia-ochagavia';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
p.on('console', m => { if (m.type() === 'error') errs.push('consola ' + m.text().slice(0, 220)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: true })); localStorage.setItem('mendimendiz-salazar', JSON.stringify({ introDone: true })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const close = async () => { for (let i = 0; i < 14; i++) { const did = await p.evaluate(() => { const o = document.querySelector('.mg-overlay:not(.out)'); if (o) { const b = o.querySelector('.opt') || o.querySelector('button'); b?.click(); return true; } if (window.__game.ui.dialogOpen) { dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); return true; } return false; }); if (!did) return; await p.waitForTimeout(350); } };
const people = await p.evaluate(() => { const G = window.__game; const L = G.npcs ? Object.keys(G.npcs) : G.actors.map((a, i) => i); return L; });
console.log('personajes', people.length);
for (const id of people) {
  await p.evaluate((id) => { const G = window.__game; const a = G.npcs ? G.npcs[id] : G.actors[id]; if (!a) return; document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.talk(a); }, id);
  await p.waitForTimeout(600); await close();
  await p.evaluate(() => { const G = window.__game; for (let i = 0; i < 90; i++) { try { G.update(1 / 30); } catch (e) { (window.__errors ||= []).push('update ' + e.message); } } });
  await close();
}
const caught = await p.evaluate(() => window.__errors || []);
console.log(JSON.stringify([...new Set([...errs, ...caught])].slice(0, 20), null, 1));
await browser.close();
