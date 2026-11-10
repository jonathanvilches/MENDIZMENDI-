# Tanda 1 · Fase 0 · Auditoría

10 de noviembre de 2026. Versión auditada: la publicada, `B_mvnMyB` (sin cambiar código). Copia de seguridad antes de
empezar: rama `copia-2026-11-10`.

## Qué se ha capturado

Seis pueblos de comarcas distintas, con la misma cámara en dos puntos fijos (a pie de calle desde la puerta, mirando a
la plaza, y desde 22 m de alto sobre la plaza) y en cuatro condiciones (12 h, 19:10, 23 h y lluvia a las 12 h):
Lesaka (Bidasoa, atlántica), Isaba (Pirineo), Pamplona (Cuenca), Estella (Tierra Estella), Olite (Zona Media) y
Tudela (Ribera). Además, el frontón de Lesaka en partido, el estadio, el encierro, dos deportes rurales (aizkolari y
harrijasotzaile) y cuatro personajes de cerca.

La herramienta que las repite siempre igual es `tools/puntos-control.mjs`; las de después se hacen con la misma.

| Hoja | Archivo |
|---|---|
| Lesaka | `antes/lesaka.jpg` |
| Isaba | `antes/isaba-izaba.jpg` |
| Pamplona | `antes/pamplona.jpg` |
| Estella | `antes/estella.jpg` |
| Olite | `antes/olite.jpg` |
| Tudela | `antes/tudela.jpg` |
| Lesaka y Olite en calidad alta, día y tarde | `antes/calidad-alta-lesaka-olite.jpg` |
| Aizkolari, harrijasotzaile y personajes de cerca | `antes/rural-y-personajes.jpg` |
| Frontón, estadio y encierro | `antes/fronton-estadio-encierro.jpg` |

Cada hoja de pueblo: arriba la calle, abajo la vista alta; de izquierda a derecha, día, tarde, noche y lluvia.

## Medidas

Lo que pinta cada pueblo en calidad baja (la del móvil), el peor de sus ocho puntos de control, y su memoria gráfica
con el perfil del iPhone (`tools/presupuesto-pueblo.mjs`, 844 × 390 a ×3):

| Pueblo | Triángulos | Llamadas de dibujo | Texturas | Geometría |
|---|---|---|---|---|
| Lesaka | 661 mil | 263 | 63 MB | 26 MB |
| Isaba | 661 mil | 348 | 71 MB | 27 MB |
| Pamplona | 714 mil | 375 | **81 MB** | 25 MB |
| Estella | 654 mil | 421 | 70 MB | 25 MB |
| Olite | 537 mil | 312 | 65 MB | 21 MB |
| Tudela | 668 mil | 403 | 72 MB | 32 MB |

En calidad alta, Lesaka pinta 1,43 millones de triángulos y 363 llamadas; Olite, 876 mil y 378.

Descarga y memoria de JavaScript (`tools/memoria-web.mjs`, móvil emulado, calidad media):

| Paso | Descarga acumulada | Memoria JS |
|---|---|---|
| Menú de inicio | 18 a 24 MB | 13 MB |
| Lesaka | 58 MB | 50 MB |
| Pamplona | 54 MB | 44 MB |
| Tudela | 54 MB | 40 MB |

Un pueblo añade entre 30 y 40 MB a lo del menú. Las piezas mayores: cuatro paquetes de texturas del pueblo (1,5 a
2,2 MB cada uno), el código (1,8 MB) y el personaje (0,5 a 1,2 MB). El audio grabado del juego entero son 7,9 MB en
8 archivos, que se oyen según llegan y no se cargan enteros en memoria.

Tiempo de carga y fluidez. En este entorno no hay tarjeta gráfica: el juego se dibuja por programa a unas 2 imágenes
por segundo, así que **ni los fps ni los tiempos de carga de aquí valen como medida**. Lo único medido en aparatos de
verdad son los informes que guardó el juego el 28 y el 29 de octubre, con una versión anterior:

| Aparato | Pantalla | Fluidez |
|---|---|---|
| Portátil con Intel UHD | Menú | 13,7 imágenes por segundo de mediana |
| Portátil con Intel UHD | Pueblo | 6,4 de mediana |
| iPhone | Menú | unas 28 |

