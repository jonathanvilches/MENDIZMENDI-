// Los instrumentos de Navarra (data/instrumentos.js) sintetizados con el Web Audio del juego, sin muestras grabadas:
// cada uno con su timbre (el txistu, aire y armónicos; la gaita, lengüeta doble con su nasal; la txalaparta, madera que
// resuena; el ttun-ttun, cuerdas graves golpeadas; el pandero, parche y sonajas; la bandurria, púa y cuerdas dobles; la
// trikitixa, lengüetas desafinadas entre sí y fuelle). Todo se programa en el reloj del audio (at: segundos del contexto)
// para que el minijuego vaya a tiempo. S es el Sound del juego (audio.js): ctx, sfx (salida de efectos), verb y noiseBuf.
const F = { Do: 523.25, Re: 587.33, Mi: 659.25, Fa: 698.46, Sol: 783.99, La: 880, Si: 987.77, 'Do′': 1046.5, 'Re′': 1174.66, 'Mi′': 1318.51 };
const freq = (label, oct = 0) => (F[label] || 523.25) * Math.pow(2, oct);

function osc(S, type, f, at, dur, vol, dest, { attack = 0.01, release = 0.06, detune = 0, lp = 0 } = {}) {
  const ctx = S.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, at); o.detune.value = detune;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + attack); g.gain.setValueAtTime(vol, Math.max(at + attack, at + dur - release)); g.gain.linearRampToValueAtTime(0.0001, at + dur);
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(g); } else o.connect(g);
  g.connect(dest); o.start(at); o.stop(at + dur + 0.05); return o;
}
function noise(S, at, dur, f, q, vol, dest, type = 'bandpass') {
  const ctx = S.ctx, s = ctx.createBufferSource(); s.buffer = S.noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(fl); fl.connect(g); g.connect(dest); s.start(at, Math.random() * 1.5); s.stop(at + dur + 0.05);
}
const verb = (S, g, amt = 0.25) => { if (S.verb && amt > 0) { const v = S.ctx.createGain(); v.gain.value = amt; g.connect(v); v.connect(S.verb); } };
// una salida con su eco: los instrumentos no van al bus de música (que se apaga en el minijuego) sino al de efectos
function bus(S, amt = 0.25) { const g = S.ctx.createGain(); g.gain.value = 1; g.connect(S.sfx); verb(S, g, amt); return g; }

