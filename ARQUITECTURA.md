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
| `src/game/pelotaris.js` | Colección de pelotaris: uno por pueblo, su carta al jugar contra él y los demás con la figura del pelotari de su frontón y un candado, por comarcas |
| `src/futbol/` | Fútbol 11 y sala: motor del partido (`game.js`), reglas por formato (`rules.js`), partido en 3D (`match.js`) y marcador y mandos (`hud.js`). Cada jugador tiene forma (`fit`), que baja jugando y más esprintando, y la energía no pasa de ella; las faltas por detrás o en plancha pueden lesionar (leve: cojea un rato; grave: corre menos y no esprinta). Cambios: cinco en fútbol 11 y sin límite en sala; el pedido con el balón en juego se hace en la siguiente parada; el rival cambia solo a lesionados y cansados, y tu equipo también con «Cambios automáticos». A la tercera falta de un mismo jugador, amarilla. El portero sale a cortar los pases al hueco. En pantalla: la ficha de tu jugador (número, puesto, energía, forma perdida en rayas, tarjeta y lesión), el aviso de cambio bajo la pausa y la ventana «Cambios» con los dos equipos |
| `src/game/rutinas.js` | La tarea de cada vecino del pueblo (misa, compra, charla, jugar a pillar, fuente, pan, paseo): sus paradas, cuánto se queda en cada una, hacia dónde mira y qué hace; `Actor.arrive` las cumple |
| `src/ui/sport.css` y `src/ui/sportCard.js` | Estilo deportivo de todo el juego: letra condensada (Barlow Condensed, OFL), morados con fucsia y rosa, fondos de retransmisión, botón fucsia, entradas escalonadas y las cartas de jugador con media y cualidades (la media sale de `pelotariRating` en `pelota/rules.js`) |
| `src/ui/frames.js` | Marcos de las cajas con esquinas en ángulo: cada caja con borde y clip-path lleva su marco entero, con las diagonales, como border-image (un SVG que se adapta al tamaño). Tabla de selector, forma (corte o paralelogramo), tamaño y color |
| `src/ui/fitlabel.js` | Rótulos de los botones redondos (fútbol y pelota) siempre dentro del círculo: mide cada línea del texto contra el círculo y, si no cabe, lo parte en dos líneas y luego junta las letras, sin bajar nunca de 12 px. Se vuelve a mirar al cambiar el rótulo y el tamaño de la pantalla |
| Identidad común | Reglas que valen en todo el juego (`style.css`, `sport.css`): escala de letra 12, 14, 16, 20, 24 y de 32 en adelante; rótulo en letra estrecha rosa de 14 px con raya inclinada (`.kicker`); título en la letra de rótulos grandes con interlineado 1; distancias de rótulo a título y de título a texto con `--t-mt` y `--t-mb` (10 y 12 px de línea base a mayúscula); botón principal en la letra de rótulos grandes sobre el degradado y los demás en letra estrecha en mayúsculas; textos en blancos y lilas fríos, rosa para destacar; verde solo para acierto, naturaleza y los colores de comarcas y clubes; esquinas casi rectas (4 px), cortadas en ángulo o círculos, y pestañas, filtros y chips en letra estrecha: una sola lista en `sport.css` para los dos. Composición: todo en la rejilla de 4 px; el mismo margen en las cuatro esquinas de la pantalla de juego (`--edge` y `--thumb`, 16 px); las ventanas de papel con 12 px arriba, a los lados y abajo; en el menú, el margen de los lados (`--gut`) igual para el contenido y para la barra de arriba |
| `src/ui/infocard.css` | Las fichas de información (planta, animal, lugar, oficio, cima, escudo, misión cumplida): un mismo orden para todas (imagen con su etiqueta, cabecera, contenido en pestañas o texto, etiquetas y botón al pie) y los mismos espacios (16, 12 y 8 px). También la ficha de un sitio en el mapa del pueblo |
| `src/ui/floraFoto.js` y `src/assets/flora/` | Fotos reales CC0 de iNaturalist de las 51 plantas (la planta o su flor y su hoja): 720 px en la web (`web/`) y 380 px en el archivo único (`mini/`), elegidas por el alias `@flora-fotos` de `vite.config.js`. Autores en `fotos.json`; enlaces en `legal/fotos-flora.csv`. En WebP, como las láminas (algunos visores del iPhone no enseñan AVIF). Sin foto, la ficha usa la lámina dibujada (`floraArt.js` y `leafArt.js`) |
| `src/ui/faunaImg.js` y `src/assets/fauna/` | Ilustraciones del autor de los 31 animales (cuerpo entero, fondo transparente): la ficha de cada uno con la de 1280 px en la web y la de 512 en el archivo único (alias `@fauna-big`; las de 512 se rehacen desde las de 1280 con `tools/fauna-512.mjs`, a calidad 80 para que quepan), y las tarjetas del cuaderno con la de 512 en la web y la de 256 en el archivo único (`@fauna-small`) |
| `src/ui/fonts.css` | Las tipografías incrustadas (Lilita One y Nunito, de @fontsource), solo en WOFF2: así el archivo único no lleva la copia WOFF de reserva |
| `src/assets/personajes/` | Ilustraciones del autor de 8 personajes de Navarra, en 16:9 y con el id de `data/personajes.js`: salen en las fichas de su misión (historia, placa y «Su huella hoy»), la de 1536 px en la web y la de 320 en el archivo único. Las da `personajeUrl` de `ui/laminas.js` (alias `@personajes`); Sancho y las golondrinas llevan una lámina que ya estaba (`PERSONAJE_LAMINA`) |
| `src/assets/tradiciones/` | Ilustraciones del autor de 4 tradiciones, en 16:9: el canto de Gayarre (Roncal), los trovadores (Olite), la Bajada del Ángel (Tudela) y el Ttun-ttun (Isaba). Cada misión lleva su id en el campo `ilus` de `data/levels.js`. Salen en las fichas «¿Qué es?», «Cómo se hace» y «Antes y ahora» de la tradición y en la ficha de la danza, la de 1536 px en la web y la de 320 en el archivo único. Las da `tradicionUrl` de `ui/laminas.js` (alias `@tradiciones`) |
| `src/assets/cimas/` | Escenas del autor de las 16 cimas de las misiones de montaña, en 16:9 y con el id del monte: la tarjeta de cada cima (pantalla Cimas y comarca) lleva la de 1024 px (`tools/cimas-tarjetas.mjs`; la de 768 ya no se usa) y el buzón de cumbre, la de 1536; en el archivo único, solo la de 320, porque no caben más grandes. Las da `cimaUrl` de `ui/laminas.js` (alias `@cimas` y `@cimas-big`) |
| `src/assets/leyendas/` | Ilustraciones del autor de los 13 cuentos, en 16:9 y con el id de su cuento: el libro de leyendas lleva la de 768 px y el relato y el visor, la de 1536 (en el archivo único, una sola de 640). Las da `leyendaUrl` de `ui/laminas.js` (alias `@leyendas` y `@leyendas-big`); si faltara, sale la lámina del pueblo (`CUENTO_LAMINA`) |
| `src/ui/escudoImg.js` y `src/assets/escudos/` | Escudos con el acabado del autor: los 65 del armorial (`heraldica/`, 512 px; 1024 en la ficha de la web) y los emblemas propios de los 21 equipos de la liga (`equipos/`). En el menú y en las fichas van como imagen; en la placa de la plaza y en la pared del frontón, `drawTownArms` pinta la imagen en el lienzo (se carga al empezar la partida, `armsReady`) y, si faltara, el dibujo de `world/armas.js` |
| `src/world/flora3d.js` y `leafSprig` (`src/ui/leafArt.js`) | Las plantas que se identifican en cada pueblo, en 3D. Los árboles tienen el porte de su especie (tabla `HABIT`: forma de la copa, dónde empieza, ramas principales y cuánto suben, copa en bultos, ramas torcidas, ramitas que cuelgan): tronco, ramas y ramillas de madera, y la copa hecha de cientos de ramitas planas con el dibujo de la hoja de su especie (`leafSprig`: hojas alternas, palmeadas o compuestas, mechones de agujas o ramitas planas del abeto). Los arbustos de hoja, un bulto oscuro por dentro con las ramitas por encima. Dos mallas por ejemplar (madera y hojas), sin archivos nuevos: las texturas se dibujan al entrar en el pueblo y se liberan al salir |
| Fotos de flora en el menú y en la ficha | En Naturaleza, la foto de la planta entera ocupa el ancho de la tarjeta y su hoja va en un círculo encima; en la ficha, la otra foto (la hoja o la planta) va en un círculo en la esquina de la foto grande y, tocándolo, se cambian. De los árboles, fotos del árbol entero, para reconocer su forma |
| Frontón cubierto | `PelotaCourt` con `hall: true` (`court.js`): cerrado, rebote y pared izquierda hasta el techo (`backH` y `leftH` de `setFeel`), grada con asientos y público sentado, luz de pabellón (`sky.indoor`). `hallVenue` en `fronton.js` lo monta aparte para el torneo y los partidos de Campeonatos; la calle queda para las misiones |
| `src/hub/` | Centro de mando: inicio, mapa, pueblos, personajes (los seis jugables), insignias, pasaporte y perfil; `stage` dibuja el escenario 3D del selector de personaje (`diorama` solo lo usa `lab/portadabake.html`) |
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
- **Botones en pleno partido:** responden al levantar el dedo (`tap` de `util/tap.js`), no al clic. En el iPhone,
  mientras el partido cambia la pantalla sin parar, Safari a veces se traga el clic: la X de la pelota no dejaba salir.
  Lo usan la X y las ventanas de la pelota, y la pausa, la cámara, la ventana de pausa y la final del fútbol. Con el
  teclado y desde el código (`boton.click()`) vale el clic de siempre.
