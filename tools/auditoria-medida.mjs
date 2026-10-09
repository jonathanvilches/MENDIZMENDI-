// La medida de la auditoría de diseño (tools/auditoria-diseno.mjs y tools/auditoria-ventanas.mjs): se ejecuta dentro
// de la página con page.evaluate(auditar, selector) y devuelve { cortado, encima, verde, esquina } con lo que encuentra.
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
  const R = { cortado: [], encima: [], verde: [], esquina: [] };
  // 1. texto cortado
  const clips = (q) => { const s = st(q); return (/(hidden|clip)/.test(s.overflowX) || /(hidden|clip)/.test(s.overflowY) || s.clipPath !== 'none') && !/(auto|scroll)/.test(s.overflowX + s.overflowY); };
  for (const e of texts) {
    const s = st(e);
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
  const TL = texts.map(e => ({ e, rs: lineRects(e) })).filter(x => x.rs.length);
  for (const { e, rs } of TL) {
    for (const f of figs) {
      if (f.contains(e) || e.contains(f) || onPlate(e, f)) continue;
      const fr = f.getBoundingClientRect(), a = rs.reduce((s, r) => s + inter(r, fr), 0), tot = rs.reduce((s, r) => s + r.width * r.height, 0);
      // (se cuenta la figura que va por encima o que queda detrás sin un fondo opaco entre medias: lo que se ve)
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
    const bw = Math.max(...['Top', 'Right', 'Bottom', 'Left'].map(k => parseFloat(s['border' + k + 'Width']) || 0));
    if (bw > 0 && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.borderTopColor) && s.borderImageSource === 'none') R.esquina.push(`${name(e)} borde de ${bw} px con esquinas en ángulo` + (window.__auditDetail ? ` [${s.clipPath}] [${s.borderTopColor} ${s.borderLeftWidth}]` : '')); }
  for (const k of Object.keys(R)) R[k] = [...new Set(R[k])];
  return R;
};
