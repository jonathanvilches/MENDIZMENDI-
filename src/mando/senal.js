// El saludo entre el ordenador y el móvil que hace de mando. Los dos se apuntan con un nombre en un servidor que solo sirve
// para presentarse: por él se pasan la oferta y la respuesta de WebRTC, con las rutas de red de cada uno dentro. Después
// hablan directamente, por la wifi de casa, sin pasar por ningún servidor. La página del mando
// (public/mando/index.html) lleva una copia de esto mismo.
// Para no depender de uno solo, se saluda a la vez por varios caminos y vale el primero que conteste:
//  · el servidor público de PeerJS
//  · de reserva, tres servidores públicos de MQTT. Lo que pasa por ellos va cifrado con el código de cinco letras
//    (AES-GCM) y el tema es una huella del código: quien escuche ahí no ve ni el código ni las direcciones de red
// Lo que llega repetido por dos caminos se cuenta una vez (cada mensaje lleva su marca, payload.k).
// Si el ordenador y el móvil no consiguen hablar directamente (una wifi que no lo deja y el relevo de PeerJS caído), los
// mensajes del mando también pueden ir por aquí, con el tipo «DATA»: por los dos primeros caminos que contestaron.
// Pruebas: ?senal=ws://… cambia el servidor de PeerJS, ?mqtt=ws://…,ws://… los de MQTT y ?sinpeer=1 lo deja solo con MQTT.
const Q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } })();
export const SENAL = Q.get('senal') || 'wss://0.peerjs.com/peerjs';
const MQTT = Q.get('mqtt') ? Q.get('mqtt').split(',') : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const SIN_PEER = Q.has('sinpeer');
/** Prueba: ?sinp2p hace que el ordenador y el móvil no puedan hablar directamente (para probar el relevo por el saludo). */
export const SIN_P2P = Q.has('sinp2p');
// (los de Google y Cloudflare para saber la ruta de cada uno y, si la wifi no deja hablar directamente, los de PeerJS de
// relevo; si aun así no hay manera, el mando va por el propio saludo: mira «DATA» más abajo)
export const ICE = SIN_P2P ? [] : [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }];
/** Los parámetros de prueba que también tiene que llevar la página del mando (para el QR). */
export const SENAL_PRUEBA = ['senal', 'mqtt', 'sinpeer', 'sinp2p'].filter(k => Q.has(k)).map(k => `${k}=${encodeURIComponent(Q.get(k))}`).join('&');
const TIEMPO = 8000;   // (un camino que no contesta en 8 s no vale)

/** Se apunta con el nombre id (hzh-CÓDIGO en el ordenador, hzh-CÓDIGO-m… en el móvil). Devuelve { send(dst, type,
 *  payload), close() } en cuanto un camino lo acepta; falla con 'ID-TAKEN' si el nombre ya está cogido y con 'red' si no
 *  contesta ninguno. onMsg recibe lo que otros le mandan: { type, src, payload }; onClose, cuando se caen todos. */
export function senal(id, onMsg, onClose) {
  const code = (/^hzh-([0-9A-Z]{5})/.exec(id) || [])[1] || '';
  return new Promise((ok, ko) => {
    const vias = [], visto = new Set(); let listo = false, cerrado = false, pend = 0, cogido = false;
    // (las marcas vistas, las últimas 500: con el mando yendo por aquí llegan decenas por segundo)
    const llega = (m) => { const k = m.payload?.k; if (k) { if (visto.has(k)) return; visto.add(k); if (visto.size > 500) visto.delete(visto.values().next().value); } onMsg(m); };
    const cae = (v) => { const i = vias.indexOf(v); if (i >= 0) vias.splice(i, 1); if (listo && !cerrado && !vias.length) onClose?.(); };
    const api = {
      // (la marca, la que traiga el mensaje: así el móvil puede repetir su oferta y contar como una sola)
      send: (dst, type, payload) => { const p = { k: Math.random().toString(36).slice(2), ...payload }; for (const v of type === 'DATA' ? vias.slice(0, 2) : vias) v.send(dst, type, p); },
      close: () => { cerrado = true; for (const v of [...vias]) v.close(); vias.length = 0; },
    };
    const prueba = (p) => {
      pend++;
      p.then((v) => { if (cerrado) { v.close(); return; } vias.push(v); if (!listo) { listo = true; ok(api); } },
        (e) => { if (e?.message === 'ID-TAKEN') cogido = true; })
        .finally(() => { if (--pend === 0 && !listo) ko(new Error(cogido ? 'ID-TAKEN' : 'red')); });
    };
    if (!SIN_PEER) prueba(peer(id, llega, cae));
    if (code && globalThis.crypto?.subtle) for (const u of MQTT) prueba(mqtt(u, id, code, llega, cae));
    if (!pend) ko(new Error('red'));
  });
}

// ---------- el servidor de PeerJS ----------
function peer(id, llega, cae) {
  return new Promise((ok, ko) => {
    let ws, hb = 0, open = false;
    try { ws = new WebSocket(`${SENAL}?key=peerjs&id=${encodeURIComponent(id)}&token=${Math.random().toString(36).slice(2, 12)}`); } catch (e) { ko(e); return; }
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws.close(); } catch (e) { } } }, TIEMPO);
    // (el servidor de PeerJS solo reenvía sus tipos: los mensajes del mando van dentro de un CANDIDATE, en «datos»)
    const v = { send: (dst, type, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify(type === 'DATA' ? { type: 'CANDIDATE', dst, payload: { datos: payload } } : { type, dst, payload })); }, close: () => { clearInterval(hb); try { ws.close(); } catch (e) { } } };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.type === 'OPEN') { open = true; clearTimeout(t); hb = setInterval(() => ws.readyState === 1 && ws.send('{"type":"HEARTBEAT"}'), 5000); ok(v); }   // (sin latido, el servidor cierra al minuto)
      else if (!open && (m.type === 'ID-TAKEN' || m.type === 'ERROR' || m.type === 'INVALID-KEY')) { clearTimeout(t); ko(new Error(m.type)); }
      else if (m.type === 'CANDIDATE' && m.payload?.datos) llega({ type: 'DATA', src: m.src, payload: m.payload.datos });
      else if (m.type === 'OFFER' || m.type === 'ANSWER' || m.type === 'CANDIDATE') llega(m);   // (los avisos del servidor, como EXPIRE, no: el otro puede estar por otro camino)
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { clearInterval(hb); if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}

