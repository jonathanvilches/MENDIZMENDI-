// src/ui/pantalla.js
// LA PANTALLA DE JUEGO (18 de noviembre de 2026, tarde; el autor, con una captura del móvil donde la portada, el texto y
// «Jugar» se tocaban: «hay muy poco espacio», y que se ordene como los juegos de deportes del móvil). Las pantallas de
// elegir a pantalla entera llevan todas el mismo orden, con la identidad del juego (sus colores y sus letras):
//   - arriba, una barra: el botón de atrás, redondo, a la izquierda; el antetítulo y el título; y a la derecha lo que
//     acompaña (las txapelas, el frontón)
//   - en medio, lo que se elige (el anillo, el cuadro, el pelotari), con un hueco fijo por arriba y por abajo: nunca
//     pegado a las barras
//   - abajo, a la izquierda lo que toca en la portada de delante y, a la derecha, el botón grande, al alcance del pulgar
// Antes, «Salir», el texto, «Jugar» y el frontón iban los cuatro en la fila de abajo, pegada a la portada.
const ATRAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
/** El botón de atrás, suelto, para las cabeceras que ya tienen su forma (las del fútbol). a: su data-a; atras: su nombre */
export const ptAtras = ({ a = 'back', atras = 'Volver' } = {}) => `<button type="button" class="pt-atras" data-a="${a}" aria-label="${atras}" title="${atras}">${ATRAS}</button>`;
/** La barra de arriba. a: lo que devuelve el botón de atrás (data-a); atras: su nombre para quien no ve; der: html de la derecha;
 *  notr: los textos ya vienen en su idioma (false: que los traduzca i18n, como el resto del panel); cls: clases de más */
export const ptCabecera = ({ a = 'back', atras = 'Volver', kicker = '', titulo = '', der = '', notr = true, cls = '' }) => `<div class="pt-top${cls ? ' ' + cls : ''}"${notr ? ' data-notr' : ''}><button type="button" class="pt-atras" data-a="${a}" aria-label="${atras}" title="${atras}">${ATRAS}</button><div class="pt-tit"><small>${kicker}</small><h2>${titulo}</h2></div>${der ? `<div class="pt-der">${der}</div>` : ''}</div>`;
/** La barra de abajo: a la izquierda, lo que toca (c3-que: una línea fuerte y otra fina, que en el anillo rellena la
 *  portada de delante; con ronda, también sus puntos; info: su html, si la pantalla lo trae ya escrito) y, a la derecha,
 *  los botones (el principal, .go, el último) */
export const ptPie = ({ ronda = false, botones = '', notr = true, info = '' }) => `<div class="pt-pie"${notr ? ' data-notr' : ''}><div class="c3-info" aria-live="polite">${info || '<div class="c3-que"><b></b><span></span></div>'}${ronda ? '<span class="c3-ronda"></span>' : ''}</div><div class="pt-acc">${botones}</div></div>`;

/** Los estilos de la pantalla de juego (una vez). Sirven a cualquier panel de lgPanel a pantalla entera: su tarjeta lleva
 *  la clase pt-pant (o c3-pant, la del anillo, que ya trae lo suyo) y dentro van ptCabecera, el contenido (pt-medio, que
 *  se queda con el alto que sobra) y ptPie. Abajo, el hueco hasta la barra de inicio del iPhone nunca baja de 8 px.
 *  pt-libre: solo quita el marco de ventana, para las pantallas que traen su propia rejilla (el cuadro del torneo) */
export const CSS_PANTALLA = `
.lg-card.c3-pant,.lg-card.pt-pant{gap:clamp(12px,3.8vh,28px);padding:clamp(4px,1.2vh,12px) clamp(6px,1.4vw,20px) clamp(8px,2.2vh,16px)}
.lg-card.pt-pant,.lg-card.pt-libre{width:100%;max-width:none;background:none;border:0;box-shadow:none;border-radius:0}
.lg-card.pt-pant{height:100%;max-height:none;overflow:hidden;display:flex;flex-direction:column}
.lg-card.pt-pant::before,.lg-card.pt-pant::after,.lg-card.pt-libre::before,.lg-card.pt-libre::after{display:none}
.pt-medio{flex:1 1 auto;min-height:0;min-width:0}
.pt-top{flex:none;display:flex;align-items:center;gap:clamp(10px,1.6vw,18px);min-height:44px;min-width:0}
.pt-atras{flex:none;width:44px;height:44px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .15s}
.pt-atras svg{width:22px;height:22px}.pt-atras:hover{background:rgba(255,255,255,.18)}
.pt-tit{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}
.pt-tit small{color:var(--rosa,#ff7ac8);font:800 var(--fs-xs,11px)/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-tit small:empty{display:none}
.pt-tit h2{margin:0;font:400 clamp(20px,5.6vh,36px)/1 var(--f-display,'MZ Display'),sans-serif;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-der{flex:none;display:flex;align-items:center;gap:10px;min-width:0}
.pt-der .cp-total{margin-left:0}.pt-der .tq-sede{margin:0}
.pt-pie{flex:none;display:flex;align-items:center;justify-content:space-between;gap:clamp(12px,2.4vw,28px);min-height:52px;min-width:0}
.pt-pie .c3-info{display:flex;align-items:center;flex:1 1 auto;justify-content:flex-start;flex-wrap:nowrap;gap:clamp(10px,1.6vw,18px);min-width:0;min-height:0;text-align:left}
.pt-pie .c3-info .c3-que{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-width:0;gap:3px}
.pt-pie .c3-info .c3-que b{font:800 clamp(16px,4.4vh,24px)/1.05 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.pt-pie .c3-info .c3-que span{display:block;max-width:none;color:#d9cdef;font-size:clamp(12px,3.4vh,16px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-pie .c3-ronda{flex:none}
.pt-acc{flex:none;display:flex;align-items:center;gap:10px;min-width:0}
.pt-acc .lg-btn{min-height:48px;white-space:nowrap}
.pt-acc .lg-btn.go{min-width:clamp(170px,24vw,280px);min-height:52px;font-size:clamp(19px,5vh,26px)}
@media (min-height:600px){.pt-top{min-height:52px}.pt-atras{width:48px;height:48px}.pt-pie{min-height:60px}.pt-acc .lg-btn.go{min-height:58px}}
/* de pie: el título, a la medida del ancho y en dos líneas si hace falta; el pie, apilado (lo que toca y, debajo, los botones) */
@media (orientation:portrait){.pt-tit h2{font-size:clamp(20px,6.4vw,32px);white-space:normal;text-wrap:balance}.pt-pie{flex-direction:column;align-items:stretch;gap:12px}.pt-pie .c3-info{justify-content:center;text-align:center}.pt-pie .c3-info .c3-que{align-items:center;text-align:center}.pt-pie .c3-info .c3-que b,.pt-pie .c3-info .c3-que span{white-space:normal}.pt-acc .lg-btn{flex:1 1 0;min-width:0}.pt-acc .lg-btn.go{flex:1.6 1 0;min-width:0}.pt-der .cp-total small{display:none}.pt-top:not(.tq-top) .pt-der .tq-sede>span:first-child{display:none}}
`;
let puesto = false;
export function cssPantalla() { if (puesto || typeof document === 'undefined') return; puesto = true; const st = document.createElement('style'); st.textContent = CSS_PANTALLA; document.head.appendChild(st); }
