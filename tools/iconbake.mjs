// Hornea los iconos 3D del juego en imágenes WebP (src/assets/icons3d/<nombre>.webp) para no dibujarlos en el
// móvil mientras se juega. Volver a ejecutar cuando cambien los modelos de los iconos.
// Uso: node tools/iconbake.mjs [url base] [tamaño]
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
const [,, base = 'http://127.0.0.1:5173/', size = '192'] = process.argv;
const tmp = '/tmp/iconbake'; mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(base + 'lab/iconbake.html', { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const names = (await p.evaluate(() => window.__names)).filter(n => !process.env.ONLY || process.env.ONLY.split(',').includes(n));   // ONLY=boar,jabali para rehacer solo esos
console.log(names.length, 'iconos');
let n = 0;
for (const name of names) {
  const url = await p.evaluate((n) => window.__bake(n), name);
  if (!url || !url.startsWith('data:image/png')) { console.log('sin imagen', name); continue; }
  writeFileSync(`${tmp}/${name}.png`, Buffer.from(url.split(',')[1], 'base64')); n++;
}
await browser.close();
// a WebP con transparencia, al tamaño indicado
execFileSync('python3', ['-c', `
import glob, os
from PIL import Image
out = 'src/assets/icons3d'; os.makedirs(out, exist_ok=True); tot = 0
for f in [os.path.join('${tmp}', n + '.png') for n in ${JSON.stringify(names)} if os.path.exists(os.path.join('${tmp}', n + '.png'))]:
    im = Image.open(f).convert('RGBA').resize((${size}, ${size}), Image.LANCZOS)
    d = os.path.join(out, os.path.basename(f)[:-4] + '.webp'); im.save(d, 'WEBP', quality=88, method=6); tot += os.path.getsize(d)
print('webp', len(glob.glob(out + '/*.webp')), 'total KB', tot // 1024)
`], { stdio: 'inherit' });
console.log('horneados', n);
