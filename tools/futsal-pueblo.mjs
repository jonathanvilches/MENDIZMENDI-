// Fútbol sala en los pueblos: ¿qué pueblos tienen pista? y, en el primero, la misión entera (hablar con el entrenador →
// entrenamiento de pases → partido contra los vecinos → sello de fútbol sala) con fotos de la pista en el pueblo.
// Uso: node tools/futsal-pueblo.mjs <carpeta> [pueblos separados por comas]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/futsal-pueblo', list = 'etxalar,olite,isaba-izaba,tudela'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const towns = list.split(','); let first = true;
for (const town of towns) {
  const p = await b.newPage({ viewport: { width: 1000, height: 560 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); localStorage.setItem('mendimendiz-lang', 'es'); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
  const info = await p.evaluate(() => { const G = window.__game; return { pista: !!G.pista, coach: G.futsalCoach?.name, spot: G.pista ? [G.pista.spot.x.toFixed(0), G.pista.spot.z.toFixed(0)] : null }; });
  console.log(town, JSON.stringify(info));
  if (info.pista && first) {
    first = false;
    // vista de la pista desde la entrada
    await p.evaluate(() => { const G = window.__game, e = G.pista.entry; G.player.place(e.x + 2, e.z + 3, Math.atan2(G.pista.center.x - e.x, G.pista.center.z - e.z)); G.follow.snap(G.player); });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-pista.png` });
    await p.evaluate(() => { const G = window.__game, c = G.pista.center, e = G.pista.entry, cam = G.camera; window.__fu = G.follow.update; G.follow.update = () => {};
      const dx = e.x - c.x, dz = e.z - c.z, l = Math.hypot(dx, dz); cam.position.set(c.x + dx / l * 36, G.pista.spot.y + 24, c.z + dz / l * 36); cam.lookAt(c.x, G.pista.spot.y, c.z); });
    await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${town}-pista-alto.png` }); await p.evaluate(() => { window.__game.follow.update = window.__fu; });
    // la misión: los diálogos se aceptan solos; el reto y el partido se dan por ganados al abrirse
    await p.evaluate(() => { const G = window.__game; G.ui.dialog = async () => 0; window.__steps = [];
      window.__auto = setInterval(() => { const m = window.__futbol; if (m && m.live && !m.done && m.intro <= 0) { window.__steps.push(m.o.mode + ':' + m.o.format + ':' + m.home.name + '-' + m.away.name); m.exit(m.o.mode === 'reto' ? { win: true, mode: 'reto', reto: 'pases' } : { win: true, you: 3, cpu: 1 }); } }, 500); });
    // (el tercero es el menú libre: se cierra con «Salir»)
    await p.evaluate(() => { window.__menu = setInterval(() => { const b = document.querySelector('.fb-panel .fb-alt'); if (b) b.click(); }, 700); });
    for (let k = 0; k < 3; k++) {
      await p.evaluate(() => window.__game.playFutsal());
      const st = await p.evaluate(() => JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).towns?.[window.__game.def.id]?.futsal);
      console.log('  paso', k + 1, JSON.stringify(st), JSON.stringify(await p.evaluate(() => window.__steps)));
    }
    console.log('  modo', await p.evaluate(() => window.__game.mode));
  }
  console.log('  errores', JSON.stringify(errs.slice(0, 4)));
  await p.close();
}
await b.close();
