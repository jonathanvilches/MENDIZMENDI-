// HERRIZHERRI · Navarra pueblo a pueblo
// Arranque: centro de mando (hub) + motor 3D que carga cada localidad con sus misiones.
import './util/migra.js';   // (lo primero: lo guardado con el nombre de antes pasa al de ahora)
import './util/tactil.js';   // (<html class="tactil"> en el móvil y la tableta: los controles de pantalla)
import './util/tele.js';   // (en una pantalla grande, la interfaz crece con ella)
import * as THREE from 'three';
// muchas piezas llaman a toNonIndexed() sobre geometría que ya lo es: three.js devuelve la misma y avisa en la consola
// (decenas de avisos al arrancar). Mismo resultado, sin el aviso.
{ const tni = THREE.BufferGeometry.prototype.toNonIndexed; THREE.BufferGeometry.prototype.toNonIndexed = function () { return this.index === null ? this : tni.call(this); }; }
// tipografías incrustadas: el juego funciona igual sin conexión
// (Lilita One y Nunito 600, 700, 800, 900 y 700 cursiva, la voz del narrador: src/ui/fonts.css, solo en WOFF2)
import './ui/fonts.css';
import './hub/hub.css';
import './ui/sport.css';
import './ui/infocard.css';
import * as HF from './world/heightfield.js';
import * as LAYOUT from './world/layout.js';
import { PLACES } from './world/layout.js';
import { esc } from './util/html.js';
import { vueloPueblo } from './game/llegadas.js';
import { LANDMARKS } from './world/landmarks.js';
import { Runtime } from './engine/runtime.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { vigilaEncaje } from './ui/encaje.js';
import { Hub } from './hub/hub.js';
import { isDidactico } from './util/modo.js';
import { Game } from './game/game.js';
import { TownGame } from './game/townGame.js';
import { profile, saveProfile, townState, checkBadges, salazarState, townProgress } from './game/profile.js';
import { missionSlots, edadDe } from './data/edad.js';
import { levelById, LEVELS } from './data/levels.js';
import { townImg } from './assets.js';
import { armsReady } from './ui/escudoImg.js';
import { armsOfTown } from './data/armas-navarra.js';
import { laminaUrl, laminaById } from './ui/laminas.js';
import COMARCAS from './data/comarcas.json';
import { preloadNpcs } from './actors/npcGlb.js';
import { animalsSettled } from './actors/animalGlb.js';
import { preloadFood } from './world/products3d.js';
import { avatarPortrait, portrait } from './ui/portraits.js';
import { releaseOffscreen, setOffscreenHost } from './util/offscreen.js';
import { loadStore, queueMode } from './util/store.js';
import { startI18n, isEU } from './i18n.js';
import { startVerMas } from './ui/vermas.js';
import { startFrames } from './ui/frames.js';
import { watchUpdates } from './web/update.js';
import { startHD } from './web/hd.js';

const q = new URLSearchParams(location.search);
const TIPS = [
  'Sigue la luz dorada: te lleva al siguiente objetivo de tu misión.',
  'Las personas con una exclamación amarilla encima tienen una misión para ti.',
  'Pulsa C para abrir el cuaderno con todas las misiones y sus pasos.',   // (en pantalla táctil, TIP_TOQUE)
  'Si corres cerca de los animales se asustan: acércate despacio.',
  'Completa todas las misiones de un pueblo para ganar su sello.',
  'Cuando tengas todos los pueblos de una comarca, se iluminará en el mapa de Navarra.',
];
const TIP_TOQUE = 'Toca el cuaderno, arriba a la derecha, para ver todas las misiones y sus pasos.';
// el icono de cada misión en la pantalla de carga (si la misión no trae el suyo)
const MISSION_ICON = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz', summit: 'peak', pelota: 'pelota', figure: 'person', feria: 'cow', dolmen: 'dolmen', castle: 'castle', mirador: 'binoculars' };

