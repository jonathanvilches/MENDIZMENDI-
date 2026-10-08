// Auditoría de interfaz en el móvil tumbado (y en el iPad): en cada ventana del juego mide lo que hace que una pantalla
// se vea «hecha a mano» y no de una pieza:
//  · táctil: botones de menos de 44 px (el dedo no acierta);
//  · rejilla: rellenos, márgenes y huecos que no van en pasos de 4 px (2, 4, 8, 12, 16, 20, 24, 32, 40, 48…);
//  · interlineado: títulos de 1 a 1,25; párrafos de 1,35 a 1,55; botones de 1 a 1,3;
//  · interletrado: párrafos sin espaciar; mayúsculas con algo de aire (0,04 em o más);
//  · letra: tamaños fuera de la escala (12 14 16 20 24 32 40 48 72);
//  · alineación: botones de una misma fila con distinta altura o con huecos distintos entre ellos;
//  · orden: la acción principal a la derecha de la secundaria;
//  · cabe: si la ventana obliga a desplazar (y cuánto), para ver si iría mejor en dos columnas;
//  · contraste: texto sobre su fondo por debajo de 4,5 (3 en letra grande).
// Uso: node tools/ux-medir.mjs [carpeta] [tamaños] (SOLO=pelota-inicio,torneo para unas pocas)   (servidor en 5173)
import { chromium } from 'playwright-core';
import { iphone } from './iphone.mjs';
import { casos, cargarModulos } from './ventanas-casos.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const [,, out = 'entrega/ux', sizes = '844x390,1180x820'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const MEDIR = (rootSel) => {
  const W = innerWidth, H = innerHeight, F = {}, add = (k, e, x) => { (F[k] ||= []).push([name(e), x]); };
  const shown = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity >= 0.05; };
  const vis = (e) => { if (!shown(e)) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { if (!shown(q)) return false; if (q.tagName === 'DETAILS' && !q.open && !e.closest('summary')) return false; } return true; };
  const name = (e) => (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).filter(c => !/^(on|vm-)/.test(c)).slice(0, 2).join('.') : e.tagName.toLowerCase()) + (e.textContent?.trim() ? ' «' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 24) + '»' : '');
  const roots = [...document.querySelectorAll(rootSel)].filter(vis);
  const SCALE = [12, 14, 16, 20, 24, 32, 40, 48, 72], GRID = (v) => { v = Math.abs(v); return v < 0.5 || Math.abs(v - 1) < 0.01 || Math.abs(v - 2) < 0.01 || Math.abs(v / 4 - Math.round(v / 4)) < 0.01; };
  const isBtn = (e) => e.tagName === 'BUTTON' || e.tagName === 'SUMMARY' || e.getAttribute('role') === 'button' || (e.tagName === 'A' && e.hasAttribute('href')) || (e.tagName === 'INPUT' && e.type !== 'hidden') || e.tagName === 'SELECT';
  const role = (e) => { const t = e.tagName; if (/^H[1-6]$/.test(t) || /(^|\s)(title|pel-title)(\s|$)/.test(e.className)) return 'título'; if (isBtn(e) || e.closest('button,summary,[role=button]')) return 'botón'; if (t === 'P' || t === 'LI' || t === 'DD') return 'párrafo'; return 'otro'; };
  const own = (e) => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  // color de fondo efectivo: el primer antepasado con fondo casi opaco (lo translúcido se mezcla sobre un gris medio,
  // que es lo que suele haber detrás: el pueblo)
  const rgba = (c) => { const m = c.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lumi = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (e) => { const layers = []; for (let q = e; q && q !== document.documentElement; q = q.parentElement) { const s = getComputedStyle(q); if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; const c = rgba(s.backgroundColor); if (/gradient/.test(s.backgroundImage)) { const g = s.backgroundImage.match(/rgba?\([^)]+\)/); if (g) { const gc = rgba(g[0]); if (gc.a > c.a) Object.assign(c, gc); } } if (c.a > 0.02) { layers.push(c); if (c.a > 0.92) break; } } let base = { r: 110, g: 120, b: 110 }; for (const c of layers.reverse()) base = { r: base.r * (1 - c.a) + c.r * c.a, g: base.g * (1 - c.a) + c.g * c.a, b: base.b * (1 - c.a) + c.b * c.a }; return base; };
  const hasOpaque = (e) => { for (let q = e; q && q !== document.documentElement; q = q.parentElement) { const s = getComputedStyle(q); if (rgba(s.backgroundColor).a > 0.5 || /gradient|url/.test(s.backgroundImage)) return true; } return false; };
  let scrollNeed = 0, panelW = 0, panelH = 0, edge = null;
  for (const R of roots) {
    const rr = R.getBoundingClientRect(); panelW = Math.max(panelW, rr.width); panelH = Math.max(panelH, rr.height);
    // lo que hay que desplazar dentro de la ventana para verla entera
    for (const q of [R, ...R.querySelectorAll('*')]) { if (!vis(q)) continue; const s = getComputedStyle(q); if (/(auto|scroll)/.test(s.overflowY) && q.scrollHeight > q.clientHeight + 4) scrollNeed = Math.max(scrollNeed, q.scrollHeight - q.clientHeight); }
    // la tarjeta principal: su margen con los bordes de la pantalla
    const card = R.querySelector('.mg-card,.pel-card,.fb-card,.lg-card,.paper,.tn-card,.ch-card,.dlg') || R; const cr = card.getBoundingClientRect();
    if (cr.width < W - 1 || cr.height < H - 1) edge = [Math.round(cr.left), Math.round(W - cr.right), Math.round(cr.top), Math.round(H - cr.bottom)];
    for (const e of [R, ...R.querySelectorAll('*')]) {
      if (!vis(e) || /^(svg|path|g|i|u|b|em|strong|span|circle|rect|use|br|img|canvas)$/i.test(e.tagName) && !isBtn(e) && !own(e)) continue;
      const s = getComputedStyle(e), r = e.getBoundingClientRect(), fs = parseFloat(s.fontSize), txt = own(e);
      // táctil (con su zona ampliada si el botón la tiene, ::before con inset negativo)
      if (isBtn(e) && s.pointerEvents !== 'none' && !(e.tagName === 'INPUT' && e.closest('label') && Math.min(e.closest('label').getBoundingClientRect().height, e.closest('label').getBoundingClientRect().width) >= 44)) { const bf = getComputedStyle(e, '::before'), grow = bf.position === 'absolute' && bf.content !== 'none' ? Math.max(0, -parseFloat(bf.top) || 0) : 0, w = r.width + 2 * grow, h = r.height + 2 * grow; if (Math.min(w, h) < 44) add('táctil < 44', e, `${Math.round(w)}x${Math.round(h)}`); }
      // rejilla de 4 px
      const sp = [['padding', ['Top', 'Right', 'Bottom', 'Left']], ['margin', ['Top', 'Right', 'Bottom', 'Left']]].flatMap(([k, sides]) => sides.map(sd => [k + sd, parseFloat(s[k + sd]) || 0]));
      if (/(flex|grid)/.test(s.display)) sp.push(['rowGap', parseFloat(s.rowGap) || 0], ['columnGap', parseFloat(s.columnGap) || 0]);
      const off = sp.filter(([k, v]) => !GRID(v) && !(v < 0 && Math.abs(v) <= 2) && !(/^margin/.test(k) && Math.abs(v) > 64));   // (márgenes enormes: son «auto», para centrar)
      if (off.length) add('fuera de la rejilla', e, off.map(([k, v]) => `${k} ${+v.toFixed(1)}`).join(', '));
      if (!txt || txt.length < 2) continue;
      // letra
      const k = role(e);
      if (!SCALE.includes(Math.round(fs * 10) / 10) && !(fs > 32 && fs < 85)) add('letra fuera de escala', e, `${k} ${+fs.toFixed(1)}px`);
      // interlineado
      const ch = r.height - (parseFloat(s.paddingTop) || 0) - (parseFloat(s.paddingBottom) || 0) - (parseFloat(s.borderTopWidth) || 0) - (parseFloat(s.borderBottomWidth) || 0);
      const lh = s.lineHeight === 'normal' ? NaN : parseFloat(s.lineHeight) / fs, lines = Math.round(ch / (parseFloat(s.lineHeight) || fs * 1.36));   // (líneas de texto: el alto sin rellenos)
      if (k === 'título' && lines > 1 && !(lh >= 0.99 && lh <= 1.26)) add('interlineado', e, `título ${isNaN(lh) ? 'normal' : lh.toFixed(2)}`);
      if (k === 'párrafo' && lines > 1 && !(lh >= 1.34 && lh <= 1.56)) add('interlineado', e, `párrafo ${isNaN(lh) ? 'normal' : lh.toFixed(2)}`);
      if (k === 'botón' && lines > 1 && !(lh >= 0.99 && lh <= 1.31)) add('interlineado', e, `botón ${isNaN(lh) ? 'normal' : lh.toFixed(2)}`);
      // interletrado
      const ls = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / fs;
      if (k === 'párrafo' && Math.abs(ls) > 0.011 && s.textTransform !== 'uppercase') add('interletrado', e, `párrafo ${ls.toFixed(2)}em`);
      if (s.textTransform === 'uppercase' && ls < 0.035) add('interletrado', e, `MAYÚSCULAS ${ls.toFixed(2)}em`);
      // contraste
      const bg = bgOf(e), fg = rgba(s.color), shadowed = [e, e.parentElement, e.parentElement?.parentElement].some(q => q && getComputedStyle(q).textShadow !== 'none');
      if (shadowed && bg && !hasOpaque(e)) { /* texto con sombra sobre el pueblo: se lee por su sombra */ } else
      if (bg && fg.a > 0.3 && !(s.webkitTextFillColor && /0\)$|transparent/.test(s.webkitTextFillColor))) { const f2 = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) }; const L1 = lumi(f2), L2 = lumi(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), big = fs >= 24 || (fs >= 18.6 && +s.fontWeight >= 700); if (cr < (big ? 3 : 4.5)) add('contraste', e, cr.toFixed(1)); }
    }
    // filas y columnas de botones: misma altura, mismo hueco, la principal a la derecha
    for (const c of [R, ...R.querySelectorAll('*')]) {
      if (!vis(c) || /menu|list/.test(c.className)) continue; const s = getComputedStyle(c); if (!/(flex|grid)/.test(s.display)) continue;   // (un menú de opciones no es una fila de acciones)
      const kids = [...c.children].filter(k => vis(k) && isBtn(k)).sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return Math.abs(A.top - B.top) > 3 ? A.top - B.top : A.left - B.left; }); if (kids.length < 2 || kids.length !== [...c.children].filter(vis).length) continue;   // (en el orden en que se ven)
      const rs = kids.map(k => k.getBoundingClientRect()), row = rs.every(q => Math.abs(q.top - rs[0].top) < 3);
      if (row) { const hs = rs.map(q => Math.round(q.height)); if (Math.max(...hs) - Math.min(...hs) > 1) add('fila desigual', c, `altos ${hs.join('/')}`); const gaps = rs.slice(1).map((q, i) => Math.round(q.left - rs[i].right)); if (gaps.length > 1 && Math.max(...gaps) - Math.min(...gaps) > 1) add('huecos desiguales', c, gaps.join('/'));
        // (la acción principal, la última de la fila: a la derecha, donde está el pulgar de las acciones)
        const prim = kids.findIndex(k => /(primary|pel-go|fb-go|\bgo\b)/.test(k.className) && !/\balt\b/.test(k.className)); if (prim >= 0 && prim < kids.length - 1) add('principal a la izquierda', c, name(kids[prim])); }
    }
  }
  return { roots: roots.length, F, scrollNeed, panel: [Math.round(panelW), Math.round(panelH)], edge };
};
const ROOTS = '.champ,.screen,#reward,#dialog,.mg-overlay,.fb-panel,.pel-panel,.lg-root,.tn-root,.fb-msg.on,.pel-call.on,.modal,[role=dialog]';
const EXTRA = {
  hud: { code: `null`, roots: '#ui' },
  'pelota-hud': { code: `(() => { const root = document.createElement('div'); root.className = 'pm-test'; document.body.appendChild(root); const h = new M.PH.PelotaHud(root, M.PR.TEXT.es, { you: 'Ane', rival: 'Mikel Etxeberria' }, TOUCH); h.setScore(3, 2, 'you', 'a 7 tantos'); h.controls(true); })()`, roots: '.pel-root' },
  'futbol-hud': { code: `(() => { const h = window.__fh = new M.FH.FutbolHud({ touch: TOUCH, home: { name: 'Club Atlético Osasuna', short: 'OSA', shirt: '#d00' }, away: { name: 'Club Deportivo Tudelano', short: 'TUD', shirt: '#06c' } }); h.setMode('atk'); h.setScore(1, 0); h.setClock(1234, 1); })()`, roots: '.fb-root' },
};
const report = {};
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number), touch = Math.min(W, H) < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: touch && W < 1000, hasTouch: touch });
  const p = await ctx.newPage(); await iphone(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`${process.env.URL || 'http://127.0.0.1:5173'}/?town=lumbier&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await cargarModulos(p);
  const ALL = { ...Object.fromEntries(Object.entries(casos(touch)).map(([k, code]) => [k, { code, roots: ROOTS }])), ...Object.fromEntries(Object.entries(EXTRA).map(([k, v]) => [k, { ...v, code: v.code.replace(/TOUCH/g, String(touch)) }])) };
  report[sz] = {};
  for (const [k, { code, roots }] of Object.entries(ALL)) {
    if (process.env.SOLO && !process.env.SOLO.split(',').includes(k)) continue;
    try {
      await p.evaluate((code) => { const G = window.__game, M = window.__mods; G.ui.closeModal?.(); G.ui.dialogOpen = false; window.__fh?.dispose?.(); document.querySelectorAll('.mg-overlay,.lg-root,.tn-root,#dialog,.fb-root,.pm-test,#reward,.champ').forEach(o => o.remove()); window.__r = eval(code); window.__r?.catch?.(() => {}); }, code);
      await p.waitForTimeout(k === 'ficha' || k === 'mapa' ? 2500 : 800);
      await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }));
      report[sz][k] = await p.evaluate(MEDIR, roots);
      await p.screenshot({ path: `${out}/${sz}-${k}.png`, timeout: 120000 }).catch(() => {});
    } catch (e) { report[sz][k] = { error: String(e.message).slice(0, 160) }; }
  }
  // el menú (centro de mando): sus pantallas, con las mismas reglas (aquí desplazar es normal: son páginas)
  if (!process.env.SOLO || process.env.SOLO.includes('hub')) {
    const h = await ctx.newPage(); h.on('pageerror', e => errs.push(e.message));
    await h.goto(`${process.env.URL || 'http://127.0.0.1:5173'}/?q=low&weather=clear`, { timeout: 300000 });
    await h.waitForFunction(() => window.__ready && window.__hub?.visible, null, { timeout: 300000 });
    for (const sc of ['home', 'map', 'towns', 'sports', 'avatars', 'peaks', 'nature', 'escudos', 'cuentos', 'badges', 'passport', 'profile']) {
      try {
        await h.evaluate((sc) => window.__hub.go(sc), sc); await h.waitForTimeout(2000);
        await h.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }));
        const m = await h.evaluate(MEDIR, '#hub'); m.scrollNeed = 0; report[sz]['hub-' + sc] = m;
        await h.screenshot({ path: `${out}/${sz}-hub-${sc}.png`, timeout: 120000 }).catch(() => {});
      } catch (e) { report[sz]['hub-' + sc] = { error: String(e.message).slice(0, 160) }; }
    }
    await h.close();
  }
  if (errs.length) report[sz].__errores = errs.slice(0, 5);
  await ctx.close();
}
writeFileSync(`${out}/ux.json`, JSON.stringify(report, null, 1));
// resumen: por tamaño y ventana, cuántos fallos de cada tipo y los primeros ejemplos
const tot = {};
for (const [sz, R] of Object.entries(report)) {
  console.log(`\n== ${sz}`);
  for (const [k, m] of Object.entries(R)) {
    if (k === '__errores') { console.log('  errores:', m); continue; }
    if (m.error || !m.roots) { console.log(`  ${k}: ${m.error || 'sin ventana'}`); continue; }
    const parts = Object.entries(m.F).map(([c, L]) => { tot[c] = (tot[c] || 0) + L.length; return `${c} ${L.length}`; });
    console.log(`  ${k}: ${m.panel.join('x')}${m.edge ? ' · bordes ' + m.edge.join('/') : ''}${m.scrollNeed ? ' · DESPLAZAR ' + m.scrollNeed + 'px' : ''}${parts.length ? ' · ' + parts.join(' · ') : ' · limpio'}`);
    for (const [c, L] of Object.entries(m.F)) console.log(`      ${c}: ${L.slice(0, 4).map(([n, x]) => `${n} (${x})`).join(' | ')}`);
  }
}
console.log('\nTOTAL', JSON.stringify(tot));
await b.close();
