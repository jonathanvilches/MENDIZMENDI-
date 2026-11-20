// src/ui/fondoSuave.js
// FONDOS DIFUMINADOS SIN FILTRO (20 de noviembre de 2026). Los fondos de lámina desenfocados (el de los menús de los
// campeonatos, .sport-bg, y el del menú, .hub-bg) eran la imagen grande con `filter: blur(…)` a pantalla entera: el
// navegador vuelve a desenfocarla en cada fotograma en que algo se mueve encima, y con el carrusel de campeonatos
// delante la página se quedaba en 1-4 fotogramas por segundo (medido: sin ese fondo, 54-60). Aquí la imagen se reduce una
// sola vez a unos pocos píxeles (64 de ancho): al estirarla, el navegador la suaviza solo y queda igual de difuminada,
// pero ya es una imagen quieta que no cuesta nada. El gris y el brillo, si hacen falta, también van hechos en ella.

const HECHAS = new Map();

/**
 * La imagen u, reducida y lista para usar de fondo difuminado (una dirección data:). o: { ancho = 64, gris = 0..1,
 * brillo = 1, saturacion = 1 }. Si no se puede (la imagen no carga), rechaza: quien la usa pone la de siempre.
 */
export function fondoSuave(u, o = {}) {
  const { ancho = 64, gris = 0, brillo = 1, saturacion = 1 } = o, k = `${u}|${ancho}|${gris}|${brillo}|${saturacion}`;
  if (HECHAS.has(k)) return HECHAS.get(k);
  const p = new Promise((res, rej) => {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => {
      try {
        const w = ancho, h = Math.max(1, Math.round(w * img.naturalHeight / Math.max(1, img.naturalWidth)));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
        // (en dos pasos, para que la reducción promedie y no salgan pixeles sueltos: primero a 4 veces y luego al final)
        const m = document.createElement('canvas'); m.width = w * 4; m.height = h * 4;
        const mx = m.getContext('2d'); mx.imageSmoothingEnabled = true; mx.imageSmoothingQuality = 'high';
        mx.drawImage(img, 0, 0, m.width, m.height); x.drawImage(m, 0, 0, w, h);
        if (gris || brillo !== 1 || saturacion !== 1) {
          const d = x.getImageData(0, 0, w, h), a = d.data;
          for (let i = 0; i < a.length; i += 4) {
            let r = a[i], g = a[i + 1], b = a[i + 2]; const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const s = saturacion * (1 - gris);   // (gris 1: todo a su luminosidad; saturación >1: más color)
            r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s;
            a[i] = Math.min(255, r * brillo); a[i + 1] = Math.min(255, g * brillo); a[i + 2] = Math.min(255, b * brillo);
          }
          x.putImageData(d, 0, 0);
        }
        res(c.toDataURL('image/jpeg', 0.9));
      } catch (e) { rej(e); }
    };
    img.onerror = () => rej(new Error('fondo: no carga ' + u));
    img.src = u;
  });
  p.catch(() => HECHAS.delete(k));
  HECHAS.set(k, p);
  return p;
}
