// El fútbol en el juego: la entrenadora de El Sadar abre el menú del módulo de fútbol sala (src/futbol) y el partido se
// juega en su propia escena mientras Pamplona queda en pausa. Aquí se le dan los personajes del juego (el futbolista de
// Osasuna de Meshy de rojo, el visitante de blanco y los porteros con la camiseta de otro color), el público de las
// gradas, el sonido y la calidad.
import * as THREE from 'three';
import { FutbolSystem } from '../futbol/index.js';
import { GlbChar, loadMeshy, hasMeshy, MESHY_GAIT } from '../actors/glbChar.js';
import { crowd3d } from '../actors/crowd3d.js';
import { QUALITY } from '../util/quality.js';

// la camiseta roja del modelo pasa a otro color (porteros): solo los píxeles de rojo muy saturado, la piel no
function recolor(root, color) {
  const c = new THREE.Color(color), hsl = {}; c.getHSL(hsl);
  const mats = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map(m0 => {
      const m = m0.clone(); mats.push(m);
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uHue = { value: hsl.h }; sh.uniforms.uSat = { value: Math.max(0.5, hsl.s) }; sh.uniforms.uLit = { value: hsl.l };
        const fn = `uniform float uHue, uSat, uLit;
          vec3 fbHsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
          vec3 fbRgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
          vec3 fbRecolor(vec3 c){ vec3 h=fbHsv(c); float red=(h.x<0.03||h.x>0.95)?1.:0.; float k=red*smoothstep(0.78,0.9,h.y)*smoothstep(0.03,0.08,h.z);
            vec3 t=fbRgb(vec3(uHue,uSat,h.z*(0.65+uLit*1.2))); return mix(c,t,k); }`;
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', fn + '\nvoid main() {')
          .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = fbRecolor(diffuseColor.rgb);')
          .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv ); totalEmissiveRadiance *= fbRecolor(emissiveColor.rgb);\n#endif');
      };
      m.customProgramCacheKey = () => 'fb-recolor-' + color;
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return mats;
}

// futbolistas del juego: el modelo de Meshy de cada equipo; los porteros, con el de Osasuna y la camiseta de su color
export async function makeCharacter(d) {
  const model = d.keeper ? 'osasuna' : d.team.model;
  if (!model || !hasMeshy(model)) return null;
  const g = await loadMeshy(model);
  const char = new GlbChar(g, MESHY_GAIT); char.root.scale.setScalar(g.userData.fit || 1);
  // cada jugador un poco distinto de alto
  char.root.scale.multiplyScalar([1, 0.97, 1.03, 0.99, 1.02][(d.num + d.side) % 5]);
  const mats = d.keeper ? recolor(char.root, d.team.keeper) : [];
  return { obj: char.root, anim: { setSpeed: (v) => char.setSpeed(v), once: (n, s, fit) => char.playOnce(n, s, fit), update: (dt) => char.update(dt) },
    dispose: () => { char.dispose(); for (const m of mats) m.dispose(); } };
}

export class Futbol {
  constructor(G, lm) { this.G = G; this.lm = lm; }
  update() {}
  async run() {
    const G = this.G;
    const sound = G.sound?.ctx ? { ctx: G.sound.ctx, out: G.sound.sfx } : null;
    FutbolSystem.init({
      makeCharacter, quality: QUALITY, touch: G.input?.touch, audio: sound,
      crowd: (spots) => crowd3d(spots, 'futbol', 1.3, { sit: true }),
      host: {
        before: async () => { G.player.frozen = true; G.ui.setPrompt?.(null); await G.ui.fadeOut?.(); },
        attach: (scene, camera, update) => { G.altScene = scene; G.altCamera = camera; G.altUpdate = update; G.mode = 'futbol'; G.ui.hudVisible?.(false); document.body.classList.add('futbol'); G.rt?.boost?.(true); },
        shown: async () => { await G.ui.fadeIn?.(); },
        detach: () => { G.altScene = null; G.altCamera = null; G.altUpdate = null; G.mode = 'play'; G.ui.hudVisible?.(true); document.body.classList.remove('futbol'); G.rt?.boost?.(false); },
        after: async () => { G.player.frozen = false; G.follow?.snap?.(G.player); },
      },
    });
    const d = FutbolSystem.career.data;
    // la primera vez: un reto de entrenamiento antes del partido (la misión del campo); después, el menú libre
    if (!d.retos?.pases?.done && !this.G.futRetoSeen) {
      this.G.futRetoSeen = true;
      const r = await FutbolSystem.startReto({ campoId: 'sadar', reto: 'pases' });
      if (r?.quit && !r.reto) return { quit: true };
    }
    const r = await FutbolSystem.openMenu({ campoId: 'sadar', title: 'El Sadar', sub: 'Fútbol sala con la cantera' });
    if (!r || r.quit) return { quit: true };
    if (r.mode === 'reto') return { quit: true, reto: r };
    return { win: !!r.win, you: r.pens && r.mode === 'penalties' ? r.pens[0] : r.you ?? 0, cpu: r.pens && r.mode === 'penalties' ? r.pens[1] : r.cpu ?? 0, quit: !!r.quit, draw: !!r.draw };
  }
}
