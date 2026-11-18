// La imagen de la cancha del juego de los frontones de «Frontones» que no tienen foto libre (el Euskal Jai, que ya no
// existe, el Atarrabia, el Jito Alai…): se abre el partido libre en ese frontón, se espera al peloteo, se quita todo lo
// que va encima de la imagen y se guarda en src/assets/frontones-juego/fr-<id>.webp (16:10, 960×600). El carrusel la enseña con
// el aviso «La cancha del juego» (torneo.js frontonesMenu); antes, esas tarjetas salían con una pelota de relleno.
// Uso: node tools/frontones-cancha.mjs [id…]   (sin ids, todos los que no tienen foto; servidor en 5173; OUT=carpeta para
// dejarlas fuera del juego y mirarlas antes)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
const URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT || 'src/assets/frontones-juego';
// (los frontones de data/frontones.js sin foto en src/assets/frontones)
const src = readFileSync('src/data/frontones.js', 'utf8'), blk = src.slice(src.indexOf('export const DESTACADOS'), src.indexOf('export const destacado'));
const todos = [...blk.matchAll(/\{ id: '([^']+)'([\s\S]*?)(?=\n  \{ id:|\n\];)/g)].map(m => ({ id: m[1], foto: (m[2].match(/foto: '([^']+)'/) || [])[1] }));
const sin = todos.filter(f => !f.foto || !existsSync(`src/assets/frontones/${f.foto}.webp`)).map(f => f.id);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : sin;
console.log('frontones sin foto:', sin.join(', ') || 'ninguno', '· a capturar:', ids.join(', '));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const id of ids) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript((id) => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-fronton-carta', id);
    localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'high' } })); }, id);
  try {
    await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
    await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
    await p.waitForFunction(() => document.querySelector('.lg-root [data-a="frontones"]'), null, { timeout: 300000 }); await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelector('.lg-root [data-a="frontones"]').click());
    await p.waitForFunction((id) => document.querySelector(`.c3-pant .c3-port.frente[data-f="${id}"]`), id, { timeout: 60000 }); await p.waitForTimeout(600);
    await p.evaluate(() => [...document.querySelectorAll('.c3-pant')].pop().querySelector('[data-a="ok"]').click());
    await p.waitForFunction(() => document.querySelector('[data-pel-go]'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelector('[data-pel-go]')?.click());
    await p.waitForSelector('.pel-toss-go', { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelector('.pel-toss-go')?.click());
    // (siempre el mismo momento: en pleno peloteo, con la cámara general y los dos pelotaris en la cancha; no a los tantos
    // segundos, que según vaya de rápido el ordenador caía en el plano corto de la presentación)
    // (juegan los dos solos, para que haya peloteo sin tocar nada)
    await p.waitForFunction(() => { const g = window.__game?.pelotaMatch?.game; if (!g) return false; g.autoplay = true; return g.phase === 'rally' && (g.rally?.hits || 0) >= 3; }, null, { timeout: 600000, polling: 100 });
    // (solo la imagen del juego: fuera el marcador, los botones y los rótulos, y las ayudas del suelo y del frontis, que
    // son para quien juega: se pasan a una capa que la cámara no dibuja)
    await p.evaluate(() => { const c = window.__game.pelotaMatch.court; for (const k of ['landRing', 'spotRing', 'serveZone', 'flash', 'aimMark', 'aimPath', 'aimLand', 'aimWall']) c?.[k]?.traverse?.(o => o.layers.set(31)); });
    await p.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)){visibility:hidden!important}' }); await p.waitForTimeout(250);
    const png = await p.screenshot();
    await sharp(png).resize(960, 600).webp({ quality: 82 }).toFile(`${OUT}/fr-${id}.webp`);
    console.log(id, 'guardada', errs.length ? '· errores: ' + errs.join(' | ') : '');
  } catch (e) { console.log(id, 'FALLO', e.message.split('\n')[0], errs.join(' | ')); }
  await p.close();
}
await b.close();
