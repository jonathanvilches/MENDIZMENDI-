// Las tomas del tráiler v8 (23 nov 2026). El autor, del v7: «hay errores de parpadeos, imágenes que no se ven bien»; «lo
// importante son la gastronomía, la agricultura, los personajes y los productos locales»; «me gusta la idea de personaje
// corriendo por detrás con diferentes escenarios»; «que se vea que puedes ir en tractor o en bici o en caballo, en burro»;
// «elimina los personajes antiguos»; «quita Roldán»; «da más valor a las mujeres»; «si el personaje no es fiel a la realidad
// no lo pongas; si es un apaño, no lo pongas»; «planos limpios», «movimientos de cámara dinámicos».
// · Todo a 24 imágenes por segundo de verdad (fps: 24): el v7 grababa a 12 y el montaje se inventaba las de en medio
//   (minterpolate), y una de cada dos salía emborronada; eso eran los parpadeos.
// · Fuera la pelota (sus pelotaris, su público y la entrega de la txapela son los modelos antiguos), los dantzaris, el
//   carnaval de los niños, la sorgina y Roldán (trajes de leyenda sobre un cuerpo genérico), el herrero y el tonelero (son
//   niños en un taller: no tiene sentido).
// Se ruedan con la grabadora del v5: TOMAS=tools/trailer/v8/tomas.mjs node tools/trailer/v5/juego.mjs <tomas> <carpeta>
import { TOMAS as T6, AYUDA as AYUDA6, BEAT, BAR, T0, DURA, b } from '../v6/tomas.mjs';
export { BEAT, BAR, T0, DURA, b };
// (las ayudas del v6 y, además, fuera las hojas que flotan sobre las plantas por identificar (game/floraSpots.js): son
// interfaz, y cuando la cámara pasaba cerca de una, un círculo verde y blanco tapaba media pantalla. El juego les vuelve a
// poner «visible» al moverlas: se les fija a «no»)
const SIN_MARCAS = () => { const F = window.__game?.flora; if (!F?.group) return; F.group.traverse(o => { if (o.isSprite) Object.defineProperty(o, 'visible', { get: () => false, set: () => { }, configurable: true }); }); };
// (y las caras de los vecinos, siempre: el juego solo se las pone a menos de 18 m (actors/people.js, cullActor) y en las
// carreras se veía cómo aparecían al acercarse; el autor, del v9: «que en los planos esté ya el mundo cargado, no que se vaya
// cargando conforme vas andando». Se repite cada medio segundo para los que salen después, como los del mercado)
const CARAS = () => { const fija = () => { const G = window.__game; if (!G) return; for (const a of [...(G.actors || []), ...(G.walkers || []), ...Object.values(G.npcs || {})]) { const g = a?.glb; if (g?.setFaceVisible && !g.__cara) { const f = g.setFaceVisible.bind(g); g.setFaceVisible = () => f(true); g.__cara = true; f(true); } } }; fija(); setInterval(fija, 500); };
export const AYUDA = new Function(`(${AYUDA6.toString()})(); (${SIN_MARCAS.toString()})(); (${CARAS.toString()})();`);

const URL = (town, h = 11.5, extra = '') => `?town=${town}&q=high&skipintro=1&weather=clear&t=${h}${extra}`;
// (los pasos de antes, el doble: van de 1/24 s y así el mundo llega igual de asentado que a 12 por segundo)
const F24 = (t, o = {}) => ({ ...t, fps: 24, antes: (t.antes ?? 24) * 2, ...o });

// el explorador corriendo, visto por detrás, hacia la plaza del pueblo (o hacia donde diga o.hacia): la cámara a su
// espalda, baja, que va pasando de un lado al otro mientras corre, y delante el pueblo, el castillo o el puente
// (desde el v10, el explorador de antes, el sanferminero, vestido de blanco y rojo: el autor, del v9, «quiero el otro
// explorador, vestido de San Fermín», no el de la mochila; y 16 s de espera antes de grabar, con el pueblo ya entero)
const YO = { espera: 16000 };
const detras = (town, o = {}) => ({ ...YO,
  url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 1.1, fps: 24, antes: 48, limpio: true,
  prep: eval(`() => {
    const J = window.__j, L = window.__layout?.PLACES || {}; J.limpia();
    const C = ${o.hacia || 'L.plaza'};
    J.corre(C, ${o.lejos ?? 36}, { solo: true, snap: true, margen: ${o.margen ?? 8} });
    // la cámara clavada a la espalda, la misma en todos los pueblos: al cortar de uno a otro el explorador no se mueve
    // de su sitio en la pantalla y lo que cambia es el pueblo a su alrededor (el autor: «el personaje corriendo y va
    // cambiando el pueblo a la vez que corre»)
    J.pegada(() => ({ f: -(${o.f ?? 3.3}), s: ${o.s ?? 0.75}, y: ${o.y ?? 1.35}, lf: 7, ly: ${o.ly ?? 1.5} }));
  }`),
});

