# Pasar HERRIZHERRI a otro motor (Unity, Godot, Unreal)

El juego está hecho para el navegador con three.js, pero todo lo que lo compone se puede llevar a un motor grande, completo
y en su máxima calidad: los datos salen en JSON; los pueblos, el mapa y las islas, como modelos 3D (.glb) con los
sombreadores del juego aparte; los personajes y animales, sin comprimir; las alturas de Navarra, listas para el terreno
de Unity; las imágenes en PNG, las letras en TTF, y los originales de partida (Meshy, Envato, la música), reunidos y
catalogados. Esta guía dice qué hay, dónde está y cómo sacarlo. (Auditoría del 24 de noviembre de 2026; el autor:
«comprobar que está todo perfecto en GitHub para pasarlo a motores de videojuegos ya más grandes como Unity» y «que todo lo
que se pase a Unity esté completo, en la mayor calidad posible».)

## De una vez: todo, en `exportar/`

```
npm run exportar:todo [carpetas con los originales…]     # node tools/exportar-todo.mjs (SIN=pueblos,mapa para saltarse esas)
```

| Carpeta | Qué hay | Herramienta |
| --- | --- | --- |
| `datos/` | Todos los datos del juego en JSON (159 módulos, 7 MB). **Va en el repositorio.** | `exportar-datos.mjs` |
| `relieve/` | Las alturas de verdad de Navarra y alrededores (173 × 185 km, cada 145 m, hasta 2.629 m): PNG de 16 bits y RAW de 2049 × 2049 para el Terrain de Unity, con su .json (medidas y cómo importarlo) | `exportar-relieve.mjs` |
| `modelos/` | Los 88 modelos del juego (personajes, vecinos, seres, animales, objetos) sin comprimir, con esqueleto, animaciones y texturas PNG | `exportar-modelos.mjs` |
| `originales/` | Los archivos de partida, mejores que los del juego (ver abajo), con `catalogo.json`: de qué archivo del juego es cada uno | `exportar-originales.mjs` |
| `pueblos/` | Los 39 pueblos construidos, en .glb, a la calidad más alta del juego | `exportar-pueblo.mjs` |
| `mapa/` | El mapa de Navarra en 3D y la isla flotante de cada comarca, en .glb | `exportar-mapa.mjs` |
| `sombreadores/` | El código GLSL de cada material propio del juego (suelo, agua, tejados, relieve, islas…), con `indice.json`: tipo, valores y en qué escenas sale | (lo sacan pueblos y mapa) |
| `texturas/` | Las 4.400 imágenes en PNG, con la misma ruta | `exportar-texturas.mjs` |
| `sonido/`, `video/` | Los 1.211 sonidos (MP3: voces, música, efectos) y los 44 vídeos (MP4) | `exportar-medios.mjs` |
| `fuentes/` | Las letras del juego en TTF (Barlow, Barlow Condensed, Nunito, Lilita One; licencia OFL), para TextMeshPro | `exportar-medios.mjs` |
| `web/` | Las láminas interactivas (`public/anatomia`) tal cual | `exportar-medios.mjs` |
| `comprobacion.json` | Cada .glb pasado por el validador oficial de Khronos (los de glTF) | `exportar-comprobar.mjs` |
| `indice.json`, `medios.json` | Qué hay y cuánto ocupa | |

Todo menos `datos/` se saca cuando haga falta (varios GB; no va en GitHub). Lo que necesita el juego en marcha (datos,
pueblos, mapa) usa el servidor de desarrollo (`npx vite --host 127.0.0.1 --port 5173`). Las herramientas abren el juego
en un Chromium sin ventana (Playwright, ya en `node_modules`); si no está en `/opt/pw-browsers/chromium`, se dice dónde con
`CHROMIUM=<ruta>`. Las letras se pasan a TTF con fontTools de Python (`pip install fonttools brotli`).

## Los cambios de aquí, en GitHub y en Unity

> **En pausa desde el 24 nov**: el autor sigue con la web; Unity queda preparado (`unity/LEEME.md`) para retomarlo.

1. Cada cambio que se hace en el juego se sube a GitHub (rama `master`), siempre.
2. Si toca los datos (`src/data` y los demás módulos de datos), GitHub vuelve a sacar `exportar/datos` solo
   (`.github/workflows/exportar-datos.yml`) y lo sube si ha cambiado algo. La fecha de cada JSON solo cambia si cambian
   sus datos.
