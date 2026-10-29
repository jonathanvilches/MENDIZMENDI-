// Las flechas del menú no siguen vivas al jugar: se abre «Elige tu personaje», se entra en el pueblo y se anda con las
// flechas. Antes, cada flecha intentaba cambiar de personaje en el menú ya cerrado y salía el aviso rojo
// «Cannot read properties of null (reading 'setAvatar')». Comprueba que no hay errores y que el personaje no cambia.
// Uso: node tools/flechas-menu.mjs
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('consola: ' + m.text().slice(0, 200)); });
await p.addInitScript(() => { if (!sessionStorage.getItem('hz-prueba')) { sessionStorage.setItem('hz-prueba', '1'); localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true, comoJugar: true }, settings: { quality: 'low' } })); } });
await p.goto('http://127.0.0.1:5173/?screen=avatars', { timeout: 300000 });
await p.waitForSelector('#avStage', { timeout: 120000 });
await p.waitForTimeout(1500);
// en el menú, las flechas sí cambian de personaje
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
const enMenu = await p.evaluate(() => JSON.parse(localStorage.getItem('herrizherri-perfil-v1')).avatar);
// a jugar: del selector a Inicio y su botón de jugar
await p.click('#csGo'); await p.waitForTimeout(1500);
await p.evaluate(() => [...document.querySelectorAll('#hub [data-play]')].find(x => x.offsetWidth)?.click());
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.waitForTimeout(2000);
const antes = await p.evaluate(() => JSON.parse(localStorage.getItem('herrizherri-perfil-v1')).avatar);
for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowLeft']) { await p.keyboard.down(k); await p.waitForTimeout(300); await p.keyboard.up(k); }
await p.waitForTimeout(800);
const despues = await p.evaluate(() => JSON.parse(localStorage.getItem('herrizherri-perfil-v1')).avatar);
const aviso = await p.evaluate(() => [...document.querySelectorAll('.toast, .err, #toast, .ctxlost')].map(x => x.textContent.trim()).filter(t => /error|cannot/i.test(t)));
console.log(JSON.stringify({ enMenu, antes, despues, mismoPersonaje: antes === despues, aviso, errores: errs }));
console.log(errs.length || aviso.length || antes !== despues ? 'MAL' : 'Todo correcto');
await b.close();
