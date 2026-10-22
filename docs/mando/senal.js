// El saludo entre el ordenador y el móvil que hace de mando. Los dos se apuntan con un nombre en un servidor que solo sirve
// para presentarse: por él se pasan la oferta y la respuesta de WebRTC, con las rutas de red de cada uno dentro. Después
// hablan directamente, por la wifi de casa, sin pasar por ningún servidor. La página del mando (public/mando/index.html)
// usa este mismo archivo: la web lo publica en mando/senal.js (vite.config.js), así que los dos hablan siempre igual.
// Para no depender de uno solo, se saluda a la vez por varios caminos y vale el primero que conteste:
//  · el servidor público de PeerJS
//  · de reserva, servidores públicos de MQTT: tres de siempre y dos por el puerto de las webs (443), que no corta ninguna
//    wifi ni ningún operador
//  · y ntfy.sh, también por el 443: solo para la oferta y la respuesta (no deja mandar muchos mensajes seguidos)
// Por MQTT y ntfy todo va cifrado con el código de cinco letras (AES-GCM) y el tema es una huella del código: quien
// escuche ahí no ve ni el código ni las direcciones de red. Lo que llega repetido por dos caminos se cuenta una vez (cada
// mensaje lleva su marca, payload.k). Un camino que se cae, o que no contestó, se vuelve a probar al rato.
// Si el ordenador y el móvil no consiguen hablar directamente (una wifi que no lo deja y el relevo de PeerJS caído), los
// mensajes del mando también pueden ir por aquí, con el tipo «DATA»: por los dos primeros caminos que contestaron.
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
// el nombre de cada camino, para enseñar en las dos pantallas cuáles contestan
const NOMBRES = [[/peerjs/, 'PeerJS'], [/emqx/, 'EMQX'], [/hivemq/, 'HiveMQ'], [/mosquitto/, 'Mosquitto'], [/eclipse/, 'Eclipse'], [/shiftr/, 'Shiftr'], [/ntfy/, 'ntfy']];
const nombre = (u) => { const U = new URL(u); return (NOMBRES.find(([r]) => r.test(U.hostname)) || [, U.host])[1]; };
/** Los caminos del saludo: { n (su nombre), tipo, u }. */
export const CAMINOS = [...(SIN_PEER ? [] : [{ tipo: 'peer', u: SENAL }]), ...MQTT.map(u => ({ tipo: 'mqtt', u })), ...NTFY.map(u => ({ tipo: 'ntfy', u }))].map(c => ({ ...c, n: nombre(c.u) }));

/** Se apunta con el nombre id (hzh-CÓDIGO en el ordenador, hzh-CÓDIGO-m… en el móvil). Devuelve { send(dst, type,
 *  payload), close() } en cuanto un camino lo acepta; falla con 'ID-TAKEN' si el nombre ya está cogido y con 'red' si no
 *  contesta ninguno. onMsg recibe lo que otros le mandan: { type, src, payload }; onClose, cuando se caen todos;
 *  onEstado, cada vez que un camino cambia: { nombre: 'prueba' | 'ok' | 'mal' }. */
export function senal(id, onMsg, onClose, onEstado) {
  const code = (/^hzh-([0-9A-Z]{5})/.exec(id) || [])[1] || '';
  return new Promise((ok, ko) => {
    const vias = [], visto = new Set(), est = {}; let listo = false, cerrado = false, pend = 0, cogido = false;
    const pon = (n, e) => { est[n] = e; onEstado?.({ ...est }); };
    // (las marcas vistas, las últimas 500: con el mando yendo por aquí llegan decenas por segundo; y el camino por el que
    // llega algo del otro, aunque sea repetido, queda probado: por él irá el mando si no hablan directamente)
    const llega = (m, v) => { v.oido = performance.now(); const k = m.payload?.k; if (k) { if (visto.has(k)) return; visto.add(k); if (visto.size > 500) visto.delete(visto.values().next().value); } onMsg(m); };
    const api = {
      // (la marca, la que traiga el mensaje: así el móvil puede repetir su oferta y contar como una sola)
      send: (dst, type, payload) => { const p = { k: Math.random().toString(36).slice(2), ...payload }; for (const v of type === 'DATA' ? paraElMando() : vias) v.send(dst, type, p); },
      close: () => { cerrado = true; for (const v of [...vias]) v.close(); vias.length = 0; },
    };
    // (el mando, por dos caminos: primero los probados, el que más recientemente trajo algo del otro antes; un servidor que
    // acepta pero no entrega nada no se queda con él)
    const paraElMando = () => { const vs = vias.filter(x => !x.solo); return [...vs.filter(x => x.oido).sort((a, b) => b.oido - a.oido), ...vs.filter(x => !x.oido)].slice(0, 2); };
    const cae = (v) => {
      const i = vias.indexOf(v); if (i >= 0) vias.splice(i, 1); if (cerrado) return;
      pon(v.n, 'mal');
      if (listo && !vias.length) { api.close(); onClose?.(); return; }
      setTimeout(() => intenta(v.c), 5000);
    };
    const arranca = (c) => (c.tipo === 'peer' ? peer : c.tipo === 'mqtt' ? mqtt : ntfy)(c, id, code, llega, cae);
    const intenta = (c, primera) => {
      if (cerrado || vias.some(v => v.c === c)) return;
      if (primera) pend++;
      pon(c.n, 'prueba');
      arranca(c).then((v) => {
        if (cerrado) { v.close(); return; }
        vias.push(v); pon(c.n, 'ok');
        if (!listo) { listo = true; ok(api); }
      }, (e) => {
        if (e?.message === 'ID-TAKEN') cogido = true;
        if (cerrado) return;
        pon(c.n, 'mal'); setTimeout(() => intenta(c), 15000);   // (el que no contestó, otra vez al rato)
      }).finally(() => { if (primera && --pend === 0 && !listo) { cerrado = true; ko(new Error(cogido ? 'ID-TAKEN' : 'red')); } });
    };
    for (const c of CAMINOS) if (c.tipo === 'peer' || (code && globalThis.crypto?.subtle)) intenta(c, true);
    if (!pend) ko(new Error('red'));
  });
}

