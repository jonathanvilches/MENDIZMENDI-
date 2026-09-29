// Imágenes del juego (sellos, retratos originales y paisajes), incrustadas en la compilación
const files = import.meta.glob('../assets/img/*.webp', { eager: true, query: '?url', import: 'default' });
export const IMG = {};
for (const [k, v] of Object.entries(files)) IMG[k.split('/').pop().replace('.webp', '')] = v;
export const stampImg = (comarca) => IMG['stamp-' + comarca] || '';
export const avatarImg = (id) => IMG['av-' + id] || '';
// Paisaje representativo de cada comarca / familia
const LAND = { bidasoa: 'forest', 'larraun-leitzaldea': 'mist', sakana: 'beriain', pamplona: 'city', pirineo: 'forest', prepirineo: 'river', sanguesa: 'rural', 'tierra-estella': 'urederra', 'valdizarbe-novenera': 'rural', 'zona-media': 'rural', 'ribera-alta': 'ribera', ribera: 'ribera' };
export const landImg = (comarca) => IMG['land-' + (LAND[comarca] || 'rural')] || '';
