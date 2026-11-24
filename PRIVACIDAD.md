# Privacidad y datos personales

Qué guarda el juego, qué sale del aparato y cómo se protege. Es un juego para chavales: la regla es no recoger nada que
no haga falta y no mandar nada sin permiso. Si se cambia algo de esto, se cambia aquí y en Ajustes › Privacidad
(`src/hub/hub.js`, `privacidad()`).

## Lo que se guarda (solo en el aparato)

| Qué | Dónde | Sale del aparato |
| --- | --- | --- |
| El perfil: nombre, personaje, edad, progreso, cartas, ajustes | `localStorage` `herrizherri-perfil-v1` (`src/game/profile.js`) | No |
| Torneos, liga, Salazar y demás partidas | `localStorage` `herrizherri-*` | No |
| Lo propio del aparato: gráfica, diagnóstico, cortes, calidad | `localStorage` (`src/util/diag.js`, `gpu.js`) | Solo con el informe encendido |
| Imágenes que el juego genera (iconos, fotos de comarcas) | IndexedDB `herrizherri-img` (`src/util/store.js`); las de versiones anteriores se borran solas | No |
| Lo descargado para jugar sin conexión | Caché del service worker (`src/web/sw.js`); lo de versiones anteriores se borra solo | No |

No hay cuentas, ni contraseñas, ni correos, ni publicidad, ni rastreadores de terceros. El nombre se limpia al escribirlo y
al leerlo (`limpiaNombre`: sin `< > & " '`, sin caracteres invisibles, 20 letras como mucho).

## Lo que puede salir del aparato

- **Informe técnico** (`src/util/informe.js` → `public/api/informe.js` en Vercel): **apagado** salvo que el jugador lo
  encienda en Ajustes › Diagnóstico (o abra el juego con `?informe=1`; `?informe=0` lo apaga). Lleva el aparato (pantalla,
  navegador, gráfica, batería), la fluidez, los errores y por dónde se pasa. **Nunca** el nombre ni la partida. La función
  de Vercel solo lo acepta desde la web del juego, con la forma del informe, corta lo largo y quita saltos de línea; lo
  escribe en los registros del proyecto y no lo guarda en ningún otro sitio.
- **Móvil como mando** (`src/mando/`, `public/mando/`): el saludo entre el móvil y el ordenador pasa por servidores
  públicos (PeerJS, MQTT, ntfy), pero va **cifrado y firmado de punta a punta (AES-GCM)** con un secreto de 128 bits que
  viaja en el QR, detrás del `#`, y nunca pasa por ningún servidor. Después hablan directamente por la wifi (WebRTC).
- **Llevar la partida a otro aparato** (`src/util/traspaso.js`, `index.html`): un código que el jugador copia y pega, o
  un enlace `#traspaso=`. No pasa por ningún servidor. Lo que llega se guarda sin `< >` (para que nada de dentro pueda
  colarse como código), sin lo propio del aparato y con un tamaño máximo; si ya había partida, se pregunta antes.
- **Cámara** (pelota en casa, realidad aumentada, txalaparta): los modelos van con el juego (`public/ar`) y la imagen se
  analiza dentro del aparato. **No se graba ni se manda ninguna imagen.**
- **Compartir** (`navigator.share`): solo el enlace del juego, cuando el jugador lo pide.

## Comprobado (24 nov 2026)

- Sin claves, tokens ni contraseñas en el código ni en la historia de Git.
- Ningún correo ni dato personal del autor en los archivos.
- Las letras se sirven desde el propio juego (sin Google Fonts) y los enlaces externos llevan `noopener`.
- La web publicada no tiene archivos sin usar.

## Para la versión grande (muchos jugadores, cuentas, en línea)

Cuando haya servidor y cuentas, como mínimo:

- RGPD y LOPDGDD: con menores de 14 años, consentimiento de madre, padre o tutor; aviso de privacidad completo, con
  responsable, finalidad, plazo y derechos (acceso, borrado…); registro de actividades de tratamiento.
- Solo HTTPS (TLS 1.2+), contraseñas con Argon2id o bcrypt, datos cifrados en reposo, claves en un gestor de secretos
  (nunca en el repositorio), servidores en la Unión Europea.
- Datos mínimos: un alias en vez del nombre real, sin fecha de nacimiento completa, sin ubicación precisa.
- Chats y partidas en línea con filtro y moderación, y nada visible entre desconocidos sin permiso.
- App Store y Google Play: las fichas de «privacidad de la app» y, si es para niños, sus reglas (sin publicidad
  personalizada ni analítica de terceros).
