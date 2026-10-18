# Apuntador

Director de escena para vídeos y videollamadas. Mira tu cara (contorno, cejas, ojos, iris, labios), tu cuerpo
(hombros, codos, muñecas, postura) y cada mano con sus 21 puntos, y escucha tu voz. En el ensayo te va diciendo
qué hacer; grabando de verdad no te interrumpe: arriba, unos medidores de reojo (tu nota, sonrisa, gestos y voz) y,
al terminar, te enseña sobre tu propio vídeo, parándolo en cada momento clave, qué pasó y cómo hacerlo: «Saluda con
la mano: no se vio», «Manos fuera de plano», «Más despacio»… En una videollamada te avisa en el momento: «Descruza
los brazos», «Asiente de vez en cuando»…

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
brazos» en «todos»…), los marca en el margen del texto y comprueba si los haces; en la revisión te enseña cómo
hacerlos. Como estás leyendo, en este modo no te corrige la mirada. Marcas: `[animado]` cambia el tono desde
ese párrafo, `//` es una pausa, `*palabra*` pide énfasis y `{abre los brazos}` es una acotación tuya.

**Código de colores en el texto.** Las palabras con una función llevan su color, para verlo de un vistazo sin salir
del texto: 🔴 **rojo**, énfasis (sube la voz en esa palabra); 🔵 **azul**, pausa justo después (con una raya azul en el
hueco); 🟡 **amarillo**, un gesto (su emoji, en el margen). Las pausas son las que marcas tú y las de antes de «pero»,
«sin embargo» o «aunque». En la vista previa del guion (paso «Revisión») basta con **tocar una palabra**: un toque,
énfasis; dos, pausa después; tres, sin marca. Se escribe en tu guion con las mismas marcas que a mano (`*palabra*` y
`//`), así que se puede ver y cambiar. Debajo de la vista previa, y en el plató antes de empezar (arriba a la
izquierda), sale la clave con los colores que hay en ese guion; al leer se quita. Se puede apagar en «Texto y
avisos → Colores en el texto».

**El texto se lee limpio.** En el teleprompter solo están las palabras que dices (las pausas `//` son una raya fina;
el énfasis, otro color) y, en el margen, el emoji de cada gesto. Grabando de verdad, por defecto, solo se añaden los
medidores de arriba (ver «Ensaya, graba y revisa»). En el ensayo (o con «avisos» elegido), abajo, cerca de los botones:
- *En breve*: el gesto que viene, unos 2,5 segundos antes de su palabra, con una barra que se vacía;
- *¡Ahora!*: el gesto en su momento (con la figura animada que lo hace) y ✓ si lo haces;
- la línea verde, ámbar o roja que dice si vas bien;
- las correcciones, cortas y de una en una.

Mientras lees no hay ideas, ni etiquetas del esqueleto (que queda tenue), ni línea de estado, y el monitor se recoge
(en el móvil se oculta). En la vista previa (paso «Revisión») los gestos se ven como emojis en el margen.

**Ensayo antes de grabar** (activado por defecto; se quita en el paso «Antes de grabar»).
1. *Paso 1 · Ensayo*: «comenzamos» (o dos palmadas, o Ensayar) hace una toma de prueba con el coach hablándote, que
   se graba solo para revisarla. «Corten» la para al momento.
2. La revisión sobre su vídeo, como la de cualquier toma, con el arranque (los 3 primeros segundos, lo que decide en
   redes si se quedan a verte) y la duración (Reels, TikTok, Shorts) en el informe.
3. *Paso 2 · Grabación de verdad*: «Grabar la buena» (o «comenzamos») graba, con los medidores arriba; «Otro
   ensayo» repite la prueba. Con «Al grabar de verdad: avisos y medidores», además, los avisos y **la línea verde** si
   te acercas a tus objetivos (mejor que en el ensayo), **ámbar** si vas igual y **roja** si te alejas.
4. Si el navegador no puede grabar vídeo, el resultado del ensayo sale en una tarjeta sin salir del plató, y cada
   ensayo dice cómo vas frente al anterior («Tus ensayos: 52% → 61% ▲ +9»).

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

## Ensaya, graba y revisa

Leyendo un guion no da tiempo a leer avisos («sube las manos», «sonríe»…): despistan y se lee peor. Por eso cada
momento tiene su ayuda:

