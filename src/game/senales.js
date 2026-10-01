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
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), new THREE.MeshStandardMaterial({ color: '#8f887d', roughness: 0.95, flatShading: true }));
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
