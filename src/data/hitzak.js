// Palabras en euskera que enseñan los vecinos del pueblo. Cada vecino enseña una palabra de lo que está haciendo
// (quien va a por agua, «ura»; quien lleva el pan, «ogia»; quien pasea con lluvia, «euria») y te pregunta si la
// recuerdas. Las que aprendes se guardan en el cuaderno del pueblo (pestaña Euskera) y se repasan con otros vecinos.
// Cada palabra: [euskera, castellano]. El castellano lleva su artículo, como se diría al hablar.
export const HITZAK = {
  base: [['Kaixo', 'hola'], ['Eskerrik asko', 'gracias'], ['Mesedez', 'por favor'], ['Bai', 'sí'], ['Ez', 'no'], ['Agur', 'adiós'],
    ['herria', 'el pueblo'], ['txakurra', 'el perro'], ['ardia', 'la oveja'], ['behia', 'la vaca']],
  misa: [['eliza', 'la iglesia'], ['kanpaia', 'la campana'], ['dorrea', 'la torre'], ['igandea', 'el domingo']],
  compra: [['denda', 'la tienda'], ['gazta', 'el queso'], ['saskia', 'la cesta'], ['dirua', 'el dinero'], ['sagarra', 'la manzana']],
  tertulia: [['Zer moduz?', '¿qué tal?'], ['ondo', 'bien'], ['laguna', 'el amigo, la amiga'], ['Gero arte', 'hasta luego']],
  juego: [['jolastu', 'jugar'], ['korrika', 'corriendo'], ['pilota', 'la pelota'], ['irabazi', 'ganar']],
  fuente: [['ura', 'el agua'], ['iturria', 'la fuente'], ['ibaia', 'el río'], ['hotza', 'frío']],
  pan: [['ogia', 'el pan'], ['etxea', 'la casa'], ['labea', 'el horno'], ['goxoa', 'rico, sabroso']],
  paseo: [['mendia', 'el monte'], ['basoa', 'el bosque'], ['zuhaitza', 'el árbol'], ['bidea', 'el camino'], ['txoria', 'el pájaro']],
  tiempo: [['eguzkia', 'el sol'], ['euria', 'la lluvia'], ['elurra', 'la nieve'], ['gaua', 'la noche'], ['ilargia', 'la luna']],
};
// el título de cada grupo en el cuaderno
export const HITZAK_TEMA = { base: 'Para empezar', misa: 'En la iglesia', compra: 'De compras', tertulia: 'Charlando en la plaza', juego: 'Jugando en la calle',
  fuente: 'En la fuente', pan: 'El pan', paseo: 'De paseo', tiempo: 'El tiempo que hace' };
const ALL = Object.values(HITZAK).flat();
export const HITZAK_N = ALL.length;

/** La palabra que toca enseñar: la primera que aún no sabes de lo que hace el vecino (con el tiempo de ahora delante),
 *  y si no, de las de empezar. null si ya las sabes todas. */
