// Minijuegos de cada comarca, con sus datos de verdad: carga un pueblo de cada comarca y, en cada uno, mira que todas
// las misiones tengan anfitrión y datos válidos y juega como una persona los minijuegos de sus misiones (ordenar los
// pasos de un producto, la pregunta del concurso, repetir la melodía de la tradición) para ver que se abren, se pueden
// ganar y se cierran sin errores. Los oficios en 3D se juegan en tools/oficios.mjs. Capturas a mitad de partida.
// Uso: node tools/minijuegos-comarcas.mjs [pueblos separados por comas] [carpeta]   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const TOWNS = 'elizondo,leitza,isaba-izaba,otsagabia-ochagavia,altsasu-alsasua,pamplona,aoiz,lumbier,estella,puente-la-reina,olite,marcilla,tudela';
const [,, list = TOWNS, out = 'entrega/minijuegos-comarcas'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const report = [];
for (const town of list.split(',')) {
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160))); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)); }); p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(`${r.status()} ${r.url().slice(-80)}`); });
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
  const t0 = Date.now();
  try {
    await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(2500);
  } catch (e) { console.log(`\n${town}: NO CARGA ${e.message.slice(0, 120)}`); fails++; report.push({ town, carga: false }); await p.close(); continue; }
  console.log(`\n${town} (${Math.round((Date.now() - t0) / 1000)} s)`);
  // misiones: anfitrión y datos que necesitan sus minijuegos
  const info = await p.evaluate(() => { const G = window.__game;
    // (el valle de Salazar va con su propio juego y sus misiones: aquí solo se mira que cargue sin errores)
    return (G.missions || []).map(M => { const m = M.m || {}, bad = [];
      if (!M.host && M.type !== 'summit') bad.push('sin anfitrión');
      if (M.type === 'process') { const s = m.steps || []; if (s.length < 3) bad.push(`solo ${s.length} pasos`); if (new Set(s).size !== s.length) bad.push('pasos repetidos'); }
      if (M.type === 'trade' && !M.trade) bad.push('oficio sin pasos');
      return { i: M.i, type: M.type, title: M.title, host: M.host?.name || '', steps: m.steps || null, bad }; }); });
  if (!info.length) console.log('   (sin misiones de pueblo: valle con su propio juego)');
  for (const M of info) console.log(`   ${M.type.padEnd(10)} ${M.title} · ${M.host || '—'}${M.bad.length ? ' · ' + M.bad.join(', ') : ''}`);
  if (info.length) ok(info.every(M => !M.bad.length), `${town}: todas las misiones con anfitrión y datos válidos (${info.length})`);
  // los minijuegos de sus misiones, jugados con sus datos
  const games = await p.evaluate(async () => {
    const G = window.__game, MG = await import('/src/ui/minigames.js'), sleep = (ms) => new Promise(r => setTimeout(r, ms)), res = [];
    const down = (el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    const clear = () => { G.ui.closeModal?.(); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); };
    for (const M of G.missions || []) {
      const m = M.m || {};
      try {
        if (M.type === 'process' && m.steps?.length) {
          clear(); const pr = MG.sequenceGame(G.ui, { title: m.product || M.title, hint: 'Toca los pasos en el orden correcto', icon: M.icon, steps: m.steps });
          await sleep(400); const o = document.querySelector('.seq'); window.__shot = 'ordenar-' + M.i;
          for (let i = 0; i < m.steps.length; i++) { o.querySelector(`.opt[data-i="${i}"]`)?.click(); await sleep(80); }
          const r = await Promise.race([pr, sleep(15000).then(() => ({ timeout: true }))]); res.push({ juego: 'ordenar', mision: M.title, ...r });
        }
        if (M.type === 'tradition') {
          clear(); const pr = MG.simonGame(G.ui, { title: M.title, icon: M.icon, rounds: 4, labels: m.kind === 'angel' ? ['Cuerda', 'Alas', 'Bajar', 'Saludo'] : null }); let done = false; pr.then(() => done = true);
          await sleep(300); const o = document.querySelector('.simon'), btns = [...o.querySelectorAll('.pads4 button')], fb = o.querySelector('.fb'); let heard = [];
          const mo = new MutationObserver(ms => { for (const x of ms) if (x.target.classList.contains('on') && fb.textContent.startsWith('Escucha')) heard.push(btns.indexOf(x.target)); });
          btns.forEach(bt => mo.observe(bt, { attributes: true, attributeFilter: ['class'] }));
          const t0 = performance.now();
          while (!done && performance.now() - t0 < 90000) { if (fb.textContent === 'Tu turno' && heard.length) { const s = heard; heard = []; for (const i of s) { down(btns[i]); await sleep(140); } } await sleep(50); }
          mo.disconnect(); const r = await Promise.race([pr, sleep(3000).then(() => ({ timeout: true }))]); res.push({ juego: 'melodía', mision: M.title, ...r });
        }
        if (M.type === 'quiz') {
          const Q = G.questions?.()[0];
          if (Q) { clear(); const pr = MG.choiceGame(G.ui, { title: M.title, q: Q.q, options: Q.a, answer: Q.ok, why: '' });
            await sleep(300); const o = document.querySelector('.choice'); o.querySelector(`.opt[data-i="${Q.ok}"]`)?.click(); await sleep(250); o.querySelector('.next')?.click();
            const r = await Promise.race([pr, sleep(8000).then(() => ({ timeout: true }))]); res.push({ juego: 'pregunta', mision: M.title, preguntas: G.questions().length, ...r }); }
        }
      } catch (e) { res.push({ juego: M.type, mision: M.title, error: String(e.message || e).slice(0, 140) }); }
    }
    clear(); return res;
  });
  for (const g of games) { console.log(`   ${g.juego}: ${g.mision} → ${g.error ? 'ERROR ' + g.error : g.timeout ? 'sin terminar' : g.win ? 'ganado' : 'perdido'}${g.preguntas ? ` (${g.preguntas} preguntas)` : ''}`); ok(!g.error && !g.timeout && g.win, `${town}: ${g.juego} «${g.mision}» se juega y se gana`); }
  await p.screenshot({ path: `${out}/${town}.png` });
  ok(!errs.length, `${town}: sin errores${errs.length ? ' (' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
  report.push({ town, misiones: info, juegos: games, errores: errs });
  await p.close();
}
writeFileSync(`${out}/informe.json`, JSON.stringify(report, null, 1));
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
