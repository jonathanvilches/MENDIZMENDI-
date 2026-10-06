// Pelotaris en un partido de verdad (móvil horizontal, calidad baja): cuánto se mueve el brazo cuando está quieto en
// postura (no debe repetir el gesto), la resolución de la imagen durante el partido y el tamaño de las texturas.
// Guarda unas capturas de cerca. Uso: node tools/pelota-figuras.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-figuras'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const before = await p.evaluate(() => window.__rt.renderer.getPixelRatio());
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => { window.__game.pelotaMatch.game.autoplay = true; document.querySelector('.pel-panel [data-pel-go]').click(); });
// el brazo derecho del jugador: cuánto gira de un fotograma a otro estando quieto (en la postura)
const r = await p.evaluate(async () => {
  const G = window.__game, M = G.pelotaMatch, rig = G.pelotaRig, bones = rig?.char?.bones || {};
  const arm = bones.RightArm || bones.mixamorigRightArm || Object.values(bones).find(b => /right.?arm$/i.test(b.name) || /upperarm.?r/i.test(b.name));
  const tex = []; for (const root of [rig?.char?.root]) root?.traverse(o => { if (o.isMesh && o.material?.map) tex.push(o.material.map.image?.width); });
  let last = null, lastT = 0, idleT = 0, moveIdle = 0, swingAt = -9; const line = [];
  await new Promise(res => { const t0 = performance.now(); let nextLog = 0; const tick = () => {
    const now = performance.now(), P = M.game.players.you; if (P.act === 'swing') swingAt = now;
    const still = (P.speed || 0) < 0.15 && now - swingAt > 1500 && M.game.phase !== 'intro';
    if (arm) { const q = arm.quaternion.clone(); if (last && still) { moveIdle += q.angleTo(last); idleT += (now - lastT) / 1000; } last = q; lastT = now; }
    if (now - t0 > nextLog) { nextLog += 2000; line.push([Math.round((now - t0) / 1000), window.__rt.renderer.getPixelRatio(), M.game.phase, +(window.__fps || 0).toFixed(0)]); }
    if (now - t0 < 30000) requestAnimationFrame(tick); else res(); }; tick(); });
  return { arm: arm?.name, idleSeconds: +idleT.toFixed(1), armDegPerSecIdle: idleT ? +(moveIdle / idleT * 180 / Math.PI).toFixed(1) : null, tex, line, stance: rig?.char?.idleName, score: M.game.score };
});
console.log(JSON.stringify({ before, ...r }));
await p.addStyleTag({ content: '.pel-hud, .pel-btns, .pel-call { opacity: .0 !important; }' });
for (let i = 0; i < 4; i++) { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${town}-${i}.png` }); }
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
