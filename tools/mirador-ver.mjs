// La vista real desde el mirador (relieve de verdad): una captura hacia cada monte de la misión, con la cumbre en la
// marca, y otra con el visor abierto del todo, sin los rótulos del visor. Sirve para comparar con fotos reales.
// Uso: node tools/mirador-ver.mjs [pueblo] [carpeta]   (URL=http://127.0.0.1:5173; W y H para otra pantalla)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'pamplona', out = 'entrega/mirador'] = process.argv; mkdirSync(out, { recursive: true });
const W = +(process.env.W || 844), H = +(process.env.H || 390), movil = W < 1000;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: movil, hasTouch: movil, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || /relieve/.test(m.text())) errs.push(m.text().slice(0, 300)); });
await p.addInitScript((q) => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, gear: ['prismaticos'], bag: { agua: 2, food: {}, items: ['prismaticos'] }, settings: { quality: q } })); }, process.env.Q || 'low');
await p.goto(`${URL}/?town=${town}&q=${process.env.Q || 'low'}&weather=clear&skipintro=1&t=${process.env.T || 12}`, { timeout: 600000 });
await p.waitForFunction(() => window.__game && window.__rt?.active && window.__rt.elapsed > 2, null, { timeout: 900000 });
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 50); k(); }), n);
const info = await p.evaluate(() => {
  const G = window.__game, M = G.missions.find(M => M.type === 'mirador');
  if (M) M.step = 1; G.binoOn = true; const s = G.miradorSpot(); if (!s) return null; G.player.place(s.x, s.z, 0); G.toggleBinoculars();
  const B = document.getElementById('bino'); if (B) B.style.visibility = 'hidden';
  return { real: !!G.pano?.real, peaks: (G.pano?.peaks || []).map(pk => ({ id: pk.m.id, name: pk.m.name, km: +pk.m.km.toFixed(1), bearing: +pk.m.bearing.toFixed(1), deg: +(Math.atan2(pk.summit.y - G.pano.eye.y, pk.ds) * 180 / Math.PI).toFixed(2) })) };
});
console.log(JSON.stringify(info));
if (info) {
  for (const [i, pk] of info.peaks.entries()) {
    await p.evaluate((i) => { const G = window.__game, k = G.pano.peaks[i]; G.binoYaw = Math.PI - k.m.bearing * Math.PI / 180; G.binoPitch = Math.atan2(k.summit.y - G.pano.eye.y, k.ds) - 0.02; G.panoPins?.forEach(s => s.visible = false); }, i);
    await frames(30); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${town}-${i + 1}-${pk.id}.png` });
  }
  // abierto: 60° de visor, hacia el primer monte
  await p.evaluate(() => { const G = window.__game, k = G.pano.peaks[0]; G.binoYaw = Math.PI - k.m.bearing * Math.PI / 180; G.binoPitch = 0.01; const u = G.updateBino.bind(G); G.updateBino = (dt) => { u(dt); G.pano.look(G.binoYaw, G.binoPitch, 60); }; });
  await frames(20); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${town}-0-abierto.png` });
}
console.log(errs.length ? 'ERRORES ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'sin errores');
await b.close();
