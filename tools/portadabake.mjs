// Hornea la foto de cada comarca en WebP (src/assets/portadas/<comarca>.webp y <comarca>-s.webp, la pequeña para las
// tarjetas) para que el móvil no tenga que montar el diorama 3D de la comarca en el menú ni en la pantalla de carga.
// Volver a ejecutar cuando cambien los dioramas (src/hub/diorama.js) o las comarcas.
// Uso: node tools/portadabake.mjs [url base]   (ONLY=bidasoa,baztan para rehacer solo esas)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
const [,, base = 'http://127.0.0.1:5173/'] = process.argv;
const W = 1280, H = 720, tmp = '/tmp/portadabake'; mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(base + 'lab/portadabake.html', { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const ids = (await p.evaluate(() => window.__ids)).filter(n => !process.env.ONLY || process.env.ONLY.split(',').includes(n));
for (const id of ids) {
  const url = await p.evaluate(([id, w, h]) => window.__bake(id, w, h), [id, W, H]);
  if (!url?.startsWith('data:image/png')) { console.log('sin imagen', id); continue; }
  writeFileSync(`${tmp}/${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('·', id);
}
await browser.close();
execFileSync('python3', ['-c', `
import os
from PIL import Image
out = 'src/assets/portadas'; os.makedirs(out, exist_ok=True); tot = 0
for n in ${JSON.stringify(ids)}:
    f = os.path.join('${tmp}', n + '.png')
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB')
    for name, size, q in ((n, (${W}, ${H}), 80), (n + '-s', (480, 270), 82)):
        d = os.path.join(out, name + '.webp'); im.resize(size, Image.LANCZOS).save(d, 'WEBP', quality=q, method=6); tot += os.path.getsize(d)
print('fotos', len(${JSON.stringify(ids)}), 'total KB', tot // 1024)
`], { stdio: 'inherit' });
