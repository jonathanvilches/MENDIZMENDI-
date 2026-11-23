// El montaje del tráiler v11: el del v8 (v8/montaje.mjs) con los capítulos de la historia sobre negro (los cortes que
// empiezan por «#»: el rótulo, que entra y sale fundido) y las tomas de 12 por segundo pasadas a 24 repitiendo cada
// imagen, sin inventar las de en medio. Las tomas del v10 que se reaprovechan (el vuelo de dron a Otsagabia y el logo)
// se enlazan en la carpeta de lo rodado antes de montar.
// Uso: node tools/trailer/v11/montaje.mjs <rodado> <planos> <mezcla.wav> <rótulos> <salida.mp4>
import { TOMAS, CORTES, ROTULOS, DURA, T_LOGO } from './tomas.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync, rmSync, symlinkSync, statSync } from 'node:fs';
const [, , RAW, PLA, WAV, ROT, OUT] = process.argv, FPS = 24;
const seq = `${PLA}/_seq`; rmSync(seq, { recursive: true, force: true }); mkdirSync(seq, { recursive: true });
// (el negro de los capítulos: una imagen, enlazada tantas veces como haga falta)
const NEGRO = `${PLA}/_negro.jpg`;
if (!existsSync(NEGRO)) execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x0b0714:s=1280x720', '-frames:v', '1', '-q:v', '2', NEGRO]);
const a24 = (nom) => {
  const T = TOMAS[nom] || {}, src = `${RAW}/${nom}`, dst = `${PLA}/${nom}`;
  const hay = existsSync(src) ? readdirSync(src).filter(f => f.endsWith('.jpg')).length : 0;
  if (!hay) { console.log('falta la toma', nom); if (process.env.BORRADOR) return null; process.exit(1); }
  if (!existsSync(dst) || statSync(`${src}/0000.jpg`).mtimeMs > statSync(dst).mtimeMs) {
    rmSync(dst, { recursive: true, force: true }); mkdirSync(dst, { recursive: true });
    const fps = T.fps || (nom === 'vOts' || nom === 'final' ? 24 : 12);
    execFileSync('ffmpeg', ['-v', 'error', '-framerate', String(fps), '-start_number', '0', '-i', `${src}/%04d.jpg`, '-vf', fps >= FPS ? 'null' : `fps=${FPS}`, '-q:v', '2', '-start_number', '0', `${dst}/%04d.jpg`]);
  }
  return readdirSync(dst).filter(f => f.endsWith('.jpg')).sort().map(f => `${dst}/${f}`);
};
const hechas = {};
let k = 0;
for (let i = 0; i < CORTES.length; i++) {
  const [t, nom, desde = 0, vel = 1] = CORTES[i], fin = i + 1 < CORTES.length ? CORTES[i + 1][0] : DURA;
  const N = Math.round(fin * FPS) - Math.round(t * FPS);
  if (nom.startsWith('#')) { for (let j = 0; j < N; j++) symlinkSync(NEGRO, `${seq}/${String(k++).padStart(5, '0')}.jpg`); console.log(nom.padEnd(13), `${t.toFixed(2)}–${fin.toFixed(2)} s`, 'capítulo'); continue; }
  // (BORRADOR=1: las tomas que aún no están, en negro, para ver el montaje y el sonido antes de tenerlo todo)
  const fr = hechas[nom] ||= (a24(nom) || [NEGRO]), j0 = Math.round(desde * FPS), jz = j0 + Math.round((N - 1) * vel);
  for (let j = 0; j < N; j++) symlinkSync(fr[Math.min(j0 + Math.round(j * vel), fr.length - 1)], `${seq}/${String(k++).padStart(5, '0')}.jpg`);
  console.log(nom.padEnd(13), `${t.toFixed(2)}–${fin.toFixed(2)} s`, `${N} fotogramas desde ${j0}${vel !== 1 ? ` a ×${vel}` : ''}`, jz >= fr.length ? `(faltan ${jz - fr.length + 1})` : '');
}
// (el color, como en el v8: algo más de contraste y de color, y un poco de nitidez)
const GRADO = 'eq=contrast=1.06:saturation=1.1:gamma=0.98,unsharp=5:5:0.45:5:5:0';
// (al final, el mapa del juego se va a negro y el logo se queda solo)
const OSCURO = T_LOGO + 1.9;
const ins = [], filt = [`[0]scale=1920:1080:flags=lanczos,setsar=1,${GRADO},fade=t=out:st=${OSCURO.toFixed(3)}:d=0.9[b0]`];
ROTULOS.forEach(([img, a, z], n) => {
  ins.push('-framerate', String(FPS), '-loop', '1', '-t', String(DURA), '-i', `${ROT}/${img}.png`);
  const sale = z >= DURA - 0.01 ? '' : `,fade=t=out:st=${(z - 0.3).toFixed(3)}:d=0.3:alpha=1`;
  filt.push(`[${n + 2}]format=rgba,fade=t=in:st=${a.toFixed(3)}:d=0.35:alpha=1${sale}[r${n}]`);
  filt.push(`[b${n}][r${n}]overlay=x=0:y='if(lt(t,${a.toFixed(3)}+0.35),22*pow(1-(t-${a.toFixed(3)})/0.35,2),0)':eval=frame:enable='between(t,${a.toFixed(3)},${z.toFixed(3)})'[b${n + 1}]`);
});
filt.push(`[b${ROTULOS.length}]fade=t=in:st=0:d=0.35,fade=t=out:st=${(DURA - 1.3).toFixed(3)}:d=1.3,format=yuv420p[v]`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${seq}/%05d.jpg`, '-i', WAV, ...ins,
  '-filter_complex', filt.join(';'), '-map', '[v]', '-map', '1:a', '-t', DURA.toFixed(3),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
console.log('hecho', OUT, k, 'fotogramas');
