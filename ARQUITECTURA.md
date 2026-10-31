# HERRIZHERRI · Arquitectura del código

El juego se llama Herrizherri desde el 2026-10-13 (antes, Herrizherri). Solo cambia el nombre que se ve: las claves
de guardado (`herrizherri-…`), la caché, los nombres de archivo y el repositorio siguen como estaban, así nadie pierde
su progreso.

Este documento recoge las bases del proyecto: qué hace cada parte y cómo se relacionan. Hay que mantenerlo al día
cuando cambie la estructura. Las copias de seguridad son ramas de git `copia-AAAA-MM-DD` (el proxy no deja subir etiquetas).

## Pila

- **Three.js r180** (WebGL2) y **Vite** con `vite-plugin-singlefile`: el juego entero sale en un solo
  `dist/index.html` (modelos, texturas y sonidos incrustados). Se copia a `docs/` (GitHub Pages) y a
  `HERRIZHERRI-jugar.html` para entregarlo.
- **Sin servidor:** el progreso se guarda en `localStorage` (`herrizherri-perfil-v1`, en `src/game/profile.js`).
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
| `src/levels/townReal.js`, `src/world/townReal.js` y `src/data/reales/` | Pueblos con su trazado de verdad. Si hay `src/data/reales/<id>.json` (de `tools/pueblo-real.py` + `tools/pueblo-real-juego.py`), `engine/runtime.js` lo carga y `createRealTownLevel` da la misma interfaz que el generador (`levels/town.js`): relieve EU-DEM con interpolación cúbica (rejilla de 20 m en el pueblo y de 60 m hasta 1,5 km para el anillo de montes), ríos como polilíneas con el nivel bajando con la corriente (`RIVERS` con `pts`, que `world/water.js` dibuja como cinta; `rx` vale 9999 y las truchas usan `riverPointNear`), calles de los datos en `PATHS`, plazas de verdad (`plazaMask`), campos de los usos del suelo y lugares de las misiones buscados en sitios libres y llanos. Los monumentos de la ficha van sobre su edificio real si lo hay (por su nombre), si no en el lugar con nombre de monumento de los datos (el castillo de Cortes, el cerco de Artajona) y, si tampoco, en su sitio lógico (orilla, lo más alto, junto a la iglesia); la muralla en anillo quita las casas que cruza. En los pueblos sin plaza en los datos, el centro es el hueco libre más cercano al ayuntamiento o a la iglesia. Antes de levantar nada, `levels/ordenar.js` pone orden: las filas de casas adosadas y las manzanas que los datos traen como un solo contorno se parten en casas de unos 9 m de fachada (las manzanas con patio, solo en los cascos de la Zona Media, la Ribera y las ciudades, y solo por los lados que dan a una calle); las casas junto a una calle se alinean con ella si casi lo están; cada una se recorta lo justo para dejar libres la calle, el puente, el río con su muro y la plaza (si casi no queda, no se levanta); dos que se pisan quedan pared con pared; y la puerta va a la fachada con sitio delante que da a la calle o a la plaza. Los puentes que cruzan agua se alargan hasta tierra firme y, donde una calle cruza el agua sin puente, se pone uno. En el casco, el cauce se estrecha donde una calle va por la orilla y se cubre donde la calle va encima. La iglesia, el ayuntamiento, el frontón y las casas de los monumentos no se tocan. `townBuilder.js` levanta las casas de los datos (`realHouses`: rectángulo con la fachada a su calle y su altura; con todo el detalle solo las más cercanas, 80/120/160 según la calidad, y el resto como bloque con tejado), los puentes (`realBridges`: tablero con lomo que nunca se hunde en el terreno, de lomo de asno en los de piedra de siempre; debajo, los muros hasta el suelo con tantos arcos como quepan, cada uno con su bóveda, y tajamares en las pilas del agua; suelo pisable por `addPlatform`) y los muros del cauce. El frontón va donde el real si los datos lo traen. Los JSON van en formato compacto (versión 2: líneas como diferencias entre puntos, relieve por predicción, casas como listas; unos 17 KB comprimidos por pueblo) y `data/reales/compacto.js` los devuelve a la forma de siempre al cargarlos. Con `?real=0` se juega el generado. Atribución de OpenStreetMap (ODbL) y EU-DEM en la ficha del pueblo y en `src/data/reales/LICENCIA.txt` |
| `src/world/relieve.js`, `src/data/relieve.js` y `src/world/panorama.js` | El relieve de verdad: desde cada uno de los 12 miradores, lo más alto que se ve en cada rumbo hasta cada distancia (diez «términos», de 300 m a 115 km), la silueta fina de cada monte de la misión con su cumbre a la altitud real, los montes que de verdad se ven desde allí, y el horizonte real de los 31 pueblos (grado a grado, más allá de 2,5 km). Los calcula `tools/relieve/perfiles.py` con el relieve de SRTM y GMTED2010 (USGS, dominio público) y van comprimidos (unos 18 KB); `cargarRelieve` los abre una vez antes de levantar el pueblo. Con ellos, la vista de los prismáticos en el mirador es el paisaje real (`Panorama.buildReal`: cada punto en su rumbo, a su distancia y con su ángulo reales, colores por altitud y clima, bosque, parcelas, roca, nieve, relieve menudo y bruma por distancia) y los montes del borde del pueblo siguen el horizonte real (`skylineFor`). Sin los datos (navegador sin `DecompressionStream`), los montes hechos a mano de antes |
| `src/actors/` | Seres vivos: jugador (`player`), personajes GLB, KayKit y Meshy (`glbChar`: clips del juego recortados de los de cada modelo, `loadMeshy`), vecinos (`npcGlb`: cuerpo KayKit con traje de su comarca), chicas sobre los modelos de Meshy (`chicas`: ver abajo), pelo de otro color (`hairColor`: ver abajo), trajes de vecinos y público y seres de leyenda (`outfits`: `OUTFITS`, `MYTHS`), trajes de carnaval y de leyenda hechos como los de verdad (`trajes`: ver abajo), público en gradas (`crowd3d`: figuras 3D cocinadas cerca de la cámara y láminas de `crowdSprites` de lejos; sentado en tendidos y gradas), animales (`animals` + `animalGlb` con los modelos de Quaternius; `beasts` es la versión procedural de reserva), minifiguras antiguas (`minifig`) y equipo (`gear3d`) |
| `src/game/` | Reglas y misiones: `townGame` (misiones, interacción y pasos de cada pueblo), `game` (Salazar), minijuegos grandes (`encierro` + `encierroPlaza` + `encierroTex`, `futbol`, `fronton`), vida del pueblo (`tienda`, `mercado`, `mochila`, `perro`, `chase`, `crowd`), señales y objetos (`senales`, `items`), perfil (`profile`) y contenido (`content`) |
| `src/pelota/` | Motor de pelota a mano independiente: reglas, física, IA (cinco niveles en `rules.js`), HUD, cancha, fichas técnicas de los pelotaris (`ficha.js`: datos inventados que salen del nombre, cualidades y golpes), el frontón que juega (`courtFeel` en `rules.js` y `setFeel` en `physics.js`: a cubierto, piedra, mojado o Labrit), la pelota elegida (`BALLS` en `rules.js`: normal, viva, muerta, de mucho bote y de poco bote, que multiplican esa física) y la pantalla VS (`vs.js`). El golpe es siempre manual (`game.js`): sale al soltar el botón y cuenta el momento respecto al justo (`idealAt`, con lo que perdona cada nivel en `TOL`); antes del bote es volea y alta, gancho. La energía (`EN` y `shotEnergy`) baja sobre todo con las cortadas seguidas y al esprintar a por una dejada, algo con dos paredes y ganchos, y sube peloteando normal. La cámara dinámica opcional está en `match.js` (`camDyn`). Las simulaciones de los golpes (`landingOf` y la dos paredes en `physics.js`) solo guardan los eventos y paran al botar El saque, de un solo gesto, como en el frontón: mantienes GOLPE para elegir la fuerza (la palanca apunta) y, al soltar, el pelotari sale corriendo del 7, bota la pelota hacia el suelo sin frenar y el golpe sale solo en el 4, con esa fuerza y esa puntería; el rival saca igual. La pelota del bote va con el que saca, en su tiempo (`tempo`), y se bota antes cuanto más despacio va, para que el golpe caiga siempre en el 4 |
| `src/game/pelotaris.js` | Colección de pelotaris: uno por pueblo, su carta al jugar contra él y los demás con la figura del pelotari de su frontón y un candado, por comarcas |
| `src/futbol/` | Fútbol 11 y sala: motor del partido (`game.js`), reglas por formato (`rules.js`), partido en 3D (`match.js`) y marcador y mandos (`hud.js`). Cada jugador tiene forma (`fit`), que baja jugando y más esprintando, y la energía no pasa de ella; las faltas por detrás o en plancha pueden lesionar (leve: cojea un rato; grave: corre menos y no esprinta). Cambios: cinco en fútbol 11 y sin límite en sala; el pedido con el balón en juego se hace en la siguiente parada; el rival cambia solo a lesionados y cansados, y tu equipo también con «Cambios automáticos». A la tercera falta de un mismo jugador, amarilla. El portero sale a cortar los pases al hueco. En pantalla: la ficha de tu jugador (número, puesto, energía, forma perdida en rayas, tarjeta y lesión), el aviso de cambio bajo la pausa y la ventana «Cambios» con los dos equipos |
| `src/game/rutinas.js` | La tarea de cada vecino del pueblo (misa, compra, charla, jugar a pillar, fuente, pan, paseo): sus paradas, cuánto se queda en cada una, hacia dónde mira y qué hace; `Actor.arrive` las cumple |
| `src/data/hitzak.js` | Las palabras en euskera que enseñan los vecinos: cada uno, una de lo que está haciendo (quien va a la fuente, «ura»; quien pasea con lluvia, «euria»), con una pregunta de tres opciones. Cuando ya sabes unas cuantas, uno de cada dos vecinos charla contigo en euskera (`HIZKETAK`, 14 conversaciones): te dice algo, con el castellano al lado, y eliges qué contestar entre tres frases; la del tiempo que hace depende del cielo. Se guardan en el perfil (`hitzak` y `hizketak`: 1 oída, 2 acertada), se repasan con otros vecinos y se ven en el cuaderno del pueblo, pestaña Euskera, y en el modo didáctico; sus plantillas de euskera (`EU_RX_HITZAK`) dejan las palabras tal cual y, en euskera, quitan el castellano de al lado |
| `src/mando/` y `public/mando/index.html` | El móvil como mando, como en los juegos de Netflix. En el ordenador («Mando del móvil» arriba, o Ajustes y Pausa: «Usar el móvil como mando») sale un QR y un código de cinco letras; el móvil abre `mando/` (sin instalar nada, Android o iPhone) y, tras el saludo, los dos hablan directamente por la wifi con WebRTC (`mando.js`) o, si la wifi no lo deja, por el propio saludo. El saludo (`senal.js`, el mismo archivo en los dos: la web lo publica en `mando/senal.js`) va a la vez por PeerJS, cinco servidores públicos de MQTT (dos por el puerto 443) y ntfy.sh, cifrado con el código salvo en PeerJS; vale el primero que contesta, lo repetido se cuenta una vez, los caminos caídos se vuelven a probar y el mando, si va por el saludo, usa los caminos por los que ya ha llegado algo del otro. Las dos pantallas enseñan qué servidores contestan. Seguridad: todo va cifrado y firmado (AES-GCM) por todos los caminos y los nombres en los servidores son una huella del código; el QR lleva además un secreto de 128 bits detrás del «#», que no pasa por ningún servidor, y con él se entra directamente; quien escribe el código a mano necesita el permiso del ordenador; solo manda el móvil aceptado; lo repetido o grabado y vuelto a mandar no vale; la página del móvil (`mando/index.html` y `mando/movil.js`) solo carga código de la propia web y solo habla con los servidores del saludo. El móvil se presenta como un mando estándar (`pad.js`), que también lee los mandos Bluetooth o USB de verdad. Lo que hace cada botón depende del momento (`contextos.js`): mandos fijos para el pueblo, el encierro, los prismáticos, los diálogos, la pelota, la pasaka, el fútbol, el esquileo y la costura; en el resto de minijuegos y ventanas, el móvil copia los botones que se ven en pantalla y hace de panel táctil con una flecha (`cursor.js`). Para conectar rápido, el móvil busca sus rutas de red mientras llega al saludo, la oferta y la respuesta salen sin esperar a todas (las demás van sueltas) y, si en 0,7 s no hablan directamente, el mando ya funciona por el saludo y pasa solo a la conexión directa cuando la hay. El saludo no se da nunca por perdido: si se cae el único servidor que había contestado (en la calle, PeerJS a veces acepta y se cae enseguida), siguen los que aún estaban llegando y cada uno se vuelve a probar a los 2, 4 y 8 s y luego cada 15; el ordenador, al volver a probar, conserva el código, así que el QR que ya tiene el móvil sigue valiendo. En el móvil se juega con los mismos botones que se ven en la pantalla del juego al jugar en el móvil, para no confundir: en el fútbol, los de su pantalla (TIRO en la esquina, PASE a su izquierda, SPRINT encima y CAMBIAR en diagonal, con sus colores e iconos; al defender, ROBAR y ENTRADA; con el portero, en turquesa: `contextos.js` lee los rótulos de la pantalla en cada momento); en la pelota y la pasaka, GOLPE grande y rosa con CORTADA o GLOBO y DEJADA en columna; en lo demás, los círculos morados del pueblo con el principal en rosa en la esquina y los demás a su izquierda, encima y en diagonal; si hay uno que se queda puesto (Correr), ese va a la izquierda del principal y los demás encima, como en la pantalla del pueblo con el móvil en vertical (Acción en la esquina, Saltar encima y Correr a su izquierda), y con tres o menos, más grandes. La palanca es la del juego: el círculo de trazos con MOVER y, donde se apoye el pulgar, el aro con el botón blanco. Arriba, en qué se está y los botones de sistema, redondos (cuaderno, mapa, perro, menú, pausa, salir), y delante los de acción que se usan poco (en el pueblo, la mochila y los prismáticos), para dejar sitio abajo a hablar, saltar y correr. Los del fútbol y la pelota llevan su nombre dentro, como en su pantalla, en la letra del juego (Barlow Condensed y Nunito, OFL, copiadas en `mando/fuentes` con sus licencias); si el nombre no cabe, solo el icono. Los del pueblo y el encierro van solo con su icono, que ya se entiende (Acción, Saltar, Correr, Mochila, Prismáticos, Cámara, Anotar, Seguir); el nombre queda para el lector de pantalla. `contextos.js` dice qué se queda puesto (`fijo`), qué botón de hombro va con los de acción (`der`), qué botón de acción va arriba (`arriba`) y con qué botones del juego se pinta (`estilo`). Las pruebas usan `?senal=`, `?mqtt=` y `?ntfy=` con servidores locales, `?sinpeer`, `?sinp2p` y `?trozo=` En el pueblo, arriba a la izquierda del móvil, la misión que sigues y su paso, como el recuadro del juego; al tocarla, todas las del pueblo como en el cuaderno (hechas, en curso y nuevas, con sus pasos) y, tocando una, el ordenador pasa a seguirla (`misMovil` y `seguirMision` de `contextos.js`). La app «Mando»: la página del móvil se instala (`manifest.webmanifest`, a pantalla completa y en horizontal, con su icono, la palanca del autor sobre morado: `tools/mando-iconos.mjs`, y su propio `sw.js`, que pide siempre la red y guarda una copia); se ofrece en la pantalla de conectar y una vez al conectar (en Android con su botón; en el iPhone, Compartir y «Añadir a pantalla de inicio»). El móvil se queda con el ordenador: este guarda su código y su secreto (el QR es siempre el mismo) y, al conectar, le manda el secreto solo por la conexión directa; la app, abierta sin enlace, se conecta sola, y si el juego aún no está abierto espera sin error. El ordenador, si ya se conectó un móvil, le espera al abrir el juego sin abrir el panel (`esperarMovil`). Con el código a mano se pide permiso la primera vez y ya no más. «Olvidar este móvil» lo borra en los dos. Nada se queda pulsado: el móvil numera la palanca y los botones (por el saludo pueden llegar desordenados y el ordenador se queda con lo más nuevo), repite lo que mantiene (la palanca cada 0,3 s y los botones cada 0,5) y manda el «quieto» tres veces; el ordenador (`pad.js` y `mando.js`) suelta lo que no se repita en 1,5 s, y todo al cortarse, al irse un mando o al perder la ventana. En el móvil, la palanca se suelta también desde la ventana, sin dedos en su mitad o al irse la página, y otro dedo que toca manda él, como en las palancas de la pantalla del juego |
| `src/ui/sport.css` y `src/ui/sportCard.js` | Estilo deportivo de todo el juego: letra condensada (Barlow Condensed, OFL), morados con fucsia y rosa, fondos de retransmisión, botón fucsia, entradas escalonadas y las cartas de jugador con media y cualidades (la media sale de `pelotariRating` en `pelota/rules.js`) |
| `src/ui/frames.js` | Marcos de las cajas con esquinas en ángulo: cada caja con borde y clip-path lleva su marco entero, con las diagonales, como border-image (un SVG que se adapta al tamaño). Tabla de selector, forma (corte o paralelogramo), tamaño y color |
| `src/web/todo.js` | «Descargar el juego entero» (Perfil, en la web y la app instalada): baja los archivos de esta versión (la lista con sus tamaños la escribe `vite.config.js` en `todo.json`) a la misma caché del service worker; luego los pueblos y los minijuegos abren sin esperar a internet y se juega sin conexión |
| `src/util/tele.js` | La pantalla grande (una tele o un monitor grande): la interfaz se diseña a 1440 × 810 y, por encima, crece en la misma proporción con `zoom` en `<html>` (a 1920 × 1080, un 33 %; en una tele 4K a tamaño real, 2,66 veces), y las ventanas medianas (la de antes del partido y las pausas de la pelota y del fútbol, la pausa y las fichas del pueblo, el cuadro del torneo y el diálogo) otro 20 % (`<html class="tele">`, con su `--z` total, `--zt`), para que ocupe todo el ancho y se lea desde el sofá. Los `vw` y `vh` del CSS van divididos por `--z`, las vistas 3D a pantalla entera llevan la clase `pantalla3d`, que deshace el zoom, y lo que se mide en píxeles de la pantalla (clics, `getBoundingClientRect`) se pasa a los del CSS con `enCss()`. Las reglas `@media` miran la pantalla sin ampliar: la única entre 810 y 900 de alto, la del final de capítulo, se repite con `<html class="tele-bajo">`. Solo sin dedo y con el zoom estándar (`currentCSSZoom`); si no, todo sigue igual |
| `src/util/tactil.js` | Si se juega con el dedo (`pointer: coarse`: móvil y tableta; `<html class="tactil">`). Solo entonces salen los controles de pantalla (la palanca y los botones de jugar); en un ordenador, aunque su pantalla sea táctil, y en una tele, nunca. Con el mando del móvil conectado (`<html class="con-mando">`, `mando/mando.js`) se esconden en todas partes y vuelven al desconectarlo; los botones de los minijuegos se quedan, porque el móvil los copia. Los del fútbol se crean siempre, escondidos sin dedo, para que el móvil lea sus rótulos (PASE, ROBAR, PARAR…) también en el ordenador |
| `src/ui/encaje.js` | Ninguna palabra partida ni cortada con «…»: vigila lo que se añade a la página y, en los textos que podrían partir una palabra larga o cortarse con puntos, baja la letra poco a poco (hasta el 65 % y nunca por debajo de 12 px) hasta que todo cabe entero; si no basta, el texto con puntos pasa a dos líneas |
| `src/ui/fitlabel.js` | Rótulos de los botones redondos (fútbol y pelota) siempre dentro del círculo: mide cada línea del texto contra el círculo y, si no cabe, lo parte en dos líneas y luego junta las letras, sin bajar nunca de 12 px. Se vuelve a mirar al cambiar el rótulo y el tamaño de la pantalla |
| Identidad común | Reglas que valen en todo el juego (`style.css`, `sport.css`): escala de letra 12, 14, 16, 20, 24 y de 32 en adelante; rótulo en letra estrecha rosa de 14 px con raya inclinada (`.kicker`); título en la letra de rótulos grandes con interlineado 1; distancias entre textos con la tabla de ritmo (ver «Ritmo de los textos» abajo); botón principal en la letra de rótulos grandes sobre el degradado y los demás en letra estrecha en mayúsculas; textos en blancos y lilas fríos, rosa para destacar; verde solo para acierto, naturaleza y los colores de comarcas y clubes; esquinas casi rectas (4 px), cortadas en ángulo o círculos, y pestañas, filtros y chips en letra estrecha: una sola lista en `sport.css` para los dos. Degradados: nunca duros ni de lado; si hace falta uno, muy paulatino, de menos a más y sutil, en varios tramos y sin saltos de oscuridad en poco espacio. La misma identidad en toda la aplicación: lo que se haga en una pantalla vale para todas. Composición: todo en la rejilla de 4 px; el mismo margen en las cuatro esquinas de la pantalla de juego (`--edge` y `--thumb`, 16 px); las ventanas de papel con 12 px arriba, a los lados y abajo; en el menú, el margen de los lados (`--gut`) igual para el contenido y para la barra de arriba |
| `src/ui/infocard.css` | Las fichas de información (planta, animal, lugar, oficio, cima, escudo, misión cumplida): un mismo orden para todas (imagen con su etiqueta, cabecera, contenido en pestañas o texto, etiquetas y botón al pie) y los mismos espacios (16, 12 y 8 px). También la ficha de un sitio en el mapa del pueblo |
| `src/ui/floraFoto.js` y `src/assets/flora/` | Fotos reales CC0 de iNaturalist de las 51 plantas (la planta o su flor y su hoja): 720 px en la web (`web/`) y 380 px en el archivo único (`mini/`), elegidas por el alias `@flora-fotos` de `vite.config.js`. Autores en `fotos.json`; enlaces en `legal/fotos-flora.csv`. En WebP, como las láminas (algunos visores del iPhone no enseñan AVIF). Sin foto, la ficha usa la lámina dibujada (`floraArt.js` y `leafArt.js`) |
| `src/ui/faunaImg.js` y `src/assets/fauna/` | Ilustraciones del autor de los 31 animales (cuerpo entero, fondo transparente): la ficha de cada uno con la de 1280 px en la web y la de 512 en el archivo único (alias `@fauna-big`; las de 512 se rehacen desde las de 1280 con `tools/fauna-512.mjs`, a calidad 80 para que quepan), y las tarjetas del cuaderno con la de 512 en la web y la de 256 en el archivo único (`@fauna-small`) |
| `src/ui/fonts.css` | Las tipografías incrustadas (Lilita One y Nunito, de @fontsource), solo en WOFF2: así el archivo único no lleva la copia WOFF de reserva |
| `src/assets/personajes/` | Ilustraciones del autor de 8 personajes de Navarra, en 16:9 y con el id de `data/personajes.js`: salen en las fichas de su misión (historia, placa y «Su huella hoy»), la de 1536 px en la web (y la de 2560, ampliada con `tools/laminas-grandes.mjs`, cuando la pantalla la pide; `src/web/hd.js`) y la de 320 en el archivo único. Las da `personajeUrl` de `ui/laminas.js` (alias `@personajes`); Sancho y las golondrinas llevan una lámina que ya estaba (`PERSONAJE_LAMINA`) |
| `src/assets/tradiciones/` | Ilustraciones del autor de 4 tradiciones, en 16:9: el canto de Gayarre (Roncal), los trovadores (Olite), la Bajada del Ángel (Tudela) y el Ttun-ttun (Isaba). Cada misión lleva su id en el campo `ilus` de `data/levels.js`. Salen en las fichas «¿Qué es?», «Cómo se hace» y «Antes y ahora» de la tradición y en la ficha de la danza, la de 1536 px en la web (y la de 2560 cuando la pantalla la pide) y la de 320 en el archivo único. Las da `tradicionUrl` de `ui/laminas.js` (alias `@tradiciones`) |
| `src/assets/cimas/` | Escenas del autor de las 16 cimas de las misiones de montaña, en 16:9 y con el id del monte: la tarjeta de cada cima (pantalla Cimas y comarca) lleva la de 1024 px (`tools/cimas-tarjetas.mjs`; la de 768 ya no se usa) y el buzón de cumbre, la de 1536 (o la de 2560 cuando la pantalla la pide); en el archivo único, solo la de 320, porque no caben más grandes. Las da `cimaUrl` de `ui/laminas.js` (alias `@cimas` y `@cimas-big`) |
| `src/assets/leyendas/` | Ilustraciones del autor de los 13 cuentos, en 16:9 y con el id de su cuento: el libro de leyendas lleva la de 768 px y el relato y el visor, la de 1536 (o la de 2560 cuando la pantalla la pide; en el archivo único, una sola de 640). Las da `leyendaUrl` de `ui/laminas.js` (alias `@leyendas` y `@leyendas-big`); si faltara, sale la lámina del pueblo (`CUENTO_LAMINA`) |
| `src/ui/escudoImg.js` y `src/assets/escudos/` | Escudos con el acabado del autor: los 65 del armorial (`heraldica/`, 512 px; 1024 en la ficha de la web), los emblemas propios de los 21 equipos de la liga (`equipos/`), los escudos de las casas (`casas/512`, con id `pueblo-n` = `houseArms(pueblo, n - 1)` de `data/blasones.js`; en su ficha, «en color» es la imagen y «en piedra» el dibujo tallado de la fachada; las casas sin imagen siguen con el dibujo) y los de los oficios (`oficios/512`, con los ids de `data/oficios.js` y de los jornales; en las fichas de los pasos del taller y del jornal). Casas y oficios van de 512 en la web, de 192 en el archivo ligero y de 96 en el archivo único, que no tiene sitio para más (`tools/escudos-importar.mjs` los mete desde el paquete del autor y saca los pequeños); con conexión, la fachada (`casaReadyHD`) y la ficha (`web/hd.js`) suben a los de 512 de la web. En octubre de 2026 el inventario del autor deja 167 casas de 22 pueblos sin imagen (todas las de Pamplona, Tudela, Estella, Olite...): esas siguen con el tallado dibujado hasta que lleguen. La pared de la pasaka pinta el escudo de Pamplona del autor en cuanto carga (`armsReady` + `drawReady`). En el menú y en las fichas van como imagen; en la placa de la plaza y en la pared del frontón, `drawTownArms` pinta la imagen en el lienzo (se carga al empezar la partida, `armsReady`) y, si faltara, el dibujo de `world/armas.js` La fachada enseña la imagen del autor en cuanto llega (`casaReady` + `drawReady`, lienzo de 256 × 336 en `townGame.buildShields`, que pone primero en las fachadas las casas que ya tienen imagen: cada pueblo tiene entre 0 y 8 fachadas con escudo, `tools/escudos-cuenta.mjs` las cuenta; hasta entonces y en las casas sin imagen, el tallado dibujado; desde el archivo único la pide a la web con permiso de origen cruzado para poder subirla a la textura). La pantalla Escudos del menú lista los escudos de casa leídos (cartas `escudo:<pueblo>:<n>`) con la imagen del autor y abre la misma ficha. El armorial es la serie de octubre de 2026 del autor (en volumen con marco, `heraldica/512`, importada con `--municipales --todos`); la serie anterior, plana con cadena, queda guardada en `heraldica-anterior/` sin usarse. Las copias de 1024 de la ficha (`heraldica/1024`, `casas/1024`, `oficios/1024`) son ampliaciones al doble con Real-ESRGAN (x2) de las de 512, hasta que lleguen los originales de 1254. |
| `src/data/instrumentos.js`, `src/audio/instrumentos.js` y `src/ui/instrumentos.js` | Los instrumentos de la música de siempre de Navarra (txistu y tamboril, gaita navarra, txalaparta, ttun-ttun y txirula, pandero, bandurria y guitarra, trikitixa, kirikoketa): su ficha en el menú (Saberes · Instrumentos: qué es, cómo se toca, dónde suena, en el juego; con «Escuchar» y «Tocar»), su sonido sintetizado con el Web Audio del juego (cada uno con su timbre; sin muestras grabadas) y el minijuego de tocar: las notas bajan por su carril y se pulsan al llegar a la línea (teclas 1-4, flechas, A S D F o los botones), cada pulsación suena con el instrumento y el acompañamiento (tamboril, redoblante, ttakun, guitarra, bajos) lleva el tiempo; con el 60 % de las notas, carta de tradiciones (`instrumento:<id>`) e insignia «Música de plaza» a los tres. En la plaza de los pueblos de su zona hay un músico (`townGame.js`, `tocarCon`; en Otsagabia, `game.js`) que lo enseña. Los iconos de los ocho son del autor (`src/assets/icons3d`; los siete nuevos también a 512 en `icons3d/512`, alias `@icons3d-big`, para la ficha y las pantallas densas, por `hd.js`); `ui/icon3d.js` conserva sus dibujos en código por si faltara alguno. Las frases son del juego, al estilo de cada música Desde octubre de 2026 cada instrumento toca un aire tradicional de Navarra (`game.air`: biribilketa, jota de Estella, ttakun eta herrena, bolant-dantza de Luzaide, arin-arin, jota de la Ribera, fandango y kirikoketa), frases cortas del juego al estilo de cada uno, de autor desconocido (no son transcripciones de una pieza concreta; si el autor manda las notas de una, se cambia la frase). Hasta cinco carriles (teclas A S D F G o 1-5); el botón de cada carril va dentro del escenario, al pie de su carril, y es el objetivo: la nota baja hasta su centro y el botón se enciende cuando le llega (ventana de 0,3 s; 2,3 s de caída). En el móvil no hay letras de teclas en los botones. La imagen del instrumento de la ficha pide la de 1024 (`icons3d/1024`, de los PNG de 1254 del autor) en pantallas densas. |
| `src/data/pasaka.js`, `src/ui/pasaka.js` y `src/game/pasaka3d.js` | La pasaka, el juego directo de pelota de los trinquetes y los claustros (dos parejas frente a frente, red de 1,20 m, guante corto, saque con la mano, quinces y partidos a 13 juegos; fuentes: reglamentos de las federaciones vasca y navarra, Napike y la prensa de los Encuentros Iglesia y Pelota de la catedral de Pamplona). `ui/pasaka.js`: la ficha del menú (pantalla `pasaka` de `hub.js`, con la portada horneada por `tools/pasaka-portada.mjs`, una foto del partido en `src/assets/laminas/*/dep-pasaka.webp` que no está en `data/laminas.js` a propósito, para que no salga en el álbum de ilustraciones; si faltara, el dibujo de `pasakaPreview`), el premio al acabar (carta `pasaka:claustro` de tradiciones, puntos e insignia «Pasaka en el claustro») y el menú de entre partidos. `game/pasaka3d.js`: el partido en 3D con los avatares, en el sobreclaustro montado como el frontón cubierto (a 2.400 m, fuera del pueblo, suelo registrado con `addPlatform`): techo de vigas, arquería sobre el jardín con público de pie (`crowd3d`), banco con gente sentada, frontis con chapa, red, líneas y una valla de madera a nuestra espalda; tu avatar con tu rig (brazo del golpe con `armSwing`), el canónigo de pareja y dos vecinos de negro como rivales (Actores que mueve el partido, como en la pelota); física de la pelota, saque que tiene que llegar al frontis, quinces y partido a tres juegos; mando de pelota: palanca o flechas para moverse y, como en el frontón, Golpe mantenido carga la potencia mientras la palanca apunta a lo ancho y a lo largo y el jugador corre solo hacia donde va a caer la pelota (círculo dorado en el suelo, botón que brilla al alcance), más Dejada y Globo; el recinto lleva columnas torneadas, zócalos, cornisas, ventanas con alféizar, faroles, el marcador y el escudo de Pamplona en el frontis y el jardín con paseos, fuente, cipreses y setos; se ejecuta como la pelota (`G.mode = 'pelota'`, `G.pelotaTick`) con la cámara detrás de la valla por `follow.cinematic`. Gancho de pruebas `window.__pasaka`. Se entra desde Pamplona con el canónigo del claustro (`townGame.js`, `pasakaCon`, `playPasaka`, `pasakaIntro`) o desde el menú (`onSport('pasaka')`: Pamplona en modo campeonato, `pasakaOnly`, y al salir de vuelta a la pantalla `pasaka`). La interfaz del partido es la misma del frontón (`pelota/hud.js`: `pelotaStyle`, la X, el marcador en barra, los botones redondos, la palanca, el rótulo de la fuerza y el aviso central), con las clases `pel-*`; solo lo propio lleva `pk-*`. Mandos: la palanca o las teclas mueven siempre al avatar, también mientras se carga el golpe; al soltar, la inclinación de ese momento apunta (a lo ancho y a lo largo) y, si no hay inclinación, la pelota va hacia donde está. Las figuras van en la postura `Still` de `glbChar.js` (de pie y quietas; `Ready` flexionaba las rodillas sin parar) y solo se mueven al armar el brazo cuando viene la pelota y al golpear. Los vecinos devuelven el 95 % de las pelotas cómodas y fallan sobre todo cuando les haces correr (3 % por metro a partir de metro y medio) o les pegas fuerte (más de 15 m/s); cuando fallan, dos de cada tres veces le pegan mal (a la red o fuera) y la otra no llegan. En un partido automático largo (`window.__pasakaGames`), los azules ganan en torno al 40 % de los quinces y los peloteos duran unos 7 golpes. |
| `src/world/flora3d.js` y `leafSprig` (`src/ui/leafArt.js`) | Las plantas que se identifican en cada pueblo, en 3D. Los árboles tienen el porte de su especie (tabla `HABIT`: forma de la copa, dónde empieza, ramas principales y cuánto suben, copa en bultos, ramas torcidas, ramitas que cuelgan): tronco, ramas y ramillas de madera, y la copa hecha de cientos de ramitas planas con el dibujo de la hoja de su especie (`leafSprig`: hojas alternas, palmeadas o compuestas, mechones de agujas o ramitas planas del abeto). Los arbustos de hoja, un bulto oscuro por dentro con las ramitas por encima. Dos mallas por ejemplar (madera y hojas), sin archivos nuevos: las texturas se dibujan al entrar en el pueblo y se liberan al salir |
| Fotos de flora en el menú y en la ficha | En Naturaleza, la foto de la planta entera ocupa el ancho de la tarjeta y su hoja va en un círculo encima; en la ficha, la otra foto (la hoja o la planta) va en un círculo en la esquina de la foto grande y, tocándolo, se cambian. De los árboles, fotos del árbol entero, para reconocer su forma |
| Frontón cubierto | `PelotaCourt` con `hall: true` (`court.js`): cerrado, rebote y pared izquierda hasta el techo (`backH` y `leftH` de `setFeel`), grada con asientos y público sentado, luz de pabellón (`sky.indoor`). `hallVenue` en `fronton.js` lo monta aparte. El frontón de cada partido se elige en el menú de pelota y en el cuadro del torneo (`sedeHtml` en `game/torneo.js`; `sedes`, `venueDe` y `venueIntro` en `game/townGame.js`): el de la plaza del pueblo, el cubierto o el Labrit, y en Campeonatos también el de otro pueblo, que se carga con `exit('sports', { pelota })` de `main.js`. Sin elegir, el torneo va al cubierto y la final al Labrit (`sedeDe`); la elección del torneo se guarda por ronda en `T.sede` y la del partido libre de Campeonatos en el perfil |
| `src/hub/` | Centro de mando: inicio, mapa, pueblos, personajes (los seis jugables), insignias, pasaporte y perfil; `stage` dibuja el escenario 3D del selector de personaje (`diorama` solo lo usa `lab/portadabake.html`) |
| `src/ui/` y `src/ui.js` | HUD, iconos SVG e iconos 3D horneados (`icon3d`, que guarda WebP en `src/assets/icons3d`), retratos, mapa y minijuegos pequeños |
| `src/ui/personajes.js` y `src/data/personajes.js` | Los personajes de Navarra: 24 fichas, 12 mujeres (reinas, maestra, abogada, etnógrafa, pintora, artista, golondrinas, etxekoandreak, conserveras) y 12 hombres y colectivos (músicos, deporte, viajes, ciencia, arquitectura, antropología, pastores trashumantes, las huertas), cada una con su misión en un pueblo (`FIGURE_TOWNS`, su recuerdo con el objeto de `items.js`) y en el menú (Personajes e inicio, las mujeres primero) |
| `src/data/` | Datos: pueblos y misiones (`levels.js`), comarcas con su cultura y su traje (`comarcas.json`), montes, fauna, comida y equipo (`equipo.js`), tiendas y producto estrella (`tiendas.js`), personajes (`cast.js`) y euskera (`eu.js`) |
| `src/i18n.js` | Castellano, euskera y modo «Aprende euskera» (botón ES para ver el castellano unos segundos) |
| `src/data/figuras.js` | Las figuras de leyenda (lamia, basajaun, sorgina, tartalo, Roldán) y de carnaval (joaldun, momotxorro, cascabobo, zipotero, coronel Lagunero, irasko, paloki): quién es cada una, cómo viste, dónde sale en Navarra y en qué pueblo y misión del juego. Las enseña `ui/figuras.js` en el inicio y en Personajes, con su imagen (`src/assets/figuras`, renders de sus trajes hechos con `tools/retratos.mjs`, provisionales: 768 px en la web, 384 en el archivo único, que con conexión pide la grande; cuando el autor entrega la ilustración de una figura, `tools/figuras-ilus.mjs` la deja en `src/assets/figuras/ilus` y esa manda, apaisada) y su ficha con pestañas |
| `src/audio.js` | Sonido con Web Audio: ambiente, animales, efectos y la música por ambientes, siempre con las canciones grabadas (`src/audio/pistas.js`): la del juego en el pueblo, de día y de noche, en los minijuegos, las fiestas y el encierro; la de Torneos en los partidos y los campeonatos; la de inicio en el menú. No hay música sintetizada: se mezclaba con las canciones nuevas. Al abrir, la música es lo primero que se prepara (`main.js`, al empezar `boot`): cada canción se descarga entera, la del menú la primera, y suena desde esa copia, así entra al momento y sin conexión; suena en cuanto el navegador deja, desde el principio donde se puede, como la app instalada en el ordenador, y si no con el primer toque o tecla de cualquier tipo, también el de la portada del arranque: el contexto de audio y los elementos de las músicas se crean en `index.html` (`sonido-primero`) y en ese toque quedan libres para sonar luego sin otro. En el iPhone, Apple no deja sonar nada antes del primer toque, y con el interruptor de silencio puesto no suena |
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
- **Nada atraviesa nada:** ni personas, ni animales, ni objetos pasan a través de paredes, muros, barandillas,
  asientos o escalones; todo tiene que tener sentido a la vista. El público sentado (`crowd3d`, sitio = pies) ocupa unos
  52 cm por delante del centro del asiento con las rodillas y los pies: el asiento va al fondo de su escalón y la grada
  dice cuánto se adelanta la figura (`court.sitAdelante`: 0,08 en butacas con respaldo, 0,3 en bancos corridos al
  borde). Delante de la primera fila, nada que los pies puedan cruzar. Para mirarlo de cerca: `tools/grada-ver.mjs pueblo`.
  Tampoco la cámara: la del mapa del inicio sube por la ladera antes de entrar en el relieve (`tools/mapa-dron.mjs`).
