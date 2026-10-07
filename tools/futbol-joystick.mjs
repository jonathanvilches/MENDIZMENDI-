// Fútbol: el joystick no se queda «pulsado». Se toca la zona del joystick, se arrastra y se levanta el dedo de tres
// formas en las que antes no llegaba el pointerup a la zona: un touchend en la ventana sin dedos, la pérdida de la
// captura del puntero y la pestaña que pierde el foco. En las tres, el joystick tiene que volver a cero.
// Uso: node tools/futbol-joystick.mjs   (servidor en 5173)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); });
await p.goto('http://127.0.0.1:5173/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('[data-sport="futbol"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
await p.waitForFunction(() => document.querySelector('.lg-root [data-a="sadar"]'), null, { timeout: 60000 }); await p.evaluate(() => document.querySelector('.lg-root [data-a="sadar"]').click());
await p.waitForFunction(() => window.__futbol && window.__futbol.hud && document.querySelector('.fb-stick'), null, { timeout: 600000 });
const res = await p.evaluate(() => {
  const H = window.__futbol.hud, z = document.querySelector('.fb-stick'), r = z.getBoundingClientRect(), out = {};
  const press = (id) => { const x = r.left + 80, y = r.top + r.height - 80; z.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true })); z.dispatchEvent(new PointerEvent('pointermove', { pointerId: id, clientX: x - 50, clientY: y, bubbles: true })); return H.stick.x; };
  out.pulsado1 = +press(11).toFixed(2); window.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true })); out.trasTouchend = H.stick.x;
  out.pulsado2 = +press(12).toFixed(2); z.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 12, bubbles: true })); out.trasPerderCaptura = H.stick.x;
  out.pulsado3 = +press(13).toFixed(2); window.dispatchEvent(new Event('blur')); out.trasBlur = H.stick.x;
  out.pulsado4 = +press(14).toFixed(2); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 14, bubbles: true })); out.trasPointerupFuera = H.stick.x;
  return out;
});
const ok = res.pulsado1 < -0.5 && res.trasTouchend === 0 && res.trasPerderCaptura === 0 && res.trasBlur === 0 && res.trasPointerupFuera === 0;
console.log(JSON.stringify(res), ok ? 'Todo correcto' : 'FALLO', errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
