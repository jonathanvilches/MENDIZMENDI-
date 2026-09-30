// Mapa interactivo del pueblo o del valle: se amplía con los dedos, la rueda o los botones, se arrastra
// y cada marca se puede tocar para ver qué es, seguir su misión o ir allí.
// Las marcas y los nombres se dibujan siempre al mismo tamaño y los nombres que chocarían se esconden
// hasta que se amplía el mapa.
import { HALF } from '../world/layout.js';
import { iconImage, iconSVG } from './icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SVG = {
  plus: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12h14" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
  me: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="6.2" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="12" cy="12" r="2.6" fill="#ff4f6d"/><path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
};
const hitsRect = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function pill(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

export function mountMapView(ui, box, opts = {}) {
  const game = ui.game, cv = box.querySelector('canvas'), g = cv.getContext('2d');
  box.insertAdjacentHTML('beforeend', `<div class="mapctl"><button data-z="in" aria-label="Ampliar">${SVG.plus}</button><button data-z="out" aria-label="Alejar">${SVG.minus}</button><button data-z="me" aria-label="Centrar en mí">${SVG.me}</button></div><div class="mapcard" hidden></div>`);
  const card = box.querySelector('.mapcard');
  let W = 0, H = 0, dpr = 1, raf = 0, sel = null, anim = null, hits = [];
  const v = { cx: 0, cz: 0, s: 1 };
  // el mapa siempre llena el recuadro (sin franjas vacías): lo mínimo es que quepa el lado más largo
  const minS = () => Math.max(W, H) / (2 * HALF), maxS = () => Math.max(minS() * 12, 7);
  const clampV = () => {
    v.s = Math.min(maxS(), Math.max(minS(), v.s));
    const hx = W / 2 / v.s, hz = H / 2 / v.s;
    v.cx = hx >= HALF ? 0 : Math.min(HALF - hx, Math.max(-HALF + hx, v.cx));
    v.cz = hz >= HALF ? 0 : Math.min(HALF - hz, Math.max(-HALF + hz, v.cz));
  };
  const toS = (x, z) => [W / 2 + (x - v.cx) * v.s, H / 2 + (z - v.cz) * v.s];
  const toW = (X, Y) => [v.cx + (X - W / 2) / v.s, v.cz + (Y - H / 2) / v.s];
  const zoomAt = (X, Y, f) => { const [wx, wz] = toW(X, Y); v.s *= f; clampV(); v.cx = wx - (X - W / 2) / v.s; v.cz = wz - (Y - H / 2) / v.s; clampV(); };

  // qué se dibuja: nombres de lugares y marcas de misión (sin repetir la misma marca dos veces)
  const collect = () => {
    const labels = (game.mapLabels ? game.mapLabels() : []).map(l => ({ ...l, pri: !l.icon ? 4 : l.act ? 2.5 : 2, go: l.go ?? true, title: l.title || l.label }));
    const out = [...labels];
    for (const m of game.mapMarkers()) {
      const twin = labels.find(l => l.icon === m.icon && (Math.hypot(l.x - m.x, l.z - m.z) < 16 || (m.fronton && l.fronton)));
      if (twin) { twin.act ||= m.act; twin.text ||= m.text; continue; }
      out.push({ ...m, pri: m.small ? 1 : 3 });
    }
    return out;
  };
  const target = () => { try { return game.kind === 'town' ? game.target() : game.questTarget(); } catch { return null; } };

  function draw() {
    raf = 0;
    if (!W || !H) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#20113f'; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const [x0, y0] = toS(-HALF, -HALF);
    g.drawImage(ui.mapBase || ui.mapImg, x0, y0, 2 * HALF * v.s, 2 * HALF * v.s);
    // casas en vector: nítidas a cualquier aumento
    g.fillStyle = '#b44a3a'; g.strokeStyle = 'rgba(70,24,16,.55)'; g.lineWidth = 1;
    for (const h of ui.mapHouseList || []) {
      const [X, Y] = toS(h.x, h.z); if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) continue;
      const w = (h.w || 8) * v.s, d = (h.d || 8) * v.s;
      g.save(); g.translate(X, Y); g.rotate(-(h.ry || 0)); g.fillRect(-w / 2, -d / 2, w, d); if (w > 6) g.strokeRect(-w / 2, -d / 2, w, d); g.restore();
    }
    const items = collect().sort((a, b) => b.pri - a.pri);
    const occ = [], P = game.player, [px, py] = toS(P.pos.x, P.pos.z);
    occ.push({ x: px - 14, y: py - 14, w: 28, h: 28 });
    const ctl = box.querySelector('.mapctl')?.getBoundingClientRect(), br = cv.getBoundingClientRect();
    if (ctl?.width) occ.push({ x: ctl.left - br.left - 4, y: ctl.top - br.top - 4, w: ctl.width + 8, h: ctl.height + 8 });
    hits = [];
    // 1) iconos: las misiones nunca se esconden (si se tapan, se separan un poco);
    //    un lugar cuyo icono choca con otro deja solo su nombre, y el icono vuelve al ampliar
    const placed = [];
    for (const it of items) {
      if (!it.icon) continue;
      let [X, Y] = toS(it.x, it.z); const r = it.small ? 11 : 15;
      if (X < -r || Y < -r || X > W + r || Y > H + r) continue;
      if (it.pri >= 3) {
        for (let k = 0; k < 6; k++) {
          const o = placed.find(p => Math.hypot(p.X - X, p.Y - Y) < p.r + r + 2); if (!o) break;
          const d = Math.hypot(X - o.X, Y - o.Y) || 1, need = o.r + r + 2 - d, ux = d > 1 ? (X - o.X) / d : 0.7, uy = d > 1 ? (Y - o.Y) / d : 0.7;
          X += ux * need; Y += uy * need;
        }
      } else if (placed.some(p => Math.hypot(p.X - X, p.Y - Y) < p.r + r + 2)) continue;
      placed.push({ it, X, Y, r }); occ.push({ x: X - r, y: Y - r, w: 2 * r, h: 2 * r });
    }
    const t = target(); let tS = null;
    if (t) { tS = toS(t.x, t.z); occ.push({ x: tS[0] - 12, y: tS[1] - 40, w: 24, h: 40 }); }
    // 2) nombres: junto a su icono (debajo, encima, a los lados o en diagonal); si no cabe, se esconde hasta ampliar
    const labs = [];
    for (const it of items) {
      if (!it.label) continue;
      const p = placed.find(p => p.it === it), big = !it.icon;
      const [X, Y] = p ? [p.X, p.Y] : toS(it.x, it.z), r = p ? p.r : it.icon ? 17 : 0;
      g.font = big ? '400 19px "Lilita One", Nunito, sans-serif' : '800 12.5px Nunito, sans-serif';
      const tw = g.measureText(it.label).width + (big ? 4 : 14), th = big ? 24 : 19;
      let cand;
      if (big) { cand = [[0, 0]]; for (const d of [22, 44, 66, 88]) cand.push([0, -d], [0, d], [-d, 0], [d, 0]); cand = cand.map(([dx, dy]) => [X - tw / 2 + dx, Y - th / 2 + dy]); }
      else cand = [[X - tw / 2, Y + r + 3], [X - tw / 2, Y - r - 3 - th], [X + r + 4, Y - th / 2], [X - r - 4 - tw, Y - th / 2],
        [X + r * 0.5, Y + r * 0.7], [X - r * 0.5 - tw, Y + r * 0.7], [X + r * 0.5, Y - r * 0.7 - th], [X - r * 0.5 - tw, Y - r * 0.7 - th]];
      const ok = cand.map(([x, y]) => ({ x, y, w: tw, h: th })).find(R => R.x >= 2 && R.y >= 2 && R.x + R.w <= W - 2 && R.y + R.h <= H - 2 && !occ.some(o => hitsRect(o, R)));
      if (!ok) continue;
      occ.push(ok); labs.push({ it, R: ok, big });
    }
    for (const { it, R, big } of labs) {
      if (big) {
        g.font = '400 19px "Lilita One", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 5; g.strokeStyle = 'rgba(28,11,58,.85)'; g.lineJoin = 'round'; g.strokeText(it.label, R.x + R.w / 2, R.y + R.h / 2 + 1);
        g.fillStyle = '#fff'; g.fillText(it.label, R.x + R.w / 2, R.y + R.h / 2 + 1);
      } else {
        g.fillStyle = it === sel ? '#FFD700' : 'rgba(255,250,240,.94)'; pill(g, R.x, R.y, R.w, R.h, R.h / 2); g.fill();
        g.strokeStyle = 'rgba(43,29,18,.45)'; g.lineWidth = 1; g.stroke();
        g.font = '800 12.5px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2b1d12';
        g.fillText(it.label, R.x + R.w / 2, R.y + R.h / 2 + 0.5);
      }
      hits.push({ it, kind: 'label', x: R.x, y: R.y, w: R.w, h: R.h });
    }
    for (const { it, X, Y, r } of placed) {
      if (it === sel) { g.fillStyle = 'rgba(255,215,0,.35)'; g.beginPath(); g.arc(X, Y, r + 7, 0, 7); g.fill(); g.strokeStyle = '#FFD700'; g.lineWidth = 2.5; g.stroke(); }
      ui.drawIcon(g, it.icon, X, Y, r);
      hits.push({ it, kind: 'icon', x: X - r - 6, y: Y - r - 6, w: 2 * r + 12, h: 2 * r + 12 });
    }
    // objetivo seguido: chincheta dorada
    if (tS) {
      const im = iconImage('pin');
      g.fillStyle = 'rgba(255,215,0,.35)'; g.beginPath(); g.ellipse(tS[0], tS[1], 9, 4, 0, 0, 7); g.fill();
      if (im.complete && im.naturalWidth) g.drawImage(im, tS[0] - 15, tS[1] - 32, 30, 30);
    }
    ui.drawPlayer(g, px, py, P.heading, 1.25);
    // regla de escala
    const m = [10, 20, 50, 100, 200, 500].find(m => m * v.s >= 60) || 500, L = m * v.s;
    g.fillStyle = 'rgba(20,10,40,.6)'; pill(g, 8, H - 26, L + 52, 18, 9); g.fill();
    g.fillStyle = '#fff'; g.fillRect(16, H - 18, L, 3); g.fillRect(16, H - 22, 2, 9); g.fillRect(16 + L - 2, H - 22, 2, 9);
    g.font = '800 11px Nunito, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`${m} m`, 22 + L, H - 16.5);
  }
  const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };

  // tarjeta de información de la marca tocada
  function select(it) {
    sel = it; redraw();
    if (!it) { card.hidden = true; return; }
    const tracked = it.act === 'track' && (game.kind === 'town' ? game.tracked === it.id : game.state?.tracked === it.id);
    const btn = [];
    if (it.act === 'track') btn.push(tracked ? `<span class="mc-on">${iconSVG('check', 18)} Siguiendo</span>` : `<button class="btn primary" data-a="track">${iconSVG('pin', 20)} Seguir</button>`);
    if (it.go) btn.push(`<button class="btn" data-a="go">${iconSVG('footprint', 20)} Llévame</button>`);
    card.innerHTML = `<div class="mc-i">${iconSVG(it.icon || 'home', 34)}</div><div class="mc-t"><b>${esc(it.title || it.label)}</b>${it.text ? `<small>${esc(it.text)}</small>` : ''}</div><div class="mc-b">${btn.join('')}</div><button class="mc-x" aria-label="Cerrar">${SVG.plus.replace('M12 5v14M5 12h14', 'M7 7l10 10M17 7L7 17')}</button>`;
    card.hidden = false;
    card.querySelector('.mc-x').onclick = () => select(null);
    card.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      ui.sound?.ui('click');
      const a = b.dataset.a;
      if (a === 'track') { game.mapAct?.('track', it); select(it); return; }
      ui.closeModal(); game.mapAct?.(a, it);
    });
  }

  // gestos: arrastrar, pellizcar, rueda y doble toque
  const pts = new Map(); let down = null, pinch = null, lastTap = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cv.setPointerCapture?.(e.pointerId); anim = null;
    const p = pos(e); pts.set(e.pointerId, p);
    if (pts.size === 1) down = { ...p, moved: false }; else if (down) down.moved = true;
    pinch = null;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e), prev = pts.get(e.pointerId); pts.set(e.pointerId, p);
    if (pts.size === 1) {
      if (down && Math.hypot(p.x - down.x, p.y - down.y) > 7) down.moved = true;
      if (down?.moved) { v.cx -= (p.x - prev.x) / v.s; v.cz -= (p.y - prev.y) / v.s; clampV(); redraw(); }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinch) { v.cx -= (mid.x - pinch.mid.x) / v.s; v.cz -= (mid.y - pinch.mid.y) / v.s; zoomAt(mid.x, mid.y, d / pinch.d); redraw(); }
      pinch = { d, mid };
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId); pinch = null;
    if (e.type !== 'pointerup' || pts.size || !down || down.moved) { if (!pts.size) down = null; return; }
    const p = pos(e), now = performance.now();
    const h = [...hits].reverse().find(h => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);
    if (h) { ui.sound?.ui('click'); select(h.it); lastTap = null; }
    else if (lastTap && now - lastTap.t < 350 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) { zoomTo(p.x, p.y, 2); lastTap = null; }
    else { if (sel) select(null); lastTap = { ...p, t: now }; }
    down = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); zoomAt(p.x, p.y, Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004)); redraw(); }, { passive: false });
  cv.addEventListener('dblclick', (e) => e.preventDefault());
  // Safari en iPhone: que el pellizco amplíe el mapa y no la página
  for (const ev of ['gesturestart', 'gesturechange']) box.addEventListener(ev, (e) => e.preventDefault());
  // zoom animado para los botones y el doble toque
  function zoomTo(X, Y, f, cx, cz) {
    const s0 = v.s, c0 = { x: v.cx, z: v.cz }, [wx, wz] = toW(X, Y);
    const s1 = Math.min(maxS(), Math.max(minS(), s0 * f));
    const t0 = performance.now(), me = anim = {};
    const step = (now) => {
      if (anim !== me) return;
      const k = Math.min(1, (now - t0) / 220), e = 1 - (1 - k) ** 3;
      v.s = s0 * (s1 / s0) ** e;
      if (cx != null) { v.cx = c0.x + (cx - c0.x) * e; v.cz = c0.z + (cz - c0.z) * e; }
      else { v.cx = wx - (X - W / 2) / v.s; v.cz = wz - (Y - H / 2) / v.s; }
      clampV(); draw();
      if (k < 1) requestAnimationFrame(step); else anim = null;
    };
    requestAnimationFrame(step);
  }
  box.querySelectorAll('.mapctl button').forEach(b => b.onclick = () => {
    ui.sound?.ui('click');
    const z = b.dataset.z;
    if (z === 'in') zoomTo(W / 2, H / 2, 1.7); else if (z === 'out') zoomTo(W / 2, H / 2, 1 / 1.7);
    else zoomTo(W / 2, H / 2, Math.max(1, 1.6 / v.s), game.player.pos.x, game.player.pos.z);
  });

  // encuadre inicial: el pueblo (o el valle) y el jugador, ampliados lo justo
  function fit() {
    const all = collect(), P = game.player.pos;
    const near = all.filter(i => Math.hypot(i.x - P.x, i.z - P.z) < (opts.fitRadius || 260));
    const xs = [P.x, ...near.map(i => i.x)], zs = [P.z, ...near.map(i => i.z)];
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    v.cx = (x0 + x1) / 2; v.cz = (z0 + z1) / 2;
    v.s = Math.min((W - Math.min(90, W * 0.2)) / Math.max(60, x1 - x0), (H - Math.min(110, H * 0.22)) / Math.max(60, z1 - z0));
    clampV();
  }
  let fitted = false;
  const resize = () => {
    const r = box.getBoundingClientRect(); if (!r.width || !r.height) return;
    const [wx, wz] = fitted ? [v.cx, v.cz] : [0, 0];
    W = r.width; H = r.height; dpr = Math.min(3, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (!fitted) { fitted = true; fit(); } else { v.cx = wx; v.cz = wz; clampV(); }
    draw();
  };
  const ro = new ResizeObserver(resize); ro.observe(box);
  resize();
  // los iconos se cargan como imágenes: se redibuja cuando llegan
  const late = setTimeout(redraw, 150), late2 = setTimeout(redraw, 700);
  return { destroy() { ro.disconnect(); clearTimeout(late); clearTimeout(late2); cancelAnimationFrame(raf); anim = null; }, view: v, select, redraw, get hits() { return hits; } };
}
