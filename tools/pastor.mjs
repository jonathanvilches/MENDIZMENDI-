// ¿Está el pastor del pueblo? Carga un pueblo con rebaño, busca al pastor (personaje de Meshy), comprueba que tiene
// cuerpo, que camina por su ruta y que saluda, y saca una foto de cerca.
// Uso: node tools/pastor.mjs [pueblo] [salida.png]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const [,, town = 'etxalar', out = 'pastor.png'] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
p.on('console', m => { if (m.type() === 'warning' && /vecino|Meshy/.test(m.text())) errs.push(m.text().slice(0, 120)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=mid&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const r0 = await p.evaluate(() => {
  const G = window.__game, a = G.walkers.find(w => w.def?.id === 'pastor' || w.id === 'pastor');
  if (!a) return null;
  let meshes = 0, tris = 0; a.obj.traverse(o => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  window.__pastor = a;
  return { name: a.name, meshy: !!a.obj.userData.look?.meshy, meshes, tris: Math.round(tris), clips: a.glb?.clips || [], x: a.pos.x, z: a.pos.z };
});
console.log('pastor', JSON.stringify(r0));
if (r0) {
  // el jugador a 7 m, mirando al pastor (los paseantes lejanos no se mueven)
  const near = async () => p.evaluate(() => {
    const G = window.__game, a = window.__pastor, dx = 5, dz = 5, x = a.pos.x + dx, z = a.pos.z + dz;
    G.player.place(x, z, Math.atan2(-dx, -dz)); G.follow.snap(G.player);
  });
  await near(); await p.waitForTimeout(500);
  // el reloj del juego va muy lento en SwiftShader: se avanza a mano 6 s de su paseo
  const r1 = await p.evaluate(() => {
    const G = window.__game, a = window.__pastor, x0 = a.pos.x, z0 = a.pos.z; a.wait = 0;
    let clip = new Set(); for (let i = 0; i < 60; i++) { a.update(0.1, G.player); clip.add(a.glb?.currentName); }
    return { anduvo: Math.hypot(a.pos.x - x0, a.pos.z - z0).toFixed(2), clips: [...clip], estado: a.state };
  });
  console.log('paseo', JSON.stringify(r1));
  await near(); await p.waitForTimeout(1200);
  await p.screenshot({ path: out });
  // que salude
  await p.evaluate(() => { const a = window.__pastor; a.wave = 1.5; a.state = 'idle'; a.speed = 0; for (let i = 0; i < 8; i++) a.update(0.1, window.__game.player); return a.glb?.oneShot ? 'saluda' : a.glb?.currentName; }).then(s => console.log('saludo', s));
  await p.waitForTimeout(200); await near(); await p.waitForTimeout(300);
  await p.screenshot({ path: out.replace('.png', '-saluda.png') });
}
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores');
await b.close();
