// La lluvia se oye en el pueblo, suave, y nunca en los deportes: mide el volumen real del rumor de la lluvia (la ganancia
// de su bucle de ruido) y el del río en el pueblo con lluvia, con el menú del pelotari, en un partido de pelota, al volver
// al pueblo, al salir al menú y en un partido de fútbol desde Torneos justo después. Los truenos, igual: se cuentan los
// que suenan durante los partidos.
// Uso: node tools/lluvia-ver.mjs [pueblo]   (servidor en 5173)
import { chromium } from 'playwright-core';
const [,, town = 'elizondo'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const problems = [];
const page = async (url) => {
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => problems.push('pageerror: ' + e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
  await p.goto(url, { timeout: 300000 }); return p;
};
const waitFor = (p, fn, ms = 300000) => p.waitForFunction(fn, null, { timeout: ms, polling: 250 });
const click = async (p, sel) => { await p.waitForSelector(sel, { timeout: 300000 }); await p.evaluate((s) => [...document.querySelectorAll(s)].pop().click(), sel); await p.waitForTimeout(500); };
// que llueva ya a tope, con el sonido en marcha, y que se cuenten los truenos
const rain = (p) => p.evaluate(() => { const S = window.__snd = window.__rt?.sound || window.__snd; S.init(); const W = window.__rt?.weather; if (W && W.kind === 'rain') { W.raining = true; W.k = 1; W.phaseT = 1e9; }
  if (!S.__th) { S.__th = 0; const t = S.thunder.bind(S); S.thunder = (...a) => { S.__th++; return t(...a); }; } return W?.kind; });
// el volumen de la lluvia tras unos fotogramas y un par de segundos de audio
const level = async (p) => { await p.evaluate(() => new Promise(r => { const R = window.__rt; if (!R?.active) return r(); const f0 = R.frameNo; const k = () => R.frameNo - f0 >= 4 ? r() : setTimeout(k, 50); k(); })); await p.waitForTimeout(2500);
  return p.evaluate(() => { const S = window.__snd; return { g: +(S.rain?.g.gain.value ?? 0).toFixed(4), rio: +(S.river?.g.gain.value ?? 0).toFixed(4), truenos: S.__th || 0, modo: window.__game?.mode }; }); };
const check = (tag, r, ok) => { console.log(`${ok ? 'ok ' : 'MAL'} ${tag}: lluvia ${r.g} · río ${r.rio} · truenos ${r.truenos} · modo ${r.modo}`); if (!ok) problems.push(`${tag}: lluvia ${r.g}, río ${r.rio}`); };
const talkThrough = async (p) => { for (let i = 0; i < 20; i++) { await p.waitForTimeout(700); if (!await p.evaluate(() => !!window.__game?.ui?.dialogOpen)) return; await p.evaluate(() => document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); } };

// ---- en el pueblo: pelota
{
  const p = await page(`http://127.0.0.1:5173/?town=${town}&q=low&weather=rain&skipintro=1&t=12`);
  await waitFor(p, () => window.__game && window.__game.mode === 'play', 900000); await p.waitForTimeout(2000);
  console.log('tiempo:', await rain(p));
  const r0 = await level(p); check('pueblo con lluvia (suave)', r0, r0.g > 0.012 && r0.g <= 0.035);
  await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
  await talkThrough(p); await waitFor(p, () => document.querySelector('.lg-root [data-a="libre"]'), 60000);
  await rain(p); const r1 = await level(p); check('menú del pelotari', r1, r1.g < 0.002);
  await click(p, '[data-a="libre"]'); await waitFor(p, () => document.querySelector('.pel-panel [data-pel-go]'));
  await click(p, '.pel-panel [data-pel-go]'); await waitFor(p, () => !document.querySelector('.pel-panel') && window.__game?.pelotaMatch?.game?.phase !== 'intro');
  const th0 = await p.evaluate(() => window.__snd.__th || 0);
  await rain(p); const r2 = await level(p); check('partido de pelota', r2, r2.g < 0.002 && r2.rio < 0.002);
  if (r2.truenos > th0) problems.push(`truenos durante el partido de pelota: ${r2.truenos - th0}`);
  await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(300); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' })));
  await click(p, '[data-pel-yes]'); await waitFor(p, () => window.__game.mode === 'play' && !document.querySelector('.lg-root, .pel-root'), 60000);
  await rain(p); const r3 = await level(p); check('de vuelta en el pueblo', r3, r3.g > 0.012);
  // ---- al menú, sin cerrar la página (lo que sonaba en el pueblo no puede quedarse sonando), y fútbol desde Torneos
  await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(200); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' })));
  await waitFor(p, () => !!window.__game?.ui?.modal, 90000); await click(p, '#mExit'); await waitFor(p, () => window.__hub?.visible, 120000);
  const r6 = await level(p); check('en el menú, tras salir del pueblo con lluvia', r6, r6.g < 0.002 && r6.rio < 0.002);
  await click(p, '#hNav [data-s="sports"]'); await click(p, '[data-sport="futbol"]');
  await waitFor(p, () => document.querySelector('.lg-root'), 600000); await p.waitForTimeout(1000);
  if (await p.evaluate(() => !document.querySelector('.lg-root [data-a="amistoso"]'))) { await p.evaluate(() => document.querySelector('.lg-root [data-c], .lg-root .lg-list button, .lg-root button')?.click()); await p.waitForTimeout(800); }
  await waitFor(p, () => document.querySelector('.lg-root [data-a="amistoso"]'), 60000);
  console.log('tiempo:', await rain(p)); const r4 = await level(p); check('menú del fútbol', r4, r4.g < 0.002);
  await click(p, '[data-a="amistoso"]'); await p.evaluate(() => document.querySelector('.lg-root .eq-teams [data-a]')?.click());
  await waitFor(p, () => document.body.classList.contains('futbol') && document.querySelector('.fb-root'), 900000);
  const th1 = await p.evaluate(() => window.__snd.__th || 0);
  await rain(p); const r5 = await level(p); check('partido de fútbol', r5, r5.g < 0.002 && r5.rio < 0.002);
  if (r5.truenos > th1) problems.push(`truenos durante el partido de fútbol: ${r5.truenos - th1}`);
  await p.close();
}
console.log(problems.length ? 'PROBLEMAS: ' + problems.join(' | ') : 'PROBLEMAS: ninguno');
await b.close();
