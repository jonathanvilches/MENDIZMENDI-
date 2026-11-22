// La entrega de la txapela al acabar la final de un campeonato, como en los frontones de verdad (fotos del autor, 17 de
// noviembre de 2026: el Manomanista, el Cuatro y Medio y un campeonato en el frontón de Pamplona). En la cancha, delante
// del frontis, el podio de cajones blancos con el número en negro: el 1 en medio y el 2 a su izquierda. El campeón sube
// al 1 y el subcampeón al 2, cada uno con su copa de plata con peana de madera bien cogida en la mano (dedos.js y
// agarrar.js: el puño cerrado). Lo más importante es la txapela («que te pongan la txapela es el mayor honor del mundo»,
// el autor): un primer plano mientras baja y se le posa en la cabeza, a la medida de su cabeza, y en ese momento el grito
// de «¡Txapeldun!». Después el campeón levanta la copa (solo él; los demás la tienen delante) y cae el confeti dorado. Al
// lado del podio, en la cancha, la familia y los amigos, aplaudiendo y saltando: gente del pueblo con ropa de calle (los
// mismos personajes que los vecinos, con zapatillas y no con botas de fútbol), casi todos con la camiseta del color del
// campeón y alguno de otro color, nunca del color del rival. Cuatro planos, como en la tele: el
// general con el frontis detrás, el de la txapela, el de abajo arriba (como las fotos) y uno abierto que gira despacio.
// Encima, el rótulo del campeón, con la forma de los de la retransmisión y los colores del juego (el oro de los highlights).
//   new Ceremonia({ T, grp, cam, root, audio, lang, gana: [lado], pierde: [lado], color: 'azul' | 'rojo', titulo, donde, marcador, onFin })
//   lado = { obj, animate, rig, nombre }   ·   update(dt) cada imagen   ·   dispose()
// (las clases del rótulo llevan el prefijo pc-: con «rotulo» a secas se le aplicaba el del nombre del pueblo,
// ui/rotulo.css, y el rótulo entero se iba arriba, en medio y estrecho)
import { agarrar } from '../actors/agarrar.js';
import { loadMeshy, GlbChar, MESHY_GAIT, meshyHeight } from '../actors/glbChar.js';
import { outfitTint } from '../actors/npcOutfit.js';

const TXT = {
  // (finalista: vale para chico y para chica)
  es: { kick: 'Txapeldun', kickN: 'Txapeldunak', sub: 'Finalista', subN: 'Finalistas', sigue: 'Continuar', final: 'Final' },
  eu: { kick: 'Txapeldun', kickN: 'Txapeldunak', sub: 'Finalista', subN: 'Finalistak', sigue: 'Jarraitu', final: 'Finala' },
};
const ORO = ['#ffd36a', '#f2b92e', '#fff1b8', '#e0a020', '#ffe08a', '#c98a12'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
// (la txapela se posa con un pequeño rebote, como cuando se la encajan)
const posa = (x) => { x = Math.max(0, Math.min(1, x)); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// los tiempos (s): la txapela baja de T_TX a T_TX + D_TX; la copa arriba en T_COPA; el rótulo y el botón
const T_TX = 2.9, D_TX = 1.25, T_COPA = 6.6, T_ROT = 8.6, T_BOTON = 9.8;

const CSS = `
body:has(.pel-root.cere) .rotulo{visibility:hidden!important}
.pel-root.cere :is(.pel-top,.pel-rapidos,.pel-call,.pel-golpe,.pel-q,.pel-tip,.pel-rep,.pel-hlts,.pel-com,.pel-stick,.pel-btns,.pel-stickhint,.pel-teclas){visibility:hidden!important}
.cer{position:absolute;inset:0;z-index:30;pointer-events:none;font-family:var(--f-cond,'MZ Cond','MZ Texto',sans-serif);color:#fff}
.cer-velo{position:absolute;inset:0;background:#07020f;animation:pc-velo .55s .08s ease forwards}
.cer.pc-sale .cer-velo{animation:pc-velo-sale .35s ease forwards}
@keyframes pc-velo{to{opacity:0}}@keyframes pc-velo-sale{from{opacity:0}to{opacity:1}}
/* el grito de «¡Txapeldun!» al posarse la txapela: una placa inclinada que barre y el texto en oro */
.cer-grito{position:absolute;left:50%;top:14%;transform:translateX(-50%);padding:10px 44px 12px;isolation:isolate;visibility:hidden;white-space:nowrap}
.cer-grito::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,rgba(12,5,30,.92),rgba(36,13,78,.9));border-left:8px solid #ffd36a;transform:skewX(-14deg) scaleX(0);transform-origin:left}
.cer-grito b{display:block;font:400 clamp(40px,calc(9vmin / var(--z, 1)),92px)/1 var(--f-display,'MZ Display','MZ Texto',sans-serif);letter-spacing:.03em;text-transform:uppercase;background:linear-gradient(180deg,#fff7d6 0%,#ffd36a 55%,#e0a020 100%);-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0;transform:translateX(-24px)}
.cer.pc-grito .cer-grito{visibility:visible}
.cer.pc-grito .cer-grito::before{transform:skewX(-14deg) scaleX(1);transition:transform .38s cubic-bezier(.16,1,.3,1)}
.cer.pc-grito .cer-grito b{opacity:1;transform:none;transition:opacity .25s .14s,transform .45s .14s cubic-bezier(.16,1,.3,1)}
.cer.pc-rotulo .cer-grito{opacity:0;transition:opacity .4s}
/* el rótulo del campeón, abajo a la izquierda, como los de la retransmisión */
.cer-low{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--edge,16px));max-width:min(560px,calc(100% - 2 * var(--edge,16px) - 200px));display:grid;gap:2px;padding:12px 36px 14px 26px;isolation:isolate;visibility:hidden}
.cer-low::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,rgba(12,5,30,.94),rgba(36,13,78,.92));border-left:6px solid #ffd36a;transform:skewX(-12deg) scaleX(0);transform-origin:left}
.cer-low>*{opacity:0;transform:translateX(-20px)}
.cer-low small{font:800 var(--fs-xs,12px)/1.2 var(--f-cond,'MZ Cond',sans-serif);letter-spacing:.16em;text-transform:uppercase;color:#ffd36a}
.cer-low strong{font:400 clamp(26px,calc(5.4vmin / var(--z, 1)),48px)/1.02 var(--f-display,'MZ Display','MZ Texto',sans-serif);letter-spacing:.02em;text-transform:uppercase;text-wrap:balance}
.cer-low span{font:700 var(--fs-sm,14px)/1.3 var(--f-cond,'MZ Cond',sans-serif);letter-spacing:.06em;text-transform:uppercase;color:#e6dcff}
.cer.pc-rotulo .cer-low{visibility:visible}
.cer.pc-rotulo .cer-low::before{transform:skewX(-12deg) scaleX(1);transition:transform .4s cubic-bezier(.16,1,.3,1)}
.cer.pc-rotulo .cer-low>*{opacity:1;transform:none;transition:opacity .25s,transform .45s cubic-bezier(.16,1,.3,1)}
.cer.pc-rotulo .cer-low>:nth-child(1){transition-delay:.12s}.cer.pc-rotulo .cer-low>:nth-child(2){transition-delay:.18s}.cer.pc-rotulo .cer-low>:nth-child(3){transition-delay:.24s}
.cer-go{position:absolute;right:calc(env(safe-area-inset-right,0px) + var(--edge,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--edge,16px));min-width:180px;min-height:48px;padding:8px 28px;border:0;border-radius:999px;background:var(--cta,linear-gradient(100deg,#d0189f,#a51ee0 55%,#6a2ff0));color:#fff;font:900 var(--fs-md,16px)/1.1 var(--f-cond,'MZ Cond',sans-serif);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;pointer-events:auto;opacity:0;transform:translateY(12px);visibility:hidden;transition:opacity .3s,transform .4s cubic-bezier(.16,1,.3,1),visibility 0s .4s}
.cer.pc-listo .cer-go{opacity:1;transform:none;visibility:visible;transition:opacity .3s,transform .4s cubic-bezier(.16,1,.3,1)}
.cer-go:focus-visible{outline:2px solid #fff;outline-offset:3px}
@media (orientation:portrait){.cer-low{max-width:calc(100% - 2 * var(--edge,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--edge,16px) + 64px)}.cer-grito{top:12%}}
@media (prefers-reduced-motion:reduce){.cer-grito::before,.cer-grito b,.cer-low::before,.cer-low>*,.cer-go{transition:none!important}}
body.alto-contraste .cer-low::before,body.alto-contraste .cer-grito::before{background:#000;border:2px solid #fff}`;

// (el brillo de la plata: un cielo pintado con focos arriba, para el reflejo de las copas y del confeti; sin él, el metal
// sale negro)
function cieloMetal(T) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.35, '#d8d2e6'); gr.addColorStop(0.55, '#6c6480'); gr.addColorStop(1, '#1c1428');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 9; i++) { const x = (i + 0.5) * 256 / 9, r = g.createRadialGradient(x, 16, 0, x, 16, 14); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(x - 14, 2, 28, 28); }
  const t = new T.CanvasTexture(c); t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace; return t;
}

