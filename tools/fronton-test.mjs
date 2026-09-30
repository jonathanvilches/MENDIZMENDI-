// Frontón mejorado: nombre del pueblo en el frontis, público que llega a la grada y aplaude los tantos.
// Uso: node tools/fronton-test.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/fronton'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const shot = (n) => p.screenshot({ path: `${out}/${town}-${n}.png`, timeout: 180000 });
const cine = (lx, ly, lz, tx, ty, tz) => p.evaluate(([lx, ly, lz, tx, ty, tz]) => { const G = window.__game, THREE = window.__THREE, f = G.fronton;
  const a = f.toWorld(lx, lz), t = f.toWorld(tx, tz); a.y = f.spot.y + ly; t.y = f.spot.y + ty;
  G.follow.cinematic = { pos: a, look: t, t: 0, lookCur: t.clone() }; G.camera.position.copy(a); G.camera.lookAt(t); }, [lx, ly, lz, tx, ty, tz]);
// 1) el frontis con el nombre, visto desde la cancha, y la trasera desde la calle
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt { display: none !important; }' });
await cine(2, 3.2, 26, 0, 5.5, 0); await p.waitForTimeout(3000); await shot('1-frontis');
await cine(-2, 3, -22, 0, 5.5, 0); await p.waitForTimeout(2500); await shot('2-trasera');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
// 2) partido: el público llega (se adelanta su paseo) y se sienta en la grada
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel', { timeout: 60000 });
await p.evaluate(() => { const c = window.__game.pelotaCrowd; for (let i = 0; i < 400; i++) c.update(0.05); });
console.log('público', await p.evaluate(() => window.__game.pelotaCrowd.people.map(q => q.phase).join(',')));
await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1200);
await cine(20, 4.5, 34, 9, 1.2, 14); await p.waitForTimeout(2500); await shot('3-grada');
// 3) un tanto: se simula el juego hasta el aviso del juez y se captura el aplauso
await p.evaluate(() => { const G = window.__game, m = G.pelotaMatch; m.game.autoplay = true; for (let i = 0; i < 40 * 30 && m.active; i++) { m.update(1 / 30); if (document.querySelector('.pel-call.on')) break; } });
await cine(20, 4.5, 34, 9, 1.2, 14);
for (let k = 0; k < 3; k++) { await p.waitForTimeout(350); await shot('4-aplauso-' + k); }
console.log('gestos', await p.evaluate(() => window.__game.pelotaCrowd.people.map(q => (q.a.clap > 0 ? 'palmas' : q.a.cheer > 0 ? 'salta' : '-')).join(',')));
// 4) vista normal de juego durante el partido
await p.evaluate(() => { window.__game.follow.cinematic = null; });
await p.waitForTimeout(1500); await shot('5-partido');
console.log(errs.join('\n') || 'sin errores');
await b.close();
