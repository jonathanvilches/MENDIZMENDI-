// Frontón de los pueblos y partido de pelota a mano con el motor común de src/pelota.
// Aquí solo se adapta el motor al juego: dónde va el frontón, colisiones, personajes, cámara e interfaz.
import * as THREE from 'three';
import { PelotaCourt, PelotaMatch } from '../pelota/index.js';
import { terrainHeight, waterLevelAt, addPlatform } from '../world/heightfield.js';
import { addBox, isFree } from '../world/colliders.js';
import { clearGrass } from '../world/nature.js';
import { getLang } from '../i18n.js';
import { profile } from './profile.js';

// huella del frontón en coordenadas locales (se calcula una vez)
let EXTENT = null;
function extent() { if (!EXTENT) { const c = new PelotaCourt(THREE); EXTENT = c.extent; c.dispose(); } return EXTENT; }

// Busca un sitio llano y libre cerca de la plaza
export function findFrontonSpot(plaza) {
  const E = extent();
  let best = null, bs = 1e9;
  for (let r = 34; r <= 120; r += 8) for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const x = plaza.x + Math.cos(a) * r, z = plaza.z + Math.sin(a) * r, ry = Math.atan2(plaza.x - x, plaza.z - z);   // la cancha se abre hacia la plaza
    const c = Math.cos(ry), s = Math.sin(ry); let mn = 1e9, mx = -1e9, ok = true;
    for (let lx = E.x0; lx <= E.x1 + 0.01 && ok; lx += 3) for (let lz = E.z0; lz <= E.z1 + 0.01; lz += 3) {
      const X = x + lx * c + lz * s, Z = z - lx * s + lz * c;
      if (!isFree(X, Z, 1.2) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.3) { ok = false; break; }
      const h = terrainHeight(X, Z); mn = Math.min(mn, h); mx = Math.max(mx, h);
    }
    if (!ok) continue;
    const score = (mx - mn) * 10 + r * 0.05;
    if (score < bs) { bs = score; best = { x, z, ry, y: mx + 0.05 }; }
  }
  return best;
}

// Altura para que la cancha quede por encima del terreno en toda su huella
export function courtHeight(x, z, ry) {
  const E = extent(), c = Math.cos(ry), s = Math.sin(ry); let mx = -1e9;
  for (let lx = E.x0; lx <= E.x1 + 0.01; lx += 1.5) for (let lz = E.z0; lz <= E.z1 + 0.01; lz += 1.5) mx = Math.max(mx, terrainHeight(x + lx * c + lz * s, z - lx * s + lz * c));
  return mx + 0.05;
}

export class Fronton {
  // spot: centro del frontis a ras de suelo; ry: giro (la cancha crece hacia +z local); sin y, se calcula
  constructor(scene, spot) {
    if (spot.y == null) spot = { ...spot, y: courtHeight(spot.x, spot.z, spot.ry) };
    this.spot = spot;
    const court = this.court = new PelotaCourt(THREE);
    const g = court.group; g.position.set(spot.x, spot.y, spot.z); g.rotation.y = spot.ry; scene.add(g); g.updateMatrixWorld(true);
    const E = court.extent, mid = this.toWorld((E.x0 + E.x1) / 2, 0);
    clearGrass(mid.x, mid.z, E.x1 - E.x0, E.z1, spot.ry);
    for (const b of court.boxes) { const p = this.toWorld(b.x, b.z); addBox(p.x, p.z, b.w, b.d, spot.ry, { solidView: true }); }
    addPlatform(spot.x, spot.z, spot.ry, E.x0, E.x1 - 3.3, E.z0, E.z1, spot.y);   // la cancha es suelo (sin las gradas)
    this.entry = this.toWorld(court.entry.x, court.entry.z);
  }
  toWorld(lx, lz) { const v = new THREE.Vector3(lx, 0, lz); this.court.group.localToWorld(v); return v; }
  play(G, rival, opts) { return playPelota(G, this, rival, opts); }
}

/**
 * Partido (o peloteo) en un frontón. Devuelve una promesa con { win, you, cpu, best, quit }.
 * G: juego (player, camera, follow, ui, mode); rival: Actor del pueblo.
 */
export function playPelota(G, fronton, rival, { mode = 'match', target = 5, level } = {}) {
  if (window.__autoWin) return Promise.resolve({ win: true, you: target, cpu: 0 });
  return new Promise(res => {
    const P = G.player, rig = P.rig, home = { x: rival.pos.x, z: rival.pos.z, h: rival.heading };
    // el partido anima al jugador y coloca a los dos: el rig del jugador pasa a nuestras manos
    P.rig = { update() { }, doAct() { }, doCheer() { }, doWave() { }, setExpr() { } };
    P.frozen = true; G.mode = 'pelota'; G.ui.hudVisible?.(false); G.ui.setPrompt?.(null);
    rival.frozen = true; rival.talking = 0;
    const flags = { you: {}, rival: {} };
    const once = (who, key, on, fn) => { if (on && !flags[who][key]) { flags[who][key] = true; fn(); } else if (!on) flags[who][key] = false; };
    const animYou = (obj, st, dt) => {
      P.pos.copy(obj.position); P.heading = obj.rotation.y;
      rig.update(dt, st.speed, true, 0);
      once('you', 'swing', st.swing >= 0, () => rig.doAct?.('throw', 0.35));
      once('you', 'won', st.won, () => rig.doCheer?.());
    };
    const animRival = (obj, st) => {
      rival.pos.copy(obj.position); rival.heading = obj.rotation.y; rival.speed = st.speed;
      once('rival', 'swing', st.swing >= 0, () => rival.anim?.doAct?.('throw', 0.35));
      if (st.won) rival.cheer = 0.6;
    };
    const match = G.pelotaMatch = new PelotaMatch({
      THREE, court: fronton.court, camera: G.camera, lang: getLang(), mode, target, level,
      you: { obj: P.obj, name: profile().name || (getLang() === 'eu' ? 'Zu' : 'Tú'), animate: animYou },
      rival: { obj: rival.obj, name: String(rival.name).split(',')[0], animate: animRival },
      onEnd: (r) => done(r), onExit: (r) => done(r),
    });
    G.pelotaTick = (dt) => match.update(dt);
    function done(r) {
      G.pelotaTick = null; G.pelotaMatch = null;
      P.rig = rig; P.frozen = false; G.mode = 'play'; G.ui.hudVisible?.(true);
      rival.frozen = false; rival.speed = 0; rival.setPos(home.x, home.z, home.h);
      const e = fronton.entry, c = fronton.toWorld(0, 12);
      P.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z));
      G.follow.cinematic = null; G.follow.snap(P);
      res({ win: !!r.win, you: r.score?.you ?? 0, cpu: r.score?.rival ?? 0, best: r.best ?? 0, quit: !!r.quit });
    }
  });
}
