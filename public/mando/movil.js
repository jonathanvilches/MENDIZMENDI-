// La página del mando en el móvil (public/mando/index.html): conectar con el código del ordenador, los botones de cada
// momento y lo que se manda al tocarlos. Va en su propio archivo para que la página no admita código escrito dentro de
// ella (su política de seguridad, en index.html, solo deja cargar esto y el saludo, y solo hablar con los servidores del
// saludo).
// ---------- textos (castellano y euskera: el ordenador dice cuál) ----------
const EU = {
  'Mando en el móvil': 'Mugikorra aginte gisa', 'Conectar': 'Konektatu', 'Código': 'Kodea', 'Pantalla completa': 'Pantaila osoa',
  'Escribe el código que sale en el ordenador, en «Mando del móvil».': 'Idatzi ordenagailuan, «Mugikorreko agintea» atalean, ateratzen den kodea.',
  'El móvil y el ordenador, mejor en la misma wifi.': 'Mugikorra eta ordenagailua, hobe wifi berean.', 'Mejor con el móvil en horizontal': 'Hobe mugikorra etzanda',
  'Escribir el código a mano': 'Kodea eskuz idatzi',
  'Conectando…': 'Konektatzen…', 'Conectado': 'Konektatuta', 'Reconectando…': 'Berriro konektatzen…',
  'No encuentro el juego con ese código. Mira el código en el ordenador y que su ventana del mando siga abierta.': 'Ez dut jokoa aurkitzen kode horrekin. Begiratu ordenagailuko kodea eta agintearen leihoa irekita dagoela.',
  'No llego a ningún servidor para presentarme al ordenador. Comprueba internet en el móvil: lo vuelvo a intentar…': 'Ez dut ordenagailuari aurkezteko zerbitzaririk lortzen. Begiratu mugikorraren internet: berriro saiatzen…',
  'Buscando el ordenador…': 'Ordenagailua bilatzen…', 'Acepta en el ordenador que este móvil sea el mando.': 'Onartu ordenagailuan mugikor hau agintea izatea.', 'El ordenador ha contestado: conectando…': 'Ordenagailuak erantzun du: konektatzen…',
  'El código tiene cinco letras o números.': 'Kodeak bost letra edo zenbaki ditu.', 'El juego ha cerrado el mando.': 'Jokoak agintea itxi du.',
  'Desliza para andar': 'Irristatu ibiltzeko', 'Desliza para moverte': 'Irristatu mugitzeko', 'Desliza para mirar': 'Irristatu begiratzeko',
  'Desliza': 'Irristatu', 'para mover la flecha': 'gezia mugitzeko', 'Toca': 'Ukitu', 'para pulsar': 'sakatzeko', 'Dos dedos': 'Bi hatzekin', 'para subir y bajar': 'gora eta behera egiteko',
  'Elige en el ordenador con la flecha, o sigue tu aventura:': 'Aukeratu ordenagailuan geziarekin, edo jarraitu zure abenturarekin:', '¡A jugar!': 'Jolastera!',
  'Acción': 'Ekintza', 'Saltar': 'Jauzi', 'Prismáticos': 'Prismatikoak', 'Mochila': 'Motxila', 'Correr': 'Korrika', 'Mapa': 'Mapa', 'Cuaderno': 'Koadernoa', 'Menú': 'Menua', 'Perro': 'Txakurra',
  'Seguir': 'Jarraitu', 'Anotar': 'Idatzi', 'Salir': 'Irten', 'Atrás': 'Atzera', 'Golpe': 'Kolpea', 'Cortada': 'Moztua', 'Dejada': 'Utzia', 'Globo': 'Globoa', 'Pausa': 'Etenaldia',
  'Pase': 'Pasea', 'Tiro': 'Jaurtiketa', 'Cambiar': 'Aldatu', 'Sprint': 'Esprinta', 'Periódico': 'Egunkaria', 'Cámara': 'Kamera', 'Coser': 'Josi',
  'En el pueblo': 'Herrian', 'El encierro': 'Entzierroa', 'Hablando': 'Hizketan', 'Pregunta': 'Galdera', 'Pelota a mano': 'Esku pilota', 'Pasaka': 'Pasaka',
  'Fútbol': 'Futbola', 'El esquileo': 'Ardi-mozketa', 'La costura': 'Josketa', 'En el menú': 'Menuan',
};
let LANG = (navigator.language || 'es').toLowerCase().startsWith('eu') ? 'eu' : 'es';
const T = (s) => (LANG === 'eu' && EU[s]) || s;
const traduce = () => {
  document.documentElement.lang = LANG; document.querySelectorAll('[data-t]').forEach(n => { n.textContent = T(n.dataset.t); });
  $('#code').setAttribute('aria-label', T('Código')); $('#bFull').setAttribute('aria-label', T('Pantalla completa'));
};
const $ = (s) => document.querySelector(s);
traduce();