- **Sin propiedad ajena:** nada de personajes o logotipos de terceros. Solo recursos propios o con licencia CC0
  (las licencias están junto a los recursos, en `src/assets/*/LICENSE_*`).
- **Textos:** se escriben en castellano; el traductor (`i18n.js` + `data/eu.js`) los pasa al euskera.
  - Diccionarios: `data/eu.js` y `data/eu-mas.js` (con sus plantillas: pueblos, misiones, montes, fechas, tienda), y los
    generados `data/eu-armas.js` (escudos, saberes, edades) y `data/eu-oficios.js` (oficios, misiones, montes, comarcas,
    folclore, tienda y mochila). Lo que ya estaba traducido no se pisa.
  - Estos cuatro diccionarios van en su propio archivo y solo se cargan al jugar en euskera (`loadEU` en `i18n.js`;
    `startI18n` los espera antes de traducir). En castellano no se descargan.
  - Los textos que cambian a cada momento (objetivo, reloj, distancia, avisos de deporte) guardan en el elemento lo
    último que se escribió (`el._t`) y no se reescriben si no cambia: en euskera el elemento ya tiene la traducción y
    compararlo con el castellano haría que se reescribiera y se tradujera en cada fotograma.
  - Si un texto junta varias frases ya traducidas («Aspecto. Costumbre.», «Presentación. Altitud: …»), se traduce por
    partes. Una lista «A, B, C» se traduce si lo están todos sus elementos (`EU_RX_LISTA`, la última plantilla).
  - Lo que lleva `data-notr` ya va traducido y el traductor no lo toca: el diálogo se escribe letra a letra ya en
    euskera y, al acabar, deja el castellano para que el botón «Itzuli» pueda enseñarlo.
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
  - Torneos (`s_sports`): una carta por fila, ancha, con su portada: la lámina del protagonista en acción
    (`dep-pelotari` y `dep-futbol`), a todo color, pegada a la derecha y fundida con el fondo (en vertical, entera arriba).
    A la izquierda, en una columna, el rótulo con tu marca a su derecha, el título y el texto; abajo, a la altura de los pies de la figura, lo elegido (el frontón o tu club)
    en una caja y el botón «Jugar» al lado: primero se elige y luego se juega. Las cajas miden lo mismo en las dos
    cartas, así los botones quedan uno encima del otro. La caja del frontón abre la lista de los 31 frontones por
    comarcas (`frontonPicker`); al elegir, cambia la caja sin volver a pintar la pantalla. En el iPhone tumbado con la
    barra de Sitecase (844 × 312) cada carta cabe entera. En vertical, el texto y la figura arriba y la elección y el
    botón debajo, a todo lo ancho.
  - El triángulo de jugar va en blanco con su relieve sobre los botones fucsia (`img.i-play` en `style.css`; cada
    icono 3D lleva la clase `i-<nombre>`).
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
  en los cuentos que no tengan su ilustración propia, en el taller de cada oficio, en Torneos y en el álbum (Más · Láminas), en tiras que se deslizan de
  lado y con un visor a pantalla completa. Van en WebP, que lee cualquier iPhone: en AVIF, algunos visores no las
  enseñaban. En la web van todas, a 1280 × 720 y con copia de 640 × 360 para tarjetas (tools/laminas-pequenas.mjs);
  en el archivo único, a 640 × 360, solo las que se ven fuera del álbum (alias `@laminas` de `vite.config.js`). Todas
  las portadas son láminas (`townCover`, `comarcaCover` y `townImg` en `ui/laminas.js`): el inicio, el fondo del menú,
  las tarjetas y cabeceras de comarca, las tarjetas y la ficha de cada pueblo y la pantalla de carga. En tarjetas y
  fichas se ven enteras, en 16:9; donde el texto va encima, con el mismo degradado neutro (`--cov-side`, `--cov-foot` y
  `--cov-head` en `hub.css`). Las fotos 3D de antes (el diorama de la comarca con el personaje delante) ya no están.
  Los cuatro botones del menú de pelota llevan los pelotaris del autor (ver abajo): en el torneo, tu rival de la ronda;
  por parejas, la pareja rival; en el partido libre, tú, de azul; en la colección, los tres últimos que has conocido,
  en abanico. Las ilustraciones de antes siguen en `src/assets/pelota`, sin cargarse.
