// Responsive en todos los dispositivos: abre cada pantalla del menú (en el modo de juego y en el didáctico), las fichas
// y las ventanas de primera vez en 21 tamaños, del móvil plegado (280 px) a la pantalla de 2560, y mide lo que se vería
// mal: desplazamiento de lado, algo que se sale de la pantalla sin poder llegar a ello, texto que no cabe en su caja,
// contenido cortado sin barra, botones pequeños para el dedo (menos de 40 px en pantallas táctiles), letra de menos de
// 12 px, botones encima de otros y palabras partidas o cortadas con «…» (tools/palabras-medir.mjs). Guarda la foto de cada pantalla con problemas (y de unas cuantas siempre).
// Uso: node tools/responsive.mjs [carpeta] [dispositivos] [pantallas]   (URL=http://127.0.0.1:5173/; dispositivos y
//      pantallas, separados por comas: los nombres de DEV y de las listas de abajo; sin ellos, todos)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { PALABRAS } from './palabras-medir.mjs';
const [,, out = 'entrega/responsive', onlyDev = '', onlyScr = ''] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173/';
export const DEV = {
  fold: [280, 653, 1], se1: [320, 568, 1], android: [360, 640, 1], se: [375, 667, 1], iphone: [390, 844, 1], max: [430, 932, 1],
  'se1-h': [568, 320, 1], 'se-h': [667, 375, 1], 'iphone-h': [844, 390, 1], 'max-h': [932, 430, 1],
  'ipad-mini': [744, 1133, 1], ipad: [820, 1180, 1], 'ipad-pro': [1024, 1366, 1], 'ipad-h': [1180, 820, 1], 'ipad-pro-h': [1366, 1024, 1],
  portatil: [1280, 720, 0], 'portatil-2': [1366, 768, 0], mac: [1440, 900, 0], fhd: [1920, 1080, 0], qhd: [2560, 1440, 0], '4k-escalado': [1707, 960, 0],
};
// pantallas del menú: [nombre, código que la abre]
const JUEGO = [['home', `H.go('home')`], ['map', `H.go('map')`], ['comarca', `H.go('comarca','bidasoa')`], ['towns', `H.go('towns')`], ['hoja-pueblo', `H.go('towns'); H.townSheet('olite')`],
  ['sports', `H.go('sports')`], ['personajes', `H.go('personajes')`], ['avatars', `H.go('avatars')`], ['peaks', `H.go('peaks')`], ['nature', `H.go('nature')`], ['escudos', `H.go('escudos')`],
  ['cuentos', `H.go('cuentos')`], ['instrumentos', `H.go('instrumentos')`], ['pasaka', `H.go('pasaka')`], ['album', `H.go('album')`], ['badges', `H.go('badges')`], ['passport', `H.go('passport')`],
  ['profile', `H.go('profile')`], ['mas', `H.go('home'); H.more()`],
  ['ficha-personaje', `H.go('personajes'); document.querySelector('[data-personaje]').click()`], ['ficha-figura', `H.go('personajes'); document.querySelector('[data-figura]').click()`],
  ['ficha-instrumento', `H.go('instrumentos'); document.querySelector('[data-instrumento]').click()`], ['ficha-escudo', `H.go('escudos'); document.querySelector('button.ar[data-arm]').click()`],
  ['ficha-fauna', `H.go('nature'); document.querySelector('.scard[data-k]').click()`], ['visor', `H.go('album'); document.querySelector('[data-lam]').click()`],
  ['bienvenida', `H.onboarding()`]];
const DIDAC = [['d-home', `H.go('home')`], ['d-map', `H.go('map')`], ['d-comarca', `H.go('comarca','ribera')`], ['d-towns', `H.go('towns')`], ['d-pueblo-lesaka', `H.go('pueblo','lesaka')`],
  ['d-pueblo-olite', `H.go('pueblo','olite')`], ['d-pueblo-orreaga', `H.go('pueblo','orreaga-roncesvalles')`], ['d-pueblo-pamplona', `H.go('pueblo','pamplona')`], ['d-cuentos', `H.go('cuentos')`],
  ['d-tradiciones', `H.go('tradiciones')`], ['d-oficios', `H.go('oficios')`], ['d-productos', `H.go('productos')`], ['d-historia', `H.go('historia')`], ['d-euskera', `H.go('euskera')`],
  ['d-nature', `H.go('nature')`], ['d-peaks', `H.go('peaks')`], ['d-escudos', `H.go('escudos')`], ['d-instrumentos', `H.go('instrumentos')`], ['d-album', `H.go('album')`], ['d-personajes', `H.go('personajes')`],
  ['d-profile', `H.go('profile')`], ['d-mas', `H.go('home'); H.more()`], ['d-ficha-oficio', `H.go('pueblo','olite'); document.querySelector('[data-ficha]').click()`]];
