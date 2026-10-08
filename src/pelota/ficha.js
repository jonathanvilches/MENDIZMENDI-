// Ficha técnica de un pelotari: una tarjeta que se abre desde el partido (antes de empezar, desde el marcador y en la
// pausa) y desde el cuadro del torneo, con una pestaña por cada pelotari del partido.
//  · quién es: pueblo, puesto, edad, altura, peso, mano buena, año y frontón del debut, partidos, victorias y txapelas;
//  · cómo juega: sus cualidades (correr, potencia y manos, de 1 a 5), sus golpes preferidos y cómo jugarle.
// Los pelotaris del juego son inventados: sus datos salen de su nombre y de su pueblo (siempre los mismos para el mismo
// pelotari, como sus cualidades) y van con ellas: el que pega fuerte es más alto y pesa más; el rápido, más ligero.
// La tuya no lleva datos inventados: tus cualidades, tu pueblo y lo que has ganado en el juego.
import { SHOTS, TEXT, statsTips, pelotariRating } from './rules.js';

const L = {
  es: { title: 'Ficha del pelotari', close: 'Cerrar', you: 'Tú', yours: 'Tu ficha', town: 'Pueblo', role: 'Puesto', age: 'Edad', height: 'Altura', weight: 'Peso',
    hand: 'Mano', debut: 'Debut', played: 'Partidos', won: 'Victorias', txapelas: 'Txapelas', skills: 'Cualidades', shots: 'Golpes preferidos', how: 'Cómo jugarle',
    yourHow: 'Cómo jugar', years: (n) => `${n} años`, right: 'Derecha', left: 'Izquierda', single: 'Manomanista', front: 'Delantero', back: 'Zaguero',
    any: 'Todos por igual', none: 'Aún ninguna', winsHere: 'Partidos ganados', blue: 'Azul', red: 'Colorado', yourTip: 'Equilibrado: corres, pegas y colocas igual de bien. Busca el punto flojo del rival en su ficha.', invented: 'Pelotari y datos inventados para el juego.' },
  eu: { title: 'Pilotariaren fitxa', close: 'Itxi', you: 'Zu', yours: 'Zure fitxa', town: 'Herria', role: 'Postua', age: 'Adina', height: 'Altuera', weight: 'Pisua',
    hand: 'Eskua', debut: 'Estreinaldia', played: 'Partidak', won: 'Garaipenak', txapelas: 'Txapelak', skills: 'Ezaugarriak', shots: 'Kolpe gogokoenak', how: 'Nola jokatu haren aurka',
    yourHow: 'Nola jokatu', years: (n) => `${n} urte`, right: 'Eskuina', left: 'Ezkerra', single: 'Buruz burukoa', front: 'Aurrelaria', back: 'Atzelaria',
    any: 'Denak berdin', none: 'Bat ere ez oraindik', winsHere: 'Irabazitako partidak', blue: 'Urdina', red: 'Gorria', yourTip: 'Orekatua: berdin korrika egin, jo eta kokatzen duzu. Bilatu aurkariaren alde ahula bere fitxan.', invented: 'Jokorako asmatutako pilotaria eta datuak.' },
};
const YEAR = new Date().getFullYear();
// (el mismo generador que las cualidades: una semilla de texto da siempre los mismos números)
function rng(seed) {
  let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
/** Datos de un pelotari inventado: { age, height (cm), weight (kg), left, debut, played, won, txapelas }. */
export function pelotariBio(name, st = {}, town = '') {
  const r = rng(`ficha ${name} ${town}`), f = st.fuerza || 3, v = st.velocidad || 3, a = st.agilidad || 3;
  const age = 19 + Math.floor(r() * 14);                                                  // de 19 a 32 años
  const height = Math.round(171 + f * 3 + r() * 7 - (v >= 4 ? 3 : 0));                    // de 1,71 a 1,93 m
  const weight = Math.round((21.5 + f * 0.7 - v * 0.35 + r() * 1.2) * (height / 100) ** 2); // de unos 65 a 95 kg
  const debut = YEAR - Math.max(1, age - (18 + Math.floor(r() * 3)));                     // a los 18, 19 o 20 años
  const q = (f + v + a) / 15, played = Math.max(6, (YEAR - debut) * (14 + Math.floor(r() * 12)));
  const won = Math.round(played * Math.min(0.8, 0.28 + 0.45 * q + (r() - 0.5) * 0.08));
  const txapelas = q < 0.55 ? 0 : Math.floor(r() * (q > 0.75 ? 5 : 3));
  return { age, height, weight, left: r() < 0.12, debut, played, won, txapelas };
}

const esc = (x) => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const initials = (n) => String(n).replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
// el pueblo, si viene en el nombre como en el torneo («Mikel (Lesaka)»)
export const splitName = (n) => { const m = String(n).match(/^(.*?)\s*\(([^)]+)\)\s*$/); return m ? { name: m[1], town: m[2] } : { name: String(n), town: '' }; };

