// El encargo de imágenes (tools/encargo-total.mjs) en texto plano, para copiarlo y pegarlo en la herramienta de imágenes:
// sin marcas de formato, sin los apartados opcionales ni los que ya no piden nada, y dirigido a la herramienta (normas
// comunes, el estilo de cada apartado y una línea por imagen con su archivo). Escribe dos archivos: el encargo entero y
// solo los iconos, para que todos sigan la misma identidad visual.
// Uso: node tools/encargo-pegar.mjs <encargo.md> <salida-todo.txt> <salida-iconos.txt>
import { readFileSync, writeFileSync } from 'fs';

const [,, src, outTodo, outIconos] = process.argv;
const md = readFileSync(src, 'utf8');
const fecha = md.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] || '';
// los apartados «## …», cada uno con sus líneas
const secs = []; let cur = null;
for (const line of md.split('\n')) {
  if (/^## /.test(line)) { cur = { h: line.slice(3).trim(), L: [] }; secs.push(cur); } else if (cur) cur.L.push(line);
}
const n = (h) => +(h.match(/\((\d+)\)\s*$/)?.[1] ?? -1);
const util = secs.filter(s => /^\d/.test(s.h) && !/^12\.|Opcional/.test(s.h) && n(s.h) > 0);
// (de cada apartado: la nota de estilo y las imágenes; fuera los subapartados opcionales y las frases para el autor, y sin
// la palabra sangre, que es un juego para niños y la herramienta podría no querer dibujarla)
function cuerpo(s) {
  const out = []; let skip = false;
  for (let l of s.L) {
    if (/^### 8b\./.test(l)) { skip = true; continue; }
    if (/^### /.test(l)) { skip = false; out.push(l.slice(4).trim() + ':'); continue; }
    if (skip) continue;
    l = l.replace(/\*\*/g, '').replace('Estilo (pégalo una vez): ', 'Estilo: ').replace('Hoy son un dibujo plano del propio juego. ', '')
      .replace('Para el panel de cultura de cada comarca, que hoy enseña solo el texto. ', '').replace(/ Misma familia que tus \d+ iconos:/, ' De la misma familia que los iconos del juego:')
      .replace('Renders del propio juego que conviene sustituir', 'Hoy son capturas del propio juego. Para sustituirlas')
      .replace(': el resto de botones ya llevan tus iconos.', '.').replace('una sábana manchada de sangre', 'una sábana blanca con manchas rojas').replace('Estilo: el mismo que los otros siete instrumentos que me mandaste (icono 3D de la familia, fondo transparente, 1254 × 1254).', 'Estilo: icono 3D de la misma familia que los iconos, el instrumento entero, fondo transparente, 1254 × 1254.');
    if (/^Hoy salen con un render del traje/.test(l)) continue;
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const norma = (cuantas, que) => [
  `HERRIZHERRI · ENCARGO DE ${que} (${fecha})`, '',
  `Necesito ${cuantas} imágenes para Herrizherri, un juego educativo sobre los pueblos de Navarra para niñas y niños. Cada apartado empieza con su estilo, que vale para todas sus imágenes, y debajo va una imagen por línea: primero el nombre exacto del archivo y luego lo que tiene que salir. Genéralas de una en una, en este orden, y entrégame cada una con su nombre de archivo.`, '',
  'NORMAS PARA TODAS', '',
  '- PNG, o WebP de calidad 90 o más. Nada de JPEG.',
  '- Escudos, iconos y trofeos: cuadrados y con fondo transparente. Personajes, cuentos, figuras, tradiciones y danzas: apaisadas 16:9.',
  '- Nada de texto, letras ni marcas de agua dentro de la imagen.',
  '- Nada que imite marcas, escudos de clubes reales ni personajes de otros videojuegos.', ''];
const bloque = (lista) => lista.map((s, i) => [`${i + 1}. ${s.h.replace(/^\d+[a-z]?\.\s*/, '').replace('Iconos que no son tuyos', 'Iconos para sustituir').replace('Instrumentos sin original grande', 'Instrumento').toUpperCase()}`, '', cuerpo(s), '']).flat();
const cuenta = (lista) => lista.reduce((a, s) => a + n(s.h), 0);
writeFileSync(outTodo, [...norma(cuenta(util), 'IMÁGENES'), ...bloque(util)].join('\n').trim() + '\n');
const iconos = util.filter(s => /Iconos|Instrumento|Trofeos/.test(s.h));
writeFileSync(outIconos, [...norma(cuenta(iconos), 'ICONOS'), ...bloque(iconos)].join('\n').trim() + '\n');
console.log(JSON.stringify({ todo: cuenta(util), iconos: cuenta(iconos), apartados: util.map(s => s.h) }));
