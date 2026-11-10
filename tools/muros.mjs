// Prueba automática de muros: un explorador sin manos que se lanza una y otra vez contra las casas y las tapias del
// pueblo, andando, corriendo y saltando, y que no debe atravesar ninguna. Mueve al jugador con su propio código
// (actors/player.js), sin dibujar, a 30 pasos por segundo: en unos segundos da los pasos de varios minutos de juego.
//   node tools/muros.mjs <salida.json> [pueblos,separados,por,comas | todos]   (BASE: la web compilada, 8099)
// En cada paso comprueba que: no queda metido dentro de un muro, no da un paso más largo que su cuerpo (que podría
// saltarse lo que hubiera en medio) y sigue en el mapa (ni se cae por debajo del suelo ni sale de los límites).
// Recorre los muros mayores del pueblo (hasta 40), de frente y en diagonal, y acaba con código 1 si alguno se cruza.
import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';
const [, , out = 'entrega/muros.json', lista = 'lesaka'] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:8099/';
const todos = () => [...readFileSync(new URL('../src/data/levels.js', import.meta.url), 'utf8').matchAll(/\{ id: '([a-z0-9-]+)', name:/g)].map(m => m[1]);
const pueblos = lista === 'todos' ? todos() : lista.split(',');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const R = { base: BASE, pueblos: {} }; let fallan = 0;
for (const town of pueblos) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pastor', seen: { heroBenat: true, dog: true }, dogOn: false })); });
  try {
    await p.goto(`${BASE}?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const G = window.__game, P = G.player, C = window.__colliders, hf = window.__hf, L = window.__layout;
      if (!C) return { error: 'sin window.__colliders' };
      const muros = C.COLLIDERS.filter(c => c.type === 'box' && !c.mover && !c.tree && Math.max(c.hw, c.hd) > 2).sort((a, b) => (b.hw * b.hd) - (a.hw * a.hd)).slice(0, 40);
      // ¿está el centro del jugador dentro de un muro? (con cinco centímetros de margen: pegado a la pared no cuenta)
      const metido = (x, z) => { for (const c of C.nearby(x, z, 1)) { if (c.type !== 'box' || c.mover || c.ghost) continue; const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; if (Math.abs(lx) < c.hw - 0.05 && Math.abs(lz) < c.hd - 0.05) return Math.min(c.hw - Math.abs(lx), c.hd - Math.abs(lz)); } return 0; };
      const inp = { move: { x: 0, y: 1 }, run: false, pulsa: false, consume(k) { if (k === ' ' && this.pulsa) { this.pulsa = false; return true; } return false; } };
      const dt = 1 / 30; let pasos = 0, dentro = 0, cruces = 0, fuera = 0, peor = 0; const fallos = [];
      const g0 = P.pos.clone(), h0 = P.heading;
      for (const [i, m] of muros.entries()) for (const ang of [0, 0.7, -0.7, 2.4]) {
        // se sale de un sitio libre a unos metros del muro y se empuja hacia su centro (camYaw: de espaldas al muro)
        const a0 = Math.atan2(m.sin, m.cos) + ang + i, d = Math.max(m.hw, m.hd) + 6, sx = m.x + Math.sin(a0) * d, sz = m.z + Math.cos(a0) * d;
        if (!C.isFree(sx, sz, P.radius + 0.1) || hf.waterLevelAt(sx, sz) - hf.groundHeight(sx, sz) > 0.5) continue;
        P.place(sx, sz, a0 + Math.PI); P.frozen = false;
        const yaw = Math.atan2(sx - m.x, sz - m.z);   // (adelante = alejarse de la cámara = hacia el muro)
        for (let k = 0; k < 150; k++) {
          const ax = P.pos.x, az = P.pos.z;
          inp.run = k % 50 > 20; inp.pulsa = k % 37 === 0; inp.move.x = k > 90 ? (k % 2 ? 0.6 : -0.6) : 0;
          P.update(dt, inp, yaw); pasos++;
          const x = P.pos.x, z = P.pos.z, paso = Math.hypot(x - ax, z - az);
          { const gy = hf.groundHeight(x, z), agua = hf.waterLevelAt(x, z), por = !isFinite(x) || !isFinite(z) ? 'sin número' : P.pos.y < Math.min(gy, agua) - 1.5 && P.modo !== 'nada' ? 'bajo el suelo' : (L.BOUNDARY && Math.pow(x ** 4 + z ** 4, 0.25) > L.BOUNDARY + 2) ? 'fuera de los límites' : null;
            if (por) { fuera++; if (fallos.length < 6) fallos.push({ muro: i, fuera: por, x: +x.toFixed(1), y: +P.pos.y.toFixed(1), z: +z.toFixed(1), suelo: +gy.toFixed(1), agua: +agua.toFixed(1), modo: P.modo }); break; } }
          const hundido = metido(x, z);
          if (hundido > 0) { dentro++; peor = Math.max(peor, hundido); if (fallos.length < 6) fallos.push({ muro: i, x: +x.toFixed(1), z: +z.toFixed(1), hundido: +hundido.toFixed(2) }); }
          // (un paso más largo que el propio cuerpo sería un salto por encima de lo que hubiera en medio)
          if (paso > 0.7) { cruces++; if (fallos.length < 6) fallos.push({ muro: i, salto: +paso.toFixed(2) }); }
        }
      }
      P.place(g0.x, g0.z, h0);
      return { muros: muros.length, pasos, dentro, cruces, fuera, peorM: +peor.toFixed(2), fallos };
    });
    r.pasa = !r.error && r.muros > 0 && r.dentro === 0 && r.cruces === 0 && r.fuera === 0; r.errores = errs;
    R.pueblos[town] = r; if (!r.pasa) fallan++;
    console.log(town.padEnd(24), r.pasa ? 'PASA ' : 'FALLA', r.error || `muros ${r.muros}  pasos ${r.pasos}  dentro ${r.dentro}  cruces ${r.cruces}  fuera ${r.fuera}`, errs.length ? 'errores ' + errs.length : '');
  } catch (e) { R.pueblos[town] = { error: e.message.slice(0, 120) }; fallan++; console.log(town, 'ERROR', e.message.slice(0, 120)); }
  await p.close();
}
R.fallan = fallan; writeFileSync(out, JSON.stringify(R, null, 1));
await b.close(); process.exit(fallan ? 1 : 0);
