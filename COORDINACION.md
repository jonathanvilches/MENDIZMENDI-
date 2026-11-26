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
| **Auditoría · optimización** (24 nov, el autor: «auditoría completa para borrar archivos antiguos, mejorar texturas, lógica, identidad visual… que vaya más deprisa, que no se pare», y el código ordenado y el repositorio listo para pasarlo a un motor como Unity) | Medir y quitar parones, errores y peso; limpiar archivos viejos; ordenar el código y documentar cómo portarlo. En archivos de otras ventanas solo pide cambios aquí | `tools/auditoria-*`, `PORTAR.md`, `tools/exportar-*`, `tools/exportar/`, `exportar/`, `tools/trailer/`, `unity/` (el proyecto de Unity y su paquete), `.github/workflows/exportar-datos.yml`, `PRIVACIDAD.md`, `public/api/informe.js`, `README.md` (el mapa del repositorio para programadores) |
| Pelotaris nuevos de Meshy | **Parado** por el autor el 18 nov. Estado y cómo retomarlo: `investigacion/pelotaris-nuevos/LEEME.md` | `investigacion/pelotaris-nuevos/` |

## Listo para publicar

Lo que está en `master` y todavía no se ve en la web. Lo añade quien lo sube; lo borra quien publica.

(Nada por ahora: publicado el 26 nov hasta `919350f5`.)


## Peticiones entre ventanas

- **De Auditoría a Pelota · interfaz y a Principal** (26 nov, tarde): por encargo directo del autor («en este tipo de
  bloques en todo el juego quiero que no delimites por cuadrícula… oscurezcas el fondo y liberes la información»; luego
  «aprovecha más los espacios» y «elimina barras separadoras que no aportan nada»). Capa nueva, mía,
  `src/ui/sinCajas.css`, cargada en `src/hub/hub.js` después de `neon.css`: manda con `html:root body` y `!important`
  sobre `pelota/hud.js`, `vs.js`, `ficha.js`, `game/torneo.js`, `futbol/liga.js`, `futbol/hud.js`, `ui/pausa.css`,
  `mando/mando.js` y el alto contraste. Las ventanas que se abren encima (presentación, material, final, pausa, ficha del
  pelotari, torneo, liga, avisos) van sin relleno, borde, sombra ni raya de arriba, sobre el fondo oscurecido; sin rayas
  separadoras (la de la cabecera de la pausa, la de encima de los botones del torneo, las de las casillas del cuadro y
  de las tablas; se queda la del corte de la clasificación); más anchas (presentación hasta 1180 px, material en dos
  columnas, ficha hasta 960 px) y, con una ventana abierta, sin los botones del partido asomando detrás. En
  `src/pelota/match.js` (sin dueño), las cartas de la presentación pueden crecer hasta 250 px (antes 200). Las fichas con
  foto (pueblo del mapa, animales y plantas) se quedan como cartas. Luego, «menos es más» y «reordena»: escala de
  espacios común, lo secundario («Más opciones», «Partes del frontón») debajo de ¡A jugar!, lo que eligió el rival junto
  a la explicación del material, y fuera la barra rosa de los títulos (`hud.js`), la marca amarilla del botón elegido
  (salvo con alto contraste), el dibujo del frontón junto a su nombre y las pastillas de sus rasgos. Si tocáis una
  ventana nueva que se abra encima, añadidla a la lista de `sinCajas.css` o decídmelo.
- **De Auditoría a Pelota · interfaz** (26 nov, madrugada): por encargo directo del autor («que metieras alguna mujer
  también, botillera»). En `src/game/torneo.js` (tuyo) solo los textos: el anillo se titula «Elige quién te asiste» con
  el antetítulo «Botilleros y botilleras»; la marca de la elegida dice «La tuya»; el botón del pie, «Botillera» si es
  chica. Tres botilleras nuevas (Arantxa, Maite y Nekane) en `src/pelota/botilleroRetrato.js` (mío), con `girl: true`.
