// La carrera del tráiler v4 (22 nov 2026). El autor: «La idea es que el personaje tenga siempre el mismo plano, corriendo
// o andando, y vaya cambiando el escenario de atrás, de diferentes pueblos, diferentes misiones, diferentes personajes».
// Cada plano es el explorador andando o corriendo hacia la cámara, que va delante de él, de tres cuartos, siempre a la misma
// distancia y altura (sigue): así, al cortar de un plano a otro, él queda igual y solo cambia lo de detrás. Detrás, el vecino
// que da la misión (mirándole), la leyenda, el carnaval o lo más conocido del pueblo (su castillo, su puente, su plaza).
// Se rueda con rodar.mjs y PLANOS=./v4/carrera.mjs (las ayudas, las de planos-v4.mjs).
import { AYUDA as A4 } from './planos-v4.mjs';
export const FPS = 24;
const OT = 'otsagabia-ochagavia';

// el sitio de salida: desde el ancla (el vecino, la plaza, el castillo), a «lejos» metros (o el primero de una lista que
// valga) y «lado» metros a un costado, con el camino hacia la cámara libre y seco durante «largo» metros y sin cuestas
// fuertes, y con la cámara (delante y de lado, a un lado o al otro) sin nada entre ella y el explorador en todo el camino
// (rayos contra la escena: las murallas y los castillos no siempre están entre los obstáculos del juego); dir, hacia dónde va
const arranca = (U, est, A, o = {}) => {
  const libre = window.__colliders?.isFree || (() => true), THREE = U.THREE;
  const ok = (x, z, r = 0.7) => U.seco(x, z) && libre(x, z, r);
  const lejosL = [].concat(o.lejos ?? 2.4), lado = o.lado ?? 1.3, atras = o.atras ?? 0, ANG = o.ang ?? 0.42, D = o.D ?? 3.3;
  const lista = []; U.rt.scene.traverse((m) => { const g = m.geometry; if (m.visible && m.isMesh && !m.isSkinnedMesh && g?.attributes?.position?.array && (!g.index || g.index.array) && !(m.isInstancedMesh && (m.count > 400 || !m.instanceMatrix?.array)) && !(m.material && (m.material.transparent || m.material.depthWrite === false))) lista.push(m); });
  const rc = new THREE.Raycaster(), tapa = (a, b, mg = 0.5) => { const d = b.clone().sub(a), L = d.length(); if (L <= mg) return false; rc.set(a, d.multiplyScalar(1 / L)); rc.far = L - mg; return rc.intersectObjects(lista, false).length > 0; };
  const camDe = (x, z, dx, dz, ang) => { const ca = Math.cos(ang), sa = Math.sin(ang), fx = dx * ca - dz * sa, fz = dx * sa + dz * ca, cx = x + fx * D, cz = z + fz * D; return { cx, cz, fx, fz }; };
  let best = null;
  for (const [largo, cuesta] of [[o.largo ?? 12, o.cuesta ?? 2.5], [(o.largo ?? 12) * 0.6, 3.5], [4, 5]]) {
    const cands = [];
    for (const lejos of lejosL) for (let i = 0; i < 48; i++) for (const sg of [-1, 1]) {
      const a = (o.h ?? 0) + i * Math.PI * 2 / 48, dx = Math.sin(a), dz = Math.cos(a), px = dz, pz = -dx, ang = sg * ANG, ld = -sg * lado;
      const sx = A.x + dx * lejos + px * ld - dx * atras, sz = A.z + dz * lejos + pz * ld - dz * atras;
      let bien = ok(sx, sz), y0 = U.suelo(sx, sz), sube = 0;
      for (let s = 0; s <= largo + atras && bien; s += 1.2) { const x = sx + dx * s, z = sz + dz * s; if (!ok(x, z)) bien = false; sube = Math.max(sube, Math.abs(U.suelo(x, z) - y0)); }
      for (let s = 0; s <= largo + atras && bien; s += 2) { const c = camDe(sx + dx * s, sz + dz * s, dx, dz, ang); if (!ok(c.cx, c.cz, 0.45) || !ok((c.cx + sx + dx * s) / 2, (c.cz + sz + dz * s) / 2, 0.4)) bien = false; }
      if (!bien || sube > cuesta) continue;
      cands.push({ a, sx, sz, dx, dz, ang, largo, nota: -sube - (o.h != null ? Math.abs(Math.atan2(Math.sin(a - o.h), Math.cos(a - o.h))) * 0.6 : 0) - lejosL.indexOf(lejos) * 0.3 });
    }
    cands.sort((p, q) => q.nota - p.nota);
    for (const c of cands.slice(0, 24)) {
      let vale = true;
      for (const s of [0, c.largo * 0.5, c.largo + atras]) { const x = c.sx + c.dx * s, z = c.sz + c.dz * s, y = U.suelo(x, z), k = camDe(x, z, c.dx, c.dz, c.ang); if (tapa(U.v(k.cx, y + 1.05, k.cz), U.v(x, y + 0.8, z))) { vale = false; break; } }
      // (con un vecino detrás, que se le vea: ni una loma ni una casa entre la cámara y él, al salir y a mitad de camino)
      // (anclaY: a qué altura se mira, sobre el suelo o el agua; anclaMargen: lo que se deja sin mirar junto a él, para que no
      // cuente como tapado el propio puente o castillo)
      if (vale && o.verAncla) { const ya = Math.max(U.suelo(A.x, A.z), U.H.waterLevelAt?.(A.x, A.z) ?? -1e9) + (o.anclaY ?? 1.1);
        for (const s of [0, c.largo * 0.5]) { const x = c.sx + c.dx * s, z = c.sz + c.dz * s, y = U.suelo(x, z), k = camDe(x, z, c.dx, c.dz, c.ang); if (tapa(U.v(k.cx, y + 1.05, k.cz), U.v(A.x, ya, A.z), o.anclaMargen ?? 0.5)) { vale = false; break; } } }
      if (vale) { best = c; break; }
    }
    if (best) break;
  }
  if (!best) { const a = o.h ?? 0; best = { a, sx: A.x + Math.sin(a) * lejosL[0], sz: A.z + Math.cos(a) * lejosL[0], dx: Math.sin(a), dz: Math.cos(a), ang: ANG }; console.warn('arranca: sin sitio bueno'); }
  const P = U.G.player; P.place(best.sx, best.sz, best.a); P.obj.visible = true;
  est.dir = U.v(best.dx, 0, best.dz); est.ang = best.ang; est.D = D; est.paso = o.paso || 'andar';
  U.rt.follow.yaw = best.a + Math.PI; U.teclas(est.paso === 'correr' ? ['w', 'shift'] : ['w']);
  window.__ay.despeja(U, P.pos, o.despeja ?? 12, [...(o.deja || []), ...(est.mira ? [est.mira] : [])]);
  return best;
};
// la cámara de la carrera: delante del explorador, girada «ang» respecto a su camino, a D metros y a la altura de su pecho;
// la altura del suelo suavizada, para que la cámara no salte en los baches
const sigue = (U, est, t) => {
  const P = U.G.player, p = P.pos, d = est.dir, ang = est.ang, D = est.D;
  U.rt.follow.yaw = Math.atan2(d.x, d.z) + Math.PI;
  const ca = Math.cos(ang), sa = Math.sin(ang), fx = d.x * ca - d.z * sa, fz = d.x * sa + d.z * ca;
  const y = U.suelo(p.x, p.z); est.yS = est.yS == null ? y : est.yS + (y - est.yS) * 0.25;
  const cx = p.x + fx * D, cz = p.z + fz * D, cy = Math.max(U.suelo(cx, cz) + 0.5, est.yS + 1.05);
  U.cam(U.v(cx, cy, cz), U.v(p.x, est.yS + 0.76, p.z), 40);
  if (est.mira) window.__ay.cara(U, est.mira, p.x, p.z);
  // (los que le siguen, siempre detrás de él: si se le echan encima, se quedan a 1,8 m, sin taparle nunca)
  for (const a of est.detras || []) { const dx = a.pos.x - p.x, dz = a.pos.z - p.z, al = dx * d.x + dz * d.z; if (al > -1.8) { a.pos.x -= d.x * (al + 1.8); a.pos.z -= d.z * (al + 1.8); a.obj?.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z); } }
};
export const AYUDA = eval(`() => { (${A4.toString()})(); Object.assign(window.__ay, { arranca: ${arranca.toString()}, sigue: ${sigue.toString()} }); }`);