3. El proyecto de Unity es `unity/HERRIZHERRI`, en este mismo repositorio, y el juego en C# va en el paquete
   `unity/com.herrizherri.juego` (el proyecto lo trae solo). Al abrirlo (o con el menú **HERRIZHERRI → Traer los cambios
   del juego**), `SincronizarDesdeElJuego.cs` copia lo nuevo de `exportar/` a `Assets/HERRIZHERRI/` y Unity lo reimporta.
   En el ordenador de Unity basta con «Pull» (o `git pull`) antes de abrirlo.
4. Lo pesado (modelos, pueblos, mapa, texturas) se saca cuando haga falta con `npm run exportar:todo`. Los pueblos no se
   copian a Unity: se leen de `exportar/pueblos` al jugar.
5. **Ya se juega**: menú **HERRIZHERRI → Jugar en un pueblo…**, se elige un pueblo exportado y el explorador (o la
   exploradora) anda y corre por él, con su cámara, chocando con el suelo y las casas (`JuegoPueblo.cs`). Es la base de la
   fase 1 del plan; los vecinos, las misiones, el sonido y la pelota vienen después.
Ver `unity/LEEME.md`.

## 1. Los datos → JSON

```
npm run exportar            # node tools/exportar-datos.mjs: exportar/datos/<módulo>.json e indice.json
```
Cada módulo de `src/data` (145) sale con todo lo que exporta como datos, y también los que tienen datos junto a su código
(20 más, en `exportar/datos/juego/`): el guion y los comentarios de la pelota (`pelota/guionVoz`, `pelota/comenta`), las
reglas de la pelota y del fútbol, los torneos, los talleres, las aventuras de los pueblos, los trajes, el material
didáctico, los emblemas y Salazar. En el repositorio va ya una copia hecha
(`exportar/datos/`, fecha en cada archivo); si los datos cambian, se vuelve a lanzar. Lo principal:

| Archivo | Qué es |
| --- | --- |
| `levels.json` | Los 39 pueblos jugables: comarca, familia de arquitectura, relieve, río, iglesia, monumentos, misiones, oficios, tiendas… |
| `comarcas.json`, `comarcas-encaje.json` | Las 12 comarcas: nombre, color, contorno del mapa |
| `reales/*.json` | Cada pueblo según OpenStreetMap: calles, casas (planta y alturas), plazas, río, iglesia en su sitio |
| `relieve.json`, `polar/*.json`, `sierras/*.json`, `mapa-relieve.json` | El relieve: el de cada pueblo, el horizonte y el mapa de Navarra |
| `personajes.json`, `cast.json`, `nombres.json`, `sabios.json` | Vecinos, sabios y el reparto del jugador |
| `legends.json`, `folklore.json`, `cuentos.json` | Leyendas, tradiciones y cuentos |
| `oficios.json`, `procesos.json`, `laminas.json`, `narraLaminas.json` | Oficios y láminas, con sus pasos y su narración |
| `fauna.json`, `flora.json`, `setas.json`, `bosques.json`, `mountains.json` | Naturaleza: especies, setas, bosques, las 120 cimas |
| `frontones.json`, `pelotaris.json`, `frontonArq.json`, `equipo.json` | Pelota: frontones reales, pelotaris, arquitectura de las canchas, equipos |
| `eu*.json`, `hitzak.json` | Los textos en euskera |

En cada archivo, `funciones` lista las funciones que tenía el módulo (por ejemplo `levelById` en `levels.js`): son la
lógica que hay que reescribir en el otro motor; el código está en el `fuente` que dice el mismo archivo.

## 2. Los pueblos, el mapa y las islas → .glb

