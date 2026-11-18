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
- Posturas humanas (el autor: «lo que me mandas se rompería huesos»): cada articulación tiene su límite en grados
  (rodilla y codo sólo hacia un lado y hasta 150°, cadera, hombro, muñeca, tobillo, columna en tres tramos, cuello y
  cabeza), el tobillo y los dedos del pie son bisagras (la dirección del pie la marca la cadera), la pelvis acompaña
  sólo media inclinación del tronco y la clavícula sube cuando el brazo pasa de la horizontal. Al acabar, el script
  dice cuántas veces y cuánto ha tenido que corregir cada hueso. Y fuera los fotogramas imposibles (tronco tumbado
  más de 70° o media vuelta de un fotograma a otro): se rellenan con los de al lado.
- El modelo grande de MediaPipe (`MODELO=pose_landmarker_heavy.task`) es bastante más preciso que el ligero del juego.
- (18 nov) El codo y la rodilla se limitan contando desde el brazo y la pierna **rectos**, no desde el reposo del
  esqueleto: el de Meshy trae el codo doblado ~28° (la chica, una rodilla 32°) y, contado desde ahí, el brazo no se
  estiraba nunca. En la derecha de Tabar el brazo sube recto por encima de la cabeza y ahora sale recto.
- (18 nov) De espaldas y de perfil, en el armado el brazo de Tabar no está vertical: va a unos 45° hacia la cámara (su
  lado derecho), con el tronco inclinado hacia delante; en el vídeo parece vertical por la perspectiva. La longitud de
  cada hueso en la imagen lo confirma (nunca se ve más largo de lo que mide).

| Archivo | Fuente | Golpe | fps | Fotogramas |
|---|---|---|---|---|
| `irribarria-gancho.json` | Irribarria, partido (de lado, lejos, dos jugadores; poco fiable) | gancho | 30 | 40 |
| `jaka-golpe-por-arriba.json` | Erik Jaka, entrenamiento (de frente, cerca) | derecha, por encima de la cabeza | 30 | 51 |
| `jaka-izquierda-por-arriba.json` | Erik Jaka, entrenamiento (de frente, cerca; modelo grande) | golpe por arriba con la izquierda | 30 | 51 |
| `jaka-salto.json` | Erik Jaka, entrenamiento (lejos, con rótulo encima; poco fiable) | golpe en salto (los fotogramas del salto los confunde el detector) | 30 | 44 |
| `tabar-derecha-1.json` | Elpelotari Tabar, técnica (de espalda, cerca; modelo grande de MediaPipe) | golpe normal de derecha | 30 | 51 |
| `tabar-derecha-2.json` | Elpelotari Tabar, técnica (de espalda, cerca; modelo grande de MediaPipe) | golpe normal de derecha | 30 | 51 |
| `tabar-derecha-3.json` | Elpelotari Tabar, técnica (de espaldas, cerca; grabación que pasó el autor el 18 nov; modelo grande) | golpe normal de derecha: el brazo recto por encima de la cabeza, el tronco inclinado, latigazo hasta la rodilla | 30 | 51 |
| `tabar-izquierda-2.json` | Elpelotari Tabar, técnica (la misma grabación) | golpe normal de izquierda, de verdad (no en espejo) | 30 | 51 |
| `tabar-izquierda.json` | Elpelotari Tabar, técnica (de espalda, cerca; modelo grande de MediaPipe) | golpe normal de izquierda (OJO: en la preparación el jugador está medio fuera del encuadre; sólo vale el final) | 30 | 51 |
| `tele-azul-por-arriba.json` | Partido profesional en la tele (de espalda, lejos) | derecha por arriba | 15 | 25 |
| `tele-rojo-derecha-hombro.json` | Partido profesional en la tele (de espalda, lejos) | derecha a la altura del hombro | 15 | 25 |

Los vídeos comparados (real al lado del pelotari del juego) están en `entrega/movimientos-reales/`.
