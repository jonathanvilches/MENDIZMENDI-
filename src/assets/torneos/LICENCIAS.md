# Las fotos de las dos cartas de Torneos

Hechas para el juego con Higgsfield la noche del 19 de noviembre de 2026 (el autor: «todos los jugadores deben tener el
mismo tamaño y estar en la misma posición, centrado en la tarjeta» e «intenta integrar mejor con Higgsfield los
jugadores de fútbol en el terreno de juego, en el campo»). Van en tres tamaños, en WebP: en esta carpeta a 1000 px de
ancho, en `media/` a 1600 y en `hd/` a 2800 (pelota) o 2500 (fútbol). Las encuadra `src/hub/hub.js` (s_sports) con
las medidas de cada pareja en la foto.

- `pelota.webp`: la pareja de pelotaris del autor (src/assets/pelotaris, la portada de parejas de los campeonatos) dentro
  del mismo frontón cubierto de aquella portada, con la pared y la grada detrás. Modelo gpt_image_2_6 a partir de la
  portada de parejas (src/assets/pelota/fondos/parejas.webp, ver su LICENCIAS.md), luego ampliada alrededor con la
  herramienta de ampliar (más suelo, techo y grada) y pasada a 4K con la de mejorar.
- `futbol.webp`: la pareja de Osasuna del autor (src/assets/jugadores/duo) en el césped del estadio de las láminas de
  deporte (dep-estadio), delante de la portería, con la luz y las sombras del estadio. Modelo gpt_image_2_6 con esas dos
  imágenes de referencia, luego ampliada a los lados con la herramienta de ampliar y con el césped de abajo alargado a
  mano en perspectiva (cada fila de abajo, algo más estirada), sin inventar nada.
