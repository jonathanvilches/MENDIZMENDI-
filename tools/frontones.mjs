// Capturas del frontón de cada pueblo (por fuera y desde donde se juega) para revisar su aspecto: frontis, paredes,
// suelo, colchón y cubierta. Uso: node tools/frontones.mjs <pueblo,pueblo…> <carpeta>   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, list = 'elizondo,pamplona,isaba-izaba,tudela', out = 'entrega/frontones'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of list.split(',')) {
  const p = await browser.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); } catch (e) { } });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=${process.env.Q || 'low'}&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__game.fronton, null, { timeout: 500000 });
  await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper, #minimap { display: none !important; }' });
  await p.evaluate(() => { window.__game.updateInteraction = () => {}; });
  const views = { fuera: [24, 9, 48, 1, 4, 14], dentro: [1.2, 4.8, 33, 0, 2, 2], colchon: [2, 1.6, 8, 0, 0.8, 0] };
  for (const [k, [x, y, z, lx, ly, lz]] of Object.entries(views)) {
    await p.evaluate(([x, y, z, lx, ly, lz]) => {
      const G = window.__game, F = G.fronton, THREE = window.__THREE, y0 = F.spot.y;
      const a = F.toWorld(x, z), b = F.toWorld(lx, lz), pos = new THREE.Vector3(a.x, y0 + y, a.z), look = new THREE.Vector3(b.x, y0 + ly, b.z);
      const e = F.toWorld(7, 40); G.player.place(e.x, e.z, 0);
      G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
      if (G.rt?.sky) { G.rt.sky.time = 11; G.rt.sky.speed = 0; }
    }, [x, y, z, lx, ly, lz]);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/${town}-${k}.png` });
  }
  console.log(town, errs.length ? errs.slice(0, 3).join(' | ') : 'sin errores');
  await p.close();
}
await browser.close();
