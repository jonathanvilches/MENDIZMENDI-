// Los comentarios de los partidos de pelota (pelota/comenta.js y pelota/voz.js), aparte para que Ajustes (hub/hub.js)
// los lea sin cargar las frases: la voz del comentarista, 'hombre' (la de siempre), 'mujer' o 'no' (sin comentarios), en
// herrizherri-comentarios; y los subtítulos, apagados de serie (herrizherri-subtitulos): los comentarios se oyen, no se
// leen, para no tapar la pantalla. (Los valores de antes, 'a' y 'b', los dúos escritos, pasan a 'hombre')
const K = 'herrizherri-comentarios', KS = 'herrizherri-subtitulos';
/** La voz elegida: 'hombre', 'mujer' o 'no'. */
export const duoElegido = () => { try { const v = localStorage.getItem(K); return v === 'mujer' || v === 'no' ? v : 'hombre'; } catch (e) { return 'hombre'; } };
export const ponDuo = (v) => { try { localStorage.setItem(K, v); } catch (e) { /* sin almacenamiento */ } };
/** ¿Se ven los comentarios escritos, además de oírse? */
export const subtitulos = () => { try { return localStorage.getItem(KS) === '1'; } catch (e) { return false; } };
export const ponSubtitulos = (on) => { try { localStorage.setItem(KS, on ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } };
