// Lo que hace cada vecino del pueblo: nadie pasea porque sí. Cada uno tiene su tarea del día, con sus paradas y lo que
// hace en cada una, y la repite: ir a misa (y quedarse a la puerta de la iglesia), hacer la compra en la tienda con la
// cesta, charlar en corrillo en la plaza, jugar a pillar (los niños, corriendo), ir a por agua a la fuente, llevar el pan
// a casa o dar el paseo de todos los días (los mayores, despacio y parándose a mirar). Al hablarle, cuenta lo que hace.
// Más adelante cada vecino tendrá su personaje propio; las tareas se quedan.

/** Las tareas: name (lo que se ve en el aviso para hablarle), lines (lo que cuenta) y si van con cesta o corren. */
export const TAREAS = {
  misa: { name: 'va a misa', lines: ['Voy a misa de doce. Luego, a tomar algo a la plaza con las vecinas.', 'La iglesia es lo más antiguo del pueblo: fíjate en la portada al pasar.'] },
  compra: { name: 'hace la compra', basket: true, lines: ['Vengo de la tienda: queso, pan y unas alubias para la cena.', 'Lo de aquí es lo mejor: lo hacen vecinos del pueblo.'] },
  tertulia: { name: 'charla en la plaza', lines: ['Aquí, arreglando el mundo con la vecina.', '¿Sabes lo último? Dicen que este año la fiesta será por todo lo alto.'] },
  juego: { name: 'juega a pillar', kid: true, run: true, lines: ['¡Estamos jugando a pillar! ¡A que no me coges!', '¡Uf, qué cansancio! Pero ahora la llevo yo.'] },
  fuente: { name: 'va a por agua', lines: ['Vengo a por agua fresca a la fuente: esta agua baja del monte.', 'Antes todo el pueblo venía aquí con sus cántaros.'] },
  pan: { name: 'lleva el pan a casa', basket: true, lines: ['Llevo el pan a casa, que se enfría. ¡Huele de maravilla!', 'Recién hecho: la corteza cruje.'] },
  paseo: { name: 'da su paseo', old: true, lines: ['Doy mi paseo de todos los días. El médico dice que es lo mejor.', 'Desde aquí se ve todo el valle. Cuando era joven subía al monte cada domingo.'] },
};
// en qué orden se reparten (con dos para la charla: un corrillo es de dos)
const ORDEN = ['tertulia', 'tertulia', 'misa', 'compra', 'juego', 'juego', 'fuente', 'pan', 'paseo', 'compra'];

/**
 * Reparte las tareas y prepara las paradas de cada vecino. g: el pueblo (spot, rnd); n: cuántos vecinos; places: { plaza,
 * church, shop, fountain, houses: [door], view } (lo que haya en el pueblo). Devuelve [{ kind, steps: [{ x, z, wait,
 * face, act, run }] }]. Cada parada lleva cuánto se queda (wait, s), hacia dónde mira (face) y qué hace (act: 'talk'
 * charla, 'look' mira alrededor, 'cheer' celebra).
 */
export function repartirTareas(g, n, places) {
  const R = g.rnd, pick = (a) => a[Math.floor(R() * a.length)], S = (p, r = 2.5) => { const s = g.spot(p, r); return { x: s.x, z: s.z }; };
  // (su casa, cerca de donde va: a misa o a la compra no se cruza el pueblo entero)
  const H = places.houses.length ? places.houses : [places.plaza];
  const home = (near = null, max = 40) => { const c = near ? H.filter(h => Math.hypot(h.x - near.x, h.z - near.z) < max) : H; return S(pick(c.length ? c : H), 2); };
  const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const out = []; let pair = null;
  for (let i = 0; i < n; i++) {
    let kind = ORDEN[i % ORDEN.length];
    if (kind === 'misa' && !places.church) kind = 'paseo';
    if (kind === 'fuente' && !places.fountain) kind = 'paseo';
    if ((kind === 'compra' || kind === 'pan') && !places.shop) kind = 'tertulia';
    let steps;
    if (kind === 'misa') {
      const h = home(places.church), c = S(places.church, 2.5);
      steps = [{ ...c, wait: 40, face: face(c, places.church), act: 'look' }, { ...h, wait: 16, face: face(h, places.plaza) }];   // (la misa, a la puerta de la iglesia)
    } else if (kind === 'compra' || kind === 'pan') {
      const h = home(places.shop), t = S(places.shop, 1.8), p = S(places.plaza, 5);
      steps = kind === 'compra' ? [{ ...t, wait: 22, face: face(t, places.shop), act: 'talk' }, { ...p, wait: 8, act: 'look' }, { ...h, wait: 16, face: face(h, places.plaza) }]
        : [{ ...t, wait: 12, face: face(t, places.shop), act: 'talk' }, { ...h, wait: 20, face: face(h, places.plaza) }];
    } else if (kind === 'tertulia') {
      // los dos del corrillo, uno frente al otro en la plaza y luego junto a la fuente o a la iglesia
      if (!pair) { const a = S(places.plaza, 6), b2 = S(places.fountain || places.church || places.plaza, 5); pair = { a, b: b2, first: true }; }
      const k = pair.first ? -1 : 1, off = (q, d) => ({ x: q.x + k * 0.55 * Math.cos(d), z: q.z + k * 0.55 * Math.sin(d) });
      const d0 = R() * Math.PI, A = off(pair.a, d0), B = off(pair.b, d0);
      steps = [{ ...A, wait: 26, face: face(A, pair.a), act: 'talk' }, { ...B, wait: 20, face: face(B, pair.b), act: 'talk' }];
      if (!pair.first) pair = null; else pair.first = false;
    } else if (kind === 'juego') {
      // corriendo de una esquina a otra de la plaza, con un respiro y celebrando al pillar
      const P = places.plaza, r = 5.5, a0 = R() * 6.28;
      steps = [0, 1, 2, 3].map(j => { const q = S({ x: P.x + Math.cos(a0 + j * 1.57) * r, z: P.z + Math.sin(a0 + j * 1.57) * r }, 1.5); return { ...q, wait: j === 3 ? 2.2 : 0.4 + R() * 0.6, run: true, act: j === 3 ? 'cheer' : null }; });
    } else if (kind === 'fuente') {
      const h = home(places.fountain), f = S(places.fountain, 1.6);
      steps = [{ ...f, wait: 24, face: face(f, places.fountain), act: 'look' }, { ...h, wait: 14 }];
    } else {   // paseo: hasta un sitio con vista (o el borde del pueblo) y vuelta, parándose a mirar
      const h = home(places.view || places.plaza, 70), v = S(places.view || places.plaza, 6), m = S({ x: (h.x + v.x) / 2, z: (h.z + v.z) / 2 }, 3);
      steps = [{ ...m, wait: 8, act: 'look' }, { ...v, wait: 26, face: places.view ? face(places.plaza, v) : undefined, act: 'look' }, { ...h, wait: 16 }];
    }
    out.push({ kind, steps });
  }
  return out;
}
