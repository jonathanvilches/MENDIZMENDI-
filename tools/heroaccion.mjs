// Personajes en acción para las portadas de los pueblos (estilo ilustración de videojuego): cada personaje elegible
// de cuerpo entero corriendo, saltando y celebrando, con la luz de atardecer de las portadas (sol dorado de lado,
// contraluz cálido y relleno frío) y fondo transparente. Salen en /tmp/heroaccion/<personaje>-<acción>.png;
// tools/heroaccion.py les da el acabado de ilustración y los pasa a src/assets/portadas/heroe/acc-*.webp.
// Uso: node tools/heroaccion.mjs [personaje,…]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const who = (process.argv[2] || 'sanfermin,pastor,osasuna,pelotari').split(','), W = 1000, H = 1300, out = '/tmp/heroaccion';
mkdirSync(out, { recursive: true });
// acción → clip, segundo del clip, giro del cuerpo (hacia la izquierda de la imagen: hacia el monumento), alza
const ACC = { corre: ['Run', 0.18, -0.75, 0.05], salta: ['Jump_Loop', 0.12, -0.45, 0.35], celebra: ['Celebrate', 0.55, -0.25, 0], golpea: ['Hit', 0.32, -0.55, 0] };
// las que quedan bien en cada uno (el pastor y el pelotari celebran agachados; el pelotari, en vez de saltar, golpea)
const BY = { sanfermin: ['corre', 'salta', 'celebra'], osasuna: ['corre', 'salta', 'celebra'], pastor: ['corre', 'salta'], pelotari: ['corre', 'golpea'] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(URL + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__THREE, null, { timeout: 300000 });
for (const id of who) for (const acc of BY[id] || ['corre']) { const [clip, at, rot, lift] = ACC[acc];
  const url = await p.evaluate(async ([id, clip, at, rot, lift, W, H]) => {
    const THREE = window.__THREE, { loadMeshy, GlbChar } = await import('/src/actors/glbChar.js');
    const g = await loadMeshy(id), c = new GlbChar(g, {}); c.root.scale.setScalar(g.userData.fit);
    const name = c.clips.includes(clip) ? clip : c.clips.includes('Celebrate') ? 'Celebrate' : 'Idle';
    // la pose del clip en ese instante (sin la máquina de estados del personaje, que lo pondría quieto)
    c.mixer.stopAllAction(); const A = c.actions[name]; A.reset().setEffectiveWeight(1).play(); A.time = Math.min(at, A.getClip().duration - 0.01); c.mixer.update(0);
    const scene = new THREE.Scene(); scene.add(c.root);
    scene.add(new THREE.HemisphereLight('#ffd9a8', '#3a3f66', 1.4));
    const key = new THREE.DirectionalLight('#ffc27a', 3.1); key.position.set(-3, 2.4, 2.6); scene.add(key);      // sol bajo, del lado del monumento
    const rim = new THREE.DirectionalLight('#ffb060', 4.8); rim.position.set(2.8, 2.6, -3); scene.add(rim);      // contraluz
    const fill = new THREE.DirectionalLight('#9fb8ff', 0.85); fill.position.set(3, 1, 3); scene.add(fill);      // relleno frío
    c.root.rotation.y = rot; c.root.position.y = lift; c.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c.root), h = box.max.y - box.min.y;
    const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setClearColor(0, 0);
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    // de cuerpo entero (los pies al borde de abajo para todos: el suelo está a y=0 y el salto se ve en el aire)
    const ya = -0.05, yb = Math.max(box.max.y, 1.2) + h * 0.06 + lift * 1.6 + h * 0.08,   // (la caja es la de la pose de reposo: margen arriba para los brazos y el salto)
      cy = (ya + yb) / 2, span = yb - ya;
    const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 60), dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(12));
    cam.position.set(0, cy - span * 0.12, dist); cam.lookAt(0, cy, 0);
    R.render(scene, cam); const u = R.domElement.toDataURL('image/png'); R.dispose(); return name + '|' + u;
  }, [id, clip, at, rot, lift, W, H]);
  const [name, data] = url.split('|');
  writeFileSync(`${out}/${id}-${acc}.png`, Buffer.from(data.split(',')[1], 'base64'));
  console.log('·', id, acc, name);
}
await b.close();
