// Comprueba que todos los sellos y todos los iconos son SVG válido (como imagen, el SVG se lee como XML estricto:
// un atributo repetido basta para que Safari muestre la imagen rota). Uso: node tools/svgcheck.mjs
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('http://127.0.0.1:5173/lab/chars.html');
const bad = await p.evaluate(async () => {
  const art = await import('/src/ui/art.js'), ic = await import('/src/ui/icons.js');
  const C = (await import('/src/data/comarcas.json')).default;
  const out = [], parse = (name, svg) => { const d = new DOMParser().parseFromString(svg, 'image/svg+xml'); const e = d.querySelector('parsererror'); if (e) out.push(`${name}: ${e.textContent.slice(0, 120)}`); };
  const dec = (u) => decodeURIComponent(u.slice(u.indexOf(',') + 1));
  for (const c of C) parse('sello ' + c.id, dec(art.stampURL(c.id)));
  for (const k of Object.keys(ic.ICONS)) parse('icono ' + k, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ic.ICONS[k]}</svg>`);
  return { n: C.length + Object.keys(ic.ICONS).length, out };
});
console.log(`${bad.n} SVG revisados, ${bad.out.length} con errores`); for (const b of bad.out) console.log('  - ' + b);
await browser.close();
process.exit(bad.out.length ? 1 : 0);
