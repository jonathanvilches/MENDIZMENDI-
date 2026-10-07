// Escudo oficial del pueblo: el pilar de la plaza con el escudo pintado, la lectura guiada entera (preguntas y final con
// blasón, lectura e historia) y la carta en el saber «escudos». Uso: node tools/armas-pueblo.mjs [carpeta] [pueblos]
// (servidor en 5173; VW y VH cambian el tamaño de la pantalla)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/armas', towns = 'elizondo,isaba-izaba,lesaka'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await (await b.newContext({ viewport: { width: +(process.env.VW || 844), height: +(process.env.VH || 390) }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  const info = await p.evaluate(() => { const G = window.__game, T = G.townArms; if (!T) return { arms: null };
    const P = G.player, S = { x: T.mesh.position.x, z: T.mesh.position.z }, bx = T.read.x + (T.read.x - S.x) * 0.6, bz = T.read.z + (T.read.z - S.z) * 0.6;
    P.place(bx, bz, Math.atan2(S.x - bx, S.z - bz)); G.follow?.snap?.(P);
    const pos = T.mesh.position, ry = T.mesh.rotation.y, V = G.camera.position.constructor;
    G.follow.cinematic = { pos: new V(pos.x + Math.sin(ry) * 3.2, pos.y + 0.1, pos.z + Math.cos(ry) * 3.2), look: pos.clone(), t: 0 };
    G.follow.update(0.1, P, { look: { dx: 0, dy: 0 }, zoom: 0, move: { x: 0, y: 0 } }, true);
    return { arms: T.A.id, it: G.interactables().some(i => i.kind === 'armas') }; });
  console.log(town, JSON.stringify(info));
  if (!info.arms) { await p.close(); continue; }
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${town}-pilar.png` });
  await p.evaluate(() => { const G = window.__game; G.follow.cinematic = null; G.__r = G.readTownArmsAt(); });
  await p.waitForSelector('.armas .mg-card', { timeout: 20000 });
  await p.screenshot({ path: `${out}/${town}-lectura-1.png` });
  for (let steps = 0; steps < 16; steps++) {
    const st = await p.evaluate(() => { const o = document.querySelector('.armas'); if (!o) return 'cerrado'; const next = o.querySelector('.next');
      if (next.style.display !== 'none') { if (next.textContent.includes('explorando')) return 'final'; next.click(); return 'siguiente'; }
      return 'pregunta'; });
    if (st === 'final' || st === 'cerrado') break;
    if (st === 'pregunta') { await p.evaluate(() => { const o = document.querySelector('.armas'); for (const b of o.querySelectorAll('.opt:not([disabled])')) { b.click(); if (o.querySelector('.next').style.display !== 'none') break; } }); if (steps === 3) await p.screenshot({ path: `${out}/${town}-lectura-pregunta.png` }); }
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${town}-lectura-final.png` });
  const fin = await p.evaluate(() => { const o = document.querySelector('.armas'); return { h2: o?.querySelector('h2')?.textContent, badge: !!o?.querySelector('.badge'), carta: window.__game.P.cards.filter(c => c.startsWith('armas:')), cat: window.__game.P.cardCat }; });
  console.log(town, JSON.stringify(fin), errs.length ? errs.slice(0, 3) : 'sin errores');
  await p.close();
}
await b.close();
