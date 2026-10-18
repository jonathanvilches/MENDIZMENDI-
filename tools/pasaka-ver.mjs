// La pasaka en 3D: desde el menú (la pantalla con su portada y el botón, que carga Pamplona en modo campeonato y va al
// sobreclaustro) y desde el pueblo (el canónigo del claustro). En cada partido: el saque y un golpe tuyos con el gancho
// window.__pasaka, el resto en automático y adelantado sin dibujar (el navegador de pruebas va a un fotograma por
// segundo); luego la carta y la vuelta. Capturas en el móvil tumbado.
// Uso: node tools/pasaka-ver.mjs <carpeta>   (PUERTO=…, SINMENU=1 o SINPUEBLO=1 para saltarse una parte)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/pasaka-ver'] = process.argv; mkdirSync(out, { recursive: true });
const PUERTO = process.env.PUERTO || 5173, errs = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = async (vw, vh, mobile) => { const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, intro: true }, coins: 4, cards: [], settings: { quality: 'low' } })); }); return p; };
const estado = (p) => p.evaluate(() => window.__pasaka?.estado() || null);
const frames = (p, n) => p.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); }, n);
// un saque y, en cuanto la pelota vuelve a nuestro campo, un golpe tuyo; después juega el automático y se adelanta el partido
const partido = async (p, nombre) => {
  await p.waitForFunction(() => window.__pasaka, null, { timeout: 120000 });
  await p.evaluate(() => window.__pasaka.simular(2));
  console.log(nombre, 'saque', JSON.stringify(await estado(p)));
  await frames(p, 2); await p.screenshot({ path: `${out}/${nombre}-saque.png` });
  console.log(nombre, 'figuras', await p.evaluate(() => { const G = window.__game, P = G.player; return { tu: [+P.pos.x.toFixed(1), +P.pos.y.toFixed(1), +P.pos.z.toFixed(1)], rig: !!P.rig, modo: G.mode, camY: +G.camera.position.y.toFixed(1), hud: !!document.querySelector('.pk-hud'), botones: [...document.querySelectorAll('.pk-btn b')].map(b => b.textContent), marcador: document.querySelector('.pk-sb')?.textContent?.replace(/\s+/g, ' '), paseantes: G.walkers.filter(w => /^pasaka/.test(w.id)).map(w => [w.name, +w.pos.y.toFixed(0)]) }; }));
  await p.evaluate(() => window.__pasaka.golpear('golpe'));
  const r1 = await p.evaluate(() => { const T = window.__pasaka; let hit = false; for (let i = 0; i < 60 * 6 && !hit; i++) { T.simular(1 / 60); const e = T.estado(); if (e.phase !== 'flight') break; if (e.ball.last === 1 && e.ball.z < 14.25) { T.ir(e.ball.x, Math.max(1, e.ball.z - 0.8)); if (Math.abs(e.ball.x - e.you.x) < 1.6 && Math.abs(e.ball.z - e.you.z) < 1.8 && e.ball.y < 2.2) { T.golpear('golpe'); T.simular(1 / 60); hit = true; } } } return { hit, e: T.estado() }; });
  console.log(nombre, 'tu golpe', JSON.stringify(r1));
  await frames(p, 2); await p.screenshot({ path: `${out}/${nombre}-peloteo.png` });
  await p.evaluate(() => { window.__pasaka.auto(true); window.__pasaka.simular(40); });
  console.log(nombre, 'tras 40 s', JSON.stringify(await estado(p)));
  await frames(p, 2); await p.screenshot({ path: `${out}/${nombre}-partido.png` });
  for (let i = 0; i < 14 && await p.evaluate(() => window.__pasaka && !window.__pasaka.estado().over); i++) await p.evaluate(() => window.__pasaka.simular(40));
  console.log(nombre, 'final', JSON.stringify(await estado(p)));
  await p.waitForFunction(() => !window.__pasaka, null, { timeout: 30000 }).catch(() => console.log(nombre, 'el partido no se cerró'));
  await p.waitForTimeout(800);
};
const perfil = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')));
// desde el menú
if (!process.env.SINMENU) {
  const p = await page(844, 390, true);
  await p.goto(`http://127.0.0.1:${PUERTO}/`, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__hub.go('pasaka')); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/menu-pantalla.png` });
  console.log('menú pantalla', await p.evaluate(() => ({ titulo: document.querySelector('.armorial.pasaka h1')?.textContent, fichas: document.querySelectorAll('.pk-sec').length, portada: (c => c && c.width > 0 && !!c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data[3])(document.querySelector('.pk-prev')), boton: document.querySelector('[data-pasaka]')?.textContent?.trim() })));
  await p.click('[data-pasaka]');
  await p.waitForFunction(() => window.__game && window.__game.def?.id === 'pamplona', null, { timeout: 600000 });
  console.log('menú carga', await p.evaluate(() => ({ sportMode: window.__game.sportMode, canonigo: !!window.__game.canonigo })));
  await partido(p, 'menu');
  console.log('menú resultado', await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, kicker: document.querySelector('.ix-kicker')?.textContent })), 'cartas', (await perfil(p)).cards, 'ganados', (await perfil(p)).pasakaWon);
  await p.screenshot({ path: `${out}/menu-resultado.png` });
  // (la ficha del resultado y, si ha salido, la de la insignia; luego el menú de entre partidos; si los rojos perdieron,
  // otro partido, hasta dos más, para ver la carta)
  const cerrarFichas = async () => { for (let i = 0; i < 3 && await p.evaluate(() => !!document.querySelector('.mg-overlay.ix-ov button.btn')); i++) { await p.evaluate(() => document.querySelector('.mg-overlay.ix-ov button.btn')?.click()); await p.waitForTimeout(700); } };
  await cerrarFichas();
  for (let k = 0; k < 2 && !(await perfil(p)).cards.includes('pasaka:claustro'); k++) {
    await p.waitForSelector('.pasaka-menu [data-k="again"]', { timeout: 15000 }); await p.evaluate(() => document.querySelector('.pasaka-menu [data-k="again"]')?.click());
    await partido(p, 'menu-otro'); console.log('menú otro resultado', await p.evaluate(() => document.querySelector('.ix-title')?.textContent), 'cartas', (await perfil(p)).cards); await cerrarFichas();
  }
  await p.waitForSelector('.pasaka-menu', { timeout: 15000 }).catch(() => {});
  console.log('menú de después', await p.evaluate(() => ({ menu: !!document.querySelector('.pasaka-menu'), botones: [...document.querySelectorAll('.pasaka-menu [data-k]')].map(b => b.textContent) })));
  await p.screenshot({ path: `${out}/menu-entre.png` });
  await p.evaluate(() => document.querySelector('.pasaka-menu [data-k="exit"]')?.click());
  await p.waitForFunction(() => !window.__game && window.__hub?.visible, null, { timeout: 60000 }).catch(() => console.log('menú: no volvió al menú'));
  await p.waitForTimeout(800);
  console.log('menú vuelta', await p.evaluate(() => ({ pantalla: window.__hub.screen, cuenta: document.querySelector('.armorial.pasaka .ar-count')?.textContent, overlays: document.querySelectorAll('.mg-overlay, .pk-hud').length })));
  await p.close();
}
// en Pamplona: el canónigo del claustro
if (!process.env.SINPUEBLO) {
  const p = await page(844, 390, true);
  await p.goto(`http://127.0.0.1:${PUERTO}/?town=pamplona&q=low&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 }); await p.waitForTimeout(2000);
  const m = await p.evaluate(() => { const G = window.__game, a = G.canonigo; if (!a) return null; G.player.pos.set(a.pos.x + 1.4, a.pos.y, a.pos.z + 0.4); G.player.heading = Math.atan2(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z); return { nombre: a.name, x: +a.pos.x.toFixed(1), z: +a.pos.z.toFixed(1), marcador: G.mapLabels().some(l => l.label === 'Pasaka') }; });
  console.log('pamplona canónigo', JSON.stringify(m));
  if (m) {
    await frames(p, 3);
    console.log('pamplona aviso', await p.evaluate(() => document.querySelector('#prompt')?.textContent?.trim()));
    await p.evaluate(() => { const G = window.__game; G.pasakaCon(G.canonigo); });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/pamplona-dialogo.png` });
    for (let i = 0; i < 6 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(500); }
    await p.waitForFunction(() => window.__pasaka, null, { timeout: 120000 }).catch(() => console.log('pamplona: el partido no arrancó'));
    await partido(p, 'pamplona');
    console.log('pamplona resultado', await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, kicker: document.querySelector('.ix-kicker')?.textContent })), 'cartas', (await perfil(p)).cards);
    await p.screenshot({ path: `${out}/pamplona-resultado.png` });
    for (let i = 0; i < 10 && await p.evaluate(() => !!document.querySelector('#dialog') || !!document.querySelector('.mg-overlay.ix-ov')); i++) { await p.evaluate(() => document.querySelector('.mg-overlay.ix-ov button.btn')?.click()); await p.keyboard.press('e'); await p.waitForTimeout(600); }
    await frames(p, 2); await p.screenshot({ path: `${out}/pamplona-vuelta.png` });
    console.log('pamplona final', await p.evaluate(() => { const G = window.__game, P = G.player; return { modo: G.mode, frozen: P.frozen, busy: !!G.ui.busy, sportBusy: G.sportBusy, pos: [+P.pos.x.toFixed(0), +P.pos.y.toFixed(0), +P.pos.z.toFixed(0)], rivalesFuera: !G.walkers.some(w => /^pasaka/.test(w.id)), hud: !!document.querySelector('.pk-hud') }; }));
  }
  await p.close();
}
console.log('errores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno'); await b.close();
