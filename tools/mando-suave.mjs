// El giro de cámara con el móvil, ¿fluido? El móvil manda lo que se arrastra unas 30 veces por segundo y por la wifi
// llega desigual (a veces dos mensajes juntos, a veces ninguno en un fotograma). Se simula un arrastre constante de 3 s
// con esa llegada desigual, paso a paso a 60 fotogramas por segundo, y se mide cuánto gira la cámara en cada fotograma:
//  · «antes»: como se hacía, todo el giro de un mensaje en el fotograma en que llega (PAD.lx);
//  · «ahora»: repartido entre varios fotogramas (PAD.mx, input.js).
// Con un giro fluido, casi ningún fotograma se queda sin girar y la variación de un fotograma a otro es pequeña.
// Uso: node tools/mando-suave.mjs [pueblo]
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const [,, town = 'lumbier'] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true, comoJugar: true }, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.waitForTimeout(2000);
const r = await p.evaluate(async () => {
  // (el mismo módulo que usa el juego: en el servidor de desarrollo, tras un cambio, lleva su marca de tiempo en la dirección)
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => n.includes('/src/mando/pad.js')) || '/src/mando/pad.js';
  const { PAD } = await import(url);
  const rt = window.__rt, G = window.__game, F = rt.follow, inp = rt.input;
  document.getElementById('hub')?.classList.add('hidden');
  rt.active = false;
  rt.step(1 / 60, G, inp); const estado = { activa: inp.enabled, ocupada: !!G.ui.busy, modo: G.mode };
  // llegadas: un mensaje cada 33 ms con un retraso al azar de 0 a 40 ms (siempre el mismo azar, para comparar)
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const llegadas = []; for (let i = 0; i < 90; i++) llegadas.push(i * 33.3 + rnd() * 40);
  const prueba = (campo) => {
    const giros = []; let y0 = F.yaw;
    for (let f = 0; f < 240; f++) {
      const t0 = f * 16.67, t1 = t0 + 16.67;
      for (const t of llegadas) if (t >= t0 && t < t1) { if (campo === 'lx') PAD.lx += 30; else PAD.mx += 30; }
      rt.elapsed += 1 / 60; rt.step(1 / 60, G, inp); inp.endFrame();
      giros.push(Math.abs(F.yaw - y0)); y0 = F.yaw;
    }
    const m = giros.slice(20, 180), med = m.reduce((a, b) => a + b, 0) / m.length;
    const sd = Math.sqrt(m.reduce((a, b) => a + (b - med) ** 2, 0) / m.length);
    return { quietos: m.filter(x => x < med * 0.15).length, de: m.length, variacion: +(sd / med).toFixed(2), saltoMax: +(Math.max(...m) / med).toFixed(2) };
  };
  const antes = prueba('lx'); for (let i = 0; i < 60; i++) { rt.step(1 / 60, G, inp); inp.endFrame(); }
  const ahora = prueba('mx'); rt.active = true;
  return { estado, antes, ahora };
});
console.log(JSON.stringify(r));
console.log('errores', errs.length ? errs : 'ninguno');
await b.close();
