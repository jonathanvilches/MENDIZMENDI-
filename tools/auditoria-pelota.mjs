// Auditoría de diseño de un partido de pelota de verdad, de la presentación al final: abre un pueblo, monta un partido en
// el Labrit y mide cada pantalla con tools/auditoria-medida.mjs (texto cortado o encima, el filo de neón fuera de las
// cartas de jugador, botones con borde, rellenos y huecos desiguales...). Pantallas: la presentación (las cartas de los
// pelotaris, el frontón, «Más opciones», el nivel y los botones), la misma por parejas, «Más opciones», la ficha, la
// Gran final y el final del partido (montados a mano), la pantalla VS, el sorteo del saque, el partido (marcador y mandos)
// y la pausa.
// Hace una captura de cada una. Tarda: carga el pueblo entero (un par de minutos por tamaño con el dibujo por software).
// Uso: URL=http://127.0.0.1:5173/ node tools/auditoria-pelota.mjs [carpeta] [tamaños: 844x390,667x375,390x844,1024x768,1280x720] [pantallas]
// (DETALLE=1: con la regla de CSS de cada aviso; PUEBLO=lumbier)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { auditar, muesca } from './auditoria-medida.mjs';
const URL = (process.env.URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const [,, out = 'entrega/auditoria-pelota', sizes = '844x390,1280x720', solo = ''] = process.argv; mkdirSync(out, { recursive: true });
const want = (n) => !solo || solo.split(',').includes(n);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], TOT = {}, res = {};
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number), mob = W < 1000;
  const ctx = await b.newContext(mob ? { viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: W, height: H } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`${sz} ${e.message}`));
  await muesca(p, W, H);
  // (con la pantalla VS, que en las pruebas automáticas se salta, y sin que se vaya sola)
  await p.addInitScript((d) => { window.__vs = true; window.__vsMs = 600000; window.__auditDetail = d; localStorage.setItem('herrizherri-lang', 'es'); }, !!process.env.DETALLE);
  if (process.env.IDIOMA) await p.addInitScript((l) => localStorage.setItem('herrizherri-lang', l), process.env.IDIOMA);
  const M = () => p.evaluate(() => !!window.__game?.pelotaMatch);
  const mide = async (n, sel = '.pel-root') => {
    if (!want(n)) return;
    await p.waitForTimeout(900); await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
    await p.screenshot({ path: `${out}/${n}-${sz}.png` });
    const r = res[`${n}-${sz}`] = await p.evaluate(auditar, sel);
    console.log(`\n== ${sz} ${n}: ${Object.entries(r).filter(([, v]) => v.length).map(([k, v]) => `${k} ${v.length}`).join(' · ') || 'limpio'}`);
    for (const [k, v] of Object.entries(r)) { TOT[k] = (TOT[k] || 0) + (v.length || 0); for (const x of [].concat(v).slice(0, 10)) console.log(`   ${k}: ${x}`); }
  };
  try {
    await p.goto(`${URL}?town=${process.env.PUEBLO || 'lumbier'}&q=low&weather=clear&skipintro=1&noflora&t=12`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { const G = window.__game, L = window.__L = G.fronton?.court.labrit ? G.fronton : G.labritVenue(); window.__intro = G.venuePrep(L); });
    await p.evaluate(async () => { await window.__intro; const G = window.__game, L = window.__L; L.play(G, G.pelotari || G.missions.find(m => m.type === 'pelota')?.host, { target: 7, returnTo: G.fronton, rivalName: 'Garazi (Leitza)', comp: 'Manomanista' }); });
    await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 }); await p.waitForTimeout(2500);
    if (!(await M())) throw new Error('sin partido');
    await mide('presentacion', '.pel-panel');
    // (lo que ha de caber: la ventana sin desplazar y las cartas enteras dentro de ella)
    const caben = await p.evaluate(() => { const c = document.querySelector('.pel-card'), r = c.getBoundingClientRect(); return { ventana: [r.width, r.height].map(Math.round), desplaza: c.scrollHeight - c.clientHeight, cartas: [...c.querySelectorAll('.gx-card')].map(e => Math.round(e.getBoundingClientRect().width)) }; });
    console.log(`   cabe: ventana ${caben.ventana.join('x')} · desplaza ${caben.desplaza} px · cartas de ${caben.cartas.join(', ')} px`);
    if (want('parejas')) { await p.evaluate(() => window.__game.pelotaMatch.chooseMode('delantero')); await p.waitForTimeout(7000); await mide('parejas', '.pel-panel'); await p.evaluate(() => window.__game.pelotaMatch.chooseMode('mano')); await p.waitForTimeout(1500); }
    await p.evaluate(() => document.querySelector('[data-pel-more]')?.click()); await mide('opciones', '.pel-panel');
    await p.evaluate(() => document.querySelector('[data-pel-back]')?.click());
    await p.evaluate(() => { window.__game.pelotaMatch.ficha('rival'); }); await mide('ficha', '.pfx');
    await p.evaluate(() => document.querySelector('.pfx-x')?.click()); await p.waitForTimeout(500);
    // (la Gran final y el final se montan a mano antes de empezar el partido, sobre la presentación)
    await p.evaluate(() => { const m = window.__game.pelotaMatch; m.finalHecho = false; m.entradaFinal(); }); await p.waitForTimeout(1900); await mide('gran-final', '.gf');   // (dura 6,4 s: se mide con las cartas ya dentro)
    await p.evaluate(() => window.__game?.pelotaMatch?.finalFin?.()); await p.waitForTimeout(600);
    await p.evaluate(() => { window.__game.pelotaMatch.endPanel({ win: true, score: { you: 7, rival: 4 }, best: 0 }); }); await p.waitForTimeout(1500); await mide('final', '.pel-panel');
    await p.evaluate(() => { window.__game.pelotaMatch.intro(); }); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]')?.click()); await p.waitForTimeout(3500); await mide('vs', '.pvs');
    await p.evaluate(() => { const v = document.querySelector('.pvs'); v?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); v?.click(); });
    await p.waitForSelector('.pel-toss-go', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(1500); await mide('sorteo');
    await p.evaluate(() => document.querySelector('.pel-toss-go')?.click()); await p.waitForTimeout(8000); await mide('partido');
    await p.evaluate(() => document.querySelector('.pm-btn')?.click()); await mide('pausa', '.pz-panel');
  } catch (e) { console.log(`ERROR ${sz}: ${e.message.slice(0, 300)}`); }
  await ctx.close();
}
writeFileSync(`${out}/auditoria.json`, JSON.stringify(res, null, 1));
console.log('\nTOTAL', JSON.stringify(TOT)); console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
