// Ventanas vistas desde varios ángulos de cámara, para comprobar si los cristales dan reflejos.
// Uso: node tools/ventanas.mjs <carpeta> <prefijo>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/ventanas', tag = 'antes'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://127.0.0.1:5173/?town=lumbier', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
// junto a la plaza, a media mañana, con la cámara girando alrededor del jugador
await p.evaluate(() => { const G = window.__game, P = window.__layout?.PLACES?.plaza || { x: 0, z: 0 }; G.teleport(P.x + 6, P.z + 10); G.state && (G.state.time = 10.5); });
await p.waitForTimeout(3000);
let i = 0;
for (const yaw of [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4]) {
  await p.evaluate((y) => { const G = window.__game; G.player.heading = y; G.follow.snap(G.player); }, yaw);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${out}/${tag}-${String(i++).padStart(2, '0')}.png`, timeout: 180000 });
}
await browser.close();
