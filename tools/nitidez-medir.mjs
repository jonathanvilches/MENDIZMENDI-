// La medida de nitidez, en la página (la usan tools/nitidez.mjs y tools/nitidez-juego.mjs): por cada imagen a la vista
// (etiquetas img, fondos de CSS con url y lienzos) cuántos píxeles de pantalla le tocan a cada píxel de la imagen.
// Devuelve [{ img, cls, css: [ancho, alto], nat: [ancho, alto], up }]: up > 1,5 se ve pixelada; de 1,2 a 1,5, algo blanda.
export async function medirEnPagina() {
  const dpr = devicePixelRatio, res = [], name = (u) => { const s = String(u || ''); if (s.startsWith('data:')) return 'data:' + s.slice(5, 20); return s.split('?')[0].split('/').slice(-2).join('/'); };
  const vis = (r) => r.width > 6 && r.height > 6 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  // (tapada: en los cinco puntos que se miran hay algo opaco encima que no es suyo, como la hoja que se abre sobre la
  // pantalla; para que cuenten también las que no reciben toques, se miran con todos los toques activos)
  const st = document.createElement('style'); st.textContent = '*{pointer-events:auto!important}'; document.head.appendChild(st);
  const opaco = (x) => { const c = getComputedStyle(x), m = c.backgroundColor.match(/rgba?\(([^)]+)\)/), a = m ? (m[1].split(',')[3] ?? 1) : 0;
    return +a >= 0.85 || /url\(/.test(c.backgroundImage) || (c.backdropFilter && c.backdropFilter !== 'none') || x.tagName === 'IMG' || x.tagName === 'CANVAS'; };
  const tapada = (e, r) => [[.5, .5], [.2, .2], [.8, .2], [.2, .8], [.8, .8]].every(([fx, fy]) => {
    const x = r.left + r.width * fx, y = r.top + r.height * fy; if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
    for (const t of document.elementsFromPoint(x, y)) { if (t === e || e.contains(t)) return false; if (!t.contains(e) && opaco(t)) return true; }
    return false; });
  const hidden = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return true; } return false; };
  for (const e of document.querySelectorAll('img')) {
    const r = e.getBoundingClientRect(); if (!vis(r) || !e.complete || !e.naturalWidth || hidden(e) || tapada(e, r)) continue;
    const fit = getComputedStyle(e).objectFit, sx = r.width / e.naturalWidth, sy = r.height / e.naturalHeight;
    const s = fit === 'contain' || fit === 'scale-down' ? Math.min(sx, sy) : Math.max(sx, sy);
    res.push({ img: name(e.currentSrc || e.src), cls: String(e.className || e.parentElement?.className || '').slice(0, 30), css: [Math.round(r.width), Math.round(r.height)], nat: [e.naturalWidth, e.naturalHeight], up: +(s * dpr).toFixed(2) });
  }
  const bgs = [];
  for (const e of document.querySelectorAll('body *')) {
    const c = getComputedStyle(e); if (!c.backgroundImage.includes('url(')) continue;
    const r = e.getBoundingClientRect(); if (!vis(r) || hidden(e) || tapada(e, r)) continue;
    // (cada capa del fondo con su tamaño: los degradados también cuentan como capa; las desenfocadas no se miden)
    if (/blur\(/.test(c.filter)) continue;
    // (las capas se separan por las comas de fuera de los paréntesis: los degradados llevan comas dentro)
    const split = (v) => { const o = []; let d = 0, a = ''; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(a.trim()); a = ''; } else a += ch; } o.push(a.trim()); return o; };
    const layers = split(c.backgroundImage), sizes = split(c.backgroundSize);
    layers.forEach((L, i) => { const m = L.match(/^url\("?([^")]+)"?\)$/); if (m && !m[1].startsWith('data:image/svg') && !/\.svg/.test(m[1])) bgs.push({ e, r, u: m[1], size: sizes[i % sizes.length], cls: String(e.className || '').slice(0, 30) }); });
  }
  st.remove();
  await Promise.all(bgs.map(x => new Promise(ok => { const im = new Image(); im.onload = () => { x.nw = im.naturalWidth; x.nh = im.naturalHeight; ok(); }; im.onerror = ok; im.src = x.u; })));
  for (const x of bgs) {
    if (!x.nw) continue; const sx = x.r.width / x.nw, sy = x.r.height / x.nh;
    let s = x.size === 'cover' ? Math.max(sx, sy) : x.size === 'contain' ? Math.min(sx, sy) : x.size === 'auto' || x.size === 'auto auto' ? 1 : (() => { const [a, b2] = x.size.split(' '); const w = a.endsWith('%') ? x.r.width * parseFloat(a) / 100 : a.endsWith('px') ? parseFloat(a) : null; const h = (b2 || 'auto').endsWith('%') ? x.r.height * parseFloat(b2) / 100 : (b2 || '').endsWith('px') ? parseFloat(b2) : null; return w ? w / x.nw : h ? h / x.nh : 1; })();
    res.push({ img: 'fondo ' + name(x.u), cls: x.cls, css: [Math.round(x.r.width), Math.round(x.r.height)], nat: [x.nw, x.nh], up: +(s * dpr).toFixed(2) });
  }
  // lienzos (minimapa, brújula, retratos dibujados…): píxeles del lienzo frente a los de pantalla; el del juego 3D no
  for (const e of document.querySelectorAll('canvas')) {
    if (e.id === 'c' || !e.width) continue;
    const r = e.getBoundingClientRect(); if (!vis(r) || hidden(e)) continue;
    res.push({ img: 'lienzo ' + (e.id || e.className || e.parentElement?.className || '').toString().slice(0, 24), cls: String(e.className || '').slice(0, 30), css: [Math.round(r.width), Math.round(r.height)], nat: [e.width, e.height], up: +(r.width * dpr / e.width).toFixed(2) });
  }
  return res;
}
