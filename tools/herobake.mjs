// Hornea la portada del menú (src/assets/portadas/heroe/<comarca>-<personaje>.webp): cada comarca con cada personaje
// elegible dentro de la escena, como la portada 3D en vivo de antes pero sin montarla en el móvil.
// Volver a ejecutar si cambian los dioramas, los personajes o las comarcas. Uso: node tools/herobake.mjs [url base]
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
const [,, base = 'http://127.0.0.1:5173/'] = process.argv;
const W = 1280, H = 720, tmp = '/tmp/herobake'; mkdirSync(tmp, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(base + 'lab/herobake.html', { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 600000 });
const [ids, avs] = await p.evaluate(() => [window.__ids, window.__avs]);
const names = [];
for (const c of ids) for (const a of avs) {
  if (process.env.ONLY && !process.env.ONLY.split(',').includes(c)) continue;
  if (process.env.AV && !process.env.AV.split(',').includes(a)) continue;
  const url = await p.evaluate(([c, a, w, h]) => window.__bake(c, a, w, h), [c, a, W, H]);
  writeFileSync(`${tmp}/${c}-${a}.png`, Buffer.from(url.split(',')[1], 'base64')); names.push(`${c}-${a}`); console.log('·', c, a);
}
await b.close();
execFileSync('python3', ['-c', `
import os
from PIL import Image
out = 'src/assets/portadas/heroe'; os.makedirs(out, exist_ok=True); tot = 0
for n in ${JSON.stringify(names)}:
    d = os.path.join(out, n + '.webp'); Image.open(os.path.join('${tmp}', n + '.png')).convert('RGB').resize((800, 450), Image.LANCZOS).save(d, 'WEBP', quality=44, method=6); tot += os.path.getsize(d)
print('portadas', ${names.length}, 'total KB', tot // 1024)
`], { stdio: 'inherit' });
