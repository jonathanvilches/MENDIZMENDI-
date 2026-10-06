// Reparto original de MENDIMENDIZ: la cuadrilla de exploradores.
// Cada personaje es un niño o niña de un rincón de Navarra con su tradición, su carácter y su habilidad.
// stats: [Resistencia, Fuerza, Agilidad, Orientación, Naturaleza]
// los personajes elegibles y Leire, el aspecto de reserva (figura sencilla) si un modelo no puede cargarse
export const CAST_ALL = [
  // los personajes que se eligen (modelos propios de Meshy): el sanferminero, el pastor, el futbolista y el
  // pelotari. En el encierro cualquiera de ellos corre vestido de San Fermín, en El Sadar juega con la camiseta de
  // Iruña y en el frontón se pone de pelotari
  { id: 'sanfermin', name: 'Fermín', from: 'Iruña / Pamplona', role: 'Sanferminero', tagline: 'No se pierde ni un chupinazo', glb: true, meshy: true,
    desc: 'Lleva el pañuelo rojo y la faja desde el chupinazo del 6 de julio. Se sabe las canciones de las peñas y cada curva del recorrido del encierro, de la cuesta de Santo Domingo a la plaza.',
    ability: 'Fiestero: la gente de los pueblos le saluda y le ayuda antes', stats: [80, 60, 90, 80, 70], color: '#d42f2f',
    look: { height: 1.5, skin: '#f1c4a0', hair: '#4a2a16', hairStyle: 'short', shirt: '#f7f3ea', pants: '#f7f3ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#f0e8d4', espadrille: true, laces: '#d42f2f', face: 'grin' } },
  { id: 'pastor', name: 'Joxe', from: 'Urbasa', role: 'Pastor', tagline: 'Conoce cada senda de la sierra', glb: true, meshy: true,
    desc: 'Sube con las ovejas latxas a los pastos de Urbasa y Andia con su txapela y su makila. Sabe leer el tiempo en las nubes y encontrar el camino entre la niebla del hayedo.',
    ability: 'Buen pastor: los animales se dejan acercar más', stats: [90, 70, 65, 90, 90], color: '#5a4a3a',
    look: { height: 1.6, skin: '#e2b08a', hair: '#3a2a20', hairStyle: 'short', shirt: '#efe9dc', vest: '#6a2228', pants: '#3a2a20', scarf: '#d42f2f', txapela: '#1d1d24', shoes: '#5a3a22', boots: true, face: 'smile' } },
  { id: 'osasuna', name: 'Iker', from: 'Iruña / Pamplona', role: 'Futbolista de Iruña', tagline: 'Juega en El Sadar cada domingo', glb: true, meshy: true,
    desc: 'Entrena con el equipo de Iruña y no falla a un partido en El Sadar. Corre más que nadie y siempre lleva la camiseta roja.',
    ability: 'Atleta: corre más rato sin cansarse', stats: [95, 70, 85, 65, 60], color: '#c8102e',
    look: { height: 1.6, skin: '#f1c4a0', hair: '#2a1a12', hairStyle: 'short', shirt: '#c8102e', pants: '#14213d', shoes: '#1d1d24', face: 'grin' } },
  { id: 'pelotari', name: 'Patxi', from: 'Baztan', role: 'Pelotari', tagline: 'Golpea la pelota con la mano', glb: true, meshy: true,
    desc: 'Juega a pelota a mano en el frontón de su pueblo desde pequeño. Tiene buenas manos, buen ojo y no se rinde nunca en un tanto.',
    ability: 'Buen golpe: en el frontón le cuesta menos llegar a la pelota', stats: [85, 90, 80, 65, 60], color: '#2a5aa8',
    look: { height: 1.62, skin: '#e2b08a', hair: '#1d1d24', hairStyle: 'short', shirt: '#2a6ac8', pants: '#f7f3ea', shoes: '#f0e8d4', face: 'smile' } },
  { id: 'leire', name: 'Leire', from: 'Iruña / Pamplona', role: 'Sanferminera', tagline: 'Siempre llega la primera',
    desc: 'Corre más que nadie por las calles de Pamplona. Lleva su pañuelo rojo desde el 6 de julio hasta que se le olvida quitárselo.',
    ability: 'Sprint: corre más rápido durante un rato', stats: [70, 55, 95, 70, 55], color: '#d42f2f',
    look: { child: true, height: 1.36, skin: '#f3cfae', hair: '#6b3a1e', hairStyle: 'ponytail', hairTie: '#d42f2f', lashes: true, eyes: '#4a2a14',
      shirt: '#f7f3ea', pants: '#f7f3ea', sash: '#d42f2f', scarf: '#d42f2f', shoes: '#f0e8d4', espadrille: true, laces: '#d42f2f', face: 'grin', freckles: true, pose: 'hips', browStyle: 'arched', tilt: 0.08, body: 'slim' } },
];
// avatares elegibles: los personajes propios de Meshy
export const CAST = CAST_ALL.filter(c => c.meshy);
export const castById = (id) => CAST.find(c => c.id === id) || CAST[0];
export const STAT_LABELS = ['Resistencia', 'Fuerza', 'Agilidad', 'Orientación', 'Naturaleza'];
