// Nitidez de las imágenes en el iPhone 12 tumbado (844 × 390 a densidad 3): por cada imagen a la vista (etiquetas img y
// fondos de CSS con url) mide cuántos píxeles de pantalla le tocan a cada píxel de la imagen. Más de 1,5: se ve
// pixelada; de 1,2 a 1,5: algo blanda. Recorre el menú, las fichas que se abren desde él, el menú de pelota, el torneo, la
// colección, la liga y las pantallas VS de pelota y de fútbol.
// Con el servidor de pruebas normal mide la web; con MINI=1 npx vite, el archivo único (carga las mismas imágenes que el HTML).
// Uso: URL=http://127.0.0.1:5178/ node tools/nitidez.mjs [carpeta] [pantallas separadas por comas]   (DPR=3 por defecto;
// VISTA=1920x1080 para medir en un ordenador, con DPR=1 o 2, sin táctil)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { medirEnPagina } from './nitidez-medir.mjs';
const URL = process.env.URL || 'http://127.0.0.1:5178/';
const out = process.argv[2] || 'entrega/nitidez'; mkdirSync(out, { recursive: true });
const only = process.argv[3] ? process.argv[3].split(',') : null;
const DPR = +(process.env.DPR || 3), VISTA = (process.env.VISTA || '844x390').split('x').map(Number), MOVIL = !process.env.VISTA;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: VISTA[0], height: VISTA[1] }, deviceScaleFactor: DPR, isMobile: MOVIL, hasTouch: MOVIL })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; window.__vsMs = 600000; localStorage.setItem('herrizherri-lang', 'es');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', seen: { heroBenat: true, dog: true }, xp: 900, last: 'altsasu-alsasua', futbolClub: 'osasuna', txapelas: 1,
    towns: { lesaka: { done: { 0: true }, visits: 1, stamp: true } }, cards: ['armas:baztan'], pelotaris: { lesaka: { name: 'Mikel', town: 'Lesaka', won: 2, lost: 1, stats: { fuerza: 4, agilidad: 3, velocidad: 2 } } }, settings: { quality: 'low' } })); });
await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);