export function nextWord(theme, known, weather = null) {
  const T = HITZAK.tiempo.filter(([eu]) => eu === weather);
  for (const w of [...T, ...(HITZAK[theme] || []), ...HITZAK.base]) if (!known[w[0]]) return w;
  return null;
}
/** Una palabra ya aprendida para repasarla: mejor una que fallaste (1) que una que acertaste (2). */
export function reviewWord(known, rnd = Math.random) {
  const K = ALL.filter(([eu]) => known[eu]); if (!K.length) return null;
  const weak = K.filter(([eu]) => known[eu] < 2), L = weak.length ? weak : K;
  return L[Math.floor(rnd() * L.length)];
}
/** Tres opciones en euskera para la pregunta: la buena y dos más, en orden revuelto. */
export function choicesFor(w, rnd = Math.random) {
  const others = ALL.filter(x => x[0] !== w[0]), out = [w[0]];
  while (out.length < 3) { const o = others[Math.floor(rnd() * others.length)][0]; if (!out.includes(o)) out.push(o); }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
// Conversaciones cortas: el vecino te dice algo en euskera y tú eliges qué contestar entre tres frases (las otras dos
// también son frases de verdad, pero no pegan ahí). Cada una, [euskera, castellano]: a, lo que dice el vecino; ok, la
// respuesta; no, las dos que no van; fin, cómo acaba él. {izena} es tu nombre. need: cuándo sale (gaua, de noche;
// eguna, de día; perro, si va contigo; euria, elurra o argia, con ese tiempo).
export const HIZKETAK = [
  { id: 'zer-moduz', a: ['Kaixo! Zer moduz?', '¡Hola! ¿Qué tal?'], ok: ['Ondo, eskerrik asko. Eta zu?', 'Bien, gracias. ¿Y tú?'], no: [['Plazara noa.', 'Voy a la plaza.'], ['Ez horregatik.', 'De nada.']], fin: ['Ni ere ondo!', '¡Yo también bien!'] },
  { id: 'egun-on', need: 'eguna', a: ['Egun on!', '¡Buenos días!'], ok: ['Egun on! Zer moduz?', '¡Buenos días! ¿Qué tal?'], no: [['Gabon!', '¡Buenas noches!'], ['Ogi bat, mesedez.', 'Un pan, por favor.']], fin: ['Oso ondo, eskerrik asko!', '¡Muy bien, gracias!'] },
  { id: 'gabon', need: 'gaua', a: ['Gabon! Berandu da.', '¡Buenas noches! Es tarde.'], ok: ['Gabon! Etxera noa.', '¡Buenas noches! Me voy a casa.'], no: [['Egun on!', '¡Buenos días!'], ['Bai, noski!', '¡Sí, claro!']], fin: ['Ondo lo egin!', '¡Que duermas bien!'] },
  { id: 'izena', a: ['Nola duzu izena?', '¿Cómo te llamas?'], ok: ['Nire izena {izena} da.', 'Me llamo {izena}.'], no: [['Nafarroakoa naiz.', 'Soy de Navarra.'], ['Agur, gero arte!', '¡Adiós, hasta luego!']], fin: ['Pozten naiz, {izena}!', '¡Me alegro, {izena}!'] },
  { id: 'nongoa', a: ['Nongoa zara?', '¿De dónde eres?'], ok: ['Nafarroakoa naiz.', 'Soy de Navarra.'], no: [['Ogi bat, mesedez.', 'Un pan, por favor.'], ['Gabon!', '¡Buenas noches!']], fin: ['Ni ere bai! Hemengoa naiz.', '¡Yo también! Soy de aquí.'] },
  { id: 'nora', a: ['Nora zoaz?', '¿Adónde vas?'], ok: ['Plazara noa.', 'Voy a la plaza.'], no: [['Ondo, eskerrik asko.', 'Bien, gracias.'], ['Nire izena {izena} da.', 'Me llamo {izena}.']], fin: ['Ederki! Ondo pasa!', '¡Estupendo! ¡Que lo pases bien!'] },
  { id: 'eguraldia', a: ['Zer eguraldi dago gaur?', '¿Qué tiempo hace hoy?'], ok: null, no: null, fin: ['Bai, hala da!', '¡Sí, así es!'] },   // (la respuesta, la del cielo de ahora: EGURALDIA)
  { id: 'erosi', a: ['Kaixo! Zer nahi duzu?', '¡Hola! ¿Qué quieres?'], ok: ['Ogi bat, mesedez.', 'Un pan, por favor.'], no: [['Nafarroakoa naiz.', 'Soy de Navarra.'], ['Ez horregatik!', '¡De nada!']], fin: ['Hemen duzu!', '¡Aquí tienes!'] },
  { id: 'jolastu', a: ['Pilotan jolastu nahi duzu?', '¿Quieres jugar a pelota?'], ok: ['Bai, noski!', '¡Sí, claro!'], no: [['Banoa etxera.', 'Me voy a casa.'], ['Ogi bat, mesedez.', 'Un pan, por favor.']], fin: ['Goazen frontoira!', '¡Vamos al frontón!'] },
  { id: 'gustuko', a: ['Zer gustatzen zaizu?', '¿Qué te gusta?'], ok: ['Mendira joatea gustatzen zait.', 'Me gusta ir al monte.'], no: [['Egun on!', '¡Buenos días!'], ['Hor dago, plazaren ondoan.', 'Ahí está, junto a la plaza.']], fin: ['Niri ere bai!', '¡A mí también!'] },
  { id: 'barkatu', a: ['Barkatu, non dago eliza?', 'Perdona, ¿dónde está la iglesia?'], ok: ['Hor dago, plazaren ondoan.', 'Ahí está, junto a la plaza.'], no: [['Mendira joatea gustatzen zait.', 'Me gusta ir al monte.'], ['Gabon!', '¡Buenas noches!']], fin: ['Eskerrik asko!', '¡Muchas gracias!'] },
  { id: 'eskerrak', a: ['Eskerrik asko laguntzeagatik!', '¡Gracias por ayudarme!'], ok: ['Ez horregatik!', '¡De nada!'], no: [['Nola duzu izena?', '¿Cómo te llamas?'], ['Plazara noa.', 'Voy a la plaza.']], fin: ['Oso atsegina zara!', '¡Eres muy amable!'] },
  { id: 'txakurra', need: 'perro', a: ['Zure txakurra da?', '¿Es tu perro?'], ok: ['Bai, nire txakurra da.', 'Sí, es mi perro.'], no: [['Nafarroakoa naiz.', 'Soy de Navarra.'], ['Ogi bat, mesedez.', 'Un pan, por favor.']], fin: ['Oso polita da!', '¡Es muy bonito!'] },
  { id: 'agur', a: ['Banoa etxera. Agur!', 'Me voy a casa. ¡Adiós!'], ok: ['Agur, gero arte!', '¡Adiós, hasta luego!'], no: [['Kaixo! Zer moduz?', '¡Hola! ¿Qué tal?'], ['Pilotan jolastu nahi duzu?', '¿Quieres jugar a pelota?']], fin: ['Gero arte!', '¡Hasta luego!'] },
];
export const HIZKETAK_N = HIZKETAK.length;
// el tiempo que hace: la buena es la del cielo de ahora y las otras dos no (hay que mirar al cielo)
const EGURALDIA = { argia: ['Eguraldi ona dago.', 'Hace buen tiempo.'], euria: ['Euria ari du.', 'Está lloviendo.'], elurra: ['Elurra ari du.', 'Está nevando.'] };
/** La conversación que toca: la primera que aún no has acertado y vale para ahora (ctx: { gaua, perro, eguraldia:
 *  'argia' | 'euria' | 'elurra' }), y si ya las sabes todas, una para repasar. Con la respuesta del tiempo ya puesta. */
export function nextHizketa(known, ctx, rnd = Math.random) {
  const vale = (h) => !h.need || (h.need === 'gaua' ? ctx.gaua : h.need === 'eguna' ? !ctx.gaua : !!ctx[h.need]);
  const L = HIZKETAK.filter(vale), h = L.find(x => (known[x.id] || 0) < 2) || L[Math.floor(rnd() * L.length)];
  if (!h || h.ok) return h || null;
  const e = EGURALDIA[ctx.eguraldia] ? ctx.eguraldia : 'argia';
  return { ...h, ok: EGURALDIA[e], no: Object.entries(EGURALDIA).filter(([k]) => k !== e).map(([, v]) => v) };
}
/** La conversación en el cuaderno: la pregunta y la respuesta, con la del tiempo de cuando hace bueno. */
export const hizketaLines = (h) => [h.a, h.ok || EGURALDIA.argia];

// lo que dicen los vecinos (en castellano; las plantillas de abajo lo pasan al euskera con las dos palabras tal cual)
export const HITZ_TXT = {
  teach: (eu, es) => `Te enseño una palabra en euskera: «${es}» se dice «${eu}».`,
  ask: (es) => `¿Cómo se dice «${es}» en euskera?`,
  review: (es) => `¿Te acuerdas? ¿Cómo se dice «${es}» en euskera?`,
  ok: (eu, es) => `¡Zuzen! «${eu}» es «${es}». Muy bien.`,
  no: (eu, es) => `¡Casi! «${es}» se dice «${eu}». Repásala en tu cuaderno.`,
  toast: (eu, es) => `Palabra nueva en tu cuaderno: «${eu}», ${es}`,
  say: (eu, es) => `«${eu}» (${es})`,
  no2: (eu, es, eu2, es2) => `¡Casi! Se contesta «${eu}», que es «${es}». Tú has dicho «${eu2}»: «${es2}».`,
  toast2: (eu) => `Conversación nueva en tu cuaderno: «${eu}»`,
};
// (en euskera, las dos palabras se quedan como están: la pregunta es justo cómo se dice una en la otra lengua)
export const EU_RX_HITZAK = [
  [/^Te enseño una palabra en euskera: «(.+?)» se dice «(.+?)»\.$/, (m, es, eu) => `Hitz bat irakatsiko dizut: «${es}» euskaraz «${eu}» da.`],
  [/^¿Te acuerdas\? ¿Cómo se dice «(.+?)» en euskera\?$/, (m, es) => `Gogoratzen duzu? Nola esaten da «${es}» euskaraz?`],
  [/^¿Cómo se dice «(.+?)» en euskera\?$/, (m, es) => `Nola esaten da «${es}» euskaraz?`],
  [/^¡Zuzen! «(.+?)» es «(.+?)»\. Muy bien\.$/, (m, eu, es) => `Zuzen! «${eu}», gaztelaniaz «${es}». Oso ondo.`],
  [/^¡Casi! «(.+?)» se dice «(.+?)»\. Repásala en tu cuaderno\.$/, (m, es, eu) => `Ia-ia! «${es}» euskaraz «${eu}» da. Errepasatu koadernoan.`],
  [/^Palabra nueva en tu cuaderno: «(.+?)», (.+)$/, (m, eu, es) => `Hitz berria koadernoan: «${eu}», ${es}`],
  [/^(\d+) de (\d+) palabras$/, '$1 / $2 hitz'],
  [/^(\d+) de (\d+) conversaciones$/, '$1 / $2 elkarrizketa'],
  // (lo que dice el vecino en euskera, sin el castellano de al lado)
  [/^«([^«»]+)» \(([^()]+)\)$/, '«$1»'],
  [/^¡Casi! Se contesta «(.+?)», que es «(.+?)»\. Tú has dicho «(.+?)»: «(.+?)»\.$/, (m, eu, es, eu2) => `Ia-ia! «${eu}» erantzuten da. Zuk «${eu2}» esan duzu.`],
  [/^Conversación nueva en tu cuaderno: «(.+?)»$/, 'Elkarrizketa berria koadernoan: «$1»'],
];
