// LOS PELOTARIS ESTRELLA: los nuestros, inventados para el juego, como las estrellas de los juegos de fútbol (el autor, 28 nov
// 2026: «tener pelotaris muy buenos que solo se consigan o pagando o ya en un nivel de juego muy avanzado… crear nuestros
// propios pelotaris para que sean como también estrellas»; «que cambien de color sus cards o hacer algo identificativo»).
// Ninguno lleva el nombre de un pelotari de verdad. Por ahora, con los cuerpos de los pelotaris que ya hay (base: el de la
// plantilla cuyo aspecto lleva, ui/pelotariFig.js); su carta es la premium, dorada y negra con su brillo (ui/sportCard.js).
// Solo datos: se llevan tal cual a otro motor (PORTAR.md). Si se consiguen, lo dice game/estrellas.js.
//  · stats: sus cualidades, de 1 a 5 (fuerza, agilidad, velocidad), como las de rules.js pelotariStats; bonus: lo que suma
//    a su media en la carta: cada una con la suya, de 91 a 97 (con más, todas se quedaban en el tope, 99, y no se
//    distinguían)
//  · golpe: su golpe estrella; logro: cómo se consigue jugando (nivel, txapelas, campeón de un campeonato, puesto 1 del
//    ranking, campeonatos jugados); precio: más adelante, con dinero (euros)
export const ESTRELLAS = [
  { id: 'garaioa', name: 'Iker Garaioa', apodo: 'Haize', town: 'Leitza', base: 'Unai', girl: false, stats: { fuerza: 4, agilidad: 5, velocidad: 5 }, bonus: 1, golpe: 'gancho', logro: { tipo: 'nivel', n: 30 }, precio: 2.99 },
  { id: 'arregi', name: 'Maddi Arregi', apodo: 'Txapeldun', town: 'Elizondo', base: 'Garazi', girl: true, stats: { fuerza: 5, agilidad: 5, velocidad: 4 }, bonus: 5, golpe: 'dosparedes', logro: { tipo: 'txapelas', n: 3 }, precio: 2.99 },
  { id: 'otxoa', name: 'Unax Otxoa', apodo: 'Harria', town: 'Lekunberri', base: 'Mikel', girl: false, stats: { fuerza: 5, agilidad: 4, velocidad: 4 }, bonus: 4, golpe: 'rebote', logro: { tipo: 'campeon', kind: 'mano' }, precio: 2.99 },
  { id: 'lasa', name: 'Ainhoa Lasa', apodo: 'Txori', town: 'Isaba', base: 'Irati', girl: true, stats: { fuerza: 4, agilidad: 5, velocidad: 5 }, bonus: 4, golpe: 'dejada', logro: { tipo: 'nivel', n: 40 }, precio: 2.99 },
  { id: 'iturralde', name: 'Jon Iturralde', apodo: 'Ezkerra', town: 'Estella', base: 'Ander', girl: false, stats: { fuerza: 4, agilidad: 5, velocidad: 4 }, bonus: 5, golpe: 'cortada', logro: { tipo: 'campeon', kind: 'cuatro' }, precio: 2.99 },
  { id: 'eraso', name: 'Nora Eraso', apodo: 'Tximista', town: 'Sangüesa', base: 'Leire', girl: true, stats: { fuerza: 5, agilidad: 4, velocidad: 5 }, bonus: 4, golpe: 'saque', logro: { tipo: 'ranking', n: 1 }, precio: 2.99 },
  { id: 'zubiri', name: 'Beñat Zubiri', apodo: 'Hormetxe', town: 'Altsasu', base: 'Xabier', girl: false, stats: { fuerza: 5, agilidad: 4, velocidad: 5 }, bonus: 2, golpe: 'aguante', logro: { tipo: 'campeonatos', n: 10 }, precio: 2.99 },
  { id: 'ostiza', name: 'Itziar Ostiza', apodo: 'Erregina', town: 'Tudela', base: 'Nahia', girl: true, stats: { fuerza: 5, agilidad: 5, velocidad: 5 }, bonus: 5, golpe: 'dejada', logro: { tipo: 'campeon', kind: 'gran' }, precio: 4.99 },
];
/** La estrella de un nombre (el de la carta o el del partido, «Iker Garaioa» o «Iker»), o null */
export const estrellaDe = (name) => { const n = String(name || '').split(/[,·(]/)[0].trim().toLowerCase(); return ESTRELLAS.find(e => e.name.toLowerCase() === n || e.name.split(' ')[0].toLowerCase() === n) || null; };
