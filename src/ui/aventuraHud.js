// Lo poco que se ve al explorar: el anillo de resistencia, que sale junto al personaje solo mientras se gasta o se
// recupera, y los corazones, que salen arriba solo cuando falta alguno o acaban de cambiar. Nada depende solo del
// color: el anillo se vacía (su arco se acorta), con poca resistencia pasa a trazos y late, y agotado lleva una raya
// cruzada; un corazón lleno es macizo y uno vacío, solo su contorno. Con una mejora de resistencia aparece un segundo
// arco por fuera.
import * as THREE from 'three';

const CSS = `
.av-anillo{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;pointer-events:none;opacity:0;transition:opacity .25s;z-index:6;will-change:transform,opacity}
.av-anillo.ve{opacity:1}
.av-anillo svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.av-anillo .f{fill:rgba(20,24,40,.42);stroke:none}
.av-anillo .a,.av-anillo .b{fill:none;stroke:#ffd166;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset .12s linear}
.av-anillo .b{stroke:#8fe0a8;stroke-width:3.4}
.av-anillo .x{stroke:#fff;stroke-width:3;stroke-linecap:round;opacity:0}
.av-anillo.bajo .a{stroke:#ff8a5c;stroke-dasharray:5 4 !important;animation:av-late .55s ease-in-out infinite alternate}
.av-anillo.agotado .x{opacity:.95}
@keyframes av-late{from{stroke-width:4}to{stroke-width:6.5}}
.av-cor{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translate(-50%,-8px);display:flex;gap:4px;padding:5px 10px;border-radius:999px;background:rgba(20,24,40,.5);pointer-events:none;opacity:0;transition:opacity .3s,transform .3s;z-index:6}
.av-cor.ve{opacity:1;transform:translate(-50%,0)}
.av-cor svg{width:22px;height:22px}
.av-cor .lleno path{fill:#ff5d73;stroke:#fff;stroke-width:1.4}
.av-cor .vacio path{fill:none;stroke:#fff;stroke-width:1.8;stroke-dasharray:3 2.2}
.av-cor .pum{animation:av-pum .5s ease-out}
@keyframes av-pum{0%{transform:scale(1.7)}100%{transform:scale(1)}}
body.alto-contraste .av-anillo .f{fill:#000}body.alto-contraste .av-cor{background:#000}
@media (prefers-reduced-motion:reduce){.av-anillo.bajo .a{animation:none}.av-cor .pum{animation:none}}`;
const R1 = 16, R2 = 21.5, L1 = 2 * Math.PI * R1, L2 = 2 * Math.PI * R2;
const COR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5C5.5 15.6 3 12.4 3 8.9 3 6.2 5.1 4.2 7.6 4.2c1.8 0 3.4 1 4.4 2.6 1-1.6 2.6-2.6 4.4-2.6 2.5 0 4.6 2 4.6 4.7 0 3.5-2.5 6.7-9 11.6z"/></svg>';
const _v = new THREE.Vector3();

export class AventuraHud {
  constructor() {
    if (!document.getElementById('av-css')) { const s = document.createElement('style'); s.id = 'av-css'; s.textContent = CSS; document.head.appendChild(s); }
    this.anillo = document.createElement('div'); this.anillo.className = 'av-anillo'; this.anillo.setAttribute('aria-hidden', 'true');
    this.anillo.innerHTML = `<svg viewBox="-25 -25 50 50"><circle class="f" r="23.5"/><circle class="a" r="${R1}" stroke-dasharray="${L1}"/><circle class="b" r="${R2}" stroke-dasharray="${L2}"/><line class="x" x1="-7" y1="-7" x2="7" y2="7"/></svg>`;
    this.cor = document.createElement('div'); this.cor.className = 'av-cor'; this.cor.setAttribute('role', 'status');
    document.body.append(this.anillo, this.cor);
    this.a = this.anillo.querySelector('.a'); this.b = this.anillo.querySelector('.b');
    this.verT = 0; this.corT = 0; this.nCor = -1; this.maxCor = -1;
  }
  /** Cada fotograma: dónde está el jugador en pantalla y cuánta resistencia le queda. */
  anilloEn(player, camera, dt, visible) {
    const lleno = player.aguante >= player.aguanteMax - 0.001;
    this.verT = lleno ? Math.max(0, this.verT - dt) : 0.8;
    const ve = visible && (this.verT > 0 || !lleno);
    this.anillo.classList.toggle('ve', ve);
    if (!ve) return;
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
  /** Los corazones: n de max. Se enseñan unos segundos al cambiar y mientras falte alguno. */
  corazones(n, max, dt, visible, texto) {
    if (n !== this.nCor || max !== this.maxCor) {
      const baja = n < this.nCor;
      this.cor.innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'lleno' : 'vacio'}${baja && i === n ? ' pum' : ''}">${COR}</span>`).join('');
      this.cor.setAttribute('aria-label', texto || `${n} / ${max}`);
      this.nCor = n; this.maxCor = max; this.corT = 4.5;
    }
    this.corT = Math.max(0, this.corT - dt);
    this.cor.classList.toggle('ve', visible && (n < max || this.corT > 0));
  }
  dispose() { this.anillo.remove(); this.cor.remove(); }
}
