// La página del mando en el móvil (public/mando/index.html): conectar con el código del ordenador, los botones de cada
// momento y lo que se manda al tocarlos. Va en su propio archivo para que la página no admita código escrito dentro de
// ella (su política de seguridad, en index.html, solo deja cargar esto y el saludo, y solo hablar con los servidores del
// saludo).
// ---------- textos (castellano y euskera: el ordenador dice cuál) ----------
const EU = {
  'Mando en el móvil': 'Mugikorra aginte gisa', 'Conectar': 'Konektatu',
  'Escribe el código que sale en el ordenador, en «Mando del móvil».': 'Idatzi ordenagailuan, «Mugikorreko agintea» atalean, ateratzen den kodea.',
  'El móvil y el ordenador, mejor en la misma wifi.': 'Mugikorra eta ordenagailua, hobe wifi berean.', 'Mejor con el móvil en horizontal': 'Hobe mugikorra etzanda',
  'Conectando…': 'Konektatzen…', 'Conectado': 'Konektatuta', 'Reconectando…': 'Berriro konektatzen…',
  'No encuentro el juego con ese código. Mira el código en el ordenador y que su ventana del mando siga abierta.': 'Ez dut jokoa aurkitzen kode horrekin. Begiratu ordenagailuko kodea eta agintearen leihoa irekita dagoela.',
  'No llego a ningún servidor para presentarme al ordenador. Comprueba internet en el móvil: lo vuelvo a intentar…': 'Ez dut ordenagailuari aurkezteko zerbitzaririk lortzen. Begiratu mugikorraren internet: berriro saiatzen…',
  'Buscando el ordenador…': 'Ordenagailua bilatzen…', 'Acepta en el ordenador que este móvil sea el mando.': 'Onartu ordenagailuan mugikor hau agintea izatea.', 'El ordenador ha contestado: conectando…': 'Ordenagailuak erantzun du: konektatzen…',
  'El código tiene cinco letras o números.': 'Kodeak bost letra edo zenbaki ditu.', 'El juego ha cerrado el mando.': 'Jokoak agintea itxi du.',
  'Desliza para andar': 'Irristatu ibiltzeko', 'Desliza para moverte': 'Irristatu mugitzeko', 'Desliza para mirar': 'Irristatu begiratzeko',
  'Desliza para mover la flecha · toca para pulsar · dos dedos para bajar': 'Irristatu gezia mugitzeko · ukitu sakatzeko · bi hatz jaisteko',
  'Elige en el ordenador con la flecha, o sigue tu aventura:': 'Aukeratu ordenagailuan geziarekin, edo jarraitu zure abenturarekin:', '¡A jugar!': 'Jolastera!',
  'Acción': 'Ekintza', 'Saltar': 'Jauzi', 'Prismáticos': 'Prismatikoak', 'Mochila': 'Motxila', 'Correr': 'Korrika', 'Mapa': 'Mapa', 'Cuaderno': 'Koadernoa', 'Menú': 'Menua', 'Perro': 'Txakurra',
  'Seguir': 'Jarraitu', 'Anotar': 'Idatzi', 'Salir': 'Irten', 'Atrás': 'Atzera', 'Golpe': 'Kolpea', 'Cortada': 'Moztua', 'Dejada': 'Utzia', 'Globo': 'Globoa', 'Pausa': 'Etenaldia',
  'Pase': 'Pasea', 'Tiro': 'Jaurtiketa', 'Cambiar': 'Aldatu', 'Sprint': 'Esprinta', 'Periódico': 'Egunkaria', 'Cámara': 'Kamera', 'Coser': 'Josi',
  'En el pueblo': 'Herrian', 'El encierro': 'Entzierroa', 'Prismáticos ': 'Prismatikoak', 'Hablando': 'Hizketan', 'Pregunta': 'Galdera', 'Pelota a mano': 'Esku pilota', 'Pasaka': 'Pasaka',
  'Fútbol': 'Futbola', 'El esquileo': 'Ardi-mozketa', 'La costura': 'Josketa', 'En el menú': 'Menuan',
};
let LANG = (navigator.language || 'es').toLowerCase().startsWith('eu') ? 'eu' : 'es';
const T = (s) => (LANG === 'eu' && EU[s]) || s;
const traduce = () => { document.documentElement.lang = LANG; document.querySelectorAll('[data-t]').forEach(n => { n.textContent = T(n.dataset.t); }); };
traduce();

