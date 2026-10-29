// El presupuesto de un pueblo: lo que pinta con el perfil del iPhone (844 × 390, ×3, calidad baja), en su puerta mirando
// a los cuatro lados, y lo que pinta su partido de pelota si tiene frontón; comparado con lo que aguanta el iPhone 13
// sin perder la imagen (los pueblos medidos en octubre de 2026 que van bien). Cada pueblo nuevo tiene que pasarlo antes
// de publicarse: así se pueden añadir todos los que hagan falta sin que el juego vaya más lento ni se cierre. Solo se
// carga un pueblo cada vez, así que lo que cuenta es lo que pesa cada uno, no cuántos hay.
//   node tools/presupuesto-pueblo.mjs pueblo [pueblo…]   (env BASE: la web compilada, por defecto http://127.0.0.1:8099/;
//   PELOTA=1 mide también el partido; LIGERA=1, con los partidos aligerados; Chromium en /opt/pw-browsers/chromium o CHROMIUM)
// Sale una línea por pueblo, con lo que se pasa; termina con código 1 si alguno se pasa.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

// (lo que aguanta el iPhone 13: el mayor de los pueblos que van bien, con un poco de margen)
const TOPE = {
  pueblo: { tri: 900e3, calls: 520, texMB: 80, bufMB: 35 },
  partido: { tri: 760e3, calls: 490, texMB: 65, bufMB: 35 },
};
const pueblos = process.argv.slice(2), BASE = process.env.BASE || 'http://127.0.0.1:8099/';
if (!pueblos.length) { console.error('uso: node tools/presupuesto-pueblo.mjs pueblo [pueblo…]'); process.exit(2); }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const gpuJs = readFileSync(new URL('./presupuesto-gpu.js', import.meta.url), 'utf8');
const nuevo = async () => {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(gpuJs);
  // (como el iPhone: sin decir su memoria; y, con LIGERA=1, con los partidos aligerados de un iPhone que ya perdió la imagen)
  await ctx.addInitScript((lig) => { Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => undefined }); if (lig) localStorage.setItem('herrizherri-pelota-ligera', '1'); localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); }, !!process.env.LIGERA);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e).slice(0, 200)));
  return p;
};
const espera = async (p, fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn).catch(() => false)) return true; await p.waitForTimeout(700); } return false; };
const mide = (p) => p.evaluate(() => { const R = window.__renderer, i = R.info, g = window.__gpu(); return { tri: i.render.triangles, calls: i.render.calls, texMB: g.texMB, bufMB: g.bufMB }; });
// (y cuánto lleva cada lienzo: el del juego y, si sigue abierto, el del mapa del menú)
const lienzos = (p) => p.evaluate(() => window.__gpu().lienzos.map(l => `${l.lienzo}: ${l.texMB} + ${l.bufMB} MB`));
const pico = (a, m) => !a ? m : Object.fromEntries(Object.keys(m).map(k => [k, Math.max(a[k], m[k])]));
const pasa = (m, t) => Object.keys(t).filter(k => m[k] > t[k]).map(k => `${k} ${k === 'tri' ? Math.round(m[k] / 1000) + 'k' : m[k]} > ${k === 'tri' ? t[k] / 1000 + 'k' : t[k]}`);
let mal = 0;
for (const pueblo of pueblos) {
  const res = { pueblo };
  try {
    const p = await nuevo();
    await p.goto(BASE + '?q=low&skipintro=1', { timeout: 300000 });
    await p.waitForFunction(() => window.__hub?.visible && window.__ready, null, { timeout: 300000 });
    await p.evaluate((t) => window.__hub.townSheet(t), pueblo); await p.waitForTimeout(1500);
    await p.click('.sh-foot [data-play]');
    if (!(await espera(p, () => window.__game?.mode === 'play' && document.getElementById('hub')?.classList.contains('hidden'), 400000))) throw new Error('el pueblo no abre');
    await p.waitForTimeout(5000); let m = null;
    for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { await p.evaluate((h) => { const P = window.__rt.player; P.heading = h; window.__game?.follow?.snap?.(P); }, h); await p.waitForTimeout(2500); m = pico(m, await mide(p)); }
    res.pueblo3d = m; res.lienzos = await lienzos(p); res.sePasa = pasa(m, TOPE.pueblo); res.errores = p.errs.slice(0, 3);
    await p.context().close();
  } catch (e) { res.fallo = String(e).slice(0, 200); }
  if (process.env.PELOTA) try {
    const p = await nuevo();
    await p.goto(BASE + '?q=low', { timeout: 300000 });
    await p.waitForFunction(() => window.__hub?.visible && window.__ready, null, { timeout: 300000 });
    await p.evaluate((t) => window.__hub.onSport('pelota', t), pueblo);
    const toca = async (sel) => { const r = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return q.width ? [q.x + q.width / 2, q.y + q.height / 2] : null; }, sel).catch(() => null); if (r) { await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(500); } return !!r; };
    if (!(await espera(p, () => !!document.querySelector('.tq-tile[data-a="libre"]'), 500000))) throw new Error('sin menú de pelota');
    await p.waitForTimeout(1500); await toca('.tq-tile[data-a="libre"]');
    if (!(await espera(p, () => !!document.querySelector('[data-pel-go]'), 300000))) throw new Error('sin panel del partido');
    await toca('[data-pel-go]'); if (await espera(p, () => !!document.querySelector('[data-mat-go]'), 60000)) await toca('[data-mat-go]');
    if (!(await espera(p, () => ['serveWait', 'servePrep', 'rally', 'point'].includes(window.__game?.pelotaMatch?.game?.phase), 180000))) throw new Error('el partido no empieza');
    let m = null; for (let k = 0; k < 8; k++) { await p.waitForTimeout(800); m = pico(m, await mide(p)); }
    res.partido = m; res.lienzosPartido = await lienzos(p); res.sePasaPartido = pasa(m, TOPE.partido);
    await p.context().close();
  } catch (e) { res.falloPartido = String(e).slice(0, 200); }
  if (res.fallo || res.falloPartido || res.sePasa?.length || res.sePasaPartido?.length) mal++;
  console.log(JSON.stringify(res));
}
await b.close();
process.exit(mal ? 1 : 0);
