// Idiomas: castellano y euskera.
// La interfaz está escrita en castellano; en euskera, un traductor vigila el documento y cambia
// cada texto (y aria-label, placeholder y title) por su versión en euskera: frases exactas y
// plantillas con huecos (nombres de pueblo, números…).
import { EU_EXACT, EU_RX } from './data/eu.js';

const KEY = 'mendimendiz-lang';
export function getLang() { try { return localStorage.getItem(KEY) || 'es'; } catch (e) { return 'es'; } }
/** ¿Ha elegido ya idioma? (la primera vez se pregunta antes de nada) */
export function langChosen() { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } }
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) { } location.reload(); }
// «Aprende euskera»: el juego en euskera con un botón para ver al momento el texto en castellano
export const isLearn = () => getLang() === 'learn';
export const isEU = () => getLang() === 'eu' || isLearn();
let peek = false;                 // mientras se mira la traducción, el traductor no toca nada
const ORIG = new WeakMap();       // nodo de texto → su texto original en castellano

const cache = new Map();
export function tr(s) {
  if (!isEU() || !s || peek) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
  if (!core) return s;
  if (cache.has(core)) return lead + cache.get(core) + trail;
  let out = EU_EXACT[core];
  if (out == null) for (const [rx, rep] of EU_RX) { if (rx.test(core)) { out = core.replace(rx, (...m) => typeof rep === 'function' ? rep(...m) : rep.replace(/\$(\d)/g, (_, i) => EU_EXACT[m[i]] ?? m[i])); break; } }
  if (out == null) out = core;
  if (cache.size < 5000) cache.set(core, out);
  return lead + out + trail;
}
const ATTRS = ['aria-label', 'placeholder', 'title'];
const setText = (n) => { const v = n.nodeValue, t = tr(v); if (t !== v) { ORIG.set(n, v); n.nodeValue = t; } };
function walk(root) {
  if (peek) return;
  if (root.nodeType === 3) { setText(root); return; }
  if (root.nodeType !== 1 || root.closest?.('script,style,svg text')) return;
  for (const a of ATTRS) { const v = root.getAttribute?.(a); if (v) { const t = tr(v); if (t !== v) root.setAttribute(a, t); } }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) {
    if (n.nodeType === 3) setText(n);
    else for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
  }
}
/** Muestra unos segundos el castellano de todo lo que hay en pantalla (y luego vuelve al euskera). */
export function peekSpanish(on) {
  if (on === peek) return;
  if (on) {
    peek = true;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (ORIG.has(n)) n.nodeValue = ORIG.get(n);
  } else { peek = false; walk(document.body); }
}
function learnButton() {
  const b = document.createElement('button'); b.className = 'learn-btn'; b.type = 'button';
  b.innerHTML = '<b>ES</b><small>Itzuli</small>'; b.title = 'Ver en castellano';
  let t = 0, timer = null;
  const off = () => { peekSpanish(false); b.classList.remove('on'); b.innerHTML = '<b>ES</b><small>Itzuli</small>'; clearInterval(timer); };
  b.onclick = (e) => { e.stopPropagation(); if (b.classList.contains('on')) return off();
    b.classList.add('on'); peekSpanish(true); t = 6; b.innerHTML = `<b>EU</b><small>${t} s</small>`;
    clearInterval(timer); timer = setInterval(() => { t--; if (t <= 0) off(); else b.innerHTML = `<b>EU</b><small>${t} s</small>`; }, 1000); };
  document.body.appendChild(b);
}
export function startI18n() {
  document.documentElement.lang = isEU() ? 'eu' : 'es';
  if (!isEU()) return;
  if (isLearn()) learnButton();
  walk(document.body);
  new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') walk(m.target); else for (const n of m.addedNodes) walk(n); if (m.type === 'attributes') walk(m.target); } })
    .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