// ---------- el servidor de PeerJS ----------
function peer(c, id, code, llega, cae) {
  return new Promise((ok, ko) => {
    let ws, hb = 0, open = false;
    try { ws = new WebSocket(`${c.u}?key=peerjs&id=${encodeURIComponent(id)}&token=${Math.random().toString(36).slice(2, 12)}`); } catch (e) { ko(e); return; }
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws.close(); } catch (e) { } } }, TIEMPO);
    // (el servidor de PeerJS solo reenvía sus tipos: los mensajes del mando van dentro de un CANDIDATE, en «datos»)
    const v = { n: c.n, c, send: (dst, type, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify(type === 'DATA' ? { type: 'CANDIDATE', dst, payload: { datos: payload } } : { type, dst, payload })); }, close: () => { clearInterval(hb); try { ws.close(); } catch (e) { } } };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.type === 'OPEN') { open = true; clearTimeout(t); hb = setInterval(() => ws.readyState === 1 && ws.send('{"type":"HEARTBEAT"}'), 5000); ok(v); }   // (sin latido, el servidor cierra al minuto)
      else if (!open && (m.type === 'ID-TAKEN' || m.type === 'ERROR' || m.type === 'INVALID-KEY')) { clearTimeout(t); ko(new Error(m.type)); }
      else if (m.type === 'CANDIDATE' && m.payload?.datos) llega({ type: 'DATA', src: m.src, payload: m.payload.datos }, v);
      else if (m.type === 'OFFER' || m.type === 'ANSWER' || m.type === 'CANDIDATE') llega(m, v);   // (los avisos del servidor, como EXPIRE, no: el otro puede estar por otro camino)
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { clearInterval(hb); if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}

// ---------- lo cifrado (MQTT y ntfy) ----------
const TE = new TextEncoder(), TD = new TextDecoder();
const claves = new Map();
// la clave para cifrar y la huella de cada código salen del propio código (PBKDF2, lento a propósito para que no se pueda
// probar código a código)
function clave(code) {
  if (!claves.has(code)) claves.set(code, (async () => {
    const base = await crypto.subtle.importKey('raw', TE.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: TE.encode('herrizherri-mando'), iterations: 100000, hash: 'SHA-256' }, base, 256));
    return { key: await crypto.subtle.importKey('raw', bits.slice(0, 16), 'AES-GCM', false, ['encrypt', 'decrypt']), hue: [...bits.slice(16, 28)].map(b => b.toString(16).padStart(2, '0')).join('') };
  })());
  return claves.get(code);
}
// (lo de cada uno, detrás de la huella del código: «pc» para el ordenador o la marca del móvil, «-m…»)
const suyo = (code, id) => id.slice(('hzh-' + code).length) || 'pc';
const cifra = async (K, obj) => { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, K.key, TE.encode(JSON.stringify(obj)))); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out; };
const descifra = async (K, b) => JSON.parse(TD.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, K.key, b.slice(12))));

// ---------- de reserva: un servidor de MQTT (versión 3.1.1, lo justo: conectar, apuntarse a un tema y publicar) ----------
const tema = (K, code, id) => `hzh/${K.hue}/${suyo(code, id)}`;
const str = (s) => { const b = TE.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
const largo = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; o.push(d); } while (n); return o; };
const paquete = (h, cuerpo) => { const L = largo(cuerpo.length), out = new Uint8Array(1 + L.length + cuerpo.length); out[0] = h; out.set(L, 1); out.set(cuerpo, 1 + L.length); return out; };