// ---------- el saludo: el mismo archivo que usa el ordenador (src/mando/senal.js, publicado al lado de esta página) ----------
// (con la hora detrás: nunca una copia guardada de una versión anterior; sin internet, conectar avisa)
let M = null; try { M = await import(`./senal.js?v=${Date.now()}`); } catch (e) { }
const { senal, ICE, SIN_P2P, CAMINOS, SECRETO } = M || { senal: () => Promise.reject(new Error('red')), ICE: [], SIN_P2P: false, CAMINOS: [], SECRETO: /^$/ };

// ---------- la conexión ----------
const $ = (s) => document.querySelector(s);
const LETRAS = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;
const NOHAY = 'No encuentro el juego con ese código. Mira el código en el ordenador y que su ventana del mando siga abierta.';
let fuerte = false, code = '', sig = null, pc = null, dc = null, conectado = false, intentos = 0, espera = 0, cerrado = false, repite = 0, respondido = false, relevo = false, pasoT = 0, oido = 0, otra = 0, sinRed = 0;
// lo de esta sesión, guardado en el móvil mientras la pestaña siga abierta: el código, el secreto del QR (si se llegó por
// él) y el nombre de este móvil, el mismo en cada reconexión (así, si el ordenador ya le dio permiso, no vuelve a preguntar)
const SES = 'herrizherri-mando';
const sesion = () => { try { return JSON.parse(sessionStorage.getItem(SES) || '{}'); } catch (e) { return {}; } };
const guarda = (o) => { try { sessionStorage.setItem(SES, JSON.stringify(o)); } catch (e) { } };
const msg = (t, mal) => { $('#msg').textContent = t ? T(t) : ''; $('#msg').classList.toggle('mal', !!mal); };
// (los servidores con que se presenta, en verde los que contestan: si no conecta, se ve dónde se queda)
const vias = (e = {}) => { $('#vias').innerHTML = CAMINOS.map(c => `<span class="${e[c.n] || ''}">${c.n}</span>`).join(''); };
async function conectar() {
  code = $('#code').value.trim().toUpperCase();
  if (!LETRAS.test(code)) { msg('El código tiene cinco letras o números.', true); return; }
  history.replaceState(null, '', location.pathname + location.search + '#' + code);   // (el secreto, fuera de la dirección)
  let ses = sesion(); if (ses.code !== code) { ses = { code, secreto: '', yo: '' }; }
  if (!ses.yo) ses.yo = 'm' + [...crypto.getRandomValues(new Uint8Array(6))].map(b => (b % 36).toString(36)).join('');
  guarda(ses); fuerte = !!ses.secreto;
  cerrado = false; respondido = false; relevo = false; msg('Conectando…'); $('#go').disabled = true; clearTimeout(otra);
  limpia(); vias();
  try { sig = await senal(`hzh-${code}-${ses.yo}`, recibe, () => { sig = null; }, vias, ses.secreto); }
  catch (e) {
    // (sin ningún servidor: se vuelve a probar solo, unas cuantas veces)
    msg('No llego a ningún servidor para presentarme al ordenador. Comprueba internet en el móvil: lo vuelvo a intentar…', true); $('#go').disabled = false;
    if (sinRed++ < 12) otra = setTimeout(() => { if (!conectado && !$('#conn').classList.contains('hide')) conectar(); }, 5000);
    return;
  }
  sinRed = 0; msg(fuerte ? 'Buscando el ordenador…' : 'Acepta en el ordenador que este móvil sea el mando.');
  pc = new RTCPeerConnection({ iceServers: ICE, ...(SIN_P2P ? { iceTransportPolicy: 'relay' } : {}) });
  dc = pc.createDataChannel('mando', { ordered: true });
  dc.onopen = abierto;
  dc.onclose = () => { if (!relevo) caido(); };
  dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } del(m); };
  pc.onicecandidate = (e) => { if (e.candidate) sig?.send('hzh-' + code, 'CANDIDATE', { candidate: e.candidate.toJSON() }); };
  // (si no consiguen hablar directamente, el mando va por el saludo: enseguida si la conexión falla, o a los 3 s de la respuesta)
  pc.onconnectionstatechange = () => { if (!['failed', 'disconnected'].includes(pc?.connectionState) || relevo) return; if (conectado) caido(); else if (respondido) porElSaludo(); };
  const of = await pc.createOffer(); await pc.setLocalDescription(of);
  await rutas(pc);
  // (con todas las rutas dentro, y repetida cada 2 s con la misma marca hasta que conteste: si el ordenador aún se está
  // apuntando a un camino, la siguiente le llega; él la cuenta una sola vez)
  const oferta = { sdp: pc.localDescription.toJSON(), k: 'of' + Math.random().toString(36).slice(2) };
  sig?.send('hzh-' + code, 'OFFER', oferta);
  clearInterval(repite); repite = setInterval(() => { if (conectado || !sig || respondido) clearInterval(repite); else sig.send('hzh-' + code, 'OFFER', oferta); }, 2000);
  clearTimeout(espera);
  espera = setTimeout(() => { if (!conectado) { limpia(); msg(NOHAY, true); $('#go').disabled = false; vista(false); } }, fuerte ? 30000 : 120000);   // (con el código a mano, tiempo para aceptar en el ordenador)
}
async function recibe(m) {
  if (m.src !== 'hzh-' + code || (fuerte && !m.fuerte)) return;   // (solo el ordenador; si se llegó por el QR, solo con su secreto)
  if (m.type === 'DATA' && m.payload) { oido = performance.now(); if (relevo) del(m.payload); return; }
  if (m.type === 'ANSWER' && pc && m.payload?.sdp && !respondido) {
    respondido = true; clearInterval(repite); msg('El ordenador ha contestado: conectando…'); try { await pc.setRemoteDescription(m.payload.sdp); } catch (e) { }
    clearTimeout(pasoT); pasoT = setTimeout(() => { if (!conectado) porElSaludo(); }, 3000);
  }
  else if (m.type === 'CANDIDATE' && pc && m.payload?.candidate) { try { await pc.addIceCandidate(m.payload.candidate); } catch (e) { } }
}
// (espera a tener las rutas de red, como mucho 2,5 s: así van todas dentro de la oferta y no se pierde ninguna)
const rutas = (pc) => new Promise((ok) => { if (pc.iceGatheringState === 'complete') return ok(); const t = setTimeout(ok, 2500); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } }); });
// el plan B: los mensajes del mando por el saludo (el primero, para que el ordenador lo sepa y conteste con sus botones)
function porElSaludo() { if (conectado || !sig) return; relevo = true; oido = performance.now(); abierto(); envia({ t: 'ping' }); }
function limpia() { clearInterval(repite); clearTimeout(pasoT); relevo = false; try { dc?.close(); } catch (e) { } try { pc?.close(); } catch (e) { } try { sig?.close(); } catch (e) { } dc = pc = sig = null; }
function abierto() {
  const ya = conectado;
  conectado = true; intentos = 0; clearTimeout(espera); clearTimeout(pasoT);
  if (dc?.readyState === 'open') { relevo = false; sig?.close(); sig = null; }   // (ya hablan directamente: el saludo sobra)
  if (ya) return;
  msg(''); $('#go').disabled = false; vista(true); estado(); despierta();
}
function caido() {
  if (!conectado) return;
  conectado = false; soltarTodo(); limpia(); estado();
  if (cerrado) return;
  // (se reintenta unas cuantas veces: si el ordenador cerró el juego, se vuelve a la pantalla del código)
  if (intentos++ < 6) setTimeout(() => { if (!conectado && !cerrado) { $('#code').value = code; conectar(); } }, 2000);
  else { vista(false); msg(NOHAY, true); }
}
const envia = (m) => { if (dc?.readyState === 'open') dc.send(JSON.stringify(m)); else if (relevo) sig?.send('hzh-' + code, 'DATA', m); };
// (por el saludo no hay aviso de corte: si el ordenador no contesta en 8 s —se le pregunta cada 2—, se ha ido)
setInterval(() => { if (relevo && conectado && performance.now() - oido > 8000) caido(); }, 2000);
// lo que dice el ordenador
let C = { m: 'juego', tit: '', pal: 'andar', mira: true, tac: false, b: {}, fijo: [], esp: [] }, lat = 0, pingT = 0, ctxK = '';
function del(m) {
  if (m.t === 'hola') { LANG = m.lang === 'eu' ? 'eu' : 'es'; traduce(); pinta(); }
  else if (m.t === 'ctx') { const k = JSON.stringify(m); if (k !== ctxK) { ctxK = k; soltarTodo(); C = m; pinta(); } }
  else if (m.t === 'pong') { lat = Math.round(performance.now() - pingT); estado(); }
  else if (m.t === 'adios') { cerrado = true; conectado = false; soltarTodo(); limpia(); vista(false); msg('El juego ha cerrado el mando.', true); }
}
setInterval(() => { if (conectado) { pingT = performance.now(); envia({ t: 'ping' }); } }, 2000);
function estado() {
  $('#est').classList.toggle('ok', conectado);
  $('#estT').innerHTML = conectado ? `<b></b>${lat ? ' · ' + lat + ' ms' : ''}` : '';
  if (conectado) $('#estT b').textContent = T(C.tit || 'Conectado'); else $('#estT').textContent = T('Reconectando…');
}
function vista(mando) { $('#conn').classList.toggle('hide', mando); $('#pad').classList.toggle('hide', !mando); }
// (la pantalla no se apaga mientras se juega)
async function despierta() { try { await navigator.wakeLock?.request('screen'); } catch (e) { } }
// (al volver a la página, por ejemplo desde otra app, la pantalla sigue encendida; y si iOS cortó la conexión mientras
// tanto y no hay ningún intento en marcha, se vuelve a conectar con el mismo código)
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (conectado) despierta(); else if (!cerrado && LETRAS.test(code) && !$('#go').disabled) conectar(); });

