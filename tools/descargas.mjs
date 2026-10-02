// Qué descarga la versión web (docs/) al entrar en un pueblo, de mayor a menor. Servir docs/ en localhost:8099.
// Uso: node tools/descargas.mjs [pueblo]
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const L = [];
p.on('response', async r => { try { L.push([(await r.body()).length, r.url().split('/').pop()]); } catch (e) { } });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto('http://localhost:8099/?town=' + (process.argv[2] || 'lesaka') + '&skipintro=1&q=low', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
L.sort((a, b) => b[0] - a[0]); console.log(L.slice(0, 45).map(([n, u]) => (n / 1024).toFixed(0).padStart(6) + ' KB ' + u).join('\n'));
const used = await p.evaluate(() => { const s = new Set(); window.__rt.scene.traverse(o => { if (o.userData?.kind) s.add(o.userData.kind); }); return [...s]; });
console.log('tipos', used.join(','));
await b.close();
