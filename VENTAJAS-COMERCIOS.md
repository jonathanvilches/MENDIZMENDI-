# Ventajas Herrizherri

Programa para que lo que se consigue jugando a Herrizherri valga descuentos y regalos en los comercios de los pueblos y las comarcas de Navarra. Este documento es para los comercios, los ayuntamientos y quien quiera impulsarlo.

## Qué es

Herrizherri es un juego para conocer Navarra pueblo a pueblo. En cada pueblo hay misiones sobre su patrimonio, sus oficios, su naturaleza y sus tradiciones. Al completarlas, el jugador gana el sello del pueblo. Con todos los sellos de una comarca gana su certificado, y con todos los pueblos, el certificado de Navarra. Por el camino gana insignias, como Naturalista, Cumbres o Música de plaza.

Con Ventajas Herrizherri, esos logros abren bonos en los comercios adheridos. El juego lleva a las familias a visitar los pueblos, y el bono les da un motivo para entrar en la tienda, el taller o el museo del lugar.

## Cómo consigue la ventaja el jugador

Cada oferta de un comercio pide uno de estos logros:

| Logro | Cuándo se gana | Para qué oferta encaja |
|---|---|---|
| Sello de un pueblo | Al completar sus misiones | Comercios de ese pueblo |
| Certificado de comarca | Al sellar todos sus pueblos | Comercios de toda la comarca, con una ventaja mayor |
| Certificado de Navarra | Al sellar todos los pueblos | Cualquier comercio, la ventaja mayor |
| Insignia | Por un logro concreto | Comercios de ese tema: montaña, música, libros |
| Varios sellos | Al juntar los que se pidan | Visitas y museos |

## Qué pone el comercio

- La ventaja: un descuento, un regalo, una entrada infantil, una clase de prueba. La elige y la paga el comercio.
- El logro que pide, de la tabla de arriba.
- Sus condiciones, en una frase: en qué compras vale, un mínimo si lo hay.
- Cada cuánto se puede repetir. Por defecto, un bono por oferta al mes y por jugador.

Reglas comunes para todos los comercios:

- Nada de alcohol, tabaco ni apuestas.
- Los bonos son para la familia. Compra siempre una persona adulta.
- La ventaja se cumple tal como sale en el juego.

## Cómo se canjea

1. El jugador saca el bono en el juego, en la sección Ventajas. El bono vale un mes desde que lo saca.
2. En caja enseña el móvil. Ahí sale el comercio, la ventaja, un código como `HZ-AB12-7Q2M9XK` y su QR. Una franja que se mueve y la hora, que corre, muestran que no es una captura de pantalla.
3. El comercio aplica la ventaja y toca «Canjear en caja» en el móvil del cliente. Teclea su clave.
4. El bono queda canjeado, con la fecha. No se puede volver a usar.

El comercio no necesita ningún aparato ni programa: solo su clave.

## Darse de alta

Datos que hacen falta:

- Nombre del comercio, pueblo, dirección y tipo de comercio.
- Las ofertas: la ventaja, el logro que pide, las condiciones y cada cuánto se repite.
- Una persona de contacto.
- La aceptación de las reglas de este documento.

El equipo de Herrizherri le da al comercio su identificador y su clave de canje, de 6 cifras o más. En el juego no se guarda la clave, solo una huella que permite comprobarla. Se calcula con `node tools/clave-comercio.mjs <id> <clave>` y se añade el comercio a `src/data/comercios.js`. Desde la siguiente actualización del juego, el comercio sale en la sección Ventajas y en la ficha de su pueblo.

Mientras no haya ningún comercio adherido, el juego enseña ejemplos sin nombre propio, marcados como tales, con la clave 0000.

## Fase 1, la de ahora

- Todo va en el móvil del jugador. No hay cuentas ni se recoge ningún dato personal.
- Límite: quien borre la partida puede volver a sacar un bono. Para frenarlo, el comercio puede anotar los códigos que canjea; un código repetido se ve enseguida.
- Es suficiente para un piloto con pocos comercios y ventajas pequeñas.

## Fase 2, con un servidor

Para crecer hace falta un pequeño servidor que apunte los bonos:

- Al sacar un bono, el juego lo pide al servidor. El servidor lo firma y lo apunta con un identificador anónimo del dispositivo.
- Al canjear, el comercio escanea el QR con el móvil o lo teclea en una página web propia del programa. El servidor dice si vale y lo marca como usado. Así no se puede repetir en otro móvil ni borrando la partida.
- Panel del comercio: sus canjes, por día y por oferta.
- Datos para el programa: bonos sacados y canjeados por comercio, pueblo y comarca. Siempre agregados y sin datos de nadie.
- Protección de datos: muchos jugadores son menores. En España, un menor de 14 años necesita el permiso de sus padres para dar datos personales. Por eso el programa no pide nombre, correo ni teléfono. Antes de abrir la fase 2 conviene una revisión legal de las condiciones y del aviso de privacidad.

## Quién puede impulsarlo

Ayuntamientos, asociaciones de comerciantes y entidades de turismo de las comarcas. Pueden juntar comercios de un mismo pueblo o comarca, dar a conocer el programa y, si quieren, poner ellos parte de las ventajas.
