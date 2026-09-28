// Interfaz: carga, título, HUD, diálogos, cuaderno, mapa, menú, premios, prismáticos y minijuegos
import { RIBBONS, QUESTS, CARDS, SPECIES_OBS, EGUZKILORES } from './game/content.js';
import { HALF, CELL, N, PATHS, PLACES, rx } from './world/layout.js';
import { H, SURF } from './world/heightfield.js';
import { VILLAGE } from './world/village.js';
import { clamp } from './util/math.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICON = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 7h6M9 11h5"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
  bino: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M7 11V6a2 2 0 014 0v5M17 11V6a2 2 0 00-4 0v5M11 14h2"/></svg>',
};

export class UI {
  constructor(input, sound) {
    this.input = input; this.sound = sound;
    this.root = $('#ui');
    if (input.touch) document.body.classList.add('touch');
    this.modal = null;
    this.buildLoading();
  }
  // ---------- Carga ----------
  buildLoading() {
    this.loading = el(`<div id="loading"><div><div class="logo">MENDIMENDIZ</div><div class="sub">El valle de Salazar</div><div class="bar"><i></i></div><div class="msg">Preparando el valle…</div></div>
      <svg class="mountains" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0 30 L0 18 L12 8 L20 15 L30 4 L42 16 L52 9 L63 18 L74 6 L86 15 L100 10 L100 30Z" fill="#2c2440"/><path d="M0 30 L0 22 L15 16 L28 22 L40 14 L55 23 L70 15 L84 22 L100 17 L100 30Z" fill="#231c34"/></svg></div>`);
    document.body.appendChild(this.loading);
  }
  progress(p, msg) { $('.bar i', this.loading).style.width = (p * 100).toFixed(0) + '%'; if (msg) $('.msg', this.loading).textContent = msg; }
  hideLoading() { this.loading.style.transition = 'opacity .6s'; this.loading.style.opacity = 0; setTimeout(() => this.loading.remove(), 700); }

