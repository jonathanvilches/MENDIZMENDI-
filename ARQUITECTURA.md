# HERRIZHERRI · Arquitectura del código

El juego se llama Herrizherri desde el 2026-10-13 (antes, Mendimendiz). Solo cambia el nombre que se ve: las claves
de guardado (`mendimendiz-…`), la caché, los nombres de archivo y el repositorio siguen como estaban, así nadie pierde
su progreso.

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
| `src/world/relieve.js`, `src/data/relieve.js` y `src/world/panorama.js` | El relieve de verdad: desde cada uno de los 12 miradores, lo más alto que se ve en cada rumbo hasta cada distancia (diez «términos», de 300 m a 115 km), la silueta fina de cada monte de la misión con su cumbre a la altitud real, los montes que de verdad se ven desde allí, y el horizonte real de los 31 pueblos (grado a grado, más allá de 2,5 km). Los calcula `tools/relieve/perfiles.py` con el relieve de SRTM y GMTED2010 (USGS, dominio público) y van comprimidos (unos 18 KB); `cargarRelieve` los abre una vez antes de levantar el pueblo. Con ellos, la vista de los prismáticos en el mirador es el paisaje real (`Panorama.buildReal`: cada punto en su rumbo, a su distancia y con su ángulo reales, colores por altitud y clima, bosque, parcelas, roca, nieve, relieve menudo y bruma por distancia) y los montes del borde del pueblo siguen el horizonte real (`skylineFor`). Sin los datos (navegador sin `DecompressionStream`), los montes hechos a mano de antes |
| `src/actors/` | Seres vivos: jugador (`player`), personajes GLB, KayKit y Meshy (`glbChar`: clips del juego recortados de los de cada modelo, `loadMeshy`), vecinos (`npcGlb`: cuerpo KayKit con traje de su comarca), chicas sobre los modelos de Meshy (`chicas`: ver abajo), pelo de otro color (`hairColor`: ver abajo), trajes de vecinos y público y seres de leyenda (`outfits`: `OUTFITS`, `MYTHS`), trajes de carnaval y de leyenda hechos como los de verdad (`trajes`: ver abajo), público en gradas (`crowd3d`: figuras 3D cocinadas cerca de la cámara y láminas de `crowdSprites` de lejos; sentado en tendidos y gradas), animales (`animals` + `animalGlb` con los modelos de Quaternius; `beasts` es la versión procedural de reserva), minifiguras antiguas (`minifig`) y equipo (`gear3d`) |
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
| `src/assets/personajes/` | Ilustraciones del autor de 8 personajes de Navarra, en 16:9 y con el id de `data/personajes.js`: salen en las fichas de su misión (historia, placa y «Su huella hoy»), la de 1536 px en la web (y la de 2560, ampliada con `tools/laminas-grandes.mjs`, cuando la pantalla la pide; `src/web/hd.js`) y la de 320 en el archivo único. Las da `personajeUrl` de `ui/laminas.js` (alias `@personajes`); Sancho y las golondrinas llevan una lámina que ya estaba (`PERSONAJE_LAMINA`) |
| `src/assets/tradiciones/` | Ilustraciones del autor de 4 tradiciones, en 16:9: el canto de Gayarre (Roncal), los trovadores (Olite), la Bajada del Ángel (Tudela) y el Ttun-ttun (Isaba). Cada misión lleva su id en el campo `ilus` de `data/levels.js`. Salen en las fichas «¿Qué es?», «Cómo se hace» y «Antes y ahora» de la tradición y en la ficha de la danza, la de 1536 px en la web (y la de 2560 cuando la pantalla la pide) y la de 320 en el archivo único. Las da `tradicionUrl` de `ui/laminas.js` (alias `@tradiciones`) |
| `src/assets/cimas/` | Escenas del autor de las 16 cimas de las misiones de montaña, en 16:9 y con el id del monte: la tarjeta de cada cima (pantalla Cimas y comarca) lleva la de 1024 px (`tools/cimas-tarjetas.mjs`; la de 768 ya no se usa) y el buzón de cumbre, la de 1536 (o la de 2560 cuando la pantalla la pide); en el archivo único, solo la de 320, porque no caben más grandes. Las da `cimaUrl` de `ui/laminas.js` (alias `@cimas` y `@cimas-big`) |
| `src/assets/leyendas/` | Ilustraciones del autor de los 13 cuentos, en 16:9 y con el id de su cuento: el libro de leyendas lleva la de 768 px y el relato y el visor, la de 1536 (o la de 2560 cuando la pantalla la pide; en el archivo único, una sola de 640). Las da `leyendaUrl` de `ui/laminas.js` (alias `@leyendas` y `@leyendas-big`); si faltara, sale la lámina del pueblo (`CUENTO_LAMINA`) |
| `src/ui/escudoImg.js` y `src/assets/escudos/` | Escudos con el acabado del autor: los 65 del armorial (`heraldica/`, 512 px; 1024 en la ficha de la web), los emblemas propios de los 21 equipos de la liga (`equipos/`), los escudos de las casas (`casas/512`, con id `pueblo-n` = `houseArms(pueblo, n - 1)` de `data/blasones.js`; en su ficha, «en color» es la imagen y «en piedra» el dibujo tallado de la fachada; las casas sin imagen siguen con el dibujo) y los de los oficios (`oficios/512`, con los ids de `data/oficios.js` y de los jornales; en las fichas de los pasos del taller y del jornal). Casas y oficios solo van en la web (`tools/escudos-importar.mjs` los mete desde el paquete del autor); el archivo único los pide a la web con conexión (`hdUrl`). En el menú y en las fichas van como imagen; en la placa de la plaza y en la pared del frontón, `drawTownArms` pinta la imagen en el lienzo (se carga al empezar la partida, `armsReady`) y, si faltara, el dibujo de `world/armas.js` La fachada enseña la imagen del autor en cuanto llega (`casaReady` + `drawReady`, lienzo de 256 × 336 en `townGame.buildShields`; hasta entonces y en las casas sin imagen, el tallado dibujado; desde el archivo único la pide a la web con permiso de origen cruzado para poder subirla a la textura). La pantalla Escudos del menú lista los escudos de casa leídos (cartas `escudo:<pueblo>:<n>`) con la imagen del autor y abre la misma ficha. |
| `src/data/instrumentos.js`, `src/audio/instrumentos.js` y `src/ui/instrumentos.js` | Los instrumentos de la música de siempre de Navarra (txistu y tamboril, gaita navarra, txalaparta, ttun-ttun y txirula, pandero, bandurria y guitarra, trikitixa, kirikoketa): su ficha en el menú (Saberes · Instrumentos: qué es, cómo se toca, dónde suena, en el juego; con «Escuchar» y «Tocar»), su sonido sintetizado con el Web Audio del juego (cada uno con su timbre; sin muestras grabadas) y el minijuego de tocar: las notas bajan por su carril y se pulsan al llegar a la línea (teclas 1-4, flechas, A S D F o los botones), cada pulsación suena con el instrumento y el acompañamiento (tamboril, redoblante, ttakun, guitarra, bajos) lleva el tiempo; con el 60 % de las notas, carta de tradiciones (`instrumento:<id>`) e insignia «Música de plaza» a los tres. En la plaza de los pueblos de su zona hay un músico (`townGame.js`, `tocarCon`; en Otsagabia, `game.js`) que lo enseña. Los iconos de los ocho son del autor (`src/assets/icons3d`; los siete nuevos también a 512 en `icons3d/512`, alias `@icons3d-big`, para la ficha y las pantallas densas, por `hd.js`); `ui/icon3d.js` conserva sus dibujos en código por si faltara alguno. Las frases son del juego, al estilo de cada música |
| `src/data/pasaka.js`, `src/ui/pasaka.js` y `src/game/pasaka3d.js` | La pasaka, el juego directo de pelota de los trinquetes y los claustros (dos parejas frente a frente, red de 1,20 m, guante corto, saque con la mano, quinces y partidos a 13 juegos; fuentes: reglamentos de las federaciones vasca y navarra, Napike y la prensa de los Encuentros Iglesia y Pelota de la catedral de Pamplona). `ui/pasaka.js`: la ficha del menú (pantalla `pasaka` de `hub.js`, con la portada horneada por `tools/pasaka-portada.mjs`, una foto del partido en `src/assets/laminas/*/dep-pasaka.webp` que no está en `data/laminas.js` a propósito, para que no salga en el álbum de ilustraciones; si faltara, el dibujo de `pasakaPreview`), el premio al acabar (carta `pasaka:claustro` de tradiciones, puntos e insignia «Pasaka en el claustro») y el menú de entre partidos. `game/pasaka3d.js`: el partido en 3D con los avatares, en el sobreclaustro montado como el frontón cubierto (a 2.400 m, fuera del pueblo, suelo registrado con `addPlatform`): techo de vigas, arquería sobre el jardín con público de pie (`crowd3d`), banco con gente sentada, frontis con chapa, red, líneas y una valla de madera a nuestra espalda; tu avatar con tu rig (brazo del golpe con `armSwing`), el canónigo de pareja y dos vecinos de negro como rivales (Actores que mueve el partido, como en la pelota); física de la pelota, saque que tiene que llegar al frontis, quinces y partido a tres juegos; mando de pelota: palanca o flechas para moverse y, como en el frontón, Golpe mantenido carga la potencia mientras la palanca apunta a lo ancho y a lo largo y el jugador corre solo hacia donde va a caer la pelota (círculo dorado en el suelo, botón que brilla al alcance), más Dejada y Globo; el recinto lleva columnas torneadas, zócalos, cornisas, ventanas con alféizar, faroles, el marcador y el escudo de Pamplona en el frontis y el jardín con paseos, fuente, cipreses y setos; se ejecuta como la pelota (`G.mode = 'pelota'`, `G.pelotaTick`) con la cámara detrás de la valla por `follow.cinematic`. Gancho de pruebas `window.__pasaka`. Se entra desde Pamplona con el canónigo del claustro (`townGame.js`, `pasakaCon`, `playPasaka`, `pasakaIntro`) o desde el menú (`onSport('pasaka')`: Pamplona en modo campeonato, `pasakaOnly`, y al salir de vuelta a la pantalla `pasaka`). La interfaz del partido es la misma del frontón (`pelota/hud.js`: `pelotaStyle`, la X, el marcador en barra, los botones redondos, la palanca, el rótulo de la fuerza y el aviso central), con las clases `pel-*`; solo lo propio lleva `pk-*`. Mandos: la palanca o las teclas mueven siempre al avatar, también mientras se carga el golpe; al soltar, la inclinación de ese momento apunta (a lo ancho y a lo largo) y, si no hay inclinación, la pelota va hacia donde está. Las figuras van en la postura `Still` de `glbChar.js` (de pie y quietas; `Ready` flexionaba las rodillas sin parar) y solo se mueven al armar el brazo cuando viene la pelota y al golpear. Los vecinos devuelven el 95 % de las pelotas cómodas y fallan sobre todo cuando les haces correr (3 % por metro a partir de metro y medio) o les pegas fuerte (más de 15 m/s); cuando fallan, dos de cada tres veces le pegan mal (a la red o fuera) y la otra no llegan. En un partido automático largo (`window.__pasakaGames`), los azules ganan en torno al 40 % de los quinces y los peloteos duran unos 7 golpes. |
| `src/world/flora3d.js` y `leafSprig` (`src/ui/leafArt.js`) | Las plantas que se identifican en cada pueblo, en 3D. Los árboles tienen el porte de su especie (tabla `HABIT`: forma de la copa, dónde empieza, ramas principales y cuánto suben, copa en bultos, ramas torcidas, ramitas que cuelgan): tronco, ramas y ramillas de madera, y la copa hecha de cientos de ramitas planas con el dibujo de la hoja de su especie (`leafSprig`: hojas alternas, palmeadas o compuestas, mechones de agujas o ramitas planas del abeto). Los arbustos de hoja, un bulto oscuro por dentro con las ramitas por encima. Dos mallas por ejemplar (madera y hojas), sin archivos nuevos: las texturas se dibujan al entrar en el pueblo y se liberan al salir |
| Fotos de flora en el menú y en la ficha | En Naturaleza, la foto de la planta entera ocupa el ancho de la tarjeta y su hoja va en un círculo encima; en la ficha, la otra foto (la hoja o la planta) va en un círculo en la esquina de la foto grande y, tocándolo, se cambian. De los árboles, fotos del árbol entero, para reconocer su forma |
| Frontón cubierto | `PelotaCourt` con `hall: true` (`court.js`): cerrado, rebote y pared izquierda hasta el techo (`backH` y `leftH` de `setFeel`), grada con asientos y público sentado, luz de pabellón (`sky.indoor`). `hallVenue` en `fronton.js` lo monta aparte para el torneo y los partidos de Campeonatos; la calle queda para las misiones |
| `src/hub/` | Centro de mando: inicio, mapa, pueblos, personajes (los seis jugables), insignias, pasaporte y perfil; `stage` dibuja el escenario 3D del selector de personaje (`diorama` solo lo usa `lab/portadabake.html`) |
| `src/ui/` y `src/ui.js` | HUD, iconos SVG e iconos 3D horneados (`icon3d`, que guarda WebP en `src/assets/icons3d`), retratos, mapa y minijuegos pequeños |
| `src/data/` | Datos: pueblos y misiones (`levels.js`), comarcas con su cultura y su traje (`comarcas.json`), montes, fauna, comida y equipo (`equipo.js`), tiendas y producto estrella (`tiendas.js`), personajes (`cast.js`) y euskera (`eu.js`) |
| `src/i18n.js` | Castellano, euskera y modo «Aprende euskera» (botón ES para ver el castellano unos segundos) |
| `src/data/figuras.js` | Las figuras de leyenda (lamia, basajaun, sorgina, tartalo, Roldán) y de carnaval (joaldun, momotxorro, cascabobo, zipotero, coronel Lagunero, irasko, paloki): quién es cada una, cómo viste, dónde sale en Navarra y en qué pueblo y misión del juego. Las enseña `ui/figuras.js` en el inicio y en Personajes, con su imagen (`src/assets/figuras`, renders de sus trajes hechos con `tools/retratos.mjs`, provisionales: 768 px en la web, 384 en el archivo único, que con conexión pide la grande; cuando el autor entrega la ilustración de una figura, `tools/figuras-ilus.mjs` la deja en `src/assets/figuras/ilus` y esa manda, apaisada) y su ficha con pestañas |
| `src/audio.js` | Sonido procedural con Web Audio: ambiente, animales y música por ambientes (explorar, noche, misterio, tensión, juego, fiesta, deporte e inicio: en los partidos y los campeonatos, una música de juego con bajo y batería de estadio; en el menú, el tema de inicio, un tema propio de aventura con la orquesta sintetizada: trompas, cuerdas, coro, arpa, campanillas, bajo, timbales, caja y platillo; lo pone `main.js` al primer toque del menú y al volver a él) |
| `src/crowdAudio.js` | El público de la pelota y del fútbol, sintetizado: murmullo de treinta voces con formantes, aplauso de 160 personas a la vez, «¡oooh!», lamento y estallido. Se calcula una vez, a trozos, mientras carga el partido (`crowdBuffers`); `Crowd` lo reproduce con su nivel según el momento |

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
  enseñaban. En la web van todas, a 1280 × 720 y con copia de 640 × 360 para tarjetas (tools/laminas-pequenas.mjs) y
  grande de 2560 × 1440 (`src/assets/laminas/grande`, alias `@laminas-big`): el autor las entregó a 1280 y, a pantalla
  entera en un móvil de densidad 3 o en un ordenador (el inicio, la cabecera de la comarca, el visor), se veían
  pixeladas; las grandes salen de las de 1280 ampliadas al doble con Real-ESRGAN (tools/laminas-grandes.mjs) y solo
  las pide la pantalla que las necesita, con el mismo mecanismo de `src/web/hd.js` que usa el archivo único (en la web,
  `hdTable` con la tabla de las grandes). En el archivo único, a 640 × 360, solo las que se ven fuera del álbum (alias `@laminas` de `vite.config.js`). Con
  conexión (en el móvil, la tableta o el ordenador), el archivo único cambia cada imagen que en pantalla se ve más grande
  de lo que mide por la de la web publicada del tamaño justo (`src/web/hd.js`, con la lista `hd.json` que escribe la
  compilación web con los anchos de cada una): láminas, leyendas, cimas, personajes, tradiciones, fauna, flora, iconos,
  escudos, emblemas, sellos, pelotaris y el retrato del perfil; solo las que están a la vista, y sin conexión se queda con
  las de dentro; los escudos de las casas y de los oficios, que no van dentro, se piden a la web por `hdUrl`. En la web, la
  copia pequeña de cada lámina (`<id>-s`, de 640) sube a la de 1280 o a la de 2560 cuando se ve grande (las tarjetas de los
  pueblos en el móvil en vertical se veían pixeladas). Cuando una lámina se recorta (el inicio en el móvil tumbado, la
  ficha del pueblo, las tarjetas de comarca) se recorta el cielo: el personaje va abajo, con los pies casi en el borde. Todas
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
  miran a su izquierda: en la pantalla VS solo se gira la roja. Cada uno lleva en 3D el pelo de su figura
  (`pelotariHair`: el rubio Mikel, la pelirroja Leire…), con el tinte de abajo.
