// Las miniaturas de cada paso de las láminas de los oficios (22 de noviembre de 2026; el autor: «que se asocien las
// láminas con la explicación de los oficios, pero más interactivos y acordes al diseño del juego»): la lámina abierta en
// ese paso (?paso=N, el puente de comun.mjs), de cerca alrededor de la pieza que trabaja, que sale iluminada. Salen en
// public/anatomia/pasos/<lámina>-<paso>.webp y las enseña la tarjeta de cada paso del taller (ui/tallerPaso.js).
// Uso (con el servidor de desarrollo en 5173): node tools/anatomia/pasos-miniaturas.mjs [lámina…]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const LAMINAS = process.argv.slice(2).length ? process.argv.slice(2) : ['ferreria', 'pan', 'cantero', 'tonelero', 'cesta'];
const OUT = 'public/anatomia/pasos', URL = process.env.URL || 'http://127.0.0.1:5173';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 690 }, deviceScaleFactor: 2 });
// (de cerca: el recuadro de las piezas encendidas —[data-lit]— con aire alrededor, en 3:2 y nunca más pequeño que un
// tercio del dibujo, para que se reconozca dónde está)
const ASP = 1.5;
for (const id of LAMINAS) {
  for (let i = 0; i < 6; i++) {
    await p.goto(`${URL}/anatomia/${id}.html?juego&paso=${i}`);
    await p.waitForTimeout(1400);
    const r = await p.evaluate((ASP) => {
      const st = document.querySelector('.iso-stage').getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of document.querySelectorAll('[data-lit]')) {
        const q = n.getBoundingClientRect(); if (q.width < 1 || q.height < 1) continue;
        x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom);
      }
      if (!isFinite(x0)) return { x: st.x, y: st.y, width: st.width, height: st.height };
      let w = (x1 - x0) * 1.5 + 40, h = (y1 - y0) * 1.5 + 40;
      w = Math.max(w, st.width / 3, h * ASP); h = w / ASP;
      if (w > st.width) { w = st.width; h = w / ASP; }
      if (h > st.height) { h = st.height; w = h * ASP; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const x = Math.max(st.left, Math.min(st.right - w, cx - w / 2)), y = Math.max(st.top, Math.min(st.bottom - h, cy - h / 2));
      return { x, y, width: w, height: h };
    }, ASP);
    const png = `${OUT}/${id}-${i}.png`;
    await p.screenshot({ path: png, clip: r });
    execFileSync('convert', [png, '-resize', '360x240^', '-gravity', 'center', '-extent', '360x240', '-quality', '84', `${OUT}/${id}-${i}.webp`]);
    execFileSync('rm', [png]);
  }
  console.log(id);
}
await b.close();
