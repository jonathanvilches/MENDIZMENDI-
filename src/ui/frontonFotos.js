// Las imágenes de los frontones: las fotos de verdad (src/assets/frontones, Wikimedia Commons, las del capítulo
// «Frontones de Navarra»; autores y licencias en su LICENCIAS.md) y las canchas tal como se juegan en los Campeonatos
// (src/assets/frontones-juego: una imagen de cada una sacada del propio partido, con los pelotaris y el público; así la
// tarjeta de «Elige tu frontón» enseña exactamente la cancha en la que vas a jugar).
const urls = (G) => Object.fromEntries(Object.entries(G).map(([k, u]) => [k.match(/([\w-]+)\.webp$/)[1], u]));
const FOTOS = urls(import.meta.glob('../assets/frontones/*.webp', { eager: true, query: '?url', import: 'default' }));
const CANCHAS = urls(import.meta.glob('../assets/frontones-juego/*.webp', { eager: true, query: '?url', import: 'default' }));
/** La foto de verdad de un frontón (su clave en data/frontones.js) o ''. */
export const fotoFronton = (k) => (k && FOTOS[k]) || '';
/** Una cancha del propio juego por su nombre (los trinquetes inventados de «Frontones»: torneo.js TRINQ_JUEGO) o ''. Las de
 *  los dos trinquetes, pintadas en Higgsfield (GPT Image) a partir de una imagen del propio partido: la misma cancha, el
 *  mismo encuadre, como una foto, vacía y sin letras (el autor: «apóyate en Higgsfield para las imágenes») */
export const canchaFoto = (k) => (k && CANCHAS[k]) || '';
/** La cancha de un pueblo tal como se juega: sede 'plaza', 'cubierto' o 'labrit' (la de Iruña), o ''. */
export const canchaImg = (town, sede) => CANCHAS[sede === 'labrit' ? 'pamplona-labrit' : `${town}-${sede}`] || '';
