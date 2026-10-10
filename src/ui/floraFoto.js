// Fotos reales de las plantas de la guía de campo: de cada una, la planta entera (o su flor) y su hoja, para que la ficha
// sea una imagen de referencia de verdad y no un dibujo inventado. Son fotos de iNaturalist con licencia CC0 (dominio
// público, sin obligación de citar; se cita igualmente a quien la hizo), de observaciones de Europa revisadas por la
// comunidad («grado de investigación»), en AVIF para que pesen poco: en la web, de 720 px (cada una se descarga al
// verla); en el archivo único, de 380 px, para no pasar de su tamaño (el alias @flora-fotos de vite.config.js elige la
// carpeta). Autores: src/assets/flora/fotos.json; enlaces: legal/fotos-flora.csv.
//   floraFoto('boj') → { planta, hoja, cr: { planta, hoja } } (o null si no hay foto o el navegador no lee AVIF: entonces
//   la ficha usa la lámina dibujada de siempre)
import FOTOS from '../assets/flora/fotos.json';

const URLS = Object.fromEntries(Object.entries(import.meta.glob('@flora-fotos/*.avif', { eager: true, query: '?url', import: 'default' })).map(([k, v]) => [k.split('/').pop(), v]));
const url = (id, k) => URLS[`${id}-${k}.avif`] || null;

// ¿lee AVIF este navegador? (Safari desde iOS 16). Hasta saberlo, se da por bueno: casi todos lo leen
let avif = true;
try {
  const im = new Image();
  im.onerror = () => { avif = false; };
  im.onload = () => { avif = im.width > 0; };
  im.src = 'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAOptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAEOAAEAAAAAAAAAHAAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAamlwcnAAAABLaXBjbwAAABNjb2xybmNseAABAA0ABoAAAAAMYXYxQ4EgAgAAAAAUaXNwZQAAAAAAAAACAAAAAgAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEAYIDBAAAACRtZGF0EgAKBzgANhAQ0GkyDxgAAABAALATcJd22xW6wA==';
} catch (e) { avif = false; }
/** ¿Lee AVIF este navegador? */
export const leeAvif = () => avif;

export function floraFoto(id) {
  const F = FOTOS[id]; if (!F || !avif) return null;
  const planta = url(id, 'planta'); if (!planta) return null;
  return { planta, hoja: url(id, 'hoja'), cr: { planta: F[0] || '', hoja: F[1] || '' } };
}
/** El pie de foto: quién la hizo y su licencia. */
export const floraCredito = (autor) => autor ? `Foto: ${autor} · iNaturalist · CC0` : 'Foto: iNaturalist · CC0';
