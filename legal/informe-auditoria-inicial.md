# Informe de auditoría legal inicial (punto 7 del marco legal)

**BORRADOR PENDIENTE DE REVISIÓN JURÍDICA.** Fecha: 2026-10-05. Alcance: el código y los recursos actuales del repositorio. No se ha cambiado código: cada punto espera el visto bueno del titular.

## Semáforo por hallazgo

| # | Hallazgo | Color | Qué hay hoy | Qué habría que hacer |
|---|---|---|---|---|
| 1 | Clubes de fútbol reales (21 nombres, colores de equipación y campos en `src/futbol/clubs.js`) | **ROJO** | La Liga Navarra del juego usa los nombres reales de clubes navarros (CD Baztan, CD Tudelano, Peña Sport FC…) y sus colores. Tres son adaptaciones. No hay escudos. | R3 lo prohíbe. Opciones: (a) clubes ficticios con nombre del pueblo y colores propios («Lesaka KE», «Tudela CF» no vale: sigue siendo reconocible), (b) pedir permiso por escrito a cada club o a la Federación (lento), (c) mantenerlo solo si un abogado confirma que el uso de nombres como dato de hecho es admisible. Recomendación: (a). |
| 2 | Osasuna y El Sadar (nombre del club, estadio, camiseta roja y azul, personaje «Iker, futbolista de Osasuna», «Leire, entrenadora de la cantera de Osasuna», ficha del estadio) | **ROJO** | Marca y estadio de un club profesional con equipación reconocible; modelo Meshy «osasuna». | Sustituir por un club y un estadio ficticios de Pamplona («el estadio de Pamplona», equipo rojo sin nombre de club) y renombrar el personaje a «futbolista de Pamplona». Mantener la ficha del estadio solo como edificio de la ciudad, sin nombre comercial, o retirarla. |
| 3 | Menciones a «FIFA» | ÁMBAR | Solo en comentarios del código y en una frase de diálogo del entrenador («como en el FIFA»). | Quitar la frase del diálogo y los comentarios. Sin riesgo mientras no se muestre al jugador. |
| 4 | Modelos generados con Meshy (6 personajes) | ÁMBAR | Son generaciones del autor. No consta copia de las condiciones del plan ni confirmación de uso comercial. | Guardar en `legal/terminos/` una copia fechada de las condiciones de Meshy del plan usado y anotar en el registro titularidad y uso comercial (VERIFICAR). Revisar transparencia sobre contenido sintético del Reglamento de IA (VERIFICAR calendario). |
| 5 | Minifiguras del proyecto inicial (`src/actors/minifig.js`) | ÁMBAR | El archivo dice que se rediseñaron como figuras de dibujos animados. Siguen usándose para anfitriones sin modelo GLB y para sus retratos. | Comprobar visualmente que no recuerdan a LEGO; renombrar el módulo y las funciones (quitar «minifig»); si queda algún resto de bloques, sustituirlo por KayKit. |
| 6 | Miguel Induráin (persona viva) en «Personajes de Navarra» | ÁMBAR | Biografía breve con palabras propias y sin imagen. | Mantener solo datos públicos y documentados, sin imagen ni voz; valorar pedir consentimiento o sustituir por una figura histórica fallecida. |
| 7 | Figuras de la comparsa de Pamplona (Caravinagre, gigantes y cabezudos) | ÁMBAR | Se nombran en una misión y aparecen en 3D como figuras estilizadas del juego (trajes de gigante y cabezudo en `src/actors/outfits.js`), sin copiar las figuras reales. | Revisar que la representación no reproduzca las figuras reales (titularidad del Ayuntamiento de Pamplona, VERIFICAR); mantener el diseño propio y la fuente anotada. |
| 8 | Datos geográficos (montes, localidades, coordenadas) | ÁMBAR | Sin fuente ni licencia anotadas. Distancias y desniveles simplificados. | Anotar fuente y licencia de cada capa (IDENA, IGN, Mendikat… VERIFICAR) y mostrar los avisos de R8: «trazado adaptado para jugar», «distancias aproximadas», «no usar para orientarse». |
| 9 | Textos culturales (iglesias, monumentos, tradiciones, personajes) | ÁMBAR | Redactados con palabras propias; fuentes anotadas solo en parte (`heritage.json`). | Crear el registro de verificación (afirmación, fuente, fecha, estado) y marcar como «adaptado» lo inventado para jugar. |
| 10 | Pantalla de créditos y licencias | ÁMBAR | No existe. Las licencias están junto a los recursos (`src/assets/*/LICENSE_*`) y en `node_modules`. | Añadir «Créditos y licencias» en el menú (three.js MIT, Lilita One y Nunito OFL, KayKit y Quaternius CC0, modelos propios, fuentes de datos). |
| 11 | Avisos legales, privacidad y almacenamiento local | ÁMBAR | No hay aviso legal ni política. El juego no recoge datos, pero debe explicarlo. | Fase 2: aviso legal con datos del titular, política de privacidad en capas (familias y menores) y política de almacenamiento local, en castellano y euskera. |
| 12 | Accesibilidad | ÁMBAR | Botones táctiles de 44 px, aria-label en botones de icono, contraste alto, `prefers-reduced-motion` respetado. El zoom está bloqueado (`user-scalable=no`), los minijuegos táctiles no tienen alternativa completa por teclado. | Fase 2: permitir zoom en los paneles de texto, atajos de teclado en minijuegos, declaración de accesibilidad (WCAG 2.1 AA). |
| 13 | Aviso de seguridad al jugar con el móvil | ÁMBAR | No existe. | Añadir en la primera pantalla y en la política: «Juega sentado y sin caminar. No uses el juego para orientarte». |
| 14 | Carga desde CDN y fuentes de Google | VERDE | Ya no ocurre: three.js, cargadores y tipografías van empaquetados y autoalojados. No hay peticiones a terceros. | Nada. Conservar los avisos MIT y OFL en la pantalla de créditos. |
| 15 | Tipografía Grozel y Space Grotesk | VERDE | No se usan. Solo aparecen en archivos antiguos fuera del juego (`old/`, `entrega/zip-otsagabia/`, `artifact/`). | Opcional: borrar esas carpetas antiguas del repositorio. |
| 16 | Modelo del pastor (`original.glb`) | VERDE | No existe con ese nombre. El pastor actual es `src/assets/meshy/pastor.glb` (punto 4). | Documentar en el punto 4. |
| 17 | localStorage | VERDE | Siete claves y la caché del service worker, sin datos personales (lista en `estado-legal.md`, punto 6). | Explicarlo en la política de almacenamiento local. |
| 18 | Síntesis de voz y audio | VERDE | No se usa speechSynthesis. El audio se sintetiza localmente con Web Audio; no sale nada del dispositivo. | Nada. |
| 19 | Cajas botín, azar de pago, publicidad, enlaces externos | VERDE | No hay. Los «txanpon» se ganan jugando y solo compran comida del juego. No hay enlaces salientes en la interfaz. | Nada. |
| 20 | Claves y tokens en el cliente | VERDE | No hay. | Nada. |

