// Los 10 pelotaris de siempre: 5 chicos y 5 chicas (18 de noviembre de 2026). El autor: «como los personajes de ahora
// funcionan bien en la pelota, me gustaría tener más personajes como el que tenemos ahora, pero también en chica. 5
// chicos y 5 chicas, para poder jugar. Y simplemente tienes que aplicar las mismas animaciones que tiene el jugador de
// ahora». Todos son el pelotari de Meshy de siempre (el mismo cuerpo, el mismo esqueleto, las mismas animaciones y la
// misma ropa): cambia lo que los distingue a simple vista en la cancha, el peinado, y con él el color del pelo y el tono
// de la piel de cada nombre.
//   - el chico de rizos es el modelo tal cual (pelotari.glb y pelotari_rojo.glb)
//   - los demás llevan la cabeza lisa (actors/chicas.js: la de chica, o la de chico, pelotari_chico) y su pelo aparte,
//     modelado en Blender con las mismas herramientas que la coleta (tools/blender/chicas/pelo.py)
// Cada pelotari del juego sale siempre con el mismo aspecto: el de su ilustración de las cartas (ui/pelotariFig.js) y,
// si su nombre no está en la plantilla, uno fijo por su nombre.
import { pelotariId, pelotariGirl } from '../ui/pelotariFig.js';

// peinado: null, el pelo del modelo (los rizos del chico); cabeza: la del parche que le toca ('' chica, '_chico' chico)
export const ASPECTOS = {
  chico: [{ id: 'rizos', peinado: null }, { id: 'corto', peinado: 'corto' }, { id: 'punta', peinado: 'punta' }, { id: 'rapado', peinado: 'rapado' }, { id: 'melenita', peinado: 'melenita' }],
  chica: [{ id: 'coleta', peinado: 'coleta' }, { id: 'trenza', peinado: 'trenza' }, { id: 'mono', peinado: 'mono' }, { id: 'melena', peinado: 'melena' }, { id: 'rizos', peinado: 'rizos' }],
};
// el tono de la piel: por lo que se multiplica la piel pintada del modelo, que es clara (actors/npcOutfit.js); null, la suya
export const PIEL = { clara: null, media: [0.93, 0.84, 0.76], morena: [0.83, 0.69, 0.57], oscura: [0.64, 0.47, 0.37] };
// cada nombre de la plantilla, como en su ilustración: [peinado, piel]
const DE = {
  inigo: ['rizos'], unai: ['corto'], mikel: ['melenita'], aitor: ['rapado', 'morena'], inaki: ['rizos', 'oscura'], ander: ['punta'], xabier: ['punta', 'media'],
  jokin: ['corto', 'media'], ekaitz: ['melenita', 'media'], julen: ['corto'], asier: ['rizos', 'media'],
  oihana: ['melena'], garazi: ['coleta'], maialen: ['trenza'], amaia: ['rizos', 'morena'], irati: ['mono'], nahia: ['trenza', 'media'], nerea: ['trenza'],
  leire: ['rizos'], ane: ['coleta', 'morena'], miren: ['mono', 'media'], uxue: ['melena', 'media'],
};
const hash = (s) => [...String(s || '')].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
/** El aspecto de un pelotari por su nombre: { id, peinado, cabeza, piel }. girl: si es chica (si no se dice, por su nombre).
 *  id: uno de los cinco de su género, para pedirlo sin nombre (el tuyo, elegido en tu ficha). */
export function aspectoDe(name, girl = pelotariGirl(name), id = null) {
  const L = ASPECTOS[girl ? 'chica' : 'chico'], pid = pelotariId(name), d = !id && name && DE[pid] && pelotariGirl(pid) === !!girl ? DE[pid] : null;
  const A = L.find(a => a.id === (id || d?.[0])) || L[hash(name) % L.length];
  return { ...A, girl: !!girl, cabeza: A.peinado ? (girl ? '' : '_chico') : null, piel: PIEL[d?.[1]] || null };
}
