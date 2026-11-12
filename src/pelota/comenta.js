// Los comentarios del partido de pelota, como en la tele: el comentarista cuenta la jugada y la explica. Se oyen
// (pelota/voz.js: solo la voz grabada por el autor); escritos solo si se piden en Ajustes. Frases cortas
// según cómo acaba cada tanto, las rachas, la remontada, el tanto de partido y el final. Sin nombres propios ni números:
// así cada frase se puede grabar una vez y vale para todos los partidos (el marcador y los nombres ya los dan los
// rótulos). No comentan todos los tantos: siempre los que importan y, de los demás, más o menos la mitad. Nunca repiten
// la misma frase dos veces seguidas. Cada frase tiene su clave, «tipo-número» (dejada-2), que es el nombre de su archivo
// de audio (src/assets/voz/hombre/es/dejada-2.mp3) y la que sale en el guion de grabación.
import { duoElegido, ponDuo, vozDe } from '../util/comentarios.js';
export { duoElegido, ponDuo };
// (n: narra la jugada; e: la explica, con lo que sabría un ex pelotari. Las dos, con la voz del autor)
export const F = {
  es: {
    inicio: [['n', 'Buenas tardes y bienvenidos al frontón. Empieza el partido.'], ['n', 'Todo listo en el frontón. ¡Que empiece el partido!'], ['n', 'Buenas tardes. La grada está llena y los pelotaris, preparados.']],
    'rival-rematador': [['e', 'Ojo con el rival: es un rematador, pega muy fuerte.']],
    'rival-defensor': [['e', 'Cuidado con el rival: es un defensor, lo devuelve todo.']],
    'rival-zurdo': [['e', 'Atención: el rival es zurdo, la pelota le sale al revés.']],
    'rival-estratega': [['e', 'El rival es un estratega: juega con la cabeza y busca los huecos.']],
    'estrella-cortada': [['e', 'Su golpe estrella: la cortada.']], 'estrella-dosparedes': [['e', 'Su golpe estrella: la dos paredes.']], 'estrella-gancho': [['e', 'Su golpe estrella: el gancho.']],
    'estrella-dejada': [['e', 'Su golpe estrella: la dejada.']], 'estrella-largo': [['e', 'Su golpe estrella: el pelotazo largo.']],
    dejada: [['n', '¡Qué dejada! Muerta junto al frontis.'], ['n', 'La deja muerta. Nada que hacer.'], ['e', 'Esa dejada pilla al rival atrás. Así se gana.']],
    cortada: [['n', 'Cortada rasa, pegada a la chapa.'], ['n', '¡Qué cortada! Ni la ha visto.'], ['e', 'Cortada baja y fuerte: imposible de devolver.']],
    dosparedes: [['n', '¡A dos paredes! La pelota cruza la cancha.'], ['n', 'Dos paredes de manual.'], ['e', 'Con la pared izquierda, la pelota cambia de lado. Muy buena.']],
    volea: [['n', '¡De volea! Sin dejarla botar.'], ['n', 'Se adelanta y remata de aire.'], ['e', 'Ir a buscarla antes del bote quita tiempo al rival.']],
    // (el gancho: de volea y con la izquierda, girando hacia la derecha, a la contracancha. Las frases de antes decían «a la
    // izquierda» y se quitaron; estas, con su número propio, suenan cuando estén grabadas: tools/guion-voz)
    gancho: [['n', 'Gancho de izquierda a la contracancha, y tanto.', 3], ['e', 'De volea y con la izquierda, el gancho gira y se va a la contracancha. Bien jugado.', 4]],
    saque: [['n', '¡Saque directo!'], ['n', 'No llega al saque.'], ['e', 'Un buen saque vale un tanto.'], ['e', 'Saque bien colocado: el rival ni se ha movido.']],
    golpe: [['n', 'Buen tanto.'], ['n', 'No llega. Tanto.'], ['n', '¡Qué tanto!'], ['e', 'Ha movido bien al rival hasta encontrar el hueco.'], ['e', 'Ha esperado su momento y no ha fallado.'], ['e', 'Tanto bien pensado: primero mover al rival y luego rematar.']],
    chapa: [['n', 'A la chapa. Tanto regalado.'], ['n', 'La manda a la chapa.'], ['e', 'La chapa suena a metal: por debajo de la raya, tanto perdido.'], ['e', 'Por querer apurar tanto, la ha dejado en la chapa.']],
    fuera: [['n', 'Se va fuera.'], ['n', 'Fuera. Ha pegado demasiado.'], ['e', 'Más vale colocar que pegar fuerte y mandarla fuera.'], ['e', 'Ha buscado demasiado la esquina y se le ha ido.']],
    falta: [['n', 'Falta de saque: no ha pasado del cuatro.'], ['e', 'El saque tiene que botar entre el cuatro y el siete.']],
    pasa: [['n', 'Pasa: el saque se ha ido largo.'], ['e', 'Saque pasado: botó más allá del siete.']],
    fallo: [['n', 'Fallo. Sube el tanto al marcador.'], ['n', 'Se equivoca. Tanto regalado.'], ['e', 'Un despiste de nada y el tanto se escapa.']],
    largo: [['e', '¡Qué peloteo! Eso se nota en las piernas.'], ['e', 'Peloteo larguísimo. La grada lo agradece.'], ['e', 'Tanto larguísimo. Ninguno de los dos quería fallar.']],
    racha: [['e', 'Racha de tantos seguidos. Ha encontrado el sitio.'], ['e', 'Otro más seguido. Hay que cortar esa racha.'], ['e', 'Está en racha: todo lo que toca le sale bien.']],
    iguala: [['n', '¡Igualados! Esto vuelve a empezar.'], ['n', '¡Empate en el marcador! Partido nuevo.'], ['e', 'Vuelve a empezar todo: el que mantenga la cabeza fría, gana.']],
    remonta: [['n', '¡Remontada! Se pone por delante.'], ['e', 'Le ha dado la vuelta al partido. Eso es cabeza y piernas.']],
    tantoPartido: [['n', 'Tanto de partido.'], ['n', 'Uno más y se acaba: tanto de partido.'], ['e', 'Momento de nervios: ahora hay que jugar seguro.']],
    finalYo: [['n', '¡Se acabó! Victoria para ti.'], ['n', '¡Partido ganado! Enhorabuena.'], ['e', 'Gran partido: has jugado con la cabeza y con la mano.']],
    finalRival: [['n', 'Se acabó. Esta vez gana el rival.'], ['n', 'Final del partido. El rival se lleva la victoria.'], ['e', 'Hoy no ha salido, pero se ha visto muy buena pelota. A la próxima.']],
    finalE: [['e', 'Buen partido. Enhorabuena a los dos.'], ['e', 'Así se juega a pelota: con la mano y con la cabeza.']],
    descanso: [['e', 'Descanso: un minuto para respirar.'], ['e', 'Un minuto de descanso. Viene bien para pensar.'], ['e', 'Un poco de agua, respirar hondo y otra vez a la cancha.']],
    // (durante el peloteo, cortas: el golpe que se acaba de dar o lo que viene)
    'j-dejada': [['n', '¡Buena dejada!'], ['n', '¡Qué bien la deja!']],
    'j-gancho': [['n', '¡Buen gancho!'], ['n', '¡Qué gancho!']],
    'j-cortada': [['n', '¡Buena cortada!']],
    'j-dosparedes': [['n', '¡Buena dos paredes!']],
    'j-aire': [['n', '¡Al aire!']],
    'j-rebote': [['n', 'Esa puede ir a rebote.'], ['n', '¡Cuidado, que va a rebote!']],
    'j-defensa': [['n', '¡Qué bien defiende!'], ['n', 'La saca desde atrás.']],
    'j-peloteo': [['n', '¡Aguanta, aguanta!'], ['n', '¡Qué peloteo están dando!']],
    // (entre tanto y tanto, para que no se haga el silencio: la mano, el frontis, el material, la grada, el marcador)
    'r-mano': [['e', '¡Qué bien le está entrando la pelota en la mano esta tarde!'], ['e', 'Hoy la mano le responde de maravilla.'], ['e', 'Cuando la mano entra así, la pelota sale sola.']],
    'r-frontis': [['n', '¡Qué bien sale esta pelota del frontis!'], ['n', 'La pelota sale con mucha alegría del frontis.']],
    'r-viva': [['e', 'Este material es muy vivo: sale mucho del frontis.'], ['e', 'Con una pelota tan viva, el rebote está ahí.'], ['e', 'Con esta pelota hay que medir la fuerza: se va larga enseguida.']],
    'r-pesada': [['e', 'Esta pelota es pesada: cuesta mucho llevarla atrás.'], ['e', 'Material muerto: la pelota se queda corta.'], ['e', 'Con una pelota tan pesada, las dejadas valen oro.']],
    'r-grada': [['n', '¡Qué ambiente hay hoy en el frontón!'], ['n', 'La grada está disfrutando de lo lindo.']],
    'r-igualado': [['n', 'Partido muy igualado.'], ['n', 'Esto está muy disputado: nadie se escapa.']],
    'r-consejo': [['e', 'Hay que tener paciencia y esperar el hueco.'], ['e', 'Mover al rival de lado a lado: esa es la clave.'], ['e', 'Si el rival está atrás, una dejada es oro.'], ['e', 'Antes de golpear, hay que mirar dónde está el rival.'], ['e', 'La pared izquierda es una amiga: bien usada, despista a cualquiera.']],
    'r-piernas': [['e', 'Ya se empiezan a notar las piernas.'], ['e', 'Los partidos largos se ganan con las piernas.']],
    // (más relleno, noviembre de 2026: el saque, la energía, el Cuatro y Medio, los campeonatos y la final; los dice Miren)
    'r-saque': [['e', 'El saque es el primer golpe del tanto: hay que pensarlo bien.'], ['e', 'Un saque largo obliga al rival a irse atrás.']],
    'r-energia': [['e', 'Hay que guardar fuerzas: la energía se acaba.'], ['e', 'Las cortadas seguidas cansan mucho. Mejor no abusar.']],
    'r-cuatro': [['e', 'En el Cuatro y Medio no vale ir largo: la pelota tiene que botar antes de la raya.'], ['e', 'Aquí mandan las dejadas y las cortadas: la cancha es corta.']],
    'r-campeonato': [['e', 'Cada tanto cuenta: aquí se juega la txapela.'], ['e', 'En un campeonato no hay ningún partido fácil.']],
    'r-final': [['e', 'Es la final: la txapela está a unos pocos tantos.'], ['e', 'En una final, la cabeza pesa tanto como la mano.']],
    // (al empezar un partido de campeonato, después del saludo: qué campeonato es y qué ronda; match.js, comInicio)
    'camp-mano': [['e', 'Partido del Campeonato Manomanista: mano a mano, en toda la cancha.']],
    'camp-cuatro': [['e', 'Partido del Cuatro y Medio: ojo, que la pelota no puede botar más allá de la raya.']],
    'camp-parejas': [['e', 'Partido de parejas: el delantero remata y el zaguero aguanta atrás.']],
    'camp-fiestas': [['e', 'Torneo de Fiestas: partido corto, así que cada tanto vale oro.']],
    'camp-valles': [['e', 'Desafío de los Valles: en la liguilla, cada partido suma.']],
    'camp-invierno': [['e', 'Copa de Invierno del Cuatro y Medio: frontón cubierto y pelota rápida.']],
    'camp-promesas': [['e', 'Torneo de Promesas: hoy juegan los que empiezan. ¡Mucha suerte a los dos!']],
    'camp-gran': [['e', 'Hoy se juega la Gran Txapela de Navarra, el acontecimiento del año.'], ['e', 'Los mejores pelotaris de toda Navarra, frente a frente. ¡Qué ambiente!']],
    'camp-comarcas': [['e', 'Campeonato de Comarcas: hoy cada uno juega por su comarca.']],
    'ronda-liguilla': [['e', 'Jornada de liguilla: cada victoria acerca a los cuartos.']],
    'ronda-cuartos': [['e', 'Cuartos de final: el que gane, a semifinales.']],
    'ronda-semis': [['e', 'Semifinales: el que gane, a la final.']],
    'ronda-final': [['e', 'Llegamos a la final. Solo uno se pondrá la txapela.']],
  },
  eu: {
    inicio: [['n', 'Arratsalde on eta ongi etorri frontoira. Hasi da partida.'], ['n', 'Dena prest frontoian. Hasi dadila partida!'], ['n', 'Arratsalde on. Harmailak beteta daude, eta pilotariak prest.']],
    'rival-rematador': [['e', 'Kontuz aurkariarekin: errematatzailea da, oso gogor jotzen du.']],
    'rival-defensor': [['e', 'Kontuz aurkariarekin: defendatzailea da, dena itzultzen du.']],
    'rival-zurdo': [['e', 'Adi: aurkaria ezkertia da, pilota alderantziz ateratzen zaio.']],
    'rival-estratega': [['e', 'Aurkaria estratega da: buruarekin jokatzen du eta hutsuneak bilatzen ditu.']],
    'estrella-cortada': [['e', 'Bere kolpe izarra: cortada.']], 'estrella-dosparedes': [['e', 'Bere kolpe izarra: bi pareta.']], 'estrella-gancho': [['e', 'Bere kolpe izarra: ganchoa.']],
    'estrella-dejada': [['e', 'Bere kolpe izarra: utzia.']], 'estrella-largo': [['e', 'Bere kolpe izarra: pilotakada luzea.']],
    dejada: [['n', 'Hau utzia! Pilota hilda frontisaren ondoan.'], ['n', 'Utzi eta hilda. Ezer egiteko ez.'], ['e', 'Utzi horrek atzean harrapatu du aurkaria. Horrela irabazten da.']],
    cortada: [['n', 'Cortada txaparen ondotik.'], ['n', 'Zer cortada! Ez du ikusi ere egin.'], ['e', 'Cortada baxua eta indartsua: ezin itzuli.']],
    dosparedes: [['n', 'Bi paretara! Pilotak kantxa gurutzatu du.'], ['n', 'Bi pareta ederra.'], ['e', 'Ezkerreko hormarekin pilotak aldez aldatzen du. Oso ona.']],
    volea: [['n', 'Boleaz! Botatzen utzi gabe.'], ['n', 'Aurreratu eta airez errematatu du.'], ['e', 'Botea baino lehen joateak denbora kentzen dio aurkariari.']],
    gancho: [['n', 'Ezkerreko ganchoa kontrakantxara, eta tantoa.', 3], ['e', 'Boleaz eta ezkerrarekin, ganchoak biratu eta kontrakantxara doa. Ondo jokatua.', 4]],
    saque: [['n', 'Sake zuzena!'], ['n', 'Ez da sakera iritsi.'], ['e', 'Sake on batek tanto bat balio du.']],
    golpe: [['n', 'Tanto ederra.'], ['n', 'Ez da iritsi. Tantoa.'], ['n', 'Zer tantoa!'], ['e', 'Ondo mugitu du aurkaria, hutsunea aurkitu arte.']],
    chapa: [['n', 'Txapara. Tantoa opari.'], ['n', 'Txapara bidali du.'], ['e', 'Txapak metal hotsa du: marraren azpitik, tantoa galduta.']],
    fuera: [['n', 'Kanpora.'], ['n', 'Kanpora. Gehiegi jo du.'], ['e', 'Hobe kokatzea, gogor jo eta kanpora bidaltzea baino.']],
    falta: [['n', 'Sake falta: ez da laugarren marrara iritsi.'], ['e', 'Sakeak laugarren eta zazpigarren marren artean egin behar du bote.']],
    pasa: [['n', 'Pasa: sakea luzeegi joan da.'], ['e', 'Sake pasatua: zazpigarren marratik harago egin du bote.']],
    fallo: [['n', 'Hutsa. Tantoa markagailura.'], ['n', 'Huts egin du. Tantoa opari.']],
    largo: [['e', 'Zer pilotakada sorta! Hori hanketan nabaritzen da.'], ['e', 'Pilotakada sorta luzea. Harmailek eskertzen dute.']],
    racha: [['e', 'Tantoak jarraian. Lekua aurkitu du.'], ['e', 'Beste bat jarraian. Bolada hori moztu behar da.']],
    iguala: [['n', 'Berdinduta! Dena hasieratik.'], ['n', 'Berdinketa markagailuan! Partida berria.']],
    remonta: [['n', 'Buelta eman dio! Aurrean jarri da.'], ['e', 'Partidari buelta eman dio. Burua eta hankak.']],
    tantoPartido: [['n', 'Partidako tantoa.'], ['n', 'Bat gehiago eta amaitu da: partidako tantoa.']],
    finalYo: [['n', 'Amaitu da! Garaipena zuretzat.'], ['n', 'Partida irabazita! Zorionak.']],
    finalRival: [['n', 'Amaitu da. Oraingoan aurkariak irabazi du.'], ['n', 'Partidaren amaiera. Garaipena aurkariarentzat.']],
    finalE: [['e', 'Partida ona. Zorionak biei.'], ['e', 'Horrela jokatzen da pilotan: eskuarekin eta buruarekin.']],
    descanso: [['e', 'Atsedenaldia: minutu bat arnasa hartzeko.'], ['e', 'Minutu bateko atsedena. Ondo dator pentsatzeko.']],
    'j-dejada': [['n', 'Utzi ederra!'], ['n', 'Zein ondo utzi duen!']],
    'j-gancho': [['n', 'Gantxo ederra!'], ['n', 'Zer gantxoa!']],
    'j-cortada': [['n', 'Cortada ederra!']],
    'j-dosparedes': [['n', 'Bi pareta ederra!']],
    'j-aire': [['n', 'Airez!']],
    'j-rebote': [['n', 'Hori errebotera joan daiteke.'], ['n', 'Kontuz, errebotera doa!']],
    'j-defensa': [['n', 'Zein ondo defendatzen duen!'], ['n', 'Atzetik atera du.']],
    'j-peloteo': [['n', 'Eutsi, eutsi!'], ['n', 'Zer pilotakada sorta ematen ari diren!']],
    'r-mano': [['e', 'Zein ondo sartzen zaion pilota eskura gaur arratsaldean!'], ['e', 'Gaur eskuak primeran erantzuten dio.']],
    'r-frontis': [['n', 'Zein ondo ateratzen den pilota hau frontisetik!'], ['n', 'Pilota alai-alai ateratzen da frontisetik.']],
    'r-viva': [['e', 'Material hau oso bizia da: asko ateratzen da frontisetik.'], ['e', 'Pilota hain biziarekin, errebotea hor dago.']],
    'r-pesada': [['e', 'Pilota hau astuna da: kosta egiten da atzera eramatea.'], ['e', 'Material hila: pilota motz geratzen da.']],
    'r-grada': [['n', 'Zer giroa dagoen gaur frontoian!'], ['n', 'Harmailak gozatzen ari dira.']],
    'r-igualado': [['n', 'Partida oso berdindua.'], ['n', 'Oso lehiatua dago: inor ez da aurrera ateratzen.']],
    'r-consejo': [['e', 'Pazientzia izan behar da, hutsunearen zain.'], ['e', 'Aurkaria alde batetik bestera mugitu: hori da gakoa.']],
    'r-piernas': [['e', 'Hankak nabaritzen hasiak dira.']],
  },
};
// Los dos comentaristas hablan entre ellos de vez en cuando: Iñaki (la voz de hombre) y Miren (la de mujer). Cada diálogo
// (antes él se llamaba Mikel: la voz de mujer, que es de inteligencia artificial, lo decía con el acento en la e; con
// Iñaki suena bien, lo probó el autor) es una pregunta y su respuesta, con la voz fijada ('h' él, 'm' ella); su archivo, «d-<tema>-<n>-<turno>» en la carpeta
// de quien lo dice (src/assets/voz/hombre/es/d-viva-1-1.mp3 y src/assets/voz/mujer/es/d-viva-1-2.mp3). Solo con «Dos
// comentaristas» (Ajustes) y solo si están grabados los dos turnos: si falta uno, se dice la frase de siempre (match.js)
export const DIALOGO = {
  es: {
    inicio: [[['h', 'Buenas tardes. Hoy me acompaña Miren, que sabe mucho de pelota.'], ['m', 'Buenas tardes, Iñaki. ¡Qué ganas tenía de este partido!']],
      [['h', 'Miren, ¿cómo ves el partido de hoy?'], ['m', 'Muy abierto, Iñaki. Puede pasar cualquier cosa.']]],
    tanto: [[['h', '¿Qué te ha parecido, Miren?'], ['m', 'Espectacular, Iñaki. Así se juega a pelota.']]],
    viva: [[['h', 'Este material es muy vivo, ¿no te parece, Miren?'], ['m', 'Sí, Iñaki: sale mucho del frontis y bota alto.']]],
    pesada: [[['m', 'Iñaki, esa pelota pesa: cuesta llevarla atrás.'], ['h', 'Tienes razón, Miren. Hay que pegarle con todo.']]],
    mano: [[['m', 'Iñaki, ¿has visto qué bien le entra la pelota en la mano?'], ['h', 'Lo he visto, Miren. Está en una tarde fantástica.']]],
    igualado: [[['m', 'Esto está muy igualado, Iñaki.'], ['h', 'Muy igualado, Miren: cualquiera lo puede ganar.']]],
    peloteo: [[['h', '¡Qué peloteo, Miren!'], ['m', 'Eso se nota en las piernas, Iñaki.']]],
    grada: [[['h', 'Fíjate en la grada, Miren: no cabe ni un alfiler.'], ['m', '¡Qué ambiente, Iñaki! Da gusto.']]],
    descanso: [[['h', 'Descanso. ¿Qué harías tú ahora, Miren?'], ['m', 'Respirar hondo y pensar el siguiente saque, Iñaki.']]],
    final: [[['h', 'Hasta aquí el partido. Gracias por acompañarme, Miren.'], ['m', 'Gracias a ti, Iñaki. Ha sido un placer.']]],
  },
  eu: {
    inicio: [[['h', 'Arratsalde on. Gaur Miren dut ondoan, pilotaz asko dakiena.'], ['m', 'Arratsalde on, Iñaki. Zer gogo nituen partida honen!']],
      [['h', 'Miren, nola ikusten duzu gaurko partida?'], ['m', 'Oso irekia, Iñaki. Edozer gerta daiteke.']]],
    tanto: [[['h', 'Zer iruditu zaizu, Miren?'], ['m', 'Ikusgarria, Iñaki. Horrela jokatzen da pilotan.']]],
    viva: [[['h', 'Material hau oso bizia da, ez zaizu iruditzen, Miren?'], ['m', 'Bai, Iñaki: asko ateratzen da frontisetik eta gora egiten du bote.']]],
    pesada: [[['m', 'Iñaki, pilota horrek pisua du: kosta egiten da atzera eramatea.'], ['h', 'Arrazoi duzu, Miren. Indar guztiarekin jo behar zaio.']]],
    mano: [[['m', 'Iñaki, ikusi duzu zein ondo sartzen zaion pilota eskura?'], ['h', 'Ikusi dut, Miren. Arratsalde zoragarria du.']]],
    igualado: [[['m', 'Oso berdindua dago hau, Iñaki.'], ['h', 'Oso berdindua, Miren: edonork irabaz dezake.']]],
    peloteo: [[['h', 'Zer pilotakada sorta, Miren!'], ['m', 'Hori hanketan nabaritzen da, Iñaki.']]],
    grada: [[['h', 'Begira harmailei, Miren: ez dago leku hutsik.'], ['m', 'Zer giroa, Iñaki! Gustura egoteko modukoa.']]],
    descanso: [[['h', 'Atsedenaldia. Zuk zer egingo zenuke orain, Miren?'], ['m', 'Arnasa sakon hartu eta hurrengo sakea pentsatu, Iñaki.']]],
    final: [[['h', 'Hemen bukatu da partida. Eskerrik asko nirekin egoteagatik, Miren.'], ['m', 'Eskerrik asko zuri, Iñaki. Plazer bat izan da.']]],
  },
};
const QUIEN = { es: { h: 'Iñaki', m: 'Miren' }, eu: { h: 'Iñaki', m: 'Miren' } };
// (de qué tema de relleno sale cada diálogo)
const R2D = { 'r-viva': 'viva', 'r-pesada': 'pesada', 'r-mano': 'mano', 'r-igualado': 'igualado', 'r-grada': 'grada' };

