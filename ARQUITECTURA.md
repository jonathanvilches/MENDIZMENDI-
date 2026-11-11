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
    Meshy reparte la textura en unas dos mil piezas muy pequeñas (la mediana, de tres triángulos); lo que quedaba entre
    pieza y pieza, restos de otros colores, se colaba en los bordes y al alejarse (motas rojizas en el pelo, claras en la
    camiseta). `tools/meshy-costuras.mjs` rellena lo de fuera de cada pieza con el color de su propio borde y guarda la
    textura en WebP con el color a resolución completa en los bordes, también en sus versiones de 1024 px y ligera (solo
    la imagen: la malla no se toca, que las chicas casan sus parches con el orden de sus vértices). Rehacer el reparto
    en piezas grandes (xatlas) rompería esos parches; fundir el color a cada lado de las costuras dejaba cortes nuevos.
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
| `src/camera.js` | La cámara en tercera persona (`FollowCamera`): órbita, zoom, seguimiento detrás del jugador y choque con las casas. Mira por tres caminos, el del centro y dos que se abren medio metro a cada lado junto a la cámara, y por donde estará dentro de un cuarto de segundo si se sigue girando; se acerca con un muelle (más suave cuanto más lejos va, como a caballo) y no vuelve a alejarse hasta que el hueco lleva libre medio segundo. Antes, a caballo, al girar junto a las casas se metía 3,6 m en 0,17 s y volvía a salir: la imagen parpadeaba |
| `src/world/` | Mundo: relieve (`heightfield`, `terrain`), trazado del pueblo (`layout`, `townBuilder`, `houses`, `monuments`, `landmarks`, `civic`, `pamplona*`), naturaleza (`nature`, `agro`, `water`), materiales y texturas (`builder`, `textures`), cielo y luna (`sky`), tiempo (`weather`), productos 3D del mercado (`products3d`) y colisiones (`colliders`) |
| `src/levels/townReal.js`, `src/world/townReal.js` y `src/data/reales/` | Pueblos con su trazado de verdad. Si hay `src/data/reales/<id>.json` (de `tools/pueblo-real.py` + `tools/pueblo-real-juego.py`), `engine/runtime.js` lo carga y `createRealTownLevel` da la misma interfaz que el generador (`levels/town.js`): relieve EU-DEM con interpolación cúbica (rejilla de 20 m en el pueblo y de 60 m hasta 1,5 km para el anillo de montes), ríos como polilíneas con el nivel bajando con la corriente (`RIVERS` con `pts`, que `world/water.js` dibuja como cinta; `rx` vale 9999 y las truchas usan `riverPointNear`), calles de los datos en `PATHS`, plazas de verdad (`plazaMask`), campos de los usos del suelo y lugares de las misiones buscados en sitios libres y llanos. Los monumentos de la ficha van sobre su edificio real si lo hay (por su nombre), si no en el lugar con nombre de monumento de los datos (el castillo de Cortes, el cerco de Artajona) y, si tampoco, en su sitio lógico (orilla, lo más alto, junto a la iglesia); la muralla en anillo quita las casas que cruza. En los pueblos sin plaza en los datos, el centro es el hueco libre más cercano al ayuntamiento o a la iglesia. Antes de levantar nada, `levels/ordenar.js` pone orden: las filas de casas adosadas y las manzanas que los datos traen como un solo contorno se parten en casas de unos 9 m de fachada (las manzanas con patio, solo en los cascos de la Zona Media, la Ribera y las ciudades, y solo por los lados que dan a una calle); las casas junto a una calle se alinean con ella si casi lo están; cada una se recorta lo justo para dejar libres la calle, el puente, el río con su muro y la plaza (si casi no queda, no se levanta); dos que se pisan quedan pared con pared; y la puerta va a la fachada con sitio delante que da a la calle o a la plaza. Los puentes que cruzan agua se alargan hasta tierra firme y, donde una calle cruza el agua sin puente, se pone uno. En el casco, el cauce se estrecha donde una calle va por la orilla y se cubre donde la calle va encima. La iglesia, el ayuntamiento, el frontón y las casas de los monumentos no se tocan. `townBuilder.js` levanta las casas de los datos (`realHouses`: rectángulo con la fachada a su calle y su altura; con todo el detalle solo las más cercanas, 80/120/160 según la calidad, y el resto como bloque con tejado), los puentes (`realBridges`: tablero con lomo que nunca se hunde en el terreno, de lomo de asno en los de piedra de siempre; debajo, los muros hasta el suelo con tantos arcos como quepan, cada uno con su bóveda, y tajamares en las pilas del agua; suelo pisable por `addPlatform`) y los muros del cauce. El frontón va donde el real si los datos lo traen. Los JSON van en formato compacto (versión 2: líneas como diferencias entre puntos, relieve por predicción, casas como listas; unos 17 KB comprimidos por pueblo) y `data/reales/compacto.js` los devuelve a la forma de siempre al cargarlos. Con `?real=0` se juega el generado. Atribución de OpenStreetMap (ODbL) y EU-DEM en la ficha del pueblo y en `src/data/reales/LICENCIA.txt` |
| `src/world/relieve.js`, `src/data/relieve.js` y `src/world/panorama.js` | El relieve de verdad: desde cada uno de los 12 miradores, lo más alto que se ve en cada rumbo hasta cada distancia (diez «términos», de 300 m a 115 km), la silueta fina de cada monte de la misión con su cumbre a la altitud real, los montes que de verdad se ven desde allí, y el horizonte real de los 31 pueblos (grado a grado, más allá de 2,5 km). Los calcula `tools/relieve/perfiles.py` con el relieve de SRTM y GMTED2010 (USGS, dominio público) y van comprimidos (unos 18 KB); `cargarRelieve` los abre una vez antes de levantar el pueblo. Con ellos, la vista de los prismáticos en el mirador es el paisaje real (`Panorama.buildReal`: cada punto en su rumbo, a su distancia y con su ángulo reales, colores por altitud y clima, bosque, parcelas, roca, nieve, relieve menudo y bruma por distancia) y los montes del borde del pueblo siguen el horizonte real (`skylineFor`). Sin los datos (navegador sin `DecompressionStream`), los montes hechos a mano de antes |
| `src/actors/` | Seres vivos: jugador (`player`), personajes GLB, KayKit y Meshy (`glbChar`: clips del juego recortados de los de cada modelo, `loadMeshy`), vecinos (`npcGlb`: cuerpo KayKit con traje de su comarca), chicas sobre los modelos de Meshy (`chicas`: ver abajo), pelo de otro color (`hairColor`: ver abajo), trajes de vecinos y público y seres de leyenda (`outfits`: `OUTFITS`, `MYTHS`), trajes de carnaval y de leyenda hechos como los de verdad (`trajes`: ver abajo), público en gradas (`crowd3d`: figuras 3D cocinadas cerca de la cámara y láminas de `crowdSprites` de lejos; sentado en tendidos y gradas), animales (`animals` + `animalGlb` con los modelos de Quaternius; `beasts` es la versión procedural de reserva), minifiguras antiguas (`minifig`) y equipo (`gear3d`) |
| `src/game/` | Reglas y misiones: `townGame` (misiones, interacción y pasos de cada pueblo), `game` (Salazar), minijuegos grandes (`encierro` + `encierroPlaza` + `encierroTex`, `futbol`, `fronton`), vida del pueblo (`tienda`, `mercado`, `mochila`, `perro`, `chase`, `crowd`), señales y objetos (`senales`, `items`), perfil (`profile`) y contenido (`content`) |
| `src/pelota/` | Motor de pelota a mano independiente: reglas, física, IA (cinco niveles en `rules.js`), HUD, cancha, fichas técnicas de los pelotaris (`ficha.js`: datos inventados que salen del nombre, cualidades y golpes), el frontón que juega (`courtFeel` en `rules.js` y `setFeel` en `physics.js`: a cubierto, piedra, mojado o Labrit), la pelota elegida (`BALLS` en `rules.js`: normal, viva, muerta, de mucho bote y de poco bote, que multiplican esa física) y la pantalla VS (`vs.js`). El golpe es siempre manual (`game.js`): sale al soltar el botón y cuenta el momento respecto al justo (`idealAt`, con lo que perdona cada nivel en `TOL`); antes del bote es volea y alta, gancho. La energía (`EN` y `shotEnergy`) baja sobre todo con las cortadas seguidas y al esprintar a por una dejada, algo con dos paredes y ganchos, y sube peloteando normal. La cámara dinámica opcional está en `match.js` (`camDyn`). Las simulaciones de los golpes (`landingOf` y la dos paredes en `physics.js`) solo guardan los eventos y paran al botar El saque, de un solo gesto, como en el frontón: mantienes GOLPE para elegir la fuerza (la palanca apunta) y, al soltar, el pelotari sale corriendo del 7, bota la pelota hacia el suelo sin frenar y el golpe sale solo en el 4, con esa fuerza y esa puntería; el rival saca igual. La pelota del bote va con el que saca, en su tiempo (`tempo`), y se bota antes cuanto más despacio va, para que el golpe caiga siempre en el 4 |
| `src/ui/camaraAR.js`, `src/ui/txalapartaAR.js`, `src/pelota/camaraCuerpo.js` y `public/ar/` | Los juegos con la cámara, solo en la web (`camaraDisponible`; los modelos no caben en los archivos únicos): MediaPipe Tasks Vision 0.10.21 de Google (Apache 2.0), en el propio aparato, la imagen no sale de él. `camaraAR.js` carga el motor una vez (`motorVision`). La txalaparta (Menú, Instrumentos, Txalaparta, «Con la cámara») sigue las manos con Hand Landmarker. La pelota en casa (Torneos, Pelota a mano, losa «Pelota en casa»; `camara: true` en `playPelota` y `PelotaMatch`) sigue el cuerpo con Pose Landmarker lite: la ventana arriba a la izquierda con tu imagen de espejo y tu esqueleto, solo hasta que te ve; tu sitio a lo ancho (respecto al del primer momento quieto) lleva a tu pelotari a ese lado de la cancha (`leeCuerpo` en `match.js`) y, cuando te toca, va solo a por la pelota y apuntas hacia donde estás; el armado (la mano hacia fuera, arriba o detrás) arma su brazo como el tuyo (`st.wind` y `st.arma`); el golpe es la mano que va deprisa hacia delante respecto a los hombros (de lado hacia dentro, hacia abajo el de aire, hacia arriba y dentro el sotamano; subir por el lado es armar; y hacia la pantalla, con la profundidad del detector muy suavizada y con poco peso, que tiene unas siete veces más ruido), y se lee entero (`gesto`). La mano se sigue aunque el detector dude (en lo más rápido del golpe sale movida o se sale de la imagen: la muñeca vale desde una visibilidad de 0,2 y, si no, se estima por el codo siguiendo el brazo); si falta un momento (hasta 0,3 s), al volver a verla cuenta lo que se ha movido en ese rato, y el golpe no se cierra hasta que falta 0,2 s (antes se daba por perdida, el golpe se cerraba a medias y al volver empezaba de cero: así no salían las dos paredes ni las cortadas de verdad). Empieza (`onGolpe`, el golpe sale ya, casi recto) cuando la mano va deprisa hacia delante o, aunque no se haya visto ir deprisa en ninguna imagen, cuando ha recorrido al menos 0,75 anchos de hombros hacia delante en el último medio segundo a buen ritmo (solo desde el golpe anterior); se va afinando mientras dura (`onGolpeAvance`) y se cierra al frenar dos imágenes seguidas (`onGolpeFin`, `lee`). Todo es relativo a cada jugador (medido en el entrenamiento de un pelotari de verdad, donde el golpe va muchísimo más deprisa que el armado y se espera ya agachado): `tipico` es lo deprisa que golpea de normal (la mediana de sus 12 últimos golpes sin las dejadas; de primeras, 6 anchos de hombros por segundo); el umbral es el 36 % de eso (al menos 2,6); si la otra mano va casi igual de deprisa (armar o equilibrarse), un 50 % más; justo después de un golpe, un 35 % más; y con la mano baja o encogido, mucho menos, salvo que la mano caiga (el brazo que vuelve a su sitio). Como lo describe el autor: la cortada, el brazo mucho más rápido que lo normal (un 30 % más, al menos 5,5; de arriba abajo, algo menos); el largo, un golpe entero mucho más lento (un 75 % de lo normal o menos, con al menos un ancho de recorrido) o que acaba hacia arriba; la dejada, la mano baja (a la altura de la cadera) y con poco recorrido (menos de 1,15 anchos), o encogido un poco más que la mediana de los últimos 3 s, y nunca más rápida que lo normal. Hacia dónde: con la derecha, el brazo de derecha a izquierda, a la pared; el que acaba muy a la izquierda (la mano a la altura del hombro izquierdo, -0,5 anchos, o más allá, o el codo pasado al otro lado del cuerpo), dos paredes; el que se va hacia la derecha al final o acaba con la mano separada del cuerpo, al ancho; con la izquierda, al revés y sin dos paredes. Cada golpe va al informe de la partida (`util/informe.js`, `window.__informeEvento`: tipo, cruce, codo, pico, típico, recorrido, altura de la mano, encogido, duración, imágenes, huecos e imágenes por segundo del detector) y cada muestra lleva `camHz`, `camVisto`, `camGolpes` y `camDetector`: para afinar con golpes de verdad. Muy cerca de la cámara (los hombros, más de un tercio del ancho, o la mano saliéndose de la imagen), avisa: «Échate un poco hacia atrás». La fuerza, por lo deprisa que va respecto a lo normal (`pot`). El nombre del golpe sale un momento arriba a la izquierda (`TEXT.shots`). La ventana con tu imagen y tu esqueleto solo sirve para colocarte: en cuanto te ve y te ha medido (2 s) se quita del todo (`oculta`; el vídeo sigue en la página, de 2 px y casi transparente, porque escondido del todo algunos navegadores dejan de darle imágenes) y vuelve si deja de verte; tocándola, se quita. Queda solo, un momento, el nombre del golpe. El detector va en un trabajador aparte (`public/ar/cuerpo-worker.js`, clásico, con la copia del paquete en `public/ar/vision_bundle.js`): la imagen, reducida a 320 de ancho y una a la vez, se salta si lleva un cuarto de segundo esperando; el partido no se para (medido: la imagen del partido tarda lo mismo que sin cámara; con el detector en la página tardaba un 45 % más y con picos de 1,5 s). Si no hay trabajador, en la página y como mucho 20 imágenes por segundo. En `game.js` (`camara`), el golpe dura 0,55 s y espera hasta 0,4 s a que el gesto se cierre (`camPend`) salvo que la pelota se vaya (`seVa`); el momento justo es el de cuando empezó el gesto, descuenta 0,1 s de retraso y perdona un 35 % más; en el saque, el gesto entero manda la fuerza, la puntería y si es cortado. Sin cámara o sin permiso, los botones de siempre; con teclas o palanca, mandan ellas. Pruebas: `window.__camaraCuerpo` (`estado()` y `pose(lms, t)`, que deja de leer la cámara) |
| `src/game/pelotaris.js` | Colección de pelotaris: uno por pueblo, su carta al jugar contra él y los demás con la figura del pelotari de su frontón y un candado, por comarcas |
| `src/futbol/` | Fútbol 11 y sala: motor del partido (`game.js`), reglas por formato (`rules.js`), partido en 3D (`match.js`) y marcador y mandos (`hud.js`). Cada jugador tiene forma (`fit`), que baja jugando y más esprintando, y la energía no pasa de ella; las faltas por detrás o en plancha pueden lesionar (leve: cojea un rato; grave: corre menos y no esprinta). Cambios: cinco en fútbol 11 y sin límite en sala; el pedido con el balón en juego se hace en la siguiente parada; el rival cambia solo a lesionados y cansados, y tu equipo también con «Cambios automáticos». A la tercera falta de un mismo jugador, amarilla. El portero sale a cortar los pases al hueco. En pantalla: la ficha de tu jugador (número, puesto, energía, forma perdida en rayas, tarjeta y lesión), el aviso de cambio bajo la pausa y la ventana «Cambios» con los dos equipos |
| `src/game/rutinas.js` | La tarea de cada vecino del pueblo (misa, compra, charla, jugar a pillar, fuente, pan, paseo): sus paradas, cuánto se queda en cada una, hacia dónde mira y qué hace; `Actor.arrive` las cumple |
| `src/data/hitzak.js` | Las palabras en euskera que enseñan los vecinos: cada uno, una de lo que está haciendo (quien va a la fuente, «ura»; quien pasea con lluvia, «euria»), con una pregunta de tres opciones. Cuando ya sabes unas cuantas, uno de cada dos vecinos charla contigo en euskera (`HIZKETAK`, 14 conversaciones): te dice algo, con el castellano al lado, y eliges qué contestar entre tres frases; la del tiempo que hace depende del cielo. Se guardan en el perfil (`hitzak` y `hizketak`: 1 oída, 2 acertada), se repasan con otros vecinos y se ven en el cuaderno del pueblo, pestaña Euskera, y en el modo didáctico; sus plantillas de euskera (`EU_RX_HITZAK`) dejan las palabras tal cual y, en euskera, quitan el castellano de al lado |
| `src/mando/` y `public/mando/index.html` | El móvil como mando, como en los juegos de Netflix. En el ordenador («Mando del móvil» arriba, o Ajustes y Pausa: «Usar el móvil como mando») sale un QR y un código de cinco letras; el móvil abre `mando/` (sin instalar nada, Android o iPhone) y, tras el saludo, los dos hablan directamente por la wifi con WebRTC (`mando.js`) o, si la wifi no lo deja, por el propio saludo. El saludo (`senal.js`, el mismo archivo en los dos: la web lo publica en `mando/senal.js`) va a la vez por PeerJS, cinco servidores públicos de MQTT (dos por el puerto 443) y ntfy.sh, cifrado con el código salvo en PeerJS; vale el primero que contesta, lo repetido se cuenta una vez, los caminos caídos se vuelven a probar y el mando, si va por el saludo, usa los caminos por los que ya ha llegado algo del otro. Las dos pantallas enseñan qué servidores contestan. Seguridad: todo va cifrado y firmado (AES-GCM) por todos los caminos y los nombres en los servidores son una huella del código; el QR lleva además un secreto de 128 bits detrás del «#», que no pasa por ningún servidor, y con él se entra directamente; quien escribe el código a mano necesita el permiso del ordenador; solo manda el móvil aceptado; lo repetido o grabado y vuelto a mandar no vale; la página del móvil (`mando/index.html` y `mando/movil.js`) solo carga código de la propia web y solo habla con los servidores del saludo. El móvil se presenta como un mando estándar (`pad.js`), que también lee los mandos Bluetooth o USB de verdad. Lo que hace cada botón depende del momento (`contextos.js`): mandos fijos para el pueblo, el encierro, los prismáticos, los diálogos, la pelota, la pasaka, el fútbol, el esquileo y la costura; en el resto de minijuegos y ventanas, el móvil copia los botones que se ven en pantalla y hace de panel táctil con una flecha (`cursor.js`). Para conectar rápido, el móvil busca sus rutas de red mientras llega al saludo, la oferta y la respuesta salen sin esperar a todas (las demás van sueltas) y, si en 0,7 s no hablan directamente, el mando ya funciona por el saludo y pasa solo a la conexión directa cuando la hay. El saludo no se da nunca por perdido: si se cae el único servidor que había contestado (en la calle, PeerJS a veces acepta y se cae enseguida), siguen los que aún estaban llegando y cada uno se vuelve a probar a los 2, 4 y 8 s y luego cada 15; el ordenador, al volver a probar, conserva el código, así que el QR que ya tiene el móvil sigue valiendo. En el móvil se juega con los mismos botones que se ven en la pantalla del juego al jugar en el móvil, para no confundir: en el fútbol, los de su pantalla (TIRO en la esquina, PASE a su izquierda, SPRINT encima y CAMBIAR en diagonal, con sus colores e iconos; al defender, ROBAR y ENTRADA; con el portero, en turquesa: `contextos.js` lee los rótulos de la pantalla en cada momento); en la pelota y la pasaka, GOLPE grande y rosa con CORTADA o GLOBO y DEJADA en columna; en lo demás, los círculos morados del pueblo con el principal en rosa en la esquina y los demás a su izquierda, encima y en diagonal; si hay uno que se queda puesto (Correr), ese va a la izquierda del principal y los demás encima, como en la pantalla del pueblo con el móvil en vertical (Acción en la esquina, Saltar encima y Correr a su izquierda), y con tres o menos, más grandes. La palanca es la del juego: el círculo de trazos con MOVER y, donde se apoye el pulgar, el aro con el botón blanco. Arriba, en qué se está y los botones de sistema, redondos (cuaderno, mapa, perro, menú, pausa, salir), y delante los de acción que se usan poco (en el pueblo, la mochila y los prismáticos), para dejar sitio abajo a hablar, saltar y correr. Los del fútbol y la pelota llevan su nombre dentro, como en su pantalla, en la letra del juego (Barlow Condensed y Nunito, OFL, copiadas en `mando/fuentes` con sus licencias); si el nombre no cabe, solo el icono. Los del pueblo y el encierro van solo con su icono, que ya se entiende (Acción, Saltar, Correr, Mochila, Prismáticos, Cámara, Anotar, Seguir); el nombre queda para el lector de pantalla. `contextos.js` dice qué se queda puesto (`fijo`), qué botón de hombro va con los de acción (`der`), qué botón de acción va arriba (`arriba`) y con qué botones del juego se pinta (`estilo`). Las pruebas usan `?senal=`, `?mqtt=` y `?ntfy=` con servidores locales, `?sinpeer`, `?sinp2p` y `?trozo=` En el pueblo, arriba a la izquierda del móvil, la misión que sigues y su paso, como el recuadro del juego; al tocarla, todas las del pueblo como en el cuaderno (hechas, en curso y nuevas, con sus pasos) y, tocando una, el ordenador pasa a seguirla (`misMovil` y `seguirMision` de `contextos.js`). La app «Mando»: la página del móvil se instala (`manifest.webmanifest`, a pantalla completa y en horizontal, con su icono, la palanca del autor sobre morado: `tools/mando-iconos.mjs`, y su propio `sw.js`, que pide siempre la red y guarda una copia); se ofrece en la pantalla de conectar y una vez al conectar (en Android con su botón; en el iPhone, Compartir y «Añadir a pantalla de inicio»). El móvil se queda con el ordenador: este guarda su código y su secreto (el QR es siempre el mismo) y, al conectar, le manda el secreto solo por la conexión directa; la app, abierta sin enlace, se conecta sola, y si el juego aún no está abierto espera sin error. El ordenador, si ya se conectó un móvil, le espera al abrir el juego sin abrir el panel (`esperarMovil`). Con el código a mano se pide permiso la primera vez y ya no más. «Olvidar este móvil» lo borra en los dos. Nada se queda pulsado: el móvil numera la palanca y los botones (por el saludo pueden llegar desordenados y el ordenador se queda con lo más nuevo), repite lo que mantiene (la palanca cada 0,3 s y los botones cada 0,5) y manda el «quieto» tres veces; el ordenador (`pad.js` y `mando.js`) suelta lo que no se repita en 1,5 s, y todo al cortarse, al irse un mando o al perder la ventana. En el móvil, la palanca se suelta también desde la ventana, sin dedos en su mitad o al irse la página, y otro dedo que toca manda él, como en las palancas de la pantalla del juego |
| `src/ui/sport.css` y `src/ui/sportCard.js` | Estilo deportivo de todo el juego: letra condensada (Barlow Condensed, OFL), morados con fucsia y rosa, fondos de retransmisión, botón fucsia, entradas escalonadas y las cartas de jugador con media y cualidades (la media sale de `pelotariRating` en `pelota/rules.js`) y, bajo la media, el icono de su arquetipo (`pelotariArq` y `arqChips`: Rematador, Defensor, Estratega o Zurdo, de sus cualidades y golpes; la mano sale de `esZurdo`, la misma en la carta y en la ficha). El nombre del arquetipo, la mano y el golpe estrella van en la pantalla VS (`pelota/vs.js`) y en la ficha (`pelota/ficha.js`) |
| `src/web/app.js` | ¿Se juega dentro de una app de tienda? (`appNativa`: `window.Capacitor`, «HerrizherriApp» en el agente de usuario o `?app`, recordado en la sesión). Entonces no se ofrece instalar desde el navegador ni descargar el juego, «Cómo jugar» solo explica los botones y no se nombran otras plataformas ni se manda a la web (normas 2.3.10 y 4.2 de Apple). Revisión para la App Store, con lo que falta y la ficha propuesta: `entrega/app-store/README.md` |
| `src/web/todo.js` | «Descargar el juego entero» (Perfil, en la web y la app instalada): baja los archivos de esta versión (la lista con sus tamaños la escribe `vite.config.js` en `todo.json`) a la misma caché del service worker; luego los pueblos y los minijuegos abren sin esperar a internet y se juega sin conexión |
| `src/util/tele.js` | La pantalla grande (una tele o un monitor grande): la interfaz se diseña a 1440 × 810 y, por encima, crece en la misma proporción con `zoom` en `<html>` (a 1920 × 1080, un 33 %; en una tele 4K a tamaño real, 2,66 veces), y las ventanas medianas (la de antes del partido y las pausas de la pelota y del fútbol, la pausa y las fichas del pueblo, el cuadro del torneo y el diálogo) otro 20 % (`<html class="tele">`, con su `--z` total, `--zt`), para que ocupe todo el ancho y se lea desde el sofá. Los `vw` y `vh` del CSS van divididos por `--z`, las vistas 3D a pantalla entera llevan la clase `pantalla3d`, que deshace el zoom, y lo que se mide en píxeles de la pantalla (clics, `getBoundingClientRect`) se pasa a los del CSS con `enCss()`. Las reglas `@media` miran la pantalla sin ampliar: la única entre 810 y 900 de alto, la del final de capítulo, se repite con `<html class="tele-bajo">`. Solo sin dedo y con el zoom estándar (`currentCSSZoom`); si no, todo sigue igual |
| `src/util/tactil.js` | Si se juega con el dedo (`pointer: coarse`: móvil y tableta; `<html class="tactil">`). Solo entonces salen los controles de pantalla (la palanca y los botones de jugar); en un ordenador, aunque su pantalla sea táctil, y en una tele, nunca. Con el mando del móvil conectado (`<html class="con-mando">`, `mando/mando.js`) se esconden en todas partes y vuelven al desconectarlo; los botones de los minijuegos se quedan, porque el móvil los copia. Los del fútbol se crean siempre, escondidos sin dedo, para que el móvil lea sus rótulos (PASE, ROBAR, PARAR…) también en el ordenador |
| `src/ui/pausa.js` y `src/ui/pausa.css` | La ventana de pausa de los partidos de pelota y de fútbol, como la de los juegos de fútbol de referencia: cabecera con el título y la equis, y una fila por opción con su nombre, qué hace y un botón redondo (`pzCabecera`, `pzFila`, `PZ_ICO`); y el icono del resultado del panel del final (`pzResultado`) |
| `src/ui/encaje.js` | Ninguna palabra partida ni cortada con «…»: vigila lo que se añade a la página y, en los textos que podrían partir una palabra larga o cortarse con puntos, baja la letra poco a poco (hasta el 65 % y nunca por debajo de 12 px) hasta que todo cabe entero; si no basta, el texto con puntos pasa a dos líneas |
| `src/ui/fitlabel.js` | Rótulos de los botones redondos (fútbol y pelota) siempre dentro del círculo: mide cada línea del texto contra el círculo y, si no cabe, lo parte en dos líneas y luego junta las letras, sin bajar nunca de 12 px. Se vuelve a mirar al cambiar el rótulo y el tamaño de la pantalla |
| Identidad común | Reglas que valen en todo el juego (`style.css`, `sport.css`): escala de letra 12, 14, 16, 20, 24 y de 32 en adelante; rótulo en letra estrecha rosa de 14 px con raya inclinada (`.kicker`); título en la letra de rótulos grandes con interlineado 1; distancias entre textos con la tabla de ritmo (ver «Ritmo de los textos» abajo); botón principal en la letra de rótulos grandes sobre el degradado y los demás en letra estrecha en mayúsculas; textos en blancos y lilas fríos, rosa para destacar; verde solo para acierto, naturaleza y los colores de comarcas y clubes; toda tarjeta, card, bloque, panel, ventana y rótulo con las esquinas redondeadas (6 px los rótulos pequeños, 8 las tarjetas, 10 los paneles) y un filo de neón de 1 a 2 px (`ui/neon.css`, ver «Identidad: esquinas redondeadas y filo de neón»), botones en pastilla y marcas en círculo, y pestañas, filtros y chips en letra estrecha: una sola lista en `sport.css` para los dos. Degradados: nunca duros ni de lado; si hace falta uno, muy paulatino, de menos a más y sutil, en varios tramos y sin saltos de oscuridad en poco espacio. La misma identidad en toda la aplicación: lo que se haga en una pantalla vale para todas. Composición: todo en la rejilla de 4 px; el mismo margen en las cuatro esquinas de la pantalla de juego (`--edge` y `--thumb`, 16 px); las ventanas de papel con 12 px arriba, a los lados y abajo; en el menú, el margen de los lados (`--gut`) igual para el contenido y para la barra de arriba |
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
| `src/audio.js` | Sonido con Web Audio: ambiente, animales, efectos y la música por ambientes. Sonidos grabados (`GRAB`, `grab`, `hay`; Envato Elements, `src/assets/sonidos/LICENCIAS.md`): ladridos, balidos, mugido, gruñidos, el caballo de montar (relincho al montar y resoplido parado; los cascos, `cascos` y `golpeCasco`, desde `game/montura.js`: cada pisada se arma al ritmo de su aire, `AIRES`, cuatro golpes al paso, dos dobles al trote y cuatro y el vuelo al galope, con un trozo corto de la grabación del galope, uno de sus trece golpes, `GOLPES`, al azar y con algo de tono, un golpe grave a 150 Hz que le da cuerpo, un poco de eco y lo propio de cada suelo, `SUELO`: la nieve apagada y con crujido, la hierba y la tierra sordas, el empedrado con chasquido y más eco, la madera hueca y el agua con chapoteo; antes, la grabación en bucle, casi sin graves y sin eco, sonaba seca), pasos sobre piedra y en el agua, botones, avisos y premios; si uno aún no está descomprimido suena el sintetizado de antes. Los de los menús y los pasos se descomprimen al abrir, los de los animales al entrar en un pueblo. Dos ambientes en bucle de 20 s (`Ambiente` en `audio/pistas.js`, sin quedarse con la copia de 30 s): pájaros y pueblo de día, en el monte solo pájaros y más fuertes, de noche y en los partidos ninguno; con ellos, los pájaros sintetizados casi no suenan. En el encierro y las persecuciones, su música de acción (`musica-accion`). En los partidos de pelota, la épica de Torneos (`musica-torneos`), la misma del menú de pelota; la medieval de antes, «Minstrel Guild», se quitó (noviembre de 2026: la música del juego, siempre la que pasa el autor). Todo junto, unos 13 MB de audio descomprimido. La música, siempre con las canciones grabadas (`src/audio/pistas.js`): la del juego en el pueblo, de día y de noche, en los minijuegos, las fiestas y el encierro; la de Torneos en los partidos y los campeonatos; la de inicio en el menú. No hay música sintetizada: se mezclaba con las canciones nuevas. Al abrir, la música es lo primero que se prepara (`main.js`, al empezar `boot`): cada canción se descarga entera, la del menú la primera, y suena desde esa copia, así entra al momento y sin conexión; suena en cuanto el navegador deja, desde el principio donde se puede, como la app instalada en el ordenador, y si no con el primer toque o tecla de cualquier tipo, también el de la portada del arranque: el contexto de audio y los elementos de las músicas se crean en `index.html` (`sonido-primero`) y en ese toque quedan libres para sonar luego sin otro. En el iPhone, Apple no deja sonar nada antes del primer toque, y con el interruptor de silencio puesto no suena |
| `src/crowdAudio.js` | El público de la pelota y del fútbol, sintetizado: murmullo de treinta voces con formantes, aplauso de 160 personas a la vez, «¡oooh!», lamento y estallido. Se calcula una vez, a trozos, mientras carga el partido (`crowdBuffers`); `Crowd` lo reproduce con su nivel según el momento |

