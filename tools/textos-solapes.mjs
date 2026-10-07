// ¿Se pisa algún texto? En el pueblo (objetivo, aviso, narrador, acción y botones a la vez), en un partido de pelota y
// en el menú, a varios tamaños de pantalla: mide las cajas de todo lo que tiene texto o es un botón y lista las parejas
// que se solapan (sin contar un elemento con lo que lleva dentro). Fotografía cada caso.
// Uso: node tools/textos-solapes.mjs [carpeta] [casos: pueblo,pelota,menu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { iphone } from './iphone.mjs';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/textos', casos = 'pueblo,pelota,menu'] = process.argv; mkdirSync(out, { recursive: true });
const SIZES = (process.env.SIZES || '844x390,667x375,390x844,1280x720').split(',').map(s => s.split('x').map(Number));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const measure = (root) => {
  const vis = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } return true; };
  const leaf = [...document.querySelectorAll(root)].flatMap(r => [...r.querySelectorAll('*')]).filter(e => {
    if (!vis(e)) return false;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
    return e.matches('button, kbd, canvas, svg, img') || [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  }).filter(e => (!e.closest('svg') || e.tagName === 'svg') && !e.closest('.hero-av, .h-art'));
  // (lo que está a medio desplazar bajo una barra fija no se cuenta: solo lo que se ve entero)
  const inView = (e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; };
  const ALLOW = '#mini, #compass, .pel-score';   // piezas compuestas a propósito (el reloj sobre el minimapa…)
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '')) + (e.textContent.trim() ? ` «${e.textContent.trim().slice(0, 24)}»` : '');
  const res = [];
  for (let i = 0; i < leaf.length; i++) for (let j = i + 1; j < leaf.length; j++) {
    const A = leaf[i], B = leaf[j]; if (A.contains(B) || B.contains(A) || !inView(A) || !inView(B)) continue;
    const ca = A.closest(ALLOW); if (ca && ca === B.closest(ALLOW)) continue;
    const a = A.getBoundingClientRect(), c = B.getBoundingClientRect();
    const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    if (w > 3 && h > 3) res.push(`${name(A)} ↔ ${name(B)} (${Math.round(w)}x${Math.round(h)})`);
  }
  const off = root === 'body' ? [] : leaf.filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1; }).map(name);
  const tiny = leaf.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map(name);
  return { solapes: [...new Set(res)], fuera: off, pequeño: tiny };
};
let total = 0;
for (const [W, H] of SIZES) for (const caso of casos.split(',')) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: W < 1000 });
  const p = await ctx.newPage(); await iphone(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  let root = '#hud';
  if (caso === 'menu') { await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500); root = 'body'; }
  else {
    await p.goto(`http://127.0.0.1:5173/?town=lumbier&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 }); await p.waitForTimeout(1500);
    if (caso === 'pueblo') await p.evaluate(() => { const G = window.__game, U = G.ui; U.setPrompt('Leer el escudo de la casa'); U.toast('Escudo guardado en tu armorial de Navarra (Saberes · Escudos)', 'shield', 60000); U.whisper('Si te pierdes o alguien se hace daño, llama al 112: es el teléfono de emergencias en toda Europa.', 60000); G.setPrompt = () => {}; U.setPrompt = () => {}; });
    else { root = '.pel-root'; await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); }); await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
      await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click()); await p.waitForTimeout(3000);
      // todos los rótulos del partido a la vez: el del tanto, la calidad del golpe, el consejo y la fuerza
      await p.evaluate(() => { const M = window.__game.pelotaMatch, H = M.hud; H.call('¡Tanto y partido!', 'Tanto para ti. Todo el frontón en pie aplaude.', 'Bost eta lau', 30); H.quality('Buen golpe · cortada · fuerza 80 %'); H.qT = 30; H.tip('Mantén pulsado GOLPE para cargar la fuerza'); H.charge(0.8, 'hit'); M.charge = () => {}; H.charge = () => {}; }); }
    await p.waitForTimeout(700);
  }
  const m = await p.evaluate(measure, root);
  await p.screenshot({ path: `${out}/${caso}-${W}x${H}.png` });
  const n = m.solapes.length + m.fuera.length + m.pequeño.length; total += n;
  console.log(`${caso} ${W}x${H}: ${n ? '' : 'limpio'}`); for (const k of ['solapes', 'fuera', 'pequeño']) for (const x of m[k]) console.log(`   ${k}: ${x}`);
  if (errs.length) console.log('   errores', errs.slice(0, 2));
  await ctx.close();
}
console.log('total', total); await b.close();