- **El límite del iPhone, antes de nada:** cada cosa nueva que se pida se mide con el perfil del iPhone
  (`tools/presupuesto-pueblo.mjs`: en la puerta, hasta 900 mil triángulos, 520 dibujos, 80 MB de texturas y 35 MB de
  búferes en un pueblo; 760 mil, 490, 65 y 35 en un partido). Si va a pasarse, se avisa al autor antes de hacerla, con
  lo que costaría y qué se podría quitar a cambio. Nada de vistas del pueblo entero desde lo alto.
- **Entrar en un pueblo:** siempre la carga entera con su portada y, al acabar, ya en el pueblo detrás del jugador
  (`main.js`, `play`). Sin intros desde el aire: ni zoom del mapa al darle a jugar, ni vuelo de llegada al pueblo, ni la
  intro de Otsagabia. En el iPhone, el pueblo entero visto desde lo alto pasaba del presupuesto y se perdía la imagen
  (Leitza, octubre de 2026). El vuelo hasta la cancha antes de los partidos de pelota sí se queda (`game/llegadas.js`). La
  primera vez se aparece en la entrada del pueblo; con misiones ya hechas, a unos pasos de quien da la siguiente y
  mirándole, con el perro al lado (`townGame.js`, al final de `spawn`), para no cruzar el pueblo cada vez. Los lienzos cuyos píxeles se leen van
  con `willReadFrequently`: en la tarjeta gráfica, la lectura espera a todo lo pendiente. En la carga, la descripción y
  el consejo van enteros, sin cortar (`tools/carga-textos.mjs`).
