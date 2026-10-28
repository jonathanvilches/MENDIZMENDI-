// Sonido procedural con Web Audio: ambiente (río, viento, pájaros), pasos, animales, campanas y música
import { riverInfo, PLACES } from './world/layout.js';
import { clamp } from './util/math.js';
import { Musica } from './audio/pistas.js';

// --- la música por ambientes: solo las canciones grabadas (src/assets/sonidos, src/audio/pistas.js). La música
// sintetizada de antes ya no está: sonaba en los ambientes que no tenían canción y se mezclaba con las nuevas ---
// (explore: el pueblo de día · night y mystery: de noche, las leyendas y el monte · tension: el encierro y las
// persecuciones · game: los minijuegos · fiesta: San Fermín, el carnaval y los bailes · sport: los partidos y los
// campeonatos · inicio: el menú · torneos: la pantalla de Torneos · none: nada)
const MUSICA = { explore: 'musica-juego', night: 'musica-juego', mystery: 'musica-juego', tension: 'musica-juego', game: 'musica-juego', fiesta: 'musica-juego',
  sport: 'musica-torneos', inicio: 'musica-inicio', torneos: 'musica-torneos' };

export class Sound {
  constructor() {
    this.ctx = null; this.enabled = true; this.musicOn = true;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.birdT = 1; this.bellT = 5;
  }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.32; this.musicBus.connect(this.master);
    // reverb sencilla
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.2); const vg = ctx.createGain(); vg.gain.value = 0.25; this.verb.connect(vg); vg.connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    // río: ruido filtrado en bucle
    this.river = this.loopNoise(700, 0.9); this.river.g.gain.value = 0;
    // viento
    this.wind = this.loopNoise(300, 0.4); this.wind.g.gain.value = 0.02;
    this.startMusic();   // (su reloj, cada cuarto de segundo, también apaga el ambiente que el pueblo ya no manda: quietAmbient)
    // (las canciones; la que toca empieza aquí, dentro del primer toque, que es cuando el iPhone deja sonar, y las otras
    // se van cargando ya: al cambiar de pantalla, la nueva entra sin esperar a que llegue)
    this.pistas = new Musica(ctx, this.musicBus); if (this.musicOn && MUSICA[this.mood]) this.pistas.arranca(MUSICA[this.mood]);
    this.pistas.prepara(new Set(Object.values(MUSICA)));
  }
  impulse(sec) {
    const ctx = this.ctx, len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  makeNoise(sec) {
    const ctx = this.ctx, b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
    return b;
  }
  loopNoise(freq, q) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start();
    return { src, f, g };
  }
  // posición 3D simple: atenuación + panorama
  spatial(pos, maxD = 40) {
    if (!pos) return { gain: 1, pan: 0 };
    const dx = pos.x - this.listener.x, dz = pos.z - this.listener.z, d = Math.hypot(dx, dz);
    const gain = clamp(1 - d / maxD, 0, 1) ** 1.5;
    const ang = Math.atan2(dx, dz) - this.listener.yaw;
    return { gain, pan: clamp(-Math.sin(ang), -1, 1) * 0.8 };
  }
  out(pos, maxD, vol = 1, verb = 0) {
    const ctx = this.ctx, s = this.spatial(pos, maxD);
    if (s.gain * vol < 0.005) return null;
    const g = ctx.createGain(); g.gain.value = s.gain * vol;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = s.pan; g.connect(p); p.connect(this.sfx); if (verb) { const vg = ctx.createGain(); vg.gain.value = verb; p.connect(vg); vg.connect(this.verb); } }
    else g.connect(this.sfx);
    return g;
  }
  tone(freq, dur, type, vol, dest, t0 = 0, attack = 0.005, glide) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noiseBurst(dur, freq, q, vol, dest, t0 = 0, type = 'bandpass') {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  // ---- efectos ----
  step(surf, speed) {
    if (!this.ctx) return;
    const v = 0.18 + clamp(speed / 7, 0, 1) * 0.15;
    const d = this.sfx;
    if (surf === 'stone') { this.noiseBurst(0.07, 1800, 1.2, v * 0.9, d); this.tone(140 + Math.random() * 30, 0.05, 'triangle', v * 0.3, d); }
    else if (surf === 'wood') { this.tone(190 + Math.random() * 40, 0.1, 'triangle', v * 0.7, d); this.noiseBurst(0.05, 900, 2, v * 0.3, d); }
    else if (surf === 'water') { this.noiseBurst(0.22, 1300, 0.7, v * 1.1, d); this.noiseBurst(0.15, 3000, 1, v * 0.5, d, 0.04); }
    else if (surf === 'leaves') { this.noiseBurst(0.16, 2600, 0.6, v * 0.9, d); }
    else if (surf === 'dirt') { this.noiseBurst(0.09, 900, 0.9, v * 0.9, d); }
    else this.noiseBurst(0.12, 2100, 0.5, v * 0.55, d);
  }
  jump() { if (this.ctx) this.noiseBurst(0.12, 1200, 0.8, 0.12, this.sfx); }
  land(v) { if (this.ctx) { this.noiseBurst(0.15, 500, 0.8, clamp(v / 10, 0.1, 0.4), this.sfx); } }
  splash(pos, v = 0.5) { if (!this.ctx) return; const o = this.out(pos, 30, v); if (o) { this.noiseBurst(0.35, 1500, 0.5, 1, o); this.noiseBurst(0.2, 3500, 1, 0.5, o, 0.05); } }
  ui(kind = 'click') {
    if (!this.ctx) return;
    const d = this.sfx;
    if (kind === 'click') this.tone(880, 0.06, 'sine', 0.12, d);
    else if (kind === 'open') { this.tone(520, 0.08, 'sine', 0.1, d); this.tone(780, 0.1, 'sine', 0.1, d, 0.05); }
    else if (kind === 'talk') this.tone(420 + Math.random() * 200, 0.05, 'triangle', 0.05, d);
    else if (kind === 'coin') { this.tone(988, 0.08, 'square', 0.06, d); this.tone(1319, 0.25, 'square', 0.06, d, 0.07); }
    else if (kind === 'card') { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, d, i * 0.07)); }
    else if (kind === 'error') this.tone(200, 0.15, 'square', 0.06, d, 0, 0.005, 150);
    else if (kind === 'photo') { this.noiseBurst(0.05, 4000, 1, 0.3, d); this.tone(1200, 0.04, 'square', 0.05, d, 0.06); }
  }
  fanfare() {
    if (!this.ctx) return;
    const d = this.sfx, notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((f, i) => { this.tone(f, 0.35, 'triangle', 0.14, d, i * 0.11); this.tone(f / 2, 0.35, 'sine', 0.08, d, i * 0.11); });
  }
  baa(pos) { if (!this.ctx) return; const o = this.out(pos, 35, 0.5); if (!o) return; const f0 = 280 + Math.random() * 120; const osc = this.tone(f0, 0.7, 'sawtooth', 0.12, o, 0, 0.05); const lfo = this.ctx.createOscillator(); lfo.frequency.value = 22; const lg = this.ctx.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(); lfo.stop(this.ctx.currentTime + 0.8); }
  oink(pos) { if (!this.ctx) return; const o = this.out(pos, 30, 0.5); if (!o) return; for (let i = 0; i < 2; i++) this.tone(150 + Math.random() * 40, 0.16, 'sawtooth', 0.12, o, i * 0.2, 0.02, 95); }
  // encierro: bufido de toro y retumbar de pezuñas sobre el adoquín
  snort(v = 0.6) { if (!this.ctx) return; this.noiseBurst(0.45, 380, 0.7, 0.5 * v, this.sfx, 0, 'lowpass'); this.tone(70, 0.5, 'sawtooth', 0.08 * v, this.sfx, 0.02, 0.04, 48); }
  hooves(v = 0.5) { if (!this.ctx) return; for (let i = 0; i < 4; i++) { this.noiseBurst(0.05, 160 + Math.random() * 120, 1.2, v * (0.6 + Math.random() * 0.4), this.sfx, i * 0.075); this.tone(55, 0.06, 'sine', 0.2 * v, this.sfx, i * 0.075); } }
  moo(pos) { if (!this.ctx) return; const o = this.out(pos, 50, 0.6); if (!o) return; this.tone(110, 1.3, 'sawtooth', 0.14, o, 0, 0.2, 85); }
  bark(pos) { if (!this.ctx) return; const o = this.out(pos, 45, 0.7); if (!o) return; for (let i = 0; i < 2; i++) { this.tone(420, 0.1, 'square', 0.12, o, i * 0.18, 0.005, 250); this.noiseBurst(0.08, 900, 1, 0.3, o, i * 0.18); } }
  cowbell(pos, v = 0.4) { if (!this.ctx) return; const o = this.out(pos, 45, v, 0.3); if (!o) return; const f = 520 + Math.random() * 90; this.tone(f, 0.5, 'square', 0.05, o); this.tone(f * 1.48, 0.4, 'triangle', 0.05, o); this.tone(f * 2.7, 0.2, 'sine', 0.03, o); }
  woodpecker(pos) { if (!this.ctx) return; const o = this.out(pos, 70, 0.8, 0.5); if (!o) return; for (let i = 0; i < 16; i++) this.noiseBurst(0.025, 1400, 3, 0.5 * (1 - i / 20), o, i * 0.055); }
  bird(pos) {
    if (!this.ctx) return; const o = this.out(pos, 50, 0.35, 0.3); if (!o) return;
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 5), kind = Math.random();
    for (let i = 0; i < n; i++) {
      const t = i * (0.08 + Math.random() * 0.06);
      if (kind < 0.5) this.tone(base, 0.07, 'sine', 0.1, o, t, 0.005, base * (1.3 + Math.random() * 0.4));
      else this.tone(base * 1.2, 0.09, 'sine', 0.1, o, t, 0.005, base * 0.8);
    }
  }
  cuckoo(pos) { if (!this.ctx) return; const o = this.out(pos, 90, 0.5, 0.5); if (!o) return; for (let r = 0; r < 2; r++) { this.tone(650, 0.2, 'sine', 0.1, o, r * 0.9, 0.02, 630); this.tone(540, 0.32, 'sine', 0.1, o, r * 0.9 + 0.26, 0.02, 520); } }
  owl(pos) { if (!this.ctx) return; const o = this.out(pos, 80, 0.4, 0.6); if (!o) return; this.tone(380, 0.35, 'sine', 0.12, o, 0, 0.05, 360); this.tone(380, 0.6, 'sine', 0.12, o, 0.5, 0.05, 350); }
  // sonido propio de cada criatura: 'call' al avisar de que se mueve, 'ambient' de fondo
  creature(who, kind, pos) {
    if (!this.ctx) return; const o = this.out(pos, 70, kind === 'call' ? 0.9 : 0.55, 0.7); if (!o) return;
    if (who === 'lamia') { this.tone(620, 1.1, 'sine', 0.08, o, 0, 0.2, kind === 'call' ? 980 : 700); this.tone(930, 0.9, 'sine', 0.04, o, 0.15, 0.3, 860); }
    else if (who === 'momotxorro') { for (let i = 0; i < (kind === 'call' ? 4 : 2); i++) this.cowbell(pos, 0.6); if (kind === 'call') this.noiseBurst(0.3, 300, 0.6, 0.35, o); }
    else { this.tone(62, kind === 'call' ? 1.2 : 0.8, 'sawtooth', 0.12, o, 0, 0.15, 48); this.noiseBurst(kind === 'call' ? 0.9 : 0.5, 180, 0.5, 0.3, o, 0, 'lowpass'); }
  }
  cricket() { if (!this.ctx) return; for (let i = 0; i < 3; i++) this.tone(4200, 0.03, 'sine', 0.015, this.sfx, i * 0.05); }
  // campana de la iglesia: tono grave con armónicos que se apagan despacio
  churchBell(n = 3) { if (!this.ctx) return; for (let i = 0; i < n; i++) { const t = i * 1.1; this.tone(392, 2.6, 'sine', 0.16, this.sfx, t, 0.004); this.tone(392 * 2.4, 1.6, 'sine', 0.06, this.sfx, t, 0.004); this.tone(392 * 0.5, 3, 'sine', 0.09, this.sfx, t, 0.01); this.tone(392 * 3.1, 0.8, 'triangle', 0.03, this.sfx, t, 0.002); } }
  magic() { if (!this.ctx) return; [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.06, this.sfx, i * 0.06)); }
  whoosh() { if (this.ctx) this.noiseBurst(0.4, 600, 0.4, 0.2, this.sfx, 0, 'lowpass'); }
  // público del estadio: rumor de muchas voces (ruido filtrado) que sube con las ocasiones y estalla en los goles
  crowd(v = 0.3) { if (!this.ctx) return; this.noiseBurst(1.3, 700, 0.6, 0.12 * v, this.sfx, 0, 'bandpass'); this.noiseBurst(1.1, 1500, 0.8, 0.05 * v, this.sfx, 0.1, 'bandpass'); }
  pelota(v = 1) { if (this.ctx) { this.tone(160, 0.08, 'sine', 0.3 * v, this.sfx); this.noiseBurst(0.06, 2500, 1.2, 0.5 * v, this.sfx); } }
  // ---- ambiente continuo ----
  update(dt, player, camYaw, night, inIrati, sport = false, bosque = false) {
    if (!this.ctx) return;
    // (una posición sin número, por un salto raro o un fallo, no puede romper el bucle del juego: se ignora)
    if (!Number.isFinite(player.pos.x) || !Number.isFinite(player.pos.y) || !Number.isFinite(player.pos.z)) return;
    const L = this.listener; L.x = player.pos.x; L.y = player.pos.y; L.z = player.pos.z; L.yaw = camYaw + Math.PI; this.ambAt = performance.now(); this.ambQuiet = false;
    const r = riverInfo(player.pos.x, player.pos.z);
    const wf = PLACES.waterfall, dp = wf ? Math.hypot(player.pos.x - wf.x, player.pos.z - wf.z) : 1e9;
    const rv = clamp(1 - r.edge / 30, 0, 1) ** 1.6 * 0.5 + clamp(1 - dp / 60, 0, 1) ** 1.5 * 0.7;
    if (Number.isFinite(rv)) this.river.g.gain.setTargetAtTime(sport ? 0 : rv, this.ctx.currentTime, sport ? 0.12 : 0.3);
    // (en los deportes, sin viento; y la altura solo cuenta en el monte: en los recintos de los partidos, a 2400 m, el viento sonaba a tope y parecía lluvia)
    this.wind.g.gain.setTargetAtTime(sport || player.pos.y > 900 ? 0 : 0.03 + clamp((player.pos.y - 20) / 60, 0, 0.1), this.ctx.currentTime, sport ? 0.12 : 0.5);
    this.birdT -= dt;
    if (this.birdT < 0) {
      this.birdT = night > 0.5 ? 2 + Math.random() * 6 : (inIrati ? 0.6 : 1.2) + Math.random() * 2.5;
      const a = Math.random() * 6.28, d = 8 + Math.random() * 25;
      const p = { x: player.pos.x + Math.cos(a) * d, z: player.pos.z + Math.sin(a) * d };
      if (night > 0.5) { if (Math.random() < (inIrati ? 0.5 : 0.3)) this.owl(p); else this.cricket(); }
      else this.bird(p);
    }
    // monte adentro, de día: de vez en cuando el tamborileo del pito negro o el cuco, lejos
    if (inIrati && night < 0.5 && !sport && (this.drumT = (this.drumT ?? 8) - dt) < 0) {
      this.drumT = (bosque ? 16 : 30) + Math.random() * 30;
      const a = Math.random() * 6.28, p = { x: player.pos.x + Math.cos(a) * 35, z: player.pos.z + Math.sin(a) * 35 };
      if (Math.random() < 0.6) this.woodpecker(p); else this.cuckoo(p);
    }
  }
  // ---- la música: la canción de cada ambiente (MUSICA), que cambia con un fundido ----
  setMood(m) { if (m && m !== this.mood) { this.mood = m; this.moodT = 0; } }
  startMusic() {
    this.mood = this.mood || 'explore'; this.musCur = this.mood;
    this.musicTimer = setInterval(() => this.musicTick(), 250);
  }
  // cada cuarto de segundo, la canción que toca; al pasar a sin música o al volver, el bus se funde
  musicTick() {
    const ctx = this.ctx;
    this.quietAmbient();
    if (!this.musicOn || document.hidden) { this.pistas?.pausa(true); return; }
    this.pistas?.pausa(false);
    this.pistas?.quiere(this.mood === 'none' ? null : MUSICA[this.mood] || MUSICA.explore);
    if (this.mood !== this.musCur) {
      this.musCur = this.mood; const g = this.musicBus.gain, t = ctx.currentTime; g.cancelScheduledValues(t);
      if (this.mood === 'none') g.setTargetAtTime(0, t, 0.35);
      else if ((this.duckUntil || 0) > t) { g.setTargetAtTime(0, t, 0.08); g.setTargetAtTime(0.32, this.duckUntil, 0.4); }   // (apartada: vuelve al acabar)
      else g.setTargetAtTime(0.32, t, 0.3);
    }
  }
  setMusic(on) { this.musicOn = on; if (this.musicBus) { const t = this.ctx.currentTime, g = this.musicBus.gain, d = (this.duckUntil || 0) > t; g.cancelScheduledValues(t); g.setTargetAtTime(on && !d ? 0.32 : 0, t, 0.3); if (on && d) g.setTargetAtTime(0.32, this.duckUntil, 0.4); } }
  /** La música se aparta s segundos (al escuchar un instrumento en su ficha: antes sonaban los dos a la vez) y vuelve sola. */
  duck(s) {
    if (!this.musicBus) return; const t = this.ctx.currentTime, g = this.musicBus.gain;
    this.duckUntil = t + s; g.cancelScheduledValues(t); g.setTargetAtTime(0, t, 0.08); if (this.musicOn) g.setTargetAtTime(0.32, this.duckUntil, 0.4);
  }
  // trueno: si el rayo cae cerca, primero un chasquido seco; luego el retumbar grave y largo, que va y viene (ruido muy
  // filtrado con varios golpes) y resuena en el eco. dist en metros: más lejos, más tarde, más grave y más flojo
  thunder(dist = 600, pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, near = clamp(1 - dist / 1400, 0.2, 1), t0 = dist / 343;
    const bus = ctx.createGain(); bus.gain.value = 0.85 * near;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; bus.connect(p); p.connect(this.sfx); const vg = ctx.createGain(); vg.gain.value = 0.6; p.connect(vg); vg.connect(this.verb); } else bus.connect(this.sfx);
    if (dist < 650) this.noiseBurst(0.4, 1800, 0.5, 0.45 * near, bus, t0, 'highpass');
    const t = ctx.currentTime + t0 + 0.06, dur = 4 + Math.random() * 3;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = 0.3 + Math.random() * 0.15;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150 + 250 * near; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.15);
    let k = t + 0.15; for (let i = 0; i < 4; i++) { k += dur * 0.16 * (0.6 + Math.random() * 0.6); g.gain.exponentialRampToValueAtTime(0.2 + Math.random() * 0.7, k); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.1);
  }
  // (sutil: un rumor suave de fondo, más grave y más bajo que antes, que no tapa nada; fast, para callarla enseguida al
  // empezar un partido)
  setRain(k, fast = false) { if (!this.ctx) return; this.rainAt = performance.now(); this.rainQuiet = false; if (!this.rain && k > 0) this.rain = this.loopNoise(1900, 0.5); if (this.rain) this.rain.g.gain.setTargetAtTime(k * 0.03, this.ctx.currentTime, fast ? 0.12 : 0.6); }
  // el ambiente del pueblo (lluvia, río y viento) lo manda el pueblo en cada fotograma: si deja de mandarlo (en el menú,
  // en el fútbol desde Torneos, al salir del pueblo), se apaga solo; antes se quedaba sonando como estaba (1,5 s: un
  // tirón del pueblo en un móvil lento no lo corta)
  quietAmbient() {
    const now = performance.now(), t = this.ctx.currentTime;
    if (this.rain && !this.rainQuiet && now - (this.rainAt || 0) > 1500) { this.rainQuiet = true; this.rain.g.gain.setTargetAtTime(0, t, 0.12); }
    if (!this.ambQuiet && now - (this.ambAt || 0) > 1500) { this.ambQuiet = true; this.river.g.gain.setTargetAtTime(0, t, 0.12); this.wind.g.gain.setTargetAtTime(0, t, 0.12); }
  }
  setVolume(v) { if (this.master) this.master.gain.value = v; }
}