## Convenciones

- **Fidelidad a los pueblos de verdad** (regla del autor, noviembre de 2026; va por delante de cualquier mejora):
  - Los pueblos y las ciudades mantienen su estructura: las mismas calles, las mismas plazas y el frontón, la iglesia
    y los monumentos en su sitio (`src/data/reales/`, de Overture Maps y OpenStreetMap). Ninguna mejora de arte, de
    exploración o de retos mueve, quita ni inventa calles, plazas o edificios señalados.
  - Lo que no existe se puede hacer a nuestra manera, pero lo más fiel posible al lugar y sin alterar el trazado: va
    en sitios libres (la atalaya y las kutxas de la aventura) o en escenas aparte (los frontones cubiertos de los
    campeonatos, que no sustituyen al frontón del pueblo).
  - La arquitectura es la de verdad: si una iglesia es románica, románica; si es gótica, barroca o de otro tipo, la
    suya (`style` de `church` en `data/levels.js`). Antes de añadir o cambiar un estilo, una planta o un edificio se
    busca, se contrasta con fuentes fiables y se anota de dónde sale; si no se puede contrastar, se pregunta.
- **Máxima resolución y definición:** todo lo que sale en el juego, con la máxima resolución y definición para la pantalla
  donde se ve (contando su densidad y su tamaño). Un vídeo o una animación que se estiraría no sale: va la imagen fija, de
  más resolución (`basta` en `ui/videos.js`; las imágenes suben solas a su copia grande con `web/hd.js`).
- **Rendimiento ante todo:**
  - Lo estático se funde por material (`mergeGeometries`, `mergeByMaterial`).
  - Lo repetido va instanciado (público, banderines, ventanas…).
  - Cada animal y cada vecino es una sola malla con piel.
  - Las animaciones lejanas se actualizan a saltos.
  - Los iconos 3D se hornean a WebP.
  - Sombras y contornos solo de cerca: en calidad alta, vecinos a 28 m y animales a 35 (contorno 26); en la media, 20, 24
    y 20 m; aligerado, 20, 20 y 16 (`sombraPersonas` en `actors/people.js`, `Fauna` en `actors/animals.js`). En la baja,
    la del móvil, no hay sombras de verdad: solo la redonda (`util/blob.js`).
  - `visible` siempre con verdadero o falso, nunca con lo que dé un `||`: three.js solo esconde con `false`, y con
    `undefined` dibuja. Así se colaban los 50 animales del pueblo y las ardillas a cualquier distancia (130 mil triángulos
    en cada imagen); ahora, `!!a.pinVisible` y `!!this.farView` en `actors/animals.js`.
  - Las máquinas paradas del campo, con rueda sencilla a más de 60 m (`ruedaLejos` en `world/agro.js`: 170 triángulos
    en vez de 1.000 a 1.300). El género del mercado, solo a menos de 90 m de la plaza (`Mercado.cerca`); la madera y los
    toldos se ven siempre. Los frutos de las matas de la cosecha, de ocho caras.
  - Las mallas de tractores, cosechadoras y ruedas, compactadas al hacerse (`compacta` en `world/agro.js`): con índice, la
    normal en `Int8×4` y el color en `Uint8×4` normalizados (alfa 255); sin color las de pintura y cristal. En Tudela, de
    32 a 27 MB en la puerta.
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
  (Leitza, octubre de 2026). Al frontón, sin vuelos de cámara (`game/llegadas.js` solo quita el velo con el partido ya
  montado): el vuelo de la final en el Labrit, la grúa del cubierto y la bajada a la plaza, con su cartel (`ui/vuelo.js`),
  se quitaron, y también la presentación a oscuras con los focos que buscaban a los pelotaris (`pelota/show.js`), a
  petición del autor (noviembre de 2026). La final tiene su propia entrada (`pelota/granFinal.js` y `granFinal.css`),
  como la cabecera de una retransmisión y toda en la página, sin nada nuevo en la escena 3D: sobre el frontón oscurecido,
  con el público en pie detrás, entran «GRAN» y «FINAL», cae la txapela, llegan las cartas de los dos finalistas (el azul
  por la izquierda y el colorado por la derecha), salta el «VS» y cae el confeti; se va sola a los 6,4 s o al tocar, y
  de ahí al sorteo, sin la pantalla VS, que ya los ha enfrentado. Se prueba con `tools/labrit-final.mjs`. La
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
  `pelota/match.js`). Encima, solo el título y las tarjetas de los dos pelotaris con su figura asomando. Las dos tarjetas
  son iguales, como en espejo: del mismo ancho, el nombre en una línea y, debajo, el color y las temporadas, cada uno en
  la suya; si un nombre no cabe, los dos nombres bajan a la vez a la misma letra (`iguala`, nunca de 14 px). Antes cada
  una medía lo que su texto y la de un nombre largo salía con tres líneas y la otra con dos.
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
  sola barra: su energía, en dorado, naranja y luego roja parpadeando al cansarse; por parejas, la media de los dos.
  Delante de la barra, un rayo de su mismo color, para que se sepa que es la energía, en el borde de fuera de cada lado,
  como en espejo (`.ps-ico`). Los dos nombres van enteros y a la misma letra: si uno no cabe, los dos bajan a la vez,
  nunca de 11 px (`nombres`; antes el más largo salía con puntos suspensivos, «MIKEL · NER…»). La
  fuerza ya no va en el marcador: se ve en el aro del botón mientras cargas. En el móvil y la tableta va sin el «A 5 tantos» y más estrecho, para no tapar el frontis, que va en el centro
  de la pantalla; en el ordenador ancho, entero. El menú, con el icono de pausa como el del pueblo, para el partido al
  abrirlo con la mano o con Escape, y lleva todo junto: la pelota, que se cambia mientras sacas tú, el descanso, las
  fichas de los pelotaris y salir del partido. En su badge, los descansos que te quedan; brilla si estás cansado; con el
  descanso empezado se abre solo, con el título «Descanso», y Continuar lo termina, sin parar el minuto. Ya no hay X
  arriba a la izquierda. El menú es la ventana de pausa común a los partidos (`ui/pausa.js` y `ui/pausa.css`; el
  partido de fútbol usa la misma), como la de los juegos de fútbol de referencia que mandó el autor: centrada sobre el
  partido oscurecido, con la cabecera (el título y la equis) y una fila por opción, con su nombre, una línea que dice qué
  hace y un botón redondo del degradado del juego a la derecha; toda la fila se toca y tocar fuera la cierra. La pelota
  del cestaño va en una fila con sus pastillas; con teclado, la tecla de cada opción junto a su botón. En el móvil
  tumbado las filas bajan hasta caber sin desplazar, también con la barra de Safari. Antes era un desplegable bajo el
  botón. El panel del final lleva delante del título el icono del resultado (`pzResultado`): el check del juego si
  ganas y una equis en un aro rosa si no; en fútbol, sin icono en el empate. Los botones de
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
- **Marcador de retransmisión y rachas** (`pelota/hud.js`, `setScore`, `setRacha`, `call`; `pelota/match.js`, `rachaDe`):
  al sumar, la cifra salta en dorado y su lado se ilumina. El aviso del tanto lleva arriba una raya del color de quien
  lo gana y, si toca, el rótulo de racha: tres tantos seguidos o más, o el que iba tres o más por detrás iguala el
  partido o se pone por delante (la remontada, una vez cada cosa). Mientras dura la racha, una llama junto a la cifra
  del marcador (solo la llama: el número va en el aviso, para no quitarle sitio al nombre).
