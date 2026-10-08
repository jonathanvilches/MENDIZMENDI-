// El torneo de mano como lo juega una persona: hablar con el pelotari, elegir la txapela, «¡A jugar!» y el partido.
// Apunta si el partido avanza (reloj del partido), dónde están el jugador y la cámara, y los errores.
// Uso: node tools/torneo-pueblo.mjs <pueblo> <carpeta> [hora] [fallo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'pamplona', out = 'entrega/torneo', hora = '12', fallo = ''] = process.argv;   // fallo=1: el perro falla en cada imagen; fallo=memoria: se pierde la memoria gráfica al pulsar «¡A jugar!» (como en el iPhone) mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=${hora}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const state = () => p.evaluate(() => { const G = window.__game; if (!G) return { sinJuego: true, hud: !!document.querySelector('.pel-root') }; const P = G.player.pos, c = G.camera.position, e = G.fronton?.entry;
  return { modo: G.mode, t: +(G.pelotaMatch?.t ?? -1).toFixed(2), jugador: [P.x, P.y, P.z].map(v => +v.toFixed(1)), camara: [c.x, c.y, c.z].map(v => +v.toFixed(1)), entrada: e ? [+e.x.toFixed(1), +e.z.toFixed(1)] : null, hud: !!document.querySelector('.pel-root'), errores: (window.__errors || []).slice(-3) }; });
const click = async (sel, ms = 120000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
// hablar con el pelotari (como al tocarlo)
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); window.__fp = G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="torneo"]'); await p.waitForTimeout(1500);
await click('[data-a="play"]');
if (fallo === 'memoria') {
  // como en el iPhone: la memoria gráfica se pierde mientras se prepara el partido y vuelve al momento
  await p.evaluate(() => { const ext = window.__rt.renderer.getContext().getExtension('WEBGL_lose_context'); window.__lose = ext; ext.loseContext(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.__lose.restoreContext());
  await p.waitForTimeout(4000);
  console.log('tras perder la memoria', JSON.stringify(await state()));
  await p.waitForFunction(() => window.__game && window.__rt?.active, null, { timeout: 600000 }).catch(() => {});
  // (si el pueblo se rehízo, esperar a que esté listo)
  await p.waitForFunction(() => window.__game && (window.__game.mode === 'play' || window.__game.mode === 'pelota'), null, { timeout: 600000 }).catch(() => {});
  await p.waitForTimeout(3000);
}
console.log('antes', JSON.stringify(await state()));
await click('.pel-panel [data-pel-go]', 240000).catch(() => console.log('sin panel del partido'));
if (fallo) await p.evaluate(() => { const d = window.__game.perro; if (d) d.update = () => { throw new Error('fallo de prueba en el perro'); }; });
for (let i = 0; i < 4; i++) { await p.waitForTimeout(6000); console.log('partido', i, JSON.stringify(await state())); await p.screenshot({ path: `${out}/${town}-partido${i}.jpg`, quality: 70 }); }
console.log('errores', JSON.stringify(errs.filter(e => !/favicon|404|403/.test(e)).slice(0, 12)));
await b.close();
