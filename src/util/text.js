// Comparar nombres sin fijarse en mayúsculas ni tildes: «Ochagavía» y «ochagavia» son el mismo
export const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// solo las letras, sin tildes, espacios ni signos (para buscar un nombre dentro de otro)
export const lettersOnly = (s) => fold(s).replace(/[^a-z]/g, '');
