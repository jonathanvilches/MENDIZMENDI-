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

- **Personas.** Un desarrollador de Unity en España cobra de media unos 57.000 € brutos al año (Jooble, julio de 2026);
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
   copia. Los modelos originales de `lab/ref` (31 .glb, 282 MB) no están en GitHub: solo en la copia de trabajo.
3. **Medidas reales.** 1 unidad = 1 metro en todo lo que se juega; los personajes a su altura real (el explorador, 1,4 m).
4. **Nombres claros** en las piezas 3D (`casa`, `iglesia`, `rio`…): el .glb del pueblo lleva esos nombres a Unity.
5. **Herramientas al día.** Si un sistema nuevo crea cosas que no son three.js estándar (otro tipo de geometría, otro
   material), comprobar que `node tools/exportar-pueblo.mjs <pueblo>` lo sigue sacando y que se abre bien.

## Lo que es solo de la versión web

`src/web/` (el service worker, la carga por partes), `vite.config.js`, `docs/` (la web publicada), el informe a Vercel
(`src/util/informe.js`) y el modo de bajo consumo para iPhone (`src/util/sencillo.js`): en un motor nativo no hacen falta.
