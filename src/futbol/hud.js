// Interfaz del partido de fútbol (DOM): marcador, mensajes grandes, comentarios, joystick dinámico, cuatro botones (al
// defender, Pase pasa a ser Robar y Tiro, Entrada), barras de energía y de carga, flecha del jugador fuera de pantalla,
// tanda de penaltis, consejos del tutorial, menú previo, pausa y pantalla final. Todo con el prefijo «fb-», sin
// solaparse en móvil (vertical y horizontal) y escritorio.
import { fitCircle, fitCircles } from '../ui/fitlabel.js';
const CSS = `.fb-tac{display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:16px;align-items:center;text-align:left;margin:4px 0 8px}.fb-board{width:100%;height:auto;display:block;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.fb-tac-t{margin:8px 0 8px;font-size:var(--fs-sm);line-height:1.3;color:#e8e2f6}.fb-tac-l{margin:0;font-size:var(--fs-xs);color:#c8bfe0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fb-tac-l i{width:10px;height:10px;border-radius:50%;display:inline-block}
.fb-tac-r .fb-row{justify-content:flex-start}   /* (los sistemas, alineados a la izquierda con su explicación) */
@media (max-width:520px){.fb-tac{grid-template-columns:1fr}.fb-board{max-width:200px;margin:0 auto}}

.fb-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:Nunito,system-ui,sans-serif;color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.fb-root *{box-sizing:border-box}
.fb-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,12px));left:64px;right:64px;display:flex;flex-direction:column;align-items:center;gap:8px}
/* el marcador, el mismo de la pelota y de las pantallas de deporte: placa en ángulo, filete fucsia arriba, nombres en
   letra estrecha y mayúsculas, el reloj en lila (como en las retransmisiones y en los juegos de fútbol) */
.fb-score{display:flex;align-items:stretch;border-radius:3px;overflow:hidden;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:100%;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.fb-team{display:flex;align-items:center;gap:8px;padding:4px 12px;font:800 var(--fs-sm)/1 var(--f-cond,Nunito),sans-serif;letter-spacing:.04em;text-transform:uppercase;min-width:0}
.fb-team i{width:12px;height:20px;border-radius:3px;flex:none;box-shadow:0 0 0 1.5px rgba(255,255,255,.7)}
.fb-team span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22vw}.fb-team span.fb-sn{display:none}
.fb-team b{font-family:'MZ Display',Nunito,sans-serif;font-weight:400;font-size:var(--fs-xl);line-height:1;min-width:1em;text-align:center}
.fb-clock{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:2px 12px;background:linear-gradient(180deg,rgba(123,47,247,.55),rgba(49,16,107,.7));font:800 var(--fs-md)/1 var(--f-cond,Nunito),sans-serif;font-variant-numeric:tabular-nums}
.fb-clock small{font-size:var(--fs-xs);color:var(--lila,#c9b2ff);font-weight:800;text-transform:uppercase;letter-spacing:.1em}
.fb-say{display:none;font-size:var(--fs-sm);font-weight:800;padding:4px 12px;border-radius:12px;background:rgba(16,10,30,.62);max-width:min(92vw,480px);text-align:center;line-height:1.3}
.fb-say.on{display:block;animation:fbin .18s ease-out}
@keyframes fbin{from{opacity:0;transform:translateY(-4px)}}
.fb-pen{display:none;gap:8px;font-size:var(--fs-xs);font-weight:800;padding:4px 8px;border-radius:10px;background:rgba(16,10,30,.7)}
.fb-pen.on{display:grid;grid-template-columns:auto auto;align-items:center}
.fb-pen u{display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 2px;background:rgba(255,255,255,.25);text-decoration:none;vertical-align:middle}
.fb-pen u.g{background:#3fd36a}.fb-pen u.x{background:#e0453a}
.fb-pause,.fb-cam{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,12px));width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(255,255,255,.75);background:rgba(8,10,20,.25);color:#fff;pointer-events:auto;cursor:pointer;display:grid;place-items:center;padding:0;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.fb-pause::before,.fb-cam::before{content:'';position:absolute;inset:-4px;border-radius:50%}   /* (zona táctil de 44 px; el dibujo no cambia) */
.fb-pause{left:calc(env(safe-area-inset-left,0px) + var(--edge,12px))}.fb-cam{right:calc(env(safe-area-inset-right,0px) + var(--edge,12px))}
.fb-pause svg,.fb-cam svg{width:18px;height:18px}
.fb-msg{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.85);opacity:0;transition:opacity .2s,transform .25s cubic-bezier(.2,1.4,.4,1);text-align:center;pointer-events:none;max-width:92vw}
.fb-msg.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.fb-msg h2{margin:0;font-family:'MZ Display',Nunito,sans-serif;font-weight:400;font-size:var(--fs-display);line-height:1;text-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 26px rgba(0,0,0,.45);letter-spacing:0}
.fb-msg p{margin:8px 0 0;font-size:var(--fs-lg);font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.fb-msg.goal h2{color:#ff9bd8}
.fb-stick{position:absolute;left:0;bottom:0;width:50vw;height:78dvh;pointer-events:auto;touch-action:none}
.fb-knob{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:1.5px solid rgba(255,255,255,.6);background:rgba(8,10,20,.14);display:none}
.fb-knob i{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(255,255,255,.72);box-shadow:0 1px 6px rgba(0,0,0,.25)}
.fb-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--thumb,16px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px) + 8px);width:96px;height:96px;border-radius:50%;border:1.5px dashed rgba(255,255,255,.5);display:grid;place-items:center;font-size:var(--fs-xs);font-weight:800;line-height:1.15;color:#fff;text-align:center;opacity:.9;padding:8px;transition:opacity .4s;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.6)}
/* cuatro botones minimalistas: un aro blanco fino, el icono de trazo fino y el nombre en pequeño. TIRO (el mayor) en la
   esquina; PASE a su izquierda; SPRINT encima de TIRO; CAMBIAR en diagonal, entre los dos (siempre en su sitio; con el
   balón en tus pies, apagado). Al pulsar, se rellenan con un toque de color. Al defender: ROBAR y ENTRADA. Medidas en
   --u (escala) para que no se toquen nunca: los centros están separados al menos 12 px más que la suma de los radios */
.fb-btns{--u:1;position:absolute;right:calc(env(safe-area-inset-right,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));width:calc(240px * var(--u));height:calc(178px * var(--u));pointer-events:none}
.fb-b{position:absolute;border:1.5px solid rgba(255,255,255,.8);padding:0;border-radius:50%;background:rgba(8,10,20,.2);color:#fff;font:800 var(--fs-xs)/1.05 var(--f-cond,Nunito),system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 1px 2px rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;touch-action:none;pointer-events:auto;text-align:center;line-height:1;box-shadow:0 2px 10px rgba(0,0,0,.18);-webkit-user-select:none;user-select:none;transition:transform .06s,background .08s,opacity .2s}
.fb-b svg{width:calc(18px * var(--u));height:calc(18px * var(--u));flex:none;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.45));pointer-events:none}
/* (el rótulo, en la letra estrecha del juego y en mayúsculas, siempre dentro del círculo y nunca por debajo de 12 px, la
   letra más pequeña de la escala: el icono es pequeño para que el rótulo quede cerca del centro, donde el círculo es más
   ancho; si no cabe en una línea, en dos. fitCircle() (src/ui/fitlabel.js) lo comprueba con el texto de verdad) */
.fb-b span{pointer-events:none;max-width:78%;text-align:center;overflow-wrap:normal;hyphens:none}
.fb-b.down{background:var(--cd,rgba(255,255,255,.3));transform:scale(.94)}
/* (del tamaño justo para que el rótulo más largo de cada uno quepa a 12 px, como ESTIRADA o CAMBIAR, con --u .9 del móvil
   tumbado; los círculos, separados al menos 12 px) */
.fb-shoot{--cd:rgba(232,71,60,.5);width:calc(84px * var(--u));height:calc(84px * var(--u));right:calc(10px * var(--u));bottom:calc(8px * var(--u))}
.fb-shoot svg{width:calc(22px * var(--u));height:calc(22px * var(--u))}
.fb-pass{--cd:rgba(47,168,224,.5);width:calc(72px * var(--u));height:calc(72px * var(--u));right:calc(106px * var(--u));bottom:calc(6px * var(--u))}
.fb-sprint{--cd:rgba(63,191,90,.5);width:calc(68px * var(--u));height:calc(68px * var(--u));right:calc(19px * var(--u));bottom:calc(108px * var(--u))}
.fb-swap{--cd:rgba(242,194,48,.5);width:calc(68px * var(--u));height:calc(68px * var(--u));right:calc(100px * var(--u));bottom:calc(92px * var(--u))}
.fb-btns.atk .fb-swap{opacity:.35}
.fb-btns.def .fb-pass{--cd:rgba(240,138,58,.55)}.fb-btns.def .fb-shoot{--cd:rgba(196,42,42,.55)}
.fb-btns.gk .fb-pass,.fb-btns.gk .fb-shoot{--cd:rgba(40,170,90,.6)}.fb-btns.gkhands .fb-pass,.fb-btns.gkhands .fb-shoot{--cd:rgba(40,170,90,.6)}
.fb-btns.pen .fb-swap,.fb-btns.pen .fb-sprint{display:none}
.fb-bars{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);width:min(24vw,190px);display:flex;flex-direction:column;gap:4px;pointer-events:none}
.fb-bar{height:4px;border-radius:3px;background:rgba(8,10,20,.4);overflow:hidden;box-shadow:0 0 0 .5px rgba(255,255,255,.4)}
.fb-bar i{display:block;height:100%;width:100%;border-radius:6px;background:linear-gradient(90deg,#c9b2ff,#efe8ff);transform-origin:left;transition:transform .05s linear}
.fb-b.chg::after{content:'';position:absolute;inset:calc(-6px * var(--u));border-radius:50%;pointer-events:none;background:conic-gradient(#ff7ac8 0, #ff8a2a calc(var(--chg) * 300deg), #e0302a calc(var(--chg) * 360deg), rgba(255,255,255,.18) calc(var(--chg) * 360deg));-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px))}
.fb-cd{display:flex;gap:2px;align-items:center;font-style:normal}.fb-cd:empty{display:none}.fb-cd u{width:6px;height:9px;border-radius:1.5px;box-shadow:0 1px 2px rgba(0,0,0,.4)}.fb-cd u.y{background:#ffd400}.fb-cd u.r{background:#e3262b}
.fb-msg.card-y h2::before,.fb-msg.card-r h2::before{content:'';display:inline-block;width:.62em;height:.86em;border-radius:.08em;margin-right:.32em;vertical-align:-.08em;transform:rotate(-8deg);box-shadow:0 2px 6px rgba(0,0,0,.35)}.fb-msg.card-y h2::before{background:#ffd400}.fb-msg.card-r h2::before{background:#e3262b}
.fb-bar.pow{opacity:0;transition:opacity .15s}.fb-bar.pow.on{opacity:1}.fb-bar.pow i{background:linear-gradient(90deg,#ff7ac8,#ff8a2a,#e0302a)}
.fb-arrow{position:absolute;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:26px solid #ffe14a;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));display:none;transform-origin:50% 60%}
/* consejo del tutorial y de los retos: pequeño, bajo el marcador (encima de la grada, no del campo); a los pocos segundos
   se recoge en un botón «?» que lo vuelve a abrir */
.fb-tip{display:none;align-items:center;gap:8px;max-width:min(500px,64vw);padding:4px 12px 4px 4px;border-radius:13px;background:rgba(36,14,80,.8);border:1px solid rgba(255,122,200,.45);font-size:var(--fs-sm);font-weight:800;line-height:1.3;text-align:left;box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer}
.fb-tip.on{display:flex;animation:fbin .18s ease-out}.fb-tip b{color:#ff9bd8}
.fb-tip i{flex:none;width:20px;height:20px;border-radius:50%;background:#ff9bd8;color:#2a0638;font:900 var(--fs-sm)/20px Nunito,sans-serif;font-style:normal;text-align:center}
.fb-tip.mini{padding:4px;border-radius:50%;background:rgba(36,14,80,.6)}.fb-tip.mini span{display:none}
.fb-keys{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);font-size:var(--fs-xs);font-weight:800;padding:4px 8px;border-radius:10px;background:rgba(16,10,30,.6);max-width:calc(100vw - 24px)}
.fb-fouls{display:none;align-self:center;gap:8px;align-items:center;margin-top:4px;padding:2px 8px;border-radius:9px;background:rgba(14,10,30,.72);font:900 var(--fs-xs) Nunito,sans-serif;letter-spacing:.1em;color:#cbbcf0}
.fb-fouls.show{display:flex}.fb-fouls span{display:flex;gap:2px}.fb-fouls u{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.22);text-decoration:none}
.fb-fouls u.on{background:#ff9bd8}.fb-fouls u.x{background:#ff4a4a}
.fb-panel{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,4,24,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)}
.fb-card{width:min(540px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,#32136f,#1c0b3a);border:1px solid rgba(190,160,255,.3);border-radius:22px;padding:20px 20px 16px;box-shadow:0 24px 70px rgba(0,0,0,.55);text-align:center}
.fb-card h2{margin:0 0 var(--t-mb);font-family:'MZ Display',Nunito,sans-serif;font-weight:400;font-size:var(--fs-2xl);line-height:1}.fb-card .fb-kick+h2{margin-top:var(--t-mt)}
.fb-card p{margin:0 0 8px;color:#e6def7;font-weight:600;font-size:var(--fs-sm);line-height:1.3}
.fb-card .fb-card .fb-kick{display:block;color:#ff7ac8;font:800 var(--fs-sm)/1.15 var(--f-cond,Nunito),sans-serif;letter-spacing:.1em;text-transform:uppercase;margin:0}
.fb-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0 8px;align-items:center}
.fb-row label{width:100%;font-size:var(--fs-xs);font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em}
.fb-chip{border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;padding:8px 16px;font:800 var(--fs-sm)/1.3 Nunito,sans-serif;cursor:pointer;min-height:40px;min-width:44px}
.fb-chip.on{background:#ff7ac8;border-color:#ff7ac8;color:#2a0638}
.fb-go{display:block;width:100%;margin-top:8px;border:0;border-radius:16px;padding:16px;font:400 var(--fs-lg) 'MZ Display',Nunito,sans-serif;color:#2a0638;background:linear-gradient(180deg,#ffc2ec,#ff7ac8 55%,#ff3dbd);box-shadow:0 5px 0 #8a1c8f;cursor:pointer;min-height:52px}
.fb-alt{display:block;width:100%;margin-top:8px;border:2px solid rgba(255,255,255,.4);border-radius:16px;padding:12px;font:800 var(--fs-md) Nunito,sans-serif;color:#fff;background:transparent;cursor:pointer;min-height:48px}
/* (los botones de seguir y salir, siempre a la vista: si la tarjeta no cabe y se desplaza, se quedan pegados abajo) */
.fb-card{display:flex;flex-direction:column;overflow:hidden}.fb-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.fb-foot{flex:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;padding-top:8px;margin-top:2px;border-top:1px solid rgba(190,160,255,.18)}.fb-foot.n4{grid-template-columns:1fr 1fr}
.fb-foot .fb-go,.fb-foot .fb-alt{margin:0;width:100%}.fb-foot .fb-go{order:2}.fb-foot.n1 .fb-go{max-width:340px;justify-self:center}.fb-card .fb-alt{background:#1f0c40}
.fb-fact{margin:8px 0 2px!important;padding:8px 12px;border-radius:4px;background:rgba(255,122,200,.1);border:1px solid rgba(255,122,200,.35);color:#fff3fb!important;font-size:var(--fs-sm);line-height:1.45;text-align:left}.fb-fact b{display:block;color:#ff9bd8;font-size:var(--fs-xs);letter-spacing:.04em;text-transform:uppercase}
.fb-stats{width:100%;border-collapse:collapse;margin:8px 0 8px;font-size:var(--fs-md)}
.fb-stats td{padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.1)}.fb-stats td:first-child,.fb-stats td:last-child{font-weight:900;width:22%;font-variant-numeric:tabular-nums}.fb-stats td:nth-child(2){color:#cbbcf0;font-weight:700;font-size:var(--fs-sm)}
.fb-ctabs{display:flex;gap:8px;margin:8px 0 12px}.fb-ctabs button{flex:1;min-height:44px;border-radius:12px;border:1px solid rgba(190,160,255,.35);background:rgba(255,255,255,.06);color:#fff;font:900 var(--fs-sm)/1.15 Nunito,system-ui,sans-serif;cursor:pointer}.fb-ctabs button[aria-selected=true]{background:linear-gradient(180deg,#8338ec,#5e22c4);border-color:#c9a6ff}
.fb-cgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;text-align:left}
.fb-ck{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(190,160,255,.16);min-width:0}
.fb-ck>i{flex:none;width:24px;height:24px;display:grid;place-items:center}.fb-ck>i svg{width:22px;height:22px}
.fb-ck b{display:block;font-size:var(--fs-sm);font-weight:900;line-height:1.3}.fb-ck small{display:block;font-size:var(--fs-xs);font-weight:600;color:#d8cff0;line-height:1.3}.fb-ck em{display:block;font-style:normal;font-size:var(--fs-xs);font-weight:800;color:#ff7ac8;line-height:1.3;margin-top:2px}
@media (max-width:520px){.fb-cgrid{grid-template-columns:1fr}}
.fb-ctrl{width:100%;border-collapse:collapse;font-size:var(--fs-sm);text-align:left;margin:8px 0}.fb-ctrl th{font-size:var(--fs-xs);color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em;padding:4px 4px}
.fb-ctrl td{padding:4px;border-top:1px solid rgba(255,255,255,.1);vertical-align:middle;font-weight:800}.fb-ctrl td small{font-weight:600;color:#cbbcf0;font-size:var(--fs-xs)}.fb-ctrl td.ic{width:30px}.fb-ctrl td.ic svg{width:22px;height:22px}
.fb-big{font-family:'MZ Display',Nunito,sans-serif;font-size:var(--fs-4xl);line-height:1;margin:8px 0}
@media (max-width:640px) and (orientation:portrait){
  .fb-top{left:58px;right:58px}.fb-team{padding:4px 8px;font-size:var(--fs-xs)}.fb-team b{font-size:var(--fs-xl)}.fb-team span{max-width:18vw}
  .fb-team span.fb-ln{display:none}.fb-team span.fb-sn{display:inline}
  .fb-btns{--u:.96}.fb-tip{max-width:92vw}
  .fb-bars{left:auto;transform:none;right:calc(env(safe-area-inset-right,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 184px);width:140px}
  .fb-stick{height:62dvh}
}
@media (max-height:520px) and (orientation:landscape){
  .fb-panel{padding:calc(env(safe-area-inset-top,0px) + 8px) calc(env(safe-area-inset-right,0px) + 8px) calc(env(safe-area-inset-bottom,0px) + 8px) calc(env(safe-area-inset-left,0px) + 8px)}
  .fb-card{width:min(860px,100%);padding:8px 16px 8px}
  .fb-body{display:grid;grid-template-columns:1fr 1fr;column-gap:16px;align-content:start}
  .fb-body>*{grid-column:1/-1}.fb-body .fb-row:not(:first-of-type){grid-column:auto}.fb-body .fb-row[data-row=reto]{grid-column:1/-1}
  .fb-foot{padding-top:8px;gap:8px}.fb-foot .fb-go,.fb-foot .fb-alt{min-height:44px;padding:8px}.fb-foot .fb-go{font-size:var(--fs-lg)}.fb-foot.n4{grid-template-columns:repeat(4,1fr)}
  .fb-ctrl{font-size:var(--fs-xs);margin:2px 0}.fb-ctrl td{padding:2px 4px}.fb-ctrl td small{display:none}.fb-ctrl td.ic svg{width:17px;height:17px}.fb-ctrl td br{display:none}
  /* menú: el modo y el sistema ocupan todo el ancho con su nombre a la izquierda, así caben todas las filas sin desplazar */
  .fb-menu .fb-body .fb-row[data-row=mode],.fb-menu .fb-body .fb-row[data-row=sistema]{grid-column:1/-1}
  .fb-menu .fb-row[data-row=mode] label,.fb-menu .fb-row[data-row=sistema] label{width:auto;margin-right:8px}
  .fb-menu .fb-menu .fb-kick{margin:0}
.fb-card h2{font-size:var(--fs-xl)}.fb-row{margin:2px 0 8px;gap:4px}.fb-row label{font-size:var(--fs-xs)}.fb-chip{min-height:44px;padding:4px 12px;font-size:var(--fs-sm)}
  .fb-stats{font-size:var(--fs-sm);margin:4px 0 2px}.fb-stats td{padding:2px 8px}.fb-big{font-size:var(--fs-2xl);line-height:1;margin:0 0 2px}.fb-fact{margin:4px 0 0!important;padding:8px 8px;font-size:var(--fs-sm);line-height:1.3}
  /* estadísticas en dos columnas: con nueve filas, los botones quedaban fuera de la pantalla */
  .fb-stats tbody{display:grid;grid-template-columns:1fr 1fr;column-gap:16px}.fb-stats tr{display:grid;grid-template-columns:minmax(3.6em,auto) 1fr minmax(3.6em,auto);align-items:center;border-bottom:1px solid rgba(255,255,255,.1)}
  .fb-stats td{border:0!important;width:auto!important;white-space:nowrap}
  /* controles: el título y las pestañas en la misma fila, y debajo las tarjetas de una línea: todo a la vista */
  .fb-controls .fb-body{grid-template-columns:auto minmax(0,1fr);align-items:center}.fb-controls .fb-body>h2{grid-column:1;margin:0}.fb-controls .fb-ctabs{grid-column:2;margin:0}.fb-controls .fb-cpane{grid-column:1/-1;margin-top:8px}
}
@media (max-height:460px) and (orientation:landscape){
  .fb-top{top:calc(env(safe-area-inset-top,0px) + var(--edge,12px))}.fb-team b{font-size:var(--fs-xl)}
  .fb-btns{--u:.9}
  .fb-bars{left:calc(env(safe-area-inset-left,0px) + 124px);transform:none;width:min(150px,22vw)}
  .fb-pause,.fb-cam{width:38px;height:38px}.fb-top{gap:4px}.fb-tip{font-size:var(--fs-sm)}
  .fb-stickhint{width:84px;height:84px;font-size:var(--fs-xs)}
  .fb-msg{top:42%}.fb-msg h2{font-size:var(--fs-hero)}
}
/* la identidad de todo el juego (la de las fichas, la pelota y las pantallas de deporte): tarjetas en ángulo con filete
   fucsia arriba, título en mayúsculas, el botón principal con el degradado fucsia y morado y letra blanca, los demás con
   borde lila, y la opción elegida en morado. Los botones del partido no cambian: ya son los finos de los juegos de fútbol */
.fb-card{position:relative;border-radius:4px;border:1px solid rgba(201,178,255,.25);background:radial-gradient(80% 60% at 100% 0%,rgba(255,43,214,.2),transparent 60%),linear-gradient(170deg,#31106b 0%,#12052a 78%);clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
.fb-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:var(--cta,linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7));box-shadow:0 0 24px rgba(255,43,214,.45);pointer-events:none;z-index:1}
.fb-card h2{text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.5)}
.fb-card .fb-kick{font-family:var(--f-cond,Nunito),sans-serif;font-weight:800;letter-spacing:.1em}
.fb-go{border-radius:4px;color:#fff;text-transform:uppercase;letter-spacing:.04em;background:var(--cta,linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7));box-shadow:0 0 18px rgba(255,43,214,.45);text-shadow:0 2px 0 rgba(74,10,94,.5);clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.fb-go:active{transform:translateY(2px)}
.fb-alt,.fb-card .fb-alt{border-radius:4px;border:1px solid rgba(190,160,255,.35);background:rgba(255,255,255,.08);font-family:var(--f-cond,Nunito),sans-serif;text-transform:uppercase;letter-spacing:.04em;font-weight:800;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.fb-chip{border-radius:4px;border:1px solid rgba(190,160,255,.35)}
.fb-chip.on{background:linear-gradient(180deg,#8338ec,#5e22c4);border-color:#c9a6ff;color:#fff;box-shadow:0 0 0 2px rgba(138,43,226,.35)}
`;
const SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>';
// iconos de los botones: trazo blanco fino (24 × 24), lo justo para reconocerlos
const IC = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  shoot: IC('<circle cx="15" cy="12" r="5"/><path d="M3.5 9.5h5M2.5 12h6M3.5 14.5h5"/>'),
  pass: IC('<path d="M5.5 18.5L18.5 5.5"/><path d="M10 5.5h8.5V14"/>'),
  through: IC('<path d="M4 19c5-1 9-6 12-11" stroke-dasharray="2 2.5"/><path d="M12.5 6.5H17V11"/>'),
  sprint: IC('<path d="M6 6.5l5.5 5.5L6 17.5M12.5 6.5l5.5 5.5-5.5 5.5"/>'),
  swap: IC('<path d="M4.5 9h14l-3.5-3.5M19.5 15h-14l3.5 3.5"/>'),
  tackle: IC('<circle cx="16.5" cy="12" r="3.5"/><path d="M11 12H3.5M6.5 9l-3 3 3 3"/>'),
  slide: IC('<path d="M2.5 17.5h11M10.5 14.5l3 3-3 3"/><circle cx="19" cy="17.5" r="2.3"/>'),
  contain: IC('<path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.3-7 9-4-1.7-7-4.6-7-9V6.3z"/>'),
  dive: IC('<path d="M4 18c3.5-6.5 8.5-9.5 14-9.5"/><circle cx="19" cy="8.5" r="2"/>'),
  ctrl: IC('<circle cx="12" cy="11" r="5.5"/><path d="M4.5 19.5h15"/>'),
  move: IC('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4"/>'),
};
const SVG_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/></svg>';
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
    r.innerHTML = `<div class="fb-top"><div class="fb-score"><div class="fb-team"><i style="background:${o.home.shirt}"></i><span class="fb-ln">${esc(o.home.name)}</span><span class="fb-sn">${esc(o.home.short || o.home.name)}</span><em class="fb-cd fb-cd0"></em><b class="fb-s0">0</b></div>
      <div class="fb-clock"><span class="fb-time">0:00</span><small class="fb-half">1ª parte</small></div>
      <div class="fb-team"><b class="fb-s1">0</b><em class="fb-cd fb-cd1"></em><span class="fb-ln">${esc(o.away.name)}</span><span class="fb-sn">${esc(o.away.short || o.away.name)}</span><i style="background:${o.away.shirt}"></i></div></div>
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
    // (los rótulos de los botones, siempre dentro del círculo; otra vez al girar o cambiar el tamaño)
    fitCircles(this.el.btns); this.onFit = () => fitCircles(this.el.btns); addEventListener('resize', this.onFit);
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
      const reset = () => { this.stick = { x: 0, y: 0, id: null }; knob.style.display = 'none'; };
      const end = (e) => { if (e.pointerId !== this.stick.id) return; reset(); };
      zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
      // el joystick se quedaba «pulsado» si el dedo se levantaba sin que llegara el pointerup a la zona (otra capa encima,
      // la zona oculta un momento, la app en segundo plano…): se suelta también al levantar todos los dedos, al perder el
      // foco y si en medio segundo no llega ningún movimiento ni el dedo sigue en la pantalla
      this.releaseAll = () => { if (this.stick.id !== null) reset(); for (const b of r.querySelectorAll('[data-a].down')) b.dispatchEvent(new PointerEvent('pointercancel')); };
      this.onAllUp = (e) => { if (!e.touches || e.touches.length === 0) this.releaseAll(); };
      this.onWinUp = (e) => { if (e.pointerId === this.stick.id) reset(); };
      this.onHide = () => this.releaseAll();
      addEventListener('touchend', this.onAllUp, true); addEventListener('touchcancel', this.onAllUp, true);
      addEventListener('pointerup', this.onWinUp, true); addEventListener('pointercancel', this.onWinUp, true);
      addEventListener('blur', this.onHide); document.addEventListener('visibilitychange', this.onHide);
    }
  }
  setScore(a, b) { this.el.s0.textContent = a; this.el.s1.textContent = b; }
  // faltas acumuladas de la parte (fútbol sala): un punto por falta; desde la 6.ª, en rojo
  // tarjetas de cada equipo junto a su nombre en el marcador (una por jugador amonestado o expulsado)
  setCards(g) {
    for (const t of [0, 1]) { const el = this.root.querySelector('.fb-cd' + t); if (!el) continue;
      el.innerHTML = g.players.filter(p => p.team === t && g.cards[p.id]).map(p => `<u class="${g.cards[p.id] === 'red' ? 'r' : 'y'}"></u>`).join(''); }
  }
  setFouls(a, b, lim = 5) {
    const el = this.root.querySelector('.fb-fouls'); if (!el) return;
    const dots = (n) => Array.from({ length: Math.max(lim, n) }, (_, i) => `<u class="${i < n ? (i >= lim ? 'x' : 'on') : ''}"></u>`).join('');
    el.innerHTML = `<span>${dots(a)}</span><b>FALTAS</b><span>${dots(b)}</span>`; el.classList.add('show');
  }
  setClock(sec, half, label) { const s = Math.max(0, Math.ceil(sec)); this.el.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; this.el.half.textContent = label || (half === 1 ? '1ª parte' : '2ª parte'); }
  // los botones según el momento: con el balón (atk), sin él (def: ROBAR y ENTRADA) o suelto (loose)
  setMode(mode) {
    if (this.mode === mode || !this.el.btns) return; this.mode = mode;
    const def = mode === 'def', set = (b, icon, label) => { b.innerHTML = `${ICON[icon]}<span>${label}</span>`; b.setAttribute('aria-label', label); fitCircle(b); };
    this.el.btns.className = 'fb-btns ' + mode;
    if (mode === 'gk') { set(this.el.pass, 'tackle', 'Estirada'); set(this.el.shoot, 'slide', 'Estirada'); return; }
    if (mode === 'gkhands') { set(this.el.pass, 'pass', 'Sacar'); set(this.el.shoot, 'shoot', 'Saque largo'); return; }
    set(this.el.pass, def ? 'tackle' : 'pass', def ? 'Robar' : 'Pase');
    set(this.el.shoot, def ? 'slide' : 'shoot', def ? 'Entrada' : 'Tiro');
  }
  setDefending(def) { this.setMode(def ? 'def' : 'atk'); }
  // tanda de penaltis: solo dos botones (PARAR o TIRO)
  setButtons(pass, shoot) {
    if (!this.el.pass) return; this.mode = 'pen'; this.el.btns.className = 'fb-btns pen';
    const keep = /PARAR/i.test(shoot);
    this.el.pass.innerHTML = `${ICON[keep ? 'dive' : 'pass']}<span>${pass}</span>`; this.el.shoot.innerHTML = `${ICON[keep ? 'dive' : 'shoot']}<span>${shoot}</span>`;
    fitCircle(this.el.pass); fitCircle(this.el.shoot);
  }
  /** Pantalla de controles (como en los juegos de fútbol), en tres pestañas: atacar, defender y portero. Cada control,
   *  una tarjeta corta con su icono, en dos columnas: cabe entera en el móvil tumbado sin desplazar. En el móvil se
   *  explica con los botones de la pantalla; en el ordenador, además, su tecla y su botón del mando. */
  controls() {
    return new Promise(res => {
      const touch = !!this.o.touch;
      const TABS = [
        ['Atacar', [['move', 'Moverte', 'Joystick: toca y arrastra en la mitad izquierda', 'WASD / flechas', 'Stick izq.'],
          ['pass', 'Pase', 'Toca: al pie. Mantén: al hueco; cuanto más, más lejos', 'J / espacio', 'A'],
          ['shoot', 'Tiro', 'Mantén para cargar; el joystick mueve la diana', 'K (mantén)', 'B (mantén)'],
          ['sprint', 'Sprint', 'Mantén para correr más (gasta energía)', 'Mayús', 'RT'],
          ['pass', 'Centro', 'En la banda, PASE hacia el área: llega por alto', 'J', 'A'],
          ['shoot', 'Remate de cabeza', 'Con el centro en el aire, mantén TIRO', 'K', 'B'],
          ['swap', 'Cambiar', 'Al que apuntas; sin apuntar, al más cercano', 'L', 'LB'],
          ['ctrl', 'Controlar', 'Suelta el joystick: frenas con el balón pegado', '', '']]],
        ['Defender', [['tackle', 'Robar', 'PASE, pegado al rival', 'J', 'A'],
          ['slide', 'Entrada', 'TIRO (si llegas tarde, es falta)', 'K', 'B'],
          ['swap', 'Cambiar', 'Al compañero más cerca del balón', 'L', 'LB'],
          ['sprint', 'Sprint', 'Mantén para llegar antes', 'Mayús', 'RT']]],
        ['Portero', [['dive', 'Estirada', 'Ante un tiro, cualquier botón, hacia donde apuntas', 'J / K', 'A / B'],
          ['pass', 'Con el balón en los pies', 'Pasa, conduce y despeja; fuera del área, sin manos', 'J / K', 'A / B'],
          ['pass', 'Sacar con la mano', 'Balón en las manos: PASE a quien apuntas', 'J', 'A'],
          ['shoot', 'Saque largo', 'Balón en las manos: mantén TIRO', 'K', 'B']]],
      ];
      const card = ([ic, a, b, k, m]) => `<div class="fb-ck">${ic ? `<i>${ICON[ic]}</i>` : '<i></i>'}<div><b>${a}</b><small>${b}</small>${!touch && (k || m) ? `<em>${k ? `Teclado ${k}` : ''}${k && m ? ' · ' : ''}${m ? `Mando ${m}` : ''}</em>` : ''}</div></div>`;
      const pane = (i) => `<div class="fb-cgrid">${TABS[i][1].map(card).join('')}</div>`;
      const p = this.panel(`<h2>Controles</h2><div class="fb-ctabs" role="tablist">${TABS.map(([t], i) => `<button role="tab" data-t="${i}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
        <div class="fb-cpane" role="tabpanel">${pane(0)}</div><button class="fb-go">Entendido</button>`);
      p.querySelectorAll('.fb-ctabs button').forEach(b => b.onclick = () => { p.querySelectorAll('.fb-ctabs button').forEach(x => x.setAttribute('aria-selected', x === b)); p.querySelector('.fb-cpane').innerHTML = pane(+b.dataset.t); });
      p.classList.add('fb-controls');
      p.querySelector('.fb-go').onclick = () => { p.remove(); res(); };
    });
  }
  bars(energy, charge, kind = null) {
    // la fuerza también en el propio botón que mantienes: un aro que se llena
    for (const k of ['pass', 'shoot']) { const el = this.el[k]; if (!el) continue; const on = kind === k && charge >= 0; el.classList.toggle('chg', on); if (on) el.style.setProperty('--chg', charge.toFixed(3)); }
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
    // la tarjeta: arriba el contenido (que se desplaza si no cabe) y abajo, aparte, los botones; antes iban pegados
    // dentro del contenido y en el móvil tumbado tapaban las últimas filas
    const p = document.createElement('div'); p.className = 'fb-panel'; p.innerHTML = `<div class="fb-card"><div class="fb-body">${html}</div><div class="fb-foot"></div></div>`;
    const body = p.querySelector('.fb-body'), foot = p.querySelector('.fb-foot');
    for (const b of [...body.children].filter(e => e.matches('.fb-go, .fb-alt'))) foot.appendChild(b);
    foot.classList.toggle('n1', foot.children.length === 1); foot.classList.toggle('n4', foot.children.length >= 4);
    if (!foot.children.length) foot.remove();
    this.root.appendChild(p); return p;
  }
  /** Menú previo: modo, rival, dificultad, duración y asistencia. */
  // (los retos van en su propia fila; rival, dificultad, duración y asistencia solo se ven cuando cuentan para el modo)
  menu({ title = 'Fútbol', sub = '', modes, rivals, values }) {
    return new Promise(res => {
      const v = { ...values };
      const LABEL = { mode: 'Modo', reto: 'Retos de entrenamiento', rival: 'Rival', level: 'Dificultad', duration: 'Duración de cada parte', assist: 'Asistencia al pase y al tiro', sistema: 'Sistema' };
      const chips = (key, list, k = key) => `<div class="fb-row" data-row="${key}"><label>${LABEL[key]}</label>${list.map(([id, name]) => `<button class="fb-chip ${v[k] === id ? 'on' : ''}" data-k="${k}" data-v="${id}">${esc(name)}</button>`).join('')}</div>`;
      const main = modes.filter(([id]) => !String(id).startsWith('reto:')), retos = modes.filter(([id]) => String(id).startsWith('reto:'));
      const p = this.panel(`<p class="fb-kick">${esc(sub)}</p><h2>${esc(title)}</h2>
        ${chips('mode', main)}${retos.length ? chips('reto', retos, 'mode') : ''}${rivals.length > 1 ? chips('rival', rivals) : ''}${chips('level', [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']])}
        ${chips('duration', [[2, '2 min'], [3, '3 min'], [4, '4 min'], [5, '5 min']])}${chips('assist', [[true, 'Sí'], [false, 'No']])}${v.sistemas ? chips('sistema', v.sistemas.map(id => [id, id])) : ''}
        <button class="fb-go">¡A jugar!</button><button class="fb-alt">Salir</button>`); p.classList.add('fb-menu');
      const refresh = () => {
        const m = String(v.mode), reto = m.startsWith('reto:'), pen = m === 'penalties';
        const show = { rival: !reto, level: !reto, duration: !reto && !pen, assist: !reto && !pen, sistema: !reto && !pen };
        for (const row of p.querySelectorAll('.fb-row[data-row]')) if (row.dataset.row in show) row.style.display = show[row.dataset.row] ? '' : 'none';
      };
      refresh();
      p.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.k) { const k = b.dataset.k, raw = b.dataset.v; v[k] = k === 'duration' ? +raw : k === 'assist' ? raw === 'true' : raw; p.querySelectorAll(`[data-k="${k}"]`).forEach(c => c.classList.toggle('on', c === b)); if (k === 'mode') refresh(); return; }
        p.remove(); res(b.classList.contains('fb-go') ? v : null);
      });
    });
  }
  /** Pizarra para elegir el sistema: los once dibujados en su sitio (en ataque) y su explicación. */
  tactic(T) {
    return new Promise(res => {
      const ids = Object.keys(T.sistemas); let cur = T.actual;
      const board = (id) => { const S = T.sistemas[id], dots = Object.entries(S.roles).map(([k, f]) => { const x = 50 + f.atk[1] * 42, y = 92 - (f.atk[0] + 1) / 1.9 * 84; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${f.line === 1 ? '#5ab0ff' : f.line === 2 ? '#ff9bd8' : '#ff6a5a'}" stroke="#0b1b10" stroke-width="1.2"/>`; }).join('');
        return `<svg viewBox="0 0 100 100" class="fb-board"><rect x="2" y="2" width="96" height="96" rx="4" fill="#2e7d3a" stroke="#e8f5e0" stroke-width="1.4"/><line x1="2" y1="50" x2="98" y2="50" stroke="#e8f5e0" stroke-width="1"/><circle cx="50" cy="50" r="10" fill="none" stroke="#e8f5e0" stroke-width="1"/><rect x="28" y="86" width="44" height="12" fill="none" stroke="#e8f5e0" stroke-width="1"/><rect x="28" y="2" width="44" height="12" fill="none" stroke="#e8f5e0" stroke-width="1"/><circle cx="50" cy="94" r="4.2" fill="#fff" stroke="#0b1b10" stroke-width="1.2"/>${dots}</svg>`; };
      const p = this.panel(`<p class="fb-kick">Táctica</p><h2>Elige el sistema</h2><div class="fb-tac"><div class="fb-tac-b"></div><div class="fb-tac-r"><div class="fb-row">${ids.map(id => `<button class="fb-chip ${id === cur ? 'on' : ''}" data-s="${id}">${id}</button>`).join('')}</div><p class="fb-tac-t"></p><p class="fb-tac-l"><i style="background:#5ab0ff"></i>Defensa <i style="background:#ff9bd8"></i>Medio <i style="background:#ff6a5a"></i>Delantera</p></div></div><button class="fb-go">Aplicar</button><button class="fb-alt">Volver</button>`);
      const draw = () => { p.querySelector('.fb-tac-b').innerHTML = board(cur); p.querySelector('.fb-tac-t').textContent = T.sistemas[cur].text; p.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === cur)); };
      draw();
      p.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s) { cur = b.dataset.s; draw(); return; } p.remove(); if (b.classList.contains('fb-go')) { T.pick(cur); T.actual = cur; res(cur); } else res(null); });
    });
  }
  pause(T = null) {
    return new Promise(res => {
      const p = this.panel(`<h2>Pausa</h2><p>El partido está parado.</p><button class="fb-go">Seguir</button>${T ? `<button class="fb-alt fb-tac-btn">Táctica · ${T.actual}</button>` : ''}<button class="fb-alt fb-ctl">Controles</button><button class="fb-alt fb-quit">Abandonar</button>`);
      p.querySelector('.fb-go').onclick = () => { p.remove(); res('resume'); };
      const tb = p.querySelector('.fb-tac-btn'); if (tb) tb.onclick = async (e) => { e.stopPropagation(); p.style.display = 'none'; const id = await this.tactic(T); if (id) tb.textContent = `Táctica · ${id}`; p.style.display = ''; };
      p.querySelector('.fb-ctl').onclick = async (e) => { e.stopPropagation(); p.style.display = 'none'; await this.controls(); p.style.display = ''; };
      p.querySelector('.fb-quit').onclick = () => { p.remove(); res('quit'); };
    });
  }
  /** Pantalla final con las estadísticas. */
  end({ title, sub, score, rows = [], again = 'Revancha', exit = 'Salir', fact = '' }) {
    return new Promise(res => {
      const p = this.panel(`<p class="fb-kick">${esc(sub || '')}</p><h2>${esc(title)}</h2>${score ? `<div class="fb-big">${esc(score)}</div>` : ''}
        ${rows.length ? `<table class="fb-stats">${rows.map(([a, n, b]) => `<tr><td>${esc(a)}</td><td>${esc(n)}</td><td>${esc(b)}</td></tr>`).join('')}</table>` : ''}
        ${fact ? `<p class="fb-fact"><b>Saber de Navarra</b>${esc(fact)}</p>` : ''}
        ${again ? `<button class="fb-go">${esc(again)}</button>` : ''}<button class="fb-alt">${esc(exit)}</button>`);
      p.querySelector('.fb-go')?.addEventListener('click', () => { p.remove(); res('again'); });
      p.querySelector('.fb-alt').addEventListener('click', () => { p.remove(); res('exit'); });
    });
  }
  info({ kicker = '', title, text, button = 'Seguir' }) {
    return new Promise(res => { const p = this.panel(`<p class="fb-kick">${esc(kicker)}</p><h2>${esc(title)}</h2><p>${text}</p><button class="fb-go">${esc(button)}</button>`); p.querySelector('.fb-go').onclick = () => { p.remove(); res(); }; });
  }
  /** Fundido breve a negro: tapa los cambios de sitio de golpe (saque de centro tras un gol, descanso). */
  dispose() {
    clearTimeout(this.mt); clearTimeout(this.st); this.root.remove();
    removeEventListener('touchend', this.onAllUp, true); removeEventListener('touchcancel', this.onAllUp, true);
    removeEventListener('pointerup', this.onWinUp, true); removeEventListener('pointercancel', this.onWinUp, true);
    removeEventListener('blur', this.onHide); document.removeEventListener('visibilitychange', this.onHide); removeEventListener('resize', this.onFit);
  }
}
