// Prueba de humo de una compilación: abre un pueblo, viste a un personaje de carnaval y otro de leyenda con el código
// compilado (sin /src) y cuenta sus prendas y los errores. Uso: node tools/trajes/humo.mjs <url base> [pueblo]
import { chromium } from 'playwright-core';
const [,, base = 'http://127.0.0.1:8099/', town = 'ituren'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'error' && !/403|google|Failed to load/.test(m.text())) || /traje/i.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); });
await p.goto(`${base}?town=${town}&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.waitForTimeout(1500);
// el carnaval del pueblo: se arranca su misión y se cuentan las prendas de los que salen
const r = await p.evaluate(async () => {
  const G = window.__game, M = (G.missions || []).find(m => m.type === 'carnival');
  if (!M) return { carnaval: 'sin misión de carnaval' };
  try { G.startCarnival?.(M); } catch (e) { return { error: String(e) }; }
  await new Promise(r => setTimeout(r, 1500));
  const f = (G.folk || []).filter(a => a.fm === M); let prendas = 0; for (const a of f) a.obj.traverse(o => { if (o.userData.traje) prendas++; });
  return { personajes: f.length, prendas };
});
console.log(JSON.stringify(r)); console.log('errores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno');
await b.close();
