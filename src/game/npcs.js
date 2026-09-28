// Personajes del valle: aspecto y lugar
import { PLACES, rx } from '../world/layout.js';
import { VILLAGE } from '../world/village.js';
import { LANDMARKS } from '../world/landmarks.js';

export function npcDefs() {
  const ch = VILLAGE.church;
  const f = PLACES.fronton;
  const m = LANDMARKS.muskilda;
  return [
    { id: 'maite', name: 'Maite', face: '👩', color: '#2f5d7c', x: PLACES.crucero.x + 3, z: PLACES.crucero.z - 3.5, heading: Math.PI,
      look: { skin: '#f1c7a5', hair: '#3b2418', bun: true, shirt: '#f4efe6', vest: '#2f5d7c', skirt: '#35507a', pants: '#e9dfcc', scarf: '#d23b3b', shoes: '#5a3a22' } },
    { id: 'itziar', name: 'Itziar', face: '👵', color: '#5d7a5f', x: ch.door.x + 1.5, z: ch.door.z + 3.5, heading: -Math.PI / 2,
      look: { skin: '#eec6a8', hair: '#dcd7cf', bun: true, old: true, bent: 0.16, shirt: '#7a9e7e', vest: '#3d3350', skirt: '#3d3350', pants: '#d8cfc0', apron: '#f0ebe0', staff: true, height: 1.58 } },
    { id: 'kike', name: 'Kike', face: '🧒', color: '#c0392b', x: f.x + 1, z: f.z + 3, heading: Math.PI / 2,
      look: { skin: '#e9b98f', hair: '#8c5a2b', messy: true, shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', shortSleeves: true, shoes: '#f0f0f0', height: 1.36 } },
    { id: 'amaia', name: 'Amaia', face: '👧', color: '#d98c1f', x: rx(14) - 12.5, z: 14, heading: Math.PI / 2,
      look: { skin: '#f3cfb3', hair: '#2a1a12', braids: true, shirt: '#f2b134', skirt: '#3b5d8f', pants: '#f3cfb3', socks: '#ffffff', shoes: '#8a2f2f', height: 1.3 } },
    { id: 'garazi', name: 'Garazi', face: '🧀', color: '#b5485d', x: PLACES.plaza.x, z: PLACES.plaza.z - 13.9, heading: 0,
      look: { skin: '#f0c19c', hair: '#a0522d', bun: true, shirt: '#b5485d', apron: '#ffffff', skirt: '#4a3b35', pants: '#4a3b35', basket: true } },
    { id: 'joxemari', name: 'Joxemari', face: '👴', color: '#3a3530', x: PLACES.borda.x + 9, z: PLACES.borda.z + 3, heading: Math.PI / 2,
      look: { skin: '#dba882', hair: '#d6d0c6', old: true, bent: 0.08, txapela: '#1d1d24', moustache: '#ece8e0', shirt: '#efe9dc', vest: '#2d2b33', pants: '#3a3530', sash: '#7a2a2a', staff: true, shoes: '#3b2a1c' } },
    { id: 'inaki', name: 'Iñaki', face: '🧔', color: '#4f6b3a', x: rx(-165) - 22, z: -168, heading: Math.PI / 2,
      look: { skin: '#e2b08a', hair: '#4a3020', beard: '#4a3020', shirt: '#4f6b3a', vest: '#3f5530', pants: '#3f4a33', shoes: '#3b2a1c', height: 1.8, build: 1.1 } },
    { id: 'basajaun', name: 'Basajaun', face: '🌲', color: '#6b4a2e', x: rx(-432) - 34, z: -432, heading: Math.PI / 2,
      look: { skin: '#c49a78', hair: '#5a3a22', longHair: true, beard: '#5a3a22', brows: '#3a2412', fur: '#6b4a2e', shirt: '#6b4a2e', pants: '#5a3f28', staff: true, height: 2.55, build: 1.35, headScale: 1.05 } },
    { id: 'lamia', name: 'Lamia', face: '🧜‍♀️', color: '#2f8f8a', x: PLACES.pond.x - PLACES.pond.r - 3.5, z: PLACES.pond.z + 2, heading: Math.PI / 2,
      look: { skin: '#f6dcc8', hair: '#f3c94a', longHair: true, eyes: '#2f7f7a', shirt: '#9fd6d2', skirt: '#5fb0a8', pants: '#f6dcc8', feet: 'duck', crown: true } },
    { id: 'bobo', name: 'El Bobo', face: '🤡', color: '#e03c3c', x: m.dance.x - 3, z: m.dance.z, heading: -Math.PI / 2,
      look: { skin: '#f0c8a8', hair: '#3a2418', shirt: '#e03c3c', sleeves: '#f2c230', vest: '#3a8fd6', pants: '#3ca05a', hat: 'mask', hatColor: '#f2c230', castanets: true, shoes: '#1a1a1a' } },
    { id: 'zarratrako', name: 'Zarratrako', face: '🎭', color: '#6b5a48', x: 0, z: 0, heading: 0, hidden: true,
      look: { skin: '#e2b08a', hair: '#2a2a2a', fur: '#e8dcc0', shirt: '#e8dcc0', pants: '#4a4038', hat: 'mask', hatColor: '#2b2b2b', bell: true, staff: true, height: 1.8, build: 1.2 } },
  ];
}

// Vecinos que pasean por las calles
export function walkerDefs() {
  const W = (z, off) => ({ x: rx(z) + off, z });
  const looks = [
    { skin: '#eac1a0', hair: '#6b4a2e', shirt: '#c96b4b', pants: '#3a3a44', txapela: '#20202a' },
    { skin: '#f3d0b5', hair: '#1f1712', longHair: true, shirt: '#6e8fb8', skirt: '#2f3b52', pants: '#f3d0b5' },
    { skin: '#d9a57f', hair: '#bdb6aa', old: true, shirt: '#e8e0cc', vest: '#4a3b35', pants: '#4a4038', txapela: '#20202a', staff: true },
    { skin: '#f0c8a8', hair: '#c9772f', bun: true, shirt: '#8fb07a', skirt: '#6d3b5c', pants: '#f0c8a8', basket: true },
    { skin: '#e2b08a', hair: '#2e2018', messy: true, shirt: '#3a8fd6', pants: '#34495e', height: 1.4 },
  ];
  const names = ['Patxi', 'Nerea', 'Fermín', 'Edurne', 'Iker'];
  const routes = [
    [W(-80, -15), W(40, -15), W(70, -15), W(-20, -15)],
    [W(-80, 15), W(40, 15), W(-10, 15)],
    [W(-8, -15), W(-8, 15), { x: PLACES.plaza.x - 6, z: -8 }, W(-8, 15)],
    [W(-60, -39), W(50, -39)],
    [{ x: PLACES.plaza.x - 8, z: -14 }, W(-40, 39), W(20, 39), { x: PLACES.plaza.x + 4, z: 2 }],
  ];
  return looks.map((look, i) => ({ id: 'w' + i, name: names[i], face: '🙂', color: '#7a6450', x: routes[i][0].x, z: routes[i][0].z, look, route: routes[i], walker: true }));
}

export const WALKER_LINES = [
  ['¡Egun on! Hace un día precioso en el valle.', '"Egun on" significa "buenos días" en euskera.'],
  ['Mañana es la fiesta de Muskilda. ¡Toda la villa sube al santuario!'],
  ['¿Has probado el queso de Garazi? Está en la plaza.'],
  ['Cuando nieva, los tejados tan inclinados hacen que la nieve resbale.'],
  ['He oído cencerros por las calles… ¿será el Zarratrako?'],
];
