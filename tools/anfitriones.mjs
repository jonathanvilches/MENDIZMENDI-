// ¿Están todos los personajes con los que se juega? En cada pueblo: quien da cada misión, el pelotari del frontón y la
// entrenadora de El Sadar existen, están a la vista (no ocultos ni bajo tierra) y no se han quedado dentro de una casa.
// Uso: node tools/anfitriones.mjs [pueblos]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const [,, only] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p0 = await b.newPage(); await p0.goto(URL + '/', { timeout: 300000 });
const ids = only ? only.split(',') : await p0.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.filter(l => !l.special).map(l => l.id));
await p0.close();
let malos = 0;
for (const id of ids) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  try {
    await p.goto(`${URL}/?town=${id}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => {
      const G = window.__game, gh = window.__hf.groundHeight, { COLLIDERS } = await import('/src/world/colliders.js');
      // dentro de una caja de choque (edificios, muros): a más de 15 cm del borde
      const inside = (a) => COLLIDERS.some(c => { if (c.type !== 'box' || c.ghost || c.actor) return false; const dx = a.pos.x - c.x, dz = a.pos.z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; return Math.abs(lx) < c.hw - 0.15 && Math.abs(lz) < c.hd - 0.15; });
      const check = (a, label) => {
        if (!a) return `${label}: no está`;
        const prob = [];
        let hidden = false; for (let o = a.obj; o; o = o.parent) if (o.visible === false && o !== a.obj) hidden = true;
        if (hidden || a.visible === false) prob.push('oculto');
        let meshes = 0; a.obj.traverse(o => { if (o.isMesh) meshes++; }); if (!meshes) prob.push('sin cuerpo');
        const dy = a.pos.y - gh(a.pos.x, a.pos.z); if (Math.abs(dy) > 0.6) prob.push(`altura ${dy.toFixed(1)}`);
        try { if (inside(a)) prob.push('dentro de un edificio'); } catch (e) { }
        return prob.length ? `${label} (${a.name}): ${prob.join(', ')}` : null;
      };
      const out = [];
      G.missions.forEach((M, i) => { const c = check(M.host, 'misión ' + (i + 1)); if (c) out.push(c); });
      if (G.fronton) { const c = check(G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, 'pelotari'); if (c) out.push(c); }
      if (G.sadar) { const c = check(G.coach, 'entrenadora'); if (c) out.push(c); }
      return { n: G.missions.length, fronton: !!G.fronton, out };
    });
    if (r.out.length || errs.length) malos++;
    console.log((r.out.length ? '✗ ' : '✓ ') + id, `${r.n} misiones${r.fronton ? ' + frontón' : ''}`, r.out.join(' · '), errs.length ? 'errores: ' + errs.join(' | ') : '');
  } catch (e) { console.log('✗ ' + id, 'no carga', e.message.slice(0, 100)); malos++; }
  await p.close();
}
console.log(malos ? `${malos} pueblos con problemas` : 'todos los personajes están en su sitio');
await b.close();