// ---------- el saludo: el mismo archivo que usa el ordenador (src/mando/senal.js, publicado al lado de esta página) ----------
// (con la hora detrás: nunca una copia guardada de una versión anterior; sin internet, conectar avisa)
let M = null; try { M = await import(`./senal.js?v=${Date.now()}`); } catch (e) { }
const { senal, ICE, SIN_P2P, CAMINOS, SECRETO } = M || { senal: () => Promise.reject(new Error('red')), ICE: [], SIN_P2P: false, CAMINOS: [], SECRETO: /^$/ };

// ---------- la conexión ----------
// Lo más rápido posible: las rutas de red se buscan mientras se llega al servidor del saludo; la oferta sale con las que
// haya (las que salgan después van sueltas); y, en cuanto el ordenador contesta, si en un momento no han conseguido hablar
// directamente, el mando ya funciona por el saludo y pasa solo a la conexión directa cuando esté.
const LETRAS = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;
const NOHAY = 'No encuentro el juego con ese código. Mira el código en el ordenador y que su ventana del mando siga abierta.';
const RUTAS = 1000, DIRECTO = 700;   // (ms: lo que se espera, como mucho, a las rutas de red y a hablar directamente)
let fuerte = false, code = '', sig = null, pc = null, dc = null, conectado = false, intentos = 0, espera = 0, cerrado = false, repite = 0, respondido = false, relevo = false, pasoT = 0, oido = 0, otra = 0, sinRed = 0, dicha = false, intento = 0, tardaT = 0;
let sueltas = [];   // (las rutas del ordenador que llegan antes que su respuesta)
// lo de esta sesión, guardado en el móvil mientras la pestaña siga abierta: el código, el secreto del QR (si se llegó por
// él) y el nombre de este móvil, el mismo en cada reconexión (así, si el ordenador ya le dio permiso, no vuelve a preguntar)
const SES = 'herrizherri-mando';
const sesion = () => { try { return JSON.parse(sessionStorage.getItem(SES) || '{}'); } catch (e) { return {}; } };
const guarda = (o) => { try { sessionStorage.setItem(SES, JSON.stringify(o)); } catch (e) { } };
const msg = (t, mal) => { $('#msg').textContent = t ? T(t) : ''; $('#msg').classList.toggle('mal', !!mal); };
// (la pantalla de conectar: el formulario del código, o la rueda mientras se conecta; si tarda, los servidores con que se
// presenta, en verde los que contestan, y la opción de escribir el código)
function pantalla(esperando) {
  $('#espera').classList.toggle('hide', !esperando); $('#forma').classList.toggle('hide', esperando);
  $('#otro').classList.add('hide'); clearTimeout(tardaT); $('#go').disabled = esperando;
  if (esperando) tardaT = setTimeout(() => { $('#otro').classList.remove('hide'); $('#vias').classList.remove('hide'); }, 5000);
  else $('#vias').classList.toggle('hide', !$('#msg').classList.contains('mal'));
}
const vias = (e = {}) => { $('#vias').innerHTML = CAMINOS.map(c => `<span class="${e[c.n] || ''}">${c.n}</span>`).join(''); };
async function conectar() {
  code = $('#code').value.trim().toUpperCase();
  if (!LETRAS.test(code)) { msg('El código tiene cinco letras o números.', true); pantalla(false); return; }
  const yo = ++intento;
  history.replaceState(null, '', location.pathname + location.search + '#' + code);   // (el secreto, fuera de la dirección)
  let ses = sesion(); if (ses.code !== code) { ses = { code, secreto: '', yo: '' }; }
  if (!ses.yo) ses.yo = 'm' + [...crypto.getRandomValues(new Uint8Array(6))].map(b => (b % 36).toString(36)).join('');
  guarda(ses); fuerte = !!ses.secreto;
  cerrado = false; respondido = false; relevo = false; clearTimeout(otra);
  limpia(); vias(); $('#vias').classList.add('hide'); msg('Conectando…'); pantalla(true);
  const p = nuevaPc();   // (las rutas de red, ya: mientras se llega al saludo)
  let s;
  try { s = await senal(`hzh-${code}-${ses.yo}`, recibe, () => { if (sig === s) sig = null; }, vias, ses.secreto); }
  catch (e) {
    if (yo !== intento) return;
    // (sin ningún servidor: se vuelve a probar solo, unas cuantas veces)
    limpia(); msg('No llego a ningún servidor para presentarme al ordenador. Comprueba internet en el móvil: lo vuelvo a intentar…', true); pantalla(false);
    if (sinRed++ < 12) otra = setTimeout(() => { if (!conectado && !$('#conn').classList.contains('hide')) conectar(); }, 5000);
    return;
  }
  if (yo !== intento) { s.close(); return; }
  sig = s; sinRed = 0; msg(fuerte ? 'Buscando el ordenador…' : 'Acepta en el ordenador que este móvil sea el mando.');
  try { await p.oferta; } catch (e) { }
  await rutas(p, RUTAS - (performance.now() - p.t0));
  if (yo !== intento || !sig) return;
  // (con las rutas que haya dentro y repetida, con la misma marca, al medio segundo, al segundo y medio y luego cada 2 s
  // hasta que conteste: si el ordenador aún se está apuntando a un camino, la siguiente le llega; él la cuenta una vez)
  const oferta = { sdp: p.localDescription.toJSON(), k: 'of' + Math.random().toString(36).slice(2) };
  sig.send('hzh-' + code, 'OFFER', oferta); dicha = true;
  let n = 0; const otraOferta = () => { repite = setTimeout(() => { if (conectado || !sig || respondido || yo !== intento) return; sig.send('hzh-' + code, 'OFFER', oferta); otraOferta(); }, [500, 1000][n++] || 2000); }; otraOferta();
  clearTimeout(espera);
  espera = setTimeout(() => { if (!conectado && yo === intento) { limpia(); msg(NOHAY, true); pantalla(false); vista(false); } }, fuerte ? 30000 : 120000);   // (con el código a mano, tiempo para aceptar en el ordenador)
}
// (la conexión directa: su canal para el mando y sus rutas de red, que empiezan a buscarse en cuanto se crea la oferta)
function nuevaPc() {
  const p = pc = new RTCPeerConnection({ iceServers: ICE, ...(SIN_P2P ? { iceTransportPolicy: 'relay' } : {}) }); p.t0 = performance.now();
  const d = dc = p.createDataChannel('mando', { ordered: true });
  d.onopen = () => { if (dc === d) abierto(); };
  d.onclose = () => { if (dc === d && !relevo) caido(); };
  d.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } del(m); };
  p.onicecandidate = (e) => { if (e.candidate && dicha && pc === p) sig?.send('hzh-' + code, 'CANDIDATE', { candidate: e.candidate.toJSON() }); };   // (las que salen después de la oferta)
  // (si no consiguen hablar directamente: enseguida si la conexión falla; si ya iba por el saludo, sigue por él)
  p.onconnectionstatechange = () => { if (pc !== p || !['failed', 'disconnected'].includes(p.connectionState) || relevo) return; if (conectado) caido(); else if (respondido) porElSaludo(); };
  p.oferta = p.createOffer().then(o => p.setLocalDescription(o));
  return p;
}
async function recibe(m) {
  if (m.src !== 'hzh-' + code || (fuerte && !m.fuerte)) return;   // (solo el ordenador; si se llegó por el QR, solo con su secreto)
  if (m.type === 'DATA' && m.payload) { oido = performance.now(); if (relevo) del(m.payload); return; }
  const p = pc; if (!p) return;
  if (m.type === 'ANSWER' && m.payload?.sdp && !respondido) {
    respondido = true; clearTimeout(repite); msg('El ordenador ha contestado: conectando…');
    try { await p.setRemoteDescription(m.payload.sdp); } catch (e) { }
    for (const c of sueltas.splice(0)) { try { await p.addIceCandidate(c); } catch (e) { } }
    clearTimeout(pasoT); pasoT = setTimeout(() => { if (!conectado && pc === p) porElSaludo(); }, DIRECTO);
  } else if (m.type === 'CANDIDATE' && m.payload?.candidate) {
    if (!respondido) { if (sueltas.length < 40) sueltas.push(m.payload.candidate); }   // (antes de la respuesta: luego)
    else { try { await p.addIceCandidate(m.payload.candidate); } catch (e) { } }
  }
}
// (espera a tener las rutas de red: todas, o alguna de fuera de casa, o como mucho ms; las que salgan después van sueltas)
const rutas = (p, ms) => new Promise((ok) => {
  const ya = () => p.iceGatheringState === 'complete' || / typ (srflx|relay) /.test(p.localDescription?.sdp || '');
  if (ya() || ms <= 0) return ok();
  const fin = () => { clearTimeout(t); p.removeEventListener('icecandidate', mira); p.removeEventListener('icegatheringstatechange', mira); ok(); };
  const mira = () => { if (ya()) fin(); }, t = setTimeout(fin, ms);
  p.addEventListener('icecandidate', mira); p.addEventListener('icegatheringstatechange', mira);
});
// el plan B: los mensajes del mando por el saludo (el primero, para que el ordenador lo sepa y conteste con sus botones)
function porElSaludo() { if (conectado || !sig) return; relevo = true; oido = performance.now(); abierto(); envia({ t: 'ping' }); }
function limpia() { clearTimeout(repite); clearTimeout(pasoT); relevo = false; dicha = false; sueltas = []; try { dc?.close(); } catch (e) { } try { pc?.close(); } catch (e) { } try { sig?.close(); } catch (e) { } dc = pc = sig = null; }
function abierto() {
  const ya = conectado;
  conectado = true; intentos = 0; clearTimeout(espera); clearTimeout(pasoT); clearTimeout(tardaT);
  if (dc?.readyState === 'open') { relevo = false; sig?.close(); sig = null; }   // (ya hablan directamente: el saludo sobra)
  if (ya) { estado(); return; }
  msg(''); $('#go').disabled = false; vista(true); estado(); despierta();
}
function caido() {
  if (!conectado) return;
  conectado = false; soltarTodo(); limpia(); estado();
  if (cerrado) return;
  // (se reintenta unas cuantas veces: si el ordenador cerró el juego, se vuelve a la pantalla del código)
  if (intentos++ < 6) setTimeout(() => { if (!conectado && !cerrado) { $('#code').value = code; conectar(); } }, 1000);
  else { vista(false); msg(NOHAY, true); pantalla(false); }
}
const envia = (m) => { if (dc?.readyState === 'open') dc.send(JSON.stringify(m)); else if (relevo) sig?.send('hzh-' + code, 'DATA', m); };
// (por el saludo no hay aviso de corte: si el ordenador no contesta en 8 s —se le pregunta cada 2—, se ha ido)
setInterval(() => { if (relevo && conectado && performance.now() - oido > 8000) caido(); }, 2000);
// lo que dice el ordenador
let C = { m: 'juego', tit: '', pal: 'andar', mira: true, tac: false, b: {}, fijo: [], esp: [] }, lat = 0, pingT = 0, ctxK = '', demo = false;
function del(m) {
  if (m.t === 'hola') { LANG = m.lang === 'eu' ? 'eu' : 'es'; traduce(); pinta(); }
  else if (m.t === 'ctx') { const k = JSON.stringify(m); if (k !== ctxK) { ctxK = k; soltarTodo(); C = m; pinta(); } }
  else if (m.t === 'pong') { lat = Math.round(performance.now() - pingT); estado(); }
  else if (m.t === 'adios') { cerrado = true; conectado = false; soltarTodo(); limpia(); vista(false); msg('El juego ha cerrado el mando.', true); pantalla(false); }
}
setInterval(() => { if (conectado) { pingT = performance.now(); envia({ t: 'ping' }); } }, 2000);
// (arriba a la izquierda: verde y en qué se está, con lo que tarda en llegar; amarillo mientras se vuelve a conectar)
function estado() {
  const ok = conectado || demo;
  $('#est').classList.toggle('ok', ok);
  $('#estT').innerHTML = ok ? '<b></b>' + (lat ? ` <small>${lat} ms</small>` : '') : '';
  if (ok) $('#estT b').textContent = T(C.tit || 'Conectado'); else $('#estT').textContent = T('Reconectando…');
}
function vista(mando) { $('#conn').classList.toggle('hide', mando); $('#pad').classList.toggle('hide', !mando); if (mando) requestAnimationFrame(coloca); }
// (la pantalla no se apaga mientras se juega)
async function despierta() { try { await navigator.wakeLock?.request('screen'); } catch (e) { } }
// (al volver a la página, por ejemplo desde otra app, la pantalla sigue encendida; y si iOS cortó la conexión mientras
// tanto y no hay ningún intento en marcha, se vuelve a conectar con el mismo código)
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (conectado) despierta(); else if (!cerrado && LETRAS.test(code) && !$('#go').disabled) conectar(); });

