import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.DPR || 1) })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { window.__sinVideoIsla = true; window.__paseo = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } }));
  let T = 0, manual = false; const q = [], now0 = performance.now.bind(performance), raf0 = window.requestAnimationFrame.bind(window);
  performance.now = () => manual ? T : now0(); window.requestAnimationFrame = (f) => { if (!manual) return raf0(f); q.push(f); return q.length; };
  window.__manual = () => { T = now0(); manual = true; }; window.__n = 0; window.__paso = (ms) => { T += ms; const fs2 = q.splice(0); window.__n += fs2.length; for (const f of fs2) f(T); }; });
await p.goto('http://127.0.0.1:5173/?skipintro=1' + (process.env.Q ? '&q=' + process.env.Q : ''), { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForFunction(() => { const e = window.__mapa3d.estado(); return !e.vuelo && Math.abs(e.v.pitch - e.goal.pitch) < 0.02 && e.v.d < 150; }, null, { timeout: 300000, polling: 500 }); await p.waitForTimeout(1500); await p.evaluate(() => window.__manual());
await p.evaluate(() => document.querySelectorAll('.m3-chip[data-sel]')[3].click());
let k = 0; const fs = await import('node:fs');
for (const n of (process.env.PASOS || '90,60,60,90,150,150,150,150').split(',').map(Number)) { await p.waitForTimeout(300);
  const r = await p.evaluate((n) => { for (let i = 0; i < n; i++) window.__paso(1000 / 30); const m = window.__mapa3d, e = m.estado(); return { vuelo: e.vuelo, vp: +e.v.pitch.toFixed(2), d: +e.v.d.toFixed(1), yaw: +e.v.yaw.toFixed(2), x: +e.v.x.toFixed(1), z: +e.v.z.toFixed(1), pueblos: [...document.querySelectorAll('.m3-tl')].filter(l => l._on).length, montes: m.montes().filter(q => q.on).length, img: document.querySelector('.m3-cv').toDataURL('image/jpeg', 0.9) }; }, n);
  fs.writeFileSync(`${process.env.OUT}-${k++}.jpg`, Buffer.from(r.img.split(',')[1], 'base64')); delete r.img; console.log(JSON.stringify(r)); }
console.log('errores', errs.length, JSON.stringify(errs.slice(0, 3))); await b.close();
