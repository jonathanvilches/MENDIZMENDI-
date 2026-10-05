// Juega de verdad los minijuegos 2D (sin atajos): barra de precisión, pulsar rápido (esperando 2 s antes del primer
// toque: el reloj no debe correr hasta entonces), ordenar pasos, elegir respuesta y repetir la melodía.
// Uso: node tools/minijuegos2d.mjs   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
// en una página ligera (sin el mundo 3D detrás: con el emulador de gráficos el juego va a saltos y la barra también)
await p.goto(`${URL}/src/ui/minigames.js`, { timeout: 300000 });
p.on('console', m => { if (m.text().startsWith('MG ')) console.log(m.text()); });
const res = await p.evaluate(async () => {
  await import('/src/style.css'); await import('/src/hub/hub.css'); document.body.innerHTML = ''; const nop = () => {};
  const MG = await import('/src/ui/minigames.js'), ui = { sound: { tone: nop, ui: nop, noiseBurst: nop, fanfare: nop, magic: nop, sfx: null } }, out = {}, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const down = (el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  // barra: toca cuando el cursor está dentro de la zona
  { const pr = MG.timingGame(ui, { title: 'Prueba', hint: 'barra', rounds: 5, need: 3 });
    const o = document.querySelector('.mg-overlay.timing') || document.querySelector('.timing'); let n = 0;
    const t0 = performance.now();
    while (n < 5 && performance.now() - t0 < 30000) {
      const z = o.querySelector('.zone').getBoundingClientRect(), c = o.querySelector('.cursor').getBoundingClientRect(), cx = c.left + c.width / 2;
      if (cx > z.left + z.width * 0.3 && cx < z.right - z.width * 0.3) { down(o.querySelector('button')); n++; await sleep(700); } else await sleep(8);
    }
    console.log('MG barra'); out.barra = await pr; }
  // pulsar rápido: espera 2 s y luego 40 toques
  { const pr = MG.mashGame(ui, { title: 'Prueba', hint: 'pulsar', seconds: 6, goal: 30 });
    const o = document.querySelector('.mash'); await sleep(2000); const clock0 = o.querySelector('.clock').textContent;
    for (let i = 0; i < 40 && document.body.contains(o); i++) { down(o.querySelector('button')); await sleep(70); }
    console.log('MG pulsar'); out.pulsar = { ...(await pr), relojAntes: clock0 }; }
  // ordenar pasos
  { const steps = ['Ordeñar', 'Cuajar', 'Moldear', 'Salar', 'Curar']; const pr = MG.sequenceGame(ui, { title: 'Prueba', steps });
    const o = document.querySelector('.seq'); for (let i = 0; i < steps.length; i++) { o.querySelector(`.opt[data-i="${i}"]`).click(); await sleep(60); }
    console.log('MG ordenar'); out.ordenar = await pr; }
  // elegir (primero una mal y luego la buena)
  { const pr = MG.choiceGame(ui, { title: 'Prueba', q: '¿Cuál?', options: ['A', 'B', 'C'], answer: 2, why: 'Porque sí' });
    const o = document.querySelector('.choice'); o.querySelector('.opt[data-i="0"]').click(); await sleep(100); o.querySelector('.opt[data-i="2"]').click(); await sleep(200); o.querySelector('.next').click();
    console.log('MG elegir'); out.elegir = await pr; }
  // melodía: escucha qué botones se encienden y los repite
  { const pr = MG.simonGame(ui, { title: 'Prueba', rounds: 4 }); let done = false; pr.then(() => done = true);
    const o = document.querySelector('.simon'), btns = [...o.querySelectorAll('.pads4 button')], fb = o.querySelector('.fb'); let heard = [];
    const mo = new MutationObserver(ms => { for (const m of ms) if (m.target.classList.contains('on') && fb.textContent.startsWith('Escucha')) heard.push(btns.indexOf(m.target)); });
    btns.forEach(bt => mo.observe(bt, { attributes: true, attributeFilter: ['class'] }));
    const t0 = performance.now();
    while (!done && performance.now() - t0 < 60000) {
      if (fb.textContent === 'Tu turno' && heard.length) { const s = heard; heard = []; for (const i of s) { down(btns[i]); await sleep(120); } }
      await sleep(50);
    }
    mo.disconnect(); console.log('MG melodia'); out.melodia = await pr; }
  return out;
});
console.log(JSON.stringify(res));
console.log(errs.join('\n') || 'sin errores');
await b.close();
