// La tienda del pueblo (denda): un puesto con toldo a rayas, cajas de fruta y verdura y quien la atiende. Dentro,
// el producto estrella de la comarca (y su historia), comida para comprar con txanponak y el trueque: se cambian
// productos del campo y de la ganadería (leche, lana, huevos, trigo, patatas, maíz) por la comida que haga falta.
import * as THREE from 'three';
import { Actor } from '../actors/people.js';
import { addBox } from '../world/colliders.js';
import { groundHeight } from '../world/heightfield.js';
import { PLACES } from '../world/layout.js';
import { profile, saveProfile } from './profile.js';
import { FOOD } from '../data/equipo.js';
import { GOODS, STOCK, STAR, SHOPKEEPERS } from '../data/tiendas.js';
import { iconSVG } from '../ui/icons.js';
import { mergeByMaterial } from '../world/products3d.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function awningTex(c1, c2) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 32, 0, 32, 64); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 52, 256, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function signTex(town) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#3a2416'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#d8b25a'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#f4e6c8'; g.textAlign = 'center'; g.font = '900 46px Georgia, serif'; g.fillText('DENDA · TIENDA', 256, 62);
  g.font = 'italic 700 26px Georgia, serif'; g.fillText('Productos de ' + town, 256, 100);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class Tienda {
  constructor(game) {
    this.g = game; const d = game.def;
    this.star = STAR[d.comarca] || STAR.pamplona;
    const P = profile(); P.coins ??= 12; P.bag ||= { agua: 0, food: {} }; P.bag.goods ||= {};
    // sitio: junto al mercado o la plaza, en un hueco libre y llano
    const base = PLACES.market || PLACES.plaza, s = game.spot(base, 9);
    this.pos = { x: s.x, z: s.z }; this.y = groundHeight(s.x, s.z);
    const toPlaza = Math.atan2(PLACES.plaza.x - s.x, PLACES.plaza.z - s.z);
    this.ry = Math.abs(Math.hypot(PLACES.plaza.x - s.x, PLACES.plaza.z - s.z)) > 1 ? toPlaza : 0;
    this.build();
    // quien atiende, con el traje de su comarca
    const female = (d.id.length % 2) === 0, name = SHOPKEEPERS[d.id.length % SHOPKEEPERS.length];
    const ox = Math.sin(this.ry), oz = Math.cos(this.ry);
    this.keeper = new Actor({ id: 'tendero', name: `${name}, de la tienda`, x: s.x - ox * 1.1, z: s.z - oz * 1.1, heading: this.ry,
      look: { region: d.comarca, female, apron: '#f4f1ea', seed: d.id.length * 13 } }, game.scene);
    this.keeper.frozen = true; game.actors.push(this.keeper); this.keeper.shop = this;
  }
  // el puesto: mostrador, toldo, cajas con género y el cartel
  build() {
    const G = new THREE.Group(), y = this.y;
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.9 });
    const box = (w, h, d, x, yy, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, yy, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
    box(3.2, 1.0, 0.9, 0, 0.5, 0.2, wood);                       // mostrador
    box(3.3, 0.08, 1.0, 0, 1.02, 0.2, dark);
    for (const sx of [-1.55, 1.55]) for (const sz of [-0.6, 0.65]) box(0.1, 2.6, 0.1, sx, 1.3, sz, dark);   // postes
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.6), new THREE.MeshStandardMaterial({ map: this.awn = awningTex('#c8202a', '#f4efe2'), side: THREE.DoubleSide, roughness: 0.9 }));
    aw.position.set(0, 2.55, 0.25); aw.rotation.x = -Math.PI / 2 + 0.35; aw.castShadow = true; G.add(aw);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: this.signT = signTex(this.g.def.name.split(' /')[0]) }));
    sign.position.set(0, 2.05, 0.71); G.add(sign);
    // cajas con fruta, verdura, quesos y tarros
    const goods = [['#c8302a', 0.12], ['#e8b04a', 0.13], ['#6a9a3a', 0.12], ['#f1d9a0', 0.16], ['#7a3a8a', 0.1], ['#e07a2a', 0.12]];
    goods.forEach(([c, r], i) => {
      const x = -1.2 + i * 0.48, cr = box(0.42, 0.18, 0.34, x, 1.15, 0.3, wood);
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
      for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 8, 6), m); b.position.set(x + (k % 3 - 1) * 0.12, 1.28 + Math.floor(k / 3) * 0.06, 0.3 + (k % 2 - 0.5) * 0.12); G.add(b); }
    });
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 14), new THREE.MeshStandardMaterial({ color: '#efd9a0', roughness: 0.7 })); c.position.set(-1.3 + i * 0.25, 0.08 + 1.05, -0.45); G.add(c); }
    G.position.set(this.pos.x, y, this.pos.z); G.rotation.y = this.ry;
    // todo el puesto en pocas mallas (una por material): de unas 50 llamadas de dibujo a 8
    const M = mergeByMaterial(G); G.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    this.g.scene.add(M); this.obj = M;
    addBox(this.pos.x, this.pos.z, 1.7, 0.6, this.ry);
  }
  interactable() { const ox = Math.sin(this.ry), oz = Math.cos(this.ry); return { kind: 'shop', x: this.pos.x + ox * 1.2, z: this.pos.z + oz * 1.2, r: 3.2, label: 'Entrar en la tienda' }; }

  /** Dentro de la tienda: producto estrella, compra y trueque. */
  open() {
    const g = this.g, P = profile(), S = this.star, F = FOOD[S.food];
    const keeper = this.keeper.name.split(',')[0];
    return new Promise(res => {
      const prev = g.mode; g.mode = 'mini'; g.player.frozen = true;
      const o = document.createElement('div'); o.className = 'mg-overlay shop';
      let tab = 'star', said = `¡Egun on! Soy ${keeper}. ¿Conoces nuestro producto estrella? Es ${S.name.toLowerCase()}.`;
      const goods = () => Object.entries(P.bag.goods).filter(([k, n]) => n > 0 && GOODS[k]);
      const paint = () => {
        const stock = { [S.food]: STOCK[S.food] || 5, ...STOCK };
        o.innerHTML = `<div class="shop-room">
          <div class="shop-shelves" aria-hidden="true">${Object.keys(stock).slice(0, 8).map(k => `<i>${iconSVG(FOOD[k]?.icon || 'basket', 40)}</i>`).join('')}</div>
          <div class="shop-card">
            <header><div class="shop-keeper">${iconSVG('person', 46)}<b>${esc(keeper)}</b></div><div class="shop-bubble">${esc(said)}</div>
              <div class="shop-purse">${iconSVG('medal', 26)}<b>${P.coins}</b><small>txanpon</small></div></header>
            <nav><button data-tab="star" class="${tab === 'star' ? 'on' : ''}">Producto estrella</button><button data-tab="buy" class="${tab === 'buy' ? 'on' : ''}">Comprar</button><button data-tab="trade" class="${tab === 'trade' ? 'on' : ''}">Trueque</button></nav>
            <section>${tab === 'star' ? `<div class="shop-star">${iconSVG(F?.icon || 'basket', 120)}<div><small>Producto estrella de la comarca · ${esc(S.eu)}</small><h3>${esc(S.name)}</h3><p>${esc(S.text)}</p><button class="btn primary" data-buy="${S.food}">${iconSVG('medal', 20)} Comprar por ${STOCK[S.food] || 5}</button></div></div>`
              : tab === 'buy' ? `${P.coins < Math.min(...Object.values(stock)) ? `<div class="shop-broke"><p>No te llega para nada. En el pueblo siempre hay alguien que necesita ayuda con su oficio, y paga en txanponak.</p><button class="btn primary" data-job>${iconSVG('hand', 20)} ¿Dónde puedo trabajar?</button></div>` : ''}<div class="shop-grid">${Object.entries(stock).filter(([k]) => FOOD[k]).map(([k, p]) => `<button class="shop-item" data-buy="${k}" ${P.coins < p ? 'disabled' : ''}>${iconSVG(FOOD[k].icon, 46)}<b>${esc(FOOD[k].name)}</b><span>+${FOOD[k].e} energía</span><em>${iconSVG('medal', 16)} ${p}</em></button>`).join('')}</div>`
              : `<p class="shop-note">Trae lo que consigas ayudando en el campo y con el ganado, y cámbialo por comida.</p><div class="shop-grid">${goods().length ? goods().map(([k, n]) => `<button class="shop-item" data-sell="${k}">${iconSVG(GOODS[k].icon, 46)}<b>${esc(GOODS[k].name)} ×${n}</b><span>${esc(GOODS[k].from)}</span><em>vale ${GOODS[k].v}</em></button>`).join('') : `<p class="shop-note">No llevas nada para cambiar. Ayuda a la ganadera, al pastor o en la huerta: te darán leche, lana, huevos o patatas.</p>`}</div>`}</section>
            <footer><button class="btn" data-close>${iconSVG('back', 20)} Salir de la tienda</button></footer>
          </div></div>`;
      };
      paint();
      o.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.tab) { tab = b.dataset.tab; said = tab === 'trade' ? '¿Qué traes? Aquí todo se aprovecha: con la leche hacemos cuajada y queso, con la lana, abarcas y jerseys.' : tab === 'buy' ? 'Todo es de aquí, de los vecinos del valle.' : said; g.sound?.ui?.('click'); paint(); return; }
        if (b.dataset.job != null && g.jornales) { said = g.jornales.suggest(); g.sound?.ui?.('click'); paint(); setTimeout(() => o.querySelector('[data-close]')?.click(), 2600); return; }
        if (b.dataset.buy) {
          const k = b.dataset.buy, p = STOCK[k] || 5;
          if (P.coins < p) { said = 'Te faltan txanponak. Ayuda a algún vecino en su oficio, o haz un trueque con lo que traigas del campo.'; g.sound?.ui?.('error'); paint(); return; }
          P.coins -= p; g.mochila.addFood(k, 1); saveProfile(); said = `¡Que aproveche! ${FOOD[k].fact}`; g.sound?.ui?.('coin'); paint(); return;
        }
        if (b.dataset.sell) {
          const k = b.dataset.sell; P.bag.goods[k]--; if (!P.bag.goods[k]) delete P.bag.goods[k]; P.coins += GOODS[k].v; saveProfile();
          said = `¡Eskerrik asko! ${GOODS[k].name} a cambio de ${GOODS[k].v} txanpon. Ahora puedes llevarte comida.`; g.sound?.ui?.('coin'); tab = 'buy'; paint(); return;
        }
        if (b.hasAttribute('data-close')) { o.remove(); g.player.frozen = false; g.mode = prev === 'mini' ? 'play' : prev; g.mochila.paint?.(); res(); }
      });
      document.body.appendChild(o);
    });
  }
  // con hambre y sin comida, te indica dónde está la tienda
  hint() {
    const P = this.g.player.pos, dx = this.pos.x - P.x, dz = this.pos.z - P.z, d = Math.round(Math.hypot(dx, dz));
    const dirs = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
    const a = (Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2), dir = dirs[Math.round(a / (Math.PI / 4)) % 8];
    return `La tienda del pueblo está a ${d} m, hacia el ${dir}: compra comida o cámbiala por lo que traigas del campo.`;
  }
  dispose() { this.awn?.dispose(); this.signT?.dispose(); }
}