Y hay un dato del propio código: en calidad baja el juego ajusta la resolución para sostener **32 imágenes por
segundo**, no 55. La meta de 55 a 60 en móvil medio no es la que el juego persigue hoy.

## Los 10 mayores defectos visuales

Ordenados por impacto frente a esfuerzo: primero lo que más mejora con menos trabajo.

1. **El atardecer deja el pueblo casi negro** bajo un cielo rosa, en baja y en alta. Con el sol rasante no llega luz al
   suelo ni a los tejados y la luz del cielo es poca. Unos minutos después la luz salta de golpe del poniente a la luna.
   Impacto muy alto, esfuerzo bajo.
2. **Todas las comarcas tienen la misma luz.** Tudela y Lesaka comparten cielo, sol y tono de sombra; solo cambia el
   suelo. No hay hora dorada propia. Impacto alto, esfuerzo bajo.
3. **Los personajes no se despegan del fondo:** sombreado liso, sin luz de borde ni línea; a contraluz son una mancha.
   Impacto alto, esfuerzo bajo.
4. **Con lluvia el suelo no se moja:** solo baja la luz. Ni brillo ni charcos. Impacto medio, esfuerzo bajo.
5. **No hay aire entre lo cercano y lo lejano.** Las colinas del fondo tienen el mismo contraste que las casas; no hay
   bruma en el valle ni sombras de nubes. Impacto alto, esfuerzo medio.
6. **En calidad baja las casas no proyectan sombra** y parecen posadas encima del suelo. En el móvil es lo que más
   aplana la imagen. Impacto alto, esfuerzo medio.
7. **De noche, las ventanas son rectángulos amarillos planos**, todas del mismo tono y sin resplandor; en Tudela, un
   ventanal entero de un solo color. Impacto medio, esfuerzo medio.
8. **Hierba y adoquín planos y repetidos** en los planos largos: se ve el dibujo de la textura repetirse en las
   plazas. Impacto medio, esfuerzo medio.
9. **Las plazas se ven vacías desde arriba:** poca gente, pocos puestos, ningún punto que llame desde lejos.
   Impacto alto, esfuerzo alto (es trabajo de la Fase 2 y de la 5).
10. **La primera imagen al entrar suele ser una pared.** En Isaba y en Tudela la cámara de la puerta mira a una
    fachada a dos metros. Impacto medio, esfuerzo medio.

## Los 5 mayores problemas de coherencia de personajes

1. **Un solo cuerpo y una sola cara para todos los avatares.** El de San Fermín, el de Osasuna y el pelotari son el
   mismo niño con otra pintura. Es lo que señalas: cambian los colores, no el personaje.
2. **La ropa es pintura sobre la piel.** No tiene volumen: ni cuello, ni pliegues, ni faja con grosor, ni boina
   posada. Por eso se ve impuesta. No se arregla con texturas: hacen falta modelos nuevos con la ropa modelada.
3. **Tres familias de figuras conviven sin unificar:** los avatares de Meshy (cabezones, de juguete), los vecinos de
   minifigura y los animales de Quaternius, cada uno con su sombreado. Los animales ya se acercaron en noviembre;
   vecinos y avatares, no.
4. **Las manos y los complementos no encajan:** el pelotari lleva las vendas pintadas, las herramientas flotan junto
   a la mano y no hay barba, boina ni cayado propios de cada uno.
5. **Los deportes rurales los hace un niño vestido de San Fermín en un campo vacío.** Ni el personaje ni el sitio
   cuentan qué es un aizkolari: falta plaza, público, tronco de verdad y un cuerpo de adulto fuerte.

## Las 5 mayores distancias entre el juego y la meta

1. **Movimiento.** Hoy se anda, se corre y se salta. No se trepa, no se planea, no se nada (el agua honda es un muro)
   y no se monta. Una cuesta de más de 51 grados para al jugador en seco. Es la mayor distancia con un juego de
   exploración.
2. **Motivos para explorar.** Las misiones llevan de la mano con una ruta en el mapa. Fuera de ellas no hay nada que
   encontrar: ni atalayas, ni tesoros, ni retos que se vean desde lejos.
3. **Fluidez.** 55 a 60 imágenes por segundo en móvil medio contra las 28 a 32 que el juego sostiene hoy.
4. **Personajes.** La meta pide personajes con indumentaria propia y orgánica; hoy son variaciones de pintura.
5. **Sonido.** La música es una pista grabada que suena de continuo. La meta pide frases cortas, silencios con
   ambiente y un timbre por comarca.