- **Pelotaris del autor** (`src/ui/pelotariFig.js`, `src/assets/pelotaris`): 22 chicos y chicas de cuerpo entero, de
  azul y de rojo, para las cartas, la pantalla VS, la colección, el cuadro del torneo y las portadas de pelota. Cada
  nombre de la plantilla tiene su figura (los rivales y compañeros salen de ella; Mendi es el protagonista) y otro
  nombre toma una del mismo género, siempre la misma. Cada pueblo tiene su pelotari fijo en el frontón
  (`townPelotari`), que es el de su carta en la colección. La web lleva los de 512 de los dos colores; el archivo único,
  el rojo de 256 y la camiseta azul suelta. La figura es siempre una sola imagen (`img.pf`): en el archivo único, la
  azul es la camiseta con el rojo de fondo de esa misma imagen (`.pf-az` en `sport.css`). Con dos imágenes una encima de
  otra, Safari en el iPhone dejaba la camiseta suelta a un lado; en las portadas del menú, cada figura va con posición
  absoluta dentro de su caja. En la web, la pantalla VS lleva además los de 1024 (`big` en `pelotariFig`). Las figuras
  miran a su izquierda: en la pantalla VS solo se gira la roja.
- **Jugadores de fútbol del autor** (`src/futbol/jugadorFig.js`, `src/assets/jugadores`): un chico y una chica por
  equipación, de cuerpo entero (1024 × 1536), su busto (360 × 480, `jugadorBusto`) y la pareja de los dos juntos
  (`jugadorDuo`: 960 de alto para la pantalla VS y 480 para los menús); el visitante, con la segunda equipación blanca o
  azul marino (`duoId`). Solo en la web: en el archivo único no caben nítidos y siguen las camisetas dibujadas
  (`kitSvgOf`).
  - **VS de equipo:** cada equipo sale con su pareja; la del rival, girada. En vertical, cada pareja en su mitad.
  - **Portadas de equipo** (`liga.js`, clases `eq-`, que no chocan con las del marcador del partido, `fb-`): el menú del
    club en losas como el de pelota (la liga con tu pareja, el amistoso con la de un club del otro grupo que cambia
    cada día, el partido rápido con Iruña, el del sello con los vecinos y cambiar de club con tres bustos en abanico);
    elegir club y rival en cartas que se pasan de lado (en vertical, hacia abajo), con escudo, media, grupo y pueblo o
    campo; y el campeón de la liga con su pareja.
  - La caja del próximo partido de la liga lleva los bustos; en el móvil de pie, sin bustos, que no caben.
