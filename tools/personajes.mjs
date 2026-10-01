// Recorre una misión de personaje: recuerdo en la plaza, historia, placa con pregunta y «su huella hoy».
// Uso: node tools/personajes.mjs <pueblo> <carpeta> [ancho x alto]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'tafalla', out = 'entrega/personajes-navarra', size = '1280x720'] = process.argv;
mkdirSync(out, { recursive: true });
const [w, h] = size.split('x').map(Number), mobile = w < 900;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0;
const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${town}-${size}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); };
console.log(await p.evaluate(() => window.__game.missions.map(M => M.type + ':' + M.title).join(' | ')));
// vista del recuerdo con su guía
await p.evaluate(() => {
  const G = window.__game, THREE = window.__THREE, M = G.missions.find(M => M.type === 'figure'), o = M.memo;
  const y = window.__hf.groundHeight(o.x, o.z), dx = M.host.pos.x - o.x, dz = M.host.pos.z - o.z;
  const ry = o.obj.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry);
  G.player.place(o.x + fx * 3 + fz * 1.5, o.z + fz * 3 - fx * 1.5, 0);
  const pos = new THREE.Vector3(o.x + fx * 5.5 - fz * 2, y + 2.4, o.z + fz * 5.5 + fx * 2), look = new THREE.Vector3(o.x + dx * 0.3, y + 1.5, o.z + dz * 0.3);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
});
await p.waitForTimeout(2500); await shot('recuerdo');
await p.evaluate(() => { const G = window.__game; G.follow.cinematic = null; const M = G.missions.find(M => M.type === 'figure'); G.say = async () => {}; window.__done = false; G.dialog(M, M.host).then(() => G.doMemorial(M)).then(() => window.__done = true); });
for (let i = 0; i < 20; i++) {
  await p.waitForTimeout(900);
  const kind = await p.evaluate(() => { const q = (c) => document.querySelector('.mg-overlay:not(.out)' + c); return q('.choice') ? 'choice' : q(' button') ? 'card' : window.__done ? 'fin' : 'nada'; });
  if (kind === 'fin') break;
  if (kind === 'nada') continue;
  await shot(kind);
  if (kind === 'card') await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button').click());
  else { await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'figure'), want = M.fig.q.options[M.fig.q.answer]; [...document.querySelectorAll('.opt')].find(b => b.textContent === want).click(); }); await shot('choice-ok'); await p.evaluate(() => document.querySelector('.choice .next').click()); }
}
console.log('fin:', await p.evaluate(() => window.__done), await p.evaluate(() => window.__game.missions.find(M => M.type === 'figure').done));
await browser.close();
