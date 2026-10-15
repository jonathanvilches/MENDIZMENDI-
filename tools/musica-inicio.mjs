// Graba la música de un ambiente (el tema de inicio por defecto) con un contexto de audio fuera de línea, sin esperar en
// tiempo real: la Sound de src/audio.js con su reloj de compases llamado a mano (musicTick) en cada cuarto de segundo
// de la grabación. Escribe el WAV (mono, 44,1 kHz) y mide el nivel por segundos y el pico, para oírla y para comparar
// su volumen con el de los demás ambientes. Con SOLO=horn,strings,… solo suenan esos instrumentos (para medir cada capa
// del tema de inicio) y con COMPAS=n empieza en ese compás.
// Uso: node tools/musica-inicio.mjs <salida.wav> [ambiente] [segundos]   (servidor de pruebas en 5173, u otro con PUERTO=…)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const [,, out = 'entrega/inicio.wav', mood = 'inicio', secs = '70'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:' + (process.env.PUERTO || 5173) + '/src/audio.js', { timeout: 120000 });   // (una página del servidor: solo para importar el módulo)
const r = await p.evaluate(async ({ mood, dur, solo, compas }) => {
  const { Sound } = await import('/src/audio.js');
  const SR = 44100, ctx = new OfflineAudioContext(1, Math.ceil(SR * dur), SR);
  window.AudioContext = function () { return ctx; };   // (la Sound se hace su contexto con new AudioContext())
  const s = new Sound(); s.init(); clearInterval(s.musicTimer); s.musicOn = true;
  // (SOLO=horn,strings…: solo esos instrumentos suenan, para medir cada capa; COMPAS=n: empieza en ese compás)
  if (solo) for (const n of ['horn', 'strings', 'choir', 'bass', 'timpani', 'snare', 'cymbal', 'swell', 'voice', 'flute']) if (!solo.includes(n)) s[n] = () => {};
  s.setMood(mood); s.mus.cur = mood; s.mus.next = 0.1; s.mus.bar = compas;   // (sin el fundido de entrada)
  let t = 0; const paso = () => { s.musicTick(); t += 0.25; if (t < dur) ctx.suspend(t).then(() => { paso(); ctx.resume(); }); };
  paso();
  const buf = await ctx.startRendering(), d = buf.getChannelData(0);
  const rms = []; let pico = 0;
  for (let sec = 0; sec < dur; sec++) { let e = 0; for (let k = sec * SR; k < Math.min(d.length, (sec + 1) * SR); k++) { e += d[k] * d[k]; pico = Math.max(pico, Math.abs(d[k])); } rms.push(+(20 * Math.log10(Math.sqrt(e / SR) + 1e-9)).toFixed(1)); }
  // el WAV: 16 bits
  const n = d.length, w = new DataView(new ArrayBuffer(44 + n * 2)); const str = (o, s) => { for (let i = 0; i < s.length; i++) w.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); w.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); w.setUint32(16, 16, true); w.setUint16(20, 1, true); w.setUint16(22, 1, true); w.setUint32(24, SR, true); w.setUint32(28, SR * 2, true); w.setUint16(32, 2, true); w.setUint16(34, 16, true); str(36, 'data'); w.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) w.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  const bytes = new Uint8Array(w.buffer); let s64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) s64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { rms, pico: +pico.toFixed(3), wav: btoa(s64), bar: s.mus.bar };
}, { mood, dur: +secs, solo: process.env.SOLO ? process.env.SOLO.split(',') : null, compas: +(process.env.COMPAS || 0) });
{ writeFileSync(out, Buffer.from(r.wav, 'base64')); console.log(`${out} · ${secs} s · compases ${r.bar} · pico ${r.pico}\nnivel por segundos (dB): ${r.rms.join(' ')}`); }
console.log('errores:', errs.length ? errs.join(' | ') : 'ninguno');
await b.close();
