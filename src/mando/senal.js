// El saludo entre el ordenador y el móvil que hace de mando. Los dos se apuntan con un nombre en un servidor público de
// PeerJS, que solo sirve para presentarse: por él se pasan la oferta y la respuesta de WebRTC y las rutas de red de cada
// uno. Después hablan directamente, por la wifi de casa, sin pasar por ningún servidor. La página del mando
// (public/mando/index.html) lleva una copia de esto mismo.
// Con ?senal=ws://… se usa otro servidor (las pruebas usan uno de PeerJS en local).
export const SENAL = (() => { try { return new URLSearchParams(location.search).get('senal') || 'wss://0.peerjs.com/peerjs'; } catch (e) { return 'wss://0.peerjs.com/peerjs'; } })();
// (los de Google para saber la ruta de cada uno y, si la wifi no deja hablar directamente, los de PeerJS de relevo)
export const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }];

/** Se apunta en el servidor con el nombre id. Devuelve { send(dst, type, payload), close() } cuando el servidor lo acepta;
 *  falla con 'ID-TAKEN' si el nombre ya está cogido. onMsg recibe lo que otros le mandan: { type, src, payload }. */
export function senal(id, onMsg, onClose) {
  return new Promise((ok, ko) => {
    let ws, hb = 0, open = false;
    try { ws = new WebSocket(`${SENAL}?key=peerjs&id=${encodeURIComponent(id)}&token=${Math.random().toString(36).slice(2, 12)}`); } catch (e) { ko(e); return; }
    const api = { send: (dst, type, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type, dst, payload })); }, close: () => { clearInterval(hb); try { ws.close(); } catch (e) { } } };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.type === 'OPEN') { open = true; hb = setInterval(() => ws.readyState === 1 && ws.send('{"type":"HEARTBEAT"}'), 5000); ok(api); }   // (sin latido, el servidor cierra al minuto)
      else if (!open && (m.type === 'ID-TAKEN' || m.type === 'ERROR' || m.type === 'INVALID-KEY')) ko(new Error(m.type));
      else onMsg(m);
    };
    ws.onerror = () => { if (!open) ko(new Error('red')); };
    ws.onclose = () => { clearInterval(hb); if (open) onClose?.(); else ko(new Error('red')); };
  });
}
