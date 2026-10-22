// Palabras enteras: lo que las otras medidas no ven. Se ejecuta en la página (p.evaluate(PALABRAS, selector)) y anota:
//  · palabra partida: una palabra que empieza en una línea y acaba en la siguiente (overflow-wrap: anywhere, break-word);
//    partir por un guion, una barra o un espacio no cuenta
//  · con puntos: un texto que no cabe y se corta con «…» (text-overflow: ellipsis)
//  · líneas cortadas: un párrafo que se queda en N líneas (line-clamp) sin botón de «Ver más»
//  · acaba en «…»: un nombre o un botón acortado a mano en el código (una palabra pegada a los puntos al final; en un
//    párrafo largo, los puntos son del cuento)
// Lo que se toca de un botón tiene que leerse entero; si no cabe, el arreglo es un icono o un nombre más corto.
export const PALABRAS = (sel) => {
  const issues = [], seen = new Set();
  const shown = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity >= 0.05; };
  const vis = (e) => { if (!shown(e)) return false; if (e.closest('details:not([open])') && !e.closest('summary')) return false;
    const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return false; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) if (!shown(q)) return false; return true; };
  const name = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + (e.id ? '#' + e.id : '') + ' «' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '»';
  const add = (k, e, x = '') => { const key = k + name(e) + x; if (seen.has(key)) return; seen.add(key); issues.push([k, name(e), x]); };
  const roots = [...document.querySelectorAll(sel)].filter(vis);
  for (const R of roots) for (const e of [R, ...R.querySelectorAll('*')]) {
    if (/^(svg|path|g|text|tspan|canvas|select|option|script|style)$/i.test(e.tagName) || e.closest('svg') || !vis(e)) continue;
    const s = getComputedStyle(e);
    if (s.textOverflow === 'ellipsis' && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1) add('con puntos', e, `${e.scrollWidth}>${e.clientWidth}`);
    if (s.webkitLineClamp && s.webkitLineClamp !== 'none' && !e.classList.contains('vm-clamp') && e.scrollHeight > e.clientHeight + 2) add('líneas cortadas', e, `${e.scrollHeight}>${e.clientHeight}`);
    for (const n of e.childNodes) {
      if (n.nodeType !== 3) continue; const v = n.nodeValue; if (!v.trim()) continue;
      if (/[\p{L}\d]…\s*$/u.test(v) && !/\p{L}(ando|endo|tzen|ten)…\s*$/u.test(v) && (e.textContent.trim().length < 60 || e.closest('button, [role=button]'))) add('acaba en …', e, v.trim().slice(-24));   // («Cargando…», «Konektatzen…»: algo que está pasando, no un corte)
      for (const m of v.matchAll(/[^\s\-‐–—/·]{2,}/gu)) {
        const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const tops = [...rg.getClientRects()].filter(q => q.width > 0.5).map(q => Math.round(q.top));
        if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 3) { add('palabra partida', e, m[0]); break; }
      }
    }
  }
  return issues;
};
