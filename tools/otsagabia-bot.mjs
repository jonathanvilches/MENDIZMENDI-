// Jugador automático de Otsagabia (game/game.js): las nueve misiones de las cintas, de la bienvenida de Maite al baile
// de Muskilda, con el código del propio juego. Las charlas se dan por leídas y el peloteo con Kike por ganado
// (window.__autoWin), pero se cruza el puente, se bebe en la fuente, se miran los escudos, se empujan las ovejas al redil,
// se anotan los animales con los prismáticos, se recoge la basura del Basajaun, el peine de la Lamia, se pilla tres veces
// al Zarratrako (que no tiene flecha: se le busca por los cencerros) y se baila en Muskilda nota a nota.
// Avisa si una misión se atasca, si un paso no tiene guía o si un sitio no se alcanza andando desde la entrada.
// Uso: node tools/otsagabia-bot.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const [, , out = 'entrega/misiones-bot'] = process.argv; mkdirSync(out, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error' && !/favicon|404|AudioContext|Failed to load resource/.test(m.text())) errs.push('consola: ' + m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pastor', seen: { heroBenat: true, dog: true, comoJugar: true }, settings: { quality: 'low' } })); });
await p.goto(`${BASE}?town=otsagabia-ochagavia&q=low&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__game.player && window.__game.npcs, null, { timeout: 900000 });
await p.waitForTimeout(2500);
const r = await p.evaluate(async () => {
  const g = window.__game, nav = await import('/src/world/nav.js');
  window.__autoWin = true;
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  const avisos = [], res = [];
  g.say = async (a, lines) => { for (const L of lines || []) if (L && typeof L === 'object' && L.choices && L.onChoice) L.onChoice(0); };
  // (un paso del juego sin dibujar: el jugador, la cámara, el pueblo, los caminos, el cielo y los animales; lo de
  // runtime.step menos lo que solo sirve para pintar, que en este navegador de pruebas es lo que más tarda)
  const rt = window.__rt, tick = (n = 6, dt = 1 / 30) => { for (let i = 0; i < n; i++) { try {
    if (g.panoOn && g.altUpdate) g.altUpdate(dt);
    else if (rt?.step) { const I = g.input; I.update?.(dt); rt.player.update(dt, I, rt.follow.yaw); if (g.mode !== 'bino') rt.follow.update(dt, rt.player, I); g.update(dt); nav.navTick(3); rt.sky.update(dt, rt.player.pos, rt.elapsed, g.mode === 'dance'); rt.fauna.update(dt, rt.player, rt.elapsed, rt.sky.night, rt.sound, rt.sky.floodK(), rt.camera.position); rt.particles?.update?.(dt); }
    else g.update(dt);
  } catch (e) { (window.__botErr ||= []).push(String(e.message || e)); } g.input.endFrame?.(); } };
  const P = g.player, inicio = { x: P.pos.x, z: P.pos.z };
  const llega = (x, z) => {
    if (Math.abs(x) > 295 || Math.abs(z) > 295) return 'lejos';
    let q = null; for (let r = 0; r <= 4 && !q; r += 0.5) for (let a = 0; a < 6.28 && !q; a += 0.4) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (nav.walkable(X, Z)) q = { x: X, z: Z }; }
    if (!q) return 'no';
    const path = nav.findPath(inicio.x, inicio.z, q.x, q.z, 200000); return path && path.length ? 'si' : 'no';
  };
  const vistos = new Set();
  const compruebaLlegar = (id, x, z, que) => { const k = id + Math.round(x) + ',' + Math.round(z); if (vistos.has(k)) return; vistos.add(k); if (llega(x, z) === 'no') avisos.push(`INALCANZABLE ${id} · ${que} (${Math.round(x)}, ${Math.round(z)})`); };
  const ve = (x, z, h) => { P.place(x, z, h ?? P.heading); P.frozen = false; tick(4); };
  const usaCerca = async (filtro) => { let best = null, bd = 1e9; for (const it of g.interactables()) { if (!filtro(it)) continue; const d = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (d < it.r && d < bd) { bd = d; best = it; } } if (best) { await g.interact(best); tick(4); } return best; };
  const habla = async (a) => { const h = a.heading || 0; ve(a.pos.x + Math.sin(h) * 1.6, a.pos.z + Math.cos(h) * 1.6, h + Math.PI); await g.talk(a); tick(4); };
  const ORDEN = ['bienvenida', 'escudos', 'zarratrako', 'pelota', 'ovejas', 'irati', 'lamia', 'basajaun', 'muskilda'];
  for (const id of ORDEN) {
    const R = { id, ok: false }; res.push(R);
    let vueltas = 0, quieto = 0, ultima = '';
    try {
      while (vueltas++ < 80) {
        const q = g.q(id); if (q.state === 'done' || (id === 'muskilda' && g.state.done)) { R.ok = true; break; }
        g.state.tracked = id;
        const Q = (await import('/src/game/content.js')).QUESTS?.[id];
        const giver = g.npcs[Q?.giver || ({ muskilda: 'bobo' })[id]];
        const t = g.questTarget(id);
        const enGiver = t && giver && Math.hypot(t.x - giver.pos.x, t.z - giver.pos.z) < 0.5;
        if (giver) compruebaLlegar(id, giver.pos.x, giver.pos.z, 'quien la da: ' + giver.name);
        if (q.state === 'available' || enGiver || (id === 'muskilda' && g.state.ribbons.length >= 8)) await habla(giver);
        else if (id === 'zarratrako' && q.step === 1) { const a = g.npcs.zarratrako; for (let k = 0; k < 3 && q.step === 1; k++) { compruebaLlegar(id, a.pos.x, a.pos.z, 'escondite'); ve(a.pos.x + 1, a.pos.z + 0.5); tick(3); await espera(1200); tick(3); } }
        else if (id === 'ovejas' && q.step === 1) {
          const pen = (await import('/src/world/landmarks.js')).LANDMARKS.pen;
          if (!pen) { avisos.push('ovejas: no encuentro el redil'); break; }
          for (const s of g.herd.filter(s => !s.penned)) {
            for (let k = 0; k < 500 && !s.penned; k++) {
              const inside = Math.abs(s.pos.x - pen.x) < pen.w / 2 && Math.abs(s.pos.z - pen.z) < pen.d / 2 + 2;
              const gx = pen.gate?.x ?? pen.x, gz = pen.gate?.z ?? (pen.z + pen.d / 2 + 1.5);
              const tx = inside ? pen.x : gx, tz = inside ? pen.z : gz, dx = tx - s.pos.x, dz = tz - s.pos.z, l = Math.hypot(dx, dz) || 1;
              P.place(s.pos.x - dx / l * 1.6, s.pos.z - dz / l * 1.6, Math.atan2(dx, dz)); P.frozen = false; tick(3);
            }
            if (!s.penned) { avisos.push(`ovejas: una oveja no entra (queda en ${Math.round(s.pos.x)}, ${Math.round(s.pos.z)})`); break; }
          }
        } else if (id === 'irati' && q.step === 1) {
          ve(t?.x ?? 0, (t?.z ?? -290)); tick(10);
          if (g.mode !== 'bino') g.toggleBinoculars();
          for (let k = 0; k < 40 && g.q('irati').step === 1; k++) {
            const eye = { x: P.pos.x, y: P.pos.y + 1.55, z: P.pos.z };
            const o = g.fauna.observables().filter(o => !g.state.observed.includes(o.id)).sort((a, b) => Math.hypot(a.pos.x - eye.x, a.pos.z - eye.z) - Math.hypot(b.pos.x - eye.x, b.pos.z - eye.z))[0];
            if (!o) { tick(20); continue; }
            const dO = Math.hypot(o.pos.x - eye.x, o.pos.z - eye.z);
            if (dO > (o.far ? 200 : 60)) { if (g.mode === 'bino') g.toggleBinoculars(); ve(o.pos.x + (o.far ? 30 : 15), o.pos.z + (o.far ? 30 : 15)); g.toggleBinoculars(); continue; }
            const dx = o.pos.x - eye.x, dy = o.pos.y + (o.h || 0.5) - eye.y, dz = o.pos.z - eye.z; g.binoYaw = Math.atan2(dx, dz); g.binoPitch = Math.atan2(dy, Math.hypot(dx, dz));
            tick(8); g.input.press('e'); tick(2);
          }
          if (g.mode === 'bino') g.toggleBinoculars();
          if (g.q('irati').step === 1) avisos.push(`irati: con los prismáticos se anotan ${g.state.observed.length} de 5`);
        } else if (id === 'muskilda' && g.mode === 'dance') { /* (lo lleva el baile, abajo) */ }
        else if (t) { compruebaLlegar(id, t.x, t.z, 'objetivo del paso ' + q.step); ve(t.x + 0.4, t.z + 0.4); tick(4); await usaCerca((it) => ['item', 'palace', 'fountain'].includes(it.kind)); }
        else if (id === 'muskilda') { R.motivo = `faltan cintas (${g.state.ribbons.length}/8)`; break; }
        else { avisos.push(`SIN GUÍA ${id} paso ${q.step}`); await habla(giver); }
        // el baile de Muskilda, nota a nota
        if (g.mode === 'dance') { for (let k = 0; k < 3000 && g.dn; k++) { const D = g.dn; for (const n of D.notes) if (!n.done && Math.abs(D.t - n.t) < 0.04) g.dancePress(n.lane); tick(1); } await espera(4000); }
        await espera(30);
        const f = JSON.stringify([q.state, q.step, q.found, g.state.palaces.length, g.state.litter.length, g.state.observed.length, g.penned, g.state.ribbons.length]);
        if (f === ultima) { if (++quieto >= 6) { R.motivo = `atascada en el paso ${q.step}`; break; } } else { quieto = 0; ultima = f; }
      }
    } catch (e) { R.motivo = 'error: ' + String(e.message || e).slice(0, 160); }
    const q = g.q(id); R.estado = q.state; R.paso = q.step;
  }
  return { res, avisos: [...new Set(avisos)], cintas: g.state.ribbons.length, fin: !!g.state.done, errBot: [...new Set(window.__botErr || [])].slice(0, 6), errJuego: [...new Set(window.__errors || [])].slice(0, 6) };
}, { timeout: 1500000 }).catch(e => ({ fallo: String(e.message || e).slice(0, 300) }));
r.errores = [...new Set(errs)].slice(0, 8);
console.log(JSON.stringify(r, null, 1));
writeFileSync(`${out}/otsagabia.json`, JSON.stringify(r, null, 1));
await p.screenshot({ path: `${out}/otsagabia.jpg`, quality: 70 }).catch(() => {});
await b.close();
