// Graba en vídeo la entrega de la txapela al acabar la final (pelota/ceremonia.js), fotograma a fotograma: el reloj de la
// página se para (performance.now, Date.now y requestAnimationFrame van con un reloj propio, como en
// tools/trailer/rodar-mapa.mjs) y cada paso lo adelanta 1/24 s, también las animaciones del rótulo (document.getAnimations),
// y se fotografía la página entera, con el rótulo encima. Así sale fluido aunque el ordenador pinte despacio. Luego, ffmpeg:
// el vídeo y su sonido con lo del juego (la música del partido, la grada, los aplausos al posarse la txapela y al levantar
// la copa, y Mikel y Edurne: «¡Txapela, Edurne! ¿Cómo se vive esto?» «Es lo más grande, Mikel. Te acuerdas toda la vida.»).
// Uso: node tools/pelota-ceremonia-video.mjs [salida.mp4] [carpeta de fotogramas] [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
const [,, out = 'entrega/pelota-ceremonia/txapela.mp4', dir = 'entrega/pelota-ceremonia/fotogramas', town = 'lumbier'] = process.argv;
const W = 1280, H = 720, FPS = 24, DURA = +(process.env.DURA || 15.5);
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); mkdirSync(dirname(out), { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } }));
  window.__ceremonia = true;
  const ahora = performance.now.bind(performance), fecha = Date.now, raf = window.requestAnimationFrame.bind(window);
  let virt = null, f0 = 0, cola = [];
  performance.now = () => virt == null ? ahora() : virt;
  Date.now = () => virt == null ? fecha() : f0 + virt;
  window.requestAnimationFrame = (cb) => { if (virt == null) return raf(cb); cola.push(cb); return cola.length; };
  window.__congela = () => { virt = ahora(); f0 = fecha() - virt; };
  window.__paso = (dt) => { virt += dt * 1000; const c = cola; cola = []; for (const f of c) { try { f(virt); } catch (e) { console.error('paso', e?.message); } }
    // (las animaciones y transiciones de la interfaz, al mismo reloj: paradas y adelantadas lo mismo)
    for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = (a.currentTime || 0) + dt * 1000; } catch (e) { /* sigue */ } } };
});
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForFunction(() => ['serveWait', 'servePrep', 'rally'].includes(window.__game.pelotaMatch?.game?.phase), null, { timeout: 240000 });
await p.waitForTimeout(1500);
// la final, ganada 9 a 6; el reloj, parado
await p.evaluate(() => { window.__congela(); const M = window.__game.pelotaMatch; M.o.camp = { titulo: 'Campeonato Manomanista', donde: 'Navarra' }; M.game.score.you = 9; M.game.score.rival = 6; M.cerePend = { win: true, score: { you: 9, rival: 6 } }; M.ceremonia(); });
await p.waitForFunction(() => window.__game.pelotaMatch?.cere, null, { timeout: 60000, polling: 200 });
// (que llegue la familia: sus personajes se cargan aparte)
await p.waitForFunction(() => (window.__game.pelotaMatch?.cere?.familia?.length || 0) >= 7, null, { timeout: 60000, polling: 300 }).catch(() => console.log('familia: no han llegado todos'));
for (let i = 0; i < 3; i++) await p.evaluate(() => window.__paso(0));
const n = Math.round(DURA * FPS), t0 = Date.now();
for (let i = 0; i < n; i++) {
  await p.evaluate((dt) => window.__paso(dt), 1 / FPS);
  await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
  if (i % 48 === 0) console.log(`${(i / FPS).toFixed(1)} s de vídeo`, `${Math.round((Date.now() - t0) / 1000)} s pasados`);
}
await b.close();
console.log('fotogramas', readdirSync(dir).length, errs.length ? 'errores: ' + errs.slice(0, 3).join(' | ') : 'sin errores');
// el sonido: música, grada, aplausos al posarse la txapela (3,9 s) y al levantar la copa (6,6 s), y los dos comentaristas
const S = 'src/assets/sonidos/', V = 'src/assets/voz/';
const pistas = [[S + 'musica-pelota.mp3', 0, 0.3], [S + 'publico-grada.mp3', 0, 0.5], [S + 'aplausos-final.mp3', 0, 0.45], [S + 'aplausos-final.mp3', 3.9, 0.95], [S + 'aplausos-final.mp3', 6.6, 0.8],
  [V + 'hombre/es/d-txapela-1-1.mp3', 4.25, 1.5], [V + 'mujer/es/d-txapela-1-2.mp3', 7.15, 1.5]];
const args = ['-y', '-framerate', String(FPS), '-i', `${dir}/%04d.jpg`];
for (const [f] of pistas) args.push('-i', f);
const fil = pistas.map(([, t, v], i) => `[${i + 1}:a]volume=${v},adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)}[a${i}]`).join(';')
  + `;${pistas.map((_, i) => `[a${i}]`).join('')}amix=inputs=${pistas.length}:normalize=0,atrim=0:${DURA},afade=t=in:d=0.4,afade=t=out:st=${DURA - 1}:d=1[a]`
  + `;[0:v]fade=t=out:st=${DURA - 0.7}:d=0.7,format=yuv420p[v]`;
args.push('-filter_complex', fil, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-t', String(DURA), '-movflags', '+faststart', out);
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
console.log('vídeo', out);
