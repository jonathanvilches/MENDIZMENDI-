// Equipos de fútbol de los pueblos de MENDIMENDIZ: cada pueblo juega con un equipo con el nombre del pueblo o del valle.
// Sin nombres, siglas ni escudos de clubes de verdad (marcas registradas): solo el nombre del lugar, colores lisos y el campo
// (cuando consta; si no, «campo municipal»). La «media» es una estimación del juego.
// Los pueblos sin club propio juegan con el de su valle o comarca; donde no hay club de fútbol 11 conocido, el equipo
// es una adaptación (adapt: true) con colores del juego.

export const CLUBS = {
  betigazte: { name: 'Lesaka', short: 'LES', town: 'Lesaka', shirt: '#1f8a3c', shorts: '#f4f4f2', socks: '#1f8a3c', field: 'Mastegi', ovr: 66, group: 'norte' },
  baztan: { name: 'Baztan', short: 'BAZ', town: 'Elizondo', shirt: '#c8222a', shorts: '#1f3a8a', socks: '#18181c', field: 'Giltxaurdi', ovr: 70, group: 'norte' },
  doneztebe: { name: 'Doneztebe', short: 'DON', town: 'Doneztebe', shirt: '#d8262e', shirt2: '#f4f4f2', pattern: 'rayas', shorts: '#f4f4f2', socks: '#d8262e', field: null, ovr: 72, group: 'norte' },
  leitza: { name: 'Leitza', short: 'LEI', town: 'Leitza', shirt: '#1f6a3a', shorts: '#f4f4f2', socks: '#1f6a3a', field: 'Arkiskil', ovr: 60, group: 'norte', adapt: true },
  betikozkor: { name: 'Lekunberri', short: 'LEK', town: 'Lekunberri', shirt: '#1b1b1f', shorts: '#1b1b1f', socks: '#1b1b1f', field: null, ovr: 73, group: 'norte' },
  pirineo: { name: 'Pirineo', short: 'PIR', town: 'valles del Pirineo', shirt: '#2f8f5a', shirt2: '#f4f4f2', pattern: 'rayas', shorts: '#1f3a5a', socks: '#2f8f5a', field: null, ovr: 58, group: 'norte', adapt: true },
  alsasua: { name: 'Altsasu', short: 'ALT', town: 'Altsasu', shirt: '#c8222a', shorts: '#1c2a5a', socks: '#c8222a', field: null, ovr: 66, group: 'norte' },
  xota: { name: 'Irurtzun', short: 'IRT', town: 'Irurtzun', shirt: '#2a5fb5', shorts: '#1c2a5a', socks: '#2a5fb5', field: null, ovr: 62, group: 'norte', adapt: true },
  aoiz: { name: 'Agoitz', short: 'AGO', town: 'Aoiz', shirt: '#c8222a', shorts: '#1c2a5a', socks: '#c8222a', field: null, ovr: 73, group: 'norte' },
  ilumberri: { name: 'Lumbier', short: 'LUM', town: 'Lumbier', shirt: '#f4f4f2', shorts: '#1c2a5a', socks: '#f4f4f2', field: null, ovr: 64, group: 'norte' },
  mutilvera: { name: 'Mutilva', short: 'MUT', town: 'Mutilva', shirt: '#f4f4f2', shorts: '#2a4fa5', socks: '#2a4fa5', field: null, ovr: 76, group: 'norte' },
  cantolagua: { name: 'Sangüesa', short: 'SAN', town: 'Sangüesa', shirt: '#f4f4f2', shirt2: '#2a5fb5', pattern: 'banda', shorts: '#f4f4f2', socks: '#f4f4f2', field: 'Cantolagua', ovr: 74, group: 'sur' },
  izarra: { name: 'Lizarra', short: 'LIZ', town: 'Estella-Lizarra', shirt: '#2a5fb5', shirt2: '#f4f4f2', pattern: 'rayas', shorts: '#2a4fa5', socks: '#2a4fa5', field: 'Merkatondoa', ovr: 76, group: 'sur' },
  vianes: { name: 'Viana', short: 'VIA', town: 'Viana', shirt: '#c8222a', shorts: '#1c2a5a', socks: '#1c2a5a', field: null, ovr: 66, group: 'sur' },
  gares: { name: 'Gares', short: 'GAR', town: 'Puente la Reina', shirt: '#7a1f2e', shirt2: '#f4f4f2', pattern: 'banda', shorts: '#18181c', socks: '#7a1f2e', field: 'Osabidea', ovr: 66, group: 'sur' },
  artajones: { name: 'Artajona', short: 'ART', town: 'Artajona', shirt: '#c8222a', shirt2: '#f4f4f2', pattern: 'rayas', shorts: '#2a4fa5', socks: '#c8222a', field: 'La Alameda', ovr: 68, group: 'sur' },
  penasport: { name: 'Tafalla', short: 'TAF', town: 'Tafalla', shirt: '#2a5fb5', shorts: '#18181c', socks: '#18181c', field: 'San Francisco', ovr: 72, group: 'sur' },
  erriberri: { name: 'Erriberri', short: 'ERR', town: 'Olite', shirt: '#c8222a', shorts: '#2a4fa5', socks: '#c8222a', field: 'San Miguel', ovr: 66, group: 'sur' },
  marcilla: { name: 'Marcilla', short: 'MAR', town: 'Marcilla', shirt: '#2f8f4a', shirt2: '#f4f4f2', pattern: 'rayas', shorts: '#f4f4f2', socks: '#2f8f4a', field: null, ovr: 64, group: 'sur' },
  tudelano: { name: 'Tudela', short: 'TUD', town: 'Tudela', shirt: '#f4f4f2', shorts: '#18181c', socks: '#f4f4f2', field: 'Ciudad de Tudela', ovr: 78, group: 'sur' },
  cortes: { name: 'Cortes', short: 'COR', town: 'Cortes', shirt: '#c8222a', shorts: '#18181c', socks: '#18181c', field: null, ovr: 74, group: 'sur' },
};

