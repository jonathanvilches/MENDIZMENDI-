// Vecinos nuevos (ropa propia sobre los personajes de Meshy): una fila con el sabio, la sabia, la tendera, el tendero y
// vecinos de distintos colores, delante del jugador. Uso: node tools/vecinos-shot.mjs [salida.png] [pueblo]
import { chromium } from 'playwright-core';
const [,, out = '/tmp/claude-0/vecinos.png', town = 'lumbier'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1000, height: 450 }, deviceScaleFactor: 2 }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|google/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&noflora&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const G = window.__game, { Actor } = await import('/src/actors/people.js');
  const P = G.player.pos, h = G.player.heading;
  const looks = [
    ['Sabio', { old: true, hair: '#d6d0c6', shirt: '#efe9dc', vest: '#2b2630', pants: '#2b2630', scarf: '#2b2630', txapela: '#1d1d24', beard: '#e8e4dc', staff: true }],
    ['Sabia', { old: true, female: true, hair: '#e4e0d8', shirt: '#6d4a6a', skirt: '#2b2630', pants: '#2b2630', scarf: '#3a2a3a', bun: true }],
    ['Tendera', { shirt: '#c0573a', apron: '#f4f1ea', skirt: '#3a3530', pants: '#3a3530', hair: '#4a3020', bun: true, female: true }],
    ['Tendero', { shirt: '#3d6b4a', apron: '#f4f1ea', pants: '#3a3530', hair: '#2a1a10' }],
    ['Vecina', { shirt: '#f2c230', skirt: '#2f5fb3', hair: '#a8642a', ponytail: true, female: true }],
    ['Vecino', { shirt: '#5a7fb0', pants: '#4a3a2a', vest: '#2d3a2b', hair: '#1d1410' }],
    ['Vecino 2', { shirt: '#8a2a3a', pants: '#2a3550', hair: '#6b4a2a', txapela: '#1d1d24' }],
    ['Vecina 2', { shirt: '#4a8a6a', skirt: '#5a3a5a', hair: '#1d1410', longHair: true, female: true }],
  ];
  const out = [];
  looks.forEach(([n, look], i) => { const a = new Actor({ id: 't' + i, name: n, x: P.x + Math.sin(h) * 4.2 + (i - 3.5) * 0.95 * Math.cos(h), z: P.z + Math.cos(h) * 4.2 - (i - 3.5) * 0.95 * Math.sin(h), heading: h + Math.PI, look }, G.scene); a.wander = 0; G.actors.push(a); out.push(n + ':' + (a.obj.userData.meshy || 'otro')); });
  const T = window.__THREE, c = new T.Vector3(P.x + Math.sin(h) * 6, P.y + 0.85, P.z + Math.cos(h) * 6), cam = new T.Vector3(P.x + Math.sin(h) * 1.2, P.y + 1.25, P.z + Math.cos(h) * 1.2);
  G.player.obj.visible = false; G.follow.cinematic = { pos: cam, look: c, t: 1 };
  return out;
});
console.log(r.join(' '));
await p.waitForTimeout(6000); await p.evaluate(() => { window.__rt.pixelRatio = window.__rt.maxRatio = 2; window.__rt.ratioDirty = true; }); await p.waitForTimeout(3000);
await p.screenshot({ path: out, clip: { x: 200, y: 190, width: 600, height: 200 }, timeout: 300000 });
console.log(errs.length ? errs.slice(0, 6).join('\n') : 'sin errores'); await b.close();
