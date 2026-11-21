# Coordinación entre ventanas

Lo lee y lo actualiza cada ventana de Claude antes de empezar y antes de subir (ver `CLAUDE.md`). Corto y al día: lo que
ya no vale, se borra.

## Quién lleva qué

| Ventana | Lleva | Archivos suyos |
| --- | --- | --- |
| **Principal** (coordinación) | Juntar lo de todas, compilar y publicar la web; las cartas animadas y el rediseño de las pantallas del menú (Cómo jugar, pausa, menú y Torneos); las voces, de momento solo Otsagabia (el autor, 18 nov) | `docs/`, la rama `main`, `CLAUDE.md`, `COORDINACION.md`, `src/assets/voz/`, `src/game/vozVecinos.js`, `src/assets/frontones*/`, `src/ui/pantalla.js`, `public/videos/figuras/` |
| **Pelota · interfaz** (rótulos, animaciones de texto, carruseles, pantallas de frontón) | Todo lo que se ve encima del partido y los menús de pelota | `src/pelota/hud.js`, `src/pelota/vs.js`, `src/pelota/ficha.js`, `src/game/torneo.js`, `src/game/carrusel3d.js`, `entrega/interfaz-pelota/` |
| **Pelota · personajes** (los 10 pelotaris de siempre, público, jueces, vecinos del mismo estilo) | Modelos 3D y cómo se mueven | `src/actors/`, `src/assets/meshy*/`, `src/assets/chicas/`, `tools/blender/`, `tools/meshy-*`, `tools/chicas/` |
| **Otsagabia · locución** | Cerrada. Solo retoques de voces de Otsagabia si el autor los pide | `src/assets/voz/vecinos/ochagavia/`, `entrega/voces-ochagavia-pendientes.md` |
| Pelotaris nuevos de Meshy | **Parado** por el autor el 18 nov. Estado y cómo retomarlo: `investigacion/pelotaris-nuevos/LEEME.md` | `investigacion/pelotaris-nuevos/` |

## Listo para publicar

Lo que está en `master` y todavía no se ve en la web. Lo añade quien lo sube; lo borra quien publica.

- Principal (21 nov, tarde): láminas técnicas del piquillo (conservera y cosecha de Lodosa) y del aceite (almazara de Tafalla y cosecha de aceitunas).

## Peticiones entre ventanas

- **De Principal a Pelota · interfaz** (20 nov, noche): por encargo del autor («antes de que salgan los pelotaris siempre
  hay como una escena antigua»), `src/pelota/match.js` ya no abre la pantalla VS (`vs.js`) antes del partido: de la
  elección de material va directo al sorteo; la final sigue con su entrada. `vs.js` solo se usa si `window.__vsVieja`.
  Si lo retiráis del todo, nada más depende de él en el partido.
- **De Principal a Pelota · personajes** (20 nov, noche, aún más tarde): por encargo directo del autor, dos cambios más
  en lo vuestro. (1) `src/actors/glbChar.js`: «al hablar… hacen un movimiento de oscilación demasiado exagerado» y «los
  movimientos de la mano… que sea más sutil». `calmaHabla` (nuevo) calma la charla de los vecinos hueso a hueso (cadera
  5 %, piernas 10 %, tronco 22 %, cuello y cabeza 40 %, brazos 15 %) y también su estar de pie cuando es la «alerta» de
  Meshy (`K_QUIETO`, brazos 30 %), y los centra en la postura de quieto con la cadera mirando al frente
  (`centroCharla`: la primera postura de la alerta ya giraba 26°). Se aplica tras los recortes de `loadMeshy`, salvo en
  los pelotaris. (2) `src/actors/pelotaMoves.js`, `carreraNatural`: «la punta del pie… no va hacia los lados»: el pie se
  gira sobre la espinilla hasta mirar adonde la rodilla (6° hacia fuera); en el apoyo iba de 25 a 70° hacia fuera.
- **De Principal a Pelota · personajes** (20 nov, noche, más tarde): por encargo directo del autor («el modo de correr ha
  mejorado algo, pero aún así no me gusta cómo corren. Creo que no es orgánico»), en vuestro `src/actors/pelotaMoves.js`,
  `carreraNatural` tiene tres opciones nuevas: `zancada` (1,45: cada pie va más adelante y más atrás de la cadera),
  `inclina` (7°: el tronco hacia delante, en el hueso de la columna) y `mano` (0,9: la palma hacia el muslo, girando
  antebrazo y mano sobre el eje del antebrazo; con hueso de giro del antebrazo, lo lleva él a medias). El clip sale con
  `userData.zancada`, y en `src/actors/glbChar.js` la velocidad de Run se divide por ella: menos pasos y más largos (antes
  hasta ×2,8, siete u ocho pasos por segundo). Medido: los pelotaris están en reposo con la palma hacia delante (+z).
  Láminas con `tools/clips-ver.mjs`; probado en un partido real a 1280×720 y 844×390, sin errores.
