// Flujo del juego en el navegador: entrar y salir de los partidos por todos los caminos y mirar, en cada paso, que se
// llega a donde toca y que nada se queda a medias (el menú encima del pueblo, el jugador congelado, los controles del
// partido sobre la calle, el marcador en el menú...). Escenarios:
//   menu   desde el inicio: Torneos > pelota (partido libre, torneo, salir y volver a entrar) y Torneos > fútbol
//   pueblo dentro de un pueblo: el pelotari (partido libre, torneo, salir a medias, acabar), la pausa y salir al mapa
// Uso: node tools/flujo-ver.mjs [menu|pueblo] [carpeta] [pueblo]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const [,, scen = 'menu', out = 'entrega/flujo', town = 'elizondo'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); if (!localStorage.getItem('mendimendiz-perfil-v1')) localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
const log = [], problems = [];
let n = 0;
// lo que hay en pantalla y el estado del juego
const state = () => p.evaluate(() => {
  document.getElementById('dialog')?.getAnimations?.().forEach(a => a.finish());   // (la entrada del diálogo, acabada: a una imagen por segundo va con retraso)
  const G = window.__game, q = (s) => document.querySelectorAll(s).length, vis = (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  return { hub: !!document.getElementById('hub') && !document.getElementById('hub').classList.contains('hidden'), pantalla: window.__hub?.visible ? window.__hub.screen : null, juego: !!G, modo: G?.mode ?? null, congelado: !!G?.player?.frozen, deporte: !!G?.sportMode,
    partido: !!G?.pelotaMatch, preparando: !!G?.pelotaLoading, hudPueblo: !!G?.ui?.hud && G.ui.hud.style.display !== 'none', dialogo: !!G?.ui?.dialogOpen, dialogoVisible: vis('#dialog'), ventana: !!G?.ui?.modal,
    menus: q('.lg-root'), pelota: q('.pel-root'), panelPelota: q('.pel-panel'), minijuego: q('.mg-overlay'), futbol: q('.fb-root') + (document.body.classList.contains('futbol') ? 1 : 0),
    lienzo: getComputedStyle(document.getElementById('c')).visibility, rt: !!window.__rt?.active, cine: !!G?.follow?.cinematic, carga: vis('#loading, .loading, .ld-root'),
    botones: [...document.querySelectorAll('.lg-root [data-a], .pel-panel button, .lg-root button')].map(b => (b.dataset.a || b.innerText || '').replace(/\s+/g, ' ').slice(0, 28)).slice(0, 8) };
});
const snap = async (tag, expect = {}) => {
  const s = await state(); n++;
  const bad = Object.entries(expect).filter(([k, v]) => typeof v === 'function' ? !v(s[k], s) : s[k] !== v).map(([k, v]) => `${k}=${JSON.stringify(s[k])} (se esperaba ${typeof v === 'function' ? 'otra cosa' : JSON.stringify(v)})`);
  log.push({ n, tag, ...s, mal: bad }); if (bad.length) problems.push(`${n}. ${tag}: ${bad.join(', ')}`);
  console.log(`${String(n).padStart(2)} ${bad.length ? 'MAL' : 'ok '} ${tag} · ${JSON.stringify({ hub: s.hub, modo: s.modo, cong: s.congelado, partido: s.partido, menus: s.menus, pel: s.pelota, hud: s.hudPueblo, dlg: s.dialogo, fut: s.futbol, lienzo: s.lienzo })}${bad.length ? ' · ' + bad.join(', ') : ''}`);
  await p.screenshot({ path: `${out}/${String(n).padStart(2, '0')}-${tag.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png` }).catch(() => {});
  return s;
};
const click = async (sel, ms = 240000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => { const e = [...document.querySelectorAll(s)].pop(); e.click(); }, sel); await p.waitForTimeout(500); };
const waitFor = (fn, ms = 240000, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 });
// pasa los diálogos (como quien toca para seguir)
const talkThrough = async () => { for (let i = 0; i < 20; i++) { await p.waitForTimeout(700); const d = await p.evaluate(() => !!window.__game?.ui?.dialogOpen); if (!d) return; await p.evaluate(() => document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); } };
// una pulsación de E de más (teclado): no debe empezar nada detrás de un menú
const strayE = async () => { await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); await p.waitForTimeout(120); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'e' }))); await p.waitForTimeout(1500); };
// ¿se mueve el jugador con el teclado?
// (el navegador de pruebas pinta una imagen por segundo: se mantiene la tecla hasta que pasan 25 imágenes; se prueba
// hacia delante y hacia atrás, por si delante hay una pared)
const moves = async () => { let best = 0; for (const k of ['w', 's']) { const a = await p.evaluate(() => ({ ...window.__game.player.pos, f: window.__rt.frameNo })); await p.evaluate((k) => dispatchEvent(new KeyboardEvent('keydown', { key: k })), k);
  await p.waitForFunction((f0) => window.__rt.frameNo - f0 >= 25, a.f, { timeout: 90000 }).catch(() => {}); await p.evaluate((k) => dispatchEvent(new KeyboardEvent('keyup', { key: k })), k);
  const c = await p.evaluate(() => ({ ...window.__game.player.pos })); best = Math.max(best, Math.hypot(c.x - a.x, c.z - a.z)); if (best > 1) break; } return best; };
