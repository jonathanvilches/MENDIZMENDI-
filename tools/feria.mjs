// Feria de ganado y las Dos Hermanas: capturas de los corrales, cada animal, el juez por un día, el trato y las montañas.
// Uso: node tools/feria.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'estella', out = 'entrega/feria'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
// (antes de cada foto se acaban las animaciones de entrada: en el navegador de pruebas, a un fotograma por segundo, se
// quedaban en su primer instante y las tarjetas salían transparentes)
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } })); await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const cards = async (tag) => { for (let i = 0; i < 6; i++) { await p.waitForTimeout(900); const kind = await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) .opts') ? 'choice' : document.querySelector('.mg-overlay:not(.out) button') ? 'card' : ''); if (!kind) return; if (tag) await shot(tag + i); if (kind === 'choice') { await p.evaluate(() => document.querySelectorAll('.opt').forEach(b => { if (/apretón|brillante/.test(b.textContent)) b.click(); })); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('.choice .next')?.click()); } else await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button').click()); } };
const look = (o) => p.evaluate((o) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight; G.player.place(o.x + o.ox * 0.3, o.z + o.oz * 0.3, 0); const pos = new T.Vector3(o.x + o.ox, gh(o.x, o.z) + o.oy, o.z + o.oz), lk = new T.Vector3(o.x + (o.lx || 0), gh(o.x, o.z) + (o.ly || 1), o.z + (o.lz || 0)); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, o);
const F = await p.evaluate(() => { const M = window.__game.missions.find(M => M.type === 'feria'); return M?.fair && { x: M.fair.x, z: M.fair.z }; });
// (cierra lo que haya abierto: ficha de fauna, tarjeta o pregunta, eligiendo la respuesta buena)
const cierra = () => p.evaluate(() => { const ch = document.querySelector('.mg-overlay:not(.out) .opts'); if (ch) { document.querySelectorAll('.opt').forEach(b => { if (/apretón|brillante/.test(b.textContent)) b.click(); }); setTimeout(() => document.querySelector('.choice .next')?.click(), 300); return 'pregunta'; } const f = document.querySelector('.ix-ov .ix-go'); if (f) { f.click(); return 'ficha'; } const b = document.querySelector('.mg-overlay:not(.out) button'); if (b) { b.click(); return 'tarjeta'; } return ''; });
if (F) {
  await look({ ...F, ox: 4, oy: 16, oz: 34 }); await p.waitForTimeout(4000); await shot('corrales'); await look({ ...F, ox: -8, oy: 2.4, oz: 1.5, lx: 6, ly: 1 }); await p.waitForTimeout(3000); await shot('pasillo');
  await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'feria'); G.follow.cinematic = null; G.say = async () => {}; G.dialog(M, M.host); });
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(900); if (!(await cierra())) break; }
  // los corrales, uno a uno (la primera ficha y la primera tarjeta, con foto)
  const n = await p.evaluate(() => window.__game.missions.find(M => M.type === 'feria').fair.pens.length);
  for (let i = 0; i < n; i++) {
    await p.evaluate((i) => { const G = window.__game, M = G.missions.find(M => M.type === 'feria'), pen = M.fair.pens[i]; G.player.place(pen.fx, pen.fz, 0); G.conoceCorral(M, pen); }, i);
    await p.waitForTimeout(1500); if (i === 0 || i === 1) await shot('corral' + (i + 1));
    for (let k = 0; k < 4; k++) { if (!(await cierra())) break; await p.waitForTimeout(700); }
    await p.waitForTimeout(600);
  }
  console.log('corrales', await p.evaluate(() => { const M = window.__game.missions.find(M => M.type === 'feria'); return { paso: M.step, vistos: M.count, de: M.need }; }));
  await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'feria'); G.player.place(M.fair.pista.x, M.fair.pista.z - 2, 0); });
  await p.waitForTimeout(2500); await cards('juez');
  await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'feria'); G.dialog(M, M.host); });
  await cards('trato');
  console.log('feria hecha', await p.evaluate(() => window.__game.missions.find(M => M.type === 'feria').done));
}
const PK = await p.evaluate(() => window.__layout.PLACES.pass ? { ...window.__layout.PLACES.pass } : null);
if (PK) { await look({ ...PK, ox: 10, oy: 30, oz: 260, ly: 60 }); await p.waitForTimeout(4000); await shot('dos-hermanas'); await look({ ...PK, ox: 18, oy: 6, oz: 80, ly: 40 }); await p.waitForTimeout(4000); await shot('dos-hermanas-mirador'); }
await browser.close();
