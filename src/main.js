// MENDIMENDIZ · Navarra pueblo a pueblo
// Arranque: centro de mando (hub) + motor 3D que carga cada localidad con sus misiones.
import * as THREE from 'three';
// tipografías incrustadas: el juego funciona igual sin conexión
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
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
import { LEVELS, levelById } from './data/levels.js';
import { landImg, stampImg } from './assets.js';
import COMARCAS from './data/comarcas.json';
import { preloadNpcs } from './actors/npcGlb.js';
import { avatarPortrait } from './ui/portraits.js';
import { loadStore, queueMode } from './util/store.js';
import { startI18n } from './i18n.js';

const q = new URLSearchParams(location.search);
const TIPS = [
  'Sigue la luz dorada: te lleva al siguiente objetivo de tu misión.',
  'Las personas con una exclamación amarilla encima tienen una misión para ti.',
  'Pulsa C para abrir el cuaderno con todas las misiones y sus pasos.',
  'Si corres cerca de los animales se asustan: acércate despacio.',
  'Completa todas las misiones de un pueblo para ganar su sello.',
  'Cuando tengas todos los pueblos de una comarca, se iluminará en el mapa de Navarra.',
];

async function boot() {
  startI18n();
  await loadStore();
  const canvas = document.getElementById('c');
  const input = new Input(canvas);
  const sound = new Sound();
  const ui = new UI(input, sound);
  const P = profile();
  const quality = q.get('q') || P.settings.quality || (input.touch ? 'mid' : 'high');
  const rt = new Runtime({ canvas, input, sound, quality });
  canvas.style.visibility = 'hidden';
  window.__renderer = rt.renderer; window.__hf = HF; window.__layout = LAYOUT; window.__THREE = THREE; window.__LANDMARKS = LANDMARKS; window.__rt = rt;

  let game = null, def = null, loading = false;
  const hub = new Hub({ sound, onPlay: (d) => play(d) });
  hub.onSettings = (S) => { sound.setMusic(S.music); sound.setVolume(S.volume); };
  window.__hub = hub;

  // pasos, saltos y salpicaduras
  const hookPlayer = (player) => {
    player.onStep = (surf, speed, pos) => {
      sound.step(surf, speed);
      if (surf === 'water') rt.particles.emit({ x: pos.x, y: pos.y + 0.1, z: pos.z }, { n: 6, color: '#dff4ff', speed: 1.6, size: 0.22, life: 0.5, gravity: 6 });
      else if (surf === 'dirt' && speed > 4) rt.particles.emit({ x: pos.x, y: pos.y + 0.1, z: pos.z }, { n: 2, color: '#b09a78', speed: 0.6, size: 0.35, life: 0.6, gravity: -0.2 });
    };
    player.onJump = () => sound.jump();
    player.onLand = (v) => sound.land(v);
    player.onSplash = (p, v) => sound.splash(p, v);
  };

  async function play(d) {
    if (loading) return;
    loading = true;
    sound.init();
    def = d;
    hub.hide(); queueMode('off');
    const cm = COMARCAS.find(c => c.id === d.comarca);
    const TI = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz', summit: 'peak', pelota: 'pelota', figure: 'person', feria: 'cow', dolmen: 'dolmen', castle: 'castle', mirador: 'binoculars' };
    ui.showLoading(d.name, TIPS[Math.floor(Math.random() * TIPS.length)], landImg(d.comarca, 1280, 720, true), { comarca: cm?.name, stamp: stampImg(d.comarca, d.name.split(' /')[0]), avatar: avatarPortrait(P.avatar), intro: d.intro, missions: (d.missions || []).map(m => m.icon || TI[m.type] || 'star') });
    try {
      await Promise.all([rt.load(d, P.avatar, (p, m) => ui.progress(p, m)), preloadNpcs()]);
      const ctx = { scene: rt.scene, camera: rt.camera, player: rt.player, follow: rt.follow, ui, sound, input, sky: rt.sky, fauna: rt.fauna, particles: rt.particles, beacon: rt.beacon, onExit: exit };
      hookPlayer(rt.player);
      if (d.special === 'salazar') {
        game = new Game(ctx);
        game.onExit = exit;
        game.kind = 'salazar';
        window.__game = game;
        ui.buildHUD(game);
        game.spawn();
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
        rt.sky.time = q.get('t') ? +q.get('t') : 10;
        game.applySettings();
        await rt.precompile();
        ui.progress(1, '¡Listo!');
        rt.start(game);
        ui.hideLoading(); queueMode('light');
        saveProfile();
        if (!q.get('skipintro') && !navigator.webdriver && !(P.towns[d.id]?.visits > 1)) await game.introFly();
        { const g = game; setTimeout(() => { if (g && g === game) g.ui.toast(`¡Bienvenido a ${d.name}! Habla con ${g.missions[0]?.host?.name || 'tu guía'}`, 'exclaim', 4200); }, 700); }
      }
    } catch (e) {
      console.error(e);
      ui.hideLoading(); loading = false; queueMode('all');
      rt.unload(); hub.show('home');
      return;
    }
    loading = false;
  }

  function exit() {
    if (!game) return;
    try { game.save?.(); } catch (e) { }
    // el valle de Salazar completo cuenta como sello
    if (def?.special === 'salazar') { const s = salazarState(); if (s?.done) { townState(P, def.id).stamp = true; checkBadges(); saveProfile(); } }
    game.dispose?.();
    ui.destroyHUD(); ui.setCinematic(false);
    rt.unload();
    game = null;
    queueMode('all'); hub.show('comarca', def?.comarca);
  }
  window.__exit = exit;

  addEventListener('visibilitychange', () => { if (document.hidden) { try { game?.save(); } catch (e) { } } });
  addEventListener('pagehide', () => { try { game?.save(); } catch (e) { } });

  // parámetros de prueba: ?town=olite (&autostart)
  const t = q.get('town');
  if (t && levelById(t)) { if (!P.name) { P.name = 'Mendi'; saveProfile(); } play(levelById(t)); }
  else {
    hub.show(q.get('screen') || 'home', q.get('arg') || undefined);
  }
  window.__ready = true;
}

boot().catch(e => {
  console.error(e);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#1e1830;color:#fff;font:600 18px system-ui;padding:24px;text-align:center;z-index:99';
  d.innerHTML = `<div><p>No se ha podido cargar el juego en este dispositivo.</p><p style="color:#d9ccb8;font-size:14px">${String(e.message || e)}</p><p style="color:#d9ccb8;font-size:14px">Prueba a recargar o a usar un navegador actualizado con WebGL.</p></div>`;
  document.body.appendChild(d);
});
