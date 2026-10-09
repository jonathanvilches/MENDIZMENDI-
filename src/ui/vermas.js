// «Ver más»: en el menú y en las ventanas del juego, un texto largo se ve en sus primeras líneas y un botón lo abre
// entero (y lo vuelve a cerrar). Así la información está cuando se quiere saber, sin llenar la pantalla de texto.
// Se aplica solo a los bloques de lectura de la lista (párrafos de las pantallas del menú, fichas, ventanas de
// información, el cuadro de los torneos, la ficha del pueblo...), nunca a los diálogos ni a los avisos del juego.
// Un bloque que ya cabe en sus líneas se queda como está, sin botón.
const SEL = [
  '#hub .hub-main p', '#hub .hub-main dd', '#hub .sheet p', '#hub .sheet .plist li',
  '.mg-card p', '.ficha dd', '.ficha p', '.escudo p', '.escudo dd',
  '.lg-root .lg-how', '.tq-st p', '.pel-card .pel-pairs', '.fb-card p',
  '#loading .ld-intro',
].join(',');
// (estos se quedan siempre enteros: cifras, avisos, botones, textos de una línea que ya se leen de un vistazo y los
// «¿sabías que…?» del final de los partidos, de dos o tres líneas, que caben en la ventana; y las fichas de
// información, que enseñan su texto entero: una sección cada vez o con su caja desplazable)
const SKIP = 'button, a, summary, label, .ar-count, .lnk, .vm-btn, #dialog, .pel-tip, .fb-tip, .pel-fact, .fb-fact, [data-vm="no"], .ix';
const CSS = `
.vm-clamp:not(.vm-open){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:var(--vm-lines,4);overflow:hidden}
.vm-clamp.vm-open{display:block;-webkit-line-clamp:unset;overflow:visible}
.vm-btn{position:relative;justify-self:start;align-self:flex-start;width:auto;display:inline-flex;align-items:center;gap:4px;margin:2px 0 8px;padding:4px 12px;min-height:30px;border-radius:999px;border:1px solid rgba(255,122,200,.4);background:rgba(255,255,255,.07);color:#ff9bd8;font:800 var(--fs-xs)/1 Nunito,system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;pointer-events:auto}
.vm-btn::after{content:'';width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .15s}
.vm-btn[aria-expanded="true"]::after{transform:translateY(2px) rotate(-135deg)}
li>.vm-btn{margin-top:0}
.vm-btn::before{content:'';position:absolute;inset:-8px -4px}
`;
let started = false;
export function startVerMas(root = document.body) {
  if (started) return; started = true;
  const st = document.createElement('style'); st.id = 'vm-css'; st.textContent = CSS; document.head.appendChild(st);
  // (el tamaño solo se sabe cuando el bloque se ve: se espera a que tenga alto y entonces se decide)
  const ro = new ResizeObserver((es) => { for (const e of es) if (e.contentRect.height > 0) { ro.unobserve(e.target); decide(e.target); } });
  const decide = (el) => {
    if (!el.isConnected || el.dataset.vm === 'ok') return;
    const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35 || 20, lines = +el.style.getPropertyValue('--vm-lines') || 4;
    // (si cabe en sus líneas y una más, se queda entero: plegar para esconder una línea solo corta el texto; si no, se
    // pliega: se lee lo justo y el resto, cuando se quiera. El relleno de la caja no cuenta como texto)
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    if (el.scrollHeight - pad <= lh * (lines + 1.5)) {
      el.classList.remove('vm-clamp'); el.dataset.vm = 'ok'; return;
    }
    el.dataset.vm = 'ok';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vm-btn'; b.textContent = 'Ver más'; b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); const open = el.classList.toggle('vm-open'); b.textContent = open ? 'Ver menos' : 'Ver más'; b.setAttribute('aria-expanded', String(open)); });
    if (el.tagName === 'LI') el.appendChild(b); else el.after(b);
  };
  const apply = (el) => {
    if (el.dataset.vm || el.closest(SKIP)) return;
    const d = getComputedStyle(el).display; if (!['block', 'flow-root', 'list-item', '-webkit-box'].includes(d)) { el.dataset.vm = 'no'; return; }   // (en filas o rejillas, no)
    el.dataset.vm = 'wait'; el.classList.add('vm-clamp');
    const lines = +(el.closest('[data-vm-lines]')?.dataset.vmLines || 4); el.style.setProperty('--vm-lines', lines);
    ro.observe(el);
  };
  const scan = (n) => { if (n.nodeType !== 1) return; if (n.matches(SEL)) apply(n); for (const e of n.querySelectorAll(SEL)) apply(e); };
  scan(root);
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) scan(n); }).observe(root, { childList: true, subtree: true });
}
