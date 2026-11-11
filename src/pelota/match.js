// Partido de pelota a mano: une la lógica (game.js), el frontón (court.js), la interfaz (hud.js) y el sonido.
// El juego anfitrión pone el frontón en su escena, llama a update(dt) en cada fotograma y renderiza con su cámara.
import { pzResultado } from '../ui/pausa.js';
import { COURT, TEXT, courtFeel, LEVEL_ORDER, rivalQuote, pelotariRating, arqChips, pelotariArq, DURACIONES, duracionElegida, ponDuracion, tantosDe, RETOS } from './rules.js';
import { Comentarios } from './comenta.js';
import { Voz, tiene } from './voz.js';
import { subtitulos } from '../util/comentarios.js';
import { lote, elige, perfil, saqueRival, siente, clase, POR_LADO, pesoTxt } from './material.js';
import { showVs, courtIcon } from './vs.js';
import { setFeel } from './physics.js';
import { openFicha, splitName } from './ficha.js';
import { pelotariCard } from '../ui/sportCard.js';
import { PelotaGame, cutHeight, dropHeight, aimSide } from './game.js';
import { PrimeraPersona } from './primeraPersona.js';
import { bolaSVG } from './bola.js';
// (la estrella de los retos: rellena de amarillo si se ha ganado, solo el filo lila si no)
const ESTRELLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" stroke-linejoin="round"/></svg>';
import { PelotaHud, esc } from './hud.js';
import { PelotaAudio } from './audio.js';
import { granFinal } from './granFinal.js';
import { Chapa3D } from './chapa.js';
import { tap } from '../util/tap.js';
import { TACTIL } from '../util/tactil.js';
const clamp1 = (v) => Math.max(-1, Math.min(1, v));
// vuelta a su sitio entre tanto y tanto (la figura; la lógica ya los ha puesto allí): a paso de carrera, con su arranque y
// su frenada, en m/s y m/s²
const VUELTA = { v: 6.2, acel: 9, freno: 8 };
// (de qué lado le llega la pelota a quien la va a dar, su izquierda es su +X girado con su cara, y a qué altura: el golpe
// que se ve, derecha o izquierda, sotamano o de aire)
function golpeDe(P, x, y, z) {
  const yaw = P.yaw ?? Math.PI, lat = (x - P.x) * Math.cos(yaw) - (z - P.z) * Math.sin(yaw);
  return (y > 1.35 ? 'High' : y < 0.42 ? 'Low' : 'Hit') + (lat > 0.15 ? 'L' : '');
}
// (pasos laterales: se mueve de lado sin dejar de mirar al frontis; 1 hacia su izquierda, -1 hacia su derecha, 0 si no)
function lateral(P) {
  const sp = P.speed || 0; if (sp < 0.4 || sp > 3.0) return 0;
  const yaw = P.yaw ?? Math.PI, l = P.vx * Math.cos(yaw) - P.vz * Math.sin(yaw), f = P.vx * Math.sin(yaw) + P.vz * Math.cos(yaw);
  return Math.abs(l) > Math.abs(f) * 1.2 ? Math.sign(l) : 0;
}

// (las cámaras del partido, en este orden con la C y en el menú)
const PLANOS = ['general', 'fija', 'detras'];
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
    // (la cámara del partido, a elegir en Más opciones, en el menú del partido o con la C: la general, la fija clásica o
    // detrás de ti; antes la fija era un interruptor aparte)
    this.plano = PLANOS.includes(ls('herrizherri-pelota-plano')) ? ls('herrizherri-pelota-plano') : ls('herrizherri-pelota-camfija') === '1' ? 'fija' : 'general';
    this.camFija = this.plano === 'fija';
    this.audio = new PelotaAudio(o.audio);
    this.hud = new PelotaHud(o.container || document.body, this.txt, this.names, this.touch, this.cols);
    this.hud.onPanel = () => this.resetStick?.();
    this.hud.onBola = (n) => this.cambiaBola(n);   // (tocar una pelota del cestaño antes de sacar)
    this.hud.onDescanso = () => this.pideDescanso();   // (el descanso, en el menú; o la tecla R)
    // el menú, a la derecha del marcador: al abrirlo con la mano el partido se para y al cerrarlo sigue; dentro, las fichas
    // y salir (antes, una X arriba a la izquierda)
    this.hud.onMenu = (on, mano) => {
      if (on && mano) { this.menuPausa = !this.paused; if (this.menuPausa) { this.paused = true; this.resetStick?.(); this.voz?.calla(); } }
      else if (!on && this.menuPausa) { this.menuPausa = false; if (!this.hud.panelEl) this.paused = false; }
    };
    this.hud.onFichas = () => this.ficha('rival');
    this.hud.onSalir = () => { if (!this.hud.panelEl) this.confirmExit(); };
    this.input = { mx: 0, mz: 0, hit: false, drop: false, cut: false, keys: {}, stick: { id: null, x: 0, y: 0 }, charge: null, power: 0.5 };
    this.active = true; this.t = 0;
    // (los consejos de cómo jugar, solo para aprender: en los primeros tantos de los dos primeros partidos; luego, ninguno.
    // Se cuenta el partido al empezar a jugarlo, en vsThenPlay: no los que se dejan con «Ahora no»)
    try { this.consejosN = +(localStorage.getItem('herrizherri-pelota-consejos') || 0); } catch (e) { this.consejosN = 0; }
    this.conConsejos = this.consejosN < 2;
    // con la cámara (o.camara, la pelota en casa): tu cuerpo manda (camaraCuerpo.js); sin palanca y sin los consejos de los
    // botones, que aquí no hacen falta. La cámara se pide al pulsar «Jugar»
    this.conCamara = !!o.camara;
    if (this.conCamara) { this.hud.root.classList.add('con-camara'); this.conConsejos = false; }
    // y, con la cámara, la vista en primera persona (pelota/primeraPersona.js): en tus ojos, con los brazos de tu pelotari
    // delante haciendo lo que hacen los tuyos. Se cambia en el menú o con la V; se recuerda la de la última vez
    try { this.vistaFP = this.conCamara && localStorage.getItem('herrizherri-pelota-vista') !== 'tele'; } catch (e) { this.vistaFP = this.conCamara; }
    this.hud.vista(this.conCamara, this.vistaFP);
    this.hud.onVista = () => this.cambiaVista();
    this.hud.onPlano = () => this.ponPlano(PLANOS[(PLANOS.indexOf(this.plano) + 1) % PLANOS.length], true); this.hud.plano(this.planoTxt());
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
      // la llegada (o.fly(partido), una promesa; game/llegadas.js): quita el velo con los pelotaris ya en su sitio y el
      // público en la grada; mientras, nada del marcador ni de los botones. Al acabar, el panel del partido. (Antes era un
      // vuelo de la cámara hasta la cancha: se quitó en noviembre de 2026)
      this.flying = true; this.hud.controls(false); this.hud.root.classList.add('vuelo');
      // (en el torneo por parejas, los otros dos pelotaris antes del vuelo: así llegan los cuatro ya en su sitio)
      const prep = o.forcePairs && o.mates ? Promise.resolve().then(() => o.mates()).then((M) => { if (this.active && M) { this.mateObjs = M; this.pairs = true; this.role = 'delantero'; this.newGame(); } }, e => console.warn('parejas', e)) : Promise.resolve();
      // (los pelotaris esperan en la contracancha y, al quitarse el velo, salen corriendo: preparaEntrada)
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
  // sorteo dice quién elige antes; el rival, por su estilo. Tú, con tres botones: cómo las quieres (de todo, las más vivas
  // o las más pesadas) y el juego coge las de ese tipo que quedan libres; debajo, cuáles son. (Antes, el lote entero en
  // diez casillas, que costaba entender; luego, un desplegable, que en el iPhone dejaba la pantalla movida al cerrarse y
  // el toque en «Al cestaño» caía fuera: no se pasaba de aquí. El botón, siempre a la vista al pie de la tarjeta)
  eleccion() {
    return new Promise(res => {
      const t = this.txt.mat || TEXT.es.mat, n = POR_LADO(this.pairs), lot = this.lote = lote(((Date.now() % 1e6) * 13 + 5) >>> 0);
      const estilo = perfil(this.o.rivalStats), tuPrimero = Math.random() < 0.5, rn = this.nomLimpio('rival');
      let rv = tuPrimero ? [] : elige(lot, n, estilo), mio = 'mixto', mias = [];
      const icono = (b) => bolaSVG(clase(b) === 'viva' ? '#ff7ac8' : clase(b) === 'pesada' ? '#7fb2ff' : '#c9b2ff');
      const chip = (b) => `<span class="pel-mchip">${icono(b)}<b>Nº ${b.n}</b><small>${t.kinds[clase(b)]} · ${pesoTxt(b)}</small></span>`;
      const p = this.hud.panel(`<h2>${t.title}</h2><p class="pel-sub">${tuPrimero ? t.first : t.second(rn)}</p><p class="pel-mat-what">${t.sub(n)}</p>
        <div class="pel-msel"><span>${t.tuyas}</span><div class="pel-mseg" role="radiogroup">${['mixto', 'pegador', 'manos'].map(k => `<button type="button" role="radio" data-mat-k="${k}" aria-checked="${k === 'mixto'}">${esc((t.cortos || TEXT.es.mat.cortos)[k])}</button>`).join('')}</div></div>
        <div class="pel-mchips" data-mat-tuyas></div><p class="pel-mat-what" data-mat-what></p><p class="pel-mrv" data-mat-rv></p>
        <div class="pel-row pel-mgo"><button class="pel-go" data-mat-go>${t.go}</button></div>`);
      p.querySelector('.pel-card')?.classList.add('pel-matcard');
      const pinta = () => {
        mias = elige(lot, n, mio, new Set(rv.map(b => b.n)));
        p.querySelector('[data-mat-tuyas]').innerHTML = mias.map(chip).join('');
        p.querySelector('[data-mat-what]').textContent = t.que[mio];
        p.querySelector('[data-mat-rv]').textContent = rv.length ? `${t.rival}: ${rv.map(b => `Nº ${b.n} (${t.kinds[clase(b)].toLowerCase()})`).join(' · ')}` : '';
      };
      let hecho = false;
      const vale = () => {
        if (hecho) return; hecho = true;
        if (!rv.length) rv = elige(lot, n, estilo, new Set(mias.map(x => x.n)));
        pinta(); this.ponCesta(mias, rv);
        setTimeout(() => { if (this.active) { this.hud.closePanel(); res(); } }, tuPrimero ? 900 : 250);   // (lo que elige el rival, un momento a la vista)
      };
      tap(p, (b) => {
        if (b.dataset.matK) { mio = b.dataset.matK; for (const x of p.querySelectorAll('[data-mat-k]')) x.setAttribute('aria-checked', String(x === b)); pinta(); this.audio.ui?.('tick'); return; }
        if (b.hasAttribute('data-mat-go')) vale();
      });
      // (y por si el toque no llega entero al botón, también con su clic; pero no el que el móvil manda justo después del
      // toque de «¡A jugar!», que caía aquí mismo y se saltaba la elección)
      const desde = performance.now(); p.querySelector('[data-mat-go]').addEventListener('click', () => { if (performance.now() - desde > 600) vale(); });
      pinta();
    });
  }
  // la pelota de cada saque: la elige quien saca. Tú, la tuya (la que dejaste o la que cambies antes de sacar); el rival,
  // por cómo va el partido
  bolaDelSaque() {
    const g = this.game, c = this.cesta; if (!g || !c) return;
    const sd = g.side(g.serverP?.() || g.server);
    if (sd === 'rival') { const sc = g.score || { you: 0, rival: 0 }, b = saqueRival(c.rival, perfil(this.o.rivalStats), sc.rival || 0, sc.you || 0);
      this.bola = b; }   // (sin aviso escrito: la pelota con la que saca se ve en el botón de la pelota)
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
    this.hud?.root?.classList.remove('final'); this.callada = false; this.rachas = null; this.hud?.setRacha?.('', '');   // (las rachas, de cero)
    this.com = new Comentarios(this.lang); this.comIni = false; this.voz?.calla(); this.hud?.comenta?.(null);   // (los comentarios del partido: comenta.js)
    const o = this.o;
    this.cestaPorDefecto();
    const M = this.pairs ? this.mateObjs : null;
    this.game = new PelotaGame({ mode: o.mode || 'match', target: o.target, level: this.level, seed: o.seed, autoplay: o.autoplay, rivalStats: o.rivalStats, youStats: o.youStats,
      pairs: !!M, youRole: this.role, youMateStats: M?.youMate.stats, rivalMateStats: M?.rivalMate.stats, cuatro: this.cuatro && !M, camara: !!o.camara, reto: o.reto });
    this.court.setCuatro?.(!!this.game.cuatro);   // (la raya del 4 y medio, solo en el Cuatro y Medio)
    this.rec = null; this.repAt = 0;
    for (const m of Object.values(this.mateObjs || {})) if (m.obj) m.obj.visible = !!M;
    this.hud.setNames?.(this.label('you'), this.label('rival'));
    this.hud.fichas(o.mode !== 'rally');
    this.hud.setScore(0, 0, this.game.server, o.mode === 'rally' ? this.txt.rally(this.game.target) : this.txt.to(this.game.target));
    if (o.mode === 'rally') this.hud.setScore(0, '', this.game.server, this.txt.rally(this.game.target));
    if (this.game.reto) this.retoMarcador();
    this.dianaPon();
    this.lastSwing = { you: 0, rival: 0, youMate: 0, rivalMate: 0 };
  }
  // el nombre de cada lado: el pelotari o, por parejas, los dos
  label(sd) { const m = this.pairs && this.mateObjs?.[sd + 'Mate']; return m ? `${this.names[sd]} · ${m.name}` : this.names[sd]; }
  labels() { return [this.label('you'), this.label('rival')]; }
  // el nombre sin el pueblo entre paréntesis y las temporadas de cada lado (la presentación y el sorteo de la chapa)
  nomLimpio(sd) { return this.label(sd).replace(/\s*\([^)]*\)/g, ''); }
  // (las temporadas de cada uno ya no se enseñan: viste de colorado quien debutó antes, pero no hace falta decirlo ni
  // poner «debutante». Siguen decidiendo los colores, fronton.js)
  tempDe() { return ''; }

  // ------------------------------------------------------------ retos (rules.js RETOS; la lógica, en game.js)
  retoTxt() { return this.txt.reto || TEXT.es.reto; }
  /** Lo que va en el centro del marcador durante el reto: las vidas o la pelota que va */
  retoLabel() { const g = this.game, R = this.retoTxt(); if (!g?.reto) return ''; return g.reto === 'peloteo' ? R.hud.peloteo(g.retoN.vidas) : R.hud[g.reto](g.retoN.tiros, g.target); }
  /** El lado derecho del marcador en el reto (donde va el rival en un partido): las vidas o la pelota que va, «3/10» */
  retoLado() { const g = this.game, L = this.retoTxt().lado; return g.reto === 'peloteo' ? [L.peloteo, g.retoN.vidas] : [L.otro, `${Math.min(g.retoN.tiros + (g.phase === 'end' ? 0 : 1), g.target)}/${g.target}`]; }
  /** El marcador del reto: lo que llevas a la izquierda, las vidas o la pelota a la derecha y el reto en medio */
  retoMarcador() { const g = this.game, [n, v] = this.retoLado(); this.hud.setNames?.(this.label('you'), n); this.hud.setScore(g.retoValor(), v, g.server, this.retoLabel()); }
  /** Las metas de las estrellas, en una línea: «★ 3 · ★★ 5 · ★★★ 7 dianas» */
  retoMetas(k) { const E = RETOS[k].estrellas, u = this.retoTxt().unidad[k]; return `${E.map((n, i) => `${'★'.repeat(i + 1)} ${n}`).join(' · ')} ${u}`; }
  /** El aro de la diana en el frontis: un anillo amarillo con el centro rosa, que se pone donde diga el juego */
  dianaPon() {
    const g = this.game, T = this.T, G = this.court?.group;
    if (!g?.diana || !T || !G) { if (this.diana) this.diana.visible = false; return; }
    if (!this.diana) {
      const r = g.diana.r, o = new T.Group(), mat = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, toneMapped: false, fog: false });
      o.add(new T.Mesh(new T.RingGeometry(r * 0.84, r, 56), mat('#ffd166', 0.95)));
      o.add(new T.Mesh(new T.RingGeometry(r * 0.46, r * 0.56, 48), mat('#ffffff', 0.7)));
      o.add(new T.Mesh(new T.CircleGeometry(r * 0.2, 32), mat('#ff2bd6', 0.9)));
      o.add(new T.Mesh(new T.CircleGeometry(r * 0.84, 48), mat('#ffd166', 0.12)));
      o.renderOrder = 6; o.traverse(m => { if (m.isMesh) m.renderOrder = 6; });
      G.add(o); this.diana = o;
    }
    this.diana.position.set(g.diana.x, g.diana.y, 0.05); this.diana.visible = true; this.dianaT = 0;
  }
  dianaQuita() { const d = this.diana; if (!d) return; d.parent?.remove(d); d.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); this.diana = null; }

  // ------------------------------------------------------------ paneles
  intro() {
    const t = this.txt, g = this.game, L = t.levels || TEXT.es.levels;
    this.hud.controls(false);
    // mano a mano o por parejas (y tú, de delantero o de zaguero): solo en los partidos libres
    const canPairs = !!this.o.mates && g.mode === 'match', P = t.pairs || TEXT.es.pairs;
    const mods = [['mano', P.single], ['delantero', P.front], ['zaguero', P.back], ['cuatro', P.four || TEXT.es.pairs.four]].filter(([k]) => !(this.o.forcePairs && (k === 'mano' || k === 'cuatro'))), cur = this.pairs ? this.role : this.o.forcePairs ? this.role : this.cuatro ? 'cuatro' : 'mano';
    const TT = t.tour || TEXT.es.tour, MT = t.mat || TEXT.es.mat, CD = t.camDyn || TEXT.es.camDyn, PL = t.plano || TEXT.es.plano, DU = t.dur || TEXT.es.dur, OT = t.optTabs || TEXT.es.optTabs, RP = t.repe || TEXT.es.repe;
    const reglas = [...(this.cuatro ? [(t.cuatro || TEXT.es.cuatro).rule] : []), ...t.rules];
    const sum = g.reto ? this.retoTxt().name[g.reto] : [mods.find(([k]) => k === cur)?.[1] || P.single, g.mode === 'rally' ? t.rally(g.target) : t.to(g.target)].filter(Boolean).join(' · ');
    // arriba quién juega y dónde (el frontón y lo que se nota en él); lo que se elige poco, plegado en «Más opciones» con
    // lo elegido a la vista; abajo, en una fila, el nivel y los botones
    // (en un partido, delante de todo, las cartas de los que juegan (rivalHtml): a su lado en una pantalla tumbada, encima en
    // una de pie; lo demás va en su columna, .pel-lado. El peloteo y los retos no tienen rival: la ventana de siempre)
    const duelo = g.reto ? '' : this.rivalHtml();
    const RT = this.retoTxt(), cab = g.reto ? `<h2>${RT.name[g.reto]}</h2><p class="pel-sub">${RT.como[g.reto]}</p><p class="pel-sub pel-metas"><b>${RT.metas}</b> ${this.retoMetas(g.reto)}</p>`
      : duelo ? `<h2>${t.title}</h2><p class="pel-sub">${[this.o.comp, t.to(g.target)].filter(Boolean).map(esc).join(' · ')}</p>`
      : `<h2>${t.title}</h2><p class="pel-sub">${esc(this.label('you'))} vs ${esc(this.label('rival'))} · ${g.mode === 'rally' ? t.rally(g.target) : t.to(g.target)} <button class="pel-chip" data-pel-tour>${TT.btn}</button></p>`;
    const p = this.hud.panel(`${duelo ? `${duelo}<div class="pel-lado">` : ''}${cab}
      ${this.conCamara ? `<p class="pel-pairs">${esc(this.lang === 'eu' ? 'Jarri zutik pantailatik bi bat metrora, kamerak gerritik gora eta besoak barruan ikusteko moduan; ikusten zaituenean, kameraren irudia kendu egiten da. Mugitu alboetara; pilota datorrenean, jo. Eskuinarekin eta oso ezkerrean amaituz, bi pareta; eskuinetik ezkerrera, paretara; eskuinera, zabalera. Ohi baino askoz azkarrago, cortada; motelago, luzea; eskua behean eta ibilbide laburrarekin, dejada.' : 'Ponte de pie a unos dos metros de la pantalla, que la cámara te vea de cintura para arriba y con los brazos dentro; en cuanto te vea, la imagen de la cámara se quita. Muévete a los lados; cuando venga la pelota, golpea. De derecha y acabando muy a la izquierda, dos paredes; de derecha a izquierda, a la pared; hacia la derecha, al ancho. Mucho más rápido que de normal, cortada; más lento, largo; con la mano baja y poco recorrido, dejada.')}</p>` : ''}
      ${this.courtHtml()}
      <div class="pel-mas"><button class="pel-more" data-pel-more aria-expanded="false"><b>${t.moreTitle || TEXT.es.moreTitle}</b><span class="pel-sum">${esc(sum)}</span></button>${duelo ? `<button class="pel-chip" data-pel-tour>${TT.btn}</button>` : ''}</div>
      <section class="pel-opts"${this.moreOpen ? '' : ' hidden'}>
        <div class="pel-otabs" role="tablist"><button class="pel-back" data-pel-back>${t.optBack || TEXT.es.optBack}</button>${OT.map((l, i) => `<button role="tab" data-pel-tab="${i}" aria-selected="${i === (this.optTab || 0)}">${l}</button>`).join('')}</div>
        <div class="pel-opane" data-pane="0"${(this.optTab || 0) === 0 ? '' : ' hidden'}>
        ${g.mode === 'match' && !this.o.fixedLevel ? `<small class="pel-lbl">${DU[0]}</small><div class="pel-levels pel-dur" role="group" aria-label="${DU[0]}">${DURACIONES.map(k => `<button data-pel-dur="${k}" aria-pressed="${k === duracionElegida()}">${DU[1][k]} <small>${tantosDe(this.o.tBase ?? 5, k)}</small></button>`).join('')}</div>` : ''}
        ${canPairs ? `<div class="pel-levels pel-mod" role="group" aria-label="${P.label}">${mods.map(([k, l]) => `<button data-pel-mod="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>` : ''}
        ${this.pairs ? `<p class="pel-pairs">${P.how(this.role === 'delantero')} ${P.energy}</p>` : ''}
        <small class="pel-lbl">${PL[0]}</small><div class="pel-levels pel-plano" role="group" aria-label="${PL[0]}">${PLANOS.map(k => `<button data-pel-plano="${k}" aria-pressed="${k === this.plano}">${PL[1][k]}</button>`).join('')}</div>
        <div class="pel-orow"><p class="pel-ballwhat"><b>${MT.title}.</b> ${MT.sub(POR_LADO(this.pairs))}</p>
        <button class="pel-switch" data-pel-cam role="switch" aria-checked="${!!this.camDyn}"><span><b>${CD[0]}</b><small>${CD[1]}</small></span><i aria-hidden="true"></i></button>
        <button class="pel-switch" data-pel-repe role="switch" aria-checked="${!!this.repe}"><span><b>${RP[0]}</b><small>${RP[1]}</small></span><i aria-hidden="true"></i></button></div></div>
        <div class="pel-opane" data-pane="1"${this.optTab === 1 ? '' : ' hidden'}><ol>${reglas.map(r => `<li>${r}</li>`).join('')}</ol></div>
        <div class="pel-opane" data-pane="2"${this.optTab === 2 ? '' : ' hidden'}><div class="pel-ctrl">${this.touch ? t.ctrlTouch : t.ctrlKeys}</div></div>
      </section>
      ${this.o.fixedLevel ? '' : `<small class="pel-lbl">${t.level || 'Nivel'}</small><div class="pel-levels pel-lv5" role="group" aria-label="${t.level || 'Nivel'}">${LEVEL_ORDER.map(k => `<button data-pel-lv="${k}" aria-pressed="${k === this.level}">${L[k]}</button>`).join('')}</div>`}
      <div class="pel-row"><button class="pel-go alt" data-pel-x>${t.later}</button><button class="pel-go" data-pel-go>${t.play}</button></div>${duelo ? '</div>' : ''}`);
    // (la clase es «mas», no «opts»: esa es la de las respuestas de los cuestionarios, hub.css, y ponía la ventana en fila)
    // «Más opciones» es otra vista del mismo panel (en vez de alargarlo): quién juega y el frontón se apartan y salen las
    // opciones en pestañas, con el nivel y los botones de jugar siempre abajo
    const card = p.querySelector('.pel-card') || p, opts = p.querySelector('.pel-opts');
    card.classList.toggle('pel-pres', !!duelo);
    let encaja = () => {};
    // (el ancho de las cartas, --cw, con el sitio que deja la ventana, como en la Gran final. Tumbada: de alto, el de la
    // ventana; de ancho, lo que queda tras dejar 280 px a la columna de al lado. De pie: de ancho, la mitad de la ventana;
    // de alto, lo que queda sobre lo demás. Se vuelve a medir si la pantalla cambia de tamaño o se gira)
    encaja = () => {
      const rv = duelo && card.isConnected && !card.classList.contains('mas') && card.querySelector('.pel-rv'); if (!rv) return;
      const px = (v) => parseFloat(v) || 0, sp = getComputedStyle(p), sc = getComputedStyle(card), n = rv.classList.contains('pel-rv2') ? 2 : 1;
      const iw = card.clientWidth - px(sc.paddingLeft) - px(sc.paddingRight), ih = p.clientHeight - px(sp.paddingTop) - px(sp.paddingBottom) - px(sc.paddingTop) - px(sc.paddingBottom) - 2;
      const alto = (h) => (h - (n - 1) * 8) / n / 1.48;
      let w;
      if (matchMedia('(orientation: landscape)').matches) w = Math.min(alto(ih), (iw - 280 - 16 - 48) / 2);
      else { card.style.setProperty('--cw', '92px'); const otros = card.scrollHeight - px(sc.paddingTop) - px(sc.paddingBottom) - rv.offsetHeight; w = Math.min(alto(ih - otros), (iw - 48) / 2); }
      card.style.setProperty('--cw', Math.floor(Math.max(n > 1 ? 92 : 104, Math.min(n > 1 ? 150 : 200, w))) + 'px');
    };
    encaja();
    if (duelo && window.ResizeObserver) { const ro = new ResizeObserver(() => { if (card.isConnected) encaja(); else ro.disconnect(); }); ro.observe(p); }
    const showOpts = (on) => { this.moreOpen = on; card.classList.toggle('mas', on); if (opts) opts.hidden = !on; p.querySelector('[data-pel-more]')?.setAttribute('aria-expanded', String(on)); encaja(); };
    showOpts(!!this.moreOpen);
    tap(p, (b) => {
      if (b.dataset.pelLv) { this.level = b.dataset.pelLv; for (const x of p.querySelectorAll('[data-pel-lv]')) x.setAttribute('aria-pressed', x.dataset.pelLv === this.level); this.newGame(); }
      if (b.dataset.pelMod) { this.chooseMode(b.dataset.pelMod); return; }
      if (b.dataset.pelDur) { ponDuracion(b.dataset.pelDur); this.o.target = tantosDe(this.o.tBase ?? 5, b.dataset.pelDur); this.newGame(); this.intro(); return; }   // (la duración: rules.js)
      if (b.hasAttribute('data-pel-more')) { showOpts(true); p.querySelector(`[data-pel-tab="${this.optTab || 0}"]`)?.focus({ preventScroll: true }); return; }
      if (b.hasAttribute('data-pel-back')) { showOpts(false); p.querySelector('[data-pel-more]')?.focus({ preventScroll: true }); return; }
      if (b.dataset.pelTab != null) { this.optTab = +b.dataset.pelTab;
        for (const x of p.querySelectorAll('[data-pel-tab]')) x.setAttribute('aria-selected', String(x === b));
        for (const x of p.querySelectorAll('.pel-opane')) x.hidden = +x.dataset.pane !== this.optTab; return; }
      if (b.hasAttribute('data-pel-cam')) { this.camDyn = !this.camDyn; try { localStorage.setItem('herrizherri-pelota-cam', this.camDyn ? '1' : '0'); } catch (e) { } b.setAttribute('aria-checked', String(this.camDyn)); return; }
      if (b.dataset.pelPlano) { this.ponPlano(b.dataset.pelPlano); for (const x of p.querySelectorAll('[data-pel-plano]')) x.setAttribute('aria-pressed', String(x === b)); return; }
      if (b.hasAttribute('data-pel-repe')) { this.repe = !this.repe; try { localStorage.setItem('herrizherri-pelota-repe', this.repe ? '1' : '0'); } catch (e) { } b.setAttribute('aria-checked', String(this.repe)); return; }
      if (b.dataset.pelFicha) { this.ficha(b.dataset.pelFicha); return; }
      if (b.hasAttribute('data-pel-court')) { const w = p.querySelector('.pel-court-what'); if (w) { w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); } return; }
      if (b.hasAttribute('data-pel-tour')) { this.startTour(); return; }
      if (b.hasAttribute('data-pel-go') && this.loadingMates) return;
      if (b.hasAttribute('data-pel-go')) {   // (antes de la presentación, la elección de material; en el peloteo y en las pruebas, sin ella)
        this.audio.ensure();
        if (this.conCamara) this.arrancaCamara();   // (la cámara, ya: mientras se elige el material y sale el VS, se prepara)
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
    const go = () => { if (!this.active) return; this.vsOpen = false; this.hud.controls(true); this.game.start(); this.audio.mood(0.22, 0.6); this.comInicio();
      if (!this.contado) { this.contado = true; try { localStorage.setItem('herrizherri-pelota-consejos', this.consejosN + 1); } catch (e) { /* sin almacenamiento */ } } };   // (sin silbato: en la pelota no hay; la grada se calla para el saque)
    // (después de la presentación, el sorteo del saque con la chapa: saca el del color que sale)
    const sorteo = () => { if (!this.active) return; this.tossChapa(true).then((sd) => { if (!this.active) return; this.game.server = sd; this.game.placeForServe(); go(); }); };
    const V = this.o.vsImg, g0 = this.game;
    if (!V || this.o.autostart || window.__autoWin || (navigator.webdriver && !window.__vs)) return go();
    // (en la final de un campeonato, la entrada de «Gran final» (granFinal.js): ya enfrenta a los dos con sus cartas, así
    // que en vez de la pantalla VS, de ahí al sorteo. Antes, un vuelo de cámara y unos focos que buscaban a los pelotaris
    // a oscuras: el autor los quitó, noviembre de 2026)
    if (this.o.final && !this.finalHecho && (!navigator.webdriver || window.__final)) { this.finalHecho = true; this.entradaFinal().then(() => { if (this.active) (g0.mode === 'match' ? sorteo : go)(); }); return; }
    const t = this.txt, L = t.levels || TEXT.es.levels, M = this.pairs && this.mateObjs, P = t.pairs || TEXT.es.pairs, g = this.game;
    const rt = splitName(this.names.rival).town || this.o.town || '';
    const line = [M ? (this.role === 'delantero' ? P.front : P.back) : this.cuatro ? (P.four || TEXT.es.pairs.four) : P.single, g.mode === 'rally' ? t.rally(g.target) : t.to(g.target), this.o.fixedLevel ? '' : L[this.level]].filter(Boolean).join(' · ');
    this.vsOpen = true; this.met = true;
    // (las cartas: la media y las tres cualidades de cada uno, como en el cuadro del torneo)
    // (y debajo, su arquetipo, su mano y su golpe estrella: rules.js, arqChips)
    const N = t.card || TEXT.es.card, cardOf = (st, seed, bonus, nm, tw, yo) => { const r = pelotariRating(st || {}, seed, bonus); return { ovr: r.ovr, ovrLabel: t.ovr || TEXT.es.ovr, stats: [r.vel, r.pot, r.man].map((v, i) => ({ k: N[i], v })), arq: arqChips(st || {}, nm, tw, this.lang, yo) }; };
    const yn = this.label('you'), rn = this.nomLimpio('rival'), C = this.cols, temp = (sd) => this.tempDe(sd);
    // (cada uno con el color que viste: los azules a la izquierda y los colorados a la derecha, como en el frontón)
    const A = { name: yn, sub: [this.o.town || '', temp('you')].filter(Boolean).join(' · '), img: V.you, pf: V.fig?.(splitName(this.names.you).name, C.you), mateImg: M ? V.you : null, matePf: M ? V.fig?.(M.youMate?.name, C.you) : null, ...cardOf(this.o.youStats, `${splitName(this.names.you).name} ${this.o.town || ''}`, this.o.youBonus ?? 2, splitName(this.names.you).name, this.o.town || '', true) };
    const B = { name: rn, sub: [rt, temp('rival')].filter(Boolean).join(' · '), img: V.rival, pf: V.fig?.(splitName(this.names.rival).name, C.rival), mateImg: M ? V.rival : null, matePf: M ? V.fig?.(M.rivalMate?.name, C.rival) : null, ...cardOf(this.o.rivalStats, `${splitName(this.names.rival).name} ${rt}`, this.o.rivalBonus ?? 0, splitName(this.names.rival).name, rt, false) };
    showVs(this.hud.root, {
      comp: this.o.comp || t.friendly || TEXT.es.friendly,
      // (V.fig: la figura de cada uno por su nombre, si el juego la da; si no, las imágenes V.you y V.rival)
      you: C.you === 'azul' ? A : B, rival: C.you === 'azul' ? B : A,
      venue: this.o.venue || (this.o.town ? (t.fronton || TEXT.es.fronton)(this.o.town) : ''), cond: this.o.cond, tags: this.feel?.tags || [],
      line, quote: rivalQuote(this.o.rivalStats || {}, this.lang), quoteBy: rn, tap: t.vsTap || TEXT.es.vsTap,
    }).then(g.mode === 'match' ? sorteo : go);   // (en el peloteo saca siempre el rival: sin sorteo)
  }
  // la entrada de la final (granFinal.js): «GRAN FINAL», la txapela que se juegan y las cartas de los dos finalistas, el
  // azul a la izquierda y el colorado a la derecha, con el público en pie detrás y su aplauso; se va sola o tocando
  entradaFinal() {
    const t = this.txt, F = t.final || TEXT.es.final, C = this.cols, A = this.audio, sp = (sd) => splitName(this.names[sd]);
    const rt = sp('rival').town || this.o.town || '', de = (col) => (C.you === col ? 'you' : 'rival');
    const carta = (sd) => ({ name: sp(sd).name, town: sd === 'you' ? this.o.town || '' : rt, stats: (sd === 'you' ? this.o.youStats : this.o.rivalStats) || {},
      bonus: sd === 'you' ? (this.o.youBonus ?? 2) : (this.o.rivalBonus ?? 0), yo: sd === 'you', role: this.pairs ? 'Par' : 'Mano' });
    this.hud.controls(false); this.finalOn = true;
    A.ensure(); A.mood(0.85, 0.4); A.aplauso(0.45, 2);
    this.o.onEvent?.({ type: 'entrada' });   // (la grada, en pie)
    const g = granFinal(this.hud.root, { kicker: (this.o.comp || '').replace(/\s*·\s*(Final|Finala)\s*$/i, ''), venue: this.o.venue || '', titulo: F.titulo, toca: F.toca, lang: this.lang,
      azul: carta(de('azul')), rojo: carta(de('rojo')),
      onFase: (k) => { if (k === 'txapela') A.aplauso(0.7, 2.4); else if (k === 'cartas') { A.aplauso(0.95, 4); A.ovation(); } } });
    this.finalFin = () => g.close();
    return g.done.then(() => { this.finalOn = false; this.finalFin = null; });
  }
  // el sorteo del saque: el juez echa al aire la chapa (una cara azul y otra colorada) y saca el del color que sale. Se
  // lanza tocando el botón (o sola a los pocos segundos); devuelve el lado que saca, 'you' o 'rival'
  // (directo: viene de la presentación, que se desvanece encima; su fondo ya está, sin un momento de la cancha entre las dos)
  // La chapa es de verdad, en 3D, en la cancha (chapa.js): gira de canto en la mano del juez, sube dando vueltas y cae al
  // suelo con la cara que saca hacia arriba, y la cámara la sigue de cerca. Encima, despejado el centro: el título arriba
  // y, a cada lado, la carta de cada pelotari, la misma de la presentación, con su color y sus temporadas debajo. Antes era
  // una moneda plana dibujada sobre un fondo oscuro y la pantalla quedaba sosa (octubre de 2026); luego, una tarjeta con su
  // figura de cuerpo entero, que el autor pidió cambiar por las cartas (noviembre de 2026)
  tossChapa(directo = false) {
    const t = this.txt, TS = t.toss || TEXT.es.toss, C = this.cols, de = (col) => (C.you === col ? 'you' : 'rival');
    const nom = (sd) => this.nomLimpio(sd), temp = (sd) => this.tempDe(sd);
    const L = this.fichaList(), quien = (col) => L.find(p => p.id === de(col));
    const lado = (col) => `<div class="pel-toss-p ${col}">${this.cartaDe(quien(col))}<small>${[col === 'azul' ? TS.azul : TS.rojo, temp(de('azul')) || temp(de('rojo')) ? temp(de(col)) || '–' : ''].filter(Boolean).map(x => esc(x)).join(' · ')}</small></div>`;
    // (la chapa en la cancha: en el centro, a la altura del 3, donde el juez la echa; si no hay cancha, la de antes, plana)
    let chapa = null;
    try { if (this.court?.group && this.T) chapa = new Chapa3D(this.T, this.court.group, 0.8, COURT.CUADRO * 3, { azul: ['Azul', 'Urdina'], rojo: ['Colorado', 'Gorria'] }); } catch (e) { console.warn('chapa', e); chapa = null; }
    return new Promise(res => {
      const el = document.createElement('div'); el.className = `pel-toss${directo ? ' directo' : ''}${chapa ? ' tres' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', TS.title);
      el.innerHTML = `<header class="pel-toss-top"><small class="pel-toss-k"><i aria-hidden="true"></i>${esc(TS.title)}<i aria-hidden="true"></i></small><p class="pel-toss-why">${esc(TS.auto)}</p></header>
        ${lado('azul')}${lado('rojo')}
        <div class="pel-toss-mid">${chapa ? '' : '<div class="pel-toss-coin" aria-hidden="true"><div class="coin"><span class="f azul"></span><span class="f rojo"></span></div><div class="sh"></div></div>'}
          <button class="pel-go pel-toss-go">${esc(TS.throw)}</button><p class="pel-toss-res" aria-live="polite"></p></div>`;
      this.hud.root.appendChild(el);
      if (chapa) { this.chapa = chapa; this.tossCam = () => chapa.camara(); this.camInit = false; }
      const win = Math.random() < 0.5 ? 'azul' : 'rojo', coin = el.querySelector('.coin');
      let tirada = false; const tms = [];
      const fin = () => { this.tossCam = null; this.camInit = false; if (chapa && this.chapa === chapa) { chapa.dispose(); this.chapa = null; } };
      const resultado = () => { el.classList.add('cae'); el.querySelector(`.pel-toss-p.${win}`)?.classList.add('gana'); el.querySelector(`.pel-toss-p.${win === 'azul' ? 'rojo' : 'azul'}`)?.classList.add('pierde');
        const r = el.querySelector('.pel-toss-res'); r.textContent = TS.serves(nom(de(win))); r.className = `pel-toss-res ${win}`; };
      const sale = (espera) => tms.push(setTimeout(() => { el.classList.add('out'); tms.push(setTimeout(() => { el.remove(); fin(); res(de(win)); }, 320)); }, espera));
      const tirar = () => {
        if (tirada || !this.active) return; tirada = true; clearTimeout(auto); removeEventListener('keydown', tecla, true);
        el.classList.add('aire'); this.audio.ensure();
        if (chapa) chapa.lanza(win, () => this.audio.moneda?.()).then(() => { if (!this.active) return; resultado(); sale(1700); });
        else { coin.style.setProperty('--fin', win === 'azul' ? '0deg' : '180deg'); tms.push(setTimeout(resultado, 1450)); sale(3100); }
      };
      el.querySelector('.pel-toss-go').addEventListener('click', tirar);
      // (con el teclado o el mando, las teclas de golpear o Intro también la lanzan)
      const tecla = (e) => { if ([' ', 'enter', 'j', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); tirar(); } };
      addEventListener('keydown', tecla, true);
      const auto = setTimeout(tirar, 4200);   // (si no se toca, la lanza el juez)
      this.tossEl = el; this.tossOff = () => { clearTimeout(auto); tms.forEach(clearTimeout); removeEventListener('keydown', tecla, true); el.remove(); fin(); };
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
    const b = g.ball.p; this.recT = (this.recT || 0) + dt; this.rec.push({ dt, b: [b.x, b.y, b.z], P, call: !!this.recCall }); this.recCall = false;
  }
  startReplay() {
    const F = this.rec || []; if (F.length < 30) return;
    let ts = 0; for (const f of F) { f.ts = ts; ts += f.dt; }
    const call = F.find(f => f.call)?.ts ?? ts, t0 = Math.max(0, call - 5);   // (los 5 últimos segundos del tanto y lo de después)
    const RP = this.txt.replay || TEXT.es.replay;
    const n = (this.repN = (this.repN || 0) + 1), w = n % 5 === 4 && F.some(f => f.P[this.lastWin]) ? this.lastWin : null;   // (una de cada cinco, desde el que gana)
    this.replay = { F, t: t0, end: ts, call, i: Math.max(0, F.findIndex(f => f.ts >= t0)), n, w };
    const el = this.repEl = document.createElement('div'); el.className = 'pel-rep';
    const pv = w ? `<span class="pv">${esc((RP.desde || TEXT.es.replay.desde)(this.nomLimpio(w)))}</span>` : '';
    el.innerHTML = `<div class="pel-rep-b"><i aria-hidden="true"></i><b>${esc(RP.label)}</b>${pv}<span class="sl">${esc(RP.slow)}</span></div><small>${esc(RP.skip)}</small>`;
    this.hud.root.appendChild(el); this.hud.root.classList.add('repe'); this.camInit = false; this.colocaRep();
    this.repSkip = (e) => { e.stopPropagation?.(); this.endReplay(); };
    this.repArm = setTimeout(() => { if (this.replay) { addEventListener('pointerdown', this.repSkip, true); addEventListener('keydown', this.repSkip, true); } }, 300);
  }
  // el sudor del cansado (desde algo menos de la mitad de la barra): sobre la cabeza, sus gotas de sudor, que laten, y
  // gotas que le saltan y caen, más a menudo cuanto más cansado. Se ve desde la cámara, también en el rival lejos: así
  // se sabe quién va cansado sin mirar la barra. Unas pocas gotas por pelotari, que se reutilizan
  suda(who, tired, obj, dt) {
    const T = this.T, grp = this.court?.group; if (!T || !grp || !obj) return;
    const D = (this.gotas ||= {})[who] ||= { t: 0.5, p: [], ph: Math.random() * 6 };
    const gota = (x, cx, cy, r) => { x.beginPath(); x.moveTo(cx, cy - r * 1.6); x.bezierCurveTo(cx + r * 1.1, cy - r * 0.4, cx + r, cy + r, cx, cy + r); x.bezierCurveTo(cx - r, cy + r, cx - r * 1.1, cy - r * 0.4, cx, cy - r * 1.6); x.closePath(); };
    if (!this.gotaMat) {
      const c = document.createElement('canvas'); c.width = 32; c.height = 48; const x = c.getContext('2d');
      x.fillStyle = '#bfe6ff'; gota(x, 16, 28, 12); x.fill();
      x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(12, 30, 3, 6, -0.3, 0, Math.PI * 2); x.fill();
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      this.gotaMat = new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false });
      // (el aviso de la cabeza: tres gotas con su borde oscuro, para que se lean sobre la pared y sobre el cielo)
      const c2 = document.createElement('canvas'); c2.width = c2.height = 128; const y = c2.getContext('2d');
      y.lineWidth = 7; y.strokeStyle = '#123a5c'; y.fillStyle = '#9fdcff';
      for (const [cx, cy, r] of [[40, 72, 20], [88, 58, 16], [74, 104, 11]]) { gota(y, cx, cy, r); y.stroke(); y.fill(); }
      y.fillStyle = 'rgba(255,255,255,.95)'; for (const [cx, cy, r] of [[34, 74, 5], [83, 60, 4]]) { y.beginPath(); y.ellipse(cx, cy, r * 0.7, r * 1.4, -0.3, 0, Math.PI * 2); y.fill(); }
      const t2 = new T.CanvasTexture(c2); t2.colorSpace = T.SRGBColorSpace;
      this.sudorMat = new T.SpriteMaterial({ map: t2, transparent: true, depthWrite: false, depthTest: false });
    }
    if (!D.aviso) { D.aviso = new T.Sprite(this.sudorMat.clone()); D.aviso.renderOrder = 4; D.aviso.visible = false; grp.add(D.aviso); }
    { const k = Math.max(0, Math.min(1, (tired - 0.3) / 0.3)), A = D.aviso; A.visible = k > 0 && this.game.phase !== 'intro' && !this.replay;
      if (A.visible) { D.ph += dt * (2 + tired * 3); grp.worldToLocal(this.v3.copy(obj.position)); const s = 0.42 * (1 + Math.sin(D.ph) * 0.08);
        A.position.set(this.v3.x + 0.28, 2.15 + Math.sin(D.ph * 0.5) * 0.05, this.v3.z); A.scale.set(s, s, 1); A.material.opacity = 0.35 + k * 0.65; } }
    if (tired > 0.25 && this.game.phase !== 'intro' && (D.t -= dt) <= 0) {
      D.t = (1.1 - tired * 0.75) * (0.7 + Math.random() * 0.6);
      let g = D.p.find(q => !q.vida);
      if (!g && D.p.length < 6) { const s = new T.Sprite(this.gotaMat.clone()); s.scale.set(0.11, 0.165, 1); s.renderOrder = 2; grp.add(s); g = { s, v: new T.Vector3(), vida: 0 }; D.p.push(g); }
      if (g) {
        grp.worldToLocal(this.v3.copy(obj.position)); const a = Math.random() * Math.PI * 2;
        g.s.position.set(this.v3.x + Math.cos(a) * 0.12, 1.72 + Math.random() * 0.12, this.v3.z + Math.sin(a) * 0.12);
        g.v.set(Math.cos(a) * 0.7, 1.1 + Math.random() * 0.6, Math.sin(a) * 0.7); g.vida = 0.75; g.s.visible = true;
      }
    }
    for (const q of D.p) {
      if (!q.vida) continue;
      q.vida = Math.max(0, q.vida - dt); q.v.y -= 7 * dt; q.s.position.addScaledVector(q.v, dt);
      q.s.material.opacity = Math.min(1, q.vida * 3); if (!q.vida || q.s.position.y < 0.05) { q.vida = 0; q.s.visible = false; }
    }
  }
  /** ¿Se está jugando? (para bajar la música: no en la presentación, el sorteo, las repeticiones, el descanso ni el final) */
  enJuego() { const ph = this.game?.phase; return !!ph && this.active && !this.replay && !this.hud.panelEl && ['serveWait', 'servePrep', 'rally', 'point'].includes(ph); }
  // (el rótulo de la repetición, arriba a la izquierda; si se cruza con el marcador, justo debajo de él, con su hueco)
  colocaRep() {
    const el = this.repEl, top = this.hud.$('.pel-top'); if (!el || !top) return;
    el.style.top = ''; const a = el.getBoundingClientRect(), m = top.getBoundingClientRect(), H = this.hud.root.getBoundingClientRect();
    if (a.right + 12 > m.left && a.top < m.bottom && m.width > 0) el.style.top = `${Math.round(m.bottom - H.top + 12)}px`;
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
    while (R.i < R.F.length - 1 && R.F[R.i + 1].ts <= R.t) R.i++;   // (sin sonido: tras el tanto, solo los aplausos)
    const f = R.F[R.i];
    C.showBall({ x: f.b[0], y: f.b[1], z: f.b[2] }, 0);
    for (const id in f.P) { const sd = this.o[id] || this.mateObjs?.[id]; if (!sd?.obj) continue; const [x, y, z, ry, st] = f.P[id]; sd.obj.position.set(x, y, z); sd.obj.rotation.y = ry; if (sd.animate) sd.animate(sd.obj, st, dt * sp); }
    // dos planos que se turnan: desde la contracancha, en alto, siguiendo la pelota; y desde el frontis, de cara a los pelotaris
    // (cuatro planos que se turnan: además, uno bajo junto a la pared izquierda, a ras de la jugada, y otro desde lo alto;
    // y una de cada cinco, desde el que gana el tanto: por detrás de su hombro, mirando la pelota, como si fueras él)
    const bz = Math.max(2, Math.min(COURT.L, f.b[2])), W = R.w && f.P[R.w], k4 = R.n % 5 % 4, front = !W && k4 === 0;
    let lp = front ? [2.6, 2.3, 1.4] : k4 === 2 ? [-COURT.W / 2 + 0.9, 1.25, Math.min(COURT.L, bz + 3.5)] : k4 === 3 ? [0.6, 13.5, bz + 1.5] : [COURT.W / 2 + 3, 6.2, Math.max(7, Math.min(COURT.L + 1, bz + 6.5))];
    let ll = front ? [f.b[0] * 0.6, Math.max(0.8, Math.min(3, f.b[1])), Math.max(5, bz)] : k4 === 2 ? [f.b[0], Math.max(0.6, Math.min(2.5, f.b[1])), bz - 4] : k4 === 3 ? [f.b[0] * 0.5, 0, bz - 0.6] : [f.b[0] * 0.4, 1.1, bz - 2.5];
    if (W) { const q = grp.worldToLocal(this.v3.set(W[0], W[1], W[2])), wx = q.x, wz = q.z;   // (lo grabado va en el mundo; la cámara, en el frontón)
      const pt = innerWidth < innerHeight; lp = pt ? [wx + 0.8, 2.7, wz + 3.8] : [wx + 0.7, 2.1, wz + 2.4];   // (en vertical, más atrás y más alto: si no, tapa media pantalla)
      ll = [(f.b[0] + wx) / 2, Math.max(0.9, Math.min(3.2, f.b[1])), Math.min(wz - 1.5, f.b[2])]; }
    this.cabe(lp, ll);
    const wp = grp.localToWorld(new T.Vector3(lp[0], lp[1], lp[2])), wl = grp.localToWorld(new T.Vector3(ll[0], ll[1], ll[2]));
    if (!this.camInit) { this.camPos.copy(wp); this.camLook.copy(wl); this.camInit = true; }
    const k = 1 - Math.exp(-4 * dt); this.camPos.lerp(wp, k); this.camLook.lerp(wl, k);
    this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook);
    { const fv = W ? (innerWidth < innerHeight ? 66 : 58) : 50; if (Math.abs(this.cam.fov - fv) > 0.01) { this.cam.fov = fv; this.cam.updateProjectionMatrix(); } }
    C.reboteSeeThrough?.(!!W && lp[2] > COURT.REBOTE - 2, dt);
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
  // quién juega contra quién: la carta de cada pelotari (ui/sportCard.js, las mismas del cuadro del torneo y de la Gran
  // final: la media, el puesto, su arquetipo, el escudo de su pueblo, su figura y sus cualidades en cifras), cada uno del
  // color que viste, con el «VS» en medio; por parejas, las dos de cada lado, el delantero arriba y el zaguero abajo, como
  // en la cancha. Al tocar una carta se abre su ficha entera. El ancho lo pone la hoja según la pantalla (hud.js, --cw).
  // Antes, una fila por pelotari con una foto redonda: la tuya era el avatar del pueblo, de sanferminero, que en un
  // partido de pelota no pintaba nada; el autor pidió las cartas (noviembre de 2026)
  rivalHtml() {
    if (this.o.mode === 'rally') return '';
    const L = this.fichaList(), eu = this.lang === 'eu';
    const abre = (n) => esc(eu ? `${n}: fitxa ireki` : `${n}: abrir su ficha`);
    const carta = (p) => { const n = splitName(p.name).name; return this.cartaDe(p, { tag: 'button', attr: `type="button" data-pel-ficha="${p.id}" aria-label="${abre(n)}"` }); };
    const equipo = (side) => L.filter(p => p.side === side).sort((a, b) => (a.role === 'zaguero') - (b.role === 'zaguero')).map(carta).join('');
    return `<div class="pel-rv pel-vs${L.length > 2 ? ' pel-rv2' : ''}"><div class="pel-team ${this.cols.you}">${equipo('you')}</div><span class="pel-vs-x" aria-hidden="true">VS</span><div class="pel-team ${this.cols.rival}">${equipo('rival')}</div></div>`;
  }
  // la carta de un pelotari del partido (uno de fichaList): la presentación y el sorteo del saque
  cartaDe(p, extra = {}) {
    const ROL = this.lang === 'eu' ? { mano: 'Esku', delantero: 'Aur', zaguero: 'Atz' } : { mano: 'Mano', delantero: 'Del', zaguero: 'Zag' };
    return pelotariCard({ name: splitName(p.name).name, town: p.town || '', stats: p.stats || {}, side: p.color === 'rojo' ? 'rojo' : 'azul', role: ROL[p.role] || ROL.mano, yo: !!p.you, lang: this.lang,
      bonus: p.you ? (this.o.youBonus ?? 2) : p.id === 'rival' ? (this.o.rivalBonus ?? 0) : 0, ...extra });
  }
  // los pelotaris del partido, para sus fichas (por parejas, el rival es el delantero y su compañero, el zaguero)
  fichaList() {
    const o = this.o, M = this.pairs && this.mateObjs, town = o.town || '', rt = splitName(this.names.rival).town || town;
    const other = this.role === 'delantero' ? 'zaguero' : 'delantero';
    const L = [{ id: 'you', name: this.names.you, town, stats: o.youStats, side: 'you', role: M ? this.role : 'mano', you: true, record: o.youRecord }];
    if (M) L.push({ id: 'youMate', name: M.youMate.name, town, stats: M.youMate.stats, side: 'you', role: other });
    L.push({ id: 'rival', name: this.names.rival, town: rt, stats: o.rivalStats, side: 'rival', role: M ? 'delantero' : 'mano' });
    if (M) L.push({ id: 'rivalMate', name: M.rivalMate.name, town: rt, stats: M.rivalMate.stats, side: 'rival', role: 'zaguero' });
    for (const p of L) p.color = this.cols[p.side];
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
    // (en el partido, el resultado va en la cabecera, entre los dos nombres con el color de cada uno: así no ocupa una
    // fila para él solo y lo demás tiene aire; en el reto del frontón sigue grande, que no hay rival)
    const cy = this.cols.you === 'rojo' ? 'rojo' : 'azul', cr = cy === 'rojo' ? 'azul' : 'rojo', reto = g.mode === 'rally';
    const marca = reto ? `${esc(this.label('you'))} – ${esc(this.label('rival'))}` : `<span class="pel-marca"><i class="${cy}">${esc(this.label('you'))}</i><b>${big}</b><i class="${cr}">${esc(this.label('rival'))}</i></span>`;
    // (los retos: lo conseguido, grande, con sus tres estrellas, la mejor marca de antes y las metas)
    const RT = this.retoTxt(), RE = e.reto, antes = this.o.retoMejor || 0;
    const estrellas = RE ? `<div class="pel-estrellas" role="img" aria-label="${RT.estrellas(RE.estrellas)}">${[0, 1, 2].map(i => `<i class="${i < RE.estrellas ? 'on' : ''}" style="--d:${0.25 + i * 0.18}s">${ESTRELLA}</i>`).join('')}</div>` : '';
    const retoA = RE ? `<div class="pel-big">${RE.n}<small>/${RETOS[RE.kind].estrellas[2]}</small></div>${estrellas}<p class="pel-sub pel-metas"><b>${RT.metas}</b> ${this.retoMetas(RE.kind)}${antes ? `<br>${RT.mejor(Math.max(antes, RE.n))}` : ''}</p>` : '';
    const titulo = RE ? (e.win ? RT.win : RT.lose) : e.win ? (reto ? t.rallyWin : t.win) : t.lose;
    const sub = RE ? `<p class="pel-sub">${RT.name[RE.kind]}</p>` : `<p class="pel-sub">${marca}${reto ? '' : ` <button class="pel-chip" data-pel-fichas>${t.fichas || TEXT.es.fichas}</button>`}</p>`;
    const p = this.hud.panel(`<h2>${pzResultado(!!e.win)}${titulo}</h2>${sub}
      <div class="pel-fin"><div class="pel-fin-a">${RE ? retoA : reto ? `<div class="pel-big">${big}</div>` : ''}${RE ? '' : this.claveBloque(g)}${xpHtml || (RE ? '' : `<div class="pel-fact"><b>${t.factsTitle}</b><br>${fact}</div>`)}</div><div class="pel-fin-b">${this.estBloque(g)}${RE ? '' : this.mapaBloque(g)}</div></div>
      <div class="pel-row">${this.o.back === 'torneo' ? '' : `<button class="pel-go alt" data-pel-again>${RE ? RT.otra : t.again}</button>`}<button class="pel-go" data-pel-cont>${this.o.back === 'retos' ? RT.cont : cont}</button></div>`);
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
  /** El resumen del partido en el panel del final: los pelotazos de cada uno, los tantos hechos y los fallos, de qué han
   *  sido los tantos (saque, dejada, aire, volea, rebote), el tanto más largo y la media. Cada cifra, la tuya y la del rival,
   *  con el color de cada uno. */
  estBloque(g) {
    const S = g.stats, P = S?.por; if (g.mode !== 'match' || !P || !S.tantos?.length) return '';
    const E = this.txt.est || TEXT.es.est, cy = this.cols.you === 'rojo' ? 'rojo' : 'azul', cr = cy === 'rojo' ? 'azul' : 'rojo';
    const par = (a, b) => `<span><i class="${cy}">${a}</i><i class="${cr}">${b}</i></span>`;
    const fila = (k, a, b) => `<li><b>${esc(E[k])}</b>${par(a, b)}</li>`;
    const filas = [fila('pelotazos', S.hits.you, S.hits.rival), fila('hechos', P.you.hechos, P.rival.hechos), fila('fallos', P.you.fallos, P.rival.fallos), fila('saque', P.you.saque, P.rival.saque),
      fila('dejada', P.you.dejada, P.rival.dejada), fila('aire', P.you.aire, P.rival.aire), fila('volea', P.you.volea, P.rival.volea), fila('rebote', P.you.rebote, P.rival.rebote)].join('');
    const largo = Math.max(...S.tantos), media = (S.tantos.reduce((a, b) => a + b, 0) / S.tantos.length).toFixed(1).replace('.', this.lang === 'eu' ? ',' : ',');
    const pie = [E.largo(largo), E.media(media), S.alAire ? E.vacio(S.alAire) : ''].filter(Boolean).join(' · ');
    return `<div class="pel-est"><div class="pel-est-top"><b>${esc(E.title)}</b><span><i class="${cy}">${esc(this.names.you)}</i><i class="${cr}">${esc(this.names.rival)}</i></span></div><ul>${filas}</ul><p>${esc(pie)}</p></div>`;
  }
  /** El momento clave del partido, como lo contaría la tele: la remontada, si el que gana iba tres o más por detrás; si no,
   *  el tanto que deshizo el último empate (desde ahí ya no soltó el partido); y si nunca empataron, el tanto más largo. */
  claveDe(g) {
    const L = g.stats?.log; if (g.mode !== 'match' || !L?.length) return '';
    const E = this.txt.est || TEXT.es.est, nm = (w) => this.label(w), fin = L[L.length - 1], gana = fin.you > fin.rival ? 'you' : 'rival';
    let peor = 0, at = null; for (const x of L) { const d = gana === 'you' ? x.you - x.rival : x.rival - x.you; if (d < peor) { peor = d; at = x; } }
    if (peor <= -3) return E.remontada(nm(gana), at.you, at.rival, fin.you, fin.rival);
    let i = -1; for (let k = L.length - 2; k >= 0; k--) if (L[k].you === L[k].rival) { i = k; break; }
    if (i >= 0) { const x = L[i + 1], de = x.call !== 'bote' ? 'fallo' : x.kind === 'saque' ? 'saque' : 'golpe';
      return E.desempate(nm(x.w), L[i].you, x.hits, de, E.remate[x.kind] || '', nm(x.w === 'you' ? 'rival' : 'you')); }
    const lg = L.reduce((a, b) => (b.hits > a.hits ? b : a)); return lg.hits > 2 ? E.masLargo(nm(lg.w), lg.hits, lg.you, lg.rival) : '';
  }
  claveBloque(g) { const c = this.claveDe(g), E = this.txt.est || TEXT.es.est; return c ? `<div class="pel-clave"><b>${esc(E.clave)}</b><p>${esc(c)}</p></div>` : ''; }
  /** El mapa de golpes: la cancha vista desde arriba, del frontis (a la izquierda) al rebote, con un punto del color de cada
   *  uno donde golpeó la pelota. La pared izquierda va arriba; las rayas de la falta y del pasa, en rojo. */
  mapaBloque(g) {
    const G = g.stats?.golpes; if (g.mode !== 'match' || !G || !(G.you.length + G.rival.length)) return '';
    const E = this.txt.est || TEXT.es.est, W = COURT.W, Z = COURT.REBOTE, k = 10, cy = this.cols.you === 'rojo' ? '#ff5fae' : '#8f83ff', cr = this.cols.you === 'rojo' ? '#8f83ff' : '#ff5fae';
    const X = (z) => (z * k).toFixed(1), Y = (x) => ((x + W / 2) * k).toFixed(1);
    const rayas = Array.from({ length: Math.floor(COURT.L / COURT.CUADRO) + 1 }, (_, i) => i * COURT.CUADRO).map(z => `<line x1="${X(z)}" y1="0" x2="${X(z)}" y2="${W * k}" stroke="rgba(255,255,255,.16)" stroke-width="1"/>`).join('');
    const roja = (z) => `<line x1="${X(z)}" y1="0" x2="${X(z)}" y2="${W * k}" stroke="#ff4d6d" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    const puntos = (L, c) => L.map(([x, z]) => `<circle cx="${X(Math.min(Z, Math.max(0, z)))}" cy="${Y(Math.min(W / 2, Math.max(-W / 2, x)))}" r="3.2" fill="${c}" fill-opacity=".72"/>`).join('');
    return `<div class="pel-mapa"><div class="pel-est-top"><b>${esc(E.mapa)}</b><span><i class="${this.cols.you === 'rojo' ? 'rojo' : 'azul'}">${esc(this.names.you)}</i><i class="${this.cols.you === 'rojo' ? 'azul' : 'rojo'}">${esc(this.names.rival)}</i></span></div>
      <svg viewBox="-26 -5 ${Z * k + 52} ${W * k + 10}" role="img" aria-label="${esc(E.mapa)}"><rect x="0" y="0" width="${X(COURT.L)}" height="${W * k}" fill="rgba(255,255,255,.07)" rx="2"/><rect x="${X(COURT.L)}" y="0" width="${X(Z - COURT.L)}" height="${W * k}" fill="rgba(255,255,255,.03)"/>
      ${rayas}${roja(COURT.FALTA)}${roja(COURT.PASA)}<line x1="0" y1="-2" x2="0" y2="${W * k + 2}" stroke="#fff" stroke-width="3"/><line x1="0" y1="0" x2="${X(Z)}" y2="0" stroke="rgba(255,255,255,.6)" stroke-width="2"/><line x1="${X(Z)}" y1="0" x2="${X(Z)}" y2="${W * k}" stroke="rgba(255,255,255,.45)" stroke-width="2"/><line x1="0" y1="${W * k}" x2="${X(Z)}" y2="${W * k}" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
      ${puntos(G.rival, cr)}${puntos(G.you, cy)}<text x="-10" y="${W * k / 2}" transform="rotate(-90 -10 ${W * k / 2})" text-anchor="middle">${esc(E.frontis)}</text><text x="${X(Z) * 1 + 10}" y="${W * k / 2}" transform="rotate(90 ${X(Z) * 1 + 10} ${W * k / 2})" text-anchor="middle">${esc(E.rebote2)}</text></svg></div>`;
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
    this.o.onEnd?.({ win: e.win, score: e.score, best: e.best, mode: this.game.mode, level: this.level, reto: e.reto || null });
  }

  // ------------------------------------------------------------ entrada
  bindInput() {
    const I = this.input, hud = this.hud;
    this.onKey = (e) => {
      const k = e.key.toLowerCase(), down = e.type === 'keydown';
      const mine = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'j', 'k', 'l', 'e', 'b', 'r', 'v', 'c', 'escape', 'enter'];
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
        if (k === 'r') this.pideDescanso();   // (el descanso)
        if (k === 'v' && this.conCamara) this.cambiaVista();   // (la vista: en primera persona o la de la tele)
        if (k === 'c') this.hud.onPlano?.();   // (la cámara: general, fija o detrás de ti)
        if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') this.chargeStart('hit');
        if (k === 'shift' || k === 'k') this.chargeStart('drop');
        if (k === 'l') this.chargeStart('cut');
        if (k === 'escape') { if (hud.panelEl || this.finalOn) return; hud.abreMenu(!hud.menuEl.classList.contains('on')); }   // (el menú, como la pausa)
      }
      if (!down && I.keys[k]) { if (k === ' ' || k === 'j' || k === 'e' || k === 'enter') this.chargeEnd('hit'); if (k === 'l') this.chargeEnd('cut'); if (k === 'shift' || k === 'k') this.chargeEnd('drop'); }
      I.keys[k] = down;
    };
    addEventListener('keydown', this.onKey, true); addEventListener('keyup', this.onKey, true);
    // (al irse la ventana, todo suelto: las teclas, la palanca y el golpe que se estaba cargando, que si no dejaba al
    // pelotari apuntando y sin moverse)
    this.soltar = () => { I.keys = {}; this.resetStick?.(); I.charge = null; I.drag = null; I.hitQ = I.dropQ = I.cutQ = false; };
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
      // (y mientras se mantiene, arrastrar el dedo desde el botón apunta: el joystick sigue moviendo al pelotari)
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); this.audio.ensure(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ } I.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0 }; if (charge) this.chargeStart(charge); else I[flag] = true; });
      b.addEventListener('pointermove', (e) => { const d = I.drag; if (!d || d.id !== e.pointerId) return; let x = (e.clientX - d.x0) / 56, y = -(e.clientY - d.y0) / 56; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } d.x = x; d.y = y; });
      const up = (e) => { b.classList.remove('down'); if (charge) this.chargeEnd(charge); if (I.drag && (!e || I.drag.id === e.pointerId)) I.drag = null; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    };
    // (cada botón por su nombre: la cortada lleva el estilo de los botones pequeños y antes se cogía como si fuese la dejada)
    btn('.pel-hit', 'hitQ', 'hit'); btn('.pel-dejada', 'dropQ', 'drop'); btn('.pel-cut', 'cutQ', 'cut');
  }
  // carga del golpe: cuanto más se mantiene, más fuerte; un toque corto es un golpe suave. A tope en 1 s (la dejada, en
  // 1,3 s) y al principio más despacio: así se afina bien un golpe suave o medio y la altura de la dejada (antes, a tope
  // en 0,7 s y en línea recta, costaba parar donde querías)
  // (otro botón con un golpe ya cargado: manda el último que se toca. Antes, si la cortada o la dejada se quedaban cargadas
  // porque su botón no llegó a soltarse, GOLPE no respondía y la palanca no movía al pelotari: el partido, bloqueado)
  chargeStart(kind) { const c = this.input.charge; if (!c || c.kind !== kind) this.input.charge = { kind, t0: this.t }; }
  // (cansado, la carga se queda en su tope: el aro no pasa de ahí, chargeTope)
  chargeLevel() { const c = this.input.charge; return c ? Math.min(this.chargeTope(), Math.pow(Math.min(1, (this.t - c.t0) / (c.kind === 'drop' ? 1.3 : 1)), 1.15)) : 0; }
  chargeTope() { const g = this.game; return g?.powTope ? Math.max(0, (g.powTope('you') - 0.15) / 0.85) : 1; }
  chargeEnd(kind) {
    const I = this.input, c = I.charge; if (!c || c.kind !== kind) return;
    I.power = 0.15 + this.chargeLevel() * 0.85; I.charge = null;
    if (kind === 'cut') I.cutQ = true; else if (kind === 'drop') I.dropQ = true; else I.hitQ = true;
  }
  // el descanso: pedido para el próximo parón entre tantos (otra vez, se retira); mientras descansas, el mismo botón vuelve
  // al juego antes de que acabe el minuto
  pideDescanso() {
    const g = this.game; if (!g || this.replay || this.hud.panelEl) return;
    if (g.phase === 'descanso') { if (g.descanso?.side === 'you') this.finDesc = true; return; }
    g.pideDescanso('you');
  }
  // hacia dónde se apunta ahora: el arrastre desde el botón, si lo usas; si no, el joystick o las teclas (WASD o flechas)
  // mientras se carga el golpe, al soltarlo y al sacar
  aimNow(golpe = false) {
    const I = this.input, k = I.keys, d = I.drag, g = this.game;
    if (d && Math.hypot(d.x, d.y) > 0.18) return { x: d.x, y: d.y };
    const saca = g && (g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP() === 'you';
    if (I.charge || golpe || saca) {
      let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + I.stick.x, y = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + I.stick.y;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      if (Math.hypot(x, y) > 0.12) return { x, y };
    }
    return { x: 0, y: 0 };
  }
  readInput() {
    const I = this.input, k = I.keys;
    if (this.cuerpo?.visto && !k.a && !k.d && !k.w && !k.s && !k.arrowleft && !k.arrowright && !k.arrowup && !k.arrowdown && I.stick.id == null) return this.leeCuerpo();
    let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + I.stick.x;
    let y = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + I.stick.y;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    if (Math.hypot(x, y) < 0.12) { x = 0; y = 0; }
    // la cámara mira al frontis: arriba en el joystick = hacia el frontis (−z)
    // sin el botón, el joystick te mueve, y solo él: nadie te mueve por ti. Mientras mantienes GOLPE, CORTADA o DEJADA, el
    // joystick apunta (izquierda, derecha, largo, corto, dos paredes) y el pelotari va solo a por la pelota, como antes
    // (game.js, movePlayers). Al dar el control total, el joystick dejó de apuntar y la pelota salía siempre recta; y
    // luego, apuntando, el joystick te llevaba hacia donde apuntabas y te sacaba de la pelota
    const aiming = !!I.charge, rel = I.hitQ || I.dropQ || I.cutQ, A = this.aimNow(rel);
    if (aiming) I.lastAim = A;
    const aim = rel && I.lastAim ? I.lastAim : A; if (rel) I.lastAim = null;
    const out = { mx: aiming ? 0 : x, mz: aiming ? 0 : -y, aiming, hit: !!I.hitQ, drop: !!I.dropQ, cut: !!I.cutQ, power: I.power, aimX: aim.x, aimY: aim.y, descansoFin: !!this.finDesc };
    this.finDesc = false;
    I.hitQ = I.dropQ = I.cutQ = false;
    return out;
  }

  // con la cámara: tu pelotari va al lado de la cancha donde estás tú (de lado a lado, a la altura donde se espera) y,
  // cuando te toca, va solo a por la pelota (como al mantener GOLPE) y apuntas hacia donde estás; el golpe, el tuyo
  // (onGolpe, en arrancaCamara)
  leeCuerpo() {
    const I = this.input, g = this.game, C = this.cuerpo, you = g.players.you;
    const turno = g.phase === 'rally' && g.rally?.turn === 'you' && (!g.pairs || g.takerOf('you') === 'you');
    let mx = 0, mz = 0;
    if (!turno) {
      // (a su sitio, el de tu lado de la cancha; pero no sigue cada balanceo de tu cuerpo: se pone en marcha si está a más
      // de 0,8 m y para al llegar. Antes, con cada vaivén tuyo daba pasitos de lado a lado sin parar)
      const tx = C.x * (COURT.W / 2 - 1.2), tz = g.cuatro ? 13 : 20.5, dx = tx - you.x, dz = tz - you.z, d = Math.hypot(dx, dz);
      if (d > 0.8) this.vaSitio = true; else if (d < 0.25) this.vaSitio = false;
      if (this.vaSitio) { mx = clamp1(dx * 0.9); mz = clamp1(dz * 0.45); }
    }
    // (ladoGolpe: con qué brazo vas a golpear, por el que armas; tu pelotari se pone a ese lado de la pelota y no delante de ella)
    const out = { mx, mz, aiming: turno, hit: !!I.hitQ, drop: !!I.dropQ, cut: !!I.cutQ, power: I.power, aimX: I.camAim ?? 0, aimY: I.camAimY ?? 0, camPend: !!I.camPend, descansoFin: !!this.finDesc, ladoGolpe: (C.arma || 'Hit').endsWith('L') ? -1 : 1 };
    this.finDesc = false; I.hitQ = I.dropQ = I.cutQ = false; I.camAim = I.camAimY = null; I.camPend = false;
    return out;
  }
  // la cámara y tu cuerpo (camaraCuerpo.js, solo en la web): cada golpe tuyo es un golpe de tu pelotari, con su fuerza, su
  // lado y su altura
  arrancaCamara() {
    if (this.cuerpo || this.camaraPedida) return; this.camaraPedida = true;
    import('./camaraCuerpo.js').then(({ CamaraCuerpo }) => {
      if (!this.active) return;
      const C = this.cuerpo = new CamaraCuerpo(this.hud.root);
      C.nombres = this.txt.shots || TEXT.es.shots;
      const fuera = () => !this.active || this.paused || this.hud.panelEl || this.replay || this.flying || this.vsOpen;
      // (al empezar el gesto, el golpe sale ya con lo que se ve; agachado, dejada, salvo al sacar)
      // (¿cuenta un golpe ahora? si la pelota viene hacia ti o sacas tú: para el nombre del golpe en pantalla y las manos)
      C.cuenta = () => { const g = this.game; if (!g) return false; return (g.phase === 'rally' && g.rally?.turn === 'you' && (!g.pairs || g.takerOf('you') === 'you')) || ((g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP?.() === 'you'); };
      C.onGolpe = (e) => {
        if (fuera()) return;
        const I = this.input, g = this.game, saca = (g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP?.() === 'you';
        // (solo cuando cuenta: la pelota viene hacia ti o sacas tú. Un gesto en la presentación, entre tanto y tanto o con la
        // pelota yendo al rival ya no hace que tu pelotari pegue al aire)
        if (!saca && !(g.phase === 'rally' && g.rally?.turn === 'you' && (!g.pairs || g.takerOf('you') === 'you'))) return;
        I.charge = null; I.power = e.power; I.camAim = e.aimX; I.camAimY = e.aimY; I.camPend = true; I.lastAim = null;
        if (e.req === 'dejada' && !saca) I.dropQ = true; else I.hitQ = true;
        this.camGolpe = { golpe: e.golpe, t: this.t, abierto: true }; (this.golpeDe ||= {}).you = e.golpe;
      };
      // (mientras dura y al acabar, lo que va siendo y lo que ha sido de verdad: hacia dónde, lo largo, la fuerza y si es
      // dejada o cortada; si el golpe aún no ha salido, lo que tiene que salir; y en el saque, el saque)
      const aplica = (e, fin) => {
        if (!this.active) return;
        const I = this.input, g = this.game, y = g.players.you, req = e.req || false, saca = (g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP?.() === 'you';
        if (fin && this.camGolpe) this.camGolpe.abierto = false;
        if (I.hitQ || I.dropQ || I.cutQ) { I.power = e.power; I.camAim = e.aimX; I.camAimY = e.aimY; if (fin) I.camPend = false; I.cutQ = req === 'cortada'; I.dropQ = !saca && req === 'dejada'; I.hitQ = !I.cutQ && !I.dropQ; }
        else if (y.camPend && y.swing > 0) { y.aim = { x: e.aimX, y: e.aimY }; y.pow = Math.max(e.power, fin ? 0 : y.pow ?? 0); y.dropReq = req; if (fin) y.camPend = false; }
        if (g.saque && (g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP?.() === 'you') g.saque = { ...g.saque, pow: e.power, aim: { x: e.aimX, y: e.aimY }, req: req === 'cortada' ? 'cortada' : false };
      };
      C.onGolpeAvance = (e) => aplica(e, false);
      C.onGolpeFin = (e) => aplica(e, true);
      C.start();
    }).catch(e => console.warn('pelota con la cámara', e));
  }

  // ------------------------------------------------------------ bucle
  /** Cómo está el partido, en corto, para el informe (util/informe.js): lo que puede tenerlo parado */
  estado() {
    const h = this.hud, b = h?.$?.('.pel-btns'), I = this.input;
    return { pausa: this.paused ? 1 : 0, menu: h?.menuEl?.classList.contains('on') ? 1 : 0, ventana: h?.panelEl ? 1 : 0, repe: this.replay ? 1 : 0,
      carga: I?.charge?.kind || '', mandos: b && getComputedStyle(b).visibility !== 'hidden' ? 1 : 0, ficha: this.fichaOpen ? 1 : 0, t: Math.round(this.t),
      // (con la cámara: cuántas imágenes por segundo mira el detector, si te ve, cuántos golpes y dónde va el detector)
      ...(this.cuerpo ? { camHz: Math.round(this.cuerpo.hz || 0), camVisto: this.cuerpo.visto ? 1 : 0, camGolpes: this.cuerpo.golpes, camDetector: this.cuerpo.w ? this.cuerpo.delegado || 'trabajador' : this.cuerpo.pl ? 'página' : 'no' } : {}) };
  }
  // el vigía: lo que podría dejar el partido parado sin que se vea por qué, en un móvil donde no se puede mirar (en
  // octubre de 2026 se quedó bloqueado en el iPhone, en el Labrit, tras un tanto y sin ningún error). Una pausa sin menú,
  // ventana ni ficha; una repetición que no acaba; un golpe cargado que no se suelta; los mandos escondidos en pleno juego;
  // una ventana que ya no está. Lo arregla y lo apunta, con el estado, para el informe (window.__errors)
  vigia(dt) {
    const V = this.vig ||= { pausa: 0, repe: 0, carga: 0, mandos: 0 }, h = this.hud, g = this.game, I = this.input; if (!h || !g) return;
    const apunta = (que) => { try { (window.__errors ||= []).push(`pelota parada: ${que} · ${g.phase} · ${JSON.stringify(this.estado())}`.slice(0, 300)); } catch (e) { /* nada */ } };
    if (h.panelEl && !h.panelEl.isConnected) { apunta('ventana perdida'); h.panelEl = null; h.root.classList.remove('paneled'); }
    const menu = h.menuEl?.classList.contains('on');
    V.pausa = this.paused && !menu && !h.panelEl && !this.fichaOpen ? V.pausa + dt : 0;
    if (V.pausa > 1.5) { V.pausa = 0; apunta('pausa sin menú'); this.paused = false; this.menuPausa = false; }
    V.repe = this.replay && !this.paused ? V.repe + dt : 0;
    if (V.repe > 14) { V.repe = 0; apunta('repetición sin fin'); this.endReplay(); }
    if (!this.replay) h.root.classList.remove('repe');
    if (!this.entra) h.root.classList.remove('sale');
    // (en pleno juego: ni en la repetición, ni con una ventana, ni en la llegada, la salida, el VS o el recorrido)
    const juego = ['serveWait', 'servePrep', 'rally'].includes(g.phase) && !this.replay && !h.panelEl && !this.entra && !this.flying && !this.vsOpen && !this.tour && !this.finalOn;
    V.carga = juego && I?.charge && !this.paused ? V.carga + dt : 0;
    if (V.carga > 8) { V.carga = 0; apunta('golpe cargado sin soltar'); I.charge = null; }
    const b = juego && h.$('.pel-btns');
    V.mandos = b && b.style.visibility === 'hidden' ? V.mandos + dt : 0;
    if (V.mandos > 2) { V.mandos = 0; apunta('mandos escondidos'); h.controls(true); }
  }
  update(dt) {
    if (!this.active) return false;
    dt = Math.min(dt, 0.05); this.t += dt;
    this.vigia(dt);
    if (this.replay) { if (this.fp?.on) this.camaraFP(dt, this.court.group, this.court); this.stepReplay(dt); this.hud.tick(dt); this.court.tick(dt); return this.active; }
    this.chapa?.update(dt);   // (la chapa del sorteo)
    if (this.repAt && this.t >= this.repAt && !this.paused && !this.hud.panelEl) { this.repAt = 0; this.startReplay(); if (this.replay) return this.active; }
    // (el golpe sale siempre al soltar: con la carga a tope, espera a que tú decidas)
    this.hud.charge(this.chargeLevel(), this.input.charge?.kind, this.chargeTope());
    // (con el partido en pausa o una ventana abierta no se juega: el golpe que se cargaba se suelta sin golpear)
    if ((this.paused || this.hud.panelEl) && this.input.charge) this.input.charge = null;
    if (this.entra?.go && !this.flying) this.pasoEntrada(dt);
    const g = this.game, inp = this.paused || this.hud.panelEl ? {} : this.readInput();
    const ev = this.paused ? [] : g.update(dt, inp);
    // (con la cámara, la fuerza del golpe sigue subiendo mientras la mano acelera, justo después de salir: lo más deprisa que va)
    if (this.camGolpe?.abierto && g.players.you.camPend && g.players.you.swing > 0 && this.cuerpo?.picoPow > (g.players.you.pow ?? 0)) g.players.you.pow = this.cuerpo.picoPow;
    // (fallo o acierto, al cantarse el tanto solo se oyen los aplausos: la pelota se calla, también en el golpe que lo
    // decide, hasta el saque siguiente)
    // (y el golpe que se estuviera cargando se suelta sin golpear: no pasa de un tanto al siguiente)
    if (ev.some(e => e.type === 'call')) { this.callada = true; this.input.charge = null; }
    for (const e of ev) { this.onEvent(e); this.o.onEvent?.(e); }
    this.draw(dt); if (!this.paused) this.record(dt);   // (en pausa no se graba: la repetición sería una imagen quieta)
    this.hud.tick(dt); this.court.tick(dt);
    return this.active;
  }
  onEvent(e) {
    const t = this.txt, g = this.game, A = this.audio, C = this.court;
    // (al cantar el tanto, la repetición, salvo en las pruebas automáticas)
    if (e.type === 'call') { this.recCall = true; if (g.mode === 'match' && this.repe && this.rec?.length > 30 && !(navigator.webdriver && !window.__repe)) this.repAt = this.t + 1.15; }
    switch (e.type) {
      case 'serveReady':   // (cansado y con descansos, ya no hay aviso escrito: brilla el botón de la pelota y el descanso)
        this.callada = false;
        if (g.reto) this.retoMarcador(); else this.hud.setScore(g.mode === 'rally' ? g.streak : g.score.you, g.mode === 'rally' ? '' : g.score.rival, g.server);
        this.bolaDelSaque();   // (quien saca elige la pelota del cestaño)
        // (la grada se calla para el saque; en el tanto de partido, contiene el aliento)
        this.rallyN = 0; this.golpazo = false; A.mood(0.2, 0.5);
        // (si el saque se hace esperar y hace rato que nadie habla, algo de relleno: que no se haga el silencio)
        if (g.mode === 'match') { const n0 = g.score.you + g.score.rival; setTimeout(() => { const G = this.game; if (!this.active || G !== g || G.phase !== 'serveWait' || G.score.you + G.score.rival !== n0 || this.t - (this.comT ?? -99) < 6) return; if (Math.random() < 0.6) this.decir(this.com?.relleno(this.comCtx()), 0, true); }, 5000); }
        // (a un tanto del final: con empate, «último tanto»; si no, «tanto de partido» y quién está a un tanto. Antes salía
        // siempre «el que gane este tanto, gana el partido», que solo es verdad con empate)
        if (e.matchPoint) { const T1 = g.target - 1, ambos = g.score.you === T1 && g.score.rival === T1, lider = g.score.you === T1 ? 'you' : 'rival';
          this.hud.call(ambos ? (t.lastPoint || TEXT.es.lastPoint) : t.matchPoint, ambos ? '' : (t.matchPointSub || TEXT.es.matchPointSub)(this.label(lider)), '', 2.6); A.mood(0.45, 0.3); if (g.score.you !== g.score.rival) this.decir(this.com?.frase('tantoPartido'), 200); }   // (la grada se mete: sin el «¡oooh!» sintetizado, que zumbaba)
        break;
      case 'hit': {
        // la fuerza también se oye y se nota: un golpe a tope suena más fuerte y sacude un poco la cámara
        const pw = e.pow ?? 0.5; if (!this.callada) A.hit((0.5 + e.q * 0.4) * (0.55 + pw * 0.75)); C.pop(e, 'z');
        // (cuanto más largo el peloteo, más se mete la grada: el murmullo sube poco a poco)
        this.rallyN = (this.rallyN || 0) + 1; A.mood(Math.min(0.52, 0.2 + this.rallyN * 0.03), 0.8);
        if (e.who === 'you' && pw > 0.8 && e.shot !== 'dejada') this.shake = Math.max(this.shake || 0, 0.12 + (pw - 0.8) * 0.6);
        // (cámara dinámica: un empujón hacia la cancha, mayor cuanto más fuerte y mejor le das)
        if (e.who === 'you' && e.shot !== 'dejada') this.kick = Math.max(this.kick || 0, Math.min(1, pw * 0.7 + (e.label === 'perfect' ? 0.35 : 0)));
        // el aviso de cómo ha salido (perfecto, bien, justo, pronto, tarde), solo en el peloteo de entrenar: en los partidos
        // salía en cada golpe y no hacía falta (octubre de 2026)
        if (e.who === 'you' && g.mode === 'rally') this.hud.quality(t.quality[e.label] || TEXT.es.quality[e.label], '', e.label);
        // el nombre del golpe, como en la tele, pero solo de vez en cuando: al aire (de volea, antes del bote) y los
        // pelotazos de verdad (uno de los que deciden, a tope y en el momento justo). Antes salía en cada dejada, cortada o
        // golpe a la pared; el rebote lo canta la pared de atrás ('back')
        { const SH = t.shots || TEXT.es.shots, nm = (e.sub && SH[e.sub]) || SH[e.shot] || '';
          this.golpazo = !!nm && !['pared', 'ancho', 'largo', 'rebote'].includes(e.shot);
          const pelotazo = this.golpazo && e.label === 'perfect' && pw >= 0.9;
          const rotulo = e.volea ? (t.deAire || TEXT.es.deAire) : pelotazo ? nm : '';
          if (rotulo && e.q > 0.3) this.hud.golpe(rotulo, this.cols[g.side(e.who)]);
          // (y en los que deciden, la cámara se mete un poco más en la jugada)
          if (this.golpazo && this.camDyn && e.q > 0.3) this.kick = Math.max(this.kick || 0, e.who === 'you' ? 0.5 : 0.35); }
        if (this.fp?.on) { if (e.who === 'you') this.fp.golpe(pw); else this.fp.impacto(0.35); }   // (en primera persona)
        this.swingAnim(e.who, e); this.comJuego(e); break;
      }
      case 'descanso': {   // (un minuto de descanso: tuyo o del rival; la grada se calma)
        const D = t.desc || TEXT.es.desc, mio = e.side === 'you';
        this.hud.call(mio ? D.tuyo : D.suyo(g.pairs && this.mateObjs ? `${this.names.rival} · ${this.mateObjs.rivalMate.name}` : this.names.rival), `${D.sub}${mio ? ' ' + D.quedan(e.left) : ''}`, '', 3.6);
        A.mood(0.12, 0.6); this.decir(this.dialogoO('descanso', this.com?.frase('descanso')), 600); break;
      }
      case 'whiff': if (g.mode === 'rally') this.hud.quality(e.early ? (t.quality.early || TEXT.es.quality.early) : t.quality.whiff, '', 'whiff'); break;   // (pronto o tarde: solo entrenando)
      case 'claim': this.hud.quality((t.pairs || TEXT.es.pairs).claim); break;   // (pides la pelota de tu compañero)
      // (la chapa: su destello, sin sacudir la cámara ni sonar: el «¡clonc!» del fallo no gustaba; el fallo se oye en los
      // aplausos)
      case 'front': if (!e.chapa) this.jugadaVa('front'); if (e.chapa) C.chapaT = 0.6; else if (!this.callada) A.front(); C.pop({ x: e.x, y: e.y, z: 0.02 }, 'z'); if (this.fp?.on) this.fp.impacto(Math.max(0, 1 - (g.players.you.z || 20) / 28) * 0.5); break;
      case 'wall': if (!this.callada) A.wall(); break;
      case 'back': if (e.live) this.jugadaVa('back'); if (!this.callada) A.wall(); if (e.live) this.hud.golpe((t.shots || TEXT.es.shots).rebote, this.cols[g.side(g.rally?.by || 'you')]); break;   // el rebote: la pared de atrás, en el rótulo de quien la mandó
      case 'floor': if (!this.callada) A.floor(e.soft ? 0.5 : 0.8); break;
      case 'streak': if (g.reto) this.retoMarcador(); else this.hud.setScore(e.n, '', g.server); break;
      case 'reto': {   // (una pelota del reto: se rotula, se mueve la diana y el marcador dice cuántas llevas y lo que queda)
        const R = this.retoTxt();
        this.retoMarcador();
        if (g.reto === 'peloteo') { if (!e.ok) this.hud.call(R.vida[0], R.vida[1](e.vidas), '', 3); }
        else if ('x' in e || 'z' in e) {   // (las que se juzgan en tu golpe; las que fallas o no devuelves ya las canta el juez)
          const [h, sb] = (e.ok ? R.ok : R.ko)[g.reto]; this.hud.call(h, sb, '', 2.6, e.ok ? { col: 'azul' } : null);
          A.point(true, !!e.ok, false, e.ok ? 0.5 : 0);
        }
        if (g.reto === 'diana') setTimeout(() => { if (this.active && this.game === g) this.dianaPon(); }, e.ok ? 900 : 500);
        break;
      }
      case 'call': {
        this.jPend = null;   // (el golpe pendiente de comentar ya no se comenta: el tanto ha acabado)
        this.lastWin = e.winner; this.lastFinal = !!e.final; this.planoT = this.t;
        // (la racha: tantos seguidos, iguala o remontada; en el aviso y, mientras dure, en el marcador)
        // (el movimiento del rótulo, según lo que ha pasado: hud.js, los dos botes botan, la chapa tiembla, fuera vuela de
        // lado, la falta y el pasa caen como un sello; un tanto bueno, brilla)
        const anim = e.call === 'bote' ? 'bote' : e.call === 'chapa' ? 'chapa' : /^(fuera|largo|lado|pared|alta|cuatro)$/.test(e.call) ? 'fuera' : /^(falta|pasa)/.test(e.call) ? 'falta' : 'tanto';
        const ex = g.mode === 'rally' ? { anim } : { col: this.cols[e.winner], racha: this.rachaDe(e), anim };
        const [title, sub] = t.calls[e.call] || t.calls.tanto;
        const who = e.winner === 'you' ? (g.pairs ? (t.pairs || TEXT.es.pairs).pointUs : t.pointYou) : (g.pairs && this.mateObjs ? (t.pairs || TEXT.es.pairs).pointThem(this.names.rival, this.mateObjs.rivalMate.name) : t.pointRival(this.names.rival));
        if (g.mode === 'rally') this.hud.call(title, sub, '', 3, ex);
        else if (e.final) { this.hud.call(t.finalCall, `${who}. ${t.finalSub}`, e.kantari, 5.5, ex); this.hud.setScore(e.score.you, e.score.rival, e.winner); this.hud.root.classList.add('final'); }
        else { this.hud.call(title, `${sub ? sub + ' ' : ''}${who}.`, e.kantari, ex?.racha ? 4 : 3.4, ex); this.hud.setScore(e.score.you, e.score.rival, e.winner); }
        // (sin silbato: el juez de pelota canta el tanto; la grada aplaude toda a la vez)
        A.point(e.call === 'bote' || e.call === 'tanto' || !t.calls[e.call], e.winner === 'you', e.final, Math.min(1, Math.max(0, ((this.rallyN || 0) - 3) / 8) + (this.golpazo ? 0.35 : 0)));
        if (g.mode === 'match') this.comTanto(e);
        break;
      }
      case 'end': this.endPanel(e); break;
    }
  }
  // Las rachas de un partido, como las cuenta la tele: tres tantos seguidos o más; y si el que iba tres o más por detrás
  // iguala el partido o se pone por delante, la remontada (una vez cada cosa). Devuelve el rótulo de este tanto ('' sin
  // nada) y deja la racha en el marcador mientras dure.
  rachaDe(e) {
    const T = this.txt.racha || TEXT.es.racha, R = this.rachas ||= { lado: null, n: 0, peor: { you: 0, rival: 0 }, igualo: {}, remonto: {} }, w = e.winner;
    R.n = R.lado === w ? R.n + 1 : 1; R.lado = w;
    const dif = (e.score?.you ?? 0) - (e.score?.rival ?? 0), suya = w === 'you' ? dif : -dif;
    for (const k of ['you', 'rival']) R.peor[k] = Math.min(R.peor[k], k === 'you' ? dif : -dif);
    this.hud.setRacha(w, R.n >= 3 ? R.n : '', T.marcador(R.n));
    if (R.peor[w] <= -3 && suya === 0 && !R.igualo[w]) { R.igualo[w] = true; R.tipo = 'iguala'; return T.iguala; }
    if (R.peor[w] <= -3 && suya === 1 && !R.remonto[w]) { R.remonto[w] = true; R.tipo = 'remonta'; return T.remonta; }
    R.tipo = R.n >= 3 ? 'seguidos' : ''; return R.n >= 3 ? T.seguidos(R.n) : '';
  }
  // Los comentarios (comenta.js), hablados (voz.js): decir dice una frase dentro de ms; escrita, solo con los subtítulos
  // puestos en Ajustes y sin un panel delante. Al empezar, la presentación y el rival (su arquetipo y su golpe estrella);
  // en cada tanto, lo que toque
  // (siCalla: solo si en ese momento no está hablando; las del peloteo, que pasado el momento ya no valen)
  // (c también puede ser un diálogo entre los dos, comenta.js: una lista de turnos que se dicen seguidos; si falta la
  // grabación de alguno, su frase suelta de repuesto, .solo)
  // (hecho: lo que se hace si de verdad se dice; las frases del peloteo, para no repetir la jugada al cantar el tanto)
  decir(c, ms = 0, siCalla = false, hecho = null) { if (!c) return; setTimeout(() => { if (!this.active) return; this.voz ||= new Voz(); if (siCalla && this.voz.habla_) return;
    if (Array.isArray(c)) { if (!tiene(c)) { if (c.solo) this.decir(c.solo, 0, siCalla); return; } c.forEach((q, i) => { q.sigue = c[i + 1] || null; }); }
    const f = Array.isArray(c) ? c[0] : c;
    if (this.voz.habla(f)) { this.comT = this.t; hecho?.(); } if (subtitulos() && !this.hud.panelEl) this.hud.comenta(f); }, ms); }
  // (un diálogo del tema k con la frase suelta f de repuesto; sin los dos comentaristas, la frase)
  dialogoO(k, f) { const d = this.com?.dialogo(k); if (!d) return f; d.solo = f; return d; }
  // (lo que el relleno necesita saber del partido: la pelota en juego, si a alguien le entra bien la mano, si va igualado)
  comCtx() { const g = this.game, sc = g.score || { you: 0, rival: 0 }, R = this.rachas || {};
    return { bola: clase(this.bola), mano: R.n || 0, igualado: Math.abs(sc.you - sc.rival) <= 1 && sc.you + sc.rival >= 6, tantos: sc.you + sc.rival }; }
  // Durante el peloteo: una frase corta del golpe (comenta.js, enJuego), solo si no está hablando. Las que alaban el golpe
  // («¡buena dejada!», «¡buen gancho!», «¡qué bien defiende!») esperan a ver que ha salido bien: a que la pelota llegue al
  // frontis por encima de la chapa y dentro; «va a rebote», a que llegue a la pared del rebote (o, si se mandó al rebote,
  // al frontis); «¡al aire!» y el peloteo largo, ya. Antes todas se decían al golpear, y si la dejada daba luego en la
  // chapa, se oía «¡buena dejada!» y además se callaba la explicación del fallo
  comJuego(e) {
    const c = this.com, g = this.game; if (!c?.on || g.mode !== 'match' || this.replay) return;
    const P = g.players?.[e.who], f = c.enJuego(e, g.rally?.hits || this.rallyN || 0, this.t, P ? Math.abs(P.z || 0) : 0);
    if (!f) return;
    const k = f.id.replace(/-\d+$/, '');
    if (k === 'j-aire' || k === 'j-peloteo') { this.jPend = null; this.diJugada(f, 120); return; }
    this.jPend = { f, who: e.who, t: this.t, espera: k === 'j-rebote' && e.shot !== 'rebote' ? 'back' : 'front' };
  }
  // (que no se atraviesen al volver a su sitio: la figura que vuelve corriendo, si va a cruzarse con otra a menos de 0,9 m
  // por delante, se aparta de lado —hacia el lado contrario al de la otra— con tiempo, la rodea y sigue a su sitio. Antes,
  // al cambiar el saque, pasaba una por dentro de la otra)
  esquiva(dt) {
    const S = this.slide, g = this.game; if (!S || !(dt > 0)) return;
    const ids = g.ids.filter(w => S[w]);
    // (la velocidad de cada figura al volver: hacia su sitio, a la de su carrera; quieta, cero)
    const vel = (s) => { const o = Math.hypot(s.ox, s.oz); return o < 0.05 ? [0, 0] : [-s.ox / o * (s.vel || 0), -s.oz / o * (s.vel || 0)]; };
    for (const w of ids) {
      const a = S[w], o = Math.hypot(a.ox, a.oz); if (o < 0.3) continue;
      const dx = -a.ox / o, dz = -a.oz / o, va = vel(a);
      for (const u of ids) {
        if (u === w) continue;
        // (dónde estará la otra respecto a esta en el momento en que más se acerquen, en el próximo segundo: si a menos de
        // 0,95 m, esta se aparta de lado a su marcha, hacia el lado contrario; de frente, hacia su derecha)
        const b = S[u], vb = vel(b), rx = b.x - a.x, rz = b.z - a.z, wx = vb[0] - va[0], wz = vb[1] - va[1], w2 = wx * wx + wz * wz;
        const t = w2 > 1e-6 ? Math.max(0, Math.min(1.2, -(rx * wx + rz * wz) / w2)) : 0, cx = rx + wx * t, cz = rz + wz * t, dc = Math.hypot(cx, cz);
        if (dc < 0.95) { const lado = dx * cz - dz * cx, sg = Math.abs(lado) < 0.05 ? 1 : lado > 0 ? 1 : -1, k = (0.95 - dc) * 6 * dt; a.ox += dz * sg * k; a.oz += -dx * sg * k; }
        // (y si aun así quedan a menos de 0,75 m, se separa)
        const d = Math.hypot(rx, rz); if (d < 0.75 && d > 1e-4) { const e = (0.75 - d) * 0.5; a.ox -= rx / d * e; a.oz -= rz / d * e; }
      }
    }
  }
  diJugada(f, ms) { this.decir(f, ms, true, () => { this.jugadaT = this.t; }); }
  // (la pelota del golpe pendiente ha llegado al frontis, bien, o a la pared del rebote: se dice si el tanto sigue vivo)
  jugadaVa(tipo) {
    const J = this.jPend; if (!J) return;
    if (this.t - J.t > 3) { this.jPend = null; return; }
    if (J.espera !== tipo || this.game.rally?.by !== J.who) return;
    this.jPend = null;
    setTimeout(() => { if (this.active && this.game.phase === 'rally') this.diJugada(J.f, 0); }, 150);
  }
  comInicio() {
    const c = this.com; if (!c?.on || this.game.mode !== 'match' || this.comIni) return; this.comIni = true;
    // (con los dos comentaristas, a veces se presentan: Iñaki presenta a Miren; un diálogo dura más y lo del rival espera)
    const d = Math.random() < 0.7 ? this.dialogoO('inicio', c.frase('inicio')) : c.frase('inicio'), largo = Array.isArray(d) && tiene(d);
    this.decir(d, 400);
    const rn = splitName(this.names.rival), A = pelotariArq(this.o.rivalStats || {}, rn.name, rn.town || this.o.town || '', false);
    this.decir(c.frase(`rival-${A.arq}`), largo ? 8200 : 4600); this.decir(c.frase(`estrella-${A.estrella}`), largo ? 8300 : 4700);
  }
  comTanto(e) {
    const c = this.com; if (!c?.on) return;
    const R = this.rachas || {};
    // (después del aplauso, cuando ya se va apagando: antes llegaba a los 0,3 s y se mezclaba con la grada aplaudiendo;
    // audio.js, aplauso. Si durante el peloteo ya se ha comentado la jugada, no se repite)
    const yaDicho = this.t - (this.jugadaT ?? -99) < 3.5;
    const x = this.game.stats?.log?.at(-1), f = c.tanto(x, { racha: R.tipo || '', n: R.n, final: !!e.final, gano: e.winner === 'you', yaDicho, ...this.comCtx() });
    // (tras un peloteo largo, a veces se lo comentan entre ellos: «¿Qué te ha parecido, Miren?»)
    const dlg = !e.final && !R.tipo && (x?.hits || 0) >= 7 && Math.random() < 0.35 ? this.dialogoO(Math.random() < 0.5 ? 'peloteo' : 'tanto', f) : f;
    this.decir(dlg, e.final ? 1800 : 1500);
    if (e.final) this.decir(this.dialogoO('final', c.frase('finalE')), 5200);
  }
  // (el golpe que se ve: derecha o izquierda según de qué lado le llega la pelota, sotamano si viene baja y de aire si
  // viene alta; el pelotari de Meshy tiene uno para cada caso, pelotaMoves.js)
  // (y dos golpes con su figura propia: el gancho, con el codo doblado y de arriba abajo, y la volea a media altura, corta y
  // seca. Antes se veían como un golpe de aire o una derecha cualquiera)
  swingAnim(who, e) { this.lastSwing[who] = this.t; const P = this.game?.players?.[who];
    if (e && P) { let g = golpeDe(P, e.x, e.y, e.z); const iz = g.endsWith('L') ? 'L' : ''; if (e.shot === 'gancho') g = 'GanchoL';   /* (el gancho, siempre con la izquierda) */ else if (e.volea && /^Hit/.test(g)) g = 'Volea' + iz;
      if (this.game.rally?.serve && this.game.rally.hits === 1) g = 'Low';   // (el saque, de sotamano y con la derecha: de abajo arriba)
      (this.golpeDe ||= {})[who] = g; }
    // (dónde se golpea la pelota, en el mundo: la mano del pelotari va justo ahí; glbChar.js, armSwing)
    if (e && Number.isFinite(e.x)) (this.golpeEn ||= {})[who] = { w: this.court.group.localToWorld(new this.T.Vector3(e.x, e.y, e.z)), t: this.t };
    if (who === 'you' && this.camGolpe && this.t - this.camGolpe.t < 0.8) this.golpeDe.you = this.camGolpe.golpe; }   // (con la cámara, el golpe que das tú: tu mano y tu altura)

  // ------------------------------------------------------------ dibujo
  draw(dt) {
    const g = this.game, C = this.court, T = this.T, grp = C.group;
    const h = g.hints();
    // pelota
    if (g.phase === 'intro' || g.phase === 'end') C.hideBall();
    else C.showBall(g.ball.p, h && h.hittable ? 0.6 + 0.4 * Math.sin(this.t * 14) : 0);
    // aros de ayuda
    const assist = g.lvl.assist > 0 || g.mode === 'rally';
    // (en primera persona, tampoco el aro del bote: muy cerca de ti se ve enorme y tapa la cancha)
    C.landRing.visible = !!(h && h.yourTurn && h.land);   // (también en primera persona: dónde va a botar, que de cerca cuesta calcularlo)
    if (C.landRing.visible) { C.landRing.position.set(h.land.x, 0.02, h.land.z); C.landRing.scale.setScalar(1 + 0.12 * Math.sin(this.t * 8)); }
    // (en primera persona, no: queda bajo tus pies y tapa media imagen)
    C.spotRing.visible = !!(assist && h && h.yourTurn && h.spot) && !this.fp?.on;
    if (C.spotRing.visible) {
      C.spotRing.position.set(h.spot.x, 0.025, h.spot.z);
      const you = g.players.you, inside = Math.hypot(you.x - h.spot.x, you.z - h.spot.z) < 0.8;
      C.spotRing.material.color.set(inside ? '#ffc2ec' : '#ff2bd6'); C.spotRing.material.opacity = inside ? 1 : 0.7;
    }
    // el golpe apuntado (mientras se carga): su camino, para la marca del frontis y el camino a trazos
    const ch = this.input.charge, { x: ax, y: ay } = this.aimNow();
    const apunta = g.phase === 'rally' || g.phase === 'servePrep' || (g.phase === 'serveWait' && g.serverP() === 'you' && !g.runUp);   // (también el saque, antes de salir)
    const pv = ch && (C.aimPath || C.aimMark) && apunta ? g.previewShot?.({ x: ax, y: ay }, ch.kind === 'cut' ? 'cortada' : ch.kind === 'drop' ? 'dejada' : false, 0.15 + this.chargeLevel() * 0.85) : null;
    // marca de puntería en el frontis mientras se carga la cortada o la dejada: sube con la fuerza (poca carga, rozando
    // la chapa; a tope, a media altura) y se mueve a lo ancho con el joystick, justo donde va a dar
    if (C.aimMark) {
      const on = !!ch && (ch.kind === 'cut' || ch.kind === 'drop') && apunta;
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
    // consejos: solo en el peloteo de entrenar, el primer medio minuto de los dos primeros; en los partidos, ninguno (el
    // autor no quiere que en cada golpe se explique cómo se juega: ensuciaba la vista)
    const tt = this.txt;
    let tip = '';
    const PT = tt.pairs || TEXT.es.pairs, sp = g.serverP(), aprende = this.conConsejos && g.mode === 'rally' && this.t < 30;
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
    // los descansos, en el menú del botón de la pelota (con los que te quedan en su badge); el botón brilla si estás cansado
    this.hud.descansos(g.mode === 'match' && g.phase !== 'intro' && g.phase !== 'end', g.descansos?.you ?? 0, !!g.pedido?.you, g.phase === 'descanso' && g.descanso?.side === 'you');
    this.hud.cansado(g.mode === 'match' && (g.descansos?.you > 0) && g.players.you.en < 0.35 && !g.pedido?.you);
    // la fuerza y la energía de cada uno, en el marcador bajo su nombre
    this.hud.energy(g.phase === 'intro' || g.phase === 'end' ? null : ['you', 'youMate', 'rival', 'rivalMate'].filter(id => g.players[id]).map(id => ({ id, side: g.side(id), color: this.cols[g.side(id)], me: id === 'you', en: g.players[id].en,
      name: id === 'you' ? this.names.you : id === 'rival' ? this.names.rival : this.mateObjs?.[id]?.name || '' })));
    // pelotaris
    this.esquiva(dt);
    for (const who of g.ids) {
      const P = g.players[who], side = this.o[who] || this.mateObjs?.[who]; if (!side?.obj) continue;
      // vigía de saltos: al colocarse para el saque la lógica los pone en su sitio de golpe; la figura llega andando
      const S = (this.slide ||= {})[who] ||= { x: P.x, z: P.z, ox: 0, oz: 0, v: 0, vel: 0 };
      let px = P.x, pz = P.z; if (!Number.isFinite(px) || !Number.isFinite(pz)) { px = S.x; pz = S.z; }
      if (Math.hypot(px - S.x, pz - S.z) > Math.max(0.35, 10 * dt)) { S.ox = S.x - px; S.oz = S.z - pz; }
      S.v = 0;
      // (vuelve corriendo, como un pelotari de verdad: arranca, corre a su paso y frena al llegar; con esa velocidad se elige
      // el paso de la figura, que corre con las piernas. Antes se acercaba cada vez más despacio y, al final, parecía que
      // se arrastraba hasta su sitio)
      if (S.ox || S.oz) {
        const d = Math.hypot(S.ox, S.oz), quiere = Math.min(VUELTA.v, Math.sqrt(2 * VUELTA.freno * d));
        S.vel = quiere > S.vel ? Math.min(quiere, S.vel + VUELTA.acel * dt) : quiere;
        const step = Math.min(d, S.vel * dt), k = d > 0 ? (d - step) / d : 0;
        S.ox *= k; S.oz *= k; if (dt > 0) S.v = step / dt;
        if (Math.hypot(S.ox, S.oz) < 0.03) { S.ox = S.oz = 0; S.vel = 0; }
        px += S.ox; pz += S.oz;
      } else S.vel = 0;
      (g.lejos ||= {})[who] = Math.hypot(S.ox, S.oz) > 0.5;   // (aún volviendo: el saque espera, game.js)
      S.x = px; S.z = pz;
      this.v3.set(px, 0, pz); grp.localToWorld(this.v3);
      side.obj.position.copy(this.v3);
      // mira al frontis salvo cuando corre hacia atrás o hacia un lado
      let yaw = Math.PI;
      // (más despacio, de lado con pasos laterales, sin dejar de mirar al frontis. Con margen: se gira al pasar de 3 m/s y no
      // vuelve hasta bajar de 2,2; antes, corriendo justo a esa velocidad, el cuerpo se giraba y se desgiraba sin parar)
      const deLado = Math.abs(P.vx) > Math.abs(P.vz) * 0.6;
      if (P.speed > 3.0 && deLado) P.corre = true; else if (P.speed < 2.2 || Math.abs(P.vx) < Math.abs(P.vz) * 0.4) P.corre = false;
      if (P.corre) yaw = Math.atan2(P.vx, P.vz);
      else if (S.v > 0.8) yaw = Math.atan2(-S.ox, -S.oz);   // (yendo a su sitio para el saque, mira hacia donde va)
      // (al saludar en la salida, de cara a la cámara. El que gana el tanto celebra de cara a la grada, sin más: antes se
      // giraba para mirar a la cámara, que estaba a su espalda y luego cambiaba de plano, y daba media vuelta sobre sí mismo
      // en cada tanto, y en el último, con la cámara dando la vuelta, no paraba de girar)
      if (this.entra?.ok[who]) yaw = Math.atan2(this.camPos.x - side.obj.position.x, this.camPos.z - side.obj.position.z) - grp.rotation.y;
      else if (g.phase === 'point' && P.act === 'cheer') yaw = Math.atan2(1, -0.4);
      // (y el giro, sin latigazos: como mucho 7 rad/s, que es lo que gira alguien al arrancar a correr)
      { const dYaw = Math.atan2(Math.sin(yaw - (P.yaw ?? yaw)), Math.cos(yaw - (P.yaw ?? yaw))) * (1 - Math.exp(-12 * dt)); const tope = (g.phase === 'point' ? 3 : 7) * dt; P.yaw = P.yaw == null ? yaw : P.yaw + Math.max(-tope, Math.min(tope, dYaw)); }   // (entre tanto y tanto, con calma)
      side.obj.rotation.y = grp.rotation.y + P.yaw + (this.o.yawOffset || 0);
      const swingAge = this.t - (this.lastSwing[who] || -9);
      // preparación del golpe: cuando la pelota viene hacia quien le toca, echa el brazo atrás (más cuanto más cerca)
      const ball = g.ball.p, sd = g.side(who), turn = g.phase === 'rally' ? g.rally?.turn === sd && g.rally?.front && (!g.pairs || g.takerOf(sd) === who) : g.phase === 'servePrep' && g.serverP() === who;
      const dB = Math.hypot(ball.x - P.x, ball.z - P.z), wind = turn ? Math.max(0, Math.min(1, 1 - (dB - 1.0) / 5)) : 0, arma = dB < 2.6 ? golpeDe(P, ball.x, ball.y, ball.z) : (this.armaDe?.[who] || 'Hit');
      (this.armaDe ||= {})[who] = arma;
      // (con la cámara, tu pelotari arma el brazo como tú: lo que lo echas atrás, de qué lado y a qué altura)
      // (solo cuando viene la pelota o sacas: si no, cada gesto tuyo, aunque fuera colocarte, le hacía armar el brazo)
      const cam = who === 'you' && this.cuerpo?.visto && (turn || ((g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP() === 'you')) ? this.cuerpo : null;
      // ¿va hacia atrás? (de espaldas a donde corre: las piernas, al revés, en vez de correr hacia delante sin moverse así)
      const back = (P.speed || 0) > 0.4 && (P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)) < -0.35 * P.speed;
      const st = { speed: Math.max(P.speed || 0, S.v), back, act: P.act, actT: P.actT, wind, swing: swingAge < 0.4 ? swingAge / 0.4 : -1, won: g.phase === 'point' && P.act === 'cheer', lost: g.phase === 'point' && P.act === 'sad', saluda: !!this.entra?.ok[who],
        // (el cansancio se ve: encorvado y respirando deprisa, más entre tanto y tanto; glbChar.js, armSwing)
        tired: g.mode === 'match' ? g.tired(who) : 0, entre: g.phase === 'point' || g.phase === 'serveWait' || g.phase === 'descanso',
        // (el armado del golpe que viene y el golpe que se da; y si se desplaza de lado mirando al frontis: pasos laterales)
        arma: cam ? cam.arma : arma, golpe: this.golpeDe?.[who] || 'Hit', lado: lateral(P) };
      if (cam) st.wind = Math.max(cam.wind, wind * 0.25);
      // el saque: el que saca lleva la pelota en la mano derecha mientras espera y mientras corre (lleva); al botarla, el
      // brazo baja con ella un instante (bota) y luego arma. manoW: dónde queda su mano, para dibujar ahí la pelota
      { const saca = g.serverP?.() === who && (g.phase === 'serveWait' || g.phase === 'servePrep');
        st.lleva = saca && g.phase === 'serveWait' ? 1 : 0; st.bota = saca && g.phase === 'servePrep' && g.phaseT < 0.19 ? 1 : 0;
        if (st.bota) st.wind = 0; else if (saca && g.phase === 'servePrep') st.wind *= Math.min(1, (g.phaseT - 0.19) / 0.15);
        // (tras botarla arma como se arma corriendo: el brazo derecho atrás y abajo y el izquierdo recogido delante; el
        // saque se da de sotamano, a la altura de la cadera. Antes armaba como para una derecha de parado, con los dos
        // brazos en cruz, y la pelota subía sola delante del pecho)
        if (saca && g.phase === 'servePrep' && !cam) st.arma = 'Saque';
        if (saca) { st.manoW = ((this.manoW ||= {})[who] ||= new T.Vector3()); st.manoN = ((this.manoN ||= {})[who] ||= new T.Vector3()); } }
      // (y la mano, a la pelota en el golpe: el sitio donde se ha golpeado, durante una décima de segundo)
      { const ce = this.golpeEn?.[who]; if (ce && this.t - ce.t < 0.12) st.contacto = ce.w; }
      this.suda(who, st.tired, side.obj, dt);
      // un golpe nuevo (al pulsar), una sola vez: el gesto no se repite mientras dura el estado
      const sw = P.act === 'swing', SP = this.swPrev ||= {}; if (sw && !SP[who] && who === 'you' && swingAge > 0.4) this.lastSwing[who] = this.t; SP[who] = sw;
      (this.recSt ||= {})[who] = st;
      if (side.animate) side.animate(side.obj, st, dt); else basicAnimate(side.obj, st, dt, this.t);
    }
    // la pelota del saque, agarrada: mientras espera y corre va en la palma de la mano derecha, pegada a ella y a su tamaño
    // de verdad (en juego se dibuja tres veces mayor, para verla). Al botarla, la mano baja con ella y la suelta hacia el
    // suelo; solo entonces va por su cuenta. Antes iba junto a la muñeca, con la mano abierta, y parecía flotar
    { const SUELTA = 0.13, SALE = 0.08, EN_MANO = 0.46; let esc = 1;
      if (!this.replay && (g.phase === 'serveWait' || g.phase === 'servePrep')) {
        esc = EN_MANO;
        const sv = g.serverP?.(), mw = this.manoW?.[sv], mn = this.manoN?.[sv], u = g.phase === 'servePrep' ? Math.max(0, Math.min(1, (g.phaseT - SUELTA) / SALE)) : 0;
        if (u < 1 && mw && mw.lengthSq() > 1e-6) {
          const v = this.v3.copy(mw); if (mn) v.addScaledVector(mn, COURT.BALL_R * esc * 0.78); grp.worldToLocal(v);
          if (u > 0) { v.x += (g.ball.p.x - v.x) * u; v.y += (g.ball.p.y - v.y) * u; v.z += (g.ball.p.z - v.z) * u; }
          C.ball.position.copy(v); C.shadow.position.set(v.x, 0.012, v.z);
        }
        // (y sin estela mientras la lleva y la bota: la estela es del pelotazo)
        for (const m of C.trail) m.visible = false; C.trailPts = [];
      }
      // (junto al cuerpo, la pelota a su tamaño; crece al de siempre según sale del saque, que de lejos hay que verla)
      else if (!this.replay && g.phase === 'rally' && g.rally?.serve && g.rally.hits === 1 && g.phaseT < 0.3) esc = EN_MANO + (1 - EN_MANO) * (g.phaseT / 0.3);
      if (esc !== 1 || this.escSaque) { C.ball.scale.setScalar(esc); this.escSaque = esc !== 1; } }
    // por parejas, una flecha sobre ti (tu compañero lleva la misma ropa)
    if (g.pairs) {
      if (!this.pin) { this.pin = new T.Mesh(new T.ConeGeometry(0.2, 0.36, 4).rotateX(Math.PI), new T.MeshBasicMaterial({ color: '#ff7ac8', depthTest: false, transparent: true })); this.pin.renderOrder = 3; grp.add(this.pin); }
      const Y = g.players.you; this.pin.visible = g.phase !== 'intro'; this.pin.position.set(Y.x, 2.35 + Math.sin(this.t * 6) * 0.08, Y.z); this.pin.rotation.y = this.t * 2;
    } else if (this.pin) this.pin.visible = false;
    // (durante la llegada, la cámara es la del vuelo; si pasa por detrás del rebote, el rebote se deja ver a través)
    if (this.flying) { const lc = grp.worldToLocal(this.v3.copy(this.cam.position)); C.reboteSeeThrough?.(lc.z > COURT.REBOTE - 2 && lc.z < COURT.REBOTE + 12 && lc.y < COURT.REBOTE_H + 3 && Math.abs(lc.x) < 14, dt); return; }
    // en primera persona (con la cámara): mientras se juega, en tus ojos; en los cortes del tanto, la llegada, el sorteo, la
    // presentación y las repeticiones, la de siempre
    if (this.camaraFP(dt, grp, C)) return;
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
    const saqueRv = this.camDyn && !this.tour && g.phase === 'serveWait' && g.side(g.serverP()) === 'rival' && g.phaseT > 0.15 && g.mode === 'match';
    if (corte) {
      const rv0 = g.players.rival || you, mid = Math.max(4, Math.min(COURT.L, (you.z + rv0.z) / 2)), co = COURT.W / 2 + (C.contra || 2.6);
      const Wn = g.players[this.lastWin] || you, cw = [[Wn.x + 1.4, 1.65, Wn.z - 3.4], [Wn.x, 1.35, Wn.z]];
      // (y dos más: el que pierde, de cerca, cabizbajo; y desde el suelo junto al frontis, con el ganador recortado contra la grada)
      const Ls = g.players[this.lastWin === 'you' ? 'rival' : 'you'] || rv0, cl2 = [[Ls.x - 1.3, 1.5, Ls.z - 3.1], [Ls.x, 1.25, Ls.z]], bajo = [[Wn.x * 0.4 - 0.8, 0.55, Math.max(1.6, Wn.z - 7.5)], [Wn.x, 1.5, Wn.z]];
      const planos = [[[co - 0.4, 3.4, mid + 4], [-1.5, 1.3, mid - 1]], cw, [[1.2, 1.5, 3.2], [(you.x + rv0.x) / 2, 1.4, mid + 1]], cl2, [[-2.4, 1.9, mid - 5], [co + 2, 1.7, mid + 3]], bajo, [[-1.5, 16, mid + 8], [0, 0, mid - 2]]];
      // (corteN: por qué plano de corte se va. Antes se llevaba en this.plano, que desde que la cámara se elige es su nombre
      // («general», «fija», «detras»): la cuenta daba NaN, no había plano y el partido se cerraba al acabar el primer tanto)
      const nPl = (this.corteN || 0) % planos.length;
      let [cp, cl] = planos[nPl];
      // (ningún plano se queda clavado: la cámara se acerca despacio a lo que mira y se desliza un poco de lado, como una
      // cámara de televisión sobre su carro; el de la grada, una panorámica lenta)
      { const u = Math.min(6, Math.max(0, g.phaseT - 0.35)), dx = cl[0] - cp[0], dy = cl[1] - cp[1], dz = cl[2] - cp[2], d = Math.hypot(dx, dy, dz) || 1, av = Math.min(0.32 * u, d * 0.3), ld = (nPl % 2 ? 1 : -1) * 0.14 * u;
        cp = [cp[0] + dx / d * av + dz / d * ld, cp[1] + dy / d * av * 0.5, cp[2] + dz / d * av - dx / d * ld];
        if (nPl === 4) cl = [cl[0], cl[1], cl[2] + 0.5 * u]; }
      if (this.lastFinal) { const a = (this.t - (this.planoT || 0)) * 0.55; cp = [Wn.x + Math.sin(a) * 4.2, 2 + Math.sin(a * 0.5) * 0.4, Wn.z - Math.cos(a) * 4.2]; cl = [Wn.x, 1.3, Wn.z]; }
      lp[0] = cp[0]; lp[1] = cp[1]; lp[2] = cp[2]; ll[0] = cl[0]; ll[1] = cl[1]; ll[2] = cl[2];
    } else if (saqueRv) {
      const S = g.players[g.serverP()];
      lp[0] = Math.min(COURT.W / 2 + 1.2, S.x + 4.2); lp[1] = 1.7; lp[2] = S.z + 1.6; ll[0] = S.x - 0.6; ll[1] = 1.2; ll[2] = S.z - 3;
    }
    // la cámara fija clásica (Más opciones): alta, por detrás, centrada y quieta, como la tele de antes; se ve la cancha
    // entera y los dos pelotaris. Mientras se juega no se mueve ni corta; tras el tanto, los planos de siempre si la
    // dinámica está puesta
    // detrás de ti: a la altura del hombro de tu pelotari y algo a su derecha (para que no tape el frontis), mirando al
    // frontis y un poco hacia la pelota. Si la pelota se va al fondo, retrocede y sube un poco para verla llegar
    if (this.plano === 'detras' && !this.tour && !corte && !saqueRv && ['rally', 'serveWait', 'servePrep', 'point'].includes(g.phase)) {
      const B = g.ball, bx = Number.isFinite(B.p.x) ? Math.max(-COURT.W * 0.5, Math.min(COURT.W * 0.5, B.p.x)) : you.x, L2 = this.largoK || 0;
      lp[0] = you.x * 0.85 + (portrait ? 0.5 : 0.9); lp[1] = (portrait ? 3 : 2.35) + L2 * 1.6; lp[2] = you.z + (portrait ? 5.2 : 4) + L2 * 4;
      ll[0] = you.x * 0.45 + bx * 0.35; ll[1] = 1.7 + Math.max(0, Math.min(2.5, (B.p.y || 0) - 1.5)) * 0.2; ll[2] = you.z - 11 + L2 * 6;
      this.detrasOn = true;
    } else this.detrasOn = false;
    if (this.camFija && !this.tour && !corte && !saqueRv && ['rally', 'serveWait', 'servePrep', 'point'].includes(g.phase)) {
      const zf = Math.min(COURT.L + (portrait ? 2.6 : 1.4), COURT.REBOTE - 0.6);
      lp[0] = 1.2; lp[1] = portrait ? 13 : 10.5; lp[2] = zf; ll[0] = 0; ll[1] = 0.4; ll[2] = COURT.L * (portrait ? 0.42 : 0.5); this.fijaOn = true;
    } else this.fijaOn = false;
    const enPlano = corte || saqueRv;
    if (enPlano !== !!this.enCorte) { this.enCorte = enPlano; this.camInit = false; }
    if (this.lastCorte && !corte) this.corteN = (this.corteN || 0) + 1;   // (el plano siguiente, en el tanto siguiente)
    this.lastCorte = corte;
    if (g.phase === 'intro') { const [p, l] = this.introCam(this.t - (this.t0 || 0)); lp[0] = p[0]; lp[1] = p[1]; lp[2] = p[2]; ll[0] = l[0]; ll[1] = l[1]; ll[2] = l[2]; }
    if (this.tossCam) { const [p, l] = this.tossCam(); lp[0] = p[0]; lp[1] = p[1]; lp[2] = p[2]; ll[0] = l[0]; ll[1] = l[1]; ll[2] = l[2]; }   // (el sorteo: la cámara junto a la chapa)
    // (la salida de los pelotaris: sus dos planos, con un corte entre uno y otro)
    { const pl = this.entra?.go ? (this.entra.salu ? 2 : 1) : 0; if (pl !== (this.entraPl || 0)) { this.entraPl = pl; this.camInit = false; }
      if (pl) { const [p, l] = this.camEntrada(); lp[0] = p[0]; lp[1] = p[1]; lp[2] = p[2]; ll[0] = l[0]; ll[1] = l[1]; ll[2] = l[2]; } }
    if (this.tour) { const [cp, cl] = this.tourCams[this.tour.i]; lp[0] = cp[0]; lp[1] = cp[1]; lp[2] = cp[2]; ll[0] = cl[0]; ll[1] = cl[1]; ll[2] = cl[2]; this.tourMat.opacity = 0.45 + 0.3 * Math.sin(this.t * 4); }   // (parpadea: se ve que está resaltada)
    // cámara dinámica (se puede quitar en Más opciones): sigue un poco la pelota de lado, se acerca con cada golpe fuerte
    // y se inclina apenas hacia donde va. Todo suave y pequeño, para dar vida sin perder de vista la cancha ni la pelota
    let dyn = 0;
    if (this.camDyn && !this.camFija && !this.detrasOn && !this.tour && (g.phase === 'rally' || g.phase === 'serveWait' || g.phase === 'servePrep')) {
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
    if (!this.camInit || this.tossCam) { this.camPos.copy(wp); this.camLook.copy(wl); this.camInit = true; }   // (con la chapa, sin retraso: ya va suave)
    const k = 1 - Math.exp(-5 * dt);
    this.camPos.lerp(wp, k); this.camLook.lerp(wl, k);
    this.cam.position.copy(this.camPos);
    if (this.shake > 0) { this.shake -= dt; this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.25; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.25; }
    this.cam.lookAt(this.camLook);
    if (this.roll) this.cam.rotateZ(this.roll);
    // el rebote, a través si la cámara queda detrás de él (si no, taparía la cancha)
    // (se empieza a quitar 2 m antes de llegar a él: así, cuando la cámara lo cruza, ya no está; si no, durante un momento
    // la pared tapaba la imagen con su cara de detrás, a la sombra, y la oscurecía)
    const lc = grp.worldToLocal(this.v3.copy(this.camPos)); C.reboteSeeThrough?.(lc.z > COURT.REBOTE - 2, dt);
    this.fovK = (this.fovK || 0) + (dyn - (this.fovK || 0)) * Math.min(1, dt * 10);
    { const sp = this.camDyn && !this.fijaOn && g.players.you?.sprint ? 1 : 0; this.sprintK = (this.sprintK || 0) + (sp - (this.sprintK || 0)) * Math.min(1, dt * (sp ? 4 : 6)); }   // (al esprintar, el plano se abre un poco: se nota la arrancada)
    const fov = (portrait ? 62 : 54) + (g.pairs ? 4 : 0) - this.fovK * 3 + (this.largoK || 0) * 6 + (this.enCorte ? 4 : 0) + (this.fijaOn ? 6 : 0) + (this.detrasOn ? 8 : 0) + (this.sprintK || 0) * 3.5;   // (por parejas, algo más abierta: cuatro pelotaris en la cancha)
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }
  // la vista en primera persona: true si está puesta ahora (y entonces la cámara ya está colocada)
  camaraFP(dt, grp, C) {
    const g = this.game, yo = this.o.you?.obj;
    const ok = this.conCamara && this.vistaFP && this.active && !this.replay && !this.tour && !this.tossCam && !this.entra?.go && !this.flying && ['rally', 'serveWait', 'servePrep'].includes(g?.phase);
    const sb = this.o.you?.sombra;
    if (!ok) { if (this.fp?.on) { this.fp.apaga(); if (yo) yo.visible = true; if (sb && this.sombraVis != null) sb.visible = this.sombraVis; C.ball.scale.setScalar(1); this.camInit = false; } return false; }
    const T = this.T;
    // (los brazos, los de tu pelotari: se copia de él; la camiseta, solo si no tiene esqueleto y hay que hacerle unos)
    if (!this.fp) this.fp = new PrimeraPersona(T, this.cam, { camiseta: this.cols.you === 'rojo' ? '#c62a3f' : '#2f52c4', avatar: yo });
    if (!this.fp.on) { this.ojoH ??= this.altoOjos(yo); this.fp.enciende(grp.parent || grp); if (yo) yo.visible = false; if (sb) { this.sombraVis = sb.visible; sb.visible = false; } }
    const you = g.players.you, B = g.ball.p, BV = g.ball.v || {}, portrait = innerWidth < innerHeight, W2 = COURT.W / 2;
    // los ojos: donde está tu pelotari, a su altura (el paso y la inclinación los pone primeraPersona.js)
    const ojo = grp.localToWorld(new T.Vector3(you.x, this.ojoH, you.z));
    // adónde mira: a la pelota, adelantándose un poco a su vuelo, mientras viene por delante o va al frontis; muy cerca, a
    // medias con el frontis (si no, la mirada daría un latigazo al pasar la pelota junto a ti). Si se va detrás de ti, al
    // rebote, al frontis, girado hacia su lado. Al sacar, al frontis
    let tx = you.x * 0.3, ty = 1.6, tz = 0;
    if (g.phase === 'rally' && Number.isFinite(B.z)) {
      const bx = B.x + (BV.x || 0) * 0.07, by = B.y + (BV.y || 0) * 0.07, bz = B.z + (BV.z || 0) * 0.07;
      if (bz < you.z - 0.3) {
        const dist = Math.hypot(bx - you.x, by - this.ojoH, bz - you.z), w = 0.35 + 0.6 * Math.max(0, Math.min(1, (dist - 1.2) / 2.5));
        const fx = you.x * 0.3, fy = 1.4, fz = Math.min(you.z - 8, 4);
        // (de alto, a medias: si no, con cada pelota alta la mirada se iba al cielo)
        tx = fx + (bx - fx) * w; ty = Math.min(3, fy + (by - fy) * w * 0.5); tz = fz + (bz - fz) * w;
      } else { tx = Math.max(-W2, Math.min(W2, bx)) * 0.9; ty = 1.5; tz = you.z - 7; }
    }
    const mira = grp.localToWorld(new T.Vector3(tx, ty, tz));
    // lo deprisa que vas y lo que vas de lado: para el paso, la inclinación y lo que se abre la vista
    const vel = Math.hypot(you.vx || 0, you.vz || 0) || you.speed || 0, lado = Math.max(-1, Math.min(1, (you.vx || 0) / 6));
    const saca = (g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP?.() === 'you' && Math.hypot(B.x - you.x, B.z - you.z) < 1.6;
    // (el campo de visión, por lo ancho de la pantalla: unos 90 grados de lado a lado. Con uno fijo, en el móvil en
    // horizontal, tan ancho, se veía como con ojo de pez)
    const asp = Math.max(0.3, innerWidth / Math.max(1, innerHeight)), fovFP = Math.max(46, Math.min(80, 2 * Math.atan(Math.tan(Math.PI / 4) / asp) * 180 / Math.PI));
    // (pega: si el golpe cuenta, la pelota viene y está ya cerca; solo entonces se ven las manos. bola: la pelota, para que
    // la mano que golpea vaya a ella y no la atraviese)
    const pega = this.cuerpo?.cuenta?.() && (saca || (g.phase === 'rally' && Math.hypot(B.x - you.x, B.z - you.z) < 4.5));
    this.fp.update(dt, { ojo, mira, vel, lado, cuerpo: this.cuerpo, st: this.recSt?.you, fov: fovFP, saca, pega, bola: C.ball.visible ? C.ball.getWorldPosition(new T.Vector3()) : null });
    // al sacar tú, la pelota en tu mano (la de la vista; si no, flotaba donde estaría la mano del pelotari entero)
    if ((g.phase === 'serveWait' || g.phase === 'servePrep') && g.serverP?.() === 'you' && Math.hypot(B.x - you.x, B.z - you.z) < 1.6 && B.y < 2.2) {
      const m = this.fp.mano('R', new T.Vector3()); if (m) { C.ball.position.copy(grp.worldToLocal(m)); C.shadow.position.set(C.ball.position.x, 0.012, C.ball.position.z); }
    }
    // (la pelota se dibuja algo más grande que de verdad para que se vea en la cancha; pegada a los ojos, a su tamaño)
    { const dc = this.cam.position.distanceTo(C.ball.getWorldPosition(this.v3)); C.ball.scale.setScalar(Math.max(0.4, Math.min(1, dc / 1.4))); }
    this.camPos.copy(this.cam.position); this.camLook.copy(mira);
    C.reboteSeeThrough?.(false, dt);
    return true;
  }
  // a qué altura tiene los ojos tu pelotari (por el hueso de la cabeza; si no se encuentra, la de una persona)
  altoOjos(yo) {
    let h = 1.6;
    try {
      let cab = null; yo?.updateMatrixWorld(true); yo?.traverse(o => { if (!cab && o.isBone && /head/i.test(o.name)) cab = o; });
      if (cab) { const p = cab.getWorldPosition(new this.T.Vector3()), y0 = yo.getWorldPosition(new this.T.Vector3()).y; h = Math.max(1.35, Math.min(1.85, p.y - y0 + 0.06)); }
    } catch (e) { /* la de una persona */ }
    return h;
  }
  // la cámara elegida (general, fija o detrás de ti): se recuerda; con aviso, el nombre un momento abajo
  planoTxt() { const P = this.txt.plano || TEXT.es.plano; return P[2](P[1][this.plano]); }
  ponPlano(k, aviso = false) {
    if (!PLANOS.includes(k)) return;
    this.plano = k; this.camFija = k === 'fija'; this.camInit = false;
    try { localStorage.setItem('herrizherri-pelota-plano', k); localStorage.setItem('herrizherri-pelota-camfija', k === 'fija' ? '1' : '0'); } catch (e) { /* sin guardar */ }
    this.hud.plano(this.planoTxt());
    if (aviso) { this.hud.tip(this.planoTxt()); clearTimeout(this.planoT); this.planoT = setTimeout(() => { if (this.active) this.hud.tip(''); }, 1600); }
  }
  cambiaVista() {
    this.vistaFP = !this.vistaFP; this.camInit = false;
    try { localStorage.setItem('herrizherri-pelota-vista', this.vistaFP ? 'fp' : 'tele'); } catch (e) { /* sin guardar */ }
    this.hud.vista(this.conCamara, this.vistaFP);
  }
  destroy() {
    this.finalFin?.(); this.dianaQuita();
    if (!this.active) return;
    this.active = false; setFeel(null); this.audio.stop(); this.voz?.calla(); this.cuerpo?.stop(); this.cuerpo = null; this.flyAbort?.(); this.saltaOff?.(); this.entra = null; this.endReplay(); this.tossOff?.(); this.court.setCuatro?.(false);
    removeEventListener('keydown', this.onKey, true); removeEventListener('keyup', this.onKey, true); removeEventListener('blur', this.onBlur); removeEventListener('pointerup', this.onPtrEnd, true); removeEventListener('pointercancel', this.onPtrEnd, true); removeEventListener('touchend', this.onTouchEnd, true); removeEventListener('touchcancel', this.onTouchEnd, true); document.removeEventListener('visibilitychange', this.onHide);
    this.hud.destroy(); this.court.hideBall();
    if (this.pin) { this.pin.parent?.remove(this.pin); this.pin.geometry.dispose(); this.pin.material.dispose(); this.pin = null; }
    for (const D of Object.values(this.gotas || {})) { for (const q of D.p) { q.s.parent?.remove(q.s); q.s.material.dispose(); } if (D.aviso) { D.aviso.parent?.remove(D.aviso); D.aviso.material.dispose(); } }
    this.gotas = null; for (const k of ['gotaMat', 'sudorMat']) if (this[k]) { this[k].map?.dispose(); this[k].dispose(); this[k] = null; }
    this.tourEl?.remove(); this.tour = null;
    if (this.tourHi) { for (const m of this.tourHi) { m.parent?.remove(m); m.geometry.dispose(); m.children[0]?.geometry.dispose(); } this.tourMat.dispose(); this.tourLine.dispose(); this.tourHi = null; }
    this.court.reboteSeeThrough?.(false, 1);
    for (const r of [this.court.landRing, this.court.spotRing, this.court.serveZone]) r.visible = false;
    if (this.fp) { this.fp.dispose(); this.fp = null; if (this.o.you?.obj) this.o.you.obj.visible = true; if (this.o.you?.sombra && this.sombraVis != null) this.o.you.sombra.visible = this.sombraVis; }
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