## Los 5 riesgos técnicos

1. **La meta de 55 imágenes por segundo no es alcanzable solo con arte.** Con 540 a 714 mil triángulos y 260 a 420
   llamadas por imagen, un móvil medio da unas 30. Llegar a 55 pide bajar a la mitad lo que se dibuja o la
   resolución. Es una decisión de producto que te planteo al cerrar la tanda. Mientras tanto, la regla que aplico es
   **no añadir coste en calidad baja**.
2. **Aquí no se puede medir la fluidez.** Sin tarjeta gráfica, solo mido lo que se dibuja (triángulos, llamadas,
   memoria), que es lo que la determina. La cifra real tiene que salir de tu móvil y de tu ordenador.
3. **Pamplona ya pasa el tope de memoria de texturas del iPhone** (81 MB de 80). Cualquier textura nueva en la
   ciudad la saca del presupuesto.
4. **Los sombreadores retocados a mano.** El terreno, las casas, los personajes y el agua modifican los de three.js
   por sustitución de texto. Cada efecto nuevo es otro parche sobre lo mismo y un fallo deja un material en negro en
   un móvil concreto. Se prueba cada uno por separado y con interruptor.
5. **El guardado y el modo sin conexión.** Las mecánicas nuevas guardan datos nuevos (mejoras, atalayas, marcas). Se
   añaden como campos nuevos del perfil `herrizherri-perfil-v1`, sin tocar los existentes, y cada archivo nuevo tiene
   que entrar en la lista del service worker.

## Presupuesto por escena

Fijado a partir de lo medido: el mayor de los seis pueblos más un margen pequeño, y nunca por encima de lo que
aguanta el iPhone 13 (900 mil triángulos, 520 llamadas, 80 MB de texturas, 35 MB de geometría).

| Escena y calidad | Triángulos | Llamadas | Texturas | Geometría | Audio | Descarga |
|---|---|---|---|---|---|---|
| Pueblo, baja | 720 mil | 425 | 80 MB | 35 MB | 8 MB | lo de hoy + 15 % |
| Pueblo, media | 1,0 millón | 450 | 120 MB | 45 MB | 8 MB | lo de hoy + 15 % |
| Pueblo, alta | 1,5 millones | 480 | 160 MB | 60 MB | 8 MB | lo de hoy + 15 % |
| Partido de pelota, baja | 760 mil | 490 | 65 MB | 35 MB | 8 MB | lo de hoy + 15 % |

Descarga de hoy por pueblo: 58 MB acumulados en el mayor de los medidos (Lesaka). Tope: 66,7 MB.
En calidad baja, **cada fase tiene que dejar triángulos y llamadas iguales o por debajo de lo de hoy**: es la única
forma de no bajar la fluidez sin poder medirla aquí.

## Plan ajustado a lo visto

Fase 1, en este orden, un paso por commit:
1. Luz por franja horaria sin el negro del atardecer ni el salto a la luna, con paleta y hora dorada por comarca.
2. Sombreado de gouache y luz de borde en personajes y animales; línea de contorno en el jugador en media y alta.
3. Suelo mojado y charcos con reflejo del cielo cuando llueve.
4. Viento único con rachas para árboles, hierba, humo y banderines.
5. Agua: reflejo del cielo en degradado y espuma dibujada en la orilla.
6. Pase único de postprocesado en media y alta: bruma del valle, sombras de nubes, resplandor de luces, color por
   hora y viñeteado; con interruptor y apagado automático.
7. Sombras de contacto baratas para las casas en calidad baja.
8. Música en frases cortas con timbres por comarca y silencios con ambiente.

Fase 2: script de puntos de interés y su informe; anillo de resistencia y trepar; planeador; nadar; monturas;
corazones y mejoras; atalayas, marcas y tesoros; prueba automática de muros.

Lo que **no** entra en la tanda 1 y por qué: los personajes con ropa propia (defectos de coherencia 1, 2, 4 y 5) son
la Fase 5 y dependen de modelos nuevos que te pediré con su encargo exacto al cerrar esta tanda; el público, los
frontones nuevos y los campeonatos más largos son la Fase 4.
