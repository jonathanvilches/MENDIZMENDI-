// Los clics fantasma del móvil. Tras un toque, el navegador manda además un «clic» en el mismo sitio. Si al levantar el
// dedo cambia la pantalla (el toque en «Sí, salir» cierra el partido y aparece el menú de la pelota), ese clic cae en lo
// que ha aparecido debajo del dedo: abría solo el Campeonato de Parejas, o empezaba el partido siguiente sin querer.
// Aquí, el clic que sigue a un toque y no cae en lo que se tocó (porque ya no está o es otra cosa) no llega a nadie. Vale
// hasta el toque siguiente, sin plazo: si al levantar el dedo se desmonta un frontón, el clic llega tarde. Con el ratón y
// el teclado, nada cambia.
// (se compara el botón o el enlace tocado, no el trozo exacto: un botón que cambia su texto al tocarlo sigue valiendo)
const SEL = 'button, a, label, input, select, textarea, summary, [role], [tabindex], [data-a]';
const cosa = (n) => (n instanceof Element ? n : n?.parentElement)?.closest?.(SEL) || n;
let up = null;
addEventListener('pointerdown', () => { up = null; }, true);
addEventListener('pointerup', (e) => { up = e.pointerType === 'touch' || e.pointerType === 'pen' ? cosa(e.target) : null; }, true);
addEventListener('click', (e) => {
  if (!up || !e.detail) return;
  const t = e.target, c = cosa(t), mismo = up.isConnected && t instanceof Node && (up === c || up.contains(t) || t.contains(up));
  up = null;
  if (!mismo) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
