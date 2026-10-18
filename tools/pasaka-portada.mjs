// Hornea la portada de la pantalla Pasaka del menú: una foto del partido en el sobreclaustro, sacada del propio juego en
// calidad alta (el recinto, tu avatar, el canónigo y los rivales, sin la interfaz), en los cuatro tamaños de las láminas:
// src/assets/laminas/grande/dep-pasaka.webp (2560), web/dep-pasaka.webp (1280), web/dep-pasaka-s.webp y mini/dep-pasaka.webp (640).
// No está en data/laminas.js a propósito: no es una ilustración del autor y no debe salir en el álbum; solo es la portada.
// Volver a ejecutar cuando cambie el recinto (src/game/pasaka3d.js). Uso: node tools/pasaka-portada.mjs [carpeta de pruebas]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
const [,, out = 'entrega/pasaka-portada'] = process.argv; mkdirSync(out, { recursive: true });
const W = 1280, H = 720;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, intro: true }, cards: [], settings: { quality: 'high' } })); });
await p.goto(`http://127.0.0.1:${process.env.PUERTO || 5173}/?town=pamplona&q=high&weather=clear&skipintro=1&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const G = window.__game, a = G.canonigo; G.player.pos.set(a.pos.x + 1.4, a.pos.y, a.pos.z + 0.4); G.pasakaCon(G.canonigo); });
await p.waitForTimeout(2500);
for (let i = 0; i < 6 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(500); }
await p.waitForFunction(() => window.__pasaka, null, { timeout: 120000 });
// un peloteo para que las figuras estén en juego y la pelota en el aire; luego la cámara fija de la foto (desde la galería,
// algo alta, mirando al frontis con la red en medio) y fuera la interfaz y los avisos
await p.evaluate(() => { window.__pasaka.simular(2.2); window.__pasaka.golpear('golpe'); window.__pasaka.auto(true); for (let i = 0; i < 22; i++) window.__pasaka.simular(1 / 30); });
await p.addStyleTag({ content: '.pk-hud, .pel-root, #toasts, .toast, #hud, #prompt { display: none !important; }' });
// la foto desde el sitio que ya usa el partido, pero más alta y un poco más atrás, para ver la red, el frontis y los arcos
await p.evaluate(() => { const G = window.__game, c = G.follow.cinematic; if (!c) return; window.__shot = { dx: 0, dy: 0.45, dz: -0.9 }; const base = G.pelotaTick; G.pelotaTick = (dt) => { base(dt); const c2 = G.follow.cinematic; if (c2) { c2.pos.x += window.__shot.dx; c2.pos.y += window.__shot.dy; c2.pos.z += window.__shot.dz; c2.look.y += 0.25; } }; });
await p.waitForTimeout(3500);
const png = `${out}/pasaka.png`; await p.screenshot({ path: png });
console.log('errores:', errs.length ? errs.join(' | ') : 'ninguno'); await b.close();
execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
src, = sys.argv[1:]
im = Image.open(src).convert('RGB')
W, H = im.size; print('captura', im.size)
for folder, w in (('grande', 2560), ('web', 1280), ('mini', 640)):
    r = im.resize((w, w * 9 // 16), Image.LANCZOS); r.save(f'src/assets/laminas/{folder}/dep-pasaka.webp', 'WEBP', quality=84 if w < 2000 else 80, method=6)
im.resize((640, 360), Image.LANCZOS).save('src/assets/laminas/web/dep-pasaka-s.webp', 'WEBP', quality=84, method=6)
import os
for f in ('grande/dep-pasaka.webp', 'web/dep-pasaka.webp', 'web/dep-pasaka-s.webp', 'mini/dep-pasaka.webp'): print(f, os.path.getsize('src/assets/laminas/' + f))
`, png]);
