// El tráiler v4 (22 de noviembre de 2026), sobre el v3 (mismas voces y música, guion-v3.json). El autor: «Quiero que metas
// imágenes reales del juego, jugando, haciendo misiones, escogiendo un pelotari, hablando en euskera, viendo animales, con
// el basajaun, con la lamia, con los momochorros, con los yoaldunak» y «no metas personajes o fotos de personajes cortados».
// Por eso aquí no hay cartas ni retratos recortados: todo lo de debajo es el juego rodado con su motor (planos-v4.mjs), cada
// vecino con el explorador delante y de cuerpo entero, y encima solo las frases, los rótulos y el logo.
// La historia la cuentan las voces ya grabadas (guion-v3.json): Maite pide las ocho cintas de los danzantes de Muskilda,
// cada vecino sale con su carta y su frase, Salva (la voz del tráiler para inversores) abre y cierra, y el Bobo remata.
// La página se sirve con el servidor de Vite del juego para usar lo del juego tal cual: sus letras (fonts.css, sport.css),
// sus curvas y tiempos (motion.css), su tipografía cinética (cinetica.js: los títulos letra a letra, los antetítulos que
// se juntan) y sus cartas de pelotari (sportCard.js). Todo se mueve con animaciones del navegador (Web Animations y las
// CSS del juego) paradas, que se llevan al instante de cada fotograma (cuadro): así cada fotograma sale exacto.
// Debajo, un lienzo con las láminas, las panorámicas y lo rodado en el juego (rodar.mjs, planos v2 e inversores).
//   /tv3p/<plano>/<n>.jpg  lo rodado (rodar-v3.mjs lo sirve desde la carpeta de planos)
import '../../../src/ui/fonts.css';
import '../../../src/ui/sport.css';
import '../../../src/ui/motion.css';
import { cinetica } from '../../../src/ui/cinetica.js';
import G from '../v3/guion-v3.json';

export const FPS = 24, W = 1920, H = 1080, DURA = G.dura;
const V4 = true;
const URL_JUEGO = 'jonathanvilches.github.io/MENDIZMENDI-';
// el pulso de la música (musica-torneos: el golpe en el 22,98 y el compás de 1,895 s); el tráiler va con la canción
// desde su principio, así la intro tranquila es la presentación y el golpe cae cuando se pierden las cintas
const BAR = 0.4737 * 4, DROP = 22.98, B = (k) => DROP + k * BAR;
const E = { ease: 'cubic-bezier(.2,.9,.3,1)', muelle: 'cubic-bezier(.22,1.12,.36,1)', sale: 'cubic-bezier(.4,0,.2,1)', anticipa: 'cubic-bezier(.5,-.32,.35,1.3)', rebota: 'cubic-bezier(.34,1.56,.64,1)', lin: 'linear' };
const LAM = '/src/assets/laminas/grande/';
const CINTAS = { roja: '#ff3b47', amarilla: '#ffd23a', blanca: '#f6f2ea', verde: '#33d17a', azul: '#3d9bff', rosa: '#ff7ac8', naranja: '#ff8a2a', morada: '#a35bff' };

