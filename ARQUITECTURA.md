# MENDIMENDIZ · Arquitectura del código

Este documento recoge las bases del proyecto: qué hace cada parte y cómo se relacionan. Hay que mantenerlo al día
cuando cambie la estructura. Las copias de seguridad son ramas de git `copia-AAAA-MM-DD` (el proxy no deja subir etiquetas).

## Pila

- **Three.js r180** (WebGL2) y **Vite** con `vite-plugin-singlefile`: el juego entero sale en un solo
  `dist/index.html` (modelos, texturas y sonidos incrustados). Se copia a `docs/` (GitHub Pages) y a
  `MENDIMENDIZ-jugar.html` para entregarlo.
- **Sin servidor:** el progreso se guarda en `localStorage` (`mendimendiz-perfil-v1`, en `src/game/profile.js`).
- **Modelos y animaciones:**
  - Personajes KayKit (CC0).
  - Personajes de Meshy (modelos del autor del juego), en `src/assets/meshy`: los cuatro elegibles (sanferminero,
    pastor, futbolista de Osasuna y pelotari) y los del partido (pelotari colorado, segunda equipación de Osasuna).
    Cada modelo tiene una altura fija (`MESHY_H`) y se carga una sola vez; el pastor también hace de pastor del pueblo.
  - Animales y comida de Quaternius (CC0).
  - Protagonistas y piezas hechas en Blender 4.2 con scripts en `tools/blender/`.
  - Todo se prepara con `@gltf-transform`.

## Arranque

`src/main.js`:

1. Carga el perfil.
2. Precarga los vecinos, los animales y la comida.
3. Abre el centro de mando (`src/hub`).
4. Al elegir pueblo, `Runtime.load(def)` monta el mundo y crea `TownGame` (o `Game` para Salazar).

## Capas

