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
  'Mover': 'Mugitu', 'Desliza para mirar': 'Irristatu begiratzeko',
  'Desliza': 'Irristatu', 'para mover la flecha': 'gezia mugitzeko', 'Toca': 'Ukitu', 'para pulsar': 'sakatzeko', 'Dos dedos': 'Bi hatzekin', 'para subir y bajar': 'gora eta behera egiteko',
  'Elige en el ordenador con la flecha, o sigue tu aventura:': 'Aukeratu ordenagailuan geziarekin, edo jarraitu zure abenturarekin:', '¡A jugar!': 'Jolastera!',
  'Acción': 'Ekintza', 'Saltar': 'Jauzi', 'Prismáticos': 'Prismatikoak', 'Mochila': 'Motxila', 'Correr': 'Korrika', 'Mapa': 'Mapa', 'Cuaderno': 'Koadernoa', 'Menú': 'Menua', 'Perro': 'Txakurra',
  'Seguir': 'Jarraitu', 'Anotar': 'Idatzi', 'Salir': 'Irten', 'Atrás': 'Atzera', 'Golpe': 'Kolpea', 'Cortada': 'Moztua', 'Dejada': 'Utzia', 'Globo': 'Globoa', 'Pausa': 'Pausa',
  'Pase': 'Pasea', 'Tiro': 'Jaurtiketa', 'Cambiar': 'Aldatu', 'Sprint': 'Korrika', 'Robar': 'Kendu', 'Entrada': 'Sarrera', 'Saque largo': 'Sake luzea', 'Cámara': 'Kamera', 'Coser': 'Josi',
  'En el pueblo': 'Herrian', 'El encierro': 'Entzierroa', 'Hablando': 'Hizketan', 'Pregunta': 'Galdera', 'Pelota a mano': 'Esku pilota', 'Pasaka': 'Pasaka',
  'Fútbol': 'Futbola', 'El esquileo': 'Ardi-mozketa', 'La costura': 'Josketa', 'En el menú': 'Menuan',
  'Misiones': 'Misioak', 'Hecha': 'Eginda', 'En curso': 'Martxan', 'Nueva': 'Berria', 'La sigues': 'Jarraitzen', 'Toca una para seguirla': 'Ukitu bat jarraitzeko',
  'Instala la app «Mando»': 'Instalatu «Mando» aplikazioa', 'Instalar': 'Instalatu', 'Ahora no': 'Orain ez',
  'Ocupa toda la pantalla y, la próxima vez, se conecta sola al ordenador.': 'Pantaila osoa hartzen du eta, hurrengoan, berez konektatzen da ordenagailura.',
  'En Safari, toca Compartir y luego «Añadir a pantalla de inicio». Después, ábrela desde su icono: ocupa toda la pantalla y se conecta sola.': 'Safarin, ukitu Partekatu eta gero «Gehitu hasierako pantailan». Gero, ireki bere ikonotik: pantaila osoa hartzen du eta berez konektatzen da.',
  'Abre Herrizherri en el ordenador: el mando se conecta solo en cuanto esté.': 'Ireki Herrizherri ordenagailuan: agintea berez konektatuko da prest dagoenean.',
  '¡Todas hechas!': 'Denak eginda!', 'sello conseguido': 'zigilua lortuta', 'completa todas para ganar el sello': 'osatu denak zigilua irabazteko', 'Con': 'Nork:', 'Cerrar': 'Itxi',
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
// el ordenador de siempre (en localStorage: queda aunque se cierre la app): su código, el secreto que manda al conectar
// y el nombre de este móvil. Al abrir la app sin enlace, se conecta sola; «Olvidar este móvil» en el ordenador lo borra
const PAR = 'herrizherri-mando-pareja';
const pareja = () => { try { const p = JSON.parse(localStorage.getItem(PAR) || 'null'); return p && LETRAS.test(p.code) && SECRETO.test(p.secreto) ? p : null; } catch (e) { return null; } };
const emparejar = (p) => { try { if (p) localStorage.setItem(PAR, JSON.stringify(p)); else localStorage.removeItem(PAR); } catch (e) { } };
let auto = false;   // (conectando con el ordenador de siempre: si aún no tiene el juego abierto, se espera sin dar error)
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
  try { s = await senal(`hzh-${code}-${ses.yo}`, recibe, vias, ses.secreto); }
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
  // (con las rutas que haya dentro y repetida al medio segundo, al segundo y medio y luego cada 2 s hasta que conteste: si el
  // ordenador aún se está apuntando a un camino, la siguiente le llega. Lleva su nombre, of: el ordenador la atiende una
  // vez y, si le vuelve a llegar, repite su respuesta, por si la primera se perdió)
  const oferta = { sdp: p.localDescription.toJSON(), of: 'of' + Math.random().toString(36).slice(2) };
  sig.send('hzh-' + code, 'OFFER', oferta); dicha = true;
  let n = 0; const otraOferta = () => { repite = setTimeout(() => { if (conectado || !sig || respondido || yo !== intento) return; sig.send('hzh-' + code, 'OFFER', oferta); otraOferta(); }, [500, 1000][n++] || 2000); }; otraOferta();
  clearTimeout(espera);
  espera = setTimeout(() => {
    if (conectado || yo !== intento) return;
    // (el ordenador de siempre aún no tiene el juego abierto: se sigue esperando, sin error)
    if (auto) { limpia(); msg('Abre Herrizherri en el ordenador: el mando se conecta solo en cuanto esté.'); otra = setTimeout(() => { if (auto && !conectado && document.visibilityState === 'visible') conectar(); }, 3000); return; }
    limpia(); msg(NOHAY, true); pantalla(false); vista(false);
  }, fuerte ? 30000 : 120000);   // (con el código a mano, tiempo para aceptar en el ordenador)
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
  envia({ t: 'repite' });   // (desde ahora el ordenador suelta lo que no se repita: ver «lo que se mantiene, se repite»)
  msg(''); $('#go').disabled = false; vista(true); estado(); despierta(); ofrece();
}
function caido() {
  if (!conectado) return;
  conectado = false; soltarTodo(); limpia(); estado();
  if (cerrado) return;
  // (se reintenta unas cuantas veces: si el ordenador cerró el juego, se vuelve a la pantalla del código)
  if (intentos++ < 6 || auto) setTimeout(() => { if (!conectado && !cerrado) { $('#code').value = code; conectar(); } }, 1000);
  else { vista(false); msg(NOHAY, true); pantalla(false); }
}
// (la palanca y los botones van numerados: por el saludo pueden llegar desordenados y el ordenador se queda con el más nuevo)
let sec = 0;
const envia = (m) => {
  if (m.t === 'ej' || m.t === 'bt' || m.t === 'esp') m = { ...m, s: ++sec };
  if (dc?.readyState === 'open') dc.send(JSON.stringify(m)); else if (relevo) sig?.send('hzh-' + code, 'DATA', m);
};
// (por el saludo no hay aviso de corte: si el ordenador no contesta en 8 s —se le pregunta cada 2—, se ha ido)
setInterval(() => { if (relevo && conectado && performance.now() - oido > 8000) caido(); }, 2000);
// lo que dice el ordenador
let C = { m: 'juego', tit: '', pal: 'andar', mira: true, tac: false, b: {}, fijo: [], esp: [] }, lat = 0, pingT = 0, ctxK = '', demo = false, MIS = null;
function del(m) {
  if (m.t === 'hola') { LANG = m.lang === 'eu' ? 'eu' : 'es'; traduce(); pinta(); pintaMis(); }
  else if (m.t === 'ctx') { const k = JSON.stringify(m); if (k === ctxK) return; const igual = forma(m) === forma(C) && ctxK; ctxK = k; C = m; if (igual) retoca(); else { soltarTodo(); pinta(); } }
  else if (m.t === 'pong') { lat = Math.round(performance.now() - pingT); estado(); }
  else if (m.t === 'mis') { MIS = m.lista?.length ? m : null; pintaMis(); estado(); }
  else if (m.t === 'pareja') { if (m.code === code && SECRETO.test(m.secreto || '')) { const s = sesion(); guarda({ ...s, code, secreto: m.secreto }); emparejar({ code, secreto: m.secreto, yo: s.yo }); } }
  else if (m.t === 'adios') { emparejar(null); auto = false; cerrado = true; conectado = false; soltarTodo(); limpia(); vista(false); msg('El juego ha cerrado el mando.', true); pantalla(false); }
}
setInterval(() => { if (conectado) { pingT = performance.now(); envia({ t: 'ping' }); } }, 2000);
// (arriba a la izquierda: verde y en qué se está, con lo que tarda en llegar; amarillo mientras se vuelve a conectar)
function estado() {
  const ok = conectado || demo;
  $('#est').classList.toggle('ok', ok);
  $('#estT').innerHTML = ok ? '<b></b>' + (lat ? ` <small>${lat} ms</small>` : '') : '';
  if (ok) $('#estT b').textContent = T(C.tit || 'Conectado'); else $('#estT').textContent = T('Reconectando…');
  // (en el pueblo, en vez de «En el pueblo», la misión que sigues)
  const q = ok && MIS && C.m === 'juego'; $('#qst').classList.toggle('hide', !q); $('#estT').classList.toggle('hide', !!q);
}
// las misiones: la que sigues arriba, y todas en su panel
function pintaMis() {
  if (!MIS) { $('#mis').classList.add('hide'); return; }
  const L = MIS.lista, f = L.find(x => x.sigue), hechas = L.filter(x => x.st === 'hecha').length;
  $('#qst small').textContent = f ? f.t : MIS.pueblo; $('#qst b').textContent = f ? f.pasos[Math.min(f.k, f.pasos.length - 1)] || '' : T('¡Todas hechas!');
  $('#qst').setAttribute('aria-label', T('Misiones') + ': ' + $('#qst small').textContent + '. ' + $('#qst b').textContent);
  $('#misH').textContent = T('Misiones') + ' · ' + MIS.pueblo;
  $('#misP').textContent = `${hechas}/${L.length} · ${T(MIS.sello ? 'sello conseguido' : 'completa todas para ganar el sello')}`;
  $('.mis-bar i').style.width = (hechas / L.length * 100) + '%';
  const ol = $('#misL'); ol.innerHTML = '';
  for (const M of L) {
    const li = document.createElement('li'), b = document.createElement('button'); li.className = M.st + (M.sigue ? ' sigue' : '');
    const est = M.sigue ? 'La sigues' : { hecha: 'Hecha', curso: 'En curso', nueva: 'Nueva' }[M.st];
    b.innerHTML = '<b></b><em></em>'; b.querySelector('b').textContent = M.t; b.querySelector('em').textContent = T(est);
    if (M.sigue) { const o = document.createElement('ol'); M.pasos.forEach((t, k) => { const x = document.createElement('li'); x.textContent = t; if (k < M.k) x.className = 'ok'; else if (k === M.k) x.className = 'now'; o.appendChild(x); }); b.appendChild(o); }
    else if (M.pasos[0]) { const p = document.createElement('p'); p.textContent = M.pasos[0]; b.appendChild(p); }
    if (M.con) { const s = document.createElement('small'); s.textContent = T('Con') + ' ' + M.con; b.appendChild(s); }
    if (M.st !== 'hecha' && !M.sigue) b.onclick = () => { vibra(); envia({ t: 'seguir', i: M.i }); L.forEach(x => { x.sigue = x === M; }); pintaMis(); };
    else b.disabled = M.st === 'hecha';
    li.appendChild(b); ol.appendChild(li);
  }
}
$('#qst').onclick = () => { soltarTodo(); vibra(); $('#mis').classList.remove('hide'); $('#misL').scrollTop = 0; };
$('#misX').onclick = () => $('#mis').classList.add('hide');
$('#misX').setAttribute('aria-label', T('Cerrar'));
function vista(mando) { $('#conn').classList.toggle('hide', mando); $('#pad').classList.toggle('hide', !mando); if (mando) requestAnimationFrame(coloca); }
// (la pantalla no se apaga mientras se juega)
async function despierta() { try { await navigator.wakeLock?.request('screen'); } catch (e) { } }
// (al volver a la página, por ejemplo desde otra app, la pantalla sigue encendida; y si iOS cortó la conexión mientras
// tanto y no hay ningún intento en marcha, se vuelve a conectar con el mismo código)
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (conectado) despierta(); else if (!cerrado && LETRAS.test(code) && !$('#go').disabled) conectar(); });