- **De Principal a Pelota · interfaz** (20 nov, noche, más tarde): por encargo del autor («Mira qué mal se ven los vecinos
  en la cámara de dron. Si se van a ver así, prefiero que no se vean»), los planos de la grada tras un buen tanto están
  apagados en `src/pelota/match.js` (`PLANO_GRADA = false`). En vuestro `hud.js`, la clase `.pel-root.dron` (que escondía
  los mandos durante esos planos) ya no se pone nunca; no hace falta tocarla, por si vuelven.
- **De Principal a Pelota · personajes** (20 nov, noche): por encargo directo del autor («cuando celebren y levanten las
  manos no se atraviesen la cabeza» y «que a la hora de correr no corran con las piernas en V»), en vuestro
  `src/actors/pelotaMoves.js`: (1) `montaje` mide el volumen de la cabeza con el pelo (`volumenCabeza`, un mapa de hasta
  dónde llega en cada dirección) y `posa` aparta de él el codo, el antebrazo, la mano y los dedos (`enCabeza`); los puños
  arriba (`PUNO_ARRIBA`, `PUNOS_ARRIBA`) van abiertos en V. (2) `carreraNatural(scene, clip)`, nuevo: la carrera de Meshy
  con los tobillos hacia el centro, rodillas adelante y manos junto al cuerpo; lo llama `loadMeshy` de
  `src/actors/glbChar.js` solo para los pelotaris. `tools/anatomia-pelotaris.mjs` sigue sin fallos; lámina para verlo:
  `tools/clips-ver.mjs`. Detalle en ARQUITECTURA («Movimientos de pelota del pelotari»).
- **De Principal a Pelota · personajes** (20 nov, tarde): por encargo directo del autor («en la vista de dron sobre los
  espectadores se ve claramente que no tienen movimiento… su posición de reposo no es con las manos en las rodillas,
  están como medio aplaudiendo, pero tampoco aplauden cuando se genera la acción»), en vuestros `src/actors/crowdAnim.js`
  y `src/actors/crowd3d.js`: los retratos del resto de la grada se hacen ahora con las posturas de crowdAnim
  (`posturasRetrato`: el primer cuadro de «quieto», con las manos sobre los muslos, y el de «aplaudePie», de pie con las
  palmas juntas), pasadas a crowd3d con la opción `posturas` (sin el paso de 0,3 m hacia delante al levantarse: ya están
  de pie donde tenían los pies). Antes los retratos usaban `sitPose`, que dejaba los antebrazos levantados. Y en
  `src/game/fronton.js`, más animados: 64 en el móvil (antes 28), 24 en el más justo, 90 en calidad media y 140 en alta.
- **De Principal a Pelota · interfaz** (20 nov, tarde): por encargo directo del autor, con una captura del iPhone del
  rótulo «¡Tanto y partido!» («no me gusta y es muy dura la legibilidad»), en vuestro `src/pelota/hud.js`: el final ya no
  es rosa intenso con el texto lila y la racha rosa encima; lleva la placa oscura de los demás avisos, el filo y el título
  en oro y, debajo, en blanco y en una línea, quién gana y el tanteo (`match.js` y los textos `finalYou`, `finalRival`,
  `finalUs`, `finalThem` de `rules.js`), sin la racha. Y `.pel-racha[hidden]{display:none}`: sin racha se quedaba una
  rayita morada vacía debajo de cada aviso.
- **De Principal a Pelota · interfaz** (20 nov, mediodía): por encargo directo del autor («¿por qué tarda tanto o hace
  falta pulsar varias veces en los carruseles de selección, en todos los carruseles de la web?»), en vuestro
  `src/game/carrusel3d.js`: (1) después de deslizar el anillo quedaba puesta una escucha `once` que se comía el siguiente
  clic de verdad (en el móvil, al deslizar no llega ese clic, y el primer toque tras deslizar no hacía nada); ahora solo
  se traga el clic que llega en los 350 ms siguientes a soltar. (2) Tocar una portada de los lados la elige al primer
  toque en todos los carruseles (antes solo con `directo`, que ya no hace nada; el anillo gira hacia ella a la vez). En
  las pruebas automáticas no se veía porque con `navigator.webdriver` ya se elegía siempre: esa excepción se ha quitado.
  Lo mismo en `src/hub/galeria.js` (galería de pueblos). Probado con toques reales (CDP) y ratón: un toque en todo.
