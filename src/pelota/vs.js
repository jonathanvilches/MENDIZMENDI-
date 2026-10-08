// Pantalla «VS» antes de cada partido, como la presentación de una gran final: los dos bandos entran desde los lados
// (azules a la izquierda y colorados a la derecha, como en los partidos de verdad, dentro de la gama morada del juego),
// barren los focos, suben chispas, el «VS» golpea la pantalla con un destello y aparecen los rótulos de cada jugador con su
// media y sus cualidades. Arriba, la competición y el sitio; abajo, una frase del rival que pasa como un rótulo de
// retransmisión. Se toca (o se pulsa una tecla) para empezar; si no, sigue sola a los pocos segundos.
// La usan la pelota (figuras de nuestros pelotaris en 3D, hechas con tools/meshy-retratos.mjs) y el fútbol (las
// camisetas de los dos clubes). El dibujo del frontón es propio.
import { esc } from './hud.js';

const CSS = `
.pvs{position:absolute;inset:0;z-index:30;overflow:hidden;pointer-events:auto;cursor:pointer;color:#fff;font-family:var(--f-cond);background:var(--v0);animation:pvs-in .2s ease-out both}
.pvs.shake{animation:pvs-shake .42s cubic-bezier(.36,.07,.19,.97) both}
.pvs-side{position:absolute;top:0;bottom:0;width:60%;overflow:hidden}
.pvs-side.azul{left:0;background:radial-gradient(90% 80% at 25% 70%,#7b6bff 0%,var(--azul) 30%,var(--azul2) 72%,#0b0530 100%);clip-path:polygon(0 0,100% 0,72% 100%,0 100%);animation:pvs-l .45s cubic-bezier(.2,.9,.3,1) both}
.pvs-side.rojo{right:0;background:radial-gradient(90% 80% at 75% 70%,#ff6fb5 0%,var(--rojo) 30%,var(--rojo2) 72%,#2a0420 100%);clip-path:polygon(28% 0,100% 0,100% 100%,0 100%);animation:pvs-r .45s cubic-bezier(.2,.9,.3,1) both}
/* rayas de velocidad que corren hacia el centro */
.pvs-side::before{content:'';position:absolute;inset:-20%;background:repeating-linear-gradient(100deg,rgba(255,255,255,.07) 0 3px,transparent 3px 38px);animation:pvs-run 1.6s linear infinite}
.pvs-side.rojo::before{animation-direction:reverse}
/* foco que barre cada lado */
.pvs-side::after{content:'';position:absolute;top:-30%;left:30%;width:40%;height:160%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);transform-origin:50% 0;animation:pvs-beam 3.2s ease-in-out infinite alternate}
.pvs-side.rojo::after{animation-delay:-1.6s}
.pvs-split{position:absolute;top:-10%;bottom:-10%;left:50%;width:8px;transform:translateX(-50%) skewX(-13deg);background:#fff;box-shadow:0 0 18px #fff,0 0 42px var(--fx),0 0 80px var(--fx);animation:pvs-split .5s .3s ease-out both}
.pvs-flash{position:absolute;inset:0;z-index:6;background:#fff;opacity:0;pointer-events:none;animation:pvs-flash .5s .62s ease-out both}
.pvs-sparks{position:absolute;inset:0;z-index:2;pointer-events:none}
.pvs-sparks i{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px var(--rosa);opacity:0;animation:pvs-spark var(--t,3s) linear var(--d,0s) infinite}
.pvs-top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:5;display:flex;justify-content:center;animation:pvs-drop .4s .9s cubic-bezier(.2,1.3,.4,1) both}
.pvs-bar{display:flex;align-items:stretch;max-width:calc(100% - 32px);filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.pvs-bar>*{display:flex;align-items:center;gap:8px;padding:4px 16px;min-height:34px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-comp{background:var(--cta);font:400 var(--fs-lg)/1 var(--f-display);text-transform:uppercase;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);padding-left:20px!important;padding-right:20px!important}
.pvs-venue{background:rgba(7,2,15,.86);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);margin-left:-10px;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);padding-left:22px!important;padding-right:22px!important}
.pvs-venue svg{width:34px;height:26px;flex:none}
.pvs-fig{position:absolute;bottom:0;height:min(84%,600px);display:flex;align-items:flex-end;z-index:3;pointer-events:none}
.pvs-fig img,.pvs-fig .kit{height:100%;width:auto;flex:none}
.pvs-fig.azul{left:6%;animation:pvs-figl .55s .25s cubic-bezier(.2,1.15,.4,1) both}.pvs-fig.rojo{right:6%;animation:pvs-figr .55s .25s cubic-bezier(.2,1.15,.4,1) both}
.pvs-fig.azul img{filter:drop-shadow(0 0 2px #fff) drop-shadow(-8px 0 18px rgba(123,107,255,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
.pvs-fig.rojo img{transform:scaleX(-1);filter:drop-shadow(0 0 2px #fff) drop-shadow(-8px 0 18px rgba(255,111,181,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
.pvs-fig .mate{height:80%;margin:0 -14% 0 0;opacity:.9}.pvs-fig.rojo .mate{margin:0 0 0 -14%}
.pvs-fig .kit{display:grid;place-items:end center;height:74%;padding-bottom:16%}.pvs-fig .kit svg{width:auto;height:100%;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
.pvs-x{position:absolute;left:50%;top:44%;z-index:5;transform:translate(-50%,-50%);font:400 clamp(72px,16vh,140px)/1 var(--f-display);letter-spacing:-.02em;padding:0 .08em;
  background:linear-gradient(180deg,#fff 0%,#fff 42%,var(--rosa) 58%,var(--fx2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(255,43,214,.85)) drop-shadow(0 6px 0 rgba(7,2,15,.7));
  animation:pvs-x .45s .5s cubic-bezier(.2,1.6,.4,1) both}
.pvs-mid{position:absolute;left:50%;top:calc(44% + clamp(40px,9vh,76px));z-index:5;transform:translateX(-50%);width:min(300px,34%);display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;animation:pvs-up .35s 1.05s ease-out both}
.pvs-line{font:800 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.pvs-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
.pvs-tags span{padding:2px 8px;background:rgba(7,2,15,.75);border:1px solid rgba(201,178,255,.35);font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila);clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)}
.pvs-tags b{color:#fff;font-weight:800}
.pvs-plate{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 46px);z-index:5;width:min(330px,38%);display:grid;grid-template-columns:auto minmax(0,1fr);align-items:stretch;filter:drop-shadow(0 8px 16px rgba(0,0,0,.55))}
.pvs-plate.azul{left:calc(env(safe-area-inset-left,0px) + 16px);animation:pvs-pl .4s .85s cubic-bezier(.2,1.2,.4,1) both}
.pvs-plate.rojo{right:calc(env(safe-area-inset-right,0px) + 16px);grid-template-columns:minmax(0,1fr) auto;text-align:right;animation:pvs-pr .4s .95s cubic-bezier(.2,1.2,.4,1) both}
.pvs-ovr{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 12px;background:#fff;color:var(--v2);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
.pvs-plate.azul .pvs-ovr{color:var(--azul2)}.pvs-plate.rojo .pvs-ovr{order:2;color:var(--rojo2)}
.pvs-ovr b{font:400 var(--fs-3xl)/.9 var(--f-display)}.pvs-ovr small{font:800 var(--fs-xs)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
.pvs-who{min-width:0;padding:4px 14px;background:rgba(7,2,15,.86);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);margin-left:-6px}
.pvs-plate.rojo .pvs-who{margin:0 -6px 0 0}
.pvs-who b{display:block;font:400 var(--fs-2xl)/1.05 var(--f-display);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-who small{display:block;font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-st{display:flex;gap:10px;font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila)}.pvs-plate.rojo .pvs-st{justify-content:flex-end}
.pvs-st b{display:inline;font:800 var(--fs-sm)/1 var(--f-cond);color:#fff;margin-left:3px}
.pvs-tick{position:absolute;left:0;right:0;bottom:0;z-index:5;height:calc(env(safe-area-inset-bottom,0px) + 36px);padding-bottom:env(safe-area-inset-bottom,0px);display:flex;align-items:center;background:rgba(7,2,15,.9);border-top:2px solid var(--fx);animation:pvs-up .35s 1.2s ease-out both}
.pvs-tick .q{flex:1;min-width:0;overflow:hidden;white-space:nowrap;padding-left:calc(env(safe-area-inset-left,0px) + 16px);font:600 var(--fs-sm)/1 var(--f-cond);font-style:italic;letter-spacing:.02em}
.pvs-tick .q span{display:inline-block;padding-right:40px}.pvs-tick .q.run span{animation:pvs-marq var(--mt,12s) linear 1.6s infinite}
.pvs-tick .q em{font-style:normal;color:var(--rosa);font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-right:8px}
.pvs-tap{flex:none;align-self:stretch;display:flex;align-items:center;padding:0 calc(env(safe-area-inset-right,0px) + 16px) 0 20px;background:var(--cta);font:400 var(--fs-md)/1 var(--f-display);text-transform:uppercase;letter-spacing:.04em;clip-path:polygon(12px 0,100% 0,100% 100%,0 100%);animation:pvs-tap 1s ease-in-out 1.6s infinite alternate}
.pvs.out{animation:pvs-out .22s ease-in both}
@keyframes pvs-in{from{opacity:0}to{opacity:1}}@keyframes pvs-out{to{opacity:0;transform:scale(1.04)}}
@keyframes pvs-l{from{transform:translateX(-100%)}to{transform:none}}@keyframes pvs-r{from{transform:translateX(100%)}to{transform:none}}
@keyframes pvs-figl{from{transform:translateX(-70%) scale(.9);opacity:0}to{transform:none;opacity:1}}@keyframes pvs-figr{from{transform:translateX(70%) scale(.9);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-run{from{background-position:0 0}to{background-position:200px 0}}
@keyframes pvs-beam{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}
@keyframes pvs-split{from{transform:translateX(-50%) skewX(-13deg) scaleY(0)}to{transform:translateX(-50%) skewX(-13deg) scaleY(1)}}
@keyframes pvs-flash{0%{opacity:0}12%{opacity:.75}100%{opacity:0}}
@keyframes pvs-x{from{transform:translate(-50%,-50%) scale(3.2) rotate(-8deg);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes pvs-shake{0%,100%{transform:none}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-1px)}}
@keyframes pvs-drop{from{transform:translateY(-80px)}to{transform:none}}
@keyframes pvs-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-pl{from{transform:translateX(-120%) skewX(-10deg)}to{transform:none}}@keyframes pvs-pr{from{transform:translateX(120%) skewX(10deg)}to{transform:none}}
@keyframes pvs-spark{0%{transform:translate(0,0);opacity:0}10%{opacity:1}100%{transform:translate(var(--x,20px),-110vh);opacity:0}}
@keyframes pvs-marq{0%,12%{transform:translateX(0)}100%{transform:translateX(-100%)}}
@keyframes pvs-tap{from{filter:brightness(.85)}to{filter:brightness(1.2)}}
@media (orientation:landscape){.pvs-fig.azul{left:2%}.pvs-fig.rojo{right:2%}}
@media (orientation:landscape) and (max-height:500px){.pvs-who b{font-size:var(--fs-xl)}.pvs-ovr b{font-size:var(--fs-2xl)}.pvs-plate{width:min(300px,36%)}.pvs-fig{height:80%}.pvs-x{font-size:clamp(80px,24vh,120px)}}
@media (orientation:portrait){.pvs-bar{flex-wrap:wrap;justify-content:center;row-gap:4px}.pvs-venue{margin-left:0}.pvs-fig{height:46%}.pvs-fig.azul{left:-4%}.pvs-fig.rojo{right:-4%}.pvs-plate{width:calc(50% - 20px);bottom:calc(env(safe-area-inset-bottom,0px) + 48px)}.pvs-who b{font-size:var(--fs-xl)}.pvs-x{top:34%}.pvs-mid{top:calc(34% + 64px);width:calc(100% - 32px)}.pvs-comp{font-size:var(--fs-md)}}
@media (prefers-reduced-motion:reduce){.pvs,.pvs *{animation:none!important}.pvs-flash{display:none}}
`;

