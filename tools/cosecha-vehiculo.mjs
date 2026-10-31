// Cosecha de principio a fin (game/townTractor.js): habla con quien la encarga, sube al vehículo y trabaja el campo
// (con la cosechadora siega el trigo y descarga la tolva en el remolque; con el tractor recoge las cajas de los
// temporeros), sube al tractor, sigue el camino hasta el destino, se para en la báscula y comprueba que se acaba la
// misión. Para ir deprisa en el navegador de pruebas, que va lento, acerca el vehículo a unos metros de cada cosa y el
// resto lo conduce. Hace capturas de cada parte.
// Uso: TOWN=artajona (trigo) | estella (piquillo) | cortes (tomate) | viana (uva) node tools/cosecha-vehiculo.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/cosecha', TOWN = process.env.TOWN || 'estella'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const [W, H] = (process.env.TAM || '844x390').split('x').map(Number);
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: W < 1000 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console ' + m.text().slice(0, 160)); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173/'}?town=${TOWN}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 }); await p.waitForTimeout(1500);
const foto = (n) => p.screenshot({ path: `${out}/${TOWN}-${n}.png` });
const estado = () => p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.type === 'harvest'); const C = M?.cos; return { step: M?.step, done: M?.done, count: M?.count, need: M?.need, fase: C?.fase, tolva: C?.tolva, remolque: C?.remolque, cajas: C?.cajas?.length, yendo: g.player.vehiculo?.tipo || null, pesado: !!C?.pesado, dialogo: !!g.ui.dialogOpen }; });
// (la palanca falsa: input.move la toma de __fake mientras exista; se devuelve una copia, que el juego sobrescribe cada imagen)
await p.evaluate(() => { window.__prisaCosecha = 12; const I = window.__game.input, real = I.move; Object.defineProperty(I, 'move', { get() { return I.__fake ? { ...I.__fake } : real; }, configurable: true }); });
const inicio = await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.type === 'harvest'); if (!M) return null; g.startCosecha(M); return { cultivo: M.m.crop, modo: M.cos.R.modo || 'temporeros', need: M.need, casillas: M.cos.celdas?.length, campo: [M.cos.campo.x, M.cos.campo.z].map(Math.round) }; });
if (!inicio) { console.log('sin cosecha en', TOWN); await b.close(); process.exit(1); }
console.log('inicio', JSON.stringify(inicio));
// conduce hacia T (función en la página que da {x,z}) unos segundos
const conduce = (segs, quien, objetivo, lento = false) => p.evaluate(async ([segs, quien, objetivo, lento]) => {
  const g = window.__game, M = g.missions.find(M => M.type === 'harvest'), V = quien === 'cos' ? M.cos.cos : M.cos.trac, fin = performance.now() + segs * 1000;
  const T = new Function('M', 'g', 'return ' + objetivo);
  while (performance.now() < fin) {
    const o = T(M, g); if (!o || !M.cos) break;
    const want = Math.atan2(o.x - V.x, o.z - V.z); let d = want - V.heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const dist = Math.hypot(o.x - V.x, o.z - V.z);
    g.input.__fake = { x: Math.max(-1, Math.min(1, -d * 2)), y: dist < 2 ? 0 : Math.abs(d) > 1.8 ? 0.35 : lento ? 0.35 : Math.min(1, dist / 6) };
    await new Promise(r => setTimeout(r, 120));
  }
  g.input.__fake = { x: 0, y: 0 };
}, [segs, quien, objetivo, lento]);
// (lo deja a dist metros de lo que busca, mirándolo, en un sitio libre: probando alrededor, empezando por donde venía)
const acerca = (quien, objetivo, dist) => p.evaluate(async ([quien, objetivo, dist]) => { const { isFree } = await import('/src/world/colliders.js');
  const g = window.__game, M = g.missions.find(M => M.type === 'harvest'), V = quien === 'cos' ? M.cos.cos : M.cos.trac, o = new Function('M', 'g', 'return ' + objetivo)(M, g); if (!o) return;
  const a0 = Math.atan2(V.x - o.x, V.z - o.z);
  for (let k = 0; k < 16; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.39, x = o.x + Math.sin(a) * dist, z = o.z + Math.cos(a) * dist; if (k < 15 && !isFree(x, z, V.T.r + 0.2)) continue; V.x = x; V.z = z; V.heading = a + Math.PI; V.place(0); return; } }, [quien, objetivo, dist]);
