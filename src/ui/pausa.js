// La ventana de pausa de los partidos (pelota y fútbol), como la de los juegos de fútbol que mandó el autor de referencia:
// centrada sobre el partido oscurecido, con la cabecera (el título y la equis para seguir) y una fila por opción, con su
// nombre, una línea que dice qué hace y un botón redondo a la derecha. Toda la fila se toca. Los dos partidos la montan
// con estas piezas y la misma hoja (pausa.css), cada uno con sus clases para saber qué fila se ha tocado.
import './pausa.css';

const S = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`;
/** Los iconos de los botones redondos: trazos blancos sobre el degradado del juego */
export const PZ_ICO = {
  seguir: S('<path d="M5 12h13M13 6l6 6-6 6"/>'),
  descanso: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  camara: S('<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.3" r="3.2"/>'),
  ojo: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  fichas: S('<rect x="3.5" y="5" width="10" height="14" rx="1.5"/><path d="M16.5 7.5l3.4 1-3 11.2-4.6-1.2"/>'),
  tactica: S('<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M12 4.5v15M8 9.5h.01M8 14.5h.01M16 12h.01"/>'),
  cambios: S('<path d="M7 4v14M3.5 14.5 7 18l3.5-3.5M17 20V6M13.5 9.5 17 6l3.5 3.5"/>'),
  controles: S('<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7.5 10.5v3M6 12h3M15.5 11h.01M17.5 13h.01"/>'),
  salir: S('<path d="M10 4.5H5.5v15H10M14 8l4 4-4 4M18 12H9"/>'),
  cerrar: S('<path d="M6 6l12 12M18 6 6 18"/>', ' stroke-width="2.8"'),
};
/** La cabecera: el título y la equis (clase pz-x) */
export const pzCabecera = (titulo, cerrar = 'Cerrar') => `<div class="pz-cab"><h2 class="pz-tit">${titulo}</h2><button type="button" class="pz-x" aria-label="${cerrar}">${PZ_ICO.cerrar}</button></div>`;
/** Una fila: { cls (para saber cuál es), titulo, sub (qué hace), ico (de PZ_ICO), extra (lo que va antes del botón), attrs }.
 *  Los textos llegan ya escapados */
export const pzFila = ({ cls = '', titulo, sub = '', ico = PZ_ICO.seguir, extra = '', attrs = '' }) =>
  `<button type="button" class="pz-fila ${cls}" ${attrs}><span class="pz-tx"><b>${titulo}</b><small>${sub}</small></span>${extra}<i class="pz-ico" aria-hidden="true">${ico}</i></button>`;
/** El icono del resultado, delante del título del final, como el de la ventana de resultados de la referencia: el check
 *  del juego (verde sobre amarillo) si ganas y una equis en un aro rosa si no; null (empate), nada */
export const pzResultado = (gana) => gana == null ? '' : `<i class="pz-res ${gana ? 'si' : 'no'}" aria-hidden="true">${gana ? S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', ' stroke-width="3.2"') : S('<path d="M7 7l10 10M17 7 7 17"/>', ' stroke-width="3"')}</i>`;
