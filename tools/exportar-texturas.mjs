// Las imágenes del juego en PNG, para otros motores: Unity (y otros) no importan WebP sin un complemento. Convierte cada
// .webp de src/assets (o de la carpeta que se le diga) a .png con la misma ruta dentro de exportar/texturas; los .png y
// .jpg se copian tal cual. Los modelos (.glb), los sonidos (.mp3) y los vídeos (.mp4) no hace falta convertirlos: Unity los
// lee (los .glb con glTFast). Ver PORTAR.md. Uso:  node tools/exportar-texturas.mjs [origen] [destino]
//   p. ej.  node tools/exportar-texturas.mjs src/assets/isla exportar/texturas/isla
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
const origen = process.argv[2] || 'src/assets', destino = process.argv[3] || 'exportar/texturas';
const L = []; const anda = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) anda(p); else if (/\.(webp|png|jpe?g)$/i.test(e.name)) L.push(p); } };
anda(origen);
let n = 0, bytes = 0;
for (const f of L) {
  const rel = path.relative(origen, f), dst = path.join(destino, rel.replace(/\.webp$/i, '.png'));
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(f).mtimeMs) continue;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (/\.webp$/i.test(f)) await sharp(f).png({ compressionLevel: 9 }).toFile(dst); else fs.copyFileSync(f, dst);
  n++; bytes += fs.statSync(dst).size;
}
console.log(`${L.length} imágenes en ${origen}; ${n} escritas en ${destino} (${(bytes / 1048576).toFixed(0)} MB)`);
