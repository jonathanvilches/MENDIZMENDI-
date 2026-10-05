// Fotos de los pop-ups de la Liga Navarra, el torneo de mano, el menú y el final del fútbol y el inicio y el resultado
// de la pelota, con datos de ejemplo y sin el mundo 3D, en móvil vertical, móvil horizontal y escritorio.
// Uso: node tools/campeonatos.mjs <carpeta> [tamaños]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/campeonatos', sizes = '390x844,844x390,1280x760'] = process.argv;
mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: W < 900 });
  p.on('pageerror', e => errs.push(`${sz} PAGEERROR ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errs.push(`${sz} ${m.text().slice(0, 160)}`); });
  for (let t = 0; ; t++) {
    try {
      await p.goto(`${URL}/src/futbol/liga.js`, { timeout: 300000 });
      await p.waitForTimeout(1500);
      await p.evaluate(async () => {
        await import('/src/style.css'); await import('/src/hub/hub.css');
        await import('/node_modules/@fontsource/lilita-one/latin-400.css'); await import('/node_modules/@fontsource/nunito/latin-700.css'); await import('/node_modules/@fontsource/nunito/latin-900.css');
        document.body.innerHTML = ''; document.body.style.background = '#2d6a3e';
        localStorage.removeItem('mendimendiz-liga-v1'); localStorage.removeItem('mendimendiz-torneo-v1');
        window.__L = await import('/src/futbol/liga.js'); window.__T = await import('/src/game/torneo.js'); window.__FH = await import('/src/futbol/hud.js');
        window.__PH = await import('/src/pelota/hud.js'); window.__PR = await import('/src/pelota/rules.js');
      });
      break;
    } catch (e) { if (t >= 3) throw e; console.log('reintento:', e.message.slice(0, 70)); await p.waitForTimeout(3000); }
  }
  const SHOTS = [
    ['liga', `const S = L.season('baztan'); L.ligaPanel(S, 'baztan')`],
    ['liga-fuera', `const S = L.season('baztan'); L.ligaPanel(S, 'aoiz')`],
    ['liga-jornada', `const S = L.season('baztan'); const R = L.playRound(S, 2, 1); L.roundPanel(S, R, 0)`],
    ['liga-final', `const S = L.season('baztan'); while (L.nextMatch(S)) L.playRound(S, 3, 0); L.ligaPanel(S, 'baztan')`],
    ['club', `L.clubPanel('baztan', [['liga', 'Liga Navarra · jornada 1', 'La jornada se juega aquí'], ['sala', 'Fútbol sala: entrenamiento', 'Pases en la pista (para el sello)'], ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['exit', 'Salir', '']], 'Elizondo · tu club')`],
    ['amistoso', `L.rivalPanel('baztan')`],
    ['torneo', `const T = T_.torneo({ name: 'Ane', town: 'Elizondo' }, CTX); T_.torneoPanel(T, 'elizondo')`],
    ['torneo-fuera', `const T = T_.torneo({ name: 'Ane', town: 'Elizondo' }, CTX); T_.torneoPanel(T, 'ituren')`],
    ['torneo-semis', `const T = T_.torneo({ name: 'Ane', town: 'Elizondo' }, CTX); T_.playTorneoRound(T, 5, 2); T_.torneoPanel(T, T_.yourMatch(T).venue.id)`],
    ['torneo-fin', `const T = T_.torneo({ name: 'Ane', town: 'Elizondo' }, CTX); T_.playTorneoRound(T, 5, 2); T_.playTorneoRound(T, 5, 3); T_.playTorneoRound(T, 7, 4); T_.torneoPanel(T, 'elizondo')`],
    ['pelota-menu', `const T = T_.torneo({ name: 'Ane', town: 'Elizondo' }, CTX); T_.pelotaMenu(T, 'elizondo')`],
    ['futbol-menu', `FH.menuPanel({ title: 'El Sadar', sub: 'Pamplona / Iruña', modes: [['match', 'Partido'], ['cup', 'Eliminatoria'], ['penalties', 'Penaltis'], ['reto:conos', 'Regate entre conos'], ['reto:dianas', 'Tiro a las escuadras ✓'], ['reto:pases', 'Pases en movimiento']], rivals: [['visitante', 'Visitante'], ['vecinos', 'Vecinos']], values: { mode: 'match', rival: 'visitante', level: 'normal', duration: 3, assist: true } })`],
    ['futbol-final', `const h = new FH.FutbolHud({ touch: true, home: { name: 'Osasuna', short: 'OSA', shirt: '#c41f2c' }, away: { name: 'Visitante', short: 'VIS', shirt: '#f4f4f2' } }); h.end({ title: '¡Victoria!', sub: 'Final del partido', score: '2 – 1', rows: [[2, 'Goles', 1], [7, 'Tiros', 4], [4, 'Tiros a puerta', 2], ['58 %', 'Posesión', '42 %'], [23, 'Pases buenos', 15], [6, 'Robos', 4], [1, 'Paradas', 2]], again: 'Revancha', exit: 'Salir' })`],
    ['futbol-controles', `const h = new FH.FutbolHud({ touch: true, home: { name: 'Osasuna', short: 'OSA', shirt: '#c41f2c' }, away: { name: 'Visitante', short: 'VIS', shirt: '#f4f4f2' } }); h.controls()`],
    ['pelota-inicio', `const t = PR.TEXT.es, hud = new PH.PelotaHud(document.body, t, { you: 'Ane', rival: 'Unai' }, true); hud.panel('<h2>' + t.title + '</h2><p class="pel-sub">Ane vs Unai · ' + t.to(5) + '</p><ol>' + t.rules.map(r => '<li>' + r + '</li>').join('') + '</ol><div class="pel-ctrl">' + t.ctrlTouch + '</div><div class="pel-levels"><button aria-pressed="false">Fácil</button><button aria-pressed="true">Normal</button><button aria-pressed="false">Difícil</button></div><div class="pel-row"><button class="pel-go alt">' + t.later + '</button><button class="pel-go">' + t.play + '</button></div>')`],
    ['pelota-fin', `const t = PR.TEXT.es, hud = new PH.PelotaHud(document.body, t, { you: 'Ane', rival: 'Unai' }, true); hud.panel('<h2>' + t.win + '</h2><p class="pel-sub">Ane – Unai</p><div class="pel-big">5 – 3</div><div class="pel-fact"><b>' + t.factsTitle + '</b><br>' + t.facts[2] + '</div><div class="pel-row"><button class="pel-go alt">' + t.again + '</button><button class="pel-go">' + t.cont + '</button></div>')`],
  ];
  for (const [name, code] of SHOTS) {
    await p.evaluate((code) => {
      document.querySelectorAll('.lg-root, .fb-root, .pel-root').forEach(o => o.remove());
      localStorage.removeItem('mendimendiz-liga-v1'); localStorage.removeItem('mendimendiz-torneo-v1');
      const L = window.__L, T_ = window.__T, FH = window.__FH, PH = window.__PH, PR = window.__PR;
      const CTX = { comarca: 'bidasoa', comarcaName: 'Baztan-Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }, { id: 'etxalar', name: 'Etxalar' }, { id: 'zugarramurdi', name: 'Zugarramurdi' }, { id: 'amaiur-maya-del-baztan', name: 'Amaiur' }, { id: 'ituren', name: 'Ituren' }, { id: 'elizondo', name: 'Elizondo' }] };
      window.__pr = eval(code); void (L, T_, FH, PH, PR, CTX);
    }, code);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${sz}-${name}.png` });
    const over = await p.evaluate(() => { const c = document.querySelector('.lg-card, .fb-card, .pel-card'); if (!c) return 0; const d = c.scrollHeight - c.clientHeight; if (d > 8) c.scrollTop = d; return d; });
    if (over > 8) { await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${sz}-${name}-abajo.png` }); }
    console.log(sz, name, over > 8 ? `(se desplaza ${over}px)` : '');
  }
  await p.close();
}
console.log(errs.length ? errs.join('\n') : 'sin errores');
await b.close();
