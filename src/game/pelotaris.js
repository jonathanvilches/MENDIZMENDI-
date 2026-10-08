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
import face from '../assets/meshy/portraits/pelotari_rojo_vs.webp?url';

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
.pc-head{display:flex;align-items:center;gap:12px}.pc-head h2{margin:0;font:400 var(--fs-xl)/1.15 'Lilita One',Nunito,sans-serif}
.pc-head small{display:block;color:#ffd84a;font-weight:900;font-size:var(--fs-xs);letter-spacing:.04em;text-transform:uppercase}
.pc-count{margin-left:auto;font:900 var(--fs-md)/1.15 Nunito,sans-serif;color:#2a1a00;background:linear-gradient(180deg,#ffe98a,#e0b020);border-radius:12px;padding:8px 12px;white-space:nowrap}
.pc-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.pc-tabs::-webkit-scrollbar{display:none}
.pc-tabs button{flex:none;min-height:44px;padding:4px 12px;border-radius:999px;border:1px solid rgba(255,215,0,.35);background:rgba(255,255,255,.06);color:#fff;font:800 var(--fs-sm)/1.15 Nunito,sans-serif;cursor:pointer;white-space:nowrap}
.pc-tabs button i{font-style:normal;margin-left:4px;color:#FFD700}.pc-tabs button[aria-selected=true]{background:#FFD700;border-color:#FFD700;color:#2a1640}.pc-tabs button[aria-selected=true] i{color:#2a1640}
.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}
.pc-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:44px;padding:8px 8px 8px;border-radius:14px;border:1px solid rgba(255,106,74,.5);background:linear-gradient(180deg,rgba(224,71,58,.28),rgba(94,17,13,.35));color:#fff;font:inherit;text-align:center;cursor:pointer}
.pc-card img{width:64px;height:64px;object-fit:cover;object-position:50% 8%;border-radius:50%;background:radial-gradient(circle at 50% 35%,#e0473a,#7a1a14);border:2px solid rgba(255,255,255,.7)}
.pc-card b{font-size:var(--fs-sm);font-weight:900;line-height:1.3;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-card small{font-size:var(--fs-xs);font-weight:700;line-height:1.3;color:#f3d9d4}.pc-card em{font-style:normal;font-size:var(--fs-xs);font-weight:900;line-height:1.3;color:#FFD700}
.pc-card.locked{border-style:dashed;border-color:rgba(190,160,255,.35);background:rgba(255,255,255,.04);cursor:default}
.pc-card.locked img{filter:brightness(0);opacity:.45;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}
.pc-card.locked small{color:#cbbcf0}
.pc-lock{position:absolute;top:44px;left:50%;transform:translateX(-50%);width:24px;height:24px}
.pc-note{margin:0;font-size:var(--fs-xs);line-height:1.3;color:#cbbcf0}
@media (orientation:landscape) and (max-height:500px){.pc-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}.pc-card img{width:56px;height:56px}.pc-lock{top:36px}}
`;
const LOCK = '<svg class="pc-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="#FFD700"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#FFD700" stroke-width="2.4"/><circle cx="12" cy="15.5" r="1.6" fill="#2a1640"/></svg>';

/** La colección, encima de lo que haya (el menú de pelota); start: la comarca que se abre primero. Promesa al cerrar */
export function pelotarisPanel(start = null) {
  if (!document.getElementById('pc-css')) { const st = document.createElement('style'); st.id = 'pc-css'; st.textContent = CSS; document.head.appendChild(st); }
  const C = profile().pelotaris || {}, towns = pelotaTowns(), eu = isEU();
  const groups = COMARCAS.map(c => ({ c, towns: towns.filter(l => l.comarca === c.id) })).filter(g => g.towns.length);
  let cur = Math.max(0, groups.findIndex(g => g.c.id === start));
  const { have, total } = pelotarisCount();
  return new Promise(res => {
    const card = (l) => { const p = C[l.id];
      return p ? `<button class="pc-card" data-t="${l.id}"><img src="${face}" alt=""><b>${esc(p.name)}</b><small>${esc(short(l.name))}</small><em>${p.won} G · ${p.lost} P</em></button>`
        : `<div class="pc-card locked" aria-label="${esc(eu ? 'Ezezaguna' : 'Por descubrir')}"><img src="${face}" alt="">${LOCK}<b>?</b><small>${esc(short(l.name))}</small><em>${eu ? 'Jokatu bere frontoian' : 'Juega en su frontón'}</em></div>`; };
    const grid = () => groups[cur].towns.map(card).join('');
    const tabs = () => groups.map((g, i) => `<button role="tab" data-g="${i}" aria-selected="${i === cur}">${esc(g.c.name)}<i>${g.towns.filter(l => C[l.id]).length}/${g.towns.length}</i></button>`).join('');
    const r = lgPanel(`<div class="pc-head"><div><small>${eu ? 'Bilduma' : 'Colección'}</small><h2>${eu ? 'Nafarroako pilotariak' : 'Pelotaris de Navarra'}</h2></div><span class="pc-count">${have}/${total}</span></div>
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
