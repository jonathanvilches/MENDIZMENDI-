// La galería de los pueblos (sección Pueblos del menú): cada comarca, un carrusel circular en 3D con la portada de cada
// pueblo, como una sala de pantallas que gira. El de delante, grande y encendido, con su nombre, sus misiones y los
// botones de jugar y de ver su ficha; los demás, alrededor, más lejos y en penumbra. Se gira arrastrando, con las
// flechas, la rueda del ratón o el teclado (← →); las comarcas, arriba (o ↑ ↓). Al cambiar de comarca, su anillo sale
// girando y entra el de la otra, con la luz del suelo de su color. Todo con transformaciones 3D del navegador: va suelto también
// en el móvil, sin otro lienzo 3D encima del mapa.
import './galeria.css';

const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * m: el contenedor (la ventana de la sección). o: { comarcas: [{ id, nombre, color }], tarjetas(id) → html de
 * las tarjetas de sus pueblos (botones .gal-t con data-gt), info(townId, i, n) → html de la ficha del de delante,
 * inicial (id de la comarca), pueblo (id del pueblo de delante al entrar), abre(townId), sonido(nombre) }.
 */
export function galeria(m, o) {
  const G = m.querySelector('.gal'); if (!G) return;
  const anillo = G.querySelector('.gal-anillo'), escena = G.querySelector('.gal-escena'), info = G.querySelector('.gal-info');
  const puntos = G.querySelector('.gal-puntos'), cms = [...G.querySelectorAll('[data-gc]')];
  let ci = Math.max(0, o.comarcas.findIndex(c => c.id === o.inicial)), T = [], N = 0, N0 = 0, paso = 60, R = 400, X1 = 300, X2 = 180, Z1 = 40, Z2 = 80, giro = 28;
  let rot = 0, meta = 0, frente = -1, raf = 0, last = 0, arrastre = null, cambiando = false;

  // ---------- el anillo de una comarca ----------
  function monta(i, entra) {
    const c = o.comarcas[i]; ci = i;
    G.style.setProperty('--c', c.color);
    cms.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    // (la comarca elegida, en medio de su fila; sin scrollIntoView, que también corría de lado la ventana de la sección)
    const fila = cms[i]?.parentElement, b = cms[i];
    if (fila && b) fila.scrollTo({ left: b.offsetLeft - (fila.clientWidth - b.offsetWidth) / 2, behavior: reduce() ? 'auto' : 'smooth' });
    // (con menos de seis pueblos, se repiten hasta llenar el anillo: así siempre es un círculo entero y al girar no se ve
    // ningún hueco ni una tarjeta de espaldas)
    const html = o.tarjetas(c.id); anillo.innerHTML = html;
    N0 = anillo.querySelectorAll('.gal-t').length; if (N0 && N0 < 6) anillo.innerHTML = html.repeat(Math.ceil(6 / N0));
    T = [...anillo.querySelectorAll('.gal-t')]; N = T.length;
    T.forEach((t, k) => { if (k >= N0) t.setAttribute('aria-hidden', 'true'); });
    puntos.innerHTML = Array.from({ length: N0 }, (_, k) => `<i data-gp="${k}"></i>`).join('');
    mide();
    const j = o.pueblo ? T.findIndex(t => t.dataset.gt === o.pueblo) : -1; o.pueblo = null;
    rot = meta = Math.max(0, j) * paso + (entra ? -paso * 1.5 * entra : 0); if (entra) meta = Math.max(0, j) * paso;
    frente = -1; pinta(); anima();
    if (entra) { anillo.classList.remove('sale'); anillo.classList.add('entra'); setTimeout(() => anillo.classList.remove('entra'), 700); }
  }
  // (el radio del anillo: las tarjetas casi tocándose; con pocos pueblos, como si fueran seis, para que el anillo no se
  // cierre tanto y los de los lados no se tapen)
  function mide() {
    // (la carta entera, con lo que se adelanta la de delante y lo que flota, dentro de su hueco: si no cabe de alto, más
    // estrecha. Con aire arriba y abajo, y abajo con sitio para los puntos, si se ven)
    const dh = parseFloat(getComputedStyle(G).getPropertyValue('--dh')) || 50, aire = puntos.offsetParent ? 28 : 10;
    G.style.setProperty('--gwmax', Math.max(140, ((escena.clientHeight - 2 * aire) / 1.05 - dh - 6) * 16 / 9) + 'px');
    const w = T[0]?.offsetWidth || 220, n = Math.max(N, 3);
    paso = 360 / n; R = Math.round((w / 2 + Math.max(14, w * 0.1)) / Math.tan(Math.PI / n));
    G.style.setProperty('--R', R + 'px');
    // (las de los lados, poco hondas: apenas detrás y junto a la de delante, giradas lo justo para acabar antes de las
    // flechas, entre 22° y 38°: en el móvil tumbado, poco, y llenan el ancho. Si ni así caben, como en el ordenador, donde la
    // de delante es grande, se meten algo por detrás de ella; en el móvil de pie, no: asoman por el borde. En el anillo de
    // verdad iban giradas 60° y medio radio atrás, pequeñas, y a los lados quedaba mucho aire vacío. Las siguientes asoman
    // detrás de ellas, en penumbra, paralelas)
    const W2 = escena.clientWidth / 2, gap = Math.max(10, w * 0.04), esc = 1150 / (1150 + w * 0.12), libre = W2 - 64 - w * 0.52 - gap;
    giro = Math.round(Math.min(38, Math.max(22, Math.acos(Math.max(0, Math.min(1, libre / (w * esc)))) * 180 / Math.PI)));
    const pw = w * Math.cos(giro * Math.PI / 180) * esc;   // (lo que ocupa de ancho una de lado)
    Z1 = Math.round(w * 0.12); X1 = Math.round(w * 0.52 + gap + pw / 2); X2 = Math.round(pw * 0.62);
    // (y si se meten por detrás de la de delante, más al fondo, que su borde de dentro, girado, no asome por delante)
    if (W2 * 2 > w * 1.6 && W2 - 64 - pw / 2 < X1) { X1 = Math.round(W2 - 64 - pw / 2); if (X1 - pw / 2 < w * 0.52) Z1 = Math.round(Math.max(Z1, w / 2 * Math.sin(giro * Math.PI / 180) + 52)); }
    Z2 = Math.round(X2 * Math.tan(giro * Math.PI / 180) + w * 0.12);   // (así la del segundo puesto queda siempre detrás de la del primero)
    // (el hueco a cada lado de la de delante, que se adelanta un 4 %: en el móvil de pie, las flechas van en medio de él)
    G.style.setProperty('--hueco', Math.max(0, (escena.clientWidth - w * 1.04) / 2) + 'px');
  }
  // (cada tarjeta, en su sitio: s, cuántos puestos se aparta de delante, sin cortes al girar; las de los lados, más
  // oscuras; las del segundo puesto, paralelas a ellas y detrás, asomando en penumbra, y desde ahí se apagan; la de delante,
  // encendida y algo adelantada)
  function pinta() {
    anillo.style.transform = '';
    for (let k = 0; k < N; k++) {
      const d = ((k * paso - rot) % 360 + 540) % 360 - 180, s = d / paso, a = Math.abs(s), sg = Math.sign(s), t = T[k];   // (d: lo que se aparta de delante, de −180 a 180)
      const x = sg * (a <= 1 ? a * X1 : X1 + (a - 1) * X2), z = (a <= 1 ? -a * Z1 : -Z1 - (a - 1) * Z2) + Math.max(0, 1 - a) * 40, g = sg * Math.min(a, 1) * giro;
      t.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${g.toFixed(2)}deg)`;
      t.style.setProperty('--d', Math.min(1, a * 0.45).toFixed(3));
      t.style.setProperty('--o', (a <= 2 ? 1 : Math.max(0, (2.6 - a) / 0.6)).toFixed(3));
      t.style.visibility = a >= 2.6 ? 'hidden' : '';
    }
    const f = N ? ((Math.round(rot / paso) % N) + N) % N : -1;
    if (f !== frente) {
      frente = f; T.forEach((t, k) => { t.classList.toggle('frente', k === f); t.tabIndex = k === f ? 0 : -1; t.setAttribute('aria-current', String(k === f)); });
      puntos.querySelectorAll('i').forEach((p, k) => p.classList.toggle('on', k === f % N0));
      if (f >= 0) { info.innerHTML = o.info(T[f].dataset.gt, f % N0, N0); info.classList.remove('cambia'); void info.offsetWidth; info.classList.add('cambia'); }
    }
  }
  // (el giro, con un muelle: llega rápido y se asienta sin rebotar)
  function anima() {
    if (raf) return;
    last = performance.now();
    const tick = (now) => {
      raf = 0; if (!G.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!arrastre) { const k = reduce() ? 1 : 1 - Math.exp(-dt * 9); rot += (meta - rot) * k; if (Math.abs(meta - rot) < 0.05) rot = meta; }
      pinta();
      if (arrastre || rot !== meta) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  const ve = (k) => { meta = (Math.round(meta / paso) + k) * paso; o.sonido?.('click'); anima(); };
  // (a la tarjeta k del anillo por el camino más corto; con un pueblo repetido, a su copia más cercana)
  const aTarjeta = (k) => { const cur = Math.round(meta / paso), base = ((cur % N) + N) % N; let d = k - base; if (d > N / 2) d -= N; if (d < -N / 2) d += N; meta = (cur + d) * paso; o.sonido?.('click'); anima(); };
  const aPueblo = (k) => { const cur = ((Math.round(meta / paso) % N) + N) % N, dist = (j) => { const d = Math.abs(j - cur) % N; return Math.min(d, N - d); };
    let mejor = k; for (let j = k; j < N; j += N0) if (dist(j) < dist(mejor)) mejor = j; aTarjeta(mejor); };
  function comarca(i, dir) {
    if (cambiando || i === ci || i < 0 || i >= o.comarcas.length) return;
    cambiando = true; o.sonido?.('open');
    anillo.classList.add('sale');
    setTimeout(() => { monta(i, dir || (i > ci ? 1 : -1)); cambiando = false; }, reduce() ? 0 : 230);
  }

  // ---------- tocar, arrastrar, la rueda y el teclado ----------
  escena.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    arrastre = { x: e.clientX, r: rot, v: 0, t: performance.now(), lx: e.clientX, movido: false, id: e.pointerId };
    anima();
  });
  // (lo que se escucha en toda la ventana se quita al cerrar la sección)
  const fuera = () => { if (G.isConnected) return false; removeEventListener('pointermove', mueve); removeEventListener('pointerup', suelta); removeEventListener('pointercancel', suelta); removeEventListener('keydown', tecla, true); return true; };
  const mueve = (e) => {
    if (fuera()) return;
    const a = arrastre; if (!a || e.pointerId !== a.id) return;
    const dx = e.clientX - a.x, w = T[0]?.offsetWidth || 220;
    if (Math.abs(dx) > 6 && !a.movido) { a.movido = true; try { escena.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ } }
    if (!a.movido) return;
    const now = performance.now(), ddt = Math.max(1, now - a.t);
    a.v = (e.clientX - a.lx) / ddt; a.lx = e.clientX; a.t = now;
    rot = a.r - dx / w * paso;
  };
  addEventListener('pointermove', mueve);
  const suelta = (e) => {
    if (fuera()) return;
    const a = arrastre; if (!a || (e && e.pointerId !== a.id)) return; arrastre = null;
    // (un toque sin arrastrar: en la de delante, su ficha; en otra, se gira hasta ella; fuera de las tarjetas, a un lado
    // de la de delante, la de ese lado)
    if (!a.movido) { const t = e?.target?.closest?.('.gal-t'), k = t ? T.indexOf(t) : -1;
      if (k >= 0 && k === frente) o.abre(t.dataset.gt); else if (k >= 0) aTarjeta(k);
      else if (e && frente >= 0) { const f = T[frente].getBoundingClientRect(); if (e.clientX > f.right) ve(1); else if (e.clientX < f.left) ve(-1); }
      anima(); return; }
    const w = T[0]?.offsetWidth || 220, lanza = -a.v * 220 / w * paso;   // (al soltar con impulso, sigue un poco)
    meta = Math.round((rot + Math.max(-paso * 2.5, Math.min(paso * 2.5, lanza))) / paso) * paso; o.sonido?.('click'); anima();
  };
  addEventListener('pointerup', suelta); addEventListener('pointercancel', suelta);
  // (el clic que acaba un arrastre no abre nada)
  escena.addEventListener('click', (e) => { e.stopPropagation(); }, true);
  let ruedaT = 0;
  escena.addEventListener('wheel', (e) => { e.preventDefault(); const now = performance.now(); if (now - ruedaT < 260) return; const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(d) < 4) return; ruedaT = now; ve(d > 0 ? 1 : -1); }, { passive: false });
  G.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gal], [data-gc], [data-gp]'); if (!b) return;
    if (b.dataset.gal) ve(+b.dataset.gal);
    else if (b.dataset.gc) comarca(cms.indexOf(b));
    else aPueblo(+b.dataset.gp);
  });
  const tecla = (e) => {
    if (fuera()) return;
    if (document.querySelector('.sheet') || e.target.closest?.('input, textarea, select')) return;
    const k = e.key, h = { ArrowLeft: -1, ArrowRight: 1 }[k], v = { ArrowUp: -1, ArrowDown: 1 }[k];
    // (Intro abre la ficha del de delante si no hay otro botón elegido)
    const enter = k === 'Enter' && frente >= 0 && (e.target === document.body || e.target.closest?.('.gal-t'));
    if (h) ve(h); else if (v) comarca(ci + v, v); else if (enter) o.abre(T[frente].dataset.gt); else return;
    e.preventDefault(); e.stopImmediatePropagation();
  };
  addEventListener('keydown', tecla, true);
  // (si cambia el tamaño, las tarjetas también: el radio se rehace)
  const ro = new ResizeObserver(() => { if (!G.isConnected) { ro.disconnect(); return; } mide(); pinta(); }); ro.observe(escena);
  monta(ci, 0);
  // (la pastilla de la comarca elegida se mide por el botón: cuando llegan las letras o cambia el ancho de la fila, se mide
  // otra vez; si no, se quedaba corrida unas comarcas más allá)
  const remide = () => { const b = cms[ci]; if (!b || !G.isConnected) return; b.classList.remove('on'); b.classList.add('on'); };
  document.fonts?.ready.then(remide);
  if (cms[0]) new ResizeObserver(() => { if (!G.isConnected) return; remide(); }).observe(cms[0].parentElement);
}
