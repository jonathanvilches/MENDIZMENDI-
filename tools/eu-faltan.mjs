// Revisión de la traducción al euskera: juega en euskera (con ?eufaltan, que apunta cada texto que se queda sin
// traducir) por todas las pantallas del menú, todas las fichas de flora y fauna, la ficha de cada pueblo y, en los
// pueblos que se pidan, todas sus misiones con sus diálogos. Escribe la lista en /tmp/eu-faltan.json.
// Uso: node tools/eu-faltan.mjs [pueblo,pueblo…|todos]   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173', arg = process.argv[2] || '';
const flow = readFileSync('lab/flow-town.js', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const miss = new Map(); const add = (arr, where) => { for (const s of arr) { const m = miss.get(s) || { n: 0, where: new Set() }; m.n++; m.where.add(where); miss.set(s, m); } };
const init = () => { localStorage.setItem('mendimendiz-lang', 'eu'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); };
// 1) menú
{ const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.addInitScript(init);
  await p.goto(URL + '/?eufaltan', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  const res = await p.evaluate(async () => {
    const H = window.__hub, sl = (ms) => new Promise(r => setTimeout(r, ms));
    const { LEVELS } = await import('/src/data/levels.js'); const C = (await import('/src/data/comarcas.json')).default;
    for (const s of ['home', 'map', 'towns', 'peaks', 'nature', 'avatars', 'badges', 'passport', 'profile']) { try { H.go(s); await sl(400); } catch (e) { } }
    for (const c of C) { try { H.go('comarca', c.id); await sl(250); } catch (e) { } }
    for (const l of LEVELS) { try { H.townSheet(l.id); await sl(150); } catch (e) { } }
    document.querySelector('.sheet')?.remove();
    const F = await import('/src/ui/ficha.js'), { tr } = await import('/src/i18n.js');
    // las fichas: se pasan sus textos por el traductor (sin abrir 150 ventanas)
    for (const t of ['flora', 'fauna']) for (const d of F.allFichas(t)) for (const k of ['name', 'look', 'where', 'season', 'fact', 'use', 'kind']) if (typeof d.F[k] === 'string') tr(d.F[k]);
    return [...window.__euMiss];
  });
  add(res, 'menú'); console.log('menú', res.length); await p.close(); }
// 2) pueblos: todas las misiones, con los diálogos pasados por el traductor
const towns = arg === 'todos' ? [...readFileSync('src/data/levels.js', 'utf8').matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]).filter(t => t !== 'otsagabia-ochagavia') : arg ? arg.split(',') : [];
async function town(t) {
  const p = await b.newPage({ viewport: { width: 800, height: 450 } }); await p.addInitScript(init);
  try {
    await p.goto(`${URL}/?town=${t}&eufaltan&q=low&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
    await p.evaluate(async () => { const { tr } = await import('/src/i18n.js'); const G = window.__game;
      window.__trLines = (lines) => { for (const L of lines || []) { if (typeof L === 'string') tr(L); else { if (L?.text) tr(L.text); if (L?.who) tr(L.who); for (const c of L?.choices || []) tr(typeof c === 'string' ? c : c.text || c.label || ''); } } };
      const ui = G.ui; const orig = ui.toast?.bind(ui); if (orig) ui.toast = (m, ...r) => { tr(String(m)); return orig(m, ...r); }; });
    // el recorrido de las misiones (cambia el diálogo por uno automático: antes se pasa cada línea por el traductor)
    const f = flow.replace('G.ui.dialog = async (lines) => {', 'G.ui.dialog = async (lines) => { window.__trLines(lines);');
    await p.evaluate(f).catch(e => console.log('  recorrido:', e.message.split('\n')[0]));
    await p.waitForTimeout(1500);
    const res = await p.evaluate(() => [...window.__euMiss]); add(res, t); console.log(t, res.length);
  } catch (e) { console.log('FALLO', t, e.message.split('\n')[0]); }
  await p.close();
}
const queue = towns.slice(); await Promise.all(Array.from({ length: +(process.env.N || 3) }, async () => { while (queue.length) await town(queue.shift()); }));
await b.close();
const out = [...miss].map(([s, m]) => ({ s, n: m.n, where: [...m.where].slice(0, 4) })).sort((a, b) => b.n - a.n);
writeFileSync('/tmp/eu-faltan.json', JSON.stringify(out, null, 1)); console.log('sin traducir:', out.length);