- **Colecciones por descubrir:** jugando, naturaleza, personajes, escudos y leyendas salen bloqueados (imagen apagada,
  candado, «¿?» y una pista de dónde encontrarlo) hasta que salen en pantalla en el juego (`game/coleccion.js`, `visto`).
  Lo descubierto se apunta como carta (`fauna:`, `flora:`, `armas:`, `cuento:`, `personaje:`, `figura:`). En el material
  didáctico, todo abierto.
- **Frontones clásicos:** de plaza, con su grada, y junto a la iglesia o el ayuntamiento (`ESTILO_TOWN` de
  `game/fronton.js`). El de la calle, entre casas y sin grada, no se usa: no gustaba.
- **Pelota, cansancio y descansos:** lo que cansa es esprintar (dejadas y cortadas que hacen correr); entre tantos se
  recupera poco. Descansos de un minuto como el reglamento de la Federación Navarra (cinco por lado a 22 tantos, en
  proporción en los cortos), pedidos con el botón Descanso o la tecla R para el próximo parón; el rival los pide cuando va
  fundido (`pelota/game.js`, `EN` y `DESCANSO`). En los partidos, solo los rótulos de al aire, al rebote y los pelotazos.
- **Sorteo del saque:** la chapa es de verdad, en 3D, en la cancha (`pelota/chapa.js`, `Chapa3D`): gira de canto, sube
  dando vueltas y cae con la cara que saca hacia arriba y el texto derecho para la cámara, que la sigue (`tossCam` de
  `pelota/match.js`). Encima, solo el título y las tarjetas de los dos pelotaris con su figura asomando.
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
  - Las opciones en euskera de la pregunta de los vecinos (`notr` en la línea del diálogo) no pasan por el traductor.