// la cámara que sigue a un vehículo (o una montura) desde un lado: f delante (−, detrás), s al lado, y de alto (y nunca a
// menos de ymin del suelo que tiene debajo: a 1,3 m, la de la bici se metía en un seto de flores)
const sigue = (o) => `(V) => J.dron((t) => {
  const h = V.heading, fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, x0 = V.x, z0 = V.z;
  const f = ${o.f0} + t * ${o.fv}, s = ${o.s0} + t * ${o.sv}, x = x0 + fx * f + sx * s, z = z0 + fz * f + sz * s, y0 = J.suelo(x0, z0);
  return { pos: [x, Math.max(J.suelo(x, z) + ${o.ymin ?? 1.9}, y0 + ${o.y}), z], look: [x0 + fx * ${o.lf ?? 1.5}, y0 + ${o.ly ?? 1.1}, z0 + fz * ${o.lf ?? 1.5}] };
})`;

// en bici o en tractor por el pueblo: el vehículo debajo del explorador, ya en marcha por un camino libre
const vehiculo = (town, tipo, o = {}) => ({ ...YO,
  url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 2.0, fps: 24, antes: 48, limpio: true,
  prep: eval(`async () => {
    const J = window.__j, G = J.G, P = G.player, L = window.__layout?.PLACES || {}; J.limpia();
    const { Vehiculo } = await import('/src/game/conducir.js');
    J.corre(${o.hacia || 'L.plaza'}, ${o.lejos ?? 40}, { solo: true, snap: true, margen: 8 });
    const V = new Vehiculo(G, '${tipo}', P.pos.x, P.pos.z, P.heading${tipo === 'tractor' ? `, { apero: ${o.apero === null ? 'null' : `'${o.apero || 'trailer'}'`} }` : ''});
    V.sube(P); J.teclas(['w']);
    (${sigue(o.cam || { f0: 3.2, fv: -1.0, s0: 3.4, sv: -0.6, y: 1.3 })})(V);
  }`),
});

// a lomos de la montura del pueblo (el caballo burguete en la montaña, el burro en la Ribera y la zona media), al trote o
// a galope
const montura = (town, o = {}) => ({ ...YO,
  url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 2.0, fps: 24, antes: 48, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player, L = window.__layout?.PLACES || {}; J.limpia();
    J.corre(${o.hacia || 'null'}, ${o.lejos ?? 55}, { solo: true, snap: true }); J.teclas([]);
    ${o.tipo ? `G.cambiaMontura?.('${o.tipo}');` : ''} J.galope(); ${o.trote ? `J.teclas(['w']);` : ''}
    (${sigue(o.cam || { f0: -4.2, fv: 0.6, s0: 2.6, sv: -1.4, y: 1.7, lf: 6, ly: 1.4 })})({ get x() { return P.pos.x; }, get z() { return P.pos.z; }, get heading() { return P.heading; } });
  }`),
});

// una cosecha en marcha (game/townTractor.js): los temporeros cogiendo en sus hileras y dejando las cajas, y el explorador
// en el tractor del remolque por la linde del campo; la cámara a su lado, con el campo detrás
const tractorCampo = (town, crop, o = {}) => ({ ...YO,
  url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 2.2, fps: 24, antes: o.antes ?? 150, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const M = (G.missions || []).find(m => m.type === 'harvest' && m.m.crop === '${crop}'); if (!M) throw new Error('sin cosecha');
    G.startCosecha(M); const C = M.cos; if (!C?.trac) throw new Error('sin tractor');
    const V = C.trac; P.place(V.x, V.z, V.heading); V.sube(P); J.teclas([]);
    let k = 0; window.__antes = () => { if (++k === ${(o.antes ?? 150) - 30}) J.teclas(['w']); };
    (${sigue(o.cam || { f0: 6, fv: -1.6, s0: -6.5, sv: 0.6, y: 2.2, lf: 0, ly: 1.2 })})(V);
  }`),
});

