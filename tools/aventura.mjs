// Prueba automática de la aventura de un pueblo (game/townAventura.js y actors/player.js): que se monta (atalaya,
// kutxas y montura), que nadar, planear, trepar y caer hacen lo que deben con el anillo y los corazones, que se monta y
// se baja de la montura, que abrir una kutxa y subir a la atalaya se guardan en el perfil sin tocar lo demás, y que no
// hay errores. Mueve al jugador con su propio código, sin esperar al dibujo. Deja capturas de cada cosa.
//   node tools/aventura.mjs <carpeta> [pueblo] [calidad]   (BASE: por defecto vite, http://127.0.0.1:5173/)
// Acaba con código 1 si alguna comprobación falla.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const [, , out = 'entrega/aventura', town = 'lesaka', q = 'low'] = process.argv; mkdirSync(out, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/favicon|404|AudioContext/.test(m.text())) errs.push('consola: ' + m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pastor', xp: 77, cards: ['prueba'], seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`${BASE}?town=${town}&q=${q}&weather=clear&skipintro=1&t=12&debug`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
await p.waitForFunction(() => window.__game.av, null, { timeout: 120000 });
await p.waitForTimeout(2500);
const R = {}, foto = async (n) => { await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/${n}.jpg`, quality: 84 }); };
// lo común a las pruebas: un mando de mentira y dar pasos sin dibujar
await p.evaluate(() => {
  const G = window.__game, P = G.player;
  window.__inp = { move: { x: 0, y: 1 }, run: false, salta: false, consume(k) { if (k === ' ' && this.salta) { this.salta = false; return true; } return false; } };
  window.__pasos = (n, yaw, cada) => { for (let i = 0; i < n; i++) { if (cada && cada(i) === false) return i; P.update(1 / 30, window.__inp, yaw); } return n; };
  window.__mira = (x, z, d = 6, alto = 3) => { const F = G.follow; F.yaw = Math.atan2(P.pos.x - x, P.pos.z - z) + Math.PI; };
  P.frozen = false;
});
R.montaje = await p.evaluate(() => { const A = window.__game.av; return { atalaya: !!A.atalaya, kutxas: A.kutxas.length, montura: A.montura?.tipo || null, corazones: [A.cor, A.corMax], anillo: window.__game.player.aguanteMax }; });
// nadar: desde una orilla por la que se pueda entrar andando (hay tramos de río entre muros), hacia dentro
R.nadar = await p.evaluate(() => {
  const G = window.__game, P = G.player, hf = window.__hf, L = window.__layout, pl = L.PLACES.plaza, hondos = [];
  for (let x = -400; x <= 400; x += 6) for (let z = -400; z <= 400; z += 6) if (hf.waterLevelAt(x, z) - hf.groundHeight(x, z) > 1.3 && !hf.bridgeAt(x, z)) hondos.push({ x, z, d: Math.hypot(x - pl.x, z - pl.z) });
  if (!hondos.length) return { agua: false };
  hondos.sort((a, b) => a.d - b.d); window.__inp.move.x = 0; window.__inp.move.y = 1;
  for (let k = 0, probados = 0; k < hondos.length && probados < 30; k += Math.max(1, Math.floor(hondos.length / 30)), probados++) {
    const h = hondos[k];
    for (const a of [0, 1.57, 3.14, 4.71]) {
      // la orilla en esa dirección: desde el agua hasta pisar seco, y un par de metros más
      let ox = h.x, oz = h.z, n = 0; const dx = Math.sin(a), dz = Math.cos(a);
      while (n < 60 && hf.waterLevelAt(ox, oz) - hf.groundHeight(ox, oz) > -0.2) { ox += dx * 0.5; oz += dz * 0.5; n++; }
      if (n >= 60) continue;
      P.place(ox + dx * 1.5, oz + dz * 1.5, 0); P.aguante = P.aguanteMax; P.agotado = false;
      const yaw = Math.atan2(P.pos.x - h.x, P.pos.z - h.z); let nado = 0;
      window.__pasos(200, yaw, () => { if (P.modo === 'nada') nado++; return nado < 45; });
      if (nado >= 45) return { agua: true, intentos: probados + 1, pasosNadando: nado, medio: { modo: P.modo, aguante: +P.aguante.toFixed(2), y: +(P.pos.y - hf.waterLevelAt(P.pos.x, P.pos.z)).toFixed(2) } };
    }
  }
  return { agua: true, pasosNadando: 0, medio: { modo: P.modo, aguante: P.aguante }, nota: 'no se encontró una orilla por la que entrar' };
});
if (R.nadar.agua) {
  await foto('1-nadar');
  R.nadar.fin = await p.evaluate(() => {
    const G = window.__game, P = G.player, hf = window.__hf; let rescate = 0; const antes = P.onRescate; P.onRescate = (...a) => { rescate++; antes?.(...a); };
    // quieto en el agua hasta que se acabe el anillo: tiene que devolverlo a la orilla
    window.__inp.move.y = 0; window.__pasos(900, 0, () => rescate === 0);
    P.onRescate = antes; window.__inp.move.y = 1;
    return { rescates: rescate, modo: P.modo, enSeco: hf.waterLevelAt(P.pos.x, P.pos.z) - hf.groundHeight(P.pos.x, P.pos.z) < 0.4, aguante: +P.aguante.toFixed(2) };
  });
}
// planear y caer: desde 14 m sobre la plaza, primero con la capa y luego sin ella
R.planear = await p.evaluate(() => {
  const G = window.__game, P = G.player, hf = window.__hf, L = window.__layout, A = G.av, s = G.spot({ x: L.PLACES.plaza.x, z: L.PLACES.plaza.z }, 8) || L.PLACES.plaza;
  P.place(s.x, s.z, 0); P.aguante = P.aguanteMax; P.agotado = false; A.cor = A.corMax;
  P.pos.y += 14; P.grounded = false; P.vy = 0; P.aire = 0; window.__inp.move.y = 0;
  window.__pasos(10, 0); window.__inp.salta = true; window.__pasos(3, 0);
  const abierto = P.modo === 'planea', vy = +P.vy.toFixed(2); window.__pasos(20, 0);
  return { abierto, vy, vyLuego: +P.vy.toFixed(2), capa: !!A.capa?.mesh.visible, alto: +(P.pos.y - hf.groundHeight(P.pos.x, P.pos.z)).toFixed(1) };
});
await foto('2-planear');
R.planear.fin = await p.evaluate(() => { const G = window.__game, P = G.player, A = G.av; const n = window.__pasos(600, 0, () => !P.grounded); return { pasos: n, modo: P.modo, corazones: A.cor, gastado: +(P.aguanteMax - P.aguante).toFixed(2) }; });
R.caer = await p.evaluate(() => {
  const G = window.__game, P = G.player, A = G.av; A.cor = A.corMax; P.aguante = P.aguanteMax;
  P.pos.y += 14; P.grounded = false; P.vy = 0; P.aire = 0; window.__pasos(400, 0, () => !P.grounded);
  return { corazones: A.cor, de: A.corMax };
});
await foto('3-caida-corazones');
// trepar: la cuesta más fuerte que se pueda atacar desde abajo, cerca del pueblo
R.trepar = await p.evaluate(() => {
  const G = window.__game, P = G.player, hf = window.__hf, C = window.__colliders, L = window.__layout, pl = L.PLACES.plaza; let best = null, bs = 0;
  for (let x = pl.x - 300; x <= pl.x + 300; x += 4) for (let z = pl.z - 300; z <= pl.z + 300; z += 4) {
    const gx = (hf.groundHeight(x + 1, z) - hf.groundHeight(x - 1, z)) / 2, gz = (hf.groundHeight(x, z + 1) - hf.groundHeight(x, z - 1)) / 2, s = Math.hypot(gx, gz);
    if (s < 1.5 || s > 4 || hf.waterLevelAt(x, z) > hf.groundHeight(x, z)) continue;
    const bx = x - gx / s * 5, bz = z - gz / s * 5;   // el pie de la cuesta
    if (!C.isFree(bx, bz, 0.6) || hf.waterLevelAt(bx, bz) > hf.groundHeight(bx, bz) || P.cuesta(bx, bz) > 1.0) continue;
    if (s > bs) { bs = s; best = { x, z, bx, bz, gx, gz, s }; }
  }
  if (!best) return { cuesta: false };
  P.place(best.bx, best.bz, 0); P.aguante = P.aguanteMax; P.agotado = false; window.__inp.move.y = 1; window.__inp.move.x = 0;
  const yaw = Math.atan2(best.bx - best.x, best.bz - best.z), y0 = P.pos.y; let trepa = 0, resbala = 0;
  window.__pasos(90, yaw, () => { if (P.modo === 'trepa') trepa++; });
  const medio = { modo: P.modo, sube: +(P.pos.y - y0).toFixed(1), aguante: +P.aguante.toFixed(2) };
  window.__trepa = { yaw };
  return { cuesta: true, pendiente: +best.s.toFixed(2), pasosTrepando: trepa, medio };
});
if (R.trepar.cuesta) {
  await foto('4-trepar');
  R.trepar.fin = await p.evaluate(() => { const P = window.__game.player; let res = 0, tre = 0; window.__pasos(700, window.__trepa.yaw, () => { if (P.modo === 'resbala') res++; if (P.modo === 'trepa') tre++; }); return { pasosTrepando: tre, pasosResbalando: res, modo: P.modo, aguante: +P.aguante.toFixed(2) }; });
}
// la montura: subir, andar y bajar
R.montura = await p.evaluate(() => {
  const G = window.__game, P = G.player, A = G.av, M = A.montura; if (!M) return { hay: false };
  P.place(M.x + 1.5, M.z, 0); const acc = []; G.aventuraAcciones(acc, () => true);
  const ofrece = acc.some(a => a.kind === 'montar'); G.aventuraActua({ kind: 'montar' });
  const subido = P.vehiculo === M, x0 = M.x, z0 = M.z; window.__inp.move.y = 1; window.__inp.move.x = 0; window.__inp.run = true;
  for (let i = 0; i < 90; i++) P.update(1 / 30, window.__inp, G.follow.yaw);
  const anduvo = +Math.hypot(M.x - x0, M.z - z0).toFixed(1), vel = +M.speed.toFixed(1); window.__inp.run = false;
  return { hay: true, tipo: M.tipo, ofrece, subido, anduvo, vel };
});
if (R.montura.hay) { await foto('5-montura'); R.montura.fin = await p.evaluate(() => { const G = window.__game, P = G.player; G.aventuraActua({ kind: 'desmontar' }); return { bajado: !P.vehiculo, visible: P.obj.visible }; }); }
// la atalaya y una kutxa, y lo que queda guardado
R.atalaya = await p.evaluate(() => {
  const G = window.__game, P = G.player, A = G.av, T = A.atalaya; if (!T) return { hay: false };
  P.place(T.x + 2.5, T.z + 2.5, 0); G.follow.snap?.(P); const acc = []; G.aventuraAcciones(acc, () => true);
  const ofrece = acc.find(a => a.kind === 'atalaya')?.label; G.aventuraActua({ kind: 'atalaya' });
  const m = []; G.aventuraMarcas(m);
  return { hay: true, ofrece, vista: T.vista, enMapa: m.length, dist: Math.round(Math.hypot(T.x - window.__layout.PLACES.plaza.x, T.z - window.__layout.PLACES.plaza.z)) };
});
await foto('6-atalaya');
R.kutxa = await p.evaluate(() => {
  const G = window.__game, P = G.player, A = G.av, k = A.kutxas[0]; if (!k) return { hay: false };
  P.place(k.x + 1.2, k.z + 0.6, 0); G.follow.snap?.(P); const acc = []; G.aventuraAcciones(acc, () => true);
  return { hay: true, ofrece: acc.some(a => a.kind === 'kutxa' && a.k === k) };
});
await foto('7-kutxa');
R.kutxa.fin = await p.evaluate(() => {
  const G = window.__game, A = G.av, k = A.kutxas[0]; G.aventuraActua({ kind: 'kutxa', k });
  const S = JSON.parse(localStorage.getItem('herrizherri-perfil-v1')), id = G.def.id;
  return { abierta: k.abierta, guardado: { atalaya: !!S.aventura?.atalayas?.[id], kutxas: S.aventura?.kutxas?.[id] || [], pistas: Object.keys(S.aventura?.pistas || {}) }, loDemas: { v: S.v, name: S.name, avatar: S.avatar, carta: (S.cards || []).includes('prueba'), xpSube: S.xp >= 77 } };
});
R.errores = errs;
// qué tiene que cumplirse
const F = [];
const pide = (ok, que) => { if (!ok) F.push(que); };
pide(R.montaje.atalaya && R.montaje.kutxas === 5, 'se montan la atalaya y cinco kutxas');
if (R.nadar.agua) { pide(R.nadar.pasosNadando > 20 && R.nadar.medio.aguante < 1, 'en agua honda se nada y gasta anillo'); pide(R.nadar.fin.rescates === 1 && R.nadar.fin.enSeco, 'sin anillo en el agua, vuelve a la orilla'); }
pide(R.planear.abierto && R.planear.vyLuego >= -1.75 && R.planear.capa, 'saltar en el aire abre la capa y se baja despacio');
pide(R.planear.fin.modo === 'pie' && R.planear.fin.corazones === R.montaje.corazones[1] && R.planear.fin.gastado > 0, 'planeando se llega al suelo sin golpe y gasta anillo');
pide(R.caer.corazones === R.caer.de - 1, 'una caída de 14 m sin capa quita un corazón');
if (R.trepar.cuesta) { pide(R.trepar.pasosTrepando + R.trepar.fin.pasosTrepando > 10 && R.trepar.medio.sube > 0.8, 'contra una cuesta fuerte, trepa y sube'); pide(R.trepar.fin.modo !== 'trepa' || R.trepar.fin.aguante > 0, 'trepando no se queda colgado sin anillo'); }
if (R.montura.hay) { pide(R.montura.ofrece && R.montura.subido && R.montura.anduvo > 3, 'se monta y la montura anda'); pide(R.montura.fin.bajado && R.montura.fin.visible, 'se baja de la montura'); }
if (R.atalaya.hay) pide(R.atalaya.vista && R.atalaya.enMapa >= 2, 'la atalaya se descubre y enseña las kutxas en el mapa');
if (R.kutxa.hay) pide(R.kutxa.ofrece && R.kutxa.fin.abierta && R.kutxa.fin.guardado.kutxas.length === 1, 'la kutxa se abre y se guarda');
pide(R.kutxa.fin?.loDemas?.v === 1 && R.kutxa.fin.loDemas.name === 'Ane' && R.kutxa.fin.loDemas.carta && R.kutxa.fin.loDemas.xpSube, 'el resto del perfil guardado sigue intacto');
pide(!errs.length, 'sin errores');
R.fallan = F; writeFileSync(`${out}/aventura-${town}.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1)); console.log(F.length ? 'FALLA: ' + F.join(' | ') : 'PASA');
await b.close(); process.exit(F.length ? 1 : 0);