| Momento | Qué ves mientras lees | Para qué |
|---|---|---|
| 🧪 **Ensayo** | El coach te habla: el gesto que viene («En breve»), qué corregir, y los medidores arriba | Aprender qué hacer |
| 🔴 **Grabación de verdad** | Solo los **medidores**, para mirarlos de reojo, sin ningún texto | Saber cómo vas sin perder el hilo |
| ✅ **Al terminar** | La **revisión sobre tu vídeo**, parándose en cada momento clave | Ver qué mejorar y cómo |

**Los medidores** (arriba, en una cápsula oscura): tu nota (el anillo, de 0 a 100) y tres barras con icono —
🙂 sonrisa, 🙌 gestos con manos y brazos, 🎙️ voz (entonación)—. En cada barra, la franja verde es lo que pide el tono
que elegiste (un mensaje animado pide más sonrisa y más gestos que uno serio) y el punto es cómo vas: verde, dentro
de la franja; ámbar, cerca; rojo, lejos. A la derecha, ✋ 2/8: los gestos del guion que has hecho de los que ya han
pasado (salta un poco cada vez que aciertas). Se leen sin leer, solo con el color y la posición. Tocarlos abre «Cómo
te ves», con las mismas barras con nombre y «falta / bien / sobra».

**La revisión**, al terminar (ensayo o grabación; el ensayo se graba solo para esto, en el dispositivo):
1. Es lo primero que se ve: el vídeo, la línea de la toma con sus notas (rojo, a mejorar; ámbar, a vigilar; verde,
   bien hecho) y «Revisar con el coach». El vídeo se para en cada nota y una tarjeta dice qué pasó, lo que estabas
   diciendo («Estabas diciendo «¡Hola a todos! Hoy…»») y cómo hacerlo, con una marca encima del vídeo. «Seguir» va a
   la siguiente; «Verlo otra vez» vuelve unos segundos atrás y se para después; la flecha, a la anterior; tocar una
   nota de la línea la abre. Se puede quitar «Parar el vídeo en cada nota» para verlo de corrido.
2. Al final, una sola cosa para la próxima toma («Fíjate solo en esto», con cómo hacerlo) y «Otra toma» (tras un
   ensayo, «Grabar la buena» u «Otro ensayo»). La cuenta atrás de la siguiente toma te la recuerda («🎯 Esta vez,
   fíjate en: 🐢 Más despacio»). Lo demás puede esperar: una cosa cada vez se aprende antes.

En «Antes de grabar» se elige qué se ve en cada momento: **En el ensayo** (avisos y medidores · solo medidores · solo
el texto) y **Al grabar de verdad** (medidores · solo el texto · avisos y medidores). Con el vídeo de la revisión
sonando, las órdenes de voz no cuentan (lo que oye el micro es tu propia voz grabada).

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
  «comenzamos», «corten», «seguimos» y «otra vez» dos veces cada una y aprende tu voz (mejor desde donde vas a
  grabar). Después las reconoce sin conexión y sin
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

## Órdenes de voz desde lejos

Grabando, el móvil está a uno o dos metros: llega menos voz y más eco de la habitación, y la huella de la palabra
cambia tanto que dejaba de reconocerse. Medido con 692 grabaciones (10 voces, en español e inglés, enseñadas cerca y
dichas a otra velocidad y tono): a 2 metros con eco, la versión anterior reconocía entre 2 y 3 de cada 10 órdenes;
ahora, 97–99 de cada 100.
- **Cómo te oiría de lejos:** al enseñar tus palabras se guarda también su sonido, y con él se calcula cómo sonaría
  cada una en dos salas con eco (reverberación de Schroeder), más lejos y con ruido de fondo. Esas versiones se
  comparan como si las hubieras grabado tú.
- **Si no entra a la primera, repítela:** lo que se parece bastante pero no del todo («¿«corten»? Repítela») vale si
  lo repites en 5 segundos, siempre que las dos veces se parezcan entre sí (dos palabras distintas seguidas no
  cuentan). Con ruido de fondo, todas las órdenes que fallaban a la primera entran así. Y la app se queda con esas
  dos formas para la próxima vez (hasta 4 por palabra).
- **Quien ya las había enseñado** con la versión anterior las vuelve a decir una vez (20 segundos), porque hace
  falta su sonido para calcular las versiones de lejos.
