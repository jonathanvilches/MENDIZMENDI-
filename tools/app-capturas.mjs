// Capturas para el aviso de instalación de la app (Android y Chrome del ordenador las enseñan antes de instalar): el
// inicio, el mapa y los torneos, en horizontal (1688 × 780), que es como se juega la app. Van en public/capturas
// (las de vertical, home-v y sports-v, son de antes de fijar la app en horizontal: ya no van en el manifest).
// Uso: URL=http://127.0.0.1:5173 node tools/app-capturas.mjs   (el servidor de pruebas, con la web)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
mkdirSync('public/capturas', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [W, H, tag, screens] of [[844, 390, 'h', ['home', 'map', 'sports']]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  // (como si ya se jugase desde la app instalada: sin el botón de instalar)
  await p.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true }); localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true } })); });
  for (const s of screens) {
    await p.goto(`${URL}/?screen=${s}`); await p.waitForFunction(() => window.__hub && !document.getElementById('portada-app'), null, { timeout: 300000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    writeFileSync(`public/capturas/${s}-${tag}.jpg`, await p.screenshot({ type: 'jpeg', quality: 82 }));
  }
  await ctx.close();
}
await b.close(); console.log('capturas en public/capturas');
