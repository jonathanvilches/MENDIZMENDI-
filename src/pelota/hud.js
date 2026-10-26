// Interfaz del partido (DOM): marcador, avisos del juez y del kantari, consejos, joystick y botones.
// Todo lleva el prefijo «pel-» y se coloca sin solaparse en móvil (vertical y horizontal) y escritorio.
import { fitCircle, fitCircles } from '../ui/fitlabel.js';
import { icon3DReady } from '../ui/icon3d.js';
import { esc } from '../util/html.js';
export { esc };
const CSS = `
.pel-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:var(--pel-font,Nunito,sans-serif);color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.pel-root.vuelo>*{visibility:hidden!important}
.pel-root.repe :is(.pel-stick,.pel-btns,.pel-stickhint,.pel-tip,.pel-q,.pel-myen,.pel-exit,.pel-call){visibility:hidden}
/* la repetición: el rótulo arriba a la izquierda, a la misma altura que el marcador (arriba a la derecha) y con su
   misma forma: igual de alto, el mismo fondo y la misma raya de color arriba; con su punto rojo que late y, en cámara
   lenta, su aviso. Debajo, cómo saltarla. En un móvil de pie no caben los dos en la misma fila: baja justo debajo */
.pel-rep{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none;animation:pel-repin .45s cubic-bezier(.2,1.3,.4,1) both}
.pel-rep-b{display:flex;align-items:center;gap:8px;height:30px;padding:0 16px 0 12px;border-radius:3px;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
.pel-rep-b i{flex:none;width:8px;height:8px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 8px #ff3b5c;animation:pel-rec 1s ease-in-out infinite}
.pel-rep-b b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),Nunito,sans-serif;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.pel-rep-b .sl{display:none;font:800 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),Nunito,sans-serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;color:#ffd6f6;padding:4px 8px;border-radius:999px;background:rgba(255,43,214,.35)}
.pel-rep.slow .sl{display:inline-block;animation:pel-repin .3s ease-out both}
.pel-rep small{font:700 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8dcff;text-shadow:0 1px 3px #000;padding-left:8px}
@media (max-width:620px){.pel-rep{top:calc(env(safe-area-inset-top,0px) + var(--edge,16px) + 38px)}}
@keyframes pel-repin{from{opacity:0;transform:translateX(-24px)}}@keyframes pel-rec{50%{opacity:.25}}
/* el sorteo del saque: la chapa (azul por una cara y colorada por la otra) sube girando y cae; brilla el lado que saca */
.pel-toss{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:16px;pointer-events:auto;background:radial-gradient(ellipse at 50% 45%,rgba(40,14,92,.78),rgba(7,2,15,.92));animation:pel-tossbg .3s ease-out both}.pel-toss.directo{animation:none}
.pel-root:has(>.pel-toss)>:not(.pel-toss){visibility:hidden}
.pel-toss.out{animation:pel-tossout .32s ease-in both}
.pel-toss-card{display:flex;flex-direction:column;align-items:center;gap:12px;width:min(640px,100%);text-align:center}
.pel-toss-k{font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Cond'),Nunito,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ffd6f6;animation:pel-kin .6s ease-out both}
.pel-toss-row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:end;gap:16px;width:100%;margin-top:24px}
.pel-toss-p{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:8px;border:2px solid transparent;transition:transform .3s,box-shadow .3s,border-color .3s;min-width:0}
.pel-toss-p i{width:34px;height:34px;border-radius:50%;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),0 0 0 3px rgba(255,255,255,.25)}
.pel-toss-p.azul i{background:radial-gradient(circle at 35% 30%,#9c92ff,#5b4bff 50%,#2a1a9e)}.pel-toss-p.rojo i{background:radial-gradient(circle at 35% 30%,#ff8fc0,#ff2e88 50%,#9e0f52)}
.pel-toss-p b{font:400 var(--fs-xl)/1.05 var(--f-display,'MZ Display'),Nunito,sans-serif;text-transform:uppercase;max-width:100%;overflow-wrap:anywhere}
.pel-toss-p small{font:700 var(--fs-xs)/1.25 var(--f-cond,'MZ Cond'),Nunito,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#d8cff0}
.pel-toss-p.azul{animation:pel-tl .45s cubic-bezier(.2,1.3,.4,1) both}.pel-toss-p.rojo{animation:pel-tr .45s cubic-bezier(.2,1.3,.4,1) both}
.pel-toss-p.gana{transform:scale(1.1)}.pel-toss-p.azul.gana{border-color:#8f84ff;box-shadow:0 0 28px rgba(91,75,255,.8),inset 0 0 18px rgba(91,75,255,.4)}.pel-toss-p.rojo.gana{border-color:#ff7ac8;box-shadow:0 0 28px rgba(255,46,136,.8),inset 0 0 18px rgba(255,46,136,.4)}
.pel-toss-coin{position:relative;width:104px;height:150px;perspective:600px;display:flex;align-items:flex-end;justify-content:center}
.pel-toss-coin .coin{position:relative;width:84px;height:84px;margin-bottom:22px;transform-style:preserve-3d;transform:rotateX(70deg)}
.pel-toss-coin .f{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:inset 0 0 0 5px rgba(255,255,255,.4),inset 0 0 0 9px rgba(0,0,0,.15)}
.pel-toss-coin .f.azul{background:radial-gradient(circle at 35% 30%,#a59cff,#5b4bff 48%,#2a1a9e)}
.pel-toss-coin .f.rojo{transform:rotateX(180deg);background:radial-gradient(circle at 35% 30%,#ff9cc8,#ff2e88 48%,#9e0f52)}
.pel-toss-coin .sh{position:absolute;bottom:8px;left:50%;width:70px;height:12px;margin-left:-35px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(3px)}
.pel-toss.aire .coin{animation:pel-flip 1.45s cubic-bezier(.25,.6,.35,1) both}.pel-toss.aire .sh{animation:pel-flipsh 1.45s cubic-bezier(.25,.6,.35,1) both}
.pel-toss.cae .coin{animation:pel-flip 1.45s cubic-bezier(.25,.6,.35,1) both,pel-land .35s 1.45s ease-out}
.pel-toss-why{margin:0;font:700 var(--fs-sm)/1.3 var(--f-cond,'MZ Cond'),Nunito,sans-serif;letter-spacing:.04em;color:#e8dcff}
.pel-toss.aire .pel-toss-go{opacity:0;pointer-events:none;transform:scale(.9);transition:opacity .2s,transform .2s}
.pel-toss-go{animation:pel-kin .5s .35s ease-out both}
.pel-toss-res{margin:0;min-height:1.2em;font:400 var(--fs-3xl)/1 var(--f-display,'MZ Display'),Nunito,sans-serif;text-transform:uppercase;letter-spacing:.02em}
.pel-toss-res.azul{color:#b3aaff;text-shadow:0 0 18px rgba(91,75,255,.9);animation:pel-res .5s cubic-bezier(.2,1.6,.4,1) both}.pel-toss-res.rojo{color:#ff9ccc;text-shadow:0 0 18px rgba(255,46,136,.9);animation:pel-res .5s cubic-bezier(.2,1.6,.4,1) both}
@keyframes pel-flip{0%{transform:translateY(0) rotateX(70deg)}50%{transform:translateY(-96px) rotateX(990deg)}100%{transform:translateY(0) rotateX(calc(1870deg + var(--fin,0deg)))}}
@keyframes pel-flipsh{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.45);opacity:.4}}
@keyframes pel-land{30%{translate:0 -10px}}
.pel-root.pel-fuera{animation:pel-fuera .3s ease-in both}.pel-panel.pel-fuera{animation:pel-fuera .2s ease-in both;pointer-events:none}.pel-root.pel-fuera *{pointer-events:none!important}@keyframes pel-fuera{to{opacity:0}}
@keyframes pel-tossbg{from{opacity:0}}@keyframes pel-tossout{to{opacity:0;transform:scale(1.04)}}
@keyframes pel-tl{from{opacity:0;transform:translateX(-40px)}}@keyframes pel-tr{from{opacity:0;transform:translateX(40px)}}
@keyframes pel-kin{from{opacity:0;letter-spacing:.5em}}@keyframes pel-res{from{opacity:0;transform:scale(.5)}}
@media (orientation:portrait){.pel-toss-row{gap:8px}.pel-toss-coin{width:84px}.pel-toss-p b{font-size:var(--fs-lg)}}
@media (prefers-reduced-motion:reduce){.pel-toss *,.pel-rep *{animation-duration:.01s!important}}
.pel-root *{box-sizing:border-box}
.pel-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));right:calc(env(safe-area-inset-right,0px) + var(--edge,16px));display:flex;justify-content:flex-end}
.pel-exit{padding:0;position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.82);background:rgba(14,10,24,.66);box-shadow:0 3px 12px rgba(0,0,0,.35);color:#fff;pointer-events:auto;cursor:pointer;display:grid;place-items:center}.pel-exit svg{width:20px;height:20px;display:block}.pel-exit .pel-xi{width:22px;height:22px;display:block;pointer-events:none}
.pel-score{display:flex;align-items:stretch;gap:0;border-radius:3px;opacity:.95;overflow:hidden;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:100%;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
.pel-side{display:flex;align-items:center;gap:4px;padding:2px 8px;min-width:0;height:28px}
.pel-side b{font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-size:var(--fs-lg);line-height:1;min-width:1em;text-align:center}
.pel-side span{font:800 var(--fs-sm)/1 var(--f-cond,Nunito),sans-serif;letter-spacing:.04em;text-transform:uppercase;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(calc(16vw / var(--z, 1)),90px)}
.pel-red{background:linear-gradient(180deg,#ff2e88,#a8135f)}.pel-blue{background:linear-gradient(180deg,#5b4bff,#3121b0)}
.pel-mid{display:grid;place-items:center;padding:0 8px;font:800 var(--fs-xs)/1 var(--f-cond,Nunito),sans-serif;color:var(--lila,#c9b2ff);text-transform:uppercase;letter-spacing:.1em;white-space:nowrap}
.pel-serve{width:7px;height:7px;border-radius:50%;background:#fff6d8;box-shadow:0 0 0 2px rgba(0,0,0,.25);visibility:hidden;flex:none}
.pel-serve.on{visibility:visible}
.pel-call{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 72px);transform:translateX(-50%) scale(.9);opacity:0;transition:opacity .18s,transform .18s;text-align:center;max-width:min(calc(92vw / var(--z, 1)),520px);padding:8px 16px;border-radius:18px;background:linear-gradient(180deg,rgba(50,19,111,.94),rgba(28,11,58,.94));border:1px solid rgba(190,160,255,.35);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.pel-call.on{opacity:1;transform:translateX(-50%) scale(1)}
.pel-root.final .pel-call{background:var(--cta,linear-gradient(100deg,#ff2bd6,#7b2ff7));border-color:#ffc2ec;color:#fff;box-shadow:0 0 0 4px rgba(255,122,200,.25),0 14px 40px rgba(0,0,0,.45);animation:pelFinal .6s cubic-bezier(.2,1.6,.4,1)}
.pel-root.final .pel-call .pel-kantari{color:#fff}
@keyframes pelFinal{0%{transform:translateX(-50%) scale(.5)}100%{transform:translateX(-50%) scale(1)}}
.pel-call h3{margin:0;font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-size:var(--fs-hero);line-height:1;letter-spacing:0}
.pel-call p{margin:4px 0 0;font-size:var(--fs-sm);line-height:1.3;opacity:.95}
.pel-call .pel-kantari{margin-top:8px;font-size:var(--fs-md);font-weight:800;color:#ff7ac8}
.pel-q{position:absolute;left:50%;top:40%;display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;transform:translate(-50%,-50%);font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-size:var(--fs-2xl);text-shadow:0 3px 10px rgba(0,0,0,.45);opacity:0;transition:opacity .15s;pointer-events:none}
.pel-q.on{opacity:1}
/* el aviso de cada golpe, como en los juegos de deportes: grande, con rebote, y su color según cómo le has dado */
.pel-q b{font:400 var(--fs-4xl)/1 var(--f-display,'MZ Display'),Nunito,sans-serif;text-transform:uppercase;letter-spacing:0;color:#fff;filter:drop-shadow(0 4px 0 rgba(7,2,15,.6))}
.pel-q.on b{animation:pel-qpop .45s cubic-bezier(.2,1.7,.4,1) both}
.pel-q small{font:800 var(--fs-sm)/1.2 var(--f-cond,Nunito),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:2px 8px;background:rgba(7,2,15,.72);clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)}
.pel-q small:empty{display:none}
.pel-q.k-perfect b{background:linear-gradient(180deg,#fff 30%,#ff7ac8 60%,#ff2bd6);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(255,43,214,.9)) drop-shadow(0 4px 0 rgba(7,2,15,.6))}
.pel-q.k-good b{color:#c9b2ff}.pel-q.k-early b,.pel-q.k-late b,.pel-q.k-whiff b{color:#ff6fb5;animation:pel-qshake .4s ease both}
@keyframes pel-qpop{from{transform:scale(2.2) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
@keyframes pel-qshake{0%{transform:scale(1.4);opacity:0}30%{transform:translateX(-8px);opacity:1}60%{transform:translateX(6px)}100%{transform:none}}
.pel-tip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 16px + var(--pel-tip-sube,0px));width:max-content;max-width:min(560px,calc(calc(100vw / var(--z, 1)) - 330px));padding:8px 16px;border-radius:14px;background:rgba(28,11,58,.86);border:1px solid rgba(190,160,255,.3);font-size:var(--fs-md);font-weight:700;line-height:1.3;text-align:center;opacity:0;transition:opacity .2s}
/* (con tu energía abajo en el centro, el consejo, encima de ella) */
.pel-root:has(.pel-myen:not([hidden])){--pel-tip-sube:48px}
.pel-tip.on{opacity:1}
.pel-stick{position:absolute;left:0;bottom:0;width:calc(46vw / var(--z, 1));height:calc(62dvh / var(--z, 1));pointer-events:auto;touch-action:none}
.pel-knob{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(28,11,58,.3);display:none}
.pel-knob i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.85)}
.pel-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));width:120px;height:120px;border-radius:50%;border:3px dashed rgba(255,255,255,.55);display:grid;place-items:center;font-size:var(--fs-xs);font-weight:700;text-align:center;opacity:.8;padding:8px}
.pel-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));display:flex;align-items:flex-end;gap:12px;pointer-events:auto}
.pel-btn{padding:0;border:0;border-radius:50%;color:#2a0638;font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-weight:800;line-height:1.15;display:grid;place-items:center;cursor:pointer;touch-action:none;box-shadow:0 6px 0 rgba(0,0,0,.25),0 8px 22px rgba(0,0,0,.25);transition:transform .06s}
.pel-btn:active,.pel-btn.down{transform:translateY(4px);box-shadow:0 2px 0 rgba(0,0,0,.25)}
.pel-hit{width:112px;height:112px;font-size:var(--fs-xl);color:#fff;text-shadow:0 2px 0 rgba(74,10,94,.6);background:radial-gradient(circle at 50% 30%,#ff9bd8,#ff2bd6 60%,#c21cff);box-shadow:0 0 0 4px rgba(255,122,200,.35),0 6px 0 #8a1c8f,0 10px 22px rgba(0,0,0,.35)}
.pel-hit.ready{animation:pel-pulse .5s infinite alternate}
@keyframes pel-pulse{from{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 rgba(255,220,80,.7)}to{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 14px rgba(255,220,80,0)}}
.pel-drop{width:80px;height:80px;font-size:var(--fs-sm);color:#fff;text-shadow:0 1px 0 #1f1a26;background:radial-gradient(circle at 50% 30%,rgba(80,40,150,.92),rgba(28,11,58,.95));border:2.5px solid #fff;box-shadow:0 0 0 3px rgba(138,43,226,.45),0 5px 0 rgba(10,4,24,.55),0 8px 16px rgba(0,0,0,.3)}
.pel-bcol{display:flex;flex-direction:column;align-items:center;gap:8px}
.pel-cut{font-size:var(--fs-xs);line-height:1;padding:0 4px;text-align:center}
.pel-cut{background:radial-gradient(circle at 50% 30%,rgba(255,60,150,.95),rgba(120,10,70,.96));box-shadow:0 0 0 3px rgba(255,46,136,.45),0 5px 0 rgba(40,4,24,.55),0 8px 16px rgba(0,0,0,.3)}
.pel-hit,.pel-cut,.pel-drop{position:relative}
.pel-hit.charging::after,.pel-cut.charging::after,.pel-drop.charging::after{content:'';position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(#ff2bd6 var(--cp),rgba(255,255,255,.18) 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));pointer-events:none}
.pel-hit.full::after,.pel-cut.full::after,.pel-drop.full::after{background:#ff2e88;animation:pel-full .25s infinite alternate}
@keyframes pel-full{to{filter:brightness(1.6)}}
/* (las ventanas del partido, por encima de todo: la etiqueta de GOLPE asomaba encima de «Seguir jugando» y se llevaba el toque) */
.pel-panel{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(14,4,34,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px calc(env(safe-area-inset-bottom,0px) + 16px)}
.pel-card{position:relative;width:min(520px,100%);max-height:100%;overflow:auto;background:radial-gradient(80% 60% at 100% 0%,rgba(255,43,214,.2),transparent 60%),linear-gradient(170deg,#31106b 0%,#12052a 78%);color:#f6f3fc;border:1px solid rgba(201,178,255,.25);border-radius:4px;padding:24px 24px 16px;box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px);animation:gx-rise .3s cubic-bezier(.2,.9,.3,1) both}
.pel-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:var(--cta,#ff2bd6);box-shadow:0 0 18px rgba(255,43,214,.5)}
.pel-card h2{margin:0 0 var(--t-mb);font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-weight:400;font-size:var(--fs-2xl);line-height:1;color:#fff;text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.5)}
.pel-card .pel-sub{margin:0 0 12px;font:800 var(--fs-sm)/1.2 var(--f-cond,Nunito),sans-serif;color:#ff7ac8;letter-spacing:.04em;text-transform:uppercase}
.pel-card ol{margin:0 0 12px;padding-left:24px;color:#e6def7}.pel-card li{margin:0 0 8px;line-height:1.3}.pel-card li::marker{color:#ff7ac8;font-weight:900}
.pel-card .pel-ctrl{font-size:var(--fs-sm);line-height:1.45;background:rgba(255,255,255,.06);border:1px solid rgba(190,160,255,.22);color:#cbc2e0;border-radius:12px;padding:8px 12px;margin:0 0 16px}
.pel-card .pel-big{font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-weight:400;font-size:var(--fs-4xl);text-align:center;margin:8px 0;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.35)}
.pel-card .pel-fact{background:rgba(255,122,200,.1);border:1px solid rgba(255,122,200,.35);color:#fff3c4;border-radius:12px;padding:8px 12px;margin:8px 0 16px;font-size:var(--fs-sm);line-height:1.3}.pel-card .pel-fact b{color:#ff7ac8}
.pel-force{position:absolute;right:calc(env(safe-area-inset-right,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px) + 180px);min-width:190px;padding:8px 8px 8px;border-radius:12px;background:rgba(20,8,40,.82);color:#fff;font-weight:900;font-size:var(--fs-sm);opacity:0;transform:translateY(6px);transition:opacity .12s,transform .12s;pointer-events:none;z-index:6}.pel-force.on{opacity:1;transform:none}.pel-force i{display:block;height:7px;margin-top:4px;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden}.pel-force u{display:block;height:100%;width:0;background:var(--fc,#ff9bd8);border-radius:4px}.pel-force i{position:relative;overflow:visible}.pel-force i::after{content:'';position:absolute;left:88%;top:-3px;bottom:-3px;width:2px;background:#fff;opacity:0;border-radius:1px}.pel-force.hit i::after{opacity:.75}.pel-force.reb i::after{opacity:1;box-shadow:0 0 6px #fff}@media (max-height:520px){.pel-force{bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px) + 156px)}}.pel-row{display:flex;gap:8px;position:sticky;bottom:-16px;z-index:1;margin:0 -4px -8px;padding:8px 4px 8px;background:linear-gradient(180deg,rgba(28,11,58,0),#1c0b3a 35%)}.pel-row .pel-go{flex:1 1 0;min-width:0;white-space:nowrap}@media (max-width:440px){.pel-row{flex-direction:column-reverse}.pel-row .pel-go{flex:none;width:100%}}
.pel-lbl{display:block;font-size:var(--fs-xs);font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px}
.pel-levels{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}
.pel-levels button{flex:1;min-width:90px;border-radius:12px;border:1px solid rgba(190,160,255,.35);background:rgba(255,255,255,.06);color:#fff;padding:8px 8px;font:inherit;font-weight:900;cursor:pointer}
.pel-levels button[aria-pressed=true]{background:linear-gradient(180deg,#8338ec,#5e22c4);border-color:#c9a6ff;color:#fff;box-shadow:0 0 0 2px rgba(138,43,226,.35)}
.pel-go{border:0;border-radius:4px;padding:12px 24px;font:400 var(--fs-xl)/1 var(--f-display,'MZ Display'),Nunito,sans-serif;text-transform:uppercase;letter-spacing:.04em;min-height:48px;cursor:pointer;color:#fff;background:var(--cta,linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7));box-shadow:0 0 18px rgba(255,43,214,.45);text-shadow:0 2px 0 rgba(74,10,94,.5);clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}.pel-go:active{transform:translateY(2px);box-shadow:0 2px 0 #8a1c8f}
.pel-go.alt{font:800 var(--fs-md)/1.15 var(--f-cond,'MZ Cond'),Nunito,sans-serif;letter-spacing:.04em;background:rgba(255,255,255,.08);border:1px solid rgba(190,160,255,.35);color:#fff;box-shadow:none;text-shadow:none}
.pel-root.calling .pel-tip,.pel-root.calling .pel-q{opacity:0}
.pel-root.paneled .pel-exit,.pel-root.paneled .pel-q,.pel-root.paneled .pel-call,.pel-root.paneled .pel-tip{visibility:hidden}
.pel-rv{display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;background:rgba(255,122,200,.08);border:1px solid rgba(255,122,200,.32);border-radius:12px;padding:8px 12px;margin:0 0 12px;font-size:var(--fs-sm);color:#f3ecff}
.pel-rv b{color:#ff7ac8;font-weight:900}.pel-rv .st{white-space:nowrap}.pel-rv .st i{font-style:normal;color:#ff7ac8;letter-spacing:1px}.pel-rv .st i u{color:rgba(255,255,255,.22);text-decoration:none}
.pel-rv p{margin:0;flex:1 1 100%;font-size:var(--fs-sm);line-height:1.3;color:#d8cff0}
/* la ficha del rival: cómo corre, cuánto pega, sus manos, sus golpes preferidos y de qué tener cuidado */
.pel-rv>.pf{flex:1 1 100%}.pf{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;min-width:0}.pf>b{flex:1 1 100%}.pf .pf-k{color:#fff}
.pf .pf-sh{flex:1 1 100%;font-size:var(--fs-sm)}.pf .pf-sh em{font-style:normal;margin-right:12px;white-space:nowrap}.pf .pf-sh em i{font-style:normal;color:#ff7ac8;letter-spacing:1px}
.pf p strong{color:#ffb9a8}.pel-rv.pel-rv2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 16px}
@media (max-width:560px){.pel-rv.pel-rv2{grid-template-columns:1fr}}
.pel-pairs{margin:0 0 8px;font-size:var(--fs-sm);line-height:1.45;color:#d8cff0}
/* las partes del frontón: el botón junto al título y la ficha de cada parte, abajo */
.pel-chip{position:relative;min-height:40px;margin-left:8px;border:1px solid rgba(255,122,200,.6);background:rgba(255,122,200,.12);color:#ff7ac8;border-radius:999px;padding:4px 12px;font:inherit;font-size:var(--fs-xs);font-weight:900;letter-spacing:0;cursor:pointer;vertical-align:middle}
.pel-tour{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translateX(-50%);width:min(560px,calc(calc(100vw / var(--z, 1)) - 32px));padding:8px 16px;border-radius:16px;background:linear-gradient(180deg,rgba(50,19,111,.95),rgba(28,11,58,.95));border:1px solid rgba(255,122,200,.45);pointer-events:auto;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.pel-tour b{display:block;font-family:var(--pel-display,'MZ Display',Nunito,sans-serif);font-size:var(--fs-lg);font-weight:400;color:#ff7ac8}
.pel-tour p{margin:4px 0 8px;font-size:var(--fs-sm);line-height:1.3}.pel-tour div{display:flex;gap:8px;justify-content:flex-end}
.pel-tour button{border-radius:12px;border:1px solid rgba(190,160,255,.4);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:900;padding:8px 16px;min-height:44px;cursor:pointer}
.pel-tour button.go{background:linear-gradient(180deg,#ffc2ec,#ff7ac8 50%,#ff3dbd);color:#2a0638;border:0}
/* la energía de los demás pelotaris, en el marcador: una raya fina al pie del lado de cada uno (blanca; amarilla y luego
   parpadeando al cansarse). Antes iba en un recuadro con sus nombres arriba a la izquierda, debajo de la X de salir:
   se pisaban y tapaban la cancha */
.pel-side{position:relative}
.pel-sen{position:absolute;left:12px;right:12px;bottom:calc(2px + var(--k,0) * 3.5px);height:2.5px;border-radius:2px;background:rgba(7,2,15,.45);overflow:hidden;pointer-events:none}
.pel-sen b{position:absolute;inset:0;transform-origin:left;background:rgba(255,255,255,.92);transition:transform .2s}
.pel-sen.mid b{background:#ffe066}.pel-sen.low b{background:#ffe066;animation:pel-sen .5s ease-in-out infinite alternate}@keyframes pel-sen{to{opacity:.3}}
@media (max-width:560px){.pel-mid{display:none}.pel-side{padding:2px 8px}.pel-side span{max-width:calc(20vw / var(--z, 1))}
  .pel-tip{max-width:calc(calc(100vw / var(--z, 1)) - 32px);bottom:auto;top:calc(env(safe-area-inset-top,0px) + 64px)}}
@media (max-height:520px){.pel-hit{width:94px;height:94px;font-size:var(--fs-lg)}.pel-drop{width:68px;height:68px}
  .pel-tip{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 48px);max-width:calc(calc(100vw / var(--z, 1)) - 240px);font-size:var(--fs-sm);padding:8px 12px}
  .pel-call{top:calc(env(safe-area-inset-top,0px) + 56px);padding:8px 16px}
  .pel-card{width:min(780px,100%);padding:16px 16px 12px}.pel-card h2{font-size:var(--fs-xl)}.pel-card .pel-sub{margin-bottom:8px}
  .pel-card ol{columns:2;column-gap:24px;font-size:var(--fs-sm);margin-bottom:8px}.pel-card li{break-inside:avoid;margin-bottom:4px}
  .pel-card .pel-ctrl{font-size:var(--fs-sm);padding:8px 8px;margin-bottom:8px}.pel-rv{padding:4px 8px;margin-bottom:8px;font-size:var(--fs-sm)}.pel-rv p{font-size:var(--fs-xs)}.pel-levels{margin-bottom:8px}.pel-levels button{padding:8px 8px}
  .pel-go{padding:8px 16px;font-size:var(--fs-md)}.pel-card .pel-big{font-size:var(--fs-3xl);margin:2px 0}.pel-card .pel-fact{margin:8px 0 8px;font-size:var(--fs-sm)}}
/* móvil en horizontal con poca altura: título y marcador en una línea, sin la etiqueta «Nivel» (el grupo la lleva como
   aria-label) y los niveles junto a los botones de jugar, para que todo quepa sin desplazar */
@media (orientation:landscape) and (max-height:440px){
  .pel-panel{padding-top:calc(env(safe-area-inset-top,0px) + 8px);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px)}
  .pel-card{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:12px;padding:8px 16px 12px;border-radius:18px}
  .pel-card>*{flex:1 1 100%}.pel-card>h2{flex:0 0 auto;margin-bottom:8px}.pel-card>.pel-sub{flex:1 1 0;min-width:0;margin-bottom:8px}
  .pel-card>.pel-lbl{display:none}
  .pel-card>.pel-levels{flex:3 1 0;min-width:0;margin:0;align-self:center;flex-wrap:nowrap}.pel-card>.pel-levels button{min-width:0;min-height:44px}
  .pel-card>.pel-levels+.pel-row{flex:2 1 0;min-width:0;align-self:center}.pel-card>.pel-levels+.pel-row .pel-go{min-height:44px}
  .pel-card>.pel-court{margin-bottom:8px}.pel-card>.pel-lv5 button{flex:1 1 auto;min-width:max-content;padding:4px 6px;font-size:var(--fs-xs);text-transform:none;letter-spacing:0}   /* (cada nivel entero: «Iniciación» no se parte; cada botón del ancho de su nombre) */
  .pel-card>.pel-mod{flex:1 1 100%;margin:0 0 8px}.pel-card>.pel-mod button{min-height:44px;padding:4px 8px}.pel-card>.pel-pairs{margin-bottom:8px;font-size:var(--fs-xs)}
  .pel-card.opts>.pel-sub{display:none}.pel-opts{display:contents}.pel-card.opts>h2{align-self:center;margin-bottom:8px}
  .pel-otabs{flex:1 1 0;min-width:0;margin-bottom:8px}.pel-opane{flex:1 1 100%}.pel-opane .pel-mod{margin-bottom:8px}.pel-opane .pel-mod button{min-height:44px;padding:4px 8px}.pel-opane .pel-pairs{margin:0 0 8px;font-size:var(--fs-xs)}
  .pel-balls{margin-bottom:8px}
  .pel-orow{margin-bottom:8px}.pel-orow .pel-switch{min-height:44px;padding:4px 12px}
  .pel-opane[data-pane="1"],.pel-opane[data-pane="2"]{max-height:calc(calc(100dvh / var(--z, 1)) - 156px);overflow:auto;overscroll-behavior:contain}
  .pel-opane ol{columns:2;column-gap:24px;margin-bottom:8px}.pel-opane .pel-ctrl{margin-bottom:8px}}
@media (hover:hover) and (pointer:fine){.pel-stick,.pel-stickhint{display:none}}
/* zona táctil de 44 px en las píldoras pequeñas (el dibujo no cambia) */
.pel-chip::before{content:'';position:absolute;inset:-8px -4px}
/* quién juega contra quién: una tarjeta por pelotari que abre su ficha (azules contra colorados) */
.pel-rv.pel-vs,.pel-rv.pel-vs.pel-rv2{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;padding:0;margin:0 0 12px;background:none;border:0}
.pel-team{display:flex;flex-direction:column;gap:8px;min-width:0}
.pel-vs-x{font:400 var(--fs-lg)/1 var(--pel-display,'MZ Display',Nunito,sans-serif);color:#ff7ac8;letter-spacing:.04em}
.pel-wide{display:block;width:100%;margin:0 0 12px}
/* el frontón: su dibujo, su nombre y lo que se nota al jugar en él (al tocarlo, qué pasa con cada cosa) */
.pel-court{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 12px;padding:4px 12px;border-radius:12px;border:1px solid rgba(255,122,200,.32);background:rgba(255,122,200,.08);color:#fff;font:inherit;text-align:left;cursor:pointer}
.pel-court svg{flex:none;width:48px;height:36px}.pel-court-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.pel-court-t b{font-size:var(--fs-sm);font-weight:900;line-height:1.3}.pel-court-t span{display:flex;flex-wrap:wrap;gap:4px}
.pel-court-t i{font-style:normal;font-size:var(--fs-xs);font-weight:800;line-height:1.3;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.1);color:#ff7ac8}
.pel-court-what{margin:-4px 0 12px;font-size:var(--fs-sm);line-height:1.45;color:#e6def7}.pel-court-what b{color:#ff7ac8}
/* «Más opciones»: plegado, con lo elegido a la vista */
/* «Más opciones»: un botón con lo elegido a la vista. Al tocarlo, el mismo panel pasa a la vista de opciones, en
   pestañas (Partido, Reglas, Controles), en vez de alargarse: quién juega y el frontón se apartan, y el nivel y los
   botones de jugar siguen abajo */
.pel-more{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin:0 0 8px;padding:0;border:0;background:none;color:#cbbcf0;font:inherit;font-size:var(--fs-sm);font-weight:900;text-transform:uppercase;letter-spacing:.04em;text-align:left;cursor:pointer}
.pel-more::before{content:'';flex:none;width:8px;height:8px;border:solid #ff7ac8;border-width:0 2px 2px 0;transform:rotate(-45deg);margin:0 4px 0 2px}
.pel-more .pel-sum{margin-left:auto;padding-left:12px;min-width:0;font-size:var(--fs-xs);font-weight:800;letter-spacing:0;text-transform:none;color:#ff7ac8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pel-card.opts>.pel-rv,.pel-card.opts>.pel-court,.pel-card.opts>.pel-court-what,.pel-card.opts>.pel-more{display:none}
.pel-opts[hidden],.pel-opane[hidden]{display:none}
.pel-otabs{display:flex;align-items:stretch;gap:4px;margin:0 0 12px;border-bottom:1px solid rgba(190,160,255,.25)}
.pel-otabs button{flex:1 1 0;min-width:0;min-height:44px;padding:0 8px;border:0;border-bottom:3px solid transparent;margin-bottom:-1px;background:none;color:#cbbcf0;font:800 var(--fs-sm)/1.2 var(--f-cond,Nunito),sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.pel-otabs button[aria-selected=true]{color:#fff;border-bottom-color:#ff2bd6}
.pel-otabs .pel-back{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 12px 0 4px;color:#ff7ac8;letter-spacing:.04em}
.pel-otabs .pel-back::before{content:'';width:8px;height:8px;border:solid currentColor;border-width:0 0 2px 2px;transform:rotate(45deg)}
.pel-opane{animation:pel-pane .18s ease both}@keyframes pel-pane{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.pel-opane ol{margin:0 0 12px}.pel-opane .pel-ctrl{margin:0 0 12px}
.pel-orow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;margin:0 0 12px}
.pel-orow .pel-ballwhat,.pel-orow .pel-switch{margin:0}.pel-orow .pel-ballwhat{grid-row:span 2}
.pel-lv5 button{min-width:0;font-size:var(--fs-sm)}
/* móvil muy estrecho de pie: los niveles bajan a otra fila en vez de pisarse, los nombres de quien juega van debajo de su
   círculo y «Volver al pueblo» parte en dos líneas */
@media (orientation:portrait) and (max-width:400px){.pel-lv5 button{flex:1 1 auto;min-width:max-content}}
@media (orientation:portrait) and (max-width:360px){.pel-vs .pfx-pl{flex-direction:column;text-align:center;padding:8px 4px}.pel-vs .pfx-pl-t b,.pel-vs .pfx-pl-t small{white-space:normal;overflow-wrap:anywhere}.pel-vs .pfx-pl-t b{font-size:var(--fs-sm)}.pel-row .pel-go{white-space:normal;font-size:var(--fs-lg);line-height:1.1}}
/* tu energía: grande, abajo en el centro (entre el joystick y los botones); verde, amarilla y roja al cansarte */
.pel-myen{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));transform:translateX(-50%);width:min(280px,calc(34vw / var(--z, 1)));display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none}
.pel-myen[hidden]{display:none}.pel-myen span{font:800 var(--fs-xs)/1.3 var(--f-cond,Nunito),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7)}
.pel-myen i{position:relative;display:block;width:100%;height:10px;border-radius:2px;background:rgba(7,2,15,.7);box-shadow:0 0 0 2px rgba(255,255,255,.7);overflow:hidden;transform:skewX(-20deg)}
.pel-myen i b{position:absolute;inset:0;transform-origin:left;border-radius:999px;background:linear-gradient(90deg,#7b2ff7,#c9b2ff);transition:transform .2s}
.pel-myen.mid i b{background:linear-gradient(90deg,#ff3dbd,#ff9bd8)}.pel-myen.low i b{background:linear-gradient(90deg,#ff2e88,#ff6fb5)}.pel-myen.low i{animation:pel-low .6s infinite alternate}
@keyframes pel-low{to{box-shadow:0 0 0 2px #ff5a3a}}
.pel-root.paneled .pel-myen{visibility:hidden}
@media (orientation:portrait){.pel-myen{bottom:calc(env(safe-area-inset-bottom,0px) + 196px);width:min(240px,calc(60vw / var(--z, 1)))}}
/* interruptores de «Más opciones» (la cámara dinámica) */
.pel-switch{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 12px;padding:8px 12px;border-radius:6px;border:1px solid rgba(190,160,255,.35);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer}
.pel-switch span{flex:1;display:flex;flex-direction:column;gap:2px}.pel-switch b{font-size:var(--fs-sm);font-weight:900;line-height:1.3}.pel-switch small{font-size:var(--fs-xs);font-weight:600;line-height:1.3;color:#d8cff0}
.pel-switch i{flex:none;position:relative;width:48px;height:28px;border-radius:999px;background:rgba(255,255,255,.18);transition:background .15s}
.pel-switch i::after{content:'';position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s}
.pel-switch[aria-checked=true] i{background:#ff2bd6}.pel-switch[aria-checked=true] i::after{transform:translateX(20px)}
/* la pelota: cinco botones con su bote dibujado y, debajo, lo que hace la elegida */
.pel-balls{display:grid;grid-template-columns:auto repeat(5,minmax(0,1fr));align-items:center;gap:4px}
.pel-balls>small{padding-right:8px;font-size:var(--fs-xs);font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em}
.pel-balls button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:58px;padding:4px 4px 8px;line-height:1.15;white-space:normal;text-align:center}
.pel-balls button span{font-size:var(--fs-xs);font-weight:800}
.pel-balls button[aria-pressed=true] svg{color:#fff}.pel-balls button svg{color:#c9b2ff}
.pel-ballwhat{margin:8px 0 12px;font-size:var(--fs-sm);line-height:1.45;color:#e7defa}
/* el momento justo: un aro que se cierra sobre el botón de golpe; cuando lo toca, suelta. Fucsia y brillante en el momento */
.pel-tring{position:absolute;inset:-4px;border-radius:50%;border:3px solid #fff;pointer-events:none;opacity:0;transform:scale(1.9);will-change:transform,opacity}
.pel-tring.on{opacity:.9}.pel-tring.now{border-color:#fff;box-shadow:0 0 0 4px #ff2bd6,0 0 22px #ff2bd6;opacity:1}
.pel-hit .pel-hl{position:relative;z-index:1}

/* ordenador (pantalla grande): las ventanas del partido más anchas y con la letra a su tamaño */
@media (min-width:1200px) and (min-height:560px){
  .pel-card{width:min(1000px,100%);padding:32px 40px 24px}.pel-card ol{columns:2;column-gap:40px}.pel-card li{break-inside:avoid}.pel-card h2{font-size:var(--fs-3xl)}.pel-card .pel-sub{font-size:var(--fs-md)}
  .pel-card li,.pel-card .pel-ctrl,.pel-rv,.pel-rv p,.pel-pairs{font-size:var(--fs-md)}.pel-go{min-height:56px}.pel-levels button{min-height:48px}
}
`;

