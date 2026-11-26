// Partido de pelota estable: nada parpadea ni vibra. Juega un partido solo (el piloto lleva a tu pelotari) en el frontón
// de un pueblo y, fotograma a fotograma, mira tres cosas: las clases de .pel-root (si una entra y sale una y otra vez, el
// marcador y los botones parpadean), las veces que la cámara se recoloca de golpe (camInit; si es en muchos fotogramas
// seguidos, todo vibra) y los errores de la página. Pasa por el saque, el peloteo, los tantos, el descanso con la charla
// del botillero y lo que sigue. El autor, 26 nov 2026, con una grabación del iPhone: «estaba parpadeando todo… no podía
// jugar»; «el juego de pelota no puede fallar en ningún momento». Pasarla antes de publicar.
// Uso: URL=http://127.0.0.1:5176/ node tools/auditoria-pelota-estable.mjs [844x390] [segundos de juego: 40]
// Sale con código 1 si algo parpadea, vibra o da error.
import { chromium } from 'playwright-core';
const URL = (process.env.URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const [,, sz = '844x390', segs = '40'] = process.argv;
const [W, H] = sz.split('x').map(Number), mob = W < 1000;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// (a escala 1: con el dibujo por software, a escala 2 salía menos de un fotograma por segundo y el partido no avanzaba)
const ctx = await b.newContext(mob ? { viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 1), hasTouch: true, isMobile: true } : { viewport: { width: W, height: H } });
const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-mando-noofrecer', '1'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, botillero: 'patxi' })); });
await p.goto(`${URL}?town=${process.env.PUEBLO || 'lumbier'}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
// (el registro, desde antes de empezar: las clases que cambian y las veces que la cámara se recoloca, por fotograma)
await p.evaluate(() => {
  const M = window.__game.pelotaMatch, R = window.__estable = { f: [], cls: new Set(), reset: 0, on: true };
  let ci = M.camInit; Object.defineProperty(M, 'camInit', { configurable: true, get: () => ci, set: (x) => { if (!x) R.reset++; ci = x; } });
  const root = M.hud.root; let antes = new Set(root.classList);
  new MutationObserver(() => { const ahora = new Set(root.classList); for (const c of new Set([...antes, ...ahora])) if (antes.has(c) !== ahora.has(c)) R.cls.add(c); antes = ahora; }).observe(root, { attributes: true, attributeFilter: ['class'] });
  const paso = () => { if (!R.on) return; const g = M.game; const bt = root.querySelector('.pel-btns'); R.f.push({ ph: g?.phase || '-', cls: [...R.cls], reset: R.reset, top: [...root.classList].join(' '), btns: bt ? getComputedStyle(bt).visibility !== 'hidden' && getComputedStyle(bt).display !== 'none' : null, panel: !!M.hud.panelEl, dlg: !!document.getElementById('dialog') }); R.cls = new Set(); R.reset = 0; requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
});
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForFunction(() => { const g = window.__game.pelotaMatch?.game; return g && /^serve|rally/.test(g.phase); }, null, { timeout: 200000 });
// el piloto juega por ti: saque, peloteo y tantos
await p.evaluate(() => { window.__game.pelotaMatch.game.autoplay = true; });
await p.waitForTimeout(+segs * 1000 * 0.6);
// el descanso, con la charla del botillero, y vuelta al juego
await p.evaluate(() => window.__game.pelotaMatch.pideDescanso());
// (el descanso llega al acabar el tanto en juego: se espera a que se abra la charla, y se pasa frase a frase hasta que se cierra)
await p.waitForFunction(() => document.getElementById('dialog'), null, { timeout: 240000 }).catch(() => {});
for (let i = 0; i < 20 && await p.$('#dialog'); i++) { await p.evaluate(() => document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await p.waitForTimeout(1200); }   // (la charla pasa de frase con un toque: pointerdown, ui.js)
await p.waitForTimeout(+segs * 1000 * 0.4);
const F = await p.evaluate(() => { const R = window.__estable; R.on = false; return R.f; });
const charlaAbierta = await p.$('#dialog').then(Boolean);
await b.close();
// el análisis: en cada ventana de 12 fotogramas, una clase que cambia 6 veces o más parpadea; la cámara recolocada en
// 6 fotogramas o más vibra (los cortes de plano son de uno en uno, no seguidos)
const V = 12, mal = [];
for (let i = 0; i + V <= F.length; i++) {
  const win = F.slice(i, i + V), n = {};
  for (const x of win) for (const c of x.cls) n[c] = (n[c] || 0) + 1;
  for (const [c, k] of Object.entries(n)) if (k >= 6) mal.push(`parpadea «${c}» (${k} cambios en ${V} fotogramas, fase ${win[0].ph}, desde el fotograma ${i})`);
  const r = win.filter(x => x.reset).length; if (r >= 6) mal.push(`la cámara vibra (${r} recolocaciones en ${V} fotogramas, fase ${win[0].ph}, desde el fotograma ${i})`);
}
// (y los botones de juego, a la vista mientras se juega: en el saque y el peloteo, sin ventana, charla ni plano especial,
// nunca escondidos más de 40 fotogramas seguidos)
let sin = 0;
for (const x of F) { const juego = /^(serveWait|servePrep|rally)$/.test(x.ph) && !x.panel && !x.dlg && !/\b(charla|repe|dron|sale|vuelo|cere|paneled)\b/.test(x.top); sin = juego && x.btns === false ? sin + 1 : 0; if (sin === 40) mal.push(`botones de juego escondidos en pleno juego (fase ${x.ph})`); }
const unicos = [...new Set(mal.map(m => m.replace(/, desde el fotograma \d+\)/, ')')))];
const fases = [...new Set(F.map(x => x.ph))];
if (charlaAbierta) unicos.push('la charla del descanso no se cierra');
if (F.length < 200 || !fases.includes('rally')) unicos.push(`prueba corta: ${F.length} fotogramas, sin peloteo; más segundos`);
const ultD = F.map(x => x.ph).lastIndexOf('descanso');
if (ultD < 0) unicos.push('no llegó al descanso'); else if (!F.slice(ultD).some(x => /^(serveWait|servePrep|rally)$/.test(x.ph))) unicos.push('tras el descanso no se vuelve a jugar');
console.log(JSON.stringify({ tamaño: sz, fotogramas: F.length, fases, problemas: unicos.slice(0, 12), errores: errs.slice(0, 8) }, null, 1));
process.exit(unicos.length || errs.length ? 1 : 0);