/**
 * Lo que sale en la ficha de cada pelotari. p = { name, town, stats, side: 'you'|'rival', role: 'mano'|'delantero'|'zaguero',
 * you: true para la tuya, record: { won, txapelas } (la tuya) }
 */
function card(p, lang) {
  const T = L[lang] || L.es, PT = (TEXT[lang] || TEXT.es).profile || TEXT.es.profile, st = p.stats || { fuerza: 3, agilidad: 3, velocidad: 3 }, sty = st.style || {};
  const { name, town: t0 } = splitName(p.name), town = p.town || t0;
  const role = p.role === 'delantero' ? T.front : p.role === 'zaguero' ? T.back : T.single;
  const fav = SHOTS.filter(k => sty[k] > 0).sort((a, b) => sty[b] - sty[a]), top = fav[0];
  const kind = p.you ? '' : [top && sty[top] >= 3 ? PT.arch[top] : '', st.velocidad >= 4 ? PT.fast : st.velocidad <= 2 ? PT.slow : '', st.fuerza >= 4 ? PT.strong : ''].filter(Boolean).join(' · ');
  let data;
  if (p.you) {
    const R = p.record || {};
    data = [[T.town, town || '—'], [T.winsHere, String(R.won ?? 0)], [T.txapelas, R.txapelas ? String(R.txapelas) : T.none]];
  } else {
    const B = pelotariBio(name, st, town), m = (B.height / 100).toFixed(2).replace('.', lang === 'eu' ? ',' : ',');
    // (el puesto ya va en la cabecera; el debut, en su pueblo)
    data = [[T.town, town || '—'], [T.age, T.years(B.age)], [T.height, `${m} m`], [T.weight, `${B.weight} kg`], [T.hand, B.left ? T.left : T.right],
      [T.debut, String(B.debut)], [T.played, String(B.played)], [T.won, `${B.won} · ${Math.round(100 * B.won / B.played)} %`], [T.txapelas, String(B.txapelas)]];
  }
  const bar = (k, v) => `<div class="pfx-bar"><span>${k}</span><i aria-hidden="true">${[1, 2, 3, 4, 5].map(n => `<u class="${n <= v ? 'on' : ''}"></u>`).join('')}</i><b>${v}</b></div>`;
  const shots = fav.length ? fav.map(k => `<li>${PT.names[k]}<i aria-label="${sty[k]}">${'★'.repeat(sty[k])}</i></li>`).join('') : `<li>${T.any}</li>`;
  // (un solo consejo: de qué tener cuidado o, si no hay, cómo ganarle)
  const warn = !p.you && top && sty[top] >= 3 ? PT.warn[top] : '', tip = warn ? '' : p.you ? T.yourTip : statsTips(st, lang)[0] || '';
  // (la media, como en las cartas del torneo y de la colección: la misma cifra en todas partes)
  const ovr = pelotariRating(st, `${name} ${town}`, p.you ? 2 + (p.record?.txapelas || 0) * 2 : 0).ovr, PT2 = TEXT[lang] || TEXT.es;
  return `<section class="pfx-id">
      <div class="pfx-head"><span class="pfx-av ${p.side === 'rival' ? 'red' : 'blue'}" aria-hidden="true"><b>${ovr}</b><small>${esc(PT2.ovr || 'Media')}</small></span>
        <div><small>${esc(p.you ? T.yours : `${p.side === 'rival' ? T.red : T.blue} · ${role}`)}</small><h3>${esc(name)}</h3>${kind ? `<span class="pfx-k">${esc(kind)}</span>` : ''}</div></div>
      <dl class="pfx-data">${data.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.you ? '' : `<p class="pfx-note">${T.invented}</p>`}
    </section>
    <section class="pfx-sk">
      <h4>${T.skills}</h4>${bar(PT.run, st.velocidad)}${bar(PT.power, st.fuerza)}${bar(PT.hands, st.agilidad)}
      <h4>${T.shots}</h4><ul class="pfx-shots">${shots}</ul>
      ${warn || tip ? `<h4>${p.you ? T.yourHow : T.how}</h4><p class="pfx-tip">${warn ? `<strong>${warn}</strong> ` : ''}${tip}</p>` : ''}
    </section>`;
}