- **Pelo de otro color** (`src/actors/hairColor.js`): los personajes de Meshy traen todos el pelo castaño oscuro
  pintado en su textura y se tiñe en el material, encadenado al sombreador que ya tengan (la ropa de los vecinos, las
  equipaciones, la sombra de la cubierta de El Sadar). El pelo es lo castaño de la cabeza fuera de la cara: la cara es la
  franja de delante bajo las cejas, así los ojos (el iris también es castaño), las pestañas y la boca no cambian; en el
  pastor, lo que queda bajo el ala de la boina. Los colores (`HAIR_COLORS`: negro, castaño, castaño claro, cobrizo,
  pelirrojo, rubio oscuro, rubio, canoso y blanco) se dan como se quieren ver y se pasan al de la textura, que con la
  luz del juego se aclara mucho. Lo llevan los vecinos (el `hair` de su «look»), los futbolistas (uno por dorsal y
  equipo, `hairFor`) y los pelotaris rivales y compañeros. En las chicas, el pelo va en sus propias mallas
  (`userData.peloColor`): su textura es gris y el color lo pone el material (`peloMaterial`, con el brillo propio de
  `peloEmisivo`); lo pintado debajo se tiñe igual, con el brillo de referencia de la chica (`hairRef`). Las medidas
  salen de `tools/pelo/zonas.mjs` y se revisan con `tools/pelo/ver.mjs`.
