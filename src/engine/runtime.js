// Motor: carga una localidad (Salazar o generada), la actualiza y la libera al salir
import { Weather, pickWeather } from '../world/weather.js';
import * as THREE from 'three';
import { bake, initBridges, clearPlatforms } from '../world/heightfield.js';
import { buildTextures, TEX } from '../world/textures.js';
import { Terrain } from '../world/terrain.js';
import { SkySystem } from '../world/sky.js';
import { Water } from '../world/water.js';
import { makeMaterials, resetDetail, updateDetail, setBuilderQuality } from '../world/builder.js';
import { resetNpcCache } from '../actors/npcGlb.js';
import { buildVillage, VILLAGE, resetVillage } from '../world/village.js';
import { buildLandmarks, LANDMARKS } from '../world/landmarks.js';
import { buildTown, TOWN } from '../world/townBuilder.js';
import { Nature } from '../world/nature.js';
import { setLevel, PLACES, iratiMask } from '../world/layout.js';
import * as SALAZAR from '../levels/salazar.js';
import { createTownLevel } from '../levels/town.js';
import { resetColliders } from '../world/colliders.js';
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
function showContextLost() {
  if (document.querySelector('.ctxlost')) return;
  const o = document.createElement('div'); o.className = 'mg-overlay ctxlost';
  o.innerHTML = '<div class="mg-card"><h3>El dispositivo necesita un respiro</h3><p>Se ha quedado sin memoria para dibujar. Tu progreso está guardado.</p><button class="btn primary">Volver a cargar</button></div>';
  o.querySelector('button').onclick = () => location.reload();
  document.body.appendChild(o);
}
export class Runtime {
  constructor({ canvas, input, sound, quality }) {
    this.canvas = canvas; this.input = input; this.sound = sound; this.quality = quality;
    setBuilderQuality(quality);
    // en móvil (calidad media/baja) sin antialias de hardware y con menos resolución: el búfer de imagen pesa mucho menos
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(devicePixelRatio, quality === 'high' ? 2 : quality === 'mid' ? 1.25 : 1);
    // si el navegador se queda sin memoria gráfica, avisar y ofrecer recargar (el progreso ya está guardado)
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; showContextLost(); }, false);
    this.renderer.debug.checkShaderErrors = /debug/.test(location.search);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = quality === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // en móvil la sombra se recalcula un fotograma sí y otro no (casi no se nota y ahorra mucho)
    this.shadowEvery = quality === 'high' ? 1 : 2; this.renderer.shadowMap.autoUpdate = this.shadowEvery === 1;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    // en vertical se abre el campo de visión para no ver el mundo «por un tubo»
    const fovFor = (a) => a < 1 ? 55 + (1 - a) * 30 : 55;
    this.camera = new THREE.PerspectiveCamera(fovFor(innerWidth / innerHeight), innerWidth / innerHeight, 0.15, 6000);
    this.camera.userData.fov0 = this.camera.fov;
    addEventListener('resize', () => { this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.fov = this.camera.userData.fov0 = fovFor(this.camera.aspect); this.camera.updateProjectionMatrix(); });
    this.texturesReady = false;
    this.active = false;
    this.clock = new THREE.Clock();
    this.elapsed = 0; this.frames = 0; this.fpsT = 0; this.lowFps = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // def: ficha de la localidad; avatarId: traje del jugador; onProgress(p, msg)
  async load(def, avatarId, onProgress = () => { }) {
    this.unload();
    const q = this.quality;
    onProgress(0.05, 'Dibujando el terreno…'); await frame();
    resetColliders(); resetVillage(); clearPlatforms(); resetDetail();
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
    this.water = new Water(scene);
    onProgress(0.5, `Construyendo ${def.name}…`); await frame();
    this.mats = makeMaterials();
    if (salazar) { buildVillage(scene, this.mats); buildLandmarks(scene, this.mats); }
    else buildTown(scene, this.mats, def);
    onProgress(0.65, 'Plantando árboles y cultivos…'); await frame();
    this.nature = new Nature(scene, q);
    onProgress(0.8, 'Despertando a los animales…'); await frame();
    this.fauna = new Fauna(scene, q, salazar ? null : { def, town: TOWN, places: PLACES });
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
    this.scene = null;
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
    if (this.frames % 15 === 0) this.sound.setMood?.(this.moodOf(g));
    try { if (alt) { input.enabled = !g.ui.busy; input.update(); g.altUpdate?.(dt); } else this.step(dt, g, input); } catch (e) { this.reportError(e); }
    try { this.renderer.render(alt || this.scene, (alt && g.altCamera) || this.camera); } catch (e) { this.reportError(e); }
    input.endFrame();
    this.frames++; this.fpsT += dt;
    if (this.fpsT > 2) {
      const fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0;
      if (fps < 32 && this.pixelRatio > 0.75) { if (++this.lowFps >= 2) { this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25); this.renderer.setPixelRatio(this.pixelRatio); this.lowFps = 0; } }
      else this.lowFps = 0;
      window.__fps = fps;
    }
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
    this.terrain.update(this.camera.position);
    this.sky.update(dt, P.pos, this.elapsed, g.mode === 'dance');
    this.weather?.update(dt, this.camera, this.sky, this.sound, g.mode === 'futbol' || g.mode === 'pelota');
    this.water.update(this.elapsed, this.sky);
    this.nature.update(this.camera.position, P.pos, this.elapsed, P.pos);
    updateDetail(this.camera.position, this.quality);
    this.fauna.update(dt, P, this.elapsed, this.sky.night, this.sound);
    this.particles.update(dt);
    if (this.waterfall) this.waterfall.update(dt, this.elapsed, Math.hypot(P.pos.x - PLACES.waterfall.x, P.pos.z - PLACES.waterfall.z) < 80);
    this.smoke.update(dt);
    this.lights.update(this.sky.night, P);
    this.beacon.update(this.elapsed, P);
    this.sound.update(dt, P, this.follow.yaw, this.sky.night, iratiMask(P.pos.x, P.pos.z) > 0.5);
    g.ui.setClock(this.sky.clock(), this.sky.night > 0.5);
    if (this.shadowEvery > 1 && this.frames % this.shadowEvery === 0) this.renderer.shadowMap.needsUpdate = true;
  }
}