- **Textos grandes y alto contraste** (`util/accesible.js`; Ajustes en `hub/hub.js`): se guardan aparte del perfil, en
  `herrizherri-accesible`, y se ponen como clases de `<body>` (`textos-grandes`, `alto-contraste`) desde que se abre el
  juego. Textos grandes sube un 20 % las variables de letra (`--fs-*`) dentro del partido de pelota, la pantalla VS y la
  ficha; alto contraste pone fondo negro, letra blanca y bordes blancos en el marcador, los avisos, los paneles y los
  botones, y en el anillo y los corazones de la aventura. Cada estilo va con lo suyo (`pelota/hud.js`, `vs.js`,
  `ficha.js`, `ui/aventuraHud.js`).
- **Resumen del final** (`pelota/match.js`, `endPanel`, `claveDe`, `mapaBloque`; `pelota/game.js`, `stats.log` y
  `stats.golpes`): el resultado en la cabecera, entre los dos nombres con el color de cada uno (en el reto del frontón,
  grande, que no hay rival); a la izquierda el momento clave y la experiencia; a la derecha las estadísticas y el mapa
  de golpes (la cancha desde arriba, del frontis al rebote, con un punto de cada color donde golpeó cada uno). En dos
  columnas desde 600 px de ancho, para que en el móvil tumbado no quede nada debajo de los botones. En el móvil tumbado
  (`pelota/hud.js`, hasta 520 px de alto) cabe entero sin desplazar: 12 px entre bloques, 10-14 px dentro, las cifras sin
  casilla propia, el mapa con su título a la izquierda para que la cancha use el ancho, las dos columnas acabando a la
  misma altura y los botones a 44 px; en los de 375 px de alto, 10 px; y con la barra de Safari (320-360 px de alto),
  8 px entre bloques, 6 dentro y el mapa más bajo: antes ahí el mapa quedaba debajo de los botones y parecía cortado.
  Probado de 667×320 a 932×430, con muesca, en
  castellano y euskera y por parejas (con textos grandes se desplaza, con los botones siempre a la vista). El momento clave es
  la remontada, si el que gana iba tres o más por detrás; si no, el tanto que deshizo el último empate, contado según
  cómo se ganó (golpe y remate, saque directo o fallo del otro); y si nunca empataron, el tanto más largo.
- **Comentarios del partido, hablados** (`pelota/comenta.js`, las frases; `pelota/voz.js`, la voz; `pelota/match.js`,
  `decir`, `comInicio`, `comTanto`; Ajustes en `hub/hub.js` con `util/comentarios.js`: `herrizherri-comentarios`, voz
  de hombre, de mujer o sin comentarios, y `herrizherri-subtitulos`, apagado de serie). Se oyen, no se leen: escritos
  tapaban la pantalla. Las frases no llevan nombres ni números, para poder grabarlas una vez; cada una tiene su clave
  («dejada-2»), que es el nombre de su grabación en `src/assets/voz/<hombre|mujer>/<es|eu>/`. Solo suenan grabaciones
  del autor, nunca una voz sintética: si falta la frase en esa voz, la de la otra voz; si falta en euskera, la de
  castellano; si no hay ninguna, no se dice nada. Una frase cada vez; se callan al pausar y al salir. Con los subtítulos puestos, también el rótulo de
  abajo. Las grabaciones pueden llegar en un solo archivo por idioma: `tools/corta-voz.mjs` lo corta en una frase por
  archivo, en el orden del guion, con los cortes en los silencios y cada frase de la duración que pide su texto; una
  palmada tira la toma de antes; todas al mismo volumen (-16 LUFS), mp3 mono de 96 kbps. Mientras habla, la música
  baja a un tercio (`audio.js`, `voz` y `volMus`: cuenta en todo lo que pone el volumen de la música) y vuelve al acabar
  la frase; el público y los aplausos del partido, también (a 0,35: `pelota/audio.js`, su bus, con el evento
  `herrizherri-voz`, porque el partido suena con otro contexto). Los aplausos de después de un tanto tapaban la frase
  que lo comenta. Si una frase no avisa de su final (el iPhone para el sonido al ir la app de fondo), se da por acabada
  a su tiempo: antes la voz se quedaba «hablando» y no se oía ninguna más. Grabadas: las 63 frases de la voz de hombre en castellano (el autor, noviembre de 2026); faltan el
  euskera, el kantari y la voz de mujer, que mientras tanto usan esa misma grabación. Un solo comentarista, con la voz
  del autor tal cual: narra (las frases «n») y explica la jugada (las «e»). La segunda voz que se sacó de la misma
  grabación, más grave y con el timbre cambiado, sonaba robótica y se quitó (noviembre de 2026): solo la voz grabada.
- **Repetición desde el pelotari** (`pelota/match.js`, `startReplay`, `stepReplay`): de cada cinco repeticiones, una se
  ve por detrás del hombro del que gana el tanto, mirando la pelota, con el rótulo «Desde Xabier» («Ikuspegia: Xabier»).
  Lo grabado va en coordenadas del mundo y la cámara en las del frontón (`worldToLocal`). En vertical, más atrás y más
  alta, para que el pelotari no tape media pantalla. Las otras cuatro, los planos de siempre.
- **Las cámaras del partido** (`pelota/match.js`, `PLANOS`, `ponPlano`, `plano`; `herrizherri-pelota-plano`): tres a
  elegir en Más opciones (un grupo de tres, «Cámara», junto a los interruptores), en el menú del partido («Cámara:
  General», que cambia a la siguiente sin cerrar el menú; `pelota/hud.js`, `pm-plano`) o con la tecla C. La general,
  alta y por detrás como en la tele; la fija clásica (`camFija`), alta, centrada y quieta; y detrás de ti, a la altura
  del hombro de tu pelotari y algo a su derecha para que no tape el frontis, mirando al frontis y un poco hacia la
  pelota, que retrocede y sube un poco si la pelota se va al fondo. Los planos de después del tanto y el del saque del
  rival siguen con la cámara dinámica. Antes la fija era un interruptor aparte (`herrizherri-pelota-camfija` se sigue
  leyendo la primera vez).
- **Cartas al estilo de los juegos de fútbol, en morados** (`ui/sportCard.js`, `ui/sport.css`; `pelota/rules.js`,
  `cartaTier` y `pelotariRating`): el color de la carta va por la media, como allí, pero en la gama de morados: bronce
  (lila apagado, hasta 64), plata (lila claro, 65-74), oro (violeta con las cifras en el oro del juego, 75-84) y especial
  (casi negra, borde fucsia y halo, 85 o más). El equipo, azul o colorado, en la franja de arriba y en el puesto. Seis
  cualidades (velocidad, potencia, manos, remate, defensa y fondo; las tres últimas salen de las otras y del nombre) en
  dos filas de tres («73 VEL») cuando la carta mide 150 px o más (`@container`); en las estrechas, las tres de siempre. La
  figura va a la derecha, en dos tercios del ancho, para que la media y el puesto no le pisen el brazo. Abajo, en la placa
  (`.gx-pie`, en columna): el nombre, el pueblo con su hueco y las cifras pegadas al pie; antes iba cada uno a una altura
  fija y, en una carta pequeña, el pueblo caía sobre la raya del nombre y las cifras sobre el pueblo. Por debajo de 136 px
  no cabe el pueblo y va solo el nombre (sale en su ficha); las de por descubrir no llevan cifras, que serían rayas, y sí
  el pueblo, que dice dónde encontrarlas, con el candado bajo el «?» (`game/pelotaris.js`, `.pc-lock`).
- **Pelotaris con color limpio y público más nítido** (`src/assets/meshy*/pelotari*.glb`; `actors/crowdSprites.js`,
  `TAM`; `actors/crowd3d.js`, `PUNTOS`): la textura de Meshy de los pelotaris iba a parches (dos rojos y un cuadriculado
  en la camiseta, manchas grises en el pantalón) y se veían «a trozos». Se ha limpiado zona a zona: camiseta de un solo
  color, algo más viva, pantalón blanco limpio y un poco más de color en todo; en los tres tamaños del modelo, y pesan la
  mitad. El guion que lo hace está fuera del repositorio; para otro personaje, hay que ajustar los tonos de cada zona.
  El público lejano, en láminas de 120 × 180 en calidad media y 144 × 216 en alta (antes, 96 × 144 en todas: se veía
  borroso); el cercano toma su color de la media de cinco puntos de la textura, no de uno, y ya no sale a manchas.
- **Jueces del frontón** (`game/fronton.js`, `makeJueces`; `actors/npcGlb.js`, `meshyFor` con `juez`): tres en la
  contracancha, a la altura de la chapa, del 4 y del 7. Son una persona normal, el chico del polo y el pantalón corto,
  con los dos teñidos de negro (`npcOutfit.js`), sin más: ni boina ni pañuelo ni los tacos del pelotari. En cada fallo
  (chapa, fuera, falta, pasa…) el que lo ve levanta el brazo derecho bien alto unos 2 s (`senalaJuez`, `brazoJuez`: cada
  hueso del brazo se gira para apuntar arriba encima de la animación; antes saludaba con la mano). El negro se pinta con su propia zona (`osasuna_juez` en `npcOutfit.js`): también el rojo de los bordes, de las
  sombras, de las medias y de las zapatillas, que antes quedaba en motas sobre el negro.
- **La afición de los partidos de pelota** (`actors/crowdSprites.js`, conjunto `aficion`, `nFigs`; `actors/crowd3d.js`,
  `camisetaAzul`, `group.cheer(on, lado, len)`; `game/fronton.js` y `game/pasaka3d.js`): chicos y chicas con el polo de
  su bando, colorado o azul, y pantalón oscuro, para no confundirse con los pelotaris, que van de blanco. Son cuatro
  figuras: el chico del polo (`osasuna`, versión ligera) y la chica hecha sobre él (`chicas.js`, versión ligera con
  coleta, que ahora va en el juego), cada uno de colorado y de azul. El azul se pinta al cocinar la figura: lo colorado
  de los triángulos entre la cadera y el cuello pasa a azul en una copia de la textura, sin tocar labios ni botas. El
  pelo de las chicas va en un segundo grupo de la misma malla, con su color en los vértices. Sentados, en cada tanto
  se levantan casi todos los de la camiseta del que lo gana y alguno del otro, cada uno con su retraso, y se vuelven a
  sentar; al salir los pelotaris, muchos de los dos. Sin pañuelos: iban a la altura del sentado. Gradas llenas en
  todos los partidos (`game/fronton.js`): la del pueblo siempre; el cubierto, 300 en el móvil y lleno en los demás; el
  Labrit, 400, 900 o lleno; la calle, 250, 400 o llena; 160 en el móvil más justo. Con 300 en el cubierto del móvil, el
  partido ronda los 670.000 triángulos (el tope es 760.000). Los 24 más cercanos, con la figura entera y su textura (8
  en el más justo); todos los demás, con su retrato (`retratos`, `retratoMat`): cada figura, en cada pose, se dibuja una
  vez con su textura vista desde siete ángulos (de -90° a 90°, de 30 en 30) en una textura propia, y en la grada cada
  espectador es un rectángulo que mira a la cámara con el retrato del ángulo desde el que se le ve, con la misma luz que
  los de cerca. Dos triángulos por espectador: el Labrit lleno del móvil pasa de 750.000 triángulos a 515.000. Se dibujan
  de figura en figura, una por imagen (en el iPhone, subir todas las texturas de golpe hacía perder la imagen), y la
  textura de los retratos se guarda para los partidos siguientes (`userData.shared`). Antes, los de en medio eran la figura
  simplificada con el color de cada parte en los vértices: sin ojos ni boca, como a medio cargar (noviembre de 2026). Las
  figuras de Meshy llevan la textura troceada en miles de piezas, así que al quitarles triángulos no se puede llevar la
  textura (ni juntando vértices ni con meshoptimizer: se quedaban casi igual). Si no hay tarjeta para dibujar los
  retratos, siguen las figuras simplificadas (`lejos`). Antes eran vecinos de fiesta, de pastor y de calle que celebraban
  sin levantarse.
- **Cambios de ritmo al correr** (`pelota/game.js`, `movePlayers`, `ritmo` y `sprint` de cada pelotari; `driveAI`):
  colocándose, al trote; si la pelota es tuya y a tu paso no llegas, esprint automático, con arrancada: hacia delante a
  por una dejada o una corta (×1,42) y hacia atrás si se va al fondo (×1,3). El rival también arranca a por las cortas y
  corre atrás a por las largas. El esprint gasta algo de energía propio, pero no cuenta como correr más (se mira la
  velocidad sin él): con el esprint automático la barra se vaciaba a medio partido. Al esprintar, la cámara dinámica
  abre un poco el plano (`sprintK` en `pelota/match.js`).
- **Duración de los partidos** (`pelota/rules.js`, `DURACIONES`, `duracionElegida`, `tantosDe`; en «Más opciones» del
  partido, `pelota/match.js`; `herrizherri-pelota-duracion`): rápido, normal (la de serie), largo o profesional, a 22
  tantos. Los torneos, el partido libre y la misión se escribieron a 5-9 tantos y se alargan según la duración, sin pasar
  de 22 (`game/fronton.js`, `playPelota`, guarda la base en `tBase`); los resultados de los demás partidos del torneo y lo
  que se lee en los cuadros, igual (`game/torneo.js`). Normal: el libre a 12, la final de un torneo de 16 a 22.
- **Marcador del frontón a la derecha del frontis** (`pelota/court.js`, `bigBoard`, `setScore`): como en los frontones de
  verdad, pegado a la pared y sin postes, con dos filas (azules arriba, colorados abajo) en los morados del juego. En los
  de la calle, el frontis sigue 3,8 m sobre la contracancha, sin raya y con el revoco o la piedra de fuera
  (`frontis-contracancha`, con su caja de colisión `frontisExt`), y el marcador va en ese trozo; la pelota que da ahí
  es «lado». En los cubiertos, en la pared de delante de la contracancha. Antes estaba encima del frontis y luego en dos
  postes. En el Labrit no sale: allí está su pantalla de la pared derecha.
- **La raya de arriba de la pared izquierda** (`pelota/court.js`, `raya-izquierda`): una tira de verdad pegada a la
  pared, del color de las rayas del frontón; por encima, la pelota es mala. Pintada en la textura de la pared, de 34,5 m de
  largo y vista muy de lado, a lo lejos se emborronaba hasta desaparecer. Las texturas de la cancha (`canvasTex`) van con
  todo el filtrado que da la tarjeta (anisotropía hasta 16, antes 4).
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
- **Casas de las maquetas en orden** (`casasMaqueta` y `ordenaMaqueta` en `hub/maqueta.js`, noviembre de 2026): el mismo
  orden que dentro del pueblo (`levels/ordenar.js`). Las filas y manzanas que los datos traen como un solo edificio se
  parten en casas de unos 9 m con la fachada a la calle (`partirBloques`); dentro de las manzanas, anexos bajos de unos
  8 m con huecos de patio hasta lo que de verdad está construido, fuera de parques, plazas y huertas. Luego
  `ordenarCasasPasos`: las casas siguen la calle si casi lo hacen, dejan libres calle, plaza, puente y río, y dos que se
  pisan quedan pared con pared. Antes, en Tafalla una de cada tres casas pisaba la calle y en Tudela y Pamplona cientos
  se montaban; ahora ninguna o casi. Va por pasos de 60 casas antes de pintar el suelo de la maqueta (`mapa3d.js
  pasoMaqueta`): en Pamplona, todo de una vez era un cuarto de segundo con la imagen parada. Los ríos van en tramos de
  12 puntos y las plazas con su caja, para que no cueste comparar cada casa con todo el río o todas las plazas.
- **Anexos dentro de las manzanas** (`anexosManzana` en `levels/ordenar.js`, para el juego y la maqueta): donde
  `partirBloques` deja una manzana con casas solo a la calle, dentro van anexos bajos de unos 8 m (corrales, almacenes)
  con huecos de patio, hasta lo que de verdad está construido; no en parques, plazas, huertas ni campos. En el juego son
  casetas de piedra, revoco o ladrillo con teja (`world/townReal.js realHouses`), con su propio tope (`AMAX`: 320, 420 o
  520 según la calidad) y sin contar para el de casas, `NMAX`; se levantan hasta donde llegan las casas sencillas. Con su
  propio azar, de la posición o del nombre del pueblo, para que el resto del pueblo salga igual. Antes, en Tafalla, el
  interior de casi todas las manzanas era un prado.
