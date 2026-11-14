// La barra de misiones en la web compilada, en tamaño de móvil: recién entrado, tras tocar la flecha, tras elegir una
// misión y pasados unos segundos
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const out = process.env.OUT, URL = process.env.URL || 'http://127.0.0.1:8099';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const tam of (process.env.TAMS || '844x390,390x844').split(',')) {
  const [W, H] = tam.split('x').map(Number), movil = W < 1000;
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil, userAgent: !movil ? undefined : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
  await p.goto(`${URL}/?town=${process.env.TOWN || 'lesaka'}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => document.querySelector('#misiones button') && window.__game?.mode === 'play', null, { timeout: 500000 }); await p.waitForTimeout(3500);
  const mide = () => p.evaluate(() => { const T = document.querySelector('#tl'), b = T.getBoundingClientRect(), vis = [...document.querySelectorAll('#misiones button')].filter(x => x.getBoundingClientRect().width > 0).length;
    return { clases: T.className, caja: [Math.round(b.width), Math.round(b.height)], aLaVista: vis, tactil: document.documentElement.className }; });
  console.log(tam, 'al entrar', JSON.stringify(await mide())); await p.screenshot({ path: `${out}-${tam}-1.jpg`, type: 'jpeg', quality: 88 });
  const toca = (q) => p.evaluate((q) => { const e = [...document.querySelectorAll(q)].find(x => x.getBoundingClientRect().width > 0); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }, q);
  await toca('#misiones button'); await p.waitForTimeout(900);
  console.log(tam, 'tocar el icono', JSON.stringify(await mide())); await p.screenshot({ path: `${out}-${tam}-2.jpg`, type: 'jpeg', quality: 88 });
  await p.evaluate(() => document.querySelectorAll('#misiones button')[2].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))); await p.waitForTimeout(1200);
  console.log(tam, 'elegida', JSON.stringify(await mide())); await p.screenshot({ path: `${out}-${tam}-3.jpg`, type: 'jpeg', quality: 88 });
  await p.evaluate(() => document.querySelector('#mPliega').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))); await p.waitForTimeout(700);
  console.log(tam, 'flecha', JSON.stringify(await mide()));
  await p.waitForTimeout(11500); console.log(tam, 'a los 12 s sin tocar', JSON.stringify(await mide()), errs.length ? errs.slice(0, 2) : '');
  await p.close();
}
await b.close();
