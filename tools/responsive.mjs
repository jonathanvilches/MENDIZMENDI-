// Auditoría responsive de una pantalla del menú en muchos tamaños (móvil de pie y tumbado, tableta, portátil, escritorio
// y tele): lo que se sale de la pantalla, textos cortados, letra diminuta, botones demasiado pequeños para el dedo y lo
// de encima del mapa 3D que se pisa. Con OUT=carpeta guarda la primera pantalla de cada tamaño y una hoja con todas.
// Uso: node tools/responsive.mjs [pantalla] [tamaños separados por comas]   (URL=http://127.0.0.1:5173/)
// (home+olite: el inicio con la ficha de un pueblo abierta, como al tocar su chincheta; solo en el servidor de desarrollo.
// La captura espera hasta 2 min: en el navegador de pruebas, sin gráfica, el sombreado de la maqueta tarda en compilarse)
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import { createRequire } from 'module';
const sharp = createRequire('/home/user/mendimendiz/package.json')('sharp');
const URL = process.env.URL || 'http://127.0.0.1:5173/', OUT = process.env.OUT;
const [,, scr = 'home', lista = '360x740,390x844,430x932,667x375,844x390,932x430,768x1024,1024x768,1280x720,1366x768,1536x864,1920x1080,2560x1440'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fotos = []; let total = 0;
for (const sz of lista.split(',')) {
  const [w, h] = sz.split('x').map(Number), tactil = Math.min(w, h) < 900 && !(w >= 1024 && h >= 700);
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: tactil, hasTouch: tactil, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'nerea', last: 'lesaka', xp: 120, seen: { heroBenat: true, dog: true, comoJugar: true }, towns: { lesaka: { visits: 2, done: { 0: true, 1: true } } } })); });
  await p.goto(URL + '?screen=home', { timeout: 300000 });
  await p.waitForSelector('#hMain', { timeout: 120000 }); await p.waitForTimeout(1500);
  const [pant, pueblo] = scr.split('+'), [s, arg] = pant.split(':'); if (s !== 'home' || arg) await p.evaluate(([s, a]) => window.__hub?.go(s, a, true), [s, arg]);
  await p.waitForTimeout(s === 'home' ? 6000 : 2000);
  if (pueblo) { await p.evaluate((id) => window.__mapa3d?.ir(id), pueblo); await p.waitForTimeout(6000); }
  if (OUT) { const f = `${OUT}/${scr.replace(/[:+]/g, '-')}-${sz}.png`; await p.screenshot({ path: f, timeout: 120000 }); fotos.push({ f, w, h, sz }); }
  const r = await p.evaluate((tactil) => {
    const main = document.querySelector('#hMain'), out = { sale: [], cortado: [], diminuta: [], diana: [], pisa: [] };
    const vis = (e) => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const st = getComputedStyle(e); return st.visibility !== 'hidden' && +st.opacity > 0.05; };
    const enCarril = (e) => { for (let x = e.parentElement; x && x !== main; x = x.parentElement) { const st = getComputedStyle(x); if (/(auto|scroll|hidden|clip)/.test(st.overflowX) && x.scrollWidth > x.clientWidth + 2) return true; } return false; };
    if (document.documentElement.scrollWidth > innerWidth + 1) out.sale.push('la página entera: ' + document.documentElement.scrollWidth + ' > ' + innerWidth);
    if (main.scrollWidth > main.clientWidth + 1) out.sale.push('#hMain: ' + main.scrollWidth + ' > ' + main.clientWidth);
    const nombre = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase()) + ' «' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '»';
    for (const e of document.querySelectorAll('#hub *')) {
      if (e.closest('svg') && e.tagName !== 'svg') continue;
      if (e.closest('.sr, .sr-only, [aria-hidden=true]') && getComputedStyle(e.closest('.sr, .sr-only, [aria-hidden=true]')).clipPath !== 'none') continue;   // (lo que solo lee el lector de pantalla)
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      // (se sale por la derecha o la izquierda de la pantalla, sin estar en una fila que se desliza)
      if ((r.right > innerWidth + 1 || r.left < -1) && !enCarril(e) && !e.closest('.m3-capa') && st.position !== 'fixed') out.sale.push(nombre(e) + ` ${Math.round(r.left)}..${Math.round(r.right)}`);
      const texto = [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
      if (texto) {
        if (/(hidden|clip)/.test(st.overflowX + st.overflow) && e.scrollWidth > e.clientWidth + 1) out.cortado.push(nombre(e));
        const fs = parseFloat(st.fontSize); if (fs < 11 && !e.closest('.m3-capa')) out.diminuta.push(nombre(e) + ' ' + fs + 'px');
      }
      if (tactil && e.matches('button, a[href], [role=button], select, input:not([type=hidden])') && !e.closest('.sheet') && (r.width < 36 || r.height < 36)) out.diana.push(nombre(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    // (lo de encima del mapa 3D, que no se pise)
    const A = [...document.querySelectorAll('.m3-tot, .m3-pad, .m3-rail, .m3-cb:not([hidden]), .m3-ft:not([hidden]), .m3d .ini-head, .m3-ayuda')].filter(vis).map(x => [x.className.split(' ')[0], x.getBoundingClientRect()]);
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const [na, a] = A[i], [nb, c] = A[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) out.pisa.push(na + ' y ' + nb); }
    for (const k in out) out[k] = [...new Set(out[k])];
    return out;
  }, tactil);
  const n = Object.values(r).reduce((a, x) => a + x.length, 0); total += n;
  console.log(`${sz.padEnd(9)} ${n ? n + ' avisos' : 'bien'}${errs.length ? ' · ERRORES ' + errs.join(' | ') : ''}`);
  for (const [k, v] of Object.entries(r)) if (v.length) console.log(`   ${k}: ${v.slice(0, 6).join(' · ')}${v.length > 6 ? ` (+${v.length - 6})` : ''}`);
  await p.close();
}
if (OUT && fotos.length) {
  // la hoja: cada tamaño a la misma altura (300 px), en filas de cuatro
  const H = 300, items = await Promise.all(fotos.map(async x => ({ ...x, buf: await sharp(x.f).resize({ height: H }).toBuffer(), ww: Math.round(x.w * H / x.h) })));
  let X = 0, Y = 0, rowW = 0; const comp = [], maxW = 2400; let ancho = 0;
  for (const it of items) { if (X + it.ww > maxW) { X = 0; Y += H + 30; } comp.push({ input: it.buf, left: X, top: Y + 24 }, { input: Buffer.from(`<svg width="${it.ww}" height="24" xmlns="http://www.w3.org/2000/svg"><text x="4" y="18" font-size="18" font-family="sans-serif">${it.sz}</text></svg>`), left: X, top: Y }); X += it.ww + 12; ancho = Math.max(ancho, X); }
  await sharp({ create: { width: ancho, height: Y + H + 30, channels: 3, background: '#ffffff' } }).composite(comp).png().toFile(`${OUT}/hoja-${scr.replace(/[:+]/g, '-')}.png`);
}
console.log(total ? `total ${total} avisos` : 'Todo correcto');
await b.close();
