// Pop-ups medidos (no solo fotos): en tamaños de iPhone y iPad abre cada ventana del juego (pueblo, minijuegos, pelota,
// fútbol, liga y torneo) y anota lo que en el móvil se vería mal: algo que se sale de la pantalla sin poder desplazarse,
// contenido cortado (sin barra), texto que no cabe en su caja, botones de menos de 36 px, botones encima de otros y letra
// de menos de 11 px. Guarda una foto de cada uno. Uso: node tools/popups-medir.mjs [carpeta] [tamaños]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const [,, out = 'entrega/popups-medidos', sizes = '667x375,844x390,932x430,1180x820,390x844'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const MEDIR = () => {
  const W = innerWidth, H = innerHeight, issues = [], seen = new Set();
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const shown = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity >= 0.05; };
  const allVis = (e) => { if (!vis(e)) return false; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) if (!shown(q)) return false; return true; };
  const scroller = (e) => { for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const s = getComputedStyle(q); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (q.scrollHeight > q.clientHeight + 1 || q.scrollWidth > q.clientWidth + 1)) return q; } return null; };
  const name = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + (e.id ? '#' + e.id : '') + (e.textContent ? ' «' + e.textContent.trim().slice(0, 28) + '»' : '');
  const add = (k, e, x = '') => { const key = k + name(e); if (seen.has(key)) return; seen.add(key); issues.push([k, name(e), x]); };
  const roots = [...document.querySelectorAll('.screen,#reward,#dialog,.mg-overlay,.fb-panel,.pel-panel,.lg-root,.tn-root,.fb-msg.on,.pel-call.on,.modal,[role=dialog]')].filter(allVis);
  for (const R of roots) for (const e of [R, ...R.querySelectorAll('*')]) {
    if (!allVis(e)) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e), sc = scroller(e);
    // fuera de la pantalla sin poder desplazarse hasta ello
    if (!sc && s.pointerEvents !== 'none' && (r.left < -2 || r.right > W + 2 || r.top < -2 || r.bottom > H + 2) && !/^(svg|path|g|i|canvas)$/i.test(e.tagName) && r.width < W * 3) add('se sale', e, `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    // contenido cortado: caja que recorta sin barra
    if (/(hidden|clip)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 20 && !/(ellipsis)/.test(s.textOverflow)) add('cortado', e, `${e.scrollHeight - e.clientHeight}px`);
    // texto que no cabe a lo ancho
    if (e.childElementCount === 0 && e.textContent.trim() && /(hidden|clip)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis') add('texto no cabe', e, `${e.scrollWidth}>${e.clientWidth}`);
    // botones pequeños
    if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || (e.tagName === 'A' && e.href)) && (r.height < 36 || r.width < 36)) add('botón pequeño', e, `${Math.round(r.width)}x${Math.round(r.height)}`);
    // letra diminuta
    if (e.childElementCount === 0 && e.textContent.trim() && parseFloat(s.fontSize) < 11) add('letra < 11px', e, s.fontSize);
  }
  // botón de acción (seguir, jugar, salir, cerrar) que no se ve entero sin desplazar: en el móvil no se sabe que está
  const ACT = '.fb-go,.fb-alt,.pel-go,.btn.primary,.lg-btn:not(.lg-rv),.mg-card>button,.mg-card .btn,.close,#reward button';
  for (const R of roots) for (const e of R.querySelectorAll(ACT)) {
    if (!allVis(e)) continue; const r = e.getBoundingClientRect(); let top = 0, bot = H;
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const cs = getComputedStyle(q); if (/(auto|scroll|hidden)/.test(cs.overflowY)) { const qr = q.getBoundingClientRect(); top = Math.max(top, qr.top); bot = Math.min(bot, qr.bottom); } }
    if (r.bottom > bot + 1 || r.top < top - 1) add('acción oculta', e, `${Math.round(r.top)}-${Math.round(r.bottom)} de ${Math.round(top)}-${Math.round(bot)}`);
  }
  // botones encima de otros (solo si de verdad tapan: el de encima es el que se toca)
  const btns = roots.flatMap(R => [...R.querySelectorAll('button')]).filter(allVis).map(e => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const [ea, a] = btns[i], [eb, c] = btns[j]; if (ea.contains(eb) || eb.contains(ea)) continue; const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ox > 6 && oy > 6) { const cx = (Math.max(a.left, c.left) + Math.min(a.right, c.right)) / 2, cy = (Math.max(a.top, c.top) + Math.min(a.bottom, c.bottom)) / 2, top = document.elementFromPoint(cx, cy); if (top && (ea.contains(top) || eb.contains(top))) { const other = ea.contains(top) ? eb : ea, orr = other.getBoundingClientRect(); const vis2 = document.elementFromPoint((orr.left + orr.right) / 2, (orr.top + orr.bottom) / 2); if (vis2 && other.contains(vis2)) add('botones solapados', ea, name(eb)); } } }
  return { roots: roots.length, issues };
};
const report = {};
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number), touch = Math.min(W, H) < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: touch && W < 1000, hasTouch: touch });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=lumbier&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await p.evaluate(async () => { window.__mods = { MG: await import('/src/ui/minigames.js'), FI: await import('/src/ui/ficha.js'), FH: await import('/src/futbol/hud.js'), PH: await import('/src/pelota/hud.js'), PM: await import('/src/pelota/match.js'), PR: await import('/src/pelota/rules.js'), LG: await import('/src/futbol/liga.js'), TO: await import('/src/game/torneo.js'), CL: await import('/src/futbol/clubs.js') }; window.__club = Object.keys(window.__mods.CL.CLUBS)[0]; });
  const CASES = {
    'dialogo': `G.ui.dialog([{ name: 'Ane', text: 'Hola, ¿me ayudas a llevar el queso a la quesería? Está al otro lado del puente, junto a la iglesia.', choices: ['Sí, vamos', 'Ahora no puedo'] }])`,
    'premio': `G.ui.reward({ icon: 'star', title: 'Nueva insignia', text: 'Has conocido a todos los oficios del pueblo y aprendido cómo se hacía el queso.' })`,
    'cuaderno': `G.ui.openBook('misiones')`, 'mapa': `G.ui.openMap()`, 'pausa': `G.ui.openMenu()`,
    'mochila': `G.mochila?.open()`, 'tienda': `G.tienda?.open()`,
    'info': `M.MG.infoCard(G.ui, { icon: 'church', kicker: 'Arte gótico', title: 'Iglesia de San Pedro', text: 'Iglesia gótica del siglo XVI con contrafuertes, una gran torre y un rosetón sobre la portada. Dentro está el viejo órgano del monasterio.', badge: 'Nueva carta', button: 'Seguir (1/3)' })`,
    'mision-cumplida': `M.MG.missionComplete(G.ui, { title: 'Del rebaño al queso', text: 'Has ordenado bien todos los pasos y Ane ya tiene su queso.', xp: 40, card: 'Queso Idiazabal', progress: { done: 2, total: 5, name: 'Lumbier' } })`,
    'elegir': `M.MG.choiceGame(G.ui, { title: 'La quesería', q: '¿Qué se añade a la leche caliente para que cuaje?', options: ['Cuajo', 'Azúcar', 'Harina de maíz'], answer: 0, why: 'El cuajo separa la leche en cuajada y suero.' })`,
    'ordenar': `M.MG.sequenceGame(G.ui, { title: 'Del maíz a la harina', hint: 'Toca los pasos en el orden correcto', steps: ['Recoger las mazorcas', 'Desgranar el maíz', 'Secar el grano', 'Moler en el molino', 'Cerner la harina'] })`,
    'ficha': `M.FI.showFicha(M.FI.allFichas ? (M.FI.allFichas('fauna')[0].type + ':' + M.FI.allFichas('fauna')[0].id) : 'fauna:quebrantahuesos', { ui: G.ui, badge: 'Nueva carta', button: 'Seguir' })`,
    'pelota-inicio': `(() => { const m = Object.create(M.PM.PelotaMatch.prototype), root = document.createElement('div'); root.className = 'pm-test'; document.body.appendChild(root); Object.assign(m, { lang: 'es', txt: M.PR.TEXT.es, names: { you: 'Ane', rival: 'Mikel Etxeberria' }, touch: ${touch}, o: {}, level: 'normal', game: { mode: 'match', target: 7 }, audio: { ensure() {}, whistle() {}, crowd() {} } }); m.hud = new M.PH.PelotaHud(root, m.txt, m.names, ${touch}); m.intro(); })()`,
    'pelota-final': `(() => { const m = Object.create(M.PM.PelotaMatch.prototype), root = document.createElement('div'); root.className = 'pm-test'; document.body.appendChild(root); Object.assign(m, { lang: 'es', txt: M.PR.TEXT.es, names: { you: 'Ane', rival: 'Mikel Etxeberria' }, touch: ${touch}, o: {}, level: 'normal', game: { mode: 'match', target: 7 }, audio: { ensure() {}, whistle() {}, crowd() {} } }); m.hud = new M.PH.PelotaHud(root, m.txt, m.names, ${touch}); m.endPanel({ win: true, score: { you: 7, rival: 5 }, best: 0 }); })()`,
    'pelota-salir': `(() => { const m = Object.create(M.PM.PelotaMatch.prototype), root = document.createElement('div'); root.className = 'pm-test'; document.body.appendChild(root); Object.assign(m, { lang: 'es', txt: M.PR.TEXT.es, names: { you: 'Ane', rival: 'Mikel Etxeberria' }, touch: ${touch}, o: {}, level: 'normal', game: { mode: 'match', target: 7 }, audio: { ensure() {}, whistle() {}, crowd() {} } }); m.hud = new M.PH.PelotaHud(root, m.txt, m.names, ${touch}); m.confirmExit(); })()`,
    'futbol-menu': `M.FH.menuPanel({ title: 'El Sadar', sub: 'Pamplona / Iruña', modes: [['match', 'Partido'], ['penalties', 'Penaltis'], ['reto', 'Retos']], rivals: [['visitante', 'Visitante'], ['tudela', 'CD Tudelano']], values: { mode: 'match', rival: 'visitante', level: 'normal', duration: 3, assist: true } })`,
    'futbol-pausa': `(() => { const h = window.__fh = new M.FH.FutbolHud({ touch: ${touch}, home: { name: 'Club Atlético Osasuna', short: 'OSA', shirt: '#d00' }, away: { name: 'Club Deportivo Tudelano', short: 'TUD', shirt: '#06c' } }); h.pause(); })()`,
    'futbol-controles': `(() => { const h = window.__fh = new M.FH.FutbolHud({ touch: ${touch}, home: { name: 'Club Atlético Osasuna', short: 'OSA', shirt: '#d00' }, away: { name: 'Club Deportivo Tudelano', short: 'TUD', shirt: '#06c' } }); h.controls(); })()`,
    'futbol-final': `(() => { const h = window.__fh = new M.FH.FutbolHud({ touch: ${touch}, home: { name: 'Club Atlético Osasuna', short: 'OSA', shirt: '#d00' }, away: { name: 'Club Deportivo Tudelano', short: 'TUD', shirt: '#06c' } }); h.end({ title: '¡Victoria!', sub: 'Final del partido', score: '3 – 2', rows: [['3', 'Goles', '2'], ['9 (5)', 'Tiros (a puerta)', '7 (3)'], ['58 %', 'Posesión', '42 %'], ['31', 'Pases buenos', '24'], ['6', 'Robos', '4'], ['3', 'Paradas', '6'], ['5', 'Faltas', '8'], ['1', 'Amarillas', '2'], ['0', 'Rojas', '1']], again: 'Revancha', exit: 'Salir' }); })()`,
    'futbol-info': `(() => { const h = window.__fh = new M.FH.FutbolHud({ touch: ${touch}, home: { name: 'Club Atlético Osasuna', short: 'OSA', shirt: '#d00' }, away: { name: 'Club Deportivo Tudelano', short: 'TUD', shirt: '#06c' } }); h.info({ kicker: 'Reto', title: 'Conducción entre conos', text: 'Lleva el balón pegado al pie entre los conos sin tocarlos. Cuanto más rápido, más puntos.', button: 'Empezar' }); })()`,
    'liga-club': `(() => { window.__fh?.dispose(); M.LG.clubPick(); })()`,
    'liga-menu': `(() => { document.querySelectorAll('.lg-root').forEach(x => x.remove()); M.LG.clubPanel(window.__club, [['liga', 'Liga Navarra · jornada 1', 'Fútbol 11 contra los clubes de tu grupo'], ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['sadar', 'El Sadar', 'Fútbol 11 en el estadio de Iruña'], ['sala', 'Fútbol sala', '5 contra 5 en la pista del pueblo'], ['club', 'Cambiar de club', 'Osasuna'], ['exit', 'Salir', '']], 'Campeonato de fútbol'); })()`,
    'liga-rival': `(() => { document.querySelectorAll('.lg-root').forEach(x => x.remove()); M.LG.rivalPanel(window.__club); })()`,
    'liga-tabla': `(() => { document.querySelectorAll('.lg-root').forEach(x => x.remove()); M.LG.ligaPanel(M.LG.season(window.__club)); })()`,
    'pelota-menu': `(() => { document.querySelectorAll('.lg-root').forEach(x => x.remove()); const g = window.__game, T = M.TO.torneo({ name: 'Ane', town: 'Lumbier' }, { comarca: g.def.comarca, comarcaName: 'la comarca', towns: g.comarcaVenues() }); M.TO.pelotaMenu(T, 'Lumbier'); })()`,
    'torneo': `(() => { document.querySelectorAll('.lg-root,.tn-root').forEach(x => x.remove()); const g = window.__game, T = M.TO.torneo({ name: 'Ane', town: 'Lumbier' }, { comarca: g.def.comarca, comarcaName: 'la comarca', towns: g.comarcaVenues() }); M.TO.torneoPanel(T, 'Lumbier'); })()`,
  };
  report[sz] = {};
  for (const [k, code] of Object.entries(CASES)) {
    if (process.env.SOLO && !process.env.SOLO.split(',').includes(k)) continue;   // (SOLO=futbol-final,torneo: solo esas)
    try {
      await p.evaluate((code) => { const G = window.__game, M = window.__mods; G.ui.closeModal?.(); G.ui.dialogOpen = false; document.querySelectorAll('.mg-overlay,.lg-root,.tn-root,#dialog,.fb-root,.pm-test,#reward').forEach(o => o.remove()); window.__r = eval(code); window.__r?.catch?.(() => {}); }, code);
      await p.waitForTimeout(k === 'ficha' || k === 'mapa' ? 2500 : 700);
      await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }));
      const r = await p.evaluate(MEDIR);
      report[sz][k] = r.roots ? r.issues : [['sin ventana', '', '']];
      await p.screenshot({ path: `${out}/${sz}-${k}.png` });
    } catch (e) { report[sz][k] = [['error', String(e.message).slice(0, 140), '']]; }
  }
  if (errs.length) report[sz].__errores = errs.slice(0, 5);
  await ctx.close();
}
writeFileSync(`${out}/informe.json`, JSON.stringify(report, null, 1));
let n = 0; for (const [sz, R] of Object.entries(report)) for (const [k, L] of Object.entries(R)) if (L.length) { n += L.length; console.log(sz, k, JSON.stringify(L).slice(0, 600)); }
console.log(n ? `${n} problemas` : 'Todo cabe y se lee bien');
await b.close();