// un cajón del podio: blanco, con su número negro delante (y una rama de laurel fina a cada lado)
function cajon(T, w, h, d, n) {
  const c = document.createElement('canvas'), H = 256, W = Math.round(H * w / h); c.width = Math.min(1024, W); c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, c.width, H);
  g.fillStyle = '#121214'; g.font = `900 ${Math.round(H * 0.62)}px "MZ Display", "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), c.width / 2, H * 0.56);
  g.strokeStyle = 'rgba(18,18,20,.18)'; g.lineWidth = 4;
  for (const s of [-1, 1]) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36, x = c.width / 2 + s * (H * 0.42 + Math.cos(a) * H * 0.1), y = H * 0.56 + Math.sin(a) * H * 0.28; g.moveTo(x, y); g.lineTo(x + s * 16, y - 10); } g.stroke(); }
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4;
  const liso = new T.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.62 }), frente = new T.MeshStandardMaterial({ map: tx, roughness: 0.62 });
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), [liso, liso, liso, liso, frente, liso]);
  m.castShadow = true; m.receiveShadow = true; return m;
}

// la copa de plata en su peana de madera, con la placa dorada delante. El origen, abajo en el centro de la peana; mide
// unos 48 cm. El pie de plata, entre la peana y la copa (de 9 a 24 cm), es por donde se coge
function copa(T, env) {
  const G = new T.Group();
  const plata = new T.MeshStandardMaterial({ color: '#eef1f5', metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.25 });
  const madera = new T.MeshStandardMaterial({ color: '#4a2414', roughness: 0.48, metalness: 0.05 });
  const oro = new T.MeshStandardMaterial({ color: '#d9b45a', metalness: 1, roughness: 0.25, envMap: env });
  const P = [[0, 0], [0.075, 0], [0.075, 0.012], [0.058, 0.022], [0.022, 0.05], [0.015, 0.11], [0.032, 0.128], [0.019, 0.148], [0.05, 0.168], [0.09, 0.218], [0.116, 0.288], [0.126, 0.35], [0.132, 0.384], [0.123, 0.388], [0.112, 0.34], [0.07, 0.31], [0, 0.302]];
  const cuerpo = new T.Mesh(new T.LatheGeometry(P.map(([r, y]) => new T.Vector2(r, y)), 40), plata); cuerpo.position.y = 0.09;
  for (const s of [-1, 1]) { const asa = new T.Mesh(new T.TorusGeometry(0.062, 0.0075, 8, 18, Math.PI * 1.15), plata); asa.position.set(s * 0.122, 0.09 + 0.29, 0); asa.rotation.z = s > 0 ? -Math.PI * 0.62 : Math.PI * 1.47; G.add(asa); }
  const peana = new T.Mesh(new T.BoxGeometry(0.15, 0.09, 0.15), madera); peana.position.y = 0.045;
  const placa = new T.Mesh(new T.BoxGeometry(0.09, 0.032, 0.004), oro); placa.position.set(0, 0.045, 0.077);
  G.add(cuerpo, peana, placa);
  G.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return G;
}

// la txapela de campeón: negra, ancha y plana, con la txirtena en medio y lo bordado encima (TXAPELDUNA y el año, en
// blanco, rojo y azul, como la de la foto). El origen, en el hueco de la cabeza; para una cabeza de unos 19 cm de la
// base del cráneo a la coronilla (se escala a la de cada uno)
function txapela(T, ano) {
  const G = new T.Group(), lana = new T.MeshStandardMaterial({ color: '#141418', roughness: 0.96 });
  const P = [[0.1, 0], [0.112, -0.008], [0.152, -0.002], [0.17, 0.008], [0.175, 0.02], [0.163, 0.033], [0.122, 0.045], [0.06, 0.051], [0, 0.052]];
  G.add(new T.Mesh(new T.LatheGeometry(P.map(([r, y]) => new T.Vector2(r, y)), 40), lana));
  const tip = new T.Mesh(new T.CylinderGeometry(0.004, 0.005, 0.026, 6), lana); tip.position.y = 0.064; G.add(tip);
  try {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = 96;
    g.font = '700 26px "MZ Texto", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f2efe6';
    const arco = 'TXAPELDUNA'.split(''), paso = 0.26;
    arco.forEach((ch, i) => { const a = -Math.PI / 2 + (i - (arco.length - 1) / 2) * paso; g.save(); g.translate(128 + Math.cos(a) * R, 128 + Math.sin(a) * R); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); });
    g.font = '800 34px "MZ Texto", sans-serif'; g.fillStyle = '#d8282f'; g.fillText(String(ano), 128, 140); g.fillStyle = '#2f5fd0'; g.fillRect(96, 166, 64, 5);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    const dib = new T.Mesh(new T.CircleGeometry(0.15, 32), new T.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.9, depthWrite: false }));
    dib.rotation.x = -Math.PI / 2; dib.position.y = 0.0505; G.add(dib);
  } catch (e) { /* sin lienzo: lisa */ }
  G.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return G;
}

// la pantalla gigante del frontón, colgada en el frontis, como en las fotos del autor (17 nov): fondo azul de noche con
// la trama de los LED, «TXAPELDUN» en oro y el nombre del campeón en grande, y debajo el campeonato y el año
function pantalla(T, { kick, nombre, sub }) {
  const W = 1024, H = 400, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const pinta = () => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1846'); g.addColorStop(1, '#0a0a20'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f2b92e'; c.font = "900 50px 'MZ Texto', 'Barlow', sans-serif"; c.fillText(kick.toUpperCase().split('').join(' '), W / 2, 84);
    let fs = 150; const fuente = (n) => `400 ${n}px 'MZ Display', 'MZ Texto', 'Barlow', sans-serif`; c.font = fuente(fs);
    const N = nombre.toUpperCase(); while (c.measureText(N).width > W * 0.88 && fs > 56) { fs -= 6; c.font = fuente(fs); }
    c.fillStyle = '#ffffff'; c.fillText(N, W / 2, 212);
    if (sub) { c.fillStyle = '#d9d4ff'; c.font = "700 38px 'MZ Texto', 'Barlow', sans-serif"; c.fillText(sub, W / 2, 330); }
  };
  pinta();
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  document.fonts?.ready?.then(() => { pinta(); tex.needsUpdate = true; });   // (con la letra del juego, si aún no estaba)
  const grp = new T.Group(); grp.name = 'pantalla';
  const marco = new T.Mesh(new T.BoxGeometry(4.64, 1.94, 0.12), new T.MeshStandardMaterial({ color: '#16161d', roughness: 0.6, metalness: 0.3 }));
  // (apagada al principio: casi negra, con su trama; ceremonia.update la enciende)
  const cara = new T.Mesh(new T.PlaneGeometry(4.4, 1.72), new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(0.035, 0.035, 0.045) }));
  cara.position.z = 0.062; grp.add(marco, cara); grp.userData.cara = cara;
  return grp;
}
// (gira un hueso para que su hijo quede en la dirección meta, en el mundo, mezclado con su animación por w)
function apuntaHueso(T, hb, hh, meta, w, tmp) {
  if (!hb || !hh || w <= 0) return;
  const a = hb.getWorldPosition(tmp.a), b = hh.getWorldPosition(tmp.b), ahora = b.sub(a).normalize();
  tmp.q1.setFromUnitVectors(ahora, meta); tmp.q2.identity().slerp(tmp.q1, w);
  hb.getWorldQuaternion(tmp.q3); hb.parent.getWorldQuaternion(tmp.q4);
  hb.quaternion.copy(tmp.q4.invert().multiply(tmp.q2.multiply(tmp.q3))); hb.updateMatrixWorld(true);
}
const hueso = (ch, s) => Object.values(ch?.bones || {}).find((b) => new RegExp(s + '$').test(b.name)) || null;

export class Ceremonia {
  constructor(o) {
    this.o = o; const T = this.T = o.T; this.t = 0; this.fase = 0; this.hecho = false;
    this.L = TXT[o.lang] || TXT.es;
    this.v = { a: new T.Vector3(), b: new T.Vector3(), c: new T.Vector3(), d: new T.Vector3(), e: new T.Vector3() };
    this.q = { a: new T.Quaternion(), b: new T.Quaternion(), c: new T.Quaternion(), id: new T.Quaternion() };
    this.env = cieloMetal(T);
    this.grupo = new T.Group(); this.grupo.name = 'ceremonia'; o.grp.add(this.grupo);
    // el podio, a un cuadro del frontis, algo a la derecha del centro: el frontis, de fondo
    const pareja = (o.gana?.length || 0) > 1, w1 = pareja ? 1.7 : 1.15, w2 = w1, d = 0.82;
    this.P = { x: 0.5, z: 3.4 }; this.h1 = 0.5; this.h2 = 0.34;
    const c1 = cajon(T, w1, this.h1, d, 1), c2 = cajon(T, w2, this.h2, d, 2);
    c1.position.set(this.P.x, this.h1 / 2, this.P.z); c2.position.set(this.P.x - (w1 + w2) / 2 - 0.02, this.h2 / 2, this.P.z);
    this.grupo.add(c1, c2); this.cajones = [c1, c2]; this.w = [w1, w2];
    // la pantalla gigante en el frontis, alta y a la izquierda del podio, con el nombre del campeón (detrás del campeón,
    // la copa en alto le tapaba el nombre en el plano de abajo arriba). Apagada hasta que se va el grito de «¡Txapeldun!»,
    // que en el plano de abajo arriba le caía encima; se enciende con el rótulo del campeón (update)
    try {
      const L0 = TXT[o.lang] || TXT.es, nom = (o.gana || []).map((l) => l.nombre).filter(Boolean).join(' · ');
      const pan = pantalla(T, { kick: pareja ? L0.kickN : L0.kick, nombre: nom || L0.kick, sub: [o.titulo, new Date().getFullYear()].filter(Boolean).join(' · ') });
      pan.position.set(this.P.x - 2.75, 4.0, 0.07); this.grupo.add(pan); this.pantalla = pan;
    } catch (e) { console.warn('ceremonia: pantalla', e); }
    // quién va dónde: los campeones en el 1 (por parejas, uno junto al otro), los otros en el 2
    const sitios = (n, x, y) => n > 1 ? [[x - 0.38, y], [x + 0.38, y]] : [[x, y]];
    const s1 = sitios(o.gana.length, this.P.x, this.h1), s2 = sitios(o.pierde.length, c2.position.x, this.h2);
    this.gente = [...o.gana.map((l, i) => ({ l, gana: true, x: s1[i][0], y: s1[i][1], k: i })), ...o.pierde.map((l, i) => ({ l, gana: false, x: s2[i][0], y: s2[i][1], k: i }))];
    // la copa de cada uno, bien cogida, y la txapela de cada campeón
    const ano = new Date().getFullYear();
    for (const p of this.gente) {
      p.copa = copa(T, this.env); p.esc = p.gana ? 1 : 0.74; p.copa.scale.setScalar(p.esc); this.grupo.add(p.copa);
      if (p.gana) { p.tx = txapela(T, ano); p.tx.visible = false; this.grupo.add(p.tx); }
      const ch = p.l.rig?.char; p.ch = ch || null;
      if (!ch) continue;
      p.B = { brazoR: hueso(ch, 'RightArm'), anteR: hueso(ch, 'RightForeArm'), manoR: hueso(ch, 'RightHand'), brazoL: hueso(ch, 'LeftArm'), anteL: hueso(ch, 'LeftForeArm'), manoL: hueso(ch, 'LeftHand'),
        pecho: hueso(ch, 'Spine2') || hueso(ch, 'Spine1') || hueso(ch, 'Spine'), cabeza: hueso(ch, 'Head'), punta: hueso(ch, 'HeadTop_End') };
      // (la postura, encima de su animación de cada imagen: lo de antes y luego lo nuestro)
      p.post0 = ch.post; ch.post = (c, dt) => { p.post0?.(c, dt); this.postura(p, dt); };
      // el subcampeón la coge por el pie, con el puño cerrado y el codo doblado, de pie delante de él (agarrar.js, como
      // el bastón); el campeón, con el puño cerrado bajo la peana, para poder levantarla
      if (!p.gana) {
        try { p.agarrada = agarrar(ch, 'R', p.copa, { modo: 'erguido', escala: p.esc, desde: 0.155 }); } catch (e) { p.agarrada = false; }
        if (!p.agarrada) this.grupo.add(p.copa);
      } else { try { ch.mano?.('R', 'puno'); ch.mano?.('L', 'relajada'); } catch (e) { /* sin dedos */ } }
      // (cuánto mide su cabeza, de la base del cráneo a la coronilla: la txapela, a su medida)
      // (cuánto le sube la cabeza por encima del hueso de la cabeza: hasta lo más alto de la figura, el pelo incluido. En
      // estos pelotaris la cabeza es mucho más grande que su esqueleto y la punta del esqueleto queda a la altura de los
      // ojos: con ella, la txapela quedaba dentro de la cabeza y no se veía)
      // (con un rayo que baja justo encima de la cabeza hasta el pelo: con la caja de toda la figura contaba el brazo en
      // alto de la celebración del último tanto y la txapela se quedaba flotando)
      if (p.gana && p.B.cabeza) {
        ch.root.updateMatrixWorld(true); const hp = p.B.cabeza.getWorldPosition(new T.Vector3()), mallas = [];
        ch.root.traverse((m) => { if (m.isMesh && m.visible && !m.userData.outline) mallas.push(m); });
        // (y no solo en el centro: con un rayo, entre dos mechones, la txapela quedaba por debajo del pelo de punta y los
        // mechones la atravesaban. Nueve rayos alrededor del eje de la cabeza, a unos 6 cm, y el más alto)
        let d = 0;
        try {
          const rc = new T.Raycaster(); rc.far = 2.5;
          for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
            rc.set(hp.clone().add(new T.Vector3(ox * 0.06, 2.5, oz * 0.06)), new T.Vector3(0, -1, 0));
            const h = rc.intersectObjects(mallas, false).find((q) => q.point.y > hp.y + 0.05); if (h) d = Math.max(d, h.point.y - hp.y);
          }
        } catch (e) { /* sin rayo */ }
        if (!d) { const bb = new T.Box3().setFromObject(ch.root, true); d = Math.min(bb.max.y - hp.y, 0.45); }
        p.dTop = Math.max(0.15, Math.min(0.7, d));
      }
    }
    // el confeti dorado: trozos que caen dando vueltas; al levantar la copa, dos cañones a los lados del podio
    const N = o.ligero ? 220 : 420;
    const geo = new T.PlaneGeometry(0.036, 0.022), mat = new T.MeshStandardMaterial({ color: '#ffffff', metalness: 0.75, roughness: 0.32, side: T.DoubleSide, envMap: this.env });
    const conf = this.conf = new T.InstancedMesh(geo, mat, N); conf.frustumCulled = false; conf.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const col = new T.Color(); this.cp = [];
    for (let i = 0; i < N; i++) { col.set(ORO[i % ORO.length]); conf.setColorAt(i, col); this.cp.push(this.trozo({}, true)); }
    conf.visible = false; this.grupo.add(conf); this.m4 = new T.Matrix4(); this.e3 = new T.Euler(); this.s3 = new T.Vector3(1, 1, 1);
    // la mirada de todos: hacia la contracancha (+z de la cancha)
    o.grp.updateMatrixWorld(true);
    const p0 = o.grp.localToWorld(new T.Vector3(0, 0, 0)), pz = o.grp.localToWorld(new T.Vector3(0, 0, 1));
    this.yaw = Math.atan2(pz.x - p0.x, pz.z - p0.z);
    // la familia y los amigos, en la cancha a los lados del podio, mirando a los suyos y celebrando: vecinos de calle (el
    // de la camisa y el pastor de los vecinos de Meshy, npcOutfit.js) con la ropa teñida. Primero, la mayoría con el color
    // del campeón; luego alguno con otro color neutro (verde, blanco, gris, mostaza); ninguno con el del rival
    this.familia = [];
    try {
      const L = [[-2.3, 0.25], [-2.75, 0.85], [-2.05, 1.3], [1.45, 0.2], [1.85, 0.8], [1.3, 1.35], [2.25, 0.35]];
      const suyo = o.color === 'rojo' ? ['#c8183e', '#b3142f', '#d82a44', '#a8122a', '#c41c38'] : ['#2f4fd0', '#2442b8', '#3a5ee0', '#2a46c0', '#3552d6'];
      const otros = ['#3f7a4f', '#efebe3', '#7a7f88', '#c9a03a'], panta = ['#2e3d5c', '#2a2a30', '#b9a98a', '#3a3f4a'], pelo = ['#2a1a12', '#5a3a22', '#c9a46a', '#1c1410', '#8a8a88'];
      const alto = [1.74, 1.66, 1.26, 1.78, 1.62, 1.32, 1.7], cx = this.P.x - 0.35;
      const gente = L.map(([dx, dz], i) => {
        const x = this.P.x + dx, z = this.P.z + dz, w = o.grp.localToWorld(new T.Vector3(x, 0, z)), mira = o.grp.localToWorld(new T.Vector3(cx, 0, this.P.z + 1.4)).sub(w);
        const color = [1, 4].includes(i) ? otros[(i * 3) % otros.length] : suyo[i % suyo.length];
        return { w, ry: Math.atan2(mira.x, mira.z), modelo: i % 3 === 1 ? 'pastor' : 'sanfermin', H: alto[i],
          ropa: { shirt: color, pants: panta[i % panta.length], acc: suyo[(i + 2) % suyo.length], vest: i % 2 ? '#3a3f4a' : '#5a4632', hair: pelo[i % pelo.length] } };
      });
      let esc = o.grp; while (esc.parent) esc = esc.parent; this.escena = esc;
      for (const f of gente) loadMeshy(f.modelo).then((gl) => {
        if (this.hecho || !gl) return;
        const ch = new GlbChar(gl, { ...MESHY_GAIT, vary: true });
        ch.root.scale.setScalar((gl.userData?.fit || 1) * f.H / 1.6);
        try { outfitTint(ch.root, f.modelo, f.ropa); } catch (e) { /* con su ropa */ }
        const obj = new T.Group(); obj.add(ch.root); obj.position.copy(f.w); obj.rotation.y = f.ry; esc.add(obj);
        ch.setSpeed?.(0); this.familia.push({ obj, ch, cuando: Math.random() * 0.8 });
      }).catch((e) => console.warn('ceremonia: familia', e));
    } catch (e) { console.warn('ceremonia: familia', e); }
    // las autoridades, de pie a la derecha del podio y aplaudiendo, como en las fotos: los dos mayores del pueblo con
    // chaqueta y txapela (actors/npcGlb.js), como quien pone la txapela en los frontones. Con el vecino de San Fermín
    // teñido de negro parecían mozos de fiesta, con su faja y sus alpargatas. El aplauso, con los brazos (aplaude)
    this.autoridades = [];
    try {
      const A = [[3.05, -0.05, 1.7, 'abuelo_bigote'], [3.65, 0.3, 1.66, 'abuelo_barba']];
      let esc = o.grp; while (esc.parent) esc = esc.parent;
      A.forEach(([dx, dz, H, modelo], i) => {
        const x = this.P.x + dx, z = this.P.z + dz, w = o.grp.localToWorld(new T.Vector3(x, 0, z)), mira = o.grp.localToWorld(new T.Vector3(this.P.x, 0, this.P.z + 0.6)).sub(w);
        loadMeshy(modelo).then((gl) => {
          if (this.hecho || !gl) return;
          const ch = new GlbChar(gl, { ...MESHY_GAIT, vary: true });
          ch.root.scale.setScalar((gl.userData?.fit || 1) * H / meshyHeight(modelo));
          const obj = new T.Group(); obj.add(ch.root); obj.position.copy(w); obj.rotation.y = Math.atan2(mira.x, mira.z); esc.add(obj);
          ch.setSpeed?.(0);
          const a = { obj, ch, fase: i * 1.7, B: { brazoR: hueso(ch, 'RightArm'), anteR: hueso(ch, 'RightForeArm'), manoR: hueso(ch, 'RightHand'), brazoL: hueso(ch, 'LeftArm'), anteL: hueso(ch, 'LeftForeArm'), manoL: hueso(ch, 'LeftHand'), pecho: hueso(ch, 'Spine2') || hueso(ch, 'Spine1') || hueso(ch, 'Spine') } };
          ch.post = () => this.aplaude(a);
          this.autoridades.push(a);
        }).catch((e) => console.warn('ceremonia: autoridades', e));
      });
    } catch (e) { console.warn('ceremonia: autoridades', e); }
    // el rótulo
    if (!document.getElementById('cer-css')) { const st = document.createElement('style'); st.id = 'cer-css'; st.textContent = CSS; document.head.appendChild(st); }
    const Lt = this.L, nG = o.gana.map((l) => l.nombre).filter(Boolean).join(' · '), nP = o.pierde.map((l) => l.nombre).filter(Boolean).join(' · ');
    const el = this.el = document.createElement('div'); el.className = 'cer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${pareja ? Lt.kickN : Lt.kick}: ${nG}`);
    el.innerHTML = `<div class="cer-velo"></div><div class="cer-grito" aria-hidden="true"><b>¡${esc(pareja ? Lt.kickN : Lt.kick)}!</b></div>
      <div class="cer-low"><small>${esc([pareja ? Lt.kickN : Lt.kick, o.titulo].filter(Boolean).join(' · '))}</small><strong>${esc(nG)}</strong>
      <span>${esc([o.donde, o.marcador ? `${Lt.final} ${o.marcador}` : '', nP ? `${pareja ? Lt.subN : Lt.sub}: ${nP}` : ''].filter(Boolean).join(' · '))}</span></div>
      <button type="button" class="cer-go">${esc(Lt.sigue)}</button>`;
    o.root.appendChild(el);
    el.querySelector('.cer-go').addEventListener('click', (e) => { e.stopPropagation(); this.acaba(); });
    this.tecla = (e) => { if (this.t > T_BOTON - 0.5 && ['enter', ' ', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); this.acaba(); } };
    addEventListener('keydown', this.tecla);
    o.audio?.aplauso?.(0.7, 4.5);
    this.camPos = new T.Vector3(); this.camLook = new T.Vector3(); this.plano = -1;
    this.cabeza = new T.Vector3(this.P.x, this.h1 + 1.5, this.P.z);   // (la del campeón, en la cancha: para los planos)
  }
  // un trozo de confeti: arriba, cayendo (lluvia) o saliendo de un cañón
  trozo(q, lluvia = false, lado = 0) {
    const P = this.P;
    if (lluvia) { q.x = P.x + (Math.random() - 0.5) * 9; q.y = 3 + Math.random() * 7; q.z = P.z + (Math.random() - 0.3) * 6; q.vx = 0; q.vy = -(0.8 + Math.random() * 0.7); q.vz = 0; }
    else { q.x = P.x + lado * 1.9 + (Math.random() - 0.5) * 0.3; q.y = 0.4; q.z = P.z + 0.6 + (Math.random() - 0.5) * 0.3; const v = 7 + Math.random() * 4; q.vx = -lado * (0.6 + Math.random() * 1.4); q.vy = v; q.vz = (Math.random() - 0.3) * 1.6; }
    q.rx = Math.random() * 6.3; q.ry = Math.random() * 6.3; q.rz = Math.random() * 6.3; q.sx = (Math.random() - 0.5) * 9; q.sy = (Math.random() - 0.5) * 7; q.ph = Math.random() * 6.3; q.suelo = false;
    return q;
  }
  // la postura del campeón en cada imagen: primero la copa delante del pecho, sobre el puño; al levantarla, el brazo
  // derecho arriba con la copa y el izquierdo al aire. Se apunta cada hueso del brazo a donde tiene que ir, en el mundo,
  // mezclado con su animación. (El subcampeón no: la lleva con el agarre de agarrar.js)
  postura(p) {
    const B = p.B, T = this.T, v = this.v, q = this.q; if (!p.gana || !B?.brazoR || !B.anteR || !B.manoR || !B.pecho) return;
    p.ch.root.updateMatrixWorld(true);
    const del = v.a.set(0, 0, 1).applyQuaternion(p.ch.root.getWorldQuaternion(q.a)).setY(0).normalize();
    const arriba = v.b.set(0, 1, 0);
    const apunta = (hb, hh, meta, w) => {
      if (!hb || !hh || w <= 0) return;
      const a = hb.getWorldPosition(v.c), b = hh.getWorldPosition(v.d), ahora = b.sub(a).normalize();
      q.b.setFromUnitVectors(ahora, meta); q.c.copy(q.id).slerp(q.b, w);
      hb.getWorldQuaternion(q.a); const pq = hb.parent.getWorldQuaternion(new T.Quaternion());
      hb.quaternion.copy(pq.invert().multiply(q.c.multiply(q.a))); hb.updateMatrixWorld(true);
    };
    const fuera = (hb) => hb.getWorldPosition(new T.Vector3()).sub(B.pecho.getWorldPosition(new T.Vector3())).setY(0).normalize();
    const wA = p.alza || 0, bomb = wA > 0.99 ? Math.sin(this.t * 6.5 + p.k) * 0.06 : 0, fR = fuera(B.brazoR);
    const bR = new T.Vector3().addScaledVector(arriba, 1).addScaledVector(fR, 0.34).addScaledVector(del, 0.12 + bomb).normalize();
    const aR = new T.Vector3().addScaledVector(arriba, 1).addScaledVector(fR, 0.06).addScaledVector(del, 0.2 + bomb).normalize();
    const bR0 = new T.Vector3().addScaledVector(arriba, -0.9).addScaledVector(del, 0.35).addScaledVector(fR, 0.12).normalize();
    const aR0 = new T.Vector3().addScaledVector(del, 0.9).addScaledVector(arriba, 0.18).addScaledVector(fR, -0.12).normalize();
    apunta(B.brazoR, B.anteR, bR0.lerp(bR, wA).normalize(), 0.92); apunta(B.anteR, B.manoR, aR0.lerp(aR, wA).normalize(), 0.92);
    if (B.brazoL && B.anteL && B.manoL && wA > 0) {
      const fL = fuera(B.brazoL);
      apunta(B.brazoL, B.anteL, new T.Vector3().addScaledVector(arriba, 1).addScaledVector(fL, 0.5).addScaledVector(del, 0.08).normalize(), wA * 0.95);
      apunta(B.anteL, B.manoL, new T.Vector3().addScaledVector(arriba, 1).addScaledVector(fL, 0.22).addScaledVector(del, 0.1).normalize(), wA * 0.95);
    }
  }
  // la copa del campeón en su puño: la peana encima del puño cerrado (el centro del agarre de su mano, dedos.js), de pie;
  // sin dedos, junto a la mano; sin huesos, a la altura del pecho
  ponCopa(p) {
    if (p.agarrada) return;
    const v = this.v, g = this.o.grp, C = p.copa, T = this.T;
    if (p.B?.manoR) {
      const G = p.ch?.dedos?.D?.R?.agarre, h = p.B.manoR;
      const w = G?.centro ? h.localToWorld(v.c.fromArray(G.centro)) : h.getWorldPosition(v.c);
      const dir = h.getWorldPosition(v.d).sub(p.B.anteR.getWorldPosition(new T.Vector3())).normalize();
      const sube = new T.Vector3(0, 1, 0).lerp(dir, (p.alza || 0) * 0.5).normalize();
      w.addScaledVector(sube, 0.035 * p.esc);
      C.position.copy(g.worldToLocal(w.clone()));
      // (de pie, algo inclinada hacia donde apunta el brazo cuando la levanta)
      const qd = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), sube);
      C.quaternion.copy(g.getWorldQuaternion(new T.Quaternion()).invert().multiply(qd));
    } else { C.position.set(p.x + 0.18, p.y + 1.15, this.P.z + 0.25); C.rotation.set(0, 0, 0); }
  }
  // la txapela en la cabeza, a su medida y algo ladeada; antes de posarse, baja desde arriba girando despacio
  ponTxapela(p, k) {
    const v = this.v, g = this.o.grp, X = p.tx, T = this.T; if (!X) return;
    // (la cabeza como una bola que empieza en el hueso de la cabeza: su radio, la mitad de lo que sube; la txapela, de su
    // anchura, encajada en la coronilla)
    const dT = p.dTop || 0.2, r = dT * 0.5, s = Math.max(0.8, Math.min(3.2, r / 0.1));
    let top, up;
    if (p.B?.cabeza) {
      const h = p.B.cabeza.getWorldPosition(v.c).clone();
      up = p.B.punta ? p.B.punta.getWorldPosition(v.d).clone().sub(h).normalize() : new T.Vector3(0, 1, 0);
      if (up.y < 0.3) up.set(0, 1, 0);
      top = h.addScaledVector(up, dT - r * 0.42);
    } else { top = g.localToWorld(new T.Vector3(p.x, p.y + 1.78, this.P.z)); up = new T.Vector3(0, 1, 0); }
    const lp = g.worldToLocal(top.clone()); this.cabeza.copy(lp); this.dTop = dT;
    const baja = 1 - posa(k); lp.y += baja * 1.5;
    X.position.copy(lp); X.scale.setScalar(s);
    const ql = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), up);
    X.quaternion.copy(g.getWorldQuaternion(new T.Quaternion()).invert().multiply(ql)).multiply(new T.Quaternion().setFromEuler(new T.Euler(-0.07, baja * 3.5 + 0.4, -0.15)));
    X.visible = true;
  }
  // cuatro planos: el general con el frontis detrás; el de la txapela, cerca de su cara; el de abajo arriba, como las
  // fotos; y uno abierto que gira despacio. Todos miran a la cabeza del campeón, la que se mide. En vertical, más atrás
  camara(t) {
    const P = this.P, k = innerWidth < innerHeight ? 1.5 : 1, H = this.cabeza;
    let p, l, n;
    if (t < T_TX - 0.3) { const u = smooth(t / (T_TX - 0.3)); n = 0; p = [P.x + 1.6 - u * 0.5, H.y * 0.75, P.z + (8.6 - u * 1.4) * k]; l = [P.x - 0.4, H.y * 0.55, P.z]; }
    else if (t < T_COPA - 0.2) { const u = smooth((t - T_TX + 0.3) / (T_COPA - T_TX + 0.1)), dT = this.dTop || 0.25; n = 1; p = [H.x + 0.6, H.y - dT * 0.05, H.z + (1 + dT * 2.7 - u * 0.25) * k]; l = [H.x + 0.1, H.y - dT * 0.62, H.z]; }
    else if (t < 11.2) { const u = smooth((t - T_COPA + 0.2) / (11.4 - T_COPA)); n = 2; p = [P.x - 0.9 + u * 1.9, 0.75, P.z + (4.2 - u * 0.2) * k]; l = [P.x - 0.15, H.y * 0.85, P.z]; }
    else { const a = Math.sin((t - 11.2) * 0.22) * 0.45, r = 7 * k; n = 3; p = [P.x - 0.4 + Math.sin(a) * r, H.y * 0.9, P.z + Math.cos(a) * r]; l = [P.x - 0.4, H.y * 0.55, P.z]; }
    return { p, l, n };
  }
  // una autoridad aplaudiendo: los brazos hacia delante, las manos delante del pecho que se juntan y se abren, unas tres
  // veces por segundo, con su ritmo cada uno
  aplaude(a) {
    const B = a.B, T = this.T; if (!B.brazoR || !B.anteR || !B.manoR || !B.brazoL || !B.anteL || !B.manoL || !B.pecho) return;
    const tmp = this.tmpA ||= { a: new T.Vector3(), b: new T.Vector3(), q1: new T.Quaternion(), q2: new T.Quaternion(), q3: new T.Quaternion(), q4: new T.Quaternion() };
    a.ch.root.updateMatrixWorld(true);
    const del = new T.Vector3(0, 0, 1).applyQuaternion(a.ch.root.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
    const hR = B.brazoR.getWorldPosition(new T.Vector3()), hL = B.brazoL.getWorldPosition(new T.Vector3()), lat = hR.clone().sub(hL).setY(0).normalize();
    const pecho = B.pecho.getWorldPosition(new T.Vector3()), ancho = hR.distanceTo(hL);
    const abre = 0.02 + 0.1 * ancho * (0.5 + 0.5 * Math.sin((this.t + a.fase) * 18));
    const centro = pecho.clone().addScaledVector(del, ancho * 0.95).add(new T.Vector3(0, ancho * 0.05, 0));
    for (const [br, an, ma, sg, h0] of [[B.brazoR, B.anteR, B.manoR, 1, hR], [B.brazoL, B.anteL, B.manoL, -1, hL]]) {
      const mano = centro.clone().addScaledVector(lat, sg * abre), codo = h0.clone().lerp(mano, 0.5).add(new T.Vector3(0, -ancho * 0.35, 0)).addScaledVector(lat, sg * ancho * 0.18);
      apuntaHueso(T, br, an, codo.sub(h0).normalize(), 1, tmp);
      const c = an.getWorldPosition(new T.Vector3()); apuntaHueso(T, an, ma, mano.sub(c).normalize(), 1, tmp);
    }
  }
  update(dt) {
    if (this.hecho) return;
    dt = Math.min(dt, 0.05); this.t += dt; const t = this.t, T = this.T, o = this.o, g = o.grp;
    // los pelotaris en su cajón, mirando a la cámara (un poco hacia el centro), con su animación de estar parados
    for (const p of this.gente) {
      const obj = p.l.obj; if (!obj) continue;
      obj.position.copy(g.localToWorld(this.v.e.set(p.x, p.y, this.P.z))); obj.visible = true;
      obj.rotation.y = this.yaw + (p.gana ? (o.gana.length > 1 ? (p.k ? -0.12 : 0.12) : 0) : 0.28);
      if (p.gana) p.alza = smooth((t - T_COPA) / 0.6);
      try { p.l.animate?.(obj, { speed: 0, entre: false, swing: -1, wind: 0, won: false, lost: false, saluda: false }, dt); } catch (e) { /* sigue */ }
      this.ponCopa(p);
      if (p.tx) this.ponTxapela(p, t < T_TX ? 0 : (t - T_TX) / D_TX), p.tx.visible = t >= T_TX - 0.6;
    }
    // (la pantalla se enciende con el rótulo: un parpadeo corto, como las de LED, y se queda encendida)
    const cara = this.pantalla?.userData.cara;
    if (cara) { const u = t - T_ROT + 0.15, k = u <= 0 ? 0 : u < 0.12 ? 0.7 : u < 0.2 ? 0.25 : Math.min(1, 0.25 + (u - 0.2) * 3); cara.material.color.setScalar(0.035 + 0.965 * k); }
    // la txapela, posada: la grada en pie y el grito
    if (t >= T_TX + D_TX * 0.82 && this.fase < 1) { this.fase = 1; this.el.classList.add('pc-grito'); o.audio?.ovation?.(); o.audio?.aplauso?.(0.9, 5); o.onGrito?.(); }
    // la copa arriba: el confeti y la grada otra vez
    if (t >= T_COPA && this.fase < 2) {
      this.fase = 2; this.conf.visible = true;
      this.cp.forEach((q, i) => { if (i % 2) this.trozo(q, false, i % 4 === 1 ? -1 : 1); });
      o.audio?.ovation?.(); o.audio?.aplauso?.(0.9, 6);
    }
    if (t >= T_ROT && this.fase < 3) { this.fase = 3; this.el.classList.add('pc-rotulo'); }
    if (t >= T_BOTON && this.fase < 4) { this.fase = 4; this.el.classList.add('pc-listo'); this.el.querySelector('.cer-go')?.focus?.({ preventScroll: true }); }
    // la familia y los amigos: celebrando todo el rato, cada uno a su tiempo
    for (const f of this.familia) { try { if ((f.cuando -= dt) <= 0 && !f.ch.oneShot) { f.ch.playOnce('Celebrate', 1.2); f.cuando = 0.2 + Math.random() * 0.9; } f.ch.update(dt); } catch (e) { /* sigue */ } }
    for (const a of this.autoridades || []) { try { a.ch.update(dt); } catch (e) { /* sigue */ } }
    // el confeti: cae dando vueltas, con su vaivén; el del suelo se queda allí
    if (this.conf.visible) {
      const C = this.conf, m = this.m4, e3 = this.e3, s = this.s3, x1 = this.cajones[1].position.x;
      for (let i = 0; i < this.cp.length; i++) {
        const q = this.cp[i];
        if (!q.suelo) {
          if (q.vy > -1.2) q.vy -= 9.8 * dt; else { q.vy += (-(0.85 + (i % 7) * 0.08) - q.vy) * Math.min(1, dt * 3); q.vx *= 0.97; q.vz *= 0.97; }
          q.x += (q.vx + Math.sin(t * 2.2 + q.ph) * 0.35) * dt; q.y += q.vy * dt; q.z += (q.vz + Math.cos(t * 1.7 + q.ph) * 0.25) * dt;
          q.rx += q.sx * dt; q.rz += q.sy * dt;
          const sobre = Math.abs(q.z - this.P.z) < 0.41, sueloY = sobre && Math.abs(q.x - this.P.x) < this.w[0] / 2 ? this.h1 : sobre && Math.abs(q.x - x1) < this.w[1] / 2 ? this.h2 : 0;
          if (q.y <= sueloY + 0.003) { if (t < 11 && Math.random() < 0.55) this.trozo(q, true); else { q.suelo = true; q.y = sueloY + 0.003; q.rx = -Math.PI / 2; q.rz = 0; } }
        }
        e3.set(q.rx, q.ry, q.rz); m.makeRotationFromEuler(e3); m.setPosition(q.x, q.y, q.z); m.scale(s); C.setMatrixAt(i, m);
      }
      C.instanceMatrix.needsUpdate = true;
    }
    // la cámara: cortes secos entre planos y suave dentro de cada uno
    const { p, l, n } = this.camara(t), wp = g.localToWorld(this.v.c.set(p[0], p[1], p[2])).clone(), wl = g.localToWorld(this.v.d.set(l[0], l[1], l[2])).clone();
    if (n !== this.plano) { this.plano = n; this.camPos.copy(wp); this.camLook.copy(wl); }
    const kk = 1 - Math.exp(-6 * dt); this.camPos.lerp(wp, kk); this.camLook.lerp(wl, kk);
    const cam = o.cam; cam.position.copy(this.camPos); cam.lookAt(this.camLook);
    const fv = innerWidth < innerHeight ? 62 : n === 1 ? 40 : 48; if (Math.abs(cam.fov - fv) > 0.01) { cam.fov = fv; cam.updateProjectionMatrix(); }
    if (navigator.webdriver && window.__ceremoniaSola && t > 14) this.acaba();
  }
  acaba() {
    if (this.hecho || this.saliendo) return; this.saliendo = true;
    this.el.classList.add('pc-sale');
    setTimeout(() => { this.dispose(); this.o.onFin?.(); }, 380);
  }
  dispose() {
    if (this.hecho) return; this.hecho = true;
    removeEventListener('keydown', this.tecla);
    for (const p of this.gente) {
      if (p.agarrada) { p.copa.removeFromParent(); if (p.ch?.userData?.brazoErguido) delete p.ch.userData.brazoErguido.R; }
      if (p.ch) { p.ch.post = p.post0 || null; try { p.ch.mano?.('R', null); p.ch.mano?.('L', null); } catch (e) { /* sin dedos */ } }
      if (p.agarrada) p.copa.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
    }
    for (const f of this.familia || []) { try { f.obj.parent?.remove(f.obj); f.ch.dispose?.(); } catch (e) { /* ya no está */ } }
    this.familia = [];
    for (const a of this.autoridades || []) { try { a.ch.post = null; a.obj.parent?.remove(a.obj); a.ch.dispose?.(); } catch (e) { /* ya no está */ } }
    this.autoridades = [];
    this.grupo.parent?.remove(this.grupo);
    this.grupo.traverse((m) => { if (m.isMesh || m.isInstancedMesh) { m.geometry?.dispose(); const M = Array.isArray(m.material) ? m.material : [m.material]; for (const x of M) { x.map?.dispose(); x.dispose(); } } });
    this.env.dispose();
    this.el.remove();
  }
}
