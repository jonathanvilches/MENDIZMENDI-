# Apuntador

Director de escena para vídeos y videollamadas. Mira tu cara (contorno, cejas, ojos, iris, labios), tu cuerpo
(hombros, codos, muñecas, postura) y cada mano con sus 21 puntos, y escucha tu voz. Con eso te dice en el
momento qué estás transmitiendo frente a lo que querías transmitir, te corrige y te da ideas para mejorarlo:
«Descruza los brazos», «Baja los hombros», «Sonríe más: tu mensaje es animado y tu cara se ve seria»,
«Asiente de vez en cuando», «Idea: enumera con los dedos lo próximo que digas»…

Es una app web: un `index.html` con su manifiesto, sus iconos y un service worker. Se instala en la pantalla de
inicio y se abre como una app, a pantalla completa y sin las barras del navegador.

## Una pantalla por paso

Al abrirla, el inicio pregunta qué quieres hacer y cada camino va de pantalla en pantalla. Cada una tiene un título,
lo justo para decidir y un solo botón fijo abajo. Arriba, la flecha para volver, el nombre del paso y su progreso.

| Camino | Pasos |
|---|---|
| **Grabar un vídeo** | 1 · Tu guion (escribir, pegar o subir) → 2 · Intención (el tono, con la sugerencia que sale del texto) → 3 · Revisión (qué cambiar en el guion y vista previa) → 4 · Antes de grabar (resumen, ensayo sí o no, control por voz y más ajustes plegados) → **Entrar al plató** |
| **Analizar un vídeo** | 1 · Intención (qué querías transmitir) → 2 · Tu vídeo (tocar o arrastrar el archivo) → análisis en el plató |
| **Videollamada** | 1 · Intención (cómo quieres que te vean) → 2 · Antes de empezar → **Empezar** |

- El resumen del último paso enseña lo elegido (tono, palabras y duración, objetivos de la próxima toma) y cada fila
  lleva al paso donde se cambia.
- El gesto de volver del iPhone y el botón «atrás» de Android retroceden un paso. Desde el plató o el informe vuelven
  a la mesa; no sacan de la app.
- Si un análisis o una toma dejan objetivos, el inicio los muestra con «Grabar con estos objetivos».

## Instalarla como app

- **iPhone y iPad (Safari):** Compartir → «Añadir a pantalla de inicio». El inicio lo explica con una tarjeta (y,
  si se abre desde Instagram o TikTok, primero pide abrirla en Safari).
- **Android y Chrome o Edge de ordenador:** botón «Instalar» en esa misma tarjeta (o el menú del navegador).
- Instalada, se abre con su icono y una entrada breve con el logo, sin barras. El service worker guarda la app y,
  la primera vez que se usan, los modelos de visión y la letra: después abre rápido y funciona sin conexión.
  Cada versión nueva llega sola porque la app se pide primero a la red.

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
(en el móvil se oculta). En la vista previa (paso «Revisión») los gestos se ven como emojis en el margen.

**Ensayo antes de grabar** (activado por defecto; se quita en el paso «Antes de grabar»). Pensado para vídeos de redes:
1. *Paso 1 · Ensayo*: «comenzamos» (o dos palmadas, o Ensayar) hace una prueba sin grabar, con todas las
   correcciones. «Corten» la para al momento.
2. Sin salir del plató aparece el resultado: ajuste al tono, lo que transmitiste, cómo es el arranque (los 3 primeros
   segundos, lo que decide en redes si se quedan a verte), si dura más de un minuto (Reels, TikTok, Shorts) y hasta
   tres cosas en las que fijarte.
3. *Paso 2 · Grabación de verdad*: «comenzamos» graba. Por defecto solo ves abajo los gestos que vienen y **la línea
   verde** si te acercas a tus objetivos (mejor que en el ensayo), **ámbar** si vas igual y **roja** si te alejas. Sin
   correcciones, sin monitor y sin dibujos encima. En «Antes de grabar», «Mientras grabas de verdad», se pueden volver a poner
   los avisos.
