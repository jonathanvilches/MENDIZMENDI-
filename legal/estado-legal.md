# Estado legal de MENDIMENDIZ

**BORRADOR PENDIENTE DE REVISIÓN JURÍDICA.** Este documento lo mantiene el equipo de desarrollo como responsable de cumplimiento; no es asesoramiento legal. Todo lo marcado (VERIFICAR) debe confirmarse en fuentes oficiales (BOE, BON, EUR-Lex, AEPD) y, antes de publicar o cobrar, debe revisarlo un abogado especializado en videojuegos y protección de datos.

Última revisión: 2026-10-05.

## 1. Hechos del proyecto (a 2026-10-05)

- Videojuego web 3D (three.js r180, Vite 8) para descubrir pueblos de Navarra, orientado a familias y niños. Se juega en el navegador, sobre todo en móvil horizontal, también como app instalable (PWA) y como archivo único.
- Sin cuentas, sin servidor propio, sin analítica, sin publicidad, sin chat, sin compras. No hay ninguna petición de red a terceros desde el juego: three.js, los cargadores y las tipografías van empaquetados en el propio juego (autoalojados). El único acceso a red es la descarga del propio juego desde donde se publique (hoy GitHub Pages) y el service worker que guarda esa descarga en el dispositivo para jugar sin conexión.
- El progreso se guarda solo en el navegador (localStorage, claves listadas en el punto 6). No se guarda ningún dato personal: el nombre que escribe el jugador es un apodo libre que no sale del dispositivo.
- No se usa síntesis de voz del navegador (speechSynthesis), ni geolocalización, ni cámara, ni micrófono. El audio se sintetiza localmente con Web Audio.
- Contenido cultural real (pueblos, monumentos, tradiciones, personajes históricos) con personajes del juego ficticios.
- Recursos de origen mixto: ver `legal/registro-licencias.csv`.
- Mercado previsto: España y UE; venta a entidades públicas (turismo, cultura, educación) y, después, a familias.

## 2. Reglas permanentes: estado

| Regla | Estado | Nota |
|---|---|---|
| R1 Sin cuentas, formularios, analítica, publicidad, chat ni compras | Cumple | Nada de esto existe. El nombre del jugador es un apodo local. |
| R2 Registro de licencias; solo CC0, CC BY, MIT/Apache/OFL | Cumple en parte | Registro creado. Falta cerrar las condiciones de Meshy (VERIFICAR) y las licencias de los datos geográficos. |
| R3 Sin marcas, clubes, equipaciones ni estilos reconocibles | Cumple con reservas | Desde el 2026-10-06: equipaciones de los personajes sin logotipos, patrocinadores, escudos ni dorsales (telas lisas); fuera el nombre de Osasuna de textos, letreros, marcador y gradas (ahora IRUÑA); los 21 clubes se llaman como su pueblo o valle; fuera las menciones al FIFA. Quedan: el nombre «El Sadar» (topónimo del río y del barrio, pero también nombre del estadio) (VERIFICAR); colores lisos parecidos a los de clubes reales (VERIFICAR); el id interno «osasuna» en nombres de archivo (no se ve en el juego). |
| R4 Personajes ficticios; personas reales solo con base documentada | Cumple con reservas | Personajes históricos con biografías breves propias; Miguel Induráin es una persona viva (ÁMBAR). |
| R5 Datos culturales con palabras propias y fuente anotada | Cumple en parte | Textos propios; fuentes anotadas en `heritage.json` para parte de los pueblos. Falta el registro de verificación (documento 9). |
| R6 Sin cajas botín, azar de pago ni patrones oscuros | Cumple | Los «txanpon» se ganan jugando y se gastan en comida del juego; no hay dinero real ni aleatoriedad de pago. |
| R7 Diseño para menores de 14 (16 como previsión) | Cumple | Sin datos personales. Contenidos: encierro y toros con tono de juego (revisar en la clasificación por edad). |
| R8 Avisos de adaptación («trazado adaptado», «no usar para orientarse») | **Pendiente** | Hay avisos parciales (pelotaris inventados, clubes adaptados). Falta un aviso general en fichas de pueblos, mapa y cimas. |
| R9 Sin claves ni datos sensibles en el cliente | Cumple | Revisado el código: no hay tokens ni claves. |
| R10 Textos en lenguaje claro y preparados para euskera | Cumple en parte | Interfaz y juego en castellano y euskera (modo «Aprende euskera»). Faltan los textos legales en ambos idiomas. |

