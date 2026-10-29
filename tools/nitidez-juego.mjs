// Nitidez dentro del juego en el iPhone 12 tumbado (844 × 390 a densidad 3; DPR= para otra): entra en un pueblo y mide el
// panel de juego, el cuaderno, la mochila, el mapa, un diálogo con retrato, una ficha con lámina, el premio y la pantalla
// de carga (la medida es la de tools/nitidez-medir.mjs: imágenes, fondos y lienzos).
// Con el servidor de pruebas normal mide la web; con MINI=1 npx vite, el archivo único.
// Uso: URL=http://127.0.0.1:5176/ node tools/nitidez-juego.mjs [carpeta] [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { medirEnPagina } from './nitidez-medir.mjs';
const URL = process.env.URL || 'http://127.0.0.1:5176/';
const out = process.argv[2] || 'entrega/nitidez-juego'; mkdirSync(out, { recursive: true });
const town = process.argv[3] || 'lesaka', DPR = +(process.env.DPR || 3);
const W = +(process.env.W || 844), H = +(process.env.H || 390), movil = DPR >= 2 && W < 1000;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: movil, hasTouch: movil })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`${URL}?town=${town}&q=low&skipintro=1&weather=clear`, { timeout: 600000 });
await p.waitForFunction(() => window.__game && window.__rt?.active && window.__rt.elapsed > 2, null, { timeout: 1500000 });
await p.waitForTimeout(2500);
const todo = {};
const ver = async (n) => {
  await p.waitForTimeout(1500); await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
  const r = todo[n] = (await p.evaluate(medirEnPagina)).sort((a, c) => c.up - a.up); await p.screenshot({ path: `${out}/${n}.png`, timeout: 300000 });
  const mal = r.filter(x => x.up > 1.5), blanda = r.filter(x => x.up > 1.2 && x.up <= 1.5);
  console.log(`\n== ${n}: ${r.length} imágenes · pixeladas ${mal.length} · blandas ${blanda.length}`);
  for (const x of [...mal, ...blanda].slice(0, 10)) console.log(`   ×${x.up} ${x.img} [${x.cls}] ${x.css.join('×')} css · ${x.nat.join('×')} px`);
};
const cerrar = () => p.evaluate(() => { const G = window.__game; G.ui.closeModal(); document.querySelectorAll('#dialog,.ix-ov,.mg-overlay,.sheet,.mo-root,.mochila').forEach(x => x.remove()); G.ui.dialogOpen = false; document.body.classList.remove('talking'); });
await ver('juego');
await p.evaluate(() => window.__game.ui.openTownBook()); await ver('cuaderno'); await cerrar();
await p.evaluate(() => window.__game.mochila?.open()); await ver('mochila'); await cerrar();
await p.evaluate(() => window.__game.ui.openMap()); await ver('mapa'); await cerrar();
await p.evaluate(() => { const G = window.__game, a = (G.actors || []).find(x => x.obj?.userData?.look);
  G.ui.dialog([{ name: a?.name || 'Maite', text: '¡Kaixo! Bienvenida a nuestro pueblo.', look: a?.obj?.userData?.look }]); });
await ver('dialogo'); await cerrar();
await p.evaluate(async () => { const { infoCard } = await import('/src/ui/minigames.js'); const { laminaUrl, townImg } = await import('/src/ui/laminas.js'); const G = window.__game;
  infoCard(G.ui, { icon: 'church', lamina: laminaUrl(G.def.id) || townImg(G.def), kicker: 'Ficha', title: G.def.name, text: 'Texto de prueba para medir la ilustración de la ficha.', button: 'Seguir' }); });
await ver('ficha-lamina'); await cerrar();
await p.evaluate(() => { window.__game.ui.reward({ icon: 'trophy', title: '¡Misión cumplida!', text: 'Has conocido el pueblo.', stamp: true }); }); await ver('premio'); await cerrar();
await p.evaluate(async () => { const { townImg } = await import('/src/ui/laminas.js'); const G = window.__game; G.ui.showLoading(G.def.name, 'Consejo de prueba', townImg(G.def), { comarca: 'Baztan-Bidasoa', caption: 'Portada', missions: ['church', 'star'], left: 3 }); });
await ver('carga');
writeFileSync(`${out}/nitidez-juego.json`, JSON.stringify(todo, null, 1));
const all = Object.values(todo).flat(), mal = all.filter(x => x.up > 1.5), bl = all.filter(x => x.up > 1.2 && x.up <= 1.5);
console.log(`\nTOTAL ${all.length} imágenes · pixeladas ${mal.length} · blandas ${bl.length}`);
console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
