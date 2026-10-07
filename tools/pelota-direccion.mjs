// Pelota: la dirección manda. Desde varios sitios de la cancha, con el joystick de izquierda a derecha: dónde bota a lo
// ancho (tiene que ir de la pared a la derecha, en orden), cuándo sale a dos paredes (izquierda del todo) y que la vista
// previa (la línea de la cancha) coincida con el golpe real bien dado. Sin gráficos. Uso: node tools/pelota-direccion.mjs
import { PelotaGame } from '../src/pelota/game.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function shot(from, aim, pow = 0.6, seed = 1) {
  const g = new PelotaGame({ seed, level: 'normal' }); g.start?.(); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 1 };
  g.ball.p = { ...from }; g.ball.v = { x: 0, y: 0, z: 0 }; g.players.you.x = from.x + 0.3; g.players.you.z = from.z + 0.4;
  const pv = g.strike('you', 1, aim, false, pow, true, from);
  g.strike('you', 1, aim, false, pow);
  let land = null, wall = null, front = false;
  for (let t = 0; t < 5 && !land; t += 1 / 240) { g.players.rival.cool = 99; g.players.rival.z = 60; g.update?.(1 / 240); for (const e of g.events) { if (e.type === 'wall' && !front) wall = e; if (e.type === 'front') front = true; if (e.type === 'floor' && front && !land) land = e; } }
  return { shot: pv.shot, land: land && { x: +land.x.toFixed(2), z: +land.z.toFixed(1) }, wall: !!wall };
}
for (const from of [{ x: 0, y: 1, z: 20 }, { x: 2.5, y: 1, z: 22 }, { x: -2, y: 1, z: 17 }]) {
  const xs = [-0.5, -0.25, 0, 0.5, 1].map(ax => shot(from, { x: ax, y: 0 }));
  console.log(JSON.stringify(from), xs.map(r => `${r.shot}:${r.land?.x}`).join('  '));
  ok(xs.every((r, i) => i === 0 || (r.land && xs[i - 1].land && r.land.x > xs[i - 1].land.x)), 'de izquierda a derecha, el bote va de la pared a la derecha, en orden');
  ok(xs[4].land.x - xs[0].land.x > 5, `abanico ancho: ${(xs[4].land.x - xs[0].land.x).toFixed(1)} m de lado a lado`);
  const dp = [{ x: -1, y: 0 }, { x: -0.8, y: -0.3 }, { x: -0.9, y: -0.8 }].map(a => shot(from, a));
  console.log('   dos paredes', dp.map(r => `${r.shot}:${r.land?.x}/${r.land?.z}`).join('  '));
  ok(dp.filter(r => r.shot === 'dosparedes' && r.land && r.land.x > -1).length >= 2, 'izquierda del todo: dos paredes, sale cruzada hacia la derecha');
  const up = shot(from, { x: -0.8, y: 0.8 });
  ok(up.shot !== 'dosparedes' && up.land && up.land.x < -2.5, `arriba-izquierda: pegada a la pared (bota en x ${up.land?.x})`);
}
console.log(fails ? fails + ' fallos' : 'Todo correcto');