// dibujo del frontón: el frontis y la pared izquierda con la cancha; con tejado si es cubierto, sillares si es de
// piedra, gotas si llueve y el Labrit con su fachada
export function courtIcon(c = {}) {
  const roof = c.covered || c.labrit, wall = c.labrit ? '#b05a8a' : c.stone ? '#a99ac8' : '#6a5aa8';
  return `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 44h52l-8-10H14z" fill="#3a2a5e" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M14 34V14h22v20z" fill="${wall}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 34L6 44V22l8-8z" fill="${wall}" opacity=".8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M14 31h22" stroke="#ff2bd6" stroke-width="2"/>`
    + (c.stone && !c.labrit ? `<path d="M14 20h22M14 26h22M25 14v6M20 20v6M30 20v6M25 26v5" stroke="rgba(0,0,0,.28)" stroke-width="1"/>` : '')
    + (roof ? `<path d="M2 16L32 4l30 12" fill="none" stroke="#ff7ac8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="52" cy="9" r="4" fill="#ff7ac8"/>`)
    + (c.wet && !roof ? `<path d="M44 18l-2 5M50 20l-2 5M56 18l-2 5" stroke="#c9b2ff" stroke-width="2" stroke-linecap="round"/>` : '')
    + `<circle cx="40" cy="38" r="2.2" fill="#fff"/></svg>`;
}

