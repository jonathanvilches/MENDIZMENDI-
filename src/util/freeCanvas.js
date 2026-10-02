// Lienzos 2D que solo sirven para crear una textura del pueblo (paredes del frontón, letreros…): en cuanto la
// textura está en la tarjeta gráfica, el lienzo se encoge a 1×1 px. Safari en iPhone tiene un tope de memoria
// total de lienzos y, si se pasa, deja de crear más y la carga falla. Solo para texturas que no se vuelven a
// subir (se tiran al salir del pueblo) y que no usa otro renderizador.
export function freeCanvasOnUpload(tex) {
  tex.onUpdate = () => {
    const im = tex.image;
    if (im && typeof im.getContext === 'function' && im.width > 1) { im.width = 1; im.height = 1; }
    tex.onUpdate = null;
  };
  return tex;
}
