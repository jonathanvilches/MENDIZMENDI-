// Pantalla «VS» antes de cada partido: los azules a la izquierda y los colorados a la derecha (como en los partidos de
// verdad), cada pelotari en grande con su nombre y de dónde es, el frontón con lo que se nota al jugar en él (a cubierto,
// de piedra, mojado...) y una frase del rival que dice cómo juega. Se toca (o se pulsa una tecla) para empezar; si no,
// sigue sola a los pocos segundos. Las figuras son las de nuestros pelotaris en 3D (retratos hechos con
// tools/meshy-retratos.mjs) y el dibujo del frontón es propio.
import { esc } from './hud.js';

const CSS = `
.pvs{position:absolute;inset:0;z-index:30;overflow:hidden;pointer-events:auto;cursor:pointer;color:#fff;font-family:Nunito,system-ui,sans-serif;
  background:#1c0b3a;animation:pvs-in .25s ease-out both}
.pvs-side{position:absolute;top:0;bottom:0;width:58%}
.pvs-side.blue{left:0;background:radial-gradient(120% 90% at 30% 60%,#2f6fe0 0%,#17419e 55%,#0d2560 100%);clip-path:polygon(0 0,100% 0,72% 100%,0 100%)}
.pvs-side.red{right:0;background:radial-gradient(120% 90% at 70% 60%,#e0473a 0%,#a3221b 55%,#5e110d 100%);clip-path:polygon(28% 0,100% 0,100% 100%,0 100%)}
/* (las rayas de la cancha, muy suaves: los cuadros del frontón de fondo) */
.pvs-side::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 2px,transparent 2px 64px);pointer-events:none}
.pvs-band{position:absolute;top:-10%;bottom:-10%;left:50%;width:12px;transform:translateX(-50%) skewX(-13deg);background:linear-gradient(180deg,#fff08a,#FFD700 50%,#f0b400);box-shadow:0 0 24px rgba(255,215,0,.6)}
.pvs-top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 12px);display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:0 16px;z-index:2}
.pvs-venue{display:flex;align-items:center;gap:8px;font:400 var(--fs-lg)/1.15 'Lilita One',Nunito,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.45)}
.pvs-venue svg{width:40px;height:30px;flex:none}
.pvs-tags{display:flex;flex-direction:column;align-items:center;max-width:min(560px,60%);gap:2px;font-size:var(--fs-sm);font-weight:800;line-height:1.3;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.pvs-tags b{color:#FFD700}.pvs-line{font-size:var(--fs-sm);font-weight:800;line-height:1.3;opacity:.92;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.pvs-fig{position:absolute;bottom:0;height:min(76%,560px);display:flex;align-items:flex-end;z-index:1}
.pvs-fig img{height:100%;width:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))}
.pvs-fig.blue{left:4%;animation:pvs-l .45s cubic-bezier(.2,1.2,.4,1) both}.pvs-fig.red{right:4%;animation:pvs-r .45s cubic-bezier(.2,1.2,.4,1) both}
.pvs-fig.red img{transform:scaleX(-1)}
.pvs-fig .mate{height:82%;margin:0 -12% 0 0;opacity:.92}.pvs-fig.red .mate{margin:0 0 0 -12%}
.pvs-name{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 56px);z-index:2;max-width:40%;display:flex;flex-direction:column;gap:2px}
.pvs-name.blue{left:calc(env(safe-area-inset-left,0px) + 32%);text-align:left}.pvs-name.red{right:calc(env(safe-area-inset-right,0px) + 32%);text-align:right}
.pvs-name b{font:400 var(--fs-3xl)/1.15 'Lilita One',Nunito,sans-serif;text-transform:uppercase;text-shadow:0 3px 0 rgba(0,0,0,.45);overflow-wrap:anywhere}
.pvs-name small{font-size:var(--fs-sm);font-weight:800;line-height:1.3;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.pvs-x{position:absolute;left:50%;top:50%;z-index:3;transform:translate(-50%,-50%);font:400 var(--fs-5xl)/1 'Lilita One',Nunito,sans-serif;color:#FFD700;
  text-shadow:0 4px 0 #6b3f00,0 0 30px rgba(255,215,0,.55);-webkit-text-stroke:2px #3a2200;animation:pvs-x .5s .15s cubic-bezier(.2,1.6,.4,1) both}
.pvs-quote{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 32px);z-index:2;width:min(640px,calc(100% - 32px));text-align:center;
  font-size:var(--fs-md);font-weight:700;font-style:italic;line-height:1.3;text-shadow:0 1px 3px rgba(0,0,0,.7)}
.pvs-tap{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:2;text-align:center;font-size:var(--fs-xs);font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.85);animation:pvs-tap 1.2s ease-in-out infinite alternate}
.pvs.out{animation:pvs-out .22s ease-in both}
@keyframes pvs-in{from{opacity:0}to{opacity:1}}@keyframes pvs-out{to{opacity:0}}
@keyframes pvs-l{from{transform:translateX(-60%);opacity:0}to{transform:none;opacity:1}}@keyframes pvs-r{from{transform:translateX(60%);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-x{from{transform:translate(-50%,-50%) scale(2.4);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes pvs-tap{from{opacity:.45}to{opacity:1}}
/* móvil tumbado: las figuras algo más bajas para que no tapen los nombres, y la frase en una línea */
@media (orientation:landscape) and (max-height:500px){
  .pvs-fig{height:72%}.pvs-name{bottom:calc(env(safe-area-inset-bottom,0px) + 48px)}.pvs-name b{font-size:var(--fs-2xl)}
  .pvs-quote{bottom:calc(env(safe-area-inset-bottom,0px) + 28px);font-size:var(--fs-sm)}.pvs-x{font-size:var(--fs-4xl)}
}
@media (orientation:portrait){.pvs-fig{height:46%}.pvs-name{max-width:46%;bottom:calc(env(safe-area-inset-bottom,0px) + 96px)}.pvs-name.blue{left:16px}.pvs-name.red{right:16px}.pvs-quote{bottom:calc(env(safe-area-inset-bottom,0px) + 40px)}}
@media (prefers-reduced-motion:reduce){.pvs,.pvs *{animation:none!important}}
`;

