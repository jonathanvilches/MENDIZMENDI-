// Las colecciones en el mapa del inicio: la naturaleza, los escudos y los personajes, cada cosa en el sitio de
// Navarra donde está. Este módulo solo dice qué hay en cada colección y dónde: sus pestañas y, por cada cosa, su imagen, su
// nombre, si ya la has descubierto, sus pueblos o sus comarcas y qué se hace al abrirla. Lo pinta inicio.js, con la fila de
// tarjetas abajo y los marcadores encima del mapa (mapa3d.js, coleccion). Lo que no tiene sitio en el mapa (los escudos de
// pueblos que no están en el juego, una especie sin comarca) no sale aquí: sí en la lista de siempre
//   coleccionDe('nature' | 'escudos' | 'personajes') → { titulo, kicker, icon, tabs, cosas(tab) } | null
import { levelById } from '../data/levels.js';
import { allFichas, showFicha } from '../ui/ficha.js';
import { faunaImg } from '../ui/faunaImg.js';
import { floraFoto } from '../ui/floraFoto.js';
import { speciesIcon } from '../ui/icons.js';
import { ARMAS } from '../data/armas-navarra.js';
import { armsImg } from '../ui/escudoImg.js';
import { readTownArms } from '../ui/escudo.js';
import { PERSONAJES, FIGURE_TOWNS } from '../data/personajes.js';
import { openPersonaje } from '../ui/personajes.js';
import { FIGURAS_LEYENDA, FIGURAS_CARNAVAL } from '../data/figuras.js';
import { figuraImg, openFigura } from '../ui/figuras.js';
import { personajeUrl } from '../ui/laminas.js';
import { profile } from '../game/profile.js';
import { visto } from '../game/coleccion.js';

// (los torneos, no: van en su pantalla de siempre, con el de pelota y el de fútbol bien separados. Así lo pidió el autor)
export const COLECCIONES_MAPA = ['nature', 'escudos', 'personajes'];
const corto = (id) => (levelById(id)?.name || id || '').split(' /')[0];
const comarcaDe = (id) => levelById(id)?.comarca;
const TOWN_OF = {}; for (const [t, L] of Object.entries(FIGURE_TOWNS)) for (const id of L) TOWN_OF[id] = t;
const unicos = (a) => [...new Set(a.filter(Boolean))];

// (la naturaleza: los animales, los árboles, los arbustos y plantas y las flores de cada comarca)
function naturaleza(ui) {
  const tipo = (tab) => tab === 'fauna' ? 'fauna' : 'flora';
  const vale = (tab, d) => tab === 'fauna' || (tab === 'trees' ? d.F.m.t === 'tree' : tab === 'flowers' ? d.F.m.t === 'flower' : d.F.m.t !== 'tree' && d.F.m.t !== 'flower');
  const icono = { fauna: 'bird', trees: 'tree', plants: 'herbs', flowers: 'flower' };
  return {
    titulo: 'Naturaleza de Navarra', kicker: 'Naturaleza', icon: 'leaf',
    tabs: [['fauna', 'Fauna'], ['trees', 'Árboles'], ['plants', 'Arbustos y plantas'], ['flowers', 'Flores']],
    cosas(tab = 'fauna') {
      const p = profile(), t = tipo(tab);
      return allFichas(t).filter(d => vale(tab, d)).map(d => {
        const key = t + ':' + d.id, img = t === 'fauna' ? faunaImg(d.id)?.small : floraFoto(d.id)?.planta;
        return { id: d.id, key, img: img || '', icon: speciesIcon(d.F.name) || icono[tab], name: d.F.name, locked: !visto(p, key),
          comarcas: d.comarcas.map(c => c.id), towns: [], sub: d.comarcas.length === 1 ? d.comarcas[0].name : `${d.comarcas.length} comarcas`,
          verbo: 'Ver ficha', abre: () => showFicha(key, { ui, button: 'Cerrar' }) };
      }).filter(c => c.comarcas.length).sort((a, b) => (a.locked - b.locked) || a.name.localeCompare(b.name, 'es'));
    },
  };
}
// (los escudos de los pueblos, valles y ciudades, en sus pueblos)
function escudos(ui) {
  const KIND = { reino: 'Reino', ciudad: 'Ciudad', valle: 'Valle', municipio: 'Municipio' };
  return {
    titulo: 'Escudos de Navarra', kicker: 'Escudos', icon: 'shield', tabs: null,
    cosas() {
      const p = profile();
      return ARMAS.filter(A => A.towns.length).map(A => {
        const towns = A.towns.filter(t => levelById(t));
        return { id: A.id, key: 'armas:' + A.id, img: armsImg(A.id) || '', icon: 'shield', name: A.name, locked: !visto(p, 'armas:' + A.id),
          towns, comarcas: unicos(towns.map(comarcaDe)), sub: `${KIND[A.kind] || 'Escudo'} · ${towns.map(corto).join(', ')}`,
          verbo: 'Leer el escudo', abre: () => readTownArms(ui, A, { town: corto(towns[0]) }) };
      }).filter(c => c.towns.length).sort((a, b) => (a.locked - b.locked) || a.name.localeCompare(b.name, 'es'));
    },
  };
}
// (los personajes de Navarra, en el pueblo de su recuerdo; los seres de leyenda y las figuras de carnaval, en el suyo)
function personajes(ui) {
  return {
    titulo: 'Personajes de Navarra', kicker: 'Personajes', icon: 'book',
    tabs: [['navarra', 'Personajes'], ['leyenda', 'Leyenda'], ['carnaval', 'Carnaval']],
    cosas(tab = 'navarra') {
      const p = profile();
      if (tab === 'navarra') return Object.keys(PERSONAJES).filter(id => TOWN_OF[id]).map(id => { const F = PERSONAJES[id], t = TOWN_OF[id];
        return { id, key: 'personaje:' + id, img: personajeUrl(id) || '', icon: F.icon || 'person', name: F.name, locked: !visto(p, 'personaje:' + id),
          towns: [t], comarcas: unicos([comarcaDe(t)]), sub: `${F.kicker.split('·').pop().trim()} · ${corto(t)}`, verbo: 'Leer su historia', abre: () => openPersonaje(ui, id) }; });
      return (tab === 'leyenda' ? FIGURAS_LEYENDA : FIGURAS_CARNAVAL).filter(f => levelById(f.town)).map(f => ({
        id: f.id, key: 'figura:' + f.id, img: figuraImg(f.id) || '', icon: tab === 'leyenda' ? 'legend' : 'mask', name: f.name, locked: !visto(p, 'figura:' + f.id),
        towns: [f.town], comarcas: unicos([comarcaDe(f.town)]), sub: corto(f.town), verbo: 'Ver su ficha', abre: () => openFigura(ui, f.id) }));
    },
  };
}
/** La colección de una sección para el mapa, o null si esa sección no va en el mapa. */
export function coleccionDe(kind, ui) {
  return kind === 'nature' ? naturaleza(ui) : kind === 'escudos' ? escudos(ui) : kind === 'personajes' ? personajes(ui) : null;
}