- **De Auditoría a Pelota · interfaz** (25 nov, noche, lo último de todo): por encargo directo del autor («que cuando
  elijas pelotari también puedas elegir entrenador… el palmarés del botillero… camisetas de colores, ni roja ni azul»).
  En `src/game/torneo.js` (tuyo), `anilloPelotari` lleva en el pie, junto a «Jugar», el botón del botillero (su cara y su
  nombre); al tocarlo, `anilloBotillero`: el anillo con las cartas de los ocho botilleros (silueta de las de los
  pelotaris, txapelas en grande, escudo de su pueblo, finales y desde cuándo; la cinta de la corona, de su camiseta). Se
  guarda en `profile().botillero`. Los datos y los retratos, en `src/pelota/botilleroRetrato.js` (mío, sin nada de 3D).
  El descanso, sin transiciones: fundido a negro y ya están sentados; sin beber, toalla ni termo. Si pierdes tres tantos
  seguidos, tu botillero te dice algo (bocadillo arriba a la izquierda, `src/game/fronton.js`). La cortada y el gancho
  bajan con el joystick hasta rozar la chapa (`cutHeight`, `src/pelota/game.js`).
- **De Auditoría a Pelota · interfaz y a quien lleve los personajes** (25 nov, noche, lo último): por encargo directo del
  autor, el descanso como en los frontones de verdad. `src/pelota/botillero.js` (nuevo): una sola nevera verde en la
  contracancha y, a cada lado, las sillas plegables de cada equipo (pelotari y botillero); el pelotari se sienta de
  verdad, bebe y se seca la cara con la toalla; su botillero se levanta y le habla de pie, con el termo, y el consejo sale
  en la ventana de charla de los vecinos (`G.ui.dialog`, que ahora acepta `img` para el retrato; `src/ui.js`), con ánimos
  y «¡Mucho ánimo, que es la final!» en la final. Los botilleros son dos pelotaris de los de siempre que no juegan ese
  partido, con camiseta blanca o negra y vaqueros (`vistePaisano`) y sin tacos. `DESCANSO.t` pasa de 4 a 11 s
  (`src/pelota/game.js`). Ojo: los huesos de los modelos se llaman `mixamorigHips`, sin separador; las búsquedas por
  nombre deben aceptarlo (lo arreglé también en `src/pelota/sinCabeza.js`, que aparta las manos de la cabeza al celebrar).
- **De Auditoría a Pelota · interfaz y a Principal** (25 nov, noche, lo último): por encargo directo del autor («se han
  perdido los colores de fondo de varias tarjetas y varios bloques del partido de pelota»). El negro con bordes blancos
  salía con Ajustes › «Alto contraste» puesto en su iPhone. Ahora el alto contraste deja los colores del juego, más
  oscuros, con letra blanca y bordes claros: las reglas `body.alto-contraste` de `src/pelota/hud.js`, `vs.js`, `ficha.js`
  y `ceremonia.js` (Pelota · interfaz) y de `src/ui/pausa.css` (paneles morados `#2b0c60`→`#0f0326`, fondos `#1d0a45`,
  bloques `#24104f`, botones `#2a1262`, bordes `#cdb8ff`); en `src/ui/neon.css` (Principal), los rellenos de los botones
  secundarios y elegidos ya no se quitan con el alto contraste (`body :is(` en vez de `body:not(.alto-contraste) :is(`), y
  la nota de Ajustes de `src/hub/hub.js` lo explica. Si tocáis esos estilos, partid de esto.
- **De Auditoría a Pelota · interfaz** (25 nov, noche, más tarde): por encargo directo del autor («quiero que se vean las
  escenas del personaje bailando cuando gana»), en `src/pelota/match.js`, si ganas el partido, tras el «¡Tanto y
  partido!» hay un plano cercano de tu pelotari bailando (`camBaile`, `bailePl`, `BAILE_T0`/`BAILE_S`: del segundo 1 al 6,
  lo que dura su clip «Baile»); después siguen los highlights, la txapela o el panel del final, lanzados con el tiempo
  del juego. Durante el plano, el HUD va como en la repetición (clase `repe` y `controls(false)`): solo el marcador; los
  botones vuelven al empezar el siguiente partido. Si tocáis `finPartido` o la cámara del final, partid de esto.
- **De Auditoría a Pelota · interfaz** (25 nov, noche): por encargo directo del autor («elimina la escena de elección de
  pelotas… la escena, no la elección»), en `src/pelota/match.js` la elección de material queda solo con su tarjeta: la
  escena 3D de la caja (`cestano3d.js`) ya no se carga (`ESCENA_CESTANO = false`). Si la retiráis del todo, nada más
  depende de ella.