// ordenador: alta con una tarjeta gráfica de verdad; media con la gráfica del procesador (Intel, las Radeon de los
// procesadores AMD, GeForce MX), con pocos núcleos o si en este ordenador el juego ya tuvo que aligerarse solo
// (runtime.lighten: slow); sin aceleración gráfica, baja. En alta, esos portátiles se quedaban en 15-20 imágenes por
// segundo y se paraban
function desktopTier(slow) {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info'), r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) || '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    if (/swiftshader|llvmpipe|software|microsoft basic/i.test(r)) return 'low';
    const igpu = /intel|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|radeon(\(tm\))? \d{3}m\b|geforce mx/i.test(r) && !/arc(\(tm\))? a\d/i.test(r);
    return slow || igpu || (navigator.hardwareConcurrency || 8) <= 4 ? 'mid' : 'high';
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
  await startI18n();   // (en euskera, espera a sus diccionarios: se cargan aparte)
  startVerMas(); startFrames();   // (los textos largos, plegados con «Ver más»)
  startHD();   // (archivo único con conexión: las imágenes grandes, de la web publicada)
  // (con tope de 2,5 s: en algunos visores de iPhone la base de datos del navegador no responde nunca)
  await Promise.race([loadStore(), new Promise(r => setTimeout(r, 2500))]);
  const canvas = document.getElementById('c');
  const input = new Input(canvas);
  const sound = new Sound();
  const ui = new UI(input, sound);
  vigilaEncaje();   // (ninguna palabra partida ni cortada con «…»: src/ui/encaje.js)
  const P = profile();
  // calidad automática: ordenador alta; móvil baja (en iPhone no se puede saber la memoria y Safari cierra la página
  // si se pasa), salvo móviles que dicen tener mucha memoria (6 GB o más), que van en media
  const bigMem = navigator.deviceMemory && navigator.deviceMemory >= 6;
  // en ordenador, una calidad bajada sola (por un fallo de carga o de memoria) no se queda para siempre: se vuelve a
  // la automática una vez (las elegidas a mano en Ajustes se respetan)
  if (!input.touch && (P.settings.qualityAuto || !P.q3)) { P.settings.quality = null; P.settings.qualityAuto = false; P.q3 = true; saveProfile(); }
  const quality = q.get('q') || P.settings.quality || (input.touch ? (bigMem ? 'mid' : 'low') : desktopTier(P.settings.slowPc));
  const rt = new Runtime({ canvas, input, sound, quality });
  // si el ordenador no llega a la fluidez mínima, el juego se aligera solo (runtime.lighten): se avisa una vez y se
  // apunta para arrancar la próxima vez en calidad media (si la calidad se eligió a mano en Ajustes, se respeta)
  rt.onLighten = (n) => {
    const S = P.settings;
    if (!input.touch && !S.quality && !q.get('q') && !S.slowPc) { S.slowPc = true; saveProfile(); }
    if (n === 1) game?.ui?.toast?.(isEU() ? 'Irudia arindu dugu jokoa arin ibil dadin' : 'Imagen aligerada para que el juego vaya fluido', 'exclaim', 3600);
  };
  // retratos, fichas, iconos y figuras del público se dibujan con este mismo renderizador (sin un segundo contexto WebGL)
  setOffscreenHost(rt.renderer);
  // si el dispositivo se queda sin memoria para dibujar (pantalla apagada), la próxima vez arranca con menos calidad
  canvas.addEventListener('webglcontextlost', () => { const S = P.settings, next = { high: 'mid', mid: 'low' }[S.quality || quality]; if (next) { S.quality = next; S.qualityAuto = true; saveProfile(); } });
  canvas.style.visibility = 'hidden';
  window.__renderer = rt.renderer; window.__hf = HF; window.__layout = LAYOUT; window.__THREE = THREE; window.__LANDMARKS = LANDMARKS; window.__rt = rt;

  let game = null, def = null, loading = false;
  const hub = new Hub({ sound, onPlay: (d) => play(d) });
  // campeonatos desde el menú, sin misiones: la pelota en el frontón del pueblo elegido; el fútbol, en su propia escena
  hub.onSport = (kind, townId) => kind === 'futbol' ? futbolSport() : play(levelById(townId) || LEVELS[0], { sport: kind === 'pasaka' ? 'pasaka' : 'pelota' });
  hub.onSettings = (S) => { sound.setMusic(S.music); sound.setVolume(S.volume); };
  // el tema de inicio (audio.js, INICIO) suena en el menú: desde el primer toque o tecla (antes, el navegador no deja
  // sonar nada) y al volver de un pueblo o de un campeonato (exit y futbolSport). En los pueblos y en los partidos, la
  // música la elige runtime.js según lo que pasa
  sound.setMood('inicio');
  { const first = () => { removeEventListener('pointerup', first, true); removeEventListener('keydown', first, true); if (!game && !loading) sound.init(); };
    addEventListener('pointerup', first, true); addEventListener('keydown', first, true); }
  window.__hub = hub;
  // el fútbol, el encierro, los minijuegos 3D de los oficios y Pamplona van en archivos aparte (se cargan al entrar): se descargan
  // sin prisa cuando el navegador está desocupado, así quedan guardados para jugar sin conexión y no esperan al tocarlos
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
  // (en el modo didáctico no se juega: no hace falta)
  if (!isDidactico()) setTimeout(() => idle(() => { import('./game/futbol.js').catch(() => {}); import('./game/encierro.js').catch(() => {}); import('./ui/mini3d/index.js').catch(() => {}); import('./world/pamplona.js').catch(() => {}); }, { timeout: 20000 }), 15000);

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
    queueMode('off');
    const cm = COMARCAS.find(c => c.id === d.comarca), eu = isEU(), pasaka = opt.sport === 'pasaka';
    // (al campeonato de pelota se va a jugar: sin la historia del pueblo ni sus misiones en la pantalla de carga)
    const title = pasaka ? 'Pasaka · Iruña' : opt.sport ? `${eu ? 'Esku pilota' : 'Pelota a mano'} · ${d.name.split(' /')[0]}` : d.name;
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    const sub = pasaka ? (eu ? 'Klaustroa prestatzen…' : 'Preparando el claustro…') : opt.sport ? (eu ? 'Frontoia prestatzen…' : 'Preparando el frontón…') : input.touch && tip.startsWith('Pulsa C') ? TIP_TOQUE : tip;
    const lam = opt.sport ? 'dep-fronton' : d.id, left = (pr => Math.max(0, pr.total - pr.done))(townProgress(P, d));
    ui.showLoading(title, sub, (opt.sport && laminaUrl('dep-fronton')) || townImg(d), {
      comarca: cm?.name, caption: laminaUrl(lam) ? laminaById(lam).title : '', avatar: avatarPortrait(P.avatar),
      intro: opt.sport ? '' : d.intro, missions: opt.sport ? [] : missionSlots(d, edadDe(P)).map(({ m }) => m.icon || MISSION_ICON[m.type] || 'star'), left: opt.sport ? 0 : left,
    });
    // (el menú se queda debajo mientras la pantalla de carga entra con su fundido, y luego se va)
    const fueraHub = setTimeout(() => hub.hide(), 320);
    try {
      // (el escudo del pueblo, y el de Pamplona del Labrit, con su acabado: listos antes de montar la plaza y el frontón)
      await Promise.all([armsReady(armsOfTown(d.id)?.id), armsReady('pamplona')]);
      // (en los campeonatos, los mensajes de la carga hablan del frontón, no de plantar árboles ni de saludar a los vecinos)
      const sportMsg = (p) => pasaka ? (eu ? 'Klaustroa prestatzen…' : 'Preparando el claustro…') : p < 0.3 ? (eu ? 'Frontoia irekitzen…' : 'Abriendo el frontón…') : p < 0.6 ? (eu ? 'Kantxa prestatzen…' : 'Preparando la cancha…') : p < 0.9 ? (eu ? 'Harmailak betetzen…' : 'Llenando la grada…') : (eu ? 'Pilotariak berotzen…' : 'Calentando a los pelotaris…');
      const npcP = preloadNpcs(); await preloadFood(); await Promise.all([rt.load(d, P.avatar, (p, m) => ui.progress(p, opt.sport ? sportMsg(p) : m)), npcP]);
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
        if (!st.introDone && !q.get('skipintro')) await game.intro(d);
        else {   // (las siguientes veces, la llegada: el vuelo por encima de Otsagabia con su nombre y su comarca)
          if (!q.get('skipintro')) { game.mode = 'cine'; rt.player.frozen = true; const g0 = game;
            await vueloPueblo({ follow: rt.follow, player: rt.player, ui, def: d, centro: PLACES.crucero, iglesia: PLACES.church }).catch(e => console.warn('llegada', e));
            if (game !== g0) { loading = false; return; }   // (se salió del pueblo durante el vuelo: lo de después ya no es de este)
            rt.follow.snap(rt.player); rt.player.frozen = false; }
          ui.hudVisible(true); game.mode = 'play';
        }
      } else {
        game = new TownGame(ctx, d);
        game.onPlayTown = (id) => { exit(); setTimeout(() => play(levelById(id)), 60); };
        window.__game = game;
        ui.buildHUD(game);
        game.spawn();
        await animalsSettled();   // los animales del pueblo (cada uno baja su modelo al aparecer)
        rt.sky.time = q.get('t') ? +q.get('t') : 10;
        game.applySettings();
        if (!opt.sport) await warmPortraits(game, ui);   // (en los campeonatos no se habla con nadie: sin retratos)
        await rt.precompile();
        ui.progress(1, '¡Listo!');
        rt.start(game);
        ui.hideLoading(); queueMode('light');
        saveProfile();
        if (opt.resumeAt) { rt.player.place(opt.resumeAt.x, opt.resumeAt.z, opt.resumeAt.h ?? 0); rt.follow.snap(rt.player); }
        if (opt.sport) { loading = false; if (opt.sport === 'pasaka') game.pasakaOnly(); else game.sportOnly(); return; }
        if (opt.resumed) { const g = game; setTimeout(() => { if (g && g === game) g.ui.toast('Imagen recuperada: sigues donde estabas', 'exclaim', 3600); }, 700); }
        else {   // (primero, la llegada: el vuelo por encima del pueblo con su nombre y su comarca; luego, a quién buscar)
          const g = game; (q.get('skipintro') ? Promise.resolve() : g.llegada()).catch(e => console.warn('llegada', e))
            .then(() => setTimeout(() => { if (g && g === game) g.ui.toast(`¡Ya estás en ${d.name}! Habla con ${g.missions[0]?.host?.name || 'tu guía'}`, 'exclaim', 4200); }, 300));
        }
      }
    } catch (e) {
      // antes se volvía al menú sin decir nada («me saca del juego»): ahora se avisa, y si no estaba ya en calidad
      // baja se guarda la baja para el siguiente intento
      console.error(e);
      ui.hideLoading(); loading = false; queueMode('all');
      try { rt.unload(); } catch (e2) { }
      const S = P.settings, lowered = (S.quality || rt.quality) !== 'low';
      if (lowered) { S.quality = 'low'; S.qualityAuto = true; saveProfile(); }
      clearTimeout(fueraHub); hub.show('home');
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
    const fade = document.createElement('div'); fade.className = 'fundido'; fade.style.cssText = 'position:fixed;inset:0;z-index:29999;opacity:0;pointer-events:none;transition:opacity .45s';
    document.body.appendChild(fade);
    const pause = (ms) => new Promise(r => setTimeout(r, ms));
    // (con mensaje, como el del pueblo: el fondo de los deportes con la pelota que bota, en vez del negro)
    const gui = Object.create(ui); gui.fadeOut = async (msg = '') => { fade.innerHTML = msg ? `<div class="fade-msg"><i></i><span>${esc(msg)}</span></div>` : ''; fade.classList.toggle('msg', !!msg); fade.style.opacity = '1'; await pause(480); };
    // (si entre tanto empieza otro fundido, su mensaje se queda: como el fadeIn de ui.js)
    gui.fadeIn = async () => { fade.style.opacity = '0'; await pause(320); if (fade.style.opacity === '0') { fade.classList.remove('msg'); fade.innerHTML = ''; } };
    const G = { mode: 'menu', ui: gui, sound, input, rt, player: { frozen: false }, follow: null, altUpdate: null,
      get altScene() { return alt || blank; }, set altScene(v) { alt = v; }, get altCamera() { return altCam || cam; }, set altCamera(v) { altCam = v; } };
    const ownScene = !rt.scene; if (ownScene) rt.scene = blank;
    try {
      const [{ Futbol }, { CLUBS }, { season, clubPick, clubPanel }, { addXP }] = await Promise.all([import('./game/futbol.js'), import('./futbol/clubs.js'), import('./futbol/liga.js'), import('./game/profile.js')]);
      rt.start(G); loading = false; game = null;
      let club = CLUBS[P.futbolClub] ? P.futbolClub : null, prev = null;
      for (;;) {
        // (al cambiar de club, «Volver» deja el que tenías)
        if (!club) { const c = await clubPick(prev); if (!c) { if (!prev) break; club = prev; } else { club = c; P.futbolClub = club; saveProfile(); } }
        const S = season(club), C = CLUBS[club];
        const items = [['liga', 'Liga Navarra', 'Contra los clubes de tu grupo', S.j < S.rounds.length ? `Jornada ${S.j + 1} de ${S.rounds.length}` : 'Nueva temporada'],
          ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['sadar', 'Partido rápido', 'Iruña contra el visitante'], ['club', 'Cambiar de club', C.name], ['exit', 'Salir', '']];
        const pick = await clubPanel(club, items, 'Campeonato de fútbol');
        if (pick === 'exit') break;
        if (pick === 'club') { prev = club; club = null; continue; }
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
      sound.setMood('inicio'); queueMode('all'); hub.show('sports');   // (de vuelta a Torneos, de donde se vino)
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

  function exit(to, luego = null) {
    if (!game) return;
    try { game.save?.(); } catch (e) { }
    // el valle de Salazar completo cuenta como sello
    if (def?.special === 'salazar') { const s = salazarState(); if (s?.done) { townState(P, def.id).stamp = true; checkBadges(); saveProfile(); } }
    // (cada paso por su cuenta: si soltar el pueblo falla, se vuelve al menú igual; antes la imagen se quedaba
    // congelada con el aviso de error encima)
    try { game.dispose?.(); } catch (e) { console.error('[salir]', e); (window.__errors ||= []).push('salir'); }
    try { ui.destroyHUD(); ui.setCinematic(false); } catch (e) { console.error('[salir]', e); }
    try { rt.unload(); } catch (e) { console.error('[salir]', e); (window.__errors ||= []).push('salir'); rt.active = false; rt.game = null; canvas.style.visibility = 'hidden'; }
    // (que nada siga apuntando al pueblo que se deja: si no, se queda en memoria mientras se carga el siguiente)
    if (window.__game === game) window.__game = null;
    if (ui.game === game) ui.game = null;
    game = null;
    // (desde un campeonato, de vuelta a Torneos, de donde se vino; y en el menú, su tema)
    sound.setMood('inicio'); queueMode('all'); if (to === 'home' || to === 'sports' || to === 'pasaka') hub.show(to); else hub.show('comarca', def?.comarca);
    // (desde el menú de pelota de Campeonatos, a jugar en el frontón de otro pueblo: se carga ese pueblo)
    if (luego?.pelota && levelById(luego.pelota)) setTimeout(() => play(levelById(luego.pelota), { sport: 'pelota' }), 60);
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
    try { if (game && def) sessionStorage.setItem('herrizherri-volver', def.id); } catch (e) { }
    location.reload();
  };

  addEventListener('visibilitychange', () => { if (document.hidden) { try { game?.save(); } catch (e) { } } });
  addEventListener('pagehide', () => { try { game?.save(); } catch (e) { } });

  // parámetros de prueba: ?town=olite (&autostart)
  let back = null; try { back = sessionStorage.getItem('herrizherri-volver'); sessionStorage.removeItem('herrizherri-volver'); } catch (e) { }
  const t = q.get('town') || back;
  if (t && levelById(t) && isDidactico()) hub.show('pueblo', t);   // (en el modo didáctico, su página)
  else if (t && levelById(t)) { if (!P.name) { P.name = 'Iñigo'; saveProfile(); } play(levelById(t)); }
  else {
    hub.show(q.get('screen') || 'home', q.get('arg') || undefined);
  }
  window.__ready = true;
}

// versión web: el service worker guarda lo descargado (la segunda vez carga al momento y funciona sin conexión)
if (typeof __WEB__ !== 'undefined' && __WEB__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('service worker', e)));
  watchUpdates();
}
boot().catch(e => {
  console.error(e);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#1e1830;color:#fff;font:600 18px system-ui;padding:24px;text-align:center;z-index:99';
  d.innerHTML = `<div><p>No se ha podido cargar el juego en este dispositivo.</p><p style="color:#cbc2e0;font-size:14px">${String(e.message || e)}</p><p style="color:#cbc2e0;font-size:14px">Prueba a recargar o a usar un navegador actualizado con WebGL.</p></div>`;
  document.body.appendChild(d);
});
