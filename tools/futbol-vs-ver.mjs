// La presentación «VS» antes de un partido de fútbol, en el móvil tumbado: las camisetas de los dos clubes, su media y
// sus líneas, la competición y el estadio. Comprueba que sale antes del partido, que todo cabe sin solaparse y que al
// tocar empieza la presentación en el campo. Uso: URL=http://127.0.0.1:5173 node tools/futbol-vs-ver.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, out = 'entrega/futbol-vs'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; window.__vsMs = 600000; });
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
await p.goto(`${URL}/lab/futbol-demo.html?go=match&notuto&quality=low`, { timeout: 300000 });
await p.waitForSelector('.pvs', { timeout: 600000 }); await p.waitForTimeout(1800);
await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
await p.screenshot({ path: `${out}/vs.png` });
const V = await p.evaluate(() => { const v = document.querySelector('.pvs'), R = (s) => v.querySelector(s)?.getBoundingClientRect(), hit = (a, c) => a && c && !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
  const nb = R('.pvs-plate.azul'), nr = R('.pvs-plate.rojo'), x = R('.pvs-x'), top = R('.pvs-top .pvs-bar'), mid = R('.pvs-mid'), qu = R('.pvs-tick');
  const inside = [nb, nr, x, top, mid, qu].every(r => r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1);
  return { names: [...v.querySelectorAll('.pvs-who > b')].map(e => e.innerText), kits: v.querySelectorAll('.pvs-fig .kit svg').length, ovr: [...v.querySelectorAll('.pvs-ovr b')].map(e => +e.innerText), comp: v.querySelector('.pvs-comp')?.innerText,
    inside, overlap: hit(nb, nr) || hit(nb, x) || hit(nr, x) || hit(mid, x) || hit(mid, nb) || hit(mid, nr) || hit(top, x), live: !!window.__futbol?.live };
});
console.log('   ', JSON.stringify(V));
ok(V.names.length === 2 && V.kits === 2, 'los dos clubes con su camiseta');
ok(V.ovr.length === 2 && V.ovr.every(n => n >= 40 && n <= 99), `la media de cada club (${V.ovr.join(' y ')})`);
ok(!!V.comp, `la competición arriba (${V.comp})`);
ok(V.inside && !V.overlap, 'todo dentro de la pantalla y sin solaparse');
ok(!V.live, 'mientras se ve, el partido no ha empezado');
await p.evaluate(() => document.querySelector('.pvs').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await p.waitForFunction(() => window.__futbol?.live, null, { timeout: 60000 }).catch(() => {});
ok(await p.evaluate(() => !!window.__futbol?.live && !document.querySelector('.pvs')), 'al tocar, empieza la presentación en el campo');
console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close(); process.exit(fails ? 1 : 0);
