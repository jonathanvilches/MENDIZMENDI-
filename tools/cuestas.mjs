// Casas en cuesta: busca en un pueblo las casas con más desnivel en su planta y saca una foto de cada una, para ver que
// no quedan enterradas (se apoyan arriba y llevan zócalo de piedra hasta el suelo por abajo).
// Uso: node tools/cuestas.mjs [pueblo] [carpeta] [n]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'ujue', out = '/tmp/claude-0/cuestas', N = '3'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173/'}?town=${town}&q=mid&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.addStyleTag({ content: '#ui > * { display: none !important; }' });
const list = await p.evaluate(async () => {
  const { TOWN } = await import('/src/world/townBuilder.js'), gh = window.__hf.groundHeight;
  return TOWN.houses.map(h => { const c = Math.cos(h.ry), s = Math.sin(h.ry); let mn = 1e9, mx = -1e9;
    for (const [a, b] of [[-h.w / 2, -h.d / 2], [h.w / 2, -h.d / 2], [h.w / 2, h.d / 2], [-h.w / 2, h.d / 2]]) { const y = gh(h.x + a * c + b * s, h.z - a * s + b * c); mn = Math.min(mn, y); mx = Math.max(mx, y); }
    return { x: h.x, z: h.z, ry: h.ry, d: h.d, drop: mx - mn }; }).sort((a, b) => b.drop - a.drop);
});
console.log(town, list.length, 'casas; mayores desniveles', list.slice(0, 6).map(h => h.drop.toFixed(1)).join(', '));
for (let i = 0; i < Math.min(+N, list.length); i++) {
  const h = list[i];
  await p.evaluate((h) => { const G = window.__game, gh = window.__hf.groundHeight, a = h.ry + 0.7, R = h.d / 2 + 9;
    const cx = h.x + Math.sin(a) * R, cz = h.z + Math.cos(a) * R, pos = new window.__THREE.Vector3(cx, gh(cx, cz) + 3.5, cz), look = new window.__THREE.Vector3(h.x, gh(h.x, h.z) + 2, h.z);
    G.player.place(cx, cz, 0); G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); }, h);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-${i}.png`, timeout: 180000 });
}
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores');
await b.close();