// ---------- los vecinos: su carta ----------
const VECINOS = {
  maite: { n: 'Maite', k: 'Cinta roja', c: CINTAS.roja, lado: 'izq' },
  itziar: { n: 'Itziar', k: 'Cinta amarilla', c: CINTAS.amarilla, lado: 'izq' },
  joxemari: { n: 'Joxemari', k: 'Cinta blanca', c: CINTAS.blanca, lado: 'izq' },
  kike: { n: 'Kike', k: 'Cinta verde', c: CINTAS.verde, lado: 'izq' },
  joseba: { n: 'Joseba', k: 'Cinta azul', c: CINTAS.azul, lado: 'izq' },
  lamia: { n: 'Lamia', k: 'Cinta morada', c: CINTAS.morada, lado: 'izq' },
  basajaun: { n: 'Basajaun', k: 'Cinta naranja', c: CINTAS.naranja, lado: 'izq' },
  bobo: { n: 'El Bobo', k: 'Fiesta de Muskilda', c: '#ffd36a', lado: 'izq' },
};
// ---------- lo de debajo: láminas, panorámicas y lo rodado ----------
// a-b: cuándo · src: 'l:lámina' (src/assets/laminas/grande), 'p:plano' (rodado), 'negro', 'morado' · kb: la imagen se
// acerca o se aleja [z0, z1, x0, y0, x1, y1] · luz: el color · velo: lo que se oscurece (para leer encima) · entra:
// ['funde'|'negro'|'blanco'|'barre', s] · impacto: golpe de cámara · desde/vel: para lo rodado
// (todo lo de debajo es el juego tal cual, rodado con su motor: rodar.mjs con planos-v3.mjs, y la isla, la manada y la
// pelota de los planos v2; el autor: «aprovecha imágenes del juego. Reales como el zelda»)
const FONDOS = [
  { a: 0, b: 7.45, src: 'p:isla', desde: 4.0, luz: 'mapa', velo: 0.22, entra: ['negro', 1.6] },
  { a: 7.45, b: 13.05, src: 'p:otVuelo', desde: 0.2, luz: 'dia', velo: 0.1, entra: ['funde', 0.9] },
  // (LA CARRERA, 22 nov; el autor: «que el personaje tenga siempre el mismo plano, corriendo o andando, y vaya cambiando el
  // escenario de atrás, de diferentes pueblos, diferentes misiones, diferentes personajes»: carrera.mjs, el explorador
  // siempre en el mismo sitio del encuadre y detrás cada vez otra cosa; los cortes, a corte seco, para que se note)
  { a: 13.05, b: 16.6, src: 'p:cMaite', desde: 0, luz: 'dia', velo: 0.12, entra: ['barre', 0.22] },
  { a: 16.6, b: 19.7, src: 'p:cRio', desde: 0, luz: 'dia', velo: 0.22 },
  { a: 19.7, b: 22.55, src: 'p:cPlaza', desde: 0, luz: 'calido', velo: 0.22 },
  { a: 22.55, b: DROP, src: 'negro' },
  { a: B(0), b: B(2), src: 'p:cValle', desde: 0, luz: 'ocaso', impacto: 1, velo: 0.16, entra: ['blanco', 0.4] },
  // (y corriendo por Navarra, un pueblo en cada medio compás: Pamplona, Puente la Reina, Olite y Elizondo)
  { a: B(2), b: B(2.5), src: 'p:cPamplona', desde: 0.2, luz: 'dia', velo: 0.1, golpe: '#fff2dc' },
  { a: B(2.5), b: B(3), src: 'p:cPuente', desde: 0.2, luz: 'ocaso', velo: 0.1, golpe: '#fff2dc' },
  { a: B(3), b: B(3.5), src: 'p:cOlite', desde: 0.2, luz: 'ocaso', velo: 0.1, golpe: '#fff2dc' },
  { a: B(3.5), b: B(4), src: 'p:cElizondo', desde: 0.2, luz: 'dia', velo: 0.1, golpe: '#fff2dc' },
  // (cada vecino con el explorador delante: «hablando en euskera», con su frase a la izquierda)
  { a: B(4), b: B(6), src: 'p:cItziar', desde: 0, luz: 'calido', velo: 0.12 },
  { a: B(6), b: B(8), src: 'p:cJoxemari', desde: 0, luz: 'dia', velo: 0.12 },
  { a: B(8), b: B(10), src: 'p:cKike', desde: 0, luz: 'calido', velo: 0.12 },
  { a: B(10), b: B(12), src: 'p:cJoseba', desde: 0, luz: 'dia', velo: 0.12 },
  { a: B(12), b: B(14), src: 'p:cLamia', desde: 0, luz: 'ocaso', velo: 0.12 },
  { a: B(14), b: B(17), src: 'p:cBasajaun', desde: 0, luz: 'noche', velo: 0.16, entra: ['negro', 0.25], golpe: '#ffb070' },
  { a: B(17), b: B(18), src: 'morado' },
  // (jugando: «cada vecino te pide ayuda, y cada misión te enseña algo: el pastoreo, el carnaval, las leyendas. La
  // naturaleza y la cultura, contadas jugando», cada cosa con su imagen cuando se dice)
  { a: B(18), b: 61.42, src: 'p:v4Mision', desde: 0, luz: 'dia', velo: 0, entra: ['blanco', 0.3] },
  { a: 61.42, b: 62.32, src: 'p:cOvejas', desde: 0.2, luz: 'dia', velo: 0.1, golpe: '#fff2dc' },
  { a: 62.32, b: 63.42, src: 'p:cJoaldunak', desde: 0.2, luz: 'dia', velo: 0.1, golpe: '#fff2dc' },
  { a: 63.42, b: 64.78, src: 'p:cMomotxorros', desde: 0, luz: 'noche', velo: 0.1, golpe: '#ff8a5a' },
  { a: 64.78, b: 66.86, src: 'p:v4Caballo', desde: 0.1, luz: 'ocaso', velo: 0.1, golpe: '#fff2dc' },
  { a: 66.86, b: B(24), src: 'p:v4Lamina', desde: 0.2, luz: 'mapa', velo: 0, kb: [1.14, 1.2, 0.5, 0.44, 0.5, 0.44], entra: ['barre', 0.22] },
  // (la pelota: elegir pelotari en la pantalla del juego y a jugar)
  { a: B(24), b: B(25), src: 'p:v4Elige', desde: 0, luz: 'mapa', velo: 0, entra: ['blanco', 0.3] },
  { a: B(25), b: B(26), src: 'p:pelotari', desde: 0.75, luz: 'calido', impacto: 1, velo: 0.12 },
  { a: B(26), b: B(27), src: 'p:pelotariAtras', desde: 0.8, luz: 'calido', velo: 0.25, entra: ['barre', 0.22] },
  { a: B(27), b: B(28), src: 'morado', entra: ['blanco', 0.3] },
  { a: B(28), b: B(30), src: 'p:cIrati', desde: 0, luz: 'dia', velo: 0.16, entra: ['funde', 0.5] },
  { a: B(30), b: B(32), src: 'p:cBobo', desde: 0, luz: 'calido', velo: 0.12 },
  { a: B(32), b: DURA + 1, src: 'p:isla', desde: 9.0, vel: 0.3, luz: 'mapa', velo: 0.5, entra: ['blanco', 0.7] },
];
// (fogonazos blancos: cuándo, cuánto, cuánto dura)
const DESTELLOS = [[DROP, 1, 0.55], [B(17), 0.35, 0.3], [B(18), 0.6, 0.35], [B(24), 0.6, 0.35], [B(27), 0.6, 0.4], [B(32), 1, 0.7]];
const IMPACTOS = [[DROP, 1], [B(2), 0.3], [B(2.5), 0.3], [B(3), 0.3], [B(3.5), 0.3], [B(4), 0.4], [B(8), 0.4], [B(12), 0.4], [B(14), 0.7], [B(18), 0.6], [61.42, 0.35], [62.32, 0.45], [63.42, 0.6], [B(25), 1], [B(27), 0.7], [B(32), 0.8]];

// ---------- utilidades ----------
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const ease = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - cl(x), 3);
const easeOutExpo = (x) => (x = cl(x)) >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const ruido = (t, k) => Math.sin(t * 91.7 + k * 13.1) * 0.6 + Math.sin(t * 57.3 + k * 4.7) * 0.4;
const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const llano = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zñ0-9]/g, '');
const h = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- el tiempo: animaciones paradas que se llevan a cada fotograma ----------
const ANIMS = [];
// una animación de todo el tráiler para un elemento: kfs = [[t, {propiedades}, curva del tramo que empieza ahí], ...]
// (una sola por elemento y propiedad: dos con relleno se pisaban; lo que no lleva un fotograma clave, se arrastra)
function vida(el, kfs) {
  kfs = kfs.slice().sort((x, y) => x[0] - y[0]);
  const props = new Set(kfs.flatMap(([, p]) => Object.keys(p)));
  let prev = {};
  const lleno = kfs.map(([t, p, e]) => { const q = { ...prev, ...p }; prev = q; return [t, q, e]; });
  // (hacia atrás también: el primero lleva todo lo que sale después)
  const first = {}; for (const k of props) for (const [, q] of lleno) if (q[k] != null) { first[k] = q[k]; break; }
  const fr = [{ offset: 0, ...first, ...lleno[0][1], easing: 'linear' }];
  for (const [t, q, e] of lleno) fr.push({ offset: cl(t / DURA), ...first, ...q, easing: e || 'linear' });
  fr.push({ offset: 1, ...first, ...lleno[lleno.length - 1][1] });
  const a = el.animate(fr, { duration: DURA * 1000, fill: 'both' }); a.pause(); ANIMS.push(a); return a;
}
// visible de a a b, con fundido de entrada y salida
function ventana(el, a, b, dentro = 0.2, fuera = 0.2) {
  return vida(el, [[a - 0.002, { opacity: 0, visibility: 'hidden' }], [a, { opacity: 0, visibility: 'visible' }], [a + dentro, { opacity: 1 }], [b - fuera, { opacity: 1 }], [b, { opacity: 0, visibility: 'visible' }], [b + 0.002, { opacity: 0, visibility: 'hidden' }]]);
}