// ---- timbres ----
// txistu / txirula: fundamental con vibrato, algo de octava y el soplo al empezar
function flauta(S, f, at, dur, vol = 0.11, bright = 0.2) {
  const ctx = S.ctx, d = bus(S, 0.3);
  const o = osc(S, 'sine', f, at, dur, vol, d, { attack: 0.03, release: 0.05 });
  const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o.frequency); vib.start(at); vib.stop(at + dur + 0.05);
  osc(S, 'triangle', f * 2, at, dur, vol * bright, d, { attack: 0.03, release: 0.05 });
  noise(S, at, 0.06, 3200, 1, 0.035, d);
}
// gaita (dulzaina): diente de sierra por un filtro de paso de banda (el formante nasal) y un paso bajo
function gaita(S, f, at, dur, vol = 0.07) {
  const ctx = S.ctx, d = bus(S, 0.22), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 1.6;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; bp.connect(lp); lp.connect(d);
  const o = osc(S, 'sawtooth', f, at, dur, vol, bp, { attack: 0.025, release: 0.05 });
  osc(S, 'sawtooth', f, at, dur, vol * 0.5, bp, { attack: 0.025, release: 0.05, detune: 6 });
  const vib = ctx.createOscillator(); vib.frequency.value = 6; const vg = ctx.createGain(); vg.gain.value = f * 0.004; vib.connect(vg); vg.connect(o.frequency); vib.start(at); vib.stop(at + dur + 0.05);
}
// madera golpeada (txalaparta, kirikoketa): parciales no armónicos que se apagan rápido y el chasquido del palo
function madera(S, f, at, vol = 0.22, dec = 0.32) {
  const d = bus(S, 0.2);
  for (const [k, a, dk] of [[1, 1, 1], [2.4, 0.45, 0.6], [4.1, 0.2, 0.4]]) osc(S, 'sine', f * k, at, dec * dk, vol * a, d, { attack: 0.002, release: dec * dk * 0.8 });
  noise(S, at, 0.03, 2600, 0.8, vol * 0.5, d);
}
// cuerdas graves golpeadas (ttun-ttun): tónica, quinta y octava con zumbido, ataque seco
function bordon(S, at, vol = 0.16) {
  const d = bus(S, 0.25);
  for (const [f, a] of [[110, 1], [165, 0.55], [220, 0.4]]) osc(S, 'triangle', f, at, 0.55, vol * a, d, { attack: 0.004, release: 0.45 });
  osc(S, 'sawtooth', 110, at, 0.3, vol * 0.12, d, { attack: 0.004, release: 0.25, lp: 900 });
  noise(S, at, 0.03, 1800, 0.7, vol * 0.4, d);
}
// cuerda pulsada (bandurria: dos cuerdas por nota, algo desafinadas; guitarra: más grave y suave)
function pulsada(S, f, at, dur = 0.6, vol = 0.1, doble = true) {
  const ctx = S.ctx, d = bus(S, 0.18), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, at); lp.frequency.exponentialRampToValueAtTime(500, at + dur); lp.connect(d);
  osc(S, 'triangle', f, at, dur, vol, lp, { attack: 0.004, release: dur * 0.9 });
  if (doble) osc(S, 'triangle', f, at, dur, vol * 0.7, lp, { attack: 0.004, release: dur * 0.9, detune: 7 });
  noise(S, at, 0.02, 3000, 0.8, vol * 0.3, d);
}
// lengüetas libres (trikitixa): dos voces desafinadas, filtro cerrado y el vaivén del fuelle
function reed(S, f, at, dur, vol = 0.06) {
  const ctx = S.ctx, d = bus(S, 0.2), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.connect(d);
  osc(S, 'square', f, at, dur, vol * 0.55, lp, { attack: 0.02, release: 0.07 });
  osc(S, 'sawtooth', f, at, dur, vol * 0.6, lp, { attack: 0.02, release: 0.07, detune: 9 });
  osc(S, 'sawtooth', f, at, dur, vol * 0.45, lp, { attack: 0.02, release: 0.07, detune: -8 });
}
// percusión: tamboril (parche grave), redoblante (bordones), pandero (palma, dedos, sonajas)
function tamboril(S, at, strong) { const d = bus(S, 0.12); noise(S, at, 0.08, 240, 1.1, strong ? 0.32 : 0.2, d); osc(S, 'sine', strong ? 150 : 130, at, 0.09, strong ? 0.2 : 0.12, d, { attack: 0.002, release: 0.07 }); }
function redoblante(S, at, strong) { const d = bus(S, 0.15); noise(S, at, strong ? 0.11 : 0.06, 1900, 0.6, strong ? 0.3 : 0.14, d, 'highpass'); noise(S, at, 0.05, 380, 1, strong ? 0.2 : 0.08, d); }
function palma(S, at) { const d = bus(S, 0.1); noise(S, at, 0.07, 420, 1, 0.3, d, 'lowpass'); osc(S, 'sine', 190, at, 0.08, 0.2, d, { attack: 0.002, release: 0.07 }); }
function dedos(S, at) { const d = bus(S, 0.1); for (let k = 0; k < 3; k++) noise(S, at + k * 0.045, 0.03, 2200, 1.2, 0.16, d); }
function sonajas(S, at) { const d = bus(S, 0.15); noise(S, at, 0.14, 6500, 0.5, 0.18, d, 'highpass'); for (const f of [5200, 6800, 8100]) osc(S, 'sine', f, at, 0.12, 0.03, d, { attack: 0.002, release: 0.1 }); }
function click(S, at, strong) { const d = bus(S, 0); noise(S, at, 0.025, strong ? 1500 : 2500, 1.5, strong ? 0.12 : 0.07, d); }

