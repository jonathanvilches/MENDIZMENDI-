// Capturas de cada especie de la fauna en su sitio dentro de un pueblo. Uso: node tools/fauna_shot.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/fauna'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=clear`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const kinds = await p.evaluate(() => [...new Set(window.__rt.fauna.animals.map(a => a.kind))]);
for (const k of kinds) {
  await p.evaluate((k) => { const G = window.__game, T = window.__THREE, a = window.__rt.fauna.animals.find(a => a.kind === k); const gh = window.__hf.groundHeight;
    G.player.place(a.pos.x + 4, a.pos.z + 4, 0); a.alwaysUpdate = true;
    const d = Math.max(3.2, (a.glbA?.height || 1) * 3.4), pos = new T.Vector3(a.pos.x + d * 0.8, gh(a.pos.x, a.pos.z) + d * 0.45, a.pos.z + d * 0.6), lk = new T.Vector3(a.pos.x, a.pos.y + (a.glbA?.height || 0.8) * 0.5, a.pos.z);
    G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, k);
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${town}-${k}.png`, timeout: 180000 }); console.log('foto', k);
}
console.log('errores', await p.evaluate(() => JSON.stringify(window.__errors || [])));
await b.close();