// ---------- el escenario ----------
const CSS = `
html,body{margin:0;background:#000;overflow:hidden}
#esc{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#000;font-family:var(--f-ui);color:#fff}
#esc canvas{position:absolute;inset:0}
.capa{position:absolute;inset:0;pointer-events:none}
.vis{visibility:hidden}
/* la carta del vecino: la tarjeta del juego, con su esquina, su filo de color y su sombra; el retrato de Meshy dentro */
.vc{position:absolute;top:150px;width:540px;height:720px;perspective:1600px}
.vc.izq{left:130px}.vc.der{right:130px}
/* (con el juego de verdad detrás, la carta algo más pequeña: el vecino se ve en el plano, al otro lado) */
.vc{top:150px;scale:.7}.vc.izq{transform-origin:0 0}.vc.der{transform-origin:100% 0}
.vc-mov,.vc-flota{position:absolute;inset:0;transform-style:preserve-3d}
.vc-flota{animation:vcFlota 5s ease-in-out infinite alternate}
@keyframes vcFlota{from{transform:translateY(-7px) rotateZ(-.4deg)}to{transform:translateY(7px) rotateZ(.4deg)}}
.vc-card{position:absolute;inset:0;border-radius:10px;overflow:hidden;isolation:isolate;
  background:radial-gradient(120% 75% at 50% 4%,color-mix(in srgb,var(--c) 52%,transparent),transparent 62%),linear-gradient(180deg,#2b0f5e,#12052a 78%);
  box-shadow:0 36px 80px rgba(4,1,12,.62),0 0 0 1.5px color-mix(in srgb,var(--c) 85%,#fff),0 0 42px color-mix(in srgb,var(--c) 38%,transparent)}
.vc-eco{position:absolute;left:-40px;right:-40px;top:20px;font:400 300px/.82 var(--f-display);text-transform:uppercase;color:transparent;-webkit-text-stroke:2px color-mix(in srgb,var(--c) 34%,transparent);white-space:nowrap;letter-spacing:-.02em}
.vc-pj{position:absolute;left:50%;bottom:120px;width:640px;height:800px;margin-left:-320px;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 18px 30px rgba(6,1,16,.55))}
.vc-luz{position:absolute;top:-30%;bottom:-30%;left:0;width:42%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);transform:translateX(-140%) skewX(-18deg);mix-blend-mode:screen}
.vc-pie{position:absolute;left:0;right:0;bottom:0;padding:120px 36px 32px;background:linear-gradient(180deg,transparent,rgba(12,4,28,.86) 48%,rgba(12,4,28,.96))}
.vc-k{display:block;font:900 23px/1.2 var(--f-ui);letter-spacing:.22em;text-transform:uppercase;color:var(--c);text-shadow:0 2px 10px rgba(6,1,16,.8)}
.vc-n{display:block;margin-top:6px;font:400 118px/.9 var(--f-display);text-transform:uppercase;color:#fff;text-shadow:0 6px 0 rgba(20,6,40,.35),0 0 30px rgba(255,122,200,.25)}
.vc-cinta{position:absolute;top:-34px;width:300px;height:520px;overflow:visible;transform-origin:50% 0;animation:vcCinta 3.2s ease-in-out infinite alternate}
.vc.izq .vc-cinta{right:-120px}.vc.der .vc-cinta{left:-120px;transform:scaleX(-1)}
@keyframes vcCinta{from{rotate:-3deg}to{rotate:4deg}}
.vc.der .vc-cinta{animation-name:vcCintaD}@keyframes vcCintaD{from{rotate:3deg}to{rotate:-4deg}}
/* la frase del vecino, al lado de su carta, palabra a palabra con su voz */
.cita{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:1000px}
.cita.izq{left:800px}.cita.der{left:150px}
/* (y la frase abajo, a la altura del pecho del vecino, para que su cara quede limpia) */
.cita{top:auto;bottom:64px;justify-content:flex-end;width:660px}.cita.izq{left:130px}.cita.der{left:auto;right:130px}
.cita p{font-size:calc(var(--fs,84px) * .66)!important}
.cita p{margin:0;font:400 var(--fs,84px)/1 var(--f-display);text-transform:uppercase;color:#fff;text-shadow:0 4px 0 rgba(20,6,40,.45),0 0 26px rgba(10,2,30,.7);text-wrap:balance}
.cita p .w{display:inline-block;margin-right:.22em}
.cita p .em{color:var(--c)}
.cita .marca{display:block;width:120px;height:6px;border-radius:3px;margin:0 0 26px;background:var(--c);transform-origin:0 50%;box-shadow:0 0 16px var(--c)}
.fila{display:flex;gap:18px;margin-top:34px}
.fila .ch{width:84px;height:22px;border-radius:5px;box-shadow:0 0 14px currentColor;background:currentColor}
.mini{width:190px;border-radius:10px;overflow:hidden;background:#1b0b3d;box-shadow:0 18px 40px rgba(4,1,12,.55),0 0 0 1px rgba(255,255,255,.12)}
.mini img{display:block;width:100%;height:150px;object-fit:cover}
.mini.esc img{object-fit:contain;padding:12px;box-sizing:border-box;background:radial-gradient(circle at 50% 40%,#3a1a6e,#160830)}
.mini b{display:block;padding:9px 12px 11px;font:800 18px/1.15 var(--f-cond);letter-spacing:.04em;text-transform:uppercase}
/* abajo, lo que dicen la narradora y Salva */
.sub{position:absolute;left:160px;right:160px;bottom:84px;text-align:center}
.sub p{display:inline;margin:0;font:600 46px/1.3 var(--f-ui);color:#fff;text-shadow:0 2px 4px rgba(6,1,16,.9),0 0 24px rgba(6,1,16,.8)}
.sub .w{display:inline-block;margin-right:.26em}
/* las frases grandes del centro */
.frase{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center}
.frase .l{display:block;max-width:1640px;text-wrap:balance;font:400 104px/1 var(--f-display);text-transform:uppercase;color:#fff;text-shadow:0 6px 0 rgba(20,6,40,.45),0 0 40px rgba(255,122,200,.35)}
.frase .l.oro{color:#ffd36a}
.frase .k{font:900 26px/1.2 var(--f-ui);letter-spacing:.3em;text-transform:uppercase;color:#ffd36a;margin-bottom:10px}
.grito .l{font-size:136px;line-height:.98}
.golpe .l{font-size:250px;line-height:.9}
/* el rótulo de la tele del juego (ui/rotulo.css), en grande */
.rot{position:absolute;left:120px;bottom:120px;display:flex;gap:18px;padding:18px 40px 20px 18px;border-radius:14px;background:linear-gradient(180deg,rgba(26,12,52,.94),rgba(16,7,34,.9));box-shadow:0 20px 50px rgba(4,1,12,.5),inset 0 1px 0 rgba(255,255,255,.06)}
.rot.peq{bottom:auto;top:84px;padding:12px 30px 14px 12px;gap:14px}
.rot.arriba{bottom:auto;top:176px}   /* (debajo de la banda de cine de arriba, lejos de los subtítulos) */
.rot-b{flex:none;width:6px;border-radius:3px;background:var(--c,#ff3fcf);transform-origin:50% 0}
.rot-k,.rot-t{display:block;overflow:hidden}
.rot-k>span{display:block;font:800 24px/1.2 var(--f-cond);letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--c,#ff3fcf) 55%,#fff)}
.rot-t{margin-top:6px}.rot-t>span{display:block;font:400 64px/1.02 var(--f-display);text-transform:uppercase}
.rot.peq .rot-k>span{font-size:19px}.rot.peq .rot-t>span{font-size:46px}
/* la cuenta de comarcas y pueblos */
.cuenta{position:absolute;left:0;right:0;top:110px;display:flex;justify-content:center;gap:70px;padding:30px 0 40px;background:radial-gradient(42% 60% at 50% 50%,rgba(12,4,28,.62),rgba(12,4,28,0))}
.cuenta div{display:flex;flex-direction:column;align-items:center}
.cuenta b{font:400 170px/.9 var(--f-display);color:#fff;text-shadow:0 6px 0 rgba(20,6,40,.45),0 0 40px rgba(255,122,200,.4);font-variant-numeric:tabular-nums}
.cuenta small{font:900 28px/1.2 var(--f-ui);letter-spacing:.3em;text-transform:uppercase;color:#ffd36a;text-shadow:0 2px 6px rgba(6,1,16,.95),0 0 18px rgba(6,1,16,.8)}
/* cartas de pelotari (sportCard.js, sport.css) y de campeonato */
.fan{position:absolute;left:0;right:0;top:170px;height:760px}
.fan .pc{position:absolute;left:50%;top:40px}
.torneo{position:absolute;top:190px;width:640px;height:520px;border-radius:10px;overflow:hidden;box-shadow:0 30px 70px rgba(4,1,12,.6),0 0 0 1.5px rgba(255,122,200,.7),0 0 40px rgba(255,43,214,.3)}
.torneo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.torneo div{position:absolute;left:0;right:0;bottom:0;padding:90px 30px 26px;background:linear-gradient(180deg,transparent,rgba(12,4,28,.94) 55%)}
.torneo small{display:block;font:900 20px/1.2 var(--f-ui);letter-spacing:.2em;text-transform:uppercase;color:#ff7ac8}
.torneo b{display:block;margin-top:4px;font:400 72px/.95 var(--f-display);text-transform:uppercase}
/* las láminas del juego en dos filas que corren */
.rail{position:absolute;left:-200px;right:-200px;display:flex;gap:28px}
.lam{flex:none;width:420px;height:300px;border-radius:10px;overflow:hidden;position:relative;box-shadow:0 22px 50px rgba(4,1,12,.6),0 0 0 1px rgba(255,255,255,.14)}
.lam img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.lam span{position:absolute;left:0;right:0;bottom:0;padding:44px 18px 14px;font:800 24px/1.1 var(--f-cond);letter-spacing:.03em;text-transform:uppercase;background:linear-gradient(180deg,transparent,rgba(10,3,24,.9))}
/* el aviso del juego (misión completada) */
.aviso{position:absolute;left:96px;top:96px;display:flex;align-items:center;gap:26px;padding:22px 44px 22px 22px;border-radius:10px;background:rgba(16,7,34,.9);box-shadow:0 14px 40px rgba(8,2,20,.6),0 0 0 1.5px rgba(255,122,200,.75)}
.aviso i{width:84px;height:84px;border-radius:10px;background:linear-gradient(135deg,#7dffb0,#1fa864);display:grid;place-items:center}
.aviso small{display:block;font:900 22px/1.2 var(--f-ui);letter-spacing:.2em;text-transform:uppercase;color:#8dffbe}
.aviso b{display:block;margin-top:4px;font:400 50px/1 var(--f-display);text-transform:uppercase}
/* el logo, como el de la entrada del juego (hub/inicio.css, .m3-titulo) */
.logo3{position:absolute;left:0;right:0;top:330px;display:flex;flex-direction:column;align-items:center;gap:18px}
.logo3 .lg{display:flex;font:400 250px/1 var(--f-display);letter-spacing:.02em;filter:drop-shadow(0 .05em 0 #6d3b5c) drop-shadow(0 .04em .12em rgba(20,6,40,.6)) drop-shadow(0 0 .4em rgba(255,122,200,.55))}
.logo3 .lg i{display:inline-block;font-style:normal;color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(100deg,#fff 0 42%,#ffe39a 47%,#fffbe8 50%,#ffe39a 53%,#fff 58% 100%);background-size:400% 100%;background-position:100% 0}
.logo3 small{font:900 34px/1.2 var(--f-ui);letter-spacing:.24em;text-transform:uppercase;color:#ffd36a;text-shadow:0 2px 10px rgba(10,2,30,.85)}
.logo3 .cu{font:800 30px/1.2 var(--f-cond);letter-spacing:.14em;text-transform:uppercase;color:#f1e8ff;opacity:.9}
.logo3 .ya{margin-top:40px;font:400 66px/1 var(--f-display);letter-spacing:.08em;text-transform:uppercase;color:#fff}
.logo3 .url{font:600 30px/1.2 var(--f-ui);letter-spacing:.06em;color:#f1e8ff}
.bandas i{position:absolute;left:0;right:0;height:${Math.round(H * 0.115)}px;background:#000}
.bandas i:first-child{top:0}.bandas i:last-child{bottom:0}
`;