- **El tiempo con lógica:**
  - Bajo techo no cae nada: en los partidos (fútbol y pelota) y con `sky.indoor` (frontón cubierto y dentro del Labrit),
    la lluvia y la nieve no se ven ni hay rayos nuevos (`Weather.update(…, hold)`).
  - Las caras de dentro de un frontón con cubierta o cerrado no llevan chorreones de lluvia (`weather(…, dry)` en
    `pelota/court.js`).
  - Si en un frontón abierto nieva, se dice «Suelo con nieve» y no «Llueve» (`cond.snow`).
  - Con lluvia o nieve no salen mariposas ni luciérnagas (`fauna.wet`).
- **Animales en su sitio:** `Fauna.add` (`actors/animals.js`) los pone en un sitio libre, seco y sin otro animal encima;
  si no lo hay cerca, busca el más próximo en espiral. Un animal que saliera en el río ya no salía: el muro o la orilla
  son más altos que el paso que dan. Quien los recoloque después, como los corrales de la feria, tiene que separarlos
  igual y llamar a `sync()` para que su cuerpo, que choca, vaya con ellos. `resolve` (`world/colliders.js`) separa
  también dos cuerpos que caen justo en el mismo punto.
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
  las de dentro; los escudos de las casas y de los oficios van dentro pequeños (96) y la fachada y la ficha suben a los de 512 de la web (`casaReadyHD`, `hdUrl`). En la web, la
  copia pequeña de cada lámina (`<id>-s`, de 640) sube a la de 1280 o a la de 2560 cuando se ve grande (las tarjetas de los
  pueblos en el móvil en vertical se veían pixeladas). Cuando una lámina se recorta (el inicio en el móvil tumbado, la
  ficha del pueblo, las tarjetas de comarca) se recorta el cielo: el personaje va abajo, con los pies casi en el borde. Todas
  las portadas son láminas (`townCover`, `comarcaCover` y `townImg` en `ui/laminas.js`): el inicio, el fondo del menú,
  las tarjetas y cabeceras de comarca, las tarjetas y la ficha de cada pueblo y la pantalla de carga. En tarjetas y
  fichas se ven enteras, en 16:9; las portadas de las fichas se funden muy poco a poco con el fondo, sin franja desenfocada debajo, y cubren
  siempre todo el ancho (con el personaje lo más al centro que se pueda). Las fotos 3D de antes (el diorama de la comarca
  con el personaje delante) ya no están.
  Las cabeceras de las fichas de pueblo y de comarca (y la del pueblo en el material didáctico) salen de
  `portadaPueblo` y `portadaComarca` (`ui/laminas.js`): con la pantalla tumbada, si la portada tiene panorámica
  (`src/assets/laminas/pano`, solo en la web; `PANO` y `PANO_BOSQUE` en `data/laminas.js`, con el personaje medido a
  ojo), un `<picture>` la pone en lugar de la lámina, tan ancha que llena el marco sin bordes reflejados; de pie, la
  lámina de siempre. En el archivo único no van: con conexión se piden a la web (`hd.json`, grupo `pano`). Orgi, Bertiz
  y los sotos del Ebro tienen ya su portada (antes, la de otro sitio: `BOSQUE_LAMINA` queda para donde falte).
  La pantalla de carga lleva una sola lámina, fija y entera de alto, encuadrada en el personaje (`focoPortada` y
  `focoDe`, de `FOCO` y `ALTO`), sin degradado lateral ni movimiento, con un velo oscuro parejo encima, algo más denso abajo, para que se lea la
  información; el consejo y el pie de la lámina van en recuadros casi opacos. La ficha del pueblo
  en el mapa deja ver la portada (velo ligero) con el nombre en grande; las misiones van en su propia franja oscura. En el
  móvil tumbado es más pequeña, de 300 de ancho, con 14 a 16 de aire por dentro y sin la barra de progreso.
