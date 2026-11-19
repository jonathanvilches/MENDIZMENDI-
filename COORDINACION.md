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

- (nada: el 19 nov por la noche se publicó `master` entero, ver «Última publicación»)

## Peticiones entre ventanas

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

- 19 nov, noche, la hizo la ventana principal, por orden del autor («Falta publicar el botón de sprint y el cambio de cámara
  para restar el rebote. Revisa todo lo que falte… Y subir también los gestos y demás»): **`master` entero, sin quitar
  nada**, hasta `64a8f617`. Entra lo que esperaba visto bueno: el esprint y la cámara del fondo (`c2943be6`), los botones
  discretos y transparentes con el aro de color (`8ec5c4a8`, `971f78ed`), la cámara y el golpe tras el rebote
  (`1f40a775`), el público nuevo con las manos y el aplauso (`6d07d896`, `2b84db42`, `9f7ce5d0`) y los planos de la
  grada desde las cámaras de una retransmisión (`e73da537`); y además los carruseles de selección más rápidos
  (`9a5aada9`) y las texturas que se sueltan al cargar solo el frontón (`64a8f617`). Vuelven también la grada sin carteles
  de «¡Aupa…!» y la cámara de las charlas más lejos, que ya se habían publicado en la séptima ronda y que las tres
  publicaciones anteriores de esa noche quitaron sin querer al dejar fuera `9f7ce5d0` entero. Desde ahora, si hay que
  dejar algo fuera de una publicación, se quita solo lo que no tiene visto bueno, nunca un commit entero que lleve
  también algo aprobado.
  Encima, la misma noche, los botones del partido con un relleno de su color (`hud.js`; el autor: «que no sean
  transparentes del todo, porque si no, no se ven»). Y después, CORTADA turquesa y DEJADA azul (`cf6f74b6`), la tarjeta
  de la misión que lleva directa a ella y menos bandadas de pájaros en los pueblos (`34f69b65`).
  Y por último esa noche, los botones del partido en arco a la misma distancia, GOLPE más pequeño, sin botones con el
  móvil de mando, y el descanso sin parar el partido (`56bebc51`).
