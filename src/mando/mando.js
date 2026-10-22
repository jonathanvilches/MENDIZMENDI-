// El móvil como mando, como en los juegos de Netflix: el ordenador enseña un código QR y un código de cinco letras; el
// móvil abre la página del mando (public/mando/index.html, sin instalar nada, en Android o en iPhone) y, tras el saludo
// (senal.js), los dos hablan directamente por la wifi con WebRTC. El móvil manda la palanca, el giro de cámara y los
// botones; aquí se presentan como un mando estándar (pad.js), así que valen en todo el juego igual que un mando de verdad.
// Al móvil se le cuenta en qué se está (contextos.js) para que enseñe los botones de cada momento: los del pueblo, los de
// la pelota o el fútbol y, en cada minijuego, una copia de sus botones de la pantalla, con un panel táctil para lo demás.
// La sesión sigue abierta al pasar del menú al pueblo y vuelta: el móvil se puede volver a conectar con el mismo código.
import { senal, ICE } from './senal.js';
import { PAD, VPAD, mandoMovil, botonMovil } from './pad.js';
import { ctxActual, ctxMovil } from './contextos.js';
import { mueve, clic, rueda, pulsar } from './cursor.js';
import { isEU } from '../i18n.js';
import { el } from '../util/html.js';

const WEB = 'https://jonathanvilches.github.io/MENDIZMENDI-/';
const LETRAS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // (sin 0/O ni 1/I/L, que se confunden al escribirlos)
const S = { code: '', sig: null, pc: null, dc: null, estado: 'nada', ctx: '', t: 0, movil: '', ui: null, pill: null };

const CSS = `
.mnd-ov{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:16px;background:rgba(7,2,15,.72);font-family:Nunito,system-ui,sans-serif;color:#f6f3fc}
.mnd-card{position:relative;width:min(760px,100%);max-height:calc(100dvh - 32px);overflow:auto;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px 24px;align-items:center;padding:24px;border-radius:4px;background:linear-gradient(180deg,#31106b,#0c041e);border:1px solid rgba(201,178,255,.25);box-shadow:0 30px 80px rgba(0,0,0,.6)}
.mnd-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:linear-gradient(90deg,#ff2bd6,#7b2ff7)}
.mnd-card h2{grid-column:1/-1;margin:0;font:400 var(--fs-2xl,32px)/1 'MZ Display',Nunito,sans-serif;text-transform:uppercase}
.mnd-card .mnd-lead{grid-column:1/-1;margin:0;color:#cbc2e0;font-size:var(--fs-md,16px)}
.mnd-qr{width:min(240px,62vw);aspect-ratio:1;padding:12px;border-radius:12px;background:#fff;display:grid;place-items:center}
.mnd-qr svg{width:100%;height:100%;display:block}
.mnd-qr.wait{background:rgba(255,255,255,.08)}
.mnd-pasos{margin:0;padding-left:24px;display:grid;gap:8px;font-size:var(--fs-md,16px);line-height:1.4}
.mnd-code{display:inline-block;margin:4px 0 0;padding:4px 12px;border-radius:8px;background:rgba(255,255,255,.1);font:400 var(--fs-2xl,32px)/1.1 'MZ Display',Nunito,sans-serif;letter-spacing:.18em;color:#fff}
.mnd-url{display:block;margin-top:4px;color:#ff9bd8;font-weight:800;overflow-wrap:anywhere}
.mnd-est{grid-column:1/-1;display:flex;align-items:center;gap:12px;margin:0;padding:12px 16px;border-radius:8px;background:rgba(255,255,255,.06);font-weight:800}
.mnd-est i{flex:none;width:12px;height:12px;border-radius:50%;background:#f2c230;box-shadow:0 0 0 4px rgba(242,194,48,.2)}
.mnd-est.ok i{background:#3ee07a;box-shadow:0 0 0 4px rgba(62,224,122,.2)}.mnd-est.mal i{background:#ff5d5d;box-shadow:0 0 0 4px rgba(255,93,93,.2)}
.mnd-bts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.mnd-bts button{min-height:44px;padding:8px 20px;border-radius:4px;border:1px solid rgba(201,178,255,.35);background:rgba(255,255,255,.08);color:#fff;font:800 var(--fs-md,16px) Nunito,sans-serif;cursor:pointer}
.mnd-bts button.go{border:0;background:linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7)}
@media (max-width:620px),(orientation:landscape) and (max-height:520px){.mnd-card{grid-template-columns:1fr;justify-items:center;padding:16px}.mnd-qr{width:min(200px,50dvh)}}
.mnd-pill{position:fixed;left:calc(env(safe-area-inset-left,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9400;display:flex;align-items:center;gap:8px;min-height:40px;padding:4px 14px;border-radius:999px;border:1px solid rgba(201,178,255,.35);background:rgba(20,8,40,.82);color:#fff;font:800 var(--fs-sm,14px) Nunito,sans-serif;cursor:pointer;opacity:.75}
.mnd-pill:hover{opacity:1}.mnd-pill i{width:10px;height:10px;border-radius:50%;background:#f2c230}.mnd-pill.ok i{background:#3ee07a}
`;
let cssOn = false;
const css = () => { if (cssOn) return; cssOn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); };

