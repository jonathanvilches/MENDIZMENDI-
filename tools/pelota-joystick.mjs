// Joystick de la pelota: que nunca se quede enganchado. Pulsa en la zona, mueve hacia delante y suelta de varias formas
// (soltar en otro sitio, el sistema cancela el toque, sale un aviso encima, se cambia de app); tras cada una, quieto.
// Uso: node tools/pelota-joystick.mjs [pueblo]
import { chromium } from 'playwright-core';
const [,, town = 'lumbier'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForTimeout(2000);
const cases = ['pointerup-fuera', 'touchcancel', 'touchend-sin-dedos', 'aviso', 'cambio-de-app', 'normal'];
let bad = 0;
for (const c of cases) {
  const r = await p.evaluate((c) => { const M = window.__game.pelotaMatch, I = M.input, z = document.querySelector('.pel-stick'), r = z.getBoundingClientRect();
    const x = r.left + r.width * 0.4, y = r.top + r.height * 0.6, id = 40 + Math.floor(Math.random() * 1000);
    z.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    z.dispatchEvent(new PointerEvent('pointermove', { pointerId: id, clientX: x, clientY: y - 60, bubbles: true, pointerType: 'touch' }));
    const held = I.stick.y;
    if (c === 'pointerup-fuera') document.body.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, bubbles: true, pointerType: 'touch' }));
    if (c === 'touchcancel') dispatchEvent(new TouchEvent('touchcancel', { touches: [], bubbles: true }));
    if (c === 'touchend-sin-dedos') document.body.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));
    if (c === 'aviso') { M.hud.panel('<p>aviso</p>'); M.hud.closePanel(); }
    if (c === 'cambio-de-app') { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; }
    if (c === 'normal') z.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, bubbles: true, pointerType: 'touch' }));
    return { held: +held.toFixed(2), after: I.stick.id === null && I.stick.y === 0 }; }, c);
  console.log(c.padEnd(20), JSON.stringify(r)); if (!(r.held > 0.5 && r.after)) bad++;
}
console.log(bad ? 'FALLA' : 'Todo correcto');
await b.close();
