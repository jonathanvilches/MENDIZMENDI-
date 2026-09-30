// Qué superficie hay bajo un punto de la pantalla (para depurar colores del terreno)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://127.0.0.1:5173/?town=isaba-izaba', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const r = await p.evaluate(() => {
  const G = window.__game, hf = window.__hf, L = window.__layout, THREE = window.__THREE;
  const R = { x: -166, z: 26 }, gh = (x, z) => hf.groundHeight(x, z);
  const pos = new THREE.Vector3(R.x + 14, gh(R.x + 14, R.z + 14) + 6, R.z + 14), look = new THREE.Vector3(R.x, gh(R.x, R.z), R.z);
  const cam = G.camera; cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const out = [];
  for (const [sx, sy] of [[200, 400], [300, 600], [150, 200], [800, 600]]) {
    const v = new THREE.Vector3(sx / 1280 * 2 - 1, -(sy / 720 * 2 - 1), 0.5).unproject(cam).sub(pos).normalize();
    let t = 0; for (; t < 300; t += 0.25) { const q = pos.clone().addScaledVector(v, t); if (q.y < gh(q.x, q.z)) break; }
    const q = pos.clone().addScaledVector(v, t), i = Math.round((q.x + L.HALF) / L.CELL), j = Math.round((q.z + L.HALF) / L.CELL), k = j * L.N + i;
    out.push({ sx, sy, x: q.x.toFixed(1), z: q.z.toFixed(1), rock: hf.SURF.rock[k], dirt: hf.SURF.dirt[k], street: hf.SURF.street[k], forest: hf.SURF.forest[k], grass: hf.SURF.grass[k] });
  }
  return out;
});
console.log(JSON.stringify(r, null, 0));
await b.close();
