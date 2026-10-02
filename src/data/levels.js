// Localidades jugables: arquitectura, relieve, río, monumentos y misiones propias.
// Los personajes y diálogos son ficción del juego; los datos culturales proceden de las fichas del proyecto
// (Turismo de Navarra, Dantzatlas, Reyno Gourmet, ayuntamientos, IHAUTERIAPP...) y se resumen para niños.
//
// family: atlantic | pyrenean | central | ribera | city  → estilo de casas
// relief: valley | hills | plain | hilltop                → forma del terreno
// river: { name, x (desvío respecto al centro), w (semiancho), amp (meandro) } o null

const H = (name, look) => ({ name, look });
const PASTOR = { txapela: '#1d1d24', shirt: '#efe9dc', vest: '#2d2b33', pants: '#3a3530', staff: true, hair: '#d6d0c6', moustache: '#ece8e0', old: true };
const LAB = { shirt: '#6b8fb3', pants: '#3f4a5a', hair: '#4a3020' };
const QUESERA = { shirt: '#b5485d', apron: '#ffffff', skirt: '#4a3b35', hair: '#a0522d', bun: true };
const VITI = { shirt: '#8a4f7d', pants: '#3a3530', hat: 'straw', hair: '#2e2018' };
const HUERTA = { shirt: '#d9a03a', pants: '#4a5b3a', hat: 'straw', hair: '#6b4a2e' };

import { PERSONAJES, FIGURE_TOWNS } from './personajes.js';
import { FERIA_TOWNS } from './ferias.js';
import { DOLMEN_TOWNS } from './dolmen.js';
import { CASTLE_TOWNS } from './castillos.js';
import { MIRADOR_TOWNS } from './miradores.js';

