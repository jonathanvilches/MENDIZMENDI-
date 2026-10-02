// ¿Va a tirones el personaje? Para el bucle y avanza el juego a mano a 60 fps exactos con el jugador andando (y luego
// corriendo), apuntando en cada fotograma dónde están la raíz, la cadera y la cabeza del personaje en el mundo. Un
// movimiento fluido tiene la aceleración pequeña y pareja; un tirón es un pico. Compara varios avatares.
// Uso: node tools/tirones.mjs [pueblo] [avatares]
import { chromium } from 'playwright-core';
const [,, town = 'lesaka', avs = 'sanfermin,ranger'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const av of avs.split(',')) {
  const p = await b.newPage({ viewport: { width: 400, height: 240 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript((a) => { window.__JIT = true; localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, avatar: a, mz2: true, seen: { heroBenat: true, dog: true } })); }, av);
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  const r = await p.evaluate(() => {
    const rt = window.__rt, G = window.__game, P = rt.player, THREE = window.__THREE; rt.active = false;
    const rig = P.rig, bones = {}; rig.obj.traverse(o => { if (o.isBone) bones[o.name] = o; });
    const hips = bones.mixamorigHips || bones.hips || bones.Hips, head = bones.mixamorigHead || bones.head || bones.Head;
    const rec = [], v = new THREE.Vector3();
    const run = (n, keys) => { G.input.keys.clear(); keys.forEach(k => G.input.keys.add(k));
      for (let i = 0; i < n; i++) { const dt = window.__JIT ? (Math.random() < 0.15 ? 1 / 30 : 1 / 60 + (Math.random() - 0.5) * 0.004) : 1 / 60; rt.step(dt, G, G.input); G.input.endFrame?.(); rt.scene.updateMatrixWorld(true);
        rec.push({ root: P.obj.position.toArray(), hips: hips ? hips.getWorldPosition(v).toArray() : null, head: head ? head.getWorldPosition(v).toArray() : null, clip: rig.char?.currentName, ts: rig.char?.current?.timeScale, sp: P.speed, pitch: rig.pitch, roll: rig.roll, rs: rig.lastSpeed }); } };
    run(60, ['w']); const walk0 = rec.length; run(120, ['w']); const walk1 = rec.length; run(60, ['w', 'shift']); const run0 = rec.length; run(120, ['w', 'shift']);
    // aceleración (segunda diferencia) de cada punto, en cm por fotograma²; se quita el avance medio de la raíz
    const jerk = (key, a, b) => { const out = []; for (let i = a + 2; i < b; i++) { const p0 = rec[i - 2][key], p1 = rec[i - 1][key], p2 = rec[i][key]; if (!p0) return null; out.push(Math.hypot(p2[0] - 2 * p1[0] + p0[0], p2[1] - 2 * p1[1] + p0[1], p2[2] - 2 * p1[2] + p0[2]) * 100); } out.sort((x, y) => x - y); return { med: +out[out.length >> 1].toFixed(2), p95: +out[Math.floor(out.length * 0.95)].toFixed(2), max: +out[out.length - 1].toFixed(2) }; };
    const clips = (a, b) => [...new Set(rec.slice(a, b).map(r => r.clip))].join('/');
    const tsr = (a, b) => { const t = rec.slice(a, b).map(r => r.ts); return Math.min(...t).toFixed(2) + '–' + Math.max(...t).toFixed(2); };
    const spr = (a, b) => { const t = rec.slice(a, b).map(r => r.sp); return Math.min(...t).toFixed(2) + '–' + Math.max(...t).toFixed(2); };
    const sw = (key, a, b) => { const t = rec.slice(a, b).map(r => r[key] ?? 0); let m = 0; for (let i = 1; i < t.length; i++) m = Math.max(m, Math.abs(t[i] - t[i - 1])); return (Math.min(...t)).toFixed(3) + '…' + Math.max(...t).toFixed(3) + ' salto ' + m.toFixed(3); };
    rt.active = true;
    return { inclinacion: sw('pitch', walk0, rec.length), velRig: sw('rs', walk0, rec.length), andar: { clips: clips(walk0, walk1), ritmo: tsr(walk0, walk1), vel: spr(walk0, walk1), raiz: jerk('root', walk0, walk1), cadera: jerk('hips', walk0, walk1), cabeza: jerk('head', walk0, walk1) },
      correr: { clips: clips(run0, rec.length), ritmo: tsr(run0, rec.length), vel: spr(run0, rec.length), raiz: jerk('root', run0, rec.length), cadera: jerk('hips', run0, rec.length), cabeza: jerk('head', run0, rec.length) } };
  });
  console.log(av, JSON.stringify(r, null, 0), errs.length ? errs.slice(0, 2) : '');
  await p.close();
}
await b.close();
