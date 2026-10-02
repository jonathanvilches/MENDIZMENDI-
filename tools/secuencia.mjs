// Secuencia de imágenes del jugador andando o corriendo, con el juego avanzado a mano (para ver el paso).
// Uso: node tools/secuencia.mjs [avatar] [andar|correr] [salida.png]
import { chromium } from 'playwright-core';
const [,, av = 'sanfermin', mode = 'andar', out = '/tmp/claude-0/secuencia.png'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 320 } });
await p.addInitScript((a) => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, avatar: a, seen: { heroBenat: true, dog: true } })); }, av);
await p.goto(`http://127.0.0.1:5173/?town=lesaka&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#ui > * { display: none !important; }' });
const shots = await p.evaluate(async (run) => {
  const rt = window.__rt, G = window.__game, P = rt.player, THREE = window.__THREE; rt.active = false;
  G.input.keys.clear(); G.input.keys.add('w'); if (run) G.input.keys.add('shift');
  for (let i = 0; i < 90; i++) { rt.step(1 / 60, G, G.input); G.input.endFrame?.(); }
  const out = [], cam = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
  for (let i = 0; i < 16; i++) {
    for (let k = 0; k < 4; k++) { rt.step(1 / 60, G, G.input); G.input.endFrame?.(); }
    // cámara de lado, siguiendo al jugador
    const h = P.heading, x = P.pos.x + Math.cos(h) * 4.2, z = P.pos.z - Math.sin(h) * 4.2;
    cam.position.set(x, P.pos.y + 1.0, z); cam.lookAt(P.pos.x, P.pos.y + 0.75, P.pos.z);
    rt.renderer.setPixelRatio(1); rt.renderer.shadowMap.needsUpdate = true; rt.renderer.render(rt.scene, cam);
    out.push(rt.renderer.domElement.toDataURL('image/jpeg', 0.8));
  }
  return out;
}, mode === 'correr');
const fs = await import('fs'); const dir = '/tmp/claude-0/sec'; fs.mkdirSync(dir, { recursive: true });
shots.forEach((s, i) => fs.writeFileSync(`${dir}/${i}.jpg`, Buffer.from(s.split(',')[1], 'base64')));
await b.close();
const { execSync } = await import('child_process');
execSync(`python3 -c "
from PIL import Image
ims=[Image.open('${dir}/%d.jpg'%i).crop((60,40,260,320)) for i in range(16)]
c=Image.new('RGB',(200*8,280*2))
for i,im in enumerate(ims): c.paste(im,((i%8)*200,(i//8)*280))
c.save('${out}')"`);
console.log('hecho', out);
