// Retratos de los vecinos de Meshy con cada color de pelo que pueden llevar en el pueblo (actors/npcGlb.js, peloDe): el
// mismo busto que tools/meshy-retratos.mjs con CABEZA=1 (de los hombros a un poco por encima de la cabeza, en su pose de
// reposo y con la misma luz), sobre el modelo original con la textura de cerca, que lleva la máscara del pelo
// (tools/vecinos-pelo.mjs), y el pelo teñido igual que en el juego. Así, en las charlas, el retrato lleva el pelo del
// vecino con el que hablas. Salen en src/assets/meshy/portraits/pelo/<vecino>_<color>.webp.
// Uso (con el servidor de desarrollo en marcha): node tools/vecinos-retratos-pelo.mjs [vecino…]
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';

// (OUT: otra carpeta mientras se hacen; la del juego la vigila el servidor de desarrollo, que recargaba la página a medias)
const URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT || 'src/assets/meshy/portraits/pelo';
mkdirSync(OUT, { recursive: true });
const lista = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync('src/assets/meshy/vecinos').filter(f => f.endsWith('.glb')).map(f => f.replace('.glb', ''));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(URL + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__THREE, null, { timeout: 300000 });
for (const who of lista) {
  const out = await p.evaluate(async (who) => {
    const THREE = window.__THREE, { loadMeshy, GlbChar } = await import('/src/actors/glbChar.js');
    const { peloVecino } = await import('/src/actors/hairColor.js'), { fillMaterial, sharpMap } = await import('/src/engine/charLight.js');
    const { TONOS, tonosDe } = await import('/src/actors/npcGlb.js'), PELO = (await import('/src/actors/peloVecinos.json')).default;
    const tonos = tonosDe(who); if (!tonos.length) return {};
    const tex = await new THREE.TextureLoader().loadAsync(`/src/assets/meshy/cerca/${who}.webp`);
    const g = await loadMeshy(who), res = {};
    for (const k of tonos) {
      const c = new GlbChar(g, {}); c.root.scale.setScalar(g.userData.fit);
      c.play('Idle', 0); c.update(0.05);   // (como los de siempre: CLIP=Idle T=0.05, tools/vecinos-glb.mjs)
      c.root.traverse(o => { if (!o.isSkinnedMesh || !o.material?.map) return; const m0 = o.material, m = m0.clone();
        tex.flipY = m0.map.flipY; tex.colorSpace = m0.map.colorSpace; tex.wrapS = m0.map.wrapS; tex.wrapT = m0.map.wrapT; tex.channel = m0.map.channel; tex.anisotropy = 8;
        m.map = tex; if (m0.emissiveMap) m.emissiveMap = tex; if (m0.userData.fillK != null) fillMaterial(m, m0.userData.fillK);
        o.material = peloVecino(sharpMap(m), TONOS[k], PELO[who].ref); });
      const scene = new THREE.Scene(); scene.add(c.root);
      scene.add(new THREE.HemisphereLight('#fff8ee', '#5a5868', 2.1)); const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(1.6, 3, 4); scene.add(sun);
      const fill = new THREE.DirectionalLight('#cfe0ff', 0.8); fill.position.set(-3, 1.5, 2); scene.add(fill);
      c.root.rotation.y = 0.3; c.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(c.root);
      let head = null; c.root.traverse(o => { if (o.isBone && /Head$/.test(o.name) && !head) head = o; });
      const hp = new THREE.Vector3().setFromMatrixPosition(head.matrixWorld);
      const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(256, 256); R.setClearColor(0x000000, 0);
      R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping;
      // (la caja en su postura de verdad y con aire encima, como tools/meshy-retratos.mjs)
      const top = new THREE.Box3().setFromObject(c.root, true).max.y, hh = top - hp.y, ya = hp.y - hh * 0.62, yb = top + hh * 0.2;
      const cam = new THREE.PerspectiveCamera(22, 1, 0.1, 50), cy = (ya + yb) / 2, span = yb - ya;
      const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(11)) * 1.02;
      cam.position.set(hp.x, cy + span * 0.04, hp.z + dist); cam.lookAt(hp.x, cy, hp.z);
      R.render(scene, cam); res[k] = R.domElement.toDataURL('image/png'); R.dispose();
    }
    return res;
  }, who);
  for (const [k, v] of Object.entries(out)) {
    const f = `${OUT}/${who}_${k}.png`; writeFileSync(f, Buffer.from(v.split(',')[1], 'base64'));
    execFileSync('python3', ['-c', `from PIL import Image; import os; Image.open('${f}').save('${f.replace('.png', '.webp')}', 'WEBP', quality=88, alpha_quality=90, method=6); os.remove('${f}')`], { env: { ...process.env, PYTHONPATH: process.env.PYTHONPATH || '' } });
  }
  console.log(who, Object.keys(out).join(' '));
}
await b.close();