```
npm run exportar:pueblos                         # o: node tools/exportar-pueblo.mjs lesaka,etxalar
node tools/exportar-mapa.mjs                     # Navarra y las 12 islas (SOLO=baztan,… para algunas)
```
Entra en cada pueblo como un jugador, en la **calidad más alta** del juego (`?q=high`, sin el aligerado automático, con
los árboles, el suelo y los animales de todo el pueblo a la distancia de detalle máxima, las piezas de detalle de todas
las casas y texturas de hasta 4096) y guarda la escena en `exportar/pueblos/<id>.glb`: terreno, calles empedradas, casas
con tejados, ventanas, marcos y macetas, iglesia, frontón, río y puentes, árboles, mobiliario, vecinos y animales. El mapa
del inicio sale igual (`exportar/mapa/navarra.glb`, con el relieve fino ya metido en la malla) y cada isla flotante con
su canto y su sima (`isla-<comarca>.glb`). Notas:
- Los materiales propios del juego (sombreadores: el suelo, el agua, los tejados pintados, el relieve) no existen en
  glTF: salen como material estándar con su color y su textura principal, y llevan en sus *extras* `sombreador: <id>`; el
  código de cada uno está en `exportar/sombreadores/<id>-<nombre>.vert/.frag`, para rehacerlo en Shader Graph o HLSL.
  Los estándar que el juego retoca llevan `sombreadorExtra: <id>`.
- Los vecinos van en su versión ligera, para saber dónde está cada uno; los modelos enteros están en `modelos/` y en
  `originales/`.
- El cielo, las nubes, la lluvia y las partículas no se exportan (cada motor tiene los suyos).
- El código que los construye está en `src/world` (abajo); exportarlos ya hechos evita tener que reescribir la
  generación para empezar.

## 3. Personajes, animales y objetos → .glb sin comprimir

