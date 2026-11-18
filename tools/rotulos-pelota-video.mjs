// Un vídeo corto de los rótulos del partido de pelota en tiempo real: un tanto tuyo y uno del rival.
// Uso: node tools/rotulos-pelota-video.mjs   (servidor en 5173; OUT: carpeta del .webm; TAM=movil para 844×390)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT || '/tmp/claude-0', movil = process.env.TAM === 'movil';
const size = movil ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: size, recordVideo: { dir: OUT, size }, ...(movil ? { hasTouch: true, isMobile: true } : {}) });
const p = await ctx.newPage();
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
await p.waitForFunction(() => document.querySelector('[data-pel-go]'), null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('[data-pel-go]').click());
await p.waitForSelector('.pel-toss-go', { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(1200);
await p.evaluate(() => document.querySelector('.pel-toss-go')?.click()); await p.waitForTimeout(7000);
const t0 = Date.now(), inicio = (await p.video().path());
const tanto = (w, you, rival) => p.evaluate(([w, you, rival]) => { const m = window.__game.pelotaMatch; m.game.mode = 'match'; m.onEvent({ type: 'call', call: 'tanto', winner: w, score: { you, rival } }); }, [w, you, rival]);
console.log('marca', JSON.stringify(await p.evaluate(() => performance.now())));
await tanto('you', 3, 2); await p.waitForTimeout(5000);
await tanto('rival', 3, 3); await p.waitForTimeout(5000);
await ctx.close(); await b.close(); console.log(inicio);
