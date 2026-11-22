// El pueblo (game/townGame.js), lo que se hace en las misiones: recoger, visitar, pastorear, los oficios, la carrera,
// la danza, la feria y los detalles de la plaza (animales, campana, bancos, el memorial). Son métodos de TownGame:
// townGame.js los une a su clase (util/mezcla.js), con su this.

import { Actor } from '../actors/people.js';
import { BELL, BENCH_LINES, PET } from '../data/tocar.js';
import { FERIA, CORRALES } from '../data/ferias.js';
import { OFICIO_LAMINA } from '../data/laminas.js';
import { PARTS } from '../data/castillos.js';
import { PLACES } from '../world/layout.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TOWN } from '../world/townBuilder.js';
import { addBox, addCircle, isFree, rectFree } from '../world/colliders.js';
import { clearTrees, clearBushes } from '../world/nature.js';
import { walkable, olvidaZona } from '../world/nav.js';
import { addCard, saveProfile } from './profile.js';
import { choiceGame, infoCard, mashGame, play3d, sequenceGame, timingGame } from '../ui/minigames.js';
import { pasoTaller, escondePaso, quitaPaso } from '../ui/tallerPaso.js';
import { groundHeight, terrainHeight, waterLevelAt } from '../world/heightfield.js';
import { isEU, tr } from '../i18n.js';
import { laminaUrl } from '../ui/laminas.js';
import { laminaTecnica, laminaDe } from '../ui/anatomia.js';
import { lerp } from '../util/math.js';
import { makeGate, makeItem } from './items.js';
import { oficioImg } from '../ui/escudoImg.js';
import { showFicha } from '../ui/ficha.js';
import { SETAS, SETAS_BUENAS, SETAS_MALAS } from '../data/setas.js';
export const ANIMAL = { sheep: ['ovejas', 'sheep'], cows: ['vacas', 'cow'], pottoka: ['pottokas', 'pottoka'], horses: ['caballos', 'pottoka'], goats: ['cabras', 'sheep'], pigs: ['cerdos', 'pig'] };

// casillas a las que se llega andando desde (x0, z0), a menos de R m (la rejilla de caminos, world/nav.js); null si
// alrededor del punto no hay ninguna casilla pisable
function alcance(x0, z0, R) {
  const N = 2 * R + 1, vis = new Uint8Array(N * N), ix = (x, z) => (Math.round(z - z0) + R) * N + (Math.round(x - x0) + R);
  let s = null;
  for (let r = 0; r <= 3 && !s; r++) for (let dx = -r; dx <= r && !s; dx++) for (let dz = -r; dz <= r && !s; dz++) if (walkable(x0 + dx, z0 + dz)) s = [Math.round(x0 + dx), Math.round(z0 + dz)];
  if (!s) return null;
  const q = [s]; vis[ix(s[0], s[1])] = 1;
  while (q.length) {
    const [x, z] = q.pop();
    for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + u, Z = z + v; if (Math.abs(X - x0) > R || Math.abs(Z - z0) > R) continue;
      const k = ix(X, Z); if (vis[k]) continue; vis[k] = 2;
      if (walkable(X, Z)) { vis[k] = 1; q.push([X, Z]); }
    }
  }
  return (x, z) => Math.abs(x - x0) <= R && Math.abs(z - z0) <= R && vis[ix(x, z)] === 1;
}

