// Las vecinas en el juego (npcGlb.js con las chicas de chicas.js): una fila de vecinas hechas con buildNpc, como en los
// pueblos (con falda, con delantal, mayor, de la tienda, futbolista) y los trajes de chica (lamia, sorgina), de frente, de
// espaldas, de lado andando y de cerca. Una imagen por vista en la carpeta indicada.
// Uso: node tools/chicas/vecinas.mjs <carpeta>   (servidor de pruebas en 5173; VISTAS=…)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1200, height: 600 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/403|google|Failed to load|GPU stall|WebGL|AudioContext/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); });
await p.goto('http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.addStyleTag({ content: '#ui > *, #hud, .hud { display: none !important; }' });
const info = await p.evaluate(async () => {
  const G = window.__game, T = window.__THREE, { buildNpc, preloadNpcs } = await import('/src/actors/npcGlb.js');
  await preloadNpcs();   // (el módulo cargado aquí puede ser otra copia del del juego: se le cargan sus cuerpos)
  G.player.obj.visible = false; for (const o of G.actors || []) if (o.obj) o.obj.visible = false;
  const P = G.player.pos, h = G.player.heading;
  const looks = [
    { female: true, ponytail: true, shirt: '#2f6fd0', pants: '#1d2a4a', hair: '#3a2418' },
    { female: true, skirt: '#2a3a5a', shirt: '#e8e0cc', hair: '#aa844d', bun: true },
    { female: true, skirt: '#3a3530', apron: '#f4f1ea', shirt: '#c0573a', pants: '#3a3530', hair: '#4a3020', bun: true },
    { old: true, female: true, hair: '#e4e0d8', shirt: '#6d4a6a', skirt: '#2b2630', pants: '#2b2630', scarf: '#3a2a3a', bun: true },
    { region: 'baztan-bidasoa', female: true, apron: '#f4f1ea', seed: 13 },
    { traje: 'lamia', female: true, hair: '#e8c34a', skirt: '#4a9a8a', height: 1.7 },
    { traje: 'sorgina', female: true, hair: '#dcd7cf', height: 1.65 },
  ];
  const n = looks.length, made = looks.map((L, i) => {
    const r = buildNpc({ ...L }); if (!r) return null; const off = (i - (n - 1) / 2) * 1.05;
    r.obj.position.set(P.x + Math.sin(h) * 5 + Math.cos(h) * off, P.y, P.z + Math.cos(h) * 5 - Math.sin(h) * off); r.obj.rotation.y = h + Math.PI;
    G.scene.add(r.obj); return r;
  });
  let last = performance.now();
  const loop = () => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; for (const r of made) if (r) r.anim.update(dt, { speed: window.__vel || 0, wave: 0, cheer: 0, talking: 0 }); requestAnimationFrame(loop); }; loop();
  window.__aim = (modo) => {
    const cerca = modo === 'cerca' || modo === 'trajes', s = modo === 'espalda' ? -1 : 1, hh = h + (modo === 'lado' ? Math.PI / 2 : 0), d = cerca ? 2.2 : 6.4;
    const tgt = new T.Vector3(P.x + Math.sin(h) * 5, P.y + (cerca ? 1.05 : 0.8), P.z + Math.cos(h) * 5);
    if (cerca) { const k = modo === 'trajes' ? -2.6 : 1.6; tgt.x -= Math.cos(h) * k; tgt.z += Math.sin(h) * k; }
    const pos = new T.Vector3(tgt.x - Math.sin(hh) * d * s, tgt.y + 0.15, tgt.z - Math.cos(hh) * d * s);
    G.follow.cinematic = { pos, look: tgt, t: 1, lookCur: tgt.clone() }; G.camera.position.copy(pos); G.camera.lookAt(tgt);
  };
  return made.map(r => !r ? null : ({ sex: r.obj.userData.sex, meshy: r.obj.userData.meshy, mallas: (() => { const m = []; r.obj.traverse(o => { if (o.isMesh) m.push(o.name || (o.userData.traje ? 'traje' : '?')); }); return m.join(' '); })() }));
});
for (const modo of (process.env.VISTAS || 'frente,espalda,lado,cerca').split(',')) {
  await p.evaluate((m) => { window.__vel = m === 'lado' ? 1.6 : 0; }, modo);
  for (let i = 0; i < 6; i++) { await p.evaluate((m) => window.__aim(m), modo); await p.waitForTimeout(250); }
  await p.screenshot({ path: `${out}/${modo}.png` });
}
console.log(JSON.stringify(info, null, 1), '\nerrores:', errs.length ? errs.slice(0, 8).join(' | ') : 'ninguno');
await b.close();
