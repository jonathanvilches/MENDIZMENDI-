# Apuntador

Director de escena para vídeos y videollamadas. Mira tu cara (contorno, cejas, ojos, iris, labios), tu cuerpo
(hombros, codos, muñecas, postura) y cada mano con sus 21 puntos, y escucha tu voz. Con eso te dice en el
momento qué estás transmitiendo frente a lo que querías transmitir, te corrige y te da ideas para mejorarlo:
«Descruza los brazos», «Baja los hombros», «Sonríe más: tu mensaje es animado y tu cara se ve seria»,
«Asiente de vez en cuando», «Idea: enumera con los dedos lo próximo que digas»…

Es un prototipo web de un solo archivo (`index.html`), sin servidor ni instalación.

## Dos usos

**Grabar un vídeo.** Pegas el guion, eliges el tono (animado, cercano, serio, inspirador, calmado, divertido,
urgente) y lo lees como en un teleprompter. Di «comenzamos» y empieza la cuenta atrás y la grabación; «ensayo»
ensaya sin grabar y «corten» termina (también hay botones). El texto sigue tu voz o avanza a velocidad fija. La app
coloca gestos en el guion («saluda con la mano» en «hola», «cuenta con los dedos» en una enumeración, «abre los
brazos» en «todos»…), te avisa cuando llegas a ellos, te enseña cómo hacerlos y comprueba si los haces. Como estás
leyendo, en este modo no te corrige la mirada. Marcas: `[animado]` cambia el tono desde
ese párrafo, `//` es una pausa, `*palabra*` pide énfasis y `{abre los brazos}` es una acotación tuya.

**Videollamada o directo.** Sin guion. Distingue si hablas tú o escuchas (tu voz y, además, que se te mueva la
boca, para no confundirte con la otra persona) y cambia de consejos:
- Hablando: energía, manos, apertura, sonrisa, expresión, volumen, entonación, ritmo y mirada a cámara.
- Escuchando: atención a la pantalla, asentir, cara relajada, brazos sin cruzar.

Con «Ventana flotante» (Chrome y Edge de escritorio) el apuntador se queda encima de Zoom, Meet o Teams y sigue
analizando aunque la pestaña quede detrás. Si la aplicación de la llamada no deja usar la cámara a la vez,
abre la llamada en otra pestaña del mismo navegador.

## En pantalla

- **Lo que detecta**, dibujado sobre tu imagen y en espejo: contorno de la cara, cejas, ojos, iris y labios;
  hombros, codos y muñecas; los dedos de cada mano; y la estela del movimiento de las manos. Cada parte toma el
  color de su estado (verde ayuda, ámbar frena, rojo corrige ya) y lleva una etiqueta con lo que está haciendo.
- **Monitor**, con dos pestañas:
  - *Cuerpo*: el estado de cada parte en directo (cabeza: de frente, girada, ladeada, asintiendo; mirada: a
    cámara, abajo, a un lado; cejas: arriba, activas, quietas, fruncidas; boca: sonrisa, apretada, hablando;
    hombros: relajados, subidos, inclinados; codos: abiertos, pegados; manos: gesticulando, contando, en puño,
    en la cara, brazos cruzados, fuera de plano; postura; movimiento; voz).
  - *Tono*: cada medida frente a la franja que pide el tono elegido.
- **La sombra**: cuando toca un gesto (o corregir uno), una figura animada te enseña el movimiento en el aviso y,
  además, una sombra luminosa lo hace encima de tu propio cuerpo, anclada a tus hombros (abrir los brazos, mano al
  pecho, contar con los dedos, saludar, descruzar los brazos, bajar los hombros, separar los codos…). Los gestos de
  la cara (sonreír, subir las cejas, relajar el ceño, asentir) se dibujan sobre tu cara.
- **Avisos** de uno en uno, con emoji, con un tiempo mínimo y un descanso para no agobiar: correcciones (ámbar y
  rojo), gestos del guion (azul), ideas cuando todo va bien (azul) y felicitaciones (verde).
