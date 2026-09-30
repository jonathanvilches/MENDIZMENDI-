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
    if ((r.right > W + 1.5 || r.left < -1.5) && !scrollX(el) && !el.closest('.hub-bg,#stick,.mote,#cine,#fade,.burst,.ld-bg')) out.push(`sale de pantalla: ${name(el)} [${Math.round(r.left)}..${Math.round(r.right)}] "${(el.textContent || '').trim().slice(0, 30)}"`);
    const s = getComputedStyle(el);
    if (el.children.length === 0 && el.textContent.trim() && (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 2 && !/ellipsis/.test(s.textOverflow)) out.push(`texto cortado: ${name(el)} "${el.textContent.trim().slice(0, 40)}"`);
  }
  // piezas superpuestas al texto: ::before/::after con posición absoluta (números, insignias) y elementos
  // absolutos pequeños (etiquetas de estado) que tapan letras de otro elemento
  const textRects = (root, skip) => { const out = []; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim() || (skip && skip.contains(n)) || inHidden(n.parentElement) || !vis(n.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 2 && r.height > 2) out.push({ r, t: n.textContent.trim().slice(0, 24) }); } return out; };
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 3 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3;
  for (const el of document.querySelectorAll('body *')) {
    if (inHidden(el) || !vis(el) || el.closest('svg,#stick,.hub-bg')) continue;
    for (const pe of ['::before', '::after']) {
      const cs = getComputedStyle(el, pe);
      if (!cs.content || cs.content === 'none' || cs.content === 'normal' || cs.content === '""' || cs.position !== 'absolute' || cs.display === 'none') continue;   // sin contenido = brillo decorativo
      const w = parseFloat(cs.width), h = parseFloat(cs.height); if (!(w > 4 && h > 4) || w * h > 20000) continue;
      const b = el.getBoundingClientRect(), bl = parseFloat(getComputedStyle(el).borderLeftWidth) || 0, bt = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
      const L = cs.left !== 'auto' ? b.left + bl + parseFloat(cs.left) : b.right - (parseFloat(getComputedStyle(el).borderRightWidth) || 0) - parseFloat(cs.right) - w;
      const T = cs.top !== 'auto' ? b.top + bt + parseFloat(cs.top) : b.bottom - (parseFloat(getComputedStyle(el).borderBottomWidth) || 0) - parseFloat(cs.bottom) - h;
      const pr = { left: L, top: T, right: L + w, bottom: T + h };
      const tr = textRects(el).find(x => hit(pr, x.r));
      if (tr) out.push(`${pe} encima del texto: ${name(el)} tapa "${tr.t}"`);
    }
    const s = getComputedStyle(el);
    // solo piezas que se ven (fondo propio u hoja de texto): los contenedores transparentes no tapan nada
    const opaque = (() => { const m = s.backgroundColor.match(/rgba?\(([^)]+)\)/); const a = m ? (m[1].split(',')[3] ?? '1') : '0'; return +a > 0.3 || s.backgroundImage !== 'none'; })();
    if ((s.position === 'absolute') && (opaque || el.children.length === 0) && el.textContent.trim() && el.parentElement && !el.closest('#compass,#controls,#stick,#minimap,.bubble')) {
      const r = el.getBoundingClientRect(); if (r.width * r.height > 25000) continue;
      const tr = textRects(el.parentElement, el).find(x => hit(r, x.r));
      if (tr) out.push(`encima del texto: ${name(el)} "${el.textContent.trim().slice(0, 20)}" tapa "${tr.t}"`);
    }
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
for (const sz of sizes.split(',')) { try { await auditSize(sz); } catch (e) { report.push(`[${sz}] la auditoría falló: ${e.message.split('\n')[0]}`); } console.log(`— ${sz} hecho`); }
async function auditSize(sz) {
  const [w, h] = sz.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 1000, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // sin transiciones: se mide la posición final, no un fotograma a medio animar (swiftshader va a 1-2 fps)
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none!important}'; document.head.appendChild(st); }));
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const shot = (n) => page.screenshot({ path: `${dir}/${sz}-${n}.png`, timeout: 240000 });
  const log = async (n) => { const r = await page.evaluate(CHECK); if (r.length) { const t = `[${sz}] ${n}:\n  - ` + r.join('\n  - '); report.push(t); console.log(t); } };
  if (what !== 'game') {
    await page.goto(url, { timeout: 240000 });
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
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'town=etxalar', { timeout: 240000 });
    const started = await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }).then(() => true, () => false);
    if (!started) { errs.push('la partida no arrancó'); await shot('g-fallo'); await ctx.close(); report.push(`[${sz}] la partida no arrancó`); return; }
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
    // cuaderno del pueblo: las tres pestañas, con una misión en curso para ver todos los estados de los pasos
    await page.evaluate(() => { const g = window.__game; g.missions[g.missions.length - 1].done = true; g.ui.openBook(); });
    for (const t of ['misiones', 'lugares', 'comarca']) { await page.evaluate((t) => document.querySelector(`.tabs button[data-t="${t}"]`)?.click(), t); await page.waitForTimeout(700); await log('cuaderno ' + t); await shot('g-book-' + t); }
    await page.evaluate(() => window.__game.ui.closeModal()); await page.waitForTimeout(300);
    // pelota: panel de reglas, partido y panel final
    if (what === 'all' || what === 'game' || what === 'pelota') {
      await page.evaluate(() => { const g = window.__game; g.fronton.play(g, g.pelotari || g.missions.find(m => m.type === 'pelota')?.host || g.missions[0].host); });
      await page.waitForSelector('.pel-panel', { timeout: 60000 }).catch(() => errs.push('sin panel de pelota')); await page.waitForTimeout(1500);
      await log('pelota reglas'); await shot('p-intro');
      await page.evaluate(() => document.querySelector('.pel-go[data-pel-go]')?.click()); await page.waitForTimeout(1500);
      await page.evaluate(() => { const m = window.__game.pelotaMatch; if (m) { m.game.autoplay = true; for (let i = 0; i < 90; i++) m.update(1 / 30); } }); await page.waitForTimeout(1500);
      await log('pelota partido'); await shot('p-match');
      await page.evaluate(() => { const m = window.__game.pelotaMatch; if (m) for (let i = 0; i < 12000 && m.active && m.game.phase !== 'end'; i++) m.update(1 / 30); }); await page.waitForTimeout(2000);
      await log('pelota final'); await shot('p-end');
      await page.evaluate(() => document.querySelector('.pel-go[data-pel-cont]')?.click()); await page.waitForTimeout(1500);
    }
  }
  if (errs.length) report.push(`[${sz}] errores: ${[...new Set(errs)].join(' | ')}`);
  await ctx.close();
}
console.log(report.length ? report.join('\n') : 'Sin problemas detectados');
await browser.close();
