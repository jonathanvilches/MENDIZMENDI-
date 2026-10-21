// Las imágenes de un import.meta.glob por su nombre de archivo, sin carpeta ni extensión: { 'lesaka': url, … }
export const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
