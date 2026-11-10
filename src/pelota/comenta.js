// Los comentarios del partido de pelota, como en la tele: un dúo, una narradora o un narrador que cuenta la jugada y una
// ex pelotari o un ex pelotari que la explica. Frases cortas, en texto, según cómo acaba cada tanto, el marcador, las
// rachas y el frontón (su nombre y lo que se nota en él: rules.js, courtFeel). No comentan todos los tantos: siempre los
// que importan (remontada, racha, tanto de partido, final, un peloteo largo) y, de los demás, más o menos la mitad. Nunca
// repiten la misma frase dos veces seguidas. El dúo se elige en Ajustes (o se quitan): herrizherri-comentarios.
// Los dúos son inventados: no son locutores ni pelotaris de verdad.
import { duoElegido, ponDuo } from '../util/comentarios.js';
export { duoElegido, ponDuo };
export const DUOS = {
  a: { n: 'Maite', e: 'Patxi', rol: { es: { n: 'Narradora', e: 'Ex pelotari' }, eu: { n: 'Esataria', e: 'Pilotari ohia' } } },
  b: { n: 'Unai', e: 'Garazi', rol: { es: { n: 'Narrador', e: 'Ex pelotari' }, eu: { n: 'Esataria', e: 'Pilotari ohia' } } },
};
// las frases: [quién habla ('n' narra, 'e' explica), texto]. {w} gana el tanto, {l} lo pierde, {h} pelotazos, {n} número,
// {a}-{b} el marcador, {t} a cuántos tantos, {f} el frontón, {r} el rival, {arq} su arquetipo, {g} su golpe estrella
const F = {
  es: {
    inicio: [['n', 'Buenas tardes. Lugar: {f}. Partido a {t} tantos entre {a} y {b}.'], ['n', 'Todo listo. {a} y {b}, a {t} tantos. Lugar: {f}.']],
    rival: [['e', '{r} es {arq}. Su golpe estrella: {g}.'], ['e', 'Ojo con {r}: es {arq} y su golpe estrella es {g}.']],
    frontón: [['e', 'Un detalle de este frontón: {what}']],
    dejada: [['n', '¡Qué dejada de {w}! Muerta junto al frontis.'], ['n', '{w} la deja muerta. Nada que hacer.'], ['e', 'Esa dejada pilla a {l} atrás. Así se gana.']],
    cortada: [['n', 'Cortada rasa de {w}, pegada a la chapa.'], ['n', '¡Qué cortada! {l} ni la ve.'], ['e', 'Cortada baja y fuerte: imposible de devolver.']],
    dosparedes: [['n', '¡A dos paredes! {w} cruza la pelota.'], ['n', 'Dos paredes de manual: tanto para {w}.'], ['e', 'Con la pared izquierda, la pelota cambia de lado. Muy buena.']],
    volea: [['n', '¡De volea! {w} no la deja botar.'], ['n', '{w} se adelanta y remata de aire.'], ['e', 'Ir a buscarla antes del bote quita tiempo al rival.']],
    gancho: [['n', 'Gancho a la izquierda y tanto de {w}.'], ['e', 'El gancho busca el rincón de la pared izquierda. Bien jugado.']],
    saque: [['n', 'Saque directo de {w}.'], ['n', '{l} no llega al saque.'], ['e', 'Un buen saque vale un tanto. Hoy {w} lo está demostrando.']],
    golpe: [['n', 'Tanto para {w}.'], ['n', '{l} no llega. Punto para {w}.'], ['n', 'Buen tanto de {w}.'], ['e', '{w} ha movido bien a {l} hasta encontrar el hueco.']],
    chapa: [['n', 'A la chapa. Tanto regalado para {w}.'], ['n', '{l} la manda a la chapa.'], ['e', 'La chapa suena a metal: por debajo de la raya, tanto perdido.']],
    fuera: [['n', 'Se le va fuera a {l}.'], ['n', 'Fuera. {l} ha pegado demasiado.'], ['e', 'Más vale colocar que pegar fuerte y mandarla fuera.']],
    falta: [['n', 'Falta de saque: no ha pasado del cuatro.'], ['e', 'El saque tiene que botar entre el cuatro y el siete.']],
    pasa: [['n', 'Pasa: el saque se ha ido largo.'], ['e', 'Saque pasado: botó más allá del siete.']],
    fallo: [['n', 'Fallo de {l}. Tanto para {w}.'], ['n', 'Se equivoca {l}. Sube el tanto para {w}.']],
    largo: [['e', '¡{h} pelotazos! Eso se nota en las piernas.'], ['e', 'Qué peloteo: {h} golpes. La grada lo agradece.']],
    racha: [['e', '{w} ha encontrado el sitio: {n} seguidos.'], ['e', '{n} tantos seguidos de {w}. Hay que cortar esa racha.']],
    iguala: [['n', '¡Partido nuevo! Empate a {n}.'], ['n', '¡Igualados a {n}! Esto vuelve a empezar.']],
    remonta: [['n', '¡Remontada! {w} se pone por delante.'], ['e', 'Ha dado la vuelta al partido. Eso es cabeza y piernas.']],
    tantoPartido: [['n', 'Tanto de partido para {w}.'], ['n', 'Uno más y se acaba: tanto de partido.']],
    final: [['n', '¡Se acabó! {w} gana {a}-{b}.'], ['n', 'Final del partido: {w}, {a}-{b}.']],
    finalE: [['e', 'Buen partido. Enhorabuena a los dos.'], ['e', 'Así se juega a pelota: con la mano y con la cabeza.']],
    descanso: [['e', 'Descanso: un minuto para respirar.'], ['e', 'Un minuto de descanso. Viene bien para pensar.']],
  },
  eu: {
    inicio: [['n', 'Arratsalde on! Gaurko lekua: {f}. {t} tantorako partida: {a} eta {b}.'], ['n', 'Dena prest. {a} eta {b}, {t} tantora. Lekua: {f}.']],
    rival: [['e', '{r} {arq} da. Bere kolpe izarra: {g}.'], ['e', 'Kontuz: {r} {arq} da, eta bere kolpe izarra: {g}.']],
    frontón: [['e', 'Pilotaleku honen xehetasun bat: {what}']],
    dejada: [['n', 'Hau utzia! Pilota hilda frontisaren ondoan. Tantoa: {w}.'], ['n', 'Utzi eta hilda. Tantoa: {w}.'], ['e', 'Utzi horrek atzean harrapatu du aurkaria. Horrela irabazten da.']],
    cortada: [['n', 'Cortada txaparen ondotik. Tantoa: {w}.'], ['n', 'Zer cortada! {l} ez da iritsi ere egin.'], ['e', 'Cortada baxua eta indartsua: ezin itzuli.']],
    dosparedes: [['n', 'Bi paretara! Pilota gurutzatuta. Tantoa: {w}.'], ['n', 'Bi pareta ederra. Tantoa: {w}.'], ['e', 'Ezkerreko hormarekin pilotak aldez aldatzen du. Oso ona.']],
    volea: [['n', 'Boleaz! Botatzen utzi gabe. Tantoa: {w}.'], ['n', 'Airez errematatua. Tantoa: {w}.'], ['e', 'Botea baino lehen joateak denbora kentzen dio aurkariari.']],
    gancho: [['n', 'Ezkerrerako ganchoa. Tantoa: {w}.'], ['e', 'Ganchoak ezkerreko hormaren txokoa bilatzen du. Ondo jokatua.']],
    saque: [['n', 'Sake zuzena. Tantoa: {w}.'], ['n', '{l} ez da sakera iritsi.'], ['e', 'Sake on batek tanto bat balio du.']],
    golpe: [['n', 'Tantoa: {w}.'], ['n', '{l} ez da iritsi. Tantoa: {w}.'], ['n', 'Tanto ederra. Irabazlea: {w}.'], ['e', 'Ondo mugitu du aurkaria, hutsunea aurkitu arte.']],
    chapa: [['n', 'Txapara. Tantoa opari: {w}.'], ['n', 'Txapara bidali du. Tantoa: {w}.'], ['e', 'Txapak metal hotsa du: marraren azpitik, tantoa galduta.']],
    fuera: [['n', 'Kanpora. Tantoa: {w}.'], ['n', 'Gehiegi jo du, kanpora.'], ['e', 'Hobe kokatzea, gogor jo eta kanpora bidaltzea baino.']],
    falta: [['n', 'Sake falta: ez da laugarren koadrora iritsi.'], ['e', 'Sakeak laugarren eta zazpigarren marren artean egin behar du bote.']],
    pasa: [['n', 'Pasa: sakea luzeegi joan da.'], ['e', 'Sake pasatua: zazpigarren marratik harago egin du bote.']],
    fallo: [['n', 'Hutsa. Tantoa: {w}.'], ['n', 'Huts egin du. Tantoa: {w}.']],
    largo: [['e', '{h} pilotakada! Hori hanketan nabaritzen da.'], ['e', 'Zer pilotakada sorta: {h} kolpe!']],
    racha: [['e', '{w}: {n} tanto jarraian. Lekua aurkitu du.'], ['e', '{n} jarraian! Bolada hori moztu behar da.']],
    iguala: [['n', 'Partida berria! {n}-{n} berdin.'], ['n', 'Berdin {n}-{n}! Dena hasieratik.']],
    remonta: [['n', 'Buelta eman dio! {w} aurrean.'], ['e', 'Partidari buelta eman dio. Burua eta hankak.']],
    tantoPartido: [['n', 'Partidarako tantoa: {w}.'], ['n', 'Bat gehiago eta bukatu: partidarako tantoa.']],
    final: [['n', 'Amaitu da! Irabazlea: {w}, {a}-{b}.'], ['n', 'Partidaren amaiera: {w}, {a}-{b}.']],
    finalE: [['e', 'Partida ona. Zorionak biei.'], ['e', 'Horrela jokatzen da pilotan: eskuarekin eta buruarekin.']],
    descanso: [['e', 'Atsedena: minutu bat arnasa hartzeko.'], ['e', 'Minutu bateko atsedena. Pentsatzeko ondo dator.']],
  },
};
const TIPO = { bote: null, chapa: 'chapa', alta: 'fuera', pared: 'fuera', lado: 'fuera', fuera: 'fuera', largo: 'fuera', falta: 'falta', falta45: 'falta', pasa: 'pasa', pasa45: 'pasa', cuatro: 'fuera' };
const REMATE = { dejada: 'dejada', cortada: 'cortada', dosparedes: 'dosparedes', volea: 'volea', gancho: 'gancho', saque: 'saque' };

