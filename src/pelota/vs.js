// Pantalla «VS» antes de cada partido, como la presentación de una gran final: los dos bandos entran desde los lados
// (azules a la izquierda y colorados a la derecha, como en los partidos de verdad, dentro de la gama morada del juego),
// barren los focos, suben chispas, el «VS» golpea la pantalla con un destello y aparecen los rótulos de cada jugador con su
// media y sus cualidades. Arriba, la competición y el sitio; abajo, una frase del rival que pasa como un rótulo de
// retransmisión. Se toca (o se pulsa una tecla) para empezar; si no, sigue sola a los pocos segundos.
// La usan la pelota (figuras de nuestros pelotaris en 3D, hechas con tools/meshy-retratos.mjs) y el fútbol (las
// camisetas de los dos clubes). El dibujo del frontón es propio.
import { esc } from './hud.js';
import { enCss } from '../util/tele.js';

const CSS = `
/* (la gama y las letras van aquí también: el fútbol se puede abrir solo, sin el resto del juego) */
.pvs{--v0:#07020f;--v2:#1e0a44;--azul:#5b4bff;--azul2:#24127a;--rojo:#ff2e88;--rojo2:#6e0b4c;--lila:#c9b2ff;--rosa:#ff7ac8;--fx:#ff2bd6;--fx2:#c21cff;--cta:linear-gradient(100deg,#ff2bd6 0%,#c21cff 55%,#7b2ff7 100%);--f-display:'MZ Display','MZ Texto',system-ui,sans-serif;--f-cond:'MZ Cond','MZ Texto',system-ui,sans-serif;
  position:fixed;inset:0;z-index:2000;overflow:hidden;pointer-events:auto;cursor:pointer;color:#fff;font-family:var(--f-cond);background:var(--v0);animation:pvs-in .2s ease-out both}
.pvs.shake{animation:pvs-shake .42s cubic-bezier(.36,.07,.19,.97) both}
.pvs-side{position:absolute;top:0;bottom:0;width:60%;overflow:hidden}
.pvs-side.azul{left:0;background:radial-gradient(90% 80% at 25% 70%,#7b6bff 0%,var(--azul) 30%,var(--azul2) 72%,#0b0530 100%);clip-path:polygon(0 0,100% 0,72% 100%,0 100%);animation:pvs-l .45s cubic-bezier(.2,.9,.3,1) both}
.pvs-side.rojo{right:0;background:radial-gradient(90% 80% at 75% 70%,#ff6fb5 0%,var(--rojo) 30%,var(--rojo2) 72%,#2a0420 100%);clip-path:polygon(28% 0,100% 0,100% 100%,0 100%);animation:pvs-r .45s cubic-bezier(.2,.9,.3,1) both}
/* rayas de velocidad que corren hacia el centro, tumbadas y en trazos (casi verticales parecían lluvia cayendo sobre el frontón) */
.pvs-side::before{content:'';position:absolute;top:0;bottom:0;left:-240px;right:-240px;background:repeating-linear-gradient(180deg,transparent 0 30px,rgba(255,255,255,.08) 30px 32px);-webkit-mask-image:repeating-linear-gradient(90deg,transparent 0,#000 120px,transparent 240px);mask-image:repeating-linear-gradient(90deg,transparent 0,#000 120px,transparent 240px);animation:pvs-run 1.6s linear infinite}
.pvs-side.rojo::before{animation-direction:reverse}
/* foco que barre cada lado */
.pvs-side::after{content:'';position:absolute;top:-30%;left:30%;width:40%;height:160%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);transform-origin:50% 0;animation:pvs-beam 3.2s ease-in-out infinite alternate}
.pvs-side.rojo::after{animation-delay:-1.6s}
/* (sin líneas separadoras: los dos lados se separan solos por su color; la raya blanca del centro cruzaba los rótulos) */
/* el golpe del VS: un destello que sale del centro, rosa; a toda pantalla y blanco parecía un relámpago */
.pvs-flash{position:absolute;inset:0;z-index:6;background:radial-gradient(60% 70% at 50% 45%,rgba(255,255,255,.9) 0%,rgba(255,122,200,.55) 35%,rgba(255,43,214,0) 70%);opacity:0;pointer-events:none;animation:pvs-flash .5s .62s ease-out both}
.pvs-sparks{position:absolute;inset:0;z-index:2;pointer-events:none}
.pvs-sparks i{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px var(--rosa);opacity:0;animation:pvs-spark var(--t,3s) linear var(--d,0s) infinite}
.pvs-top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:5;display:flex;justify-content:center;animation:pvs-drop .4s .9s cubic-bezier(.2,1.3,.4,1) both}
.pvs-bar{display:flex;align-items:stretch;max-width:calc(100% - 32px);filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.pvs-bar>*{display:flex;align-items:center;gap:8px;padding:4px 16px;min-height:34px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-comp{background:var(--cta);font:400 var(--fs-lg)/1 var(--f-display);text-transform:uppercase;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);padding-left:20px!important;padding-right:20px!important}
.pvs-venue{background:rgba(7,2,15,.86);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);margin-left:-10px;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);padding-left:22px!important;padding-right:22px!important}
.pvs-venue svg{width:34px;height:26px;flex:none}
.pvs-lineb{background:rgba(7,2,15,.86);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:#fff;margin-left:-10px;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);padding-left:22px!important;padding-right:22px!important;border-left:2px solid var(--fx)}
.pvs-fig{position:absolute;left:0;top:0;width:50%;height:100%;z-index:3;pointer-events:none}
/* (cada imagen, de pie sobre el borde de abajo de su caja; el sitio y la altura los pone layoutVs) */
.pvs-fig>img,.pvs-fig>.pf{position:absolute;left:0;bottom:0;height:100%;width:auto;max-width:none;z-index:2}.pvs-fig>.mate{z-index:1}
.pvs-fig.azul{animation:pvs-figl .55s .25s cubic-bezier(.2,1.15,.4,1) both}.pvs-fig.rojo{animation:pvs-figr .55s .25s cubic-bezier(.2,1.15,.4,1) both}
.pvs-fig.azul>img,.pvs-fig.azul>.pf{filter:drop-shadow(0 0 2px #fff) drop-shadow(-8px 0 18px rgba(123,107,255,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
.pvs-fig.rojo>img,.pvs-fig.rojo>.pf{transform:scaleX(-1);filter:drop-shadow(0 0 2px #fff) drop-shadow(-8px 0 18px rgba(255,111,181,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
/* (el compañero, detrás: algo más pequeño y apagado) */
.pvs-fig .mate{opacity:.9}
.pvs-fig>.kit{position:absolute;inset:0;display:grid;place-items:end center;padding-bottom:4%}.pvs-fig .kit svg{width:auto;height:84%;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
/* (las zonas seguras del iPhone, para medirlas) */
.pvs-safe{position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}
.pvs-x{position:absolute;left:50%;top:44%;z-index:5;transform:translate(-50%,-50%);font:400 clamp(72px,calc(16vh / var(--z, 1)),140px)/1 var(--f-display);letter-spacing:-.02em;padding:0 .08em;
  background:linear-gradient(180deg,#fff 0%,#fff 42%,var(--rosa) 58%,var(--fx2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(255,43,214,.85)) drop-shadow(0 6px 0 rgba(7,2,15,.7));
  animation:pvs-x .45s .5s cubic-bezier(.2,1.6,.4,1) both}
.pvs-mid{position:absolute;left:50%;top:calc(44% + clamp(50px,calc(12vh / var(--z, 1)),84px));z-index:5;transform:translateX(-50%);width:min(300px,34%);display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;animation:pvs-upc .35s 1.05s ease-out both}
.pvs-line{font:800 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.pvs-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
.pvs-tags span{padding:2px 8px;background:rgba(7,2,15,.75);border:1px solid rgba(201,178,255,.35);font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila);clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)}
.pvs-tags b{color:#fff;font-weight:800}
.pvs [hidden]{display:none!important}.pvs-tags span{white-space:nowrap}.pvs-mid.stack .pvs-tags{flex-direction:column;align-items:center}
.pvs-plate{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 46px);z-index:5;width:max-content;max-width:min(330px,38%);display:grid;grid-template-columns:auto minmax(0,1fr);align-items:stretch;filter:drop-shadow(0 8px 16px rgba(0,0,0,.55))}
.pvs-plate.azul{left:calc(env(safe-area-inset-left,0px) + 16px);animation:pvs-pl .4s .85s cubic-bezier(.2,1.2,.4,1) both}
.pvs-plate.rojo{right:calc(env(safe-area-inset-right,0px) + 16px);grid-template-columns:minmax(0,1fr) auto;text-align:right;animation:pvs-pr .4s .95s cubic-bezier(.2,1.2,.4,1) both}
.pvs-ovr{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 12px;background:#fff;color:var(--v2);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
.pvs-plate.azul .pvs-ovr{color:var(--azul2)}.pvs-plate.rojo .pvs-ovr{order:2;color:var(--rojo2)}
.pvs-ovr b{font:400 var(--fs-3xl)/1 var(--f-display)}.pvs-ovr small{font:800 var(--fs-xs)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
.pvs-who{min-width:0;padding:4px 14px;background:rgba(7,2,15,.86);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);margin-left:-6px}
.pvs-plate.rojo .pvs-who{margin:0 -6px 0 0}
.pvs-who b{display:block;padding-right:.1em;font:400 var(--fs-2xl)/1.15 var(--f-display);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-who small{display:block;font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-st{display:flex;gap:10px;font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila)}.pvs-plate.rojo .pvs-st{justify-content:flex-end}
.pvs-st b{display:inline;font:800 var(--fs-sm)/1 var(--f-cond);color:#fff;margin-left:3px}
.pvs-tick{position:absolute;left:0;right:0;bottom:0;z-index:5;height:calc(env(safe-area-inset-bottom,0px) + 36px);padding-bottom:env(safe-area-inset-bottom,0px);display:flex;align-items:center;background:rgba(7,2,15,.9);animation:pvs-up .35s 1.2s ease-out both}
.pvs-tick .q{flex:1;min-width:0;overflow:hidden;white-space:nowrap;padding-left:calc(env(safe-area-inset-left,0px) + 16px);font:600 var(--fs-sm)/1.3 var(--f-cond);font-style:italic;letter-spacing:.02em}
.pvs-tick .q span{display:inline-block;padding-right:40px}.pvs-tick .q.run span{animation:pvs-marq var(--mt,12s) linear 1.6s infinite}
.pvs-tick .q em{font-style:normal;color:var(--rosa);font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-right:8px}
.pvs-tap{flex:none;align-self:stretch;display:flex;align-items:center;padding:0 calc(env(safe-area-inset-right,0px) + 16px) 0 20px;background:var(--cta);font:400 var(--fs-md)/1 var(--f-display);text-transform:uppercase;letter-spacing:.04em;clip-path:polygon(12px 0,100% 0,100% 100%,0 100%);animation:pvs-tap 1s ease-in-out 1.6s infinite alternate}
.pvs.out{animation:pvs-out .22s ease-in both}
@keyframes pvs-in{from{opacity:0}to{opacity:1}}@keyframes pvs-out{to{opacity:0;transform:scale(1.04)}}
@keyframes pvs-l{from{transform:translateX(-100%)}to{transform:none}}@keyframes pvs-r{from{transform:translateX(100%)}to{transform:none}}
@keyframes pvs-figl{from{transform:translateX(-70%) scale(.9);opacity:0}to{transform:none;opacity:1}}@keyframes pvs-figr{from{transform:translateX(70%) scale(.9);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-run{from{transform:translateX(-240px)}to{transform:none}}
@keyframes pvs-beam{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}
@keyframes pvs-flash{0%{opacity:0}12%{opacity:.75}100%{opacity:0}}
@keyframes pvs-x{from{transform:translate(-50%,-50%) scale(3.2) rotate(-8deg);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes pvs-shake{0%,100%{transform:none}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-1px)}}
@keyframes pvs-drop{from{transform:translateY(-80px)}to{transform:none}}
@keyframes pvs-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-upc{from{transform:translate(-50%,24px);opacity:0}to{transform:translateX(-50%);opacity:1}}
@keyframes pvs-pl{from{transform:translateX(-120%) skewX(-10deg)}to{transform:none}}@keyframes pvs-pr{from{transform:translateX(120%) skewX(10deg)}to{transform:none}}
@keyframes pvs-spark{0%{transform:translate(0,0);opacity:0}10%{opacity:1}100%{transform:translate(var(--x,20px),calc(-110vh / var(--z, 1)));opacity:0}}
@keyframes pvs-marq{0%,12%{transform:translateX(0)}100%{transform:translateX(-100%)}}
@keyframes pvs-tap{from{filter:brightness(.85)}to{filter:brightness(1.2)}}
@media (orientation:landscape) and (max-height:500px){.pvs-who b{font-size:var(--fs-xl)}.pvs-ovr b{font-size:var(--fs-2xl)}.pvs-plate{max-width:min(300px,36%)}}
@media (orientation:portrait){.pvs-bar{flex-wrap:wrap;justify-content:center;row-gap:4px}.pvs-venue{margin-left:0}.pvs-who b{font-size:var(--fs-xl)}.pvs-comp{font-size:var(--fs-md)}}
/* (placas compactas en pantallas muy bajas: Safari con sus barras en el móvil tumbado) */
@media (orientation:landscape) and (max-height:340px){.pvs-who{padding:2px 12px}.pvs-who b{font-size:var(--fs-lg)}.pvs-ovr{padding:2px 10px}.pvs-ovr b{font-size:var(--fs-xl)}.pvs-st b{font-size:var(--fs-xs)}}
@media (prefers-reduced-motion:reduce){.pvs,.pvs *{animation:none!important}.pvs-flash{display:none}}
`;

