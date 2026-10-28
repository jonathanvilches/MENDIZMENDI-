// Partido de pelota a mano: une la lógica (game.js), el frontón (court.js), la interfaz (hud.js) y el sonido.
// El juego anfitrión pone el frontón en su escena, llama a update(dt) en cada fotograma y renderiza con su cámara.
import { COURT, TEXT, courtFeel, LEVEL_ORDER, rivalQuote, pelotariRating } from './rules.js';
import { lote, elige, perfil, saqueRival, siente, clase, POR_LADO, pesoTxt } from './material.js';
import { showVs, courtIcon } from './vs.js';
import { setFeel } from './physics.js';
import { openFicha, playerChip, splitName } from './ficha.js';
import { PelotaGame, cutHeight, dropHeight, aimSide } from './game.js';
import { PelotaHud, esc } from './hud.js';
import { PelotaAudio } from './audio.js';
import { Focos } from './show.js';
import { tap } from '../util/tap.js';
import { TACTIL } from '../util/tactil.js';
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
   *  que has ganado, para tu ficha), cond ({ covered, stone, wet, snow, labrit }: cómo es el frontón; cambia un poco la pelota)
   */
  constructor(o) {
    this.o = o; this.T = o.THREE; this.court = o.court; this.cam = o.camera;
    this.lang = o.lang === 'eu' ? 'eu' : 'es'; this.txt = TEXT[this.lang];
    this.touch = o.touch ?? TACTIL;
    this.level = o.level || 'normal';
    // la cámara dinámica (se recuerda de un partido a otro)
    const ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    this.camDyn = o.camDyn ?? ls('herrizherri-pelota-cam') !== '0';
    this.pairs = false; this.role = 'delantero'; this.mateObjs = null;   // por parejas: qué juegas tú y los otros dos
    this.names = { you: o.you?.name || this.txt.you, rival: o.rival?.name || 'Rival' };
    // el Cuatro y Medio (mano a mano, hasta la raya del 4 y medio); los colores, como en los frontones: viste de colorado quien
    // debutó antes y el otro de azul (o.colors, con sus temporadas en o.seasons); y la repetición de cada tanto
    this.cuatro = !!o.cuatro; this.cols = o.colors || { you: 'azul', rival: 'rojo' }; this.seasons = o.seasons || null;
    this.repe = ls('herrizherri-pelota-repe') !== '0';
    this.audio = new PelotaAudio(o.audio);
    this.hud = new PelotaHud(o.container || document.body, this.txt, this.names, this.touch, this.cols);
    this.hud.onPanel = () => this.resetStick?.();
    this.hud.onBola = (n) => this.cambiaBola(n);   // (tocar una pelota del cestaño antes de sacar)
    this.input = { mx: 0, mz: 0, hit: false, drop: false, cut: false, keys: {}, stick: { id: null, x: 0, y: 0 }, charge: null, power: 0.5 };
    this.active = true; this.t = 0;
    // (los consejos de cómo jugar, solo para aprender: en los primeros tantos de los dos primeros partidos; luego, ninguno.
    // Se cuenta el partido al empezar a jugarlo, en vsThenPlay: no los que se dejan con «Ahora no»)
    try { this.consejosN = +(localStorage.getItem('herrizherri-pelota-consejos') || 0); } catch (e) { this.consejosN = 0; }
    this.conConsejos = this.consejosN < 2;
    this.camPos = new this.T.Vector3(); this.camLook = new this.T.Vector3(); this.camInit = false;
    this.fov0 = this.cam.fov; this.roll = 0; this.kick = 0;
    this.court.group.updateMatrixWorld(true);
    this.v3 = new this.T.Vector3();
    // (el frontón también juega: su física, mientras dure el partido; al acabar, la de siempre)
    this.applyFeel();
    this.bindInput();
    this.newGame();
    // (el panel, una sola vez: si algo termina la llegada antes de tiempo y luego acaba, no sale dos veces)
    let conPanel = false;
    const panel = () => { if (conPanel || !this.active) return; conPanel = true; this.intro(); if (o.forcePairs) this.chooseMode('delantero'); };   // (torneo por parejas: ya por parejas)
    if (o.autostart) { this.hud.controls(true); this.game.start(); }
    else if (o.fly) {
      // la llegada (o.fly(partido), una promesa): la cámara vuela hasta la cancha con los pelotaris ya en su sitio y el
      // público en la grada; mientras, nada del marcador ni de los botones. Al acabar, el panel del partido
      this.flying = true; this.hud.controls(false); this.hud.root.classList.add('vuelo');
      // (en el torneo por parejas, los otros dos pelotaris antes del vuelo: así llegan los cuatro ya en su sitio)
      const prep = o.forcePairs && o.mates ? Promise.resolve().then(() => o.mates()).then((M) => { if (this.active && M) { this.mateObjs = M; this.pairs = true; this.role = 'delantero'; this.newGame(); } }, e => console.warn('parejas', e)) : Promise.resolve();
      // (los pelotaris esperan en la contracancha mientras vuela la cámara y, al llegar, salen corriendo: preparaEntrada)
      prep.then(() => { if (!this.active) return; this.preparaEntrada(); return o.fly(this); }).catch(e => console.warn('llegada', e)).finally(() => {
        this.flying = false; this.camInit = false; this.t0 = this.t; this.hud.root.classList.remove('vuelo');
        if (this.active) this.saleEntrada(panel);
      });
    } else { this.preparaEntrada(); this.saleEntrada(panel); }
  }
  // el plano del panel del partido: un paseo lento por lo alto, en las medidas de la cancha (t, segundos desde que empieza)
  introCam(t) {
    const C = this.court, a = t * 0.25, L = COURT.L;
    const r = C.hall ? [[3.5 + Math.sin(a) * 3, 8.5 + Math.sin(a * 0.7), 30 + Math.cos(a) * 2.5], [0, 3, 8]]   // (dentro del pabellón, desde lo alto del fondo)
      : C.labrit ? [[2 + Math.sin(a) * 5, 9 + Math.sin(a * 0.7) * 0.6, 38 + Math.cos(a) * 1.5], [0, 2.5, 12]]   // (sobre la grada del fondo del Labrit)
      // (al aire libre, de lado a lado por detrás de la cancha; antes daba la vuelta entera y pasaba por detrás de la
      // pared izquierda y por las casas de al lado)
        : [[2 + Math.sin(a) * 6, 9, L * 0.5 + 22 + Math.cos(a) * 2], [0, 2, L * 0.4]];
    this.cabe(r[0], r[1]); return r;
  }
  // la cámara, donde cabe (PelotaCourt.camTecho y camZMax): si no cabe más atrás, sube lo que le sobra; y nunca por encima
  // de la cubierta ni de su estructura. Antes, en las pelotas largas y en el plano desde lo alto, subía hasta 12-16 m y,
  // con cubierta, la estructura tapaba la imagen entera; o retrocedía hasta meterse en una casa de detrás del rebote
  cabe(p, l) {
    const C = this.court, over = p[2] - Math.min(COURT.L + 11, C.camZMax ?? Infinity);
    if (over > 0) { p[2] -= over; p[1] += over * 0.32; if (l) l[2] -= over * 0.4; }
    p[1] = Math.min(p[1], C.camTecho ?? Infinity);
  }
  // dónde empieza ese plano, en el mundo (el vuelo de la llegada acaba justo ahí): posición, a dónde mira y apertura
  introPose() {
    const [p, l] = this.introCam(0), g = this.court.group; g.updateMatrixWorld(true);
    return { pos: g.localToWorld(new this.T.Vector3(p[0], p[1], p[2])), look: g.localToWorld(new this.T.Vector3(l[0], l[1], l[2])),
      fov: (innerWidth < innerHeight ? 62 : 54) + (this.game.pairs || this.o.forcePairs ? 4 : 0) };
  }
  // ------------------------------------------------------------ la salida de los pelotaris
  // Como en los partidos de la tele: los pelotaris salen corriendo desde la contracancha, por el fondo, hasta su sitio
  // (primero los colorados del rival y al final tú); allí se vuelven hacia la cámara y la grada y saludan con el puño en
  // alto mientras el público aplaude. La cámara, baja: primero los ve venir desde delante y luego los coge de frente al
  // saludar. Después, el panel del partido. Se salta tocando la pantalla o con cualquier tecla
  preparaEntrada() {
    this.entra = null;
    if (navigator.webdriver && !window.__entrada) return;   // (en las pruebas automáticas, directamente al panel)
    const g = this.game, co = COURT.W / 2 + Math.min(1.6, (this.court.contra || 2.6) * 0.55), fondo = COURT.REBOTE - 2;
    const orden = (id) => (g.side(id) === 'rival' ? 0 : 2) + (/Mate$/.test(id) ? 1 : 0);
    const ids = g.ids.filter(id => g.players[id] && (this.o[id] || this.mateObjs?.[id])?.obj).sort((a, b) => orden(a) - orden(b));
    if (!ids.length) return;
    this.entra = { t: 0, go: false, salu: 0, ok: {}, run: ids.map((id, i) => {
      // (cada uno desde su sitio en la salida, uno al lado del otro: no salen todos del mismo punto)
      const P = g.players[id], fin = { x: P.x, z: P.z }, ini = { x: co + (i % 2) * 0.9, z: Math.min(fondo - i * 1.1, fin.z + 10 + i * 1.4) };
      P.x = ini.x; P.z = ini.z; P.speed = 0; P.vx = 0; P.vz = 0;
      return { id, ini, fin, sale: 0.2 + i * 0.55 }; }) };
    this.slide = {};   // (la figura aparece en la salida, sin deslizarse desde donde estaba)
  }
  saleEntrada(despues) {
    const E = this.entra; if (!E) { despues(); return; }
    E.go = true; E.despues = despues; this.camInit = false; this.hud.controls(false); this.hud.root.classList.add('sale');
    this.hud.call((this.txt.entra || TEXT.es.entra)[0], `${this.label('you')} · ${this.label('rival')}`, '', 3.2);
    this.audio.mood(0.5, 0.6);
    const salta = (e) => { if (e.type === 'keydown' && ['shift', 'control', 'alt', 'meta'].includes(e.key.toLowerCase())) return; this.finEntrada(); };
    addEventListener('pointerdown', salta, true); addEventListener('keydown', salta, true);
    this.saltaOff = () => { removeEventListener('pointerdown', salta, true); removeEventListener('keydown', salta, true); this.saltaOff = null; };
  }
  pasoEntrada(dt) {
    const E = this.entra, g = this.game; E.t += dt; let todos = true;
    for (const R of E.run) {
      const P = g.players[R.id]; if (!P) continue;
      // (arranca, corre a unos 5 m/s y frena al llegar: la distancia recorrida, con una curva suave de principio a fin)
      const dx = R.fin.x - R.ini.x, dz = R.fin.z - R.ini.z, d = Math.hypot(dx, dz) || 1, T = d / 5.2 * 1.25;
      const u = Math.max(0, Math.min(1, (E.t - R.sale) / T)), s = d * u * u * (3 - 2 * u), v = u > 0 && u < 1 ? d / T * 6 * u * (1 - u) : 0;
      P.x = R.ini.x + dx * s / d; P.z = R.ini.z + dz * s / d; P.vx = dx / d * v; P.vz = dz / d * v; P.speed = v;
      if (u >= 1) E.ok[R.id] = true; else todos = false;
    }
    // todos en su sitio: el saludo y el aplauso de la grada; a los dos segundos y medio, el panel
    if (todos && !E.salu) { E.salu = E.t; this.audio.aplauso(0.75, 3.2); this.o.onEvent?.({ type: 'entrada' }); }
    if ((E.salu && E.t - E.salu > 2.6) || E.t > 12) this.finEntrada();
  }
  finEntrada() {
    const E = this.entra; if (!E) return;
    this.entra = null; this.saltaOff?.(); this.hud.root.classList.remove('sale');
    for (const R of E.run) { const P = this.game.players[R.id]; if (P) { P.x = R.fin.x; P.z = R.fin.z; P.speed = 0; P.vx = 0; P.vz = 0; } }
    this.camInit = false; this.t0 = this.t;
    if (this.active) E.despues?.();
  }
  // los dos planos de la salida, en las medidas de la cancha: desde delante, junto a la pared izquierda y a la altura de
  // una persona, siguiéndolos mientras llegan; y, al saludar, de frente y cerca
  camEntrada() {
    const E = this.entra, g = this.game, P = E.run.map(R => g.players[R.id]).filter(Boolean), n = P.length || 1;
    const mx = P.reduce((a, q) => a + q.x, 0) / n, mz = P.reduce((a, q) => a + q.z, 0) / n, z0 = Math.min(...E.run.map(R => R.fin.z));
    // (al saludar, la cámara se va acercando despacio, metro y medio en dos segundos y medio)
    const ac = E.salu ? Math.min(1.5, (E.t - E.salu) * 0.6) : 0;
    const r = E.salu ? [[mx - 0.6, 1.7 - ac * 0.1, Math.max(1.5, z0 - 4.8 + ac)], [mx, 1.35, mz]] : [[-COURT.W / 2 + 1.4, 1.6, Math.max(2, z0 - 7)], [mx, 1.1, mz]];
    this.cabe(r[0], r[1]); return r;
  }
  // la física del partido: la del frontón por la de la pelota que está en juego
  applyFeel() {
    const f = this.feel = courtFeel(this.o.cond || {}, this.lang), B = siente(this.bola);
    f.front *= B.front; f.floor *= B.floor; f.run *= B.run; setFeel(f);
  }

  // ------------------------------------------------------------ el material (material.js)
  // El cestaño: las pelotas de cada lado. Sin elección (el partido que empieza solo, el peloteo, las pruebas), cada uno
  // las suyas por cómo juega; el rival, por su estilo, y tú, una de cada punta
  cestaPorDefecto() {
    const n = POR_LADO(this.pairs), lot = this.lote = lote(((this.o.seed || 7) * 13 + 5) >>> 0);
    const rv = elige(lot, n, perfil(this.o.rivalStats));
    this.ponCesta(elige(lot, n, 'mixto', new Set(rv.map(b => b.n))), rv);
  }
  ponCesta(tuyas, delRival) {
    const media = (L) => [...L].sort((a, b) => Math.abs(a.viva - 0.5) - Math.abs(b.viva - 0.5))[0];
    this.cesta = { you: tuyas, rival: delRival }; this.bolaTuya = media(tuyas); this.bola = this.bolaTuya; this.applyFeel(); this.pintaBolas();
  }
  // la elección antes del partido (el reglamento: cada pelotari elige 2 del lote de 10; por parejas, 3 cada pareja). El
  // sorteo dice quién elige antes; el rival, por su estilo. Tú, en un desplegable: cómo las quieres (de todo, las más vivas
  // o las más pesadas) y el juego coge las de ese tipo que quedan libres; debajo, cuáles son. (Antes, el lote entero en
  // diez casillas para elegirlas una a una: costaba entenderlo)
  eleccion() {
    return new Promise(res => {
      const t = this.txt.mat || TEXT.es.mat, n = POR_LADO(this.pairs), lot = this.lote = lote(((Date.now() % 1e6) * 13 + 5) >>> 0);
      const estilo = perfil(this.o.rivalStats), tuPrimero = Math.random() < 0.5, rn = this.nomLimpio('rival');
      let rv = tuPrimero ? [] : elige(lot, n, estilo), mio = 'mixto', mias = [];
      const icono = (b) => `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#f4eedd" stroke="${clase(b) === 'viva' ? '#ff7ac8' : clase(b) === 'pesada' ? '#7fb2ff' : '#c9b2ff'}" stroke-width="2.5"/><path d="M6 12c6 3 14 3 20 0M6 20c6-3 14-3 20 0" stroke="#b0442a" stroke-width="1.6" fill="none"/></svg>`;
      const chip = (b) => `<span class="pel-mchip">${icono(b)}<b>Nº ${b.n}</b><small>${t.kinds[clase(b)]} · ${pesoTxt(b)}</small></span>`;
      const p = this.hud.panel(`<h2>${t.title}</h2><p class="pel-sub">${tuPrimero ? t.first : t.second(rn)}</p><p class="pel-mat-what">${t.sub(n)}</p>
        <label class="pel-msel"><span>${t.tuyas}</span><select data-mat-sel>${['mixto', 'pegador', 'manos'].map(k => `<option value="${k}">${t.estilos[k](n)}</option>`).join('')}</select></label>
        <div class="pel-mchips" data-mat-tuyas></div><p class="pel-mat-what" data-mat-what></p><p class="pel-mrv" data-mat-rv></p>
        <div class="pel-row"><button class="pel-go" data-mat-go>${t.go}</button></div>`);
      p.querySelector('.pel-card')?.classList.add('pel-matcard');
      const pinta = () => {
        mias = elige(lot, n, mio, new Set(rv.map(b => b.n)));
        p.querySelector('[data-mat-tuyas]').innerHTML = mias.map(chip).join('');
        p.querySelector('[data-mat-what]').textContent = t.que[mio];
        p.querySelector('[data-mat-rv]').textContent = rv.length ? `${t.rival}: ${rv.map(b => `Nº ${b.n} (${t.kinds[clase(b)].toLowerCase()})`).join(' · ')}` : '';
      };
      const sel = p.querySelector('[data-mat-sel]');
      sel.addEventListener('change', () => { mio = sel.value; pinta(); this.audio.ui?.('tick'); });
      tap(p, (b) => {
        if (!b.hasAttribute('data-mat-go')) return;
        if (!rv.length) rv = elige(lot, n, estilo, new Set(mias.map(x => x.n)));
        pinta(); this.ponCesta(mias, rv);
        setTimeout(() => { if (this.active) { this.hud.closePanel(); res(); } }, tuPrimero ? 900 : 250);   // (lo que elige el rival, un momento a la vista)
      });
      pinta();
    });
  }
  // la pelota de cada saque: la elige quien saca. Tú, la tuya (la que dejaste o la que cambies antes de sacar); el rival,
  // por cómo va el partido
  bolaDelSaque() {
    const g = this.game, c = this.cesta; if (!g || !c) return;
    const sd = g.side(g.serverP?.() || g.server);
    if (sd === 'rival') { const sc = g.score || { you: 0, rival: 0 }, b = saqueRival(c.rival, perfil(this.o.rivalStats), sc.rival || 0, sc.you || 0);
      if (b !== this.bola && this.bola) this.hud.tip((this.txt.mat || TEXT.es.mat).rivalSaca((this.txt.mat || TEXT.es.mat).kinds[clase(b)])); this.bola = b; }
    else this.bola = this.bolaTuya;
    this.applyFeel(); this.pintaBolas();
  }
  // cambiar de pelota (tecla B o tocando el cestaño): solo antes de sacar tú
  puedesCambiar() { const g = this.game; return !!g && (g.phase === 'serveWait' || g.phase === 'servePrep') && g.side(g.serverP?.() || g.server) === 'you' && !g.rally; }
  cambiaBola(n = null) {
    if (!this.puedesCambiar() || !this.cesta) return;
    const L = this.cesta.you, i = L.indexOf(this.bolaTuya), b = n != null ? L.find(x => x.n === n) : L[(i + 1) % L.length];
    if (!b) return; this.bolaTuya = this.bola = b; this.applyFeel(); this.pintaBolas();
    this.audio.ui?.('tick');
  }
  pintaBolas() {
    if (!this.hud?.bolas || !this.cesta) return;
    const t = this.txt.mat || TEXT.es.mat, mio = this.puedesCambiar();
    this.hud.bolas(mio ? this.cesta.you : [this.bola], this.bola, mio, (b) => [t.kinds[clase(b)], pesoTxt(b)], mio ? (this.touch ? t.changeTouch : t.change) : t.cesta);
  }
  newGame() {
    this.hud?.root?.classList.remove('final');
    const o = this.o;
    this.cestaPorDefecto();
    const M = this.pairs ? this.mateObjs : null;
    this.game = new PelotaGame({ mode: o.mode || 'match', target: o.target, level: this.level, seed: o.seed, autoplay: o.autoplay, rivalStats: o.rivalStats, youStats: o.youStats,
      pairs: !!M, youRole: this.role, youMateStats: M?.youMate.stats, rivalMateStats: M?.rivalMate.stats, cuatro: this.cuatro && !M });
    this.court.setCuatro?.(!!this.game.cuatro);   // (la raya del 4 y medio, solo en el Cuatro y Medio)
    this.rec = null; this.repAt = 0;
    for (const m of Object.values(this.mateObjs || {})) if (m.obj) m.obj.visible = !!M;
    this.hud.setNames?.(this.label('you'), this.label('rival'));
    this.hud.setScore(0, 0, this.game.server, o.mode === 'rally' ? this.txt.rally(this.game.target) : this.txt.to(this.game.target));
    if (o.mode === 'rally') this.hud.setScore(0, '', this.game.server, this.txt.rally(this.game.target));
    this.lastSwing = { you: 0, rival: 0, youMate: 0, rivalMate: 0 };
  }
  // el nombre de cada lado: el pelotari o, por parejas, los dos
  label(sd) { const m = this.pairs && this.mateObjs?.[sd + 'Mate']; return m ? `${this.names[sd]} · ${m.name}` : this.names[sd]; }
  labels() { return [this.label('you'), this.label('rival')]; }
  // el nombre sin el pueblo entre paréntesis y las temporadas de cada lado (la presentación y el sorteo de la chapa)
  nomLimpio(sd) { return this.label(sd).replace(/\s*\([^)]*\)/g, ''); }
  tempDe(sd) { const TS = this.txt.toss || TEXT.es.toss; return this.seasons ? TS.seasons(this.seasons[sd] || 0) : ''; }

  // ------------------------------------------------------------ paneles
  intro() {
    const t = this.txt, g = this.game, L = t.levels || TEXT.es.levels;
    this.hud.controls(false);
    // mano a mano o por parejas (y tú, de delantero o de zaguero): solo en los partidos libres
    const canPairs = !!this.o.mates && g.mode === 'match', P = t.pairs || TEXT.es.pairs;
    const mods = [['mano', P.single], ['delantero', P.front], ['zaguero', P.back], ['cuatro', P.four || TEXT.es.pairs.four]].filter(([k]) => !(this.o.forcePairs && (k === 'mano' || k === 'cuatro'))), cur = this.pairs ? this.role : this.o.forcePairs ? this.role : this.cuatro ? 'cuatro' : 'mano';
    const TT = t.tour || TEXT.es.tour, MT = t.mat || TEXT.es.mat, CD = t.camDyn || TEXT.es.camDyn, OT = t.optTabs || TEXT.es.optTabs, RP = t.repe || TEXT.es.repe;
    const reglas = [...(this.cuatro ? [(t.cuatro || TEXT.es.cuatro).rule] : []), ...t.rules];
    const sum = [mods.find(([k]) => k === cur)?.[1] || P.single, g.mode === 'rally' ? t.rally(g.target) : t.to(g.target)].filter(Boolean).join(' · ');
    // arriba quién juega y dónde (el frontón y lo que se nota en él); lo que se elige poco, plegado en «Más opciones» con
    // lo elegido a la vista; abajo, en una fila, el nivel y los botones
    const p = this.hud.panel(`<h2>${t.title}</h2><p class="pel-sub">${esc(this.label('you'))} vs ${esc(this.label('rival'))} · ${g.mode === 'rally' ? t.rally(g.target) : t.to(g.target)} <button class="pel-chip" data-pel-tour>${TT.btn}</button></p>
      ${this.rivalHtml()}
      ${this.courtHtml()}
      <button class="pel-more" data-pel-more aria-expanded="false"><b>${t.moreTitle || TEXT.es.moreTitle}</b><span class="pel-sum">${esc(sum)}</span></button>
      <section class="pel-opts"${this.moreOpen ? '' : ' hidden'}>
        <div class="pel-otabs" role="tablist"><button class="pel-back" data-pel-back>${t.optBack || TEXT.es.optBack}</button>${OT.map((l, i) => `<button role="tab" data-pel-tab="${i}" aria-selected="${i === (this.optTab || 0)}">${l}</button>`).join('')}</div>
        <div class="pel-opane" data-pane="0"${(this.optTab || 0) === 0 ? '' : ' hidden'}>
        ${canPairs ? `<div class="pel-levels pel-mod" role="group" aria-label="${P.label}">${mods.map(([k, l]) => `<button data-pel-mod="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>` : ''}
        ${this.pairs ? `<p class="pel-pairs">${P.how(this.role === 'delantero')} ${P.energy}</p>` : ''}
        <div class="pel-orow"><p class="pel-ballwhat"><b>${MT.title}.</b> ${MT.sub(POR_LADO(this.pairs))}</p>
        <button class="pel-switch" data-pel-cam role="switch" aria-checked="${!!this.camDyn}"><span><b>${CD[0]}</b><small>${CD[1]}</small></span><i aria-hidden="true"></i></button>
        <button class="pel-switch" data-pel-repe role="switch" aria-checked="${!!this.repe}"><span><b>${RP[0]}</b><small>${RP[1]}</small></span><i aria-hidden="true"></i></button></div></div>
        <div class="pel-opane" data-pane="1"${this.optTab === 1 ? '' : ' hidden'}><ol>${reglas.map(r => `<li>${r}</li>`).join('')}</ol></div>
        <div class="pel-opane" data-pane="2"${this.optTab === 2 ? '' : ' hidden'}><div class="pel-ctrl">${this.touch ? t.ctrlTouch : t.ctrlKeys}</div></div>
      </section>
      ${this.o.fixedLevel ? '' : `<small class="pel-lbl">${t.level || 'Nivel'}</small><div class="pel-levels pel-lv5" role="group" aria-label="${t.level || 'Nivel'}">${LEVEL_ORDER.map(k => `<button data-pel-lv="${k}" aria-pressed="${k === this.level}">${L[k]}</button>`).join('')}</div>`}
      <div class="pel-row"><button class="pel-go alt" data-pel-x>${t.later}</button><button class="pel-go" data-pel-go>${t.play}</button></div>`);
    // «Más opciones» es otra vista del mismo panel (en vez de alargarlo): quién juega y el frontón se apartan y salen las
    // opciones en pestañas, con el nivel y los botones de jugar siempre abajo
    const card = p.querySelector('.pel-card') || p, opts = p.querySelector('.pel-opts');
    const showOpts = (on) => { this.moreOpen = on; card.classList.toggle('opts', on); if (opts) opts.hidden = !on; p.querySelector('[data-pel-more]')?.setAttribute('aria-expanded', String(on)); };
    showOpts(!!this.moreOpen);
    tap(p, (b) => {
      if (b.dataset.pelLv) { this.level = b.dataset.pelLv; for (const x of p.querySelectorAll('[data-pel-lv]')) x.setAttribute('aria-pressed', x.dataset.pelLv === this.level); this.newGame(); }
      if (b.dataset.pelMod) { this.chooseMode(b.dataset.pelMod); return; }
      if (b.hasAttribute('data-pel-more')) { showOpts(true); p.querySelector(`[data-pel-tab="${this.optTab || 0}"]`)?.focus({ preventScroll: true }); return; }
      if (b.hasAttribute('data-pel-back')) { showOpts(false); p.querySelector('[data-pel-more]')?.focus({ preventScroll: true }); return; }
      if (b.dataset.pelTab != null) { this.optTab = +b.dataset.pelTab;
        for (const x of p.querySelectorAll('[data-pel-tab]')) x.setAttribute('aria-selected', String(x === b));
        for (const x of p.querySelectorAll('.pel-opane')) x.hidden = +x.dataset.pane !== this.optTab; return; }
      if (b.hasAttribute('data-pel-cam')) { this.camDyn = !this.camDyn; try { localStorage.setItem('herrizherri-pelota-cam', this.camDyn ? '1' : '0'); } catch (e) { } b.setAttribute('aria-checked', String(this.camDyn)); return; }
      if (b.hasAttribute('data-pel-repe')) { this.repe = !this.repe; try { localStorage.setItem('herrizherri-pelota-repe', this.repe ? '1' : '0'); } catch (e) { } b.setAttribute('aria-checked', String(this.repe)); return; }
      if (b.dataset.pelFicha) { this.ficha(b.dataset.pelFicha); return; }
      if (b.hasAttribute('data-pel-court')) { const w = p.querySelector('.pel-court-what'); if (w) { w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); } return; }
      if (b.hasAttribute('data-pel-tour')) { this.startTour(); return; }
      if (b.hasAttribute('data-pel-go') && this.loadingMates) return;
      if (b.hasAttribute('data-pel-go')) {   // (antes de la presentación, la elección de material; en el peloteo y en las pruebas, sin ella)
        this.audio.ensure();
        if (this.game.mode === 'match' && !window.__autoWin && !(navigator.webdriver && !window.__material)) this.eleccion().then(() => this.active && this.vsThenPlay());
        else { this.hud.closePanel(); this.vsThenPlay(); }
      }
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
    const go = () => { if (!this.active) return; this.vsOpen = false; this.hud.controls(true); this.game.start(); this.audio.mood(0.22, 0.6);
      if (!this.contado) { this.contado = true; try { localStorage.setItem('herrizherri-pelota-consejos', this.consejosN + 1); } catch (e) { /* sin almacenamiento */ } } };   // (sin silbato: en la pelota no hay; la grada se calla para el saque)
    // (después de la presentación, el sorteo del saque con la chapa: saca el del color que sale)
    const sorteo = () => { if (!this.active) return; this.tossChapa(true).then((sd) => { if (!this.active) return; this.game.server = sd; this.game.placeForServe(); go(); }); };
    const V = this.o.vsImg;
    if (!V || this.o.autostart || window.__autoWin || (navigator.webdriver && !window.__vs)) return go();
    // (en la final de un campeonato, antes la presentación con los focos: show.js)
    if (this.o.focos && !this.focosHechos && (!navigator.webdriver || window.__focos)) { this.focosHechos = true; this.presentacion().then(() => { if (this.active) this.vsThenPlay(); }); return; }
    const t = this.txt, L = t.levels || TEXT.es.levels, M = this.pairs && this.mateObjs, P = t.pairs || TEXT.es.pairs, g = this.game;
    const rt = splitName(this.names.rival).town || this.o.town || '';
    const line = [M ? (this.role === 'delantero' ? P.front : P.back) : this.cuatro ? (P.four || TEXT.es.pairs.four) : P.single, g.mode === 'rally' ? t.rally(g.target) : t.to(g.target), this.o.fixedLevel ? '' : L[this.level]].filter(Boolean).join(' · ');
    this.vsOpen = true; this.met = true;
    // (las cartas: la media y las tres cualidades de cada uno, como en el cuadro del torneo)
    const N = t.card || TEXT.es.card, cardOf = (st, seed, bonus) => { const r = pelotariRating(st || {}, seed, bonus); return { ovr: r.ovr, ovrLabel: t.ovr || TEXT.es.ovr, stats: [r.vel, r.pot, r.man].map((v, i) => ({ k: N[i], v })) }; };
    const yn = this.label('you'), rn = this.nomLimpio('rival'), C = this.cols, temp = (sd) => this.tempDe(sd);
    // (cada uno con el color que viste: los azules a la izquierda y los colorados a la derecha, como en el frontón)
    const A = { name: yn, sub: [this.o.town || '', temp('you')].filter(Boolean).join(' · '), img: V.you, pf: V.fig?.(splitName(this.names.you).name, C.you), mateImg: M ? V.you : null, matePf: M ? V.fig?.(M.youMate?.name, C.you) : null, ...cardOf(this.o.youStats, `${splitName(this.names.you).name} ${this.o.town || ''}`, this.o.youBonus ?? 2) };
    const B = { name: rn, sub: [rt, temp('rival')].filter(Boolean).join(' · '), img: V.rival, pf: V.fig?.(splitName(this.names.rival).name, C.rival), mateImg: M ? V.rival : null, matePf: M ? V.fig?.(M.rivalMate?.name, C.rival) : null, ...cardOf(this.o.rivalStats, `${splitName(this.names.rival).name} ${rt}`, this.o.rivalBonus ?? 0) };
    showVs(this.hud.root, {
      comp: this.o.comp || t.friendly || TEXT.es.friendly,
      // (V.fig: la figura de cada uno por su nombre, si el juego la da; si no, las imágenes V.you y V.rival)
      you: C.you === 'azul' ? A : B, rival: C.you === 'azul' ? B : A,
      venue: this.o.venue || (this.o.town ? (t.fronton || TEXT.es.fronton)(this.o.town) : ''), cond: this.o.cond, tags: this.feel?.tags || [],
      line, quote: rivalQuote(this.o.rivalStats || {}, this.lang), quoteBy: rn, tap: t.vsTap || TEXT.es.vsTap, onSlam: () => this.audio.slam?.(),
    }).then(g.mode === 'match' ? sorteo : go);   // (en el peloteo saca siempre el rival: sin sorteo)
  }
  // la presentación de los pelotaris con los focos (show.js): a oscuras, un haz busca al colorado y otro al azul, cada uno
  // con su nombre abajo, y se encienden todas las luces con el aplauso. Tocando o con una tecla, se salta
  presentacion() {
    return new Promise(res => {
      const g = this.game, A = this.audio, C = this.cols, sd = (col) => (C.you === col ? 'you' : 'rival');
      this.hud.controls(false); this.camInit = false;
      this.show = new Focos(this.T, this.court, { exposure: this.o.exposure, spots: this.court.standSpots });
      this.showP = { rojo: g.players[sd('rojo')], azul: g.players[sd('azul')] };
      A.ensure(); A.mood(0.85, 0.4); A.aplauso(0.35, 1.6);
      const TS = this.txt.toss || TEXT.es.toss;
      this.showCall = (k) => {
        if (k === 'luz') { A.aplauso(0.95, 4.2); A.mood(0.7, 0.3); this.shake = 0.15; return; }
        const who = sd(k); A.aplauso(0.7, 2.6);
        this.hud.presenta(this.nomLimpio(who), [k === 'rojo' ? TS.rojo : TS.azul, who === 'you' ? this.o.town || '' : splitName(this.names.rival).town || this.o.town || '', this.tempDe(who)].filter(Boolean).join(' · '), k);
      };
      const fin = () => { removeEventListener('pointerdown', salta, true); removeEventListener('keydown', salta, true); this.show?.end(); this.show = null; this.hud.presenta(''); this.camInit = false; res(); };
      const salta = (e) => { e.stopPropagation?.(); fin(); };
      setTimeout(() => { if (this.show) { addEventListener('pointerdown', salta, true); addEventListener('keydown', salta, true); } }, 400);
      this.showFin = fin;
    });
  }
  // el sorteo del saque: el juez echa al aire la chapa (una cara azul y otra colorada) y saca el del color que sale. Se
  // lanza tocando el botón (o sola a los pocos segundos); devuelve el lado que saca, 'you' o 'rival'
  // (directo: viene de la presentación, que se desvanece encima; su fondo ya está, sin un momento de la cancha entre las dos)
  tossChapa(directo = false) {
    const t = this.txt, TS = t.toss || TEXT.es.toss, C = this.cols, de = (col) => (C.you === col ? 'you' : 'rival');
    const nom = (sd) => this.nomLimpio(sd), temp = (sd) => this.tempDe(sd);
    const lado = (col) => `<div class="pel-toss-p ${col}"><i aria-hidden="true"></i><b>${esc(nom(de(col)))}</b><small>${esc([col === 'azul' ? TS.azul : TS.rojo, temp(de(col))].filter(Boolean).join(' · '))}</small></div>`;
    return new Promise(res => {
      const el = document.createElement('div'); el.className = directo ? 'pel-toss directo' : 'pel-toss'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', TS.title);
      el.innerHTML = `<div class="pel-toss-card"><small class="pel-toss-k">${esc(TS.title)}</small>
        <div class="pel-toss-row">${lado('azul')}<div class="pel-toss-coin" aria-hidden="true"><div class="coin"><span class="f azul"></span><span class="f rojo"></span></div><div class="sh"></div></div>${lado('rojo')}</div>
        <p class="pel-toss-why">${esc(this.seasons ? TS.why : TS.auto)}</p><button class="pel-go pel-toss-go">${esc(TS.throw)}</button><p class="pel-toss-res" aria-live="polite"></p></div>`;
      this.hud.root.appendChild(el);
      const win = Math.random() < 0.5 ? 'azul' : 'rojo', coin = el.querySelector('.coin');
      let tirada = false; const tms = [];
      const tirar = () => {
        if (tirada || !this.active) return; tirada = true; clearTimeout(auto); removeEventListener('keydown', tecla, true);
        coin.style.setProperty('--fin', win === 'azul' ? '0deg' : '180deg'); el.classList.add('aire'); this.audio.ensure();
        tms.push(setTimeout(() => { this.audio.chapa(); el.classList.add('cae'); el.querySelector(`.pel-toss-p.${win}`)?.classList.add('gana');
          const r = el.querySelector('.pel-toss-res'); r.textContent = TS.serves(nom(de(win))); r.className = `pel-toss-res ${win}`; }, 1450));
        tms.push(setTimeout(() => { el.classList.add('out'); tms.push(setTimeout(() => { el.remove(); res(de(win)); }, 320)); }, 3100));
      };
      el.querySelector('.pel-toss-go').addEventListener('click', tirar);
      // (con el teclado o el mando, las teclas de golpear o Intro también la lanzan)
      const tecla = (e) => { if ([' ', 'enter', 'j', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); tirar(); } };
      addEventListener('keydown', tecla, true);
      const auto = setTimeout(tirar, 4200);   // (si no se toca, la lanza el juez)
      this.tossEl = el; this.tossOff = () => { clearTimeout(auto); tms.forEach(clearTimeout); removeEventListener('keydown', tecla, true); el.remove(); };
    });
  }
  // ------------------------------------------------------------ la repetición de cada tanto
  // Se graba el tanto (desde que se bota para sacar hasta un momento después de cantarlo) y, al cantarlo, se repite desde
  // otro plano (alternando la contracancha en alto y el frontis), con cámara lenta en el final; tocando se salta
  record(dt) {
    const g = this.game, ph = g.phase;
    if (ph === 'servePrep' && this.recPh !== 'servePrep') { this.rec = []; this.recT = 0; }   // (un saque nuevo: empieza otra grabación)
    this.recPh = ph;
    if (!this.rec || !(ph === 'servePrep' || ph === 'rally' || (ph === 'point' && g.phaseT < 1.1))) return;
    while (this.recT > 8 && this.rec.length > 1) this.recT -= this.rec.shift().dt;   // (los 8 últimos segundos, sea cual sea la pantalla: se repiten 5 y un poco)
    const P = {}; for (const id of g.ids) { const sd = this.o[id] || this.mateObjs?.[id]; if (sd?.obj && sd.obj.visible !== false) P[id] = [sd.obj.position.x, sd.obj.position.y, sd.obj.position.z, sd.obj.rotation.y, { ...(this.recSt?.[id] || {}) }]; }
    const b = g.ball.p; this.recT = (this.recT || 0) + dt; this.rec.push({ dt, b: [b.x, b.y, b.z], P, ev: this.recEv?.length ? this.recEv.splice(0) : null, call: !!this.recCall }); this.recCall = false;
  }
  startReplay() {
    const F = this.rec || []; if (F.length < 30) return;
    let ts = 0; for (const f of F) { f.ts = ts; ts += f.dt; }
    const call = F.find(f => f.call)?.ts ?? ts, t0 = Math.max(0, call - 5);   // (los 5 últimos segundos del tanto y lo de después)
    const RP = this.txt.replay || TEXT.es.replay;
    this.replay = { F, t: t0, end: ts, call, i: Math.max(0, F.findIndex(f => f.ts >= t0)), n: (this.repN = (this.repN || 0) + 1) };
    const el = this.repEl = document.createElement('div'); el.className = 'pel-rep';
    el.innerHTML = `<div class="pel-rep-b"><i aria-hidden="true"></i><b>${esc(RP.label)}</b><span class="sl">${esc(RP.slow)}</span></div><small>${esc(RP.skip)}</small>`;
    this.hud.root.appendChild(el); this.hud.root.classList.add('repe'); this.camInit = false;
    this.repSkip = (e) => { e.stopPropagation?.(); this.endReplay(); };
    this.repArm = setTimeout(() => { if (this.replay) { addEventListener('pointerdown', this.repSkip, true); addEventListener('keydown', this.repSkip, true); } }, 300);
  }
  endReplay() {
    if (!this.replay) return;
    this.replay = null; clearTimeout(this.repArm);
    removeEventListener('pointerdown', this.repSkip, true); removeEventListener('keydown', this.repSkip, true);
    this.repEl?.remove(); this.repEl = null; this.hud.root.classList.remove('repe'); this.camInit = false;
  }
  stepReplay(dt) {
    const R = this.replay, C = this.court, T = this.T, grp = C.group;
    if (this.paused) return;
    const slow = R.t > R.call - 1.3 && R.t < R.call + 0.3, sp = slow ? 0.38 : 0.85;
    R.t += dt * sp; this.repEl?.classList.toggle('slow', slow);
    if (R.t >= R.end) { this.endReplay(); return; }
    while (R.i < R.F.length - 1 && R.F[R.i + 1].ts <= R.t) { R.i++; for (const e of R.F[R.i].ev || []) this.repSound(e); }
    const f = R.F[R.i];
    C.showBall({ x: f.b[0], y: f.b[1], z: f.b[2] }, 0);
    for (const id in f.P) { const sd = this.o[id] || this.mateObjs?.[id]; if (!sd?.obj) continue; const [x, y, z, ry, st] = f.P[id]; sd.obj.position.set(x, y, z); sd.obj.rotation.y = ry; if (sd.animate) sd.animate(sd.obj, st, dt * sp); }
    // dos planos que se turnan: desde la contracancha, en alto, siguiendo la pelota; y desde el frontis, de cara a los pelotaris
    // (cuatro planos que se turnan: además, uno bajo junto a la pared izquierda, a ras de la jugada, y otro desde lo alto)
    const bz = Math.max(2, Math.min(COURT.L, f.b[2])), k4 = R.n % 4, front = k4 === 0;
    const lp = front ? [2.6, 2.3, 1.4] : k4 === 2 ? [-COURT.W / 2 + 0.9, 1.25, Math.min(COURT.L, bz + 3.5)] : k4 === 3 ? [0.6, 13.5, bz + 1.5] : [COURT.W / 2 + 3, 6.2, Math.max(7, Math.min(COURT.L + 1, bz + 6.5))];
    const ll = front ? [f.b[0] * 0.6, Math.max(0.8, Math.min(3, f.b[1])), Math.max(5, bz)] : k4 === 2 ? [f.b[0], Math.max(0.6, Math.min(2.5, f.b[1])), bz - 4] : k4 === 3 ? [f.b[0] * 0.5, 0, bz - 0.6] : [f.b[0] * 0.4, 1.1, bz - 2.5];
    this.cabe(lp, ll);
    const wp = grp.localToWorld(new T.Vector3(lp[0], lp[1], lp[2])), wl = grp.localToWorld(new T.Vector3(ll[0], ll[1], ll[2]));
    if (!this.camInit) { this.camPos.copy(wp); this.camLook.copy(wl); this.camInit = true; }
    const k = 1 - Math.exp(-4 * dt); this.camPos.lerp(wp, k); this.camLook.lerp(wl, k);
    this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook);
    if (Math.abs(this.cam.fov - 50) > 0.01) { this.cam.fov = 50; this.cam.updateProjectionMatrix(); }
    C.reboteSeeThrough?.(false, dt);
  }
  repSound(e) { const A = this.audio; if (e === 'hit') A.hit(0.5); else if (e === 'front') A.front(0.45); else if (e === 'chapa') A.chapa(); else if (e === 'floor') A.floor(0.45); else A.wall(); }
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
    tap(el, (b) => { const a = b.dataset.t;
      if (a === 'end') return this.endTour();
      this.tour.i = Math.max(0, Math.min(n - 1, this.tour.i + (a === 'next' ? 1 : -1))); this.tourCard(); }, '[data-t]');
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
    const pairs = k === 'delantero' || k === 'zaguero';
    if (pairs && !this.mateObjs) {
      this.loadingMates = true;
      const go = this.hud.panelEl?.querySelector('[data-pel-go]'); if (go) { go.disabled = true; go.textContent = (this.txt.pairs || TEXT.es.pairs).loading; }
      try { this.mateObjs = await this.o.mates(); } catch (e) { console.warn('parejas', e); this.mateObjs = null; }
      this.loadingMates = false;
      if (!this.active) return;
      if (!this.mateObjs) { this.intro(); return; }   // (sin los pelotaris, se queda el mano a mano)
    }
    this.pairs = pairs; if (pairs) this.role = k; this.cuatro = k === 'cuatro';
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
    for (const p of L) { p.color = this.cols[p.side]; p.cara = p.you ? o.caras?.you : null; p.fig = p.you ? null : o.caras?.fig?.(splitName(p.name).name, p.color); }
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
    // (lo que ha dado el partido: la experiencia, el nivel y lo que ha subido cada cualidad; game/pelotariProgreso.js)
    const gano = this.o.progreso?.(e, g.stats, g.mode), xpHtml = gano ? this.xpBloque(gano) : '';
    const p = this.hud.panel(`<h2>${e.win ? (g.mode === 'rally' ? t.rallyWin : t.win) : t.lose}</h2><p class="pel-sub">${esc(this.label('you'))} – ${esc(this.label('rival'))}${g.mode === 'rally' ? '' : ` <button class="pel-chip" data-pel-fichas>${t.fichas || TEXT.es.fichas}</button>`}</p>
      <div class="pel-big">${big}</div>${xpHtml || `<div class="pel-fact"><b>${t.factsTitle}</b><br>${fact}</div>`}
      <div class="pel-row">${this.o.back === 'torneo' ? '' : `<button class="pel-go alt" data-pel-again>${t.again}</button>`}<button class="pel-go" data-pel-cont>${cont}</button></div>`);
    tap(p, (b) => {
      if (b.hasAttribute('data-pel-again')) {   // (la revancha, también con su elección de material)
        this.newGame(); const va = () => { if (!this.active) return; this.hud.controls(true); this.game.start(); this.audio.mood(0.22, 0.6); };
        if (this.game.mode === 'match' && !window.__autoWin && !(navigator.webdriver && !window.__material)) this.eleccion().then(va); else { this.hud.closePanel(); va(); }
      }
      if (b.hasAttribute('data-pel-cont')) this.finish(e);
      if (b.hasAttribute('data-pel-fichas')) this.ficha('rival');
    });
    this.result = e;
  }
  /** El bloque de la experiencia en el panel del final: el nivel con su barra, lo ganado y lo que ha subido cada cualidad. */
  xpBloque(g) {
    const X = this.txt.xp || TEXT.es.xp, sub = g.ahora.n > g.antes.n, dec = (v) => String(v).replace('.', ',');
    const q = Object.entries(g.subidas).filter(([, v]) => v > 0).map(([k, v]) => `<li><b>${esc(X.q[k] || k)}</b><span>+${dec(v.toFixed(2))}</span><small>${dec(g.cualidades[k].toFixed(2))}</small></li>`).join('');
    return `<div class="pel-xp${sub ? ' sube' : ''}"><div class="pel-xp-top"><b>${esc(sub ? X.up(g.ahora.n) : X.level(g.ahora.n))}</b><span>${esc(X.gained(g.xp))}</span></div>
      <i class="pel-xp-bar" aria-hidden="true"><u style="width:${Math.round(100 * g.ahora.en / g.ahora.falta)}%"></u></i>${q ? `<ul>${q}</ul>` : ''}</div>`;
  }
  confirmExit() {
    const t = this.txt; const wasPaused = this.paused; this.paused = true;
    // (en la pausa, también las fichas de los pelotaris: se miran sin salir del partido)
    const fichas = this.game.mode === 'rally' ? '' : `<button class="pel-go alt pel-wide" data-pel-fichas>${t.fichas || TEXT.es.fichas}</button>`;
    const p = this.hud.panel(`<h2>${t.exit}</h2><p>${t.sure}</p>${fichas}<div class="pel-row"><button class="pel-go alt" data-pel-yes>${t.yes}</button><button class="pel-go" data-pel-no>${t.no}</button></div>`);
    tap(p, (b) => {
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
      const k = e.key.toLowerCase(), down = e.type === 'keydown';
      const mine = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'j', 'k', 'l', 'e', 'b', 'escape', 'enter'];
      if (!mine.includes(k)) return;
      // (soltar vale siempre: entre tanto y tanto, con una ventana abierta o con el partido parado; antes se perdía y la
      // palanca o la tecla se quedaban pulsadas al volver, hacia la izquierda, sin dejar mover)
      const suelta = () => { I.keys[k] = false; const kind = ({ ' ': 'hit', j: 'hit', e: 'hit', enter: 'hit', shift: 'drop', k: 'drop', l: 'cut' })[k]; if (kind && I.charge?.kind === kind) I.charge = null; };
      if (!down && !this.active) { suelta(); return; }
      if (!this.active) return;
      // (durante el vuelo de la llegada y el sorteo de la chapa, las teclas son suyas: saltar el vuelo, lanzar la chapa)
      if (this.flying || this.tossEl?.isConnected) { if (!down) suelta(); return; }
      // (con una ventana abierta, Intro y espacio pulsan su botón elegido: antes golpeaban y no se podía confirmar «Sí, salir»)
      if (hud.panelEl && (k === 'enter' || k === ' ') && hud.panelEl.contains(document.activeElement)) { if (!down) suelta(); return; }
      e.preventDefault(); e.stopPropagation();
      if (down && !I.keys[k]) {
        if (k === 'b') this.cambiaBola();   // (antes de sacar: la siguiente pelota de las tuyas)
        if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') this.chargeStart('hit');
        if (k === 'shift' || k === 'k') this.chargeStart('drop');
        if (k === 'l') this.chargeStart('cut');
        if (k === 'escape') { if (hud.panelEl) return; this.confirmExit(); }
      }
      if (!down && I.keys[k]) { if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') this.chargeEnd('hit'); if (k === 'l') this.chargeEnd('cut'); if (k === 'shift' || k === 'k') this.chargeEnd('drop'); }
      I.keys[k] = down;
    };
    addEventListener('keydown', this.onKey, true); addEventListener('keyup', this.onKey, true);
    // (al irse la ventana, todo suelto: las teclas, la palanca y el golpe que se estaba cargando, que si no dejaba al
    // pelotari apuntando y sin moverse)
    this.soltar = () => { I.keys = {}; this.resetStick?.(); I.charge = null; I.hitQ = I.dropQ = I.cutQ = false; };
    this.onBlur = () => this.soltar();
    addEventListener('blur', this.onBlur);
    // joystick táctil
    const zone = hud.$('.pel-stick'), knob = hud.$('.pel-knob'), R = 56;
    zone.addEventListener('pointerdown', (e) => {
      // (otro dedo en la zona manda él: si el anterior se quedó enganchado sin su «soltar», tocar otra vez lo arregla)
      if (I.stick.id === e.pointerId) return;
      // (el centro, con sitio alrededor para llevarlo casi del todo a cualquier lado: tocando pegado al borde izquierdo o al
      // de abajo, el dedo no tenía por dónde ir y a la izquierda no pasaba de un tercio; ahí, ya cuenta como algo empujado
      // hacia ese lado)
      const zr = zone.getBoundingClientRect(), ox = Math.max(e.clientX, zr.left + R * 0.75), oy = Math.min(e.clientY, zr.bottom - R * 0.75);
      I.stick = { id: e.pointerId, ox, oy, x: 0, y: 0 };
      try { zone.setPointerCapture?.(e.pointerId); } catch { /* (un puntero sintético de las pruebas) */ }
      knob.style.display = 'block'; knob.style.left = (ox - zr.left) + 'px'; knob.style.top = (oy - zr.top) + 'px';
      knob.firstElementChild.style.transform = ''; mueve(e);
      const h = hud.$('.pel-stickhint'); if (h) h.remove();
    });
    function mueve(e) {
      if (e.pointerId !== I.stick.id) return;
      let dx = e.clientX - I.stick.ox, dy = e.clientY - I.stick.oy; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      I.stick.x = dx / R; I.stick.y = -dy / R;
      knob.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
    }
    zone.addEventListener('pointermove', mueve);
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
    this.onHide = () => { if (document.hidden) this.soltar(); }; document.addEventListener('visibilitychange', this.onHide);
    // botones: el golpe, la cortada y la dejada se cargan mientras se mantienen y salen al soltar (un toque, suave)
    const btn = (sel, flag, charge) => {
      const b = hud.$(sel);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); this.audio.ensure(); if (charge) this.chargeStart(charge); else I[flag] = true; });
      const up = () => { b.classList.remove('down'); if (charge) this.chargeEnd(charge); };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    };
    // (cada botón por su nombre: la cortada lleva el estilo de los botones pequeños y antes se cogía como si fuese la dejada)
    btn('.pel-hit', 'hitQ', 'hit'); btn('.pel-dejada', 'dropQ', 'drop'); btn('.pel-cut', 'cutQ', 'cut');
    // (la X responde al levantar el dedo: en el iPhone, en pleno partido, el clic a veces no llegaba y no se podía salir)
    tap(hud.$('.pel-exit'), () => { if (!hud.panelEl) this.confirmExit(); });
  }
  // carga del golpe: cuanto más se mantiene, más fuerte; un toque corto es un golpe suave. A tope en 1 s (la dejada, en
  // 1,3 s) y al principio más despacio: así se afina bien un golpe suave o medio y la altura de la dejada (antes, a tope
  // en 0,7 s y en línea recta, costaba parar donde querías)
  chargeStart(kind) { if (!this.input.charge) this.input.charge = { kind, t0: this.t }; }
  chargeLevel() { const c = this.input.charge; return c ? Math.pow(Math.min(1, (this.t - c.t0) / (c.kind === 'drop' ? 1.3 : 1)), 1.15) : 0; }
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
    if (this.replay) { this.stepReplay(dt); this.hud.tick(dt); this.court.tick(dt); return this.active; }
    if (this.show && !this.show.step(dt, this.showP, (k) => this.showCall?.(k))) this.showFin?.();
    if (this.repAt && this.t >= this.repAt && !this.paused && !this.hud.panelEl) { this.repAt = 0; this.startReplay(); if (this.replay) return this.active; }
    // (el golpe sale siempre al soltar: con la carga a tope, espera a que tú decidas)
    this.hud.charge(this.chargeLevel(), this.input.charge?.kind);
    // (con el partido en pausa o una ventana abierta no se juega: el golpe que se cargaba se suelta sin golpear)
    if ((this.paused || this.hud.panelEl) && this.input.charge) this.input.charge = null;
    if (this.entra?.go && !this.flying) this.pasoEntrada(dt);
    const g = this.game, inp = this.paused || this.hud.panelEl ? {} : this.readInput();
    const ev = this.paused ? [] : g.update(dt, inp);
    for (const e of ev) { this.onEvent(e); this.o.onEvent?.(e); }
    this.draw(dt); if (!this.paused) this.record(dt);   // (en pausa no se graba: la repetición sería una imagen quieta)
    this.hud.tick(dt); this.court.tick(dt);
    return this.active;
  }
  onEvent(e) {
    const t = this.txt, g = this.game, A = this.audio, C = this.court;
    // (lo que suena en el tanto, para la repetición; y al cantarlo, la repetición, salvo en las pruebas automáticas)
    if (e.type === 'hit' || e.type === 'floor' || e.type === 'wall' || e.type === 'back') (this.recEv ||= []).push(e.type);
    else if (e.type === 'front') (this.recEv ||= []).push(e.chapa ? 'chapa' : 'front');
    else if (e.type === 'call') { this.recCall = true; if (g.mode === 'match' && this.repe && this.rec?.length > 30 && !(navigator.webdriver && !window.__repe)) this.repAt = this.t + 1.15; }
    switch (e.type) {
      case 'serveReady': this.hud.setScore(g.mode === 'rally' ? g.streak : g.score.you, g.mode === 'rally' ? '' : g.score.rival, g.server);
        this.bolaDelSaque();   // (quien saca elige la pelota del cestaño)
        // (la grada se calla para el saque; en el tanto de partido, contiene el aliento)
        this.rallyN = 0; this.golpazo = false; A.mood(0.2, 0.5);
        if (e.matchPoint) { this.hud.call(t.matchPoint, t.matchPointSub, '', 1.6); A.mood(0.45, 0.3); }   // (la grada se mete: sin el «¡oooh!» sintetizado, que zumbaba)
        break;
      case 'hit': {
        // la fuerza también se oye y se nota: un golpe a tope suena más fuerte y sacude un poco la cámara
        const pw = e.pow ?? 0.5; A.hit((0.5 + e.q * 0.4) * (0.55 + pw * 0.75)); C.pop(e, 'z');
        // (cuanto más largo el peloteo, más se mete la grada: el murmullo sube poco a poco)
        this.rallyN = (this.rallyN || 0) + 1; A.mood(Math.min(0.52, 0.2 + this.rallyN * 0.03), 0.8);
        if (e.who === 'you' && pw > 0.8 && e.shot !== 'dejada') this.shake = Math.max(this.shake || 0, 0.12 + (pw - 0.8) * 0.6);
        // (cámara dinámica: un empujón hacia la cancha, mayor cuanto más fuerte y mejor le das)
        if (e.who === 'you' && e.shot !== 'dejada') this.kick = Math.max(this.kick || 0, Math.min(1, pw * 0.7 + (e.label === 'perfect' ? 0.35 : 0)));
        // el aviso de cómo ha salido: una sola palabra, pequeña y rápida (perfecto, bien, justo, pronto, tarde). Antes era
        // grande en el centro y llevaba debajo el golpe, la fuerza y la energía: tapaba la jugada en cada golpe
        if (e.who === 'you') this.hud.quality(t.quality[e.label] || TEXT.es.quality[e.label], '', e.label);
        // el nombre del golpe, como en la tele, si es de los que deciden (dos paredes, gancho, cortada, dejada, al rebote…)
        { const SH = t.shots || TEXT.es.shots, nm = (e.sub && SH[e.sub]) || SH[e.shot] || '';
          this.golpazo = !!nm && !['pared', 'ancho', 'largo'].includes(e.shot);
          if (nm && e.q > 0.3 && (this.golpazo || e.volea || e.shot === 'rebote')) { this.hud.golpe(e.volea && !/volea/i.test(nm) ? `${nm} · ${t.hitVolley || TEXT.es.hitVolley}` : nm, this.cols[g.side(e.who)]);
            // (y en los que deciden, la cámara se mete un poco más en la jugada)
            if (this.golpazo && this.camDyn) this.kick = Math.max(this.kick || 0, e.who === 'you' ? 0.5 : 0.35); } }
        this.swingAnim(e.who); break;
      }
      case 'whiff': this.hud.quality(e.early ? (t.quality.early || TEXT.es.quality.early) : t.quality.whiff, '', 'whiff'); break;
      case 'claim': this.hud.quality((t.pairs || TEXT.es.pairs).claim); break;   // (pides la pelota de tu compañero)
      // (la chapa: su «¡clonc!» y su destello, sin sacudir la cámara: el fallo temblaba como una vibración)
      case 'front': if (e.chapa) { A.chapa(); C.chapaT = 0.6; } else A.front(); C.pop({ x: e.x, y: e.y, z: 0.02 }, 'z'); break;
      case 'wall': A.wall(); break;
      case 'back': A.wall(); if (e.live) this.hud.quality(t.rebote || '¡Al rebote!'); break;   // el rebote: la pared de atrás
      case 'floor': A.floor(e.soft ? 0.5 : 0.8); break;
      case 'streak': this.hud.setScore(e.n, '', g.server); break;
      case 'call': {
        this.lastWin = e.winner; this.lastFinal = !!e.final; this.planoT = this.t;
        const [title, sub] = t.calls[e.call] || t.calls.tanto;
        const who = e.winner === 'you' ? (g.pairs ? (t.pairs || TEXT.es.pairs).pointUs : t.pointYou) : (g.pairs && this.mateObjs ? (t.pairs || TEXT.es.pairs).pointThem(this.names.rival, this.mateObjs.rivalMate.name) : t.pointRival(this.names.rival));
        if (g.mode === 'rally') this.hud.call(title, sub, '', 2);
        else if (e.final) { this.hud.call(t.finalCall, `${who}. ${t.finalSub}`, e.kantari, 4.4); this.hud.setScore(e.score.you, e.score.rival, e.winner); this.hud.root.classList.add('final'); }
        else { this.hud.call(title, `${sub ? sub + ' ' : ''}${who}.`, e.kantari, 2.2); this.hud.setScore(e.score.you, e.score.rival, e.winner); }
        // (sin silbato: el juez de pelota canta el tanto; la grada aplaude toda a la vez)
        A.point(e.call === 'bote' || e.call === 'tanto' || !t.calls[e.call], e.winner === 'you', e.final, Math.min(1, Math.max(0, ((this.rallyN || 0) - 3) / 8) + (this.golpazo ? 0.35 : 0)));
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
    else C.showBall(g.ball.p, h && h.hittable ? 0.6 + 0.4 * Math.sin(this.t * 14) : 0);
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
    // el golpe apuntado (mientras se carga): su camino, para la marca del frontis y el camino a trazos
    const ch = this.input.charge, keys = this.input.keys, stk = this.input.stick;
    const ax = clamp1((keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + stk.x), ay = clamp1((keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + stk.y);
    const pv = ch && (C.aimPath || C.aimMark) && (g.phase === 'rally' || g.phase === 'servePrep') ? g.previewShot?.({ x: ax, y: ay }, ch.kind === 'cut' ? 'cortada' : ch.kind === 'drop' ? 'dejada' : false, 0.15 + this.chargeLevel() * 0.85) : null;
    // marca de puntería en el frontis mientras se carga la cortada o la dejada: sube con la fuerza (poca carga, rozando
    // la chapa; a tope, a media altura) y se mueve a lo ancho con el joystick, justo donde va a dar
    if (C.aimMark) {
      const on = !!ch && (ch.kind === 'cut' || ch.kind === 'drop') && (g.phase === 'rally' || g.phase === 'servePrep');
      C.aimMark.visible = on;
      if (on) { const pow = 0.15 + this.chargeLevel() * 0.85, you = g.players.you;
        // (en la cortada a dos paredes, el frontis llega después de la pared: la marca va donde da de verdad)
        const x = pv?.front ? pv.front.x : ch.kind === 'cut' ? aimSide(ax) * 2.8 : you.x * 0.4 + aimSide(ax) * 2.2, y = pv?.front ? pv.front.y : ch.kind === 'cut' ? cutHeight(pow, ay) : dropHeight(pow, ay);
        C.aimMark.position.set(Math.max(-4.6, Math.min(4.8, x)), y, 0.06); C.aimMark.scale.setScalar(1 + 0.08 * Math.sin(this.t * 12)); }
    }
    // camino previsto del golpe apuntado: a trazos hasta el primer bote, con el bote y (a dos paredes) la pared marcados
    if (C.aimPath) {
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
    { const pc = this.puedesCambiar(); if (pc !== this.pcAntes) { this.pcAntes = pc; this.pintaBolas(); } }   // (el cestaño: abierto mientras sacas tú)
    // el aro del momento justo en el botón de golpe (se cierra sobre el botón cuando hay que soltar) y el nombre del golpe
    // que saldría ahora: de volea, antes del bote; gancho, si viene alta
    const toV = h?.toVolley, airNow = h?.volea && toV != null && toV > -0.05;
    this.hud.timing(h?.yourTurn ? (airNow ? toV : h.toIdeal) : null);
    const T1 = this.txt; this.hud.hitLabel(h?.gancho ? (T1.hitGancho || TEXT.es.hitGancho) : h?.volea ? (T1.hitVolley || TEXT.es.hitVolley) : T1.hit);
    // consejos: solo mientras se aprende (los primeros tantos de los dos primeros partidos, o el primer medio minuto del
    // peloteo); después, nada: el autor no quería instrucciones todo el rato
    const tt = this.txt;
    let tip = '';
    const PT = tt.pairs || TEXT.es.pairs, sp = g.serverP(), aprende = this.conConsejos && (g.mode === 'rally' ? this.t < 30 : ((g.score?.you || 0) + (g.score?.rival || 0)) < 4);
    if (!aprende) tip = '';
    else if (g.phase === 'serveWait' && sp === 'you') tip = g.runUp ? tt.tipServeRun : tt.tipServe;
    else if (g.phase === 'servePrep' && sp === 'you') tip = g.saque ? tt.tipServeRun : g.hittable('you') ? tt.tipServe2 : '';   // (el saque sale solo; si se escapa la pelota, lo das tú)
    else if (g.phase === 'serveWait' && sp === 'youMate') tip = PT.mateServe;
    else if (g.phase === 'serveWait' && g.server === 'rival') tip = g.pairs && this.role === 'delantero' ? PT.rivalServe : g.cuatro ? tt.tipRivalServe45 || tt.tipRivalServe : tt.tipRivalServe;
    else if (h && h.mate && !h.hittable && h.tired > 0.3) tip = PT.rest;
    else if (h && h.mate && !h.hittable && h.mateTired > 0.4) tip = PT.mateTired(tt.hit);
    else if (h && h.mate && !h.hittable) tip = PT.mateBall;
    else if (this.input.charge && g.phase === 'rally' && g.rally?.turn === 'you') tip = tt.tipAim;
    else if (h && h.hittable) tip = tt.tipHit;
    else if (h && h.yourTurn) tip = assist ? tt.tipMove : '';
    else if (h && h.tired > 0.5) tip = tt.tiredYou;
    this.hud.tip(tip);
    // la energía de cada uno (tú, en amarillo)
    this.hud.energy(g.phase === 'intro' || g.phase === 'end' ? null : ['you', 'youMate', 'rival', 'rivalMate'].filter(id => g.players[id]).map(id => ({ id, side: g.side(id), color: this.cols[g.side(id)], me: id === 'you', en: g.players[id].en,
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
      if ((g.phase === 'point' && (P.act === 'cheer')) || this.entra?.ok[who]) yaw = Math.atan2(this.camPos.x - side.obj.position.x, this.camPos.z - side.obj.position.z) - grp.rotation.y;   // (y al saludar en la salida)
      P.yaw = P.yaw == null ? yaw : P.yaw + Math.atan2(Math.sin(yaw - P.yaw), Math.cos(yaw - P.yaw)) * (1 - Math.exp(-12 * dt));
      side.obj.rotation.y = grp.rotation.y + P.yaw + (this.o.yawOffset || 0);
      const swingAge = this.t - (this.lastSwing[who] || -9);
      // preparación del golpe: cuando la pelota viene hacia quien le toca, echa el brazo atrás (más cuanto más cerca)
      const ball = g.ball.p, sd = g.side(who), turn = g.phase === 'rally' ? g.rally?.turn === sd && g.rally?.front && (!g.pairs || g.takerOf(sd) === who) : g.phase === 'servePrep' && g.serverP() === who;
      const dB = Math.hypot(ball.x - P.x, ball.z - P.z), wind = turn ? Math.max(0, Math.min(1, 1 - (dB - 1.0) / 5)) : 0;
      // ¿va hacia atrás? (de espaldas a donde corre: las piernas, al revés, en vez de correr hacia delante sin moverse así)
      const back = (P.speed || 0) > 0.4 && (P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)) < -0.35 * P.speed;
      const st = { speed: Math.max(P.speed || 0, S.v), back, act: P.act, actT: P.actT, wind, swing: swingAge < 0.4 ? swingAge / 0.4 : -1, won: g.phase === 'point' && P.act === 'cheer', lost: g.phase === 'point' && P.act === 'sad', saluda: !!this.entra?.ok[who] };
      // un golpe nuevo (al pulsar), una sola vez: el gesto no se repite mientras dura el estado
      const sw = P.act === 'swing', SP = this.swPrev ||= {}; if (sw && !SP[who] && who === 'you' && swingAge > 0.4) this.lastSwing[who] = this.t; SP[who] = sw;
      (this.recSt ||= {})[who] = st;
      if (side.animate) side.animate(side.obj, st, dt); else basicAnimate(side.obj, st, dt, this.t);
    }
    // por parejas, una flecha sobre ti (tu compañero lleva la misma ropa)
    if (g.pairs) {
      if (!this.pin) { this.pin = new T.Mesh(new T.ConeGeometry(0.2, 0.36, 4).rotateX(Math.PI), new T.MeshBasicMaterial({ color: '#ff7ac8', depthTest: false, transparent: true })); this.pin.renderOrder = 3; grp.add(this.pin); }
      const Y = g.players.you; this.pin.visible = g.phase !== 'intro'; this.pin.position.set(Y.x, 2.35 + Math.sin(this.t * 6) * 0.08, Y.z); this.pin.rotation.y = this.t * 2;
    } else if (this.pin) this.pin.visible = false;
    // (durante la llegada, la cámara es la del vuelo; si pasa por detrás del rebote, el rebote se deja ver a través)
    if (this.flying) { const lc = grp.worldToLocal(this.v3.copy(this.cam.position)); C.reboteSeeThrough?.(lc.z > COURT.REBOTE - 0.3 && lc.z < COURT.REBOTE + 12 && lc.y < COURT.REBOTE_H + 3 && Math.abs(lc.x) < 14, dt); return; }
    // cámara detrás del jugador, mirando al frontis
    const you = g.players.you, portrait = innerWidth < innerHeight;
    // en vertical (móvil) algo más cerca que antes: los pelotaris se ven más grandes y con su detalle
    // (en horizontal, a 7 m y 4 de alto: el pelotari sale una cuarta parte más grande que antes, a 8,8 m, y más arriba,
    // fuera de los botones; el frontis entero se sigue viendo)
    // si el rival está más al fondo que tú (le mandas la pelota atrás), la cámara retrocede y se eleva hasta verlo a él
    // también: antes se quedaba detrás de ti y no se veía cómo ni hacia dónde golpeaba
    // por parejas, lo mismo con tu compañero: si juegas de delantero, el zaguero golpea a tu espalda y antes su golpe no
    // se veía. Se mira quién va a golpear (de los dos equipos) y, si está más atrás que tú, la cámara lo coge también
    const turn = g.phase === 'rally' ? g.rally?.turn : null;   // (solo en el peloteo: al sacar se queda contigo)
    const tkId = turn ? (g.pairs ? g.takerOf(turn) || (turn === 'rival' ? 'rival' : null) : turn) : null;
    const rv = tkId && tkId !== 'you' ? g.players[tkId] : null, behind = rv && Number.isFinite(rv.z) ? Math.max(0, rv.z - you.z) : 0;
    const cz = you.z + behind, cx = behind > 0.5 ? you.x * 0.6 + rv.x * 0.4 : you.x, up = Math.min(2.4, behind * 0.16) + (g.pairs ? 0.8 : 0);
    // cámara de retransmisión: alta y por detrás, como en la tele (se ve la cancha entera con sus rayas, los dos pelotaris
    // y el frontis), y sigue al jugador con suavidad. En el frontón cubierto no pasa del rebote: si tú estás muy atrás,
    // sube en vez de retroceder
    const lp = portrait ? [cx * 0.3 + 0.6, 7.4 + up, cz + 10.5 + behind * 0.12] : [cx * 0.32 + 1.1, 6.0 + up * 0.7, cz + 8.6 + behind * 0.12];
    const ll = portrait ? [cx * 0.18, 1.4, cz - 9] : [cx * 0.2, 1.5, cz - 11];
    // la pelota larga: si va hacia el rebote, por detrás de ti, la cámara retrocede y sube hasta verla llegar (y al
    // pelotari que va a por ella); antes se quedaba detrás de ti y la pelota se perdía por arriba
    if (g.phase === 'rally' && !this.tour) {
      const B = g.ball, bz = Number.isFinite(B.p.z) ? B.p.z + Math.max(0, B.v?.z || 0) * 0.3 : you.z;
      const largo = Math.max(0, Math.min(1, (bz - you.z - 2) / 10)) * Math.max(0, Math.min(1, (bz - 16) / 10));
      this.largoK = (this.largoK || 0) + (largo - (this.largoK || 0)) * Math.min(1, dt * 3);
    } else this.largoK = (this.largoK || 0) * Math.max(0, 1 - dt * 2);
    // y con un peloteo largo, poco a poco un plano más abierto, como en la tele cuando el tanto se alarga
    const abre = this.camDyn ? Math.max(0, Math.min(1, ((this.rallyN || 0) - 5) / 6)) * (g.phase === 'rally' ? 1 : 0) : 0;
    this.abreK = (this.abreK || 0) + (abre - (this.abreK || 0)) * Math.min(1, dt * 1.5);
    { const L2 = this.largoK, A2 = this.abreK; lp[2] += L2 * 7 + A2 * 2.5; lp[1] += L2 * 2.8 + A2 * 1.6; ll[2] += L2 * 9; ll[1] -= L2 * 0.2; }
    // los cambios de plano (con la cámara dinámica): tras cada tanto, mientras se canta, un plano distinto del de juego,
    // uno cada vez: desde la contracancha a la altura de la grada, desde el frontis de cara a los pelotaris o desde lo
    // alto. Es un corte de verdad (sin deslizar), y al sacar se vuelve de golpe al de juego
    // (y más: el ganador de cerca, de frente, y la grada que aplaude; en el último tanto, una vuelta lenta alrededor del
    // que gana. Y al sacar el rival, un plano a su lado mientras corre a sacar, como en la tele; al botarla, el de juego)
    const corte = this.camDyn && !this.tour && g.phase === 'point' && g.phaseT > 0.35;
    const saqueRv = this.camDyn && !this.tour && !this.show && g.phase === 'serveWait' && g.side(g.serverP()) === 'rival' && g.phaseT > 0.15 && g.mode === 'match';
    if (corte) {
      const rv0 = g.players.rival || you, mid = Math.max(4, Math.min(COURT.L, (you.z + rv0.z) / 2)), co = COURT.W / 2 + (C.contra || 2.6);
      const Wn = g.players[this.lastWin] || you, cw = [[Wn.x + 1.4, 1.65, Wn.z - 3.4], [Wn.x, 1.35, Wn.z]];
      const planos = [[[co - 0.4, 3.4, mid + 4], [-1.5, 1.3, mid - 1]], cw, [[1.2, 1.5, 3.2], [(you.x + rv0.x) / 2, 1.4, mid + 1]], [[-2.4, 1.9, mid - 5], [co + 2, 1.7, mid + 3]], [[-1.5, 16, mid + 8], [0, 0, mid - 2]]];
      let [cp, cl] = planos[(this.plano || 0) % planos.length];
      if (this.lastFinal) { const a = (this.t - (this.planoT || 0)) * 0.55; cp = [Wn.x + Math.sin(a) * 4.2, 2 + Math.sin(a * 0.5) * 0.4, Wn.z - Math.cos(a) * 4.2]; cl = [Wn.x, 1.3, Wn.z]; }
      lp[0] = cp[0]; lp[1] = cp[1]; lp[2] = cp[2]; ll[0] = cl[0]; ll[1] = cl[1]; ll[2] = cl[2];
    } else if (saqueRv) {
      const S = g.players[g.serverP()];
      lp[0] = Math.min(COURT.W / 2 + 1.2, S.x + 4.2); lp[1] = 1.7; lp[2] = S.z + 1.6; ll[0] = S.x - 0.6; ll[1] = 1.2; ll[2] = S.z - 3;
    }
    const enPlano = corte || saqueRv;
    if (enPlano !== !!this.enCorte) { this.enCorte = enPlano; this.camInit = false; }
    if (this.lastCorte && !corte) this.plano = (this.plano || 0) + 1;   // (el plano siguiente, en el tanto siguiente)
    this.lastCorte = corte;
    if (this.show) { const [cp, cl] = this.show.cam(this.showP); lp[0] = cp[0]; lp[1] = cp[1]; lp[2] = cp[2]; ll[0] = cl[0]; ll[1] = cl[1]; ll[2] = cl[2]; }
    if (g.phase === 'intro') { const [p, l] = this.introCam(this.t - (this.t0 || 0)); lp[0] = p[0]; lp[1] = p[1]; lp[2] = p[2]; ll[0] = l[0]; ll[1] = l[1]; ll[2] = l[2]; }
    // (la salida de los pelotaris: sus dos planos, con un corte entre uno y otro)
    { const pl = this.entra?.go ? (this.entra.salu ? 2 : 1) : 0; if (pl !== (this.entraPl || 0)) { this.entraPl = pl; this.camInit = false; }
      if (pl) { const [p, l] = this.camEntrada(); lp[0] = p[0]; lp[1] = p[1]; lp[2] = p[2]; ll[0] = l[0]; ll[1] = l[1]; ll[2] = l[2]; } }
    if (this.tour) { const [cp, cl] = this.tourCams[this.tour.i]; lp[0] = cp[0]; lp[1] = cp[1]; lp[2] = cp[2]; ll[0] = cl[0]; ll[1] = cl[1]; ll[2] = cl[2]; this.tourMat.opacity = 0.45 + 0.3 * Math.sin(this.t * 4); }   // (parpadea: se ve que está resaltada)
    // cámara dinámica (se puede quitar en Más opciones): sigue un poco la pelota de lado, se acerca con cada golpe fuerte
    // y se inclina apenas hacia donde va. Todo suave y pequeño, para dar vida sin perder de vista la cancha ni la pelota
    let dyn = 0;
    if (this.camDyn && !this.tour && (g.phase === 'rally' || g.phase === 'serveWait' || g.phase === 'servePrep')) {
      const B = g.ball, bx = Math.max(-COURT.W * 0.5, Math.min(COURT.W * 0.5, B.p.x)), kk = this.kick || 0;
      ll[0] += (bx - ll[0]) * 0.22; lp[0] += (bx - lp[0]) * 0.08;
      ll[1] += Math.max(0, Math.min(2, B.p.y - 1.5)) * 0.15;
      lp[2] -= kk * 1.1; lp[1] -= kk * 0.35;
      dyn = kk; this.roll += ((Math.max(-1, Math.min(1, -(B.v?.x || 0) / 14)) * 0.018) - this.roll) * Math.min(1, dt * 3);
    } else this.roll += (0 - this.roll) * Math.min(1, dt * 4);
    if (this.kick > 0) this.kick = Math.max(0, this.kick - dt * 2.2);
    this.cabe(lp, ll);
    const wp = this.v3.set(lp[0], lp[1], lp[2]); grp.localToWorld(wp);
    const wl = new T.Vector3(ll[0], ll[1], ll[2]); grp.localToWorld(wl);
    if (!this.camInit) { this.camPos.copy(wp); this.camLook.copy(wl); this.camInit = true; }
    const k = 1 - Math.exp(-5 * dt);
    this.camPos.lerp(wp, k); this.camLook.lerp(wl, k);
    this.cam.position.copy(this.camPos);
    if (this.shake > 0) { this.shake -= dt; this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.25; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.25; }
    this.cam.lookAt(this.camLook);
    if (this.roll) this.cam.rotateZ(this.roll);
    // el rebote, a través si la cámara queda detrás de él (si no, taparía la cancha)
    const lc = grp.worldToLocal(this.v3.copy(this.camPos)); C.reboteSeeThrough?.(lc.z > COURT.REBOTE - 0.3, dt);
    this.fovK = (this.fovK || 0) + (dyn - (this.fovK || 0)) * Math.min(1, dt * 10);
    const fov = (portrait ? 62 : 54) + (g.pairs ? 4 : 0) - this.fovK * 3 + (this.largoK || 0) * 6 + (this.enCorte ? 4 : 0);   // (por parejas, algo más abierta: cuatro pelotaris en la cancha)
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }
  destroy() {
    this.showFin?.();
    if (!this.active) return;
    this.active = false; setFeel(null); this.audio.stop(); this.flyAbort?.(); this.saltaOff?.(); this.entra = null; this.endReplay(); this.tossOff?.(); this.court.setCuatro?.(false);
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

