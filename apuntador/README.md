# Apuntador

Director de escena para vídeos y videollamadas. Mira tu cara (contorno, cejas, ojos, iris, labios), tu cuerpo
(hombros, codos, muñecas, postura) y cada mano con sus 21 puntos, y escucha tu voz. Con eso te dice en el
momento qué estás transmitiendo frente a lo que querías transmitir, te corrige y te da ideas para mejorarlo:
«Descruza los brazos», «Baja los hombros», «Sonríe más: tu mensaje es animado y tu cara se ve seria»,
«Asiente de vez en cuando», «Idea: enumera con los dedos lo próximo que digas»…

Es un prototipo web de un solo archivo (`index.html`), sin servidor ni instalación.

## Tres usos

**Grabar un vídeo.** Pegas o subes el guion (Word .docx, .txt, subtítulos .srt/.vtt, .odt, .rtf o .html, con el botón
«Subir texto» o arrastrándolo al cuadro), eliges el tono (animado, cercano, serio, inspirador, calmado, divertido,
urgente) y lo lees como en un teleprompter. Todo va por voz (ver más abajo): «comenzamos» y empieza la cuenta
atrás y la grabación; «corten» y sigue grabando unos segundos antes de parar. También puedes empezar dando dos
palmadas o con los botones. El texto sigue tu voz o avanza a velocidad fija. La app
coloca gestos en el guion («saluda con la mano» en «hola», «cuenta con los dedos» en una enumeración, «abre los
brazos» en «todos»…), te avisa cuando llegas a ellos, te enseña cómo hacerlos y comprueba si los haces. Como estás
leyendo, en este modo no te corrige la mirada. Marcas: `[animado]` cambia el tono desde
ese párrafo, `//` es una pausa, `*palabra*` pide énfasis y `{abre los brazos}` es una acotación tuya.

**El texto se lee limpio y todo lo demás va abajo.** En el teleprompter solo están las palabras que dices (las pausas
`//` son una raya fina; el énfasis, otro color). Abajo, cerca de los botones:
- *En breve*: el gesto que viene, unos 2,5 segundos antes de su palabra, con una barra que se vacía;
- *¡Ahora!*: el gesto en su momento (con la figura animada que lo hace) y ✓ si lo haces;
- la línea verde, ámbar o roja que dice si vas bien;
- en el ensayo, también las correcciones, cortas y de una en una.

Mientras lees no hay ideas, ni etiquetas del esqueleto (que queda tenue), ni línea de estado, y el monitor se recoge
(en el móvil se oculta). En la vista previa de la mesa de trabajo los gestos se ven como emojis en el margen.

**Ensayo antes de grabar** (activado por defecto; se quita en Ajustes). Pensado para vídeos de redes:
1. *Paso 1 · Ensayo*: «comenzamos» (o dos palmadas, o Ensayar) hace una prueba sin grabar, con todas las
   correcciones. «Corten» la para al momento.
2. Sin salir del plató aparece el resultado: ajuste al tono, lo que transmitiste, cómo es el arranque (los 3 primeros
   segundos, lo que decide en redes si se quedan a verte), si dura más de un minuto (Reels, TikTok, Shorts) y hasta
   tres cosas en las que fijarte.
3. *Paso 2 · Grabación de verdad*: «comenzamos» graba. Por defecto solo ves abajo los gestos que vienen y **la línea
   verde** si te acercas a tus objetivos (mejor que en el ensayo), **ámbar** si vas igual y **roja** si te alejas. Sin
   correcciones, sin monitor y sin dibujos encima. En Ajustes, «Mientras grabas de verdad», se pueden volver a poner
   los avisos.
4. Cada ensayo dice cómo vas frente al anterior («Tus ensayos: 52% → 61% ▲ +9»).

**Luz, sonido y encuadre.** Antes de grabar, el monitor marca 💡 la luz y 🎙️ el sonido (tócalos para ver qué hacer) y
avisa si algo falla. El resultado del ensayo y el informe lo repiten con la solución:
- Luz (brillo de la cara frente al fondo): falta luz, algo oscuro, contraluz, demasiada luz (la cara se quema), un lado
  de la cara más oscuro, o bien iluminado.
- Sonido: se te oye bajo, satura en los picos, ruido de fondo (la voz destaca poco), o se te oye bien.
- Encuadre: muy cerca, lejos, manos fuera de plano, descentrado o buen encuadre.

