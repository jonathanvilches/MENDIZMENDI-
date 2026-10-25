// El móvil como mando, como en los juegos de Netflix: el ordenador enseña un código QR y un código de cinco letras; el
// móvil abre la página del mando (public/mando/index.html, sin instalar nada, en Android o en iPhone) y, tras el saludo
// (senal.js), los dos hablan directamente por la wifi con WebRTC. El móvil manda la palanca, el giro de cámara y los
// botones; aquí se presentan como un mando estándar (pad.js), así que valen en todo el juego igual que un mando de verdad.
// Al móvil se le cuenta en qué se está (contextos.js) para que enseñe los botones de cada momento: los del pueblo, los de
// la pelota o el fútbol y, en cada minijuego, una copia de sus botones de la pantalla, con un panel táctil para lo demás.
// La sesión sigue abierta al pasar del menú al pueblo y vuelta: el móvil se puede volver a conectar con el mismo código.
import { senal, ICE, SENAL_PRUEBA, SIN_P2P, CAMINOS, nuevoSecreto } from './senal.js';
import { PAD, mandoMovil, botonMovil, palancaMovil, vigilaMovil } from './pad.js';
import { ctxActual, ctxMovil, misMovil, seguirMision } from './contextos.js';
import { mueve, clic, rueda, pulsar } from './cursor.js';
import { isEU } from '../i18n.js';
import { el } from '../util/html.js';

const WEB = 'https://jonathanvilches.github.io/MENDIZMENDI-/';
const LETRAS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // (sin 0/O ni 1/I/L, que se confunden al escribirlos)
// (secreto: el del QR; fuerte: si el móvil que manda llegó con él o con el código escrito a mano; pide: la oferta de un
// móvil que escribió el código y espera permiso; dejados y vetados: los que se aceptaron o se rechazaron)
// el móvil de siempre: el código y su secreto se guardan en este ordenador (el QR es el mismo cada vez) y, cuando un móvil
// se ha conectado, el juego le espera solo al abrirse, sin abrir el panel: la app «Mando» del móvil se conecta sola.
// «Terminar» lo olvida (el código deja de valer y el próximo será otro)
const GUARDA = 'herrizherri-mando-v1';
const guardado = () => { try { const g = JSON.parse(localStorage.getItem(GUARDA) || 'null'); return g?.code?.length === 5 && g.secreto ? g : null; } catch (e) { return null; } };
const guardar = (o) => { try { if (o) localStorage.setItem(GUARDA, JSON.stringify(o)); else localStorage.removeItem(GUARDA); } catch (e) { } };
const S = { code: '', secreto: '', of: '', respuesta: null, sig: null, pc: null, dc: null, relevo: false, vivo: 0, estado: 'nada', ctx: '', t: 0, movil: '', fuerte: false, pide: null, dejados: new Set(), vetados: new Set(), ui: null, pill: null, vias: {}, otra: 0 };

