// La iglesia del juego en un pueblo real: el edificio de los datos (OpenStreetMap) que es de verdad la iglesia que nombra
// la ficha del pueblo (levels.js), para que la misión de la iglesia y el rótulo del mapa del inicio caigan en su sitio.
// lugares.iglesia, la que eligió tools/pueblo-real-juego.py, es la iglesia más grande cerca del centro, y a veces es otra:
// en Tudela, el colegio de San Francisco Javier en vez de la catedral; en Olite, San Pedro en vez de Santa María la Real;
// en Estella, San Miguel en vez de San Pedro de la Rúa; en Puente la Reina, el Crucifijo en vez de Santiago.
// Se comparan las palabras propias del nombre (el santo, la advocación), en castellano o en euskera: «Done Mikel eliza»
// es «Iglesia de San Miguel»; «Jasokundeko Andre Mariaren eliza», «Iglesia de la Asunción».

// (las palabras que no distinguen una iglesia de otra; «Elizaldea», el barrio de la iglesia, es como se llama la de Ituren)
const VACIA = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al', 'san', 'santa', 'santo', 'sta', 'nuestra', 'senora',
  'andre', 'andra', 'done', 'iglesia', 'parroquia', 'parroquial', 'catolica', 'eliza', 'ermita', 'baseliza', 'kapera', 'capilla', 'basilica',
  'santuario', 'templo', 'arcangel', 'apostol', 'garbi', 'garbia', 'ama', 'birjina', 'virgen', 'elizaldea', 'ermitaldea']);
// (el euskera y las formas de decir lo mismo, a una palabra: «Mikel» es «Miguel»; «Andre Mari», «María»)
const IGUAL = { mari: 'maria', jasokunde: 'asuncion', sortzez: 'inmaculada', zipriano: 'cipriano', mikel: 'miguel', joanes: 'juan', jon: 'juan',
  bataiatzaile: 'bautista', jakue: 'santiago', kolegiata: 'colegiata', katedrala: 'catedral', errege: 'real', erregina: 'real', reina: 'real',
  kruz: 'cruz', estebe: 'esteban', kristo: 'cristo', petri: 'pedro', salbatore: 'salvador' };
// (la Asunción y la Inmaculada son de la Virgen: «Andra Mari eliza» es la iglesia de la Asunción de Etxalar)
const TAMBIEN = { asuncion: 'maria', inmaculada: 'maria' };
const llana = (n) => (n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, ' ').toLowerCase();
const raiz = (w) => { for (let i = 0; i < 2 && !IGUAL[w] && w.length > 6; i++) w = w.replace(/(aren|ren|eko|ko)$/, ''); return IGUAL[w] ?? w; };
/** Las palabras propias de un nombre de iglesia, sin las del nombre del pueblo: «San Pedro de la Rúa» → {pedro, rua} */
export function palabrasIglesia(n, pueblo = '') {
  const fuera = new Set(llana(pueblo).split(/[^a-z0-9]+/).flatMap(w => [w, raiz(w)]));
  const S = new Set();
  for (const w0 of llana(n).split(/[^a-z0-9]+/)) {
    if (!w0 || VACIA.has(w0)) continue;
    const w = raiz(w0); if (!w || VACIA.has(w) || fuera.has(w0) || fuera.has(w)) continue;
    S.add(w); if (TAMBIEN[w]) S.add(TAMBIEN[w]);
  }
  return S;
}
const comunes = (A, B) => { let k = 0; for (const w of A) if (B.has(w)) k++; return k; };
// (los edificios que pueden ser una iglesia aunque el dato no lo diga: no un hotel, una calle o el archivo de la catedral)
const TEMPLO = /iglesia|parroquia|catedral|colegiata|kolegiata|bas[ií]lica|eliza|santuario|ermita|baseliza|capilla|kapera|convento|monasterio/i;
const NO_TEMPLO = /hotel|hostal|albergue|restaurante|\bbar\b|archivo|biblioteca|museo|calle|kalea|plaza|\bcine\b|colegio|escuela/i;

/**
 * La iglesia del juego en los datos de un pueblo real: { casa, propia }. casa: el edificio (o null); propia: si es la
 * iglesia que nombra la ficha (si no, es la que hay y su nombre es otro: el rótulo lleva el suyo).
 * D: los datos (expandidos); nombre: def.church.name; pueblo: def.name.
 */
export function iglesiaReal(D, nombre, pueblo = '') {
  const ig = D?.lugares?.iglesia || null;
  if (!nombre) return { casa: ig, propia: false };
  const P = palabrasIglesia(nombre, pueblo);
  if (!P.size) return { casa: ig, propia: true };
  // la de los datos vale si comparte alguna palabra con la de la ficha; si no tiene nombre o no dice de quién es (en
  // Puente la Reina va sin nombre y es la del Crucifijo), solo si no hay otra que sí sea la de la ficha
  const Q = palabrasIglesia(ig?.n, pueblo);
  if (ig && Q.size && comunes(P, Q)) return { casa: ig, propia: true };
  // si no, el edificio que más palabras comparte con la ficha y es un templo (y, a igualdad, de tipo iglesia y el mayor)
  let best = null, bk = 0;
  for (const c of D.casas || []) {
    if (!c.n || c === ig || NO_TEMPLO.test(c.n) || !(c.k === 'church' || TEMPLO.test(c.n))) continue;
    const k = comunes(P, palabrasIglesia(c.n, pueblo)); if (!k) continue;
    const s = k * 10 + (c.k === 'church' ? 1 : 0);
    if (s > bk || (s === bk && (c.a || 0) > (best.a || 0))) { best = c; bk = s; }
  }
  return best ? { casa: best, propia: true } : { casa: ig, propia: !Q.size };
}
