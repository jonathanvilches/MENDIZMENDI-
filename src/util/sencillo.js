// Modo sencillo: para los móviles que cierran la página al arrancar (sin memoria) o que no consiguen pintar el mapa 3D.
// Calidad gráfica baja y el mapa del inicio en plano, sin la entrada grande. Lo pone el aviso de arranque de index.html
// cuando los dos arranques anteriores no llegaron a acabar ('auto'), el botón «Modo sencillo» de ese aviso ('1') o
// Ajustes; se quita en Ajustes. Si el mapa 3D falla con el juego ya abierto, pasa a plano solo esa vez (mapa3d.js)
const K = 'herrizherri-sencillo';
export const sencillo = () => { try { return !!localStorage.getItem(K); } catch (e) { return false; } };
export function ponSencillo(si) { try { if (si) localStorage.setItem(K, '1'); else localStorage.removeItem(K); } catch (e) { } }
/** ¿Lo acaba de poner el aviso de arranque, porque el móvil se cerraba? (para avisar una vez) */
export const sencilloAuto = () => !!window.__sencilloAuto;
