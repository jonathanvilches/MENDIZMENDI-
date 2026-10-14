// Los personajes con traje (carnaval y leyenda) de cerca, uno a uno, de frente y de espaldas, en un pueblo a mediodía.
// Saca una imagen por personaje y vista en la carpeta indicada; tools/trajes/hoja.py las junta en una hoja.
// Uso: node tools/trajes/ver.mjs <carpeta> [nombres separados por comas] [pueblo]   (servidor en 5173; CERCA=1: también la cara; ANDAR=1: andando, también de lado)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out, names = 'joaldun,momotxorro,cascabobo,zipotero,caravinagre,lagunero,irasko,paloki,comparsa-mendigorria,miel-otxin,lamia,basajaun,sorgina,tartalo', town = 'ituren'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 520, height: 640 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|google|Failed to load/.test(m.text())) errs.push(m.text()); if (/traje|vecino/i.test(m.text()) && m.type() === 'warning') errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.addStyleTag({ content: '#ui > *, #hud, .hud { display: none !important; }' });
if (process.env.ANDAR) await p.evaluate(() => { window.__andar = true; });
await p.waitForTimeout(2000);
for (const name of names.split(',')) {
  const info = await p.evaluate(async (name) => {
    const G = window.__game, { Actor } = await import('/src/actors/people.js'), { FOLK } = await import('/src/game/townGame.js');
    const look = FOLK[name]; if (!look) return 'sin traje ' + name;
    (window.__traje && G.scene.remove(window.__traje.obj));
    const P = G.player.pos, h = G.player.heading, x = P.x + Math.sin(h) * 6, z = P.z + Math.cos(h) * 6;
    const a = new Actor({ id: 'tr', name, x, z, heading: h + Math.PI, look }, G.scene); a.wander = 0; a.frozen = true; window.__traje = a;
    // (ANDAR=1: anda sin moverse del sitio, para ver cómo van las faldas, las pieles y los cencerros al dar el paso)
    if (window.__andar) { const up = a.anim.update; a.anim.update = (dt, st) => up.call(a.anim, dt, { ...st, speed: 1.4 }); }
    G.player.obj.visible = false; for (const o of G.actors || []) if (o !== a && o.obj) o.obj.visible = false;
    a.obj.updateMatrixWorld(true); const T = window.__THREE, box = new T.Box3();
    // (el encuadre, por el cuerpo y lo que lleve en la cabeza: sin las herramientas en alto)
    a.obj.traverse(o => { if (o.isSkinnedMesh && !o.userData.traje) box.expandByObject(o); }); if (box.isEmpty()) box.setFromObject(a.obj);
    const all = new T.Box3().setFromObject(a.obj), H = Math.max(box.max.y - box.min.y, 1.2);
    window.__aim = (back, cara, lado) => { const s = back ? -1 : 1, d = cara ? H * 0.5 : Math.max(2.2, H * 1.45), c = new T.Vector3(x, box.min.y + H * (cara ? 0.8 : 0.58), z);
      const hh = h + (lado ? Math.PI / 2 : 0), pos = new T.Vector3(x - Math.sin(hh) * d * s, box.min.y + H * (cara ? 0.82 : 0.66), z - Math.cos(hh) * d * s);
      G.follow.cinematic = { pos, look: c, t: 1, lookCur: c.clone() }; G.camera.position.copy(pos); G.camera.lookAt(c); };
    return { name, alto: +H.toFixed(2), todo: +(all.max.y - all.min.y).toFixed(2), meshy: a.obj.userData.meshy, mallas: (() => { let n = 0; a.obj.traverse(o => { if (o.isMesh) n++; }); return n; })() };
  }, name);
  // de frente, de espaldas y (con CERCA=1) la cara de cerca
  for (const [back, cara, tag, lado] of [[false, false, 'frente'], [true, false, 'espalda'], ...(process.env.CERCA ? [[false, true, 'cara']] : []), ...(process.env.ANDAR ? [[false, false, 'lado', true]] : [])]) {
    for (let i = 0; i < 6; i++) { await p.evaluate(([bk, ca, la]) => window.__aim?.(bk, ca, la), [back, cara, !!lado]); await p.waitForTimeout(250); }
    await p.screenshot({ path: `${out}/${name}-${tag}.png` });
  }
  console.log(JSON.stringify(info));
}
console.log('errores:', errs.length ? errs.slice(0, 5).join(' | ') : 'ninguno');
await b.close();
