// Interfaz del partido (DOM): marcador, avisos del juez y del kantari, consejos, joystick y botones.
// Todo lleva el prefijo «pel-» y se coloca sin solaparse en móvil (vertical y horizontal) y escritorio.
import { fitCircle, fitCircles } from '../ui/fitlabel.js';
import { icon3DReady } from '../ui/icon3d.js';
import { esc } from '../util/html.js';
import { tap } from '../util/tap.js';
import { bolaSVG } from './bola.js';
import { pzCabecera, pzFila, PZ_ICO } from '../ui/pausa.js';
export { esc };
const CSS = `
.pel-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:var(--pel-font,'MZ Texto',sans-serif);color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.pel-root.vuelo>*{visibility:hidden!important}
/* (en la salida de los pelotaris a la cancha, solo su rótulo: match.js saleEntrada) */
.pel-root.sale>*:not(.pel-call){visibility:hidden!important}
/* (el aviso del tanto sigue a la vista durante la repetición, su tiempo entero: la repetición empieza a los 1,15 s y antes
   lo escondía, por eso desaparecía tan deprisa) */
.pel-root.repe :is(.pel-stick,.pel-btns,.pel-stickhint,.pel-tip,.pel-q,.pel-exit){visibility:hidden}
/* la repetición: el rótulo arriba a la izquierda, a la misma altura que el marcador (arriba a la derecha) y con su
   misma forma: igual de alto, el mismo fondo y la misma raya de color arriba; con su punto rojo que late y, en cámara
   lenta, su aviso. Debajo, cómo saltarla. Si no caben los dos en la misma fila, baja justo debajo del marcador
   (match.js, colocaRep). Antes iba centrado y, con el marcador largo, se montaba encima del nombre */
.pel-rep{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none;animation:pel-repin .45s cubic-bezier(.2,1.3,.4,1) both}
.pel-rep-b{display:flex;align-items:center;gap:8px;height:30px;padding:0 16px 0 12px;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);border-radius:6px;}
.pel-rep-b i{flex:none;width:8px;height:8px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 8px #ff3b5c;animation:pel-rec 1s ease-in-out infinite}
.pel-rep-b b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.pel-rep-b .sl{display:none;font:800 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;color:#ffd6f6;padding:4px 8px;border-radius:999px;background:rgba(255,43,214,.35)}
.pel-rep.slow .sl{display:inline-block;animation:pel-repin .3s ease-out both}
.pel-rep-b .pv{font:800 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;color:#fff;padding:4px 8px;border-radius:999px;background:rgba(157,140,255,.38);max-width:24ch;overflow:hidden;text-overflow:ellipsis}
.pel-rep small{font:700 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8dcff;text-shadow:0 1px 3px #000;padding:3px 12px;border-radius:999px;background:rgba(7,2,15,.55)}
@keyframes pel-repin{from{opacity:0;transform:translateX(-24px)}}@keyframes pel-rec{50%{opacity:.25}}
/* el sorteo del saque. La chapa, en 3D en la cancha (chapa.js), con el centro despejado para verla: arriba el título
   entre dos rayas de color y por qué viste cada uno de su color; abajo, a cada lado, la tarjeta de cada pelotari con su
   figura, el cristal morado y el filo de su color, como las cartas del juego; en medio, el botón y, al caer, quién saca.
   Sin la cancha, la chapa plana de antes, en medio */
.pel-toss{position:absolute;inset:0;z-index:5;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 16px) calc(env(safe-area-inset-right,0px) + 20px) calc(env(safe-area-inset-bottom,0px) + 16px) calc(env(safe-area-inset-left,0px) + 20px);pointer-events:auto;
  background:radial-gradient(ellipse at 50% 46%,rgba(7,2,15,0) 30%,rgba(7,2,15,.55) 100%),linear-gradient(180deg,rgba(7,2,15,.8) 0%,rgba(7,2,15,0) 26%,rgba(7,2,15,0) 58%,rgba(7,2,15,.82) 100%);animation:pel-tossbg .3s ease-out both}
.pel-toss:not(.tres){background:radial-gradient(ellipse at 50% 45%,rgba(40,14,92,.78),rgba(7,2,15,.92))}
.pel-toss.directo{animation:none}
.pel-root:has(>.pel-toss)>:not(.pel-toss){visibility:hidden}
.pel-toss.out{animation:pel-tossout .32s ease-in both}
/* (la pelota en casa, antes de empezar: la cámara te detecta el cuerpo. La ventana de la cámara va arriba en el centro,
   camaraCuerpo.js, .pcam.cal; aquí, el fondo, lo que falta y la barra que se llena) */
.pel-cal{position:absolute;inset:0;z-index:6;display:flex;align-items:flex-end;justify-content:center;padding:0 16px calc(env(safe-area-inset-bottom,0px) + 14px);background:radial-gradient(ellipse at 50% 40%,rgba(40,14,92,.72),rgba(7,2,15,.94));pointer-events:auto;transition:opacity .25s}
.pel-cal.fuera{opacity:0;pointer-events:none}
.pel-cal-in{display:flex;flex-direction:column;align-items:center;gap:8px;width:min(480px,92vw);text-align:center}
.pel-cal-in small{font:700 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#ff7ac8}
.pel-cal-msg{margin:0;font:400 var(--fs-xl)/1.1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;color:#fff;text-shadow:0 2px 10px rgba(7,2,15,.8)}
.pel-cal-bar{width:100%;height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden}
.pel-cal-bar i{display:block;height:100%;width:0;border-radius:6px;background:#ffd166;transition:width .12s linear}
.pel-cal-ya{border:0;border-radius:999px;padding:8px 18px;background:rgba(255,255,255,.12);color:#fff;font:700 var(--fs-sm)/1 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;box-shadow:none}
.pel-toss-top{grid-column:1/-1;grid-row:1;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.pel-toss-k{display:flex;align-items:center;gap:14px;font:400 var(--fs-2xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;text-shadow:0 2px 12px rgba(7,2,15,.8);animation:pel-kin .6s ease-out both}
.pel-toss-k i{display:block;width:clamp(28px,8vw,72px);height:4px;border-radius:2px;background:linear-gradient(90deg,transparent,#5b4bff)}.pel-toss-k i:last-child{background:linear-gradient(90deg,#ff2e88,transparent)}
.pel-toss-why{margin:0;font:700 var(--fs-sm)/1.3 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8dcff;text-shadow:0 1px 6px rgba(7,2,15,.9)}
/* las cartas de los dos pelotaris (las de la presentación, match.js cartaDe), a cada lado de la chapa, del alto que quepa
   bajo el título, y debajo su color y sus temporadas. La que saca se levanta; la otra se apaga */
.pel-toss{--tw:clamp(104px,min(calc((100dvh - 172px) / 1.48),26vw),210px)}
.pel-toss-p{--pc:#5b4bff;grid-row:2/4;align-self:center;justify-self:center;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;
  transition:transform .35s cubic-bezier(.2,1.4,.4,1),filter .35s,opacity .35s}
.pel-toss-p .gx-card{--w:var(--tw)!important;pointer-events:none}
.pel-toss-p>small{font:700 var(--fs-xs)/1.25 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;color:color-mix(in srgb,var(--pc) 45%,#fff);text-shadow:0 1px 6px rgba(7,2,15,.9)}
.pel-toss-p.azul{grid-column:1;animation:pel-tl .45s ease-out both}
.pel-toss-p.rojo{--pc:#ff2e88;grid-column:3;animation:pel-tr .45s ease-out both}
.pel-toss-p.gana{transform:translateY(-6px) scale(1.06)}
.pel-toss-p.pierde{opacity:.55;filter:saturate(.5)}
/* en medio, abajo: el botón y quién saca */
.pel-toss-mid{grid-column:2;grid-row:2/4;align-self:end;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0;text-align:center}
.pel-toss.aire .pel-toss-go{opacity:0;pointer-events:none;transform:scale(.9);transition:opacity .2s,transform .2s}
.pel-toss-go{animation:pel-kin .5s .35s ease-out both}
.pel-toss-res{margin:0;min-height:1.1em;font:400 var(--fs-3xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}
.pel-toss-res.azul{color:#c4bcff;text-shadow:0 0 18px rgba(91,75,255,.95),0 2px 6px rgba(7,2,15,.9);animation:pel-res .4s ease-out both}.pel-toss-res.rojo{color:#ffb0d6;text-shadow:0 0 18px rgba(255,46,136,.95),0 2px 6px rgba(7,2,15,.9);animation:pel-res .4s ease-out both}
/* la chapa plana de antes, solo si no hay cancha */
.pel-toss-coin{position:relative;width:104px;height:150px;perspective:600px;display:flex;align-items:flex-end;justify-content:center}
.pel-toss-coin .coin{position:relative;width:84px;height:84px;margin-bottom:22px;transform-style:preserve-3d;transform:rotateX(70deg)}
.pel-toss-coin .f{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:inset 0 0 0 5px rgba(255,255,255,.4),inset 0 0 0 9px rgba(0,0,0,.15)}
.pel-toss-coin .f.azul{background:radial-gradient(circle at 35% 30%,#a59cff,#5b4bff 48%,#2a1a9e)}
.pel-toss-coin .f.rojo{transform:rotateX(180deg);background:radial-gradient(circle at 35% 30%,#ff9cc8,#ff2e88 48%,#9e0f52)}
.pel-toss-coin .sh{position:absolute;bottom:8px;left:50%;width:70px;height:12px;margin-left:-35px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(3px)}
.pel-toss.aire .coin{animation:pel-flip 1.45s cubic-bezier(.25,.6,.35,1) both}.pel-toss.aire .sh{animation:pel-flipsh 1.45s cubic-bezier(.25,.6,.35,1) both}
.pel-toss.cae .coin{animation:pel-flip 1.45s cubic-bezier(.25,.6,.35,1) both,pel-land .35s 1.45s ease-out}
@keyframes pel-flip{0%{transform:translateY(0) rotateX(70deg)}50%{transform:translateY(-96px) rotateX(990deg)}100%{transform:translateY(0) rotateX(calc(1870deg + var(--fin,0deg)))}}
@keyframes pel-flipsh{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.45);opacity:.4}}
@keyframes pel-land{30%{translate:0 -10px}}
.pel-root.pel-fuera{animation:pel-fuera .3s ease-in both}.pel-panel.pel-fuera{animation:pel-fuera .2s ease-in both;pointer-events:none}.pel-root.pel-fuera *{pointer-events:none!important}@keyframes pel-fuera{to{opacity:0}}
@keyframes pel-tossbg{from{opacity:0}}@keyframes pel-tossout{to{opacity:0;transform:scale(1.04)}}
@keyframes pel-tl{from{opacity:0;transform:translateX(-40px)}}@keyframes pel-tr{from{opacity:0;transform:translateX(40px)}}
@keyframes pel-kin{from{opacity:0}}@keyframes pel-res{from{opacity:0;transform:scale(.92)}}   /* (sin letras que se separan ni rebotes: el autor no quiere animaciones llamativas en el partido, noviembre de 2026) */
/* tumbado y bajo: todo un paso más pequeño; de pie, las cartas abajo, una al lado de otra, y el botón encima */
@media (max-height:500px){.pel-toss-k{font-size:var(--fs-xl)}.pel-toss-res{font-size:var(--fs-2xl)}}
@media (orientation:portrait){.pel-toss{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto auto}
  .pel-toss{--tw:clamp(104px,40vw,190px)}.pel-toss-mid{grid-column:1/-1;grid-row:3}.pel-toss-p{grid-row:4}.pel-toss-p.azul{grid-column:1}.pel-toss-p.rojo{grid-column:2}
  .pel-toss-res{white-space:normal}}
@media (prefers-reduced-motion:reduce){.pel-toss-p,.pel-toss-k,.pel-toss-go,.pel-toss-res{animation:none!important}}
@media (prefers-reduced-motion:reduce){.pel-toss *,.pel-rep *{animation-duration:.01s!important}}
.pel-root *{box-sizing:border-box}
.pel-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));right:calc(env(safe-area-inset-right,0px) + var(--edge,16px));display:flex;justify-content:flex-end}
.pel-exit{padding:0;position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.82);background:rgba(14,10,24,.66);box-shadow:0 3px 12px rgba(0,0,0,.35);color:#fff;pointer-events:auto;cursor:pointer;display:grid;place-items:center}.pel-exit svg{width:20px;height:20px;display:block}.pel-exit .pel-xi{width:22px;height:22px;display:block;pointer-events:none}
.pel-score{display:flex;align-items:stretch;gap:8px;opacity:.95;overflow:hidden;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:100%;border-radius:6px;}
/* cada lado: arriba su nombre y sus tantos, en su color; debajo, en el fondo oscuro, su fuerza y su energía, cada una con
   su nombre y su color, con aire entre las tres cosas: la fuerza en rosa y la energía en dorado, que se vuelve naranja y
   luego roja al cansarse (antes, una sola raya blanca pegada al nombre) */
.pel-side{display:grid;grid-template-rows:auto auto;width:var(--psw,176px);min-width:0}
.ps-cab{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;min-width:0}
.pel-side b{font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-lg);font-weight:400;line-height:1;min-width:1em;text-align:center}
.pel-side span{flex:1;min-width:0;font:800 var(--fs-sm)/1 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.04em;text-transform:uppercase;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pel-side[data-side=rival] span{text-align:right}
.pel-side.pel-red .ps-cab{background:linear-gradient(180deg,#f22c84,#c01a6c)}.pel-side.pel-blue .ps-cab{background:linear-gradient(180deg,#5546f2,#3b2bc4)}
/* (delante de la barra, un rayo del color de la barra, para que se sepa que es la energía: en el borde de fuera de cada
   lado, como en espejo, donde empieza a llenarse) */
.ps-barras{display:flex;align-items:center;gap:8px;padding:10px}.ps-barras:empty{display:none}.pel-side[data-side=rival] .ps-barras{flex-direction:row-reverse}
.ps-barras .ps-barra{flex:1;min-width:0}.ps-ico{flex:none;display:block;width:14px;height:14px;color:#ffc94a;filter:drop-shadow(0 0 4px color-mix(in srgb,currentColor 45%,transparent))}
.ps-barras:has(.mid) .ps-ico{color:#ff8a3d}.ps-barras:has(.low) .ps-ico{color:#ff4d6d}
.ps-barra{position:relative;display:block;height:8px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
.ps-barra u{position:absolute;inset:0;transform-origin:left;border-radius:inherit;background:#ffc94a;transition:transform .2s}.pel-side[data-side=rival] .ps-barra u{transform-origin:right}
.ps-barra.mid u{background:#ff8a3d}.ps-barra.low u{background:#ff4d6d;animation:pel-sen .5s ease-in-out infinite alternate}@keyframes pel-sen{to{opacity:.3}}
.pel-mid{display:grid;place-items:center;padding:0 12px;font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Texto'),sans-serif;color:var(--lila,#c9b2ff);text-transform:uppercase;letter-spacing:.1em;text-align:center;max-width:7em}
/* (lo que ocupa: en el móvil y la tableta, sin el «A 5 tantos» y con los lados más estrechos, para que no tape el frontis,
   que va en el centro de la pantalla, entre el 43 % y el 57 % del ancho; en el ordenador ancho, entero) */
.pel-root{--psw:132px}.pel-mid{display:none}
@media (min-width:1240px){.pel-root{--psw:180px}.pel-mid{display:grid}}
.pel-serve{width:7px;height:7px;border-radius:50%;background:#fff6d8;box-shadow:0 0 0 2px rgba(0,0,0,.25);visibility:hidden;flex:none}
.pel-serve.on{visibility:visible}
/* el marcador de retransmisión: al sumar, la cifra salta y se enciende en dorado y su lado se ilumina un momento; con
   tres tantos seguidos o más, la racha al lado de la cifra mientras dure: solo la llama (el número va en el aviso del
   tanto), para no quitarle sitio al nombre */
.pel-side b.sube{animation:pelSube .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes pelSube{0%{transform:scale(1.9);color:#ffd166;text-shadow:0 0 14px rgba(255,209,102,.9)}60%{color:#ffd166}100%{transform:none}}
.pel-side.gana .ps-cab{animation:pelGana .9s ease-out}
@keyframes pelGana{0%{filter:brightness(1.9) saturate(1.2)}100%{filter:none}}
.ps-racha{display:none;flex:none;place-items:center;width:18px;height:18px;margin:0 -2px;border-radius:50%;background:rgba(7,2,15,.55);color:#ffd166}
.ps-racha.on{display:inline-grid;animation:pelRachaM .45s cubic-bezier(.2,1.6,.4,1)}.ps-racha svg{width:12px;height:12px}
@keyframes pelRachaM{from{transform:scale(.4);opacity:0}}
@media (prefers-reduced-motion:reduce){.pel-side b.sube,.pel-side.gana .ps-cab,.ps-racha.on,.pel-racha{animation:none}}
.pel-call{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 72px);transform:translateX(-50%) scale(.9);opacity:0;transition:opacity .18s,transform .18s;text-align:center;max-width:min(calc(92vw / var(--z, 1)),520px);padding:16px 24px;border-radius:18px;background:linear-gradient(180deg,rgba(50,19,111,.94),rgba(28,11,58,.94));border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.pel-call.on{opacity:1;transform:translateX(-50%) scale(1)}
/* (entra y sale con un fundido corto y sin más: las letras que caían, botaban o volaban, la pelota que cruzaba el rótulo
   de los dos botes, el temblor de la chapa y los saltos de los botones al empezar cada saque no le gustaron nada al
   autor, noviembre de 2026. Algo más lento que antes, 0,18 s, porque iba muy deprisa) */
.pel-call{transition:opacity .3s ease,transform .3s ease}
/* (el aviso del tanto, con una raya arriba del color de quien lo gana y, si toca, la racha: tantos seguidos, iguala,
   remontada) */
.pel-call.c-azul{box-shadow:inset 0 3px 0 #6b5bff,0 14px 40px rgba(0,0,0,.4)}.pel-call.c-rojo{box-shadow:inset 0 3px 0 #ff2e88,0 14px 40px rgba(0,0,0,.4)}
.pel-racha{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;margin-top:var(--r-pp,12px);padding:4px 14px;border-radius:999px;background:var(--rc,linear-gradient(100deg,#ff2bd6,#7b2ff7));font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff;box-shadow:0 0 14px rgba(255,122,200,.45);animation:pelRacha .5s .15s cubic-bezier(.2,1.6,.4,1) both}
.pel-racha svg{width:16px;height:16px;flex:none;color:#ffd166}
.pel-call.c-azul .pel-racha{--rc:linear-gradient(100deg,#6b5bff,#3b2bc4)}.pel-call.c-rojo .pel-racha{--rc:linear-gradient(100deg,#ff2e88,#c01a6c)}
@keyframes pelRacha{from{opacity:0;transform:translateY(8px) scale(.8)}}
.pel-root.final .pel-call{background:var(--cta,linear-gradient(100deg,#ff2bd6,#7b2ff7));border-color:#ffc2ec;color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.45);animation:pelFinal .6s cubic-bezier(.2,1.6,.4,1)}
.pel-root.final .pel-call :is(.pel-kantari,p){color:#fff}
@keyframes pelFinal{0%{transform:translateX(-50%) scale(.5)}100%{transform:translateX(-50%) scale(1)}}
.pel-call h3{margin:0;font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-hero);line-height:1;letter-spacing:0}
/* (el título y debajo, separado y en segundo plano, quién: más pequeño, más fino y en lila; antes iba pegado al título,
   blanco y casi del mismo peso, y la «p» del título rozaba la línea de debajo) */
.pel-call p{margin:var(--r-pp,12px) 0 0;font-size:var(--fs-sm);font-weight:600;line-height:1.3;color:#d9ccff}.pel-call :is(h3,p,.pel-kantari){text-box:trim-both cap alphabetic}
.pel-call .pel-kantari{margin-top:var(--r-pp,12px);font-size:var(--fs-md);font-weight:800;color:#ff7ac8}
.pel-golpe{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px) + var(--pg-y,50px));right:calc(env(safe-area-inset-right,0px) + var(--edge,16px) + var(--pg-x,52px));padding:5px 14px 5px 12px;font:800 var(--fs-sm)/1.1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);letter-spacing:.04em;text-transform:uppercase;color:#fff;background:rgba(7,2,15,.88);border-left:4px solid #e8247c;border-radius:6px;opacity:0;transform:translateX(24px);transition:opacity .16s,transform .22s cubic-bezier(.22,1.12,.36,1);pointer-events:none;white-space:nowrap}
.pel-golpe.azul{border-left-color:#4b3cff}.pel-golpe.on{opacity:1;transform:none}
/* la tarjeta del rival: bajo el marcador, del color que viste; la barra de energía grande y, encima de ella, la fuerza de
   su último golpe, que se llena y se apaga */
.pel-root.repe .pel-golpe,.pel-root.paneled .pel-golpe{visibility:hidden}
.pel-q{position:absolute;left:50%;top:40%;display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;transform:translate(-50%,-50%);font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-2xl);text-shadow:0 3px 10px rgba(0,0,0,.45);opacity:0;transition:opacity .15s;pointer-events:none}
.pel-q.on{opacity:1}
/* el aviso de cada golpe, como en los juegos de deportes: grande, en medio, con rebote, y su color según cómo le has
   dado (como era antes del aviso breve, que al autor le gustaba más) */
.pel-q b{font:400 var(--fs-4xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:0;color:#fff;filter:drop-shadow(0 4px 0 rgba(7,2,15,.6))}
.pel-q.on b{animation:pel-qpop .45s cubic-bezier(.2,1.7,.4,1) both}
.pel-q small{font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:2px 8px;background:rgba(7,2,15,.72);border-radius:6px;}
.pel-q small:empty{display:none}
.pel-q.k-perfect b{background:linear-gradient(180deg,#fff 30%,#ff7ac8 60%,#ff2bd6);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(255,43,214,.9)) drop-shadow(0 4px 0 rgba(7,2,15,.6))}
.pel-q.k-good b{color:#c9b2ff}.pel-q.k-early b,.pel-q.k-late b,.pel-q.k-whiff b{color:#ff6fb5;animation:pel-qfuera .3s ease both}
@keyframes pel-qpop{from{transform:scale(2.2) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
@keyframes pel-qfuera{from{transform:scale(1.25);opacity:0}to{transform:none;opacity:1}}
.pel-tip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 16px + var(--pel-tip-sube,0px));width:max-content;max-width:min(560px,calc(calc(100vw / var(--z, 1)) - 330px));padding:8px 16px;border-radius:14px;background:rgba(28,11,58,.86);border:1px solid rgba(255,255,255,.08);font-size:var(--fs-md);font-weight:700;line-height:1.3;text-align:center;opacity:0;transition:opacity .2s}
/* (con tu energía abajo en el centro, el consejo, encima de ella) */
.pel-tip.on{opacity:1}
.pel-stick{position:absolute;left:0;bottom:0;width:calc(46vw / var(--z, 1));height:calc(62dvh / var(--z, 1));pointer-events:auto;touch-action:none}
.pel-knob{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(28,11,58,.3);display:none}
.pel-knob i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.85)}
.pel-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));width:120px;height:120px;border-radius:50%;border:3px dashed rgba(255,255,255,.55);display:grid;place-items:center;font-size:var(--fs-xs);font-weight:700;text-align:center;opacity:.8;padding:8px}
.pel-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));display:flex;align-items:flex-end;gap:12px;pointer-events:auto}
/* (botones lisos, sin canto ni sombra: la cara con un degradado suave y, al pulsar, se encogen un poco. Antes llevaban un
   canto semitransparente debajo que parecía una sombra mal puesta) */
.pel-btn{padding:0;border:0;border-radius:50%;color:#2a0638;font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-weight:800;line-height:1.15;display:grid;place-items:center;cursor:pointer;touch-action:none;box-shadow:none;transition:transform .08s,filter .08s}
.pel-btn:active,.pel-btn.down{transform:scale(.94);filter:brightness(.92)}
.pel-hit{width:112px;height:112px;font-size:var(--fs-xl);color:#fff;text-shadow:0 1px 0 rgba(74,10,94,.45);background:linear-gradient(180deg,#ff7fdc 0%,#f43ad6 100%)}
.pel-hit.ready{animation:pel-pulse .5s infinite alternate}
@keyframes pel-pulse{from{box-shadow:0 0 0 0 rgba(255,220,80,.7)}to{box-shadow:0 0 0 14px rgba(255,220,80,0)}}
/* (cortada y dejada, con la misma letra: antes la cortada iba un tamaño más pequeña) */
.pel-drop{width:80px;height:80px;font-size:var(--fs-sm);line-height:1;padding:0 4px;text-align:center;color:#fff;text-shadow:0 1px 0 rgba(15,5,30,.45);border:0;background:linear-gradient(180deg,#6440b8 0%,#432189 100%)}
.pel-bcol{display:flex;flex-direction:column;align-items:center;gap:10px}
.pel-cut{background:linear-gradient(180deg,#ff5fae 0%,#d93088 100%)}
.pel-hit,.pel-cut,.pel-drop{position:relative}
.pel-hit.charging::after,.pel-cut.charging::after,.pel-drop.charging::after{content:'';position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(#ff2bd6 var(--cp),rgba(255,255,255,.18) 0 var(--tope,100%),rgba(255,70,70,.5) 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));pointer-events:none}
.pel-hit.full::after,.pel-cut.full::after,.pel-drop.full::after{background:#ff2e88;animation:pel-full .25s infinite alternate}
.pel-hit.tope::after,.pel-cut.tope::after,.pel-drop.tope::after{background:conic-gradient(#ff9d3b var(--cp),rgba(255,70,70,.5) 0)}
@keyframes pel-full{to{filter:brightness(1.6)}}
/* (las ventanas del partido, por encima de todo: la etiqueta de GOLPE asomaba encima de «Seguir jugando» y se llevaba el toque) */
.pel-panel{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(14,4,34,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 16px) max(16px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 16px) max(16px,env(safe-area-inset-left,0px))}
.pel-card{position:relative;width:min(520px,100%);max-height:100%;overflow:auto;background:radial-gradient(80% 60% at 100% 0%,rgba(255,43,214,.2),transparent 60%),linear-gradient(170deg,#31106b 0%,#12052a 78%);color:#f6f3fc;border:1px solid rgba(255,255,255,.08);padding:24px 24px 16px;box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);border-radius:10px;animation:gx-rise .3s cubic-bezier(.2,.9,.3,1) both}
.pel-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:var(--cta,#ff2bd6);box-shadow:0 0 18px rgba(255,43,214,.5)}
.pel-card h2{margin:0 0 var(--t-mb);font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-weight:400;font-size:var(--fs-2xl);line-height:1;color:#fff;text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.5)}
.pel-card .pel-sub{margin:0 0 12px;font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;color:#ff7ac8;letter-spacing:.04em;text-transform:uppercase}
.pel-card ol{margin:0 0 12px;padding-left:24px;color:#e6def7}.pel-card li{margin:0 0 8px;line-height:1.3}.pel-card li::marker{color:#ff7ac8;font-weight:900}
.pel-card .pel-ctrl{font-size:var(--fs-sm);line-height:1.45;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#cbc2e0;border-radius:12px;padding:8px 12px;margin:0 0 16px}
.pel-card .pel-big{font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-weight:400;font-size:var(--fs-4xl);text-align:center;margin:8px 0;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.35)}
.pel-card .pel-big small{font-size:.45em;color:#cbbcf0;margin-left:2px}
.pel-estrellas{display:flex;justify-content:center;gap:12px;margin:0 0 12px}
.pel-estrellas i{display:grid;place-items:center;width:44px;height:44px;font-style:normal;animation:pel-est .5s cubic-bezier(.2,1.6,.4,1) var(--d,0s) both}
.pel-estrellas i:nth-child(2){width:56px;height:56px;margin-top:-8px}
.pel-estrellas svg{width:100%;height:100%;fill:none;stroke:#b79cff;stroke-width:1.6}
.pel-estrellas i.on svg{fill:#ffd166;stroke:#ffe39a;filter:drop-shadow(0 0 10px rgba(255,209,102,.6))}
@keyframes pel-est{from{opacity:0;transform:scale(.3) rotate(-30deg)}}
.pel-card .pel-metas{font-size:var(--fs-sm);color:#cbbcf0}.pel-card .pel-metas b{color:#fff;font-weight:800;margin-right:4px}
@media (prefers-reduced-motion:reduce){.pel-estrellas i{animation:none}}
.pel-card .pel-fact{background:rgba(255,122,200,.1);border:1px solid rgba(255,255,255,.08);color:#fff3c4;border-radius:12px;padding:8px 12px;margin:8px 0 16px;font-size:var(--fs-sm);line-height:1.3}.pel-card .pel-fact b{color:#ff7ac8}
.pel-lbl{display:block;font-size:var(--fs-xs);font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px}
.pel-levels{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}
.pel-levels button{flex:1;min-width:90px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;padding:8px 8px;font:inherit;font-weight:900;cursor:pointer}
.pel-dur button small{font:inherit;font-weight:700;opacity:.7;margin-left:4px}
.pel-levels button[aria-pressed=true]{background:linear-gradient(180deg,#8338ec,#5e22c4);border-color:#c9a6ff;color:#fff;box-shadow:none}
.pel-go{border:0;border-radius:999px;padding:12px 24px;font:400 var(--fs-xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.04em;min-height:48px;cursor:pointer;color:#fff;background:var(--cta,linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7));box-shadow:0 0 18px rgba(255,43,214,.45);text-shadow:0 2px 0 rgba(74,10,94,.5)}.pel-go:active{transform:translateY(2px);box-shadow:0 2px 0 #8a1c8f}
.pel-go.alt{font:800 var(--fs-md)/1.15 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.04em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);color:#fff;box-shadow:none;text-shadow:none}
.pel-root.calling .pel-tip,.pel-root.calling .pel-q{opacity:0}
.pel-root.paneled .pel-exit,.pel-root.paneled .pel-q,.pel-root.paneled .pel-call,.pel-root.paneled .pel-tip{visibility:hidden}
/* la ficha del rival: cómo corre, cuánto pega, sus manos, sus golpes preferidos y de qué tener cuidado */
.pf{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;min-width:0}.pf>b{flex:1 1 100%}.pf .pf-k{color:#fff}
.pf .pf-sh{flex:1 1 100%;font-size:var(--fs-sm)}.pf .pf-sh em{font-style:normal;margin-right:12px;white-space:nowrap}.pf .pf-sh em i{font-style:normal;color:#ff7ac8;letter-spacing:1px}
.pf p strong{color:#ffb9a8}
.pel-pairs{margin:0 0 8px;font-size:var(--fs-sm);line-height:1.45;color:#d8cff0}
/* las partes del frontón: el botón junto al título y la ficha de cada parte, abajo */
.pel-chip{position:relative;min-height:40px;margin-left:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,122,200,.12);color:#ff7ac8;border-radius:999px;padding:4px 12px;font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;cursor:pointer;vertical-align:middle}
.pel-tour{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translateX(-50%);width:min(560px,calc(calc(100vw / var(--z, 1)) - 32px));padding:8px 16px;border-radius:16px;background:linear-gradient(180deg,rgba(50,19,111,.95),rgba(28,11,58,.95));border:1px solid rgba(255,255,255,.08);pointer-events:auto;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.pel-tour b{display:block;font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-lg);font-weight:400;color:#ff7ac8}
.pel-tour p{margin:4px 0 8px;font-size:var(--fs-sm);line-height:1.3}.pel-tour div{display:flex;gap:8px;justify-content:flex-end}
.pel-tour button{border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:900;padding:8px 16px;min-height:44px;cursor:pointer}
.pel-tour button.go{background:linear-gradient(180deg,#ffc2ec,#ff7ac8 50%,#ff3dbd);color:#2a0638;border:0}
@media (max-width:560px){
  .pel-tip{max-width:calc(calc(100vw / var(--z, 1)) - 32px);bottom:auto;top:calc(env(safe-area-inset-top,0px) + 64px)}}
@media (max-height:520px){.pel-hit{width:94px;height:94px;font-size:var(--fs-lg)}.pel-drop{width:68px;height:68px;font-size:var(--fs-xs)}
  .pel-tip{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 48px);max-width:calc(calc(100vw / var(--z, 1)) - 240px);font-size:var(--fs-sm);padding:8px 12px}
  .pel-call{top:calc(env(safe-area-inset-top,0px) + 56px);padding:12px 20px}
  .pel-card{width:min(780px,100%);padding:16px 16px 12px}.pel-card h2{font-size:var(--fs-xl)}.pel-card .pel-sub{margin-bottom:8px}
  .pel-card ol{columns:2;column-gap:24px;font-size:var(--fs-sm);margin-bottom:8px}.pel-card li{break-inside:avoid;margin-bottom:4px}
  .pel-card .pel-ctrl{font-size:var(--fs-sm);padding:8px 8px;margin-bottom:8px}.pel-levels{margin-bottom:8px}.pel-levels button{padding:8px 8px}
  .pel-go{padding:8px 16px;font-size:var(--fs-md)}.pel-card .pel-big{font-size:var(--fs-3xl);margin:2px 0}.pel-card .pel-fact{margin:8px 0 8px;font-size:var(--fs-sm)}}
/* móvil en horizontal con poca altura: título y marcador en una línea, sin la etiqueta «Nivel» (el grupo la lleva como
   aria-label) y los niveles junto a los botones de jugar, para que todo quepa sin desplazar */
@media (orientation:landscape) and (max-height:440px){
  .pel-panel{padding-top:calc(env(safe-area-inset-top,0px) + 8px);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px)}
  .pel-card{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:12px;padding:8px 16px 12px;border-radius:18px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>*{flex:1 1 100%}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>h2{flex:0 0 auto;margin-bottom:8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-sub{flex:1 1 0;min-width:0;margin-bottom:8px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-lbl{display:none}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels{flex:3 1 0;min-width:0;margin:0;align-self:center;flex-wrap:nowrap}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels button{min-width:0;min-height:44px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels+.pel-row{flex:2 1 0;min-width:0;align-self:center}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels+.pel-row .pel-go{min-height:44px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-court{margin-bottom:8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-lv5 button{flex:1 1 auto;min-width:max-content;padding:4px 6px;font-size:var(--fs-xs);text-transform:none;letter-spacing:0}   /* (cada nivel entero: «Iniciación» no se parte; cada botón del ancho de su nombre) */
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-mod{flex:1 1 100%;margin:0 0 8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-mod button{min-height:44px;padding:4px 8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-pairs{margin-bottom:8px;font-size:var(--fs-xs)}
  .pel-card.mas>.pel-sub,.pel-card.mas>.pel-lado>.pel-sub{display:none}.pel-opts{display:contents}.pel-card.mas>h2,.pel-card.mas>.pel-lado>h2{align-self:center;margin-bottom:8px}
  .pel-otabs{flex:1 1 0;min-width:0;margin-bottom:8px}.pel-opane{flex:1 1 100%}.pel-opane .pel-mod{margin-bottom:8px}.pel-opane .pel-mod button{min-height:44px;padding:4px 8px}.pel-opane .pel-pairs{margin:0 0 8px;font-size:var(--fs-xs)}
  .pel-balls{margin-bottom:8px}
  .pel-orow{margin-bottom:8px}.pel-orow .pel-switch{min-height:44px;padding:4px 12px}
  /* (la pestaña «Partido», entera sin desplazar: cada rótulo a la izquierda de su grupo en vez de encima, los dos
     interruptores en una fila y sin el párrafo de la elección de material, que se explica al elegirlo) */
  .pel-opane[data-pane="0"]{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;align-items:center}
  .pel-opane[data-pane="0"]>*{margin:0}.pel-opane[data-pane="0"]>:is(.pel-mod,.pel-pairs,.pel-orow){grid-column:1/-1}
  .pel-opane[data-pane="0"] .pel-ballwhat{display:none}.pel-opane[data-pane="0"]{margin-bottom:8px}
  @media (max-height:380px){.pel-opane[data-pane="0"]{row-gap:4px;margin-bottom:4px}}
  .pel-opane[data-pane="1"],.pel-opane[data-pane="2"]{max-height:calc(calc(100dvh / var(--z, 1)) - 156px);overflow:auto;overscroll-behavior:contain}
  .pel-opane ol{columns:2;column-gap:24px;margin-bottom:8px}.pel-opane .pel-ctrl{margin-bottom:8px}}
@media (hover:hover) and (pointer:fine){.pel-stick,.pel-stickhint{display:none}}
/* zona táctil de 44 px en las píldoras pequeñas (el dibujo no cambia) */
.pel-chip::before{content:'';position:absolute;inset:-8px -4px}
/* quién juega contra quién: las cartas de los pelotaris (ui/sportCard.js, las del cuadro del torneo y la Gran final), las
   tuyas de tu color a la izquierda, el «VS» y las del rival; al tocar una, su ficha. En una pantalla tumbada las cartas
   van a la izquierda, con todo el alto de la ventana, y lo demás (.pel-lado: el título, el frontón, «Más opciones», el
   nivel y los botones) en una columna a su derecha, que no baja de 280 px; de pie, las cartas arriba y lo demás debajo.
   El ancho de la carta, --cw, lo mide match.js (intro, encaja) con el sitio que queda: mano a mano salen de 136 px o
   más, con sus seis cifras en dos columnas; por parejas, dos por lado, el delantero encima del zaguero. Con «Más
   opciones» abierto las cartas se apartan y la columna se deshace (display:contents): la ventana de siempre */
.pel-rv{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px}
.pel-team{flex:none;display:flex;flex-direction:column;gap:8px}
.pel-vs .gx-card{--w:var(--cw,140px)!important}
.pel-vs-x{flex:none;min-width:32px;text-align:center;font:400 var(--fs-2xl)/1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);letter-spacing:.02em;background:linear-gradient(180deg,#fff,#ff7ac8);-webkit-background-clip:text;background-clip:text;color:transparent}   /* (el mismo «VS» que el del cuadro del torneo) */
.pel-lado{display:contents}.pel-pres .pel-row{margin-left:0;margin-right:0;padding-left:0;padding-right:0}
/* (con «Más opciones» abierto sobra la línea del campeonato: así la vista cabe sin desplazar) */
.pel-card.pel-pres.mas>.pel-lado>.pel-sub{display:none}
.pel-mas{display:flex;align-items:center;gap:8px;margin:0 0 8px}.pel-mas .pel-more{flex:1 1 0;width:auto;min-width:0;margin:0}.pel-mas .pel-chip{flex:none;margin:0;min-height:44px}
@media (max-width:520px){.pel-pres .pel-sum{display:none}}
@media (max-width:440px){.pel-card.pel-pres{padding-left:16px;padding-right:16px}}
@media (orientation:landscape){
  .pel-card.pel-pres{width:min(960px,100%)}
  .pel-card.pel-pres:not(.mas){display:flex;flex-wrap:nowrap;align-items:center;gap:16px}
  .pel-card.pel-pres:not(.mas)>.pel-rv{flex:none;margin:0}
  .pel-card.pel-pres:not(.mas)>.pel-lado{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:12px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>*{flex:none;margin:0}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lbl{margin-bottom:-4px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-row{position:static;padding:0;background:none}
  .pel-card.pel-pres:not(.mas) .pel-sum{display:none}   /* (el resumen de lo elegido no cabe entero en la columna) */
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5 button{grid-column:span 2;min-width:0}.pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5 button:nth-child(n+4){grid-column:span 3}
}
/* (en el móvil tumbado: el mismo relleno arriba que abajo, todo más junto y sin el rótulo «Nivel», que el grupo lo lleva
   como aria-label) */
@media (orientation:landscape) and (max-height:500px){
  .pel-card.pel-pres:not(.mas){padding:12px 16px}
  .pel-card.pel-pres:not(.mas)>.pel-lado{gap:8px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lbl{display:none}
  .pel-vs-x{font-size:var(--fs-xl)}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5 button{min-height:44px;padding:4px 8px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-row .pel-go{min-height:44px}
}
.pel-wide{display:block;width:100%;margin:0 0 12px}
/* el frontón: su dibujo, su nombre y lo que se nota al jugar en él (al tocarlo, qué pasa con cada cosa) */
.pel-court{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 12px;padding:4px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,122,200,.08);color:#fff;font:inherit;text-align:left;cursor:pointer}
.pel-court svg{flex:none;width:48px;height:36px}.pel-court-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.pel-court-t b{font-size:var(--fs-sm);font-weight:900;line-height:1.3}.pel-court-t span{display:flex;flex-wrap:wrap;gap:4px}
.pel-court-t i{font-style:normal;font-size:var(--fs-xs);font-weight:800;line-height:1.3;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.1);color:#ff7ac8}
.pel-court-what{margin:-4px 0 12px;font-size:var(--fs-sm);line-height:1.45;color:#e6def7}.pel-court-what b{color:#ff7ac8}
/* «Más opciones»: plegado, con lo elegido a la vista */
/* «Más opciones»: un botón con lo elegido a la vista. Al tocarlo, el mismo panel pasa a la vista de opciones, en
   pestañas (Partido, Reglas, Controles), en vez de alargarse: quién juega y el frontón se apartan, y el nivel y los
   botones de jugar siguen abajo */
.pel-more{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin:0 0 8px;padding:0;border:0;background:none;color:#cbbcf0;font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;text-transform:uppercase;letter-spacing:.1em;text-align:left;white-space:nowrap;cursor:pointer}
.pel-more::before{content:'';flex:none;width:8px;height:8px;border:solid #ff7ac8;border-width:0 2px 2px 0;transform:rotate(-45deg);margin:0 4px 0 2px}
.pel-more .pel-sum{margin-left:auto;padding-left:12px;min-width:0;font-size:var(--fs-xs);font-weight:800;letter-spacing:0;text-transform:none;color:#ff7ac8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pel-card.mas :is(.pel-rv,.pel-court,.pel-court-what,.pel-mas){display:none}
.pel-opts[hidden],.pel-opane[hidden]{display:none}
.pel-otabs{display:flex;align-items:stretch;gap:4px;margin:0 0 12px}
.pel-otabs button{flex:1 1 0;min-width:0;min-height:44px;padding:0 8px;border:0;border-radius:999px;background:none;color:#cbbcf0;font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.pel-otabs button[aria-selected=true]{color:#fff;background:var(--btn-on,#7a42ea)}
.pel-otabs .pel-back{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 12px 0 4px;color:#ff7ac8;letter-spacing:.04em}
.pel-otabs .pel-back::before{content:'';width:8px;height:8px;border:solid currentColor;border-width:0 0 2px 2px;transform:rotate(45deg)}
.pel-opane{animation:pel-pane .18s ease both}@keyframes pel-pane{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.pel-opane ol{margin:0 0 12px}.pel-opane .pel-ctrl{margin:0 0 12px}
.pel-orow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;margin:0 0 12px}
.pel-orow .pel-ballwhat,.pel-orow .pel-switch{margin:0}.pel-orow .pel-ballwhat{grid-row:span 2}
/* (de pie, en el móvil: los dos interruptores uno debajo del otro, a lo ancho, y sin el párrafo de la elección de material,
   como en el móvil tumbado: se explica al elegirlo. Antes, el párrafo en una columna estrecha y la pestaña se pasaba 226 px) */
@media (orientation:portrait) and (max-width:600px){.pel-orow{grid-template-columns:minmax(0,1fr);gap:8px}.pel-orow .pel-ballwhat{display:none}}
.pel-lv5 button{min-width:0;font-size:var(--fs-sm)}
/* móvil muy estrecho de pie: los niveles bajan a otra fila en vez de pisarse y «Volver al pueblo» parte en dos líneas */
@media (orientation:portrait) and (max-width:400px){.pel-lv5 button{flex:1 1 auto;min-width:max-content}}
@media (orientation:portrait) and (max-width:360px){.pel-row .pel-go{white-space:normal;font-size:var(--fs-lg);line-height:1.1}}
/* tu energía: grande, abajo en el centro (entre el joystick y los botones); verde, amarilla y roja al cansarte */
@keyframes pel-low{to{box-shadow:none}}
/* el descanso: a la derecha de tu energía (de pie, encima), con los que te quedan; pedido, en rosa; descansando, «Seguir»;
   cansado y con descansos, brilla */
/* interruptores de «Más opciones» (la cámara dinámica) */
.pel-switch{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 12px;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer}
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
.pel-tring.on{opacity:.9}.pel-tring.now{border-color:#fff;box-shadow:0 0 22px #ff2bd6;opacity:1}
.pel-hit .pel-hl{position:relative;z-index:1}

/* ordenador (pantalla grande): las ventanas del partido más anchas y con la letra a su tamaño */
@media (min-width:1200px) and (min-height:560px){
  .pel-card{width:min(1000px,100%);padding:32px 40px 24px}.pel-card ol{columns:2;column-gap:40px}.pel-card li{break-inside:avoid}.pel-card h2{font-size:var(--fs-3xl)}.pel-card .pel-sub{font-size:var(--fs-md)}
  .pel-card li,.pel-card .pel-ctrl,.pel-pairs{font-size:var(--fs-md)}.pel-go{min-height:56px}.pel-levels button{min-height:48px}
  .pel-card.pel-pres.mas{padding-top:24px}
}
/* la elección de material (material.js): un desplegable con cómo quieres tus pelotas y, debajo, cuáles son, cada una con
   su número, lo viva que es y su peso */
.pel-card.pel-matcard{width:min(560px,100%)}
.pel-msel{display:grid;gap:6px;margin:0 0 12px}.pel-msel>span{font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#ff9ad8}
.pel-mseg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.pel-mseg button{min-height:44px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(20,8,40,.55);color:#fff;font:700 var(--fs-md)/1.1 'MZ Texto',sans-serif;cursor:pointer;touch-action:manipulation}
.pel-mseg button[aria-checked=true]{background:rgba(131,56,236,.6);border-color:#c9a6ff;box-shadow:none}
.pel-matcard .pel-mgo{position:sticky;bottom:-16px;margin:0 -24px -16px;padding:8px 24px 16px;background:linear-gradient(180deg,rgba(18,5,42,0),#12052a 14px)}
.pel-matcard .pel-mgo .pel-go{touch-action:manipulation}
.pel-mchips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.pel-mchip{display:inline-flex;align-items:center;gap:8px;padding:5px 14px 5px 5px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08)}
.pel-mchip svg{width:30px;height:30px}.pel-mchip b{font:900 var(--fs-sm)/1.1 var(--f-cond,'MZ Texto'),sans-serif}.pel-mchip small{font-size:var(--fs-xs);color:#cbc2e0;white-space:nowrap}
.pel-mat-what{margin:0 0 12px;font-size:var(--fs-sm);color:#d8cff0;line-height:1.35}
.pel-mrv{margin:-4px 0 12px;font-size:var(--fs-xs);color:#b9addb}.pel-mrv:empty{display:none}
/* la fila de los botones del panel (Ahora no y ¡A jugar!): con su hueco entre ellos y pegada abajo si el panel se
   desplaza, sobre el color del fondo. En «Partido de pelota: menos cosas en pantalla» se borró sin querer junto a otra
   regla y los dos botones quedaban pegados el uno al otro */
.pel-row{display:flex;gap:12px;position:sticky;bottom:-16px;z-index:1;margin:8px -4px -8px;padding:8px 4px;background:#12052a}
.pel-row .pel-go{flex:1 1 0;min-width:0;white-space:nowrap}
@media (max-width:440px){.pel-row{flex-direction:column-reverse}.pel-row .pel-go{flex:none;width:100%}}
.pel-row .pel-go:disabled{opacity:.45;cursor:default;box-shadow:none}
@media (max-height:500px){.pel-msel{margin-bottom:8px}.pel-mseg button{min-height:40px}.pel-matcard .pel-mgo{bottom:-12px;margin:0 -16px -12px;padding:6px 16px 12px}.pel-mchip svg{width:24px;height:24px}.pel-mat-what{margin-bottom:8px}}
/* la experiencia en el panel del final: el nivel con su barra y lo que ha subido cada cualidad, en cuatro casillas */
/* el resumen del partido (match.js, estBloque): cada cifra, la tuya y la del rival, con el color de cada uno */
/* el final: a la izquierda el resultado, el momento clave y la experiencia; a la derecha las estadísticas y el mapa de
   golpes. En dos columnas cuando hay sitio (móvil tumbado y ordenador): en una sola, el nivel quedaba debajo de los
   botones */
.pel-fin{display:block}
:where(.pel-card:has(.pel-fin)) .pel-row{margin-left:0;margin-right:0;padding-left:0;padding-right:0;background:linear-gradient(rgba(21,6,49,0),rgba(21,6,49,.96) 8px)}
.pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin:0 0 16px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}.pel-fin-a:not(:empty)+.pel-fin-b{margin-top:16px}
@media (min-width:600px){.pel-fin .pel-fin-a+.pel-fin-b{margin-top:0}}.pel-card:has(.pel-fin)>.pel-sub{margin-bottom:16px}
/* el resultado en la cabecera del final: el tanteo entre los dos nombres, cada uno con su color, y las fichas a la derecha */
.pel-card .pel-sub:has(.pel-marca){display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}.pel-sub:has(.pel-marca) .pel-chip{margin-left:auto;min-height:32px}@media (max-width:440px){.pel-sub:has(.pel-marca) .pel-chip{margin-left:0}}
.pel-marca{display:inline-flex;align-items:baseline;gap:12px;min-width:0}.pel-marca i{font-style:normal;white-space:nowrap}.pel-marca i.azul{color:#b9b1ff}.pel-marca i.rojo{color:#ff9cc8}
.pel-marca b{font:400 var(--fs-2xl)/1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);color:#fff;letter-spacing:.02em;white-space:nowrap;text-shadow:0 3px 0 rgba(7,2,15,.5)}
@media (min-width:600px){.pel-card:has(.pel-fin){width:min(860px,100%)}.pel-fin{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:0 16px;align-items:start}}
.pel-clave{margin:4px 0 12px;padding:10px 14px;border-radius:8px;background:linear-gradient(100deg,rgba(255,43,214,.16),rgba(123,47,247,.12));border:1px solid rgba(255,255,255,.08)}
.pel-clave b{display:block;font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#ff7ac8}
.pel-clave p{margin:4px 0 0;font-size:var(--fs-sm);font-weight:700;line-height:1.35;color:#fff}
.pel-mapa{margin:0 0 12px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.pel-mapa svg{display:block;width:100%;height:auto;margin-top:8px}
.pel-mapa text{font:800 16px/1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.06em;text-transform:uppercase;fill:#cbbcf0}
/* los comentarios (comenta.js): un rótulo de retransmisión abajo en el centro, entre el joystick y los botones, con la
   inicial y el nombre de quien habla (rosa cuando narra; lila cuando explica la jugada); en vertical, a lo ancho
   y por encima de los botones. También en la repetición: es cuando más se comenta */
.pel-com{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translate(-50%,8px);width:max-content;max-width:min(calc(100vw / var(--z, 1) - 420px),520px);display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;align-items:center;padding:8px 14px 8px 10px;background:rgba(7,2,15,.88);border-left:3px solid var(--cc,#ff2bd6);border-radius:3px;box-shadow:0 6px 18px rgba(0,0,0,.35);opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;--cc:#ff2bd6}
.pel-com.on{opacity:1;transform:translate(-50%,0)}.pel-com.e{--cc:#9d8cff}
.pel-com .pc-q{grid-row:1/3;width:30px;height:30px;border-radius:50%;background:var(--cc);display:grid;place-items:center;font:400 var(--fs-md)/1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);color:#fff;font-style:normal}
.pel-com b{font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--cc)}.pel-com b small{font:inherit;color:#cbbcf0;letter-spacing:.04em}
.pel-com p{margin:2px 0 0;font-size:var(--fs-sm);font-weight:600;line-height:1.3;color:#fff}
@media (orientation:portrait){.pel-com{left:16px;right:16px;width:auto;max-width:none;transform:translateY(8px);bottom:calc(env(safe-area-inset-bottom,0px) + 200px)}.pel-com.on{transform:none}}
.pel-root.paneled .pel-com{visibility:hidden}
body.alto-contraste .pel-com{background:#000;border:2px solid #fff;border-left:4px solid var(--cc)}
/* accesibilidad (util/accesible.js): textos grandes, un 20 % más, y alto contraste, con fondo negro, letra blanca y bordes
   blancos en el marcador, los avisos, los paneles y los botones */
body.textos-grandes .pel-root{--fs-xs:15px;--fs-sm:17px;--fs-md:19px;--fs-lg:24px;--fs-xl:28px;--fs-2xl:36px;--fs-3xl:44px;--fs-4xl:52px;--fs-hero:clamp(36px,7vw,56px)}
body.textos-grandes .pel-root :is(.pel-est,.pel-xp) li b{font-size:13px}body.textos-grandes .pel-side{width:calc(var(--psw,176px) * 1.12)}
body.alto-contraste .pel-score{background:#000;border-top-color:#fff;opacity:1;box-shadow:0 0 0 2px #fff}
body.alto-contraste .pel-side :is(span,b){color:#fff;text-shadow:0 1px 0 #000}
body.alto-contraste :is(.pel-call,.pel-golpe,.pel-tip,.pel-q,.pel-rep-b){background:#000!important;border:2px solid #fff!important;color:#fff!important;box-shadow:none!important}
body.alto-contraste .pel-call :is(p,.pel-kantari){color:#fff!important}body.alto-contraste .pel-racha{background:#000;border:2px solid #ffd166;color:#ffd166;box-shadow:none}
body.alto-contraste .pel-card{background:#000;border:2px solid #fff}body.alto-contraste .pel-card :is(p,li,small,.pel-sub,dt,dd){color:#fff!important}
body.alto-contraste .pel-card :is(.pel-est,.pel-xp,.pel-clave,.pel-mapa,.pel-fact,.pel-ctrl){background:#0b0b0b;border:2px solid #fff}
body.alto-contraste .pel-row{background:#000}body.alto-contraste .pel-go.alt,body.alto-contraste .pel-levels button,body.alto-contraste .pel-chip{background:#000;border:2px solid #fff;color:#fff}
body.alto-contraste .pel-btn{box-shadow:0 0 0 3px #fff}body.alto-contraste .pm-btn{background:#000;border:0;box-shadow:inset 0 2px 0 #fff,inset 2px 0 0 #fff,0 0 0 2px #fff;opacity:1}
.pel-mapa span{display:flex;gap:10px}.pel-mapa i{font-style:normal}.pel-mapa i.rojo{color:#ff9cc8}.pel-mapa i.azul{color:#b9b1ff}
.pel-est{margin:4px 0 12px;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.pel-est-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.pel-est-top b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),sans-serif;text-transform:uppercase;letter-spacing:.02em}
.pel-est span{display:flex;gap:10px;min-width:0}.pel-est i{font-style:normal}.pel-est i.rojo{color:#ff9cc8}.pel-est i.azul{color:#b9b1ff}
.pel-est-top i{font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.06em;text-transform:uppercase;max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pel-est ul{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 8px;columns:auto}
.pel-est li{display:grid;grid-template-rows:1fr auto;justify-items:center;align-items:end;gap:4px;margin:0;padding:0}
.pel-est li b{font:800 11px/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#cbbcf0;text-align:center}
.pel-est li span{font:400 var(--fs-md)/1 var(--f-display,'MZ Display'),sans-serif;gap:12px}
.pel-est p{margin:8px 0 0;font:700 var(--fs-xs)/1.3 var(--f-cond,'MZ Cond'),sans-serif;color:#e7defa;text-align:center}
@media (max-width:440px){.pel-est ul{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pel-xp{margin:4px 0 12px;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.pel-xp.sube{border-color:#ffd36a;box-shadow:0 0 18px rgba(255,211,106,.25)}
.pel-xp-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.pel-xp-top b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),sans-serif;text-transform:uppercase;letter-spacing:.02em}
.pel-xp.sube .pel-xp-top b{color:#ffd36a}.pel-xp-top span{font:800 var(--fs-sm)/1 var(--f-cond,'MZ Cond'),sans-serif;color:#ffb1e3;white-space:nowrap}
.pel-xp-bar{display:block;height:8px;margin:10px 0 0;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.pel-xp-bar u{display:block;height:100%;border-radius:inherit;background:var(--cta,#c21cff);animation:pel-xpin 1s cubic-bezier(.2,.9,.3,1) both}
@keyframes pel-xpin{from{width:0}}
.pel-xp ul{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,max-content);justify-content:space-between;gap:8px 12px}
.pel-xp li{display:grid;grid-template-rows:1fr auto;justify-items:center;align-items:end;gap:4px;padding:0}
.pel-xp li b{font:800 11px/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#cbbcf0}
.pel-xp li span{font:400 var(--fs-md)/1 var(--f-display,'MZ Display'),sans-serif;color:#7dffa8}.pel-xp li small{font:700 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),sans-serif;color:#e7defa}
/* (en el móvil tumbado, todo a la vista y con aire: 12 px entre bloques y 10-14 px dentro de cada uno, sin casillas dentro
   de las casillas; el mapa de golpes con su título a la izquierda, para que la cancha use el ancho y no quede diminuta, y
   los botones a 44 px de alto, con 12 px por encima. Antes iba todo a 6-8 px, el resultado ocupaba una fila para él solo
   y el panel se desplazaba 11 px, lo justo para que el mapa pareciera cortado) */
@media (orientation:landscape) and (max-height:520px){
  .pel-card:has(.pel-fin){padding:14px 20px 12px}.pel-card:has(.pel-fin)>:is(h2,.pel-sub){margin-bottom:12px}.pel-marca b{font-size:var(--fs-xl)}
  .pel-fin{column-gap:16px;align-items:stretch}.pel-fin>div{display:flex;flex-direction:column}.pel-fin>div>:last-child{flex:1 1 auto}.pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin:0 0 12px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}
  .pel-fin .pel-big{font-size:var(--fs-2xl)}.pel-fin :is(.pel-clave,.pel-est,.pel-xp,.pel-mapa){padding:10px 14px}
  .pel-fin :is(.pel-est-top,.pel-xp-top) b{font-size:var(--fs-md);line-height:1.05}.pel-xp-bar{margin-top:8px}.pel-est ul{margin-top:12px}
  .pel-mapa{display:grid;grid-template-columns:minmax(0,7.5em) minmax(0,1fr);align-items:center;column-gap:12px}
  .pel-mapa .pel-est-top{flex-direction:column;align-items:flex-start;gap:6px}.pel-mapa svg{margin:0;max-height:80px}
  .pel-fin-b:has(.pel-est) .pel-mapa .pel-est-top span{display:none}   /* (los colores de cada uno ya los dice la leyenda de las estadísticas, justo encima) */
  .pel-card:has(.pel-fin) .pel-row{margin:4px 0 -12px;padding:8px 0 12px;bottom:-12px}
  .pel-card:has(.pel-fin) .pel-go{min-height:44px;padding:8px 16px}}
/* (y en los más bajos, como el iPhone SE tumbado, sin el pie de las estadísticas, que el tanto más largo ya lo cuenta el
   momento clave, ni el total de cada cualidad bajo lo que ha subido) */
@media (orientation:landscape) and (max-height:400px){.pel-fin :is(.pel-est p,.pel-xp li small){display:none}}
/* (y en los de 375 px, el SE y el mini, 10 px entre bloques y un poco menos de relleno, para que siga cabiendo entero) */
@media (orientation:landscape) and (max-height:380px){.pel-card:has(.pel-fin){padding-top:12px}.pel-card:has(.pel-fin)>:is(h2,.pel-sub),.pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin-bottom:10px}
  .pel-fin :is(.pel-clave,.pel-est,.pel-xp,.pel-mapa){padding:8px 12px}.pel-est ul{margin-top:12px;row-gap:8px}.pel-mapa svg{max-height:60px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}}
/* (y con la barra de Safari, el móvil tumbado se queda en 320-360 px de alto: todo más junto, para que el mapa de golpes
   no quede debajo de los botones. Antes, ahí había que desplazar el panel para verlo entero y parecía cortado) */
@media (orientation:landscape) and (max-height:360px){.pel-card:has(.pel-fin){padding-top:10px}.pel-card:has(.pel-fin)>:is(h2,.pel-sub){margin-bottom:8px}
  .pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin-bottom:8px}.pel-fin :is(.pel-clave,.pel-est,.pel-xp,.pel-mapa){padding:6px 12px}
  .pel-clave p{line-height:1.25}.pel-est ul{margin-top:6px;row-gap:4px}.pel-est li{gap:2px}.pel-xp-bar{margin-top:6px}.pel-xp ul{margin-top:6px}
  .pel-mapa svg{max-height:46px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}
  .pel-card:has(.pel-fin) .pel-row{padding-top:6px}}
/* el menú del partido, dentro del marcador (noviembre de 2026): su último tramo, con el mismo fondo y el mismo filete de
   arriba, separado por una raya fina; el icono de pausa como el del pueblo (al abrirlo, el partido se para) y, debajo, los
   descansos que te quedan; brilla si estás cansado y te quedan. Dentro, todo junto: la pelota, el descanso, las fichas y
   salir. Antes era un botón redondo suelto a la derecha del marcador, con su badge en la esquina. El filete y la raya van
   en sombra por dentro: los botones no llevan borde de color (la regla de los botones planos, ui/neon.css) */
.pel-top{gap:0;align-items:stretch}
.pel-top .pel-score{border-top-right-radius:0;border-bottom-right-radius:0}
.pel-menu{position:relative;flex:none;display:flex;pointer-events:auto;color:#e6def7;font:800 var(--fs-xs)/1 var(--f-cond,'MZ Texto'),sans-serif}
.pm-btn{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:52px;min-height:44px;height:100%;padding:8px 0 6px;border:0;border-radius:0 6px 6px 0;background:rgba(7,2,15,.9);opacity:.95;box-shadow:inset 0 2px 0 #ff2bd6,inset 1px 0 0 rgba(255,255,255,.1),0 6px 20px rgba(0,0,0,.35);color:#fff;cursor:pointer;transition:background .18s}
.pm-btn:hover,.pm-btn:focus-visible{background:rgba(42,18,74,.94)}.pm-btn:focus-visible{outline:2px solid #fff;outline-offset:-3px}
.pm-btn img,.pm-btn svg{width:22px;height:22px;display:block;pointer-events:none}
.pm-btn i:empty{display:none}.pm-btn i{display:grid;place-items:center;min-width:22px;height:16px;padding:0 6px;border-radius:999px;background:var(--cta,#c21cff);font:900 11px/1 var(--f-cond,'MZ Texto'),sans-serif;font-style:normal;color:#fff}
.pel-menu.on .pm-btn{background:rgba(42,18,74,.94)}
.pel-root:is(.paneled,.repe) .pel-top .pel-score{border-radius:6px}
/* (el menú del partido es la ventana de pausa de src/ui/pausa.js: centrada sobre el partido, con sus filas) */
.pm-hoja{display:none}.pel-menu.on .pm-hoja{display:grid}
.pz-k{flex:none;display:grid;place-items:center;min-width:28px;height:28px;padding:0 8px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);font:800 var(--fs-xs)/1 var(--f-cond,'MZ Texto'),sans-serif;color:#e6def7}
.pb-desc.pedido .pz-ico{background:#ff7ac8}
.pel-menu.llama .pm-btn{animation:pel-llama 1s ease-in-out infinite alternate}@keyframes pel-llama{to{box-shadow:inset 0 2px 0 #ff2bd6,inset 1px 0 0 rgba(255,255,255,.1),0 0 18px rgba(255,43,214,.6)}}
@media (prefers-reduced-motion:reduce){.pel-menu.llama .pm-btn{animation:none}}
.pel-root.paneled .pel-menu,.pel-root.repe .pel-menu{visibility:hidden}
`;
const BOLA = bolaSVG();
// (la llama de las rachas)
const LLAMA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5.2 1.6 1 2.6 2 3 0-3 .5-5.5.5-8.5z" fill="currentColor"/></svg>';   // (la pelota de verdad, en dibujo: pelota/bola.js)