const CSS = `
.pfx{position:fixed;inset:0;z-index:30010;display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 12px) calc(env(safe-area-inset-right,0px) + 16px) calc(env(safe-area-inset-bottom,0px) + 12px) calc(env(safe-area-inset-left,0px) + 16px);background:rgba(10,4,24,.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;font-family:Nunito,system-ui,sans-serif;color:#f6f3fc;animation:pfxIn .18s ease-out}
@keyframes pfxIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
.pfx-card{position:relative;width:min(760px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:16px 20px 20px;border-radius:4px;background:radial-gradient(80% 60% at 100% 0%,rgba(255,43,214,.22),transparent 60%),linear-gradient(170deg,#31106b 0%,#12052a 75%);border:1px solid rgba(201,178,255,.25);box-shadow:0 24px 72px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px);animation:gx-pop .4s cubic-bezier(.2,1.4,.4,1) both}
.pfx-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:var(--cta);box-shadow:var(--glow)}
.pfx-top{display:flex;align-items:center;gap:12px}
.pfx-top>small{flex:1;font-size:var(--fs-xs);font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#cbbcf0}
.pfx-tabs{flex:1;display:flex;gap:8px;min-width:0;overflow-x:auto}
.pfx-tabs button{flex:0 0 auto;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid rgba(190,160,255,.35);background:rgba(255,255,255,.06);color:#fff;font:900 var(--fs-sm)/1 Nunito,system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px}
.pfx-tabs button i{width:8px;height:8px;border-radius:50%;background:#5b4bff}.pfx-tabs button i.red{background:#ff2e88}
.pfx-tabs button[aria-selected=true]{background:var(--cta);border-color:transparent}
.pfx-x{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);display:grid;place-items:center;cursor:pointer}
.pfx-x svg{width:20px;height:20px}
.pfx-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px 24px}
@media (max-width:600px){.pfx-body{grid-template-columns:1fr}}
.pfx-head{display:flex;align-items:center;gap:12px;margin:0 0 12px}
.pfx-av{flex:none;min-width:66px;height:62px;padding:0 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}.pfx-av b{font:400 var(--fs-3xl)/.9 var(--f-display)}.pfx-av small{font:800 var(--fs-xs)/1.2 var(--f-cond)!important;letter-spacing:.1em!important;text-transform:uppercase;color:#fff!important}
.pfx-av.blue{background:linear-gradient(160deg,#7b6bff,#3121b0)}.pfx-av.red{background:linear-gradient(160deg,#ff5fae,#a8135f)}
.pfx-head small{display:block;font:800 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa)}
.pfx-head h3{margin:0;font:400 var(--fs-2xl)/1.05 var(--f-display);text-transform:uppercase;color:#fff}
.pfx-k{display:block;font-size:var(--fs-sm);font-weight:800;color:#e6def7;line-height:1.3}
.pfx-data{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}
.pfx-data div{padding:6px 12px;border-radius:2px;background:rgba(255,255,255,.05);border-left:3px solid var(--fx);min-width:0}
.pfx-data dt{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;color:var(--lila)}
.pfx-data dd{margin:0;font:400 var(--fs-lg)/1.2 var(--f-display);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfx-sk h4{margin:0 0 8px;font-size:var(--fs-xs);font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#cbbcf0;line-height:1.3}
.pfx-sk h4:not(:first-child){margin-top:12px}
.pfx-bar{display:grid;grid-template-columns:88px 1fr 20px;align-items:center;gap:12px;min-height:28px;font-size:var(--fs-sm);font-weight:800}
.pfx-bar i{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;transform:skewX(-20deg)}.pfx-bar u{height:10px;border-radius:1px;background:rgba(255,255,255,.12)}.pfx-bar u.on{background:var(--cta);box-shadow:0 0 8px rgba(255,43,214,.5)}
.pfx-bar b{text-align:right;color:#fff;font:400 var(--fs-lg)/1 var(--f-display)}
.pfx-shots{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.pfx-shots li{padding:4px 12px;border-radius:999px;background:rgba(255,122,200,.1);border:1px solid rgba(255,122,200,.35);font-size:var(--fs-sm);font-weight:800;line-height:1.45;display:flex;gap:4px;align-items:center}
.pfx-shots li i{font-style:normal;color:#ff7ac8;letter-spacing:.1em}
.pfx-tip{margin:0;font-size:var(--fs-sm);line-height:1.45;color:#e6def7}
.pfx-note{margin:8px 0 0;font-size:var(--fs-xs);line-height:1.3;color:#cbbcf0}.pfx-tip strong{color:#ffb9a8}
/* tarjeta de un pelotari (en el partido y en el torneo): al tocarla se abre su ficha */
.pfx-pl{display:flex;align-items:center;gap:8px;min-width:0;min-height:48px;padding:4px 8px 4px 4px;border-radius:12px;border:1px solid rgba(190,160,255,.35);background:rgba(255,255,255,.06);color:#fff;text-align:left;font:inherit;cursor:pointer}
.pfx-pl.blue{border-color:rgba(74,163,255,.55)}.pfx-pl.red{border-color:rgba(255,106,74,.55)}.pfx-pl:active{transform:translateY(1px)}
.pfx-pl-av{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-family:'MZ Display',Nunito,sans-serif;font-weight:400;font-size:var(--fs-md);line-height:1;color:#fff;letter-spacing:.04em;border:2px solid rgba(255,255,255,.7)}
.pfx-pl.blue .pfx-pl-av{background:linear-gradient(180deg,#2a6fe0,#17419e)}.pfx-pl.red .pfx-pl-av{background:linear-gradient(180deg,#d9412a,#9c1f17)}
.pfx-pl-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.pfx-pl-t b{font-size:var(--fs-md);font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfx-pl-t small{font-size:var(--fs-xs);font-weight:800;color:#e6def7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfx-pl-go{flex:none;padding:4px 8px;border-radius:999px;background:rgba(255,122,200,.14);border:1px solid rgba(255,122,200,.5);color:#ff7ac8;font-size:var(--fs-xs);font-weight:900;letter-spacing:.04em;text-transform:uppercase;line-height:1.3}
@media (max-width:520px){.pfx-pl-go{display:none}}
@media (orientation:landscape) and (max-height:500px){.pfx-card{padding:12px 16px 16px;gap:8px}.pfx-head{margin-bottom:8px}.pfx-av{width:48px;height:48px}.pfx-data div{padding:4px 8px}.pfx-data dd{font-size:var(--fs-sm)}.pfx-bar{min-height:24px}.pfx-sk h4:not(:first-child){margin-top:8px}.pfx-shots{gap:4px}.pfx-shots li{padding:0 8px}}
`;