- **De Principal a Pelota · interfaz** (20 nov, mañana): por encargo directo del autor («la selección de carruseles
  sigue yendo muy lento. Desde que selecciono perfil, torneos, pulso y hasta que se selecciona pasa muchísimo tiempo»),
  en vuestro `src/game/carrusel3d.js`: el paso del giro usa su tiempo de verdad hasta 0,2 s (con el tope de 0,05, a pocos
  fotogramas por segundo el giro iba varias veces más lento) y se asienta algo antes (13 en vez de 10). Hay una opción
  nueva, `directo`: tocar una portada de los lados la elige al primer toque, sin traerla antes delante; la usa el menú
  del inicio (`hub.js`, anilloMenu). Los demás carruseles siguen igual (tocar un lado la trae delante).
- **De Principal a Pelota · interfaz** (20 nov, madrugada): por encargo directo del autor («la pantalla de selección de
  campeonatos cambia cuando entras y cuando sales del campeonato es otro carrusel»), en vuestro `src/game/torneo.js`:
  hay un export nuevo, `eligeSede(id)`, que abre el mismo «¿En qué frontón?» (`otroPueblo` → `carruselElige`) y devuelve
  el id del pueblo elegido o null. Lo usa `hub.js` (Torneos, el frontón de la carta de pelota) en vez de su rejilla de
  cartas, que se ha quitado. `carruselElige` llama además a `css()`: desde Torneos aún no estaba puesto y la portada de
  delante brillaba en rosa en vez del verde de `cp-front`.
- **De Principal a Pelota · interfaz** (19 nov, noche): por encargo directo del autor («todos los jugadores deben tener
  el mismo tamaño y estar en la misma posición, centrado en la tarjeta», «cambia la de la chica que está en la esquina del
  frontón» y «pon al personaje mucho más dentro del frontón»), en vuestro `src/game/torneo.js`: `encuadre()` ya no tiene
  un zoom mínimo y usa para todas el mismo sitio de los pies, `PIE_PORTADA` (0,69), exportado; la llamada del carrusel es
  `encuadre(it.fondo, AR_PORT)`. Hay una tabla nueva, `ALTO`, con el alto / ancho de las portadas que no son ni 1 ni 1,25
  (`camara` y `promesas`, 2542 / 2048), y `FIGURA` tiene medidas nuevas para `camara` (portada rehecha: Oihana dentro
  del frontón cubierto de Irañeta) y `promesas` (ampliada por arriba y por abajo).
- **De Principal a Pelota · interfaz** (19 nov, noche): por encargo directo del autor (captura del menú en el iPhone: «no
  se ilumina cuando está seleccionado el principal»), en vuestro `src/game/carrusel3d.js` el velo que apaga las portadas
  de los lados ya no es el `::after` con `--c3d` e `inherit` (Safari no lo recalculaba y cada velo se quedaba con el valor
  del principio: la de delante, apagada). Ahora es un `<i class="c3-velo">`, último hijo de cada portada, y `pinta()` le
  escribe la opacidad solo cuando cambia; la etiqueta «Tú» (`.ep-tu`) también recibe su opacidad directamente. Ya no
  existe `--c3d` ni el `@property`: si algo vuestro lo leía, leed `.c3-velo`. El `::after` de las portadas queda oculto.
- **De Principal a Pelota · interfaz** (19 nov, noche): por encargo directo del autor («los personajes no están
  cerrados en las cards», con el carrusel de campeonatos en el iPhone), en vuestro `src/game/torneo.js`: diez de las
  quince portadas (`src/assets/pelota/fondos`) miden ahora 2048 × 2560, con suelo pintado debajo de los pies (la figura
  llegaba al borde de abajo y el nombre le tapaba las piernas). `encuadre(k, ar, pie)` sabe qué portadas son altas
  (`AMPLIADA`), la tabla `FIGURA` se ha medido de nuevo con regla y los pies van al 75 % de la carta (al 69 % si el
  nombre ocupa dos líneas). Si añadís portadas, medid su figura y decid si es cuadrada o alta.
- **Para todas** (19 nov, noche), por encargo del autor («falta el botón de sprint y todo el diseño… con fondos
  transparentes», «no poner tanto público, pero con más calidad y que se vea como aplauden», «los setos que hay en los
  pueblos… bloques raros»):
  - **El mando del móvil** (`public/mando/index.html` y `movil.js`) lleva ahora los botones de la pelota como los de la
    pantalla del partido: relleno suave de su color con el aro (`--anillo`), GOLPE rosa, DEJADA azul, CORTADA o GLOBO
    turquesa y ESPRINT dorado, y en arco a la misma distancia de GOLPE. Si cambiáis los botones del partido en
    `src/pelota/hud.js`, cambiad también los del mando.
  - **El público** (`src/game/fronton.js`): solo tantos como van con la figura entera (60 en el ordenador, 36 en calidad
    media, 16 en el móvil y 8 en el más justo). Ya no hay figuras de lejos. Y sentados donde los ve la cámara del
    partido: el grupo, como mucho a 10 m del frontis (en el Labrit quedaban todos detrás de la cámara).
