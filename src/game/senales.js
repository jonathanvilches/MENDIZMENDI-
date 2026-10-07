// Señales del monte: las marcas pintadas de los senderos homologados (dos rayas = sigue, rayas dobladas =
// gira, X = camino equivocado) en blanco y en el color de la ruta: amarillo PR, rojo GR, verde SL.
// Postes en 3D junto a los mojones, dibujos para las tarjetas y consejos de orientación.
import * as THREE from 'three';

export const RUTA = { PR: '#f2c230', GR: '#d42f2f', SL: '#3ca05a' };

// dibujo de la marca (SVG) para las tarjetas
export function signSVG(kind, col = RUTA.PR) {
  const W = '#ffffff', st = 'stroke-width="13" stroke-linecap="butt" fill="none"';
  const body = kind === 'mal' ? `<path d="M22 22L78 78" stroke="${W}" ${st}/><path d="M78 22L22 78" stroke="${col}" ${st}/>`
    : kind === 'gira' ? `<path d="M18 40H64V82" stroke="${W}" ${st}/><path d="M18 58H46V82" stroke="${col}" ${st}/>`
    : `<path d="M16 40H84" stroke="${W}" ${st}/><path d="M16 60H84" stroke="${col}" ${st}/>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200"><rect x="4" y="4" width="92" height="92" rx="14" fill="#8a8378" stroke="#4a443c" stroke-width="4"/><rect x="10" y="10" width="80" height="80" rx="10" fill="#9c958a"/>${body}</svg>`);
}

// textura de la marca pintada sobre piedra
function signTexture(kind, col) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#9c958a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${60 + Math.random() * 80},${60 + Math.random() * 70},${50 + Math.random() * 60},.25)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 4, 2 + Math.random() * 3); }
  g.lineWidth = 16; g.lineCap = 'butt';
  const L = (pts, s) => { g.strokeStyle = s; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
  if (kind === 'mal') { L([[28, 28], [100, 100]], '#fff'); L([[100, 28], [28, 100]], col); }
  else if (kind === 'gira') { L([[22, 50], [82, 50], [82, 106]], '#fff'); L([[22, 74], [58, 74], [58, 106]], col); }
  else { L([[20, 50], [108, 50]], '#fff'); L([[20, 76], [108, 76]], col); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// roca con la marca pintada en su cara (como se pintan en el monte) sobre un poste bajo
export function makeTrailSign(kind, col = RUTA.PR) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), new THREE.MeshStandardMaterial({ color: '#9a9286', roughness: 0.95 }));
  rock.scale.set(1.1, 0.75, 0.8); rock.position.y = 0.35; rock.castShadow = true; g.add(rock);
  const tex = signTexture(kind, col);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.45, roughness: 0.85 }));
  face.position.set(0, 0.42, 0.47); face.rotation.x = -0.12; g.add(face);
  return g;
}

// consejos de montaña: uno en cada mojón y uno en la cima
export const ORIENTA = [
  { kind: 'sigue', title: 'Dos rayas: ¡sigue por aquí!', text: 'En los senderos se pintan marcas en piedras, árboles y postes. Dos rayas paralelas, blanca encima y de color debajo, quieren decir que vas bien. El color dice la ruta: amarillo es PR (ruta corta), rojo GR (gran recorrido) y verde SL (sendero local).' },
  { kind: 'mal', ask: true, title: 'Una X: ¡por ahí no!', text: 'Cuando el camino se divide, en el ramal que no es se pinta una X con los dos colores. Si la ves, vuelve atrás y busca las dos rayas.' },
  { kind: 'gira', title: 'Rayas dobladas: el camino gira', text: 'Si las rayas se doblan como una esquina, el sendero cambia de dirección hacia ese lado. Y donde no hay árboles ni rocas para pintar, se levantan mojones: montones de piedras que marcan el camino.' },
];
export const ORIENTA_TIPS = [
  'El sol sale por el este y se pone por el oeste. A mediodía está hacia el sur: tu sombra señala el norte.',
  'Mira atrás de vez en cuando: así reconocerás el camino de vuelta.',
  'Si llega la niebla o se hace tarde, no sigas: vuelve por donde has venido. La cima no se va a mover.',
  'Ve siempre acompañado, avisa en casa de a dónde vas y no dejes basura en el monte.',
];

