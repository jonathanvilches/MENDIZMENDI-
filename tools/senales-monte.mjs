// Señales del monte: empieza la subida y fotografía el poste indicador al salir del pueblo, las balizas del camino y
// un consejo de montaña. Uso: node tools/senales-monte.mjs [pueblo] [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'tafalla', out = 'entrega/senales'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const info = await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'); if (!M) return null; M.step = 0; G.startSummit(M);
  const post = M.posts?.[0]; if (!post) return { posts: 0 };
  const a = post.rotation.y, P = G.player, V = G.camera.position.constructor; P.place(post.position.x - Math.sin(a - 0.7) * 5, post.position.z - Math.cos(a - 0.7) * 5, a - 0.7); G.follow.snap(P); G.follow.cinematic = { pos: new V(post.position.x + Math.cos(a) * 3.2, post.position.y + 2.2, post.position.z - Math.sin(a) * 3.2), look: new V(post.position.x, post.position.y + 2, post.position.z), t: 0 }; G.follow.update(0.1, P, { look: { dx: 0, dy: 0 }, zoom: 0, move: { x: 0, y: 0 } }, true);
  return { posts: M.posts.length, balizas: M.posts[1]?.count || 0, cima: M.peak?.name, post: [post.position.x, post.position.y, post.position.z].map(v => +v.toFixed(1)), cam: [G.camera.position.x, G.camera.position.y, G.camera.position.z].map(v => +v.toFixed(1)), host: [M.host.pos.x, M.host.pos.z].map(v => +v.toFixed(1)) }; });
console.log(JSON.stringify(info));
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-poste.png` });
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'), post = M.posts[0], a = post.rotation.y, P = G.player;
  P.place(post.position.x + Math.sin(a) * 14, post.position.z + Math.cos(a) * 14, a); G.follow.snap(P); M.tipT = 0; G.follow.cinematic = null; });
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-balizas.png` });
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
