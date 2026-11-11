// Los comentarios de los partidos de pelota (pelota/comenta.js y pelota/voz.js), aparte para que Ajustes (hub/hub.js)
// los lea sin cargar las frases: los comentaristas, 'duo' (los dos, de serie: la voz de hombre narra y la de mujer
// explica, por turnos; noviembre de 2026), 'hombre', 'mujer' o 'no' (sin comentarios), en herrizherri-comentarios; y los subtítulos, apagados de serie (herrizherri-subtitulos): los comentarios se oyen, no se
// leen, para no tapar la pantalla. (Los valores de antes, 'a' y 'b', los dúos escritos, pasan a 'hombre')
const K = 'herrizherri-comentarios', KS = 'herrizherri-subtitulos';
/** Los comentaristas elegidos: 'duo', 'hombre', 'mujer' o 'no'. */
export const duoElegido = () => { try { const v = localStorage.getItem(K); return v === 'hombre' || v === 'mujer' || v === 'no' ? v : 'duo'; } catch (e) { return 'duo'; } };
/** La voz de una frase: con los dos, la que narra («n») es la de hombre y la que explica («e»), la de mujer */
export const vozDe = (elegida, r) => (elegida === 'duo' ? (r === 'e' ? 'mujer' : 'hombre') : elegida);
export const ponDuo = (v) => { try { localStorage.setItem(K, v); } catch (e) { /* sin almacenamiento */ } };
/** ¿Se ven los comentarios escritos, además de oírse? */
export const subtitulos = () => { try { return localStorage.getItem(KS) === '1'; } catch (e) { return false; } };
export const ponSubtitulos = (on) => { try { localStorage.setItem(KS, on ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } };
