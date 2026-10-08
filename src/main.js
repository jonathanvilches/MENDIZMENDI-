// MENDIMENDIZ · Navarra pueblo a pueblo
// Arranque: centro de mando (hub) + motor 3D que carga cada localidad con sus misiones.
import * as THREE from 'three';
// muchas piezas llaman a toNonIndexed() sobre geometría que ya lo es: three.js devuelve la misma y avisa en la consola
// (decenas de avisos al arrancar). Mismo resultado, sin el aviso.
{ const tni = THREE.BufferGeometry.prototype.toNonIndexed; THREE.BufferGeometry.prototype.toNonIndexed = function () { return this.index === null ? this : tni.call(this); }; }
// tipografías incrustadas: el juego funciona igual sin conexión
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/latin-700-italic.css';   // (la voz del narrador va en cursiva de verdad, no inclinada a la fuerza)
import './hub/hub.css';
import * as HF from './world/heightfield.js';
import * as LAYOUT from './world/layout.js';
import { PLACES } from './world/layout.js';
import { LANDMARKS } from './world/landmarks.js';
import { Runtime } from './engine/runtime.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { Hub } from './hub/hub.js';
import { Game } from './game/game.js';
import { TownGame } from './game/townGame.js';
import { profile, saveProfile, townState, checkBadges, salazarState } from './game/profile.js';
import { levelById, LEVELS } from './data/levels.js';
import { stampImg, townImg } from './assets.js';
import { heroAction } from './hub/diorama.js';
import COMARCAS from './data/comarcas.json';
import { preloadNpcs } from './actors/npcGlb.js';
import { animalsSettled } from './actors/animalGlb.js';
import { preloadFood } from './world/products3d.js';
import { avatarPortrait, portrait } from './ui/portraits.js';
import { releaseOffscreen, setOffscreenHost } from './util/offscreen.js';
import { loadStore, queueMode } from './util/store.js';
import { startI18n, isEU } from './i18n.js';

const q = new URLSearchParams(location.search);
const TIPS = [
  'Sigue la luz dorada: te lleva al siguiente objetivo de tu misión.',
  'Las personas con una exclamación amarilla encima tienen una misión para ti.',
  'Pulsa C para abrir el cuaderno con todas las misiones y sus pasos.',
  'Si corres cerca de los animales se asustan: acércate despacio.',
  'Completa todas las misiones de un pueblo para ganar su sello.',
  'Cuando tengas todos los pueblos de una comarca, se iluminará en el mapa de Navarra.',
];

// ordenador: siempre alta (mejor menos cosas y con calidad); solo sin aceleración gráfica, baja
function desktopTier() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info'), r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) || '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|microsoft basic/i.test(r) ? 'low' : 'high';
  } catch (e) { return 'high'; }
}

// retratos de los vecinos con los que se habla, hechos durante la carga (con el renderizador oculto, que se suelta
// antes de jugar): antes se hacían al abrir cada diálogo y el juego se paraba un momento (en el iPhone, crear ese
// segundo contexto gráfico y compilar sus sombreadores cuesta) y, de paso, había dos contextos a la vez
async function warmPortraits(g, ui) {
  const hosts = new Set((g.missions || []).map(M => M.host).filter(Boolean));
  const list = [...(g.actors || [])].sort((a, b) => (hosts.has(b) ? 1 : 0) - (hosts.has(a) ? 1 : 0));
  const seen = new Set(), t0 = performance.now();
  for (const a of list) {
    const L = a.obj?.userData?.look; if (!L || a.visible === false) continue;
    const k = JSON.stringify(L); if (seen.has(k)) continue; seen.add(k);
    try { portrait(L, 'bust', true); } catch (e) { }
    if (seen.size >= 30 || performance.now() - t0 > 3500) break;
    if (seen.size % 4 === 0) { ui.progress?.(0.97, 'Saludando a los vecinos…'); await new Promise(r => requestAnimationFrame(() => r())); }
  }
  releaseOffscreen();
}