// ---------- los botones de cada momento ----------
const vibra = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (e) { } };
const pulsados = new Map();   // botón → mensaje para soltarlo
function soltarTodo() { for (const [, m] of pulsados) envia(m); pulsados.clear(); document.querySelectorAll('.down, .on').forEach(b => { b.classList.remove('down', 'on'); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false'); }); }
// un botón: al apoyar el dedo se pulsa y al levantarlo se suelta (los que se quedan puestos, como Correr en el pueblo, se
// quitan al tocarlos otra vez)
function enlaza(b, down, up, queda) {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); vibra();
    if (queda) { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); envia(on ? down : up); if (on) pulsados.set(b, up); else pulsados.delete(b); return; }
    try { b.setPointerCapture(e.pointerId); } catch (er) { }
    b.classList.add('down'); envia(down); pulsados.set(b, up);
  });
  const fin = () => { if (!b.classList.contains('down')) return; b.classList.remove('down'); pulsados.delete(b); envia(up); };
  b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); b.addEventListener('lostpointercapture', fin);
}
const bt = (i, d) => ({ t: 'bt', i, d });
// (el icono del botón, de los del juego: iconos/<nombre>.webp)
const ico = (i) => { const n = C.ic?.[i]; return n && /^[a-z]+$/.test(n) ? `<img src="iconos/${n}.webp" alt="" draggable="false">` : ''; };
const boton = (cls, i, html) => { const x = document.createElement('button'); x.className = cls; x.dataset.b = i; x.innerHTML = html; (x.querySelector('.nom') || x.querySelector('span')).textContent = T(C.b[i]); return x; };
const CIERRA = /cerrar|salir|volver|atrás|ahora no|itxi|irten|itzuli|^(✕|×|x)$/i;
function pinta() {
  const b = C.b || {}, esp = C.esp || [], fijos = (C.fijo || []).filter(i => b[i]), der = C.der || [];
  // arriba, los botones de sistema (cuaderno, mapa, perro, menú, salir…); a la izquierda, los que se quedan puestos, encima
  // de la palanca; a la derecha, los de acción: el principal y los demás en abanico
  const izq = C.pal ? fijos : [], sis = [4, 5, 8, 9].filter(i => b[i] && !der.includes(i) && !izq.includes(i));
  const acc = esp.length ? [] : [0, 1, 2, 3, ...der, 7].filter((i, n, L) => b[i] && L.indexOf(i) === n && !izq.includes(i) && !sis.includes(i));
  const sup = $('#sup'); sup.innerHTML = ''; $('#top').classList.toggle('fila', sis.length > 2);
  for (const i of sis) { const x = boton('sis', i, ico(i) + '<span></span>'); sup.appendChild(x); enlaza(x, bt(i, 1), bt(i, 0)); }
  const tog = $('#tog'); tog.innerHTML = '';
  for (const i of izq) { const x = boton('tg', i, ico(i) + '<span></span>'); x.setAttribute('aria-pressed', 'false'); tog.appendChild(x); enlaza(x, bt(i, 1), bt(i, 0), true); }
  // izquierda: la palanca, o el panel táctil
  $('#base').classList.toggle('hide', !C.pal);
  $('#hIzq').textContent = C.pal ? T(C.pal === 'andar' ? 'Desliza para andar' : 'Desliza para moverte') : '';
  $('#tp').classList.toggle('hide', !C.tac || !!C.pal);
  $('#tpL').innerHTML = [['Desliza', 'para mover la flecha'], ['Toca', 'para pulsar'], ['Dos dedos', 'para subir y bajar']].map(([a, z]) => `<li><b>${T(a)}</b> ${T(z)}</li>`).join('');
  // derecha: los botones de acción, la copia de los del minijuego o «¡A jugar!»
  const bts = $('#bts'); bts.innerHTML = '';
  acc.forEach((i, n) => {
    const x = n ? boton('bt', i, `<span class="cir">${ico(i)}</span><span class="nom"></span>`) : boton('bt prim', i, `<span class="cir">${ico(i)}<span class="nom"></span></span>`);
    bts.appendChild(x); enlaza(x, bt(i, 1), bt(i, 0), fijos.includes(i));
  });
  const E = $('#esp'); E.innerHTML = ''; E.classList.toggle('hide', !esp.length); E.classList.toggle('dos', esp.length > 4);
  esp.forEach((t, n) => { const x = document.createElement('button'); x.textContent = t; if (!n) x.className = 'prim'; else if (CIERRA.test(t)) x.className = 'cierra'; E.appendChild(x); enlaza(x, { t: 'esp', n, d: 1 }, { t: 'esp', n, d: 0 }); });
  $('#jugar').classList.toggle('hide', !C.jugar || !!esp.length);
  $('#hDer').textContent = C.mira && !esp.length ? T('Desliza para mirar') : '';
  estado(); coloca();
}
// dónde va cada cosa, a la medida de cada mitad: la palanca abajo a la izquierda, con su aviso y lo que se queda puesto
// encima; el botón principal abajo a la derecha y los demás alrededor, como en los juegos del móvil: a su izquierda (un
// poco más arriba, para que su nombre no baje del borde), encima y, entre los dos, en diagonal; cada uno con sitio para
// su nombre debajo
const lim = (v, a, z) => Math.max(a, Math.min(z, v));
function coloca() {
  const zi = $('#izq'), zd = $('#der'), m = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--m')) || 16;
  if (!zd.clientWidth) return;
  const db = Math.round(lim(Math.min(zi.clientWidth * 0.62, zi.clientHeight * 0.42), 104, 144)), bx = m + db / 2, by = zi.clientHeight - m - db / 2;
  zi.style.setProperty('--db', db + 'px'); reposo = { x: bx, y: by }; if (!st) ponBase(bx, by);
  const h = $('#hIzq'); h.style.left = Math.max(m, bx - h.offsetWidth / 2) + 'px'; h.style.top = (by - db / 2 - 8 - h.offsetHeight) + 'px';
  const tg = $('#tog'); tg.style.left = m + 'px'; tg.style.top = (by - db / 2 - 8 - (h.offsetHeight ? h.offsetHeight + 16 : 0) - tg.offsetHeight) + 'px';
  const W = zd.clientWidth, H = zd.clientHeight, ks = [...$('#bts').children];
  const dA = Math.round(lim(Math.min(W * 0.26, H * 0.3), 72, 100)), dS = Math.round(lim(dA * 0.68, 52, 68));
  const NOM = 30;   // (el nombre debajo del botón: su alto y su separación)
  const cx = W - m - dA / 2, cy = H - m - dA / 2, dx = dA / 2 + dS / 2 + 20, dy = dA / 2 + dS / 2 + NOM + 8, oy = Math.max(0, dS / 2 + NOM - dA / 2);
  const huecos = [[0, 0], [-dx, -oy], [0, -dy], [-dx, -dy - oy]];
  ks.forEach((x, n) => {
    const [hx, hy] = huecos[Math.min(n, 3)];
    x.style.left = (cx + hx) + 'px'; x.style.top = (cy + hy) + 'px'; x.style.setProperty('--d', (n ? dS : dA) + 'px');
  });
  encaja();
}
// cada nombre, entero: si no cabe, la letra baja hasta 10 px. Arriba, si la barra no cabe, el icono va encima del nombre
// y, si aun así no cabe, se queda solo el icono (con su nombre para el lector de pantalla).
// (en el botón principal, las cuatro esquinas del nombre dentro del círculo)
function enCirculo(c, s) {
  const r = c.getBoundingClientRect(), R = r.width / 2 - 3, cx = r.left + r.width / 2, cy = r.top + r.height / 2, t = s.getBoundingClientRect();
  return [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]].every(([px, py]) => Math.hypot(px - cx, py - cy) <= R);
}
function encaja() {
  const top = $('#top'), sis = [...top.querySelectorAll('#sup .sis')];
  top.classList.remove('pila', 'ico'); for (const x of sis) x.removeAttribute('aria-label');
  const sobra = () => top.scrollWidth > top.clientWidth + 1 || $('#sup').scrollWidth > $('#sup').clientWidth + 1;
  if (sobra() && matchMedia('(orientation: landscape)').matches) top.classList.add('pila');
  if (sobra()) { top.classList.add('ico'); for (const x of sis) x.setAttribute('aria-label', x.querySelector('span').textContent); }
  for (const s of document.querySelectorAll('.bt .nom, .tg span, #sup .sis span, #esp button')) {
    s.style.fontSize = ''; if (!s.textContent) continue;
    const prim = s.closest('.prim .cir'), cabe = () => prim ? enCirculo(prim, s) : s.scrollWidth <= s.clientWidth + 1 && s.scrollHeight <= s.clientHeight + 1;
    for (let f = parseFloat(getComputedStyle(s).fontSize); !cabe() && f > 10; f--) s.style.fontSize = (f - 1) + 'px';
  }
}
addEventListener('resize', () => requestAnimationFrame(coloca));
$('#bJugar').addEventListener('click', () => { vibra(); envia({ t: 'jugar' }); });
// (pantalla completa: donde se puede; en el iPhone no hay, y el botón no sale)
const fullOk = !!document.documentElement.requestFullscreen;
$('#bFull').classList.toggle('hide', !fullOk);
$('#bFull').onclick = () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen?.() : d.requestFullscreen?.({ navigationUI: 'hide' }))?.catch?.(() => {}); try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { } };

