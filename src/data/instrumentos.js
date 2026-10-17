// Los instrumentos de la música de siempre de Navarra: qué son, cómo se tocan y dónde suenan, con su ficha en el menú
// (hub.js, Saberes · Instrumentos, ui/instrumentos.js), su sonido propio (audio/instrumentos.js), su músico en la plaza
// de los pueblos de su zona (game/townGame.js, tocarCon) y el minijuego para aprender a tocarlos.
// game: lanes (lo que se toca en cada carril), bpm, meter (tiempos por compás) y phrase: la frase que se toca, un símbolo
// por corchea (el número del carril o «.», silencio); backing: lo que acompaña (el tamboril, el redoblante, el ttakun…).
// Las frases son propias, al estilo de cada música (una biribilketa, una jota, un fandango…), no piezas de nadie.
export const INSTRUMENTOS = [
  { id: 'txistu', name: 'Txistu y tamboril', eu: 'Txistua eta danbolina', short: 'el txistu', eushort: 'txistua', family: 'Viento', zone: 'Toda Navarra', icon: 'txistu',
    what: 'Flauta de pico con solo tres agujeros, de madera oscura con anillas de metal. Con tres agujeros se tocan melodías enteras: cambiando la fuerza del soplo se saltan las notas altas.',
    how: 'Se sujeta con la mano izquierda, que tapa los tres agujeros con dos dedos y el pulgar. La derecha lleva la baqueta del tamboril, un tambor pequeño colgado del brazo. Una sola persona toca la melodía y el ritmo.',
    where: 'En toda Navarra. Los txistularis acompañan a los gigantes, las danzas de la plaza y los pasacalles: en Pamplona, en Baztan, en Lesaka el día de San Fermín, en Leitza, en Larraun y en Sakana.',
    towns: ['lesaka', 'etxalar', 'elizondo', 'lekunberri', 'orreaga-roncesvalles', 'aribe', 'irulegi'], musico: ['Peru', 'txistulari'],
    lines: { ask: 'Kaixo. ¿Quieres aprender a tocar el txistu? Mira: sopla cuando la nota llegue a la línea y deja que el tamboril lleve el paso.', win: '¡Qué bien suena! Ya puedes decir que has tocado el txistu en la plaza.', lose: 'Casi. Escucha el tamboril, que marca el paso, y vuelve cuando quieras.' },
    game: { lanes: ['Sol', 'La', 'Si', 'Re'], bpm: 112, meter: 2, backing: 'tamboril', phrase: '0 1 2 2 1 2 3 3 2 3 2 1 0 0 . . 2 2 3 3 2 1 0 0 1 2 1 0 0 . . .' } },
  { id: 'gaita', name: 'Gaita navarra y tambor', eu: 'Nafar gaita eta danborra', short: 'la gaita', eushort: 'gaita', family: 'Viento', zone: 'Tierra Estella y Zona Media', icon: 'gaita',
    what: 'Instrumento de viento de madera con lengüeta doble, como un oboe pequeño: suena fuerte y alegre, hecho para la calle. En Navarra se llama gaita aunque no tiene fuelle; en la Ribera, dulzaina.',
    how: 'Se sopla con la lengüeta entre los labios y se tapan los agujeros con las dos manos. Los gaiteros tocan de dos en dos, uno hace la melodía y el otro la acompaña, y el tambor (el redoblante) marca el paso.',
    where: 'Tierra Estella, Pamplona y la Zona Media. Los gaiteros de Estella son famosos desde el siglo XIX; en Pamplona acompañan a la Comparsa de Gigantes y Cabezudos; en Tafalla, Olite y Sangüesa suenan en las fiestas y en el Baile de la Era.',
    towns: ['pamplona', 'estella', 'tafalla', 'olite', 'sanguesa', 'puente-la-reina', 'artajona', 'javier', 'ujue', 'aoiz', 'lumbier'], musico: ['Julián', 'gaitero'],
    lines: { ask: 'Buenas. ¿Te animas con la gaita? Es una jota: tres tiempos, y la nota cuando llegue a la línea. El redoblante te lleva.', win: '¡Olé! Con esa gaita se baila hasta la Era.', lose: 'Casi. La jota va a tres: cuenta uno, dos, tres y vuelve a probar.' },
    game: { lanes: ['Do', 'Re', 'Mi', 'Sol'], bpm: 126, meter: 3, backing: 'redoblante', phrase: '0 0 1 2 2 2 . 1 2 3 3 3 . 2 1 0 0 0 . 1 1 2 2 2 . 3 2 1 0 0 . . . . . .' } },
  { id: 'txalaparta', name: 'Txalaparta', eu: 'Txalaparta', short: 'la txalaparta', eushort: 'txalaparta', family: 'Percusión', zone: 'Norte', icon: 'txalaparta',
    what: 'Una o varias tablas de madera puestas sobre dos soportes, con sacos o cestos debajo para que suenen. Se golpean con palos gruesos (makilak), de punta y verticales. Es uno de los instrumentos más antiguos del País Vasco y de Navarra.',
    how: 'Se toca entre dos. Uno lleva el ttakun: dos golpes seguidos, siempre iguales. El otro responde con el herrena: rompe el ritmo metiendo uno o dos golpes entre medio. El juego está en escucharse y no pisar al otro.',
    where: 'Antes se tocaba en los caseríos del norte al terminar de hacer la sidra, para avisar a los vecinos y celebrarlo: en Baztan-Bidasoa, en Leitza y en Larraun. Hoy suena en fiestas y conciertos de toda Navarra.',
    towns: ['leitza', 'zugarramurdi'], musico: ['Joxe', 'txalapartari'],
    lines: { ask: 'Epa. Yo llevo el ttakun: dos golpes. Tú respondes con el herrena en los huecos, cuando la nota llegue a la línea. Escúchame y entra.', win: '¡Eso es la txalaparta! Dos que se escuchan.', lose: 'Casi. Espera mis dos golpes y entra en el hueco. Vuelve cuando quieras.' },
    game: { lanes: ['Tabla grave', 'Tabla aguda'], bpm: 96, meter: 2, backing: 'ttakun', phrase: '. . 0 . . . 1 . . . 0 1 . . 1 . . . 0 . . . 1 0 . . 0 . . . 1 . . . 0 1 . . 0 .' } },
  { id: 'ttunttun', name: 'Ttun-ttun y txirula', eu: 'Ttun-ttuna eta txirula', short: 'el ttun-ttun', eushort: 'ttun-ttuna', family: 'Cuerda y viento', zone: 'Pirineo', icon: 'ttunttun',
    what: 'El ttun-ttun es una caja de madera larga con seis cuerdas: se apoya en el brazo y se golpea con un palo, y suena como un bordón, «ttun, ttun». Se toca a la vez que la txirula, una flauta pequeña de tres agujeros, más aguda que el txistu.',
    how: 'La mano izquierda sujeta la txirula y toca la melodía con tres dedos; la derecha golpea las cuerdas del ttun-ttun con la baqueta, siempre al compás. Una persona hace de orquesta entera.',
    where: 'En los valles del Pirineo, Roncal y Salazar, y al otro lado de la muga, en Zuberoa. Acompañaba las danzas de los valles y hoy vuelve a oírse en las fiestas de Otsagabia, Isaba y Roncal.',
    towns: ['otsagabia-ochagavia', 'isaba-izaba', 'erronkari-roncal', 'burgui-burgi'], musico: ['Ximun', 'músico del valle'],
    lines: { ask: 'Agur. Esto es el ttun-ttun: el golpe grave lleva el paso y la txirula canta encima. Toca cada cosa cuando llegue a la línea.', win: '¡Así suenan los valles! Ttun, ttun… y la txirula arriba.', lose: 'Casi. Primero el golpe, luego la flauta. Vuelve cuando quieras.' },
    game: { lanes: ['Ttun', 'Do', 'Mi'], bpm: 120, meter: 2, backing: 'pulso', phrase: '0 1 0 2 0 1 2 1 0 2 0 1 0 2 2 1 0 1 0 2 0 1 0 0 0 2 0 1 0 2 0 .' } },
  { id: 'pandero', name: 'Pandero', eu: 'Panderoa', short: 'el pandero', eushort: 'panderoa', family: 'Percusión', zone: 'Ribera y norte', icon: 'pandero',
    what: 'Un aro de madera con un parche de piel y sonajas de metal en los lados. Es pequeño y ligero, y lo mismo marca el paso de un baile que acompaña a quien canta.',
    how: 'Se sujeta con una mano y se golpea con la otra: con la palma en el centro (grave), con los dedos en el borde (agudo) y sacudiéndolo para que suenen las sonajas. Combinar esos tres golpes es todo el secreto.',
    where: 'En el norte acompaña a la trikitixa en las romerías (Sakana, Baztan); en la Ribera, la pandereta suena en las jotas y en las rondas de las fiestas, de Tudela a Cortes.',
    towns: ['cortes'], musico: ['Nekane', 'panderojole'], female: true,
    lines: { ask: 'Hola. El pandero tiene tres golpes: palma, dedos y sonajas. Da cada uno cuando llegue a la línea y verás cómo sale el baile.', win: '¡Vaya ritmo! Con ese pandero se arranca cualquier romería.', lose: 'Casi. Palma, dedos, sonajas… despacio primero. Vuelve cuando quieras.' },
    game: { lanes: ['Palma', 'Dedos', 'Sonajas'], bpm: 120, meter: 2, backing: 'pulso', phrase: '0 2 1 2 0 2 1 1 0 2 1 2 0 0 2 2 0 2 1 2 0 2 1 1 0 2 1 2 0 . 2 .' } },
  { id: 'bandurria', name: 'Bandurria y guitarra', eu: 'Bandurria eta gitarra', short: 'la bandurria', eushort: 'bandurria', family: 'Cuerda', zone: 'Ribera y Tierra Estella', icon: 'bandurria',
    what: 'La bandurria es pequeña, con doce cuerdas en seis pares, y se toca con púa: suena brillante y rápida. Con el laúd y la guitarra forma la rondalla, el grupo que acompaña a los joteros y joteras.',
    how: 'La púa va y viene muy deprisa (el trémolo) para que la nota no se apague. La guitarra lleva el ritmo con rasgueos; la bandurria y el laúd, la melodía. Y encima, la voz: la jota se canta a pleno pulmón.',
    where: 'La jota navarra: en la Ribera (Tudela, Cortes, Corella, Fustiñana), en Tafalla y en Tierra Estella. Hay rondallas y escuelas de jota en muchos pueblos, y certámenes en las fiestas.',
    towns: ['tudela', 'marcilla', 'viana'], musico: ['Miren', 'bandurrista'], female: true,
    lines: { ask: 'Buenas. Esto es una jota: la guitarra rasguea a tres y la bandurria canta. Toca cada nota cuando llegue a la línea.', win: '¡Bravo! Eso ya es jota navarra.', lose: 'Casi. Sigue el rasgueo de la guitarra: uno, dos, tres. Vuelve cuando quieras.' },
    game: { lanes: ['Mi', 'Sol', 'La', 'Si'], bpm: 132, meter: 3, backing: 'guitarra', phrase: '2 2 3 2 1 0 . 1 2 3 3 2 . 1 0 0 1 2 . 3 2 1 0 0 . 2 2 3 2 1 0 . . . . .' } },
  { id: 'trikitixa', name: 'Trikitixa', eu: 'Trikitixa (soinu txikia)', short: 'la trikitixa', eushort: 'trikitixa', family: 'Viento con lengüetas', zone: 'Sakana, Baztan y Larraun', icon: 'trikitixa',
    what: 'Acordeón pequeño de botones, diatónico: cada botón da una nota al abrir el fuelle y otra al cerrarlo. Se llama también soinu txikia, «el sonido pequeño». Llegó hace siglo y medio y enseguida se hizo del país.',
    how: 'La mano derecha toca la melodía en los botones; la izquierda abre y cierra el fuelle y lleva los bajos y los acordes. Casi siempre va con el pandero, en pareja: trikitixa eta panderoa.',
    where: 'En las romerías y bailes del norte de Navarra: Sakana (Altsasu, Irurtzun), Baztan, Leitza y Larraun. Se bailan el fandango y el arin-arin, y la kalejira recorre las calles en fiestas.',
    towns: ['altsasu-alsasua', 'irurtzun'], musico: ['Garazi', 'trikitilari'], female: true,
    lines: { ask: 'Kaixo. Es un fandango, a tres. Los bajos van solos; tú pon las notas en los botones cuando lleguen a la línea.', win: '¡Eso es! Con esa trikitixa se llena la plaza de bailarines.', lose: 'Casi. Escucha los bajos: fuerte, flojo, flojo. Vuelve cuando quieras.' },
    game: { lanes: ['Do', 'Mi', 'Sol', 'Do′'], bpm: 128, meter: 3, backing: 'bajos', phrase: '0 1 2 2 2 1 . 2 3 3 2 1 . 0 1 2 1 0 . 2 2 3 2 1 0 . . 1 2 3 2 1 0 . . .' } },
  { id: 'kirikoketa', name: 'Kirikoketa', eu: 'Kirikoketa', short: 'la kirikoketa', eushort: 'kirikoketa', family: 'Percusión', zone: 'Baztan y Malerreka', icon: 'kirikoketa',
    what: 'Una tabla larga de madera, o la viga de la prensa de la sidra, golpeada con mazos por varias personas a la vez. El nombre imita su ritmo: ki-ri-ko-ke-ta. Es prima de la txalaparta.',
    how: 'Cada persona lleva un mazo y un golpe del ritmo; hay que entrar justo después del anterior, sin adelantarse. Primero despacio, y cuando sale redondo, cada vez más rápido.',
    where: 'En Baztan (Arizkun, Erratzu) y en Malerreka (Zubieta, Ituren): se tocaba en los lagares al machacar la manzana para la sidra, en otoño. Hoy la enseñan grupos de la zona y suena en el carnaval y en las fiestas.',
    towns: ['amaiur-maya-del-baztan', 'ituren'], musico: ['Amaia', 'vecina de Arizkun'], female: true,
    lines: { ask: 'Kaixo. Esto es la kirikoketa: ki-ri-ko, cada golpe en su mazo, uno detrás de otro, cuando lleguen a la línea. ¡Como en el lagar!', win: '¡Ki-ri-ko-ke-ta! Así se machacaba la manzana en otoño.', lose: 'Casi. Un golpe detrás de otro, sin adelantarse. Vuelve cuando quieras.' },
    game: { lanes: ['Ki', 'Ri', 'Ko'], bpm: 104, meter: 2, backing: 'pulso', phrase: '0 1 2 . 0 1 2 . 0 1 2 2 0 1 2 . 0 1 2 . 0 1 2 2 0 1 2 . 0 1 2 .' } },
];
export const instrumentoById = (id) => INSTRUMENTOS.find(x => x.id === id) || null;
/** Los instrumentos de un pueblo (el primero es el de su músico de la plaza). */
export const instrumentosDe = (town) => INSTRUMENTOS.filter(x => x.towns.includes(town));
/** La frase del minijuego como notas: [{ lane, i }] con i el número de corchea. */
export const notasDe = (inst) => inst.game.phrase.trim().split(/\s+/).map((s, i) => s === '.' ? null : { lane: +s, i }).filter(Boolean);