/** La dirección de la página del mando: la de esta misma web si se juega en ella; si no (el archivo único, el artefacto),
 *  la web publicada. */
function urlMando() {
  const q = new URLSearchParams(location.search), sv = q.get('senal');
  const base = q.get('mandoweb') || (/^https?:$/.test(location.protocol) && !/claude|usercontent/.test(location.hostname) ? new URL('./', location.href).href : WEB);
  return `${base}mando/index.html${sv ? '?senal=' + encodeURIComponent(sv) : ''}#${S.code}`;   // (con index.html: el servidor de pruebas, sin él, da la portada del juego)
}

// ---------- la conexión ----------
async function empezar() {
  if (S.sig) return;
  S.estado = 'prep'; pinta();
  for (let n = 0; n < 4 && !S.sig; n++) {
    S.code = Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
    try { S.sig = await senal('hzh-' + S.code, recibe, () => { S.sig = null; if (S.estado !== 'ok') { S.estado = 'mal'; pinta(); } }); }
    catch (e) { if (e.message !== 'ID-TAKEN') break; }   // (nombre cogido: otro código)
  }
  S.estado = S.sig ? 'espera' : 'mal'; pinta();
}
function cerrarPc() { try { S.dc?.close(); } catch (e) { } try { S.pc?.close(); } catch (e) { } S.dc = S.pc = null; mandoMovil(false); }
/** Lo que llega por el servidor de saludo: la oferta del móvil y sus rutas de red. */
async function recibe(m) {
  if (m.type === 'OFFER' && m.payload?.sdp) {
    cerrarPc();   // (un móvil nuevo, o el mismo que vuelve: se queda el último)
    S.movil = m.src;
    const pc = S.pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = (e) => { if (e.candidate) S.sig?.send(m.src, 'CANDIDATE', { candidate: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (pc === S.pc && ['failed', 'closed', 'disconnected'].includes(pc.connectionState)) caido(); };
    pc.ondatachannel = (e) => abre(e.channel);
    await pc.setRemoteDescription(m.payload.sdp);
    const a = await pc.createAnswer(); await pc.setLocalDescription(a);
    S.sig?.send(m.src, 'ANSWER', { sdp: pc.localDescription.toJSON() });
  } else if (m.type === 'CANDIDATE' && m.src === S.movil && S.pc && m.payload?.candidate) {
    try { await S.pc.addIceCandidate(m.payload.candidate); } catch (e) { }
  }
}
function caido() { if (S.estado !== 'ok') return; cerrarPc(); S.estado = S.sig ? 'caido' : 'mal'; pinta(); }
function abre(dc) {
  S.dc = dc;
  dc.onopen = () => { S.estado = 'ok'; S.ctx = ''; mandoMovil(true); envia({ t: 'hola', lang: isEU() ? 'eu' : 'es' }); pinta(); setTimeout(() => { if (S.estado === 'ok') cierraPanel(); }, 1600); };
  dc.onclose = () => { if (dc === S.dc) caido(); };
  dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } usa(m); };
}
const envia = (m) => { if (S.dc?.readyState === 'open') S.dc.send(JSON.stringify(m)); };
/** Lo que manda el móvil: la palanca, el giro de cámara, los botones del mando, los botones copiados de la pantalla y el
 *  panel táctil (mover la flecha, tocar y desplazar con dos dedos). */
const apretados = new Map();
function usa(m) {
  const n = (v, a = 1) => Math.max(-a, Math.min(a, +v || 0));
  if (m.t === 'ej') { VPAD.axes[0] = n(m.x); VPAD.axes[1] = -n(m.y); VPAD.timestamp = performance.now(); }
  else if (m.t === 'mira') { PAD.lx += n(m.dx, 400) * 2; PAD.ly += n(m.dy, 400) * 2; }
  else if (m.t === 'bt') botonMovil(+m.i, !!m.d);
  else if (m.t === 'esp') {   // (el botón n de la copia: se apoya y se levanta el dedo sobre el botón de verdad)
    if (m.d) { const b = ctxActual().esp[m.n]?.el; if (b) { apretados.set(m.n, b); pulsar(b, true); } }
    else { const b = apretados.get(m.n); apretados.delete(m.n); if (b) pulsar(b, false); }
  }
  else if (m.t === 'cur') mueve(n(m.dx, 400) * 1.8, n(m.dy, 400) * 1.8);
  else if (m.t === 'clic') clic();
  else if (m.t === 'rueda') rueda(n(m.dy, 600) * 2);
  else if (m.t === 'jugar') { const b = [...document.querySelectorAll('#hub [data-play]')].find(x => x.offsetWidth); b?.click(); }
  else if (m.t === 'ping') envia({ t: 'pong', n: m.n });
}