/**
 * Abre la ficha. list: los pelotaris del partido (ver card); i: el que se ve primero. Devuelve una promesa que se cumple
 * al cerrarla (con Escape, la X o tocando fuera).
 */
export function fichaCss() { if (!document.getElementById('pfx-style')) { const s = document.createElement('style'); s.id = 'pfx-style'; s.textContent = CSS; document.head.appendChild(s); } }
/** Tarjeta de un pelotari (p como en la ficha, con id): iniciales, nombre, lo que más se le nota y «Ficha». */
export function playerChip(p, lang = 'es', attr = 'data-pel-ficha') {
  fichaCss();
  const T = TEXT[lang] || TEXT.es, PT = T.profile || TEXT.es.profile, st = p.stats || {}, sty = st.style || {}, top = SHOTS.filter(k => sty[k] >= 3)[0], { name } = splitName(p.name);
  const kind = p.you ? (T.vsYou || 'Tú') : [top ? PT.arch[top] : '', st.velocidad >= 4 ? PT.fast : st.velocidad <= 2 ? PT.slow : '', st.fuerza >= 4 ? PT.strong : ''].filter(Boolean).join(' · ') || (T.vsEven || 'Equilibrado');
  return `<button class="pfx-pl ${p.side === 'rival' ? 'red' : 'blue'}" ${attr}="${esc(p.id)}"><span class="pfx-pl-av" aria-hidden="true">${esc(initials(name))}</span><span class="pfx-pl-t"><b>${esc(name)}</b><small>${esc(kind)}</small></span><span class="pfx-pl-go">${T.ficha || 'Ficha'}</span></button>`;
}
export function openFicha(list, i = 0, lang = 'es', host = document.body) {
  fichaCss();
  const T = L[lang] || L.es;
  document.querySelector('.pfx')?.remove();
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'pfx'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    let cur = Math.max(0, Math.min(list.length - 1, i));
    const draw = () => {
      const p = list[cur], nm = splitName(p.name).name;
      o.setAttribute('aria-label', `${T.title}: ${nm}`);
      o.innerHTML = `<div class="pfx-card"><div class="pfx-top">${list.length > 1 ? `<div class="pfx-tabs" role="tablist">${list.map((q, k) => `<button role="tab" aria-selected="${k === cur}" data-k="${k}"><i class="${q.side === 'rival' ? 'red' : ''}"></i>${esc(q.you ? T.you : splitName(q.name).name)}</button>`).join('')}</div>` : `<small>${T.title}</small>`}
        <button class="pfx-x" aria-label="${T.close}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button></div>
        <div class="pfx-body">${card(p, lang)}</div></div>`;
    };
    const close = () => { removeEventListener('keydown', onKey, true); o.remove(); res(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } else if (/^Arrow(Left|Right)$/.test(e.key) && list.length > 1) { e.stopPropagation(); cur = (cur + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length; draw(); } };
    o.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === o || e.target.closest('.pfx-x')) return close();
      const t = e.target.closest('[data-k]'); if (t) { cur = +t.dataset.k; draw(); }
    });
    for (const ev of ['pointerdown', 'touchstart']) o.addEventListener(ev, (e) => e.stopPropagation());   // (que no llegue al joystick ni a los botones del partido)
    addEventListener('keydown', onKey, true);
    draw(); host.appendChild(o);
    o.querySelector('.pfx-x')?.focus?.({ preventScroll: true });
  });
}
