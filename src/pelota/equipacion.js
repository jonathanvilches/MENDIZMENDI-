// La pantalla de la equipación de tu pelotari (pelota/kit.js): a un lado, el pelotari en 3D con lo que llevas elegido; al
// otro, tres filas de colores: zapatillas, muñequeras y faja (el autor, 18 de noviembre de 2026: «una de las
// personalizaciones son las zapatillas, las muñequeras y la faja o fajín»). Cada toque se ve al momento en el pelotari y
// se guarda; se le da la vuelta arrastrando.
// El pelotari no se anima ni tiene su propio lienzo WebGL: es una imagen que se vuelve a dibujar cuando cambia algo (un
// color, el giro), con el renderizador que ya hay (util/offscreen.js). Así no gasta nada mientras se mira, y en el móvil
// no se abre un contexto más.
import * as THREE from 'three';
import { lgPanel, lgFuera, lgEsc as esc } from '../futbol/liga.js';
import { loadMeshy, GlbChar, MESHY_GAIT, hasMeshy } from '../actors/glbChar.js';
import { outfitTint, ponKitColores } from '../actors/npcOutfit.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';
import { aspectoDe, aspectoTuyo } from './aspectos.js';
import { KIT_COLORES, KIT_PIEZAS, kitTuyo, ponKit, kitColores } from './kit.js';

const isEU = () => typeof document !== 'undefined' && document.documentElement?.lang === 'eu';
const W = 384, H = 512;
const CSS = `
.lg-card.eq-pant{width:100%;max-width:none;height:100%;padding:0;gap:clamp(4px,1.4vh,12px);background:none;border:0;box-shadow:none;overflow:hidden;border-radius:0;display:flex;flex-direction:column}
.lg-card.eq-pant::before,.lg-card.eq-pant::after{display:none}
.eq-cuerpo{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(10px,3vw,40px);align-items:center}
.eq-vista{position:relative;height:100%;min-height:0;padding-bottom:16px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.eq-vista:active{cursor:grabbing}
.eq-cv{display:block;height:100%;width:auto;max-width:100%;aspect-ratio:3/4;object-fit:contain;filter:drop-shadow(0 14px 18px rgba(4,1,12,.5))}
.eq-vista small{position:absolute;left:0;right:0;bottom:0;text-align:center;color:#c9b8ea;font:700 var(--fs-xs,11px)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}
.eq-espera{position:absolute;inset:0;display:grid;place-items:center;color:#d9cdef;font:700 var(--fs-sm,13px)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.08em;text-transform:uppercase}
.eq-filas{display:flex;flex-direction:column;gap:clamp(8px,3.2vh,28px);min-width:0}
.eq-fila>b{display:flex;align-items:baseline;gap:8px;margin-bottom:clamp(4px,1.2vh,8px);font:800 var(--fs-sm,13px)/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--rosa,#ff7ac8)}
.eq-fila>b i{font-style:normal;color:#fff;letter-spacing:.04em}
.eq-colores{display:flex;flex-wrap:wrap;gap:clamp(6px,1vw,10px)}
.eq-sw{position:relative;flex:none;width:clamp(32px,8.6vh,46px);aspect-ratio:1;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:var(--c,transparent);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s}
.eq-sw:hover{transform:scale(1.08)}
.eq-sw[aria-checked="true"]{border-color:#ffd166;box-shadow:0 0 0 2px #ffd166,0 0 12px rgba(255,209,102,.5)}
.eq-sw[aria-checked="true"]::after{content:'';position:absolute;inset:26%;background:var(--m,#fff);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 12.5l5 5L20 6.5' fill='none' stroke='black' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 12.5l5 5L20 6.5' fill='none' stroke='black' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat}
.eq-sin{background:rgba(255,255,255,.06)}
.eq-sin::before{content:'';position:absolute;left:14%;right:14%;top:50%;height:2px;margin-top:-1px;background:#fff;transform:rotate(-45deg);opacity:.8}
.eq-sin[aria-checked="true"]::after{display:none}
.eq-pant .lg-bar{flex:none;justify-content:flex-end;border-top:0;padding-top:0}
@media (prefers-reduced-motion:reduce){.eq-sw{transition:none}}
@media (orientation:portrait){.eq-cuerpo{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto;align-items:stretch}.eq-sw{width:clamp(32px,9.4vw,46px)}}
`;
// (los colores claros llevan la marca oscura)
const claro = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 150; };

