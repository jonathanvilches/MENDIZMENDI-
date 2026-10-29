// La tarjeta gráfica del ordenador y la calidad que le va (main.js), que también mira el mapa del menú (src/hub/mapa3d.js)
// para ir más ligero en las gráficas flojas. El nombre de la gráfica se apunta en el navegador: preguntarlo obliga a crear
// un contexto WebGL aparte y soltarlo, y eso, en cada arranque, costaba (en la prueba, más de medio segundo). Si cambia el
// navegador, se vuelve a preguntar; y con el juego ya en marcha se comprueba con su propio contexto (apuntaGpu)
const K = 'herrizherri-gpu';
let nombre = null, calidad = null;
const lee = (gl) => { const ext = gl.getExtension('WEBGL_debug_renderer_info'); return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ''); };
const guarda = () => { try { localStorage.setItem(K, JSON.stringify({ ua: navigator.userAgent, r: nombre })); } catch (e) { } };
export function gpuNombre() {
  if (nombre !== null) return nombre;
  try { const g = JSON.parse(localStorage.getItem(K) || 'null'); if (g && g.ua === navigator.userAgent && typeof g.r === 'string') return (nombre = g.r); } catch (e) { }
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    nombre = gl ? lee(gl) : ''; gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (e) { nombre = ''; }
  guarda(); return nombre;
}
/** Con el contexto del juego ya creado: si la gráfica no es la apuntada (otro portátil con el mismo navegador, la gráfica
 *  dedicada que se enciende o se apaga), se apunta la de verdad para el próximo arranque. */
export function apuntaGpu(gl) {
  try { const r = lee(gl); if (r && r !== nombre) { nombre = r; guarda(); } } catch (e) { }
  // (si ya no es la gráfica del procesador, por ejemplo porque Windows le da a Chrome la NVIDIA, fuera la vista corta y
  // el mapa ligero que se apuntaron con la floja: runtime.acortaVista)
  try { if (/nvidia|geforce|quadro|radeon rx|radeon pro|arc\(tm\) a\d|intel\(r\) arc/i.test(nombre || '')) localStorage.removeItem('herrizherri-vista-corta'); } catch (e) { }
}
// ordenador: alta con una tarjeta gráfica de verdad; media con las gráficas del procesador buenas (Intel Iris y Arc, las
// Radeon de los procesadores AMD, GeForce MX) o con pocos núcleos; baja con las Intel UHD y HD de siempre (en un portátil
// con una UHD el pueblo iba a 4-8 imágenes por segundo en media) y sin aceleración gráfica. Si en este ordenador el juego
// ya tuvo que aligerarse solo (runtime.lighten: slow), un escalón menos
export function calidadOrdenador(slow) {
  const r = gpuNombre();
  if (/swiftshader|llvmpipe|software|microsoft basic/i.test(r)) return 'low';
  const arc = /arc(\(tm\))? a\d/i.test(r), intel = /intel/i.test(r) && !arc;
  const igpu = intel || /radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|radeon(\(tm\))? \d{3}m\b|geforce mx/i.test(r);
  const q = intel && !/iris/i.test(r) ? 'low' : igpu || (navigator.hardwareConcurrency || 8) <= 4 ? 'mid' : 'high';
  return slow ? { high: 'mid', mid: 'low', low: 'low' }[q] : q;
}
/** La calidad con la que va el juego (main.js la fija al arrancar): el mapa del menú va más ligero en la baja. */
export const fijaCalidad = (q) => { calidad = q; };
export const calidadJuego = () => calidad;
