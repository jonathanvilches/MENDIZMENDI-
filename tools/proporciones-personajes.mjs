// Las proporciones de los personajes de Meshy: todos a su altura del juego, en filas con rayas cada 50 cm, y sus medidas con
// los huesos (cabezas de alto, de la base del cráneo, Head, a la coronilla, HeadTop_End; hombros, torso y piernas, partidos
// por la estatura). Con las proporciones de glbChar.js (CABEZA) puestas. Todo personaje nuevo se mide con esto antes de
// entrar: la referencia es el campesino (4,99 cabezas) y el joaldun (4,88). Lo pidió el autor el 17 de noviembre de 2026.
// Uso: FILAS='{"adultos":["hombre","campesino"],"seres":["lamia"]}' node tools/proporciones-personajes.mjs <carpeta>
//   (sin FILAS, todos). Deja fila-<grupo>.png y medidas.json; contra el servidor de desarrollo (5173)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const FILAS = process.env.FILAS ? JSON.parse(process.env.FILAS) : { adultos: ['hombre', 'campesino', 'carpintero', 'quesero', 'panadero', 'mujer', 'joven_rubia', 'campesina', 'carpintera', 'quesera', 'panadera'], 'mayores-ninos': ['abuelo_bigote', 'abuelo_barba', 'abuelo', 'abuela_trenzas', 'abuela_mono', 'abuela_panuelo', 'nino_moreno', 'nino_rubio', 'nina_pelirroja', 'nina_trenzas', 'explorador', 'exploradora'], 'trajes-seres': ['sanfermin', 'pastor', 'osasuna', 'pelotari', 'joaldun', 'bobo', 'momotxorro', 'zarratrako', 'lamia', 'basajaun'] };
const out = process.argv[2]; (await import('node:fs')).mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1800, height: 700 } });
p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
await p.goto('http://127.0.0.1:5173/?skipintro=1', { timeout: 300000 }); await p.waitForTimeout(6000);
const med = {};
for (const [k, NOMBRES] of Object.entries(FILAS)) {
  const r = await p.evaluate(async ({ NOMBRES }) => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/\.vite\/deps\/three\.js/.test(n));
    const THREE = await import(url); const G = await import('/src/actors/glbChar.js');
    document.querySelector('#filaC')?.remove();
    const W = 1800, H = 520; const c = document.createElement('canvas'); c.id = 'filaC'; c.width = W; c.height = H; c.style.cssText = 'position:fixed;inset:0;z-index:99999'; document.body.append(c);
    const ren = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true }); ren.setClearColor('#dfe6ea');
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#889', 2.2)); const sol = new THREE.DirectionalLight('#fff', 1.6); sol.position.set(2, 5, 6); sc.add(sol);
    const N = NOMBRES.length, paso = 1.15, x0 = -(N - 1) * paso / 2, M = {};
    for (let y = 0; y <= 2.5; y += 0.5) { const g = new THREE.Mesh(new THREE.BoxGeometry(N * paso + 1, 0.006, 0.01), new THREE.MeshBasicMaterial({ color: y === 0 ? '#333' : '#8a96a0' })); g.position.set(0, y, -0.6); sc.add(g); }
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const n = NOMBRES[i]; let g; try { g = await G.loadMeshy(n, false, true); } catch (e) { M[n] = { error: e.message }; continue; }
      const o = g.scene; o.scale.setScalar(g.userData.fit || 1); o.position.x = x0 + i * paso; sc.add(o);
      o.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(o);
      const B = {}; o.traverse(q => { if (q.isBone) B[q.name.replace('mixamorig', '')] = q.getWorldPosition(v).clone(); });
      const y0 = bx.min.y, top = B.HeadTop_End?.y ?? bx.max.y, est = top - y0;
      M[n] = { alto: +(bx.max.y - y0).toFixed(2), estatura: +est.toFixed(2),
        cabeza: B.Head ? +((top - B.Head.y) / est).toFixed(3) : null,   // (lo que ocupa la cabeza, de la base del cráneo a la coronilla)
        cabezas: B.Head ? +(est / (top - B.Head.y)).toFixed(2) : null,  // (cuántas cabezas mide)
        hombros: B.LeftArm && B.RightArm ? +(Math.abs(B.LeftArm.x - B.RightArm.x) / est).toFixed(3) : null,
        torso: B.Neck && B.Hips ? +((B.Neck.y - B.Hips.y) / est).toFixed(3) : null,
        piernas: B.Hips ? +((B.Hips.y - y0) / est).toFixed(3) : null,
        cabezaM: B.Head ? +(top - B.Head.y).toFixed(3) : null };
    }
    const hw = N * paso / 2 + 0.3, hh = hw * H / W; const cam = new THREE.OrthographicCamera(-hw, hw, hh * 2 - 0.2, -0.2, 0.1, 50); cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
    ren.render(sc, cam); const img = c.toDataURL('image/png'); ren.dispose(); return { M, img };
  }, { NOMBRES });
  writeFileSync(`${out}/fila-${k}.png`, Buffer.from(r.img.split(',')[1], 'base64')); Object.assign(med, r.M); console.log(k, 'ok');
}
writeFileSync(`${out}/medidas.json`, JSON.stringify(med, null, 1)); await b.close();
