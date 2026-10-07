// El público y el entorno del frontón durante un partido: capturas desde la cámara del juego y desde la grada,
// y recuento de espectadores en 3D y en lámina. Uso: node tools/pelota-publico.mjs [pueblo] [carpeta] [ancho] [alto]
import { chromium } from 'playwright-core';
import { iphone } from './iphone.mjs';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-publico', W = '844', H = '390'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: true, hasTouch: true }); await iphone(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.BASE || 'http://127.0.0.1:5173/'}?town=${town}&q=low&weather=clear&skipintro=1&noflora${process.env.HORA ? '&t=' + process.env.HORA : ''}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForTimeout(16000);
await p.screenshot({ path: `${out}/juego.png` });
const info = await p.evaluate(() => { const G = window.__game, S = G.scene; let tri = 0, inst = 0, spr = 0, names = {};
  S.traverse(o => { if (!o.visible) return; if (o.isInstancedMesh) { inst++; names[o.name || o.geometry.type] = (names[o.name || o.geometry.type] || 0) + o.count; } if (o.isSprite) spr++; });
  return { calls: G.renderer?.info?.render?.calls, tris: G.renderer?.info?.render?.triangles, inst, spr, names }; });
console.log(JSON.stringify(info));
// vista desde la cancha hacia la grada
const shots = [['grada', [6, 1.7, 14], [14, 1.6, 18]], ['fondo', [0, 1.7, 30], [2, 3, 0]], ['lado', [-3, 2.5, 20], [12, 1.5, 20]]];
for (const [name, pos, look] of shots) {
  await p.evaluate(([pos, look]) => { const G = window.__game, C = G.fronton.court.group, cam = G.camera, V = cam.position.constructor;
    const v = new V(...pos), l = new V(...look); C.localToWorld(v); C.localToWorld(l);
    if (!window.__tick0) { window.__tick0 = G.pelotaTick; G.pelotaTick = (dt) => { window.__tick0(dt); window.__camFix?.(); }; }
    window.__camFix = () => { cam.position.copy(v); cam.lookAt(l); cam.updateMatrixWorld(); }; }, [pos, look]).catch(e => console.log('cam', e.message));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${name}.png` });
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