/** Mete en la página los estilos del partido (una vez). La pasaka (src/game/pasaka3d.js) usa la misma interfaz. */
export function pelotaStyle() { if (!document.getElementById('pel-style')) { const st = document.createElement('style'); st.id = 'pel-style'; st.textContent = CSS; document.head.appendChild(st); } }
// la X de salir, con el icono 3D de cerrar de la familia (src/assets/icons3d); si faltara, el trazo blanco
export const X_ICON = icon3DReady('close') ? `<img class="pel-xi" src="${icon3DReady('close')}" alt="" aria-hidden="true">` : '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

export class PelotaHud {
  constructor(container, txt, names, touch, cols = { you: 'azul', rival: 'rojo' }) {
    this.txt = txt; this.touch = touch;
    pelotaStyle();
    const r = this.root = document.createElement('div'); r.className = 'pel-root';
    r.innerHTML = `
      <button class="pel-exit" aria-label="${txt.exit}">${X_ICON}</button>
      <div class="pel-top"><div class="pel-score">
        <div class="pel-side ${cols.you === 'rojo' ? 'pel-red' : 'pel-blue'}" data-side="you"><i class="pel-serve" data-pel-s="you"></i><span>${esc(short(names.you))}</span><b data-pel-n="you">0</b></div>
        <div class="pel-mid" data-pel-mid></div>
        <div class="pel-side ${cols.rival === 'azul' ? 'pel-blue' : 'pel-red'}" data-side="rival"><b data-pel-n="rival">0</b><span>${esc(short(names.rival))}</span><i class="pel-serve" data-pel-s="rival"></i></div>
      </div></div>
      <div class="pel-call"><h3></h3><p></p><div class="pel-kantari"></div></div>
      <div class="pel-q"></div>
      <div class="pel-tip"></div>
      <div class="pel-stick"><div class="pel-knob"><i></i></div></div>
      ${touch ? '<div class="pel-stickhint"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M24 6l6 7h-4v8h8v-4l7 7-7 7v-4h-8v8h4l-6 7-6-7h4v-8h-8v4l-7-7 7-7v4h8v-8h-4z" fill="#fff" opacity=".9"/></svg></div>' : ''}
      <div class="pel-btns"><div class="pel-bcol"><button class="pel-btn pel-drop pel-cut" data-k="cut" aria-label="${txt.cut}"><span>${txt.cut}</span></button><button class="pel-btn pel-drop pel-dejada" data-k="drop" aria-label="${txt.drop}"><span>${txt.drop}</span></button></div><button class="pel-btn pel-hit" aria-label="${txt.hit}"><span class="pel-hl">${txt.hit}</span>${touch ? '' : `<small class="pel-hk">${txt.hitKey || ''}</small>`}<i class="pel-tring" aria-hidden="true"></i></button></div>`;
    container.appendChild(r);
    this.$ = (s) => r.querySelector(s);
    fitCircles(r.querySelector('.pel-btns')); this.onFit = () => fitCircles(r.querySelector('.pel-btns')); addEventListener('resize', this.onFit);
    this.callT = 0; this.qT = 0;
  }
  // energía: filas { id, name, en (0 a 1), side ('you'|'rival'), me, color }; null la esconde. La tuya, grande abajo en el
  // centro, que se lee de un vistazo; la de los demás, una raya en el marcador, en su lado (por parejas, dos)
  energy(rows) {
    if (!rows) { for (const b of this.root.querySelectorAll('.pel-sen')) b.hidden = true; if (this.myEn) this.myEn.hidden = true; return; }
    if (!this.myEn) { const m = this.myEn = document.createElement('div'); m.className = 'pel-myen you'; m.dataset.en = 'you'; m.innerHTML = `<span>${esc(this.txt.energy || 'Energía')}</span><i><b></b></i>`; this.root.appendChild(m); }
    this.myEn.hidden = !rows.some(r => r.me);
    const key = rows.map(r => r.id + r.side).join();
    if (this.enKey !== key) {
      this.enKey = key; for (const b of this.root.querySelectorAll('.pel-sen')) b.remove();
      // (por parejas, dos rayas en el mismo lado: arriba la del primer nombre del marcador y debajo la de su compañero)
      const n = {}, k = {}; for (const r of rows) if (!r.me) n[r.side] = (n[r.side] || 0) + 1;
      for (const r of rows) {
        if (r.me) continue;
        const side = this.root.querySelector(`.pel-side[data-side="${r.side}"]`); if (!side) continue;
        const e = document.createElement('i'); e.className = 'pel-sen'; e.dataset.en = r.id; e.title = `${this.txt.energy || 'Energía'}: ${short(r.name)}`;
        k[r.side] = (k[r.side] || 0) + 1; e.style.setProperty('--k', n[r.side] - k[r.side]); e.innerHTML = '<b></b>'; side.appendChild(e);
      }
    }
    for (const r of rows) {
      const row = r.me ? this.myEn : this.root.querySelector(`.pel-sen[data-en="${r.id}"]`); if (!row) continue;
      row.hidden = false;
      const v = Math.round(r.en * 50) / 50; if (row._v === v) continue; row._v = v;
      row.querySelector('b').style.transform = `scaleX(${v})`;
      row.classList.toggle('mid', v < 0.5 && v >= 0.25); row.classList.toggle('low', v < 0.25);
    }
  }
  setNames(you, rival) { const a = this.root.querySelector('[data-side=you] span'), b = this.root.querySelector('[data-side=rival] span'); if (a) a.textContent = short(you); if (b) b.textContent = short(rival); }
  setScore(you, rival, server, mid) {
    this.$('[data-pel-n=you]').textContent = you; this.$('[data-pel-n=rival]').textContent = rival;
    for (const el of this.root.querySelectorAll('.pel-serve')) el.classList.toggle('on', el.dataset.pelS === server);
    if (mid != null) this.$('[data-pel-mid]').textContent = mid;
  }
  call(title, sub, kant, secs = 2) {
    const c = this.$('.pel-call'); c.querySelector('h3').textContent = title; c.querySelector('p').textContent = sub || '';
    c.querySelector('p').style.display = sub ? '' : 'none';
    const k = c.querySelector('.pel-kantari'); k.textContent = kant ? `«${kant}»` : ''; k.style.display = kant ? '' : 'none';
    c.classList.add('on'); this.callT = secs; this.root.classList.add('calling');
  }
  /** El aviso del golpe: text (lo grande), sub (el golpe y la fuerza) y kind (perfect, good, ok, late, whiff: su color) */
  quality(text, sub = '', kind = '') {
    const q = this.$('.pel-q'); q.className = 'pel-q' + (kind ? ' k-' + kind : '');
    q.innerHTML = text ? `<b>${esc(text)}</b><small>${esc(sub)}</small>` : '';
    void q.offsetWidth; q.classList.toggle('on', !!text); this.qT = kind ? 1 : 0.8;   // (se vuelve a poner para que rebote cada vez)
  }
  // (lo último escrito va en el propio elemento, _t: en euskera, el texto que se lee ya está traducido y no coincidiría)
  tip(text) { const t = this.$('.pel-tip'), v = text || ''; if (t._t !== v) { t._t = v; t.textContent = v; } t.classList.toggle('on', !!text); }
  ready(on) { this.$('.pel-hit').classList.toggle('ready', !!on); }
  /** El aro del momento justo: t, segundos hasta el momento de soltar el golpe (null, sin aro). Llega al botón a tiempo */
  timing(t) {
    const r = this._tr ||= this.$('.pel-tring'); if (!r) return;
    const on = t != null && t > -0.12 && t < 0.9, k = on ? Math.max(0, Math.min(1, (t - 0.03) / 0.75)) : 1, v = on ? Math.round((1 + k * 0.95) * 100) / 100 : 0;
    if (r._v === v) return; r._v = v;
    r.classList.toggle('on', on); r.classList.toggle('now', on && Math.abs(t - 0.03) < 0.07);
    if (on) r.style.transform = `scale(${v})`;
  }
  /** El nombre del golpe que saldría ahora (GOLPE, VOLEA o GANCHO) */
  hitLabel(text) { const l = this._hl ||= this.$('.pel-hl'); if (l && l._t !== text) { l._t = text; l.textContent = text; fitCircle(l.parentElement); } }
  // anillo de carga alrededor del botón que se mantiene (golpe o cortada)
  charge(p, kind) {
    for (const [k, sel] of [['hit', '.pel-hit'], ['cut', '.pel-cut'], ['drop', '.pel-dejada']]) {
      const b = this.$(sel); if (!b) continue;
      const v = kind === k ? p : 0; if (b._cp === v) continue; b._cp = v;
      b.style.setProperty('--cp', (v * 100).toFixed(0) + '%'); b.classList.toggle('charging', v > 0); b.classList.toggle('full', v >= 1);
    }
    // rótulo de la fuerza encima de los botones mientras se carga: se lee de un vistazo cuánto vas a pegar
    let f = this.$('.pel-force');
    if (!f) { f = document.createElement('div'); f.className = 'pel-force'; f.innerHTML = '<b></b><i><u></u></i>'; this.root.appendChild(f); }
    const on = !!kind && p > 0; f.classList.toggle('on', on);
    if (on) {
      // (en el golpe, una raya en la barra marca desde dónde, con el joystick arriba, llega al rebote)
      const pw = 0.15 + p * 0.85, word = kind === 'drop' ? (pw < 0.45 ? 'muy corta' : pw < 0.75 ? 'corta' : 'algo más larga') : pw < 0.4 ? 'suave' : pw < 0.75 ? 'media' : pw < 0.97 ? 'fuerte' : 'a tope';
      f.classList.toggle('hit', kind === 'hit'); f.classList.toggle('reb', kind === 'hit' && pw >= 0.88);
      const name = kind === 'cut' ? 'Cortada' : kind === 'drop' ? 'Dejada' : 'Golpe';
      const fb = f.firstChild, ft = `${name}: ${word} · ${Math.round(pw * 100)} %`; if (fb._t !== ft) { fb._t = ft; fb.textContent = ft; }   // (solo si cambia)
      f.querySelector('u').style.width = (pw * 100).toFixed(0) + '%'; f.style.setProperty('--fc', `hsl(${Math.round(120 - pw * 120)} 85% 55%)`);
    }
  }
  tick(dt) {
    if (this.callT > 0 && (this.callT -= dt) <= 0) { this.$('.pel-call').classList.remove('on'); this.root.classList.remove('calling'); }
    if (this.qT > 0 && (this.qT -= dt) <= 0) this.$('.pel-q').classList.remove('on');
  }
  panel(html) {
    this.onPanel?.();   // (al salir un aviso encima, el joystick se suelta)
    this.closePanel();
    const p = document.createElement('div'); p.className = 'pel-panel'; p.innerHTML = `<div class="pel-card">${html}</div>`;
    this.root.appendChild(p); this.panelEl = p; this.root.classList.add('paneled'); return p;
  }
  // (se desvanece mientras entra lo siguiente, el VS o el saque: antes se quitaba de golpe y asomaba un momento la cancha)
  closePanel() { const p = this.panelEl; if (p) { this.panelEl = null; p.classList.add('pel-fuera'); setTimeout(() => p.remove(), 220); } this.root.classList.remove('paneled'); }
  controls(on) { for (const s of ['.pel-stick', '.pel-btns', '.pel-stickhint']) { const e = this.$(s); if (e) e.style.visibility = on ? '' : 'hidden'; } }
  // (se desvanece con lo que tuviera delante, el aviso de salir o el resultado, mientras entra lo siguiente)
  destroy() { removeEventListener('resize', this.onFit); const r = this.root; r.classList.add('pel-fuera'); setTimeout(() => r.remove(), 320); }
}
// el nombre sin su pueblo entre paréntesis («Jokin (Altsasu)» → «Jokin»): en el marcador y en la energía, que son
// estrechos (el pueblo ya sale en la pantalla VS y en el frontón)
const short = (n) => String(n).replace(/\s*\([^)]*\)/g, '');
