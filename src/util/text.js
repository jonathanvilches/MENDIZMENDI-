// Comparar nombres sin fijarse en mayúsculas ni tildes: «Ochagavía» y «ochagavia» son el mismo
export const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// solo las letras, sin tildes, espacios ni signos (para buscar un nombre dentro de otro)
export const lettersOnly = (s) => fold(s).replace(/[^a-z]/g, '');
/** Partir un texto en frases: corta en los espacios que siguen a un signo de fin (los de fin), que se queda en su frase.
 *  despues: una expresión con lo que tiene que venir detrás para cortar (solo se mira). Sin «mirar atrás» en la expresión,
 *  que los iPhone de antes de iOS 16.4 no entienden: un error así no deja arrancar el juego */
export function frases(s, fin = '.!?', despues = null) {
  const re = new RegExp(`([${fin}])\\s+` + (despues ? `(?=${despues.source})` : ''), 'g'), out = [];
  let i = 0; for (const m of s.matchAll(re)) { out.push(s.slice(i, m.index + 1)); i = m.index + m[0].length; }
  out.push(s.slice(i)); return out;
}