const SIEMPRE = new Set(['home', 'd-home', 'd-pueblo-olite', 'd-oficios', 'hoja-pueblo', 'ficha-personaje', 'bienvenida', 'map']);

const MEDIR = (touch) => {
  const W = innerWidth, H = innerHeight, issues = [], seen = new Set(), MIN = touch ? 40 : 24;
  const shown = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity >= 0.05; };
  const vis = (e) => { if (!shown(e)) return false; if (e.closest('details:not([open])') && !e.closest('summary')) return false;   // (lo de dentro de un desplegable cerrado no se ve)
    const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return false; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) if (!shown(q)) return false; return true; };
  // el contenedor que se desplaza (a lo alto o a lo ancho) y deja llegar a lo que está fuera
  const scroller = (e, ax) => { for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const s = getComputedStyle(q); const ov = ax === 'x' ? s.overflowX : s.overflowY; if (/(auto|scroll)/.test(ov) && (ax === 'x' ? q.scrollWidth > q.clientWidth + 1 : q.scrollHeight > q.clientHeight + 1)) return q; } return null; };
  const name = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + (e.id ? '#' + e.id : '') + (e.textContent ? ' «' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 26) + '»' : '');
  const add = (k, e, x = '') => { const key = k + name(e); if (seen.has(key)) return; seen.add(key); issues.push([k, name(e), x]); };
  const de = document.documentElement;
  if (de.scrollWidth > W + 1) issues.push(['página de lado', 'html', `${de.scrollWidth}>${W}`]);
  const main = document.querySelector('#hMain'); if (main && main.scrollWidth > main.clientWidth + 1) issues.push(['menú de lado', '#hMain', `${main.scrollWidth}>${main.clientWidth}`]);
  const roots = [...document.querySelectorAll('#hub, .mg-overlay, .onb, .lam-view, [role=dialog]')].filter(vis);
  for (const R of roots) for (const e of [R, ...R.querySelectorAll('*')]) {
    if (!vis(e) || /^(svg|path|g|circle|text|tspan|defs|use|rect|line|polygon|polyline|ellipse|linearGradient|radialGradient|stop|i|canvas)$/i.test(e.tagName) || e.closest('svg')) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (e.closest('.hub-bg') || s.position === 'fixed' && e.classList.contains('mote')) continue;
    if ((r.left < -2 || r.right > W + 2) && !scroller(e, 'x') && r.width < W * 3 && s.pointerEvents !== 'none') add('se sale de lado', e, `${Math.round(r.left)}..${Math.round(r.right)}`);
    if ((r.top < -2 || r.bottom > H + 2) && !scroller(e, 'y') && s.position !== 'absolute' && r.height < H * 3) add('se sale de alto', e, `${Math.round(r.top)}..${Math.round(r.bottom)}`);
    if (/(hidden|clip)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 20 && !/ellipsis/.test(s.textOverflow) && !e.classList.contains('vm-clamp') && !/(img|figure|picture)/i.test(e.tagName) && e.textContent.trim().length > 2 && !e.querySelector('img,canvas') ) add('cortado', e, `${e.scrollHeight - e.clientHeight}px`);
    if (e.childElementCount === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 2 && /(hidden|clip)/.test(s.overflowX) && s.textOverflow !== 'ellipsis') add('texto no cabe', e, `${e.scrollWidth}>${e.clientWidth}`);
    if (e.childElementCount === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 2 && !/(hidden|clip)/.test(s.overflowX) && s.whiteSpace === 'nowrap' && e.getBoundingClientRect().right > (e.parentElement?.getBoundingClientRect().right ?? W) + 2) add('texto se desborda', e, `${e.scrollWidth}>${e.clientWidth}`);
    // texto más ancho que su caja (se monta sobre lo de al lado) o recortado por un contenedor que recorta (no por uno que se
    // desplaza): cada trozo de texto del elemento, también el que va junto a un icono
    if (s.textOverflow !== 'ellipsis' && !e.closest('svg,.cs-bgname')) for (const n of e.childNodes) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect(); if (t.width < 4) continue;
      if (s.overflowX === 'visible' && (t.width > r.width + 3 || t.left < r.left - 3 || t.right > r.right + 3)) { add('texto fuera de su caja', e, `${Math.round(t.width)}>${Math.round(r.width)}`); break; }
      let L = -1e9, R2 = 1e9; for (let q = e; q && q !== document.body; q = q.parentElement) { const cs = getComputedStyle(q); if (/(auto|scroll)/.test(cs.overflowX) && q !== e) break; if (/(hidden|clip)/.test(cs.overflowX)) { const qr = q.getBoundingClientRect(); L = Math.max(L, qr.left); R2 = Math.min(R2, qr.right); } }   // (dentro de algo que se desplaza, lo de fuera se alcanza)
      if (t.left < L - 3 || t.right > R2 + 3) { add('texto recortado', e, `${Math.round(t.left)}..${Math.round(t.right)} de ${Math.round(L)}..${Math.round(R2)}`); break; }
    }
    // una lista que se desplaza hacia abajo y, sin querer, también de lado (lo que se sale no se ve si no se arrastra de lado)
    // (las tiras hechas para ir de lado —una fila flex sin saltos o una rejilla en columnas— no cuentan)
    const rail = (/flex/.test(s.display) && !/column/.test(s.flexDirection) && s.flexWrap === 'nowrap') || (/grid/.test(s.display) && /column/.test(s.gridAutoFlow));
    if (!rail && /(auto|scroll)/.test(s.overflowX) && /(auto|scroll)/.test(s.overflowY) && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 40) add('desplaza de lado', e, `${e.scrollWidth}>${e.clientWidth}`);
    // (la zona que se toca puede ser mayor que el botón: un ::before absoluto con márgenes negativos la agranda)
    const hit = (() => { const bs = getComputedStyle(e, '::before'); if (bs.content === 'none' || bs.position !== 'absolute') return [r.width, r.height]; const n = (v) => Math.max(0, -parseFloat(v) || 0); return [r.width + n(bs.left) + n(bs.right), r.height + n(bs.top) + n(bs.bottom)]; })();
    if ((e.tagName === 'BUTTON' || e.tagName === 'SELECT' || e.tagName === 'SUMMARY' || e.getAttribute('role') === 'button' || (e.tagName === 'A' && e.href)) && (hit[1] < MIN || hit[0] < MIN) && !e.closest('.lam-rail') && !e.classList.contains('vm-btn')) add('botón pequeño', e, `${Math.round(r.width)}x${Math.round(r.height)}`);
    if (e.childElementCount === 0 && e.textContent.trim() && parseFloat(s.fontSize) < 12 && !e.closest('svg')) add('letra < 12px', e, s.fontSize);
  }
  // lo que de verdad se ve de un botón: su caja recortada por los contenedores que recortan (lo que se ha desplazado
  // fuera de su caja no está encima de nada)
  const clip = (e) => { let r = e.getBoundingClientRect(), L = Math.max(0, r.left), T = Math.max(0, r.top), R = Math.min(W, r.right), B = Math.min(H, r.bottom);
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const cs = getComputedStyle(q); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const qr = q.getBoundingClientRect(); L = Math.max(L, qr.left); T = Math.max(T, qr.top); R = Math.min(R, qr.right); B = Math.min(B, qr.bottom); } }
    return { left: L, top: T, right: R, bottom: B }; };
  // (y solo los que se pueden tocar: los que quedan debajo de una ventana abierta no están encima de nada)
  const reach = ([e, r]) => { const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return t && (e === t || e.contains(t) || t.contains(e)); };
  const btns = roots.flatMap(R => [...R.querySelectorAll('button, select, summary, [role=button]')]).filter(vis).map(e => [e, clip(e)]).filter(([, r]) => r.right - r.left > 2 && r.bottom - r.top > 2).filter(reach);
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
    const [ea, a] = btns[i], [eb, c] = btns[j]; if (ea.contains(eb) || eb.contains(ea)) continue;
    const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    if (ox > 6 && oy > 6) { const t = document.elementFromPoint(Math.max(a.left, c.left) + ox / 2, Math.max(a.top, c.top) + oy / 2); if (t && (ea.contains(t) || eb.contains(t))) add('botones encima', ea, name(eb)); }
  }
  const stuck = (e) => { for (let q = e; q && q !== document.body; q = q.parentElement) if (getComputedStyle(q).position === 'sticky') return q; return null; };
  // textos que se pisan (en lo que se ve de la pantalla): dos textos sueltos uno encima del otro, ninguno dentro del otro
  const T = roots.flatMap(R => [...R.querySelectorAll('*')]).filter(e => e.childElementCount === 0 && e.textContent.trim() && !/^(svg|text|tspan|option)$/i.test(e.tagName) && vis(e) && !e.closest('svg,.cs-bgname')).map(e => [e, clip(e)]).filter(([, r]) => r.right - r.left > 2 && r.bottom - r.top > 2).filter(reach);   // (lo de debajo de una ventana, no)
  for (let i = 0; i < T.length && i < 900; i++) for (let j = i + 1; j < T.length && j < 900; j++) {
    const [ea, a] = T[i], [eb, c] = T[j]; if (ea.contains(eb) || eb.contains(ea)) continue;
    const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    // (dos trozos de la misma línea de texto no se pisan, y lo que pasa por debajo de un pie pegado, tampoco)
    if (ox > 4 && oy > 4 && getComputedStyle(ea).position !== 'absolute' && getComputedStyle(eb).position !== 'absolute' && !(getComputedStyle(ea).display === 'inline' && getComputedStyle(eb).display === 'inline') && stuck(ea) === stuck(eb)) add('textos encima', ea, name(eb));
  }
  return issues;
};

