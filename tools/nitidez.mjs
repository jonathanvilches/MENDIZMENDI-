// Nitidez de las imágenes en el iPhone 12 tumbado (844 × 390 a densidad 3): por cada imagen a la vista (etiquetas img y
// fondos de CSS con url) mide cuántos píxeles de pantalla le tocan a cada píxel de la imagen. Más de 1,5: se ve
// pixelada; de 1,2 a 1,5: algo blanda. Recorre el menú, las fichas que se abren desde él, el menú de pelota, el torneo, la
// colección, la liga y las pantallas VS de pelota y de fútbol.
// Con el servidor de pruebas normal mide la web; con MINI=1 npx vite, el archivo único (carga las mismas imágenes que el HTML).
// Uso: URL=http://127.0.0.1:5178/ node tools/nitidez.mjs [carpeta] [pantallas separadas por comas]   (DPR=3 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5178/';
const out = process.argv[2] || 'entrega/nitidez'; mkdirSync(out, { recursive: true });
const only = process.argv[3] ? process.argv[3].split(',') : null;
const DPR = +(process.env.DPR || 3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; window.__vsMs = 600000; localStorage.setItem('mendimendiz-lang', 'es');
  localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', seen: { heroBenat: true, dog: true }, xp: 900, last: 'altsasu-alsasua', futbolClub: 'osasuna', txapelas: 1,
    towns: { lesaka: { done: { 0: true }, visits: 1, stamp: true } }, cards: ['armas:baztan'], pelotaris: { lesaka: { name: 'Mikel', town: 'Lesaka', won: 2, lost: 1, stats: { fuerza: 4, agilidad: 3, velocidad: 2 } } }, settings: { quality: 'low' } })); });
await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);

// la medida, en la página: { nombre de la imagen, clase, tamaño en pantalla (CSS), tamaño de la imagen, aumento }
const medir = () => p.evaluate(async () => {
  const dpr = devicePixelRatio, res = [], name = (u) => { const s = String(u || ''); if (s.startsWith('data:')) return 'data:' + s.slice(5, 20); return s.split('?')[0].split('/').slice(-2).join('/'); };
  const vis = (r) => r.width > 6 && r.height > 6 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  // (tapada: en los cinco puntos que se miran hay algo opaco encima que no es suyo, como la hoja que se abre sobre la
  // pantalla; para que cuenten también las que no reciben toques, se miran con todos los toques activos)
  const st = document.createElement('style'); st.textContent = '*{pointer-events:auto!important}'; document.head.appendChild(st);
  const opaco = (x) => { const c = getComputedStyle(x), m = c.backgroundColor.match(/rgba?\(([^)]+)\)/), a = m ? (m[1].split(',')[3] ?? 1) : 0;
    return +a >= 0.85 || /url\(/.test(c.backgroundImage) || (c.backdropFilter && c.backdropFilter !== 'none') || x.tagName === 'IMG' || x.tagName === 'CANVAS'; };
  const tapada = (e, r) => [[.5, .5], [.2, .2], [.8, .2], [.2, .8], [.8, .8]].every(([fx, fy]) => {
    const x = r.left + r.width * fx, y = r.top + r.height * fy; if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
    for (const t of document.elementsFromPoint(x, y)) { if (t === e || e.contains(t)) return false; if (!t.contains(e) && opaco(t)) return true; }
    return false; });
  const hidden = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return true; } return false; };
  for (const e of document.querySelectorAll('img')) {
    const r = e.getBoundingClientRect(); if (!vis(r) || !e.complete || !e.naturalWidth || hidden(e) || tapada(e, r)) continue;
    const fit = getComputedStyle(e).objectFit, sx = r.width / e.naturalWidth, sy = r.height / e.naturalHeight;
    const s = fit === 'contain' || fit === 'scale-down' ? Math.min(sx, sy) : Math.max(sx, sy);
    res.push({ img: name(e.currentSrc || e.src), cls: String(e.className || e.parentElement?.className || '').slice(0, 30), css: [Math.round(r.width), Math.round(r.height)], nat: [e.naturalWidth, e.naturalHeight], up: +(s * dpr).toFixed(2) });
  }
  const bgs = [];
  for (const e of document.querySelectorAll('body *')) {
    const c = getComputedStyle(e); if (!c.backgroundImage.includes('url(')) continue;
    const r = e.getBoundingClientRect(); if (!vis(r) || hidden(e) || tapada(e, r)) continue;
    // (cada capa del fondo con su tamaño: los degradados también cuentan como capa; las desenfocadas no se miden)
    if (/blur\(/.test(c.filter)) continue;
    // (las capas se separan por las comas de fuera de los paréntesis: los degradados llevan comas dentro)
    const split = (v) => { const o = []; let d = 0, a = ''; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(a.trim()); a = ''; } else a += ch; } o.push(a.trim()); return o; };
    const layers = split(c.backgroundImage), sizes = split(c.backgroundSize);
    layers.forEach((L, i) => { const m = L.match(/^url\("?([^")]+)"?\)$/); if (m && !m[1].startsWith('data:image/svg') && !/\.svg/.test(m[1])) bgs.push({ e, r, u: m[1], size: sizes[i % sizes.length], cls: String(e.className || '').slice(0, 30) }); });
  }
  st.remove();
  await Promise.all(bgs.map(x => new Promise(ok => { const im = new Image(); im.onload = () => { x.nw = im.naturalWidth; x.nh = im.naturalHeight; ok(); }; im.onerror = ok; im.src = x.u; })));
  for (const x of bgs) {
    if (!x.nw) continue; const sx = x.r.width / x.nw, sy = x.r.height / x.nh;
    let s = x.size === 'cover' ? Math.max(sx, sy) : x.size === 'contain' ? Math.min(sx, sy) : x.size === 'auto' || x.size === 'auto auto' ? 1 : (() => { const [a, b2] = x.size.split(' '); const w = a.endsWith('%') ? x.r.width * parseFloat(a) / 100 : a.endsWith('px') ? parseFloat(a) : null; const h = (b2 || 'auto').endsWith('%') ? x.r.height * parseFloat(b2) / 100 : (b2 || '').endsWith('px') ? parseFloat(b2) : null; return w ? w / x.nw : h ? h / x.nh : 1; })();
    res.push({ img: 'fondo ' + name(x.u), cls: x.cls, css: [Math.round(x.r.width), Math.round(x.r.height)], nat: [x.nw, x.nh], up: +(s * dpr).toFixed(2) });
  }
  return res;
});
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
