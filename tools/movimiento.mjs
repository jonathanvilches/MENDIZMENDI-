// Movimiento de los personajes: en cada pueblo pedido se simulan 60 s de los vecinos que pasean (sin el jugador cerca)
// y se mide si van con sentido: atascos (se paran contra algo), tiempo andando sin avanzar, veces dentro de una casa o
// un muro, veces atravesando una mata, y lo que recorren frente a lo que se alejan. También cuenta las matas cerca
// del pueblo que no tienen choque. Uso: node tools/movimiento.mjs [pueblo,pueblo…]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { appendFileSync, writeFileSync } from 'fs';
const towns = (process.argv[2] || 'lumbier,elizondo,olite').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
for (const t of towns) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${t}&q=low&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  const r = await p.evaluate(async () => { try {
    const G = window.__game, C = await import('/src/world/colliders.js'), NAV = await import('/src/world/nav.js');
    const far = { pos: { x: 1e4, y: 0, z: 1e4 } };
    const bushes = (window.__rt.nature.bushSpots || []).filter(s => Math.hypot(s.x - G.player.pos.x, s.z - G.player.pos.z) < 160);
    const inBush = (x, z) => bushes.some(s => Math.hypot(s.x - x, s.z - z) < 0.42 * s.s);
    const W = G.walkers.filter(a => a.route || a.wander > 0);
    const st = W.map(a => ({ id: a.id, path: 0, stuck: 0, stall: 0, inside: 0, bush: 0, x0: a.pos.x, z0: a.pos.z, maxD: 0, lx: a.pos.x, lz: a.pos.z, wasWalk: false }));
    const dt = 0.1;
    // objetos sin choque que se atraviesan: un rayo desde arriba en la posición del vecino; si lo primero que toca está
    // entre la rodilla y la cabeza (y no es él, otro personaje, el terreno, el agua ni el cielo), lo está atravesando
    const T = window.__THREE, rc = new T.Raycaster(), down = new T.Vector3(0, -1, 0), o3 = new T.Vector3(), hits = {};
    const people = new Set(); for (const a of G.actors.concat(G.walkers)) a.obj?.traverse(o => people.add(o)); G.player.obj?.traverse(o => people.add(o));
    const terr = new Set(); window.__rt.terrain?.group.traverse(o => terr.add(o)); window.__rt.fauna?.animals?.forEach(an => an.obj?.traverse(o => terr.add(o)));
    const cand = []; G.scene.traverse(o => { if (!o.isMesh || people.has(o) || terr.has(o)) return; const n = (o.name || '') + ' ' + (o.parent?.name || '');
      if (/terrain|terreno|water|agua|sky|cielo|hierba|grass|flor|beacon|baliza|matas|helecho|nube|niebla|lluvia|nieve/i.test(n)) return;
      if (o.material?.transparent && o.material?.depthWrite === false) return; const at = o.geometry?.attributes; if (!at?.position?.array || Object.values(at).some(x => !x.array) || (o.geometry.index && !o.geometry.index.array)) return; cand.push(o); });
    const gh = window.__hf.groundHeight;
    const probe = (x, z) => { const g = gh(x, z); rc.set(o3.set(x, g + 2.4, z), down); rc.far = 2.4; let h; try { h = rc.intersectObjects(cand, false)[0]; } catch (e) { for (let i = cand.length - 1; i >= 0; i--) { const at = cand[i].geometry?.attributes; if (!at || Object.values(at).some(x => !x.array)) cand.splice(i, 1); } return null; } if (!h) return null; const y = h.point.y - g; if (!(y > 0.3 && y < 1.8)) return null; let o = h.object, path = []; while (o && o !== G.scene && path.length < 4) { path.push(o.name || o.type); o = o.parent; } if ((window.__rt.fauna?.animals || []).some(an => { let q = h.object; while (q) { if (q === an.obj) return true; q = q.parent; } return false; })) return 'animal'; const bb = new T.Box3().setFromObject(h.object), sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()); return path.join("<") + ` y=${y.toFixed(2)} inst=${h.instanceId ?? "-"} [${sz.x.toFixed(1)}x${sz.y.toFixed(1)}x${sz.z.toFixed(1)} @${c.x.toFixed(0)},${c.z.toFixed(0)} mat:${h.object.material?.name || h.object.material?.type} col:${h.object.material?.color?.getHexString?.()}]`; };
    for (let k = 0; k < 600; k++) {
      NAV.navTick(2);
      W.forEach((a, i) => {
        const s = st[i]; const before = a.state;
        a.update(dt, far);
        const m = Math.hypot(a.pos.x - s.lx, a.pos.z - s.lz); s.path += m; s.lx = a.pos.x; s.lz = a.pos.z;
        s.maxD = Math.max(s.maxD, Math.hypot(a.pos.x - s.x0, a.pos.z - s.z0));
        if (a.state === 'walk' && m < 0.03) s.stall += dt;
        if ((a.stuckN || 0) > (s.se || 0)) s.stuck += a.stuckN - (s.se || 0);
        s.se = a.stuckN || 0;
        a.collider.ghost = true; if (!C.isFree(a.pos.x, a.pos.z, 0.15)) s.inside++; a.collider.ghost = false;
        if (inBush(a.pos.x, a.pos.z)) s.bush++;
        if (k % 5 === 0 && a.state === 'walk') { const n = probe(a.pos.x, a.pos.z); if (n) { s.prop = (s.prop || 0) + 1; hits[n] = (hits[n] || 0) + 1; } }
      });
    }
    const bushNoCol = bushes.filter(s => C.isFree(s.x, s.z, 0.05)).length;
    return { walkers: st.map(s => ({ id: s.id, m: +s.path.toFixed(0), lejos: +s.maxD.toFixed(0), atascos: s.stuck, parado: +s.stall.toFixed(1), dentro: s.inside, mata: s.bush, objeto: s.prop || 0 })), atraviesa: hits, matas: bushes.length, matasSinChoque: bushNoCol }; } catch (e) { return { error: e.stack.slice(0, 600) }; }
  });
  const row = { t, ...r, errs: errs.slice(0, 3) }; out.push(row); console.log(JSON.stringify(row));
  await p.close();
}
writeFileSync('/tmp/movimiento.json', JSON.stringify(out, null, 1)); await b.close();
