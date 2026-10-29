// El pelotari del pueblo invita al campeonato de la comarca: se habla con él junto al frontón, se elige campeonato, se
// carga el campeonato (solo el frontón) con su cuadro abierto y, al salir, se vuelve al pueblo, a la puerta del frontón
// (sin la llegada). Comprueba cada paso y que no haya errores; con OUT=carpeta, capturas del diálogo y del cuadro.
// Uso: node tools/campeonato-pueblo.mjs [pueblo] [campeonato: 0 Manomanista, 1 Parejas, 2 Cuatro y Medio]   (5173)
import { chromium } from 'playwright-core';
const [,, town = 'lesaka', elige = '0'] = process.argv, URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = [], pasos = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
const espera = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg).catch(() => false)) return true; await p.waitForTimeout(700); } return false; };
try {
  await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  if (!(await espera(() => window.__game?.mode === 'play', 400000))) throw new Error('el pueblo no abre');
  const g0 = await p.evaluate(() => { const g = window.__game, a = g.pelotari; if (!a) return null; g.player.place(a.pos.x + 1.5, a.pos.z, 0); return { nombre: a.name, frontón: !!g.fronton }; });
  if (!g0) throw new Error('sin pelotari junto al frontón'); pasos.push('pelotari ' + g0.nombre);
  await p.waitForTimeout(1500);
  // (hablar con él: el diálogo de verdad, tocando para pasar y eligiendo campeonato)
  await p.evaluate(() => { const g = window.__game; g.interact({ kind: 'npc', a: g.pelotari, x: g.pelotari.pos.x, z: g.pelotari.pos.z }); });
  let elegido = false;
  for (let k = 0; k < 20 && !elegido; k++) {
    await p.waitForTimeout(900);
    const st = await p.evaluate(() => { const ch = [...document.querySelectorAll('#dialog .choices button, #dialog [data-choice], .dlg-choices button')]; return { ch: ch.map(b => b.textContent.trim()), dlg: !!document.getElementById('dialog') }; });
    if (st.ch.length >= 3) { pasos.push('opciones: ' + st.ch.join(' / ')); if (OUT) await p.screenshot({ path: `${OUT}/dialogo.png` });
      await p.evaluate((i) => { const ch = [...document.querySelectorAll('#dialog .choices button, #dialog [data-choice], .dlg-choices button')]; ch[i]?.click(); }, +elige); elegido = true; break; }
    if (st.dlg) await p.keyboard.press('e');   // (pasar, como con la tecla E: el diálogo responde al toque, no al clic)
  }
  if (!elegido) throw new Error('sin las opciones del campeonato');
  // (el campeonato: solo el frontón y su cuadro ya abierto)
  if (!(await espera(() => window.__game?.campeonato && document.querySelector('.lg-root [data-a="exit"]'), 600000))) throw new Error('el campeonato no abre su cuadro');
  pasos.push('cuadro: ' + (await p.evaluate(() => document.querySelector('.lg-root small')?.textContent || '').catch(() => '')));
  if (OUT) { await p.waitForTimeout(6000); await p.screenshot({ path: `${OUT}/cuadro.png` }); }
  await p.evaluate(() => document.querySelector('.lg-root [data-a="exit"]').click());
  // (de vuelta al pueblo, en la puerta del frontón)
  if (!(await espera(() => window.__game && !window.__game.campeonato && window.__game.mode === 'play' && document.getElementById('hub')?.classList.contains('hidden'), 600000))) throw new Error('no vuelve al pueblo');
  await p.waitForTimeout(2500);
  const v = await p.evaluate(() => { const g = window.__game, e = g.fronton?.entry, P = g.player.pos; return { pueblo: g.def.id, aFronton: e ? +Math.hypot(P.x - e.x, P.z - e.z).toFixed(1) : null, pelotari: !!g.pelotari }; });
  pasos.push(`de vuelta en ${v.pueblo}, a ${v.aFronton} m del frontón`);
  if (v.pueblo !== town || v.aFronton == null || v.aFronton > 6) throw new Error('no ha vuelto a la puerta del frontón');
} catch (e) { errs.push('PRUEBA: ' + String(e.message || e).slice(0, 200)); }
console.log(JSON.stringify({ town, pasos, errores: errs }));
console.log(errs.length ? 'MAL' : 'Todo correcto');
await b.close();
process.exit(errs.length ? 1 : 0);