- Las palabras parecidas que se cuelan no aumentan (las mismas homófonas de antes: «comentamos», «corte», «cup»…).

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

## Entrenar un minuto al día

Ejercicios cortos (menos de un minuto) con una sola meta, que es lo único que se mide y lo único que se avisa
mientras lo haces (más lo crítico, como que no se te vea). No se graba vídeo.

| Ejercicio | Meta | Cómo se puntúa (0–100) |
|---|---|---|
| ⚡ Prueba de 30 segundos | Leer con naturalidad | La nota general de la toma; te dice cómo puedes parecer y qué ejercicio te conviene |
| 🎣 Tu gancho en 3 segundos | La primera frase de tu guion, con energía y mirando al objetivo | Los 4 primeros segundos: cómo transmites (60%) y mirada al objetivo (40%) |
| 👀 Mira al objetivo | Vista en la cámara | Parte del tiempo mirando al objetivo |
| 🎵 Voz con melodía | Subir en las palabras marcadas | Entonación con vida y énfasis conseguidos |
| 🙌 Manos que hablan | El gesto de cada frase | Gestos del texto conseguidos |
| 😄 Sonrisa que se oye | Sonreír al empezar cada frase | Parte del tiempo sonriendo |
| ⏸️ Pausas que dan peso | Parar en cada `//` | Pausas marcadas que hiciste |

Al terminar, una tarjeta con la nota, tu récord, la vez anterior y un consejo con el porqué. «Otra vez» (o la voz)
lo repite y «Otro ejercicio» pasa al siguiente sin cerrar la cámara. La lista guarda en este dispositivo tu récord, tu
evolución (una pequeña gráfica) y los días seguidos (un día suelto de descanso no rompe la racha), y arriba pone el que te conviene hoy: el de tu objetivo
pendiente del último informe, o el que te recomendó la prueba.

La **prueba de 30 segundos** está en el inicio: es lo primero que se puede hacer, sin registrarse y sin preparar
nada, para ver en medio minuto qué te aporta la app.

## Inglés y español

La app está en los dos idiomas. Sale en el del navegador (español si es español; si no, inglés) y se cambia con el botón
ES/EN de arriba, que lo recuerda. Con el idioma cambian también:
- **Las órdenes de voz**: «comenzamos / corten / otra vez / seguimos» o “action / cut / again / keep going”. Las del
  navegador se entienden siempre en los dos idiomas; «Mis palabras» aprende las que digas tú.
- **El idioma de la voz** (variantes de EE. UU., Reino Unido, India, Australia, Canadá, España, México, Argentina,
  Colombia…), el manifiesto para instalarla y el guion de ejemplo.
- **El análisis del guion**, que va por el idioma del propio texto (se detecta solo): palabras que marcan gestos, tono,
  revisor (gancho, llamada a la acción, «tú» frente a «yo», muletillas), etiquetas como `[upbeat]` o `[animado]` y los
  números leídos en palabras.

Cómo está hecho: los textos del código van en pareja, `LL('español', 'English')`, y los de la página, en un diccionario
que se aplica al cargar. Una prueba recorre la app en inglés (inicio, pasos, plató, panel, ejercicio, ensayo e informe)
y avisa si queda algo en español.

## Subtítulos

Al grabar con guion, el informe ofrece **Subtítulos (.srt)**: cada palabra del guion con el momento en que llegó a la
línea de lectura, en trozos de hasta 7 palabras sin partir frases, listos para subir a TikTok, Reels, Shorts o YouTube.

## Pantalla limpia y momentos clave

- Al grabar, la imagen queda limpia: las líneas de lo que detecta pasan a ser el **modo análisis** (botón de la
  figura en el plató, o tecla S). Los gestos del guion están en el margen del texto, quietos.
- En el informe, **momentos clave**: cada fallo al leer, gesto del guion (hecho o no) y aviso, con su minuto y lo que
  estabas leyendo («…primero, la luz; segundo…»). Con vídeo, tocarlo lleva a ese momento.
- En la revisión, cada gesto del guion que no se vio dice cómo hacerlo y por qué funciona (lenguaje corporal): las
  palmas a la vista transmiten honestidad; los brazos abiertos, apertura; la mano en el pecho, sinceridad…

## Espacios

