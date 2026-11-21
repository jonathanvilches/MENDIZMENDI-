// La posada del pueblo (ostatua): una casa cerca de la plaza con su letrero colgado de un hierro y un farol que se
// enciende de noche. Si se hace de noche haciendo las misiones, se puede dormir en ella hasta la mañana, en vez de pasar
// la noche dando vueltas (el autor, 20 de noviembre de 2026: «Si realizando las misiones se nos hace de noche, podemos
// buscar un hostal o una borda o una posada donde pasar la noche hasta el día siguiente»). De noche, en su puerta, la
// acción «Dormir en la posada hasta la mañana»: fundido, la mañana (las 7:45), la resistencia llena y un
// «buenos días». Al caer la noche avisa una vez, salvo si se está siguiendo una leyenda que solo se ve de noche. Sale en
// los postes indicadores del pueblo (townGame.carteles).
import * as THREE from 'three';
import { PLACES } from '../world/layout.js';
import { TOWN } from '../world/townBuilder.js';
import { groundHeight } from '../world/heightfield.js';
import { isFree } from '../world/colliders.js';
import { glowSprite } from './legendFx.js';

const MANANA = 7.75;

function letreroTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288; const g = c.getContext('2d');
  g.fillStyle = '#3b2617'; g.fillRect(0, 0, 512, 288);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + (i % 3) * 0.03})`; g.fillRect(0, i * 21, 512, 2); }   // (las vetas de la tabla)
  g.strokeStyle = '#d8b25a'; g.lineWidth = 8; g.strokeRect(12, 12, 488, 264);
  // la cama: cabecero, colchón, almohada y la colcha
  g.fillStyle = '#d8b25a'; g.fillRect(150, 60, 14, 92); g.fillRect(348, 108, 14, 44);
  g.fillStyle = '#f4e6c8'; g.fillRect(164, 112, 184, 26); g.fillStyle = '#c94a3a'; g.fillRect(220, 98, 128, 30);
  g.fillStyle = '#f4e6c8'; g.beginPath(); g.ellipse(194, 104, 26, 13, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f4e6c8'; g.textAlign = 'center'; g.font = '900 64px Georgia, serif'; g.fillText('OSTATUA', 256, 214);
  g.font = 'italic 700 34px Georgia, serif'; g.fillText('Posada', 256, 254);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** La casa de la posada: de las que tienen puerta, cerca de la plaza (12 a 70 m), lejos de la tienda y, entre ellas,
 *  la más cercana y grande. */
function casaPosada(game, casas) {
  const P0 = PLACES.plaza, T = game.tienda?.pos;
  let best = null, bs = Infinity;
  for (const h of casas || []) {
    if (!h.door || !(h.w > 0)) continue;
    const d = Math.hypot(h.door.x - P0.x, h.door.z - P0.z); if (d < 12 || d > 70) continue;
    if (T && Math.hypot(h.door.x - T.x, h.door.z - T.z) < 9) continue;
    if (!isFree(h.door.x, h.door.z, 0.7)) continue;
    const s = d - 0.12 * h.w * (h.d || h.w); if (s < bs) { bs = s; best = h; }
  }
  return best;
}

export class Posada {
  /** casas: las del pueblo (TOWN.houses); en Otsagabia, las suyas (VILLAGE.houses, game.js) */
  constructor(game, casas = TOWN.houses) {
    this.g = game; const h = this.casa = casaPosada(game, casas); if (!h) throw new Error('sin casa para la posada');
    this.door = { x: h.door.x, z: h.door.z };
    // el letrero, colgado de un hierro que sale de la fachada, a un lado de la puerta y de canto a la calle
    const fx = Math.sin(h.ry), fz = Math.cos(h.ry), sx = Math.cos(h.ry), sz = -Math.sin(h.ry), lado = Math.min(1.3, h.w * 0.3);
    const wx = h.x + fx * (h.d / 2) + sx * lado, wz = h.z + fz * (h.d / 2) + sz * lado, y = groundHeight(wx + fx * 0.5, wz + fz * 0.5) + 2.75;
    const G = this.obj = new THREE.Group(); G.position.set(wx, y, wz); G.rotation.y = h.ry; G.name = 'posada';
    const hierro = new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.6, metalness: 0.6 });
    const barra = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.05), hierro); barra.position.set(0, 0.06, 0.52); G.add(barra);
    const tirante = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.7), hierro); tirante.position.set(0, -0.2, 0.3); tirante.rotation.x = -0.75; G.add(tirante);
    const cara = new THREE.MeshStandardMaterial({ map: letreroTex(), roughness: 0.8 });   // (por las dos caras de la tabla)
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.88), [cara, cara, hierro, hierro, hierro, hierro]); tabla.position.set(0, -0.26, 0.58); G.add(tabla);
    for (const z of [0.2, 0.96]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.012), hierro); c.position.set(0, 0.02, z); G.add(c); }   // (las cadenillas)
    // el farol, junto a la puerta: de día apagado; de noche, su luz cálida (un brillo, sin luces nuevas en la escena)
    const farol = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.16), new THREE.MeshStandardMaterial({ color: '#ffd28a', emissive: '#ffb347', emissiveIntensity: 0, roughness: 0.4 }));
    farol.position.set(0, 0.0, 0.14); G.add(farol); this.farol = farol;
    this.brillo = glowSprite('#ffbf6a', 1.6, 0); this.brillo.position.set(0, 0.0, 0.2); G.add(this.brillo);
    G.traverse(o => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(G);
    this.noche = null; this.avisada = false;
  }
  get nombre() { return (this.g.def?.name || 'Otsagabia').split(' /')[0]; }
  /** ¿Es de noche? (en Otsagabia, game.js, no hay isNight: la misma cuenta que townLeyendas) */
  esNoche() { const g = this.g; if (g.isNight) return g.isNight(); const t = g.sky?.time ?? 12; return t > 20.4 || t < 6.1; }
  /** De noche, en su puerta, la acción de dormir. */
  interactable() { return this.esNoche() ? { kind: 'posada', x: this.door.x, z: this.door.z, r: 3.2, label: 'Dormir en la posada hasta la mañana' } : null; }
  update() {
    const g = this.g, noche = this.esNoche(), k = Math.min(1, (g.sky?.night ?? 0) * 1.4);
    this.farol.material.emissiveIntensity = k * 2.2; this.brillo.material.opacity = k * 0.85;
    // (al caer la noche, un aviso; no si se sigue una leyenda, que solo se ve de noche: townLeyendas, leyendaNoche)
    if (noche && this.noche === false && g.mode === 'play' && !g.leyendaNoche && !this.avisada) {
      this.avisada = true; g.ui.toast('Se ha hecho de noche. Si quieres, duerme en la posada hasta la mañana', 'moon', 4600);
    }
    if (!noche) this.avisada = false;
    this.noche = noche;
  }
  /** Dormir hasta la mañana: fundido, las 7:45, la resistencia llena y un «buenos días». */
  async dormir() {
    const g = this.g; if (this.durmiendo || g.mode !== 'play') return; this.durmiendo = true;
    try {
      g.player.frozen = true;
      await g.ui.fadeOut();
      g.sky.time = MANANA; this.noche = false;
      try { g.player.aguante = g.player.aguanteMax ?? 1; g.player.agotado = false; } catch (e) { /* nada */ }   // (descansado)
      await new Promise(r => setTimeout(r, 900));
      await g.ui.fadeIn();
      g.sound?.magic?.();
      g.ui.toast(`Buenos días. Has dormido en la posada de ${this.nombre}`, 'sun', 3800);
      g.save?.();
    } finally { g.player.frozen = false; this.durmiendo = false; }
  }
}
