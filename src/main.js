// HERRIZHERRI · Navarra pueblo a pueblo
// Arranque: centro de mando (hub) + motor 3D que carga cada localidad con sus misiones.
import './util/migra.js';   // (lo primero: lo guardado con el nombre de antes pasa al de ahora)
import './util/tactil.js';   // (<html class="tactil"> en el móvil y la tableta: los controles de pantalla)
import './util/tele.js';   // (en una pantalla grande, la interfaz crece con ella)
import './util/giro.js';   // (al girar el móvil, se vuelve a medir la pantalla hasta que da la medida nueva)
import './util/fantasma.js';   // (los clics fantasma del móvil: el clic de un toque no cae en lo que aparece al levantar el dedo)
import './util/informe.js';   // (en el artefacto de claude.ai, el informe en directo para Claude: errores y fluidez)
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
import { profile, saveProfile, townState, checkBadges, salazarState, townProgress } from './game/profile.js';
import { missionSlots, edadDe } from './data/edad.js';
import { levelById, LEVELS, sedeDePueblo, esExterior } from './data/levels.js';
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
import { startVercel } from './web/vercel.js';
import { sencillo } from './util/sencillo.js';
import { apuntaPerdida } from './util/diag.js';
import { calidadOrdenador, apuntaGpu, fijaCalidad, gpuNombre } from './util/gpu.js';

