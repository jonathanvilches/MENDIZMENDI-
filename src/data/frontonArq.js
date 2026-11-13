// La arquitectura del frontón cubierto de cada sede de los campeonatos (pelota/court.js, ARQ), sacada de las fotos de
// frontones de verdad del capítulo «Frontones de Navarra» (src/assets/frontones). Cada sede, con la de un frontón real de
// su tierra: Elizondo, la bóveda de madera de Irañeta; Lesaka, las cerchas de madera de Igantzi (de las mismas Cinco
// Villas); Leitza y Tafalla, el frontis de sillería en su marco azul de Ziordia; Estella, el Erminea de Isaba; Sangüesa y
// Puente la Reina, las cerchas rojas de Urroz; Marcilla, la nave en dientes de sierra de Peralta, su vecina; Iruña, el
// pabellón moderno. Los demás pueblos, la de su comarca.
export const ARQ_TOWN = { pamplona: 'pabellon', elizondo: 'iraneta', lesaka: 'igantzi', leitza: 'ziordia', tafalla: 'ziordia', estella: 'erminea', sanguesa: 'urroz', 'puente-la-reina': 'urroz', marcilla: 'peralta' };
const ARQ_COMARCA = { bidasoa: 'igantzi', pirineo: 'erminea', 'larraun-leitzaldea': 'ziordia', sakana: 'iraneta', pamplona: 'pabellon', prepirineo: 'urroz', sanguesa: 'urroz', 'tierra-estella': 'erminea', 'valdizarbe-novenera': 'urroz', 'zona-media': 'ziordia', ribera: 'peralta', 'ribera-alta': 'peralta' };
/** La arquitectura del cubierto de un pueblo (su def de data/levels.js). */
export const arqDe = (def = {}) => ARQ_TOWN[def.id] || ARQ_COMARCA[def.comarca] || 'pabellon';
// los colores de la cancha de cada modelo, como en su foto, con el contraste que pide la pelota (fronton.js los pasa por
// legible: lo que es más claro de la cuenta se oscurece sin cambiar de tono). frontis: hormigón pintado; stone: sillería;
// marco: la franja de encima del frontis y de la pared izquierda (y su lado derecho en los que la llevan); line: las
// rayas (amarillas en Isaba e Irañeta)
export const ARQ_LOOK = {
  pabellon: {},
  erminea: { frontis: '#8e9295', wall: '#3f8a4a', marco: '#1d4fc4', line: '#f2cf3a', floor: '#7c8782', contra: '#9ea6a1' },
  ziordia: { stone: '#a68d66', wall: '#1f55b5', marco: '#1d4fc4', floor: '#868b88', contra: '#a3a7a4' },
  iraneta: { frontis: '#5a9a48', wall: '#5a9a48', marco: '#e9c43b', line: '#f2cf3a', floor: '#8a8e86', contra: '#a5a79f' },
  igantzi: { stone: '#8f9599', wall: '#3d8350', marco: '#2350c8', floor: '#82877f', contra: '#a1a39a' },
  urroz: { stone: '#97694f', wall: '#c99a3e', marco: '#3a3a3a', floor: '#a19d95', contra: '#b9b4a9' },
  peralta: { frontis: '#4f7f6a', wall: '#4f7f6a', floor: '#8e8a80', contra: '#aaa497' },
};
// la foto del frontón de verdad en que se basa cada una (su clave en data/frontones.js) y cómo se dice en la tarjeta de
// «Elige tu frontón»: «Como el de Isaba»
export const ARQ_REF = {
  erminea: ['isaba', 'Como el de Isaba', 'Izabakoaren antzekoa'],
  ziordia: ['ziordia', 'Como el de Ziordia', 'Ziordiakoaren antzekoa'],
  iraneta: ['iraneta', 'Como el de Irañeta', 'Irañetakoaren antzekoa'],
  igantzi: ['igantzi', 'Como el de Igantzi', 'Igantzikoaren antzekoa'],
  urroz: ['urroz', 'Como el de Urroz', 'Urrozkoaren antzekoa'],
  peralta: ['peralta', 'Como el de Peralta', 'Azkoiengoaren antzekoa'],
};
