// Lo que comparten todas las láminas técnicas (skill Anatomy): los colores del juego (morados, rosa y dorado), la versión
// «dentro del juego» (con ?juego en la dirección: sin la leyenda de debajo y del alto de la pantalla, para el visor de
// ui/anatomia.js) y dónde se escriben: entrega/anatomia/<nombre>.html (para el autor) y public/anatomia/<nombre>.html (la que
// abre el juego; solo la oscura).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT = join(RAIZ, '.claude/skills/anatomy/kit');

export const COLORES = `
.iso{--anatomy-page:#0c0618;--anatomy-card:#160c2a;--anatomy-text:#b9a9d8;--anatomy-strong:#ffd36a;--anatomy-muted:#7d6a9e;
--anatomy-paper:#160c2a;--anatomy-face:#21123c;--anatomy-top:#24143f;--anatomy-shade-0:#120a22;--anatomy-shade-1:#160d29;--anatomy-shade-2:#1b1031;--anatomy-shade-3:#201338;
--anatomy-lit-top:#3a1c4c;--anatomy-lit-shade:#2a1440;--anatomy-hi:#ecdcff;--anatomy-mid:#8c74b8;--anatomy-lo:#54407c;--anatomy-faint:#33244f;--anatomy-lit:#ff7ac8;
--anatomy-halo:#05020c;--anatomy-dot:#ecdcff}
.iso[data-theme="light"]{--anatomy-page:#f4f0fa;--anatomy-card:#fcfaff;--anatomy-text:#5a4a78;--anatomy-strong:#7a3b8f;--anatomy-muted:#8f80aa;
--anatomy-paper:#fcfaff;--anatomy-face:#ffffff;--anatomy-top:#ffffff;--anatomy-shade-0:#ddd6ea;--anatomy-shade-1:#e6e0f0;--anatomy-shade-2:#eee9f6;--anatomy-shade-3:#f5f2fa;
--anatomy-lit-top:#ffe9f6;--anatomy-lit-shade:#f7d9ec;--anatomy-hi:#2a1d42;--anatomy-mid:#8a78ad;--anatomy-lo:#b6a9cf;--anatomy-faint:#d8cfe8;--anatomy-lit:#d6338f;
--anatomy-halo:#8a7aa8;--anatomy-dot:#3a2d52}
`;

/** La versión del juego: la lámina entera cabe en el alto del visor (w, h: el tamaño del dibujo) */
export const enJuego = (w, h) => `
body.en-juego{background:var(--anatomy-card)}
body.en-juego .iso-page{margin:0 auto;width:min(calc(100vw - 4px),calc((100vh - 108px) * ${(w / h).toFixed(4)} + 48px))}
body.en-juego .iso-figure{margin:0}
body.en-juego .iso-plate{box-shadow:none}
body.en-juego .iso-legend{display:none}
body.en-juego [data-corner="hint"],body.en-juego [data-corner="title"]{display:none}
body.en-juego .iso-stage{touch-action:none}
`;
export const MARCA_JUEGO = `if (/[?&]juego\\b/.test(location.search)) document.body.classList.add('en-juego');\n`;

/** Escribe la lámina: siempre en entrega/anatomia; la oscura, también en public/anatomia para el juego */
export function escribe(nombre, html, theme) {
  const sale = [join(RAIZ, 'entrega/anatomia', theme === 'light' ? `${nombre}-light.html` : `${nombre}.html`)];
  if (theme !== 'light') sale.push(join(RAIZ, 'public/anatomia', `${nombre}.html`));
  for (const f of sale) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); }
  console.log('escrita', sale.join(' y '), Math.round(html.length / 1024) + ' KB');
}
