// Las voces de los vecinos de Otsagabia (Ochagavía), cada uno con su voz de la biblioteca de ElevenLabs, elegidas por el
// autor escuchando las muestras (16 de noviembre de 2026): Itziar, Rosa; Joxemari, Rafael; Kike, Leo; Ainhoa, Sofía;
// Joseba, Martín; la Lamia, Sophie; el Basajaun, Ezequiel; el Bobo, Lucas; Arantxa, Mari; la narradora, Nico. Maite
// sigue con Lulú hasta que el autor elija la suya. Los paseantes no hablan: solo misiones e información.
// src/assets/voz/vecinos/ochagavia/<vecino>-<nn>.mp3 y manifiesto.json ({ vecino: [[frase, archivo]] }): la frase se
// busca por su texto, sin el nombre de quien juega (las grabaciones no lo dicen), sin tildes ni signos. Las frases con
// cuenta («Llevas 3 de 6. Colócate…») tienen su grabación con el número; si falta, se busca sin «Llevas 3 de 6» y suena
// la instrucción sola, mientras el texto sí lo dice (el autor, 17 nov); los saludos de Itziar y Joxemari están grabados
// con «Egun on», «Arratsalde on» y «Gabon» (saludo.js cambia el saludo con la hora). En euskera, nada: las grabaciones son en castellano. Una frase cada vez: la siguiente, o cerrar la
// charla, calla la anterior. Mientras habla, la música baja (audio.js, voz), como con los comentaristas de pelota.
// Además de las charlas (hablaVecino), la narradora (manifiesto, «narra»): los avisos del pueblo (la fuente, el puente,
// las ovejas, el peine de la Lamia, los cencerros, los premios) y las cartas del cuaderno al darles la vuelta (narra,
// desde ui.js: onVoz). Las preguntas del queso de Arantxa van por su charla, con su voz.
import MANI from '../assets/voz/vecinos/ochagavia/manifiesto.json';
import { getLang } from '../i18n.js';

const CLIPS = import.meta.glob('../assets/voz/vecinos/ochagavia/*.mp3', { query: '?url', import: 'default' });
const llano = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const POR_TEXTO = new Map();
for (const lista of Object.values(MANI)) for (const [frase, arch] of lista) POR_TEXTO.set(llano(frase), arch);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// La cuenta que cambia («Llevas 3 de 6.», «Tienes 5 de 8.»): la grabación no la dice
// (y «Te faltan 2 escudos.» de Itziar: suena «Busca casas grandes de piedra…» sola)
const CUENTA = /(?<![\p{L}])(?:(?:llevas|tienes)\s+\d+\s+de\s+\d+|te\s+faltan?\s+\d+\s+escudos?)\.?/giu;

let src = null, tok = 0;
const buf = new Map();
const musica = (on) => { try { window.__sound?.voz?.(on); } catch (e) { /* sin audio */ } };

/** El archivo grabado de esa frase (o null), quitando antes el nombre de quien juega */
export function clipDe(texto, nombre) {
  let t = texto || '';
  if (nombre) t = t.replace(new RegExp(`,?\\s*${esc(nombre)}(?![\\p{L}])`, 'gu'), '');
  return POR_TEXTO.get(llano(t)) || POR_TEXTO.get(llano(t.replace(CUENTA, ' '))) || null;
}

/** Calla al momento (frase nueva o fin de la charla) */
export function callaVecino() {
  tok++;
  if (src) { try { src.stop(); } catch (e) { /* ya había acabado */ } src = null; musica(false); }
}

/** Dice la línea L de una charla con la voz grabada de su vecino, si la tiene */
export function hablaVecino(L, nombre) { return L?.sinVoz ? callaVecino() : dice(L?.text, nombre); }

/** Dice un texto suelto (un aviso, un premio, una carta del cuaderno) si tiene grabación; si no la tiene, no calla lo que
 *  esté sonando (un aviso sin voz no corta una charla). null: calla */
export function narra(texto, nombre) {
  if (texto == null) return callaVecino();
  if (getLang() === 'eu' || !clipDe(texto, nombre)) return;
  return dice(texto, nombre);
}

async function dice(texto, nombre) {
  callaVecino();
  if (getLang() === 'eu') return;
  const arch = clipDe(texto, nombre), load = arch && CLIPS[`../assets/voz/vecinos/ochagavia/${arch}`];
  const S = window.__sound, ctx = S?.ctx;
  if (!load || !ctx) return;
  const t = tok;
  try {
    let p = buf.get(arch);
    if (!p) { p = load().then(u => fetch(u)).then(r => r.arrayBuffer()).then(a => new Promise((res, rej) => { const q = ctx.decodeAudioData(a, res, rej); if (q?.then) q.then(res, rej); })); if (buf.size > 24) buf.clear(); buf.set(arch, p); p.catch(() => buf.delete(arch)); }
    const b = await p; if (t !== tok) return;
    if (ctx.state !== 'running') { try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 400))]); } catch (e) { /* sin permiso aún */ } if (t !== tok) return; }
    const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 1.1; s.buffer = b; s.connect(g); g.connect(S.master);
    s.onended = () => { if (src === s) { src = null; musica(false); } };
    src = s; musica(true); s.start();
  } catch (e) { /* sin voz: se lee */ }
}