// ---------- izquierda: la palanca o el panel táctil ----------
const izq = $('#izq'), base = $('#base'), nub = $('#nub');
let st = null, reposo = { x: 0, y: 0 }, ej = { x: 0, y: 0 }, ejSucio = false, cur = { dx: 0, dy: 0 }, toques = new Map(), rue = 0;
const ponBase = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; };
// (la palanca: si el pulgar cae sobre ella, se mueve desde su centro; si cae en otro sitio de la mitad, va allí)
const empuja = (e) => {
  const R = base.offsetWidth * 0.36; let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  ej = { x: +(dx / R).toFixed(3), y: +(-dy / R).toFixed(3) }; ejSucio = true;
};
izq.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault(); try { izq.setPointerCapture(e.pointerId); } catch (er) { }
  if (C.pal) {
    if (st) return;
    const r = izq.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, enElla = Math.hypot(x - reposo.x, y - reposo.y) <= base.offsetWidth / 2;
    st = enElla ? { id: e.pointerId, ox: r.left + reposo.x, oy: r.top + reposo.y } : { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    if (!enElla) ponBase(x, y);
    base.classList.add('activa'); empuja(e);
  } else if (C.tac) toques.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), mov: 0 });
});
izq.addEventListener('pointermove', (e) => {
  if (st && e.pointerId === st.id) empuja(e);
  else if (toques.has(e.pointerId)) {
    const p = toques.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.mov += Math.abs(dx) + Math.abs(dy);
    if (toques.size >= 2) rue += dy / toques.size; else { cur.dx += dx; cur.dy += dy; }   // (dos dedos: desplazar la lista)
  }
});
const sueltaIzq = (e) => {
  if (st && e.pointerId === st.id) { st = null; base.classList.remove('activa'); ponBase(reposo.x, reposo.y); nub.style.transform = ''; ej = { x: 0, y: 0 }; envia({ t: 'ej', x: 0, y: 0 }); ejSucio = false; }
  const p = toques.get(e.pointerId);
  if (p) { toques.delete(e.pointerId); if (e.type === 'pointerup' && p.mov < 12 && performance.now() - p.t < 350 && !toques.size) { vibra(8); envia({ t: 'clic' }); } }
};
izq.addEventListener('pointerup', sueltaIzq); izq.addEventListener('pointercancel', sueltaIzq);