// (el rol, para los subtítulos)
// (una sola voz, la del autor: el mismo comentarista narra y explica; pelota/voz.js)
const ROL = { es: { n: 'Comentarista', e: 'Comentarista' }, eu: { n: 'Esataria', e: 'Esataria' } };
const TIPO = { bote: null, chapa: 'chapa', alta: 'fuera', pared: 'fuera', lado: 'fuera', fuera: 'fuera', largo: 'fuera', falta: 'falta', falta45: 'falta', pasa: 'pasa', pasa45: 'pasa', cuatro: 'fuera' };
const REMATE = { dejada: 'dejada', cortada: 'cortada', dosparedes: 'dosparedes', volea: 'volea', gancho: 'gancho', saque: 'saque' };

export class Comentarios {
  /** lang: 'es' o 'eu'; voz: 'duo', 'hombre', 'mujer' o 'no' (por defecto, lo elegido en Ajustes) */
  constructor(lang = 'es', voz = duoElegido()) {
    this.lang = lang === 'eu' ? 'eu' : 'es'; this.voz = voz === 'no' ? null : voz; this.ult = {}; this.n = 0;
  }
  get on() { return !!this.voz; }
  /** Una frase de la lista k (sin repetir la última de esa lista). Devuelve { id, texto, rol, r, voz } o null */
  frase(k) {
    // (en euskera, las que aún no tienen su texto, en castellano: la grabación ya lo hacía, voz.js)
    const L = F[this.lang][k]?.length ? F[this.lang][k] : F.es[k]; if (!L?.length || !this.voz) return null;
    // (cualquiera de la lista, sin repetir la última; quién la dice, util/comentarios.js, vozDe)
    let idx = L.map((_, j) => j);
    if (idx.length > 1) idx = idx.filter(j => j !== this.ult[k]);
    const i = idx[Math.floor(Math.random() * idx.length)]; this.ult[k] = i;
    const [r, texto, num] = L[i];   // (num: el número de su grabación, si no es el de su sitio en la lista)
    return { id: `${k}-${num ?? i + 1}`, texto, rol: ROL[this.lang][r], r, voz: vozDe(this.voz, r), lang: this.lang };
  }
  /** Lo que se dice al acabar un tanto. x: el tanto del registro (game.js, stats.log); o: { racha ('seguidos', 'iguala',
   *  'remonta' o ''), n (tantos seguidos), final, gano (el que gana el partido eres tú), y para el relleno: bola ('viva',
   *  'pesada' o 'media'), mano (tantos limpios seguidos del mismo), igualado, tantos (los jugados) } */
  tanto(x, o) {
    if (!this.voz || !x) return null;
    this.n++;
    if (o.final) return this.frase(o.gano ? 'finalYo' : 'finalRival');
    if (o.racha === 'iguala') return this.frase('iguala');
    if (o.racha === 'remonta') return this.frase('remonta');
    if (o.racha === 'seguidos' && o.n >= 3) return this.frase('racha');
    if (x.hits >= 10) return this.frase('largo');
    // (si durante el peloteo ya se ha comentado la jugada, no se repite: algo de relleno o nada)
    if (o.yaDicho) return Math.random() < 0.35 ? this.relleno(o) : null;
    // (de los demás, uno de cada tres sin la jugada: en su lugar, algo de relleno —la mano, el frontis, el material—, para
    // que no se haga el silencio; y alguno, nada)
    const r = Math.random();
    if (r < 0.3) return this.relleno(o);
    if (r < 0.42) return null;
    return this.frase(x.call === 'bote' ? (REMATE[x.kind] || 'golpe') : (TIPO[x.call] || 'fallo'));
  }
  /** Durante el peloteo, una frase corta del golpe que se acaba de dar (e, el evento 'hit' de game.js; n, los golpes del
   *  peloteo; prof, lo hondo que está quien golpea, en metros desde el frontis). No en cada golpe: como mucho una cada
   *  pocos segundos (t, el reloj del partido) y no siempre */
  enJuego(e, n, t, prof = 0) {
    // (el gancho, siempre que haya uno y no acabe de hablar: es raro y vistoso, y el autor echaba en falta oírlo. Antes iba
    // como los demás, en cuatro de cada diez y desde el segundo golpe del peloteo, y casi nunca se oía; noviembre de 2026)
    const gancho = e?.shot === 'gancho';
    if (!this.voz || !e || (n < 2 && !gancho) || t - (this.jT ?? -99) < (gancho ? 2.5 : 4.5)) return null;
    let k = null;
    if (e.shot === 'dejada' && e.q > 0.45) k = 'j-dejada';
    else if (e.shot === 'gancho') k = 'j-gancho';
    else if (e.shot === 'cortada' && e.q > 0.45) k = 'j-cortada';
    else if (e.shot === 'dosparedes') k = 'j-dosparedes';
    else if (e.shot === 'rebote' || e.shot === 'largo' && (e.pow ?? 0) > 0.85) k = 'j-rebote';
    else if (e.volea && e.q > 0.4) k = 'j-aire';
    else if (prof > 25 && n > 3) k = 'j-defensa';
    else if (n === 8) k = 'j-peloteo';
    if (!k || (k !== 'j-gancho' && Math.random() > (k === 'j-peloteo' ? 0.8 : 0.42))) return null;
    this.jT = t; return this.frase(k);
  }
  /** Un diálogo entre los dos (solo con «Dos comentaristas»): los turnos como frases con la voz fijada (estricta: sin la
   *  otra voz de repuesto), o null. match.js los dice uno detrás de otro si están grabados todos */
  dialogo(k) {
    const L = DIALOGO[this.lang][k]; if (!L?.length || this.voz !== 'duo') return null;
    let idx = L.map((_, j) => j); if (idx.length > 1) idx = idx.filter(j => j !== this.ult['d-' + k]);
    const i = idx[Math.floor(Math.random() * idx.length)]; this.ult['d-' + k] = i;
    return L[i].map(([q, texto], t) => ({ id: `d-${k}-${i + 1}-${t + 1}`, texto, rol: QUIEN[this.lang][q], r: q === 'h' ? 'n' : 'e', voz: q === 'h' ? 'hombre' : 'mujer', lang: this.lang, estricta: true }));
  }
  /** Algo de relleno entre tantos, según cómo va el partido (o: lo de tanto). Con los dos comentaristas, a veces se lo
   *  cuentan entre ellos: devuelve entonces el diálogo (una lista) con la frase suelta de repuesto (.solo) */
  relleno(o = {}) {
    if (!this.voz) return null;
    const ops = ['r-frontis', 'r-grada', 'r-consejo'];
    if ((o.mano || 0) >= 2) ops.push('r-mano', 'r-mano');
    if (o.bola === 'viva') ops.push('r-viva', 'r-viva'); else if (o.bola === 'pesada') ops.push('r-pesada', 'r-pesada');
    if (o.igualado) ops.push('r-igualado', 'r-igualado');
    if ((o.tantos || 0) >= 14) ops.push('r-piernas');
    // (y el saque, la energía pasada la mitad, el Cuatro y Medio, el campeonato y la final)
    ops.push('r-saque');
    if ((o.tantos || 0) >= 10) ops.push('r-energia');
    if (o.cuatro) ops.push('r-cuatro', 'r-cuatro');
    if (o.laFinal) ops.push('r-final', 'r-final'); else if (o.campeonato) ops.push('r-campeonato');   // (laFinal: la de un campeonato; final es el fin del partido)
    // (sin repetir el tema del último relleno)
    const libres = ops.filter(k => k !== this.ultR), k = (libres.length ? libres : ops)[Math.floor(Math.random() * (libres.length || ops.length))];
    this.ultR = k; const f = this.frase(k);
    if (R2D[k] && this.voz === 'duo' && Math.random() < 0.45) { const d = this.dialogo(R2D[k]); if (d) { d.solo = f; return d; } }
    return f;
  }
}
