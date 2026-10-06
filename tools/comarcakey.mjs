// Portadas de las comarcas con aire de videojuego: de cada comarca, su pueblo más reconocible visto desde el aire al
// atardecer, con su monumento delante y el pueblo y los montes detrás (fotos del propio juego, sin personajes ni
// interfaz). Salen en /tmp/comarcakey/<comarca>.png; tools/comarcakey.py les da el acabado de portada.
// Uso: node tools/comarcakey.mjs [comarca,…]   (URL=http://127.0.0.1:5174 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const BASE = (process.env.URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
// comarca → pueblo, monumento (tipo), hora, distancia y altura de la cámara, giro extra (grados)
export const SHOTS = {
  bidasoa: ['elizondo', 'palace', 18.2, 110, 45, 0],
  'larraun-leitzaldea': ['lekunberri', 'dolmen', 18.0, 100, 40, 0],
  pirineo: ['orreaga-roncesvalles', 'chapel', 17.8, 110, 45, 0],
  sakana: ['irurtzun', 'pass', 17.8, 170, 55, 180],
  pamplona: ['pamplona', 'citadel', 18.2, 140, 60, 30],
  prepirineo: ['aoiz', 'bridge', 18.0, 70, 28, 90],
  sanguesa: ['javier', 'castle', 18.2, 100, 38, 0],
  'tierra-estella': ['estella', 'palace', 18.0, 110, 45, 0],
  'valdizarbe-novenera': ['puente-la-reina', 'bridge', 18.0, 70, 26, 90],
  'zona-media': ['olite', 'castle', 18.3, 130, 55, 0],
  'ribera-alta': ['marcilla', 'castle', 18.3, 110, 45, 0],
  ribera: ['tudela', 'bridge', 18.3, 120, 48, 0],
};
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(SHOTS), out = '/tmp/comarcakey'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const c of only) {
  let [town, kind, t, dist, high, turn] = SHOTS[c];
  if (process.env.D) [dist, high, turn] = process.env.D.split(',').map(Number);   // para probar encuadres
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', e => console.log('ERR', c, e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'high' } })); } catch (e) { } });
  await p.goto(`${BASE}/?town=${town}&q=high&weather=clear&t=${t}&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
  await p.waitForTimeout(3000);
  const info = await p.evaluate(([kind, t, dist, high, turn]) => {
    const rt = window.__rt, P = window.__layout.PLACES, H = (x, z) => { try { return window.__hf.groundHeight(x, z) || 0; } catch (e) { return 0; } };
    const lm = (P.landmarks || []).find(l => l.kind === kind) || P.plaza || { x: 0, z: 0 };
    // fuera lo que se mueve y la interfaz
    rt.scene.traverse(o => { if (o.isSkinnedMesh || /GlbChar|Animal|dog|perro|crowd|particles/i.test(o.name)) o.visible = false; });
    const pl = rt.player; const po = pl && (pl.root || pl.obj || pl.mesh || pl.group); if (po) po.visible = false;
    if (rt.sky) { rt.sky.speed = 0; rt.sky.time = t; }
    // la cámara: al otro lado del monumento respecto a la plaza (el monumento delante y el pueblo detrás)
    let dx = lm.x - P.plaza.x, dz = lm.z - P.plaza.z, d = Math.hypot(dx, dz);
    if (d < 5) { dx = 1; dz = 1; d = Math.SQRT2; }
    const a = Math.atan2(dz, dx) + turn * Math.PI / 180, cx = lm.x + Math.cos(a) * dist, cz = lm.z + Math.sin(a) * dist;
    const gy = H(lm.x, lm.z), cy = Math.max(H(cx, cz) + 6, gy + high);
    const c = rt.camera, f = rt.follow; if (f) f.update = () => {};
    c.fov = 40; c.aspect = 16 / 9; c.updateProjectionMatrix();
    // se mira un poco más allá del monumento, hacia el pueblo, para que entre todo
    c.position.set(cx, cy, cz); c.lookAt(lm.x - Math.cos(a) * dist * 0.25, gy + 4, lm.z - Math.sin(a) * dist * 0.25); c.updateMatrixWorld();
    window.__stop = true;
    return { lm, cam: [cx, cy, cz] };
  }, [kind, t, dist, high, turn]);
  await p.waitForTimeout(2500);
  // la foto, del propio render (sin la interfaz encima)
  const url = await p.evaluate(() => { const rt = window.__rt; rt.renderer.setSize(1600, 900, false); rt.camera.aspect = 16 / 9; rt.camera.updateProjectionMatrix(); rt.renderer.render(rt.scene, rt.camera); return rt.renderer.domElement.toDataURL('image/png'); });
  writeFileSync(`${out}/${c}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('·', c, town, JSON.stringify(info));
  await p.close();
}
await b.close();
