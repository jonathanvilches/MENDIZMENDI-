// Personajes de carnaval con el cuerpo KayKit (joaldun, momotxorro, zipotero…), con capturas.
// Uso: node tools/carnaval.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/carnaval'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1100, height: 620 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto('http://127.0.0.1:5173/?town=lesaka&q=mid&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const LOOKS = {
  joaldun: { shirt: '#f4f1ea', fur: '#ece4d2', hat: 'cone', hatColor: '#f4f1ea', skirt: '#f4f1ea', pants: '#1d2a4a', bells: true, scarf: '#3a8fd6', handkerchief: '#e8e0cc', face: 'brave' },
  mozorro: { shirt: '#6b8a3a', pattern: 'check', pattern2: '#e03c3c', pants: '#3a2a1a', hat: 'mask', hatColor: '#6b4a2e', maskColor: '#f1e7d6', stick: '#8a5a32' },
  'miel-otxin': { shirt: '#e03c3c', ribbons: true, pants: '#f2c230', hat: 'cone', hatColor: '#3a8fd6', height: 2.1, build: 1.2, face: 'angry' },
  zarratrako: { shirt: '#8a6a4a', pattern: 'stripes', pattern2: '#3ca05a', pants: '#6b4a2e', fur: '#b08650', hat: 'mask', hatColor: '#3a2a1a', bell: true, stick: '#6b4a2e' },
  cascabobo: { shirt: '#f2c230', pattern: 'dots', pattern2: '#e03c3c', pants: '#e03c3c', hat: 'cone', hatColor: '#e03c3c', bladder: true, face: 'happy' },
  paloki: { shirt: '#b34fc4', ribbons: true, pants: '#f4f1ea', hat: 'cone', hatColor: '#f2c230', height: 2.0 },
  lagunero: { shirt: '#2b3a6b', print: 'coat', pants: '#f4f1ea', hat: 'bicorne', bigHead: true, face: 'angry', moustache: '#2a1a12', moustacheCurl: true },
  zipotero: { shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f2c230', pants: '#e03c3c', hat: 'mask', hatColor: '#f2c230', bladder: true, face: 'angry' },
  momotxorro: null,
};
const info = await p.evaluate(async (LOOKS) => {
  const G = window.__game, { Actor } = await import('/src/actors/people.js'), { COSTUMES } = await import('/src/actors/minifig.js'), T = window.__THREE;
  LOOKS.momotxorro = COSTUMES.momotxorro;
  const P = G.player.pos, res = {}; G.player.frozen = true; G.ui.hudVisible?.(false);
  Object.entries(LOOKS).forEach(([k, look], i) => { const a = new Actor({ id: 'c' + k, name: k, x: P.x - 9 + i * 2, z: P.z - 7 - (i % 2) * 2.5, heading: 0, look }, G.scene); a.frozen = true; G.actors.push(a); a.pos.y = window.__hf.groundHeight(a.pos.x, a.pos.z); a.sync?.(); res[k] = !!a.glb; });
  const c = new T.Vector3(P.x, P.y + 2.6, P.z + 4), l = new T.Vector3(P.x, P.y + 1.4, P.z - 8);
  G.follow.cinematic = { pos: c, look: l, t: 0, lookCur: l.clone() }; G.camera.position.copy(c); G.camera.lookAt(l);
  return res;
}, LOOKS);
console.log(JSON.stringify(info));
await p.waitForTimeout(4000); await p.screenshot({ path: `${out}/carnaval.png`, timeout: 180000 });
console.log('errores', JSON.stringify(errs));
await browser.close();
