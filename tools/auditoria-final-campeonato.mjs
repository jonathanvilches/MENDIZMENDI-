// El final de un campeonato de pelota, entero y como lo juega el autor: el cuadro del campeonato, la final (con el baile
// del que gana y los mejores tantos), el panel del final, la tarjeta de campeón y la vuelta al cuadro, ya terminado, y
// de ahí al pueblo. Las rondas de antes se dan por jugadas (ganadas) y la final se juega sola (el piloto lleva a tu
// pelotari), a 3 tantos para que no dure. En cada paso pulsa lo que pulsaría el jugador y apunta dónde está; si algo se
// queda quieto más de dos minutos, dice dónde, guarda la imagen y sale con código 1. El autor, 28 nov 2026: «estuve
// jugando varios campeonatos de pelota y se me bloqueaba al final del campeonato. Revisa todo». Pasarla antes de publicar.
// Uso: URL=http://127.0.0.1:5176/ node tools/auditoria-final-campeonato.mjs [844x390] [gana|pierde] [mano|parejas|…] [carpeta]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const URL = (process.env.URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const [,, sz = '844x390', como = 'gana', kind = 'mano', out = '/tmp/final-campeonato'] = process.argv;
const [W, H] = sz.split('x').map(Number), mob = W < 1000, gana = como !== 'pierde';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext(mob ? { viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true } : { viewport: { width: W, height: H } });
const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 240)));
// (con el baile y los highlights, que en las pruebas automáticas van quitados: aquí se quiere todo lo que ve el jugador)
await p.addInitScript(() => { window.__baile = 1; window.__hl = 1; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-mando-noofrecer', '1');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, botillero: 'patxi' })); });
await p.goto(`${URL}?town=${process.env.PUEBLO || 'lumbier'}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0).padStart(4) + 's', ...a);
// el campeonato, con las rondas de antes ganadas: la siguiente es la final
const prep = await p.evaluate(async (kind) => {
  const G = window.__game, Tm = await import('/src/game/torneo.js'), { tantosDe } = await import('/src/pelota/rules.js');
  const ctx = { comarca: G.def.comarca, comarcaName: G.comarca?.name || 'la comarca', towns: G.comarcaVenues() };
  const T = Tm.torneo({ name: 'Tú', town: G.def.name.split(' /')[0] }, ctx, true, kind); T.elegido = true;
  for (let i = 0; i < 30 && !T.done; i++) { const m = Tm.yourMatch(T); if (m?.round === 'Final') break; if (m) Tm.playTorneoRound(T, tantosDe(m.target), 0); else Tm.playTorneoRound(T); }
  const m = Tm.yourMatch(T);
  window.__torFin = null;
  G.pelotaTorneo(G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, ctx, kind).then(() => { window.__torFin = 'ok'; }, (e) => { window.__torFin = 'error: ' + String(e?.stack || e).slice(0, 300); });
  return { ronda: m?.round || null, rival: m?.rival?.name || null };
}, kind);
log('campeonato', kind, JSON.stringify(prep));
if (prep.ronda !== 'Final') { console.log('MAL: no se llega a la final'); await b.close(); process.exit(1); }
// lo que pulsaría el jugador en cada momento, y dónde está
const paso = () => p.evaluate((gana) => {
  const q = (s) => document.querySelector(s), G = window.__game, M = G.pelotaMatch, g = M?.active ? M.game : null, lg = '.lg-root:not(.out) ';
  if (window.__torFin) return 'FIN ' + window.__torFin;
  if (q('.champ .ch-btn')) { q('.champ .ch-btn').click(); return 'tarjeta de campeón'; }
  if (q(lg + '[data-a="new"]')) { if (!window.__vistoHecho) { window.__vistoHecho = 1; return 'cuadro terminado'; } q(lg + '[data-a="exit"]')?.click(); return 'salir del cuadro'; }
  if (q(lg + '[data-a="play"]')) { q(lg + '[data-a="play"]').click(); return 'cuadro: ¡a jugar!'; }
  if (q(lg + '.c3-jugar')) { q(lg + '.c3-jugar').click(); return 'elige pelotari'; }
  if (q('.pel-panel [data-pel-cont]')) { q('.pel-panel [data-pel-cont]').click(); return 'panel del final'; }
  if (q('.pel-panel [data-pel-go]')) { q('.pel-panel [data-pel-go]').click(); return 'presentación'; }
  if (q('.pel-toss-go')) { q('.pel-toss-go').click(); return 'sorteo'; }
  if (document.getElementById('dialog')) { document.getElementById('dialog').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'charla'; }
  // (ganando: jugado un tanto de verdad, para que haya algo en los highlights, el tanto siguiente es tuyo y con él el partido)
  if (gana && g?.__prueba && g.phase === 'rally' && g.score.you + g.score.rival >= 3 && g.score.you < g.target) { g.point('you', 'bote'); return 'final: el tanto que la gana'; }
  if (g && /^(serve|rally)/.test(g.phase) && !g.__prueba) { g.__prueba = 1; g.target = 3; g.score[gana ? 'you' : 'rival'] = 2; g.autoplay = true; return 'final: a 3, el piloto juega'; }
  if (g) return `final ${g.phase} ${g.score.you}-${g.score.rival} · ${g.stats?.hits ? g.stats.hits.you + g.stats.hits.rival : 0} pelotazos${M.bailePl ? ' · baile' : ''}${M.hlCola ? ' · mejores tantos ' + M.hlCola.length : ''}${M.replay ? ' · repetición' : ''}`;
  return G.pelotaMatch?.active ? 'partido montándose' : 'esperando';
}, gana);
let ult = '', desde = Date.now(), visto = new Set(), fin = null, n = 0;
while (Date.now() - t0 < 30 * 60000) {
  const e = await paso();
  // (en el peloteo cambia la cuenta de pelotazos: solo se apunta cuando cambia algo más que esa cuenta)
  const sin = (x) => x.replace(/ · \d+ pelotazos/, '');
  if (e !== ult) { if (sin(e) !== sin(ult)) log(e); ult = e; desde = Date.now(); visto.add(e.replace(/^final (\w+).*/, 'final $1')); }
  if (e.startsWith('FIN')) { fin = e; break; }
  if (Date.now() - desde > 120000) { log('PARADO 2 min en:', e); await p.screenshot({ path: `${out}/parado-${n++}.png` }); fin = 'PARADO en ' + e; break; }
  await p.waitForTimeout(1500);
}
const tras = await p.evaluate(() => ({ modo: window.__game.mode, hud: !document.querySelector('#hud')?.classList.contains('hidden'), apuntes: (window.__errors || []).slice(-6) }));
await b.close();
const mal = [];
if (fin !== 'FIN ok') mal.push(fin || 'sin acabar en 30 min');
if (!visto.has('panel del final')) mal.push('no salió el panel del final');
if (!visto.has('cuadro terminado')) mal.push('no se volvió al cuadro del campeonato terminado');
if (gana && !visto.has('tarjeta de campeón')) mal.push('ganando, no salió la tarjeta de campeón');
if (tras.modo !== 'play') mal.push('al salir no se vuelve al pueblo (modo ' + tras.modo + ')');
if (errs.length) mal.push('errores: ' + errs.slice(0, 4).join(' | '));
console.log(JSON.stringify({ tamaño: sz, como, kind, pasos: [...visto], tras, mal }, null, 1));
process.exit(mal.length ? 1 : 0);
