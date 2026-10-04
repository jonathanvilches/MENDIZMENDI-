// El horizonte real de cada pueblo: con las coordenadas del pueblo, su altitud y las de los montes de Navarra
// (mountains.json, más el Moncayo, que se ve desde la Ribera) se calcula, dirección a dirección, con qué ángulo se ve
// la sierra más alta (la curvatura de la Tierra incluida). El juego levanta sus montes para que desde la plaza se
// vean en la misma dirección y con el mismo ángulo que en la realidad, aunque las distancias del juego sean menores.
import MOUNTAINS from './mountains.json';
import SETTLEMENTS from './settlements.json';

// altitud de cada pueblo del juego (m) y coordenadas de los que no están en settlements.json
const ALT = {
  lesaka: 77, etxalar: 100, zugarramurdi: 220, 'amaiur-maya-del-baztan': 260, ituren: 160, elizondo: 196, leitza: 470,
  lekunberri: 560, 'orreaga-roncesvalles': 952, aribe: 700, 'otsagabia-ochagavia': 765, 'isaba-izaba': 813,
  'erronkari-roncal': 723, 'burgui-burgi': 640, 'altsasu-alsasua': 532, irurtzun: 440, pamplona: 450, aoiz: 500,
  lumbier: 467, irulegi: 620, sanguesa: 404, estella: 420, viana: 470, 'puente-la-reina': 346, artajona: 425,
  tafalla: 426, javier: 450, ujue: 815, olite: 380, marcilla: 290, tudela: 264, cortes: 250,
};
const COORD = { irulegi: [42.78, -1.523] };
// montes que se ven desde Navarra y no están en la lista de ascensiones
const EXTRA = [{ name: 'Moncayo', altitude: 2314, lat: 41.787, lon: -1.84 }];
// lomas sin nombre que cierran el horizonte cerca del pueblo (grados), según la comarca
const BASE = { atlantic: 5, pyrenean: 6, central: 1.4, city: 1.6, ribera: 0.5 };

const first = (n) => n.split(' /')[0].split('-')[0].trim().toLowerCase();
const rad = (d) => d * Math.PI / 180;

/** tangente del ángulo del horizonte real en 360 direcciones (índice = rumbo en grados desde el norte), o null */
export function skylineFor(def) {
  const s = COORD[def.id] || SETTLEMENTS.find(s => first(s[2]) === first(def.name));
  const alt0 = ALT[def.id];
  if (!s || alt0 == null) return null;
  const [lat0, lon0] = s, out = new Float32Array(360);
  // lomas cercanas: un fondo suave e irregular (desde un alto se ven más bajas)
  const base = (BASE[def.family] ?? 2) * (def.relief === 'hilltop' ? 0.35 : 1);
  let ph = 0; for (const c of def.id) ph = (ph * 31 + c.charCodeAt(0)) % 997;
  for (let b = 0; b < 360; b++) {
    const a = rad(b), n = 0.55 + 0.3 * Math.sin(a * 2 + ph) + 0.2 * Math.sin(a * 5 + ph * 1.7) + 0.1 * Math.sin(a * 11 + ph * 0.3);
    out[b] = Math.tan(rad(base * Math.max(0.15, n)));
  }
  for (const m of [...MOUNTAINS, ...EXTRA]) {
    const dy = rad(m.lat - lat0) * 6371e3, dx = rad(m.lon - lon0) * 6371e3 * Math.cos(rad(lat0));
    // (los montes a menos de 2,5 km ya son las laderas del valle del propio pueblo, que el juego dibuja aparte)
    const d = Math.hypot(dx, dy); if (d < 2500 || d > 110e3) continue;
    const dh = m.altitude - alt0 - d * d / (2 * 6371e3) * 0.87;   // curvatura (con la refracción del aire)
    if (dh <= 0) continue;
    const tE = Math.min(Math.tan(rad(18)), dh / d), bear = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    // anchura del monte vista desde el pueblo: su falda mide unas dos veces y media su altura sobre el pueblo
    const w = Math.max(2, Math.atan(Math.min(9000, Math.max(1500, dh * 2.5)) / d) * 180 / Math.PI);
    for (let k = -Math.ceil(w); k <= Math.ceil(w); k++) {
      const b = (Math.round(bear) + k + 360) % 360, u = Math.abs(k) / w; if (u >= 1) continue;
      const v = tE * Math.pow(Math.cos(u * Math.PI / 2), 1.4);
      if (v > out[b]) out[b] = v;
    }
  }
  return out;
}

// Bardenas Reales: rumbo (grados desde el norte) y distancia (km) desde el pueblo hasta su centro, para levantar las
// mesas y cabezos solo hacia donde están de verdad
export function bardenasFrom(def) {
  const s = COORD[def.id] || SETTLEMENTS.find(s => first(s[2]) === first(def.name));
  if (!s) return null;
  const dy = rad(42.19 - s[0]) * 6371, dx = rad(-1.50 - s[1]) * 6371 * Math.cos(rad(s[0]));
  return { bearing: (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360, km: Math.hypot(dx, dy) };
}