- **Partido de pelota, lo que se ve** (`pelota/hud.js`): arriba a la derecha, el marcador y, a su derecha, el botón
  del menú. En el marcador, cada lado lleva arriba su nombre y sus tantos en su color y, debajo, en el fondo oscuro, una
  sola barra: su energía, en dorado, naranja y luego roja parpadeando al cansarse; por parejas, la media de los dos. La
  fuerza ya no va en el marcador: se ve en el aro del botón mientras cargas. En el móvil y la tableta va sin el «A 5 tantos» y más estrecho, para no tapar el frontis, que va en el centro
  de la pantalla; en el ordenador ancho, entero. El menú, con el icono de pausa como el del pueblo, para el partido al
  abrirlo con la mano o con Escape, y lleva todo junto: la pelota, que se cambia mientras sacas tú, el descanso, las
  fichas de los pelotaris y salir del partido. En su badge, los descansos que te quedan; brilla si estás cansado; con el
  descanso empezado se abre solo con «Seguir», sin parar el minuto. Ya no hay X arriba a la izquierda. Los botones de
  golpe llevan el aro de la fuerza. Sin consejos en los partidos, solo el primer medio minuto del peloteo de entrenar.
- **Partido de pelota, la energía y lo que suena** (`pelota/game.js`, `EN`; `pelota/match.js` y `pelota/audio.js`): lo
  que más gasta son las cortadas seguidas, cada una más que la anterior (`racha`, que se enfría pelotando o en unos
  segundos), y esprintar a por una dejada del rival (`EN.caza`). Moverse y colocarse casi no gasta: antes cualquier
  carrera a tope gastaba como un esprint y la barra se quedaba casi vacía todo el partido. Con un jugador de prueba que
  corre siempre a tope (`tools/pelota-gasto.mjs`): pelotando, al sacar le queda en torno al
  90 %; con cortadas seguidas, al 30 %; si el rival solo le hace dejadas, al 20 %. Al cantarse el tanto, acierto o fallo,
  solo se oyen los aplausos: la pelota se calla hasta el saque siguiente (`callada`), la chapa ya no hace su «¡clonc!», la
  repetición va sin sonido y, si la grabación de los aplausos aún no ha llegado, no suena nada en su lugar. El aplauso dura
  de 4 a 7 s y se apaga despacio, y el murmullo de la grada no sube a la vez (los dos juntos sonaban a vibración). Suena
  la música de los campeonatos (`audio.js`, `nivelMusica`): baja mientras se juega (`match.js`, `enJuego`) y vuelve en la
  presentación, el sorteo, las repeticiones y el final. El partido usa el sonido del juego, ya desbloqueado con el primer
  toque (`fronton.js`, `audio`): en el iPhone, uno propio creado sin tocar empezaba callado y no se oía la chapa del sorteo,
  que ahora cae, rebota y repiquetea hasta quedarse quieta (`moneda`).
- **Partido de pelota, la dirección** (`pelota/game.js`, `strike`; `pelota/physics.js`, `twoWallsTo`): el joystick apunta
  al bote. A dos paredes se busca por toda la pared izquierda el golpe que bota más cerca de donde se apunta, así que sale
  desde cualquier sitio de la cancha: con la cortada, desde media izquierda; cuanto más a la izquierda, más cruzada, y
  arriba o abajo, más larga o más corta. El saque también se dirige (de pegado a la pared al ancho, y largo o corto) y con
  CORTADA es saque cortado: rápido y raso, bota nada más pasar la falta y gasta como una cortada. La línea de puntería se
  ve también al preparar el saque. Cansado, la fuerza tiene tope (`powTope`): el aro del botón no pasa de ahí y lo que no
  se alcanza se ve en rojo.
- **Partido de pelota, el cansancio se ve** (`actors/glbChar.js`, `armSwing`; `pelota/match.js`, `suda`): por debajo de
  la mitad de la energía, el pelotari se encorva (más parado y entre tanto y tanto) y respira deprisa; le saltan gotas de
  sudor y lleva sobre la cabeza su aviso de sudor, que se ve también en el rival, lejos.
- **Rótulos del partido que no chocan** (`pelota/hud.js`, `call`; `pelota/match.js`, `colocaRep`): el rótulo grande del
  juez y el de la repetición, si se cruzan con el marcador, bajan justo debajo de él. La fila de Ahora no y ¡A jugar! tiene
  otra vez su hueco y su fondo (`.pel-row`), que se había borrado sin querer.
- **Partido de pelota, que no se bloquee** (`pelota/match.js`): en el iPhone se quedó parado tras un tanto. La causa más
  probable: un golpe cargado cuyo botón no llegó a soltarse; con la cortada o la dejada cargadas, GOLPE no respondía y la
  palanca no movía al pelotari. Ahora el último botón que se toca manda (`chargeStart`) y, al cantarse el tanto, el golpe
  cargado se suelta sin golpear. Además, el vigía (`vigia`) destraba y apunta en el informe (`window.__errors`, «pelota
  parada») una pausa sin menú, ventana ni ficha, una repetición de más de 14 s, un golpe cargado más de 8 s en juego, los
  mandos escondidos en pleno juego y una ventana que ya no está. Cada muestra del informe lleva el estado (`estado`):
  pausa, menú, ventana, repetición, golpe cargado, mandos y ficha.
- **Maquetas del mapa** (`hub/maqueta.js`): lo que OpenStreetMap da como casa o nave y no lo es se reconoce por su
  nombre (`claseReal`): kioscos (peana, ocho columnas y tejado de ocho aguas), baluartes y portales de la muralla
  (piedra maciza sin tejado), castillos y el Palacio Real de Olite (recinto de cuatro alas con patio, torres con chapitel
  en las esquinas y, en los grandes, la del homenaje), palacios, conventos y museos (piedra, sin balcones ni leña) y
  lavaderos (abiertos, con postes). Lo pequeño y sin nombre dentro de una plaza, un pabellón bajo de piedra. Estos ya no
  se parten en casas como los bloques grandes.
- **Ventajas en el comercio local** (`game/ventajas.js`, `data/comercios.js`, sección Ventajas del menú en `hub.js` con
  `hub/ventajas.css`, y `VENTAJAS-COMERCIOS.md` para comercios y ayuntamientos): los sellos, las insignias y los
  certificados valen bonos en los comercios adheridos. Certificados: uno por comarca, al sellar todos sus pueblos, y el de
  Navarra, con todos; se ven como un diploma con tu nombre, los pueblos y la fecha. Cada oferta de un comercio pide un
  logro (el sello de un pueblo, un certificado, una insignia o varios sellos); ganada, se saca el bono, que vale un mes, con
  su código (HZ, el comercio y siete letras, la última de control) y su QR, una franja que se mueve y la hora, que corre;
  el comercio lo canjea tecleando su clave en el móvil, y en el juego solo va la huella de la clave
  (`tools/clave-comercio.mjs`). Un bono por oferta a la vez y, tras usarlo, otro al mes. Las ofertas ganadas sin ver salen
  con un número en el botón de Ventajas; en la ficha de cada pueblo, las de sus comercios. Todo en la partida, sin
  cuentas ni datos personales; mientras no haya comercios de verdad, ejemplos sin nombre propio, marcados, con la clave
  0000. Reglas: nada de alcohol, tabaco ni apuestas, y compra una persona adulta. La fase 2, con un servidor que apunte
  los bonos para que no se repitan borrando la partida, está descrita en `VENTAJAS-COMERCIOS.md`.
- **Lugares emblemáticos del mapa** (`hub/emblemas.js`, `data/reales/emblemas.json`, `tools/emblemas-real.py`): con su
  planta de verdad, de OpenStreetMap por Overture Maps, y lo que no está en los datos, de lo que se sabe del sitio. La
  Ciudadela de Pamplona, con los muros de sus baluartes, revellines y fosos, sin los dos baluartes que miraban a la ciudad,
  derribados con el Primer Ensanche en 1888, el parque que la rodea y los edificios de dentro; El Sadar, con su fachada
  roja, sus gradas, su cubierta y el campo con sus franjas; y Castildetierra, en las Bardenas, con su falda de cárcavas, la
  chimenea de arcilla y el remate de arenisca. Estos tres van sueltos sobre su comarca y se levantan al acercarse, ya desde
  lo alto. Con la maqueta de su pueblo, en lugar de las cajas de los datos: el Palacio Real de Olite, con su contorno
  almenado, el Palacio Viejo, la muralla y las torres en las esquinas que más salen, la del homenaje de 40 m, la de las
  Tres Coronas ochavada y cuatro con los capuchones negros de la restauración del siglo XX (el sitio exacto de cada torre
  no está en los datos); el castillo de Javier, con su torre del homenaje y su muralla; y los puentes de Burgui, de cuatro
  arcos, y de Puente la Reina, de seis, con sus tajamares, su lomo y sus pretiles. El kiosco de la Plaza del Castillo ya
  estaba (`maqueta.js`). Una malla por sitio, con su color en cada vértice; la altura, con la de las casas, y en los
  puentes medida desde el agua para que toquen las dos orillas.
- **Trashumancia:** en el mapa de Navarra (`hub/mapa3d.js`), la Cañada Real de los Roncaleses, del valle de Roncal a las
  Bardenas (trazado aproximado), en una raya discontinua de una capa encima del mapa, y su rebaño, un nombre que baja por
  ella poco a poco; tocándolo, su ficha (`hub.trashumancia`), con la misión «La trashumancia» del Roncal (juntar el
  rebaño en el redil antes de salir a la cañada, al final de sus misiones para no mover las hechas).
- **Ritmo de los textos** (`style.css`, `:root`): un solo orden de aire para todo. La escala, en la rejilla de 4 px:
  `--e1` 4, `--e2` 8, `--e3` 12, `--e4` 16, `--e5` 20, `--e6` 24, `--e7` 32 y `--e8` 48. Entre textos, siempre medido de
  lo que se ve (de la línea base de uno a la mayúscula del siguiente): antetítulo a título, 12 (`--r-kt`); título a
  subtítulo, 8 (`--r-ts`); del título o el subtítulo a lo siguiente (texto, datos, botones), 16 (`--r-tx`); de párrafo a
  párrafo, 12 (`--r-pp`); de la cabecera al cuerpo, 24 (`--r-bl`); de una sección a la siguiente, 32 (`--r-sec`). Para que
  el hueco del CSS sea el que se ve, los textos de las cabeceras llevan `text-box: trim-both cap alphabetic` (clase `.rt`
  o reglas propias), que recorta la caja de la línea a la mayúscula y a la línea base; por eso los nombres de los títulos
  van en su `<span>` y los rótulos son de bloque con la raya en un `::before` en línea (el recorte no vale en una caja
  flexible). Nunca en un texto con `overflow: hidden` o puntos suspensivos: se comería lo que baja de la línea. Donde no hay recorte, `--t-mt` y `--t-mb` dan los mismos 12 y 16 descontando con el «em» el aire de la letra. Va en la
  ficha del pueblo, la cabecera de la comarca, la ficha del mapa, la galería, la pantalla de carga, los cuentos, la
  pasaka, las tarjetas de deporte y las cabeceras del armorial. Rellenos de las cajas: 24 en el ordenador y 16 o 20 en el
  móvil. `tools/auditoria-diseno.mjs` lo comprueba («espacio»).
- **Galería de Pueblos** (`hub/galeria.js`): un anillo con fondo, como una rueda vista desde fuera: las cartas van una
  junto a otra, borde con borde, cada una más girada y más honda que la anterior, hasta llegar a las flechas, y las
  siguientes se apagan. La primera de cada lado va lo más girada que deje llenar hasta las flechas con dos o tres detrás,
  entre 28° y 48°: en el ordenador, mucho; en el móvil tumbado, donde la carta es pequeña para el ancho, menos y con
  tres. La perspectiva es proporcional a la carta, así la profundidad es la misma en todas las pantallas. En el móvil de
  pie asoman por el borde. Con menos de ocho pueblos se repiten, para que al girar ninguna salte de un lado a otro a la
  vista. Así hay la profundidad del anillo de antes sin sus huecos: allí las de los lados quedaban pequeñas y sueltas.
  Debajo, el pueblo de delante: el rótulo y, en su propia fila (`.gi-fila`), el nombre y sus misiones; en el móvil
  tumbado van uno al lado del otro, centrados entre sí y debajo del rótulo, en una sola fila (si no caben, las casillas
  encogen un poco) y sin la cuenta en los más estrechos. Antes las misiones subían hasta el rótulo y se montaban con él.