- **De Auditoría a Pelota · personajes** (25 nov): el autor pidió «mejor diseño de los pájaros que vuelan». Las uves de dos
  triángulos que volaban alto (`buildBirds()` y `birdMesh` de `src/actors/animals.js`) ya no se ven en los pueblos:
  `townGame.js` las oculta y en su lugar vuelan bandadas de estorninos y milanos reales con cuerpo, cola y alas que
  aletean (`src/world/pajarillos.js`, `updateAltas`). Cuando podáis, quitad `buildBirds` y su parte de `update` de
  `animals.js` (27 matrices por imagen que ya no se dibujan). No lo he tocado: es vuestro.

- **De Auditoría a Pelota · personajes** (25 nov): en los partidos de campeonato, lo que más pesa en la tarjeta del iPhone
  es el atlas de retratos del público (`retratos()` de `src/actors/crowd3d.js`): 1127×2880 px con mipmaps, 17 MB de los
  65 del partido. En calidad baja, con `ch` 128 en vez de 160 bajaría a unos 11 MB sin que se note a la distancia de la
  grada. Ahora todas las sedes caben (59–63 MB), pero van justas. No lo he tocado: es vuestro.
  Y en el fútbol de El Sadar se dibujan 1,39 millones de triángulos (el partido de pelota, 0,35–0,45): los 25 jugadores
  con el modelo completo de Meshy son 777 000, y las coletas de las chicas (`chicas.js`), 236 000 (unos 20 000 cada una).
  Una coleta más ligera, o el modelo ligero de lejos con la textura buena, lo dejaría en la mitad.

- **De Auditoría a Pelota · interfaz** (25 nov): en `src/pelota/hud.js`, `ready()`, `energy()` y `descansos()` buscan sus
  elementos con `querySelector` en cada imagen del partido (y `energy()` recorre también todas las `.ps-barras`). Guardarlos
  la primera vez, como ya hacen `esprint()` y `timing()`, ahorra trabajo en cada imagen del iPhone. Los `void x.offsetWidth`
  para reiniciar animaciones solo van en los tantos y rótulos: están bien.

- **De Auditoría a Pelota · personajes** (24 nov): por encargo directo del autor («el personaje tiene como unos mechones en
  los laterales, justo encima de la oreja»), repinté del color del pelo los trocitos crema de los rizos de los lados en la
  textura de `src/assets/meshy/explorador.glb`, `meshy/lod/explorador.glb` y `meshy-1024/explorador.glb` (solo esos
  píxeles; la malla, igual). Y quité el contorno del jugador (`src/engine/charLight.js`, `runtime.js`). Si regeneráis el
  explorador desde Meshy, hay que repetirlo.

- **De Auditoría a todas** (24 nov): privacidad (el autor: «que la privacidad sea absoluta»). Si mostráis el nombre del
  jugador o algo que venga de fuera, ya llega limpio (`limpiaNombre` en `src/game/profile.js`), pero escapadlo igual
  (`esc`). No mandéis nada fuera del aparato sin pasar por `src/util/informe.js` (que solo sale con permiso). Ver
  `PRIVACIDAD.md`. Toqué, por la privacidad, `src/hub/hub.js` (Ajustes › Privacidad y el interruptor del informe),
  `index.html` (el enlace `#traspaso=`), `src/util/traspaso.js`, `store.js`, `migra.js` e `informe.js`.

- **De Auditoría a todas** (24 nov): `lab/ref` (los 31 originales de Meshy) ya va en GitHub con Git LFS (`.gitattributes`); el
  autor lo aprobó. Si en vuestra copia salen como archivos de texto pequeños, `git lfs install && git lfs pull`.
- **De Auditoría a Principal** (24 nov): el autor quiere que «todos los archivos se vayan preparando para el futuro»
  (pasar el juego a Unity u otro motor). ¿Podéis añadir a `CLAUDE.md` una regla corta para todas las ventanas? «Los datos
  nuevos, como datos en `src/data` (tablas y textos, sin cálculos mezclados) y, tras cambiarlos, `npm run exportar`;
  guardar los originales de Meshy, Higgsfield y ElevenLabs en su máxima calidad; 1 unidad = 1 metro. Ver `PORTAR.md`».
