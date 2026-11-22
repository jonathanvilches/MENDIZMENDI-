// Los planos del tráiler v4 (22 nov 2026), que rueda tools/trailer/rodar.mjs con PLANOS=./v4/planos-v4.mjs. El autor:
// «Quiero que metas imágenes reales del juego, jugando, haciendo misiones, escogiendo un pelotari, hablando en euskera,
// viendo animales, con el basajaun, con la lamia, con los momochorros, con los yoaldunak» y «no metas personajes o fotos de
// personajes cortados». Por eso cada vecino sale con el explorador delante, los dos de cuerpo entero (plano de dos, de lado),
// y a la izquierda queda sitio para su frase; v4Mision va con la interfaz del juego encima (P.ui) y su cámara (est.juego).
// Los planos que ya estaban (el vuelo, el río, el explorador que llega, el valle) vienen de v3/planos-v3.mjs.
import { PLANOS as P3, AYUDA as A3 } from '../v3/planos-v3.mjs';
export const FPS = 24;
const OT = 'otsagabia-ochagavia';

// (las ayudas nuevas, que van a la página como texto: rodar.mjs, AYUDA; sin nada de fuera de su propia función)
// el plano de dos: la cámara de lado a la pareja (a, el vecino; b, el explorador), a d metros, con los dos a la derecha del
// cuadro (der, en metros) para que la frase quepa a la izquierda; acerca, cuánto se acerca; giro, cuánto da la vuelta
const dos = (U, A, B, t, seg, o = {}) => {
  const a = A.pos, b = B.pos, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, y = Math.min(U.suelo(a.x, a.z), U.suelo(b.x, b.z));
  let ux = b.x - a.x, uz = b.z - a.z; const L = Math.hypot(ux, uz) || 1; ux /= L; uz /= L;
  const k = t / seg, g = (o.giro || 0) * (k - 0.5), s = o.lado ?? 1, c = Math.cos(g), si = Math.sin(g);
  const n0x = -uz * s, n0z = ux * s, nx = n0x * c - n0z * si, nz = n0x * si + n0z * c;
  const d = (o.d ?? 4.4) - (o.acerca || 0) * U.ease(k), off = o.off || 0;
  const cx = mx + nx * d + ux * off, cz = mz + nz * d + uz * off;
  const fx = mx - cx, fz = mz - cz, fl = Math.hypot(fx, fz) || 1, rx = -fz / fl, rz = fx / fl, der = o.der ?? 0.7;
  const yc = Math.max(U.suelo(cx, cz) + 0.45, y + (o.alto ?? 1.2) + (o.sube || 0) * U.ease(k));
  U.cam(U.v(cx, yc, cz), U.v(mx - rx * der, y + (o.mira ?? 0.95), mz - rz * der), o.fov ?? 40);
};
// que el vecino mire al explorador (y no gire solo)
const cara = (U, A, x, z) => { const p = A.pos, h = Math.atan2(x - p.x, z - p.z); A.heading = h; A.mira = { x, z }; A.dance = 0; if (A.obj) A.obj.rotation.y = h; };
// la pareja: el vecino quieto y el explorador delante de él, a sep metros, en suelo seco y llano; fuera los que pasean
const pareja = (U, est, a, o = {}) => {
  const ay = window.__ay; ay.limpia(U); ay.posa(U, a); const p = a.pos, sep = o.sep ?? 1.5, h0 = o.h ?? a.heading ?? 0; let best = null;
  for (let i = 0; i < 24 && !best; i++) {
    const h = h0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.27, x = p.x + Math.sin(h) * sep, z = p.z + Math.cos(h) * sep;
    if (U.seco(x, z) && Math.abs(U.suelo(x, z) - U.suelo(p.x, p.z)) < 0.3) best = { x, z, h };
  }
  best ||= { x: p.x + Math.sin(h0) * sep, z: p.z + Math.cos(h0) * sep, h: h0 };
  const P = U.G.player, ex = o.llega || 0;
  P.place(best.x + Math.sin(best.h) * ex, best.z + Math.cos(best.h) * ex, best.h + Math.PI); P.obj.visible = true;
  est.fin = { x: best.x, z: best.z }; est.h = best.h;
  if (ex) { U.rt.follow.yaw = best.h; U.teclas(['w']); }
  ay.despeja(U, p, 14, [a]); est.a = a; est.b = P;
  return a;
};
// cada fotograma de un plano de dos: el explorador para al llegar, los dos se miran y la cámara, de lado
const charla = (U, est, t, seg, o) => {
  const P = U.G.player;
  if (est.fin && U.G.input.keys.size && Math.hypot(P.pos.x - est.fin.x, P.pos.z - est.fin.z) < 0.25) { U.teclas([]); }
  if (!U.G.input.keys.size) { const a = est.a.pos; P.heading = Math.atan2(a.x - P.pos.x, a.z - P.pos.z); if (P.obj) P.obj.rotation.y = P.heading; }
  window.__ay.cara(U, est.a, P.pos.x, P.pos.z);
  window.__ay.dos(U, est.a, { pos: est.fin || P.pos }, t, seg, o);
};
// fuera el caballo propio y los vehículos sueltos (el tractor y la bici de la entrada): se colaban delante de la cámara
const limpia = (U) => {
  const G = U.G; for (const V of G.av?.vehs || []) { try { V.dispose(); } catch (e) { } } if (G.av) G.av.vehs = [];
  if (G.montura && !G.player.vehiculo) { try { G.montura.dispose?.(); } catch (e) { } G.montura = null; } G.sinMontura = true;
};
export const AYUDA = eval(`() => { (${A3.toString()})(); Object.assign(window.__ay, { dos: ${dos.toString()}, cara: ${cara.toString()}, pareja: ${pareja.toString()}, charla: ${charla.toString()}, limpia: ${limpia.toString()} }); }`);

