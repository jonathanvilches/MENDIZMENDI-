// Capturas de un personaje GLB: frente, perfil, espalda, clips y hoja de expresiones.
// Uso: node tools/charshots.mjs <carpeta_salida> [personaje]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/chars', who = 'protagonista'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 640 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
const base = `http://127.0.0.1:5173/lab/chars.html?shot&who=${who}`;
const shots = [
  ['frente', 'ry=0'], ['perfil', 'ry=1.5708'], ['espalda', 'ry=3.1416'], ['tres-cuartos', 'ry=0.6'],
  ['cara', 'view=face&ry=0.25'], ['cara-perfil', 'view=face&ry=1.5708'],
  ['walk', 'clip=Walk&t=0.25&ry=1.3'], ['run', 'clip=Run&t=0.15&ry=1.3'], ['wave', 'clip=Wave&t=0.45'],
  ['celebrate', 'clip=Celebrate&t=0.45'], ['scared', 'clip=Scared&t=0.4'], ['talk', 'clip=Talk&t=0.5'],
  ['jump', 'clip=Jump_Loop&t=0.2&ry=1.0'], ['look', 'clip=Look_Around&t=0.75'],
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [name, qs] of shots) {
  if (only && !only.includes(name)) continue;
  await page.goto(`${base}&${qs}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.screenshot({ path: `${out}/${who}-${name}.png` });
  console.log(name);
}
if (!only || only.includes('expresiones')) {
  await page.setViewportSize({ width: 960, height: 720 });
  const grid = 'Normal:Normal,Happy:Normal,Surprised:Normal,Scared:Worried,Talk_A:Normal,Talk_O:Normal,Tired:Worried,Normal:Angry';
  await page.goto(`${base}&grid=${grid}&cols=4&ry=0`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.screenshot({ path: `${out}/${who}-expresiones.png` });
  await page.goto(`${base}&view=face&lid=Half&ry=0`); await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.screenshot({ path: `${out}/${who}-parpado-medio.png`, clip: { x: 120, y: 120, width: 720, height: 480 } });
  await page.goto(`${base}&view=face&lid=Closed&ry=0`); await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.screenshot({ path: `${out}/${who}-parpado-cerrado.png`, clip: { x: 120, y: 120, width: 720, height: 480 } });
  console.log('expresiones');
}
console.log(JSON.stringify(await page.evaluate(() => window.__info)));
await browser.close();
