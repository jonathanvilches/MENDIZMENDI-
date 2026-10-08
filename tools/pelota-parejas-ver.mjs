// Pelota por parejas en el navegador: en el partido libre se elige «Parejas: delantero» o «Parejas: zaguero», salen los
// cuatro pelotaris (tú con una flecha encima), el marcador con las dos parejas y se juega un rato. Capturas y medidas.
// Uso: node tools/pelota-parejas-ver.mjs [pueblo] [carpeta] [es|eu] [delantero|zaguero]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'pamplona', out = 'entrega/pelota-parejas', lang = 'es', role = 'zaguero'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(2500);
const click = async (sel, ms = 120000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); window.__fp = G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="libre"]');
await p.waitForSelector('.pel-panel [data-pel-mod]', { timeout: 240000 });
await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/${lang}-elegir.png` });
await click(`.pel-panel [data-pel-mod="${role}"]`);
if (role !== 'mano') await p.waitForFunction(() => window.__game.pelotaMatch?.pairs && !window.__game.pelotaMatch.loadingMates && document.querySelector('.pel-panel .pel-rv2'), null, { timeout: 240000 });
await p.waitForTimeout(800);
const panel = await p.evaluate(() => { const c = document.querySelector('.pel-card'), go = document.querySelector('[data-pel-go]').getBoundingClientRect();
  return { alto: c.scrollHeight, visible: c.clientHeight, boton: [Math.round(go.top), Math.round(go.bottom)], vh: innerHeight, texto: document.querySelector('.pel-pairs')?.innerText, rivales: document.querySelector('.pel-rv2')?.innerText.replace(/\s+/g, ' ') }; });
await p.screenshot({ path: `${out}/${lang}-parejas-${role}.png` });
await click('.pel-panel [data-pel-go]');
// se juega solo (piloto automático para el tuyo) un rato y se miran los cuatro
await p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; });
const snaps = [];
for (let i = 0; i < 6; i++) {
  // (el navegador sin tarjeta gráfica pinta muy despacio: la lógica se avanza a mano, 4 s de partido por vuelta)
  snaps.push(await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 120 && m?.active; k++) m.update(1 / 30); const g = m?.game; if (!g) return null;
    return { t: +m.t.toFixed(2), faseT: +g.phaseT.toFixed(2), pausa: !!m.paused, panel: !!m.hud.panelEl, fase: g.phase, tanteo: `${g.score.you}-${g.score.rival}`, pelotaris: g.ids.map(id => `${id}:${g.players[id].x.toFixed(1)},${g.players[id].z.toFixed(1)}`).join(' '), visibles: Object.values(m.mateObjs || {}).map(o => o.obj.visible), flecha: !!m.pin?.visible, marcador: [...document.querySelectorAll('.pel-side span')].map(e => e.textContent) }; }));
  if (i === 2 || i === 5) await p.screenshot({ path: `${out}/${lang}-juego-${i}.png` });
}
console.log(JSON.stringify({ panel, snaps }, null, 1), errs.length ? errs.slice(0, 4) : 'sin errores');
// salir y comprobar que los dos de más se van
await p.evaluate(() => window.__game.pelotaAbort?.());
await p.waitForTimeout(1500);
console.log('al salir', JSON.stringify(await p.evaluate(() => ({ modo: window.__game.mode, partido: !!window.__game.pelotaMatch, hud: !!document.querySelector('.pel-root') }))));
await b.close();
