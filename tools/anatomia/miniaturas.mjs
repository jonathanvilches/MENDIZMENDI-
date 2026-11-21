// Las miniaturas de las láminas técnicas (public/anatomia/<id>.jpg), para la sección «Por dentro» del material didáctico:
// cada lámina abierta en su visor de juego (?juego), en reposo, recortada a la mesa, en JPEG.
//   node tools/anatomia/miniaturas.mjs [id…]   (sin ids, todas)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs';
import path from 'path';
const dir = path.resolve('public/anatomia');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 0.8 });
for (const id of ids) {
  await p.goto('file://' + path.join(dir, id + '.html') + '?juego'); await p.waitForTimeout(1800);
  await p.screenshot({ path: path.join(dir, id + '.jpg'), type: 'jpeg', quality: 78, clip: { x: 30, y: 48, width: 740, height: 370 } });
  console.log(id, (fs.statSync(path.join(dir, id + '.jpg')).size / 1024).toFixed(0) + ' KB');
}
await b.close();
