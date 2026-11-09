// La pelota de la pelota a mano, como las de verdad: cuero color crema, algo gastado y con su marca de tinta, y la costura
// en forma de ocho (como la de una pelota de béisbol, pero más apretada) cosida a mano con un hilo color tabaco. En 3D,
// para la cancha (y para la mano en primera persona, donde se ve de cerca): la esfera con el cuero pintado, el surco de la
// costura y cada puntada en relieve, cruzando el surco en uve. Y en dibujo (SVG), para los menús y el cestaño.
const CUERO = '#efe5cd', CUERO_OSCURO = '#cdbd99', HILO = '#b0874f', SURCO = '#7f6646', TINTA = '#2a2420';
// el color de la pelota para comprobar que se ve contra las paredes (fronton.js): el del cuero
export const COLOR_BOLA = CUERO;

// la costura sobre una esfera de radio 1: la curva del ocho (la de las pelotas de béisbol y de tenis), en t de 0 a 2π
const B = 0.27, K = 2 * Math.sqrt(B * (1 - B));
const curva = (t) => [(1 - B) * Math.cos(t) + B * Math.cos(3 * t), (1 - B) * Math.sin(t) - B * Math.sin(3 * t), K * Math.sin(2 * t)];

// el cuero pintado (equirectangular, como lo pide la esfera): manchas suaves de uso, alguna rozadura y una cruz de tinta
let cueroCanvas = null;
function cuero() {
  if (cueroCanvas) return cueroCanvas;
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = CUERO; g.fillRect(0, 0, W, H);
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // (el grano del cuero: muchas motas pequeñas, claras y oscuras)
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,96,60,0.07)' : 'rgba(255,252,240,0.09)'; const x = r() * W, y = r() * H, d = 0.6 + r() * 1.8; g.fillRect(x, y, d, d); }
  // (el uso: manchas grandes y difusas, más oscuras)
  for (let i = 0; i < 22; i++) { const x = r() * W, y = H * 0.15 + r() * H * 0.7, rr = 10 + r() * 34, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(150,125,85,${0.08 + r() * 0.12})`); gr.addColorStop(1, 'rgba(150,125,85,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // (rozaduras: rayitas finas, de los golpes contra la pared)
  g.strokeStyle = 'rgba(110,88,58,0.22)'; g.lineWidth = 0.8;
  for (let i = 0; i < 26; i++) { const x = r() * W, y = H * 0.2 + r() * H * 0.6, a = r() * Math.PI, l = 4 + r() * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  // (la marca de tinta del pelotari, una cruz pequeña, como en las de la foto de los frontones)
  g.strokeStyle = TINTA; g.lineWidth = 2.2; g.lineCap = 'round';
  const mx = W * 0.71, my = H * 0.46; g.beginPath(); g.moveTo(mx - 6, my); g.lineTo(mx + 6, my); g.moveTo(mx, my - 6); g.lineTo(mx, my + 6); g.stroke();
  cueroCanvas = c; return c;
}

/** La pelota en 3D, de radio R: { group, mat } (mat, el material del cuero, para el brillo cuando se puede golpear).
 *  M: la fábrica de materiales de quien la usa (la de la cancha guarda sus materiales para soltarlos al final) */
export function bolaMalla(THREE, R, M = (o) => new THREE.MeshStandardMaterial(o)) {
  const T = THREE, group = new T.Group();
  const tex = new T.CanvasTexture(cuero()); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const mat = M({ color: '#ffffff', map: tex, roughness: 0.62, metalness: 0, emissive: '#000000' });
  group.add(new T.Mesh(new T.SphereGeometry(R, 28, 18), mat));
  // el surco de la costura: un tubo fino y oscuro, a ras del cuero
  const pts = []; for (let i = 0; i < 160; i++) { const [x, y, z] = curva((i / 160) * Math.PI * 2); pts.push(new T.Vector3(x, y, z).multiplyScalar(R * 1.002)); }
  const via = new T.CatmullRomCurve3(pts, true);
  group.add(new T.Mesh(new T.TubeGeometry(via, 220, R * 0.026, 6, true), M({ color: SURCO, roughness: 0.85, metalness: 0 })));
  // las puntadas: cada una cruza el surco en diagonal y la siguiente al revés, como una uve (en una sola malla repetida)
  const N = 108, hilo = new T.InstancedMesh(new T.CapsuleGeometry(R * 0.018, R * 0.15, 2, 6), M({ color: HILO, roughness: 0.75, metalness: 0 }), N);
  const p = new T.Vector3(), tg = new T.Vector3(), nrm = new T.Vector3(), lado = new T.Vector3(), d = new T.Vector3(), m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), esc = new T.Vector3(1, 1, 1);
  for (let i = 0; i < N; i++) {
    const u = i / N; via.getPointAt(u, p); via.getTangentAt(u, tg);
    nrm.copy(p).normalize(); lado.crossVectors(tg, nrm).normalize();
    // (a través del surco, inclinada hacia delante o hacia atrás según toque; un poco por encima del cuero)
    const a = (i % 2 ? 1 : -1) * 0.5; d.copy(lado).multiplyScalar(Math.cos(a)).addScaledVector(tg, Math.sin(a)).normalize();
    q.setFromUnitVectors(up, d); p.addScaledVector(nrm, R * 0.012);
    hilo.setMatrixAt(i, m4.compose(p, q, esc));
  }
  hilo.instanceMatrix.needsUpdate = true; hilo.frustumCulled = false;
  group.add(hilo);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group, mat };
}

/** La pelota en dibujo (SVG, 32 × 32): el cuero con su sombra suave, la costura en ocho y sus puntadas. trazo: el color
 *  del aro de alrededor (la clase de pelota en el cestaño) o nada */
let nSvg = 0;
export function bolaSVG(trazo = '') {
  const id = 'bc' + (++nSvg);   // (cada dibujo con su degradado: si se quita uno de la página, los demás no se quedan sin él)
  // (la costura vista de frente: dos arcos que se miran, como en la pelota de verdad; las puntadas, rayitas que los cruzan)
  const arco = (s) => { let d = '', ticks = ''; for (let i = 0; i <= 14; i++) { const t = -1.15 + (i / 14) * 2.3, x = 16 + s * (9.6 - 4.4 * Math.cos(t)), y = 16 + 11 * Math.sin(t); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); if (i % 2 && i < 14) { const nx = Math.cos(t) * s, ny = 0.4 * Math.sin(t); ticks += `M${(x - nx * 1.6 - ny).toFixed(1)} ${(y - 1.1).toFixed(1)}L${(x + nx * 1.6 + ny).toFixed(1)} ${(y + 1.1).toFixed(1)}`; } } return [d, ticks]; };
  const [a1, t1] = arco(-1), [a2, t2] = arco(1);
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fbf5e6"/><stop offset=".7" stop-color="${CUERO}"/><stop offset="1" stop-color="${CUERO_OSCURO}"/></radialGradient></defs>`
    + `<circle cx="16" cy="16" r="13" fill="url(#${id})"${trazo ? ` stroke="${trazo}" stroke-width="2.5"` : ''}/>`
    + `<path d="${a1}${a2}" stroke="${SURCO}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
    + `<path d="${t1}${t2}" stroke="${HILO}" stroke-width="1" fill="none" stroke-linecap="round"/></svg>`;
}