  // ---------- Título ----------
  showTitle(save, onStart) {
    const has = save && save.started;
    const t = el(`<div id="title"><div class="box">
      <h1 class="logo">MENDIMENDIZ</h1>
      <div class="place">Aventura en el valle de Salazar</div>
      <p>Explora Otsagabia, la Selva de Irati y el santuario de Muskilda. Ayuda a sus gentes, descubre sus animales y sus leyendas y reúne las ocho cintas para la gran fiesta.</p>
      <label for="pname">¿Cómo te llamas?</label>
      <input id="pname" maxlength="14" autocomplete="off" value="${has ? esc(save.name) : ''}" placeholder="Tu nombre">
      <div class="btns">
        <button class="btn primary" id="bPlay">${has ? 'Continuar' : '¡A jugar!'}</button>
        ${has ? '<button class="btn" id="bNew">Nueva partida</button>' : ''}
      </div>
      <div class="hint">${this.input.touch ? 'Arrastra a la izquierda para caminar y a la derecha para mirar.' : 'WASD o flechas para caminar · ratón para mirar · E para hablar · Espacio para saltar · Mayús para correr'}</div>
    </div></div>`);
    this.root.appendChild(t);
    const go = (fresh) => {
      const name = $('#pname', t).value.trim() || 'Mendi';
      this.sound.init(); this.sound.ui('open');
      t.style.transition = 'opacity .5s'; t.style.opacity = 0; setTimeout(() => t.remove(), 500);
      onStart(name, fresh);
    };
    $('#bPlay', t).onclick = () => go(false);
    if (has) { const b = $('#bNew', t); b.onclick = () => { if (b.dataset.sure) go(true); else { b.dataset.sure = 1; b.textContent = '¿Seguro? Se borrará tu progreso. Pulsa otra vez'; this.sound.ui('error'); } }; }
    $('#pname', t).addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(false); });
  }

  // ---------- HUD ----------
  buildHUD(game) {
    this.game = game;
    const h = el(`<div id="hud">
      <div id="quest" class="glass"><div class="ic"><span class="qe">🏘️</span><svg viewBox="0 0 52 52"><path d="M26 1 L31 8 L21 8 Z" fill="#ffc85a"/></svg></div><div><small>Misión</small><b class="qt"></b><span class="qd"></span></div></div>
      <div id="ribbons" class="glass">${RIBBONS.map(r => `<i data-r="${r.id}" title="${r.name}"></i>`).join('')}<span class="eg">🌼 0/${EGUZKILORES.length}</span></div>
      <div id="topright">
        <div id="mini"><canvas width="248" height="248"></canvas><div id="clock">09:00</div></div>
        <div class="rbtns">
          <button class="round hidden" id="bBino" aria-label="Prismáticos (F)">${ICON.bino}</button>
          <button class="round" id="bBook" aria-label="Cuaderno (C)">${ICON.book}</button>
          <button class="round" id="bMap" aria-label="Mapa (M)">${ICON.map}</button>
          <button class="round" id="bMenu" aria-label="Menú (Esc)">${ICON.menu}</button>
        </div>
      </div>
      <div id="prompt" class="glass hidden"><kbd>E</kbd><span></span></div>
      <div id="toast" class="glass"></div>
      <div id="mg" class="glass hidden"></div>
      <div id="stick"><i></i></div>
      <div id="stickHint">Arrastra aquí para caminar</div>
      <div id="controls">
        <button class="cbtn" id="cRun" aria-label="Correr">🏃</button>
        <button class="cbtn" id="cJump" aria-label="Saltar">⤒</button>
        <button class="cbtn big off" id="cAct" aria-label="Acción">·</button>
      </div>
    </div>`);
    this.root.appendChild(h);
    this.hud = h;
    this.fade = el('<div id="fade"></div>'); document.body.appendChild(this.fade);
    this.cine = el('<div id="cine"></div>'); document.body.appendChild(this.cine);
    this.subtitle = el('<div id="subtitle"></div>'); document.body.appendChild(this.subtitle);
    const tap = (id, fn) => { const b = $(id, h); b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); fn(); }); };
    tap('#bBook', () => this.openBook());
    tap('#bMap', () => this.openMap());
    tap('#bMenu', () => this.openMenu());
    tap('#bBino', () => game.toggleBinoculars());
    tap('#mini', () => this.openMap());
    tap('#quest', () => this.openBook('misiones'));
    tap('#prompt', () => this.input.press('e'));
    tap('#cAct', () => this.input.press('e'));
    tap('#cJump', () => this.input.press(' '));
    tap('#cRun', () => { this.input.runToggle = !this.input.runToggle; $('#cRun', h).classList.toggle('on', this.input.runToggle); });
    const stick = $('#stick', h), knob = $('#stick i', h), sh = $('#stickHint', h);
    this.input.onStick = (on, x, y, dx, dy) => {
      stick.style.display = on ? 'block' : 'none';
      if (on) { sh.style.display = 'none'; stick.style.left = x + 'px'; stick.style.top = y + 'px'; knob.style.transform = `translate(${dx}px,${dy}px)`; }
    };
    this.buildMapCanvas();
    this.mini = $('#mini canvas', h).getContext('2d');
  }
  setQuest(q) {
    const b = $('#quest', this.hud);
    if (!q) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden');
    $('.qe', b).textContent = q.icon; $('.qt', b).textContent = q.step; $('small', b).textContent = q.title;
    $('.qd', b).textContent = q.dist != null ? (q.dist < 1000 ? `${Math.round(q.dist)} m` : '') : '';
    const svg = $('svg', b); svg.style.display = q.angle != null ? 'block' : 'none';
    if (q.angle != null) svg.style.transform = `rotate(${q.angle}rad)`;
  }
  setRibbons(have, eg) {
    for (const i of this.hud.querySelectorAll('#ribbons i')) { const r = RIBBONS.find(x => x.id === i.dataset.r); const on = have.includes(r.id); i.classList.toggle('on', on); i.style.background = on ? r.color : ''; }
    $('#ribbons .eg', this.hud).textContent = `🌼 ${eg}/${EGUZKILORES.length}`;
  }
  setPrompt(text) {
    const p = $('#prompt', this.hud), a = $('#cAct', this.hud);
    if (!text) { p.classList.add('hidden'); a.classList.add('off'); a.textContent = '·'; this.promptText = null; return; }
    if (this.promptText !== text) { $('span', p).textContent = text; a.textContent = text.split(' ')[0]; this.promptText = text; }
    p.classList.remove('hidden'); a.classList.remove('off');
  }
  setClock(s) { $('#clock', this.hud).textContent = s; }
  showBinoButton() { $('#bBino', this.hud).classList.remove('hidden'); }
  hideBinoButton() { $('#bBino', this.hud).classList.add('hidden'); }
  toast(text, icon = '✨', ms = 2800) {
    const t = $('#toast', this.hud);
    t.innerHTML = `<span style="font-size:22px">${icon}</span><span>${esc(text)}</span>`;
    t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('on'), ms);
  }
  hudVisible(v) { this.hud.style.display = v ? '' : 'none'; }
  setMG(html) { const m = $('#mg', this.hud); if (!html) m.classList.add('hidden'); else { m.innerHTML = html; m.classList.remove('hidden'); } }
  setCinematic(on, text) { this.cine.classList.toggle('on', on); this.subtitle.textContent = text || ''; }
  async fadeOut() { this.fade.classList.add('on'); await wait(650); }
  async fadeIn() { this.fade.classList.remove('on'); await wait(300); }

  // ---------- Diálogo ----------
  // lines: [{who, face, color, text, choices:[...]}] -> devuelve el índice de la última elección
  dialog(lines) {
    return new Promise(resolve => {
      this.closeModal();
      const d = el(`<div id="dialog" class="glass"><div class="face"></div><div class="body"><h3></h3><p></p><div class="choices"></div><div class="next">${this.input.touch ? 'Toca para seguir ▸' : 'E / Espacio / clic ▸'}</div></div></div>`);
      this.hud.appendChild(d);
      this.dialogOpen = true;
      let i = 0, typing = null, full = '', lastChoice = -1;
      const show = () => {
        const L = lines[i];
        $('.face', d).textContent = L.face || '🙂';
        $('.face', d).style.background = L.color || '#6d3b5c';
        $('h3', d).textContent = L.who || '';
        full = L.text; let k = 0;
        const p = $('p', d); p.textContent = '';
        const ch = $('.choices', d); ch.innerHTML = '';
        $('.next', d).style.display = L.choices ? 'none' : '';
        clearInterval(typing);
        typing = setInterval(() => {
          k += 2; p.textContent = full.slice(0, k);
          if (k % 6 === 0) this.sound.ui('talk');
          if (k >= full.length) { clearInterval(typing); typing = null; if (L.choices) showChoices(L); }
        }, 22);
        L.onShow?.();
      };
      const showChoices = (L) => {
        const ch = $('.choices', d);
        L.choices.forEach((c, j) => {
          const b = el(`<button>${esc(c)}</button>`);
          b.onclick = (e) => { e.stopPropagation(); lastChoice = j; this.sound.ui('click'); const r = L.onChoice?.(j); if (r && r.length) { lines.splice(i + 1, 0, ...r); } advance(true); };
          ch.appendChild(b);
        });
        ch.querySelector('button')?.focus();
      };
      const advance = (fromChoice) => {
        const L = lines[i];
        if (typing) { clearInterval(typing); typing = null; $('p', d).textContent = full; if (L.choices) showChoices(L); return; }
        if (L.choices && !fromChoice) return;
        i++;
        if (i >= lines.length) { cleanup(); resolve(lastChoice); return; }
        show();
      };
      const onKey = (e) => { const k = e.key.toLowerCase(); e.stopImmediatePropagation(); if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); advance(false); } else if (/^[1-3]$/.test(k)) { const b = d.querySelectorAll('.choices button')[+k - 1]; b?.click(); } };
      const onTap = (e) => { if (e.target.closest('.choices')) return; advance(false); };
      d.addEventListener('pointerdown', onTap);
      const canvasTap = (e) => { if (e.target.id === 'c') advance(false); };
      addEventListener('keydown', onKey, true);
      addEventListener('pointerdown', canvasTap);
      const cleanup = () => { clearInterval(typing); removeEventListener('keydown', onKey, true); removeEventListener('pointerdown', canvasTap); d.remove(); this.dialogOpen = false; };
      show();
    });
  }

  // ---------- Premio ----------
  reward({ icon, ribbon, title, text, stamp, button = '¡Genial!' }) {
    return new Promise(res => {
      this.sound.fanfare();
      const r = el(`<div id="reward"><div class="card2">
        ${stamp ? `<div class="stamp">${stamp}</div>` : ribbon ? `<div class="rib" style="background:${ribbon}"></div>` : `<div class="big">${icon || '🎁'}</div>`}
        <h2>${esc(title)}</h2><p>${esc(text || '')}</p><button class="btn primary">${esc(button)}</button></div></div>`);
      document.body.appendChild(r);
      this.modal = r;
      const btn = $('button', r); setTimeout(() => btn.focus(), 50);
      const close = () => { r.remove(); this.modal = null; removeEventListener('keydown', k, true); this.sound.ui('click'); res(); };
      const k = (e) => { e.stopImmediatePropagation(); if (['e', 'enter', ' ', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); close(); } };
      setTimeout(() => addEventListener('keydown', k, true), 400);
      btn.onclick = close;
    });
  }

  closeModal() { if (this.modal) { this.modal.remove(); this.modal = null; this.onModalClose?.(); } }
  get busy() { return !!this.modal || this.dialogOpen; }

  screen(inner, cls = '') {
    this.closeModal();
    this.sound.ui('open');
    const s = el(`<div class="screen ${cls}"><div class="paper">${inner}</div></div>`);
    document.body.appendChild(s);
    this.modal = s;
    s.addEventListener('pointerdown', e => { if (e.target === s) this.closeModal(); });
    s.querySelectorAll('.close').forEach(b => b.onclick = () => this.closeModal());
    const onKey = (e) => { if (!document.body.contains(s)) { removeEventListener('keydown', onKey, true); return; } const k = e.key.toLowerCase(); if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; e.stopImmediatePropagation(); if (['escape', 'c', 'm'].includes(k)) { e.preventDefault(); this.closeModal(); removeEventListener('keydown', onKey, true); } };
    addEventListener('keydown', onKey, true);
    return s;
  }

  // ---------- Cuaderno ----------
  openBook(tab = 'misiones') {
    const g = this.game, st = g.state;
    const tabs = [['misiones', 'Misiones'], ['saberes', 'Saberes'], ['animales', 'Animales'], ['pasaporte', 'Pasaporte']];
    const s = this.screen(`<header><h2>Cuaderno de ${esc(st.name)}</h2><button class="close" aria-label="Cerrar">✕</button></header>
      <div class="tabs">${tabs.map(([id, n]) => `<button data-t="${id}" class="${id === tab ? 'on' : ''}">${n}</button>`).join('')}</div><div class="pbody"></div>`);
    const body = $('.pbody', s);
    const render = (t) => {
      s.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      if (t === 'misiones') {
        const ids = Object.keys(QUESTS);
        body.innerHTML = `<div class="qlist">${ids.map(id => {
          const q = QUESTS[id], qs = st.quests[id] || { state: 'locked' };
          const rib = RIBBONS.find(r => r.id === q.ribbon);
          const label = { locked: 'Bloqueada', available: 'Nueva', active: 'En curso', done: 'Hecha ✓' }[qs.state];
          const stepTxt = qs.state === 'done' ? '¡Completada!' : qs.state === 'locked' ? (id === 'muskilda' ? 'Reúne las 8 cintas' : 'Completa antes la bienvenida') : g.stepText(id);
          return `<div class="qitem ${st.tracked === id ? 'active' : ''} ${qs.state}" data-q="${id}"><div class="qi">${q.icon}</div><div><b>${q.title}</b><small>${esc(stepTxt)}</small></div>
            <span class="state">${label}</span>${rib ? `<div class="rb" style="background:${qs.state === 'done' ? rib.color : '#d9ccb8'}"></div>` : ''}</div>`;
        }).join('')}</div><p class="keys" style="margin-top:12px">Toca una misión para seguirla con la flecha.</p>`;
        body.querySelectorAll('.qitem').forEach(n => n.onclick = () => { const id = n.dataset.q; if (['active', 'available'].includes(st.quests[id]?.state)) { g.track(id); this.sound.ui('click'); render('misiones'); } });
      } else if (t === 'saberes' || t === 'animales') {
        const list = CARDS.filter(c => t === 'animales' ? c.cat === 'Animales' : c.cat !== 'Animales');
        const cats = [...new Set(list.map(c => c.cat))];
        body.innerHTML = `<div class="stats"><div>🃏 ${st.cards.length}/${CARDS.length} cartas</div>${t === 'animales' ? `<div>🔭 ${st.observed.length}/${Object.keys(SPECIES_OBS).length} observados</div>` : ''}</div>` +
          cats.map(cat => `<div class="sectionT">${cat}</div><div class="cards">${list.filter(c => c.cat === cat).map(c => {
            const has = st.cards.includes(c.id);
            return `<button class="card ${has ? '' : 'locked'}" data-c="${c.id}"><div class="in"><div class="f"><small>${c.cat}</small><div class="e">${c.emoji}</div><b>${has ? c.title : '¿?'}</b></div><div class="b">${has ? esc(c.text) : 'Sigue explorando para descubrir esta carta.'}</div></div></button>`;
          }).join('')}</div>`).join('');
        body.querySelectorAll('.card').forEach(c => c.onclick = () => { if (!c.classList.contains('locked')) { c.classList.toggle('flip'); this.sound.ui('click'); } });
      } else {
        const r = st.ribbons.length;
        body.innerHTML = `<div class="stats"><div>🎀 ${r}/8 cintas</div><div>🌼 ${st.eguz.length}/${EGUZKILORES.length} eguzkilores</div><div>🃏 ${st.cards.length} cartas</div><div>⭐ ${st.stars} estrellas</div></div>
          <div class="sectionT">Cintas para la fiesta</div><div class="cards">${RIBBONS.map(rb => `<div class="card ${st.ribbons.includes(rb.id) ? '' : 'locked'}" style="height:120px"><div class="in"><div class="f" style="align-items:center;justify-content:center"><div style="width:22px;height:54px;background:${rb.color};clip-path:polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)"></div><b style="text-align:center">${rb.name}</b><small>${rb.eu}</small></div></div></div>`).join('')}</div>
          <div class="sectionT">Sello del pasaporte</div><p>${st.done ? '✅ ¡Sellado en Muskilda! Eres parte de la fiesta del valle.' : 'Consigue las ocho cintas y baila en Muskilda para sellarlo.'}</p>
          <p class="keys">Otsagabia/Ochagavía está en el Pirineo navarro. El pueblo del juego es una interpretación: la posición de casas y calles no es un plano exacto.</p>`;
      }
    };
    s.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { this.sound.ui('click'); render(b.dataset.t); });
    render(tab);
  }

  // ---------- Mapa ----------
  buildMapCanvas() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    const k = (N - 1) / S;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = Math.min(N - 2, Math.floor(x * k)), j = Math.min(N - 2, Math.floor(y * k)), q = j * N + i;
      const h = H[q], hx = H[q + 1] - H[q], hz = H[q + N] - H[q];
      const shade = clamp(1 + (-hx - hz) * 0.25, 0.6, 1.3);
      let r = 118, gg = 168, b = 84;
      const f = SURF.forest[q] / 255; r -= f * 60; gg -= f * 55; b -= f * 35;
      const rock = SURF.rock[q] / 255; r += (140 - r) * rock; gg += (136 - gg) * rock; b += (126 - b) * rock;
      if (h > 135) { r = 238; gg = 240; b = 242; }
      const st = SURF.street[q] / 255, dt = SURF.dirt[q] / 255;
      r += (205 - r) * st; gg += (196 - gg) * st; b += (178 - b) * st;
      r += (196 - r) * dt; gg += (160 - gg) * dt; b += (110 - b) * dt;
      if (SURF.water[q]) { r = 70; gg = 150; b = 190; }
      const o = (y * S + x) * 4;
      d[o] = r * shade; d[o + 1] = gg * shade; d[o + 2] = b * shade; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const toM = (x, z) => [(x + HALF) / (2 * HALF) * S, (z + HALF) / (2 * HALF) * S];
    // casas
    g.fillStyle = '#b44a3a';
    for (const h of VILLAGE.houses) { const [x, y] = toM(h.x, h.z); g.save(); g.translate(x, y); g.rotate(-h.ry); g.fillRect(-h.w / 4, -h.d / 4, h.w / 2, h.d / 2); g.restore(); }
    for (const p of VILLAGE.palaces) { const [x, y] = toM(p.x, p.z); g.fillStyle = '#7a4a6a'; g.fillRect(x - 3.5, y - 3.5, 7, 7); }
    this.mapImg = c;
    this.toMap = toM;
  }
  drawMarkers(g, S, list, scale = 1) {
    for (const m of list) {
      const x = (m.x + HALF) / (2 * HALF) * S, y = (m.z + HALF) / (2 * HALF) * S;
      g.font = `${Math.round(18 * scale)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (m.icon) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x, y, 12 * scale, 0, 7); g.fill(); g.fillText(m.icon, x, y + 1); }
      if (m.label && scale >= 1) { g.font = `800 ${Math.round(12 * scale)}px Nunito, sans-serif`; g.fillStyle = '#3b2a1e'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.strokeText(m.label, x, y + 20 * scale); g.fillText(m.label, x, y + 20 * scale); }
    }
  }
  drawPlayer(g, x, y, heading, s = 1) {
    g.save(); g.translate(x, y); g.rotate(-heading + Math.PI);
    g.fillStyle = '#ff4f6d'; g.strokeStyle = '#fff'; g.lineWidth = 2.5 * s;
    g.beginPath(); g.moveTo(0, -11 * s); g.lineTo(8 * s, 9 * s); g.lineTo(0, 4 * s); g.lineTo(-8 * s, 9 * s); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  updateMinimap(player, camYaw, markers, target) {
    const g = this.mini, S = 248, zoom = 1.8; // px del mapa por metro * zoom
    const mpp = (2 * HALF) / 512; // metros por píxel del mapa
    g.save(); g.clearRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.rotate(camYaw);
    const scale = zoom / mpp * (S / 248);
    const px = (player.pos.x + HALF) / mpp, pz = (player.pos.z + HALF) / mpp;
    g.drawImage(this.mapImg, -px * zoom, -pz * zoom, 512 * zoom, 512 * zoom);
    for (const m of markers) {
      const x = ((m.x + HALF) / mpp - px) * zoom, y = ((m.z + HALF) / mpp - pz) * zoom;
      if (Math.hypot(x, y) > S / 2 - 12) continue;
      g.save(); g.translate(x, y); g.rotate(-camYaw);
      g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill(); g.fillText(m.icon, 0, 1);
      g.restore();
    }
    if (target) {
      let x = ((target.x + HALF) / mpp - px) * zoom, y = ((target.z + HALF) / mpp - pz) * zoom;
      const d = Math.hypot(x, y), R = S / 2 - 14;
      if (d > R) { x *= R / d; y *= R / d; }
      g.save(); g.translate(x, y); g.rotate(-camYaw);
      g.fillStyle = '#ffc85a'; g.strokeStyle = '#3a2200'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.stroke();
      g.restore();
    }
    g.restore();
    this.drawPlayer(g, S / 2, S / 2, player.heading - camYaw, 1.3);
  }
  openMap() {
    const g = this.game;
    const s = this.screen(`<header><h2>Mapa del valle</h2><button class="close" aria-label="Cerrar">✕</button></header><div class="pbody"><div id="mapbox"><canvas width="1024" height="1024"></canvas></div>
      <div class="legend"><span>❗ misión</span><span>🎀 cinta</span><span>🌼 eguzkilore encontrado</span><span>🔺 tú</span></div></div>`);
    const c = $('canvas', s), ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapImg, 0, 0, 1024, 1024);
    const labels = [
      { x: PLACES.plaza.x, z: PLACES.plaza.z - 30, label: 'Otsagabia' }, { x: 0, z: -320, label: 'Selva de Irati' }, { x: PLACES.muskilda.x, z: PLACES.muskilda.z, icon: '⛪', label: 'Muskilda' },
      { x: PLACES.borda.x, z: PLACES.borda.z, icon: '🐑', label: 'Borda' }, { x: PLACES.pond.x, z: PLACES.pond.z, icon: '💧', label: 'Balsa' }, { x: PLACES.fronton.x, z: PLACES.fronton.z, icon: '🏐', label: 'Frontón' },
      { x: PLACES.church.x, z: PLACES.church.z, icon: '⛪', label: 'San Juan' }, { x: PLACES.mirador.x, z: PLACES.mirador.z, icon: '👀', label: 'Mirador' }, { x: PLACES.crucero.x, z: PLACES.crucero.z, icon: '✝️', label: 'Crucero' },
    ];
    this.drawMarkers(ctx, 1024, labels, 1.3);
    this.drawMarkers(ctx, 1024, g.mapMarkers(), 1.3);
    const [px, py] = [(g.player.pos.x + HALF) / (2 * HALF) * 1024, (g.player.pos.z + HALF) / (2 * HALF) * 1024];
    this.drawPlayer(ctx, px, py, g.player.heading, 1.6);
  }

  // ---------- Menú ----------
  openMenu() {
    const g = this.game, st = g.state;
    const s = this.screen(`<header><h2>Pausa</h2><button class="close" aria-label="Cerrar">✕</button></header><div class="pbody">
      <label>Música <input type="checkbox" id="mMusic" ${st.settings.music ? 'checked' : ''}></label>
      <label>Volumen <input type="range" id="mVol" min="0" max="1" step="0.05" value="${st.settings.volume}"></label>
      <label>Calidad gráfica <select id="mQ"><option value="low">Baja (más fluido)</option><option value="mid">Media</option><option value="high">Alta</option></select></label>
      <p id="mQnote" class="keys" hidden>La nueva calidad se aplicará la próxima vez que abras el juego. <button class="btn small" id="mReload">Aplicar ahora</button></p>
      <label>Paso del tiempo <select id="mT"><option value="1">Normal</option><option value="0">Detenido</option><option value="4">Rápido</option></select></label>
      <div class="keys">${this.input.touch ? 'Izquierda: caminar · Derecha: mirar · Botón amarillo: acción · 🏃 correr · ⤒ saltar' : '<kbd>WASD</kbd> caminar · <kbd>Mayús</kbd> correr · <kbd>Espacio</kbd> saltar · <kbd>E</kbd> hablar/usar · <kbd>F</kbd> prismáticos · <kbd>C</kbd> cuaderno · <kbd>M</kbd> mapa · ratón o flechas para la cámara · rueda: zoom'}</div>
      <div class="btns"><button class="btn primary close">Seguir jugando</button><button class="btn" id="mHome">Volver a la plaza</button><button class="btn" id="mReset">Borrar partida</button></div>
    </div>`, 'menu');
    $('#mQ', s).value = st.settings.quality || (this.input.touch ? 'mid' : 'high'); $('#mT', s).value = String(st.settings.timeSpeed ?? 1);
    $('#mMusic', s).onchange = e => { st.settings.music = e.target.checked; this.sound.setMusic(e.target.checked); g.save(); };
    $('#mVol', s).oninput = e => { st.settings.volume = +e.target.value; this.sound.setVolume(+e.target.value); g.save(); };
    $('#mQ', s).onchange = e => { st.settings.quality = e.target.value; g.save(); $('#mQnote', s).hidden = false; };
    $('#mT', s).onchange = e => { st.settings.timeSpeed = +e.target.value; g.applySettings(); g.save(); };
    $('#mHome', s).onclick = () => { this.closeModal(); g.teleport(PLACES.plaza.x - 6, PLACES.plaza.z + 6); };
    const rb = $('#mReset', s);
    rb.onclick = () => { if (rb.dataset.sure) { this.closeModal(); g.resetState(st.name); } else { rb.dataset.sure = 1; rb.textContent = '¿Seguro? Pulsa otra vez para borrar'; this.sound.ui('error'); } };
    $('#mReload', s).onclick = () => { g.save(); try { location.reload(); } catch (e) { } };
  }

  // ---------- Prismáticos ----------
  binoculars(on) {
    if (on && !this.bino) {
      this.bino = el(`<div id="bino"><svg class="mask" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><defs><mask id="bm"><rect x="-200" y="-200" width="560" height="500" fill="#fff"/><circle cx="58" cy="50" r="36" fill="#000"/><circle cx="102" cy="50" r="36" fill="#000"/></mask><radialGradient id="bv"><stop offset=".75" stop-color="#0b0a10" stop-opacity="0"/><stop offset="1" stop-color="#0b0a10" stop-opacity=".6"/></radialGradient></defs><rect x="-200" y="-200" width="560" height="500" fill="#0b0a10" mask="url(#bm)"/></svg><div class="cross"></div><div class="label"></div><div class="bhint">${this.input.touch ? 'Arrastra para mirar · botón amarillo para anotar · 🔭 para salir' : 'Mueve el ratón para mirar · E para anotar · F para salir'}</div></div>`);
      document.body.appendChild(this.bino);
    } else if (!on && this.bino) { this.bino.remove(); this.bino = null; }
  }
  binoTarget(label, lock) { if (!this.bino) return; $('.label', this.bino).textContent = label || ''; $('.cross', this.bino).classList.toggle('lock', !!lock); }

  // ---------- Ritmo (danza) ----------
  rhythm(onPad) {
    const r = el(`<div id="rhythm"><div class="fb"></div>${[0, 1, 2, 3].map(i => `<div class="lane" style="left:${i * 25}%"></div>`).join('')}<div class="target"></div><div class="notes"></div>
      <div class="pads">${['◀', '▲', '▼', '▶'].map((a, i) => `<button data-i="${i}">${a}</button>`).join('')}</div></div>`);
    document.body.appendChild(r);
    r.querySelectorAll('.pads button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); onPad(+b.dataset.i); }));
    return {
      el: r,
      addNote: (lane) => { const n = el(`<div class="note" style="left:${lane * 25 + 12.5}%">${['◀', '▲', '▼', '▶'][lane]}</div>`); $('.notes', r).appendChild(n); return n; },
      flash: (i) => { const b = r.querySelectorAll('.pads button')[i]; b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 120); },
      feedback: (t) => { $('.fb', r).textContent = t; },
      remove: () => r.remove(),
    };
  }
}

export const wait = (ms) => new Promise(r => setTimeout(r, ms));
