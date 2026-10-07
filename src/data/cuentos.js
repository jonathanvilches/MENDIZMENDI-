// Cuentos y leyendas de Navarra. En cada pueblo que tiene uno, un contador o una contadora lo cuenta por partes; luego
// hay una pregunta y el cuento se guarda en el libro de leyendas del menú. Cada relato dice si es una leyenda (lo que
// cuenta la tradición) o una historia (lo que pasó de verdad), y qué se puede ver hoy. Adaptados para 7 a 11 años.
// Fuentes: Cátedra de Patrimonio de la Universidad de Navarra, Auñamendi Eusko Entziklopedia, Senditur, Noticias de
// Navarra, culturanavarra.es y los ayuntamientos y santuarios de cada lugar.
// Cada texto lleva su versión en euskera (eu): el traductor del juego la usa en los modos de euskera.

export const CUENTOS = [
  {
    id: 'aralar', towns: ['lekunberri', 'irurtzun'], kind: 'leyenda', icon: 'cave',
    title: 'El dragón de Aralar', place: 'Santuario de San Miguel de Aralar',
    teller: { name: 'Kontalari Mikel', female: false },
    parts: [
      'Hace más de mil años vivía en el valle un caballero llamado Teodosio de Goñi. Por culpa de un engaño cometió un error terrible, y se arrepintió toda su vida.',
      'Para pedir perdón, le pusieron unas cadenas de hierro muy pesadas. Tendría que llevarlas hasta que se rompieran solas. Así subió a la sierra de Aralar, entre hayas y niebla.',
      'Una noche, de una cueva salió un dragón enorme, el Herensuge. Teodosio, sin fuerzas para huir, llamó a gritos a San Miguel.',
      'Bajó del cielo el arcángel con una cruz sobre la cabeza y venció al dragón. En ese momento, las cadenas de Teodosio se rompieron en pedazos. Allí mismo se levantó el santuario.',
    ],
    today: 'El santuario de San Miguel de Aralar sigue en lo alto de la sierra. En su pared cuelgan unas cadenas, y la gente pasa por debajo para tener buena suerte. Junto al altar hay un agujero que da a la cueva: dicen que por ahí se puede «escuchar al dragón».',
    q: { q: '¿Qué les pasó a las cadenas de Teodosio cuando llegó San Miguel?', options: ['Se rompieron en pedazos', 'Se las llevó el dragón', 'Se volvieron de oro'], answer: 0, why: 'Se rompieron: era la señal de que su castigo había terminado.' },
    eu: {
      title: 'Aralarko herensugea', place: 'Aralarko San Migel santutegia',
      parts: [
        'Duela mila urte baino gehiago, Teodosio Goñikoa izeneko zaldun bat bizi zen haranean. Engainu baten erruz, akats izugarri bat egin zuen, eta bizitza osoan damutu zen.',
        'Barkamena eskatzeko, burdinazko kate astun-astunak jarri zizkioten. Bakarrik hautsi arte eraman beharko zituen. Hala igo zen Aralarko mendilerrora, pagoen eta lainoaren artean.',
        'Gau batean, kobazulo batetik herensuge erraldoi bat atera zen. Teodosiok, ihes egiteko indarrik gabe, San Migeli deitu zion oihuka.',
        'Goiaingerua zerutik jaitsi zen, gurutze bat buru gainean zuela, eta herensugea garaitu zuen. Une berean, Teodosioren kateak puskatu egin ziren. Han bertan eraiki zen santutegia.',
      ],
      today: 'Aralarko San Migel santutegia mendilerroaren goialdean dago oraindik. Horman kate batzuk daude zintzilik, eta jendea haien azpitik pasatzen da zortea izateko. Aldarearen ondoan kobazulora ematen duen zulo bat dago: diotenez, hortik «herensugea entzun» daiteke.',
      q: { q: 'Zer gertatu zitzaien Teodosioren kateei San Migel iritsi zenean?', options: ['Puskatu egin ziren', 'Herensugeak eraman zituen', 'Urrezko bihurtu ziren'], why: 'Puskatu egin ziren: zigorra amaitu zela adierazten zuen.' },
    },
  },
  {
    id: 'ujue', towns: ['ujue'], kind: 'leyenda', icon: 'bird',
    title: 'La paloma de Ujué', place: 'Santuario de Santa María de Ujué',
    teller: { name: 'Kontalari Pilar', female: true },
    parts: [
      'Hace muchísimos años, un pastor cuidaba sus ovejas en lo alto del monte. Se fijó en una paloma que entraba y salía siempre del mismo agujero de una roca.',
      'Un día, el pastor sintió curiosidad. Subió hasta la roca y metió la mano en el hueco, con cuidado de no asustar a la paloma.',
      'Dentro había una imagen de la Virgen, morena y pequeña. Alguien la había escondido allí mucho tiempo antes, para protegerla.',
      'La gente del lugar construyó una iglesia en ese sitio. Y el pueblo se llamó Uxue, que se parece a «usoa», paloma en euskera.',
    ],
    today: 'En lo alto de Ujué está la iglesia-fortaleza de Santa María, con la Virgen morena forrada de plata. Cada primavera llegan romerías desde los pueblos de alrededor, y en el escudo de Ujué hay una paloma.',
    q: { q: '¿Qué animal guió al pastor hasta la imagen?', options: ['Una paloma', 'Un águila', 'Un zorro'], answer: 0, why: 'Una paloma: por eso el pueblo se llama Uxue, de «usoa», paloma.' },
    eu: {
      title: 'Uxueko usoa', place: 'Uxueko Andre Maria santutegia',
      parts: [
        'Duela urte asko eta asko, artzain bat ardiak zaintzen ari zen mendi gainean. Uso bat beti harkaitz bateko zulo beretik sartzen eta ateratzen zela ohartu zen.',
        'Egun batean, artzainak jakin-mina sentitu zuen. Harkaitzeraino igo zen eta eskua zuloan sartu zuen, usoa ez izutzeko kontuz.',
        'Barruan Ama Birjinaren irudi bat zegoen, beltzarana eta txikia. Norbaitek han ezkutatu zuen aspaldi, babesteko.',
        'Inguruko jendeak eliza bat eraiki zuen leku hartan. Eta herriari Uxue deitu zitzaion, «usoa» hitzaren antzekoa.',
      ],
      today: 'Uxueko goialdean Andre Mariaren eliza-gotorlekua dago, zilarrez estalitako Ama Birjin beltzaranarekin. Udaberri guztietan inguruko herrietatik erromesaldiak iristen dira, eta Uxueko armarrian uso bat dago.',
      q: { q: 'Zer animaliak gidatu zuen artzaina irudiraino?', options: ['Uso batek', 'Arrano batek', 'Azeri batek'], why: 'Uso batek: horregatik deitzen da herria Uxue, «usoa» hitzetik.' },
    },
  },
  {
    id: 'estella', towns: ['estella'], kind: 'leyenda', icon: 'star',
    title: 'La lluvia de estrellas', place: 'Basílica de Nuestra Señora del Puy',
    teller: { name: 'Kontalari Josefa', female: true },
    parts: [
      'Cuentan que en mayo de 1085 unos pastores de Abárzuza llevaban varios días con sus ovejas en el cerro del Puy, junto a Estella.',
      'Varias noches seguidas vieron algo increíble: una lluvia de estrellas que caía siempre sobre el mismo sitio del monte.',
      'Siguieron las luces y llegaron a una cueva escondida entre zarzas y espinos. Dentro encontraron una imagen de la Virgen con el Niño.',
      'Avisaron a la gente de Estella, que subió con ellos a verla. Desde entonces, la estrella es el símbolo de la ciudad.',
    ],
    today: 'En el cerro del Puy está la basílica de la Virgen del Puy, con un mirador sobre toda Estella. La ciudad lleva una estrella en su escudo, y una coplilla dice: «Esta es la Estrella que bajó del cielo a Estella».',
    q: { q: '¿Qué vieron los pastores sobre el cerro del Puy?', options: ['Una lluvia de estrellas', 'Un arcoíris', 'Una tormenta de nieve'], answer: 0, why: 'Una lluvia de estrellas: por eso la estrella es el símbolo de Estella.' },
    eu: {
      title: 'Izar euria', place: 'Puyko Andre Mariaren basilika',
      parts: [
        'Kontatzen dutenez, 1085eko maiatzean Abartzuzako artzain batzuk hainbat egun zeramatzaten ardiekin Puyko muinoan, Lizarra ondoan.',
        'Hainbat gauetan segidan gauza harrigarri bat ikusi zuten: izar euri bat, beti mendiaren leku berean erortzen zena.',
        'Argiei jarraitu zieten eta laharren eta arantzen artean ezkutatutako kobazulo batera iritsi ziren. Barruan Ama Birjinaren irudi bat aurkitu zuten, Haurrarekin.',
        'Lizarrako jendeari abisatu zioten, eta haiekin batera igo ziren ikustera. Harrezkero, izarra da hiriaren ikurra.',
      ],
      today: 'Puyko muinoan Puyko Ama Birjinaren basilika dago, Lizarra osoaren gaineko begiratoki batekin. Hiriak izar bat darama armarrian.',
      q: { q: 'Zer ikusi zuten artzainek Puyko muinoaren gainean?', options: ['Izar euri bat', 'Ostadar bat', 'Elur ekaitz bat'], why: 'Izar euri bat: horregatik da izarra Lizarraren ikurra.' },
    },
  },
  {
    id: 'txori', towns: ['puente-la-reina'], kind: 'leyenda', icon: 'bird',
    title: 'El txori del puente', place: 'Puente románico sobre el río Arga',
    teller: { name: 'Kontalari Joxe', female: false },
    parts: [
      'En medio del gran puente de piedra había una torre con una capillita, y dentro, una imagen de la Virgen.',
      'Cuentan que, de vez en cuando, llegaba volando un pajarillo, un txori. Bajaba al río, mojaba las alas y el pico y subía a la capilla.',
      'Allí, con mucho cuidado, le limpiaba la cara a la Virgen y le quitaba las telarañas.',
      'Para la gente del pueblo, la visita del txori traía buena suerte: tocaban las campanas y lo celebraban con fiesta.',
    ],
    today: 'La torre del puente ya no existe, pero la Virgen del Txori está en la iglesia de San Pedro. El puente sigue en pie: por él cruzan cada día los peregrinos del Camino de Santiago. Y el txori aparece en el escudo de la villa.',
    q: { q: '¿Qué hacía el txori en la capilla del puente?', options: ['Limpiaba la cara de la Virgen', 'Hacía su nido', 'Tocaba la campana'], answer: 0, why: 'Le limpiaba la cara con el agua del río: era una visita de buena suerte.' },
    eu: {
      title: 'Zubiko txoria', place: 'Arga ibaiaren gaineko zubi erromanikoa',
      parts: [
        'Harrizko zubi handiaren erdian dorre bat zegoen kapera txiki batekin, eta barruan Ama Birjinaren irudi bat.',
        'Kontatzen dutenez, noizean behin txori txiki bat etortzen zen hegan. Ibaira jaisten zen, hegoak eta mokoa bustitzen zituen eta kaperara igotzen zen.',
        'Han, kontu handiz, Ama Birjinaren aurpegia garbitzen zuen eta armiarma-sareak kentzen zizkion.',
        'Herriko jendearentzat, txoriaren bisitak zorte ona ekartzen zuen: kanpaiak jotzen zituzten eta jai egiten zuten.',
      ],
      today: 'Zubiko dorrea jada ez dago, baina Txoriaren Ama Birjina San Pedro elizan dago. Zubia zutik dago oraindik: Done Jakue bideko erromesak egunero igarotzen dira handik. Eta txoria hiribilduaren armarrian ageri da.',
      q: { q: 'Zer egiten zuen txoriak zubiko kaperan?', options: ['Ama Birjinaren aurpegia garbitzen zuen', 'Habia egiten zuen', 'Kanpaia jotzen zuen'], why: 'Ibaiko urarekin aurpegia garbitzen zion: zorte oneko bisita zen.' },
    },
  },
  {
    id: 'virila', towns: ['lumbier', 'sanguesa'], kind: 'leyenda', icon: 'bird',
    title: 'El abad que durmió trescientos años', place: 'Monasterio de Leyre',
    teller: { name: 'Kontalari Fermín', female: false },
    parts: [
      'Virila era el abad del monasterio de Leyre. Le gustaba pasear por el bosque y pensar en el misterio del cielo: ¿cómo sería la eternidad?',
      'Un día se sentó junto a una fuente. Escuchando el agua y el canto de un ruiseñor, se quedó dormido.',
      'Cuando despertó y volvió al monasterio, no conocía a nadie, ¡y nadie le conocía a él! En los libros encontraron que había existido un abad Virila… trescientos años antes.',
      'Entonces el ruiseñor entró en la iglesia y le devolvió su anillo de abad. Virila entendió que, escuchando aquel canto, había tenido un pequeño anticipo de la eternidad.',
    ],
    today: 'El monasterio de Leyre está al pie de la sierra, con una cripta muy antigua. La fuente de San Virila sigue en el camino del bosque. Y en el escudo de Yesa hay un báculo de abad con un pájaro.',
    q: { q: '¿Cuánto tiempo durmió el abad Virila escuchando al ruiseñor?', options: ['Trescientos años', 'Una noche', 'Tres días'], answer: 0, why: 'Trescientos años, aunque a él le pareció un ratito.' },
    eu: {
      title: 'Hirurehun urtez lo egin zuen abadea', place: 'Leireko monasterioa',
      parts: [
        'Virila Leireko monasterioko abadea zen. Basoan ibiltzea eta zeruko misterioan pentsatzea gustatzen zitzaion: nolakoa ote zen betikotasuna?',
        'Egun batean iturri baten ondoan eseri zen. Ura eta urretxindor baten kantua entzuten, lo geratu zen.',
        'Esnatu eta monasteriora itzuli zenean, ez zuen inor ezagutzen, eta inork ez zuen bera ezagutzen! Liburuetan Virila izeneko abade bat egon zela aurkitu zuten… hirurehun urte lehenago.',
        'Orduan urretxindorra elizan sartu zen eta abade-eraztuna itzuli zion. Virilak ulertu zuen kantu hura entzuten betikotasunaren aurrerapen txiki bat izan zuela.',
      ],
      today: 'Leireko monasterioa mendilerroaren oinean dago, kripta oso zahar batekin. San Virilaren iturria basoko bidean dago oraindik. Eta Esako armarrian abade-makila bat dago txori batekin.',
      q: { q: 'Zenbat denboran egin zuen lo Virila abadeak urretxindorra entzuten?', options: ['Hirurehun urtez', 'Gau batez', 'Hiru egunez'], why: 'Hirurehun urtez, nahiz eta berari une bat iruditu.' },
    },
  },
  {
    id: 'cristo', towns: ['javier'], kind: 'leyenda', icon: 'cross',
    title: 'El Cristo que sudaba sangre', place: 'Torre del Cristo del castillo de Javier',
    teller: { name: 'Kontalari Maritxu', female: true },
    parts: [
      'En el castillo de Javier nació en 1506 un niño llamado Francisco. De mayor viajó muy lejos, hasta la India y Japón: hoy le llamamos San Francisco Javier.',
      'En una torre del castillo hay una capilla con un Cristo de madera que sonríe. La familia de Francisco rezaba allí por él mientras viajaba.',
      'Cuenta la leyenda que, cuando Francisco pasaba por un momento difícil al otro lado del mundo, el Cristo de Javier sudaba sangre.',
      'Dicen que la última vez fue en 1552, el día en que Francisco murió, muy lejos de su casa, frente a las costas de China.',
    ],
    today: 'Puedes ver el Cristo sonriente en la capilla de la torre del castillo. Cada mes de marzo, miles de personas caminan hasta Javier en la Javierada.',
    q: { q: '¿Cómo es el Cristo de la capilla del castillo?', options: ['Un Cristo de madera que sonríe', 'Una estatua de oro', 'Un cuadro pintado'], answer: 0, why: 'Es de madera y sonríe: por eso le llaman el Cristo sonriente.' },
    eu: {
      title: 'Odola izerditzen zuen Kristoa', place: 'Xabierko gazteluko Kristoren dorrea',
      parts: [
        'Xabierko gazteluan 1506an Frantzisko izeneko haur bat jaio zen. Handitan oso urrun bidaiatu zuen, Indiaraino eta Japoniaraino: gaur egun San Frantzisko Xabierkoa deitzen diogu.',
        'Gazteluko dorre batean kapera bat dago, irribarre egiten duen zurezko Kristo batekin. Franziskoren familiak han egiten zuen otoitz harengatik, bidaian zebilen bitartean.',
        'Kondairak dioenez, Frantzisko munduaren beste aldean une zail batean zegoenean, Xabierko Kristoak odola izerditzen zuen.',
        'Diotenez, azken aldia 1552an izan zen, Frantzisko hil zen egunean, etxetik oso urrun, Txinako kostaldearen aurrean.',
      ],
      today: 'Kristo irribarretsua gazteluko dorreko kaperan ikus dezakezu. Martxo guztietan, milaka pertsona oinez joaten dira Xabierrera Xabierkaden.',
      q: { q: 'Nolakoa da gazteluko kaperako Kristoa?', options: ['Irribarre egiten duen zurezko Kristoa', 'Urrezko estatua bat', 'Margotutako koadro bat'], why: 'Zurezkoa da eta irribarre egiten du: horregatik deitzen diote Kristo irribarretsua.' },
    },
  },
  {
    id: 'leon', towns: ['olite'], kind: 'leyenda', icon: 'castle',
    title: 'El rey y su león', place: 'Palacio Real de Olite',
    teller: { name: 'Kontalari Ramón', female: false },
    parts: [
      'Hace seiscientos años, el rey Carlos III el Noble convirtió Olite en un palacio de cuento, con torres, jardines colgantes y fuentes.',
      'Y tenía algo muy especial: una leonera con leones de verdad, traídos de muy lejos, y otros animales exóticos.',
      'Cuenta la leyenda que algunas noches, cuando el palacio está en silencio, el rey Noble pasea por los corredores con su león, que se llamaba Marzot.',
      'Dicen que los acompaña una música extraña, como de láminas de metal que vibran con el viento. Los que la oyen no se asustan: saben que es el rey, cuidando su palacio.',
    ],
    today: 'El Palacio Real de Olite se puede recorrer: sus torres, sus patios y el sitio donde estaban los jardines. Una parte del castillo viejo es hoy un parador, y allí se sigue contando la leyenda del rey y su león.',
    q: { q: '¿Qué animales vivían en la leonera del palacio?', options: ['Leones de verdad', 'Caballos de carreras', 'Ovejas latxas'], answer: 0, why: 'Leones de verdad: los reyes de Navarra tenían animales exóticos en Olite.' },
    eu: {
      title: 'Erregea eta bere lehoia', place: 'Erriberriko Errege Jauregia',
      parts: [
        'Duela seiehun urte, Karlos III.a Noblea erregeak ipuineko jauregi bihurtu zuen Erriberri, dorre, lorategi eseki eta iturriekin.',
        'Eta zerbait berezia zuen: benetako lehoiak zituen lehoitegi bat, oso urrunetik ekarriak, eta beste animalia exotiko batzuk.',
        'Kondairak dioenez, gau batzuetan, jauregia isilik dagoenean, errege Noblea korridoreetan ibiltzen da bere lehoiarekin, Marzot izenekoa.',
        'Diotenez, musika arraro batek laguntzen ditu, haizearekin dardarka ari diren metalezko xaflena bezalakoa. Entzuten dutenak ez dira beldurtzen: badakite erregea dela, bere jauregia zaintzen.',
      ],
      today: 'Erriberriko Errege Jauregia bisita daiteke: bere dorreak, patioak eta lorategiak zeuden lekua. Gaztelu zaharraren zati bat parador bat da gaur, eta han kontatzen da oraindik erregearen eta bere lehoiaren kondaira.',
      q: { q: 'Zer animalia bizi ziren jauregiko lehoitegian?', options: ['Benetako lehoiak', 'Lasterketa-zaldiak', 'Ardi latxak'], why: 'Benetako lehoiak: Nafarroako erregeek animalia exotikoak zituzten Erriberrin.' },
    },
  },
  {
    id: 'amaiur', towns: ['amaiur-maya-del-baztan'], kind: 'historia', icon: 'ruin',
    title: 'Los últimos del castillo de Amaiur', place: 'Colina del castillo de Amaiur',
    teller: { name: 'Kontalari Miren', female: true },
    parts: [
      'En 1512, el ejército de Castilla conquistó el reino de Navarra. Durante años, muchos navarros intentaron recuperarlo para sus reyes, Catalina y Juan.',
      'En 1522, unos doscientos defensores se encerraron en el castillo de Amaiur, en lo alto de una colina del valle de Baztan.',
      'Frente a ellos llegó un ejército de miles de soldados. Los defensores aguantaron el asedio varios días, hasta que una gran explosión derribó parte del castillo.',
      'Al final se rindieron, y poco después el castillo fue derribado. Fue uno de los últimos lugares donde se resistió por la Navarra independiente.',
    ],
    today: 'En la colina de Amaiur quedan los restos del castillo, excavados por arqueólogos, y un monolito de piedra levantado en 1922 en recuerdo de sus defensores. Desde arriba se ve todo el valle.',
    q: { q: '¿En qué año resistieron los defensores en el castillo de Amaiur?', options: ['En 1522', 'En 1085', 'En 1952'], answer: 0, why: 'En 1522, diez años después de la conquista de Navarra.' },
    eu: {
      title: 'Amaiurko gazteluko azkenak', place: 'Amaiurko gazteluaren muinoa',
      parts: [
        '1512an, Gaztelako armadak Nafarroako erresuma konkistatu zuen. Urte askoan, nafar askok berreskuratzen saiatu ziren bere errege-erreginentzat, Katalina eta Joanentzat.',
        '1522an, berrehun bat defendatzaile Amaiurko gazteluan itxi ziren, Baztan haraneko muino baten gainean.',
        'Haien aurrean milaka soldaduko armada bat iritsi zen. Defendatzaileek hainbat egunez eutsi zioten setioari, leherketa handi batek gazteluaren zati bat bota zuen arte.',
        'Azkenean errenditu egin ziren, eta handik gutxira gaztelua eraitsi zuten. Nafarroa burujabearen alde eutsi zen azken lekuetako bat izan zen.',
      ],
      today: 'Amaiurko muinoan gazteluaren aztarnak geratzen dira, arkeologoek induskatuak, eta 1922an defendatzaileen oroimenez altxatutako harrizko monolito bat. Goitik haran osoa ikusten da.',
      q: { q: 'Zein urtetan eutsi zioten defendatzaileek Amaiurko gazteluan?', options: ['1522an', '1085ean', '1952an'], why: '1522an, Nafarroaren konkistatik hamar urtera.' },
    },
  },
  {
    id: 'olentzero', towns: ['lesaka', 'etxalar'], kind: 'leyenda', icon: 'fire',
    title: 'Olentzero, el carbonero del monte', place: 'Montes de Bortziriak',
    teller: { name: 'Kontalari Patxi', female: false },
    parts: [
      'En los montes de esta zona vivía Olentzero, un carbonero grande y bonachón. Pasaba el año en el bosque, haciendo carbón con leña y mirando las estrellas.',
      'Cuando llegaban los días más cortos y fríos del invierno, bajaba al pueblo con su txapela, su pipa y la cara tiznada de carbón.',
      'Traía la noticia de que el invierno empezaba a irse: a partir de ahí, los días serían un poco más largos. Con el tiempo, también trajo regalos para los niños y las niñas.',
      'Muchos dicen que esta costumbre nació por aquí, entre Bera y Lesaka, y desde aquí se extendió por todo Euskal Herria.',
    ],
    today: 'Cada 24 de diciembre, Olentzero recorre los pueblos sentado en una silla, entre cantos. Ya aparece en los Fueros antiguos de Navarra con el nombre de «Onenzaro».',
    q: { q: '¿En qué trabajaba Olentzero en el monte?', options: ['Era carbonero', 'Era pescador', 'Era panadero'], answer: 0, why: 'Era carbonero: por eso baja con la cara tiznada.' },
    eu: {
      title: 'Olentzero, mendiko ikazkina', place: 'Bortziriko mendiak',
      parts: [
        'Inguru honetako mendietan Olentzero bizi zen, ikazkin handi eta onbera bat. Urtea basoan ematen zuen, egurrarekin ikatza egiten eta izarrei begira.',
        'Neguko egun motz eta hotzenak iristen zirenean, herrira jaisten zen bere txapela eta pipa hartuta, aurpegia ikatzez beltzututa.',
        'Negua joaten hasia zela zioen albistea ekartzen zuen: hortik aurrera, egunak pixka bat luzeagoak izango ziren. Denborarekin, opariak ere ekarri zizkien haurrei.',
        'Askok diote ohitura hau hemen jaio zela, Bera eta Lesaka artean, eta hemendik Euskal Herri osora zabaldu zela.',
      ],
      today: 'Abenduaren 24an, Olentzerok herriak zeharkatzen ditu aulki batean eserita, kantuen artean. Nafarroako Foru zaharretan ageri da jada, «Onenzaro» izenarekin.',
      q: { q: 'Zertan egiten zuen lan Olentzerok mendian?', options: ['Ikazkina zen', 'Arrantzalea zen', 'Okina zen'], why: 'Ikazkina zen: horregatik jaisten da aurpegia beltzututa.' },
    },
  },
  {
    id: 'vacas', towns: ['isaba-izaba', 'erronkari-roncal', 'burgui-burgi'], kind: 'historia', icon: 'cow',
    title: 'El tributo de las tres vacas', place: 'Piedra de San Martín, en la frontera',
    teller: { name: 'Kontalari Graxi', female: true },
    parts: [
      'Hace muchos siglos, los pastores del valle de Roncal y los del valle de Baretous, al otro lado de los Pirineos, se peleaban por los pastos de la montaña.',
      'Las peleas fueron tan graves que hubo heridos y muertos. Hacía falta una solución para vivir en paz.',
      'En 1375 firmaron un acuerdo: la gente de Baretous podría usar los pastos y, a cambio, entregaría cada año tres vacas al valle de Roncal.',
      'Desde entonces, cada 13 de julio, los alcaldes de los dos valles se encuentran junto a una piedra en la frontera. Ponen las manos unas sobre otras y repiten tres veces: «Pax avant», ¡paz en adelante!',
    ],
    today: 'La ceremonia se sigue haciendo cada 13 de julio en la Piedra de San Martín, a 1.760 metros, sobre el valle de Belagua. Los alcaldes del Roncal van con su traje tradicional. Es una de las costumbres más antiguas de Europa.',
    q: { q: '¿Qué dicen los alcaldes en la Piedra de San Martín?', options: ['«Pax avant», paz en adelante', '«¡Gora Roncal!»', '«Hasta el año que viene»'], answer: 0, why: '«Pax avant»: un acuerdo de paz que dura desde 1375.' },
    eu: {
      title: 'Hiru behien zerga', place: 'San Martin harria, mugan',
      parts: [
        'Duela mende asko, Erronkari ibarreko artzainak eta Baretoukoak, Pirinioen beste aldean, mendiko larreengatik borrokatzen ziren.',
        'Borrokak hain larriak izan ziren, zaurituak eta hildakoak izan baitziren. Konponbide bat behar zen bakean bizitzeko.',
        '1375ean hitzarmen bat sinatu zuten: Baretouko jendeak larreak erabil zitzakeen eta, horren truke, urtero hiru behi emango zizkion Erronkari ibarrari.',
        'Harrezkero, uztailaren 13an, bi ibarretako alkateak mugako harri baten ondoan elkartzen dira. Eskuak bata bestearen gainean jarri eta hiru aldiz errepikatzen dute: «Pax avant», bakea aurrerantzean!',
      ],
      today: 'Zeremonia uztailaren 13an egiten da oraindik San Martin harrian, 1.760 metroan, Belagua ibarraren gainean. Erronkariko alkateak jantzi tradizionalarekin joaten dira. Europako ohiturarik zaharrenetako bat da.',
      q: { q: 'Zer esaten dute alkateek San Martin harrian?', options: ['«Pax avant», bakea aurrerantzean', '«Gora Erronkari!»', '«Datorren urtera arte»'], why: '«Pax avant»: 1375etik irauten duen bake-hitzarmena.' },
    },
  },
  {
    id: 'muskilda', towns: ['otsagabia-ochagavia'], kind: 'leyenda', icon: 'tree',
    title: 'La Virgen del roble', place: 'Santuario de Muskilda',
    teller: { name: 'Kontalari Martín', female: false },
    parts: [
      'En lo alto del monte de Muskilda, sobre Otsagabia, los pastores subían cada verano con sus rebaños.',
      'Cuenta la tradición que un pastor encontró una imagen de la Virgen en el tronco de un roble.',
      'La gente del valle de Salazar construyó allí una ermita para guardarla, y la llamaron Nuestra Señora de Muskilda.',
      'Cada 8 de septiembre, el pueblo sube en romería al santuario, y los danzantes bailan con sus trajes de colores y sus gorros de flores.',
    ],
    today: 'A unos cien pasos de la ermita hay un pilar de piedra que levantó la villa en 1654. Dicen que dentro está el roble donde el pastor encontró la imagen. La talla de la Virgen es gótica, de hace más de seiscientos años.',
    q: { q: '¿Dónde encontró el pastor la imagen de la Virgen?', options: ['En el tronco de un roble', 'En el fondo del río', 'En una cueva de hielo'], answer: 0, why: 'En un roble: hoy lo guarda un pilar de piedra cerca de la ermita.' },
    eu: {
      title: 'Hariztiko Ama Birjina', place: 'Muskildako santutegia',
      parts: [
        'Muskilda mendiaren goialdean, Otsagabiaren gainean, artzainak udaro igotzen ziren beren artaldeekin.',
        'Ohiturak dioenez, artzain batek Ama Birjinaren irudi bat aurkitu zuen haritz baten enborrean.',
        'Zaraitzu ibarreko jendeak ermita bat eraiki zuen han gordetzeko, eta Muskildako Andre Maria deitu zioten.',
        'Irailaren 8an, herria erromes igotzen da santutegira, eta dantzariek dantza egiten dute beren jantzi koloretsu eta lore-txanoekin.',
      ],
      today: 'Ermitatik ehun bat pausora, herriak 1654an altxatutako harrizko zutabe bat dago. Diotenez, barruan dago artzainak irudia aurkitu zuen haritza. Ama Birjinaren irudia gotikoa da, duela seiehun urte baino gehiagokoa.',
      q: { q: 'Non aurkitu zuen artzainak Ama Birjinaren irudia?', options: ['Haritz baten enborrean', 'Ibaiaren hondoan', 'Izotzezko kobazulo batean'], why: 'Haritz batean: gaur harrizko zutabe batek gordetzen du ermitatik gertu.' },
    },
  },
  {
    id: 'almadias', towns: ['burgui-burgi', 'erronkari-roncal'], kind: 'historia', icon: 'raft',
    title: 'Los almadieros del río', place: 'Río Esca, en Burgui',
    teller: { name: 'Kontalari Txomin', female: false },
    parts: [
      'Antes de que hubiera camiones, ¿cómo se llevaban los troncos de los bosques del Pirineo hasta las ciudades? ¡Por el río!',
      'Los almadieros ataban los troncos con ramas retorcidas y formaban una almadía, una balsa larga de madera.',
      'En primavera, cuando el río bajaba con mucha agua por el deshielo, se subían encima y navegaban por el Esca, el Aragón y el Ebro, ¡hasta Zaragoza o más lejos!',
      'Era un oficio duro y peligroso. Había que esquivar rocas y presas con un gran remo, y luego volver andando a casa durante días.',
    ],
    today: 'Cada primavera, en el Día de la Almadía, Burgui vuelve a bajar almadías por el río Esca. El saber de los almadieros es Patrimonio Cultural Inmaterial de la Humanidad de la UNESCO.',
    q: { q: '¿Qué era una almadía?', options: ['Una balsa de troncos atados', 'Un barco de vela', 'Un puente colgante'], answer: 0, why: 'Una balsa de troncos atados que bajaba por el río hasta las ciudades.' },
    eu: {
      title: 'Ibaiko almadiazainak', place: 'Ezka ibaia, Burgin',
      parts: [
        'Kamioirik egon aurretik, nola eramaten ziren Pirinioetako basoetako enborrak hirietaraino? Ibaitik!',
        'Almadiazainek enborrak adar bihurrituekin lotzen zituzten eta almadia bat osatzen zuten, zurezko baltsa luze bat.',
        'Udaberrian, ibaia urtzearen ondorioz ur askorekin jaisten zenean, gainera igo eta Ezka, Aragoi eta Ebro ibaietan nabigatzen zuten, Zaragozaraino edo urrunago!',
        'Ofizio gogorra eta arriskutsua zen. Harkaitzak eta presak saihestu behar ziren arraun handi batekin, eta gero oinez itzuli etxera egun askoan.',
      ],
      today: 'Udaberri guztietan, Almadiaren Egunean, Burgik almadiak jaisten ditu berriz Ezka ibaian behera. Almadiazainen jakintza UNESCOren Gizateriaren Kultura Ondare Immateriala da.',
      q: { q: 'Zer zen almadia bat?', options: ['Enbor lotuen baltsa bat', 'Bela-ontzi bat', 'Zubi eseki bat'], why: 'Enbor lotuen baltsa bat, ibaian behera hirietaraino jaisten zena.' },
    },
  },
  {
    id: 'velasco', towns: ['marcilla'], kind: 'historia', icon: 'castle',
    title: 'La marquesa que no entregó su castillo', place: 'Castillo de Marcilla',
    teller: { name: 'Kontalari Ana', female: true },
    parts: [
      'Después de la conquista de Navarra, en 1516, el cardenal Cisneros ordenó derribar muchos castillos navarros, para que nadie pudiera defenderse en ellos.',
      'Unos enviados llegaron a Marcilla con la orden. En el castillo mandaba la marquesa de Falces, Ana de Velasco, porque su marido estaba fuera.',
      'Ana de Velasco no se dejó asustar. Cerró las puertas, preparó la defensa y se negó a entregar el castillo.',
      'Los enviados tuvieron que marcharse, y el castillo se salvó: apenas le rompieron algunas almenas. Fue uno de los pocos que quedaron en pie.',
    ],
    today: 'El castillo de Marcilla sigue en pie, con su foso y sus torres, en el centro del pueblo. Hoy se usa para actos culturales y se puede visitar.',
    q: { q: '¿Quién defendió el castillo de Marcilla en 1516?', options: ['La marquesa Ana de Velasco', 'El rey Carlos III', 'Un dragón'], answer: 0, why: 'Ana de Velasco: gracias a ella, el castillo sigue en pie.' },
    eu: {
      title: 'Bere gaztelua eman ez zuen markesa', place: 'Marcillako gaztelua',
      parts: [
        'Nafarroaren konkistaren ondoren, 1516an, Cisneros kardinalak nafar gaztelu asko botatzeko agindu zuen, inork haietan defendatu ezin zezan.',
        'Mandatari batzuk Marcillara iritsi ziren aginduarekin. Gazteluan Faltzesko markesa, Ana de Velasco, zen nagusi, senarra kanpoan baitzegoen.',
        'Ana de Velascok ez zuen beldurrik izan. Ateak itxi, defentsa prestatu eta gaztelua emateari uko egin zion.',
        'Mandatariek alde egin behar izan zuten, eta gaztelua salbatu zen: almena batzuk baino ez zizkioten hautsi. Zutik geratu zen gutxienetako bat izan zen.',
      ],
      today: 'Marcillako gaztelua zutik dago oraindik, bere lubaki eta dorreekin, herriaren erdian. Gaur egun kultura-ekitaldietarako erabiltzen da eta bisita daiteke.',
      q: { q: 'Nork defendatu zuen Marcillako gaztelua 1516an?', options: ['Ana de Velasco markesak', 'Karlos III.a erregeak', 'Herensuge batek'], why: 'Ana de Velascok: berari esker, gaztelua zutik dago oraindik.' },
    },
  },
];

