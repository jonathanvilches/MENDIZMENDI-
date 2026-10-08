// «Ver más» en el menú: en cada pantalla, los bloques de texto largos, cuántas líneas tienen y si están plegados con su
// botón; se abre el primero para comprobar que se despliega y vuelve a plegarse. Capturas.
// Uso: node tools/vermas-ver.mjs [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/vermas', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto('http://127.0.0.1:5173/?q=low&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__hub?.visible, null, { timeout: 300000 });
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const look = () => p.evaluate(() => [...document.querySelectorAll('#hub p, #hub li, #hub dd')].filter(e => (e.innerText || '').length > 120).map(e => {
  const cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
  const full = e.classList.contains('vm-clamp') ? (() => { e.classList.add('vm-open'); const h = e.scrollHeight; e.classList.remove('vm-open'); return h; })() : e.scrollHeight;
  return { txt: e.innerText.slice(0, 40), lineas: Math.round(full / lh), vistas: Math.round(e.clientHeight / lh), plegado: e.classList.contains('vm-clamp'), boton: !!(e.nextElementSibling?.classList.contains('vm-btn') || e.querySelector('.vm-btn')), vm: e.dataset.vm || '-', disp: cs.display, fs: cs.fontSize, w: Math.round(e.getBoundingClientRect().width) };
}));
for (const s of ['home', 'nature', 'escudos', 'cuentos', 'profile', 'peaks']) {
  await p.evaluate((s) => window.__hub.go(s), s); await p.waitForTimeout(2500);
  const L = await look();
  console.log(`\n${s}: ${L.length} bloques de más de 120 letras`);
  const mal = L.filter(x => x.lineas > 2 && !(x.plegado && x.boton));
  console.log(`   plegados con «Ver más»: ${L.filter(x => x.plegado && x.boton).length} · enteros de 1 o 2 líneas: ${L.filter(x => !x.plegado && x.lineas <= 2).length}`);
  for (const x of mal) console.log(`   SIN PLEGAR ${x.lineas} líneas · ${x.fs} · ${x.w}px · ${x.disp} · vm=${x.vm} · «${x.txt}»`);
  ok(!mal.length, `${s}: ningún texto de más de 2 líneas a la vista sin «Ver más»`);
  await p.screenshot({ path: `${out}/${lang}-${s}.png` });
}
// abrir y cerrar el primero
await p.evaluate(() => window.__hub.go('escudos')); await p.waitForTimeout(2000);
const t = await p.evaluate(() => { const bt = document.querySelector('#hub .vm-btn'); if (!bt) return null; const e = bt.previousElementSibling; const h0 = e.clientHeight; bt.click(); const h1 = e.clientHeight, t1 = bt.textContent; bt.click(); return { h0, h1, t1, t2: bt.textContent, h2: e.clientHeight }; });
console.log('   abrir y cerrar:', JSON.stringify(t));
ok(t && t.h1 > t.h0 && t.h2 === t.h0 && /menos|Gutxiago/i.test(t.t1) && /más|Gehiago/i.test(t.t2), '«Ver más» abre el texto entero y «Ver menos» lo vuelve a plegar');
await p.evaluate(() => { document.querySelector('#hub .vm-btn')?.click(); }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${lang}-abierto.png` });
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
