# Movimientos de pelota sacados de vídeos reales

Esqueleto fotograma a fotograma (MediaPipe, `tools/pose-video.mjs`) de golpes de pelotaris de verdad, recortado al golpe
(`tools/pose-golpes.py`). Es la referencia para afinar en Blender los movimientos de Meshy de los pelotaris nuevos:

    python tools/blender/pose-a-esqueleto.py -- personaje.glb investigacion/movimientos-reales/<golpe>.json salida.glb [carpeta_render]

| Archivo | Fuente | Golpe | fps | Fotogramas |
|---|---|---|---|---|
| `jaka-golpe-por-arriba.json` | Erik Jaka, entrenamiento (de frente, cerca) | derecha, por encima de la cabeza | 30 | 51 |
| `tabar-derecha-1.json` | Elpelotari Tabar, técnica (de espalda, cerca) | golpe normal de derecha | 30 | 51 |
| `tabar-derecha-2.json` | Elpelotari Tabar, técnica (de espalda, cerca) | golpe normal de derecha | 30 | 51 |
| `tabar-izquierda.json` | Elpelotari Tabar, técnica (de lado, cerca) | golpe normal de izquierda | 30 | 51 |
| `tele-azul-por-arriba.json` | Partido profesional en la tele (de espalda, lejos) | derecha por arriba | 15 | 25 |
| `tele-rojo-derecha-hombro.json` | Partido profesional en la tele (de espalda, lejos) | derecha a la altura del hombro | 15 | 25 |

Los vídeos comparados (real al lado del pelotari del juego) están en `entrega/movimientos-reales/`.
