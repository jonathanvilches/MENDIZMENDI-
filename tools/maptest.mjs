// Mapa interactivo, pelota al acercarse al frontón (sin atajos en el menú ni en el mapa) y misiones sin orden. Capturas en entrega/mapa.
// Uso: node tools/maptest.mjs [url base] ; ONLY=movil|apaisado|escritorio|menu|salazar
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, base = 'http://127.0.0.1:5173/'] = process.argv;
const out = 'entrega/mapa'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const only = process.env.ONLY;
async function open(town, w, h, mobile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('error ' + m.text().slice(0, 200)); });
  await p.goto(base + '?town=' + town, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  return p;
}
const shot = (p, name) => p.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
const openMap = async (p) => { await p.evaluate(() => window.__game.ui.openMap()); await p.waitForTimeout(1500); };
const view = (p) => p.evaluate(() => { const v = window.__game.ui.mapView.view; return `s=${v.s.toFixed(3)} c=(${v.cx.toFixed(0)}, ${v.cz.toFixed(0)})`; });
const hitOf = (p, what) => p.evaluate((what) => { const mv = window.__game.ui.mapView, r = document.querySelector('#mapbox canvas').getBoundingClientRect(); const h = mv.hits.find(h => what === 'pelota' ? h.it.fronton : what === 'mision' ? h.it.act === 'track' : h.it.label === what); return h ? { x: r.left + h.x + h.w / 2, y: r.top + h.y + h.h / 2, title: h.it.title } : null; }, what);
async function pinch(p, cx, cy, d0, d1) {
  const c = await p.context().newCDPSession(p);
  const pts = (d) => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }];
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) });
  for (let k = 1; k <= 6; k++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + (d1 - d0) * k / 6) }); await p.waitForTimeout(60); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const labelsOverlap = (p) => p.evaluate(() => { const H = window.__game.ui.mapView.hits, L = H.filter(h => h.kind === 'label'), I = H.filter(h => h.kind === 'icon').map(h => ({ x: h.x + 6, y: h.y + 6, w: h.w - 12, h: h.h - 12 })); const ov = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5; let n = 0, m = 0, q = 0; for (let i = 0; i < L.length; i++) { for (let j = i + 1; j < L.length; j++) if (ov(L[i], L[j])) n++; for (const c of I) if (ov(L[i], c)) m++; } for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) if (Math.hypot(I[i].x + I[i].w / 2 - I[j].x - I[j].w / 2, I[i].y + I[i].h / 2 - I[j].y - I[j].h / 2) < (I[i].w + I[j].w) / 2 - 0.5) q++; return `${L.length} nombres, ${I.length} iconos · solapes nombre-nombre ${n}, nombre-icono ${m}, icono-icono ${q}`; });

