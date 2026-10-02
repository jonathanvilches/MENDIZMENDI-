// ¿El nombre de cada personaje va con su cuerpo? Recorre los datos (misiones, personajes, castillos, oficios…) y
// los vecinos que aparecen de verdad en cada pueblo, y avisa cuando un cuerpo de chico lleva nombre de chica o al revés.
// Uso: node tools/nombres.mjs [pueblos|datos]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const [,, only] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p0 = await b.newPage(); await p0.goto(URL + '/', { timeout: 300000 });
// 1) datos: cualquier objeto con nombre y aspecto
const datos = await p0.evaluate(async () => {
  const { nameGender } = await import('/src/data/nombres.js');
  const { MYTHS } = await import('/src/actors/outfits.js');
  const mods = ['levels', 'personajes', 'castillos', 'oficios', 'tiendas', 'campo', 'ferias', 'legends', 'miradores', 'dolmen', 'procesos', 'tocar', 'cast'];
  const skip = new Set(['cast.CAST_ALL']);   // reserva de aspectos de los diseños antiguos (no son vecinos)
  const out = [], seen = new Set();
  const body = (L) => { const M = L.myth && MYTHS[L.myth]; return (M ? M.female : !!(L.female || L.skirt || L.ponytail || L.bun || L.braids || L.longHair || L.lashes)) ? 'f' : 'm'; };
  const walk = (o, path, depth) => {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 9) return; seen.add(o);
    if (typeof o.name === 'string' && o.look && typeof o.look === 'object') {
      const g = nameGender(o.name), s = body(o.look);
      if (g && g !== s) out.push({ path, name: o.name, cuerpo: s === 'f' ? 'chica' : 'chico', nombre: g === 'f' ? 'chica' : 'chico' });
    }
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, path + '.' + k, depth + 1);
  };
  for (const m of mods) { try { const M = await import(`/src/data/${m}.js`); for (const [k, v] of Object.entries(M)) if (!skip.has(m + '.' + k)) walk(v, m + '.' + k, 0); } catch (e) { out.push({ path: m, error: e.message }); } }
  return out;
});
console.log('— datos —');
for (const d of datos) console.log('✗', d.path, '·', d.name, d.error || `(cuerpo de ${d.cuerpo}, nombre de ${d.nombre})`);
if (!datos.length) console.log('✓ sin cruces en los datos');
if (only === 'datos') { await b.close(); process.exit(0); }
// 2) en el juego: los personajes que aparecen en cada pueblo
const ids = only ? only.split(',') : await p0.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.filter(l => !l.special).map(l => l.id));
await p0.close();
console.log('— pueblos —');
let malos = 0;
for (const id of ids) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  try {
    await p.goto(`${URL}/?town=${id}&q=low&weather=clear`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }); await p.waitForTimeout(1000);
    const r = await p.evaluate(async () => {
      const { nameGender } = await import('/src/data/nombres.js');
      const G = window.__game, out = [], seen = new Set(); let n = 0;
      const walk = (o, d) => {
        if (!o || typeof o !== 'object' || seen.has(o) || d > 3 || o.isObject3D) return; seen.add(o);
        if (o.def && o.obj && typeof o.name === 'string') {
          n++; const s = o.obj.userData.sex, g = nameGender(o.name);
          if (s && g && (g === 'f') !== (s === 'girl')) out.push(`${o.name} (cuerpo de ${s === 'girl' ? 'chica' : 'chico'})`);
          return;
        }
        for (const v of Array.isArray(o) ? o : Object.values(o)) if (v && typeof v === 'object') walk(v, d + 1);
      };
      walk(G, 0);
      return { n, out };
    });
    if (r.out.length) malos++;
    console.log((r.out.length ? '✗ ' : '✓ ') + id, r.n + ' personajes', r.out.join(' · '), errs.length ? 'errores: ' + errs.join(' | ') : '');
  } catch (e) { console.log('✗ ' + id, 'no carga', e.message.slice(0, 100)); malos++; }
  await p.close();
}
console.log(malos ? `${malos} pueblos con nombres cruzados` : 'todos los nombres van con su cuerpo');
await b.close();