- **Misiones en el pueblo, arriba a la izquierda** (`ui.js`, `eligeMision`, y `#misiones` en `style.css`): solo los
  iconos de las misiones del pueblo, una casilla por misión del color de su categoría (hecha, llena y con su marca verde
  sobre amarillo; la que sigues, con borde blanco). Al tocar una, pasa a ser la que sigues y debajo se despliega: su
  nombre, lo que toca hacer, sus pasos y lo lejos que está; se recoge sola a los 10 s o tocando la misma casilla, y
  tocando lo desplegado se abre el cuaderno. Empieza plegado y solo se despliega al tocar (lo pidió así el autor): al
  cambiar lo que toca hacer, late la casilla de la misión (`lateMision`) y sale el aviso de abajo. En los tumbados más
  estrechos, las casillas van en dos filas. Se probó a volver al recuadro con la misión, el pueblo y el desplegable, y el
  autor prefirió los iconos. (En la aventura de Otsagabia, la de las cintas, sigue el recuadro de antes.)
- **Mapa del pueblo que ayuda en las misiones** (`ui.js`, `openMap` y `misionesMapa`; `ui/mapview.js`): a un lado el
  mapa y al otro la lista de las misiones del pueblo, cada una con su icono en el aro del color de su categoría, lo que
  toca hacer y lo lejos que está (primero las que faltan; la que sigues, encendida). Al tocar una, pasa a ser la que sigues,
  el mapa va a ella y sale su ficha con el botón para ir. En el mapa, las marcas de misión llevan su icono y su color (como
  las casillas de arriba y el minimapa), con su «!» si no está empezada y la marca verde sobre amarillo si está hecha, y el
  camino hasta lo que sigues va en una línea rosa a trazos por calles y caminos (`nav.findPath`, se rehace al moverse 4 m).
  El encuadre del principio incluye el objetivo. En vertical, la lista va debajo del mapa; en el móvil tumbado, sin
  leyenda (la lista ya lo dice).
- **Tradiciones en el menú del juego** (`hub.js`, en «Más»; `didactico.js`, `s_tradiciones`; `ddgal.js`): la misma galería
  del material didáctico (cada comarca, danzas, carnavales, tradiciones, romerías, ferias, pelota y campanas), pero
  jugando cada una se descubre al hacer su misión, o la de una comarca al visitar uno de sus pueblos. La que falta sale
  apagada con su candado y dice dónde descubrirla; su ficha solo cuenta cómo y sus pueblos. Arriba, cuántas van
  descubiertas. La pelota, las campanas y lo que no está en ningún pueblo del juego se ven desde el principio.
- **Ferias de ganado** (`data/ferias.js`, `CORRALES` y `FERIA_TOWNS`; `townActividades.js`, `buildFair`,
  `conoceCorral` y `judgeFair`): en Estella, Elizondo, Altsasu, Lesaka, Lumbier y Lekunberri (las tres últimas, con
  datos del archivo de patrimonio inmaterial de Navarra y prensa, van al final de la lista del pueblo para no mover el
  número de las misiones guardadas). Siete corrales a los lados de un pasillo, uno por animal: vaca pirenaica, bueyes,
  pottoka, burro, oveja latxa, cabra y euskal txerria, cada uno con su cartel; al final, la pista del concurso con la mesa
  del jurado. Se recorren los corrales conociendo a cada animal (su ficha de fauna, que da la carta, o lo que cuenta el
  ganadero), luego se juzga en la pista y se cierra el trato con el tratante. Las vallas van en dos mallas y los carteles
  en una (una textura con todos los nombres); pocos animales por corral, que cada uno son varias llamadas de dibujo.
  Prueba: `tools/feria.mjs <pueblo> <carpeta>`.
- **Minimapa con la brújula en su borde** (`ui.js`, `updateMinimap`; `#mini`, `#cdist`, `#clock`): el mapa gira con la
  cámara y alrededor va un anillo con los puntos cardinales (la N en rosa), rayas en los intermedios, los iconos de las
  misiones que quedan fuera del mapa hacia donde están y una punta rosa hacia el objetivo (si cae sobre una letra, la letra
  deja su sitio; nada se monta). La distancia, en una pastilla rosa a la izquierda del círculo, y la hora, en otra debajo.
  Las letras y el anillo se dibujan a su tamaño en pantalla (unos 11 px), mida lo que mida el minimapa. Antes la brújula era
  una barra arriba en el centro y en el teléfono de pie no había minimapa; ahora sí, debajo de la columna de botones.
- **Composición de la comarca, sin huecos de aire** (`hub.js`, `s_comarca` y `ajustaRejillas`; `fichas.css`, `section.rejilla`):
  cada sección es una rejilla de 12 columnas con el mismo hueco entre todo (`--hueco-m`). En cada ancho (ordenador,
  tumbado y estrecho, `data-max`) van por fila como mucho las piezas que tocan; si hay más, las filas justas con el mismo
  número; y las de la última fila, si no llegan, se ensanchan hasta llenarla. Con imagen (`data-igual`: pueblos,
  leyendas, cimas) se elige el número de columnas que deja la última fila menos estirada: tres pueblos en tres columnas,
  siete en 4 y 3. Cultura y Naturaleza van cada una a todo lo ancho (antes, lado a lado, Cultura era mucho más larga y
  quedaba media pantalla vacía); la danza con su ilustración, destacada, con la imagen del ancho de una pieza de la fila de
  debajo (subgrid) y el texto al lado; en cada pieza, el sitio al pie, a la misma altura en toda la fila. Con un solo
  pueblo, a su lado va lo que es, sus misiones y los botones (`puebloUnico`); una sola cima, en horizontal. Los párrafos
  ya no llevan `text-wrap: pretty`: en el iPhone acortaba todas las líneas y dejaba media caja vacía a la derecha.
- **Cosechas de verdad, con tractor o cosechadora** (`game/townTractor.js`, `RECETAS` y `DESTINOS`; `game/conducir.js`):
  todas las misiones de cosecha. El trigo, con la cosechadora en un campo de cereal de verdad: se siega casilla a
  casilla (el trigo en pie baja a rastrojo), la tolva se llena y se descarga en el remolque del tractor que espera en la
  linde; segado el campo, se sube al tractor y se lleva el grano a la cooperativa. La huerta, la viña, el olivar y los
  frutales: matas en hileras (en la huerta), cuatro temporeros que avanzan por sus hileras dejando cajas o sacos llenos,
  y con el tractor se recogen despacio (a más de 3,5 m/s no se cargan); luego, a la conservera, la bodega, la almazara,
  la sidrería o el almacén. El destino se busca junto a un camino de las afueras, a unos 230 m del campo: una nave con
  su cartel, la báscula con su caseta y silos, palés, barricas o tinajas. El camino se marca con flechas en el suelo
  cada 18 m (por donde se anda, `nav.findPath`). Quien encargó la cosecha espera en la báscula: parado encima, se pesa
  (los kilos de verdad), se descarga y se habla con él. Prueba: `tools/cosecha-vehiculo.mjs` (TOWN=artajona o estella).
- **Campos con la textura de su cultivo** (`world/terrain.js`, atributo `aCampo` y bloque del sombreador tras `grassy`):
  cada vértice lleva el tipo de campo, la dirección de sus hileras y su borde (`fieldInfo`), y el sombreador dibuja
  encima el cultivo: rastrojo y espigas en el cereal, heno en hileras, tierra labrada en surcos, hileras de hoja con
  tierra clara en la viña, caballones en la huerta y suelo claro con matas en el olivar. Las cepas y las matas de la
  huerta (`Nature.buildCrops`) llevan la masa de hojas del atlas, como las copas de lejos: antes eran bolas lisas.
- **Maquinaria del campo con sus piezas** (`world/agro.js`): neumáticos de perfil redondeado con tacos en V, llantas con
  plato, buje y tornillos; capó redondeado con rejilla de lamas, respiraderos, faros e intermitentes; contrapesos; escape
  con caperuza y filtro de aire; cabina con montantes, techo con visera, rotativo, luces de trabajo, espejos, asiento y
  volante; escalones, depósito, guardabarros curvos y enganche de tres puntos. El remolque, de tablones entre postes; la
  cosechadora, con tolva abierta, escalera, plataforma, molinete con púas, barra de corte con dedos, sinfín y tubo de
  descarga. Unos 10 000 triángulos por máquina (las piezas de menos de 9 cm, sin redondeo) y las mismas mallas que antes.
- **Nada se monta** (`tools/choques.mjs`): ningún texto puede pisar ni rozar un icono, una chapa, un botón pequeño u
  otro texto, en ninguna pantalla ni tamaño: a 6 px como poco (3 px de un icono que va dentro del mismo texto), medido
  sobre lo que se ve (la letra de lo alto de las mayúsculas a la línea base, la inclinación de la cursiva, lo pintado de
  cada imagen) y contando lo que un aviso o una chapa tapan. No cuentan lo que va a propósito encima: la chapita del
  nivel sobre el retrato, el texto dentro de su foto o de su aro, las cartas de los lados del anillo, que van en escorzo, y
  las ventanas que lo cubren todo. Se pasa por el menú entero, la galería pueblo a pueblo, las fichas y Ventajas a 844 ×
  390, 667 × 375, 390 × 844 y 1280 × 720, y va dentro de `tools/auditoria-partidos.mjs` («choque») para los marcadores
  de pelota y fútbol. Lo que encontró y se arregló: la galería; el icono del rótulo de bloque, pegado a la letra
  (`.kicker > img`); el icono de los filtros («En el juego»); la chapita del nivel junto al nombre (`.hub-menu-btn`);
  «Navarra conquistada» y su sello (`.m3-tt`); el candado de las leyendas y su pie (`.ct-lam`, en columna); el alfiler
  bajo el nombre del personaje (`.cfrom`); el título de cada deporte y sus etiquetas (`.sp-txt`); la chapita «0/6» de la
  misión y su texto (`#quest`); el icono del título de las ventanas de papel; el personaje de la barra de carga y el
  tanto por ciento (`.ld-prog`); los rótulos de los cambios de fútbol; el nombre de quien atiende la tienda bajo su icono (`.shop-keeper`); y, con el móvil de pie, la misión, que `fitTop`
  estrechaba a 140 px, y la distancia de la brújula y los avisos de la conversación, que se le montaban.
- **Colores de las misiones:** cada misión lleva el color de su categoría (`CAT` y `CAT_COLOR` en `data/misionCat.js`, variable
  `--mc`) en la ficha del mapa, en la lista de la ficha del pueblo y en las tarjetas: patrimonio, amarillo; oficios y
  productos, rojo anaranjado; campo y naturaleza, verde; fiestas, rosa; leyendas, violeta; preguntas, azul; deporte y
  monte, turquesa. Sin hacer, un tinte y el borde; hecha, llena de su color; la siguiente, borde blanco. La marca de
  hecha, en cambio, es siempre la misma en todo el juego: el check verde en su círculo amarillo, sin colores de categoría.
  Los cuatro botones del menú de pelota llevan los pelotaris del autor (ver abajo): en el torneo, tu rival de la ronda;
  por parejas, la pareja rival; en el partido libre, tú, de azul; en la colección, los tres últimos que has conocido,
  en abanico. Las ilustraciones de antes siguen en `src/assets/pelota`, sin cargarse.
