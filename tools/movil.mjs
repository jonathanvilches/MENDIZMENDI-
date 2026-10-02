// Prueba como un móvil de verdad: entra desde el menú en varios pueblos (sin marcar el navegador como automático,
// así hace la intro de primera visita), anda un poco y comprueba que no vuelve al menú, que el jugador se ve y
// que no hay errores. Uso: node tools/movil.mjs [pueblos] [ancho] [alto] [dpr]
import { chromium } from 'playwright-core';
const [,, towns = 'lesaka,pamplona,ochagavia,tudela', W = '390', H = '844', DPR = '3'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  p.on('console', m => { if (m.type() === 'error') errs.push('console.error ' + m.text().slice(0, 300)); });
  await p.addInitScript((town) => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'nerea', seen: { heroBenat: true, dog: true }, last: town })); }, town);
  await p.goto(process.env.URL || 'http://127.0.0.1:5173/', { timeout: 300000 });
  await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.tap('[data-play]');
  const t0 = Date.now();
  // espera a que termine de cargar o vuelva al menú
  await p.waitForFunction(() => (window.__game && ['play', 'cine'].includes(window.__game.mode)) || (window.__hub && !document.querySelector('.loading.on, #loading.on') && document.querySelector('.hub:not(.hidden), #hub:not(.hidden)')), null, { timeout: 600000 }).catch(e => errs.push('espera: ' + e.message.slice(0, 80)));
  await p.waitForTimeout(9000);   // intro de primera visita
  const st = await p.evaluate(() => { const G = window.__game, rt = window.__rt; if (!G) return { enJuego: false };
    const P = G.player, o = P?.obj; let meshes = 0, vis = o?.visible; o?.traverse(m => { if (m.isMesh && m.visible) meshes++; });
    return { enJuego: true, modo: G.mode, jugadorVisible: vis, mallas: meshes, rig: P?.rig?.constructor?.name, pos: P?.pos.toArray().map(v => +v.toFixed(1)), camDist: rt.camera.position.distanceTo(P.pos).toFixed(1), pr: rt.renderer.getPixelRatio(), calidad: rt.quality, hub: !!document.querySelector('.hub:not(.hidden)') }; });
  console.log(town, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(st));
  await p.screenshot({ path: `/tmp/claude-0/movil-${town}.png`, timeout: 180000 }).catch(() => {});
  if (errs.length) console.log('  ' + errs.slice(0, 8).join('\n  '));
  await ctx.close();
}
await b.close();