const CSS = `
.mnd-ov{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:16px;background:rgba(7,2,15,.72);font-family:Nunito,system-ui,sans-serif;color:#f6f3fc}
.mnd-card{position:relative;width:min(760px,100%);max-height:calc(calc(100dvh / var(--z, 1)) - 32px);overflow:auto;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px 24px;align-items:center;padding:24px;border-radius:4px;background:linear-gradient(180deg,#31106b,#0c041e);border:1px solid rgba(201,178,255,.25);box-shadow:0 30px 80px rgba(0,0,0,.6)}
.mnd-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:linear-gradient(90deg,#ff2bd6,#7b2ff7)}
.mnd-card h2{grid-column:1/-1;margin:0;font:400 var(--fs-2xl,32px)/1 'MZ Display',Nunito,sans-serif;text-transform:uppercase}
.mnd-card .mnd-lead{grid-column:1/-1;margin:0;color:#cbc2e0;font-size:var(--fs-md,16px)}
.mnd-qr{width:min(240px,calc(62vw / var(--z, 1)));aspect-ratio:1;padding:12px;border-radius:12px;background:#fff;display:grid;place-items:center}
.mnd-qr svg{width:100%;height:100%;display:block}
.mnd-qr.wait{background:rgba(255,255,255,.08)}
.mnd-pasos{margin:0;padding-left:24px;display:grid;gap:8px;font-size:var(--fs-md,16px);line-height:1.4}
.mnd-code{display:inline-block;margin:4px 0 0;padding:4px 12px;border-radius:8px;background:rgba(255,255,255,.1);font:400 var(--fs-2xl,32px)/1.1 'MZ Display',Nunito,sans-serif;letter-spacing:.18em;color:#fff}
.mnd-url{display:block;margin-top:4px;color:#ff9bd8;font-weight:800;overflow-wrap:anywhere}
.mnd-est{grid-column:1/-1;display:flex;align-items:center;gap:12px;margin:0;padding:12px 16px;border-radius:8px;background:rgba(255,255,255,.06);font-weight:800}
.mnd-est i{flex:none;width:12px;height:12px;border-radius:50%;background:#f2c230;box-shadow:0 0 0 4px rgba(242,194,48,.2)}
.mnd-est.ok i{background:#3ee07a;box-shadow:0 0 0 4px rgba(62,224,122,.2)}.mnd-est.mal i{background:#ff5d5d;box-shadow:0 0 0 4px rgba(255,93,93,.2)}
.mnd-vias{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:-8px 0 0;color:#cbc2e0;font-size:var(--fs-xs,12px);font-weight:800}
.mnd-vias span{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.06)}
.mnd-vias span::before{content:'';width:8px;height:8px;border-radius:50%;background:#f2c230}.mnd-vias .ok::before{background:#3ee07a}.mnd-vias .mal::before{background:#ff5d5d}
.mnd-pide{grid-column:1/-1;display:grid;gap:12px;margin:0;padding:16px;border-radius:8px;background:rgba(242,194,48,.12);border:1px solid rgba(242,194,48,.45)}.mnd-pide[hidden]{display:none}
.mnd-pide p{margin:0;font-weight:800;line-height:1.4}.mnd-pide div{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.mnd-pide button{min-height:44px;padding:8px 20px;border-radius:4px;border:1px solid rgba(201,178,255,.35);background:rgba(255,255,255,.08);color:#fff;font:800 var(--fs-md,16px) Nunito,sans-serif;cursor:pointer}.mnd-pide button.go{border:0;background:linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7)}
.mnd-bts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}
.mnd-bts button{min-height:44px;padding:8px 20px;border-radius:4px;border:1px solid rgba(201,178,255,.35);background:rgba(255,255,255,.08);color:#fff;font:800 var(--fs-md,16px) Nunito,sans-serif;cursor:pointer}
.mnd-bts button.go{border:0;background:linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7)}
.mnd-bts a.go{display:inline-flex;align-items:center;min-height:44px;padding:8px 20px;border-radius:4px;background:linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7);color:#fff;font:800 var(--fs-md,16px) Nunito,sans-serif;text-decoration:none}
@media (max-width:620px),(orientation:landscape) and (max-height:520px){.mnd-card{grid-template-columns:1fr;justify-items:center;padding:16px}.mnd-qr{width:min(200px,calc(50dvh / var(--z, 1)))}}
.mnd-pill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9400;display:flex;align-items:center;gap:8px;min-height:40px;padding:4px 14px;border-radius:999px;border:1px solid rgba(201,178,255,.35);background:rgba(20,8,40,.82);color:#fff;font:800 var(--fs-sm,14px) Nunito,sans-serif;cursor:pointer;opacity:.75}
.mnd-pill[hidden]{display:none}.mnd-pill:hover{opacity:1}.mnd-pill i{width:10px;height:10px;border-radius:50%;background:#f2c230}.mnd-pill.ok i{background:#3ee07a}
`;
let cssOn = false;
const css = () => { if (cssOn) return; cssOn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); };

/** La dirección de la página del mando: la de esta misma web si se juega en ella; si no (el archivo único, el artefacto),
 *  la web publicada. */
function urlMando() {
  const q = new URLSearchParams(location.search);
  const base = q.get('mandoweb') || (/^https?:$/.test(location.protocol) && !/claude|usercontent/.test(location.hostname) ? new URL('./', location.href).href : WEB);
  return `${base}mando/index.html${SENAL_PRUEBA ? '?' + SENAL_PRUEBA : ''}#${S.code}.${S.secreto}`;   // (con index.html: el servidor de pruebas, sin él, da la portada del juego; detrás del «#», que no va a ningún servidor, el secreto)
}