- **Pelotaris del autor** (`src/ui/pelotariFig.js`, `src/assets/pelotaris`): 22 chicos y chicas de cuerpo entero, de
  azul y de rojo, para las cartas, la pantalla VS, la colección, el cuadro del torneo y las portadas de pelota. Cada
  nombre de la plantilla tiene su figura (los rivales y compañeros salen de ella; Iñigo es el protagonista) y otro
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
  mapa, las comarcas, las tarjetas de pueblo y el pueblo completado; `src/ui/art.js` los dibuja si faltara alguno. En el
  aro de arriba llevan el nombre del juego, HERRIZHERRI (`tools/sellos-nombre.mjs`).
- **Iconografía de una sola familia:** un archivo `src/assets/icons3d/256/<nombre>.webp` (y sus copias de `512/` y `128/`)
  sustituye al icono de ese nombre sin tocar el código (`has3D` mira también los archivos horneados).
  - Son los 182 iconos 3D del autor (los 165 nombres de `ICONS` en `src/ui/icons.js` y 17 controles: los del fútbol,
    pausa, cámara y los del mapa), recortados y centrados con el mismo margen: el lado mayor ocupa el 89 % del cuadro.
    La web los lleva a 256 px (`icons3d/256`, alias `@icons3d`) y además a 512 (`icons3d/512`, `@icons3d-big`) y los
    instrumentos a 1024 (`icons3d/1024`, `@icons3d-huge`), que `src/web/hd.js` pide cuando el icono se ve más grande de lo
    que mide (fichas, pantallas densas); el archivo único, la copia de 128 px de `icons3d/128`, por peso, y con conexión
    sube a las de la web. Los de 512 salen de los 512 del autor (los que tenían que crecer para llenar el 89 %, de una
    ampliación ×2 con Real-ESRGAN), los instrumentos de sus PNG de 1254, los nueve de las láminas de octubre (boot,
    fullscreen, globe, info, key, mute, retry, search, sound) de sus celdas ampliadas ×2 y los siete renders del juego de
    `tools/iconbake.mjs` a 512. La serie anterior de 192 se guarda en `icons3d/192` sin usarse. La lista del autor está
    en `icons3d/LICENSE_iconos-autor.txt` y `tools/iconbake.mjs` no la vuelve a hornear.
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
| `presupuesto-pueblo.mjs` | El presupuesto de cada pueblo: lo que pinta con el perfil del iPhone (triángulos, dibujos y memoria de texturas y búferes, con `presupuesto-gpu.js`) en su puerta mirando a los cuatro lados y, con `PELOTA=1`, en su partido de pelota, frente a lo que aguanta el iPhone 13 (unos 900 mil triángulos, 520 dibujos y 80 MB de texturas en el pueblo). Todo pueblo nuevo tiene que pasarlo antes de publicarse: solo se carga un pueblo cada vez, así que lo que cuenta es lo que pesa cada uno. Sale con código 1 si alguno se pasa |
| `grada-ver.mjs` | La primera fila del público de un frontón, de cerca, con una cámara propia: que nadie atraviese su escalón, el antepecho ni el asiento de delante. Tres capturas por frontón y lo que mide la figura sentada. |
| `perro-guia.mjs` | «Enséñame el camino»: el perro se adelanta por las calles (el camino de los vecinos), ladra, espera y sigue tramo a tramo hasta dejarte junto al vecino (`CERCA=1`) o hacia una misión lejana. Simulado a pasos fijos. |
| `pelota-cansancio.mjs` | Cansancio y descansos de la pelota, sin navegador: partidos enteros pelotando normal y jugando a cansar al rival con dejadas y cortadas. El rival tiene que cansarse bastante más en el segundo caso, pedir sus descansos sin pasarse y tus descansos se toman en el parón antes del saque. |
| `campeonato-pueblo.mjs` | El pelotari junto al frontón de un pueblo invita al campeonato de la comarca: el diálogo con sus cuatro opciones, el campeonato elegido con su cuadro (solo el frontón) y, al salir, la vuelta a la puerta del frontón del pueblo. |
| `auditoria-entradas.mjs` | Entrar en cada pueblo y bosque como en el iPhone, con la app recién abierta y el botón de jugar del mapa: la carga con su foto, que la foto se descarga, que no hay vuelo desde el aire y que al acabar la carga se juega sin errores. Deja capturas de la carga y del juego de cada uno (`OUT=carpeta`, contra la web compilada en 8099). |
| `carga-textos.mjs` | La pantalla de carga con la descripción de cada pueblo, cada consejo y cada «¿Sabías que…?» de la pelota y la pasaka, en 667×375, 844×390, 932×430 y 1280×720: que nada se corte con puntos suspensivos, se monte o se salga de la pantalla (`LNG=eu`, en euskera). |
| `mapa-dron.mjs` | El vuelo de dron del mapa del inicio sobre los pueblos con montes alrededor: en 24 puntos de la vuelta, la cámara por encima del relieve y sin montes entre ella y el pueblo. Capturas. |
| `revision.mjs` | Carga los 31 pueblos y comprueba misiones, anfitriones, suelo, perro y errores; deja el informe en `entrega/revision.json` |
| `encierro.mjs` | Prueba el encierro con capturas |
| `iconos-nitidez.mjs` | Nitidez de los iconos 3D en las pantallas del menú (móvil de densidad 3 y escritorio): píxeles de pantalla frente a los de la imagen tras el cambio a la grande, rotos y cuántos de cada tamaño |
| `encargo-personajes.py` | Paquete para encargar las ilustraciones de los personajes de Navarra (lista completa, prompts en castellano e inglés, referencias de estilo, LEEME) |
| `encargo-total.mjs` | El encargo de imágenes completo en un solo archivo de texto: lo que el juego enseña sin imagen del autor (escudos de casas con su blasón, personajes, leyendas, figuras, tradiciones, cimas, fauna, láminas, iconos que son renders, instrumentos y, con la carpeta del paquete de escudos, los señalados para corregir), con el estilo de cada apartado y un prompt por imagen con su nombre de archivo. Lo saca de los datos cargados en el servidor de pruebas |
| `escudos-cuenta.mjs` | Entra en los 32 pueblos y escribe un JSON con las casas que de verdad tienen escudo en la fachada (entre 0 y 8 por pueblo); `encargo-total.mjs` lo lee con `CASAS=` para no encargar escudos de casas que no existen |
| `pueblo-real.py` | Datos reales de cada pueblo (contornos de casas con altura y nombre, calles, ríos y balsas, puentes y lugares) en metros locales, leídos de Overture Maps por rangos HTTP desde AWS (`indice` una vez por versión; `pueblo` por localidad). Escribe JSON fuera del juego: los datos son ODbL (OpenStreetMap) y entran solo con esa licencia aceptada; la alternativa oficial, IDENA (Gobierno de Navarra), no es alcanzable desde el entorno de desarrollo |
| `pueblo-real-juego.py` | Del JSON crudo de un pueblo a `src/data/reales/<id>.json`: centra en la plaza del ayuntamiento, baja el relieve EU-DEM (teselas terrarium de AWS, comprobando la fuente), ríos con nivel, calles y tramos de puente, casas como rectángulo orientado a su calle con altura y nombre, plaza, iglesia, ayuntamiento, frontón, fuentes y usos del suelo. Escribe el formato compacto (con `--legible`, el de siempre para mirarlo) y deja fuera lo que el juego no usa: casas a más de 480 m o de menos de 9 m², contornos y nombres sueltos |
| `mujeres-ver.mjs` | Las mujeres de Navarra en el menú: pantalla Personajes, tira del inicio y fichas, en castellano y en euskera |
| `encierro-tactil.mjs` | El encierro en el móvil: la palanca táctil, los botones, la salida al acabar (fichas o la X) y la vuelta al menú |
| `futbol.mjs` | Prueba el fútbol con capturas |
| `tienda.mjs` | Prueba la tienda con capturas |
| `mercado.mjs` | Prueba el mercado con capturas |
| `clima.mjs` | Prueba la lluvia, la nieve y la luna con capturas |
| `vecinos.mjs` | Prueba los vecinos con capturas |
| `trajes.mjs` | Prueba los trajes con capturas |
| `carnaval.mjs` | Prueba los personajes de carnaval |
| `llamadas.mjs` | Mide las llamadas de dibujo por partes |
| `mitos.mjs` | Prueba Basajaun, la lamia, la sorgina y Roldán con capturas |
| `musica.mjs` | Prueba la música por ambientes: qué canción grabada suena en cada uno |
| `figuras-ilus.mjs` | Las ilustraciones de las figuras de leyenda y carnaval que entregue el autor (16:9, como las láminas): a 1280 y 640 en `src/assets/figuras/ilus`; en cuanto están, sustituyen al render del traje |
| `encargo-importar.mjs` | Las imágenes del encargo (`entrega/encargo-imagenes-*.md`) que entregue el autor, con el nombre que pide el encargo: cada una a su sitio y a sus tamaños en WebP (escudos de casa, personajes, tradiciones y danzas de comarca `danza-<comarca>`, leyendas, figuras con `figuras-ilus.mjs` e iconos recortados a su dibujo y centrados al 89 %, como la familia del autor). Las de 1672 px no se amplían. Las copias del archivo único solo con `--unico`: ese archivo va a pocos KB de su límite, y sin ellas sigue con lo de antes (el dibujo tallado de los escudos, la lámina prestada, el render del traje); con conexión, los escudos los pide a la web. Las variantes con otro nombre: `«archivo.png»=nombre`. La entrega del 2026-10-23 (77 imágenes) entró así; lo que falta, en `entrega/encargo-pendiente-2026-10-23.md` |
| `retratos.mjs` | Retratos para el menú con `lab/retratos.html`: de un avatar (busto, cuerpo entero y el grande de la web) o de una figura de leyenda o carnaval con su traje (`src/assets/figuras`) |
| `personajes-ver.mjs` | Capturas de la pantalla Personajes, la tira de figuras del inicio y una ficha, en escritorio y en el móvil tumbado |
| `hub-escritorio.mjs` | Capturas del menú en escritorio, pantalla por pantalla |
| `fauna-512.mjs` | Rehace la fauna del archivo único (`src/assets/fauna/512`) desde las de 1280: 512 px, WebP calidad 80 |
| `euskera.mjs` | Prueba el modo «Aprende euskera» |
| `eu-faltan.mjs` | Juega en euskera con `?eufaltan` (menú, fichas y las misiones de los pueblos pedidos o de `todos`) y apunta lo que se queda sin traducir en `/tmp/eu-faltan.json`. Las tarjetas y minijuegos que `__autoWin` se salta pasan sus textos por `window.__autoSeen` |
| `animalpack.mjs` | Empaqueta los animales |
| `foodpack.mjs` | Empaqueta las frutas y verduras |
| `iconbake.mjs` | Hornea los iconos 3D que no son del autor, a 512, 256 y 128 (`lab/iconbake.html?iconS=512`) |
| `luz-ver.mjs` | Luz estable al girar la cámara en el pueblo y al entrar y salir de un partido de pelota (de día, con lluvia) |
| `ux-medir.mjs` | Auditoría de interfaz en el móvil tumbado: botones de menos de 44 px, rejilla de 4 px, interlineado, interletrado, contraste, orden de los botones y lo que obliga a desplazar, en las ventanas del juego y en el menú |
| `espaciado.py` | Lleva rellenos, márgenes y huecos de todas las hojas de estilo a la rejilla de 4 px |
| `responsive.mjs` y `popups-medir.mjs` | Auditorías de tamaños: las pantallas del menú en 21 dispositivos y las ventanas del juego, con `IDIOMA=eu` también en euskera; anotan lo que se sale, lo que no cabe, los botones pequeños y, con `palabras-medir.mjs`, las palabras partidas entre dos líneas y los textos cortados con «…» o a las N líneas |
| `ventanas-casos.mjs` | Cómo se abre cada ventana del juego para las auditorías (`popups-medir`, `ux-medir`) |
| `pelota-ficha-ver.mjs` | Las fichas de los pelotaris: antes del partido, por parejas, en la pausa y en el torneo |
| `pelota-frontones-juego.mjs` | El frontón que juega: el mismo golpe en cada tipo de frontón y partidos enteros de la IA en todos (sin gráficos) |
| `pelota-vs-ver.mjs` | El panel del partido y «Más opciones» en pestañas (pelota y cámara dinámica, sin desplazar), la pantalla VS, el partido (marcador sobre el frontis, FALTA y PASA, tu energía, el aro del botón de golpe) y la colección en el móvil tumbado (con `clear` o `rain`) |
| `pelota-gasto.mjs` | La energía con el joystick siempre a tope, como juega una persona: pelotando, con cortadas seguidas y con el rival haciéndote dejadas; en qué se va y lo que cuesta cada carrera y cada cortada (sin gráficos) |
| `pelota-golpe-manual.mjs` | Golpeo manual: sin pulsar no se devuelve nada; a tiempo, perfecto; pronto y tarde; volea y gancho; la energía; las cinco pelotas (sin gráficos) |
| `auditoria-diseno.mjs` | Auditoría de diseño del menú (también su marco: la barra de arriba y la de las secciones) y de las pantallas de deporte (TAM=844x390 o 1180x820): texto cortado o con puntos suspensivos, texto encima de figuras (mirando la transparencia de la imagen) o de otro texto, verdes fuera de sitio, bordes que no siguen las esquinas en ángulo, texto que se sale de su botón o su caja (círculo, píldora, esquinas redondeadas o en ángulo), distancias de rótulo a título y de título a texto, letra fuera de la escala o de las fuentes del juego colores de texto fuera de la gama, cajas que se salen de su caja, texto en columnas de una palabra por línea, lo que hay que desplazar, esquinas muy redondeadas y botones con letra de lectura. La medida está en `auditoria-medida.mjs`; también mide la composición: bloques de una fila con la misma altura o el mismo centro y el mismo hueco, columnas con el mismo borde y el mismo ancho, cajas con el mismo relleno a los dos lados, rellenos y huecos en la rejilla de 4 px, y bordes que casi coinciden (de 2 a 12 px) dentro de una misma caja, que se toman por descuadres. Con TODO=1 lista todas las distancias y con DETALLE=1 dice la regla de CSS de cada fallo. Con IDIOMA=eu, en euskera |
| `cosecha-vehiculo.mjs` | La cosecha de principio a fin, con cosechadora (Artajona) o con tractor y temporeros (Estella): el campo, la descarga, el camino, la báscula y la conversación final |
| `choques.mjs` | Textos que se montan con un icono, una chapa, un botón pequeño u otro texto, o que tapa un aviso: el menú entero, la galería pueblo a pueblo, las fichas y Ventajas, a cuatro tamaños; `choques` se usa también en `auditoria-partidos.mjs` |
| `auditoria-partidos.mjs` | La misma auditoría en los marcadores y mandos de fútbol y pelota, montados sin el partido en 3D, en castellano y euskera y en cada estado de los botones (atacar, defender, portero, penaltis, lesionado, tarjeta, cambio y la ventana de cambios; golpe, gancho y volea) |
| `auditoria-pueblo.mjs` | La misma auditoría dentro del pueblo (TAM=844x390 o 1180x820): HUD, diálogo, cada pestaña del libro, mapa con la tarjeta de una misión y de un lugar, mochila, pausa, cada pestaña de la tienda y recompensa. Con IDIOMA=eu, en euskera; con EUFALTAN=1, además, la lista de lo que se queda sin traducir |
| `auditoria-ventanas.mjs` | La misma auditoría en las ventanas del juego (fichas, minijuegos, misión cumplida, cuestionarios). Con IDIOMA=eu, en euskera |
| `auditoria-medida.mjs` | La medida común de las cuatro auditorías. «junto»: texto, botones, tarjetas e imágenes seguidos con menos aire del mínimo (texto y botón 12 px, 16 en el ordenador; tarjetas 8, 16 en el ordenador; imagen y texto 8; un texto que acaba y un título que empieza 16, 24 en el ordenador) o texto a menos de 8 px del borde de su caja. «centrado»: texto o icono descentrado más de 1,5 px dentro de su forma (botón, círculo, cuadrado, píldora, etiqueta), midiendo del icono lo pintado y del texto de las mayúsculas a la línea base. «cortado» también mira lo que baja de la línea (la «j», la «g») recortado por abajo. «justo»: texto de un botón que se sale o va a menos de 2 px de su borde. «imagen»: imagen deformada, descentrada en su caja, recortada más por un lado, con bandas vacías, desigual con las de sus tarjetas hermanas o con un encuadre que enseña menos del 70 %. Con MUESCA=1, todas miden con los márgenes de la muesca del iPhone 12 tumbado (47 px a cada lado y 21 abajo), que estrechan el menú: así se ve lo que en el iPhone se sale y en el ordenador no |
| `pelota-cubierto-ver.mjs` | El frontón cubierto: llegada, luz de pabellón a mediodía, grada, cámara de retransmisión siempre dentro y rebote hasta el techo |
| `futbol-vs-ver.mjs` | La presentación VS del fútbol: camisetas, medias, competición y que al tocar empieza el partido |
| `paquete-pelota.mjs` | Prepara los pelotaris y los sellos del autor desde su ZIP descomprimido: los de 512 y, para la VS, los de 1024 para la web y, para el archivo único, el rojo de 256, la camiseta azul suelta y los sellos de 176 |
| `sellos-nombre.mjs` | Escribe el nombre del juego en el aro de arriba de los 12 sellos de comarca: borra lo que llevaban, con el color de la banda, y pone HERRIZHERRI en el mismo arco, altura y color; escribe los de 512 (web) y 176 (archivo único) |
| `paquete-futbol.mjs` | Prepara los jugadores de fútbol del autor desde su ZIP descomprimido: los de 1024 para la web |
| `jugadores-busto.mjs` | Recorta el busto de cada jugador de fútbol para la caja de la liga y el menú del club |
| `relieve/descargar.sh` y `relieve/perfiles.py` | Descargan las teselas de relieve (nivel 8, unos 450 m por píxel; en Navarra salen de SRTM y GMTED2010, de dominio público, y se comprueba en la cabecera de cada una) y calculan con ellas `src/data/relieve.js`: rayo a rayo desde cada mirador y desde cada pueblo, con la curvatura de la Tierra y la refracción. Imprime qué montes se ven y cuáles quedan tapados. Uso: `sh tools/relieve/descargar.sh <carpeta nueva>` y `python3 -I tools/relieve/perfiles.py <carpeta> . src/data/relieve.js` |
| `mirador-ver.mjs` | La vista real desde el mirador de un pueblo: una captura hacia cada monte de la misión y otra con el visor abierto, sin rótulos, para comparar con fotos |
| `prismaticos-ver.mjs` | El visor de los prismáticos en el móvil tumbado o en el ordenador: botones encima, rótulos sin pisarse, la marca coge el monte y el ave |
| `pelota-camara-parejas.mjs` | Pelota por parejas: en cada golpe, si el que golpea sale en la imagen |
| `jugadores-duos.mjs` | Recorta las parejas de cada equipación del ZIP del autor: a su alto completo para la VS y 480 para los menús |
| `laminas-pequenas.mjs` | Las copias pequeñas de las láminas de la web, de 640 × 360 |
| `mando-iconos.mjs` | Los iconos de la app «Mando» (`public/mando`): la palanca del autor sobre el morado de la página del móvil, a 192, 512 (normal y «maskable») y 180 px |
| `laminas-importar.mjs` | Las láminas que rehace el autor (parte B del encargo), de una carpeta con `<id>.png`: la original a calidad 90, la de la web de 1280 y su copia de 640 sacadas del PNG, las del archivo único y del ligero sin pesar más que las de antes y, con `laminas-grandes.mjs`, la grande de 2560 |
| `laminas-grandes.mjs` | Las láminas grandes de la web, de 2560 × 1440: las de 1280 ampliadas al doble con Real-ESRGAN (`laminas-ampliar.py`, en CPU) y guardadas en WebP; con un grupo (leyendas, cimas, personajes, tradiciones), lo mismo con sus ilustraciones de 1536 |
| `cimas-tarjetas.mjs` | Las escenas de las cimas de 1024 para las tarjetas de la web |
| `nitidez.mjs` | Nitidez de las imágenes en el iPhone 12 tumbado (o en un ordenador, con `VISTA=1920x1080` y `DPR=`): cuánto se amplía cada una, por pantallas (URL de la web o del archivo único con MINI=1) |
| `nitidez-hd.mjs` | Nitidez del archivo único con red (las imágenes grandes de `hd.json` se sirven desde `docs/`) o sin ella (`SIN_RED=1`): al llegar a cada pantalla y 5 s después |
| `escudos-importar.mjs` | Mete los escudos de casa y de oficio del paquete del autor (`inventario-completo.json` + `revision-512/` o `grande/`) en `src/assets/escudos/casas` y `oficios`, solo los revisados (`--todos` para los señalados; `--municipales` para sobrescribir el armorial); de cada 512 saca los de 192 y 96 de los archivos únicos |
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
Con `LIGERO=1 npx vite build` sale una variante unos 6 MB más pequeña (`HERRIZHERRI-jugar-ligero.html`): los
personajes de Meshy van en su versión ligera (`src/assets/meshy/lod`) y todo lo demás es igual.

