// ¿Se monta algún texto con un icono, una chapa, un botón pequeño o con otro texto? En todas las pantallas del menú, la
// galería de pueblos uno por uno (cada nombre es distinto), las fichas y Ventajas, a varios tamaños de pantalla. Mide lo
// que se ve de cada línea de texto (de lo alto de las mayúsculas a la línea base, y en cursiva algo más a la derecha,
// por la inclinación) contra lo pintado de cada icono o caja pequeña, y avisa si quedan a menos de 6 px (3 px de un icono
// que va dentro del mismo texto) o si dos textos se pisan. Solo lo que se ve: ni lo tapado por una ventana ni lo que está
// fuera de la pantalla (las pantallas largas se recorren desplazándolas). Hace una captura de cada choque.
// Uso: node tools/choques.mjs [carpeta] [pantallas separadas por comas]   (SIZES=844x390,667x375,390x844,1280x720;
// URL=http://127.0.0.1:5173/)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';

/** En la página: los choques de lo que hay dentro de sel ({ txt, con, gap, caja }) */
export function choques(sel, G = 6) {
  const roots = [...document.querySelectorAll(sel)]; if (!roots.length) return [];
  // (todo tocable mientras se mide: lo que no se toca, como los rótulos del mapa, también se ve, y elementFromPoint lo encuentra)
  const toca = document.createElement('style'); toca.textContent = '* { pointer-events: auto !important; }'; document.head.appendChild(toca);
  try { return mide(); } finally { toca.remove(); }
  function mide() {
  const st = (e) => getComputedStyle(e);
  const vis = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = st(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } return true; };
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : (e.className?.baseVal ? '.' + e.className.baseVal.split(/\s+/)[0] : ''));
  // (se ve si lo de encima en ese punto es él, algo suyo o algo que lo lleva dentro: no una ventana por encima)
  const arriba = (e, x, y) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false; const t = document.elementFromPoint(x, y); return !!t && (e.contains(t) || t.contains(e) || t === e); };
  const cv = document.createElement('canvas').getContext('2d'), M = new Map();
  const metr = (s) => { const k = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; let m = M.get(k); if (!m) { cv.font = k; const H = cv.measureText('HÁ'), D = cv.measureText('gjpqy');
    m = { fa: H.fontBoundingBoxAscent, fd: H.fontBoundingBoxDescent, cap: cv.measureText('H').actualBoundingBoxAscent, desc: D.actualBoundingBoxDescent }; M.set(k, m); } return m; };
  // (lo que va en capas en 3D distintas, como las cartas del anillo de la galería, se pisa a propósito: una va delante de otra)
  const escala = (e) => { const w = e.offsetWidth || e.getBBox?.().width; const q = e.getBoundingClientRect(); return w ? Math.max(0.3, Math.min(1, q.width / w)) : 1; };
  const capa = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) if (/^matrix3d/.test(st(x).transform)) return x; return null; };
  // (una capa girada, como las cartas de los lados del anillo, se ve en escorzo: su aire encoge hacia el fondo; se mide solo
  // lo que va de frente)
  const girada = (c) => { const m = c && st(c).transform.match(/matrix3d\(([^)]+)\)/); if (!m) return false; const v = m[1].split(',').map(Number); return Math.abs(v[2]) > 0.05 || Math.abs(v[8]) > 0.05; };
  // (de una imagen o un dibujo cuenta lo pintado, no su caja: los márgenes transparentes no se ven)
  const AB = new Map();
  const tinta = (e, q) => { try {
    if (e.tagName === 'svg') { const bb = e.getBBox(), m = e.getScreenCTM(); if (!bb.width || !m) return q; const a = new DOMPoint(bb.x, bb.y).matrixTransform(m), z = new DOMPoint(bb.x + bb.width, bb.y + bb.height).matrixTransform(m);
      return { left: Math.max(q.left, Math.min(a.x, z.x)), right: Math.min(q.right, Math.max(a.x, z.x)), top: Math.max(q.top, Math.min(a.y, z.y)), bottom: Math.min(q.bottom, Math.max(a.y, z.y)) }; }
    if (e.tagName === 'IMG' && e.complete && e.naturalWidth) { let a = AB.get(e.currentSrc);
      if (!a) { const W = Math.min(256, e.naturalWidth), H = Math.round(W * e.naturalHeight / e.naturalWidth), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(e, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data;
        let x0 = W, x1 = -1, y0 = H, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        a = x1 < 0 ? [0, 0, 1, 1] : [x0 / W, y0 / H, (x1 + 1) / W, (y1 + 1) / H]; AB.set(e.currentSrc, a); }
      const f = st(e).objectFit; let L = q.left, T = q.top, w = q.width, h = q.height;
      if (f === 'contain') { const k = Math.min(q.width / e.naturalWidth, q.height / e.naturalHeight); w = e.naturalWidth * k; h = e.naturalHeight * k; L += (q.width - w) / 2; T += (q.height - h) / 2; }
      else if (f === 'cover') return q;
      // (con desenfoque, lo pintado se ensancha lo que desenfoca)
      const bl = +(st(e).filter.match(/blur\(([\d.]+)px\)/)?.[1] || 0) * 2;
      return { left: L + a[0] * w - bl, top: T + a[1] * h - bl, right: L + a[2] * w + bl, bottom: T + a[3] * h + bl }; }
  } catch (x) { } return q; };
  const lineas = [], cosas = [], tapados = [];
  for (const r of roots) {
    const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const t = n.textContent.trim(), e = n.parentElement; if (!t || !e || !vis(e) || e.closest('svg, script, style')) continue;
      const s = st(e), m = metr(s), fs = parseFloat(s.fontSize), it = /italic|oblique/.test(s.fontStyle), rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) { if (q.width < 2 || q.height < 2) continue; const k = q.height / ((m.fa + m.fd) || q.height), base = q.top + m.fa * k;
        const tt = s.textTransform === 'uppercase' ? t.toUpperCase() : t, baja = /[gjpqyçQJ,;(){}\[\]]/.test(tt);   // (letras que bajan de la línea base)
        const L = { e, t, capa: capa(e), k: escala(e), left: q.left, right: q.right + (it ? fs * 0.12 * k : 0), top: base - m.cap * k, bot: base + (baja ? m.desc * k * 0.8 : 1) };
        if (girada(L.capa)) continue;
        if (arriba(e, (q.left + q.right) / 2, (L.top + base) / 2)) { lineas.push(L); continue; }
        // (tapado: si lo de encima es una cosa pequeña, como un aviso, una chapa o un botón, y no una ventana que lo cubre todo,
        // es un choque: se monta encima del texto)
        const t2 = document.elementFromPoint((q.left + q.right) / 2, (L.top + base) / 2); if (!t2 || (q.left + q.right) / 2 >= innerWidth || base >= innerHeight) continue;
        let enc = t2, grande = null; for (let x = t2; x && x !== document.body; x = x.parentElement) { const r2 = x.getBoundingClientRect(); if (r2.width * r2.height > innerWidth * innerHeight * 0.45) { grande = x; break; } enc = x; }
        if (grande && !grande.contains(e)) continue;   // (lo tapado por una ventana grande, como la mochila: va encima a propósito)
        // (lo de encima no se ve, como la zona de tocar del joystick: transparente, sin borde, sin imagen ni texto)
        const pinta = (x) => { const s2 = st(x), c = s2.backgroundColor.match(/[\d.]+/g); return /^(IMG|svg|CANVAS|VIDEO)$/.test(x.tagName) || (c && (c.length < 4 || +c[3] > 0.12)) || s2.backgroundImage !== 'none' || parseFloat(s2.borderTopWidth) > 0.5 || [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); };
        let ve = false; for (let x = t2; x; x = x.parentElement) { if (pinta(x)) { ve = true; break; } if (x === enc) break; } if (!ve) continue;
        // (lo que pasa por debajo a propósito: lo que se desplaza bajo una barra fija, como el pie de la ficha con sus botones, y
        // los rótulos que van pegados al mapa en 3D, que pasan por debajo de los recuadros de encima al moverlo)
        const fija = (() => { for (let x = enc; x && !x.contains(e); x = x.parentElement) if (/sticky|fixed/.test(st(x).position)) return true; return false; })();
        const rueda = (() => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) if (/(auto|scroll)/.test(st(x).overflowY) && x.scrollHeight > x.clientHeight + 2) return !x.contains(enc); return false; })();
        const mapa = (() => { for (let x = e; x && x !== document.body; x = x.parentElement) { const s2 = st(x); if (/absolute|fixed/.test(s2.position)) return s2.pointerEvents === 'none' && s2.transform !== 'none'; } return false; })();
        if (fija || rueda || mapa) continue;
        // (una ventana que va en otra capa, como un libro o el menú abiertos sobre el marcador, lo tapa a propósito)
        const raiz = (x) => { while (x.parentElement && x.parentElement !== document.body) x = x.parentElement; return x; };
        const r3 = enc.getBoundingClientRect(); if (enc.contains(e) || e.contains(enc) || r3.width * r3.height > innerWidth * innerHeight * 0.45 || raiz(enc) !== raiz(e)) continue;
        tapados.push({ txt: t.slice(0, 40), de: name(e), con: `tapado por ${name(enc)}`, gap: -1, caja: [L.left, L.top, L.right, L.bot].map(Math.round) }); } }
    for (const e of [r, ...r.querySelectorAll('*')]) {
      if (!vis(e) || e.closest('svg') && e.tagName !== 'svg' || e.parentElement?.closest('svg') && e.tagName === 'svg') continue;
      const q = e.getBoundingClientRect(); if (q.width < 8 || q.height < 8) continue;
      let k = null; const s = st(e);
      if (/^(IMG|svg|CANVAS|VIDEO)$/.test(e.tagName)) k = 'icono';
      else { const bg = s.backgroundColor.match(/[\d.]+/g), a = bg ? (bg.length > 3 ? +bg[3] : 1) : 0, bw = parseFloat(s.borderTopWidth) + parseFloat(s.borderLeftWidth);
        if (q.width <= 200 && q.height <= 120 && (a > 0.12 || s.backgroundImage !== 'none' || bw > 0.5 && !/rgba\(.*, 0\)/.test(s.borderTopColor))) k = 'caja'; }
      if (!k || k === 'icono' && (q.width > 200 || q.height > 200)) continue;
      // (una capa de adorno por detrás, sin nada dentro y que no se toca, como el fondo que se desliza bajo la pestaña elegida)
      if (k === 'caja' && s.pointerEvents === 'none' && !e.children.length && !e.textContent.trim()) continue;
      if (!arriba(e, q.left + q.width / 2, q.top + q.height / 2) && !arriba(e, q.left + 2, q.top + 2)) continue;
      const r = k === 'icono' ? tinta(e, q) : q; cosas.push({ e, k, capa: capa(e), sc: escala(e), left: r.left, right: r.right, top: r.top, bot: r.bottom }); }
  }
  const out = [...tapados], vistos = new Set();
  const dist = (A, B) => [Math.max(B.left - A.right, A.left - B.right, 0), Math.max(B.top - A.bot, A.top - B.bot, 0)];
  for (const L of lineas) {
    // (el número de una chapita redonda, como el nivel sobre el retrato, va en su chapita: la chapita se pone encima a propósito)
    const chapa = (() => { for (let x = L.e, i = 0; x && i < 3; x = x.parentElement, i++) { const q = x.getBoundingClientRect(), c = st(x).backgroundColor.match(/[\d.]+/g); if (q.width <= 40 && q.height <= 40 && (c && (c.length < 4 || +c[3] > 0.85) || /gradient|url/.test(st(x).backgroundImage))) return true; } return false; })();
    for (const C of cosas) { if (C.e.contains(L.e) || C.capa !== L.capa || chapa) continue;   // (su propio fondo o su botón; otra capa)
      // (un texto que va entero dentro de una imagen o de un aro, como el nombre sobre la foto del sello o el tanto por ciento
      // dentro de su anillo: la imagen es su fondo)
      if (C.k === 'icono' && L.left >= C.left - 1 && L.right <= C.right + 1 && L.top >= C.top - 1 && L.bot <= C.bot + 1) continue;
      // (lo que va encogido, como las cartas de los lados del anillo, con el aire encogido igual)
      const g = (L.e.contains(C.e) ? 3 : G) * Math.min(L.k, C.sc), [dx, dy] = dist(L, C); if (dx >= g || dy >= g) continue;
      const k = name(L.e) + L.t.slice(0, 20) + name(C.e); if (vistos.has(k)) continue; vistos.add(k);
      out.push({ txt: L.t.slice(0, 40), de: name(L.e), con: `${C.k} ${name(C.e)}`, gap: dx || dy ? Math.round(Math.max(dx, dy)) : -Math.round(Math.min(L.right, C.right) - Math.max(L.left, C.left)), caja: [L.left, L.top, L.right, L.bot].map(Math.round) }); }
    for (const O of lineas) { if (O === L || O.e === L.e || O.e.contains(L.e) || L.e.contains(O.e) || O.capa !== L.capa) continue;
      const ox = Math.min(L.right, O.right) - Math.max(L.left, O.left), oy = Math.min(L.bot, O.bot) - Math.max(L.top, O.top); if (ox < 2 || oy < 2) continue;
      const k = [name(L.e) + L.t.slice(0, 20), name(O.e) + O.t.slice(0, 20)].sort().join('|'); if (vistos.has(k)) continue; vistos.add(k);
      out.push({ txt: L.t.slice(0, 40), de: name(L.e), con: `texto ${name(O.e)} «${O.t.slice(0, 30)}»`, gap: -Math.round(Math.min(ox, oy)), caja: [L.left, L.top, L.right, L.bot].map(Math.round) }); }
  }
  return out;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const URL = process.env.URL || 'http://127.0.0.1:5173/';
  const out = process.argv[2] || 'entrega/choques'; mkdirSync(out, { recursive: true });
  const only = process.argv[3] ? process.argv[3].split(',') : null, want = (n) => !only || only.includes(n);
  const SIZES = (process.env.SIZES || '844x390,667x375,390x844,1280x720').split(',').map(s => s.split('x').map(Number));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const res = {}; let total = 0; const errs = [];
  for (const [W, H] of SIZES) {
    const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: W < 1000, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
    // (un perfil con algo jugado: misiones hechas, sellos, insignias, un bono; textos de verdad)
    await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es');
      localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', age: 'nino', seen: { heroBenat: true, dog: true, comoJugar: true }, xp: 900, last: 'puente-la-reina', txapelas: 1,
        towns: { lesaka: { done: { 0: true }, visits: 1 }, 'altsasu-alsasua': { done: { 0: true, 1: true }, visits: 2 } }, cards: ['armas:baztan'], badges: ['collector'], settings: { quality: 'low' } })); });
    await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
    const tam = `${W}x${H}`;
    // (mide y, si la pantalla se desplaza, la recorre de arriba abajo)
    const mide = async (n, sel, scroller = '.hub-main') => {
      const L = [];
      for (let k = 0; k < 12; k++) {
        L.push(...(await p.evaluate(choques, sel)));
        const sigue = await p.evaluate(([s, k]) => { const e = document.querySelector(s); if (!e || e.scrollHeight <= e.clientHeight + 4) return false; const y = e.scrollTop; e.scrollTop = y + e.clientHeight * 0.8; return e.scrollTop > y; }, [scroller, k]);
        if (!sigue) break; await p.waitForTimeout(250);
      }
      const uno = [...new Map(L.map(x => [x.de + x.txt + x.con, x])).values()];
      if (uno.length) { res[`${tam} ${n}`] = uno; total += uno.length; await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollTop = 0; }, scroller); await p.screenshot({ path: `${out}/${tam}-${n.replace(/[^\w-]+/g, '_')}.png` }); }
      console.log(`${tam} ${n}: ${uno.length}`); for (const x of uno.slice(0, 8)) console.log(`   «${x.txt}» ${x.de} ↔ ${x.con}: ${x.gap} px`);
    };
    for (const s of ['home', 'sports', 'avatars', 'map', 'nature', 'badges', 'passport', 'profile', 'escudos', 'cuentos', 'instrumentos', 'pasaka', 'album', 'peaks', 'ventajas']) if (want(s)) {
      await p.evaluate((s) => window.__hub.go(s, undefined, true), s); await p.waitForTimeout(900); await mide(s, '#hub'); }
    if (want('comarca')) for (const c of ['sakana', 'valdizarbe-novenera', 'pirineo']) { await p.evaluate((c) => window.__hub.go('comarca', c, true), c); await p.waitForTimeout(900); await mide(`comarca-${c}`, '#hub'); }
    if (want('pueblo')) for (const t of ['altsasu-alsasua', 'puente-la-reina', 'erronkari-roncal']) { await p.evaluate((t) => window.__hub.townSheet(t), t); await p.waitForTimeout(700); await mide(`ficha-${t}`, '.sheet', '.sheet .sh-body, .sheet'); await p.evaluate(() => { window.__hub.sheet?.remove(); window.__hub.sheet = null; document.querySelectorAll('.sheet').forEach(e => e.remove()); }); }
    // la galería de pueblos: cada comarca y cada pueblo, el de delante (cada nombre mide distinto)
    if (want('towns')) {
      await p.evaluate(() => window.__hub.go('towns', undefined, true)); await p.waitForTimeout(1200);
      const cms = await p.evaluate(() => [...document.querySelectorAll('.gal-cm button[data-gc]')].map(b => b.dataset.gc));
      for (const c of cms) {
        await p.evaluate((c) => document.querySelector(`.gal-cm button[data-gc="${c}"]`)?.click(), c); await p.waitForTimeout(900);
        const n = await p.evaluate(() => document.querySelectorAll('.gal-anillo .gal-t').length);
        for (let i = 0; i < n; i++) { const nom = await p.evaluate(() => document.querySelector('.gi-t h2 span')?.textContent || '?');
          await mide(`towns-${c}-${nom}`, '.gal-info, .gal-cm, .gal-centro', '.nada'); await p.evaluate(() => document.querySelector('.gal-fl.sig')?.click()); await p.waitForTimeout(650); }
      }
    }
    await p.close();
  }
  writeFileSync(`${out}/choques.json`, JSON.stringify(res, null, 1));
  console.log(`\nTOTAL ${total}`); console.log(errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 4).join(' | ') : 'sin errores');
  await b.close();
}
