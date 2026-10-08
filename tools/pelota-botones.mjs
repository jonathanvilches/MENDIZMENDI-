// Cada botón de pelota pide su golpe: GOLPE el golpe, CORTADA la cortada y DEJADA la dejada (antes la cortada se
// cogía como dejada). Pulsa cada botón como un dedo y mira qué golpe queda pedido. Uso: node tools/pelota-botones.mjs [pueblo]
import { chromium } from 'playwright-core';
const [,, town = 'lumbier'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173'}/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click()); await p.waitForTimeout(2500);
let bad = 0;
for (const [sel, want] of [['.pel-hit', 'hit'], ['.pel-cut', 'cut'], ['.pel-dejada', 'drop']]) {
  const r = await p.evaluate((sel) => { const M = window.__game.pelotaMatch, I = M.input, e = document.querySelector(sel);
    const ev = (t) => e.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1, pointerType: 'touch' }));
    I.hitQ = I.dropQ = I.cutQ = false; ev('pointerdown'); M.t += 0.4; ev('pointerup');
    const got = I.cutQ ? 'cut' : I.dropQ ? 'drop' : I.hitQ ? 'hit' : 'nada'; const pow = I.power; I.hitQ = I.dropQ = I.cutQ = false;
    return { got, pow: +pow.toFixed(2), texto: e.textContent.trim() }; }, sel);
  const ok = r.got === want; if (!ok) bad++;
  console.log(sel.padEnd(12), '«' + r.texto + '»', 'pide', r.got, 'potencia', r.pow, ok ? 'OK' : 'MAL, esperaba ' + want);
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); console.log(bad ? `${bad} mal` : 'Todo correcto'); await b.close();