export class Comentarios {
  /** lang: 'es' o 'eu'; duo: 'a', 'b' o 'no' (por defecto, el elegido en Ajustes) */
  constructor(lang = 'es', duo = duoElegido()) {
    this.lang = lang === 'eu' ? 'eu' : 'es'; this.duo = DUOS[duo] ? duo : null; this.ult = {}; this.t = 0; this.desde = -9; this.n = 0;
  }
  get on() { return !!this.duo; }
  /** Una frase de la lista k (sin repetir la última de esa lista), con sus huecos rellenos. Devuelve { quien, rol, texto } */
  frase(k, v = {}) {
    const L = F[this.lang][k]; if (!L?.length || !this.duo) return null;
    let i = Math.floor(Math.random() * L.length); if (L.length > 1 && i === this.ult[k]) i = (i + 1) % L.length; this.ult[k] = i;
    const [r, tx] = L[i], D = DUOS[this.duo];
    return { quien: D[r], rol: D.rol[this.lang][r], texto: tx.replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? '')), r };
  }
  /** Lo que se dice al acabar un tanto. x: el tanto del registro (game.js, stats.log); o: { w, l (nombres), racha
   *  ('seguidos', 'iguala', 'remonta' o ''), n, partido (tanto de partido), final, a, b (marcador), f } */
  tanto(x, o) {
    if (!this.duo || !x) return null;
    this.n++;
    if (o.final) return this.frase('final', o);
    if (o.racha === 'iguala') return this.frase('iguala', o);
    if (o.racha === 'remonta') return this.frase('remonta', o);
    if (o.racha === 'seguidos' && o.n >= 3) return this.frase('racha', o);
    if (x.hits >= 10) return this.frase('largo', { ...o, h: x.hits });
    // (los demás, uno sí y otro no, más o menos: con todos, cansaban)
    if (Math.random() < 0.45) return null;
    const tipo = x.call === 'bote' ? (REMATE[x.kind] || 'golpe') : (TIPO[x.call] || 'fallo');
    return this.frase(tipo, { ...o, h: x.hits });
  }
}