- **Trajes de carnaval y de leyenda** (`src/actors/trajes.js`): la indumentaria de los personajes con traje, hecha
  según las fuentes de cada uno (anotadas junto a cada traje: el Museo del Traje y el Museo Etnológico de Navarra para
  los joaldunak, las crónicas de Altsasu para los momotxorros, el programa de Aoiz para los cascabobos, el de Vidángoz
  para los zipoteros…; de iraskos y palokis, lo que dice el propio juego). Va sobre el personaje de Meshy de cada traje
  (`TRAJES[id].model`), con su ropa pintada de los colores del traje (`ropa`, con `outfitTint`), y `vestirTraje` le cose
  las prendas: lo ceñido (pieles, sábanas, calzones, capuchas, caretas, el pelo de Basajaun) son los triángulos del
  propio cuerpo hinchados hacia fuera con sus mismos huesos (`ceñida`); las faldas, enaguas y faldones van en campana
  desde la cadera y hacia el bajo siguen a cada pierna (`campana`), y las esclavinas y chales, del pecho; melenas y
  barbas son tiras que bajan rozando el cuerpo, de la cabeza al pecho (`cortina`); lo rígido (ttuntturro, joareak,
  cestas con cuernos, cabezudos, sombreros de picos, herramientas en la mano) cuelga de su hueso. Las caretas, el antifaz
  y los trapos de la cara se pintan en una proyección de frente con los agujeros donde están los ojos del modelo, que se
  ven a través. Todas las texturas se pintan al vuelo en un lienzo: no ocupan imágenes. Los «looks» de `FOLK`
  (townGame) llevan `traje`, y los seres de leyenda lo toman de su `myth`. Se revisan con `tools/trajes/ver.mjs`
  (de frente, de espaldas, la cara de cerca y andando de lado) y `tools/trajes/hoja.py`.
  Para que la ropa vaya pegada al cuerpo y no parezca un añadido:
  - **Bordes limpios**: `ceñida` acepta en vez de sí o no un número con signo (dentro, fuera) y recorta los
    triángulos por donde cruzan el borde; el dobladillo engorda junto a él. Las aberturas de la cara (`sinCara`) y el
    nacimiento del pelo (`frentePelo`, redondeado por las sienes) se dan así.
  - **Capuchas, tocas y pañuelos a la medida del cráneo** (`ajustada`): el pelo de punta del modelo se aplasta contra
    el cráneo en el sombreador (`aplanarPelo`, que respeta siempre ojos y párpados) y la prenda va sobre él (`lisa`); lo
    que sobresale junto a la cara se lleva al cráneo, y lo que sigue al cuerpo se alisa (`alisar`: cada punto hacia la
    media de sus vecinos, con su normal rehecha; los triángulos que quedan del revés se quitan). La textura va por donde
    queda la prenda, así las capas coinciden sin manchas. La careta, igual por la frente (`frenteLisa`).
  - **Faldas que siguen al cuerpo** (`campana`): el perfil va en tramos de 0,03 y cada anillo se ajusta al contorno del
    cuerpo en su ángulo (`polar`/`radio`, también los pies abajo); bajo la rodilla, el bajo va también con la espinilla,
    y en medio, delante y detrás, menos con las piernas (no se mete entre ellas). Las faldas largas llegan al tobillo,
    con botines (`zapatos`) o los pies de pato de la lamia. El ribete del bajo lleva los mismos pliegues (`rango`).
  - **Volumen**: relieves de tela con mapas de normales (`relieve`: trama, pliegues, arrugas, saco), la tela tejida en
    sarga (`tejido`) y las abarcas con su lana y sus correas (`abarcas`). Melenas y barbas bajan rozando el cráneo cuando
    el pelo de debajo está aplastado (`rCraneo`).
