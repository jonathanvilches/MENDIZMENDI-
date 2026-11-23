// Graba el juego tal como se juega, para el tráiler v5 (22 nov 2026; el autor: «No me gusta el tráiler. Quiero imágenes
// reales del juego»). Aquí no se coloca ninguna cámara ni se dibuja nada aparte: el juego corre solo, con su bucle, su
// posprocesado, su interfaz y sus charlas, y se le dan teclas como a un jugador. Lo único que se toca es el reloj de la
// página: performance.now, Date.now, requestAnimationFrame, los temporizadores y las animaciones de la interfaz van con
// un reloj propio que avanza 1/24 s por fotograma, así sale fluido aunque cada imagen tarde segundos en pintarse.
// Uso: node tools/trailer/v5/juego.mjs <toma[,toma…]> <carpeta> [prueba]   (URL=http://127.0.0.1:5173/ por defecto; TOMAS=otra lista)
//   prueba: 960 × 540 y solo unos fotogramas repartidos; si no, 1280 × 720 (TAM=1920x1080 para otro tamaño)
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// (TOMAS=<archivo>: otra lista de tomas, como la del tráiler v6, v6/tomas.mjs; si no, la de aquí)
const { TOMAS, AYUDA } = await import(process.env.TOMAS ? pathToFileURL(resolve(process.env.TOMAS)).href : './tomas.mjs');
// la toma limpia (T.limpio, tráiler v6; el autor, 23 nov: sin botones, cuadros de diálogo ni menús): todo lo de la página
// se esconde menos la imagen del juego (el lienzo del pueblo y del partido, el del mapa de inicio con sus nubes y su luz,
// y el velo rojo de la fiesta de los momotxorros, que es luz de la escena y no interfaz)
const VEN = 'canvas.pantalla3d, canvas.stage3d, canvas.m3-cv, canvas.m3-nubes, .m3-sol, .m3-luz, .m3-destello, .m3-onda, .manada-velo';
const LIMPIO = `body * { visibility: hidden !important; } ${VEN} { visibility: visible !important; } body { cursor: none !important; }`;
const [, , nombres, out, modo] = process.argv, prueba = modo === 'prueba', URL = process.env.URL || 'http://127.0.0.1:5173/';
const [W, H] = prueba ? [960, 540] : (process.env.TAM || '1280x720').split('x').map(Number);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });

// lo que va en la página antes que nada: el perfil y el reloj propio
const inicio = ([av, perfil]) => {
  localStorage.setItem('herrizherri-lang', 'es');
  localStorage.setItem('herrizherri-mando-noofrecer', '1'); localStorage.setItem('herrizherri-mando-ofrecido', '1');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify(Object.assign({ v: 1, name: 'Beñat', avatar: av, seen: { heroBenat: true, dog: true, comoJugar: true }, dogOn: false, settings: { quality: 'high' } }, perfil || {})));
  window.__paseo = true; window.__sinVideoIsla = true;
  // (sin el aviso de Vite de recargar la página al cambiar un archivo: tocar el juego mientras se graba recargaba la toma a
  // medias y salía la pantalla de carga; la conexión del HMR, protocolo «vite-hmr», se queda en un enchufe que no hace nada)
  const WS = window.WebSocket;
  window.WebSocket = function (url, protocols) { if (String(protocols || '').includes('vite-hmr')) return { readyState: 3, send() {}, close() {}, addEventListener() {}, removeEventListener() {} }; return new WS(url, protocols); };
  window.WebSocket.prototype = WS.prototype; Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  const ahora = performance.now.bind(performance), fecha = Date.now, raf = window.requestAnimationFrame.bind(window);
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), ct = window.clearTimeout.bind(window), ci = window.clearInterval.bind(window);
  let virt = null, f0 = 0, cola = [], timers = new Map(), sig = 1e7;
  performance.now = () => virt == null ? ahora() : virt;
  Date.now = () => virt == null ? fecha() : f0 + virt;
  window.requestAnimationFrame = (cb) => { if (virt == null) return raf(cb); cola.push(cb); return 1e9 + cola.length; };
  const pon = (fn, ms, a, rep) => { const k = sig++; timers.set(k, { t: virt + Math.max(0, +ms || 0), fn, a, rep }); return k; };
  window.setTimeout = (fn, ms, ...a) => virt == null ? st(fn, ms, ...a) : pon(fn, ms, a, 0);
  window.setInterval = (fn, ms, ...a) => virt == null ? si(fn, ms, ...a) : pon(fn, ms, a, Math.max(4, +ms || 4));
  window.clearTimeout = (k) => { if (timers.has(k)) timers.delete(k); else ct(k); };
  window.clearInterval = (k) => { if (timers.has(k)) timers.delete(k); else ci(k); };
  // (que el juego no baje la resolución ni aligere el pueblo al ver que va despacio mientras carga, ni después)
  si(() => { const rt = window.__rt; if (rt) { rt.frames = 0; rt.fpsT = 0; rt.lighten = () => { }; rt.acortaVista = () => { }; } }, 40);
  window.__congela = () => { virt = ahora(); f0 = fecha() - virt; window.__virtOn = true; };
  window.__paso = (dt) => {
    const fin = virt + dt * 1000;
    // los temporizadores que tocan, por orden (un intervalo puede tocar varias veces en un paso)
    for (let n = 0; n < 2000; n++) {
      let k0 = null, t0 = Infinity; for (const [k, T] of timers) if (T.t < t0) { t0 = T.t; k0 = k; }
      if (k0 == null || t0 > fin) break;
      const T = timers.get(k0); virt = Math.max(virt, t0);
      if (T.rep) T.t += T.rep; else timers.delete(k0);
      try { typeof T.fn === 'function' ? T.fn(...T.a) : eval(T.fn); } catch (e) { console.error('reloj', e?.message); }
    }
    virt = fin;
    // las animaciones de la interfaz (CSS), paradas y llevadas a mano con el mismo reloj
    for (const a of document.getAnimations()) { try { if (a.__v === undefined) { a.__v = a.currentTime || 0; a.pause(); } a.__v += dt * 1000; a.currentTime = a.__v; } catch (e) { } }
    const c = cola; cola = []; for (const f of c) { try { f(virt); } catch (e) { console.error('paso', e?.message); } }
    // (y dentro de los marcos de la página, como la lámina que se mueve del visor de láminas: su propio reloj, con el mismo paso)
    for (let i = 0; i < window.frames.length; i++) { try { const w = window.frames[i]; if (w.__paso) { if (!w.__virtOn) w.__congela(); w.__paso(dt); } } catch (e) { } }
  };
};

