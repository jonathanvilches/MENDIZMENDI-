// Auditoría de la entrada en cada pueblo, como en el iPhone (perfil de iPhone, tumbado): se abre la app, se toca jugar en
// el pueblo (hub.play, el botón de la tarjeta del mapa) y se mira: la carga (con foto, la foto se descarga y se ve, nombre,
// comarca), el vuelo de llegada (su cartel) y que al final se juega (modo play, con el marcador). Una página nueva por pueblo.
// Uso: OUT=carpeta node tools/auditoria-entradas.mjs [ids…]  (BASE: la web compilada en 8099; PC=1 ordenador; SALTA=1 salta el
// vuelo tras comprobar que sigue a los 6 s; SIGUE=1 no repite los que ya salieron bien). Deja OUT/resumen.json y las capturas
// carga-, vuelo-, vuelo2- y juego- de cada pueblo.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = process.env.OUT || (console.error('falta OUT=carpeta'), process.exit(2)), BASE = process.env.BASE || 'http://127.0.0.1:8099/', MOVIL = !process.env.PC;
const TODOS = 'lesaka etxalar zugarramurdi amaiur-maya-del-baztan ituren elizondo leitza lekunberri orreaga-roncesvalles aribe otsagabia-ochagavia isaba-izaba erronkari-roncal burgui-burgi altsasu-alsasua irurtzun pamplona aoiz lumbier irulegi sanguesa estella viana puente-la-reina artajona tafalla javier ujue olite marcilla tudela cortes selva-irati sierra-urbasa sierra-aralar bosque-orgi senorio-bertiz sotos-ebro'.split(' ');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : TODOS;
const gpu = fs.readFileSync(fileURLToPath(new URL('./presupuesto-gpu.js', import.meta.url)), 'utf8');
fs.mkdirSync(out, { recursive: true });
const res = fs.existsSync(`${out}/resumen.json`) && process.env.SIGUE ? JSON.parse(fs.readFileSync(`${out}/resumen.json`, 'utf8')) : {};
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const id of ids) {
  if (process.env.SIGUE && res[id]?.ok) continue;
  const ctx = await b.newContext(MOVIL ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1' } : { viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(gpu);
  await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => undefined }); window.__vuelo = true;
    localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
  const p = await ctx.newPage(); const errs = [], R = { id, errs, t: {} };
  p.on('pageerror', e => errs.push('página: ' + String(e).slice(0, 240)));
  p.on('console', m => { if (m.type() === 'error') errs.push('consola: ' + m.text().slice(0, 240)); });
  p.on('requestfailed', q => { if (!/favicon|hot-update/.test(q.url())) errs.push('red: ' + q.url().split('/').pop() + ' ' + (q.failure()?.errorText || '')); });
  p.on('response', r => { if (r.status() >= 400) errs.push('red ' + r.status() + ': ' + r.url().split('/').pop()); });
  const T0 = Date.now(), seg = () => +((Date.now() - T0) / 1000).toFixed(1);
  try {
    await p.goto(BASE, { timeout: 300000 });
    await p.waitForFunction(() => window.__hub?.visible && window.__ready, null, { timeout: 300000 });
    await p.waitForTimeout(4000);
    R.t.menu = seg();
    const ok = await p.evaluate((id) => { if (!window.__hub) return 'sin hub'; window.__hub.play(id); return 'ok'; }, id);
    const t1 = Date.now(), dt = () => +((Date.now() - t1) / 1000).toFixed(1);
    let vista = null, cartel = false, cine = false, fin = null, capCarga = false, capVuelo = false, capVuelo2 = false;
    while (Date.now() - t1 < 300000) {
      const e = await p.evaluate(() => { const L = document.getElementById('loading'), g = window.__game, c = document.querySelector('.cartel');
        return { carga: !!L && !L.classList.contains('hidden') && getComputedStyle(L).opacity > 0.05, min: L?.classList.contains('ld-min'), nopic: L?.classList.contains('no-pic'), bg: (L?.querySelector('.ld-bg')?.style.backgroundImage || '').replace(/^url\("?|"?\)$/g, ''),
          pc: L?.querySelector('.ld-pc')?.textContent, nombre: L?.querySelector('.ld-name')?.textContent, k: L?.querySelector('.ld-k')?.textContent, pie: L?.querySelector('.ld-pic figcaption')?.textContent,
          modo: g?.mode, cartel: !!c, cartelT: c?.querySelector('.cartel-t')?.getAttribute('aria-label') || '', hud: !!document.querySelector('.hud, #hud') && !document.querySelector('.hud.hidden, #hud.hidden'), entrando: !!window.__hub?.entrando }; }).catch(() => null);
      if (!e) { await p.waitForTimeout(500); continue; }
      if (e.carga && !vista) { vista = { ...e, t: dt() }; R.t.carga = dt();
        // (la foto: que se descargue y se pueda dibujar, y su tamaño)
        R.foto = e.bg ? await p.evaluate((u) => new Promise(r => { const i = new Image(); i.onload = () => r({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => r({ error: true }); i.src = u; setTimeout(() => r({ tarde: true }), 20000); }), e.bg) : null; }
      if (e.carga && !capCarga && parseInt(e.pc) >= 20) { capCarga = true; await p.screenshot({ path: `${out}/carga-${id}.png` }).catch(() => {}); R.cargaVista = { pc: e.pc, nombre: e.nombre, k: e.k, pie: e.pie, min: e.min, nopic: e.nopic }; }
      if (e.cartel && !cartel) { cartel = true; R.t.vuelo = dt(); R.cartel = e.cartelT; }
      if (e.modo === 'cine') cine = true;
      if (e.cartel && !capVuelo && dt() - (R.t.vuelo || 0) > 1) { capVuelo = true; await p.screenshot({ path: `${out}/vuelo-${id}.png` }).catch(() => {}); }
      if (e.modo === 'cine' && !capVuelo2 && R.t.vuelo != null && dt() - R.t.vuelo > 6) { capVuelo2 = true; R.vuelo6 = true; await p.screenshot({ path: `${out}/vuelo2-${id}.png` }).catch(() => {});
        // (comprobado que el vuelo sigue a los 6 s, se salta tocando, como en el juego: en el simulador dura minutos)
        if (process.env.SALTA) await p.evaluate(() => dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))).catch(() => {}); }
      if (e.modo === 'play' && !e.carga && !e.cartel && (cartel || cine || dt() > 200)) { fin = dt(); break; }
      await p.waitForTimeout(400);
    }
    R.t.juego = fin; R.cine = cine; R.vueloVisto = cartel; R.carga = vista && { min: vista.min, nopic: vista.nopic, bg: vista.bg.split('/').pop(), nombre: vista.nombre, k: vista.k };
    await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/juego-${id}.png` }).catch(() => {});
    R.final = await p.evaluate(() => ({ modo: window.__game?.mode, hud: getComputedStyle(document.querySelector('#hud') || document.body).display, gid: window.__game?.def?.id }));
  } catch (err) { R.fallo = String(err).slice(0, 200); }
  R.ok = !R.fallo && !!R.carga && !R.carga.min && !R.carga.nopic && R.foto?.w > 0 && R.vueloVisto && !!R.vuelo6 && R.t.juego != null && !errs.length;
  res[id] = R; fs.writeFileSync(`${out}/resumen.json`, JSON.stringify(res, null, 1));
  console.log(`${R.ok ? 'OK ' : 'MAL'} ${id}: carga ${R.t.carga ?? '-'} s ${R.carga?.min ? 'MÍNIMA ' : ''}${R.carga?.nopic ? 'SIN FOTO ' : ''}foto ${R.foto ? (R.foto.w ? R.foto.w + 'x' + R.foto.h : JSON.stringify(R.foto)) : 'ninguna'} · vuelo ${R.vueloVisto ? R.t.vuelo + ' s «' + R.cartel + '»' + (R.vuelo6 ? ' sigue a los 6 s' : ' CORTADO') : 'NO'} · juego ${R.t.juego ?? 'NO'} s${errs.length ? ' · errores: ' + errs.slice(0, 3).join(' | ') : ''}${R.fallo ? ' · FALLO ' + R.fallo : ''}`);
  await ctx.close();
}
await b.close();
