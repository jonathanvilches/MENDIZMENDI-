// Los comentarios del partido de pelota, como en la tele: el comentarista cuenta la jugada y la explica. Se oyen
// (pelota/voz.js: solo la voz grabada por el autor); escritos solo si se piden en Ajustes. Frases cortas
// según cómo acaba cada tanto, las rachas, la remontada, el tanto de partido y el final. Sin nombres propios ni números:
// así cada frase se puede grabar una vez y vale para todos los partidos (el marcador y los nombres ya los dan los
// rótulos). No comentan todos los tantos: siempre los que importan y, de los demás, más o menos la mitad. Nunca repiten
// la misma frase dos veces seguidas. Cada frase tiene su clave, «tipo-número» (dejada-2), que es el nombre de su archivo
// de audio (src/assets/voz/hombre/es/dejada-2.mp3) y la que sale en el guion de grabación.
import { duoElegido, ponDuo } from '../util/comentarios.js';
export { duoElegido, ponDuo };
// (n: narra la jugada, con la voz del autor; e: la explica, con lo que sabría un ex pelotari, con la segunda voz)
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
    gancho: [['n', 'Gancho a la izquierda, y tanto.'], ['e', 'El gancho busca el rincón de la pared izquierda. Bien jugado.']],
    saque: [['n', '¡Saque directo!'], ['n', 'No llega al saque.'], ['e', 'Un buen saque vale un tanto.']],
    golpe: [['n', 'Buen tanto.'], ['n', 'No llega. Tanto.'], ['n', '¡Qué tanto!'], ['e', 'Ha movido bien al rival hasta encontrar el hueco.']],
    chapa: [['n', 'A la chapa. Tanto regalado.'], ['n', 'La manda a la chapa.'], ['e', 'La chapa suena a metal: por debajo de la raya, tanto perdido.']],
    fuera: [['n', 'Se va fuera.'], ['n', 'Fuera. Ha pegado demasiado.'], ['e', 'Más vale colocar que pegar fuerte y mandarla fuera.']],
    falta: [['n', 'Falta de saque: no ha pasado del cuatro.'], ['e', 'El saque tiene que botar entre el cuatro y el siete.']],
    pasa: [['n', 'Pasa: el saque se ha ido largo.'], ['e', 'Saque pasado: botó más allá del siete.']],
    fallo: [['n', 'Fallo. Sube el tanto al marcador.'], ['n', 'Se equivoca. Tanto regalado.']],
    largo: [['e', '¡Qué peloteo! Eso se nota en las piernas.'], ['e', 'Peloteo larguísimo. La grada lo agradece.']],
    racha: [['e', 'Racha de tantos seguidos. Ha encontrado el sitio.'], ['e', 'Otro más seguido. Hay que cortar esa racha.']],
    iguala: [['n', '¡Igualados! Esto vuelve a empezar.'], ['n', '¡Empate en el marcador! Partido nuevo.']],
    remonta: [['n', '¡Remontada! Se pone por delante.'], ['e', 'Le ha dado la vuelta al partido. Eso es cabeza y piernas.']],
    tantoPartido: [['n', 'Tanto de partido.'], ['n', 'Uno más y se acaba: tanto de partido.']],
    finalYo: [['n', '¡Se acabó! Victoria para ti.'], ['n', '¡Partido ganado! Enhorabuena.']],
    finalRival: [['n', 'Se acabó. Esta vez gana el rival.'], ['n', 'Final del partido. El rival se lleva la victoria.']],
    finalE: [['e', 'Buen partido. Enhorabuena a los dos.'], ['e', 'Así se juega a pelota: con la mano y con la cabeza.']],
    descanso: [['e', 'Descanso: un minuto para respirar.'], ['e', 'Un minuto de descanso. Viene bien para pensar.']],
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
    gancho: [['n', 'Ezkerrerako ganchoa, eta tantoa.'], ['e', 'Ganchoak ezkerreko hormaren txokoa bilatzen du. Ondo jokatua.']],
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
  },
};
// (el rol, para los subtítulos)
// (dos voces: el narrador y el ex pelotari, con la segunda voz: pelota/voz.js)
const ROL = { es: { n: 'Comentarista', e: 'Ex pelotari' }, eu: { n: 'Esataria', e: 'Pilotari ohia' } };
const TIPO = { bote: null, chapa: 'chapa', alta: 'fuera', pared: 'fuera', lado: 'fuera', fuera: 'fuera', largo: 'fuera', falta: 'falta', falta45: 'falta', pasa: 'pasa', pasa45: 'pasa', cuatro: 'fuera' };
const REMATE = { dejada: 'dejada', cortada: 'cortada', dosparedes: 'dosparedes', volea: 'volea', gancho: 'gancho', saque: 'saque' };

export class Comentarios {
  /** lang: 'es' o 'eu'; voz: 'hombre', 'mujer' o 'no' (por defecto, la elegida en Ajustes) */
  constructor(lang = 'es', voz = duoElegido()) {
    this.lang = lang === 'eu' ? 'eu' : 'es'; this.voz = voz === 'no' ? null : voz; this.ult = {}; this.n = 0;
  }
  get on() { return !!this.voz; }
  /** Una frase de la lista k (sin repetir la última de esa lista). Devuelve { id, texto, rol, r, voz } o null */
  frase(k) {
    const L = F[this.lang][k]; if (!L?.length || !this.voz) return null;
    let i = Math.floor(Math.random() * L.length); if (L.length > 1 && i === this.ult[k]) i = (i + 1) % L.length; this.ult[k] = i;
    const [r, texto] = L[i];
    return { id: `${k}-${i + 1}`, texto, rol: ROL[this.lang][r], r, voz: this.voz, lang: this.lang };
  }
  /** Lo que se dice al acabar un tanto. x: el tanto del registro (game.js, stats.log); o: { racha ('seguidos', 'iguala',
   *  'remonta' o ''), n (tantos seguidos), final, gano (el que gana el partido eres tú) } */
  tanto(x, o) {
    if (!this.voz || !x) return null;
    this.n++;
    if (o.final) return this.frase(o.gano ? 'finalYo' : 'finalRival');
    if (o.racha === 'iguala') return this.frase('iguala');
    if (o.racha === 'remonta') return this.frase('remonta');
    if (o.racha === 'seguidos' && o.n >= 3) return this.frase('racha');
    if (x.hits >= 10) return this.frase('largo');
    // (los demás, uno sí y otro no, más o menos: con todos, cansaban)
    if (Math.random() < 0.45) return null;
    return this.frase(x.call === 'bote' ? (REMATE[x.kind] || 'golpe') : (TIPO[x.call] || 'fallo'));
  }
}