let fondo, fx, capas;
function escenario() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const esc = h('div'); esc.id = 'esc'; document.body.appendChild(esc);
  fondo = document.createElement('canvas'); fondo.width = W; fondo.height = H; esc.appendChild(fondo);
  capas = h('div', 'capa'); esc.appendChild(capas);
  fx = h('div', 'capa'); esc.appendChild(fx);
}

// ---------- palabras con su voz ----------
const SEG = Object.fromEntries(G.voces.map(v => [v.id, v]));
// cada palabra, con el instante en que se dice (repartidas en su trozo por lo que mide cada una)
function palabras(v) {
  const out = [];
  for (const [s0, s1, txt] of v.seg) {
    const ws = txt.split(/\s+/).filter(Boolean), pesos = ws.map(w => w.length + 1), tot = pesos.reduce((a, b) => a + b, 0);
    let acc = 0;
    ws.forEach((w, i) => { out.push({ w, t: v.t + (s0 - v.de) + (s1 - s0) * 0.9 * acc / tot }); acc += pesos[i]; });
  }
  return out;
}
const fin = (v) => v.t + (v.a - v.de);
const DESTACA = new Set(['otsagabia', 'muskilda', 'ocho', 'cintas', 'escudos', 'piedra', 'joxemari', 'pastor', 'pelota', 'kike', 'irati', 'joseba', 'oro', 'plof', 'basajaun', 'bosque', 'maite', 'danzantes', 'trajes', 'personita']);
function frasePalabras(p, ws, { dy = 0.42, dur = 0.42, curva = E.muelle } = {}) {
  for (const { w, t } of ws) {
    const s = h('span', 'w' + (DESTACA.has(llano(w)) ? ' em' : ''), esc(w)); p.appendChild(s);
    vida(s, [[t - 0.001, { opacity: 0, transform: `translateY(${dy}em) scale(.9)` }], [t, { opacity: 0, transform: `translateY(${dy}em) scale(.9)` }, curva], [t + dur, { opacity: 1, transform: 'none' }]]);
  }
}

