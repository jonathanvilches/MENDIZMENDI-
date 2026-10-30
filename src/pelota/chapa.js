// La chapa del sorteo del saque, en 3D, dentro del frontón (match.js tossChapa): una moneda grande con una cara azul y
// otra colorada, el canto dorado y estriado y, en cada cara, la pelota y su color en castellano y en euskera. Mientras se
// espera, gira de canto en la mano del juez enseñando las dos caras; al lanzarla sube dando vueltas, cae al suelo de la
// cancha, rebota un poco y se asienta con la cara que saca hacia arriba. La cámara la sigue de cerca (camara()).
// Todo en coordenadas de la cancha (el grupo del frontón): x a lo ancho, y arriba, z del frontis hacia el rebote.

const R = 0.17, H = 0.032;   // (la chapa, grande para que se lea: 34 cm; de verdad es una moneda)

// una cara: el color con su brillo, dos aros, la pelota en medio y el nombre del color arriba (castellano) y abajo (euskera)
function cara(T, col, es, eu) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const [claro, medio, oscuro] = col === 'azul' ? ['#b4abff', '#5b4bff', '#22167f'] : ['#ffb3d4', '#ff2e88', '#86093f'];
  // (la cara de abajo del cilindro tiene el «arriba» al revés que la de arriba: dibujada girada, las dos se leen derechas)
  if (col !== 'azul') { g.translate(S, S); g.rotate(Math.PI); }
  const fondo = g.createRadialGradient(S * 0.36, S * 0.3, S * 0.05, S / 2, S / 2, S * 0.52);
  fondo.addColorStop(0, claro); fondo.addColorStop(0.5, medio); fondo.addColorStop(1, oscuro);
  g.fillStyle = fondo; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  // (los aros: uno dorado al borde y otro fino, claro, por dentro)
  g.lineWidth = 22; g.strokeStyle = '#f2c94c'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 12, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 52, 0, Math.PI * 2); g.stroke();
  // (la pelota: blanca, con sus dos costuras curvas)
  const pr = S * 0.15;
  const bola = g.createRadialGradient(S / 2 - pr * 0.35, S / 2 - pr * 0.4, pr * 0.1, S / 2, S / 2, pr);
  bola.addColorStop(0, '#ffffff'); bola.addColorStop(1, '#d9d2c4');
  g.fillStyle = bola; g.beginPath(); g.arc(S / 2, S / 2, pr, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#a23a2c'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(S / 2 - pr * 1.25, S / 2, pr * 0.95, -0.75, 0.75); g.stroke();
  g.beginPath(); g.arc(S / 2 + pr * 1.25, S / 2, pr * 0.95, Math.PI - 0.75, Math.PI + 0.75); g.stroke();
  // (el nombre del color en arco: arriba de izquierda a derecha y abajo al revés, para leerse los dos derechos)
  const arco = (txt, rad, arriba) => {
    g.save(); g.translate(S / 2, S / 2); g.fillStyle = '#ffffff'; g.font = '900 54px "MZ Display", "Lilita One", Nunito, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 6;
    const letras = [...txt.toUpperCase()], paso = 0.15, a0 = -((letras.length - 1) * paso) / 2;
    letras.forEach((ch, i) => { g.save(); const a = a0 + i * paso; if (arriba) { g.rotate(a); g.translate(0, -rad); } else { g.rotate(-a); g.translate(0, rad); } g.fillText(ch, 0, 0); g.restore(); });
    g.restore();
  };
  arco(es, S * 0.335, true); arco(eu, S * 0.335, false);
  // (unas estrellitas a los lados, entre los dos nombres)
  g.fillStyle = '#f2c94c'; for (const x of [S * 0.16, S * 0.84]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 9 : 22; g.lineTo(x + Math.cos(a) * r, S / 2 + Math.sin(a) * r); } g.fill(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
// el canto: dorado, con sus estrías
function canto(T) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 16; const g = c.getContext('2d');
  for (let x = 0; x < 256; x += 4) { g.fillStyle = (x / 4) % 2 ? '#c9952e' : '#f6d469'; g.fillRect(x, 0, 4, 16); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.repeat.x = 6; return t;
}

export class Chapa3D {
  /** T: three; padre: el grupo del frontón; x, z: dónde la echa el juez; txt: { azul: [es, eu], rojo: [es, eu] } */
  constructor(T, padre, x, z, txt) {
    this.T = T; this.x = x; this.z = z; this.padre = padre;
    const tAz = cara(T, 'azul', ...txt.azul), tRo = cara(T, 'rojo', ...txt.rojo), tCa = canto(T);
    // (algo de luz propia: sin un entorno que reflejar, el metal salía casi negro)
    const M = (map, metal) => new T.MeshStandardMaterial({ map, metalness: metal, roughness: 0.35, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.28 });
    this.mats = [M(tCa, 0.75), M(tAz, 0.3), M(tRo, 0.3)]; this.texs = [tAz, tRo, tCa];
    const geo = new T.CylinderGeometry(R, R, H, 64, 1);
    this.mesh = new T.Mesh(geo, this.mats); this.mesh.name = 'chapa-sorteo'; this.mesh.castShadow = true;
    this.sombra = new T.Mesh(new T.CircleGeometry(R * 1.05, 32), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
    this.sombra.rotation.x = -Math.PI / 2; this.sombra.position.set(x, 0.012, z);
    this.grupo = new T.Group(); this.grupo.add(this.mesh, this.sombra); padre.add(this.grupo);
    this.estado = 'espera'; this.t = 0; this.y0 = 1.35; this.giroY = 0;
    // (hacia dónde mira la cámara al final, en el suelo: la chapa se asienta con el texto derecho para ella)
    this.giroLee = Math.atan2(0.8, -0.85);
    this.update(0);
  }
  /** La lanza: win, 'azul' o 'rojo' (la cara que queda arriba). Se cumple al quedarse quieta en el suelo; alSuelo, al tocarlo. */
  lanza(win, alSuelo) {
    this.win = win; this.estado = 'aire'; this.t = 0; this.alSuelo = alSuelo;
    this.vueltas = 6 + Math.floor(Math.random() * 2); this.giro0 = this.giroY;
    const P = Math.PI * 2; this.giroFin = this.giro0 + (((this.giroLee - this.giro0) % P) + P) % P;
    return new Promise(res => { this.listo = res; });
  }
  update(dt) {
    const m = this.mesh, T_AIRE = 1.5, TOPE = 2.5, SUELO = H / 2 + 0.012;
    this.t += dt;
    if (this.estado === 'espera') {
      // (de canto en la mano del juez, girando despacio: se ven las dos caras, con el texto derecho)
      this.giroY += dt * 1.6;
      m.position.set(this.x, this.y0 + Math.sin(this.t * 2.2) * 0.03, this.z); m.rotation.set(0, this.giroY, Math.PI / 2, 'YXZ');
    } else if (this.estado === 'aire') {
      // (sube y baja en parábola: del 1,35 de la mano al suelo, con el punto más alto en TOPE; da sus vueltas y frena al
      // final, para caer tumbada con la cara que toca hacia arriba y el texto derecho para la cámara)
      const k = Math.min(1, this.t / T_AIRE), sube = 0.42, y = k < sube ? this.y0 + (TOPE - this.y0) * (1 - (1 - k / sube) ** 2) : TOPE - (TOPE - SUELO) * ((k - sube) / (1 - sube)) ** 2;
      const fin = this.win === 'azul' ? 0 : Math.PI, gira = 1 - (1 - k) ** 3;
      m.position.set(this.x, y, this.z);
      m.rotation.set((Math.PI * 2 * this.vueltas + fin) * gira, this.giro0 + (this.giroFin - this.giro0) * gira, Math.PI / 2 * (1 - gira), 'YXZ');
      if (k >= 1) { this.estado = 'suelo'; this.t = 0; this.alSuelo?.(); }
    } else if (this.estado === 'suelo' || this.estado === 'quieta') {
      // (rebota un poco y se asienta bailando sobre su canto, cada vez menos)
      const s = this.t, bote = s < 0.28 ? Math.sin(s / 0.28 * Math.PI) * 0.07 : 0, baile = Math.exp(-s * 4.5) * 0.22;
      const fin = this.win === 'azul' ? 0 : Math.PI;
      m.position.set(this.x, SUELO + bote, this.z); m.rotation.set(fin + Math.sin(s * 22) * baile, this.giroFin, Math.cos(s * 22) * baile, 'YXZ');
      if (this.estado === 'suelo' && s > 0.9) { this.estado = 'quieta'; this.listo?.(); }
    }
    // (su sombra en el suelo: más pequeña y clara cuanto más alta va)
    const alto = Math.max(0, m.position.y - SUELO), f = 1 / (1 + alto * 0.9);
    this.sombra.scale.setScalar(f); this.sombra.material.opacity = 0.38 * f;
  }
  /** La cámara: [posición, mira], en coordenadas de la cancha. Cerca de la chapa, desde la contracancha, con la pared
   *  izquierda detrás; en el aire la sigue; en el suelo baja a verla de arriba, con la cara que ha salido */
  camara() {
    const p = this.mesh.position, x = this.x, z = this.z;
    if (this.estado === 'espera') return [[x + 1.35, 1.6, z + 1.3], [x, p.y, z]];
    if (this.estado === 'aire') { const k = Math.min(1, this.t / 1.5); return [[x + 1.6 + k * 0.1, 1.45 + 0.2 * Math.sin(k * Math.PI), z + 1.55 - k * 0.2], [x, Math.max(0.3, p.y * 0.85), z]]; }
    const s = Math.min(1, this.t / 0.8), e = 1 - (1 - s) ** 3;   // (en el suelo, se acerca y la mira desde arriba)
    return [[x + 1.7 - e * 0.85, 1.4 - e * 0.35, z + 1.35 - e * 0.55], [x, 0.03 + (1 - e) * 0.2, z]];
  }
  dispose() {
    this.padre.remove(this.grupo); this.mesh.geometry.dispose(); this.sombra.geometry.dispose(); this.sombra.material.dispose();
    for (const m of this.mats) m.dispose(); for (const t of this.texs) t.dispose();
  }
}
