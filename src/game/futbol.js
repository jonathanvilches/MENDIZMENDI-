// El fútbol en el juego: la entrenadora de El Sadar abre el menú del módulo de fútbol (src/futbol) y el partido se juega
// en su propia escena mientras Pamplona queda en pausa. Aquí se le dan los personajes del juego (el futbolista de Osasuna
// de Meshy de rojo, el visitante de blanco, los porteros con la camiseta de otro color y el árbitro y sus asistentes de
// negro, todos con su modelo completo: la geometría y la textura se comparten entre los veinticinco), el público de las gradas, el sonido y la calidad.
import * as THREE from 'three';
import { FutbolSystem } from '../futbol/index.js';
import { GlbChar, loadMeshy, hasMeshy, MESHY_GAIT } from '../actors/glbChar.js';
import { crowd3d } from '../actors/crowd3d.js';
import { QUALITY } from '../util/quality.js';
import { REFEREE } from '../futbol/rules.js';

// la camiseta roja del modelo pasa a otro color (porteros y árbitros): solo los píxeles de rojo muy saturado, la piel no.
// El brillo sigue el del color pedido (el negro del árbitro sale oscuro, no granate)
function recolor(root, color, minSat = 0.5) {
  const c = new THREE.Color(color), hsl = {}; c.getHSL(hsl);
  const mats = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map(m0 => {
      const m = m0.clone(); m.userData.fbOwn = true; mats.push(m);   // (propio de este jugador: la sombra de la cubierta se le añade sin copiarlo)
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uHue = { value: hsl.h }; sh.uniforms.uSat = { value: Math.max(minSat, hsl.s) }; sh.uniforms.uLit = { value: hsl.l };
        const fn = `uniform float uHue, uSat, uLit;
          vec3 fbHsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
          vec3 fbRgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
          vec3 fbRecolor(vec3 c){ vec3 h=fbHsv(c); float red=(h.x<0.03||h.x>0.95)?1.:0.; float k=red*smoothstep(0.78,0.9,h.y)*smoothstep(0.03,0.08,h.z);
            vec3 t=fbRgb(vec3(uHue,uSat,clamp(h.z*uLit*2.5,0.,1.))); return mix(c,t,k); }`;
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', fn + '\nvoid main() {')
          .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = fbRecolor(diffuseColor.rgb);')
          .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv ); totalEmissiveRadiance *= fbRecolor(emissiveColor.rgb);\n#endif');
      };
      m.customProgramCacheKey = () => 'fb-recolor';
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return mats;
}

// equipación de un club (camiseta, pantalón y medias, con rayas verticales o banda diagonal): el futbolista de Meshy va
// de rojo con pantalón azul marino; cada zona se tiñe por su altura en la pose de reposo (el futbolista es cabezón: camiseta por
// encima del 36 % de la altura, pantalón entre el 20 y el 50 %, medias por debajo del 36 %) y por su color original (el rojo de
// la camiseta y las medias, el azul oscuro del pantalón). La piel, el pelo y las botas no cambian
const HSV_GLSL = `vec3 fbHsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
  vec3 fbRgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }`;
function kitRecolor(root, T) {
  const hsl = (c) => { const o = {}; new THREE.Color(c).getHSL(o); return new THREE.Vector3(o.h, o.s, o.l); };
  const box = new THREE.Box3(); root.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox); } });
  const H = Math.max(1e-3, box.max.y - box.min.y), y0 = box.min.y, cx = (box.min.x + box.max.x) / 2;
  const pat = T.pattern === 'rayas' ? 1 : T.pattern === 'banda' ? 2 : 0;
  const mats = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map(m0 => {
      const m = m0.clone(); m.userData.fbOwn = true; mats.push(m);
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, { uShirt: { value: hsl(T.shirt) }, uShirt2: { value: hsl(T.shirt2 || T.shirt) }, uShorts: { value: hsl(T.shorts) }, uSocks: { value: hsl(T.socks) },
          uKit: { value: new THREE.Vector4(H, y0, cx, pat) } });
        sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vFbPos;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\n vFbPos = position;');
        const fn = `uniform vec3 uShirt, uShirt2, uShorts, uSocks; uniform vec4 uKit; varying vec3 vFbPos;
          ${HSV_GLSL}
          vec3 fbTone(vec3 hsl, float v, float ref){ return fbRgb(vec3(hsl.x, hsl.y, clamp(v / ref * hsl.z * 1.15, 0., 1.))); }
          vec3 fbKit(vec3 c){
            vec3 h = fbHsv(c); float y = (vFbPos.y - uKit.y) / uKit.x, x = (vFbPos.x - uKit.z) / uKit.x;
            float red = ((h.x < 0.03 || h.x > 0.95) ? 1. : 0.) * smoothstep(0.7, 0.85, h.y) * smoothstep(0.03, 0.08, h.z);
            float navy = step(0.55, h.x) * step(h.x, 0.75) * step(0.3, h.y) * step(h.z, 0.6);
            if (y > 0.36 && red > 0.) {
              vec3 col = uShirt;
              if (uKit.w > 0.5 && uKit.w < 1.5 && fract(x / 0.07) > 0.5) col = uShirt2;                 // rayas verticales
              if (uKit.w > 1.5 && abs(x + (y - 0.5)) < 0.04) col = uShirt2;                             // banda diagonal
              return mix(c, fbTone(col, h.z, 0.8), red);
            }
            if (y <= 0.5 && y > 0.2 && navy > 0.) return fbTone(uShorts, h.z, 0.32);
            if (y <= 0.36 && red > 0.) return mix(c, fbTone(uSocks, h.z, 0.8), red);
            return c;
          }`;
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', fn + '\nvoid main() {')
          .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = fbKit(diffuseColor.rgb);')
          // (la luz de relleno usa la misma textura como brillo propio: también se tiñe, o el rojo volvería por encima)
          .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv ); totalEmissiveRadiance *= fbKit(emissiveColor.rgb);\n#endif');
      };
      m.customProgramCacheKey = () => 'fb-kit';
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return mats;
}

