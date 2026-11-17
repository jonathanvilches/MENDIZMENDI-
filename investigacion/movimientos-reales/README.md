# Movimientos de pelota sacados de vídeos reales

Esqueleto fotograma a fotograma (MediaPipe, `tools/pose-video.mjs`) de golpes de pelotaris de verdad, recortado al golpe
(`tools/pose-golpes.py`). Es la referencia para afinar en Blender los movimientos de Meshy de los pelotaris nuevos:

    python tools/blender/pose-a-esqueleto.py -- personaje.glb investigacion/movimientos-reales/<golpe>.json salida.glb [carpeta_render]

Lo que se ha aprendido (17 nov):
- Lo mejor es un vídeo de cerca, de frente o de lado, con el cuerpo entero dentro: la volea de Erik Jaka sale casi igual.
- De espaldas una sola imagen no dice bien hacia dónde gira el cuerpo (con los brazos arriba los hombros se ven
  estrechos y parece girado). El paso a Blender lo compensa con reglas del cuerpo: la forma se toma de la imagen y la
  profundidad de la longitud de cada hueso; el pecho sólo gira lo que da la cintura (menos con los brazos arriba); la
  rodilla sólo dobla hacia delante; de espaldas la cabeza va derecha mirando al frente; la muñeca, firme.
- Lo que cae fuera de la imagen se lo inventa el detector aunque diga verlo al 99 %: no se usa, se rellena.
- El modelo grande de MediaPipe (`MODELO=pose_landmarker_heavy.task`) es bastante más preciso que el ligero del juego.

| Archivo | Fuente | Golpe | fps | Fotogramas |
|---|---|---|---|---|
| `jaka-golpe-por-arriba.json` | Erik Jaka, entrenamiento (de frente, cerca) | derecha, por encima de la cabeza | 30 | 51 |
| `tabar-derecha-1.json` | Elpelotari Tabar, técnica (de espalda, cerca; modelo grande de MediaPipe) | golpe normal de derecha | 30 | 51 |
| `tabar-derecha-2.json` | Elpelotari Tabar, técnica (de espalda, cerca; modelo grande de MediaPipe) | golpe normal de derecha | 30 | 51 |
| `tabar-izquierda.json` | Elpelotari Tabar, técnica (de espalda, cerca; modelo grande de MediaPipe) | golpe normal de izquierda (OJO: en la preparación el jugador está medio fuera del encuadre; sólo vale el final) | 30 | 51 |
| `tele-azul-por-arriba.json` | Partido profesional en la tele (de espalda, lejos) | derecha por arriba | 15 | 25 |
| `tele-rojo-derecha-hombro.json` | Partido profesional en la tele (de espalda, lejos) | derecha a la altura del hombro | 15 | 25 |

Los vídeos comparados (real al lado del pelotari del juego) están en `entrega/movimientos-reales/`.
