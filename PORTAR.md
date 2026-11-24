# Pasar HERRIZHERRI a otro motor (Unity, Godot, Unreal)

El juego está hecho para el navegador con three.js, pero todo lo que lo compone se puede llevar a un motor grande: los
datos salen en JSON, los pueblos construidos salen como modelos 3D (.glb), los personajes y animales salen en .glb sin comprimir, los
sonidos son .mp3 y las imágenes se pasan a PNG con una orden. Esta guía dice qué hay, dónde está y cómo sacarlo.
(Auditoría del 24 de noviembre de 2026; el autor: «comprobar que está todo perfecto en GitHub para pasarlo a motores de
videojuegos ya más grandes como Unity, todas las estructuras».)

## Lo que hay que preparar una vez

```
npm install
npx vite --host 127.0.0.1 --port 5173      # el servidor de desarrollo: las herramientas de exportar lo usan
```
Las herramientas abren el juego en un Chromium sin ventana (Playwright, ya en `node_modules`); si no está en
`/opt/pw-browsers/chromium`, se dice dónde con `CHROMIUM=<ruta>`.

## 1. Los datos → JSON

```
node tools/exportar-datos.mjs            # deja exportar/datos/<módulo>.json y exportar/datos/indice.json
```
Cada módulo de `src/data` (145) sale con todo lo que exporta como datos. En el repositorio va ya una copia hecha
(`exportar/datos/`, fecha en cada archivo); si los datos cambian, se vuelve a lanzar. Lo principal:

| Archivo | Qué es |
| --- | --- |
| `levels.json` | Los 39 pueblos jugables: comarca, familia de arquitectura, relieve, río, iglesia, monumentos, misiones, oficios, tiendas… |
| `comarcas.json`, `comarcas-encaje.json` | Las 12 comarcas: nombre, color, contorno del mapa |
| `reales/*.json` | Cada pueblo según OpenStreetMap: calles, casas (planta y alturas), plazas, río, iglesia en su sitio |
| `relieve.json`, `polar/*.json`, `sierras/*.json`, `mapa-relieve.json` | El relieve: el de cada pueblo, el horizonte y el mapa de Navarra |
| `personajes.json`, `cast.json`, `nombres.json`, `sabios.json` | Vecinos, sabios y el reparto del jugador |
| `legends.json`, `folklore.json`, `cuentos.json`, `heritage.json` | Leyendas, tradiciones, patrimonio y cuentos |
| `oficios.json`, `procesos.json`, `laminas.json`, `narraLaminas.json` | Oficios y láminas, con sus pasos y su narración |
| `fauna.json`, `flora.json`, `setas.json`, `bosques.json`, `mountains.json` | Naturaleza: especies, setas, bosques, las 120 cimas |
| `frontones.json`, `pelotaris.json`, `frontonArq.json`, `equipo.json` | Pelota: frontones reales, pelotaris, arquitectura de las canchas, equipos |
| `eu*.json`, `hitzak.json` | Los textos en euskera |

En cada archivo, `funciones` lista las funciones que tenía el módulo (por ejemplo `levelById` en `levels.js`): son la
lógica que hay que reescribir en el otro motor; el código está en el `fuente` que dice el mismo archivo.

## 2. Los pueblos construidos → .glb

```
node tools/exportar-pueblo.mjs lesaka            # o varios: lesaka,etxalar   o todos: todos
```
Entra en el pueblo como un jugador, espera a que esté hecho y guarda la escena entera en `exportar/pueblos/<id>.glb`:
terreno, calles empedradas, casas con sus tejados y ventanas, iglesia, frontón, río y puentes, árboles, mobiliario,
vecinos y animales. Lesaka: 42 MB, 609 piezas, 668.000 triángulos. Se comprueba al acabar abriéndolo otra vez. Notas:
- Los materiales propios del juego (sombreadores: el suelo, el agua, algunos tejados) no existen en glTF y salen como
  material estándar con su color y su textura principal; el aspecto final se rehace con los materiales del otro motor.
- El cielo, las nubes, la lluvia y las partículas no se exportan (cada motor tiene los suyos).
- Los pueblos no se guardan en el repositorio (unos 40 MB cada uno): se sacan cuando hagan falta.
- El código que los construye está en `src/world` (abajo); exportarlos ya hechos evita tener que reescribir la
  generación para empezar.

## 3. Personajes, animales y objetos → .glb sin comprimir

```
node tools/exportar-modelos.mjs            # src/assets → exportar/modelos (unos 176 modelos)
```
Ya son glTF binario (.glb), con esqueleto y animaciones: `src/assets/meshy*/` (el explorador, la exploradora, los vecinos
y los seres de leyenda), `src/assets/chicas/`, `src/assets/pelotaris*/`, los animales y los objetos en sus carpetas. Pero
el juego los guarda comprimidos para la web (`EXT_meshopt_compression`, `KHR_mesh_quantization` y las texturas en WebP
dentro, `EXT_texture_webp`), y Unity con [glTFast](https://github.com/Unity-Technologies/com.unity.cloud.gltfast), Godot
o Blender no siempre lo leen todo. Esta orden los saca descomprimidos y con las texturas en PNG, con el mismo esqueleto y
las mismas animaciones (comprobado con el explorador: su textura y sus 8 animaciones, sin complementos). Ocupan unas
cuatro veces más; no se guardan en el repositorio.

## 4. Imágenes → PNG

```
node tools/exportar-texturas.mjs                         # todo src/assets → exportar/texturas (varios GB)
node tools/exportar-texturas.mjs src/assets/isla exportar/texturas/isla   # solo una carpeta
```
Unity no importa WebP sin complemento; esto los pasa a PNG con la misma ruta (los PNG y JPG se copian). Son unas 4.400
imágenes.

## 5. Sonido y vídeo

Los 1.200 sonidos son MP3 (`src/assets/sonidos`, `src/assets/voz`, `public/…`) y los vídeos MP4 (`public/videos`): Unity
los lee tal cual. Las voces de los vecinos van por pueblo (`src/assets/voz/vecinos/<pueblo>/`) y su guion en
`src/game/vozVecinos.js`.

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

## Lo que es solo de la versión web

`src/web/` (el service worker, la carga por partes), `vite.config.js`, `docs/` (la web publicada), el informe a Vercel
(`src/util/informe.js`) y el modo de bajo consumo para iPhone (`src/util/sencillo.js`): en un motor nativo no hacen falta.