- **De Principal a Pelota · personajes** (19 nov, noche): por encargo directo del autor («los aficionados no están
  sentados encima de las butacas… es como si estuvieran traspasando la butaca»), en vuestro `src/actors/crowdAnim.js`
  hay una opción nueva, `asiento` (la altura del asiento sobre los pies del sentado, en metros): `cocinaFigura` mide, ya
  sentada, lo más bajo del culo y de detrás de los muslos y sube o baja la cadera lo que falte (si baja, los pies se
  quedan en el suelo y suben las rodillas; si sube, los pies suben con ella), y cada espectador se sube o se baja según
  su tamaño para quedar justo encima. `cocinaPublico(set, culoObj)` guarda lo cocinado por conjunto y altura. Medido de
  perfil: antes se hundían unos 17 cm en el asiento. Las butacas del Labrit y de los frontones cubiertos
  (`src/pelota/court.js`) tienen ahora el asiento a 28 cm, a la medida del público de 1,24 m, y `C.asiento` lo dice;
  `src/game/fronton.js` coloca a cada uno con eso. Partid de lo de `master`.
- **De Principal a Pelota · interfaz** (19 nov, noche): por encargo directo del autor («la misma distancia entre los tres
  botones… GOLPE… redúcelo un poquito» y «si estamos jugando con el mando conectado… no hace falta que salgan los
  botones»), en vuestro `src/pelota/hud.js` los botones del partido van en arco: GOLPE (96 px; 82 en el móvil tumbado) en
  la esquina, y DEJADA, CORTADA y ESPRINT a la misma distancia de su centro, a 180°, 135° y 90° (bloque `.pel-btns` con
  `--G`, `--S` y `--R`; `.pel-bcol` y `.pel-gcol` quedan como `display:contents`). En `src/style.css`, con el móvil de
  mando se esconde `.pel-btns` entero. Y el descanso («no hace falta que se pause el juego… unos segundos y vuelve el
  juego»): `descansos()` ya no abre el menú; en `src/pelota/match.js` el que descansa se encorva (`tired` al menos 0,8
  durante la fase `descanso`), y en `src/pelota/rules.js` el rótulo dice «Unos segundos para recuperar fuerzas». Partid
  de lo de `master`.
- **De Principal a Pelota · interfaz** (19 nov, noche): por encargo directo del autor («los carruseles de selección van
  muy lentos»), en vuestro `src/game/carrusel3d.js` lo que apaga las portadas de los lados es ahora `--c3d` (registrado con
  `@property`, sin heredar, en pasos de 0,05 y solo escrito si cambia), las de los lados van sin sombra, el filo de luz
  (`neon-aro`), el brillo de la cara y la respiración de la figura solo se mueven en la carta de delante, el filo en su
  propia capa, y el brillo dorado de la de delante es `.ep-aura` (una imagen ya difuminada) en vez de un `drop-shadow`.
  Hay una función nueva, `reanima(...)`, para la entrada del texto de abajo sin `void offsetWidth`. En vuestro
  `src/game/torneo.js`, las cuatro llamadas usan `reanima`, «Elige tu pelotari» lleva `.ep-aura` dentro de cada carta y la
  figura animada se enciende 260 ms después de pararse el anillo. No uséis `--d` dentro de las portadas del anillo: las
  cartas ya lo usan como retraso de sus animaciones. Partid de lo de `master`.

- **De Principal a Pelota · personajes** (19 nov, noche): por orden directa del autor («Deja el personaje como estaba en
  un principio… elimínalo todo»), `src/actors/npcOutfit.js`, `src/actors/sinTacos.js` y `src/actors/hairColor.js` vuelven
  a como estaban antes de la equipación (`a502991f^`): sin `KIT`, sin `tacosColor`, sin `ponKitColores` y sin el
  `DoubleSide` de los teñidos. Partid de lo de `master`.
- **De Principal a Pelota · interfaz** (19 nov, noche): por la misma orden, en vuestro `src/game/torneo.js` ya no está el
  botón «Equipación» de «Elige tu pelotari» ni el del cuadro del campeonato (`abreEquipacion` ya no existe), y en
  `src/game/townDeportes.js` tampoco su `act === 'kit'`. Partid de lo de `master`.
- **De Principal a Pelota · interfaz** (19 nov, tarde): por encargo directo del autor («minimalistas y transparentes,
  con los bordes de color y las animaciones»), en vuestro `src/pelota/hud.js` los botones del partido son
  transparentes, con el aro de color en `::before` (`--anillo`: GOLPE #ff3fb4, CORTADA #ff6fb8, DEJADA #7d7bff,
  ESPRINT #ffc63d) y su latido (`pel-pulse`, `pel-pulse-oro`). Y ya publicados, otra vez el autor («dale un poco más de
  color a los botones, que no sean transparentes del todo, porque si no, no se ven»): el relleno es su color oscurecido
  a algo más de media opacidad (`color-mix(in srgb,var(--anillo) 34%,rgba(12,5,28,.4))`). Partid de lo de `master`.

