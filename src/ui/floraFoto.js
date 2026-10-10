// Fotos reales de las plantas de la guía de campo: de cada una, la planta entera (o su flor) y su hoja, para que la ficha
// sea una imagen de referencia de verdad y no un dibujo inventado. Son fotos de iNaturalist con licencia CC0 (dominio
// público, sin obligación de citar; se cita igualmente a quien la hizo), de observaciones de Europa revisadas por la
// comunidad («grado de investigación»). En WebP, como las láminas: los visores de HTML del iPhone no siempre enseñan
// AVIF. En la web, de 720 px (cada una se descarga al verla); en el archivo único, de 380 px, para no pasar de su tamaño
// (el alias @flora-fotos de vite.config.js elige la carpeta). Autores: src/assets/flora/fotos.json; enlaces:
// legal/fotos-flora.csv.
//   floraFoto('boj') → { planta, hoja, cr: { planta, hoja } } (o null si no hay foto: entonces la ficha usa la lámina
//   dibujada de siempre)
import FOTOS from '../assets/flora/fotos.json';

const URLS = Object.fromEntries(Object.entries(import.meta.glob('@flora-fotos/*.webp', { eager: true, query: '?url', import: 'default' })).map(([k, v]) => [k.split('/').pop(), v]));
const url = (id, k) => URLS[`${id}-${k}.webp`] || null;

export function floraFoto(id) {
  const F = FOTOS[id]; if (!F) return null;
  const planta = url(id, 'planta'); if (!planta) return null;
  return { planta, hoja: url(id, 'hoja'), cr: { planta: F[0] || '', hoja: F[1] || '' } };
}
/** El pie de foto: quién la hizo y su licencia. */
export const floraCredito = (autor) => autor ? `Foto: ${autor} · iNaturalist · CC0` : 'Foto: iNaturalist · CC0';
