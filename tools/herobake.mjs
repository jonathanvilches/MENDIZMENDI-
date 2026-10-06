// Hornea la portada del menú: por cada comarca, el fondo (src/assets/portadas/heroe/<comarca>.webp, sin personaje) y, por
// cada personaje elegible, su capa (<comarca>-<personaje>.webp: el personaje con su sombra, transparente alrededor), sacadas
// del mismo render, así que encajan al ponerlas una encima de otra con el mismo encuadre. Así el fondo va a buena
// resolución una sola vez por comarca y cada personaje solo pesa lo que ocupa.
// Volver a ejecutar si cambian los dioramas, los personajes o las comarcas.
// Uso: node tools/herobake.mjs [url base]   (ONLY=comarca,… y AV=personaje,… para hacer solo algunos)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
const [,, base = 'http://127.0.0.1:5173/'] = process.argv;
const W = 1600, H = 900, tmp = '/tmp/herobake'; mkdirSync(tmp, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(base + 'lab/herobake.html', { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 600000 });
const [ids, avs] = await p.evaluate(() => [window.__ids, window.__avs]);
const jobs = [];
for (const c of ids) for (const a of avs) {
  if (process.env.ONLY && !process.env.ONLY.split(',').includes(c)) continue;
  if (process.env.AV && !process.env.AV.split(',').includes(a)) continue;
  const [bg, fig, mask] = await p.evaluate(([c, a, w, h]) => window.__bake(c, a, w, h), [c, a, W, H]);
  writeFileSync(`${tmp}/${c}-${a}-m.png`, Buffer.from(mask.split(',')[1], 'base64'));
  writeFileSync(`${tmp}/${c}.png`, Buffer.from(bg.split(',')[1], 'base64'));
  writeFileSync(`${tmp}/${c}-${a}.png`, Buffer.from(fig.split(',')[1], 'base64')); jobs.push([c, a]); console.log('·', c, a);
}
await b.close();
execFileSync('python3', ['-c', `
import os
import numpy as np
from PIL import Image, ImageFilter
out = 'src/assets/portadas/heroe'; os.makedirs(out, exist_ok=True); tot = 0; done = set()
for c, a in ${JSON.stringify(jobs)}:
    bg = Image.open('${tmp}/' + c + '.png').convert('RGB'); fig = Image.open('${tmp}/' + c + '-' + a + '.png').convert('RGB')
    if c not in done:
        d = os.path.join(out, c + '.webp'); bg.save(d, 'WEBP', quality=64, method=6); tot += os.path.getsize(d); done.add(c)
    # capa: la figura (con su silueta exacta) y su sombra, guardada como negro con transparencia (oscurece el fondo
    # lo mismo que en el render y casi no pesa)
    B = np.asarray(bg, np.float32); F = np.asarray(fig, np.float32)
    fm = np.asarray(Image.open('${tmp}/' + c + '-' + a + '-m.png').convert('L').filter(ImageFilter.MaxFilter(3)), np.float32)
    fm = np.clip(fm / max(fm.max(), 1) * 1.05, 0, 1)   # (el blanco de la silueta no llega a 255 por el tono del render)
    ys = np.nonzero(fm.max(1) > 0.5)[0]; y0 = ys.min() + (ys.max() - ys.min()) * 0.6 if len(ys) else 0
    rm = (F / np.maximum(B, 1)).mean(2); sh = (np.abs(F - B).sum(2) > 6) & (rm < 1) & (fm < 0.5)
    sh[:int(y0)] = False   # la sombra está en el suelo, por debajo de las rodillas (fuera: cambios sueltos de los animales)
    a_sh = Image.fromarray((np.clip(1 - rm, 0, 1) * sh * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.GaussianBlur(2))
    a_sh = np.round(np.asarray(a_sh, np.float32) / 255 * 32) / 32
    arr = np.zeros(B.shape[:2] + (4,), np.float32); arr[..., :3] = F * (fm > 0)[..., None]; arr[..., 3] = np.maximum(fm, a_sh * (1 - fm)) * 255
    arr = arr.clip(0, 255).astype(np.uint8)
    d = os.path.join(out, c + '-' + a + '.webp'); Image.fromarray(arr, 'RGBA').save(d, 'WEBP', quality=74, alpha_quality=80, method=6); tot += os.path.getsize(d)
print('portadas', len(${JSON.stringify(jobs)}), 'total KB', tot // 1024)
`], { stdio: 'inherit' });