// dibujo del frontón: el frontis y la pared izquierda con la cancha; con tejado si es cubierto, sillares si es de
// piedra, gotas si llueve, copos si nieva y el Labrit con su fachada
export function courtIcon(c = {}) {
  const roof = c.covered || c.labrit, wall = c.labrit ? '#b05a8a' : c.stone ? '#a99ac8' : '#6a5aa8';
  return `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 44h52l-8-10H14z" fill="#3a2a5e" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M14 34V14h22v20z" fill="${wall}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 34L6 44V22l8-8z" fill="${wall}" opacity=".8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M14 31h22" stroke="#ff2bd6" stroke-width="2"/>`
    + (c.stone && !c.labrit ? `<path d="M14 20h22M14 26h22M25 14v6M20 20v6M30 20v6M25 26v5" stroke="rgba(0,0,0,.28)" stroke-width="1"/>` : '')
    + (roof ? `<path d="M2 16L32 4l30 12" fill="none" stroke="#ff7ac8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="52" cy="9" r="4" fill="#ff7ac8"/>`)
    + (c.wet && !roof ? (c.snow ? `<g fill="#fff"><circle cx="44" cy="19" r="1.6"/><circle cx="50" cy="23" r="1.6"/><circle cx="56" cy="19" r="1.6"/></g>` : `<path d="M44 18l-2 5M50 20l-2 5M56 18l-2 5" stroke="#c9b2ff" stroke-width="2" stroke-linecap="round"/>`) : '')
    + `<circle cx="40" cy="38" r="2.2" fill="#fff"/></svg>`;
}

