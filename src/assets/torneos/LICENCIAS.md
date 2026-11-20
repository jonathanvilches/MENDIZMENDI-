# Las fotos de las dos cartas de Torneos

Hechas para el juego con Higgsfield la noche del 19 al 20 de noviembre de 2026. El autor: «todos los jugadores deben
tener el mismo tamaño y estar en la misma posición, centrado en la tarjeta», «recuerda que es pelota a mano, no es
pala», «no quiero que haya ni palas ni bolsos por el suelo ni espectadores. Frontón vacío» y «las ampliaciones no me
gustan y encima están sin perspectiva real». Por eso las dos salen de una sola generación cada una, sin ampliar ni
estirar nada: un plano abierto en 4:3, con la cámara a la altura del pecho y la pareja en el centro, de modo que haya
suelo de sobra bajo los pies para cualquier carta.

Van en tres tamaños, en WebP: en esta carpeta a 1000 px de ancho, en `media/` a 1600 y en `hd/` a 2336 (el tamaño de la
generación, sin agrandar). Las encuadra `src/hub/hub.js` (s_sports) con las medidas de cada pareja en la foto (centro,
pies, alto y medio ancho), así que en las dos cartas la pareja mide lo mismo y pisa a la misma altura.

- `pelota.webp`: la pareja de pelotaris del autor (src/assets/pelotaris, la portada de parejas de los campeonatos), con
  camiseta azul y pantalón blanco, de pie y con los brazos cruzados en un frontón cubierto vacío: frontis y pared
  izquierda verdes con sus números, suelo gris, la grada azul a la derecha sin nadie sentado y nada por el suelo.
  Modelo gpt_image_2_6 con la portada de parejas como referencia.
- `futbol.webp`: la pareja de Osasuna del autor (src/assets/jugadores/duo) en el césped del estadio de las láminas de
  deporte (dep-estadio), delante de la portería, con el balón entre los dos y el atardecer detrás. Modelo gpt_image_2_6
  con la pareja como referencia y el mismo encuadre que la de pelota.