// dibujo del frontón: el frontis y la pared izquierda con la cancha; con tejado si es cubierto, sillares si es de
// piedra, gotas si llueve y el Labrit con su fachada de ladrillo
export function courtIcon(c = {}) {
  const roof = c.covered || c.labrit, wall = c.labrit ? '#c9785a' : c.stone ? '#c4ab80' : '#5d8c74';
  return `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 44h52l-8-10H14z" fill="#8b948f" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M14 34V14h22v20z" fill="${wall}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 34L6 44V22l8-8z" fill="${wall}" opacity=".8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M14 31h22" stroke="#e0392f" stroke-width="2"/>`
    + (c.stone && !c.labrit ? `<path d="M14 20h22M14 26h22M25 14v6M20 20v6M30 20v6M25 26v5" stroke="rgba(0,0,0,.28)" stroke-width="1"/>` : '')
    + (roof ? `<path d="M2 16L32 4l30 12" fill="none" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="52" cy="9" r="4" fill="#FFD700"/>`)
    + (c.wet && !roof ? `<path d="M44 18l-2 5M50 20l-2 5M56 18l-2 5" stroke="#9fd0ff" stroke-width="2" stroke-linecap="round"/>` : '')
    + `<circle cx="40" cy="38" r="2.2" fill="#fff"/></svg>`;
}

let styled = false;
/**
 * host: donde se pone (la capa del partido); d: { you, rival: { name, sub, img, mateImg? }, venue, cond, tags: [{ name, what }],
 * line, quote, tap }. Devuelve una promesa que se cumple al tocar, al pulsar una tecla o a los pocos segundos.
 */
export function showVs(host, d) {
  if (!styled) { const st = document.createElement('style'); st.id = 'pvs-style'; st.textContent = CSS; document.head.appendChild(st); styled = true; }
  return new Promise(res => {
    const fig = (s, side) => `<div class="pvs-fig ${side}">${side === 'red' && s.mateImg ? `<img class="mate" src="${s.mateImg}" alt="">` : ''}<img src="${s.img}" alt="">${side === 'blue' && s.mateImg ? `<img class="mate" src="${s.mateImg}" alt="">` : ''}</div>`;
    const el = document.createElement('div'); el.className = 'pvs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${d.you.name} VS ${d.rival.name}`);
    el.innerHTML = `<div class="pvs-side blue"></div><div class="pvs-side red"></div><div class="pvs-band"></div>
      <div class="pvs-top"><div class="pvs-venue">${courtIcon(d.cond)}<span>${esc(d.venue || '')}</span></div>
        ${d.tags?.length ? `<div class="pvs-tags">${d.tags.map(t => `<span><b>${esc(t.name)}</b> · ${esc(t.what)}</span>`).join('')}</div>` : ''}
        ${d.line ? `<div class="pvs-line">${esc(d.line)}</div>` : ''}</div>
      ${fig(d.you, 'blue')}${fig(d.rival, 'red')}
      <div class="pvs-name blue"><b>${esc(d.you.name)}</b><small>${esc(d.you.sub || '')}</small></div>
      <div class="pvs-name red"><b>${esc(d.rival.name)}</b><small>${esc(d.rival.sub || '')}</small></div>
      <div class="pvs-x" aria-hidden="true">VS</div>
      ${d.quote ? `<p class="pvs-quote">«${esc(d.quote)}»</p>` : ''}<div class="pvs-tap">${esc(d.tap || '')}</div>`;
    host.appendChild(el);
    let done = false;
    const end = () => { if (done) return; done = true; clearTimeout(tm); removeEventListener('keydown', key, true); el.classList.add('out'); setTimeout(() => el.remove(), 230); res(); };
    const key = (e) => { e.stopImmediatePropagation(); e.preventDefault(); end(); };
    // (un momento sin aceptar toques: el mismo toque de «¡A jugar!» no se la salta antes de verla)
    const tm = setTimeout(end, d.ms || 4200);
    setTimeout(() => { if (done) return; el.addEventListener('pointerdown', end); addEventListener('keydown', key, true); }, 450);
  });
}
