// La pasaka: la pantalla del menú (con su portada dibujada), el minijuego (el saque y un golpe tuyos con el gancho
// window.__pasaka, el resto en automático y adelantado sin dibujar, porque el navegador de pruebas va a un fotograma por
// segundo) y la carta que da; luego el canónigo del claustro en Pamplona. Capturas en escritorio y en el móvil tumbado.
// Uso: node tools/pasaka-ver.mjs <carpeta>   (PUERTO=…, SINPUEBLO=1 para saltarse Pamplona)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/pasaka-ver'] = process.argv; mkdirSync(out, { recursive: true });
const PUERTO = process.env.PUERTO || 5173, errs = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = async (vw, vh, mobile) => { const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, intro: true }, coins: 4, cards: [], settings: { quality: 'low' } })); }); return p; };
const estado = (p) => p.evaluate(() => window.__pasaka?.estado() || null);
// un saque y, en cuanto la pelota vuelve a nuestro campo, un golpe tuyo; después juega el automático y se adelanta el partido
const partido = async (p, nombre) => {
  await p.evaluate(() => window.__pasaka?.simular(2));   // (la entrada, sin esperar al dibujo)
  await p.waitForFunction(() => window.__pasaka && window.__pasaka.estado().phase === 'serve', null, { timeout: 20000 }).catch(() => console.log(nombre, 'no llegó al saque'));
  console.log(nombre, 'saque', JSON.stringify(await estado(p)));
  await p.evaluate(() => window.__pasaka.golpear('golpe'));
  // (la pelota cruza, da en el frontis, los azules la devuelven: en cuanto esté en nuestro campo y al alcance, golpeamos)
  const r1 = await p.evaluate(() => { const T = window.__pasaka; let hit = false; for (let i = 0; i < 60 * 6 && !hit; i++) { T.simular(1 / 60); const e = T.estado(); if (e.phase !== 'flight') break; if (e.ball.last === 1 && e.ball.z < 14.25) { T.ir(e.ball.x, Math.max(1, e.ball.z - 0.8)); if (Math.abs(e.ball.x - e.you.x) < 1.4 && Math.abs(e.ball.z - e.you.z) < 1.6 && e.ball.y < 2.2) { T.golpear('golpe'); T.simular(1 / 60); hit = true; } } } return { hit, e: T.estado() }; });
  console.log(nombre, 'tu golpe', JSON.stringify(r1));
  await p.screenshot({ path: `${out}/${nombre}-rally.png` });
  await p.evaluate(() => { window.__pasaka.auto(true); window.__pasaka.simular(40); });
  console.log(nombre, 'tras 40 s', JSON.stringify(await estado(p)));
  await p.screenshot({ path: `${out}/${nombre}-partido.png` });
  for (let i = 0; i < 12 && await p.evaluate(() => window.__pasaka && !window.__pasaka.estado().over); i++) await p.evaluate(() => window.__pasaka.simular(40));
  const fin = await estado(p); console.log(nombre, 'final', JSON.stringify(fin));
  await p.waitForTimeout(2200);
};
for (const [nombre, vw, vh, mobile] of [['escritorio', 1280, 760, false], ['movil', 844, 390, true]]) {
  const p = await page(vw, vh, mobile);
  await p.goto(`http://127.0.0.1:${PUERTO}/`, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__hub.go('pasaka')); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${nombre}-pantalla.png`, fullPage: true });
  console.log(nombre, 'pantalla', await p.evaluate(() => ({ titulo: document.querySelector('.armorial.pasaka h1')?.textContent, fichas: document.querySelectorAll('.pk-sec').length, portada: (c => c && c.width > 0 && !!c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data[3])(document.querySelector('.pk-prev')), boton: document.querySelector('[data-pasaka]')?.textContent?.trim() })));
  await p.click('[data-pasaka]'); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${nombre}-inicio.png` });
  console.log(nombre, 'juego', await p.evaluate(() => { const c = document.querySelector('.pk-cv'), r = c?.getBoundingClientRect(); return { lienzo: r && [Math.round(r.width), Math.round(r.height)], botones: [...document.querySelectorAll('.pk-btn b')].map(b => b.textContent), marcador: document.querySelector('.pk-sb')?.textContent?.replace(/\s+/g, ' '), desborda: [...document.querySelectorAll('.pasaka-card button')].some(b => b.scrollWidth > b.clientWidth + 1) }; }));
  await partido(p, nombre);
  for (let k = 0; k < 2 && !JSON.parse(await p.evaluate(() => localStorage.getItem('mendimendiz-perfil-v1'))).cards.includes('pasaka:claustro'); k++) {
    await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(800);
    await p.click('[data-pasaka]'); await p.waitForTimeout(400); await partido(p, nombre + '-otro');
  }
  console.log(nombre, 'resultado', await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, texto: document.querySelector('.ix-text')?.textContent?.slice(0, 90), carta: JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).cards, pasaka: JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).pasakaWon })));
  await p.screenshot({ path: `${out}/${nombre}-resultado.png` });
  await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(600);   // (la insignia, si ha salido)
  console.log(nombre, 'de vuelta', await p.evaluate(() => ({ pantalla: window.__hub.screen, cuenta: document.querySelector('.armorial.pasaka .ar-count')?.textContent, overlays: document.querySelectorAll('.mg-overlay').length })));
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
    await p.evaluate(async () => { for (let i = 0; i < 3; i++) await new Promise(r => requestAnimationFrame(r)); });
    console.log('pamplona aviso', await p.evaluate(() => document.querySelector('#prompt')?.textContent?.trim()));
    await p.screenshot({ path: `${out}/pamplona-canonigo.png` });
    await p.evaluate(() => { const G = window.__game; G.pasakaCon(G.canonigo); });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/pamplona-dialogo.png` });
    for (let i = 0; i < 6 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(500); }
    await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/pamplona-juego.png` });
    await partido(p, 'pamplona');
    console.log('pamplona resultado', await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, kicker: document.querySelector('.ix-kicker')?.textContent, carta: JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).cards })));
    await p.screenshot({ path: `${out}/pamplona-resultado.png` });
    await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(800);
    for (let i = 0; i < 8 && await p.evaluate(() => !!document.querySelector('#dialog') || !!document.querySelector('.mg-overlay')); i++) { await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.keyboard.press('e'); await p.waitForTimeout(500); }
    console.log('pamplona final', await p.evaluate(() => ({ modo: window.__game.mode, frozen: window.__game.player.frozen, busy: !!window.__game.ui.busy })));
  }
  await p.close();
}
console.log('errores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno'); await b.close();
