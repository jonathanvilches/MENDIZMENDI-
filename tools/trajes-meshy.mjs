// Vecinos con traje (carnaval, dantzaris, seres de leyenda) con los personajes nuevos: node tools/trajes-meshy.mjs <salida.png> [pueblo]
import { chromium } from 'playwright-core';
const [,, out = '/tmp/trajes.png', town = 'ituren'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
const logs = []; page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (/vecino|traje/i.test(m.text())) logs.push(m.text()); });
await page.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: { dog: true }, dogOn: false, settings: { music: false, quality: 'low' } })); });
await page.goto('http://127.0.0.1:5173/?town=' + town + '&noflora', { timeout: 300000 });
await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 300000 });
const r = await page.evaluate(async () => {
  const G = window.__game, { Actor } = await import('/src/actors/people.js'), { FOLK } = await import('/src/game/townGame.js').catch(() => ({}));
  const P = G.player.pos, h = G.player.heading;
  const looks = [
    ['joaldun', { shirt: '#ffffff', pants: '#ffffff', fur: '#ece4d2', hat: 'cone', hatColor: '#ffffff', ribbons: true, bells: true }],
    ['momotxorro', { shirt: '#ffffff', pants: '#ffffff', fur: '#3a2a1a', horns: true, hat: 'basket' }],
    ['dantzari', { shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', scarf: '#d42f2f', ribbons: ['#d42f2f', '#f2c230'] }],
    ['basajaun', { myth: 'basajaun' }], ['lamia', { myth: 'lamia' }], ['sorgina', { myth: 'sorgina' }],
  ];
  const out = [];
  looks.forEach(([n, look], i) => { const a = new Actor({ id: 't' + i, name: n, x: P.x + Math.sin(h) * 7 + (i - 2.5) * 2.2 * Math.cos(h), z: P.z + Math.cos(h) * 7 - (i - 2.5) * 2.2 * Math.sin(h), heading: h + Math.PI, look }, G.scene); a.wander = 0; G.actors.push(a); out.push(n + ':' + (a.obj.userData.meshy || 'otro')); });
  // plano fijo delante de la fila
  const THREE = await import('/node_modules/.vite/deps/three.js'), c = new THREE.Vector3(P.x + Math.sin(h) * 7, P.y + 1.5, P.z + Math.cos(h) * 7);
  G.follow.cinematic = { pos: new THREE.Vector3(c.x - Math.sin(h) * 12, c.y + 2.2, c.z - Math.cos(h) * 12), look: c.clone().setY(c.y + 0.4), t: 0 };
  G.player.obj.visible = false; return out;
});
await page.waitForTimeout(6000);
await page.screenshot({ path: out });
console.log(JSON.stringify(await page.evaluate(() => window.__game.actors.filter(a => a.id[0] === 't' && a.id.length < 3).map(a => { let n = 0; a.obj.traverse(o => { if (o.isMesh) n++; }); return [a.name, n, +a.glb?.root.scale.x.toFixed(2)]; }))));
console.log(JSON.stringify(r), logs.join('\n'));
await browser.close();
