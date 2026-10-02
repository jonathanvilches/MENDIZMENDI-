// Colisiones del mirador y de los animales: el jugador sube andando por la rampa a la tarima, la barandilla no se
// atraviesa (ni desde dentro ni desde fuera) y a una oveja o una vaca no se le pasa por encima.
// Para el bucle y mueve al jugador a mano a 60 fps. Uso: node tools/mirador.mjs [pueblos]
import { chromium } from 'playwright-core';
const [,, towns = 'ujue,etxalar'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await b.newPage({ viewport: { width: 400, height: 240 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
  const r = await p.evaluate(async () => {
    const rt = window.__rt, G = window.__game, P = rt.player; rt.active = false;
    const { TOWN } = await import('/src/world/townBuilder.js'); const { groundHeight } = await import('/src/world/heightfield.js');
    const lm = TOWN.landmarks.find(l => l.kind === 'lookout') || TOWN.landmarks.find(l => l.kind === 'pass'); if (!lm) return 'sin mirador';
    const ry = Math.atan2(lm.spot.x - lm.x, lm.spot.z - lm.z), c = Math.cos(ry), s = Math.sin(ry);
    const wp = (lx, lz) => ({ x: lm.x + lx * c + lz * s, z: lm.z - lx * s + lz * c });
    const loc = (x, z) => { const dx = x - lm.x, dz = z - lm.z; return { lx: dx * c - dz * s, lz: dx * s + dz * c }; };
    const put = (q) => { P.pos.set(q.x, groundHeight(q.x, q.z), q.z); P.speed = 0; P.vy = 0; P.grounded = true; };
    // andar hacia un punto (o en una dirección) n fotogramas
    const walk = (to, n, run = false) => { let maxY = -1e9; G.input.keys.clear(); G.input.keys.add('w'); if (run) G.input.keys.add('shift');
      for (let i = 0; i < n; i++) { const dx = to.x - P.pos.x, dz = to.z - P.pos.z; rt.follow.yaw = Math.atan2(-dx, -dz); rt.step(1 / 60, G, G.input); G.input.endFrame?.(); maxY = Math.max(maxY, P.pos.y); }
      G.input.keys.clear(); return maxY; };
    const out = { mirador: lm.name };
    const deckTop = groundHeight(lm.x, lm.z);
    // 1) por la rampa hasta el centro de la tarima
    put(lm.spot); const y0 = P.pos.y; walk(wp(0, 0), 240); let L = loc(P.pos.x, P.pos.z);
    out.subir = { suelo: +y0.toFixed(2), tarima: +deckTop.toFixed(2), alturaFinal: +P.pos.y.toFixed(2), arriba: Math.abs(P.pos.y - deckTop) < 0.08 && Math.abs(L.lx) < 3 && Math.abs(L.lz) < 2 };
    // 2) seguir hacia el fondo: la barandilla de atrás para
    walk(wp(0, -9), 180, true); L = loc(P.pos.x, P.pos.z);
    out.barandillaFondo = { lz: +L.lz.toFixed(2), para: L.lz > -2.0 };
    // 3) hacia un lado desde dentro
    put(wp(0, 0)); walk(wp(9, 0), 180, true); L = loc(P.pos.x, P.pos.z);
    out.barandillaLado = { lx: +L.lx.toFixed(2), para: L.lx < 3.0 };
    // 4) desde fuera, contra el lado y contra el fondo
    put(wp(-5, 0)); walk(wp(2, 0), 180, true); L = loc(P.pos.x, P.pos.z);
    out.fueraLado = { lx: +L.lx.toFixed(2), para: L.lx < -3.0 };
    put(wp(0, -4.5)); walk(wp(0, 2), 180, true); L = loc(P.pos.x, P.pos.z);
    out.fueraFondo = { lz: +L.lz.toFixed(2), para: L.lz < -2.0 };
    // 5) delante, fuera de la rampa: no se sube de un salto andando (la tarima hace de escalón)
    put(wp(2.2, 3.2)); walk(wp(2.2, -1), 120); L = loc(P.pos.x, P.pos.z);
    out.frenteSinRampa = { lz: +L.lz.toFixed(2), y: +P.pos.y.toFixed(2) };
    // 6) contra un animal quieto (oveja o vaca)
    const a = G.fauna.animals.find(a => a.kind === 'sheep' && a.collider) || G.fauna.animals.find(a => a.collider);
    if (a) { a.update = () => {}; const q = { x: a.pos.x + 4, z: a.pos.z }; put(q); a.collider.x = a.pos.x; a.collider.z = a.pos.z;
      let dmin = 1e9; G.input.keys.add('w'); G.input.keys.add('shift');
      for (let i = 0; i < 150; i++) { rt.follow.yaw = Math.atan2(-(a.pos.x - P.pos.x), -(a.pos.z - P.pos.z)); rt.step(1 / 60, G, G.input); G.input.endFrame?.(); dmin = Math.min(dmin, Math.hypot(P.pos.x - a.pos.x, P.pos.z - a.pos.z)); }
      G.input.keys.clear(); out.animal = { tipo: a.kind, radio: +(a.collider.r + P.radius).toFixed(2), distMin: +dmin.toFixed(2), noAtraviesa: dmin > a.collider.r + P.radius - 0.08 }; }
    rt.active = true;
    return out;
  });
  console.log(town, JSON.stringify(r, null, 1), errs.length ? 'ERRORES ' + errs.slice(0, 3).join(' | ') : 'sin errores');
  await p.close();
}
await b.close();
