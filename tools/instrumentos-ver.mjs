// Los instrumentos de Navarra: la lista del menú, la ficha de uno (con Escuchar), el minijuego tocado de principio a fin
// (pulsa cada nota a tiempo con el gancho window.__tocar) y la carta que da; luego el músico de la plaza en un pueblo.
// Capturas en escritorio y en el móvil tumbado. Uso: node tools/instrumentos-ver.mjs <carpeta> [pueblo] [instrumento]   (PUERTO=…)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/instrumentos-ver', town = 'lesaka', instId = 'txistu'] = process.argv; mkdirSync(out, { recursive: true });
const PUERTO = process.env.PUERTO || 5173, errs = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = async (vw, vh, mobile) => { const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, intro: true }, coins: 4, cards: [], settings: { quality: 'low' } })); }); return p; };
// toca todas las notas a tiempo con el gancho de pruebas y devuelve lo que ha pasado
// (un temporizador dentro de la página pulsa cada nota a tiempo: desde fuera, cada consulta tarda demasiado en el navegador de
// pruebas; y la ventana es ancha, 0,12 s, porque sin gráfica los temporizadores llegan tarde)
const tocarTodo = async (p) => { await p.evaluate(() => { const T = window.__tocar; if (!T) return; const it = setInterval(() => { if (!window.__tocar || T.fin()) return clearInterval(it); for (const n of T.notas()) if (Math.abs(n.dt) < 0.12) T.pulsar(n.lane); }, 8); }); const t0 = Date.now(); while (Date.now() - t0 < 60000) { const r = await p.evaluate(() => !window.__tocar || window.__tocar.fin()); if (r) return 'fin'; await p.waitForTimeout(200); } return 'tiempo'; };
for (const [nombre, vw, vh, mobile] of [['escritorio', 1280, 760, false], ['movil', 844, 390, true]]) {
  const p = await page(vw, vh, mobile);
  await p.goto(`http://127.0.0.1:${PUERTO}/`, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__hub.go('instrumentos')); await p.waitForTimeout(1000);
  await p.waitForFunction(() => !document.querySelector('.ins img[data-i3d]'), null, { timeout: 60000 }).catch(() => console.log(nombre, 'iconos sin terminar de dibujar'));   // (los iconos 3D se dibujan uno a uno en ratos libres)
  await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${nombre}-lista.png` });
  console.log(nombre, 'tarjetas', await p.evaluate(() => document.querySelectorAll('.ins').length), 'iconos', await p.evaluate(() => [...document.querySelectorAll('.ins > img, .ins > svg')].map(i => i.tagName === 'IMG' ? (i.src.startsWith('data:') ? 'render' : 'img') : 'svg').join(' ')));
  await p.click(`.ins[data-instrumento="${instId}"]`); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${nombre}-ficha.png` });
  console.log(nombre, 'ficha', await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, pestañas: document.querySelectorAll('.es-tabs button').length, botones: [...document.querySelectorAll('.ix-foot button')].map(b => b.textContent.trim()) })));
  await p.click('.tc-oir'); await p.waitForTimeout(800);
  await p.click('.tc-tocar'); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${nombre}-juego.png` });
  console.log(nombre, 'juego', await p.evaluate(() => ({ carriles: document.querySelectorAll('.tc-pads button').length, notasVisibles: document.querySelectorAll('.tc-note').length, titulo: document.querySelector('.tocar-card h3')?.textContent })));
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${nombre}-juego-2.png` });
  const r = await tocarTodo(p); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${nombre}-resultado.png` });
  console.log(nombre, 'resultado', r, await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, texto: document.querySelector('.ix-text')?.textContent?.slice(0, 80), carta: JSON.parse(localStorage.getItem('herrizherri-perfil-v1')).cards })));
  await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(800);
  await p.close();
}
// en el pueblo: el músico de la plaza
{
  const p = await page(844, 390, true);
  await p.goto(`http://127.0.0.1:${PUERTO}/?town=${town}&q=low&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 }); await p.waitForTimeout(2000);
  // (el músico: en Otsagabia, game.js; en los demás pueblos, un paseante de townGame.js)
  const m = await p.evaluate(() => { const G = window.__game, a = G.musico || G.walkers.find(w => w.musico); if (!a) return null; G.player.pos.set(a.pos.x + 1.2, a.pos.y, a.pos.z); G.player.heading = Math.atan2(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z); return { name: a.name, inst: a.musico, mallas: (() => { let n = 0; a.obj.traverse(o => { if (o.isMesh && o.visible) n++; }); return n; })() }; });
  console.log('pueblo músico', JSON.stringify(m));
  if (m) {
    await p.evaluate(async () => { for (let i = 0; i < 3; i++) await new Promise(r => requestAnimationFrame(r)); });
    console.log('pueblo aviso', await p.evaluate(() => document.querySelector('#prompt')?.textContent?.trim()));
    await p.evaluate(() => { const G = window.__game; G.tocarCon(G.musico || G.walkers.find(w => w.musico)); });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/pueblo-dialogo.png` });
    // el diálogo se pasa con E; luego el juego
    for (let i = 0; i < 6 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(500); }
    await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/pueblo-juego.png` });
    const r = await tocarTodo(p); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/pueblo-resultado.png` });
    console.log('pueblo resultado', r, await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, carta: JSON.parse(localStorage.getItem('herrizherri-perfil-v1')).cards })));
    await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(800);
    for (let i = 0; i < 6 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(500); }
    console.log('pueblo final', await p.evaluate(() => ({ modo: window.__game.mode, frozen: window.__game.player.frozen, busy: !!window.__game.ui.busy })));
  }
  await p.close();
}
console.log('errores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno'); await b.close();
