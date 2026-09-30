// Capturas de todas las pantallas con botones para revisar su sentido y su alineación, y medida de
// los grupos de botones (anchos distintos, bordes que no coinciden, textos cortados).
// Uso: node tools/buttons.mjs <carpeta> [ancho alto] ; ONLY=juego|hub
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/botones', w = 390, h = 844] = process.argv;
mkdirSync(out, { recursive: true });
const mobile = +w < 900;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
const errs = [];
const tag = `${w}x${h}`;
const shot = (p, name) => p.screenshot({ path: `${out}/${tag}-${name}.png`, timeout: 180000 });
// grupos de botones: hermanos visibles con clase btn; informa de anchos y bordes izquierdos distintos
const measure = (p, name) => p.evaluate((name) => {
  const res = [];
  const groups = new Set([...document.querySelectorAll('.btn, .mapcard .mc-on')].filter(b => b.offsetParent).map(b => b.parentElement));
  for (const g of groups) {
    const bs = [...g.children].filter(b => b.offsetParent && (b.classList.contains('btn') || b.classList.contains('mc-on')));
    if (!bs.length) continue;
    const r = bs.map(b => b.getBoundingClientRect());
    const cut = bs.filter(b => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1).map(b => b.textContent.trim());
    res.push(`${name}: ${bs.map((b, i) => `[${b.textContent.trim().replace(/\s+/g, ' ').slice(0, 26)}] x${r[i].left.toFixed(0)} w${r[i].width.toFixed(0)} h${r[i].height.toFixed(0)}`).join(' · ')}${cut.length ? ' · CORTADO: ' + cut.join(', ') : ''}`);
  }
  return res.join('\n');
}, name);
const only = process.env.ONLY;

if (!only || only === 'juego') {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://127.0.0.1:5173/?town=lumbier', { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  await p.evaluate(() => { window.__game.updateInteraction = () => {}; });
  const step = async (name, fn, wait = 1500) => { await p.evaluate(fn); await p.waitForTimeout(wait); console.log(await measure(p, name) || name + ': (sin grupos .btn)'); await shot(p, name); };
  const close = () => p.evaluate(() => { window.__game.ui.closeModal(); document.querySelectorAll('.ov, .overlay, #dialog').forEach(o => o.remove()); });
  await step('pausa', () => window.__game.ui.openMenu()); await close();
  await step('mapa-tarjeta', () => { const ui = window.__game.ui; ui.openMap(); setTimeout(() => { const h = ui.mapView.hits.find(h => h.it.act === 'track'); ui.mapView.select(h.it); }, 600); }, 2500); await close();
  await step('cuaderno', () => window.__game.ui.openBook()); await close();
  await step('info', () => import('/src/ui/minigames.js').then(m => { m.infoCard(window.__game.ui, { icon: 'church', kicker: 'Patrimonio', title: 'Iglesia de San Pedro', text: 'Una iglesia de piedra en lo alto del pueblo.' }); }), 2500); await close();
  await step('mision-cumplida', () => import('/src/ui/minigames.js').then(m => { m.missionComplete(window.__game.ui, { title: 'Conoce Lumbier', text: 'Ya conoces el pueblo.', xp: 50, card: 'Lumbier', progress: { done: 1, total: 6, name: 'Lumbier' } }); }), 2500); await close();
  await step('final-pueblo', () => import('/src/ui/minigames.js').then(m => { m.townFinale(window.__game.ui, { town: 'Lumbier', stamp: '', missions: window.__game.missions.map(M => ({ icon: M.icon, title: M.title })), xp: 300, next: 'Sangüesa' }); }), 2500); await close();
  await step('dialogo-opciones', () => { window.__game.ui.dialog([{ who: 'Sabio del concejo', text: '¿Qué río pasa por Lumbier?', choices: ['El Irati', 'El Ebro', 'El Arga'] }]); }, 4000); await close();
  await step('premio', () => { window.__game.ui.reward({ icon: 'binoculars', title: 'Prismáticos', text: 'Ahora puedes observar animales de lejos.' }); }, 2500); await close();
  // pelota: panel de inicio y de final
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.waitForTimeout(2000);
  console.log(await measure(p, 'pelota-inicio')); await shot(p, 'pelota-inicio');
  console.log(await p.evaluate(() => [...document.querySelectorAll('.pel-panel button, .pel-root button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return `[${b.className}|${b.textContent.trim().slice(0, 20)}] x${r.left.toFixed(0)} w${r.width.toFixed(0)} h${r.height.toFixed(0)}`; }).join(' · ')));
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  await p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; for (let i = 0; i < 400 * 30 && m.active; i++) m.update(1 / 30); });
  await p.waitForTimeout(2500);
  console.log(await p.evaluate(() => [...document.querySelectorAll('.pel-panel button, .pel-root button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return `[${b.className}|${b.textContent.trim().slice(0, 20)}] x${r.left.toFixed(0)} w${r.width.toFixed(0)} h${r.height.toFixed(0)}`; }).join(' · ')));
  await shot(p, 'pelota-final');
  await p.close();
}
if (!only || only === 'hub') {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
  await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(6000);
  const go = async (name, s) => { await p.evaluate((s) => window.__hub.show?.(s) ?? document.querySelector(`[data-s="${s}"]`)?.click(), s); await p.waitForTimeout(2500); console.log(await measure(p, 'hub-' + name) || 'hub-' + name + ': (sin grupos .btn)'); await shot(p, 'hub-' + name); };
  console.log(await measure(p, 'hub-inicio')); await shot(p, 'hub-inicio');
  for (const s of ['map', 'avatars', 'profile', 'peaks']) await go(s, s);
  await p.evaluate(() => document.querySelector('[data-s="map"]')?.click()); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('.ccard')?.click()); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('.tcard')?.click()); await p.waitForTimeout(2000);
  console.log(await measure(p, 'hub-ficha-pueblo')); await shot(p, 'hub-ficha-pueblo');
  await p.close();
}
console.log([...new Set(errs)].slice(0, 10).join('\n'));
await browser.close();