// la frase de un vecino junto a su carta (una «página» por voz; la siguiente voz del mismo vecino la sustituye)
function cita(v, b, extra) {
  const V = VECINOS[v.quien], el = h('div', `cita ${V.lado}`); el.style.setProperty('--c', V.c);
  const ws = palabras(v), largo = ws.reduce((n, x) => n + x.w.length + 1, 0);
  el.style.setProperty('--fs', (largo < 26 ? 112 : largo < 48 ? 96 : largo < 70 ? 84 : 72) + 'px');
  const marca = h('i', 'marca'), p = h('p'); el.append(marca, p);
  frasePalabras(p, ws);
  capas.appendChild(el);
  const a = ws[0].t - 0.25;
  ventana(el, a, b, 0.15, 0.25);
  vida(marca, [[a, { transform: 'scaleX(0)' }, E.ease], [a + 0.5, { transform: 'scaleX(1)' }]]);
  vida(el, [[b - 0.3, { transform: 'none' }, E.sale], [b, { transform: 'translateY(-30px)' }]]);
  if (extra) extra(el, a, b);
}

function sub(v, hasta = null) {
  const el = h('div', 'sub'), p = h('p'); el.appendChild(p);
  frasePalabras(p, palabras(v), { dy: 0.3, dur: 0.3, curva: E.ease });
  capas.appendChild(el);
  ventana(el, v.t - 0.1, hasta ?? fin(v) + 0.45, 0.1, hasta ? 0.15 : 0.3);
}

// una frase grande del centro: cada trozo de la voz en su línea, letra a letra (cinetica, «sube»)
function frase(v, { cls = '', kicker = '', hasta = null, estilo = 'sube' } = {}) {
  const el = h('div', 'frase ' + cls);
  if (kicker) { const k = h('span', 'k', esc(kicker)); el.appendChild(k); cinetica(k, { estilo: 'junta', retardo: (v.t - 0.1) * 1000 }); }
  v.seg.forEach(([s0, , txt], i) => {
    const l = h('span', 'l' + (i === 1 && cls !== 'grito' ? ' oro' : ''), esc(txt)); el.appendChild(l);
    cinetica(l, { estilo, retardo: (v.t + (s0 - v.de)) * 1000, paso: estilo === 'cae' ? 28 : 22 });
  });
  capas.appendChild(el);
  const b = hasta ?? fin(v) + 0.5;
  ventana(el, v.t - 0.1, b, 0.05, 0.35);
  vida(el, [[b - 0.35, { transform: 'none', filter: 'blur(0px)' }, E.sale], [b, { transform: 'translateY(-40px) scale(1.04)', filter: 'blur(8px)' }]]);
  return el;
}

// el rótulo de la tele (el antetítulo se desliza y se junta, el título sube letra a letra detrás de la máscara)
function rotulo(a, b, k, t, { c = '#ff3fcf', peq = false, arriba = false } = {}) {
  const el = h('div', 'rot' + (peq ? ' peq' : '') + (arriba ? ' arriba' : ''), `<i class="rot-b"></i><div><span class="rot-k"><span>${esc(k)}</span></span><span class="rot-t"><span>${esc(t)}</span></span></div>`);
  el.style.setProperty('--c', c); capas.appendChild(el);
  ventana(el, a, b, 0.01, 0.22);
  vida(el, [[a, { transform: 'translateY(-12px) scale(.98)' }, E.muelle], [a + 0.38, { transform: 'none' }], [b - 0.22, { transform: 'none' }, E.sale], [b, { transform: 'translateY(-10px)' }]]);
  vida(el.querySelector('.rot-b'), [[a + 0.06, { transform: 'scaleY(0)' }, E.ease], [a + 0.36, { transform: 'scaleY(1)' }]]);
  vida(el.querySelector('.rot-k>span'), [[a + 0.12, { transform: 'translateX(-28px)', opacity: 0 }, E.ease], [a + 0.72, { transform: 'none', opacity: 1 }]]);
  cinetica(el.querySelector('.rot-k>span'), { estilo: 'junta', retardo: (a + 0.11) * 1000 });
  cinetica(el.querySelector('.rot-t>span'), { estilo: 'sube', retardo: (a + (peq ? 0.12 : 0.42)) * 1000, paso: peq ? 12 : undefined });
}

