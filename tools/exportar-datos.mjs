// Los datos del juego, en JSON, para llevarlos a otro motor (Unity, Godot, Unreal): cada módulo de src/data (pueblos,
// misiones, comarcas, personajes, leyendas, oficios, relieve…) sale en exportar/datos/<su ruta>.json con todo lo que
// exporta y se puede escribir como datos. Las funciones no (se apuntan sus nombres en «funciones», para saber qué lógica
// hay que reescribir), las listas de números (Float32Array…) salen como listas, Map y Set como objeto y lista, y las
// rutas de imágenes y sonidos tal como las ve el juego (/src/assets/…). Ver PORTAR.md.
// Se hace dentro del navegador, con el servidor de desarrollo (5173), porque los módulos importan imágenes y JSON como
// los entiende Vite. Uso:  node tools/exportar-datos.mjs [carpeta]   (por defecto exportar/datos)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const out = process.argv[2] || 'exportar/datos', URL = process.env.URL || 'http://127.0.0.1:5173/';
const mods = []; const anda = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name);
  if (e.isDirectory()) anda(p); else if (/\.(js|json)$/.test(e.name)) mods.push(path.relative('src/data', p)); } };
anda('src/data'); mods.sort();
// y los datos que viven fuera de src/data, junto a su código: las frases y la música (src/audio), el guion y los
// comentarios de la pelota, los talleres, las actividades y aventuras de los pueblos, los torneos, los trajes, el
// material didáctico, los emblemas, las señales, los puntos del ranking de pelotaris y Salazar. Salen en exportar/datos/juego/<ruta dentro de src>.json
const EXTRA = ['audio/frases.js', 'audio/instrumentos.js', 'audio/interfaz.js', 'audio/pistas.js', 'i18n.js', 'pelota/guionVoz.js', 'pelota/comenta.js',
  'pelota/rules.js', 'futbol/rules.js', 'game/talleres.js', 'game/townActividades.js', 'game/townAventura.js', 'game/torneo.js', 'game/content.js',
  'game/senales.js', 'game/rankingPelota.js', 'actors/trajes.js', 'actors/outfits.js', 'hub/didactico.js', 'hub/emblemas.js', 'levels/salazar.js'].filter(f => fs.existsSync('src/' + f));
mods.push(...EXTRA.map(f => '../' + f));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.goto(URL + 'lab/icons.html', { timeout: 300000 }).catch(() => {});
const indice = [];
for (const rel of mods) {
  const r = await p.evaluate(async (rel) => {
    // (de cualquier valor, lo que se puede escribir en JSON; lo que no, fuera, y las funciones apuntadas)
    // (un objeto que sale en dos sitios, como el aspecto de cada frontón en ARQ_LOOK y en MODELOS, se escribe entero en
    // los dos: antes el segundo salía como «[repetido]» y en el otro motor faltaba. «[repetido]» queda solo para un
    // objeto que se contiene a sí mismo, que en JSON no se puede escribir)
    const funciones = [], visto = new WeakSet();
    const limpia = (v, ruta) => {
      if (!v || typeof v !== 'object' || ArrayBuffer.isView(v)) return limpia0(v, ruta);
      if (visto.has(v)) return '[repetido]';   // (visto: los objetos por los que se ha bajado hasta aquí, no todos los escritos)
      visto.add(v); try { return limpia0(v, ruta); } finally { visto.delete(v); }
    };
    const limpia0 = (v, ruta) => {
      if (v == null || typeof v === 'string' || typeof v === 'boolean') return v;
      if (typeof v === 'number') return Number.isFinite(v) ? v : null;
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'function') { funciones.push(ruta); return undefined; }
      if (ArrayBuffer.isView(v)) return Array.from(v);
      if (typeof v !== 'object') return undefined;
      if (v.isColor) return '#' + v.getHexString();
      if (v.isVector2 || v.isVector3 || v.isVector4 || v.isQuaternion || v.isEuler) return v.toArray();
      if (v.isTexture || v.isMaterial || v.isBufferGeometry || v.isObject3D) return undefined;   // (cosas de three.js: no son datos)
      if (v instanceof Map) { const o = {}; for (const [k, x] of v) { const y = limpia(x, `${ruta}.${k}`); if (y !== undefined) o[String(k)] = y; } return o; }
      if (v instanceof Set) return [...v].map((x, i) => limpia(x, `${ruta}[${i}]`)).filter(x => x !== undefined);
      if (Array.isArray(v)) return v.map((x, i) => { const y = limpia(x, `${ruta}[${i}]`); return y === undefined ? null : y; });
      const o = {}; for (const k of Object.keys(v)) { const y = limpia(v[k], `${ruta}.${k}`); if (y !== undefined) o[k] = y; } return o;
    };
    try {
      const m = await import((rel.startsWith('../') ? '/src/' + rel.slice(3) : '/src/data/' + rel) + (rel.endsWith('.json') ? '?import' : ''));
      const datos = {}; for (const k of Object.keys(m)) { const y = limpia(m[k], k); if (y !== undefined) datos[k] = y; }
      return { datos, funciones };
    } catch (e) { return { error: String(e.message || e).slice(0, 300) }; }
  }, rel);
  const fuente = rel.startsWith('../') ? 'src/' + rel.slice(3) : 'src/data/' + rel, dest = path.join(out, (rel.startsWith('../') ? 'juego/' + rel.slice(3) : rel).replace(/\.(js|json)$/, '.json'));
  if (r.error) { console.log('MAL', rel, r.error); indice.push({ fuente, error: r.error }); continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // (la fecha solo cambia si cambian los datos: así, sin cambios, no hay nada nuevo que subir a GitHub)
  const cuerpo = (x) => JSON.stringify({ ...x, exportado: undefined }), nuevo = { fuente, exportado: new Date().toISOString().slice(0, 10), datos: r.datos, funciones: r.funciones.length ? r.funciones : undefined };
  let previo = null; try { previo = JSON.parse(fs.readFileSync(dest, 'utf8')); } catch (e) { }
  if (previo && cuerpo(previo) === cuerpo(JSON.parse(JSON.stringify(nuevo)))) nuevo.exportado = previo.exportado;
  const texto = JSON.stringify(nuevo);
  if (!previo || JSON.stringify(previo) !== texto) fs.writeFileSync(dest, texto);
  indice.push({ fuente, json: path.relative(out, dest), kb: Math.round(texto.length / 1024), exporta: Object.keys(r.datos), funciones: r.funciones.length });
}
fs.writeFileSync(path.join(out, 'indice.json'), JSON.stringify(indice, null, 1));
const mal = indice.filter(x => x.error).length;
console.log(`${indice.length - mal} módulos exportados a ${out} (${Math.round(indice.reduce((n, x) => n + (x.kb || 0), 0) / 1024)} MB)${mal ? `, ${mal} con error` : ''}${errs.length ? '; errores de la página: ' + errs.slice(0, 3).join(' | ') : ''}`);
await b.close();
