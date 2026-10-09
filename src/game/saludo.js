// El saludo según la hora y la frase del día según el tiempo que hace: de noche nadie dice «Egun on» (buenos días) y,
// lloviendo o nevando, nadie dice que hace un día precioso
export function kaixo(G) {
  const t = G?.sky?.time ?? 12;
  return t >= 6 && t < 13.5 ? 'Egun on' : t >= 13.5 && t < 20.5 ? 'Arratsalde on' : 'Gabon';
}
// lo que cae ahora mismo: 'rain', 'snow' o 'clear' (la lluvia va a ratos: entre chaparrón y chaparrón, despejado)
export function weatherNow(G) {
  const W = G?.rt?.weather;
  if (!W || W.kind === 'clear') return 'clear';
  return W.kind === 'snow' || W.k > 0.3 ? W.kind : 'clear';
}
export function dayLine(G) {
  const w = weatherNow(G), night = (G?.sky?.night ?? 0) > 0.5;
  if (w === 'snow') return '¡Cómo nieva! Abrígate bien si subes al monte.';
  if (w === 'rain') return 'Vaya día de lluvia… ¡pero el campo lo agradece!';
  return night ? 'Qué noche más tranquila para pasear.' : 'Qué día más bonito para pasear.';
}
// (lo que significa cada saludo, para quien aprende euskera)
export const KAIXO_ES = { 'Egun on': 'buenos días', 'Arratsalde on': 'buenas tardes', Gabon: 'buenas noches' };
// lo que dicen los vecinos, a la hora y con el tiempo de ahora: «Egun on» pasa a «Arratsalde on» o «Gabon», y el «qué día
// más bonito» se cambia por lo que de verdad hace (lluvia, nieve o una noche tranquila)
const DAY = /Qué día más bonito para pasear\.|Hace un día precioso en el valle\./;
export function greet(G, s) {
  if (typeof s !== 'string') return s;
  const k = kaixo(G);
  if (k !== 'Egun on' && s.includes('Egun on')) s = s.replace('"Egun on" significa "buenos días"', `"${k}" significa "${KAIXO_ES[k]}"`).replace(/Egun on/g, k);
  if (DAY.test(s) && (weatherNow(G) !== 'clear' || (G?.sky?.night ?? 0) > 0.5)) s = s.replace(DAY, dayLine(G));
  return s;
}
