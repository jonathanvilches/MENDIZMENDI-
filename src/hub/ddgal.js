// La galería del material didáctico: como la de Naturaleza, pestañas por apartado y, en cada una, una tarjeta por cosa
// (su ilustración o, si aún no la tiene, su icono grande sobre su color), con el nombre en grande y su rótulo encima.
// Al tocarla se abre su ficha, con el texto repartido en pestañas (Qué es, Cómo se hace, Antes y ahora, Dónde…): así
// cada cosa tiene su sitio y se lee bien, también en una pantalla grande. Antes todo el texto iba seguido en la página.
// Cada cosa: { k, img, fit (la imagen es un recorte sin fondo: entera), icon, c (su color), kicker, title, eu, sub,
// secs: [[pestaña, html]], towns: [ids] }
import { iconSVG } from '../ui/icons.js';
import { infoCard } from '../ui/escudo.js';
import { levelById } from '../data/levels.js';
import { esc } from '../util/html.js';

const I = (n, s = 24) => iconSVG(n, s);
const tn = (id) => (levelById(id)?.name || id || '').split(' /')[0];

// (en el móvil las pestañas van en una fila que se desplaza: se trae a la vista la elegida, que puede quedar al final)
const pestanas = (hub, scr) => {
  const f = hub.root.querySelector('.dd-tabs'), on = f?.querySelector('.on');
  f?.querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); hub.go(scr, b.dataset.f); });
  // (y otra vez al cargar la letra estrecha de las pestañas: con la de reserva, más ancha, se pasaba de largo)
  const centra = () => { if (!on?.isConnected || f.scrollWidth <= f.clientWidth) return; const a = on.getBoundingClientRect(), r = f.getBoundingClientRect(); f.scrollLeft += a.left + a.width / 2 - (r.left + r.width / 2); };
  centra(); document.fonts?.ready.then(centra);
};

// (locked: aún por descubrir jugando: la imagen apagada con el candado y, debajo, dónde se descubre)
const card = (it) => `<button type="button" class="ddc${it.img ? (it.fit ? ' fit' : '') : ' sin-img'}${it.locked ? ' locked' : ''}" data-dd="${esc(it.k)}" style="--c:${it.c || '#c21cff'}">
  <span class="ddc-pic">${it.img ? `<img src="${it.img}" alt="" loading="lazy" decoding="async">` : I(it.icon || 'star', 128)}${it.locked ? `<span class="ddc-lock">${I('lock', 34)}</span>` : ''}</span>
  <span class="ddc-txt">${it.kicker ? `<small>${esc(it.kicker)}</small>` : ''}<b>${esc(it.title)}</b>${it.locked ? `<i class="ddc-pista">${esc(it.pista || 'Por descubrir')}</i>` : it.eu ? `<i data-notr lang="eu">${esc(it.eu)}</i>` : it.sub ? `<i>${esc(it.sub)}</i>` : ''}</span></button>`;

/** La página: cabecera, pestañas (los apartados con algo) y las tarjetas del apartado elegido. hub: el menú. */
export function galeria(hub, scr, tab, head, grupos) {
  const G = grupos.filter(g => g.items.length), cur = G.find(g => g.k === tab) || G[0];
  const porK = new Map(cur.items.map(it => [it.k, it]));
  hub.after = () => {
    pestanas(hub, scr);
    hub.root.querySelectorAll('.ddc[data-dd]').forEach(c => c.onclick = (e) => { e.stopPropagation(); ficha(hub, porK.get(c.dataset.dd)); });
  };
  return `<section class="armorial dd ddg">${head}
    ${G.length > 1 ? `<div class="filters dd-tabs" role="tablist">${G.map(g => `<button data-f="${g.k}" class="${g === cur ? 'on' : ''}" role="tab" aria-selected="${g === cur}">${I(g.icon, 26)}<span>${esc(g.name)}</span><small>${g.items.length}</small></button>`).join('')}</div>` : ''}
    ${cur.intro ? `<p class="dd-intro">${esc(cur.intro)}</p>` : ''}
    <div class="ddc-grid">${cur.items.map(card).join('')}</div>${cur.after || ''}</section>`;
}

