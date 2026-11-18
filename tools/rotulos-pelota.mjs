// Los rótulos del partido de pelota, uno a uno, en un partido libre de verdad: el marcador, el «¡Tanto!», el nombre del
// golpe, el aviso del golpe y la repetición. Una tira de fotogramas de cada uno (entrada, quieto y salida) en el ordenador
// (1280×720) y en el móvil tumbado (844×390). Capturas en OUT/rot-<tamaño>-<rótulo>-<n>.png
// Uso: node tools/rotulos-pelota.mjs   (servidor en 5173)   SOLO=tanto,golpe para hacer solo algunos
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT || '/tmp/claude-0', SOLO = (process.env.SOLO || '').split(',').filter(Boolean);
const quiere = (n) => !SOLO.length || SOLO.includes(n);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const init = () => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); };
for (const [w, h, tag] of [[1280, 720, 'pc'], [844, 390, 'movil']]) {
  if (process.env.TAM && process.env.TAM !== tag) continue;
  const ctx = await b.newContext(tag === 'movil' ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: w, height: h } });
  const p = await ctx.newPage(); await p.addInitScript(init); p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
  await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
  await p.waitForFunction(() => document.querySelector('[data-pel-go]'), null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('[data-pel-go]').click());
  await p.waitForSelector('.pel-toss-go', { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector('.pel-toss-go')?.click()); await p.waitForTimeout(7000);
  const hud = (f, ...a) => p.evaluate(([f, a]) => { const m = window.__game?.pelotaMatch || window.__pelota; return m.hud[f](...a); }, [f, a]);
  const tira = async (n, ms) => { let i = 0; for (const t of ms) { await p.waitForTimeout(t); await p.screenshot({ path: `${OUT}/rot-${tag}-${n}-${i++}.png` }); } };
  await p.screenshot({ path: `${OUT}/rot-${tag}-partido.png` });
  if (quiere('tanto')) {
    // (el tanto de verdad: el mismo aviso que manda el partido, para ti y para el rival)
    const tanto = (w, you, rival) => p.evaluate(([w, you, rival]) => { const m = window.__game.pelotaMatch; m.game.mode = 'match'; m.onEvent ? m.onEvent({ type: 'call', call: 'tanto', winner: w, score: { you, rival } }) : m.evento({ type: 'call', call: 'tanto', winner: w, score: { you, rival } }); }, [w, you, rival]);
    // (cada fotograma, en su instante exacto de la animación: se paran las animaciones y se llevan a ese milisegundo)
    const en = async (n, ms) => { let i = 0; for (const t of ms) { await p.evaluate((t) => document.querySelectorAll('.pel-tanto *, .pa-in').forEach(el => el.getAnimations().forEach(a => { a.pause(); a.currentTime = t; })), t); await p.waitForTimeout(120); await p.screenshot({ path: `${OUT}/rot-${tag}-${n}-${i++}.png` }); } };
    await tanto('you', 3, 2); await en('tanto', [90, 180, 330, 900, 1560, 1700]); await p.evaluate(() => document.querySelectorAll('.pel-tanto *, .pa-in').forEach(el => el.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }))); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/rot-${tag}-tanto-6.png` }); await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/rot-${tag}-tanto-7.png` });
    await tanto('rival', 3, 3); await en('tanto-rival', [180, 900]); await p.evaluate(() => document.querySelectorAll('.pel-tanto *, .pa-in').forEach(el => el.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }))); await p.waitForTimeout(3500);
  }
  if (quiere('golpe')) { await hud('golpe', 'Dos paredes', 'azul'); await tira('golpe', [60, 150, 500]); await p.waitForTimeout(2500); }
  if (quiere('aviso')) { await hud('quality', '¡Perfecto!', '', 'perfect'); await tira('aviso', [60, 200, 500]); await p.waitForTimeout(1500); }
  await ctx.close();
}
console.log(errs.length ? errs.join('\n') : 'sin errores'); await b.close();
