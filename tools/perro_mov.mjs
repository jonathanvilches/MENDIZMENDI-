// Simula el perro compañero a 60 fps con un recorrido del jugador (andar, girar, correr, parar) y mide:
// cambios andar/parar, giro máximo por segundo, distancia al jugador y si acaba quieto a su lado.
import { chromium } from 'playwright-core';
const [,, town = 'lumbier'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const r = await p.evaluate(() => {
  const G = window.__game; G.mode = 'paused-test'; const D = G.perro.dog, pl = G.player, P0 = window.__layout.PLACES.plaza;
  // jugador falso con la misma interfaz que usa el perro
  const fake = { pos: pl.pos.clone(), heading: 0, speed: 0 }; fake.pos.set(P0.x + 40, 0, P0.z + 40);
  const realPlayer = G.player; G.player = Object.create(realPlayer, { pos: { value: fake.pos }, heading: { get: () => fake.heading }, speed: { get: () => fake.speed } });
  D.pos.set(fake.pos.x + 1.2, 0, fake.pos.z); D.going = false;
  const dt = 1 / 60, plan = [[2, 0, 0], [3, 3.3, 0], [1.5, 3.3, 1.2], [2, 3.3, 0], [2, 6.8, 0], [4, 0, 0], [0.4, 3.3, 0], [3, 0, 0]];   // [segundos, velocidad, giro rad/s]
  let flips = 0, last = D.going, maxTurn = 0, maxD = 0, prevH = D.heading, steps = 0;
  for (const [sec, sp, turn] of plan) for (let t = 0; t < sec; t += dt) {
    fake.speed = sp; fake.heading += turn * dt; fake.pos.x += Math.sin(fake.heading) * sp * dt; fake.pos.z += Math.cos(fake.heading) * sp * dt;
    G.perro.update(dt); D.update(dt, G.player);
    if (D.going !== last) { flips++; last = D.going; }
    let da = D.heading - prevH; da = Math.atan2(Math.sin(da), Math.cos(da)); maxTurn = Math.max(maxTurn, Math.abs(da) / dt); prevH = D.heading;
    maxD = Math.max(maxD, Math.hypot(D.pos.x - fake.pos.x, D.pos.z - fake.pos.z)); steps++;
  }
  const h = fake.heading, dx = D.pos.x - fake.pos.x, dz = D.pos.z - fake.pos.z;
  const S = G.perro.side; const dS = Math.hypot(D.pos.x - S.pos.x, D.pos.z - S.pos.z); G.player = realPlayer; window.__dbg = { dS, going: D.going, sp: D.speed, follow: D.follow === S };
  return { dbg: JSON.stringify(window.__dbg), pasos: steps, cambios_andar_parar: flips, giro_max_rad_s: +maxTurn.toFixed(2), dist_max: +maxD.toFixed(2), al_lado: +(dx * Math.cos(h) - dz * Math.sin(h)).toFixed(2), delante: +(dx * Math.sin(h) + dz * Math.cos(h)).toFixed(2), quieto: !D.going, mira_igual: +Math.abs(Math.atan2(Math.sin(D.heading - h), Math.cos(D.heading - h))).toFixed(2) };
});
console.log(JSON.stringify(r));
await browser.close();