/** Mete en la página los estilos del partido (una vez). La pasaka (src/game/pasaka3d.js) usa la misma interfaz. */
export function pelotaStyle() { if (!document.getElementById('pel-style')) { const st = document.createElement('style'); st.id = 'pel-style'; st.textContent = CSS; document.head.appendChild(st); } }
// la X de salir, con el icono 3D de cerrar de la familia (src/assets/icons3d); si faltara, el trazo blanco
export const X_ICON = icon3DReady('close') ? `<img class="pel-xi" src="${icon3DReady('close')}" alt="" aria-hidden="true">` : '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
// el icono del menú: el de pausa de la familia, como el menú del pueblo (al abrirlo, el partido se para)
const PAUSA = icon3DReady('pause') ? `<img src="${icon3DReady('pause')}" alt="" aria-hidden="true">` : '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>';

export class PelotaHud {
  constructor(container, txt, names, touch, cols = { you: 'azul', rival: 'rojo' }) {
    this.txt = txt; this.touch = touch;
    // (la ventana de pausa: sus textos y, con teclado, la tecla de cada opción junto a su botón)
    const PZ = txt.pausa || {}, tecla = (k) => touch ? '' : `<kbd class="pz-k">${k}</kbd>`;
    pelotaStyle();
    const r = this.root = document.createElement('div'); r.className = 'pel-root';
    r.innerHTML = `
      <div class="pel-top"><div class="pel-score">
        <div class="pel-side ${cols.you === 'rojo' ? 'pel-red' : 'pel-blue'}" data-side="you"><div class="ps-cab"><i class="pel-serve" data-pel-s="you"></i><span>${esc(short(names.you))}</span><i class="ps-racha" data-pel-r="you"></i><b data-pel-n="you">0</b></div><div class="ps-barras"></div></div>
        <div class="pel-mid" data-pel-mid></div>
        <div class="pel-side ${cols.rival === 'azul' ? 'pel-blue' : 'pel-red'}" data-side="rival"><div class="ps-cab"><b data-pel-n="rival">0</b><i class="ps-racha" data-pel-r="rival"></i><span>${esc(short(names.rival))}</span><i class="pel-serve" data-pel-s="rival"></i></div><div class="ps-barras"></div></div>
      </div><div class="pel-menu"><button type="button" class="pm-btn" aria-haspopup="true" aria-expanded="false" aria-label="${txt.menu || 'Menú'}">${PAUSA}<i class="pm-n"></i></button><div class="pm-hoja pz-fondo" role="dialog" aria-modal="true" aria-label="${esc(PZ.titulo || 'Pausa')}"><div class="pz-panel">${pzCabecera(esc(PZ.titulo || 'Pausa'), esc(PZ.cerrar || 'Cerrar'))}<div class="pz-lista">
        ${pzFila({ cls: 'pm-seguir', titulo: esc(PZ.seguir?.[0] || 'Continuar'), sub: esc(PZ.seguir?.[1] || ''), ico: PZ_ICO.seguir })}
        <div class="pm-bolas pz-grupo" hidden><span class="pz-tx"><b>${esc(txt.pelotaT || 'Pelota')}</b><small class="pb-pista"></small></span><div class="pb-lista pz-ops"></div></div>
        ${pzFila({ cls: 'pb-desc', titulo: esc(txt.desc?.btn || 'Descanso'), ico: PZ_ICO.descanso, extra: '<em class="pz-n"></em>', attrs: 'hidden' })}
        ${pzFila({ cls: 'pm-vista', titulo: esc(txt.vistaFP || 'Primera persona'), sub: esc(PZ.vista || ''), ico: PZ_ICO.ojo, extra: tecla('V'), attrs: 'hidden aria-pressed="false"' })}
        ${pzFila({ cls: 'pm-plano', titulo: '', sub: esc(PZ.camara || ''), ico: PZ_ICO.camara, extra: tecla('C') })}
        ${pzFila({ cls: 'pm-fichas', titulo: esc(txt.fichas || 'Fichas'), sub: esc(PZ.fichas || ''), ico: PZ_ICO.fichas, attrs: 'hidden' })}
        ${pzFila({ cls: 'pm-salir', titulo: esc(txt.salirPartido || txt.exit), sub: esc(PZ.salir || ''), ico: PZ_ICO.salir })}
      </div></div></div></div></div>
      <div class="pel-call"><h3></h3><p></p><div class="pel-kantari"></div><div class="pel-racha" hidden></div></div>
      <div class="pel-golpe" aria-live="off"></div>
      <div class="pel-com" role="status" aria-live="polite"></div>
      <div class="pel-q"></div>
      <div class="pel-tip"></div>
      <div class="pel-stick"><div class="pel-knob"><i></i></div></div>
      ${touch ? '<div class="pel-stickhint"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M24 6l6 7h-4v8h8v-4l7 7-7 7v-4h-8v8h4l-6 7-6-7h4v-8h-8v4l-7-7 7-7v4h8v-8h-4z" fill="#fff" opacity=".9"/></svg></div>' : ''}
      <div class="pel-btns"><div class="pel-bcol"><button class="pel-btn pel-drop pel-cut" data-k="cut" aria-label="${txt.cut}"><span>${txt.cut}</span></button><button class="pel-btn pel-drop pel-dejada" data-k="drop" aria-label="${txt.drop}"><span>${txt.drop}</span></button></div><button class="pel-btn pel-hit" aria-label="${txt.hit}"><span class="pel-hl">${txt.hit}</span>${touch ? '' : `<small class="pel-hk">${txt.hitKey || ''}</small>`}<i class="pel-tring" aria-hidden="true"></i></button></div>`;
    container.appendChild(r);
    this.$ = (s) => r.querySelector(s);
    // (los dos nombres del marcador, enteros y a la misma letra: si uno no cabe, los dos bajan a la vez, nunca de 11 px.
    // Antes el del lado más largo salía con puntos suspensivos)
    // (el ancho entero de cada nombre, con una copia suelta: con los puntos suspensivos, el navegador da por ancho del texto
    // el de su caja)
    const entero = (x) => { const c = x.cloneNode(true); c.style.cssText = 'position:absolute;visibility:hidden;flex:none;width:auto;overflow:visible;text-overflow:clip'; x.parentElement.appendChild(c); const w = c.getBoundingClientRect().width; c.remove(); return w; };
    this.nombres = () => { const L = [...r.querySelectorAll('.ps-cab span')]; L.forEach(x => { x.style.fontSize = ''; });
      const k = Math.min(1, ...L.map(x => { const caja = x.getBoundingClientRect().width, w = entero(x); return caja > 0 && w > caja + 0.5 ? caja / w : 1; }));
      if (k < 1) { const fz = Math.max(11, parseFloat(getComputedStyle(L[0]).fontSize) * k); L.forEach(x => { x.style.fontSize = `${Math.floor(fz * 10) / 10}px`; }); } };
    requestAnimationFrame(this.nombres); document.fonts?.ready?.then(() => this.nombres());
    fitCircles(r.querySelector('.pel-btns')); this.onFit = () => { fitCircles(r.querySelector('.pel-btns')); this.nombres(); }; addEventListener('resize', this.onFit);
    this.callT = 0; this.qT = 0;
    // el menú: al tocar su botón se abre y el partido se para (onMenu); al elegir algo o tocar fuera, se cierra y sigue.
    // Con el descanso empezado se abre solo, con «Seguir», sin parar el partido (el minuto de descanso corre)
    const m = this.menuEl = r.querySelector('.pel-menu');
    const abre = this.abreMenu = (on, mano = true) => {
      if (m.classList.contains('on') === on) return;
      m.classList.toggle('on', on); m.querySelector('.pm-btn').setAttribute('aria-expanded', String(on));
      if (mano || !on) this.onMenu?.(on, mano);
    };
    const hoja = m.querySelector('.pm-hoja');
    tap(m, (b) => {
      if (b.classList.contains('pm-btn')) return abre(!m.classList.contains('on'));
      // (Continuar y la equis cierran la ventana y el partido sigue; en pleno descanso, además, lo terminan, como «Seguir»)
      if (b.classList.contains('pm-seguir') || b.classList.contains('pz-x')) { const desc = m._ahora; abre(false); if (desc) this.onDescanso?.(); return; }
      if (b.classList.contains('pb-desc')) { abre(false); this.onDescanso?.(); return; }
      if (b.classList.contains('pm-fichas')) { abre(false); this.onFichas?.(); return; }
      if (b.classList.contains('pm-vista')) { abre(false); this.onVista?.(); return; }
      if (b.classList.contains('pm-plano')) { this.onPlano?.(); return; }   // (la cámara: cambia sin cerrar el menú, se ve detrás)
      if (b.classList.contains('pm-salir')) { abre(false); this.onSalir?.(); return; }
      if (b.dataset.bola != null) { this.onBola?.(+b.dataset.bola); abre(false); }
    });
    // (tocar fuera de la ventana, en el partido oscurecido, también la cierra; en el descanso no, que se cierra con Seguir)
    this.fueraMenu = (e) => { if (m.classList.contains('on') && !m._ahora && (!m.contains(e.target) || e.target === hoja)) abre(false); };
    addEventListener('pointerdown', this.fueraMenu, true);
    this.cierraBolas = () => abre(false);
  }
  /** La vista en primera persona, en el menú (solo en la pelota en casa): on, si sale; fp, si está puesta */
  vista(on, fp) { const b = this.menuEl.querySelector('.pm-vista'); if (!b) return; b.hidden = !on; b.setAttribute('aria-pressed', String(!!fp)); }
  /** La cámara elegida, en el menú: «Cámara: General», «Cámara: Detrás de ti»… */
  plano(txt) { const s = this.menuEl?.querySelector('.pm-plano .pz-tx b'); if (s) s.textContent = txt; }
  /** Las fichas de los pelotaris, en el menú (no en el peloteo de entrenar) */
  fichas(on) { const b = this.menuEl.querySelector('.pm-fichas'); if (b) b.hidden = !on; }
  // la energía de cada lado, en el marcador, bajo su nombre: una sola barra. Filas { id, name, en (0 a 1), side ('you'|
  // 'rival') }; null la esconde. Por parejas, la barra del lado es la media de sus dos pelotaris
  energy(rows) {
    if (!rows) { for (const b of this.root.querySelectorAll('.ps-barras')) b.hidden = true; return; }
    const key = rows.map(r => r.id + r.side).join();
    if (this.enKey !== key) {
      this.enKey = key;
      for (const side of ['you', 'rival']) {
        const box = this.root.querySelector(`.pel-side[data-side="${side}"] .ps-barras`); if (!box) continue;
        const en = esc(this.txt.energy || 'Energía');
        box.innerHTML = rows.some(r => r.side === side) ? `<svg class="ps-ico" viewBox="0 0 24 24" role="img" aria-label="${en}"><title>${en}</title><path d="M13.5 2 4.5 13.6h6.6L10 22l9.5-12h-6.8z" fill="currentColor"/></svg><i class="ps-barra" title="${en}"><u></u></i>` : '';
      }
    }
    for (const b of this.root.querySelectorAll('.ps-barras')) b.hidden = false;
    for (const side of ['you', 'rival']) {
      const mine = rows.filter(r => r.side === side), i = this.root.querySelector(`.pel-side[data-side="${side}"] .ps-barra`); if (!mine.length || !i) continue;
      const v = Math.round(mine.reduce((t, r) => t + r.en, 0) / mine.length * 50) / 50; if (i._v === v) continue; i._v = v;
      i.querySelector('u').style.transform = `scaleX(${v})`; i.classList.toggle('mid', v < 0.5 && v >= 0.25); i.classList.toggle('low', v < 0.25);
    }
  }
  /** Los descansos, en el menú: cuántos te quedan, pedido o descansando ahora (entonces el menú se abre solo, con
   *  «Seguir»); on: false, fuera. El badge del botón del menú, los que te quedan */
  descansos(on, n, pedido, ahora) {
    const el = this.menuEl, b = el?.querySelector('.pb-desc'); if (!b) return;
    const D = this.txt.desc || {}, k = `${on}|${n}|${pedido}|${ahora}`; if (b._k === k) return; b._k = k;
    // (en pleno descanso la ventana se abre sola con el título «Descanso» y Continuar lo termina: la fila del descanso se va)
    const PZ = this.txt.pausa || {}, seguir = el.querySelector('.pm-seguir small'), tit = el.querySelector('.pz-tit');
    if (seguir) seguir.textContent = ahora ? (PZ.descAhora || '') : (PZ.seguir?.[1] || '');
    if (tit) tit.textContent = ahora ? (PZ.descanso || D.tuyo || '') : (PZ.titulo || '');
    b.hidden = !on || !!ahora; el.querySelector('.pm-n').textContent = on && n ? n : ''; if (!on) return;
    b.querySelector('.pz-tx b').textContent = pedido ? (D.pedido || 'Pedido') : (D.btn || 'Descanso');
    b.querySelector('.pz-tx small').textContent = pedido ? (PZ.descPedido || '') : (D.quedan ? D.quedan(n) : '');
    b.querySelector('.pz-n').textContent = ahora || pedido ? '' : n; b.disabled = !ahora && !n && !pedido;
    b.classList.toggle('pedido', !!pedido); b.classList.toggle('ahora', !!ahora);
    b.setAttribute('aria-label', `${D.btn || 'Descanso'}: ${D.quedan ? D.quedan(n) : n}`);
    if (ahora !== el._ahora) { el._ahora = ahora; this.abreMenu?.(!!ahora, false); }
  }
  /** El botón del menú brilla si estás cansado y te quedan descansos */
  cansado(on) { this.menuEl?.classList.toggle('llama', !!on); }
  setNames(you, rival) { const a = this.root.querySelector('[data-side=you] span'), b = this.root.querySelector('[data-side=rival] span'); if (a) a.textContent = short(you); if (b) b.textContent = short(rival); }
  setScore(you, rival, server, mid) {
    for (const [k, v] of [['you', you], ['rival', rival]]) {
      const el = this.$(`[data-pel-n=${k}]`), antes = Number(el.textContent), side = el.closest('.pel-side');
      el.textContent = v;
      // (al sumar, la cifra salta y su lado se ilumina: el marcador de la tele)
      if (Number.isFinite(+v) && v !== '' && +v > antes) { el.classList.remove('sube'); side.classList.remove('gana'); void el.offsetWidth; el.classList.add('sube'); side.classList.add('gana'); }
    }
    for (const el of this.root.querySelectorAll('.pel-serve')) el.classList.toggle('on', el.dataset.pelS === server);
    if (mid != null) this.$('[data-pel-mid]').textContent = mid;
  }
  /** El aviso grande del juez. extra: { col ('azul' o 'rojo': la raya de quien gana el tanto), racha (el rótulo de racha) } */
  call(title, sub, kant, secs = 2, extra = null) {
    const c = this.$('.pel-call'); c.querySelector('h3').textContent = title; c.querySelector('p').textContent = sub || '';
    c.classList.remove('c-azul', 'c-rojo'); if (extra?.col) c.classList.add('c-' + extra.col);
    const rc = c.querySelector('.pel-racha'); rc.hidden = !extra?.racha; rc.innerHTML = extra?.racha ? `${LLAMA}<span>${esc(extra.racha)}</span>` : '';
    c.querySelector('p').style.display = sub ? '' : 'none';
    const k = c.querySelector('.pel-kantari'); k.textContent = kant ? `«${kant}»` : ''; k.style.display = kant ? '' : 'none';
    c.classList.add('on'); this.callT = secs; this.root.classList.add('calling');
    // (si se cruza con el marcador de arriba a la derecha, baja justo debajo de él, con su hueco: en el móvil apaisado el
    // rótulo grande pisaba las barras de energía)
    c.style.top = ''; const m = this.$('.pel-top')?.getBoundingClientRect(), a = c.getBoundingClientRect(), R = this.root.getBoundingClientRect();
    if (m && m.width > 0 && a.right > m.left - 12 && a.left < m.right + 12 && a.top < m.bottom + 12) c.style.top = `${Math.round(m.bottom - R.top + 12)}px`;
  }
  /** El rótulo de los comentarios, solo con los subtítulos puestos (comenta.js): c = { rol, texto, r ('n' narra, 'e' explica) }; null lo quita.
   *  Cada frase se ve al menos 2,4 s: si llega otra antes, espera su turno (solo la última que llega) */
  comenta(c) {
    const el = this._com ||= this.$('.pel-com'); if (!el) return;
    if (!c) { el.classList.remove('on'); this.comT = 0; this.comSig = null; return; }
    if (this.comT > 0 && this.comVisto < 2.4) { this.comSig = c; return; }
    this.comVisto = 0; el.className = 'pel-com ' + (c.r === 'e' ? 'e' : 'n');
    el.innerHTML = `<i class="pc-q" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm-6 9a6 6 0 0 0 5 5.9V21h2v-3.1A6 6 0 0 0 18 12h-2a4 4 0 0 1-8 0z" fill="currentColor"/></svg></i><b>${esc(c.rol)}</b><p>${esc(c.texto)}</p>`;
    void el.offsetWidth; el.classList.add('on'); this.comT = Math.min(6, 2.6 + c.texto.length / 30);
  }
  /** La racha de un lado en el marcador: n (tantos seguidos; vacío, se quita) y lo que dice para quien no ve el icono */
  setRacha(side, n, label = '') {
    for (const el of this.root.querySelectorAll('.ps-racha')) {
      const on = el.dataset.pelR === side && !!n, t = on ? String(n) : '';
      if (el._t === t) continue; el._t = t; el.innerHTML = on ? LLAMA : ''; el.classList.toggle('on', on);
      if (on) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', label); el.title = label; } else { el.removeAttribute('aria-label'); el.removeAttribute('title'); }
    }
    this.nombres?.();   // (la llama quita sitio al nombre)
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
  // el cestaño (material.js), en el menú: la pelota en juego y, mientras sacas tú, las tuyas para cambiar (tocando o con la
  // tecla B). rotulo(b): [su clase, su peso]; pista: lo que se puede hacer
  bolas(lista, actual, editable, rotulo, pista) {
    const el = this.menuEl?.querySelector('.pm-bolas'); if (!el) return;
    el.hidden = false;
    const k = lista.map(b => b.n).join() + '|' + (actual?.n ?? '') + '|' + editable + '|' + pista;
    if (el._k === k) return; el._k = k;
    el.querySelector('.pb-pista').textContent = pista;
    el.querySelector('.pb-lista').innerHTML = lista.map(b => { const [c, w] = rotulo(b); return `<button type="button" class="pz-op" data-bola="${b.n}" aria-pressed="${b === actual}"${editable ? '' : ' disabled'}>${BOLA}<b>${esc(c)}</b><small>${esc(w)}</small></button>`; }).join('');
  }
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
  // anillo de carga alrededor del botón que se mantiene (golpe o cortada): la fuerza se ve en él, sin otro recuadro
  // (cansado, la carga tiene tope: el trozo del aro que ya no se alcanza se ve en rojo apagado y, al llegar al tope, el aro
  // se pone naranja en vez de rosa)
  charge(p, kind, tope = 1) {
    for (const [k, sel] of [['hit', '.pel-hit'], ['cut', '.pel-cut'], ['drop', '.pel-dejada']]) {
      const b = this.$(sel); if (!b) continue;
      const v = kind === k ? p : 0, key = v + ':' + tope.toFixed(2); if (b._cp === key) continue; b._cp = key;
      b.style.setProperty('--cp', (v * 100).toFixed(0) + '%'); b.style.setProperty('--tope', (tope * 100).toFixed(0) + '%');
      b.classList.toggle('charging', v > 0); b.classList.toggle('full', v >= 1); b.classList.toggle('tope', v > 0 && tope < 0.99 && v >= tope - 0.01);
    }
  }
  /** El nombre del golpe que se acaba de dar (dos paredes, gancho al ancho, dejada al txoko…), como el rótulo de la tele:
   *  pequeño, bajo el marcador y del color de quien lo da (col: 'azul' o 'rojo') */
  golpe(text, col) {
    const g = this._g ||= this.$('.pel-golpe'); if (!g || !text) return;
    // (justo debajo del marcador, con su borde derecho, que ya lleva dentro la pausa: antes iba a 50 px fijos del borde de
    // arriba y pegado a la derecha, montado sobre las barras de energía. Con las medidas sin zoom)
    const sc = this.$('.pel-score');
    if (sc?.offsetHeight) { g.style.setProperty('--pg-y', `${sc.offsetHeight + 8}px`); g.style.setProperty('--pg-x', '0px'); }
    g.className = 'pel-golpe ' + (col === 'azul' ? 'azul' : 'rojo'); g.textContent = text; void g.offsetWidth; g.classList.add('on'); this.gT = 2.4;
  }
  tick(dt) {
    if (this.gT > 0 && (this.gT -= dt) <= 0) this._g?.classList.remove('on');
    if (this.comT > 0) { this.comVisto += dt; if ((this.comT -= dt) <= 0) this._com?.classList.remove('on'); }
    if (this.comSig && (this.comT <= 0 || this.comVisto >= 2.4)) { const c = this.comSig; this.comSig = null; this.comT = 0; this.comenta(c); }
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
  destroy() { removeEventListener('resize', this.onFit); if (this.fueraMenu) removeEventListener('pointerdown', this.fueraMenu, true); const r = this.root; r.classList.add('pel-fuera'); setTimeout(() => r.remove(), 320); }
}
// el nombre sin su pueblo entre paréntesis («Jokin (Altsasu)» → «Jokin»): en el marcador y en la energía, que son
// estrechos (el pueblo ya sale en la pantalla VS y en el frontón)
const short = (n) => String(n).replace(/\s*\([^)]*\)/g, '');
