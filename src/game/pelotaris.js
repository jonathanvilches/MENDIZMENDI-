// Colección de pelotaris: uno por pueblo. En cuanto juegas contra el pelotari de un pueblo (en su frontón, en una misión
// o en el torneo de la comarca) queda su carta: su nombre, sus cualidades y cómo te ha ido contra él. Los que aún no
// conoces salen en silueta con un candado y el nombre de su pueblo, para saber dónde buscarlos. Las cartas van por
// comarcas (una pestaña por comarca) para que quepan sin desplazar en el móvil tumbado. Los pelotaris son inventados.
import { LEVELS } from '../data/levels.js';
import COMARCAS from '../data/comarcas.json';
import { profile, saveProfile } from './profile.js';
import { openFicha } from '../pelota/ficha.js';
import { isEU } from '../i18n.js';
import { lgPanel, lgEsc as esc } from '../futbol/liga.js';
import { pelotariCard } from '../ui/sportCard.js';

// los pueblos con partido de pelota (el valle de Salazar va con su peloteo, sin rival)
export const pelotaTowns = () => LEVELS.filter(l => !l.special);
const short = (n) => String(n || '').split(' /')[0];

/** Apunta al pelotari de un pueblo: town { id, name }, p { name, stats }; win: true/false (el resultado) o null (sin acabar) */
export function meetPelotari(town, p, win = null) {
  if (!town?.id || !p?.name) return;
  const P = profile(), C = (P.pelotaris ||= {});
  const st = p.stats ? { fuerza: p.stats.fuerza, agilidad: p.stats.agilidad, velocidad: p.stats.velocidad, style: p.stats.style || null } : null;
  const c = C[town.id] ||= { name: p.name, town: short(town.name), won: 0, lost: 0, first: Date.now() };
  c.name = p.name; c.town = short(town.name) || c.town; if (st) c.stats = st;
  if (win === true) c.won++; else if (win === false) c.lost++;
  c.last = Date.now(); saveProfile();
}
export function pelotarisCount() { const C = profile().pelotaris || {}, all = pelotaTowns(); return { have: all.filter(l => C[l.id]).length, total: all.length }; }

const CSS = `
.pc-head{display:flex;align-items:center;gap:12px}.pc-head small+h2{margin-top:var(--t-mt)}.pc-head h2{margin:0;font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.5)}
.pc-head small{display:block;color:var(--rosa);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
.pc-count{margin-left:auto;display:flex;flex-direction:column;align-items:center;font:400 var(--fs-2xl)/1 var(--f-display);color:#fff;background:var(--cta);padding:4px 14px;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);box-shadow:var(--glow)}
.pc-count small{font:800 var(--fs-xs)/1 var(--f-cond);letter-spacing:.1em;color:#fff}
.pc-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.pc-tabs::-webkit-scrollbar{display:none}
.pc-tabs button{flex:none;min-height:44px;padding:4px 14px;border:1px solid rgba(201,178,255,.3);background:rgba(255,255,255,.05);color:#fff;font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;cursor:pointer;white-space:nowrap;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
.pc-tabs button i{font-style:normal;margin-left:6px;color:var(--rosa)}.pc-tabs button[aria-selected=true]{background:var(--cta);border-color:transparent}.pc-tabs button[aria-selected=true] i{color:#fff}
.pc-grid{display:flex;gap:12px;overflow-x:auto;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent);overscroll-behavior-x:contain;scrollbar-width:none;padding:8px 4px 4px;min-height:0}.pc-grid::-webkit-scrollbar{display:none}
.pc-it{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px}
.pc-it button.gx-card{border:0;padding:0;background:none;cursor:pointer;font:inherit}.pc-it .gx-card.lock{cursor:default}
.pc-it em{font:800 var(--fs-xs)/1.3 var(--f-cond);font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:var(--rosa)}.pc-it em.l{color:var(--lila2)}
.pc-lock{position:absolute;z-index:2;left:50%;top:30%;transform:translate(-50%,-50%);width:28px;height:28px}
.pc-note{margin:0;font-size:var(--fs-xs);line-height:1.3;color:var(--lila2)}
@media (orientation:landscape) and (max-height:500px){.pc-note{display:none}.pc-head h2{font-size:var(--fs-xl)}}
`;
const LOCK = '<svg class="pc-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="#ff7ac8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#ff7ac8" stroke-width="2.4"/><circle cx="12" cy="15.5" r="1.6" fill="#2a0638"/></svg>';