// gira un hueso (en el mundo) para que su dirección «from» pase a ser «to»
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
function aimBone(bone, child, to) {
  bone.getWorldPosition(va); child.getWorldPosition(vb); vb.sub(va).normalize();
  qa.setFromUnitVectors(vb, vc.copy(to).normalize()); bone.getWorldQuaternion(qb); qb.premultiply(qa);
  bone.parent.getWorldQuaternion(qc); bone.quaternion.copy(qc.invert().multiply(qb)); bone.updateMatrixWorld(true);
}
// banderín del asistente: palo y tela amarilla y roja a cuadros
function flag() {
  const g = new THREE.Group(), c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  for (let i = 0; i < 4; i++) { x.fillStyle = REFEREE.flag[(i + (i >> 1)) % 2]; x.fillRect((i % 2) * 16, (i >> 1) * 16, 16, 16); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), new THREE.MeshStandardMaterial({ color: '#222' })); stick.position.y = 0.25;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 })); cloth.position.set(0.17, 0.37, 0);
  g.add(stick, cloth); return g;
}
// futbolistas del juego: el modelo de Meshy de cada equipo; los porteros, con el de Osasuna y la
// camiseta de su color; el árbitro y los asistentes, con el de Osasuna de negro (y el banderín los asistentes)
export async function makeCharacter(d) {
  const model = d.keeper || d.referee ? 'osasuna' : d.team.model;
  if (!model || !hasMeshy(model)) return null;
  const g = await loadMeshy(model);   // el modelo completo (antes, el ligero: con su textura a la mitad se veían borrosos)
  const char = new GlbChar(g, MESHY_GAIT); char.root.scale.setScalar(g.userData.fit || 1);
  // cada jugador un poco distinto de alto; los porteros, algo más altos
  char.root.scale.multiplyScalar(d.keeper ? 1.05 : [1, 0.97, 1.03, 0.99, 1.02][((d.num || 0) + d.side) % 5]);
  const mats = d.keeper ? recolor(char.root, d.team.keeper) : d.referee ? recolor(char.root, REFEREE.shirt, 0) : d.team.club ? kitRecolor(char.root, d.team) : d.team.recolor ? recolor(char.root, d.team.shirt) : [];
  const B = {}; char.root.traverse(o => { if (o.isBone) B[o.name.replace(/[.:]/g, '').replace(/^mixamorig/, '')] = o; });
  const arms = ['Left', 'Right'].map(s => [B[s + 'Arm'], B[s + 'ForeArm'], B[s + 'Hand']]).filter(a => a.every(Boolean));
  // el banderín, en la mano derecha (con la escala del mundo: el esqueleto de Mixamo va a 1/100)
  let fl = null; if (d.line && B.RightHand) { fl = flag(); B.RightHand.add(fl); char.root.updateMatrixWorld(true); fl.scale.setScalar(1 / B.RightHand.getWorldScale(new THREE.Vector3()).x); }
  // el árbitro lleva las tarjetas: la que enseña aparece en su mano derecha, en alto
  let card = null; if (d.referee && !d.line && B.RightHand) { card = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.105, 0.006), new THREE.MeshBasicMaterial({ color: '#ffd400' })); card.position.set(0, 0.09, 0.02); card.visible = false; B.RightHand.add(card); char.root.updateMatrixWorld(true); card.scale.setScalar(1 / B.RightHand.getWorldScale(new THREE.Vector3()).x); card.position.multiplyScalar(card.scale.x); }
  const up = new THREE.Vector3(0, 1, 0), fw = new THREE.Vector3(), out = new THREE.Vector3(), w = new THREE.Quaternion();
  return { obj: char.root, anim: { setSpeed: (v) => char.setSpeed(v), once: (n, s, fit) => char.playOnce(n, s, fit), update: (dt) => char.update(dt) },
    // brazos arriba sobre la cabeza (saque de banda) o el derecho en alto con el banderín (fuera de juego)
    post: (st) => {
      if (card) { card.visible = !!st?.card; if (st?.card) card.material.color.set(st.card === 'red' ? '#e3262b' : '#ffd400'); }
      if (!st?.arms || !arms.length) return;
      char.root.getWorldQuaternion(w); fw.set(0, 0, 1).applyQuaternion(w);
      arms.forEach(([a, f, h], i) => {
        if (st.arms === 'flag' && i === 0) return;
        out.copy(up).addScaledVector(fw, st.arms === 'up' ? 0.25 : 0.1);
        aimBone(a, f, out); aimBone(f, h, out);
      });
    },
    dispose: () => { char.dispose(); for (const m of mats) m.dispose(); if (card) { card.geometry.dispose(); card.material.dispose(); } if (fl) fl.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } }); } };
}

