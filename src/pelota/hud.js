// Interfaz del partido (DOM): marcador, avisos del juez y del kantari, consejos, joystick y botones.
// Todo lleva el prefijo «pel-» y se coloca sin solaparse en móvil (vertical y horizontal) y escritorio.
const CSS = `
.pel-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:var(--pel-font,inherit);color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.pel-root *{box-sizing:border-box}
.pel-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:0;right:0;display:flex;justify-content:center;padding:0 64px}
.pel-exit{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:calc(env(safe-area-inset-left,0px) + 10px);width:44px;height:44px;border-radius:14px;border:0;background:rgba(20,16,40,.72);color:#fff;font-size:20px;pointer-events:auto;cursor:pointer;display:grid;place-items:center}
.pel-score{display:flex;align-items:stretch;gap:0;border-radius:16px;overflow:hidden;background:rgba(20,16,40,.78);box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:100%}
.pel-side{display:flex;align-items:center;gap:8px;padding:6px 12px;min-width:0}
.pel-side b{font-family:var(--pel-display,inherit);font-size:28px;line-height:1;min-width:1.2em;text-align:center}
.pel-side span{font-size:13px;font-weight:700;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:26vw}
.pel-red{background:linear-gradient(180deg,#e0392f,#b3261e)}.pel-blue{background:linear-gradient(180deg,#2f6fe0,#1f4fb3)}
.pel-mid{display:grid;place-items:center;padding:0 8px;font-size:11px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.pel-serve{width:10px;height:10px;border-radius:50%;background:#fff6d8;box-shadow:0 0 0 2px rgba(0,0,0,.25);visibility:hidden;flex:none}
.pel-serve.on{visibility:visible}
.pel-call{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translateX(-50%) scale(.9);opacity:0;transition:opacity .18s,transform .18s;text-align:center;max-width:min(92vw,520px);padding:10px 18px;border-radius:18px;background:rgba(20,16,40,.82)}
.pel-call.on{opacity:1;transform:translateX(-50%) scale(1)}
.pel-call h3{margin:0;font-family:var(--pel-display,inherit);font-size:clamp(28px,6vw,44px);line-height:1.05;letter-spacing:.01em}
.pel-call p{margin:4px 0 0;font-size:15px;line-height:1.3;opacity:.95}
.pel-call .pel-kantari{margin-top:6px;font-size:16px;font-weight:800;color:#ffd84a}
.pel-q{position:absolute;left:50%;top:42%;white-space:nowrap;transform:translate(-50%,-50%);font-family:var(--pel-display,inherit);font-size:clamp(24px,5vw,36px);text-shadow:0 3px 10px rgba(0,0,0,.45);opacity:0;transition:opacity .15s}
.pel-q.on{opacity:1}
.pel-tip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);max-width:min(560px,calc(100vw - 330px));padding:8px 14px;border-radius:14px;background:rgba(20,16,40,.72);font-size:15px;line-height:1.3;text-align:center;opacity:0;transition:opacity .2s}
.pel-tip.on{opacity:1}
.pel-stick{position:absolute;left:0;bottom:0;width:46vw;height:62vh;pointer-events:auto;touch-action:none}
.pel-knob{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(20,16,40,.28);display:none}
.pel-knob i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(255,255,255,.85)}
.pel-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 26px);bottom:calc(env(safe-area-inset-bottom,0px) + 26px);width:120px;height:120px;border-radius:50%;border:3px dashed rgba(255,255,255,.55);display:grid;place-items:center;font-size:12px;font-weight:700;text-align:center;opacity:.8;padding:10px}
.pel-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;align-items:flex-end;gap:12px;pointer-events:auto}
.pel-btn{border:0;border-radius:50%;color:#1a1030;font-family:var(--pel-display,inherit);font-weight:800;display:grid;place-items:center;cursor:pointer;touch-action:none;box-shadow:0 6px 0 rgba(0,0,0,.25),0 8px 22px rgba(0,0,0,.25);transition:transform .06s}
.pel-btn:active,.pel-btn.down{transform:translateY(4px);box-shadow:0 2px 0 rgba(0,0,0,.25)}
.pel-hit{width:104px;height:104px;font-size:20px;background:radial-gradient(circle at 35% 30%,#fff3a8,#ffcc2e 60%,#e0a300)}
.pel-hit.ready{animation:pel-pulse .5s infinite alternate}
@keyframes pel-pulse{from{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 rgba(255,220,80,.7)}to{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 14px rgba(255,220,80,0)}}
.pel-drop{width:70px;height:70px;font-size:13px;background:radial-gradient(circle at 35% 30%,#ffffff,#bfe6ff 60%,#7fbfe8)}
.pel-panel{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,8,24,.55);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px calc(env(safe-area-inset-bottom,0px) + 16px)}
.pel-card{width:min(520px,100%);max-height:100%;overflow:auto;background:#fffaf0;color:#1a1030;border-radius:22px;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.pel-card h2{margin:0 0 4px;font-family:var(--pel-display,inherit);font-size:30px;line-height:1.1}
.pel-card .pel-sub{margin:0 0 12px;font-weight:700;color:#6a4fb3}
.pel-card ol{margin:0 0 12px;padding-left:22px}.pel-card li{margin:0 0 6px;line-height:1.35}
.pel-card .pel-ctrl{font-size:14px;line-height:1.35;background:#f1ecff;border-radius:12px;padding:10px 12px;margin:0 0 14px}
.pel-card .pel-big{font-family:var(--pel-display,inherit);font-size:48px;text-align:center;margin:6px 0}
.pel-card .pel-fact{background:#fff1c7;border-radius:12px;padding:10px 12px;margin:10px 0 14px;font-size:15px;line-height:1.35}
.pel-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
.pel-levels{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}
.pel-levels button{flex:1;min-width:90px;border-radius:12px;border:2px solid #d8cff5;background:#fff;color:#1a1030;padding:9px 6px;font-weight:800;cursor:pointer}
.pel-levels button[aria-pressed=true]{background:#6a4fb3;border-color:#6a4fb3;color:#fff}
.pel-go{border:0;border-radius:14px;padding:12px 20px;font-weight:800;font-size:17px;cursor:pointer;background:#ffcc2e;color:#1a1030}
.pel-go.alt{background:#ece6ff}
.pel-root.calling .pel-tip,.pel-root.calling .pel-q{opacity:0}
.pel-root.paneled .pel-exit,.pel-root.paneled .pel-q,.pel-root.paneled .pel-call,.pel-root.paneled .pel-tip{visibility:hidden}
@media (max-width:560px){.pel-mid{display:none}.pel-side{padding:6px 10px}.pel-side span{max-width:30vw}
  .pel-top{padding:0 58px}.pel-side{padding:6px 8px;gap:5px}.pel-side b{font-size:24px}.pel-side span{font-size:12px;max-width:34vw}.pel-serve{width:8px;height:8px}
  .pel-tip{max-width:calc(100vw - 32px);bottom:auto;top:calc(env(safe-area-inset-top,0px) + 66px)}}
@media (max-height:520px){.pel-hit{width:86px;height:86px;font-size:17px}.pel-drop{width:60px;height:60px}
  .pel-tip{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);max-width:calc(100vw - 360px)}
  .pel-call{top:calc(env(safe-area-inset-top,0px) + 58px);padding:6px 14px}.pel-side b{font-size:22px}
  .pel-card{width:min(780px,100%);padding:14px 18px 12px}.pel-card h2{font-size:24px}.pel-card .pel-sub{margin-bottom:8px}
  .pel-card ol{columns:2;column-gap:22px;font-size:13.5px;margin-bottom:8px}.pel-card li{break-inside:avoid;margin-bottom:4px}
  .pel-card .pel-ctrl{font-size:13px;padding:7px 10px;margin-bottom:10px}.pel-levels{margin-bottom:10px}.pel-levels button{padding:7px 6px}
  .pel-go{padding:9px 16px;font-size:15px}.pel-card .pel-big{font-size:36px;margin:2px 0}.pel-card .pel-fact{margin:6px 0 10px;font-size:14px}}
@media (hover:hover) and (pointer:fine){.pel-stick,.pel-stickhint{display:none}}
`;

