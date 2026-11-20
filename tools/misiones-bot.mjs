// Jugador automático de las misiones de los pueblos: entra en cada pueblo y juega todas sus misiones de principio a fin
// con el código del propio juego (las charlas, los objetos, las pistas, los aros, los mojones, el baile, los prismáticos,
// el rebaño, la persecución de las criaturas…). Las charlas se dan por leídas y los minijuegos por ganados
// (window.__autoWin), pero todo lo que hay que hacer en el pueblo se hace: el personaje va a cada sitio que marca la
// misión (la flecha, la luz dorada) y lo usa como lo usaría quien juega. Avisa de:
//  · ATASCADA: la misión no avanza (el mismo paso y la misma cuenta tras varios intentos)
//  · SIN GUÍA: un paso sin flecha ni marca que no sea de buscar por el oído (carnaval) o de esperar la noche
//  · INALCANZABLE: un sitio al que hay que ir y al que no se llega andando desde la entrada del pueblo
//  · ERROR: cualquier error de JavaScript
// Las cosechas con tractor y la almadía tienen su prueba propia (tools/cosecha-vehiculo.mjs, tools/almadia-movil.mjs).
// Uso: node tools/misiones-bot.mjs [pueblos separados por comas | todos] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const [, , cuales = 'todos', out = 'entrega/misiones-bot'] = process.argv; mkdirSync(out, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let ids;
{ const p0 = await b.newPage(); await p0.goto(BASE, { timeout: 300000 });
  ids = cuales === 'todos' ? await p0.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.filter(l => !l.special).map(l => l.id)) : cuales.split(',');
  await p0.close(); }
