// Las chicas en el juego, de cerca: el chico de cada modelo y su chica (completa y ligera), de frente, de espaldas, de
// lado corriendo y, de la chica completa, la cara, la nuca y el perfil. Una imagen por vista en la carpeta indicada.
// Uso: node tools/chicas/ver.mjs <carpeta> [modelo=osasuna] [peinado=coleta]   (servidor de pruebas en 5173; VISTAS=…;
//   PELO=#color para teñirla)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out, modelo = 'osasuna', peinado = 'coleta'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|google|Failed to load/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); });
await p.goto('http://127.0.0.1:5173/?town=ituren&noflora&weather=clear&skipintro=1&t=12', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.addStyleTag({ content: '#ui > *, #hud, .hud { display: none !important; }' });
if (process.env.OCULTA) await p.evaluate((k) => { window.__oculta = k; }, process.env.OCULTA);
if (process.env.SOLA) await p.evaluate((k) => { window.__sola = k; }, +process.env.SOLA);
if (process.env.SIN) await p.evaluate((k) => { window.__sin = k; }, +process.env.SIN);
if (process.env.CHICO_LOD) await p.evaluate(() => { window.__chicoLod = true; });
if (process.env.MAPA_CHICO) await p.evaluate(() => { window.__mapaChico = true; });
if (process.env.MAPA_CHICA) await p.evaluate(() => { window.__mapaChica = true; });
if (process.env.NEAREST) await p.evaluate(() => { window.__nearest = true; });
const info = await p.evaluate(async ([modelo, peinado, pelo]) => {
  const G = window.__game, T = window.__THREE;
  const { loadChica } = await import('/src/actors/chicas.js'), { loadMeshy, GlbChar, MESHY_GAIT } = await import('/src/actors/glbChar.js'), { hairTint } = await import('/src/actors/hairColor.js');
  G.player.obj.visible = false; for (const o of G.actors || []) if (o.obj) o.obj.visible = false;
  const P = G.player.pos, h = G.player.heading;
  // (CHICO_LOD=1: el chico, también en su versión ligera)
  const gs = [await loadMeshy(modelo, !!window.__chicoLod), await loadChica(modelo, peinado), await loadChica(modelo, peinado, true)];
  const chars = gs.map((g, i) => {
    const c = new GlbChar(g, { ...MESHY_GAIT }); c.root.scale.setScalar(g.userData.fit);
    if (pelo && i) hairTint(c.root, modelo, pelo);
    const obj = new T.Group(); obj.add(c.root); const off = (i - 1) * 1.3;
    obj.position.set(P.x + Math.sin(h) * 4 + Math.cos(h) * off, P.y, P.z + Math.cos(h) * 4 - Math.sin(h) * off); obj.rotation.y = h + Math.PI;
    G.scene.add(obj); return { c, obj };
  });
  // (OCULTA=pelo: sin las mallas del pelo; OCULTA=cuerpo: solo el pelo)
  const oc = window.__oculta; if (oc) for (const { obj } of chars) obj.traverse(o => { if (o.isMesh) o.visible = oc === 'pelo' ? !o.userData.pelo : oc === 'cuerpo' ? !!o.userData.pelo : true; });
  // (SOLA=i: solo ese: 0 el chico, 1 la chica, 2 la chica ligera; la de cerca, siempre en el sitio de la 1)
  if (window.__sin != null) chars[window.__sin].obj.visible = false;
  const sola = window.__sola; if (sola != null) chars.forEach(({ obj }, i) => { obj.visible = i === sola; if (i === sola) obj.position.copy(chars[1].obj.position); });
  // (MAPA_CHICO=1: la chica ligera con la textura del chico, para ver si un fallo es de la textura o de la malla)
  if (window.__mapaChico) { const g = await loadMeshy(modelo, true); let m0 = null; g.scene.traverse(o => { if (!m0 && o.isSkinnedMesh && o.material?.map) m0 = o.material; }); chars[2].obj.traverse(o => { if (o.isSkinnedMesh && !o.userData.pelo && o.material?.map) { o.material.map = m0.map; o.material.emissiveMap = m0.emissiveMap; o.material.needsUpdate = true; } }); }
  // (MAPA_CHICA=1: la chica ligera con la textura de la completa)
  if (window.__mapaChica) { let m0 = null; chars[1].obj.traverse(o => { if (!m0 && o.isSkinnedMesh && !o.userData.pelo && o.material?.map) m0 = o.material; }); chars[2].obj.traverse(o => { if (o.isSkinnedMesh && !o.userData.pelo && o.material?.map) { o.material.map = m0.map; o.material.emissiveMap = m0.emissiveMap; o.material.needsUpdate = true; } }); }
  // (NEAREST=1: la chica ligera sin mipmaps ni filtrado: si un fallo se va, es de los bordes de las piezas de la textura)
  if (window.__nearest) chars[2].obj.traverse(o => { if (o.isSkinnedMesh && o.material?.map) for (const t of [o.material.map, o.material.emissiveMap]) if (t) { t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; } });
  window.__ch = chars; let last = performance.now();
  const loop = () => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; for (const { c } of chars) { c.setSpeed(window.__vel || 0); c.update(dt); } requestAnimationFrame(loop); }; loop();
  window.__aim = (modo) => {
    const cerca = ['cara', 'nuca', 'perfil', 'tres'].includes(modo), d = cerca ? 1.0 : 4.6, s = modo === 'espalda' || modo === 'nuca' ? -1 : 1;
    const hh = h + (modo === 'lado' || modo === 'perfil' ? Math.PI / 2 : modo === 'tres' ? 0.7 : 0), cy = cerca ? 1.36 : 0.85;
    const tgt = cerca ? chars[1].obj.position.clone() : new T.Vector3(P.x + Math.sin(h) * 4, P.y, P.z + Math.cos(h) * 4); tgt.y = P.y + cy;
    const pos = new T.Vector3(tgt.x - Math.sin(hh) * d * s, tgt.y + (cerca ? 0.03 : 0.25), tgt.z - Math.cos(hh) * d * s);
    G.follow.cinematic = { pos, look: tgt, t: 1, lookCur: tgt.clone() }; G.camera.position.copy(pos); G.camera.lookAt(tgt);
  };
  let verts = 0; chars[1].obj.traverse(o => { if (o.isMesh) verts += o.geometry.attributes.position.count; });
  return { verts, mallas: (() => { const n = []; chars[1].obj.traverse(o => { if (o.isMesh) n.push(o.name); }); return n; })() };
}, [modelo, peinado, process.env.PELO || '']);
for (const modo of (process.env.VISTAS || 'frente,espalda,lado,cara,tres,perfil,nuca').split(',')) {
  await p.evaluate((m) => { window.__vel = m === 'lado' ? 5 : 0; }, modo);
  for (let i = 0; i < 6; i++) { await p.evaluate((m) => window.__aim(m), modo); await p.waitForTimeout(250); }
  await p.screenshot({ path: `${out}/${modo}.png` });
}
console.log(JSON.stringify(info), 'errores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno');
await b.close();