La web se guarda con un service worker (`src/web/sw.js`): la página se pide primero a la red y sin la copia del
navegador, y lo demás sale de la caché. La app instalada en el iPhone vuelve de segundo plano tal como estaba, así que
`src/web/update.js` mira al volver qué versión hay publicada: si ha cambiado y se está en el menú, carga la nueva al
momento (con `?v=…`, una sola vez por versión); si se está jugando, sale en el menú un aviso «Versión nueva» para
actualizar con un toque.

Cómo jugar (`src/hub/comojugar.js`): la primera pantalla de quien empieza, tras el idioma y antes del nombre, y
siempre a mano con «Cómo jugar» arriba del menú (en el móvil de pie, en «Más») y en Ajustes; no sale en el modo
didáctico. Las tres formas de jugar, cada una con sus pasos y su botón: en el ordenador o en la tele (teclado y ratón
o un mando de consola, e instalar el juego), con el móvil de mando (abre el panel del QR; en el móvil, «Descargar la
app Mando» abre `mando/`, que se instala) y en el móvil o la tableta (en el ordenador, un QR con la dirección del
juego; en el móvil, instalarlo aquí). La del aparato en el que se está va marcada y, en el móvil, la primera. Se ve
una sola vez sola (`seen.comoJugar` del perfil).

El material didáctico (`src/hub/didactico.js`) enseña tradiciones, oficios, productos, historia y palabras en euskera
como la página de naturaleza: `src/hub/ddgal.js` pinta la galería, con pestañas por apartado (en el móvil, la elegida
se trae a la vista) y una tarjeta por cosa con su lámina o, si aún no la tiene, su icono grande sobre su color. Al
tocarla se abre su ficha (`infoCard`) con el texto en pestañas: qué es, cómo se hace, herramientas, antes y ahora, y
dónde, con enlaces a sus pueblos. Las palabras en euskera van en tarjetas con la palabra en grande y el castellano
debajo, y las conversaciones, en bocadillos. Lo que sale con icono está en el encargo de imágenes pendiente.

La web se instala como app. `src/web/install.js`, desde «Cómo jugar»: en Android y en Chrome o Edge del ordenador abre
el aviso del navegador; en el iPhone y el iPad enseña los tres pasos de Safari, y deja compartir el enlace. En la app
ya instalada lo dice, y en el archivo único y en el artefacto manda a la web. El icono, la portada con la que arranca la página
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
cp dist/index.html HERRIZHERRI-jugar.html
git push origin master:main
```
