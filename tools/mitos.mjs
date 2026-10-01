// Seres de leyenda con el cuerpo KayKit: Basajaun, lamia, sorgina y Roldán junto a una persona, con capturas.
// Uso: node tools/mitos.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/mitos'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1100, height: 620 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto('http://127.0.0.1:5173/?town=lesaka&q=mid&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const info = await p.evaluate(async () => {
  const G = window.__game, { Actor } = await import('/src/actors/people.js'), T = window.__THREE;
  const P = G.player.pos, list = ['basajaun', 'lamia', 'sorgina', 'roldan'], res = {};
  G.player.frozen = true; G.ui.hudVisible?.(false);
  list.forEach((m, i) => { const a = new Actor({ id: 'm' + m, name: m, x: P.x - 4.5 + i * 3, z: P.z - 6, heading: 0, look: { myth: m } }, G.scene); a.frozen = true; G.actors.push(a); a.pos.y = window.__hf.groundHeight(a.pos.x, a.pos.z); a.sync?.(); const b = new T.Box3().setFromObject(a.obj); res[m] = { kk: !!a.glb, alto: (b.max.y - b.min.y).toFixed(2) }; });
  G.player.place(P.x + 1.5, P.z - 4.5, Math.PI);
  const c = new T.Vector3(P.x, P.y + 2.2, P.z + 3.5), l = new T.Vector3(P.x, P.y + 1.5, P.z - 6);
  G.follow.cinematic = { pos: c, look: l, t: 0, lookCur: l.clone() }; G.camera.position.copy(c); G.camera.lookAt(l);
  return res;
});
console.log(JSON.stringify(info));
await p.waitForTimeout(4000); await p.screenshot({ path: `${out}/mitos.png`, timeout: 180000 });
// de cerca: la lamia (patas de pato y peine) y Basajaun
for (const [m, dx] of [['lamia', -1.5], ['basajaun', -4.5]]) {
  await p.evaluate(([m, dx]) => { const G = window.__game, T = window.__THREE, a = G.actors.find(a => a.id === 'm' + m), q = a.pos; const c = new T.Vector3(q.x + 1.6, q.y + (m === 'lamia' ? 1.4 : 2.2), q.z + 3.6), l = new T.Vector3(q.x, q.y + (m === 'lamia' ? 1.1 : 1.8), q.z); G.follow.cinematic = { pos: c, look: l, t: 0, lookCur: l.clone() }; G.camera.position.copy(c); G.camera.lookAt(l); }, [m, dx]);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${m}.png`, timeout: 180000 });
}
console.log('errores', JSON.stringify(errs));
await browser.close();
