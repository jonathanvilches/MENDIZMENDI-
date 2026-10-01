// Interfaz en partida: HUD, diálogos con retrato, cuaderno, mapa, menú, premios, prismáticos y ritmo.
// Todos los iconos son dibujos propios (src/ui/icons.js).
import { RIBBONS, QUESTS, CARDS, SPECIES_OBS, EGUZKILORES } from './game/content.js';
import { HALF, N, PLACES } from './world/layout.js';
import { H, SURF } from './world/heightfield.js';
import { clamp } from './util/math.js';
import { iconSVG, iconImage } from './ui/icons.js';
import { portrait } from './ui/portraits.js';
import { mountMapView } from './ui/mapview.js';
import { buildMapVectorsIdle } from './ui/mapvector.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const I = (n, s = 22) => iconSVG(n, s);

const ICON = {
  book: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><g transform="translate(-0.35 -0.2)"><path d="M5.2 4.6A2.1 2.1 0 017.3 2.5h11.2a1 1 0 011 1v15.8H7.3a2.1 2.1 0 00-2.1 2.1z" fill="#fff"/><path d="M5.2 21.4a2.1 2.1 0 012.1-2.1h12.2v2.6H7.3" fill="#e3d6ff"/><path d="M12.6 2.5v7.2l1.9-1.4 1.9 1.4V2.5" fill="#FFD700"/></g></svg>',
  map: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 5.6l6.2-2.4 6.6 2.4 6.2-2.4v15.2l-6.2 2.4-6.6-2.4-6.2 2.4z" fill="#fff"/><path d="M8.7 3.2v15.2M15.3 5.6v15.2" fill="none" stroke-width="1.2"/><path d="M5 15.5c2-2.4 4.4-.5 6.4-2.6s3.4-3.6 5.6-2.8" fill="none" stroke="#8a2be2" stroke-width="1.6" stroke-dasharray="1.8 1.4" stroke-linecap="round"/><path d="M18 3.8a2.6 2.6 0 00-2.6 2.6c0 1.9 2.6 4.4 2.6 4.4s2.6-2.5 2.6-4.4A2.6 2.6 0 0018 3.8z" fill="#ff5a4e"/></svg>',
  menu: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.4" stroke-linejoin="round" fill="#fff"><rect x="3.5" y="4.6" width="17" height="3.4" rx="1.7"/><rect x="3.5" y="10.3" width="17" height="3.4" rx="1.7"/><rect x="3.5" y="16" width="17" height="3.4" rx="1.7"/></svg>',
  bino: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><path d="M5.2 5.4a2 2 0 013.9 0l.8 7H3.9zM14.1 12.4l.8-7a2 2 0 013.9 0l1.3 7z" fill="#fff"/><path d="M9.6 10.4h4.8v3.2H9.6z" fill="#e3d6ff"/><circle cx="6.6" cy="15.6" r="4.4" fill="#fff"/><circle cx="17.4" cy="15.6" r="4.4" fill="#fff"/><circle cx="6.6" cy="15.6" r="2.4" fill="#7fd6ff"/><circle cx="17.4" cy="15.6" r="2.4" fill="#7fd6ff"/></svg>',
  // controles: glifos macizos con contorno oscuro (se leen sobre hierba, cielo o piedra)
  run: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><g transform="translate(0.25 0.55)"><path d="M.9 9.4h4.2M.4 13h3.6M1.2 16.6h3" fill="none" stroke="#FFD700" stroke-width="2.3"/><path d="M9 2.4h5.4a.9.9 0 01.9.9v6.9c0 .6.3 1.1.8 1.4l3.2 1.9a4.9 4.9 0 012.4 4.2v.5H6.6c-.1-1.7.3-3.3.9-4.8L7.9 3.4c.1-.6.5-1 1.1-1z" fill="#fff"/><path d="M6.6 18.2h16.1v1.3a1 1 0 01-1 1H7.6a1 1 0 01-1-1z" fill="#FFD700"/><path d="M7.8 5.6h7.5M14 11.4l2-1.5M16 12.8l2-1.5" fill="none" stroke-width="1.3"/></g></svg>',
  jump: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><ellipse cx="12" cy="21.4" rx="5.4" ry="1.5" fill="#7fd6ff" stroke="none" opacity=".9"/><path d="M12 1.6l7.4 7.4-2.8 2.8L12 7.2l-4.6 4.6L4.6 9z" fill="#fff"/><path d="M12 8.6l7.4 7.4-2.8 2.8L12 14.2l-4.6 4.6L4.6 16z" fill="#fff"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="#ffd34d"><circle cx="12" cy="12" r="5"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="#f0e6c8"><path d="M15 3a9 9 0 106 15A8 8 0 0115 3z"/></svg>',
  // botón de acción: cambia según lo que se puede hacer (hablar, saludar, pelota, agua, mirar, coger)
  hand: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M9.4 21.4c-2.5 0-4.1-1.4-5.2-3.4l-1.6-2.9c-.6-1.1.7-2.1 1.7-1.3l1.9 1.5V6.4a1.5 1.5 0 013 0v4.8h.7V4.3a1.5 1.5 0 013 0v6.9h.7V5.1a1.5 1.5 0 013 0v6.1h.7V7.6a1.5 1.5 0 013 0v7.3c0 3.8-2.6 6.5-6.2 6.5z" fill="#fff"/></svg>',
  talk: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><path d="M4.4 3.4h15.2a2.4 2.4 0 012.4 2.4v8.8a2.4 2.4 0 01-2.4 2.4h-7.2l-5 4v-4H4.4A2.4 2.4 0 012 14.6V5.8a2.4 2.4 0 012.4-2.4z" fill="#fff"/><circle cx="7.6" cy="10.2" r="1.5" fill="#8a2be2" stroke="none"/><circle cx="12" cy="10.2" r="1.5" fill="#8a2be2" stroke="none"/><circle cx="16.4" cy="10.2" r="1.5" fill="#8a2be2" stroke="none"/></svg>',
  wave: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><g transform="translate(-0.1 -0.6)"><path d="M8.4 22c-2.5 0-4.1-1.4-5.2-3.4l-1.6-2.9c-.6-1.1.7-2.1 1.7-1.3l1.9 1.5V7a1.5 1.5 0 013 0v4.8h.7V4.9a1.5 1.5 0 013 0v6.9h.7V5.7a1.5 1.5 0 013 0v6.1h.7V8.2a1.5 1.5 0 013 0v7.3c0 3.8-2.6 6.5-6.2 6.5z" fill="#fff" transform="rotate(-12 12 12)"/><path d="M19.6 2.6c1.2.8 2 2.1 2.2 3.6M17.8 4.6c.6.4 1 1.1 1.1 1.8" fill="none" stroke="#FFD700" stroke-width="1.8"/></g></svg>',
  pelota: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linecap="round"><g transform="translate(0.55 0.15)"><path d="M2.2 6.4c.6-1.4 1.5-2.6 2.6-3.6M1.4 10.2c.1-.8.3-1.5.6-2.2" fill="none" stroke="#FFD700" stroke-width="1.8"/><circle cx="13" cy="12.4" r="8.6" fill="#f4e6c6"/><path d="M7.4 5.9c3 2.9 3 10.1 0 13M18.6 5.9c-3 2.9-3 10.1 0 13" fill="none" stroke="#7a4a1e" stroke-width="1.5" stroke-dasharray="1.6 1.2"/><ellipse cx="10.4" cy="8.6" rx="2.2" ry="1.2" fill="#fff" stroke="none" opacity=".85" transform="rotate(-30 10.4 8.6)"/></g></svg>',
  drop: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><g transform="translate(0 0.25)"><path d="M12 2.2c3.6 4.7 6.8 8.5 6.8 12.3a6.8 6.8 0 01-13.6 0c0-3.8 3.2-7.6 6.8-12.3z" fill="#7fd6ff"/><path d="M9 14.8a3 3 0 002.2 3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g></svg>',
  look: '<svg viewBox="0 0 24 24" stroke="#1f1a26" stroke-width="1.5" stroke-linejoin="round"><g transform="translate(-0.35 -0.4)"><path d="M14.4 16.6l2.1-2.1 5.1 5.1a1.5 1.5 0 01-2.1 2.1z" fill="#FFD700"/><circle cx="9.8" cy="9.8" r="7" fill="#fff"/><circle cx="9.8" cy="9.8" r="4.4" fill="#cfefff"/><path d="M7.6 7.8a3 3 0 012.4-1.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g></svg>',
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
    this.loading = el(`<div id="loading" class="hidden"><div class="ld-bg"></div><div class="ld-shade"></div>
      <div class="ld-in">
        <div class="ld-top"><small class="ld-k"></small></div>
        <div class="ld-mid"><img class="ld-stamp" alt=""><div class="ld-name"></div><p class="ld-intro"></p><div class="ld-ms"></div></div>
        <div class="ld-bot">
          <div class="ld-tip"><span class="ld-bulb"></span><div><b>¿Sabías que…?</b><p class="tip"></p></div></div>
          <div class="ld-prog"><div class="bar"><i></i><img class="ld-av" alt=""></div><div class="ld-row"><span class="msg">Preparando…</span><span class="ld-pc">0%</span></div></div>
        </div>
      </div></div>`);
    document.body.appendChild(this.loading);
  }
  // info: { comarca, stamp, avatar, missions: [iconos], intro }
  showLoading(title, tip = '', image = '', info = {}) {
    const L = this.loading;
    L.classList.remove('hidden'); L.style.opacity = 1; L.style.transition = '';
    $('.ld-bg', L).style.backgroundImage = image ? `url(${image})` : '';
    $('.ld-k', L).textContent = info.comarca ? 'Comarca · ' + info.comarca : 'Navarra';
    $('.ld-name', L).textContent = title.split(' /')[0];
    $('.ld-intro', L).textContent = info.intro || '';
    const st = $('.ld-stamp', L); st.style.display = info.stamp ? '' : 'none'; if (info.stamp) st.src = info.stamp;
    const av = $('.ld-av', L); av.style.display = info.avatar ? '' : 'none'; if (info.avatar) av.src = info.avatar;
    $('.ld-ms', L).innerHTML = info.missions?.length ? `<span>${info.missions.length} misiones te esperan</span><div>${info.missions.map(ic => I(ic, 34)).join('')}</div>` : '';
    $('.ld-bulb', L).innerHTML = I('sparkle', 30);
    $('.tip', L).textContent = tip;
    this.progress(0, 'Preparando…');
  }
  progress(p, msg) { const L = this.loading, v = Math.max(0, Math.min(1, p)); $('.bar i', L).style.width = (v * 100).toFixed(0) + '%'; $('.ld-av', L).style.left = `calc(${(v * 100).toFixed(1)}% - 22px)`; $('.ld-pc', L).textContent = Math.round(v * 100) + '%'; if (msg) $('.msg', L).textContent = msg; }
  hideLoading() { this.loading.style.transition = 'opacity .6s'; this.loading.style.opacity = 0; setTimeout(() => this.loading.classList.add('hidden'), 650); }

  // ---------- HUD ----------
  buildHUD(game) {
    this.destroyHUD();
    this.game = game;
    const town = game.kind === 'town';
    const h = el(`<div id="hud">
      <div id="compass"><canvas></canvas><span id="cdist"></span></div>
      <div id="tl">
        <div id="quest"><div class="ic"><span class="qe"></span></div><div class="qtxt"><small></small><b class="qt"></b><div class="qrow"><span class="qpips"></span><span class="qd"></span></div></div></div>
        <div id="ribbons">${town ? `<span class="tname">${esc(game.def.name.split(' /')[0])}</span><span class="dots">${game.missions.map(M => `<i data-m="${M.i}" title="${esc(M.title)}"></i>`).join('')}</span>`
          : `${RIBBONS.map(r => `<i data-r="${r.id}" title="${r.name}"></i>`).join('')}<span class="eg">${I('eguzkilore', 18)} <b>0/${EGUZKILORES.length}</b></span>`}</div>
      </div>
      <div id="topright">
        <div class="rbtns">
          <button class="round hidden" id="bBino" aria-label="Prismáticos (F)">${ICON.bino}</button>
          <button class="round" id="bBook" aria-label="Cuaderno (C)">${ICON.book}</button>
          <button class="round" id="bMap" aria-label="Mapa (M)">${ICON.map}</button>
          <button class="round" id="bMenu" aria-label="Menú (Esc)">${ICON.menu}</button>
        </div>
        <div id="mini"><canvas width="248" height="248"></canvas><div id="clock"><span class="ci"></span><span class="ct">09:00</span></div></div>
      </div>
      <div id="prompt" class="hidden"><kbd>E</kbd><span></span></div>
      <div id="toast"></div>
      <div id="mg" class="glass hidden"></div>
      <div id="stick"><i></i></div>
      <div id="stickHint"><i></i><span>Mover</span></div>
      <div id="controls">
        <button class="cbtn" id="cRun" aria-label="Correr" title="Correr">${ICON.run}</button>
        <button class="cbtn" id="cJump" aria-label="Saltar" title="Saltar">${ICON.jump}</button>
        <button class="cbtn big off" id="cAct" aria-label="Acción" title="Acción">${ICON.hand}</button>
      </div>
    </div>`);
    this.root.appendChild(h);
    this.hud = h;
    this.fade ||= document.body.appendChild(el('<div id="fade"></div>'));
    this.cine ||= document.body.appendChild(el('<div id="cine"></div>'));
    this.subtitle ||= document.body.appendChild(el('<div id="subtitle"></div>'));
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
      if (on) { sh.classList.add('gone'); stick.style.left = x + 'px'; stick.style.top = y + 'px'; knob.style.transform = `translate(${dx}px,${dy}px)`; }
    };
    this.buildMapCanvas(game.mapHouses ? game.mapHouses() : []);
    this.mini = $('#mini canvas', h).getContext('2d');
    this.compass = $('#compass canvas', h);
    this.lastQuestIcon = null;
    if (town) this.refreshDots();
  }
  destroyHUD() { this._dlgCleanup?.(); this.closeModal(); this.hud?.remove(); this.hud = null; this.bino?.remove(); this.bino = null; this.setCinematic?.(false); this.input.onStick = null; }
  refreshDots() { if (!this.hud || this.game.kind !== 'town') return; for (const i of this.hud.querySelectorAll('.dots i')) { const M = this.game.missions[+i.dataset.m]; i.className = M.done ? 'on' : M.i === this.game.tracked ? 'cur' : ''; } }
  setQuest(q) {
    const b = $('#quest', this.hud);
    if (!q) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden');
    if (this.lastQuestIcon !== q.icon) { $('.qe', b).innerHTML = I(q.icon, 34); this.lastQuestIcon = q.icon; }
    if ($('.qt', b).textContent !== q.step) { $('.qt', b).textContent = q.step; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); this.refreshDots(); }
    $('small', b).textContent = q.title;
    const pips = $('.qpips', b), key = (q.nSteps || 0) + ':' + (q.stepIdx ?? -1);
    if (pips.dataset.k !== key) { pips.dataset.k = key; pips.innerHTML = q.nSteps ? Array.from({ length: q.nSteps }, (_, i) => `<i class="${i < q.stepIdx ? 'ok' : i === q.stepIdx ? 'now' : ''}"></i>`).join('') : ''; }
    $('.qd', b).textContent = q.dist != null ? (q.dist < 1000 ? `${Math.round(q.dist)} m` : '') : '';
  }
  setRibbons(have, eg) {
    if (!this.hud) return;
    for (const i of this.hud.querySelectorAll('#ribbons i[data-r]')) { const r = RIBBONS.find(x => x.id === i.dataset.r); const on = have.includes(r.id); i.classList.toggle('on', on); i.style.background = on ? r.color : ''; }
    const e = $('#ribbons .eg b', this.hud); if (e) e.textContent = `${eg}/${EGUZKILORES.length}`;
  }
  setPrompt(text) {
    if (!this.hud) return;
    const p = $('#prompt', this.hud), a = $('#cAct', this.hud);
    if (!text) { p.classList.add('hidden'); a.classList.add('off'); this.promptText = null; return; }
    if (this.promptText !== text) {
      $('span', p).textContent = text; this.promptText = text;
      // el icono del botón de acción dice lo que va a pasar
      const k = /pelota/i.test(text) ? 'pelota' : /^Hablar/.test(text) ? 'talk' : /^Saludar/.test(text) ? 'wave' : /^Beber/.test(text) ? 'drop'
        : /^(Mirar|Examinar|Observar|Leer|Ver)/.test(text) ? 'look' : 'hand';
      if (a.dataset.k !== k) { a.dataset.k = k; a.innerHTML = ICON[k]; }
    }
    p.classList.remove('hidden'); a.classList.remove('off');
  }
  setClock(s, night) { if (!this.hud) return; const c = $('#clock', this.hud); $('.ct', c).textContent = s; if (this.night !== night) { this.night = night; $('.ci', c).innerHTML = night ? ICON.moon : ICON.sun; } }
  showBinoButton() { $('#bBino', this.hud)?.classList.remove('hidden'); }
  hideBinoButton() { $('#bBino', this.hud)?.classList.add('hidden'); }
  toast(text, icon = 'sparkle', ms = 2800) {
    if (!this.hud) return;
    const t = $('#toast', this.hud);
    t.innerHTML = `${I(icon, 30)}<span>${esc(text)}</span>`;
    t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('on'), ms);
  }
  // Voz del narrador: frase en cursiva que aparece y se desvanece (pistas y momentos de misterio)
  whisper(text, ms = 4000) {
    if (!this.hud) return;
    let w = $('#whisper', this.hud); if (!w) { w = el('<div id="whisper"><span></span></div>'); this.hud.appendChild(w); }
    $('span', w).textContent = text; w.classList.remove('on'); void w.offsetWidth; w.classList.add('on');
    clearTimeout(this.whT); this.whT = setTimeout(() => w.classList.remove('on'), ms);
  }
  hudVisible(v) { if (this.hud) this.hud.style.display = v ? '' : 'none'; }
  setMG(html) { if (!this.hud) return; const m = $('#mg', this.hud); if (!html) m.classList.add('hidden'); else { m.innerHTML = html; m.classList.remove('hidden'); } }
  setCinematic(on, text) { if (!this.cine) return; this.cine.classList.toggle('on', on); this.subtitle.textContent = text || ''; }
  async fadeOut() { this.fade.classList.add('on'); await wait(650); }
  async fadeIn() { this.fade.classList.remove('on'); await wait(300); }

  // ---------- Diálogo ----------
  // lines: [{who, look, icon, text, choices:[...], onChoice}] -> devuelve el índice de la última elección
  dialog(lines) {
    return new Promise(resolve => {
      this.closeModal();
      const d = el(`<div id="dialog" class="glass"><div class="face"></div><div class="body"><h3></h3><p></p><div class="choices"></div><div class="next">${this.input.touch ? 'Toca para seguir' : 'E / Espacio / clic'} <b>›</b></div></div></div>`);
      (this.hud || document.body).appendChild(d);
      this.dialogOpen = true; document.body.classList.add('talking');
      let i = 0, typing = null, full = '', lastChoice = -1, lastFace = null;
      const show = () => {
        const L = lines[i];
        this.onDialogLine?.(L);
        const fk = L.look ? JSON.stringify(L.look) : L.icon || 'talk';
        if (fk !== lastFace) {
          lastFace = fk;
          const url = L.look ? portrait(L.look, 'bust', true) : '';
          $('.face', d).innerHTML = url ? `<img src="${url}" alt="">` : I(L.icon || 'talk', 64);
        }
        $('h3', d).textContent = L.who || '';
        full = L.text || ''; let k = 0;
        const p = $('p', d); p.textContent = '';
        const ch = $('.choices', d); ch.innerHTML = '';
        $('.next', d).style.display = L.choices ? 'none' : '';
        clearInterval(typing);
        typing = setInterval(() => {
          k += 2; p.textContent = full.slice(0, k);
          if (k % 6 === 0) this.sound.ui('talk');
          if (k >= full.length) { clearInterval(typing); typing = null; if (L.choices) showChoices(L); }
        }, 20);
        L.onShow?.();
      };
      const showChoices = (L) => {
        const ch = $('.choices', d);
        L.choices.forEach((c, j) => {
          const b = el(`<button><b>${j + 1}</b>${esc(c)}</button>`);
          b.onclick = (e) => { e.stopPropagation(); lastChoice = j; this.sound.ui('click'); const r = L.onChoice?.(j); if (r && r.length) { lines.splice(i + 1, 0, ...r); } advance(true); };
          ch.appendChild(b);
        });
      };
      const advance = (fromChoice) => {
        const L = lines[i];
        if (typing) { clearInterval(typing); typing = null; $('p', d).textContent = full; if (L.choices) showChoices(L); return; }
        if (L.choices && !fromChoice) return;
        i++;
        if (i >= lines.length) { cleanup(); resolve(lastChoice); return; }
        show();
      };
      const onKey = (e) => { const k = e.key.toLowerCase(); e.stopImmediatePropagation(); if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); advance(false); } else if (/^[1-4]$/.test(k)) { const b = d.querySelectorAll('.choices button')[+k - 1]; b?.click(); } };
      const onTap = (e) => { if (e.target.closest('.choices')) return; advance(false); };
      d.addEventListener('pointerdown', onTap);
      const canvasTap = (e) => { if (e.target.id === 'c') advance(false); };
      addEventListener('keydown', onKey, true);
      addEventListener('pointerdown', canvasTap);
      const cleanup = () => { this._dlgCleanup = null; clearInterval(typing); removeEventListener('keydown', onKey, true); removeEventListener('pointerdown', canvasTap); d.remove(); this.dialogOpen = false; document.body.classList.remove('talking'); };
      this._dlgCleanup = () => { cleanup(); resolve(-1); };
      show();
    });
  }

  // ---------- Premio (Salazar) ----------
  reward({ icon, ribbon, title, text, stamp, button = 'Seguir jugando' }) {
    return new Promise(res => {
      this.sound.fanfare();
      const r = el(`<div id="reward"><div class="card2">
        ${stamp ? `<div class="stamp">${stamp}</div>` : ribbon ? `<div class="rib" style="background:${ribbon}"></div>` : `<div class="big">${I(icon || 'star', 96)}</div>`}
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

  closeModal() { if (this.modal) { this.mapView?.destroy(); this.mapView = null; this.modal.remove(); this.modal = null; this.onModalClose?.(); } }
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
  closeBtn() { return `<button class="close" aria-label="Cerrar">${I('close', 22)}</button>`; }

  // ---------- Cuaderno ----------
  openBook(tab = 'misiones') {
    if (this.game.kind === 'town') return this.openTownBook(tab);
    const g = this.game, st = g.state;
    const tabs = [['misiones', 'Misiones'], ['saberes', 'Saberes'], ['animales', 'Animales'], ['pasaporte', 'Pasaporte']];
    const s = this.screen(`<header><h2>${I('book', 30)} Cuaderno de ${esc(st.name)}</h2>${this.closeBtn()}</header>
      <div class="tabs">${tabs.map(([id, n]) => `<button data-t="${id}" class="${id === tab ? 'on' : ''}">${n}</button>`).join('')}</div><div class="pbody"></div>`);
    const body = $('.pbody', s);
    const render = (t) => {
      s.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      if (t === 'misiones') {
        const ids = Object.keys(QUESTS);
        body.innerHTML = `<div class="qlist">${ids.map(id => {
          const q = QUESTS[id], qs = st.quests[id] || { state: 'locked' };
          const rib = RIBBONS.find(r => r.id === q.ribbon);
          const label = { locked: 'Bloqueada', available: 'Nueva', active: 'En curso', done: 'Hecha' }[qs.state];
          const stepTxt = qs.state === 'done' ? '¡Completada!' : qs.state === 'locked' ? 'Reúne las 8 cintas' : g.stepText(id);
          return `<div class="qitem ${st.tracked === id ? 'active' : ''} ${qs.state}" data-q="${id}"><div class="qi">${I(q.icon, 40)}</div><div><b>${q.title}</b><small>${esc(stepTxt)}</small></div>
            <span class="state">${label}</span>${rib ? `<div class="rb" style="background:${qs.state === 'done' ? rib.color : '#d9ccb8'}"></div>` : ''}</div>`;
        }).join('')}</div><p class="keys" style="margin-top:12px">Toca una misión para seguirla con la flecha.</p>`;
        body.querySelectorAll('.qitem').forEach(n => n.onclick = () => { const id = n.dataset.q; if (['active', 'available'].includes(st.quests[id]?.state)) { g.track(id); this.sound.ui('click'); render('misiones'); } });
      } else if (t === 'saberes' || t === 'animales') {
        const list = CARDS.filter(c => t === 'animales' ? c.cat === 'Animales' : c.cat !== 'Animales');
        const cats = [...new Set(list.map(c => c.cat))];
        body.innerHTML = `<div class="stats"><div>${I('book')} ${st.cards.length}/${CARDS.length} cartas</div>${t === 'animales' ? `<div>${I('binoculars')} ${st.observed.length}/${Object.keys(SPECIES_OBS).length} observados</div>` : ''}</div>` +
          cats.map(cat => `<div class="sectionT">${cat}</div><div class="cards">${list.filter(c => c.cat === cat).map(c => {
            const has = st.cards.includes(c.id);
            return `<button class="card ${has ? '' : 'locked'}" data-c="${c.id}"><div class="in"><div class="f"><small>${c.cat}</small><div class="e">${has ? I(c.icon, 56) : I('lock', 44)}</div><b>${has ? c.title : '¿?'}</b></div><div class="b">${has ? esc(c.text) : 'Sigue explorando para descubrir esta carta.'}</div></div></button>`;
          }).join('')}</div>`).join('');
        body.querySelectorAll('.card').forEach(c => c.onclick = () => { if (!c.classList.contains('locked')) { c.classList.toggle('flip'); this.sound.ui('click'); } });
      } else {
        const r = st.ribbons.length;
        body.innerHTML = `<div class="stats"><div>${I('ribbon')} ${r}/8 cintas</div><div>${I('eguzkilore')} ${st.eguz.length}/${EGUZKILORES.length} eguzkilores</div><div>${I('book')} ${st.cards.length} cartas</div><div>${I('star')} ${st.stars} estrellas</div></div>
          <div class="sectionT">Cintas para la fiesta</div><div class="cards">${RIBBONS.map(rb => `<div class="card ${st.ribbons.includes(rb.id) ? '' : 'locked'}" style="height:120px"><div class="in"><div class="f" style="align-items:center;justify-content:center"><div style="width:22px;height:54px;background:${rb.color};clip-path:polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)"></div><b style="text-align:center">${rb.name}</b><small>${rb.eu}</small></div></div></div>`).join('')}</div>
          <div class="sectionT">Sello del pasaporte</div><p>${st.done ? '¡Sellado en Muskilda! Eres parte de la fiesta del valle.' : 'Consigue las ocho cintas y baila en Muskilda para sellarlo.'}</p>
          <p class="keys">Otsagabia/Ochagavía está en el Pirineo navarro. El pueblo del juego es una interpretación: la posición de casas y calles no es un plano exacto.</p>`;
      }
    };
    s.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { this.sound.ui('click'); render(b.dataset.t); });
    render(tab);
  }
  openTownBook(tab) {
    const g = this.game, d = g.def, c = g.comarca;
    const tabs = [['misiones', 'Misiones'], ['lugares', 'Lugares'], ['comarca', c?.name || 'Comarca']];
    const s = this.screen(`<header><h2>${I('book', 30)} ${esc(d.name)}</h2>${this.closeBtn()}</header>
      <div class="tabs">${tabs.map(([id, n]) => `<button data-t="${id}" class="${id === tab ? 'on' : ''}">${esc(n)}</button>`).join('')}</div><div class="pbody"></div>`);
    const body = $('.pbody', s);
    const render = (t) => {
      s.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      if (t === 'misiones') {
        const doneN = g.missions.filter(M => M.done).length;
        body.innerHTML = `<div class="tprog"><div class="bar"><i style="width:${doneN / g.missions.length * 100}%"></i></div><span>${doneN}/${g.missions.length} misiones · ${g.ts.stamp ? 'sello conseguido' : 'completa todas para ganar el sello'}</span></div>
        <div class="qlist">${g.missions.map(M => {
          const st = M.done ? 'done' : M.step > 0 ? 'active' : 'available';
          const steps = M.steps();
          return `<div class="qitem ${g.tracked === M.i ? 'active' : ''} ${st}" data-m="${M.i}"><div class="qi">${I(M.icon, 40)}</div><div class="qb"><b>${esc(M.title)}</b>
            <ol class="steps">${steps.map((x, k) => `<li class="${M.done || k < M.step ? 'ok' : k === M.step ? 'now' : ''}">${esc(x)}</li>`).join('')}</ol>
            <small>${M.host ? 'Con ' + esc(M.host.name) : ''}</small></div>
            <span class="state">${{ done: 'Hecha', active: 'En curso', available: 'Nueva' }[st]}</span></div>`;
        }).join('')}</div><p class="keys">Toca una misión para seguirla con la luz dorada.</p>`;
        body.querySelectorAll('.qitem').forEach(n => n.onclick = () => { g.setBook(g.missions[+n.dataset.m]); render('misiones'); });
      } else if (t === 'lugares') {
        const V = g.missions.find(M => M.type === 'visit');
        const places = V ? V.places : [];
        body.innerHTML = `<p>${esc(d.intro || '')}</p><div class="cards">${places.map(p => { const has = g.P.cards.includes(d.id + ':' + p.name); return `<button class="card ${has ? '' : 'locked'}"><div class="in"><div class="f"><small>${p.kind === 'church' ? 'Iglesia' : 'Patrimonio'}</small><div class="e">${has ? I(p.kind === 'church' ? 'church' : p.kind, 56) : I('lock', 44)}</div><b>${has ? esc(p.name) : '¿?'}</b></div><div class="b">${has ? esc(p.text) : 'Visítalo para descubrirlo.'}</div></div></button>`; }).join('')}</div>`;
        body.querySelectorAll('.card').forEach(x => x.onclick = () => { if (!x.classList.contains('locked')) { x.classList.toggle('flip'); this.sound.ui('click'); } });
      } else {
        const C = c?.culture || {};
        const block = (ic, k, o) => o ? `<div class="cult">${I(ic, 44)}<div><small>${k}${o.date ? ' · ' + esc(o.date) : ''}</small><b>${esc(o.title)}</b><p>${esc(o.text)}</p></div></div>` : '';
        body.innerHTML = `<div class="cultgrid">${block('dance', 'Danza', C.dance)}${block('mask', 'Carnaval', C.carnival)}${block('flag', 'Fiesta', C.festival)}${block('ribbon', 'Traje', C.costume)}</div>
          ${c?.nature ? `<div class="sectionT">Naturaleza de ${esc(c.name)}</div><p><b>Animales:</b> ${esc(c.nature.animals.join(', '))}<br><b>Árboles:</b> ${esc(c.nature.trees.join(', '))}<br><b>Flores:</b> ${esc(c.nature.flowers.join(', '))}</p>` : ''}`;
      }
    };
    s.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { this.sound.ui('click'); render(b.dataset.t); });
    render(tab);
  }

  // ---------- Mapa ----------
  buildMapCanvas(houses = []) {
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
    // fondo del mapa grande: solo el relieve, suave (interpolado); bosque, campos, calles, agua y casas van en vector
    const base = document.createElement('canvas'); base.width = base.height = S;
    { const bg = base.getContext('2d'), bi = bg.createImageData(S, S), bd = bi.data, at = (a, fx, fy) => { const i = Math.min(N - 2, Math.floor(fx)), j = Math.min(N - 2, Math.floor(fy)), u = fx - i, w = fy - j, q = j * N + i; return (a[q] * (1 - u) + a[q + 1] * u) * (1 - w) + (a[q + N] * (1 - u) + a[q + N + 1] * u) * w; };
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const fx = x * k, fy = y * k, h = at(H, fx, fy), hx = at(H, fx + 1, fy) - h, hz = at(H, fx, fy + 1) - h;
        const shade = clamp(1 + (-hx - hz) * 0.22, 0.65, 1.25), snow = clamp((h - 128) / 14, 0, 1);
        const o = (y * S + x) * 4;
        bd[o] = (124 + (238 - 124) * snow) * shade; bd[o + 1] = (172 + (240 - 172) * snow) * shade; bd[o + 2] = (90 + (242 - 90) * snow) * shade; bd[o + 3] = 255;
      }
      bg.putImageData(bi, 0, 0); }
    this.mapBase = base; this.mapHouseList = houses; this.mapVec = null;
    // el mapa en vector se prepara en un momento tranquilo, para que se abra al instante
    const job = this.mapVecJob = buildMapVectorsIdle((vec) => { if (this.mapVecJob === job) { this.mapVec = vec; this.mapView?.redraw?.(); } });
    const toM = (x, z) => [(x + HALF) / (2 * HALF) * S, (z + HALF) / (2 * HALF) * S];
    g.fillStyle = '#b44a3a';
    for (const hs of houses) { const [x, y] = toM(hs.x, hs.z); g.save(); g.translate(x, y); g.rotate(-(hs.ry || 0)); g.fillRect(-(hs.w || 8) / 4, -(hs.d || 8) / 4, (hs.w || 8) / 2, (hs.d || 8) / 2); g.restore(); }
    this.mapImg = c;
    this.toMap = toM;
  }
  drawIcon(g, name, x, y, r) {
    g.fillStyle = 'rgba(255,250,240,.92)'; g.strokeStyle = 'rgba(43,29,18,.8)'; g.lineWidth = Math.max(1.5, r * 0.14);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    const im = iconImage(name); if (im.complete && im.naturalWidth) g.drawImage(im, x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
  }
  drawPlayer(g, x, y, heading, s = 1) {
    g.save(); g.translate(x, y); g.rotate(-heading + Math.PI);
    g.fillStyle = '#ff4f6d'; g.strokeStyle = '#fff'; g.lineWidth = 2.5 * s;
    g.beginPath(); g.moveTo(0, -11 * s); g.lineTo(8 * s, 9 * s); g.lineTo(0, 4 * s); g.lineTo(-8 * s, 9 * s); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  // Brújula superior: puntos cardinales, misiones cercanas y el objetivo con su distancia
  drawCompass(player, camYaw, markers, target) {
    const c = this.compass; if (!c || !c.offsetParent) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), Hh = Math.round(c.clientHeight * dpr);
    if (!W || !Hh) return;
    if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
    const g = c.getContext('2d'); g.clearRect(0, 0, W, Hh);
    const span = Math.PI * 0.5, k = (W / 2) / span, ly = Hh * 0.42, ty = Hh * 0.8;
    const wrap = (a) => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const fade = (x) => Math.max(0, Math.min(1, Math.min(x, W - x) / (W * 0.14)));
    const cs = Math.cos(camYaw), sn = Math.sin(camYaw);
    const rel = (x, z) => { const dx = x - player.pos.x, dz = z - player.pos.z; return Math.atan2(dx * cs - dz * sn, -(dx * sn + dz * cs)); };
    const NAMES = document.documentElement.lang === 'eu' ? ['I', 'IE', 'E', 'HE', 'H', 'HM', 'M', 'IM'] : ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 24; i++) {
      const a = wrap(camYaw + i * Math.PI / 12); if (Math.abs(a) > span) continue;
      const x = W / 2 + a * k, al = fade(x); if (al <= 0) continue;
      g.globalAlpha = al;
      if (i % 3 === 0) {
        const n = NAMES[i / 3], card = n.length === 1;
        g.font = `900 ${Math.round((card ? 14 : 10.5) * dpr)}px Nunito, sans-serif`;
        g.fillStyle = (n === 'N' || n === 'I') ? '#FFD700' : card ? '#ffffff' : 'rgba(230,220,255,.75)';
        g.fillText(n, x, ly);
        g.fillRect(x - dpr, ty - 4 * dpr, 2 * dpr, 7 * dpr);
      } else { g.fillStyle = 'rgba(230,220,255,.45)'; g.fillRect(x - dpr * 0.5, ty - 2 * dpr, dpr, 4 * dpr); }
    }
    g.globalAlpha = 1;
    for (const m of markers || []) {
      if (!m.icon || m.small || (target && Math.abs(m.x - target.x) + Math.abs(m.z - target.z) < 1)) continue;
      const a = rel(m.x, m.z); if (Math.abs(a) > span * 0.85) continue;
      const x = W / 2 + a * k; g.globalAlpha = fade(x); this.drawIcon(g, m.icon, x, ty, 6.5 * dpr); g.globalAlpha = 1;
    }
    // objetivo: rombo en la línea inferior; si queda detrás, flecha en el borde. La distancia va en su etiqueta.
    const dEl = this.hud && $('#cdist', this.hud);
    if (target) {
      const a0 = rel(target.x, target.z), out = Math.abs(a0) > span * 0.82, a = Math.max(-span * 0.82, Math.min(span * 0.82, a0));
      const x = W / 2 + a * k, sz = 6.5 * dpr;
      g.save(); g.translate(x, ty); g.shadowColor = 'rgba(255,215,0,.9)'; g.shadowBlur = 10 * dpr;
      g.fillStyle = '#FFD700'; g.strokeStyle = '#2e1d00'; g.lineWidth = 1.5 * dpr; g.beginPath();
      if (out) { const d = Math.sign(a0); g.moveTo(d * sz * 1.3, 0); g.lineTo(-d * sz * 0.4, -sz); g.lineTo(-d * sz * 0.4, sz); }
      else { g.moveTo(0, -sz); g.lineTo(sz, 0); g.lineTo(0, sz); g.lineTo(-sz, 0); }
      g.closePath(); g.fill(); g.shadowBlur = 0; g.stroke(); g.restore();
      if (dEl) { const d = Math.round(Math.hypot(target.x - player.pos.x, target.z - player.pos.z)); const t = d + ' m'; if (dEl.textContent !== t) dEl.textContent = t; dEl.style.left = Math.max(24, Math.min(W / dpr - 24, x / dpr)) + 'px'; dEl.style.display = ''; }
    } else if (dEl) dEl.style.display = 'none';
    // marca central
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W / 2 - 5 * dpr, 0); g.lineTo(W / 2 + 5 * dpr, 0); g.lineTo(W / 2, 6 * dpr); g.closePath(); g.fill();
  }
  updateMinimap(player, camYaw, markers, target) {
    this.drawCompass(player, camYaw, markers, target);
    if (!this.mini || !this.mini.canvas.offsetParent) return;
    const g = this.mini, S = 248, zoom = 1.8;
    const mpp = (2 * HALF) / 512;
    g.save(); g.clearRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.rotate(camYaw);
    const px = (player.pos.x + HALF) / mpp, pz = (player.pos.z + HALF) / mpp;
    g.drawImage(this.mapImg, -px * zoom, -pz * zoom, 512 * zoom, 512 * zoom);
    for (const m of markers) {
      const x = ((m.x + HALF) / mpp - px) * zoom, y = ((m.z + HALF) / mpp - pz) * zoom;
      if (Math.hypot(x, y) > S / 2 - 12) continue;
      g.save(); g.translate(x, y); g.rotate(-camYaw); this.drawIcon(g, m.icon, 0, 0, m.small ? 7 : 11); g.restore();
    }
    if (target) {
      let x = ((target.x + HALF) / mpp - px) * zoom, y = ((target.z + HALF) / mpp - pz) * zoom;
      const d = Math.hypot(x, y), R = S / 2 - 14;
      if (d > R) { x *= R / d; y *= R / d; }
      g.save(); g.translate(x, y); g.rotate(-camYaw);
      g.fillStyle = '#FFD700'; g.strokeStyle = '#3a2200'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.stroke();
      g.restore();
    }
    g.restore();
    this.drawPlayer(g, S / 2, S / 2, player.heading - camYaw, 1.3);
  }
  openMap() {
    const g = this.game, town = g.kind === 'town', touch = this.input.touch;
    const s = this.screen(`<header><h2>${I('map', 30)} ${town ? 'Mapa de ' + esc(g.def.name) : 'Mapa del valle'}</h2>${this.closeBtn()}</header><div class="pbody"><div id="mapbox"><canvas></canvas></div>
      <div class="legend"><span>${I('exclaim', 20)} misión nueva</span><span>${I('check', 20)} misión hecha</span><span>${I('pin', 20)} objetivo</span><span>${I('pelota', 20)} frontón</span>${town ? '' : `<span>${I('eguzkilore', 20)} eguzkilore</span>`}
      <em>${touch ? 'Pellizca o usa + y − para ampliar · arrastra para moverte · toca un sitio' : 'Rueda o + y − para ampliar · arrastra para moverte · haz clic en un sitio'}</em></div></div>`, 'mapscr');
    this.mapView = mountMapView(this, $('#mapbox', s), { fitRadius: town ? 260 : 240 });
  }

  // ---------- Menú ----------
  openMenu() {
    const g = this.game, st = g.state, town = g.kind === 'town';
    const S = town ? g.P.settings : st.settings;
    const s = this.screen(`<header><h2>${I('gear', 30)} Pausa</h2>${this.closeBtn()}</header><div class="pbody">
      <div class="btns col top"><button class="btn primary close">${I('play', 22)} Seguir jugando</button><button class="btn" id="mHome">${I('plaza', 22)} Ir a la plaza de ${esc(town ? g.def.name.split(' /')[0] : 'Otsagabia')}</button><button class="btn" id="mExit">${I('map', 22)} Salir al mapa de Navarra</button>${town ? '' : `<button class="btn danger" id="mReset">${I('close', 20)} Borrar partida del valle</button>`}</div>
      <label>Música <input type="checkbox" id="mMusic" ${S.music ? 'checked' : ''}></label>
      <label>Volumen <input type="range" id="mVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
      <label>Calidad gráfica <select id="mQ"><option value="low">Baja (más fluido)</option><option value="mid">Media</option><option value="high">Alta</option></select></label>
      <p id="mQnote" class="keys" hidden>La nueva calidad se aplicará al cargar el próximo pueblo.</p>
      <label>Paso del tiempo <select id="mT"><option value="1">Normal</option><option value="0">Detenido</option><option value="4">Rápido</option></select></label>
      <div class="keys">${this.input.touch ? 'Izquierda: caminar · Derecha: mirar · Botón amarillo: acción · botones de correr y saltar' : '<kbd>WASD</kbd> caminar · <kbd>Mayús</kbd> correr · <kbd>Espacio</kbd> saltar · <kbd>E</kbd> hablar/usar · <kbd>F</kbd> prismáticos · <kbd>C</kbd> cuaderno · <kbd>M</kbd> mapa · ratón o flechas para la cámara · rueda: zoom'}</div>
    </div>`, 'menu');
    $('#mQ', s).value = S.quality || (this.input.touch ? 'mid' : 'high'); $('#mT', s).value = String(S.timeSpeed ?? 1);
    const save = () => g.save();
    $('#mMusic', s).onchange = e => { S.music = e.target.checked; this.sound.setMusic(e.target.checked); save(); };
    $('#mVol', s).oninput = e => { S.volume = +e.target.value; this.sound.setVolume(+e.target.value); save(); };
    $('#mQ', s).onchange = e => { S.quality = e.target.value; save(); this.onQuality?.(e.target.value); $('#mQnote', s).hidden = false; };
    $('#mT', s).onchange = e => { S.timeSpeed = +e.target.value; g.applySettings(); save(); };
    $('#mHome', s).onclick = () => { this.closeModal(); g.teleport(PLACES.plaza.x - 6, PLACES.plaza.z + 6); };
    $('#mExit', s).onclick = () => { this.closeModal(); g.save(); g.onExit?.(); };
    const rb = $('#mReset', s);
    if (rb) rb.onclick = () => { if (rb.dataset.sure) { this.closeModal(); g.resetState(st.name); } else { rb.dataset.sure = 1; rb.textContent = '¿Seguro? Pulsa otra vez para borrar'; this.sound.ui('error'); } };
  }

  // ---------- Prismáticos ----------
  binoculars(on) {
    if (on && !this.bino) {
      this.bino = el(`<div id="bino"><svg class="mask" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><defs><mask id="bm"><rect x="-200" y="-200" width="560" height="500" fill="#fff"/><circle cx="58" cy="50" r="36" fill="#000"/><circle cx="102" cy="50" r="36" fill="#000"/></mask></defs><rect x="-200" y="-200" width="560" height="500" fill="#0b0a10" mask="url(#bm)"/></svg><div class="cross"></div><div class="bdir"><i></i></div><div class="bcomp"></div><div class="bgoal"></div><div class="label"></div><div class="bhint">${this.input.touch ? 'Arrastra para mirar · botón amarillo para anotar · botón de prismáticos para salir' : 'Mueve el ratón para mirar · E para anotar · F para salir'}</div></div>`);
      document.body.appendChild(this.bino);
    } else if (!on && this.bino) { this.bino.remove(); this.bino = null; }
  }
  binoTarget(label, lock, hint = null) {
    if (!this.bino) return; $('.label', this.bino).textContent = label || ''; $('.cross', this.bino).classList.toggle('lock', !!lock);
    const d = $('.bdir', this.bino); d.style.opacity = hint == null ? 0 : 1; if (hint != null) d.style.transform = `rotate(${-hint}rad)`;
    $('.label', this.bino).style.display = label ? '' : 'none';
  }
  /** Panel del objetivo (montes por descubrir) y brújula de hacia dónde se mira. */
  binoInfo(goalHtml, compass) {
    if (!this.bino) return;
    const g = $('.bgoal', this.bino); if (g._h !== goalHtml) { g._h = goalHtml; g.innerHTML = goalHtml || ''; g.style.display = goalHtml ? '' : 'none'; }
    $('.bcomp', this.bino).textContent = compass || '';
  }

  // ---------- Ritmo (danza) ----------
  rhythm(onPad) {
    const arrows = ['M15 5l-8 7 8 7', 'M5 15l7-8 7 8', 'M5 9l7 8 7-8', 'M9 5l8 7-8 7'].map(d => `<svg viewBox="0 0 24 24" width="30" height="30"><path d="${d}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    const r = el(`<div id="rhythm"><div class="fb"></div>${[0, 1, 2, 3].map(i => `<div class="lane" style="left:${i * 25}%"></div>`).join('')}<div class="target"></div><div class="notes"></div>
      <div class="pads">${arrows.map((a, i) => `<button data-i="${i}">${a}</button>`).join('')}</div></div>`);
    document.body.appendChild(r);
    r.querySelectorAll('.pads button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); onPad(+b.dataset.i); }));
    return {
      el: r,
      addNote: (lane) => { const n = el(`<div class="note l${lane}" style="left:${lane * 25 + 12.5}%">${arrows[lane]}</div>`); $('.notes', r).appendChild(n); return n; },
      flash: (i) => { const b = r.querySelectorAll('.pads button')[i]; b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 120); },
      feedback: (t) => { $('.fb', r).textContent = t; },
      remove: () => r.remove(),
    };
  }
}

export const wait = (ms) => new Promise(r => setTimeout(r, ms));