| Carpeta | Qué contiene |
|---|---|
| `src/engine/runtime.js` | Bucle principal: renderizador, cámara, terreno, cielo, tiempo (lluvia y nieve), agua, fauna, partículas, sonido, ambiente musical, precompilación de sombreadores y LOD |
| `src/world/` | Mundo: relieve (`heightfield`, `terrain`), trazado del pueblo (`layout`, `townBuilder`, `houses`, `monuments`, `landmarks`, `civic`, `pamplona*`), naturaleza (`nature`, `agro`, `water`), materiales y texturas (`builder`, `textures`), cielo y luna (`sky`), tiempo (`weather`), productos 3D del mercado (`products3d`) y colisiones (`colliders`) |
| `src/actors/` | Seres vivos: jugador (`player`), personajes GLB, KayKit y Meshy (`glbChar`: clips del juego recortados de los de cada modelo, `loadMeshy`), vecinos (`npcGlb`: cuerpo KayKit con traje de su comarca), trajes de vecinos y público y seres de leyenda (`outfits`: `OUTFITS`, `MYTHS`), público en gradas (`crowd3d`: figuras 3D cocinadas cerca de la cámara y láminas de `crowdSprites` de lejos; sentado en tendidos y gradas), animales (`animals` + `animalGlb` con los modelos de Quaternius; `beasts` es la versión procedural de reserva), minifiguras antiguas (`minifig`) y equipo (`gear3d`) |
| `src/game/` | Reglas y misiones: `townGame` (misiones, interacción y pasos de cada pueblo), `game` (Salazar), minijuegos grandes (`encierro` + `encierroPlaza` + `encierroTex`, `futbol`, `fronton`), vida del pueblo (`tienda`, `mercado`, `mochila`, `perro`, `chase`, `crowd`), señales y objetos (`senales`, `items`), perfil (`profile`) y contenido (`content`) |
| `src/pelota/` | Motor de pelota a mano independiente: reglas, física, IA (cinco niveles en `rules.js`), HUD, cancha, fichas técnicas de los pelotaris (`ficha.js`: datos inventados que salen del nombre, cualidades y golpes), el frontón que juega (`courtFeel` en `rules.js` y `setFeel` en `physics.js`: a cubierto, piedra, mojado o Labrit), la pelota elegida (`BALLS` en `rules.js`: normal, viva, muerta, de mucho bote y de poco bote, que multiplican esa física) y la pantalla VS (`vs.js`). El golpe es siempre manual (`game.js`): sale al soltar el botón y cuenta el momento respecto al justo (`idealAt`, con lo que perdona cada nivel en `TOL`); antes del bote es volea y alta, gancho. La energía (`EN` y `shotEnergy`) baja al correr y con cortadas, dos paredes y ganchos, y sube peloteando normal. La cámara dinámica opcional está en `match.js` (`camDyn`). Las simulaciones de los golpes (`landingOf` y la dos paredes en `physics.js`) solo guardan los eventos y paran al botar |
| `src/game/pelotaris.js` | Colección de pelotaris: uno por pueblo, su carta al jugar contra él y los demás en silueta, por comarcas |
| `src/game/rutinas.js` | La tarea de cada vecino del pueblo (misa, compra, charla, jugar a pillar, fuente, pan, paseo): sus paradas, cuánto se queda en cada una, hacia dónde mira y qué hace; `Actor.arrive` las cumple |
| `src/ui/sport.css` y `src/ui/sportCard.js` | Estilo deportivo de todo el juego: letra condensada (Barlow Condensed, OFL), morados con fucsia y rosa, fondos de retransmisión, botón fucsia, entradas escalonadas y las cartas de jugador con media y cualidades (la media sale de `pelotariRating` en `pelota/rules.js`) |
| `src/ui/frames.js` | Marcos de las cajas con esquinas en ángulo: cada caja con borde y clip-path lleva su marco entero, con las diagonales, como border-image (un SVG que se adapta al tamaño). Tabla de selector, forma (corte o paralelogramo), tamaño y color |
| `src/ui/fitlabel.js` | Rótulos de los botones redondos (fútbol y pelota) siempre dentro del círculo: mide cada línea del texto contra el círculo y, si no cabe, lo parte en dos líneas y luego junta las letras, sin bajar nunca de 12 px. Se vuelve a mirar al cambiar el rótulo y el tamaño de la pantalla |
| Identidad común | Reglas que valen en todo el juego (`style.css`, `sport.css`): escala de letra 12, 14, 16, 20, 24 y de 32 en adelante; rótulo en letra estrecha rosa de 14 px con raya inclinada (`.kicker`); título en la letra de rótulos grandes con interlineado 1; distancias de rótulo a título y de título a texto con `--t-mt` y `--t-mb` (10 y 12 px de línea base a mayúscula); botón principal en la letra de rótulos grandes sobre el degradado y los demás en letra estrecha en mayúsculas; textos en blancos y lilas fríos, rosa para destacar; verde solo para acierto, naturaleza y los colores de comarcas y clubes; esquinas casi rectas (4 px), cortadas en ángulo o círculos, y pestañas, filtros y chips en letra estrecha: una sola lista en `sport.css` para los dos. Composición: todo en la rejilla de 4 px; el mismo margen en las cuatro esquinas de la pantalla de juego (`--edge` y `--thumb`, 16 px); las ventanas de papel con 12 px arriba, a los lados y abajo; en el menú, el margen de los lados (`--gut`) igual para el contenido y para la barra de arriba |
| `src/ui/infocard.css` | Las fichas de información (planta, animal, lugar, oficio, cima, escudo, misión cumplida): un mismo orden para todas (imagen con su etiqueta, cabecera, contenido en pestañas o texto, etiquetas y botón al pie) y los mismos espacios (16, 12 y 8 px). También la ficha de un sitio en el mapa del pueblo |
| `src/ui/floraFoto.js` y `src/assets/flora/` | Fotos reales CC0 de iNaturalist de las 51 plantas (la planta o su flor y su hoja): 720 px en la web (`web/`) y 380 px en el archivo único (`mini/`), elegidas por el alias `@flora-fotos` de `vite.config.js`. Autores en `fotos.json`; enlaces en `legal/fotos-flora.csv`. Sin foto o sin AVIF, la ficha usa la lámina dibujada (`floraArt.js` y `leafArt.js`) |
| `src/world/flora3d.js` y `leafSprig` (`src/ui/leafArt.js`) | Las plantas que se identifican en cada pueblo, en 3D. Los árboles tienen el porte de su especie (tabla `HABIT`: forma de la copa, dónde empieza, ramas principales y cuánto suben, copa en bultos, ramas torcidas, ramitas que cuelgan): tronco, ramas y ramillas de madera, y la copa hecha de cientos de ramitas planas con el dibujo de la hoja de su especie (`leafSprig`: hojas alternas, palmeadas o compuestas, mechones de agujas o ramitas planas del abeto). Los arbustos de hoja, un bulto oscuro por dentro con las ramitas por encima. Dos mallas por ejemplar (madera y hojas), sin archivos nuevos: las texturas se dibujan al entrar en el pueblo y se liberan al salir |
| Fotos de flora en el menú y en la ficha | En Naturaleza, la foto de la planta entera ocupa el ancho de la tarjeta y su hoja va en un círculo encima; en la ficha, la otra foto (la hoja o la planta) va en un círculo en la esquina de la foto grande y, tocándolo, se cambian. De los árboles, fotos del árbol entero, para reconocer su forma |
| Frontón cubierto | `PelotaCourt` con `hall: true` (`court.js`): cerrado, rebote y pared izquierda hasta el techo (`backH` y `leftH` de `setFeel`), grada con asientos y público sentado, luz de pabellón (`sky.indoor`). `hallVenue` en `fronton.js` lo monta aparte para el torneo y los partidos de Campeonatos; la calle queda para las misiones |
| `src/hub/` | Centro de mando: inicio, mapa, pueblos, personajes (los seis jugables), insignias, pasaporte y perfil; `diorama` y `stage` dibujan las escenas 3D del menú |
| `src/ui/` y `src/ui.js` | HUD, iconos SVG e iconos 3D horneados (`icon3d`, que guarda WebP en `src/assets/icons3d`), retratos, mapa y minijuegos pequeños |
| `src/data/` | Datos: pueblos y misiones (`levels.js`), comarcas con su cultura y su traje (`comarcas.json`), montes, fauna, comida y equipo (`equipo.js`), tiendas y producto estrella (`tiendas.js`), personajes (`cast.js`) y euskera (`eu.js`) |
| `src/i18n.js` | Castellano, euskera y modo «Aprende euskera» (botón ES para ver el castellano unos segundos) |
| `src/audio.js` | Sonido procedural con Web Audio: ambiente, animales y música por ambientes (explorar, noche, misterio, tensión, juego y fiesta) |

