// Hornea los iconos 3D del juego en imágenes WebP para no dibujarlos en el móvil mientras se juega: a 512 px
// (src/assets/icons3d/512), y reducidos a 256 (la web, icons3d/256) y a 128 (el archivo único, icons3d/128).
// Volver a ejecutar cuando cambien los modelos de los iconos. Solo los que no son del autor (ONLY=goat,info para unos pocos).
// Uso: node tools/iconbake.mjs [url base] [tamaño]
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
// (se dibujan a 360 como mucho: con el supermuestreo, el doble, y el lienzo oculto, src/util/offscreen.js, mide 960×720;
// más grandes salían cortados por abajo y por la izquierda)
const [,, base = 'http://127.0.0.1:5173/', size = '360'] = process.argv;
const tmp = process.env.ICONTMP || '/tmp/iconbake'; mkdirSync(tmp, { recursive: true });   // (ICONTMP: otra carpeta de paso)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(base + 'lab/iconbake.html?iconS=' + size, { timeout: 300000 });   // (icon3d.js dibuja al tamaño pedido, con supermuestreo)
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const names = (await p.evaluate(() => window.__names)).filter(n => !process.env.ONLY || process.env.ONLY.split(',').includes(n));   // ONLY=boar,jabali para rehacer solo esos
// (los iconos del autor no se hornean: su lista está en src/assets/icons3d/LICENSE_iconos-autor.txt)
const AUTOR = new Set((readFileSync('src/assets/icons3d/LICENSE_iconos-autor.txt', 'utf8').match(/^Lista: (.*)$/m)?.[1] || '').split(' '));
for (let i = names.length - 1; i >= 0; i--) if (AUTOR.has(names[i])) names.splice(i, 1);
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
out = 'src/assets/icons3d'; tot = 0
for s in (512, 256, 128): os.makedirs(os.path.join(out, str(s)), exist_ok=True)
for f in [os.path.join('${tmp}', n + '.png') for n in ${JSON.stringify(names)} if os.path.exists(os.path.join('${tmp}', n + '.png'))]:
    im = Image.open(f).convert('RGBA')
    for s, q in ((512, 90), (256, 90), (128, 80)):   # (512: pantallas densas; 256: la web; 128: el archivo único)
        d = os.path.join(out, str(s), os.path.basename(f)[:-4] + '.webp'); im.resize((s, s), Image.LANCZOS).save(d, 'WEBP', quality=q, alpha_quality=95 if q == 90 else 90, method=6); tot += os.path.getsize(d)
print('webp', len(glob.glob(out + '/512/*.webp')), 'total KB', tot // 1024)
`], { stdio: 'inherit' });
console.log('horneados', n);