// ---------- los botones de cada momento ----------
// Los mismos que se ven en la pantalla del juego al jugar en el móvil, para no confundir: en el fútbol y en la pelota, sus
// botones (forma, color, icono y sitio: src/futbol/hud.js y src/pelota/hud.js); en lo demás, los círculos morados del
// pueblo, con el principal en rosa. Cada uno con su nombre dentro; si el nombre no cabe, solo el icono.
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
const ico = (i, cls = '') => { const n = C.ic?.[i]; return n && /^[a-z]+$/.test(n) ? `<img${cls ? ` class="${cls}"` : ''} src="iconos/${n}.webp" alt="" draggable="false">` : ''; };
// (los iconos de trazo del fútbol, los de su pantalla)
const IC = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const FBI = {
  shoot: IC('<circle cx="15" cy="12" r="5"/><path d="M3.5 9.5h5M2.5 12h6M3.5 14.5h5"/>'), pass: IC('<path d="M5.5 18.5L18.5 5.5"/><path d="M10 5.5h8.5V14"/>'),
  sprint: IC('<path d="M6 6.5l5.5 5.5L6 17.5M12.5 6.5l5.5 5.5-5.5 5.5"/>'), swap: IC('<path d="M4.5 9h14l-3.5-3.5M19.5 15h-14l3.5 3.5"/>'),
  tackle: IC('<circle cx="16.5" cy="12" r="3.5"/><path d="M11 12H3.5M6.5 9l-3 3 3 3"/>'), slide: IC('<path d="M2.5 17.5h11M10.5 14.5l3 3-3 3"/><circle cx="19" cy="17.5" r="2.3"/>'),
  dive: IC('<path d="M4 18c3.5-6.5 8.5-9.5 14-9.5"/><circle cx="19" cy="8.5" r="2"/>'), pause: IC('<path d="M8 5v14M16 5v14"/>'),
};
const FUT = { 0: 'fb-pass', 1: 'fb-shoot', 4: 'fb-swap', 7: 'fb-sprint' }, PEL = { 0: 'pel-hit', 1: 'pel-drop', 2: 'pel-drop pel-cut' };
// (arriba, redondos y con su icono; si no tuviera, su nombre)
function sis(i) {
  const x = document.createElement('button'), n = T(C.b[i]); x.className = 'sis'; x.dataset.b = i; x.setAttribute('aria-label', n);
  x.innerHTML = (C.estilo === 'futbol' && i === 9 ? FBI.pause : ico(i)) || '<span class="txt"></span>'; const t = x.querySelector('.txt'); if (t) t.textContent = n; return x;
}
// (los de acción, en su estilo; los de la pelota, sin icono, como en su pantalla: el icono sale solo si el nombre no cabe;
// los del pueblo, solo con su icono, que ya se entiende: Acción, Saltar, Correr, Mochila, Anotar, Seguir…)
function accion(i, prim) {
  const x = document.createElement('button'), n = T(C.b[i]), e = C.estilo;
  x.className = 'bt ' + (e === 'futbol' ? 'fb ' + (FUT[i] || '') : e === 'pelota' ? 'pel ' + (PEL[i] || '') : 'cb' + (prim ? ' prim' : ''));
  x.dataset.b = i; x.setAttribute('aria-label', n);
  x.innerHTML = (e === 'futbol' ? FBI[C.ic?.[i]] || '' : e === 'pelota' ? ico(i, 'alt') : ico(i)) + '<span class="nom"></span>';
  x.querySelector('.nom').textContent = n; if (e !== 'futbol' && e !== 'pelota' && ico(i)) x.classList.add('icono'); return x;
}
const CIERRA = /cerrar|salir|volver|atrás|ahora no|itxi|irten|itzuli|^(✕|×|x)$/i;
function pinta() {
  const b = C.b || {}, esp = C.esp || [], fijos = (C.fijo || []).filter(i => b[i]), der = C.der || [], e = C.estilo;
  // arriba, los de sistema (cuaderno, mapa, perro, menú, pausa, salir…) y, delante, los de acción que se usan poco (en el
  // pueblo, la mochila y los prismáticos); a la derecha, los de acción: en el fútbol y en la pelota, los de su pantalla; en
  // lo demás, el principal, los demás y, al final, los que se quedan puestos
  const top = [...(C.arriba || []), 4, 5, 8, 9].filter((i, n, L) => b[i] && !der.includes(i) && L.indexOf(i) === n);
  const acc = esp.length ? [] : e === 'futbol' ? [1, 0, 7, 4].filter(i => b[i]) : e === 'pelota' ? [0, 1, 2].filter(i => b[i])
    : [0, 1, 2, 3, ...der, 7].filter((i, n, L) => b[i] && L.indexOf(i) === n && !top.includes(i) && !fijos.includes(i)).concat(fijos.filter(i => !top.includes(i)));
  const sup = $('#sup'); sup.innerHTML = ''; $('#top').classList.toggle('fila', top.length > 3);
  for (const i of top) { const x = sis(i); sup.appendChild(x); enlaza(x, bt(i, 1), bt(i, 0)); }
  // izquierda: la palanca, o el panel táctil
  $('#base').classList.toggle('hide', !C.pal);
  $('#tp').classList.toggle('hide', !C.tac || !!C.pal);
  $('#tpL').innerHTML = [['Desliza', 'para mover la flecha'], ['Toca', 'para pulsar'], ['Dos dedos', 'para subir y bajar']].map(([a, z]) => `<li><b>${T(a)}</b> ${T(z)}</li>`).join('');
  // derecha: los botones de acción, la copia de los del minijuego o «¡A jugar!»
  const bts = $('#bts'); bts.innerHTML = ''; bts.className = e === 'futbol' ? C.modo || 'atk' : '';
  acc.forEach((i, n) => {
    const q = fijos.includes(i), x = accion(i, !n && !q);
    if (q) { x.classList.add('queda'); x.setAttribute('aria-pressed', 'false'); }
    bts.appendChild(x); enlaza(x, bt(i, 1), bt(i, 0), q);
  });
  const E = $('#esp'); E.innerHTML = ''; E.classList.toggle('hide', !esp.length); E.classList.toggle('dos', esp.length > 4);
  esp.forEach((t, n) => { const x = document.createElement('button'); x.textContent = t; if (!n) x.className = 'prim'; else if (CIERRA.test(t)) x.className = 'cierra'; E.appendChild(x); enlaza(x, { t: 'esp', n, d: 1 }, { t: 'esp', n, d: 0 }); });
  $('#jugar').classList.toggle('hide', !C.jugar || !!esp.length);
  $('#hDer').textContent = C.mira && !esp.length ? T('Desliza para mirar') : '';
  estado(); coloca();
}
// (en el mismo momento solo cambian los nombres, como PASE, que al defender es ROBAR: se cambian en su sitio, sin soltar lo
// que se tiene pulsado, como el Sprint)
const forma = (c) => JSON.stringify([c.m, c.estilo, Object.keys(c.b || {}), c.fijo, c.der, c.arriba, c.esp, c.pal, c.tac, c.mira, c.jugar]);
function retoca() {
  $('#bts').className = C.estilo === 'futbol' ? C.modo || 'atk' : '';
  for (const x of document.querySelectorAll('#bts .bt')) {
    const i = +x.dataset.b, n = T(C.b[i]); x.setAttribute('aria-label', n); x.querySelector('.nom').textContent = n;
    if (C.estilo === 'futbol' && FBI[C.ic?.[i]]) { x.querySelector('svg')?.remove(); x.insertAdjacentHTML('afterbegin', FBI[C.ic[i]]); }
  }
  estado(); encaja();
}
// dónde va cada cosa, a la medida de cada mitad: la palanca abajo a la izquierda; a la derecha, en el fútbol y en la
// pelota, sus botones como en su pantalla, a la escala de la mitad; en lo demás, el principal en la esquina y los demás a
// su izquierda, encima y en diagonal; si hay uno que se queda puesto (Correr), ese a la izquierda del principal y los demás
// encima, como en la pantalla del pueblo con el móvil en vertical: Acción en la esquina, Saltar encima y Correr a su
// izquierda. Con tres o menos, más grandes, que son los que más se usan
const lim = (v, a, z) => Math.max(a, Math.min(z, v));
const FUTP = { 1: [10, 8, 84], 0: [101, 1, 82], 7: [18, 108, 68], 4: [105, 92, 74] };   // (fútbol, a escala 1: hueco a la derecha, hueco abajo y tamaño)
function coloca() {
  const zi = $('#izq'), zd = $('#der'), m = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--m')) || 16;
  if (!zd.clientWidth) return;
  const db = Math.round(lim(Math.min(zi.clientWidth * 0.5, zi.clientHeight * 0.36), 96, 124));
  zi.style.setProperty('--db', db + 'px'); ponBase(m + db / 2, zi.clientHeight - m - db / 2);
  const W = zd.clientWidth, H = zd.clientHeight, ks = [...$('#bts').children], e = C.estilo, arriba = 32;   // (arriba: el aviso de mirar)
  const pon = (x, px, py, d) => { x.style.left = px + 'px'; x.style.top = py + 'px'; x.style.setProperty('--d', d + 'px'); };
  if (e === 'futbol') {
    const u = lim(Math.min((W - 2 * m) / 240, (H - 2 * m - arriba) / 178), 0.7, 1.4); zd.style.setProperty('--u', u);
    for (const x of ks) { const [r, bo, s] = FUTP[x.dataset.b] || FUTP[1]; pon(x, W - m - (r + s / 2) * u, H - m - (bo + s / 2) * u, s * u); }
  } else if (e === 'pelota') {
    const u = lim(Math.min((W - 2 * m) / 204, (H - 2 * m - arriba) / 168), 0.7, 1.15); zd.style.setProperty('--u', u);
    for (const x of ks) { const i = +x.dataset.b; if (!i) pon(x, W - m - 56 * u, H - m - 56 * u, 112 * u); else pon(x, W - m - 164 * u, H - m - (i === 1 ? 40 : 128) * u, 80 * u); }
  } else {
    const pocos = ks.length <= 3, dA = Math.round(pocos ? lim(Math.min(W * 0.3, H * 0.36), 80, 120) : lim(Math.min(W * 0.25, H * 0.31), 72, 104));
    const dS = Math.round(pocos ? lim(dA * 0.8, 64, 96) : lim(dA * 0.76, 56, 80)), cx = W - m - dA / 2, cy = H - m - dA / 2, D = dA / 2 + dS / 2 + 14;
    const huecos = ks.some(x => x.classList.contains('queda')) ? [[0, -D], [-D, -D], [-2 * D, 0]] : [[-D, 0], [0, -D], [-D, -D]];
    let n = 0;
    ks.forEach((x, k) => {
      if (!k && !x.classList.contains('queda')) { pon(x, cx, cy, dA); return; }
      if (x.classList.contains('queda')) { pon(x, cx - D, cy, dS); return; }
      const [hx, hy] = huecos[Math.min(n++, 2)]; pon(x, cx + hx, cy + hy, dS);
    });
  }
  encaja();
}
// cada nombre, entero dentro de su botón (las cuatro esquinas del rótulo dentro del círculo): si no cabe, la letra baja
// hasta 11 px y, si aun así no cabe, se queda solo el icono (con su nombre para el lector de pantalla). Los textos de los
// botones copiados del minijuego, enteros: si no caben, la letra baja hasta 10 px.
function enCirculo(c, s) {
  const r = c.getBoundingClientRect(), R = r.width / 2 - 6, cx = r.left + r.width / 2, cy = r.top + r.height / 2, rg = document.createRange(); rg.selectNodeContents(s); const t = rg.getBoundingClientRect();   // (lo que ocupa el texto de verdad, aunque se salga de su caja)
  return [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]].every(([px, py]) => Math.hypot(px - cx, py - cy) <= R);
}
function encaja() {
  for (const x of document.querySelectorAll('#bts .bt:not(.icono)')) {
    const s = x.querySelector('.nom'); x.classList.remove('solo'); s.style.fontSize = ''; if (!s.textContent) continue;
    for (let f = parseFloat(getComputedStyle(s).fontSize); !enCirculo(x, s) && f > 11; f--) s.style.fontSize = (f - 1) + 'px';
    if (!enCirculo(x, s) && x.querySelector('img, svg')) x.classList.add('solo');
  }
  for (const s of document.querySelectorAll('.txt, #esp button')) {
    s.style.fontSize = ''; if (!s.textContent) continue;
    const cabe = () => s.scrollWidth <= s.clientWidth + 1 && s.scrollHeight <= s.clientHeight + 1;
    for (let f = parseFloat(getComputedStyle(s).fontSize); !cabe() && f > 10; f--) s.style.fontSize = (f - 1) + 'px';
  }
}
addEventListener('resize', () => requestAnimationFrame(coloca));
document.fonts?.addEventListener?.('loadingdone', () => requestAnimationFrame(encaja));   // (con la letra del juego ya cargada, se mide otra vez)
$('#bJugar').addEventListener('click', () => { vibra(); envia({ t: 'jugar' }); });
// (pantalla completa: donde se puede; en el iPhone no hay, y el botón no sale)
const fullOk = !!document.documentElement.requestFullscreen;
$('#bFull').classList.toggle('hide', !fullOk);
$('#bFull').onclick = () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen?.() : d.requestFullscreen?.({ navigationUI: 'hide' }))?.catch?.(() => {}); try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { } };

