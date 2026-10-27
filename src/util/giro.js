// Al girar el móvil, el iPhone avisa del cambio de tamaño (resize) a veces antes de tener la medida nueva de la pantalla,
// y luego ya no vuelve a avisar: el lienzo del juego y los paneles se quedaban con la medida de antes (media pantalla en
// negro, botones fuera de sitio). Tras cada giro o cambio de tamaño se vuelve a mirar unas cuantas veces durante un
// segundo y medio y, si la medida ha cambiado, se avisa otra vez a todos (un resize más).
if (typeof window !== 'undefined') {
  let w = innerWidth, h = innerHeight, ts = [];
  const mira = () => { if (innerWidth !== w || innerHeight !== h) { w = innerWidth; h = innerHeight; dispatchEvent(new Event('resize')); } };
  const luego = () => { ts.forEach(clearTimeout); ts = [80, 250, 500, 900, 1500].map(t => setTimeout(mira, t)); };
  addEventListener('resize', () => { w = innerWidth; h = innerHeight; luego(); });
  addEventListener('orientationchange', luego);
  screen.orientation?.addEventListener?.('change', luego);
  window.visualViewport?.addEventListener('resize', luego);
}
