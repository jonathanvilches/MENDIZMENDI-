// Vigía en un partido de fútbol jugado solo (móvil horizontal, calidad baja): cada figura, fotograma a fotograma, con
// tools/vigia-lib.mjs. Uso: node tools/vigia-futbol.mjs [sadar|pista] [segundos de juego]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { VIGIA_SRC } from './vigia-lib.mjs';
const [,, venue = 'sadar', secs = '150'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); });
await p.goto((process.env.URL || 'http://127.0.0.1:5173') + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('[data-sport="futbol"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
const sel = venue === 'sadar' ? '[data-a="sadar"]' : '[data-a="sala"]';
await p.waitForFunction((s) => document.querySelector('.lg-root ' + s), sel, { timeout: 60000 }); await p.evaluate((s) => document.querySelector('.lg-root ' + s).click(), sel);
await p.waitForFunction(() => window.__futbol && window.__futbol.game && document.body.classList.contains('futbol'), null, { timeout: 600000 });
await p.evaluate(VIGIA_SRC); await p.evaluate((n) => { window.__vigiaEx = n; }, +(process.env.EX || 8));
const r = await p.evaluate(async (secs) => {
  const m = window.__futbol, g = m.game, V = window.__vigia; g.autoplay = true;
  for (const q of g.players) V.add(`${q.team ? 'B' : 'A'}${q.num}${q.role === 'POR' ? 'P' : ''}`, m.chars[q.id].c.obj, () => q.dive || q.slide || q.down > 0 ? 0 : Math.hypot(q.vx, q.vz), () => !!m.replay || m.intro > 0 || m.t - (m.cutAt ?? -9) < 0.05);
  g.refs.forEach((q, i) => V.add('arb' + i, m.refChars[i].c.obj, () => Math.hypot(q.vx, q.vz), () => !!m.replay || m.intro > 0 || g.noRefs || m.t - (m.cutAt ?? -9) < 0.05));
  const dt = 1 / 30; let t = 0;
  for (let i = 0; i < secs * 30; i++) { m.update(dt); t += dt; V.step(dt, t, g.phase + (g.restart ? ':' + g.restart.type : '') + (m.intro > 0 ? ':intro' : '')); if (i % 300 === 0) { await new Promise(r => setTimeout(r, 0)); V.gap(); } if (m.done || m.ended) break; }
  return { t: +t.toFixed(1), n: V.list.length, score: g.score, guard: m.vigia, total: V.total(), worst: V.report().filter(x => Object.entries(x).some(([k, v]) => !/^(name|frames|maxJump|minW|switches|ex)$/.test(k) && v > 0)) };
}, +secs);
console.log(JSON.stringify(r.total), 'vigía del juego', JSON.stringify(r.guard), 't', r.t, 'marcador', JSON.stringify(r.score));
for (const w of r.worst) console.log(JSON.stringify(w));
// aprobado: nada de NaN, figuras ocultas, cadera suelta, clip congelado ni postura en cruz; saltos y ráfagas, casi nada
const T = r.total, bad = T.nan + T.hidden + T.hips + T.frozen + T.lowW + T.runStill, frames = r.n * r.t * 30;
const okJ = T.jump <= 2 && T.skate <= frames * 0.002 && T.burst <= Math.max(3, frames * 0.0004);
console.log(bad === 0 && okJ && !errs.length ? 'VIGÍA: todo bajo control' : 'VIGÍA: FALLA');
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
if (bad || !okJ || errs.length) process.exitCode = 1;
await b.close();
