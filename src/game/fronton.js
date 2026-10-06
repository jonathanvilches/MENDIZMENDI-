// Frontón de los pueblos y partido de pelota a mano con el motor común de src/pelota.
// Aquí solo se adapta el motor al juego: dónde va el frontón, colisiones, personajes, cámara e interfaz.
import * as THREE from 'three';
import { armSwing, GlbRig, loadMeshy, hasMeshy, loadedMeshy } from '../actors/glbChar.js';
import { PelotaCourt, PelotaMatch } from '../pelota/index.js';
import { terrainHeight, waterLevelAt, addPlatform, onPlatform } from '../world/heightfield.js';
import { addBox, rectFree } from '../world/colliders.js';
import { rx, pathQuery } from '../world/layout.js';
import { clearGrass, clearTrees } from '../world/nature.js';
import { isEU } from '../i18n.js';
import { profile } from './profile.js';
import { QUALITY } from '../util/quality.js';
import { Crowd } from './crowd.js';
import { shieldSpec, drawShield } from '../world/heraldry.js';

// nombre del pueblo y su escudo para la pared izquierda (como el letrero del ayuntamiento en los frontones de verdad)
export function frontonWall(def) {
  const spec = shieldSpec(def);
  return { wallName: (def.name || '').split(/\s*\/\s*/).join(' · ').toUpperCase(), wallSub: 'AYUNTAMIENTO · UDALA', shield: (g, cx, top, h) => drawShield(g, cx, top, h, spec) };
}

// huella del frontón en coordenadas locales (se calcula una vez)
let EXTENT = null;
function extent() { if (!EXTENT) { const c = new PelotaCourt(THREE, { texScale: 0.25 }); EXTENT = c.extent; c.dispose(); } return EXTENT; }

