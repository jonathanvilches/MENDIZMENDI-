// Las mujeres de Navarra en el menú: la pantalla Personajes (mujeres primero, luego los demás), la tira del inicio y la
// ficha de una de cada (con ilustración y sin ella), en castellano y en euskera, en el móvil tumbado. Capturas.
// Uso: node tools/mujeres-ver.mjs <carpeta>   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || '/tmp/mujeres-ver'; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const lang of ['es', 'eu']) {
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript((lang) => { localStorage.setItem('herrizherri-lang', lang); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'leire', seen: { heroBenat: true, dog: true, intro: true }, settings: { quality: 'low' } })); }, lang);
  await p.goto(URL + '/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const inicio = await p.evaluate(() => { const h = [...document.querySelectorAll('h2.sec')].map(h => h.textContent.trim()); const s = [...document.querySelectorAll('.figuras.rail')].map(r => r.querySelectorAll('.fcard.pers').length); return { secciones: h, mujeresEnInicio: s }; });
  console.log(lang, 'inicio', JSON.stringify(inicio));
  await p.evaluate(() => { const s = document.querySelector('.fcard.pers'); s?.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${lang}-inicio.png` });
  await p.evaluate(() => window.__hub.go('avatars')); await p.waitForTimeout(1500);
  const pant = await p.evaluate(() => ({ secciones: [...document.querySelectorAll('h2.sec')].map(h => h.textContent.trim()), mujeres: [...document.querySelectorAll('.figuras')[0].querySelectorAll('.fcard.pers')].map(c => c.querySelector('b').textContent + ' (' + c.querySelector('small').textContent + ')'), hombres: document.querySelectorAll('.figuras')[1]?.querySelectorAll('.fcard.pers').length, conIlus: document.querySelectorAll('.fcard.pers.ilus').length, sinIlus: document.querySelectorAll('.fcard.pers:not(.ilus)').length, rotas: [...document.querySelectorAll('.fcard.pers img')].filter(i => !i.complete || !i.naturalWidth).length }));
  console.log(lang, 'personajes', JSON.stringify(pant));
  await p.evaluate(() => document.querySelector('h2.sec')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${lang}-personajes.png` });
  await p.evaluate(() => document.querySelectorAll('.figuras')[0]?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${lang}-mujeres.png` });
  for (const id of ['toda', 'conserveras', 'julia']) {
    await p.evaluate((id) => document.querySelector(`[data-personaje="${id}"]`)?.click(), id); await p.waitForTimeout(900);
    const f = await p.evaluate(() => { const o = document.querySelector('.mg-overlay.escudo'); if (!o) return null; return { kicker: o.querySelector('.ix-kicker')?.textContent, titulo: o.querySelector('.ix-title')?.textContent, sub: o.querySelector('.ix-sub')?.textContent, pestañas: [...o.querySelectorAll('.es-tabs button')].map(b => b.textContent), texto: o.querySelector('.es-pane')?.textContent.slice(0, 90), imagen: !!o.querySelector('.ix-frame img'), badge: o.querySelector('.ix-tag')?.textContent }; });
    console.log(lang, 'ficha', id, JSON.stringify(f));
    await p.screenshot({ path: `${out}/${lang}-ficha-${id}.png` });
    await p.evaluate(() => { document.querySelectorAll('.es-tabs button')[2]?.click(); }); await p.waitForTimeout(400);
    console.log(lang, 'en el juego', await p.evaluate(() => document.querySelector('.es-pane')?.textContent.slice(0, 120)));
    if (id === 'toda') await p.screenshot({ path: `${out}/${lang}-ficha-${id}-juego.png` });
    await p.evaluate(() => document.querySelector('.mg-overlay.escudo .next')?.click()); await p.waitForTimeout(400);
  }
  console.log(lang, 'errores:', errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno');
  await p.close();
}
await b.close();
