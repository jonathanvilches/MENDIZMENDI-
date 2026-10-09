// La medida de la auditoría de diseño (tools/auditoria-diseno.mjs, tools/auditoria-ventanas.mjs y
// tools/auditoria-partidos.mjs): se ejecuta dentro de la página con page.evaluate(auditar, selector) y devuelve
// { cortado, encima, verde, esquina, sobresale, espacio, letra, color } con lo que encuentra.
//   · sobresale: texto que se sale de la forma de su botón o de su caja (círculo, píldora, esquinas redondeadas o en ángulo)
//   · espacio: distancia de rótulo a título (10 px) y de título a texto (12 px) distinta de la común, ±2 px (de la línea
//     base de uno a lo alto de las mayúsculas del siguiente)
//   · letra: tamaño fuera de la escala (12 14 16 20 24 y de 32 en adelante) o fuente que no es del juego
//   · color: texto de un color fuera de la gama (blancos, lilas, morados y rosas)
// Con window.__auditTodo = true, «espacio» lista todas las distancias medidas (no solo las que se salen).
export const auditar = (sel) => {
  const root = sel ? document.querySelector(sel) : document.body; if (!root) return { falta: sel };
  const st = (e) => getComputedStyle(e);
  // (visible de verdad: con tamaño, sin ocultar y sin un contenedor transparente por encima)
  const vis = (e) => { const r = e.getBoundingClientRect(), s = st(e); if (!(r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none') || e.closest('[hidden],[aria-hidden=true]')) return false;
    const d = e.closest('details:not([open])'); if (d && !e.closest('summary')) return false;   // (lo de dentro de un desplegable cerrado no se ve)
    for (let q = e; q && q !== document.body; q = q.parentElement) if (+st(q).opacity < 0.05) return false; return true; };
  const name = (e) => { const c = (typeof e.className === 'string' ? e.className : e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'); return (e.tagName.toLowerCase() + (c ? '.' + c : '')).slice(0, 34); };
  const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const hasText = (e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const all = [...root.querySelectorAll('*')].filter(e => !['SCRIPT', 'STYLE', 'CANVAS'].includes(e.tagName));
  const texts = all.filter(e => hasText(e) && vis(e));
  const R = { cortado: [], encima: [], verde: [], esquina: [], sobresale: [], espacio: [], letra: [], color: [] };
  // (tapado: lo que queda debajo de una capa opaca, como el HUD detrás de un panel, no se ve y no cuenta para «encima»
  // ni para «sobresale»; se mira qué hay encima en el centro de su primera línea, con todo tocable un momento)
  const pe = document.createElement('style'); pe.textContent = '*{pointer-events:auto!important}'; document.head.appendChild(pe);
  const opaque = (q) => { const s = st(q), m = s.backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return (m && (m[4] == null ? 1 : +m[4]) >= 0.55) || /gradient|url/.test(s.backgroundImage); };
  const hidden = new Set();
  for (const e of texts) { const rg = document.createRange(); rg.selectNodeContents(e); const q = rg.getClientRects()[0]; if (!q) continue;
    const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); if (!top || top === e || e.contains(top) || top.contains(e)) continue;
    for (let a = top; a && !a.contains(e); a = a.parentElement) if (opaque(a)) { hidden.add(e); break; } }
  pe.remove();
  // 1. texto cortado
  const clips = (q) => { const s = st(q); return (/(hidden|clip)/.test(s.overflowX) || /(hidden|clip)/.test(s.overflowY) || s.clipPath !== 'none') && !/(auto|scroll)/.test(s.overflowX + s.overflowY); };
  // (un texto plegado con su botón «Ver más» se puede abrir entero: no está cortado)
  const foldable = (e) => e.classList.contains('vm-clamp') && (e.nextElementSibling?.classList.contains('vm-btn') || !!e.querySelector(':scope > .vm-btn'));
  for (const e of texts) {
    const s = st(e); if (foldable(e)) continue;
    if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) { R.cortado.push(`${name(e)} «${txt(e)}» con puntos suspensivos`); continue; }
    if ((s.webkitLineClamp && s.webkitLineClamp !== 'none') && e.scrollHeight > e.clientHeight + 2) { R.cortado.push(`${name(e)} «${txt(e)}» recortado a ${s.webkitLineClamp} líneas`); continue; }
    // (lo que cuenta es el texto: no los brillos animados ni las sombras que también hacen crecer scrollWidth)
    if (/(hidden|clip)/.test(s.overflowX + s.overflowY)) { const rg0 = document.createRange(); rg0.selectNodeContents(e); const tr0 = rg0.getBoundingClientRect(), er = e.getBoundingClientRect();
      if (tr0.width && (tr0.left < er.left - 1 || tr0.right > er.right + 1 || tr0.top < er.top - 2 || tr0.bottom > er.bottom + 2)) { R.cortado.push(`${name(e)} «${txt(e)}» no cabe en su caja`); continue; } }
    // (recortado por una caja de más arriba: se mira el texto en sí, no la caja)
    const rg = document.createRange(); rg.selectNodeContents(e); const tr = rg.getBoundingClientRect(); if (!tr.width) continue;
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) {
      if (/(auto|scroll)/.test(st(q).overflowX + st(q).overflowY)) break;   // (dentro de algo que se desplaza: se ve al desplazar)
      if (!clips(q)) continue; const qr = q.getBoundingClientRect();
      if (tr.top < qr.top - 1 || tr.bottom > qr.bottom + 1 || tr.left < qr.left - 1 || tr.right > qr.right + 1) { R.cortado.push(`${name(e)} «${txt(e)}» lo corta ${name(q)} (${Math.round(Math.max(qr.top - tr.top, tr.bottom - qr.bottom, qr.left - tr.left, tr.right - qr.right))} px)`); break; }
    }
  }
  // 2. texto encima de figuras o de otro texto (los rectángulos de las líneas de texto, no la caja entera)
  // (de cada línea, la parte con letra: sin el aire de arriba y de abajo de la caja de la línea)
  const lineRects = (e) => { const out = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n);
    // (de un texto que se pliega o se recorta, solo las líneas que se ven: las de dentro de su caja)
    const box = /(hidden|clip)/.test(st(e).overflowX + st(e).overflowY) ? e.getBoundingClientRect() : null;
    // (y recortado por lo que lo contiene: lo que queda fuera de una franja que se desplaza o de una caja que recorta no se ve)
    let vb = { left: -1e9, top: -1e9, right: 1e9, bottom: 1e9 };
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { const s2 = st(q); if (/(hidden|clip|auto|scroll)/.test(s2.overflowX + s2.overflowY)) { const qr = q.getBoundingClientRect(); vb = { left: Math.max(vb.left, qr.left), top: Math.max(vb.top, qr.top), right: Math.min(vb.right, qr.right), bottom: Math.min(vb.bottom, qr.bottom) }; } }
    for (const r of rg.getClientRects()) if (r.width > 2 && (!box || r.bottom <= box.bottom + 1)) { const h = r.height * 0.18, L = Math.max(r.left, vb.left), Rr = Math.min(r.right, vb.right), T = Math.max(r.top + h, vb.top), B = Math.min(r.bottom - h, vb.bottom);
      if (Rr - L > 1 && B - T > 1) out.push({ left: L, right: Rr, top: T, bottom: B, width: Rr - L, height: B - T }); } } return out; };
  // (¿va sobre una placa? un fondo opaco o un degradado entre el texto y la figura: entonces se lee bien)
  const onPlate = (e, f) => { for (let q = e; q && !q.contains(f); q = q.parentElement) { const s = st(q), m = s.backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (m && (m[4] == null ? 1 : +m[4]) >= 0.55) return true; if (/gradient/.test(s.backgroundImage)) return true; } return false; };
  const inter = (a, c) => Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
  const figs = all.filter(e => (e.tagName === 'IMG' || e.tagName === 'svg') && vis(e)).filter(e => { const r = e.getBoundingClientRect(); return r.width >= 60 && r.height >= 60; });
  // (de una imagen con transparencia, solo cuenta lo pintado: se mira en un lienzo cuánta letra cae sobre píxeles opacos,
  // con su object-fit y object-position; si no se puede leer la imagen, cuenta su caja entera)
  const alphaCov = (img, rs) => { try {
    const r = img.getBoundingClientRect(), s = st(img), iw = img.naturalWidth, ih = img.naturalHeight; if (!iw || !ih) return null;
    let w = r.width, h = r.height, x = r.left, y = r.top; const fit = s.objectFit;
    if (fit === 'contain' || fit === 'cover' || fit === 'scale-down') { const k = (fit === 'cover' ? Math.max : Math.min)(r.width / iw, r.height / ih); w = iw * k; h = ih * k;
      const [px, py] = s.objectPosition.split(' ').map(v => /%$/.test(v) ? parseFloat(v) / 100 : 0.5); x = r.left + (r.width - w) * px; y = r.top + (r.height - h) * py; }
    const W = 96, H = Math.max(1, Math.round(96 * h / w)), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0, W, H); const d = c.getImageData(0, 0, W, H).data; let on = 0, n = 0;
    for (const q of rs) for (let yy = q.top; yy < q.bottom; yy += 2) for (let xx = q.left; xx < q.right; xx += 2) { n++; const u = Math.floor((xx - x) / w * W), v = Math.floor((yy - y) / h * H); if (u >= 0 && v >= 0 && u < W && v < H && d[(v * W + u) * 4 + 3] > 80) on++; }
    return n ? on / n : 0; } catch (e) { return null; } };
  const TL = texts.filter(e => !hidden.has(e)).map(e => ({ e, rs: lineRects(e) })).filter(x => x.rs.length);
  for (const { e, rs } of TL) {
    for (const f of figs) {
      if (f.contains(e) || e.contains(f) || onPlate(e, f)) continue;
      const fr = f.getBoundingClientRect(), a = rs.reduce((s, r) => s + inter(r, fr), 0), tot = rs.reduce((s, r) => s + r.width * r.height, 0);
      // (se cuenta la figura que va por encima o que queda detrás sin un fondo opaco entre medias: lo que se ve)
      if (a > tot * 0.15 && f.tagName === 'IMG') { const cov = alphaCov(f, rs); if (cov !== null && cov < 0.1) continue; }
      if (a > tot * 0.15) { R.encima.push(`${name(e)} «${txt(e)}» pisa la figura ${name(f)} (${Math.round(a / tot * 100)} %)`); break; }
    }
  }
  for (let i = 0; i < TL.length; i++) for (let j = i + 1; j < TL.length; j++) {
    const A = TL[i], B = TL[j]; if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
    let a = 0; for (const r of A.rs) for (const q of B.rs) a += inter(r, q);
    const m = Math.min(A.rs.reduce((s, r) => s + r.width * r.height, 0), B.rs.reduce((s, r) => s + r.width * r.height, 0));
    if (a > m * 0.08 && a > 20) R.encima.push(`${name(A.e)} «${txt(A.e)}» pisa el texto ${name(B.e)} «${txt(B.e)}»`);
  }
  // 3. verdes (tono de 75 a 170 grados, con color de verdad)
  const green = (c) => { const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); if (!m) return false; const [r, g, bb] = [m[1], m[2], m[3]].map(x => x / 255), al = m[4] == null ? 1 : +m[4]; if (al < 0.15) return false;
    const mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), l = (mx + mn) / 2, d = mx - mn; if (d < 0.12) return false; const sat = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - bb) / d) % 6 : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return h >= 75 && h <= 170 && sat > 0.25 && l > 0.12 && l < 0.88; };
  const seen = new Set();
  for (const e of all) { if (!vis(e) || e.closest('svg') && e.tagName !== 'svg') continue; const s = st(e);
    const cs = [['texto', hasText(e) ? s.color : ''], ['fondo', s.backgroundColor], ['borde', +parseFloat(s.borderTopWidth) ? s.borderTopColor : '']];
    for (const m of (s.backgroundImage.match(/rgba?\([^)]+\)/g) || [])) cs.push(['degradado', m]);
    for (const [k, c] of cs) if (c && green(c)) { const key = name(e) + k; if (seen.has(key)) continue; seen.add(key); R.verde.push(`${name(e)} ${k} ${c}${hasText(e) ? ` «${txt(e)}»` : ''}`); }
  }
  // 4. esquinas en ángulo con borde: el borde no sigue el corte
  for (const e of all) { if (!vis(e)) continue; const s = st(e); if (!/polygon/.test(s.clipPath)) continue;
    // (una sola línea, arriba o abajo, acaba donde acaba la caja y se ve bien; dos lados que se juntan en el corte, no)
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(s['border' + k + 'Width']) > 0 && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(s['border' + k + 'Color']));
    const bw = Math.max(0, ...sides.map(k => parseFloat(s['border' + k + 'Width'])));
    if (sides.length >= 2 && s.borderImageSource === 'none') R.esquina.push(`${name(e)} borde de ${bw} px con esquinas en ángulo` + (window.__auditDetail ? ` [${s.clipPath}] [${s.borderTopColor} ${s.borderLeftWidth}]` : '')); }

  // 5. texto que se sale de la forma de su caja: la caja pintada más cercana (fondo, borde o marco) y su forma de verdad
  const rgba = (c) => { const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
  const painted = (q) => { const s = st(q), bg = rgba(s.backgroundColor); if (bg && bg[3] >= 0.08) return true; if (s.backgroundImage !== 'none' || s.borderImageSource !== 'none') return true;
    // (una sola línea de borde es una raya divisoria, no una caja: hacen falta dos lados o más)
    return ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(s['border' + k + 'Width']) > 0 && (rgba(s['border' + k + 'Color']) || [0, 0, 0, 0])[3] > 0.1).length >= 2; };
  // (polígono del clip-path en px: admite «12px», «50%» y «calc(100% - 12px)»)
  const coord = (v, L) => { v = v.trim(); let m = v.match(/^calc\(([\d.]+)%\s*([-+])\s*([\d.]+)px\)$/); if (m) return L * m[1] / 100 + (m[2] === '-' ? -1 : 1) * m[3];
    m = v.match(/^([-\d.]+)%$/); if (m) return L * m[1] / 100; m = v.match(/^([-\d.]+)px$/); if (m) return +m[1]; return null; };
  const poly = (q, r) => { const m = st(q).clipPath.match(/^polygon\((.*)\)$/); if (!m) return null; const pts = [];
    for (const pr of m[1].split(/,(?![^(]*\))/)) { const xy = pr.trim().match(/^(calc\([^)]*\)|\S+)\s+(calc\([^)]*\)|\S+)$/); if (!xy) return null; const x = coord(xy[1], r.width), y = coord(xy[2], r.height); if (x == null || y == null) return null; pts.push([r.left + x, r.top + y]); } return pts; };
  const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const inside = (q, r, x, y, m) => { // (¿el punto x,y queda dentro de la forma de q, con m px de margen?)
    if (x < r.left - 0.5 || x > r.right + 0.5 || y < r.top - 0.5 || y > r.bottom + 0.5) return false;
    const P = poly(q, r); if (P) return inPoly(x, y, P);
    const s = st(q), rad = (k, d) => { const v = s['border' + k + 'Radius'].split(' ')[0]; return Math.min(/%$/.test(v) ? parseFloat(v) / 100 * d : parseFloat(v) || 0, d / 2); };
    for (const [k, cx, cy, sx, sy] of [['TopLeft', r.left, r.top, 1, 1], ['TopRight', r.right, r.top, -1, 1], ['BottomLeft', r.left, r.bottom, 1, -1], ['BottomRight', r.right, r.bottom, -1, -1]]) {
      const rx = rad(k, r.width), ry = rad(k, r.height); if (rx < 2 || ry < 2) continue; const ox = cx + sx * rx, oy = cy + sy * ry;
      if ((x - ox) * sx < 0 && (y - oy) * sy < 0 && ((x - ox) / (rx - m)) ** 2 + ((y - oy) / (ry - m)) ** 2 > 1) return false; }
    return true; };
  for (const e of texts) { if (hidden.has(e)) continue;
    let box = null; for (let q = e; q && q !== document.body && q !== root.parentElement; q = q.parentElement) { if (/(auto|scroll)/.test(st(q).overflowX + st(q).overflowY)) { box = null; break; } if (painted(q)) { box = q; break; } }
    if (!box) continue; const br = box.getBoundingClientRect(); if (br.width < 8 || br.height < 8) continue;
    let fuera = 0, dentro = 0;
    // (solo el texto propio de e: no el de lo que lleva dentro, como las opciones de un desplegable)
    const own = /(hidden|clip)/.test(st(e).overflowX + st(e).overflowY) ? e.getBoundingClientRect() : null;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n);
    for (const q of rg.getClientRects()) { if (q.width < 2 || (own && q.top >= own.bottom - 1)) continue; const h = q.height * 0.15;
      for (const [x, y] of [[q.left, q.top + h], [q.right, q.top + h], [q.left, q.bottom - h], [q.right, q.bottom - h]]) inside(box, br, x, y, 1) ? dentro++ : fuera++; } }
    // (todo fuera es un pie o una etiqueta junto a la caja, no un texto que se sale)
    if (fuera && dentro) R.sobresale.push(`${name(e)} «${txt(e)}» se sale de ${name(box)}`);
  }
  // 6. letra: escala y fuentes del juego
  const SCALE = [12, 14, 16, 20, 24], FONTS = /^["']?(Nunito|MZ Display|MZ Cond)["']?$/;
  // (las cartas de pelotari se escalan enteras, como una ilustración; el texto de un SVG, a la escala con que se dibuja)
  for (const e of texts) { if (e.closest('.gx-card')) continue; const s = st(e), sv = e.closest('svg'), fz = parseFloat(s.fontSize) * (sv?.getScreenCTM?.()?.a || 1), f0 = s.fontFamily.split(',')[0].trim();
    if (fz < 31.5 && !SCALE.some(v => Math.abs(v - fz) < 0.3)) R.letra.push(`${name(e)} «${txt(e)}» ${+fz.toFixed(1)} px`);
    if (!FONTS.test(f0)) R.letra.push(`${name(e)} «${txt(e)}» fuente ${f0}`);
    if (e.style.letterSpacing === '0') R.letra.push(`${name(e)} «${txt(e)}» con las letras juntadas para caber en su botón`); }
  // 7. color del texto: blancos y grises, y la gama del juego (lilas, morados y rosas, de 240 a 345 grados)
  const hsl = (c) => { const [r, g, bb] = c.slice(0, 3).map(x => x / 255), mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), l = (mx + mn) / 2, d = mx - mn; if (d < 0.001) return [0, 0, l];
    const sat = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - bb) / d) % 6 : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [h, sat, l]; };
  const cseen = new Set();
  for (const e of texts) { const c = rgba(st(e).color); if (!c || c[3] < 0.3) continue; const [h, sat, l] = hsl(c);
    if (sat < 0.3 || l > 0.9 || l < 0.12 || (h >= 240 && h <= 345)) continue; const k = name(e) + st(e).color; if (cseen.has(k)) continue; cseen.add(k);
    R.color.push(`${name(e)} «${txt(e)}» ${st(e).color} (${Math.round(h)}°)`); }
  // 8. espacios: de la línea base del rótulo a la altura de mayúscula del título, y de la del título a la del texto
  // (las medidas de cada fuente se toman del lienzo: subida, bajada y altura de la H)
  const cv = document.createElement('canvas').getContext('2d'), FM = {};
  const metr = (s) => { const k = s.fontWeight + ' ' + s.fontFamily; if (!FM[k]) { cv.font = `${s.fontWeight} 100px ${s.fontFamily}`; const t = cv.measureText('H'); FM[k] = { asc: t.fontBoundingBoxAscent / 100, desc: t.fontBoundingBoxDescent / 100, cap: t.actualBoundingBoxAscent / 100 }; } return FM[k]; };
  // (el rótulo de un botón o de un campo no es un título, ni una cifra sola)
  const role = (e) => { const s = st(e), fz = parseFloat(s.fontSize); if (e.closest('button,a.btn,[role=button],input,select,label,svg') || !/\p{L}{2}/u.test(e.textContent)) return 'otro'; if (s.textTransform === 'uppercase' && fz <= 14) return 'rótulo'; if (fz >= 20 || (/^H[1-4]$/.test(e.tagName) && fz >= 16)) return 'título'; return 'texto'; };
  // (solo las líneas del texto propio, no la caja de un icono que vaya al lado: su alto no es el de la letra)
  const blocks = texts.map(e => { const rs = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); rs.push(...[...rg.getClientRects()].filter(q => q.width > 2)); } if (!rs.length) return null;
    const s = st(e), m = metr(s), fz = parseFloat(s.fontSize), first = rs[0], last = rs[rs.length - 1];
    // (la caja de la línea mide subida + bajada; la línea base queda a «subida» de arriba)
    const k = (first.height) / (m.asc + m.desc) || fz;
    // (un rótulo con fondo o borde, como una etiqueta, se ve hasta el borde de su caja, no hasta la línea base)
    const base = painted(e) ? e.getBoundingClientRect().bottom : last.top + m.asc * k;
    const top = painted(e) ? e.getBoundingClientRect().top : first.top + m.asc * k - m.cap * k;
    return { e, role: role(e), top, base, left: Math.min(...rs.map(q => q.left)), right: Math.max(...rs.map(q => q.right)), box: (() => { for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) if (painted(q)) return q; return null; })() }; }).filter(Boolean);
  // (lo común: 10 px de rótulo a título y 12 px de título a texto, ±2; --t-mt y --t-mb de src/style.css)
  const want = { 'rótulo→título': [8, 12], 'título→texto': [10, 14] };
  for (const A of blocks) { if (A.role === 'texto' || A.role === 'otro') continue;
    // (el bloque que va justo debajo, en la misma columna y en la misma caja)
    let best = null; for (const B of blocks) { if (B === A || B.box !== A.box || A.e.contains(B.e) || B.e.contains(A.e)) continue; const ov = Math.min(A.right, B.right) - Math.max(A.left, B.left);
      if (ov < Math.min(A.right - A.left, B.right - B.left) * 0.5) continue; const g = B.top - A.base; if (g < -4 || g > 40) continue; if (!best || g < best.g) best = { B, g }; }
    if (!best) continue; const kind = `${A.role}→${best.B.role}`; const w = want[kind]; if (!w) continue; const g = Math.round(best.g);
    // (con window.__auditDetail, también los márgenes, interlineados y el hueco del contenedor, para corregirlo)
    const det = (e) => { const s = st(e), pa = st(e.parentElement); return `[${e.parentElement.className || e.parentElement.tagName}|${pa.display} gap ${pa.rowGap}] mt ${s.marginTop} mb ${s.marginBottom} lh ${s.lineHeight} fs ${s.fontSize} pt ${s.paddingTop} pb ${s.paddingBottom}`; };
    if (window.__auditTodo || g < w[0] || g > w[1]) R.espacio.push(`${kind} ${g} px: ${name(A.e)} «${txt(A.e).slice(0, 22)}» → ${name(best.B.e)} «${txt(best.B.e).slice(0, 22)}»` + (window.__auditDetail ? `\n        A ${det(A.e)}\n        B ${det(best.B.e)}` : '')); }
  for (const k of Object.keys(R)) R[k] = [...new Set(R[k])];
  return R;
};
