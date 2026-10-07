// Cámara del frontón cuando la pelota va al fondo: con el rival detrás de ti, tiene que verse cómo y hacia dónde golpea.
// Coloca a los dos (tú delante, el rival al fondo) y mide si el rival sale dentro de la imagen. Uso: node tools/pelota-camara.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/pelota-camara', town = 'lumbier'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.BASE || 'http://127.0.0.1:5173/'}?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click()); await p.waitForTimeout(3000);
let bad = 0;
for (const [name, yz, rz] of [['rival-al-fondo', 10, 26], ['rival-delante', 22, 13]]) {
  // los dos quietos en su sitio y la pelota hacia el rival (le toca a él)
  await p.evaluate(([yz, rz]) => { const g = window.__game.pelotaMatch.game; window.__fix = () => { Object.assign(g.players.you, { x: 1, z: yz, vx: 0, vz: 0 }); Object.assign(g.players.rival, { x: -1.5, z: rz, vx: 0, vz: 0 }); };
    g.phase = 'rally'; g.rally = { striker: 'you', turn: 'rival', front: true, bounces: 0, hits: 2 }; g.ball.p = { x: 0, y: 1.5, z: (yz + rz) / 2 }; g.ball.v = { x: 0, y: 0, z: 0 };
    const u = g.update.bind(g); if (!g.__wrapped) { g.__wrapped = true; g.update = (dt, inp) => { window.__fix?.(); g.ball.p.y = 1.5; g.ball.v = { x: 0, y: 0, z: 0 }; g.phase = 'rally'; return u(0, inp); }; } }, [yz, rz]);
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const G = window.__game, M = G.pelotaMatch, cam = G.camera, V = cam.position.constructor, grp = M.court.group;
    const see = (P) => { const v = new V(P.x, 1, P.z); grp.localToWorld(v); v.project(cam); return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), dentro: Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 && v.z < 1 }; };
    return { tu: see(M.game.players.you), rival: see(M.game.players.rival) }; });
  if (!r.tu.dentro || !r.rival.dentro) bad++;
  console.log(name, JSON.stringify(r)); await p.screenshot({ path: `${out}/${name}.png` });
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); console.log(bad ? 'Alguno fuera de la imagen' : 'Todo correcto'); await b.close();