- **Chicas** (`src/actors/chicas.js`): los personajes de Meshy son todos chicos; las chicas son el mismo modelo con la
  cabeza rehecha en Blender (`tools/blender/chicas`): el cráneo liso sin el pelo de chico (`cabeza.py`), el nacimiento
  del pelo (`nacimiento.py`), la textura repintada (`textura.py`: castaño bajo el pelo, del tono del pelo, para la nuca y
  detrás de las orejas; piel en la frente, las sienes y las patillas, fundida con la de alrededor; cejas finas,
  pestañas pintadas con tres sueltas en el rabillo y labios) y su peinado (`pelo.py`: la coleta con su goma y tres
  huesos, `Hair_1..3`, que `glbChar.js` mueve como muelles; la nariz, más pequeña). No va otro modelo entero:
  `tools/chicas/parche.mjs` guarda lo que cambia sobre el chico (los vértices que se mueven, cambian de normal o de UV y
  unos pocos nuevos, comprimidos con el códec de vértices de meshopt; la textura repintada, solo lo que cambia, en una
  capa webp con transparencia a la resolución de cada versión) y el pelo en su GLB. En el juego, `loadChica` lo monta
  sobre el chico ya cargado y se usa como cualquier personaje de Meshy (sus animaciones, su escala). La versión ligera
  se casa con la del chico vértice a vértice: los vértices partidos toman la UV más parecida a la suya y las capas del
  pelo de chico que quedan bajo la piel se hunden un poco. En el juego van la futbolista y la pelotari completas
  (fútbol y frontón) y la sanferminera ligera (vecinas, corredoras del encierro y trajes de lamia y sorgina, estas sin
  peinado: el pelo o la toca los pone el traje). Las vecinas llevan falda y delantal cosidos al cuerpo
  (`falda` de `trajes.js`). Todo se rehace con `tools/chicas/construir.sh <modelo> coleta <carpeta>` y se revisa con
  `tools/chicas/ver.mjs` (el chico, la chica y la ligera, de cerca; DIST, SOLA, OCULTA, PELO) y `tools/chicas/vecinas.mjs`.
