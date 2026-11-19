# Coordinación entre ventanas

Lo lee y lo actualiza cada ventana de Claude antes de empezar y antes de subir (ver `CLAUDE.md`). Corto y al día: lo que
ya no vale, se borra.

## Quién lleva qué

| Ventana | Lleva | Archivos suyos |
| --- | --- | --- |
| **Principal** (coordinación) | Juntar lo de todas, compilar y publicar la web; la personalización de los pelotaris (equipación) y las cartas animadas; las voces, de momento solo Otsagabia (el autor, 18 nov) | `docs/`, la rama `main`, `CLAUDE.md`, `COORDINACION.md`, `src/assets/voz/`, `src/game/vozVecinos.js`, `src/assets/frontones*/`, `src/pelota/kit.js`, `src/pelota/equipacion.js`, `src/ui/pantalla.js`, `public/videos/figuras/` |
| **Pelota · interfaz** (rótulos, animaciones de texto, carruseles, pantallas de frontón) | Todo lo que se ve encima del partido y los menús de pelota | `src/pelota/hud.js`, `src/pelota/vs.js`, `src/pelota/ficha.js`, `src/game/torneo.js`, `src/game/carrusel3d.js`, `entrega/interfaz-pelota/` |
| **Pelota · personajes** (los 10 pelotaris de siempre, público, jueces, vecinos del mismo estilo) | Modelos 3D y cómo se mueven | `src/actors/`, `src/assets/meshy*/`, `src/assets/chicas/`, `tools/blender/`, `tools/meshy-*`, `tools/chicas/` |
| **Otsagabia · locución** | Cerrada. Solo retoques de voces de Otsagabia si el autor los pide | `src/assets/voz/vecinos/ochagavia/`, `entrega/voces-ochagavia-pendientes.md` |
| Pelotaris nuevos de Meshy | **Parado** por el autor el 18 nov. Estado y cómo retomarlo: `investigacion/pelotaris-nuevos/LEEME.md` | `investigacion/pelotaris-nuevos/` |

## Listo para publicar

Lo que está en `master` y todavía no se ve en la web. Lo añade quien lo sube; lo borra quien publica.

- **NO PUBLICAR hasta que el autor dé el visto bueno** (18 nov, noche: «enséñame todo antes de publicar»). En `master`,
  sin compilar en `docs/`: el partido de pelota (números de la pared izquierda legibles, rayas del suelo que no vibran,
  público un 9 % menor, dificultad rebajada) y el carrusel de campeonatos (portadas más anchas, nombre grande, anillo de
  borde a borde, fondo con profundidad) y la grada del partido con menos gente, cada espectador suelto y en 3D, y con
  el movimiento de levantarse, celebrar y sentarse (`actors/crowdAnim.js`, nuevo, de Principal); y las quince portadas
  del carrusel de campeonatos regeneradas a 2048 px, con tres tamaños y la nítida solo en la de delante
  (`assets/pelota/fondos/{media,hd}`, `carrusel3d.js` «LA IMAGEN NÍTIDA», `torneo.js` `nitida`); y el plano de dron
  de la grada tras un buen tanto (`match.js` `dronGrada`, `game.js` `pausaTanto`, `hud.js` `.pel-root.dron`, de
  Principal por encargo directo del autor); y la cámara de las charlas con los vecinos, más lejos (`camera.js`
  `charla`); y el público con las manos sobre los muslos y la palma hacia abajo, el aplauso nuevo y la grada sin
  pancartas de «¡Aupa…!» (`actors/crowdAnim.js`, `game/fronton.js`, 19 nov); y el esprint a mano de la pelota (botón
  ESPRINT y Mayúsculas, también en el mando: `pelota/game.js`, `match.js`, `hud.js`, `rules.js`, `mando/contextos.js`,
  `public/mando/`) con la cámara que deja ver el golpe al fondo (`match.js` `encuadra`, 19 nov). Si otra ventana
  necesita publicar lo suyo, que pregunte antes al autor.

## Peticiones entre ventanas

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
  que rehacerla. Y la equipación del jugador (zapatillas, muñequeras y faja) se pinta en `src/actors/npcOutfit.js`
  (`KIT`, `kitMedidas`), midiendo el esqueleto de cada `pelotari_<nombre>`: si cambiáis sus huesos o su ropa, avisad.
  Los vecinos y su calidad son vuestros (el autor, 18 nov: «los vecinos los están haciendo en otro chat»).

## Última publicación

- 18 nov, 15:46 UTC (despliegue de GitHub correcto), la hizo la ventana principal: todo lo de `master` hasta `1ad608c5` (la
  «pantalla de juego» en pelota y fútbol: atrás arriba, contenido con aire y botón grande abajo; y el inicio en el móvil
  tumbado: comarcas por encima de la raya de inicio y el menú con todas las secciones a la vista).