// SALTA=pueblo1,pueblo2: los que ya se pasaron (para retomar un recorrido)
if (process.env.SALTA) { const no = new Set(process.env.SALTA.split(',')); ids = ids.filter(t => !no.has(t)); }
const informe = [];
for (const town of ids) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('console', m => { if (m.text().startsWith('[bot]')) { console.log('   ' + m.text()); return; } if (m.type() === 'error' && !/favicon|404|AudioContext|Failed to load resource/.test(m.text())) errs.push('consola: ' + m.text().slice(0, 200)); });
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pastor', seen: { heroBenat: true, dog: true, comoJugar: true }, settings: { quality: 'low' } })); });
  const t0 = Date.now();
  try {
    await p.goto(`${BASE}?town=${town}&q=low&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__game.player, null, { timeout: 900000 });
    await p.waitForTimeout(2000);
    const r = await p.evaluate(BOT, process.env.SOLO || '');
    r.town = town; r.errores = [...new Set(errs)].slice(0, 8); r.segundos = Math.round((Date.now() - t0) / 1000);
    informe.push(r);
    const mal = r.misiones.filter(m => !m.ok && !m.aparte);
    console.log(`${town}: ${r.misiones.filter(m => m.ok).length}/${r.misiones.length} hechas${mal.length ? ' · FALLAN: ' + mal.map(m => `${m.tipo} (${m.motivo})`).join('; ') : ''}${r.misiones.some(m => m.aparte) ? ' · aparte: ' + r.misiones.filter(m => m.aparte).map(m => m.tipo).join(', ') : ''}${r.avisos.length ? ' · avisos: ' + r.avisos.slice(0, 6).join(' | ') : ''}${r.errores.length ? ' · ERRORES: ' + r.errores.join(' | ') : ''} (${r.segundos} s)`);
    await p.screenshot({ path: `${out}/${town}.jpg`, quality: 70 }).catch(() => {});
  } catch (e) { informe.push({ town, fallo: String(e.message || e).slice(0, 300), errores: errs.slice(0, 5) }); console.log(`${town}: NO SE PUDO PROBAR · ${String(e.message || e).slice(0, 200)}`); }
  writeFileSync(`${out}/informe.json`, JSON.stringify(informe, null, 1));
  await p.close();
}
await b.close();

// ---------- lo que se ejecuta dentro de la página ----------
async function BOT(SOLO) {
  const g = window.__game, nav = await import('/src/world/nav.js');
  window.__autoWin = true;
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  const avisos = [], misiones = [];
  // las charlas, leídas al momento (con una pregunta, se elige la primera: «Esperar a que anochezca»)
  g.say = async (a, lines) => { for (const L of lines || []) if (L && typeof L === 'object' && L.choices && L.onChoice) L.onChoice(0); };
  // (un paso del juego sin dibujar: el jugador, la cámara, el pueblo, los caminos, el cielo y los animales; lo de
  // runtime.step menos lo que solo sirve para pintar, que en este navegador de pruebas es lo que más tarda)
  const rt = window.__rt, tick = (n = 6, dt = 1 / 30) => { for (let i = 0; i < n; i++) { try {
    if (g.panoOn && g.altUpdate) g.altUpdate(dt);
    else if (rt?.step) { const I = g.input; I.update?.(dt); rt.player.update(dt, I, rt.follow.yaw); if (g.mode !== 'bino') rt.follow.update(dt, rt.player, I); g.update(dt); nav.navTick(3); rt.sky.update(dt, rt.player.pos, rt.elapsed, g.mode === 'dance'); rt.fauna.update(dt, rt.player, rt.elapsed, rt.sky.night, rt.sound, rt.sky.floodK(), rt.camera.position); rt.particles?.update?.(dt); }
    else g.update(dt);
  } catch (e) { (window.__botErr ||= []).push(String(e.message || e)); } g.input.endFrame?.(); } };
  const P = g.player, inicio = { x: P.pos.x, z: P.pos.z };
  // ¿se llega andando desde la entrada? (la rejilla de los caminos cubre ±300 m; más allá no se puede decir)
  const llega = (x, z) => {
    if (Math.abs(x) > 295 || Math.abs(z) > 295) return 'lejos';
    let q = null; for (let r = 0; r <= 4 && !q; r += 0.5) for (let a = 0; a < 6.28 && !q; a += 0.4) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (nav.walkable(X, Z)) q = { x: X, z: Z }; }
    if (!q) return 'no';
    const path = nav.findPath(inicio.x, inicio.z, q.x, q.z, 200000);
    return path && path.length ? 'si' : 'no';
  };
  const vistos = new Set();
  const compruebaLlegar = (M, x, z, que) => { const k = M.i + ':' + Math.round(x) + ',' + Math.round(z); if (vistos.has(k)) return; vistos.add(k); const r = llega(x, z); if (r === 'no') avisos.push(`INALCANZABLE ${M.type} · ${que} (${Math.round(x)}, ${Math.round(z)})`); };
  const ve = (x, z, h) => { P.place(x, z, h ?? P.heading); P.frozen = false; tick(4); };
  const junto = (a, d = 1.6) => { const h = a.heading || 0; ve(a.pos.x + Math.sin(h) * d, a.pos.z + Math.cos(h) * d, h + Math.PI); };
  const usaCerca = async (filtro = (it) => it.kind !== 'npc' && it.kind !== 'walker' && it.kind !== 'pet' && it.kind !== 'seat' && it.kind !== 'bell' && it.kind !== 'fountain' && it.kind !== 'flora' && it.kind !== 'shop') => {
    let best = null, bd = 1e9;
    for (const it of g.interactables(P.pos)) { if (!filtro(it)) continue; const d = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    if (best) { await conTope(g.interact(best), 'usar ' + (best.label || best.kind)); tick(4); }
    return best;
  };
  // (ninguna acción espera más de 30 s: si el juego se queda esperando algo que no llega, se apunta y se cierra lo abierto)
  const conTope = async (pr, que) => {
    let hecho = false; const r = await Promise.race([Promise.resolve(pr).then(() => (hecho = true)), espera(30000)]);
    if (!hecho) {
      const abierto = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /seguir|cerrar|continuar|vale|salir|aceptar|entendido/i.test(b.textContent)).map(b => b.textContent.trim()).slice(0, 4);
      avisos.push(`SE QUEDA ESPERANDO (30 s) al ${que}${abierto.length ? ' · botones a la vista: ' + abierto.join(', ') : ''} · modo ${g.mode}${g.ui.busy ? ' · ui ocupada' : ''}`);
      for (const b of document.querySelectorAll('button')) if (b.offsetParent && (/seguir|cerrar|continuar|vale|aceptar|entendido/i.test(b.textContent) || b.matches('.mg-overlay [data-close]'))) b.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    }
    return r;
  };
  const habla = async (M) => { junto(M.host); await conTope(g.talk(M.host), 'hablar con ' + (M.host?.name || 'el vecino')); tick(4); };
  const firma = (M) => [M.step, M.count, M.tstep || 0, M.done, M.prep, M.seqOk, M.fair?.pens?.filter(p => p.visto).length, M.cos?.fase, M.type === 'summit' ? JSON.stringify(g.P.bag) : ''].join('/');
  const esHost = (t, M) => t && M.host && Math.hypot(t.x - M.host.pos.x, t.z - M.host.pos.z) < 0.5;

  for (const M of g.missions) {
    const R = { tipo: M.type + (M.m.kind ? ':' + M.m.kind : '') + (M.night ? ':noche' : ''), titulo: M.title, ok: false };
    misiones.push(R);
    if (M.done) { R.ok = true; R.motivo = 'ya hecha'; continue; }
    if (SOLO && !SOLO.split(',').includes(M.type)) { R.aparte = true; R.motivo = 'no se ha probado (SOLO)'; continue; }
    console.log(`[bot] ${M.type} · ${M.title}`); const t0m = performance.now();
    if (!M.host) { R.motivo = 'sin vecino que la dé'; continue; }
    compruebaLlegar(M, M.host.pos.x, M.host.pos.z, 'el vecino que la da: ' + M.host.name);
    if (M.type === 'race' && M.m.kind === 'almadia') { R.aparte = true; R.motivo = 'almadía: tools/almadia-movil.mjs'; continue; }
    let quieto = 0, ultima = firma(M), vueltas = 0; M.__prep = 0;
    try {
      // (como mucho 6 minutos por misión: si no, una atascada paraba todo el recorrido; se apunta y se sigue)
      while (!M.done && vueltas++ < 90) {
        if (performance.now() - t0m > 360000) { avisos.push(`ATASCADA ${M.type}: 6 min sin acabar (paso ${M.step}, ${M.count ?? 0}/${M.need ?? '-'})`); break; }
        g.tracked = M.i;
        if (M.type === 'harvest' && g.recetaCosecha?.(M.m)) { R.aparte = true; R.motivo = 'cosecha con tractor: tools/cosecha-vehiculo.mjs'; break; }
        const t = g.target(M);
        if (M.type === 'summit' && M.step === 0 && M.prep) {
          if (t && !esHost(t, M)) { compruebaLlegar(M, t.x, t.z, 'provisiones'); ve(t.x + 0.5, t.z); await usaCerca((it) => it.kind === 'fountain' || (it.kind === 'walker' && it.a.stall)); tick(4); }
          else await habla(M);
          if (++M.__prep > 8 && !g.supplyOk()) { avisos.push('summit: las provisiones no se consiguen en la fuente o el puesto'); break; }
        }
        else if (M.step === 0 || esHost(t, M)) await habla(M);
        else if (M.type === 'carnival') {
          // (se busca por el oído: no hay flecha; se va a cada uno; de noche escapan y hay que alcanzarlos)
          if ((M.night && M.step === 1)) await habla(M);
          else for (const f of g.folk.filter(f => f.fm === M && !f.found)) { for (let k = 0; k < 40 && !f.found; k++) { ve(f.pos.x + 0.8, f.pos.z + 0.4); tick(2); } }
        } else if (M.type === 'legend') {
          if (M.step === 1) await habla(M);
          else if (M.step === 2) { const c = g.clues.find(k => k.M === M && !k.found); if (!c) { avisos.push('SIN GUÍA legend: no quedan pistas y no pasa al paso 3'); break; } compruebaLlegar(M, c.x, c.z, 'pista'); ve(c.x + 0.6, c.z); await usaCerca((it) => it.kind === 'clue'); }
          else if (M.step === 3) {
            compruebaLlegar(M, M.lair.x, M.lair.z, 'guarida');
            if (!M.creature?.shown) { ve(M.lair.x + 4, M.lair.z + 4); tick(6); await espera(3800); tick(4); }
            const a = M.creature; if (!a) { avisos.push('legend: la criatura no aparece en la guarida'); break; }
            for (let k = 0; k < 60 && !M.done && a.shown; k++) { ve(a.pos.x + 0.5, a.pos.z + 0.3); tick(2); if (!M.chase && a.shown && !M.done) { await usaCerca((it) => it.kind === 'creature'); } await espera(30); }
            await espera(1800);
          }
        } else if (M.type === 'herd' && g.herd) {
          // (por detrás de cada animal, hacia la puerta del redil)
          const T = (await import('/src/world/townBuilder.js')).TOWN.pen;
          const x0 = T.x - T.w / 2, x1 = T.x + T.w / 2, z0 = T.z - T.d / 2, z1 = T.z + T.d / 2;
          for (const s of g.herd.filter(s => !s.penned)) {
            for (let k = 0, t0h = performance.now(); k < 600 && !s.penned && performance.now() - t0h < 120000; k++) {
              // (como un pastor: si está delante de la puerta, hacia dentro; si no, primero delante de la puerta, rodeando el cercado)
              let tx, tz; const X = s.pos.x, Z = s.pos.z;
              if (X > x0 && X < x1 && Z > z0 && Z < z1 + 0.5) { tx = T.x; tz = T.z; }
              else if (Z > z1 + 0.5) { if (Math.abs(X - T.x) < 1.2) { tx = T.x; tz = T.z; } else { tx = T.x; tz = z1 + 3; } }
              else { const lado = X < T.x ? x0 - 4 : x1 + 4; if (Math.abs(X - lado) > 1.5) { tx = lado; tz = Z; } else { tx = lado; tz = z1 + 4; } }
              const dx = tx - X, dz = tz - Z, l = Math.hypot(dx, dz) || 1;
              P.place(X - dx / l * 1.6, Z - dz / l * 1.6, Math.atan2(dx, dz)); P.frozen = false; tick(3);
            }
            if (!s.penned) { avisos.push(`herd: un animal no entra al redil (queda en ${Math.round(s.pos.x)}, ${Math.round(s.pos.z)}; redil en ${Math.round(T.x)}, ${Math.round(T.z)}, puerta al sur)`); break; }
          }
          tick(3);
        } else if (M.type === 'dance' && M.step === 1) {
          const c = g.plazaStage(); compruebaLlegar(M, c.x, c.z, 'corro de baile'); ve(c.x, c.z); tick(3);
          if (g.mode === 'dance') { for (let k = 0; k < 2400 && g.dn; k++) { const D = g.dn; for (const n of D.notes) if (!n.done && Math.abs(D.t - n.t) < 0.04) g.dancePress(n.lane); tick(1); } await espera(1700); }
          else avisos.push('dance: en el corro no empieza el baile');
        } else if ((M.type === 'observe' || M.type === 'mirador') && M.step === 1) {
          if (M.type === 'mirador') { const v = g.miradorSpot(); if (!v) { avisos.push('mirador: el pueblo no tiene mirador'); break; } compruebaLlegar(M, v.x, v.z, 'mirador'); ve(v.x, v.z); }
          if (g.mode !== 'bino') g.toggleBinoculars();
          for (let k = 0; k < 30 && M.step === 1; k++) {
            let o = null;
            if (M.type === 'observe') { o = g.obsNearest(M); if (!o) { tick(10); continue; } }
            else { const obs = g.panoOn ? g.monteObs(g.pano.eye) : g.monteObs({ x: P.pos.x, y: P.pos.y + 1.55, z: P.pos.z }); o = obs.find(q => !q.seen); if (!o) break; }
            const eye = g.panoOn ? g.pano.eye : { x: P.pos.x, y: P.pos.y + 1.55, z: P.pos.z }, at = o.monte && o.pin && !o.pano ? o.pin.position : { x: o.pos.x, y: o.pos.y + (o.h || 0.5), z: o.pos.z };
            const dx = at.x - eye.x, dy = at.y - eye.y, dz = at.z - eye.z; g.binoYaw = Math.atan2(dx, dz); g.binoPitch = Math.atan2(dy, Math.hypot(dx, dz));
            tick(8); g.input.press('e'); tick(2); await espera(50);
          }
          if (g.mode === 'bino') g.toggleBinoculars();
          if (M.step === 1) avisos.push(`${M.type}: con los prismáticos no se completa (${M.count}/${M.need})`);
        } else if (t) {
          compruebaLlegar(M, t.x, t.z, 'objetivo del paso ' + M.step);
          ve(t.x + 0.4, t.z + 0.4); tick(4);
          await usaCerca();
          await espera(30); tick(4);
        } else {
          avisos.push(`SIN GUÍA ${M.type} paso ${M.step}: no hay flecha ni marca`);
          await habla(M);
        }
        await espera(20);
        // (si el juego está en una escena —la cima, la criatura que aparece, el baile, una ficha—, a que termine, hasta 2 min)
        for (let k = 0, t0e = performance.now(); k < 1000 && performance.now() - t0e < 120000 && (P.frozen || g.follow.cinematic || g.ui.busy || g.mode !== 'play'); k++) { tick(2); await espera(60); }
        const f = firma(M);
        if (f === ultima) { if (++quieto >= 6) { R.motivo = `atascada en el paso ${M.step} (${M.count}/${M.need ?? '-'})`; break; } } else { quieto = 0; ultima = f; }
      }
    } catch (e) { R.motivo = 'error: ' + String(e.message || e).slice(0, 160); }
    if (g.mode === 'bino') g.toggleBinoculars();
    if (M.done) { R.ok = true; delete R.motivo; } else if (!R.motivo) R.motivo = `sin terminar tras ${vueltas} intentos (paso ${M.step})`;
    R.paso = M.step; R.cuenta = `${M.count}/${M.need ?? '-'}`; R.seg = Math.round((performance.now() - t0m) / 1000);
    console.log(`[bot]   ${R.ok ? 'hecha' : 'NO: ' + R.motivo} (${R.seg} s)`);
  }
  return { misiones, avisos: [...new Set(avisos)], errBot: [...new Set(window.__botErr || [])].slice(0, 6), errJuego: [...new Set(window.__errors || [])].slice(0, 6) };
}