// las ocho cintas: salen del centro y se pierden por el valle (en el golpe) o vuelven al centro (al final)
function cintas(a, b, vuelven = false) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'capa'); svg.style.overflow = 'visible';
  const cols = Object.values(CINTAS), cx = W / 2, cy = H / 2;
  cols.forEach((c, i) => {
    const an = (i / 8) * Math.PI * 2 + 0.3, L = 1500, sw = (i % 2 ? 1 : -1) * 0.9;
    const pt = (k, o) => { const r = L * k, aa = an + sw * Math.sin(k * 3.1) * 0.5 + o; return `${(cx + Math.cos(aa) * r).toFixed(1)} ${(cy + Math.sin(aa) * r * 0.62).toFixed(1)}`; };
    const d = `M${pt(0.02, 0)} C ${pt(0.25, 0.5)}, ${pt(0.4, -0.4)}, ${pt(0.55, 0.1)} S ${pt(0.85, 0.5)}, ${pt(1.05, 0)}`;
    for (const [w, col] of [[34, c], [7, 'rgba(255,255,255,.5)']]) {
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', col); p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round');
      p.style.strokeDasharray = '2400'; svg.appendChild(p);
      const d0 = a + i * 0.035;
      if (!vuelven) vida(p, [[d0, { strokeDashoffset: 2400, opacity: 1 }, E.ease], [d0 + 0.9, { strokeDashoffset: 0, opacity: 1 }, E.sale], [b - 0.6, { strokeDashoffset: -1400, opacity: 1 }], [b, { strokeDashoffset: -2400, opacity: 0 }]]);
      else vida(p, [[d0, { strokeDashoffset: -2400, opacity: 0 }, E.ease], [d0 + 0.2, { strokeDashoffset: -2000, opacity: 1 }, E.ease], [b - 0.5, { strokeDashoffset: -200, opacity: 1 }, E.anticipa], [b, { strokeDashoffset: 0, opacity: 1 }]]);
    }
  });
  if (vuelven) svg.style.transform = 'scaleX(-1)';
  capas.prepend(svg); ventana(svg, a, b + 0.05, 0.01, 0.12);
}

