// Portadas de cada pueblo con aire de videojuego: foto del propio juego a pie de calle, al atardecer, desde la plaza
// mirando a la iglesia (o al monumento del pueblo), sin personajes ni interfaz. Encima, en el menú, va el personaje
// del jugador con la misma luz (src/assets/portadas/heroe). Salen en /tmp/puebloportada/<pueblo>.png;
// tools/puebloportada.py les da el acabado (grado de color, viñeta, profundidad) y las pasa al proyecto.
// Uso: node tools/puebloportada.mjs [pueblo,…]   (URL=http://127.0.0.1:5174 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
const BASE = (process.env.URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
const out = '/tmp/puebloportada'; mkdirSync(out, { recursive: true });
// encuadres a mano donde la iglesia no es lo mejor: pueblo → [tipo de monumento, distancia, altura, giro]
const OVR = { olite: ['castle', 80, 2.2, 0], javier: ['castle', 75, 2.2, 0], marcilla: ['castle', 95, 2.2, 0], pamplona: ['church', 95, 2.2, 0] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const list = await (async () => {
  if (process.argv[2]) return process.argv[2].split(',');
  const p = await b.newPage(); await p.goto(BASE + '/', { timeout: 300000 });
  const ids = await p.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.filter(l => !l.special).map(l => l.id));
  await p.close(); return ids;
})();
console.log(list.length, 'pueblos');
for (const town of list) {
  if (process.env.SKIP && existsSync(`${out}/${town}.png`)) continue;
  const [kind, dist, high, turn] = OVR[town] || ['church', 44, 1.9, 0];
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', e => console.log('ERR', town, e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'high' } })); } catch (e) { } });
  try {
    await p.goto(`${BASE}/?town=${town}&q=high&weather=clear&t=18.1&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
    await p.waitForTimeout(3000);
    const info = await p.evaluate(([kind, dist, high, turn]) => {
      const rt = window.__rt, P = window.__layout.PLACES, H = (x, z) => { try { return window.__hf.groundHeight(x, z) || 0; } catch (e) { return 0; } };
      const lm = kind === 'church' ? (P.church || P.plaza) : ((P.landmarks || []).find(l => l.kind === kind) || P.church || P.plaza);
      rt.scene.traverse(o => { if (o.isSkinnedMesh || /GlbChar|Animal|dog|perro|crowd|particles/i.test(o.name)) o.visible = false; });
      const pl = rt.player; const po = pl && (pl.root || pl.obj || pl.mesh || pl.group); if (po) po.visible = false;
      if (rt.sky) { rt.sky.speed = 0; rt.sky.time = 18.1; }
      // desde la plaza hacia el monumento, a la altura de los ojos (algo más bajo: plano heroico)
      let dx = P.plaza.x - lm.x, dz = P.plaza.z - lm.z, d = Math.hypot(dx, dz);
      if (d < 5) { dx = 0; dz = 1; d = 1; }
      // la cámara se aparta a un lado: el monumento queda en un tercio y el otro, libre para el personaje. Se prueban
      // giros y distancias hasta que nada tape la vista del monumento (ni casas ni árboles a menos de 10 m)
      const T0 = window.__THREE, rc = new T0.Raycaster(), solid = [];
      // algunos objetos de la escena no se dejan atravesar por el rayo (geometrías a medias): se saltan
      const cast = (L = solid) => { const out = []; for (const o of L) { try { o.raycast(rc, out); } catch (e) { } } return out.sort((x, y) => x.distance - y.distance); };
      const near = [];   // para lo pegado a la cámara cuenta también lo pequeño (puestos, balcones, farolas)
      rt.scene.traverse(o => { if (!o.isMesh || !o.visible || o.isSkinnedMesh || !o.geometry || /terrain|ground|sky|water|road|street|path|grass/i.test(o.name || '')) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const sc = o.getWorldScale(new T0.Vector3()), r = o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z); if (o.isInstancedMesh || r > 4.5) solid.push(o); if (o.isInstancedMesh || r > 0.8) near.push(o); });
      const own = kind === 'church' ? 17 : 30;   // lo que está tan cerca del monumento es el propio monumento
      const gy = H(lm.x, lm.z), base = Math.atan2(dz, dx) + turn * Math.PI / 180;
      let pick = null, tries = 0;
      outer: for (const dd of [dist, dist * 0.8, dist * 1.25, dist * 0.65])
        for (const tr of [0, 25, -25, 50, -50, 80, -80, 120, -120, 180]) {
          const a = base + tr * Math.PI / 180, sd = dd * 0.24;
          const cx = lm.x + Math.cos(a) * dd - Math.sin(a) * sd, cz = lm.z + Math.sin(a) * dd + Math.cos(a) * sd, cy = H(cx, cz) + high;
          let ok = true;
          for (const hy of [1.5, 5]) {
            const o = new T0.Vector3(cx, cy, cz), to = new T0.Vector3(lm.x, gy + hy, lm.z), dir = to.clone().sub(o), L = dir.length(); dir.normalize();
            rc.set(o, dir); rc.far = Math.max(1, L - own); tries++;
            const hit = cast().find(h => h.distance > 0.3);
            if (hit) { ok = false; (window.__blk ||= []).push((hit.object.name || hit.object.parent?.name || "?") + ":" + Math.round(hit.distance) + "/" + Math.round(L) + ":" + Math.round(hit.object.geometry.boundingSphere.radius)); break; }
          }
          // y que no haya nada grande pegado a la cámara en todo el encuadre (una pared a un lado lo estropea)
          if (ok) {
            const lx = lm.x + Math.sin(a) * dd * 0.33, lz = lm.z - Math.cos(a) * dd * 0.33, yaw = Math.atan2(lz - cz, lx - cx);
            for (const off of [-26, -16, -8, 0, 8]) {
              const y = yaw + off * Math.PI / 180;
              rc.set(new T0.Vector3(cx, cy, cz), new T0.Vector3(Math.cos(y), -0.04, Math.sin(y)).normalize()); rc.far = 13; tries++;
              if (cast(near).length) { ok = false; (window.__blk ||= []).push('cerca'); break; }
            }
          }
          if (ok) { pick = { a, cx, cy, cz, dd, tr }; break outer; }
        }
      if (!pick) { const a = base, sd = dist * 0.24; pick = { a, cx: lm.x + Math.cos(a) * dist - Math.sin(a) * sd, cz: lm.z + Math.sin(a) * dist + Math.cos(a) * sd, dd: dist, tr: 'x' }; pick.cy = H(pick.cx, pick.cz) + high; }
      const { a, cx, cy, cz } = pick; dist = pick.dd;
      const c = rt.camera, f = rt.follow; if (f) f.update = () => {};
      c.fov = 48; c.aspect = 16 / 9; c.updateProjectionMatrix();
      c.position.set(cx, cy, cz); c.lookAt(lm.x + Math.sin(a) * dist * 0.33, Math.max(gy, cy - 2) + 6.5, lm.z - Math.cos(a) * dist * 0.33); c.updateMatrixWorld();
      // luz de estudio: el sol de la tarde queda detrás de la fachada (contraluz dorado en los bordes), así que se
      // añade una luz principal cálida desde detrás de la cámara, a un lado y baja, y un relleno frío suave
      const T = window.__THREE, fx = Math.cos(a), fz = Math.sin(a), sx = -fz, sz = fx;
      const key = new T.DirectionalLight('#ffc98a', 2.3); key.position.set(lm.x + fx * 60 + sx * 45, gy + 28, lm.z + fz * 60 + sz * 45); key.target.position.set(lm.x, gy, lm.z);
      const fill = new T.DirectionalLight('#9fb6ff', 0.55); fill.position.set(lm.x + fx * 40 - sx * 50, gy + 15, lm.z + fz * 40 - sz * 50); fill.target.position.set(lm.x, gy, lm.z);
      rt.scene.add(key, key.target, fill, fill.target);
      window.__stop = true;
      return { blk: (window.__blk || []).slice(0, 8), tr: pick.tr, dd: Math.round(pick.dd), tries, lm: [Math.round(lm.x), Math.round(lm.z)], cam: [Math.round(cx), Math.round(cy), Math.round(cz)] };
    }, [kind, dist, high, turn]);
    await p.waitForTimeout(2500);
    const url = await p.evaluate(() => { const rt = window.__rt; rt.renderer.setSize(1600, 900, false); rt.camera.aspect = 16 / 9; rt.camera.updateProjectionMatrix(); rt.renderer.render(rt.scene, rt.camera); return rt.renderer.domElement.toDataURL('image/png'); });
    writeFileSync(`${out}/${town}.png`, Buffer.from(url.split(',')[1], 'base64'));
    console.log('·', town, JSON.stringify(info));
  } catch (e) { console.log('FALLO', town, e.message.split('\n')[0]); }
  await p.close();
}
await b.close();