// un plano de dos con un vecino de Otsagabia: quien, la hora y cómo va la cámara
const vecino = (quien, hora, seg, o = {}, extra = {}) => ({
  pueblo: OT, hora, tiempo: o.tiempo || 'clear', seg, fps: 12, antes: 30,
  prep: eval(`(U, est) => { const a = U.G.npcs?.${quien}; if (!a) throw new Error('sin ${quien}'); window.__ay.pareja(U, est, a, ${JSON.stringify(o.par || {})}); est.fog = ${JSON.stringify(o.fog || [90, 1100])}; ${extra.prep || ''} }`),
  cuadro: eval(`(t, U, est) => window.__ay.charla(U, est, t, ${seg}, ${JSON.stringify(o.cam || {})})`),
});

export const PLANOS = {
  otVuelo: P3.otVuelo, otRio: P3.otRio, otExplora: P3.otExplora, otValle: P3.otValle,
  // ---------- los vecinos, cada uno con el explorador delante ----------
  v4Maite: vecino('maite', 10.8, 3.6, { par: { sep: 1.5, llega: 2.4 }, cam: { d: 4.8, acerca: 0.5, der: 0.8, giro: 0.18, lado: -1 } }),
  v4Itziar: vecino('itziar', 11.4, 3.8, { cam: { d: 4.6, acerca: 0.4, der: 0.8, giro: -0.2, lado: -1 } }),
  v4Joxemari: vecino('joxemari', 9.6, 3.8, { par: { sep: 1.7 }, cam: { d: 6.2, acerca: 0.6, der: 1.1, alto: 1.6, giro: 0.22 } }, {
    // (sus ovejas alrededor de los dos, como en su misión)
    prep: `const p = est.a.pos, fl = (U.rt.fauna?.flock || []).filter(o => o.pos).slice(0, 16); fl.forEach((o, i) => { const ang = 0.4 + i * 0.39, r = 2.8 + (i % 4) * 1.4, x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r; o.pos.x = x; o.pos.z = z; o.obj?.position.set(x, U.suelo(x, z), z); });`,
  }),
  v4Kike: vecino('kike', 17.2, 3.8, { cam: { d: 4.4, acerca: 0.4, der: 0.75, giro: 0.2 } }),
  v4Joseba: vecino('inaki', 11.0, 3.8, { cam: { d: 4.6, acerca: 0.4, der: 0.8, giro: -0.2, lado: -1 } }),
  v4Lamia: vecino('lamia', 17.6, 3.8, { par: { sep: 2.0 }, fog: [60, 900], cam: { d: 5.0, acerca: 0.6, der: 0.9, alto: 1.4, giro: 0.25, lado: -1 } }),
  // el Basajaun, enorme, y el explorador, pequeño, entre la niebla: la cámara baja, mirándole desde abajo
  v4Basajaun: vecino('basajaun', 19.2, 5.8, { tiempo: 'niebla', fog: [8, 160], par: { sep: 2.4 }, cam: { d: 7.4, acerca: 1.4, der: 0.9, alto: 0.55, mira: 1.55, sube: 0.4, giro: 0.3, fov: 44 } }),
  v4Bobo: vecino('bobo', 11.6, 3.8, { cam: { d: 4.4, acerca: 0.4, der: 0.75, giro: 0.2 } }),

  // ---------- jugando: una misión con la interfaz del juego, la cámara del juego detrás del explorador que corre ----------
  v4Mision: {
    pueblo: OT, hora: 10.6, tiempo: 'clear', seg: 4.5, fps: 12, antes: 96, ui: true,
    prep: (U, est) => {
      const pl = window.__layout.PLACES.plaza; let best = null;
      for (let i = 0; i < 32; i++) {
        const a = i / 32 * 6.283, x = pl.x + Math.cos(a) * 30, z = pl.z + Math.sin(a) * 30; let ok = U.seco(x, z);
        for (let s = 2; s <= 18 && ok; s += 2) ok = U.seco(x - Math.cos(a) * s, z - Math.sin(a) * s);
        if (ok && (!best || Math.abs(U.suelo(x, z) - U.suelo(pl.x, pl.z)) < best.dh)) best = { x, z, a, dh: Math.abs(U.suelo(x, z) - U.suelo(pl.x, pl.z)) };
      }
      best ||= { x: pl.x + 30, z: pl.z, a: 0 };
      const dx = -Math.cos(best.a), dz = -Math.sin(best.a), P = U.G.player;
      P.place(best.x, best.z, Math.atan2(dx, dz)); P.obj.visible = true;
      U.rt.follow.cinematic = null; est.juego = true; U.rt.follow.yaw = Math.atan2(dx, dz) + Math.PI;
      U.teclas(['w', 'shift']); window.__ay.despeja(U, P.pos, 6, []); window.__ay.limpia(U); est.fog = [120, 1300]; est.dir = { dx, dz };
    },
    cuadro: (t, U, est) => { U.rt.follow.yaw = Math.atan2(est.dir.dx, est.dir.dz) + Math.PI; },
  },
  // el pastoreo: el explorador entre las ovejas del monte, la cámara baja detrás
  v4Pastoreo: {
    pueblo: OT, hora: 9.2, tiempo: 'clear', seg: 2.6, fps: 12, antes: 30,
    prep: (U, est) => {
      const F = U.rt.fauna, fl = (F?.flock || []).filter(a => a.pos);
      const c = fl.length ? fl.reduce((s, a) => s.add(U.v(a.pos.x, 0, a.pos.z)), U.v(0, 0, 0)).multiplyScalar(1 / fl.length) : U.G.player.pos.clone();
      let best = null;
      for (let r = 2; r <= 24 && !best; r += 2) for (let i = 0; i < 24 && !best; i++) {
        const a = i / 24 * 6.283, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (!U.seco(x, z)) continue;
        for (let j = 0; j < 16; j++) { const b = j / 16 * 6.283, dx = Math.cos(b), dz = Math.sin(b); let ok = true; for (let s = 2; s <= 12; s += 2) if (!U.seco(x + dx * s, z + dz * s)) ok = false; if (ok) { best = { x, z, dx, dz }; break; } }
      }
      best ||= { x: c.x, z: c.z, dx: 1, dz: 0 };
      est.dir = U.v(best.dx, 0, best.dz); const P = U.G.player; P.place(best.x, best.z, Math.atan2(best.dx, best.dz)); P.obj.visible = true;
      fl.slice(0, 18).forEach((a, i) => { const f = 2.5 + (i % 6) * 1.5, s = ((i % 3) - 1) * (1.4 + (i % 4) * 0.6); a.pos.x = best.x + best.dx * f - best.dz * s; a.pos.z = best.z + best.dz * f + best.dx * s; a.obj?.position.set(a.pos.x, U.suelo(a.pos.x, a.pos.z), a.pos.z); });
      U.rt.follow.yaw = Math.atan2(best.dx, best.dz) + Math.PI; U.teclas(['w']); window.__ay.despeja(U, P.pos, 10, []); window.__ay.limpia(U); est.fog = [60, 900];
    },
    cuadro: (t, U, est) => {
      const P = U.G.player.pos, d = est.dir, k = t / 2.6, y = U.suelo(P.x, P.z);
      U.rt.follow.yaw = Math.atan2(d.x, d.z) + Math.PI;
      U.cam(U.v(P.x - d.x * (4.6 - k * 0.6) - d.z * 1.6, y + 1.1 + k * 0.3, P.z - d.z * (4.6 - k * 0.6) + d.x * 1.6), U.v(P.x + d.x * 4, y + 0.9, P.z + d.z * 4), 44);
    },
  },
  // la naturaleza: el explorador a caballo al galope por el prado, la cámara a su lado
  v4Caballo: {
    pueblo: OT, hora: 16.8, tiempo: 'clear', seg: 2.6, fps: 12, antes: 40,
    prep: (U, est) => {
      const G = U.G, P = G.player; if (!G.montura) G.creaMontura?.(); const M = G.montura;
      if (!M?.A) throw new Error('sin montura');
      P.place(M.A.pos.x + 1, M.A.pos.z + 1, 0); M.sube(P); if (!P.vehiculo) throw new Error('no se ha subido');
      const p = P.pos; let best = null;
      for (let i = 0; i < 24; i++) { const b = i / 24 * 6.283, dx = Math.cos(b), dz = Math.sin(b); let ok = true, sube = 0; for (let s = 3; s <= 30; s += 3) { if (!U.seco(p.x + dx * s, p.z + dz * s)) ok = false; sube = Math.max(sube, Math.abs(U.suelo(p.x + dx * s, p.z + dz * s) - U.suelo(p.x, p.z))); } if (ok && (!best || sube < best.sube)) best = { dx, dz, sube }; }
      best ||= { dx: 1, dz: 0 }; est.dir = U.v(best.dx, 0, best.dz);
      U.rt.follow.yaw = Math.atan2(best.dx, best.dz) + Math.PI; U.teclas(['w', 'shift']); window.__ay.despeja(U, p, 30, []); est.fog = [80, 1100];
    },
    cuadro: (t, U, est) => {
      const P = U.G.player.pos, d = est.dir, y = U.suelo(P.x, P.z);
      U.rt.follow.yaw = Math.atan2(d.x, d.z) + Math.PI;
      U.cam(U.v(P.x + d.x * 3.5 - d.z * 6.5, y + 1.7, P.z + d.z * 3.5 + d.x * 6.5), U.v(P.x + d.x * 1.2, y + 1.2, P.z + d.z * 1.2), 42);
    },
  },
  // el bosque de verdad: el explorador entre las hayas de Irati, la cámara delante, de lado, retrocediendo
  v4Irati: {
    pueblo: 'selva-irati', hora: 10.4, tiempo: 'clear', seg: 3.9, fps: 12, antes: 30,
    prep: (U, est) => {
      // (hacia +z desde la salida está el hayedo, como en los planos de flores e irati: el explorador, 24 m adentro, sigue
      // hacia el bosque; si ahí no hay suelo seco, el sitio seco más cercano)
      const P = U.G.player, p0 = P.pos.clone(); let best = null;
      for (let r = 0; r <= 12 && !best; r += 2) for (let i = 0; i < 12 && !best; i++) {
        const x = p0.x + Math.cos(i / 12 * 6.283) * r, z = p0.z + 24 + Math.sin(i / 12 * 6.283) * r; let ok = U.seco(x, z);
        for (let s = 2; s <= 12 && ok; s += 2) ok = U.seco(x, z + s);
        if (ok) best = { x, z };
      }
      best ||= { x: p0.x, z: p0.z }; window.__ay.limpia(U); window.__ay.anda(U, est, best.x, best.z, 0, 1); window.__ay.despeja(U, U.G.player.pos, 20, []); est.fog = [40, 700];
    },
    cuadro: (t, U, est) => {
      const P = U.G.player.pos, d = est.dir, y = U.suelo(P.x, P.z), k = t / 3.9;
      U.cam(U.v(P.x + d.x * (5.2 - k * 0.8) - d.z * 2.4, y + 1.0, P.z + d.z * (5.2 - k * 0.8) + d.x * 2.4), U.v(P.x + d.z * 0.6, y + 1.05, P.z - d.x * 0.6), 42);
    },
  },
};