const report = {};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [dev, [W, H, touch]] of Object.entries(DEV)) {
  if (onlyDev && !onlyDev.split(',').includes(dev)) continue;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: !!touch && Math.min(W, H) < 800, hasTouch: !!touch });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  try {
  await p.addInitScript((IDIOMA) => { try { if (!sessionStorage.getItem('rs')) { sessionStorage.setItem('rs', 1); localStorage.setItem('mendimendiz-lang', IDIOMA); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', avatar: 'pelotari', xp: 900, seen: { heroBenat: true, dog: true }, cards: ['cuento:aralar', 'armas:navarra'], settings: { quality: 'low' } })); } } catch (e) { } }, process.env.IDIOMA || 'es');   // (IDIOMA=eu: todo en euskera, que tiene palabras más largas)
  await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub && window.__ready, null, { timeout: 300000 }); await p.waitForTimeout(1500);
    report[dev] = {};
  for (const [k, code] of [...JUEGO, ['__didactico', `H.setDidactico(true)`], ...DIDAC]) {
    if (onlyScr && !onlyScr.split(',').includes(k) && k !== '__didactico') continue;
    try {
      await p.evaluate((code) => { const H = window.__hub; document.querySelectorAll('.mg-overlay,.onb,.sheet,.lam-view').forEach(o => o.remove()); H.sheet = null; H.ui && (H.ui.busy = false); eval(code); }, code);
      if (k === '__didactico') { await p.waitForTimeout(800); continue; }
      await p.waitForTimeout(/ficha|visor|bienvenida/.test(k) ? 1600 : 900);
      await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }));
      const iss = await p.evaluate(MEDIR, touch);
      iss.push(...await p.evaluate(PALABRAS, '#hub, .mg-overlay, .onb, .lam-view, [role=dialog]'));   // (y ninguna palabra partida ni cortada)
      report[dev][k] = iss;
      if (iss.length || SIEMPRE.has(k)) await p.screenshot({ path: `${out}/${dev}-${W}x${H}-${k}.jpg`, quality: 60 });
    } catch (e) { report[dev][k] = [['error', String(e.message).slice(0, 160), '']]; }
  }
  } catch (e) { report[dev] = { __fallo: [['no carga', String(e.message).slice(0, 160), '']] }; }   // (un tamaño que no carga no para los demás)
  if (errs.length) report[dev].__errores = errs.slice(0, 5);
  await ctx.close();
  writeFileSync(`${out}/informe.json`, JSON.stringify(report, null, 1));   // (el informe, al día después de cada tamaño)
  const n = Object.values(report[dev]).reduce((a, L) => a + (Array.isArray(L) ? L.length : 0), 0);
  console.log(dev.padEnd(12), `${W}x${H}`.padEnd(10), n ? `${n} problemas` : 'bien', errs.length ? 'ERRORES ' + errs.slice(0, 2).join(' | ') : '');
}
writeFileSync(`${out}/informe.json`, JSON.stringify(report, null, 1));
await b.close();