4. Cada ensayo dice cómo vas frente al anterior («Tus ensayos: 52% → 61% ▲ +9»).

**Luz, sonido, encuadre y nivel.** Antes de grabar, la información marca 💡 la luz, 🎙️ el sonido, 🎯 el encuadre y
📐 el nivel, cada uno con un dibujo de qué hacer (ver «Tu plano» más abajo), y avisa si algo falla. El resultado del
ensayo y el informe lo repiten con la solución y el dibujo:
- Luz (brillo de la cara frente al fondo): falta luz, algo oscuro, contraluz, demasiada luz (la cara se quema), un lado
  de la cara más oscuro, o bien iluminado.
- Sonido: se te oye bajo, satura en los picos, ruido de fondo (la voz destaca poco), o se te oye bien.
- Encuadre: muy cerca, lejos, manos fuera de plano, descentrado, cabeza cortada, mucho aire encima o buen encuadre.
- Nivel: torcido, cámara mirando hacia arriba o hacia abajo, móvil tumbado, o recto.

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
cómo hacerlo. «Grabarlo mejor» abre la cámara con el teleprompter (si el guion no está, te lo pide) y:
- al entrar te enseña los objetivos;
- en el monitor quedan marcados: en verde si los estás cumpliendo, en ámbar si ahora mismo fallan;
- sus avisos salen antes y con prioridad («🎯 Sonríe más»), y celebra cuando los corriges («¡Objetivo cumplido!») o
  cuando llevas un rato cumpliéndolos;
- el informe de la toma nueva compara antes y después: ajuste al tono, lo que transmitías y, por objetivo, la parte
  del tiempo con el problema («antes 64% → ahora 22%», ✅ Mejorado / ➖ Igual / ⚠️ Peor).

Lo mismo vale de una toma a la siguiente: «Grabar otra vez» sigue mejorando sobre la última toma. Los
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
- **«otra vez»** (o «repetimos», «de nuevo»): durante una toma, la corta, la descarta y vuelve a empezar desde el
  principio con su cuenta atrás. Entre tomas repite lo último (tras un ensayo, otro ensayo; tras grabar, otra
  grabación), y desde el informe vuelve al plató y empieza. Así se graba, se para y se repite sin ir al móvil.
- **«información»** (con el reconocimiento del navegador): despliega o pliega el panel de información.
- **«corten»**: no corta en seco. Aparece «⏹ Corto en 3» y sigue grabando ese margen (0, 2, 3 o 5 segundos, en
  «Antes de grabar»; 3 por defecto). Si lo has dicho sin querer o quieres repetir la frase, di **«seguimos»** y la grabación
  continúa. El botón Terminar y la tecla Esc usan el mismo margen, con «Cortar ya» para no esperar.
- **Mis palabras** (iPhone, iPad y Android; en «Automático» se usa en el móvil): la primera vez la app te pide decir
  «comenzamos», «corten», «seguimos» y «otra vez» dos veces cada una y aprende tu voz. Si ya las habías enseñado con
  una versión anterior, solo te pide la nueva («otra vez»). Después las reconoce sin conexión y sin
  abrir el micrófono otra vez, que es lo que cortaba la cámara en el iPhone con el reconocimiento del navegador.
  Solo cuenta una palabra dicha sola, con una pequeña pausa antes y después: leyendo el guion de corrido no se
  dispara. El botón 🎙️ «Mis palabras» del plató sirve para volver a enseñarlas (por ejemplo, con otro micrófono).
- **Reconocimiento del navegador** (Chrome y Edge de ordenador): entiende además «ensayo», «empezamos», «paramos»…
  y es el que hace que el texto siga tu voz.
- En «Antes de grabar» se elige el motor (Automático, Mis palabras, Navegador o Desactivado) y el margen al parar.
- Al terminar se guarda también ese margen, así que el final del vídeo incluye tu «corten»: recórtalo al editar o
  pon el margen a 0.

## Diseño

- Fuera del plató, claro y amable: fondo gris muy suave, tarjetas blancas de 24 px de radio, botones negros en
  píldora y un acento lima. Con el modo oscuro del sistema, todo pasa a oscuro con el lima como botón principal.
