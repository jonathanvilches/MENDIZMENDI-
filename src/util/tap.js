// Toques que no se pierden en el iPhone. En mitad de un partido la pantalla cambia sin parar (marcador, avisos, energía)
// y Safari a veces se traga el «clic» de un botón: la X para salir del partido de pelota no hacía nada. Aquí el botón
// responde al levantar el dedo sobre el botón en el que se apoyó, igual con el ratón; con el teclado (Intro o espacio
// sobre el botón) y desde el código (boton.click()), con el clic de siempre.
//   tap(caja, (boton, e) => …, 'button')   (la caja puede ser el propio botón o un panel con varios)
export function tap(box, fn, sel = 'button') {
  let down = null;
  box.addEventListener('pointerdown', (e) => { down = e.target.closest(sel); });
  box.addEventListener('pointercancel', () => { down = null; });
  box.addEventListener('pointerup', (e) => {
    const b = e.target.closest(sel), ok = b && b === down && box.contains(b); down = null;
    if (ok) fn(b, e);
  });
  // (el clic que llega después del toque ya está atendido; solo cuenta el del teclado o el del código, que no lleva toque)
  box.addEventListener('click', (e) => { if (e.detail !== 0) return; const b = e.target.closest(sel); if (b && box.contains(b)) fn(b, e); });
}