## 3. Puertas legales registradas

| Fecha | Función | Respuestas (1-8) | Color | Decisión |
|---|---|---|---|---|
| 2026-10-07 | Pelota con dirección exagerada, cortada más rápida y golpe más corto; fútbol con joystick que no se queda pulsado, pases precisos y cambio automático; diseño centrado en el móvil horizontal; edad de quien juega con misiones según la edad; escudo del pueblo en la casa consistorial | 1-8 No (código, textos y dibujos propios; la edad se guarda solo en el propio dispositivo y no se envía a ningún sitio; no se piden datos personales) | VERDE | Se publica. La edad es una franja elegida, no una fecha de nacimiento |
| 2026-10-07 | Escudos oficiales de Navarra: armorial con 56 escudos (reino, ciudades, valles y pueblos), pilar con el escudo en cada plaza, lectura guiada y escudo oficial en el frontón | 1-8 No (dibujos propios hechos a partir del blasón, que es una descripción pública; textos propios; no se copia ninguna imagen ni logotipo institucional; no se sugiere aval de ningún ayuntamiento) | VERDE | Se publica. Uso educativo de emblemas públicos. Los escudos sin comprobar no se dibujan. Las armas de casas siguen siendo inventadas y sin linajes |
| 2026-10-07 | Aprender Navarra como eje: saberes por categoría, lectura de escudos de fachada, datos de Navarra en el fútbol e informe de patrimonio | 1-8 No (código, textos y dibujos propios; escudos inventados con las reglas de la heráldica y nombres de casa comunes, sin atribuirlos a linajes ni casas reales; datos de fuentes oficiales y académicas redactados con palabras propias) | VERDE | Se publica. El ajedrezado de Baztán y las armas de Navarra son emblemas públicos. Sin marcas ni logotipos |
| 2026-10-07 | Pelota: el gesto de golpe ya no se repite tras un golpe al aire; pop-ups medidos en iPhone e iPad (botones de acción siempre a la vista, botones de 38 px o más, letra de 11 px o más, estadísticas en dos columnas, aviso de lista que sigue) | 1-8 No (código propio de interfaz y pruebas; sin datos de usuarios) | VERDE | Seguir. |
| 2026-10-07 | Pelota: el joystick apunta mientras se mantiene el golpe, dos paredes a la izquierda del todo, camino y bote dibujados en la cancha, bancos y público sentado en la grada; fútbol: balón más pegado al pie, portero llevado por ti que se coloca solo y se lanza al lado elegido en el momento justo; estadio: red visible, cubetas de asiento, rótulo luminoso, palcos y público más lleno y variado | 1-8 No (mecánica, marcas y escenario propios; rótulos con palabras genéricas y el nombre del juego, sin marcas, patrocinadores ni logos de clubes) | VERDE | Seguir. |
| 2026-10-07 | Vigía de figuras en fútbol y pelota: paso de andar a correr sin tirones, llegada andando a su sitio en los saques, fundido al recolocar a todos tras un gol, guardas contra posturas rotas y posiciones imposibles, y pruebas automáticas que lo vigilan | 1-8 No (código propio de animación y pruebas; sin datos de jugadores ni de terceros) | VERDE | Seguir. |
| 2026-10-07 | Pelota: la carga decide la altura de la cortada y la dejada en el frontis y la largura del golpe, con marca de puntería en la pared; fútbol: diana en la portería al cargar el tiro, marca y línea del pase, puntería de palo a palo con el joystick y giro más rápido | 1-8 No (mecánica y marcas propias, sin interfaces ni textos copiados de otros juegos) | VERDE | Seguir. |
| 2026-10-06 | Torneo de pelota entero en el frontón elegido; frontón distinto en cada pueblo dentro de su comarca; pelotari sin gesto repetido y cámara más cerca; fútbol: portero que se lanza a tiempo, pase y tiro con fuerza al mantener, faltas, tarjetas amarillas y rojas, ventaja, expulsiones y penaltis | 1-8 No (mecánica propia; reglas del fútbol descritas con palabras propias, sin textos ni logos de federaciones; pelotaris y árbitros inventados) | VERDE | Seguir. |
| 2026-10-06 | Frontones según la comarca (frontis de sillería, colores de pared, suelo y colchón, cubierta de madera laminada o de acero) y caminos de los vecinos (búsqueda de camino, escalones, matas con choque) | 1-8 No (estilo regional descrito con palabras propias a partir de fuentes públicas; no se copia ninguna foto ni plano ni el aspecto exacto de un frontón concreto; texturas y geometría generadas por el juego) | VERDE | Seguir. Fuentes leídas: Ayuntamiento de Pamplona (Labrit, cubierta de chapa y policarbonato), Arquitectura Viva (Gure Jokoa de Orkoien y frontón de Aguilar de Codés, madera laminada), Carta España (piedra rojiza de Elizondo), EAI (frontones junto a la iglesia), Noticias de Navarra (frontón Baztan, 1975). |
| 2026-10-06 | Campeonatos de pelota y fútbol desde el menú; tormenta con rayos y truenos (cielo y sonido generados por el juego); vecinos nuevos vestidos sobre los personajes de Meshy del usuario; euskera ampliado (unas 1.500 frases traducidas por el asistente) | 1-8 No (mecánica, sonido e imagen propios; modelos del usuario) · traducción automática: VERIFICAR por un hablante nativo | VERDE | Seguir. Revisión del euskera por una persona nativa antes de publicar. |
| 2026-10-06 | Pelota: joystick directo y reglas de la pared izquierda y del frontis; fútbol: sprint; revisión general (memoria, sonido, salir) | 1-8 No (mecánica y reglas descritas con palabras propias) | VERDE | Seguir. |
| 2026-10-06 | Portadas de pueblo estilo ilustración con el personaje en acción; fútbol: portero jugable con los pies, pase al hueco mantenido, frenada con el balón | 1-8 No (imágenes propias renderizadas y pintadas por filtro; mecánica propia) | VERDE | Seguir. |
| 2026-10-06 | Portadas de cada pueblo (foto del propio juego con el personaje y luz de estudio), marcador fino de pelota y control del portero en fútbol | 1-8 No (imágenes renderizadas por el juego con personajes propios; mecánica propia) | VERDE | Seguir. |
| 2026-10-06 | Pelota: golpe con carga (cuanto más se mantiene, más fuerte) y cuatro tipos de dos paredes | 1-8 No (mecánica y textos propios) | VERDE | Seguir. |
| 2026-10-06 | Pelota: cortada con su botón; dos paredes y dirección del golpe con el joystick | 1-6 No · 7 Sí: «cortada» y «dos paredes» descritos como golpes de la pelota a mano (dato cultural general, con palabras propias) · 8 No | VERDE | Seguir. |
| 2026-10-06 | Portada del menú estilo portada de videojuego (vista de la comarca de fondo y el personaje en grande con luz de atardecer) | 1-8 No (imágenes propias renderizadas por el juego) | VERDE | Seguir. |
| 2026-10-06 | Portadas de comarca nuevas (vistas aéreas del propio juego al atardecer con acabado de portada) y recolocación de frontones y casas | 1-8 No (imágenes propias renderizadas por el juego; sin contenido de terceros) | VERDE | Seguir. Fotos anotadas como obra propia. |
| 2026-10-06 | Quitar los avatares que ya no se usan (seis de KayKit con sus retratos, tres de Blender y siete diseños antiguos de minifigura) | 1-8 No (se quita contenido; no entra nada nuevo) | VERDE | Seguir. Registro de licencias al día. |
| 2026-10-06 | Portada vertical para el móvil de pie y texturas de los personajes propios a 1024 px | 1-8 No (imágenes propias hechas por el juego; las texturas son las mismas a menos resolución) | VERDE | Seguir. |
| 2026-10-06 | Portadas del menú a más resolución (fondo de cada comarca a 1600×900 y capa del personaje encima) y retratos de personajes en WebP en vez de PNG | 1-8 No (imágenes propias hechas por el juego; mismo contenido, otro formato) | VERDE | Seguir. |
| 2026-10-06 | Quitar marcas y logotipos: texturas de los futbolistas y pelotaris limpiadas (sin Kosner, Macron, Joma, Baiko, escudos ni dorsal), nombres de clubes reales cambiados por el del pueblo, Osasuna fuera de textos y letreros del estadio | 1 No · 2 No · 3 Sí: modelos de Meshy modificados (anotado en el registro) · 4 Sí · 5 No · 6 No · 7 Sí: «El Sadar» y colores de equipos (VERIFICAR) · 8 No | VERDE | Seguir. Mejora R3. Revisar con un abogado el uso de «El Sadar» y de los colores. |
| 2026-10-05 | Portada del menú y llegada a cada pueblo con imagen fija (fotos de las comarcas hechas de antemano por el propio juego, sin escena 3D en vivo ni vuelo de cámara), imágenes pequeñas dibujadas con el renderizador del juego (sin abrir más contextos WebGL) y recolocación de árboles, frontón, pista, tractores y personajes para que no se monten unos sobre otros | 1 No · 2 No (al contrario: las fotos de las comarcas ya no se guardan en IndexedDB, vienen con el juego) · 3 No (imágenes propias generadas por el juego, anotadas en el registro) · 4 Sí · 5 No · 6 No · 7 No · 8 No | VERDE | Seguir. Fotos añadidas al registro de licencias como obra propia. |
| 2026-10-05 | Recuperación tras quedarse sin memoria gráfica (rehacer el pueblo o recargar y volver al mismo pueblo) y retratos de los vecinos preparados durante la carga | 1 No · 2 Sí, sessionStorage con el id del pueblo (se borra al arrancar) e IndexedDB de imágenes ya existente · 3 No · 4 Sí · 5 No · 6 No · 7 No · 8 No | VERDE | Seguir. Añadido a la tabla del punto 6. |
| 2026-10-05 | Fútbol como minijuego (partido directo, sin entrenamiento ni menú), cambios de control del fútbol y la pelota (golpe a dos paredes), lluvia más baja | 1-6 No · 7 Sí: «dos paredes» descrito como golpe de la pelota a mano (dato cultural general) · 8 No | VERDE | Seguir. Los nombres de clubes reales siguen pendientes de la decisión ROJO del informe. |
| 2026-10-05 | Estado actual del juego completo (primera auditoría) | 1 No (apodo local) · 2 Sí, localStorage y caché del service worker · 3 Sí, ver registro · 4 Sí · 5 No (solo puntos y «txanpon» del juego) · 6 No, salvo descargar el juego · 7 Sí · 8 Sí, se juega con el móvil en la mano | ÁMBAR | Seguir con los cambios del informe (`legal/informe-auditoria-inicial.md`). Los puntos ROJO (clubes reales) esperan decisión del titular. |

