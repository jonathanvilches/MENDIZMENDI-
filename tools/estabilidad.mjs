// Estabilidad en el móvil (lo que se nota como destellos, pantalla negra, cierres y vecinos raros):
//  1. tamaño del lienzo: al girar el móvil o cambiar la resolución dinámica, el lienzo se redimensiona en el mismo
//     fotograma en el que se dibuja (si no, se ve un fotograma vacío: un destello)
//  2. memoria gráfica perdida y devuelta (como en el iPhone al volver de otra aplicación): el pueblo se rehace solo y
//     se sigue jugando, sin pantalla negra
//  3. vecinos: no respiran todos a la vez (cada uno en su punto del clip) y no andan en el sitio contra una pared
//  4. memoria tras cambiar de pueblo varias veces: geometrías, texturas y programas no crecen sin parar
// Uso: node tools/estabilidad.mjs [pueblos separados por comas]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const towns = (process.argv[2] || 'lesaka,elizondo,lumbier,lesaka').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); } catch (e) { } });
const ok = (c, m) => console.log(`  ${c ? 'OK ' : 'MAL'} ${m}`);
const playing = () => p.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__rt?.active, null, { timeout: 400000 });

await p.goto(`${URL}/?town=${towns[0]}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await playing(); await p.waitForTimeout(2500);

// 1. orden: cada cambio de tamaño, seguido del dibujo en la misma vuelta del bucle
console.log('1. tamaño del lienzo');
const order = await p.evaluate(async () => {
  const rt = window.__rt, R = rt.renderer, log = []; let tick = 0;
  const ss = R.setSize, sp = R.setPixelRatio, rd = R.render;
  R.setSize = function (...a) { log.push(['size', tick]); return ss.apply(this, a); };
  R.setPixelRatio = function (...a) { log.push(['ratio', tick]); return sp.apply(this, a); };
  R.render = function (...a) { log.push(['render', tick]); const r = rd.apply(this, a); tick++; return r; };
  const until = async (f) => { for (let i = 0; i < 200 && !f(); i++) await new Promise(r => setTimeout(r, 50)); const t = tick; for (let i = 0; i < 200 && tick === t; i++) await new Promise(r => setTimeout(r, 50)); };
  dispatchEvent(new Event('resize')); await until(() => !rt.sizeDirty);
  rt.pixelRatio = Math.max(0.6, rt.pixelRatio - 0.15); rt.ratioDirty = true; await until(() => !rt.ratioDirty);   // como la resolución dinámica
  rt.boost(true); await until(() => !rt.ratioDirty); rt.boost(false); await until(() => !rt.ratioDirty);
  R.setSize = ss; R.setPixelRatio = sp; R.render = rd;
  // ¿hay algún cambio de tamaño que no vaya seguido del dibujo en la misma vuelta del bucle?
  const bad = log.filter((e, i) => e[0] !== 'render' && !log.slice(i + 1).find(x => x[0] === 'render' && x[1] === e[1]));
  return { cambios: log.filter(e => e[0] !== 'render').length, sueltos: bad.length };
});
ok(order.cambios >= 3 && order.sueltos === 0, `${order.cambios} cambios de tamaño, ${order.sueltos} sin dibujo a continuación`);

// 2. memoria gráfica perdida y devuelta
console.log('2. memoria gráfica perdida y devuelta');
const ext = await p.evaluate(() => !!window.__rt.renderer.getContext().getExtension('WEBGL_lose_context'));
if (!ext) ok(false, 'este navegador no deja simular la pérdida');
else {
  await p.evaluate(() => { const g = window.__rt.renderer.getContext(), e = g.getExtension('WEBGL_lose_context'); window.__lce = e; e.loseContext(); });
  await p.waitForTimeout(800);
  const lost = await p.evaluate(() => ({ aviso: !!document.querySelector('.ctxlost'), perdido: window.__rt.contextLost }));
  ok(lost.aviso && lost.perdido, 'al perderse, aviso «Recuperando la imagen…»');
  await p.evaluate(() => window.__lce.restoreContext());
  await p.waitForFunction(() => !document.querySelector('.ctxlost') && window.__game && window.__game.mode === 'play' && window.__rt.active && !window.__rt.contextLost, null, { timeout: 400000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const back = await p.evaluate(() => { const f0 = window.__rt.renderer.info.render.frame; return new Promise(r => setTimeout(() => r({ aviso: !!document.querySelector('.ctxlost'), juego: window.__game?.mode, dibuja: window.__rt.renderer.info.render.frame - f0, tris: window.__rt.renderer.info.render.triangles }), 1500)); });
  ok(!back.aviso && back.juego === 'play' && back.dibuja > 0 && back.tris > 1000, `al volver: juego ${back.juego}, ${back.dibuja} fotogramas en 1,5 s, ${back.tris} triángulos en pantalla`);
}

// 3. vecinos
console.log('3. vecinos');
const npc = await p.evaluate(async () => {
  const g = window.__game, list = (g.actors || []).filter(a => a.glb && a.visible !== false);
  const phases = list.filter(a => /^(Idle|Talk)/.test(a.glb.currentName || '')).map(a => { const c = a.glb.current; return c ? (c.time / c.getClip().duration) : 0; });
  const rates = new Set(list.map(a => a.glb.idleRate?.toFixed(3)));
  // durante 6 s: ¿alguien en estado «andar» que no avanza?
  let stuckMax = 0; const st = new Map();
  for (let k = 0; k < 30; k++) {
    await new Promise(r => setTimeout(r, 200));
    for (const a of list) { const s = a.state === 'walk' && (a.vSpeed ?? 1) < 0.15 ? (st.get(a) || 0) + 0.2 : 0; st.set(a, s); stuckMax = Math.max(stuckMax, s); }
  }
  const spread = phases.length > 1 ? Math.max(...phases) - Math.min(...phases) : 1;
  return { n: list.length, enReposo: phases.length, spread: +spread.toFixed(2), ritmos: rates.size, stuckMax: +stuckMax.toFixed(1) };
});
ok(npc.enReposo < 2 || npc.spread > 0.3, `${npc.n} vecinos, ${npc.enReposo} en reposo; sus puntos del clip abarcan ${npc.spread} del ciclo (a la vez sería 0)`);
ok(npc.ritmos > Math.min(3, npc.n - 1), `${npc.ritmos} ritmos de reposo distintos`);
ok(npc.stuckMax <= 1, `andando sin avanzar como mucho ${npc.stuckMax} s`);

// 4. memoria al cambiar de pueblo
console.log('4. memoria al cambiar de pueblo');
const info = () => p.evaluate(() => { const i = window.__rt.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs?.length || 0, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6) }; });
const rows = [[towns[0], await info()]];
// (se viaja dentro de la misma página, como al jugar: así se ve si algo se queda en memoria de un pueblo a otro)
for (const t of towns.slice(1)) {
  await p.evaluate((t) => window.__game.onPlayTown(t), t);
  await p.waitForFunction((t) => window.__game && window.__game.def?.id === t && window.__game.mode === 'play' && window.__rt?.active, t, { timeout: 400000 });
  await p.waitForTimeout(2500);
  rows.push([t, await info()]);
}
for (const [t, r] of rows) console.log(`  ${t.padEnd(12)} geometrías ${r.geo} · texturas ${r.tex} · programas ${r.prog} · JS ${r.heap} MB`);
console.log(errs.length ? 'errores:\n  ' + [...new Set(errs)].slice(0, 8).join('\n  ') : 'sin errores');
await b.close();