- **Aire rural y medieval en pueblos y ciudades** (noviembre de 2026): en el casco, entre las casas, tierra apisonada
  con matas de hierba en vez de césped de jardín (`SURF.tierra` en `world/heightfield.js`; solo para pintar el suelo en
  `world/terrain.js`: el mapa y los pasos no lo leen como camino; los prados, huertas y campos de los datos siguen
  verdes). Sin canalones ni bajantes de cinc ni la placa azul del número (`world/houses.js`, `world/civic.js`);
  carpintería de madera oscura y cristal gris oscuro en vez de azul. Faroles de forja (`farol` en `world/village.js`):
  colgados de un brazo con tornapunta en la fachada más cercana si hay una a menos de 2,4 m, y si no en un poste fino
  sobre basa de piedra; en Pamplona, candelabros de forja con tres faroles en vez de farolas de globos. Casas de tres
  plantas y desván como mucho, cuatro en la ciudad; más portales de arco. Fuera del casco, graneros y almacenes de
  piedra o ladrillo con teja, portón de tablas y ventanucos, en vez de naves de chapa crema; los colegios, con
  contraventanas. Las tiendas de Pamplona, con tablero de madera y vidrio en cuarterones, y sus casas algo más bajas.
- **Parpadeos de paredes en el iPhone** (noviembre de 2026, vídeo de Roncesvalles): en las casas en cuesta, la base de
  piedra (`slopeBase` en `world/plot.js`) iba justo en el plano del zócalo de la casa y los dos se turnaban a trozos en
  cada imagen; ahora va 9 cm por fuera de la pared, 3 más que el zócalo, y con la piedra a la escala de las paredes (antes
  la textura iba estirada a toda la cara, con piedras gigantes). Del lado pegado a otra casa, el zócalo va 2 cm por dentro
  de la pared en vez de a ras. Y `realHouses` ya no levanta la casa de los datos que es la iglesia del juego (San
  Saturnino de Artajona va en ellos como casa y salía con la iglesia metida dentro) ni las que caen dentro de un
  monumento ya levantado con caja de choque grande.
- **Más detalle en las texturas** (noviembre de 2026; mismas medidas, sin más memoria): la mampostería, la sillería, la
  teja, la pizarra y el empedrado con el relieve picado de grano fino (`picado` en `world/textures.js`), verdín y musgo
  en las juntas y en el borde de las tejas; la madera con clavos de forja y vetas grises. En las paredes (`weather` en
  `world/builder.js`): desconchones del revoco repartidos por el mundo, con la mampostería de verdad a la vista (la misma
  textura de piedra, `tPiedra`, sin gastar más) y el canto de la
  cal, más abajo donde sube la humedad (en la textura se repetían cada 2,6 m); y de cerca, hasta 12 m, el relieve fino
  de la piedra y la cal con las derivadas de la pantalla, sin otra textura (en calidad baja, no).
- **Color de las casas del juego** (`world/textures.js`, `world/builder.js weather`, `world/sky.js`): piedra arenisca y
  parda con más color, sillería dorada, cal crema, teja de barro cocido algo más viva y pizarra gris parda en vez de gris
  azul. Las paredes (los materiales con `weather`) llevan de día una luz de rebote cálida con su propio color y un punto
  de calidez (`uDia`, que `engine/runtime.js` pone a 1 − noche en cada imagen; de noche, nada). De día, la luz del cielo
  algo menos azul y la del suelo, de tierra. Antes, a la sombra, la cal y la piedra salían grises azuladas.
- **Rótulos de las maquetas** (`rotulosMaqueta` en `hub/maqueta.js`; revisados pueblo a pueblo en noviembre de 2026):
  solo edificios y puentes con su nombre en OpenStreetMap, encima de su propio tejado. Antes salían de los lugares de
  Overture, que son sobre todo negocios con el punto en su dirección o en el centro del pueblo: el «Mirador de los
  Buitres» de Irurtzun flotaba sobre las casas, el castillo de Olite y la basílica del Puy salían dos veces. Fuera los
  nombres de negocios, servicios y calles aunque digan «iglesia» o «puente», los que solo dicen qué son («Convento»), los
  que nombran el pueblo («Base de Puente la Reina»), las pasarelas cortas y los mal escritos en el dato; el mismo sitio
  con dos nombres, en castellano y en euskera, una vez. Como mucho seis, de lo más importante a lo demás. Los núcleos de
  los pueblos guardan cuándo se vieron en `visto`, no en `t`, que es el pueblo: antes la hora lo pisaba y la maqueta no
  sabía de qué pueblo era, así que no tenía la iglesia de su ficha.
- **Los montes** (revisados uno a uno en noviembre de 2026): cada cima de `data/mountains.json` comparada con su cima de
  OpenStreetMap (de Overture, `tools/relieve/cimas-overture.py`) y con el relieve de verdad (AWS Terrain Tiles, nivel 13).
  24 tenían el punto lejos de su cumbre, hasta casi 6 km (Goñiburu, Astobizkar, Otanarte, Berrendi, Baigura,
  Lapazarra…), y se han llevado a la cima; Adi y Burdindogi, a la comarca donde caen. Bonbagaina va con `dudoso`: en OSM no
  hay cima con ese nombre; su punto, que caía en un valle, va ahora a la cima sin nombre de unos 1.175 m que hay a 800 m
  del collado de San Francisco (San Frantzisko lepoa, de donde sale su ruta), al este de Hiriberri, como dice su ficha;
  no sale en el mapa, ni en los miradores ni en el horizonte hasta confirmarlo. Con los puntos nuevos se ha vuelto a calcular `data/relieve.js` (`tools/relieve/perfiles.py`): cambian los
  montes que se ven desde los miradores de Lekunberri, Orreaga e Irulegi. En el mapa del inicio (`mapa3d.js`, `PK`), cada
  monte en su cima con su nombre y su altura, con la comarca elegida o muy de cerca; si no cabe encima, debajo, y si
  tampoco, solo el triángulo. En las comarcas con pocos montes en la colección, además, sus cimas de OSM que más destacan
  sobre su entorno (`data/montes-mapa.js`, de `tools/relieve/montes-mapa.mjs`), dentro de Navarra con un kilómetro de margen.
- **La iglesia del juego en su edificio** (`data/reales/iglesia.js`, `iglesiaReal`): la que nombra la ficha del pueblo,
  buscada por las palabras propias de su nombre (el santo o la advocación, en castellano o en euskera: «Done Mikel eliza»
  es la de San Miguel). La usan la misión de la iglesia (`levels/townReal.js`) y el rótulo de la maqueta. Antes iba en la
  iglesia más grande cerca del centro, y en Tudela, Olite, Estella y Puente la Reina era otra. Si no está en los datos,
  queda la de los datos con su propio nombre en el rótulo. También vale el edificio que solo lleva el nombre del santo, aunque
  el dato lo tenga por casa, si tiene todas las palabras de la ficha: «San Saturnino» en el Cerco de Artajona (y la muralla
  del Cerco, en anillo alrededor de ella), «San Esteban» en lo alto de Erronkari. Los monumentos de la ficha ya no se ponen
  encima de la iglesia, y lo que va junto a ella (ermitas, estelas, la tumba de César Borgia en Viana) se busca a su lado y
  no junto al centro del pueblo.
- **Monumentos con su punto de verdad** (`real: [lat, lon]` en la ficha; los yacimientos de `data/yacimientos.js` lo
  llevan solos): si cae dentro del mapa del pueblo, ahí; si no, en el borde del casco en la línea hacia donde está (los del
  río, en su orilla), para que el mapa y la brújula señalen su dirección de verdad. La Fuente del vino, a la salida de
  Estella hacia Irache, y no en la plaza; la Foz y el Puente del Diablo, al sur de Lumbier, en la orilla.
- **Frontón y pista sin caminos debajo**: el frontón de los datos se mueve hasta 24 m si así no pisa ninguna calle; la pista
  busca primero un sitio sin caminos a menos de 230 m, luego hasta 320 m, y solo si no lo hay acepta pisar alguno. Si así
  no cabe en ningún sitio, otra vez sin contar los árboles ni las matas (`rectFree(…, sinArboles)`), que la pista y el
  frontón quitan al levantarse (`clearTrees` y `clearBushes`, en `world/nature.js`): en Viana, una mata la dejaba sin pista.
  Los caminos se miran también bajo la rampa de entrada de la pista, y cada 2 m si parece libre. En Aribe, Ituren y Viana
  no hay ningún hueco llano sin camino, y la pista pisa un poco uno (en Viana, también el frontón, que está donde el real).
  La feria de ganado, si no hay prado despejado, busca hasta 320 m uno con árboles y los quita (antes, sin prado, los
  corrales iban junto al tratante y en Lumbier caían encima de una casa). Los árboles del casco no crecen en escalones ni
  escalinatas (`onPlatform(…, true)`): en Lumbier un roble salía en los escalones de la iglesia.
- **Irulegi es Lakidain** (noviembre de 2026): la ficha es la de Lakidain, al pie del monte Irulegi, pero su trazado se
  había sacado alrededor de Ilundáin, 1 km al suroeste, y salía la iglesia de San Juan Evangelista. `data/reales/irulegi.json`
  se ha vuelto a sacar centrado en Lakidain (`tools/pueblo-real.py` y `tools/pueblo-real-juego.py`, misma versión de
  Overture que los demás) y su iglesia es ya la de San Martín de Tours; `centros.js` lo sigue (`tools/reales-centros.py`, que
  ahora se salta los JSON que no son un pueblo). El yacimiento, el castillo y el poblado van hacia la cima del monte Irulegi
  (42,7794 −1,5134, OSM), al este; antes el punto del yacimiento caía al oeste.
- **Color y texturas de la maqueta y del relieve** (`hub/maqueta.js`, `hub/emblemas.js`, `hub/mapa3d.js` y
  `hub/mapa3dSombreadores.js`):
  - Los colores de las casas van en sRGB, como se ven (`PAL`, `PIZARRA`, `NAVE`, `BALCON`): por tierra, la cal
    (crema en el norte, ocre en la Zona Media), la piedra (arenisca o parda), el ladrillo de la Ribera y la teja de barro
    cocido; la pizarra del Pirineo, gris pardo. Antes iban en HSL lineal (`setHSL` es lineal: 0,75 ya se ve casi blanco)
    y con poco color, y con la luz malva salían frías: blanco gris, piedra lila y tejas rosa salmón. Cada casa toma un
    tono de su lista y un punto de luz propio; alguna teja nueva, más viva. El hastial lleva el color de su propia pared
    (atributo `aPared` de cada instancia), las contraventanas son pardas, verdes o rojo almagre de verdad y el musgo de
    los tejados, verde oscuro. Iglesias, torres, palacios y monumentos, de la piedra de su tierra.
  - La luz malva del cielo del mapa se corrige en la maqueta con un punto de calidez al final del sombreador.
  - A media distancia, una franja más oscura por piso en las fachadas, para leer la altura de cada casa.
  - En el suelo pintado de la maqueta, los adoquines y las losas solo si sus juntas caben en el lienzo; si no, piedra a
    motas. Los ríos, con orilla oscura y un brillo en el centro.
  - En el relieve de la comarca, las parcelas sin rejilla de tablero: hileras corridas al azar y parcelas partidas en
    una, dos o tres tiras. Las laderas en sombra, sin llegar al negro. Los árboles de la comarca, con algo de luz
    propia, para que no salgan como motas negras.
- **El dron de cada pueblo en el mapa del inicio** (`hub/mapa3d.js`, `perfilDron`, `holgura`, `despeje`):
  - Una vuelta en tres minutos, y todos sus vaivenes son múltiplos de esa vuelta (`DRON_W`): cada vuelta es igual a la
    anterior. El vuelo hasta el pueblo dura al menos 4,2 s desde toda Navarra, no 2,6.
  - Todos los vuelos siguen el camino de van Wijk y Nuij (`camino`, el de `d3.interpolateZoom`): lo que corre el suelo, en
    proporción a lo lejos que está la cámara, va igual de suave todo el camino. Para ir lejos (de Isaba a Tudela) sube,
    cruza por alto mirando más desde arriba y baja; para acercarse, se centra mientras aún está alta. El tiempo sale de lo
    largo del camino, hasta 5,4 s, con una curva sin tirones ni en la velocidad ni en la aceleración. El giro, el más
    corto, y siempre entre -π y π (`normaYaw`): con el dron crecía sin parar y la cámara daba vueltas al volver.
    Antes el sitio y la distancia se mezclaban cada uno por su lado y, a ras de tejado, el suelo salía disparado de lado:
    el golpe de cámara de noviembre de 2026. Los vuelos que no pasan por `volar` (el de abrir el mapa) hacen su camino
    en la primera imagen.
  - La cámara va con la comarca que tiene debajo (`hRef`): si esta sube o baja, al elegir otra o al volver a toda
    Navarra, la cámara se mueve con ella en la misma imagen. Por eso la cámara se calcula después de las comarcas. Con
    la cámara muy cerca, las comarcas suben y bajan más despacio (`velC`). Antes la de debajo bajaba de golpe más de
    cinco veces lo que la cámara estaba de cerca, y la cámara la seguía después.
  - Si las casas del pueblo llegan a medio vuelo, el final del vuelo se corre hasta ellas sin tirón (un muelle
    amortiguado, `dron.vx`), y la inclinación pasa en 2 s a la calculada allí (`dron.antes`, `mezP`). El dron arranca en
    6 s con su giro cogiendo velocidad (`DRON_T`), y su inclinación va por una curva suave entre los puntos del perfil
    (`enPerfil`). Sobre un sitio, la altura a la que mira es la de su comarca, aunque el vaivén se asome a la de al lado.
  - `despeje` sube deprisa pero sin salto, nunca a menos de media holgura. El dron y el paseo van a todas las imágenes,
    sin el tope de 30. Los programas de la maqueta se compilan al tocar una comarca o un pueblo, no a medio vuelo, y la
    maqueta se hace en pasos más cortos (tandas de casas, la imagen a la tarjeta gráfica en un paso aparte).
  - Los tirones al llegar a cada pueblo eran, sobre todo, parones de la tarjeta gráfica la primera vez que pintaba algo a
    media bajada: los pájaros y su sombra al aparecer (casi un segundo en el navegador de pruebas) y las casas de la
    maqueta al levantarse. Ahora `calienta`, al tocar una comarca o un pueblo, pinta una vez los pájaros invisibles
    (`aves.estrena`, a escala cero) y compila también el material de los lugares emblemáticos; y las casas de la maqueta
    se pintan, aún transparentes, en la imagen siguiente a hacerse, al principio del vuelo. Si se añade algo que salga
    solo de cerca, hay que estrenarlo igual: si no, el parón vuelve justo al llegar.
  - Para medirlo, las pruebas de la carpeta de trabajo `golpe.mjs` (cada imagen y las aceleraciones de la cámara),
    `inicio.mjs` (el final del vuelo y el comienzo del dron, con lo que tarda cada imagen) y `lento49.mjs` (cada pieza
    que se pinta, cronometrada, para encontrar la que para la imagen). En el navegador de pruebas algunas imágenes llegan
    a destiempo y dan aceleraciones falsas: hay que mirar el paso de cada imagen, no solo la cifra.
  - Auditoría de los vuelos, uno tras otro (entrada, paseo, comarca, dos pueblos, espacio natural, vuelta a Navarra,
    paseo y arrastre), con el gancho `estado`: véase la prueba de la carpeta de trabajo `aereo.mjs` en las notas.
  - Antes de salir se prueba la vuelta entera, cada segundo y medio, y se guarda la inclinación justa para que la cámara
    no toque el relieve (`perfilDron`); se ensancha y se suaviza, para que suba antes de llegar al monte. Antes iba
    siempre a 0,5 y, en Lesaka, Leitza, Lekunberri, Orreaga o Ujué, la cámara saltaba hacia arriba de golpe.
  - `despeje`, en cada imagen, con la misma holgura, y además alrededor de la propia cámara, con el margen de su plano
    cercano: si no, cortaba la ladera de al lado y por el corte se veía el fondo negro.
  - Siempre con el pueblo a la vista: el dron va al corazón de sus casas (`centroCasas`: su centro, contando más las
    grandes, y luego solo las que quedan a menos de 350 m), no a la chincheta, y su vaivén es de unos 40 m. Antes era de
    170 m y en Aoiz el centro de la vista acababa en el prado, con el pueblo en una esquina. Si las casas llegan después
    de tocar el pueblo, el dron se corre despacio hasta ellas.
  - Los espacios naturales, sin maqueta, van en un arco, con la cámara del lado de dentro de su comarca y más desde
    arriba: desde fuera se veía la pared de la comarca y el fondo.
  - La niebla de lo lejano: de lejos, del color del fondo; de cerca, una bruma clara.
  - Para probarlo pueblo a pueblo, los ganchos de desarrollo `saltaVuelo`, `dronT`, `fija`, `despeje`, `sonda`, `centro`,
    `vista` y `estado` (en qué está la cámara: vuelo, dron, paseo, comarca y pueblo elegidos, maqueta, inercia y subida).
- **Navarra, que se distinga de lo de alrededor** (`hub/mapa3d.js`, el suelo de fuera y `contornoM`): el relieve de
  alrededor era del mismo verde y con la misma luz, y en la vista general Navarra no se distinguía.
  - Una máscara de Navarra (`NAV`: nítida en rojo y difuminada en verde, hecha dibujándola pequeña y agrandándola, sin
    filtros del lienzo) apaga lo de fuera, algo más frío, y pone una sombra suave junto al borde, por fuera. Del todo en
    la vista general (`FUERA`) y algo menos de cerca.
  - El contorno de fuera de Navarra: una cinta clara sobre el borde de las losas, con otra oscura debajo que la recorta,
    del mismo ancho en pantalla a cualquier distancia (`ANCHO_B`). Solo los tramos que no dan a otra comarca; va con su
    comarca al levantarse.
  - Entre comarcas, una junta oscura y, a cada lado, una franja del color de cada comarca que se apaga hacia dentro
    (`juntaM`, `bordeIn`), con el mismo ancho en pantalla: se ve dónde acaba una y empieza otra aunque sean del mismo
    verde. Los tramos se cuentan desde donde cambian (`tramos`), para no partir ni repetir uno que da la vuelta.
- **Relieve más nítido y con mejor color** (`hub/mapa3dSombreadores.js`): la imagen de relieve fino se perfila de cerca,
  cuando cada punto suyo ocupa más de un píxel; los colores apagados ganan algo de color, las sombras no llegan al negro
  y tiran a un azul malva, y las luces son algo más cálidas. En el móvil, la comarca elegida, con el relieve fino a 28 m.
