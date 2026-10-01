// Navarra desde una cima: qué pueblos quedan alrededor (dirección y distancia reales, a partir de las
// coordenadas del monte y de las localidades). Prioriza los pueblos del juego y completa con los más cercanos.
import SETTLEMENTS from './settlements.json';
import { LEVELS } from './levels.js';

const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const R = 6371, rad = (d) => d * Math.PI / 180;
function rel(lat0, lon0, lat, lon) {
  const dy = rad(lat - lat0) * R, dx = rad(lon - lon0) * R * Math.cos(rad(lat0));
  const km = Math.hypot(dx, dy), b = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  return { km, dir: DIRS[Math.round(b / 45) % 8], bearing: b };
}
const first = (n) => n.split(' /')[0].split('-')[0].trim().toLowerCase();
const IN_GAME = new Map();
for (const l of LEVELS) { const k = first(l.name); const s = SETTLEMENTS.find(s => first(s[2]) === k); if (s) IN_GAME.set(s, l); }

export function viewFrom(lat, lon, n = 5) {
  const all = SETTLEMENTS.filter(s => !/^Urbanizaci|^Polígono|^Barrio/.test(s[2])).map(s => ({ s, ...rel(lat, lon, s[0], s[1]) })).filter(x => x.km > 1.5);
  const game = all.filter(x => IN_GAME.has(x.s) && x.km < 45).sort((a, b) => a.km - b.km).slice(0, 3);
  const rest = all.filter(x => !game.includes(x) && x.km < 25).sort((a, b) => a.km - b.km);
  // pueblos cercanos en direcciones distintas, para mirar a todos lados
  const out = [...game];
  for (const x of rest) { if (out.length >= n) break; if (!out.some(o => o.dir === x.dir)) out.push(x); }
  return out.map(x => ({ name: x.s[2], dir: x.dir, km: x.km, bearing: x.bearing, inGame: IN_GAME.has(x.s) }));
}