// ---------- la conexión ----------
async function empezar() {
  if (S.sig || S.estado === 'prep') return;
  S.estado = 'prep'; clearTimeout(S.otra);
  const g = guardado(); if (!S.code && g) { S.code = g.code; S.secreto = g.secreto; }
  for (let n = 0; n < 4 && !S.sig; n++) {
    // (el QR sale ya; al volver a probar se queda el mismo código, que puede estar ya en el móvil: solo cambia si está cogido)
    if (!S.code || n) { S.code = [...crypto.getRandomValues(new Uint32Array(5))].map(x => LETRAS[x % LETRAS.length]).join(''); S.secreto = nuevoSecreto(); }
    pinta();
    try { S.sig = await senal('hzh-' + S.code, recibe, (v) => { S.vias = v; pinta(); }, S.secreto); }
    catch (e) { if (e.message !== 'ID-TAKEN') break; }   // (nombre cogido: otro código)
  }
  if (S.sig) guardar({ code: S.code, secreto: S.secreto, emparejado: !!(g && g.code === S.code && g.emparejado) });
  S.estado = S.sig ? 'espera' : 'mal'; pinta(); if (!S.sig) otraVez();
}
/** Al abrir el juego: si un móvil se conectó otra vez, se le espera ya, sin abrir el panel. */
export function esperarMovil() { if (guardado()?.emparejado && !S.sig && !(typeof __AF__ !== 'undefined' && __AF__)) { S.auto = true; empezar(); } }
// (sin ningún camino: se vuelve a probar solo cada 5 s, con el mismo código, mientras el panel siga abierto o se espere al
// móvil de siempre)
function otraVez() { clearTimeout(S.otra); S.otra = setTimeout(() => { if ((S.ui || S.auto) && !S.sig) empezar(); }, 5000); }
function cerrarPc() { try { S.dc?.close(); } catch (e) { } try { S.pc?.close(); } catch (e) { } S.dc = S.pc = null; S.relevo = false; mandoMovil(false); sueltaCopia(); }
/** Lo que llega por el servidor de saludo: la oferta del móvil y sus rutas de red. */
async function recibe(m) {
  // (el mando por el saludo, cuando no han podido hablar directamente: el móvil lo pide mandando por aquí)
  if (m.type === 'DATA') {
    if (m.src !== S.movil || m.fuerte !== S.fuerte || !m.payload) return;   // (solo el móvil aceptado, con su misma clave)
    S.vivo = performance.now();
    if (!S.relevo && S.dc?.readyState !== 'open') { S.relevo = true; listo(); }
    usa(m.payload); return;
  }
  if (m.type === 'OFFER' && m.payload?.sdp) {
    // (quien escribió el código a mano, con permiso: se pregunta en el panel; con el QR se entra directamente)
    if (!m.fuerte && !S.dejados.has(m.src)) { if (!S.vetados.has(m.src)) { S.pide = m; if (!S.ui) abrirMando(); else pinta(); } return; }
    // (la misma oferta, repetida porque la respuesta no le ha llegado al móvil, por ejemplo si el camino por el que iba se
    // cayó: se le vuelve a mandar la respuesta, sin empezar de nuevo)
    const of = m.payload.of || m.payload.k;
    if (of && of === S.of && m.src === S.movil) { if (S.respuesta) S.sig?.send(m.src, 'ANSWER', S.respuesta, m.fuerte); return; }
    cerrarPc();   // (un móvil nuevo, o el mismo que vuelve: se queda el último)
    S.of = of; S.respuesta = null; S.movil = m.src; S.fuerte = m.fuerte; if (S.estado !== 'ok') { S.estado = 'llama'; pinta(); }
    const pc = S.pc = new RTCPeerConnection({ iceServers: ICE, ...(SIN_P2P ? { iceTransportPolicy: 'relay' } : {}) }); let dicho = false;
    pc.onicecandidate = (e) => { if (e.candidate && dicho) S.sig?.send(m.src, 'CANDIDATE', { candidate: e.candidate.toJSON() }, m.fuerte); };   // (las que lleguen tarde)
    pc.onconnectionstatechange = () => { if (pc === S.pc && !S.relevo && ['failed', 'closed', 'disconnected'].includes(pc.connectionState)) caido(); };
    pc.ondatachannel = (e) => { if (e.channel.label === 'rapido') rapido(e.channel); else abre(e.channel); };
    await pc.setRemoteDescription(m.payload.sdp);
    for (const c of antes.get(m.src) || []) if (c.fuerte === m.fuerte) { try { await pc.addIceCandidate(c.payload.candidate); } catch (e) { } }
    antes.delete(m.src);
    const a = await pc.createAnswer(); await pc.setLocalDescription(a);
    await rutas(pc, 800);   // (la respuesta, con las rutas de red que haya dentro; las que salgan después van sueltas)
    if (pc !== S.pc) return;
    S.respuesta = { sdp: pc.localDescription.toJSON() }; S.sig?.send(m.src, 'ANSWER', S.respuesta, m.fuerte); dicho = true;
  } else if (m.type === 'CANDIDATE' && m.payload?.candidate) {
    if (m.src === S.movil && m.fuerte === S.fuerte && S.pc) { try { await S.pc.addIceCandidate(m.payload.candidate); } catch (e) { } }
    else if (!S.vetados.has(m.src)) { let a = antes.get(m.src); if (!a) { a = []; antes.set(m.src, a); if (antes.size > 8) antes.delete(antes.keys().next().value); } if (a.length < 40) a.push(m); }
  }
}
// (las rutas de red de un móvil que llegan antes que su oferta, por un camino más rápido, o mientras se le pide permiso)
const antes = new Map();
// (espera a tener las rutas de red: todas, o alguna de fuera de casa, o como mucho ms)
const rutas = (pc, ms) => new Promise((ok) => {
  const ya = () => pc.iceGatheringState === 'complete' || / typ (srflx|relay) /.test(pc.localDescription?.sdp || '');
  if (ya()) return ok();
  const fin = () => { clearTimeout(t); pc.removeEventListener('icecandidate', mira); pc.removeEventListener('icegatheringstatechange', mira); ok(); };
  const mira = () => { if (ya()) fin(); }, t = setTimeout(fin, ms);
  pc.addEventListener('icecandidate', mira); pc.addEventListener('icegatheringstatechange', mira);
});
function caido() { if (S.estado !== 'ok') return; cerrarPc(); S.estado = S.sig ? 'caido' : 'mal'; pinta(); if (!S.sig) otraVez(); }
function abre(dc) {
  S.dc = dc;
  dc.onopen = () => { const ya = S.relevo; S.relevo = false; if (!ya) listo(); else { pareja(); pinta(); } };   // (si ya iba por el saludo, sigue por aquí, más rápido)
  dc.onclose = () => { if (dc === S.dc && !S.relevo) caido(); };
  dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } usa(m); };
}
// el canal rápido del móvil: la palanca, la cámara y la flecha, sin orden ni reenvíos. Por el canal de siempre, si un
// mensaje se perdía por la wifi, los siguientes esperaban a que se reenviara (un cuarto de segundo o más) y el jugador
// andaba a tirones. Aquí, uno perdido no frena a los demás: vale el más nuevo, por su número (nuevo)
const RAPIDO = new Set(['ej', 'mira', 'cur', 'rueda']);
function rapido(dc) { dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } if (RAPIDO.has(m?.t)) usa(m); }; }
// conectado: el panel lo dice, el móvil recibe el idioma y sus botones, y el panel se cierra solo (y sabe que puede abrir
// el canal rápido: uno de antes no lo conoce)
function listo() { S.estado = 'ok'; S.ctx = S.mis = ''; ultimo.clear(); mandoMovil(true); envia({ t: 'hola', lang: isEU() ? 'eu' : 'es', rapido: true });
  guardar({ code: S.code, secreto: S.secreto, emparejado: true }); pareja(); pinta(); setTimeout(() => { if (S.estado === 'ok' && !S.pide) cierraPanel(); }, 1600); }
