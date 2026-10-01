// Prueba «como una persona» en un móvil táctil: para cada misión del pueblo va junto al anfitrión, toca el botón de
// acción y responde a todo lo que aparezca (diálogos, tarjetas, minijuegos, pelota) en tiempo real, tocando la pantalla.
// Recoge todos los errores (de página, de consola y los del aviso en pantalla).
// Uso: node tools/mono.mjs <pueblo> [segundos por misión] [url base]
import { chromium } from 'playwright-core';
const [,, town = 'lesaka', secs = '70', base = 'http://127.0.0.1:5173/'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
p.on('console', m => { if (m.type() === 'error') errs.push('consola ' + m.text().slice(0, 240)); if (m.type() === 'warning' && /vigilante/.test(m.text())) errs.push('VIGILANTE'); });
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`${base}?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const tap = async (sel) => { const b = await p.$(sel); if (!b) return false; const r = await b.boundingBox(); if (!r || r.width < 2) return false; await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); return true; };
// responde a lo que haya en pantalla; devuelve qué ha hecho
async function respond() {
  const st = await p.evaluate(() => {
    const vis = (s) => [...document.querySelectorAll(s)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; });
    const sel = (e) => { if (!e) return null; e.setAttribute('data-mono', '1'); return '[data-mono="1"]'; };
    document.querySelectorAll('[data-mono]').forEach(e => e.removeAttribute('data-mono'));
    const G = window.__game; if (!G) return { k: 'SIN JUEGO', url: location.href, body: document.body.className, txt: document.body.innerText.slice(0, 200) };
    if (vis('.pel-go')) return { k: 'pelota-go', s: sel(vis('.pel-go')) };
    if (G.pelotaMatch && vis('.pel-hit')) return { k: 'pelota', s: sel(vis('.pel-hit')), ready: !!document.querySelector('.pel-hit.ready') };
    const dlg = vis('.dialog .choices button') || null; if (dlg) return { k: 'eleccion', s: sel(dlg) };
    const ov = [...document.querySelectorAll('.mg-overlay:not(.out)')].pop();
    if (ov) {
      const opts = [...ov.querySelectorAll('.opt:not(.done):not([disabled]), [data-b], .tile, .card-pick')].filter(e => e.getBoundingClientRect().width > 2);
      if (opts.length) return { k: 'opcion', s: sel(opts[Math.floor(Math.random() * opts.length)]) };
      const b = [...ov.querySelectorAll('button:not([disabled])')].filter(e => e.getBoundingClientRect().width > 2);
      if (b.length) { const bb = b[b.length - 1]; return { k: 'boton', s: sel(bb), t: bb.textContent.trim().slice(0, 40) }; }
      const zone = ov.querySelector('canvas, .mg-play, .mg-card'); if (zone) return { k: 'zona', s: sel(zone) };
    }
    if (G.ui.dialogOpen || document.body.classList.contains('talking')) return { k: 'dialogo', s: sel(vis('.dialog') || document.body) };
    if (vis('.enc-hud')) return { k: 'encierro' };
    return { k: 'nada', mode: G.mode };
  });
  if (st.s) await tap(st.s);
  return st;
}
const ids = await p.evaluate(() => window.__game.missions.map((M, i) => ({ i, type: M.type, title: M.title })));
console.log(town, 'misiones', ids.map(m => m.type).join(','));
for (const m of ids) {
  const before = errs.length;
  // ir junto al anfitrión de la misión (o al objetivo) y tocar ACCIÓN
  await p.evaluate((i) => { const G = window.__game, M = G.missions[i]; G.tracked = i; const t = G.target(M) || (M.host && { x: M.host.pos.x, z: M.host.pos.z }); if (t) G.player.place(t.x + 1.2, t.z + 1.2, 0); }, m.i);
  await p.waitForTimeout(1500); await tap('#cAct');
  const seen = {}; const t0 = Date.now();
  while (Date.now() - t0 < +secs * 1000) {
    const st = await respond(); seen[st.k] = (seen[st.k] || 0) + 1;
    if (st.t) seen['«' + st.t + '»'] = (seen['«' + st.t + '»'] || 0) + 1;
    if (st.k === 'SIN JUEGO') { console.log('SIN JUEGO', JSON.stringify(st), errs.slice(-5)); await p.screenshot({ path: 'entrega/mono-sinjuego.png' }); process.exit(1); }
    if (st.k === 'nada') {
      // misión con más pasos: ir al siguiente objetivo y volver a tocar
      const moved = await p.evaluate((i) => { const G = window.__game, M = G.missions[i]; if (M.done) return 'hecha'; const t = G.target(M); if (!t) return 'sin objetivo'; G.player.place(t.x + 1.0, t.z + 1.0, 0); return 'paso ' + M.step; }, m.i);
      if (moved === 'hecha') break;
      await p.waitForTimeout(700); await tap('#cAct');
    }
    await p.waitForTimeout(st.k === 'pelota' ? 120 : 400);
  }
  const res = await p.evaluate((i) => { const G = window.__game, M = G.missions[i]; return { done: !!M.done, step: M.step, mode: G.mode, frozen: G.player.frozen, nota: document.querySelector('.errnote')?.textContent || '' }; }, m.i);
  console.log(JSON.stringify({ tipo: m.type, ...res, acciones: seen, errores: errs.slice(before) }));
  // dejar el juego libre para la siguiente
  for (let k = 0; k < 15; k++) { const st = await respond(); if (st.k === 'nada') break; await p.waitForTimeout(400); }
}
console.log('TOTAL errores', errs.length, JSON.stringify([...new Set(errs)].slice(0, 20), null, 1));
await browser.close();