for (const nombre of nombres.split(',')) {
  const T = TOMAS[nombre]; if (!T) { console.log('no hay toma', nombre); continue; }
  const dir = `${out}/${nombre}`; mkdirSync(dir, { recursive: true });
  const FPS = T.fps || 12, n = Math.round(T.seg * FPS);   // (a 12 por segundo; el montaje los pasa a 24 con interpolación)
  if (!prueba && readdirSync(dir).filter(f => f.endsWith('.jpg')).length >= n) { console.log(nombre, 'ya estaba'); continue; }
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  try {
  await ctx.addInitScript(inicio, [T.avatar || 'explorador', T.perfil || null]);
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && /reloj|paso|antes/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(`${URL}${T.url}`, { timeout: 300000 });
  await (T.listo ? T.listo(p) : p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: +(process.env.CARGA_MS || 600000) }));
  await p.waitForTimeout(T.espera ?? 9000);
  if (T.limpio) await p.addStyleTag({ content: LIMPIO });
  await p.evaluate(AYUDA);
  await p.evaluate(() => { const R = (window.__rt || window.__mapa3d)?.renderer || window.__mapa3d?.ren; if (!R) return; const r0 = R.render.bind(R); R.render = (...a) => { if (!window.__sinDibujo) r0(...a); }; });
  // primero se congela el reloj y luego se prepara: así nada avanza a tiempo real mientras la página dibuja despacio
  await p.evaluate(() => window.__congela());
  if (T.prep) await p.evaluate(T.prep);
  // (unos pasos antes de empezar, para que todo se asiente: animales, vecinos, la cámara detrás del jugador)
  // (los pasos de antes, sin dibujar salvo los dos últimos: el mundo avanza igual y así no se pierde tiempo)
  for (let i = 0; i < (T.antes ?? 24); i++) await p.evaluate(([d, dt]) => { window.__sinDibujo = d; try { window.__antes?.(); } catch (e) { console.error('antes', e?.message); } window.__paso(dt); }, [i < (T.antes ?? 24) - 2, 1 / FPS]);
  if (process.env.DBG) console.log('DBG', JSON.stringify(await p.evaluate(() => { const G = window.__game, P = G?.player, c = window.__rt?.camera; return { P: P && [P.pos.x, P.pos.z, P.obj.visible, P.heading], cam: c && [c.position.x, c.position.y, c.position.z], d: P && c && Math.hypot(c.position.x - P.pos.x, c.position.z - P.pos.z), cin: !!G?.follow?.cinematic, tienda: G?.tienda?.pos, places: Object.keys(window.__layout?.PLACES || {}).join(','), lm: (window.__layout?.TOWN?.landmarks || G?.town?.landmarks || []).map(l => l.kind).join(',') }; })));
  const acc = (T.guion || []).slice().sort((a, b) => a[0] - b[0]); let ia = 0;
  const cuales = prueba ? [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1] : null;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    while (ia < acc.length && acc[ia][0] <= t + 1e-6) { await acc[ia][1](p); ia++; }
    const sale = !cuales || cuales.includes(i);
    // (en la prueba, los fotogramas que no se guardan no se dibujan: el mundo avanza igual)
    await p.evaluate(([t, sale, FPS]) => { window.__sinDibujo = !sale; try { window.__cada?.(t); } catch (e) { console.error('reloj cada', e?.message); } window.__paso(1 / FPS); }, [t, sale, FPS]);
    if (sale) await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92, timeout: +(process.env.FOTO_MS || 240000) });   // (FOTO_MS: más margen para el mapa 3D a 1280 × 720, que con otros navegadores a la vez tardaba más de 4 min en la primera imagen)
  }
  console.log(nombre, `${n} fotogramas`, `${Math.round((Date.now() - t0) / 1000)} s`, errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 4).join(' | ') : 'sin errores');
  } catch (e) { console.log(nombre, 'FALLA', e.message.split('\n')[0].slice(0, 300)); }
  await ctx.close().catch(() => { });
}
await b.close();