**Revisa tu guion.** Debajo del guion, lo que conviene cambiar para transmitir lo que quieres, con botones para verlo
en el texto o arreglarlo:
- el gancho (si empiezas por el saludo, una primera frase larga o poco llamativa), con ideas de gancho sobre tu tema
  que se añaden con un toque;
- la llamada a la acción al final; si hablas más de ti que de tu público; frases de más de 25 palabras;
- muletillas y dudas («creo que», «la verdad es que», «básicamente»…), que se pueden quitar con un toque;
- si falta una pregunta o un dato concreto, palabras repetidas y la duración para redes;
- si el texto encaja con el tono elegido (con cómo escribirlo para ese tono);
- con el tono **Persuasivo** (nuevo) o Urgente, la estructura que convence: problema, beneficio, prueba y llamada a
  la acción (y urgencia).

El informe de cada toma recuerda lo que conviene cambiar del guion, con un botón para ir a cambiarlo.

**Analizar un vídeo que ya grabaste.** «Analizar un vídeo grabado» (en «Grabar un vídeo») sube un vídeo del móvil o
del ordenador. Se reproduce en el plató, entero y sin espejo, y pasa por el mismo análisis que la cámara: el
esqueleto de cara, cuerpo y manos encima, los avisos y la sombra con el gesto en el momento en que pasan. Al terminar,
el informe dice qué transmites frente al tono elegido («Querías transmitir un mensaje animado y la mayor parte del
tiempo se te vio serio»), cuánto encaja, qué corregir y cada parte del cuerpo, con el vídeo para ir a cada momento.

**Grabar la versión mejorada.** Del informe salen hasta tres objetivos: lo que más tiempo te alejó del mensaje
(«😄 Sonríe más», «👐 Brazos sin cruzar», «🎵 Varía la entonación»…), cada uno con el porcentaje del tiempo que pasó y
cómo hacerlo. «Grabar la versión mejorada» abre la cámara con el teleprompter (si el guion no está, te lo pide) y:
- al entrar te enseña los objetivos;
- en el monitor quedan marcados: en verde si los estás cumpliendo, en ámbar si ahora mismo fallan;
- sus avisos salen antes y con prioridad («🎯 Sonríe más»), y celebra cuando los corriges («¡Objetivo cumplido!») o
  cuando llevas un rato cumpliéndolos;
- el informe de la toma nueva compara antes y después: ajuste al tono, lo que transmitías y, por objetivo, la parte
  del tiempo con el problema («antes 64% → ahora 22%», ✅ Mejorado / ➖ Igual / ⚠️ Peor).

Lo mismo vale de una toma a la siguiente: «Repetir con estos objetivos» sigue mejorando sobre la última toma. Los
objetivos se ven también en la pantalla de inicio y se pueden quitar.

**Videollamada o directo.** Sin guion. Distingue si hablas tú o escuchas (tu voz y, además, que se te mueva la
boca, para no confundirte con la otra persona) y cambia de consejos:
- Hablando: energía, manos, apertura, sonrisa, expresión, volumen, entonación, ritmo y mirada a cámara.
- Escuchando: atención a la pantalla, asentir, cara relajada, brazos sin cruzar.

Con «Ventana flotante» (Chrome y Edge de escritorio) el apuntador se queda encima de Zoom, Meet o Teams y sigue
analizando aunque la pestaña quede detrás. Si la aplicación de la llamada no deja usar la cámara a la vez,
abre la llamada en otra pestaña del mismo navegador.

## Control por voz

- **«comenzamos»**: cuenta atrás 3, 2, 1 y graba. Funciona también desde el informe para hacer otra toma.
- **«corten»**: no corta en seco. Aparece «⏹ Corto en 3» y sigue grabando ese margen (0, 2, 3 o 5 segundos, en
  Ajustes; 3 por defecto). Si lo has dicho sin querer o quieres repetir la frase, di **«seguimos»** y la grabación
  continúa. El botón Terminar y la tecla Esc usan el mismo margen, con «Cortar ya» para no esperar.
- **Mis palabras** (iPhone, iPad y Android; en «Automático» se usa en el móvil): la primera vez la app te pide decir
  «comenzamos», «corten» y «seguimos» dos veces cada una y aprende tu voz. Después las reconoce sin conexión y sin
  abrir el micrófono otra vez, que es lo que cortaba la cámara en el iPhone con el reconocimiento del navegador.
  Solo cuenta una palabra dicha sola, con una pequeña pausa antes y después: leyendo el guion de corrido no se
  dispara. El botón 🎙️ «Mis palabras» del plató sirve para volver a enseñarlas (por ejemplo, con otro micrófono).
