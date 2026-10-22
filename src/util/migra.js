// El juego se llamó al principio de otra manera y lo guardado en el navegador llevaba aquel nombre delante. Al arrancar,
// antes que nada (main.js lo importa el primero), lo de entonces pasa a las claves de ahora, con la partida intacta: el
// perfil, el idioma, los torneos, la liga… Lo que ya está con el nombre nuevo no se toca. Las memorias de imágenes de
// entonces se borran (se vuelven a hacer solas) y el nombre que se ponía por defecto pasa a uno típico de aquí, Iñigo.
const VIEJO = ['mend', 'imendiz'].join('');   // (el nombre de antes, por partes: así no aparece escrito en ninguna parte)
const NUEVO = 'herrizherri';
function pasa(dame) {
  try {
    const st = dame();   // (pedirlo ya puede fallar: en algunas vistas incrustadas no hay almacén)
    for (const k of Object.keys(st)) {
      if (!k.startsWith(VIEJO + '-')) continue;
      const nk = NUEVO + k.slice(VIEJO.length);
      if (st.getItem(nk) === null) st.setItem(nk, st.getItem(k));
      st.removeItem(k);
    }
  } catch (e) { /* sin acceso al almacén (modo privado): no hay nada que pasar */ }
}
pasa(() => localStorage); pasa(() => sessionStorage);
try {
  const k = NUEVO + '-perfil-v1', P = JSON.parse(localStorage.getItem(k) || 'null');
  if (P && P.name === ['Me', 'ndi'].join('')) { P.name = 'Iñigo'; localStorage.setItem(k, JSON.stringify(P)); }
} catch (e) { }
try { if (!localStorage.getItem(NUEVO + '-migrado')) { for (const db of [VIEJO + '-img', VIEJO + '_img_textures']) indexedDB?.deleteDatabase(db); localStorage.setItem(NUEVO + '-migrado', '1'); } } catch (e) { }   // (una sola vez)