// El fútbol desde el pueblo: en El Sadar (fútbol 11, con la entrenadora de Osasuna) o en la pista del pueblo (fútbol
// sala, con el entrenador del club del pueblo). opts: { campo, title, sub, local: { name, short } }
export class Futbol {
  constructor(G, lm, opts = {}) { this.G = G; this.lm = lm; this.opts = { campo: 'sadar', title: 'El Sadar', sub: 'Partido de fútbol', ...opts }; }
  update() {}
  setup() {
    const G = this.G;
    const sound = G.sound?.ctx ? { ctx: G.sound.ctx, out: G.sound.sfx } : null;
    FutbolSystem.init({
      makeCharacter, quality: QUALITY, touch: G.input?.touch, audio: sound,
      crowd: (spots) => crowd3d(spots, 'futbol', 1.38, { sit: true }),
      host: {
        before: async () => { G.player.frozen = true; G.ui.setPrompt?.(null); await G.ui.fadeOut?.(); },
        attach: (scene, camera, update) => { G.altScene = scene; G.altCamera = camera; G.altUpdate = update; G.mode = 'futbol'; G.ui.hudVisible?.(false); document.body.classList.add('futbol'); G.rt?.boost?.(true); },
        shown: async () => { await G.ui.fadeIn?.(); },
        detach: () => { G.altScene = null; G.altCamera = null; G.altUpdate = null; G.mode = 'play'; G.ui.hudVisible?.(true); document.body.classList.remove('futbol'); G.rt?.boost?.(false); },
        after: async () => { G.player.frozen = false; G.follow?.snap?.(G.player); },
      },
    });
    // directamente al menú (el partido once contra once viene elegido; los retos de entrenamiento, en la misma lista)
  }
  result(r) {
    if (!r || r.quit) return { quit: true, reto: r?.reto, win: !!r?.win };
    if (r.mode === 'reto') return { quit: false, reto: r.reto, win: !!r.win };
    return { win: !!r.win, you: r.pens && r.mode === 'penalties' ? r.pens[0] : r.you ?? 0, cpu: r.pens && r.mode === 'penalties' ? r.pens[1] : r.cpu ?? 0, quit: !!r.quit, draw: !!r.draw };
  }
  /** Un minijuego, no un juego completo: hablar con quien entrena y al partido (dos partes de 2 minutos, nivel
   *  fácil, con ayuda al pase y al tiro), sin entrenamiento ni menú previo. Al acabar, revancha o salir. */
  async run() {
    this.setup(); const o = this.opts;
    return this.result(await FutbolSystem.startMatch({ campoId: o.campo, dificultad: 'facil', duracion: 2, asistencia: true, local: o.local }));
  }
  /** Un reto de entrenamiento concreto. */
  async reto(id) { this.setup(); const o = this.opts; return this.result(await FutbolSystem.startReto({ campoId: o.campo, reto: id, local: o.local })); }
  /** Un partido directo contra un rival. */
  async match(rival, dificultad = 'normal', duracion = 2, awayTeam = null) { this.setup(); const o = this.opts; return this.result(await FutbolSystem.startMatch({ campoId: o.campo, rival, dificultad, duracion, local: o.local, awayTeam })); }
  /** Liga Navarra con el club del pueblo (fútbol 11, todas las jornadas en El Sadar). */
  async liga(club) { this.setup(); return this.result(await FutbolSystem.startLeague({ club })); }
  /** Amistoso del club contra el club que se elija. */
  async friendly(club) { this.setup(); return this.result(await FutbolSystem.startFriendly({ club })); }
}