- **Chicas y chicos en el fútbol** (`src/game/futbol.js`): la mitad de los jugadores y un tercio de los árbitros son
  chicas, por dorsal y equipo (un número fijo, mezclado con `mix` para que salgan repartidas), con la futbolista de
  `chicas.js` (la del equipo visitante, teñida de su equipación) y la goma del color del equipo. Se revisan con
  `tools/futbol/jugadoras.mjs` (SOLA=1 para verla sola). Las corredoras del encierro (`encierro.js`), las pelotaris
  rivales y compañeras (`rigPelotari` en `fronton.js`, de colorado en el lado rojo) y las vecinas también son chicas.
- **Caravinagre fuera**: no sale en Pamplona ni en ningún sitio; las partidas guardadas pasan solas a la lista de
  misiones de Pamplona sin él (`mig.pamplona1` en `profile.js`).
- **Jugadores de fútbol del autor** (`src/futbol/jugadorFig.js`, `src/assets/jugadores`): un chico y una chica por
  equipación, de cuerpo entero (1024 × 1536), su busto (360 × 480, `jugadorBusto`) y la pareja de los dos juntos
  (`jugadorDuo`: a su alto completo, unos 1.040 px, para la pantalla VS y 480 para los menús); el visitante, con la segunda equipación blanca o
  azul marino (`duoId`). Solo en la web: en el archivo único no caben nítidos y siguen las camisetas dibujadas
  (`kitSvgOf`).
  - **VS de equipo:** cada equipo sale con su pareja; la del rival, girada.