// ---------------------------------------------------------------- señalización al pie del monte y en el camino
// tablilla de madera con la punta en flecha y la franja del color de la ruta (como los postes de los senderos de
// Navarra): el destino, la altitud y lo que se tarda o cuánto se sube
function boardTexture(lines, col, left) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  const wood = g.createLinearGradient(0, 0, 0, 128); wood.addColorStop(0, '#c99a62'); wood.addColorStop(1, '#a87a46');
  g.fillStyle = wood; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(90,55,25,${0.08 + Math.random() * 0.1})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); g.bezierCurveTo(170, y + (Math.random() - 0.5) * 14, 340, y + (Math.random() - 0.5) * 14, 512, y + (Math.random() - 0.5) * 8); g.stroke(); }
  // franja blanca y de color junto a la punta
  const x0 = left ? 18 : 440; g.fillStyle = '#ffffff'; g.fillRect(x0, 16, 22, 96); g.fillStyle = col; g.fillRect(x0 + 26, 16, 22, 96);
  g.fillStyle = '#2b1a0c'; g.textBaseline = 'middle'; g.textAlign = left ? 'left' : 'right';
  const tx = left ? 84 : 428;
  g.font = '800 46px Nunito, Arial, sans-serif'; g.fillText(lines[0], tx, lines[1] ? 46 : 64, 330);
  if (lines[1]) { g.font = '700 30px Nunito, Arial, sans-serif'; g.fillText(lines[1], tx, 94, 330); }
  g.strokeStyle = 'rgba(60,35,15,.6)'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function arrowBoard(lines, col, left) {
  // tabla con un extremo en punta (la flecha): forma extruida fina
  const W = 1.5, H = 0.34, P = 0.22, s = new THREE.Shape();
  if (left) { s.moveTo(-W / 2, 0); s.lineTo(-W / 2 + P, H / 2); s.lineTo(W / 2, H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(-W / 2 + P, -H / 2); }
  else { s.moveTo(-W / 2, H / 2); s.lineTo(W / 2 - P, H / 2); s.lineTo(W / 2, 0); s.lineTo(W / 2 - P, -H / 2); s.lineTo(-W / 2, -H / 2); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }); geo.translate(0, 0, -0.02);
  // las dos caras con el letrero (u, v de la forma), el canto de madera
  const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + W / 2) / W; uv.setXY(i, pos.getZ(i) < 0 ? 1 - u : u, (pos.getY(i) + H / 2) / H); }   // (por detrás, sin letras al revés)
  const tex = boardTexture(lines, col, left);
  const m = new THREE.Mesh(geo, [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: 0.9 })]);
  m.castShadow = true; m.userData.tex = tex; return m;
}
/** Poste indicador al empezar la subida: una tablilla hacia la cima y otra de vuelta al pueblo. */
export function makeSignpost({ peak, alt, info, town, col = RUTA.PR }) {
  const g = new THREE.Group(), woodM = new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 0.92 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), woodM); post.position.y = 1.3; post.castShadow = true; g.add(post);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.14, 4), woodM); cap.rotation.y = Math.PI / 4; cap.position.y = 2.67; g.add(cap);
  // la tablilla de la cima apunta a +Z del grupo (el grupo se gira hacia la cima); la del pueblo, al revés
  const up = arrowBoard([peak + (alt ? ` · ${alt} m` : ''), info], col, false); up.rotation.y = -Math.PI / 2; up.position.set(0, 2.25, 0.62); g.add(up);
  const back = arrowBoard([town, 'Vuelta al pueblo'], col, false); back.rotation.y = Math.PI / 2; back.position.set(0, 1.82, -0.62); g.add(back);
  // la placa del sendero (PR-NA) en el poste
  const c = document.createElement('canvas'); c.width = 128; c.height = 160; const q = c.getContext('2d');
  q.fillStyle = '#f6f1e2'; q.fillRect(0, 0, 128, 160); q.fillStyle = '#ffffff'; q.fillRect(14, 16, 100, 20); q.fillStyle = col; q.fillRect(14, 40, 100, 20);
  q.fillStyle = '#2b1a0c'; q.font = '900 34px Nunito, Arial, sans-serif'; q.textAlign = 'center'; q.fillText('PR-NA', 64, 104); q.font = '700 20px Nunito, Arial, sans-serif'; q.fillText('Sendero', 64, 138);
  const pt = new THREE.CanvasTexture(c); pt.colorSpace = THREE.SRGBColorSpace;
  for (const s of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.16), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.8 })); pl.position.set(s * 0.071, 1.3, 0); pl.rotation.y = s * Math.PI / 2; g.add(pl); }
  g.userData.dispose = () => g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => { m.map?.dispose(); m.dispose(); }); } });
  return g;
}
/** Balizas del sendero: estacas de madera con las dos franjas pintadas arriba, por instancias (una llamada de dibujo). */
export function makeBalizas(points, col = RUTA.PR) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#8a6238'; g.fillRect(0, 0, 32, 128); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(60,35,15,.25)'; g.fillRect(Math.random() * 32, 0, 1.5, 128); }
  g.fillStyle = '#ffffff'; g.fillRect(0, 8, 32, 14); g.fillStyle = col; g.fillRect(0, 26, 32, 14);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.BoxGeometry(0.1, 0.95, 0.1); geo.translate(0, 0.42, 0);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 }), points.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  points.forEach(([x, y, z, ry], i) => im.setMatrixAt(i, m4.compose(v.set(x, y, z), q.setFromEuler(e.set((Math.random() - 0.5) * 0.08, ry, (Math.random() - 0.5) * 0.08)), s)));
  im.castShadow = true; im.userData.dispose = () => { geo.dispose(); tex.dispose(); im.material.dispose(); };
  return im;
}

