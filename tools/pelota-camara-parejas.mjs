// Pelota por parejas: ¿la cámara ve a quien golpea? Se juega solo (piloto automático) de delantero, con el zaguero de
// compañero detrás, y en cada golpe se mira si el pelotari que golpea está dentro de la imagen (y con qué margen). Antes,
// de delantero, el golpe de tu zaguero quedaba a tu espalda, fuera de la cámara.
// Uso: node tools/pelota-camara-parejas.mjs [pueblo] [carpeta] [delantero|zaguero]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-camara', role = 'delantero'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Iñigo', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173'}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__rt?.active && window.__rt.elapsed > 2, null, { timeout: 600000 });
const click = async (sel, ms = 240000) => { await p.waitForSelector(sel, { timeout: ms, state: 'attached' }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="libre"]');
await click(`.pel-panel [data-pel-mod="${role}"]`);
await p.waitForFunction(() => window.__game.pelotaMatch?.pairs && !window.__game.pelotaMatch.loadingMates, null, { timeout: 240000 });
await click('.pel-panel [data-pel-go]');
await p.waitForFunction(() => window.__game.pelotaMatch?.game?.phase !== 'intro' && !document.querySelector('.pel-panel'), null, { timeout: 240000 }).catch(() => {});
await p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; m.hud.closePanel?.(); });
// se avanza la lógica a mano (el navegador sin tarjeta gráfica pinta muy despacio) y en cada golpe se mide
const r = await p.evaluate(() => {
  const m = window.__game.pelotaMatch, g = m.game, cam = m.cam, grp = m.court.group, V = cam.position.constructor;
  const rec = { golpes: 0, porQuien: {}, fuera: 0, peor: 1, muestras: [] };
  const seen = (id) => { const pl = g.players[id]; const v = grp.localToWorld(new V(pl.x, 1.1, pl.z)); v.project(cam); return { x: v.x, y: v.y, dentro: v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 }; };
  let last = 0;
  const orig = m.onEvent.bind(m);
  m.onEvent = (e) => { if (e.type === 'hit') { const id = e.id || e.whoId || null; e._id = id; rec.pend = e; } orig(e); };
  for (let k = 0; k < 30 * 120 && m.active; k++) {
    m.update(1 / 30);
    if (rec.pend) {
      const e = rec.pend; rec.pend = null;
      // quién ha golpeado: el más cercano a la pelota en ese momento
      const B = g.ball.p; let id = null, bd = 1e9; for (const q of g.ids) { const pl = g.players[q], d = Math.hypot(pl.x - B.x, pl.z - B.z); if (d < bd) { bd = d; id = q; } }
      const s = seen(id); rec.golpes++; rec.porQuien[id] = (rec.porQuien[id] || 0) + 1;
      if (!s.dentro) rec.fuera++;
      rec.peor = Math.min(rec.peor, 1 - Math.max(Math.abs(s.x), Math.abs(s.y)));
      if (rec.muestras.length < 14) rec.muestras.push(`${id} ${s.dentro ? 'se ve' : 'FUERA'} (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`);
    }
    if (g.phase === 'end') break;
  }
  delete rec.pend; return rec;
});
await p.screenshot({ path: `${out}/parejas-${role}.png` });
console.log(JSON.stringify(r, null, 1));
console.log(`golpes vistos: ${r.golpes - r.fuera} de ${r.golpes}`);
console.log(errs.length ? 'ERRORES ' + errs.slice(0, 3).join(' | ') : 'sin errores');
await b.close();
