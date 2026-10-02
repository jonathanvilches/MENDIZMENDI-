// Interfaz del partido de fútbol (DOM): marcador, mensajes grandes, comentarios, joystick dinámico, botones (al
// defender, Pase pasa a ser Robo y Tiro, Entrada), barras de energía y de carga, flecha del jugador fuera de pantalla,
// tanda de penaltis, consejos del tutorial, menú previo, pausa y pantalla final. Todo con el prefijo «fb-», sin
// solaparse en móvil (vertical y horizontal) y escritorio.
const CSS = `
.fb-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:Nunito,system-ui,sans-serif;color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.fb-root *{box-sizing:border-box}
.fb-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);left:64px;right:64px;display:flex;flex-direction:column;align-items:center;gap:6px}
.fb-score{display:flex;align-items:stretch;border-radius:14px;overflow:hidden;background:rgba(16,10,30,.86);border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 18px rgba(0,0,0,.3);max-width:100%}
.fb-team{display:flex;align-items:center;gap:7px;padding:5px 10px;font-weight:900;font-size:14px;letter-spacing:.04em;min-width:0}
.fb-team i{width:12px;height:20px;border-radius:3px;flex:none;box-shadow:0 0 0 1.5px rgba(255,255,255,.7)}
.fb-team span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22vw}.fb-team span.fb-sn{display:none}
.fb-team b{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:26px;line-height:1;min-width:1em;text-align:center}
.fb-clock{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 10px;background:rgba(255,255,255,.1);font-weight:900;font-size:15px;line-height:1.05;font-variant-numeric:tabular-nums}
.fb-clock small{font-size:10px;opacity:.8;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.fb-say{font-size:14px;font-weight:800;padding:4px 12px;border-radius:12px;background:rgba(16,10,30,.6);opacity:0;transition:opacity .2s;max-width:min(92vw,520px);text-align:center}
.fb-say.on{opacity:1}
.fb-pen{display:none;gap:10px;font-size:12px;font-weight:800;padding:4px 10px;border-radius:10px;background:rgba(16,10,30,.7)}
.fb-pen.on{display:grid;grid-template-columns:auto auto;align-items:center}
.fb-pen u{display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 2px;background:rgba(255,255,255,.25);text-decoration:none;vertical-align:middle}
.fb-pen u.g{background:#3fd36a}.fb-pen u.x{background:#e0453a}
.fb-pause,.fb-cam{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:rgba(16,10,30,.66);color:#fff;pointer-events:auto;cursor:pointer;display:grid;place-items:center;padding:0;box-shadow:0 3px 12px rgba(0,0,0,.35)}
.fb-pause{left:calc(env(safe-area-inset-left,0px) + 10px)}.fb-cam{right:calc(env(safe-area-inset-right,0px) + 10px)}
.fb-pause svg,.fb-cam svg{width:20px;height:20px}
.fb-msg{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.85);opacity:0;transition:opacity .2s,transform .25s cubic-bezier(.2,1.4,.4,1);text-align:center;pointer-events:none;max-width:92vw}
.fb-msg.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.fb-msg h2{margin:0;font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:clamp(40px,10vw,84px);line-height:1;text-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 26px rgba(0,0,0,.45);letter-spacing:.02em}
.fb-msg p{margin:6px 0 0;font-size:clamp(15px,3.6vw,20px);font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.fb-msg.goal h2{color:#ffd84a}
.fb-stick{position:absolute;left:0;bottom:0;width:50vw;height:78vh;pointer-events:auto;touch-action:none}
.fb-knob{position:absolute;width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(16,10,30,.25);display:none}
.fb-knob i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.88);box-shadow:0 2px 8px rgba(0,0,0,.35)}
.fb-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 24px);bottom:calc(env(safe-area-inset-bottom,0px) + 24px);width:112px;height:112px;border-radius:50%;border:3px dashed rgba(255,255,255,.5);display:grid;place-items:center;font-size:12px;font-weight:800;text-align:center;opacity:.75;padding:10px;transition:opacity .4s}
.fb-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;gap:10px;align-items:end;justify-items:center;pointer-events:auto}
.fb-b{border:0;padding:0;border-radius:50%;font-family:'Lilita One',Nunito,sans-serif;font-weight:400;color:#2a1a00;display:grid;place-items:center;cursor:pointer;touch-action:none;text-align:center;line-height:1;box-shadow:0 5px 0 rgba(0,0,0,.28),0 8px 18px rgba(0,0,0,.3);transition:transform .06s}
.fb-b.down{transform:translateY(4px);box-shadow:0 1px 0 rgba(0,0,0,.28)}
.fb-b small{display:block;font-family:Nunito,sans-serif;font-weight:900;font-size:10px;opacity:.75;margin-top:2px}
.fb-shoot{grid-column:2;grid-row:1 / span 2;width:98px;height:98px;font-size:19px;background:radial-gradient(circle at 50% 30%,#fff38f,#ffd700 60%,#f0b000)}
.fb-pass{grid-column:1;grid-row:2;width:84px;height:84px;font-size:17px;background:radial-gradient(circle at 50% 30%,#b6f3ff,#56c8f0 60%,#2a95c8);color:#062a3a}
.fb-sprint{grid-column:1;grid-row:1;width:72px;height:72px;font-size:14px;color:#fff;background:radial-gradient(circle at 50% 30%,#8ae08a,#3a9a46 60%,#24702e)}
.fb-b.def.fb-pass{background:radial-gradient(circle at 50% 30%,#ffd0b0,#f0864a 60%,#c45a24);color:#3a1200}
.fb-b.def.fb-shoot{background:radial-gradient(circle at 50% 30%,#ffb0b0,#e04a4a 60%,#a82020);color:#fff}
.fb-swap{position:absolute;right:calc(env(safe-area-inset-right,0px) + 200px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);width:56px;height:56px;font-size:11px;color:#fff;background:rgba(16,10,30,.75);border:2px solid rgba(255,255,255,.8);pointer-events:auto}
.fb-bars{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 196px);width:182px;display:flex;flex-direction:column;gap:5px}
.fb-bar{height:9px;border-radius:6px;background:rgba(16,10,30,.6);overflow:hidden;box-shadow:0 0 0 1.5px rgba(255,255,255,.5)}
.fb-bar i{display:block;height:100%;width:100%;border-radius:6px;background:linear-gradient(90deg,#3fd36a,#a6f07a);transform-origin:left;transition:transform .05s linear}
.fb-bar.pow{opacity:0;transition:opacity .15s}.fb-bar.pow.on{opacity:1}.fb-bar.pow i{background:linear-gradient(90deg,#ffd700,#ff8a2a,#e0302a)}
.fb-arrow{position:absolute;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:26px solid #ffe14a;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));display:none;transform-origin:50% 60%}
.fb-tip{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 96px);max-width:min(560px,calc(100vw - 32px));padding:9px 16px;border-radius:14px;background:rgba(40,16,90,.92);border:1px solid rgba(255,215,0,.5);font-size:16px;font-weight:800;line-height:1.3;text-align:center;opacity:0;transition:opacity .2s;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.fb-tip.on{opacity:1}.fb-tip b{color:#ffd84a}
.fb-keys{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);font-size:12px;font-weight:800;padding:5px 10px;border-radius:10px;background:rgba(16,10,30,.6);max-width:calc(100vw - 24px)}
.fb-panel{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,4,24,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)}
.fb-card{width:min(540px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,#32136f,#1c0b3a);border:1px solid rgba(190,160,255,.3);border-radius:22px;padding:20px 20px 16px;box-shadow:0 24px 70px rgba(0,0,0,.55);text-align:center}
.fb-card h2{margin:0 0 4px;font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:30px;line-height:1.1}
.fb-card p{margin:4px 0 10px;color:#e6def7;font-weight:600;font-size:15px;line-height:1.35}
.fb-card .fb-kick{color:#ffd84a;font-weight:900;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:0}
.fb-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 10px;align-items:center}
.fb-row label{width:100%;font-size:12px;font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.06em}
.fb-chip{border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;padding:8px 14px;font:800 14px Nunito,sans-serif;cursor:pointer;min-height:40px}
.fb-chip.on{background:#ffd700;border-color:#ffd700;color:#2a1a00}
.fb-go{display:block;width:100%;margin-top:8px;border:0;border-radius:16px;padding:14px;font:400 22px 'Lilita One',Nunito,sans-serif;color:#2a1a00;background:linear-gradient(180deg,#fff38f,#ffd700 55%,#f0b000);box-shadow:0 5px 0 #a86f00;cursor:pointer;min-height:52px}
.fb-alt{display:block;width:100%;margin-top:10px;border:2px solid rgba(255,255,255,.4);border-radius:16px;padding:11px;font:800 16px Nunito,sans-serif;color:#fff;background:transparent;cursor:pointer;min-height:48px}
.fb-stats{width:100%;border-collapse:collapse;margin:8px 0 6px;font-size:15px}
.fb-stats td{padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.1)}.fb-stats td:first-child,.fb-stats td:last-child{font-weight:900;width:22%;font-variant-numeric:tabular-nums}.fb-stats td:nth-child(2){color:#cbbcf0;font-weight:700;font-size:13px}
.fb-big{font-family:'Lilita One',Nunito,sans-serif;font-size:46px;line-height:1;margin:6px 0}
@media (max-width:640px) and (orientation:portrait){
  .fb-top{left:58px;right:58px}.fb-team{padding:4px 7px;font-size:12px}.fb-team b{font-size:22px}.fb-team span{max-width:18vw}
  .fb-team span.fb-ln{display:none}.fb-team span.fb-sn{display:inline}.fb-stickhint{width:96px;height:96px;font-size:11px}
  .fb-shoot{width:88px;height:88px;font-size:17px}.fb-pass{width:76px;height:76px;font-size:15px}.fb-sprint{width:72px;height:72px;font-size:13px}
  .fb-swap{right:calc(env(safe-area-inset-right,0px) + 198px)}.fb-bars{width:166px;bottom:calc(env(safe-area-inset-bottom,0px) + 182px)}
  .fb-stick{height:62vh}
}
@media (max-height:460px) and (orientation:landscape){
  .fb-top{top:calc(env(safe-area-inset-top,0px) + 4px)}.fb-team b{font-size:22px}
  .fb-shoot{width:84px;height:84px}.fb-pass{width:74px;height:74px}.fb-sprint{width:72px;height:72px}
  .fb-bars{left:50%;right:auto;transform:translateX(-50%);width:min(26vw,220px);bottom:calc(env(safe-area-inset-bottom,0px) + 16px)}.fb-tip{top:calc(env(safe-area-inset-top,0px) + 66px)}
  .fb-msg{top:42%}
}
`;
const SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>';
const SVG_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/></svg>';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Menú suelto (antes de empezar): usa los mismos estilos sin crear el resto de la interfaz. */
export function menuPanel(opts) {
  if (!document.getElementById('fb-css')) { const st = document.createElement('style'); st.id = 'fb-css'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'fb-root'; document.body.appendChild(root);
  const fake = Object.create(FutbolHud.prototype); fake.root = root;
  return fake.menu(opts).finally(() => root.remove());
}

export class FutbolHud {
  /**
   * @param {object} o { touch, home: {name, shirt}, away: {name, shirt}, onPress(a), onRelease(a), onPause(), onCam() }
   */
  constructor(o) {
    this.o = o;
    if (!document.getElementById('fb-css')) { const st = document.createElement('style'); st.id = 'fb-css'; st.textContent = CSS; document.head.appendChild(st); }
    const r = this.root = document.createElement('div'); r.className = 'fb-root';
    const t = o.touch;
    r.innerHTML = `<div class="fb-top"><div class="fb-score"><div class="fb-team"><i style="background:${o.home.shirt}"></i><span class="fb-ln">${esc(o.home.name)}</span><span class="fb-sn">${esc(o.home.short || o.home.name)}</span><b class="fb-s0">0</b></div>
      <div class="fb-clock"><span class="fb-time">0:00</span><small class="fb-half">1ª parte</small></div>
      <div class="fb-team"><b class="fb-s1">0</b><span class="fb-ln">${esc(o.away.name)}</span><span class="fb-sn">${esc(o.away.short || o.away.name)}</span><i style="background:${o.away.shirt}"></i></div></div>
      <div class="fb-pen"><span>${esc(o.home.short || o.home.name)}</span><span class="fb-p0"></span><span>${esc(o.away.short || o.away.name)}</span><span class="fb-p1"></span></div>
      <div class="fb-say"></div></div>
      <button class="fb-pause" aria-label="Pausa">${SVG_PAUSE}</button><button class="fb-cam" aria-label="Cambiar cámara">${SVG_CAM}</button>
      <div class="fb-msg"><h2></h2><p></p></div><div class="fb-tip"></div><div class="fb-arrow"></div>
      ${t ? `<div class="fb-stick"><div class="fb-knob"><i></i></div></div><div class="fb-stickhint">Toca y arrastra para moverte</div>
      <div class="fb-bars"><div class="fb-bar"><i class="fb-en"></i></div><div class="fb-bar pow"><i class="fb-pw"></i></div></div>
      <div class="fb-btns"><button class="fb-b fb-sprint" data-a="sprint">SPRINT</button><button class="fb-b fb-shoot" data-a="shoot">TIRO</button><button class="fb-b fb-pass" data-a="pass">PASE</button></div>
      <button class="fb-b fb-swap" data-a="switch">CAMBIAR</button>`
      : `<div class="fb-bars" style="bottom:calc(env(safe-area-inset-bottom,0px) + 44px)"><div class="fb-bar"><i class="fb-en"></i></div><div class="fb-bar pow"><i class="fb-pw"></i></div></div>
      <div class="fb-keys">WASD o flechas: moverte · <b>J</b> pase / robo · <b>K</b> tiro / entrada (mantén para cargar) · <b>Mayús</b> sprint · <b>L</b> cambiar · <b>C</b> cámara · <b>Esc</b> pausa</div>`}`;
    document.body.appendChild(r);
    const $ = (s) => r.querySelector(s);
    this.el = { s0: $('.fb-s0'), s1: $('.fb-s1'), time: $('.fb-time'), half: $('.fb-half'), say: $('.fb-say'), msg: $('.fb-msg'), tip: $('.fb-tip'), arrow: $('.fb-arrow'),
      en: $('.fb-en'), pw: $('.fb-pw'), pow: $('.fb-bar.pow'), pass: $('.fb-pass'), shoot: $('.fb-shoot'), pen: $('.fb-pen'), p0: $('.fb-p0'), p1: $('.fb-p1'), hint: $('.fb-stickhint') };
    $('.fb-pause').addEventListener('click', (e) => { e.stopPropagation(); o.onPause?.(); });
    $('.fb-cam').addEventListener('click', (e) => { e.stopPropagation(); o.onCam?.(); });
    this.held = { sprint: false };
    for (const b of r.querySelectorAll('[data-a]')) {
      const a = b.dataset.a;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch { /* sin captura */ } b.classList.add('down'); if (a === 'sprint') this.held.sprint = true; else o.onPress?.(a); });
      const up = (e) => { if (!b.classList.contains('down')) return; b.classList.remove('down'); if (a === 'sprint') this.held.sprint = false; else o.onRelease?.(a); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }
    // joystick dinámico en la mitad izquierda: aparece donde se toca
    this.stick = { x: 0, y: 0, id: null };
    const zone = $('.fb-stick');
    if (zone) {
      const knob = zone.querySelector('.fb-knob'), dot = knob.querySelector('i'), RAD = 56;
      zone.addEventListener('pointerdown', (e) => { if (this.stick.id !== null) return; e.preventDefault(); try { zone.setPointerCapture(e.pointerId); } catch { /* sin captura */ } const rc = zone.getBoundingClientRect(); this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; knob.style.display = 'block'; knob.style.left = (e.clientX - rc.left) + 'px'; knob.style.top = (e.clientY - rc.top) + 'px'; dot.style.transform = ''; if (this.el.hint) this.el.hint.style.opacity = 0; });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId !== this.stick.id) return; let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy; const l = Math.hypot(dx, dy); if (l > RAD) { dx *= RAD / l; dy *= RAD / l; } this.stick.x = dx / RAD; this.stick.y = -dy / RAD; dot.style.transform = `translate(${dx}px,${dy}px)`; });
      const end = (e) => { if (e.pointerId !== this.stick.id) return; this.stick = { x: 0, y: 0, id: null }; knob.style.display = 'none'; };
      zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    }
  }
  setScore(a, b) { this.el.s0.textContent = a; this.el.s1.textContent = b; }
  setClock(sec, half, label) { const s = Math.max(0, Math.ceil(sec)); this.el.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; this.el.half.textContent = label || (half === 1 ? '1ª parte' : '2ª parte'); }
  setDefending(def) {
    if (this.def === def || !this.el.pass) return; this.def = def;
    this.el.pass.classList.toggle('def', def); this.el.shoot.classList.toggle('def', def);
    this.el.pass.textContent = def ? 'ROBO' : 'PASE'; this.el.shoot.textContent = def ? 'ENTRADA' : 'TIRO';
    this.el.shoot.style.fontSize = def ? '15px' : '';
  }
  setButtons(pass, shoot) { if (!this.el.pass) return; this.def = null; this.el.pass.textContent = pass; this.el.shoot.textContent = shoot; this.el.pass.classList.remove('def'); this.el.shoot.classList.remove('def'); this.el.shoot.style.fontSize = shoot.length > 6 ? '15px' : ''; }
  bars(energy, charge) {
    if (this.el.en) this.el.en.style.transform = `scaleX(${energy.toFixed(3)})`;
    if (this.el.pow) { this.el.pow.classList.toggle('on', charge >= 0); if (charge >= 0) this.el.pw.style.transform = `scaleX(${charge.toFixed(3)})`; }
  }
  msg(title, sub = '', ms = 1800, cls = '') {
    const m = this.el.msg; m.querySelector('h2').textContent = title; m.querySelector('p').textContent = sub; m.className = 'fb-msg on ' + cls;
    clearTimeout(this.mt); this.mt = setTimeout(() => m.classList.remove('on'), ms);
  }
  say(text, ms = 1700) { const s = this.el.say; s.textContent = text; s.classList.add('on'); clearTimeout(this.st); this.st = setTimeout(() => s.classList.remove('on'), ms); }
  tip(html) { const t = this.el.tip; if (!html) { t.classList.remove('on'); return; } t.innerHTML = html; t.classList.add('on'); }
  /** Flecha en el borde de la pantalla hacia el jugador controlado (x, y en píxeles; ang en radianes) o null. */
  arrow(x, y, ang) { const a = this.el.arrow; if (x === null) { a.style.display = 'none'; return; } a.style.display = 'block'; a.style.left = (x - 14) + 'px'; a.style.top = (y - 13) + 'px'; a.style.transform = `rotate(${ang}rad)`; }
  pens(log, kicks) {
    this.el.pen.classList.add('on');
    for (const t of [0, 1]) { const l = log[t], n = Math.max(kicks, l.length + (l.length >= kicks ? 0 : 0)); let h = ''; for (let i = 0; i < Math.max(kicks, l.length); i++) h += `<u class="${i < l.length ? (l[i] ? 'g' : 'x') : ''}"></u>`; this.el['p' + t].innerHTML = h; void n; }
  }
  // ---------------------------------------------------------------- paneles
  panel(html) {
    const p = document.createElement('div'); p.className = 'fb-panel'; p.innerHTML = `<div class="fb-card">${html}</div>`;
    this.root.appendChild(p); return p;
  }
  /** Menú previo: modo, rival, dificultad, duración y asistencia. */
  menu({ title = 'Fútbol sala', sub = '', modes, rivals, values }) {
    return new Promise(res => {
      const v = { ...values };
      const chips = (key, list) => `<div class="fb-row"><label>${{ mode: 'Modo', rival: 'Rival', level: 'Dificultad', duration: 'Duración de cada parte', assist: 'Asistencia al pase y al tiro' }[key]}</label>${list.map(([id, name]) => `<button class="fb-chip ${v[key] === id ? 'on' : ''}" data-k="${key}" data-v="${id}">${esc(name)}</button>`).join('')}</div>`;
      const p = this.panel(`<p class="fb-kick">${esc(sub)}</p><h2>${esc(title)}</h2>
        ${chips('mode', modes)}${rivals.length > 1 ? chips('rival', rivals) : ''}${chips('level', [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']])}
        ${chips('duration', [[2, '2 min'], [3, '3 min'], [4, '4 min'], [5, '5 min']])}${chips('assist', [[true, 'Sí'], [false, 'No']])}
        <button class="fb-go">¡A jugar!</button><button class="fb-alt">Salir</button>`);
      p.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.k) { const k = b.dataset.k, raw = b.dataset.v; v[k] = k === 'duration' ? +raw : k === 'assist' ? raw === 'true' : raw; p.querySelectorAll(`[data-k="${k}"]`).forEach(c => c.classList.toggle('on', c === b)); return; }
        p.remove(); res(b.classList.contains('fb-go') ? v : null);
      });
    });
  }
  pause() {
    return new Promise(res => {
      const p = this.panel(`<h2>Pausa</h2><p>El partido está parado.</p><button class="fb-go">Seguir</button><button class="fb-alt">Abandonar</button>`);
      p.querySelector('.fb-go').onclick = () => { p.remove(); res('resume'); };
      p.querySelector('.fb-alt').onclick = () => { p.remove(); res('quit'); };
    });
  }
  /** Pantalla final con las estadísticas. */
  end({ title, sub, score, rows = [], again = 'Revancha', exit = 'Salir' }) {
    return new Promise(res => {
      const p = this.panel(`<p class="fb-kick">${esc(sub || '')}</p><h2>${esc(title)}</h2>${score ? `<div class="fb-big">${esc(score)}</div>` : ''}
        ${rows.length ? `<table class="fb-stats">${rows.map(([a, n, b]) => `<tr><td>${esc(a)}</td><td>${esc(n)}</td><td>${esc(b)}</td></tr>`).join('')}</table>` : ''}
        ${again ? `<button class="fb-go">${esc(again)}</button>` : ''}<button class="fb-alt">${esc(exit)}</button>`);
      p.querySelector('.fb-go')?.addEventListener('click', () => { p.remove(); res('again'); });
      p.querySelector('.fb-alt').addEventListener('click', () => { p.remove(); res('exit'); });
    });
  }
  info({ kicker = '', title, text, button = 'Seguir' }) {
    return new Promise(res => { const p = this.panel(`<p class="fb-kick">${esc(kicker)}</p><h2>${esc(title)}</h2><p>${text}</p><button class="fb-go">${esc(button)}</button>`); p.querySelector('.fb-go').onclick = () => { p.remove(); res(); }; });
  }
  dispose() { clearTimeout(this.mt); clearTimeout(this.st); this.root.remove(); }
}
