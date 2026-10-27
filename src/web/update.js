// Versión nueva publicada: la app instalada en el iPhone vuelve de segundo plano tal como estaba, sin pedir la página
// otra vez, así que podía seguir días con la versión de antes. Al volver a la app (y cada 10 minutos) se mira qué versión
// hay publicada; si el código principal ha cambiado:
//  · si se vuelve a la app estando en el menú, se carga la nueva al momento (el progreso ya está guardado)
//  · si no, sale un aviso en el menú para actualizar con un toque; en un pueblo o en un partido no sale: espera al menú
// (la página nueva se pide con ?v=…: así ni el navegador ni GitHub Pages sirven la copia guardada de la anterior; y no se
// recarga sola dos veces por la misma versión, por si aun así llegase la de antes)
const SRC = /assets\/(index-[\w-]+\.js)/;
const mine = () => (document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src') || '').match(SRC)?.[1];
let pub = null, note = null, last = 0;
const inMenu = () => { const h = document.getElementById('hub'); return !!h && !h.classList.contains('hidden') && !document.querySelector('.pvs, .lg-root, .mg-overlay'); };
const reload = () => location.replace(`./?v=${Date.now()}`);
function tried() { try { return sessionStorage.getItem('herrizherri-version') === pub; } catch (e) { return false; } }
function remember() { try { sessionStorage.setItem('herrizherri-version', pub); } catch (e) { /* sin almacenamiento */ } }
function show() {
  if (note || !inMenu()) return;
  note = document.createElement('button'); note.className = 'upd-note'; note.type = 'button';
  note.innerHTML = '<b>Versión nueva</b><span>Toca para actualizar</span>';
  note.addEventListener('click', () => { remember(); reload(); });
  if (!document.getElementById('upd-style')) {
    const st = document.createElement('style'); st.id = 'upd-style';
    st.textContent = `.upd-note{position:fixed;z-index:3000;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;min-height:44px;padding:8px 24px;border:0;border-radius:12px;background:linear-gradient(100deg,#ff2bd6 0%,#c21cff 55%,#7b2ff7 100%);color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45);animation:upd-in .3s ease-out both}
.upd-note b{font:400 var(--fs-lg,20px)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.02em}.upd-note span{font:800 var(--fs-xs,12px)/1.2 'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase}
@keyframes upd-in{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translateX(-50%)}}`;
    document.head.appendChild(st);
  }
  document.body.appendChild(note);
}
// back: se acaba de volver a la app
async function check(back = false) {
  if (!pub && Date.now() - last < 20000) return;   // (como mucho, una vez cada 20 s)
  if (!pub) {
    last = Date.now();
    const cur = mine(); if (!cur) return;
    try {
      const p = (await (await fetch(`./?v=${Date.now()}`, { cache: 'no-store' })).text()).match(SRC)?.[1];
      if (!p || p === cur) return;
      pub = p;
    } catch (e) { return; /* sin conexión: se mira la próxima vez */ }
  }
  if (back && inMenu() && !tried()) { remember(); reload(); return; }
  show();
}
/** Empieza a vigilar si hay versión nueva publicada (solo en la web) */
export function watchUpdates() {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(true); });
  // (y al volver a la página desde la memoria del navegador)
  addEventListener('pageshow', (e) => { if (e.persisted) check(true); });
  setInterval(() => check(), 10 * 60 * 1000);
  // (si ya se sabe que la hay, el aviso sale en cuanto se vuelva al menú)
  setInterval(() => { if (pub) show(); }, 3000);
  setTimeout(() => check(), 20000);
}
