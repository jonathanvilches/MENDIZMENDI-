// La lámina de los 10 pelotaris de siempre (pelota/aspectos.js): 5 chicos y 5 chicas, en el juego, de frente, de
// espaldas y un primer plano de cada cara. Para enseñársela al autor antes de tocar nada más.
// Uso: node tools/lamina-pelotaris.mjs <carpeta>   (servidor de pruebas en 5173; MOVIL=1: con los modelos de 1024)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1800, height: 760 }, deviceScaleFactor: 1 }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|google|Failed to load/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); });
await p.goto('http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.addStyleTag({ content: '#ui > *, #hud, .hud { display: none !important; }' });
// (quién sale: un nombre de la plantilla por cada aspecto, con la camiseta alternada)
const QUIEN = (process.env.QUIEN || 'Iñigo,Unai,Ander,Aitor,Mikel,Garazi,Maialen,Irati,Oihana,Amaia').split(',');
const info = await p.evaluate(async (QUIEN) => {
  const G = window.__game, T = window.__THREE;
  const { loadChica } = await import('/src/actors/chicas.js'), { loadMeshy, GlbChar, MESHY_GAIT, fullTexFor } = await import('/src/actors/glbChar.js'), { outfitTint } = await import('/src/actors/npcOutfit.js');
  const { aspectoDe } = await import('/src/pelota/aspectos.js'), { pelotariHair, pelotariGirl } = await import('/src/ui/pelotariFig.js');
  G.player.obj.visible = false; for (const o of G.actors || []) if (o.obj) o.obj.visible = false;
  const P = G.player.pos, h = G.player.heading; fullTexFor('pelotari'); fullTexFor('pelotari_rojo');
  const chars = [], inf = [];
  for (let i = 0; i < QUIEN.length; i++) {
    const name = QUIEN[i], girl = pelotariGirl(name), A = aspectoDe(name, girl), rojo = i % 2 === 1, hair = pelotariHair(name), model = rojo ? 'pelotari_rojo' : 'pelotari';
    const g = A.peinado ? await loadChica('pelotari', A.peinado, false, A.cabeza) : await loadMeshy(model);
    const c = new GlbChar(g, { ...MESHY_GAIT }); c.root.scale.setScalar(g.userData.fit);
    outfitTint(c.root, A.peinado ? 'pelotari' : model, { shirt: A.peinado && rojo ? '#c8222a' : null, hair, skin: A.piel });
    const obj = new T.Group(); obj.add(c.root); const off = (i - (QUIEN.length - 1) / 2) * 1.0;
    obj.position.set(P.x + Math.sin(h) * 4 + Math.cos(h) * off, P.y, P.z + Math.cos(h) * 4 - Math.sin(h) * off); obj.rotation.y = h + Math.PI;
    G.scene.add(obj); chars.push({ c, obj }); let v = 0; obj.traverse(o => { if (o.isMesh) v += o.geometry.attributes.position.count; }); inf.push(`${name}:${A.id}:${v}`);
  }
  window.__ch = chars; let last = performance.now();
  const loop = () => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; for (const { c } of chars) { c.setSpeed(window.__vel || 0); c.update(dt); } requestAnimationFrame(loop); }; loop();
  // (modo: 'frente' | 'espalda' todos; o el primer plano de la cara de uno, o de varios seguidos: 'cara', i0, n)
  window.__aim = (modo, i0 = 0, n = 5) => {
    const cen = new T.Vector3(); for (let k = i0; k < i0 + n; k++) cen.add(chars[k].obj.position); cen.multiplyScalar(1 / n);
    const cara = modo === 'cara' || modo === 'nuca', s = modo === 'espalda' || modo === 'nuca' ? -1 : 1, tgt = cen.clone(); tgt.y = P.y + (cara ? 1.33 : 0.85);
    const d = cara ? 4.4 : 11.2, hh = modo === 'lado' ? h + 1.15 : h, pos = new T.Vector3(tgt.x - Math.sin(hh) * d * s, tgt.y + (cara ? 0.02 : 0.2), tgt.z - Math.cos(hh) * d * s);
    G.follow.cinematic = { pos, look: tgt, t: 1, lookCur: tgt.clone() }; G.camera.position.copy(pos); G.camera.fov = cara ? 15.5 : modo === 'lado' ? 22 : 22; G.camera.updateProjectionMatrix(); G.camera.lookAt(tgt);
  };
  return inf;
}, QUIEN);
const foto = async (nombre, ...a) => { for (let i = 0; i < 8; i++) { await p.evaluate((a) => window.__aim(...a), a); await p.waitForTimeout(300); } await p.screenshot({ path: `${out}/${nombre}.png` }); };
await foto('frente', 'frente', 0, 10); await foto('espalda', 'espalda', 0, 10);
// (corriendo, de medio lado: el pelo con el cuerpo en movimiento)
await p.evaluate(() => { window.__vel = 5; }); await foto('corriendo', 'lado', 0, 10); await p.evaluate(() => { window.__vel = 0; });
await p.setViewportSize({ width: 1800, height: 420 });
await foto('caras-chicos', 'cara', 0, 5); await foto('caras-chicas', 'cara', 5, 5); await foto('nucas-chicos', 'nuca', 0, 5); await foto('nucas-chicas', 'nuca', 5, 5);
console.log(info.join('  '), '\nerrores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno');
await b.close();
