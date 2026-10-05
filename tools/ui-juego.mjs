// Interfaz dentro del juego en un móvil: HUD, diálogo con un anfitrión, libro de misiones, libro del pueblo, mapa,
// menú y mochila. Uso: node tools/ui-juego.mjs <carpeta> [pueblo] [ancho] [alto]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/ui', town = 'lesaka', W = 390, H = 844] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173'}/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(2500);
const shot = (n) => p.screenshot({ path: `${out}/${W}x${H}-${n}.png`, timeout: 180000 });
const close = () => p.evaluate(() => { const ui = window.__game.ui; ui.closeModal?.(); document.querySelectorAll('.mg-overlay button').forEach(b => b.click()); });
await shot('1-hud');
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.host && !M.done); G.say ? null : null; window.__dlg = G.dialog(M, M.host); });
await p.waitForTimeout(1800); await shot('2-dialogo');
await p.evaluate(() => { document.querySelectorAll('.dlg button, .dialog button').forEach(b => b.click()); window.__game.ui._dlgCleanup?.(); });
await p.waitForTimeout(800); await close();
for (const [n, fn] of [['3-libro', 'openBook'], ['4-pueblo', 'openTownBook'], ['5-mapa', 'openMap'], ['6-menu', 'openMenu']]) {
  await p.evaluate((fn) => window.__game.ui[fn](), fn); await p.waitForTimeout(1500); await shot(n); await close(); await p.waitForTimeout(500);
}
await p.evaluate(() => window.__game.mochila?.open?.()); await p.waitForTimeout(1500); await shot('7-mochila'); await close();
await p.evaluate(() => { window.__game.tienda?.open(); }); await p.waitForTimeout(2500);   // (sin esperar a que se cierre) await shot('8-tienda'); await p.evaluate(() => document.querySelectorAll('.mg-overlay.shop').forEach(o => o.remove()));
console.log(errs.join('\n') || 'sin errores');
await b.close();