// partido de pelota: empezar y avanzar la lógica a mano (el navegador sin tarjeta gráfica pinta muy despacio)
const startMatch = async () => { await click('.pel-panel [data-pel-go]'); await waitFor(() => !document.querySelector('.pel-panel') && window.__game?.pelotaMatch?.game?.phase !== 'intro'); };
const stepMatch = (k = 60) => p.evaluate((k) => { const m = window.__game.pelotaMatch; for (let i = 0; i < k && m?.active; i++) m.update(1 / 30); }, k);
// acabar el partido ganando (el último tanto se juega de verdad: el árbitro lo canta y sale el panel del final)
const winMatch = async () => { await p.evaluate(() => { const m = window.__game.pelotaMatch, g = m.game; g.score.you = g.target - 1; if (g.phase !== 'rally') { g.toServe(); } g.point('you', 'chapa'); }); for (let i = 0; i < 12; i++) { await stepMatch(30); if (await p.evaluate(() => !!document.querySelector('[data-pel-cont]'))) break; } };
const NOPEL = { pelota: 0, partido: false };   // (fuera del partido, nada de él en pantalla)

if (scen === 'menu') {
  await p.goto('http://127.0.0.1:5173/?q=low&weather=clear', { timeout: 300000 });
  await waitFor(() => window.__ready && window.__hub?.visible, 300000);
  await snap('inicio', { hub: true, juego: false });
  // ---- campeonato de pelota desde el menú
  await click('#hNav [data-s="sports"]'); await click('[data-sport="pelota"]');
  await waitFor(() => document.querySelector('.lg-root [data-a="libre"]'), 600000); await p.waitForTimeout(1500);
  await snap('menu pelota desde Torneos', { hub: false, menus: 1, ...NOPEL, hudPueblo: false });
  await click('[data-a="libre"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000); await p.waitForTimeout(800);
  await snap('partido libre: panel de antes', { menus: 0, panelPelota: 1, partido: true });
  await click('.pel-panel [data-pel-x]'); await waitFor(() => document.querySelector('.lg-root [data-a="libre"]'), 60000);
  await snap('Más tarde: vuelve al menú de pelota', { menus: 1, ...NOPEL, hudPueblo: false, congelado: true });
  await strayE(); await snap('E de más con el menú abierto: nada detrás', { menus: 1, ...NOPEL, dialogo: false });
  await click('[data-a="libre"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
  await startMatch(); await stepMatch(90);
  await snap('jugando', { partido: true, menus: 0, panelPelota: 0 });
  await click('.pel-exit'); await snap('X: ¿salir?', { panelPelota: 1 });
  await click('[data-pel-yes]'); await waitFor(() => document.querySelector('.lg-root [data-a="libre"]'), 60000);
  await snap('salir del partido: vuelve al menú de pelota', { menus: 1, ...NOPEL });
  await click('[data-a="libre"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
  await startMatch(); await winMatch();
  await snap('partido ganado: panel del final', { panelPelota: 1, botones: (v) => v.includes('Volver al menú') && !v.includes('Volver al pueblo') });
  await click('[data-pel-cont]'); await waitFor(() => window.__game?.ui?.dialogOpen, 60000); await p.waitForTimeout(900);   // (el diálogo entra con una animación)
  await snap('Seguir tras ganar: el pelotari habla y se ve', { ...NOPEL, dialogo: true, dialogoVisible: true, congelado: true });
  await talkThrough(); await waitFor(() => document.querySelector('.lg-root [data-a="libre"]'), 60000);
  await snap('tras el diálogo: menú de pelota', { menus: 1, ...NOPEL, dialogo: false });
  // ---- torneo individual
  await click('[data-a="torneo"]'); await waitFor(() => document.querySelector('.lg-root [data-a="play"], .lg-root [data-a="new"], .lg-root [data-a="sim"]'), 60000);
  await snap('cuadro del torneo', { menus: 1, ...NOPEL });
  if (await p.evaluate(() => !!document.querySelector('.lg-root [data-a="play"]'))) {
    await click('[data-a="play"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
    await snap('torneo: panel de antes del partido', { menus: 0, panelPelota: 1 });
    await click('.pel-panel [data-pel-x]'); await p.waitForTimeout(1500);
    await snap('torneo: Más tarde', { ...NOPEL, menus: 1 });
    // (a donde haya ido, se sigue hasta el cuadro del torneo)
    if (await p.evaluate(() => !!document.querySelector('.lg-root [data-a="torneo"]'))) await click('[data-a="torneo"]');
    await waitFor(() => document.querySelector('.lg-root [data-a="play"]'), 60000);
    await click('[data-a="play"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
    await startMatch(); await winMatch();
    const fin = await snap('torneo: partido ganado', { panelPelota: 1 });
    await snap('torneo: sin «Otra partida» y con «Seguir con el torneo»', { botones: (v) => !v.some(t => /otra|again|berriz/i.test(t)) && v.includes('Seguir con el torneo') });
    await click('[data-pel-cont]'); await talkThrough(); await p.waitForTimeout(800);
    await snap('torneo: tras ganar, de vuelta al cuadro', { menus: 1, ...NOPEL, dialogo: false, botones: (v) => v.includes('play') || v.includes('new') || v.includes('sim') });
    await click('[data-a="exit"]'); await p.waitForTimeout(800);
  }
  await snap('salir del cuadro: menú de pelota', { menus: 1, ...NOPEL, botones: (v) => v.includes('libre') });
  await click('[data-a="exit"]'); await waitFor(() => window.__hub?.visible, 120000); await p.waitForTimeout(1500);
  await snap('Salir: de vuelta a Torneos', { hub: true, pantalla: 'sports', juego: false, menus: 0, pelota: 0, lienzo: 'hidden' });
  // ---- volver a entrar
  await click('[data-sport="pelota"]');
  await waitFor(() => document.querySelector('.lg-root [data-a="libre"]'), 600000); await p.waitForTimeout(1000);
  await snap('volver a entrar: menú de pelota', { hub: false, menus: 1, ...NOPEL });
  await click('[data-a="exit"]'); await waitFor(() => window.__hub?.visible, 120000); await p.waitForTimeout(1000);
  await snap('y salir otra vez', { hub: true, pantalla: 'sports', juego: false, menus: 0 });
  // ---- campeonato de fútbol
  await click('[data-sport="futbol"]');
  await waitFor(() => document.querySelector('.lg-root'), 300000); await p.waitForTimeout(1000);
  await snap('fútbol: primer menú', { hub: false, menus: 1 });
  // (si pide club, el primero)
  if (await p.evaluate(() => !document.querySelector('.lg-root [data-a="amistoso"]'))) { await p.evaluate(() => document.querySelector('.lg-root [data-c], .lg-root .lg-list button, .lg-root button')?.click()); await p.waitForTimeout(800); }
  await waitFor(() => document.querySelector('.lg-root [data-a="amistoso"]'), 60000);
  await snap('fútbol: menú del club', { menus: 1 });
  await click('[data-a="amistoso"]'); await p.waitForTimeout(800);
  await snap('fútbol: elegir rival', { menus: 1 });
  await p.evaluate(() => document.querySelector('.lg-root .lg-list button, .lg-root [data-c]')?.click()); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.lg-root [data-a="play"], .lg-root .go')?.click());
  await waitFor(() => document.body.classList.contains('futbol') && document.querySelector('.fb-root'), 900000).catch(() => {});
  await p.waitForTimeout(1500);
  await snap('fútbol: partido', { menus: 0 });
  await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(1200);
  await snap('fútbol: pausa');
  await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-root button, .fb-panel button')].find(x => /salir|abandon|quit/i.test(x.innerText + (x.dataset.a || x.dataset.r || ''))); b?.click(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-root button, .fb-panel button')].find(x => /s[ií]|salir|yes/i.test(x.innerText)); b?.click(); }); await p.waitForTimeout(3000);
  await snap('fútbol: salir del partido', { futbol: 0, menus: 1 });
  await p.evaluate(() => document.querySelector('.lg-root [data-a="exit"]')?.click()); await p.waitForTimeout(1500);
  if (await p.evaluate(() => !!document.querySelector('.lg-root [data-a="exit"]'))) await click('[data-a="exit"]');
  await waitFor(() => window.__hub?.visible, 120000).catch(() => {}); await p.waitForTimeout(1200);
  await snap('fútbol: Salir, de vuelta a Torneos', { hub: true, pantalla: 'sports', menus: 0, futbol: 0, lienzo: 'hidden' });
}

if (scen === 'pueblo') {
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
  await waitFor(() => window.__game && window.__game.mode === 'play', 900000); await p.waitForTimeout(3000);
  const toPelotari = () => p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
  const TOWN = { hub: false, modo: 'play', congelado: false, hudPueblo: true, menus: 0, ...NOPEL, dialogo: false };
  await snap('en el pueblo', TOWN);
  // menú del pelotari y salir
  await toPelotari(); await talkThrough(); await waitFor(() => document.querySelector('.lg-root [data-a="libre"]'), 60000);
  const m0 = await snap('menú del pelotari', { menus: 1 });
  // con el menú abierto, ¿se sigue moviendo el jugador o se abre otro menú con E?
  const d0 = await moves(); await p.evaluate(() => { dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); }); await p.waitForTimeout(150); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'e' }))); await p.waitForTimeout(1500); await talkThrough();
  await snap(`menú abierto: el jugador anda ${d0.toFixed(1)} m por detrás`, { menus: 1, dialogo: false, congelado: true, hudPueblo: false });
  if (d0 > 0.3) problems.push(`con el menú de pelota abierto, el jugador se mueve por detrás (${d0.toFixed(1)} m)`);
  await p.evaluate(() => { const r = [...document.querySelectorAll('.lg-root')]; r.slice(0, -1).forEach(x => x.remove()); });
  await click('[data-a="exit"]'); await p.waitForTimeout(800);
  const d1 = await moves(); await snap(`Salir del menú: en el pueblo (anda ${d1.toFixed(1)} m)`, TOWN); if (d1 < 0.3) problems.push('tras salir del menú de pelota el jugador no se mueve');
  // partido libre: Más tarde
  await toPelotari(); await talkThrough(); await click('[data-a="libre"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
  await snap('partido libre: panel de antes', { panelPelota: 1, partido: true, hudPueblo: false });
  await click('.pel-panel [data-pel-x]'); await p.waitForTimeout(1500);
  const d2 = await moves(); await snap(`Más tarde: en el pueblo (anda ${d2.toFixed(1)} m)`, TOWN); if (d2 < 0.3) problems.push('tras «Más tarde» el jugador no se mueve');
  // partido libre: salir a medias con la X
  await toPelotari(); await talkThrough(); await click('[data-a="libre"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
  await startMatch(); await stepMatch(90); await snap('jugando', { partido: true, hudPueblo: false });
  await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(300); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' })));
  await snap('Escape en el partido: ¿salir?', { panelPelota: 1, ventana: false });
  await click('[data-pel-yes]'); await p.waitForTimeout(1500);
  const d3 = await moves(); await snap(`salir del partido: en el pueblo (anda ${d3.toFixed(1)} m)`, TOWN); if (d3 < 0.3) problems.push('tras salir del partido el jugador no se mueve');
  // partido libre: ganar y Seguir
  await toPelotari(); await talkThrough(); await click('[data-a="libre"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
  await startMatch(); await winMatch(); await snap('ganado: panel del final', { panelPelota: 1, botones: (v) => v.includes('Volver al pueblo') });
  await click('[data-pel-cont]'); await talkThrough(); await p.waitForTimeout(1000);
  const d4 = await moves(); await snap(`tras ganar y Seguir: en el pueblo (anda ${d4.toFixed(1)} m)`, TOWN);
  // torneo: Más tarde y luego jugar y ganar
  await toPelotari(); await talkThrough(); await click('[data-a="torneo"]');
  await waitFor(() => document.querySelector('.lg-root [data-a="play"], .lg-root [data-a="new"], .lg-root [data-a="sim"]'), 60000);
  await snap('cuadro del torneo', { menus: 1, hudPueblo: false });
  if (await p.evaluate(() => !!document.querySelector('.lg-root [data-a="play"]'))) {
    await click('[data-a="play"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
    await click('.pel-panel [data-pel-x]'); await p.waitForTimeout(1500);
    await snap('torneo: Más tarde', { ...NOPEL, menus: 1, botones: (v) => v.includes('play') });
    if (!(await p.evaluate(() => !!document.querySelector('.lg-root [data-a="play"]')))) { await toPelotari(); await talkThrough(); await click('[data-a="torneo"]'); }
    await click('[data-a="play"]'); await waitFor(() => document.querySelector('.pel-panel [data-pel-go]'), 300000);
    await startMatch(); await winMatch(); await snap('torneo: ganado', { panelPelota: 1, botones: (v) => !v.some(t => /otra|again/i.test(t)) && v.includes('Seguir con el torneo') });
    await click('[data-pel-cont]'); await talkThrough(); await p.waitForTimeout(1000);
    await snap('torneo: tras ganar, el cuadro', { menus: 1, ...NOPEL, dialogo: false, hudPueblo: false });
    await click('[data-a="exit"]'); await p.waitForTimeout(1000);
  }
  const d5 = await moves(); await snap(`salir del torneo: en el pueblo (anda ${d5.toFixed(1)} m)`, TOWN);
  // pausa y salir al mapa
  await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(200); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' })));
  await waitFor(() => !!window.__game?.ui?.modal, 90000).catch(() => {});
  await snap('pausa', { ventana: true });
  await click('#mExit'); await waitFor(() => window.__hub?.visible, 120000); await p.waitForTimeout(1500);
  await snap('salir al mapa', { hub: true, juego: false, menus: 0, pelota: 0, lienzo: 'hidden' });
}
writeFileSync(`${out}/flujo-${scen}.json`, JSON.stringify({ log, problems, errs }, null, 1));
console.log('\nPROBLEMAS:', problems.length ? '\n - ' + problems.join('\n - ') : 'ninguno');
console.log('ERRORES:', errs.length ? errs.slice(0, 8) : 'ninguno');
await b.close();
