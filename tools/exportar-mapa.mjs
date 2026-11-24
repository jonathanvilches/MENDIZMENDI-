// El mapa del inicio (Navarra en 3D) y la isla flotante de cada comarca, como modelos 3D (.glb) para otro motor, en la
// calidad más alta (?q=high, con el relieve fino ya metido en la malla y texturas de hasta 4096), y sus sombreadores aparte
// (exportar/sombreadores). Escala del mapa: 1 unidad = unos 2 km (src/hub/mapa3dFormas.js: S = 0,1 unidades por cada
// unidad del mapa de comarcas, de 207 m), el relieve exagerado (EXA). Para hacer el mapa en Unity con el relieve de verdad,
// mejor las alturas de exportar/relieve; esto es la referencia de cómo se ve. Ver PORTAR.md.
// Con el servidor de desarrollo (5173):  node tools/exportar-mapa.mjs [carpeta]   (por defecto exportar/mapa; SOLO=baztan,… )
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { traeBytes, guardaSombreadores } from './exportar/guardar.mjs';
const URL = process.env.URL || 'http://127.0.0.1:5173/', out = process.argv[2] || 'exportar/mapa', SOMB = process.env.SOMBREADORES || path.join(path.dirname(out), 'sombreadores');
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--max-old-space-size=8192'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { window.__exportar = true; localStorage.setItem('herrizherri-lang', 'es');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto(URL + '?skipintro=1&q=high', { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip[data-sel]').length > 3, null, { timeout: 300000 });
await p.waitForTimeout(12000);   // (el relieve fino y las texturas, cargados)
const res = [];
const exporta = async (nombre, nombres) => {
  const r = await p.evaluate(async (nombres) => { const { escenaAGlb, compruebaGlb } = await import('/tools/exportar/glb-en-pagina.js'); const M = window.__mapa3d;
    // (una isla: sus piezas, aunque estén escondidas; si no, la escena entera)
    let raiz = M.scene, vis = [];
    if (nombres) { raiz = nombres.map(n => M.scene.getObjectByName(n)).filter(Boolean); if (!raiz.length) return { error: 'no está' }; for (const o of raiz) { vis.push([o, o.visible]); o.visible = true; } }
    try { const x = await escenaAGlb(raiz, { renderer: M.ren }); window.__glb = x.glb; window.__somb = x.sombreadores; return { ns: x.sombreadores.length, ...(await compruebaGlb(x.glb).catch(e => ({ error: String(e.message || e).slice(0, 160) }))) }; }
    finally { for (const [o, v] of vis) o.visible = v; } }, nombres);
  if (r.error && !r.mallas) { console.log(nombre, 'MAL', r.error); res.push({ nombre, error: r.error }); return; }
  const bytes = await traeBytes(p, '__glb'); fs.writeFileSync(path.join(out, nombre + '.glb'), bytes);
  guardaSombreadores(SOMB, await p.evaluate(() => window.__somb), 'mapa:' + nombre);
  const e = { nombre, mb: +(bytes.length / 1048576).toFixed(1), ...r }; res.push(e);
  console.log(`${nombre}.glb ${e.mb} MB · ${r.mallas} mallas · ${(r.triangulos / 1e6).toFixed(2)} M triángulos · ${r.ns} sombreadores · medidas ${r.medidas}`);
};
if (!SOLO) await exporta('navarra', null);
// cada comarca: se elige (como al tocar su ficha), se espera a que su isla esté hecha y subida, y se guardan sus piezas
const chips = await p.evaluate(() => [...document.querySelectorAll('.m3-chip[data-sel]')].map(e => e.dataset.sel));
for (let i = 0; i < chips.length; i++) {
  const id = chips[i]; if (SOLO && !SOLO.includes(id)) continue;
  await p.evaluate((i) => document.querySelectorAll('.m3-chip[data-sel]')[i].click(), i);
  await p.waitForFunction((id) => { const M = window.__mapa3d, o = M.scene.getObjectByName('isla-' + id); return o && o.children.length && !M.obra?.() && M.subida() > 0.98; }, id, { timeout: 240000, polling: 1000 }).catch(() => {});
  await p.waitForTimeout(4000);
  await exporta('isla-' + id, ['isla-' + id, 'canto-' + id, 'sima-' + id]);
}
fs.writeFileSync(path.join(out, 'indice.json'), JSON.stringify({ exportado: new Date().toISOString().slice(0, 10), escala: '1 unidad ≈ 2,07 km; relieve exagerado', res, errores: errs.slice(0, 10) }, null, 1));
await b.close();
