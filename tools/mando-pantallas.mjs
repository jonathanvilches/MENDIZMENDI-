// Las pantallas del mando del móvil con las ventanas de verdad del juego: abre cada una en el ordenador (las de
// ventanas-casos.mjs y la de elegir perro), copia sus botones como los manda al móvil (src/mando/contextos.js) y los pinta
// en la página del mando a varios tamaños de móvil. Comprueba que cada botón y cada texto quepan en su caja y en la
// pantalla, sin textos pegados (dos palabras unidas sin espacio, como «IndividualManomanista»), y que los botones del
// fútbol, la pelota y el pueblo queden dentro. Uso: node tools/mando-pantallas.mjs <carpeta de capturas>
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import { casos, cargarModulos } from './ventanas-casos.mjs';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/mando-pantallas'] = process.argv; mkdirSync(out, { recursive: true });
const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const pc = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); pc.on('pageerror', e => errs.push('PC ' + e.message.slice(0, 200)));
await pc.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await pc.goto(`${BASE}?town=lumbier&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await pc.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await cargarModulos(pc);
await pc.evaluate(async () => { window.__C = await import('/src/mando/contextos.js'); window.__PE = await import('/src/game/perro.js'); });
const EXTRA = {
  perro: `(() => { const o = Object.create(M.PE.Perro.prototype); o.g = { mode: 'play', player: { frozen: false }, P: { dogBreed: 'gorbeia' }, sound: {} }; o.choose(); })()`,
};
const CASOS = { ...casos(true), ...EXTRA };
const ctxs = {};
for (const [k, code] of Object.entries(CASOS)) {
  if (['cuaderno', 'mapa', 'pausa', 'mochila', 'tienda'].includes(k)) continue;   // (paneles del juego: sin botones que copiar, van con el panel táctil)
  try {
    await pc.evaluate((code) => {
      const G = window.__game, M = { ...window.__mods, PE: window.__PE }; G.ui.closeModal?.(); window.__fh?.dispose?.();
      document.querySelectorAll('.mg-overlay,.lg-root,.tn-root,.fb-root,.pm-test,#reward,.champ,#dialog').forEach(o => o.remove()); G.ui.dialogOpen = false; document.body.classList.remove('talking');
      window.__r = eval(code); window.__r?.catch?.(() => {});
    }, code);
    await pc.waitForTimeout(700);
    await pc.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }));
    await pc.waitForTimeout(250);
    ctxs[k] = await pc.evaluate(() => { const C = window.__C, c = C.ctxActual(); return { ...C.ctxMovil(c), sin: c.esp.map(x => x.el.textContent.replace(/\s+/g, ' ').trim()) }; });
  } catch (e) { errs.push(k + ': ' + e.message.slice(0, 160)); }
}
// los momentos con mando propio (tras la caché de 200 ms de ctxActual)
await pc.evaluate(() => { const G = window.__game; document.querySelectorAll('.mg-overlay,.lg-root,.tn-root,.fb-root,.pm-test,#reward,.champ,#dialog').forEach(o => o.remove()); G.ui.dialogOpen = false; document.body.classList.remove('talking'); });
await pc.waitForTimeout(300);
const FIJO = {
  'fijo-juego': await pc.evaluate(() => window.__C.ctxMovil()),
  'fijo-pelota': await pc.evaluate(async () => { const d = document.createElement('div'); d.className = 'pel-root'; document.body.appendChild(d); await new Promise(r => setTimeout(r, 260)); const m = window.__C.ctxMovil(); d.remove(); return m; }),
  'fijo-futbol': await pc.evaluate(async () => { const d = document.createElement('div'); d.className = 'fb-root'; document.body.appendChild(d); await new Promise(r => setTimeout(r, 260)); const m = window.__C.ctxMovil(); d.remove(); return m; }),
};
Object.assign(ctxs, FIJO);
// (el pueblo del ordenador, fuera: con él dibujándose, el navegador no llegaba a hacer las capturas del móvil)
await pc.context().close();
for (const [k, c] of Object.entries(ctxs)) if (c?.esp?.length) console.log(k.padEnd(16), JSON.stringify(c.esp.map(x => x.s ? `${x.t} | ${x.s}` : x.t)));

// el móvil: iPhone SE, iPhone 14 y Pro Max en horizontal, y uno en vertical
const TAM = [[667, 375], [844, 390], [932, 430], [390, 844]];
const fallos = [];
for (const [w, h] of TAM) {
  const mv = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1' })).newPage();
  mv.on('pageerror', e => errs.push(`MÓVIL ${w}x${h} ` + e.message.slice(0, 200)));
  await mv.goto(`${BASE}mando/index.html`, { waitUntil: 'load' });
  await mv.waitForTimeout(600);
  if (w === 844) { await mv.screenshot({ path: `${out}/conectar-${w}x${h}.png` }); console.log('instalar:', await mv.evaluate(() => [document.querySelector('#instT').textContent, document.querySelector('#instF').textContent])); }
  for (const [k, c] of Object.entries(ctxs)) {
    if (!c) continue;
    await mv.evaluate((m) => { const { sin, ...x } = m; window.__mandoMovil.prueba({ ...x, b: { ...x.b }, t: 'ctx', n: Math.random() }); }, c);
    await mv.evaluate(() => document.fonts.ready);
    await mv.waitForTimeout(120);
    const r = await mv.evaluate(() => {
      const V = { l: 0, t: 0, r: innerWidth, b: innerHeight }, mal = [];
      const fuera = (a, z, tol = 1) => a.left < z.l - tol || a.top < z.t - tol || a.right > z.r + tol || a.bottom > z.b + tol;
      const E = document.querySelector('#esp'), er = E.getBoundingClientRect(), Z = { l: er.left, t: er.top, r: er.right, b: er.bottom };
      const bs = [...document.querySelectorAll('#esp button')];
      for (const x of bs) {
        const q = x.getBoundingClientRect(), n = x.querySelector('b')?.textContent || x.textContent;
        if (fuera(q, V)) mal.push(`fuera de la pantalla: ${n}`);
        if (fuera(q, Z)) mal.push(`fuera de su zona (hay que desplazar): ${n}`);
        // (el botón y su título, enteros; lo de debajo puede acabar en «…», pero no salirse de ancho)
        for (const k of [x, ...x.children]) if (k.scrollWidth > k.clientWidth + 1 || (k.tagName !== 'SMALL' && k.scrollHeight > k.clientHeight + 1)) mal.push(`texto que no cabe: ${k.tagName} «${k.textContent.slice(0, 40)}» ${k.scrollWidth}x${k.scrollHeight} en ${k.clientWidth}x${k.clientHeight}`);
        for (const k of x.children.length ? x.children : [x]) if (/\p{Ll}\p{Lu}/u.test(k.textContent)) mal.push(`texto pegado: «${k.textContent.slice(0, 50)}»`);
        if (parseFloat(getComputedStyle(x).fontSize) < 11.5) mal.push(`letra pequeña: ${n} ${getComputedStyle(x).fontSize}`);
      }
      for (const x of document.querySelectorAll('#bts .bt, #sup .sis, #bFull:not(.hide)')) { const q = x.getBoundingClientRect(); if (q.width && fuera(q, V)) mal.push(`botón fuera de la pantalla: ${x.getAttribute('aria-label') || x.id}`); }
      const dr = document.querySelector('#der').getBoundingClientRect();
      for (const x of document.querySelectorAll('#bts .bt')) { const q = x.getBoundingClientRect(); if (fuera(q, { l: dr.left, t: dr.top, r: dr.right, b: dr.bottom })) mal.push(`botón fuera de su mitad: ${x.getAttribute('aria-label')}`); }
      const tb = document.querySelector('#top').getBoundingClientRect(); if (tb.right > innerWidth + 1) mal.push('la barra de arriba se sale');
      return { mal, n: bs.length, filas: bs.length ? Math.round(bs[0].getBoundingClientRect().height) : 0 };
    });
    if (r.mal.length) fallos.push(`${w}x${h} ${k}: ${r.mal.join(' · ')}`);
    if (['perro', 'pelota-menu', 'torneo', 'dialogo', 'fijo-futbol', 'fijo-pelota', 'fijo-juego', 'futbol-menu', 'liga-menu'].includes(k)) await mv.screenshot({ path: `${out}/${k}-${w}x${h}.png` });
  }
  await mv.context().close();
}
console.log('fallos', fallos.length); for (const f of fallos) console.log(' ', f);
console.log('errores', errs);
await b.close();