- En el plató, la cámara a pantalla completa con «hojas» claras encima (avisos, tarjetas del ensayo y de objetivos,
  monitor) y una barra de controles oscura y translúcida.
- Una sola tipografía, Lexend (pensada para leer con fluidez), en la interfaz y en el teleprompter. Escala de letra
  1,25; interlineado único (1,5 en texto y 1,2 en títulos; el teleprompter, 1,4); espacios en la rejilla de 8 px.
- Estructura de app: barra arriba (volver, nombre del paso y su progreso), una columna centrada de 640 px como
  máximo con márgenes de 16 px (o la zona segura del móvil) y la acción principal fija abajo. El informe usa la
  misma barra.
- Los ajustes van en grupos con interruptores, como en los ajustes del móvil, y lo menos usado queda plegado.
- El texto de los botones nunca se parte: en pantallas pequeñas pasan a otra fila o se quedan solo con el icono.
  Comprobado sin desbordes ni botones partidos en 320, 360, 375, 390, 414, 430, 768 y 1280 px.
- Movimiento solo donde dice algo: la entrada con el logo, el contenido de cada paso que llega desde el lado del que
  vienes, la palabra que cambia en el titular, la cuenta atrás, el anillo de la nota que se
  llena mientras cuenta y la respuesta de los botones al pulsarlos. Se desactiva si el sistema pide menos movimiento.

## Manos libres: todo con la voz

Se explica en el plató, que es donde se usa; antes de entrar no estorba:
- **Al entrar al plató**, en cada entrada y antes de la primera toma: la tarjeta «Manos libres» con las cuatro
  órdenes y qué hace cada una («comenzamos», «corten» con el margen que tengas puesto, «otra vez», «seguimos»),
  que se iluminan por turnos. Va después de tus objetivos (si los hay) y antes del plano; basta con decir
  «comenzamos» para quitarla y empezar.
- **Sin voz** (desactivada, o sin enseñarle aún tus palabras): la misma tarjeta, «Sin tocar el móvil», con las dos
  palmadas para empezar y «Terminar» para parar. Si falta enseñarle tu voz, el botón «Enseñar mi voz» lo hace ahí mismo.
- **Mientras esperas**: «Te escucho: di «comenzamos»…» abajo, con un punto que late con tu voz (se ve que escucha).
  Durante la toma, junto a la línea de abajo, «🎙️ «corten» · «otra vez»».
- **Antes de grabar** solo quedan los ajustes, plegados en «Control por voz»: qué reconocimiento se usa y el margen al parar.

## Que no arranque solo

Solo se pone a grabar cuando lo pides. Lo que antes podía colarse, y cómo se evita:
- **«Mis palabras» (iPhone):** una palabra cuenta como orden solo si se parece mucho más a esa orden que a las otras
  (en las órdenes de verdad, la distancia a la ganadora es como mucho la mitad que a la segunda; en las palabras
  corrientes, casi siempre más de dos tercios) y dura más o menos lo que duraba al enseñársela. Lo que arranca o
  reinicia una toma pide un poco más. Probado con 180 palabras corrientes y parecidas («vale», «otra cosa», «graba»,
  «comentamos»…): de 37 que se colaban con una voz variable, quedan 13, casi todas homófonas, sin perder ninguna
  orden de verdad.
- **Navegador (ordenador):** para arrancar solo valen «comenzamos», «empezamos», «acción» y «grabamos» (o «ensayo»,
  «ensayamos»), dichas sueltas. «Voy a grabar» o «empieza el vídeo» en mitad de una frase ya no cuentan.
- **Palmadas:** no cuentan si acabas de tocar la pantalla o de mover el móvil (al cogerlo, apoyarlo o pulsar, el
  micro oye golpes secos), si estabas hablando, ni si los dos golpes suenan muy distintos.
- **Y si aun así arranca:** durante la cuenta atrás, toca la pantalla, di «corten», pulsa Terminar o Esc, y se cancela.

