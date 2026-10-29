// Edad de quien juega: con los más pequeños se quitan las misiones largas, de lectura o de miedo (leyendas de noche con
// persecución, preguntas del sabio, personajes históricos, subidas al monte y talleres de muchos pasos). Los demás las
// tienen todas. Las misiones se guardan por su número en el pueblo, así que cambiar de edad no borra nada.
export const EDADES = [
  { id: 'peque', name: 'Hasta 7 años', text: 'Misiones cortas, sin sustos ni mucha lectura' },
  { id: 'nino', name: 'De 8 a 12 años', text: 'Todas las misiones' },
  { id: 'mayor', name: '13 años o más', text: 'Todas las misiones' },
];
const FUERA = { peque: ['legend', 'quiz', 'figure', 'summit', 'trade'] };
export const edadDe = (p) => EDADES.some(e => e.id === p?.age) ? p.age : 'mayor';
function missionAllowed(m, age) { return !(FUERA[age] || []).includes(m.type) || m.type === 'visit'; }
/** Misiones de un pueblo para esta edad: [{ m, si }] (si: su número en el pueblo, donde se guarda si está hecha) */
// (sin las de pelota: la pelota se juega solo en los campeonatos, no en los pueblos. Se quitan aquí y no de la lista
// del pueblo para que cada misión siga con su número, que es el que guarda la partida)
export function missionSlots(lv, age) { const all = (lv.missions || []).map((m, si) => ({ m, si })).filter(x => x.m.type !== 'pelota'), ok = all.filter(x => missionAllowed(x.m, age)); return ok.length ? ok : all.slice(0, 1); }