const sube = (quien) => p.evaluate((quien) => { const g = window.__game, M = g.missions.find(M => M.type === 'harvest'), V = quien === 'cos' ? M.cos.cos : M.cos.trac; g.player.vehiculo?.baja(); V.sube(g.player); }, quien);
if (inicio.modo === 'cosechadora') {
  await sube('cos'); await p.waitForTimeout(1200); await foto('1-cosechadora');
  for (let k = 0; k < 60; k++) {
    const e = await estado(); if (e.fase !== 'campo') break;
    if (e.tolva > 0 && (e.tolva >= await p.evaluate(() => window.__game.missions.find(M => M.type === 'harvest').cos.tolvaMax) || e.count >= e.need)) {
      await acerca('cos', 'M.cos.trac', 6); await p.evaluate(() => { window.__game.input.__fake = { x: 0, y: 0 }; }); await p.waitForTimeout(400);
      for (let j = 0; j < 40 && (await estado()).tolva > 0; j++) await p.waitForTimeout(400);
      if (k < 4) await foto('2-descarga');
      continue;
    }
    await acerca('cos', 'M.cos.celdas.find(c => c.corte == null)', 3.9); await p.evaluate(() => { window.__game.input.__fake = { x: 0, y: 0 }; }); await p.waitForTimeout(2200);
  }
  console.log('segado', JSON.stringify(await estado()));
} else {
  await sube('trac'); await p.waitForTimeout(1200); await foto('1-tractor');
  for (let k = 0; k < 60; k++) {
    const e = await estado(); if (e.fase !== 'campo') break;
    await p.evaluate(() => { for (const T of window.__game.missions.find(M => M.type === 'harvest').cos.tempo) T.t = Math.min(T.t, 0.2); });
    const hay = await p.evaluate(() => !!window.__game.missions.find(M => M.type === 'harvest').cos.cajas.find(c => !c.hecho));
    if (!hay) { await p.waitForTimeout(800); continue; }
    await acerca('trac', 'M.cos.cajas.find(c => !c.hecho)', 2.0); await p.evaluate(() => { window.__game.input.__fake = { x: 0, y: 0 }; }); await p.waitForTimeout(2200);
    if (k === 6) await foto('2-cajas');
  }
  console.log('cargado', JSON.stringify(await estado()));
}
// el camino: al tractor, las flechas y la báscula
await sube('trac'); await p.waitForTimeout(800);
const ruta = await p.evaluate(() => { const C = window.__game.missions.find(M => M.type === 'harvest').cos; return { flechas: C.flechas.length, destino: C.D.cartel, dist: Math.round(Math.hypot(C.bascula.x - C.trac.x, C.bascula.z - C.trac.z)) }; });
console.log('camino', JSON.stringify(ruta));
await conduce(6, 'trac', 'M.cos.flechas.find(f => !f.pasada) || M.cos.bascula'); await foto('3-camino');
await acerca('trac', 'M.cos.bascula', 0.5);
await p.evaluate(() => { window.__game.input.__fake = { x: 0, y: 0 }; });
for (let k = 0; k < 60 && !(await estado()).pesado; k++) { await p.waitForTimeout(500); if (k === 4) await foto('4-bascula'); }
await p.waitForTimeout(2500); await foto('5-final');
const fin = await estado();
console.log('fin', JSON.stringify(fin));
console.log(errs.length ? 'errores ' + errs.slice(0, 4).join(' | ') : 'sin errores'); await b.close();
if (!fin.pesado) process.exitCode = 1;