- **Pájaros y agua que se mueve en el mapa del inicio** (`hub/pajaros.js`, `hub/mapa3d.js`, `hub/mapa3dSombreadores.js`):
  - Con un sitio elegido, sobre él: en los pueblos y ciudades, cigüeñas blancas y milanos pardos que planean en círculo
    sobre el corazón de sus casas; en los espacios naturales, buitres leonados y milanos, más altos y en círculos más
    anchos, a la escala de su cámara (`f`). Aletean a ratos y dejan su sombra en el suelo. Al cambiar de clase de sitio,
    primero se van las de antes y luego vienen las nuevas. Llegan despacio y se van deprisa. En la vista de toda Navarra
    y en la de una comarca, ninguno: las bandadas que cruzaban por ahí no gustaron.
  - Una sola malla repetida para todas las aves y otra para las sombras: dos dibujos, y ninguno sin pueblo elegido. El
    aleteo va en el sombreador. En el móvil, menos aves.
  - El agua: destellos que bajan por los ríos de la comarca, ondas en los embalses y en el mar, y ondas de unos 7 m en
    los ríos, balsas y piscinas pintados en el suelo de la maqueta. Estas últimas se reconocen por su color y se apagan
    de lejos, para que no titilen.
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
  pie asoman por el borde. Desde noviembre de 2026 no hay un carrusel por comarca: todos los pueblos van en una sola fila,
  comarca tras comarca, sin repetir ninguno, y al pasar el último de una comarca sigue el primero de la siguiente, con su
  pestaña encendida arriba y cada carta del color de la suya. Las pestañas (y ↑ ↓) saltan al primer pueblo de cada comarca:
  si está lejos, las cartas se apagan, se pasa y entran las de allí desde su lado, sin recorrer las de en medio. Solo se
  apaga la flecha en el primer pueblo de todos y en el último. Las portadas se piden al acercarse a la de delante y se
  sueltan al alejarse mucho (`foto` en `galeria.js`): con las 38 a la vez, el móvil se quedaba sin memoria. Antes, al
  llegar al último pueblo de una comarca había que volver arriba a elegir otra, y con menos de ocho pueblos se repetían.
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
  mapa y al otro la lista de las misiones del pueblo, minimalista: una línea por misión con su icono en el aro del color
  de su categoría, su nombre y lo lejos que está; lo que toca hacer, solo en la que sigues, que va encendida (primero las
  que faltan). Las pestañas Misiones y Lugares hacen de cabecera, con lo hecho dentro de la de misiones; sin recuadros por
  fila ni «!» (eso lo dice el mapa). Un nombre largo pasa a la segunda línea con la misma letra. Al tocar una, pasa a ser la que sigues,
  el mapa va a ella y sale su ficha con el botón para ir. En el mapa, las marcas de misión llevan su icono y su color (como
  las casillas de arriba y el minimapa), con su «!» si no está empezada y la marca verde sobre amarillo si está hecha, y el
  camino hasta lo que sigues va en una línea rosa a trazos por calles y caminos (`nav.findPath`, se rehace al moverse 4 m).
  El encuadre del principio incluye el objetivo. En vertical, la lista va debajo del mapa; en el móvil tumbado, sin
  leyenda (la lista ya lo dice).
  El dibujo del mapa (`ui/mapvector.js`, `tesela`; `mapview.js`): cada campo lleva el dibujo de su cultivo encima de su
  color (briznas de prado, hileras de heno y cereal, surcos de tierra labrada, filas de viña y huerta, marco de olivos y
  frutales), el bosque copas, el agua ondas, la roca motas y las calles empedrado con el borde marcado; las teselas se
  pintan siempre al mismo tamaño en pantalla. Las casas, con su sombra abajo a la derecha, una vertiente con luz y otra en
  sombra, el caballete por el lado largo y un tono distinto cada una (en el Pirineo, la mitad de pizarra); los árboles,
  también con sombra. Abajo a la izquierda, el norte encima de la regla. En el móvil tumbado, el encuadre y los nombres
  dejan sitio al título, que va encima del mapa.
- **Geometría más ligera** (octubre de 2026): el suelo (`terrain.js`, `empaca`) guarda la normal, las superficies y el
  color en bytes (el color como raíz cuadrada, que el sombreador eleva al cuadrado; así los verdes oscuros no hacen
  escalones): de 56 a 28 bytes por vértice, 18 a 11 MB en Estella. Los animales (`animalGlb.js`, `aligera`) juntan los
  vértices repetidos que dejaban las aristas marcadas (`mergeVertices`, solo los iguales en todo: el sombreado no cambia) y
  guardan pesos, huesos y normales en bytes: de unos 8 a 1,6 MB (el más grande, de 33 300 a 7 300 vértices). Las casas
  (`builder.js`) ya iban en bytes; ahora normal y color van de cuatro en cuatro bytes, como quiere la tarjeta del iPhone
  (con tres, el navegador los convertía por su cuenta). En calidad baja, el prado recupera sus rodales de 20 m con un canal
  de una lectura que ya se hacía.
- **Paseo de dron por Navarra en el inicio** (`hub/mapa3d.js`, `sigueDronNavarra` y `rutaDron`): con el mapa quieto 10 s
  (la primera vez, 3 s) y nada elegido, la cámara pasa de la vista de toda Navarra a un vuelo más cerca y más inclinado
  que la recorre por el medio, por los centros de las comarcas, del Baztan y el Pirineo a la Ribera y vuelta (unos 42 s
  cada sentido), meciéndose un poco. Se para con cualquier toque, tecla o rueda y al elegir una comarca o un pueblo, y se
  queda donde está. Sin paseo con «menos movimiento» en el sistema ni en el navegador de las pruebas (salvo
  `window.__paseo`). Antes Navarra se veía entera pero pequeña encima de la tira de comarcas.
- **Navegación como el GPS de los juegos de mundo abierto** (`townGame.js`, `marcaDestino`, `objetivo` y `rutaGPS`;
  `ui.js`, `updateMinimap` y `lugaresMapa`; `mapview.js`): se toman sus costumbres, no su aspecto, que es el de Herrizherri.
  En el mapa, un toque en un sitio (o en un lugar) da la ficha con «Marcar destino»; la pestaña Lugares lista la iglesia,
  los monumentos, el frontón, la granja y los campos del más cerca al más lejos, y tocar uno lo marca. Con destino, la
  brújula, la luz dorada, la punta del anillo, la pastilla de la distancia y la ruta van allí en dorado, hasta llegar a 6 m
  (aviso «Has llegado») o quitarlo; sin destino, a lo que toca de la misión que sigues, en rosa. La ruta va por calles y
  caminos en el minimapa (se pide a la cola de caminos de los vecinos, `nav.requestPath`, otra si cambia el objetivo o te
  alejas 6 m, como mucho una por segundo) y en el mapa grande. Marcar o quitar el destino no cierra el mapa.
  La ficha de una misión en el mapa, con su único botón, es de una sola fila: icono, nombre y la flecha en un botón
  redondo rosa (`infocard.css`, con `:has`).
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
- **Menú de pelota en carrusel** (`pelotaMenu` en `game/torneo.js`, noviembre de 2026): las cinco losas (individual,
  parejas, cuatro y medio, partido libre y colección) del mismo ancho, en una fila que se desliza de lado con el dedo, la
  rueda del ratón o las flechas de los lados, que solo salen si hay más hacia ese lado. Tumbado se ven tres y media y de
  pie una y media, para que asome la siguiente; el ancho lo pone el menú (`--cw`) con el del carrusel. Antes se repartían
  el ancho con proporciones distintas y cada una salía de un tamaño.
- **Pantalla del torneo sin texto apilado** (`torneoPanel`, `ligaHtml` y `comoFunciona` en `game/torneo.js`, noviembre de
  2026): cada dato, una sola vez. La jornada va solo en el VS («Jornada 1», sin «de 3»); la liguilla son solo las tablas,
  sin el rótulo «Liguilla · jornada 1 de 3», sin «Los dos primeros de cada grupo, a cuartos» (la raya fucsia ya marca los
  que pasan) y sin la leyenda de debajo; con cuatro grupos, sin el puesto ni la columna J. Fuera también «Toca su carta
  para ver su ficha» y «Tus txapelas» (están en la losa del menú y en tu ficha); el frontón va solo, centrado. Lo quitado
  que explica algo (tocar la carta del rival, qué son G, J y ±) pasa a «?», que ahora es una ventanita debajo de la
  cabecera que se cierra al tocarla (antes era una fila más al pie y se montaba encima de las tablas). Las tablas ocupan
  todo el alto junto al partido; Salir y ¡A jugar! van siempre en una fila; en el móvil tumbado pequeño las rondas del
  cuadro van en una palabra («Cuartos», «Semis») y el cuadro de dieciséis, algo más junto, cabe entero en 844×390.
- **Pantallas de pelota y fútbol como un juego de deportes** (`torneoPanel` en `game/torneo.js`; `ligaPanel`, `roundPanel` y
  `clubPanel` en `futbol/liga.js`; noviembre de 2026): tres franjas. La cabecera; dos paneles (`.lg-pn`) con su rótulo
  (`.lg-ph`: el nombre en pequeño y una chapa `.lg-chip` con el dato, la jornada o el grupo), el partido y la clasificación;
  y abajo, de lado a lado, la barra de acciones (`.lg-bar`): Salir a la izquierda y la acción principal a la derecha, con el
  frontón al lado en pelota. De pie, la barra va pegada abajo; en el móvil tumbado muy bajo (568 × 320) la tarjeta se
  desplaza con la barra pegada. En el fútbol, debajo de la media de cada club, su racha (`racha`: los cinco últimos
  partidos, G, E o P en cuadritos de color; en euskera I, B, G) y la explicación y el aviso de los nombres de los equipos,
  detrás de «?» (`ayuda`). Las losas del menú del club, todas del mismo ancho (antes la de la liga, 1,3 veces); de pie, en
  carrusel. Las cartas de jugador (`ui/sport.css`, `.gx-face::before`) llevan una placa oscura detrás del nombre, el pueblo
  y las cualidades: en la carta rosa del rival, el pueblo y las siglas iban rosa claro sobre rosa, con un contraste de 2 a 1.
- **Parpadeo de las paredes de cerca** (`weather` en `world/builder.js`): fuera el relieve fino calculado con las derivadas de
  la pantalla (`dFdx`/`dFdy` del ruido): cambiaba de un grupo de cuatro píxeles al siguiente con cualquier movimiento de la
  cámara y todas las paredes de cerca centelleaban. El borde de los desconchones del revoco, suavizado con `fwidth`. Medido
  con un detector (dibujar la vista, mover la cámara 2 mm y comparar): en una pared de Lesaka, de 781 bloques de 16 × 16 que
  cambiaban a 42 (el borde del pilar, que sí se mueve). En Elizondo, Isaba y Pamplona, a pie de calle y desde 45, 110 y 220 m,
  ningún parpadeo de profundidad; y en las maquetas del mapa de Lesaka, Olite, Tudela y Pamplona, tampoco.
- **Maquetas del mapa con más textura** (`haceMaqueta` en `hub/maqueta.js` y `materialEmblema` en `hub/emblemas.js`): las
  manchas del revoco, del musgo y de las tejas, con ruido suave interpolado (`vn`) y no en cuadrados de un tono; en la mitad
  de las casas del norte, la planta baja de piedra con su imposta; bajo el alero, los canecillos; bajo algunas ventanas,
  jardineras con geranios; los hastiales con su revoco, la sombra del alero y, en los grandes, un ventanuco; lo de encima de
  las paredes que asoma fuera del tejado, como un terrado de baldosa con su pretil; encima de murallas y baluartes, losas, y
  en lo alto de los muros altos, almenas; y los lugares emblemáticos, con hiladas de sillares y manchas en metros de verdad.
- **Movimiento en los menús y bordes suaves en las maquetas** (noviembre de 2026). Menús (`futbol/liga.js`, comunes a pelota):
  los paneles entran cada uno por su lado, la barra sube, las filas de las tablas y los resultados caen una tras otra, las
  chapas y los cuadritos de la racha saltan, los números grandes cuentan desde cero (`cuenta`), el VS late, las cartas y los
  jugadores del partido flotan despacio y las losas entran en cascada; con «reducir movimiento» del sistema, nada se mueve.
  Las animaciones de entrada de losas y botones van con `backwards`: con `both`, la última imagen pisaba el `transform` de
  `:hover` y `:active`. En el fútbol, debajo del partido, la comparativa (`.lg-cmp`): media y, con partidos jugados, puntos y
  goles, con barras que crecen; llena el hueco vacío que quedaba en el panel. En el torneo, las cartas tan grandes como deja
  su panel (ver «El torneo, sin nada cortado ni montado»). Maquetas (`hub/maqueta.js`): las paredes con las esquinas en chaflán de 60 cm de
  verdad (`cajaChaflan` y `aCh`, que el sombreador mete en metros sea cual sea la casa), las cumbreras algo vencidas en el
  centro (`VENCE`), los árboles que se mecen con el viento y el agua de las pilas con ondas (el reloj del mapa, `o.tiempo`).
- **Bordes suaves también en los pueblos del juego** (`boxChaflan`, `faldon`, `cumbrera` y `venceDe` en `world/builder.js`;
  `buildHouse`, `quoins` y los tejados a dos aguas en `world/houses.js`; `block` en `world/townReal.js`; noviembre de 2026):
  el cuerpo de las casas, con las esquinas libres en chaflán de 30 cm (`CHAFLAN`); las que dan contra otra casa, no, para
  no abrir una rendija entre las dos. El zócalo sigue el chaflán 6 cm por fuera y los esquinales de sillería, 2,5 cm por
  fuera, ya solo con sus caras de fuera (las de dentro quedaban metidas en el muro: ahora tienen la mitad de triángulos). Los
  faldones y la cumbrera de los tejados a dos aguas, en cuatro tramos, se vencen en el centro hasta 28 cm en vertical
  (`venceDe`: el 2 % del largo) y nada en los extremos, donde están los hastiales; el alero sigue recto. Los árboles ya se
  mecían con el viento y el agua ya tenía ondas en el juego. Presupuesto del iPhone: Lesaka 576.526 triángulos y 320
  llamadas; Pamplona 706.163 y 362.
- **Vuelta a los colores de siempre en los pueblos del juego** (noviembre de 2026): los cambios de «casas cálidas» y «más
  detalle en las texturas» dejaron los pueblos marrones y oscuros (Ochagavía, sobre todo), comparado vista a vista con la
  versión de antes (`ff4a50ba`). Vuelven a lo de antes: la luz del cielo y del suelo (`sky.js`); la hierba entre las casas
  del casco (`SURF.tierra`, en `heightfield.js`, queda a cero: la tierra apisonada llenaba el casco de pardo); la piedra
  gris, la sillería clara, la cal blanca, la pizarra gris azul y la teja (`textures.js`); el cristal gris azulado y las
  crucetas claras de las ventanas (casi negras, las ventanas parecían agujeros); y sin el rebote cálido ni el tinte de
  `weather` (`builder.js`). Se quedan, más suaves: el grano fino de la piedra y la teja, con apenas musgo; los desconchones
  del revoco, solo de vez en cuando. No se tocan el orden de las casas, los arcos, las farolas, los chaflanes ni el arreglo
  de los parpadeos. Regla: un cambio de color o de luz en los pueblos, siempre comparado con la vista de antes en un pueblo
  del norte (Ochagavía o Lesaka) y uno del sur.
- **Misiones del pueblo, solo los cuadrados** (`eligeMision`, `cierraMision` y `setQuestPueblo` en `ui.js`; `#tl` en
  `style.css`; noviembre de 2026): durante unos días la misión que sigues iba siempre abierta debajo de los cuadrados, y
  el autor pidió limpiar el visor. Ahora arriba a la izquierda solo quedan los cuadrados: la que sigues, con borde blanco.
  Al tocar uno, esa pasa a ser la que sigues y se despliega debajo; se recoge sola a los 10 s (`ABIERTA_MS`) o tocando
  otra vez su cuadrado, y tocando el texto se abre el cuaderno. Nunca se despliega sola: al cambiar lo que toca hacer,
  solo late su cuadrado y sale el aviso de abajo. En la aventura de Otsagabia, que tiene un solo icono redondo y no
  cuadrados, sigue a la vista el icono con lo que hay que hacer y las cintas: plegada, quedaba un icono suelto sin sentido.
- **Chinchetas en el mapa del inicio** (`mapa3dSombreadores.js`, `PIN_VS`, `PIN_FS`, `MIRA_FS`; `mapa3d.js`; noviembre de
  2026): los pueblos eran balizas holográficas cian con un cristal que giraba, y se confundían con los ríos, que son cian.
  Ahora cada pueblo es una chincheta quieta: una sombra en el suelo, un palito oscuro y una cabeza de cara a la cámara con
  el borde oscuro. Por descubrir, blanca con su punto morado; empezada, magenta con lo hecho en un arco; sellada, dorada
  con la marca verde. Las ciudades, más grandes y con diana; las zonas de naturaleza, con el punto verde. Los ríos no se
  tocan.
