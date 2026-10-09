// Marcos que siguen las esquinas en ángulo. Las cajas del estilo deportivo cortan sus esquinas con clip-path, y un
// borde normal se queda sin pintar en el corte: el borde «sin terminar» (la línea acaba de golpe en la esquina). Aquí
// cada caja con borde y esquinas en ángulo lleva su marco dibujado entero, con las diagonales, como border-image (un
// SVG que se adapta al tamaño de la caja). No cambia el fondo de nadie ni usa ::before ni ::after, que ya tienen uso.
//   · cut: dos esquinas cortadas (arriba a la izquierda y abajo a la derecha), de c px: tarjetas y paneles
//   · skew: paralelogramo, con los lados inclinados k px: botones, chips y etiquetas
// Cada regla repite el color del borde de su caja (el borde de siempre queda debajo, sin verse).
const num = (n) => +n.toFixed(2);
function rgbA(c) {
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (m) return [`rgb(${m[1]},${m[2]},${m[3]})`, m[4] == null ? 1 : +m[4]];
  return [c, 1];
}
const url = (body, color, w) => {
  const [rgb, a] = rgbA(color);
  // (todo el marco en un grupo con su transparencia: así las esquinas, donde se tocan dos líneas, no salen más oscuras)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'><g fill='none' stroke='${rgb}' stroke-width='${w}' opacity='${a}'>${body}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
// (las líneas van media línea por dentro del borde de la caja, para que el recorte no se coma la mitad)
function cut(c, color, w = 1) {
  const h = num(w / 2), s = num(c + w / 2), d = num(c + w * 0.707);
  return url(`<line x1='${s}' y1='${h}' x2='100%' y2='${h}'/><line x1='${h}' y1='${s}' x2='${h}' y2='100%'/><line x1='0' y1='${d}' x2='${d}' y2='0'/>`
    + `<svg x='100%' y='100%' overflow='visible'><line x1='-${h}' y1='-${s}' x2='-${h}' y2='-99999'/><line x1='-${s}' y1='-${h}' x2='-99999' y2='-${h}'/><line x1='0' y1='-${d}' x2='-${d}' y2='0'/></svg>`, color, w);
}
function skew(k, color, w = 1) {
  const h = num(w / 2), o = num(w * 0.6);
  return url(`<line x1='${k}' y1='${h}' x2='100%' y2='${h}'/><line x1='${num(k + o)}' y1='0' x2='${o}' y2='100%'/>`
    + `<svg x='100%' y='0' overflow='visible'><line x1='-${o}' y1='0' x2='-${num(k + o)}' y2='100%'/></svg>`
    + `<svg x='100%' y='100%' overflow='visible'><line x1='-${k}' y1='-${h}' x2='-99999' y2='-${h}'/></svg>`, color, w);
}
const LILA = (a) => `rgba(201,178,255,${a})`, FX = '#ff2bd6';
// [selector, forma, tamaño, color del borde, grosor]
const RULES = [
  ['.sport .sp-shine', cut, 18, LILA(0.25)], ['.lg-card', cut, 18, LILA(0.2)], ['.csel2', cut, 18, LILA(0.22)],
  ['.bigmap', cut, 16, LILA(0.2)], ['.pel-card', cut, 16, LILA(0.25)], ['.fb-card', cut, 16, LILA(0.25)],
  ['.tq-tile', cut, 14, LILA(0.25)], ['.tq-m', cut, 6, LILA(0.22)], ['.tq-m.me', cut, 6, FX],
  ['.csel2 .cstrip button img', cut, 10, LILA(0.25), 2], ['.csel2 .cstrip button.on img', cut, 10, FX, 2],
  ['.lg-btn:not(.go)', skew, 10, LILA(0.3)], ['.pel-go.alt', skew, 10, 'rgba(190,160,255,.35)'], ['.fb-alt', skew, 10, 'rgba(190,160,255,.35)'],
  ['.clist button', skew, 8, LILA(0.16)], ['.clist button:hover', skew, 8, FX], ['.pc-tabs button:not([aria-selected=true])', skew, 8, LILA(0.3)],
  ['.abil', skew, 8, 'rgba(255,122,200,.35)'],
  ['.fr-chip:not(.on)', skew, 6, LILA(0.3)], ['.sp-stat', skew, 6, LILA(0.3)], ['.crole', skew, 6, LILA(0.35)],
];
let done = false;
export function startFrames() {
  if (done || typeof document === 'undefined') return; done = true;
  const st = document.createElement('style'); st.id = 'mz-frames';
  // (con :root delante: gana al «border:» de las hojas de cada pantalla, que se cargan después y lo borrarían)
  st.textContent = RULES.map(([sel, f, n, c, w]) => `:root ${sel}{border-image:${f(n, c, w || 1)} 0 fill / 0 / 0 stretch}`).join('\n');
  document.head.appendChild(st);
}
