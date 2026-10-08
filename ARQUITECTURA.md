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
| `src/pelota/` | Motor de pelota a mano independiente: reglas, física, IA (cinco niveles en `rules.js`), HUD, cancha, fichas técnicas de los pelotaris (`ficha.js`: datos inventados que salen del nombre, cualidades y golpes), el frontón que juega (`courtFeel` en `rules.js` y `setFeel` en `physics.js`: a cubierto, piedra, mojado o Labrit) y la pantalla VS (`vs.js`) |
| `src/game/pelotaris.js` | Colección de pelotaris: uno por pueblo, su carta al jugar contra él y los demás en silueta, por comarcas |
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
| `pelota-vs-ver.mjs` | El panel del partido, la pantalla VS, el partido (marcador sobre el frontis, FALTA y PASA, tu energía, AUTO) y la colección en el móvil tumbado (con `clear` o `rain`) |
| `pelota-golpe-auto.mjs` | Golpe automático: quieto no se gana, moviéndose sí; los botones siguen valiendo (sin gráficos) |
| `minijuegos-comarcas.mjs` | Un pueblo de cada comarca: misiones con anfitrión y datos válidos, y sus minijuegos jugados con sus datos |
| `blender/fauna/derivar.py` | Crea la oveja, la cabra, el cerdo y el jabalí a partir de otros modelos |
| `blender/fauna/sentado.py` | Crea la pose «Sentado» de los perros |
| `blender/arq/` | Puente de Ochagavía (blockout) |

Las pruebas usan Chromium con SwiftShader (muy lento), así que **simulan el tiempo de juego** llamando a
`update(1/30)` en bucle, en vez de esperar a los fotogramas.

## Publicar

```
npx vite build
cp dist/index.html docs/index.html
cp dist/index.html MENDIMENDIZ-jugar.html
git push origin master:main
```
