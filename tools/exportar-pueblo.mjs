// Cada pueblo, ya construido por el juego, guardado como modelo 3D (.glb) para abrirlo en otro motor (Unity con glTFast,
// Godot, Unreal, Blender): el terreno, las calles, las casas, la iglesia, el río, los árboles, el mobiliario, los vecinos y
// los animales, tal como salen al entrar. Los materiales propios del juego salen como estándar con su color y su textura
// (tools/exportar/glb-en-pagina.js); el cielo, las nubes y las partículas, no. Medidas del juego: 1 unidad = 1 metro, Y
// hacia arriba, glTF (diestro); al importarlo en Unity, glTFast lo pasa a su sistema. Ver PORTAR.md.
// Con el servidor de desarrollo (5173):  node tools/exportar-pueblo.mjs [pueblo,pueblo…|todos] [carpeta]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const URL = process.env.URL || 'http://127.0.0.1:5173/', out = process.argv[3] || 'exportar/pueblos';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
let ids = (process.argv[2] || 'lesaka').split(',');
if (ids[0] === 'todos') { const p = await ctx.newPage(); await p.goto(URL + 'lab/icons.html').catch(() => {}); ids = await p.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.map(l => l.id)); await p.close(); }
for (const id of ids) {
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { window.__exportar = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
  await p.goto(URL + '?skipintro=1', { timeout: 300000 });
  await p.waitForFunction(() => window.__hub?.visible && window.__ready, null, { timeout: 300000 });
  await p.evaluate((id) => window.__hub.play(id), id);
  await p.waitForFunction(() => { const L = document.getElementById('loading'); return window.__game?.mode === 'play' && (!L || L.classList.contains('hidden')); }, null, { timeout: 300000, polling: 1000 });
  await p.waitForTimeout(4000);
  const { n, info } = await p.evaluate(async () => { const { escenaAGlb, compruebaGlb } = await import('/tools/exportar/glb-en-pagina.js'); window.__glb = await escenaAGlb(window.__game.scene);
    return { n: window.__glb.length, info: await compruebaGlb(window.__glb).catch(e => ({ error: String(e.message || e).slice(0, 200) })) }; });
  const partes = []; for (let i = 0; i < n; i += 8 << 20) partes.push(Buffer.from(await p.evaluate(([a, z]) => { let s = ''; const u = window.__glb.subarray(a, z); for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000)); return btoa(s); }, [i, Math.min(n, i + (8 << 20))]), 'base64'));
  fs.writeFileSync(`${out}/${id}.glb`, Buffer.concat(partes));
  console.log(`${id}.glb ${(n / 1048576).toFixed(1)} MB ${JSON.stringify(info)}${errs.length ? ' · errores: ' + errs.slice(0, 2).join(' | ') : ''}`);
  await p.close();
}
await b.close();