## Convenciones

- **Rendimiento ante todo:**
  - Lo estático se funde por material (`mergeGeometries`, `mergeByMaterial`).
  - Lo repetido va instanciado (público, banderines, ventanas…).
  - Cada animal y cada vecino es una sola malla con piel.
  - Las animaciones lejanas se actualizan a saltos.
  - Los iconos 3D se hornean a WebP.
- **Sin propiedad ajena:** nada de personajes o logotipos de terceros. Solo recursos propios o con licencia CC0
  (las licencias están junto a los recursos, en `src/assets/*/LICENSE_*`).
- **Textos:** se escriben en castellano; el traductor (`i18n.js` + `data/eu.js`) los pasa al euskera.
  - Con números, singular y plural: «1 sello», «2 sellos» (`cnt` en `hub.js`); nunca «1 sellos».
  - Los saludos de los vecinos van a la hora y con el tiempo de ahora (`game/saludo.js`): «Egun on», «Arratsalde on»
    o «Gabon», y nadie dice «qué día más bonito» si llueve o nieva.
- **El tiempo con lógica:**
  - Bajo techo no cae nada: en los partidos (fútbol y pelota) y con `sky.indoor` (frontón cubierto y dentro del Labrit,
    también en su plano de llegada), la lluvia y la nieve no se ven ni hay rayos nuevos (`Weather.update(…, hold)`).
  - Las caras de dentro de un frontón con cubierta o cerrado no llevan chorreones de lluvia (`weather(…, dry)` en
    `pelota/court.js`).
  - Si en un frontón abierto nieva, se dice «Suelo con nieve» y no «Llueve» (`cond.snow`).
  - Con lluvia o nieve no salen mariposas ni luciérnagas (`fauna.wet`).
- **Aire antes que caber:** se puede desplazar. Mejor elementos con espacio, que se entiendan, y colocados en filas
  horizontales que todo apilado en columnas estrechas para que quepa sin desplazar.
  - Torneos (`s_sports`): una carta por fila, ancha. La figura a la izquierda; en el centro el rótulo, el título, el
    texto y el dato, y debajo la fila para elegir frontón o ver tu club; el botón de jugar a la derecha. En vertical,
    el texto y la figura arriba y la elección y el botón debajo.
  - Mochila: cabecera en una fila con «Cerrar» a la derecha, como «Salir» en la tienda. Debajo, una franja por cosa
    (perro, agua, comida y equipo), con el rótulo a la izquierda y lo suyo en fila, 24 px de aire y una raya fina entre
    franjas. La comida y el equipo, en filas que se deslizan. Los iconos, a su tamaño de siempre. Los botones del perro van
    juntos: si no caben junto al selector, bajan los dos a la fila de abajo.
  - Pantalla de carga (`showLoading` en `ui.js`): retícula de dos columnas en proporción áurea, con los mismos márgenes
    en los cuatro lados y un mismo hueco entre columnas y filas. A la izquierda el pueblo, su comarca, su presentación
    y sus misiones; a la derecha su lámina entera. Debajo, el consejo bajo el texto y la barra bajo la lámina. Todo el
    bloque centrado y, de fondo, la misma lámina desenfocada.