- **Composición de la pantalla VS** (`layoutVs` en `src/pelota/vs.js`, la misma para pelota y fútbol): se mide en cada
  pantalla al abrirla, al cargar las imágenes y las letras y al girar el móvil. En horizontal, una columna central tan
  ancha como el VS y las etiquetas (en columna si así deja más sitio); la línea del partido sube a la barra de arriba si
  cabe en una fila. Cada bando, lo más grande que cabe en su lado sin pisar esa columna, los dos a la misma altura, con
  la cabeza bajo la barra de arriba o, si no llega abajo, de pie sobre la barra de abajo. Ninguna placa tapa una cara
  (`FACE`: hasta dónde llega la cara en la imagen). En pelota por parejas, la figura delantera junto al centro y el
  compañero detrás, algo más pequeño (`MS`), hacia fuera: puede salirse del borde, pero no su cara. En vertical, arriba
  los azules y abajo los colorados, partidos por una diagonal con el VS en medio, cada placa sobre la cintura de los
  suyos y las etiquetas bajo la barra de arriba. Las placas, del ancho de su texto, sin hueco oscuro de más. La prueba
  visual: una página que solo abre la VS con figuras reales.
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
| `figuras-ilus.mjs` | Las ilustraciones de las figuras de leyenda y carnaval que entregue el autor (16:9, como las láminas): a 1280 y 640 en `src/assets/figuras/ilus`; en cuanto están, sustituyen al render del traje |
| `retratos.mjs` | Retratos para el menú con `lab/retratos.html`: de un avatar (busto, cuerpo entero y el grande de la web) o de una figura de leyenda o carnaval con su traje (`src/assets/figuras`) |
| `personajes-ver.mjs` | Capturas de la pantalla Personajes, la tira de figuras del inicio y una ficha, en escritorio y en el móvil tumbado |
| `hub-escritorio.mjs` | Capturas del menú en escritorio, pantalla por pantalla |
| `musica-inicio.mjs` | Graba la música de un ambiente (el tema de inicio) con un contexto fuera de línea: WAV, nivel por segundos y pico; `SOLO=` para medir cada instrumento |
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
| `relieve/descargar.sh` y `relieve/perfiles.py` | Descargan las teselas de relieve (nivel 8, unos 450 m por píxel; en Navarra salen de SRTM y GMTED2010, de dominio público, y se comprueba en la cabecera de cada una) y calculan con ellas `src/data/relieve.js`: rayo a rayo desde cada mirador y desde cada pueblo, con la curvatura de la Tierra y la refracción. Imprime qué montes se ven y cuáles quedan tapados. Uso: `sh tools/relieve/descargar.sh <carpeta nueva>` y `python3 -I tools/relieve/perfiles.py <carpeta> . src/data/relieve.js` |
| `mirador-ver.mjs` | La vista real desde el mirador de un pueblo: una captura hacia cada monte de la misión y otra con el visor abierto, sin rótulos, para comparar con fotos |
| `prismaticos-ver.mjs` | El visor de los prismáticos en el móvil tumbado o en el ordenador: botones encima, rótulos sin pisarse, la marca coge el monte y el ave |
| `pelota-camara-parejas.mjs` | Pelota por parejas: en cada golpe, si el que golpea sale en la imagen |
| `jugadores-duos.mjs` | Recorta las parejas de cada equipación del ZIP del autor: a su alto completo para la VS y 480 para los menús |
| `laminas-pequenas.mjs` | Las copias pequeñas de las láminas de la web, de 640 × 360 |
| `laminas-grandes.mjs` | Las láminas grandes de la web, de 2560 × 1440: las de 1280 ampliadas al doble con Real-ESRGAN (`laminas-ampliar.py`, en CPU) y guardadas en WebP; con un grupo (leyendas, cimas, personajes, tradiciones), lo mismo con sus ilustraciones de 1536 |
| `cimas-tarjetas.mjs` | Las escenas de las cimas de 1024 para las tarjetas de la web |
| `nitidez.mjs` | Nitidez de las imágenes en el iPhone 12 tumbado (o en un ordenador, con `VISTA=1920x1080` y `DPR=`): cuánto se amplía cada una, por pantallas (URL de la web o del archivo único con MINI=1) |
| `nitidez-hd.mjs` | Nitidez del archivo único con red (las imágenes grandes de `hd.json` se sirven desde `docs/`) o sin ella (`SIN_RED=1`): al llegar a cada pantalla y 5 s después |
| `escudos-importar.mjs` | Mete los escudos de casa y de oficio del paquete del autor (`inventario-completo.json` + `revision-512/` o `grande/`) en `src/assets/escudos/casas` y `oficios`, solo los revisados (`--todos` para los señalados; `--municipales` para sobrescribir el armorial) |
| `escudos-ver.mjs` | La ficha de un escudo de casa con la imagen del autor y su vista en piedra, y una ficha de oficio con su escudo, en el móvil tumbado (servidor de pruebas, o el archivo único con `ARCHIVO=`) |
| `portadas-movil.mjs` | Las portadas en el iPhone (inicio, lista de pueblos y ficha de un pueblo; `VISTA=390x844` para vertical): tamaño real de cada imagen frente al que ocupa y si la grande ha llegado |
| `instrumentos-ver.mjs` | Los instrumentos: la lista del menú, la ficha (con Escuchar), el minijuego tocado entero (pulsa cada nota a tiempo con el gancho `window.__tocar`) y la carta; luego el músico de la plaza en un pueblo. Capturas en escritorio y móvil |
| `pasaka-ver.mjs` | La pasaka en 3D: desde el menú (la pantalla con su portada, el botón que carga Pamplona en modo campeonato y lleva al sobreclaustro, el partido, la carta, el menú de entre partidos y la vuelta a la pantalla) y desde Pamplona (el canónigo del claustro, el diálogo, el partido y la vuelta junto a él). En cada partido, el saque y un golpe tuyos con el gancho `window.__pasaka`, el resto en automático y adelantado sin dibujar. Capturas en el móvil tumbado. |
| `encargo-portadas.py` | Paquete de encargo para regenerar las 110 láminas con más calidad en una herramienta de imágenes: las referencias actuales en JPEG numeradas por prioridad (portadas de pueblo, paisajes de comarca y deportes primero), hojas de contacto, `encargo.csv` y `encargo.json` con sitio, título, prioridad, nombre de entrega y prompt por imagen, y el LEEME con las instrucciones (16:9 al mayor tamaño, misma escena, el explorador igual, sin texto, PNG con el id como nombre). Lee los datos sin ejecutarlos. |
| `pasaka-portada.mjs` | Hornea la portada de la pantalla Pasaka: una foto del partido en el sobreclaustro sacada del propio juego en calidad alta, sin interfaz, en los cuatro tamaños de las láminas (`grande`, `web`, `web -s` y `mini`, como `dep-pasaka`). Volver a ejecutar cuando cambie el recinto. |

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
| `glb-abrir.mjs` | Descomprime un GLB de Meshy (meshopt y cuantización) para abrirlo en Blender. Su salida no es para three.js |
| `trajes/ver.mjs`, `trajes/hoja.py`, `trajes/caja.mjs`, `trajes/hueso.mjs` y `trajes/rayo.mjs` | Trajes: cada personaje con traje de cerca (frente, espalda, cara y andando) y su hoja; y para depurar, dónde acaba cada prenda con la piel, sus huesos y pesos, y qué tapa un punto de la cara |
| `pelo/zonas.mjs` y `pelo/ver.mjs` | Pelo de otro color: dónde están los ojos y cuánto brilla el pelo pintado de cada personaje de Meshy (píxel a píxel de su textura, en la pose de reposo) y la hoja de prueba con cada personaje y cada color de cerca |
| `pelo/parpados.mjs` | La línea del párpado de arriba de cada personaje de Meshy, medida en su textura (`blender/chicas/parpados.json`), para pintar las pestañas de las chicas |
| `blender/chicas/` y `chicas/construir.sh` | Las chicas, de principio a fin: cabeza, nacimiento del pelo, textura, peinado y exportación (Blender), y el parche para el juego (`chicas/parche.mjs`). Los pasos van en la cabecera de cada uno |
| `chicas/ver.mjs` y `chicas/vecinas.mjs` | Chicas en el juego de cerca (el chico, la chica y la ligera; frente, espalda, cara, perfil, nuca) y una fila de vecinas con falda, delantal, mayor y los trajes de lamia y sorgina |
| `futbol/jugadoras.mjs` y `futbol/cajas.mjs` | Chicas y chicos del fútbol de cerca (frente, espalda, cara, nuca, perfil y corriendo) y el tamaño de cada pieza del pelo |
| `blender/pelotari-chica/` | Prototipo de la versión chica del pelotari sobre su mismo cuerpo: cara repintada, nariz menor, coletas atadas al hueso de la cabeza. Los pasos van en la cabecera de `chica.py` |

