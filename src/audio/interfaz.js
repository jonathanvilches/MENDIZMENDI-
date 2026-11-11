// Los sonidos de las pantallas que no ponían los suyos: los partidos de pelota y de fútbol (sus paneles, el sorteo, la
// ficha, la pausa, la Gran final) y los campeonatos (los paneles de liga y torneo, lg-root). El menú y los pueblos ya
// suenan por su cuenta (hub.js, ui.js). Todo con los sonidos grabados del juego (src/assets/sonidos: el toque, el de
// abrir, el de la carta, la magia y la fanfarria) y, para hablar, solo la voz grabada por el autor (pelota/voz.js): si
// la frase aún no está grabada, no se dice nada (noviembre de 2026; las frases que faltan, en VOZ_INTERFAZ).
// Se escucha en el documento (un toque y lo que aparece), así cada pantalla no tiene que acordarse de sonar.
//   sonidosInterfaz(sound)   (una vez, al arrancar: main.js)
import { Voz } from '../pelota/voz.js';
import { duoElegido } from '../util/comentarios.js';
import { isEU } from '../i18n.js';

// dónde suenan los toques (las pantallas que no ponen los suyos) y dónde no: los botones del juego (golpe, cortada,
// dejada, pase, tiro y la palanca), que ya tienen el suyo, el del golpe o el del balón
const RAICES = '.pel-root, .lg-root, .pz-fondo, .pfx, .gf, .fb-root, .champ';
const NO = '.pel-btns, .pel-stick, .fb-btns, .fb-stick, .fb-joy';
const BOTON = 'button, [role="button"], [role="tab"], [role="switch"], [role="radio"]';

/** Las frases para grabar de estas pantallas (clave → cuándo suena y qué dice), las mismas del guion de grabación. */
export const VOZ_INTERFAZ = {
  granfinal: { cuando: 'Al empezar la Gran final, con «GRAN FINAL» en pantalla', es: ['¡Gran final! Hoy se juega la txapela.', '¡Llega la gran final! Los dos mejores, frente a frente.'], eu: ['Finala handia! Gaur txapela jokatzen da.', 'Iritsi da finala! Bi onenak, aurrez aurre.'] },
  sorteo: { cuando: 'Al salir el sorteo del saque', es: ['Vamos con el sorteo: ¿quién saca primero?', 'Se sortea el saque.'], eu: ['Goazen zozketara: nork aterako du lehenik?', 'Sakea zozketatzen da.'] },
  txapela: { cuando: 'Al ganar un campeonato (la txapela)', es: ['¡Txapeldun! ¡La txapela es tuya!', '¡Campeón! ¡Qué campeonato!'], eu: ['Txapeldun! Txapela zurea da!', 'Txapeldun! Hau txapelketa!'] },
  reto: { cuando: 'Al acabar un reto con las tres estrellas', es: ['¡Tres estrellas! ¡Perfecto!', '¡Reto superado, de diez!'], eu: ['Hiru izar! Primeran!', 'Erronka gaindituta, hamarreko!'] },
};
let voz = null;
const decir = (k) => {
  const v = duoElegido(); if (v === 'no' || !VOZ_INTERFAZ[k]) return;
  const n = VOZ_INTERFAZ[k].es.length, i = 1 + Math.floor(Math.random() * n), lang = isEU() ? 'eu' : 'es';
  try { (voz ||= new Voz()).habla({ id: `${k}-${i}`, texto: VOZ_INTERFAZ[k][lang][i - 1], r: 'n', voz: v, lang }); } catch (e) { /* sin audio */ }
};

export function sonidosInterfaz(sound) {
  if (!sound || typeof document === 'undefined') return;
  const ui = (k) => { try { sound.ui(k); } catch (e) { /* sin audio */ } };
  const tarde = (ms, fn) => setTimeout(fn, ms);
  // un toque en un botón de esas pantallas
  document.addEventListener('click', (e) => {
    const b = e.target?.closest?.(BOTON); if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
    if (!b.closest(RAICES) || b.closest(NO)) return;
    ui('click');
  }, true);
  // lo que aparece: las ventanas, con el de abrir; la ficha de un pelotari, con el de la carta; la Gran final, con la
  // fanfarria, la magia de la txapela y la carta de cada finalista cuando llegan (granFinal.js: 1 y 1,6 s)
  const visto = new WeakSet();
  const mira = (n) => {
    if (n.nodeType !== 1 || visto.has(n)) return; visto.add(n);
    const c = n.classList;
    if (c.contains('gf')) { sound.fanfare?.(); tarde(1000, () => sound.magic?.()); tarde(1600, () => ui('card')); decir('granfinal'); return; }
    if (c.contains('champ')) { tarde(2600, () => decir('txapela')); return; }   // (la fanfarria y la grada ya las pone champion.js)
    if (c.contains('pfx')) { ui('card'); return; }
    if (c.contains('pel-toss')) { ui('open'); decir('sorteo'); return; }
    if (c.contains('pel-panel')) {
      const est = n.querySelectorAll('.pel-estrellas i.on').length;
      if (est) { [0, 1, 2].slice(0, est).forEach(i => tarde(250 + i * 180, () => ui('coin'))); if (est === 3) tarde(900, () => decir('reto')); }
      // (si a la vez se va otra —la misma ventana que se rehace al cambiar una opción—, ya ha sonado el toque: sin el de abrir)
      else if (!n.parentNode?.querySelector('.pel-panel.pel-fuera')) ui('open');
      return;
    }
    if (c.contains('lg-root') || c.contains('pz-fondo')) ui('open');
  };
  new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) mira(n); }).observe(document.body, { childList: true, subtree: true });
}