- **Láminas** (`data/laminas.js`, `ui/laminas.js`, `src/assets/laminas`): las ilustraciones del explorador que ha hecho
  el autor. Cada pueblo tiene su portada (su monumento) y otras de sus leyendas, oficios, cosechas, animales y fiestas;
  las comarcas, sus paisajes. Se ven en la carga, en la ficha y la tarjeta del pueblo, en la cabecera de cada comarca,
  en los cuentos, en el taller de cada oficio, en Torneos y en el álbum (Más · Láminas), en tiras que se deslizan de
  lado y con un visor a pantalla completa. Van en WebP, que lee cualquier iPhone: en AVIF, algunos visores no las
  enseñaban. En la web van todas, a 1280 × 720 y con copia de 480 × 270 para tarjetas;
  en el archivo único, a 640 × 360, solo las que se ven fuera del álbum (alias `@laminas` de `vite.config.js`). Las
  portadas anteriores, con el personaje del jugador delante, están guardadas en `tools/portadas-anteriores`.
- **Iconografía de una sola familia:** un archivo `src/assets/icons3d/<nombre>.webp` sustituye al icono de ese nombre
  sin tocar el código (`has3D` mira también los archivos horneados).
  - Los 48 iconos del autor (controles, exploración, naturaleza, cultura y deportes) están ya ahí, a 192 px, con el
    mismo margen que los demás. Los botones del HUD y los táctiles los usan también (`ICON` en `ui.js`): la bota para
    correr, las flechas para saltar y, en el de acción, la mano, hablar, beber, mirar y pelota. Sobre el degradado de
    los botones principales llevan un contorno oscuro fino.
- **Comentarios en castellano**, explicando el porqué.

## Herramientas y pruebas (`tools/`)