- **¿Lo estoy haciendo bien?**: al entrar te confirma «¡Te veo!» y marca con ✓ cara, cuerpo, manos y voz. El monitor
  dice siempre en una frase cómo vas («👍 ¡Lo estás haciendo bien!», «👌 Vas por buen camino»…) y, cuando lo haces
  bien, te lo dice a menudo.
- **Puntos**: +10 por cada gesto del guion que haces (más si encadenas una racha), +5 al corregir algo y +3 cuando lo
  estás haciendo bien, con celebración de emojis. El informe muestra los puntos y la mejor racha.
- **Informe** al terminar: ajuste segundo a segundo, lo que transmitiste (hablando y escuchando por separado en
  una llamada), qué corregir primero, cada parte del cuerpo con lo que más hizo, medidas frente al objetivo,
  párrafos y gestos del guion, y el vídeo si grabaste.

Atajos en el plató: Espacio empezar/pausar, R grabar, Esc terminar, ↑/↓ velocidad, +/− letra, S dibujo, M monitor.

## Cómo probarlo

Abre `index.html` en Chrome o Edge. En el ordenador basta con abrir el archivo o servir la carpeta con
`python3 -m http.server`; en el móvil hace falta una dirección `https` (por ejemplo, GitHub Pages). Permite cámara
y micrófono, calibra 5 segundos (hombros relajados, cara tranquila, voz normal) y empieza.

## Cómo funciona

| Qué | Cómo |
|---|---|
| Cuerpo | MediaPipe Pose: hombros, codos, muñecas, caderas y orejas. Movimiento medido con medias por ventanas para no confundir el temblor del detector con gestos. Hombros subidos: la distancia oreja-hombro se acorta respecto a la calibración. Codos pegados: cerca de la línea de los hombros. Brazos cruzados: antebrazos que se cruzan o muñecas al otro lado del cuerpo. |
| Cara | MediaPipe Face Landmarker (478 puntos y 52 expresiones): sonrisa, cejas arriba o fruncidas, labios apretados, mandíbula, mirada (ojos y giro de la cabeza), inclinación lateral y asentimiento (la cabeza sube y baja dos veces en 1,6 s). |
| Manos | MediaPipe Gesture Recognizer: 21 puntos por mano, dedos extendidos, puño, palma abierta, mano en la cara y movimientos pequeños repetidos (nervios). |
| Rendimiento | La visión corre en un Web Worker con imágenes reducidas (ImageBitmap): la cámara y la pantalla no se congelan aunque el equipo tarde en analizar. Si el worker no arranca, se analiza en el hilo principal dejando tiempo libre entre fotogramas. |
| Voz | AudioWorklet: volumen, tono con YIN, ritmo (picos de sílaba o palabras por minuto si el texto sigue la voz) y pausas. |

Cada tono define una franja objetivo por medida (`TONES`). Las reglas (`RULES`) indican cuándo aplican: mientras
hablas, mientras escuchas en una llamada, solo con guion o siempre. Lo que hace cada parte sale de `readParts`.

Todo se analiza en el navegador. Solo el modo «Sigue mi voz» usa el reconocimiento de voz del navegador
(en Chrome lo procesa Google).

## Límites conocidos

- Los umbrales son valores de partida: hay que ajustarlos con grabaciones de personas reales. Se ha probado con
  cámara y micrófono simulados (una foto en movimiento y voz sintética), no con creadores reales.
- La visión necesita buena luz y verte al menos de pecho para arriba; los codos y las manos, de cintura para arriba.
- Los modelos (unos 18 MB) se descargan la primera vez de los servidores de Google y la librería de jsDelivr.
- La ventana flotante solo existe en Chrome y Edge de escritorio. En el resto, pon la ventana al lado de la llamada.
- Para probar sin tarjeta gráfica, añade `?cpu` a la dirección.

## Siguientes pasos naturales

- Análisis del guion con un modelo de lenguaje: tono y gestos frase a frase en lugar de palabras clave.
- Estudio con personas reales para calibrar las franjas de cada tono (y por plataforma: TikTok, YouTube, LinkedIn).
- Integración directa en la llamada (cámara virtual o extensión para Meet) y app nativa con vibración para los avisos.
- Historial de sesiones y evolución por persona.
