// Las láminas grandes de la web (src/assets/laminas/grande/<id>.webp, de 2560 × 1440): las de 1280 × 720 de
// src/assets/laminas/web, ampliadas al doble con Real-ESRGAN (modelo realesr-animevideov3-x2, en CPU, unos 20 s cada
// una; tools/laminas-ampliar.py) y guardadas en WebP (calidad 76, unos 300 KB cada una). El autor las entregó a 1280 y,
// a pantalla entera en un móvil de densidad 3 o en un ordenador (el inicio, la cabecera de la comarca, el visor del
// álbum), la portada pide más de 2000 px de ancho: a 1280 se veía pixelada (tools/nitidez.mjs). Solo las pide la
// pantalla que las necesita (src/web/hd.js); el archivo único las toma de la web publicada. Con un grupo (leyendas,
// cimas, personajes o tradiciones), lo mismo con sus ilustraciones de 1536 (src/assets/<grupo>/1536 → <grupo>/2560):
// ampliadas al doble y reducidas a 2560 × 1440.
// Uso: node tools/laminas-grandes.mjs [grupo] [id…]   (sin ids, todas las que falten; PYTHON=… el intérprete que tenga
// realesrgan-ncnn-py, por defecto python3; TMPDIR=… la carpeta de paso)
import { readdirSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const GRUPOS = { laminas: ['src/assets/laminas/web', 'src/assets/laminas/grande'], leyendas: ['src/assets/leyendas/1536', 'src/assets/leyendas/2560'], cimas: ['src/assets/cimas/1536', 'src/assets/cimas/2560'], personajes: ['src/assets/personajes/1536', 'src/assets/personajes/2560'], tradiciones: ['src/assets/tradiciones/1536', 'src/assets/tradiciones/2560'] };
const args = process.argv.slice(2), grupo = GRUPOS[args[0]] ? args.shift() : 'laminas', [SRC, OUT] = GRUPOS[grupo], PY = process.env.PYTHON || 'python3';
const todas = readdirSync(SRC).filter(f => /^[a-z0-9][a-z0-9-]*\.webp$/.test(f) && !f.endsWith('-s.webp')).map(f => f.replace('.webp', ''));
const ids = args.length ? args : todas.filter(id => !existsSync(join(OUT, `${id}.webp`)));
const paso = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'laminas-'));
let bytes = 0, n = 0;
for (let i = 0; i < ids.length; i += 8) {
  const tanda = ids.slice(i, i + 8), pares = tanda.flatMap(id => [join(SRC, `${id}.webp`), join(paso, `${id}.png`)]);
  const r = spawnSync(PY, ['-I', 'tools/laminas-ampliar.py', ...pares], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) { console.error('falló la ampliación'); process.exit(1); }
  for (const id of tanda) {
    const im = sharp(join(paso, `${id}.png`)); if (grupo !== 'laminas') im.resize(2560, 1440, { fit: 'cover', kernel: 'lanczos3' });   // (las de 1536: de 3072 a 2560)
    const b = await im.webp({ quality: 76, effort: 6, smartSubsample: true }).toBuffer();
    writeFileSync(join(OUT, `${id}.webp`), b); rmSync(join(paso, `${id}.png`)); bytes += b.length; n++;
  }
}
rmSync(paso, { recursive: true, force: true });
console.log(`${grupo}: ${n} grandes de 2560 × 1440 · ${bytes} bytes`);
