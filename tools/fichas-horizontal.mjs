// Fichas en el móvil en horizontal: abre fichas de flora y de fauna y una tarjeta de información, las fotografía a
// 844x390 y 667x375 y mide si todo cabe: el botón a la vista sin desplazar, la imagen entera y la letra de 12 px o más.
// Uso: node tools/fichas-horizontal.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/fichas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [W, H] of [[844, 390], [667, 375]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  for (const key of (process.env.KEYS || 'flora:haya,flora:eguzkilore,fauna:quebrantahuesos,fauna:corzo,fauna:buitre,fauna:ciguena,flora:quejigo').split(',')) {
    await p.evaluate(async (key) => { const { showFicha } = await import('/src/ui/ficha.js'); window.__f = showFicha(key, { ui: { sound: null }, badge: 'Nueva carta', button: 'Seguir explorando' }); }, key);
    await p.waitForTimeout(2500);
    const m = await p.evaluate(() => { const c = document.querySelector('.ficha .mg-card'); if (!c) return null; const btn = c.querySelector('.btn'), r = btn.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const tiny = [...c.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length;
      const sec = c.querySelector(".fc-sec"); return { botonVisible: r.bottom <= innerHeight && r.top >= 0 && r.bottom <= cr.bottom + 1, scroll: c.scrollHeight > c.clientHeight + 2, textoCorta: !!sec && sec.scrollHeight > sec.clientHeight + 2, tiny, alto: Math.round(cr.height) }; });
    await p.screenshot({ path: `${out}/${key.replace(':', '-')}-${W}.png` });
    console.log(W, key, JSON.stringify(m));
    await p.evaluate(() => document.querySelector('.ficha .btn')?.click()); await p.waitForTimeout(400);
  }
  console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await p.close();
}
await b.close();
