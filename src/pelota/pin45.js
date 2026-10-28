// El cartel del 4 y medio, como en los frontones y en el campeonato: una gota al revés, verde con el borde amarillo,
// y dentro un «4» grande en cursiva con el «½» pequeño a su derecha; la punta, hacia abajo, señala la raya del suelo.
// Son trazos propios (no letras de ninguna fuente). Solo en la pared del frontón: en los menús, no.
export const PIN45 = {
  w: 100, h: 180,
  verde: '#1d8f57', amarillo: '#f6c21c',
  gota: 'M50 172 L7.4 67.3 A46 46 0 1 1 92.6 67.3 Z',
  cuatro: 'M46 17 L22 60 L82 48 M47 27 L37 86',
  medio: 'M73 40 L77 24 L73 28 M70 63 Q75 56 80 60 Q82 64 77 68 L70 75 L81 74',
};

/** El cartel pintado en un lienzo de w × h (la textura de la pared): ocupa todo el alto, centrado; g engorda los trazos
 *  (en la pared, para que se lea desde lejos). */
export function pintaPin45(c, w, h, g = 1) {
  const P = PIN45, k = h / (P.h + 12);
  c.save(); c.translate(w / 2 - (P.w / 2) * k, 6 * k); c.scale(k, k);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const gota = new Path2D(P.gota);
  c.fillStyle = P.verde; c.fill(gota);
  c.strokeStyle = P.amarillo; c.lineJoin = 'miter'; c.miterLimit = 4; c.lineWidth = 7 * g; c.stroke(gota);
  c.lineJoin = 'round'; c.lineWidth = 9 * g; c.stroke(new Path2D(P.cuatro));
  c.lineWidth = 5 * g; c.stroke(new Path2D(P.medio));
  c.restore();
}
