// Idiomas: castellano y euskera.
// La interfaz está escrita en castellano; en euskera, un traductor vigila el documento y cambia
// cada texto (y aria-label, placeholder y title) por su versión en euskera: frases exactas y
// plantillas con huecos (nombres de pueblo, números…).
import { EU_EXACT, EU_RX } from './data/eu.js';

const KEY = 'mendimendiz-lang';
export function getLang() { try { return localStorage.getItem(KEY) || 'es'; } catch (e) { return 'es'; } }
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) { } location.reload(); }
export const isEU = () => getLang() === 'eu';

const cache = new Map();
export function tr(s) {
  if (!isEU() || !s) return s;
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
function walk(root) {
  if (root.nodeType === 3) { const t = tr(root.nodeValue); if (t !== root.nodeValue) root.nodeValue = t; return; }
  if (root.nodeType !== 1 || root.closest?.('script,style,svg text')) return;
  for (const a of ATTRS) { const v = root.getAttribute?.(a); if (v) { const t = tr(v); if (t !== v) root.setAttribute(a, t); } }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) {
    if (n.nodeType === 3) { const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
    else for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
  }
}
export function startI18n() {
  document.documentElement.lang = getLang();
  if (!isEU()) return;
  walk(document.body);
  new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') walk(m.target); else for (const n of m.addedNodes) walk(n); if (m.type === 'attributes') walk(m.target); } })
    .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
