// Pantallas del iPhone y del iPad para las pantallas de arranque de la app instalada: ancho y alto en vertical (en puntos
// de CSS) y densidad. Las usan tools/app-iconos.mjs (para dibujarlas) y vite.config.js (para enlazarlas en la web).
export const DISPOSITIVOS = [
  ['iphone-se', 375, 667, 2], ['iphone-8-plus', 414, 736, 3], ['iphone-x', 375, 812, 3], ['iphone-xr', 414, 896, 2],
  ['iphone-xs-max', 414, 896, 3], ['iphone-12', 390, 844, 3], ['iphone-12-pro-max', 428, 926, 3], ['iphone-14-pro', 393, 852, 3],
  ['iphone-14-pro-max', 430, 932, 3], ['iphone-16-pro', 402, 874, 3], ['iphone-16-pro-max', 440, 956, 3],
  ['ipad-mini', 744, 1133, 2], ['ipad-10-2', 810, 1080, 2], ['ipad-air', 820, 1180, 2], ['ipad-air-10-5', 834, 1112, 2],
  ['ipad-pro-11', 834, 1194, 2], ['ipad-pro-12-9', 1024, 1366, 2],
];
/** Las etiquetas link de las pantallas de arranque (las dos orientaciones de cada pantalla) */
export const splashLinks = (base = './splash/') => DISPOSITIVOS.flatMap(([id, w, h, d]) => ['portrait', 'landscape'].map(o =>
  `<link rel="apple-touch-startup-image" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: ${o})" href="${base}${id}-${o === 'portrait' ? 'v' : 'h'}.jpg">`)).join('\n');
