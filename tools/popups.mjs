// Fotos de todos los pop-ups de información y de los minijuegos 2D con datos de ejemplo, en móvil vertical, móvil
// horizontal y escritorio, para revisar márgenes, espacios y textos. Se abren en una página ligera (sin el mundo 3D).
// Uso: node tools/popups.mjs <carpeta> [tamaños: 390x844,844x390,1280x760]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/popups', sizes = '390x844,844x390,1280x760'] = process.argv;
mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: W < 900 });
  p.on('pageerror', e => errs.push(`${sz} PAGEERROR ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errs.push(`${sz} ${m.text().slice(0, 160)}`); });
  // (si el servidor de desarrollo recarga la página a medias, se vuelve a empezar)
  for (let t = 0; ; t++) {
    try {
      await p.goto(`${URL}/src/ui/minigames.js`, { timeout: 300000 });
      await p.waitForTimeout(1500);
      await p.evaluate(async () => {
        await import('/src/style.css'); await import('/src/hub/hub.css');
        document.body.innerHTML = ''; document.body.style.background = '#2d6a3e';
        const nop = () => {};
        window.__ui = { sound: { tone: nop, ui: nop, noiseBurst: nop, fanfare: nop, magic: nop, sfx: null }, closeModal: nop };
        window.__MG = await import('/src/ui/minigames.js'); window.__FI = await import('/src/ui/ficha.js');
        const { stampURL } = await import('/src/ui/art.js'); window.__stamp = stampURL('bidasoa', 'Elizondo', 'cheese');
      });
      break;
    } catch (e) { if (t >= 3) throw e; console.log('reintento:', e.message.slice(0, 70)); await p.waitForTimeout(3000); }
  }
  const keys = await p.evaluate(() => { const f = window.__FI.allFichas('flora')[0], a = window.__FI.allFichas('fauna')[0]; return [f.type + ':' + f.id, a.type + ':' + a.id]; });
  const ANTES = `<div class="antes-ahora"><div><b>Antes</b>Se segaba a mano con la hoz, gavilla a gavilla, y toda la familia ayudaba en la era.</div><div><b>Ahora</b>Una cosechadora siega, trilla y limpia el grano en una sola pasada.</div></div>`;
  const SHOTS = [
    ['info-iglesia', `MG.infoCard(ui, { icon: 'church', kicker: 'Arte gótico', title: 'Iglesia de San Pedro', text: 'Iglesia gótica del siglo XVI con contrafuertes, una gran torre y un rosetón sobre la portada. Dentro está el viejo órgano del monasterio de Leyre.', badge: 'Nueva carta', button: 'Seguir (1/3)' })`],
    ['info-antes-ahora', `MG.infoCard(ui, { icon: 'wheat', kicker: 'El campo de Tafalla', title: 'La siega del cereal', text: 'Así ha cambiado este trabajo:', extra: ${JSON.stringify(ANTES)}, button: 'Seguir explorando' })`],
    ['info-cima', `MG.infoCard(ui, { icon: 'peak', kicker: 'Buzón de cumbre · Pirineo', title: 'Ori · Orhi', text: 'La primera cumbre de más de 2.000 metros del Pirineo empezando por el oeste. Altitud: 2.017 m. Desde arriba se ve la Selva de Irati y, en días claros, el mar.', badge: 'Nueva carta', button: '¡Cima!' })`],
    ['mision-cumplida', `MG.missionComplete(ui, { title: 'Del rebaño al queso', text: 'Has ordenado bien todos los pasos y Ane ya tiene su queso Idiazabal.', xp: 40, card: 'Queso Idiazabal', progress: { done: 2, total: 5, name: 'Elizondo' } })`],
    ['final-pueblo', `MG.townFinale(ui, { town: 'Elizondo', stamp: window.__stamp, missions: [{ icon: 'church', title: 'Conoce Elizondo' }, { icon: 'cheese', title: 'Del rebaño al queso' }, { icon: 'music', title: 'Baile en la plaza' }, { icon: 'peak', title: 'Sube al monte Alkurruntz' }, { icon: 'pelota', title: 'Partido en el frontón' }], xp: 220, next: 'Amaiur / Maya' })`],
    ['elegir', `MG.choiceGame(ui, { title: 'La quesería', q: '¿Qué se añade a la leche caliente para que cuaje?', options: ['Cuajo', 'Azúcar', 'Harina de maíz'], answer: 0, why: 'El cuajo hace que la leche se separe en cuajada y suero.' })`],
    ['barra', `MG.timingGame(ui, { title: 'El yunque del herrero', hint: 'Golpea cuando el cursor pase por la zona roja', rounds: 5, need: 3 })`],
    ['pulsar', `MG.mashGame(ui, { title: 'Levantar la piedra', hint: 'Pulsa muy rápido para levantar la piedra de 100 kilos', seconds: 6, goal: 30 })`],
    ['ordenar', `MG.sequenceGame(ui, { title: 'Del maíz a la harina', hint: 'Toca los pasos en el orden correcto', steps: ['Recoger las mazorcas', 'Desgranar el maíz', 'Secar el grano', 'Moler en el molino', 'Cerner la harina'] })`],
    ['melodia', `MG.simonGame(ui, { title: 'La melodía del txistu', hint: 'Escucha y repite las notas', rounds: 4 })`],
    ['ficha-flora', `FI.showFicha(${JSON.stringify(keys[0])}, { ui, badge: 'Al herbario', kicker: '¡Bien identificada! · ficha de flora', button: 'Seguir explorando' })`],
    ['ficha-fauna', `FI.showFicha(${JSON.stringify(keys[1])}, { ui, badge: 'Nueva carta', button: 'Seguir' })`],
    ['quiz', `FI.identifyQuiz(${JSON.stringify(keys[0])}, ['Haya', 'Roble', 'Castaño'], { ui, right: 0 })`],
  ];
  for (const [name, code] of SHOTS) {
    await p.evaluate((code) => { document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); const ui = window.__ui, MG = window.__MG, FI = window.__FI; window.__pr = eval(code); }, code);
    await p.waitForTimeout(name.startsWith('ficha') || name === 'quiz' ? 3500 : 900);
    await p.screenshot({ path: `${out}/${sz}-${name}.png` });
    // si la tarjeta no cabe, también el final (desplazada abajo)
    const over = await p.evaluate(() => { const c = document.querySelector('.mg-card'); if (!c) return 0; const d = c.scrollHeight - c.clientHeight; if (d > 8) c.scrollTop = d; return d; });
    if (over > 8) { await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${sz}-${name}-abajo.png` }); }
    console.log(sz, name, over > 8 ? `(se desplaza ${over}px)` : '');
  }
  await p.close();
}
console.log(errs.length ? errs.join('\n') : 'sin errores');
await b.close();
