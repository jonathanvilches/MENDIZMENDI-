// Vistas fijas del escenario del encierro (sin correr): la Estafeta a la altura de un corredor, el callejón, la
// entrada a la plaza, el túnel y el ruedo, y la manada de lado. Para revisar el aspecto de calles y plaza.
// Uso: node tools/encierro-vistas.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || '/tmp/claude-0/encierro-vistas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173'}/?town=pamplona&q=high&weather=clear`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.m.kind === 'encierro'); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.say = async () => {}; G.dialog(M, M.host); });
await p.waitForFunction(() => window.__game.mode === 'encierro' && window.__game.encierro?.bulls?.length, null, { timeout: 180000 });
await p.addStyleTag({ content: '#ui > *, .enc-hud, .mg-overlay { display: none !important; }' });
const info = await p.evaluate(async () => { const G = window.__game, E = G.encierro; G.altUpdate = () => { E.place?.(); };
  const m = await import('/src/game/encierro.js'); return { L: m.ENC?.L, gate: m.ENC?.GATE }; });
const views = [
  ['calle', [1.2, 1.7, -30], [-0.5, 2.2, -70]],
  ['calle-arriba', [0, 9, -60], [0, 2, -110]],
  ['callejon', [0.6, 1.7, -236], [0, 1.5, -262]],
  ['entrada', [0, 3.2, -240], [0, 3, -266]],
  ['tunel', [0, 1.6, -262], [0, 1.6, -280]],
  ['ruedo', [6, 2, -285], [0, 2, -310]],
  ['manada', [3, 1.5, 0], [0, 1, 10]],
];
for (const [n, pos, look] of views) {
  await p.evaluate(([pos, look]) => { const E = window.__game.encierro; E.camera.position.set(...pos); E.camera.lookAt(...look); E.camLock = true; }, [pos, look]);
  await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${n}.png`, timeout: 180000 }); console.log('foto', n);
}
await b.close();
