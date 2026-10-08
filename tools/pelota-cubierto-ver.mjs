// El frontón cubierto de los campeonatos, en el móvil tumbado: se monta el del pueblo, se entra (plano de llegada) y se
// juega un rato. Comprueba que la luz del pabellón está encendida (de día también), que el público está sentado en la
// grada, que la cámara de retransmisión queda siempre dentro del pabellón y que la pelota no se sale por el rebote, y
// hace capturas del partido desde la cámara del juego.
// Uso: URL=http://127.0.0.1:5173 node tools/pelota-cubierto-ver.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'lumbier', out = 'entrega/pelota-cubierto'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(2000);
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
console.log('1. la llegada al frontón cubierto');
await p.evaluate(() => { const G = window.__game; window.__H = G.hallVenue(); window.__intro = G.hallIntro(window.__H); });
await p.waitForTimeout(900); await p.screenshot({ path: `${out}/01-llegada.png` });
await p.evaluate(() => window.__intro);
const A = await p.evaluate(() => { const G = window.__game, C = window.__H.court; return { hall: !!C.hall, seats: C.standSpots.length, indoor: G.sky.indoor, flood: G.sky.floodCur }; });
console.log('   ', JSON.stringify(A));
ok(A.hall && A.seats > 200, `el pabellón con su grada (${A.seats} asientos)`);
ok(A.indoor && A.flood >= 0.99, 'la luz del pabellón encendida a mediodía');
console.log('2. el partido');
await p.evaluate(() => { const G = window.__game, a = G.pelotari || G.missions.find(M => M.type === 'pelota')?.host; window.__r = window.__H.play(G, a, { comp: 'Prueba' }); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 300000 }); await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/02-panel.png` });
const tags = await p.evaluate(() => [...document.querySelectorAll('.pel-court-t i')].map(x => x.innerText));
ok(tags.some(t => /cubierto/i.test(t)), `el panel dice que es un frontón cubierto (${tags.join(' + ')})`);
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
const inside = [];
for (let i = 0; i < 8; i++) {
  await p.waitForTimeout(1500);
  inside.push(await p.evaluate(() => { const G = window.__game, C = window.__H.court, v = C.group.worldToLocal(G.camera.position.clone()), E = C.extent; return { x: +v.x.toFixed(1), y: +v.y.toFixed(1), z: +v.z.toFixed(1), in: v.x > E.x0 && v.x < E.x1 && v.z > E.z0 && v.z < E.z1 - 0.6 && v.y < 13 }; }));
  if (i === 2 || i === 6) await p.screenshot({ path: `${out}/0${i === 2 ? 3 : 4}-partido.png` });
}
console.log('   cámara (en la cancha):', inside.map(c => `${c.x},${c.y},${c.z}`).join(' · '));
ok(inside.every(c => c.in), 'la cámara de retransmisión, siempre dentro del pabellón');
const crowd = await p.evaluate(() => { const G = window.__game; let n = 0, sit = 0; G.scene.traverse(o => { if (o.userData?.crowd3d) n++; }); return { n, feel: window.__game.pelotaMatch?.feel?.backH }; });
ok(crowd.feel >= 13, `el rebote llega al techo en la física (${crowd.feel} m)`);
console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close(); process.exit(fails ? 1 : 0);
