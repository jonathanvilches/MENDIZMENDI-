// El montaje del tráiler v6: los trozos de las tomas (v6/tomas.mjs, CORTES: en qué segundo, qué toma y desde dónde), pasados
// a 24 por segundo con interpolación, con corte seco al compás de la música; encima los rótulos (v6/rotulos.mjs), que
// entran subiendo un poco y se funden, y debajo la mezcla (v6/mezcla-v6.py). Sale a 1920 × 1080, 60 s.
// Uso: node tools/trailer/v6/montaje.mjs <rodado> <planos> <mezcla.wav> <rótulos> <salida.mp4>
import { TOMAS, CORTES, ROTULOS, DURA } from './tomas.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync, rmSync, symlinkSync, statSync } from 'node:fs';
const [, , RAW, PLA, WAV, ROT, OUT] = process.argv, FPS = 24;
const seq = `${PLA}/_seq`; rmSync(seq, { recursive: true, force: true }); mkdirSync(seq, { recursive: true });
// (cada toma, una vez a 24 por segundo; otra vez si se ha vuelto a rodar)
const a24 = (nom) => {
  const T = TOMAS[nom], src = `${RAW}/${nom}`, dst = `${PLA}/${nom}`;
  const hay = existsSync(src) ? readdirSync(src).filter(f => f.endsWith('.jpg')).length : 0;
  if (!hay) { console.log('falta la toma', nom); process.exit(1); }
  if (!existsSync(dst) || statSync(`${src}/0000.jpg`).mtimeMs > statSync(dst).mtimeMs) {
    rmSync(dst, { recursive: true, force: true }); mkdirSync(dst, { recursive: true });
    const vf = (T.fps || 12) >= FPS ? 'null' : `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`;
    execFileSync('ffmpeg', ['-v', 'error', '-framerate', String(T.fps || 12), '-start_number', '0', '-i', `${src}/%04d.jpg`, '-vf', vf, '-q:v', '2', '-start_number', '0', `${dst}/%04d.jpg`]);
  }
  return readdirSync(dst).filter(f => f.endsWith('.jpg')).sort().map(f => `${dst}/${f}`);
};
const hechas = {};
let k = 0;
for (let i = 0; i < CORTES.length; i++) {
  // (vel: las carreras y los galopes, un poco acelerados, saltando fotogramas de la toma a 24)
  const [t, nom, desde, vel = 1] = CORTES[i], fin = i + 1 < CORTES.length ? CORTES[i + 1][0] : DURA;
  const N = Math.round(fin * FPS) - Math.round(t * FPS), fr = hechas[nom] ||= a24(nom), j0 = Math.round(desde * FPS), jz = j0 + Math.round((N - 1) * vel);
  for (let j = 0; j < N; j++) symlinkSync(fr[Math.min(j0 + Math.round(j * vel), fr.length - 1)], `${seq}/${String(k++).padStart(5, '0')}.jpg`);
  console.log(nom.padEnd(13), `${t.toFixed(2)}–${fin.toFixed(2)} s`, `${N} fotogramas desde ${j0}${vel !== 1 ? ` a ×${vel}` : ''}`, jz >= fr.length ? `(faltan ${jz - fr.length + 1})` : '');
}
// los rótulos: suben 26 px y se funden al entrar (0,3 s), se funden al salir (0,22 s)
// (el color: algo más de contraste y de color, y un poco de nitidez, que el juego grabado sale lavado y blando; el autor,
// 23 nov: «muchos fallos de iluminación, de contraste»)
const GRADO = 'eq=contrast=1.08:saturation=1.14:gamma=0.98,unsharp=5:5:0.55:5:5:0';
const ins = [], filt = [`[0]scale=1920:1080:flags=lanczos,setsar=1,${GRADO}[b0]`];
ROTULOS.forEach(([a, z, img], n) => {
  ins.push('-framerate', String(FPS), '-loop', '1', '-t', String(DURA), '-i', `${ROT}/${img}.png`);
  const sale = z >= DURA - 0.01 ? '' : `,fade=t=out:st=${(z - 0.22).toFixed(3)}:d=0.22:alpha=1`;
  filt.push(`[${n + 2}]format=rgba,fade=t=in:st=${a.toFixed(3)}:d=0.3:alpha=1${sale}[r${n}]`);
  filt.push(`[b${n}][r${n}]overlay=x=0:y='if(lt(t,${a.toFixed(3)}+0.3),26*pow(1-(t-${a.toFixed(3)})/0.3,2),0)':eval=frame:enable='between(t,${a.toFixed(3)},${z.toFixed(3)})'[b${n + 1}]`);
});
filt.push(`[b${ROTULOS.length}]fade=t=in:st=0:d=0.35,fade=t=out:st=${DURA - 1.3}:d=1.3,format=yuv420p[v]`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${seq}/%05d.jpg`, '-i', WAV, ...ins,
  '-filter_complex', filt.join(';'), '-map', '[v]', '-map', '1:a', '-t', String(DURA),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
console.log('hecho', OUT, k, 'fotogramas');
