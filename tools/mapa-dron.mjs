// El vuelo de dron del mapa del inicio sobre un pueblo: la cámara, a lo largo de toda la vuelta, siempre por encima del
// relieve que tiene debajo y sin montes entre ella y el pueblo (mapa3d.js). Mide la altura de la cámara y la del suelo en 24
// puntos de la vuelta y hace capturas de algunos. Uso: node tools/mapa-dron.mjs [pueblo,pueblo…] [carpeta]   (5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const towns = (process.argv[2] || 'leitza,isaba-izaba,otsagabia-ochagavia').split(','), out = process.argv[3] || 'entrega/mapa-dron', URL = process.env.URL || 'http://127.0.0.1:5173';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
await p.goto(URL + '/?q=low', { timeout: 300000 });
await p.waitForFunction(() => window.__hub?.visible && window.__mapa3d, null, { timeout: 300000 }); await p.waitForTimeout(9000);
let mal = 0;
for (const t of towns) {
  await p.evaluate((t) => window.__mapa3d.ir(t), t);
  await p.waitForFunction(() => window.__mapa3d.relieve().dron, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const res = [];
  for (let k = 0; k < 24; k++) {
    await p.evaluate((u) => window.__mapa3d.dronT(u), k * 125 / 24); await p.waitForTimeout(900);
    const r = await p.evaluate(() => window.__mapa3d.relieve()); res.push(r);
    if (k % 6 === 0) await p.screenshot({ path: `${out}/${t}-${k}.png`, timeout: 120000 }).catch(() => {});
  }
  const bajo = res.filter(r => r.cam < r.suelo + 0.005), maxSub = Math.max(...res.map(r => r.subida));
  console.log(JSON.stringify({ pueblo: t, puntos: res.length, bajoElSuelo: bajo.length, subidaMax: +maxSub.toFixed(3), margenMin: +Math.min(...res.map(r => r.cam - r.suelo)).toFixed(3) }));
  if (bajo.length) mal++;
}
console.log(errs.length ? errs : 'sin errores'); console.log(mal || errs.length ? 'MAL' : 'Todo correcto');
await b.close(); process.exit(mal || errs.length ? 1 : 0);