## Orden recomendado de resolución

1. **Decidir los ROJO (1 y 2).** Es lo único que cambia la identidad de una parte del juego (la liga y el fútbol de Pamplona), por eso se para y se pregunta. Propuesta concreta: liga con clubes ficticios de cada pueblo (nombre del pueblo + «KE/FT/CF» no sirve si coincide con el real; usar nombres de valle o apodos: «Bidasoa Ibaia», «Baztango Lehoiak»…) y colores propios; en Pamplona, «el estadio de la ciudad» con un equipo rojo sin nombre de club.
2. Créditos y licencias en el juego (10) y aviso MIT/OFL/CC0 (14).
3. Meshy: copia de condiciones y confirmación de uso comercial (4). Minifiguras: revisión visual y renombrado (5). FIFA fuera del diálogo (3).
4. Avisos R8 y fuentes de datos geográficos (8); registro de verificación cultural (9); Induráin y comparsa (6, 7).
5. Fase 2: avisos legales y políticas (11), accesibilidad (12), aviso de seguridad (13), clasificación por edad.

## Puerta legal del estado actual

1 Datos personales: no (apodo local). 2 Dispositivo: sí, localStorage y caché (necesarios, explicados). 3 Terceros: sí, todos en el registro; Meshy pendiente de confirmar. 4 Menores: sí, caso normal. 5 Cobra o premia: no (puntos del juego). 6 Red: no, salvo descargar el juego. 7 Afirmaciones culturales y geográficas: sí, pendientes de registro de verificación y avisos. 8 Seguridad física: sí, falta el aviso. **Color: ÁMBAR**, con dos puntos ROJO (clubes y estadio reales) que esperan decisión.
