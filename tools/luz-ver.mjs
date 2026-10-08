// Fotos de las luces que pueden verse raras: el haz del objetivo a 40 m, un rayo de tormenta en su destello y las
// sombras de las casas con el jugador andando a pasitos (la cámara quieta: las sombras quietas no deben cambiar).
// Uso: node tools/luz-ver.mjs <pueblo> <carpeta> [hora]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/luz', hora = '17'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=rain&skipintro=1&noflora&t=${hora}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 30); k(); }), n);
// sin lluvia para el haz y las sombras (la tormenta, luego)
await p.evaluate(() => { const W = window.__rt.weather; W.raining = false; W.phaseT = 1e9; W.k = 0; document.querySelectorAll('.toast,.whisper').forEach(e => e.remove()); });
// 1. el haz del objetivo, a 40 m, de frente
const tgt = await p.evaluate(() => { const G = window.__game, t = G.rt.beacon.target; if (!t) return null; const P = G.player;
  P.place(t.x - 40, t.z - 10, Math.atan2(40, 10)); G.follow.snap(P); G.follow.yaw = P.heading + Math.PI; return { x: t.x, z: t.z }; });
console.log('objetivo', JSON.stringify(tgt));
await frames(30); await p.screenshot({ path: `${out}/${town}-haz.jpg`, quality: 75 });
// 2. sombras: cámara quieta, el jugador anda a pasitos
await p.evaluate(() => { const G = window.__game, P = G.player;
  // junto a una casa del pueblo, con sus sombras cerca; la cámara, quieta del todo
  const H = G.rt.smoke?.spots?.[0]; if (H) { P.place(H.x + 9, H.z + 9, 0); G.follow.snap(P); }
  window.__fu = G.follow.update; G.follow.update = () => {}; window.__p0 = { x: P.pos.x, z: P.pos.z };
  const rt = G.rt; rt.sky.speed = 0; rt.pixelRatio = rt.maxRatio = 0.75; rt.ratioFor = () => 0.75; rt.ratioDirty = true; });   // (la hora y la resolución, quietas)
await frames(20);
for (let i = 0; i < 5; i++) { await p.evaluate((i) => { const G = window.__game, P = G.player; P.place(window.__p0.x + i * 0.37, window.__p0.z + i * 0.23, P.heading); }, i); await frames(8); await p.screenshot({ path: `${out}/${town}-sombra${i}.png` }); }
await p.evaluate(() => { window.__game.follow.update = window.__fu; });
// 3. tormenta: lluvia fuerte y un rayo, quieto en su destello
await p.evaluate(() => { const rt = window.__rt, W = rt.weather; W.raining = true; W.k = 1; const st = W.storm.bind(W);
  W.storm = function (dt, cam, sky, snd) { if (window.__hold) this.strikeT = 0.04; return st(dt, cam, sky, snd); };
  const G = window.__game; G.follow.yaw += 0.01; W.strike(rt.camera, null); window.__hold = true; });
await frames(6); await p.screenshot({ path: `${out}/${town}-rayo.jpg`, quality: 75 });
await p.evaluate(() => { window.__hold = false; }); await frames(30); await p.screenshot({ path: `${out}/${town}-tras-rayo.jpg`, quality: 75 });
console.log('errores', JSON.stringify(errs));
await b.close();
