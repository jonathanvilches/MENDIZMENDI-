# Apuntador

Teleprompter con director de escena. Mientras lees el guion delante de la cámara, la app analiza en directo
el cuerpo, la cara y la voz, y te dice qué estás transmitiendo frente a lo que el mensaje debería transmitir:
«Estás muy estático», «Usa las manos para explicar», «Descruza los brazos», «Sonríe más: tu mensaje es animado
y tu cara se ve seria», «Varía la entonación», «Más despacio»…

Es un prototipo web de un solo archivo (`index.html`), sin servidor ni instalación.

## Cómo probarlo

1. Abre `index.html` en Chrome o Edge (ordenador o móvil). Para el móvil hace falta servirlo por `https`
   (por ejemplo, GitHub Pages); en el ordenador basta con abrir el archivo o con `python3 -m http.server`.
2. Pega tu guion y elige qué tiene que transmitir (animado, cercano, serio, inspirador, calmado, divertido, urgente).
   La app sugiere un tono a partir del texto.
3. «Entrar al plató»: permite cámara y micrófono, calibra 5 segundos y pulsa **Ensayar** o **Grabar**.
4. Al terminar verás el informe: ajuste al tono segundo a segundo, lo que transmitiste, qué corregir primero,
   medidas frente al objetivo, párrafo a párrafo, gestos del guion hechos o no, y el vídeo para descargar.

Marcas en el guion: `[animado]` cambia el tono desde ese párrafo, `//` es una pausa, `*palabra*` pide énfasis
y `{abre los brazos}` es una acotación tuya. Además, la app añade sola gestos según el texto: saludo en «hola»,
contar con los dedos en enumeraciones, abrir los brazos en «todos/juntos», mano al pecho en «yo/confieso»,
cejas arriba en las preguntas, señalar abajo en «suscríbete/enlace»…

Atajos en el plató: Espacio ensayar/pausar, R grabar, Esc terminar, ↑/↓ velocidad, +/− letra, S esqueleto, M monitor.

## Qué mide

| Señal | Cómo | Para qué |
|---|---|---|
| Energía corporal | Velocidad media de cabeza, hombros, codos y muñecas (MediaPipe Pose) | Estático / demasiado movido |
| Uso de las manos | Manos en la zona de gesto y moviéndose respecto a los hombros | Manos quietas o fuera de plano |
| Apertura | Separación de las muñecas en anchos de hombro; brazos cruzados | Gestos cerrados o a la defensiva |
| Sonrisa y expresión | Blendshapes de la cara (MediaPipe Face Landmarker) | Cara seria, inexpresiva, ceño |
| Mirada a cámara | Giro de la cabeza y dirección de los ojos | «Leyendo, sin conexión» |
| Manos | Gestos y dedos (MediaPipe Gesture Recognizer) | Puños, manos en la cara, nervios, contar |
| Volumen, entonación, ritmo, pausas | AudioWorklet: RMS, tono con YIN, picos de sílaba; o palabras/minuto si sigue la voz | Voz baja, monótona, rápida, sin pausas |

Cada tono define una franja objetivo para cada medida (`TONES` en el código). Con eso se calcula el
porcentaje de ajuste, lo que «transmites» (el tono más parecido, o un estado como *a la defensiva*, *nervioso*,
*leyendo* o *plano*) y los avisos, que salen de uno en uno, con un tiempo mínimo y un descanso para no agobiar.

Todo se analiza en el navegador. Solo el modo «Sigue mi voz» usa el reconocimiento de voz del navegador
(en Chrome lo procesa Google); si no está disponible, el texto avanza a velocidad fija y se para cuando callas.

## Límites conocidos

- Los umbrales son valores de partida: hay que ajustarlos con grabaciones reales de personas (sección `TONES`,
  `RULES` y `computeMetrics`). Se ha probado con cámara y micrófono simulados, no con creadores reales.
- La visión necesita buena luz y verte de cintura para arriba. En móviles antiguos el análisis va más lento;
  la app alarga sus ventanas de tiempo para compensarlo.
- Los modelos (unos 18 MB) se descargan de los servidores de Google y la librería de jsDelivr la primera vez.
- Para ver la app en modo CPU (útil para pruebas sin GPU) añade `?cpu` a la dirección.

## Siguientes pasos naturales

- Análisis del guion con un modelo de lenguaje: el tono y los gestos frase a frase, en lugar de palabras clave.
- Estudio con personas reales para calibrar las franjas de cada tono (y por plataforma: TikTok, YouTube, LinkedIn).
- App nativa (iOS/Android) con la cámara frontal y el texto junto al objetivo, y vibración para los avisos.
- Historial de tomas y evolución por persona.
