// Motor: carga una localidad (Salazar o generada), la actualiza y la libera al salir
import { applyCharFill, skyFill, lampFill } from './charLight.js';
import { Weather, pickWeather } from '../world/weather.js';
import * as THREE from 'three';
import { setMeshyTexMax } from '../actors/glbChar.js';
import { setQuality } from '../util/quality.js';
import { bake, initBridges, clearPlatforms } from '../world/heightfield.js';
import { buildTextures, TEX } from '../world/textures.js';
import { Terrain } from '../world/terrain.js';
import { SkySystem } from '../world/sky.js';
import { Water } from '../world/water.js';
import { makeMaterials, resetDetail, updateDetail, setBuilderQuality } from '../world/builder.js';
import { resetNpcCache } from '../actors/npcGlb.js';
import { buildVillage, VILLAGE, resetVillage } from '../world/village.js';
import { buildLandmarks, LANDMARKS } from '../world/landmarks.js';
import { buildTown, preloadTown, TOWN } from '../world/townBuilder.js';
import { Nature } from '../world/nature.js';
import { setLevel, PLACES, iratiMask } from '../world/layout.js';
import * as SALAZAR from '../levels/salazar.js';
import { createTownLevel } from '../levels/town.js';
import { resetColliders } from '../world/colliders.js';
import { resetNav, navTick } from '../world/nav.js';
import { MinifigRig, COSTUMES } from '../actors/minifig.js';
import { GlbRig, isGlbAvatar, loadGlbAvatar } from '../actors/glbChar.js';
import { Player } from '../actors/player.js';
import { Fauna } from '../actors/animals.js';
import { FollowCamera } from '../camera.js';
import { Particles, Waterfall, Smoke, NightLights, Beacon } from '../fx.js';

