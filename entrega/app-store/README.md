# HERRIZHERRI en la App Store: revisión y lo que falta

Revisión hecha el 1 de noviembre de 2026, versión de la web que empieza por DK5s y siguientes, como si el juego se
fuera a enviar a la App Store. Nada de esto se ha probado en un iPhone o iPad de verdad: las pruebas son del
navegador de pruebas, con el iPhone emulado.

## Resumen

| Área | Estado |
|---|---|
| Juego completo y sin fallos (norma 2.1) | Listo: sin errores en todas las pruebas |
| Sin anuncios, compras, azar ni cuentas (3.1, 5.1.1) | Listo |
| Privacidad: «Datos no recopilados» | Listo en el juego; falta publicar la política |
| Permiso de cámara | Listo en el juego; falta el texto en la app nativa |
| Otras plataformas, instalar desde Safari y enlaces a la web (2.3.10, 4.2) | Listo: modo app |
| Accesibilidad básica (VoiceOver, 44 px, menos movimiento) | Listo |
| Rendimiento en iPhone | Listo según los presupuestos medidos |
| Icono de 1024 y capturas | Listos en esta carpeta |
| Envoltura nativa (Xcode) | Falta: necesita un Mac |
| Cuenta de desarrollador, política de privacidad publicada, soporte | Falta: el titular |
| Marcas y personas reales (5.2.1) | Decisión del titular: «El Sadar» |
| Licencias de música, modelos e ilustraciones para una app | Decisión del titular: comprobar condiciones |

## 1. Lo que ya cumple

- **Completo y estable.** Revisión de noviembre de 2026: las 25 pantallas del menú, los 38 pueblos y espacios
  naturales, los minijuegos de cada comarca, los campeonatos de fútbol y pelota, entrar y salir de cinco pueblos
  seguidos y la memoria tras varias visitas. Ningún error de la página. Sin textos de relleno ni «próximamente».
- **Sin anuncios, compras dentro de la app, sorteos ni cajas de botín.** Las ventajas en comercios locales son
  descuentos fuera de la app, sin pago dentro.
- **Sin cuentas ni datos personales.** El apodo, el progreso y los ajustes se guardan solo en el dispositivo
  (`legal/estado-legal.md`, apartado 6). No hay registro, ni inicio de sesión, ni chat con otros.
- **Sin analítica en la app.** La de Vercel solo se carga en direcciones `*.vercel.app` (`src/web/vercel.js`).
- **Cámara solo en el minijuego de la txalaparta con realidad aumentada.** El detector de manos funciona en el propio
  dispositivo con sus archivos dentro del juego (`public/ar`), sin grabar ni enviar imágenes. Si se niega el permiso,
  se toca tocando las tablas en la pantalla.
- **Modo app** (`src/web/app.js`). Con la envoltura nativa, que lo indica con `window.Capacitor`, con
  «HerrizherriApp» en el agente de usuario o abriendo la página con `?app`:
  - «Cómo jugar» solo explica los botones, sin instalar desde Safari ni la web ni el mando.
  - No se ofrece descargar el juego entero.
  - No se nombran otras plataformas. El mando dice ahora «Funciona con cualquier móvil» también en la web.
  - El service worker y los avisos de versión nueva se apagan solos fuera de `https`, por ejemplo en
    `capacitor://`.
- **Accesibilidad.** Todos los botones, enlaces y casillas tienen nombre para VoiceOver, comprobado pantalla a
  pantalla. Botones táctiles de 44 px o más. Se respeta «Reducir movimiento».
- **Rendimiento.** Pueblos dentro del presupuesto del iPhone: 900 mil triángulos, 520 llamadas, 80 MB de texturas y
  35 MB de búferes. Vuelos y dron sin tirones (noviembre de 2026).
- **Créditos y licencias** dentro del juego, en Perfil: atribuciones de OpenStreetMap, fotos y modelos.

## 2. Lo que falta para enviarla

1. **La envoltura nativa**, en un Mac con Xcode. Recomendado Capacitor, que usa WKWebView, con el juego dentro de la
   app y no cargado desde la web: Apple rechaza las apps que solo abren una página (norma 4.2).
   - Contenido: la carpeta `docs/` compilada, sin `descargas/` (90 MB) ni `mudanza.html`. Pesa unos 385 MB. Por
     encima de 200 MB se puede bajar igual, pero el iPhone avisa al hacerlo con datos móviles. Para bajar de 200 MB,
     una compilación para la app sin las imágenes grandes de la web (las de 1024 y 2560 px).
   - Abrir `index.html?app` o poner «HerrizherriApp» en el agente de usuario, para el modo app.
   - La cámara de la txalaparta solo se ofrece en la web (`camaraDisponible`, en `src/ui/txalapartaAR.js`): en la
     compilación de la app, activarla o dejar solo el toque en pantalla.
2. **Info.plist**:
   - `NSCameraUsageDescription`: «La cámara se usa solo para tocar la txalaparta con las manos. La imagen no se
     graba ni sale del dispositivo.»
   - `ITSAppUsesNonExemptEncryption` = NO: solo se usa el cifrado del sistema, `https`.
   - Orientaciones: horizontal y vertical en el iPhone; el juego pide girar el móvil.
   - Pantalla de arranque: la de `public/splash`.
