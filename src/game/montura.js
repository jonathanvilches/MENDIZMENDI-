// Monturas: un caballo de Burguete (Aurizko zaldia, la raza grande del Pirineo navarro), una pottoka (el poni de monte
// del norte: a un adulto le queda pequeña, pero al explorador, que es un chaval, le va bien) o un burro. Cada jugador
// elige la suya (eligeMontura, en la mochila y en la pausa; 20 de noviembre de 2026, el autor: «en todas las partidas
// puedas tener tu propio caballo [...] una selección de caballos, al igual que la de perros») y le espera junto a la
// entrada del pueblo; si queda lejos, se la llama y viene trotando a tu lado. Con el botón de acción se monta y se baja. Se llevan como se anda: la palanca o las flechas, hacia donde
// se quiere ir, y la montura gira y coge paso sola (al paso con poco, al trote y al galope con la palanca a fondo o
// corriendo). No se meten en agua honda ni suben cuestas fuertes. Es el mismo trato que el tractor (game/conducir.js):
// mientras se va montado, quien mueve al jugador es la montura.
import * as THREE from 'three';
import { Animal } from '../actors/animals.js';
import { groundHeight, waterLevelAt, surfAt, bridgeAt } from '../world/heightfield.js';
import { resolve, removeMover } from '../world/colliders.js';
import { BOUNDARY } from '../world/layout.js';
import { damp, dampAngle } from '../util/math.js';

// paso y vmax, en m/s; r, el radio con el que choca; dist, la distancia de la cámara; silla, a qué altura va sentado
// (el lomo: 0,72 de la altura total en el caballo y 0,70 en el burro); escala, sobre la medida de la especie
// (actors/animalGlb.js: el burro de montar es de los grandes, 1,15 m a la cruz); saber, lo que cuenta la primera vez
export const MONTURAS = {
  burguete: { paso: 2.3, vmax: 9.6, giro: 4.6, r: 0.95, dist: 9.2, silla: 1.66, escala: 1, nombre: 'el caballo', subir: 'Montar el caballo', bajar: 'Bajar del caballo',
    saber: 'Es un caballo de Burguete, Aurizko zaldia en euskera: la raza grande y mansa del Pirineo navarro.' },
  pottoka: { paso: 2.1, vmax: 8.4, giro: 5, r: 0.72, dist: 8.2, silla: 1.12, escala: 1, nombre: 'la pottoka', subir: 'Montar la pottoka', bajar: 'Bajar de la pottoka',
    saber: 'La pottoka es el caballito de monte del norte de Navarra: vive casi libre en el Pirineo desde la prehistoria.' },
  burro: { paso: 1.8, vmax: 5.4, giro: 4, r: 0.7, dist: 8, silla: 1.13, escala: 1.15, nombre: 'el burro', subir: 'Montar el burro', bajar: 'Bajar del burro',
    saber: 'El burro, astoa en euskera, cargó durante siglos con la huerta y la leña de estos pueblos.' },
};
// (para la elección: el nombre de la ficha, su pelaje en dos tonos para el círculo de color y lo que se cuenta; fauna, su
// ficha del cuaderno de fauna, data/fauna.js)
export const MONTURA_FICHA = {
  burguete: { titulo: 'Caballo de Burguete', c: '#9a5a2c', p: '#d9b77a', fauna: 'caballo', texto: 'Grande, fuerte y manso: la raza de tiro del Pirineo navarro. El más rápido al galope.' },
  pottoka: { titulo: 'Pottoka', c: '#3b2418', p: '#5a3b28', fauna: 'pottoka', texto: 'El caballito de monte, peludo y ágil: gira en nada y sube bien por los caminos.' },
  burro: { titulo: 'Burro', c: '#8d8580', p: '#d9d2c8', fauna: 'burro', texto: 'Paciente y seguro: va despacio, pero no se cansa nunca.' },
};
/** «al caballo», «a la pottoka», «al burro» (para «Llamar a…») */
export const aLa = (nombre) => nombre.startsWith('el ') ? 'al ' + nombre.slice(3) : 'a ' + nombre;
/** La montura de este jugador: la que eligió o, si no eligió, la de siempre de la comarca (el burro en la Zona Media y la
 *  Ribera, el caballo de Burguete en la Montaña) */
export function tipoMontura(perfil, comarca) {
  if (MONTURAS[perfil?.montura]) return perfil.montura;
  return ['ribera', 'ribera-alta', 'zona-media', 'tierra-estella', 'valdizarbe-novenera', 'sanguesa', 'pamplona'].includes(comarca) ? 'burro' : 'burguete';
}
// (dónde pisa cada pata respecto al centro: adelante o atrás y a un lado; en el orden del paso: mano izquierda, pie
// derecho, mano derecha, pie izquierdo)
const PATAS = [[0.6, -0.16], [-0.55, 0.16], [0.6, 0.16], [-0.55, -0.16]];
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1), _q = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _ax = new THREE.Vector3();