/** La ficha de una cosa: su imagen (o su icono), el título y el texto en pestañas; «Dónde» lleva a sus pueblos. */
export function ficha(hub, it) {
  if (!it) return;
  const ui = { sound: hub.sound };
  // (la que falta por descubrir: solo cómo se descubre y sus pueblos, con el candado en vez de la imagen)
  const secs = it.locked ? [['Cómo descubrirla', `<p>${esc(it.pista || '')}</p>`]] : it.secs.filter(s => s && s[1]);
  if (it.towns?.length) secs.push(['Dónde', `<p class="dd-where dd-where-f">${it.towns.map(id => `<button type="button" class="lnk" data-town="${id}">${I('pin', 20)}${esc(tn(id))}</button>`).join('')}</p>`]);
  const img = it.locked ? '' : it.img || '';
  infoCard(ui, { kicker: it.locked ? `Por descubrir · ${it.kicker || ''}` : it.kicker || '', title: it.title, sub: it.locked ? '' : it.eu || it.sub || '', image: img, wide: !!img,
    media: img ? '' : `<span class="ddf-ico" style="--c:${it.c || '#c21cff'}">${I(it.locked ? 'lock' : it.icon || 'star', 240)}</span>`, secs });
  // (los enlaces de dentro: a un pueblo, a la ficha de una figura o de un animal; la ficha se cierra y se va allí)
  const o = ui.modal; if (!o) return;
  o.classList.add('ddf');
  o.addEventListener('click', (e) => {
    const t = e.target.closest('[data-town],[data-figura],[data-ficha]'); if (!t) return;
    e.stopPropagation(); o.querySelector('.next')?.click();
    setTimeout(() => { const c = hub.root.appendChild(t.cloneNode(true)); c.hidden = true; c.click(); c.remove(); }, 280);   // (lo atiende el menú, como cualquier enlace suyo)
  });
}

// las palabras en euskera, por temas: cada una, una tarjeta con su imagen (o su icono), la palabra en euskera en grande y
// en castellano debajo; las conversaciones, como bocadillos: lo que dice el vecino a un lado y lo que contestas al otro.
// Cada palabra: { eu, es, d (para qué sirve), img, fit, icon }; un tema con chat: { chats: [[[eu, es], …], …] }
const palabra = (w) => `<div class="ddw${w.img ? (w.fit ? ' fit' : '') : ' sin-img'}${Math.max(...w.eu.split(/\s+/).map(x => x.length)) > 11 ? ' largo' : ''}"><span class="ddw-pic">${w.img ? `<img src="${w.img}" alt="" loading="lazy" decoding="async">` : I(w.icon || 'talk', 88)}</span>
  <span class="ddw-txt"><b data-notr lang="eu">${esc(w.eu)}</b><i data-notr lang="es">${esc(w.es)}</i>${w.d ? `<small>${esc(w.d)}</small>` : ''}</span></div>`;
const charla = (c) => `<div class="ddch">${c.map(([eu, es], i) => `<p class="ddch-b ${i % 2 ? 'tu' : 'el'}"><b data-notr lang="eu">${esc(eu)}</b><i data-notr lang="es">${esc(es)}</i></p>`).join('')}</div>`;
export function palabras(hub, scr, tab, head, grupos) {
  const G = grupos.filter(g => g.items?.length || g.chats?.length), cur = G.find(g => g.k === tab) || G[0];
  hub.after = () => pestanas(hub, scr);
  return `<section class="armorial dd ddg">${head}
    <div class="filters dd-tabs" role="tablist">${G.map(g => `<button data-f="${g.k}" class="${g === cur ? 'on' : ''}" role="tab" aria-selected="${g === cur}">${I(g.icon, 26)}<span>${esc(g.name)}</span><small>${(g.items || g.chats).length}</small></button>`).join('')}</div>
    ${cur.intro ? `<p class="dd-intro">${esc(cur.intro)}</p>` : ''}
    ${cur.chats ? `<div class="ddch-grid">${cur.chats.map(charla).join('')}</div>` : `<div class="ddw-grid">${cur.items.map(palabra).join('')}</div>`}</section>`;
}
