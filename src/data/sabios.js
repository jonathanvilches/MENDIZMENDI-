// Sabios y sabias del pueblo: junto a cada lugar histórico hay alguien mayor que conoce su historia y la explica.
// Además del texto del lugar, cuentan en qué fijarse según el estilo o el tipo de monumento.
export const SABIOS = [
  { name: 'Sabia Miren', female: true }, { name: 'Sabio Patxi' }, { name: 'Sabia Josefa', female: true }, { name: 'Sabio Fermín' },
  { name: 'Sabia Maritxu', female: true }, { name: 'Sabio Joxe' }, { name: 'Sabia Pilar', female: true }, { name: 'Sabio Ramón' },
];
export const STYLE_TIP = {
  romanesque: 'Es románica: muros gruesos, ventanas pequeñas y arcos redondos, de medio punto. Por dentro suele ser oscura y recogida.',
  gothic: 'Es gótica: los arcos acaban en punta, las paredes son más altas y tienen ventanales con vidrieras para que entre mucha luz.',
  baroque: 'Es barroca: mira la decoración, con curvas, columnas retorcidas y retablos dorados llenos de figuras.',
  fortress: 'Es una iglesia-fortaleza: además de templo, servía para defenderse. Fíjate en sus muros altos y casi sin ventanas.',
  cathedral: 'Es una catedral: la iglesia principal de una diócesis, donde está la silla del obispo, la «cátedra».',
};
export const KIND_TIP = {
  bridge: 'Los puentes de piedra se hacían con arcos: cada piedra empuja a la de al lado y así aguantan siglos.',
  castle: 'Fíjate en las almenas, las saeteras y la torre más alta: todo estaba pensado para defenderse.',
  walls: 'Las murallas protegían el pueblo. Por la noche se cerraban las puertas y nadie podía entrar.',
  palace: 'Mira el escudo de la fachada: cuenta qué familia vivía aquí.',
  house: 'Mira el escudo y los aleros: las casas grandes contaban quién vivía en ellas.',
  towerhouse: 'Las casas-torre eran casas fuertes de familias importantes, con muros gruesos para defenderse.',
  dolmen: 'Las losas pesan toneladas y se movieron sin máquinas, con cuerdas, troncos y mucha gente.',
  ruin: 'Aunque solo queden piedras, cada muro nos cuenta cómo era el lugar. ¡Imagina cómo sería entero!',
  chapel: 'Las ermitas están a las afueras o en lo alto: allí se va en romería en los días de fiesta.',
  cross: 'Las cruces de piedra marcaban caminos y cruces de caminos para que nadie se perdiera.',
  mill: 'El agua del río movía la rueda y la rueda movía las piedras que molían el grano.',
  monolith: 'Las piedras grandes se levantaban para recordar algo importante.',
  lookout: 'Desde aquí se ve muy lejos: fíjate en los montes y los pueblos del horizonte.',
  pass: 'Este paso entre montañas fue camino de pastores, peregrinos, comerciantes y ejércitos.',
  tunnel: 'Por aquí pasaba el tren. Hoy es un camino para ir andando o en bici.',
  horreo: 'El hórreo guardaba el grano en alto, sobre pilares, para que no entraran los ratones ni la humedad.',
  stelae: 'Las estelas son piedras con dibujos que se ponían en las tumbas.',
  cave: 'En las cuevas vivieron personas hace miles de años y también nacen muchas leyendas.',
  dig: 'Los arqueólogos excavan capa a capa: lo más antiguo está más abajo.',
  palomeras: 'Las redes de las palomeras se usan desde hace siglos para cazar palomas en otoño.',
  townhall: 'En el ayuntamiento se reúnen los concejales para decidir lo que necesita el pueblo.',
};
// lugares que no son «históricos» (no llevan sabio)
export const NO_SABIO = new Set(['plaza', 'fountain', 'kiosk', 'raft', 'gorge', 'rocks']);