## Tu doble: el personaje que te enseña los gestos

Un muñeco de líneas, como el esqueleto que dibuja lo que detecta, detrás de ti y a tu tamaño (anclado a tus hombros;
si no se te ve, donde deberías estar). Es un ensayo de gestos para luego aplicarlos al grabar:
- **En reposo**, la posición base: manos juntas a la altura del ombligo y codos sueltos. Transmite calma y deja las
  manos listas para el siguiente gesto.
- **Te anticipa el gesto**: unos 2,5 s antes de cada gesto del guion ya lo va haciendo («Viene…»), lo hace contigo
  al llegar a su palabra («¡Ahora!») y vuelve a la base.
- **Te enseña a corregir**: si cruzas los brazos, sacas las manos del plano o te quedas quieto, hace el gesto que
  lo arregla («Prueba esto»).
- **Te dice si lo haces bien**: se pone verde («¡Así! ✓») cuando tus manos están donde las suyas en la postura
  clave del gesto.
- **Por qué funciona cada gesto** (lenguaje corporal), en el aviso «En breve» de los ensayos: las palmas a la vista
  transmiten honestidad; los brazos abiertos, apertura e incluyen a quien te ve; la mano en el pecho, sinceridad;
  contar con los dedos ordena el mensaje; dibujar el tamaño hace la idea más fácil de recordar; palmas arriba y
  cejas levantadas invitan a pensar; un corte de lado con la mano descarta con firmeza; señalar lleva la mirada.

Sale en los ensayos. Al grabar de verdad, solo si lo pides («Antes de grabar» → «Tu doble»); aun así, solo lo ves
tú: no sale en el vídeo.

## Espacios

Un mismo ritmo en toda la app, para que cada título quede más cerca de lo suyo que de lo anterior: 8 px entre un
título y su subtítulo (o un antetítulo y su título), 12 px del título de una tarjeta a su contenido y 16 px del
título de una sección a lo suyo. Comprobado midiendo el hueco que se ve (del texto del título a lo primero que se
ve debajo) en todas las pantallas, a 390 y 1280 px.

## Fallos al leer: aviso para cortar

Mientras lees, la app compara lo que dices con el guion y, si te equivocas, te avisa en el momento con un aviso
rojo arriba («✋ Fallo al leer») para que cortes y repitas diciendo «otra vez». La palabra donde fallaste queda
subrayada en rojo en el texto.

| Fallo | Cómo lo ve | Dónde |
|---|---|---|
| ⏭️ Te saltas un trozo (3 palabras o más) | Lo que dices, alineado palabra a palabra con el guion | Chrome o Edge de ordenador |
| 🔁 Te trabas o vuelves a empezar la frase | Repites palabras que acabas de leer | Chrome o Edge de ordenador |
| 🔀 Cambias una palabra (o varias) | Una palabra que se parece poco a la del guion, con lo de alrededor bien leído | Chrome o Edge de ordenador |
| 🧭 Te sales del guion | Lo que dices no está en el texto | Chrome o Edge de ordenador |
| ⏸️ Te paras en seco a mitad de frase | Más de 1,8 s de silencio lejos de una coma, un punto o una pausa marcada, y luego sigues leyendo (así no salta al acabar el texto) | Todos, también iPhone |
| 🤔 Un «eeeh» alargado | Voz sostenida en el mismo tono y sin sílabas | Todos, también iPhone |

- Para no avisar por un error del reconocedor, una palabra distinta pero parecida (una letra, un plural) queda como
  «posible» y no avisa.
- Se ve aunque grabes con «solo la línea», porque es lo que te hace repetir la toma. Se desactiva en «Antes de
  grabar» → «Texto y avisos» → «Avisarme si me equivoco al leer».
- Al terminar el ensayo y en el informe salen los fallos con el momento exacto («0:12 · Te has saltado…»); en el
  informe, al tocar el momento, el vídeo salta ahí para que sepas dónde cortar al editar.