// ---------- en qué se está, para los botones del móvil ----------
setInterval(() => {
  if (S.estado !== 'ok') return;
  const c = ctxMovil(), k = JSON.stringify(c);
  if (k !== S.ctx) { S.ctx = k; envia(c); }
}, 250);

// ---------- el panel ----------
function pinta() {
  if (S.pill) { S.pill.classList.toggle('ok', S.estado === 'ok'); S.pill.hidden = !S.sig; }
  const o = S.ui; if (!o) return;
  const qr = o.querySelector('.mnd-qr');
  if (S.code && S.sig && qr.dataset.code !== S.code) {
    qr.dataset.code = S.code; qr.classList.remove('wait');
    import('qrcode-generator').then(({ default: qrcode }) => { const q = qrcode(0, 'M'); q.addData(urlMando()); q.make(); qr.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); });
    o.querySelector('.mnd-code').textContent = S.code;
    const u = urlMando().replace(/index\.html.*$/, ''); o.querySelector('.mnd-url').textContent = u.replace(/^https?:\/\//, '');
  }
  const est = o.querySelector('.mnd-est'), T = { prep: 'Preparando el código…', espera: 'Esperando al móvil…', ok: '¡Mando conectado!', caido: 'El móvil se ha desconectado. Puede volver a conectarse con el mismo código.', mal: 'No se puede preparar el mando: comprueba la conexión a internet del ordenador.', nada: '' };
  est.className = 'mnd-est' + (S.estado === 'ok' ? ' ok' : S.estado === 'mal' || S.estado === 'caido' ? ' mal' : '');
  est.querySelector('span').textContent = T[S.estado] || '';
  o.querySelector('[data-off]').hidden = !S.sig;
}
function cierraPanel() { S.ui?.remove(); S.ui = null; removeEventListener('keydown', teclas, true); }
const teclas = (e) => { if (e.key === 'Escape' && e.isTrusted) { e.stopImmediatePropagation(); cierraPanel(); } };
/** Abre el panel del mando en el móvil (y prepara el código si aún no lo hay). */
export function abrirMando() {
  css(); cierraPanel();
  const o = S.ui = el(`<div class="mnd-ov" role="dialog" aria-modal="true" aria-label="Mando en el móvil"><div class="mnd-card">
    <h2>Mando en el móvil</h2><p class="mnd-lead">Usa el móvil como mando, sin instalar nada. Funciona con Android y con iPhone.</p>
    <div class="mnd-qr wait" aria-label="Código QR del mando"></div>
    <ol class="mnd-pasos"><li>Conecta el móvil a la misma wifi que el ordenador.</li><li>Abre la cámara del móvil y apunta al código.</li>
      <li>O entra en esta dirección y escribe el código:<span class="mnd-url" data-notr></span><span class="mnd-code" data-notr></span></li><li>Pon el móvil en horizontal y ¡a jugar!</li></ol>
    <p class="mnd-est"><i></i><span></span></p>
    <div class="mnd-bts"><button data-off>Desconectar el mando</button><button class="go" data-close>Cerrar</button></div></div></div>`);
  document.body.appendChild(o);
  o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-close]')) cierraPanel(); });
  o.querySelector('[data-off]').onclick = () => terminar();
  addEventListener('keydown', teclas, true);
  if (!S.pill) {
    S.pill = el('<button class="mnd-pill" hidden><i></i><span>Mando del móvil</span></button>');
    S.pill.onclick = () => abrirMando(); document.body.appendChild(S.pill);
  }
  pinta(); empezar();
}
/** Termina la sesión: el móvil deja de mandar y el código deja de valer. */
export function terminar() {
  envia({ t: 'adios' }); setTimeout(cerrarPc, 400);   // (que el adiós llegue antes de cortar)
  S.sig?.close(); S.sig = null; S.code = ''; S.estado = 'nada';
  if (S.pill) S.pill.hidden = true; cierraPanel();
}
// (para las pruebas: el código y el estado)
window.__mando = { get code() { return S.code; }, get estado() { return S.estado; }, abrir: abrirMando };
