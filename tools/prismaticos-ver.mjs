// El visor de los prismáticos en el iPhone 12 tumbado (844 × 390): la misión del mirador (buscando y con un monte en la
// marca) y la de las aves. Mira que los botones que hacen falta se ven y se pueden tocar (nada del visor encima), que los
// rótulos del visor no se pisan entre ellos ni con los botones y que no asoma el marcador del pueblo por detrás. Capturas.
// Uso: node tools/prismaticos-ver.mjs [pueblo] [carpeta]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'isaba-izaba', out = 'entrega/prismaticos'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const W = +(process.env.W || 844), H = +(process.env.H || 390), movil = W < 1000;   // (W y H para otra pantalla: en el ordenador, con ratón)
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: movil, hasTouch: movil, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, gear: ['prismaticos'], bag: { agua: 2, food: {}, items: ['prismaticos'] }, settings: { quality: 'low' } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 600000 });
await p.waitForFunction(() => window.__game && window.__rt?.active && window.__rt.elapsed > 2, null, { timeout: 900000 });
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 50); k(); }), n);
// lo que se ve en el visor: cajas de sus rótulos y botones, si los botones quedan encima de todo y qué asoma del pueblo
const medir = () => p.evaluate(() => {
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const B = document.getElementById('bino'), parts = {};
  for (const s of ['.bgoal', '.label', '.bhint', '.bact', '.bexit', '.bdir i']) { const e = B?.querySelector(s); if (vis(e)) parts[s] = box(e); }
  // botones: ¿lo que hay en su centro es el propio botón?
  const top = {}; for (const s of ['.bact', '.bexit']) { const e = B?.querySelector(s); if (!vis(e)) continue; const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); top[s] = !!h && (h === e || e.contains(h)); }
  // del marcador del pueblo, lo que sigue a la vista con los prismáticos
  const hud = [...document.querySelectorAll('#hud #tl, #hud #compass, #hud #topright, #hud #controls, #hud #prompt')].filter(vis).map(e => e.id);
  return { parts, top, hud, goal: B?.querySelector('.bgoal')?.innerText || '', label: B?.querySelector('.label')?.innerText || '', lock: !!B?.querySelector('.cross.lock') };
});
const solapes = (parts) => { const k = Object.keys(parts).filter(s => s !== '.bdir i'), o = [];
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const a = parts[k[i]], c = parts[k[j]]; if (a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && a.y < c.y + c.h - 1 && c.y < a.y + a.h - 1) o.push(`${k[i]} y ${k[j]}`); }
  return o; };
const revisar = async (tag) => {
  await frames(8); await p.waitForTimeout(600);
  const m = await medir(); await p.screenshot({ path: `${out}/${tag}.png` });
  console.log(`\n${tag}: ${JSON.stringify({ rotulo: m.label, marca: m.lock, pueblo: m.hud })}\n  objetivo: ${m.goal.replace(/\n/g, ' | ')}`);
  const s = solapes(m.parts); ok(!s.length, `nada se pisa en el visor${s.length ? ': ' + s.join(', ') : ''}`);
  ok(m.parts['.bact'] && m.top['.bact'], 'el botón de anotar se ve y queda encima');
  ok(m.parts['.bexit'] && m.top['.bexit'], 'el botón de salir se ve y queda encima');
  ok(!m.hud.length, `no asoma el marcador del pueblo${m.hud.length ? ': ' + m.hud.join(', ') : ''}`);
  const innerW = W, innerH = H, inside = Object.entries(m.parts).every(([, r]) => r.x >= 0 && r.y >= 0 && r.x + r.w <= innerW && r.y + r.h <= innerH); ok(inside, 'todo dentro de la pantalla');
  return m;
};
// 1. misión del mirador
const montes = await p.evaluate(() => {
  const G = window.__game, M = G.missions.find(M => M.type === 'mirador'); if (!M) return null;
  M.step = 1; G.binoOn = true; const s = G.miradorSpot(); G.player.place(s.x, s.z, 0); G.toggleBinoculars();
  // mirando a un sitio sin monte (hacia el suelo, un poco a un lado del primero)
  const m0 = M.montes[0]; G.binoYaw = Math.PI - m0.bearing * Math.PI / 180 + 0.9; G.binoPitch = -0.2;
  return M.montes.map(m => ({ name: m.name, bearing: m.bearing }));
});
if (!montes) { console.log('este pueblo no tiene misión del mirador'); }
else {
  await revisar('1-mirador-buscando');
  // casi encima de un monte: la ayuda al apuntar lo tiene que acabar de centrar
  await p.evaluate(() => { const G = window.__game, pk = G.pano?.peaks?.[0]; if (!pk) return; G.binoYaw = Math.PI - pk.m.bearing * Math.PI / 180 + 0.09; G.binoPitch = Math.atan2(pk.summit.y - G.pano.eye.y, pk.ds) + 0.05; });
  await frames(40);
  const m = await revisar('2-mirador-centrado');
  ok(m.lock, 'con el monte casi en la marca, la marca lo coge');
  await p.evaluate(() => window.__game.toggleBinoculars());
}
// 2. misión de las aves
const aves = await p.evaluate(() => {
  const G = window.__game, M = G.missions.find(M => M.type === 'observe'); if (!M) return null;
  const MM = G.missions.find(x => x.type === 'mirador'); if (MM) MM.step = 2;   // (solo la de las aves)
  M.step = 1; G.binoOn = true; G.toggleBinoculars(); return M.species;
});
if (aves) {
  await revisar('3-aves');
  // cerca del ave más cercana de las que faltan: la ayuda al apuntar la tiene que centrar y decir su nombre
  const ave = await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'observe'), t = G.obsNearest(M); if (!t) return null;
    const P = G.player.pos, e = { x: P.x, y: P.y + 1.55, z: P.z }, dx = t.pos.x - e.x, dy = t.pos.y + (t.h || 0.5) - e.y, dz = t.pos.z - e.z, d = Math.hypot(dx, dy, dz);
    G.binoYaw = Math.atan2(dx, dz) + 0.05; G.binoPitch = Math.asin(dy / d) - 0.03; return t.id; });
  if (ave) { await frames(30); const m = await revisar('4-ave-centrada'); ok(m.lock && /[A-Za-zÁÉÍÓÚáéíóú]/.test(m.label), `la marca coge el ave (${ave}) y dice su nombre: ${m.label}`); }
}
else console.log('este pueblo no tiene misión de aves');
console.log(errs.length ? '\nERRORES ' + errs.slice(0, 4).join(' | ') : '\nsin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
