// Modo sencillo: para los móviles que cierran la página al arrancar (sin memoria). Calidad gráfica baja y el mapa 3D del
// inicio más ligero (menos resolución, 30 imágenes por segundo y sin la entrada grande). Lo pone el aviso de arranque de
// index.html cuando los dos arranques anteriores no llegaron a acabar ('auto'), el botón «Modo sencillo» de ese aviso ('1')
// o Ajustes; se quita en Ajustes. Si el mapa 3D deja de pintarse con el juego abierto, se vuelve a hacer (inicio.js)
const K = 'herrizherri-sencillo';
export const sencillo = () => { try { return !!localStorage.getItem(K); } catch (e) { return false; } };
/** ¿Este ordenador ya tuvo que acortar la vista en un pueblo? (gráfica floja: runtime.acortaVista). El mapa del inicio,
 *  entonces, también en ligero */
export const graficaFloja = () => { try { return !!localStorage.getItem('herrizherri-vista-corta'); } catch (e) { return false; } };
export function ponSencillo(si) { try { if (si) localStorage.setItem(K, '1'); else localStorage.removeItem(K); } catch (e) { } }