- **Identidad: esquinas redondeadas y filo de neón** (`src/ui/neon.css`, cargada por `hub/hub.js` después de
  `identidad.css`; noviembre de 2026): una sola regla para todo el juego. Toda tarjeta, card, bloque, panel, ventana y
  rótulo, en el menú, en los campeonatos, en el partido, en el fútbol y dentro del pueblo (el diálogo, el libro, el mapa,
  la mochila, la pausa, la tienda, la recompensa), lleva las esquinas redondeadas. El filo de neón, del color de su
  sección (`--cat`), bando o deporte (lila si no tiene; lo elegido, en rosa; lo bloqueado, apagado), solo donde hace
  falta: en lo que flota sobre el juego (paneles, ventanas, cajas del marcador y del HUD) y en las cartas que se eligen;
  lo de dentro de un panel ya enmarcado (bloques, filas, chips, contadores, campos, pestañas, botones) conserva su borde
  suave. Con filo en todo, dejaba de destacar y cargaba las ventanas (noviembre de 2026, a petición del autor). Sustituye
  a las esquinas cortadas en ángulo y a sus marcos dibujados (`ui/frames.js`, retirado): las 57 reglas con `clip-path`
  de corte pasaron a `border-radius` en su propia hoja. Siguen como formas, no como cajas, las cintas de premio, las dos
  mitades del VS y la silueta de las cartas de deporte: la de pelotari (`gx-card`) y las dos de Torneos (`sport`) llevan
  la de escudo de las cartas de los juegos de fútbol: arriba la corona, con las esquinas cóncavas, los hombros y un pico
  en medio; los lados rectos, y abajo la punta (`--fifa`). La saca `tools/silueta-carta.py`: las curvas, muestreadas en
  un `polygon()` (`path()` no se estira con la caja y `shape()` aún no lo tiene todo Safari), en tanto por ciento en la
  de pelotari y en píxeles desde los bordes y el centro en las de Torneos, que cambian de ancho y de alto. La de
  pelotari mide 1,48 de alto por cada 1 de ancho (`CARTA_ALTO`, `ui/sportCard.js`, con el que el torneo y la colección la
  encajan por su alto); lo de arriba va medido por su ancho y el pie acaba antes de la punta. Por dentro va como las de
  ejemplo que mandó el autor: a la izquierda, en columna, la media, el puesto, el arquetipo donde ellas llevan la bandera
  y el escudo del pueblo donde el del club (`escudoDe`: del nombre del pueblo a su nivel y a su blasón de
  `data/armas-navarra.js`; sin imagen, la columna va sin él); a la derecha, la figura de busto (`.gx-fig`, la imagen de
  cuerpo entero agrandada hasta que su mitad de arriba llena la caja); debajo, el nombre centrado con una raya y las seis
  cualidades en dos columnas de tres con una raya en medio; sin placa oscura, la carta se oscurece poco a poco hacia
  abajo. Un filo fino de dentro sigue la silueta (`.gx-lin`, `--marco`, un aro de 1 px en un `polygon()` con `evenodd`).
  El color de su bando va en una cinta que sigue la corona de lado a lado (`.gx-eq`, `--corona`, el mismo borde
  desplazado hacia dentro). Las de
  Torneos llevan más hueco arriba y abajo que a los lados, para que la lámina y la barra de jugar no toquen el filo. Su
  filo de 1 px sigue esa forma: un aro con degradado cónico que da la vuelta (`--neon-a`), recortado con la silueta, el
  relleno 1 px por dentro y la luz alrededor con una sombra que sigue la forma (`drop-shadow`). Al pasar a la identidad
  de neón se habían quedado en rectángulos redondeados: «no quiero que sea simplemente cuadrada»; la primera silueta, con
  las esquinas cortadas en ángulo, se quedó corta, y el autor mandó cartas de referencia (noviembre de 2026).
  El filo es de 1 px en todo (antes, 1,5 y 2 px: se comía el
  relleno). Tres maneras: el filo quieto, para casi todo, es un contorno (`outline`) de 1 px por dentro del borde, con un
  brillo de sombra: cae encima del borde fino que ya tenía la caja, así que no mueve nada de sitio ni quita aire al
  contenido, va encima de las imágenes que llegan al borde y no lo recorta la caja de fuera; las cajas que no tenían
  borde reciben uno transparente de 1 px, para que el filo tenga su propio píxel y el relleno siga igual (salvo las
  cartas que son marco de foto, cuyo relleno de 2 px es el marco); la forma va en tres listas
  (tarjetas y bloques, 8 px; paneles y ventanas, 10 px; rótulos pequeños, campos y chips, 6 px) y el filo en otra, la de
  las superficies y las cartas; una caja nueva entra en las que le tocan. En las tarjetas con el relleno en `::before` (la carta del menú),
  un cuadrado con degradado cónico que gira detrás del relleno y da la vuelta al borde (`::after`, solo transformación:
  lo mueve la tarjeta gráfica). En los rótulos del partido (el del tanto, el del comentarista, el de la repetición), un
  aro con máscara cuyo degradado da la vuelta (`--neon-a`, `@property`), y en las losas del menú de pelota, el propio
  borde con el degradado detrás del relleno. Con «menos movimiento», quieto. La auditoría de diseño lo vigila
  (`tools/auditoria-medida.mjs`: `esquina`, `neon` y `forma`).
- **La carta: una sola tarjeta para todo el menú** (`identidad.css`, al final; noviembre de 2026): las tarjetas de las
  listas iban en cajas de cristal con esquinas casi rectas, cada una a su manera, y no se parecían a las comarcas de abajo
  del mapa ni a las cartas de Torneos. Ahora todas tienen esa misma forma: las especies, los personajes y las figuras, las
  cimas, las insignias, los instrumentos, los escudos y su guía, los cuentos, los certificados y los comercios, las
  tradiciones, las leyendas de las fichas, las láminas y las páginas del pasaporte. Esquinas redondeadas de 8 px,
  un relleno morado opaco (`--carta-fondo`) y un filo de luz con el destello de neón (antes, dos esquinas cortadas en
  ángulo): el filo es el fondo de la tarjeta y el relleno va en `::before`, más adentro y con la esquina algo menor. Lo conseguido, con el filo del
  color de la sección (`--carta-filo-on`); lo bloqueado, apagado (`--carta-filo-off`); las cimas, con el color de su
  comarca. La imagen de arriba, dentro del filo y con sus esquinas de arriba redondas. «Observado» e «Identificada», con la marca
  verde en su círculo amarillo, como en todo el juego. Se cambia aquí, en un solo sitio, para todas.
- **Láminas animadas** (`src/ui/videos.js`, `public/videos/<id de la lámina>.mp4`, `tools/laminas-video.sh`; noviembre
  de 2026): el arranque, la pantalla de carga de los pueblos y del frontón y las cartas de Torneos llevan la misma lámina
  de siempre, pero moviéndose: nubes, agua, banderas, hojas y el explorador que respira y parpadea. Son vídeos de 5 o 6 s
  sin sonido hechos en Higgsfield con MiniMax H3 Max (768p, 12,5 créditos el de 5 s) a partir de la lámina original
  (`original/`, por su dirección en raw.githubusercontent.com), con la propia lámina de primer y último fotograma para
  que se repitan sin salto. El modelo devuelve 1344 × 768 recortando 13 px por lado de la de 1672 × 941;
  `laminas-video.sh` lo escala a 1260 × 720 y lo pone en x = 10 sobre la lámina web, así coincide al píxel con la fija,
  funde el último medio segundo con el primero y lo pasa a H.264 con faststart (CRF 29: de 0,4 a 1 MB cada uno). El
  `<video>` va encima de la lámina fija, con su mismo encuadre, y entra con un fundido cuando ya se mueve; al acabar la
  carga se para y suelta el archivo. Fuera de `assets/`: no entran en «descargar todo», ni en el archivo único ni en el
  artefacto, y el service worker no los guarda (Safari pide los vídeos por trozos). En el modo sencillo, con «reducir
  movimiento», con ahorro de datos, sin conexión o si fallan, queda la fija. El arranque (`#portada-app` en `index.html`)
  pone los Pirineos al 50 % detrás del icono, con su viñeta morada, y de ahí se pasa directamente al mapa: la lámina se
  queda hasta que el mapa del inicio está pintado (`window.__mapaListo`, en `mapa3d.js`, con el suelo y el sombreado
  llegados o a los 2,5 s) y se va con un fundido. La entrada de nubes del mapa (`INTRO`), que el autor veía «como humo»,
  está apagada (noviembre de 2026; con `window.__intro`, en las pruebas, sale aún). Las láminas sin vídeo siguen fijas: para añadir una,
  se genera igual, se pasa por `laminas-video.sh` y se apunta su id en `VIDEOS`.
  **Resolución ante todo** (regla del autor, noviembre de 2026: en el juego todo con la máxima resolución y definición; si
  un vídeo no la tiene, la imagen): `basta(el, w, h)` mira si un vídeo o una imagen de w × h tiene la definición de lo
  que ocupa en la pantalla, como `web/hd.js` (el ancho que pide según su encaje, por la densidad de la pantalla y por el
  zoom de las pantallas grandes, con un 2 % de holgura). `enMarcha` no pone el vídeo si se estiraría: la versión pequeña
  sube a la grande si esa basta y, si tampoco, se queda la lámina fija (`data-baja`); al cambiar el tamaño de la ventana se
  vuelve a mirar. Medido: a pantalla entera, el vídeo de 1280 × 720 solo sale hasta 1280 × 720 con densidad 1; en
  1366 × 768, 1920 × 1080, un portátil de densidad 2 o el móvil, la imagen. Las figuras animadas (384 × 576) igual: va la
  fija (la de 512, que `hd.js` sube a la de 1024 cuando hace falta) y la animada (`data-an`) solo la sustituye donde basta,
  y vuelve la fija si crece (`figura`, con un ResizeObserver).
  Las 12 comarcas también: en las tarjetas de abajo del mapa (`.m3-vid`, la versión pequeña de `public/videos/s/`, 640 ×
  360 y unos 120 KB) y en la cabecera de la ficha de la comarca y del pueblo (`.pt-vid` en `cabecera`, `laminas.js`), esta
  solo con la pantalla de pie, donde el vídeo cabe. Tumbada, la cabecera es mucho más ancha que el vídeo y va la fija de
  siempre, la panorámica o la lámina con sus bordes (antes, el vídeo con la lámina difuminada a los lados, que no gustó). `vigila(raiz)` (`videos.js`, desde `hub.show`) pone en
  marcha cada `<video data-vid>` solo mientras se ve: en la pantalla y sin nada encima (lo que hay en su centro es él o su
  tarjeta); `revisa()` lo vuelve a mirar al abrir o cerrar una sección o una ficha, así las tarjetas del mapa se paran
  debajo de la página de una comarca. Al quitar un vídeo, se para y suelta su archivo.
- **Figuras de jugador animadas** (`figuraAnimada` en `videos.js`, `pelotariFig`, `tools/figura-animada.sh`; noviembre de
  2026): la figura del pelotari, en su carta, respira, cambia el peso de pierna y parpadea. Se pone la figura del autor
  sobre un verde liso (768 × 1024, la figura en x = y = 128), se anima en Higgsfield (MiniMax H3 Max a 480p y 3:4, 7,5
  créditos, empezando y acabando en ella), y `figura-animada.sh` funde la vuelta, quita el verde con su halo, la recorta a
  su caja de 2:3 y la pasa a WebP animado con transparencia (320 × 480, 15 fps, unos 0,8 MB), que va como una imagen más
  donde iba la fija (`public/videos/figuras/<color>/<id>.webp`). La pantalla VS, tan grande, sigue con la fija de 1024. De
  momento solo Iñigo, de colorado y de azul; para otro, se genera igual y se apunta en `FIGURAS`.
  Desde el 8 de noviembre de 2026 los tienen los 22 de la plantilla, en las cartas y también en la pantalla VS, donde se
  enfrentan. Los otros 21, con Grok Video 1.5 Lite (1 crédito por segundo a 480p: 2 s cada uno, 42 créditos en total),
  que solo parte de la figura y no acaba en ella, así que el bucle es de ida y vuelta (`tools/figura-animada-ida.sh`: se
  vuelve hacia ti, parpadea y regresa); solo la roja: la azul sale de ella pasando a azul, fotograma a fotograma, el rojo
  saturado de la camiseta (`tools/figura-azul.cjs`; las figuras del autor solo cambian en eso). 320 × 480 a 12 fps, unos
  0,55 MB cada una, 25 MB las 44. En la pantalla VS del ordenador se ven algo más blandas que la fija de 1024.
  Estabilizadas desde el 8 de noviembre de 2026 (`tools/figura-estable.cjs`): esos vídeos se acercan poco a poco a la
  figura, que crece un 16 % en dos segundos; recortada siempre en el mismo sitio, se le salían la cabeza y los pies y se
  veía entrecortada. Ahora, en cada fotograma se mide la figura y se escala y se mueve al tamaño y al sitio del primero,
  que es la figura fija; el verde se quita a la resolución del vídeo con el borde suavizado (el vídeo guarda el color a
  media resolución y el recorte salía en escalera); salen a 384 × 576 y 15 fotogramas por segundo, de ida y vuelta, con la
  azul hecha en la misma pasada. En la pantalla VS, las animadas van sin sombras de filtro (`pf-an`): su halo y su sombra
  en el suelo van fijos en el fondo de la imagen, y el navegador ya no la repinta entera en cada fotograma.
- **Movimientos de pelota del pelotari** (`src/actors/pelotaMoves.js`; noviembre de 2026): Meshy solo traía correr,
  andar, un tajo y un puño en alto, y los recortes de ahí no parecían pelota. Ahora se hacen al cargar el modelo, sobre
  su esqueleto de Mixamo, a partir de poses clave: reposo, preparado, derecha e izquierda, sotamano de las dos manos,
  golpe de aire de las dos manos, saque, pasos laterales a los dos lados, celebrar, lamentar, saludar y hablar. Cada pose
  dice el giro de la cadera, la espalda, el cuello y la cabeza, dónde va cada mano (contada en el pecho en reposo, así el
  giro del cuerpo la lleva), hacia dónde el codo, el giro del antebrazo y dónde cada tobillo. Brazos y piernas se colocan
  con cinemática inversa de dos huesos: los pies no resbalan ni se meten en el suelo. Entre poses, curva suave, horneada
  a 30 por segundo; tarda unos 100 ms y no pesa nada en la descarga. Los de la izquierda salen en espejo. En el partido
  (`match.js`, `golpeDe` y `lateral`): el golpe se elige por la altura y el lado de la pelota al darle; mientras llega,
  `armSwing` mezcla la postura de armado de ese golpe, entera si está parado y de cintura para arriba si corre; el clip
  del golpe empieza en ese armado. De lado y a menos de 3 m/s, pasos laterales mirando al frontis en vez de andar de
  lado o darse la vuelta. El tanto perdido, las manos a la cabeza. Para verlos: el guion `movs-ver.mjs` pinta cada uno en
  sus poses clave, de frente y de lado.
- **El GLB del pelotari con sus movimientos** (`tools/pelotari-glb.mjs`): exporta el modelo de Meshy con andar y correr y
  todos los de pelota, con nombre en castellano; con `base`, sin ningún movimiento, para animarlo en otro programa. Sin
  comprimir y con la textura en PNG: unos 6,5 MB. Para entregarlo; el juego sigue usando el comprimido.
- **Texturas pintadas** (`src/world/texturasPintadas.js`, `src/assets/texturas/*.webp`, `tools/textura-enlosable.cjs`,
  `tools/textura-cruz.cjs`; noviembre de 2026): el adoquín, la hierba, la tierra, la piedra, el revoco, la teja, la
  pizarra y la madera de los pueblos están pintados en Higgsfield (Nano Banana 2, 1024 × 1024, 1,5 créditos cada una) con
  el estilo de las láminas, en lugar del dibujo hecho con código de `textures.js`. Al acabar `buildTextures` se cambia
  solo la imagen de cada `CanvasTexture`, al mismo tamaño (512, o 256 en calidad baja), así que repeticiones, materiales y
  memoria siguen igual; la pintada se lleva antes al color medio de la de siempre, canal a canal, y por eso los revocos de
  colores, la piedra y la madera oscuras y los tonos de cada comarca no cambian. El relieve sale del brillo de la pintada
  (`normalFromHeight`). `runtime.js` las espera como mucho 4 s; si no llegan, quedan las de código. Para que se repitan
  sin costura: `textura-enlosable.cjs` busca el recorte cuyo borde derecho empalma con el izquierdo y el de abajo con el de
  arriba (en las de hileras, un número entero de hileras) y funde lo que falte en una franja junto a los bordes (con
  `ejes=y` solo arriba y abajo, para que las juntas de las tablas no salgan dobles). Si aún se nota, `textura-cruz.cjs`
  la desplaza media textura para que la costura quede en una cruz en el centro, Nano Banana repinta solo esa cruz con su
  máscara, y `--junta` coge de lo repintado solo la cruz, con el color igualado, porque el modelo a veces retoca también
  lo de fuera. Para otra: se pinta igual, se pasa por las dos herramientas y se apunta en `LISTA`.
- **Mapa más limpio y menú que se reconoce** (noviembre de 2026):
  - *Menú*: el botón de tu cara lleva al lado las tres rayas con «Menú» (`.yo-m`, `MENU_M` en `hub.js`); en las secciones
    es solo eso, en su cuadro. El panel del menú, opaco (con transparencia se leían a través los nombres del mapa), y lo
    que sigue más abajo de sus casillas se funde en el borde.
  - *Comarcas como territorios*: cada una teñida con su color, también sin descubrir (`relieveM`: antes, todas las
    cerradas iban del mismo malva y el mapa se veía sucio). Las juntas, más anchas y oscuras, con la luz de cada comarca
    hacia dentro, como un canto biselado, y el contorno de Navarra más grueso (`contornoM`, `juntaM`, `luz`); el canto de
    arriba de las losas brilla más (`bordeM`). Fuera de Navarra, más apagado.
  - *Menos ruido*: los nombres de las comarcas, cortos (sin «Comarca de»), sin candado y más pequeños en el móvil, así
    caben más; la cañada de la trashumancia, solo con una de sus comarcas elegida. En el móvil tumbado, las comarcas de
    abajo en tiras bajas con la foto a un lado: Navarra pasa de un tercio a más de la mitad del alto.
  - *Definición*: el mapa se dibuja hasta con el doble de píxeles (`prMax` 2; antes 1,5), y baja solo si no da.
