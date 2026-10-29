// Cuántos escudos de casa tiene de verdad cada pueblo en sus fachadas (los pone el constructor del pueblo al levantar las
// casas: src/world/townBuilder.js, hasta 8), con el nombre de cada casa. Entra en los 32 pueblos y escribe un JSON
// { pueblo: [casa, casa…] } que usa tools/encargo-total.mjs (CASAS=…) para no encargar escudos de casas que no existen.
// Uso: node tools/escudos-cuenta.mjs <salida.json> [pueblo,pueblo…]   (URL=http://127.0.0.1:5173/)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const [,, out = 'escudos-cuenta.json', lista = ''] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__ready, null, { timeout: 300000 }).catch(() => {});
const ids = lista ? lista.split(',') : await p.evaluate(async () => (await import('/src/data/levels.js').catch(() => null))?.LEVELS?.map(l => l.id) || null);
const towns = ids || ['lesaka', 'etxalar', 'zugarramurdi', 'amaiur-maya-del-baztan', 'ituren', 'elizondo', 'leitza', 'lekunberri', 'orreaga-roncesvalles', 'aribe', 'otsagabia-ochagavia', 'isaba-izaba', 'erronkari-roncal', 'burgui-burgi', 'altsasu-alsasua', 'irurtzun', 'pamplona', 'aoiz', 'lumbier', 'irulegi', 'sanguesa', 'estella', 'viana', 'puente-la-reina', 'artajona', 'tafalla', 'javier', 'ujue', 'olite', 'marcilla', 'tudela', 'cortes'];
const res = {};
for (const t of towns) {
  try {
    await p.goto(`${URL}?town=${t}&q=low&noflora&weather=clear&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 300000 });
    res[t] = await p.evaluate(() => (window.__game.blasones || []).map(b => b.A.house));
  } catch (e) { res[t] = null; console.log(t, 'error', e.message.slice(0, 100)); }
  console.log(t, res[t] ? res[t].length : '?');
}
await b.close();
writeFileSync(out, JSON.stringify(res, null, 1));
console.log('escrito', out, Object.values(res).reduce((n, v) => n + (v ? v.length : 0), 0), 'escudos de casa en', towns.length, 'pueblos');
