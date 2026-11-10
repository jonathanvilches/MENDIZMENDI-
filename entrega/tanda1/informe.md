# Tanda 1 · Informe de cierre

10 de noviembre de 2026. Fases 0, 1 y 2. Versión publicada: `Bu1CWFho`. Copia de antes de empezar: rama
`copia-2026-11-10`. La versión con las capturas dentro está en https://claude.ai/artifact/MUEtV2Kn8ZBfqJKVjVrD3L

## 1. Qué cambió, fase por fase

1. Fase 0. Auditoría de la versión publicada: 60 capturas en seis pueblos, medidas, veinticinco hallazgos ordenados y
   presupuesto por escena (`auditoria.md`).
2. Fase 1, luz. Cada comarca tiene su aire y su hora dorada. El atardecer ya no deja el pueblo en negro y la luz no
   salta al pasar a la noche.
3. Fase 1, personajes. Sombreado de gouache en cuatro tonos, luz de borde y línea de contorno en el jugador.
4. Fase 1, atmósfera. Con lluvia el suelo se moja y hay charcos que reflejan el cielo. Un solo viento con rachas mueve
   árboles, humo y banderines. El agua refleja el cielo y lleva espuma dibujada.
5. Fase 1, postprocesado. Un único pase en calidad media y alta, que se apaga en Ajustes.
6. Fase 1, sonido. Al explorar ya no suena una canción continua: frases cortas con timbres de cada comarca y silencio.
7. Fase 2, movimiento. Se trepa, se planea con la capa de pastor y se nada, con un anillo de resistencia. Se monta en
   pottoka o en burro.
8. Fase 2, exploración. Cada pueblo tiene una atalaya, cinco kutxas escondidas y corazones. Las mejoras se ganan.
9. Fase 2, pruebas. Tres herramientas nuevas. Muros: pasa en 32 de 32 pueblos. Puntos de interés: pasa en 17 de 32.
10. No hecho. Las sombras de las casas en calidad baja se probaron y se retiraron: no se veían.

## 2. Capturas antes y después

Mismos puntos de control, calidad baja. `antes/<pueblo>.jpg` y `despues/<pueblo>.jpg`: Lesaka, Isaba, Pamplona,
Estella, Olite y Tudela. Cada hoja: arriba la calle, abajo la plaza desde 22 m; día, atardecer, noche y lluvia.
Además, en `despues/`: `personaje.jpg`, `agua.jpg`, `post.jpg`, `planeo-montura.jpg` y `aventura.jpg`.

## 3. Medidas

Imágenes por segundo: no medidas. Aquí no hay tarjeta gráfica. Se mide lo que decide la fluidez: cuánto se dibuja.

| Pueblo, calidad baja | Triángulos antes | Después | Llamadas antes | Después | Texturas antes | Después |
|---|---|---|---|---|---|---|
| Lesaka | 661 mil | 663 mil | 263 | 265 | 63 MB | 63 MB |
| Isaba | 661 mil | 667 mil | 348 | 350 | 71 MB | 73 MB |
| Pamplona | 714 mil | 717 mil | 375 | 378 | 81 MB | 81 MB |
| Estella | 654 mil | 656 mil | 353 | 354 | 70 MB | 70 MB |
| Olite | 537 mil | 537 mil | 312 | 308 | 65 MB | 65 MB |
| Tudela | 658 mil | 658 mil | 384 | 382 | 72 MB | 72 MB |

Presupuesto de pueblo en baja: 720 mil triángulos, 425 llamadas y 80 MB de texturas. Todos dentro, salvo las
texturas de Pamplona, que ya pasaban por 1 MB antes de la tanda.

| Otras medidas | Antes | Después | Tope |
|---|---|---|---|
| Descarga hasta jugar en Lesaka | 58,4 MB | 54,1 MB | 66,7 MB |
| Descarga hasta jugar en Tudela | 53,9 MB | 54,2 MB | 62,0 MB |
| Código del juego | 1,79 MB | 1,81 MB | |
| Memoria de JavaScript en Lesaka | 50 MB | 50 MB | |
| Lesaka en calidad alta, triángulos | 1,43 millones | 1,43 millones | 1,5 millones |
| Lesaka en calidad alta, llamadas | 363 | 366 | 480 |
| Audio nuevo descargado | | 0 MB | 8 MB |

Pruebas de la fase 2 en los 32 pueblos: `muros.json` (pasan los 32, ningún paso dentro de un muro en unos 15 000
pasos por pueblo) y `puntos-interes.json` (pasan 17; el vacío máximo se cumple en 31, con 35 a 44 segundos; lo que
falla en 14 es ver algo lejano desde cualquier sitio).

## 4. Qué no se ha podido comprobar y por qué

- Las imágenes por segundo, en móvil y en ordenador: aquí el juego se dibuja por programa, a dos por segundo.
- Cómo suena la música en frases: no hay salida de sonido. Sí que calla la canción, suena una frase y la canción
  vuelve en un minijuego.
- El postprocesado en una tarjeta gráfica de verdad.
- Táctil, mando bluetooth y móvil de mando: el movimiento nuevo usa la palanca y el botón de saltar que ya existían,
  pero no se ha probado con un dedo ni con un mando.
- El modo sin conexión: no se han añadido archivos fuera del paquete, pero no se ha repetido la prueba sin red.

## 5. Riesgos y pendientes

- La meta de 55 imágenes por segundo en móvil medio no se alcanza con esta tanda. El juego sostiene unas 30. Llegar a
  55 pide dibujar la mitad o bajar resolución: es una decisión de producto.
- Puntos de interés: la condición de la fase no está cumplida. En pueblos llanos y densos, desde una calle estrecha no
  asoma nada lejano por encima de los tejados.
- Ochagavía no tiene aventura: el valle de Salazar usa otro código de juego.
- Trepar es por cuestas y peñas, no por fachadas ni tejados. Subir a las casas cambia mucho los pueblos: se pregunta
  antes de hacerlo.
- La marca propia va de kutxa en kutxa desde la atalaya. Poner marcas tocando el mapa, pendiente.
- Sombras de las casas en calidad baja: retiradas. La huella guardada de cada casa es menor que sus muros.
- Charcos: en Pamplona salen muchos y muy claros.
- Controles remapeables y alto contraste: no hechos en esta tanda.
- La ropa de los personajes sigue siendo pintura sobre el cuerpo: depende del encargo.

## 6. Lo que tiene que generar el usuario

`encargo-assets.md`: seis personajes con ropa modelada y la capa de pastor, con su bloque de estilo y su prompt
exacto; frases de música grabadas por instrumento; y la voz de las pistas en castellano y euskera.

## 7. La pregunta

¿Apruebas pasar a la tanda siguiente?