- **Revisión al terminar la toma (preparada).** Durante cada toma se guarda tu voz a 16 kHz y, al terminar, un
  reconocedor que funciona dentro del navegador (Vosk, con un modelo pequeño en español) escucha la toma entera
  sabiendo qué palabras tiene el guion y la compara palabra a palabra, con el momento de cada fallo. Funciona igual en
  el iPhone, donde el reconocimiento del navegador corta la cámara. Solo falta publicar el modelo de voz junto a la app
  (`models/vosk-model-small-es.tar.gz`, unos 40 MB, que cada dispositivo descarga una vez y guarda); mientras no
  esté, no se enseña nada y queda lo que se ve en directo.

## Tu plano: luz, sonido, encuadre y nivel

Antes de grabar, la pestaña **Plano** de la información enseña con un dibujo qué hacer con cada cosa:

| | Qué dibuja | Qué te dice |
|---|---|---|
| 💡 **Luz** | Vista desde arriba: tú, la cámara y dónde va la lámpara, con su haz. Debajo, una regla con el brillo de tu cara (oscuro · bien · quemado). | Falta luz → «luz aquí», delante y a un lado de la cámara. Contraluz → la luz de detrás tachada y una flecha hacia delante. Demasiada → aléjala y un difusor. Un lado oscuro → un folio blanco al otro lado que rebota la luz. |
| 🎙️ **Sonido** | Una regla de volumen con las zonas (bajo, bien, satura), el ruido de fondo y tu voz, y cuánto destaca una del otro. | Bajo → acerca el micro. Satura → aléjalo. Ruido → busca silencio o un micro de solapa. |
| 🎯 **Encuadre** | La imagen (vertical u horizontal) con los tercios, la silueta ideal y dónde estás tú, con una flecha si hay que moverse. | Cerca, lejos, descentrado (hacia qué lado), cabeza cortada o mucho aire encima. |
| 📐 **Nivel** | El móvil girado como está, una burbuja de nivel y, si hace falta, el móvil de lado. | Torcido (cuántos grados), mirando hacia arriba o hacia abajo, o tumbado. |

- El nivel sale del **sensor del móvil** (en iPhone y iPad pide permiso al entrar al plató). Sin sensor (ordenador),
  se mira la línea de los ojos y la de los hombros: si las dos se inclinan igual, lo torcido es la cámara.
- Encima de la imagen, antes de grabar: una **línea de nivel** en el centro que se pone verde («✓ Recto») al
  enderezar el móvil, y una **silueta discontinua** («Colócate aquí») mientras el encuadre no está bien. Las dos se
  apagan solas cuando ya está todo bien y no aparecen al grabar.
- La primera vez, al terminar la calibración, el plano se despliega solo (en el móvil, solo si hay algo que
  arreglar). Al terminar el ensayo y en el informe, lo que estaba mal sale con su dibujo.

## En pantalla

- **Información plegable**: todo lo que no es el texto ni el aviso de abajo está en un panel que se pliega en un
  botón pequeño en la esquina de arriba. Plegado enseña la nota y cuatro puntos de color (luz, sonido, encuadre y
  nivel); al tocarlo se despliega con un muelle suave y su contenido entra en cascada. Al empezar una toma se pliega
  solo y el botón se queda en un círculo con la nota, para no tapar la imagen; se puede abrir igualmente con un
  toque, con la tecla I o M, o diciendo «información». Tiene tres pestañas: **Plano**, **Cuerpo** y **Tono**.
- **Lo que detecta**, dibujado sobre tu imagen y en espejo: contorno de la cara, cejas, ojos, iris y labios;
  hombros, codos y muñecas; los dedos de cada mano; y la estela del movimiento de las manos. Cada parte toma el
  color de su estado (verde ayuda, ámbar frena, rojo corrige ya) y lleva una etiqueta con lo que está haciendo.
- **Cuerpo y tono** (pestañas de la información):
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

Atajos en el plató: Espacio empezar/pausar (con un vídeo subido, empezar el análisis o pausarlo), R grabar, Esc terminar (o plegar la información), ↑/↓ velocidad, +/− letra, S dibujo, I o M información.

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
