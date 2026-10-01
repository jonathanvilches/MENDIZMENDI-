// Partido de fútbol en El Sadar: habla con la entrenadora, juega en tiempo real (el «jugador» corre al balón y chuta
// cuando mira a la portería), saca capturas del estadio por dentro y por fuera y comprueba que vuelve al juego sin errores.
// Uso: node tools/futbol.mjs [carpeta] [url base]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/futbol', base = 'http://127.0.0.1:5173/'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1100, height: 620 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
p.on('console', m => { if (m.type() === 'error') errs.push('consola ' + m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`${base}?town=pamplona&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const cam = (o) => p.evaluate((o) => { const G = window.__game, T = window.__THREE, l = G.sadar; const g0 = window.__hf.groundHeight(l.x, l.z), pos = new T.Vector3(l.x + o.x, g0 + o.y, l.z + o.z), lk = new T.Vector3(l.x + o.lx, g0 + o.ly, l.z + o.lz); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, o);
// fuera: la explanada de la entrada oeste
await p.evaluate(() => { const G = window.__game, l = G.sadar; G.player.place(l.x - 60, l.z, Math.PI / 2); });
await cam({ x: -78, y: 9, z: 26, lx: -46, ly: 4, lz: -4 }); await shot('fuera-entrada');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
// hablar con la entrenadora
await p.evaluate(() => { const G = window.__game, a = G.coach; G.player.place(a.pos.x + 1.5, a.pos.z, -Math.PI / 2); G.safeInteract({ kind: 'npc', a, x: a.pos.x, z: a.pos.z }); });
await p.waitForTimeout(1500); await shot('entrenadora');
for (let i = 0; i < 8; i++) { const open = await p.evaluate(() => window.__game.ui.dialogOpen); if (!open) break; await p.keyboard.press('e'); await p.waitForTimeout(500); await p.keyboard.press('e'); await p.waitForTimeout(400); }
await p.waitForFunction(() => window.__game.mode === 'futbol', null, { timeout: 60000 });
await p.waitForTimeout(2500); await shot('saque');
// juego automático: el jugador va al balón; si está cerca y mira a la portería, chuta
const play = (secs) => p.evaluate((secs) => {
  // tiempo simulado: el jugador va al balón; si lo lleva, hacia la portería, y chuta con carga cerca del área
  const G = window.__game, F = G.futbol;
  for (let i = 0; i < secs * 30 && G.futbol && !F.done; i++) {
    const me = F.me, b = F.b, own = b.owner === me;
    const [tx, tz] = own ? [0 - me.x, 36 - me.z] : [b.x - me.x, b.z - me.z], L = Math.hypot(tx, tz) || 1;
    me.vx = tx / L * 5.5; me.vz = tz / L * 5.5; me.h = Math.atan2(tx, tz);
    if (own && me.z > 20 && F.charge < 0) F.shootDown = true;
    if (F.charge > 0.55) F.shootUp = true;
    F.update(1 / 30);
  }
  return JSON.stringify({ score: F.score, t: Math.round(F.t), done: F.done, cam: F.camMode });
}, secs);
await p.evaluate(() => { const F = window.__game.futbol; F.intro = 0; F.pause = 0; });
console.log('juego 1', await play(8)); await shot('partido-tv');
await p.evaluate(() => window.__game.futbol.nextCam()); await p.waitForTimeout(2500); await shot('partido-detras');
await p.evaluate(() => window.__game.futbol.nextCam()); await p.waitForTimeout(2500); await shot('partido-aerea');
await p.evaluate(() => window.__game.futbol.nextCam());
console.log('juego 1b', await play(30));
await cam({ x: -14, y: 9, z: 20, lx: 0, ly: 1, lz: 34 }); await shot('porteria');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
await cam({ x: 18, y: 14, z: -30, lx: -30, ly: 6, lz: 10 }); await shot('gradas');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
// gol forzado para ver la celebración
await p.evaluate(() => { const F = window.__game.futbol; Object.assign(F.b, { x: 0, y: 0.5, z: 34, vx: 0, vy: 0, vz: 12, owner: null, last: 'home', lastP: F.me }); F.team.forEach(q => { if (q.role === 'keeper') q.save = 0; }); });
await p.waitForTimeout(700); await shot('gol');
console.log('juego 2', await play(40));
// acabar: tiempo a cero
await p.evaluate(() => { const F = window.__game.futbol; if (F) F.t = 0.05; });
await p.waitForFunction(() => document.querySelector('.mg-overlay button') || window.__game.mode === 'play', null, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(1000); await shot('final');
for (let i = 0; i < 10; i++) { const b = await p.evaluate(() => { const b = document.querySelector('.mg-overlay:not(.out) button'); if (b) { b.click(); return true; } if (window.__game.ui.dialogOpen) { window.__game.ui._dlgCleanup?.(); return true; } return false; }); await p.waitForTimeout(1200); if (!b && await p.evaluate(() => window.__game.mode === 'play')) break; }
await p.waitForTimeout(1500); await shot('vuelta');
console.log('estado', await p.evaluate(() => JSON.stringify({ mode: window.__game.mode, frozen: window.__game.player.frozen, futbol: !!window.__game.futbol, hud: !!document.querySelector('.fut-hud'), clase: document.body.classList.contains('futbol'), errores: window.__errors || [] })));
console.log('errores', JSON.stringify(errs));
await browser.close();
