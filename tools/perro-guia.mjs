// «Enséñame el camino»: el perro se adelanta hacia lo que toca (el vecino de la misión que sigues), ladra al llegar y te
// espera; cuando le alcanzas, si aún queda lejos, se adelanta otra vez. Se simula a pasos fijos de 1/20 s (sin depender de lo
// que tarde en dibujarse) y se mide cuánto se adelanta y cuánto acerca. Uso: node tools/perro-guia.mjs [pueblo]   (5173;
// CERCA=1: la misión del pueblo más cercana a más de 30 m, hasta llegar junto al vecino)
import { chromium } from 'playwright-core';
const town = process.argv[2] || 'lesaka', URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', dogOn: true, dog: 'pastor', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game?.mode === 'play' && window.__game.perro?.dog, null, { timeout: 400000 });
await p.waitForTimeout(2000);
const cerca = !!process.env.CERCA;
const r = await p.evaluate(async (cerca) => {
  const { navTick } = await import('/src/world/nav.js');
  const g = window.__game, pr = g.perro, D = pr.dog, P = g.player.pos, H = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // (la misión más lejana a la que seguir, para que haga falta guía)
  const M = cerca ? g.missions.filter(m => !m.done && m.host && H(m.host.pos, P) > 30).sort((a, b) => H(a.host.pos, P) - H(b.host.pos, P))[0]
    : g.missions.filter(m => !m.done && m.host).sort((a, b) => H(b.host.pos, P) - H(a.host.pos, P))[0]; g.tracked = M.i;
  const t0 = pr.objetivo(); if (!t0) return { error: 'sin objetivo' };
  const d0 = Math.hypot(t0.x - P.x, t0.z - P.z);
  pr.help();
  const paso = (n) => { for (let i = 0; i < n; i++) { navTick(20); pr.update(0.05); D.update(0.05, g.player); } };
  const out = { mision: M.title, lejos: +d0.toFixed(1), tramos: [] };
  // primer tramo: el perro se adelanta sin que el jugador se mueva
  paso(20); out.alSalir = { guia: pr.lead != null, adelante: +H(D.pos, P).toFixed(1) };
  paso(160); out.tramos.push({ ladra: !!pr.barked, adelante: +H(D.pos, P).toFixed(1), aMeta: +H(D.pos, pr.goal.pos).toFixed(1) });
  // el jugador le alcanza: si queda lejos, se adelanta otra vez
  for (let k = 0; k < (cerca ? 12 : 3) && pr.lead != null; k++) {
    P.set(D.pos.x - 1, P.y, D.pos.z - 1); paso(4);
    const t = pr.objetivo(); out.tramos.push({ siguiente: pr.lead != null, quedan: t ? +Math.hypot(t.x - P.x, t.z - P.z).toFixed(1) : null });
    paso(160); out.tramos.push({ ladra: !!pr.barked, adelante: +H(D.pos, P).toFixed(1) });
  }
  const t1 = pr.objetivo(); out.alFinal = t1 ? +Math.hypot(t1.x - P.x, t1.z - P.z).toFixed(1) : null;
  return out;
}, cerca);
console.log(JSON.stringify(r));
const ok = r.alSalir?.guia && r.alSalir.adelante > 2 && r.tramos[0]?.ladra && (cerca ? (r.alFinal ?? 0) < 10 : r.tramos[0].adelante > 8 && (r.alFinal ?? 0) < r.lejos - 10);
console.log(errs.length ? errs : 'sin errores'); console.log(ok && !errs.length ? 'Todo correcto' : 'MAL');
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
