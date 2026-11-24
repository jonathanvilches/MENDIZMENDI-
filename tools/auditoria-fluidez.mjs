// ¿Dónde se para el juego? Entra en cada pueblo como un jugador y mide, por separado:
//  1. La lógica (rt.step: personaje, cámara, vecinos, animales, misiones, cielo, sonido), con el bucle parado y avanzando
//     el juego a mano a 60 imágenes por segundo mientras el jugador anda y corre cambiando de rumbo: cuánto tarda cada
//     fotograma, los que pasan de 16 ms (a 60 imágenes por segundo no caben) y las funciones que más tiempo se llevan
//     (perfil del procesador de Chrome, por tiempo propio). Esto es lo mismo en cualquier aparato, solo que más lento.
//  2. El dibujo en el procesador (three.js preparando cada imagen: recorrer la escena, ordenar, mandar las llamadas), con
//     el bucle de verdad. La gráfica de software de las pruebas no cuenta: lo que tarda la tarjeta no se mide aquí.
// Antes se espera a que estén compilados todos los sombreadores del arranque (con la gráfica de software, minutos): si no,
// lo que sale son esperas de compilación que en un aparato de verdad no pasan.
// Con el servidor de desarrollo (5173):  node tools/auditoria-fluidez.mjs [pueblo,pueblo…] [fotogramas]   (Q=low para la
// calidad del móvil; por defecto la del ordenador, high; SALIDA=carpeta guarda fluidez-<pueblo>-<q>.json)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [,, lista = 'lesaka', nf = '900'] = process.argv, Q = process.env.Q || 'high', SALIDA = process.env.SALIDA;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const perfil = (profile) => {
  const self = new Map(), dt = profile.timeDeltas || [], porNodo = new Map();
  profile.samples.forEach((id, k) => porNodo.set(id, (porNodo.get(id) || 0) + (dt[k] || 0)));
  for (const n of profile.nodes) { const t = porNodo.get(n.id) || 0, c = n.callFrame; if (!t || /^\((idle|program)\)$/.test(c.functionName)) continue;
    const f = (c.url || '').replace(/^.*?\/(src|node_modules|tools)\//, '$1/').replace(/\?.*$/, '').replace(/\.vite\/deps\/three\.module-\w+\.js/, 'three');
    const k = `${c.functionName || '(anónima)'} ${f}:${c.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + t); }
  const total = [...self.values()].reduce((x, y) => x + y, 0);
  return [...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([k, t]) => `${(t / total * 100).toFixed(1).padStart(5)}% ${(t / 1000).toFixed(0).padStart(5)} ms  ${k}`);
};
for (const pueblo of lista.split(',')) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es');
    localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
  try {
    const t0 = Date.now();
    await p.goto(`http://127.0.0.1:5173/?town=${pueblo}&q=${Q}&weather=clear&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => { const L = document.getElementById('loading'); return window.__game?.mode === 'play' && (!L || L.classList.contains('hidden') || getComputedStyle(L).display === 'none'); }, null, { timeout: 400000, polling: 1000 });
    const carga = Math.round((Date.now() - t0) / 1000);
    await p.waitForFunction(() => { const rt = window.__rt, P = rt.renderer.info.programs || []; return !rt.holds && P.length && P.every(x => x.isReady ? x.isReady() : true); }, null, { timeout: 400000, polling: 2000 }).catch(() => {});
    const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    // 1. la lógica, a mano
    await cdp.send('Profiler.start');
    const logica = await p.evaluate((nf) => {
      const rt = window.__rt, G = window.__game, rumbos = [['w'], ['w', 'shift'], ['w', 'a'], ['w', 'shift', 'd'], ['w', 'd'], ['w', 'shift', 'a']], ts = [], tm = [];
      rt.active = false; const mem0 = performance.memory?.usedJSHeapSize || 0;
      // (cada parte de la lógica, por separado: cuánto se lleva de media y en el peor fotograma)
      const partes = { jugador: [rt.player, 'update'], camara: [rt.follow, 'update'], juego: [G, 'update'], suelo: [rt.terrain, 'update'], cielo: [rt.sky, 'update'],
        tiempo: [rt.weather, 'update'], agua: [rt.water, 'update'], naturaleza: [rt.nature, 'update'], fauna: [rt.fauna, 'update'], particulas: [rt.particles, 'update'],
        humo: [rt.smoke, 'update'], luces: [rt.lights, 'update'], baliza: [rt.beacon, 'update'], sonido: [rt.sound, 'update'], reloj: [G.ui, 'setClock'] };
      const T = {}, orig = [];
      for (const [k, [o, m]] of Object.entries(partes)) { if (!o?.[m]) continue; const f = o[m]; orig.push([o, m, f]); T[k] = { s: 0, max: 0, n: 0 };
        o[m] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { const d = performance.now() - t; T[k].s += d; T[k].n++; if (d > T[k].max) T[k].max = d; } }; }
      for (let i = 0; i < nf; i++) {
        if (i % 180 === 0) { G.input.keys.clear(); rumbos[(i / 180) % rumbos.length].forEach(k => G.input.keys.add(k)); }
        let t = performance.now(); rt.step(1 / 60, G, G.input); G.input.endFrame?.(); ts.push(performance.now() - t);
        t = performance.now(); rt.scene.updateMatrixWorld(); tm.push(performance.now() - t);
      }
      G.input.keys.clear(); rt.active = true; rt.clock.getDelta(); for (const [o, m, f] of orig) o[m] = f;
      const porParte = Object.fromEntries(Object.entries(T).sort((a, b) => b[1].s - a[1].s).map(([k, v]) => [k, `${(v.s / Math.max(1, v.n)).toFixed(2)} ms, máx ${v.max.toFixed(1)}`]));
      const est = (a) => { const s = [...a].sort((x, y) => x - y), q = (f) => +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(2);
        return { media: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1), mas16: a.filter(x => x > 16).length, mas8: a.filter(x => x > 8).length }; };
      return { fotogramas: nf, step: est(ts), matrices: est(tm), porParte, memoriaMB: [Math.round(mem0 / 1048576), Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576)] };
    }, +nf);
    const { profile } = await cdp.send('Profiler.stop');
    // 2. el dibujo, con el bucle de verdad, 10 s
    const dibujo = await p.evaluate(async () => {
      const rt = window.__rt, td = [], largos = [], P0 = rt.renderer.info.programs.length;
      const f = rt.renderer.render.bind(rt.renderer); rt.renderer.render = (...a) => { const t = performance.now(); try { return f(...a); } finally { td.push(performance.now() - t); } };
      let ob; try { ob = new PerformanceObserver(l => { for (const e of l.getEntries()) largos.push(Math.round(e.duration)); }); ob.observe({ type: 'longtask' }); } catch (e) { }
      await new Promise(r => setTimeout(r, 10000)); rt.renderer.render = f; ob?.disconnect();
      const s = [...td].sort((x, y) => x - y), inf = rt.renderer.info;
      return { imagenes: td.length, p50: +(s[s.length >> 1] || 0).toFixed(1), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(1), parones: largos.length,
        llamadas: inf.render.calls, triangulos: inf.render.triangles, programas: inf.programs.length, programasNuevos: inf.programs.length - P0, geometrias: inf.memory.geometries, texturas: inf.memory.textures };
    });
    const r = { pueblo, q: Q, cargaS: carga, logica, dibujo, funciones: perfil(profile), errores: errs.slice(0, 3) };
    console.log(`\n== ${pueblo} (q=${Q}; cargado en ${carga} s)`); console.log(JSON.stringify({ logica, dibujo })); console.log(r.funciones.join('\n'));
    if (SALIDA) { fs.mkdirSync(SALIDA, { recursive: true }); fs.writeFileSync(path.join(SALIDA, `fluidez-${pueblo}-${Q}.json`), JSON.stringify(r, null, 1)); }
  } catch (e) { console.log(`${pueblo}: MAL ${String(e.message || e).slice(0, 160)}`); }
  await ctx.close();
}
await b.close();