- **De Principal a Pelota · interfaz** (19 nov, tarde): por encargo directo del autor («los botones son muy llamativos y
  quitan mucha atención visual»), en vuestro `src/pelota/hud.js` los botones del partido son ahora discretos: bloque
  «Botones discretos» (fondo casi transparente, aro fino en `::before` con su color en `--anillo`), sin el latido de
  `.pel-hit.ready`, la palanca y su pista más apagadas; en `src/style.css`, `.pel-hk` más tenue. Partid de lo de `master`.
- **De Principal a Otsagabia · locución** (19 nov): por elección del autor («Vale, la toma 2»), Joseba ya dice la frase
  de los prismáticos en sus dos versiones: `inaki-08.mp3` (móvil) e `inaki-09.mp3` (teclado) en
  `src/assets/voz/vecinos/ochagavia/` y sus dos líneas en `manifiesto.json`.

- **De Principal a Pelota · interfaz** (19 nov): por encargo directo del autor («añadiría otro botón más al juego de
  pelota que sea sprint»), en vuestro `src/pelota/hud.js` hay un botón nuevo, `.pel-sprint`, dentro de `.pel-gcol`
  (la columna de GOLPE, con el esprint encima), su estado `esprint(on, puede)` y el rótulo de fuerza de GOLPE subido
  para que no lo pise (`.pel-gcol .pel-hit .pel-pw`); en `src/style.css`, su letra de tecla. Mayúsculas ya no es la
  dejada (sigue en K): es el esprint. Si recolocáis los botones del partido, contad con él.
- **De Principal a Pelota · personajes** (19 nov): el autor ve «parpadeos en los personajes nuevos» en las charlas de
  los pueblos. Los vecinos son vuestros, así que no lo he tocado; lo que he visto leyendo `src/actors/vecinoCerca.js`,
  sin medirlo en pantalla: (1) en el móvil `MAX()` es 1 y `cercaVecinos` se queda cada medio segundo con el modelo más
  cercano, sin margen: con dos vecinos de modelos distintos a parecida distancia (uno que pasea junto a otro parado),
  el más cercano cambia una y otra vez, y a cada cambio uno vuelve a la textura de 512 y el otro espera a que cargue
  la de 1024; (2) en cada charla hay hasta tres cambios a la vista: textura de 512 a 1024 al acercarse, malla ligera
  por la completa (y textura de 2048 en el ordenador) cuando acaba de cargar, ya empezada la charla, y vuelta atrás al
  terminar. Ideas: que el modelo que ya lleva la textura de cerca la conserve mientras otro no esté claramente más
  cerca (un par de metros de margen), y hacer el cambio de malla antes de que la cámara de la charla llegue a su
  sitio, o fundirlo. La cámara de las charlas ya se queda a tres metros (`camera.js` `charla`), que lo disimula algo.
- **De Principal a Pelota · interfaz** (18 nov, tarde): por encargo directo del autor, la ventana principal ha tocado
  archivos vuestros: `src/game/torneo.js` («Elige tu pelotari» en anillo, `eligePelotariLibre`, la banda en el menú),
  `src/game/carrusel3d.js` (opción `banda`, entrada y luz de las portadas, `.ep-port`), `src/pelota/match.js`
  (`sobreTi`: el nombre sobre el jugador solo 3,2 s al sacar) y `src/pelota/audio.js` (el golpe sin el silencio del mp3).
  Partid de lo que hay en `master` (`df7f2b7a`); no hace falta rehacerlo.
- **De Principal a Pelota · interfaz** (18 nov, noche): también por encargo directo del autor («hay muy poco espacio», que
  todo se ordene como los juegos de deportes del móvil), las pantallas a pantalla entera de pelota llevan ahora la
  «pantalla de juego» de `src/ui/pantalla.js` (`ptCabecera`, `ptPie`): atrás arriba a la izquierda, contenido con aire y
  botón grande abajo a la derecha. Tocados `src/game/torneo.js` (menú, «Elige tu pelotari», «Elige tu frontón»,
  Frontones y el cuadro, que ya no lleva «Salir» abajo) y `src/game/carrusel3d.js` (fuera `.c3-barra`). Las pantallas
  nuevas, con esa cabecera y ese pie; está explicado en `ARQUITECTURA.md` («La pantalla de juego»). También el fútbol
  (`src/futbol/liga.js`: `head(…, atras)` y sin «Salir» ni «Volver» abajo) y el inicio (`src/hub/consola.css`: `--hud-b`
  entero en el móvil tumbado y el menú en nueve columnas).
- **De Principal a Pelota · personajes**: las figuras animadas de las cartas están rehechas desde las figuras nuevas, las
  22 (`public/videos/figuras/`, `src/ui/videos.js`). Si cambiáis el dibujo de un pelotari, avisad aquí: su animada hay
  que rehacerla.
  Los vecinos y su calidad son vuestros (el autor, 18 nov: «los vecinos los están haciendo en otro chat»).