| Herramienta | Qué hace |
|---|---|
| `revision.mjs` | Carga los 31 pueblos y comprueba misiones, anfitriones, suelo, perro y errores; deja el informe en `entrega/revision.json` |
| `encierro.mjs` | Prueba el encierro con capturas |
| `futbol.mjs` | Prueba el fútbol con capturas |
| `tienda.mjs` | Prueba la tienda con capturas |
| `mercado.mjs` | Prueba el mercado con capturas |
| `clima.mjs` | Prueba la lluvia, la nieve y la luna con capturas |
| `vecinos.mjs` | Prueba los vecinos con capturas |
| `trajes.mjs` | Prueba los trajes con capturas |
| `carnaval.mjs` | Prueba los personajes de carnaval |
| `llamadas.mjs` | Mide las llamadas de dibujo por partes |
| `mitos.mjs` | Prueba Basajaun, la lamia, la sorgina y Roldán con capturas |
| `musica.mjs` | Prueba la música por ambientes |
| `euskera.mjs` | Prueba el modo «Aprende euskera» |
| `animalpack.mjs` | Empaqueta los animales |
| `foodpack.mjs` | Empaqueta las frutas y verduras |
| `iconbake.mjs` | Hornea los iconos 3D |
| `luz-ver.mjs` | Luz estable al girar la cámara en el pueblo y al entrar y salir de un partido de pelota (de día, con lluvia) |
| `ux-medir.mjs` | Auditoría de interfaz en el móvil tumbado: botones de menos de 44 px, rejilla de 4 px, interlineado, interletrado, contraste, orden de los botones y lo que obliga a desplazar, en las ventanas del juego y en el menú |
| `espaciado.py` | Lleva rellenos, márgenes y huecos de todas las hojas de estilo a la rejilla de 4 px |
| `ventanas-casos.mjs` | Cómo se abre cada ventana del juego para las auditorías (`popups-medir`, `ux-medir`) |
| `pelota-ficha-ver.mjs` | Las fichas de los pelotaris: antes del partido, por parejas, en la pausa y en el torneo |
| `pelota-frontones-juego.mjs` | El frontón que juega: el mismo golpe en cada tipo de frontón y partidos enteros de la IA en todos (sin gráficos) |
| `pelota-vs-ver.mjs` | El panel del partido y «Más opciones» en pestañas (pelota y cámara dinámica, sin desplazar), la pantalla VS, el partido (marcador sobre el frontis, FALTA y PASA, tu energía, el aro del botón de golpe) y la colección en el móvil tumbado (con `clear` o `rain`) |
| `pelota-golpe-manual.mjs` | Golpeo manual: sin pulsar no se devuelve nada; a tiempo, perfecto; pronto y tarde; volea y gancho; la energía; las cinco pelotas (sin gráficos) |
| `auditoria-diseno.mjs` | Auditoría de diseño del menú y de las pantallas de deporte (TAM=844x390 o 1180x820): texto cortado o con puntos suspensivos, texto encima de figuras (mirando la transparencia de la imagen) o de otro texto, verdes fuera de sitio, bordes que no siguen las esquinas en ángulo, texto que se sale de su botón o su caja (círculo, píldora, esquinas redondeadas o en ángulo), distancias de rótulo a título y de título a texto, letra fuera de la escala o de las fuentes del juego colores de texto fuera de la gama, cajas que se salen de su caja, texto en columnas de una palabra por línea, lo que hay que desplazar, esquinas muy redondeadas y botones con letra de lectura. La medida está en `auditoria-medida.mjs`; también mide la composición: bloques de una fila con la misma altura o el mismo centro y el mismo hueco, columnas con el mismo borde y el mismo ancho, cajas con el mismo relleno a los dos lados, rellenos y huecos en la rejilla de 4 px, y bordes que casi coinciden (de 2 a 12 px) dentro de una misma caja, que se toman por descuadres. Con TODO=1 lista todas las distancias y con DETALLE=1 dice la regla de CSS de cada fallo |
| `auditoria-partidos.mjs` | La misma auditoría en los marcadores y mandos de fútbol y pelota, montados sin el partido en 3D, en castellano y euskera y en cada estado de los botones (atacar, defender, portero, penaltis; golpe, gancho y volea) |
| `auditoria-pueblo.mjs` | La misma auditoría dentro del pueblo (TAM=844x390 o 1180x820): HUD, diálogo, cada pestaña del libro, mapa con la tarjeta de una misión y de un lugar, mochila, pausa, cada pestaña de la tienda y recompensa |
| `auditoria-ventanas.mjs` | La misma auditoría en las ventanas del juego (fichas, minijuegos, misión cumplida, cuestionarios) |
| `pelota-cubierto-ver.mjs` | El frontón cubierto: llegada, luz de pabellón a mediodía, grada, cámara de retransmisión siempre dentro y rebote hasta el techo |
| `futbol-vs-ver.mjs` | La presentación VS del fútbol: camisetas, medias, competición y que al tocar empieza el partido |
| `vecinos-tareas.mjs` | Cada vecino con su tarea: llegan a sus paradas, se quedan haciendo lo suyo, los del corrillo charlan y los niños corren |
| `rediseno-ver.mjs` | Capturas del menú y de las pantallas de deporte en el móvil tumbado (campeonatos, personajes, mapa, torneo, colección, liga y VS) con lo que se sale, la letra pequeña y lo que obliga a desplazar |
| `minijuegos-comarcas.mjs` | Un pueblo de cada comarca: misiones con anfitrión y datos válidos, y sus minijuegos jugados con sus datos |
| `blender/fauna/derivar.py` | Crea la oveja, la cabra, el cerdo y el jabalí a partir de otros modelos |
| `blender/fauna/sentado.py` | Crea la pose «Sentado» de los perros |
| `blender/arq/` | Puente de Ochagavía (blockout) |

Las pruebas usan Chromium con SwiftShader (muy lento), así que **simulan el tiempo de juego** llamando a
`update(1/30)` en bucle, en vez de esperar a los fotogramas.

## Publicar

El archivo único (`npx vite build`) es el que se abre en el móvil con Sitecase. Para que pese menos, los modelos 3D
van comprimidos con gzip (`vite.config.js`, plugin `glb-gzip`; los descomprime `src/util/glb.js` con el fflate de
three.js) y los personajes de Meshy con la textura a 1024 px (`src/assets/meshy-1024`, `tools/meshy-textura.mjs`).
Con `MINI=1 npx vite` el servidor de pruebas carga lo mismo que el archivo único. La web (`WEB=1`) no cambia.
Con `LIGERO=1 npx vite build` sale una variante unos 6 MB más pequeña (`MENDIMENDIZ-jugar-ligero.html`): los
personajes de Meshy van en su versión ligera (`src/assets/meshy/lod`) y todo lo demás es igual.

```
npx vite build
cp dist/index.html docs/index.html
cp dist/index.html MENDIMENDIZ-jugar.html
git push origin master:main
```
