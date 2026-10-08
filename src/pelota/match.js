// Partido de pelota a mano: une la lógica (game.js), el frontón (court.js), la interfaz (hud.js) y el sonido.
// El juego anfitrión pone el frontón en su escena, llama a update(dt) en cada fotograma y renderiza con su cámara.
import { COURT, TEXT, courtFeel, LEVEL_ORDER, rivalQuote, pelotariRating } from './rules.js';
import { showVs, courtIcon } from './vs.js';
import { setFeel } from './physics.js';
import { openFicha, playerChip, splitName } from './ficha.js';
import { PelotaGame, cutHeight, dropHeight, aimSide } from './game.js';
import { PelotaHud, esc } from './hud.js';
import { PelotaAudio } from './audio.js';
const clamp1 = (v) => Math.max(-1, Math.min(1, v));

export class PelotaMatch {
  /**
   * @param {object} o
   *  THREE, court (PelotaCourt ya colocado en la escena), camera,
   *  you / rival: { obj (Object3D), animate(obj, estado, dt) opcional, name },
   *  mode 'match'|'rally', target, level, lang 'es'|'eu', container (DOM), yawOffset (si el modelo no mira a +Z),
   *  onEnd(resultado), onExit(), audio (AudioContext opcional), touch (forzar controles táctiles),
   *  mates() (opcional: promesa con { youMate, rivalMate }, cada uno { obj, name, stats, animate }: con ella se puede
   *  elegir el partido por parejas),
   *  town (el pueblo del frontón: el de los pelotaris que no traen el suyo en el nombre), youRecord ({ won, txapelas }: lo
   *  que has ganado, para tu ficha), cond ({ covered, stone, wet, labrit }: cómo es el frontón; cambia un poco la pelota)
   */
  constructor(o) {
    this.o = o; this.T = o.THREE; this.court = o.court; this.cam = o.camera;
    this.lang = o.lang === 'eu' ? 'eu' : 'es'; this.txt = TEXT[this.lang];
    this.touch = o.touch ?? (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
    this.level = o.level || 'normal';
    // golpe automático (se recuerda de un partido a otro): tú te mueves y el golpe sale solo
    try { this.autoHit = o.autoHit ?? localStorage.getItem('mendimendiz-pelota-auto') === '1'; } catch (e) { this.autoHit = !!o.autoHit; }
    this.pairs = false; this.role = 'delantero'; this.mateObjs = null;   // por parejas: qué juegas tú y los otros dos
    this.names = { you: o.you?.name || this.txt.you, rival: o.rival?.name || 'Rival' };
    this.audio = new PelotaAudio(o.audio);
    this.hud = new PelotaHud(o.container || document.body, this.txt, this.names, this.touch);
    this.hud.onPanel = () => this.resetStick?.();
    this.input = { mx: 0, mz: 0, hit: false, drop: false, cut: false, keys: {}, stick: { id: null, x: 0, y: 0 }, charge: null, power: 0.5 };
    this.active = true; this.t = 0;
    this.camPos = new this.T.Vector3(); this.camLook = new this.T.Vector3(); this.camInit = false;
    this.fov0 = this.cam.fov;
    this.court.group.updateMatrixWorld(true);
    this.v3 = new this.T.Vector3();
    // (el frontón también juega: su física, mientras dure el partido; al acabar, la de siempre)
    this.feel = courtFeel(o.cond || {}, this.lang); setFeel(this.feel);
    this.bindInput();
    this.newGame();
    if (o.autostart) { this.hud.controls(true); this.game.start(); } else { this.intro(); if (o.forcePairs) this.chooseMode('delantero'); }   // (torneo por parejas: ya por parejas)
  }
  newGame() {
    this.hud?.root?.classList.remove('final');
    const o = this.o;
    const M = this.pairs ? this.mateObjs : null;
    this.game = new PelotaGame({ mode: o.mode || 'match', target: o.target, level: this.level, seed: o.seed, autoplay: o.autoplay, autoHit: this.autoHit, rivalStats: o.rivalStats, youStats: o.youStats,
      pairs: !!M, youRole: this.role, youMateStats: M?.youMate.stats, rivalMateStats: M?.rivalMate.stats });
    for (const m of Object.values(this.mateObjs || {})) if (m.obj) m.obj.visible = !!M;
    this.hud.root.classList.toggle('autohit', !!this.autoHit);   // (en el botón de golpe, «AUTO»)
    this.hud.setNames?.(this.label('you'), this.label('rival'));
    this.hud.setScore(0, 0, this.game.server, o.mode === 'rally' ? this.txt.rally(this.game.target) : this.txt.to(this.game.target));
    if (o.mode === 'rally') this.hud.setScore(0, '', this.game.server, this.txt.rally(this.game.target));
    this.lastSwing = { you: 0, rival: 0, youMate: 0, rivalMate: 0 };
  }
  // el nombre de cada lado: el pelotari o, por parejas, los dos
  label(sd) { const m = this.pairs && this.mateObjs?.[sd + 'Mate']; return m ? `${this.names[sd]} · ${m.name}` : this.names[sd]; }
  labels() { return [this.label('you'), this.label('rival')]; }

  // ------------------------------------------------------------ paneles
  intro() {
    const t = this.txt, g = this.game, L = t.levels || TEXT.es.levels;
    this.hud.controls(false);
    // mano a mano o por parejas (y tú, de delantero o de zaguero): solo en los partidos libres
    const canPairs = !!this.o.mates && g.mode === 'match', P = t.pairs || TEXT.es.pairs;
    const mods = [['mano', P.single], ['delantero', P.front], ['zaguero', P.back]].filter(([k]) => !(this.o.forcePairs && k === 'mano')), cur = this.pairs ? this.role : this.o.forcePairs ? this.role : 'mano';
    const TT = t.tour || TEXT.es.tour, AH = t.autoHit || TEXT.es.autoHit, sum = [mods.find(([k]) => k === cur)?.[1] || P.single, g.mode === 'rally' ? t.rally(g.target) : t.to(g.target), this.autoHit ? AH[0] : ''].filter(Boolean).join(' · ');
    // arriba quién juega y dónde (el frontón y lo que se nota en él); lo que se elige poco, plegado en «Más opciones» con
    // lo elegido a la vista; abajo, en una fila, el nivel y los botones
    const p = this.hud.panel(`<h2>${t.title}</h2><p class="pel-sub">${esc(this.label('you'))} vs ${esc(this.label('rival'))} · ${g.mode === 'rally' ? t.rally(g.target) : t.to(g.target)} <button class="pel-chip" data-pel-tour>${TT.btn}</button></p>
      ${this.rivalHtml()}
      ${this.courtHtml()}
      <details class="pel-more"${this.moreOpen ? ' open' : ''}><summary>${t.moreTitle || TEXT.es.moreTitle}<span class="pel-sum">${esc(sum)}</span></summary>
      ${canPairs ? `<div class="pel-levels pel-mod" role="group" aria-label="${P.label}">${mods.map(([k, l]) => `<button data-pel-mod="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>` : ''}
      ${this.pairs ? `<p class="pel-pairs">${P.how(this.role === 'delantero')} ${P.energy}</p>` : ''}
      <button class="pel-auto" data-pel-auto role="switch" aria-checked="${!!this.autoHit}"><span><b>${AH[0]}</b><small>${AH[1]}</small></span><i aria-hidden="true"></i></button>
      <ol>${t.rules.map(r => `<li>${r}</li>`).join('')}</ol>
      <div class="pel-ctrl">${this.touch ? t.ctrlTouch : t.ctrlKeys}</div></details>
      ${this.o.fixedLevel ? '' : `<small class="pel-lbl">${t.level || 'Nivel'}</small><div class="pel-levels pel-lv5" role="group" aria-label="${t.level || 'Nivel'}">${LEVEL_ORDER.map(k => `<button data-pel-lv="${k}" aria-pressed="${k === this.level}">${L[k]}</button>`).join('')}</div>`}
      <div class="pel-row"><button class="pel-go alt" data-pel-x>${t.later}</button><button class="pel-go" data-pel-go>${t.play}</button></div>`);
    p.querySelector('.pel-more')?.addEventListener('toggle', (e) => { this.moreOpen = e.target.open; });
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pelLv) { this.level = b.dataset.pelLv; for (const x of p.querySelectorAll('[data-pel-lv]')) x.setAttribute('aria-pressed', x.dataset.pelLv === this.level); this.newGame(); }
      if (b.dataset.pelMod) { this.chooseMode(b.dataset.pelMod); return; }
      if (b.hasAttribute('data-pel-auto')) { this.autoHit = !this.autoHit; try { localStorage.setItem('mendimendiz-pelota-auto', this.autoHit ? '1' : '0'); } catch (e) { } this.newGame(); this.intro(); return; }
      if (b.dataset.pelFicha) { this.ficha(b.dataset.pelFicha); return; }
      if (b.hasAttribute('data-pel-court')) { const w = p.querySelector('.pel-court-what'); if (w) { w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); } return; }
      if (b.hasAttribute('data-pel-tour')) { this.startTour(); return; }
      if (b.hasAttribute('data-pel-go') && this.loadingMates) return;
      if (b.hasAttribute('data-pel-go')) { this.audio.ensure(); this.hud.closePanel(); this.vsThenPlay(); }
      if (b.hasAttribute('data-pel-x')) this.exit(true, true);   // («Ahora no», antes de empezar: un paso atrás)
    });
  }
  // el frontón donde se juega: su dibujo, su nombre y lo que se nota (al tocarlo, qué pasa con cada cosa)
  courtHtml() {
    const f = this.feel, name = this.o.venue || (this.o.town ? (this.txt.fronton || TEXT.es.fronton)(this.o.town) : '');
    if (!f?.tags?.length || !name) return '';
    return `<button class="pel-court" data-pel-court aria-expanded="false">${courtIcon(this.o.cond)}<span class="pel-court-t"><b>${esc(name)}</b><span>${f.tags.map(x => `<i>${esc(x.name)}</i>`).join('')}</span></span></button>
      <p class="pel-court-what" hidden>${f.tags.map(x => `<b>${esc(x.name)}.</b> ${esc(x.what)}`).join(' ')}</p>`;
  }
  // «¡A jugar!»: antes, la pantalla VS (azules contra colorados, el frontón y cómo juega el rival); después, el saque.
  // (sin ella en el partido que empieza solo y en las pruebas automáticas, salvo que la pidan con window.__vs)
  vsThenPlay() {
    const go = () => { if (!this.active) return; this.vsOpen = false; this.hud.controls(true); this.game.start(); this.audio.whistle(); };
    const V = this.o.vsImg;
    if (!V || this.o.autostart || window.__autoWin || (navigator.webdriver && !window.__vs)) return go();
    const t = this.txt, L = t.levels || TEXT.es.levels, M = this.pairs && this.mateObjs, P = t.pairs || TEXT.es.pairs, g = this.game;
    const rt = splitName(this.names.rival).town || this.o.town || '';
    const line = [M ? (this.role === 'delantero' ? P.front : P.back) : P.single, g.mode === 'rally' ? t.rally(g.target) : t.to(g.target), this.o.fixedLevel ? '' : L[this.level]].filter(Boolean).join(' · ');
    this.vsOpen = true; this.met = true;
    // (las cartas: la media y las tres cualidades de cada uno, como en el cuadro del torneo)
    const N = t.card || TEXT.es.card, cardOf = (st, seed, bonus) => { const r = pelotariRating(st || {}, seed, bonus); return { ovr: r.ovr, ovrLabel: t.ovr || TEXT.es.ovr, stats: [r.vel, r.pot, r.man].map((v, i) => ({ k: N[i], v })) }; };
    const yn = this.label('you'), rn = this.label('rival').replace(/\s*\([^)]*\)/g, '');
    showVs(this.hud.root, {
      comp: this.o.comp || t.friendly || TEXT.es.friendly,
      you: { name: yn, sub: this.o.town || '', img: V.you, mateImg: M ? V.you : null, ...cardOf(this.o.youStats, `${splitName(this.names.you).name} ${this.o.town || ''}`, this.o.youBonus ?? 2) },
      rival: { name: rn, sub: rt, img: V.rival, mateImg: M ? V.rival : null, ...cardOf(this.o.rivalStats, `${splitName(this.names.rival).name} ${rt}`, this.o.rivalBonus ?? 0) },
      venue: this.o.venue || (this.o.town ? (t.fronton || TEXT.es.fronton)(this.o.town) : ''), cond: this.o.cond, tags: this.feel?.tags || [],
      line, quote: rivalQuote(this.o.rivalStats || {}, this.lang), tap: t.vsTap || TEXT.es.vsTap, onSlam: () => this.audio.slam?.(),
    }).then(go);
  }
  // ------------------------------------------------------------ las partes del frontón
  // la cámara va de una a otra (frontis, chapa, pared izquierda, cancha, falta, pasa, contracancha y rebote), cada una
  // resaltada en amarillo y con su nombre y para qué sirve
  startTour() {
    this.hud.closePanel(); this.hud.controls(false); this.tour = { i: 0 };
    const C = this.court, W = COURT.W, L = COURT.L, EXT = L + 3, RH = C.reboteH || 2.2, CO = C.contra || 2.6, T = this.T;
    if (!this.tourHi) {
      // (separados unos centímetros de la pared o del suelo; sin polygonOffset, que en algunos móviles los escondía detrás)
      const mat = new T.MeshBasicMaterial({ color: '#ff2bd6', transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide });
      const line = this.tourLine = new T.LineBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.95, depthWrite: false });
      // (cada parte, en amarillo con su borde)
      const plane = (w, h, x, y, z, rx = 0, ry = 0) => { const geo = new T.PlaneGeometry(w, h), m = new T.Mesh(geo, mat); m.add(new T.LineSegments(new T.EdgesGeometry(geo), line)); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.visible = false; m.renderOrder = 6; C.group.add(m); return m; };
      this.tourMat = mat;
      this.tourHi = [
        plane(W, COURT.FRONT_TOP - COURT.CHAPA, 0, (COURT.FRONT_TOP + COURT.CHAPA) / 2, 0.08),
        plane(W, COURT.CHAPA, 0, COURT.CHAPA / 2, 0.1),
        plane(EXT, COURT.LEFT_LINE, -W / 2 + 0.03, COURT.LEFT_LINE / 2, EXT / 2, 0, Math.PI / 2),
        plane(W, L, 0, 0.03, L / 2, -Math.PI / 2),
        plane(W, 0.8, 0, 0.035, COURT.FALTA, -Math.PI / 2),
        plane(W, 0.8, 0, 0.035, COURT.PASA, -Math.PI / 2),
        plane(CO, EXT, W / 2 + CO / 2, 0.03, EXT / 2, -Math.PI / 2),
        plane(W + 0.6, RH, -0.3, RH / 2, EXT - 0.03),
      ];
    }
    // (dónde se pone la cámara y a dónde mira, en las medidas de la cancha)
    this.tourCams = [[[2.5, 4, 15], [0, 4.6, 0]], [[2.5, 3.2, 6.5], [0, -0.6, 0]], [[4.5, 5.5, 27], [-5, 3.5, 12]], [[4, 9, 33], [0, 0, 13]],
      [[6, 4.5, 20], [0, 0, 14]], [[6, 4.5, 30.5], [0, 0, 24.5]], [[-2.5, 6, 27], [W / 2 + CO / 2, 0, 15]], [[3, 4.5, 21], [0, 3.5, EXT]]];
    this.tourCard();
  }
  tourCard() {
    const TT = this.txt.tour || TEXT.es.tour, i = this.tour.i, [name, text] = TT.parts[i], n = TT.parts.length;
    this.tourEl?.remove();
    const el = this.tourEl = document.createElement('div'); el.className = 'pel-tour';
    el.innerHTML = `<b>${i + 1}/${n} · ${esc(name)}</b><p>${esc(text)}</p><div>${i > 0 ? `<button data-t="prev">${TT.prev}</button>` : ''}${i < n - 1 ? `<button class="go" data-t="next">${TT.next}</button>` : ''}<button data-t="end">${TT.end}</button></div>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; const a = b.dataset.t;
      if (a === 'end') return this.endTour();
      this.tour.i = Math.max(0, Math.min(n - 1, this.tour.i + (a === 'next' ? 1 : -1))); this.tourCard(); });
    this.hud.root.appendChild(el);
    this.tourHi.forEach((m, k) => { m.visible = k === i; });
  }
  endTour() {
    if (!this.tour) return;
    this.tour = null; this.tourEl?.remove(); this.tourEl = null;
    for (const m of this.tourHi || []) m.visible = false;
    if (this.active) this.intro();
  }
  // mano a mano o por parejas: la primera vez que se eligen parejas se preparan los otros dos pelotaris
  async chooseMode(k) {
    if (this.loadingMates) return;
    const pairs = k !== 'mano';
    if (pairs && !this.mateObjs) {
      this.loadingMates = true;
      const go = this.hud.panelEl?.querySelector('[data-pel-go]'); if (go) { go.disabled = true; go.textContent = (this.txt.pairs || TEXT.es.pairs).loading; }
      try { this.mateObjs = await this.o.mates(); } catch (e) { console.warn('parejas', e); this.mateObjs = null; }
      this.loadingMates = false;
      if (!this.active) return;
      if (!this.mateObjs) { this.intro(); return; }   // (sin los pelotaris, se queda el mano a mano)
    }
    this.pairs = pairs; if (pairs) this.role = k;
    this.newGame(); this.intro();
  }
  // quién juega contra quién: una tarjeta por pelotari (tú y tu compañero de azul, el rival y el suyo de colorado) con
  // lo que más se le nota; al tocarla se abre su ficha entera (cualidades, golpes preferidos, cómo jugarle y sus datos).
  // Antes se leía aquí todo el perfil del rival en texto corrido; ahora está en su ficha, cuando se quiere ver
  rivalHtml() {
    if (this.o.mode === 'rally') return '';
    const L = this.fichaList(), chips = (side) => L.filter(p => p.side === side).map(p => playerChip(p, this.lang)).join('');
    return `<div class="pel-rv pel-vs${this.pairs && this.mateObjs ? ' pel-rv2' : ''}"><div class="pel-team">${chips('you')}</div><span class="pel-vs-x" aria-hidden="true">VS</span><div class="pel-team">${chips('rival')}</div></div>`;
  }
  // los pelotaris del partido, para sus fichas (por parejas, el rival es el delantero y su compañero, el zaguero)
  fichaList() {
    const o = this.o, M = this.pairs && this.mateObjs, town = o.town || '', rt = splitName(this.names.rival).town || town;
    const other = this.role === 'delantero' ? 'zaguero' : 'delantero';
    const L = [{ id: 'you', name: this.names.you, town, stats: o.youStats, side: 'you', role: M ? this.role : 'mano', you: true, record: o.youRecord }];
    if (M) L.push({ id: 'youMate', name: M.youMate.name, town, stats: M.youMate.stats, side: 'you', role: other });
    L.push({ id: 'rival', name: this.names.rival, town: rt, stats: o.rivalStats, side: 'rival', role: M ? 'delantero' : 'mano' });
    if (M) L.push({ id: 'rivalMate', name: M.rivalMate.name, town: rt, stats: M.rivalMate.stats, side: 'rival', role: 'zaguero' });
    return L;
  }
  // abre la ficha (el partido se para mientras se mira y sigue al cerrarla)
  async ficha(id = 'rival') {
    if (this.fichaOpen || !this.active) return;
    this.fichaOpen = true; const was = this.paused; this.paused = true; this.resetStick?.();
    const L = this.fichaList();
    try { await openFicha(L, Math.max(0, L.findIndex(p => p.id === id)), this.lang, this.hud.root); }
    finally { this.fichaOpen = false; if (this.active) this.paused = was; }
  }
  endPanel(e) {
    const t = this.txt, g = this.game;
    this.hud.controls(false); this.hud.tip('');
    const fact = t.facts[(this.o.factIndex ?? Math.floor(Math.random() * t.facts.length)) % t.facts.length];
    const big = g.mode === 'rally' ? `${e.best}/${g.target}` : t.result(e.score.you, e.score.rival);
    // el botón dice a dónde se vuelve: al pueblo, al menú del campeonato o al cuadro del torneo (en el torneo, el
    // resultado cuenta: sin «otra partida» para repetirlo)
    const cont = this.o.back === 'torneo' ? (t.contTorneo || TEXT.es.contTorneo) : this.o.back === 'menu' ? (t.contMenu || TEXT.es.contMenu) : t.cont;
    const p = this.hud.panel(`<h2>${e.win ? (g.mode === 'rally' ? t.rallyWin : t.win) : t.lose}</h2><p class="pel-sub">${esc(this.label('you'))} – ${esc(this.label('rival'))}${g.mode === 'rally' ? '' : ` <button class="pel-chip" data-pel-fichas>${t.fichas || TEXT.es.fichas}</button>`}</p>
      <div class="pel-big">${big}</div><div class="pel-fact"><b>${t.factsTitle}</b><br>${fact}</div>
      <div class="pel-row">${this.o.back === 'torneo' ? '' : `<button class="pel-go alt" data-pel-again>${t.again}</button>`}<button class="pel-go" data-pel-cont>${cont}</button></div>`);
    p.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-pel-again')) { this.hud.closePanel(); this.newGame(); this.hud.controls(true); this.game.start(); this.audio.whistle(); }
      if (b.hasAttribute('data-pel-cont')) this.finish(e);
      if (b.hasAttribute('data-pel-fichas')) this.ficha('rival');
    });
    this.result = e;
  }
  confirmExit() {
    const t = this.txt; const wasPaused = this.paused; this.paused = true;
    // (en la pausa, también las fichas de los pelotaris: se miran sin salir del partido)
    const fichas = this.game.mode === 'rally' ? '' : `<button class="pel-go alt pel-wide" data-pel-fichas>${t.fichas || TEXT.es.fichas}</button>`;
    const p = this.hud.panel(`<h2>${t.exit}</h2><p>${t.sure}</p>${fichas}<div class="pel-row"><button class="pel-go alt" data-pel-yes>${t.yes}</button><button class="pel-go" data-pel-no>${t.no}</button></div>`);
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-pel-fichas')) { this.ficha('rival'); return; }
      if (b.hasAttribute('data-pel-yes')) this.exit(true);
      else { this.hud.closePanel(); this.paused = wasPaused; }
    });
  }
  exit(user, later = false) {
    if (!this.active) return;
    this.destroy();
    this.o.onExit?.({ win: false, quit: !!user, later, score: { ...this.game.score } });
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
      const mine = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'j', 'k', 'l', 'e', 'escape', 'enter'];
      if (!mine.includes(k)) return;
      e.preventDefault(); e.stopPropagation();
      if (down && !I.keys[k]) {
        if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') this.chargeStart('hit');
        if (k === 'shift' || k === 'k') this.chargeStart('drop');
        if (k === 'l') this.chargeStart('cut');
        if (k === 'escape') { if (hud.panelEl) return; this.confirmExit(); }
      }
      if (!down && I.keys[k]) { if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') this.chargeEnd('hit'); if (k === 'l') this.chargeEnd('cut'); if (k === 'shift' || k === 'k') this.chargeEnd('drop'); }
      I.keys[k] = down;
    };
    addEventListener('keydown', this.onKey, true); addEventListener('keyup', this.onKey, true);
    this.onBlur = () => { I.keys = {}; this.resetStick?.(); };
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
    const reset = this.resetStick = () => { I.stick = { id: null, x: 0, y: 0 }; knob.style.display = 'none'; };
    const end = (e) => { if (e.pointerId === I.stick.id) reset(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    // (en el iPhone, a veces el «soltar» no llega a la zona: un gesto del sistema desde el borde, un aviso que aparece encima
    // o el dedo que sale de la pantalla; el joystick se quedaba enganchado hacia delante. Se suelta también desde la
    // ventana y cuando ningún dedo queda dentro de la zona)
    this.onPtrEnd = end; addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true);
    this.onTouchEnd = (e) => { if (I.stick.id === null) return; const zr = zone.getBoundingClientRect();
      for (const t of e.touches) if (t.clientX >= zr.left && t.clientX <= zr.right && t.clientY >= zr.top && t.clientY <= zr.bottom) return;
      reset(); };
    addEventListener('touchend', this.onTouchEnd, true); addEventListener('touchcancel', this.onTouchEnd, true);
    this.onHide = () => { if (document.hidden) { reset(); I.keys = {}; } }; document.addEventListener('visibilitychange', this.onHide);
    // botones: el golpe, la cortada y la dejada se cargan mientras se mantienen y salen al soltar (un toque, suave)
    const btn = (sel, flag, charge) => {
      const b = hud.$(sel);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); this.audio.ensure(); if (charge) this.chargeStart(charge); else I[flag] = true; });
      const up = () => { b.classList.remove('down'); if (charge) this.chargeEnd(charge); };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    };
    // (cada botón por su nombre: la cortada lleva el estilo de los botones pequeños y antes se cogía como si fuese la dejada)
    btn('.pel-hit', 'hitQ', 'hit'); btn('.pel-dejada', 'dropQ', 'drop'); btn('.pel-cut', 'cutQ', 'cut');
    hud.$('.pel-exit').addEventListener('click', () => { if (!hud.panelEl) this.confirmExit(); });
  }
  // carga del golpe: cuanto más se mantiene, más fuerte (a tope en 0,7 s); un toque corto es un golpe suave
  chargeStart(kind) { if (!this.input.charge) this.input.charge = { kind, t0: this.t }; }
  chargeLevel() { const c = this.input.charge; return c ? Math.min(1, (this.t - c.t0) / 0.7) : 0; }
  chargeEnd(kind) {
    const I = this.input, c = I.charge; if (!c || c.kind !== kind) return;
    I.power = 0.15 + this.chargeLevel() * 0.85; I.charge = null;
    if (kind === 'cut') I.cutQ = true; else if (kind === 'drop') I.dropQ = true; else I.hitQ = true;
  }
  readInput() {
    const I = this.input, k = I.keys;
    let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + I.stick.x;
    let y = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + I.stick.y;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    if (Math.hypot(x, y) < 0.12) { x = 0; y = 0; }
    // la cámara mira al frontis: arriba en el joystick = hacia el frontis (−z)
    // mientras se mantiene un golpe, el joystick apunta (izquierda, derecha, largo, corto, dos paredes) y el pelotari va
    // solo hacia la pelota: antes apuntar y correr eran lo mismo y al ir a por la pelota se perdía la dirección
    const aiming = !!I.charge, rel = I.hitQ || I.dropQ || I.cutQ;
    if (aiming) I.lastAim = { x, y };
    const aim = rel && I.lastAim ? I.lastAim : { x, y }; if (rel) I.lastAim = null;
    const out = { mx: aiming ? 0 : x, mz: aiming ? 0 : -y, aiming, hit: !!I.hitQ, drop: !!I.dropQ, cut: !!I.cutQ, power: I.power, aimX: aim.x, aimY: aim.y };
    I.hitQ = I.dropQ = I.cutQ = false;
    return out;
  }

  // ------------------------------------------------------------ bucle
  update(dt) {
    if (!this.active) return false;
    dt = Math.min(dt, 0.05); this.t += dt;
    // con la carga a tope, si la pelota ya está a tu alcance, golpea sola (no hace falta soltar a ciegas)
    if (this.input.charge && this.chargeLevel() >= 1 && this.game.hittable('you')) this.chargeEnd(this.input.charge.kind);
    this.hud.charge(this.chargeLevel(), this.input.charge?.kind);
    const g = this.game, inp = this.paused || this.hud.panelEl ? {} : this.readInput();
    const ev = this.paused ? [] : g.update(dt, inp);
    for (const e of ev) { this.onEvent(e); this.o.onEvent?.(e); }
    this.draw(dt);
    this.hud.tick(dt); this.court.tick(dt);
    return this.active;
  }
  onEvent(e) {
    const t = this.txt, g = this.game, A = this.audio, C = this.court;
    switch (e.type) {
      case 'serveReady': this.hud.setScore(g.mode === 'rally' ? g.streak : g.score.you, g.mode === 'rally' ? '' : g.score.rival, g.server);
        if (e.matchPoint) { this.hud.call(t.matchPoint, t.matchPointSub, '', 1.6); A.crowd('oh'); }   // tanto de partido: el frontón contiene el aliento
        break;
      case 'hit': {
        // la fuerza también se oye y se nota: un golpe a tope suena más fuerte y sacude un poco la cámara
        const pw = e.pow ?? 0.5; A.hit((0.5 + e.q * 0.4) * (0.55 + pw * 0.75)); C.pop(e, 'z');
        if (e.who === 'you' && pw > 0.8 && e.shot !== 'dejada') this.shake = Math.max(this.shake || 0, 0.12 + (pw - 0.8) * 0.6);
        if (e.who === 'you') { const s = t.shots[e.sub] || t.shots[e.shot] || ''; this.hud.quality(t.quality[e.label], `${s ? s + ' · ' : ''}${this.lang === 'eu' ? 'indarra' : 'fuerza'} ${Math.round(pw * 100)} %`, e.label); }
        this.swingAnim(e.who); break;
      }
      case 'whiff': this.hud.quality(t.quality.whiff, '', 'whiff'); break;
      case 'claim': this.hud.quality((t.pairs || TEXT.es.pairs).claim); break;   // (pides la pelota de tu compañero)
      case 'front': if (e.chapa) { A.chapa(); C.chapaT = 0.6; this.shake = 0.35; } else A.front(); C.pop({ x: e.x, y: e.y, z: 0.02 }, 'z'); break;
      case 'wall': A.wall(); break;
      case 'back': A.wall(); if (e.live) this.hud.quality(t.rebote || '¡Al rebote!'); break;   // el rebote: la pared de atrás
      case 'floor': A.floor(e.soft ? 0.5 : 0.8); break;
      case 'streak': this.hud.setScore(e.n, '', g.server); break;
      case 'call': {
        const [title, sub] = t.calls[e.call] || t.calls.tanto;
        const who = e.winner === 'you' ? (g.pairs ? (t.pairs || TEXT.es.pairs).pointUs : t.pointYou) : (g.pairs && this.mateObjs ? (t.pairs || TEXT.es.pairs).pointThem(this.names.rival, this.mateObjs.rivalMate.name) : t.pointRival(this.names.rival));
        if (g.mode === 'rally') this.hud.call(title, sub, '', 2);
        else if (e.final) { this.hud.call(t.finalCall, `${who}. ${t.finalSub}`, e.kantari, 4.4); this.hud.setScore(e.score.you, e.score.rival, e.winner); this.hud.root.classList.add('final'); }
        else { this.hud.call(title, `${sub ? sub + ' ' : ''}${who}.`, e.kantari, 2.2); this.hud.setScore(e.score.you, e.score.rival, e.winner); }
        A.whistle(); if (e.final) A.ovation(); else A.crowd(e.winner === 'you' ? 'clap' : 'oh');
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
      C.spotRing.material.color.set(inside ? '#ffc2ec' : '#ff2bd6'); C.spotRing.material.opacity = inside ? 1 : 0.7;
    }
    // marca de puntería en el frontis mientras se carga la cortada o la dejada: sube con la fuerza (poca carga, rozando
    // la chapa; a tope, a media altura) y se mueve a lo ancho con el joystick
    const ch = this.input.charge;
    if (C.aimMark) {
      const on = !!ch && (ch.kind === 'cut' || ch.kind === 'drop') && (g.phase === 'rally' || g.phase === 'servePrep');
      C.aimMark.visible = on;
      if (on) { const k = this.input.stick, ax = clamp1((this.input.keys.d || this.input.keys.arrowright ? 1 : 0) - (this.input.keys.a || this.input.keys.arrowleft ? 1 : 0) + k.x), ay = clamp1((this.input.keys.w || this.input.keys.arrowup ? 1 : 0) - (this.input.keys.s || this.input.keys.arrowdown ? 1 : 0) + k.y), pow = 0.15 + this.chargeLevel() * 0.85, you = g.players.you;
        const x = ch.kind === 'cut' ? aimSide(ax) * 2.8 : you.x * 0.4 + aimSide(ax) * 2.2, y = ch.kind === 'cut' ? cutHeight(pow, ay) : dropHeight(pow, ay);
        C.aimMark.position.set(Math.max(-4.6, Math.min(4.8, x)), y, 0.06); C.aimMark.scale.setScalar(1 + 0.08 * Math.sin(this.t * 12)); }
    }
    // camino previsto del golpe apuntado: a trazos hasta el primer bote, con el bote y (a dos paredes) la pared marcados
    if (C.aimPath) {
      const k = this.input.stick, keys = this.input.keys;
      const ax = clamp1((keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + k.x), ay = clamp1((keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + k.y);
      const pv = ch && (g.phase === 'rally' || g.phase === 'servePrep') ? g.previewShot?.({ x: ax, y: ay }, ch.kind === 'cut' ? 'cortada' : ch.kind === 'drop' ? 'dejada' : false, 0.15 + this.chargeLevel() * 0.85) : null;
      C.aimPath.visible = !!pv; C.aimLand.visible = !!pv?.land; C.aimWall.visible = !!pv?.wall;
      if (pv) {
        const pos = C.aimPath.geometry.attributes.position, n = Math.min(pv.pts.length, pos.count);
        for (let i = 0; i < n; i++) pos.setXYZ(i, pv.pts[i].x, Math.max(0.03, pv.pts[i].y), pv.pts[i].z);
        pos.needsUpdate = true; C.aimPath.geometry.setDrawRange(0, n); C.aimPath.computeLineDistances();
        if (pv.land) { C.aimLand.position.set(pv.land.x, 0.03, pv.land.z); C.aimLand.scale.setScalar(1 + 0.1 * Math.sin(this.t * 10)); }
        if (pv.wall) C.aimWall.position.set(-COURT.W / 2 + 0.05, pv.wall.y, pv.wall.z);
        C.aimLand.material.color.set(pv.shot === 'dosparedes' ? '#c9b2ff' : '#ff7ac8'); C.aimPath.material.color.copy(C.aimLand.material.color);
      }
    }
    C.serveZone.visible = g.phase === 'serveWait' || g.phase === 'servePrep' || (g.phase === 'rally' && g.rally?.serve && !g.rally.front);
    this.hud.ready(h && h.hittable || (g.phase === 'servePrep' && g.serverP() === 'you' && g.hittable('you')));
    // consejos
    const tt = this.txt;
    let tip = '';
    const PT = tt.pairs || TEXT.es.pairs, sp = g.serverP();
    if (g.phase === 'serveWait' && sp === 'you') tip = g.runUp ? tt.tipServeRun : tt.tipServe;
    else if (g.phase === 'servePrep' && sp === 'you') tip = g.hittable('you') ? tt.tipServe2 : tt.tipServeRun;
    else if (g.phase === 'serveWait' && sp === 'youMate') tip = PT.mateServe;
    else if (g.phase === 'serveWait' && g.server === 'rival') tip = g.pairs && this.role === 'delantero' ? PT.rivalServe : tt.tipRivalServe;
    else if (h && h.mate && !h.hittable && h.tired > 0.3) tip = PT.rest;
    else if (h && h.mate && !h.hittable && h.mateTired > 0.4) tip = PT.mateTired(tt.hit);
    else if (h && h.mate && !h.hittable) tip = PT.mateBall;
    else if (this.input.charge && g.phase === 'rally' && g.rally?.turn === 'you') tip = tt.tipAim;
    else if (h && h.hittable) tip = tt.tipHit;
    else if (h && h.yourTurn) tip = assist ? tt.tipMove : '';
    else if (h && h.tired > 0.5) tip = tt.tiredYou;
    this.hud.tip(tip);
    // la energía de cada uno (tú, en amarillo)
    this.hud.energy(g.phase === 'intro' || g.phase === 'end' ? null : ['you', 'youMate', 'rival', 'rivalMate'].filter(id => g.players[id]).map(id => ({ id, side: g.side(id), me: id === 'you', en: g.players[id].en,
      name: id === 'you' ? this.names.you : id === 'rival' ? this.names.rival : this.mateObjs?.[id]?.name || '' })));
    // pelotaris
    for (const who of g.ids) {
      const P = g.players[who], side = this.o[who] || this.mateObjs?.[who]; if (!side?.obj) continue;
      // vigía de saltos: al colocarse para el saque la lógica los pone en su sitio de golpe; la figura llega andando
      const S = (this.slide ||= {})[who] ||= { x: P.x, z: P.z, ox: 0, oz: 0, v: 0 };
      let px = P.x, pz = P.z; if (!Number.isFinite(px) || !Number.isFinite(pz)) { px = S.x; pz = S.z; }
      if (Math.hypot(px - S.x, pz - S.z) > Math.max(0.35, 10 * dt)) { S.ox = S.x - px; S.oz = S.z - pz; }
      S.v = 0;
      // (se acerca cada vez más despacio, pero nunca más rápido que un esprint: desde lejos, antes, cruzaba la cancha volando)
      if (S.ox || S.oz) { const d = Math.hypot(S.ox, S.oz), step = Math.min(d * (1 - Math.exp(-dt * 5)), 14 * dt), k = d > 0 ? (d - step) / d : 0, ox = S.ox * k, oz = S.oz * k; if (dt > 0) S.v = step / dt; S.ox = ox; S.oz = oz; if (Math.hypot(ox, oz) < 0.03) S.ox = S.oz = 0; px += S.ox; pz += S.oz; }
      S.x = px; S.z = pz;
      this.v3.set(px, 0, pz); grp.localToWorld(this.v3);
      side.obj.position.copy(this.v3);
      // mira al frontis salvo cuando corre hacia atrás o hacia un lado
      let yaw = Math.PI;
      if (P.speed > 1.2 && Math.abs(P.vx) > Math.abs(P.vz) * 0.6) yaw = Math.atan2(P.vx, P.vz);
      else if (S.v > 0.8) yaw = Math.atan2(-S.ox, -S.oz);   // (yendo a su sitio para el saque, mira hacia donde va)
      if (g.phase === 'point' && (P.act === 'cheer')) yaw = Math.atan2(this.camPos.x - side.obj.position.x, this.camPos.z - side.obj.position.z) - grp.rotation.y;
      P.yaw = P.yaw == null ? yaw : P.yaw + Math.atan2(Math.sin(yaw - P.yaw), Math.cos(yaw - P.yaw)) * (1 - Math.exp(-12 * dt));
      side.obj.rotation.y = grp.rotation.y + P.yaw + (this.o.yawOffset || 0);
      const swingAge = this.t - (this.lastSwing[who] || -9);
      // preparación del golpe: cuando la pelota viene hacia quien le toca, echa el brazo atrás (más cuanto más cerca)
      const ball = g.ball.p, sd = g.side(who), turn = g.phase === 'rally' ? g.rally?.turn === sd && g.rally?.front && (!g.pairs || g.takerOf(sd) === who) : g.phase === 'servePrep' && g.serverP() === who;
      const dB = Math.hypot(ball.x - P.x, ball.z - P.z), wind = turn ? Math.max(0, Math.min(1, 1 - (dB - 1.0) / 5)) : 0;
      // ¿va hacia atrás? (de espaldas a donde corre: las piernas, al revés, en vez de correr hacia delante sin moverse así)
      const back = (P.speed || 0) > 0.4 && (P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)) < -0.35 * P.speed;
      const st = { speed: Math.max(P.speed || 0, S.v), back, act: P.act, actT: P.actT, wind, swing: swingAge < 0.4 ? swingAge / 0.4 : -1, won: g.phase === 'point' && P.act === 'cheer', lost: g.phase === 'point' && P.act === 'sad' };
      // un golpe nuevo (al pulsar), una sola vez: el gesto no se repite mientras dura el estado
      const sw = P.act === 'swing', SP = this.swPrev ||= {}; if (sw && !SP[who] && who === 'you' && swingAge > 0.4) this.lastSwing[who] = this.t; SP[who] = sw;
      if (side.animate) side.animate(side.obj, st, dt); else basicAnimate(side.obj, st, dt, this.t);
    }
    // por parejas, una flecha sobre ti (tu compañero lleva la misma ropa)
    if (g.pairs) {
      if (!this.pin) { this.pin = new T.Mesh(new T.ConeGeometry(0.2, 0.36, 4).rotateX(Math.PI), new T.MeshBasicMaterial({ color: '#ff7ac8', depthTest: false, transparent: true })); this.pin.renderOrder = 3; grp.add(this.pin); }
      const Y = g.players.you; this.pin.visible = g.phase !== 'intro'; this.pin.position.set(Y.x, 2.35 + Math.sin(this.t * 6) * 0.08, Y.z); this.pin.rotation.y = this.t * 2;
    } else if (this.pin) this.pin.visible = false;
    // cámara detrás del jugador, mirando al frontis
    const you = g.players.you, portrait = innerWidth < innerHeight;
    // en vertical (móvil) algo más cerca que antes: los pelotaris se ven más grandes y con su detalle
    // (en horizontal, a 7 m y 4 de alto: el pelotari sale una cuarta parte más grande que antes, a 8,8 m, y más arriba,
    // fuera de los botones; el frontis entero se sigue viendo)
    // si el rival está más al fondo que tú (le mandas la pelota atrás), la cámara retrocede y se eleva hasta verlo a él
    // también: antes se quedaba detrás de ti y no se veía cómo ni hacia dónde golpeaba
    const rv = g.players[g.pairs ? g.takerOf('rival') || 'rival' : 'rival'], rivalTurn = g.phase === 'rally' && g.rally?.turn === 'rival', behind = rivalTurn && Number.isFinite(rv?.z) ? Math.max(0, rv.z - you.z) : 0;   // (solo en el peloteo, cuando le toca a él: al sacar se queda contigo)
    const cz = you.z + behind, cx = behind > 0.5 ? you.x * 0.6 + rv.x * 0.4 : you.x, up = Math.min(2.4, behind * 0.16);
    // cámara de retransmisión: alta y por detrás, como en la tele (se ve la cancha entera con sus rayas, los dos pelotaris
    // y el frontis), y sigue al jugador con suavidad. En el frontón cubierto no pasa del rebote: si tú estás muy atrás,
    // sube en vez de retroceder
    const lp = portrait ? [cx * 0.3 + 0.6, 7.4 + up, cz + 10.5 + behind * 0.12] : [cx * 0.32 + 1.1, 6.0 + up * 0.7, cz + 8.6 + behind * 0.12];
    const ll = portrait ? [cx * 0.18, 1.4, cz - 9] : [cx * 0.2, 1.5, cz - 11];
    if (C.hall && g.phase !== 'intro') { const zMax = COURT.REBOTE - 0.7, over = Math.max(0, lp[2] - zMax); lp[2] -= over; lp[1] += over * 0.32; ll[2] -= over * 0.4; }
    if (g.phase === 'intro') { const a = this.t * 0.25; if (C.hall) { lp[0] = 3.5 + Math.sin(a) * 3; lp[1] = 8.5 + Math.sin(a * 0.7); lp[2] = 30 + Math.cos(a) * 2.5; ll[0] = 0; ll[1] = 3; ll[2] = 8; }   // (dentro del pabellón: un paseo lento desde lo alto del fondo)
      else { lp[0] = Math.sin(a) * 18 + 2; lp[1] = 9; lp[2] = COURT.L * 0.5 + Math.cos(a) * 18 + 6; ll[0] = 0; ll[1] = 2; ll[2] = COURT.L * 0.4; } }
    if (this.tour) { const [cp, cl] = this.tourCams[this.tour.i]; lp[0] = cp[0]; lp[1] = cp[1]; lp[2] = cp[2]; ll[0] = cl[0]; ll[1] = cl[1]; ll[2] = cl[2]; this.tourMat.opacity = 0.45 + 0.3 * Math.sin(this.t * 4); }   // (parpadea: se ve que está resaltada)
    const wp = this.v3.set(lp[0], lp[1], Math.min(lp[2], COURT.L + 11)); grp.localToWorld(wp);
    const wl = new T.Vector3(ll[0], ll[1], ll[2]); grp.localToWorld(wl);
    if (!this.camInit) { this.camPos.copy(wp); this.camLook.copy(wl); this.camInit = true; }
    const k = 1 - Math.exp(-5 * dt);
    this.camPos.lerp(wp, k); this.camLook.lerp(wl, k);
    this.cam.position.copy(this.camPos);
    if (this.shake > 0) { this.shake -= dt; this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.25; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.25; }
    this.cam.lookAt(this.camLook);
    // el rebote, a través si la cámara queda detrás de él (si no, taparía la cancha)
    const lc = grp.worldToLocal(this.v3.copy(this.camPos)); C.reboteSeeThrough?.(lc.z > COURT.REBOTE - 0.3, dt);
    const fov = portrait ? 62 : 54;
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }
  destroy() {
    if (!this.active) return;
    this.active = false; setFeel(null);
    removeEventListener('keydown', this.onKey, true); removeEventListener('keyup', this.onKey, true); removeEventListener('blur', this.onBlur); removeEventListener('pointerup', this.onPtrEnd, true); removeEventListener('pointercancel', this.onPtrEnd, true); removeEventListener('touchend', this.onTouchEnd, true); removeEventListener('touchcancel', this.onTouchEnd, true); document.removeEventListener('visibilitychange', this.onHide);
    this.hud.destroy(); this.court.hideBall();
    if (this.pin) { this.pin.parent?.remove(this.pin); this.pin.geometry.dispose(); this.pin.material.dispose(); this.pin = null; }
    this.tourEl?.remove(); this.tour = null;
    if (this.tourHi) { for (const m of this.tourHi) { m.parent?.remove(m); m.geometry.dispose(); m.children[0]?.geometry.dispose(); } this.tourMat.dispose(); this.tourLine.dispose(); this.tourHi = null; }
    this.court.reboteSeeThrough?.(false, 1);
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
