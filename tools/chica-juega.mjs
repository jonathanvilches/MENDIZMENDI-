// Jugar con una chica: entra en un pueblo con Leire, Nahia o Nerea y comprueba que el cuerpo del jugador es el de chica
// (la coleta); en el frontón, que la pelotari también. Capturas de las dos. Uso: node tools/chica-juega.mjs <carpeta> [avatar] [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out, avatar = 'nerea', town = 'lumbier'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/403|google|Failed to load|GPU stall|WebGL/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.addInitScript((av) => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: av, seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'high' } })); }, avatar);
await p.goto('http://127.0.0.1:' + (process.env.PUERTO || 5173) + `/?town=${town}&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }); await p.waitForTimeout(1500);
const coleta = () => p.evaluate(() => { const G = window.__game; let pelo = 0, mallas = 0; G.player.obj.traverse(o => { if (o.isMesh && o.visible) { mallas++; if (o.userData.pelo || o.userData.peloColor) pelo++; } }); return { rig: G.player.rig?.id, mallas, pelo, chica: !!G.player.rig?.char?.root?.userData?.chica }; });
console.log('pueblo:', JSON.stringify(await coleta()));
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt { display: none !important; }' });
await p.evaluate(() => { const G = window.__game, T = window.__THREE, P = G.player.pos, h = G.player.heading; const tgt = new T.Vector3(P.x, P.y + 1, P.z), pos = new T.Vector3(P.x + Math.sin(h) * 2.6, P.y + 1.3, P.z + Math.cos(h) * 2.6); G.follow.cinematic = { pos, look: tgt, t: 1, lookCur: tgt.clone() }; G.camera.position.copy(pos); G.camera.lookAt(tgt); });
await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${avatar}-pueblo.png` });
// al frontón: el partido con el cuerpo de pelotari (de chica si es una chica)
await p.evaluate(() => { window.__game.follow.cinematic = null; const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel', { timeout: 120000 }); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]')?.click()); await p.waitForTimeout(4000);
console.log('frontón:', JSON.stringify(await coleta()), 'partido:', await p.evaluate(() => !!window.__game.pelotaMatch));
await p.screenshot({ path: `${out}/${avatar}-fronton.png` });
console.log('errores:', errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno'); await b.close();