/** El pelotari para mirarlo: su modelo con la equipación puesta. Devuelve { pinta(giro) → lienzo, pon(colores), fin() } */
async function maniqui(aspecto) {
  const gl = await loadMeshy(aspecto.modelo);
  const c = new GlbChar(gl, MESHY_GAIT); c.root.scale.setScalar(gl.userData.fit || 1);
  const U = outfitTint(c.root, aspecto.modelo, kitColores());
  c.update(0.3);   // (de pie, en su postura de reposo)
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6e8', '#5a5060', 2.2));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(1.5, 3, 4); scene.add(sun);
  const eje = new THREE.Group(); eje.add(c.root); scene.add(eje);
  // (el encuadre: de los pies a la cabeza, con aire; la caja, la del cuerpo ya en su postura, hueso a hueso: la de la
  // malla en reposo no vale, que el modelo viene ajustado a su caja y la cabeza se salía por arriba)
  eje.updateMatrixWorld(true);
  const caja = new THREE.Box3();
  c.root.traverse(o => { if (o.isSkinnedMesh) { o.computeBoundingBox(); caja.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  if (caja.isEmpty()) caja.setFromObject(c.root);
  const alto = Math.max(0.5, caja.max.y - caja.min.y), cy = (caja.max.y + caja.min.y) / 2, cx = (caja.max.x + caja.min.x) / 2;
  c.root.position.x -= cx;   // (centrado en el eje de giro)
  const cam = new THREE.PerspectiveCamera(22, W / H, 0.1, 60), d = (alto * 1.12 / 2) / Math.tan((11 * Math.PI) / 180);
  cam.position.set(0, cy, d); cam.lookAt(0, cy, 0);
  return {
    pinta(giro = 0) {
      eje.rotation.y = giro; eje.updateMatrixWorld(true);
      const R = offscreen(W, H, THREE.NeutralToneMapping); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
      return offscreenCanvas();
    },
    pon(col) { ponKitColores(U, col); },
    fin() { eje.remove(c.root); try { c.dispose(); } catch (e) { /* ya suelto */ } },
  };
}

/** Abre la pantalla de la equipación. nombre: el pelotari con el que se mira ('' o sin él: el tuyo). Se cierra con
 *  «Listo», Escape o el botón de atrás; lo elegido ya está guardado. */
export function abreEquipacion({ nombre = '', kicker = '' } = {}) {
  if (!document.getElementById('eq-css')) { const st = document.createElement('style'); st.id = 'eq-css'; st.textContent = CSS; document.head.appendChild(st); }
  const eu = isEU(), aspecto = nombre ? aspectoDe(nombre) : aspectoTuyo();
  return new Promise(res => {
    const K = kitTuyo();
    const fila = (p) => `<div class="eq-fila"><b>${esc(eu ? p.eu : p.es)} <i data-n="${p.k}"></i></b>
      <div class="eq-colores" role="radiogroup" aria-label="${esc(eu ? p.eu : p.es)}" data-k="${p.k}">${p.sin ? `<button type="button" class="eq-sw eq-sin" role="radio" data-c="" aria-label="${eu ? 'Gabe' : 'Sin'}" title="${eu ? 'Gabe' : 'Sin'}"></button>` : ''}${KIT_COLORES.map(c => `<button type="button" class="eq-sw" role="radio" data-c="${c.id}" style="--c:${c.c};--m:${claro(c.c) ? '#1d1b24' : '#fff'}" aria-label="${esc(eu ? c.eu : c.es)}" title="${esc(eu ? c.eu : c.es)}"></button>`).join('')}</div></div>`;
    const r = lgPanel(`<div class="ef-head" data-notr><small>${esc(kicker || (eu ? 'Zure pilotaria' : 'Tu pelotari'))}</small><h2>${eu ? 'Ekipazioa' : 'Equipación'}</h2></div>
      <div class="eq-cuerpo" data-notr>
        <div class="eq-vista"><canvas class="eq-cv" width="${W}" height="${H}" role="img" aria-label="${eu ? 'Zure pilotaria' : 'Tu pelotari'}"></canvas><span class="eq-espera">${eu ? 'Prestatzen…' : 'Preparando…'}</span><small>${eu ? 'Arrastatu biratzeko' : 'Arrastra para girarlo'}</small></div>
        <div class="eq-filas">${KIT_PIEZAS.map(fila).join('')}</div>
      </div>
      <div class="lg-bar" data-notr><button class="lg-btn go" data-a="ok">${eu ? 'Prest' : 'Listo'}</button></div>`);
    r.firstElementChild.classList.add('ef-card', 'eq-pant');
    const cv = r.querySelector('.eq-cv'), g2 = cv.getContext('2d'), vista = r.querySelector('.eq-vista');
    let M = null, giro = -0.35, pend = 0, vivo = true;
    const dibuja = () => { pend = 0; if (!M || !vivo) return; try { const im = M.pinta(giro); g2.clearRect(0, 0, W, H); g2.drawImage(im, 0, 0, W, H); } catch (e) { console.warn('equipación', e); } };
    const pide = () => { if (!pend) pend = requestAnimationFrame(dibuja); };
    const marca = () => { const k = kitTuyo(); for (const p of KIT_PIEZAS) {
      r.querySelectorAll(`[data-k="${p.k}"] .eq-sw`).forEach(b => b.setAttribute('aria-checked', String(b.dataset.c === k[p.k])));
      const c = KIT_COLORES.find(x => x.id === k[p.k]); r.querySelector(`[data-n="${p.k}"]`).textContent = c ? (eu ? c.eu : c.es) : (eu ? 'Gabe' : 'Sin'); } };
    marca();
    if (hasMeshy(aspecto.modelo)) maniqui(aspecto).then(m => { if (!vivo) return m.fin(); M = m; r.querySelector('.eq-espera')?.remove(); dibuja(); }).catch(e => { console.warn('equipación', e); const s = r.querySelector('.eq-espera'); if (s) s.textContent = ''; });
    // girarlo: arrastrando de lado
    let arr = null;
    vista.addEventListener('pointerdown', (e) => { arr = { x: e.clientX, g: giro, id: e.pointerId }; try { vista.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ } });
    vista.addEventListener('pointermove', (e) => { if (!arr || e.pointerId !== arr.id) return; giro = arr.g + (e.clientX - arr.x) * 0.012; pide(); });
    const suelta = (e) => { if (arr && e.pointerId === arr.id) arr = null; };
    vista.addEventListener('pointerup', suelta); vista.addEventListener('pointercancel', suelta);
    const fin = () => { if (!vivo) return; vivo = false; cancelAnimationFrame(pend); removeEventListener('keydown', tecla, true); M?.fin(); lgFuera(r); res(kitTuyo()); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); fin(); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (e.target.closest?.('.eq-sw')) return; e.stopImmediatePropagation(); e.preventDefault(); giro += e.key === 'ArrowRight' ? 0.3 : -0.3; pide(); } };
    addEventListener('keydown', tecla, true);
    r.addEventListener('click', (e) => {
      const b = e.target.closest('.eq-sw');
      if (b) { ponKit(b.parentElement.dataset.k, b.dataset.c); marca(); M?.pon(kitColores()); pide(); return; }
      if (e.target.closest('[data-a="ok"]')) fin();
    });
  });
}