// ---------- izquierda: la palanca o el panel táctil ----------
// (como en el juego: donde se apoye el pulgar, en toda la mitad, sale el aro y el botón blanco se mueve desde su centro;
// en reposo, abajo, el círculo de trazos de MOVER)
const izq = $('#izq'), base = $('#base'), knob = $('#knob'), bola = $('#knob i');
let st = null, ej = { x: 0, y: 0 }, ejSucio = false, cur = { dx: 0, dy: 0 }, toques = new Map(), rue = 0;
const ponBase = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; };
const empuja = (e) => {
  const R = knob.offsetWidth * 0.45; let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  bola.style.transform = `translate(${dx}px, ${dy}px)`;
  ej = { x: +(dx / R).toFixed(3), y: +(-dy / R).toFixed(3) }; ejSucio = true;
};
izq.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault(); try { izq.setPointerCapture(e.pointerId); } catch (er) { }
  if (C.pal) {
    // (otro dedo en la palanca manda él: si el anterior se quedó enganchado sin su «soltar», tocar otra vez lo arregla)
    if (st) { if (e.pointerId === st.id) return; paraPalanca(); }
    const r = izq.getBoundingClientRect(); st = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    knob.style.left = (e.clientX - r.left) + 'px'; knob.style.top = (e.clientY - r.top) + 'px'; knob.classList.remove('hide'); base.classList.add('activa'); empuja(e);
  } else if (C.tac) toques.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), mov: 0 });
});
izq.addEventListener('pointermove', (e) => {
  if (st && e.pointerId === st.id) empuja(e);
  else if (toques.has(e.pointerId)) {
    const p = toques.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.mov += Math.abs(dx) + Math.abs(dy);
    if (toques.size >= 2) rue += dy / toques.size; else { cur.dx += dx; cur.dy += dy; }   // (dos dedos: desplazar la lista)
  }
});
// (al soltar, el «quieto» se manda tres veces, por si alguno se pierde por el camino: si no, el jugador seguía andando
// hacia donde apuntaba el pulgar)
let quieto = [];
function paraPalanca() {
  if (!st) return;
  st = null; knob.classList.add('hide'); bola.style.transform = ''; base.classList.remove('activa'); ej = { x: 0, y: 0 }; ejSucio = false;
  envia({ t: 'ej', x: 0, y: 0 }); quieto.forEach(clearTimeout);
  quieto = [150, 450].map(ms => setTimeout(() => { if (!st) envia({ t: 'ej', x: 0, y: 0 }); }, ms));
}
const sueltaIzq = (e) => {
  if (st && e.pointerId === st.id) paraPalanca();
  const p = toques.get(e.pointerId);
  if (p) { toques.delete(e.pointerId); if (e.type === 'pointerup' && p.mov < 12 && performance.now() - p.t < 350 && !toques.size) { vibra(8); envia({ t: 'clic' }); } }
};
izq.addEventListener('pointerup', sueltaIzq); izq.addEventListener('pointercancel', sueltaIzq); izq.addEventListener('lostpointercapture', sueltaIzq);
// (en el iPhone, a veces el «soltar» no llega a la zona: un gesto del sistema desde el borde, un aviso encima o el dedo que
// sale de la pantalla. Se suelta también desde la ventana y cuando ningún dedo queda dentro de la mitad izquierda)
addEventListener('pointerup', sueltaIzq, true); addEventListener('pointercancel', sueltaIzq, true);
const sinDedos = (e) => {
  if (!st) return; const r = izq.getBoundingClientRect();
  for (const t of e.touches) if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) return;
  paraPalanca();
};
addEventListener('touchend', sinDedos, true); addEventListener('touchcancel', sinDedos, true);
// (si la página se va, por una llamada, otra app o el bloqueo, todo suelto)
const sueltaYa = () => { paraPalanca(); toques.clear(); soltarTodo(); };
addEventListener('blur', sueltaYa); addEventListener('pagehide', sueltaYa);
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') sueltaYa(); });