const cuadro = (t, U, est) => window.__ay.sigue(U, est, t);
// con un vecino (o una leyenda) detrás, mirándole
const conVecino = (quien, hora, seg, o = {}) => ({
  pueblo: o.pueblo || OT, hora, tiempo: o.tiempo || 'clear', seg, fps: 12, antes: 8,
  prep: eval(`(U, est) => {
    const a = U.G.npcs?.${quien}; if (!a) throw new Error('sin ${quien}');
    window.__ay.limpia(U); window.__ay.posa(U, a); est.mira = a;
    window.__ay.arranca(U, est, a.pos, ${JSON.stringify({ verAncla: true, ...o.ar, deja: undefined })});
    ${o.prep || ''}
    est.fog = ${JSON.stringify(o.fog || [90, 1100])};
  }`),
  cuadro,
});
// por un sitio del pueblo: la plaza o lo más conocido (castillo, puente, murallas, casa torre, palacio, quiosco)
const porPueblo = (pueblo, hora, seg, o = {}) => ({
  pueblo, hora, tiempo: o.tiempo || 'clear', seg, fps: 12, antes: 8,
  prep: eval(`(U, est) => {
    const L = window.__layout, pl = L.PLACES.plaza, lms = L.PLACES.landmarks || [];
    let lm = null; for (const k of ${JSON.stringify(o.lugar || ['castle', 'bridge', 'walls', 'towerhouse', 'palace', 'kiosk'])}) { lm = lms.find(l => l.kind === k); if (lm) break; }
    // (el puente: sale corriendo de su extremo, a lo largo de él, con el puente entero detrás; desde lejos, la orilla lo tapaba)
    let extra = {};
    if (lm && lm.kind === 'bridge' && (L.BRIDGES || []).length) { const B = L.BRIDGES.slice().sort((a, b) => (b.xb - b.xa) - (a.xb - a.xa))[0]; lm = { x: B.xb + 1.5, z: B.z }; extra = { h: Math.PI / 2, lejos: [1, 4, 8] }; }
    // (un puente que es una maqueta aparte, como el románico de Puente la Reina: desde la orilla, con el puente a la vista)
    else if (lm && lm.kind === 'bridge') extra = { verAncla: true, anclaY: 3, anclaMargen: 9, lejos: [18, 24, 30, 38] };
    lm ||= pl; window.__ay.limpia(U);
    window.__ay.arranca(U, est, lm, { ...${JSON.stringify({ lejos: [16, 24, 34], lado: 0, paso: 'correr', largo: 10, atras: 3 })}, ...extra, ...${JSON.stringify(o.ar || {})} });
    ${o.prep || ''}
    est.fog = ${JSON.stringify(o.fog || [140, 1600])};
  }`),
  cuadro,
});