- **Pueblos en pastel y con más vida** (noviembre de 2026):
  - *Tono pastel* (`CustomToneMapping` en `sky.js`, puesto solo en el renderizador del juego, `runtime.js`): el mismo tono
    de cine, con el 0,8 de la saturación de los menús y las sombras un poco levantadas. El mapa, los menús y los retratos
    siguen con sus colores. De día el sol es algo más suave y el cielo da algo más de luz (`KEYS`), y las contraventanas
    van en tonos algo apagados (`SHUTTERS` en `houses.js`, `ESTILO` en `townReal.js`).
  - *El aire de cada comarca y la luz sin saltos* (`world/sky.js`, noviembre de 2026, tanda 1): sobre la paleta de la
    hora, cada familia de comarcas (`familiaAire`: atlántica, pirenaica, media y ribera) tiñe su cielo, su sol y su
    luz de relleno, y tiene sus nubes, su bruma y su hora dorada (`AIRE`: el color al que tira la luz con el sol bajo,
    cuánto y durante cuánto). Con el sol rasante sube la luz del cielo, malva, y la luz con dirección no baja de unos
    15 grados: antes el pueblo se quedaba casi negro bajo un cielo rosa. En el relevo del sol a la luna la luz con
    dirección se apaga del todo y vuelve (`crep`): antes saltaba de golpe de un lado al otro. `sky.dorada` y
    `sky.crep` los leen el postprocesado y quien quiera saber en qué momento de la tarde se está.
  - *Pintura y contorno de los personajes* (`engine/charLight.js`, tanda 1): en el pueblo, la luz del sol sobre
    personajes y animales cae en cuatro tonos con el paso suave, como pintada a pincel, y el perfil del lado del sol se
    enciende con su color (`pintura(sh)`, que se añade al final del sombreador de cada material con luces; los de
    Meshy la reciben al pedir su relleno, `fillMaterial`). Fuera del pueblo vale 0 (`applyCharFill(null)`): menús,
    retratos y escenas propias se ven como siempre. `contorno(raíz)` pone al jugador una línea de dibujo: una segunda
    piel vuelta del revés, hija de cada malla y con su esqueleto; solo en calidad media y alta (dibuja al jugador dos
    veces: unos 31 mil triángulos y una llamada más). El grosor se mide comparando lo que mide el personaje en el
    mundo con lo que mide su malla: con esqueleto, la escala de la malla no lo dice.
  - *Suelo mojado y charcos* (`world/weather.js MOJADO`, `world/terrain.js`, tanda 1): con la lluvia, calles y caminos
    se oscurecen y cogen brillo, y en lo llano se forman charcos que reflejan el cielo, más cuanto más rasante se
    mira. Es una lectura de textura más en el sombreador del terreno, solo mientras está mojado; no añade geometría.
    Sube mientras llueve y tarda en secarse al escampar. En la hierba apenas se encharca.
  - *Un solo viento* (`world/viento.js`, tanda 1): `VIENTO` guarda la fuerza de ahora (`uWind`), hacia dónde sopla
    (`uDir`, el lado al que van las nubes) y el tiempo; `sopla()` la calcula cada fotograma en `runtime.js` con dos
    ondas lentas que no casan (rachas cada medio minuto más o menos), el aire de la comarca (en la Ribera, más) y el
    tiempo (con lluvia arrecia). De él cuelgan la hierba y los árboles (`nature.js`, cuyo `windUniforms.uWind` es ya
    el mismo objeto), el humo de las chimeneas (`fx.js Smoke`, que se tumba hacia donde sopla) y los banderines de
    fiesta (`fiestas.js`: la punta de cada banderita, marcada con `aCuelga`, aletea en el sombreador). Lo que se
    mueva con el viento de aquí en adelante, que lea `VIENTO`.
  - *Agua pintada* (`world/water.js`, tanda 1): el reflejo del cielo va en degradado (el horizonte si se mira rasante,
    el azul del cenit si el reflejo sube: `uZen`), la profundidad se lee por color en tres pasos (hondo, verde claro
    y casi turquesa donde se hace pie) y a la orilla llegan líneas finas de espuma, una detrás de otra. Todo en el
    sombreador que ya había, sin lecturas de textura ni geometría nuevas.
  - *Postprocesado en un único pase* (`engine/post.js`, tanda 1; solo calidad media y alta): el pueblo se dibuja en
    una imagen aparte que guarda ya el color final (mismo tono de cine y mismos colores que en pantalla: three.js solo
    lo hace con las imágenes marcadas `isXRRenderTarget`, y su formato se fija a mano, `RGBA8`, para que el volcado
    del suavizado no falle) y un rectángulo la lleva a la pantalla añadiendo de una vez: la bruma del valle (con la
    profundidad de cada píxel se sabe su altura: densa abajo y más al amanecer, al caer la tarde y con lluvia), las
    sombras de nubes sobre suelo y casas con el mismo viento que las del cielo, el resplandor de lo que da luz (de
    noche se nota, de día casi nada), el color de la hora y un viñeteado suave. El suavizado de bordes sale de las
    muestras de la propia imagen (2 en media, 4 en alta). Cuesta una llamada de dibujo más y un rectángulo. Se apaga
    en Ajustes («Efectos de imagen», `herrizherri-post`), con `?post=0`, y solo: si el juego va justo, es lo primero
    que quita `runtime.lighten()`, antes de aligerar el pueblo. Las escenas propias (fútbol, encierro, menús) no pasan
    por él. Los textos nuevos en euskera van en `data/eu-aventura.js`, que `i18n.js` carga con los demás.
  - *Música del paseo en frases* (`audio/frases.js`, tanda 1): explorando un pueblo (ambiente `explore`) ya no suena
    una canción de continuo. `Sound.musicTick` deja de pedir la canción y `Frases.tick` dice, cada 24 a 54 segundos,
    una frase de seis a diez segundos con los timbres de la comarca (txistu y txalaparta en la atlántica, txistu y
    violín en el Pirineo, acordeón y guitarra en la Zona Media, guitarra y acordeón en la Ribera); entre medias queda
    el ambiente. De noche, más espaciada y más bajo. Las canciones grabadas (`MUSICA`) vuelven solas con lo que pasa:
    persecución, leyenda, minijuego, partido, fiesta. Los instrumentos son sintetizados, a la espera de grabaciones;
    las melodías son propias. `runtime.js` le dice a `Sound` si se está de paseo (`paseo`), la familia de la comarca
    (`aire`) y cuánta noche hay.
- **Exploración y movimiento** (noviembre de 2026, tanda 1, fase 2):
  - *Moverse cuesta* (`actors/player.js`): el jugador tiene un modo (`pie`, `trepa`, `resbala`, `planea`, `nada`) y una
    resistencia (`aguante`, de 0 a `aguanteMax`; 1 es un anillo entero). Empujando contra una cuesta que andando no se
    sube (más de 51 grados) se agarra y trepa despacio; en el aire, el botón de saltar abre y cierra la capa y se baja
    a 1,7 m/s; el agua honda ya no es un muro: se nada. Todo gasta resistencia (`AGUANTE`: 9 s trepando, 13 planeando,
    15 nadando), más con lluvia o frío (`gasto`), y vuelve sola con los pies en el suelo. Sin resistencia: resbala
    cuesta abajo, la capa se cierra o hay que volver a la orilla (`onRescate`). Una caída de más de cinco metros avisa
    (`onCaida`). Bajo un puente no se pasa nadando. Va con los mandos de siempre: la palanca o las flechas y el botón
    de saltar, así que sirve igual el teclado, el táctil, el mando y el móvil de mando. `puedeAventura` lo apaga
    donde no toca.
  - *La aventura de cada pueblo* (`game/townAventura.js`, métodos de `TownGame`): se monta en el primer fotograma de
    juego (`aventuraInicia`; con `?aventura=0`, no). Pone una atalaya en el alto más alto que se alcanza cerca de la
    plaza, con una banderola a trece metros; cinco kutxas (cofres) escondidas, cada una en el sitio más lejano de todo
    lo que ya hay, que solo se ven a menos de 16 m; y una montura junto a la entrada (`game/montura.js`: caballo de
    Burguete en la montaña, de dos metros con la cabeza alta, la especie `burguete` de `actors/animalGlb.js`; burro
    grande en la Zona Media, la Ribera y Pamplona; es un «vehículo» como el tractor. La pottoka, que es un poni, se
    queda suelta en los prados: a un jinete le quedaba pequeña. La primera vez que se monta, cuenta qué animal es. En la nieve deja huellas de herradura, una por casco y en el sitio de cada pata, `PATAS`, con `hoofprint` de `world/weather.js`, que se tapan como las de bota; y avisa a los cascos del suelo que pisa. La cámara va a 8,4 m del caballo; con 9,6 chocaba más con las casas al girar). La atalaya enseña en
    el mapa las kutxas sin abrir y deja llevar una marca propia a una de ellas. Las mejoras se ganan: cada dos
    atalayas, un quinto más de anillo (hasta dos anillos); cada ocho kutxas, un corazón más (hasta seis). Los
    corazones (tres) bajan con una caída fuerte y vuelven al sentarse en un banco; sin ninguno, se vuelve a la plaza.
    Las pistas salen una sola vez, cuando hacen falta. Se guarda en `perfil.aventura` (`atalayas`, `kutxas`, `pistas`,
    `marcas`), un campo nuevo del perfil de siempre.
  - *Lo que se ve* (`ui/aventuraHud.js`, `game/planeo.js`): el anillo sale junto al personaje solo mientras se gasta o
    se recupera (se vacía, late a trazos con poca y lleva una raya cuando se agota; con una mejora, un segundo arco
    por fuera) y los corazones, arriba, solo cuando falta alguno o acaban de cambiar (lleno, macizo; vacío, su
    contorno a trazos). Ninguno ocupa sitio cuando no se ve (`hidden`, no una capa transparente sobre el visor), y los
    corazones no tapan nada de lo que ya había: van arriba en el centro solo si caben entre el panel de las misiones
    y los botones; en vertical o en pantallas estrechas bajan debajo del panel y lo siguen cuando se despliega
    (`coloca`). La capa es un kapusai de pastor, de diseño propio, que ondea con el viento del pueblo.
  - *Flores pintadas* (`flores.js`, `flores.webp`): las de jardineras, balcones y macetas de las puertas, y las de las
    fachadas sencillas (`Lienzo.flores`), son tarjetas con geranios, petunias, tagetes y gitanillas pintados (GPT Image
    en Higgsfield, con transparencia), en un atlas de 3 × 2; `celda(color)` elige la casilla por el color de siempre.
    Antes eran bolas de veinte caras. Material `flor` (`builder.js`), sin sombra.
  - *Follaje pintado* (`follaje.webp`): cada zona del atlas de follaje (los dos racimos de hojas, la rama de abeto y la masa
    de las copas) se pinta encima de la suya y se lleva a su color medio, porque el verde de cada árbol lo pone el color de
    sus vértices. El atlas pasa a 1024 en calidad alta.
  - *Flores silvestres* (`silvestres.webp`, `FlowerField` en `nature.js`): dos tarjetas cruzadas por mata con margaritas,
    botones de oro, amapolas, lavanda y acianos pintados; antes eran unos 70 triángulos por mata, ahora 4.
  - *Roca de los montes* (`roca.webp`): la de las laderas empinadas y los peñascos, en `LISTA` como las demás.
  - *Mobiliario* (`village.js`): banco de forja con listones, farol fernandino con sus aristas, aros y remate, columna de
    fundición, voluta en los faroles de pared y papeleras de forja. Farolas cada 18 m (si no caben en un lado, en el otro)
    y bancos con papelera cada 60 m en las calles anchas (`townBuilder.js`); de noche, los charcos de luz algo mayores.
  - *Pajarillos* (`pajarillos.js`): gorriones que picotean en la plaza, junto a los bancos y a las puertas y salen volando
    a una farola, a un balcón o al borde de la fuente cuando pasas (vuelven cuando te vas), palomas en la plaza y
    vencejos dando vueltas sobre los tejados. Una malla repetida por especie, con el aleteo y las alas plegadas en el
    sombreador; de noche no se ven.
  - *Vecinos en los balcones* (`spawnBalcones`): hasta 8, también en los balcones de las fachadas sencillas, que ahora se
    apuntan en `TOWN.balcones`.
- **Primero la comarca, luego el pueblo** (`quien` en `mapa3d.js`, `PUEBLO_D`; noviembre de 2026): al tocar el mapa se
  elegía el pueblo cuya chincheta quedara más cerca del dedo, y con toda Navarra a la vista casi cualquier toque caía cerca
  de alguno, así que se iba directo a un pueblo. Ahora, sin comarca elegida y con la cámara lejos, tocar lleva a la
  comarca; sus pueblos se eligen ya con ella elegida, o con la cámara cerca, donde salen sus nombres. Un pueblo de otra
  comarca lleva primero a la suya.
- **De una comarca a otra sin alejarse** (`navega` y `cand` en `mapa3d.js`, `vecina` y `.cb-fl` en `inicio.js`; noviembre
  de 2026): con una comarca elegida, moverse por el mapa a mano (arrastrar, dos dedos, el panel táctil o las flechas del
  teclado) pasa a la comarca que queda en el centro cuando lleva 0,2 s en ella, sin volar ni cambiar la distancia: se
  enciende, sale su rótulo y se apaga la de antes. Fuera de Navarra se queda la que había, y no cambia con un pueblo
  elegido ni con una colección. Solo después de mover a mano, porque el centro de una comarca con entrantes puede caer en
  la vecina. Las de alrededor muestran su nombre apagado (`.m3-cl.fondo`), los últimos en sitio, para ver hacia dónde ir.
  En el rótulo de arriba, a los lados del nombre, las flechas a la anterior y a la siguiente en el orden de la fila de
  abajo, dando la vuelta; esas sí vuelan y encajan la comarca. En el móvil de pie, sin el sello, para que quepa el nombre.
- **El inicio, repasado** (noviembre de 2026): las tarjetas de abajo, algo más grandes y del mismo cristal que los botones
  de arriba, con las esquinas redondas: la foto y, debajo (en el móvil tumbado, al lado), el nombre y los sellos de la
  comarca o el icono de cada misión del pueblo, las hechas encendidas con su color (`.m3-ms`); sin el marco de degradado
  con las esquinas cortadas ni la bandeja gris detrás de los pueblos. El botón del menú, con tres rayas finas de trazo y
  «Menú» debajo (`MENU_M` en `hub.js`), en lugar del icono dibujado de barras doradas. Las juntas entre comarcas y el
  contorno de Navarra, finos otra vez (`contornoM`, `juntaM`, `luz` en `mapa3d.js`). En la entrada, la imagen de la
  península se funde con el fondo por sus bordes, mucho por los lados lejanos y poco por el norte, pegado a Navarra, con
  las esquinas redondas (`funde` en `suelo`); antes, al abrirse las nubes, se veía su rectángulo flotando, como un
  cuadrado. Tampoco hay ya esquinas de visor en la entrada.
- **La carga, vigilada** (`play` en `main.js`, noviembre de 2026): cada quinto del progreso de la carga de un pueblo o de un
  campeonato queda en el informe («carga 40 % · …»); si en 40 s no avanza nada (sin contar el rato con la app de fondo o
  el móvil en vertical), se apunta «carga atascada» y se vuelve al mapa del inicio en lugar de quedarse en «cargando».
  Pasó al recargar tras perder la imagen en el iPhone: el juego entraba directo al partido y no acababa de cargar.
- **El mapa con otro color, más relieve y nieve; los pueblos, en medallones** (noviembre de 2026): la paleta de alturas,
  menos verde (salvia grisácea en lo bajo, oliva en las sierras, pardo y gris en la roca, blanco arriba; `PALETA`); el
  relieve fino de cada comarca, que traía los verdes de antes pintados, aporta solo sus luces y sus sombras; las luces,
  más suaves y sin el tono cálido que amarilleaba las laderas al sol, y las sombras, con más contraste; el bosque, oliva
  apagado. El relieve, más alto (`EXA` de 0,0026 a 0,0033). Nieve en las cumbres desde unos 1.250 a 1.500 m, con el borde
  roto y menos en lo muy pendiente: en Navarra, solo el Pirineo. Los pueblos, en un medallón con su foto (la tira
  `fotosT`, casillas de 96 px de las portadas pequeñas) dentro de un aro fino de su estado: blanco, rosa con lo hecho en
  un arco, dorado con el check; con una comarca elegida, más grandes (`medG`); en toda Navarra, un punto limpio. El palito,
  fino y claro. Antes, disco de borde oscuro con un punto morado sobre un palito oscuro.
- **Los pueblos en el mapa, fichas con foto** (`.m3-tl` en `inicio.css`, `T` y `etiqueta` en `mapa3d.js`; noviembre de
  2026): fuera las chinchetas en 3D, su palito y su punto en el suelo, que no gustaban. Cada pueblo es una ficha pequeña
  encima del mapa, en HTML para que se vea nítida: su foto en redondo con el aro de su estado (blanco por descubrir, rosa
  con lo hecho en blanco, dorado con el check si está sellado) y su nombre, con un pico abajo que señala su sitio. En toda
  Navarra no sale ninguna, salvo la de tu pueblo; con una comarca elegida, las de sus pueblos. Si encima no cabe, va
  debajo con el pico arriba; si tampoco, solo la foto; un pueblo de la comarca elegida no se esconde nunca. El elegido, en
  blanco. Se toca en toda la ficha, y el punto que se toca y donde se ancla la ficha del pueblo es su sitio en el suelo.
  Las piezas en 3D siguen creadas pero apagadas.
- **Relieve fino de la comarca elegida** (`src/assets/relieve/fino.webp`, `tools/relieve/fino.mjs`, `hazFino` y `finos` en
  `mapa3d.js`; noviembre de 2026): el relieve del mapa es una altura cada 620 m, y las sierras salían como bultos lisos;
  el sombreado fino ponía el dibujo, pero no la forma. Ahora, una imagen gris de toda Navarra (80 KB, EU-DEM a 56 m,
  media de nueve lecturas cada 145 m) guarda cuánto se aparta la altura de verdad de la gruesa. Al elegir una comarca,
  con la cámara quieta y en tres pasos cortos, su losa se rehace con una malla unas cuatro veces más densa (de 43.000 a
  65.000 triángulos) y cada punto sube o baja lo suyo, algo exagerado (×1,35), a cero junto a su borde para que case con
  sus paredes y sus vecinas. Sus ríos, sus árboles, sus medallones, los nombres de sus montes y la cámara siguen a ese
  relieve; entra y sale suave (`fk`) y se va con la maqueta de un pueblo. Se guardan las mallas de las tres últimas
  comarcas. Con ella, un bosque denso donde hay bosque (de 7 a 14 árboles por casilla de la máscara, según el aparato),
  que crece con el relieve. La vista de una comarca, algo más de lado (`PITCH_C` 0,82, antes 0,95) y con algo más de
  relieve a esa distancia (`exaDe`), para que se vean las siluetas de los montes; de cerca, los medallones ya no se
  agrandan. La comarca elegida, casi sin su color encima. Para verlo: `mapav.mjs` y `cerca.mjs`.
- **Un solo navegador: la fila de las comarcas** (`enFila` en `inicio.js`; noviembre de 2026): la fila de abajo se queda
  siempre y lleva solo las comarcas. Al elegir una, su tarjeta se enciende y la fila se corre para que se vea; también al
  cambiarla arrastrando el mapa. Los pueblos se eligen en el mapa, en sus medallones, que con una comarca elegida se
  agrandan. La tarjeta elegida dice qué hace otro toque (`.ver`, `.m3-vr`): abrir la página de la comarca. Con un pueblo
  abierto, tocar su comarca vuelve a ella entera. A toda Navarra, con la casa o Escape; Escape, con un pueblo, vuelve a su
  comarca. La ficha del pueblo en el mapa va siempre encima de la fila. Una primera versión tenía unas migas arriba, con
  flechas, y otra abría los pueblos de la comarca en la misma fila, detrás de ella (`.m3-hijos`): eran dos navegadores
  para lo mismo y se quitaron. También se probaron pestañas finas, solo con el sello y el nombre: gustaban más las
  tarjetas, con su foto y sus misiones.
  La página de cada comarca lleva a los lados de su nombre la anterior y la siguiente (`vecinas` en `hub.js`, también con Q
  y E), y la ficha de cada pueblo, arriba a la izquierda, el anterior y el siguiente de su comarca con cuál es (`.fh-nav`).
