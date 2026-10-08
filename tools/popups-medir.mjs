// Pop-ups medidos (no solo fotos): en tamaños de iPhone y iPad abre cada ventana del juego (pueblo, minijuegos, pelota,
// fútbol, liga y torneo) y anota lo que en el móvil se vería mal: algo que se sale de la pantalla sin poder desplazarse,
// contenido cortado (sin barra), texto que no cabe en su caja, botones de menos de 36 px, botones encima de otros y letra
// de menos de 11 px. Guarda una foto de cada uno. Uso: node tools/popups-medir.mjs [carpeta] [tamaños]
import { chromium } from 'playwright-core';
import { iphone } from './iphone.mjs';
import { casos, cargarModulos } from './ventanas-casos.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const [,, out = 'entrega/popups-medidos', sizes = '667x375,844x390,932x430,1180x820,390x844'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const MEDIR = () => {
  const W = innerWidth, H = innerHeight, issues = [], seen = new Set();
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const shown = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity >= 0.05; };
  const allVis = (e) => { if (!vis(e)) return false; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) if (!shown(q)) return false; return true; };
  const scroller = (e) => { for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const s = getComputedStyle(q); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (q.scrollHeight > q.clientHeight + 1 || q.scrollWidth > q.clientWidth + 1)) return q; } return null; };
  const name = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + (e.id ? '#' + e.id : '') + (e.textContent ? ' «' + e.textContent.trim().slice(0, 28) + '»' : '');
  const add = (k, e, x = '') => { const key = k + name(e); if (seen.has(key)) return; seen.add(key); issues.push([k, name(e), x]); };
  const roots = [...document.querySelectorAll('.champ,.screen,#reward,#dialog,.mg-overlay,.fb-panel,.pel-panel,.lg-root,.tn-root,.fb-msg.on,.pel-call.on,.modal,[role=dialog]')].filter(allVis);
  // zonas seguras (notch y barra de inicio del iPhone): texto o botones dentro
  const pr = document.createElement('div'); pr.style.cssText = 'position:fixed;padding:0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(pr);
  const pcs = getComputedStyle(pr), SL = parseFloat(pcs.paddingLeft), SR = parseFloat(pcs.paddingRight), SB = parseFloat(pcs.paddingBottom); pr.remove();
  for (const R of roots) for (const e of [R, ...R.querySelectorAll('*')]) {
    if (!allVis(e)) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e), sc = scroller(e);
    // fuera de la pantalla sin poder desplazarse hasta ello
    if (!sc && s.pointerEvents !== 'none' && (r.left < -2 || r.right > W + 2 || r.top < -2 || r.bottom > H + 2) && !/^(svg|path|g|i|canvas)$/i.test(e.tagName) && r.width < W * 3) add('se sale', e, `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    // contenido cortado: caja que recorta sin barra
    if (/(hidden|clip)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 20 && !/(ellipsis)/.test(s.textOverflow)) add('cortado', e, `${e.scrollHeight - e.clientHeight}px`);
    // texto que no cabe a lo ancho
    if (e.childElementCount === 0 && e.textContent.trim() && /(hidden|clip)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis') add('texto no cabe', e, `${e.scrollWidth}>${e.clientWidth}`);
    // dentro del notch o de la barra de inicio (solo texto y botones, no fondos)
    if ((SL || SR || SB) && (e.tagName === 'BUTTON' || (e.childElementCount === 0 && e.textContent.trim())) && (r.left < SL - 2 || r.right > W - SR + 2 || (r.bottom > H - SB + 2 && r.top < H))) { const sc2 = scroller(e); const cut = sc2 && r.bottom > sc2.getBoundingClientRect().bottom; if (!cut) add('zona del notch', e, `${Math.round(r.left)}-${Math.round(r.right)} x ${Math.round(r.bottom)}`); }
    // botones pequeños
    if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || (e.tagName === 'A' && e.href)) && (r.height < 36 || r.width < 36)) add('botón pequeño', e, `${Math.round(r.width)}x${Math.round(r.height)}`);
    // letra diminuta
    if (e.childElementCount === 0 && e.textContent.trim() && parseFloat(s.fontSize) < 11) add('letra < 11px', e, s.fontSize);
  }
  // botón de acción (seguir, jugar, salir, cerrar) que no se ve entero sin desplazar: en el móvil no se sabe que está
  const ACT = '.fb-go,.fb-alt,.pel-go,.btn.primary,.lg-btn:not(.lg-rv),.mg-card>button,.mg-card .btn,.close,#reward button';
  for (const R of roots) for (const e of R.querySelectorAll(ACT)) {
    if (!allVis(e)) continue; const r = e.getBoundingClientRect(); let top = 0, bot = H;
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const cs = getComputedStyle(q); if (/(auto|scroll|hidden)/.test(cs.overflowY)) { const qr = q.getBoundingClientRect(); top = Math.max(top, qr.top); bot = Math.min(bot, qr.bottom); } }
    if (r.bottom > bot + 1 || r.top < top - 1) add('acción oculta', e, `${Math.round(r.top)}-${Math.round(r.bottom)} de ${Math.round(top)}-${Math.round(bot)}`);
  }
  // botones encima de otros (solo si de verdad tapan: el de encima es el que se toca)
  const btns = roots.flatMap(R => [...R.querySelectorAll('button')]).filter(allVis).map(e => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const [ea, a] = btns[i], [eb, c] = btns[j]; if (ea.contains(eb) || eb.contains(ea)) continue; const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ox > 6 && oy > 6) { const cx = (Math.max(a.left, c.left) + Math.min(a.right, c.right)) / 2, cy = (Math.max(a.top, c.top) + Math.min(a.bottom, c.bottom)) / 2, top = document.elementFromPoint(cx, cy); if (top && (ea.contains(top) || eb.contains(top))) { const other = ea.contains(top) ? eb : ea, orr = other.getBoundingClientRect(); const vis2 = document.elementFromPoint((orr.left + orr.right) / 2, (orr.top + orr.bottom) / 2); if (vis2 && other.contains(vis2)) add('botones solapados', ea, name(eb)); } } }
  return { roots: roots.length, issues };
};
const report = {};
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number), touch = Math.min(W, H) < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: touch && W < 1000, hasTouch: touch });
  const p = await ctx.newPage(); await iphone(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=lumbier&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await cargarModulos(p);
  const CASES = casos(touch);

  report[sz] = {};
  for (const [k, code] of Object.entries(CASES)) {
    if (process.env.SOLO && !process.env.SOLO.split(',').includes(k)) continue;   // (SOLO=futbol-final,torneo: solo esas)
    try {
      await p.evaluate((code) => { const G = window.__game, M = window.__mods; G.ui.closeModal?.(); G.ui.dialogOpen = false; document.querySelectorAll('.mg-overlay,.lg-root,.tn-root,#dialog,.fb-root,.pm-test,#reward,.champ').forEach(o => o.remove()); window.__r = eval(code); window.__r?.catch?.(() => {}); }, code);
      await p.waitForTimeout(k === 'ficha' || k === 'mapa' ? 2500 : 700);
      await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }));
      const r = await p.evaluate(MEDIR);
      report[sz][k] = r.roots ? r.issues : [['sin ventana', '', '']];
      await p.screenshot({ path: `${out}/${sz}-${k}.png` });
    } catch (e) { report[sz][k] = [['error', String(e.message).slice(0, 140), '']]; }
  }
  if (errs.length) report[sz].__errores = errs.slice(0, 5);
  await ctx.close();
}
writeFileSync(`${out}/informe.json`, JSON.stringify(report, null, 1));
let n = 0; for (const [sz, R] of Object.entries(report)) for (const [k, L] of Object.entries(R)) if (L.length) { n += L.length; console.log(sz, k, JSON.stringify(L).slice(0, 600)); }
console.log(n ? `${n} problemas` : 'Todo cabe y se lee bien');
await b.close();
