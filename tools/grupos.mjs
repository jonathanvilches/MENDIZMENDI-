// Los grupos de la escena que más triángulos dibujan (contando instancias), con los nombres de lo que llevan dentro.
// Uso: node tools/grupos.mjs [pueblo] [calidad]
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'high'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173/'}?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const r = await p.evaluate(() => {
  const S = window.__rt.scene, out = [];
  const tri = (m) => { const g = m.geometry; return (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); };
  const walk = (o, depth, path) => {
    let t = 0, n = 0; const names = new Map();
    o.traverse(m => { if (m.isMesh && m.visible) { let v = true; for (let x = m; x && x !== o.parent; x = x.parent) if (!x.visible) v = false; if (!v) return; const k = tri(m); t += k; n++; const nm = (m.name || m.material?.name || m.type) + (m.isInstancedMesh ? '×' + m.count : ''); names.set(nm, (names.get(nm) || 0) + k); } });
    return { t, n, names: [...names].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${(v / 1000).toFixed(0)}k`) };
  };
  for (const o of S.children) { if (!o.visible) continue; const w = walk(o); if (w.t > 20000) out.push([w.t, (o.name || o.type) + ' (' + w.n + ' mallas)', w.names.join(', ')]); }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, 20).map(([t, k, s]) => `${(t / 1e6).toFixed(2)} M  ${k}: ${s}`);
});
console.log(town, q); console.log(r.join('\n'));
await b.close();
