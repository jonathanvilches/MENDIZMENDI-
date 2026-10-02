// Iconos de la app instalable (public/icon-*.png): el mismo dibujo que el icono de la pestaña (monte dorado sobre morado).
// Uso: node tools/iconos-app.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const svg = (rx, pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rx}" fill="#8A2BE2"/><g transform="translate(32 32) scale(${pad}) translate(-32 -35)"><path d="M8 50 26 20l10 16 6-8 14 22z" fill="#FFD700"/></g></svg>`;
for (const [name, size, rx, pad] of [['icon-192', 192, 14, 1], ['icon-512', 512, 14, 1], ['icon-maskable-512', 512, 0, 0.72]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml,${encodeURIComponent(svg(rx, pad))}" width="${size}" height="${size}">`);
  await p.screenshot({ path: `public/${name}.png`, omitBackground: true }); await p.close();
}
await b.close(); console.log('iconos listos');
