// Luz estable al cambiar de cámara. En el pueblo, la cámara da la vuelta al jugador (8 direcciones) y se mide el
// brillo del suelo en la captura; se repite sin el brillo del sol que depende de hacia dónde mira la cámara (reflejo
// especular) para ver cuánto cambia por eso. Después, la luz de la escena (cielo, sol, dirección, niebla, focos) al
// entrar en un partido de pelota, durante el partido y al salir.
// Uso: node tools/luz-ver.mjs [pueblo] [carpeta] [hora] [pueblo|pelota|todo] [clear|rain]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import sharp from 'sharp';
const [,, town = 'elizondo', out = 'entrega/luz', hour = '12', parte = 'todo', weather = 'clear'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=${weather}&skipintro=1&t=${hour}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(3000);
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
// (la hora, quieta: así solo cambia la cámara)
await p.evaluate(() => { const s = window.__rt.sky; s.speed = 0; });
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const t = () => (window.__rt.frameNo - f0 >= n ? r() : requestAnimationFrame(t)); t(); }), n);
// la interfaz, fuera de la captura (solo la imagen 3D)
const hideUI = (on) => p.evaluate((on) => { for (const e of document.body.children) if (e.id !== 'c' && !e.querySelector?.('canvas#c')) e.style.visibility = on ? 'hidden' : ''; }, on);
// brillo medio (0-255) del suelo: la franja de abajo, entre la cámara y el jugador
const lum = async (tag) => {
  await hideUI(true); const buf = await p.screenshot({ path: `${out}/${tag}.png` }); await hideUI(false);
  const { width: W, height: H } = await sharp(buf).metadata();
  const st = await sharp(buf).extract({ left: Math.round(W * 0.3), top: Math.round(H * 0.8), width: Math.round(W * 0.4), height: Math.round(H * 0.17) }).stats();
  const [r, g, bl] = st.channels.map(c => c.mean); return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
};
// la luz de la escena
const light = () => p.evaluate(() => { const rt = window.__rt, s = rt.sky, f = (c, k = 1) => [c.r * k, c.g * k, c.b * k].map(v => +v.toFixed(2)); const d = s.sun.position.clone().sub(s.sun.target.position).normalize();
  return { cielo: f(s.hemi.color, s.hemi.intensity), suelo: f(s.hemi.groundColor, s.hemi.intensity), sol: f(s.sun.color, s.sun.intensity), dir: [d.x, d.y, d.z].map(v => +v.toFixed(2)), niebla: f(s.fog.color), focos: +s.floodK().toFixed(2), exp: rt.renderer.toneMappingExposure, sombras: rt.renderer.shadowMap.enabled }; });
// (iguales salvo el redondeo: la dirección del sol sale de restar dos posiciones y baila en el segundo decimal)
const same = (a, b) => ['cielo', 'suelo', 'sol', 'dir', 'niebla'].every(k => a[k].every((v, i) => Math.abs(v - b[k][i]) <= 0.02)) && a.exp === b.exp;
// el reflejo del sol en los materiales mates (lo que cambia según hacia dónde mira la cámara): fuera, para comparar
const noSpec = () => p.evaluate(() => { window.__rt.scene.traverse(o => { for (const m of [].concat(o.material || [])) { if (!m.isMeshStandardMaterial || m.userData.__ns) continue; m.userData.__ns = true; const ob = m.onBeforeCompile, ck = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) { ob?.call(this, sh, r); sh.fragmentShader = sh.fragmentShader.replace('vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;', 'vec3 totalSpecular = reflectedLight.indirectSpecular;'); };
  m.customProgramCacheKey = function () { return ck.call(this) + '|ns'; }; m.needsUpdate = true; } }); });

if (parte !== 'pelota') {
console.log(`1. ${town} a las ${hour}: la cámara da la vuelta al jugador`);
await p.evaluate(() => { const G = window.__game; G.player.frozen = true; G.follow.pitch = 0.32; G.follow.targetDist = 6; });
const orbit = async (tag) => {
  const L = [], S = [];
  for (let i = 0; i < 8; i++) {
    await p.evaluate((i) => { const G = window.__game; G.follow.yaw = G.player.heading + Math.PI + i * Math.PI / 4; }, i);
    await frames(4); L.push(await lum(`${tag}-${i * 45}`)); S.push(await light());
  }
  return { L, S };
};
const A = await orbit('pueblo');
await noSpec(); await frames(6);
const B = await orbit('pueblo-sin-reflejo');
const rng = (v) => Math.max(...v) - Math.min(...v), avg = (v) => v.reduce((a, x) => a + x, 0) / v.length;
console.log('   brillo del suelo por dirección (0°…315°):', A.L.map(v => v.toFixed(0)).join(' '));
console.log('   sin el reflejo del sol:                 ', B.L.map(v => v.toFixed(0)).join(' '));
console.log(`   variación: ${rng(A.L).toFixed(0)} (${(100 * rng(A.L) / avg(A.L)).toFixed(0)} %) con reflejo · ${rng(B.L).toFixed(0)} (${(100 * rng(B.L) / avg(B.L)).toFixed(0)} %) sin él`);
console.log('   reflejo por dirección (cuánto suma):', A.L.map((v, i) => `${(100 * (v - B.L[i]) / B.L[i]).toFixed(0)}%`).join(' '));
ok(A.S.every(s => same(s, A.S[0])), 'la luz de la escena (cielo, sol, niebla) no cambia al girar la cámara');
console.log('   luz:', JSON.stringify(A.S[0]));
}

if (parte !== 'pueblo') {
  console.log(`\n2. pelota a las ${hour} (${weather}): entrar, jugar y salir`);
  if (parte === 'todo') { await p.evaluate(() => location.reload()); await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(3000); }
  await p.evaluate(() => { window.__rt.sky.speed = 0; });
  const click = async (sel, ms = 240000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
  await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
  const before = await light(); await lum(`pelota-${hour}-${weather}-0-antes`);
  for (let i = 0; i < 14; i++) { await p.waitForTimeout(800); if (await p.evaluate(() => !!document.querySelector('[data-a="libre"]'))) break; if (await p.evaluate(() => window.__game.ui.dialogOpen)) await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
  await click('[data-a="libre"]');
  await click('.pel-panel [data-pel-mod="mano"]', 300000); await p.waitForTimeout(600);
  await click('.pel-panel [data-pel-go]');
  await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 60; k++) m.update(1 / 30); });
  await frames(6);
  const during = await light(); await lum(`pelota-${hour}-${weather}-1-partido`);
  await p.evaluate(() => window.__game.pelotaAbort?.()); await frames(8); await p.waitForTimeout(1500); await frames(8);
  const after = await light(); await lum(`pelota-${hour}-${weather}-2-despues`);
  console.log('   antes:   ', JSON.stringify(before)); console.log('   partido: ', JSON.stringify(during)); console.log('   después: ', JSON.stringify(after));
  const night = await p.evaluate(() => window.__rt.sky.night);
  if (night < 0.15) ok(same(before, during), 'de día, al empezar el partido la luz del pueblo no cambia');
  else console.log(`   (de noche, ${night.toFixed(2)}: se encienden los focos del frontón; la luz cambia a propósito)`);
  ok(same(before, after), 'al acabar, la misma luz que antes');
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
