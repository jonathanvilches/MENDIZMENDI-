// Flora del pueblo para identificar: unos ejemplares de las plantas reales de su comarca (árboles, arbustos y flores de
// src/data/flora.js) repartidos por los alrededores, cerca de los caminos. Cada uno lleva encima una hoja flotante
// mientras no se ha identificado. Al acercarse: «¿Qué planta es?» con su imagen y tres nombres; después, su ficha. Si se
// acierta, pasa al herbario (las cartas 'flora:…' del perfil, que se ven en Naturaleza).
import * as THREE from 'three';
import { FLORA, floraOf } from '../data/flora.js';
import { floraModel, releaseFlora } from '../world/flora3d.js';
import { showFicha, identifyQuiz } from '../ui/ficha.js';
import { PLACES, pathQuery } from '../world/layout.js';
import { groundHeight, waterLevelAt, onPlatform } from '../world/heightfield.js';
import { isFree, addCircle } from '../world/colliders.js';
import { profile, saveProfile, addCard, addXP } from './profile.js';
import { mulberry32 } from '../util/math.js';

// la hoja que flota sobre una planta aún sin identificar (y la marca verde cuando ya está en el herbario)
function markerTexture(done) {
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  g.fillStyle = done ? 'rgba(143,209,106,.95)' : 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.strokeStyle = done ? '#2f6a1e' : '#3f8a2a'; g.stroke();
  if (done) { g.strokeStyle = '#1b3a10'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, 50); g.lineTo(43, 63); g.lineTo(67, 35); g.stroke(); }
  else {
    // hoja con su nervio
    g.fillStyle = '#4a9a2e'; g.beginPath(); g.moveTo(48, 20); g.bezierCurveTo(74, 30, 70, 64, 48, 76); g.bezierCurveTo(26, 64, 22, 30, 48, 20); g.fill();
    g.strokeStyle = '#e8f6d8'; g.lineWidth = 3; g.beginPath(); g.moveTo(48, 26); g.lineTo(48, 74); for (const y of [38, 50, 62]) { g.moveTo(48, y + 6); g.lineTo(38, y); g.moveTo(48, y + 6); g.lineTo(58, y); } g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class FloraSpots {
  constructor(game) {
    this.g = game; this.list = []; this.group = new THREE.Group(); game.scene.add(this.group);
    this.tex = [markerTexture(false), markerTexture(true)];
    this.mats = this.tex.map(t => new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
    this.build();
  }
  // qué plantas y dónde: unas pocas de la comarca (dos o tres árboles, dos o tres arbustos y tres flores), en sitios
  // libres y llanos alrededor del pueblo, separadas entre sí
  build() {
    const G = this.g, ids = floraOf(G.comarca), rnd = mulberry32(([...G.def.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0) || 1);
    if (!ids.length) return;
    const by = (k) => ids.filter(id => (k === 'tree' ? FLORA[id].m.t === 'tree' : k === 'flower' ? FLORA[id].m.t === 'flower' : FLORA[id].m.t !== 'tree' && FLORA[id].m.t !== 'flower')).sort(() => rnd() - 0.5);
    const pick = [...by('tree').slice(0, 3), ...by('shrub').slice(0, 3), ...by('flower').slice(0, 3)];
    const c = PLACES.plaza, used = [];
    for (const id of pick) {
      const big = FLORA[id].m.t === 'tree', clear = big ? FLORA[id].m.cw / 2 + 1.5 : 1.2;   // la copa entera, sin tocar casas ni muros
      let at = null;
      for (let k = 0; k < 80 && !at; k++) {
        const a = rnd() * Math.PI * 2, d = (big ? 38 : 22) + rnd() * (big ? 70 : 55), x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (!isFree(x, z, clear) || onPlatform(x, z, clear) || waterLevelAt(x, z) > groundHeight(x, z) - 0.1 || G.nearHouses?.(x, z, big ? 12 : 5)) continue;   // (ni en un frontón ni en la pista)
        const pq = pathQuery(x, z); if (pq.d < pq.w + (big ? 2.5 : 0.6)) continue;   // junto al camino, pero no en medio
        const h0 = groundHeight(x, z); if (Math.abs(groundHeight(x + 1.5, z) - h0) > 0.9 || Math.abs(groundHeight(x, z + 1.5) - h0) > 0.9) continue;
        if (used.some(u => Math.hypot(u.x - x, u.z - z) < 9)) continue;
        at = { x, z };
      }
      if (!at) continue;
      const o = floraModel(id, 1 + used.length); if (!o) continue;
      const y = groundHeight(at.x, at.z); o.position.set(at.x, y - 0.02, at.z); o.rotation.y = rnd() * Math.PI * 2; this.group.add(o);
      if (big) addCircle(at.x, at.z, FLORA[id].m.tr * 1.4 + 0.15, { tree: true });
      const top = (o.children[0].geometry.boundingBox?.max.y || 1) + 0.7;
      const mk = new THREE.Sprite(this.mats[this.known(id) ? 1 : 0]); mk.scale.setScalar(big ? 1.4 : 0.7); mk.position.set(at.x, y + Math.min(top, big ? 5 : 2), at.z); this.group.add(mk);
      used.push({ id, x: at.x, z: at.z, o, mk, y: mk.position.y, big, ph: rnd() * 6 });
    }
    this.list = used;
  }
  known(id) { return profile().cards.includes('flora:' + id); }
  interactables(out) {
    for (const s of this.list) out.push({ kind: 'flora', s, x: s.x, z: s.z, r: s.big ? 4.2 : 2.4, label: this.known(s.id) ? `Ver la ficha: ${FLORA[s.id].name.toLowerCase()}` : '¿Qué planta es? Identifícala' });
  }
  update(dt, P) {
    this.t = (this.t || 0) + dt;
    for (const s of this.list) {
      const d = Math.hypot(s.x - P.x, s.z - P.z), known = this.known(s.id);
      s.mk.visible = d < 55 && (!known || d < 14);
      if (s.mk.visible) { s.mk.position.y = s.y + Math.sin(this.t * 2 + s.ph) * 0.12; s.mk.material = this.mats[known ? 1 : 0]; }
    }
  }
  // identificar: tres nombres de plantas del mismo tipo (la buena y dos de otras partes de Navarra), y después la ficha
  async interact(s) {
    const G = this.g, F = FLORA[s.id], key = 'flora:' + s.id;
    G.player.frozen = true;
    try {
      if (this.known(s.id)) { await showFicha(key, { ui: G.ui, button: 'Seguir explorando' }); return; }
      const sameT = (id) => FLORA[id].m.t === F.m.t || (F.m.t !== 'tree' && F.m.t !== 'flower' && FLORA[id].m.t !== 'tree' && FLORA[id].m.t !== 'flower');
      const others = Object.keys(FLORA).filter(id => id !== s.id && sameT(id)).sort(() => G.rnd() - 0.5).slice(0, 2);
      const opts = [s.id, ...others].sort(() => G.rnd() - 0.5), right = opts.indexOf(s.id);
      const i = await identifyQuiz(key, opts.map(id => FLORA[id].name), { ui: G.ui, right });
      const ok = i === right;
      if (ok) { addCard(key); addXP(25); saveProfile(); G.particles?.emit({ x: s.x, y: s.y, z: s.z }, { n: 18, color: ['#8fd16a', '#ffffff'], speed: 1.4, size: 0.22 }); }
      await showFicha(key, { ui: G.ui, badge: ok ? 'Al herbario' : '', kicker: ok ? '¡Bien identificada!' : `No era ${FLORA[opts[i]]?.name.toLowerCase() || 'esa'}: así se reconoce`, button: ok ? '¡A por otra!' : 'Ahora ya la conoces' });
      if (ok) {
        const left = this.list.filter(x => !this.known(x.id)).length;
        G.ui.toast(left ? `Herbario: ${this.list.length - left} de ${this.list.length} plantas de aquí identificadas` : '¡Has identificado todas las plantas de este pueblo!', 'leaf', 2600);
      }
    } finally { G.player.frozen = false; }
  }
  dispose() {
    this.g.scene.remove(this.group);
    for (const m of this.mats) m.dispose(); for (const t of this.tex) t.dispose();
    releaseFlora();
  }
}
