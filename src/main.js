// MENDIMENDIZ · Aventura en el valle de Salazar
import * as THREE from 'three';
import { bake, initBridges, groundHeight, terrainHeight } from './world/heightfield.js';
import { buildTextures } from './world/textures.js';
import { Terrain } from './world/terrain.js';
import { SkySystem } from './world/sky.js';
import { Water } from './world/water.js';
import { makeMaterials } from './world/builder.js';
import { buildVillage, VILLAGE } from './world/village.js';
import { buildLandmarks, LANDMARKS } from './world/landmarks.js';
import { Nature } from './world/nature.js';
import { PLACES, iratiMask } from './world/layout.js';
import * as HF from './world/heightfield.js';
import * as LAYOUT from './world/layout.js';
import { loadHero } from './actors/hero.js';
import { Player } from './actors/player.js';
import { Fauna } from './actors/animals.js';
import { FollowCamera } from './camera.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { Particles, Waterfall, Smoke, NightLights, Beacon } from './fx.js';
import { Game } from './game/game.js';

const q = new URLSearchParams(location.search);
const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

async function boot() {
  const input = new Input(document.getElementById('c'));
  const sound = new Sound();
  const ui = new UI(input, sound);
  // calidad: guardada, parámetro o por dispositivo
  let saved = null; try { saved = JSON.parse(localStorage.getItem('mendimendiz-salazar-v2')); } catch (e) { }
  const quality = q.get('q') || saved?.settings?.quality || (input.touch ? 'mid' : 'high');

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = quality === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.15, 6000);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

  ui.progress(0.05, 'Dibujando montañas y ríos…'); await frame();
  bake(); initBridges();
  ui.progress(0.25, 'Tallando la piedra…'); await frame();
  buildTextures(quality);
  ui.progress(0.35, 'Extendiendo el valle…'); await frame();
  const terrain = new Terrain(scene, quality);
  const sky = new SkySystem(scene, renderer, quality);
  const water = new Water(scene);
  ui.progress(0.5, 'Construyendo Otsagabia…'); await frame();
  const mats = makeMaterials();
  buildVillage(scene, mats);
  buildLandmarks(scene, mats);
  ui.progress(0.65, 'Plantando la Selva de Irati…'); await frame();
  const nature = new Nature(scene, quality);
  ui.progress(0.8, 'Despertando a los animales…'); await frame();
  const fauna = new Fauna(scene, quality);
  const rig = await loadHero();
  const player = new Player(rig, scene);
  const follow = new FollowCamera(camera);
  const particles = new Particles(scene);
  const waterfall = new Waterfall(scene, LANDMARKS.waterfall, particles);
  const smoke = new Smoke(scene, VILLAGE.houses);
  const lights = new NightLights(scene, VILLAGE.lamps, mats);
  const beacon = new Beacon(scene);
  ui.progress(0.92, 'Saludando a los vecinos…'); await frame();

  const game = new Game({ scene, camera, player, follow, ui, sound, input, sky, fauna, particles, beacon });
  window.__game = game; window.__renderer = renderer; window.__hf = HF; window.__layout = LAYOUT; window.__THREE = THREE; window.__LANDMARKS = LANDMARKS;
  ui.buildHUD(game);
  game.spawn();
  const st = game.state;
  sky.time = q.get('t') ? +q.get('t') : (st.time ?? 9.3);
  game.applySettings();
  if (st.pos && st.introDone) player.place(st.pos.x, st.pos.z, st.pos.h);
  else player.place(PLACES.crucero.x - 2, PLACES.crucero.z + 5, Math.PI * 0.9);
  if (q.get('px')) player.place(+q.get('px'), +q.get('pz'), +(q.get('ph') ?? 0));
  follow.snap(player);
  ui.hudVisible(false);

  // efectos de pasos
  player.onStep = (surf, speed, pos) => {
    sound.step(surf, speed);
    if (surf === 'water') particles.emit({ x: pos.x, y: pos.y + 0.1, z: pos.z }, { n: 6, color: '#dff4ff', speed: 1.6, size: 0.22, life: 0.5, gravity: 6 });
    else if (surf === 'dirt' && speed > 4) particles.emit({ x: pos.x, y: pos.y + 0.1, z: pos.z }, { n: 2, color: '#b09a78', speed: 0.6, size: 0.35, life: 0.6, gravity: -0.2 });
  };
  player.onJump = () => sound.jump();
  player.onLand = (v) => sound.land(v);
  player.onSplash = (p, v) => sound.splash(p, v);

  // Pantalla de título con cámara orbitando
  let phase = 'title';
  const titleOrbit = { a: 0 };
  ui.progress(1, '¡Listo!');
  await frame();
  ui.hideLoading();
  const start = async (name, fresh) => {
    if (fresh) game.resetState(name);
    const st = game.state;
    st.name = name; st.started = true; game.save();
    sound.setMusic(st.settings.music); sound.setVolume(st.settings.volume);
    phase = 'game';
    if (!st.introDone && !q.get('skipintro')) await game.intro();
    else { ui.hudVisible(true); game.mode = 'play'; follow.snap(player); }
  };
  if (q.get('autostart')) { start(st.name || 'Mendi', false); } else ui.showTitle(st, start);

  // Bucle principal
  const clock = new THREE.Clock();
  let elapsed = 0, fpsT = 0, frames = 0, lowFps = 0;
  const focus = new THREE.Vector3();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    input.enabled = phase === 'game' && !ui.busy && game.mode !== 'cine' && game.mode !== 'dance';
    input.update();
    if (phase === 'title') {
      titleOrbit.a += dt * 0.04;
      const c = PLACES.plaza;
      const x = c.x - 20 + Math.cos(titleOrbit.a) * 110, z = c.z + 10 + Math.sin(titleOrbit.a) * 110;
      camera.position.set(x, Math.max(terrainHeight(x, z) + 12, 32), z);
      camera.lookAt(c.x - 20, 8, c.z - 10);
      focus.set(camera.position.x * 0.5 + c.x * 0.5, 0, camera.position.z * 0.5 + c.z * 0.5);
    } else {
      player.update(dt, input, follow.yaw);
      if (game.mode !== 'bino') follow.update(dt, player, input);
      focus.copy(player.pos);
    }
    game.update(dt);
    terrain.update(camera.position);
    const env = sky.update(dt, focus, elapsed, phase === 'title' || game.mode === 'dance');
    water.update(elapsed, sky);
    nature.update(camera.position, focus, elapsed, player.pos);
    fauna.update(dt, player, elapsed, sky.night, sound);
    particles.update(dt);
    waterfall.update(dt, elapsed, Math.hypot(player.pos.x - PLACES.waterfall.x, player.pos.z - PLACES.waterfall.z) < 80);
    smoke.update(dt);
    lights.update(sky.night, player);
    beacon.update(elapsed, player);
    sound.update(dt, player, follow.yaw, sky.night, iratiMask(player.pos.x, player.pos.z) > 0.5);
    ui.setClock((sky.night > 0.5 ? '🌙 ' : '☀️ ') + sky.clock());
    renderer.render(scene, camera);
    input.endFrame();
    // rendimiento adaptativo
    frames++; fpsT += dt;
    if (fpsT > 2) {
      const fps = frames / fpsT; frames = 0; fpsT = 0;
      if (fps < 32 && pixelRatio > 0.75) { lowFps++; if (lowFps >= 2) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); lowFps = 0; } }
      else lowFps = 0;
      window.__fps = fps;
    }
  }
  loop();
  addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
  addEventListener('pagehide', () => game.save());
  window.__ready = true;
}

boot().catch(e => {
  console.error(e);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#1e1830;color:#fff;font:600 18px system-ui;padding:24px;text-align:center;z-index:99';
  d.innerHTML = `<div><p>No se ha podido cargar el juego en este dispositivo.</p><p style="color:#d9ccb8;font-size:14px">${String(e.message || e)}</p><p style="color:#d9ccb8;font-size:14px">Prueba a recargar o a usar un navegador actualizado con WebGL.</p></div>`;
  document.body.appendChild(d);
});