- **Nitidez** (`tools/nitidez.mjs`): cada imagen a la vista en el iPhone 12 tumbado (densidad 3) se mide por los píxeles
  de pantalla que le tocan a cada píxel suyo; más de 1,5, pixelada, y de 1,2 a 1,5, blanda. Para la web: copias
  pequeñas de las láminas de 640 × 360, cimas de 1024, fauna de 512 en las tarjetas, retrato del perfil de 512 × 768
  (`src/assets/meshy/portraits/web`, alias `@retratos`) y pelotaris y jugadores de 1024 en la VS. Lo único que sigue
  blando son las portadas grandes, porque el autor entregó las láminas a 1280 × 720.
- **Sellos de comarca:** los 12 del autor (`src/assets/sellos`, `stampImg` en `src/assets.js`), en el pasaporte, el
  mapa, las comarcas, las tarjetas de pueblo y el pueblo completado; `src/ui/art.js` los dibuja si faltara alguno.
- **Iconografía de una sola familia:** un archivo `src/assets/icons3d/<nombre>.webp` sustituye al icono de ese nombre
  sin tocar el código (`has3D` mira también los archivos horneados).
  - Son los 182 iconos 3D del autor (los 165 nombres de `ICONS` en `src/ui/icons.js` y 17 controles: los del fútbol,
    pausa, cámara y los del mapa), recortados y centrados con el mismo margen: el lado mayor ocupa el 89 % del cuadro.
    La web los lleva a 192 px; el archivo único, la copia de 128 px de `icons3d/128` (alias `@icons3d`), por peso. La
    lista está en `icons3d/LICENSE_iconos-autor.txt` y `tools/iconbake.mjs` no la vuelve a hornear.
  - Los usan también los botones del HUD y los táctiles (`ICON` en `ui.js`: correr, saltar y, en el de acción, la
    mano, hablar, beber, la lupa para mirar y pelota), la X de la pelota y los botones del mapa (acercar, alejar,
    centrar y viajar). Sobre el degradado de los botones principales llevan un contorno oscuro fino.
  - El fútbol no: sus botones, la pausa, la cámara y la pantalla de controles llevan los símbolos de trazo de los
    controles del autor (`ICON` en `futbol/hud.js`), sobre botones de color sólido con relieve (tiro fucsia, pase azul,
    cambiar marrón, el resto morado; con tu portero, turquesa). Sus 13 iconos 3D siguen en la carpeta sin cargarse.
  - Un animal con dos nombres usa el icono del autor (`SAME` en `icon3d.js`: águila, ardilla, jabalí, buitre, cigüeña,
    ciervo, trucha, zorro, pottoka y pito); sus renders de antes siguen en la carpeta sin cargarse. Los pocos que el
    autor no ha dibujado (corzo, grulla, lechuza, milano, quebrantahuesos, cabra) son renders del juego.
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
| `fauna-512.mjs` | Rehace la fauna del archivo único (`src/assets/fauna/512`) desde las de 1280: 512 px, WebP calidad 80 |
| `euskera.mjs` | Prueba el modo «Aprende euskera» |
| `eu-faltan.mjs` | Juega en euskera con `?eufaltan` (menú, fichas y las misiones de los pueblos pedidos o de `todos`) y apunta lo que se queda sin traducir en `/tmp/eu-faltan.json`. Las tarjetas y minijuegos que `__autoWin` se salta pasan sus textos por `window.__autoSeen` |
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
| `auditoria-diseno.mjs` | Auditoría de diseño del menú y de las pantallas de deporte (TAM=844x390 o 1180x820): texto cortado o con puntos suspensivos, texto encima de figuras (mirando la transparencia de la imagen) o de otro texto, verdes fuera de sitio, bordes que no siguen las esquinas en ángulo, texto que se sale de su botón o su caja (círculo, píldora, esquinas redondeadas o en ángulo), distancias de rótulo a título y de título a texto, letra fuera de la escala o de las fuentes del juego colores de texto fuera de la gama, cajas que se salen de su caja, texto en columnas de una palabra por línea, lo que hay que desplazar, esquinas muy redondeadas y botones con letra de lectura. La medida está en `auditoria-medida.mjs`; también mide la composición: bloques de una fila con la misma altura o el mismo centro y el mismo hueco, columnas con el mismo borde y el mismo ancho, cajas con el mismo relleno a los dos lados, rellenos y huecos en la rejilla de 4 px, y bordes que casi coinciden (de 2 a 12 px) dentro de una misma caja, que se toman por descuadres. Con TODO=1 lista todas las distancias y con DETALLE=1 dice la regla de CSS de cada fallo. Con IDIOMA=eu, en euskera |
| `auditoria-partidos.mjs` | La misma auditoría en los marcadores y mandos de fútbol y pelota, montados sin el partido en 3D, en castellano y euskera y en cada estado de los botones (atacar, defender, portero, penaltis, lesionado, tarjeta, cambio y la ventana de cambios; golpe, gancho y volea) |
| `auditoria-pueblo.mjs` | La misma auditoría dentro del pueblo (TAM=844x390 o 1180x820): HUD, diálogo, cada pestaña del libro, mapa con la tarjeta de una misión y de un lugar, mochila, pausa, cada pestaña de la tienda y recompensa. Con IDIOMA=eu, en euskera; con EUFALTAN=1, además, la lista de lo que se queda sin traducir |
| `auditoria-ventanas.mjs` | La misma auditoría en las ventanas del juego (fichas, minijuegos, misión cumplida, cuestionarios). Con IDIOMA=eu, en euskera |
| `auditoria-medida.mjs` | La medida común de las cuatro auditorías. «justo»: texto de un botón que se sale o va a menos de 2 px de su borde. «imagen»: imagen deformada, descentrada en su caja, recortada más por un lado, con bandas vacías, desigual con las de sus tarjetas hermanas o con un encuadre que enseña menos del 70 %. Con MUESCA=1, todas miden con los márgenes de la muesca del iPhone 12 tumbado (47 px a cada lado y 21 abajo), que estrechan el menú: así se ve lo que en el iPhone se sale y en el ordenador no |
| `pelota-cubierto-ver.mjs` | El frontón cubierto: llegada, luz de pabellón a mediodía, grada, cámara de retransmisión siempre dentro y rebote hasta el techo |
| `futbol-vs-ver.mjs` | La presentación VS del fútbol: camisetas, medias, competición y que al tocar empieza el partido |
| `paquete-pelota.mjs` | Prepara los pelotaris y los sellos del autor desde su ZIP descomprimido: los de 512 y, para la VS, los de 1024 para la web y, para el archivo único, el rojo de 256, la camiseta azul suelta y los sellos de 176 |
| `paquete-futbol.mjs` | Prepara los jugadores de fútbol del autor desde su ZIP descomprimido: los de 1024 para la web |
| `jugadores-busto.mjs` | Recorta el busto de cada jugador de fútbol para la caja de la liga y el menú del club |
| `jugadores-duos.mjs` | Recorta las parejas de cada equipación del ZIP del autor: 960 de alto para la VS y 480 para los menús |
| `laminas-pequenas.mjs` | Las copias pequeñas de las láminas de la web, de 640 × 360 |
| `cimas-tarjetas.mjs` | Las escenas de las cimas de 1024 para las tarjetas de la web |
| `nitidez.mjs` | Nitidez de las imágenes en el iPhone 12 tumbado: cuánto se amplía cada una, por pantallas (URL de la web o del archivo único con MINI=1) |

