// Los botilleros: sus datos y sus retratos (src/assets/pelota/botilleros, hechos con tools/auditoria-retratos-botilleros.mjs:
// el busto, {id}.webp, para la charla y el bocadillo; la figura, {id}-full.webp, para su carta). Sin nada de 3D: lo lee
// también el menú, al elegir botillero.
/** Los botilleros que se pueden elegir junto al pelotari (el autor, 25 de noviembre de 2026: «que cuando elijas pelotari
 *  también puedas elegir entrenador… el palmarés del botillero, cuántas txapelas ha conseguido estando él como botillero»;
 *  «sería interesante que metieras alguna mujer también, botillera»). Inventados. persona: su figura, una persona del
 *  público, la misma de la grada, tal cual, con su ropa, su talla y sus animaciones de andar y de estar quieta (el autor,
 *  26 de noviembre de 2026: «no quiero que pongas de botillero a un vecino, quiero que sea una persona normal… como una
 *  persona que has puesto del público, que haga de botillero y ya está»). Sin tocarle nada. Cada uno, una distinta;
 *  sin la señora mayor (el autor, 26 nov: «quita a la señora mayor… que no salga»), ni la del jersey rojo ni la de la
 *  chaqueta azul marino, los colores de los pelotaris. camiseta: su color en los menús (el
 *  botón y el borde de su retrato). txapelas y finales, como botillero; desde, el año en que empezó; estilo: lo que más
 *  mira (sale en su carta). girl: botillera. */
export const BOTILLEROS = [
  { id: 'patxi', nombre: 'Patxi', pueblo: 'Leitza', persona: 'aficion_hombre', camiseta: '#2f8f5b', txapelas: 21, finales: 34, desde: 1998, estilo: { es: 'Ataque', eu: 'Erasoa' } },
  { id: 'koldo', nombre: 'Koldo', pueblo: 'Lekunberri', persona: 'aficion_abuelo', camiseta: '#d8c29a', txapelas: 14, finales: 25, desde: 1984, estilo: { es: 'Defensa', eu: 'Defentsa' } },
  { id: 'arantxa', nombre: 'Arantxa', girl: true, pueblo: 'Etxalar', persona: 'aficion_mujer', camiseta: '#e8b828', txapelas: 16, finales: 26, desde: 2003, estilo: { es: 'Velocidad', eu: 'Abiadura' } },
  { id: 'nekane', nombre: 'Nekane', girl: true, pueblo: 'Otsagabia', persona: 'aficion_rubia', camiseta: '#e8762a', txapelas: 7, finales: 13, desde: 2015, estilo: { es: 'Volea', eu: 'Bolea' } },
  { id: 'ainhoa', nombre: 'Ainhoa', girl: true, pueblo: 'Altsasu', persona: 'aficion_chica', camiseta: '#6f9bd1', txapelas: 9, finales: 18, desde: 2009, estilo: { es: 'Cabeza', eu: 'Burua' } },
];
export const botilleroDe = (id) => BOTILLEROS.find(b => b.id === id) || BOTILLEROS[0];
const R = import.meta.glob('../assets/pelota/botilleros/*.webp', { eager: true, query: '?url', import: 'default' });
export const retratoBotillero = (B) => R[`../assets/pelota/botilleros/${B?.id}.webp`] || '';
export const figuraBotillero = (B) => R[`../assets/pelota/botilleros/${B?.id}-full.webp`] || retratoBotillero(B);
