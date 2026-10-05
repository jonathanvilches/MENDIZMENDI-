// Mariposas de cerca: junta todas las mariposas delante de la cámara y saca dos fotos (aleteo y otra fase).
// Uso: node tools/mariposas.mjs [pueblo] [carpeta]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/mariposas'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`${URL}/?town=${town}&q=high&weather=clear&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
for (let k = 0; k < 2; k++) {
  await p.evaluate(() => {
    const G = window.__game, T = window.__THREE, F = window.__rt.fauna, gh = window.__hf.groundHeight, P = G.player.pos;
    const cx = P.x + 4, cz = P.z + 4, y = gh(cx, cz);
    for (const b of F.butterflies) { b.c.set(cx + (Math.random() - 0.5) * 1.5, y, cz + (Math.random() - 0.5) * 1.5); b.t = Math.random() * 3; }
    const pos = new T.Vector3(cx - 2.2, y + 1.2, cz - 2.2), look = new T.Vector3(cx, y + 0.6, cz);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/${town}-mariposas-${k}.png`, timeout: 180000 });
}
console.log(errs.join('\n') || 'sin errores');
await b.close();
