// Motor: carga una localidad (Salazar o generada), la actualiza y la libera al salir
import * as THREE from 'three';
import { bake, initBridges, terrainHeight, clearPlatforms } from '../world/heightfield.js';
import { buildTextures, TEX } from '../world/textures.js';
import { Terrain } from '../world/terrain.js';
import { SkySystem } from '../world/sky.js';
import { Water } from '../world/water.js';
import { makeMaterials } from '../world/builder.js';
import { buildVillage, VILLAGE, resetVillage } from '../world/village.js';
import { buildLandmarks, LANDMARKS } from '../world/landmarks.js';
import { buildTown, TOWN } from '../world/townBuilder.js';
import { Nature } from '../world/nature.js';
import { setLevel, PLACES, iratiMask, KIND } from '../world/layout.js';
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

export class Runtime {
  constructor({ canvas, input, sound, quality }) {
    this.canvas = canvas; this.input = input; this.sound = sound; this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(devicePixelRatio, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1);
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
    resetColliders(); resetVillage(); clearPlatforms();
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
    for (const m of mats) { for (const k of ['map', 'normalMap']) { const t = m[k]; if (t && !keep.has(t) && !t.userData?.shared) t.dispose?.(); } m.dispose(); }
    this.renderer.renderLists.dispose();
    this.scene = null;
    this.canvas.style.visibility = 'hidden';
  }
  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.active || !this.scene) return;
    this.elapsed += dt;
    const g = this.game, input = this.input;
    input.enabled = !g.ui.busy && g.mode !== 'cine' && g.mode !== 'dance' && g.mode !== 'mini' && g.mode !== 'pelota';
    input.update();
    const P = this.player;
    P.update(dt, input, this.follow.yaw);
    if (g.mode !== 'bino') this.follow.update(dt, P, input);
    g.update(dt);
    this.terrain.update(this.camera.position);
    this.sky.update(dt, P.pos, this.elapsed, g.mode === 'dance');
    this.water.update(this.elapsed, this.sky);
    this.nature.update(this.camera.position, P.pos, this.elapsed, P.pos);
    this.fauna.update(dt, P, this.elapsed, this.sky.night, this.sound);
    this.particles.update(dt);
    if (this.waterfall) this.waterfall.update(dt, this.elapsed, Math.hypot(P.pos.x - PLACES.waterfall.x, P.pos.z - PLACES.waterfall.z) < 80);
    this.smoke.update(dt);
    this.lights.update(this.sky.night, P);
    this.beacon.update(this.elapsed, P);
    this.sound.update(dt, P, this.follow.yaw, this.sky.night, iratiMask(P.pos.x, P.pos.z) > 0.5);
    g.ui.setClock(this.sky.clock(), this.sky.night > 0.5);
    if (this.shadowEvery > 1 && this.frames % this.shadowEvery === 0) this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    input.endFrame();
    this.frames++; this.fpsT += dt;
    if (this.fpsT > 2) {
      const fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0;
      if (fps < 32 && this.pixelRatio > 0.75) { if (++this.lowFps >= 2) { this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25); this.renderer.setPixelRatio(this.pixelRatio); this.lowFps = 0; } }
      else this.lowFps = 0;
      window.__fps = fps;
    }
  }
}