A partir de ahora, cada función nueva pasa por la puerta legal antes de implementarse y se anota aquí.

## 4. Checklist por área

- **A. Datos personales.** Sin tratamiento. Pendiente: política de privacidad en capas que explique que no se recoge nada y qué se guarda en el dispositivo (fase 2).
- **B. Almacenamiento y cookies.** Sin cookies. localStorage y caché del service worker solo para el progreso y para jugar sin conexión (exentos de consentimiento por ser estrictamente necesarios, art. 22.2 LSSI-CE, VERIFICAR). Pendiente: explicarlo en la política de almacenamiento local y el aviso legal con datos del titular (fase 2).
- **C. Menores.** Sin contacto con desconocidos, sin enlaces externos dentro del juego (comprobado: no hay enlaces salientes en la interfaz). Pendiente: autoevaluación IARC/PEGI y documentarla; seguir la ley de menores en entornos digitales (VERIFICAR estado).
- **D. Propiedad intelectual y licencias.** Registro creado. Pendiente: pantalla de créditos y licencias dentro del juego (fase 1); copia fechada de las condiciones de Meshy; cesión de derechos por escrito si alguien externo crea contenido (hoy no hay nadie).
- **E. Marcas y parecidos.** ROJO abierto: clubes reales (ver informe). Pendiente: búsqueda de anterioridades de «MENDIMENDIZ» (OEPM/EUIPO) y dominio (fase 3).
- **F. Imagen, honor y tradiciones.** Personajes históricos con tono respetuoso. Pendiente: revisar el trato de Miguel Induráin (persona viva) y el de tradiciones vivas (Momotxorro, joaldunak, Basajaun, Lamia); valorar consultar a las entidades que las custodian.
- **G. Datos geográficos y culturales.** Pendiente: anotar fuente y licencia de montes y localidades (Ley 37/2007) y poner los avisos de R8.
- **H. Consumo y venta.** No aplica todavía (no se cobra).
- **I. Azar, premios y publicidad.** Cumple: sin sorteos, sin premios de valor económico, sin publicidad ni patrocinios.
- **J. Accesibilidad.** Parcial: botones táctiles de 44 px o más en la interfaz principal, etiquetas aria-label en los botones con solo icono, contraste alto en paneles. Se respeta `prefers-reduced-motion` (sin animaciones ni transiciones). El grupo de niveles de la pelota lleva su nombre accesible («Nivel» / «Maila») aunque en pantallas bajas se oculte la etiqueta visible. Pendiente: texto escalable (el viewport bloquea el zoom: `user-scalable=no`), control completo por teclado en los minijuegos táctiles, subtítulos no necesarios (no hay voces), declaración de accesibilidad.
- **K. Seguridad.** Autoalojado todo. Pendiente: cabeceras de seguridad (CSP, X-Content-Type-Options, Referrer-Policy) cuando se publique en un servidor propio (GitHub Pages no permite configurarlas: VERIFICAR alternativas o meta CSP).
- **L. Tiendas de apps.** No aplica todavía (PWA sin tienda).
- **M. Contratación pública.** No aplica todavía. Pendiente: dossier de cumplimiento (fase 3).
- **N. Empresa y fiscalidad.** Pendiente (fase 3, gestoría).
- **O. Ubicación, cámara y realidad aumentada.** No se usan.