// la cosechadora segando el trigo, pasada a pasada
const cosechadora = (town, o = {}) => ({ ...YO,
  url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 2.2, fps: 24, antes: o.antes ?? 60, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const M = (G.missions || []).find(m => m.type === 'harvest' && m.m.crop === 'trigo'); if (!M) throw new Error('sin trigo');
    G.startCosecha(M); const C = M.cos; if (!C?.cos) throw new Error('sin cosechadora');
    // (el juego la deja a unos 34 m del trigo, mirando a otro lado: aquí, al principio de la hilera con más trigo y de
    // cara a ella, para que en la toma ya esté segando)
    const ca = Math.cos(C.campo.ang), sa = Math.sin(C.campo.ang), cols = {};
    for (const k of C.celdas) { const dx = k.x - C.campo.x, dz = k.z - C.campo.z, u = Math.round((dx * ca + dz * sa) / 4.6), v = -dx * sa + dz * ca; (cols[u] ||= []).push(v); }
    const [uc, vs] = Object.entries(cols).sort((p, q) => q[1].length - p[1].length)[0], p0 = C.enCampo(+uc * 4.6, Math.min(...vs) - ${o.antesDe ?? 6});
    const V = C.cos; V.x = p0.x; V.z = p0.z; V.heading = Math.atan2(-sa, ca); V.place(0);
    P.place(V.x, V.z, V.heading); V.sube(P); J.teclas(['w']);
    (${sigue(o.cam || { f0: 7, fv: -2.5, s0: 12, sv: -1.5, y: 8.5, lf: 1, ly: 1.2 })})(V);
  }`),
});

// los temporeros en su hilera, de cerca y desde abajo, sin el explorador
const temporeros = (town, crop, o = {}) => ({
  url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 2.0, fps: 24, antes: o.antes ?? 220, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const M = (G.missions || []).find(m => m.type === 'harvest' && m.m.crop === '${crop}'); if (!M) throw new Error('sin cosecha');
    G.startCosecha(M); const C = M.cos; if (!C?.tempo?.length) throw new Error('sin temporeros');
    P.place(C.trac.x, C.trac.z, 0); P.frozen = true; P.obj.visible = false; J.teclas([]);
    window.__antes = () => { P.obj.visible = false; };
    const T = C.tempo[${o.i ?? 1}].a;
    J.dron((t) => { P.obj.visible = false;
      const a = (C.campo.ang ?? 0) + ${o.a ?? 0.9} + t * ${o.giro ?? 0.25}, d = ${o.d ?? 4.2} - t * 0.4, y = J.suelo(T.pos.x, T.pos.z);
      return { pos: [T.pos.x + Math.cos(a) * d, y + ${o.y ?? 1.3}, T.pos.z + Math.sin(a) * d], look: [T.pos.x, y + 0.8, T.pos.z] };
    });
  }`),
});

// (quien pasa por delante de la cámara, fuera: cualquier personaje (con esqueleto) a menos de r metros de c, menos los del
// plano, para toda la toma (el juego le vuelve a poner «visible» en cada fotograma según la distancia: se le fija a «no»)
const DESPEJA = `const despeja = (c, r, deja) => { const keep = new Set(deja.map(a => a.obj)); for (const o of G.scene.children) { if (!o.visible || keep.has(o) || o === G.player.obj) continue; const p = o.position; if (Math.hypot(p.x - c.x, p.z - c.z) >= r) continue; let piel = false; o.traverse(m => { if (m.isSkinnedMesh) piel = true; }); if (piel) Object.defineProperty(o, 'visible', { get: () => false, set: () => { }, configurable: true }); } };`;

