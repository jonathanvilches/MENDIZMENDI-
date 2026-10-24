// Un punto visto desde otro (latitud y longitud en grados): distancia en km, rumbo en grados desde el norte y la
// dirección en palabras. Para los pueblos que se ven desde una cima y los montes que se ven desde un mirador
const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const R = 6371, rad = (d) => d * Math.PI / 180;
export function rel(lat0, lon0, lat, lon) {
  const dy = rad(lat - lat0) * R, dx = rad(lon - lon0) * R * Math.cos(rad(lat0));
  const km = Math.hypot(dx, dy), b = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  return { km, dir: DIRS[Math.round(b / 45) % 8], bearing: b };
}
// Coordenadas geográficas en el mapa de comarcas (el de comarcas.json, viewBox 10 10 725 780)
export const mapaXY = (lat, lon) => [19 + (lon + 2.52) / 1.80 * 709, 17 + (43.325 - lat) / 1.43 * 765];
