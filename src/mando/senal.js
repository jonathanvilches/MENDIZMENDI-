// El saludo entre el ordenador y el móvil que hace de mando. Los dos se apuntan con un nombre en un servidor que solo sirve
// para presentarse: por él se pasan la oferta y la respuesta de WebRTC, con las rutas de red de cada uno dentro. Después
// hablan directamente, por la wifi de casa, sin pasar por ningún servidor. La página del mando (public/mando/) usa este
// mismo archivo: la web lo publica en mando/senal.js (vite.config.js), así que los dos hablan siempre igual.
// Para no depender de uno solo, se saluda a la vez por varios caminos y vale el primero que conteste:
//  · el servidor público de PeerJS
//  · de reserva, servidores públicos de MQTT: tres de siempre y dos por el puerto de las webs (443), que no corta ninguna
//    wifi ni ningún operador
//  · y ntfy.sh, también por el 443: solo para la oferta y la respuesta (no deja mandar muchos mensajes seguidos)
// Lo que llega repetido por dos caminos se cuenta una vez (cada mensaje lleva su marca, payload.k). Un camino que se cae, o
// que no contestó, se vuelve a probar al rato, y el saludo no se da nunca por perdido: si se cae el único que había
// contestado, siguen los que aún estaban llegando (en la calle, PeerJS a veces acepta y se cae enseguida). Si el ordenador y el móvil no consiguen hablar directamente, los mensajes
// del mando también pueden ir por aquí, con el tipo «DATA», por los caminos que ya han entregado algo del otro.
// Seguridad: ningún servidor puede leer ni falsificar nada.
//  · Todo va cifrado y firmado (AES-GCM) por todos los caminos. Los nombres con que se apuntan en los servidores son una
//    huella del código, no el código.
//  · El QR lleva, además del código, un secreto aleatorio de 128 bits que va detrás del «#» de la dirección y no pasa
//    nunca por ningún servidor: con él se cifra todo, así que sin haber visto el QR no hay manera de hacerse pasar por el
//    móvil. Quien escribe el código a mano cifra con una clave sacada del código (PBKDF2, lento a propósito): por eso el
//    ordenador le pide permiso antes de dejarle ser el mando (src/mando/mando.js). Cada mensaje dice si llegó con el
//    secreto (fuerte) o con el código.
//  · Cada mensaje lleva su hora: lo repetido o lo que llega con más de 2 minutos de retraso (grabado y vuelto a mandar) no
//    vale. La hora se compara con la del propio que lo manda, así que un reloj mal puesto no estorba.
// Pruebas: ?senal=ws://… cambia el servidor de PeerJS, ?mqtt=ws://…,ws://… los de MQTT, ?ntfy=http://… el de ntfy
// (vacíos, ninguno), ?sinpeer=1 deja fuera PeerJS y ?trozo=n parte lo que va por ntfy en trozos de n letras.
const Q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } })();
export const SENAL = Q.get('senal') || 'wss://0.peerjs.com/peerjs';
const lista = (k, d) => (Q.has(k) ? Q.get(k).split(',').filter(Boolean) : d);
const MQTT = lista('mqtt', ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt', 'wss://mqtt.eclipseprojects.io:443/mqtt', 'wss://public:public@public.cloud.shiftr.io']);
const NTFY = lista('ntfy', ['https://ntfy.sh']);
const SIN_PEER = Q.has('sinpeer');
/** Prueba: ?sinp2p hace que el ordenador y el móvil no puedan hablar directamente (para probar el relevo por el saludo). */
export const SIN_P2P = Q.has('sinp2p');
// (los de Google y Cloudflare para saber la ruta de cada uno y, si la wifi no deja hablar directamente, los de PeerJS de
// relevo; si aun así no hay manera, el mando va por el propio saludo: mira «DATA» más arriba)
export const ICE = SIN_P2P ? [] : [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }];
/** Los parámetros de prueba que también tiene que llevar la página del mando (para el QR). */
export const SENAL_PRUEBA = ['senal', 'mqtt', 'ntfy', 'sinpeer', 'sinp2p', 'trozo'].filter(k => Q.has(k)).map(k => `${k}=${encodeURIComponent(Q.get(k))}`).join('&');
const TIEMPO = 8000;   // (un camino que no contesta en 8 s no vale)
const TROZO = +Q.get('trozo') || 3000;   // (ntfy: hasta 4096 letras por mensaje; lo largo, en trozos)
const RETRASO = 120000;   // (lo que llega con más retraso que esto, grabado y vuelto a mandar, no vale)
// el nombre de cada camino, para enseñar en las dos pantallas cuáles contestan
const NOMBRES = [[/peerjs/, 'PeerJS'], [/emqx/, 'EMQX'], [/hivemq/, 'HiveMQ'], [/mosquitto/, 'Mosquitto'], [/eclipse/, 'Eclipse'], [/shiftr/, 'Shiftr'], [/ntfy/, 'ntfy']];
const nombre = (u) => { const U = new URL(u); return (NOMBRES.find(([r]) => r.test(U.hostname)) || [, U.host])[1]; };
/** Los caminos del saludo: { n (su nombre), tipo, u }. */
export const CAMINOS = [...(SIN_PEER ? [] : [{ tipo: 'peer', u: SENAL }]), ...MQTT.map(u => ({ tipo: 'mqtt', u })), ...NTFY.map(u => ({ tipo: 'ntfy', u }))].map(c => ({ ...c, n: nombre(c.u) }));
/** Un secreto nuevo para el QR: 128 bits al azar, en letras que valen en una dirección. */
export const nuevoSecreto = () => b64(crypto.getRandomValues(new Uint8Array(16))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const SECRETO = /^[A-Za-z0-9_-]{22}$/;

/** Se apunta con el nombre id (hzh-CÓDIGO en el ordenador, hzh-CÓDIGO-m… en el móvil). Devuelve { send(dst, type,
 *  payload, fuerte), close() } en cuanto un camino lo acepta; falla con 'ID-TAKEN' si el nombre ya está cogido y con
 *  'red' si no contesta ninguno. onMsg recibe lo que otros le mandan: { type, src, payload, fuerte }; onEstado, cada vez
 *  que un camino cambia: { nombre: 'prueba' | 'ok' | 'mal' }. Con secreto (el del QR), se
 *  manda con él (fuerte) salvo que send diga lo contrario, y se entiende lo que llegue con él o con el código. */
export function senal(id, onMsg, onEstado, secreto = '') {
  const code = (/^hzh-([0-9A-Z]{5})/.exec(id) || [])[1] || '';
  if (!code || !globalThis.crypto?.subtle) return Promise.reject(new Error('red'));
  return claves(code, secreto).then(K => new Promise((ok, ko) => {
    const vias = [], visto = new Set(), est = {}, desfase = new Map(), soloEnviado = new Map(); let listo = false, cerrado = false, pend = 0, cogido = false; const veces = new Map();
    const pon = (n, e) => { est[n] = e; onEstado?.({ ...est }); };
    // los nombres en cada servidor: una huella del código y, detrás, «pc» para el ordenador o la marca del móvil, «-m…»
    const suyo = (x) => x.slice(('hzh-' + code).length) || 'pc';
    const dir = { peer: (x) => `hzh-${K.hue.slice(0, 20)}${suyo(x) === 'pc' ? '' : suyo(x)}`, mqtt: (x) => `hzh/${K.hue}/${suyo(x)}`, ntfy: (x) => `hzh${K.hue}-${suyo(x).replace(/^-/, '')}` };
    // lo que llega: se abre (si no, no es de los nuestros); el camino por el que llega algo del otro, aunque sea repetido,
    // queda probado (por él irá el mando si no hablan directamente); y lo repetido, o grabado y vuelto a mandar, fuera
    const recibe = (bytes, v) => abre(K, bytes).then((m) => {
      v.oido = performance.now();
      const d = Date.now() - m.t, o = Math.min(desfase.has(m.src) ? desfase.get(m.src) : d, d); desfase.set(m.src, o);
      if (d - o > RETRASO) return;
      const k = m.payload?.k; if (k) { if (visto.has(k)) return; visto.add(k); if (visto.size > 5000) visto.delete(visto.values().next().value); }
      onMsg(m);
    }).catch(() => { /* de otro, o roto: fuera */ });
    const api = {
      // (la marca, la que traiga el mensaje: así el móvil puede repetir su oferta y contar como una sola)
      send: (dst, type, payload, fuerte = !!K.fuerte) => {
        const p = { k: Math.random().toString(36).slice(2), ...payload }, saludo = type === 'OFFER' || type === 'ANSWER';
        sella(K, { type, src: id, payload: p }, fuerte).then((bytes) => {
          for (const v of type === 'DATA' ? paraElMando() : vias) {
            if (v.solo) {   // (ntfy: solo el saludo, y la oferta que se repite cada 2 s, por ahí solo cada 6)
              const antes = soloEnviado.get(p.k); if (!saludo || (antes && Date.now() - antes < 6000)) continue;
              soloEnviado.set(p.k, Date.now()); if (soloEnviado.size > 50) soloEnviado.delete(soloEnviado.keys().next().value);
            }
            v.send(dir[v.c.tipo](dst), bytes);
          }
        });
      },
      close: () => { cerrado = true; for (const v of [...vias]) v.close(); vias.length = 0; },
    };
    // (el mando, por dos caminos: primero los probados, el que más recientemente trajo algo del otro antes; un servidor que
    // acepta pero no entrega nada no se queda con él)
    const paraElMando = () => { const vs = vias.filter(x => !x.solo); return [...vs.filter(x => x.oido).sort((a, b) => b.oido - a.oido), ...vs.filter(x => !x.oido)].slice(0, 2); };
    const cae = (v) => {
      const i = vias.indexOf(v); if (i >= 0) vias.splice(i, 1); if (cerrado) return;
      pon(v.n, 'mal'); if (performance.now() - v.t0 > 10000) veces.delete(v.c); otraVez(v.c);
    };
    // (otra vez al rato: a los 2 s, a los 4, a los 8 y luego cada 15; la cuenta vuelve a empezar si el camino aguanta 10 s:
    // uno que acepta y se cae enseguida se prueba cada vez menos)
    const otraVez = (c) => { const n = veces.get(c) || 0; veces.set(c, n + 1); setTimeout(() => intenta(c), [2000, 4000, 8000][n] || 15000); };
    const arranca = (c) => (c.tipo === 'peer' ? peer : c.tipo === 'mqtt' ? mqtt : ntfy)(c, dir[c.tipo](id), recibe, cae);
    const intenta = (c, primera) => {
      if (cerrado || vias.some(v => v.c === c)) return;
      if (primera) pend++;
      pon(c.n, 'prueba');
      arranca(c).then((v) => {
        if (cerrado) { v.close(); return; }
        v.t0 = performance.now(); vias.push(v); pon(c.n, 'ok');
        if (!listo) { listo = true; ok(api); }
      }, (e) => {
        if (e?.message === 'ID-TAKEN') cogido = true;
        if (cerrado) return;
        pon(c.n, 'mal'); otraVez(c);
      }).finally(() => { if (primera && --pend === 0 && !listo) { cerrado = true; ko(new Error(cogido ? 'ID-TAKEN' : 'red')); } });
    };
    for (const c of CAMINOS) intenta(c, true);
    if (!pend) ko(new Error('red'));
  }));
}

// ---------- el cifrado ----------
const TE = new TextEncoder(), TD = new TextDecoder();
const b64 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const de64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
const memo = new Map();
// la del código (PBKDF2, lento a propósito para que no se pueda probar código a código), con la huella que da nombre a cada
// uno en los servidores; y la del secreto del QR, si lo hay (HKDF: 128 bits al azar no hace falta hacerlos lentos)
function claves(code, secreto) {
  const k = code + '.' + secreto;
  if (!memo.has(k)) memo.set(k, (async () => {
    const base = await crypto.subtle.importKey('raw', TE.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: TE.encode('herrizherri-mando'), iterations: 100000, hash: 'SHA-256' }, base, 256));
    const debil = await crypto.subtle.importKey('raw', bits.slice(0, 16), 'AES-GCM', false, ['encrypt', 'decrypt']);
    let fuerte = null;
    if (SECRETO.test(secreto)) { const s = await crypto.subtle.importKey('raw', de64(secreto), 'HKDF', false, ['deriveKey']); fuerte = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: TE.encode('herrizherri-mando'), info: TE.encode(code) }, s, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']); }
    return { debil, fuerte, hue: [...bits.slice(16, 28)].map(b => b.toString(16).padStart(2, '0')).join('') };
  })());
  return memo.get(k);
}
const sella = async (K, obj, fuerte) => { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, fuerte && K.fuerte ? K.fuerte : K.debil, TE.encode(JSON.stringify({ ...obj, t: Date.now() })))); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out; };
// (se prueba con el secreto y, si no, con el código: lo que abra dice cuál era)
async function abre(K, b) {
  const iv = b.slice(0, 12), ct = b.slice(12);
  for (const [key, fuerte] of [[K.fuerte, true], [K.debil, false]]) {
    if (!key) continue;
    let txt; try { txt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct); } catch (e) { continue; }
    const m = JSON.parse(TD.decode(txt)); if (typeof m.t !== 'number' || typeof m.src !== 'string') throw new Error('roto');
    return { ...m, fuerte };
  }
  throw new Error('ajeno');
}

