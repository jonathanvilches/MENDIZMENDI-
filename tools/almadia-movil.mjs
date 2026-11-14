// La bajada en almadía en el móvil tumbado (o en otro tamaño): fotos por el camino y, en cada una, lo que mide cada panel y
// si alguno pisa a otro. TAM=932x430 MOVIL=1; PILOTO=1 la lleva sola (a 2,5 veces el paso); si no, nadie toca nada
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/x'; fs.mkdirSync(out, { recursive: true });
const [W, H] = (process.env.TAM || '932x430').split('x').map(Number), movil = process.env.MOVIL !== '0';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: movil, hasTouch: movil, deviceScaleFactor: 1 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=burgui-burgi&q=low&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 500000 });
await p.waitForTimeout(1500);
const mide = () => p.evaluate(() => { const R = (q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width < 2 || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 ? null : [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const P = { barra: R('#tl .mfila'), estado: R('.alm-estado'), cuento: R('.alm-cuento.dentro'), mini: R('#mini'), aviso: R('#lane #toast.on'), accion: R('#cAct'), bajar: R('#cBaja, .cbaja, [data-baja]'), mg: R('#mg:not(.hidden)') };
  const pisa = (a, b) => a && b && a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1, ks = Object.keys(P), choques = [];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (pisa(P[ks[i]], P[ks[j]])) choques.push(ks[i] + '×' + ks[j]);
  return { P, choques, guia: document.querySelector('.alm-guia')?.className + ' | ' + document.querySelector('.alm-guia b')?.textContent + ' | ' + document.querySelector('.alm-guia small')?.textContent, plega: document.querySelector('#tl')?.className }; });
await p.screenshot({ path: `${out}/0-pueblo.png` }); console.log('pueblo', JSON.stringify(await mide()));
const ini = await p.evaluate(async (piloto) => {
  window.__autoWin = true;
  const G = window.__game, mod = await import('/src/game/almadia.js');
  const M = G.missions.find(m => m.type === 'race' && m.m.kind === 'almadia');
  const pr = mod.jugarAlmadia(G, M, async () => {});
  await new Promise(r => setTimeout(r, 400));
  const A = G.almadia; if (!A) return { sinAlmadia: true };
  const C = A.C, R = A.R, orig = A.update.bind(A);
  const objetivo = () => { const sb = A.s;
    if (Math.abs(sb - R.presa.s) < 60) return A.uPortillo; if (A.fam && Math.abs(sb - A.sPuente) < 50) return A.uOjo;
    let u = 0; for (const o of A.obst) { if (o.s < sb - 22 || o.s > sb + 34) continue; u = o.u > 0 ? Math.min(u, o.u - o.r - 2.8) : Math.max(u, o.u + o.r + 2.8); } return u; };
  if (piloto) A.update = (dt, input, P) => { const e = objetivo() - A.u; orig(dt * 2.5, { move: { x: Math.max(-1, Math.min(1, e * 0.9 - A.vu * 0.3)) * A.derecha(), y: 0 }, consume() {} }, P); };
  else A.update = (dt, input, P) => orig(dt * 2.5, input, P);
  window.__pr = pr.then(r => (window.__fin = r));
  return { s: A.s, s0: A.s0, sFin: A.sFin, presa: R.presa.s, puente: A.sPuente, obst: A.obst.length, marcas: A.marcas.map(Math.round), uPortillo: +A.uPortillo.toFixed(1), uOjo: +A.uOjo.toFixed(1), half: +C.half.toFixed(1), flechas: A.flechas.P.length, der: A.ladoDe(1) };
}, process.env.PILOTO === '1');
console.log(JSON.stringify(ini));
const momentos = [['salida', ini.s + 4], ['cuento', ini.marcas[1] + 25], ['antes-presa', ini.presa - 60], ['presa', ini.presa + 2], ['puente', ini.puente - 25], ['llegada', ini.sFin - 3]];
for (const [k, s] of momentos) {
  const t0 = Date.now();
  while (Date.now() - t0 < 600000) { const st = await p.evaluate(() => ({ s: window.__game.almadia?.s ?? 1e9, fin: !!window.__fin })); if (st.s >= s || st.fin) break; await p.waitForTimeout(300); }
  const st = await p.evaluate(() => { const A = window.__game.almadia; return A ? { s: Math.round(A.s), u: +A.u.toFixed(1), v: +A.v.toFixed(1), t: +A.t.toFixed(0), golpes: A.golpes, portillo: !!A.portillo, ojo: !!A.ojo } : { fin: window.__fin }; });
  await p.screenshot({ path: `${out}/${k}.png` }); console.log(k, JSON.stringify(st), JSON.stringify(await mide()));
}
await p.waitForFunction(() => window.__fin, null, { timeout: 300000 }).catch(() => {});
console.log('fin', JSON.stringify(await p.evaluate(() => ({ fin: window.__fin, hud: !!document.querySelector('.alm-hud'), clase: document.body.classList.contains('alm-on'), flechas: !!window.__game.scene.getObjectByName('flechas de la almadía') }))));
console.log('errores', JSON.stringify(errs.slice(0, 6)));
await b.close();
