// Cada pueblo, ya construido por el juego, guardado como modelo 3D (.glb) para abrirlo en otro motor (Unity con glTFast,
// Godot, Unreal, Blender): el terreno, las calles, las casas con todas sus piezas de detalle, la iglesia, el río, los
// árboles, el mobiliario, los vecinos y los animales. En la calidad más alta del juego (?q=high, texturas de hasta 4096,
// todo a la distancia de detalle máxima y sin el aligerado automático) y con los sombreadores del juego aparte
// (exportar/sombreadores, tools/exportar/glb-en-pagina.js). El cielo, las nubes y las partículas, no. Los vecinos van en
// su versión ligera, para situarlos: los modelos enteros están en exportar/modelos y exportar/originales.
// Medidas del juego: 1 unidad = 1 metro, Y hacia arriba, glTF (diestro); al importarlo en Unity, glTFast lo pasa a su
// sistema. Ver PORTAR.md.
// Con el servidor de desarrollo (5173):  node tools/exportar-pueblo.mjs [pueblo,pueblo…|todos] [carpeta]
//   (SOMBREADORES=carpeta para los sombreadores; por defecto, junto a la de los pueblos)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { traeBytes, guardaSombreadores } from './exportar/guardar.mjs';
const URL = process.env.URL || 'http://127.0.0.1:5173/', out = process.argv[3] || 'exportar/pueblos';
const SOMB = process.env.SOMBREADORES || path.join(path.dirname(out), 'sombreadores');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--max-old-space-size=8192'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
let ids = (process.argv[2] || 'lesaka').split(',');
if (ids[0] === 'todos') { const p = await ctx.newPage(); await p.goto(URL + 'lab/icons.html').catch(() => {}); ids = await p.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.map(l => l.id)); await p.close(); }
const res = [];
for (const id of ids) {
  if (process.env.SALTA === '1' && fs.existsSync(`${out}/${id}.glb`)) continue;
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  try {
    await p.addInitScript(() => { window.__exportar = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.removeItem('herrizherri-vista-corta');
      localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
    await p.goto(URL + '?skipintro=1&q=high', { timeout: 300000 });
    await p.waitForFunction(() => window.__hub?.visible && window.__ready && window.__rt, null, { timeout: 300000 });
    // (sin aligerar el pueblo aunque la tarjeta gráfica de pruebas vaya lenta)
    await p.evaluate(async () => { const { maxDetalle } = await import('/tools/exportar/glb-en-pagina.js'); maxDetalle(window.__rt); });
    await p.evaluate((id) => window.__hub.play(id), id);
    // (la pantalla de carga, ya fuera: «hidden», o sin clase después de «entra»)
    await p.waitForFunction(() => { const L = document.getElementById('loading'); return window.__game?.mode === 'play' && (!L || L.classList.contains('hidden') || L.className === '' || getComputedStyle(L).display === 'none'); }, null, { timeout: 400000, polling: 1000 });
    await p.evaluate(async () => { const { maxDetalle } = await import('/tools/exportar/glb-en-pagina.js'); maxDetalle(window.__rt); });
    await p.waitForTimeout(8000);   // (que el juego ponga de cerca los árboles, el suelo y los animales de todo el pueblo)
    const { info, ns } = await p.evaluate(async () => { const { escenaAGlb, compruebaGlb } = await import('/tools/exportar/glb-en-pagina.js');
      const r = await escenaAGlb(window.__game.scene, { renderer: window.__rt.renderer }); window.__glb = r.glb; window.__somb = r.sombreadores;
      return { ns: r.sombreadores.length, info: await compruebaGlb(r.glb).catch(e => ({ error: String(e.message || e).slice(0, 200) })) }; });
    const bytes = await traeBytes(p, '__glb'); fs.writeFileSync(`${out}/${id}.glb`, bytes);
    // (VALIDA=1: con el validador de Khronos; BORRA=1: se borra después, para probar todos sin llenar el disco)
    let val = null;
    if (process.env.VALIDA === '1') { const v = (await import('gltf-validator')).default; const r = await v.validateBytes(new Uint8Array(bytes), { maxIssues: 20, ignoredIssues: ['UNUSED_OBJECT'] });
      val = { errores: r.issues.numErrors, avisos: r.issues.numWarnings, primero: r.issues.messages.find(m => m.severity === 0)?.message?.slice(0, 120) }; }
    if (process.env.BORRA === '1') fs.unlinkSync(`${out}/${id}.glb`);
    guardaSombreadores(SOMB, await p.evaluate(() => window.__somb), 'pueblo:' + id);
    const r = { id, mb: +(bytes.length / 1048576).toFixed(1), ...info, sombreadores: ns, validador: val || undefined, erroresPagina: errs.slice(0, 3) }; res.push(r);
    console.log(`${id}.glb ${r.mb} MB · ${info.mallas} mallas · ${(info.triangulos / 1e6).toFixed(2)} M triángulos · ${ns} sombreadores${val ? ` · validador: ${val.errores} errores` : ''}${errs.length ? ' · errores: ' + errs.slice(0, 2).join(' | ') : ''}`);
  } catch (e) { res.push({ id, error: String(e.message || e).slice(0, 200) }); console.log(`${id}: MAL ${String(e.message || e).slice(0, 160)}`); }
  await p.close();
}
const fi = path.join(out, 'indice.json'), prev = fs.existsSync(fi) ? JSON.parse(fs.readFileSync(fi, 'utf8')) : [];
fs.writeFileSync(fi, JSON.stringify([...prev.filter(x => !res.some(y => y.id === x.id)), ...res], null, 1));
await b.close();