// consejos de montaña mientras se sube (uno cada rato, sin repetir)
export const MONTE_TIPS = [
  'Antes de salir, mira el parte del tiempo: en la montaña cambia muy deprisa.',
  'Bebe a sorbos y a menudo, aunque no tengas sed: en el monte se suda aunque haga fresco.',
  'Mejor botas de montaña que zapatillas: sujetan el tobillo y no resbalan en la piedra mojada.',
  'Vístete como una cebolla, por capas: camiseta, forro y chubasquero. Te quitas o te pones según el frío.',
  'Sube despacio y a paso constante. Si puedes hablar mientras caminas, vas a buen ritmo.',
  'En las bajadas, pasos cortos y las rodillas un poco dobladas. Ahí es donde más resbalones hay.',
  'No te salgas del sendero: proteges las plantas y no te pierdes.',
  'Deja las vallas y los portillos como los encontraste: el ganado pasta suelto en el monte.',
  'Si ves vacas, yeguas u ovejas, pasa despacio y sin gritar. Nunca te acerques a las crías.',
  'Si llega una tormenta, baja de la cima y aléjate de los árboles solitarios y de las crestas.',
  'Gorra, gafas de sol y crema: cuanto más alto, más quema el sol.',
  'Ten pensada la hora de vuelta y respétala, aunque no hayas llegado arriba.',
  'Si te pierdes o alguien se hace daño, llama al 112: es el teléfono de emergencias en toda Europa.',
  'No deshagas los mojones: esos montones de piedras guían a otros montañeros, sobre todo con niebla.',
  'No bebas de un arroyo si no sabes si el agua es buena: aguas arriba puede haber ganado.',
  'Lo que subes, lo bajas: la basura vuelve a casa contigo, también las pieles de fruta.',
  'Para descansar, busca un sitio a la sombra y fuera del camino, y abrígate un poco: al pararte, enfrías.',
  'Las balizas de madera con dos franjas, blanca y de color, también señalan el sendero cuando no hay rocas.',
];