// Busca un sitio llano y libre cerca de la plaza
export function findFrontonSpot(plaza) {
  // primero cerca de la plaza y sin calles ni caminos debajo (las paredes los cortarían) y con sitio de sobra alrededor
  // (los tejados sobresalen del choque de las casas: antes quedaban esquinas de casa pegadas a la cancha); si así no
  // cabe, más lejos; luego dejando pasar algún camino; y al final con menos holgura: todos los pueblos tienen frontón
  return frontonSearch(plaza, 34, 130, 3, 0.2, true) || frontonSearch(plaza, 130, 240, 3, 0.15, true)
    || frontonSearch(plaza, 34, 240, 1.5, 0.2, false) || frontonSearch(plaza, 34, 260, 0.6, 0.15, false);
}
function frontonSearch(plaza, r0, r1, gap, da, noRoad) {
  const E = extent();
  let best = null, bs = 1e9;
  for (let r = r0; r <= r1; r += 8) for (let a = 0; a < Math.PI * 2; a += da) {
    const x = plaza.x + Math.cos(a) * r, z = plaza.z + Math.sin(a) * r, face = Math.atan2(plaza.x - x, plaza.z - z);
    if (Math.sign(x - rx(z)) !== Math.sign(plaza.x - rx(plaza.z))) continue;   // en la misma orilla que la plaza (sin río, rx es 9999: todo vale)
    // la cancha se abre hacia la plaza; si así no cabe, también de lado (como muchos frontones, a lo largo de la calle)
    for (const [ry, turned] of [[face, 0], [face + Math.PI / 2, 1], [face - Math.PI / 2, 1]]) {
      if (!rectFree(x, z, ry, E.x0, E.x1, E.z0, E.z1, gap)) continue;   // ni casas ni muros ni farolas dentro
      const c = Math.cos(ry), s = Math.sin(ry); let mn = 1e9, mx = -1e9, ok = true, road = 0;
      for (let lx = E.x0 - 1; lx <= E.x1 + 1.01 && ok; lx += 2.5) for (let lz = E.z0 - 1; lz <= E.z1 + 1.01; lz += 2.5) {
        const X = x + lx * c + lz * s, Z = z - lx * s + lz * c;
        if (onPlatform(X, Z, 1) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.3) { ok = false; break; }
        const h = terrainHeight(X, Z); mn = Math.min(mn, h); mx = Math.max(mx, h);
        const q = pathQuery(X, Z); if (q.d < q.w + 1.5) road++;
      }
      if (!ok || (noRoad && road)) continue;
      // llano, cerca de la plaza, sin caminos debajo y mejor de frente a la plaza
      const score = (mx - mn) * 10 + r * 0.05 + road * 2 + turned * 1.5;
      if (score < bs) { bs = score; best = { x, z, ry, y: mx + 0.05, road, score }; }
    }
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
  // extra: { wallName, wallSub, shield } → nombre y escudo pintados en la pared izquierda
  constructor(scene, spot, title = '', extra = {}) {
    if (spot.y == null) spot = { ...spot, y: courtHeight(spot.x, spot.z, spot.ry) };
    this.spot = spot;
    const court = this.court = new PelotaCourt(THREE, { title, texScale: QUALITY === 'low' ? 0.5 : 1, ...extra });
    const g = court.group; g.position.set(spot.x, spot.y, spot.z); g.rotation.y = spot.ry; scene.add(g); g.updateMatrixWorld(true);
    const E = court.extent, mid = this.toWorld((E.x0 + E.x1) / 2, 0);
    clearGrass(mid.x, mid.z, E.x1 - E.x0, E.z1, spot.ry); clearTrees(mid.x, mid.z, E.x1 - E.x0, E.z1, spot.ry);
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
// (torneo: rivalName para el nombre del rival en el marcador y fixedLevel para no elegir nivel)
export function playPelota(G, fronton, rival, { mode = 'match', target = 5, level, rivalName, fixedLevel = false } = {}) {
  if (window.__autoWin) return Promise.resolve({ win: true, you: target, cpu: 0 });
  return new Promise(res => {
    const P = G.player, rig0 = P.rig, home = { x: rival.pos.x, z: rival.pos.z, h: rival.heading };
    let rig = rig0, pel = null, red = null, crowd = null, bf = null, bfWas = false, ended = false; const hidden = [], hiddenR = [];
    // si algo falla al montar el partido, de vuelta al pueblo con todo como estaba (nunca congelado en la cancha)
    const fail = (e) => {
      console.warn('frontón', e);
      try { done({ win: false, error: true }); }
      catch (e2) { console.warn('frontón', e2); P.rig = rig0; P.frozen = false; G.mode = 'play'; G.pelotaTick = null; G.ui.hudVisible?.(true); res({ win: false, you: 0, cpu: 0, best: 0, quit: true }); }   // (resolver dos veces no hace nada)
    };
    (async () => {
    // para el partido te conviertes en el pelotari (camiseta, pantalón blanco y tacos en las manos); al acabar vuelves a ser tú
    // (si ya juegas con el pelotari, no hace falta cambiar; los modelos se piden antes, al acercarte al frontón)
    const wait = !loadedMeshy('pelotari') || !loadedMeshy('pelotari_rojo');
    if (wait) G.ui.toast?.(isEU() ? 'Pilotariak prestatzen…' : 'Preparando a los pelotaris…', 'pelota', 1800);
    if (rig0.id !== 'pelotari' && hasMeshy('pelotari')) try { pel = new GlbRig(await loadMeshy('pelotari'), 'pelotari'); } catch (e) { console.warn('pelotari', e); }
    // (el cuerpo de siempre se aparta del todo mientras dura el partido: así nada lo vuelve a mostrar)
    if (pel) { hidden.push(...P.obj.children); for (const c of hidden) P.obj.remove(c); P.obj.add(pel.char.root); rig = pel; }
    // y el rival juega de rojo (el pelotari colorado), como en los partidos de verdad: azules contra colorados
    if (hasMeshy('pelotari_rojo')) try { red = new GlbRig(await loadMeshy('pelotari_rojo'), 'pelotari_rojo'); } catch (e) { console.warn('pelotari rojo', e); }
    if (red) { hiddenR.push(...rival.obj.children); for (const c of hiddenR) rival.obj.remove(c); rival.obj.add(red.char.root); red.setStance('Ready'); }
    // el partido anima al jugador y coloca a los dos: el rig del jugador pasa a nuestras manos
    P.rig = { update() { }, doAct() { }, doCheer() { }, doWave() { }, setExpr() { } };
    P.frozen = true; G.mode = 'pelota'; G.ui.hudVisible?.(false); G.ui.setPrompt?.(null);
    G.rt?.boost?.(true);   // partido: imagen más nítida (en el móvil, los pelotaris con su detalle)
    // para jugar a pelota no hace falta el perro: se queda en casa y vuelve al acabar
    G.perro?.away?.();
    bf = G.fauna?.bfMesh; bfWas = bf?.visible; if (bf) bf.visible = false;   // sin mariposas sobre la cancha
    rig.setStance?.('Ready');                     // en la cancha, postura de pelotari
    G.pelotaRig = rig;
    rival.frozen = true; rival.talking = 0;
    const flags = { you: {}, rival: {} };
    // vecinos que se acercan a la grada a ver el partido
    crowd = G.pelotaCrowd = G.scene ? new Crowd(G, fronton, 7 + ((Math.random() * 4) | 0)) : null;
    const once = (who, key, on, fn) => { if (on && !flags[who][key]) { flags[who][key] = true; fn(); } else if (!on) flags[who][key] = false; };
    const stYou = { v: null }, stRival = { v: null };
    armSwing(rig.char, () => stYou.v, { windOnly: !!pel }); armSwing(red ? red.char : rival.glb, () => stRival.v, { windOnly: !!red });
    const animYou = (obj, st, dt) => {
      stYou.v = st;
      P.pos.copy(obj.position); P.heading = obj.rotation.y;
      if (rig.char) rig.char.back = st.back; rig.update(dt, st.speed, true, 0);
      once('you', 'swing', st.swing >= 0, () => rig.doAct?.('hit', 0.5));
      once('you', 'won', st.won, () => rig.doCheer?.());
    };
    const animRival = (obj, st, dt = 1 / 60) => {
      stRival.v = st;
      rival.pos.copy(obj.position); rival.heading = obj.rotation.y; rival.speed = st.speed;
      if (red) { red.char.back = st.back; red.update(dt, st.speed, true, 0); }
      once('rival', 'swing', st.swing >= 0, () => red ? red.doAct('hit', 0.5) : rival.anim?.doAct?.('throw', 0.35));
      once('rival', 'won', st.won, () => red?.doCheer());
      if (st.won) rival.cheer = 0.6;
    };
    let match;
    try { match = G.pelotaMatch = new PelotaMatch({
      THREE, court: fronton.court, camera: G.camera, lang: isEU() ? 'eu' : 'es', mode, target, level, fixedLevel,
      you: { obj: P.obj, name: profile().name || (isEU() ? 'Zu' : 'Tú'), animate: animYou },
      rival: { obj: rival.obj, name: rivalName || String(rival.name).split(',')[0], animate: animRival },
      onEnd: (r) => done(r), onExit: (r) => done(r),
      onEvent: (e) => { if (e.type === 'call' && crowd) crowd.point(e.winner === 'you'); },
    }); } catch (e) { console.warn('frontón', e); done({ win: false, error: true }); return; }   // (si no se monta, de vuelta al pueblo)
    G.pelotaTick = (dt) => { match.update(dt); crowd?.update(dt); };
    })().catch(fail);
    function done(r) {
      if (ended) return; ended = true;
      // el público aplaude el final y vuelve al pueblo (sigue moviéndose con el juego hasta que se va)
      if (crowd) { crowd.end(!!r.win); G.crowds = (G.crowds || []).filter(c => !c.disposed).concat(crowd); }
      G.pelotaTick = null; G.pelotaMatch = null; G.pelotaRig = null;
      if (rig.char) rig.char.post = null; if (rival.glb) rival.glb.post = null;
      rig.setStance?.(null);
      if (pel) { P.obj.remove(pel.char.root); pel.dispose(); for (const c of hidden) P.obj.add(c); }
      if (bf) bf.visible = bfWas;
      if (red) { red.char.post = null; rival.obj.remove(red.char.root); red.dispose(); for (const c of hiddenR) rival.obj.add(c); }
      G.rt?.boost?.(false);
      P.rig = rig0; P.frozen = false; G.mode = 'play'; G.ui.hudVisible?.(true); G.perro?.release?.();
      rival.frozen = false; rival.speed = 0; rival.setPos(home.x, home.z, home.h);
      const e = fronton.entry, c = fronton.toWorld(0, 12);
      P.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z));
      G.follow.cinematic = null; G.follow.snap(P);
      res({ win: !!r.win, you: r.score?.you ?? 0, cpu: r.score?.rival ?? 0, best: r.best ?? 0, quit: !!r.quit });
    }
  });
}