Las pruebas usan Chromium con SwiftShader (muy lento), así que **simulan el tiempo de juego** llamando a
`update(1/30)` en bucle, en vez de esperar a los fotogramas.

## Publicar

El archivo único (`npx vite build`) es el que se abre en el móvil con Sitecase. Para que pese menos, los modelos 3D
van comprimidos con gzip (`vite.config.js`, plugin `glb-gzip`; los descomprime `src/util/glb.js` con el fflate de
three.js) y los personajes de Meshy con la textura a 1024 px (`src/assets/meshy-1024`, `tools/meshy-textura.mjs`).
El código del juego también va comprimido con gzip (plugin `js-gzip`): de unos 3,8 MB a 1,7 MB. Solo el código: las
imágenes, sonidos y modelos que van dentro ya están comprimidos, así que se sacan aparte (cada «data:…» suelto del
código, buscado en su árbol con `rolldown/parseAst`, pasa a ser `__hzD[n]` y sus textos van en el bloque `#hz-datos`).
Al abrir el archivo, el cargador `#hz-cargador` (unos 4,6 KB, con el mismo fflate) lo descomprime y lo ejecuta como el
módulo que era; si falla, lo recoge el aviso de arranque. Así queda casi 1 MB libre dentro de los 30 MB de Sitecase (con las chicas).
Con `MINI=1 npx vite` el servidor de pruebas carga lo mismo que el archivo único. La web (`WEB=1`) no cambia.
Con `LIGERO=1 npx vite build` sale una variante unos 6 MB más pequeña (`MENDIMENDIZ-jugar-ligero.html`): los
personajes de Meshy van en su versión ligera (`src/assets/meshy/lod`) y todo lo demás es igual.

