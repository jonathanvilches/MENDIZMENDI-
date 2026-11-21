// Lo poco que se ve al explorar: el anillo de resistencia, que sale junto al personaje solo mientras se gasta o se
// recupera. Nada depende solo del color: el anillo se vacía (su arco se acorta), con poca resistencia pasa a trazos y
// late, y agotado lleva una raya cruzada. Con una mejora de resistencia aparece un segundo arco por fuera. No ocupa sitio
// cuando no se ve (display: none, no una capa transparente encima del visor).
// (Los corazones de arriba se quitaron el 21 de noviembre de 2026. El autor: «Yo tampoco sé de dónde vienen los
// corazones [...] si no sirven para nada, elimínalos». Salían unos segundos al entrar en cada pueblo y solo servían para
// las caídas desde muy alto.)
import * as THREE from 'three';

const CSS = `
.av-anillo{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;pointer-events:none;opacity:0;transition:opacity .25s;z-index:6}
.av-anillo[hidden]{display:none}
.av-anillo.ve{opacity:1}
.av-anillo svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.av-anillo .f{fill:rgba(20,24,40,.42);stroke:none}
.av-anillo .a,.av-anillo .b{fill:none;stroke:#ffd166;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset .12s linear}
.av-anillo .b{stroke:#8fe0a8;stroke-width:3.4}
.av-anillo .x{stroke:#fff;stroke-width:3;stroke-linecap:round;opacity:0}
.av-anillo.bajo .a{stroke:#ff8a5c;stroke-dasharray:5 4 !important;animation:av-late .55s ease-in-out infinite alternate}
.av-anillo.agotado .x{opacity:.95}
@keyframes av-late{from{stroke-width:4}to{stroke-width:6.5}}
body.alto-contraste .av-anillo .f{fill:#000}
@media (prefers-reduced-motion:reduce){.av-anillo.bajo .a{animation:none}}`;
const R1 = 16, R2 = 21.5, L1 = 2 * Math.PI * R1, L2 = 2 * Math.PI * R2;
const _v = new THREE.Vector3();

export class AventuraHud {
  constructor() {
    if (!document.getElementById('av-css')) { const s = document.createElement('style'); s.id = 'av-css'; s.textContent = CSS; document.head.appendChild(s); }
    this.anillo = document.createElement('div'); this.anillo.className = 'av-anillo'; this.anillo.setAttribute('aria-hidden', 'true');
    this.anillo.innerHTML = `<svg viewBox="-25 -25 50 50"><circle class="f" r="23.5"/><circle class="a" r="${R1}" stroke-dasharray="${L1}"/><circle class="b" r="${R2}" stroke-dasharray="${L2}"/><line class="x" x1="-7" y1="-7" x2="7" y2="7"/></svg>`;
    this.anillo.hidden = true;
    document.body.append(this.anillo);
    this.a = this.anillo.querySelector('.a'); this.b = this.anillo.querySelector('.b');
    this.verT = 0; this.sinAnillo = 1;
  }
  /** Cada fotograma: dónde está el jugador en pantalla y cuánta resistencia le queda. */
  anilloEn(player, camera, dt, visible) {
    const lleno = player.aguante >= player.aguanteMax - 0.001;
    this.verT = lleno ? Math.max(0, this.verT - dt) : 0.8;
    const ve = visible && (this.verT > 0 || !lleno);
    this.anillo.classList.toggle('ve', ve);
    // (apagado del todo cuando acaba de desvanecerse: no queda una capa invisible en la esquina del visor)
    if (!ve) { if (!this.anillo.hidden && (this.sinAnillo += dt) > 0.3) this.anillo.hidden = true; return; }
    this.sinAnillo = 0; if (this.anillo.hidden) this.anillo.hidden = false;
    _v.copy(player.pos); _v.y += 1.55; _v.project(camera);
    const x = (_v.x * 0.5 + 0.5) * innerWidth + 44, y = (-_v.y * 0.5 + 0.5) * innerHeight - 8;
    this.anillo.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    const base = Math.min(1, player.aguante), extra = Math.max(0, player.aguanteMax - 1), ex = extra > 0 ? Math.max(0, player.aguante - 1) / extra : 0;
    this.a.style.strokeDashoffset = (L1 * (1 - base)).toFixed(1);
    this.b.style.display = extra > 0 ? '' : 'none';
    // (el arco de fuera mide lo que da la mejora: con una, un quinto de vuelta; se vacía antes que el de dentro)
    if (extra > 0) { const largo = L2 * Math.min(1, extra); this.b.setAttribute('stroke-dasharray', `${(largo * ex).toFixed(1)} ${L2}`); }
    this.anillo.classList.toggle('bajo', player.aguante < 0.25 && !player.agotado);
    this.anillo.classList.toggle('agotado', !!player.agotado);
  }
  dispose() { this.anillo.remove(); }
}
