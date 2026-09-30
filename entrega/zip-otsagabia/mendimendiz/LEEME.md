# MENDIMENDIZ

Juego web en 3D para descubrir Navarra pueblo a pueblo. Primer escenario: Otsagabia / Ochagavía.

## Cómo ejecutarlo

El juego necesita un servidor local (no funciona abriendo `index.html` con doble clic, porque carga el modelo 3D con `fetch`).

```
cd mendimendiz
python -m http.server 8000
```

Abre http://localhost:8000 en Chrome, Edge, Firefox o Safari. Para probarlo en el móvil, conecta el móvil a la misma wifi y abre `http://IP-DE-TU-ORDENADOR:8000`.

Para publicarlo, sube la carpeta completa a cualquier alojamiento estático (Netlify, GitHub Pages, Vercel, un servidor propio…).

## Estructura

```
mendimendiz/
├── index.html              Estructura de la interfaz (portada, secciones, HUD, pantallas)
├── css/styles.css          Estilos, tipografía y adaptación a móvil
├── js/game.js              Todo el juego
└── assets/
    ├── models/pastor.glb   Modelo 3D del protagonista (base de todos los personajes)
    └── fonts/grozel.woff2  Tipografía de títulos
```

Librerías externas (CDN): three.js r128, GLTFLoader y SkeletonUtils 0.128.0.

## Secciones de `js/game.js`

| Sección | Qué contiene |
|---|---|
| Guardado | Estado de la partida en localStorage (`mendimendiz-otsagabia-v1`) |
| Geografía | Río Anduña y Zatoya, alturas del terreno, puentes y calles |
| Escena | Render, luces, cielo, nubes y texturas pintadas por código |
| Terreno | Malla del suelo con colores por zona |
| Ríos | Agua animada |
| Colisiones | Cajas de colisión de edificios y vecinos |
| Puentes | Puente medieval y dos puentes de piedra |
| Casas pirenaicas | Casas, palacios, iglesia, crucero, fuente y postes indicadores |
| Vegetación | Hayas, abetos, chopos, matas y flores |
| Personajes de juguete | Figuras de respaldo si el modelo 3D no carga |
| Personajes con forma humana | Carga del GLB, recoloreado por vecino, accesorios, animación |
| Contenido | Cartas del cuaderno con sus fuentes |
| Misión | Pasos del «Paseo del Anduña» y diálogos de los vecinos |
| Interacción | Hablar, beber en la fuente y descubrir palacios |
| Interfaz | Diálogos, cuaderno, menú, pantalla final |
| Portada y secciones | Inicio, Pueblos, Personaje y Pasaporte |
| Controles | Teclado, joystick táctil y cámara |
| Física del jugador | Movimiento, colisiones, río y pretiles de los puentes |
| Bucle | Actualización por fotograma y cámaras |

## Pelota a mano

`js/pelota.js` es un motor independiente del juego (expone `window.Pelota`). Lleva:

- **El frontón.** Frontis con la chapa y la raya de arriba, pared izquierda con los cuadros numerados, cancha con las rayas de falta (4) y pasa (7), contracancha y gradas.
- **Las reglas.**
  - La pelota tiene que dar en el frontis por encima de la chapa.
  - Se devuelve de aire o tras un bote; si bota dos veces, el tanto es para el otro.
  - Es fuera si cae más allá de la raya de la derecha o del fondo.
  - En el saque tiene que botar entre la raya del 4 y la del 7.
  - Saca el que gana el tanto.
- **El juez y el kantari.** Cantan el tanteo en euskera, por ejemplo «Bost eta lau, gorriak!».
- **El rival.** Tres niveles. Calcula dónde caerá la pelota y elige entre dejada, a la pared, al ancho o largo.
- **Ayudas para los pequeños.**
  - Un aro naranja marca dónde botará la pelota.
  - Un círculo verde marca dónde ponerse.
  - La pelota brilla cuando se puede golpear.
  - El partido va a cámara lenta suave.
- **Controles.** Joystick y botones GOLPE y DEJADA en móvil; WASD, Espacio y Mayúsculas en ordenador.
- **Sonidos.** Sintetizados, sin archivos.

En Otsagabia el frontón está al este del pueblo (hay un poste que lo indica). Kike espera en la entrada y reta a un partido a 5 tantos. Al ganarlo se consigue la carta «Pelota a mano».

Para ponerlo en otro pueblo:

1. `const court = new Pelota.PelotaCourt(THREE)`
2. Añadir `court.group` a la escena en su sitio y convertir `court.boxes` en colisiones.
3. `new Pelota.PelotaMatch({ THREE, court, camera, you, rival, onEnd })`
4. Llamar a `update(dt)` en cada fotograma mientras dure el partido.

Las fuentes del motor están en el repositorio de MENDIMENDIZ (`src/pelota/`). `js/pelota.js` es su versión compilada.

## Datos útiles

- Trazado del pueblo adaptado para jugar: la posición y el número de casas son aproximados.
- Modelo del pastor: 1,75 m, 18 huesos, animación de caminar «Aldeano_Rig» de 1 s y pose de reposo incluida en el código.
- Los vecinos reutilizan el modelo del pastor con materiales recoloreados y accesorios.
- Para cambiar un personaje por su propio GLB, sustituye `buildGLBChar` en la sección de personajes.

## Pendiente

1. Probar en móvil y ordenador reales (rendimiento, controles y carga del modelo).
2. En `IDLE` los huesos llevan punto (`UpperArm.L`), pero GLTFLoader los carga sin él (`UpperArmL`), así que la pose de reposo no se aplica a brazos y piernas.
3. Un GLB propio por personaje.
4. Criaturas nocturnas y modo noche.
5. Evitar que la cámara atraviese las casas.
6. Siguientes pueblos.