3. **Manifiesto de privacidad** (`PrivacyInfo.xcprivacy`):
   - Sin rastreo y sin datos recopilados.
   - Las API con motivo que use la envoltura, por ejemplo `UserDefaults`. Capacitor trae el suyo.
4. **Probar en iPhone y iPad de verdad con TestFlight** antes de enviarla:
   - iPhone SE, un iPhone normal, uno Pro Max y un iPad.
   - Horizontal y vertical, sin conexión y tras días sin abrirla.

## 3. Lo que tiene que decidir o conseguir el titular

- **Cuenta de Apple Developer**, 99 € al año, como persona o como organización. Para una app educativa para niños,
  mejor como organización, con su nombre en la tienda.
- **Política de privacidad publicada**: es obligatoria. Borrador en `legal/privacidad-borrador.md`; falta completar
  los datos del titular y publicarla en la web. También una dirección de soporte, una página o un correo.
- **Categoría**: Educación. Si se elige «Para niños», con la franja de 9 a 11 años, el juego ya cumple:
  - Sin enlaces fuera de la app en el modo app.
  - Sin analítica de terceros.
  - Sin anuncios ni compras.
- **Clasificación por edad**, en el cuestionario de Apple. Respuestas propuestas:
  - Violencia de dibujos o fantasía: infrecuente y leve. En el encierro, los toros embisten y los corredores caen,
    sin sangre ni heridas.
  - Miedo: infrecuente y leve, por las leyendas (brujas, Basajaun, lamias).
  - Todo lo demás: ninguno. No hay navegador web dentro.
  - Lo más probable es que salga 4+ o 9+.
- **Marcas** (norma 5.2.1): el fútbol se juega en «El Sadar», nombre del estadio real. «Osasuna» no sale en el
  juego, solo en el código. Los clubes de la liga y sus emblemas son inventados. Hace falta permiso o cambiar «El
  Sadar» por un nombre propio del juego. Está en rojo en `legal/estado-legal.md`.
- **Personas reales**: Miguel Induráin sale con su ficha de texto, sin su ilustración, que ya no va en el juego.
- **Licencias para distribuir en una app**:
  - La música de Envato Elements: registrar la app como proyecto.
  - Las condiciones comerciales de Meshy para los modelos.
  - Las herramientas y condiciones de las ilustraciones hechas con IA (`legal/registro-licencias.csv`).
- **Aviso legal** con los datos del titular.

## 4. Ficha propuesta para la tienda (borrador)

- **Nombre** (30 caracteres): Herrizherri
- **Subtítulo** (30): Navarra, pueblo a pueblo
- **Texto promocional** (170): Recorre los pueblos de Navarra, cumple sus misiones, aprende sus tradiciones y gana su
  sello. Con pelota, fútbol, leyendas y euskera.
- **Descripción**:
  > Herrizherri es un juego para descubrir Navarra pueblo a pueblo. Cada pueblo y ciudad tiene sus propias misiones:
  > su iglesia y sus monumentos, sus productos, la cosecha y el ganado, sus danzas, su carnaval, sus oficios antiguos
  > y sus leyendas. Al terminar las misiones de un pueblo ganas su sello, y con todos los de una comarca, la comarca
  > se ilumina en el mapa.
  >
  > · 38 pueblos y espacios naturales, del Pirineo a la Ribera, con sus calles y su relieve de verdad.
  > · Minijuegos de oficios, cosechas con tractor, ferias de ganado, carreras y preguntas del sabio del pueblo.
  > · Pelota a mano en frontones de toda Navarra y una liga de fútbol con equipos de los pueblos.
  > · Fichas de plantas, animales, montes, escudos y personajes para coleccionar.
  > · En castellano y en euskera, con un modo para aprender euskera jugando.
  > · Sin anuncios, sin compras y sin cuentas: tu progreso se queda en tu dispositivo.
- **Palabras clave** (100): navarra,pueblos,euskera,pelota,cultura,historia,educativo,mapa,leyendas,tradiciones
- **Categoría**: Educación. Secundaria: Juegos.
- **Notas para el revisor**:
  - No hace falta cuenta.
  - El menú se abre con el mapa de Navarra: toca una comarca y luego un pueblo, y «Jugar».
  - La cámara solo se usa en la txalaparta con realidad aumentada, y se puede jugar sin ella.
- **Capturas** (en `capturas/`, en JPG, del navegador de pruebas en modo app):
  - iPhone de 6,9 pulgadas en horizontal: 2796 × 1290.
  - iPad de 13 pulgadas en horizontal: 2752 × 2064.
  - Conviene rehacerlas en un iPhone de verdad antes de enviarlas.
- **Icono**: `icono-1024.png`, de 1024 × 1024 y sin transparencia.

## 5. Privacidad en la App Store

Respuesta: **Datos no recopilados.** Es cierto mientras:

- La app no cargue analítica, y no la carga fuera de `vercel.app`.
- El mando del móvil siga sin ofrecerse en la app. Usa servidores públicos para presentar el móvil al ordenador
  (PeerJS y otros, `legal/estado-legal.md`). En el modo app no aparece, y en móviles y tabletas tampoco.