// ---------- derecha: arrastrar fuera de los botones gira la cámara ----------
const der = $('#der'); let mi = null, acc = { dx: 0, dy: 0 };
der.addEventListener('pointerdown', (e) => { if (e.target.closest('button, #esp') || mi || !C.mira) return; e.preventDefault(); try { der.setPointerCapture(e.pointerId); } catch (er) { } mi = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
der.addEventListener('pointermove', (e) => { if (!mi || e.pointerId !== mi.id) return; acc.dx += e.clientX - mi.x; acc.dy += e.clientY - mi.y; mi.x = e.clientX; mi.y = e.clientY; });
const sueltaMi = (e) => { if (mi && e.pointerId === mi.id) mi = null; };
der.addEventListener('pointerup', sueltaMi); der.addEventListener('pointercancel', sueltaMi);
// (la palanca, la cámara y la flecha, unas 30 veces por segundo y solo si cambian)
setInterval(() => {
  if (!conectado) return;
  if (ejSucio) { envia({ t: 'ej', x: ej.x, y: ej.y }); ejSucio = false; }
  if (acc.dx || acc.dy) { envia({ t: 'mira', dx: acc.dx, dy: acc.dy }); acc = { dx: 0, dy: 0 }; }
  if (cur.dx || cur.dy) { envia({ t: 'cur', dx: cur.dx, dy: cur.dy }); cur = { dx: 0, dy: 0 }; }
  if (Math.abs(rue) >= 1) { envia({ t: 'rueda', dy: -Math.round(rue) * 3 }); rue = 0; }
}, 33);

// ---------- arranque ----------
document.addEventListener('contextmenu', (e) => e.preventDefault());
$('#go').onclick = () => conectar();
$('#otro').onclick = () => { intento++; limpia(); clearTimeout(espera); clearTimeout(otra); msg(''); pantalla(false); $('#code').value = ''; $('#code').focus(); };
$('#code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 5); if (e.target.value.length === 5) conectar(); });
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') conectar(); });
pinta();
// (del QR llegan el código y el secreto, «#CÓDIGO.secreto»; escrito a mano, solo el código)
const [hc = '', hs = ''] = location.hash.slice(1).split('.'), h = hc.toUpperCase();
if (LETRAS.test(h)) { if (SECRETO.test(hs)) guarda({ code: h, secreto: hs, yo: sesion().code === h ? sesion().yo : '' }); $('#code').value = h; conectar(); }
window.__mandoMovil = { get conectado() { return conectado; }, get relevo() { return relevo; }, get ctx() { return C; }, prueba(m) { demo = true; del(m); vista(true); } };   // (para las pruebas: prueba pinta un momento sin conexión)