export class Montura {
  constructor(game, tipo, x, z, heading = 0) {
    this.g = game; this.tipo = tipo; this.T = MONTURAS[tipo];
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    this.A = new Animal(tipo, x, z, { range: 0, flee: 0, scale: this.T.escala || 1, radius: this.T.r }, rnd, game.scene);
    this.A.heading = heading; this.A.state = 'idle'; this.A.sync();
    this.x = x; this.z = z; this.heading = heading; this.speed = 0;
  }
  get collider() { return this.A.collider; }
  sube(P) {
    if (this.P) return;
    const F = this.g.follow;
    this.P = P; P.vehiculo = this; P.speed = 0; P.ponModo?.('pie'); this.distAntes = F.targetDist; F.targetDist = this.T.dist; F.suaviza?.();   // (sin salto de cámara: parpadeaba)
    document.body.classList.add('conduce');
    if (P.collider) P.collider.ghost = true;
    if (P.blob) P.blob.visible = false;
    this.sienta(P);
    if (this.tipo !== 'burro' && this.g.sound?.relincho) this.g.sound.relincho(this.A.pos); else if (this.tipo === 'burro' && this.g.sound?.rebuzno) this.g.sound.rebuzno(this.A.pos); else this.g.sound?.ui?.('click');   // (el caballo relincha al montarlo y el burro rebuzna)
    this.relT = 60; this.relDesde = 0; this.kAntes = 0;
  }
  baja() {
    const P = this.P; if (!P) return null;
    const F = this.g.follow;
    if (this.sentado) { this.sentado.post = this.postAntes || null; this.sentado = null; }
    P.vehiculo = null; this.P = null; this.speed = 0; this.A.speed = 0; F.targetDist = this.distAntes ?? F.targetDist; document.body.classList.remove('conduce'); F.suaviza?.();
    const s = Math.sin(this.heading), c = Math.cos(this.heading);
    for (const k of [1, -1]) {
      const x = this.x + c * (this.T.r + 0.8) * k, z = this.z - s * (this.T.r + 0.8) * k, r = resolve(x, z, P.radius, P.collider);
      if (Math.hypot(r.x - x, r.z - z) < 0.3 || k === -1) { P.place(r.x, r.z, this.heading); break; }
    }
    if (P.collider) P.collider.ghost = false;
    P.obj.visible = true;
    return P;
  }
  // a horcajadas: muslos abiertos y adelante, rodillas dobladas y manos a las crines, encima de la animación de estar quieto
  sienta(P) {
    const c = P.rig?.char, B = {}; c?.root?.traverse(o => { if (o.isBone) B[o.name] = o; });
    if (!c || !B.mixamorigLeftUpLeg || !B.mixamorigHips) { this.sentado = null; return; }
    const gira = (b, eje, a) => { if (!b) return; _qc.identity(); for (let o = b; o && o !== c.root; o = o.parent) _qc.premultiply(o.quaternion); _ax.copy(eje).applyQuaternion(_qc.invert()); b.quaternion.multiply(_q.setFromAxisAngle(_ax, a)); };
    this.postAntes = c.post;
    c.post = () => { gira(B.mixamorigLeftUpLeg, X, -1.15); gira(B.mixamorigRightUpLeg, X, -1.15); gira(B.mixamorigLeftUpLeg, Z, 0.5); gira(B.mixamorigRightUpLeg, Z, -0.5); gira(B.mixamorigLeftLeg, X, 1.2); gira(B.mixamorigRightLeg, X, 1.2); gira(B.mixamorigLeftArm, X, -0.75); gira(B.mixamorigRightArm, X, -0.75); gira(B.mixamorigLeftForeArm, X, -0.4); gira(B.mixamorigRightForeArm, X, -0.4); };
    P.obj.position.set(0, 0, 0); P.obj.rotation.set(0, 0, 0); P.obj.updateMatrixWorld(true);
    this.alturaCadera = B.mixamorigHips.getWorldPosition(new THREE.Vector3()).y / Math.max(1e-3, P.obj.scale.y || 1);
    this.sentado = c;
  }
  update(dt, input, P, camYaw = this.g.follow?.yaw ?? 0) {
    const T = this.T, A = this.A;
    input.consume?.(' ');
    // como andando: hacia donde apunta la palanca, vista desde la cámara
    const f = input.move?.y || 0, s = input.move?.x || 0, sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const mx = -sin * f + cos * s, mz = -cos * f - sin * s, mag = Math.min(1, Math.hypot(mx, mz));
    const quiere = mag < 0.08 ? 0 : (input.run || mag > 0.92 ? T.vmax : mag > 0.5 ? T.vmax * 0.5 : T.paso) * (P.tired ? 0.8 : 1);
    this.speed = damp(this.speed, quiere, quiere > this.speed ? 1.6 : 3, dt);
    if (mag > 0.08) this.heading = dampAngle(this.heading, Math.atan2(mx, mz), T.giro / (1 + this.speed * 0.25), dt);
    let nx = this.x + Math.sin(this.heading) * this.speed * dt, nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const r = resolve(nx, nz, T.r, A.collider);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.02) this.speed *= 0.7;
    nx = r.x; nz = r.z;
    const r4 = Math.pow(nx ** 4 + nz ** 4, 0.25); if (r4 > BOUNDARY) { const k = BOUNDARY / r4; nx *= k; nz *= k; this.speed *= 0.5; }
    const gNew = groundHeight(nx, nz), gOld = groundHeight(this.x, this.z), m = Math.hypot(nx - this.x, nz - this.z);
    if (waterLevelAt(nx, nz) - gNew > 0.75 || (m > 1e-4 && (gNew - gOld) / m > 1.0)) { nx = this.x; nz = this.z; this.speed = 0; }
    this.x = nx; this.z = nz;
    A.pos.set(nx, groundHeight(nx, nz), nz); A.heading = this.heading; A.speed = this.speed; A.state = 'walk'; A.t += dt; A.animate(dt); A.sync();
    // (los cascos, al paso, al trote y al galope: la grabación del galope en bucle, audio.js; surf, el suelo que pisa,
    // para sus huellas; y parado, de vez en cuando, un resoplido del caballo)
    const W = this.g.rt?.weather, nieve = !!W?.nevado?.();
    if ((this.surfT = (this.surfT || 0) - dt) <= 0) { this.surfT = 0.15; const br = bridgeAt(nx, nz);
      this.surf = waterLevelAt(nx, nz) - A.pos.y > 0.12 ? 'water' : br ? (br.wood ? 'wood' : 'stone') : nieve ? 'snow' : surfAt('street', nx, nz) > 0.5 ? 'stone' : surfAt('dirt', nx, nz) > 0.5 ? 'dirt' : surfAt('forest', nx, nz) > 0.5 ? 'leaves' : 'grass'; }
    this.g.sound?.cascos?.(this.speed / T.vmax, this.surf, this.tipo);
    // (y en la nieve, sus huellas: una por casco, en el sitio de cada pata, en el orden en que pisan)
    if (nieve && this.speed > 0.3) {
      const e = T.escala || 1, paso = (this.speed > 6 ? 0.85 : this.speed > 3 ? 0.55 : 0.38) * e * (this.tipo === 'burro' ? 0.8 : 1);
      this.huellaD = (this.huellaD || 0) + this.speed * dt;
      while (this.huellaD > paso) {
        this.huellaD -= paso; this.huellaI = ((this.huellaI ?? -1) + 1) % 4;
        const [lon, lat] = PATAS[this.huellaI], k = this.tipo === 'burro' ? 0.72 : 1, sh = Math.sin(this.heading), ch = Math.cos(this.heading);
        const hx = nx + sh * lon * k * e + ch * lat * k * e, hz = nz + ch * lon * k * e - sh * lat * k * e;
        W.hoofprint({ x: hx, y: groundHeight(hx, hz), z: hz }, this.heading, k * e);
      }
    }
    if (this.tipo !== 'burro' && this.speed < 0.3 && (this.resT = (this.resT ?? 4) - dt) <= 0) { this.resT = 7 + Math.random() * 8; this.g.sound?.resoplido?.(A.pos); }
    // (y relincha de vez en cuando, para que se sienta vivo, pero no todo el rato: al arrancar a galopar si hace más de un
    // minuto del último, y por el camino cada minuto y medio o dos y medio. Antes, cada 22 a 42 s, era demasiado)
    // (el burro, igual pero con su rebuzno, y menos: cada dos o tres minutos por el camino)
    if (this.tipo === 'burro') { this.relT = (this.relT ?? 60) - dt; if (this.relT <= 0 && this.speed > 0.5) { this.relT = 120 + Math.random() * 60; this.g.sound?.rebuzno?.(A.pos); } }
    if (this.tipo !== 'burro') {
      const k = this.speed / T.vmax, arranca = k > 0.72 && (this.kAntes ?? 0) <= 0.72; this.kAntes = k;
      this.relT = (this.relT ?? 60) - dt; this.relDesde = (this.relDesde ?? 0) + dt;
      if ((arranca && this.relDesde > 60) || (this.relT <= 0 && this.speed > 0.5)) { this.relT = 90 + Math.random() * 60; this.relDesde = 0; this.g.sound?.relincho?.(A.pos); }
    }
    P.pos.set(nx, A.pos.y + 0.55, nz); P.heading = this.heading; P.speed = this.speed;
    if (P.collider) { P.collider.x = nx; P.collider.z = nz; }
    // el jinete, en su sitio sobre el lomo, con el vaivén del paso
    const bote = Math.abs(Math.sin(A.t * (2 + this.speed * 0.9))) * Math.min(0.07, this.speed * 0.012);
    if (this.sentado) { P.obj.position.set(nx, A.pos.y + T.silla - this.alturaCadera * (P.obj.scale.y || 1) + 0.06 + bote, nz); P.obj.rotation.set(0, this.heading, 0, 'YXZ'); P.rig.update(dt, 0, true, 0); }
    else { P.obj.position.set(nx, A.pos.y + T.silla - 0.7 + bote, nz); P.obj.rotation.set(0, this.heading, 0, 'YXZ'); P.rig.update(dt, 0, true, 0); }
    if (this.speed > 4 && (this.polvo = (this.polvo || 0) - dt) <= 0) { this.polvo = 0.2; this.g.particles?.emit({ x: nx, y: A.pos.y + 0.15, z: nz }, { n: 2, color: ['#c9b58c', '#b39d73'], speed: 0.6, size: 0.4, life: 0.7, gravity: -0.3, spread: 0.9 }); }
  }
  /** Suelta: quieta en su sitio, pastando; o, si la has llamado (viene), trotando hacia ti hasta quedarse a tu lado */
  quieta(dt, player) {
    if (this.P) return;
    const A = this.A, V = this.viene;
    if (V) {
      const P = player.pos, dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz);
      V.t -= dt;
      if (d < this.T.r + 1.6 || V.t <= 0) { this.viene = null; A.speed = 0; this.speed = 0; }
      else {
        const v = Math.min(this.T.vmax * 0.55, 1.2 + d * 0.5);
        this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 5, dt);
        let nx = this.x + Math.sin(this.heading) * v * dt, nz = this.z + Math.cos(this.heading) * v * dt;
        const r = resolve(nx, nz, this.T.r, A.collider); nx = r.x; nz = r.z;
        if (waterLevelAt(nx, nz) - groundHeight(nx, nz) > 0.75) { nx = this.x; nz = this.z; V.t = Math.min(V.t, 0.5); }
        this.x = nx; this.z = nz; A.pos.set(nx, groundHeight(nx, nz), nz); A.heading = this.heading; A.speed = v; A.state = 'walk'; A.t += dt; A.dist = d; A.animate(dt); A.sync();
        this.g.sound?.cascos?.(v / this.T.vmax, 'dirt', this.tipo);
        return;
      }
    }
    A.speed = 0; A.state = 'graze'; A.t += dt; A.dist = Math.hypot(this.x - player.pos.x, this.z - player.pos.z); A.animate(dt);
  }
  /** La pone en (x, z) mirando a heading, sin montar (al llamarla desde lejos, aparece cerca y llega trotando) */
  ponEn(x, z, heading = this.heading) {
    if (this.P) return;
    const A = this.A; this.x = x; this.z = z; this.heading = heading; this.speed = 0;
    A.pos.set(x, groundHeight(x, z), z); A.heading = heading; A.speed = 0; A.state = 'idle';
    if (A.collider) { A.collider.x = x; A.collider.z = z; }
    A.sync();
  }
  /** La llamas: si está lejos, aparece a unos 14 m (fuera de la vista de cerca) y viene trotando; si ya está cerca, viene */
  llama(player, libre) {
    if (this.P) return false;
    const P = player.pos, d = Math.hypot(P.x - this.x, P.z - this.z);
    if (d > 26) {
      // (detrás de ti, un poco a un lado: el primer sitio libre de cerca a lejos)
      const h = player.heading ?? 0;
      for (const r of [14, 10, 18, 7, 22]) for (const da of [0.5, -0.5, 1.1, -1.1, 0, 1.8, -1.8, Math.PI]) {
        const a = h + Math.PI + da, x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
        if (libre(x, z)) { this.ponEn(x, z, Math.atan2(P.x - x, P.z - z)); this.viene = { t: 14 }; return true; }
      }
      return false;
    }
    this.viene = { t: 14 }; return true;
  }
  dispose() { if (this.P) this.baja(); this.viene = null; this.A.obj.parent?.remove(this.A.obj); const i = this.A.collider; if (i) { i.ghost = true; removeMover(i); } }
}