export class PelotaHud {
  constructor(container, txt, names, touch) {
    this.txt = txt; this.touch = touch;
    if (!document.getElementById('pel-style')) { const st = document.createElement('style'); st.id = 'pel-style'; st.textContent = CSS; document.head.appendChild(st); }
    const r = this.root = document.createElement('div'); r.className = 'pel-root';
    r.innerHTML = `
      <button class="pel-exit" aria-label="${txt.exit}">✕</button>
      <div class="pel-top"><div class="pel-score">
        <div class="pel-side pel-red"><i class="pel-serve" data-pel-s="you"></i><span>${esc(names.you)}</span><b data-pel-n="you">0</b></div>
        <div class="pel-mid" data-pel-mid></div>
        <div class="pel-side pel-blue"><b data-pel-n="rival">0</b><span>${esc(names.rival)}</span><i class="pel-serve" data-pel-s="rival"></i></div>
      </div></div>
      <div class="pel-call"><h3></h3><p></p><div class="pel-kantari"></div></div>
      <div class="pel-q"></div>
      <div class="pel-tip"></div>
      <div class="pel-stick"><div class="pel-knob"><i></i></div></div>
      ${touch ? '<div class="pel-stickhint">↔ ↕</div>' : ''}
      <div class="pel-btns"><button class="pel-btn pel-drop" aria-label="${txt.drop}">${txt.drop}</button><button class="pel-btn pel-hit" aria-label="${txt.hit}">${txt.hit}</button></div>`;
    container.appendChild(r);
    this.$ = (s) => r.querySelector(s);
    this.callT = 0; this.qT = 0;
  }
  setScore(you, rival, server, mid) {
    this.$('[data-pel-n=you]').textContent = you; this.$('[data-pel-n=rival]').textContent = rival;
    for (const el of this.root.querySelectorAll('.pel-serve')) el.classList.toggle('on', el.dataset.pelS === server);
    if (mid != null) this.$('[data-pel-mid]').textContent = mid;
  }
  call(title, sub, kant, secs = 2) {
    const c = this.$('.pel-call'); c.querySelector('h3').textContent = title; c.querySelector('p').textContent = sub || '';
    c.querySelector('p').style.display = sub ? '' : 'none';
    const k = c.querySelector('.pel-kantari'); k.textContent = kant ? `«${kant}»` : ''; k.style.display = kant ? '' : 'none';
    c.classList.add('on'); this.callT = secs; this.root.classList.add('calling');
  }
  quality(text) { const q = this.$('.pel-q'); q.textContent = text; q.classList.toggle('on', !!text); this.qT = 0.8; }
  tip(text) { const t = this.$('.pel-tip'); if (t.textContent !== (text || '')) t.textContent = text || ''; t.classList.toggle('on', !!text); }
  ready(on) { this.$('.pel-hit').classList.toggle('ready', !!on); }
  tick(dt) {
    if (this.callT > 0 && (this.callT -= dt) <= 0) { this.$('.pel-call').classList.remove('on'); this.root.classList.remove('calling'); }
    if (this.qT > 0 && (this.qT -= dt) <= 0) this.$('.pel-q').classList.remove('on');
  }
  panel(html) {
    this.closePanel();
    const p = document.createElement('div'); p.className = 'pel-panel'; p.innerHTML = `<div class="pel-card">${html}</div>`;
    this.root.appendChild(p); this.panelEl = p; this.root.classList.add('paneled'); return p;
  }
  closePanel() { if (this.panelEl) { this.panelEl.remove(); this.panelEl = null; } this.root.classList.remove('paneled'); }
  controls(on) { for (const s of ['.pel-stick', '.pel-btns', '.pel-stickhint']) { const e = this.$(s); if (e) e.style.visibility = on ? '' : 'hidden'; } }
  destroy() { this.root.remove(); }
}
export function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