export const KIND_LABEL = { leyenda: 'Leyenda', historia: 'Historia real' };
export const cuentoOfTown = (id) => CUENTOS.filter(c => c.towns.includes(id));

// pares castellano → euskera para el traductor del juego
export const EU_CUENTOS = (() => {
  const o = { 'Leyenda': 'Kondaira', 'Historia real': 'Benetako historia', 'Lo que puedes ver hoy': 'Gaur ikus dezakezuna', 'Cuentos y leyendas de Navarra': 'Nafarroako ipuin eta kondairak', 'Leyendas': 'Kondairak' };
  for (const c of CUENTOS) {
    const e = c.eu; if (!e) continue;
    o[c.title] = e.title; o[c.place] = e.place; o[c.today] = e.today; o[c.q.q] = e.q.q; o[c.q.why] = e.q.why;
    c.parts.forEach((p, i) => { o[p] = e.parts[i]; });
    c.q.options.forEach((p, i) => { o[p] = e.q.options[i]; });
  }
  return o;
})();
Object.assign(EU_CUENTOS, { 'Sigue…': 'Jarraitu…', 'Fin': 'Amaiera', 'Saberes · Leyendas': 'Jakintzak · Kondairak', 'Escuchado': 'Entzunda', 'Volver a leerlo': 'Berriz irakurri',
  'Cuentos, leyendas e historias de Navarra': 'Nafarroako ipuinak, kondairak eta historiak', 'Cuentos y leyendas de Navarra: escúchalos en cada pueblo': 'Nafarroako ipuin eta kondairak: entzun herri bakoitzean',
  'En muchos pueblos hay un contador o una contadora de cuentos en la plaza. Escúchales y el cuento se guarda aquí. Cada relato dice si es una leyenda, lo que cuenta la tradición, o una historia que pasó de verdad, y qué puedes ver hoy en ese lugar.': 'Herri askotan ipuin-kontalari bat dago plazan. Entzun iezaiozu, eta ipuina hemen gordeko da. Kontakizun bakoitzak esaten du kondaira bat den, ohiturak kontatzen duena, edo benetan gertatutako historia bat, eta zer ikus dezakezun gaur leku horretan.',
  'Fuentes: Cátedra de Patrimonio de la Universidad de Navarra, Auñamendi Eusko Entziklopedia, Senditur, Noticias de Navarra, culturanavarra.es y los santuarios y ayuntamientos de cada lugar. Las leyendas tienen muchas versiones: aquí está la más contada, adaptada para niños y niñas.': 'Iturriak: Nafarroako Unibertsitateko Ondare Katedra, Auñamendi Eusko Entziklopedia, Senditur, Noticias de Navarra, culturanavarra.es eta leku bakoitzeko santutegi eta udalak. Kondairek bertsio asko dituzte: hemen kontatuena dago, haurrentzat egokitua.',
  'Cuento guardado en tu libro de leyendas (menú · Leyendas)': 'Ipuina zure kondaira-liburuan gorde da (menua · Kondairak)' });
