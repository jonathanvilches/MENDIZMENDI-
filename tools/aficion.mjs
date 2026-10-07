// La afición: El Sadar (banderas, bufandas en alto al celebrar y la ola) y la grada de un frontón con pañuelos.
// Uso: node tools/aficion.mjs [carpeta] [pueblo del frontón]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/aficion', town = 'lumbier'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
{ const page = await b.newPage({ viewport: { width: 844, height: 390 } }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&auto&notuto&quality=low', { timeout: 300000 });
  await page.waitForFunction(() => window.__futbol, null, { timeout: 300000 }); await page.waitForTimeout(8000);
  await page.evaluate(() => { const m = window.__futbol; m.cam = () => {}; });
  const cam = (p, l) => page.evaluate(([p, l]) => { const c = window.__futbol.camera; c.fov = 50; c.position.set(...p); c.lookAt(...l); c.updateProjectionMatrix(); }, [p, l]);
  // (la escena se mueve con el tiempo del partido; para la ola se adelanta el reloj del público)
  const tickAt = (t, ex, cheer) => page.evaluate(([t, ex, cheer]) => { const f = window.__futbol.field; f.cheer(cheer); window.__futbol.paused = true; for (let i = 0; i < 40; i++) f.tick(0.016, t + i * 0.016, window.__futbol.camera, ex, 0); }, [t, ex, cheer]);
  await cam([-38, 3, -10], [-55, 1, 0]); await tickAt(5, 0.3, false); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/sadar-normal.png` });
  await tickAt(6, 1, true); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/sadar-gol.png` });
  await cam([6, 5, 24], [-4, 7, 46]); await tickAt(8, 1, true); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/sadar-cerca.png` });
  await cam([0, 14, 52], [0, 0, 0]); await page.evaluate(() => { window.__futbol.t = 55.5; }); await tickAt(55.5, 0.3, false); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/sadar-ola.png` });
  await page.close(); }
{ const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
  await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 120000 });
  await p.evaluate(() => { window.__game.pelotaMatch.game.autoplay = true; document.querySelector('.pel-panel [data-pel-go]').click(); });
  await p.waitForTimeout(6000); await p.screenshot({ path: `${out}/fronton-partido.png` });
  // la grada de cerca, al marcar un tanto (los pañuelos se agitan)
  await p.evaluate(() => { const G = window.__game, C = G.fronton.court, sp = C.standSpots; const a = sp[Math.floor(sp.length / 2)];
    const c = G.camera, V = c.position.constructor, w = C.group.localToWorld(new V(a[0], a[1], a[2]));
    const fw = C.group.localToWorld(new V(0, 0, a[2])); const dx = fw.x - w.x, dz = fw.z - w.z, L = Math.hypot(dx, dz);
    const M = G.pelotaMatch, draw = M.draw.bind(M);
    M.draw = (dt) => { draw(dt); c.position.set(w.x + dx / L * 7, w.y + 2.4, w.z + dz / L * 7); c.lookAt(w.x, w.y + 1, w.z); };
    M.o.onEvent({ type: 'call', winner: 'you' }); });
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/fronton-grada.png` });
  await p.close(); }
console.log(errs.length ? errs.slice(0, 4) : 'sin errores'); await b.close();