```
npm run exportar:modelos            # src/assets → exportar/modelos (88 modelos)
```
El juego los guarda comprimidos para la web (`EXT_meshopt_compression`, `KHR_mesh_quantization` y texturas WebP,
`EXT_texture_webp`), que Unity con [glTFast](https://github.com/Unity-Technologies/com.unity.cloud.gltfast), Godot o Blender
no siempre leen. Aquí salen descomprimidos, con las texturas en PNG y el mismo esqueleto y animaciones. No salen las copias
rebajadas que el juego usa en el móvil o de lejos (`meshy-1024`, `meshy/lod`; con `TODOS=1`, sí).

## 4. Los originales, en su máxima calidad

```
node tools/exportar-originales.mjs <carpeta con las descargas de Meshy, Envato…>     # + lab/ref, siempre
```
Lo del juego está rebajado para la web; los archivos de partida son mejores. Se reúnen, se quitan los repetidos y se
apunta en `exportar/originales/catalogo.json` de qué archivo del juego es cada uno (emparejados por su malla):
- `personajes/`: los vecinos de Meshy con su esqueleto y todas sus animaciones (texturas PNG de 2048, sin pérdida).
- `animaciones/`: cada animación de Meshy suelta y, juntas en un archivo por cuerpo, `explorador-animaciones.glb` (sus 8
  movimientos y sus **3 texturas PBR**: color, relieve y rugosidad, que el juego no usa) y `exploradora-animaciones.glb`
  (9 movimientos).
- `sonido/`: los paquetes de Envato descomprimidos (WAV de partida); `musica/`: la música y las locuciones del autor;
  `imagenes/`: las panorámicas y portadas de bosque; `modelos/`: el caballo, los árboles y un paquete de Unity.
Los originales de Meshy de `lab/ref` (31 .glb, 282 MB) están en GitHub con Git LFS (el sistema de GitHub para archivos
grandes; al clonar, `git lfs install` y `git lfs pull`). Las descargas de Envato, la música y las panorámicas, no: conviene
guardarlas en el ordenador (el autor tiene la copia en 5 .zip del 24 de noviembre).

## 5. Imágenes, sonido, vídeo y letras

```
npm run exportar:texturas            # todo src/assets → exportar/texturas (PNG)
node tools/exportar-medios.mjs       # sonido/, video/, fuentes/ (TTF), web/ y medios.json
```
Unity no importa WebP sin complemento: las 4.400 imágenes pasan a PNG con la misma ruta. Los sonidos son MP3 y los
vídeos MP4 (Unity los lee tal cual); las voces de los vecinos van por pueblo (`voz/vecinos/<pueblo>/`) y su guion en
`src/game/vozVecinos.js`. Las letras, de los `@font-face` del juego, en TTF.

## Medidas y ejes

- **Pueblos, frontones y campos**: 1 unidad = 1 metro, Y hacia arriba.
- **Mapa del inicio** (`src/hub/mapa3d*.js`): 1 unidad = 2 km; el relieve, exagerado (`EXA` en `src/hub/mapa3dFormas.js`).
- three.js es **diestro** y Unity **zurdo**: al importar un .glb, glTFast ya da la vuelta al eje Z. Si se leen
  posiciones de los JSON (casas, rutas, puntos de misión), hay que cambiar el signo de Z (x, y, z) → (x, y, −z) y girar
  los ángulos de rumbo al revés.
- Los ángulos van en radianes; los colores, en hexadecimal sRGB.

## Dónde está cada cosa (para reescribir la lógica)

| Carpeta | Qué hace |
| --- | --- |
| `src/main.js` | El arranque: carga el perfil, abre el menú, entra y sale de pueblos, partidos y minijuegos |
| `src/hub/` | El menú: el mapa 3D de Navarra con las islas de cada comarca (`mapa3d.js`, `mapa3dIsla.js`), galerías, perfil, colecciones |
| `src/game/` | El juego en el pueblo: `townGame.js` (misiones, charlas, actividades), `npcs.js`, `montura.js`, `mercado.js`, `torneo.js`, `profile.js` (el guardado) |
| `src/world/` | La construcción del pueblo: terreno (`terrain.js`, `heightfield.js`), calles y casas (`townReal.js`, `houses.js`, `builder.js`), iglesia y monumentos, río y puentes (`water.js`), árboles y flores (`nature.js`, `flora3d.js`), cielo y tiempo |
| `src/actors/` | Personajes y animales: carga de los .glb, animaciones, agarre de objetos, movimientos de pelota |
| `src/pelota/` | El partido de pelota: reglas y física (`match.js`), cancha (`court.js`), cámara, comentarios, interfaz |
| `src/futbol/` | El fútbol de El Sadar y la liga |
| `src/ui/` | Interfaz: HUD, charlas, cuaderno, láminas, iconos (SVG propios), retratos |
| `src/audio/`, `src/audio.js` | Música, ambiente y efectos |
| `src/engine/` | El bucle de dibujo, la luz y el posprocesado |
| `src/data/` | Los datos (ver arriba) |

## El guardado

Todo en el `localStorage` del navegador; en otro motor, un archivo por jugador con lo mismo:
- `herrizherri-perfil-v1`: el perfil (`src/game/profile.js`): nombre, personaje, XP, por pueblo las misiones hechas y
  el sello (`towns: { id: { done: {índice: true}, stamp, visits, best } }`), cartas de saber, especies vistas, cimas,
  insignias y ajustes.
- `herrizherri-salazar-v2`: la partida de la aventura de Otsagabia.
- `herrizherri-pelota-*`: ajustes del partido (cámara, consejos, herramienta).
- Los demás (`-rastro`, `-cortes`, `-perdidas`, `-aviso-grafica`, `-post`, `-vista-corta`) son de diagnóstico y de la
  versión web: no hace falta llevarlos.

## El plan para pasarlo entero a Unity (y lo que costaría)

Estado del juego que hay que llevar (24 nov 2026): unas 77.000 líneas de JavaScript (sin contar los datos), 6.500 de
estilos, 46 archivos con sombreadores propios, 39 pueblos, 12 comarcas, 176 modelos, 1.200 sonidos y 4.400 imágenes.
Unity no convierte JavaScript: **la lógica se reescribe en C#**; lo que se lleva tal cual son los datos, los modelos,
los sonidos, las imágenes y los pueblos ya construidos (lo que sacan las herramientas de arriba).

### Por fases (meses de trabajo de una persona con experiencia en Unity)

| Fase | Qué | Meses |
| --- | --- | --- |
| 1. Base | Unity 6 con URP (el modo ligero, para móviles), glTFast, Input System, Addressables (cargar por partes), localización castellano/euskera, el guardado; importar los JSON y los modelos | 1–1,5 |
| 2. El pueblo jugable | Personaje y cámara, cargar el pueblo exportado (.glb), choques, vecinos y charlas con su voz, misiones leídas de los JSON, HUD, mochila, mapa del pueblo, día y noche, tiempo | 4–5 |
| 3. Construir los pueblos en C# | Para cambiar pueblos o hacer nuevos sin pasar por la web (al principio se puede jugar con los exportados) | 2–3 |
| 4. Menú y mapa de Navarra | El mapa 3D con las islas flotantes, el dron, las nubes; sus sombreadores pasados a Shader Graph | 2–3 |
| 5. Pelota | Partido, rival, cámaras, comentaristas, campeonatos, público | 3–4 |
| 6. Lo demás | Fútbol, encierro, almadía, monturas, tractores, oficios y láminas, colecciones | 3–4 |
| 7. Arte y acabado | Materiales, luz, agua, cielo y efectos con la calidad de Unity (artista técnico) | 2–3 |
| 8. Pruebas y tiendas | Rendimiento en móviles, App Store y Google Play | 1,5–2 |
| **Total** | | **≈ 19–26** |

Con un equipo de 2 o 3 personas, de 8 a 12 meses. Se puede ir por partes: las fases 1 y 2 ya dan un juego de pueblos
jugable en Unity (unos 6 meses de una persona).

### Coste orientativo

- **Personas.** Un desarrollador de Unity en España cobra de media unos 57.000 € brutos al año (Jooble);
  con lo que paga la empresa, unos 6.000 € al mes. 19–26 meses-persona: **de 115.000 a 160.000 €**. Un estudio o
  autónomos pueden salir más caros por hora y más baratos si se ajusta el alcance.
- **Con Claude haciendo la mayor parte del C#** (la conversión de los sistemas, uno a uno, a partir de este código) y
  una persona con Unity que lo monta, lo prueba en el editor y en los móviles, el trabajo de personas puede bajar a la
  mitad o menos: **unos 8–12 meses-persona, de 50.000 a 75.000 €**, más la suscripción de Claude. Es una estimación: el
  editor de Unity necesita a alguien delante (licencia y ventanas), así que no se puede hacer todo en remoto.
- **Licencias.** Unity Personal es gratis mientras los ingresos más la financiación de los últimos 12 meses no pasen de
  200.000 $ (y con Unity 6 sin el logo de Unity al arrancar). Si se pasa, por ejemplo con una ronda de inversión, Unity
  Pro cuesta 2.310 $ por puesto y año (210 $ al mes). Para publicar: Apple Developer, 99 $ al año; Google Play, 25 $
  una vez; y un Mac para compilar para iPhone, si no se tiene.
- **Otras salidas.** Godot es gratis y sin comisiones (también con C#), con un esfuerzo parecido. Y si lo primero es
  estar en la App Store y en Google Play, la versión web se puede envolver como app (Capacitor) en unas semanas, sin
  reescribir nada; Unity tendría sentido después, para dar el salto de calidad.

### Para que todo siga preparado (cada vez que se añade algo)

1. **Los datos, como datos.** Lo nuevo (pueblos, misiones, vecinos, frases) en `src/data`, en tablas y textos, sin mezclar
   cálculos: así sale entero en el JSON. Después de cambiar datos: `npm run exportar` (deja `exportar/datos` al día).
2. **Los originales, guardados.** Para la web se comprimen modelos, texturas y sonidos; para un motor grande hacen falta
   los originales en su máxima calidad: los modelos de Meshy (FBX o GLB con texturas de 2K o 4K), las imágenes de
   Higgsfield y los audios de ElevenLabs tal como se descargan. Siguen en sus cuentas; conviene no borrarlos y guardar
   copia. Los modelos originales de `lab/ref` (31 .glb, 282 MB) van en GitHub con Git LFS (`.gitattributes`).
3. **Medidas reales.** 1 unidad = 1 metro en todo lo que se juega; los personajes a su altura real (el explorador, 1,4 m).
4. **Nombres claros** en las piezas 3D (`casa`, `iglesia`, `rio`…): el .glb del pueblo lleva esos nombres a Unity.
5. **Herramientas al día.** Si un sistema nuevo crea cosas que no son three.js estándar (otro tipo de geometría, otro
   material), comprobar que `node tools/exportar-pueblo.mjs <pueblo>` lo sigue sacando y que se abre bien.

## Lo que es solo de la versión web

`src/web/` (el service worker, la carga por partes), `vite.config.js`, `docs/` (la web publicada), el informe a Vercel
(`src/util/informe.js`) y el modo de bajo consumo para iPhone (`src/util/sencillo.js`): en un motor nativo no hacen falta.
