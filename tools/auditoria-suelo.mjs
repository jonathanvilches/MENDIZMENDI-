// Auditoría: ¿está todo asentado en el suelo? Abre un pueblo o paraje, recorre la escena (instancias de rocas, matas,
// árboles, flores, y piezas sueltas) y, para cada objeto, compara lo más bajo de su caja con el suelo bajo su planta
// (centro y cuatro esquinas). «Flota» si entre su base y el punto más bajo del suelo de su planta queda un hueco que se
// ve (más de 12 cm, o el 8 % de su alto); «enterrado» si casi todo queda bajo tierra. Saca un resumen por grupo y los
// peores casos con su posición, para fotografiarlos.
// Uso: BASE=http://127.0.0.1:5176/ node tools/auditoria-suelo.mjs pueblo [pueblo…]   (salida JSON por pueblo)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const pueblos = process.argv.slice(2).length ? process.argv.slice(2) : ['bardenas-reales'];
for (const pueblo of pueblos) {
  // (un navegador por pueblo: con varios seguidos se quedaba sin memoria)
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
  try {
    await p.goto(`${BASE}?town=${pueblo}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => { const L = document.getElementById('loading'); return window.__game?.mode === 'play' && (!L || L.classList.contains('hidden')); }, null, { timeout: 400000, polling: 1000 });
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const rt = window.__rt, { terrainHeight: th } = await import('/src/world/heightfield.js');
      const T = rt.scene.children[0].constructor === Object ? null : null; // (sin uso)
      const M = new rt.camera.matrix.constructor(), W = new rt.camera.matrix.constructor(), v = new rt.camera.position.constructor();
      const grupos = {}, peores = [];
      // (el nombre: el suyo o el del primer padre con nombre, la forma y el material, para saber qué es)
      const nombre = (o) => { let n = o.name || ''; let q = o.parent; while (!n && q && q !== rt.scene) { n = q.name || ''; q = q.parent; } const m = Array.isArray(o.material) ? o.material[0] : o.material; return (n || 'sin nombre') + ' · ' + (o.geometry?.type || '') + ' · ' + (m?.name || m?.type || ''); };
      const mide = (o, mw, key, i) => {
        const bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox); if (!bb || !isFinite(bb.min.y)) return;
        // las 8 esquinas de la caja al mundo: lo más bajo y la planta (x, z mínimos y máximos)
        let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (let k = 0; k < 8; k++) { v.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).applyMatrix4(mw); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
        const alto = y1 - y0, ancho = Math.max(x1 - x0, z1 - z0); if (alto < 0.05 || ancho > 40 || alto > 60) return;
        // (con la planta encogida al 60 %: las copas y las matas son más anchas arriba que en su pie)
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) * 0.3, hz = (z1 - z0) * 0.3;
        let gmin = Infinity, gmax = -Infinity;
        for (const [dx, dz] of [[0, 0], [-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) { const g = th(cx + dx, cz + dz); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
        // (las rocas se miden por toda su planta; lo demás, árboles con su tronco, matas, postes, por el suelo del centro:
        // una copa ancha en la ladera no flota aunque bajo su borde el suelo baje)
        const roca = /roca/i.test(key), gc = th(cx, cz);
        const hueco = roca ? y0 - gmin : y0 - gc, ent = (gmax - y0) / alto;
        const G = grupos[key] || (grupos[key] = { n: 0, flota: 0, enterrado: 0, huecoMax: 0, ej: null }); G.n++;
        if (hueco > 4) { G.n--; return; }   // (lo que va por el aire a propósito: pájaros, nubes, rótulos)
        if (hueco > Math.max(0.12, alto * 0.08)) { G.flota++; if (hueco > G.huecoMax) G.ej = [+cx.toFixed(1), +cz.toFixed(1)]; G.huecoMax = Math.max(G.huecoMax, +hueco.toFixed(2)); peores.push({ key, i, x: +cx.toFixed(1), z: +cz.toFixed(1), y: +y0.toFixed(2), hueco: +hueco.toFixed(2), alto: +alto.toFixed(2), pendiente: +((gmax - gmin) / Math.max(0.5, ancho * 0.6)).toFixed(2) }); }
        else if (ent > 0.85) G.enterrado++;
      };
      rt.scene.updateMatrixWorld(true);
      rt.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry || o.visible === false) return;
        const key = nombre(o); if (/terreno|terrain|sky|cielo|agua|water|nube|cloud|lluvia|rain|pajarillos|^Body|^Head|\|/i.test(key) || /MeshBasic/.test(key)) return;   // (lo que no recibe luz: rótulos, marcas, sombras pintadas)
        if (o.isSkinnedMesh) return;
        // (las personas y animales con huesos, y sus piezas: los coloca su andar)
        for (let q = o.parent; q; q = q.parent) if (q.isBone || q.userData?.npc || q.userData?.animal) return;
        if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); W.multiplyMatrices(o.matrixWorld, M); mide(o, W, key, i); } }
        else mide(o, o.matrixWorld, key, -1);
      });
      peores.sort((a, b) => b.hueco - a.hueco);
      const g = Object.entries(grupos).filter(([, G]) => G.flota || G.enterrado).sort((a, b) => b[1].flota - a[1].flota).slice(0, 25);
      return { grupos: Object.fromEntries(g), total: Object.values(grupos).reduce((s, G) => s + G.n, 0), peores: peores.slice(0, 30) };
    });
    console.log(JSON.stringify({ pueblo, ...r, errores: errs.slice(0, 3) }));
  } catch (e) { console.log(JSON.stringify({ pueblo, fallo: e.message.slice(0, 200) })); }
  await p.close(); await b.close();
}
