// Foto de la pared izquierda del frontón del pueblo, de frente, para ver dónde va el nombre y el escudo.
// Uso: node tools/pared-nombre.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pared'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
await p.evaluate(() => { const G = window.__game, g = G.fronton.court.group, V = (x, y, z) => g.localToWorld(new G.camera.position.constructor(x, y, z));
  const pos = V(G.fronton.court.labrit ? 7 : 4.5, 3.2, 17.25), look = V(-5, 5.5, 17.25);
  G.ui.hudVisible?.(false); G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
await p.waitForTimeout(12000);
await p.screenshot({ path: `${out}/${town}.jpg`, quality: 75 });
console.log(town, 'errores', JSON.stringify(errs));
await b.close();
