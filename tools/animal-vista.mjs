// Primeros planos de una especie de la fauna (de lado y en tres cuartos) para compararla con fotos.
// Uso: node tools/animal-vista.mjs <carpeta> <especie,especie…> [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/fauna', kinds = 'pig,jabali', town = 'isaba-izaba'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
for (const k of kinds.split(',')) {
  for (const [n, ang, el] of [['lado', 1.5708, 0.25], ['tres-cuartos', 0.75, 0.45]]) {
    const ok = await p.evaluate(([k, ang, el]) => {
      const G = window.__game, T = window.__THREE, F = window.__rt.fauna, gh = window.__hf.groundHeight;
      let a = F.animals.find(a => a.kind === k);
      if (!a) a = F.add(k, G.player.pos.x + 6, G.player.pos.z + 6, { range: 0.01, walk: 0, flee: 0 });
      if (!a) return false;
      a.alwaysUpdate = true; a.speed = 0; a.state = 'idle';
      G.player.place(a.pos.x + 8, a.pos.z + 8, 0);
      const h = a.glbA?.height || 0.9, d = h * 3.2, yaw = (a.obj.rotation.y || 0) + ang;
      const pos = new T.Vector3(a.pos.x + Math.sin(yaw) * d, gh(a.pos.x, a.pos.z) + h * (0.5 + el), a.pos.z + Math.cos(yaw) * d), lk = new T.Vector3(a.pos.x, gh(a.pos.x, a.pos.z) + h * 0.5, a.pos.z);
      G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk);
      if (G.rt?.sky) { G.rt.sky.time = 11; G.rt.sky.speed = 0; }
      return true;
    }, [k, ang, el]);
    if (!ok) { console.log('no hay', k); continue; }
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${k}-${n}.png`, timeout: 180000 }); console.log('foto', k, n);
  }
}
console.log(errs.join('\n') || 'sin errores');
await b.close();
