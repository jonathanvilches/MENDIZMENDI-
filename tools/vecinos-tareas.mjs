// Cada vecino con su tarea: carga un pueblo y sigue a sus vecinos un rato (con el reloj del juego acelerado). Comprueba
// que todos tienen tarea (misa, compra, charla, juego, fuente, pan o paseo), que llegan a sus paradas y se quedan en
// ellas (no van de un lado a otro sin parar), que los del corrillo charlan juntos y que los niños corren. Hace una
// captura de la plaza. Uso: URL=http://127.0.0.1:5173 node tools/vecinos-tareas.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'lumbier', out = 'entrega/vecinos-tareas'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(1500);
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
// (el jugador, lejos de los vecinos: así no se paran a mirarle)
await p.evaluate(() => { const G = window.__game, P = window.__layout.PLACES.plaza; G.player.place(P.x + 60, P.z + 60, 0); G.follow.snap(G.player); });
const W0 = await p.evaluate(() => window.__game.walkers.filter(a => a.tarea).map(a => ({ n: a.name, t: a.tarea, stops: a.route?.length || 0 })));
console.log('   vecinos:', W0.map(w => `${w.n} (${w.t})`).join(' · '));
ok(W0.length >= 6, `todos los vecinos con tarea (${W0.length})`);
ok(new Set(W0.map(w => w.t)).size >= 4, `tareas distintas (${[...new Set(W0.map(w => w.t))].join(', ')})`);
// se sigue a cada uno: cuánto rato está parado en una parada y cuánto andando, y si charla o corre
const S = await p.evaluate(async () => {
  const { navTick } = await import('/src/world/nav.js');   // (los caminos se buscan poco a poco: aquí, a la vez que se avanza)
  const G = window.__game, W = G.walkers.filter(a => a.tarea), st = W.map(() => ({ still: 0, walk: 0, talk: 0, fast: 0, arrived: 0, prevArr: false }));
  for (let k = 0; k < 1500; k++) {   // 1500 pasos de 0,1 s: dos minutos y medio de juego
    navTick(30); for (const a of W) a.update(0.1, G.player);
    W.forEach((a, i) => { const s = st[i]; if (a.state === 'walk') s.walk++; else s.still++; if (a.talking > 0) s.talk++; if (a.speed > 2.4) s.fast++; if (a.arrived && !s.prevArr) s.arrived++; s.prevArr = !!a.arrived; });
    if (k % 50 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return W.map((a, i) => ({ n: a.name, t: a.tarea, ...st[i] }));
});
for (const s of S) console.log(`   ${s.n.padEnd(8)} ${s.t.padEnd(9)} parado ${(s.still / 10).toFixed(0)} s · andando ${(s.walk / 10).toFixed(0)} s · charlando ${(s.talk / 10).toFixed(0)} s · paradas ${s.arrived}${s.fast ? ' · corre' : ''}`);
ok(S.every(s => s.arrived >= 1), 'todos llegan a alguna de sus paradas');
ok(S.filter(s => s.t !== 'juego').every(s => s.still >= s.walk * 0.4), 'y se quedan en ellas haciendo lo suyo (no andan sin parar)');
ok(S.filter(s => s.t === 'tertulia').every(s => s.talk >= 100), 'los del corrillo charlan');
ok(S.filter(s => s.t === 'juego').every(s => s.fast > 0), 'los niños corren jugando a pillar');
// la plaza, con la cámara del juego
await p.evaluate(() => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight, P = window.__layout.PLACES.plaza;
  const pos = new T.Vector3(P.x + 10, gh(P.x, P.z) + 6, P.z + 14), look = new T.Vector3(P.x, gh(P.x, P.z) + 1, P.z);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); });
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-plaza.png` });
console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close(); process.exit(fails ? 1 : 0);
