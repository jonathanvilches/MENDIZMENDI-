// Retratos para el menú, con lab/retratos.html (las luces y el encuadre de los retratos de los chicos): de un avatar, el
// busto (256 × 256), el cuerpo entero (256 × 384) y el grande de la web (512 × 768), en src/assets/meshy/portraits; de
// una figura de leyenda o carnaval (su traje de npcGlb.js), el cuerpo entero a 768 × 1152 (web) y 384 × 576 (archivo
// único), en src/assets/figuras. WebP con fondo transparente.
// Uso: node tools/retratos.mjs avatar <id…>  |  node tools/retratos.mjs figura <id…>   (servidor de pruebas en 5173)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const [,, kind, ...ids] = process.argv;
if (!['avatar', 'figura'].includes(kind) || !ids.length) { console.error('uso: node tools/retratos.mjs avatar|figura <id…>'); process.exit(1); }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const shot = async (id, view, w, h, ry = kind === 'avatar' && /^(leire|nahia|nerea)$/.test(id) ? 0.55 : 0.3) => {   // (las chicas, algo más giradas: que se vea la coleta)
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${process.env.PUERTO || 5173}/lab/retratos.html?${kind}=${id}&view=${view}&ry=${ry}`, { timeout: 240000 });
  await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  const png = await p.screenshot({ omitBackground: true, type: 'png' }); await p.close();
  if (errs.length) console.log('  errores:', errs.join(' | '));
  return png;
};
for (const id of ids) {
  if (kind === 'avatar') {
    // (como los de los chicos: busto y cuerpo entero a doble resolución y reducidos, para que salgan suaves)
    const bust = await shot(id, 'bust', 512, 512), full = await shot(id, 'full', 512, 768), hero = await shot(id, 'hero', 1024, 1536);
    await sharp(bust).resize(256, 256).webp({ quality: 88, alphaQuality: 90 }).toFile(`src/assets/meshy/portraits/${id}_bust.webp`);
    await sharp(full).resize(256, 384).webp({ quality: 88, alphaQuality: 90 }).toFile(`src/assets/meshy/portraits/${id}_full.webp`);
    await sharp(hero).resize(512, 768).webp({ quality: 88, alphaQuality: 90 }).toFile(`src/assets/meshy/portraits/web/${id}_hero.webp`);
  } else {
    mkdirSync('src/assets/figuras/web', { recursive: true }); mkdirSync('src/assets/figuras/mini', { recursive: true });
    // (recortada al borde de la figura y encajada en 2:3 con aire: todas llenan igual su tarjeta)
    const png = await shot(id, 'full', 1536, 2304, 0.35), fondo = { r: 0, g: 0, b: 0, alpha: 0 };
    const rec = await sharp(png).trim({ threshold: 8 }).toBuffer();
    await sharp(rec).resize(704, 1080, { fit: 'contain', background: fondo }).extend({ top: 36, bottom: 36, left: 32, right: 32, background: fondo }).webp({ quality: 86, alphaQuality: 90 }).toFile(`src/assets/figuras/web/${id}.webp`);
    await sharp(rec).resize(352, 540, { fit: 'contain', background: fondo }).extend({ top: 18, bottom: 18, left: 16, right: 16, background: fondo }).webp({ quality: 82, alphaQuality: 85 }).toFile(`src/assets/figuras/mini/${id}.webp`);
  }
  console.log(kind, id);
}
await b.close();