// ---------- derecha: arrastrar fuera de los botones gira la cámara ----------
const der = $('#der'); let mi = null, acc = { dx: 0, dy: 0 };
der.addEventListener('pointerdown', (e) => { if (e.target.closest('button, #esp') || mi || !C.mira) return; e.preventDefault(); try { der.setPointerCapture(e.pointerId); } catch (er) { } mi = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
der.addEventListener('pointermove', (e) => { if (!mi || e.pointerId !== mi.id) return; acc.dx += e.clientX - mi.x; acc.dy += e.clientY - mi.y; mi.x = e.clientX; mi.y = e.clientY; });
const sueltaMi = (e) => { if (mi && e.pointerId === mi.id) mi = null; };
der.addEventListener('pointerup', sueltaMi); der.addEventListener('pointercancel', sueltaMi);
// (la palanca, la cámara y la flecha, unas 30 veces por segundo y solo si cambian)
// lo que se mantiene, se repite: la palanca fuera del centro cada 0,3 s y los botones apretados cada 0,5 s. El ordenador
// suelta lo que no se repita en 1,5 s; así un «soltar» perdido por el camino ya no deja nada pulsado
let ejT = 0, btT = 0;
setInterval(() => {
  if (!conectado) return;
  const n = performance.now();
  if (ejSucio || (st && (ej.x || ej.y) && n - ejT > 300)) { envia({ t: 'ej', x: ej.x, y: ej.y }); ejSucio = false; ejT = n; }
  if (n - btT > 500) { btT = n; for (const [, m] of pulsados) envia({ ...m, d: 1 }); }
  if (acc.dx || acc.dy) { envia({ t: 'mira', dx: acc.dx, dy: acc.dy }); acc = { dx: 0, dy: 0 }; }
  if (cur.dx || cur.dy) { envia({ t: 'cur', dx: cur.dx, dy: cur.dy }); cur = { dx: 0, dy: 0 }; }
  if (Math.abs(rue) >= 1) { envia({ t: 'rueda', dy: -Math.round(rue) * 3 }); rue = 0; }
}, 33);

// ---------- arranque ----------
document.addEventListener('contextmenu', (e) => e.preventDefault());
$('#go').onclick = () => conectar();
$('#otro').onclick = () => { auto = false; intento++; limpia(); clearTimeout(espera); clearTimeout(otra); msg(''); pantalla(false); $('#code').value = ''; $('#code').focus(); };
$('#code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 5); if (e.target.value.length === 5) conectar(); });
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') conectar(); });
pinta();
// (del QR llegan el código y el secreto, «#CÓDIGO.secreto»; escrito a mano, solo el código)
const [hc = '', hs = ''] = location.hash.slice(1).split('.'), h = hc.toUpperCase();
if (LETRAS.test(h)) { if (SECRETO.test(hs)) guarda({ code: h, secreto: hs, yo: sesion().code === h ? sesion().yo : '' }); $('#code').value = h; conectar(); }
else { const p = pareja(); if (p) { guarda({ code: p.code, secreto: p.secreto, yo: p.yo }); $('#code').value = p.code; auto = true; conectar(); } }   // (la app, sin enlace: el ordenador de siempre)
// ---------- la app «Mando» ----------
// Instalada, ocupa toda la pantalla, en horizontal, y se conecta sola. En Android (Chrome), con su botón; en el iPhone,
// desde Safari: Compartir y «Añadir a pantalla de inicio». Se ofrece en la pantalla de conectar y, una vez, al conectar
const instalada = () => ['fullscreen', 'standalone'].some(d => matchMedia(`(display-mode: ${d})`).matches) || navigator.standalone === true;
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const VISTO = 'herrizherri-mando-instalar';
let aviso = null;   // (el de Android para instalar)
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); aviso = e; ofrece(); });
addEventListener('appinstalled', () => { aviso = null; ofrece(); });
function ofrece() {
  const ver = !instalada() && (!!aviso || IOS), txt = T(aviso ? 'Ocupa toda la pantalla y, la próxima vez, se conecta sola al ordenador.' : 'En Safari, toca Compartir y luego «Añadir a pantalla de inicio». Después, ábrela desde su icono: ocupa toda la pantalla y se conecta sola.');
  $('#inst').classList.toggle('hide', !ver); $('#instT').textContent = txt; $('#instB').classList.toggle('hide', !aviso);
  let visto = false; try { visto = !!localStorage.getItem(VISTO); } catch (e) { }
  $('#instP').classList.toggle('hide', !ver || visto || !conectado); $('#instPT').textContent = txt; $('#instPsi').classList.toggle('hide', !aviso);
}
async function instala() { if (!aviso) return; const a = aviso; aviso = null; a.prompt(); try { await a.userChoice; } catch (e) { } ofrece(); }
$('#instB').onclick = instala; $('#instPsi').onclick = () => { vibra(); instala(); };
$('#instPno').onclick = () => { try { localStorage.setItem(VISTO, '1'); } catch (e) { } $('#instP').classList.add('hide'); };
ofrece();
// (su service worker: para poder instalarla y que abra al momento; la página, siempre de la red si la hay)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
window.__mandoMovil = { get conectado() { return conectado; }, get relevo() { return relevo; }, get ctx() { return C; }, get mis() { return MIS; }, prueba(m) { demo = true; del(m); vista(true); } };   // (para las pruebas: prueba pinta un momento sin conexión)
