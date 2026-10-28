// El pueblo (game/townGame.js), sus montes: la subida a la cima de las misiones de montaña con su avituallamiento, el
// panorama desde arriba y los prismáticos del mirador. Son métodos de TownGame: townGame.js los une a su clase
// (util/mezcla.js), con su this.

import { Actor } from '../actors/people.js';
import { BIRDS, bird } from '../actors/beasts.js';
import { FAUNA } from '../data/fauna.js';
import { FOOD } from '../data/equipo.js';
import { MONTE_TIPS, ORIENTA, ORIENTA_TIPS, makeBalizas, makeSignpost, makeTrailSign, signSVG } from './senales.js';
import { PLACES } from '../world/layout.js';
import { Panorama } from '../world/panorama.js';
import { SKY } from '../actors/animals.js';
import * as THREE from 'three';
import { TOWN } from '../world/townBuilder.js';
import { addCard, saveProfile } from './profile.js';
import { choiceGame, infoCard } from '../ui/minigames.js';
import { cimaUrl } from '../ui/laminas.js';
import { clamp, lerp, smoothstep } from '../util/math.js';
import { faunaImg } from '../ui/faunaImg.js';
import { groundHeight, terrainHeight, waterLevelAt } from '../world/heightfield.js';
import { isEU } from '../i18n.js';
import { montesConocidos, montesFrom, townLatLon } from '../data/miradores.js';
import { relieveMirador } from '../world/relieve.js';
import { segmentBlocked } from '../world/colliders.js';
import { showFicha } from '../ui/ficha.js';
import { viewFrom } from '../data/panorama.js';
// prismáticos: vectores de trabajo (sin crear objetos en cada fotograma ni por cada animal que se mira)
const _eye = new THREE.Vector3(), _dir = new THREE.Vector3(), _to = new THREE.Vector3(), _near = new THREE.Vector3(), _look = new THREE.Vector3();