- **Las colecciones en el mapa** (`coleccionMapa.js`, `modoColeccion` en `inicio.js`, `coleccion` y `encuadra` en
  `mapa3d.js`; noviembre de 2026): al abrir Naturaleza, Escudos o Personajes desde el menú del juego, en lugar
  de su ventana se queda el mapa con su colección. Arriba, su cabecera con cuántas llevas, sus pestañas, «Lista» (la
  pantalla de siempre) y cerrar; abajo, sus tarjetas en lugar de las comarcas; y en el mapa, cada sitio con lo suyo: las
  especies en sus comarcas; los escudos, los personajes y las figuras de leyenda y de carnaval en sus pueblos. Tocar una
  tarjeta enseña dónde está, con sus comarcas en primer plano y la cámara encima; tocarla otra vez abre su ficha. Torneos
  se probó en el mapa y el autor lo quiso en su pantalla de siempre, con las dos cartas bien claras: «Torneo de pelota» y
  «Torneo de fútbol», y el botón de cada una dice a qué se juega («Jugar a pelota», «Jugar al fútbol»; en el móvil
  tumbado más estrecho, solo «Jugar», para que quepan el frontón y el club). Tocar un sitio deja abajo solo lo suyo. Lo bloqueado sale con su candado y su pista. El hub
  sigue con `data-screen="home"` y la colección en `data-col`, así el mapa se pinta y vale todo lo del inicio. Lo que no
  tiene sitio en el mapa solo sale en la lista. En el material didáctico, las pantallas de siempre.
- **El torneo, sin nada cortado ni montado** (`torneoPanel` y su CSS en `game/torneo.js`; noviembre de 2026): en el iPhone
  tumbado, el cuadro de dieciséis se montaba encima de la barra y del frontón, las cartas se cortaban y el título se iba
  por arriba. Ahora, tumbado, la tarjeta ocupa todo el alto y la rejilla tiene tres zonas (`grid-template-areas`): la
  cabecera arriba, con el frontón (`.tq-sitio`) junto a «?»; debajo, a la izquierda, el partido y bajo él la barra (Salir y
  la acción); y a la derecha, el cuadro desde la cabecera hasta abajo, sin rótulo encima si no hay pestañas. De pie, una
  columna con la barra pegada abajo. Las cartas del partido y la del campeón las mide `cartas()` con el sitio real de su
  panel (el ancho junto al VS y, tumbado, el alto con aire para flotar), con un `ResizeObserver`; antes salían de fórmulas
  con el tamaño de la ventana, que no sabían de la muesca ni de la barra de inicio. Cada eliminatoria, del ancho de su
  columna (`grid-template-columns:minmax(0,1fr)` en `.tq-m`): la casilla se ensanchaba con el nombre y los tantos quedaban
  fuera, cortados. El cuadro de dieciséis, con sus cuatro columnas iguales y las filas a la medida de su letra en el móvil
  tumbado; el campeón, con la carta junto a su texto. Comprobado con un medidor de cajas (nada fuera de su panel ni de la
  pantalla, nada recortado por su caja, bloques sin pisarse, textos enteros y la tarjeta sin desplazarse tumbada) en los tres
  campeonatos y todas sus rondas (liguilla, cuadro, final, eliminado y campeón), con la muesca y la barra de inicio del
  iPhone simuladas, en 812 × 375, 844 × 390, 852 × 393, 932 × 430, 667 × 375, 740 × 360, 915 × 412, 640 × 360, de pie y en
  el ordenador. En 568 × 320 (iPhone SE de 2016) el cuadro de dieciséis no cabe y se desplaza dentro de su panel. Ya no
  hay banda sesgada azul y rosa detrás de las cartas: en el ordenador se veía como dos rectángulos oscuros sin sentido.
  Entre las cartas y el VS, 16 px a cada lado (12 en el móvil tumbado estrecho); bajo el VS, a cuántos tantos en dos
  líneas y sin caja (`.tq-a`): con su caja de etiqueta era más ancho que el hueco y pisaba el borde de las dos cartas.
- **La liga de fútbol, igual** (`ligaPanel` y `roundPanel` en `futbol/liga.js`; noviembre de 2026): tumbado, en cualquier
  tamaño, la tarjeta a todo el alto con la cabecera arriba, el partido o los resultados a la izquierda con la barra debajo y
  la clasificación a la derecha de arriba abajo (en el iPhone con muesca no cabía y la barra, pegada abajo, tapaba la
  última fila y la comparativa; en el iPad iba en una columna). Los jugadores a los lados del partido, solo si el panel
  mide más de 440 px (consulta de contenedor en `.lg-match`): si no, «Fuera de casa» se montaba encima de la media. Con
  la barra estrecha, «Simular» a secas (`.lg-l` y `.lg-c`, consulta de contenedor en la barra). Comprobado con el mismo
  medidor (`pantallas.mjs`): menú de pelota, club, liga al empezar, a media temporada y al acabar, jornada, elegir rival y
  elegir club, en los mismos tamaños.
- **Las sierras de alrededor, de verdad** (`world/sierras.js`, `src/data/sierras/<pueblo>.js`, `tools/relieve/sierras.mjs`;
  noviembre de 2026): el horizonte real de cada pueblo ya estaba en los datos, pero se dibujaba como un anillo a 1,2-1,5 km, a
  media altura y justo donde la niebla ya era total: en Altsasu no se veía Urbasa y la Ribera parecía un mar blanco. Ahora,
  detrás del relieve del pueblo (que llega de verdad hasta 1,5 km), una malla polar con las alturas reales de 1,4 a 48 km
  (40 anillos, cada grado; EU-DEM en teselas de nivel 10), cosida al borde del terreno (`alturaLejos` en `terrain.js`). Lo
  lejano se acerca (a 48 km, unos 5,5 km en el juego) y baja en la misma proporción: desde la plaza cada sierra se ve en su
  sitio y con su ángulo de verdad. Más allá de 48 km, la silueta de lo que asoma (la Demanda desde Viana, el Pirineo francés
  desde Isaba). Con la luz del sol y del cielo del momento (normales de la pendiente real), color según la altitud, la
  pendiente y la comarca (prados, bosque a manchas, campos en el llano del sur, caliza, el yeso de las Bardenas y nieve solo
  por encima de 2150 m) y el aire de en medio, más azul cuanto más lejos y nunca un blanco del todo. En esos pueblos la
  niebla de la escena va de 220 a 4200 m (antes de 160 a 1500) y la cámara ve hasta 7 km. Unos 12 KB por pueblo, cargados
  solo en su pueblo. Sin la malla en los frontones sin suelo y en la vista corta de los ordenadores flojos.
- **Elegir personaje en el móvil tumbado** (`hub.css`, `.csel2` en `max-height: 430px`): con la muesca y la barra de inicio del
  iPhone a la habilidad especial le faltaban 35 px y su texto quedaba cortado debajo de «Jugar». Ahora, el nombre un punto
  menor, la media algo más pequeña, sin la línea del pueblo y con menos aire entre bloques: cabe entera en 667 × 375, 812 ×
  375, 844 × 390 y 932 × 430. Las pantallas del inicio se comprueban con `hub.mjs`, que simula la muesca de verdad
  (`Emulation.setSafeAreaInsetsOverride`, el `env(safe-area-inset-*)` del teléfono) y no cuenta lo tapado por otra tarjeta.
- **Otsagabia, con su relieve de verdad alrededor** (`load` en `engine/runtime.js`; `rawHeight` en `levels/salazar.js`): su valle
  sigue hecho a mano, pero ya no lo cierra una muralla de picos grises dentados y nevados (crestas de ruido de 170 m y el
  anillo de montes de siempre, con la nieve en metros del juego). Ahora las laderas del borde son lomas redondeadas y
  boscosas, detrás van las sierras de verdad (`world/sierras.js`) y la nieve y la roca van a su altitud real (la plaza, a
  765 m: `ALT0` y `sierras` en una copia del módulo del nivel, que no se deja modificar).
- **Orillas en talud** (`finalHeight` en `levels/townReal.js`): fuera del casco, el ancho de la orilla crece con lo alto que
  queda la ladera sobre el agua (1,6 veces el desnivel, entre 4,5 y 30 m; el río se busca hasta 36 m, `riverAt`). Antes, con
  4,5 m fijos, donde el río va al pie de un monte, como en Ituren, el cauce cortaba la ladera en un muro de roca gris.
- **Nieve y roca por altitud real** (`cota` en `world/terrain.js`; `ALT0` del pueblo en `levels/townReal.js`): en los pueblos
  con su relieve de verdad, la nieve (2150 m), la roca, los pastos de altura y el bosque van en metros de altitud real, no del
  juego. Antes, en Isaba, a 809 m, las lomas de 950 m salían nevadas.
- **Pueblos más alegres** (noviembre de 2026; comparado vista a vista con lo de antes en Lesaka y en Tudela y Olite): banderines
  de fiesta cruzando la plaza de cada pueblo (`world/fiestas.js`: cuerdas de banderitas de colores colgadas de fachada a
  fachada, entre casas que dan a la plaza, a unos 5 m y siempre por encima de 3,8 m; una malla y un material); en el casco,
  más revoco de color y menos piedra gris (`MUROS` en `world/townReal.js`: la cal blanca en la vertiente atlántica y los
  ocres, cremas y rosas hacia el sur); y macetas con flores en siete de cada diez casas (antes, algo más de la mitad).
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
- **Sin duplicados** (revisión de noviembre de 2026):
  - Toda escucha en `window` o `document` se quita al soltar lo que la puso, con una función con nombre. El mapa del
    inicio ponía una en `blur` sin nombre y, con cada vuelta al menú, se quedaba vivo el mapa anterior entero.
  - En un pueblo no hay dos personas con el mismo nombre ni ninguna con el del jugador (`nombresUnicos` en
    `townGame.js`, con `nombreLibre` de `data/nombres.js`). Los anfitriones de misión conservan el suyo.
  - Los sabios no se repiten en un pueblo: hay 16 en `data/sabios.js` y se coge el siguiente libre.
  - Cada paseante tiene su sitio un poco a un lado en cada parada, en un anillo, para no andar ni pararse uno dentro de
    otro cuando comparten ruta.
  - Para revisarlo, en la carpeta de trabajo de la sesión: `estatico.mjs` (claves repetidas en un objeto, casos repetidos,
    funciones dobles, ids repetidos en las listas), `datos.mjs` (ids y nombres repetidos en los datos), `dobles.mjs`
    (escuchas, bucles de dibujo, relojes, contextos y músicas que se acumulan al entrar y salir) y `gemelos.mjs` (en
    cada pueblo, personas encima unas de otras o con el mismo nombre, misiones y objetos repetidos). Las calles de
    `village.js` repiten id a propósito: una por cada lado.
  - Las reglas repetidas de `style.css` son la capa de la identidad morada encima del papel de antes: se ve la última.

## Herramientas y pruebas (`tools/`)

| Herramienta | Qué hace |
|---|---|
| `meshy-costuras.mjs` | Las texturas de los personajes de Meshy sin motas: lo de fuera de cada pieza, con el color de su borde; WebP con el color a resolución completa en los bordes, también en las versiones de 1024 px y ligera (solo la imagen) |
| `silueta-carta.py` | La silueta de escudo de las cartas (corona, lados y punta) en `polygon()` de CSS: `--fifa`, `--corona` y `--marco` de la carta de pelotari y `--fifa` de las de Torneos, para pegar en `src/ui/neon.css` |
| `presupuesto-pueblo.mjs` | El presupuesto de cada pueblo: lo que pinta con el perfil del iPhone (triángulos, dibujos y memoria de texturas y búferes, con `presupuesto-gpu.js`) en su puerta mirando a los cuatro lados y, con `PELOTA=1`, en su partido de pelota, frente a lo que aguanta el iPhone 13 (unos 900 mil triángulos, 520 dibujos y 80 MB de texturas en el pueblo). Todo pueblo nuevo tiene que pasarlo antes de publicarse: solo se carga un pueblo cada vez, así que lo que cuenta es lo que pesa cada uno. Sale con código 1 si alguno se pasa |
| `puntos-control.mjs` | Los puntos de control de arte y luz: de cada pueblo, dos vistas fijas (a pie de calle desde la puerta y desde 22 m sobre la plaza) en cuatro condiciones (día, atardecer, noche y lluvia), con lo que pinta cada una (triángulos y llamadas de dibujo) y lo que tarda en cargar. Las mismas fotos antes y después de cada cambio de arte, luz o atmósfera: `node tools/puntos-control.mjs <carpeta> <etiqueta> [pueblos] [calidad] [condiciones]`. Las de la auditoría de noviembre de 2026 y su informe, en `entrega/tanda1/`. |
| `puntos-interes.mjs` | Los puntos de interés de cada pueblo, medidos: qué parte de lo que se pisa ve algo a lo lejos (contando el relieve y las casas), cuánto paisaje vacío hay como mucho (andando a 3,3 m/s) y si hay retos de las tres escalas. Cuenta lo que rotula el mapa, los vecinos con misión y lo que añade la aventura (`game.puntosInteres()`: la atalaya y las kutxas, estas como escondidas). Pasa con el 85 % viendo algo lejano, ningún vacío de más de 60 s y las tres escalas. `node tools/puntos-interes.mjs <salida.json> [pueblos \| todos]`; con `?aventura=0` en la dirección se mide el pueblo sin la aventura. |
| `muros.mjs` | La prueba automática de muros: un explorador que se lanza contra los 40 muros mayores del pueblo, de frente y en diagonal, andando, corriendo y saltando, con el código del jugador y sin dibujar (unos 13 000 pasos por pueblo). Falla si alguna vez queda dentro de un muro, da un paso más largo que su cuerpo o sale del mapa. `node tools/muros.mjs <salida.json> [pueblos \| todos]`. |
| `aventura.mjs` | La prueba automática de la aventura de un pueblo: que se monta (atalaya, cinco kutxas y montura), que nadar, planear, trepar y caer hacen lo que deben con el anillo y los corazones, que se monta y se baja, que la atalaya y la kutxa se guardan en el perfil sin tocar lo demás, y que no hay errores. Deja una captura de cada cosa. `node tools/aventura.mjs <carpeta> [pueblo] [calidad]`. |
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
| `auditoria-diseno.mjs` | Auditoría de diseño del menú (también su marco: la barra de arriba y la de las secciones) y de las pantallas de deporte (TAM=844x390 o 1180x820): texto cortado o con puntos suspensivos, texto encima de figuras (mirando la transparencia de la imagen) o de otro texto, verdes fuera de sitio, cajas con las esquinas en ángulo o con borde y sin el filo de neón, texto que se sale de su botón o su caja (círculo, píldora, esquinas redondeadas o en ángulo), distancias de rótulo a título y de título a texto, letra fuera de la escala o de las fuentes del juego colores de texto fuera de la gama, cajas que se salen de su caja, texto en columnas de una palabra por línea, lo que hay que desplazar, esquinas de más de 12 px o casi rectas y botones con letra de lectura. La medida está en `auditoria-medida.mjs`; también mide la composición: bloques de una fila con la misma altura o el mismo centro y el mismo hueco, columnas con el mismo borde y el mismo ancho, cajas con el mismo relleno a los dos lados, rellenos y huecos en la rejilla de 4 px, y bordes que casi coinciden (de 2 a 12 px) dentro de una misma caja, que se toman por descuadres. Con TODO=1 lista todas las distancias y con DETALLE=1 dice la regla de CSS de cada fallo. Con IDIOMA=eu, en euskera |
| `cosecha-vehiculo.mjs` | La cosecha de principio a fin, con cosechadora (Artajona) o con tractor y temporeros (Estella): el campo, la descarga, el camino, la báscula y la conversación final |
| `choques.mjs` | Textos que se montan con un icono, una chapa, un botón pequeño u otro texto, o que tapa un aviso: el menú entero, la galería pueblo a pueblo, las fichas y Ventajas, a cuatro tamaños; `choques` se usa también en `auditoria-partidos.mjs` |
| `auditoria-partidos.mjs` | La misma auditoría en los marcadores y mandos de fútbol y pelota, montados sin el partido en 3D, en castellano y euskera y en cada estado de los botones (atacar, defender, portero, penaltis, lesionado, tarjeta, cambio y la ventana de cambios; golpe, gancho y volea) |
| `auditoria-pueblo.mjs` | La misma auditoría dentro del pueblo (TAM=844x390 o 1180x820): HUD, diálogo, cada pestaña del libro, mapa con la tarjeta de una misión y de un lugar, mochila, pausa, cada pestaña de la tienda y recompensa. Con IDIOMA=eu, en euskera; con EUFALTAN=1, además, la lista de lo que se queda sin traducir |
| `auditoria-ventanas.mjs` | La misma auditoría en las ventanas del juego (fichas, minijuegos, misión cumplida, cuestionarios). Con IDIOMA=eu, en euskera |
| `auditoria-medida.mjs` | La medida común de las cuatro auditorías. «junto»: texto, botones, tarjetas e imágenes seguidos con menos aire del mínimo (texto y botón 12 px, 16 en el ordenador; tarjetas 8, 16 en el ordenador; imagen y texto 8; un texto que acaba y un título que empieza 16, 24 en el ordenador) o texto a menos de 8 px del borde de su caja. «centrado»: texto o icono descentrado más de 1,5 px dentro de su forma (botón, círculo, cuadrado, píldora, etiqueta), midiendo del icono lo pintado y del texto de las mayúsculas a la línea base. «cortado» también mira lo que baja de la línea (la «j», la «g») recortado por abajo. «justo»: texto de un botón que se sale o va a menos de 2 px de su borde. «imagen»: imagen deformada, descentrada en su caja, recortada más por un lado, con bandas vacías, desigual con las de sus tarjetas hermanas o con un encuadre que enseña menos del 70 %. Con MUESCA=1, todas miden con los márgenes de la muesca del iPhone 12 tumbado (47 px a cada lado y 21 abajo), que estrechan el menú: así se ve lo que en el iPhone se sale y en el ordenador no |
| `labrit-final.mjs` | La final en el Labrit: la entrada de «Gran final» en cuatro momentos (título, txapela, cartas y confeti), que se va sola hacia el sorteo, el partido dentro y vistas de la grada y del marcador |
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

**Las dos descargas, solo cuando se pidan** (noviembre de 2026). Los dos archivos únicos de `docs/descargas` pesan unos
47 MB cada uno y cada versión nueva añadía unos 90 MB al historial: con 113 versiones guardadas, el repositorio llegó a
unos 3 GB. Ahora la web se compila sin ellos y `docs/descargas` se queda como está en git; solo se vuelven a compilar
cuando el autor lo pide. A la vez se limpió el historial: fuera las versiones viejas de las descargas, las compilaciones
viejas de la web (`docs/`) y las capturas de revisión de `entrega/`, que ya no se guardan en git. En `entrega/` quedan
los modelos de los personajes (`.blend`), las capturas de la App Store, los encargos y los informes de texto. El código
de todas las versiones se conserva.

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
