// La huella de la clave de canje de un comercio, para src/data/comercios.js (campo pin): sha256 de «id:clave», en
// hexadecimal. La clave se la queda el comercio; en el juego solo va la huella, y con ella el móvil comprueba la clave que
// teclea el comercio sin saberla.  Uso: node tools/clave-comercio.mjs <id del comercio> <clave>
import { createHash } from 'node:crypto';
const [id, clave] = process.argv.slice(2);
if (!id || !clave) { console.error('uso: node tools/clave-comercio.mjs <id> <clave>'); process.exit(1); }
if (!/^[A-Z0-9]{2,8}$/.test(id)) { console.error('el id: de 2 a 8 letras mayúsculas o números (va en el código del bono)'); process.exit(1); }
if (clave.length < 6) console.warn('aviso: mejor una clave de 6 cifras o más');
console.log(createHash('sha256').update(`${id}:${clave}`).digest('hex'));
