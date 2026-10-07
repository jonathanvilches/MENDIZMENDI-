// Pantalla de campeón: la de la txapela (pelota) y la de la copa (fútbol), fotografiadas a mitad de la fiesta y con
// todo ya a la vista, en el móvil tumbado y en vertical. Uso: node tools/campeon.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/campeon'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [W, H] of [[844, 390], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  for (const kind of ['pelota', 'futbol']) {
    await p.evaluate(async (kind) => { const { showChampion } = await import('/src/ui/champion.js');
      window.__c = kind === 'pelota' ? showChampion({ kind, kicker: 'Torneo de mano · Baztan-Bidasoa', title: '¡Txapeldun!', name: 'Ane', sub: 'La txapela de Baztan-Bidasoa es tuya. Zorionak!', score: 'Final · 7 – 5', button: 'Ponerme la txapela' })
        : showChampion({ kind, kicker: 'Liga Navarra · temporada 1', title: '¡Campeones!', name: 'CD Baztan', sub: 'Aupa Elizondo! La copa de la Liga Navarra se queda en casa.', score: 'Primer título', button: 'Levantar la copa' }); }, kind);
    await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${kind}-${W}x${H}-fiesta.png` });
    await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/${kind}-${W}x${H}.png` });
    const m = await p.evaluate(() => { const bx = document.querySelector('.ch-box').getBoundingClientRect(), bt = document.querySelector('.ch-btn').getBoundingClientRect(); return { cabe: bx.top >= 0 && bx.bottom <= innerHeight && bx.right <= innerWidth, boton: bt.bottom <= innerHeight }; });
    console.log(kind, W + 'x' + H, JSON.stringify(m));
    await p.evaluate(() => document.querySelector('.ch-btn').click()); await p.waitForTimeout(700);
  }
  console.log(errs.length ? errs : 'sin errores'); await p.close();
}
await b.close();