// ---------- el servidor de PeerJS (lo cifrado, dentro de un CANDIDATE: es lo que reenvía tal cual) ----------
function peer(c, yo, recibe, cae) {
  return new Promise((ok, ko) => {
    let ws, hb = 0, open = false;
    try { ws = new WebSocket(`${c.u}?key=peerjs&id=${encodeURIComponent(yo)}&token=${Math.random().toString(36).slice(2, 12)}`); } catch (e) { ko(e); return; }
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws.close(); } catch (e) { } } }, TIEMPO);
    const v = { n: c.n, c, send: (dst, bytes) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'CANDIDATE', dst, payload: { x: b64(bytes) } })); }, close: () => { clearInterval(hb); try { ws.close(); } catch (e) { } } };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.type === 'OPEN') { open = true; clearTimeout(t); hb = setInterval(() => ws.readyState === 1 && ws.send('{"type":"HEARTBEAT"}'), 5000); ok(v); }   // (sin latido, el servidor cierra al minuto)
      else if (!open && (m.type === 'ID-TAKEN' || m.type === 'ERROR' || m.type === 'INVALID-KEY')) { clearTimeout(t); ko(new Error(m.type)); }
      else if (m.type === 'CANDIDATE' && typeof m.payload?.x === 'string') { try { recibe(de64(m.payload.x), v); } catch (er) { } }   // (los avisos del servidor, como EXPIRE, no: el otro puede estar por otro camino)
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { clearInterval(hb); if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}