export class PuebloActividades {
  // ---------- Recoger objetos ----------
  startGather(M, kind, label, near) {
    M.step = 1; M.count = 0;
    const P = PLACES, lm = (k) => TOWN.landmarks.find(l => l.kind === k);
    const c = near === 'farm' ? (TOWN.farm || P.farm) : near === 'cave' ? (lm('cave')?.spot || P.forest) : near === 'river' ? P.riverSpot : near === 'forest' ? P.forest : near === 'church' ? P.church : P[near] || (M.type === 'harvest' ? P.fields : P.market);
    const R = M.type === 'harvest' ? 28 : 26;
    // (las setas: las buenas, una de cada, y entre ellas dos venenosas que se miran y se dejan, data/setas.js. Todas con
    // el mismo letrero, «Mirar la seta»: hay que fijarse en cuál es cuál)
    const setas = kind === 'seta' ? [...Array.from({ length: M.need }, (_, i) => SETAS_BUENAS[i % SETAS_BUENAS.length]), ...SETAS_MALAS] : null;
    const n = setas ? setas.length : M.need;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rnd() * 0.6, r = 6 + this.rnd() * R;
      const s = this.spot({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, 4, true);
      const k = setas ? setas[i] : kind, o = makeItem(k); o.position.set(s.x, terrainHeight(s.x, s.z), s.z); this.scene.add(o);
      this.items.push({ M, x: s.x, z: s.z, obj: o, label: setas ? 'Mirar la seta' : label.split(' (')[0] || 'Recoger', kind: k, seta: setas ? k : null, mala: !!SETAS[k]?.mala });
    }
    this.ui.toast(`${this.stepText(M)}`, M.icon);
  }
  pick(it) {
    const M = it.M;
    if (it.seta) return this.pickSeta(it);
    this.items = this.items.filter(x => x !== it); this.scene.remove(it.obj);
    if (!M) { this.player.rig.doAct('pick', 0.6); this.sound.ui('coin'); this.mochila.addFood(it.food); return; }
    if (it.part != null) {
      const C = M.castle, p = { ...PARTS[it.part], ...(C.own[it.part] || {}) }; this.sound.magic?.(); M.count++;
      if (M.count >= M.need) M.step = 2;
      this.player.frozen = true;
      infoCard(this.ui, { icon: p.icon || 'castle', kicker: `${C.title} · ${M.count} de ${M.need}`, title: p.name, text: p.text, badge: addCard('castillo:' + p.name) ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir buscando' }).finally(() => { this.player.frozen = false; });
      return;
    }
    if (it.find != null) {
      const st = M.site, [, name, text] = st.finds[it.find]; this.player.rig.doAct('pick', 0.8); this.sound.magic?.(); M.count++;
      this.particles.emit({ x: it.x, y: terrainHeight(it.x, it.z) + 0.3, z: it.z }, { n: 20, color: ['#c9a46a', '#8a6a45'], speed: 1.2, size: 0.25, life: 1 });
      if (M.count >= M.need) M.step = 2;
      this.player.frozen = true;
      infoCard(this.ui, { icon: st.icon, kicker: `Hallazgo ${M.count} de ${M.need}`, title: name, text, badge: addCard(st.landmark + ':' + name) ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir excavando' }).finally(() => { this.player.frozen = false; });
      return;
    }
    this.player.rig.doAct('pick', 0.6);
    this.particles.emit({ x: it.x, y: terrainHeight(it.x, it.z) + 0.5, z: it.z }, { n: 24, color: ['#ffe38a', '#ffffff'], speed: 2.2, size: 0.28, life: 0.9 });
    this.sound.ui('coin');
    M.count++;
    this.ui.toast(`${this.stepText(M)}`, M.icon, 1800);
    if (M.count >= M.need) { M.step = 2; this.sound.magic(); this.ui.toast(`¡Ya está! Vuelve con ${M.host.name}`, 'check', 3200); }
  }
  // (una seta de la misión de las setas: la buena, a la cesta, con su nombre y cómo se reconoce; la venenosa se queda en
  // el suelo, sin su brillo, y no cuenta)
  pickSeta(it) {
    const M = it.M, S = SETAS[it.seta], icon = it.seta === 'seta-hongo' ? 'mushroom' : it.seta;   // (el hongo, con el dibujo del autor; las demás, con su modelo)
    this.items = this.items.filter(x => x !== it);
    this.player.frozen = true;
    if (S.mala) {
      if (it.obj.userData.ring) it.obj.userData.ring.visible = false;
      this.sound.ui('open');
      infoCard(this.ui, { icon, kicker: 'Esta no se coge', title: S.name, text: S.text, button: 'La dejo en su sitio' }).finally(() => { this.player.frozen = false; });
      return;
    }
    this.scene.remove(it.obj);
    this.player.rig.doAct('pick', 0.6); this.sound.ui('coin'); M.count++;
    this.particles.emit({ x: it.x, y: terrainHeight(it.x, it.z) + 0.3, z: it.z }, { n: 16, color: ['#c9a46a', '#f2e6c8'], speed: 1.2, size: 0.22, life: 0.9 });
    if (M.count >= M.need) M.step = 2;
    infoCard(this.ui, { icon, kicker: `A la cesta · ${M.count} de ${M.need}`, title: S.name, text: S.text, badge: addCard('seta:' + S.name) ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir buscando' })
      .finally(() => { this.player.frozen = false; if (M.count >= M.need) this.sound.magic(); });
  }
  // ---------- Visitar lugares ----------
  startVisit(M) {
    M.step = 1; M.count = 0;
    const ch = TOWN.church;
    M.places[0].at = ch?.door || PLACES.church;
    for (let k = 1; k < M.places.length; k++) { const l = TOWN.landmarks[k - 1]; M.places[k].at = l?.spot || PLACES.plaza; }
  }
  checkArrival() {
    const P = this.player.pos;
    for (const M of this.missions) {
      if (M.done) continue;
      if (M.type === 'visit' && M.step === 1 && this.mode === 'play' && !this.ui.busy) {
        for (const p of M.places) if (!p.seen && Math.hypot(P.x - p.at.x, P.z - p.at.z) < (p.kind === 'church' ? 8 : 9)) { p.seen = true; this.showPlace(M, p); break; }
      }
      if (M.type === 'feria' && M.step === 2 && M.fair && this.mode === 'play' && !this.ui.busy && Math.hypot(P.x - M.fair.pista.x, P.z - M.fair.pista.z) < 5) this.judgeFair(M);
      if (M.type === 'dance' && M.step === 1 && this.mode === 'play' && !this.ui.busy && Math.hypot(P.x - this.plazaStage().x, P.z - this.plazaStage().z) < 5) this.startDance(M);
    }
  }
  async showPlace(M, p) {
    M.count++;
    const kicker = p.kind === 'church' ? (p.label || { romanesque: 'Arte románico', gothic: 'Arte gótico', baroque: 'Arte barroco', fortress: 'Iglesia-fortaleza', cathedral: 'Catedral', pamplona: 'Catedral' }[p.style] || 'Iglesia') : 'Patrimonio de ' + this.def.name;
    const isNew = addCard(this.def.id + ':' + p.name, 'arquitectura');
    this.sound.magic();
    await infoCard(this.ui, { icon: p.kind === 'church' ? (p.style === 'cathedral' || p.style === 'pamplona' ? 'cathedral' : p.style === 'fortress' ? 'castle' : 'church') : p.kind, kicker, title: p.name, text: p.text, badge: isNew ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : `Seguir (${M.count}/${M.need})` });
    if (M.count >= M.need) M.step = 2;
    saveProfile();
  }
  // ---------- Rebaño ----------
  startHerd(M) {
    M.step = 1; M.count = 0;
    const pen = TOWN.pen;
    const kind = ANIMAL[M.m.animal]?.[1] || 'sheep';
    let pool = this.fauna.animals.filter(a => a.kind === kind && Math.hypot(a.pos.x - pen.x, a.pos.z - pen.z) < 160);
    if (pool.length < M.need) pool = this.fauna.animals.filter(a => a.kind === 'sheep');
    this.herd = pool.slice(0, M.need);
    // delante de la puerta (al sur o al norte, world/townBuilder.js), ni árboles ni matas que la tapen
    const gs = pen.gate || 1, zg = pen.gz ?? pen.z + pen.d / 2, ry = gs > 0 ? 0 : Math.PI;
    clearTrees(pen.x, zg, 6, 7, ry); clearBushes(pen.x, zg, 6, 7, ry); olvidaZona(pen.x - 5, zg, pen.x + 5, zg + gs * 9);
    // colocar el rebaño a una distancia razonable del redil, del lado de la puerta y solo donde se llega andando hasta ella
    // (la rejilla de caminos): que ni la cuadra ni una casa ni el agua dejen a ninguno sin camino
    const llega = alcance(pen.x, zg + gs * 2.5, 46), fuera = (x, z) => Math.abs(x - pen.x) > pen.w / 2 + 2 || Math.abs(z - pen.z) > pen.d / 2 + 2;
    const sirve = (x, z) => fuera(x, z) && (!llega || llega(x, z));
    this.herd.forEach((s, i) => {
      const a = i / this.herd.length * 1.6 - 0.8;
      let sp = this.spot({ x: pen.x + Math.sin(a) * 18, z: zg + gs * (16 + Math.cos(a) * 6) }, 4, true, 1.6, sirve);
      // (si ahí no hay sitio con camino, por los lados del redil y más lejos)
      for (let k = 0; k < 24 && llega && !sirve(sp.x, sp.z); k++) {
        const b = (k % 8) / 8 * Math.PI * 2 + a, r = 14 + Math.floor(k / 8) * 8;
        sp = this.spot({ x: pen.x + Math.sin(b) * r, z: pen.z + Math.cos(b) * r }, 4, true, 1.6, sirve);
      }
      s.follow = null; s.pos.set(sp.x, groundHeight(sp.x, sp.z), sp.z); s.home = { x: sp.x, z: sp.z }; s.range = 4; s.fleeDist = kind === 'cow' ? 5 : 4.2; s.run = kind === 'cow' ? 2.4 : 2.8; s.herd = true; s.penned = false; s.bounds = null;
    });
    this.herdM = M;
  }
  updateHerd() {
    const pen = TOWN.pen, M = this.herdM;
    const inPen = (s) => Math.abs(s.pos.x - pen.x) < pen.w / 2 - 0.6 && Math.abs(s.pos.z - pen.z) < pen.d / 2 - 0.6;
    let n = 0;
    for (const s of this.herd) {
      if (!s.penned && inPen(s)) {
        // ya dentro: entra caminando tranquilo hacia el centro y luego pasta por el redil (el cercado es un poco más
        // amplio que la zona en la que cuenta como dentro, para que no se quede atrapado en el borde)
        s.penned = true; s.fleeDist = 0; s.home = { x: pen.x, z: pen.z }; s.range = Math.max(1, Math.min(pen.w, pen.d) / 2 - 1.6);
        s.state = 'walk'; s.timer = 6; s.target = { x: pen.x + (Math.random() - 0.5) * pen.w * 0.4, z: pen.z + (Math.random() - 0.5) * pen.d * 0.4 };
        s.bounds = (X, Z) => Math.abs(X - pen.x) < pen.w / 2 - 0.35 && Math.abs(Z - pen.z) < pen.d / 2 - 0.35;
        if (s.kind === 'cow') this.sound.moo(s.pos); else if (s.kind === 'pig') this.sound.oink?.(s.pos); else this.sound.baa(s.pos);
        this.sound.ui('coin'); this.particles.emit({ x: s.pos.x, y: s.pos.y + 1.2, z: s.pos.z }, { n: 12, color: '#ffe38a', speed: 1.5, size: 0.25 });
      }
      if (s.penned) n++;
    }
    if (n !== M.count) { M.count = n; this.ui.toast(this.stepText(M), M.icon, 1500); }
    if (n >= this.herd.length) { this.herd = null; M.step = 2; this.sound.magic(); this.ui.toast(`¡Todos en el redil! Vuelve con ${M.host.name}`, 'check', 3000); }
  }
  // ---------- Oficios ----------
  // Taller guiado: herramientas, pasos explicados con una acción cada uno y, al final, el antes y el ahora
  async doTrade(M) {
    if (M.oficio) return this.doWorkshop(M);
    const t = M.trade;
    this.player.frozen = true; this.mode = 'mini';
    this.player.heading = Math.atan2(M.bench.x - this.player.pos.x, M.bench.z - this.player.pos.z);
    this.ui.onMiniHit = (ok) => { if (ok) { this.player.rig.doAct(t.act === 'wave' ? 'point' : t.act, 0.45); this.particles.emit({ x: M.bench.x, y: groundHeight(M.bench.x, M.bench.z) + 1, z: M.bench.z }, { n: 10, color: t.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); } };
    let r;
    try {
      r = t.game === 'mash' ? await mashGame(this.ui, { title: M.title, hint: t.hint, icon: t.icon, verb: t.verb, seconds: 7, goal: 32, art: t.art })
        : await timingGame(this.ui, { title: M.title, hint: t.hint, icon: t.icon, verb: t.verb, rounds: 5, need: 3, zone: 0.2, speed: 0.6, art: t.art });
    } finally { this.ui.onMiniHit = null; this.player.frozen = false; this.mode = 'play'; }
    if (r.win) { this.player.rig.doCheer(); await this.say(M.host, [`¡Tienes buenas manos! El oficio de ${t.title.toLowerCase()} pasaba de padres a hijos.`]); await this.complete(M, { card: M.title, cardText: M.m.text }); }
    else await this.say(M.host, ['¡Casi! Vuelve a intentarlo cuando quieras en el banco de trabajo.']);
  }
  // El taller de verdad (game/talleres.js): la cámara va de puesto en puesto, el maestro se pone en cada uno y una leyenda
  // abajo, sin velo, cuenta cada herramienta y cada paso delante de lo que se usa; el minijuego de cada paso, como siempre
  async doWorkshop(M) {
    const T = M.taller; if (!T) return this.doWorkshopBanco(M);
    const of = M.oficio, n = of.steps.length, P = this.player, host = M.host, F = this.follow;
    const eu = isEU(), oname = eu ? (of.eu || of.name) : of.name;
    const espera = (ms) => new Promise(r => setTimeout(r, ms));
    P.frozen = true; this.mode = 'mini'; this.ui.hudVisible?.(false);
    // el explorador, dentro y a un lado, como un aprendiz; la cámara, del plano de siempre al plano del taller entero
    { const a = T.puestos.aprendiz?.de, f = T.puestos.yunque?.foco || T.puestos.taller.foco; if (a) P.place(a.x, a.z, Math.atan2(f.x - a.x, f.z - a.z)); }
    // (y el maestro, ya dentro, esperando: si se quedó junto a la plaza, se pone en el taller antes de que llegue la cámara)
    { const m = T.puestos.maestro?.de; if (host && m && Math.hypot(host.pos.x - m.x, host.pos.z - m.z) > 1.5) { host.cancelPath?.(); host.state = 'idle'; host.target = null; host.setPos(m.x, m.z, Math.atan2(P.pos.x - m.x, P.pos.z - m.z)); } }
    // (si se vuelve a medias, el taller enseña lo ya hecho: la masa, el bloque desbastado...)
    while (T.hecho < (M.tstep || 0)) T.paso(T.pasos[T.hecho]);
    const C = F.cinematic = { pos: T.puestos.taller.cam.clone(), look: T.puestos.taller.foco.clone(), t: 0 };
    const ve = (id) => {
      const p = T.puestos[id]?.cam ? T.puestos[id] : T.puestos.taller;
      T.señala(p === T.puestos.taller ? null : id);
      if (F.cinematic !== C) F.cinematic = C;
      C.pos.copy(p.cam); C.look.copy(p.foco);
      if (host && p.de) this.alPuesto(T, host, p.de, p.foco);
      host?.say?.(3.5);
    };
    this.ui.onMiniHit = (ok) => { if (!ok) return; P.rig.doAct(of.act === 'wave' ? 'point' : of.act, 0.45); const f = T.puestos[T.activo]?.foco; if (f) this.particles.emit(f, { n: 10, color: T.kind === 'cantero' ? ['#e9e1cf', '#cfc3a8'] : of.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); };
    let finished = false;
    try {
      if (!M.tstep) {
        ve('taller'); await espera(400);
        await pasoTaller(this.ui, { kicker: eu ? oname : `${of.name}${of.eu ? ' · ' + of.eu : ''}`, title: M.title, text: of.intro, button: 'Las herramientas' });
        for (let k = 0; k < of.tools.length; k++) {
          const [es, ek, what] = of.tools[k]; ve(T.herramientas[k]);
          await pasoTaller(this.ui, { kicker: 'Las herramientas', i: k, n: of.tools.length, title: eu ? (ek || es) : es, eu: eu ? '' : ek, text: what, button: k < of.tools.length - 1 ? 'Siguiente' : '¡A trabajar!' });
        }
      }
      while (M.tstep < n) {
        const st = of.steps[M.tstep], id = T.pasos[M.tstep], title = `Paso ${M.tstep + 1} de ${n}: ${st.title}`;
        ve(id);
        if (st.game !== 'choice') await pasoTaller(this.ui, { kicker: 'Cómo se hace', i: M.tstep, n, title: st.title, text: st.text, button: st.game === 'order' ? 'Ordenar' : st.verb || 'Hacerlo' });
        else await espera(700);
        escondePaso(); T.fuerza = 1;
        let r;
        try { r = await this.juegoPaso(of, st, title); } finally { T.fuerza = 0; }
        if (r.quit) { quitaPaso(); this.sueltaTaller(T, host, C); await this.say(M.host, ['Cuando quieras, seguimos donde lo has dejado.']); return; }
        if (!r.win && !r.error) { quitaPaso(); this.sueltaTaller(T, host, C); await this.say(M.host, ['¡Casi! Así se aprende: vuelve a probar este paso en el taller.']); return; }
        // lo hecho se ve en el taller: la herradura al rojo, el vapor de la pila…
        T.paso(id, r); await espera(1100);
        M.tstep++;
      }
      finished = true;
    } finally { this.ui.onMiniHit = null; if (!finished) { quitaPaso(); this.sueltaTaller(T, host, C); } }
    if (!finished) return;
    // el final, con el taller entero detrás: la lámina técnica (si la hay), el antes y el ahora y la misión cumplida
    quitaPaso(); ve('taller'); T.señala(null); P.rig.doCheer();
    try {
      const lam = laminaDe(M.m.kind); if (lam) await laminaTecnica(this.ui, lam, { button: 'Seguir' });
      await infoCard(this.ui, { icon: of.icon, lamina: laminaUrl(OFICIO_LAMINA[M.m.kind]), kicker: 'Antes y ahora', title: of.product, text: eu ? `Horrela aritzen zen ${oname.toLowerCase()}.` : `Así trabajaba ${of.name === 'Panadera' || of.name === 'Alpargatera' || of.name === 'Hilandera' ? 'la' : 'el'} ${of.name.toLowerCase()}.`, extra: `<div class="antes-ahora"><div><b>Antes</b>${of.then}</div><div><b>Ahora</b>${of.now}</div></div>`, button: '¡Lo he aprendido!' });
    } finally { this.sueltaTaller(T, host, C); }
    const ord = of.steps.find(s => s.game === 'order')?.items, low = (x) => x[0].toLowerCase() + x.slice(1);
    await this.complete(M, { card: M.title, cardText: eu ? `Nola egiten zen: ${(ord || of.steps.filter(s => s.game !== 'choice').map(s => s.title)).map(x => low(tr(x))).join(', ')}.` : `Cómo se hacía: ${(ord || of.steps.filter(s => s.game !== 'choice').map(s => s.title)).map(low).join(', ')}.` });
  }
  // el minijuego de un paso de oficio (el mismo en el taller y en el banco)
  juegoPaso(of, st, title) {
    if (st.game === 'choice') return choiceGame(this.ui, { title, icon: of.icon, q: isEU() ? `${tr(st.text)} ${tr(st.q)}` : `${st.text} ${st.q}`, options: st.options, answer: st.answer, why: st.why });
    if (st.game === 'order') return sequenceGame(this.ui, { title, icon: of.icon, hint: 'Toca los pasos en el orden en que se hacían', steps: st.items });
    if (st.game === 'mash') return mashGame(this.ui, { title, hint: st.text, icon: of.icon, verb: st.verb, seconds: 7, goal: 28, art: st.art });
    if (st.game === 'forge') return play3d('forgeGame', this.ui, { title: st.title });
    if (st.game === 'stitch') return play3d('stitchGame', this.ui, { title: st.title });
    if (st.game === 'shear') return play3d('shearGame', this.ui, { title: st.title });
    return timingGame(this.ui, { title, hint: st.text, icon: of.icon, verb: st.verb, rounds: st.rounds || 4, need: st.need || 3, zone: 0.22, speed: 0.6, art: st.art });
  }
  // el maestro va andando a su puesto y se queda mirando a lo que enseña (si en 3,5 s no ha llegado, se pone allí: townGame.update)
  alPuesto(T, host, de, mira) {
    host.ignorePlayer = true; host.mira = mira; host.cancelPath?.(); host.goal = null; host.path = [];
    if (Math.hypot(host.pos.x - de.x, host.pos.z - de.z) < 0.4) { host.state = 'idle'; host.target = null; T.dest = null; return; }
    host.target = { x: de.x, z: de.z }; host.state = 'walk'; host.arrived = false; host.stuck = 0;
    T.maestro = host; T.dest = { x: de.x, z: de.z, t: 0 };
  }
  // se acaba el taller (o se deja a medias): la cámara vuelve al explorador sin corte, el maestro deja de mirar al puesto
  sueltaTaller(T, host, C) {
    T.señala(null); T.fuerza = 0;
    if (host) { host.mira = null; host.ignorePlayer = false; }
    const F = this.follow, P = this.player, cam = this.camera;
    if (F.cinematic === C) { F.cinematic = null; F.yaw = P.heading + Math.PI; F.salida = { pos: cam.position.clone(), look: (C.lookCur || C.look).clone(), t: 0, fov: cam.fov }; }
    this.ui.hudVisible?.(true); P.frozen = false; this.mode = 'play';
  }
  async doWorkshopBanco(M) {
    const of = M.oficio, n = of.steps.length;
    // (en euskera, el oficio con su nombre vasco y las frases que se componen ya montadas en euskera)
    const eu = isEU(), oname = eu ? (of.eu || of.name) : of.name;
    this.player.frozen = true; this.mode = 'mini';
    this.player.heading = Math.atan2(M.bench.x - this.player.pos.x, M.bench.z - this.player.pos.z);
    this.ui.onMiniHit = (ok) => { if (ok) { this.player.rig.doAct(of.act === 'wave' ? 'point' : of.act, 0.45); this.particles.emit({ x: M.bench.x, y: groundHeight(M.bench.x, M.bench.z) + 1, z: M.bench.z }, { n: 10, color: T.kind === 'cantero' ? ['#e9e1cf', '#cfc3a8'] : of.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); } };
    let finished = false;
    try {
      if (!M.tstep) {
        const list = of.tools.map(([es, ek, what]) => eu ? `<li><b>${ek || es}</b><i></i><span>${what}</span></li>` : `<li><b>${es}</b>${ek ? `<i>${ek}</i>` : '<i></i>'}<span>${what}</span></li>`).join('');
        await infoCard(this.ui, { icon: of.icon, lamina: laminaUrl(OFICIO_LAMINA[M.m.kind]), kicker: 'Las herramientas', title: eu ? oname : `${of.name}${of.eu ? ' · ' + of.eu : ''}`, text: 'Esto es lo que se usaba en el taller:', extra: `<ul class="tools">${list}</ul>`, button: '¡A trabajar!' });
      }
      while (M.tstep < n) {
        const st = of.steps[M.tstep], title = `Paso ${M.tstep + 1} de ${n}: ${st.title}`;
        if (st.game !== 'choice') await infoCard(this.ui, { icon: of.icon, image: oficioImg(M.m.kind) || '', kicker: eu ? `${oname} · ${M.tstep + 1}/${n} urratsa` : `${of.name} · paso ${M.tstep + 1} de ${n}`, title: st.title, text: st.text, button: st.game === 'order' ? 'Ordenar' : st.verb || 'Hacerlo' });
        let r;
        if (st.game === 'choice') r = await choiceGame(this.ui, { title, icon: of.icon, q: eu ? `${tr(st.text)} ${tr(st.q)}` : `${st.text} ${st.q}`, options: st.options, answer: st.answer, why: st.why });
        else if (st.game === 'order') r = await sequenceGame(this.ui, { title, icon: of.icon, hint: 'Toca los pasos en el orden en que se hacían', steps: st.items });
        else if (st.game === 'mash') r = await mashGame(this.ui, { title, hint: st.text, icon: of.icon, verb: st.verb, seconds: 7, goal: 28, art: st.art });
        else if (st.game === 'forge') r = await play3d('forgeGame', this.ui, { title: st.title });
        else if (st.game === 'stitch') r = await play3d('stitchGame', this.ui, { title: st.title });
        else if (st.game === 'shear') r = await play3d('shearGame', this.ui, { title: st.title });
        else r = await timingGame(this.ui, { title, hint: st.text, icon: of.icon, verb: st.verb, rounds: st.rounds || 4, need: st.need || 3, zone: 0.22, speed: 0.6, art: st.art });
        // si la escena 3D no se pudo montar, el paso no bloquea el taller: se da por visto
        if (r.quit) { await this.say(M.host, ['Cuando quieras, seguimos donde lo has dejado.']); return; }
        if (!r.win && !r.error) { await this.say(M.host, ['¡Casi! Así se aprende: vuelve a probar este paso en el banco de trabajo.']); return; }
        M.tstep++;
      }
      finished = true;
    } finally { this.ui.onMiniHit = null; this.player.frozen = false; this.mode = 'play'; }
    if (!finished) return;
    this.player.rig.doCheer();
    // (si el oficio tiene lámina técnica —la ferrería del herrero—, antes de «Antes y ahora» se ve cómo funcionaba por dentro)
    const lam = laminaDe(M.m.kind); if (lam) await laminaTecnica(this.ui, lam, { button: 'Seguir' });
    await infoCard(this.ui, { icon: of.icon, lamina: laminaUrl(OFICIO_LAMINA[M.m.kind]), kicker: 'Antes y ahora', title: of.product, text: eu ? `Horrela aritzen zen ${oname.toLowerCase()}.` : `Así trabajaba ${of.name === 'Panadera' || of.name === 'Alpargatera' || of.name === 'Hilandera' ? 'la' : 'el'} ${of.name.toLowerCase()}.`, extra: `<div class="antes-ahora"><div><b>Antes</b>${of.then}</div><div><b>Ahora</b>${of.now}</div></div>`, button: '¡Lo he aprendido!' });
    const ord = of.steps.find(s => s.game === 'order')?.items, low = (x) => x[0].toLowerCase() + x.slice(1);
    await this.complete(M, { card: M.title, cardText: eu ? `Nola egiten zen: ${(ord || of.steps.filter(s => s.game !== 'choice').map(s => s.title)).map(x => low(tr(x))).join(', ')}.` : `Cómo se hacía: ${(ord || of.steps.filter(s => s.game !== 'choice').map(s => s.title)).map(low).join(', ')}.` });
  }
  // ---------- Carrera por aros ----------
  startRace(M) {
    M.step = 1; M.count = 0;
    for (const g of this.gates) this.scene.remove(g.obj);
    this.gates = [];
    // recorrido: de la salida a la plaza, a la iglesia, a un monumento y de vuelta
    // en Pamplona, el encierro de verdad: de los corrales de Santo Domingo a la plaza de toros por la Estafeta
    const pts = M.m.kind === 'encierro' && PLACES.encierro ? PLACES.encierro
      : [PLACES.spawn, PLACES.plaza, TOWN.church?.door || PLACES.church, ...(TOWN.landmarks.slice(0, 2).map(l => l.spot)), PLACES.market, PLACES.plaza];
    const route = [];
    for (let i = 0; i < M.need; i++) {
      const f = (i + 1) / (M.need + 1) * (pts.length - 1), k = Math.floor(f), t = f - k;
      const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
      route.push(this.spot({ x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) }, 3));
    }
    route.forEach((p, i) => {
      const nx = route[i + 1] || route[i - 1];
      const o = makeGate(i === route.length - 1 ? '#3ca05a' : '#f5c542');
      o.position.set(p.x, groundHeight(p.x, p.z), p.z); o.rotation.y = Math.atan2(nx.x - p.x, nx.z - p.z) + (route[i + 1] ? 0 : Math.PI);
      this.scene.add(o); this.gates.push({ x: p.x, z: p.z, obj: o, next: i === 0 });
    });
    let dist = 0; let prev = this.player.pos; for (const p of route) { dist += Math.hypot(p.x - prev.x, p.z - prev.z); prev = p; }
    this.race = { M, t: Math.ceil(dist / 5.2) + 12 };
    this.ui.toast('¡Adelante! Pasa por el aro dorado', 'running', 2200);
  }
  updateRace(dt) {
    const R = this.race; if (!R) return; const M = R.M;
    R.t -= dt;
    const g = this.gates.find(g => g.next);
    if (g && Math.hypot(g.x - this.player.pos.x, g.z - this.player.pos.z) < 2.6) {
      g.next = false; g.obj.visible = false; M.count++; this.sound.ui('coin'); this.particles.emit({ x: g.x, y: groundHeight(g.x, g.z) + 2.2, z: g.z }, { n: 30, color: '#ffe38a', speed: 3, size: 0.3 });
      const n = this.gates.find(x => x.obj.visible); if (n) n.next = true;
      R.t += 3;
    }
    this.ui.setMG(`<b>${M.title}</b><span class="big">${Math.max(0, R.t).toFixed(1)} s</span><small>Aros ${M.count}/${M.need}</small>`);
    if (M.count >= M.need) { this.race = null; this.ui.setMG(null); M.step = 2; this.player.rig.doCheer(); this.sound.fanfare(); this.ui.toast(`¡Meta! Vuelve con ${M.host.name}`, 'trophy', 3000); for (const x of this.gates) this.scene.remove(x.obj); this.gates = []; }
    else if (R.t <= 0) { this.race = null; this.ui.setMG(null); M.step = 1; for (const x of this.gates) this.scene.remove(x.obj); this.gates = []; this.ui.toast(`¡Se acabó el tiempo! Habla con ${M.host.name} para repetir`, 'clock', 3500); this.sound.ui('error'); }
  }
  // ---------- Danza (ritmo) ----------
  startDance(M) {
    this.mode = 'dance'; this.danceM = M;
    const c = this.plazaStage(), y = terrainHeight(c.x, c.z);
    this.player.place(c.x, c.z, 0); this.player.frozen = true;
    const cols = M.m.colors || ['#ffffff', '#d42f2f'];
    this.dancers = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = c.x + Math.sin(a) * 3.2, z = c.z + Math.cos(a) * 3.2;
      const d = new Actor({ id: 'd' + i, name: 'Dantzari', x, z, heading: a + Math.PI, look: { shirt: cols[0], pants: cols[0], sash: cols[1], scarf: cols[1], txapela: i % 2 ? cols[1] : undefined, espadrille: true, laces: cols[1], ribbons: i % 2 === 0 ? [cols[1], '#f2c230'] : undefined } }, this.scene);
      d.collider.ghost = true; this.dancers.push(d);
    }
    this.follow.cinematic = { pos: new THREE.Vector3(c.x + 8, y + 4, c.z + 9), look: new THREE.Vector3(c.x, y + 1.3, c.z), t: 0 };
    this.sound.setMusic(false);
    const beat = 60 / 104, pat = [0, 3, 0, 3, 1, 2, 1, 2, 0, 1, 2, 3, 3, 2, 1, 0, 0, 3, 1, 2, 2, 1, 3, 0];
    this.dn = { seq: pat.map((l, i) => ({ t: 2 + i * beat * (i < 12 ? 2 : 1.5), lane: l })), t: 0, i: 0, hits: 0, notes: [], fall: 1.8, beat };
    this.dn.total = this.dn.seq.length;
    this.rh = this.ui.rhythm((lane) => this.dancePress(lane));
    this.rh.feedback('¡Prepárate!');
    this.ui.setMG(`<b>${M.title}</b><small>Aciertos: <span id="dnN">0</span>/${this.dn.total}</small>`);
    this.danceKeys = (e) => { const k = e.key.toLowerCase(); const map = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowdown: 2, s: 2, arrowright: 3, d: 3 }; if (k in map) { e.preventDefault(); e.stopPropagation(); this.dancePress(map[k]); } };
    addEventListener('keydown', this.danceKeys, true);
  }
  dancePress(lane) {
    const D = this.dn; if (!D) return;
    this.rh.flash(lane);
    let best = null, bd = 1;
    for (const n of D.notes) if (!n.done && n.lane === lane) { const dt = Math.abs(D.t - n.t); if (dt < bd) { bd = dt; best = n; } }
    if (best && bd < 0.28) {
      best.done = true; best.el.classList.add('hit'); D.hits++;
      this.rh.feedback(bd < 0.1 ? '¡Perfecto!' : '¡Bien!');
      this.sound.tone([392, 440, 523, 587][lane] * 2, 0.15, 'triangle', 0.1, this.sound.sfx);
      const el = document.getElementById('dnN'); if (el) el.textContent = D.hits;
      this.player.rig.doWave();
    } else this.rh.feedback('¡Uy!');
  }
  updateDance(dt) {
    const D = this.dn; if (!D) return;
    D.t += dt;
    // música sencilla de txistu y tambor
    const b = Math.floor(D.t / D.beat);
    if (b !== D.lastB && D.t > 1) { D.lastB = b; this.sound.tone([523, 587, 659, 587, 523, 440, 392, 440][b % 8], D.beat * 0.8, 'triangle', 0.06, this.sound.sfx); if (b % 2 === 0) this.sound.noiseBurst(0.08, 180, 1, 0.35, this.sound.sfx); }
    while (D.i < D.seq.length && D.seq[D.i].t - D.fall <= D.t) { const s = D.seq[D.i++]; const el = this.rh.addNote(s.lane); D.notes.push({ ...s, el }); }
    for (const n of D.notes) {
      const k = 1 - (n.t - D.t) / D.fall;
      n.el.style.top = (k * 78) + '%';
      if (!n.done && D.t - n.t > 0.3) { n.done = true; n.el.classList.add('miss'); }
      if (D.t - n.t > 0.6) n.el.remove();
    }
    const amt = D.hits > 0 ? 5 : 0;
    this.dancers.forEach((d, i) => { d.dance = amt ? amt + i * 0.01 : 0; d.update(dt, this.player); });
    if (this.follow.cinematic) this.follow.cinematic.t += dt;
    if (D.i >= D.seq.length && D.t > D.seq[D.seq.length - 1].t + 1) this.endDance();
  }
  async endDance() {
    const D = this.dn, M = this.danceM; this.dn = null;
    removeEventListener('keydown', this.danceKeys, true); this.rh.remove(); this.ui.setMG(null);
    const win = D.hits >= Math.ceil(D.total * 0.55);
    if (win) { this.dancers.forEach(d => d.dance = 5); this.player.rig.doCheer(); this.particles.confetti?.(this.player.pos, 80); }
    await new Promise(r => setTimeout(r, 1200));
    this.follow.cinematic = null; this.player.frozen = false; this.mode = 'play';
    for (const d of this.dancers) { this.scene.remove(d.obj); d.collider.ghost = true; }
    this.dancers = [];
    this.sound.setMusic(this.P.settings.music);
    this.follow.snap(this.player);
    if (win) { await this.say(M.host, [`¡Has bailado ${M.title} como en las fiestas! ${D.hits}/${D.total} pasos.`]); await this.complete(M, { card: M.title, cardText: M.m.text }); }
    else { M.step = 1; await this.say(M.host, [`${D.hits}/${D.total}. Hacen falta ${Math.ceil(D.total * 0.55)}. ¡Vuelve al centro de la plaza para probar otra vez!`]); this.player.place(PLACES.plaza.x + 6, PLACES.plaza.z + 6, 0); }
  }
  // Feria de ganado: un corral por animal (vacas, bueyes, pottokas, burro, ovejas, cabras y cerdos), cada uno con su
  // cartel, en dos filas a los lados de un pasillo, y al final la pista del concurso con la mesa del jurado. Se recorren los
  // corrales conociendo a cada animal (su ficha de fauna o lo que cuenta el ganadero), luego se juzga en la pista y se
  // cierra el trato con el tratante. Las vallas, en dos mallas, y los carteles, en una sola con todos los nombres: antes
  // cada tabla y cada poste era una malla (unas 70 llamadas de dibujo para tres corrales)
  buildFair(M, hostPos) {
    const R = this.rnd, P0 = PLACES.plaza, COL = 12.5; let c = null;
    // (un prado llano y despejado a las afueras: los corrales y la pista ocupan unos 50 × 24 m)
    const clear = (x, z) => { if (waterLevelAt(x, z) > groundHeight(x, z) - 0.3) return false; const h0 = groundHeight(x, z); for (let dx = -26; dx <= 26; dx += 5.2) for (let dz = -12; dz <= 12; dz += 4) { const qx = x + dx, qz = z + dz; if (!isFree(qx, qz, 1.5) || this.nearHouses(qx, qz, 9) || Math.abs(groundHeight(qx, qz) - h0) > 2.4 || waterLevelAt(qx, qz) > groundHeight(qx, qz) - 0.3) return false; } return true; };
    for (let r = 45; r <= 200 && !c; r += 12) for (let a = 0; a < 6.28 && !c; a += 0.35) { const x = P0.x + Math.cos(a) * r, z = P0.z + Math.sin(a) * r; if (clear(x, z)) c = { x, z }; }
    // (si no hay prado despejado, uno con árboles o matas, que se quitan, y hasta 320 m: antes, sin prado, los corrales iban
    // junto al tratante y en Lumbier caían encima de una casa)
    const conArboles = (x, z) => { if (!rectFree(x, z, 0, -27, 27, -13, 13, 0.5, true)) return false; const h0 = groundHeight(x, z); for (let dx = -26; dx <= 26; dx += 5.2) for (let dz = -12; dz <= 12; dz += 4) { const qx = x + dx, qz = z + dz; if (this.nearHouses(qx, qz, 9) || Math.abs(groundHeight(qx, qz) - h0) > 2.4 || waterLevelAt(qx, qz) > groundHeight(qx, qz) - 0.3) return false; } return true; };
    for (let r = 45; r <= 320 && !c; r += 12) for (let a = 0; a < 6.28 && !c; a += 0.35) { const x = P0.x + Math.cos(a) * r, z = P0.z + Math.sin(a) * r; if (conArboles(x, z)) { c = { x, z }; clearTrees(x, z - 14, 56, 28, 0); clearBushes(x, z - 14, 56, 28, 0); } }
    c ||= this.spot({ x: hostPos.x - 16, z: hostPos.z + 8 }, 10);
    const g = new THREE.Group(); g.name = 'feria'; this.scene.add(g);
    const tablas = [], postes = [], carteles = [];
    const tabla = (w, h, d, x, y, z, ang = 0) => { const b = new THREE.BoxGeometry(w, h, d); b.rotateY(ang); b.translate(x, y, z); tablas.push(b); };
    const poste = (x, z, alto = 1.3, r = 0.09) => { const p = new THREE.CylinderGeometry(r * 0.85, r, alto, 6); p.translate(x, groundHeight(x, z) + alto / 2 - 0.1, z); postes.push(p); };
    // los carteles: una textura con todos los nombres, una franja por cartel
    const N = CORRALES.length + 1, cv = document.createElement('canvas'); cv.width = 512; cv.height = 128 * N; const cx = cv.getContext('2d');
    const rotulo = (k, texto, sub) => { const y = k * 128; cx.fillStyle = '#efe2c0'; cx.fillRect(0, y, 512, 128); cx.strokeStyle = '#6b4424'; cx.lineWidth = 10; cx.strokeRect(5, y + 5, 502, 118); cx.fillStyle = '#3a2412'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = `900 ${texto.length > 12 ? 48 : 58}px "MZ Texto", sans-serif`; cx.fillText(texto.toUpperCase(), 256, y + (sub ? 54 : 66)); if (sub) { cx.font = '700 26px "MZ Texto", sans-serif'; cx.fillStyle = '#7a5530'; cx.fillText(sub, 256, y + 98); } };
    const cartel = (k, x, z, mira) => { const y = groundHeight(x, z) + 1.55; const pl = new THREE.PlaneGeometry(1.9, 0.48), uv = pl.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setY(q, 1 - (k + 1 - uv.getY(q)) / N); pl.rotateY(mira); pl.translate(x + Math.sin(mira) * 0.04, y, z + Math.cos(mira) * 0.04); carteles.push(pl); tabla(2.0, 0.56, 0.05, x, y, z, mira); poste(x - Math.cos(mira) * 0.85, z + Math.sin(mira) * 0.85, 1.85, 0.06); poste(x + Math.cos(mira) * 0.85, z - Math.sin(mira) * 0.85, 1.85, 0.06); };
    const pens = [];
    CORRALES.forEach(([kind, n, w, d, ficha, nombre, icon, texto], i) => {
      const fila = i < 4 ? 0 : 1, col = fila ? i - 4 : i, sg = fila ? 1 : -1;   // (fila 0, al norte del pasillo; fila 1, al sur)
      const px = c.x + (col - 1.5) * COL, pz = c.z + sg * (2 + d / 2), frente = c.z + sg * 2;
      for (const [x0, z0, x1, z1] of [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), mx = px + (x0 + x1) / 2, mz = pz + (z0 + z1) / 2;
        for (const hh of [0.45, 0.95]) tabla(0.08, 0.12, len, mx, groundHeight(mx, mz) + hh, mz, ang);
        const nk = Math.round(len / 2.5); for (let k = 0; k <= nk; k++) { const t = k / nk; poste(px + x0 + (x1 - x0) * t, pz + z0 + (z1 - z0) * t); }
        addBox(mx, mz, Math.abs(x1 - x0) + 0.3, Math.abs(z1 - z0) + 0.3, 0);
      }
      rotulo(i, nombre, `Corral ${i + 1}`);
      cartel(i, px, frente + sg * 0.35, fila ? Math.PI : 0);   // (en la valla del pasillo, mirando a él)
      const box = { x0: px - w / 2 + 0.8, x1: px + w / 2 - 0.8, z0: pz - d / 2 + 0.8, z1: pz + d / 2 - 0.8 };
      // (cada uno en su hueco del cercado, sin montarse en otro; y su cuerpo, que choca, va con él: sync)
      const rad = kind === 'cow' || kind === 'cabestro' ? 0.8 : kind === 'pottoka' || kind === 'burro' ? 0.6 : 0.45, puestos = [];
      for (let k = 0; k < n; k++) {
        let ax, az; for (let t = 0; t < 40; t++) { ax = box.x0 + R() * (box.x1 - box.x0); az = box.z0 + R() * (box.z1 - box.z0); if (puestos.every(([x, z]) => Math.hypot(x - ax, z - az) > rad * 2 + 0.2)) break; }
        puestos.push([ax, az]);
        const a = this.fauna.add(kind, ax, az, { range: 2, walk: 0.4, run: 1, flee: 0, radius: rad });
        a.pos.set(ax, groundHeight(ax, az), az); a.home = { x: ax, z: az }; a.bounds = (x, z) => x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1; a.sync();
      }
      pens.push({ kind, x: px, z: pz, fx: px, fz: c.z - sg * 0.2, nombre, ficha, icon, texto, visto: false });
    });
    // la pista del concurso, al final de la fila de abajo: arena redonda que sigue el suelo, postes alrededor (con la
    // entrada hacia el pasillo) y la mesa del jurado con su cartel
    const pista = { x: c.x + 1.5 * COL, z: c.z + 2 + 4.2 }, RP = 3.8;
    const arena = new THREE.CircleGeometry(RP, 28); arena.rotateX(-Math.PI / 2);
    { const pa = arena.attributes.position; for (let q = 0; q < pa.count; q++) { const x = pa.getX(q) + pista.x, z = pa.getZ(q) + pista.z; pa.setXYZ(q, x, groundHeight(x, z) + 0.05, z); } arena.computeVertexNormals(); }
    const mArena = new THREE.Mesh(arena, new THREE.MeshStandardMaterial({ color: '#d8c08a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); mArena.receiveShadow = true; g.add(mArena);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; if (Math.abs(Math.sin(a) + 1) < 0.25) continue; const x = pista.x + Math.cos(a) * RP, z = pista.z + Math.sin(a) * RP; poste(x, z, 1.0, 0.07); addCircle(x, z, 0.12); }
    { const mx = pista.x, mz = pista.z + RP + 1.4, y = groundHeight(mx, mz); tabla(2.4, 0.08, 0.8, mx, y + 0.78, mz); for (const sx of [-1.1, 1.1]) tabla(0.08, 0.76, 0.7, mx + sx, y + 0.38, mz); addBox(mx, mz, 2.5, 0.9, 0); rotulo(N - 1, 'Jurado', 'Concurso de ganado'); cartel(N - 1, mx, mz + 0.55, Math.PI); }
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    for (const [geos, mat] of [[tablas, wood], [postes, dark], [carteles, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })]]) { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = mat !== dark; m.receiveShadow = true; g.add(m); for (const q of geos) q.dispose(); }
    // el tratante espera al principio del pasillo; la gente de la feria, mirando los corrales
    const hs = this.spot({ x: c.x - 2 * COL - 2, z: c.z }, 3); M.host.setPos?.(hs.x, hs.z, Math.atan2(c.x - hs.x, c.z - hs.z));
    const looks = [{ shirt: '#3a4a6a', txapela: '#1d1d24', pants: '#3a3530', hair: '#4a3020', staff: true }, { shirt: '#b5485d', skirt: '#3a3530', pants: '#3a3530', hair: '#2a1a12', bun: true, female: true, basket: true }, { shirt: '#e8e0cc', vest: '#2b2630', pants: '#2b2630', txapela: '#1d1d24', hair: '#bdb6aa', old: true, staff: true }];
    looks.forEach((look, i) => { const pn = pens[[0, 4, 2][i]], s2 = this.spot({ x: pn.fx + 1.5, z: pn.fz }, 2); const a = new Actor({ id: 'feria' + i, name: ['Ganadero', 'Vecina', 'Aitona'][i], x: s2.x, z: s2.z, heading: Math.atan2(pn.x - s2.x, pn.z - s2.z), look }, this.scene); this.walkers.push(a); });
    M.fair = { x: c.x, z: c.z, pens, pista, obj: g }; M.need = pens.length;
  }
  // conocer al animal de un corral: su ficha de fauna (y la carta de la colección) o lo que cuenta el ganadero
  async conoceCorral(M, pen) {
    if (pen.visto || M.step !== 1 || this.player.frozen) return;
    this.player.frozen = true;
    this.player.heading = Math.atan2(pen.x - this.player.pos.x, pen.z - this.player.pos.z);
    try {
      const corral = `Feria de ganado · corral ${M.fair.pens.indexOf(pen) + 1} de ${M.fair.pens.length}`;
      if (pen.ficha) { const nueva = addCard('fauna:' + pen.ficha); await showFicha('fauna:' + pen.ficha, { ui: this.ui, kicker: corral, badge: nueva ? 'Nueva carta' : '', button: 'Siguiente corral' }); }
      else await infoCard(this.ui, { icon: pen.icon, kicker: corral, title: pen.nombre, text: pen.texto, button: 'Siguiente corral' });
      pen.visto = true; M.count = M.fair.pens.filter(p => p.visto).length; this.mochila?.gain(2);
      if (M.count >= M.need) { M.step = 2; this.sound.fanfare?.(); this.ui.toast('¡Ya conoces a todos los animales! Ve a la pista del concurso', 'check', 3600); }
      else this.ui.toast(`${pen.nombre}: ${M.count} de ${M.need} corrales`, pen.icon, 2200);
    } finally { this.player.frozen = false; }
  }
  async judgeFair(M) {
    if (M.judging) return; M.judging = true; this.player.frozen = true;
    try {
      const li = FERIA.breeds.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('');
      await infoCard(this.ui, { icon: 'cow', kicker: 'Concurso de ganado', title: 'Las razas del país', text: 'En las ferias se premia a los mejores animales de las razas de aquí:', extra: `<ul class="tools">${li}</ul>`, button: 'Ser juez' });
      const J = FERIA.judge, ord = [0, 1, 2].sort(() => this.rnd() - 0.5);
      const r = await choiceGame(this.ui, { title: 'Juez por un día', icon: 'cow', q: J.q, options: ord.map(i => J.options[i]), answer: ord.indexOf(J.answer), why: J.why });
      if (r.win) { M.step = 3; this.sound.fanfare?.(); this.ui.toast(`¡Buen ojo! Vuelve con ${M.host.name} y cierra el trato`, 'check', 3000); }
    } finally { this.player.frozen = false; setTimeout(() => { M.judging = false; }, 4000); }
  }
  // ---------- Cosas para tocar ----------
  async petAnimal(a) {
    const I = PET[a.kind]; a.state = 'idle'; a.timer = 3; a.heading = Math.atan2(this.player.pos.x - a.pos.x, this.player.pos.z - a.pos.z);
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z); this.player.rig.doAct?.('pick', 0.5);
    if (I.sound) this.sound[I.sound]?.(a.pos);
    this.particles.emit({ x: a.pos.x, y: a.pos.y + 1.3, z: a.pos.z }, { n: 8, color: ['#ff6b8a', '#ffd1dc'], speed: 0.8, size: 0.22, life: 1 });
    this.mochila?.gain(3);
    const fid = { sheep: 'oveja', cow: 'vaca', pottoka: 'pottoka', goat: 'cabra', pig: 'cerdo' }[a.kind];
    if (addCard('granja:' + a.kind)) { if (fid) addCard('fauna:' + fid); this.player.frozen = true; try { if (fid) await showFicha('fauna:' + fid, { ui: this.ui, kicker: 'Animales de la granja · ficha de fauna', badge: 'Nueva carta', button: '¡Qué suave!' }); else await infoCard(this.ui, { icon: I.icon, kicker: 'Animales de la granja', title: I.title, text: I.fact, badge: 'Nueva carta', button: '¡Qué suave!' }); } finally { this.player.frozen = false; } }
    else this.ui.toast(`A ${I.name} le gusta que la acaricies`, I.icon, 1800);
  }
  async ringBell() {
    if (this.bellT && this.elapsed - this.bellT < 6) return; this.bellT = this.elapsed;
    this.sound.churchBell?.(3); this.player.rig.doAct?.('point', 0.6);
    const ch = TOWN.church; this.particles.emit({ x: ch.door.x, y: groundHeight(ch.door.x, ch.door.z) + 6, z: ch.door.z }, { n: 16, color: ['#FFD700', '#ffffff'], speed: 1.4, size: 0.3, life: 1.4 });
    if (addCard('pueblo:campanas')) { this.player.frozen = true; try { await new Promise(r => setTimeout(r, 1200)); await infoCard(this.ui, { icon: 'bell', kicker: 'Tradiciones', title: BELL.title, text: BELL.fact, badge: 'Nueva carta', button: '¡Ding, dong!' }); } finally { this.player.frozen = false; } }
  }
  async restBench(b) {
    this.player.frozen = true; this.player.place(b.x, b.z, b.ry + Math.PI); this.follow.snap?.(this.player);
    try {
      this.ui.whisper(BENCH_LINES[Math.floor(this.rnd() * BENCH_LINES.length)], 3800);
      await new Promise(r => setTimeout(r, 2600));
      this.mochila?.gain(25); this.ui.toast('Has descansado: +25 de energía', 'energy', 2000);
    } finally { this.player.frozen = false; }
  }
  // ---------- Recuerdo de un personaje: placa, pregunta y su huella hoy ----------
  async doMemorial(M) {
    const F = M.fig;
    if (M.step !== 1 || M.done) { await infoCard(this.ui, { icon: F.icon, lamina: M.figImg, kicker: F.kicker, title: F.name, text: `${F.years}. ${F.today}`, button: 'Seguir explorando' }); return; }
    this.player.frozen = true; this.mode = 'mini';
    let ok = false;
    try {
      this.player.heading = Math.atan2(M.memo.x - this.player.pos.x, M.memo.z - this.player.pos.z);
      const ord = F.q.options.map((_, i) => i).sort(() => this.rnd() - 0.5);
      const r = await choiceGame(this.ui, { title: `La placa de ${F.name}`, icon: F.icon, q: F.q.q, options: ord.map(i => F.q.options[i]), answer: ord.indexOf(F.q.answer), why: F.q.why });
      ok = r.win;
    } finally { this.player.frozen = false; this.mode = 'play'; }
    if (!ok) { this.ui.toast('Vuelve a leer la historia: habla otra vez y prueba de nuevo', F.icon, 3200); M.step = 0; M.memo.obj.userData.ring.visible = false; return; }
    M.memo.obj.userData.ring.visible = false;
    this.player.rig.doCheer();
    await infoCard(this.ui, { icon: F.icon, lamina: M.figImg, kicker: 'Su huella hoy', title: F.name, text: F.today, badge: F.women ? 'Mujeres de Navarra' : 'Personajes de Navarra', button: '¡Lo recordaré!' });
    await this.complete(M, { card: F.name, cardText: F.today });
  }
}