## Última publicación

- 21 nov, tarde (22), la hizo la ventana principal, por encargo del autor: `master` hasta `24de3108`. Altsasu: vuelven
  las chispas y ascuas de fuego de los momotxorros (ascuas rojas que suben de sus cabezas y brasas flotando por la
  plaza). Láminas técnicas isométricas (Anatomy) dentro de las misiones: el queso (Idiazabal y Roncal), la almadía en el
  portillo, el rosado (misión del vino), el espárrago (al acabar su cosecha) y el molino de rodezno; también en el
  material didáctico. Pelota: los golpes que eligió el autor (la versión A). Fuera el vídeo de los pelotaris chocando el
  puño, la lámina animada detrás del logo de la carga y la palabra del centro de los anillos de progreso.
- 21 nov, mediodía (21), la hizo la ventana principal, por encargo del autor: `master` hasta `374ccfb9`. La pelotari,
  siempre en femenino: otras 24 frases de Mikel y Edurne («Las dos en su sitio», «Ninguna se rinde», «¡Bote pronto, muy
  agachada!», «La txapela ya tiene dueña»…). La página de progreso con aire a los lados en el móvil. Altsasu: el triple
  de momotxorros llegan corriendo con chispas rojas, llenan la plaza bailando, el aire se pone rojo unos segundos y se
  van corriendo por todo el pueblo hasta desaparecer; el quiosco y la escultura del nogal de la Foru Plaza, como los de
  verdad. El arranque: la portada espera a que lleguen las cuatro imágenes del mapa (con la ortofoto).
- 21 nov, mañana (20), la hizo la ventana principal, por encargo del autor: `master` hasta `57670ebd`. Las frases de los
  comentaristas en femenino para las pelotaris: 29 versiones grabadas con las mismas voces de Mikel y Edurne («Es una
  rematadora», «la rival», «Se le nota cansada», «¡Sigue viva!», «Anda fina con la mano derecha»…), que suenan cuando
  la frase habla de una chica; con un chico, la de siempre.
- 21 nov, madrugada (19), la hizo la ventana principal, por encargo del autor: `master` hasta `0a4036f9`. Altsasu: al
  encontrar el tercer momotxorro, la manada llega corriendo, baila dando vueltas alrededor del kiosco de la plaza y se va
  corriendo, con un rojo suave. Fuera los corazones de arriba. En los campeonatos (menos la final), el vídeo de entrada
  hecho con Higgsfield antes de que salgan los pelotaris. Los golpes de la pelota, con el eco del frontón cubierto. Los
  comentaristas ya no dicen en masculino lo que habla de una pelotari.
- 21 nov, madrugada (18), la hizo la ventana principal, por encargo del autor: `master` hasta `dff1626e`. Pelota en casa: trotar en el sitio para que el pelotari corra (sin trotar, al paso), golpes más sensibles (desde 2,2 anchos de hombros por segundo) y la pelota más lenta (74 %); y las voces de los paseantes de Otsagabia al mismo volumen que los demás vecinos.
- 20 nov, noche (17), la hizo la ventana principal, por encargo del autor: `master` hasta `1b7ca209`. La posada: en cada
  pueblo, también en Otsagabia, una casa con letrero y farol donde, de noche, se puede dormir hasta la mañana.
- 20 nov, noche (16), la hizo la ventana principal, por encargo del autor: `master` hasta `7d2b32cb`. La bici, entera: la
  horquilla y el manillar en su sitio (se dibujaban más atrás y la rueda de delante iba suelta), con cadena, guardabarros,
  luces, manetas y varillas en la cesta.
- 20 nov, noche (15), la hizo la ventana principal, por encargo del autor: `master` hasta `2896d4b7`. En Altsasu, al
  encontrar los tres momotxorros, el final es de miedo: salen muchos más de todas las calles, te rodean y se dispersan, con
  luz y niebla rojas, farolas que parpadean y un zumbido con latido.
- 20 nov, noche (14), la hizo la ventana principal, por encargo del autor: `master` hasta `4fd4760d`. Los cencerros
  vuelven a oírse (y con ellos pasos, animales y ambientes: el bus de efectos llevaba desde el 11 de noviembre sin salida).
  El avisador de proximidad de los cencerros, una píldora pequeña arriba, también en el Zarratrako de Ochagavía, que se
  aparta de la barra de misiones. En el partido de pelota, fuera la pantalla VS vieja: de la elección de material, directo
  al sorteo del saque.