// ---------- todo lo de encima, a su hora ----------
function monta() {
  // las bandas de cine de la presentación, que se abren con el golpe
  const bandas = h('div', 'capa bandas', '<i></i><i></i>'); fx.appendChild(bandas);
  for (const [k, i] of [[0, bandas.children[0]], [1, bandas.children[1]]]) vida(i, [[DROP, { transform: 'none' }, 'cubic-bezier(.16,1,.3,1)'], [DROP + 0.32, { transform: `translateY(${k ? 100 : -100}%)` }]]);
  // los fogonazos
  for (const [t0, f, d] of DESTELLOS) { const w = h('div', 'capa'); w.style.background = '#fff4e6'; fx.appendChild(w); vida(w, [[t0 - 0.001, { opacity: 0 }], [t0, { opacity: f }, 'cubic-bezier(.3,0,.7,1)'], [t0 + d, { opacity: 0 }]]); }
  // el final se va a negro
  const negro = h('div', 'capa'); negro.style.background = '#000'; fx.appendChild(negro); vida(negro, [[DURA - 1.6, { opacity: 0 }, E.ease], [DURA - 0.3, { opacity: 1 }]]);

  // (sin cartas: el vecino se ve entero en el plano, con el explorador delante)

  // las voces: su texto
  const V = SEG;
  frase(V['salva-tierra'], { hasta: 7.35 });
  rotulo(7.95, 12.95, 'Valle de Salazar · Pirineo', 'Otsagabia', { c: '#ff7ac8', arriba: true });
  sub(V['nico-otsa']);
  cita(V['maite-kaixo'], 16.55);
  cita(V['maite-fiesta'], 22.45, (el, a, b) => {
    // (las ocho cintas, como casillas de una colección, una detrás de otra; en el silencio salen volando)
    const f = h('div', 'fila'); el.appendChild(f); const t0 = 20.15;
    Object.values(CINTAS).forEach((c, i) => {
      const ch = h('i', 'ch'); ch.style.color = c; f.appendChild(ch);
      const ang = (rnd() - 0.5) * 80, dx = (rnd() - 0.5) * 900, dy = -300 - rnd() * 500;
      vida(ch, [[t0 + i * 0.09, { opacity: 0, transform: 'translateY(20px) scale(.6)' }, E.rebota], [t0 + i * 0.09 + 0.4, { opacity: 1, transform: 'none' }], [22.1, { opacity: 1, transform: 'none' }, 'cubic-bezier(.5,0,.9,.6)'], [22.5, { opacity: 0, transform: `translate(${dx}px, ${dy}px) rotate(${ang * 4}deg)` }]]);
    });
  });
  frase(V['maite-perdido'], { cls: 'grito', estilo: 'cae', hasta: 25.6 });
  cintas(DROP + 0.05, 26.6);
  sub(V['maite-siete']);
  cita(V['itziar'], B(6) - 0.15);
  cita(V['joxemari'], B(8) - 0.15);
  cita(V['kike'], B(10) - 0.15);
  cita(V['joseba'], B(12) - 0.15);
  cita(V['lamia'], B(14) - 0.15);
  cita(V['basajaun-a'], 52.25);
  cita(V['basajaun-b'], B(17) - 0.15);
  // «Y esto es solo un pueblo.»
  frase({ t: B(17) + 0.12, de: 0, a: BAR - 0.3, seg: [[0, 1, 'Y esto es solo un pueblo.']] }, { hasta: B(18) - 0.02 });
  // (los sitios del carnaval, con el rótulo de la tele del juego)
  rotulo(62.36, 63.36, 'Carnaval · Ituren', 'Joaldunak', { peq: true, c: '#ffd36a' });
  rotulo(63.46, 64.72, 'Carnaval · Altsasu', 'Momotxorros', { peq: true, c: '#ff7ac8' });
  rotulo(66.9, B(24) - 0.06, 'Por dentro · oficios', 'La ferrería', { peq: true, c: '#ffd36a' });
  sub(V['salva-vecinos']); sub(V['salva-naturaleza']);

  // Juega: la pantalla de elegir pelotari del juego y, en el golpe, la palabra grande sobre el partido
  frase({ t: B(25) + 0.03, de: 0, a: 1, seg: [[0, 1, 'Juega']] }, { cls: 'golpe', kicker: 'Pelota vasca', estilo: 'cae', hasta: B(26) - 0.05 });
  sub(V['kike-campeon'], B(27) - 0.02);

  // Descubre: imágenes del juego en dos filas que corren, y el Basajaun
  frase({ t: B(27) + 0.03, de: 0, a: 1, seg: [[0, 1, 'Descubre']] }, { cls: 'golpe', kicker: 'Leyendas · oficios · fiestas', estilo: 'cae', hasta: B(28) - 0.05 });
  frase(V['basajaun-tag'], { hasta: B(30) - 0.05 });

  // el final: el Bobo, las cintas que vuelven y el aviso de misión completada
  cita(V['bobo-cintas'], B(32) - 0.06);
  cintas(B(31) - 0.7, B(32) - 0.02, true);
  const av = h('div', 'aviso', '<i><svg width="44" height="44" viewBox="-22 -22 44 44"><path d="M-14 1 L-4 11 L15 -10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></i><div><small>Misión completada</small><b>Las ocho cintas</b></div>');
  capas.appendChild(av); ventana(av, B(30) + 0.5, B(32) - 0.1, 0.01, 0.25);
  vida(av, [[B(30) + 0.5, { transform: 'translateX(-60px)' }, 'cubic-bezier(.16,1,.3,1)'], [B(30) + 0.9, { transform: 'none' }]]);

  // el logo
  const lg = h('div', 'logo3', `<div class="lg">${[...'HERRIZHERRI'].map((l, i) => `<i style="--i:${i}">${l}</i>`).join('')}</div><small>Navarra, pueblo a pueblo</small><div class="cu">12 comarcas · 38 pueblos</div><div class="ya">Ya puedes jugar</div><div class="url">${URL_JUEGO}</div>`);
  capas.appendChild(lg); ventana(lg, B(32), DURA + 1, 0.01, 0.1);
  const t0 = B(32) + 0.05;
  lg.querySelectorAll('.lg i').forEach((el, i) => vida(el, [[t0 + i * 0.045, { opacity: 0, transform: 'translateY(-.5em) scale(1.25)', backgroundPosition: '100% 0' }, E.rebota], [t0 + i * 0.045 + 0.6, { opacity: 1, transform: 'none' }], [t0 + 0.8 + i * 0.06, { backgroundPosition: '100% 0' }, E.ease], [t0 + 1.9 + i * 0.06, { backgroundPosition: '0% 0' }]]));
  const tg = lg.querySelector('small'); cinetica(tg, { estilo: 'junta', retardo: (V['salva-navarra'].t + 0.05) * 1000 });
  vida(lg.querySelector('.ya'), [[88.0, { opacity: 0, transform: 'translateY(16px)' }, E.ease], [88.6, { opacity: 1, transform: 'none' }]]);
  vida(lg.querySelector('.url'), [[88.5, { opacity: 0, transform: 'translateY(12px)' }, E.ease], [89.1, { opacity: 0.92, transform: 'none' }]]);
  vida(lg, [[B(32), { transform: 'scale(1.05)' }], [DURA, { transform: 'scale(.97)' }]]);
  sub(V['bobo-fiesta']);
}
const CUENTAS = [];