if (!only || only === 'movil') {
  const p = await open('lumbier', 390, 844, true);
  console.log('misiones', await p.evaluate(() => { const g = window.__game; return JSON.stringify({ n: g.missions.length, tipos: g.missions.map(M => M.type), bloqueadas: typeof g.unlocked }); }));
  await p.evaluate(() => window.__game.ui.openBook()); await p.waitForTimeout(1500);
  console.log('cuaderno', await p.evaluate(() => [...document.querySelectorAll('.qitem .state')].map(s => s.textContent).join(', ')));
  await shot(p, 'cuaderno-movil'); await p.evaluate(() => window.__game.ui.closeModal());
  await openMap(p); console.log('inicio', await view(p), await labelsOverlap(p)); await shot(p, 'movil-1-inicio');
  const r = await p.evaluate(() => { const b = document.querySelector('#mapbox').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await pinch(p, r.x, r.y, 80, 200); await p.waitForTimeout(800); console.log('pellizco', await view(p), await labelsOverlap(p)); await shot(p, 'movil-2-pellizco');
  await p.evaluate(() => document.querySelector('.mapctl [data-z=out]').click()); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('.mapctl [data-z=out]').click()); await p.waitForTimeout(900);
  console.log('alejar x2', await view(p), await labelsOverlap(p)); await shot(p, 'movil-3-alejado');
  await p.evaluate(() => document.querySelector('.mapctl [data-z=me]').click()); await p.waitForTimeout(900); console.log('centrar', await view(p));
  // arrastre
  await p.mouse.move(r.x, r.y); await p.mouse.down(); for (let k = 1; k <= 5; k++) await p.mouse.move(r.x + k * 12, r.y + k * 8); await p.mouse.up(); await p.waitForTimeout(500);
  console.log('arrastre', await view(p));
  const m = await hitOf(p, 'mision'); console.log('misión', JSON.stringify(m));
  if (m) { await p.mouse.click(m.x, m.y); await p.waitForTimeout(900); await shot(p, 'movil-4-mision'); console.log('tarjeta', await p.evaluate(() => document.querySelector('.mapcard').innerText.replace(/\s+/g, ' '))); }
  await p.evaluate(() => { const g = window.__game, v = g.ui.mapView.view, f = g.fronton.spot; v.cx = f.x; v.cz = f.z + 20; v.s = 2.2; g.ui.mapView.redraw(); }); await p.waitForTimeout(900);
  console.log('frontón cerca', await view(p), await labelsOverlap(p), await p.evaluate(() => window.__game.ui.mapView.hits.map(h => h.kind + ':' + (h.it.title || h.it.label) + ':' + (h.it.act || '')).join(' | ')));
  await shot(p, 'movil-5a-cerca');
  const f = await hitOf(p, 'pelota'); console.log('frontón', JSON.stringify(f));
  if (f) {
    await p.mouse.click(f.x, f.y); await p.waitForTimeout(900); await shot(p, 'movil-5-fronton');
    console.log('tarjeta', await p.evaluate(() => document.querySelector('.mapcard').innerText.replace(/\s+/g, ' ')));
    console.log('botón de pelota en el mapa', await p.evaluate(() => !!document.querySelector('.mapcard [data-a=pelota]')));
    await p.evaluate(() => window.__game.ui.closeModal());
    // acercarse al frontón a pie: aparece «Jugar a pelota» y el botón de acción empieza el partido
    await p.evaluate(() => { const G = window.__game, e = G.fronton.entry; G.player.place(e.x + 0.5, e.z + 0.5, 0); G.follow.snap(G.player); });
    await p.waitForTimeout(2500);
    console.log('aviso al acercarse', await p.evaluate(() => { const G = window.__game, P = G.player.pos; return G.interactables().filter(i => Math.hypot(i.x - P.x, i.z - P.z) < i.r).map(i => i.label).join(' | '); }));
    await shot(p, 'movil-6-acercarse');
    await p.evaluate(() => { const G = window.__game, P = G.player.pos; const it = G.interactables().find(i => i.kind === 'fronton' && Math.hypot(i.x - P.x, i.z - P.z) < i.r); if (it) G.interact(it); });
    await p.waitForTimeout(2500);
    console.log('tras pulsar', await p.evaluate(() => document.querySelector('#dialog')?.innerText.slice(0, 80)));
    await shot(p, 'movil-7-pelota');
  }
  await p.close();
}
if (!only || only === 'apaisado') {
  const p = await open('lumbier', 844, 390, true);
  await openMap(p); console.log('apaisado', await view(p), await labelsOverlap(p)); await shot(p, 'apaisado-1');
  const f = await hitOf(p, 'pelota'); if (f) { await p.mouse.click(f.x, f.y); await p.waitForTimeout(900); await shot(p, 'apaisado-2-fronton'); }
  await p.close();
}
if (!only || only === 'escritorio') {
  const p = await open('lumbier', 1280, 720, false);
  await openMap(p); console.log('escritorio', await view(p), await labelsOverlap(p)); await shot(p, 'escritorio-1');
  const r = await p.evaluate(() => { const b = document.querySelector('#mapbox').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await p.mouse.move(r.x, r.y); for (let k = 0; k < 4; k++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(200); }
  await p.waitForTimeout(600); console.log('rueda', await view(p), await labelsOverlap(p)); await shot(p, 'escritorio-2-rueda');
  await p.close();
}
if (!only || only === 'menu') {
  const p = await open('tafalla', 390, 844, true);
  await p.evaluate(() => window.__game.ui.openMenu()); await p.waitForTimeout(1200); await shot(p, 'menu-movil');
  console.log('botón de pelota en la pausa', await p.evaluate(() => !!document.querySelector('#mPelota')));
  await p.close();
}
if (!only || only === 'salazar') {
  const p = await open('otsagabia-ochagavia', 390, 844, true);
  console.log('salazar', await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(window.__game.state.quests).map(([k, q]) => [k, q.state])))));
  await openMap(p); console.log('salazar mapa', await view(p), await labelsOverlap(p)); await shot(p, 'salazar-mapa');
  await p.evaluate(() => window.__game.ui.closeModal());
  await p.evaluate(() => window.__game.ui.openBook()); await p.waitForTimeout(1200); await shot(p, 'salazar-cuaderno');
  await p.close();
}
console.log([...new Set(errs)].slice(0, 15).join('\n'));
await browser.close();
