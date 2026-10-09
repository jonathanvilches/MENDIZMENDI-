// La medida de la auditoría de diseño (tools/auditoria-diseno.mjs, tools/auditoria-ventanas.mjs y
// tools/auditoria-partidos.mjs): se ejecuta dentro de la página con page.evaluate(auditar, selector) y devuelve
// { cortado, encima, verde, esquina, sobresale, espacio, letra, color } con lo que encuentra.
//   · sobresale: texto que se sale de la forma de su botón o de su caja (círculo, píldora, esquinas redondeadas o en ángulo)
//   · espacio: distancia de rótulo a título (10 px) y de título a texto (12 px) distinta de la común, ±2 px (de la línea
//     base de uno a lo alto de las mayúsculas del siguiente)
//   · letra: tamaño fuera de la escala (12 14 16 20 24 y de 32 en adelante) o fuente que no es del juego
//   · color: texto de un color fuera de la gama (blancos, lilas, morados y rosas)
//   · desborda: una caja (con fondo o borde) que se sale de la caja que la contiene
//   · estrecho: texto en una columna tan estrecha que va palabra a palabra, una por línea
//   · desplaza: una ventana o un bloque que hay que desplazar para verlo entero (solo vale si no se puede evitar)
//   · forma: caja con esquinas redondeadas de más de 8 px (la identidad: esquinas casi rectas, cortadas o círculos)
//   · boton: botón con letra de lectura (Nunito) en lugar de la de los botones (estrecha o de rótulos grandes)
//   · composicion: bloques y botones que van juntos con alturas, anchos, bordes o huecos distintos; cajas con más relleno
//     a un lado que al otro; rellenos y huecos fuera de la rejilla de 4 px; bordes que casi coinciden (de 2 a 12 px)
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
  const R = { cortado: [], encima: [], verde: [], esquina: [], sobresale: [], espacio: [], letra: [], color: [], desborda: [], estrecho: [], desplaza: [], forma: [], boton: [], composicion: [] };
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
    if (!best) continue;
    // (si entre los dos hay otra cosa con texto, como una fila de pestañas o de botones, no son título y texto seguidos)
    if (blocks.some(C => C !== A && C !== best.B && !A.e.contains(C.e) && !C.e.contains(A.e) && C.top > A.base - 1 && C.base < best.B.top + 1 && Math.min(A.right, C.right) > Math.max(A.left, C.left))) continue;
    // (ni si entre los dos, en el orden de la página, van unas pestañas: es la cabecera de un panel y su contenido)
    const after = (x, y) => !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
    if ([...root.querySelectorAll('[role=tablist], .tabs')].some(T => vis(T) && after(A.e, T) && after(T, best.B.e))) continue;
    const kind = `${A.role}→${best.B.role}`; const w = want[kind]; if (!w) continue; const g = Math.round(best.g);
    // (con window.__auditDetail, también los márgenes, interlineados y el hueco del contenedor, para corregirlo)
    const det = (e) => { const s = st(e), pa = st(e.parentElement); return `[${e.parentElement.className || e.parentElement.tagName}|${pa.display} gap ${pa.rowGap}] mt ${s.marginTop} mb ${s.marginBottom} lh ${s.lineHeight} fs ${s.fontSize} pt ${s.paddingTop} pb ${s.paddingBottom}`; };
    if (window.__auditTodo || g < w[0] || g > w[1]) R.espacio.push(`${kind} ${g} px: ${name(A.e)} «${txt(A.e).slice(0, 22)}» → ${name(best.B.e)} «${txt(best.B.e).slice(0, 22)}»` + (window.__auditDetail ? `\n        A ${det(A.e)}\n        B ${det(best.B.e)}` : '')); }

  // (la regla de las hojas de estilo que pone una propiedad a un elemento: la última que le aplica, para saber dónde tocar)
  const ruleOf = (e, prop) => { let last = '?'; const walk = (rules) => { for (const r of rules) { if (r.cssRules && !r.selectorText) { if (!r.media || matchMedia(r.media.mediaText).matches) walk(r.cssRules); continue; }
    if (r.style?.[prop] && r.selectorText) { try { if (e.matches(r.selectorText)) last = r.selectorText; } catch (x) { } } } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (x) { } } return last.slice(0, 80); };
  // 9. cajas que se salen de su caja: lo que va en el flujo (no lo colocado aparte a propósito, como una etiqueta en la esquina)
  for (const e of all) { if (!vis(e) || hidden.has(e) || e.closest('svg')) continue; const s = st(e);
    // (el retrato de quien habla asoma a propósito por encima del cuadro del diálogo, como un medallón)
    if (!painted(e) || /absolute|fixed|sticky/.test(s.position) || s.transform !== 'none' || e.closest('.gx-card') || e.matches('#dialog .face')) continue;
    let P = null; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { if (/(auto|scroll)/.test(st(q).overflowX + st(q).overflowY)) break; if (painted(q)) { P = q; break; } }
    if (!P) continue; const a = e.getBoundingClientRect(), b = P.getBoundingClientRect();
    const d = Math.max(b.left - a.left, a.right - b.right, b.top - a.top, a.bottom - b.bottom);
    if (d > 1.5) R.desborda.push(`${name(e)} «${txt(e).slice(0, 24)}» se sale de ${name(P)} (${Math.round(d)} px)`); }
  // 10. columnas tan estrechas que el texto va una palabra por línea
  for (const e of texts) { if (hidden.has(e)) continue; const words = (e.textContent || '').trim().split(/\s+/).filter(Boolean).length; if (words < 3) continue;
    const ys = new Set(); for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 2) ys.add(Math.round(q.top)); }
    if (ys.size >= 3 && words / ys.size < 1.6) R.estrecho.push(`${name(e)} «${txt(e).slice(0, 30)}» en ${ys.size} líneas de una palabra`); }
  // 11. lo que hay que desplazar para verlo entero (dentro de una ventana; la página del menú se desplaza por naturaleza)
  for (const e of all) { if (!vis(e) || e === root || e.matches('.hub-main, #hMain, .hub-main *:not(.mg-card, .mg-card *)')) continue; const s = st(e);
    if (!/(auto|scroll)/.test(s.overflowY)) continue; const d = e.scrollHeight - e.clientHeight; if (d > 4) R.desplaza.push(`${name(e)} esconde ${d} px que hay que desplazar`); }
  // 12. esquinas: casi rectas (hasta 8 px), cortadas o círculos
  // (los interruptores de sí o no van en su píldora, como en todos los juegos)
  for (const e of all) { if (!vis(e) || hidden.has(e) || e.closest('svg, .gx-card, [role=switch], .pel-switch') || !painted(e)) continue; const s = st(e), r = e.getBoundingClientRect();
    const rad = Math.max(...['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map(k => { const v = s['border' + k + 'Radius'].split(' ')[0]; return /%$/.test(v) ? parseFloat(v) / 100 * Math.min(r.width, r.height) : parseFloat(v) || 0; }));
    const circle = Math.abs(r.width - r.height) < 2 && rad >= r.width / 2 - 1;
    // (las barras y los puntos, de menos de 17 px de alto, van redondeados: es su forma)
    if (rad > 8.5 && !circle && r.height > 16 && s.clipPath === 'none') R.forma.push(`${name(e)}${hasText(e) ? ` «${txt(e).slice(0, 20)}»` : ''} con esquinas de ${Math.round(Math.min(rad, r.height / 2))} px` + (window.__auditDetail ? ` [${ruleOf(e, 'borderRadius')}]` : '')); }
  // 13. botones con letra de lectura: los botones van en la letra estrecha o en la de rótulos grandes; las respuestas
  // de un cuestionario y las del diálogo, que son frases para leer, en la de lectura
  // (una tarjeta entera que se toca, con su nombre y sus datos, no es un rótulo de botón: se mira solo el botón de una
  // sola etiqueta)
  const label = (b) => [b, ...b.querySelectorAll('*')].filter(x => hasText(x)).length === 1 && (b.textContent || '').trim().length <= 40;
  for (const e of texts) { if (hidden.has(e)) continue; const b = e.closest('button, .btn, [role=button], [role=tab]'); if (!b || !label(b) || b.closest('.choices, .opt, .opts, .fc-opts, .q-opts') || b.matches('.opt')) continue;
    const f0 = st(e).fontFamily.split(',')[0].replace(/["']/g, '').trim(); if (!/^MZ (Cond|Display)$/.test(f0)) R.boton.push(`${name(b)} «${txt(b).slice(0, 24)}» en ${f0}` + (window.__auditDetail ? ` [${ruleOf(e, 'fontFamily') + ' | ' + ruleOf(e, 'font')}]` : '')); }

  // 14. composición: lo que va junto, exacto. Los bloques (cajas con fondo o borde, botones) hermanos de una fila han de
  // tener la misma altura (si se estiran) o el mismo centro, y entre ellos el mismo hueco; los de una columna, el mismo
  // borde izquierdo y, si se estiran, el mismo ancho; una caja con bloques dentro, el mismo relleno arriba que abajo y a
  // la izquierda que a la derecha; y los rellenos y huecos, en la rejilla de 4 px (0, 1 y 2 px valen para filetes)
  const isBlock = (q) => vis(q) && !hidden.has(q) && !/absolute|fixed/.test(st(q).position) && (painted(q) || q.matches('button, .btn, [role=button]')) && q.getBoundingClientRect().width > 8;
  const px = (v) => parseFloat(v) || 0, grid = (v) => { v = Math.round(v * 100) / 100; return v <= 2 || Math.abs(v / 4 - Math.round(v / 4)) < 0.01; };
  const near = (a, b, t = 1) => Math.abs(a - b) <= t;
  for (const P of [root, ...root.querySelectorAll('*')]) { if (!vis(P) || hidden.has(P) || P.closest('svg, .gx-card')) continue; const ps = st(P);
    if (!/flex|grid/.test(ps.display) || /(auto|scroll)/.test(ps.overflowX + ps.overflowY)) continue;
    const kids = [...P.children].filter(isBlock); if (kids.length < 2) continue;
    // (en una rejilla, lo que ocupa varias filas, como un número al lado de un nombre y su barra, no se compara con
    // lo de una sola fila)
    const span = (k) => { const q = st(k); return /span\s*([2-9])/.test(q.gridRowStart + ' ' + q.gridRowEnd) || (+q.gridRowEnd - +q.gridRowStart > 1); };
    const scaledK = (k) => { const m = st(k).transform.match(/^matrix\(([^)]+)\)/); if (!m) return false; const v = m[1].split(',').map(Number); return Math.abs(v[1]) < 1e-6 && Math.abs(v[2]) < 1e-6 && (Math.abs(v[0] - 1) > 0.01 || Math.abs(v[3] - 1) > 0.01); };
    const R2 = kids.filter(k => (!/grid/.test(ps.display) || !span(k)) && !scaledK(k)).map(k => ({ k, r: k.getBoundingClientRect() }));
    // filas: los que se solapan en vertical más de la mitad
    const rows = []; for (const x of R2) { const row = rows.find(rw => { const a = rw[0].r; return Math.min(a.bottom, x.r.bottom) - Math.max(a.top, x.r.top) > Math.min(a.height, x.r.height) * 0.5; }); row ? row.push(x) : rows.push([x]); }
    const ai = ps.alignItems, colDir = /column/.test(ps.flexDirection) && /flex/.test(ps.display);
    for (const row of rows) { if (row.length < 2) continue; row.sort((a, b) => a.r.left - b.r.left);
      const hs = row.map(x => x.r.height), cs = row.map(x => x.r.top + x.r.height / 2), ts = row.map(x => x.r.top);
      const self = row.map(x => st(x.k).alignSelf);
      const stretch = /normal|stretch/.test(ai) && self.every(v => /auto|normal|stretch/.test(v));
      if (stretch && !hs.every(h => near(h, hs[0]))) R.composicion.push(`${name(P)}: fila de bloques de alturas distintas (${hs.map(Math.round).join(', ')} px)`);
      else if (/center/.test(ai) && !cs.every(c => near(c, cs[0], 1.5))) R.composicion.push(`${name(P)}: fila de bloques descentrados entre sí (${cs.map(c => Math.round(c - cs[0])).join(', ')} px)` + (window.__auditDetail ? ` [${row.map(x => name(x.k)).join(' + ')}]` : ''));
      else if (/start|baseline/.test(ai) && !ts.every(t => near(t, ts[0]))) R.composicion.push(`${name(P)}: fila de bloques que no empiezan a la misma altura`);
      // (los botones de una misma fila, del mismo alto aunque vayan centrados; no los redondos de solo icono, que son otra pieza)
      const bt = row.filter(x => x.k.matches('button, .btn, [role=button]') && !st(x.k).borderRadius.startsWith('50%') && (x.k.textContent || '').trim());
      if (bt.length > 1 && !bt.every(x => near(x.r.height, bt[0].r.height))) R.composicion.push(`${name(P)}: botones de una fila de alturas distintas (${bt.map(x => Math.round(x.r.height)).join(', ')} px)` + (window.__auditDetail ? ` [${bt.map(x => name(x.k)).join(' + ')}]` : ''));
      const gaps = row.slice(1).map((x, i) => x.r.left - row[i].r.right);
      if (gaps.length > 1 && !gaps.every(g => near(g, gaps[0]))) R.composicion.push(`${name(P)}: huecos distintos entre bloques de una fila (${gaps.map(Math.round).join(', ')} px)`);
    }
    // columnas: un bloque por fila, uno encima de otro
    if (rows.length >= 2 && rows.every(rw => rw.length === 1) && !colDir || (colDir && rows.length >= 2)) {
      const col = rows.map(rw => rw[0]).sort((a, b) => a.r.top - b.r.top);
      const ls = col.map(x => x.r.left), ws = col.map(x => x.r.width);
      const st2 = (/normal|stretch/.test(ai) || !colDir) && col.every(x => /auto|normal|stretch/.test(st(x.k).alignSelf)) && col.every(x => st(x.k).width === 'auto' || /%/.test(x.k.style.width));
      if (!/center/.test(ai) && !ls.every(l => near(l, ls[0]))) R.composicion.push(`${name(P)}: columna de bloques que no empiezan en el mismo borde (${ls.map(l => Math.round(l - ls[0])).join(', ')} px)`);
      if (st2 && /grid/.test(ps.display) === false && !ws.every(w => near(w, ws[0]))) R.composicion.push(`${name(P)}: columna de bloques de anchos distintos (${ws.map(Math.round).join(', ')} px)`);
      const vg = col.slice(1).map((x, i) => x.r.top - col[i].r.bottom);
      if (vg.length > 1 && !vg.every(g => near(g, vg[0]))) R.composicion.push(`${name(P)}: huecos distintos entre bloques de una columna (${vg.map(Math.round).join(', ')} px)`);
    }
    // la rejilla de los huecos
    for (const k of ['rowGap', 'columnGap']) { const v = px(ps[k]); if (v && !grid(v)) R.composicion.push(`${name(P)}: hueco de ${+v.toFixed(1)} px fuera de la rejilla de 4 px`); }
  }
  // cajas con bloques dentro: si su relleno es el mismo a los dos lados (lo que quiso quien la diseñó), lo que se ve ha de
  // serlo también; lo descuadran los márgenes de lo de dentro o un hijo que no llena el ancho. Se mide con las cajas de
  // los hijos (no con el texto, que acaba donde acaba la línea)
  for (const B of [root, ...root.querySelectorAll('*')]) { if (!vis(B) || hidden.has(B) || !painted(B) || B.closest('svg, .gx-card') || /^(TD|TH|TR|TABLE)$/.test(B.tagName)) continue; const bs = st(B);
    if (/(auto|scroll)/.test(bs.overflowY + bs.overflowX) || /inline/.test(bs.display) && !/inline-(flex|grid|block)/.test(bs.display)) continue;
    // (también los iconos, que van con aria-hidden: ocupan su sitio)
    const shown = (q) => { const r = q.getBoundingClientRect(), qs = st(q); return r.width > 0 && r.height > 0 && qs.visibility !== 'hidden' && qs.display !== 'none' && +qs.opacity > 0.05; };
    const kids = [...B.children].filter(q => shown(q) && !/absolute|fixed/.test(st(q).position) && !q.matches('script, style'));
    if (!kids.length || !kids.some(isBlock)) continue;
    // (de la cabecera de una ventana, sin fondo ni borde, cuenta lo que lleva dentro, no su caja)
    const extent = (q) => { if (!q.matches('header, [class*=head]') || painted(q) || q.matches('button, .btn, [role=button], img, svg, canvas, input, select, textarea') || hasText(q)) return [q.getBoundingClientRect()];
      const sub = [...q.children].filter(shown); return sub.length ? sub.flatMap(extent) : [q.getBoundingClientRect()]; };
    const rs = kids.flatMap(extent).filter(r => r.width > 0 && r.height > 0);
    for (const n of B.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width) rs.push(r); }
    if (!rs.length) continue;
    const br = B.getBoundingClientRect(), bl = px(bs.borderLeftWidth), brr = px(bs.borderRightWidth), bt = px(bs.borderTopWidth), bb = px(bs.borderBottomWidth);
    const U = { l: Math.min(...rs.map(r => r.left)), r: Math.max(...rs.map(r => r.right)), t: Math.min(...rs.map(r => r.top)), b: Math.max(...rs.map(r => r.bottom)) };
    const L = U.l - br.left - bl, Rr = br.right - brr - U.r, T = U.t - br.top - bt, Bo = br.bottom - bb - U.b;
    if (L < -1 || Rr < -1 || T < -1 || Bo < -1) continue;   // (lo que se sale ya lo dice «desborda»)
    // (no se mide la barra de progreso, que se llena a medias a propósito, ni la caja con algo puesto aparte a un lado, como
    // una flecha o una etiqueta; ni arriba y abajo la tarjeta con su foto pegada al borde de arriba)
    const deco = [...B.children].some(q => shown(q) && /absolute/.test(st(q).position) && q.getBoundingClientRect().width > 6);
    const cover = kids[0] && /^(IMG|PICTURE|CANVAS|FIGURE)$/.test(kids[0].tagName) || (kids[0] && st(kids[0]).backgroundImage.includes('url'));
    if (br.height <= 16 || deco) { /* (sin comparar a los lados) */ } else {
    const centeredH = /center/.test(bs.justifyContent) && !/column/.test(bs.flexDirection) || /center/.test(bs.alignItems) && /column/.test(bs.flexDirection);
    // (una fila alineada a la izquierda que acaba donde acaba lo de dentro deja aire a la derecha a propósito: no cuenta)
    const ragged = !centeredH && Math.abs(Rr - L) > 24;
    if ((near(px(bs.paddingLeft), px(bs.paddingRight), 0.5) || centeredH) && !ragged && !near(L, Rr, 1.5) && !/start|left|end|right/.test(bs.justifyItems + bs.justifyContent) && kids.some(q => !/start|end/.test(st(q).alignSelf + st(q).justifySelf)))
      R.composicion.push(`${name(B)}: relleno distinto a la izquierda y a la derecha (${Math.round(L)} y ${Math.round(Rr)} px)` + (window.__auditDetail ? ` [${ruleOf(B, 'padding')}]` : ''));
    const natural = (() => { const old = B.style.cssText; B.style.setProperty('height', 'auto', 'important'); B.style.setProperty('min-height', '0', 'important'); B.style.setProperty('flex', 'none', 'important'); B.style.setProperty('align-self', 'flex-start', 'important'); const h = B.getBoundingClientRect().height; B.style.cssText = old; return h; })();
    const centeredV = /center/.test(bs.alignItems) && !/column/.test(bs.flexDirection) && /flex/.test(bs.display) || /center/.test(bs.justifyContent) && /column/.test(bs.flexDirection) || /center/.test(bs.alignContent) && /grid/.test(bs.display);
    if (!(cover && T < 1) && (near(px(bs.paddingTop), px(bs.paddingBottom), 0.5) && near(natural, br.height, 1) || centeredV) && !near(T, Bo, 1.5))
      R.composicion.push(`${name(B)}: relleno distinto arriba y abajo (${Math.round(T)} y ${Math.round(Bo)} px)` + (window.__auditDetail ? ` [${ruleOf(B, 'padding')}]` : ''));
    }
    for (const k of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) { const v = px(bs[k]); if (v && !grid(v)) { R.composicion.push(`${name(B)}: relleno de ${+v.toFixed(1)} px fuera de la rejilla de 4 px`); break; } }
  }
  // 15. alineación: dentro de una misma caja (la caja pintada o el botón más cercano), lo que va uno encima de otro
  // empieza en el mismo borde, y lo que va uno al lado de otro con la misma altura, a la misma altura. Un borde que casi
  // coincide con otro (de 2 a 12 px) es un descuadre, no una decisión. Del texto cuenta donde empieza la letra, y solo si
  // va alineado a la izquierda; de las cajas, el borde de la caja (los dos lados)
  // (lo que va centrado en su fila o en su columna no se alinea por los bordes; y lo que crece un momento al pulsarlo o
  // al sonar, como un botón encendido, se mide sin ese aumento)
  const centeredIn = (q) => { const P = q.parentElement; if (!P) return false; const ps = st(P);
    return /flex/.test(ps.display) && (!/column/.test(ps.flexDirection) && /center|space-around|space-evenly/.test(ps.justifyContent) || /column/.test(ps.flexDirection) && /center/.test(ps.alignItems)) || /grid/.test(ps.display) && /center/.test(ps.justifyItems + st(q).justifySelf); };
  const holder = (q) => { for (let a = q.parentElement; a && a !== document.body; a = a.parentElement) if (a === root || painted(a) || a.matches('button, .btn, [role=button]') || /(auto|scroll)/.test(st(a).overflowX + st(a).overflowY)) return a; return document.body; };
  const groups = new Map();
  for (const q of root.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE'].includes(q.tagName) || q.closest('svg, .gx-card') || !vis(q) || hidden.has(q)) continue;
    // (una figura recortada, con fondo transparente, no enseña el borde de su caja: solo cuentan las fotos que la llenan)
    const pic = q.matches('img, picture, canvas') && (/cover|fill/.test(st(q).objectFit) || q.tagName === 'CANVAS');
    const blk = (painted(q) || q.matches('button, .btn, [role=button]') || pic) && !/inline$/.test(st(q).display), tx = !blk && hasText(q) && !/^inline$/.test(st(q).display);
    if (!blk && !tx) continue;
    const r0 = q.getBoundingClientRect(); if (r0.width < 16 || r0.height < 8) continue;
    // (una caja inclinada, como las barras y los botones en paralelogramo, se mide por su eje: sin las puntas)
    const mt = st(q).transform.match(/^matrix\(([^)]+)\)/), mv = mt ? mt[1].split(',').map(Number) : null, sk = mv && Math.abs(mv[1]) < 1e-6 && Math.abs(mv[2]) > 1e-6 ? Math.abs(mv[2]) * q.offsetHeight / 2 : 0;
    const r = { left: r0.left + sk, right: r0.right - sk, top: r0.top, bottom: r0.bottom, width: r0.width - 2 * sk, height: r0.height };
    let left = r.left;
    if (tx) { if (!/start|left/.test(st(q).textAlign) || /center/.test(st(q.parentElement).justifyContent + st(q.parentElement).alignItems) && /column/.test(st(q.parentElement).flexDirection)) continue;
      const rg = document.createRange(); rg.selectNodeContents(q); const lr = rg.getClientRects()[0]; if (!lr) continue; left = lr.left; }
    const h = holder(q); if (!groups.has(h)) groups.set(h, []);
    const sc = mv && Math.abs(mv[1]) < 1e-6 && Math.abs(mv[2]) < 1e-6 && (Math.abs(mv[0] - 1) > 0.01 || Math.abs(mv[3] - 1) > 0.01);
    groups.get(h).push({ q, blk, cen: centeredIn(q), scaled: sc, round: blk && st(q).borderRadius.startsWith('50%'), l: left, r: r.right, t: r.top, b: r.bottom, hgt: r.height, w: r.width });
  }
  const miss = (d) => d > 1.5 && d <= 12;
  // (de una fila de cosas, cuenta el borde de la primera, a la izquierda, y el de la última, a la derecha)
  // (las filas que se parten solas, como las de etiquetas, acaban donde acaban: su borde derecho no cuenta)
  const wraps = (q) => q.parentElement && /wrap/.test(st(q.parentElement).flexWrap) && !/nowrap/.test(st(q.parentElement).flexWrap);
  const beside = (a, c) => Math.min(a.b, c.b) - Math.max(a.t, c.t) > Math.min(a.hgt, c.hgt) * 0.3;
  for (const [h, m] of groups) { if (m.length < 2) continue; const out = new Set();
    // (lo que va de borde a borde de su caja, como una franja, no se alinea con lo de dentro: no cuenta)
    const hr = h.getBoundingClientRect(), hs = st(h), hl = hr.left + px(hs.borderLeftWidth), hrr = hr.right - px(hs.borderRightWidth);
    for (const a of m) { a.bleedL = a.blk && a.l <= hl + 1.5; a.bleedR = a.blk && a.r >= hrr - 1.5; }
    for (const a of m) { a.lead = !m.some(c => c !== a && !c.q.contains(a.q) && !a.q.contains(c.q) && c.r <= a.l + 1 && beside(a, c)); a.trail = !m.some(c => c !== a && !c.q.contains(a.q) && !a.q.contains(c.q) && c.l >= a.r - 1 && beside(a, c)); }
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) { const a = m[i], c = m[j];
      if (a.q.contains(c.q) || c.q.contains(a.q)) continue;
      const stacked = (a.b <= c.t + 1 || c.b <= a.t + 1) && Math.min(a.r, c.r) - Math.max(a.l, c.l) > 0;
      const side = (a.r <= c.l + 1 || c.r <= a.l + 1) && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 0;
      // (dos botones redondos uno encima del otro van centrados entre sí: cuenta su centro, no sus bordes)
      // (o alineados por un borde: también vale)
      if (a.round && c.round) { if (stacked && miss(Math.abs((a.l + a.r) / 2 - (c.l + c.r) / 2)) && Math.abs(a.l - c.l) > 1.5 && Math.abs(a.r - c.r) > 1.5) out.add(`${name(h)}: botones redondos casi centrados (${Math.round(Math.abs((a.l + a.r) / 2 - (c.l + c.r) / 2))} px de diferencia) [${name(a.q)} · ${name(c.q)}]`); continue; }
      if (a.cen || c.cen || a.scaled || c.scaled) continue;
      if (stacked && a.lead && c.lead && !a.bleedL && !c.bleedL && miss(Math.abs(a.l - c.l))) out.add(`${name(h)}: bordes izquierdos casi iguales (${Math.round(Math.abs(a.l - c.l))} px de diferencia) [${name(a.q)} · ${name(c.q)}]`);
      if (stacked && a.trail && c.trail && a.blk && c.blk && !a.bleedR && !c.bleedR && !wraps(a.q) && !wraps(c.q) && miss(Math.abs(a.r - c.r)) && a.w > 40 && c.w > 40) out.add(`${name(h)}: bordes derechos casi iguales (${Math.round(Math.abs(a.r - c.r))} px de diferencia) [${name(a.q)} · ${name(c.q)}]`);
      if (side && a.blk && c.blk && near(a.hgt, c.hgt) && miss(Math.abs(a.t - c.t))) out.add(`${name(h)}: cajas iguales a alturas casi iguales (${Math.round(Math.abs(a.t - c.t))} px de diferencia) [${name(a.q)} · ${name(c.q)}]`);
    }
    R.composicion.push(...out);
  }
  for (const k of Object.keys(R)) R[k] = [...new Set(R[k])];
  return R;
};