// ---------- el lienzo de debajo (como montaje-v2.js) ----------
let CUANTOS = {};
const cache = new Map();
function carga(url) {
  let p = cache.get(url);
  if (!p) { p = new Promise((ok, mal) => { const im = new Image(); im.onload = () => im.decode().then(() => ok(im), () => ok(im)); im.onerror = () => mal(new Error('falta ' + url)); im.src = url; }); cache.set(url, p); if (cache.size > 160) cache.delete(cache.keys().next().value); }
  return p;
}
const urlDe = (T, t) => {
  const k = T.src.slice(0, 1), r = T.src.slice(2);
  if (k === 'p') { const n = CUANTOS[r] || 1, i = cl(Math.round(((t - T.a) * (T.vel || 1) + (T.desde || 0)) * FPS), 0, n - 1); return `/tv3p/${r}/${String(i).padStart(4, '0')}.jpg`; }
  return LAM + r + '.webp';
};
const LUZ = {
  noche: { f: 'saturate(0.9) contrast(1.12) brightness(0.9)', tono: ['#4a3ab8', 0.45], mult: ['#3a2f86', 0.16], vin: 0.6 },
  dia: { f: 'saturate(1.12) contrast(1.06)', tono: ['#ffcf80', 0.18], velo: ['#fff0cc', 0.08], vin: 0.36 },
  ocaso: { f: 'saturate(1.12) contrast(1.06)', tono: ['#ff9a52', 0.3], velo: ['#ffc58a', 0.12], vin: 0.44 },
  calido: { f: 'saturate(1.1) contrast(1.06)', tono: ['#ffb066', 0.22], velo: ['#ffd9a8', 0.08], vin: 0.42 },
  mapa: { f: 'saturate(1.08) contrast(1.05)', velo: ['#fff0cc', 0.06], vin: 0.3 },
};
let vinC;
function prepLienzo() {
  vinC = document.createElement('canvas'); vinC.width = W; vinC.height = H; const x = vinC.getContext('2d');
  const g = x.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 1.02); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
}
function gradua(x, luz) {
  const L = LUZ[luz] || LUZ.dia;
  if (L.tono) { x.globalCompositeOperation = 'soft-light'; x.globalAlpha = L.tono[1]; x.fillStyle = L.tono[0]; x.fillRect(0, 0, W, H); }
  if (L.mult) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = L.mult[1]; x.fillStyle = L.mult[0]; x.fillRect(0, 0, W, H); }
  if (L.velo) { const g = x.createLinearGradient(0, 0, W * 0.3, H * 0.9); g.addColorStop(0, L.velo[0]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'screen'; x.globalAlpha = L.velo[1]; x.fillStyle = g; x.fillRect(0, 0, W, H); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = L.vin; x.drawImage(vinC, 0, 0); x.globalAlpha = 1;
}
const fuerza = (t) => IMPACTOS.reduce((m, [ti, k]) => t >= ti && t - ti < 0.6 ? Math.max(m, k * Math.exp(-(t - ti) * 9)) : m, 0);
const veloDe = (T, t) => { if (!T.veloEn) return T.velo || 0; const V = T.veloEn; if (t <= V[0][0]) return V[0][1]; for (let i = 1; i < V.length; i++) if (t <= V[i][0]) return lerp(V[i - 1][1], V[i][1], ease((t - V[i - 1][0]) / (V[i][0] - V[i - 1][0]))); return V[V.length - 1][1]; };
async function toma(x, T, t, dx = 0) {
  if (T.src === 'negro') { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); return; }
  if (T.src === 'morado') {
    const g = x.createRadialGradient(W * 0.85, -H * 0.1, 0, W * 0.85, -H * 0.1, W); g.addColorStop(0, '#5b1a7a'); g.addColorStop(0.6, '#1e0a44'); g.addColorStop(1, '#07020f');
    x.fillStyle = g; x.fillRect(0, 0, W, H); return;
  }
  const im = await carga(urlDe(T, t)), L = LUZ[T.luz] || LUZ.dia, F = fuerza(t);
  const z = 1 + 0.03 * Math.exp(-(t - T.a) * 8) + F * 0.06, sx = F * 20 * ruido(t, 1), sy = F * 14 * ruido(t, 2);
  x.save(); x.filter = L.f; x.imageSmoothingQuality = 'high';   // (lo rodado va a 1280 × 720: se escala con el mejor filtro)
  x.translate(W / 2 + sx + dx, H / 2 + sy); x.scale(z, z); x.translate(-W / 2, -H / 2);
  if (T.kb) {
    const [z0, z1, x0, y0, x1, y1] = T.kb, k = ease((t - T.a) / (T.b - T.a)), base = Math.max(W / im.width, H / im.height);
    const zz = base * lerp(z0, z1, k), w = im.width * zz, hh = im.height * zz, cx = lerp(x0, x1, k) * w, cy = lerp(y0, y1, k) * hh;
    x.drawImage(im, cl(W / 2 - cx, W - w, 0), cl(H / 2 - cy, H - hh, 0), w, hh);
  } else x.drawImage(im, 0, 0, W, H);
  x.restore();
  gradua(x, T.luz);
  const v = veloDe(T, t); if (v > 0) { x.fillStyle = `rgba(10,3,24,${v})`; x.fillRect(0, 0, W, H); }
  if (T.golpe) { const g = t - T.a; if (g < 0.45) { x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = Math.exp(-g * 8) * 0.5; x.fillStyle = T.golpe; x.fillRect(0, 0, W, H); x.restore(); } }
}
let prevC, prevX, tmpC, tmpX;
const tomaEn = (t) => FONDOS.find(T => t >= T.a && t < T.b) || FONDOS[FONDOS.length - 1];
async function pintaFondo(t) {
  const ctx = fondo.getContext('2d'), T = tomaEn(t), k = FONDOS.indexOf(T);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const [tipo, d] = T.entra || [], e = d ? cl((t - T.a) / d) : 1;
  if (tipo === 'barre' && e < 1 && k > 0) {
    const ee = easeOutExpo(e), P = FONDOS[k - 1];
    prevX.fillStyle = '#000'; prevX.fillRect(0, 0, W, H); await toma(prevX, P, t, -ee * W * 0.6); ctx.globalAlpha = 1 - e * 0.5; ctx.drawImage(prevC, 0, 0);
    tmpX.fillStyle = '#000'; tmpX.fillRect(0, 0, W, H); await toma(tmpX, T, t, (1 - ee) * W * 0.6); ctx.globalAlpha = Math.min(1, e * 2.5); ctx.drawImage(tmpC, 0, 0); ctx.globalAlpha = 1;
  } else {
    await toma(ctx, T, t);
    if (tipo && e < 1) {
      if (tipo === 'funde' && k > 0) { prevX.fillStyle = '#000'; prevX.fillRect(0, 0, W, H); await toma(prevX, FONDOS[k - 1], t); ctx.save(); ctx.globalAlpha = 1 - ease(e); ctx.drawImage(prevC, 0, 0); ctx.restore(); }
      else if (tipo === 'negro') { ctx.save(); ctx.globalAlpha = 1 - ease(e); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      else if (tipo === 'blanco') { ctx.save(); ctx.globalAlpha = 1 - easeOut(e); ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  }
  for (let j = 1; j <= 3; j++) { const t2 = t + j / FPS, T2 = tomaEn(t2); if (T2.src.length > 2 && T2.src[1] === ':') carga(urlDe(T2, t2)).catch(() => {}); }
}

// ---------- un fotograma ----------
let TODAS = [];
export async function cuadro(t) {
  await pintaFondo(t);
  for (const a of TODAS) a.currentTime = t * 1000;
  for (const [el, n, t0, d] of CUENTAS) el.textContent = String(Math.round(n * easeOut((t - t0) / d)));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
}

export async function prepara(cuantos) {
  CUANTOS = cuantos || {};
  escenario(); prepLienzo();
  [prevC, tmpC] = [0, 0].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
  prevX = prevC.getContext('2d'); tmpX = tmpC.getContext('2d');
  monta();
  await document.fonts.ready;
  // (que estén todas las imágenes de encima antes de empezar)
  await Promise.all([...document.querySelectorAll('#esc img')].map(im => im.decode().catch(() => {})));
  getComputedStyle(document.body).opacity; document.body.getBoundingClientRect();
  // (todas: las de vida() y las CSS del juego, las de la tipografía cinética entre ellas)
  TODAS = document.getAnimations(); for (const a of TODAS) a.pause();
  await cuadro(0);
  return { fotogramas: Math.round(DURA * FPS), animaciones: TODAS.length };
}
window.T3 = { prepara, cuadro, FPS, DURA, V4 };
