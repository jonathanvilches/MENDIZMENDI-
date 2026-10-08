// Motas al subir y bajar la cámara: con el jugador quieto, la cámara recorre de abajo arriba (y cambia de plano) y se
// saca una foto en cada paso; además se apunta qué hay de puntos, halos y transparentes a la vista.
// Uso: node tools/camara-motas.mjs <pueblo> <carpeta> [hora] [frontón: 1 para ponerse junto al frontón]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/motas', hora = '12', fr = '0'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=${hora}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 30); k(); }), n);
await p.evaluate((fr) => { const G = window.__game, rt = G.rt; rt.sky.speed = 0; rt.pixelRatio = rt.maxRatio = 0.75; rt.ratioFor = () => 0.75; rt.ratioDirty = true;
  document.querySelectorAll('.toast,.whisper').forEach(e => e.remove());
  if (fr === '1' && G.fronton) { const e = G.fronton.entry; G.player.place(e.x, e.z, 0); }
  G.follow.snap(G.player); window.__yaw0 = G.follow.yaw; }, fr);
await frames(10);
const pitches = [-0.15, 0.05, 0.25, 0.45, 0.65, 0.85, 1.05, 1.2];
for (const [i, pt] of pitches.entries()) {
  await p.evaluate((pt) => { const F = window.__game.follow; F.pitch = pt; F.yaw = window.__yaw0; F.snap?.(window.__game.player); }, pt);
  await frames(6);
  await p.screenshot({ path: `${out}/${town}-${hora}${fr === '1' ? '-fr' : ''}-p${i}.png` });
}
// la misma vista sin niebla y sin luciérnagas, para ver qué es cada mancha
await p.evaluate(() => { const F = window.__game.follow; F.pitch = 0.65; F.yaw = window.__yaw0; F.snap?.(window.__game.player); });
await frames(6); await p.screenshot({ path: `${out}/${town}-${hora}-con.png` });
await p.evaluate(() => { const rt = window.__rt; rt.sky.mist.forEach(m => m.material.opacity = 0); rt.sky.update = ((u) => function (...a) { const r = u.apply(this, a); this.mist.forEach(m => m.visible = false); return r; })(rt.sky.update); });
await frames(6); await p.screenshot({ path: `${out}/${town}-${hora}-sin-niebla.png` });
await p.evaluate(() => { const f = window.__rt.fauna; f.update = ((u) => function (...a) { const r = u.apply(this, a); this.fireflies.visible = false; return r; })(f.update); });
await frames(6); await p.screenshot({ path: `${out}/${town}-${hora}-sin-nada.png` });
// qué hay de puntos, halos y transparentes visibles
const vis = await p.evaluate(() => { const G = window.__game, out = {}; G.rt.scene.traverseVisible(o => { if (!(o.isPoints || o.isSprite || (o.material && o.material.transparent))) return; const k = (o.isPoints ? 'P:' : o.isSprite ? 'S:' : 'T:') + (o.name || o.parent?.name || o.material?.type); out[k] = (out[k] || 0) + 1; }); return out; });
console.log('visibles', JSON.stringify(vis));
console.log('errores', JSON.stringify(errs));
await b.close();
