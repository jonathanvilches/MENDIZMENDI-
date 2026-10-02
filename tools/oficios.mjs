// Jornales y minijuegos de los oficios: qué trabajos hay en cada pueblo y, en uno, se juega cada minijuego simulando
// las pulsaciones (con foto a mitad de partida) para comprobar que se puede ganar.
// Uso: node tools/oficios.mjs [pueblos] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, towns = 'etxalar,olite,tudela,isaba-izaba', out = '/tmp/claude-0/oficios'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const list = towns.split(',');
for (const [ti, town] of list.entries()) {
  const p = await b.newPage({ viewport: { width: 760, height: 620 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, coins: 0 })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
  const jobs = await p.evaluate(() => { const J = window.__game.jornales; return J ? J.list.map(({ a, jobs }) => `${a.name}: ${jobs.join('/')}`).join(' · ') + ' | ' + J.suggest() : 'sin jornales'; });
  console.log(town, '→', jobs, errs.length ? 'ERRORES ' + errs.join(' | ') : '');
  if (ti === 0) {
    // cada minijuego: se lanza, se juega como lo haría una persona y se mira si se gana (cada uno guarda su resultado
    // aparte, para que no se mezclen)
    for (const game of ['milk', 'forge', 'stitch', 'shear', 'pick']) {
      await p.evaluate((game) => { (async () => { const G = window.__game, M = await import('/src/ui/oficioGames.js');
        const fn = { milk: M.milkGame, forge: M.forgeGame, stitch: M.stitchGame, shear: M.shearGame, pick: M.pickGame }[game];
        window.__res ||= {}; window.__res[game] = await fn(G.ui, {}); })(); }, game);
      await p.waitForSelector('.mg-overlay.oficio:not(.out) canvas', { timeout: 30000 });
      await p.waitForTimeout(400);
      const cv = await p.$('.mg-overlay.oficio:not(.out) canvas'), box = await cv.boundingBox(), sx = box.width / 480, sy = box.height / 360;
      const at = (x, y) => [box.x + x * sx, box.y + y * sy];
      const fin = () => p.evaluate((g) => !!window.__res?.[g], game);
      // pulsaciones directas (los clics del navegador simulado tardan demasiado)
      const tap = (sel) => p.evaluate((sel) => { document.querySelector('.mg-overlay.oficio:not(.out) ' + sel)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }, sel);
      const clickAt = (x, y) => p.evaluate(([x, y]) => { document.querySelector('.mg-overlay.oficio:not(.out) canvas')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y })); }, [x, y]);
      if (game === 'milk') { for (let i = 0; i < 22 && !(await fin()); i++) { await tap(`[data-s="${i % 2 ? 'R' : 'L'}"]`); await p.waitForTimeout(260); if (i === 8) await p.screenshot({ path: `${out}/${game}.png` }); } }
      // como una persona: sopla hasta que el hierro está naranja (sin pasarse) y entonces golpea
      if (game === 'forge') { for (let k = 0; k < 120 && !(await fin()); k++) { const st = await p.evaluate(() => document.querySelector('.mg-overlay.oficio:not(.out)')?.state?.()); if (!st) break;
        if (st.heat < 0.66) await tap('[data-a="fuelle"]'); else if (st.stun <= 0) await tap('[data-a="golpe"]'); await p.waitForTimeout(90); if (k === 14) await p.screenshot({ path: `${out}/${game}.png` }); } }
      if (game === 'stitch') { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 - Math.PI / 2; const [x, y] = at(240 + Math.cos(a) * 80 * (1 + 0.15 * Math.sin(a)), 180 + Math.sin(a) * 140); await p.mouse.click(x, y); await p.waitForTimeout(120); if (i === 6) await p.screenshot({ path: `${out}/${game}.png` }); } }
      if (game === 'shear') { await p.mouse.move(...at(100, 100)); await p.mouse.down(); for (let y = 95; y <= 260 && !(await fin()); y += 12) { for (let x = 90; x <= 350; x += 30) await p.mouse.move(...at(x, y), { steps: 1 }); for (let x = 350; x >= 90; x -= 30) await p.mouse.move(...at(x, y + 6), { steps: 1 }); if (y === 167) await p.screenshot({ path: `${out}/${game}.png` }); } await p.mouse.up(); }
      if (game === 'pick') { for (let k = 0; k < 200 && !(await fin()); k++) { const st = await p.evaluate(() => document.querySelector('.mg-overlay.oficio:not(.out)')?.state?.());
        const it = st?.items.find(i => i.ripe); if (it) await clickAt(...at(it.x, it.y)); await p.waitForTimeout(150); if (k === 5) await p.screenshot({ path: `${out}/${game}.png` }); } }
      const r = await p.waitForFunction((g) => window.__res?.[g], game, { timeout: 90000 }).then(h => h.jsonValue()).catch(() => 'sin terminar');
      console.log('  ', game, JSON.stringify(r));
      await p.waitForTimeout(1600);
    }
  }
  console.log(errs.length ? '  errores: ' + errs.slice(0, 3).join(' | ') : '  sin errores');
  await p.close();
}
await b.close();
