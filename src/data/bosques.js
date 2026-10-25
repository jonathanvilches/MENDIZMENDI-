// Bosques y selvas de Navarra: mundos de monte con un claro (la ermita, la borda o el palacio) y sus misiones.
// Datos: Turismo de Navarra, Gobierno de Navarra (parques naturales y reservas) y las guías de cada bosque, resumidos
// para niños y niñas. Los personajes y sus diálogos son ficción del juego.
// bosque: la clase de monte (src/levels/town.js, BOSQUE) · lat, lon: su punto en el mapa (no son núcleos de población)
// leg (en una leyenda): el relato propio del bosque, con la criatura de siempre (data/legends.js)
const H = (name, look) => ({ name, look });
const GUARDA = { shirt: '#4f6b3a', vest: '#3f5530', pants: '#3f4a33', hair: '#2a1a12', bag: '#8a6a3a' };
const GUARDESA = { ...GUARDA, hair: '#6b3b1f', bun: true, female: true };
const PASTOR = { txapela: '#1d1d24', shirt: '#efe9dc', vest: '#2d2b33', pants: '#3a3530', staff: true, hair: '#d6d0c6', moustache: '#ece8e0', old: true };
const AMONA = { shirt: '#3d3350', skirt: '#2a2440', pants: '#2a2440', hair: '#dcd7cf', old: true, bun: true, female: true, staff: true };
const ARQUEO = { shirt: '#c9a46a', vest: '#4a5a3a', pants: '#5a4a3a', hair: '#3b2418', ponytail: true, female: true, hat: 'straw', bag: '#7a5a3a' };