export const PLANOS = {
  // ---------- Otsagabia: andando, y detrás cada vecino que te pide ayuda ----------
  cMaite: conVecino('maite', 10.8, 3.6),
  cItziar: conVecino('itziar', 11.4, 3.8),
  cJoxemari: conVecino('joxemari', 9.6, 3.8, { ar: { lejos: 3 }, prep: `const p = est.mira.pos, fl = (U.rt.fauna?.flock || []).filter(o => o.pos).slice(0, 16); fl.forEach((o, i) => { const ang = i * 0.39, r = 2.2 + (i % 4) * 1.3, x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r; o.pos.x = x; o.pos.z = z; o.obj?.position.set(x, U.suelo(x, z), z); });` }),
  cKike: conVecino('kike', 17.2, 3.8),
  cJoseba: conVecino('inaki', 11.0, 3.8),
  cLamia: conVecino('lamia', 17.6, 3.8, { fog: [60, 900] }),
  cBasajaun: conVecino('basajaun', 19.2, 5.8, { tiempo: 'niebla', fog: [8, 160], ar: { lejos: 3.2, lado: 1.6 } }),
  cBobo: conVecino('bobo', 11.6, 3.8),
  cRio: porPueblo(OT, 10.6, 3.2, { lugar: ['bridge'], ar: { lejos: 10, paso: 'andar', atras: 0, largo: 8 }, fog: [90, 1100] }),
  cPlaza: porPueblo(OT, 10.2, 3.0, { lugar: ['kiosk', 'fountain'], ar: { lejos: 6, paso: 'andar', atras: 0, largo: 8 }, fog: [90, 1100] }),
  // en el golpe de la música echa a correr: el valle de Salazar detrás, al atardecer
  cValle: porPueblo(OT, 18.4, 3.9, { lugar: ['church'], ar: { lejos: 40, paso: 'correr', largo: 22, atras: 4 }, fog: [140, 1500] }),

  // ---------- corriendo por Navarra: un pueblo, una misión o una leyenda en cada corte ----------
  cPamplona: porPueblo('pamplona', 11.4, 1.3, { lugar: ['kiosk'] }),
  cPuente: porPueblo('puente-la-reina', 17.8, 1.3, { lugar: ['bridge'] }),
  cEstella: porPueblo('estella', 11.8, 1.3),
  cJavier: porPueblo('javier', 18.4, 1.3, { lugar: ['castle'] }),
  cOlite: porPueblo('olite', 18.3, 1.3, { lugar: ['castle'] }),
  cTudela: porPueblo('tudela', 12.0, 1.3),
  cElizondo: porPueblo('elizondo', 11.2, 1.3),
  cIsaba: porPueblo('isaba-izaba', 11.0, 1.3),
  // el pastoreo: entre las ovejas
  cOvejas: {
    pueblo: OT, hora: 9.4, tiempo: 'clear', seg: 1.3, fps: 12, antes: 8,
    prep: (U, est) => {
      const fl = (U.rt.fauna?.flock || []).filter(a => a.pos);
      const c = fl.length ? fl.reduce((s, a) => s.add(U.v(a.pos.x, 0, a.pos.z)), U.v(0, 0, 0)).multiplyScalar(1 / fl.length) : U.G.player.pos.clone();
      window.__ay.limpia(U); const b = window.__ay.arranca(U, est, { x: c.x, z: c.z }, { lejos: 0, lado: 0, paso: 'correr', largo: 10, atras: 3 });
      fl.slice(0, 22).forEach((a, i) => { const f = -3 - (i % 6) * 1.6, s = ((i % 5) - 2) * 1.5; a.pos.x = b.sx + b.dx * f - b.dz * s; a.pos.z = b.sz + b.dz * f + b.dx * s; a.obj?.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z); });
      est.fog = [60, 900];
    },
    cuadro,
  },
  // el carnaval de Ituren: los joaldunak detrás, con sus cencerros
  cJoaldunak: {
    pueblo: 'ituren', hora: 11.0, tiempo: 'clear', seg: 1.4, fps: 12, antes: 10,
    prep: (U, est) => {
      window.__ay.limpia(U); const f = window.__ay.carnaval(U, est) && est.folk; const pl = window.__layout.PLACES.plaza;
      window.__ay.arranca(U, est, pl, { lejos: 5, lado: 0, paso: 'correr', largo: 9, atras: 2, deja: f });
      // (los joaldunak, en dos filas detrás de él, mirando hacia donde va)
      const d = est.dir, P = U.G.player.pos; (f || []).forEach((a, i) => { const fila = Math.floor(i / 3), x = P.x - d.x * (3 + fila * 2.2) + d.z * ((i % 3) - 1) * 1.6, z = P.z - d.z * (3 + fila * 2.2) - d.x * ((i % 3) - 1) * 1.6; window.__ay.posa(U, a, x, z, Math.atan2(d.x, d.z)); a.frozen = false; a.goTo?.({ x: x + d.x * 25, z: z + d.z * 25 }); });
      est.fog = [90, 1100];
    },
    cuadro,
  },
  // la leyenda de noche en Altsasu: la manada de momotxorros baila en la plaza y siete salen corriendo detrás de él, con
  // sus chispas (los demás se quedan bailando alrededor del kiosco)
  cMomotxorros: {
    pueblo: 'altsasu-alsasua', hora: 20.3, tiempo: 'clear', seg: 1.4, fps: 12, antes: 10,
    prep: (U, est) => {
      const G = U.G; window.__ay.limpia(U); G.manadaMomotxorros(); const D = G.desfileOn, C = D.C;
      for (const a of D.gente) { const s = a.sitio; a.oculto = false; a.obj.visible = true; a.pos.x = s.x; a.pos.z = s.z; a.state = 'idle'; a.target = null; a.path = null; a.goal = null; a.arrived = false; a.enSitio = true; a.heading = a.h0 = Math.atan2(C.x - s.x, C.z - s.z); }
      D.t = 4; D.fase = 'baile'; D.baile = 4; D.mirado = -1e9;
      window.__ay.arranca(U, est, C, { lejos: [10, 13, 16], lado: 0, paso: 'correr', largo: 9, deja: D.gente });
      const P = U.G.player.pos, d = est.dir, dist = (a) => Math.hypot(a.pos.x - P.x, a.pos.z - P.z);
      const caza = D.gente.slice().sort((p, q) => dist(p) - dist(q)).slice(0, 7);
      D.fase = 'van'; D.van = D.t;
      for (const a of D.gente) { a.irse = 1e9; a.limite = 1e9; }
      caza.forEach((a, i) => {
        const f = 2.4 + (i % 3) * 1.5 + Math.floor(i / 3) * 1.3, l = ((i % 3) - 1) * 1.6 + (i >= 3 ? 0.8 : 0);
        a.pos.x = P.x - d.x * f + d.z * l; a.pos.z = P.z - d.z * f - d.x * l; a.obj.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z);
        a.enSitio = false; a.dance = 0; a.alto = null; a.walkSpeed = 1.45; a.heading = Math.atan2(d.x, d.z);
        a.goTo({ x: P.x + d.x * 30 + d.z * l, z: P.z + d.z * 30 - d.x * l, run: true });
      });
      est.detras = caza; est.fog = [40, 600];
    },
    cuadro,
  },
  // la naturaleza: corriendo entre las hayas de Irati (hacia +z desde la salida está el hayedo)
  cIrati: {
    pueblo: 'selva-irati', hora: 10.4, tiempo: 'clear', seg: 3.9, fps: 12, antes: 8,
    prep: (U, est) => { const p = U.G.player.pos; window.__ay.limpia(U); window.__ay.arranca(U, est, { x: p.x, z: p.z + 24 }, { lejos: 0, lado: 0, paso: 'correr', largo: 18, h: 0 }); est.fog = [40, 700]; },
    cuadro,
  },
};
