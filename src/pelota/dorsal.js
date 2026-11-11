// El nombre de cada pelotari en la espalda de la camiseta, como en las retransmisiones: letras grandes de un blanco roto,
// sin filo (el borde negro hacía que pareciera una pegatina), con los bordes algo difuminados y una pizca de transparencia
// para que se note el color de la camiseta debajo, como estampadas; en una pieza algo curvada que va pegada al hueso del
// pecho del modelo, así sigue al cuerpo al correr, girarse y golpear. La espalda se busca en el propio modelo: los ojos
// dicen hacia dónde mira y, de los vértices a la altura del pecho y cerca del eje del cuerpo, el que más sale por detrás
// es la espalda. El ancho, según la distancia entre los hombros (vale para el pelotari, la pelotari y cualquier escala).
//   ponDorsal(rig, nombre) → la pieza (o null) · quitaDorsal(rig)
import * as THREE from 'three';

const FUENTE = '"Barlow Condensed", "Arial Narrow", sans-serif';
const ARRIBA = new THREE.Vector3(0, 1, 0);

// (el nombre que va en la camiseta: el de pila, sin el pueblo, en mayúsculas; «Tú» o «Zu» no se escriben)
export function nombreDorsal(n) {
  const s = String(n || '').replace(/\s*\([^)]*\)\s*$/, '').trim().split(/\s+/)[0] || '';
  return /^(tú|tu|zu|you|rival)$/i.test(s) ? '' : s.toLocaleUpperCase('es');
}

function textura(nombre) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const pinta = () => {
    const g = c.getContext('2d'); g.clearRect(0, 0, 512, 128);
    let px = 108; g.font = `800 ${px}px ${FUENTE}`;
    while (g.measureText(nombre).width > 470 && px > 40) { px -= 4; g.font = `800 ${px}px ${FUENTE}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.filter = 'blur(1.4px)'; g.fillStyle = '#e9e3d8'; g.fillText(nombre, 256, 68); g.filter = 'none';
    t.needsUpdate = true;
  };
  // (con la letra del juego en cuanto esté cargada; mientras, con la de repuesto)
  pinta(); try { document.fonts?.load?.(`800 80px ${FUENTE}`).then(pinta, () => {}); } catch (e) { /* sin fuentes */ }
  return t;
}

export function ponDorsal(rig, nombre) {
  const ch = rig?.char, txt = nombreDorsal(nombre); if (!ch || !txt) return null;
  quitaDorsal(rig);
  const B = ch.bones || {};
  const hueso = B.chest || B.mixamorigSpine2 || B.spine_02 || B.Spine2 || B.spine1 || B.mixamorigSpine1 || B.spine || B.mixamorigSpine;
  if (!hueso) return null;
  ch.root.updateMatrixWorld(true);
  const V = () => new THREE.Vector3(), cen = hueso.getWorldPosition(V());
  // hacia dónde mira: los ojos, delante de la cabeza; si no, la raíz del modelo mira hacia +z
  let fw = new THREE.Vector3(0, 0, 1).transformDirection(ch.root.matrixWorld);
  const head = ch.headBone || B.Head || B.head || B.mixamorigHead;
  if (ch.eyeBones?.length === 2 && head) {
    const e = ch.eyeBones[0].getWorldPosition(V()).add(ch.eyeBones[1].getWorldPosition(V())).multiplyScalar(0.5), d = e.sub(head.getWorldPosition(V()));
    d.y = 0; if (d.lengthSq() > 1e-8) fw = d;
  }
  fw.y = 0; if (fw.lengthSq() < 1e-8) fw.set(0, 0, 1); fw.normalize();
  const lado = new THREE.Vector3().crossVectors(ARRIBA, fw).normalize();
  // el ancho de hombros (la escala del cuerpo)
  const hI = B.upperarm_l || B.mixamorigLeftArm || B.upperarml, hD = B.upperarm_r || B.mixamorigRightArm || B.upperarmr;
  const hombros = hI && hD ? hI.getWorldPosition(V()).distanceTo(hD.getWorldPosition(V())) : 0.34;
  const K = hombros / 0.34;
  // la espalda: el vértice que más sale por detrás a la altura del pecho, cerca del eje del cuerpo
  let fondo = -1e9; const v = V(), rel = V();
  ch.root.traverse(o => {
    if (!o.isSkinnedMesh || !o.geometry?.attributes?.position || /hair|pelo/i.test(o.name)) return;
    const P = o.geometry.attributes.position, paso = Math.max(1, Math.floor(P.count / 6000));
    for (let i = 0; i < P.count; i += paso) {
      o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); rel.copy(v).sub(cen);
      if (Math.abs(rel.y) > 0.12 * K || Math.abs(rel.dot(lado)) > 0.07 * K) continue;
      fondo = Math.max(fondo, -rel.dot(fw));
    }
  });
  if (!(fondo > 0.03 * K && fondo < 0.4 * K)) fondo = 0.13 * K;   // (si no se encuentra, la de un cuerpo normal)
  // la pieza: algo curvada, abrazando la espalda (los bordes hacia delante)
  const w = hombros * 0.95, h = w / 4, R = Math.max(0.12, fondo * 1.7);
  const geo = new THREE.PlaneGeometry(w, h, 10, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -(x * x) / (2 * R)); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: textura(txt), transparent: true, opacity: 0.86, depthWrite: false, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(geo, mat); m.name = 'dorsal'; m.castShadow = false; m.userData.noShadow = true;
  // (a media espalda, por debajo de donde cae el pelo largo o la coleta; un poco por fuera de la camiseta y mirando hacia
  // atrás: se lee bien desde detrás. Más arriba, la coleta de las pelotaris lo tapaba)
  m.position.copy(cen).addScaledVector(fw, -(fondo + 0.018 * K)).addScaledVector(ARRIBA, -0.035 * K);
  m.quaternion.setFromAxisAngle(ARRIBA, Math.atan2(-fw.x, -fw.z));
  m.updateMatrixWorld(true); hueso.attach(m);   // (sin padre, su posición es la del mundo; attach la pasa al hueso sin moverla)
  return m;
}

export function quitaDorsal(rig) {
  const root = rig?.char?.root; if (!root) return;
  const fuera = []; root.traverse(o => { if (o.name === 'dorsal' && o.isMesh) fuera.push(o); });
  for (const m of fuera) { m.parent?.remove(m); m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); }
}
