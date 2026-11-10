// Puntos de control: las mismas fotos de siempre, para comparar antes y después de un cambio de arte, luz o atmósfera.
// De cada pueblo, dos vistas fijas (a pie de calle desde la puerta, mirando a la plaza, y desde arriba, con el pueblo
// y su paisaje) en cuatro condiciones: de día (12 h), al atardecer (19:10), de noche (23 h) y con lluvia (12 h).
// Con cada foto apunta lo que pinta (triángulos y llamadas de dibujo) y, por pueblo, lo que tarda en cargar.
//   node tools/puntos-control.mjs <carpeta> <etiqueta> [pueblos,separados,por,comas] [calidad: low|mid|high] [condiciones]
//   BASE: por defecto la web compilada, http://127.0.0.1:8099/ (con vite, http://127.0.0.1:5173/)
// Deja <carpeta>/<etiqueta>-<pueblo>-<condición>-<vista>.jpg y <carpeta>/<etiqueta>-<calidad>.json con las medidas.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const [, , out = 'entrega/puntos-control', tag = 'antes', lista = 'lesaka,isaba-izaba,pamplona,estella,olite,tudela', q = 'low', conds = 'dia,tarde,noche,lluvia'] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:8099/';
const HORA = { dia: 12, tarde: 19.17, noche: 23, lluvia: 12 };
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const medidas = { etiqueta: tag, calidad: q, base: BASE, pueblos: {} };
for (const town of lista.split(',')) {
  const M = medidas.pueblos[town] = { fotos: {}, errores: [] };
  for (const tiempo of ['clear', 'rain']) {
    const cs = conds.split(',').filter(c => (c === 'lluvia') === (tiempo === 'rain')); if (!cs.length) continue;
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', e => M.errores.push(e.message.slice(0, 160)));
    await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pastor', seen: { heroBenat: true, dog: true }, dogOn: false })); });
    const t0 = Date.now();
    try {
      await p.goto(`${BASE}?town=${town}&q=${q}&weather=${tiempo}&skipintro=1&t=12`, { timeout: 300000 });
      await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
    } catch (e) { M.errores.push('no cargó: ' + e.message.slice(0, 80)); await p.close(); continue; }
    if (tiempo === 'clear') M.cargaS = +((Date.now() - t0) / 1000).toFixed(1);
    await p.waitForTimeout(4000);
    // la cámara, fija donde toca: se coloca justo antes de dibujar, que el juego la mueve en cada imagen
    await p.evaluate(() => {
      const G = window.__game, r = window.__rt.renderer, hf = window.__hf, L = window.__layout, P = G.player.pos.clone(), pl = L?.PLACES?.plaza || { x: P.x + 30, z: P.z };
      let dx = pl.x - P.x, dz = pl.z - P.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      const ax = pl.x - dx * 46, az = pl.z - dz * 46;
      window.__vistas = {
        calle: { x: P.x, y: P.y + 1.7, z: P.z, lx: P.x + dx * 30, ly: P.y + 3.2, lz: P.z + dz * 30 },
        alto: { x: ax, y: Math.max(hf.groundHeight(ax, az), hf.groundHeight(pl.x, pl.z)) + 22, z: az, lx: pl.x, ly: hf.groundHeight(pl.x, pl.z) + 4, lz: pl.z },
      };
      window.__rr = r.render.bind(r);
      r.render = (sc, cam) => { const t = window.__vista; if (t && cam === G.camera) { cam.position.set(t.x, t.y, t.z); cam.lookAt(t.lx, t.ly, t.lz); cam.updateMatrixWorld(true); } return window.__rr(sc, cam); };
      const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none'; G.ui?.hudVisible?.(false);
      if (G.player?.obj) G.player.obj.visible = false; window.__rt.sky.speed = 0;
    });
    for (const c of cs) {
      await p.evaluate((h) => { window.__rt.sky.time = h; }, HORA[c]);
      // (la lluvia entra poco a poco con el tiempo de juego y aquí, sin tarjeta gráfica, el juego va a dos imágenes por
      // segundo: se pone ya lloviendo del todo, y que no escampe mientras se hacen las fotos)
      if (c === 'lluvia') await p.evaluate(() => { const W = window.__rt.weather; if (W) { W.raining = true; W.phaseT = 1e6; W.k = 1; } });
      for (const v of ['calle', 'alto']) {
        await p.evaluate((v) => { window.__vista = window.__vistas[v]; }, v);
        await p.waitForTimeout(c === 'lluvia' && v === 'calle' ? 9000 : 4500);
        const inf = await p.evaluate(() => { const i = window.__rt.renderer.info; return { tri: i.render.triangles, llamadas: i.render.calls, tex: i.memory.textures, geo: i.memory.geometries }; });
        await p.screenshot({ path: `${out}/${tag}-${town}-${c}-${v}.jpg`, quality: 84 });
        M.fotos[`${c}-${v}`] = inf; console.log(town, c, v, JSON.stringify(inf));
      }
    }
    await p.close();
  }
  if (M.errores.length) console.log(town, 'errores', JSON.stringify(M.errores.slice(0, 4)));
}
writeFileSync(`${out}/${tag}-${q}.json`, JSON.stringify(medidas, null, 1));
await b.close();
