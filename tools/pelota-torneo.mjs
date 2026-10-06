// Campeonato de pelota desde Campeonatos: se elige un frontón y todo el torneo (cuartos, semifinal y final) se juega en
// ese frontón, sin mandarte a otro pueblo. Uso: node tools/pelota-torneo.mjs [pueblo] [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'tudela', out = 'entrega/pelota-torneo'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.removeItem('mendimendiz-torneo-v1'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', last: 'lesaka', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto('http://127.0.0.1:5173/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate((t) => document.querySelector(`[data-fronton="${t}"]`).click(), town); await p.waitForTimeout(300);
const kicker = await p.evaluate(() => document.querySelector('.sport .kicker')?.textContent);
await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root [data-a="torneo"]'), null, { timeout: 600000 });
const loaded = await p.evaluate(() => window.__game?.def?.id), menu = await p.evaluate(() => document.querySelector('.lg-root').innerText);
await p.screenshot({ path: `${out}/1-menu.png` });
await p.evaluate(() => { window.__autoWin = true; document.querySelector('.lg-root [data-a="torneo"]').click(); });
const rounds = [];
for (let r = 0; r < 4; r++) {
  try { await p.waitForFunction(() => document.querySelector('.lg-root [data-a]'), null, { timeout: 60000 }); } catch (e) { await p.screenshot({ path: `${out}/atasco.png` }); console.log('ATASCO', r, JSON.stringify(await p.evaluate(() => ({ mode: window.__game?.mode, dlg: !!document.getElementById('dialog'), dlgTxt: document.getElementById('dialog')?.innerText?.slice(0, 120), lg: !!document.querySelector('.lg-root'), pel: !!document.querySelector('.pel-panel'), busy: window.__game?.ui?.busy })))); break; }
  const txt = await p.evaluate(() => document.querySelector('.lg-root').innerText), acts = await p.evaluate(() => [...document.querySelectorAll('.lg-root [data-a]')].map(x => x.dataset.a));
  rounds.push({ venue: (txt.match(/FRONTÓN DE ([^\n]+)/) || [])[1] || null, acts });
  if (r === 0) await p.screenshot({ path: `${out}/2-cuadro.png` });
  if (!acts.includes('play')) break;
  await p.evaluate(() => document.querySelector('.lg-root [data-a="play"]').click());
  // (tras el partido, el pelotari dice el resultado: se pasa el diálogo)
  for (let k = 0; k < 40; k++) { await p.waitForTimeout(400); const st = await p.evaluate(() => document.getElementById('dialog') ? 'dlg' : document.querySelector('.lg-root [data-a]') ? 'panel' : ''); if (st === 'panel') break; if (st === 'dlg') await p.keyboard.press('Space'); }
}
await p.screenshot({ path: `${out}/3-final.png` });
console.log(JSON.stringify({ kicker, loaded, menuAqui: /aquí/.test(menu), rounds, travel: rounds.some(r => r.acts.includes('travel')) }), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