/** La colección, encima de lo que haya (el menú de pelota); start: la comarca que se abre primero. Promesa al cerrar */
export function pelotarisPanel(start = null) {
  if (!document.getElementById('pc-css')) { const st = document.createElement('style'); st.id = 'pc-css'; st.textContent = CSS; document.head.appendChild(st); }
  const C = profile().pelotaris || {}, towns = pelotaTowns(), eu = isEU();
  const groups = COMARCAS.map(c => ({ c, towns: towns.filter(l => l.comarca === c.id) })).filter(g => g.towns.length);
  let cur = Math.max(0, groups.findIndex(g => g.c.id === start));
  const { have, total } = pelotarisCount();
  return new Promise(res => {
    const card = (l, i) => { const p = C[l.id], w = innerHeight < 500 && innerWidth > innerHeight ? 112 : 128, tw = short(l.name);
      return p ? `<div class="pc-it">${pelotariCard({ name: p.name, town: tw, stats: p.stats, side: 'rojo', w, tag: 'button', attr: `data-t="${l.id}"`, pop: true, d: i * 0.05, lang: eu ? 'eu' : 'es' })}<em>${p.won} G · ${p.lost} P</em></div>`
        : `<div class="pc-it" aria-label="${esc(eu ? 'Ezezaguna' : 'Por descubrir')}">${pelotariCard({ name: '?', town: tw, side: 'rojo', w, lock: true, pop: true, d: i * 0.05, lang: eu ? 'eu' : 'es' }).replace('<span class="gx-ovr">', LOCK + '<span class="gx-ovr">')}<em class="l">${eu ? 'Jokatu bere frontoian' : 'Juega en su frontón'}</em></div>`; };
    const grid = () => groups[cur].towns.map((l, i) => card(l, i)).join('');
    const tabs = () => groups.map((g, i) => `<button role="tab" data-g="${i}" aria-selected="${i === cur}">${esc(g.c.name)}<i>${g.towns.filter(l => C[l.id]).length}/${g.towns.length}</i></button>`).join('');
    const r = lgPanel(`<div class="pc-head"><div><small>${eu ? 'Bilduma' : 'Colección'}</small><h2>${eu ? 'Nafarroako pilotariak' : 'Pelotaris de Navarra'}</h2></div><span class="pc-count">${have}/${total}<small>${eu ? 'AURKITUAK' : 'DESCUBIERTOS'}</small></span></div>
      <div class="pc-tabs" role="tablist">${tabs()}</div><div class="pc-grid" role="tabpanel">${grid()}</div>
      <p class="pc-note">${eu ? 'Herri bakoitzeko pilotari bat. Asmatutako pilotariak eta datuak.' : 'Un pelotari por pueblo: juega contra él y queda su carta. Pelotaris y datos inventados para el juego.'}</p>
      <div class="lg-btns lg-foot"><button class="lg-btn go" data-a="close">${eu ? 'Itxi' : 'Cerrar'}</button></div>`);
    r.classList.add('pc-root');
    requestAnimationFrame(() => r.querySelector('.pc-tabs [aria-selected=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' }));
    const close = () => { removeEventListener('keydown', key, true); r.remove(); res(); };
    const key = (e) => { if (document.querySelector('.pfx')) return; if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); } };
    addEventListener('keydown', key, true);
    r.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.g) { cur = +b.dataset.g; r.querySelector('.pc-tabs').innerHTML = tabs(); r.querySelector('.pc-grid').innerHTML = grid(); return; }
      if (b.dataset.t) { const p = C[b.dataset.t]; if (p) await openFicha([{ id: 'c', name: p.name, town: p.town, stats: p.stats, side: 'rival', role: 'mano' }], 0, eu ? 'eu' : 'es', r); }
    });
  });
}