// ---------- los botones de cada momento ----------
const vibra = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (e) { } };
const pulsados = new Map();   // botón → mensaje para soltarlo
function soltarTodo() { for (const [, m] of pulsados) envia(m); pulsados.clear(); document.querySelectorAll('.down').forEach(b => b.classList.remove('down')); if (runOn) { runOn = false; $('#bR').classList.remove('on'); } }
let runOn = false;
// un botón: al apoyar el dedo se pulsa y al levantarlo se suelta (los «fijos», como Correr en el pueblo, se quedan
// puestos hasta tocarlos otra vez)
function enlaza(b, down, up, toggle) {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); vibra();
    if (toggle) { runOn = !runOn; b.classList.toggle('on', runOn); envia(runOn ? down : up); if (runOn) pulsados.set(b, up); else pulsados.delete(b); return; }
    try { b.setPointerCapture(e.pointerId); } catch (er) { }
    b.classList.add('down'); envia(down); pulsados.set(b, up);
  });
  const fin = () => { if (!b.classList.contains('down')) return; b.classList.remove('down'); pulsados.delete(b); envia(up); };
  b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); b.addEventListener('lostpointercapture', fin);
}
const bt = (i, d) => ({ t: 'bt', i, d });
// (el icono del botón, de los del juego: iconos/<nombre>.webp)
const ico = (i, s) => { const n = C.ic?.[i]; return n && /^[a-z]+$/.test(n) ? `<img src="iconos/${n}.webp" width="${s}" height="${s}" alt="" draggable="false">` : ''; };
function pinta() {
  const b = C.b || {}, esp = C.esp || [];
  // arriba: los botones de hombro, Select y Start
  const sup = $('#sup'); sup.innerHTML = '';
  for (const i of [4, 5, 8, 9]) if (b[i]) { const x = document.createElement('button'); x.className = 'sm'; x.innerHTML = ico(i, 26) + '<span></span>'; x.lastChild.textContent = T(b[i]); sup.appendChild(x); enlaza(x, bt(i, 1), bt(i, 0)); }
  // izquierda: la palanca, o el panel táctil
  $('#izq').classList.toggle('tac', !!C.tac && !C.pal);
  $('#hIzq').textContent = C.pal ? T(C.pal === 'andar' ? 'Desliza para andar' : 'Desliza para moverte') : C.tac ? T('Desliza para mover la flecha · toca para pulsar · dos dedos para bajar') : '';
  const r = $('#bR'); r.classList.toggle('hide', !b[7]);
  if (b[7]) { const nr = r.cloneNode(false); r.replaceWith(nr); nr.innerHTML = ico(7, 28) + '<span></span>'; nr.lastChild.textContent = T(b[7]); enlaza(nr, bt(7, 1), bt(7, 0), (C.fijo || []).includes(7)); }
  // derecha: los cuatro botones, la copia de los del minijuego o «¡A jugar!»
  const bts = $('#bts'); bts.innerHTML = '';
  if (!esp.length) for (const i of [3, 2, 1, 0]) if (b[i]) { const x = document.createElement('button'); x.className = 'bt'; x.dataset.b = i; x.innerHTML = `${ico(i, 40)}<span></span><small>${'ABXY'[i]}</small>`; x.querySelector('span').textContent = T(b[i]); bts.appendChild(x);   // (los nombres largos, como Prismáticos, sin partirse)
 enlaza(x, bt(i, 1), bt(i, 0)); }
  const E = $('#esp'); E.innerHTML = ''; E.classList.toggle('hide', !esp.length); E.classList.toggle('dos', esp.length > 4);
  esp.forEach((t, n) => { const x = document.createElement('button'); x.textContent = t; E.appendChild(x); enlaza(x, { t: 'esp', n, d: 1 }, { t: 'esp', n, d: 0 }); });
  $('#jugar').classList.toggle('hide', !C.jugar || !!esp.length);
  $('#hDer').textContent = C.mira && !esp.length ? T('Desliza para mirar') : '';
  estado(); encaja();
}
// cada nombre, entero dentro de su botón: si no cabe, la letra baja hasta 10 px; si aun así no cabe y el botón tiene
// icono, se queda solo el icono (con su nombre para el lector de pantalla). Arriba, si la barra no cabe, los botones con
// icono pierden el nombre, y si aun así no cabe, el estado va en su propia línea.
// (en los botones redondos, las cuatro esquinas del nombre dentro del círculo)
function enCirculo(x, s) {
  const c = x.getBoundingClientRect(), R = c.width / 2 - 3, cx = c.left + c.width / 2, cy = c.top + c.height / 2, rg = document.createRange(); rg.selectNodeContents(s); const t = rg.getBoundingClientRect();
  return [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]].every(([px, py]) => Math.hypot(px - cx, py - cy) <= R);
}
function encaja() {
  // (primero la barra de arriba: si pasa a dos líneas, los botones de abajo se quedan más pequeños)
  const top = $('#top'), sm = [...top.querySelectorAll('.sm')].filter(x => x.querySelector('img') && x.querySelector('span'));
  top.classList.remove('apretado'); for (const x of sm) { x.classList.remove('ico'); x.removeAttribute('aria-label'); }
  if (top.scrollWidth > top.clientWidth + 1) for (const x of sm) { x.setAttribute('aria-label', x.querySelector('span').textContent); x.classList.add('ico'); }
  if (top.scrollWidth > top.clientWidth + 1) top.classList.add('apretado');
  for (const x of document.querySelectorAll('.bt, #bR, #esp button')) {
    const s = x.querySelector('span') || x; if (!s.textContent) continue;
    x.classList.remove('ico'); x.style.fontSize = ''; x.removeAttribute('aria-label');
    const cabe = () => x.classList.contains('bt') ? enCirculo(x, s) : s.scrollWidth <= s.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1;
    for (let f = parseFloat(getComputedStyle(x).fontSize); !cabe() && f > 10; f--) x.style.fontSize = (f - 1) + 'px';
    if (!cabe() && x.querySelector('img')) { x.setAttribute('aria-label', s.textContent); x.classList.add('ico'); x.style.fontSize = ''; }
  }
}
addEventListener('resize', () => requestAnimationFrame(encaja));
$('#bJugar').addEventListener('click', () => { vibra(); envia({ t: 'jugar' }); });
$('#bFull').onclick = () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen?.() : d.requestFullscreen?.({ navigationUI: 'hide' }))?.catch?.(() => {}); try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { } };

// ---------- izquierda: la palanca o el panel táctil ----------
const izq = $('#izq'), base = $('#base'), nub = $('#nub');
let st = null, ej = { x: 0, y: 0 }, ejSucio = false, cur = { dx: 0, dy: 0 }, toques = new Map(), rue = 0;
izq.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault(); try { izq.setPointerCapture(e.pointerId); } catch (er) { }
  if (C.pal) {
    if (st) return;
    const r = izq.getBoundingClientRect();
    st = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px'; base.classList.remove('hide'); nub.style.transform = '';
  } else if (C.tac) toques.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), mov: 0 });
});
izq.addEventListener('pointermove', (e) => {
  if (st && e.pointerId === st.id) {
    const R = base.offsetWidth * 0.42;
    let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    nub.style.transform = `translate(${dx}px, ${dy}px)`;
    ej = { x: +(dx / R).toFixed(3), y: +(-dy / R).toFixed(3) }; ejSucio = true;
  } else if (toques.has(e.pointerId)) {
    const p = toques.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.mov += Math.abs(dx) + Math.abs(dy);
    if (toques.size >= 2) rue += dy / toques.size; else { cur.dx += dx; cur.dy += dy; }   // (dos dedos: desplazar la lista)
  }
});
const sueltaIzq = (e) => {
  if (st && e.pointerId === st.id) { st = null; base.classList.add('hide'); ej = { x: 0, y: 0 }; envia({ t: 'ej', x: 0, y: 0 }); ejSucio = false; }
  const p = toques.get(e.pointerId);
  if (p) { toques.delete(e.pointerId); if (e.type === 'pointerup' && p.mov < 12 && performance.now() - p.t < 350 && !toques.size) { vibra(8); envia({ t: 'clic' }); } }
};
izq.addEventListener('pointerup', sueltaIzq); izq.addEventListener('pointercancel', sueltaIzq);

// ---------- derecha: arrastrar gira la cámara ----------
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
$('#code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 5); if (e.target.value.length === 5) conectar(); });
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') conectar(); });
pinta();
// (del QR llegan el código y el secreto, «#CÓDIGO.secreto»; escrito a mano, solo el código)
const [hc = '', hs = ''] = location.hash.slice(1).split('.'), h = hc.toUpperCase();
if (LETRAS.test(h)) { if (SECRETO.test(hs)) guarda({ code: h, secreto: hs, yo: sesion().code === h ? sesion().yo : '' }); $('#code').value = h; conectar(); }
window.__mandoMovil = { get conectado() { return conectado; }, get relevo() { return relevo; }, get ctx() { return C; }, prueba(m) { del(m); vista(true); } };   // (para las pruebas: prueba pinta un momento sin conexión)
