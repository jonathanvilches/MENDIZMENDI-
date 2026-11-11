// La galería de los pueblos (sección Pueblos del menú): todos los pueblos de Navarra en una sola fila en 3D, comarca tras
// comarca, con la portada de cada uno, como una sala de pantallas. El de delante, grande y encendido, con su nombre, sus
// misiones y los botones de jugar y de ver su ficha; los demás, a los lados, más lejos y en penumbra, cada uno con el color
// de su comarca. Se pasa arrastrando, con las flechas, la rueda del ratón o el teclado (← →): al acabar los pueblos de una
// comarca siguen los de la siguiente, sin cortes, y arriba se enciende su pestaña. Las pestañas (o ↑ ↓) saltan al primer
// pueblo de cada comarca. Antes cada comarca era un carrusel suelto: al llegar al último pueblo había que volver arriba a
// elegir otra (noviembre de 2026). Todo con transformaciones 3D del navegador: va suelto también en el móvil, sin otro
// lienzo 3D encima del mapa.
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
  let ci = -1, T = [], N = 0, paso = 45, PU = [{ x: 0, z: 40, g: 0 }], VIS = 2;
  let rot = 0, meta = 0, frente = -1, raf = 0, last = 0, arrastre = null, saltando = false;
  // (los pueblos de cada comarca: desde qué tarjeta y cuántos; y la comarca de cada tarjeta)
  const R = [], deC = [];
  const tope = (v) => Math.max(0, Math.min((N - 1) * paso, v));

  // ---------- la fila entera: todas las comarcas, una detrás de otra ----------
  // (las portadas, sin cargar: cada una se pide cuando su tarjeta se acerca a la de delante, y se suelta al alejarse mucho;
  // con las cuarenta y tantas a la vez, en el móvil se iba la memoria)
  anillo.innerHTML = o.comarcas.map((c, i) => o.tarjetas(c.id).replace(/<img class="gt-img" src=/g, '<img class="gt-img" data-src=').replace(/<button type="button" class="gal-t"/g, `<button type="button" class="gal-t" data-ci="${i}" style="--c:${c.color}"`)).join('');
  T = [...anillo.querySelectorAll('.gal-t')]; N = T.length;
  T.forEach((t, k) => { const i = +t.dataset.ci; deC[k] = i; if (!R[i]) R[i] = { a: k, n: 0 }; R[i].n++; });
  G.classList.add('gal-fila');
  const foto = (t, ve) => { const im = t.querySelector('img.gt-img'); if (!im) return; if (ve && !im.getAttribute('src') && im.dataset.src) im.src = im.dataset.src; else if (!ve && im.getAttribute('src')) im.removeAttribute('src'); };

  // ---------- la comarca de delante: su pestaña, su color, sus puntos ----------
  function enComarca(i) {
    if (i === ci || !o.comarcas[i]) return;
    ci = i; const c = o.comarcas[i];
    G.style.setProperty('--c', c.color);
    cms.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    // (la comarca elegida, en medio de su fila; sin scrollIntoView, que también corría de lado la ventana de la sección)
    const fila = cms[i]?.parentElement, b = cms[i];
    if (fila && b) fila.scrollTo({ left: b.offsetLeft - (fila.clientWidth - b.offsetWidth) / 2, behavior: reduce() ? 'auto' : 'smooth' });
    puntos.innerHTML = Array.from({ length: R[i]?.n || 0 }, (_, k) => `<i data-gp="${k}"></i>`).join('');
  }
  // (el paso de una tarjeta a la siguiente y los puestos de cada lado, según el tamaño de la carta y el ancho)
  function mide() {
    // (la carta entera, con lo que se adelanta la de delante y lo que flota, dentro de su hueco: si no cabe de alto, más
    // estrecha. Con aire arriba y abajo, y abajo con sitio para los puntos, si se ven)
    const dh = parseFloat(getComputedStyle(G).getPropertyValue('--dh')) || 50, aire = puntos.offsetParent ? 28 : 10;
    G.style.setProperty('--gwmax', Math.max(140, ((escena.clientHeight - 2 * aire) / 1.05 - dh - 6) * 16 / 9) + 'px');
    const w = T[0]?.offsetWidth || 220;
    // (las cartas van una junto a otra, borde con borde, cada una más girada y más honda que la anterior, hasta llegar a
    // las flechas: profundidad sin huecos. Lo girada que va la primera de cada lado depende del sitio: la más girada que,
    // con dos o tres detrás, llene hasta las flechas, entre 28° y 48°. La perspectiva, proporcional a la carta)
    const W2 = escena.clientWidth / 2, P = Math.round(w * 2.6), gap = Math.max(8, w * 0.03), rad = Math.PI / 180;
    // (hasta las flechas; en el móvil de pie, donde la de delante casi llena el ancho, asoman por el borde)
    const lim = Math.max(W2 - 72, Math.min(W2 + 10, w * 0.72));
    escena.style.perspective = P + 'px';
    const pr = (x, z) => x * P / (P - z);
    // (los puestos de un lado con la primera girada g1: hasta 3, los que hagan falta para llegar a las flechas; si el
    // último se pasa, se mete por detrás del anterior, entero detrás de él)
    const cadena = (g1) => {
      const L = [], G3 = [g1, g1 + 12, g1 + 22]; let xi = w / 2 + gap, zi = 0, llega = 0;
      for (let k = 0; k < 3; k++) {
        const g = G3[k] * rad, c = Math.cos(g), sn = Math.sin(g), zo = zi - w * sn;
        let xo = xi + w * c; const sobra = xo - lim * (P - zo) / P; if (sobra > 0) xo -= sobra;
        L.push({ x: xo - w * c / 2, z: (zi + zo) / 2, g: G3[k] });
        if (!llega && pr(xo, zo) >= lim - 2) llega = k + 1;
        xi = xo + w * 0.015; zi = zo - w * 0.01;
      }
      return { L, llega };
    };
    let mejor = null;
    for (let g1 = 48; g1 >= 28; g1 -= 2) { mejor = cadena(g1); if (mejor.llega) break; }
    // (la de delante, adelantada lo justo para verse un 4 % más grande)
    PU = [{ x: 0, z: Math.round(P * 0.0385), g: 0 }, ...mejor.L]; VIS = mejor.llega || 3;
    // (el hueco a cada lado de la de delante, que se adelanta un 4 %: en el móvil de pie, las flechas van en medio de él)
    G.style.setProperty('--hueco', Math.max(0, (escena.clientWidth - w * 1.04) / 2) + 'px');
  }
  // (cada tarjeta, en su sitio: s, cuántos puestos se aparta de delante, sin cortes al pasar, entre un puesto y el
  // siguiente; las de los lados, más oscuras según se apartan, y pasado el último que hace falta para llenar, se apagan; la
  // de delante, encendida y algo adelantada)
  function pinta() {
    for (let k = 0; k < N; k++) {
      const s = (k * paso - rot) / paso, a = Math.abs(s), sg = Math.sign(s), t = T[k];
      if (a >= VIS + 0.6) { if (t.style.visibility !== 'hidden') t.style.visibility = 'hidden'; foto(t, a < VIS + 3); continue; }
      const i = Math.min(Math.floor(a), PU.length - 2), u = Math.min(1, a - i), A = PU[i], B = PU[i + 1];
      const x = sg * (A.x + (B.x - A.x) * u), z = A.z + (B.z - A.z) * u, g = sg * (A.g + (B.g - A.g) * u);
      t.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${g.toFixed(2)}deg)`;
      t.style.setProperty('--d', Math.min(1, a * 0.42).toFixed(3));
      t.style.setProperty('--o', (a <= VIS ? 1 : Math.max(0, (VIS + 0.6 - a) / 0.6)).toFixed(3));
      t.style.visibility = ''; foto(t, true);
    }
    const f = !N ? -1 : Math.max(0, Math.min(N - 1, Math.round(rot / paso)));
    if (f !== frente) {
      frente = f; T.forEach((t, k) => { t.classList.toggle('frente', k === f); t.tabIndex = k === f ? 0 : -1; t.setAttribute('aria-current', String(k === f)); });
      // (la flecha del lado donde ya no hay más, apagada: solo en el primer pueblo de todos y en el último)
      G.querySelectorAll('[data-gal]').forEach(b => { b.disabled = +b.dataset.gal < 0 ? f <= 0 : f >= N - 1; });
      if (f >= 0) {
        enComarca(deC[f]); const r = R[ci], k = f - r.a;
        puntos.querySelectorAll('i').forEach((p, j) => p.classList.toggle('on', j === k));
        info.innerHTML = o.info(T[f].dataset.gt, k, r.n); info.classList.remove('cambia'); void info.offsetWidth; info.classList.add('cambia');
      }
    }
  }
  // (el paso, con un muelle: llega rápido y se asienta sin rebotar)
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
  const ve = (k) => { const v = tope((Math.round(meta / paso) + k) * paso); if (v === meta) return; meta = v; o.sonido?.('click'); anima(); };
  // (a la tarjeta k: si está cerca, pasando; si está lejos, sin recorrer todas las de en medio: se apagan, se pasa y entran
  // las de allí desde su lado)
  function aTarjeta(k, sonido = 'click') {
    const cur = Math.round(meta / paso); k = Math.max(0, Math.min(N - 1, k)); if (k === cur && rot === meta) return;
    if (Math.abs(k - cur) <= 3 || reduce()) { meta = k * paso; o.sonido?.(sonido); anima(); return; }
    if (saltando) return; saltando = true; o.sonido?.('open');
    anillo.classList.add('sale');
    setTimeout(() => {
      const dir = Math.sign(k - cur); meta = k * paso; rot = meta - paso * 0.6 * dir;
      anillo.classList.remove('sale'); anillo.classList.add('entra'); setTimeout(() => anillo.classList.remove('entra'), 700);
      saltando = false; anima();
    }, 230);
  }
  // (una comarca: a su primer pueblo, o al que se pide)
  const comarca = (i) => { if (i < 0 || i >= o.comarcas.length || !R[i]) return; aTarjeta(R[i].a, 'open'); };

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
    // (pasado el primero o el último de todos, cuesta: se estira un poco y vuelve al soltar)
    const t0 = tope(rot); rot = t0 + (rot - t0) * 0.3;
  };
  addEventListener('pointermove', mueve);
  const suelta = (e) => {
    if (fuera()) return;
    const a = arrastre; if (!a || (e && e.pointerId !== a.id)) return; arrastre = null;
    // (un toque sin arrastrar: en la de delante, su ficha; en otra, se pasa hasta ella; fuera de las tarjetas, a un lado
    // de la de delante, la de ese lado)
    if (!a.movido) { const t = e?.target?.closest?.('.gal-t'), k = t ? T.indexOf(t) : -1;
      if (k >= 0 && k === frente) o.abre(t.dataset.gt); else if (k >= 0) aTarjeta(k);
      else if (e && frente >= 0) { const f = T[frente].getBoundingClientRect(); if (e.clientX > f.right) ve(1); else if (e.clientX < f.left) ve(-1); }
      anima(); return; }
    const w = T[0]?.offsetWidth || 220, lanza = -a.v * 220 / w * paso;   // (al soltar con impulso, sigue un poco)
    meta = tope(Math.round((rot + Math.max(-paso * 2.5, Math.min(paso * 2.5, lanza))) / paso) * paso); o.sonido?.('click'); anima();
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
    else if (R[ci]) aTarjeta(R[ci].a + +b.dataset.gp);
  });
  const tecla = (e) => {
    if (fuera()) return;
    // (escondida, con el menú detrás de un pueblo o de un partido, las flechas no son suyas: antes se quedaba con ellas y en
    // el ordenador el personaje no andaba con las flechas, solo con WASD)
    if (!G.getClientRects().length) return;
    if (document.querySelector('.sheet') || e.target.closest?.('input, textarea, select')) return;
    const k = e.key, h = { ArrowLeft: -1, ArrowRight: 1 }[k], v = { ArrowUp: -1, ArrowDown: 1 }[k];
    // (Intro abre la ficha del de delante si no hay otro botón elegido)
    const enter = k === 'Enter' && frente >= 0 && (e.target === document.body || e.target.closest?.('.gal-t'));
    if (h) ve(h); else if (v) comarca(ci + v); else if (enter) o.abre(T[frente].dataset.gt); else return;
    e.preventDefault(); e.stopImmediatePropagation();
  };
  addEventListener('keydown', tecla, true);
  // (si cambia el tamaño, las tarjetas también: los puestos se rehacen)
  const ro = new ResizeObserver(() => { if (!G.isConnected) { ro.disconnect(); return; } mide(); pinta(); }); ro.observe(escena);
  // (al entrar: el pueblo pedido, o el primero de la comarca pedida, ya delante)
  const i0 = Math.max(0, o.comarcas.findIndex(c => c.id === o.inicial)), j = o.pueblo ? T.findIndex(t => t.dataset.gt === o.pueblo) : -1;
  enComarca(i0); mide();
  rot = meta = (j >= 0 ? j : R[i0]?.a || 0) * paso;
  pinta(); anima();
  // (la pastilla de la comarca elegida se mide por el botón: cuando llegan las letras o cambia el ancho de la fila, se mide
  // otra vez; si no, se quedaba corrida unas comarcas más allá)
  const remide = () => { const b = cms[ci]; if (!b || !G.isConnected) return; b.classList.remove('on'); b.classList.add('on'); };
  document.fonts?.ready.then(remide);
  if (cms[0]) new ResizeObserver(() => { if (!G.isConnected) return; remide(); }).observe(cms[0].parentElement);
}