- 20 nov, noche (13), la hizo la ventana principal, por encargo del autor: `master` hasta `cfe3f826`. Los vecinos, casi
  quietos al hablar: de frente a quien les habla, sin girar el cuerpo y con un gesto de brazo pequeño, también entre frase y
  frase. Corriendo, la punta del pie en la línea de la rodilla. La ficha del pueblo en el mapa, más sencilla: fondo oscuro,
  el escudo a la vista junto al nombre, las misiones sin caja y la siguiente misión en una línea junto al botón.
- 20 nov, noche (12), la hizo la ventana principal, por encargo del autor: `master` hasta `2bf14292`. La carrera de los
  pelotaris, más orgánica: zancadas más largas y menos pasos por segundo (antes hasta siete u ocho), el tronco algo hacia
  delante y las palmas hacia el muslo, de canto, en vez de hacia arriba. Vuelven los golpes de pelota recortados de la
  grabación del frontón que pasó el autor. Y sin los planos de la grada tras un buen tanto: de cerca, los vecinos se veían mal.
- 20 nov, noche (11), la hizo la ventana principal, por encargo del autor: `master` hasta `386ab0a0`. La próxima parada,
  otra vez arriba a la derecha (con su foto y el botón de jugar) y las comarcas a todo el ancho de abajo; la cámara sube al
  mismo paso que la isla y ya no se le escapa por arriba; la ficha del pueblo en el mapa, más ancha, con el sello de la
  comarca, el escudo del pueblo, las misiones en una fila y la siguiente misión junto al botón de jugar.
- 20 nov, noche (10), la hizo la ventana principal, por encargo del autor: `master` hasta `388181eb`. Los montes de las
  islas, con roca donde la hay en los de verdad: paredes, crestas y lo alto del Pirineo, pedregal al pie, menos en el norte
  atlántico y bajo el bosque; la hierba, distinta en solanas, umbrías, vaguadas y crestas; surcos de ladera y grano de
  piedra y de prado; nieve solo en las canales de las paredes. Solo en los aparatos que no van en modo ligero.
- 20 nov, noche (9), la hizo la ventana principal, por encargo del autor: `master` hasta `c4ead6bd`. Las islas de las 12
  comarcas, de una sola pieza: sin el labio de hierba del borde, el prado dobla sobre el filo y baja por la panza en
  lenguas, con el color del terreno; y sin la raya parda fina que asomaba a lo largo del borde (rendijas entre el terreno y
  la panza por las que se veía el interior de la roca).
- 20 nov, noche (8), la hizo la ventana principal, por encargo del autor: `master` hasta `94c6f3a0`. «Tu progreso» como
  panel de control: tres esferas de anillos que se llenan al entrar (explorador, pelotari y fútbol), la tabla de tu liga,
  el ranking de pelotaris de tus campeonatos y cada comarca con su anillo. Los pelotaris celebran con los brazos en V sin
  meter las manos en la cabeza y corren con los pies por debajo del cuerpo. Torneos ya con la música de la pelota.
- 20 nov, noche (7), la hizo la ventana principal, por encargo del autor: `master` hasta `b2f7198f`. Lo del vídeo del
  iPhone de las 16:46: el vuelo de dron de la isla sin parones (un programa del sombreado que faltaba por preparar y
  medidas de la página que obligaban a recolocarlo todo a mitad de fotograma) y el terreno que baja hasta el borde de la
  isla sin la repisa lisa. El inicio sin «0/12 comarcas»: el progreso está en el panel nuevo «Tu progreso» (menú →
  Progreso, o tocando tu retrato). La próxima parada, abajo a la derecha como tarjeta con foto y JUGAR. Iconos de jugar y
  pausa en glifo blanco redondeado.
- 20 nov, noche (6), la hizo la ventana principal, por encargo del autor: `master` hasta `b0747c85`. La barra de arriba
  del mapa del inicio, rehecha como cabecera plana igual que la del menú («No me gusta la barra que has añadido de menú,
  comarcas y la pantalla que estamos jugando actualmente»): sin cápsulas, el texto sobre un velo fino, el botón redondo
  del menú en la esquina, tu retrato y nivel, Navarra descubierta y la próxima parada con JUGAR.
- 20 nov, noche (5), la hizo la ventana principal, por encargo del autor tras jugar a pelota: `master` hasta `2f70bf3b`.
  Vuelven los golpes de la pelota del 17 de noviembre (frontis y bote distintos: «antes el sonido del golpeo contra el
  frontis era diferente al golpeo contra el suelo y tenía sentido») y el saque sin tocar la palanca bota 1,5 m hacia la
  contracancha en vez de en el medio («tiene que sacar un poco más hacia la contracancha»).