let styled = false;
// La composición, medida en cada pantalla (al abrir, al cargar las imágenes y las letras y al girar el móvil):
//  · en horizontal, en el centro una columna con el VS y las etiquetas, tan ancha como ellas; la línea del partido
//    (tantos y nivel) sube a la barra de arriba si cabe en una fila. Cada bando, lo más grande que cabe en su lado sin
//    pisar esa columna: la cabeza bajo la barra de arriba y, si la figura no llega abajo, de pie sobre la barra de abajo.
//    Los dos bandos, a la misma altura. Las placas, abajo, sobre las piernas; el VS, centrado en el hueco que dejan.
//  · en vertical, arriba los azules y abajo los colorados, partidos por una diagonal; el VS en medio y cada placa del lado
//    contrario a su figura, sobre su cintura.
// En las parejas, el compañero va detrás, algo más pequeño y tapado en casi la mitad (en horizontal, hacia fuera: puede
// salirse un poco por el borde; la figura delantera queda junto al centro).
const MS = 0.86, MSP = 0.92, OV = 0.45;
// (dónde acaba la cara, en parte del alto de la imagen: los pelotaris y las parejas de fútbol)
const FACE = 0.33, FACE_DUO = 0.30;
const ratio = (im, def) => (im?.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : def);
function groupOf(fig, ms = MS) {
  const main = fig.querySelector(':scope > :not(.mate)'), mate = fig.querySelector(':scope > .mate'), kit = !!main?.classList.contains('kit'), duo = !!main?.classList.contains('duo');
  // face: hasta dónde llegan las caras (la del compañero, más abajo por ser más pequeño); nada debe taparlas
  return { main, mate, kit, duo, ms, a: kit ? 0.8 : ratio(main, duo ? 1 : 2 / 3), am: mate ? ratio(mate, 2 / 3) * ms : 0, face: kit ? 0.6 : mate ? 1 - ms + ms * FACE : duo ? FACE_DUO : FACE };
}
// coloca la figura (y el compañero) dentro de su caja: x de la delantera y hacia qué lado va el de detrás (-1 izquierda, 1 derecha)
function putGroup(fig, g, FH, x, dir) {
  // (la camiseta dibujada del archivo único: su caja, del ancho de la camiseta)
  if (g.kit) { Object.assign(g.main.style, { left: `${x}px`, right: 'auto', width: `${g.a * FH}px` }); return; }
  const mw = g.a * FH, cw = g.am * FH;
  Object.assign(g.main.style, { left: `${x}px`, height: `${FH}px` });
  if (g.mate) Object.assign(g.mate.style, { left: `${dir < 0 ? x - cw * (1 - OV) : x + mw - cw * OV}px`, height: `${FH * g.ms}px` });
}
function layoutVs(el) {
  const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
  const $ = (q) => el.querySelector(q), port = H > W, px = (v) => `${Math.round(v)}px`;
  const sp = getComputedStyle($('.pvs-safe')), sL = parseFloat(sp.paddingLeft) || 0, sR = parseFloat(sp.paddingRight) || 0;
  const top = $('.pvs-top'), bar = $('.pvs-bar'), tick = $('.pvs-tick'), x = $('.pvs-x'), mid = $('.pvs-mid'), lineM = $('.pvs-mid .pvs-line'), lineB = $('.pvs-lineb');
  const figs = { azul: $('.pvs-fig.azul'), rojo: $('.pvs-fig.rojo') }, plates = { azul: $('.pvs-plate.azul'), rojo: $('.pvs-plate.rojo') };
  const sides = { azul: $('.pvs-side.azul'), rojo: $('.pvs-side.rojo') }, K = ['azul', 'rojo'];
  // la línea del partido: arriba, en la barra (en vertical, en su propia fila); en horizontal, solo si cabe en una fila
  if (lineB) { lineB.hidden = false; const need = [...bar.children].reduce((t, c) => t + c.scrollWidth, 0) - 10 * (bar.children.length - 1);
    lineB.hidden = !port && need > W - sL - sR - 32; if (lineM) lineM.hidden = !lineB.hidden; }
  mid.hidden = ![...mid.children].some(c => !c.hidden);
  for (const k of K) { for (const p of ['left', 'right', 'top', 'bottom', 'maxWidth']) plates[k].style[p] = ''; Object.assign(sides[k].style, { width: '', left: '', right: '', clipPath: '' }); figs[k].style.clipPath = ''; }
  // el centro (las etiquetas): su ancho natural, en columna si así deja más sitio a las figuras
  const midSize = (stack, max) => { mid.classList.toggle('stack', stack); Object.assign(mid.style, { width: 'max-content', alignItems: '', textAlign: '' });
    const w = mid.hidden ? 0 : Math.min(Math.ceil(enCss(mid.getBoundingClientRect().width)) + 1, max); mid.style.width = `${w}px`; return [w, mid.hidden ? 0 : mid.offsetHeight]; };
  const B = tick.offsetTop, g = { azul: groupOf(figs.azul, port ? MSP : MS), rojo: groupOf(figs.rojo, port ? MSP : MS) };
  if (!port) {
    const T = top.offsetTop + top.offsetHeight + 8, PT = Math.min(plates.azul.offsetTop, plates.rojo.offsetTop) - 10;
    // el VS y las etiquetas, un bloque centrado en el hueco entre la barra de arriba y las placas (el VS, como mucho
    // del 13 % del ancho: lo demás es para las figuras)
    const vsF = (MH) => Math.max(44, Math.min(150, Math.max(72, H * 0.28), W * 0.13 / 1.03, PT - T - (MH ? MH + 12 : 0)));
    let [midW, MH] = midSize(true, W * 0.34);
    if (MH && vsF(MH) < 72) [midW, MH] = midSize(false, W * 0.34);
    const F = vsF(MH); x.style.fontSize = px(F);
    const y0 = T + (PT - T - F - (MH ? MH + 12 : 0)) / 2;
    x.style.top = px(y0 + F / 2); Object.assign(mid.style, { left: '', top: px(y0 + F + 12) });
    const CW = Math.max(x.offsetWidth, midW) + 32, side = W / 2 - CW / 2;
    // la altura de los dos bandos: la que cabe en el lado más justo. Las parejas de fútbol, sin salirse (la cara de fuera,
    // lejos del borde); en pelota por parejas, el de detrás puede salirse por fuera, pero no su cara
    const fit1 = (q, sOut) => (q.kit ? (side - sOut) / q.a : q.mate ? (side - Math.max(sOut, 34)) / (q.a * 0.97 + q.am * (1 - OV - 0.28))
      : q.main?.classList.contains('duo') ? (side - W * 0.02) * 1.02 / q.a : side * 1.06 / q.a);
    let FH = Math.min(fit1(g.azul, sL), fit1(g.rojo, sR), (B - T) / 0.66, (PT - 4 - T) / Math.max(g.azul.face, g.rojo.face, 0.01));
    if (g.azul.kit || g.rojo.kit) FH = Math.min(FH, B - T);
    // si la figura no llega abajo, de pie sobre la barra de abajo; si no, con la cabeza bajo la barra de arriba
    const fy = FH * 0.985 < B - T ? B - FH * 0.985 : T;
    for (const k of K) {
      const q = g[k], f = figs[k], x0 = k === 'azul' ? 0 : W / 2 + CW / 2, mw = q.a * FH, duo = q.main?.classList.contains('duo');
      Object.assign(f.style, { left: px(x0), top: px(fy), width: px(side), height: px(FH) });
      // la delantera: centrada en su lado (las parejas de fútbol, en su parte segura) o, con compañero, junto al centro
      const mx = q.mate ? (k === 'azul' ? side - mw * 0.97 : -mw * 0.03) : duo ? (k === 'azul' ? W * 0.02 + (side - W * 0.02 - mw) / 2 : (side - W * 0.02 - mw) / 2) : (side - mw) / 2;
      putGroup(f, q, FH, mx, k === 'azul' ? -1 : 1);
    }
    return;
  }
  // vertical: arriba la barra con la línea y, debajo, las etiquetas; luego los azules, la diagonal con el VS y los colorados
  const [, MH] = midSize(false, W - 32), bt = top.offsetTop + top.offsetHeight + 8;
  Object.assign(mid.style, { left: '', top: px(bt) });
  const T = bt + (MH ? MH + 8 : 0), F = Math.max(56, Math.min(120, W * 0.26)), gap = F / 2 + 4;
  // (la diagonal, donde los dos bandos tienen el mismo alto)
  const C = Math.round((T + B - gap) / 2), dd = W * 0.07;
  Object.assign(sides.azul.style, { width: '100%', left: '0', right: '0', clipPath: `polygon(0 0,100% 0,100% ${px(C - dd)},0 ${px(C + dd)})` });
  Object.assign(sides.rojo.style, { width: '100%', left: '0', right: '0', clipPath: `polygon(0 ${px(C + dd)},100% ${px(C - dd)},100% 100%,0 100%)` });
  Object.assign(x.style, { fontSize: px(F), top: px(C) });
  const pw = Math.min(W * 0.72, 320);
  for (const k of K) plates[k].style.maxWidth = px(pw);
  const PH = Math.max(plates.azul.offsetHeight, plates.rojo.offsetHeight);
  // cada placa, sobre la cintura de los suyos y del lado contrario a su figura delantera
  Object.assign(plates.azul.style, { left: 'auto', right: px(16 + sR), bottom: 'auto', top: px(C - gap - 6 - PH) });
  Object.assign(plates.rojo.style, { right: 'auto', left: px(16 + sL), bottom: 'auto', top: px(B - 10 - PH) });
  // cada bando a lo ancho de la pantalla, de la cabeza a la cintura (o más, si cabe), el mismo tamaño los dos
  const yR = C + gap, w1 = (q) => (q.kit ? 1 / q.a : 1 / (q.a + q.am * (1 - OV)));
  const inner = W - 32 - sL - sR, FH = Math.min((C - T) * 1.55, (B - yR) * 1.55, inner * w1(g.azul), inner * w1(g.rojo),
    (C - gap - 6 - PH - 4 - T) / Math.max(g.azul.face, 0.01), (B - 10 - PH - 4 - yR) / Math.max(g.rojo.face, 0.01));
  for (const k of K) {
    const q = g[k], f = figs[k], y = k === 'azul' ? T : yR, mw = q.a * FH;
    Object.assign(f.style, { left: '0', top: px(y), width: px(W), height: px(FH) });
    // (los azules, a la izquierda y cortados por la diagonal; los colorados, a la derecha)
    if (k === 'azul') f.style.clipPath = `polygon(0 ${px(-T)},100% ${px(-T)},100% ${px(C - dd - T)},0 ${px(C + dd - T)})`;
    // (con el mismo margen que las placas: 16 px)
    putGroup(f, q, FH, k === 'azul' ? 16 + sL : W - 16 - sR - mw, k === 'azul' ? 1 : -1);
  }
}
const plate = (s, side) => `<div class="pvs-plate ${side}">${s.ovr != null ? `<div class="pvs-ovr"><b>${esc(s.ovr)}</b><small>${esc(s.ovrLabel || 'Media')}</small></div>` : '<span></span>'}
  <div class="pvs-who"><b>${esc(s.name)}</b><small>${esc(s.sub || '')}</small>${s.stats?.length ? `<div class="pvs-st">${s.stats.map(q => `<span>${esc(q.k)}<b>${esc(q.v)}</b></span>`).join('')}</div>` : ''}</div></div>`;
