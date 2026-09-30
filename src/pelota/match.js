// Partido de pelota a mano: une la lógica (game.js), el frontón (court.js), la interfaz (hud.js) y el sonido.
// El juego anfitrión pone el frontón en su escena, llama a update(dt) en cada fotograma y renderiza con su cámara.
import { COURT, TEXT } from './rules.js';
import { PelotaGame } from './game.js';
import { PelotaHud, esc } from './hud.js';
import { PelotaAudio } from './audio.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class PelotaMatch {
  /**
   * @param {object} o
   *  THREE, court (PelotaCourt ya colocado en la escena), camera,
   *  you / rival: { obj (Object3D), animate(obj, estado, dt) opcional, name },
   *  mode 'match'|'rally', target, level, lang 'es'|'eu', container (DOM), yawOffset (si el modelo no mira a +Z),
   *  onEnd(resultado), onExit(), audio (AudioContext opcional), touch (forzar controles táctiles)
   */
  constructor(o) {
    this.o = o; this.T = o.THREE; this.court = o.court; this.cam = o.camera;
    this.lang = o.lang === 'eu' ? 'eu' : 'es'; this.txt = TEXT[this.lang];
    this.touch = o.touch ?? (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
    this.level = o.level || 'normal';
    this.names = { you: o.you?.name || this.txt.you, rival: o.rival?.name || 'Rival' };
    this.audio = new PelotaAudio(o.audio);
    this.hud = new PelotaHud(o.container || document.body, this.txt, this.names, this.touch);
    this.input = { mx: 0, mz: 0, hit: false, drop: false, keys: {}, stick: { id: null, x: 0, y: 0 } };
    this.active = true; this.t = 0;
    this.camPos = new this.T.Vector3(); this.camLook = new this.T.Vector3(); this.camInit = false;
    this.fov0 = this.cam.fov;
    this.v3 = new this.T.Vector3();
    this.bindInput();
    this.newGame();
    if (o.autostart) { this.hud.controls(true); this.game.start(); } else this.intro();
  }
  newGame() {
    const o = this.o;
    this.game = new PelotaGame({ mode: o.mode || 'match', target: o.target, level: this.level, seed: o.seed, autoplay: o.autoplay });
    this.hud.setScore(0, 0, this.game.server, o.mode === 'rally' ? this.txt.rally(this.game.target) : this.txt.to(this.game.target));
    if (o.mode === 'rally') this.hud.setScore(0, '', this.game.server, this.txt.rally(this.game.target));
    this.lastSwing = { you: 0, rival: 0 };
  }

  // ------------------------------------------------------------ paneles
  intro() {
    const t = this.txt, g = this.game;
    this.hud.controls(false);
    const lv = [['facil', this.lang === 'eu' ? 'Erraza' : 'Fácil'], ['normal', this.lang === 'eu' ? 'Normala' : 'Normal'], ['dificil', this.lang === 'eu' ? 'Zaila' : 'Difícil']];
    const p = this.hud.panel(`<h2>${t.title}</h2><p class="pel-sub">${esc(this.names.you)} vs ${esc(this.names.rival)} · ${g.mode === 'rally' ? t.rally(g.target) : t.to(g.target)}</p>
      <ol>${t.rules.map(r => `<li>${r}</li>`).join('')}</ol>
      <div class="pel-ctrl">${this.touch ? t.ctrlTouch : t.ctrlKeys}</div>
      ${this.o.fixedLevel ? '' : `<div class="pel-levels">${lv.map(([k, l]) => `<button data-lv="${k}" aria-pressed="${k === this.level}">${l}</button>`).join('')}</div>`}
      <div class="pel-row"><button class="pel-go alt" data-x>${t.exit}</button><button class="pel-go" data-go>${t.play}</button></div>`);
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.lv) { this.level = b.dataset.lv; for (const x of p.querySelectorAll('[data-lv]')) x.setAttribute('aria-pressed', x.dataset.lv === this.level); this.newGame(); }
      if (b.hasAttribute('data-go')) { this.audio.ensure(); this.hud.closePanel(); this.hud.controls(true); this.game.start(); this.audio.whistle(); }
      if (b.hasAttribute('data-x')) this.exit(true);
    });
  }
  endPanel(e) {
    const t = this.txt, g = this.game;
    this.hud.controls(false); this.hud.tip('');
    const fact = t.facts[(this.o.factIndex ?? Math.floor(Math.random() * t.facts.length)) % t.facts.length];
    const big = g.mode === 'rally' ? `${e.best}/${g.target}` : t.result(e.score.you, e.score.rival);
    const p = this.hud.panel(`<h2>${e.win ? (g.mode === 'rally' ? t.rallyWin : t.win) : t.lose}</h2><p class="pel-sub">${esc(this.names.you)} – ${esc(this.names.rival)}</p>
      <div class="pel-big">${big}</div><div class="pel-fact"><b>${t.factsTitle}</b><br>${fact}</div>
      <div class="pel-row"><button class="pel-go alt" data-again>${t.again}</button><button class="pel-go" data-cont>${t.cont}</button></div>`);
    if (e.win) this.audio.crowd('clap'); else this.audio.crowd('oh');
    p.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-again')) { this.hud.closePanel(); this.newGame(); this.hud.controls(true); this.game.start(); this.audio.whistle(); }
      if (b.hasAttribute('data-cont')) this.finish(e);
    });
    this.result = e;
  }
  confirmExit() {
    const t = this.txt; const wasPaused = this.paused; this.paused = true;
    const p = this.hud.panel(`<h2>${t.exit}</h2><p>${t.sure}</p><div class="pel-row"><button class="pel-go alt" data-no>${t.no}</button><button class="pel-go" data-yes>${t.yes}</button></div>`);
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-yes')) this.exit(true);
      else { this.hud.closePanel(); this.paused = wasPaused; }
    });
  }
  exit(user) {
    if (!this.active) return;
    this.destroy();
    this.o.onExit?.({ win: false, quit: !!user, score: { ...this.game.score } });
  }
  finish(e) {
    if (!this.active) return;
    this.destroy();
    this.o.onEnd?.({ win: e.win, score: e.score, best: e.best, mode: this.game.mode, level: this.level });
  }

  // ------------------------------------------------------------ entrada
  bindInput() {
    const I = this.input, hud = this.hud;
    this.onKey = (e) => {
      if (!this.active) return;
      const k = e.key.toLowerCase(), down = e.type === 'keydown';
      const mine = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'j', 'k', 'e', 'escape', 'enter'];
      if (!mine.includes(k)) return;
      e.preventDefault(); e.stopPropagation();
      if (down && !I.keys[k]) {
        if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') I.hitQ = true;
        if (k === 'shift' || k === 'k') I.dropQ = true;
        if (k === 'escape') { if (hud.panelEl) return; this.confirmExit(); }
      }
      I.keys[k] = down;
    };
    addEventListener('keydown', this.onKey, true); addEventListener('keyup', this.onKey, true);
    this.onBlur = () => { I.keys = {}; };
    addEventListener('blur', this.onBlur);
    // joystick táctil
    const zone = hud.$('.pel-stick'), knob = hud.$('.pel-knob'), R = 56;
    zone.addEventListener('pointerdown', (e) => {
      if (I.stick.id !== null) return;
      I.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      zone.setPointerCapture?.(e.pointerId);
      const zr = zone.getBoundingClientRect(); knob.style.display = 'block'; knob.style.left = (e.clientX - zr.left) + 'px'; knob.style.top = (e.clientY - zr.top) + 'px';
      knob.firstElementChild.style.transform = '';
      const h = hud.$('.pel-stickhint'); if (h) h.remove();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== I.stick.id) return;
      let dx = e.clientX - I.stick.ox, dy = e.clientY - I.stick.oy; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      I.stick.x = dx / R; I.stick.y = -dy / R;
      knob.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
    });
    const end = (e) => { if (e.pointerId !== I.stick.id) return; I.stick = { id: null, x: 0, y: 0 }; knob.style.display = 'none'; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    const btn = (sel, flag) => {
      const b = hud.$(sel);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); I[flag] = true; b.classList.add('down'); this.audio.ensure(); });
      const up = () => b.classList.remove('down');
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    };
    btn('.pel-hit', 'hitQ'); btn('.pel-drop', 'dropQ');
    hud.$('.pel-exit').addEventListener('click', () => { if (!hud.panelEl) this.confirmExit(); });
  }
  readInput() {
    const I = this.input, k = I.keys;
    let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + I.stick.x;
    let y = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + I.stick.y;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    if (Math.hypot(x, y) < 0.12) { x = 0; y = 0; }
    // la cámara mira al frontis: arriba en el joystick = hacia el frontis (−z)
    const out = { mx: x, mz: -y, hit: !!I.hitQ, drop: !!I.dropQ, aimX: x, aimY: y };
    I.hitQ = I.dropQ = false;
    return out;
  }

  // ------------------------------------------------------------ bucle
  update(dt) {
    if (!this.active) return false;
    dt = Math.min(dt, 0.05); this.t += dt;
    const g = this.game, inp = this.paused || this.hud.panelEl ? {} : this.readInput();
    const ev = this.paused ? [] : g.update(dt, inp);
    for (const e of ev) this.onEvent(e);
    this.draw(dt);
    this.hud.tick(dt); this.court.tick(dt);
    return this.active;
  }
  onEvent(e) {
    const t = this.txt, g = this.game, A = this.audio, C = this.court;
    switch (e.type) {
      case 'serveReady': this.hud.setScore(g.mode === 'rally' ? g.streak : g.score.you, g.mode === 'rally' ? '' : g.score.rival, g.server); break;
      case 'hit': {
        A.hit(0.6 + e.q * 0.5); C.pop(e, 'z');
        if (e.who === 'you') { const s = t.shots[e.shot] || ''; this.hud.quality(`${t.quality[e.label]}${s ? ' · ' + s : ''}`); }
        this.swingAnim(e.who); break;
      }
      case 'whiff': this.hud.quality(t.quality.whiff); break;
      case 'front': if (e.chapa) { A.chapa(); C.chapaT = 0.6; this.shake = 0.35; } else A.front(); C.pop({ x: e.x, y: e.y, z: 0.02 }, 'z'); break;
      case 'wall': A.wall(); break;
      case 'floor': A.floor(e.soft ? 0.5 : 0.8); break;
      case 'streak': this.hud.setScore(e.n, '', g.server); break;
      case 'call': {
        const [title, sub] = t.calls[e.call] || t.calls.tanto;
        const who = e.winner === 'you' ? t.pointYou : t.pointRival(this.names.rival);
        if (g.mode === 'rally') this.hud.call(title, sub, '', 2);
        else { this.hud.call(title, `${sub ? sub + ' ' : ''}${who}.`, e.kantari, 2.2); this.hud.setScore(e.score.you, e.score.rival, e.winner); }
        A.whistle(); A.crowd(e.winner === 'you' ? 'clap' : 'oh');
        break;
      }
      case 'end': this.endPanel(e); break;
    }
  }
  swingAnim(who) { this.lastSwing[who] = this.t; }

  // ------------------------------------------------------------ dibujo
  draw(dt) {
    const g = this.game, C = this.court, T = this.T, grp = C.group;
    const h = g.hints();
    // pelota
    if (g.phase === 'intro' || g.phase === 'end') C.hideBall();
    else C.showBall(g.ball.p, h && h.hittable ? 0.6 + 0.4 * Math.sin(this.t * 14) : 0, this.t);
    // aros de ayuda
    const assist = g.lvl.assist > 0 || g.mode === 'rally';
    C.landRing.visible = !!(h && h.yourTurn && h.land);
    if (C.landRing.visible) { C.landRing.position.set(h.land.x, 0.02, h.land.z); C.landRing.scale.setScalar(1 + 0.12 * Math.sin(this.t * 8)); }
    C.spotRing.visible = !!(assist && h && h.yourTurn && h.spot);
    if (C.spotRing.visible) {
      C.spotRing.position.set(h.spot.x, 0.025, h.spot.z);
      const you = g.players.you, inside = Math.hypot(you.x - h.spot.x, you.z - h.spot.z) < 0.8;
      C.spotRing.material.color.set(inside ? '#7dff9c' : '#39d86b'); C.spotRing.material.opacity = inside ? 1 : 0.7;
    }
    C.serveZone.visible = g.phase === 'serveWait' || g.phase === 'servePrep' || (g.phase === 'rally' && g.rally?.serve && !g.rally.front);
    this.hud.ready(h && h.hittable || (g.phase === 'servePrep' && g.server === 'you' && g.hittable('you')));
    // consejos
    const tt = this.txt;
    let tip = '';
    if (g.phase === 'serveWait' && g.server === 'you') tip = tt.tipServe;
    else if (g.phase === 'servePrep' && g.server === 'you') tip = g.hittable('you') ? tt.tipServe2 : '';
    else if (g.phase === 'serveWait' && g.server === 'rival') tip = tt.tipRivalServe;
    else if (h && h.hittable) tip = tt.tipHit;
    else if (h && h.yourTurn) tip = assist ? tt.tipMove : '';
    this.hud.tip(tip);
    // pelotaris
    for (const who of ['you', 'rival']) {
      const P = g.players[who], side = this.o[who]; if (!side?.obj) continue;
      this.v3.set(P.x, 0, P.z); grp.localToWorld(this.v3);
      side.obj.position.copy(this.v3);
      // mira al frontis salvo cuando corre hacia atrás o hacia un lado
      let yaw = Math.PI;
      if (P.speed > 1.2 && Math.abs(P.vx) > Math.abs(P.vz) * 0.6) yaw = Math.atan2(P.vx, P.vz);
      if (g.phase === 'point' && (P.act === 'cheer')) yaw = Math.atan2(this.camPos.x - side.obj.position.x, this.camPos.z - side.obj.position.z) - grp.rotation.y;
      P.yaw = P.yaw == null ? yaw : P.yaw + Math.atan2(Math.sin(yaw - P.yaw), Math.cos(yaw - P.yaw)) * (1 - Math.exp(-12 * dt));
      side.obj.rotation.y = grp.rotation.y + P.yaw + (this.o.yawOffset || 0);
      const swingAge = this.t - (this.lastSwing[who] || -9);
      const st = { speed: P.speed || 0, act: P.act, actT: P.actT, swing: swingAge < 0.4 ? swingAge / 0.4 : -1, won: g.phase === 'point' && P.act === 'cheer', lost: g.phase === 'point' && P.act === 'sad' };
      if (P.act === 'swing' && who === 'you' && swingAge > 0.4) { this.lastSwing[who] = this.t; }
      if (side.animate) side.animate(side.obj, st, dt); else basicAnimate(side.obj, st, dt, this.t);
    }
    // cámara detrás del jugador, mirando al frontis
    const you = g.players.you, portrait = innerWidth < innerHeight;
    const lp = portrait ? [you.x * 0.45 + 0.4, 7.4, you.z + 11.5] : [you.x * 0.55 + 0.9, 4.8, you.z + 8.8];
    const ll = portrait ? [you.x * 0.2, 1.0, you.z - 9.5] : [you.x * 0.25, 2.0, you.z - 12];
    if (g.phase === 'intro') { const a = this.t * 0.25; lp[0] = Math.sin(a) * 18 + 2; lp[1] = 9; lp[2] = COURT.L * 0.5 + Math.cos(a) * 18 + 6; ll[0] = 0; ll[1] = 2; ll[2] = COURT.L * 0.4; }
    const wp = this.v3.set(lp[0], lp[1], Math.min(lp[2], COURT.L + 11)); grp.localToWorld(wp);
    const wl = new T.Vector3(ll[0], ll[1], ll[2]); grp.localToWorld(wl);
    if (!this.camInit) { this.camPos.copy(wp); this.camLook.copy(wl); this.camInit = true; }
    const k = 1 - Math.exp(-5 * dt);
    this.camPos.lerp(wp, k); this.camLook.lerp(wl, k);
    this.cam.position.copy(this.camPos);
    if (this.shake > 0) { this.shake -= dt; this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.25; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.25; }
    this.cam.lookAt(this.camLook);
    const fov = portrait ? 62 : 55;
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }
  destroy() {
    if (!this.active) return;
    this.active = false;
    removeEventListener('keydown', this.onKey, true); removeEventListener('keyup', this.onKey, true); removeEventListener('blur', this.onBlur);
    this.hud.destroy(); this.court.hideBall();
    for (const r of [this.court.landRing, this.court.spotRing, this.court.serveZone]) r.visible = false;
    if (this.cam.fov !== this.fov0) { this.cam.fov = this.fov0; this.cam.updateProjectionMatrix(); }
  }
}

// Animación mínima si el anfitrión no da una: balanceo al correr y giro del cuerpo al golpear
function basicAnimate(obj, st, dt, t) {
  const inner = obj.children[0] || obj;
  inner.position.y = st.speed > 0.5 ? Math.abs(Math.sin(t * 12)) * 0.06 : 0;
  inner.rotation.y = st.swing >= 0 ? Math.sin(st.swing * Math.PI) * -0.9 : 0;
  if (st.won) inner.position.y = Math.abs(Math.sin(t * 8)) * 0.25;
}
