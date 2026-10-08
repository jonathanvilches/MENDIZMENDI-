// Rediseño deportivo en el móvil tumbado: fotografía las pantallas de deporte y de menú a 844x390 (y la que se pida con
// TAM=WxH) para ver el estilo de un vistazo: campeonatos, elige tu personaje, mapa, menú de pelota, cuadro del torneo,
// colección de pelotaris, liga de fútbol y la pantalla VS. Mide lo básico: que nada se salga de la pantalla, que no haga
// falta desplazar para ver el botón principal y que la letra no baje de 12 px.
// Uso: URL=http://127.0.0.1:5173/ node tools/rediseno-ver.mjs [carpeta] [pantallas separadas por comas]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const out = process.argv[2] || 'entrega/rediseno'; mkdirSync(out, { recursive: true });
const only = process.argv[3] ? process.argv[3].split(',') : null;
const [W, H] = (process.env.TAM || '844x390').split('x').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; window.__vsMs = 600000; localStorage.setItem('mendimendiz-lang', 'es');
  localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', seen: { heroBenat: true, dog: true }, xp: 900, last: 'lesaka', futbolClub: 'osasuna', towns: { lesaka: { done: { 0: true }, visits: 1 } }, cards: ['armas:baztan'], pelotaris: { lesaka: { name: 'Mikel', town: 'Lesaka', won: 2, lost: 1, stats: { fuerza: 4, agilidad: 3, velocidad: 2, style: 'potencia' } }, leitza: { name: 'Garazi', town: 'Leitza', won: 0, lost: 1, stats: { fuerza: 2, agilidad: 4, velocidad: 4 } } }, settings: { quality: 'low' } })); });
await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
const measure = (sel) => p.evaluate((sel) => {
  const root = sel ? document.querySelector(sel) : document.body; if (!root) return { falta: sel };
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const fuera = [...root.querySelectorAll('button, b, h1, h2, h3, small, span, p')].filter(vis).filter(e => { for (let q = e.parentElement; q; q = q.parentElement) if (/(auto|scroll)/.test(getComputedStyle(q).overflowX) && q.scrollWidth > q.clientWidth + 1) return false; const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(e => (e.className || e.tagName).toString().slice(0, 24)).slice(0, 6);
  const tiny = [...root.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).filter(vis).filter(e => !e.closest('[aria-hidden=true]')).filter(e => parseFloat(getComputedStyle(e).fontSize) < 12).map(e => (e.className || e.tagName).toString().slice(0, 24) + ':' + getComputedStyle(e).fontSize).slice(0, 6);
  const go = root.querySelector('.lg-btn.go, .btn.primary, [data-a=play], .gm-go'), gr = go?.getBoundingClientRect();
  const scr = [...root.querySelectorAll('*')].filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2).map(e => (e.className || e.tagName).toString().slice(0, 20) + ':' + (e.scrollHeight - e.clientHeight));
  return { fuera, tiny, boton: go ? (gr.bottom <= innerHeight + 1 && gr.top >= 0 ? 'a la vista' : 'fuera ' + Math.round(gr.top)) : 'sin botón', desplaza: scr.slice(0, 4) };
}, sel);
const shot = async (name, sel) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${name}.png` }); console.log(name.padEnd(12), JSON.stringify(await measure(sel))); };
const want = (n) => !only || only.includes(n);
for (const s of ['home', 'sports', 'avatars', 'map', 'towns', 'nature', 'badges', 'passport', 'profile', 'escudos', 'cuentos', 'peaks']) if (want(s)) { await p.evaluate((s) => window.__hub.go(s, undefined, true), s); await shot(s); }
if (want('menu')) { await p.evaluate(async () => { const t = await import('/src/game/torneo.js'); const ctx = { comarca: 'bidasoa', comarcaName: 'Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }, { id: 'bera', name: 'Bera' }] };
  window.__m = t.pelotaMenu(t.torneo({ name: 'Ane', town: 'Lesaka' }, ctx), 'Lesaka', t.torneo({ name: 'Ane', town: 'Lesaka' }, ctx, false, 'parejas')); }); await shot('menu', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('torneo')) { await p.evaluate(async () => { const t = await import('/src/game/torneo.js'); const ctx = { comarca: 'bidasoa', comarcaName: 'Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }, { id: 'bera', name: 'Bera' }] };
  const T = t.torneo({ name: 'Ane', town: 'Lesaka' }, ctx); t.torneoPanel(T, 'Lesaka'); }); await shot('torneo', '.lg-root');
  await p.evaluate(async () => { document.querySelector('.lg-root')?.remove(); const t = await import('/src/game/torneo.js'); const ctx = { comarca: 'bidasoa', comarcaName: 'Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }] };
    const T = t.torneo({ name: 'Ane', town: 'Lesaka' }, ctx); if (T.round === 0) t.playTorneoRound(T, 5, 3); t.torneoPanel(T, 'Lesaka'); }); await shot('torneo2', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('pelotaris')) { await p.evaluate(async () => { const m = await import('/src/game/pelotaris.js'); window.__pc = m.pelotarisPanel('bidasoa'); }); await shot('pelotaris', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('liga')) { await p.evaluate(async () => { const L = await import('/src/futbol/liga.js'); const C = (await import('/src/futbol/clubs.js')).CLUBS; L.ligaPanel(L.season(Object.keys(C)[0])); }); await shot('liga', '.lg-root'); await p.evaluate(() => document.querySelector('.lg-root')?.remove()); }
if (want('vs')) { await p.evaluate(async () => { const { showVs } = await import('/src/pelota/vs.js'); const you = (await import('/src/assets/meshy/portraits/pelotari_vs.webp?url')).default, rv = (await import('/src/assets/meshy/portraits/pelotari_rojo_vs.webp?url')).default;
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;z-index:40000'; document.body.appendChild(host); window.__vsHost = host;
  showVs(host, { comp: 'Torneo de mano · Final', you: { name: 'Ane', sub: 'Lesaka', img: you, ovr: 73, ovrLabel: 'Media', stats: [{ k: 'Vel', v: 71 }, { k: 'Pot', v: 69 }, { k: 'Man', v: 74 }] }, rival: { name: 'Mikel', sub: 'Leitza', img: rv, ovr: 81, ovrLabel: 'Media', stats: [{ k: 'Vel', v: 58 }, { k: 'Pot', v: 85 }, { k: 'Man', v: 72 }] }, venue: 'Frontón Labrit · Iruña', cond: { covered: true, labrit: true }, tags: [{ name: 'A cubierto', what: 'Sin viento ni lluvia.' }, { name: 'Pelota viva', what: '' }], line: 'Mano a mano · a 7 tantos · Difícil', quote: 'Cuando menos lo esperas, te la deja muerta junto al frontis.', tap: 'Toca para empezar' }); });
  await p.waitForTimeout(250); await p.screenshot({ path: `${out}/vs-entrada.png` }); await p.waitForTimeout(450); await p.screenshot({ path: `${out}/vs-golpe.png` }); await shot('vs', '.pvs'); await p.evaluate(() => window.__vsHost?.remove()); }
console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