export const LEVELS = [
  // ---------------- Baztan-Bidasoa ----------------
  { id: 'lesaka', name: 'Lesaka', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 55,
    river: { name: 'Onin', x: 6, w: 3.2, amp: 6 },
    intro: 'Villa de las Cinco Villas del Bidasoa, con casas de entramado de madera, palacios y portadas de piedra junto al regata Onin.',
    church: { name: 'Iglesia de San Martín de Tours', style: 'gothic', text: 'Se alza sobre el pueblo con su torre. Desde la plaza se sube por escaleras de piedra.' },
    landmarks: [{ kind: 'towerhouse', name: 'Casa-torre de Zabaleta', text: 'Las casas-torre medievales eran casas fuertes de piedra. Lesaka conserva varias junto al río.' }],
    missions: [
      { type: 'visit' },
      { type: 'dance', name: 'Zubigainekoa', text: 'El 7 de julio, los dantzaris bailan el Zubigainekoa encima del pretil del río Onin. ¡Hay que tener equilibrio!', host: H('Mikel, dantzari', { shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', txapela: '#c0392b' }), colors: ['#ffffff', '#d42f2f'] },
      { type: 'process', id: 'salmon', title: 'El viaje del salmón', host: H('Nerea, guarda del río', { shirt: '#3a6b5a', pants: '#2f3b33', hair: '#1f1712', bun: true }), product: 'Salmón del Bidasoa',
        text: 'El salmón nace en el río, viaja al mar y vuelve años después para poner sus huevos. Hay que cuidar el agua para que pueda regresar.',
        gather: { item: 'litter', n: 4, label: 'Recoger basura del río' },
        steps: ['El salmón nace en la grava del río', 'Baja hasta el mar Cantábrico', 'Crece en el océano', 'Vuelve río arriba a desovar'] },
      { type: 'trade', kind: 'herrero', title: 'La ferrería del Bidasoa', host: H('Joxe, herrero', { shirt: '#5a4a3a', apron: '#3a2a1a', pants: '#2b2630', hair: '#2a2a2a', moustache: '#2a2a2a' }),
        text: 'En el Bidasoa había ferrerías: con la fuerza del agua se movían martillos para trabajar el hierro. Golpea el hierro cuando esté al rojo.' },
    ] },
  { id: 'etxalar', name: 'Etxalar', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 40,
    river: { name: 'regata de Tximista', x: 40, w: 2.4, amp: 8 },
    intro: 'Pueblo de casas blancas junto a la iglesia, rodeado de montes y famoso por sus palomeras.',
    church: { name: 'Iglesia de San Pedro', style: 'gothic', text: 'En su cementerio hay estelas discoidales, piedras redondas talladas de hace siglos.' },
    landmarks: [{ kind: 'stelae', name: 'Estelas discoidales', text: 'Las hilarriak son piedras funerarias con forma de disco y dibujos grabados.' }, { kind: 'palomeras', name: 'Palomeras', text: 'En otoño, en los collados, se usan grandes redes para cazar palomas que migran. Es una tradición de siglos.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'palomero', title: 'Los palomeros', host: H('Patxi, palomero', { shirt: '#f0ebe0', vest: '#3a4a3a', pants: '#3a3530', txapela: '#1d1d24', hair: '#bdb6aa', old: true }),
        text: 'Los palomeros avisan desde lo alto cuando llega el bando de palomas y agitan paletas blancas. Pulsa en el momento justo para agitar la paleta.' },
      { type: 'herd', animal: 'sheep', n: 5, host: H('Maddi, pastora', { shirt: '#e8e0cc', vest: '#3a2a4a', skirt: '#3a3530', pants: '#3a3530', hair: '#6b3b1f', bun: true, staff: true }),
        text: 'Las ovejas latxas pastan en los montes. Llévalas al redil antes de que llegue la niebla.' },
      { type: 'quiz' },
    ] },
  { id: 'zugarramurdi', name: 'Zugarramurdi', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 32,
    river: { name: 'regata Infernuko erreka', x: 70, w: 2.2, amp: 6 },
    intro: 'Pueblo junto a la frontera, conocido por su cueva y por la historia de las brujas.',
    church: { name: 'Iglesia de la Asunción', style: 'gothic', text: 'Templo de piedra en el centro del pueblo, rodeado de casas de caserío.' },
    landmarks: [{ kind: 'cave', name: 'Cueva de las Brujas', text: 'Una gran cueva atravesada por la regata del Infierno. En 1610 muchas personas del pueblo fueron acusadas injustamente de brujería.' }],
    missions: [
      { type: 'visit' },
      { type: 'legend', who: 'sorgina', title: 'La noche de San Juan', host: H('Amona Graxi', { shirt: '#3d3350', skirt: '#2a2440', pants: '#2a2440', hair: '#dcd7cf', old: true, bent: 0.15, staff: true, bun: true }),
        text: 'Las sorginak (brujas) son parte de las leyendas. Hoy sabemos que en 1610 se acusó a gente inocente. Encuentra las hierbas de San Juan en la cueva y alrededores.',
        gather: { item: 'herb', n: 5, label: 'Coger hierbas de San Juan', near: 'cave' } },
      { type: 'process', id: 'cuajada', title: 'Leche, cuajada y queso', host: H('Aitziber, quesera', QUESERA), product: 'Cuajada',
        text: 'La cuajada se hace con leche de oveja calentada y cuajo. Antes se calentaba con una piedra al rojo.',
        gather: { item: 'milk', n: 3, label: 'Llevar leche de oveja', near: 'farm' },
        steps: ['Ordeñar las ovejas', 'Calentar la leche', 'Añadir el cuajo', 'Dejar que cuaje en el cuenco'] },
      { type: 'quiz' },
    ] },
  { id: 'amaiur-maya-del-baztan', name: 'Amaiur / Maya', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 36,
    river: { name: 'regata de Amaiur', x: -45, w: 2.6, amp: 5 },
    intro: 'Pueblo de Baztan con una calle larga de casas palacio, un arco de entrada y un molino.',
    church: { name: 'Iglesia de la Asunción', style: 'gothic', text: 'De origen medieval, fue reconstruida en los siglos XVI y XVIII. Conserva un órgano romántico Cavaillé-Coll.' },
    landmarks: [{ kind: 'monolith', name: 'Monolito del castillo', text: 'En el alto estaba el castillo de Amaiur, último lugar defendido por los navarros en 1522. Hoy hay un monolito.' },
      { kind: 'mill', name: 'Molino de Amaiur', text: 'La fuerza del agua mueve la rueda del molino y las piedras que muelen el grano.' }, { kind: 'arch', name: 'Arco de entrada', text: 'Un arco de piedra recibe al visitante en la calle principal.' }],
    missions: [
      { type: 'visit' },
      { type: 'process', id: 'mill', title: 'Del maíz a la harina', host: H('Iñigo, molinero', { shirt: '#e8e0cc', apron: '#f0ebe0', pants: '#6b5a48', hair: '#8c5a2b' }), product: 'Harina de maíz',
        text: 'El agua de la regata hace girar la rueda del molino. Recoge las mazorcas de los campos cercanos.',
        gather: { item: 'corn', n: 6, label: 'Coger mazorcas de maíz', near: 'fields' },
        steps: ['Desgranar las mazorcas', 'Abrir la compuerta del agua', 'Moler el grano entre las piedras', 'Guardar la harina en sacos'] },
      { type: 'legend', who: 'basajaun', title: 'El señor del bosque', host: H('Basajaun', { myth: 'basajaun', fur: '#6b4a2e', skin: '#c49a78', hair: '#5a3a22', beard: '#5a3a22', longHair: true, shirt: '#6b4a2e', pants: '#5a3f28', staff: true, height: 2.5, build: 1.35 }),
        text: 'En las leyendas de Baztan, el Basajaun protege los rebaños y avisa de las tormentas. Ayúdale a recoger las ovejas perdidas.',
        gather: { item: 'lamb', n: 4, label: 'Encontrar un cordero perdido', near: 'forest' } },
      { type: 'quiz' },
    ] },
  { id: 'ituren', name: 'Ituren', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 30,
    river: { name: 'Ezkurra', x: 30, w: 3, amp: 7 },
    intro: 'Pueblo de Malerreka famoso por sus joaldunak, que en carnaval hacen sonar grandes cencerros.',
    church: { name: 'Iglesia de San Martín', style: 'gothic', text: 'La parroquia preside el pueblo entre caseríos y prados.' },
    landmarks: [{ kind: 'bridge', name: 'Puente sobre el Ezkurra', text: 'Los joaldunak de Ituren y Zubieta se visitan cruzando caminos y puentes.' }],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'joaldun', title: 'Los joaldunak', host: H('Ane', { shirt: '#f2b134', skirt: '#3b5d8f', pants: '#f3cfb3', hair: '#2a1a12', braids: true, height: 1.3 }),
        text: 'Llevan cencerros a la espalda, piel de oveja, gorro cónico con cintas y un hisopo de cola de caballo. ¡Síguelos por el ruido!' },
      { type: 'herd', animal: 'cows', n: 4, host: H('Fermín, ganadero', PASTOR), text: 'Las vacas de pasto pasan el día en los prados. Llévalas a la cuadra.' },
      { type: 'quiz' },
    ] },
  { id: 'elizondo', name: 'Elizondo', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 70,
    river: { name: 'Baztan', x: 0, w: 5, amp: 4 },
    intro: 'Capital del valle de Baztan, con palacios de indianos y casas blasonadas a orillas del río.',
    church: { name: 'Iglesia de Santiago', style: 'baroque', text: 'Templo de gran torre construido a principios del siglo XX con estilo que recuerda al barroco.' },
    landmarks: [{ kind: 'palace', name: 'Palacio de Arizkunenea', text: 'Casa-palacio del siglo XVII. Muchos baztaneses emigraron a América y al volver construyeron casas palacio: eran los indianos.' }, { kind: 'bridge', name: 'Puente de Elizondo', text: 'El río Baztan atraviesa el pueblo; más abajo pasa a llamarse Bidasoa.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'cestero', title: 'El cestero', host: H('Martín, cestero', { shirt: '#e8e0cc', vest: '#3a4a3a', pants: '#3a3530', txapela: '#1d1d24', hair: '#bdb6aa', old: true }) },
      { type: 'process', id: 'idiazabal', title: 'Del rebaño al queso', host: H('Ane, pastora', QUESERA), product: 'Queso Idiazabal',
        text: 'El queso Idiazabal se hace con leche cruda de oveja latxa. Algunos se ahúman con madera.',
        gather: { item: 'milk', n: 3, label: 'Llevar leche de oveja latxa', near: 'farm' },
        steps: ['Ordeñar las ovejas latxas', 'Cuajar la leche', 'Cortar y prensar la cuajada', 'Salar y dejar madurar'] },
      { type: 'legend', who: 'lamia', title: 'La lamia de Xorroxin', host: H('Lamia', { myth: 'lamia', hair: '#f3c94a', longHair: true, shirt: '#9fd6d2', skirt: '#5fb0a8', pants: '#f6dcc8', feet: 'duck', crown: true }),
        text: 'En las leyendas de la cascada de Xorroxin, las lamias se peinan con peines de oro. Ha perdido tres peines en el río.',
        gather: { item: 'comb', n: 3, label: 'Coger un peine de oro', near: 'river' } },
      { type: 'dance', name: 'Baztan dantza', text: 'Las danzas de Baztan (mutil dantzak) se bailan en fiestas con txistu y tamboril.', host: H('Leire, dantzari', { shirt: '#ffffff', skirt: '#c0392b', pants: '#ffffff', hair: '#3b2418', bun: true }), colors: ['#ffffff', '#c0392b'] },
      { type: 'quiz' },
    ] },
  // ---------------- Larraun-Leitzaldea ----------------
  { id: 'leitza', name: 'Leitza', comarca: 'larraun-leitzaldea', family: 'atlantic', relief: 'valley', size: 55,
    river: { name: 'Leitzaran', x: -30, w: 3.2, amp: 6 },
    intro: 'Villa de grandes caseríos con amplios aleros, tierra de harrijasotzaileak y aizkolaris.',
    church: { name: 'Iglesia de San Miguel', style: 'baroque', text: 'Preside la plaza de Leitza, donde se celebran pruebas de deporte rural.' },
    landmarks: [{ kind: 'tunnel', name: 'Vía verde del Plazaola', text: 'Por aquí pasaba el tren del Plazaola entre Pamplona y San Sebastián. Hoy es un camino para bicis y paseos.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'harrijasotzaile', title: 'Levantar la piedra', host: H('Iñaki, harrijasotzaile', { shirt: '#ffffff', vest: '#2b2630', pants: '#ffffff', sash: '#2b2630', hair: '#2a1a12', beard: '#2a1a12', build: 1.3 }),
        text: 'Los harrijasotzaileak levantan piedras de cientos de kilos. ¡Pulsa muy rápido para subirla al hombro!' },
      { type: 'trade', kind: 'aizkolari', title: 'Corta el tronco', host: H('Maialen, aizkolari', { shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', hair: '#2a1a12', bun: true }),
        text: 'Los aizkolaris cortan troncos con el hacha. Golpea cuando la marca esté en la zona verde.' },
      { type: 'quiz' },
    ] },
  { id: 'lekunberri', name: 'Lekunberri', comarca: 'larraun-leitzaldea', family: 'atlantic', relief: 'valley', size: 40,
    river: { name: 'Larraun', x: 40, w: 2.6, amp: 5 },
    intro: 'Pueblo del valle de Larraun, a los pies de la sierra de Aralar, entre prados, caseríos y hayedos.',
    church: { name: 'Iglesia de San Juan Bautista', style: 'baroque', text: 'La parroquia del pueblo, rodeada de casas de piedra con grandes aleros.' },
    landmarks: [{ kind: 'tunnel', name: 'Vía verde del Plazaola', text: 'El tren del Plazaola paraba en Lekunberri en su viaje entre Pamplona y San Sebastián. Hoy la vía es un camino para ir a pie o en bici, con túneles y puentes.' }, { kind: 'dolmen', name: 'Dolmen de Aralar', text: 'En la sierra de Aralar hay decenas de dólmenes: tumbas de piedra que levantaron los primeros pastores hace unos 5.000 años.' }],
    missions: [
      { type: 'visit' },
      { type: 'herd', animal: 'pigs', n: 5, title: 'El euskal txerri', card: 'Euskal txerri', host: H('Joxe, criador', { shirt: '#e9e1cf', vest: '#3a4a3a', pants: '#3a3530', txapela: '#1d1d24', hair: '#9a948a', moustache: '#9a948a', staff: true }),
        story: [
          'Mira esos cerdos: rosados, con la cabeza y el culo negros y unas orejas tan grandes que les tapan los ojos. Son euskal txerri, el cerdo vasco. También lo llaman «pío negro».',
          'Hace cien años había más de cien mil en los caseríos del norte de Navarra y del País Vasco francés. Pero se criaban despacio y se fueron cambiando por otras razas que engordaban más rápido.',
          'En 1985 quedaban solo unos veinticinco. ¡Casi desaparecen para siempre! Entonces una familia de aquí, de Lekunberri, empezó a criarlos con un macho y dos hembras.',
          'Hoy vuelven a ser muchos. Viven libres en los prados y bosques del valle, con Aralar al fondo, y comen hierba, raíces, bellotas y castañas.',
        ],
        text: 'Se está haciendo tarde y los cerdos andan sueltos por el prado. Llévalos a la cuadra.',
        outro: '¡Todos dentro! Salvar una raza es como salvar un trocito de la historia del campo: si desaparece, ya no vuelve.',
        cardText: 'Cerdo vasco de piel rosada con cabeza y grupa negras y orejas grandes que le caen sobre los ojos. Estuvo a punto de desaparecer en 1985 y se ha recuperado criándolo al aire libre en el norte de Navarra.' },
      { type: 'quiz' },
    ] },
  // ---------------- Pirineo ----------------
  { id: 'orreaga-roncesvalles', name: 'Orreaga / Roncesvalles', comarca: 'pirineo', family: 'pyrenean', relief: 'valley', size: 18,
    river: { name: 'regata de Orreaga', x: 60, w: 2.4, amp: 5 },
    intro: 'Primer lugar del Camino de Santiago en Navarra, entre hayedos, con su colegiata y el silo de Carlomagno.',
    church: { name: 'Real Colegiata de Santa María', style: 'gothic', text: 'Iglesia gótica del siglo XIII que acoge a peregrinos desde hace siglos.' },
    landmarks: [{ kind: 'chapel', name: 'Silo de Carlomagno', text: 'Capilla de Sancti Spiritus, la construcción más antigua del conjunto.' }, { kind: 'cross', name: 'Cruz de peregrinos', text: 'Aquí empiezan muchos peregrinos su camino hasta Santiago de Compostela.' }],
    missions: [
      { type: 'visit' },
      { type: 'race', kind: 'camino', title: 'Tu primera etapa', host: H('Hospitalera Maite', { shirt: '#6b8fb3', skirt: '#3a3530', pants: '#3a3530', hair: '#6b3b1f', bun: true }),
        text: 'Sigue las flechas amarillas y las conchas del Camino hasta la cruz antes de que anochezca.' },
      { type: 'legend', who: 'roldan', title: 'La batalla de Orreaga', host: H('Juglar', { shirt: '#8a2f2f', pants: '#3a3530', hat: 'mask', hatColor: '#3a8fd6' }),
        text: 'En el año 778 los vascones vencieron aquí a la retaguardia de Carlomagno. Después se contó en el Cantar de Roldán. Encuentra las piezas del olifante (cuerno) de Roldán.',
        gather: { item: 'horn', n: 3, label: 'Coger una pieza del olifante', near: 'forest' } },
      { type: 'quiz' },
      { type: 'observe', species: ['pito', 'ciervo', 'corzo', 'ardilla', 'jabali', 'zorro'], n: 3, title: 'Los guardianes de Irati', host: H('Mikel, guarda forestal', { shirt: '#4f6b3a', vest: '#3f5530', pants: '#3f4a33', hair: '#2a1a12', beard: '#2a1a12', bag: '#8a6a3a' }),
        story: ['La selva de Irati es uno de los hayedos más grandes de Europa. Aquí hay árboles que ya eran viejos cuando pasaban los primeros peregrinos.', 'Si te quedas muy quieto, oirás un tamborileo: toc-toc-toc-toc. Es el pito negro, el carpintero más grande de Europa. Y en septiembre los ciervos braman tan fuerte que el bosque tiembla: es la berrea.', 'Los animales del bosque te ven antes que tú a ellos. Camina despacio y usa los prismáticos.'],
        text: 'Descubre con los prismáticos a los habitantes del hayedo: pito negro, ciervo, corzo, ardilla, jabalí o zorro.',
        hint: 'Camina despacio: si corres, los animales huyen. El pito negro está pegado a los troncos de las hayas.', outro: 'Has visto el bosque como lo ven los guardas: lleno de vida escondida.' },
    ] },
  { id: 'aribe', name: 'Aribe', comarca: 'pirineo', family: 'pyrenean', relief: 'valley', size: 22,
    river: { name: 'Irati', x: 20, w: 5, amp: 4 },
    intro: 'Pueblo del valle de Aezkoa junto al río Irati, con puente medieval y hórreos.',
    church: { name: 'Iglesia de San Pedro', style: 'romanesque', text: 'Pequeña iglesia de piedra con tejado de pizarra.' },
    landmarks: [{ kind: 'horreo', name: 'Hórreo de Aezkoa', text: 'Los hórreos son graneros elevados sobre pilares para proteger el grano de la humedad y los ratones. En Aezkoa se conservan muchos.' }, { kind: 'bridge', name: 'Puente medieval', text: 'Un puente de piedra de un solo ojo cruza el Irati.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'carbonero', title: 'La carbonera', host: H('Fermín, carbonero', { shirt: '#4a4540', pants: '#2b2630', hair: '#2a2a2a', beard: '#2a2a2a', txapela: '#1d1d24' }) },
      { type: 'herd', animal: 'cows', n: 5, host: H('Xabier, ganadero', PASTOR), text: 'En Aezkoa las vacas y los terneros pastan en los montes en verano. Guíalas al prado del pueblo.' },
      { type: 'harvest', crop: 'patata', n: 8, host: H('Jokin', HUERTA), text: 'La patata de siembra del Pirineo crece en campos de montaña. Recoge las patatas y guárdalas en el hórreo.' },
      { type: 'quiz' },
    ] },
  { id: 'otsagabia-ochagavia', name: 'Otsagabia / Ochagavía', comarca: 'pirineo', family: 'pyrenean', special: 'salazar',
    intro: 'Aventura completa del valle de Salazar: Otsagabia, la Selva de Irati y el santuario de Muskilda.' },
  { id: 'isaba-izaba', name: 'Isaba / Izaba', comarca: 'pirineo', family: 'pyrenean', relief: 'valley', size: 48,
    river: { name: 'Esca', x: 12, w: 3.6, amp: 6 },
    intro: 'Villa del valle de Roncal con casas de piedra, chimeneas troncocónicas y una iglesia-fortaleza.',
    church: { name: 'Iglesia de San Cipriano', style: 'fortress', text: 'Iglesia-fortaleza del siglo XVI con una gran torre, porque protegía a la población.' },
    landmarks: [{ kind: 'stone', name: 'Piedra de San Martín', text: 'Cada 13 de julio, en la frontera, el valle de Baretous entrega tres vacas al de Roncal: el Tributo de las Tres Vacas, uno de los tratados más antiguos de Europa.' }],
    missions: [
      { type: 'visit' },
      { type: 'process', id: 'roncal', title: 'De la leche al queso Roncal', host: H('Arantxa, quesera', QUESERA), product: 'Queso Roncal',
        text: 'El queso Roncal fue el primer queso de España con denominación de origen. Se hace con leche cruda de oveja.',
        gather: { item: 'milk', n: 3, label: 'Recoger leche de oveja', near: 'farm' },
        steps: ['Ordeñar las ovejas', 'Cuajar la leche cruda', 'Moldear y prensar', 'Salar y madurar al menos cuatro meses'] },
      { type: 'herd', animal: 'cows', n: 3, title: 'El Tributo de las Tres Vacas', host: H('Alcalde de Isaba', { shirt: '#1a1a1a', pants: '#1a1a1a', vest: '#1a1a1a', hair: '#bdb6aa', hat: 'mask', hatColor: '#1a1a1a' }),
        text: 'Lleva las tres vacas hasta la piedra de San Martín, como en el tributo que se celebra cada 13 de julio.' },
      { type: 'dance', name: 'Ttun-ttun', text: 'La danza ttun-ttun del Roncal se acompaña con un instrumento de cuerdas que se golpea con un palo.', host: H('Dantzari roncalesa', { shirt: '#ffffff', skirt: '#2b2630', pants: '#ffffff', hair: '#3b2418', bun: true }), colors: ['#1a1a1a', '#ffffff'] },
      { type: 'quiz' },
      { type: 'observe', species: ['quebrantahuesos', 'buitre', 'aguila'], n: 3, title: 'El ave que rompe huesos', host: H('Iratxe, guarda de Belagua', { shirt: '#4f6b3a', vest: '#3f5530', pants: '#3f4a33', hair: '#6b3b1f', bun: true, female: true, bag: '#8a6a3a' }),
        story: ['En Belagua los pastores cuentan una historia muy rara: un ave de fuego que sube huesos al cielo… y los deja caer sobre las piedras.', 'No es magia: es el quebrantahuesos. Rompe los huesos para comerse el tuétano. Su pecho es naranja porque se baña en fuentes de agua con hierro, como si se maquillara.', 'Casi se extingue, y hoy los guardas del Pirineo lo cuidamos como un tesoro. Por aquí también vuelan buitres y águilas reales.'],
        text: 'Encuentra con los prismáticos las grandes aves del Pirineo: el quebrantahuesos, el buitre leonado y el águila real.',
        hint: 'Busca en lo alto: el quebrantahuesos tiene la cola en forma de rombo.', outro: '¡Tienes ojos de guarda! Pocas personas han visto un quebrantahuesos en libertad.' },
    ] },
  { id: 'erronkari-roncal', name: 'Erronkari / Roncal', comarca: 'pirineo', family: 'pyrenean', relief: 'valley', size: 34,
    river: { name: 'Esca', x: -10, w: 3.6, amp: 5 },
    intro: 'Villa que da nombre al valle y al queso, cuna del tenor Julián Gayarre.',
    church: { name: 'Iglesia de San Esteban', style: 'fortress', text: 'Iglesia de piedra en lo alto del pueblo, con cementerio donde está el mausoleo de Gayarre.' },
    landmarks: [{ kind: 'house', name: 'Casa Museo Julián Gayarre', text: 'Julián Gayarre fue un tenor famoso en toda Europa en el siglo XIX. Nació en esta casa.' }, { kind: 'bridge', name: 'Puente sobre el Esca', text: 'El Esca baja por todo el valle hacia el embalse de Yesa.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'hilandera', title: 'De la oveja al ovillo', host: H('Amona Felisa', { shirt: '#3d3350', skirt: '#2a2440', pants: '#2a2440', hair: '#dcd7cf', old: true, bun: true }) },
      { type: 'process', id: 'roncal', title: 'La quesería del valle', host: H('Iker, quesero', { ...QUESERA, shirt: '#3a6b8f', skirt: null, pants: '#3a3530', bun: false, hair: '#2e2018' }), product: 'Queso Roncal',
        text: 'Solo los siete pueblos del valle elaboran el queso Roncal. Ayuda a preparar las piezas.',
        gather: { item: 'milk', n: 3, label: 'Llevar leche', near: 'farm' },
        steps: ['Recoger la leche', 'Cuajar', 'Moldear las piezas', 'Madurar en la cava'] },
      { type: 'tradition', kind: 'song', title: 'El canto de Gayarre', host: H('Maestro de música', { shirt: '#1a1a1a', vest: '#8a2f2f', pants: '#1a1a1a', hair: '#bdb6aa', moustache: '#bdb6aa' }),
        text: 'Julián Gayarre tenía una voz prodigiosa. Repite las notas en el orden correcto.' },
      { type: 'quiz' },
    ] },
  { id: 'burgui-burgi', name: 'Burgui / Burgi', comarca: 'pirineo', family: 'pyrenean', relief: 'valley', size: 28,
    river: { name: 'Esca', x: 0, w: 5, amp: 5 },
    intro: 'Puerta del valle de Roncal, con un puente medieval sobre el Esca y la fiesta de la Almadía.',
    church: { name: 'Iglesia de San Pedro', style: 'romanesque', text: 'Parroquia de piedra que domina el caserío.' },
    landmarks: [{ kind: 'bridge', name: 'Puente medieval', text: 'Por debajo de este puente bajaban las almadías, balsas de troncos que llevaban la madera río abajo.' }, { kind: 'raft', name: 'Almadía', text: 'Los almadieros unían troncos para formar balsas y las guiaban por el río hasta el Ebro.' }],
    missions: [
      { type: 'visit' },
      { type: 'race', kind: 'almadia', title: 'El Día de la Almadía', host: H('Almadiero', { shirt: '#ffffff', vest: '#2b2630', pants: '#2b2630', txapela: '#1d1d24', hair: '#6b4a2e', staff: true }),
        text: 'Guía la almadía río abajo pasando por las boyas. ¡Cuidado con las piedras!' },
      { type: 'trade', kind: 'aizkolari', title: 'Troncos para la almadía', host: H('Aizkolari', { shirt: '#ffffff', pants: '#ffffff', sash: '#2b2630', hair: '#2a1a12' }),
        text: 'Antes de montar la almadía hay que cortar y preparar los troncos.' },
      { type: 'quiz' },
    ] },
  // ---------------- Sakana ----------------
  { id: 'altsasu-alsasua', name: 'Altsasu / Alsasua', comarca: 'sakana', family: 'atlantic', relief: 'valley', size: 75,
    river: { name: 'Altzania', x: 50, w: 2.6, amp: 6 },
    intro: 'Villa de Sakana entre las sierras de Urbasa y Aralar, con uno de los carnavales más conocidos: el de los Momotxorros.',
    church: { name: 'Iglesia de la Asunción', style: 'gothic', text: 'Templo de piedra en el centro del casco antiguo.' },
    landmarks: [{ kind: 'plaza', name: 'Plaza del carnaval', text: 'El martes de carnaval salen los Momotxorros, con cuernos, sábanas manchadas de rojo y un sarde (horca).' }, { kind: 'dolmen', name: 'Dolmen de la sierra de Urbasa', text: 'En las sierras de Urbasa y Aralar hay decenas de dólmenes: tumbas de piedra levantadas por los primeros pastores hace unos 5.000 años.' }],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'momotxorro', title: 'Momotxorros', host: H('Unai', { shirt: '#3a8fd6', pants: '#34495e', hair: '#2e2018', messy: true, height: 1.4 }),
        text: 'Los Momotxorros llevan cuernos, piel de oveja y un sarde. ¡Escucha sus cencerros y encuéntralos!' },
      { type: 'process', id: 'idiazabal', title: 'Queso de Urbasa', host: H('Garazi, pastora', QUESERA), product: 'Queso Idiazabal',
        text: 'En verano los rebaños suben a los pastos de Urbasa y Aralar.',
        gather: { item: 'milk', n: 3, label: 'Llevar leche', near: 'farm' },
        steps: ['Subir el rebaño a la sierra', 'Ordeñar', 'Hacer la cuajada', 'Madurar el queso'] },
      { type: 'herd', animal: 'sheep', n: 5, host: H('Pastor de Urbasa', PASTOR), text: 'Baja las ovejas de la sierra antes de la tormenta.' },
      { type: 'quiz' },
    ] },
  { id: 'irurtzun', name: 'Irurtzun', comarca: 'sakana', family: 'atlantic', relief: 'valley', size: 40,
    river: { name: 'Larraun', x: -35, w: 3.5, amp: 6 },
    intro: 'Villa en el paso entre la Cuenca de Pamplona y Sakana, a los pies de las Dos Hermanas: dos montañas de caliza que cierran el valle.',
    // las Dos Hermanas (Bi Ahizpak): dos cumbres a cada lado del río, con el desfiladero entre ellas
    peaks: { z: -250, dx: 66, h: [128, 112], r: 92 },
    church: { name: 'Iglesia de San Martín', style: 'romanesque', text: 'Pequeña parroquia de piedra del pueblo.' },
    landmarks: [{ kind: 'pass', name: 'Las Dos Hermanas', text: 'Son dos montañas de roca caliza, una a cada lado del valle, que forman parte de las sierras que rodean la Cuenca de Pamplona. Entre las dos se abre un desfiladero estrecho: por él pasan el río, la carretera, el tren y la vía verde del Plazaola. Desde este mirador se ven las dos, frente a frente, como dos hermanas.' }],
    missions: [
      { type: 'visit' },
      { type: 'harvest', crop: 'manzana', n: 8, host: H('Josu', HUERTA), text: 'En los caseríos se cultivan manzanos. Con las manzanas se hace sidra y compota.' },
      { type: 'race', kind: 'bici', title: 'La vía verde del Plazaola', host: H('Ciclista', { shirt: '#2fb276', pants: '#1a1a1a', hair: '#3b2418' }), text: 'Recorre el antiguo trazado del tren pasando por las balizas.' },
      { type: 'quiz' },
    ] },
  // ---------------- Comarca de Pamplona ----------------
  { id: 'pamplona', name: 'Pamplona / Iruña', comarca: 'pamplona', family: 'city', relief: 'plain', size: 130, layout: 'pamplona',
    river: { name: 'Arga', x: -175, w: 8, amp: 12 },
    intro: 'Capital de Navarra: murallas, catedral, la plaza del Castillo y las fiestas de San Fermín.',
    church: { name: 'Catedral de Santa María', style: 'pamplona', text: 'Por fuera, fachada neoclásica con dos torres y columnas; por dentro, una catedral gótica. En la torre norte está María, una de las campanas más grandes de España.' },
    landmarks: [
      { kind: 'plaza', name: 'Plaza del Castillo', x: 40, z: 20, text: 'El cuarto de estar de Pamplona: soportales, el kiosco de la música en el centro y el Café Iruña, abierto en 1888.' },
      { kind: 'townhall', name: 'Ayuntamiento', x: -14, z: -116, text: 'Fachada barroca del siglo XVIII. Desde su balcón se lanza el chupinazo el 6 de julio a mediodía: ¡empiezan los Sanfermines!' },
      { kind: 'estafeta', name: 'Calle Estafeta', x: 110, z: -104, text: 'La calle más famosa del encierro: unos 300 metros de casas altas con balcones, del Ayuntamiento hasta la plaza de toros.' },
      { kind: 'bullring', name: 'Plaza de Toros', x: 232, z: -56, pad: 40, text: 'Se inauguró en 1922 y es una de las más grandes del mundo. Aquí termina el encierro. Fuera hay un busto del escritor Ernest Hemingway, que contó los Sanfermines en una novela.' },
      { kind: 'walls', name: 'Murallas y Portal de Francia', x: 40, z: -262, text: 'Pamplona conserva casi 5 kilómetros de murallas. Por el Portal de Francia, con su puente levadizo, entran los peregrinos del Camino de Santiago. El baluarte del Redín mira al río Arga.' },
      { kind: 'citadel', name: 'Ciudadela', x: -60, z: 250, pad: 78, padBlend: 26, text: 'Fortaleza con forma de estrella de cinco puntas, mandada construir por el rey Felipe II a finales del siglo XVI. Hoy es un gran parque.' },
      { kind: 'stadium', name: 'Estadio El Sadar', x: 232, z: 318, pad: 74, padBlend: 26, text: 'El campo de fútbol de Osasuna, el equipo de Pamplona. Se inauguró en 1967 y se renovó en 2021: sus gradas están muy cerca del césped.' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'caravinagre', title: 'Gigantes y cabezudos', host: H('Kiliki', { shirt: '#3a8fd6', pants: '#e03c3c', hat: 'mask', hatColor: '#f2c230', height: 1.5 }),
        text: 'La comparsa de gigantes y cabezudos recorre las calles en San Fermín. Busca a Caravinagre, el cabezudo más famoso.' },
      { type: 'race', kind: 'encierro', title: 'El encierro de San Fermín', host: H('Pastor del encierro', { shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', scarf: '#d42f2f', hair: '#2a1a12', staff: true }),
        text: 'Cada 7 de julio empieza San Fermín y, cada mañana a las ocho, el encierro: seis toros y los cabestros corren por la Estafeta hasta la plaza de toros. Corre delante de ellos y esquívalos.' },
      { type: 'process', id: 'chistorra', title: 'La txistorra', host: H('Carnicera Itziar', { shirt: '#ffffff', apron: '#c0392b', pants: '#3a3530', hair: '#6b3b1f', bun: true }), product: 'Txistorra',
        text: 'La txistorra es un embutido fino y alargado típico de Navarra, con pimentón.',
        gather: { item: 'pepper', n: 4, label: 'Traer pimentón', near: 'market' },
        steps: ['Picar la carne', 'Mezclar con pimentón, ajo y sal', 'Embutir en la tripa', 'Dejar orear'] },
      { type: 'quiz' },
    ] },
  // ---------------- Prepirineo ----------------
  { id: 'aoiz', name: 'Aoiz / Agoitz', comarca: 'prepirineo', family: 'central', relief: 'valley', size: 50,
    river: { name: 'Irati', x: 25, w: 5.5, amp: 6 },
    intro: 'Villa a orillas del Irati, con casas señoriales y un carnaval con cascabobos.',
    church: { name: 'Iglesia de San Miguel', style: 'gothic', text: 'Guarda un retablo del escultor Juan de Anchieta.' },
    landmarks: [{ kind: 'bridge', name: 'Puente sobre el Irati', text: 'El Irati, que nace en la selva, pasa por Aoiz hacia el sur.' }],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'cascabobo', title: 'Cascabobos', host: H('Irati', { shirt: '#e03c3c', skirt: '#f2c230', pants: '#f3cfb3', hair: '#2a1a12', braids: true, height: 1.3 }),
        text: 'Cascabobos y mascaritas llenan de color el carnaval de Aoiz. Encuentra al cascabobo.' },
      { type: 'process', id: 'honey', title: 'De la flor a la miel', host: H('Apicultora Maite', { shirt: '#f2c230', pants: '#f0ebe0', hair: '#6b3b1f', bun: true }), product: 'Miel',
        text: 'Las abejas visitan las flores y fabrican miel en la colmena.',
        gather: { item: 'flower', n: 6, label: 'Coger flores para las abejas', near: 'fields' },
        steps: ['Las abejas liban las flores', 'Guardan el néctar en los panales', 'El apicultor retira los cuadros', 'Se extrae y se envasa la miel'] },
      { type: 'quiz' },
    ] },
  // ---------------- Sangüesa ----------------
  { id: 'lumbier', name: 'Lumbier', comarca: 'sanguesa', family: 'central', relief: 'hills', size: 45,
    river: { name: 'Irati', x: 70, w: 5, amp: 6 },
    intro: 'Villa junto a la Foz de Lumbier, un desfiladero donde viven buitres, y con el carnaval de los iraskos.',
    church: { name: 'Iglesia de la Asunción', style: 'gothic', text: 'Templo de piedra en el centro del casco antiguo.' },
    landmarks: [{ kind: 'gorge', name: 'Foz de Lumbier', text: 'El río Irati ha excavado este cañón en la roca. El Puente del Diablo se rompió en la Guerra de la Independencia.' }, { kind: 'ruin', name: 'Puente del Diablo', text: 'A la salida de la Foz quedan los restos de un puente medieval. La leyenda dice que lo levantó el diablo en una sola noche.' }],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'irasko', title: 'Oridos e iraskos', host: H('Mikel', { shirt: '#8fb07a', pants: '#34495e', hair: '#8c5a2b', messy: true, height: 1.4 }),
        text: 'En el carnaval de Lumbier salen oridos e iraskos, con sacos y cestas con cuernos.' },
      { type: 'observe', species: 'buitre', n: 3, title: 'Los buitres de la foz', host: H('Guarda de la foz', { shirt: '#4f6b3a', vest: '#3f5530', pants: '#3f4a33', hair: '#4a3020', beard: '#4a3020' }),
        text: 'En las paredes de la foz anidan buitres leonados. Obsérvalos con los prismáticos sin molestarlos.',
        story: ['Cada mañana, cuando el sol calienta las rocas de la foz, pasa algo mágico: el aire caliente sube… y los buitres se dejan llevar sin mover un ala.', 'Los pastores dicen que los buitres son los barrenderos del monte: sin ellos, los montes estarían llenos de restos. Hace años casi desaparecieron, y hoy vuelven a llenar el cielo.'],
        hint: 'Mira muy alto, encima de las paredes de la foz: dan vueltas y vueltas.', outro: 'Tres buitres anotados. Ahora ya sabes reconocerlos: alas como tablas y dedos abiertos en la punta.' },
      { type: 'harvest', crop: 'olivo', n: 8, host: H('Olivarero', HUERTA), text: 'En el sur de la comarca crecen olivos. Recoge las aceitunas para la almazara.' },
      { type: 'quiz' },
    ] },
  { id: 'irulegi', name: 'Irulegi', mapName: 'Laquidáin / Lakidain', comarca: 'pamplona', family: 'central', relief: 'hilltop', size: 16,
    river: null,
    intro: 'Monte del valle de Aranguren, junto a Pamplona. En la cima hay ruinas de un castillo medieval y de un poblado de los vascones de hace más de 2.000 años.',
    church: { name: 'Iglesia del pueblo', style: 'romanesque', text: 'Pequeña iglesia de piedra al pie del monte Irulegi.' },
    landmarks: [{ kind: 'dig', name: 'Poblado de Irulegi', text: 'Excavación del poblado de la Edad del Hierro donde apareció la mano de Irulegi en 2021.' }, { kind: 'ruin', name: 'Castillo de Irulegi', text: 'Ruinas de un castillo medieval en lo alto del monte. Desde aquí se ve toda la Cuenca de Pamplona.' }],
    missions: [
      { type: 'visit' },
      { type: 'dolmen', site: 'irulegi', title: 'La mano de Irulegi', host: H('Maite, arqueóloga', { shirt: '#c9a46a', vest: '#4a5a3a', pants: '#5a4a3a', hair: '#2a1a12', ponytail: true, female: true, hat: 'straw' }) },
      { type: 'quiz' },
    ] },
  { id: 'sanguesa', name: 'Sangüesa / Zangoza', comarca: 'sanguesa', family: 'central', relief: 'plain', size: 70,
    river: { name: 'Aragón', x: 70, w: 8, amp: 6 },
    intro: 'Ciudad del Camino de Santiago junto al río Aragón, con la portada románica de Santa María la Real.',
    church: { name: 'Santa María la Real', style: 'romanesque', text: 'Su portada románica está llena de figuras talladas en piedra. ¡Es como un libro de piedra!' },
    landmarks: [{ kind: 'palace', name: 'Palacio del Príncipe de Viana', text: 'Antiguo palacio de los reyes de Navarra, hoy casa de cultura.' }, { kind: 'bridge', name: 'Puente sobre el Aragón', text: 'Por aquí entran en Navarra los peregrinos del Camino aragonés.' }],
    missions: [
      { type: 'visit' },
      { type: 'harvest', crop: 'pocha', n: 8, host: H('Hortelano', HUERTA), text: 'La pocha de Sangüesa es una alubia blanca que se come tierna. Recoge las vainas.' },
      { type: 'race', kind: 'camino', title: 'El Camino aragonés', host: H('Peregrino', { shirt: '#8a6d4a', pants: '#3a3530', hair: '#bdb6aa', beard: '#bdb6aa', staff: true }), text: 'Sigue las conchas del Camino por la ciudad.' },
      { type: 'quiz' },
    ] },
  // ---------------- Tierra Estella ----------------
  { id: 'estella', name: 'Estella-Lizarra', comarca: 'tierra-estella', family: 'central', relief: 'valley', size: 90,
    river: { name: 'Ega', x: 0, w: 6, amp: 8 },
    intro: 'La "Estella la bella" del Camino de Santiago: palacios románicos, puentes y calles de la Rúa.',
    church: { name: 'San Pedro de la Rúa', style: 'romanesque', text: 'Iglesia románica en lo alto de una escalinata, con un claustro de columnas talladas.' },
    landmarks: [{ kind: 'palace', name: 'Palacio de los Reyes de Navarra', text: 'Uno de los pocos palacios románicos civiles de España, del siglo XII.' }, { kind: 'bridge', name: 'Puente de la Cárcel', text: 'Puente de un arco muy alto sobre el Ega.' }, { kind: 'fountain', name: 'Fuente del vino (Irache)', text: 'Muy cerca, en el monasterio de Irache, los peregrinos encuentran una fuente de la que sale vino y agua.' }, { kind: 'chapel', name: 'San Pedro de la Rúa', text: 'Iglesia románica en lo alto de una gran escalinata. Su claustro tiene capiteles tallados que cuentan historias.' }],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'paloki', title: 'Los palokis', host: H('Amaia', { shirt: '#b34fc4', skirt: '#34495e', pants: '#f3cfb3', hair: '#1f1712', braids: true, height: 1.3 }), text: 'Los palokis elevan telas con un aro y parecen gigantes. Búscalos en el carnaval.' },
      { type: 'harvest', crop: 'piquillo', n: 8, host: H('Agricultor de Lodosa', HUERTA), text: 'El pimiento del piquillo se asa y se pela a mano. Recoge los pimientos rojos.' },
      { type: 'quiz' },
      { type: 'observe', species: ['milano', 'buitre', 'aguila'], n: 3, title: 'Las colas de tijera', host: H('Unai, anillador de aves', { shirt: '#6b8fb3', vest: '#3f5530', pants: '#3a3530', hair: '#2a1a12', glasses: '#3a2a1a', bag: '#8a6a3a' }),
        story: ['¿Ves esa ave rojiza que gira y gira sobre los tejados? Parece que dibuja en el cielo con una tijera abierta.', 'Es el milano real. Mueve la cola ahorquillada como el timón de un barco. En invierno llegan muchos del norte de Europa y duermen juntos en los mismos árboles.', 'Los que estudiamos las aves les ponemos un anillo en la pata para saber adónde viajan. Ayúdame a contarlos.'],
        text: 'Observa las rapaces que vuelan sobre Tierra Estella: el milano real, el buitre y el águila.',
        hint: 'El milano vuela bajo, sobre el pueblo y los campos. Fíjate en su cola en forma de V.', outro: '¡Qué bien! El milano real está protegido: contar cuántos hay nos ayuda a cuidarlo.' },
    ] },
  { id: 'viana', name: 'Viana', comarca: 'tierra-estella', family: 'central', relief: 'hilltop', size: 55,
    river: null,
    intro: 'Última villa navarra del Camino de Santiago, en lo alto de una loma rodeada de viñedos.',
    church: { name: 'Iglesia de Santa María', style: 'gothic', text: 'Gran iglesia gótica con portada renacentista. Delante está enterrado César Borgia.' },
    landmarks: [{ kind: 'ruin', name: 'Ruinas de San Pedro', text: 'Restos de una iglesia medieval convertida en jardín.' }, { kind: 'stone', name: 'Tumba de César Borgia', text: 'César Borgia, un capitán muy famoso de Italia, murió luchando cerca de Viana en 1507. Su tumba está a la entrada de la iglesia de Santa María.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'tonelero', title: 'El tonelero', host: H('Javier, tonelero', { shirt: '#c9b99a', apron: '#6b4a2e', pants: '#3a3530', hair: '#4a3020', moustache: '#4a3020' }) },
      { type: 'harvest', crop: 'uva', n: 10, host: H('Vendimiadora', VITI), text: 'En otoño se vendimia: se cortan los racimos de uva para hacer vino.' },
      { type: 'process', id: 'wine', title: 'El viaje de la uva', host: H('Bodeguero', { ...VITI, hat: null }), product: 'Vino de Navarra',
        text: 'La uva se lleva a la bodega, se estruja y fermenta.', steps: ['Vendimiar los racimos', 'Despalillar y estrujar', 'Fermentar el mosto', 'Criar el vino en barricas'] },
      { type: 'quiz' },
    ] },
  // ---------------- Valdizarbe-Novenera ----------------
  { id: 'puente-la-reina', name: 'Puente la Reina / Gares', comarca: 'valdizarbe-novenera', family: 'central', relief: 'hills', size: 60,
    river: { name: 'Arga', x: 0, w: 7, amp: 6, bigBridge: true },
    intro: 'Aquí se juntan los caminos de Santiago y se cruza el Arga por un famoso puente románico de seis arcos.',
    church: { name: 'Iglesia del Crucifijo', style: 'romanesque', text: 'Guarda un crucifijo gótico con forma de Y, traído según la tradición por peregrinos.' },
    landmarks: [{ kind: 'bridge', name: 'Puente románico', text: 'Mandado construir en el siglo XI para los peregrinos. Tiene seis arcos de piedra.' }, { kind: 'chapel', name: 'Iglesia del Crucifijo', text: 'La iglesia de los peregrinos guarda un crucifijo muy especial: la cruz tiene forma de Y, como las ramas de un árbol.' }],
    missions: [
      { type: 'visit' },
      { type: 'race', kind: 'camino', title: 'Los caminos se juntan', host: H('Peregrina', { shirt: '#3a8fd6', pants: '#3a3530', hair: '#c9772f', bun: true, staff: true }), text: 'Sigue las flechas amarillas hasta el puente.' },
      { type: 'trade', kind: 'cantero', title: 'El cantero', host: H('Cantero', { shirt: '#c9b99a', apron: '#8a7a5e', pants: '#6b5a48', hair: '#bdb6aa', moustache: '#bdb6aa' }), text: 'Los canteros tallaban los sillares de los puentes. Golpea con el cincel en el momento justo.' },
      { type: 'harvest', crop: 'uva', n: 8, host: H('Viticultor', VITI), text: 'Los viñedos rodean el pueblo. Vendimia los racimos.' },
      { type: 'quiz' },
    ] },
  { id: 'artajona', name: 'Artajona', comarca: 'valdizarbe-novenera', family: 'central', relief: 'hilltop', size: 45,
    river: null,
    intro: 'Villa con el Cerco, un recinto amurallado medieval con torres, y dólmenes muy antiguos cerca.',
    church: { name: 'Iglesia de San Saturnino', style: 'fortress', text: 'Iglesia-fortaleza gótica dentro del Cerco, con su gran torre.' },
    landmarks: [{ kind: 'walls', name: 'El Cerco de Artajona', text: 'Muralla medieval que conserva nueve torreones. Protegía a los vecinos en tiempos de guerra.' }, { kind: 'dolmen', name: 'Dolmen del Portillo de Enériz', text: 'Los dólmenes son tumbas de piedra de hace más de 4000 años.' }],
    missions: [
      { type: 'visit' },
      { type: 'trade', kind: 'panadero', title: 'El horno del pueblo', host: H('Pili, panadera', { shirt: '#ffffff', apron: '#e8dcc0', pants: '#3a3530', hair: '#6b3b1f', bun: true }) },
      { type: 'harvest', crop: 'trigo', n: 8, host: H('Agricultor', HUERTA), text: 'En la Navarra media se cultiva mucho cereal. Recoge las gavillas de trigo.' },
      { type: 'carnival', character: 'comparsa-mendigorria', title: 'La comparsa de la Novenera', host: H('Joven de la comparsa', { shirt: '#e03c3c', pants: '#34495e', hair: '#2e2018' }), text: 'En Mendigorria, muy cerca, el carnaval rural reúne figuras de otros pueblos. Encuéntralas.' },
      { type: 'quiz' },
    ] },
  // ---------------- Zona Media ----------------
  { id: 'tafalla', name: 'Tafalla', comarca: 'zona-media', family: 'central', relief: 'plain', size: 85,
    river: { name: 'Cidacos', x: 60, w: 4, amp: 6 },
    intro: 'Ciudad de la Zona Media con plaza porticada, iglesias con retablos y el carnaval del coronel Lagunero.',
    church: { name: 'Iglesia de Santa María', style: 'gothic', text: 'Guarda un gran retablo del escultor Juan de Anchieta.' },
    landmarks: [{ kind: 'plaza', name: 'Plaza de Navarra', text: 'Plaza porticada donde se celebran fiestas y mercados.' }],
    missions: [
      { type: 'visit' },
      { type: 'carnival', character: 'lagunero', title: 'El coronel Lagunero', host: H('Nerea', { shirt: '#3ca05a', skirt: '#34495e', pants: '#f3cfb3', hair: '#6b3b1f', bun: true, height: 1.3 }), text: 'El carnaval de Tafalla termina con el muñeco del coronel Lagunero. ¡Encuéntralo antes de la quema!' },
      { type: 'process', id: 'olive', title: 'Del olivo a la almazara', host: H('Almazarero', HUERTA), product: 'Aceite de oliva',
        text: 'Las aceitunas se muelen en la almazara para sacar el aceite.', gather: { item: 'olive', n: 6, label: 'Recoger aceitunas', near: 'fields' },
        steps: ['Recoger las aceitunas', 'Lavarlas', 'Molerlas en la almazara', 'Separar el aceite'] },
      { type: 'quiz' },
    ] },
  { id: 'javier', name: 'Javier / Xabier', comarca: 'sanguesa', family: 'central', relief: 'hills', size: 18,
    river: null,
    intro: 'Pequeño pueblo junto a la frontera con Aragón, famoso por su castillo: aquí nació San Francisco Javier en 1506.',
    church: { name: 'Basílica de Javier', style: 'gothic', text: 'Basílica neogótica levantada junto al castillo entre finales del siglo XIX y principios del XX.' },
    landmarks: [{ kind: 'castle', style: 'javier', name: 'Castillo de Javier', text: 'Fortaleza de piedra dorada sobre una peña. Su torre más antigua y alta es la de San Miguel.' }],
    missions: [
      { type: 'visit' },
      { type: 'castle', castle: 'javier' },
      { type: 'race', kind: 'romeria', title: 'La Javierada', host: H('Peregrina', { shirt: '#3a8fd6', vest: '#2b3a4a', pants: '#3a3530', hair: '#6b3b1f', ponytail: true, female: true, staff: true }),
        text: 'A principios de marzo, miles de personas caminan desde Pamplona y desde toda Navarra hasta el castillo de Javier: es la Javierada. Sigue el camino de los peregrinos hasta la basílica.' },
      { type: 'quiz' },
    ] },
  { id: 'ujue', name: 'Ujué / Uxue', comarca: 'zona-media', family: 'central', relief: 'hilltop', size: 32,
    river: null,
    intro: 'Pueblo medieval en lo alto de un cerro, con su iglesia-fortaleza y famosas almendras garrapiñadas.',
    church: { name: 'Santuario de Santa María de Ujué', style: 'fortress', text: 'Iglesia-fortaleza románica y gótica. En su altar se guardaba el corazón del rey Carlos II.' },
    landmarks: [{ kind: 'lookout', name: 'Mirador de Ujué', text: 'Desde lo alto se ven los Pirineos, las Bardenas y el Moncayo.' }],
    missions: [
      { type: 'visit' },
      { type: 'race', kind: 'romeria', title: 'La romería de Ujué', host: H('Romero', { shirt: '#1a1a1a', pants: '#1a1a1a', hair: '#bdb6aa', staff: true }), text: 'Cada primavera muchas personas suben andando a Ujué desde los pueblos de la Ribera. Sube por el camino antes de que suenen las campanas.' },
      { type: 'harvest', crop: 'almendra', n: 8, host: H('Confitera', { shirt: '#b5485d', apron: '#ffffff', skirt: '#4a3b35', pants: '#4a3b35', hair: '#dcd7cf', old: true, bun: true }), text: 'Con las almendras se preparan las garrapiñadas de Ujué, con azúcar caramelizado.' },
      { type: 'quiz' },
    ] },
  { id: 'olite', name: 'Olite / Erriberri', comarca: 'zona-media', family: 'central', relief: 'plain', size: 60,
    river: { name: 'Cidacos', x: 110, w: 3.5, amp: 5 },
    intro: 'Villa del Palacio Real de los reyes de Navarra, un castillo de cuento con muchas torres, rodeada de viñedos.',
    church: { name: 'Santa María la Real', style: 'gothic', text: 'Iglesia gótica junto al palacio, con una portada muy decorada.' },
    landmarks: [{ kind: 'castle', name: 'Palacio Real de Olite', text: 'Construido sobre todo por el rey Carlos III el Noble a principios del siglo XV. Tenía jardines colgantes, una leonera y muchas torres.' }, { kind: 'house', name: 'Galerías medievales', text: 'Bajo las calles de Olite hay galerías de piedra con bóvedas, de la Edad Media. Se usaban como almacenes y bodegas.' }],
    missions: [
      { type: 'visit' },
      { type: 'harvest', crop: 'uva', n: 10, host: H('Vendimiador', VITI), text: 'Olite es tierra de vino. Vendimia los racimos del viñedo.' },
      { type: 'tradition', kind: 'song', title: 'Los trovadores de la corte', host: H('Trovadora', { shirt: '#6d3b5c', skirt: '#f2c230', pants: '#f2c230', hair: '#c9772f', longHair: true }), text: 'En la corte del rey sonaba la música. Repite la melodía.' },
      { type: 'quiz' },
      { type: 'observe', species: ['grulla', 'ciguena', 'milano'], n: 4, title: 'Las viajeras del cielo', host: H('Ainhoa, guía de Pitillas', { shirt: '#3a8fd6', vest: '#3f5530', pants: '#3a3530', hair: '#3b2418', ponytail: true, female: true, bag: '#8a6a3a' }),
        story: ['Escucha… ¿oyes ese «krrruuu, krrruuu» que llega desde muy arriba? Son las grullas.', 'Cada otoño y cada febrero, miles de grullas cruzan Navarra en su viaje entre el norte de Europa y el sur. Vuelan en forma de V para cansarse menos: la de delante corta el aire a las demás.', 'Muchas descansan en la Laguna de Pitillas, aquí al lado. Y en las torres de las iglesias viven las cigüeñas, que vuelven cada primavera a su mismo nido.'],
        text: 'Encuentra con los prismáticos las grullas que pasan en V, las cigüeñas y el milano real.',
        hint: 'Las grullas cruzan el cielo en V, muy altas. Las cigüeñas dan vueltas sobre el pueblo.', outro: '¡Qué suerte! Ver pasar las grullas es una de las cosas más bonitas del invierno navarro.' },
    ] },
  // ---------------- Ribera Alta ----------------
  { id: 'marcilla', name: 'Marcilla', comarca: 'ribera-alta', family: 'ribera', relief: 'plain', size: 40,
    river: { name: 'Aragón', x: 75, w: 6, amp: 6 },
    intro: 'Villa de la Ribera junto al río Aragón, con un castillo del siglo XV rodeado de foso: el único que se libró de los derribos de 1516.',
    church: { name: 'Iglesia parroquial', style: 'baroque', text: 'La parroquia de la villa, de ladrillo y piedra, como muchas de la Ribera.' },
    landmarks: [{ kind: 'castle', name: 'Castillo de Marcilla', text: 'Castillo-palacio del siglo XV con foso, torres y almenas. Lo defendió Ana de Velasco en 1516.' }],
    missions: [
      { type: 'visit' },
      { type: 'castle', castle: 'marcilla' },
      { type: 'harvest', crop: 'esparrago', n: 8, host: H('Esparraguera', HUERTA), text: 'En las vegas del río Aragón y del Ebro se cultivan espárragos. Se recogen muy temprano, antes de que les dé el sol.' },
      { type: 'quiz' },
    ] },
  // ---------------- Ribera ----------------
  { id: 'tudela', name: 'Tudela', comarca: 'ribera', family: 'ribera', relief: 'plain', size: 120,
    river: { name: 'Ebro', x: 120, w: 14, amp: 10, bigBridge: true },
    intro: 'Capital de la Ribera junto al Ebro: catedral, plaza de los Fueros y una huerta famosa.',
    church: { name: 'Catedral de Santa María', style: 'cathedral', text: 'Su Puerta del Juicio tiene más de cien grupos de figuras de piedra.' },
    landmarks: [{ kind: 'kiosk', name: 'Plaza de los Fueros', text: 'Plaza con kiosco donde se celebra la Bajada del Ángel el Domingo de Resurrección.' }, { kind: 'bridge', name: 'Puente sobre el Ebro', text: 'Un largo puente medieval de muchos arcos cruza el Ebro.' }, { kind: 'house', name: 'Casa del Almirante', text: 'Palacio del siglo XVI con una fachada llena de figuras talladas en piedra.' }],
    missions: [
      { type: 'visit' },
      { type: 'harvest', crop: 'alcachofa', n: 10, host: H('Hortelano de Tudela', HUERTA), text: 'La alcachofa de Tudela es un tesoro de la huerta. Se cortan las cabezas cuando están cerradas.' },
      { type: 'carnival', character: 'zipotero', title: 'Los zipoteros', host: H('Iker', { shirt: '#f2c230', pants: '#34495e', hair: '#2e2018', messy: true, height: 1.4 }), text: 'Los zipoteros llevan la cara tapada y reparten caramelos. ¡Encuéntralos!' },
      { type: 'tradition', kind: 'angel', title: 'La Bajada del Ángel', host: H('Organizadora', { shirt: '#ffffff', skirt: '#3a8fd6', pants: '#3a8fd6', hair: '#c9772f', bun: true }), text: 'Un niño vestido de ángel baja colgado de una cuerda hasta la Virgen en la plaza. Repite la secuencia para prepararlo.' },
      { type: 'quiz' },
      { type: 'observe', species: ['ciguena', 'grulla', 'milano'], n: 3, title: 'Las cigüeñas de la catedral', host: H('Javier, sacristán', { shirt: '#2b2630', pants: '#2b2630', hair: '#bdb6aa', glasses: '#3a2a1a', old: true }),
        story: ['Cuando era pequeño, mi abuelo me decía: «Por San Blas, la cigüeña verás». Y cada febrero, sin fallar, aparecían sobre las torres de Tudela.', 'Hacen nidos tan grandes que pesan como un piano, con ramas que traen del río Ebro. Y cuando se saludan, castañetean el pico: tac-tac-tac, como un tambor.', 'Sube la vista, que hoy vuelan muchas sobre la ciudad. Anota tres en tu cuaderno.'],
        text: 'Observa las cigüeñas blancas que vuelan sobre Tudela y las demás aves de la Ribera.',
        hint: 'Las cigüeñas planean en círculos sobre la catedral y la plaza.', outro: '«Por San Blas, la cigüeña verás»… ¡y tú has visto tres! La Ribera es su casa.' },
    ] },
  { id: 'cortes', name: 'Cortes', comarca: 'ribera', family: 'ribera', relief: 'plain', size: 45,
    river: { name: 'Canal Imperial de Aragón', x: 70, w: 4, amp: 2 },
    intro: 'El pueblo más al sur de Navarra, con un castillo-palacio y el Canal Imperial de Aragón.',
    church: { name: 'Iglesia de San Miguel', style: 'baroque', text: 'Parroquia de ladrillo de la villa.' },
    landmarks: [{ kind: 'castle', name: 'Castillo de Cortes', text: 'Castillo medieval convertido en palacio, con torres y patio.' }],
    missions: [
      { type: 'visit' },
      { type: 'harvest', crop: 'tomate', n: 10, host: H('Hortelano', HUERTA), text: 'En las huertas regadas por el canal crecen tomates y pimientos.' },
      { type: 'process', id: 'piquillo', title: 'El pimiento y la conserva', host: H('Conservera', { shirt: '#ffffff', apron: '#c0392b', skirt: '#4a3b35', pants: '#4a3b35', hair: '#1f1712', bun: true }), product: 'Pimientos en conserva',
        text: 'La Ribera es tierra de conserveras.', gather: { item: 'pepper', n: 5, label: 'Recoger pimientos', near: 'fields' },
        steps: ['Recoger los pimientos maduros', 'Asarlos', 'Pelarlos a mano sin agua', 'Envasarlos en latas'] },
      { type: 'quiz' },
    ] },
];

export const levelById = id => LEVELS.find(l => l.id === id);

// Subir al monte del pueblo: cada misión usa los datos reales de la cima (altitud, desnivel, ruta y terreno)
const SUMMITS = {
  etxalar: 'aizkolegi', zugarramurdi: 'arxuria', 'amaiur-maya-del-baztan': 'gorramendi', ituren: 'mendaur', leitza: 'ttutturre',
  'orreaga-roncesvalles': 'lindus', aribe: 'orzanzurieta', 'isaba-izaba': 'mesa', 'erronkari-roncal': 'lakora', 'altsasu-alsasua': 'beriain',
  irurtzun: 'erga', pamplona: 'ezkaba', aoiz: 'izaga', lumbier: 'arangoiti', estella: 'montejurra', tafalla: 'unzue',
};
const GUIDES = [
  H('Josu, montañero', { shirt: '#d9532a', vest: '#2b3a4a', pants: '#3a3530', hair: '#4a3020', beard: '#4a3020', bag: '#3a7a4a', staff: true }),
  H('Amaia, guía de montaña', { shirt: '#3a8fd6', vest: '#2b3a4a', pants: '#3a3530', hair: '#3b2418', ponytail: true, female: true, bag: '#d9532a', staff: true }),
];
for (const l of LEVELS) { const id = SUMMITS[l.id]; if (id && l.missions) l.missions.push({ type: 'summit', peak: id, host: GUIDES[l.id.length % 2] }); }

// Partidos en el frontón: pelota a mano, el deporte de las plazas navarras
const PELOTA_TOWNS = { tafalla: 'Unai, pelotari', leitza: 'Aitor, pelotari', lesaka: 'Mikel, pelotari', sanguesa: 'Iñaki, pelotari', 'puente-la-reina': 'Ane, pelotari', marcilla: 'Oihane, pelotari' };
const PELOTA_STORY = [
  'Casi todos los pueblos de Navarra tienen un frontón, muchas veces pegado a la iglesia o en la plaza. Aquí se juega a pelota desde hace siglos.',
  'En la pelota a mano no hay raqueta: se golpea con la mano desnuda, protegida con tacos. La pelota es de cuero, dura como una piedra.',
];
for (const [id, who] of Object.entries(PELOTA_TOWNS)) {
  const l = LEVELS.find(x => x.id === id); if (!l?.missions) continue;
  const girl = /^(Ane|Oihane)/.test(who);
  l.missions.push({ type: 'pelota', title: 'Partido en el frontón', story: PELOTA_STORY, host: H(who, { shirt: '#ffffff', pants: '#ffffff', sash: girl ? '#3a8fd6' : '#d42f2f', hair: '#2a1a12', ponytail: girl, female: girl }),
    text: 'La pelota vasca se juega en frontones de plaza. Gana tu primer partido a 5 tantos.' });
}

// Personajes de Navarra: música, deporte, ciencia, viajes, gobierno y mujeres que abrieron camino
for (const [id, list] of Object.entries(FIGURE_TOWNS)) {
  const l = LEVELS.find(x => x.id === id); if (!l?.missions) continue;
  const at = l.missions.findIndex(m => m.type === 'quiz');
  list.forEach((who, k) => { const F = PERSONAJES[who]; l.missions.splice((at < 0 ? l.missions.length : at) + k, 0, { type: 'figure', who, title: F.name, host: F.host }); });
}

// Ferias de ganado: el mercado del campo en otoño (compra, venta, concurso y trato con apretón de manos)
for (const [id, F] of Object.entries(FERIA_TOWNS)) {
  const l = LEVELS.find(x => x.id === id); if (!l?.missions) continue;
  const at = l.missions.findIndex(m => m.type === 'quiz');
  l.missions.splice(at < 0 ? l.missions.length : at, 0, { type: 'feria', title: F.title, note: F.note,
    host: H('Tratante de ganado', { shirt: '#1d1d24', pants: '#2b2630', txapela: '#1d1d24', hair: '#8a8478', moustache: '#8a8478', staff: true, old: true }) });
}

// Castillos: recorrer sus partes (Olite y Cortes; Javier y Marcilla la llevan en su ficha)
for (const id of ['olite', 'cortes']) {
  const l = LEVELS.find(x => x.id === id); if (!l?.missions) continue; const C = CASTLE_TOWNS[id];
  const at = l.missions.findIndex(m => m.type === 'quiz');
  l.missions.splice(at < 0 ? l.missions.length : at, 0, { type: 'castle', castle: id, host: H(C.host.name, C.host.look) });
}
for (const l of LEVELS) for (const m of l.missions || []) if (m.type === 'castle' && !m.host) { const C = CASTLE_TOWNS[m.castle]; m.host = H(C.host.name, C.host.look); }

// Miradores: un punto alto del pueblo desde el que se aprenden los montes con los prismáticos
const MIRADOR_HOSTS = [H('Edurne, montañera', { shirt: '#d9532a', vest: '#2b3a4a', pants: '#3a3530', hair: '#4a3020', ponytail: true, female: true, staff: true }), H('Koldo, guarda forestal', { shirt: '#5a6a3a', vest: '#3a4a2a', pants: '#3a3530', hair: '#2a1a12', hat: 'straw', staff: true })];
for (const [id, nm] of Object.entries(MIRADOR_TOWNS)) {
  const l = LEVELS.find(x => x.id === id); if (!l?.missions) continue;
  if (!(l.landmarks || []).some(x => x.kind === 'lookout' || x.kind === 'pass')) (l.landmarks ||= []).push({ kind: 'lookout', name: nm || 'Mirador de ' + l.name.split(' /')[0], text: id === 'pamplona' ? 'Sobre la muralla, junto a la catedral: desde aquí se ven el río Arga, la Cuenca de Pamplona y los montes que la rodean.' : 'Desde este punto alto se ven los montes que rodean el pueblo. Con los prismáticos se pueden reconocer uno a uno.', ...(id === 'pamplona' ? { x: 96, z: -236 } : {}) });
  const at = l.missions.findIndex(m => m.type === 'quiz');
  l.missions.splice(at < 0 ? l.missions.length : at, 0, { type: 'mirador', host: MIRADOR_HOSTS[l.id.length % 2] });
}

// El dolmen: los primeros pastores y agricultores (Neolítico); excavar con cuidado y ordenar cómo se levantaba
for (const id of DOLMEN_TOWNS) {
  const l = LEVELS.find(x => x.id === id); if (!l?.missions) continue;
  const at = l.missions.findIndex(m => m.type === 'quiz');
  l.missions.splice(at < 0 ? l.missions.length : at, 0, { type: 'dolmen', title: 'El secreto del dolmen',
    host: H('Ainhoa, arqueóloga', { shirt: '#c9a46a', vest: '#4a5a3a', pants: '#5a4a3a', hair: '#3b2418', ponytail: true, female: true, hat: 'straw', bag: '#7a5a3a' }) });
}
