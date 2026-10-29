// Cuenta la memoria que se pide a la tarjeta gráfica (texturas, búferes, renderbuffers), por contexto WebGL2
(() => {
  const P = WebGL2RenderingContext.prototype, T = new Map(), B = new Map(), R = new Map();
  const st = { unit: 0, bound: new Map(), buf: new Map(), rb: null };
  const bpp = (fmt, type) => (type === 0x1406 ? 16 : type === 0x140B || type === 0x8D61 ? 8 : 4);   // FLOAT, HALF_FLOAT, otro
  const key = (t) => (t >= 0x8515 && t <= 0x851A ? 0x8513 : t);
  const w = (n, f) => { const o = P[n]; P[n] = function (...a) { try { f.call(this, a); } catch (e) { } return o.apply(this, a); }; };
  w('activeTexture', (a) => { st.unit = a[0]; });
  w('bindTexture', (a) => { st.bound.set(st.unit + ':' + key(a[0]), a[1]); });
  const cur = (t) => st.bound.get(st.unit + ':' + key(t));
  const pon = (tex, lvl, face, bytes) => { if (!tex) return; let m = T.get(tex); if (!m) T.set(tex, m = new Map()); m.set(lvl + ':' + face, bytes); };
  w('texImage2D', (a) => { let wd, ht, type; if (a.length >= 8) { wd = a[3]; ht = a[4]; type = a[7]; } else { const s = a[5]; wd = s.videoWidth || s.naturalWidth || s.width; ht = s.videoHeight || s.naturalHeight || s.height; type = a[4]; } pon(cur(a[0]), a[1], a[0], wd * ht * bpp(a[2], type)); });
  w('texStorage2D', (a) => { let s = 0; for (let l = 0; l < a[1]; l++) s += Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * 4; pon(cur(a[0]), 'S', a[0], s * (a[0] === 0x8513 ? 6 : 1)); });
  w('texImage3D', (a) => { pon(cur(a[0]), a[1], a[0], a[3] * a[4] * a[5] * 4); });
  w('texStorage3D', (a) => { let s = 0; for (let l = 0; l < a[1]; l++) s += Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * a[5] * 4; pon(cur(a[0]), 'S', a[0], s); });
  w('compressedTexImage2D', (a) => { const d = a[a.length - 1]; pon(cur(a[0]), a[1], a[0], d?.byteLength || 0); });
  w('generateMipmap', (a) => { const m = T.get(cur(a[0])); if (m) { const b = m.get('0:' + a[0]); if (b) m.set('mip:' + a[0], b / 3); } });
  w('deleteTexture', (a) => { T.delete(a[0]); });
  w('bindBuffer', (a) => { st.buf.set(a[0], a[1]); });
  w('bufferData', (a) => { const b = st.buf.get(a[0]); if (b) B.set(b, typeof a[1] === 'number' ? a[1] : a[1].byteLength); });
  w('deleteBuffer', (a) => { B.delete(a[0]); });
  w('bindRenderbuffer', (a) => { st.rb = a[1]; });
  w('renderbufferStorage', (a) => { if (st.rb) R.set(st.rb, a[2] * a[3] * 4); });
  w('renderbufferStorageMultisample', (a) => { if (st.rb) R.set(st.rb, a[3] * a[4] * 4 * Math.max(1, a[1])); });
  w('deleteRenderbuffer', (a) => { R.delete(a[0]); });
  window.__gpu = () => { let t = 0, n = 0, big = []; for (const [tex, m] of T) { let s = 0; for (const v of m.values()) s += v; t += s; n++; big.push(s); }
    let b = 0; for (const v of B.values()) b += v; let r = 0; for (const v of R.values()) r += v;
    big.sort((x, y) => y - x); const MB = (x) => Math.round(x / 1048576);
    return { texMB: MB(t), texN: n, bufMB: MB(b), bufN: B.size, rbMB: MB(r), mayores: big.slice(0, 12).map(MB) }; };
})();