// (el móvil se queda con este ordenador: el código y su secreto, solo por la conexión directa, que va cifrada de punta a
// punta; si entró con el código a mano, la próxima vez entra directamente, sin pedir permiso)
function pareja() { if (S.dc?.readyState === 'open') S.dc.send(JSON.stringify({ t: 'pareja', code: S.code, secreto: S.secreto })); }
const envia = (m) => { if (S.dc?.readyState === 'open') S.dc.send(JSON.stringify(m)); else if (S.relevo && S.movil) S.sig?.send(S.movil, 'DATA', m, S.fuerte); };
// (por el saludo no hay aviso de corte: si el móvil no dice nada en 8 s —manda señal cada 2—, se ha ido)
setInterval(() => { if (S.relevo && S.estado === 'ok' && performance.now() - S.vivo > 8000) caido(); }, 2000);
/** Lo que manda el móvil: la palanca, el giro de cámara, los botones del mando, los botones copiados de la pantalla y el
 *  panel táctil (mover la flecha, tocar y desplazar con dos dedos). */
// (los botones de la copia que el móvil tiene apretados: el botón de verdad y la última vez que el móvil dijo que seguía.
// Si el móvil repite y deja de decirlo 1,5 s, el «soltar» se ha perdido y se suelta aquí; y al cortarse, también)
const apretados = new Map();
let repite = false;
function sueltaEsp(n) { const a = apretados.get(n); apretados.delete(n); if (a) pulsar(a.b, false); }
function sueltaCopia() { for (const n of [...apretados.keys()]) sueltaEsp(n); repite = false; }
setInterval(() => { if (!repite) return; const t = performance.now(); for (const [n, a] of apretados) if (t - a.t > 1500) sueltaEsp(n); }, 500);
// (por el saludo, lo del móvil puede llegar desordenado: va por dos caminos, cada uno a su paso. De la palanca y de cada
// botón vale solo lo más nuevo, por su número; si no, un «pulsado» que llegaba después de su «soltar» lo dejaba pulsado)
const ultimo = new Map();
function nuevo(m) {
  if (typeof m.s !== 'number') return true;   // (un móvil de antes no los numera)
  // (y el que numera también repite lo que mantiene: se vigila aunque su «repite» se quedara en una conexión anterior)
  if (!repite) { vigilaMovil(true); repite = true; }
  const k = m.t === 'ej' ? 'ej' : m.t + (m.t === 'bt' ? m.i : m.n);
  if (m.s <= (ultimo.get(k) ?? -1)) return false;
  ultimo.set(k, m.s); return true;
}
function usa(m) {
  const n = (v, a = 1) => Math.max(-a, Math.min(a, +v || 0));
  if ((m.t === 'ej' || m.t === 'bt' || m.t === 'esp') && !nuevo(m)) return;
  if (m.t === 'ej') palancaMovil(n(m.x), n(m.y));
  else if (m.t === 'repite') { vigilaMovil(true); repite = true; }   // (el móvil repite lo que mantiene pulsado: lo que no se repita, se suelta)
  else if (m.t === 'mira') { PAD.mx += n(m.dx, 400) * 2; PAD.my += n(m.dy, 400) * 2; }   // (Input lo reparte en varios fotogramas)
  else if (m.t === 'bt') botonMovil(+m.i, !!m.d);
  else if (m.t === 'esp') {   // (el botón n de la copia: se apoya y se levanta el dedo sobre el botón de verdad)
    if (!m.d) sueltaEsp(m.n);
    else {   // (la repetición de uno que ya está apretado solo dice que sigue)
      const b = ctxActual().esp[m.n]?.el, a = apretados.get(m.n);
      if (a && a.b === b) a.t = performance.now();
      else { if (a) sueltaEsp(m.n); if (b) { apretados.set(m.n, { b, t: performance.now() }); pulsar(b, true); } }
    }
  }
  else if (m.t === 'cur') mueve(n(m.dx, 400) * 1.8, n(m.dy, 400) * 1.8);
  else if (m.t === 'clic') clic();
  else if (m.t === 'rueda') rueda(n(m.dy, 600) * 2);
  else if (m.t === 'jugar') {   // (el botón de jugar del menú; si se está en otra pestaña, se va antes a Inicio, que lo tiene)
    const jugar = () => [...document.querySelectorAll('#hub [data-play]')].find(x => x.offsetWidth), b = jugar();
    if (b) b.click(); else { document.querySelector('#hub [data-s="home"]')?.click(); setTimeout(() => jugar()?.click(), 400); }
  }
  else if (m.t === 'seguir') seguirMision(+m.i);
  else if (m.t === 'ping') envia({ t: 'pong', n: m.n });
}