function mqtt(c, id, code, llega, cae) {
  return new Promise((ok, ko) => {
    let ws, open = false, ping = 0, buf = new Uint8Array(0), K = null;
    // (el usuario y la contraseña, si el servidor los pide, van en la dirección: se pasan al conectar, no al navegador)
    const U = new URL(c.u), user = decodeURIComponent(U.username), pass = decodeURIComponent(U.password); U.username = ''; U.password = '';
    try { ws = new WebSocket(U.href, 'mqtt'); ws.binaryType = 'arraybuffer'; } catch (e) { ko(e); return; }
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws.close(); } catch (e) { } } }, TIEMPO);
    const fin = () => { clearInterval(ping); try { ws.close(); } catch (e) { } };
    const v = {
      n: c.n, c,
      send: async (dst, type, payload) => {
        if (ws.readyState !== 1) return;
        const cuerpo = new Uint8Array([...str(tema(K, code, dst)), ...await cifra(K, { type, src: id, payload })]);
        if (ws.readyState === 1) ws.send(paquete(0x30, cuerpo));
      },
      close: fin,
    };
    ws.onopen = async () => {
      try { K = await clave(code); } catch (e) { clearTimeout(t); ko(e); fin(); return; }
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
          ws.send(paquete(0x82, new Uint8Array([0, 1, ...str(tema(K, code, id)), 0])));
        } else if (tipo === 9) {   // SUBACK: ya escucha
          if (cuerpo[2] === 0x80) { clearTimeout(t); ko(new Error('red')); fin(); return; }
          open = true; clearTimeout(t); ping = setInterval(() => ws.readyState === 1 && ws.send(new Uint8Array([0xc0, 0])), 30000); ok(v);
        } else if (tipo === 3) {   // PUBLISH: un mensaje cifrado
          const tl = (cuerpo[0] << 8) | cuerpo[1], qos = (h >> 1) & 3;
          // (sin esperar aquí: el siguiente paquete no tiene que aguardar a que se descifre este)
          descifra(K, cuerpo.slice(2 + tl + (qos ? 2 : 0))).then(m => llega(m, v)).catch(() => { /* de otro, o roto: fuera */ });
        }
      }
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { clearInterval(ping); if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}

// ---------- de reserva por el 443: ntfy.sh (solo la oferta y la respuesta, en trozos si son largas) ----------
const b64 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const de64 = (s) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
function ntfy(c, id, code, llega, cae) {
  return new Promise((ok, ko) => {
    let ws = null, open = false, K = null;
    const partes = new Map(), enviado = new Map();
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws?.close(); } catch (e) { } } }, TIEMPO);
    const base = c.u.replace(/\/+$/, ''), suTema = (x) => `hzh${K.hue}-${suyo(code, x).replace(/^-/, '')}`;
    const v = {
      n: c.n, c, solo: true,   // (solo el saludo: el mando no va por aquí)
      send: async (dst, type, payload) => {
        if ((type !== 'OFFER' && type !== 'ANSWER') || !open) return;
        // (la oferta que se repite cada 2 s, por aquí solo cada 6: ntfy no deja publicar muy seguido)
        const antes = enviado.get(payload.k); if (antes && Date.now() - antes < 6000) return;
        enviado.set(payload.k, Date.now()); if (enviado.size > 50) enviado.delete(enviado.keys().next().value);
        const txt = b64(await cifra(K, { type, src: id, payload })), mid = Math.random().toString(36).slice(2, 10), n = Math.ceil(txt.length / TROZO);
        for (let i = 0; i < n; i++) fetch(`${base}/${suTema(dst)}?cache=no&firebase=no`, { method: 'POST', mode: 'no-cors', body: `${mid}.${i}.${n}.${txt.slice(i * TROZO, (i + 1) * TROZO)}` }).catch(() => { });
      },
      close: () => { try { ws?.close(); } catch (e) { } },
    };
    (async () => {
      K = await clave(code);
      ws = new WebSocket(`${base.replace(/^http/, 'ws')}/${suTema(id)}/ws`);
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (er) { return; }
        if (m.event === 'open') { if (!open) { open = true; clearTimeout(t); ok(v); } return; }
        if (m.event !== 'message' || typeof m.message !== 'string') return;
        const p = /^([a-z0-9]{1,12})\.(\d{1,3})\.(\d{1,3})\.([A-Za-z0-9+/=]+)$/.exec(m.message.trim()); if (!p) return;
        let a = partes.get(p[1]); if (!a) { a = []; partes.set(p[1], a); if (partes.size > 20) partes.delete(partes.keys().next().value); }
        a[+p[2]] = p[4]; if (a.filter(Boolean).length < +p[3]) return;
        partes.delete(p[1]); descifra(K, de64(a.join(''))).then(m => llega(m, v)).catch(() => { });
      };
      ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
      ws.onclose = () => { if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
    })().catch((e) => { clearTimeout(t); ko(e); });
  });
}
