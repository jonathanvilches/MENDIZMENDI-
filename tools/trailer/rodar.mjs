// Rueda los planos del tráiler con el motor del juego, fotograma a fotograma: para el bucle, avanza el mundo 1/24 s cada
// vez, coloca la cámara del plano y guarda lo que ha dibujado el lienzo (sin la interfaz encima), a 1920 × 1080.
// Cada plano está en tools/trailer/planos.mjs: el pueblo, la hora, el tiempo, el avatar, cuánto dura y lo que pasa.
// Uso: node tools/trailer/rodar.mjs <plano[,plano…]> <carpeta> [prueba]
//   prueba: solo 5 fotogramas repartidos, a 960 × 540, para ver el encuadre antes de rodarlo entero (los demás pasos
//   avanzan el mundo sin dibujar)
//   (URL=http://127.0.0.1:5173/ por defecto: el servidor de pruebas, que sirve /src y deja importar los módulos)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { PLANOS, FPS } from './planos.mjs';
const [, , nombres, out, modo] = process.argv;
const prueba = modo === 'prueba', URL = process.env.URL || 'http://127.0.0.1:5173/';
const [W, H] = prueba ? [960, 540] : [1920, 1080];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
for (const nombre of nombres.split(',')) {
  const P = PLANOS[nombre]; if (!P) { console.log('no hay plano', nombre); continue; }
  const dir = `${out}/${nombre}`; mkdirSync(dir, { recursive: true });
  // (si ya está entero, no se vuelve a rodar: así se puede seguir donde se quedó)
  if (!prueba && readdirSync(dir).filter(f => f.endsWith('.jpg')).length >= Math.round(P.seg * FPS)) { console.log(nombre, 'ya estaba'); continue; }
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript((av) => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Beñat', avatar: av, seen: { heroBenat: true, dog: true, comoJugar: true }, dogOn: false, settings: { quality: 'high' } })); }, P.avatar || 'pastor');
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  if (P.campeonato) {
    // un partido de pelota de campeonato, como al jugar: el menú de Campeonatos, el frontón, partido libre y a jugar; el
    // pelotari del jugador va solo (piloto automático) para que haya peloteo de verdad
    await p.goto(`${URL}?screen=sports&q=high`, { timeout: 300000 });
    await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 });
    await p.evaluate((fr) => { document.querySelector('[data-frpick]')?.click(); document.querySelector(`[data-fronton="${fr}"]`)?.click(); }, P.campeonato); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
    await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
    await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
    await p.waitForFunction(() => document.querySelector('.pel-panel [data-pel-go]'), null, { timeout: 120000 });
    await p.evaluate(() => document.querySelector('[data-pel-go]').click());
    await p.waitForFunction(() => { const g = window.__game?.pelotaMatch?.game; return g && g.phase !== 'intro'; }, null, { timeout: 180000 });
    await p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; });
  } else {
    await p.goto(`${URL}?town=${P.pueblo}&q=high&weather=${P.tiempo || 'clear'}&skipintro=1&t=${P.hora}`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 600000 });
  }
  // (que suba antes todo lo que se ve: texturas pintadas, árboles, vecinos; si no, salían las casas sin textura)
  await p.waitForTimeout(P.espera ?? 9000);
  // el rodaje: el bucle parado; cada paso avanza el mundo, mueve la cámara del plano y devuelve la imagen
  await p.evaluate(async ([prep, cuadro, despues]) => {
    const rt = window.__rt, G = window.__game, THREE = window.__THREE, H = window.__hf;
    const CF = await import('/src/engine/charLight.js').catch(() => null);
    rt.active = false; G.ui.hudVisible?.(false);
    const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x), lerp = (a, b, k) => a + (b - a) * k;
    const U = {
      THREE, G, rt, H, ease, lerp, v: (x, y, z) => new THREE.Vector3(x, y, z), suelo: (x, z) => H.groundHeight(x, z),
      teclas: (ks) => { G.input.keys.clear(); for (const k of ks) G.input.keys.add(k); },
      cam: (pos, look, fov) => { const c = rt.camera; c.position.copy(pos); c.lookAt(look); if (fov && c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); } },
      seco: (x, z) => H.waterLevelAt(x, z) < H.groundHeight(x, z) - 0.4,
      // un punto de luz (ojos en la oscuridad, chispas): un sprite aditivo con un degradado redondo
      brillo: (color, size) => {
        if (!U._gt) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); U._gt = new THREE.CanvasTexture(cv); }
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: U._gt, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        s.scale.setScalar(size); rt.scene.add(s); return s;
      },
      // una criatura de leyenda como sale en el juego: su figura con el aura, la niebla y el chispazo de su color
      criatura: (who, x, z, color, nombre) => {
        const M = { i: 900 + Math.floor(Math.random() * 90), m: { who }, lair: { x, z }, leg: { creature: nombre || who, color }, done: true };
        G.showCreature(M); G.player.frozen = false;
        rt.follow.cinematic = { t: 0, fly: () => window.__shot.cuadro(window.__shot.t, U, window.__shot.est) };
        return M.creature;
      },
      // bancos de bruma: manchas grandes y suaves a ras del valle, que se mueven despacio (est.bruma las mueve)
      bruma: (c, R, n, color = '#f2e6d8', y0 = 2, y1 = 12, op = 0.32, esc = 1) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
        for (let i = 0; i < 14; i++) { const x = 60 + Math.random() * 136, y = 60 + Math.random() * 136, r = 40 + Math.random() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
        const tex = new THREE.CanvasTexture(cv), out = [];
        for (let i = 0; i < n; i++) {
          const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: op * (0.6 + Math.random() * 0.4), depthWrite: false, fog: false });
          const s = new THREE.Sprite(m), a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
          s.position.set(x, H.groundHeight(x, z) + y0 + Math.random() * (y1 - y0), z); const k = (40 + Math.random() * 60) * esc; s.scale.set(k, k * 0.35, 1); s.userData.v = (Math.random() - 0.5) * 1.2;
          rt.scene.add(s); out.push(s);
        }
        return out;
      },
    };
    window.__U = U;
    // (la cámara del plano por la vía del juego: así la copa de los árboles no se abre ante el personaje, que es lo que
    // hace al jugar para que no lo tape)
    const S = window.__shot = { prep: eval('(' + prep + ')'), cuadro: eval('(' + cuadro + ')'), despues: despues ? eval('(' + despues + ')') : null, t: 0, est: {} };
    rt.follow.cinematic = { t: 0, fly: (cam) => S.cuadro(S.t, U, S.est) };
    await S.prep(U, S.est);
    window.__paso = (dt, k, dibuja = true) => {
      S.t += dt * (k ?? 1); const d = dt * (S.est.lento ?? 1);
      rt.elapsed += d; try { rt.subeAlgo?.(); } catch (e) { }
      rt.applySize();
      rt.follow.cinematic ||= { t: 0, fly: (cam) => S.cuadro(S.t, U, S.est) };
      rt.step(d, G, G.input);
      S.despues?.(S.t, U, S.est);
      if (S.est.fog) { const f = rt.scene.fog; f.near = S.est.fog[0]; f.far = S.est.fog[1]; if (S.est.fogColor) f.color.set(S.est.fogColor); }
      for (const s of S.est.brumas || []) s.position.x += s.userData.v * d;
      if (!dibuja) { G.input.endFrame?.(); return null; }
      for (const o of rt.scene.children) o.matrixWorldAutoUpdate = o.visible;
      CF?.applyCharFill?.(rt.charFill);
      rt.renderer.render(rt.scene, rt.camera);
      CF?.applyCharFill?.(null);
      G.input.endFrame?.();
      return rt.renderer.domElement.toDataURL('image/jpeg', 0.93);
    };
  }, [P.prep.toString(), P.cuadro.toString(), P.despues ? P.despues.toString() : null]);
  const n = Math.round(P.seg * FPS), dt = 1 / FPS;
  // (unos pasos antes de empezar, para que el mundo esté asentado: animales, vecinos y luz)
  const antes = P.antes ?? 12;
  for (let i = 0; i < antes; i++) await p.evaluate(([dt, d]) => { window.__shot.t = 0; window.__paso(dt, 0, d); }, [dt, i === antes - 1]);
  await p.evaluate(() => { window.__shot.t = 0; });
  const cuales = prueba ? [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1] : null;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const sale = !cuales || cuales.includes(i);
    const url = await p.evaluate(([dt, sale]) => window.__paso(dt, 1, sale), [dt, sale]);
    if (sale) writeFileSync(`${dir}/${String(i).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    if (prueba && i > cuales[cuales.length - 1]) break;
  }
  console.log(nombre, `${n} fotogramas`, `${Math.round((Date.now() - t0) / 1000)} s`, errs.length ? 'errores: ' + errs.slice(0, 3).join(' | ') : 'sin errores');
  await ctx.close();
}
await b.close();
