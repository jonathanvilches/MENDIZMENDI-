// Los frontones del juego, calcados de los de verdad: cada uno, con los colores y la arquitectura de un frontón real de
// las fotos del capítulo «Frontones de Navarra» (src/assets/frontones; datos en data/frontones.js). Lo usan el cubierto
// de cada pueblo, donde se juegan los campeonatos (game/fronton.js, hallVenue), y los «Frontones» de pelota a mano, cada
// uno como en su foto (realVenue).
//
// Antes había siete modelos repartidos por comarca y los cubiertos de una misma comarca salían iguales: Sangüesa, Lumbier,
// Javier, Aoiz, Artajona y Puente la Reina, todos con el de Urroz; los seis del Pirineo, con el de Isaba. El autor, 26 nov
// 2026: «hay que cambiar los frontones para que no sean todos iguales y del mismo color… Sangüesa, Lumbier o varios
// frontones tienen el mismo color»; «dado que ya tienes imágenes reales de los frontones, podías replicar frontones
// reales». Ahora, cada uno de los 32 pueblos con el suyo, sin repetir, y casi siempre uno de su tierra: Isaba, el Erminea
// de Isaba; Roncal, el de Roncal; Ochagavía, el de Igal (su mismo valle de Salazar); Altsasu, el de Olazti, su vecino;
// Tudela, el de Cabanillas; Cortes, el de Fontellas; Viana, el de Marañón…
//
// Cada modelo (MODELOS, por la clave de su foto):
//  · arq: la arquitectura del cubierto, una de las de pelota/court.js (ARQ): pabellon, el moderno oscuro (el Navarra
//    Arena); erminea, techo blanco con cerchas claras y tubos de luz (Isaba); ziordia, igual de claro, con franja de
//    ventanas; iraneta, bóveda de madera laminada con ventanal en arco; igantzi, a dos aguas con cerchas de madera; urroz,
//    a dos aguas con cerchas de acero en celosía; peralta, nave en dientes de sierra.
//  · arqX: lo que cambia de esa arquitectura en este frontón (court.js lo junta con la de base): cercha, el color de las
//    cerchas; boveda: 'metal', la bóveda de chapa en vez de tablas (Allo); fondo, la pared del fondo; derecha, la pared de
//    detrás de la grada ('madera', 'claro' o 'policarbonato'); ventanas ('franja' o 'none'); marcoLado, la franja de color
//    que cierra el frontis por la derecha.
//  · look: los colores de la cancha, como en su foto: frontis (hormigón pintado) o stone (sillería), wall (pared
//    izquierda), marco (la franja de encima del frontis y de la pared izquierda), line (las rayas), mark (la raya de la
//    chapa), floor y contra (suelo de la cancha y de la contracancha), chapa (el colchón de abajo) y chapaMetal. Con el
//    contraste que pide la pelota: fronton.js los pasa por legible, que oscurece sin cambiar de tono lo que es más claro de
//    la cuenta (por eso el frontis blanco de Mirafuentes sale gris claro, con su chapa naranja).
//  · eu: el lugar en euskera, para «…koaren antzekoa» de la tarjeta de «Elige tu frontón»; es, el de la tarjeta en
//    castellano. Los que son al aire libre en la realidad, en el cubierto «con los colores del de…», que no es el mismo.
//
// Los de los que solo hay foto de fuera (Allo, Bidaurreta, Berrioplano, Almandoz, Olazti, la Mañueta) llevan lo que se ve
// en ella (la bóveda de chapa de Allo, la pared amarilla de Bidaurreta, los pilares rojos y el naranja de Berrioplano, la
// piedra y los ventanales de Almandoz, el blanco y la piedra de Olazti, el hormigón de la Mañueta) y, para la cancha, los
// colores de los reglamentos.
const M = (arq, look, o = {}) => ({ arq, look, arqX: o.x || {}, aire: !!o.aire, es: o.es, eu: o.eu });
export const MODELOS = {
  // ---------- cubiertos, por dentro como en su foto ----------
  isaba: M('erminea', { frontis: '#8e9295', wall: '#3f8a4a', marco: '#1d4fc4', line: '#f2cf3a', floor: '#7c8782', contra: '#9ea6a1' }, { es: 'Isaba', eu: 'Izaba' }),
  ziordia: M('ziordia', { stone: '#a68d66', wall: '#1f55b5', marco: '#1d4fc4', line: '#e9ecef', floor: '#868b88', contra: '#a3a7a4', mark: '#d0453c' }, { es: 'Ziordia', eu: 'Ziordia' }),
  iraneta: M('iraneta', { frontis: '#5a9a48', wall: '#5a9a48', marco: '#e9c43b', line: '#f2cf3a', floor: '#8a8e86', contra: '#a5a79f' }, { es: 'Irañeta', eu: 'Irañeta' }),
  igantzi: M('igantzi', { stone: '#8f9599', wall: '#3d8350', marco: '#2350c8', floor: '#82877f', contra: '#a1a39a' }, { es: 'Igantzi', eu: 'Igantzi' }),
  urroz: M('urroz', { stone: '#97694f', wall: '#c99a3e', marco: '#3a3a3a', floor: '#a19d95', contra: '#b9b4a9', chapa: '#2f5a3e', chapaMetal: false }, { es: 'Urroz', eu: 'Urroz' }),
  // (Petilla de Aragón: todo azul, con el remate naranja arriba, los postes y la raya amarillos y el suelo de resina gris azulado)
  petilla: M('erminea', { frontis: '#2c6fc0', wall: '#2c6fc0', marco: '#e8862e', line: '#f2cf3a', mark: '#f2cf3a', floor: '#6c8494', contra: '#8b9ba7', chapa: '#1d4a8a', chapaMetal: false }, { x: { marcoLado: false, fondo: '#dfe4ea' }, es: 'Petilla', eu: 'Petilla' }),
  'navarra-arena': M('pabellon', { frontis: '#2b6a56', wall: '#2b6a56' }, { es: 'el Navarra Arena', eu: 'Navarra Arena' }),
  // ---------- cubiertos de los que hay foto de fuera ----------
  peralta: M('peralta', { frontis: '#4f7f6a', wall: '#4f7f6a', floor: '#8e8a80', contra: '#aaa497' }, { es: 'Peralta', eu: 'Azkoien' }),
  allo: M('iraneta', { frontis: '#4a7a8a', wall: '#4a7a8a', marco: '#d9dde0', floor: '#8c8c88', contra: '#a3a39e', chapa: '#2f4f5e', chapaMetal: false }, { x: { boveda: 'metal', cercha: '#c9ced3', derecha: 'claro', claro: '#e6e3dc', fondo: '#cfcac0' }, es: 'Allo', eu: 'Allo' }),
  bidaurreta: M('urroz', { frontis: '#cfb24a', wall: '#cfb24a', floor: '#9e9a8e', contra: '#b2ad9f', chapa: '#6b5a2a', chapaMetal: false }, { x: { cercha: '#a2a7ad', derecha: 'claro', fondo: '#d9c46a' }, es: 'Bidaurreta', eu: 'Bidaurreta' }),
  berrioplano: M('urroz', { frontis: '#d9902e', wall: '#d9902e', marco: '#c8322c', floor: '#8f8d88', contra: '#a7a49c', chapa: '#9a2a24', chapaMetal: false }, { x: { cercha: '#c8322c', fondo: '#e9c86a', derecha: 'claro', claro: '#e9e4d6' }, es: 'Berrioplano', eu: 'Berriobeiti' }),
  almandoz: M('igantzi', { stone: '#8f8a80', wall: '#3e6a8a', floor: '#8a8d88', contra: '#a19e95', chapa: '#38503f', chapaMetal: false }, { x: { ventanas: 'franja', cercha: '#5a3a22', fondo: '#9a958a' }, es: 'Almandoz', eu: 'Almandoz' }),
  olazagutia: M('erminea', { frontis: '#3f7f55', wall: '#3f7f55', marco: '#b9a77f', floor: '#8b8f8a', contra: '#a4a69e', chapa: '#2f5e40', chapaMetal: false }, { x: { fondo: '#ecebe6', marcoLado: true }, es: 'Olazagutía', eu: 'Olazti' }),
  manueta: M('pabellon', { frontis: '#7f8c96', wall: '#5f6f7d', floor: '#6f7476', contra: '#8a8e8f', chapa: '#3a444c', chapaMetal: true }, { x: { fondo: '#9a9a96', sobre: '#4a4c50', derecha: 'claro', claro: '#b9b7b0' }, es: 'la Mañueta', eu: 'Mañueta' }),
  // (los dos murales: el pelotari verde de Lakuntza y el trinquete azul verdoso de Lekunberri)
  lakuntza: M('iraneta', { frontis: '#5b9a3e', wall: '#5b9a3e', marco: '#f0d03a', line: '#f4f2ec', floor: '#8d918a', contra: '#a3a69e', chapa: '#d8642a', chapaMetal: false }, { x: { boveda: 'metal', cercha: '#3e6e2e' }, es: 'Lakuntza', eu: 'Lakuntza' }),
  lekunberri: M('pabellon', { frontis: '#2f7f86', wall: '#2f7f86', floor: '#646d70', contra: '#7c8588', chapa: '#b8342e', chapaMetal: false, mark: '#f3f2ec' }, { x: { fondo: '#7fa7ad' }, es: 'Lekunberri', eu: 'Lekunberri' }),
  // ---------- al aire libre en la realidad: en el cubierto, sus colores ----------
  areso: M('igantzi', { frontis: '#3c7a5e', wall: '#3c7a5e', floor: '#a7a8a2', contra: '#b5b2a6', chapa: '#2c5c47', chapaMetal: false }, { x: { fondo: '#8f8b82', cercha: '#7a5030' }, aire: true, es: 'Areso', eu: 'Areso' }),
  igal: M('iraneta', { frontis: '#5f9a5a', wall: '#4f8a50', floor: '#8b8c88', contra: '#9e9d97', chapa: '#3d6e40', chapaMetal: false }, { aire: true, es: 'Igal', eu: 'Igari' }),
  lana: M('igantzi', { frontis: '#2e6a50', wall: '#2e6a50', floor: '#8f9592', contra: '#a2a6a2', chapa: '#244e3c', chapaMetal: false }, { x: { cercha: '#4a3424', fondo: '#c9c3b5' }, aire: true, es: 'Galbarra', eu: 'Galbarra' }),
  nazar: M('ziordia', { frontis: '#3f8a55', wall: '#3f8a55', marco: '#9a8466', floor: '#8f918c', contra: '#a6a49a', chapa: '#2e6a42', chapaMetal: false }, { x: { marcoLado: true }, aire: true, es: 'Nazar', eu: 'Nazar' }),
  mirafuentes: M('ziordia', { frontis: '#e8e6e1', wall: '#e8e6e1', floor: '#9b9a96', contra: '#b0aea8', chapa: '#e8661c', chapaMetal: false, mark: '#1f1f1f', line: '#1f1f1f' }, { x: { marcoLado: false }, aire: true, es: 'Mirafuentes', eu: 'Mirafuentes' }),
  mendaza: M('igantzi', { stone: '#9c5a44', wall: '#7c5a48', floor: '#a9a69e', contra: '#b9b3a6', chapa: '#5a3428', chapaMetal: false }, { x: { cercha: '#3e2a1e', fondo: '#b6a48c' }, aire: true, es: 'Mendaza', eu: 'Mendaza' }),
  genevilla: M('urroz', { stone: '#c08c66', wall: '#c9805e', floor: '#a8a49a', contra: '#bcb5a6', chapa: '#7a4a34', chapaMetal: false }, { x: { cercha: '#6a3a2a', fondo: '#e0b48e', derecha: 'claro', claro: '#efe6d8' }, aire: true, es: 'Genevilla', eu: 'Genevilla' }),
  asarta: M('urroz', { frontis: '#d6be78', wall: '#d6be78', marco: '#8c4a38', floor: '#a3a19b', contra: '#b4b0a5', chapa: '#e3d6ad', chapaMetal: false, mark: '#8c4a38' }, { x: { cercha: '#8c4a38', fondo: '#cdb27c' }, aire: true, es: 'Asarta', eu: 'Asarta' }),
  maranon: M('igantzi', { frontis: '#b99c62', wall: '#b99c62', floor: '#b3b0a8', contra: '#c2bdb1', chapa: '#8a7246', chapaMetal: false }, { x: { cercha: '#6a4a2a', fondo: '#d8d0c0', ventanas: 'franja' }, aire: true, es: 'Marañón', eu: 'Marañon' }),
  roncal: M('urroz', { frontis: '#55595d', wall: '#8f908c', floor: '#7d7f80', contra: '#94948f', chapa: '#3a3d40', chapaMetal: false }, { x: { cercha: '#3a3d42', derecha: 'claro', claro: '#d9d8d2', fondo: '#a9a9a4' }, aire: true, es: 'Roncal', eu: 'Erronkari' }),
  leitza: M('urroz', { frontis: '#b3b1aa', wall: '#a9a8a2', floor: '#8a8c8a', contra: '#9a9a94', chapa: '#5a6066', chapaMetal: false }, { x: { cercha: '#8a9096', fondo: '#c9c7c0' }, aire: true, es: 'Leitza', eu: 'Leitza' }),
  sartaguda: M('ziordia', { frontis: '#cdbf9c', wall: '#5c8c5a', floor: '#9d9c96', contra: '#b0ada3', chapa: '#4a7048', chapaMetal: false }, { x: { marcoLado: false, fondo: '#e2d9c2' }, aire: true, es: 'Sartaguda', eu: 'Sartaguda' }),
  cabanillas: M('pabellon', { frontis: '#3c7a52', wall: '#3c7a52', floor: '#93918a', contra: '#a8a497', chapa: '#7a2b22', chapaMetal: false }, { x: { fondo: '#c9b393' }, aire: true, es: 'Cabanillas', eu: 'Cabanillas' }),
  luquin: M('erminea', { frontis: '#4b7b50', wall: '#4b7b50', marco: '#a89a80', floor: '#8e8d88', contra: '#a39f94', chapa: '#3a5e3e', chapaMetal: false }, { x: { marcoLado: true, fondo: '#d6cfbf' }, aire: true, es: 'Luquin', eu: 'Luquin' }),
  fontellas: M('peralta', { stone: '#a8744e', wall: '#b07a50', floor: '#a49c90', contra: '#b8ab97', chapa: '#6a3a26', chapaMetal: false }, { x: { fondo: '#b8825a' }, aire: true, es: 'Fontellas', eu: 'Fontellas' }),
  irurita: M('peralta', { stone: '#8a8378', wall: '#5f7a66', floor: '#8c8e8b', contra: '#a09c92', chapa: '#4a4a44', chapaMetal: false }, { x: { fondo: '#a39d92' }, aire: true, es: 'Irurita', eu: 'Irurita' }),
};
// el cubierto de cada pueblo, sin repetir ninguno (y casi siempre de su tierra). Los nueve de los campeonatos con
// imagen de su cancha en «Elige tu frontón» (src/assets/frontones-juego/<pueblo>-cubierto.webp) mantienen el suyo salvo
// Sangüesa, Estella y Puente la Reina, que compartían el de Urroz o el de Isaba con otros
export const MODELO_TOWN = {
  // Bidasoa y Baztan
  elizondo: 'iraneta', lesaka: 'igantzi', etxalar: 'almandoz', 'amaiur-maya-del-baztan': 'irurita', ituren: 'urroz', zugarramurdi: 'leitza',
  // Larraun y Leitzaldea
  leitza: 'ziordia', lekunberri: 'lekunberri',
  // Cuenca de Pamplona
  pamplona: 'navarra-arena', irulegi: 'berrioplano',
  // Pirineo
  'isaba-izaba': 'isaba', 'erronkari-roncal': 'roncal', 'otsagabia-ochagavia': 'igal', aribe: 'lana', 'burgui-burgi': 'luquin', 'orreaga-roncesvalles': 'areso',
  // Prepirineo y Sangüesa
  aoiz: 'nazar', sanguesa: 'petilla', lumbier: 'genevilla', javier: 'mirafuentes',
  // Sakana
  'altsasu-alsasua': 'olazagutia', irurtzun: 'lakuntza',
  // Tierra Estella
  estella: 'allo', viana: 'maranon',
  // Valdizarbe
  'puente-la-reina': 'bidaurreta', artajona: 'asarta',
  // Zona Media
  tafalla: 'sartaguda', olite: 'manueta', ujue: 'mendaza',
  // Ribera
  tudela: 'cabanillas', cortes: 'fontellas', marcilla: 'peralta',
};
// (un pueblo que no esté en la lista, uno de su comarca)
const MODELO_COMARCA = { bidasoa: 'igantzi', pirineo: 'isaba', 'larraun-leitzaldea': 'ziordia', sakana: 'iraneta', pamplona: 'navarra-arena', prepirineo: 'urroz', sanguesa: 'petilla', 'tierra-estella': 'allo', 'valdizarbe-novenera': 'bidaurreta', 'zona-media': 'sartaguda', ribera: 'cabanillas', 'ribera-alta': 'peralta' };
/** El modelo (clave de MODELOS) del cubierto de un pueblo (su def de data/levels.js). */
export const arqDe = (def = {}) => MODELO_TOWN[def.id] || MODELO_COMARCA[def.comarca] || 'navarra-arena';
/** Los colores de la cancha de cada modelo. */
export const ARQ_LOOK = Object.fromEntries(Object.entries(MODELOS).map(([k, m]) => [k, m.look]));
/** La foto del frontón de verdad de cada modelo y cómo se dice en la tarjeta de «Elige tu frontón»: «Como el de Isaba»
 *  (o, si el de verdad es al aire libre, «Con los colores del de Areso»). */
export const ARQ_REF = Object.fromEntries(Object.entries(MODELOS).map(([k, m]) => [k, [k,
  m.aire ? `Con los colores del de ${m.es}` : /^el /.test(m.es) ? `Como ${m.es}` : `Como el de ${m.es}`,
  m.aire ? `${euDe(m.eu)}aren koloreekin` : `${euDe(m.eu)}aren antzekoa`]]));
// (el lugar con su -ko del euskera: Izabako, Azkoiengo, Urrozko…; la Mañueta, Mañuetako; el Navarra Arena, tal cual)
function euDe(n) {
  if (/Arena$/.test(n)) return n;
  const ult = n.slice(-1).toLowerCase();
  return n + (/[aeiou]/.test(ult) ? 'ko' : /[nl]/.test(ult) ? 'go' : 'ko');
}
