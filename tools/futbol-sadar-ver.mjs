// Fútbol: todos los partidos en El Sadar. Desde Torneos (liga y amistoso) y desde un pueblo (el entrenador del club y
// su partido por el sello): en cada uno se mira que el campo cargado sea El Sadar, que la liga no pida viajar y que al
// abandonar se vuelva al menú de donde se vino. Capturas.
// Uso: node tools/futbol-sadar-ver.mjs [pueblo] [carpeta] [todo|pueblo]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/futbol-sadar', parte = 'todo'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); if (!localStorage.getItem('mendimendiz-perfil-v1')) localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
let fails = 0, n = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const shot = (tag) => p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${tag}.png` }).catch(() => {});
const click = async (sel, ms = 240000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => [...document.querySelectorAll(s)].pop().click(), sel); await p.waitForTimeout(600); };
const panelText = () => p.evaluate(() => [...document.querySelectorAll('.lg-root')].map(r => r.innerText.replace(/\s+/g, ' ')).join(' | '));
// un partido: esperar a que esté en marcha, mirar el campo, foto y abandonar desde la pausa
const playAndQuit = async (tag) => {
  await p.waitForFunction(() => document.body.classList.contains('futbol') && window.__futbol?.scene, null, { timeout: 900000 });
  await p.waitForTimeout(2500);
  const v = await p.evaluate(() => ({ campo: window.__futbol.o.venue, nombre: window.__futbol.o.venueName || null, casa: window.__futbol.home.name, fuera: window.__futbol.away.name }));
  console.log(`   ${tag}: campo ${v.campo}${v.nombre ? ' (' + v.nombre + ')' : ''} · ${v.casa} – ${v.fuera}`);
  ok(v.campo === 'sadar' && !v.nombre, `${tag}: se juega en El Sadar`);
  await shot(tag);
  await p.evaluate(() => { window.__futbol.pauseMenu(); }); await p.waitForSelector('.fb-quit', { timeout: 60000 });
  await p.evaluate(() => document.querySelector('.fb-quit').click());
  await p.waitForFunction(() => !document.body.classList.contains('futbol'), null, { timeout: 120000 }); await p.waitForTimeout(1500);
};

if (parte === 'todo') {
console.log('1. desde Torneos');
await p.goto('http://127.0.0.1:5173/?q=low&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__hub?.visible, null, { timeout: 300000 });
await click('#hNav [data-s="sports"]');
ok(/el sadar/i.test(await p.evaluate(() => document.querySelector('.sport:nth-child(2) .sp-txt')?.innerText || '')), 'la tarjeta del fútbol en Torneos dice El Sadar, también en el móvil');
await click('[data-sport="futbol"]');
await p.waitForSelector('.lg-root', { timeout: 300000 }); await p.waitForTimeout(800);
if (await p.evaluate(() => !document.querySelector('.lg-root [data-a="liga"]'))) await p.evaluate(() => document.querySelector('.lg-root .lg-list button')?.click());
await p.waitForSelector('.lg-root [data-a="liga"]', { timeout: 60000 }); await p.waitForTimeout(500);
const menu = await panelText(); console.log('   menú:', menu.slice(0, 220));
ok(/Partido rápido/.test(menu) && !/Partido en El Sadar/.test(menu), 'el menú ya no separa «Partido en El Sadar»: todos lo son');
await click('[data-a="liga"]'); await p.waitForSelector('.lg-root [data-a="exit"]', { timeout: 60000 }); await p.waitForTimeout(600);
const liga = await panelText(); console.log('   liga:', liga.slice(0, 260)); await shot('liga');
ok(/EL SADAR/.test(liga) && !/Viajar|viaja a/i.test(liga), 'la liga: cada jornada en El Sadar, sin viajes');
await click('[data-a="play"]'); await playAndQuit('liga');
ok(await p.evaluate(() => !!document.querySelector('.lg-root [data-a="sim"], .lg-root [data-a="play"]')), 'al abandonar, de vuelta a la liga');
await click('[data-a="exit"]'); await p.waitForSelector('.lg-root [data-a="amistoso"]', { timeout: 60000 });
await click('[data-a="amistoso"]'); await p.waitForSelector('.lg-root .lg-list button', { timeout: 60000 });
await p.evaluate(() => document.querySelector('.lg-root .lg-list button').click());
await playAndQuit('amistoso');
await p.waitForSelector('.lg-root [data-a="exit"]', { timeout: 60000 }); await click('[data-a="exit"]');
await p.waitForFunction(() => window.__hub?.visible, null, { timeout: 120000 });
ok(await p.evaluate(() => window.__hub.screen === 'sports'), 'Salir: de vuelta a Torneos');
}

console.log(`2. en ${town}, con el entrenador del club`);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(2500);
const hasCoach = await p.evaluate(() => !!window.__game.futsalCoach);
ok(hasCoach, 'hay entrenador del club en el pueblo');
if (hasCoach) {
  await p.evaluate(() => { const G = window.__game, a = G.futsalCoach; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.playFutsal(); });
  // (el fútbol se carga antes de que hable el entrenador: se pasan sus diálogos hasta que sale el menú del club)
  for (let i = 0; i < 240; i++) { await p.waitForTimeout(900); const s = await p.evaluate(() => ({ menu: !!document.querySelector('.lg-root [data-a="exit"]'), dlg: !!window.__game.ui.dialogOpen }));
    if (s.menu) break; if (s.dlg) await p.evaluate(() => document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); }
  await p.waitForSelector('.lg-root [data-a="exit"]', { timeout: 30000 }); await p.waitForTimeout(600);
  const cm = await panelText(); console.log('   menú del club:', cm.slice(0, 260)); await shot('club-pueblo');
  ok(/El Sadar/.test(cm), 'el menú del club dice que se juega en El Sadar');
  const pick = await p.evaluate(() => document.querySelector('.lg-root [data-a="sala"]') ? 'sala' : 'liga');
  await click(`[data-a="${pick}"]`);
  if (pick === 'liga') { await p.waitForSelector('.lg-root [data-a="play"]', { timeout: 60000 }); ok(!/Viajar/i.test(await panelText()), 'la liga desde el pueblo no pide viajar'); await click('[data-a="play"]'); }
  await playAndQuit(pick === 'sala' ? 'partido-del-pueblo' : 'liga-del-pueblo');
  if (pick === 'liga') { await p.waitForSelector('.lg-root [data-a="exit"]', { timeout: 60000 }); await click('[data-a="exit"]'); }
  await p.waitForTimeout(2000);
  const st = await p.evaluate(() => { const G = window.__game; return { modo: G.mode, congelado: G.player.frozen, menus: document.querySelectorAll('.lg-root').length, deporte: !!G.sportBusy }; });
  console.log('   después:', JSON.stringify(st));
  ok(st.modo === 'play' && !st.congelado && !st.menus && !st.deporte, 'de vuelta en el pueblo, con el control');
}
console.log(errs.length ? errs.slice(0, 4) : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
process.exit(fails ? 1 : 0);
