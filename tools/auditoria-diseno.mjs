// Auditoría de diseño de las pantallas del menú y de las de deporte: busca lo que se ve mal aunque «funcione».
//   · cortado: texto con puntos suspensivos, recortado por líneas o que se sale de su caja o de una caja que lo recorta
//   · encima: texto que pisa una figura o imagen (que no es su fondo) o que pisa otro texto
//   · verde: colores verdes fuera de sitio (texto, fondos, bordes y degradados); se avisa de todos para revisarlos
//   · esquina: caja con esquinas en ángulo (clip-path) y borde, cuyo borde no sigue el corte
// Mide toda la página (también lo que queda por debajo, al desplazar), no solo lo que se ve. Hace capturas.
// Uso: URL=http://127.0.0.1:5173/ node tools/auditoria-diseno.mjs [carpeta] [pantallas separadas por comas]   (TAM=844x390)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { auditar } from './auditoria-medida.mjs';
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const out = process.argv[2] || 'entrega/auditoria'; mkdirSync(out, { recursive: true });
const only = process.argv[3] ? process.argv[3].split(',') : null;
const [W, H] = (process.env.TAM || '844x390').split('x').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
// (un perfil con datos de verdad: textos largos como «2 partidos · 0 ganados», txapelas, club elegido, cartas y rivales)
await p.addInitScript(() => { window.__vs = true; window.__vsMs = 600000; localStorage.setItem('mendimendiz-lang', 'es');
  localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ played: 12, won: 7, goals: 23, tutorial: true }));
  localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', seen: { heroBenat: true, dog: true }, xp: 900, last: 'altsasu-alsasua', futbolClub: 'osasuna', txapelas: 1,
    towns: { lesaka: { done: { 0: true }, visits: 1 }, 'altsasu-alsasua': { done: { 0: true, 1: true }, visits: 2 } }, cards: ['armas:baztan'],
    pelotaris: { lesaka: { name: 'Mikel', town: 'Lesaka', won: 2, lost: 1, stats: { fuerza: 4, agilidad: 3, velocidad: 2 } }, leitza: { name: 'Garazi', town: 'Leitza', won: 0, lost: 1, stats: { fuerza: 2, agilidad: 4, velocidad: 4 } } }, settings: { quality: 'low' } })); });
await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);

const audit = (sel) => p.evaluate(auditar, sel);
const res = {};
const shot = async (n, sel) => { await p.waitForTimeout(1200); await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
  await p.screenshot({ path: `${out}/${n}.png`, fullPage: false }); const r = res[n] = await audit(sel);
  console.log(`\n== ${n}: ${Object.entries(r).map(([k, v]) => `${k} ${v.length}`).join(' · ')}`); for (const [k, v] of Object.entries(r)) for (const x of v.slice(0, 12)) console.log(`   ${k}: ${x}`); };
const want = (n) => !only || only.includes(n);
for (const s of ['home', 'sports', 'avatars', 'map', 'towns', 'nature', 'badges', 'passport', 'profile', 'escudos', 'cuentos', 'peaks']) if (want(s)) { await p.evaluate((s) => window.__hub.go(s, undefined, true), s); await shot(s, '.hub-main'); }
if (want('comarca')) { await p.evaluate(() => window.__hub.go('comarca', 'sakana', true)); await shot('comarca', '.hub-main'); }
if (want('pueblo')) { await p.evaluate(() => window.__hub.townSheet('altsasu-alsasua')); await p.waitForTimeout(600); await shot('pueblo', '.sheet'); await p.evaluate(() => { window.__hub.sheet?.remove(); window.__hub.sheet = null; }); }
const ctx = { comarca: 'sakana', comarcaName: 'Sakana', towns: [{ id: 'altsasu', name: 'Altsasu' }, { id: 'irurtzun', name: 'Irurtzun' }] };
if (want('menu')) { await p.evaluate(async (ctx) => { const t = await import('/src/game/torneo.js'); window.__m = t.pelotaMenu(t.torneo({ name: 'Ane', town: 'Altsasu' }, ctx), 'Altsasu', t.torneo({ name: 'Ane', town: 'Altsasu' }, ctx, false, 'parejas')); }, ctx); await shot('menu', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('torneo')) { await p.evaluate(async (ctx) => { const t = await import('/src/game/torneo.js'); t.torneoPanel(t.torneo({ name: 'Ane', town: 'Altsasu' }, ctx), 'Altsasu'); }, ctx); await shot('torneo', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('pelotaris')) { await p.evaluate(async () => { const m = await import('/src/game/pelotaris.js'); window.__pc = m.pelotarisPanel('sakana'); }); await shot('pelotaris', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('liga')) { await p.evaluate(async () => { const L = await import('/src/futbol/liga.js'); const C = (await import('/src/futbol/clubs.js')).CLUBS; L.ligaPanel(L.season(Object.keys(C)[0])); }); await shot('liga', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('flora')) { await p.evaluate(async () => { const { showFicha } = await import('/src/ui/ficha.js'); showFicha('flora:haya', { badge: 'Al herbario' }); }); await shot('flora', '.ix-ov'); await p.evaluate(() => document.querySelector('.ix-ov')?.remove()); }
if (want('fauna')) { await p.evaluate(async () => { const { showFicha } = await import('/src/ui/ficha.js'); showFicha('fauna:corzo', { badge: 'Nueva carta' }); }); await shot('fauna', '.ix-ov'); await p.evaluate(() => document.querySelector('.ix-ov')?.remove()); }
writeFileSync(`${out}/auditoria.json`, JSON.stringify(res, null, 1));
const tot = {}; for (const r of Object.values(res)) for (const [k, v] of Object.entries(r)) tot[k] = (tot[k] || 0) + (v.length || 0);
console.log('\nTOTAL', JSON.stringify(tot)); console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
