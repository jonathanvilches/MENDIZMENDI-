// Los dos fotogramas del vídeo de la isla de una comarca (src/data/videos-isla.js): la isla arriba, ya flotando, y abajo,
// pegada a Navarra, con la misma cámara y sin rótulos. Con el servidor de desarrollo en marcha (npm run dev, puerto 5173):
//   OUT=<carpeta> I=<n.º de la comarca en la fila de abajo> TAM=1280x720 DPR=1.5 node tools/islas/fotogramas.mjs
// Deja fin.png, inicio.png y pose.json (la cámara, para videos-isla.js). Chromium: /opt/pw-browsers/chromium o CHROMIUM.
import { chromium } from '../../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT; fs.mkdirSync(out, { recursive: true });
const [W, H] = (process.env.TAM || '1280x720').split('x').map(Number), I = +(process.env.I || 3);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1.5) })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { window.__sinVideoIsla = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto('http://127.0.0.1:5173/?skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForTimeout(3000);
await p.evaluate((i) => document.querySelectorAll('.m3-chip[data-sel]')[i].click(), I);
await p.waitForTimeout(32000);
await p.addStyleTag({ content: 'body * { visibility: hidden !important; } .m3-cv { visibility: visible !important; }' });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/fin.png` });
const pose = await p.evaluate(() => { const v = window.__mapa3d.v; return { x: v.x, z: v.z, d: v.d, yaw: v.yaw, pitch: v.pitch, hy: v.hy }; });
await p.evaluate(() => window.__mapa3d.islaK(0));
await p.waitForTimeout(14000);
await p.screenshot({ path: `${out}/inicio.png` });
fs.writeFileSync(`${out}/pose.json`, JSON.stringify(pose));
console.log(JSON.stringify(pose), 'errores', errs.length, JSON.stringify(errs.slice(0, 3)));
await b.close();
