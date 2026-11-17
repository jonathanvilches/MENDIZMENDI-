// Qué pelotaris salen en los partidos: los de siempre (el pelotari de Meshy, de la familia del explorador, con su
// versión de chica en actors/chicas.js) o los nuevos (17 de noviembre de 2026: un chico y una chica de 19-20 años con el
// estilo de las ilustraciones de las portadas de los campeonatos; entrega/pelotaris-nuevos). El autor quiere mantener
// los dos y que cada jugador elija («mantener todos los personajes pelotaris y que el usuario pueda elegir entre el
// antiguo, el que es como el explorador, y estos nuevos»). Se elige en Ajustes (hub/hub.js) y vale para todos los
// pelotaris del partido, el tuyo y los rivales, para que la cancha no mezcle los dos estilos.
//
// Cada pelotari nuevo va en dos archivos, uno por color de camiseta, como pelotari.glb y pelotari_rojo.glb: el chico de
// azul (pelotari_nuevo) y de colorado (pelotari_nuevo_rojo), y la chica de colorado (pelotari_nueva) y de azul
// (pelotari_nueva_azul). Mientras falte el archivo, sale el de siempre; sin ninguno nuevo, el ajuste ni se ve.
const K = 'pelotaris-estilo';
export const NUEVOS = { chico: { azul: 'pelotari_nuevo', rojo: 'pelotari_nuevo_rojo' }, chica: { azul: 'pelotari_nueva_azul', rojo: 'pelotari_nueva' } };
// (los que hay en la carpeta de los personajes de Meshy; solo los nombres: no se carga nada hasta el partido)
const HAY = new Set(Object.keys(import.meta.glob('@meshy-full/pelotari_nuev*.glb')).map(p => p.split('/').pop().replace('.glb', '')));
/** ¿Está ya alguno de los pelotaris nuevos en el juego? */
export const hayNuevos = () => HAY.size > 0;
/** El estilo elegido: 'nuevo' o 'clasico' (el de siempre; también si los nuevos aún no están) */
export const estiloElegido = () => { try { return hayNuevos() && localStorage.getItem(K) === 'nuevo' ? 'nuevo' : 'clasico'; } catch (e) { return 'clasico'; } };
export const ponEstilo = (v) => { try { localStorage.setItem(K, v === 'nuevo' ? 'nuevo' : 'clasico'); } catch (e) { /* sin almacenamiento */ } };
/** El modelo nuevo de un pelotari con esa camiseta ('azul' o 'rojo'), chico o chica; null si toca el de siempre */
export function modeloNuevo(color, chica = false) {
  if (estiloElegido() !== 'nuevo') return null;
  const m = NUEVOS[chica ? 'chica' : 'chico'][color === 'rojo' ? 'rojo' : 'azul'];
  return HAY.has(m) ? m : null;
}
