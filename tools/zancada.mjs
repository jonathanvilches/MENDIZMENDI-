// Zancada de los clips de andar y correr de cada personaje: cuánto recorre un pie hacia atrás mientras pisa (en m, ya a
// su altura en el juego) y la velocidad a la que el clip «anda» sin patinar. Con eso se ajusta el ritmo de las piernas.
// Uso: node tools/zancada.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
console.log(await p.evaluate(async () => {
  const THREE = window.__THREE, { loadMeshy, loadKayKit, GlbChar } = await import('/src/actors/glbChar.js'), out = [];
  const meas = (g, label) => { const c = new GlbChar(g, {}); c.root.scale.setScalar(g.userData.fit || 1);
    const B = {}; c.root.traverse(o => { if (o.isBone) B[o.name] = o; });
    const foot = B.mixamorigLeftFoot || B.footl || B['foot.l'] || Object.values(B).find(b => /foot/i.test(b.name) && /l/i.test(b.name));
    for (const n of ['Walk', 'Run']) {
      const a = c.actions[n]; if (!a) continue; const clip = a.getClip(); c.mixer.stopAllAction(); a.reset().play();
      const zs = [], ys = [], v = new THREE.Vector3(); const N = 60;
      for (let i = 0; i <= N; i++) { c.mixer.setTime(clip.duration * i / N); c.root.updateMatrixWorld(true); foot.getWorldPosition(v); zs.push(v.z); ys.push(v.y); }
      // pisa cuando el pie está abajo (el 40 % más bajo): recorrido hacia atrás en ese tramo
      const ymin = Math.min(...ys), ymax = Math.max(...ys), low = ys.map(y => y < ymin + (ymax - ymin) * 0.25);
      let zin = [], best = 0; for (let i = 0; i <= N; i++) if (low[i]) zin.push(zs[i]);
      const D = Math.max(...zs) - Math.min(...zs), Dst = zin.length ? Math.max(...zin) - Math.min(...zin) : 0;
      out.push(`${label} ${n}: dura ${clip.duration.toFixed(2)} s, recorrido del pie ${D.toFixed(2)} m (pisando ${Dst.toFixed(2)} m), velocidad natural ≈ ${(2 * D / clip.duration).toFixed(2)} m/s`);
    }
    c.dispose?.(); };
  for (const n of ['sanfermin', 'pastor', 'osasuna', 'pelotari']) meas(await loadMeshy(n), n);
  const kk = await loadKayKit('Ranger'); meas(kk, 'KayKit');
  return out.join('\n');
}));
await b.close();
