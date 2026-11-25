// Los botilleros: sus datos y sus retratos (src/assets/pelota/botilleros, hechos con tools/auditoria-retratos-botilleros.mjs:
// el busto, {id}.webp, para la charla y el bocadillo; la figura, {id}-full.webp, para su carta). Sin nada de 3D: lo lee
// también el menú, al elegir botillero.
/** Los botilleros que se pueden elegir junto al pelotari (el autor, 25 de noviembre de 2026: «que cuando elijas pelotari
 *  también puedas elegir entrenador… el palmarés del botillero, cuántas txapelas ha conseguido estando él como botillero.
 *  Y que lleve camisetas de colores, mientras no sea ninguna roja ni azul, para no confundirlo con los pelotaris»).
 *  Inventados. modelo: la figura (uno de los pelotaris de siempre, con su cara y su pelo; si ese día juega, otro libre);
 *  camiseta y hombros (el cuello y los hombros), nunca rojos ni azules; txapelas y finales, como botillero; desde, el año
 *  en que empezó; estilo: lo que más mira (sale en su carta). */
export const BOTILLEROS = [
  { id: 'patxi', nombre: 'Patxi', pueblo: 'Leitza', modelo: 'pelotari_aitor', camiseta: '#2f8f5b', hombros: '#f2f0ea', txapelas: 21, finales: 34, desde: 1998, estilo: { es: 'Ataque', eu: 'Erasoa' } },
  { id: 'koldo', nombre: 'Koldo', pueblo: 'Lekunberri', modelo: 'pelotari_xabier', camiseta: '#e8b828', hombros: '#1c1c21', txapelas: 14, finales: 25, desde: 2004, estilo: { es: 'Defensa', eu: 'Defentsa' } },
  { id: 'joxemari', nombre: 'Joxe Mari', pueblo: 'Elizondo', modelo: 'pelotari_mikel', camiseta: '#1c1c21', hombros: '#e8b828', txapelas: 17, finales: 29, desde: 2001, estilo: { es: 'Saque', eu: 'Sakea' } },
  { id: 'fermin', nombre: 'Fermín', pueblo: 'Tafalla', modelo: 'pelotari_jokin', camiseta: '#e8762a', hombros: '#1c1c21', txapelas: 9, finales: 18, desde: 2009, estilo: { es: 'Cabeza', eu: 'Burua' } },
  { id: 'peio', nombre: 'Peio', pueblo: 'Lesaka', modelo: 'pelotari_ander', camiseta: '#7a4ba8', hombros: '#f2f0ea', txapelas: 6, finales: 11, desde: 2014, estilo: { es: 'Fondo físico', eu: 'Fondoa' } },
  { id: 'txomin', nombre: 'Txomin', pueblo: 'Estella', modelo: 'pelotari_julen', camiseta: '#f2f0ea', hombros: '#2f8f5b', txapelas: 11, finales: 20, desde: 2006, estilo: { es: 'Dejadas', eu: 'Utziak' } },
  { id: 'inaxio', nombre: 'Iñaxio', pueblo: 'Altsasu', modelo: 'pelotari_asier', camiseta: '#8b8f94', hombros: '#e8762a', txapelas: 4, finales: 9, desde: 2017, estilo: { es: 'Cortada', eu: 'Cortada' } },
  { id: 'bittor', nombre: 'Bittor', pueblo: 'Sangüesa', modelo: 'pelotari_unai', camiseta: '#8cc63f', hombros: '#1c1c21', txapelas: 8, finales: 15, desde: 2011, estilo: { es: 'Remate', eu: 'Errematea' } },
];
export const botilleroDe = (id) => BOTILLEROS.find(b => b.id === id) || BOTILLEROS[0];
const R = import.meta.glob('../assets/pelota/botilleros/*.webp', { eager: true, query: '?url', import: 'default' });
export const retratoBotillero = (B) => R[`../assets/pelota/botilleros/${B?.id}.webp`] || '';
export const figuraBotillero = (B) => R[`../assets/pelota/botilleros/${B?.id}-full.webp`] || retratoBotillero(B);