// ---------- de reserva: un servidor de MQTT (versión 3.1.1, lo justo: conectar, apuntarse a un tema y publicar) ----------
const str = (s) => { const b = TE.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
const largo = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; o.push(d); } while (n); return o; };
const paquete = (h, cuerpo) => { const L = largo(cuerpo.length), out = new Uint8Array(1 + L.length + cuerpo.length); out[0] = h; out.set(L, 1); out.set(cuerpo, 1 + L.length); return out; };

function mqtt(c, yo, recibe, cae) {
  return new Promise((ok, ko) => {
    let ws, open = false, ping = 0, buf = new Uint8Array(0);
    // (el usuario y la contraseña, si el servidor los pide, van en la dirección: se pasan al conectar, no al navegador)
    const U = new URL(c.u), user = decodeURIComponent(U.username), pass = decodeURIComponent(U.password); U.username = ''; U.password = '';
    try { ws = new WebSocket(U.href, 'mqtt'); ws.binaryType = 'arraybuffer'; } catch (e) { ko(e); return; }
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws.close(); } catch (e) { } } }, TIEMPO);
    const fin = () => { clearInterval(ping); try { ws.close(); } catch (e) { } };
    const v = { n: c.n, c, send: (dst, bytes) => { if (ws.readyState === 1) ws.send(paquete(0x30, new Uint8Array([...str(dst), ...bytes]))); }, close: fin };
    ws.onopen = () => {
      const quien = [...str('hzh' + Math.random().toString(36).slice(2, 12)), ...(user ? str(user) : []), ...(pass ? str(pass) : [])];
      ws.send(paquete(0x10, new Uint8Array([...str('MQTT'), 4, 2 | (user ? 0x80 : 0) | (pass ? 0x40 : 0), 0, 60, ...quien])));
    };
    ws.onmessage = (e) => {
      const nuevo = new Uint8Array(e.data), b2 = new Uint8Array(buf.length + nuevo.length); b2.set(buf); b2.set(nuevo, buf.length); buf = b2;
      // (un mensaje del servidor puede venir partido en varios trozos, o varios en uno)
      while (buf.length >= 2) {
        let n = 0, m = 1, i = 1, d;
        do { if (i >= buf.length) return; d = buf[i++]; n += (d & 127) * m; m *= 128; } while (d & 128);
        if (buf.length < i + n) return;
        const h = buf[0], cuerpo = buf.slice(i, i + n); buf = buf.slice(i + n);
        const tipo = h >> 4;
        if (tipo === 2) {   // CONNACK: dentro; se apunta a su tema
          if (cuerpo[1] !== 0) { clearTimeout(t); ko(new Error('red')); fin(); return; }
          ws.send(paquete(0x82, new Uint8Array([0, 1, ...str(yo), 0])));
        } else if (tipo === 9) {   // SUBACK: ya escucha
          if (cuerpo[2] === 0x80) { clearTimeout(t); ko(new Error('red')); fin(); return; }
          open = true; clearTimeout(t); ping = setInterval(() => ws.readyState === 1 && ws.send(new Uint8Array([0xc0, 0])), 30000); ok(v);
        } else if (tipo === 3) {   // PUBLISH: un mensaje cifrado
          const tl = (cuerpo[0] << 8) | cuerpo[1], qos = (h >> 1) & 3;
          recibe(cuerpo.slice(2 + tl + (qos ? 2 : 0)), v);
        }
      }
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { clearInterval(ping); if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}

// ---------- de reserva por el 443: ntfy.sh (solo la oferta y la respuesta, en trozos si son largas) ----------
function ntfy(c, yo, recibe, cae) {
  return new Promise((ok, ko) => {
    let ws = null, open = false;
    const partes = new Map(), base = c.u.replace(/\/+$/, '');
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws?.close(); } catch (e) { } } }, TIEMPO);
    const v = {
      n: c.n, c, solo: true,   // (solo el saludo: el mando no va por aquí)
      send: (dst, bytes) => {
        if (!open) return;
        const txt = b64(bytes), mid = Math.random().toString(36).slice(2, 10), n = Math.ceil(txt.length / TROZO);
        for (let i = 0; i < n; i++) fetch(`${base}/${dst}?cache=no&firebase=no`, { method: 'POST', mode: 'no-cors', body: `${mid}.${i}.${n}.${txt.slice(i * TROZO, (i + 1) * TROZO)}` }).catch(() => { });
      },
      close: () => { try { ws?.close(); } catch (e) { } },
    };
    try { ws = new WebSocket(`${base.replace(/^http/, 'ws')}/${yo}/ws`); } catch (e) { clearTimeout(t); ko(e); return; }
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.event === 'open') { if (!open) { open = true; clearTimeout(t); ok(v); } return; }
      if (m.event !== 'message' || typeof m.message !== 'string') return;
      const p = /^([a-z0-9]{1,12})\.(\d{1,3})\.(\d{1,3})\.([A-Za-z0-9+/=]+)$/.exec(m.message.trim()); if (!p || +p[3] > 64) return;
      let a = partes.get(p[1]); if (!a) { a = []; partes.set(p[1], a); if (partes.size > 20) partes.delete(partes.keys().next().value); }
      a[+p[2]] = p[4]; if (a.filter(Boolean).length < +p[3]) return;
      partes.delete(p[1]); try { recibe(de64(a.join('')), v); } catch (er) { }
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}
