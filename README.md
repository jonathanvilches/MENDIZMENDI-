# HERRIZHERRI · Navarra, pueblo a pueblo

Videojuego 3D educativo para niños y niñas de 7 a 11 años: se recorre Navarra pueblo a pueblo, con misiones sobre su
historia, sus monumentos, sus oficios, su agricultura, sus fiestas y sus leyendas, y campeonatos de pelota vasca.
En castellano y en euskera.

Hoy es un **prototipo web** (Three.js, se juega en el navegador y en el móvil:
<https://jonathanvilches.github.io/mendimendiz/>). Está preparado para pasarlo a un motor de videojuegos (Unity) cuando
llegue el momento: ver [`PORTAR.md`](PORTAR.md) y [`unity/LEEME.md`](unity/LEEME.md).

## Empezar

```
npm install
npm run dev               # servidor de desarrollo: http://localhost:5173
npm run build:web         # la web que se publica, en docs/ (WEB=1 vite build; en Windows: set WEB=1 && npx vite build)
npm run exportar          # los datos del juego en JSON, para otro motor (exportar/datos)
```

Requisitos: Node 22. Sin servidor ni base de datos: el progreso se guarda en el propio aparato.

## Qué hay en cada carpeta

| Carpeta | Qué es | ¿Va en el juego? |
| --- | --- | --- |
| `src/` | El juego: código, datos y recursos (ver abajo) | Sí |
| `public/` | Lo que se copia tal cual a la web: vídeos, láminas, la app del mando del móvil (`mando/`), los modelos de la cámara (`ar/`) | Sí |
| `index.html` | La página del juego | Sí |
| `docs/` | La web compilada que sirve GitHub Pages (se genera con `npm run build:web`; no se edita a mano) | Es la web |
| `exportar/` | El juego en formatos de otro motor: datos en JSON (en Git) y catálogo de originales; lo pesado se genera con `npm run exportar:todo` | No |
| `unity/` | El proyecto de Unity y su paquete (en pausa) | No |
| `tools/` | Herramientas: compilar, medir, probar, exportar, preparar recursos | No |
| `lab/` | Páginas de prueba y los originales de Meshy (`lab/ref`, con Git LFS) | No |
| `entrega/` | Lo que se ha preparado para que el autor elija o revise (voces, personajes, fondos, tráiler, App Store) | No |
| `investigacion/` | Estudios y pruebas aparcadas, con su estado en un `LEEME.md` | No |
| `legal/` | Licencias, estado legal y borrador de la política de privacidad | No |
| `servidor/` | El relevo propio del mando del móvil (Cloudflare, sin desplegar) | No |

### `src/`

| Carpeta | Qué hace |
| --- | --- |
| `main.js` | Arranque: carga, menú, pueblos y partidos |
| `engine/` | Bucle, render, calidad automática y presupuesto de cada aparato |
| `hub/` | El menú: mapa 3D de Navarra, comarcas, galería de pueblos, perfil y ajustes |
| `world/` | Construcción de los pueblos: terreno, calles, casas, iglesias, ríos, árboles |
| `game/` | El juego en un pueblo: misiones, charlas, leyendas, torneos, perfil del jugador |
| `pelota/` | Los partidos de pelota vasca: reglas, golpes, cámara, marcador, comentaristas |
| `futbol/` | Los partidos de fútbol |
| `actors/` | Personajes y animales: modelos, animaciones, público |
| `levels/` | Escenas especiales (Salazar, Bardenas…) |
| `ui/`, `ui.js` | Interfaz: iconos, fichas, láminas, cartas, minijuegos |
| `audio/`, `audio.js` | Música, efectos y voces |
| `mando/` | El móvil como mando (WebRTC, saludo cifrado) |
| `util/` | Ayudantes: guardado, caché, diagnóstico, informe técnico, traspaso de partida |
| `web/` | Lo propio de la web: service worker, instalación, caché |
| `data/` | **Los datos del juego** (pueblos, misiones, vecinos, textos, euskera): tablas sin lógica, exportables |
| `assets/` | Modelos `.glb`, texturas, imágenes, sonidos y voces |

## Documentos

- [`ARQUITECTURA.md`](ARQUITECTURA.md): cómo está hecho el juego por dentro, las convenciones y las decisiones del autor.
- [`PORTAR.md`](PORTAR.md): cómo pasar el juego a Unity (u otro motor), qué está exportado y cuánto costaría.
- [`PRIVACIDAD.md`](PRIVACIDAD.md): qué datos se guardan, dónde y qué sale del aparato.
- [`COORDINACION.md`](COORDINACION.md) y [`CLAUDE.md`](CLAUDE.md): cómo se reparten el trabajo las ventanas de Claude.
- [`VENTAJAS-COMERCIOS.md`](VENTAJAS-COMERCIOS.md): los descuentos en comercios por los sellos del juego.

## Reglas para el código

- Textos, comentarios, nombres de archivo y mensajes de Git, en castellano. Nombres de archivo sin tildes, sin eñes y
  sin espacios: `kebab-case` para recursos (`pelota-mano.mp3`) y `camelCase` para código (`townGame.js`). Parte del
  código antiguo tiene nombres en inglés: se respeta hasta que se pase a Unity.
- Los datos, en `src/data` (tablas y textos, sin cálculos mezclados); después de cambiarlos, `npm run exportar`.
- Medidas: 1 unidad = 1 metro, Y hacia arriba.
- Nada sale del aparato del jugador sin permiso ([`PRIVACIDAD.md`](PRIVACIDAD.md)). Lo que escribe el jugador o llega de
  fuera se escapa antes de ponerlo en la página (`esc`).
- Los originales (Meshy, Higgsfield, ElevenLabs, Envato), en su máxima calidad; las licencias de Envato son solo para
  este juego.
- Nada entra en el juego sin verlo en pantalla, en el ordenador (1280 × 720) y en el móvil tumbado (844 × 390).

## Publicar

`npm run build:web` y subir `docs/` a la rama `main` (GitHub Pages). Lo hace la ventana principal (`CLAUDE.md`).

Los datos culturales proceden de fuentes públicas (Turismo de Navarra, Dantzatlas, Reyno Gourmet, ayuntamientos…),
citadas en cada ficha. Los personajes y diálogos son ficción; los pueblos son interpretaciones, no planos exactos.
