// Instalar el juego como app (prototipo para enseñar): en la barra de arriba del menú, un botón «Instalar app» (en el
// móvil en vertical, donde no cabe, es la primera fila de «Más»).
//  · en Android y en el ordenador, con Chrome o Edge, abre el aviso del navegador para instalarla
//  · en el iPhone y el iPad, que no lo tienen, enseña los tres pasos de Safari para añadirla a la pantalla de inicio
//  · en los demás, cómo hacerlo desde el menú del navegador
// En la ventana también se puede compartir el enlace. No sale si ya se juega desde la app instalada ni en el archivo
// único (un archivo abierto no se puede instalar).
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; document.querySelectorAll('[data-app]').forEach(b => { b.hidden = false; }); });
addEventListener('appinstalled', () => { deferred = null; document.querySelectorAll('[data-app]').forEach(b => { b.hidden = true; }); });

const UA = navigator.userAgent;
const IOS = /iP(hone|ad|od)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
const ANDROID = /Android/.test(UA);
/** ¿Se está jugando desde la app instalada? */
export const installed = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
/** ¿Se puede ofrecer instalarla desde aquí? (en la web y sin estar ya instalada) */
export const offer = () => typeof __WEB__ !== 'undefined' && __WEB__ && !installed();
const link = () => new URL('./', location.href).href;

// los dibujos de los pasos: el botón Compartir de Safari, el de añadir a la pantalla de inicio, el menú de tres puntos
// y el de instalar de la barra de direcciones; el último paso, con el icono de la app tal cual sale en el móvil
const G = {
  share: '<path d="M24 6v24M15 15l9-9 9 9" /><path d="M14 22h-4v20h28V22h-4" />',
  add: '<rect x="7" y="7" width="34" height="34" rx="9" /><path d="M24 15v18M15 24h18" />',
  dots: '<circle cx="24" cy="11" r="3" fill="currentColor" stroke="none" /><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" /><circle cx="24" cy="37" r="3" fill="currentColor" stroke="none" />',
  inst: '<rect x="6" y="9" width="36" height="26" rx="4" /><path d="M24 15v12M18 22l6 6 6-6M16 41h16" />',
};
const ico = (k) => k === 'app' ? '<img src="./icon-180.png" alt="">' : `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${G[k]}</svg>`;
const STEPS = IOS ? [
  ['share', 'Toca Compartir', 'En la barra de Safari o en su menú ···'],
  ['add', 'Añadir a pantalla de inicio', 'Si no lo ves, desliza la lista hacia arriba'],
  ['app', 'Toca Añadir', 'El icono de Mendimendiz sale junto a tus apps'],
] : ANDROID ? [
  ['dots', 'Abre el menú del navegador', 'Los tres puntos, arriba a la derecha'],
  ['add', 'Instalar app', 'O «Añadir a pantalla de inicio»'],
  ['app', 'Ábrela desde su icono', 'Sale junto a tus apps, a pantalla completa'],
] : [
  ['inst', 'En Chrome o Edge', 'El botón de instalar, a la derecha de la barra de direcciones'],
  ['dots', 'En Safari del Mac', 'Menú Archivo y Añadir al Dock'],
  ['app', 'Ábrela como una app', 'En su propia ventana, sin barras del navegador'],
];

function sheet(root) {
  const s = document.createElement('div'); s.className = 'sheet more app-sheet';
  s.innerHTML = `<div class="more-in" role="dialog" aria-label="Instalar app"><div class="grab"></div><small class="kicker">Mendimendiz como app</small>
    <div class="ap-head"><span class="ap-ico">${ico('app')}</span><div><b>Instálala en tu pantalla de inicio</b><small>A pantalla completa, sin barras del navegador y también sin conexión</small></div></div>
    <ol class="ap-steps">${STEPS.map(([k, b, t], i) => `<li><span class="ap-n">${i + 1}</span><span class="ap-g${k === 'app' ? ' ap-me' : ''}">${ico(k)}</span><div><b>${b}</b><small>${t}</small></div></li>`).join('')}</ol>
    <div class="ap-row"><button type="button" class="btn ghost ap-share">${ico('share')}<span>Compartir el enlace</span></button><button type="button" class="btn primary ap-ok"><span>Listo</span></button></div></div>`;
  const close = () => { s.remove(); if (root.__hubSheet === s) root.__hubSheet = null; };
  s.addEventListener('click', (e) => { if (e.target === s) close(); });
  s.querySelector('.ap-ok').addEventListener('click', close);
  s.querySelector('.ap-share').addEventListener('click', async (e) => {
    const b = e.currentTarget, url = link();
    try { if (navigator.share) { await navigator.share({ title: 'MENDIMENDIZ', text: 'Explora los pueblos de Navarra jugando', url }); return; } } catch (err) { if (err?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); b.querySelector('span').textContent = 'Enlace copiado'; } catch (err) { b.querySelector('span').textContent = url; }
  });
  root.appendChild(s); root.__hubSheet = s;
}

/** Instalar: el aviso del navegador si lo hay; si no, la ventana con los pasos */
export async function openInstall(root) {
  if (deferred) {
    const d = deferred; deferred = null;
    try { d.prompt(); const c = await d.userChoice; if (c?.outcome === 'accepted') return; } catch (e) { /* sin aviso: los pasos */ return sheet(root); }
    return;
  }
  sheet(root);
}
/** El botón de la barra de arriba (se enseña si se puede instalar desde aquí) */
export function setupInstall(root, button) {
  if (!button) return;
  button.hidden = !offer();
  button.addEventListener('click', () => openInstall(root));
}
