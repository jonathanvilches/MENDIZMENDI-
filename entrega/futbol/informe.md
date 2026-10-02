# Fútbol sala de MENDIMENDIZ — informe

## 1. Diagnóstico del código anterior (`src/game/futbol.js`, 493 líneas)

El problema que se veía: no se podía quitar el balón y el partido no funcionaba bien.

### Qué funcionaba

- La entrada al estadio.
- La equipación de Osasuna con el personaje de Meshy.
- El público.
- El marcador y el radar.
- Las tres cámaras.
- La estirada del portero.
- El cambio de jugador.
- La carga del tiro.

### Qué fallaba y por qué

| Fallo | Causa raíz |
|---|---|
| No se podía robar el balón | Con un rival con el balón a menos de 1,8 m, PASE ejecutaba un **pase con el balón del rival** y TIRO un **tiro**. La entrada solo robaba entre 1,8 y 2,2 m de distancia, una franja casi imposible. |
| El balón iba y venía | La IA robaba al jugador con más probabilidad (2,3/s) que la del jugador al rival en contacto. Después de robar no había protección, así que el rival recuperaba al instante. |
| El rival «llevaba el balón pegado» | Se teletransportaba el balón a 0,6 m delante del poseedor en cada fotograma, sin conducción a toques. Nunca quedaba suelto para interceptarlo. |
| Física que dependía de los fotogramas | Pasos variables (hasta 0,1 s). En móviles lentos el balón atravesaba postes y la IA cambiaba de comportamiento. |
| Sin reglas | Vallas que devolvían el balón; no había banda, córner, saque de portería, faltas, penaltis, partes ni descanso. Un gol entrando por detrás de la red contaba. |
| IA simple | Pases al azar sin mirar líneas de pase, tiros desde lejos y ningún rol de equipo. |
| Campo | Un campo de 45 × 72 m para 3 contra 3: carreras eternas y casi imposible defender. |

### Decisión

Había que reescribir más del 40 %, así que **se rehízo desde cero** según el encargo. Se reutilizó lo que funcionaba y estaba limpio:

- el personaje de Meshy con su equipación;
- el público 3D;
- la integración en El Sadar.

## 2. Arquitectura nueva (`src/futbol/`, módulo independiente, como el de pelota)

| Archivo | Qué hace |
|---|---|
| `rules.js` (futbol-data) | Campo de 40 × 20 m, física, jugadores, niveles, sistema 1-2-2, equipos, campos, retos y textos. |
| `physics.js` | Balón a paso fijo de 120 Hz. Lo detalla la sección 3. |
| `game.js` | Lógica pura, sin gráficos. Lo detalla la sección 3. |
| `field.js` | La escena: césped con franjas y líneas a escala, porterías con red que se abomba, vallas con rótulos propios, gradas rojas tipo El Sadar con cubierta, focos y público, o el campo de pueblo con muro, árboles y casas. |
| `match.js` | La vista: personajes y animaciones, cámaras, repetición del gol, anillo y flecha del jugador, tutorial. |
| `hud.js` | Marcador, mensajes, joystick dinámico, botones, barras, menú, pausa y estadísticas. |
| `audio.js` | Golpeo según la potencia, postes, red, silbato y público que reacciona. |
| `retos.js` | Conos contra reloj, dianas en las escuadras y pases a compañeros en movimiento. |
| `index.js` | `FutbolSystem`: `init`, `startMatch`, `startPenaltis`, `startReto`, `openMenu` y `career` (clave `mendimendiz-futbol-v1`). |
| `src/game/futbol.js` | La integración en el juego. Lo detalla la sección 4. |
| `lab/futbol-demo.html` | Página para probar cada modo sin cargar un pueblo. |

`physics.js` (balón a 120 Hz):

- Gravedad, aire proporcional a v² (coeficiente 0,012) y efecto Magnus limitado a 6 m/s².
- Botes con restitución 0,55 y rozamiento 0,85; rodadura de 1,8 m/s².
- Postes y larguero como cilindros, con restitución 0,7.
- Red que retiene por dentro (absorbe el 85 %) y frena por fuera.
- Valla a 2 m.
- Colisión continua en tramos de 5 cm.

`game.js` (lógica pura):

- **Jugadores:** 5,5 / 7 m/s con energía de sprint (4 s / 6 s) y aceleración de 14 m/s².
- **Conducción:** a toques cada 0,35–0,5 s; el balón no va pegado.
- **Pase y tiro:** pase al mejor compañero del cono de 35°, raso o elevado. Tiro con carga de 0,8 s, precisión según carga, postura y presión, y efecto.
- **Defensa:** robo con ventana de 0,25 s (éxito según ángulo y momento) y entrada en plancha con riesgo de falta.
- **Portero:** bisectriz a 1–2 m, reacción por nivel, impulso, blocar o despejar, salidas y saque con la mano o con el pie.
- **IA 1-2-2:** ataque, defensa y transición; presión, cobertura y marcas; apoyos y desmarques; decisiones cada 0,2 s (tirar si la probabilidad de gol supera el umbral, pasar, regatear o proteger). Tres niveles.
- **Árbitro:** gol completo bajo el larguero; banda (reanudación en 4 s); córner o saque de portería; falta o penalti; saque de centro; dos partes y descanso; final; penaltis en eliminatoria.

