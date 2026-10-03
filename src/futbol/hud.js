// Interfaz del partido de fútbol (DOM): marcador, mensajes grandes, comentarios, joystick dinámico, cuatro botones (al
// defender, Pase pasa a ser Robar y Tiro, Entrada), barras de energía y de carga, flecha del jugador fuera de pantalla,
// tanda de penaltis, consejos del tutorial, menú previo, pausa y pantalla final. Todo con el prefijo «fb-», sin
// solaparse en móvil (vertical y horizontal) y escritorio.
const CSS = `
.fb-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:Nunito,system-ui,sans-serif;color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.fb-root *{box-sizing:border-box}
.fb-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);left:64px;right:64px;display:flex;flex-direction:column;align-items:center;gap:6px}
.fb-score{display:flex;align-items:stretch;border-radius:14px;overflow:hidden;background:rgba(16,10,30,.86);border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 18px rgba(0,0,0,.3);max-width:100%}
.fb-team{display:flex;align-items:center;gap:7px;padding:5px 10px;font-weight:900;font-size:14px;letter-spacing:.04em;min-width:0}
.fb-team i{width:12px;height:20px;border-radius:3px;flex:none;box-shadow:0 0 0 1.5px rgba(255,255,255,.7)}
.fb-team span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22vw}.fb-team span.fb-sn{display:none}
.fb-team b{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:26px;line-height:1;min-width:1em;text-align:center}
.fb-clock{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 10px;background:rgba(255,255,255,.1);font-weight:900;font-size:15px;line-height:1.05;font-variant-numeric:tabular-nums}
.fb-clock small{font-size:10px;opacity:.8;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.fb-say{display:none;font-size:13px;font-weight:800;padding:3px 12px;border-radius:12px;background:rgba(16,10,30,.62);max-width:min(92vw,480px);text-align:center;line-height:1.25}
.fb-say.on{display:block;animation:fbin .18s ease-out}
@keyframes fbin{from{opacity:0;transform:translateY(-4px)}}
.fb-pen{display:none;gap:10px;font-size:12px;font-weight:800;padding:4px 10px;border-radius:10px;background:rgba(16,10,30,.7)}
.fb-pen.on{display:grid;grid-template-columns:auto auto;align-items:center}
.fb-pen u{display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 2px;background:rgba(255,255,255,.25);text-decoration:none;vertical-align:middle}
.fb-pen u.g{background:#3fd36a}.fb-pen u.x{background:#e0453a}
.fb-pause,.fb-cam{position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:rgba(16,10,30,.5);color:#fff;pointer-events:auto;cursor:pointer;display:grid;place-items:center;padding:0;box-shadow:0 3px 12px rgba(0,0,0,.35)}
.fb-pause{left:calc(env(safe-area-inset-left,0px) + 10px)}.fb-cam{right:calc(env(safe-area-inset-right,0px) + 10px)}
.fb-pause svg,.fb-cam svg{width:20px;height:20px}
.fb-msg{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.85);opacity:0;transition:opacity .2s,transform .25s cubic-bezier(.2,1.4,.4,1);text-align:center;pointer-events:none;max-width:92vw}
.fb-msg.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.fb-msg h2{margin:0;font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:clamp(40px,10vw,84px);line-height:1;text-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 26px rgba(0,0,0,.45);letter-spacing:.02em}
.fb-msg p{margin:6px 0 0;font-size:clamp(15px,3.6vw,20px);font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.fb-msg.goal h2{color:#ffd84a}
.fb-stick{position:absolute;left:0;bottom:0;width:50vw;height:78vh;pointer-events:auto;touch-action:none}
.fb-knob{position:absolute;width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(16,10,30,.25);display:none}
.fb-knob i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.88);box-shadow:0 2px 8px rgba(0,0,0,.35)}
.fb-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);width:96px;height:96px;border-radius:50%;border:2px dashed rgba(255,255,255,.5);display:grid;place-items:center;font-size:11px;font-weight:800;text-align:center;opacity:.7;padding:10px;transition:opacity .4s;text-shadow:0 1px 3px rgba(0,0,0,.6)}
/* cuatro botones, como en el FIFA del móvil: círculos translúcidos con aro de color, icono y nombre, en arco para el
   pulgar derecho. TIRO (el grande) en la esquina; PASE a su izquierda; SPRINT encima de TIRO; CAMBIAR en diagonal,
   entre los dos (siempre en su sitio; con el balón en tus pies, apagado). Al defender: ROBAR y ENTRADA. Medidas en --u
   (escala) para que no se toquen nunca: los centros están separados al menos 12 px más que la suma de los radios */
.fb-btns{--u:1;position:absolute;right:calc(env(safe-area-inset-right,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);width:calc(240px * var(--u));height:calc(172px * var(--u));pointer-events:none}
.fb-b{position:absolute;border:3px solid var(--c,#fff);padding:0;border-radius:50%;background:rgba(12,8,24,.42);color:#fff;font:900 calc(9.5px * var(--u)) Nunito,system-ui,sans-serif;letter-spacing:.03em;text-shadow:0 1px 3px rgba(0,0,0,.8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(2px * var(--u));cursor:pointer;touch-action:none;pointer-events:auto;text-align:center;line-height:1;box-shadow:0 3px 12px rgba(0,0,0,.3),inset 0 0 0 1px rgba(255,255,255,.12);-webkit-user-select:none;user-select:none;transition:transform .06s,background .06s,opacity .2s}
.fb-b svg{width:calc(24px * var(--u));height:calc(24px * var(--u));flex:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));pointer-events:none}
.fb-b span{white-space:nowrap;pointer-events:none;text-transform:uppercase}
.fb-b.down{background:var(--c,#fff);transform:scale(.92)}
.fb-shoot{--c:#e8473c;width:calc(78px * var(--u));height:calc(78px * var(--u));right:calc(10px * var(--u));bottom:calc(8px * var(--u))}
.fb-shoot svg{width:calc(30px * var(--u));height:calc(30px * var(--u))}.fb-shoot span{font-size:calc(11px * var(--u))}
.fb-pass{--c:#2fa8e0;width:calc(66px * var(--u));height:calc(66px * var(--u));right:calc(104px * var(--u));bottom:calc(4px * var(--u))}
.fb-sprint{--c:#3fbf5a;width:calc(60px * var(--u));height:calc(60px * var(--u));right:calc(18px * var(--u));bottom:calc(106px * var(--u))}
.fb-swap{--c:#f2c230;width:calc(60px * var(--u));height:calc(60px * var(--u));right:calc(94px * var(--u));bottom:calc(88px * var(--u))}
.fb-swap span{font-size:calc(9px * var(--u));letter-spacing:0}
.fb-btns.atk .fb-swap{opacity:.4}
.fb-btns.def .fb-pass{--c:#f08a3a}.fb-btns.def .fb-shoot{--c:#c42a2a}
.fb-btns.pen .fb-swap,.fb-btns.pen .fb-sprint{display:none}
.fb-bars{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);width:min(24vw,190px);display:flex;flex-direction:column;gap:4px;pointer-events:none}
.fb-bar{height:7px;border-radius:5px;background:rgba(16,10,30,.5);overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.45)}
.fb-bar i{display:block;height:100%;width:100%;border-radius:6px;background:linear-gradient(90deg,#3fd36a,#a6f07a);transform-origin:left;transition:transform .05s linear}
.fb-bar.pow{opacity:0;transition:opacity .15s}.fb-bar.pow.on{opacity:1}.fb-bar.pow i{background:linear-gradient(90deg,#ffd700,#ff8a2a,#e0302a)}
.fb-arrow{position:absolute;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:26px solid #ffe14a;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));display:none;transform-origin:50% 60%}
/* consejo del tutorial y de los retos: pequeño, bajo el marcador (encima de la grada, no del campo); a los pocos segundos
   se recoge en un botón «?» que lo vuelve a abrir */
.fb-tip{display:none;align-items:center;gap:7px;max-width:min(500px,64vw);padding:4px 12px 4px 5px;border-radius:13px;background:rgba(36,14,80,.8);border:1px solid rgba(255,215,0,.45);font-size:13px;font-weight:800;line-height:1.25;text-align:left;box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer}
.fb-tip.on{display:flex;animation:fbin .18s ease-out}.fb-tip b{color:#ffd84a}
.fb-tip i{flex:none;width:20px;height:20px;border-radius:50%;background:#ffd84a;color:#2a1a00;font:900 13px/20px Nunito,sans-serif;font-style:normal;text-align:center}
.fb-tip.mini{padding:3px;border-radius:50%;background:rgba(36,14,80,.6)}.fb-tip.mini span{display:none}
.fb-keys{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);font-size:12px;font-weight:800;padding:5px 10px;border-radius:10px;background:rgba(16,10,30,.6);max-width:calc(100vw - 24px)}
.fb-fouls{display:none;align-self:center;gap:6px;align-items:center;margin-top:3px;padding:2px 8px;border-radius:9px;background:rgba(14,10,30,.72);font:900 9px Nunito,sans-serif;letter-spacing:.08em;color:#cbbcf0}
.fb-fouls.show{display:flex}.fb-fouls span{display:flex;gap:2px}.fb-fouls u{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.22);text-decoration:none}
.fb-fouls u.on{background:#ffd84a}.fb-fouls u.x{background:#ff4a4a}
.fb-panel{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,4,24,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)}
.fb-card{width:min(540px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,#32136f,#1c0b3a);border:1px solid rgba(190,160,255,.3);border-radius:22px;padding:20px 20px 16px;box-shadow:0 24px 70px rgba(0,0,0,.55);text-align:center}
.fb-card h2{margin:0 0 4px;font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:30px;line-height:1.1}
.fb-card p{margin:4px 0 10px;color:#e6def7;font-weight:600;font-size:15px;line-height:1.35}
.fb-card .fb-kick{color:#ffd84a;font-weight:900;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:0}
.fb-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 10px;align-items:center}
.fb-row label{width:100%;font-size:12px;font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.06em}
.fb-chip{border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;padding:8px 14px;font:800 14px Nunito,sans-serif;cursor:pointer;min-height:40px}
.fb-chip.on{background:#ffd700;border-color:#ffd700;color:#2a1a00}
.fb-go{display:block;width:100%;margin-top:8px;border:0;border-radius:16px;padding:14px;font:400 22px 'Lilita One',Nunito,sans-serif;color:#2a1a00;background:linear-gradient(180deg,#fff38f,#ffd700 55%,#f0b000);box-shadow:0 5px 0 #a86f00;cursor:pointer;min-height:52px}
.fb-alt{display:block;width:100%;margin-top:10px;border:2px solid rgba(255,255,255,.4);border-radius:16px;padding:11px;font:800 16px Nunito,sans-serif;color:#fff;background:transparent;cursor:pointer;min-height:48px}
.fb-stats{width:100%;border-collapse:collapse;margin:8px 0 6px;font-size:15px}
.fb-stats td{padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.1)}.fb-stats td:first-child,.fb-stats td:last-child{font-weight:900;width:22%;font-variant-numeric:tabular-nums}.fb-stats td:nth-child(2){color:#cbbcf0;font-weight:700;font-size:13px}
.fb-ctrl{width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;margin:6px 0}.fb-ctrl th{font-size:10px;color:#cbbcf0;text-transform:uppercase;letter-spacing:.06em;padding:3px 4px}
.fb-ctrl td{padding:4px;border-top:1px solid rgba(255,255,255,.1);vertical-align:middle;font-weight:800}.fb-ctrl td small{font-weight:600;color:#cbbcf0}.fb-ctrl td.ic{width:30px}.fb-ctrl td.ic svg{width:22px;height:22px}
.fb-big{font-family:'Lilita One',Nunito,sans-serif;font-size:46px;line-height:1;margin:6px 0}
@media (max-width:640px) and (orientation:portrait){
  .fb-top{left:58px;right:58px}.fb-team{padding:4px 7px;font-size:12px}.fb-team b{font-size:22px}.fb-team span{max-width:18vw}
  .fb-team span.fb-ln{display:none}.fb-team span.fb-sn{display:inline}
  .fb-btns{--u:.96}.fb-tip{max-width:92vw}
  .fb-bars{left:auto;transform:none;right:calc(env(safe-area-inset-right,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 186px);width:140px}
  .fb-stick{height:62vh}
}
@media (max-height:520px) and (orientation:landscape){
  .fb-panel{padding:calc(env(safe-area-inset-top,0px) + 8px) calc(env(safe-area-inset-right,0px) + 10px) calc(env(safe-area-inset-bottom,0px) + 8px) calc(env(safe-area-inset-left,0px) + 10px)}
  .fb-card{width:min(860px,100%);padding:10px 16px 12px;display:grid;grid-template-columns:1fr 1fr;column-gap:16px;align-content:start}
  .fb-card>*{grid-column:1/-1}.fb-card .fb-row:not(:first-of-type){grid-column:auto}.fb-card .fb-go,.fb-card .fb-alt{grid-column:auto;margin-top:4px;min-height:44px;padding:8px}
  .fb-ctrl{font-size:11px;margin:2px 0}.fb-ctrl td{padding:2px 4px}.fb-ctrl td small{display:none}.fb-ctrl td.ic svg{width:17px;height:17px}.fb-ctrl td br{display:none}
  .fb-card h2{font-size:24px}.fb-row{margin:2px 0 6px;gap:5px}.fb-row label{font-size:11px}.fb-chip{min-height:34px;padding:5px 11px;font-size:13px}
}
@media (max-height:460px) and (orientation:landscape){
  .fb-top{top:calc(env(safe-area-inset-top,0px) + 4px)}.fb-team b{font-size:22px}
  .fb-btns{--u:.9}
  .fb-bars{left:calc(env(safe-area-inset-left,0px) + 124px);transform:none;width:min(150px,22vw)}
  .fb-pause,.fb-cam{width:38px;height:38px}.fb-top{gap:4px}.fb-tip{font-size:12.5px}
  .fb-stickhint{width:84px;height:84px;font-size:10px}
  .fb-msg{top:42%}.fb-msg h2{font-size:clamp(34px,8vw,60px)}
}
`;
const SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>';
const SVG_SWAP = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13l-3.5-3.5"/><path d="M20 15H7l3.5 3.5"/></svg>';
// iconos de los botones (trazo blanco, 24 × 24)
const IC = (d, fill = false) => `<svg viewBox="0 0 24 24" fill="${fill ? '#fff' : 'none'}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  shoot: IC('<circle cx="15.5" cy="12" r="5.5"/><path d="M15.5 6.5l1.6 3.4 3.7.4M2.5 8h6M1.5 12h6M2.5 16h6"/>'),
  pass: IC('<circle cx="5" cy="18" r="2.6"/><circle cx="19" cy="6" r="2.6"/><path d="M7.4 16.2l8.9-8"/><path d="M11.5 7.6h5.1v5.1"/>'),
  through: IC('<path d="M3 19c4-1 7-4 9-8s5-6 9-6" stroke-dasharray="2.4 2.6"/><path d="M15.5 3.4l5.5 1.6-1.9 5.3"/><circle cx="5" cy="19" r="1.6" fill="#fff"/>'),
  sprint: IC('<path d="M13.5 2L5 13.5h6.2L10 22l9-12.2h-6.4z" fill="#fff"/>'),
  swap: IC('<path d="M4 9h13l-3.5-3.5"/><path d="M20 15H7l3.5 3.5"/>'),
  tackle: IC('<circle cx="17.5" cy="15.5" r="3.6"/><path d="M3 15.5h7.5M7 11.5l4 4-4 4"/>'),
  slide: IC('<path d="M2.5 20h19"/><circle cx="7" cy="9" r="2.4"/><path d="M7.5 12.5l4 3.5h7M10 13l-3 4"/><circle cx="20" cy="15.5" r="2" fill="#fff"/>'),
  contain: IC('<path d="M12 2.8l7.5 3v5.6c0 4.8-3.3 8-7.5 9.8-4.2-1.8-7.5-5-7.5-9.8V5.8z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  dive: IC('<path d="M3 17c3-6 8-9 14-9"/><circle cx="19.5" cy="8" r="2.5"/><path d="M6 20l4-5"/>'),
};
const SVG_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/></svg>';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Menú suelto (antes de empezar): usa los mismos estilos sin crear el resto de la interfaz. */
export function menuPanel(opts) {
  if (!document.getElementById('fb-css')) { const st = document.createElement('style'); st.id = 'fb-css'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'fb-root'; document.body.appendChild(root);
  const fake = Object.create(FutbolHud.prototype); fake.root = root;
  return fake.menu(opts).finally(() => root.remove());
}

export class FutbolHud {
  /**
   * @param {object} o { touch, home: {name, shirt}, away: {name, shirt}, onPress(a), onRelease(a), onPause(), onCam() }
   */
  constructor(o) {
    this.o = o;
    if (!document.getElementById('fb-css')) { const st = document.createElement('style'); st.id = 'fb-css'; st.textContent = CSS; document.head.appendChild(st); }
    const r = this.root = document.createElement('div'); r.className = 'fb-root';
    const t = o.touch;
    r.innerHTML = `<div class="fb-top"><div class="fb-score"><div class="fb-team"><i style="background:${o.home.shirt}"></i><span class="fb-ln">${esc(o.home.name)}</span><span class="fb-sn">${esc(o.home.short || o.home.name)}</span><b class="fb-s0">0</b></div>
      <div class="fb-clock"><span class="fb-time">0:00</span><small class="fb-half">1ª parte</small></div>
      <div class="fb-team"><b class="fb-s1">0</b><span class="fb-ln">${esc(o.away.name)}</span><span class="fb-sn">${esc(o.away.short || o.away.name)}</span><i style="background:${o.away.shirt}"></i></div></div>
      <div class="fb-fouls"></div><div class="fb-pen"><span>${esc(o.home.short || o.home.name)}</span><span class="fb-p0"></span><span>${esc(o.away.short || o.away.name)}</span><span class="fb-p1"></span></div>
      <div class="fb-say"></div><div class="fb-tip"><i>?</i><span></span></div></div>
      <button class="fb-pause" aria-label="Pausa">${SVG_PAUSE}</button><button class="fb-cam" aria-label="Cambiar cámara">${SVG_CAM}</button>
      <div class="fb-msg"><h2></h2><p></p></div><div class="fb-arrow"></div>
      ${t ? `<div class="fb-stick"><div class="fb-knob"><i></i></div></div><div class="fb-stickhint">Toca y arrastra para moverte</div>
      <div class="fb-bars"><div class="fb-bar"><i class="fb-en"></i></div><div class="fb-bar pow"><i class="fb-pw"></i></div></div>
      <div class="fb-btns atk"><button class="fb-b fb-sprint" data-a="sprint" aria-label="Sprint">${ICON.sprint}<span>Sprint</span></button><button class="fb-b fb-swap" data-a="switch" aria-label="Cambiar de jugador">${ICON.swap}<span>Cambiar</span></button><button class="fb-b fb-pass" data-a="pass" aria-label="Pase">${ICON.pass}<span>Pase</span></button><button class="fb-b fb-shoot" data-a="shoot" aria-label="Tiro">${ICON.shoot}<span>Tiro</span></button></div>`
      : `<div class="fb-bars" style="bottom:calc(env(safe-area-inset-bottom,0px) + 44px)"><div class="fb-bar"><i class="fb-en"></i></div><div class="fb-bar pow"><i class="fb-pw"></i></div></div>
      <div class="fb-keys">WASD/flechas mover · <b>J</b> pase / robar · <b>K</b> tiro (mantén: fuerza) / entrada · <b>Mayús</b> sprint · <b>L</b> cambiar · <b>Esc</b> pausa · <b>H</b> controles · también con mando</div>`}`;
    document.body.appendChild(r);
    const $ = (s) => r.querySelector(s);
    this.el = { s0: $('.fb-s0'), s1: $('.fb-s1'), time: $('.fb-time'), half: $('.fb-half'), say: $('.fb-say'), msg: $('.fb-msg'), tip: $('.fb-tip'), arrow: $('.fb-arrow'),
      en: $('.fb-en'), pw: $('.fb-pw'), pow: $('.fb-bar.pow'), pass: $('.fb-pass'), shoot: $('.fb-shoot'), swap: $('.fb-swap'), btns: $('.fb-btns'), pen: $('.fb-pen'), p0: $('.fb-p0'), p1: $('.fb-p1'), hint: $('.fb-stickhint') };
    $('.fb-pause').addEventListener('click', (e) => { e.stopPropagation(); o.onPause?.(); });
    // el consejo se abre y se recoge tocándolo
    this.el.tip.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this.tipOpen(this.el.tip.classList.contains('mini')); });
    $('.fb-cam').addEventListener('click', (e) => { e.stopPropagation(); o.onCam?.(); });
    this.held = { sprint: false };
    for (const b of r.querySelectorAll('[data-a]')) {
      const a = b.dataset.a;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch { /* sin captura */ } b.classList.add('down'); if (a === 'sprint') this.held.sprint = true; else o.onPress?.(a); });
      const up = (e) => { if (!b.classList.contains('down')) return; b.classList.remove('down'); if (a === 'sprint') this.held.sprint = false; else o.onRelease?.(a); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }
    // joystick dinámico en la mitad izquierda: aparece donde se toca
    this.stick = { x: 0, y: 0, id: null };
    const zone = $('.fb-stick');
    if (zone) {
      const knob = zone.querySelector('.fb-knob'), dot = knob.querySelector('i'), RAD = 56;
      zone.addEventListener('pointerdown', (e) => { if (this.stick.id !== null) return; e.preventDefault(); try { zone.setPointerCapture(e.pointerId); } catch { /* sin captura */ } const rc = zone.getBoundingClientRect(); this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; knob.style.display = 'block'; knob.style.left = (e.clientX - rc.left) + 'px'; knob.style.top = (e.clientY - rc.top) + 'px'; dot.style.transform = ''; if (this.el.hint) this.el.hint.style.opacity = 0; });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId !== this.stick.id) return; let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy; const l = Math.hypot(dx, dy); if (l > RAD) { dx *= RAD / l; dy *= RAD / l; } this.stick.x = dx / RAD; this.stick.y = -dy / RAD; dot.style.transform = `translate(${dx}px,${dy}px)`; });
      const end = (e) => { if (e.pointerId !== this.stick.id) return; this.stick = { x: 0, y: 0, id: null }; knob.style.display = 'none'; };
      zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    }
  }
  setScore(a, b) { this.el.s0.textContent = a; this.el.s1.textContent = b; }
  // faltas acumuladas de la parte (fútbol sala): un punto por falta; desde la 6.ª, en rojo
  setFouls(a, b, lim = 5) {
    const el = this.root.querySelector('.fb-fouls'); if (!el) return;
    const dots = (n) => Array.from({ length: Math.max(lim, n) }, (_, i) => `<u class="${i < n ? (i >= lim ? 'x' : 'on') : ''}"></u>`).join('');
    el.innerHTML = `<span>${dots(a)}</span><b>FALTAS</b><span>${dots(b)}</span>`; el.classList.add('show');
  }
  setClock(sec, half, label) { const s = Math.max(0, Math.ceil(sec)); this.el.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; this.el.half.textContent = label || (half === 1 ? '1ª parte' : '2ª parte'); }
  // los botones según el momento: con el balón (atk), sin él (def: ROBAR y ENTRADA) o suelto (loose)
  setMode(mode) {
    if (this.mode === mode || !this.el.btns) return; this.mode = mode;
    const def = mode === 'def', set = (b, icon, label) => { b.innerHTML = `${ICON[icon]}<span>${label}</span>`; b.setAttribute('aria-label', label); };
    this.el.btns.className = 'fb-btns ' + mode;
    set(this.el.pass, def ? 'tackle' : 'pass', def ? 'Robar' : 'Pase');
    set(this.el.shoot, def ? 'slide' : 'shoot', def ? 'Entrada' : 'Tiro');
  }
  setDefending(def) { this.setMode(def ? 'def' : 'atk'); }
  // tanda de penaltis: solo dos botones (PARAR o TIRO)
  setButtons(pass, shoot) {
    if (!this.el.pass) return; this.mode = 'pen'; this.el.btns.className = 'fb-btns pen';
    const keep = /PARAR/i.test(shoot);
    this.el.pass.innerHTML = `${ICON[keep ? 'dive' : 'pass']}<span>${pass}</span>`; this.el.shoot.innerHTML = `${ICON[keep ? 'dive' : 'shoot']}<span>${shoot}</span>`;
  }
  /** Pantalla de controles (como la del FIFA): táctil, teclado y mando. */
  controls() {
    return new Promise(res => {
      const row = (ic, a, b, c, d) => `<tr><td class="ic">${ic ? ICON[ic] : ''}</td><td><b>${a}</b><br><small>${b}</small></td><td>${c}</td><td>${d}</td></tr>`;
      const p = this.panel(`<h2>Controles</h2><p class="fb-kick">Cuatro botones: pase, tiro, sprint y cambiar</p>
        <table class="fb-ctrl"><tr><th></th><th>Acción</th><th>Teclado</th><th>Mando</th></tr>
        ${row('', 'Moverte', 'Joystick: toca y arrastra en la mitad izquierda', 'WASD / flechas', 'Stick izquierdo')}
        ${row('pass', 'Pase', 'Al compañero hacia donde apuntas (por alto si hay rivales en medio)', 'J / espacio', 'A')}
        ${row('shoot', 'Tiro', 'Mantén para cargar la fuerza; apunta con el joystick', 'K (mantén)', 'B (mantén)')}
        ${row('sprint', 'Sprint', 'Mantén (gasta energía)', 'Mayús', 'RT')}
        ${row('swap', 'Cambiar', 'Al compañero mejor colocado (también cambia solo)', 'L', 'LB')}
        ${row('tackle', 'Sin el balón: robar', 'Con el botón de PASE, pegado al rival', 'J', 'A')}
        ${row('slide', 'Sin el balón: entrada', 'Con el botón de TIRO (si llegas tarde, falta)', 'K', 'B')}
        </table><p class="fb-kick" style="margin-top:6px">El jugador que llevas cambia solo según va el balón</p><button class="fb-go">Entendido</button>`);
      p.querySelector('.fb-go').onclick = () => { p.remove(); res(); };
    });
  }
  bars(energy, charge) {
    if (this.el.en) this.el.en.style.transform = `scaleX(${energy.toFixed(3)})`;
    if (this.el.pow) { this.el.pow.classList.toggle('on', charge >= 0); if (charge >= 0) this.el.pw.style.transform = `scaleX(${charge.toFixed(3)})`; }
  }
  msg(title, sub = '', ms = 1800, cls = '') {
    const m = this.el.msg; m.querySelector('h2').textContent = title; m.querySelector('p').textContent = sub; m.className = 'fb-msg on ' + cls;
    clearTimeout(this.mt); this.mt = setTimeout(() => m.classList.remove('on'), ms);
  }
  say(text, ms = 1700) { const s = this.el.say; s.textContent = text; s.classList.add('on'); clearTimeout(this.st); this.st = setTimeout(() => s.classList.remove('on'), ms); }
  /** Consejo: se ve entero unos segundos y luego se recoge en «?» (para no tapar el juego); null lo quita. */
  tip(html) {
    const t = this.el.tip; clearTimeout(this.tt);
    if (!html) { t.classList.remove('on', 'mini'); return; }
    t.querySelector('span').innerHTML = html; t.classList.add('on'); this.tipOpen(true, 7000);
  }
  tipOpen(open, ms = 6000) { const t = this.el.tip; clearTimeout(this.tt); t.classList.toggle('mini', !open); if (open) this.tt = setTimeout(() => t.classList.add('mini'), ms); }
  /** Flecha en el borde de la pantalla hacia el jugador controlado (x, y en píxeles; ang en radianes) o null. */
  arrow(x, y, ang) { const a = this.el.arrow; if (x === null) { a.style.display = 'none'; return; } a.style.display = 'block'; a.style.left = (x - 14) + 'px'; a.style.top = (y - 13) + 'px'; a.style.transform = `rotate(${ang}rad)`; }
  pens(log, kicks) {
    this.el.pen.classList.add('on');
    for (const t of [0, 1]) { const l = log[t], n = Math.max(kicks, l.length + (l.length >= kicks ? 0 : 0)); let h = ''; for (let i = 0; i < Math.max(kicks, l.length); i++) h += `<u class="${i < l.length ? (l[i] ? 'g' : 'x') : ''}"></u>`; this.el['p' + t].innerHTML = h; void n; }
  }
  // ---------------------------------------------------------------- paneles
  panel(html) {
    const p = document.createElement('div'); p.className = 'fb-panel'; p.innerHTML = `<div class="fb-card">${html}</div>`;
    this.root.appendChild(p); return p;
  }
  /** Menú previo: modo, rival, dificultad, duración y asistencia. */
  menu({ title = 'Fútbol', sub = '', modes, rivals, values }) {
    return new Promise(res => {
      const v = { ...values };
      const chips = (key, list) => `<div class="fb-row"><label>${{ mode: 'Modo', rival: 'Rival', level: 'Dificultad', duration: 'Duración de cada parte', assist: 'Asistencia al pase y al tiro' }[key]}</label>${list.map(([id, name]) => `<button class="fb-chip ${v[key] === id ? 'on' : ''}" data-k="${key}" data-v="${id}">${esc(name)}</button>`).join('')}</div>`;
      const p = this.panel(`<p class="fb-kick">${esc(sub)}</p><h2>${esc(title)}</h2>
        ${chips('mode', modes)}${rivals.length > 1 ? chips('rival', rivals) : ''}${chips('level', [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']])}
        ${chips('duration', [[2, '2 min'], [3, '3 min'], [4, '4 min'], [5, '5 min']])}${chips('assist', [[true, 'Sí'], [false, 'No']])}
        <button class="fb-go">¡A jugar!</button><button class="fb-alt">Salir</button>`);
      p.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.k) { const k = b.dataset.k, raw = b.dataset.v; v[k] = k === 'duration' ? +raw : k === 'assist' ? raw === 'true' : raw; p.querySelectorAll(`[data-k="${k}"]`).forEach(c => c.classList.toggle('on', c === b)); return; }
        p.remove(); res(b.classList.contains('fb-go') ? v : null);
      });
    });
  }
  pause() {
    return new Promise(res => {
      const p = this.panel(`<h2>Pausa</h2><p>El partido está parado.</p><button class="fb-go">Seguir</button><button class="fb-alt fb-ctl">Controles</button><button class="fb-alt">Abandonar</button>`);
      p.querySelector('.fb-go').onclick = () => { p.remove(); res('resume'); };
      p.querySelector('.fb-ctl').onclick = async (e) => { e.stopPropagation(); p.style.display = 'none'; await this.controls(); p.style.display = ''; };
      p.querySelector('.fb-alt:not(.fb-ctl)').onclick = () => { p.remove(); res('quit'); };
    });
  }
  /** Pantalla final con las estadísticas. */
  end({ title, sub, score, rows = [], again = 'Revancha', exit = 'Salir' }) {
    return new Promise(res => {
      const p = this.panel(`<p class="fb-kick">${esc(sub || '')}</p><h2>${esc(title)}</h2>${score ? `<div class="fb-big">${esc(score)}</div>` : ''}
        ${rows.length ? `<table class="fb-stats">${rows.map(([a, n, b]) => `<tr><td>${esc(a)}</td><td>${esc(n)}</td><td>${esc(b)}</td></tr>`).join('')}</table>` : ''}
        ${again ? `<button class="fb-go">${esc(again)}</button>` : ''}<button class="fb-alt">${esc(exit)}</button>`);
      p.querySelector('.fb-go')?.addEventListener('click', () => { p.remove(); res('again'); });
      p.querySelector('.fb-alt').addEventListener('click', () => { p.remove(); res('exit'); });
    });
  }
  info({ kicker = '', title, text, button = 'Seguir' }) {
    return new Promise(res => { const p = this.panel(`<p class="fb-kick">${esc(kicker)}</p><h2>${esc(title)}</h2><p>${text}</p><button class="fb-go">${esc(button)}</button>`); p.querySelector('.fb-go').onclick = () => { p.remove(); res(); }; });
  }
  dispose() { clearTimeout(this.mt); clearTimeout(this.st); this.root.remove(); }
}
