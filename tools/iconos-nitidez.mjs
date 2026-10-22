// Nitidez de los iconos 3D en las pantallas del menú, en un móvil de densidad 3 y en un escritorio: en cada pantalla,
// cada <img> de src/assets/icons3d se mide (píxeles de pantalla que ocupa frente a los que tiene la imagen) y se avisa
// de los que se ven más grandes de lo que miden tras el cambio a la copia grande (src/web/hd.js), de los rotos y de
// cuántos hay de cada tamaño. Uso: node tools/iconos-nitidez.mjs [pantallas separadas por comas]   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const SCREENS = (process.argv[2] || 'home,sports,avatars,map,towns,nature,badges,passport,profile,escudos,cuentos,instrumentos,pasaka,album,peaks,comarca').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let total = 0, flojos = 0, rotos = 0;
for (const [vw, vh, dpr, mobile] of [[844, 390, 3, true], [1440, 900, 1, false]]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, intro: true }, cards: ['instrumento:txistu', 'armas:pamplona', 'escudo:ituren:0'], species: ['zorro', 'buitre'], badges: ['first-town'], settings: { quality: 'low' } })); });
  await p.goto(URL + '/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const tiers = {};
  for (const s of SCREENS) {
    await p.evaluate((s) => s === 'comarca' ? window.__hub.go('comarca', 'sakana', true) : window.__hub.go(s), s);
    await p.waitForTimeout(1800);   // (hd.js repasa las imágenes 250 ms después de cada cambio; las grandes tardan en llegar)
    const r = await p.evaluate(() => {
      const out = { n: 0, flojos: [], rotos: [], tiers: {} };
      for (const im of document.querySelectorAll('img')) {
        const src = im.currentSrc || im.src; if (!/icons3d|\/assets\/[^/]*\.webp/.test(src) || !/icons3d/.test(src) && !im.classList.contains('ico3d')) continue;
        const rc = im.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
        out.n++; const w = im.naturalWidth, need = Math.round(Math.max(rc.width, rc.height) * devicePixelRatio);
        const t = (src.match(/icons3d\/(\d+)\//) || [, w])[1]; out.tiers[t] = (out.tiers[t] || 0) + 1;
        if (!w) out.rotos.push(src.split('/').pop().slice(0, 40));
        else if (need > w * 1.2) out.flojos.push(`${src.split('/').pop().replace(/-[A-Za-z0-9_-]{8}\.webp$/, '')} ${w}→${need}`);
      }
      return out;
    });
    total += r.n; flojos += r.flojos.length; rotos += r.rotos.length; for (const [t, n] of Object.entries(r.tiers)) tiers[t] = (tiers[t] || 0) + n;
    console.log(`${mobile ? 'móvil' : 'escritorio'} ${s}: ${r.n} iconos`, r.flojos.length ? 'FLOJOS ' + r.flojos.slice(0, 8).join(', ') : '', r.rotos.length ? 'ROTOS ' + r.rotos.join(', ') : '');
  }
  console.log(mobile ? 'móvil' : 'escritorio', 'por tamaño:', JSON.stringify(tiers), errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 3).join(' | ') : 'sin errores');
  await p.close();
}
console.log(`TOTAL ${total} iconos medidos, ${flojos} flojos, ${rotos} rotos`);
await b.close();
