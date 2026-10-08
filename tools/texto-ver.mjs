// Auditoría de texto del menú (todas sus pantallas) en el móvil tumbado: cuánto texto se ve de golpe, los bloques más
// largos y qué tamaños de letra usa cada tipo de texto (párrafos, notas, títulos, botones). Capturas de cada pantalla.
// Uso: node tools/texto-ver.mjs [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const [,, out = 'entrega/texto', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto('http://127.0.0.1:5173/?q=low&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__hub?.visible, null, { timeout: 300000 });
// lo que se ve en pantalla: cada bloque con texto propio, su tamaño de letra, su papel y cuántas letras tiene
const measure = () => p.evaluate(() => {
  const role = (e) => { const t = e.tagName; if (/^H[1-6]$/.test(t)) return 'título'; if (t === 'BUTTON' || e.closest('button')) return 'botón'; if (t === 'P' || t === 'LI') return 'párrafo'; if (t === 'SMALL' || /kicker|note|hint|meta|sub/.test(e.className)) return 'nota'; return 'otro'; };
  const out = [], seen = new Set();
  for (const e of document.querySelectorAll('#hub *, .lg-root *, .sheet *, .mg-overlay *')) {
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (own.length < 2) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || +cs.opacity < 0.05 || r.bottom < 0 || r.top > innerHeight * 3) continue;
    let hidden = false; for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none') { hidden = true; break; } if (a.tagName === 'DETAILS' && !a.open && e.closest('summary') !== a.querySelector('summary')) { hidden = true; break; } }
    if (hidden || seen.has(e)) continue; seen.add(e);
    out.push({ role: role(e), fs: parseFloat(cs.fontSize), chars: (e.innerText || own).replace(/\s+/g, ' ').trim().length, txt: own.slice(0, 70), cls: `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0] || ''}`, visible: r.top < innerHeight && r.bottom > 0 });
  }
  return out;
});
const screens = ['home', 'map', 'towns', 'sports', 'avatars', 'peaks', 'nature', 'escudos', 'cuentos', 'badges', 'passport', 'profile'];
const report = {};
for (const s of screens) {
  await p.evaluate((s) => window.__hub.go(s), s); await p.waitForTimeout(2500);
  const m = await measure(); report[s] = m;
  await p.screenshot({ path: `${out}/${lang}-${s}.png` });
}
// la ficha de una comarca y la de un pueblo
await p.evaluate(() => window.__hub.go('comarca', 'bidasoa')); await p.waitForTimeout(2500); report.comarca = await measure(); await p.screenshot({ path: `${out}/${lang}-comarca.png` });
await p.evaluate(() => window.__hub.townSheet('elizondo')); await p.waitForTimeout(2500); report.pueblo = await measure(); await p.screenshot({ path: `${out}/${lang}-pueblo.png` });
writeFileSync(`${out}/texto-${lang}.json`, JSON.stringify(report, null, 1));
// resumen: letras a la vista, bloques largos y tamaños por papel
const sizes = {};
for (const [s, m] of Object.entries(report)) {
  const vis = m.filter(x => x.visible), chars = vis.reduce((a, x) => a + (x.role === 'párrafo' || x.role === 'nota' || x.role === 'otro' ? x.chars : 0), 0);
  const long = m.filter(x => x.chars > 140 && x.role !== 'botón').sort((a, b) => b.chars - a.chars).slice(0, 4);
  console.log(`\n${s}: ${vis.length} bloques a la vista, ${chars} letras de texto`);
  for (const x of long) console.log(`   largo ${x.chars} · ${x.fs}px · ${x.cls} · «${x.txt}»`);
  for (const x of m) (sizes[x.role] ||= {})[x.fs] = ((sizes[x.role] ||= {})[x.fs] || 0) + 1;
}
console.log('\ntamaños por papel:'); for (const [r, o] of Object.entries(sizes)) console.log(`   ${r}: ${Object.entries(o).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}px×${v}`).join(' ')}`);
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
