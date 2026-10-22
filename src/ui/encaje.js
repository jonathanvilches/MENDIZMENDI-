// Ninguna palabra partida ni cortada. Los textos que pueden partir una palabra larga para no salirse de su caja
// (overflow-wrap: anywhere o break-word) y los que se cortan con «…» (text-overflow: ellipsis) bajan la letra, poco a
// poco, hasta que cada palabra cabe entera y el texto se lee completo (como mucho hasta el 65 % y nunca por debajo de
// 12 px, la letra más pequeña que se lee bien en el móvil). Si con eso no basta, el texto con «…» pasa a ocupar dos
// líneas. Mira lo que se añade a la página, lo que se enseña después de crearse escondido, y lo vuelve a mirar todo al
// cambiar el tamaño de la ventana.
const MIN = 12, BAJA = 0.65;

// una palabra que empieza en una línea y acaba en la siguiente (partir por un guion, una barra o un espacio vale)
function partida(e) {
  for (const n of e.childNodes) {
    if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
    for (const m of n.nodeValue.matchAll(/[^\s\-‐–—/·]{2,}/gu)) {
      const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      const tops = [...rg.getClientRects()].filter(q => q.width > 0.5).map(q => q.top);
      if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 3) return true;
    }
  }
  return false;
}
const conPuntos = (e) => e.scrollWidth > e.clientWidth + 1;
const texto = (e) => [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());

// (lo que se crea escondido y se enseña después, sin añadir nada a la página: se ajusta cuando por fin tiene tamaño)
// (y lo que se quita de la página sin llegar a verse se deja de esperar)
let espera = null; const esperando = new Set();
const deja = (e) => { espera.unobserve(e); esperando.delete(e); };
const alAparecer = (e) => { espera ||= new ResizeObserver((L) => { for (const x of L) if (x.target.offsetWidth) { deja(x.target); ajusta(x.target); } }); espera.observe(e); esperando.add(e); };
const limpia = () => { for (const e of esperando) if (!e.isConnected) deja(e); };

function ajusta(e) {
  if (e instanceof SVGElement) return;
  if (e.dataset.encaje !== undefined) { e.style.fontSize = e.dataset.encaje === '-' ? '' : e.dataset.encaje; e.style.whiteSpace = ''; delete e.dataset.encaje; }   // (otra vez desde su letra de siempre, también la que le haya puesto otro)
  const s = getComputedStyle(e), ow = s.overflowWrap, puntos = s.textOverflow === 'ellipsis';
  const malo = puntos ? () => conPuntos(e) : (ow === 'anywhere' || ow === 'break-word' || s.wordBreak === 'break-all') && texto(e) ? () => partida(e) : null;
  if (!malo) return;
  if (!e.offsetWidth) { if (e.isConnected && (puntos ? e.textContent.trim() : true)) alAparecer(e); return; }
  if (!malo()) return;
  const f0 = parseFloat(s.fontSize), fin = Math.max(MIN, f0 * BAJA);
  e.dataset.encaje = e.style.fontSize || '-';
  for (let f = f0 - 1; f >= fin && malo(); f--) e.style.fontSize = f + 'px';
  if (puntos && malo()) e.style.whiteSpace = 'normal';   // (aun así no cabe: mejor en dos líneas que cortado)
}
/** Ajusta los textos de root y los de dentro. */
export function encaja(root = document.body) {
  if (root.nodeType !== 1 || root.closest('svg')) return;
  ajusta(root);
  for (const e of root.querySelectorAll('*')) if (!/^(svg|path|g|canvas|img|script|style|select|option)$/i.test(e.tagName)) ajusta(e);
}

/** Vigila la página: lo que se añade se ajusta entero; si solo cambia el texto de algo, ese algo (así, lo que se
 *  repinta a cada momento al jugar cuesta poco). */
export function vigilaEncaje() {
  const nuevos = new Set(), cambiados = new Set(); let raf = 0;
  const run = () => { raf = 0; limpia(); const L = [...nuevos]; nuevos.clear(); for (const r of L) if (r.isConnected && !L.some(o => o !== r && o.contains(r))) encaja(r);
    for (const e of cambiados) if (e.isConnected && !L.some(o => o.contains(e))) ajusta(e); cambiados.clear(); };
  const pide = () => { if (!raf) raf = requestAnimationFrame(run); };
  // (lo que cambia se ajusta enseguida, antes de pintarse: nunca se llega a ver cortado; el cambio de tamaño, al fotograma)
  new MutationObserver((ms) => { for (const m of ms) { if (m.target.nodeType === 1 && m.target !== document.body) cambiados.add(m.target); for (const n of m.addedNodes) if (n.nodeType === 1) nuevos.add(n); } run(); })
    .observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', () => { nuevos.add(document.body); pide(); });
  document.fonts?.addEventListener?.('loadingdone', () => { nuevos.add(document.body); pide(); });   // (con la letra ya cargada, que es más ancha que la de mientras)
}
