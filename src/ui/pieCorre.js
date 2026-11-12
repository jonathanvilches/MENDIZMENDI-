// El pie de las fichas («Seguir» y compañía) se queda pegado abajo cuando la columna se desplaza. Solo entonces lleva su
// velo para que el texto no asome detrás del botón; si todo cabe, el pie va sin fondo, sin banda oscura detrás.
export function pieCorre(o) {
  const m = o?.querySelector?.('.mg-card.ix > .ix-main'); if (!m) return;
  const mira = () => m.classList.toggle('corre', m.scrollHeight > m.clientHeight + 2);
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(mira); ro.observe(m); for (const h of m.children) ro.observe(h); }
  m.addEventListener('click', () => requestAnimationFrame(mira));
  requestAnimationFrame(mira);
}
