// El avatar corriendo en curva: comprueba que se inclina hacia dentro y que la cabeza se adelanta al giro
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/avatar', tag = 'giro'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://127.0.0.1:5173/?town=isaba-izaba', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt { display: none !important; }' });
await p.evaluate(() => { const G = window.__game; G.updateInteraction = () => {}; G.player.place(-142, 8, 0); G.follow.snap(G.player); });
// corre y gira a la izquierda: la cámara (cine) se coloca delante del personaje y lo sigue
const follow = () => p.evaluate(() => { const G = window.__game, THREE = window.__THREE, pl = G.player.pos, h = G.player.heading;
  const pos = new THREE.Vector3(pl.x + Math.sin(h) * 4.2, pl.y + 1.3, pl.z + Math.cos(h) * 4.2), look = new THREE.Vector3(pl.x, pl.y + 0.9, pl.z);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
await p.evaluate(() => { const G = window.__game; G.input.keys.add('w'); G.input.runToggle = true; });
await p.waitForTimeout(1200);
await p.evaluate(() => { window.__game.input.keys.add('a'); });
for (let k = 0; k < 4; k++) { await follow(); await p.waitForTimeout(160); const r = await p.evaluate(() => { const c = window.__game.player.rig; return `roll ${c.roll?.toFixed(3)} pitch ${c.pitch?.toFixed(3)} cabeza ${c.headYaw?.toFixed(3)} giro ${window.__game.player.turnRate.toFixed(2)}`; }); console.log(r); await p.screenshot({ path: `${out}/${tag}-${k}.png`, timeout: 180000 }); }
await b.close();