// ---------- en qué se está, para los botones del móvil ----------
let vuelta = 0;
setInterval(() => {
  if (S.estado !== 'ok') return;
  const c = ctxMovil(), k = JSON.stringify(c);
  if (k !== S.ctx) { S.ctx = k; envia(c); }
  // (y las misiones del pueblo, una vez por segundo, si han cambiado)
  if (++vuelta % 4 === 0) { const m = misMovil() || { t: 'mis', lista: [] }, km = JSON.stringify(m); if (km !== S.mis) { S.mis = km; envia(m); } }
}, 250);

// ---------- el panel ----------
function pinta() {
  // (el aviso de abajo, solo si el mando espera o se ha caído, y fuera del menú, que tiene su botón arriba; el botón del
  // menú dice si está conectado)
  // (conectado, fuera los controles de pantalla en todo el juego: <html class="con-mando">, util/tactil.js)
  document.documentElement.classList.toggle('con-mando', S.estado === 'ok');
  const enMenu = !!document.querySelector('#hub:not(.hidden)'), mb = document.querySelector('[data-mando]');
  if (S.pill) S.pill.hidden = !S.sig || S.estado === 'ok' || enMenu;
  if (mb) { mb.classList.toggle('ok', S.estado === 'ok'); mb.querySelector('span').textContent = S.estado === 'ok' ? 'Mando conectado' : 'Mando del móvil'; }
  const o = S.ui; if (!o) return;
  const qr = o.querySelector('.mnd-qr');
  // (el QR sale en cuanto hay código, sin esperar al servidor: si el móvil llega antes, repite su saludo hasta que contestan)
  if (S.code && S.estado !== 'mal' && qr.dataset.code !== S.code) {
    qr.dataset.code = S.code; qr.classList.remove('wait');
    import('qrcode-generator').then(({ default: qrcode }) => { const q = qrcode(0, 'M'); q.addData(urlMando()); q.make(); qr.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); });
    o.querySelector('.mnd-code').textContent = S.code;
    const u = urlMando().replace(/index\.html.*$/, ''); o.querySelector('.mnd-url').textContent = u.replace(/^https?:\/\//, '');
  }
  const est = o.querySelector('.mnd-est'), T = { prep: 'Preparando el código…', espera: 'Esperando al móvil…', llama: 'El móvil ha llamado: conectando…', ok: S.relevo ? '¡Mando conectado! Va por internet.' : '¡Mando conectado!', caido: 'El móvil se ha desconectado. Puede volver a conectarse con el mismo código.', mal: 'No llego a ningún servidor para presentar el móvil. Lo vuelvo a intentar…', nada: '' };
  est.className = 'mnd-est' + (S.estado === 'ok' ? ' ok' : S.estado === 'mal' || S.estado === 'caido' ? ' mal' : '');
  est.querySelector('span').textContent = T[S.estado] || '';
  // (los servidores con que se presentan el ordenador y el móvil: cuáles contestan, para saber qué pasa si no conecta)
  o.querySelector('.mnd-vias').innerHTML = CAMINOS.map(c => `<span class="${S.vias[c.n] || ''}">${c.n}</span>`).join('');
  o.querySelector('[data-off]').hidden = !S.sig;
  o.querySelector('.mnd-pide').hidden = !S.pide;
}
function cierraPanel() { S.ui?.remove(); S.ui = null; removeEventListener('keydown', teclas, true); }
const teclas = (e) => { if (e.key === 'Escape' && e.isTrusted) { e.stopImmediatePropagation(); cierraPanel(); } };
/** Abre el panel del mando en el móvil (y prepara el código si aún no lo hay). */
export function abrirMando() {
  css(); cierraPanel();
  // (dentro de claude.ai la página no puede hablar con el servidor que presenta el móvil al ordenador: se explica y se
  // manda a la web del juego, donde sí funciona)
  if (typeof __AF__ !== 'undefined' && __AF__) {
    const o = S.ui = el(`<div class="mnd-ov" role="dialog" aria-modal="true" aria-label="Mando en el móvil"><div class="mnd-card">
      <h2>Mando en el móvil</h2><p class="mnd-lead">Aquí, dentro de claude.ai, el mando no puede conectarse: esta vista no deja hablar con el servidor que presenta el móvil al ordenador. En la web del juego sí funciona.</p>
      <div class="mnd-bts"><button data-close>Cerrar</button><a class="go" href="${WEB}?screen=profile" target="_blank" rel="noopener">Abrir la web del juego</a></div></div></div>`);
    document.body.appendChild(o);
    o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-close]')) cierraPanel(); });
    addEventListener('keydown', teclas, true);
    return;
  }
  const o = S.ui = el(`<div class="mnd-ov" role="dialog" aria-modal="true" aria-label="Mando en el móvil"><div class="mnd-card">
    <h2>Mando en el móvil</h2><p class="mnd-lead">Usa el móvil como mando. Funciona con Android y con iPhone.</p>
    <div class="mnd-qr wait" aria-label="Código QR del mando"></div>
    <ol class="mnd-pasos"><li>Conecta el móvil a internet: mejor, a la misma wifi que el ordenador.</li><li>Abre la cámara del móvil y apunta al código.</li>
      <li>O entra en esta dirección y escribe el código:<span class="mnd-url" data-notr></span><span class="mnd-code" data-notr></span></li><li>Pon el móvil en horizontal y ¡a jugar!</li><li>Para no repetirlo: en el móvil, instala la app «Mando». Se abre desde su icono, sin el navegador, y la próxima vez se conecta sola en cuanto el juego esté abierto.</li></ol>
    <p class="mnd-est"><i></i><span></span></p>
    <p class="mnd-vias" data-notr aria-label="Servidores"></p>
    <div class="mnd-pide" hidden><p>Un móvil ha escrito el código a mano y quiere ser el mando. ¿Es el tuyo?</p><div><button data-no>No, no lo conozco</button><button class="go" data-si>Sí, dejarle</button></div></div>
    <div class="mnd-bts"><button data-off>Olvidar este móvil</button><button class="go" data-close>Cerrar</button></div></div></div>`);
  document.body.appendChild(o);
  o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-close]')) cierraPanel(); });
  o.querySelector('[data-off]').onclick = () => terminar();
  // (el permiso para quien escribió el código a mano: sí, entra como si hubiera llegado ahora; no, ya no se le escucha)
  o.querySelector('[data-si]').onclick = () => { const m = S.pide; S.pide = null; if (m) { S.dejados.add(m.src); recibe(m); } pinta(); };
  o.querySelector('[data-no]').onclick = () => { if (S.pide) S.vetados.add(S.pide.src); S.pide = null; pinta(); };
  addEventListener('keydown', teclas, true);
  if (!S.pill) {
    S.pill = el('<button class="mnd-pill" hidden><i></i><span>Mando del móvil</span></button>');   // (amarillo: esperando al móvil)
    S.pill.onclick = () => abrirMando(); document.body.appendChild(S.pill);
  }
  pinta(); empezar();
}
/** Termina la sesión: el móvil deja de mandar y el código deja de valer. */
export function terminar() {
  // (que el adiós llegue antes de cortar, también si va por el saludo: el saludo se cierra con la conexión)
  envia({ t: 'adios' }); const sig = S.sig; setTimeout(() => { cerrarPc(); sig?.close(); }, 400);
  S.sig = null; S.code = ''; S.secreto = ''; S.auto = false; guardar(null); S.of = ''; S.respuesta = null; S.estado = 'nada'; S.vias = {}; S.pide = null; S.dejados.clear(); S.vetados.clear(); antes.clear(); clearTimeout(S.otra);
  if (S.pill) S.pill.hidden = true; pinta(); cierraPanel();
}
// (para las pruebas: el código y el estado)
window.__mando = { get code() { return S.code; }, get estado() { return S.estado; }, get url() { return urlMando(); }, get pide() { return !!S.pide; }, abrir: abrirMando };
