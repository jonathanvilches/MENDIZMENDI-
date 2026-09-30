// Captura de la pared izquierda del frontón con las marcas de los cuadros (y el suelo sin números).
// Uso: node tools/cuadros.mjs <carpeta> <prefijo> [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/cuadros', tag = 'v1', town = 'lumbier'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&quality=high`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
await p.evaluate(() => { const G = window.__game; G.updateInteraction = () => {}; if (G.P?.settings) G.P.settings.timeSpeed = 0; G.applySettings?.(); G.ensureFronton?.(); });
const cam = (a, b) => p.evaluate(([a, b]) => {
  const G = window.__game, THREE = window.__THREE, f = G.fronton, y0 = f.spot.y;
  const A = f.toWorld(a[0], a[1]), Bw = f.toWorld(b[0], b[1]);
  const pos = new THREE.Vector3(A.x, y0 + a[2], A.z), look = new THREE.Vector3(Bw.x, y0 + b[2], Bw.z);
  G.player.place(A.x + 30, A.z + 30, 0);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
}, [a, b]);
await cam([3.5, 20, 1.7], [-5, 12, 2.2]); await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${tag}-pared.png`, timeout: 180000 });
await cam([1, 4, 2.2], [-5, 10, 2.4]); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${tag}-cerca.png`, timeout: 180000 });
await cam([2, 33, 5], [-1, 8, 0]); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${tag}-cancha.png`, timeout: 180000 });
await cam([1.5, 24, 5.4], [-5, 24.1, 6.3]); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${tag}-escudo.png`, timeout: 180000 });
// hoja con los escudos de todos los pueblos
const url = await p.evaluate(async () => {
  const { shieldSpec, drawShield } = await import('/src/world/heraldry.js');
  const { LEVELS } = await import('/src/data/levels.js');
  const list = [...LEVELS, { id: 'otsagabia', name: 'Otsagabia', family: 'pyrenean', relief: 'valley', landmarks: [] }];
  const cols = 8, cw = 200, ch = 250, c = document.createElement('canvas'); c.width = cols * cw; c.height = Math.ceil(list.length / cols) * ch;
  const g = c.getContext('2d'); g.fillStyle = '#6f9c8a'; g.fillRect(0, 0, c.width, c.height);
  list.forEach((d, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; drawShield(g, x + cw / 2, y + 8, 200, shieldSpec(d)); g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText(d.name.split(' /')[0], x + cw / 2, y + 232); });
  return c.toDataURL('image/png');
});
const { writeFileSync } = await import('fs');
writeFileSync(`${out}/${tag}-escudos.png`, Buffer.from(url.split(',')[1], 'base64'));
await browser.close();
