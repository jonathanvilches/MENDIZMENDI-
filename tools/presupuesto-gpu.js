// Cuenta la memoria que se pide a la tarjeta gráfica (texturas, búferes, renderbuffers), por contexto WebGL2: cada lienzo
// lleva lo suyo (el mapa del menú y el del juego son dos), y lo de un contexto ya perdido o soltado no cuenta. Antes se
// mezclaba lo atado en uno y en otro y lo de un contexto soltado seguía sumando: el partido de Tafalla salía con 20 MB de más
(() => {
  const P = WebGL2RenderingContext.prototype, CX = new Map();
  const de = (gl) => { let c = CX.get(gl); if (!c) CX.set(gl, c = { T: new Map(), B: new Map(), R: new Map(), unit: 0, bound: new Map(), buf: new Map(), rb: null }); return c; };
  const bpp = (fmt, type) => (type === 0x1406 ? 16 : type === 0x140B || type === 0x8D61 ? 8 : 4);   // FLOAT, HALF_FLOAT, otro
  const key = (t) => (t >= 0x8515 && t <= 0x851A ? 0x8513 : t);
  const w = (n, f) => { const o = P[n]; P[n] = function (...a) { try { f(de(this), a); } catch (e) { } return o.apply(this, a); }; };
  w('activeTexture', (c, a) => { c.unit = a[0]; });
  w('bindTexture', (c, a) => { c.bound.set(c.unit + ':' + key(a[0]), a[1]); });
  const cur = (c, t) => c.bound.get(c.unit + ':' + key(t));
  const pon = (c, tex, lvl, face, bytes) => { if (!tex) return; let m = c.T.get(tex); if (!m) c.T.set(tex, m = new Map()); m.set(lvl + ':' + face, bytes); };
  w('texImage2D', (c, a) => { let wd, ht, type; if (a.length >= 8) { wd = a[3]; ht = a[4]; type = a[7]; } else { const s = a[5]; wd = s.videoWidth || s.naturalWidth || s.width; ht = s.videoHeight || s.naturalHeight || s.height; type = a[4]; } pon(c, cur(c, a[0]), a[1], a[0], wd * ht * bpp(a[2], type)); });
  w('texStorage2D', (c, a) => { let s = 0; for (let l = 0; l < a[1]; l++) s += Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * 4; pon(c, cur(c, a[0]), 'S', a[0], s * (a[0] === 0x8513 ? 6 : 1)); });
  w('texImage3D', (c, a) => { pon(c, cur(c, a[0]), a[1], a[0], a[3] * a[4] * a[5] * 4); });
  w('texStorage3D', (c, a) => { let s = 0; for (let l = 0; l < a[1]; l++) s += Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * a[5] * 4; pon(c, cur(c, a[0]), 'S', a[0], s); });
  w('compressedTexImage2D', (c, a) => { const d = a[a.length - 1]; pon(c, cur(c, a[0]), a[1], a[0], d?.byteLength || 0); });
  w('generateMipmap', (c, a) => { const m = c.T.get(cur(c, a[0])); if (m) { const b = m.get('0:' + a[0]); if (b) m.set('mip:' + a[0], b / 3); } });
  w('deleteTexture', (c, a) => { c.T.delete(a[0]); });
  w('bindBuffer', (c, a) => { c.buf.set(a[0], a[1]); });
  w('bufferData', (c, a) => { const b = c.buf.get(a[0]); if (b) c.B.set(b, typeof a[1] === 'number' ? a[1] : a[1].byteLength); });
  w('deleteBuffer', (c, a) => { c.B.delete(a[0]); });
  w('bindRenderbuffer', (c, a) => { c.rb = a[1]; });
  w('renderbufferStorage', (c, a) => { if (c.rb) c.R.set(c.rb, a[2] * a[3] * 4); });
  w('renderbufferStorageMultisample', (c, a) => { if (c.rb) c.R.set(c.rb, a[3] * a[4] * 4 * Math.max(1, a[1])); });
  w('deleteRenderbuffer', (c, a) => { c.R.delete(a[0]); });
  const MB = (x) => Math.round(x / 1048576);
  window.__gpu = () => {
    let t = 0, n = 0, b = 0, bn = 0, r = 0; const big = [], lienzos = [];
    for (const [gl, c] of CX) {
      if (gl.isContextLost()) { CX.delete(gl); continue; }
      let ct = 0; for (const m of c.T.values()) { let s = 0; for (const v of m.values()) s += v; ct += s; n++; big.push(s); }
      let cb = 0; for (const v of c.B.values()) cb += v; bn += c.B.size; let cr = 0; for (const v of c.R.values()) cr += v;
      t += ct; b += cb; r += cr; lienzos.push({ lienzo: (gl.canvas.className || gl.canvas.id || 'sin nombre') + ' ' + gl.canvas.width + '×' + gl.canvas.height, texMB: MB(ct), bufMB: MB(cb) });
    }
    big.sort((x, y) => y - x);
    return { texMB: MB(t), texN: n, bufMB: MB(b), bufN: bn, rbMB: MB(r), mayores: big.slice(0, 12).map(MB), lienzos };
  };
})();
