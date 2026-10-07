// La luna: dibuja sus fases (nueva, creciente, cuarto, gibosa, llena y las menguantes) y la de hoy.
// Uso: node tools/luna.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const out = process.argv[2] || 'entrega/luna'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 400, height: 300 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
const r = await p.evaluate(async () => {
  const { moonTex, moonPhase } = await import('/src/world/sky.js'); const ph = [0.1, 0.25, 0.38, 0.5, 0.62, 0.75, 0.9, moonPhase()];
  const c = document.createElement('canvas'); c.width = 8 * 260; c.height = 280; const g = c.getContext('2d'); g.fillStyle = '#0d1638'; g.fillRect(0, 0, c.width, c.height);
  ph.forEach((f, i) => { const t = moonTex(f); g.drawImage(t.image, i * 260 + 4, 4, 252, 252); g.fillStyle = '#fff'; g.font = '700 16px sans-serif'; g.fillText(i === 7 ? `hoy ${f.toFixed(2)}` : f.toFixed(2), i * 260 + 100, 272); });
  return { url: c.toDataURL('image/jpeg', 0.9), hoy: moonPhase() };
});
for (const h of [21.5, 1]) {
  const q = await b.newPage({ viewport: { width: 844, height: 390 } }); q.on('pageerror', e => errs.push(e.message));
  await q.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await q.goto('http://127.0.0.1:5173/?town=lesaka&q=low&weather=clear&skipintro=1&noflora', { timeout: 300000 });
  await q.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
  await q.evaluate((h) => { const G = window.__game; (G.sky || window.__sky).time = h; }, h); await q.waitForTimeout(1500);
  await q.evaluate(() => { const G = window.__game, S = G.sky || window.__sky, m = S.moon.position, P = G.player, V = m.constructor;
    const c = new V(P.pos.x, P.pos.y + 1.6, P.pos.z); G.follow.cinematic = { pos: c, look: c.clone().add(m.clone().sub(c).normalize().multiplyScalar(50)), t: 0 }; G.follow.update(0.1, P, { look: { dx: 0, dy: 0 }, zoom: 0, move: { x: 0, y: 0 } }, true); });
  await q.waitForTimeout(1500); await q.screenshot({ path: `${out}/cielo-${h}.png` }); await q.close();
}
writeFileSync(`${out}/fases.jpg`, Buffer.from(r.url.split(',')[1], 'base64')); console.log('fase de hoy', r.hoy.toFixed(3), errs.length ? errs : 'sin errores'); await b.close();