// plantillas con huecos (nombre, pueblo, título): t traduce lo que cae en cada hueco
const V = /[aeiouáéíóú]$/i, ko = (n) => V.test(n) || /[rl]$/.test(n) ? n + 'ko' : /n$/.test(n) ? n + 'go' : n + 'eko', ra = (n) => V.test(n) ? n + 'ra' : /r$/.test(n) ? n + 'rera' : n + 'era',
  ekin = (n) => V.test(n) ? n + 'rekin' : /r$/.test(n) ? n + 'rekin' : n + 'ekin';
export const cuentosRx = (t) => [
  [/^¡Otra vez por aquí, (.+?)! ¿Quieres volver a oír «(.+)»\? Siéntate, que empiezo\.$/, (m, a, b) => `Berriz hemen, ${a}! «${t(b)}» berriz entzun nahi duzu? Eseri, hasiko naiz eta.`],
  [/^Kaixo, (.+?)\. Soy (.+?), (?:la contadora|el contador) de cuentos de (.+?)\. ¿Te cuento (una leyenda|una historia que pasó de verdad)\? Se llama «(.+)»\.$/,
    (m, a, b, c, d, f) => `Kaixo, ${a}. ${b} naiz, ${ko(t(c))} ipuin-kontalaria. ${d === 'una leyenda' ? 'Kondaira bat' : 'Benetan gertatutako istorio bat'} kontatuko dizut? «${t(f)}» du izena.`],
  [/^(Leyenda|Historia real) · ([^\d].*)$/, (m, a, b) => `${a === 'Leyenda' ? 'Kondaira' : 'Benetako historia'} · ${b.split(', ').map(t).join(', ')}`],
  [/^(Leyenda|Historia real) · (\d+) de (\d+)$/, (m, a, b, c) => `${a === 'Leyenda' ? 'Kondaira' : 'Benetako historia'} · ${b}/${c}`],
  [/^(\d+) de (\d+) escuchados$/, '$1/$2 entzunda'],
  [/^Ve a (.+?) y habla con (.+?) en la plaza\.$/, (m, a, b) => `Joan ${ra(t(a))} eta hitz egin ${ekin(b)} plazan.`],
  [/^(.+?): escuchar «(.+)»$/, (m, a, b) => `${a}: «${t(b)}» entzun`],
];