// el equipo de cada pueblo del juego (el suyo o el de su valle o comarca)
export const TOWN_CLUB = {
  lesaka: 'betigazte', etxalar: 'betigazte', zugarramurdi: 'baztan', 'amaiur-maya-del-baztan': 'baztan', elizondo: 'baztan', ituren: 'doneztebe',
  leitza: 'leitza', lekunberri: 'betikozkor', 'orreaga-roncesvalles': 'pirineo', aribe: 'pirineo', 'otsagabia-ochagavia': 'pirineo', 'isaba-izaba': 'pirineo',
  'erronkari-roncal': 'pirineo', 'burgui-burgi': 'pirineo', 'altsasu-alsasua': 'alsasua', irurtzun: 'xota', aoiz: 'aoiz', lumbier: 'ilumberri', irulegi: 'mutilvera',
  sanguesa: 'cantolagua', javier: 'cantolagua', estella: 'izarra', viana: 'vianes', 'puente-la-reina': 'gares', artajona: 'artajones', tafalla: 'penasport',
  ujue: 'penasport', olite: 'erriberri', marcilla: 'marcilla', tudela: 'tudelano', cortes: 'cortes',
};
export const clubOfTown = (townId) => CLUBS[TOWN_CLUB[townId]] ? { id: TOWN_CLUB[townId], ...CLUBS[TOWN_CLUB[townId]] } : null;
export const clubById = (id) => CLUBS[id] ? { id, ...CLUBS[id] } : null;

// color del texto del dorsal según la camiseta
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
// los dos con camisetas parecidas: el visitante sale con la segunda equipación (blanca, o azul marino si el de casa va de
// blanco), como en los partidos de verdad
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export function awayKit(H, A) {
  const a = rgb(H.shirt), b = rgb(A.shirt), d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  if (d > 110) return A;
  const white = lum(H.shirt) < 0.6, shirt = white ? '#f4f4f2' : '#1c2a5a';
  return { ...A, shirt, shirt2: null, pattern: 'liso', shorts: white ? '#f4f4f2' : '#1c2a5a', socks: shirt, text: white ? '#16224a' : '#ffffff', second: true };
}
/** El equipo para el partido (lo que espera el motor: nombre, siglas, colores y modelo) a partir de un club. */
export function teamOfClub(id) {
  const c = clubById(id); if (!c) return null;
  const keeper = lum(c.shirt) > 0.5 ? '#f2b01e' : c.shirt === '#1f8a3c' || c.shirt === '#2f8f4a' || c.shirt === '#2f8f5a' || c.shirt === '#1f6a3a' ? '#f2b01e' : '#2a8a3a';
  return { id: 'club:' + id, club: id, name: c.name, short: c.short, shirt: c.shirt, shirt2: c.shirt2 || null, pattern: c.pattern || 'liso', shorts: c.shorts, socks: c.socks,
    text: lum(c.shirt) > 0.55 ? '#16224a' : '#ffffff', model: 'osasuna', recolor: true, keeper, ovr: c.ovr, field: c.field ? `Campo de ${c.field}` : `Campo municipal de ${c.town}`, town: c.town, adapt: !!c.adapt };
}
