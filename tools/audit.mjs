// Auditoría de diseño adaptable: busca desbordes, textos cortados y solapes del HUD en varios tamaños.
// Uso: node tools/audit.mjs <url> <carpeta capturas> [tamaños ej. 360x640,844x390] [hub|game|all]
import { chromium } from 'playwright-core';
const [,, url, dir, sizes = '360x640,390x844,430x932,667x375,844x390,768x1024,1280x720', what = 'all'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = [];
// comprobaciones dentro de la página
const CHECK = () => {
  const W = innerWidth, H = innerHeight, out = [];
  const scrollX = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 2) return true; } return false; };
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const name = (el) => el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase();
  const inHidden = (el) => { for (let p = el; p; p = p.parentElement) if (p.classList?.contains('hidden')) return true; return false; };
  for (const el of document.querySelectorAll('body *')) {
    if (inHidden(el) || !vis(el) || el.closest('svg') || el.tagName === 'CANVAS') continue;
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1.5 || r.left < -1.5) && !scrollX(el) && !el.closest('.hub-bg,#stick,.mote,#cine,#fade,.burst')) out.push(`sale de pantalla: ${name(el)} [${Math.round(r.left)}..${Math.round(r.right)}] "${(el.textContent || '').trim().slice(0, 30)}"`);
    const s = getComputedStyle(el);
    if (el.children.length === 0 && el.textContent.trim() && (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 2 && !/ellipsis/.test(s.textOverflow)) out.push(`texto cortado: ${name(el)} "${el.textContent.trim().slice(0, 40)}"`);
  }
  // solapes entre piezas del HUD
  const hud = ['#compass', '#tl', '#topright', '#prompt', '#toast.on', '#controls', '#stickHint:not(.gone)', '#mg', '#dialog'].map(q => document.querySelector(q)).filter(e => e && !inHidden(e) && vis(e));
  for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++) {
    const a = hud[i].getBoundingClientRect(), b = hud[j].getBoundingClientRect();
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 4 && oy > 4) out.push(`solape HUD: ${name(hud[i])} con ${name(hud[j])} (${Math.round(ox)}×${Math.round(oy)})`);
  }
  if (document.documentElement.scrollWidth > W + 1) out.push(`la página tiene desplazamiento horizontal (${document.documentElement.scrollWidth} > ${W})`);
  return [...new Set(out)].slice(0, 25);
};
for (const sz of sizes.split(',')) {
  const [w, h] = sz.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 1000, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const shot = (n) => page.screenshot({ path: `${dir}/${sz}-${n}.png`, timeout: 240000 });
  const log = async (n) => { const r = await page.evaluate(CHECK); if (r.length) report.push(`[${sz}] ${n}:\n  - ` + r.join('\n  - ')); };
  if (what !== 'game') {
    await page.goto(url);
    await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    await log('bienvenida'); await shot('onb');
    await page.evaluate(() => { const i = document.querySelector('#oName'); if (i) { i.value = 'Aitziber'; document.querySelector('#oGo').click(); } });
    await page.waitForTimeout(900);
    for (const s of ['home', 'map', 'towns', 'peaks', 'nature', 'avatars', 'badges', 'passport', 'profile']) { await page.evaluate((s) => window.__hub.go(s), s); await page.waitForTimeout(700); await log(s); await shot(s); }
    await page.evaluate(() => window.__hub.go('comarca', 'bidasoa')); await page.waitForTimeout(700); await log('comarca'); await shot('comarca');
    await page.evaluate(() => window.__hub.townSheet('etxalar')); await page.waitForTimeout(700); await log('ficha'); await shot('sheet');
    await page.evaluate(() => { window.__hub.go('home'); window.__hub.more(); }); await page.waitForTimeout(700); await log('más'); await shot('more');
  }
  if (what !== 'hub') {
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'town=etxalar');
    await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 180000 }).catch(() => errs.push('la partida no arrancó'));
    await page.waitForTimeout(2500);
    await log('partida'); await shot('g-hud');
    await page.evaluate(() => { const g = window.__game, M = g.missions[0]; g.player.place(M.host.pos.x + 1.5, M.host.pos.z + 1.5, 0); g.follow.snap(g.player); });
    await page.evaluate(() => window.__game.ui.toast('¡Bienvenido a Etxalar! Habla con Guía Iker para empezar', 'sparkle', 60000));
    await page.waitForTimeout(1200); await log('partida con acción'); await shot('g-prompt');
    // diálogo con elecciones
    await page.evaluate(() => { window.__game.ui.dialog([{ who: 'Guía Iker', look: window.__game.missions[0].host.look, text: '¿Qué quieres saber de Etxalar? Tiene casas de piedra, palomeras y una iglesia preciosa.', choices: ['Háblame de las palomeras', 'Enséñame la iglesia', 'Luego vuelvo'] }]); });
    await page.waitForTimeout(3500); await log('diálogo'); await shot('g-dialog');
    await page.keyboard.press('3'); await page.waitForTimeout(500);
    for (const [n, fn] of [['cuaderno', 'openBook'], ['mapa', 'openMap'], ['menú', 'openMenu']]) { await page.evaluate((fn) => window.__game.ui[fn](), fn); await page.waitForTimeout(900); await log(n); await shot('g-' + fn); await page.evaluate(() => window.__game.ui.closeModal()); await page.waitForTimeout(300); }
  }
  if (errs.length) report.push(`[${sz}] errores: ${errs.join(' | ')}`);
  await ctx.close();
}
console.log(report.length ? report.join('\n') : 'Sin problemas detectados');
await browser.close();
