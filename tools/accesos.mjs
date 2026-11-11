// Accesos: desde donde aparece el jugador y desde la plaza, ¿se llega andando a cada vecino, a cada anfitrión de misión
// (también los de los pasos siguientes) y a cada objeto que hay que recoger, lo bastante cerca para hablar o cogerlo?
// Recorre una rejilla de 0,25 m (algo más en los pueblos grandes) con las mismas reglas que el personaje (actors/player.js): los choques, también los
// vecinos que están quietos (un vecino plantado en una calle estrecha la cierra); los escalones de más de 36 cm con
// cuesta de más de 1,25; el agua de más de 95 cm fuera de los puentes; y el límite del mundo. Sin trepar ni nadar, que
// no todos saben (la aventura). Un objetivo vale si alguna celda alcanzada queda dentro de su radio de hablar o de coger
// (el de townGame.interactables, menos 0,3 m de margen). Lista lo que queda aislado y por qué lo tapa, y lo que pide un
// rodeo exagerado (más de 2,2 veces la línea recta y 120 m, como world/acceso.js); y lo que el juego movió al montar el
// pueblo (townGame.repasaAccesos). La rejilla cubre todo el mundo, hasta el límite: hay rodeos que salen del pueblo.
// Uso: node tools/accesos.mjs <pueblo|todos> [pueblo...]   (URL=http://127.0.0.1:5173; JSON=archivo para el resultado)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const TODOS = ['lesaka', 'etxalar', 'zugarramurdi', 'amaiur-maya-del-baztan', 'ituren', 'elizondo', 'senorio-bertiz', 'leitza', 'lekunberri', 'sierra-aralar',
  'orreaga-roncesvalles', 'aribe', 'otsagabia-ochagavia', 'isaba-izaba', 'erronkari-roncal', 'burgui-burgi', 'selva-irati', 'altsasu-alsasua', 'irurtzun', 'sierra-urbasa',
  'pamplona', 'bosque-orgi', 'irulegi', 'aoiz', 'lumbier', 'sanguesa', 'javier', 'estella', 'viana', 'puente-la-reina', 'artajona', 'tafalla', 'ujue', 'olite',
  'marcilla', 'tudela', 'cortes', 'sotos-ebro'];
