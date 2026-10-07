// Escudos de las fachadas: en un pueblo de Baztán y en uno de la Ribera, cuántas casas blasonadas hay, que cada una tenga
// sus armas encima del escudo de piedra, y la lectura guiada entera (preguntas y escudo en color). Capturas del escudo
// en la fachada y de la lectura. Uso: node tools/escudos-leer.mjs [carpeta] [pueblos]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/escudos', towns = 'elizondo,tudela'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await (await b.newContext({ viewport: { width: +(process.env.VW || 844), height: +(process.env.VH || 390) }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  const info = await p.evaluate(() => { const G = window.__game, B = G.blasones || []; if (!B.length) return { n: 0 };
    const s = B[0], P = G.player; const bx = s.read.x + Math.sin(s.ry) * 3, bz = s.read.z + Math.cos(s.ry) * 3; P.place(bx, bz, Math.atan2(s.x - bx, s.z - bz)); G.follow?.snap?.(P);
    return { n: B.length, houses: B.map(x => x.A.house + ' (' + x.A.part + ')'), it: G.interactables().some(i => i.kind === 'escudo') }; });
  console.log(town, JSON.stringify(info));
  if (!info.n) { await p.close(); continue; }
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-fachada.png` });
  // de cerca: la cámara mirando el escudo
  console.log('cerca', JSON.stringify(await p.evaluate(() => { const G = window.__game, s = G.blasones[0], T = window.__THREE || null; const pos = { x: s.x + Math.sin(s.ry) * 5, y: s.y - 0.3, z: s.z + Math.cos(s.ry) * 5 }; G.follow.cinematic = { pos: new G.camera.position.constructor(pos.x, pos.y, pos.z), look: new G.camera.position.constructor(s.x, s.y, s.z), t: 0 };
    G.follow.update(0.1, G.player, { look: { dx: 0, dy: 0 }, zoom: 0, move: { x: 0, y: 0 } }, true); return { s: [s.x, s.y, s.z].map(v => +v.toFixed(1)), mesh: s.mesh && s.mesh.position.toArray().map(v => +v.toFixed(1)) }; })));
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-escudo-cerca.png` });
  await p.evaluate(() => { window.__game.follow.cinematic = null; });
  // la lectura: se contestan bien todas las preguntas
  await p.evaluate(() => { const G = window.__game; G.__r = G.readShield(G.blasones[0]); });
  await p.waitForSelector('.escudo .mg-card', { timeout: 20000 });
  await p.screenshot({ path: `${out}/${town}-lectura-1.png` });
  let steps = 0;
  for (; steps < 16; steps++) {
    const st = await p.evaluate(() => { const o = document.querySelector('.escudo'); if (!o) return 'cerrado'; const next = o.querySelector('.next');
      if (next.style.display !== 'none') { const last = next.textContent.includes('explorando'); if (last) return 'final'; next.click(); return 'siguiente'; }
      return 'pregunta'; });
    if (st === 'final' || st === 'cerrado') break;
    if (st === 'pregunta') {
      // prueba las opciones hasta acertar (cada fallo se cuenta)
      await p.evaluate(() => { const o = document.querySelector('.escudo'); for (const b of o.querySelectorAll('.opt:not([disabled])')) { b.click(); if (o.querySelector('.next').style.display !== 'none') break; } });
      if (steps === 2) await p.screenshot({ path: `${out}/${town}-lectura-pregunta.png` });
    }
    await p.waitForTimeout(300);
  }
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${town}-lectura-final.png` });
  const fin = await p.evaluate(() => { const o = document.querySelector('.escudo'); return { blason: o?.querySelector('.es-q')?.textContent, badge: !!o?.querySelector('.badge'), cartas: window.__game.P.cards.filter(c => c.startsWith('escudo:')).length, cat: Object.values(window.__game.P.cardCat || {}).filter(x => x === 'escudos').length }; });
  console.log(town, JSON.stringify(fin), errs.length ? errs.slice(0, 3) : 'sin errores');
  await p.close();
}
await b.close();
