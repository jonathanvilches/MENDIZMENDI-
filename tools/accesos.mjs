// Accesos: desde la plaza, ¿se llega andando a cada vecino, a cada anfitrión de misión y a cada objeto que hay que
// recoger? Recorre una rejilla de 0,3 m con las mismas reglas que el personaje (choques, escalones de más de 36 cm,
// agua de más de 95 cm) y lista lo que queda aislado.
// Uso: node tools/accesos.mjs <pueblo> [pueblo...]
import { chromium } from 'playwright-core';
const towns = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns) {
  const p = await browser.newPage({ viewport: { width: 640, height: 360 } });
  p.on('pageerror', e => console.log('PAGEERROR', town, e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
  const r = await p.evaluate(async () => {
    const C = await import('/src/world/colliders.js'), H = await import('/src/world/heightfield.js');
    const G = window.__game, P = window.__layout.PLACES, R = 0.35, S = 0.3;
    const solidFree = (x, z) => { for (const c of C.nearby(x, z, R + 2)) { if (c.ghost || c.mover) continue;
      if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + R) return false; continue; }
      const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      const px = Math.max(-c.hw, Math.min(c.hw, lx)), pz = Math.max(-c.hd, Math.min(c.hd, lz)); if (Math.hypot(lx - px, lz - pz) < R) return false; } return true; };
    const T = [];
    const add = (kind, name, x, z) => { if (Number.isFinite(x) && Number.isFinite(z)) T.push({ kind, name, x, z }); };
    for (const a of G.actors || []) add('vecino', a.name || a.def?.name || '?', a.pos.x, a.pos.z);
    for (const M of G.missions || []) if (M.host?.pos) add('anfitrión', (M.title || M.type) + ' · ' + (M.host.name || ''), M.host.pos.x, M.host.pos.z);
    for (const it of G.items || []) add('objeto', (it.M?.title || it.M?.type || '') + ' · ' + (it.name || it.kind || ''), it.x, it.z);
    const sx = P.plaza.x, sz = P.plaza.z;
    let x0 = sx, x1 = sx, z0 = sz, z1 = sz; for (const t of T) { x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x); z0 = Math.min(z0, t.z); z1 = Math.max(z1, t.z); }
    x0 -= 25; z0 -= 25; x1 += 25; z1 += 25;
    const nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S), N = nx * nz;
    const gH = new Float32Array(N), ok = new Uint8Array(N), seen = new Uint8Array(N);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S, k = j * nx + i, g = H.groundHeight(x, z); gH[k] = g;
      ok[k] = solidFree(x, z) && (H.bridgeAt(x, z) || H.waterLevelAt(x, z) - g <= 0.95) ? 1 : 0; }
    // salida: la celda libre más cercana a la plaza
    let start = -1, bd = 1e9; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (!ok[k]) continue; const d = Math.hypot(x0 + i * S - sx, z0 + j * S - sz); if (d < bd) { bd = d; start = k; } }
    const q = new Int32Array(N); let h = 0, t = 0; q[t++] = start; seen[start] = 1;
    while (h < t) { const k = q[h++], i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const n = b * nx + a;
        if (seen[n] || !ok[n]) continue; if (gH[n] - gH[k] > 0.36) continue; seen[n] = 1; q[t++] = n; } }
    // un objetivo se alcanza si hay una celda alcanzada a menos de 1,6 m (se habla o se recoge desde cerca)
    const out = [];
    for (const tg of T) { let best = 1e9; const ci = Math.round((tg.x - x0) / S), cj = Math.round((tg.z - z0) / S), rr = Math.ceil(6 / S);
      for (let b = Math.max(0, cj - rr); b <= Math.min(nz - 1, cj + rr); b++) for (let a = Math.max(0, ci - rr); a <= Math.min(nx - 1, ci + rr); a++) if (seen[b * nx + a]) best = Math.min(best, Math.hypot(x0 + a * S - tg.x, z0 + b * S - tg.z));
      if (best > 1.6) out.push(`${tg.kind} ${tg.name} (${tg.x.toFixed(1)}, ${tg.z.toFixed(1)}) a ${best > 1e8 ? '>6' : best.toFixed(1)} m de lo alcanzable`); }
    return { total: T.length, reached: t, cells: N, out };
  });
  console.log(`== ${town}: ${r.total} objetivos, ${r.out.length} sin acceso`); for (const l of r.out) console.log('  ' + l);
  await p.close();
}
await browser.close();
