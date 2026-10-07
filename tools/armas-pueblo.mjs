// Escudos en el pueblo: al leer un escudo (el oficial del ayuntamiento y el de una casa) la cámara se planta delante
// del escudo y luego sale su ficha informativa. Fotografía las dos cosas y mide la ficha: botón a la vista, sin
// desplazar la tarjeta y letra de 12 px o más. Uso: node tools/armas-pueblo.mjs [carpeta] [pueblos]
// (servidor en 5173; VW y VH cambian el tamaño de la pantalla)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/armas', towns = 'elizondo,isaba-izaba,lesaka'] = process.argv; mkdirSync(out, { recursive: true });
const W = +(process.env.VW || 844), H = +(process.env.VH || 390);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  for (const kind of ['armas', 'casa']) {
    const ok = await p.evaluate((kind) => { const G = window.__game, P = G.player;
      const t = kind === 'armas' ? G.townArms : G.blasones?.[0]; if (!t) return false;
      P.place(t.read.x, t.read.z, 0); G.follow?.snap?.(P);
      G.__r = kind === 'armas' ? G.readTownArmsAt() : G.readShield(t); return true; }, kind);
    if (!ok) { console.log(town, kind, 'sin escudo'); continue; }
    await p.waitForTimeout(1300); await p.screenshot({ path: `${out}/${town}-${kind}-camara.png` });
    await p.waitForSelector('.escudo .mg-card', { timeout: 20000 }); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${town}-${kind}-ficha-${W}.png` });
    const m = await p.evaluate(() => { const c = document.querySelector('.escudo .mg-card'), btn = c.querySelector('.next'), r = btn.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const tiny = [...c.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length;
      return { preguntas: c.querySelectorAll('.opt').length, botonVisible: r.bottom <= innerHeight && r.top >= 0 && r.bottom <= cr.bottom + 1, scroll: c.scrollHeight > c.clientHeight + 2, tiny, secciones: c.querySelectorAll('.es-secs > div').length }; });
    await p.evaluate(() => document.querySelector('.escudo .next').click()); await p.waitForTimeout(600);
    const after = await p.evaluate(() => ({ cine: !!window.__game.follow.cinematic, frozen: window.__game.player.frozen }));
    console.log(town, kind, JSON.stringify(m), JSON.stringify(after));
  }
  console.log(town, errs.length ? errs.slice(0, 3) : 'sin errores');
  await p.close();
}
await b.close();