let styled = false;
const plate = (s, side) => `<div class="pvs-plate ${side}">${s.ovr != null ? `<div class="pvs-ovr"><b>${esc(s.ovr)}</b><small>${esc(s.ovrLabel || 'Media')}</small></div>` : '<span></span>'}
  <div class="pvs-who"><b>${esc(s.name)}</b><small>${esc(s.sub || '')}</small>${s.stats?.length ? `<div class="pvs-st">${s.stats.map(q => `<span>${esc(q.k)}<b>${esc(q.v)}</b></span>`).join('')}</div>` : ''}</div></div>`;
const fig = (s, side) => s.figHtml ? `<div class="pvs-fig ${side}"><div class="kit">${s.figHtml}</div></div>`
  : `<div class="pvs-fig ${side}">${side === 'rojo' && s.mateImg ? `<img class="mate" src="${s.mateImg}" alt="">` : ''}<img src="${s.img}" alt="">${side === 'azul' && s.mateImg ? `<img class="mate" src="${s.mateImg}" alt="">` : ''}</div>`;
/**
 * host: donde se pone (la capa del partido); d: { comp (competición o ronda), venue, cond (frontón) o venueIcon (html),
 * you, rival: { name, sub, img o figHtml, mateImg?, ovr?, ovrLabel?, stats?: [{ k, v }] }, tags: [{ name, what }], line,
 * quote, quoteBy, tap, ms, onSlam }. Devuelve una promesa que se cumple al tocar, al pulsar una tecla o a los pocos segundos.
 */
