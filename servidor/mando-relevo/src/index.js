// El servidor propio del mando de Herrizherri (Cloudflare Workers, en la Unión Europea). El ordenador y el móvil se
// apuntan en una «sala» y se pasan por ella el saludo de WebRTC y, si no consiguen hablar directamente, los mensajes del
// mando. Todo llega cifrado y firmado de punta a punta (AES-GCM, src/mando/senal.js): este servidor no puede leerlo ni
// falsificarlo, solo lo reenvía. La sala es una huella del código de la partida, no el código.
//  · Una sala por partida, cada una en su Durable Object de la jurisdicción «eu» (los datos no salen de la UE).
//  · WebSockets que hibernan: mientras nadie habla no cuestan nada; el latido («ping») lo contesta Cloudflare solo.
//  · Límites: 8 conexiones por sala, 64 KB por mensaje y 200 mensajes por segundo y conexión (el mando manda unos 90).
//  · Si alguien vuelve a entrar con el mismo nombre (el móvil que se reconecta), el nuevo se queda y el viejo se cierra.
// Mensaje binario: [largo del destino][destino][lo cifrado]. Al conectar, el servidor manda «OPEN».
const NOMBRE = /^[A-Za-z0-9_-]{1,40}$/, SALA = /^[0-9a-f]{24}$/;

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/') return new Response('herrizherri-mando', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const m = /^\/s\/([^/]+)\/([^/]+)$/.exec(u.pathname);
    if (!m || !SALA.test(m[1]) || !NOMBRE.test(m[2])) return new Response('no', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket', { status: 426 });
    // (en la Unión Europea; en local, con wrangler dev, no hay jurisdicciones y va sin ella)
    let id; try { id = env.SALAS.jurisdiction('eu').idFromName(m[1]); } catch (e) { id = env.SALAS.idFromName(m[1]); }
    return env.SALAS.get(id).fetch(req);
  },
};

export class Sala {
  constructor(ctx) {
    this.ctx = ctx;
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(req) {
    const yo = new URL(req.url).pathname.split('/')[3];
    // (el mismo nombre otra vez: el que se reconecta se queda y el de antes se cierra)
    for (const viejo of this.ctx.getWebSockets(yo)) try { viejo.close(4001, 'otra vez'); } catch (e) { /* ya cerrado */ }
    if (this.ctx.getWebSockets().length >= 8) return new Response('llena', { status: 429 });
    const [cli, srv] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(srv, [yo]);
    srv.serializeAttachment({ t: 0, n: 0 });
    srv.send('OPEN');
    return new Response(null, { status: 101, webSocket: cli });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg === 'string') return;   // (solo lo binario: el latido lo contesta Cloudflare)
    const b = new Uint8Array(msg);
    if (b.length < 3 || b.length > 65536) return;
    const a = ws.deserializeAttachment() || { t: 0, n: 0 }, now = Date.now();
    if (now - a.t > 1000) { a.t = now; a.n = 0; }
    if (++a.n > 200) return;
    ws.serializeAttachment(a);
    const L = b[0], dst = new TextDecoder().decode(b.subarray(1, 1 + L));
    if (!NOMBRE.test(dst)) return;
    const cuerpo = b.subarray(1 + L);
    for (const o of this.ctx.getWebSockets(dst)) if (o !== ws) try { o.send(cuerpo); } catch (e) { /* se ha ido */ }
  }
  webSocketClose(ws, code) { try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'adiós'); } catch (e) { /* ya cerrado */ } }
  webSocketError(ws) { try { ws.close(1011, 'error'); } catch (e) { /* ya cerrado */ } }
}