const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// Registro de texturas por pueblo: cada textura que se sube a la tarjeta gráfica queda apuntada con el «turno» de
// carga en que se creó; al salir del pueblo se liberan las de ese turno (terreno, carteles, sombras, vecinos…).
// Liberar una textura que luego se vuelve a usar es seguro: se sube otra vez.
let EPOCH = 0; const TEXREG = new Set();
{
  const d = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'needsUpdate');
  Object.defineProperty(THREE.Texture.prototype, 'needsUpdate', { configurable: true, set(v) { if (v && this.userData && this.userData.epoch == null) { this.userData.epoch = EPOCH; TEXREG.add(new WeakRef(this)); } d.set.call(this, v); } });
}
// aviso discreto de error (para poder contarlo): esquina inferior, se va solo; tocándolo se copia el detalle
function showErrorNote(msg, stack) {
  let n = document.querySelector('.errnote'); if (!n) { n = document.createElement('button'); n.className = 'errnote'; document.body.appendChild(n); }
  const where = (stack || '').split('\n').find(l => /src\//.test(l))?.match(/src\/[^?:)]+(:\d+)?/)?.[0] || '';
  n.textContent = `Error: ${msg}${where ? ' · ' + where : ''}`; n.title = 'Toca para copiar el detalle';
  n.onclick = () => { navigator.clipboard?.writeText(`${msg}\n${stack || ''}`); n.textContent = 'Copiado'; };
  n.classList.add('on'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('on'), 9000);
}
// errores fuera del bucle (diálogos y misiones que esperan): se apuntan igual
addEventListener('unhandledrejection', (ev) => { const e = ev.reason; const k = String(e?.message || e); (window.__errors ||= []).push(k); console.error('[promesa]', e); showErrorNote(k, e?.stack); });
addEventListener('error', (ev) => { if (!ev.error) return; const k = String(ev.error.message); (window.__errors ||= []).push(k); showErrorNote(k, ev.error.stack); });
// aviso de memoria gráfica agotada: botón para volver a cargar el mismo pueblo
function showContextLost(onReload) {
  if (document.querySelector('.ctxlost')) return;
  const o = document.createElement('div'); o.className = 'mg-overlay ctxlost';
  o.innerHTML = '<div class="mg-card"><h3>Recuperando la imagen…</h3><p>El dispositivo se ha quedado sin memoria para dibujar. Tu progreso está guardado. Si en unos segundos no vuelve, toca el botón y seguirás en el mismo pueblo.</p><button class="btn primary">Volver a cargar</button></div>';
  o.querySelector('button').onclick = () => (onReload || (() => location.reload()))();
  document.body.appendChild(o);
}
export class Runtime {
  constructor({ canvas, input, sound, quality }) {
    this.canvas = canvas; this.input = input; this.sound = sound; this.quality = quality;
    setBuilderQuality(quality); setMeshyTexMax(quality === 'low' ? 1024 : 2048); setQuality(quality);
    // en móvil (calidad media/baja) sin antialias de hardware y con menos resolución: el búfer de imagen pesa mucho menos
    // en pantallas de mucha densidad (retina, 4K) la propia resolución ya suaviza los bordes: sin antialias de hardware,
    // que con tantos píxeles era lo que más frenaba los ordenadores
    // suavizado de bordes: en el móvil también (sus gráficas lo hacen casi gratis y sin él los personajes se veían con
    // dientes y motas); en ordenador con pantalla de mucha densidad no hace falta (ya es nítida)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'high' || devicePixelRatio < 1.5, powerPreference: 'high-performance' });
    // resolución con un presupuesto de píxeles: en alta, como mucho unos 4 millones (2560×1600); en móvil 1,25
    this.pixelRatio = this.maxRatio = this.ratioFor(quality);
    // si el navegador se queda sin memoria gráfica, avisar y ofrecer recargar (el progreso ya está guardado)
    // (en el iPhone pasa al volver de otra aplicación o con poca memoria: si el navegador devuelve el contexto, el juego
    // reconstruye el pueblo solo —onContextRestored—; si no, el botón recarga y entra en el mismo pueblo —onReload—)
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; showContextLost(() => (this.onReload || (() => location.reload()))()); }, false);
    canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.sizeDirty = true; document.querySelector('.ctxlost')?.remove(); this.renderer.shadowMap.needsUpdate = true; this.onContextRestored?.(); }, false);
    this.renderer.debug.checkShaderErrors = /debug/.test(location.search);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    // en móviles (calidad baja) sin sombras en tiempo real: obligan a dibujar la escena dos veces y el iPhone se quedaba
    // en 15-25 imágenes por segundo. Los personajes llevan una sombra redonda (util/blob.js)
    this.renderer.shadowMap.enabled = quality !== 'low';
    // sombra suave en ordenador; con filtro sencillo en móviles
    this.renderer.shadowMap.type = quality === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // la sombra se recalcula en cada fotograma (a la mitad de ritmo, la de los personajes que andan iba a saltos);
    // solo en calidad baja (móviles) un fotograma sí y otro no
    this.shadowEvery = quality === 'low' ? 2 : 1; this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    // en vertical se abre el campo de visión para no ver el mundo «por un tubo»
    const fovFor = (a) => a < 1 ? 55 + (1 - a) * 30 : 55;
    this.camera = new THREE.PerspectiveCamera(fovFor(innerWidth / innerHeight), innerWidth / innerHeight, 0.15, 6000);
    this.camera.userData.fov0 = this.camera.fov;
    // al cambiar el tamaño de la ventana (girar el móvil, la barra del navegador que aparece y se va) no se toca el
    // lienzo aquí: cambiarle el tamaño lo borra y, si el navegador lo enseña antes del siguiente dibujo, se ve un
    // destello negro. Se aplica en el bucle, justo antes de dibujar (applySize)
    this.fovFor = fovFor; this.sizeDirty = false; this.ratioDirty = false; this.ratioHold = 0; this.boosted = false;
    addEventListener('resize', () => { this.sizeDirty = true; });
    this.texturesReady = false;
    this.active = false;
    this.clock = new THREE.Clock();
    this.elapsed = 0; this.frames = 0; this.fpsT = 0; this.lowFps = 0; this.highFps = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // def: ficha de la localidad; avatarId: traje del jugador; onProgress(p, msg)
  async load(def, avatarId, onProgress = () => { }) {
    this.unload();
    const q = this.quality;
    onProgress(0.05, 'Dibujando el terreno…'); await frame();
    resetColliders(); resetVillage(); clearPlatforms(); resetDetail(); resetNav();
    for (const k of Object.keys(LANDMARKS)) delete LANDMARKS[k];
    const salazar = def.special === 'salazar';
    const mod = salazar ? SALAZAR : createTownLevel(def);
    setLevel(mod, def, salazar ? 'salazar' : 'town');
    bake();
    if (salazar) initBridges();
    onProgress(0.25, 'Tallando la piedra…'); await frame();
    if (!this.texturesReady) { buildTextures(q); this.texturesReady = true; }
    const scene = this.scene = new THREE.Scene();
    onProgress(0.35, 'Extendiendo el paisaje…'); await frame();
    this.terrain = new Terrain(scene, q);
    this.sky = new SkySystem(scene, this.renderer, q);
    this.weather?.dispose(); this.weather = new Weather(scene, pickWeather(def), q);
    this.water = new Water(scene, q);
    onProgress(0.5, `Construyendo ${def.name}…`); await frame();
    if (!salazar) await preloadTown(def);
    this.mats = makeMaterials();
    if (salazar) { buildVillage(scene, this.mats); buildLandmarks(scene, this.mats); }
    else buildTown(scene, this.mats, def);
    onProgress(0.65, 'Plantando árboles y cultivos…'); await frame();
    this.nature = new Nature(scene, q);
    if (this.weather.kind === 'snow' && this.nature.flowers?.mesh) this.nature.flowers.mesh.visible = false;   // sin flores sobre la nieve
    onProgress(0.8, 'Despertando a los animales…'); await frame();
    this.fauna = new Fauna(scene, q, salazar ? null : { def, town: TOWN, places: PLACES });
    if (this.weather.kind !== 'clear' && this.fauna.bfMesh) this.fauna.bfMesh.visible = false;   // con lluvia o nieve no hay mariposas
    let rig = null;
    if (isGlbAvatar(avatarId)) {
      // personaje GLB (sistema nuevo); si no carga, su minifigura de reserva
      try { rig = new GlbRig(await loadGlbAvatar(avatarId), avatarId); } catch (e) { console.warn('avatar GLB', e); }
    }
    rig = rig || new MinifigRig(COSTUMES[avatarId] || COSTUMES.leire);
    this.player = new Player(rig, scene);
    this.follow = new FollowCamera(this.camera);
    this.particles = new Particles(scene);
    this.waterfall = salazar ? new Waterfall(scene, LANDMARKS.waterfall, this.particles) : null;
    const houses = salazar ? VILLAGE.houses : TOWN.houses;
    this.smoke = new Smoke(scene, houses);
    this.lights = new NightLights(scene, VILLAGE.lamps, this.mats);
    this.charFill = new THREE.Color(1, 1, 1);
    this.beacon = new Beacon(scene);
    this.salazar = salazar;
    this.def = def;
    onProgress(0.95, 'Saludando a los vecinos…'); await frame();
    // compila los shaders mientras sigue la pantalla de carga (en paralelo si el navegador puede),
    // para que el primer fotograma del pueblo no se quede congelado
    try { await Promise.race([this.renderer.compileAsync(scene, this.camera), new Promise(r => setTimeout(r, 5000))]); } catch (e) { }
    return this;
  }
  // segunda pasada de compilación, ya con vecinos, objetos de misión y efectos creados: así no hay tirones
  // la primera vez que aparecen en pantalla (los sombreadores se compilan durante la pantalla de carga)
  async precompile(ms = 4000) {
    if (!this.scene) return;
    try { await Promise.race([this.renderer.compileAsync(this.scene, this.camera), new Promise(r => setTimeout(r, ms))]); } catch (e) { }
  }
  start(game) { this.game = game; this.active = true; this.canvas.style.visibility = 'visible'; this.clock.getDelta(); }
  unload() {
    this.active = false; this.game = null;
    if (!this.scene) return;
    const geos = new Set(), mats = new Set();
    this.scene.traverse(o => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
    });
    const keep = new Set(Object.values(TEX).flatMap(t => t.isTexture ? [t] : [t.map, t.normalMap]));
    for (const g of geos) g.dispose();
    // todas las texturas de los materiales (también las de los shaders propios), salvo las comunes del juego
    const free = (t) => { if (t && t.isTexture && !keep.has(t) && !t.userData?.shared) t.dispose(); };
    for (const m of mats) {
      for (const k in m) free(m[k]);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) { free(u?.value); if (Array.isArray(u?.value)) u.value.forEach(free); }
      m.dispose();
    }
    free(this.scene.background); free(this.scene.environment);
    // mapas de sombras de las luces del pueblo
    this.scene.traverse(o => { if (o.isLight && o.shadow?.map) { o.shadow.map.dispose(); o.shadow.map = null; } });
    // texturas creadas durante la carga de este pueblo que no colgaban de ningún material (terreno, alturas…)
    for (const r of TEXREG) { const t = r.deref(); if (!t) { TEXREG.delete(r); continue; } if (t.userData.epoch === EPOCH && !keep.has(t) && !t.userData.shared) { t.dispose(); TEXREG.delete(r); } }
    EPOCH++;
    this.renderer.renderLists.dispose();
    resetNpcCache();
    // los colisionadores móviles guardan a los vecinos (y, a través de ellos, el pueblo entero): fuera también
    resetColliders(); resetVillage(); clearPlatforms();
    this.scene = null;
    // y todo lo demás del pueblo: antes seguía vivo hasta que el pueblo siguiente lo sustituía, ya a mitad de su carga
    // (al viajar estaban los dos pueblos a la vez en memoria, que es cuando más justo va el móvil)
    this.weather?.dispose(); this.weather = null;
    this.terrain = this.sky = this.water = this.mats = this.nature = this.fauna = this.player = this.particles = this.waterfall = this.smoke = this.lights = this.beacon = null;
    this.canvas.style.visibility = 'hidden';
  }
  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.active || !this.scene) return;
    this.elapsed += dt;
    if (this.contextLost) return;
    const g = this.game, input = this.input;
    // escenas propias (el encierro): el juego dibuja su escena y su cámara, el mundo del pueblo queda en pausa
    const alt = g?.altScene;
    this.applySize();
    if (this.frames % 15 === 0) this.sound.setMood?.(this.moodOf(g));
    try { if (alt) { input.enabled = !g.ui.busy; input.update(); g.altUpdate?.(dt); } else this.step(dt, g, input); } catch (e) { this.reportError(e); }
    // sombras un fotograma sí y otro no (también en las escenas propias, como el encierro)
    if (this.frames % this.shadowEvery === 0) this.renderer.shadowMap.needsUpdate = true;
    // la luz propia de personajes y animales sigue a la del pueblo (de noche, tenue y azulada; junto a una farola, cálida);
    // las escenas propias (fútbol, pelota, encierro) tienen su luz y lo ven neutro
    if (!alt) applyCharFill(this.charFill);
    try { this.renderer.render(alt || this.scene, (alt && g.altCamera) || this.camera); } catch (e) { this.reportError(e); }
    if (!alt) applyCharFill(null);
    input.endFrame();
    this.frames++; this.frameNo = (this.frameNo || 0) + 1; this.fpsT += dt;
    if (this.fpsT > 2) {
      const fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0;
      // resolución dinámica: si va a tirones baja un poco la resolución; si sobra fluidez, la recupera poco a poco
      const want = this.quality === 'low' ? 32 : 45;
      // (en ordenador nunca por debajo de la resolución de la pantalla: se veía pixelado; en los partidos tampoco baja de
      // 1,5: los pelotaris y futbolistas se veían borrosos cuando el móvil iba justo)
      const floor = this.boosted ? Math.min(this.quality === 'low' ? 1.45 : 1.5, this.maxRatio) : this.quality === 'low' ? 0.75 : Math.min(1, this.maxRatio);   // (por debajo de 0,75 los personajes se veían emborronados)
      // (el cambio se aplica en el siguiente fotograma, antes de dibujar: sin destello. Tras bajar, no se vuelve a subir
      // en 25 s, y para subir tiene que sobrar bastante: así no sube y baja cada pocos segundos)
      if (fps < want && this.pixelRatio > floor) { if (++this.lowFps >= 2) { this.pixelRatio = Math.max(floor, this.pixelRatio - (fps < want * 0.6 ? 0.3 : 0.15)); this.ratioDirty = true; this.lowFps = 0; this.highFps = 0; this.ratioHold = this.elapsed + 25; } }
      else if (fps > want + 8 && this.pixelRatio < this.maxRatio && this.elapsed > this.ratioHold) { this.lowFps = 0; if (++this.highFps >= 3) { this.pixelRatio = Math.min(this.maxRatio, this.pixelRatio + 0.1); this.ratioDirty = true; this.highFps = 0; } }
      else { this.lowFps = 0; this.highFps = 0; }
      window.__fps = fps;
    }
  }
  /** Más resolución mientras dura una escena sencilla y de cerca (el partido de pelota): en el móvil los pelotaris se
   *  veían con manchas porque la imagen se dibujaba a 1,25 en pantallas de 3. Si va lento, la resolución dinámica la baja. */
  boost(on) {
    this.boosted = !!on;
    this.maxRatio = on ? this.boostRatio() : this.ratioFor(this.quality);
    this.pixelRatio = on ? this.maxRatio : Math.min(this.pixelRatio, this.maxRatio);
    this.ratioDirty = true; this.lowFps = this.highFps = 0;
  }
  // resolución de los partidos: en calidad baja (móvil) 1,6 y no 2: a 2 el móvil no llegaba, la resolución dinámica la
  // bajaba a saltos durante el partido y los pelotaris se veían cada vez más borrosos. A 1,6 se queda fija
  boostRatio() { return Math.max(this.ratioFor(this.quality), Math.min(devicePixelRatio, this.quality === 'low' ? 1.8 : 2)); }
  /** Tamaño y resolución del lienzo: se aplican justo antes de dibujar (si no, un fotograma con el lienzo vacío). */
  applySize() {
    const r = this.renderer;
    if (this.sizeDirty) {
      this.sizeDirty = false; this.ratioDirty = false;
      this.maxRatio = this.boosted ? this.boostRatio() : this.ratioFor(this.quality);
      if (this.pixelRatio > this.maxRatio) this.pixelRatio = this.maxRatio;
      if (r.getPixelRatio() !== this.pixelRatio) r.setPixelRatio(this.pixelRatio);
      r.setSize(innerWidth, innerHeight);
      const c = this.camera; c.aspect = innerWidth / innerHeight; c.fov = c.userData.fov0 = this.fovFor(c.aspect); c.updateProjectionMatrix();
    } else if (this.ratioDirty) { this.ratioDirty = false; if (r.getPixelRatio() !== this.pixelRatio) r.setPixelRatio(this.pixelRatio); }
  }
  // densidad de píxeles: en alta hasta 2 y unos 3,7 megapíxeles (2560×1440, imagen nítida); en media 2,1 y en baja
  // (móviles) 1,25. Si va a tirones, la resolución dinámica la baja un poco y la recupera cuando sobra
  ratioFor(q) {
    const css = Math.max(1, innerWidth * innerHeight), budget = q === 'high' ? 3.7e6 : q === 'mid' ? 2.1e6 : 1.2e6;
    return Math.max(0.75, Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'mid' ? 1.5 : 1.4, Math.sqrt(budget / css)));
  }
  // un error en una parte del juego no debe congelar la imagen: se anota (una vez por mensaje) y se sigue
  reportError(e) {
    const k = String(e?.message || e); (this.errSeen ||= new Set());
    if (!this.errSeen.has(k)) { this.errSeen.add(k); console.error('[bucle]', e); (window.__errors ||= []).push(k); showErrorNote(k, e?.stack); }
  }
  // ambiente musical según lo que pasa: persecución o encierro (tensión), minijuegos y partidos (juego), danza y
  // fiestas, leyenda de noche (misterio), noche tranquila o día de exploración
  moodOf(g) {
    if (!g) return 'explore';
    const m = g.mode, night = (this.sky?.night || 0) > 0.5;
    if (m === 'encierro') return g.encierro?.started && !g.encierro?.done ? 'tension' : 'fiesta';
    if (m === 'futbol' || m === 'pelota' || m === 'mini') return 'game';
    if (m === 'dance') return 'fiesta';
    if (g.missions?.some(M => M.chase)) return 'tension';
    if (night && g.missions?.some(M => !M.done && (M.type === 'legend' || (M.type === 'carnival' && M.night)))) return 'mystery';
    return night ? 'night' : 'explore';
  }
  step(dt, g, input) {
    input.enabled = !g.ui.busy && g.mode !== 'cine' && g.mode !== 'dance' && g.mode !== 'mini' && g.mode !== 'pelota';
    input.update();
    const P = this.player;
    P.update(dt, input, this.follow.yaw);
    if (g.mode !== 'bino') this.follow.update(dt, P, input);
    g.update(dt);
    navTick(this.quality === 'low' ? 1.5 : 2.5);   // caminos de los vecinos, unos milisegundos por fotograma
    this.terrain.update(this.camera.position);
    this.sky.update(dt, P.pos, this.elapsed, g.mode === 'dance');
    this.weather?.update(dt, this.camera, this.sky, this.sound, g.mode === 'futbol' || g.mode === 'pelota');
    this.sky.applyFlood();   // (los focos del frontón, después de la lluvia)
    g.fronton?.court?.setLights?.(this.sky.flood ? 1 : Math.min(1, this.sky.night * 1.6));   // (en el partido, siempre encendidos; si no, al anochecer)
    this.water.update(this.elapsed, this.sky);
    this.nature.update(this.camera.position, P.pos, this.elapsed, P.pos);
    updateDetail(this.camera.position, this.quality);
    this.fauna.update(dt, P, this.elapsed, this.sky.night, this.sound);
    this.particles.update(dt);
    if (this.waterfall) this.waterfall.update(dt, this.elapsed, Math.hypot(P.pos.x - PLACES.waterfall.x, P.pos.z - PLACES.waterfall.z) < 80);
    this.smoke.update(dt);
    this.lights.update(this.sky.night, P);
    { const fl = this.sky.flood || 0; lampFill(skyFill(this.charFill, this.sky.hemi, this.sky.sun, this.sky.night * (1 - fl)), (this.lights.lampK || 0) * (1 - fl)); }   // (en el frontón, la luz de los focos: la misma de día y de noche)
    this.beacon.update(this.elapsed, P);
    this.sound.update(dt, P, this.follow.yaw, this.sky.night, iratiMask(P.pos.x, P.pos.z) > 0.5);
    g.ui.setClock(this.sky.clock(), this.sky.night > 0.5);
  }
}
