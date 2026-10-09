// Rótulos dentro de los botones redondos (fútbol y pelota): el texto no puede salirse nunca del círculo. Se mide el texto
// de verdad (las cuatro esquinas de cada línea, sin el aire de arriba y de abajo) contra el círculo, con un margen; si no
// cabe, primero se parte en dos líneas y, si aún no cabe, se juntan las letras (sin bajar nunca de su tamaño: los botones
// se miden para que no haga falta, y tools/auditoria-partidos.mjs lo comprueba). Se vuelve a mirar al cambiar el rótulo y
// al girar o cambiar el tamaño de la pantalla.
//   fitCircle(boton)   fitCircles(contenedor)
const fits = (btn, sp) => {
  const b = btn.getBoundingClientRect(); if (!b.width) return true;
  const r = Math.min(b.width, b.height) / 2 - 3, cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const rg = document.createRange(); rg.selectNodeContents(sp);
  for (const q of rg.getClientRects()) {
    const h = q.height * 0.15;
    for (const [x, y] of [[q.left, q.top + h], [q.right, q.top + h], [q.left, q.bottom - h], [q.right, q.bottom - h]]) if (Math.hypot(x - cx, y - cy) > r) return false;
  }
  return true;
};
export function fitCircle(btn) {
  const sp = btn?.querySelector('span'); if (!sp || !btn.isConnected) return;
  sp.style.maxWidth = ''; sp.style.letterSpacing = '';
  if (fits(btn, sp)) return;
  sp.style.maxWidth = '60%'; if (fits(btn, sp)) return;
  sp.style.letterSpacing = '0';
}
export function fitCircles(root) {
  if (!root) return;
  requestAnimationFrame(() => { for (const b of root.querySelectorAll('button')) if (getComputedStyle(b).borderRadius.startsWith('50%')) fitCircle(b); });
}
