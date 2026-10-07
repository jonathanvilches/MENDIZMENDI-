// Puerta de los castillos: fotos desde fuera y desde el patio, para ver si los muros se cruzan con el paso.
// Uso: node tools/castillo-puerta.mjs <carpeta> [pueblos...]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/castillos', ...ts] = process.argv;
const towns = ts.length ? ts : ['olite', 'marcilla', 'cortes', 'javier'];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns) {
  const p = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  p.on('pageerror', e => console.log('PAGEERROR', town, e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await p.waitForTimeout(6000); await p.evaluate(() => document.querySelectorAll('.town-intro, .intro, .loading, #loading').forEach(e => e.remove()));
  const views = [['fuera', 16, 4, 0], ['paso', 3, 2.2, 0], ['dentro', -6, 2.4, 1]];
  for (const [n, dist, hy, back] of views) {
    await p.evaluate(([dist, hy, back]) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight, P = window.__layout.PLACES;
      document.querySelectorAll('.mg-overlay').forEach(o => o.remove());
      const lm = P.landmarks.find(l => l.kind === 'castle'), ry = Math.atan2(P.plaza.x - lm.x, P.plaza.z - lm.z), dx = Math.sin(ry), dz = Math.cos(ry);
      const half = lm.style === 'javier' ? 9 : 11, gx = lm.x + dx * half, gz = lm.z + dz * half;
      const cx = gx + dx * dist, cz = gz + dz * dist, y = gh(cx, cz);
      const pos = new T.Vector3(cx, y + hy, cz), lk = back ? new T.Vector3(gx + dx * 8, y + 2, gz + dz * 8) : new T.Vector3(lm.x, y + 2.5, lm.z);
      G.player.place(cx + dx * 2, cz + dz * 2, 0); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, [dist, hy, back]);
    await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${town}-${n}.jpg`, quality: 70, timeout: 180000 }); console.log('foto', town, n);
  }
  console.log('errores', town, await p.evaluate(() => JSON.stringify(window.__errors || [])));
  await p.close();
}
await browser.close();