## 5. Decisiones tomadas

- 2026-10-05: se crea la carpeta `legal/` con este estado, el registro de licencias y el informe de auditoría inicial. No se cambia código por motivos legales hasta el visto bueno del titular.

## 6. Qué se guarda en el dispositivo (para la política de almacenamiento local)

| Clave de localStorage | Contenido | Datos personales |
|---|---|---|
| `mendimendiz-perfil-v1` | apodo elegido, avatar, nivel y XP, progreso de pueblos y misiones, cartas del cuaderno, insignias, ajustes (música, volumen, calidad) | No (el apodo es libre y no se envía) |
| `mendimendiz-lang` | idioma elegido (es / eu / aprender euskera) | No |
| `mendimendiz-salazar-v2` | progreso de la partida del valle de Salazar | No |
| `mendimendiz-liga-v1` | temporada de la liga de fútbol del juego | No |
| `mendimendiz-torneo-v1` | torneo de pelota del juego | No |
| `mendimendiz-futbol-v1` | retos de fútbol superados | No |
| `mendimendiz-img` (IndexedDB, no localStorage) | imágenes generadas por el juego (retratos de los vecinos, iconos, sellos) guardadas para no rehacerlas | No |
| `mendimendiz-volver` (sessionStorage) | solo el identificador del pueblo en el que estabas, durante un instante, para volver a él si el juego tiene que recargarse porque el dispositivo se quedó sin memoria gráfica; se borra al arrancar | No |
| Caché del service worker (`mendimendiz-<versión>` y `mendimendiz-assets`) | copia del propio juego para jugar sin conexión | No |

Todo se borra desde «Perfil → Borrar todo el progreso» o borrando los datos del sitio en el navegador.

## 7. Pendientes ordenados

1. Decisión del titular sobre los ROJO del informe (clubes y estadio reales).
2. Pantalla «Créditos y licencias» alimentada por el registro (fase 1).
3. Copia fechada de las condiciones de Meshy y confirmación del uso comercial (VERIFICAR).
4. Avisos R8 en fichas, mapa y cimas; fuente y licencia de datos geográficos.
5. Registro de verificación de contenidos culturales (documento 9).
6. Accesibilidad: movimiento reducido, zoom, declaración (fase 2).
7. Aviso legal, privacidad y almacenamiento local, en castellano y euskera (fase 2).
8. Clasificación por edad IARC/PEGI (fase 2).
