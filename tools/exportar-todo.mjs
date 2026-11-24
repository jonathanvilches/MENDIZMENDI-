// Todo lo que se lleva a otro motor (Unity, Godot, Unreal), de una vez, en exportar/ (ver PORTAR.md):
//   datos/ (JSON) · relieve/ (alturas de Navarra para Terrain) · modelos/ (sin comprimir) · texturas/ (PNG) · sonido/ ·
//   video/ · fuentes/ (TTF) · web/ (láminas) · originales/ (Meshy, Envato, música… en su máxima calidad, con catálogo) ·
//   pueblos/ y mapa/ (las escenas del juego en .glb) · sombreadores/ (el GLSL del juego) · comprobacion.json (validador
//   de Khronos) · LEEME.md e indice.json (qué hay y cuánto ocupa).
// Lo que necesita el juego en marcha (datos, pueblos y mapa) usa el servidor de desarrollo (npx vite, puerto 5173).
// Uso:  node tools/exportar-todo.mjs [carpetas de originales…]
//   SIN=pueblos,mapa   para saltarse partes (las escenas tardan: varios minutos por pueblo)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const OUT = process.env.DESTINO || 'exportar', SIN = (process.env.SIN || '').split(',');
const paso = (nombre, args, env = {}) => {
  if (SIN.includes(nombre)) { console.log(`· ${nombre}: saltado`); return; }
  const t = Date.now(); console.log(`· ${nombre}…`);
  try { execFileSync('node', args, { stdio: 'inherit', env: { ...process.env, ...env } }); console.log(`  (${Math.round((Date.now() - t) / 1000)} s)`); }
  catch (e) { console.log(`  ${nombre}: MAL (${e.status})`); }
};
paso('datos', ['tools/exportar-datos.mjs', path.join(OUT, 'datos')]);
paso('relieve', ['tools/exportar-relieve.mjs', path.join(OUT, 'relieve')]);
paso('modelos', ['tools/exportar-modelos.mjs', 'src/assets', path.join(OUT, 'modelos')]);
paso('texturas', ['tools/exportar-texturas.mjs', 'src/assets', path.join(OUT, 'texturas')]);
paso('medios', ['tools/exportar-medios.mjs', OUT]);
paso('originales', ['tools/exportar-originales.mjs', ...process.argv.slice(2)], { DESTINO: path.join(OUT, 'originales') });
paso('pueblos', ['tools/exportar-pueblo.mjs', 'todos', path.join(OUT, 'pueblos')], { SOMBREADORES: path.join(OUT, 'sombreadores') });
paso('mapa', ['tools/exportar-mapa.mjs', path.join(OUT, 'mapa')], { SOMBREADORES: path.join(OUT, 'sombreadores') });
paso('comprobar', ['tools/exportar-comprobar.mjs', OUT]);
// el índice: cuántos archivos y cuánto ocupa cada carpeta
const cuenta = (d) => { let n = 0, b = 0; const anda = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) anda(p); else { n++; b += fs.statSync(p).size; } } }; if (fs.existsSync(d)) anda(d); return { archivos: n, mb: +(b / 1048576).toFixed(1) }; };
const carpetas = fs.readdirSync(OUT, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
const I = { exportado: new Date().toISOString().slice(0, 10), carpetas: Object.fromEntries(carpetas.map(c => [c, cuenta(path.join(OUT, c))])) };
fs.writeFileSync(path.join(OUT, 'indice.json'), JSON.stringify(I, null, 1));
const total = Object.values(I.carpetas).reduce((s, x) => s + x.mb, 0);
console.log(`listo: ${carpetas.length} carpetas, ${Math.round(total)} MB en ${OUT}`);
