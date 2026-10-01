// Miradores: desde un punto alto del pueblo, con los prismáticos, se buscan los montes de verdad en su dirección
// real (calculada con las coordenadas del pueblo y de cada cima) y se aprende su nombre, altura y distancia.
import SETTLEMENTS from './settlements.json';
import MOUNTAINS from './mountains.json';

// cimas famosas de fuera de Navarra que se ven desde muchos pueblos
const EXTRA = [
  { id: 'moncayo', name: 'Moncayo', altitude: 2314, lat: 41.787, lon: -1.839, zone: 'Aragón · Sistema Ibérico', intro: 'El monte más alto del Sistema Ibérico. Desde la Ribera se ve en el horizonte, a menudo nevado.' },
  { id: 'anie', name: 'Auñamendi / Pic d\'Anie', altitude: 2504, lat: 42.946, lon: -0.717, zone: 'Pirineo · Béarn', intro: 'La gran pirámide de roca que cierra el Pirineo por el este del valle de Roncal. Para los vascos es un monte de leyendas.' },
];
const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const R = 6371, rad = (d) => d * Math.PI / 180;
function rel(lat0, lon0, lat, lon) {
  const dy = rad(lat - lat0) * R, dx = rad(lon - lon0) * R * Math.cos(rad(lat0));
  const km = Math.hypot(dx, dy), b = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  return { km, dir: DIRS[Math.round(b / 45) % 8], bearing: b };
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
export function townLatLon(lv) {
  const names = (lv.mapName || lv.name).split('/').map(norm);
  const hit = SETTLEMENTS.find(s => names.includes(norm(s[2]))) || SETTLEMENTS.find(s => norm(s[2]).startsWith(names[0]));
  return hit ? { lat: hit[0], lon: hit[1] } : null;
}
// montes que se ven desde un punto: entre 4 y 70 km, los más altos y cercanos, repartidos en direcciones distintas
export function montesFrom(lat, lon, n = 6) {
  const all = [...MOUNTAINS, ...EXTRA].filter(m => m.lat).map(m => ({ m, ...rel(lat, lon, m.lat, m.lon) }))
    .filter(x => x.km > 4 && x.km < (x.m.altitude > 2000 ? 110 : 60))
    .sort((a, b) => b.m.altitude / Math.sqrt(b.km) - a.m.altitude / Math.sqrt(a.km));
  const out = [];
  for (const x of all) { if (out.length >= n) break; if (!out.some(o => Math.abs(((o.bearing - x.bearing + 540) % 360) - 180) < 22)) out.push(x); }
  return out.map(x => ({ id: x.m.id, name: x.m.name, alt: x.m.altName, altitude: x.m.altitude, zone: x.m.zone, intro: x.m.intro, km: x.km, dir: x.dir, bearing: x.bearing }));
}
// pueblos con mirador (y el nombre del mirador cuando lo tiene)
export const MIRADOR_TOWNS = {
  pamplona: 'Mirador del Caballo Blanco', ujue: null, irurtzun: null, artajona: null, estella: null, irulegi: null,
  lekunberri: null, 'isaba-izaba': null, 'orreaga-roncesvalles': null, etxalar: null, tafalla: null, javier: null,
};
