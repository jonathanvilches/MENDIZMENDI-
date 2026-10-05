// Flores del prado y copas vistas desde abajo: foto a ras de suelo junto al jugador y otra bajo un árbol.
// Uso: node tools/flores.mjs [pueblo] [carpeta]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/flores'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`${URL}/?town=${town}&q=${process.env.Q || 'high'}&weather=clear&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
const cam = (fn) => p.evaluate(fn);
// prado: el punto de pradera más cercano sin camino ni casas (se busca alrededor del jugador)
await cam(() => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight, P = G.player.pos;
  const x = P.x + 3, z = P.z + 3, y = gh(x, z), pos = new T.Vector3(x - 1.6, y + 0.7, z - 1.6), look = new T.Vector3(x + 1, y + 0.1, z + 1);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-flores.png`, timeout: 180000 });
// bajo un árbol, mirando la copa
await cam(() => { const G = window.__game, T = window.__THREE, P = window.__layout.PLACES.plaza; let best = null, bd = 1e9; const m = new T.Matrix4(), v = new T.Vector3();
  window.__rt.nature.group.traverse(o => { if (!o.isInstancedMesh || !(o.material.customProgramCacheKey?.() || '').includes('windb')) return; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m); const d = Math.hypot(v.x - P.x, v.z - P.z); if (d > 30 && d < bd) { bd = d; best = v.clone(); } } });
  const pos = new T.Vector3(best.x + 7, best.y + 1.4, best.z + 7), look = new T.Vector3(best.x, best.y + 4.5, best.z);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-copa.png`, timeout: 180000 });
console.log(errs.join('\n') || 'sin errores');
await b.close();
