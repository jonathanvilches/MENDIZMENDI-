// Vigía en un partido de pelota jugado solo (móvil horizontal, calidad baja): los dos pelotaris, fotograma a fotograma,
// con tools/vigia-lib.mjs. Uso: node tools/vigia-pelota.mjs [pueblo] [segundos]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { VIGIA_SRC } from './vigia-lib.mjs';
const [,, town = 'lumbier', secs = '120'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`${process.env.URL || "http://127.0.0.1:5173"}/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => { window.__game.pelotaMatch.game.autoplay = true; document.querySelector('.pel-panel [data-pel-go]').click(); });
await p.evaluate(VIGIA_SRC); await p.evaluate((n) => { window.__vigiaEx = n; }, +(process.env.EX || 8));
const r = await p.evaluate(async (secs) => {
  const G = window.__game, M = G.pelotaMatch, g = M.game, V = window.__vigia;
  const roots = (obj) => { let r = null; obj.traverse(o => { if (!r && o.userData?.glbChar) r = o; }); return r; };
  V.add('tú', roots(M.o.you.obj), () => g.players.you.speed || 0);
  V.add('rival', roots(M.o.rival.obj), () => g.players.cpu?.speed ?? g.players.rival?.speed ?? 0);
  const dt = 1 / 30; let t = 0;
  for (let i = 0; i < secs * 30; i++) { G.pelotaTick?.(dt); t += dt; V.step(dt, t, g.phase); if (i % 300 === 0) { await new Promise(r => setTimeout(r, 0)); V.gap(); } if (!G.pelotaMatch) break; }
  return { t: +t.toFixed(1), n: V.list.length, score: g.score, players: Object.keys(g.players), total: V.total(), rep: V.report() };
}, +secs);
console.log(JSON.stringify(r.total), 't', r.t, JSON.stringify(r.score), r.players);
for (const w of r.rep) console.log(JSON.stringify(w));
// aprobado: nada de NaN, figuras ocultas, cadera suelta, clip congelado ni postura en cruz; saltos y ráfagas, casi nada
const T = r.total, bad = T.nan + T.hidden + T.hips + T.frozen + T.lowW + T.runStill, frames = r.n * r.t * 30;
const okJ = T.jump <= 2 && T.skate <= frames * 0.002 && T.burst <= Math.max(3, frames * 0.0004);
console.log(bad === 0 && okJ && !errs.length ? 'VIGÍA: todo bajo control' : 'VIGÍA: FALLA');
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
if (bad || !okJ || errs.length) process.exitCode = 1;
await b.close();
