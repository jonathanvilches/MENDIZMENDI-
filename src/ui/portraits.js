// Retratos de los avatares (busto, cuerpo entero o el grande del perfil), ya renderizados con tools/retratos.mjs y
// tools/meshy-retratos.mjs. Los vecinos de las charlas llevan las ilustraciones del autor (ui/pelotariFig.js, vecinoSrc):
// el retrato que se hacía aquí en 3D con su muñeco se quitó en noviembre de 2026.
import { GLB_AVATARS } from '../actors/glbChar.js';

// (una silueta en vez de un hueco si un retrato no se ha podido dibujar)
const FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="24" r="12" fill="#f1c7a5"/><path d="M12 60c0-13 9-20 20-20s20 7 20 20z" fill="#c8222a"/><path d="M20 22c0-9 6-14 12-14s12 5 12 14c-3-5-7-7-12-7s-9 2-12 7z" fill="#3b2418"/></svg>');
// los avatares GLB traen su retrato ya renderizado (src/assets/meshy/portraits: tools/meshy-retratos.mjs y tools/retratos.mjs)
const glbPortrait = (id, mode) => GLB_AVATARS[id] && (mode === 'hero' ? GLB_AVATARS[id].hero || GLB_AVATARS[id].full : mode === 'full' ? GLB_AVATARS[id].full : GLB_AVATARS[id].bust);
export const avatarPortrait = (id, mode = 'bust') => glbPortrait(id, mode) || FALLBACK;

export const avatarPortraitImg = (id, mode = 'bust') => `<img src="${glbPortrait(id, mode) || FALLBACK}" alt="">`;
