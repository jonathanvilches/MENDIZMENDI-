// El vídeo de entrada al partido del campeonato: un tráiler corto (5 s, hecho con Higgsfield, Kling 3.0 Turbo, a partir de
// la imagen de la carta de pelota de Torneos) que sale nada más tocar «¡A jugar!», mientras se prepara el frontón, en vez
// de la pantalla borrosa de la carga. Se encienden los focos, se llena la grada y los dos pelotaris chocan el puño y se
// ponen en guardia. Al acabar (o al tocar la pantalla) se va con un fundido: si el frontón ya está listo, salen los
// pelotaris (game/llegadas.js espera al vídeo y quita el velo cuando la cámara del partido ya está puesta); si no, debajo
// queda la carga de siempre hasta que lo esté. El autor, 21 de noviembre de 2026: «el tráiler [...] viene justo
// antes de la escena de "Salen los pelotaris"». Sin sonido: sigue la música de los torneos. Como las láminas animadas, solo
// donde se pueden poner vídeos (ui/videos.js, puedenVideos); si no, o si falla, la carga de siempre.
import { puedenVideos } from '../ui/videos.js';

const URL = './videos/entrada-partido.mp4';
const CSS = `.ventrada{position:fixed;inset:0;z-index:950;background:#05030c;opacity:0;transition:opacity .3s ease;cursor:pointer}
.ventrada.on{opacity:1}.ventrada.fuera{opacity:0;transition:opacity .45s ease;pointer-events:none}
.ventrada video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}`;
let css = false;

/** Empieza el vídeo; devuelve { listo (promesa: ha acabado o se ha tocado), arrancado (promesa: ya suena, o falla, o
 *  1,5 s), quitar() } o null si aquí no hay vídeo. */
export function empiezaVideoEntrada() {
  try { if (!puedenVideos() || (navigator.webdriver && !window.__videoEntrada)) return null; } catch (e) { return null; }
  if (!css) { css = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const el = document.createElement('div'); el.className = 'ventrada'; el.setAttribute('aria-hidden', 'true');
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
  el.appendChild(v); document.body.appendChild(el);
  let hecho = false, fuera = false, avisa; const listo = new Promise(r => { avisa = r; });
  let ya; const arrancado = new Promise(r => { ya = r; }); setTimeout(() => ya(), 1500);   // (ha empezado a sonar, o falla, o 1,5 s)
  const acaba = () => { if (hecho) return; hecho = true; clearTimeout(tope); avisa(); };
  const quitar = () => {
    acaba(); ya(); if (fuera) return; fuera = true; clearTimeout(seguro); el.classList.add('fuera');
    setTimeout(() => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* nada */ } el.remove(); }, 500);
  };
  // (si no ha arrancado a los 4 s, o algo falla, la carga de siempre; en todo caso, nunca más de 8 s. Mientras se monta el
  // frontón el navegador va muy cargado y el aviso de que ya suena puede llegar tarde: si el vídeo ya avanza, se queda)
  const tope = setTimeout(acaba, 8000), seguro = setTimeout(() => quitar(), 15000);   // (y, pase lo que pase, a los 15 s fuera)
  const suena = () => !v.paused && !v.error && (v.currentTime > 0 || v.readyState >= 3);
  const arranca = setTimeout(() => { if (el.classList.contains('on')) return; if (suena()) el.classList.add('on'); else quitar(); }, 4000);
  v.addEventListener('playing', () => { clearTimeout(arranca); el.classList.add('on'); ya(); }, { once: true });
  v.addEventListener('timeupdate', () => { if (!el.classList.contains('on') && v.currentTime > 0) el.classList.add('on'); });
  // (al acabar, fuera con un fundido: si el frontón aún no está listo, debajo queda la carga de siempre hasta que lo esté)
  v.addEventListener('ended', quitar);
  v.addEventListener('error', quitar);
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); quitar(); });   // (tocar: fuera el vídeo)
  v.src = URL;
  v.play()?.catch?.(() => quitar());
  return { listo, arrancado, quitar, get hecho() { return hecho; } };
}
