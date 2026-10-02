// El redil: empieza la misión de llevar ovejas, mete una en el redil por la puerta y mira cómo se mueve dentro
// (que entre caminando y no gire de golpe). Uso: node tools/redil.mjs [pueblo]
import { chromium } from 'playwright-core';
const [,, town = 'altsasu-alsasua'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } }); p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const r = await p.evaluate(async () => {
  const G = window.__game, M = G.missions.find(M => M.type === 'herd'); if (!M) return 'sin misión de rebaño';
  const { TOWN } = await import('/src/world/townBuilder.js'); const pen = TOWN.pen;
  G.startHerd(M); const s = G.herd[0];
  // la oveja entra por el borde del redil
  s.pos.set(pen.x, s.pos.y, pen.z + pen.d / 2 - 0.65);
  let maxTurn = 0, prev = s.heading, path = 0, px = s.pos.x, pz = s.pos.z, outside = 0;
  for (let i = 0; i < 300; i++) { G.updateHerd(1 / 30); s.update(1 / 30, G.player);
    const t = Math.abs(Math.atan2(Math.sin(s.heading - prev), Math.cos(s.heading - prev))); maxTurn = Math.max(maxTurn, t); prev = s.heading;
    path += Math.hypot(s.pos.x - px, s.pos.z - pz); px = s.pos.x; pz = s.pos.z;
    if (Math.abs(s.pos.x - pen.x) > pen.w / 2 || Math.abs(s.pos.z - pen.z) > pen.d / 2) outside++; }
  return { dentro: s.penned, contadas: M.count, giroMax: +(maxTurn * 57.3).toFixed(1) + '° por fotograma', recorrido: +path.toFixed(1) + ' m en 10 s', fuera: outside };
});
console.log(JSON.stringify(r));
await b.close();
