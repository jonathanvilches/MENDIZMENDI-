// Fútbol sala de MENDIMENDIZ: módulo independiente del juego (como el de pelota a mano).
//   FutbolSystem.init({ THREE, data, makeCharacter, animateCharacter, crowd, host, quality, touch, audio })
//   FutbolSystem.startMatch({ campoId, modo, rival, dificultad, duracion, asistencia }) → Promise<resultado>
//   FutbolSystem.startPenaltis({ campoId, rival, tiros }) → Promise<resultado>
//   FutbolSystem.startReto({ campoId, reto }) → Promise<resultado>
//   FutbolSystem.openMenu({ campoId }) → Promise<resultado>
//   FutbolSystem.career: partidos, goles, retos y tutorial (localStorage 'mendimendiz-futbol-v1')
// El anfitrión (host) recibe la escena, la cámara y la función de cada fotograma: { attach(scene, camera, update),
// detach() }. Sin anfitrión, el módulo crea su propio WebGLRenderer a pantalla completa (página de pruebas).
import * as THREE from 'three';
import { FutbolMatch } from './match.js';
import { menuPanel } from './hud.js';
import { VENUES, TEAMS, RETOS, CAREER_KEY } from './rules.js';
export { FutbolGame } from './game.js';
export { FIELD, PHYS, PLAYER, LEVELS, TEAMS, VENUES, RETOS } from './rules.js';
export const VERSION = '2.0.0';

const career = {
  data: null,
  load() {
    if (this.data) return this.data;
    let d = null; try { d = JSON.parse(localStorage.getItem(CAREER_KEY) || 'null'); } catch (e) { }
    this.data = { v: 1, tutorial: false, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pens: { won: 0, lost: 0 }, retos: {}, ...(d || {}) };
    return this.data;
  },
  save() { try { localStorage.setItem(CAREER_KEY, JSON.stringify(this.data)); } catch (e) { } },
  record(r) {
    const d = this.load();
    if (r.mode === 'reto') { const b = d.retos[r.reto] ||= { best: null, done: false }; b.done ||= r.win; b.best = b.best === null ? r.value : r.reto === 'conos' ? Math.min(b.best, r.value) : Math.max(b.best, r.value); }
    else if (r.mode === 'penalties') { r.win ? d.pens.won++ : d.pens.lost++; }
    else if (!r.quit) { d.played++; d.gf += r.you || 0; d.ga += r.cpu || 0; r.win ? d.won++ : r.draw ? d.drawn++ : d.lost++; }
    this.save();
  },
  set(k, v) { this.load()[k] = v; this.save(); },
};

// anfitrión propio: un lienzo a pantalla completa con su WebGLRenderer
function ownHost() {
  let renderer, raf = 0, last = 0, wrap;
  return {
    attach(scene, camera, update) {
      wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;z-index:800;background:#000';
      renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      wrap.appendChild(renderer.domElement); document.body.appendChild(wrap);
      const onResize = () => renderer.setSize(innerWidth, innerHeight); addEventListener('resize', onResize); this.onResize = onResize;
      const loop = (t) => { raf = requestAnimationFrame(loop); const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60; last = t; update(dt); renderer.render(scene, camera); };
      raf = requestAnimationFrame(loop);
      window.__futbolRenderer = renderer;
    },
    detach() { cancelAnimationFrame(raf); removeEventListener('resize', this.onResize); renderer?.dispose(); renderer?.forceContextLoss?.(); wrap?.remove(); },
  };
}

export const FutbolSystem = {
  cfg: { quality: 'high' },
  career: { get data() { return career.load(); }, record: (r) => career.record(r), set: (k, v) => career.set(k, v) },
  /** Configuración: personajes del juego (makeCharacter), público (crowd), anfitrión, calidad, táctil y audio. */
  init(cfg = {}) {
    this.cfg = { ...this.cfg, ...cfg };
    if (cfg.makeCharacter && cfg.animateCharacter) { const mk = cfg.makeCharacter, an = cfg.animateCharacter; this.cfg.makeCharacter = async (d) => { const c = await mk(d); if (c && !c.anim) c.anim = { setSpeed: (v) => an(c, 'speed', v), once: (n, s) => an(c, n, s), update: (dt) => an(c, 'update', dt) }; return c; }; }
    return this;
  },
  async play(opts) {
    const C = this.cfg, data = career.load();
    const m = new FutbolMatch({ ...opts, makeCharacter: C.makeCharacter, crowd: C.crowd, quality: C.quality, touch: C.touch, audio: C.audio,
      tutorial: opts.mode === 'match' && !data.tutorial && !opts.autoplay, onResult: (r) => career.record(r), onTutorialDone: () => career.set('tutorial', true) });
    window.__futbol = m;
    await C.host?.before?.();
    try { await m.load(); }
    catch (e) { console.error('[fútbol] carga', e); m.dispose(); await C.host?.after?.(); return { quit: true, error: String(e) }; }
    const host = C.host || ownHost();
    host.attach(m.scene, m.camera, (dt) => m.update(dt));
    await C.host?.shown?.();
    let res;
    try { res = await m.run(); } finally { host.detach(); m.dispose(); window.__futbol = null; await C.host?.after?.(); }
    return res;
  },
  startMatch({ campoId = 'sadar', modo = 'amistoso', rival, dificultad = 'normal', duracion = 3, asistencia = true, autoplay = false, timeScale = 1, seed } = {}) {
    const V = VENUES[campoId] || VENUES.sadar;
    return this.play({ mode: 'match', venue: V.id, home: V.home, away: rival || V.away, level: dificultad, duration: duracion, assist: asistencia, cup: modo === 'eliminatoria', autoplay, timeScale, seed });
  },
  startPenaltis({ campoId = 'sadar', rival, tiros = 5, dificultad = 'normal', autoplay = false } = {}) {
    const V = VENUES[campoId] || VENUES.sadar;
    return this.play({ mode: 'penalties', venue: V.id, home: V.home, away: rival || V.away, kicks: tiros, level: dificultad, autoplay });
  },
  startReto({ campoId = 'sadar', reto = 'conos' } = {}) {
    const V = VENUES[campoId] || VENUES.sadar;
    return this.play({ mode: 'reto', reto, venue: V.id, home: V.home, away: V.away, level: 'normal' });
  },
  /** Menú previo: modo (partido, penaltis o un reto), rival, dificultad, duración y asistencia. */
  async openMenu({ campoId = 'sadar', title, sub } = {}) {
    const V = VENUES[campoId] || VENUES.sadar, d = career.load();
    const rivals = Object.values(TEAMS).filter(t => t.id !== V.home && (V.env === 'estadio' ? t.model : true)).map(t => [t.id, t.name]);
    const modes = [['match', 'Partido'], ['cup', 'Eliminatoria'], ['penalties', 'Penaltis'], ...Object.values(RETOS).map(r => ['reto:' + r.id, r.name + (d.retos[r.id]?.done ? ' ✓' : '')])];
    const v = await menuPanel({ title: title || V.name, sub: sub || (V.town || 'Fútbol sala'), modes, rivals, values: { mode: 'match', rival: V.away, level: 'normal', duration: 3, assist: true } });
    if (!v) return { quit: true };
    if (v.mode.startsWith('reto:')) return this.startReto({ campoId, reto: v.mode.slice(5) });
    if (v.mode === 'penalties') return this.startPenaltis({ campoId, rival: v.rival, dificultad: v.level });
    return this.startMatch({ campoId, modo: v.mode === 'cup' ? 'eliminatoria' : 'amistoso', rival: v.rival, dificultad: v.level, duracion: v.duration, asistencia: v.assist });
  },
};