async function boot() {
  startI18n();
  await loadStore();
  const canvas = document.getElementById('c');
  const input = new Input(canvas);
  const sound = new Sound();
  const ui = new UI(input, sound);
  const P = profile();
  // calidad automática: ordenador alta; móvil baja (en iPhone no se puede saber la memoria y Safari cierra la página
  // si se pasa), salvo móviles que dicen tener mucha memoria (6 GB o más), que van en media
  const bigMem = navigator.deviceMemory && navigator.deviceMemory >= 6;
  // en ordenador, una calidad bajada sola (por un fallo de carga o de memoria) no se queda para siempre: se vuelve a
  // la automática una vez (las elegidas a mano en Ajustes se respetan)
  if (!input.touch && (P.settings.qualityAuto || !P.q3)) { P.settings.quality = null; P.settings.qualityAuto = false; P.q3 = true; saveProfile(); }
  const quality = q.get('q') || P.settings.quality || (input.touch ? (bigMem ? 'mid' : 'low') : desktopTier());
  const rt = new Runtime({ canvas, input, sound, quality });
  // retratos, fichas, iconos y figuras del público se dibujan con este mismo renderizador (sin un segundo contexto WebGL)
  setOffscreenHost(rt.renderer);
  // si el dispositivo se queda sin memoria para dibujar (pantalla apagada), la próxima vez arranca con menos calidad
  canvas.addEventListener('webglcontextlost', () => { const S = P.settings, next = { high: 'mid', mid: 'low' }[S.quality || quality]; if (next) { S.quality = next; S.qualityAuto = true; saveProfile(); } });
  canvas.style.visibility = 'hidden';
  window.__renderer = rt.renderer; window.__hf = HF; window.__layout = LAYOUT; window.__THREE = THREE; window.__LANDMARKS = LANDMARKS; window.__rt = rt;

  let game = null, def = null, loading = false;
  const hub = new Hub({ sound, onPlay: (d) => play(d) });
  // campeonatos desde el menú, sin misiones: la pelota en el frontón del pueblo elegido; el fútbol, en su propia escena
  hub.onSport = (kind, townId) => kind === 'futbol' ? futbolSport() : play(levelById(townId) || LEVELS[0], { sport: 'pelota' });
  hub.onSettings = (S) => { sound.setMusic(S.music); sound.setVolume(S.volume); };
  window.__hub = hub;
  // el fútbol, el encierro, los minijuegos 3D de los oficios y Pamplona van en archivos aparte (se cargan al entrar): se descargan
  // sin prisa cuando el navegador está desocupado, así quedan guardados para jugar sin conexión y no esperan al tocarlos
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
  setTimeout(() => idle(() => { import('./game/futbol.js').catch(() => {}); import('./game/encierro.js').catch(() => {}); import('./ui/mini3d/index.js').catch(() => {}); import('./world/pamplona.js').catch(() => {}); }, { timeout: 20000 }), 15000);

  // pasos, saltos y salpicaduras
  const hookPlayer = (player) => {
    player.onStep = (surf, speed, pos) => {
      sound.step(surf, speed);
      if (surf !== 'water') rt.weather?.footprint(pos, player.heading);   // huellas si ha nevado
      if (surf === 'water') rt.particles?.emit({ x: pos.x, y: pos.y + 0.1, z: pos.z }, { n: 6, color: '#dff4ff', speed: 1.6, size: 0.22, life: 0.5, gravity: 6 });
      else if (surf === 'dirt' && speed > 4) rt.particles?.emit({ x: pos.x, y: pos.y + 0.1, z: pos.z }, { n: 2, color: '#b09a78', speed: 0.6, size: 0.35, life: 0.6, gravity: -0.2 });
    };
    player.onJump = () => sound.jump();
    player.onLand = (v) => sound.land(v);
    player.onSplash = (p, v) => sound.splash(p, v);
  };

  async function play(d, opt = {}) {
    if (loading) return;
    loading = true;
    sound.init();
    def = d;
    hub.hide(); queueMode('off');
    const cm = COMARCAS.find(c => c.id === d.comarca);
    const TI = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz', summit: 'peak', pelota: 'pelota', figure: 'person', feria: 'cow', dolmen: 'dolmen', castle: 'castle', mirador: 'binoculars' };
    // (al campeonato de pelota se va a jugar: sin la historia del pueblo ni sus misiones en la pantalla de carga)
    ui.showLoading(opt.sport ? `${isEU() ? 'Esku pilota' : 'Pelota a mano'} · ${d.name.split(' /')[0]}` : d.name, opt.sport ? (isEU() ? 'Frontoia prestatzen…' : 'Preparando el frontón…') : TIPS[Math.floor(Math.random() * TIPS.length)], townImg(d), { hero: heroAction(P.avatar, d.id), comarca: cm?.name, stamp: stampImg(d.comarca, d.name.split(' /')[0]), avatar: avatarPortrait(P.avatar), intro: opt.sport ? '' : d.intro, missions: opt.sport ? [] : (d.missions || []).map(m => m.icon || TI[m.type] || 'star') });
    try {
      const npcP = preloadNpcs(); await preloadFood(); await Promise.all([rt.load(d, P.avatar, (p, m) => ui.progress(p, m)), npcP]);
      const ctx = { scene: rt.scene, camera: rt.camera, player: rt.player, follow: rt.follow, ui, sound, input, sky: rt.sky, fauna: rt.fauna, particles: rt.particles, beacon: rt.beacon, rt, onExit: exit };
      hookPlayer(rt.player);
      if (d.special === 'salazar') {
        game = new Game(ctx);
        game.onExit = exit;
        game.kind = 'salazar';
        window.__game = game;
        ui.buildHUD(game);
        game.spawn();
        await animalsSettled();   // los animales del pueblo (cada uno baja su modelo al aparecer)
        const st = game.state;
        st.name = P.name || st.name; st.started = true;
        rt.sky.time = q.get('t') ? +q.get('t') : (st.time ?? 9.3);
        game.applySettings();
        await rt.precompile();
        if (st.pos && st.introDone) rt.player.place(st.pos.x, st.pos.z, st.pos.h);
        else rt.player.place(PLACES.crucero.x - 2, PLACES.crucero.z + 5, Math.PI * 0.9);
        rt.follow.snap(rt.player);
        ui.progress(1, '¡Listo!');
        rt.start(game);
        ui.hideLoading(); queueMode('light');
        sound.setMusic(P.settings.music); sound.setVolume(P.settings.volume);
        if (!st.introDone && !q.get('skipintro')) await game.intro();
        else { ui.hudVisible(true); game.mode = 'play'; }
      } else {
        game = new TownGame(ctx, d);
        game.onPlayTown = (id) => { exit(); setTimeout(() => play(levelById(id)), 60); };
        window.__game = game;
        ui.buildHUD(game);
        game.spawn();
        await animalsSettled();   // los animales del pueblo (cada uno baja su modelo al aparecer)
        rt.sky.time = q.get('t') ? +q.get('t') : 10;
        game.applySettings();
        await warmPortraits(game, ui);
        await rt.precompile();
        ui.progress(1, '¡Listo!');
        rt.start(game);
        ui.hideLoading(); queueMode('light');
        saveProfile();
        if (opt.resumeAt) { rt.player.place(opt.resumeAt.x, opt.resumeAt.z, opt.resumeAt.h ?? 0); rt.follow.snap(rt.player); }
        if (opt.sport) { loading = false; game.sportOnly(); return; }
        if (opt.resumed) { const g = game; setTimeout(() => { if (g && g === game) g.ui.toast('Imagen recuperada: sigues donde estabas', 'exclaim', 3600); }, 700); }
        else { const g = game; setTimeout(() => { if (g && g === game) g.ui.toast(`¡Ya estás en ${d.name}! Habla con ${g.missions[0]?.host?.name || 'tu guía'}`, 'exclaim', 4200); }, 700); }
      }
    } catch (e) {
      // antes se volvía al menú sin decir nada («me saca del juego»): ahora se avisa, y si no estaba ya en calidad
      // baja se guarda la baja para el siguiente intento
      console.error(e);
      ui.hideLoading(); loading = false; queueMode('all');
      try { rt.unload(); } catch (e2) { }
      const S = P.settings, lowered = (S.quality || rt.quality) !== 'low';
      if (lowered) { S.quality = 'low'; S.qualityAuto = true; saveProfile(); }
      hub.show('home');
      showLoadError(d, e, lowered);
      return;
    }
    loading = false;
  }

  // Campeonato de fútbol desde el menú, sin entrar en un pueblo: el partido tiene su propia escena y se dibuja con el
  // mismo renderizador (sin un segundo WebGL). Entre partido y partido, de fondo, una escena vacía bajo los menús
  async function futbolSport() {
    if (loading || game) return;
    loading = true; sound.init(); hub.hide(); queueMode('off');
    const blank = new THREE.Scene(); blank.background = new THREE.Color('#1e1830');
    const cam = new THREE.PerspectiveCamera();
    let alt = null, altCam = null;
    // fundido propio (el del interfaz del pueblo se crea con su marcador, que aquí no hay)
    const fade = document.createElement('div'); fade.style.cssText = 'position:fixed;inset:0;z-index:29999;background:#000;opacity:0;pointer-events:none;transition:opacity .45s';
    document.body.appendChild(fade);
    const pause = (ms) => new Promise(r => setTimeout(r, ms));
    const gui = Object.create(ui); gui.fadeOut = async () => { fade.style.opacity = '1'; await pause(480); }; gui.fadeIn = async () => { fade.style.opacity = '0'; await pause(320); };
    const G = { mode: 'menu', ui: gui, sound, input, rt, player: { frozen: false }, follow: null, altUpdate: null,
      get altScene() { return alt || blank; }, set altScene(v) { alt = v; }, get altCamera() { return altCam || cam; }, set altCamera(v) { altCam = v; } };
    const ownScene = !rt.scene; if (ownScene) rt.scene = blank;
    try {
      const [{ Futbol }, { CLUBS, teamOfClub }, { season, clubPick, clubPanel }, { addXP }] = await Promise.all([import('./game/futbol.js'), import('./futbol/clubs.js'), import('./futbol/liga.js'), import('./game/profile.js')]);
      rt.start(G); loading = false; game = null;
      let club = CLUBS[P.futbolClub] ? P.futbolClub : null;
      for (;;) {
        if (!club) { club = await clubPick(); if (!club) break; P.futbolClub = club; saveProfile(); }
        const S = season(club), C = CLUBS[club];
        const items = [['liga', S.j < S.rounds.length ? `Liga Navarra · jornada ${S.j + 1}` : 'Liga Navarra · nueva temporada', 'Contra los clubes de tu grupo'],
          ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['sadar', 'Partido en El Sadar', 'En el estadio de Iruña'], ['club', 'Cambiar de club', C.name], ['exit', 'Salir', '']];
        const pick = await clubPanel(club, items, 'Campeonato de fútbol');
        if (pick === 'exit') break;
        if (pick === 'club') { club = null; continue; }
        const fut = new Futbol(G, null, {});   // (un solo fútbol: ya no hay fútbol sala)
        if (pick === 'liga') { const r = await fut.liga(club); if (!r.quit && r.win) addXP(30); }
        else if (pick === 'amistoso') await fut.friendly(club);
        else if (pick === 'sadar') await fut.match(undefined, 'normal', 3);
      }
    } catch (e) { console.error('[fútbol] campeonato', e); }
    finally {
      document.querySelectorAll('.lg-root').forEach(r => r.remove()); fade.remove();
      rt.active = false; rt.game = null; if (ownScene && rt.scene === blank) rt.scene = null;
      canvas.style.visibility = 'hidden'; loading = false;
      queueMode('all'); hub.show('sports');   // (de vuelta a Torneos, de donde se vino)
    }
  }
  window.__futbolSport = futbolSport;

  // aviso cuando no se ha podido entrar en un pueblo: qué ha pasado (para poder contarlo) y botón para reintentar
  function showLoadError(d, e, lowered) {
    document.querySelector('.loaderr')?.remove();
    const o = document.createElement('div'); o.className = 'mg-overlay loaderr';
    const msg = String(e?.message || e).slice(0, 160).replace(/[<>&]/g, '');
    o.innerHTML = `<div class="mg-card"><h3>No se ha podido entrar en ${d.name.split(' /')[0]}</h3><p>${lowered ? 'El dispositivo se ha quedado corto. Hemos bajado la calidad gráfica para que funcione: vuelve a intentarlo.' : 'Ha ocurrido un problema al cargar el pueblo.'}</p><p class="hint">Detalle: ${msg}</p><button class="btn primary">${lowered ? 'Volver a cargar' : 'Cerrar'}</button></div>`;
    o.querySelector('button').onclick = () => { if (lowered) location.reload(); else o.remove(); };
    document.body.appendChild(o);
  }

  function exit(to) {
    if (!game) return;
    try { game.save?.(); } catch (e) { }
    // el valle de Salazar completo cuenta como sello
    if (def?.special === 'salazar') { const s = salazarState(); if (s?.done) { townState(P, def.id).stamp = true; checkBadges(); saveProfile(); } }
    game.dispose?.();
    ui.destroyHUD(); ui.setCinematic(false);
    rt.unload();
    // (que nada siga apuntando al pueblo que se deja: si no, se queda en memoria mientras se carga el siguiente)
    if (window.__game === game) window.__game = null;
    if (ui.game === game) ui.game = null;
    game = null;
    // (desde un campeonato, de vuelta a Torneos, de donde se vino)
    queueMode('all'); if (to === 'home' || to === 'sports') hub.show(to); else hub.show('comarca', def?.comarca);
  }
  window.__exit = exit;
  // memoria gráfica perdida (en el iPhone, al volver de otra aplicación o con poca memoria): si el navegador la
  // devuelve, se rehace el pueblo en el que estabas (las geometrías del pueblo sueltan su copia tras subirlas a la
  // tarjeta, así que no se pueden volver a subir tal cual); si no vuelve, el botón recarga y entra en el mismo pueblo
  rt.onContextRestored = () => {
    if (!game || !def || loading) return;
    // pelota (el menú, el torneo, un partido preparándose o en juego): se rehace el pueblo y se vuelve a la puerta del
    // frontón, con el menú de pelota si venías de Campeonatos. Antes se volvía a la llegada del pueblo y el partido que
    // se estaba preparando ponía sus controles encima («me ha llevado al inicio del juego con los controles del partido»)
    const pelota = game.fronton && (game.mode === 'pelota' || game.pelotaLoading || game.pelotaMatch || game.sportMode || document.querySelector('.pel-root, .lg-root'));
    // en mitad de un minijuego, el encierro o un diálogo es más seguro recargar y volver al mismo pueblo
    if (!pelota && (game.mode !== 'play' || game.altScene || ui.dialogOpen || document.querySelector('.mg-overlay:not(.ctxlost), .fb-root'))) { rt.onReload(); return; }
    const d = def, F = game.fronton, pp = rt.player?.pos;
    const resumeAt = pelota ? (() => { const e = F.entry, c = F.out || F.toWorld(0, 12); return { x: e.x, z: e.z, h: Math.atan2(c.x - e.x, c.z - e.z) }; })() : pp ? { x: pp.x, z: pp.z, h: rt.player.heading } : null;
    const sport = game.sportMode ? 'pelota' : undefined;
    try { game.save?.(); } catch (e) { }
    try { game.dispose?.(); } catch (e) { }
    ui.destroyHUD(); ui.setCinematic(false);
    try { rt.unload(); } catch (e) { }
    game = null;
    play(d, { resumeAt, sport, resumed: true });   // (donde estabas, y no en la llegada del pueblo)
  };
  rt.onReload = () => {
    try { game?.save?.(); } catch (e) { }
    try { if (game && def) sessionStorage.setItem('mendimendiz-volver', def.id); } catch (e) { }
    location.reload();
  };

  addEventListener('visibilitychange', () => { if (document.hidden) { try { game?.save(); } catch (e) { } } });
  addEventListener('pagehide', () => { try { game?.save(); } catch (e) { } });

  // parámetros de prueba: ?town=olite (&autostart)
  let back = null; try { back = sessionStorage.getItem('mendimendiz-volver'); sessionStorage.removeItem('mendimendiz-volver'); } catch (e) { }
  const t = q.get('town') || back;
  if (t && levelById(t)) { if (!P.name) { P.name = 'Mendi'; saveProfile(); } play(levelById(t)); }
  else {
    hub.show(q.get('screen') || 'home', q.get('arg') || undefined);
  }
  window.__ready = true;
}

// versión web: el service worker guarda lo descargado (la segunda vez carga al momento y funciona sin conexión)
if (typeof __WEB__ !== 'undefined' && __WEB__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('service worker', e)));
}
boot().catch(e => {
  console.error(e);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#1e1830;color:#fff;font:600 18px system-ui;padding:24px;text-align:center;z-index:99';
  d.innerHTML = `<div><p>No se ha podido cargar el juego en este dispositivo.</p><p style="color:#d9ccb8;font-size:14px">${String(e.message || e)}</p><p style="color:#d9ccb8;font-size:14px">Prueba a recargar o a usar un navegador actualizado con WebGL.</p></div>`;
  document.body.appendChild(d);
});
