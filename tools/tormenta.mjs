// Tormenta: un pueblo con lluvia, mirando al cielo; capturas sin rayo, en el fogonazo y justo después.
// Uso: node tools/tormenta.mjs [pueblo]   (servidor en 5173). Capturas en /tmp/claude-0/tormenta-*.png
import { chromium } from 'playwright-core';
const town = process.argv[2] || 'lumbier';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&weather=rain&q=low&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.waitForFunction(() => !document.querySelector('.loading:not(.hidden), .ld-root'), null, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(3000);
await p.evaluate(() => { const W = window.__rt.weather; W.k = 1; W.raining = true; W.phaseT = 999; W.boltT = 999; const f = window.__rt.follow; f.pitch = -0.15; f.targetDist = 3; });
await p.waitForTimeout(2500); await p.screenshot({ path: '/tmp/claude-0/tormenta-1.png' });
const st = await p.evaluate(async () => { const rt = window.__rt, W = rt.weather; W.strike(rt.camera, rt.sound); W.pulses = Array.from({ length: 30 }, (_, i) => [i * 0.04, i % 3 ? 0.7 : 1]); const tr = []; for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 500)); tr.push([W.strikeT?.toFixed(2), rt.sky.uniforms.uFlash.value.toFixed(2), rt.sky.hemi.intensity.toFixed(2)]); } return { tr, flash: rt.sky.uniforms.uFlash.value, storm: rt.sky.uniforms.uStorm.value, bolt: W.bolt?.visible }; });
await p.screenshot({ path: '/tmp/claude-0/tormenta-2.png' });
console.log(JSON.stringify(st));
await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/claude-0/tormenta-3.png' });
console.log(errs.length ? errs.join('\n') : 'sin errores'); await b.close();