export function showVs(host, d) {
  if (!styled) { const st = document.createElement('style'); st.id = 'pvs-style'; st.textContent = CSS; document.head.appendChild(st); styled = true; }
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'pvs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${d.you.name} VS ${d.rival.name}`);
    // chispas que suben (unas pocas y solo con CSS: en el móvil no pesan)
    const sparks = Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37 + 11) % 100}%;--d:${((i * 0.29) % 3).toFixed(2)}s;--t:${2.4 + (i % 5) * 0.5}s;--x:${(i % 2 ? 1 : -1) * (10 + (i * 7) % 40)}px"></i>`).join('');
    el.innerHTML = `<div class="pvs-side azul"></div><div class="pvs-side rojo"></div><div class="pvs-split"></div><div class="pvs-sparks" aria-hidden="true">${sparks}</div>
      ${fig(d.you, 'azul')}${fig(d.rival, 'rojo')}
      <div class="pvs-top"><div class="pvs-bar">${d.comp ? `<span class="pvs-comp">${esc(d.comp)}</span>` : ''}${d.venue ? `<span class="pvs-venue">${d.venueIcon || (d.cond ? courtIcon(d.cond) : '')}${esc(d.venue)}</span>` : ''}</div></div>
      <div class="pvs-x" aria-hidden="true">VS</div>
      <div class="pvs-mid">${d.line ? `<div class="pvs-line">${esc(d.line)}</div>` : ''}${d.tags?.length ? `<div class="pvs-tags">${d.tags.slice(0, 3).map(t => `<span title="${esc(t.what || '')}"><b>${esc(t.name)}</b></span>`).join('')}</div>` : ''}</div>
      ${plate(d.you, 'azul')}${plate(d.rival, 'rojo')}
      <div class="pvs-tick"><div class="q">${d.quote ? `<span><em>${esc(d.quoteBy || d.rival.name)}</em>«${esc(d.quote)}»</span>` : ''}</div><div class="pvs-tap">${esc(d.tap || '')}</div></div>
      <div class="pvs-flash"></div>`;
    host.appendChild(el);
    // la frase pasa como un rótulo si no cabe
    requestAnimationFrame(() => { const q = el.querySelector('.pvs-tick .q'), sp = q?.firstElementChild; if (sp && sp.offsetWidth > q.clientWidth) { q.classList.add('run'); q.style.setProperty('--mt', `${Math.max(8, sp.offsetWidth / 60).toFixed(1)}s`); } });
    // el golpe del VS: la pantalla tiembla una vez (y suena, si quien la abre lo pide)
    const shk = setTimeout(() => { el.classList.add('shake'); try { d.onSlam?.(); } catch (e) { /* sin sonido */ } }, 600);
    let done = false;
    const end = () => { if (done) return; done = true; clearTimeout(tm); clearTimeout(shk); removeEventListener('keydown', key, true); el.classList.add('out'); setTimeout(() => el.remove(), 230); res(); };
    const key = (e) => { e.stopImmediatePropagation(); e.preventDefault(); end(); };
    // (un momento sin aceptar toques: el mismo toque de «¡A jugar!» no se la salta antes de verla)
    const tm = setTimeout(end, d.ms || window.__vsMs || 5500);   // (las pruebas la dejan más tiempo con window.__vsMs)
    setTimeout(() => { if (done) return; el.addEventListener('pointerdown', end); addEventListener('keydown', key, true); }, 600);
  });
}