// el mercado de la plaza (con ?market=1, siempre): un puesto entero (el de los quesos, el de la txistorra y el pan, el de
// la miel y la cuajada, el de la huerta), con su toldo, el género y quien vende detrás, a unos 3 m y a la altura de quien
// compra, pasando despacio de un lado al otro. (De lejos, entre dos puestos, salía la plaza vacía; pegada a la mesa, las
// cajas del género se veían toscas)
const mercado = (town, puesto, o = {}) => ({
  url: URL(town, o.hora ?? 11.5, '&market=1'), seg: o.seg ?? 1.1, fps: 24, antes: 48, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const S = (G.mercado?.stalls || []).find(s => s.name === ${JSON.stringify(puesto)});
    if (!S) throw new Error('sin puesto: ' + (G.mercado?.stalls || []).map(s => s.name).join(', '));
    const C = window.__layout.PLACES.plaza;
    P.place(C.x + 40, C.z + 40, 0); P.frozen = true; P.obj.visible = false; J.teclas([]);
    ${DESPEJA} const vende = (G.mercado?.sellers || []).filter(v => Math.hypot(v.pos.x - S.x, v.pos.z - S.z) < 3);
    window.__antes = () => { P.obj.visible = false; despeja(S, 14, vende); };
    // (u, a lo largo de la mesa; v, hacia delante, hacia quien compra)
    const W = (u, v) => ({ x: S.x + Math.cos(S.ry) * u + Math.sin(S.ry) * v, z: S.z - Math.sin(S.ry) * u + Math.cos(S.ry) * v }), y0 = J.suelo(S.x, S.z);
    J.dron((t) => { P.obj.visible = false; despeja(S, 14, vende);
      const k = Math.min(1, t / ${o.seg ?? 2.0}), e = k * k * (3 - 2 * k), u = ${o.u0 ?? -1.6} + ${(o.u1 ?? 1.6) - (o.u0 ?? -1.6)} * e;
      const p = W(u, ${o.d ?? 3.4} - 0.4 * e), l = W(u * 0.25, -0.3);
      return { pos: [p.x, y0 + ${o.y ?? 1.8}, p.z], look: [l.x, y0 + ${o.ly ?? 1.5}, l.z] };
    });
  }`),
});

// una vecina de oficio (la quesera, la vendimiadora, la apicultora…): de cara, hablando, con la cámara que gira despacio
// a su alrededor, un poco por debajo de su cara y con el cielo detrás (a la altura de los ojos, detrás salían el suelo y
// los árboles del campo)
const retrato = (town, sel, frase, o = {}) => ({
  url: URL(town, o.hora ?? 11.5, o.extra || ''), seg: o.seg ?? 1.6, fps: 24, antes: 60, limpio: true,
  prep: eval(`() => {
    const J = window.__j, G = J.G, P = G.player; J.limpia();
    const a = ${o.npc ? `G.npcs?.${o.npc}` : `(G.missions || []).find(m => ${sel})?.host`}; if (!a) throw new Error('sin vecina');
    a.cancelPath?.(); a.goal = null; a.path = []; a.target = null; a.state = 'idle'; a.frozen = true;
    J.hacia(a, 2.6${o.h != null ? `, { h: ${o.h} }` : ''}); J.teclas([]); J.charla(a, { habla: 0.05, para: 9, frases: [${JSON.stringify(frase)}] });
    ${DESPEJA} window.__antes = () => { P.obj.visible = false; despeja(a.pos, 8, [a]); };
    J.dron((t) => { P.obj.visible = false; despeja(a.pos, 8, [a]);
      const h0 = Math.atan2(P.pos.x - a.pos.x, P.pos.z - a.pos.z), h = h0 + ${o.a0 ?? 0.5} - t * ${o.giro ?? 0.45}, d = ${o.d ?? 1.85} - t * 0.2, y = J.suelo(a.pos.x, a.pos.z);
      return { pos: [a.pos.x + Math.sin(h) * d, y + ${o.y ?? 1.3}, a.pos.z + Math.cos(h) * d], look: [a.pos.x, y + ${o.ly ?? 1.5}, a.pos.z] };
    });
  }`),
});

// una lámina de cómo se hace (public/anatomia, las de Oficios en el juego: el queso, el rosado, la txistorra, el piquillo…),
// entera y a pantalla completa (sin el texto de debajo), pasando de un paso al siguiente como con las flechas del teclado,
// y la cámara que se acerca despacio. (La lámina, sacada del resto de la página: dentro de ella, «fixed» no centraba)
const lamina = (id, o = {}) => ({
  url: `anatomia/${id}.html`, seg: o.seg ?? 2.0, fps: 24, antes: o.antes ?? 24, espera: 3000, limpio: false,
  listo: (p) => p.waitForSelector('.iso-plate', { timeout: 120000 }),
  prep: eval(`() => {
    const pl = document.querySelector('.iso-plate'), st = document.createElement('style');
    st.textContent = 'html,body{margin:0!important;overflow:hidden!important;background:var(--anatomy-page)!important} body > *:not(.iso-plate){display:none!important} .iso-plate{position:fixed!important;left:0!important;top:0!important;margin:0!important;max-width:none!important;transform-origin:0 0}';
    document.head.appendChild(st); document.body.appendChild(pl);
    pl.style.width = '${o.ancho ?? 1040}px';
    const r = pl.getBoundingClientRect(), s0 = Math.min(innerWidth / r.width, innerHeight / r.height) * ${o.llena ?? 0.97};
    const zoom = (t) => { const s = s0 * (1 + ${o.zv ?? 0.03} * t); pl.style.transform = 'translate(' + ((innerWidth - r.width * s) / 2).toFixed(1) + 'px,' + ((innerHeight - r.height * s) / 2).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')'; };
    const stg = pl.querySelector('.iso-stage'), tecla = (k) => stg?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    stg?.focus(); for (let i = 0; i < ${o.paso ?? 1}; i++) tecla('ArrowRight');
    let hecho = 0; const pasos = ${JSON.stringify(o.pasos ?? [0.9])};
    zoom(0); window.__cada = (t) => { zoom(t); while (hecho < pasos.length && t >= pasos[hecho]) { hecho++; tecla('ArrowRight'); } };
  }`),
});

export const TOMAS = {
  // ---------- las del v6, ahora a 24 por segundo ----------
  isla: F24(T6.isla), isla2: F24(T6.isla2), final: F24(T6.final, { seg: 2.9 }), llegada: F24(T6.llegada),
  momo: F24(T6.momo, { seg: 1.1 }), pastoreo: F24(T6.pastoreo), lamia: F24(T6.lamia, { seg: 1.1 }), basajaun: F24(T6.basajaun),
  bosque: F24(T6.bosque), rio: F24(T6.rio), olite: F24(T6.olite), isaba: F24(T6.isaba), puente: F24(T6.puente),
  almadia: F24(T6.almadia), panadera: F24(T6.panadera), maite: F24(T6.maite), nerea: F24(T6.nerea), arantxa: F24(T6.arantxa),
  felisa: F24(T6.felisa),
  // ---------- el explorador corriendo, por detrás, en sitios distintos ----------
  dOts: detras('otsagabia-ochagavia', { hora: 11, seg: 2.0 }), dEstella: detras('estella'), dElizondo: detras('elizondo'),
  dRoncal: detras('erronkari-roncal'), dLekunberri: detras('lekunberri'), dTudela: detras('tudela'), dViana: detras('viana'), dArtajona: detras('artajona'),
  dOlite: detras('olite'),
  dPuente: detras('puente-la-reina', { hora: 11 }),
  dPamplona: detras('pamplona', { hora: 12 }),
  dLesaka: detras('lesaka'),
  dIsaba: detras('isaba-izaba', { hora: 11.4 }),
  dBardenas: detras('bardenas-reales', { hacia: 'null', lejos: 45, margen: 3, hora: 11.8 }),
  dIrati: detras('selva-irati', { hacia: 'L.forest', lejos: 28, margen: 3, hora: 12.2 }),
  // ---------- en bici, en tractor, en burro y a caballo ----------
  bici: vehiculo('elizondo', 'bici'),
  tractor: vehiculo('artajona', 'tractor', { hacia: 'L.fields', lejos: 45, cam: { f0: 6, fv: -1.8, s0: -5, sv: 0.8, y: 2.0, lf: 0, ly: 1.3 } }),
  burro: montura('olite', { trote: true, hacia: 'L.fields || null', cam: { f0: 3.6, fv: -1.2, s0: 2.8, sv: -0.6, y: 1.2, lf: 0, ly: 1.1 } }),
  galope: montura('isaba-izaba', { hora: 12, cam: { f0: 1.2, fv: -0.5, s0: 5.6, sv: -0.6, y: 1.8, lf: 1.5, ly: 1.4 } }),
  // ---------- la agricultura: la cosechadora, el tractor con los temporeros, la vendimia ----------
  cosechadora: cosechadora('artajona'),
  vendimia: tractorCampo('viana', 'uva'),
  vendimiaT: temporeros('viana', 'uva'),
  piquillo: tractorCampo('estella', 'piquillo'),
  piquilloT: temporeros('estella', 'piquillo'),
  olivar: temporeros('lumbier', 'olivo'),
  alcachofa: temporeros('tudela', 'alcachofa'),
  // ---------- los productos: el mercado de la plaza ----------
  mercQueso: mercado('estella', 'Quesería'),
  mercTxistorra: mercado('estella', 'Txistorra y pan', { u0: 1.6, u1: -1.6 }),
  mercMiel: mercado('estella', 'Miel y cuajada'),
  mercHuerta: mercado('estella', 'Huerta', { u0: 1.6, u1: -1.6 }),
  // ---------- las láminas de cómo se hacen los productos ----------
  lamQueso: lamina('queso', { paso: 2 }), lamTxistorra: lamina('txistorra', { paso: 1 }), lamPiquillo: lamina('piquillo', { paso: 1 }),
  lamVino: lamina('vino', { paso: 1 }), lamMiel: lamina('miel', { paso: 1 }), lamAceite: lamina('aceite', { paso: 1 }),
  // ---------- las mujeres de los oficios del campo y de la mesa ----------
  rVendimiadora: retrato('viana', "m.type === 'harvest'", 'Este año la uva viene buenísima.'),
  rBodeguera: retrato('viana', "m.m.id === 'wine'", 'De la viña a la bodega, y de la bodega a la mesa.'),
  rApicultora: retrato('aoiz', "m.m.id === 'honey'", 'Mis abejas hacen la mejor miel del valle.'),
  rCarnicera: retrato('pamplona', "m.m.id === 'chistorra'", 'La txistorra, como la hacía mi abuela.'),
  rConservera: retrato('cortes', "m.m.id === 'piquillo'", 'El piquillo se asa y se pela a mano.'),
  rAlmazarera: retrato('tafalla', "m.m.id === 'olive'", 'Del olivo a la almazara.'),
  rOlivarera: retrato('lumbier', "m.type === 'harvest'", 'Las olivas, a mano, una a una.'),
  rHortelana: retrato('sanguesa', "m.type === 'harvest'", 'Las pochas, tiernas, de septiembre.'),
  rEsparraguera: retrato('marcilla', "m.type === 'harvest'", 'El espárrago se corta al amanecer.'),
  rConfitera: retrato('ujue', "m.type === 'harvest'", 'Almendras garrapiñadas de Ujué.'),
  rMaite: retrato('otsagabia-ochagavia', null, '¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!', { npc: 'maite', hora: 11.2, a0: -0.15, giro: 0.35, seg: 1.1 }),
  rQuesera: retrato('isaba-izaba', "m.m.id === 'roncal'", 'Del queso Roncal me sé todos los secretos.', { extra: '&market=1' }),
};

// ---------- tercera pasada (el autor, del v8: «me gusta, pero que se vean las comarcas; el vuelo de dron por las
// comarcas y pueblos; las misiones») ----------
// el mapa del inicio: una comarca que sube como isla y el dron que planea sobre ella (hub/mapa3d.js, select), y el vuelo
// de dron hasta un pueblo, que cruza una nube y planea sobre sus casas (irPueblo)
const MAPA = (p) => p.waitForFunction(() => window.__mapa3d?.ren && window.__mapa3d.calentado?.(), null, { timeout: 300000 }).catch(() => { });
const islaDe = (id, o = {}) => ({ url: '?skipintro=1&q=high', seg: o.seg ?? 3.2, fps: 24, antes: 8, espera: 12000, limpio: true, listo: MAPA,
  guion: [[0, (p) => p.evaluate((id) => window.__mapa3d.comarca(id), id)]] });
const vueloA = (town, o = {}) => ({ url: '?skipintro=1&q=high', seg: o.seg ?? 5.5, fps: 24, antes: 8, espera: 12000, limpio: true, listo: MAPA,
  guion: [[0, (p) => p.evaluate((t) => window.__mapa3d.ir(t), town)]] });
// el encierro de San Fermín (game/encierro.js), la misión de Pamplona: la Estafeta, el público en los balcones y los toros
// que llegan por detrás. Se adelanta, sin dibujar, hasta que la manada alcanza al explorador; ningún toro lo tira (safe)
const encierro = (o = {}) => ({
  url: URL('pamplona', 8), seg: o.seg ?? 2.4, fps: 24, antes: 4, limpio: true,
  prep: eval(`async () => {
    const J = window.__j; J.limpia(); const { Encierro } = await import('/src/game/encierro.js');
    new Encierro(J.G).run();
    // (Fermín, el original de Meshy: la cabeza a su tamaño y entero a la altura del explorador, 1,45 m; lo mismo que hace
    // encierro.js desde el 23 de noviembre de 2026, aquí también para grabarlo mientras el juego no se toca)
    const T3 = await import('/node_modules/three/build/three.module.js');
    const orig = (me) => { const r = me.char?.root; if (!r || me.__orig) return; me.__orig = true; let cab = null; r.traverse(o => { if (!cab && o.isBone && /Head$/.test(o.name)) cab = o; });
      if (cab) cab.scale.setScalar(1); r.scale.setScalar(1); r.updateMatrixWorld(true); const c = new T3.Box3().setFromObject(r, true); r.scale.setScalar(1.45 / Math.max(0.1, c.max.y - c.min.y)); };
    window.__cada = () => { const e = window.__game.encierro; if (e?.me) { orig(e.me); e.me.safe = 99; e.camMode = ${JSON.stringify(o.cam ?? 'toros')}; } };
  }`),
  guion: [[0, async (p) => {
    for (let i = 0; i < 2000; i++) {
      const ok = await p.evaluate((t) => { window.__sinDibujo = true; try { window.__cada?.(); } catch (e) { } window.__paso(1 / 24); const e = window.__game.encierro; return !!(e?.started && e.t > t); }, o.t ?? 12);
      if (ok) break; if (i % 24 === 23) await p.waitForTimeout(200);
    }
  }]],
});
// (la cámara «toros» del encierro: delante del corredor, mirando atrás, con la manada que llega por la calle; a los 12 s
// del cohete los primeros toros ya lo alcanzan)
Object.assign(TOMAS, {
  // (más largas que lo que entra en el montaje: la isla espera a que el mapa tenga cargado su relieve fino, y eso no tarda
  // siempre lo mismo; de cada una se elige en CORTES el trozo bueno)
  vOts: vueloA('otsagabia-ochagavia', { seg: 8 }),
  islaRibera: islaDe('ribera', { seg: 5.5 }), islaEstella: islaDe('tierra-estella'), islaMedia: islaDe('zona-media'), islaPamplona: islaDe('pamplona'),
  vPamplona: vueloA('pamplona'), vOlite: vueloA('olite'), vEstella: vueloA('estella'), vTudela: vueloA('tudela'),
  encierro: encierro({ seg: 4 }),
});

// ---------- cuarta pasada, v10 (el autor, del v9: «el otro explorador, vestido de San Fermín»; «lo más bonito de cada
// pueblo, más espectacular»; «no hay nada de pelota»; «que esté ya el mundo cargado»; «humo para tapar» el canto de la
// isla al despegarse, que ahora es parte del juego: hub/mapa3dIsla.js) ----------
// el dron sobre lo más bonito del pueblo (el castillo de Olite, el puente de Puente la Reina, la plaza de Isaba con el
// Pirineo detrás): más bajo y más cerca que en el v6, girando más deprisa alrededor
const dronPueblo = (town, o = {}) => ({ url: URL(town, o.hora ?? 11.5), seg: o.seg ?? 1.6, fps: 24, antes: 48, espera: 16000, limpio: true,
  prep: eval(`() => { const J = window.__j, P = J.G.player; J.limpia(); P.obj.visible = false; window.__antes = () => { P.obj.visible = false; };
    const C = J.centro(); J.orbita(C, ${JSON.stringify({ seg: o.seg ?? 1.6, a0: (o.a0 ?? 0.1) * 6.283, a1: (o.a1 ?? 0.2) * 6.283, r0: o.r0 ?? 40, r1: o.r1 ?? 30, y0: o.y0 ?? 16, y1: o.y1 ?? 11, mira: o.mira ?? 4 })}); }`),
});
// un partido de pelota en el frontón (game/fronton.js), jugando solo, con la cámara del juego
const pelota = (o = {}) => ({
  url: '?town=lumbier&q=high&weather=clear&skipintro=1', seg: o.seg ?? 4.0, fps: 24, antes: 4, espera: 0, limpio: true,
  listo: async (p) => {
    await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 1500000 });
    await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, {}); });
    await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 900000 });
    await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
    await p.waitForFunction(() => ['serveWait', 'servePrep', 'rally'].includes(window.__game.pelotaMatch?.game?.phase), null, { timeout: 900000 });
    await p.evaluate(() => { const M = window.__game.pelotaMatch; M.game.autoplay = true; const h = M.hud; if (h?.teclas) { h.teclas(false); h.teclas = () => {}; } });
    await p.waitForTimeout(6000);
  },
});
Object.assign(TOMAS, {
  // (las del jugador que ya estaban, ahora con el sanferminero)
  pastoreo: F24(T6.pastoreo, YO), almadia: F24(T6.almadia, YO), bosque: F24(T6.bosque, YO),
  // (las islas, más largas: el humo y la subida no tardan siempre lo mismo; en CORTES se elige el trozo)
  isla2: islaDe('bidasoa', { seg: 5.5 }),
  olite: dronPueblo('olite', { a0: 0.02, a1: 0.13, r0: 34, r1: 25, y0: 13, y1: 9, mira: 7 }),
  puente: dronPueblo('puente-la-reina', { a0: 0.18, a1: 0.3, r0: 30, r1: 24, y0: 9, y1: 6, mira: 2 }),
  isaba: dronPueblo('isaba-izaba', { a0: 0.5, a1: 0.6, r0: 75, r1: 60, y0: 30, y1: 24, mira: 14 }),
  pelota: pelota(),
});

// el montaje: [segundo del tráiler, toma, desde qué segundo de la toma, velocidad (1 si no se dice)]; cada corte dura hasta
// el siguiente. Las frases de Salva y las voces caen donde en el v6 (v6/mezcla-v6.py), y debajo de cada frase lo que dice
export const CORTES = [
  // v10 (el autor, del v9). ACTO 1 · «Hay una tierra donde cada pueblo guarda una historia»: el Pirineo se despega del mapa
  // entre el polvo, el dron se acerca a la comarca, pasa las nubes y entra en Otsagabia, de una sola toma; y el explorador
  // (el sanferminero) echa a correr
  [0, 'vOts', 0.4, 0.85], [b(-1), 'dOts', 0.1],
  // el golpe: corre y el pueblo cambia detrás (Pamplona, Lesaka); luego, a caballo
  [b(0), 'dPamplona', 0.1], [b(0.5), 'dLesaka', 0.1], [b(1), 'galope', 0],
  // ACTO 2 · «¡Kaixo!» (Maite) y «Cada vecino te pide ayuda…»: las vecinas y la panadera; «el pastoreo, el carnaval, las
  // leyendas»; «¡Oooh! Una personita en mi bosque…»
  [b(2), 'rMaite', 0.12], [b(2.5), 'rBodeguera', 0.1], [b(3), 'felisa', 0.1], [b(3.5), 'nerea', 0.1], [b(4), 'panadera', 0.3],
  [b(4.5), 'pastoreo', 0], [b(5), 'momo', 0], [b(5.5), 'lamia', 0], [b(6), 'basajaun', 0], [b(7.5), 'dIrati', 0.1],
  // «La naturaleza y la cultura, contadas jugando»: la selva y otra vez a correr (las Bardenas, Elizondo)
  [b(8), 'bosque', 0.6], [b(9), 'dBardenas', 0.1], [b(9.5), 'dElizondo', 0.1],
  // llega corriendo a lo más bonito de cada pueblo y el dron lo enseña: Isaba, el puente de Puente la Reina, el castillo
  // de Olite
  [b(10), 'dIsaba', 0.1], [b(10.5), 'isaba', 0], [b(11), 'dPuente', 0.1], [b(11.5), 'puente', 0], [b(12), 'dOlite', 0.1],
  [b(12.5), 'olite', 0],
  // en bici, en burro y en tractor; la Bidasoa que sube del mapa entre el polvo
  [b(13), 'bici', 0], [b(13.5), 'burro', 0], [b(14), 'tractor', 0], [b(15), 'isla2', 1.9],
  // ACTO 3 · COSECHA SUS CAMPOS
  [b(16), 'cosechadora', 0], [b(17), 'piquillo', 0],
  // SABOREA SU TIERRA
  [b(18), 'mercQueso', 0], [b(18.5), 'mercTxistorra', 0], [b(19), 'mercMiel', 0], [b(19.5), 'mercHuerta', 0],
  // EXPLORA SUS COMARCAS: la Ribera sube con su laguna, y el dron vuela hasta Pamplona
  [b(20), 'islaRibera', 1.7], [b(21), 'vPamplona', 3.6],
  // VIVE SUS TRADICIONES: el encierro, la pelota y la almadía
  [b(22), 'encierro', 1.3], [b(23), 'pelota', 2.6], [b(23.5), 'almadia', 0.4],
  // el logo: el mapa del juego 1,9 s y luego se va a negro, con el logo encima (v8/montaje.mjs, NEGRO)
  [b(24), 'final', 0],
];
// los rótulos: [desde, hasta, imagen] (v8/rotulos.mjs)
export const ROTULOS = [[b(16) + 0.1, b(18) - 0.12, 'cosecha'], [b(18) + 0.1, b(20) - 0.12, 'saborea'], [b(20) + 0.1, b(22) - 0.12, 'explora'], [b(22) + 0.1, b(24) - 0.12, 'vive'], [b(24) + 0.35, DURA, 'logo']];
