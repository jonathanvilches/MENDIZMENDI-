// Auditoría de diseño de los marcadores y mandos de los partidos (fútbol y pelota), en castellano y en euskera: monta
// cada HUD solo, sin el partido en 3D (así va rápido), lo pone en cada estado (botones de atacar, defender, portero y
// penaltis; golpe, gancho y volea; avisos del juez, consejos, energía, menús) y lo mide con tools/auditoria-medida.mjs:
// sobre todo que ningún rótulo se salga de su botón. Hace una captura de cada estado.
// Uso: node tools/auditoria-partidos.mjs [carpeta] [tamaños: 844x390,1180x820]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { auditar, muesca } from './auditoria-medida.mjs';
const [,, out = '/tmp/auditoria-partidos', sizes = '844x390,1180x820'] = process.argv; const TOT = {};
mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: W < 1000 });
  await muesca(p, W, H);
  p.on('pageerror', e => errs.push(`${sz} PAGEERROR ${e.message}`));
  await p.goto(`${URL}/src/ui/fitlabel.js`, { timeout: 300000 }); await p.waitForTimeout(800);
  // (la página de pruebas no trae la etiqueta viewport del juego: sin ella, el móvil la pinta a 980 px de ancho y no a su tamaño)
  await p.evaluate(() => { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); }); await p.waitForTimeout(300);
  await p.evaluate(async () => {
    await import('/src/style.css'); await import('/src/ui/sport.css');
    document.body.innerHTML = ''; document.body.style.background = 'linear-gradient(#3a6d4a,#2d5a3a)';
    (await import('/src/ui/frames.js')).startFrames();
    (await import('/src/ui/frames.js')).startFrames();   // (los marcos en ángulo, como en el juego)
    window.__FH = await import('/src/futbol/hud.js'); window.__PH = await import('/src/pelota/hud.js'); window.__PR = await import('/src/pelota/rules.js');
    await document.fonts.ready;
  });
  if (process.env.DETALLE) await p.evaluate(() => { window.__auditDetail = true; });
  const audit = async (name, sel) => {
    await p.waitForTimeout(450); await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
    await p.screenshot({ path: `${out}/${sz}-${name}.png` });
    const r = await p.evaluate(auditar, sel);
    console.log(`== ${sz} ${name}: ${Object.entries(r).map(([k, v]) => `${k} ${v.length}`).join(' · ')}`);
    for (const [k, v] of Object.entries(r)) { TOT[k] = (TOT[k] || 0) + v.length; for (const x of v.slice(0, 8)) console.log(`   ${k}: ${x}`); }
  };
  // fútbol
  await p.evaluate(() => { window.__fh = new window.__FH.FutbolHud({ touch: true, home: { name: 'Osasuna', short: 'OSA', shirt: '#c8102e' }, away: { name: 'Real Sociedad', short: 'RSO', shirt: '#0067b1' } }); window.__fh.setClock(754, 1); window.__fh.setScore(2, 1); });
  const F = [['atk', 'h.setMode("atk")'], ['def', 'h.setMode("def")'], ['portero', 'h.setMode("gk")'], ['portero-manos', 'h.setMode("gkhands")'],
    ['penaltis', 'h.setButtons("Tiro", "PARAR")'], ['aviso', 'h.setMode("atk"); h.msg("¡GOOOL!", "Osasuna 3 – 1 Real Sociedad", 9000); h.say("¡Qué golazo de Moncayola!", 9000)'],
    ['consejo', 'h.tip("Mantén <b>TIRO</b> para cargar y apunta con el joystick hacia la portería")'], ['faltas', 'h.setFouls(3, 6, 5)'],
    // tu jugador (dorsal, línea, energía y forma), cansado y lesionado con el aviso de cambio, y los carteles de tarjeta, lesión y cambio
    ['jugador', 'h.tip(null); h.meChip({ num: 8, line: 2, energy: 0.62, fit: 0.78, card: "yellow", inj: null })'],
    ['lesionado', 'h.meChip({ num: 8, line: 2, energy: 0.18, fit: 0.35, card: null, inj: "grave" }); h.subAlert(true); h.say("El 8 está lesionado: haz un cambio", 9000)'],
    ['tarjeta', 'h.msg("Tarjeta amarilla", "El 5 visitante · Cortó una ocasión clara de gol", 9000, "card-y")'], ['lesion', 'h.msg("Lesión", "El 8 · no puede seguir bien", 9000, "inj")'],
    ['cambio', 'h.say("", 1); h.msg("Cambio", "Sale el 8 · Entra el 14", 9000, "sub")']];
  for (const [n, code] of F) { await p.evaluate((code) => { const h = window.__fh; eval(code); }, code); await audit('futbol-' + n, '.fb-root'); }
  await p.evaluate(() => { const h = window.__fh; h.tip(null); h.el.msg.classList.remove('on'); h.el.say.classList.remove('on'); h.controls(); }); await audit('futbol-controles', '.fb-root');
  // los cambios: los once (uno lesionado, uno que va a salir, uno con amarilla) y el banquillo; y la pausa con su botón
  await p.evaluate(() => { const h = window.__fh; document.querySelectorAll('.fb-panel').forEach(e => e.remove());
    const L = [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3], N = [1, 3, 4, 5, 2, 11, 8, 6, 7, 10, 9], E = [0.9, 0.7, 0.8, 0.55, 0.95, 0.4, 0.62, 0.85, 0.2, 0.75, 0.5], FT = [1, 0.8, 0.9, 0.7, 0.95, 0.5, 0.78, 0.88, 0.35, 0.8, 0.6];
    const field = N.map((num, i) => ({ id: i, num, line: L[i], energy: E[i], fit: FT[i], card: i === 6 ? 'yellow' : null, inj: i === 8 ? 'grave' : null, cls: i === 5 ? 'out' : i === 8 ? 'low' : '', note: i === 5 ? 'Sale · entra el 14' : '' }));
    const bench = [[13, 0], [12, 1], [14, 2], [15, 2], [16, 3]].map(([num, line], b) => ({ b, num, line, energy: 1, fit: 1, cls: b === 2 ? 'sel' : '', note: b === 2 ? 'Entra por el 11' : '' }));
    window.__subsM = { left: () => 4, list: () => ({ field, bench }), plan: () => true, cancel: () => true, auto: () => false, setAuto() {} };
    h.subs(window.__subsM); });
  await audit('futbol-cambios', '.fb-root');
  await p.evaluate(() => { const h = window.__fh; document.querySelectorAll('.fb-panel').forEach(e => e.remove()); h.pause({ sistemas: {}, actual: '4-4-2', pick() {} }, { label: () => 'Cambios · quedan 4', model: window.__subsM }); });
  await audit('futbol-pausa', '.fb-root');
  await p.evaluate(() => { window.__fh.destroy?.(); document.querySelectorAll('.fb-root').forEach(e => e.remove()); });
  // pelota, en los dos idiomas
  for (const lang of ['es', 'eu']) {
    await p.evaluate((lang) => { const T = window.__PR.TEXT[lang]; const h = window.__ph = new window.__PH.PelotaHud(document.body, T, { you: 'Ane', rival: 'Garazi' }, true);
      h.setScore(14, 12, 'you', T.to(22)); h.energy([{ id: 'a', name: 'Ane', en: 0.7, side: 'you', me: true }, { id: 'b', name: 'Garazi', en: 0.4, side: 'rival' }]); }, lang);
    const P = [['golpe', 'h.hitLabel(T.hit)'], ['gancho', 'h.hitLabel(T.hitGancho || T.hit)'], ['volea', 'h.hitLabel(T.hitVolley || T.hit)'],
      ['juez', 'h.hitLabel(T.hit); h.call(T.matchPoint || "Tanto de partido", T.matchPointSub || "", "", 9)'], ['consejo', 'h.call(""); h.tip(T.tipServe || "Toca GOLPE para sacar")']];
    for (const [n, code] of P) { await p.evaluate((code) => { const h = window.__ph, T = h.txt; eval(code); }, code); await audit(`pelota-${lang}-${n}`, '.pel-root'); }
    await p.evaluate(() => { window.__ph.destroy(); });
  }
  await p.close();
}
console.log('\nTOTAL', JSON.stringify(TOT)); console.log(errs.length ? errs.join('\n') : 'sin errores');
await b.close();