// ---------- de reserva: un servidor de MQTT (versión 3.1.1, lo justo: conectar, apuntarse a un tema y publicar) ----------
const TE = new TextEncoder(), TD = new TextDecoder();
const claves = new Map();
// la clave para cifrar y el tema de cada código salen del propio código (PBKDF2, lento a propósito para que no se pueda
// probar código a código)
function clave(code) {
  if (!claves.has(code)) claves.set(code, (async () => {
    const base = await crypto.subtle.importKey('raw', TE.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: TE.encode('herrizherri-mando'), iterations: 100000, hash: 'SHA-256' }, base, 256));
    return { key: await crypto.subtle.importKey('raw', bits.slice(0, 16), 'AES-GCM', false, ['encrypt', 'decrypt']), tema: 'hzh/' + [...bits.slice(16, 28)].map(b => b.toString(16).padStart(2, '0')).join('') };
  })());
  return claves.get(code);
}
// (el tema de cada uno: el del código y, detrás, «pc» para el ordenador o la marca del móvil)
const temaDe = (tema, code, id) => `${tema}/${id.slice(('hzh-' + code).length) || 'pc'}`;
const str = (s) => { const b = TE.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
const largo = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; o.push(d); } while (n); return o; };
const paquete = (h, cuerpo) => { const L = largo(cuerpo.length), out = new Uint8Array(1 + L.length + cuerpo.length); out[0] = h; out.set(L, 1); out.set(cuerpo, 1 + L.length); return out; };

function mqtt(url, id, code, llega, cae) {
  return new Promise((ok, ko) => {
    let ws, open = false, ping = 0, buf = new Uint8Array(0), K = null;
    try { ws = new WebSocket(url, 'mqtt'); ws.binaryType = 'arraybuffer'; } catch (e) { ko(e); return; }
    const t = setTimeout(() => { if (!open) { ko(new Error('red')); try { ws.close(); } catch (e) { } } }, TIEMPO);
    const fin = () => { clearInterval(ping); try { ws.close(); } catch (e) { } };
    const v = {
      send: async (dst, type, payload) => {
        if (ws.readyState !== 1) return;
        const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, K.key, TE.encode(JSON.stringify({ type, src: id, payload }))));
        const cuerpo = new Uint8Array([...str(temaDe(K.tema, code, dst)), ...iv, ...ct]);
        if (ws.readyState === 1) ws.send(paquete(0x30, cuerpo));
      },
      close: fin,
    };
    ws.onopen = async () => {
      try { K = await clave(code); } catch (e) { clearTimeout(t); ko(e); fin(); return; }
      ws.send(paquete(0x10, new Uint8Array([...str('MQTT'), 4, 2, 0, 60, ...str('hzh' + Math.random().toString(36).slice(2, 12))])));
    };
    ws.onmessage = (e) => {
      const nuevo = new Uint8Array(e.data), b2 = new Uint8Array(buf.length + nuevo.length); b2.set(buf); b2.set(nuevo, buf.length); buf = b2;
      while (buf.length >= 2) {
        let n = 0, m = 1, i = 1, d;
        do { if (i >= buf.length) return; d = buf[i++]; n += (d & 127) * m; m *= 128; } while (d & 128);
        if (buf.length < i + n) return;
        const h = buf[0], cuerpo = buf.slice(i, i + n); buf = buf.slice(i + n);
        const tipo = h >> 4;
        if (tipo === 2) {   // CONNACK: dentro; se apunta a su tema
          if (cuerpo[1] !== 0) { clearTimeout(t); ko(new Error('red')); fin(); return; }
          ws.send(paquete(0x82, new Uint8Array([0, 1, ...str(temaDe(K.tema, code, id)), 0])));
        } else if (tipo === 9) {   // SUBACK: ya escucha
          if (cuerpo[2] === 0x80) { clearTimeout(t); ko(new Error('red')); fin(); return; }
          open = true; clearTimeout(t); ping = setInterval(() => ws.readyState === 1 && ws.send(new Uint8Array([0xc0, 0])), 30000); ok(v);
        } else if (tipo === 3) {   // PUBLISH: un mensaje cifrado
          const tl = (cuerpo[0] << 8) | cuerpo[1], qos = (h >> 1) & 3, ini = 2 + tl + (qos ? 2 : 0);
          const datos = cuerpo.slice(ini);
          // (sin esperar aquí: el siguiente paquete no tiene que aguardar a que se descifre este)
          crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.slice(0, 12) }, K.key, datos.slice(12)).then(txt => llega(JSON.parse(TD.decode(txt)))).catch(() => { /* de otro, o roto: fuera */ });
        }
      }
    };
    ws.onerror = () => { if (!open) { clearTimeout(t); ko(new Error('red')); } };
    ws.onclose = () => { clearInterval(ping); if (open) cae(v); else { clearTimeout(t); ko(new Error('red')); } };
  });
}
