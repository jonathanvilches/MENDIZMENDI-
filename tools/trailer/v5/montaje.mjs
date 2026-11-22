// El montaje del tráiler v5: las tomas del juego jugado (v5/juego.mjs, a 12 por segundo) pasadas a 24 con interpolación,
// una detrás de otra con corte seco, cada una en su segundo («en», v5/tomas.mjs), sobre la mezcla de voces y música del
// tráiler v3 con el bloque de las láminas (v5/mezcla-v5.py). Encima solo los dos rótulos (v5/rotulos.mjs). Sale a 1920 × 1080.
// Uso: node tools/trailer/v5/montaje.mjs <rodado> <planos> <mezcla.wav> <rótulos> <salida.mp4>
import { TOMAS } from './tomas.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync, rmSync, symlinkSync, copyFileSync, statSync } from 'node:fs';
// (con el bloque de las láminas, 21,2 s más que la mezcla de v3: v5/mezcla-v5.py; los rótulos, igual de desplazados)
const [, , RAW, PLA, WAV, ROT, OUT] = process.argv, FPS = 24, D = 21.2, DURA = 94.5 + D;
const lista = Object.entries(TOMAS).sort((a, b) => a[1].en - b[1].en);
const seq = `${PLA}/_seq`; rmSync(seq, { recursive: true, force: true }); mkdirSync(seq, { recursive: true });
let k = 0;
for (let i = 0; i < lista.length; i++) {
  const [nom, T] = lista[i], fin = i + 1 < lista.length ? lista[i + 1][1].en : DURA;
  const N = Math.round(fin * FPS) - Math.round(T.en * FPS), src = `${RAW}/${nom}`, dst = `${PLA}/${nom}`;
  const hay = existsSync(src) ? readdirSync(src).filter(f => f.endsWith('.jpg')).length : 0;
  if (!hay) { console.log('falta la toma', nom); process.exit(1); }
  // (se interpola otra vez si la toma se ha vuelto a rodar)
  const nueva = !existsSync(dst) || statSync(`${src}/0000.jpg`).mtimeMs > statSync(dst).mtimeMs;
  if (nueva) {
    rmSync(dst, { recursive: true, force: true }); mkdirSync(dst, { recursive: true });
    execFileSync('ffmpeg', ['-v', 'error', '-framerate', String(T.fps || 12), '-start_number', '0', '-i', `${src}/%04d.jpg`, '-vf', `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`, '-q:v', '2', '-start_number', '0', `${dst}/%04d.jpg`]);
  }
  const fr = readdirSync(dst).filter(f => f.endsWith('.jpg')).sort();
  for (let j = 0; j < N; j++) symlinkSync(`${dst}/${fr[Math.min(j, fr.length - 1)]}`, `${seq}/${String(k++).padStart(5, '0')}.jpg`);
  console.log(nom.padEnd(10), `${T.en.toFixed(2)}–${fin.toFixed(2)} s`, `${N} fotogramas`, fr.length < N ? `(faltan ${N - fr.length}: se alarga la última)` : '');
}
const f = [
  `[0]scale=1920:1080:flags=lanczos,setsar=1[b]`,
  `[2]format=rgba,fade=t=in:st=${84.0 + D}:d=0.5:alpha=1,fade=t=out:st=${87.7 + D}:d=0.5:alpha=1[t]`,
  `[3]format=rgba,fade=t=in:st=${92.4 + D}:d=0.5:alpha=1[j]`,
  `[b][t]overlay=enable='between(t,${84 + D},${88.3 + D})'[x]`,
  `[x][j]overlay=enable='gte(t,${92.4 + D})'[y]`,
  `[y]fade=t=in:st=0:d=0.5,fade=t=out:st=${93.7 + D}:d=0.8,format=yuv420p[v]`,
].join(';');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${seq}/%05d.jpg`, '-i', WAV,
  '-framerate', String(FPS), '-loop', '1', '-t', String(DURA), '-i', `${ROT}/titulo.png`,
  '-framerate', String(FPS), '-loop', '1', '-t', String(DURA), '-i', `${ROT}/jugar.png`,
  '-filter_complex', f, '-map', '[v]', '-map', '1:a', '-t', String(DURA),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
console.log('hecho', OUT, k, 'fotogramas');
