// El pueblo (game/townGame.js), lo que se hace en las misiones: recoger, visitar, pastorear, los oficios, la carrera,
// la danza, la feria y los detalles de la plaza (animales, campana, bancos, el memorial). Son métodos de TownGame:
// townGame.js los une a su clase (util/mezcla.js), con su this.

import { Actor } from '../actors/people.js';
import { BELL, BENCH_LINES, PET } from '../data/tocar.js';
import { FERIA } from '../data/ferias.js';
import { OFICIO_LAMINA } from '../data/laminas.js';
import { PARTS } from '../data/castillos.js';
import { PLACES } from '../world/layout.js';
import * as THREE from 'three';
import { TOWN } from '../world/townBuilder.js';
import { addBox, isFree } from '../world/colliders.js';
import { addCard, saveProfile } from './profile.js';
import { choiceGame, infoCard, mashGame, play3d, sequenceGame, timingGame } from '../ui/minigames.js';
import { groundHeight, terrainHeight, waterLevelAt } from '../world/heightfield.js';
import { isEU, tr } from '../i18n.js';
import { laminaUrl } from '../ui/laminas.js';
import { lerp } from '../util/math.js';
import { makeGate, makeItem } from './items.js';
import { oficioImg } from '../ui/escudoImg.js';
import { showFicha } from '../ui/ficha.js';
export const ANIMAL = { sheep: ['ovejas', 'sheep'], cows: ['vacas', 'cow'], pottoka: ['pottokas', 'pottoka'], horses: ['caballos', 'pottoka'], goats: ['cabras', 'sheep'], pigs: ['cerdos', 'pig'] };

