// Cambios de luz: apunta cada fotograma la luz del cielo, del sol, los focos, el relleno de los personajes, el haz del
// objetivo y el rayo de la tormenta, paseando por el pueblo y durante un partido de pelota, y avisa de los saltos.
// Uso: node tools/luz-cambios.mjs <pueblo> <carpeta> [tiempo: clear|rain] [hora]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/luz', weather = 'clear', hora = '12'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=${weather}&skipintro=1&noflora&t=${hora}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
// registro por fotograma (se engancha al dibujo)
await p.evaluate(() => { const rt = window.__rt, R = rt.renderer, rd = R.render, s = rt.sky, G = window.__game; window.__log = [];
  R.render = function (...a) { const C = G.fronton?.court; window.__log.push({ t: +performance.now().toFixed(0), mode: G.mode, hemi: +s.hemi.intensity.toFixed(3), sun: +s.sun.intensity.toFixed(3),
    sunCol: s.sun.color.getHexString(), dir: [s.sun.position.x - s.sun.target.position.x, s.sun.position.y - s.sun.target.position.y, s.sun.position.z - s.sun.target.position.z].map(v => +(v / 150).toFixed(2)).join(','),
    flood: s.flood || 0, lk: C?._lk ?? null, fill: rt.charFill.getHexString(), beam: !!rt.beacon?.beam.visible, bolt: !!rt.weather?.bolt?.visible, flash: +(s.uniforms.uFlash?.value || 0).toFixed(2), shI: +s.sun.shadow.intensity.toFixed(2) });
    return rd.apply(this, a); }; });
const shot = (n) => p.screenshot({ path: `${out}/${town}-${weather}-${n}.jpg`, quality: 70 });
// 1. paseo: hacia el frontón, girando la cámara
await p.evaluate(() => { const G = window.__game, e = G.fronton.entry; G.player.place(e.x + 14, e.z + 10, 0); G.follow.snap(G.player); });
for (let i = 0; i < 6; i++) { await p.evaluate((i) => { const G = window.__game; G.follow.yaw = i * 1.05; }, i); await p.waitForTimeout(2500); await shot(`paseo${i}`); }
// 2. partido
await p.evaluate(() => { const G = window.__game; window.__res = G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, { target: 7 }); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await shot('panel');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
for (let i = 0; i < 5; i++) { await p.waitForTimeout(5000); await shot(`partido${i}`); }
await p.evaluate(() => window.__game.pelotaMatch?.exit(true)); await p.waitForTimeout(4000); await shot('vuelta');
const log = await p.evaluate(() => window.__log);
// saltos: de un fotograma al siguiente
const keys = ['hemi', 'sun', 'sunCol', 'dir', 'flood', 'lk', 'fill', 'beam', 'bolt', 'shI'], jumps = [];
for (let i = 1; i < log.length; i++) { const a = log[i - 1], c = log[i]; const ch = keys.filter(k => k === 'hemi' || k === 'sun' ? Math.abs(a[k] - c[k]) > 0.08 : a[k] !== c[k]);
  if (ch.length) jumps.push(`${c.t - log[0].t}ms ${c.mode} ` + ch.map(k => `${k}: ${a[k]} → ${c[k]}`).join(' · ')); }
console.log('fotogramas', log.length, 'modos', [...new Set(log.map(l => l.mode))].join(','));
console.log('saltos', jumps.length); for (const j of jumps.slice(0, 60)) console.log('  ' + j);
const inMatch = log.filter(l => l.mode === 'pelota'), rng = (k) => inMatch.length ? `${Math.min(...inMatch.map(l => l[k]))}..${Math.max(...inMatch.map(l => l[k]))}` : '-';
console.log('en el partido: hemi', rng('hemi'), 'sol', rng('sun'), 'dir', [...new Set(inMatch.map(l => l.dir))].slice(0, 6).join(' | '), 'relleno', [...new Set(inMatch.map(l => l.fill))].slice(0, 6).join(','));
console.log('errores', JSON.stringify(errs));
await b.close();