Tamaños con que se revisa el diseño (`auditoria-diseno`, `-partidos`, `-ventanas` y `-pueblo`): móvil tumbado 667 × 375,
740 × 360, 844 × 390, 932 × 430 y 844 × 312 con muesca (Safari con sus barras), vertical 390 × 844 e iPad 1180 × 820 y
820 × 1180. Las auditorías de partidos y ventanas ponen la etiqueta viewport del juego en su página de pruebas: sin ella,
el móvil se pintaba a 980 px de ancho y no a su tamaño.
| `cambios-sim.mjs` | Cambios, lesiones y forma sin gráficos: el cambio espera a la parada, el suplente entra con la forma entera y sin tarjeta, cinco cambios en fútbol 11 y sin límite en sala, el expulsado no se cambia, la lesión grave frena y avisa, la leve se pasa y la tercera falta es amarilla |
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

En el iPhone, el iPad y Safari, `src/util/glb.js` hace que GLTFLoader lea las texturas de los modelos como imagen
normal y no como ImageBitmap (un complemento del cargador cambia su `textureLoader` por un `TextureLoader`). Con
ImageBitmap, Safari en iOS a veces subía la textura en negro: pelotaris y espectadores como siluetas. GLTFLoader ya
lo evita en Safari anterior al 17, pero lo reconoce por el nombre del navegador y la app instalada en la pantalla de
inicio no lo lleva. En los demás navegadores no cambia nada.

```
npx vite build
cp dist/index.html docs/index.html
cp dist/index.html MENDIMENDIZ-jugar.html
git push origin master:main
```