const LANE = {
  txistu: (S, i, at, dur) => flauta(S, freq(['Sol', 'La', 'Si', 'Re′'][i]), at, dur),
  gaita: (S, i, at, dur) => gaita(S, freq(['Do', 'Re', 'Mi', 'Sol'][i]), at, dur),
  txalaparta: (S, i, at) => madera(S, i ? 262 : 196, at),
  ttunttun: (S, i, at, dur) => i === 0 ? bordon(S, at) : flauta(S, freq(['Do′', 'Mi′'][i - 1]), at, dur, 0.07, 0.3),
  pandero: (S, i, at) => [palma, dedos, sonajas][i](S, at),
  bandurria: (S, i, at) => pulsada(S, freq(['Mi', 'Sol', 'La', 'Si'][i]), at),
  trikitixa: (S, i, at, dur) => reed(S, freq(['Do', 'Mi', 'Sol', 'Do′'][i]), at, dur),
  kirikoketa: (S, i, at) => madera(S, [110, 147, 196][i], at, 0.24, 0.26),
};
/** Toca lo del carril i del instrumento, en el instante at del reloj del audio (ahora si no se da). */
export function tocarNota(S, inst, i, at = null, dur = 0.3) {
  if (!S?.ctx) return; const f = LANE[inst.id]; if (f) f(S, i, at ?? S.ctx.currentTime, dur);
}
/** El acompañamiento de un compás que empieza en at: bar (número de compás), eighth (duración de una corchea). */
export function acompanar(S, inst, bar, at, eighth) {
  if (!S?.ctx) return; const k = inst.game.backing, m = inst.game.meter, beat = eighth * 2;
  if (k === 'tamboril') for (let b = 0; b < m; b++) { tamboril(S, at + b * beat, b === 0); if (b === m - 1) tamboril(S, at + b * beat + eighth, false); }
  else if (k === 'redoblante') for (let b = 0; b < m; b++) { redoblante(S, at + b * beat, b === 0); redoblante(S, at + b * beat + eighth, false); }
  else if (k === 'ttakun') for (let b = 0; b < m; b++) { madera(S, 147, at + b * beat, 0.2); madera(S, 147, at + b * beat + eighth * 0.5, 0.17); }   // (dos golpes seguidos: el ttakun)
  else if (k === 'guitarra') { pulsada(S, bar % 2 ? 82.4 : 110, at, 0.5, 0.09, false); for (let b = 1; b < m; b++) for (const f of [220, 277, 330]) pulsada(S, f, at + b * beat + Math.random() * 0.01, 0.25, 0.035, false); }
  else if (k === 'bajos') { reed(S, bar % 2 ? 98 : 130.8, at, beat * 0.9, 0.05); for (let b = 1; b < m; b++) for (const f of [261.6, 329.6, 392]) reed(S, f, at + b * beat, beat * 0.5, 0.022); }
  else for (let b = 0; b < m; b++) click(S, at + b * beat, b === 0);   // (pulso: un tic suave que lleva el tiempo)
}
/** La frase entera con su acompañamiento, para escucharla en la ficha: devuelve cuánto dura. */
export function muestra(S, inst, notas) {
  if (!S?.ctx) return 0; const g = inst.game, eighth = 60 / g.bpm / 2, bar = eighth * 2 * g.meter, at0 = S.ctx.currentTime + 0.08;
  const total = Math.ceil((notas.at(-1).i + 1) / (g.meter * 2)) * g.meter * 2;
  for (let b = 0; b * g.meter * 2 < total; b++) acompanar(S, inst, b, at0 + b * bar, eighth);
  for (const n of notas) tocarNota(S, inst, n.lane, at0 + n.i * eighth, eighth * 1.8);
  return total * eighth + 0.5;
}