// (la figura: pf, el HTML de una figura en su caja .pf, o img, una imagen; la del compañero, matePf o mateImg)
const fig = (s, side) => { if (s.figHtml) return `<div class="pvs-fig ${side}"><div class="kit">${s.figHtml}</div></div>`;
  const mate = s.matePf ? s.matePf.replace('class="pf', 'class="pf mate') : s.mateImg ? `<img class="mate" src="${s.mateImg}" alt="">` : '';
  return `<div class="pvs-fig ${side}">${side === 'rojo' ? mate : ''}${s.pf || `<img src="${s.img}" alt="">`}${side === 'azul' ? mate : ''}</div>`; };
/**
 * host: donde se pone (la capa del partido); d: { comp (competición o ronda), venue, cond (frontón) o venueIcon (html),
 * you, rival: { name, sub, pf, img o figHtml, matePf o mateImg?, ovr?, ovrLabel?, stats?: [{ k, v }] }, tags: [{ name, what }], line,
 * quote, quoteBy, tap, ms, onSlam }. Devuelve una promesa que se cumple al tocar, al pulsar una tecla o a los pocos segundos.
 */
export function showVs(host, d) {
  if (!styled) { const st = document.createElement('style'); st.id = 'pvs-style'; st.textContent = CSS; document.head.appendChild(st); styled = true; }
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'pvs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${d.you.name} VS ${d.rival.name}`);
    // chispas que suben (unas pocas y solo con CSS: en el móvil no pesan)
    const sparks = Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37 + 11) % 100}%;--d:${((i * 0.29) % 3).toFixed(2)}s;--t:${2.4 + (i % 5) * 0.5}s;--x:${(i % 2 ? 1 : -1) * (10 + (i * 7) % 40)}px"></i>`).join('');
    el.innerHTML = `<div class="pvs-side azul"></div><div class="pvs-side rojo"></div><div class="pvs-sparks" aria-hidden="true">${sparks}</div>
      ${fig(d.you, 'azul')}${fig(d.rival, 'rojo')}
      <div class="pvs-top"><div class="pvs-bar">${d.comp ? `<span class="pvs-comp">${esc(d.comp)}</span>` : ''}${d.venue ? `<span class="pvs-venue">${d.venueIcon || (d.cond ? courtIcon(d.cond) : '')}${esc(d.venue)}</span>` : ''}${d.line ? `<span class="pvs-lineb" hidden>${esc(d.line)}</span>` : ''}</div></div>
      <div class="pvs-x" aria-hidden="true">VS</div>
      <div class="pvs-mid">${d.line ? `<div class="pvs-line">${esc(d.line)}</div>` : ''}${d.tags?.length ? `<div class="pvs-tags">${d.tags.slice(0, 3).map(t => `<span title="${esc(t.what || '')}"><b>${esc(t.name)}</b></span>`).join('')}</div>` : ''}</div>
      ${plate(d.you, 'azul')}${plate(d.rival, 'rojo')}
      <div class="pvs-tick"><div class="q">${d.quote ? `<span><em>${esc(d.quoteBy || d.rival.name)}</em>«${esc(d.quote)}»</span>` : ''}</div><div class="pvs-tap">${esc(d.tap || '')}</div></div>
      <div class="pvs-flash"></div><div class="pvs-safe" aria-hidden="true"></div>`;
    host.appendChild(el);
    // la composición, medida ahora y otra vez al cargar las figuras y las letras o al girar la pantalla
    const fit = () => { try { layoutVs(el); } catch (e) { /* se queda como está */ } };
    fit(); document.fonts?.ready.then(fit);
    for (const im of el.querySelectorAll('.pvs-fig img')) if (!im.complete) im.addEventListener('load', fit, { once: true });
    addEventListener('resize', fit);
    // la frase pasa como un rótulo si no cabe
    requestAnimationFrame(() => { const q = el.querySelector('.pvs-tick .q'), sp = q?.firstElementChild; if (sp && sp.offsetWidth > q.clientWidth) { q.classList.add('run'); q.style.setProperty('--mt', `${Math.max(8, sp.offsetWidth / 60).toFixed(1)}s`); } });
    // el golpe del VS: la pantalla tiembla una vez (y suena, si quien la abre lo pide)
    const shk = setTimeout(() => { el.classList.add('shake'); try { d.onSlam?.(); } catch (e) { /* sin sonido */ } }, 600);
    let done = false;
    const end = () => { if (done) return; done = true; clearTimeout(tm); clearTimeout(shk); removeEventListener('keydown', key, true); removeEventListener('resize', fit); el.classList.add('out'); setTimeout(() => el.remove(), 230); res(); };
    const key = (e) => { e.stopImmediatePropagation(); e.preventDefault(); end(); };
    // (un momento sin aceptar toques: el mismo toque de «¡A jugar!» no se la salta antes de verla)
    const tm = setTimeout(end, d.ms || window.__vsMs || 5500);   // (las pruebas la dejan más tiempo con window.__vsMs)
    setTimeout(() => { if (done) return; el.addEventListener('pointerdown', end); addEventListener('keydown', key, true); }, 600);
  });
}