// la medida, en la página: { nombre de la imagen, clase, tamaño en pantalla (CSS), tamaño de la imagen, aumento }
const medir = () => p.evaluate(medirEnPagina);
const todo = {};
const want = (n) => !only || only.includes(n);
const ver = async (n) => {
  await p.waitForTimeout(1500); await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
  const r = todo[n] = (await medir()).sort((a, c) => c.up - a.up); await p.screenshot({ path: `${out}/${n}.png` });
  const mal = r.filter(x => x.up > 1.5), blanda = r.filter(x => x.up > 1.2 && x.up <= 1.5);
  console.log(`\n== ${n}: ${r.length} imágenes · pixeladas ${mal.length} · blandas ${blanda.length}`);
  for (const x of [...mal, ...blanda].slice(0, 8)) console.log(`   ×${x.up} ${x.img} [${x.cls}] ${x.css.join('×')} css · ${x.nat.join('×')} px`);
};
const quitar = () => p.evaluate(() => { document.querySelectorAll('.ix-ov,.lg-root,.pvs,.mg-overlay,.sheet,.hub-modal,.pc-root').forEach(x => x.remove()); window.__hub.sheet = null; });
// el menú y lo que se abre tocando lo primero de cada pantalla
const PANT = [['home'], ['sports'], ['avatars'], ['map'], ['towns'], ['nature', '[data-flora],[data-f]'], ['badges'], ['passport'], ['profile'], ['escudos', '[data-arm]'], ['cuentos', '[data-ley]'], ['album', '[data-k],[data-s]'], ['peaks', '[data-k],[data-s]']];
for (const [s, abrir] of PANT) {
  if (!want(s)) continue;
  await p.evaluate((s) => window.__hub.go(s, undefined, true), s); await ver(s);
  if (abrir && await p.$(abrir)) { await p.evaluate((q) => document.querySelector(q).click(), abrir); await ver(s + '-abierta'); await quitar(); }
}
if (want('comarca')) { await p.evaluate(() => window.__hub.go('comarca', 'sakana', true)); await ver('comarca'); }
if (want('pueblo')) { await p.evaluate(() => window.__hub.townSheet('altsasu-alsasua')); await ver('pueblo'); await quitar(); }
const ctx = { comarca: 'sakana', comarcaName: 'Sakana', towns: [{ id: 'altsasu', name: 'Altsasu' }, { id: 'irurtzun', name: 'Irurtzun' }] };
if (want('menu-pelota')) { await p.evaluate(async (ctx) => { const t = await import('/src/game/torneo.js'); t.pelotaMenu(t.torneo({ name: 'Ane', town: 'Altsasu' }, ctx), 'Altsasu', t.torneo({ name: 'Ane', town: 'Altsasu' }, ctx, false, 'parejas')); }, ctx); await ver('menu-pelota'); await quitar(); }
if (want('torneo')) { await p.evaluate(async (ctx) => { const t = await import('/src/game/torneo.js'); t.torneoPanel(t.torneo({ name: 'Ane', town: 'Altsasu' }, ctx), 'Altsasu'); }, ctx); await ver('torneo'); await quitar(); }
if (want('pelotaris')) { await p.evaluate(async () => { const m = await import('/src/game/pelotaris.js'); m.pelotarisPanel('sakana'); }); await ver('pelotaris'); await quitar(); }
if (want('liga')) { await p.evaluate(async () => { const L = await import('/src/futbol/liga.js'); const C = (await import('/src/futbol/clubs.js')).CLUBS; L.ligaPanel(L.season(Object.keys(C)[0])); }); await ver('liga'); await quitar(); }
if (want('club')) { await p.evaluate(async () => { const L = await import('/src/futbol/liga.js'); L.clubPanel('betigazte', [['liga', 'Liga Navarra', 'Contra los clubes de tu grupo', 'Jornada 1 de 7'], ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['sadar', 'Partido rápido', 'Iruña contra el visitante'], ['club', 'Cambiar de club', 'Lesaka'], ['exit', 'Salir', '']], 'Campeonato de fútbol'); }); await ver('club'); await quitar(); }
if (want('clubes')) { await p.evaluate(async () => { const L = await import('/src/futbol/liga.js'); L.clubPick('betigazte'); }); await ver('clubes'); await quitar(); }
if (want('vs-pelota')) { await p.evaluate(async () => { const { showVs } = await import('/src/pelota/vs.js'); const { pelotariFig } = await import('/src/ui/pelotariFig.js'); const h = document.createElement('div'); h.style.cssText = 'position:fixed;inset:0;z-index:40000'; document.body.appendChild(h);
  showVs(h, { comp: 'Torneo de mano · Final', you: { name: 'Ane', sub: 'Lesaka', pf: pelotariFig('Ane', 'azul', '', true), ovr: 73, stats: [] }, rival: { name: 'Mikel', sub: 'Leitza', pf: pelotariFig('Mikel', 'rojo', '', true), ovr: 81, stats: [] }, venue: 'Frontón Labrit', tags: [], line: 'Mano a mano' }); }); await ver('vs-pelota'); await p.evaluate(() => document.querySelectorAll('.pvs').forEach(x => x.parentElement.remove())); }
if (want('vs-futbol')) { await p.evaluate(async () => { const { showVs } = await import('/src/pelota/vs.js'); const F = await import('/src/futbol/jugadorFig.js').catch(() => null); const { kitSvgOf } = await import('/src/futbol/liga.js'); const { teamOfClub } = await import('/src/futbol/clubs.js');
  const A = teamOfClub('vianes'), B = teamOfClub('marcilla'), h = document.createElement('div'); h.style.cssText = 'position:fixed;inset:0;z-index:40000'; document.body.appendChild(h);
  const fig = (t, k) => { const pf = F && (F.jugadorDuo(t, '', true) || F.jugadorFig(t)); return pf ? { pf } : { figHtml: kitSvgOf(t, 320, k) }; };
  showVs(h, { comp: 'Liga Navarra · Jornada 1', you: { name: A.name, sub: A.town, ...fig(A, 'a'), ovr: 66, stats: [] }, rival: { name: B.name, sub: B.town, ...fig(B, 'b'), ovr: 64, stats: [] }, venue: 'El Sadar', tags: [], line: 'Fútbol 11' }); }); await ver('vs-futbol'); await p.evaluate(() => document.querySelectorAll('.pvs').forEach(x => x.parentElement.remove())); }
if (want('flora')) { await p.evaluate(async () => { const { showFicha } = await import('/src/ui/ficha.js'); showFicha('flora:haya', { badge: 'Al herbario' }); }); await ver('flora'); await quitar(); }
if (want('fauna')) { await p.evaluate(async () => { const { showFicha } = await import('/src/ui/ficha.js'); showFicha('fauna:corzo', { badge: 'Nueva carta' }); }); await ver('fauna'); await quitar(); }
writeFileSync(`${out}/nitidez.json`, JSON.stringify(todo, null, 1));
const all = Object.values(todo).flat(), mal = all.filter(x => x.up > 1.5), bl = all.filter(x => x.up > 1.2 && x.up <= 1.5);
console.log(`\nTOTAL ${all.length} imágenes · pixeladas ${mal.length} · blandas ${bl.length}`);
console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
