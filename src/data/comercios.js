// «Ventajas Herrizherri»: lo que se consigue jugando, sellos, insignias y certificados, vale descuentos y regalos en los
// comercios de los pueblos y las comarcas de Navarra que se apunten (src/game/ventajas.js, la sección Ventajas del menú y
// VENTAJAS-COMERCIOS.md, para los comercios y los ayuntamientos).
//
// Cada comercio: id (corto, sin espacios: va en el código del bono), nombre, town (el pueblo, data/levels.js), cat (una de
// CATEGORIAS), dir (la dirección, para encontrarlo), pin (la huella de su clave de canje: sha256 de «id:clave», en
// hexadecimal; la clave la tiene el comercio, nunca el juego) y ofertas. Cada oferta: id, req (qué hay que tener), txt (la
// ventaja, corta), det (las condiciones), dias (lo que vale el bono desde que se saca; 30 si no se dice) y cada (los días
// hasta poder sacar otro de la misma oferta después de usarlo; 30 si no se dice).
// req: { sello: pueblo } el sello de ese pueblo · { comarca: id } el certificado de la comarca, con todos sus pueblos
// sellados · { navarra: true } el certificado de Navarra, con todos los pueblos · { insignia: id } una insignia
// (game/profile.js, BADGES) · { sellos: n } n sellos, de donde sean.
// Reglas del programa, para todas: nada de alcohol, tabaco ni apuestas; los bonos son para la familia y compra una persona
// adulta; un bono por oferta a la vez; el comercio pone la ventaja y la paga él.

export const CATEGORIAS = {
  alimentacion: { n: 'Alimentación y producto local', ic: 'cheese' },
  artesania: { n: 'Artesanía', ic: 'hammer' },
  libreria: { n: 'Librería y juguetes', ic: 'book' },
  deporte: { n: 'Deporte y montaña', ic: 'boot' },
  turismo: { n: 'Visitas y turismo activo', ic: 'compass' },
  museo: { n: 'Museos y centros de interpretación', ic: 'castle' },
  musica: { n: 'Música y danza', ic: 'music' },
  hosteleria: { n: 'Hostelería familiar', ic: 'bread' },
};

// los comercios adheridos de verdad: solo los que han firmado su adhesión (vacío hasta que se apunte el primero)
export const COMERCIOS = [];

// los ejemplos: para ver cómo funciona mientras no hay comercios de verdad. No son comercios reales, no llevan nombre propio
// ni dirección, y el juego los marca como ejemplo. Su clave de canje es 0000
export const EJEMPLOS = [
  { id: 'EJ1', ejemplo: true, nombre: 'Taller de artesanía', town: 'lesaka', cat: 'artesania',
    ofertas: [{ id: 'sello', req: { sello: 'lesaka' }, txt: '10 % de descuento', det: 'En cualquier compra del taller.' },
      { id: 'comarca', req: { comarca: 'bidasoa' }, txt: '15 % de descuento', det: 'Con el certificado de Baztan-Bidasoa.' }] },
  { id: 'EJ2', ejemplo: true, nombre: 'Tienda de producto local', town: 'olite', cat: 'alimentacion',
    ofertas: [{ id: 'sello', req: { sello: 'olite' }, txt: 'Un regalo con tu compra', det: 'Un dulce o un producto de la huerta del pueblo para la familia.' }] },
  { id: 'EJ3', ejemplo: true, nombre: 'Librería', town: 'pamplona', cat: 'libreria',
    ofertas: [{ id: 'coleccion', req: { insignia: 'collector' }, txt: '10 % en libros de Navarra', det: 'Con la insignia Coleccionista.' },
      { id: 'navarra', req: { navarra: true }, txt: '20 % de descuento', det: 'Con el certificado de Navarra entera.' }] },
  { id: 'EJ4', ejemplo: true, nombre: 'Tienda de montaña', town: 'erronkari-roncal', cat: 'deporte',
    ofertas: [{ id: 'cimas', req: { insignia: 'peaks' }, txt: '10 % en material de monte', det: 'Con la insignia Cumbres.' }] },
  { id: 'EJ5', ejemplo: true, nombre: 'Escuela de música', town: 'estella', cat: 'musica',
    ofertas: [{ id: 'musica', req: { insignia: 'musico' }, txt: 'Una clase de prueba gratis', det: 'Con la insignia Música de plaza.' }] },
  { id: 'EJ6', ejemplo: true, nombre: 'Visita guiada', town: 'tudela', cat: 'turismo',
    ofertas: [{ id: 'sellos', req: { sellos: 3 }, txt: 'Entrada infantil gratis', det: 'Con tres sellos de cualquier pueblo.' }] },
];
// (la huella de la clave de los ejemplos, 0000: la misma cuenta que para los de verdad)
export const PIN_EJEMPLO = '0000';
