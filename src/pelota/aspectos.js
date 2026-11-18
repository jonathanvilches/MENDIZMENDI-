// Los 10 pelotaris de siempre: 5 chicos y 5 chicas (18 de noviembre de 2026). El autor: «como los personajes de ahora
// funcionan bien en la pelota, me gustaría tener más personajes como el que tenemos ahora, pero también en chica. 5
// chicos y 5 chicas, para poder jugar. Y simplemente tienes que aplicar las mismas animaciones que tiene el jugador de
// ahora». Y, vista la primera lámina (el pelo modelado a mano sobre el pelotari): «genéralos bien en Higgsfield y luego
// en Meshy», «deben tener las mismas animaciones» y «que en el juego puedas seleccionarlos».
// Cada uno es el pelotari de siempre vuelto a dibujar en Higgsfield (mismo cuerpo, misma pose, misma ropa, otro pelo y
// otra cara) y pasado a 3D en Meshy; después se le ata el esqueleto del pelotari de siempre, hueso por hueso
// (tools/blender/pelotaris10/esqueleto.py y tools/pelotaris10.mjs), así que le valen tal cual todos sus movimientos
// (actors/pelotaMoves.js). Van con la camiseta azul; de colorado, teñida (actors/npcOutfit.js), como la pelotari.
// Cada pelotari del juego sale siempre con el mismo aspecto: el que más se parece a su ilustración de las cartas
// (ui/pelotariFig.js); un nombre que no está en la plantilla, uno fijo de su género. El tuyo lo eliges tú (Ajustes).
import { pelotariId, pelotariGirl } from '../ui/pelotariFig.js';
import { profile, saveProfile } from '../game/profile.js';

const CARAS = Object.fromEntries(Object.entries(import.meta.glob('../assets/pelotaris10/*.webp', { eager: true, query: '?url', import: 'default' })).map(([p, u]) => [p.split('/').pop().replace('.webp', ''), u]));
export const ASPECTOS = [
  { id: 'chico1', girl: false, es: 'Rizos castaños', eu: 'Kizkur gaztainkara' }, { id: 'chico2', girl: false, es: 'Moreno, pelo corto', eu: 'Beltzarana, ile motza' },
  { id: 'chico3', girl: false, es: 'Pelirrojo de punta', eu: 'Ilegorria, tente' }, { id: 'chico4', girl: false, es: 'Rapado', eu: 'Ile-moztua' }, { id: 'chico5', girl: false, es: 'Rubio, melenita', eu: 'Ilehoria, adats laburra' },
  { id: 'chica1', girl: true, es: 'Coleta castaña', eu: 'Motots gaztainkara' }, { id: 'chica2', girl: true, es: 'Trenza pelirroja', eu: 'Txirikorda gorria' },
  { id: 'chica3', girl: true, es: 'Moño rubio', eu: 'Mototsa, ilehoria' }, { id: 'chica4', girl: true, es: 'Melena corta negra', eu: 'Adats labur beltza' }, { id: 'chica5', girl: true, es: 'Rizos recogidos', eu: 'Kizkurrak bilduta' },
].map(a => ({ ...a, modelo: 'pelotari_' + a.id, cara: CARAS[a.id] || '' }));
const POR = Object.fromEntries(ASPECTOS.map(a => [a.id, a]));
// cada nombre de la plantilla, el que más se parece a su ilustración
const DE = { inigo: 'chico1', asier: 'chico1', unai: 'chico2', jokin: 'chico2', ekaitz: 'chico2', ander: 'chico3', xabier: 'chico3', aitor: 'chico4', inaki: 'chico4', mikel: 'chico5', julen: 'chico5',
  garazi: 'chica1', nerea: 'chica1', ane: 'chica1', maialen: 'chica2', nahia: 'chica2', leire: 'chica2', irati: 'chica3', miren: 'chica3', oihana: 'chica4', uxue: 'chica4', amaia: 'chica5' };
const hash = (s) => [...String(s || '')].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
/** El aspecto de un pelotari del juego por su nombre (girl: si es chica; si no se dice, por su nombre) */
export function aspectoDe(name, girl = pelotariGirl(name)) {
  const pid = pelotariId(name), d = POR[DE[pid]];
  if (name && d && d.girl === !!girl) return d;
  const L = ASPECTOS.filter(a => a.girl === !!girl); return L[hash(name) % L.length];
}
/** El tuyo: el que elegiste en Ajustes o, si no has elegido, el primero de tu género (el de siempre) */
// (los avatares de chica, actors/glbChar.js GLB_AVATARS: aquí por su nombre, para no cargar los modelos desde el menú)
const AV_CHICA = new Set(['exploradora', 'leire', 'nahia', 'nerea']);
export function aspectoTuyo(girl = AV_CHICA.has(profile().avatar)) { return POR[profile().settings?.pelotari10] || POR[girl ? 'chica1' : 'chico1']; }
export function ponAspectoTuyo(id) { if (!POR[id]) return; const P = profile(); (P.settings ||= {}).pelotari10 = id; saveProfile(); }
/** Para un partido: que dos pelotaris no salgan con el mismo aspecto (Unai contra Jokin, los dos morenos de pelo corto):
 *  el segundo toma el siguiente de su género que esté libre. usados: los ids ya en la cancha (se va llenando). */
export function aspectoLibre(a, usados) {
  if (usados.has(a.id)) { const L = ASPECTOS.filter(x => x.girl === a.girl), i = L.indexOf(a); for (let k = 1; k < L.length; k++) { const b = L[(i + k) % L.length]; if (!usados.has(b.id)) { a = b; break; } } }
  usados.add(a.id); return a;
}