export class PuebloActividades {
  // ---------- Recoger objetos ----------
  startGather(M, kind, label, near) {
    M.step = 1; M.count = 0;
    const P = PLACES, lm = (k) => TOWN.landmarks.find(l => l.kind === k);
    const c = near === 'farm' ? (TOWN.farm || P.farm) : near === 'cave' ? (lm('cave')?.spot || P.forest) : near === 'river' ? P.riverSpot : near === 'forest' ? P.forest : near === 'church' ? P.church : P[near] || (M.type === 'harvest' ? P.fields : P.market);
    const R = M.type === 'harvest' ? 28 : 26;
    for (let i = 0; i < M.need; i++) {
      const a = (i / M.need) * Math.PI * 2 + this.rnd() * 0.6, r = 6 + this.rnd() * R;
      const s = this.spot({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, 4, true);
      const o = makeItem(kind); o.position.set(s.x, terrainHeight(s.x, s.z), s.z); this.scene.add(o);
      this.items.push({ M, x: s.x, z: s.z, obj: o, label: label.split(' (')[0] || 'Recoger', kind });
    }
    this.ui.toast(`${this.stepText(M)}`, M.icon);
  }
  pick(it) {
    const M = it.M;
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
      if (M.type === 'feria' && M.step === 1 && M.fair && this.mode === 'play' && !this.ui.busy && Math.hypot(P.x - M.fair.x, P.z - M.fair.z) < 9) this.judgeFair(M);
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
    // colocar el rebaño a una distancia razonable del redil
    this.herd.forEach((s, i) => {
      const a = i / this.herd.length * 1.6 - 0.8, sp = this.spot({ x: pen.x + Math.sin(a) * 18, z: pen.z + pen.d / 2 + 16 + Math.cos(a) * 6 }, 4);
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
  async doWorkshop(M) {
    const of = M.oficio, n = of.steps.length;
    // (en euskera, el oficio con su nombre vasco y las frases que se componen ya montadas en euskera)
    const eu = isEU(), oname = eu ? (of.eu || of.name) : of.name;
    this.player.frozen = true; this.mode = 'mini';
    this.player.heading = Math.atan2(M.bench.x - this.player.pos.x, M.bench.z - this.player.pos.z);
    this.ui.onMiniHit = (ok) => { if (ok) { this.player.rig.doAct(of.act === 'wave' ? 'point' : of.act, 0.45); this.particles.emit({ x: M.bench.x, y: groundHeight(M.bench.x, M.bench.z) + 1, z: M.bench.z }, { n: 10, color: of.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); } };
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
  // Feria de ganado: corrales con vacas, ovejas y caballos junto al mercado, un puesto y gente mirando
  buildFair(M, hostPos) {
    // un prado llano y despejado a las afueras (los corrales ocupan unos 40 × 14 m)
    const R = this.rnd, P0 = PLACES.plaza; let c = null;
    const clear = (x, z) => { if (waterLevelAt(x, z) > groundHeight(x, z) - 0.3) return false; const h0 = groundHeight(x, z); for (let dx = -22; dx <= 22; dx += 5.5) for (let dz = -8; dz <= 10; dz += 4.5) { const qx = x + dx, qz = z + dz; if (!isFree(qx, qz, 1.5) || this.nearHouses(qx, qz, 9) || Math.abs(groundHeight(qx, qz) - h0) > 2.2 || waterLevelAt(qx, qz) > groundHeight(qx, qz) - 0.3) return false; } return true; };
    for (let r = 45; r <= 170 && !c; r += 12) for (let a = 0; a < 6.28 && !c; a += 0.35) { const x = P0.x + Math.cos(a) * r, z = P0.z + Math.sin(a) * r; if (clear(x, z)) c = { x, z }; }
    c ||= this.spot({ x: hostPos.x - 16, z: hostPos.z + 8 }, 10);
    // el tratante espera junto a la feria
    const hs = this.spot({ x: c.x + 4, z: c.z + 12 }, 3); M.host.setPos?.(hs.x, hs.z, Math.atan2(c.x - hs.x, c.z - hs.z));
    const g = new THREE.Group(); this.scene.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 });
    const pens = [];
    [['cow', 4, 11, 8], ['sheep', 7, 8, 6], ['pottoka', 2, 8, 6]].forEach(([kind, n, w, d], i) => {
      const px = c.x + (i - 1) * 13, pz = c.z;
      for (const [x0, z0, x1, z1] of [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), mx = px + (x0 + x1) / 2, mz = pz + (z0 + z1) / 2;
        for (const hh of [0.45, 0.95]) { const r_ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, len), wood); r_.position.set(mx, groundHeight(mx, mz) + hh, mz); r_.rotation.y = ang; r_.castShadow = true; g.add(r_); }
        for (let k = 0; k <= Math.round(len / 2.5); k++) { const t = k / Math.round(len / 2.5), qx = px + x0 + (x1 - x0) * t, qz = pz + z0 + (z1 - z0) * t; const po = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.3, 6), dark); po.position.set(qx, groundHeight(qx, qz) + 0.55, qz); g.add(po); }
        addBox(mx, mz, Math.abs(x1 - x0) + 0.3, Math.abs(z1 - z0) + 0.3, 0);
      }
      const box = { x0: px - w / 2 + 0.8, x1: px + w / 2 - 0.8, z0: pz - d / 2 + 0.8, z1: pz + d / 2 - 0.8 };
      // (cada uno en su hueco del cercado, sin montarse en otro: antes salían al azar y alguno quedaba dentro de otro; y su
      // cuerpo, que choca, va con él: sync)
      const rad = kind === 'cow' ? 0.8 : 0.45, puestos = [];
      for (let k = 0; k < n; k++) {
        let ax, az; for (let t = 0; t < 40; t++) { ax = box.x0 + R() * (box.x1 - box.x0); az = box.z0 + R() * (box.z1 - box.z0); if (puestos.every(([x, z]) => Math.hypot(x - ax, z - az) > rad * 2 + 0.2)) break; }
        puestos.push([ax, az]);
        const a = this.fauna.add(kind, ax, az, { range: 2, walk: 0.4, run: 1, flee: 0, radius: rad });
        a.pos.set(ax, groundHeight(ax, az), az); a.home = { x: ax, z: az }; a.bounds = (x, z) => x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1; a.sync();
      }
      pens.push({ kind, x: px, z: pz });
    });
    // gente de la feria
    const looks = [{ shirt: '#3a4a6a', txapela: '#1d1d24', pants: '#3a3530', hair: '#4a3020', staff: true }, { shirt: '#b5485d', skirt: '#3a3530', pants: '#3a3530', hair: '#2a1a12', bun: true, female: true, basket: true }, { shirt: '#e8e0cc', vest: '#2b2630', pants: '#2b2630', txapela: '#1d1d24', hair: '#bdb6aa', old: true, staff: true }];
    looks.forEach((look, i) => { const s2 = this.spot({ x: c.x + (i - 1) * 9, z: c.z + 7 }, 3); const a = new Actor({ id: 'feria' + i, name: ['Ganadero', 'Vecina', 'Aitona'][i], x: s2.x, z: s2.z, heading: Math.PI, look }, this.scene); this.walkers.push(a); });
    M.fair = { x: c.x, z: c.z, pens, obj: g };
  }
  async judgeFair(M) {
    if (M.judging) return; M.judging = true; this.player.frozen = true;
    try {
      const li = FERIA.breeds.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('');
      await infoCard(this.ui, { icon: 'cow', kicker: 'Concurso de ganado', title: 'Las razas del país', text: 'En las ferias se premia a los mejores animales de las razas de aquí:', extra: `<ul class="tools">${li}</ul>`, button: 'Ser juez' });
      const J = FERIA.judge, ord = [0, 1, 2].sort(() => this.rnd() - 0.5);
      const r = await choiceGame(this.ui, { title: 'Juez por un día', icon: 'cow', q: J.q, options: ord.map(i => J.options[i]), answer: ord.indexOf(J.answer), why: J.why });
      if (r.win) { M.step = 2; this.sound.fanfare?.(); this.ui.toast(`¡Buen ojo! Vuelve con ${M.host.name}`, 'check', 3000); }
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