La web se guarda con un service worker (`src/web/sw.js`): la página se pide primero a la red y sin la copia del
navegador, y lo demás sale de la caché. La app instalada en el iPhone vuelve de segundo plano tal como estaba, así que
`src/web/update.js` mira al volver qué versión hay publicada: si ha cambiado y se está en el menú, carga la nueva al
momento (con `?v=…`, una sola vez por versión); si se está jugando, sale en el menú un aviso «Versión nueva» para
actualizar con un toque.

La web se instala como app (prototipo para enseñar). `src/web/install.js` pone en la barra de arriba del menú un
botón «Instalar app» (en vertical, donde no cabe, es la primera fila de «Más»): en Android y en Chrome o Edge del
ordenador abre el aviso del navegador; en el iPhone y el iPad enseña los tres pasos de Safari, y deja compartir el
enlace. No sale en la app ya instalada ni en el archivo único. El icono, la portada con la que arranca la página
(`#portada-app` en `index.html`, se quita sola cuando sale el menú) y las pantallas de arranque del iPhone y del iPad
(`public/splash`, 17 tamaños de `src/web/splash.js` en vertical y en horizontal, enlazadas por `vite.config.js`) son
el explorador de la lámina de Ezkaba (del autor), de rodillas sobre el mapa y señalando a Navarra, que va como una
pegatina con un marcador (el contorno de `src/data/comarcas.json`, el del mapa del juego): `node tools/app-iconos.mjs`
los rehace todos. Las capturas del aviso de instalación (`public/capturas`) salen de `tools/app-capturas.mjs` con el servidor de
pruebas. La app instalada se juega en horizontal: en Android lo fija el manifest; el iPhone y el iPad no dejan fijarlo,
así que si se abre o se gira en vertical sale la pantalla «Gira la pantalla · Biratu pantaila» (`#girar-app` en
`index.html`, la misma que su pantalla de arranque en vertical) y `window.__girado` pone en pausa el bucle del juego
(`src/engine/runtime.js`) hasta volver a horizontal. En el navegador, sin instalar, se sigue pudiendo jugar en vertical.

En el iPhone, el iPad y Safari, `src/util/glb.js` hace que GLTFLoader lea las texturas de los modelos como imagen
normal y no como ImageBitmap (un complemento del cargador cambia su `textureLoader` por un `TextureLoader`). Con
ImageBitmap, Safari en iOS a veces subía la textura en negro: pelotaris y espectadores como siluetas. GLTFLoader ya
lo evita en Safari anterior al 17, pero lo reconoce por el nombre del navegador y la app instalada en la pantalla de
inicio no lo lleva. En los demás navegadores no cambia nada. Esas imágenes se descodifican al cargar el modelo, fuera
del hilo principal (`decodeAll`), y `shrinkMap` (`glbChar.js`) no las copia a un lienzo si no hay que reducirlas; si las
reduce, vacía la original. Copiarlas dejaba dos copias en memoria y el iPhone cerraba el juego al entrar.

```
npx vite build
cp dist/index.html docs/index.html
cp dist/index.html MENDIMENDIZ-jugar.html
git push origin master:main
```
