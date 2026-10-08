// La cámara dentro de la copa de un árbol (como al subir y bajar la cámara junto a los árboles de un paseo): fotos con
// la cámara en el centro de la copa y algo más fuera, mirando al jugador. Uso: node tools/copa-camara.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/copa'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 30); k(); }), n);
const info = await p.evaluate(async () => { const G = window.__game, P = G.player.pos, M = new G.camera.matrix.constructor(), V = G.camera.position.constructor;
  // los árboles de cerca: instancias de las mallas «…-cerca»
  const TREES = []; G.rt.scene.traverse(o => { if (o.isInstancedMesh && /^(beech|oak|chestnut|apple|poplar|olive)-cerca$/.test(o.name)) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); const v = new V().setFromMatrixPosition(M); TREES.push({ x: v.x, y: v.y, z: v.z, s: Math.hypot(M.elements[0], M.elements[1], M.elements[2]), type: o.name }); } });
  let t = null, bd = 1e9; for (const s of TREES) { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < bd && d > 4) { bd = d; t = s; } }
  if (!t) return null; window.__tree = t; G.player.place(t.x + 7, t.z + 2, 0); G.follow.snap(G.player); G.follow.update = () => {}; return { x: t.x, z: t.z, s: t.s, type: t.type, n: TREES.length }; });
console.log('árbol', JSON.stringify(info));
for (const [i, off] of [[0, 0], [1, 1.5], [2, 2.6], [3, 3.6]].entries()) {
  await p.evaluate((o) => { const G = window.__game, t = window.__tree, c = G.camera, P = G.player.pos; c.position.set(t.x + o, t.y + 4 * t.s, t.z + 0.5); c.lookAt(P.x, P.y + 1, P.z); c.updateMatrixWorld(); }, off[1]);
  await frames(6); await p.screenshot({ path: `${out}/${town}-copa${i}.png` });
}
console.log('errores', JSON.stringify(errs));
await b.close();
