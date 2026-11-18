// Los pelotaris de siempre: uno por cada nombre de la plantilla, 11 chicos y 11 chicas (18 de noviembre de 2026). El autor: «como los personajes de ahora
// funcionan bien en la pelota, me gustaría tener más personajes como el que tenemos ahora, pero también en chica. 5
// chicos y 5 chicas, para poder jugar. Y simplemente tienes que aplicar las mismas animaciones que tiene el jugador de
// ahora». Y, vista la primera lámina (el pelo modelado a mano sobre el pelotari): «genéralos bien en Higgsfield y luego
// en Meshy», «deben tener las mismas animaciones» y «que en el juego puedas seleccionarlos».
// Cada uno es el pelotari de siempre vuelto a dibujar en Higgsfield (mismo cuerpo, misma pose, misma ropa, otro pelo y
// otra cara) y pasado a 3D en Meshy; después se le ata el esqueleto del pelotari de siempre, hueso por hueso
// (tools/blender/pelotaris10/esqueleto.py y tools/pelotaris10.mjs), así que le valen tal cual todos sus movimientos
// (actors/pelotaMoves.js). Van con la camiseta azul; de colorado, teñida (actors/npcOutfit.js), como la pelotari.
// Empezaron siendo 10 repartidos entre los 22 nombres; el autor, ese mismo día: «deben coincidir las cards de los
// jugadores con los propios jugadores. Hay que crearlos y que coincidan con sus cards. Genérame todos». Ahora cada nombre
// tiene su modelo (pelotari_<nombre>) y su carta sale del mismo dibujo (tools/pelotaris10-figuras.py): carta y cancha
// enseñan al mismo personaje. Un nombre que no está en la plantilla lleva uno fijo de su género (ui/pelotariFig.js,
// pelotariId). El tuyo lo eliges tú entre los 22 (Ajustes).
import { PLANTILLA, pelotariId, pelotariGirl } from '../ui/pelotariFig.js';
import { profile, saveProfile } from '../game/profile.js';

const CARAS = Object.fromEntries(Object.entries(import.meta.glob('../assets/pelotaris10/*.webp', { eager: true, query: '?url', import: 'default' })).map(([p, u]) => [p.split('/').pop().replace('.webp', ''), u]));
// (id: el nombre sin tildes; es: como se le nombra en el selector; modelo: su archivo de Meshy; cara: su retrato)
export const ASPECTOS = PLANTILLA.map(p => ({ id: p.id, girl: p.girl, es: p.name, eu: p.name, modelo: 'pelotari_' + p.id, cara: CARAS[p.id] || '' }));
const POR = Object.fromEntries(ASPECTOS.map(a => [a.id, a]));
// (lo elegido cuando eran 10, con su nombre de ahora)
const DE_ANTES = { chico1: 'inigo', chico2: 'unai', chico3: 'ander', chico4: 'aitor', chico5: 'mikel', chica1: 'garazi', chica2: 'maialen', chica3: 'irati', chica4: 'oihana', chica5: 'amaia' };
const hash = (s) => [...String(s || '')].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
/** El aspecto de un pelotari del juego por su nombre (girl: si es chica; si no se dice, por su nombre) */
export function aspectoDe(name, girl = pelotariGirl(name)) {
  const d = POR[pelotariId(name)];
  if (name && d && d.girl === !!girl) return d;
  const L = ASPECTOS.filter(a => a.girl === !!girl); return L[hash(name) % L.length];
}
// (los avatares de chica, actors/glbChar.js GLB_AVATARS: aquí por su nombre, para no cargar los modelos desde el menú)
const AV_CHICA = new Set(['exploradora', 'leire', 'nahia', 'nerea']);
/** El tuyo: el que elegiste en Ajustes o, si no has elegido, el primero de tu género (Iñigo o Garazi) */
export function aspectoTuyo(girl = AV_CHICA.has(profile().avatar)) { const e = profile().settings?.pelotari10; return POR[e] || POR[DE_ANTES[e]] || POR[girl ? 'garazi' : 'inigo']; }
export function ponAspectoTuyo(id) { if (!POR[id]) return; const P = profile(); (P.settings ||= {}).pelotari10 = id; saveProfile(); }
/** Para un partido: que dos pelotaris no salgan con el mismo aspecto (tú con el de Unai contra Unai): el segundo toma el
 *  siguiente de su género que esté libre. usados: los ids ya en la cancha (se va llenando). */
export function aspectoLibre(a, usados) {
  if (usados.has(a.id)) { const L = ASPECTOS.filter(x => x.girl === a.girl), i = L.indexOf(a); for (let k = 1; k < L.length; k++) { const b = L[(i + k) % L.length]; if (!usados.has(b.id)) { a = b; break; } } }
  usados.add(a.id); return a;
}