export const BOSQUES = [
  { id: 'selva-irati', name: 'Selva de Irati / Irati oihana', comarca: 'pirineo', family: 'pyrenean', relief: 'valley', size: 5, bosque: 'irati', lat: 42.99, lon: -1.15,
    river: { name: 'Urtxuria', x: 72, w: 3.2, amp: 7 },
    intro: 'Uno de los hayedos-abetales más grandes y mejor conservados de Europa, entre los valles de Aezkoa y Salazar: hayas y abetos viejos, ríos, niebla y musgo.',
    church: { name: 'Ermita de la Virgen de las Nieves', style: 'ermita', label: 'Ermita', text: 'Ermita de piedra junto al río, en el lugar llamado Casas de Irati. Muy cerca están las casas de los guardas y el centro de información del bosque.' },
    landmarks: [
      { kind: 'bigtree', tree: 'beech', name: 'Haya centenaria', text: 'Algunas hayas de Irati tienen cientos de años. En otoño sus hojas se vuelven rojas y doradas y alfombran el suelo del bosque.' },
      { kind: 'ruin', name: 'Fábrica de armas de Orbaizeta', text: 'En el siglo XVIII, al borde de la selva, se fundía hierro para hacer armas y balas. El carbón salía de la madera del bosque. Hoy quedan sus ruinas entre los árboles.' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'observe', species: ['pito', 'ciervo', 'corzo', 'ardilla'], n: 4, title: 'El tambor del bosque', host: H('Itziar, guarda forestal', GUARDESA),
        story: ['Irati es uno de los hayedos-abetales más grandes de Europa. Aquí viven animales que necesitan bosques viejos y tranquilos.', 'Escucha: toc-toc-toc-toc. Es el pito negro, un pájaro carpintero grande y negro con un gorro rojo. Sus agujeros en los troncos sirven luego de casa a otros animales.', 'En septiembre los ciervos braman tan fuerte que se oyen en todo el valle: es la berrea.'],
        text: 'Busca con los prismáticos a cuatro habitantes de la selva: el pito negro, el ciervo, el corzo o la ardilla roja.',
        hint: 'Camina despacio por las sendas. El pito negro está pegado a los troncos de las hayas.', outro: '¡Ojos de guarda! En un bosque viejo y sano viven muchos animales escondidos.' },
      { type: 'legend', who: 'basajaun', title: 'El Basajaun de Irati',
        leg: {
          teller: { name: 'Amona Joxepa, pastora', look: AMONA },
          story: [
            'Siéntate aquí, en esta piedra con musgo. En Irati hay hayas y abetos tan viejos que ya eran grandes cuando mi abuela era niña.',
            'Cuando baja la niebla y todo se queda en silencio, los pastores decimos que el Basajaun, el Señor del Bosque, sale a dar una vuelta.',
            'Es enorme y peludo, y camina con un bastón. No hace daño a nadie: cuida los rebaños y avisa con un grito cuando llega la tormenta.',
            'De día se esconde entre los troncos. Si esperas a la noche y sigues sus huellas, a lo mejor te deja verlo.',
          ],
          wait: 'Todavía es de día y el Basajaun duerme entre las hayas. Espera a que caiga la noche.',
          night: 'Ya ha bajado la niebla. ¿Ves esas huellas que brillan entre el musgo? Síguelas despacio y sin miedo.',
          clues: [
            { text: 'Una huella enorme en el barro. Tiene cinco dedos y es mucho más grande que tu pie.' },
            { text: 'En la corteza de un abeto hay pelos largos y oscuros. Huelen a musgo mojado.' },
            { text: 'Alguien ha apilado ramas secas para que un corderito perdido no pase frío.' },
            { text: 'Se oye un silbido largo entre la niebla… y el bosque entero se queda callado.' },
          ],
          meet: [
            'Hmmm… Pocas personas se atreven a entrar en Irati de noche. Tú lo has hecho con respeto.',
            'Este bosque es muy viejo. Si nadie lo corta ni lo ensucia, seguirá aquí cuando tú seas mayor.',
            'Cuenta mi historia y cuida el monte, como yo cuido los rebaños.',
          ],
          card: 'El Basajaun es el Señor del Bosque de la mitología vasca: grande, peludo y con bastón. Cuida los rebaños y avisa de las tormentas.',
        } },
      { type: 'trade', kind: 'aizkolari', title: 'Mástiles para los barcos', host: H('Patxi, aizkolari', { shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', hair: '#2a1a12', beard: '#2a1a12' }),
        text: 'Hace siglos, los abetos más altos y rectos de Irati se cortaban para hacer mástiles de barco, y los troncos bajaban por el río en almadías. Da cada hachazo en el momento justo.' },
      { type: 'quiz' },
    ] },
  { id: 'sierra-urbasa', name: 'Sierra de Urbasa', comarca: 'sakana', family: 'atlantic', relief: 'plain', size: 3, bosque: 'urbasa', lat: 42.83, lon: -2.16,
    intro: 'Una gran sierra de roca caliza con hayedos enormes y rasos, praderas abiertas donde pastan ovejas, vacas y caballos. Es parque natural junto con la sierra de Andia.',
    church: { name: 'Ermita de Santa Marina', style: 'ermita', label: 'Ermita', text: 'Ermita de la sierra, en la parte de Sakana. Cada año se sube a ella en romería.' },
    landmarks: [
      { kind: 'palace', name: 'Palacio de Urbasa', text: 'Lo mandó construir el marqués de Andía en el siglo XVII en mitad de un raso. Nadie de su familia llegó a vivir en él, y acabó sirviendo de refugio a los pastores.' },
      { kind: 'dolmen', name: 'Dolmen de Urbasa', text: 'En la sierra hay muchos dólmenes: tumbas de piedra que levantaron los primeros pastores hace unos 5.000 años.' },
      { kind: 'lookout', name: 'Balcón de Pilatos', x: 20, z: 238, text: 'Aquí la sierra se corta de golpe en un precipicio enorme. Abajo nace el río Urederra: el agua de lluvia que se cuela por las grietas de la caliza sale allí, de color turquesa.' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'herd', animal: 'sheep', n: 6, title: 'Antes de que baje la niebla', host: H('Mikel, pastor de Urbasa', PASTOR),
        story: ['En verano los pastores suben con sus ovejas latxas a los rasos de Urbasa y viven en txabolas, unas cabañas de piedra.', 'Con la leche de las latxas se hace el queso Idiazabal.', 'Pero en Urbasa la niebla llega de repente y lo tapa todo. ¡Hay que recoger el rebaño a tiempo!'],
        text: 'Lleva las ovejas al redil de la borda antes de que la niebla no deje ver nada.', outro: '¡Todas dentro! Con niebla, una oveja se puede perder en el hayedo.' },
      { type: 'dolmen', title: 'El secreto del dolmen', host: H('Ainhoa, arqueóloga', ARQUEO) },
      { type: 'legend', who: 'lamia', title: 'La lamia de la balsa',
        leg: {
          creature: 'Lamia de Urbasa', lair: 'pond',
          teller: { name: 'Aitona Iñaki, pastor', look: PASTOR },
          story: [
            'En Urbasa casi no hay ríos: el agua de la lluvia se cuela por las grietas de la roca y viaja por dentro de la sierra.',
            'Al pie del monte sale de golpe en el nacedero del Urederra, un agua tan limpia que se ve de color turquesa.',
            'Los pastores de antes contaban que en las fuentes y las balsas vivían las lamias, mujeres con pies de pato que se peinaban con un peine de oro.',
            'Dicen que de noche se acercan a la balsa del raso. Si encuentras sus peines… quizá aparezca alguna.',
          ],
          wait: 'Las lamias solo salen de noche. De día, la balsa es para las ovejas.',
          night: 'La luna brilla sobre la balsa. Mira: entre la hierba brilla algo dorado…',
          clues: [
            { text: 'Un peine de oro entre la hierba mojada. Tiene los dientes finos como agujas.' },
            { text: 'Huellas de pies de pato en el barro de la orilla.' },
            { text: 'Una canción muy suave sale del agua… y se apaga.' },
          ],
          meet: [
            '¿Has encontrado mis peines? Pocas personas suben al raso de noche.',
            'Cuidad el agua de la sierra: la que cae aquí es la que sale abajo, en el Urederra, y la que beben los pueblos.',
            'Quédate con esta historia. Y no ensucies nunca una fuente.',
          ],
          card: 'Las lamias son seres de la mitología vasca que viven en fuentes, ríos y cuevas. Se peinan con peines de oro y tienen pies de pato.',
        } },
      { type: 'mirador', title: 'El Balcón de Pilatos', host: H('Koldo, guarda forestal', { ...GUARDA, hat: 'straw', staff: true }) },
      { type: 'quiz' },
    ] },
  { id: 'sierra-aralar', name: 'Sierra de Aralar', comarca: 'larraun-leitzaldea', family: 'atlantic', relief: 'hilltop', size: 2, bosque: 'aralar', lat: 42.975, lon: -1.96,
    intro: 'Sierra de caliza con hayedos, pastos de verano y muchos dólmenes. En lo alto está el santuario de San Miguel, con más de mil años de historia.',
    church: { name: 'Santuario de San Miguel de Aralar', style: 'romanesque', label: 'Santuario', text: 'Santuario románico en lo alto de la sierra, a más de 1.300 metros. En su pared cuelgan unas cadenas que recuerdan la leyenda de Teodosio de Goñi.' },
    landmarks: [
      { kind: 'dolmen', name: 'Dolmen de Aralar', text: 'Por toda la sierra hay dólmenes, tumbas de piedra de los primeros pastores. El de Larrazpil es uno de los mejor conservados de Navarra.' },
      { kind: 'cave', name: 'La cueva del dragón', text: 'Cuenta la leyenda que en una cueva de la sierra vivía un dragón, el Herensuge. Dicen que junto al altar del santuario hay un agujero por el que se puede «escuchar al dragón».' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'legend', who: 'roldan', title: 'Las cadenas de Teodosio',
        leg: {
          creature: 'La sombra de Teodosio', clueKind: 'chain', color: '#ffd9a0', lair: 'cave',
          teller: { name: 'Aitona Martin, pastor', look: PASTOR },
          story: [
            'Hace más de mil años, un caballero llamado Teodosio de Goñi cometió un error terrible y quiso pedir perdón.',
            'Como castigo llevó unas cadenas de hierro muy pesadas y subió a vivir solo a esta sierra, entre hayas y niebla.',
            'Cuenta la leyenda que de una cueva salió un dragón, el Herensuge. Teodosio llamó a San Miguel, que venció al dragón, y las cadenas se rompieron.',
            'Dicen que en las noches de niebla todavía brillan los eslabones rotos… y se ve la sombra del caballero.',
          ],
          wait: 'De día solo se ven las hayas y los pastos. La niebla y los eslabones llegan con la noche.',
          night: 'Ya cae la niebla sobre Aralar. Busca los eslabones de la cadena que brillan en el bosque.',
          clues: [
            { text: 'Un eslabón de hierro, roto y oxidado. Pesa mucho para ser tan pequeño.' },
            { text: 'Otro eslabón, junto a una piedra con musgo. Parece que alguien lo arrastró.' },
            { text: 'El último eslabón, al lado de un hueco entre las rocas. Del hueco sale un aire frío…' },
          ],
          meet: [
            'Gracias por reunir mis cadenas. Las llevé mucho tiempo por esta sierra.',
            'Aprendí que equivocarse no es el final: lo importante es pedir perdón y hacerlo mejor.',
            'Sube un día al santuario: en su pared todavía cuelgan unas cadenas que recuerdan mi historia.',
          ],
          card: 'Según la leyenda, San Miguel venció al dragón de Aralar y rompió las cadenas de Teodosio de Goñi. En el santuario de San Miguel de Aralar cuelgan unas cadenas que lo recuerdan.',
        } },
      { type: 'dolmen', title: 'Los dólmenes de Aralar', host: H('Maddi, arqueóloga', { ...ARQUEO, hair: '#1f1712' }) },
      { type: 'observe', species: ['buitre', 'aguila', 'corzo', 'zorro'], n: 3, title: 'Las alas de Aralar', host: H('Garazi, guarda de la sierra', GUARDESA),
        story: ['Desde los pastos altos de Aralar se ven planear los buitres leonados. Aprovechan el aire caliente que sube por las laderas.', 'Más abajo, en el hayedo, se esconden el corzo y el zorro.'],
        text: 'Encuentra con los prismáticos tres animales de la sierra: el buitre leonado, el águila real, el corzo o el zorro.',
        hint: 'Mira al cielo para las aves y entre los árboles para los demás.', outro: '¡Muy bien! Has visto la sierra desde el cielo y desde el bosque.' },
      { type: 'quiz' },
    ] },
  { id: 'bosque-orgi', name: 'Bosque de Orgi / Orgiko basoa', comarca: 'pamplona', family: 'atlantic', relief: 'hills', size: 2, bosque: 'orgi', lat: 42.957, lon: -1.676,
    intro: 'Un robledal húmedo de unas 80 hectáreas en el valle de Ultzama, junto a Lizaso. Sus robles son muy viejos y sus sendas, llanas y fáciles.',
    church: { name: 'Centro de acogida del bosque', style: 'borda', label: 'Centro de acogida', text: 'A la entrada del bosque empieza la senda adaptada: un paseo de unos 2,6 kilómetros que también se puede hacer en silla de ruedas.' },
    landmarks: [
      { kind: 'bigtree', tree: 'oak', name: 'El roble viejo', text: 'Algunos robles de Orgi tienen cientos de años. Sus troncos están cubiertos de musgo y líquenes, y en sus huecos viven pájaros, murciélagos e insectos.' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'observe', species: ['ardilla', 'corzo', 'jabali', 'zorro'], n: 3, title: 'Vecinos del robledal', host: H('Unai, guía del bosque', GUARDA),
        story: ['Orgi es un robledal muy antiguo: un bosque de robles que crece en un suelo húmedo, con charcas y mucho musgo.', 'Las bellotas de los robles son la comida de muchos animales: jabalíes, ardillas, corzos y pájaros.'],
        text: 'Busca con los prismáticos tres animales del robledal: la ardilla roja, el corzo, el jabalí o el zorro.',
        hint: 'Mira cerca de las charcas y al pie de los robles, donde caen las bellotas.', outro: '¡Lo has visto todo! Un roble viejo da casa y comida a cientos de seres vivos.' },
      { type: 'trade', kind: 'cestero', title: 'La cesta de las setas', host: H('Maite, cestera', { shirt: '#b5485d', apron: '#ffffff', skirt: '#4a3b35', pants: '#4a3b35', hair: '#6b3b1f', bun: true, female: true }),
        text: 'En otoño los bosques de Ultzama se llenan de setas. Para llevarlas se usa una cesta de mimbre, que deja pasar el aire y no las aplasta. Y recuerda: nunca se come una seta que no conozca alguien que sepa mucho de setas.' },
      { type: 'race', kind: 'senda', title: 'La senda del robledal', host: H('Iñigo, corredor de montaña', { shirt: '#2fb276', pants: '#1a1a1a', hair: '#3b2418' }),
        text: 'Recorre la senda del bosque y pasa por los aros antes de que se acabe el tiempo.' },
      { type: 'quiz' },
    ] },
  { id: 'senorio-bertiz', name: 'Señorío de Bertiz / Bertizko jaurerria', comarca: 'bidasoa', family: 'atlantic', relief: 'valley', size: 3, bosque: 'bertiz', lat: 43.14, lon: -1.611,
    river: { name: 'Bidasoa', x: 75, w: 6, amp: 8 },
    intro: 'El primer parque natural de Navarra, entre Baztan y Malerreka: más de 2.000 hectáreas de hayas, robles y castaños, y un jardín histórico junto al río Bidasoa.',
    church: { name: 'Capilla del Señorío', style: 'ermita', label: 'Capilla', text: 'Capilla del siglo XVIII junto al palacio. Más tarde la reformaron en estilo modernista y así se ve hoy.' },
    landmarks: [
      { kind: 'palace', name: 'Palacio de Bertiz', text: 'Pedro Ciga y Dorotea Fernández arreglaron esta casa-palacio y crearon delante un jardín con más de 120 especies de árboles, arbustos y flores, con estanques y puentes.' },
      { kind: 'bigtree', tree: 'beech', name: 'El haya grande', text: 'Casi todo el Señorío es bosque: hayas, robles, castaños, avellanos, acebos y alisos. Desde que se protegió, los árboles han vuelto a crecer grandes y viejos.' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'observe', species: ['pito', 'corzo', 'ardilla', 'trucha'], n: 3, title: 'El bosque que volvió', host: H('Edurne, guarda del parque', GUARDESA),
        story: ['Hace más de cien años este bosque estaba muy cortado. Pedro Ciga y Dorotea Fernández compraron la finca y prohibieron talar los árboles.', 'Desde entonces el bosque ha vuelto a crecer y con él han vuelto los animales. En 1984 fue el primer parque natural de Navarra.'],
        text: 'Busca con los prismáticos tres animales del Señorío: el pito negro, el corzo, la ardilla roja o la trucha del río.',
        hint: 'Las truchas saltan en el Bidasoa; el pito negro, en los troncos de las hayas.', outro: '¡Genial! Cuando se cuida un bosque, los animales vuelven.' },
      { type: 'trade', kind: 'carbonero', title: 'Carbón para las ferrerías', host: H('Joxe Mari, carbonero', { shirt: '#4a4540', pants: '#2b2630', hair: '#2a2a2a', beard: '#2a2a2a', txapela: '#1d1d24' }),
        text: 'Antes, en los montes del Bidasoa se hacía carbón con la leña para las ferrerías, donde se trabajaba el hierro. Por eso se cortaban tantos árboles. Aprende cómo se levantaba una carbonera.' },
      { type: 'quiz' },
    ] },
  { id: 'sotos-ebro', name: 'Sotos del Ebro', comarca: 'ribera', family: 'ribera', relief: 'plain', size: 2, bosque: 'sotos', lat: 42.165, lon: -1.665,
    river: { name: 'Ebro', x: 95, w: 14, amp: 10 },
    intro: 'Bosques de ribera a la orilla del Ebro: chopos, sauces y fresnos que crecen con los pies en el agua, con aves, jabalíes y una huerta muy rica al lado.',
    church: { name: 'Observatorio de aves', style: 'borda', label: 'Observatorio', text: 'Una caseta con ventanas pequeñas: desde dentro se ven las aves del soto sin molestarlas.' },
    landmarks: [
      { kind: 'bigtree', tree: 'poplar', name: 'Chopo centenario', text: 'Los chopos y los sauces crecen con los pies en el agua. Sus raíces sujetan la orilla para que las riadas no se la lleven.' },
    ],
    missions: [
      { type: 'visit' },
      { type: 'observe', species: ['ciguena', 'milano', 'jabali', 'zorro'], n: 3, title: 'La selva del río', host: H('Ana, guarda de la reserva', GUARDESA),
        story: ['Los sotos son los bosques que crecen a la orilla de los ríos. Con chopos, sauces, fresnos y zarzas tan espesos, los llaman «las selvas de nuestros ríos».', 'Cuando el Ebro crece, el agua inunda el soto y deja tierra nueva. Después, el bosque vuelve a brotar.', 'En Navarra hay sotos protegidos como reservas naturales, como el de la Remonta y el del Ramalete.'],
        text: 'Encuentra con los prismáticos tres animales del soto: la cigüeña blanca, el milano real, el jabalí o el zorro.',
        hint: 'Las cigüeñas y los milanos vuelan bajo sobre el río; el jabalí y el zorro, entre los árboles.', outro: '¡Muy bien! El soto es la casa de muchos animales en mitad de una tierra seca.' },
      { type: 'harvest', crop: 'cardo', n: 8, host: H('Pilar, hortelana de la vega', { shirt: '#d9a03a', pants: '#4a5b3a', hat: 'straw', hair: '#3a2418', ponytail: true, female: true }),
        text: 'Junto al soto, en la vega del Ebro, la tierra es muy buena para la huerta. En invierno se recoge el cardo, que en la Ribera se come en Navidad.' },
      { type: 'quiz' },
    ] },
];
