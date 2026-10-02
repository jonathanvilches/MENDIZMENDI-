// Jornales y minijuegos de los oficios: qué trabajos hay en cada pueblo y, en uno, se juega cada minijuego 3D simulando
// las pulsaciones (con foto a mitad de partida) para comprobar que se puede ganar y que luego vuelve el pueblo.
// Uso: node tools/oficios.mjs [pueblos] [carpeta]   (GAMES=forgeGame,timing3d:chop para probar solo esos)
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
    // cada minijuego 3D (con el renderer del juego: el pueblo se pausa y vuelve): se lanza, se juega como lo haría una
    // persona leyendo su estado (state()) y se mira si se gana; al final, el pueblo tiene que volver a verse
    const G3 = process.env.GAMES ? process.env.GAMES.split(',') : ['milkGame', 'forgeGame', 'stitchGame', 'shearGame', 'pickGame', 'timing3d:chop', 'mash3d:lift'];
    for (const spec of G3) {
      const [game, art] = spec.split(':');
      await p.evaluate(([game, art]) => { (async () => { const G = window.__game, M = await import('/src/ui/mini3d/index.js');
        window.__res ||= {}; window.__res[game + (art || '')] = await M[game](G.ui, art ? { art, title: 'Prueba', hint: 'Prueba', rounds: 4, need: 3, zone: 0.22, speed: 0.6, seconds: 7, goal: 28 } : {}); })(); }, [game, art]);
      const key = game + (art || '');
      await p.waitForSelector('.mg3d:not(.loading):not(.out)', { timeout: 120000 });
      await p.waitForTimeout(600);
      const t0 = Date.now(), fin = () => p.evaluate((k) => !!window.__res?.[k], key).then(f => f || Date.now() - t0 > 240000);
      const st = () => p.evaluate(() => document.querySelector('.mg3d:not(.out)')?.state?.());
      const tap = (sel) => p.evaluate((sel) => { document.querySelector('.mg3d:not(.out) ' + sel)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }, sel);
      const touch = (x, y, type = 'pointerdown') => p.evaluate(([x, y, type]) => { document.querySelector('.mg3d:not(.out) .m3-cap')?.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 })); }, [x, y, type]);
      let shot = false; const snap = async () => { if (!shot) { shot = true; await p.screenshot({ path: `${out}/${key}.png` }); } };
      if (game === 'milkGame') for (let i = 0; !(await fin()); i++) { await tap(`[data-s="${i % 2 ? 'R' : 'L'}"]`); await p.waitForTimeout(320); if (i === 8) await snap(); }
      if (game === 'forgeGame') for (let k = 0; !(await fin()); k++) { const s = await st(); if (!s) break; if (s.heat < 0.66) await tap('[data-a="fuelle"]'); else if (s.stun <= 0) await tap('[data-a="golpe"]'); await p.waitForTimeout(90); if (k === 14) await snap(); }
      if (game === 'stitchGame') for (let i = 0; !(await fin()); i++) { const s = await st(); if (!s?.next) break; await touch(s.next.x, s.next.y); await p.waitForTimeout(150); if (i === 6) await snap(); }
      if (game === 'shearGame') for (let k = 0; !(await fin()); k++) { const s = await st(); const q = s?.left?.[0]; if (!q) break; await touch(q.x, q.y); await touch(q.x + 6, q.y + 4, 'pointermove'); await touch(q.x + 6, q.y + 4, 'pointerup'); await p.waitForTimeout(60); if (k === 20) await snap(); }
      if (game === 'pickGame') for (let k = 0; !(await fin()); k++) { const s = await st(); const it = s?.items.find(i => i.ripe); if (it) await touch(it.x, it.y); await p.waitForTimeout(150); if (k === 5) await snap(); }
      if (game === 'timing3d') for (let k = 0; !(await fin()); k++) { const s = await st(); if (s && s.locked <= 0 && Math.abs(s.pos - s.zc) < s.zone * 0.3) { await tap('[data-go]'); if (s.hits === 1) await snap(); } await p.waitForTimeout(25); }
      if (game === 'mash3d') for (let k = 0; !(await fin()); k++) { await tap('[data-go]'); await p.waitForTimeout(60); if (k === 14) await snap(); }
      const r = await p.waitForFunction((k) => window.__res?.[k], key, { timeout: 120000 }).then(h => h.jsonValue()).catch(() => 'sin terminar');
      // (el cierre tiene una pequeña animación: en este navegador de pruebas, sin tarjeta gráfica, puede tardar)
      await p.waitForFunction(() => !window.__game.altScene && !document.querySelector('.mg3d'), null, { timeout: 8000 }).catch(() => {});
      const back = await p.evaluate(() => ({ alt: !!window.__game.altScene, hud: !!document.querySelector('.mg3d') }));
      console.log('  ', key, JSON.stringify(r), back.alt || back.hud ? 'NO VUELVE AL PUEBLO ' + JSON.stringify(back) : 'vuelve al pueblo');
    }
    await p.screenshot({ path: `${out}/pueblo-despues.png` });
  }
  console.log(errs.length ? '  errores: ' + errs.slice(0, 3).join(' | ') : '  sin errores');
  await p.close();
}
await b.close();
