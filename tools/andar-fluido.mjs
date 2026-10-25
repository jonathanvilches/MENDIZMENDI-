// ¿El personaje anda fluido? Anda por el pueblo (adelante, girando a un lado y a otro, corriendo, hacia atrás y de lado)
// paso a paso, con la lógica del juego y sin dibujar (con la tarjeta simulada, dibujar va a 1 o 2 imágenes por segundo y
// no se mediría nada), y mira en cada paso:
//  · lo que tarda la lógica de cada fotograma (jugador, cámara, vecinos, animales, cielo): un paso largo es un tirón;
//  · si la cámara salta de distancia (choca con una casa y se acerca de golpe, o se aleja y vuelve);
//  · si algo se pone entre la cámara y el personaje y lo tapa a ratos (eso se ve como un parpadeo);
//  · si el personaje desaparece o su animación se queda sin peso (se vería la postura en cruz: glbChar lo cuenta en fixes);
//  · si el personaje da saltos de sitio (más de lo que permite su velocidad).
// Uso: node tools/andar-fluido.mjs [pueblos separados por comas]
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const [,, lista = 'lumbier,lesaka,estella,pamplona'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const town of lista.split(',')) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => errs.push(`${town} ${e.message.slice(0, 160)}`));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: true, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const rt = window.__rt, G = window.__game, F = rt.follow, P = rt.player, inp = rt.input, T = window.__THREE;
    rt.active = false;   // (el bucle de la página, quieto: aquí se avanza a mano)
    const tramos = [[['w'], 5], [['w', 'a'], 3], [['w', 'shift'], 5], [['w', 'd'], 3], [['s'], 2.5], [['a'], 2.5], [['w', 'shift', 'd'], 4], [['w'], 5]];
    const rc = new T.Raycaster(), pecho = new T.Vector3(), dir = new T.Vector3();
    const R = { pasos: 0, ms: [], saltos: 0, maxSalto: 0, tapado: 0, cambios: 0, oculto: 0, brincos: 0, ej: [], abiertos: 0, foto: null };
    let prevD = null, prevTap = false, prevP = P.pos.clone();
    const dt = 1 / 60;
    for (const [teclas, s] of tramos) {
      inp.keys.clear(); for (const k of teclas) inp.keys.add(k);
      for (let i = 0; i < s * 60; i++) {
        const t0 = performance.now();
        rt.elapsed += dt; rt.step(dt, G, inp); inp.endFrame();
        R.ms.push(performance.now() - t0); R.pasos++;
        const d = F.curDist; if (prevD != null) { const j = Math.abs(d - prevD); if (j > 0.25) R.saltos++; R.maxSalto = Math.max(R.maxSalto, +j.toFixed(2)); } prevD = d;
        if (!P.obj.visible) R.oculto++;
        const mv = Math.hypot(P.pos.x - prevP.x, P.pos.z - prevP.z); if (mv > (P.runSpeed + 1) * dt * 1.5) R.brincos++; prevP.copy(P.pos);
        if (i % 3 === 0) {
          pecho.copy(P.pos); pecho.y += 1.2; dir.subVectors(pecho, F.cam.position); const L = dir.length(); dir.normalize();
          rc.set(F.cam.position, dir); rc.camera = F.cam; rc.far = Math.max(0.1, L - 0.4);
          const hit = rc.intersectObjects(G.scene.children, true).find(h => h.object.visible && h.object.isMesh && !h.object.isSkinnedMesh && !h.object.material?.transparent && !P.obj.getObjectById(h.object.id));
          // (los árboles y matas se abren en una trama entre la cámara y el personaje: se cuentan aparte)
          const abre = !!hit?.object.material?.userData?.abreVista; if (abre) { R.abiertos++; R.foto ||= { x: P.pos.x, z: P.pos.z, h: P.heading, yaw: F.yaw, pitch: F.pitch }; }
          const tap = !!hit && !abre; if (tap) R.tapado++; if (tap !== prevTap) R.cambios++; prevTap = tap;
          if (tap && R.ej.length < 6) R.ej.push(hit.object.name || hit.object.parent?.name || hit.object.type);
        }
      }
    }
    inp.keys.clear(); rt.active = true;
    const ms = R.ms.sort((a, b) => a - b), q = (f) => +ms[Math.floor(ms.length * f)].toFixed(1);
    const c = P.rig?.char;
    return { pasos: R.pasos, msMediana: q(0.5), ms99: q(0.99), msMax: +ms[ms.length - 1].toFixed(1), largos: ms.filter(x => x > 33).length, saltosCamara: R.saltos, maxSalto: R.maxSalto, tapadoMuestras: R.tapado, tapaYdestapa: R.cambios, arbolesAbiertos: R.abiertos, foto: R.foto, oculto: R.oculto, brincos: R.brincos, arreglosAnim: c?.fixes || 0, tapan: [...new Set(R.ej)] };
  });
  console.log(town.padEnd(10), JSON.stringify(r));
  // (con OUT=carpeta, una captura del primer momento en que un árbol se cruzaba entre la cámara y el personaje)
  if (process.env.OUT && r.foto) {
    await p.evaluate((f) => { document.getElementById('hub')?.classList.add('hidden'); const rt = window.__rt, P = rt.player, F = rt.follow; P.place(f.x, f.z, f.h); F.yaw = f.yaw; F.pitch = f.pitch; F.idle = 9; F.update(0.1, P, { look: { dx: 0, dy: 0 }, zoom: 0, move: { x: 0, y: 0 } }, true); }, r.foto);
    await p.waitForTimeout(4000);
    console.log('  estado:', JSON.stringify(await p.evaluate(() => ({ modo: window.__game?.mode, hub: !document.getElementById('hub')?.classList.contains('hidden'), velo: !!document.querySelector('.sport-bg'), activo: window.__rt.active, cubierto: window.__rt.covered }))));
    await p.screenshot({ path: `${process.env.OUT}/arbol-${town}.png`, timeout: 120000 });
  }
  await p.close();
}
console.log('errores', errs.length ? errs : 'ninguno');
await b.close();