- **Reconocimiento del navegador** (Chrome y Edge de ordenador): entiende además «ensayo», «empezamos», «paramos»…
  y es el que hace que el texto siga tu voz.
- En Ajustes se elige el motor (Automático, Mis palabras, Navegador o Desactivado) y el margen al parar.
- Al terminar se guarda también ese margen, así que el final del vídeo incluye tu «corten»: recórtalo al editar o
  pon el margen a 0.

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
- **La línea**: la franja de lectura cambia de color durante la toma (verde, ámbar, roja). Con objetivos se compara
  con el ensayo o la toma anterior (la parte de los últimos 6 segundos con cada problema frente a la de entonces); sin
  objetivos, con el ajuste al tono. Cambia solo si el nuevo color dura más de un segundo, para que no parpadee.
- **Avisos** de uno en uno, con emoji, con un tiempo mínimo y un descanso para no agobiar: correcciones (ámbar y
  rojo), gestos del guion (azul), ideas cuando todo va bien (azul) y felicitaciones (verde).
- **¿Lo estoy haciendo bien?**: al entrar te confirma «¡Te veo!» y marca con ✓ cara, cuerpo, manos y voz. El monitor
  dice siempre en una frase cómo vas («👍 ¡Lo estás haciendo bien!», «👌 Vas por buen camino»…) y, cuando lo haces
  bien, te lo dice a menudo.
- **Puntos**: +10 por cada gesto del guion que haces (más si encadenas una racha), +5 al corregir algo y +3 cuando lo
  estás haciendo bien, con celebración de emojis. El informe muestra los puntos y la mejor racha.
- **Informe** al terminar, con un panel arriba muy claro:
  - la nota (ajuste al tono) con un «¡Bien!», «Casi» o «A mejorar» y, si repites, «▲ +10 frente a tu ensayo»;
  - 🔴 *En qué fallas*: hasta tres cosas, con la parte de la toma que estuvo mal, cuánto era antes y cómo corregirlo;
  - 🟢 *Lo que has mejorado* o *Lo que haces bien*;
  - el arranque y la duración para redes;
  - el vídeo y la toma como una línea verde, ámbar y roja de principio a fin (pulsa en ella para ir a ese momento);
  - el botón para grabar otra vez con esos objetivos.

  Debajo, plegado, el análisis completo: lo que transmitiste, antes y después, ajuste segundo a segundo, qué
  corregir primero, medidas frente al objetivo, cada parte del cuerpo, párrafos y gestos del guion.

Atajos en el plató: Espacio empezar/pausar (con un vídeo subido, empezar el análisis o pausarlo), R grabar, Esc terminar, ↑/↓ velocidad, +/− letra, S dibujo, M monitor.

## Si no te ves o la imagen se para

- La cámara se ve nada más entrar; los modelos se cargan y la calibración se hace sin tapar la imagen.
- Si la cámara no responde en 20 segundos, está ocupada por otra aplicación (Zoom, Teams, FaceTime…), falta el
  permiso o la página se ha abierto donde el navegador no da cámara (la vista previa de la app de Claude o de
  Archivos), la app lo dice con el motivo y un botón para reintentar.
- Si la cámara se corta a mitad (otra aplicación la coge, el móvil pausa la página, la imagen deja de avanzar),
  aparece «La cámara se ha parado» con un botón para reactivarla; al volver a la pestaña se reactiva sola.
- El bucle de la pantalla está protegido: si una parte falla, las demás siguen funcionando.
- En el iPhone (Safari y Chrome) el análisis corre en segundo plano con el procesador; si un navegador no lo
  permite, se hace en la página con imágenes pequeñas y pausas, sin congelar la pantalla.
- Si la cámara se corta durante una grabación, se guarda lo grabado hasta ese momento.
- Botón «Texto» (o tecla T): oculta el teleprompter para verte entero.