const q = new URLSearchParams(location.search);
// el código de jugar en los pueblos (Otsagabia y los demás, con la pelota, las misiones y los minijuegos) va en archivos
// aparte: el menú arranca sin él, se descarga cuando el navegador está desocupado (más abajo, idle) y, si aún no está, al
// entrar en un pueblo, mientras se monta (antes iba todo en el archivo principal, 2,8 MB)
const juego = () => Promise.all([import('./game/game.js'), import('./game/townGame.js')]);
const TIPS = [
  'Sigue la luz dorada: te lleva al siguiente objetivo de tu misión.',
  'Las personas con una exclamación amarilla encima tienen una misión para ti.',
  'Pulsa C para abrir el cuaderno con todas las misiones y sus pasos.',   // (en pantalla táctil, TIP_TOQUE)
  'Si corres cerca de los animales se asustan: acércate despacio.',
  'Completa todas las misiones de un pueblo para ganar su sello.',
  'Cuando tengas todos los pueblos de una comarca, se iluminará en el mapa de Navarra.',
];
const TIP_TOQUE = 'Toca el cuaderno, arriba a la derecha, para ver todas las misiones y sus pasos.';
// el «¿Sabías que…?» de la carga de un partido de pelota: un dato de la historia de la pelota a mano, y no lo que se está
// preparando (antes salía «Preparando el frontón…» como si fuera un dato). Comprobados en octubre de 2026: el récord y las
// txapelas de Julián Retegi (Noticias de Navarra, Deia), el Labrit (Ayuntamiento de Pamplona), los Juegos Olímpicos (COI y
// Universidad de Navarra) y la pelota (Dialnet). Y en la pasaka, los de su ficha (data/pasaka.js, con sus fuentes)
const DATOS_PELOTA = {
  es: ['Julián Retegi, de Eratsun, es quien más Manomanistas ha ganado: once txapelas.',
    'El primer campeonato del Cuatro y Medio se jugó en 1989, y lo ganó Julián Retegi.',
    'En 1990, Julián Retegi ganó las tres txapelas del año: el Manomanista, el de Parejas y el del Cuatro y Medio.',
    'El frontón Labrit de Iruña se construyó en 1952. Lo llaman «la Bombonera» y ha acogido dos Mundiales de pelota, en 1962 y en 2002.',
    'La pelota vasca estuvo en los Juegos Olímpicos de 1924, 1968 y 1992 como deporte de exhibición. En México 1968 también se jugó a mano.',
    'La pelota de mano mide unos 6 centímetros y pesa alrededor de 100 gramos: por dentro, un núcleo y capas de hilo; por fuera, cuero cosido a mano.',
    'En muchos pueblos el frontón está en la plaza, junto a la iglesia: antiguamente se jugaba contra sus muros.',
    'La pelota a mano viene del juego de pelota de la Edad Media, el mismo del que salió el tenis.',
    'Al campeón le ponen la txapela en la cabeza en el mismo frontón, nada más ganar la final.'],
  eu: ['Julian Retegi eratsundarrak irabazi ditu buruz buruko txapela gehien: hamaika.',
    'Lau t\'erdiko lehen txapelketa 1989an jokatu zen, eta Julian Retegik irabazi zuen.',
    '1990ean, Julian Retegik urteko hiru txapelak irabazi zituen: buruz burukoa, binakakoa eta lau t\'erdikoa.',
    'Iruñeko Labrit frontoia 1952an eraiki zen. «Bonbonera» deitzen diote, eta pilotako bi Munduko Txapelketa hartu ditu, 1962an eta 2002an.',
    'Euskal pilota 1924, 1968 eta 1992ko Joko Olinpikoetan izan zen, erakustaldi gisa. Mexikon, 1968an, eskuz ere jokatu zen.',
    'Esku pilotak 6 zentimetro inguru ditu eta 100 gramo inguru pisatzen du: barruan, muina eta hari geruzak; kanpoan, eskuz josiriko larrua.',
    'Herri askotan frontoia plazan dago, elizaren ondoan: lehen, haren hormen kontra jokatzen zen.',
    'Esku pilota Erdi Aroko pilota jokotik dator, tenisa sortu zen joko beretik.',
    'Txapeldunari frontoian bertan janzten diote txapela, finala irabazi bezain laster.'],
};
const DATOS_PASAKA = {
  es: ['La pasaka es pariente del jeu de paume francés y antecesora del tenis: de ahí viene el tanteo a 15, 30, 40 y juego.',
    'En Pamplona jugaban a pasaka los canónigos, en el claustro de la catedral. Hubo procesos por arremangarse la sotana para jugar mejor.',
    'En la pasaka, dos parejas juegan frente a frente, con una red de 1,20 metros de altura por medio.',
    'Los partidos de pasaka de verdad son a trece juegos. Aquí juegas una versión corta, a tres.'],
  eu: ['Pasaka jeu de paume frantsesaren ahaidea eta tenisaren aurrekoa da: hortik datoz 15, 30, 40 eta jokoa.',
    'Iruñean kalonjeek jokatzen zuten pasakan, katedraleko klaustroan. Sotana jasotzeagatik epaiketak ere izan ziren.',
    'Pasakan bi bikote aurrez aurre jokatzen dute, 1,20 metroko sare bat erdian dutela.',
    'Benetako pasaka partidak hamahiru jokotara dira. Hemen bertsio laburra jokatzen duzu, hirura.'],
};
// el icono de cada misión en la pantalla de carga (si la misión no trae el suyo)
const MISSION_ICON = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz', summit: 'peak', pelota: 'pelota', figure: 'person', feria: 'cow', dolmen: 'dolmen', castle: 'castle', mirador: 'binoculars' };

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
  startVercel();   // (servido desde Vercel: sus visitas, src/web/vercel.js)
  // (con tope de 2,5 s: en algunos visores de iPhone la base de datos del navegador no responde nunca)
  await Promise.race([loadStore(), new Promise(r => setTimeout(r, 2500))]);
  const canvas = document.getElementById('c');
  const input = new Input(canvas);
  const sound = new Sound();
  const ui = new UI(input, sound);
  vigilaEncaje();   // (ninguna palabra partida ni cortada con «…»: src/ui/encaje.js)
  const P = profile();
  // calidad automática: ordenador según su tarjeta gráfica (src/util/gpu.js); móvil baja (en iPhone no se puede saber la memoria y Safari cierra la página
  // si se pasa), salvo móviles que dicen tener mucha memoria (6 GB o más), que van en media
  const bigMem = navigator.deviceMemory && navigator.deviceMemory >= 6;
  // en ordenador, una calidad bajada sola (por un fallo de carga o de memoria) no se queda para siempre: se vuelve a
  // la automática una vez (las elegidas a mano en Ajustes se respetan)
  if (!input.touch && (P.settings.qualityAuto || !P.q3)) { P.settings.quality = null; P.settings.qualityAuto = false; P.q3 = true; saveProfile(); }
  // (en el modo sencillo, src/util/sencillo.js, siempre la baja; y en el móvil sin memoria conocida, el iPhone, también:
  // en Alta o Media perdía la imagen al entrar en los partidos de pelota, en Tafalla con 1,7 millones de triángulos)
  const movilJusto = input.touch && !bigMem;
  const quality = q.get('q') || (sencillo() || movilJusto ? 'low' : P.settings.quality) || (input.touch ? (bigMem ? 'mid' : 'low') : calidadOrdenador(P.settings.slowPc));
  const rt = new Runtime({ canvas, input, sound, quality });
  fijaCalidad(quality); if (!input.touch) apuntaGpu(rt.renderer.getContext());   // (src/util/gpu.js)
  // (en un ordenador sin tarjeta gráfica potente, los paneles sin el cristal desenfocado, como en el móvil: style.css)
  if (!input.touch && quality !== 'high') document.documentElement.classList.add('sin-cristal');
  // si el ordenador no llega a la fluidez mínima, el juego se aligera solo (runtime.lighten): se avisa una vez y se
  // apunta para arrancar la próxima vez un escalón más abajo (si la calidad se eligió a mano en Ajustes, se respeta)
  rt.onLighten = (n) => {
    const S = P.settings;
    if (!input.touch && !S.quality && !q.get('q') && !S.slowPc) { S.slowPc = true; saveProfile(); }
    if (n === 1) game?.ui?.toast?.(isEU() ? 'Irudia arindu dugu jokoa arin ibil dadin' : 'Imagen aligerada para que el juego vaya fluido', 'exclaim', 3600);
  };
  // y si ni así llega y la gráfica es la del procesador (Intel), una vez: muchos portátiles llevan además otra tarjeta
  // (NVIDIA, AMD) y Windows le da a Chrome la floja; desde la web no se puede elegir, se elige en Windows
  rt.onVistaCorta = () => {
    if (input.touch || !/intel/i.test(gpuNombre() || '')) return;
    try { if (localStorage.getItem('herrizherri-aviso-grafica')) return; localStorage.setItem('herrizherri-aviso-grafica', '1'); } catch (e) { return; }
    setTimeout(() => game?.ui?.toast?.(isEU() ? 'Joko motela: ordenagailuak NVIDIA edo AMD txartela badu, Windowsen Ezarpenak › Pantaila › Grafikoak atalean jarri Chrome «Errendimendu handia»-n'
      : 'Va lento con la gráfica Intel. Si el ordenador tiene NVIDIA o AMD: Configuración de Windows › Pantalla › Gráficos, Chrome en «Alto rendimiento»', 'exclaim', 12000), 4000);
  };
  // retratos, fichas, iconos y figuras del público se dibujan con este mismo renderizador (sin un segundo contexto WebGL)
  setOffscreenHost(rt.renderer);
  // si el dispositivo se queda sin memoria para dibujar (pantalla apagada), la próxima vez arranca con menos calidad
  canvas.addEventListener('webglcontextlost', () => { const S = P.settings, next = { high: 'mid', mid: 'low' }[S.quality || quality]; if (next) { S.quality = next; S.qualityAuto = true; saveProfile(); }
    // (y se apunta dónde estabas, para Ajustes › Diagnóstico: «se me sale solo del partido» suele ser esto)
    apuntaPerdida(`${def?.id || 'menú'} · ${game?.pelotaMatch ? 'partido de pelota' : game?.pelotaLoading ? 'preparando la pelota' : game?.sportMode ? 'campeonatos' : game?.mode || 'menú'} · calidad ${S.quality || quality}`); });
  canvas.style.visibility = 'hidden';
  window.__renderer = rt.renderer; window.__hf = HF; window.__layout = LAYOUT; window.__THREE = THREE; window.__LANDMARKS = LANDMARKS; window.__rt = rt;

  let game = null, def = null, loading = false;
  const hub = new Hub({ sound, onPlay: (d, o) => play(d, o) });
  // campeonatos desde el menú, sin misiones: la pelota en el frontón del pueblo elegido; el fútbol, en su propia escena
  // (la pelota, siempre en una de las sedes de los Campeonatos: data/levels.js, SEDES_PELOTA)
  hub.onSport = (kind, townId) => kind === 'futbol' ? futbolSport() : play(levelById(kind === 'pasaka' ? townId : sedeDePueblo(townId || LEVELS[0].id)) || LEVELS[0], { sport: kind === 'pasaka' ? 'pasaka' : 'pelota' });
  hub.onSettings = (S) => { sound.setMusic(S.music); sound.setVolume(S.volume); };
  // el tema de inicio (audio.js, INICIO) suena en el menú: desde el primer toque o tecla (antes, el navegador no deja
  // sonar nada) y al volver de un pueblo o de un campeonato (exit y futbolSport). En los pueblos y en los partidos, la
  // música la elige runtime.js según lo que pasa
  sound.setMood('inicio');
  // (el sonido se prepara ya, al abrir: las canciones se van descargando mientras tanto y suenan en cuanto se toca. Antes
  // se preparaba con el primer toque y la música empezaba tarde, cuando llegaba. Donde el navegador deja sonar sin tocar,
  // como la app instalada en el ordenador, suena desde el principio; si no, el primer toque la despierta)
  // (con la música y el volumen de Ajustes desde ya: antes, en el menú sonaba aunque se hubiera quitado)
  sound.setMusic(P.settings.music !== false); sound.init(); if (P.settings.volume != null) sound.setVolume(P.settings.volume);
  { const first = () => { removeEventListener('pointerup', first, true); removeEventListener('keydown', first, true); if (!game && !loading) sound.init(); };
    addEventListener('pointerup', first, true); addEventListener('keydown', first, true); }
  window.__hub = hub;
  // el fútbol, el encierro, los minijuegos 3D de los oficios y Pamplona van en archivos aparte (se cargan al entrar): se descargan
  // sin prisa cuando el navegador está desocupado, así quedan guardados para jugar sin conexión y no esperan al tocarlos
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
  // (en el modo didáctico no se juega: no hace falta)
  if (!isDidactico()) setTimeout(() => idle(() => { juego().catch(() => {}); import('./game/futbol.js').catch(() => {}); import('./game/encierro.js').catch(() => {}); import('./ui/mini3d/index.js').catch(() => {}); import('./world/pamplona.js').catch(() => {}); }, { timeout: 20000 }), 15000);

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
    // (en un pueblo, un consejo de juego, con su rótulo; en la pelota y la pasaka, un dato de su historia)
    const azar = (L) => L[Math.floor(Math.random() * L.length)], datos = pasaka ? DATOS_PASAKA : DATOS_PELOTA, tip = azar(TIPS);
    const sub = opt.sport ? azar(eu ? datos.eu : datos.es) : input.touch && tip.startsWith('Pulsa C') ? TIP_TOQUE : tip;
    const lam = opt.sport ? 'dep-fronton' : d.id, left = (pr => Math.max(0, pr.total - pr.done))(townProgress(P, d));
    // (desde el mapa del inicio, tras su zoom rápido: una carga corta, solo el nombre y la barra, y luego directamente el
    // avatar en el pueblo, sin el vuelo de llegada, que ya ha hecho el mapa)
    const entrada = ui.showLoading(title, sub, opt.desdeMapa ? '' : (opt.sport && laminaUrl('dep-fronton')) || townImg(d), {
      min: !!opt.desdeMapa, comarca: cm?.name, tipTitle: opt.sport ? '¿Sabías que…?' : 'Consejo', caption: laminaUrl(lam) ? laminaById(lam).title : '', avatar: avatarPortrait(P.avatar),
      intro: opt.sport ? '' : d.intro, missions: opt.sport ? [] : missionSlots(d, edadDe(P)).map(({ m }) => m.icon || MISSION_ICON[m.type] || 'star'), left: opt.sport ? 0 : left,
    });
    // (el menú se queda debajo mientras la pantalla de carga entra con su fundido y se va cuando ha entrado; si la carga
    // acaba antes, se va entonces: que no asome a través de la pantalla de carga cuando se desvanece)
    // (entrando directamente en un pueblo, sin pasar por el menú —al recargar tras perder la imagen en el iPhone—, el menú
    // no se había abierto pero estaba en la página: se quedaba encima del pueblo y del partido, como si el juego te hubiera
    // sacado al inicio. Se quita igual)
    let conHub = true; const sinHub = () => { if (!conHub) return; conHub = false; if (hub.visible || !hub.root.classList.contains('hidden')) hub.hide(); };
    entrada.then(sinHub);
    try {
      // (el escudo del pueblo, y el de Pamplona del Labrit, con su acabado: listos antes de montar la plaza y el frontón)
      await Promise.all([armsReady(armsOfTown(d.id)?.id), armsReady('pamplona')]);
      // (en los campeonatos, los mensajes de la carga hablan del frontón, no de plantar árboles ni de saludar a los vecinos)
      const sportMsg = (p) => pasaka ? (eu ? 'Klaustroa prestatzen…' : 'Preparando el claustro…') : p < 0.3 ? (eu ? 'Frontoia irekitzen…' : 'Abriendo el frontón…') : p < 0.6 ? (eu ? 'Kantxa prestatzen…' : 'Preparando la cancha…') : p < 0.9 ? (eu ? 'Harmailak betetzen…' : 'Llenando la grada…') : (eu ? 'Pilotariak berotzen…' : 'Calentando a los pelotaris…');
      // (el campeonato de pelota, solo con su frontón: ni el pueblo ni sus vecinos; con suelo, los frontones al aire libre,
      // que van en su calle; engine/runtime.js, load)
      const campeonato = opt.sport === 'pelota';
      const modP = juego(), npcP = preloadNpcs(); await preloadFood(); await Promise.all([rt.load(d, P.avatar, (p, m) => ui.progress(p, opt.sport ? sportMsg(p) : m), { soloFronton: campeonato, conSuelo: campeonato && esExterior(d.id) }), npcP]);
      const [{ Game }, { TownGame }] = await modP;
      const ctx = { scene: rt.scene, camera: rt.camera, player: rt.player, follow: rt.follow, ui, sound, input, sky: rt.sky, fauna: rt.fauna, particles: rt.particles, beacon: rt.beacon, rt, onExit: exit, campeonato };
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
        sinHub(); ui.hideLoading(); queueMode('light');
        sound.setMusic(P.settings.music); sound.setVolume(P.settings.volume);
        if (!st.introDone && !q.get('skipintro')) await game.intro(d);
        else {   // (las siguientes veces, la llegada: el vuelo por encima de Otsagabia con su nombre y su comarca)
          if (!q.get('skipintro') && !opt.desdeMapa) { game.mode = 'cine'; rt.player.frozen = true; const g0 = game;
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
        sinHub(); ui.hideLoading(); queueMode('light');
        saveProfile();
        if (opt.resumeAt) { rt.player.place(opt.resumeAt.x, opt.resumeAt.z, opt.resumeAt.h ?? 0); rt.follow.snap(rt.player); }
        if (opt.sport) { loading = false; if (opt.sport === 'pasaka') game.pasakaOnly(); else game.sportOnly({ torneo: opt.torneo, vuelta: opt.vuelta }); return; }
        // (si se perdió en un partido de pelota del pueblo, otra vez su menú: antes te quedabas en la puerta del frontón y
        // parecía que el juego te había echado del partido)
        if (opt.resumed) { const g = game; setTimeout(() => { if (!g || g !== game) return; g.ui.toast(opt.pelota ? 'Imagen recuperada: el partido se ha cortado, vuelve a empezar' : 'Imagen recuperada: sigues donde estabas', 'exclaim', 3600); if (opt.pelota) g.freePelota?.(); }, 700); }
        else {   // (primero, la llegada: el vuelo por encima del pueblo con su nombre y su comarca; luego, a quién buscar)
          // (de vuelta del campeonato al que te apuntaste en el pueblo: sin la llegada, en la puerta del frontón)
          const g = game; (q.get('skipintro') || opt.desdeMapa || opt.volver ? Promise.resolve() : g.llegada()).catch(e => console.warn('llegada', e))
            .then(() => setTimeout(() => { if (g && g === game) g.ui.toast(opt.volver ? `De vuelta en ${d.name.split(' /')[0]}` : `¡Ya estás en ${d.name}! Habla con ${g.missions[0]?.host?.name || 'tu guía'}`, 'exclaim', 4200); }, 300));
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
      conHub = false; hub.show('home');
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
      document.querySelectorAll('.lg-root:not(.out)').forEach(r => r.remove()); fade.remove();   // (el que se está desvaneciendo, que acabe)
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
    // (y desde un pueblo, apuntado al campeonato por el pelotari: el campeonato, con su cuadro; al acabarlo, de vuelta al
    // pueblo, a la puerta del frontón)
    if (luego?.pelota && levelById(luego.pelota)) setTimeout(() => play(levelById(luego.pelota), { sport: 'pelota', torneo: luego.torneo, vuelta: luego.vuelta }), 60);
    else if (luego?.vuelta && levelById(luego.vuelta.id)) setTimeout(() => play(levelById(luego.vuelta.id), { resumeAt: luego.vuelta, volver: true }), 60);
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
    const sport = game.sportMode ? 'pelota' : undefined, pelotaOtra = !!pelota && !game.sportMode;
    try { game.save?.(); } catch (e) { }
    try { game.dispose?.(); } catch (e) { }
    ui.destroyHUD(); ui.setCinematic(false);
    try { rt.unload(); } catch (e) { }
    game = null;
    play(d, { resumeAt, sport, resumed: true, pelota: pelotaOtra });   // (donde estabas, y no en la llegada del pueblo)
  };
  rt.onReload = () => {
    try { game?.save?.(); } catch (e) { }
    // (de vuelta al mismo pueblo; si se estaba en los campeonatos de pelota, a su menú y no a la llegada del pueblo)
    try { if (game && def) sessionStorage.setItem('herrizherri-volver', def.id + (game.sportMode ? '|pelota' : '')); } catch (e) { }
    location.reload();
  };

  addEventListener('visibilitychange', () => { if (document.hidden) { try { game?.save(); } catch (e) { } } });
  addEventListener('pagehide', () => { try { game?.save(); } catch (e) { } });

  // parámetros de prueba: ?town=olite (&autostart)
  let back = null; try { back = sessionStorage.getItem('herrizherri-volver'); sessionStorage.removeItem('herrizherri-volver'); } catch (e) { }
  const [volver, volverA] = (back || '').split('|'), t = q.get('town') || volver;
  if (t && levelById(t) && isDidactico()) hub.show('pueblo', t);   // (en el modo didáctico, su página)
  else if (t && levelById(t)) { if (!P.name) { P.name = 'Iñigo'; saveProfile(); } play(levelById(t), volverA === 'pelota' && !q.get('town') ? { sport: 'pelota' } : undefined); }
  else {
    hub.show(q.get('screen') || (isDidactico() ? 'aprende' : 'home'), q.get('arg') || undefined);   // (el material didáctico abre con su portada, encima del mapa)
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
