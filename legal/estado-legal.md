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
| R3 Sin marcas, clubes, equipaciones ni estilos reconocibles | **No cumple** | Osasuna, El Sadar, 21 clubes navarros con nombre y colores reales, menciones al FIFA en comentarios. Ver informe. |
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
- **J. Accesibilidad.** Parcial: botones táctiles de 44 px o más en la interfaz principal, etiquetas aria-label en los botones con solo icono, contraste alto en paneles. Se respeta `prefers-reduced-motion` (sin animaciones ni transiciones). Pendiente: texto escalable (el viewport bloquea el zoom: `user-scalable=no`), control completo por teclado en los minijuegos táctiles, subtítulos no necesarios (no hay voces), declaración de accesibilidad.
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
| `mendimendiz-img` | imágenes generadas por el juego guardadas para no rehacerlas | No |
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
