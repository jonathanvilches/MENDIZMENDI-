// La final en el frontón Labrit: la entrada de «Gran final» (pelota/granFinal.js) en cuatro momentos, el sorteo, el partido
// dentro y vistas de la grada y del marcador.
// Uso: node tools/labrit-final.mjs [pueblo] [carpeta] [hora]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/labrit', hora = '23'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.text().startsWith('labrit')) console.log(m.text()); });
await p.addInitScript(() => localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora&t=${hora}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(4000);
await p.evaluate(() => { const G = window.__game, L = window.__L = G.fronton?.court.labrit ? G.fronton : G.labritVenue(); console.log('labrit', G.fronton?.court.labrit ? 'en el pueblo' : 'aparte', JSON.stringify(L.spot)); window.__vs = true; window.__final = true; window.__intro = G.venuePrep(L); });
await p.evaluate(async () => { await window.__intro; const G = window.__game, L = window.__L; window.__res = L.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, { target: 7, returnTo: G.fronton, rivalName: 'Unai (Lesaka)', comp: 'Manomanista · Final', final: true, youBonus: 6, rivalBonus: 3, rivalStats: { vel: 4, pot: 4, man: 3, rem: 4, def: 3, fon: 4 }, intro: (m) => import('/src/game/llegadas.js').then(X => X.llegaFronton(G, L, m)) }); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
// (la entrada de la final: el título, la txapela, las cartas y el confeti; y que se va sola hacia el sorteo)
await p.waitForSelector('.gf', { timeout: 60000 });
const t0 = Date.now();
for (const [n, t] of [['final-titulo', 600], ['final-txapela', 1500], ['final-cartas', 2600], ['final-confeti', 4200]]) { await p.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await p.screenshot({ path: `${out}/${n}.jpg`, quality: 75 }); }
await p.waitForFunction(() => !document.querySelector('.gf'), null, { timeout: 30000 });
console.log('entrada', `${((Date.now() - t0) / 1000).toFixed(1)} s`, await p.evaluate(() => document.querySelector('.pel-toss') ? 'al sorteo' : 'sin sorteo'));
await p.evaluate(() => document.querySelector('.pel-toss-go')?.click());
await p.waitForTimeout(15000); await p.screenshot({ path: `${out}/juego.jpg`, quality: 70 });
// (lo que cuesta dibujar el Labrit lleno: llamadas de dibujo y triángulos de una imagen, y cuántos espectadores hay)
console.log('dibujo', await p.evaluate(() => { const G = window.__game, i = G.renderer?.info?.render || G.rt?.renderer?.info?.render || {}; let gente = 0;
  G.scene.traverse(o => { if (o.isInstancedMesh && o.material?.customProgramCacheKey?.() === 'crowd3d-fill' || (o.isInstancedMesh && o.parent?.tick)) gente += o.count; });
  return JSON.stringify({ llamadas: i.calls, triangulos: i.triangles, figuras3d: gente }); }));
const shots = [['foto1', [1.5, 1.7, 34], [3, 5, 0]], ['butacas', [6.5, 1.6, 20], [12, 1.5, 12]], ['foto3', [16, 7, 28], [-3, 2, 10]], ['tarima', [7.4, 1.3, 30], [8.6, 0, 18]], ['esquina', [40, 8, 68], [12, 7, 30]], ['ciudad', [-60, 40, 90], [10, 5, 20]]];
for (const [name, pos, look] of shots) {
  await p.evaluate(([pos, look]) => { const G = window.__game, C = window.__L.court.group, cam = G.camera, V = cam.position.constructor;
    const v = new V(...pos), l = new V(...look); C.localToWorld(v); C.localToWorld(l);
    if (!window.__tick0) { window.__tick0 = G.pelotaTick; G.pelotaTick = (dt) => { window.__tick0(dt); window.__camFix?.(); }; }
    window.__camFix = () => { cam.position.copy(v); cam.lookAt(l); cam.updateMatrixWorld(); }; }, [pos, look]);
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${name}.jpg`, quality: 70 });
}
await p.evaluate(() => { window.__camFix = null; window.__game.pelotaMatch?.exit(true); });
await p.waitForTimeout(3000);
console.log('vuelta', await p.evaluate(() => { const G = window.__game, P = G.player.pos, e = G.fronton.entry; return JSON.stringify({ modo: G.mode, distEntrada: Math.hypot(P.x - e.x, P.z - e.z).toFixed(1), y: P.y.toFixed(1) }); }));
console.log('errores', JSON.stringify(errs));
await b.close();