- 20 nov, noche (4), la hizo la ventana principal, por la auditoría de misiones («no termines ni pares hasta tener todo
  solucionado»): `master` hasta `e8f0b3fd`. Entran la fuente de beber de fundición en las plazas con kiosco (Pamplona,
  Tudela: sin ella no se llenaba la cantimplora y «Sube al Ezkaba» no empezaba), la explanada de delante de los castillos
  transitable en la rejilla de caminos (Marcilla, Cortes, Javier, Olite: no había ruta a la guía ni al patio) y la
  escalinata de la iglesia que baja hasta el suelo, más empinada en las laderas y sin pisar casas (Tudela, Leitza, Isaba:
  la puerta, con el sabio y la visita, quedaba en alto sin paso). Los 38 pueblos completan sus misiones con el jugador
  automático (cosecha y almadía, con sus pruebas propias).
- 20 nov, noche (3), la hizo la ventana principal, por el encargo del autor («al diseño de esta barra de arriba, de los
  elementos del menú y demás, también hay que darle una vuelta de diseño porque se han quedado anticuados») y la
  auditoría de misiones: `master` hasta `1e13ba69`. Entran la barra de arriba del mapa en cápsulas (retrato con el aro de
  la experiencia y MENÚ, Navarra descubierta con una barra de un tramo por comarca, la próxima parada con JUGAR) y la
  ficha del menú con el mismo lenguaje (`src/hub/barra-inicio.css`, `hub.js`, `inicio.js`), y los puentes estrechos y en
  diagonal que la rejilla de caminos ya cruza (Ituren llega a la otra orilla; `src/world/nav.js`).
- 20 nov, noche (2), la hizo la ventana principal, dentro de la auditoría de misiones que pidió el autor («vete poco a
  poco y comienza a resolver todo lo que queda»): `master` hasta `b507fcc7`. Entran el redil con la puerta hacia el lado
  libre y los animales del rebaño puestos donde hay camino hasta ella (Aribe y Etxalar ya se terminan;
  `src/world/townBuilder.js`, `src/game/townActividades.js`, `src/world/nav.js`); la misión de observar de Orreaga, con
  la flecha de siempre hasta el hayedo cuando los animales quedan fuera del alcance de los prismáticos
  (`src/game/townCimas.js`, `src/game/townGame.js`); la entrada de Ituren dentro de la rejilla de caminos
  (`src/levels/townReal.js`), y salir de la tienda con Escape (`src/game/tienda.js`).
- 20 nov, noche, la hizo la ventana principal, por el encargo del autor («cuando recogemos basura para el Basajaun la
  línea amarilla no se elimina»): `master` hasta `583cdc93`. Entra solo eso: al recoger una basura, la flecha y la luz
  amarilla dejan de señalarla y pasan a la siguiente, y con la quinta van al Basajaun (`src/game/game.js`, pickItem y
  questTarget).
- 20 nov, tarde, la hizo la ventana principal, por el encargo del autor (carruseles, golpes, rótulo final, público):
  `master` hasta `455103f5`. Entran los carruseles de un solo toque, también la carta de los lados y después de deslizar
  (`src/game/carrusel3d.js`, `src/hub/galeria.js`); los golpes de pelota limpios, solo el impacto y una cola de sala corta
  (`src/assets/sonidos/pelota-*.mp3`); el «¡Tanto y partido!» con placa oscura, título en oro y quién gana con el tanteo
  (`src/pelota/hud.js`, `match.js`, `rules.js`); el público con las manos en las rodillas, el resto de la grada de pie
  aplaudiendo al celebrar y 64 animados en el móvil (`src/actors/crowdAnim.js`, `crowd3d.js`, `src/game/fronton.js`); las
  leyendas que ahora sí se pueden terminar (`src/game/townGame.js`); las voces de los vecinos que pasean y del músico de
  Otsagabia (`src/assets/voz/vecinos/ochagavia/`) y el saludo de noche que ya no da los buenos días (`src/game/saludo.js`).
- 20 nov, mediodía, la hizo la ventana principal, por el encargo del autor de la mañana (cencerros, carruseles,
  Basajaun, Altsasu, golpe de la pelota y figuras pixeladas): `master` hasta `2d011202` (la web, en `1ff01139`). Entran
  los cencerros grabados con ElevenLabs para el Zarratrako, los joaldunak y los momotxorros, con la música a un tercio
  mientras se buscan (`src/audio.js`, cencerroGuia y buscaCencerros); el menú de un solo toque y el giro del carrusel que
  no se frena en ordenadores lentos (`src/hub/hub.js`, `src/game/carrusel3d.js`, apuntado en «Peticiones»); los golpes
  de pelota de verdad sacados del vídeo del autor (`src/assets/sonidos/pelota-*.mp3`); las figuras de los pelotaris sin
  pixelar en el ordenador y la tele (`src/ui/videos.js`: la animada solo si no hay que estirarla); el Basajaun, la Lamia
  y los vecinos de Otsagabia que pasean (`src/game/game.js`), y la comparsa de carnaval que sale por las calles al
  encontrar todas las figuras, en Altsasu momotxorros con luces rojas y cencerros (`src/game/townLeyendas.js`).
