// La plaza de toros de Pamplona para el final del encierro: muro redondo de ladrillo con zócalo y pilastras de
// piedra, la puerta por la que entra el encierro (un túnel bajo los tendidos), el ruedo de albero con su barrera
// roja, el callejón, los tendidos llenos de gente de blanco y rojo, la galería de arcos arriba y las banderas.
// Todo se mete en los mismos cubos de materiales que la calle (una llamada de dibujo por material).
import * as THREE from 'three';

export const RO = 34, RA = 22;   // radio exterior de la plaza y radio del ruedo (m)

/**
 * @param B   cubos de geometría por material (plaster, stone, wood, brick, plain)
 * @param colored, M4  ayudas de la escena del encierro
 * @param gate  z de la puerta (cara exterior del muro); el centro del ruedo queda en gate − RO
 * @param half  media anchura del túnel
 * @returns { cz, seats: [{x,y,z,ry}], flags: [{x,y,z,ry}], arches: [{x,y,z,ry}] }
 */
export function buildPlaza(B, colored, M4, gate, half, rnd) {
  const cz = gate - RO, seats = [], flags = [], arches = [];
  const at = (r, a, y = 0) => [Math.sin(a) * r, y, cz + Math.cos(a) * r];
  const open = (a, r) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < (half + 0.6) / r;   // hueco del túnel
  const N = 96, TOP = 15;
  // muro exterior: ladrillo, zócalo y cornisa de piedra, pilastras cada 4 tramos, ventanas y puertas
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * Math.PI * 2, sw = 2 * Math.PI * RO / N + 0.06, [x, , z] = at(RO, a), ry = a;
    const tunnel = open(a, RO), y0 = tunnel ? 5.2 : 0;
    B.brick.push(colored(new THREE.BoxGeometry(sw, TOP - y0, 1.2), '#c06848', M4(x, y0 + (TOP - y0) / 2, z, ry)));
    if (!tunnel) B.stone.push(colored(new THREE.BoxGeometry(sw, 1.4, 1.35), '#d8cdb4', M4(x, 0.7, z, ry)));
    B.stone.push(colored(new THREE.BoxGeometry(sw, 0.7, 1.6), '#e8dcc0', M4(x, TOP + 0.35, z, ry)));       // cornisa
    B.stone.push(colored(new THREE.BoxGeometry(sw, 0.35, 1.4), '#e8dcc0', M4(x, 8.2, z, ry)));             // imposta
    if (i % 4 === 0) { const [px, , pz] = at(RO + 0.2, a - Math.PI / N); B.stone.push(colored(new THREE.BoxGeometry(0.9, TOP, 0.5), '#e8dcc0', M4(px, TOP / 2, pz, ry))); }
    if (!tunnel) {
      const [wx, , wz] = at(RO + 0.62, a);
      B.stone.push(colored(new THREE.BoxGeometry(1.5, 2.5, 0.1), '#efe6d2', M4(wx, 11.4, wz, ry)));   // recerco de la ventana alta
      B.plain.push(colored(new THREE.BoxGeometry(1.1, 2.1, 0.12), '#2a1d16', M4(wx, 11.4, wz, ry)));
      if (i % 2) { B.stone.push(colored(new THREE.BoxGeometry(1.7, 3.2, 0.1), '#efe6d2', M4(wx, 3.0, wz, ry))); B.wood.push(colored(new THREE.BoxGeometry(1.3, 2.9, 0.12), '#7a2a1c', M4(wx, 2.9, wz, ry))); }   // puertas de los tendidos
    }
    if (i % 6 === 0) flags.push({ x: Math.sin(a) * (RO + 0.3), y: TOP + 2.2, z: cz + Math.cos(a) * (RO + 0.3), ry: a });
  }
  // la puerta del encierro: portada de piedra con frontón sobre el túnel
  const [gx, , gz] = at(RO + 0.75, 0);
  for (const s of [-1, 1]) B.stone.push(colored(new THREE.BoxGeometry(1.2, 6.2, 1.6), '#e8dcc0', M4(gx + s * (half + 0.9), 3.1, gz)));
  B.stone.push(colored(new THREE.BoxGeometry(2 * half + 3, 1.2, 1.7), '#e8dcc0', M4(gx, 5.8, gz)));
  B.stone.push(colored(new THREE.BoxGeometry(9, 0.5, 1.8), '#e8dcc0', M4(gx, 10.2, gz)));
  // túnel bajo los tendidos, de la puerta al ruedo
  const tl = RO - RA - 1.6, tz = gate - tl / 2;
  for (const s of [-1, 1]) B.plaster.push(colored(new THREE.BoxGeometry(0.5, 5.2, tl), '#efe6d2', M4(s * (half + 0.25), 2.6, tz)));
  B.stone.push(colored(new THREE.BoxGeometry(2 * half + 1, 0.6, tl), '#bdb6a8', M4(0, 5.0, tz)));
  // ruedo: barrera roja, callejón y contrabarrera
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * Math.PI * 2;
    if (open(a, RA)) continue;
    const sw = 2 * Math.PI * RA / N + 0.05, [x, , z] = at(RA, a);
    B.wood.push(colored(new THREE.BoxGeometry(sw, 1.4, 0.14), '#9a2020', M4(x, 0.7, z, a)));
    B.wood.push(colored(new THREE.BoxGeometry(sw, 0.1, 0.3), '#5a1a14', M4(x, 1.44, z, a)));
    if (i % 12 === 3) { const [bx, , bz] = at(RA - 0.6, a); B.wood.push(colored(new THREE.BoxGeometry(1.6, 1.4, 0.12), '#9a2020', M4(bx, 0.7, bz, a))); }   // burladero
    const [cx2, , cz2] = at(RA + 1.7, a);
    B.plaster.push(colored(new THREE.BoxGeometry(2 * Math.PI * (RA + 1.7) / N + 0.05, 2.0, 0.3), '#efe6d2', M4(cx2, 1.0, cz2, a)));
  }
  // tendidos: gradas de piedra en anillos; arriba, la galería de arcos y el tejado
  const ROWS = 14, step = (RO - RA - 3.4) / ROWS;
  let ytop = 2;
  for (let k = 0; k < ROWS; k++) {
    const r = RA + 1.9 + (k + 0.5) * step, y = 2.0 + (k + 1) * 0.55, n = Math.round(2 * Math.PI * r / 2.2);
    ytop = y;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * Math.PI * 2, [x, , z] = at(r, a), y0 = open(a, r) ? 5.3 : 0;
      if (y - y0 < 0.1) continue;
      B.stone.push(colored(new THREE.BoxGeometry(2 * Math.PI * r / n + 0.04, y - y0, step + 0.02), k % 2 ? '#c9c2b4' : '#bdb6a8', M4(x, y0 + (y - y0) / 2, z, a)));
    }
    // público sentado en la grada (algún hueco libre)
    const m = Math.round(2 * Math.PI * r / 0.95);
    for (let i = 0; i < m; i++) { if (rnd() < 0.12) continue; const a = (i + rnd() * 0.4) / m * Math.PI * 2, [x, , z] = at(r - step * 0.15, a); seats.push({ x, y, z, ry: a + Math.PI }); }
  }
  const rg = RO - 1.2, ng = 48;
  for (let i = 0; i < ng; i++) {
    const a = (i + 0.5) / ng * Math.PI * 2, [x, , z] = at(rg, a);
    arches.push({ x, y: ytop + 2.2, z, ry: a + Math.PI, w: 2 * Math.PI * rg / ng });
    const [rx, , rz] = at(RO - 1.6, a);
    B.wood.push(colored(new THREE.BoxGeometry(2 * Math.PI * (RO - 1.6) / ng + 0.1, 0.35, 3.6), '#8a4a32', M4(rx, ytop + 4.6, rz, a)));   // tejado de la galería
  }
  return { cz, seats, flags, arches, ytop };
}
