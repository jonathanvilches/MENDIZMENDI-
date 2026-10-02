// Público del encierro de cerca: tendidos de la plaza (sentados) y balcones de la Estafeta (de pie), con los toros
// entrando por la puerta de toriles. Uso: node tools/encierro-publico.mjs [carpeta]   (AVATAR=sanfermin opcional)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || '/tmp/claude-0/encpub'; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript((av) => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, ...(av ? { avatar: av } : {}), seen: { heroBenat: true, dog: true }, dogOn: false })); }, process.env.AVATAR || '');
await p.goto(`${URL}/?town=pamplona&q=high&weather=clear`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(async () => { const G = window.__game, M = G.missions.find(M => M.m.kind === 'encierro'); const { Encierro } = await import('/src/game/encierro.js'); G.__run = new Encierro(G).run(); });
await p.waitForFunction(() => window.__game.mode === 'encierro', null, { timeout: 120000 });
// que se cocinen las figuras 3D del público
await p.waitForFunction(() => { const E = window.__game.encierro; let n = 0; E.scene.traverse(o => { if (o.isInstancedMesh && o.material?.vertexColors && o.geometry.attributes.color) n++; }); return n >= 40; }, null, { timeout: 300000 }).catch(() => console.log('sin figuras 3D'));
const step = (secs) => p.evaluate((secs) => { const G = window.__game; for (let i = 0; i < secs * 30 && G.altUpdate; i++) G.altUpdate(1 / 30); }, secs);
const shot = async (n, f) => { await p.evaluate(f); await p.evaluate(() => { const E = window.__game.encierro; E.__cam = true; }); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${n}.png` }); console.log('foto', n); };
// cámara fija (el juego no la mueve mientras dura la foto)
await p.evaluate(() => { const E = window.__game.encierro; const cam = E.cam.bind(E); E.cam = (dt) => { if (!E.__cam) cam(dt); }; });
await step(3.2);
// la manada corriendo con el corredor por delante (balcones a los lados)
await step(5);
await shot('balcones', () => { const E = window.__game.encierro, me = E.me; E.camera.position.set(-1.6, 6.2, me.z + 3); E.camera.lookAt(2.6, 5.0, me.z - 6); });
await p.evaluate(() => { window.__game.encierro.__cam = false; });
// todos al final: el jugador en el ruedo y los toros cruzando hacia los toriles
await p.evaluate(() => { const E = window.__game.encierro; E.me.z = E.plaza.cz + 26; for (const b of E.bulls) { b.delay = 0; b.z = E.plaza.cz + 12 - Math.random() * 6; } for (const r of E.runners) r.z = E.plaza.cz + 22 - Math.random() * 4; });
await step(0.6);
await shot('tendidos-cerca', () => { const E = window.__game.encierro, cz = E.plaza.cz; E.camera.position.set(-6, 2.2, cz + 8); E.camera.lookAt(-24, 6, cz - 6); });
await shot('toriles', () => { const E = window.__game.encierro, cz = E.plaza.cz; E.camera.position.set(4, 3.2, cz - 8); E.camera.lookAt(0, 1.4, cz - 22); });
await p.evaluate(() => { window.__game.encierro.__cam = false; });
await step(2.5);
await shot('toriles-dentro', () => { const E = window.__game.encierro, cz = E.plaza.cz; E.camera.position.set(4, 3.2, cz - 8); E.camera.lookAt(0, 1.4, cz - 22); });
await p.evaluate(() => { window.__game.encierro.__cam = false; });
console.log(JSON.stringify(await p.evaluate(() => { const E = window.__game.encierro; return { torosDentro: E.bulls.filter(b => b.out).length, de: E.bulls.length, corredoresQuietos: E.runners.filter(r => (r.v || 0) < 0.2).length, corredores: E.runners.length }; })));
await b.close();
