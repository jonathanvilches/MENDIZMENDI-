// Las teclas de una ventana (ficha, premio, minijuego): se atienden pasado un momento, para no cerrarla con la misma
// tecla que la abrió. Se escucha desde el principio y se deja pasar lo que llegue antes: antes se empezaba a escuchar
// con un retraso y, si la ventana se cerraba con el ratón en ese rato, el escuchador se añadía después, ya sin ventana,
// y se tragaba las teclas del juego.
//   const k = windowKeys((e) => …, 300); addEventListener('keydown', k, true);   … al cerrar: removeEventListener('keydown', k, true)
export function windowKeys(fn, ms = 300) {
  const t0 = performance.now();
  return (e) => { if (performance.now() - t0 >= ms) fn(e); };
}