- **De Principal a Pelota · interfaz** (21 nov, tarde): por encargo del autor («quiero que soluciones el sonido de la
  pelota»), los golpes vuelven a ser los de la versión 3 que eligió el autor, sin `pelota-mano-3.mp3` (llevaba una voz; la
  mano tiene dos variantes, `VARIANTES`), y `src/pelota/audio.js` lleva los golpes por un canal propio
  (`golpes`) que con el comentarista solo baja a 0,6. En `src/pelota/match.js`, el caso `'front'` pasa la fuerza del
  frontis según la velocidad de la pelota. Si tocáis esos sitios, partid de esto.
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

- 26 nov, noche (20.ª), la hizo la ventana de Auditoría (el autor, con capturas: «Hay que corregir estos diseños. Bloques ajustados textos y imágenes»; «No me gusta la línea horizontal del nombre de comarca. Es un juego no una web»): hasta `919350f5`. Perfil: la figura a la altura exacta del bloque de tu nombre (`ENCUADRE_HERO` en `src/hub/hub.js`, `ajustes.css`); galería de pueblos: nombre y misiones juntos y el botón Jugar centrado a su lado (`galeria.css`); torneo de pelota: la comarca solo si no se llama como el pueblo (`frontonBox`); ficha del pueblo con el móvil tumbado: la portada del alto que queda, con las pastillas enteras (`fichas.css`, personaje entero en 8 pueblos a 844×390 y 740×360); fuera la raya delante del nombre de comarca (`fichas.css` y la pantalla de carga en `src/style.css`). Vistas a 1280×720, 844×390 y 390×844; prueba de humo sin errores.
- 26 nov, noche (19.ª), la hizo la ventana de Auditoría (el autor: «Quiero calidad en las figuras de pantalla. Y soluciona lo demás menos lo de las voces»): hasta `8d113000`. Las 44 figuras animadas de los pelotaris también al doble (640 × 960, `public/videos/figuras/hd/`, ampliadas con Real-ESRGAN sin generar nada nuevo; `tools/auditoria-figuras-hd/`): `src/ui/videos.js` elige la de 320, la del doble o la fija nítida, sin estirar nunca, y si una no carga pone la fija. En la pantalla VS del móvil, animadas y nítidas. Productos, Historia y Euskera, en el anillo del menú del juego, detrás de Oficios (`src/hub/hub.js`).
- 26 nov, noche (18.ª), la hizo la ventana de Auditoría (el autor: «Haz todo lo que esté en tu mano»): hasta `336f0d1f`. Olite: Palacio Real con escalinatas, impostas y torre nueva, y Santa María orientada a la plaza con portada gótica de arquivoltas, estatuas, gablete y rosetón; esa portada sale también en las demás iglesias góticas (vista en Lesaka). Archivos de `src/world/` (civic, monuments, monumentosReales, townBuilder).
- 26 nov, noche (17.ª), la hizo la ventana de Auditoría (el autor, con capturas: «Y faltan los fondos», «Aquí faltan espacios»; «Haz todo lo que esté en tu mano»): hasta `a52eea95`. Las cajas con su fondo morado de carta y filo sutil, y el frontón a la vista detrás de las ventanas del partido; aire dentro de los bloques del Perfil; flechas en Productos, Historia y Euskera; ficha del pelotari entera también en 667 × 375 (secciones 23 y 24 de `src/ui/sinCajas.css`).
- 26 nov, noche (16.ª), la hizo la ventana de Auditoría (el autor: «Quiero cajas pero líneas muy sutiles… pero aprovechando los espacios»; «Revisa todo a fondo. Cada página, línea, bloque»): hasta `15f2c534`. Cajas con filo casi transparente en ventanas y bloques de página, a lo ancho y sin caja dentro de caja; Ventajas en columnas, Leyendas en retícula en el móvil, mapa de yacimientos fijo, Láminas sin hueco, ficha del pelotari entera en el móvil (secciones 15 a 22 de `src/ui/sinCajas.css`).
- 26 nov, tarde (15.ª), la hizo la ventana de Auditoría (el autor: «Si», a quitar el recuadro de las tarjetas del Perfil como en el resto del juego): hasta `04a77c1c`. Perfil y ajustes sin cajas: tarjetas, ficha del jugador, lo que llevas y desplegables sueltos sobre el fondo oscuro (sección 14 de `src/ui/sinCajas.css`).
- 26 nov, tarde (14.ª), la hizo la ventana de Auditoría (el autor: «la iconografía de selección de juego, de modo y ajustes que sea de la misma identidad… para selección de ajustes y demás me gustan planos, para lo demás 3D», con permiso de «Vete subiendo todo a la web»): hasta `b38f89d2`. Iconos de ajustes y de selección de modo en línea blanca, como los de la pausa (`src/ui/iconosLinea.js`, mío): Perfil y ajustes, «Cómo jugar» y «Mando del móvil» del menú y las etiquetas de modo de Torneos. Lo demás (sellos, cartas, contadores, carrusel del menú) sigue en 3D; el carrusel del menú, en 3D por decisión del autor («Opción A sin duda»).
- 26 nov, tarde (13.ª), la hizo la ventana de Auditoría (el autor: «no delimites por cuadrícula… oscurezcas el fondo y liberes la información… aprovecha más los espacios… elimina barras separadoras… reordena… menos es más», con permiso de «Vete subiendo todo a la web»): hasta `8c69766f`. Las ventanas que se abren encima (presentación, material, final, pausa, ficha del pelotari, torneo, liga, avisos) sin caja ni sombra sobre el fondo oscurecido, con más aire, en mejor orden y sin rayas ni iconos que repiten (`src/ui/sinCajas.css`).
- 26 nov (12.ª), la hizo la ventana de Auditoría (el autor: «que las conversaciones tengan sentido. Que vaya con el juego… el botillero del rival choca con la cabeza del pelotari», con permiso de «Vete subiendo todo a la web»): hasta `e55569fd`.
- 26 nov (11.ª), la hizo la ventana de Auditoría (el autor: «el botillero del rival tiene que estar en la misma posición que nuestro botillero… todo tiene que ser coherente», con permiso de «Vete subiendo todo a la web»): hasta `50e41468`.
- 26 nov, madrugada (10.ª), la hizo la ventana de Auditoría (el autor: «que metieras alguna mujer también, botillera… los botilleros traspasan mobiliarios… durante el partido los botilleros siguen el partido con atención», con permiso de «Vete subiendo todo a la web»): hasta `46976aca`.
- 25 nov, noche (9.ª), la hizo la ventana de Auditoría (el autor, sobre la pelota: elegir botillero, descanso, cortada y fondos de las tarjetas, con permiso de «Vete subiendo todo a la web»): `master` hasta `0b6783d6`. En «Elige tu pelotari», el botón de tu botillero junto a «Jugar» abre el anillo de los ocho botilleros (cartas con txapelas, escudo de su pueblo, finales y desde cuándo; camisetas de colores, nunca rojas ni azules); el descanso, con fundido a negro y ya sentados, sin beber, toalla ni termo; tras tres tantos perdidos seguidos tu botillero te dice unas palabras; la cortada y el gancho bajan hasta rozar la chapa. Fondos de las tarjetas de la pelota revisados con «Alto contraste» (menú, elegir pelotari y botillero, VS, partido, pausa): todos con su morado. Visto a 1280×720 y 844×390; prueba de humo de `docs/` sin errores.
- 25 nov, noche (8.ª), la hizo la ventana de Auditoría (el autor, sobre el descanso de la pelota, con dos fotos de partidos de verdad, con permiso de «Vete subiendo todo a la web»): `master` hasta `418c33a7`. En el descanso, una sola nevera verde en la contracancha con las sillas plegables negras de cada equipo a los lados; el pelotari se sienta de verdad, bebe y se seca la cara con la toalla; su botillero (un pelotari distinto de los que juegan, con camiseta blanca o negra, vaqueros y sin tacos) se levanta, le habla de pie con el termo y su consejo sale en la ventana de charla, con ánimos y, en la final, «¡Mucho ánimo, que es la final!». Arreglada la búsqueda de huesos que dejaba sin efecto la postura sentada y el apartado de las manos de la cabeza. Lo de Olite que aún no está revisado se quedó fuera. Visto a 1280×720 y 844×390; prueba de humo de `docs/` sin errores.
- 25 nov, noche (7.ª), la hizo la ventana de Auditoría (el autor, sobre la pelota: colores perdidos, aplauso en el saque del último tanto y golpe de la mano, con permiso de «Vete subiendo todo a la web»): `master` hasta `3aaa5bde`. Con Ajustes › «Alto contraste», las tarjetas y bloques del partido mantienen sus morados (antes, negro con bordes blancos); en el tanto que puede acabar el partido, la grada aplaude desde que el pelotari va a sacar hasta el golpe del saque; el golpe de la mano es la palmada contra los tacos que eligió el autor. Lo de Olite que aún no está revisado se quedó fuera. Prueba de humo de `docs/` sin errores.
- 25 nov, noche (6.ª), la hizo la ventana de Auditoría (el autor: «Añade más detalles a las casas, las iglesias, los monasterios, las catedrales… más texturas», con permiso de «Vete subiendo todo a la web»): `master` hasta `670c49f3`. Iglesias y conventos de los pueblos reales con contrafuertes, cornisa con canecillos, óculos y portada de arquivoltas; iglesias con pináculos y gárgolas (góticas), ventanas del ábside, reloj de sol y óculo; la catedral de Tudela con rosetón y un claustro de arquería (antes, ocho columnas sueltas en la hierba); casas con rejas de forja y farol de pared (no en iPhone). Presupuesto: Estella 584 mil triángulos y 401 llamadas, Olite 649 mil y 496, Tudela 576 mil y 409. Visto a 1280×720 y 844×390; prueba de humo de `docs/` sin errores.
- 25 nov, noche (5.ª), la hizo la ventana de Auditoría (el autor: «Seguimos mejorando», con permiso de «Vete subiendo todo a la web»): `master` hasta `3344ef75`. Pueblos reales: las iglesias y conventos que en los datos van como nave (San Juan Bautista en la plaza de los Fueros de Estella, conventos de Estella, Olite, Sangüesa, Tafalla, Viana, Javier y Marcilla) llevan campanario con campanas y reloj; antes parecían almacenes. Visto a 1280×720 y 844×390; prueba de humo de `docs/` sin errores.
- 25 nov, noche (4.ª), la hizo la ventana de Auditoría (el autor: «Vete subiendo todo a la web»): `master` hasta `d11e7890`. Pelota: si ganas el partido, tras el «¡Tanto y partido!» un plano cercano de tu pelotari bailando (unos 5 s, de tres cuartos, con el rival al fondo y sin botones; solo el marcador) y luego los highlights. Visto a 1280×720 y 844×390; prueba de humo de `docs/` sin errores.
- 25 nov, noche (3.ª), la hizo la ventana de Auditoría (el autor: «Vete subiendo todo a la web»): `master` hasta `9334a0d8`. Rocas bien asentadas en las laderas de todos los pueblos y parajes (tumbadas con la pendiente, sin hueco por el lado de abajo) y, en la pelota, la elección de material sin la escena 3D de la caja (queda la tarjeta). Probada en el móvil tumbado (844×390): el mapa carga sin errores.
- 25 nov, noche (2.ª), la hizo la ventana de Auditoría (el autor: «Vete subiendo todo a la web»): `master` hasta `95aca841`. Bardenas como en las fotos del autor: Castildetierra sobre su cerro acarcavado (sin borde apoyado en el llano), cabezos en pirámide con barrancos en V, color dorado, barro cuarteado a rodales, matas en las hondonadas y casetas de una planta. Probada en el móvil tumbado (844×390): el mapa carga sin errores; Bardenas, 215.000 triángulos.
- 25 nov, noche, la hizo la ventana de Auditoría (el autor: «Vete subiendo todo a la web»): `master` hasta `3c58cb5b`. Bardenas rehechas, casas con detalles curvos, vidrieras y puertas en los monumentos, monumentos y casas bien asentados, revisión de casas, iglesias, castillos y frontones, y pueblos con más verde, nubes con volumen, sombras en las ventanas de noche, pájaros nuevos y ropa tendida al viento. Probada en el móvil tumbado (844×390): el mapa carga sin errores.
- 25 nov, tarde, la hizo la ventana de Auditoría (el autor: «sí», publicar): `master` hasta `7d26b4dc`. La roca de la isla también por pasos (sus anillos): el peor trabajo de una imagen al tocar una comarca, unos 30 ms. Probada en el móvil tumbado (844×390): el mapa carga sin errores y la isla sube entera.
- 25 nov, mediodía, la hizo la ventana de Auditoría (el autor: «sí», publicar): `master` hasta `65763e25`. La isla del mapa sin parones al tocar una comarca (vídeo del iPhone de las 09:43): las texturas de detalle se leen en otro hilo y se suben a trozos, y el contorno ampliado, la losa, la roca y el relieve fino se hacen por pasos; el peor parón, de 0,38 s a 0,06 s. Vista la isla subiendo en el móvil tumbado (844×390) y en el ordenador (1280×720), sin errores.
- 25 nov, la hizo la ventana de Auditoría (el autor: «publica todo»): `master` hasta `84ee516c`. iPhone: los 39 pueblos y parajes dentro del presupuesto (rocas que comparten forma, el primer dibujo tapado sin lo lejano, recorte de texturas cada 2 s, El Sadar más ligero) y más fluidos (la escena ya no recoloca lo quieto ni lo lejano en cada imagen; peces); las 9 sedes de campeonato dentro de 65 MB (el Labrit, de 69 a 63); se vuelve a entrar en los campeonatos; la cámara del fútbol sin recolocar la página en cada imagen; Palacio Real de Olite y castillo de Javier sobre su planta real; privacidad (informe solo con permiso), material didáctico con más aire, explorador sin la línea rota. Probada en el móvil tumbado (844×390): el mapa carga sin errores.
- 24 nov, tarde, la hizo la ventana de Auditoría (el autor: «publica los arreglos de la isla flotante»): `master` hasta `9bfa354d`. La isla flotante sin parones al elegir comarca ni al pasar de una a otra (se hace por pasos y la búsqueda del borde va por una rejilla), sin tirones en el vuelo de dron (las texturas de cerca se suben cuando la cámara está quieta); la montura con arreos (silla, cabezada y riendas); y el código sin funciones que nada usaba.
- 23 nov, noche (tarde), la hizo la ventana del tráiler: fuera las casas, las ovejas y los islotes de Higgsfield (al autor no le gustan: «elimínalo y déjalo como estaba»). Otsagabia y el mapa, como antes.
- 23 nov, noche, la hizo la ventana del tráiler (el autor pidió verlo en el juego): `master` hasta `b868745c`. En Otsagabia, caserío, casa de piedra y borda hechos en 3D con Higgsfield y tres ovejas latxas, junto al camino del río a la salida del crucero; en el mapa, tres islotes flotantes de Higgsfield alrededor del Pirineo cuando sube; el humo al despegarse la comarca; en el encierro, Fermín como el original (cabeza a su tamaño y talla del explorador).
- 23 nov, madrugada, la hizo la ventana principal: `master` hasta `0f020592`. La entrega de la txapela con la pantalla
  gigante del frontón y las autoridades aplaudiendo (la txapela ya no la atraviesa el pelo); en Progreso, el ranking de
  pelotaris por puntos tipo ATP con una pestaña por competición; y la elección de material con la caja de pelotas en 3D.
- 22 nov, noche (tarde), la hizo la ventana principal: `master` hasta `7bdd9d29`. Fuera «Por dentro»: los oficios de antes y las láminas de cómo se hacen las cosas, juntos en una sola sección «Oficios» del menú, con pestañas; «Verlo paso a paso» en vez de «Verlo por dentro» en las misiones y las fichas.
- 22 nov, noche, la hizo la ventana principal: `master` hasta `c13dcfa9`. El 4½ mucho más ganable (rival más blando solo en esa modalidad, `CUATRO.AYUDA`); fuera el bote que zumbaba (`pelota-bote-3`) y los pájaros, grillos, búhos y animales del pueblo que sonaban durante los partidos; números y rayas de la pared izquierda más finos y equilibrados; en Altsasu, al acabar la misión, los momotxorros salen alrededor del jugador y corren con él hasta la plaza.
- 22 nov, tarde, la hizo la ventana principal: `master` hasta `b27e8024`. Narrador (Salva) en las láminas del queso, el rosado, el espárrago y el piquillo; las otras nueve con pasos, con su guion y subtítulos que pasan solos hasta grabar sus voces; el visor de láminas con fondo opaco también en ordenadores con gráfica floja.
