// Lámina de clips del pelotari: cada fila un clip, cada columna un instante; arriba de frente, abajo de lado.
// Uso: node tools/clips-ver.mjs salida.png modelo "Run:0,0.1,...;Celebrate2:..." [vistas: frente,lado]
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const [,, out = 'clips.png', modelo = 'pelotari_inigo', lista = 'Run:0,0.1,0.2,0.3,0.4,0.5', vistas = 'frente,lado'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); });
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low&weather=clear&skipintro=1&noflora&novuelo', { timeout: 300000 });
await p.waitForFunction(() => window.__THREE && window.__game && window.__renderer, null, { timeout: 400000 });
const res = await p.evaluate(async ([modelo, lista, vistas]) => {
  const T = window.__THREE, { loadMeshy, GlbChar, MESHY_GAIT } = await import('/src/actors/glbChar.js');
  const g = await loadMeshy(modelo); const ch = new GlbChar(g, MESHY_GAIT); const root = ch.root;
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const W = 200, H = 300, r = window.__renderer, rtg = new T.WebGLRenderTarget(W, H, { samples: 4 }); rtg.texture.colorSpace = T.SRGBColorSpace; const buf = new Uint8Array(W * H * 4), img = new ImageData(W, H);
  const sc = new T.Scene(); sc.background = new T.Color('#d8d4cc'); sc.add(new T.HemisphereLight('#ffffff', '#887766', 1.6)); const dl = new T.DirectionalLight('#ffffff', 2.2); dl.position.set(2, 4, 3); sc.add(dl);
  const suelo = new T.Mesh(new T.PlaneGeometry(6, 6), new T.MeshLambertMaterial({ color: '#bdb6aa' })); suelo.rotation.x = -Math.PI / 2; sc.add(suelo);
  sc.add(root); const cam = new T.PerspectiveCamera(30, W / H, 0.1, 50);
  const pinta = (ctx, x, y) => { const tm = r.toneMapping; r.toneMapping = T.NoToneMapping; r.setRenderTarget(rtg); r.render(sc, cam); r.setRenderTarget(null); r.toneMapping = tm; r.readRenderTargetPixels(rtg, 0, 0, W, H, buf); for (let j = 0; j < H; j++) img.data.set(buf.subarray((H - 1 - j) * W * 4, (H - j) * W * 4), j * W * 4); ctx.putImageData(img, x, y); };
  const filas = lista.split(';').map(s => { const [n, ts] = s.split(':'); return [n, ts.split(',').map(Number)]; });
  const V = vistas.split(','), D = { frente: [0, 3.4], lado: [3.4, 0], detras: [0, -3.4], arriba: [0.01, 0.5] };
  const cols = Math.max(...filas.map(f => f[1].length)), cv = document.createElement('canvas'); cv.width = cols * W; cv.height = filas.length * V.length * H; const ctx = cv.getContext('2d');
  const info = {}; const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; });
  const P = (b) => new T.Vector3().setFromMatrixPosition(b.matrixWorld);
  filas.forEach(([n, ts], fi) => {
    const a = ch.actions[n]; if (!a) { info[n] = 'NO EXISTE (hay: ' + Object.keys(ch.actions).join(',') + ')'; return; }
    ch.mixer.stopAllAction(); a.reset().setEffectiveWeight(1).play(); const dur = a.getClip().duration; info[n] = { dur: +dur.toFixed(2), m: [] };
    ts.forEach((t, ci) => {
      ch.mixer.setTime(Math.min(dur - 1e-3, t)); root.updateMatrixWorld(true);
      const hips = P(B.Hips), cab = P(B.Head);
      // medidas: separación de los tobillos de lado (x) y de las rodillas; distancia de manos y antebrazos al centro de la cabeza
      const Lf = P(B.LeftFoot), Rf = P(B.RightFoot), Lk = P(B.LeftLeg), Rk = P(B.RightLeg), Lu = P(B.LeftUpLeg), Ru = P(B.RightUpLeg);
      const cc = cab.clone().add(new T.Vector3(0, 0.12, 0));
      const dSeg = (A, Bp) => { const ab = Bp.clone().sub(A), t = Math.max(0, Math.min(1, cc.clone().sub(A).dot(ab) / ab.lengthSq())); return A.clone().addScaledVector(ab, t).distanceTo(cc); };
      const dL = Math.min(dSeg(P(B.LeftArm), P(B.LeftForeArm)), dSeg(P(B.LeftForeArm), P(B.LeftHand))), dR = Math.min(dSeg(P(B.RightArm), P(B.RightForeArm)), dSeg(P(B.RightForeArm), P(B.RightHand)));
      info[n].m.push({ t, pies: +(Lf.x - Rf.x).toFixed(3), rod: +(Lk.x - Rk.x).toFixed(3), cad: +(Lu.x - Ru.x).toFixed(3), cabL: +dL.toFixed(3), cabR: +dR.toFixed(3) });
      V.forEach((v, vi) => { const [dx, dz] = D[v]; const y = v === 'arriba' ? 4 : hips.y + 0.25; cam.position.set(hips.x + dx, y, hips.z + dz); cam.lookAt(hips.x, hips.y + 0.25, hips.z); pinta(ctx, ci * W, (fi * V.length + vi) * H); ctx.fillStyle = '#900'; ctx.font = '13px sans-serif'; ctx.fillText(`${n} ${t}s ${v}`, ci * W + 4, (fi * V.length + vi) * H + 15); });
    });
  });
  return { url: cv.toDataURL('image/png'), info, fit: g.userData.fit };
}, [modelo, lista, vistas]);
writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
console.log(JSON.stringify(res.info));
console.log('ERRORES', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
