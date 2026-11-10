// El dúo que comenta los partidos de pelota (pelota/comenta.js), aparte para que Ajustes (hub/hub.js) lo lea sin cargar
// las frases: 'a' (Maite y Patxi), 'b' (Unai y Garazi) o 'no' (sin comentarios). Se guarda en herrizherri-comentarios.
const K = 'herrizherri-comentarios';
/** El dúo elegido: 'a', 'b' o 'no'. */
export const duoElegido = () => { try { const v = localStorage.getItem(K); return v === 'b' || v === 'no' ? v : 'a'; } catch (e) { return 'a'; } };
export const ponDuo = (v) => { try { localStorage.setItem(K, v); } catch (e) { /* sin almacenamiento */ } };