let towns = process.argv.slice(2); if (!towns.length || towns[0] === 'todos') towns = TODOS;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const RES = {};
for (const town of towns) {
  const p = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); } catch (e) { } });
  try {
    await p.goto(`${URL}/?town=${town}&q=low&skipintro=1&weather=clear&t=12`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
    await p.waitForTimeout(2500);
  } catch (e) { console.log(`== ${town}: no carga (${e.message.split('\n')[0]})`); RES[town] = { error: e.message }; await p.close(); continue; }
  const r = await p.evaluate(async () => {
    const C = await import('/src/world/colliders.js'), H = await import('/src/world/heightfield.js'), L = await import('/src/world/layout.js');
    const G = window.__game, P = window.__layout?.PLACES || {}, R = (G.player?.radius ?? 0.35), B = L.BOUNDARY || 462;
    // los vecinos quietos estorban como el personaje los ve (resolve): un círculo de su radio
    const quietos = (C.MOVERS || []).filter(c => { const a = c.actor; return a && !c.ghost && a.obj?.parent && a.visible !== false && !(a.route || a.wander > 0); });   // (los que pasean se apartan)
    const tapa = (x, z) => {
      for (const c of C.nearby(x, z, R + 2)) { if (c.ghost) continue;
        if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + R) return c; continue; }
        const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        const px = Math.max(-c.hw, Math.min(c.hw, lx)), pz = Math.max(-c.hd, Math.min(c.hd, lz)); if (Math.hypot(lx - px, lz - pz) < R) return c; }
      for (const c of quietos) if (Math.hypot(x - c.x, z - c.z) < c.r + R) return c;
      return null; };
    // los objetivos: cada uno con su radio de hablar o coger (townGame.interactables) y quién es, para no taparse a sí mismo
    const T = [], add = (kind, name, x, z, rad, self) => { if (Number.isFinite(x) && Number.isFinite(z)) T.push({ kind, name, x, z, rad, self }); };
    for (const a of G.actors || []) if (a.visible !== false) add('vecino', a.name || a.def?.name || '?', a.pos.x, a.pos.z, 3, a.collider);
    for (const a of G.walkers || []) add('paseante', a.name || '?', a.pos.x, a.pos.z, a.info || a.jobs ? 3 : 2.4, a.collider);
    for (const M of G.missions || []) {
      if (M.host?.pos) add('anfitrión', `${M.title || M.type} · ${M.host.name || ''}`, M.host.pos.x, M.host.pos.z, 3, M.host.collider);
      for (const k of ['back', 'ret', 'end', 'giver2', 'host2']) { const h = M[k]; if (h?.pos && h !== M.host) add('paso', `${M.title || M.type} · ${h.name || k}`, h.pos.x, h.pos.z, 3, h.collider); }
      if (M.bench) add('taller', M.title || M.type, M.bench.x, M.bench.z, 3);
      if (M.memo) add('recuerdo', M.title || M.type, M.memo.x, M.memo.z, 2.8);
    }
    for (const it of G.items || []) add('objeto', `${it.M?.title || it.M?.type || ''} · ${it.name || it.kind || ''}`, it.x, it.z, 2.2);
    for (const k of G.clues || []) add('pista', k.M?.title || 'pista', k.x, k.z, 2.6);
    // de dónde se sale: donde está el jugador al llegar y la plaza
    const starts = [[G.player.pos.x, G.player.pos.z, 'llegada']]; if (P.plaza) starts.push([P.plaza.x, P.plaza.z, 'plaza']);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const t of [...T, ...starts.map(s => ({ x: s[0], z: s[1] }))]) { x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x); z0 = Math.min(z0, t.z); z1 = Math.max(z1, t.z); }
    // (todo el mundo, hasta el límite: un camino que da la vuelta puede salir de lo que ocupan los objetivos)
    x0 = Math.min(x0 - 30, -B); z0 = Math.min(z0 - 30, -B); x1 = Math.max(x1 + 30, B); z1 = Math.max(z1 + 30, B);
    // (0,25 m; en los pueblos grandes, lo justo para no pasar de seis millones de celdas)
    const S = Math.max(0.25, Math.sqrt((x1 - x0) * (z1 - z0) / 6e6));
    const nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S), N = nx * nz;
    const gH = new Float32Array(N), ok = new Uint8Array(N), seen = new Uint8Array(N), why = new Array(N), pasos = new Int32Array(N);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S, k = j * nx + i, g = H.groundHeight(x, z); gH[k] = g;
      if (Math.pow(x ** 4 + z ** 4, 0.25) > B) { why[k] = 'límite del mundo'; continue; }
      const c = tapa(x, z); if (c) { why[k] = c; continue; }
      if (!H.bridgeAt(x, z) && H.waterLevelAt(x, z) - g > 0.95) { why[k] = 'agua honda'; continue; }
      ok[k] = 1; }
    // la salida: la celda libre más cercana a cada punto de partida
    const q = new Int32Array(N); let h = 0, t = 0;
    for (const [sx, sz] of starts) { let start = -1, bd = 1e9; const ci = Math.round((sx - x0) / S), cj = Math.round((sz - z0) / S), rr = Math.ceil(8 / S);
      for (let b = Math.max(0, cj - rr); b <= Math.min(nz - 1, cj + rr); b++) for (let a = Math.max(0, ci - rr); a <= Math.min(nx - 1, ci + rr); a++) { const k = b * nx + a; if (!ok[k]) continue; const d = Math.hypot(x0 + a * S - sx, z0 + b * S - sz); if (d < bd) { bd = d; start = k; } }
      if (start >= 0 && !seen[start]) { seen[start] = 1; pasos[start] = 1; q[t++] = start; } }
    while (h < t) { const k = q[h++], i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const n = b * nx + a;
        if (seen[n] || !ok[n]) continue;
        if (di && dj && (!ok[j * nx + a] || !ok[b * nx + i])) continue;   // (en diagonal, sin colarse por una esquina)
        const sube = gH[n] - gH[k], paso = di && dj ? S * Math.SQRT2 : S; if (sube > 0.36 && sube / paso > 1.25) continue;
        seen[n] = 1; pasos[n] = pasos[k] + 1; q[t++] = n; } }
    const nombre = (c) => typeof c === 'string' ? c : c ? `${c.kind || c.tipo || c.what || c.type}${c.name ? ' ' + c.name : ''}${c.actor ? ' (vecino ' + (c.actor.name || '?') + ')' : ''} en (${c.x.toFixed(1)}, ${c.z.toFixed(1)})` : '?';
    const out = [];
    for (const tg of T) {
      const lim = Math.max(1, tg.rad - 0.3); let best = 1e9, camino = 1e9;
      const ci = Math.round((tg.x - x0) / S), cj = Math.round((tg.z - z0) / S), rr = Math.ceil((lim + 6) / S);
      for (let b = Math.max(0, cj - rr); b <= Math.min(nz - 1, cj + rr); b++) for (let a = Math.max(0, ci - rr); a <= Math.min(nx - 1, ci + rr); a++) if (seen[b * nx + a]) { const d = Math.hypot(x0 + a * S - tg.x, z0 + b * S - tg.z); best = Math.min(best, d); if (d <= lim) camino = Math.min(camino, pasos[b * nx + a] * S); }
      // (se llega, pero ¿con un rodeo enorme? El camino, contado por lo bajo, comparado con la línea recta desde la salida
      // más cercana: más de 2,2 veces y 120 m, como world/acceso.js)
      if (best <= lim) { const recta = Math.min(...starts.map(s => Math.hypot(s[0] - tg.x, s[1] - tg.z))); if (camino > 2.2 * recta + 120) out.push({ kind: tg.kind, name: tg.name, x: +tg.x.toFixed(1), z: +tg.z.toFixed(1), rodeo: Math.round(camino), recta: Math.round(recta), tapa: [] }); continue; }
      // qué lo tapa: lo que ocupa las celdas no alcanzadas entre el objetivo y lo alcanzado más cercano
      const motivos = new Map();
      for (let b = Math.max(0, cj - Math.ceil(4 / S)); b <= Math.min(nz - 1, cj + Math.ceil(4 / S)); b++) for (let a = Math.max(0, ci - Math.ceil(4 / S)); a <= Math.min(nx - 1, ci + Math.ceil(4 / S)); a++) {
        const k = b * nx + a; if (seen[k]) continue; const w = why[k]; if (!w || w === tg.self) continue; const n = nombre(w); motivos.set(n, (motivos.get(n) || 0) + 1); }
      const top = [...motivos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
      out.push({ kind: tg.kind, name: tg.name, x: +tg.x.toFixed(1), z: +tg.z.toFixed(1), dist: best > 1e8 ? null : +best.toFixed(1), rad: tg.rad, tapa: top, sueloLejos: best > 1e8 });
    }
    return { total: T.length, alcanzadas: t, celdas: N, paso: +S.toFixed(2), out, repaso: G.accesos || null };
  });
  RES[town] = { ...r, errs };
  if (r.error) { console.log(`== ${town}: ${r.error}`); await p.close(); continue; }
  console.log(`== ${town}: ${r.total} objetivos, ${r.out.length} sin acceso${r.repaso ? ` · el juego movió ${r.repaso.movidos} al montar (${r.repaso.ms} ms${r.repaso.dudas ? `, ${r.repaso.dudas} sin camino a tiempo` : ''})` : ''}${errs.length ? ` · ${errs.length} errores de página` : ''}`);
  for (const o of r.out) console.log(`   ${o.kind} ${o.name} (${o.x}, ${o.z}): ${o.rodeo ? `rodeo: ${o.rodeo} m andando para ${o.recta} m en línea recta` : o.dist == null ? 'nada alcanzado a menos de 6 m' : `lo más cerca, a ${o.dist} m (hace falta ${o.rad} m)`}${o.tapa.length ? ` · tapa: ${o.tapa.join('; ')}` : ''}`);
  for (const m of r.repaso?.lista || []) console.log(`   movido: ${m.quien} de (${m.de}) a (${m.a})${m.r == null ? ', sin camino a tiempo' : ''}`);
  for (const e of errs.slice(0, 3)) console.log(`   error: ${e.slice(0, 160)}`);
  await p.close();
}
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(RES, null, 1));
await browser.close();
