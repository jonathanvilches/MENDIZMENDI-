// Llevar la partida de un sitio a otro: todo lo que el juego guarda en el navegador (el perfil, los torneos, la liga, el
// valle de Salazar…) en un código de texto que se copia aquí y se pega allí. Sirve para pasar de la app antigua de Vercel
// a la de GitHub Pages (public/mudanza.html la manda sola, en #traspaso=, y la recoge index.html antes de arrancar) o de un
// aparato a otro (Perfil › Llevar tu partida). Cada app de la pantalla de inicio del iPhone guarda lo suyo aparte: por eso
// también se puede pegar a mano. Lo propio de cada aparato (su gráfica, el diagnóstico, el mando) no viaja.
// (el mismo formato que mudanza.html e index.html: «HZ0:» y el JSON en base64 para direcciones, sin comprimir)
const FUERA = /^herrizherri-(gpu|diag-mapa|rastro|arranque|perdidas|web|version|volver|cubre|mando.*)$/;

const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64 = (t) => { const b = atob(t.replace(/-/g, '+').replace(/_/g, '/')), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/** El código de la partida de aquí (o '' si no hay nada guardado). */
export function codigoPartida() {
  const d = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('herrizherri-') && !FUERA.test(k)) d[k] = localStorage.getItem(k); } } catch (e) { return ''; }
  return d['herrizherri-perfil-v1'] ? 'HZ0:' + b64(new TextEncoder().encode(JSON.stringify(d))) : '';
}

/** Lo que trae un código: { claves, nombre } o null si no es un código del juego. */
export function leePartida(codigo) {
  const m = /HZ0:([A-Za-z0-9_-]+)/.exec(String(codigo || '').replace(/\s+/g, ''));
  if (!m) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(deB64(m[1])));
    if (!d || typeof d !== 'object' || typeof d['herrizherri-perfil-v1'] !== 'string') return null;
    const claves = Object.entries(d).filter(([k, v]) => k.startsWith('herrizherri-') && !FUERA.test(k) && typeof v === 'string');
    let nombre = ''; try { nombre = JSON.parse(d['herrizherri-perfil-v1']).name || ''; } catch (e) { }
    return { claves, nombre };
  } catch (e) { return null; }
}

/** Cambia la partida de aquí por la del código (lo de antes se quita) y devuelve si se ha podido. */
export function traePartida(codigo) {
  const p = leePartida(codigo); if (!p) return false;
  try {
    const viejas = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('herrizherri-') && !FUERA.test(k)) viejas.push(k); }
    for (const k of viejas) localStorage.removeItem(k);
    for (const [k, v] of p.claves) localStorage.setItem(k, v);
    return true;
  } catch (e) { return false; }
}
