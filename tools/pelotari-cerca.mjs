// El pelotari de cerca durante un partido, en calidad baja (móvil) y alta, para comparar su aspecto.
// Uso: node tools/pelotari-cerca.mjs [pueblo]
import { chromium } from 'playwright-core';
const [,, town = 'lumbier'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const q of ['low', 'high']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2, isMobile: q === 'low', hasTouch: q === 'low' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=${q}&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
  await p.waitForSelector('.pel-panel', { timeout: 120000 });
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#ui > *, .pel-hud, .pel-panel, .pel-call, .pel-btns { display: none !important; }' });
  // cámara cerca del jugador
  await p.evaluate(() => { const G = window.__game, P = G.player, THREE = window.__THREE, h = P.heading;
    const pos = new THREE.Vector3(P.pos.x + Math.sin(h) * 2.2, P.pos.y + 1.3, P.pos.z + Math.cos(h) * 2.2), look = new THREE.Vector3(P.pos.x, P.pos.y + 0.9, P.pos.z);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `/tmp/claude-0/-home-user/c8a27af3-7392-5acb-ad8b-dba678c7438a/scratchpad/pel-${q}.png`, timeout: 120000 });
  console.log(q, await p.evaluate(() => { const r = window.__game.pelotaRig; let tex = null; r?.char?.root.traverse(o => { if (o.isMesh && o.material?.map) tex = (o.material.map.image?.width || 0) + ' ' + o.material.type; }); return tex; }), errs.slice(0, 2));
  await ctx.close();
}
await b.close();