Un mismo ritmo en toda la app, para que cada título quede más cerca de lo suyo que de lo anterior: 8 px entre un
título y su subtítulo (o un antetítulo y su título), 12 px del título de una tarjeta a su contenido y 16 px del
título de una sección a lo suyo. Comprobado midiendo el hueco que se ve (del texto del título a lo primero que se
ve debajo) en todas las pantallas, a 390 y 1280 px.

## Fallos al leer: aviso para cortar

Mientras lees, la app compara lo que dices con el guion y apunta cada fallo; en la revisión, el vídeo se para en él
con lo que estabas diciendo. Con avisos (en el ensayo, por defecto), además te avisa en
el momento con un aviso rojo arriba («✋ Fallo al leer») para que cortes y repitas diciendo «otra vez», y la palabra
donde fallaste queda subrayada en rojo en el texto.

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

La información del plató tiene dos pestañas: **Tu plano** y **Cómo te ves**. En Tu plano, cada parte va en su
pestaña (💡 Luz · 🎙️ Sonido · 🎯 Encuadre · 📐 Nivel) con un **punto de color**: verde, bien; ámbar o rojo, a cambiar.
Al abrirse por primera vez se pone en la parte que peor está. Cada parte, de arriba abajo:

1. **Cómo está ahora**, en una frase («⚠️ Algo oscuro · Un poco más de luz de frente…»).
2. **Qué tienes** (se queda guardado):
   - Luz: 🪟 ventana, ⭕ aro de luz, 🔲 foco o panel, 💡 lámpara o 🏠 solo la del techo (puedes marcar varias).
   - Sonido: 📱 el móvil, 🎧 auriculares con micro, 🎙️ micro de solapa o 🎤 micro de mesa.
   - Nivel: 📐 trípode, 📚 apoyado en algo o ✋ en la mano.
3. **Un dibujo con dónde ponerlo**, cada aparato numerado: la luz vista desde arriba (tú, el móvil y cada luz con su
   haz), el micro visto de lado (con la distancia: «un brazo y medio», «un palmo»), el encuadre con la silueta ideal y
   dónde estás tú, y el móvil con su burbuja de nivel. Lo que mide la cámara se dibuja encima: la luz de detrás
   tachada si hay contraluz, «más cerca» o «más lejos», un folio blanco en el lado oscuro…
4. **Los pasos**, con los mismos números del dibujo. Por ejemplo, con ventana, aro y lámpara: ① ventana delante de
   ti, con el móvil entre los dos, nunca a tu espalda; ② aro detrás del móvil, a la altura de los ojos; ③ lámpara al
   otro lado y más lejos, para suavizar la sombra. Con solo la del techo: de día, frente a una ventana; de noche,
   una pantalla en blanco delante de ti a la altura de la cara.
5. **La medida en directo**: el brillo de tu cara (oscuro · bien · quemado) o tu voz frente al ruido.

- El nivel sale del **sensor del móvil** (en iPhone y iPad pide permiso al entrar al plató). Sin sensor (ordenador),
  se mira la línea de los ojos y la de los hombros: si las dos se inclinan igual, lo torcido es la cámara.
- Encima de la imagen, antes de grabar: una **línea de nivel** en el centro que se pone verde («✓ Recto») al
  enderezar el móvil, y una **silueta discontinua** («Colócate aquí») mientras el encuadre no está bien. Las dos se
  apagan solas cuando ya está todo bien y no aparecen al grabar.
- En **Cómo te ves**: tu nota, lo que transmites frente a lo que querías, los tres medidores con nombre y, plegado,
  cada parte del cuerpo y todas las medidas.
- Al terminar, en el informe, lo que estaba mal sale con su dibujo (la luz, con tus aparatos).

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
- **Informe** al terminar, debajo de la revisión, con un panel muy claro:
  - la nota (ajuste al tono) con un «¡Bien!», «Casi» o «A mejorar» y, si repites, «▲ +10 frente a tu ensayo»;
  - 🔴 *En qué fallas*: hasta tres cosas, con la parte de la toma que estuvo mal, cuánto era antes y cómo corregirlo;
  - 🟢 *Lo que has mejorado* o *Lo que haces bien*;
  - el arranque y la duración para redes;
  - la lista de momentos clave (tocarlos lleva a esa nota de la revisión);
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