Dirección publicada: https://jonathanvilches.github.io/MENDIZMENDI-/apuntador/ (carpeta `docs/apuntador/` de
`main`, con una copia en `public/apuntador/` para que la compilación web del juego la conserve).

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
| Vídeo subido | El vídeo ocupa el lugar de la cámara: la visión lee sus fotogramas y el sonido entra al mismo AudioWorklet por `MediaElementAudioSource` (y se oye). Antes de empezar se analiza el primer fotograma para que el motor esté listo y no se pierda el principio. Se usan valores neutros en lugar de tu calibración, el volumen no se valora (depende de cómo se exportó) y la mirada a cámara sí cuenta. Si el vídeo se pausa, el análisis espera. |
| Luz | Cada 0,8 s, una copia de 96 px de la imagen: brillo medio del centro de la cara (sin pelo ni fondo), del fondo, parte quemada y diferencia entre las dos mitades de la cara. |
| Sonido | Del mismo AudioWorklet: nivel de la voz (mediana de los tramos con voz), ruido de fondo (percentil 10 del nivel) y picos al máximo (saturación). En un vídeo subido no se juzga el nivel, solo el ruido y la saturación. |
| Guion | Reglas sobre el texto en el propio navegador: frases, pronombres, palabras de llamada a la acción, muletillas, números y el detector de tono. |
| Objetivos | Para cada objetivo, la parte del tiempo con el problema: si tiene medida, las muestras fuera de la franja del tono; si no, el tiempo con el aviso activo. Así se comparan dos tomas. |
| Mis palabras | En el mismo AudioWorklet: 100 huellas por segundo del sonido (MFCC a 16 kHz). Se aíslan las palabras sueltas (0,2–1,7 s con silencio alrededor) y se comparan con tus dos grabaciones de cada palabra con DTW, que las alinea aunque hables más rápido o más despacio. El umbral de cada palabra sale de lo que se parecen tus dos grabaciones y de lo que se diferencian de las otras palabras. |

Cada tono define una franja objetivo por medida (`TONES`). Las reglas (`RULES`) indican cuándo aplican: mientras
hablas, mientras escuchas en una llamada, solo con guion o siempre. Lo que hace cada parte sale de `readParts`.

Todo se analiza en el navegador, también «Mis palabras» (las huellas de tu voz se guardan solo en este navegador).
Solo el motor «Navegador» usa el reconocimiento de voz del navegador (en Chrome lo procesa Google).

## Límites conocidos

- Los umbrales son valores de partida: hay que ajustarlos con grabaciones de personas reales. Se ha probado con
  cámara y micrófono simulados (una foto en movimiento y voz sintética), no con creadores reales.
- La visión necesita buena luz y verte al menos de pecho para arriba; los codos y las manos, de cintura para arriba.
- Los modelos (unos 18 MB) se descargan la primera vez de los servidores de Google y la librería de jsDelivr.
- La ventana flotante solo existe en Chrome y Edge de escritorio. En el resto, pon la ventana al lado de la llamada.
- Para probar sin tarjeta gráfica, añade `?cpu` a la dirección.
- El vídeo subido se analiza a velocidad normal: tarda lo que dura. En un dispositivo lento se analizan menos imágenes
  por segundo; si se pudo medir poco, el informe lo avisa.
- Formatos: los que reproduzca el navegador. Los .mov del iPhone se abren en Safari; en Chrome de ordenador, mejor
  .mp4 (H.264) o .webm. Con música de fondo, la entonación y el ritmo se miden peor.
- El texto subido no sale del vídeo: para leer con el teleprompter hay que pegar o subir el guion. Los PDF y los
  .pages no se leen (copia el texto o expórtalo a Word).
- Luz y sonido se han probado con vídeos de prueba (oscuro, sobreexpuesto, con ruido y saturado). Los umbrales son de
  partida: con pieles muy oscuras o cámaras con exposición automática agresiva la luz puede marcarse como «algo oscuro».
- El revisor del guion usa reglas, no un modelo de lenguaje: da pistas útiles pero no reescribe el texto entero.
- «Mis palabras» se ha probado con voz sintética: reconoce tus palabras a otras velocidades, tonos y volúmenes y no
  confunde unas órdenes con otras, pero acepta palabras casi iguales dichas sueltas («comentamos» por «comenzamos»,
  «corte» por «corten»). Por eso «corten» deja siempre el margen con «seguimos». Con mucho ruido de fondo o al cambiar
  de micrófono conviene volver a enseñarlas.

## Siguientes pasos naturales

- Análisis del guion con un modelo de lenguaje: tono y gestos frase a frase en lugar de palabras clave.
- Estudio con personas reales para calibrar las franjas de cada tono (y por plataforma: TikTok, YouTube, LinkedIn).
- Integración directa en la llamada (cámara virtual o extensión para Meet) y app nativa con vibración para los avisos.
- Historial de sesiones y evolución por persona.