En el juego **no se abre un segundo WebGLRenderer**: en iPhone podía cerrar la página por memoria. El partido se dibuja con el mismo renderer, pero con **escena y cámara propias**, y la ciudad queda en pausa. Fuera del juego (página de pruebas), el módulo crea su propio renderer a pantalla completa. Al salir se liberan geometrías, materiales, texturas y sonidos propios sin tocar los compartidos.

## 3. Modos

- **Partido 5 contra 5:** amistoso o eliminatoria (empate → penaltis).
- **Tanda de penaltis:** 5 tiros por equipo y muerte súbita. El jugador tira (apunta con el joystick y carga) y para (elige lado y pulsa PARAR).
- **Retos:**
  - conos (zigzag, +2 s por cono saltado, objetivo 20 s);
  - dianas (8 tiros, 3 aciertos);
  - pases (8 pases buenos en 60 s).
- **Tutorial de 60 s la primera vez:** moverse, pasar, tirar y robar.
- **Misión en El Sadar:** la entrenadora propone primero el reto de pases y después el menú libre.

## 4. Integración en MENDIMENDIZ

`src/game/futbol.js` conecta el módulo con el juego:

- **Personajes de Meshy:** Osasuna (de rojo) y visitante (de blanco). Los porteros usan el modelo de Osasuna con la camiseta recoloreada por sombreador (verde el de casa, amarillo el visitante; la piel no cambia).
- **Público 3D** de las gradas.
- **Sonido** del juego.
- **Calidad** del dispositivo.

## 5. Pruebas

### Sin gráficos

`node tools/futbol-sim.mjs 3 3`:

- 3 partidos por nivel, de 2 × 3 min, a ×20 de velocidad.
- Todos terminan sin errores, con goles en los dos sentidos y sin bloqueos del balón (balón parado más largo: 0,2 s).

| Nivel | Goles (casa – IA) | Resultado esperado |
|---|---|---|
| Fácil | 17 – 5 | Gana el equipo del jugador |
| Normal | 13 – 10 | Igualado |
| Difícil | 8 – 24 | Gana la IA |

Casos de reglas (todos correctos):

- Gol por debajo del larguero.
- Por encima del larguero: saque de portería.
- Al poste, sin gol.
- Al larguero.
- Por fuera de la red lateral: no es gol.
- Desde detrás de la red: no entra.
- La red retiene el balón.
- Tiro a 30 m/s al poste: rebota, no lo atraviesa.
- Banda: saca el otro equipo.
- Fondo tocada por el defensor: córner; por el atacante: saque de portería.
- Entrada por detrás: tiro libre; dentro del área: penalti.
- **Robo de frente con el balón separado del pie: 40 de 40.**
- Tanda de penaltis con ganador.

### En el navegador

`node tools/futbol.mjs` (página de pruebas, la IA juega por el jugador): sin errores en la consola en escritorio (1280 × 720), móvil horizontal (844 × 390) y móvil vertical (390 × 844). Las capturas van en esta carpeta.

`node tools/futbol-juego.mjs` (dentro del juego, en Pamplona): reto de pases de la primera vez → menú → partido → abandonar → vuelta a la ciudad. Sin errores. Al volver, la ciudad sigue en marcha, sin el marcador del fútbol y con el jugador libre. En el partido hay 88 llamadas de dibujo; con el público 3D cercano son unos 1,6 millones de triángulos en calidad alta (en móvil hay muchos menos figuras 3D).

Un fallo que salió en esta prueba y está corregido: el juego pedía fotogramas al partido durante el fundido de entrada, antes de que empezara el reto, y el reto de pases fallaba. Ahora, hasta que el partido arranca, solo se dibuja la presentación.

## 6. Simplificaciones y fallos conocidos

- **Fuera de juego:** no hay (como pide el encargo).
- **Faltas:** no hay tarjetas ni acumulación de faltas.
- **Reanudación:** la regla de 4 s se aplica a los saques del jugador (si no saca, se saca solo).
- **Reloj:** se para con el balón parado, como en fútbol sala.
- **Saque de banda:** se hace con el pie, como pide el encargo.
- **Saque de portería:** el portero lo saca con la mano desde su área y los rivales no tienen que salir del área.
- **Animaciones:** no hay animación propia de entrada ni de estirada. Se hacen girando el cuerpo entero sobre las de correr, chutar y celebrar del modelo.
- **Campo:** El Sadar está adaptado: un campo de fútbol sala de 40 × 20 m dentro de unas gradas como las suyas (no es el campo real de 105 × 68 m). Los demás pueblos tienen el campo genérico preparado en los datos, pero aún sin verificar con ortofoto.
- **Equipación:** se mantiene la de Osasuna del modelo de Meshy, por decisión del autor («lo quiero completo»). Para los equipos de pueblo hay equipaciones propias sin marcas.
- **Rendimiento:** 60 fps en escritorio y 30 en móvil hay que confirmarlo en dispositivos reales. El navegador de pruebas dibuja por software y no sirve para medirlo.