export class PuebloCimas {
  // ---------- Subida al monte ----------
  startSummit(M) {
    M.step = 1; M.count = 0;
    for (const c of M.cairns || []) this.scene.remove(c.obj);
    // la cima: el punto más alto a una distancia razonable del pueblo
    const P = PLACES.plaza, h0 = M.host.pos;
    let best = null, bh = -1e9;
    for (let r = 90; r <= 300; r += 15) for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
      if (Math.abs(x) > 440 || Math.abs(z) > 440 || waterLevelAt(x, z) > groundHeight(x, z) - 0.2) continue;
      if (this.nearHouses(x, z, 35)) continue;
      const h = terrainHeight(x, z) - r * 0.02;
      if (h > bh) { bh = h; best = { x, z }; }
    }
    const top = this.spot(best, 6);
    M.cairns = [];
    const n = M.need;
    for (let i = 1; i <= n; i++) {
      const t = i / n, jig = i < n ? (i % 2 ? 1 : -1) * 8 : 0;
      const dx = top.x - h0.x, dz = top.z - h0.z, l = Math.hypot(dx, dz) || 1;
      const s = i < n ? this.spot({ x: h0.x + dx * t - dz / l * jig, z: h0.z + dz * t + dx / l * jig }, 4) : top;
      const o = makeCairn(i === n); o.position.set(s.x, groundHeight(s.x, s.z), s.z); o.rotation.y = Math.atan2(dx, dz); this.scene.add(o);
      M.cairns.push({ x: s.x, z: s.z, obj: o, top: i === n });
    }
    // señales pintadas junto a los mojones: sigue, una X en un ramal equivocado y un giro
    for (const o of M.signs || []) this.scene.remove(o);
    M.signs = [];
    const dx0 = top.x - h0.x, dz0 = top.z - h0.z, l0 = Math.hypot(dx0, dz0) || 1, px = -dz0 / l0, pz = dx0 / l0, ang = Math.atan2(dx0, dz0);
    const put = (kind, x, z, face) => { const s = this.spot({ x, z }, 2); const o = makeTrailSign(kind); o.position.set(s.x, groundHeight(s.x, s.z), s.z); o.rotation.y = face; this.scene.add(o); M.signs.push(o); };
    M.cairns.forEach((c, i) => { if (c.top || i > 2) return; const k = ORIENTA[i].kind;
      put(k === 'mal' ? 'sigue' : k, c.x + px * 1.8, c.z + pz * 1.8, ang + Math.PI);
      if (k === 'mal') put('mal', c.x - px * 9 + dx0 / l0 * 2, c.z - pz * 9 + dz0 / l0 * 2, ang + Math.PI - 0.9); });
    // al empezar la subida, ya fuera del pueblo: el poste indicador con la cima (altitud, distancia y desnivel reales
    // de la ruta) y la vuelta al pueblo; y por el camino, balizas de madera con las dos franjas cada pocos metros
    for (const o of M.posts || []) { this.scene.remove(o); o.userData.dispose?.(); }
    M.posts = [];
    try {
      const pk = M.peak || {}, trail = []; let t0 = null;
      for (let t = 0.04; t <= 0.97; t += 0.01) { const x = h0.x + dx0 * t, z = h0.z + dz0 * t; if (!this.nearHouses(x, z, 14)) { t0 = t; break; } }
      if (t0 != null) {
        const sx = h0.x + dx0 * t0 + px * 2.2, sz = h0.z + dz0 * t0 + pz * 2.2, sp = this.spot({ x: sx, z: sz }, 2);
        const info = [pk.distance ? `${String(pk.distance).replace('.', ',')} km` : '', pk.gain ? `+${pk.gain} m de subida` : ''].filter(Boolean).join(' · ');
        const post = makeSignpost({ peak: pk.name || 'Cima', alt: pk.altitude, info, town: this.def.name.split(' /')[0] });
        post.position.set(sp.x, groundHeight(sp.x, sp.z), sp.z); post.rotation.y = ang + 0.7; this.scene.add(post); M.posts.push(post);   // (algo girado: se lee al llegar)
        // balizas: a un lado del camino, cada 12 m, sin pisar los mojones
        const L = l0 * (1 - t0); for (let d = 10; d < L - 6; d += 12) {
          const t = t0 + d / l0, side = (Math.round(d / 12) % 2 ? 1 : -1) * 1.6, x = h0.x + dx0 * t + px * side, z = h0.z + dz0 * t + pz * side;
          if (M.cairns.some(c => Math.hypot(c.x - x, c.z - z) < 4) || waterLevelAt(x, z) > groundHeight(x, z) - 0.2) continue;
          trail.push([x, groundHeight(x, z) - 0.05, z, ang + Math.PI]);
        }
        if (trail.length) { const b = makeBalizas(trail); this.scene.add(b); M.posts.push(b); }
      }
    } catch (e) { console.warn('señales del monte', e); }
    M.tipT = 25; M.tips = MONTE_TIPS.map((_, i) => i).sort(() => this.rnd() - 0.5);
    M.y0 = this.player.pos.y;
    this.spawnClimbFauna(M, top);
    this.ui.toast('Sigue los mojones blancos y amarillos', 'peak', 2800);
  }
  nearHouses(x, z, d) { for (const h of TOWN.houses) { const p = h.door || h; if (p && Math.abs(p.x - x) < d && Math.abs(p.z - z) < d) return true; } return Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z) < d * 1.4; }
  // Animales del monte en la subida: aparecen junto a los mojones; acercándose despacio se descubren
  spawnClimbFauna(M, top) {
    if (M.wild) return;
    const fam = this.def.family, pyr = /Pirineo/.test(M.peak.zone || '');
    const kinds = fam === 'ribera' ? ['zorro', 'jabali', 'corzo'] : fam === 'central' ? ['corzo', 'jabali', 'zorro'] : ['corzo', 'zorro', 'ciervo'];
    const OPT = { corzo: { walk: 0.7, run: 6, radius: 0.35 }, zorro: { walk: 0.9, run: 6, radius: 0.3 }, ciervo: { walk: 0.8, run: 6.5, radius: 0.5 }, jabali: { walk: 0.7, run: 5, radius: 0.45 } };
    // por el camino, a partir del tramo que ya sale del pueblo (lejos de las casas)
    const h0 = M.host.pos, path = [];
    for (let t = 0.2; t <= 0.92; t += 0.02) { const x = lerp(h0.x, top.x, t), z = lerp(h0.z, top.z, t); if (!this.nearHouses(x, z, 22)) path.push({ x, z, t }); }
    const dx = top.x - h0.x, dz = top.z - h0.z, l = Math.hypot(dx, dz) || 1;
    M.wild = kinds.map((k, i) => {
      const q = path.length ? path[Math.min(path.length - 1, Math.floor((i + 0.6) / kinds.length * path.length))] : { x: lerp(h0.x, top.x, 0.4 + i * 0.18), z: lerp(h0.z, top.z, 0.4 + i * 0.18) }, side = i % 2 ? 1 : -1;
      const sp = this.spot({ x: q.x - dz / l * side * 9, z: q.z + dx / l * side * 9 }, 4, true);
      const a = this.fauna.add(k, sp.x, sp.z, { id: k, range: 5, flee: 5, ...OPT[k] });
      this.fauna.wild?.push(a);
      return { id: k, a, found: false };
    });
    // rapaz planeando sobre la cumbre
    const rk = pyr ? 'quebrantahuesos' : M.peak.id.length % 2 ? 'aguila' : 'buitre';
    const o = bird(rk); o.scale.setScalar(1.4); this.scene.add(o);
    const ty = terrainHeight(top.x, top.z);
    this.fauna.vultures?.push({ obj: o, c: new THREE.Vector3(top.x, ty + 22, top.z), r: 16, a: 0, w: 0.22, id: rk, pos: o.position, flapK: o.userData.flap });
    M.raptor = rk;
  }
  async discoverClimb(M, w) {
    w.found = true; this.sound.magic?.();
    const n = M.wild.filter(x => x.found).length;
    const isNew = addCard('fauna:' + w.id);
    this.player.frozen = true;
    try { await showFicha('fauna:' + w.id, { ui: this.ui, kicker: `Animal del monte · ${n} de ${M.wild.length}`, badge: isNew ? 'Nueva carta' : '', button: 'Seguir subiendo' }); await this.mochila.give('cuaderno'); }
    finally { this.player.frozen = false; }
  }
  updateSummit(M, dt = 1 / 60) {
    if (this.mode !== 'play' || this.ui.busy) return;
    // un consejo de montaña cada rato mientras se sube (sin repetir)
    if (M.tips?.length && !M.done && (M.tipT -= dt) <= 0) { M.tipT = 38; const k = M.tips.shift(); this.ui.whisper?.(MONTE_TIPS[k], 7000); }
    for (const w of M.wild || []) if (!w.found && w.a.obj.visible && Math.hypot(w.a.pos.x - this.player.pos.x, w.a.pos.z - this.player.pos.z) < 11) { this.discoverClimb(M, w); return; }
    const c = M.cairns.find(c => !c.reached); if (!c) return;
    if (Math.hypot(c.x - this.player.pos.x, c.z - this.player.pos.z) > (c.top ? 4.5 : 4)) return;
    c.reached = true; M.count++; this.sound.ui('coin');
    this.particles.emit({ x: c.x, y: groundHeight(c.x, c.z) + 1.5, z: c.z }, { n: 20, color: ['#ffffff', '#FFD700'], speed: 1.6, size: 0.25 });
    const pk = M.peak, climbed = Math.max(0, Math.round(this.player.pos.y - M.y0));
    const lines = [pk.route, pk.terrain, `Ya has subido ${climbed} metros. Mira hacia abajo: el pueblo se ve cada vez más pequeño.`];
    if (!c.top) { this.ui.toast(this.stepText(M), 'peak', 1600); this.orientCard(M, M.count - 1, lines[M.count - 1]); }
    else this.reachSummit(M, climbed);
  }
  // en cada mojón: cómo se leen las señales del monte y un consejo de orientación
  async orientCard(M, i, line) {
    const O = ORIENTA[i]; if (!O) { if (line) this.ui.whisper(line, 5200); return; }
    this.player.frozen = true;
    try {
      if (O.ask) {
        const opts = ['Camino equivocado: por ahí no', 'Hay una fuente cerca', 'Es la mitad de la subida'], ord = [0, 1, 2].sort(() => this.rnd() - 0.5);
        await choiceGame(this.ui, { title: 'Señales del monte', icon: 'compass', q: 'Junto a este mojón, en un ramal del camino, hay una piedra con una X pintada en blanco y amarillo. ¿Qué significa?', options: ord.map(k => opts[k]), answer: ord.indexOf(0), why: O.text });
      } else await infoCard(this.ui, { image: signSVG(O.kind), kicker: 'Señales del monte', title: O.title, text: O.text, button: 'Seguir subiendo' });
      const tip = ORIENTA_TIPS[i]; if (tip) this.ui.whisper(tip, 6500);
      else if (line) this.ui.whisper(line, 5200);
    } finally { this.player.frozen = false; }
  }
  // ¿lleva la mochila lo necesario para el monte? agua y dos alimentos
  supplyOk() { const b = this.P.bag || {}; return (b.agua || 0) >= 1 && Object.values(b.food || {}).reduce((a, n) => a + n, 0) >= 2; }
  supplyText() { const b = this.P.bag || {}, n = Object.values(b.food || {}).reduce((a, k) => a + k, 0); return `${(b.agua || 0) >= 1 ? 'agua ✓' : 'agua'} · comida ${Math.min(2, n)}/2`; }
  // Puesto de productos del pueblo: pan, queso y miel (gratis para quien va al monte)
  spawnStall() {
    if (this.stall) return;
    const P = PLACES, c = this.spot({ x: (P.market || P.plaza).x + 5, z: (P.market || P.plaza).z - 4 }, 4);
    const o = makeStall(); o.position.set(c.x, groundHeight(c.x, c.z), c.z); o.rotation.y = Math.atan2(P.plaza.x - c.x, P.plaza.z - c.z); this.scene.add(o);
    const s2 = this.spot({ x: c.x + Math.sin(o.rotation.y + Math.PI) * 1.6, z: c.z + Math.cos(o.rotation.y + Math.PI) * 1.6 }, 2);
    const a = new Actor({ id: 'tendera', name: 'Tendera', x: s2.x, z: s2.z, heading: o.rotation.y, look: { shirt: '#c0573a', apron: '#f4f1ea', skirt: '#3a3530', pants: '#3a3530', hair: '#4a3020', bun: true, female: true } }, this.scene);
    this.walkers.push(a); a.stall = true;
    this.stall = { x: c.x, z: c.z, obj: o, a, given: {} };
  }
  async buyStall() {
    const S = this.stall, a = S.a; this.player.frozen = true;
    try {
      const fam = this.def.family, list = [['pan', 'Pan de horno de leña, del obrador del pueblo.'], ['queso', fam === 'ribera' ? 'Queso de oveja de la Bardena.' : 'Queso de oveja latxa, de un pastor del valle.'], ['miel', 'Miel de las colmenas del monte: brezo y flores silvestres.']];
      const left = list.filter(([k]) => !S.given[k]);
      if (!left.length) { await this.say(a, ['¡Ya llevas de todo! Que tengas buena subida.']); return; }
      await this.say(a, ['¡Egun on! Aquí todo es de aquí: lo hacen vecinos del pueblo.', 'Para el monte, coge lo que quieras.']);
      for (const [k, why] of left) { S.given[k] = true; this.mochila.addFood(k, 1); await infoCard(this.ui, { icon: FOOD[k].icon, kicker: 'Producto local', title: FOOD[k].name, text: `${why} ${FOOD[k].fact}`, button: 'A la mochila' }); }
      if (!this.supplyOk()) this.ui.toast('Te falta agua: llena la cantimplora en la fuente', 'canteen', 3200);
      else this.ui.toast('¡Mochila lista! Vuelve con tu guía de montaña', 'backpack', 3200);
    } finally { this.player.frozen = false; a.talking = 0; }
  }
  async reachSummit(M, climbed) {
    const pk = M.peak, P = this.player;
    this.player.frozen = true; this.player.rig.doCheer(); this.sound.fanfare?.(); this.particles.confetti?.(P.pos, 90);
    // vista panorámica desde la cumbre
    const c0 = new THREE.Vector3(P.pos.x, P.pos.y, P.pos.z);
    this.follow.cinematic = { pos: new THREE.Vector3(c0.x + 9, c0.y + 5, c0.z + 9), look: new THREE.Vector3(PLACES.plaza.x, terrainHeight(PLACES.plaza.x, PLACES.plaza.z), PLACES.plaza.z), t: 0 };
    this.ui.whisper(`¡Cima! ${pk.name}, ${pk.altitude.toLocaleString('es')} m`, 3500);
    await new Promise(r => setTimeout(r, 2600));
    if (!this.P.peaks.includes(pk.id)) this.P.peaks.push(pk.id);
    saveProfile();
    await infoCard(this.ui, { icon: 'peak', lamina: cimaUrl(pk.id, true) || '', kicker: `Buzón de cumbre · ${pk.zone}`, title: `${pk.name}${pk.altName ? ' · ' + pk.altName : ''}`, text: `${pk.intro} Altitud: ${pk.altitude.toLocaleString('es')} m. Desde ${pk.start}: ${String(pk.distance).replace('.', ',')} km y ${pk.gain} m de desnivel. En el juego has subido ${climbed} m.`, badge: 'Cima conseguida', button: 'Mirar alrededor' });
    await this.panorama(M, c0);
    // almuerzo en la cima, como los pastores
    const b = this.P.bag?.food || {}, eat = ['queso', 'pan', 'miel', 'txistorra', 'manzana', 'avellanas', 'moras'].filter(k => b[k] > 0).slice(0, 2);
    if (eat.length) { eat.forEach(k => this.mochila.eat(k)); await infoCard(this.ui, { icon: FOOD[eat[0]].icon, kicker: 'Almuerzo en la cima', title: eat.map(k => FOOD[k].name).join(' y '), text: 'Sentado en la cumbre, con el valle a tus pies, el almuerzo sabe mejor. ¡Energía recuperada para bajar! Recuerda: la bajada cansa las rodillas, ve despacio.', button: '¡Qué rico!' }); }
    this.follow.cinematic = null; this.follow.snap(P); this.player.frozen = false;
    await this.complete(M, { card: pk.name, cardText: pk.intro });
  }
  // Navarra desde la cima: la cámara gira hacia cada pueblo (dirección real desde el monte) y lo nombra;
  // luego la rapaz que vuela sobre la cumbre y la lista de lo que se ve
  async panorama(M, c0) {
    const pk = M.peak, list = pk.lat ? viewFrom(pk.lat, pk.lon) : [];
    const C = this.follow.cinematic; if (!C) return;
    const eye = new THREE.Vector3(c0.x, c0.y + 5, c0.z);
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for (const v of list) {
      const b = v.bearing * Math.PI / 180, dx = Math.sin(b), dz = -Math.cos(b);
      C.pos = eye.clone().add(new THREE.Vector3(-dx * 5, 0, -dz * 5));
      C.look = new THREE.Vector3(c0.x + dx * 140, c0.y - 22, c0.z + dz * 140);
      this.ui.whisper(`Al ${v.dir}: ${v.name.split(' /')[0]} · ${v.km < 10 ? v.km.toFixed(1).replace('.', ',') : Math.round(v.km)} km`, 2300);
      await wait(2600);
    }
    if (M.raptor) {
      const F = FAUNA[M.raptor], isNew = addCard('fauna:' + M.raptor);
      C.look = new THREE.Vector3(c0.x, c0.y + 22, c0.z); C.pos = eye.clone().add(new THREE.Vector3(6, -0.5, 6));
      await wait(1800);
      await infoCard(this.ui, { icon: F.icon, animal: faunaImg(M.raptor)?.big, kicker: 'Sobre la cumbre', title: isEU() ? F.eu : `${F.name} · ${F.eu}`, text: `${F.look} ${F.fact}`, badge: isNew ? 'Nueva carta' : '', button: 'Seguir mirando' });
    }
    if (list.length) {
      const li = list.map(v => `<li><b>${v.name}</b><i>al ${v.dir}</i><span>${v.km < 10 ? v.km.toFixed(1).replace('.', ',') : Math.round(v.km)} km${v.inGame ? ' · está en el juego' : ''}</span></li>`).join('');
      const seen = (M.wild || []).filter(w => w.found).map(w => FAUNA[w.id].name.toLowerCase());
      await infoCard(this.ui, { icon: 'compass', kicker: 'Navarra desde arriba', title: `Desde ${pk.name}`, text: `Desde una cima se entiende cómo es Navarra: valles, sierras, ríos y pueblos unidos por caminos.${seen.length ? ` En la subida has descubierto: ${seen.join(', ')}.` : ''} Con el día despejado, desde la cima real verías:`, extra: `<ul class="tools">${li}</ul>`, button: '¡Firmar en el buzón!' });
    }
  }
  // ---------- Prismáticos ----------
  toggleBinoculars() {
    if (!this.binoOn) return;
    if (this.mode === 'bino') {
      this.mode = 'play'; this.fauna.farView = false; this.ui.binoculars(false); this.camera.fov = this.camera.userData.fov0 || 55; this.camera.updateProjectionMatrix(); this.player.obj.visible = true; this.player.frozen = false;
      if (this.panoOn) { this.panoOn = false; this.altScene = null; this.altCamera = null; this.altUpdate = null; }
      this._binoBest = null;
      return;
    }
    if (this.mode !== 'play') return;
    this.mode = 'bino'; this.fauna.farView = true; this.ui.binoculars(true); this.sound.ui('open');
    this.player.frozen = true; this.player.obj.visible = false;
    this.binoYaw = this.follow.yaw + Math.PI; this.binoPitch = 0.25;
    // en el mirador: la vista lejana con los montes de verdad en su dirección
    const v = this.miradorSpot(), P = this.player.pos, montes = this.panoMontes();
    // (con la misión de las aves y sin la de los montes, el pueblo de verdad, salvo con el relieve de detalle: en esa vista
    // lejana también vuelan aves)
    const aves = this.missions.some(x => x.type === 'observe' && x.step === 1), mir = this.missions.some(x => x.type === 'mirador' && x.step === 1);
    if (v && montes.length && Math.hypot(P.x - v.x, P.z - v.z) < 30 && (mir || !aves || this.polarG)) {
      try {
        // colores del cielo según la hora (los del pueblo pueden venir sin actualizar)
        const sk = this.sky?.sample?.(this.sky.time ?? 10);
        if (!this.pano) this.pano = new Panorama(montes, { quality: this.rt?.quality, sun: this.sky?.sunDir, zenith: sk?.zen, horizon: sk?.hor, relieve: relieveMirador(this.def.id), polar: this.polarG, conocidos: montesConocidos(), birds: this.panoBirdKinds(), snow: this.rt?.weather?.kind === 'snow' });
        this.panoOn = true; this.altScene = this.pano.scene; this.altCamera = this.pano.camera; this.altUpdate = (dt) => this.updateBino(dt);
        const M = this.missions.find(x => x.type === 'mirador'), next = this.pano.peaks.find(pk => !(M?.seenIds?.has(pk.m.id))) || this.pano.peaks[0];
        this.binoYaw = Math.PI - (next.b ?? next.m.bearing * Math.PI / 180) + 0.12; this.binoPitch = this.pano.real ? Math.atan2(next.summit.y - this.pano.eye.y, next.ds) - 0.02 : Math.atan2(next.summit.y * 0.6 - this.pano.eye.y, next.ds);
        this.pano.camera.fov = 45;
      } catch (e) { console.warn('vista del mirador', e); this.panoOn = false; }
    }
  }
  // aves que vuelan delante del mirador: las del cielo de la comarca y las que pide la misión de las aves (con modelo)
  panoBirdKinds() {
    const M = this.missions.find(x => x.type === 'observe'), want = [].concat(M?.species || []).filter(k => k in BIRDS);
    const sky = SKY[this.def.comarca] || ['buitre', 'milano'];
    return [...new Set([...want, ...sky])];
  }
  // montes que se ven desde el mirador: los de la misión o, si no la hay, los cuatro más vistosos desde el pueblo
  panoMontes() {
    const M = this.missions.find(x => x.type === 'mirador'); if (M?.montes?.length) return M.montes;
    if (!this._panoM) { const ll = townLatLon(this.def); this._panoM = ll ? montesFrom(ll.lat, ll.lon, 4, this.def.id) : []; }
    return this._panoM;
  }
  updateBino(dt) {
    const P = this.player.pos, pano = this.panoOn ? this.pano : null, cam = pano ? pano.camera : this.camera;
    const sens = (this.input.touch ? 0.0012 : 0.0009) * (pano ? cam.fov / 10 : 1);
    this.binoYaw -= this.input.look.dx * sens; this.binoPitch = clamp(this.binoPitch - this.input.look.dy * sens, -0.6, 1.3);
    const mv = this.input.move; this.binoYaw -= mv.x * dt * 0.8; this.binoPitch = clamp(this.binoPitch + mv.y * dt * 0.6, -0.6, 1.3);
    // (con un ave en la marca, en la vista lejana, los prismáticos se acercan a ella: se ven su silueta y sus colores)
    const zoomAve = pano && this._binoBest && !this._binoBest.monte;
    const fov = lerp(cam.fov, pano ? (zoomAve ? 8 : pano.real ? 20 : 24) : 10, 1 - Math.exp(-(pano ? 2.5 : 8) * dt));
    const eye = pano ? _eye.copy(pano.eye) : _eye.set(P.x, P.y + 1.55, P.z);
    const dir = _dir.set(Math.sin(this.binoYaw) * Math.cos(this.binoPitch), Math.sin(this.binoPitch), Math.cos(this.binoYaw) * Math.cos(this.binoPitch));
    if (pano) pano.look(this.binoYaw, this.binoPitch, fov);
    else { cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(eye); cam.lookAt(_look.copy(eye).add(dir)); }
    this.follow.yaw = this.binoYaw + Math.PI;
    const keyOf = (o) => o.obj?.uuid || o.id + ':' + Math.round(o.pos.x) + ',' + Math.round(o.pos.z);
    const fresh = (o) => o.monte ? !o.seen : !this.obsSeen?.has(keyOf(o));
    // lo que queda en la marca (best) y, cerca de ella, lo que todavía no has anotado (near): la ayuda al apuntar lo
    // acaba de centrar (sin ella, con el dedo, acertar con un ave que vuela o con la cumbre era casi imposible)
    let best = null, ba = 1, near = null, na = Infinity, nearDir = null;
    if (pano) pano.update(dt);
    const obs = pano ? [...this.monteObs(eye), ...pano.birdObs()] : [...this.fauna.observables(), ...this.monteObs(eye)];
    if (pano) pano.placeLabels(this.panoPins);
    for (const o of obs) {
      // (en los montes del paisaje real se apunta a la cumbre; en los de siempre, a su marca, que está en el cielo)
      const at = o.monte && o.pin && !o.pano ? o.pin.position : null;
      const to = at ? _to.copy(at).sub(eye) : _to.set(o.pos.x - eye.x, o.pos.y + (o.h || 0.5) - eye.y, o.pos.z - eye.z);
      const d = to.length(); if ((!o.pano && d > (o.far ? 320 : 110)) || d < 1) continue;
      const ang = to.normalize().angleTo(dir), tol = o.pano ? 0.08 : Math.max(0.045, (o.far ? 3.5 : 1.6) / d);
      if (ang > tol * 2.6) continue;
      if (!o.far && segmentBlocked(eye.x, eye.z, o.pos.x, o.pos.z)) continue;
      if (ang < tol && ang < ba) { ba = ang; best = o; }
      if (fresh(o) && ang / tol < na) { na = ang / tol; near = o; nearDir = _near.copy(to); }
    }
    this._binoBest = best;
    const dragging = this.input.look.dx || this.input.look.dy || mv.x || mv.y;
    if (near && nearDir && !dragging) {
      const yawT = Math.atan2(nearDir.x, nearDir.z), pitT = Math.asin(clamp(nearDir.y, -1, 1)), k = Math.min(1, dt * (near === best ? 5 : 3));
      this.binoYaw += Math.atan2(Math.sin(yawT - this.binoYaw), Math.cos(yawT - this.binoYaw)) * k;
      this.binoPitch = clamp(this.binoPitch + (pitT - this.binoPitch) * k, -0.6, 1.3);
    }
    // un ave detrás de una casa o de la iglesia no se puede anotar: comprobamos que no haya nada en medio
    if (best && best.far && !best.monte && !best.pano) {
      // solo las piezas grandes conservan sus posiciones (el resto se liberó al subirlo a la tarjeta): se comprueba con una copia que solo tiene posiciones
      const town = this.townMeshes ||= (this.scene.getObjectByName('town')?.children || []).filter(m => m.isMesh && m.geometry.attributes.position?.array).map(m => { const g = new THREE.BufferGeometry(); g.setAttribute('position', m.geometry.attributes.position); g.setIndex(m.geometry.index); g.boundingSphere = m.geometry.boundingSphere; g.boundingBox = m.geometry.boundingBox; const r = new THREE.Mesh(g, m.material); r.matrixWorld.copy(m.matrixWorld); r.matrixAutoUpdate = false; return r; });
      const to = _to.set(best.pos.x - eye.x, best.pos.y - eye.y, best.pos.z - eye.z), d = to.length();
      this.ray ||= new THREE.Raycaster(); this.ray.set(eye, to.normalize()); this.ray.far = d;
      if (this.ray.intersectObjects(town, false).length) best = null;
    }
    const M = this.missions.find(x => x.type === 'observe' && x.step === 1);
    const key = best ? keyOf(best) : null;
    const want = M ? [].concat(M.species || []) : [];
    const counts = M && best && (!want.length || want.includes(best.id));
    const isNew = best && fresh(best);
    const touch = this.input.touch, NOTE = touch ? 'toca Anotar' : 'pulsa E para anotar';
    const F = best ? (best.monte ? { name: best.seen ? best.monte.name : `¡Un monte! ${touch ? 'Toca Anotar' : 'Pulsa E'} para saber cuál es` } : FAUNA[best.id]) : null;
    const pips = (n, need) => `<span class="pips">${Array.from({ length: need }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
    // el recuadro: cuántos llevas y lo siguiente que buscar, en dos líneas (la lista entera tapaba medio visor)
    const MM = this.missions.find(x => x.type === 'mirador' && x.step === 1), DIRS = ['NORTE', 'NORESTE', 'ESTE', 'SURESTE', 'SUR', 'SUROESTE', 'OESTE', 'NOROESTE'];
    const brg = ((Math.atan2(dir.x, -dir.z) * 180 / Math.PI) + 360) % 360;
    let goal = '', monteHint = null;
    if (MM) {
      const v = this.miradorSpot(), far = !pano && (!v || Math.hypot(P.x - v.x, P.z - v.z) > 30);
      if (far) goal = `<b>Montes</b><span class="bnext">Desde aquí no se ven: ve al mirador</span>`;
      else {
        const list = this.monteObs(eye), next = list.find(o => !o.seen);
        goal = `<b>Montes ${MM.count}/${MM.need} ${pips(MM.count, MM.need)}</b><span class="bnext">${next ? `Busca el monte del ${next.monte.dir} · ${Math.round(next.monte.km)} km` : '¡Ya los tienes!'}</span>`;
        if (!best && next) { const q = _to.copy(next.pin?.position || next.pos).project(cam); const behind = q.z > 1; monteHint = Math.atan2(behind ? -q.y : q.y, behind ? -q.x : q.x); }
      }
    } else if (M) {
      // las aves (o los animales) de la misión: el más cercano que te falta, con su distancia
      const t = this.obsNearest(M), aves = want.length && want.every(id => FAUNA[id]?.kind === 'ave');
      goal = `<b>${aves ? 'Aves' : 'Animales'} ${M.count}/${M.need} ${pips(M.count, M.need)}</b><span class="bnext">${t ? `Busca: ${FAUNA[t.id]?.name || t.id} · ${Math.round(Math.hypot(t.pos.x - eye.x, t.pos.z - eye.z))} m` : 'Mira al cielo y a los riscos'}</span>`;
    }
    this.ui.binoInfo?.(goal, 'Miras al ' + DIRS[Math.round(brg / 45) % 8].toLowerCase());
    // sin nada en el visor: flecha hacia el animal buscado más cercano
    let hint = monteHint;
    if (!best && M && hint == null) { const t = this.obsNearest(M); if (t) { const v = _to.set(t.pos.x, t.pos.y + (t.h || 0.4), t.pos.z).project(cam); const behind = v.z > 1; hint = Math.atan2(behind ? -v.y : v.y, behind ? -v.x : v.x); } }
    const label = best ? (best.monte ? (best.seen ? `${best.monte.name} · ${best.monte.altitude} m` : F.name) : `${F?.name || best.id}${isNew ? (counts || !M ? ` · ${NOTE}` : ' · no es de los que buscas') : ' · ya anotado'}`) : '';
    this.ui.binoTarget(label, !!best, hint, !!best && isNew && (!!best.monte || counts || !M));
    if (this.input.consume('e') || this.input.consume(' ')) {
      this.sound.ui('photo');
      if (best?.monte && !best.seen) { this.seeMonte(best); }
      else if (best && isNew && !best.monte) {
        this.obsSeen ||= new Set(); this.obsSeen.add(key);
        const first = !this.P.species.includes(best.id);
        if (first) this.P.species.push(best.id);
        if (counts) { M.count++; if (M.count >= M.need) M.step = 2; }
        saveProfile();
        this.fieldCard(best.id, first, counts ? M : null);
      }
    }
    if (this.input.consume('f') || this.input.consume('escape')) this.toggleBinoculars();
  }
  // mirador del pueblo (el landmark «lookout» o «pass») y montes vistos desde él, en su dirección real (norte = −z)
  // centro de la tarima del mirador (para las pruebas y la cámara)
  miradorDeck() { const l = TOWN.landmarks.find(l => l.kind === 'lookout') || TOWN.landmarks.find(l => l.kind === 'pass'); return l ? { x: l.x, z: l.z } : null; }
  miradorSpot() { const l = TOWN.landmarks.find(l => l.kind === 'lookout') || TOWN.landmarks.find(l => l.kind === 'pass'); return l ? (l.spot || { x: l.x, z: l.z }) : null; }
  monteObs(eye) {
    if (this.panoOn && this.pano) {
      const M = this.missions.find(x => x.type === 'mirador'), S = this.pano.scene;
      if (!this.panoPins) this.panoPins = this.pano.peaks.map(pk => { const seen = this.P.montes?.includes(pk.m.id) && (!M || M.seenIds?.has(pk.m.id)); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex(seen ? pk.m.name : '?'), depthTest: false, transparent: true, fog: false })); sp.renderOrder = 20; sp.userData.named = seen; S.add(sp); return sp; });
      // la marca de cada cumbre, siempre del mismo tamaño en la pantalla, justo encima de ella; cuando la cumbre entra en
      // la marca del visor, sube por encima del anillo (lo tapaba)
      const cam = this.pano.camera, wpp = 2 * Math.tan(cam.fov * Math.PI / 360) / innerHeight;   // (por cada metro de distancia, lo que mide un píxel)
      return this.pano.peaks.map((pk, i) => {
        const pin = this.panoPins[i], named = pin.userData.named, px = wpp * pk.ds, s = 30 * px;
        const q = _to.copy(pk.summit).project(cam), dpx = q.z > 1 ? Infinity : Math.hypot(q.x * innerWidth, q.y * innerHeight) / 2;
        const gap = 8 + 40 * (1 - smoothstep(40, 110, dpx));
        pin.scale.set(named ? s * 3.4 : s, named ? s * 0.85 : s, 1); pin.position.copy(pk.summit); pin.position.y += gap * px + pin.scale.y / 2;
        return { pos: pk.summit, h: 0, far: true, pano: true, id: 'monte:' + pk.m.id, monte: pk.m, seen: named, pin, i };
      });
    }
    const M = this.missions.find(x => x.type === 'mirador'), v = this.miradorSpot();
    // (solo mientras se buscan: acabada la misión, sus marcas ya no están en el pueblo ni la ayuda al apuntar lleva a ellas)
    if (!M || M.step !== 1 || !v || Math.hypot(eye.x - v.x, eye.z - v.z) > 30) { if (this.montePins) this.montePins.forEach(p => p.visible = false); return []; }
    if (!this.montePins) this.montePins = M.montes.map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex('?'), depthTest: false, transparent: true })); sp.scale.set(14, 14, 1); sp.renderOrder = 20; this.scene.add(sp); return sp; });
    return M.montes.map((mt, i) => {
      const b = mt.bearing * Math.PI / 180, pos = new THREE.Vector3(eye.x + Math.sin(b) * 300, eye.y + 14 + Math.min(20, mt.altitude / 120), eye.z - Math.cos(b) * 300);
      const pin = this.montePins[i]; pin.position.copy(pos); pin.position.y += 10; pin.visible = this.mode === 'bino';
      return { pos, h: 0, far: true, id: 'monte:' + mt.id, monte: mt, seen: this.P.montes?.includes(mt.id) && M.seenIds?.has(mt.id), pin, i };
    });
  }
  seeMonte(o) {
    const M = this.missions.find(x => x.type === 'mirador'), mt = o.monte;
    if (M) (M.seenIds ||= new Set()).add(mt.id); (this.P.montes ||= []).includes(mt.id) || this.P.montes.push(mt.id);
    o.pin.material.map?.dispose(); o.pin.material.map = pinTex(mt.name); o.pin.material.needsUpdate = true; o.pin.scale.set(36, 9, 1); o.pin.userData.named = true;
    if (M && M.step === 1) { M.count = M.seenIds.size; if (M.count >= M.need) M.step = 2; }
    saveProfile(); this.sound.magic?.();
    const isNew = addCard('monte:' + mt.id);
    infoCard(this.ui, { icon: 'peak', kicker: `Al ${mt.dir} · ${Math.round(mt.km)} km`, title: `${mt.name}${mt.alt ? ' · ' + mt.alt : ''}`, text: `${mt.altitude.toLocaleString('es')} metros${mt.zone ? ' · ' + mt.zone : ''}. ${mt.intro || ''}`, badge: isNew ? 'Nueva carta' : '', button: M?.step === 2 ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir mirando' });
  }
  // animal buscado más cercano (para la brújula y la flecha del visor)
  obsNearest(M) {
    // (con la vista lejana del mirador, las aves que vuelan delante de él)
    const pano = this.panoOn && this.pano, P = pano ? pano.eye : this.player.pos; let b = null, bd = 1e9;
    for (const o of pano ? pano.birdObs() : this.fauna.observables()) {
      if (M.species.length && !M.species.includes(o.id)) continue;
      const k = o.obj?.uuid || o.id + ':' + Math.round(o.pos.x) + ',' + Math.round(o.pos.z); if (this.obsSeen?.has(k)) continue;
      const d = Math.hypot(o.pos.x - P.x, o.pos.z - P.z); if (d < bd) { bd = d; b = o; }
    }
    return b;
  }
  // ficha del cuaderno de campo al anotar un animal
  async fieldCard(id, first, M) {
    const F = FAUNA[id]; if (!F) return;
    if (!first && !M) { if (this.mode === 'bino') this.ui.binoNote(`${F.name} anotado`); else this.ui.toast(`${F.name} anotado`, 'binoculars'); return; }
    this.sound.magic();
    const done = M && M.count >= M.need;
    if (first) addCard('fauna:' + id);
    await showFicha('fauna:' + id, { ui: this.ui, kicker: 'Cuaderno de campo · ficha de fauna', badge: first ? 'Especie nueva' : '', button: M ? (done ? `¡Hecho! Vuelve con ${M.host.name}` : `Seguir buscando (${M.count}/${M.need})`) : 'Seguir observando' });
    if (first) await this.mochila.give('cuaderno');
    if (done) this.ui.toast(`¡Muy bien! Vuelve con ${M.host.name}`, 'check', 3000);
  }
}

// Puesto de productos: mesa con toldo, panes, quesos y tarros de miel
function makeStall() {
  const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(2.2, 0.08, 1), M('#8a5a32'), 0, 0.9, 0);
  for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) add(new THREE.BoxGeometry(0.08, 0.9, 0.08), M('#6b4a2e'), x, 0.45, z);
  for (const x of [-1.05, 1.05]) add(new THREE.BoxGeometry(0.07, 2.2, 0.07), M('#6b4a2e'), x, 1.1, -0.5);
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.38, 0.03, 1.2), M(i % 2 ? '#ffffff' : '#c8302a'), -0.95 + i * 0.38, 2.15, -0.05).rotation.x = 0.35;
  for (let i = 0; i < 3; i++) { const b = add(new THREE.SphereGeometry(0.16, 12, 8), M('#c9934a'), -0.8 + i * 0.22, 1.0, 0.1); b.scale.set(1.3, 0.6, 0.9); }
  for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 18), M('#f0dca0'), 0.05 + i * 0.1, 1.02 + i * 0.14, -0.05);
  for (let i = 0; i < 3; i++) { add(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), M('#e0a020', { transparent: true, opacity: 0.85 }), 0.6 + i * 0.17, 1.02, 0.15); add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), M('#c8302a'), 0.6 + i * 0.17, 1.12, 0.15); }
  return g;
}

// Mojón de sendero (piedras con franjas blanca y amarilla) y, en la cima, hito con buzón y bandera
function makeCairn(top) {
  const g = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: '#9a938a', roughness: 0.9 });
  const n = top ? 6 : 4;
  for (let i = 0; i < n; i++) { const r = (top ? 0.75 : 0.42) * (1 - i / (n + 1)); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), st); m.position.y = r * 0.6 + i * r * 0.95; m.rotation.set(i, i * 1.3, 0); m.scale.y = 0.7; m.castShadow = true; g.add(m); }
  const h = top ? 3.4 : 1.5;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.8 })); post.position.y = h / 2; post.castShadow = true; g.add(post);
  for (const [y, c] of [[h - 0.18, '#ffffff'], [h - 0.36, '#f2c230']]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.15 })); b.position.y = y; g.add(b); }
  if (top) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.3), new THREE.MeshStandardMaterial({ color: '#b83a2a', metalness: 0.4, roughness: 0.4 })); box.position.set(0, 1.9, 0.2); g.add(box);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: '#d42f2f', side: THREE.DoubleSide, roughness: 0.7 })); flag.position.set(0.53, h - 0.35, 0); g.add(flag);
    const star = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.6, roughness: 0.3 })); star.position.set(0.53, h - 0.35, 0.02); g.add(star);
  }
  return g;
}

// marca del visor: «?» o el nombre del monte ya descubierto
function pinTex(t) {
  const c = document.createElement('canvas'), q = t === '?'; c.width = q ? 128 : 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,12,40,0.78)'; g.strokeStyle = '#FFD700'; g.lineWidth = 6; g.beginPath(); g.roundRect(4, 4, c.width - 8, 92, 30); g.fill(); g.stroke();
  g.fillStyle = '#FFD700'; g.beginPath(); g.moveTo(c.width / 2 - 14, 96); g.lineTo(c.width / 2 + 14, 96); g.lineTo(c.width / 2, 124); g.fill();
  g.fillStyle = '#fff'; g.font = `900 ${q ? 64 : 48}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, c.width / 2, 52);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
