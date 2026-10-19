// Pueblos con su trazado de verdad: un JSON por pueblo (tools/pueblo-real.py y tools/pueblo-real-juego.py), que solo se
// descarga al entrar en él. Las casas, calles, ríos, puentes y plazas son de OpenStreetMap (ODbL, por Overture Maps) y el
// relieve de EU-DEM (Copernicus): ver LICENCIA.txt en esta carpeta. Con ?real=0 en la dirección se juega el pueblo
// generado de siempre (para comparar, o si algo fallara).
import { expand } from './compacto.js';
const FILES = import.meta.glob('./*.json', { import: 'default' });
export const REAL_IDS = Object.keys(FILES).map(k => k.slice(2, -5));
export const ATRIBUCION = '© OpenStreetMap contributors (ODbL) · Overture Maps · relieve EU-DEM (Copernicus)';
/** ¿Se juega este pueblo con su trazado de verdad? */
export function realEnabled(id) {
  if (!FILES[`./${id}.json`]) return false;
  try { if (new URLSearchParams(location.search).get('real') === '0') return false; } catch (e) { /* sin dirección */ }
  return true;
}
/** Los datos del pueblo (o null si no se pudieron cargar: entonces se juega el generado). */
export async function loadReal(id) {
  try { return expand(await FILES[`./${id}.json`]()); } catch (e) { console.warn('pueblo real', id, e); return null; }
}
