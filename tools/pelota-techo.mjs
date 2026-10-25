// La cámara del partido de pelota en cada clase de frontón: el de la plaza (al aire libre o con cubierta de madera o de
// metal), el cubierto de los campeonatos y el Labrit. Juega un rato solo (autoplay) y mira en cada fotograma dónde está
// la cámara: nunca por encima de la cubierta (camTecho) ni por detrás de donde cabe (camZMax), ni dentro de una casa del
// pueblo. Hace capturas del plano más alto, del más retrasado y de los cambios de plano.
// Uso: node tools/pelota-techo.mjs <carpeta> [pueblo:sede,...]   (sede: plaza, cubierto o labrit)
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/pelota-techo', lista = 'sanguesa:plaza,isaba-izaba:plaza,lumbier:plaza,lumbier:cubierto,lumbier:labrit'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fallos = [], errs = [];
for (const caso of lista.split(',')) {
  const [town, sede] = caso.split(':');
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => errs.push(`${caso} ${e.message.slice(0, 160)}`));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora&novuelo`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt { display: none !important; }' });
  await p.evaluate(async (sede) => {
    const G = window.__game, v = G.venueDe(sede); await G.venuePrep(v);
    const a = G.pelotari || G.missions.find(M => M.type === 'pelota')?.host;
    window.__fin = v.play(G, a, v === G.fronton ? {} : { returnTo: G.fronton });
  }, sede);
  await p.waitForSelector('.pel-go[data-pel-go]', { timeout: 120000 });
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click());
  await p.waitForTimeout(1500);
  // (sin el vuelo de llegada, que es quien quita el velo de ir al frontón: se quita aquí)
  await p.evaluate(() => { window.__game.sportBackdrop?.(false); document.querySelectorAll('.sport-bg').forEach(x => x.remove()); document.getElementById('hub')?.classList.add('hidden'); });
  const fase0 = await p.evaluate(() => window.__game.pelotaMatch.game.phase);
  // capturas: el plano de juego más alto (pelota larga con peloteo largo, tú al fondo) y los tres cambios de plano. El
  // partido se queda quieto en ese momento: solo se dibuja (draw), con el estado puesto en cada fotograma
  const foto = async (nombre, estado) => {
    await p.evaluate((E) => { const G = window.__game, m = G.pelotaMatch; m.game.autoplay = false; m.camInit = false;
      G.pelotaTick = () => { Object.assign(m, E.m || {}); Object.assign(m.game, E.g || {}); if (E.youZ != null) m.game.players.you.z = E.youZ; m.draw(1 / 60); }; }, estado);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/${town}-${sede}-${nombre}.png`, timeout: 120000 });
  };
  await foto('alto', { m: { largoK: 1, abreK: 1, rallyN: 14, enCorte: false, camDyn: true }, g: { phase: 'rally' }, youZ: 29 });
  for (const k of [0, 1, 2]) await foto('plano' + k, { m: { plano: k, enCorte: true, camDyn: true }, g: { phase: 'point', phaseT: 1 } });
  await foto('intro', { m: { enCorte: false }, g: { phase: 'intro' } });
  await p.evaluate((f) => { const G = window.__game, m = G.pelotaMatch; m.game.phase = f; m.enCorte = false; m.camInit = false; G.pelotaTick = (dt) => m.update(dt); }, fase0);
  // juega solo: en cada paso, dónde está la cámara en las medidas de la cancha
  const r = await p.evaluate(async () => {
    const G = window.__game, m = G.pelotaMatch, C = m.court, grp = C.group, T = m.T, v = new T.Vector3();
    const techo = C.camTecho ?? Infinity, zMax = Math.min(31.5 + 11, C.camZMax ?? Infinity);
    m.game.autoplay = true; m.camDyn = true; m.game.target = 99;   // (que no se acabe el partido)
    const { nearby } = await import('/src/world/colliders.js');
    let maxY = { y: -1 }, maxZ = { z: -1 }, malo = 0, casa = 0, n = 0, ej = null; const planos = new Set();
    for (let i = 0; i < 30 * 160 && m.active; i++) {
      m.update(1 / 30); n++;
      grp.worldToLocal(v.copy(m.cam.position));
      const e = { y: +v.y.toFixed(2), z: +v.z.toFixed(2), x: +v.x.toFixed(2), fase: m.game.phase, corte: !!m.enCorte, plano: m.plano || 0 };
      if (e.y > maxY.y) maxY = e; if (e.z > maxZ.z) maxZ = e;
      if (e.y > techo + 0.05 || e.z > zMax + 0.05) malo++;
      if (m.enCorte) planos.add((m.plano || 0) % 3);
      const w = m.cam.position;
      // (dentro de una caja del pueblo: sin las del propio frontón, que son paredes bajas sin altura apuntada)
      for (const c of nearby(w.x, w.z, 0.5)) if (c.type === 'box' && c.solidView) {
        const lc = grp.worldToLocal(new T.Vector3(c.x, 0, c.z)); if (lc.z > -2 && lc.z < 35.5 && lc.x > -7 && lc.x < 12) continue;
        const dx = w.x - c.x, dz = w.z - c.z, u = dx * c.cos - dz * c.sin, q = dx * c.sin + dz * c.cos;
        if (Math.abs(u) < c.hw && Math.abs(q) < c.hd && w.y < (c.top ?? 99)) { casa++; ej ||= { cam: e, caja: { x: +lc.x.toFixed(1), z: +lc.z.toFixed(1), top: c.top } }; break; }
      }
    }
    return { n, techo, zMax, maxY, maxZ, malo, casa, ej, planos: [...planos], hall: !!C.hall, labrit: !!C.labrit, roof: C.look?.roof || '' };
  });
  console.log(caso.padEnd(22), JSON.stringify(r));
  if (r.malo || r.casa) fallos.push(`${caso}: ${r.malo} fotogramas fuera de su sitio, ${r.casa} dentro de una casa`);
  await p.close();
}
console.log('fallos', fallos.length); for (const f of fallos) console.log(' ', f);
console.log('errores', errs.length ? errs : 'ninguno');
await b.close();
