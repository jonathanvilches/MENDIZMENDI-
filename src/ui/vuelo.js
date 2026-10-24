// Las llegadas: un vuelo de cámara y un cartel con el nombre del sitio (al entrar en un pueblo, al empezar un partido).
// La cámara recorre una curva suave por unos puntos mirando a lo largo de otra y acaba justo donde empieza lo que viene
// después; entre tramo y tramo, un corte. El tiempo es el del juego (dt con tope): en un móvil que va a tirones el vuelo
// dura más imágenes en vez de saltárselas. Se salta tocando la pantalla o con una tecla.
import * as THREE from 'three';
import { esc } from '../util/html.js';

const inOut = (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const out = (u) => 1 - Math.pow(1 - u, 2.4);

/**
 * follow: la cámara del juego (camera.js). tramos: [{ pts, looks, dur, fov, ease ('out' o 'inOut'), libre (sin la altura
 *  mínima sobre el suelo: el plano corto de detrás del jugador) }], puntos del mundo;
 * suelo(x, z): la altura del suelo (la cámara pasa como poco a «alto» metros, salvo al final, que es exacto);
 * onTramo(i) al empezar cada tramo, onT(k) con lo que va de vuelo (0 a 1). Acaba con la cámara quieta en el último punto
 * (follow.cinematic sigue puesto: quien llama decide qué viene después).
 */
export function vuelo(follow, tramos, { suelo = null, alto = 4, skip = true, onTramo = null, onT = null } = {}) {
  return new Promise((res) => {
    const cam = follow.cam, total = tramos.reduce((a, s) => a + s.dur, 0), p = new THREE.Vector3(), l = new THREE.Vector3();
    const segs = tramos.map((T, i) => ({ ...T, cp: new THREE.CatmullRomCurve3(T.pts, false, 'centripetal'), cl: new THREE.CatmullRomCurve3(T.looks, false, 'centripetal'), fov0: i ? tramos[i - 1].fov ?? cam.fov : cam.fov }));
    let cur = -1, ended = false, saltar = false;
    // (lo que salta el vuelo no le llega además al juego: ni abre la pausa ni empieza a andar)
    const onSkip = (e) => { saltar = true; e.stopImmediatePropagation(); if (e.type === 'keydown') e.preventDefault(); };
    const end = () => { if (ended) return; ended = true; removeEventListener('pointerdown', onSkip, true); removeEventListener('keydown', onSkip, true); clearInterval(guard); res(); };
    if (skip) { addEventListener('pointerdown', onSkip, true); addEventListener('keydown', onSkip, true); }
    // (si el juego deja de dibujar —otra ventana, el pueblo se rehace— o alguien quita el vuelo, no se queda esperando)
    let last = performance.now();
    const guard = setInterval(() => { if (follow.cinematic !== C || performance.now() - last > 8000) end(); }, 1000);
    const C = follow.cinematic = { t: 0, fly: (c, t) => {
      last = performance.now();
      if (saltar) { t = total; C.t = total; }
      let i = 0, t0 = 0; while (i < segs.length - 1 && t >= t0 + segs[i].dur) t0 += segs[i++].dur;
      const S = segs[i], u = Math.min(1, Math.max(0, (t - t0) / S.dur)), e = (S.ease === 'inOut' ? inOut : out)(u);
      if (i !== cur) { cur = i; onTramo?.(i); }
      S.cp.getPoint(e, p); S.cl.getPoint(e, l);
      // (sobre el terreno: un monte entre medias levanta la cámara; al final, nada, que el último punto es exacto)
      if (suelo && !S.libre && u < 1) { const g = suelo(p.x, p.z) + alto * Math.min(1, (1 - u) * 4); if (p.y < g) p.y = g; }
      c.position.copy(p); c.lookAt(l);
      if (S.fov) { const f = S.fov0 + (S.fov - S.fov0) * e; if (Math.abs(c.fov - f) > 0.01) { c.fov = f; c.updateProjectionMatrix(); } }
      onT?.(Math.min(1, t / total));
      if (t >= total) end();
    } };
  });
}

/**
 * El cartel de la llegada: arriba, en pequeño, de qué va (la comarca, la competición); el nombre en grande, letra a letra;
 * debajo, una línea. Con mapa ({ paths: [{ d, on, color }], pin: [x, y] }), el de Navarra con la comarca encendida.
 * Devuelve { close() } (se va con su animación).
 */
export function cartel({ kicker = '', title = '', sub = '', mapa = null, tono = '' } = {}) {
  const el = document.createElement('div'); el.className = `cartel ${tono}`.trim(); el.setAttribute('role', 'status');
  // (letra a letra, pero cada palabra entera: el nombre se parte solo entre palabras)
  let n = 0; const letras = String(title).split(' ').map(w => `<span class="w">${[...w].map(ch => `<span style="--i:${n++}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  const svg = mapa ? `<svg class="cartel-mapa" viewBox="10 10 725 780" aria-hidden="true">${mapa.paths.map(P => `<path d="${P.d}" class="${P.on ? 'on' : ''}"${P.on ? ` style="--c:${P.color}"` : ''}/>`).join('')}${mapa.pin ? `<g class="pin" transform="translate(${mapa.pin[0].toFixed(1)} ${mapa.pin[1].toFixed(1)})"><circle r="16"/><circle r="7"/></g>` : ''}</svg>` : '';
  el.innerHTML = `<div class="cartel-in">${svg}<div class="cartel-txt">${kicker ? `<small class="cartel-k">${esc(kicker)}</small>` : ''}<h2 class="cartel-t" aria-label="${esc(title)}" data-notr>${letras}</h2>${sub ? `<p class="cartel-s">${esc(sub)}</p>` : ''}</div></div>`;
  document.body.appendChild(el);
  let gone = false;
  return { el, close() { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 700); } };
}
