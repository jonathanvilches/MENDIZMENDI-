// Futbolistas de cerca para revisar a las jugadoras (coleta, pelo recogido, pestañas) junto a los jugadores, con las dos
// equipaciones: de frente, de espaldas, de lado corriendo y, de una jugadora, la cara, la nuca y el perfil. Saca una imagen por vista en la carpeta indicada.
// Uso: node tools/futbol/jugadoras.mjs <carpeta>   (servidor de pruebas en 5173; VISTAS=perfil,nuca…; OCULTA=n)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|google|Failed to load/.test(m.text())) errs.push(m.text()); if (/jugadora/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); });
await p.goto('http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.addStyleTag({ content: '#ui > *, #hud, .hud { display: none !important; }' });
const info = await p.evaluate(async () => {
  const G = window.__game, T = window.__THREE, { makeCharacter } = await import('/src/game/futbol.js'), { TEAMS } = await import('/src/futbol/rules.js');
  G.player.obj.visible = false; for (const o of G.actors || []) if (o.obj) o.obj.visible = false;
  const P = G.player.pos, h = G.player.heading, list = [['osasuna', 7, false], ['osasuna', 9, true], ['visitante', 4, true], ['visitante', 10, false], ['osasuna', 1, true]];
  const chars = [];
  for (let i = 0; i < list.length; i++) {
    const [id, num, female] = list[i], team = TEAMS[id];
    const c = await makeCharacter({ team, teamId: id, side: i % 2, role: num === 1 ? 'POR' : 'MC', num, keeper: num === 1, female });
    const off = (i - (list.length - 1) / 2) * 0.95;
    c.obj.position.set(P.x + Math.sin(h) * 4 + Math.cos(h) * off, P.y, P.z + Math.cos(h) * 4 - Math.sin(h) * off); c.obj.rotation.y = h + Math.PI;
    G.scene.add(c.obj); chars.push(c);
  }
  // (OCULTA=índice de la pieza de la jugadora 1 que no se pinta, para depurar: 0 cuerpo, 1 coleta, 2 goma, 3 pestañas, 4 pelo)
  window.__oculta = (k) => { let i = 0; chars[1].obj.traverse(o => { if (o.isMesh) { o.visible = i !== k; i++; } }); };
  window.__fb = chars; let last = performance.now();
  const loop = () => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; for (const c of chars) { c.anim.setSpeed(window.__vel || 0); c.anim.update(dt); } requestAnimationFrame(loop); }; loop();
  window.__aim = (modo) => {
    const cerca = ['cara', 'nuca', 'perfil'].includes(modo), d = cerca ? 1.15 : 4.6, s = modo === 'espalda' || modo === 'nuca' ? -1 : 1, hh = h + (modo === 'lado' || modo === 'perfil' ? Math.PI / 2 : 0), cy = cerca ? 1.38 : 0.85;
    const tgt = cerca ? chars[+(window.__sola ?? 1)].obj.position.clone() : new T.Vector3(P.x + Math.sin(h) * 4, P.y, P.z + Math.cos(h) * 4); tgt.y = P.y + cy;
    const pos = new T.Vector3(tgt.x - Math.sin(hh) * d * s, tgt.y + (cerca ? 0.02 : 0.25), tgt.z - Math.cos(hh) * d * s);
    G.follow.cinematic = { pos, look: tgt, t: 1, lookCur: tgt.clone() }; G.camera.position.copy(pos); G.camera.lookAt(tgt);
  };
  return chars.map(c => c.female);
});
if (process.env.OCULTA) await p.evaluate((k) => window.__oculta(k), +process.env.OCULTA);
// (SOLA=1: solo la jugadora 1 en escena)
// (SIN=n: todos menos ese)
if (process.env.SIN) await p.evaluate((k) => window.__fb.forEach((c, i) => { c.obj.visible = i !== k; }), +process.env.SIN);
if (process.env.SOLA) await p.evaluate((k) => { window.__sola = k; }, process.env.SOLA);
if (process.env.SOLA) await p.evaluate(() => window.__fb.forEach((c, i) => { c.obj.visible = i === +(window.__sola ?? 1); }));
for (const modo of (process.env.VISTAS || 'frente,espalda,cara,lado,nuca,perfil').split(',')) {
  await p.evaluate((m) => { window.__vel = m === 'lado' ? 5 : 0; }, modo);
  for (let i = 0; i < 6; i++) { await p.evaluate((m) => window.__aim(m), modo); await p.waitForTimeout(250); }
  await p.screenshot({ path: `${out}/${modo}.png` });
}
console.log('chicas:', JSON.stringify(info), 'errores:', errs.length ? errs.slice(0, 5).join(' | ') : 'ninguno');
await b.close();
