// Definición de los personajes: primeros planos del jugador (cerca y a media distancia) en calidad baja con la densidad
// de pantalla de un iPhone, para ver la textura (cara, ropa) sin fallos de color. Uso: node tools/personaje-cerca.mjs [avatar] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, avatar = 'sanfermin', out = 'entrega/personaje-cerca', town = 'lesaka'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((av) => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: av, seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low', music: false } })); }, avatar);
await p.goto(`${process.env.BASE || 'http://127.0.0.1:5173/'}?town=${town}&q=low&weather=clear&skipintro=1&t=11&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const info = await p.evaluate(() => { let m = null; window.__game.player.obj.traverse(o => { if (o.isMesh && o.material?.map && !m) m = o.material; }); return m ? { tex: m.map.image?.width, lienzo: !!m.map.isCanvasTexture, sharp: !!m.userData.sharp } : null; });
console.log('textura del jugador', JSON.stringify(info), 'ratio', await p.evaluate(() => window.__game.rt?.renderer?.getPixelRatio?.()));
for (const [name, dist, h] of [['cara', 1.3, 1.45], ['cuerpo', 2.8, 1.0], ['lejos', 6.5, 1.0]]) {
  await p.evaluate(([dist, h]) => { const G = window.__game, P = G.player.pos, hd = G.player.heading, V = G.camera.position.constructor;
    G.follow.cinematic = { pos: new V(P.x - Math.sin(hd) * dist, P.y + h + 0.1, P.z - Math.cos(hd) * dist), look: new V(P.x, P.y + h, P.z), t: 0 }; }, [dist, h]);
  await p.waitForTimeout(4500); await p.screenshot({ path: `${out}/${name}.png` });
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
