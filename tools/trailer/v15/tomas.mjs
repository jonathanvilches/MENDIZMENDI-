// Las tomas nuevas del tráiler v15, todas a 24 imágenes por segundo (el autor: «hay muchas imágenes que tienen errores, que
// se traban»: las charlas, la misión del queso, la tienda, la mochila y el Bobo del v11 eran de 12 por segundo, con cada
// imagen repetida, y daban saltitos). Estas son las limpias, sin la flecha ni el haz del objetivo (las ayudas del v8);
// las que enseñan la interfaz del juego, con su flecha, están en v15/tomas-ui.mjs.
import { TOMAS as T8, AYUDA } from '../v8/tomas.mjs';
import { TOMAS as T6 } from '../v6/tomas.mjs';
export { AYUDA };
export const TOMAS = {
  // el explorador corriendo de espaldas, con la cámara clavada igual en todos los pueblos (al cortar de uno a otro solo
  // cambia el pueblo de alrededor), ahora de 2,2 s para que dé tiempo a leer el nombre del pueblo
  // (y con las estaciones cambiando de un pueblo a otro, el autor: «y que se vean los cambios de estaciones»: Otsagabia con
  // sol, Puente la Reina con la lluvia del otoño, Isaba nevada en invierno, Pamplona con sol y Tudela al atardecer)
  // (en Puente la Reina, con la lluvia, un charco grande de la plaza reflejaba el cielo como un óvalo blanco que parecía un
  // fallo de imagen: en esta toma el reflejo de los charcos se queda en un gris azulado oscuro, con el suelo igual de mojado,
  // y se apagan los charcos de luz de las farolas, que con la lluvia se encienden)
  cPuente: { ...T8.dPuente, url: '?town=puente-la-reina&q=high&skipintro=1&weather=rain&t=15', seg: 2.2,
    prep: eval(`async () => { (${T8.dPuente.prep.toString()})();
      const W = await import('/src/world/weather.js'), U = W.MOJADO.uCieloCharco, c = U.value.clone().set('#3c4650');
      c.copy = function () { return this; }; c.lerp = function () { return this; }; U.value = c;
      const L = window.__rt.lights; if (L && L.pools && !L.__sinCharcos) { L.__sinCharcos = 1; const u = L.update.bind(L); L.update = (n, p) => { u(n, p); L.pools.visible = false; }; L.pools.visible = false; } }`) },
  cIsaba: { ...T8.dIsaba, url: '?town=isaba-izaba&q=high&skipintro=1&weather=snow&t=11.4', seg: 2.2 },
  cPamplona: { ...T8.dPamplona, seg: 2.2 }, cTudela: { ...T8.dTudela, seg: 2.2 },
  cTudelaT: { ...T8.dTudela, url: '?town=tudela&q=high&skipintro=1&weather=clear&t=19.2', seg: 2.2 },
  // la entrada en Otsagabia: tras el vuelo del mapa, el dron baja desde lo alto del pueblo hasta la espalda del explorador,
  // que echa a correr hacia la plaza, y acaba con el mismo encuadre que las tomas del corredor
  entra: { espera: 16000, url: '?town=otsagabia-ochagavia&q=high&skipintro=1&weather=clear&t=11', seg: 2.6, fps: 24, antes: 48, limpio: true,
    prep: () => {
      const J = window.__j, L = window.__layout?.PLACES || {}, P = J.G.player; J.limpia();
      J.corre(L.plaza, 40, { solo: true, snap: true, margen: 8 });
      const x0 = P.pos.x, z0 = P.pos.z, y0 = P.pos.y, h0 = P.heading, gx = Math.sin(h0), gz = Math.cos(h0), S = 2.4;
      const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.pow(1 - k, 3));
      J.dron((t) => {
        const k = ease(t / S), h = P.heading, fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx, y = P.pos.y;
        // (el final, el de las tomas del corredor: 3,3 m detrás, 0,75 a un lado, 1,35 de alto, mirando 7 m por delante)
        const e = [P.pos.x - fx * 3.3 + sx * 0.75, y + 1.35, P.pos.z - fz * 3.3 + sz * 0.75], el = [P.pos.x + fx * 7, y + 1.5, P.pos.z + fz * 7];
        // (el principio: casi encima de donde sale, alto, mirando el pueblo hacia la plaza; baja casi en vertical, por
        // donde el camino está libre, sin meterse en tejados ni árboles)
        const b = [x0 - gx * 5, y0 + 32, z0 - gz * 5], bl = [x0 + gx * 26, y0, z0 + gz * 26];
        const m = (p, q) => p.map((v, i) => v + (q[i] - v) * k);
        const pos = m(b, e), look = m(bl, el);
        return { pos, look };
      });
    } },
  // los momotxorros de Altsasu, la manada roja echando chispas alrededor del kiosco: dos planos, bajo y desde arriba
  momo: { ...T6.momo, fps: 24, antes: (T6.momo.antes ?? 24) * 2, seg: 4.0, espera: 16000 },
  // las láminas de cómo se hace, enteras y a pantalla completa, con la cámara que se acerca y un paso que cambia
  lQueso: { ...T8.lamQueso, seg: 2.4 }, lPiquillo: { ...T8.lamPiquillo, seg: 2.4 },
  lAizkolari: { ...T8.lamPiquillo, url: 'anatomia/aizkolari.html', seg: 2.4 },
  lHarri: { ...T8.lamPiquillo, url: 'anatomia/harrijasotzaile.html', seg: 2.4 },
};
