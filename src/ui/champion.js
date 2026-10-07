// Celebración de campeón (txapela del torneo de mano o la Liga Navarra): pantalla entera con rayos de luz que giran,
// la txapela (o la copa) que baja y se posa, confeti rojo, blanco y oro, fuegos artificiales, el grito de la grada y
// una fanfarria. Primero la celebración y, a los pocos segundos, el nombre, el marcador y el botón.
//   showChampion({ kind: 'pelota' | 'futbol', title, name, place, score, stat, sound }) → promesa (al cerrar)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TXAPELA = `<svg viewBox="0 0 200 120" class="ch-obj"><defs><radialGradient id="chT" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#3a3b48"/><stop offset="1" stop-color="#121218"/></radialGradient></defs>
  <ellipse cx="100" cy="92" rx="92" ry="20" fill="#0d0d12"/><path d="M14 86c4-44 42-70 86-70s82 26 86 70c-26 14-146 14-172 0z" fill="url(#chT)"/>
  <path d="M96 16c0-10 8-10 8 0" stroke="#1d1d24" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M18 88c28 10 136 10 164 0" stroke="#c8222a" stroke-width="7" fill="none"/><path d="M40 40c18-14 46-18 66-16" stroke="rgba(255,255,255,.18)" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
const COPA = `<svg viewBox="0 0 200 220" class="ch-obj"><defs><linearGradient id="chG" x1="0" x2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".45" stop-color="#f2b92e"/><stop offset="1" stop-color="#a86a12"/></linearGradient></defs>
  <path d="M52 20h96v40c0 40-22 64-48 64S52 100 52 60z" fill="url(#chG)"/><path d="M52 34H24c0 34 14 48 34 50M148 34h28c0 34-14 48-34 50" stroke="url(#chG)" stroke-width="10" fill="none"/>
  <rect x="90" y="122" width="20" height="40" fill="url(#chG)"/><path d="M62 162h76l10 26H52z" fill="url(#chG)"/><rect x="44" y="188" width="112" height="18" rx="4" fill="#5a2a14"/>
  <path d="M70 30v34c0 18 10 32 22 38" stroke="rgba(255,255,255,.55)" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;

const CSS = `.champ{position:fixed;inset:0;z-index:6000;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 42%,#4a1a6e 0%,#1a0a30 55%,#07030f 100%);font-family:'Nunito',sans-serif;color:#fff;animation:chIn .4s ease-out}
.champ.out{opacity:0;transition:opacity .5s}
.champ canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ch-rays{position:absolute;left:50%;top:42%;width:240vmax;height:240vmax;margin:-120vmax 0 0 -120vmax;background:repeating-conic-gradient(from 0deg,rgba(255,215,0,.16) 0 6deg,transparent 6deg 18deg);animation:chSpin 18s linear infinite;mask-image:radial-gradient(circle,#000 0,transparent 42%);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 42%)}
.ch-box{position:relative;display:grid;justify-items:center;gap:8px;text-align:center;padding:16px;max-width:min(560px,92vw)}
.ch-obj{width:min(260px,52vmin);height:auto;filter:drop-shadow(0 0 30px rgba(255,210,80,.55)) drop-shadow(0 14px 18px rgba(0,0,0,.5));animation:chDrop 1.4s cubic-bezier(.2,1.4,.4,1) both, chFloat 3s ease-in-out 1.4s infinite}
.ch-kick{font:900 14px/1.15 'Nunito',sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#FFD700;animation:chUp .6s .9s both}
.ch-title{margin:0;font:400 clamp(48px,11vmin,96px)/1 'Lilita One','Nunito',sans-serif;letter-spacing:.04em;background:linear-gradient(180deg,#fff6c8,#ffd23a 55%,#e08a12);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #7a3a08) drop-shadow(0 10px 24px rgba(0,0,0,.5));animation:chPop .9s 1.1s cubic-bezier(.2,1.6,.4,1) both}
.ch-name{font:900 24px/1.15 'Nunito',sans-serif;animation:chUp .6s 1.6s both}
.ch-sub{font:700 16px/1.3 'Nunito',sans-serif;color:#e6dcff;animation:chUp .6s 1.9s both;text-wrap:balance}
.ch-score{display:inline-flex;gap:10px;align-items:center;padding:6px 16px;border-radius:999px;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,215,0,.35);font:900 20px/1.15 'Nunito',sans-serif;font-variant-numeric:tabular-nums;animation:chUp .6s 2.1s both}
.ch-btn{margin-top:8px;min-width:220px;min-height:48px;border:0;border-radius:999px;background:linear-gradient(180deg,#ffe36a,#f2b92e);color:#2e1d00;font:900 18px/1.15 'Nunito',sans-serif;box-shadow:0 6px 0 #a87a12,0 12px 24px rgba(0,0,0,.35);cursor:pointer;animation:chUp .6s 2.6s both}
@keyframes chIn{from{opacity:0}}@keyframes chSpin{to{transform:rotate(360deg)}}
@keyframes chDrop{0%{transform:translateY(-70vh) rotate(-25deg) scale(.6)}70%{transform:translateY(0) rotate(4deg) scale(1.08)}100%{transform:none}}
@keyframes chFloat{50%{transform:translateY(-8px)}}
@keyframes chPop{0%{transform:scale(.2);opacity:0}100%{transform:none;opacity:1}}
@keyframes chUp{from{transform:translateY(16px);opacity:0}}
@media (orientation:landscape) and (max-height:520px){.ch-box{grid-template-columns:auto 1fr;column-gap:24px;text-align:left;justify-items:start;max-width:94vw}.ch-obj{grid-row:1/span 6;width:min(200px,40dvh)}.ch-title{font-size:clamp(40px,13dvh,64px)}.ch-name{font-size:20px}.ch-btn{min-height:44px}}`;

// confeti y fuegos artificiales en un lienzo (sin librerías)
function party(cv, colors) {
  const g = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1); let W = 0, H = 0;
  const fit = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; }; fit(); addEventListener('resize', fit);
  const conf = [], sparks = []; let t0 = performance.now(), last = t0, raf = 0, nextFw = 0.5;
  const pour = (n) => { for (let i = 0; i < n; i++) conf.push({ x: Math.random() * W, y: -20 * dpr - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 80 * dpr, vy: (60 + Math.random() * 120) * dpr, a: Math.random() * 6.3, va: (Math.random() - 0.5) * 10, w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr, c: colors[(Math.random() * colors.length) | 0], ph: Math.random() * 6.3 }); };
  const burst = () => { const x = W * (0.15 + Math.random() * 0.7), y = H * (0.12 + Math.random() * 0.35), c = colors[(Math.random() * colors.length) | 0], n = 60;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283, v = (120 + Math.random() * 160) * dpr; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.5, t: 0, c }); } };
  pour(160);
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000), el = (now - t0) / 1000; last = now;
    g.clearRect(0, 0, W, H);
    if (el < 6 && Math.random() < 0.5) pour(3);
    if ((nextFw -= dt) <= 0 && el < 9) { burst(); nextFw = 0.45 + Math.random() * 0.6; }
    for (let i = conf.length - 1; i >= 0; i--) { const p = conf[i]; p.x += (p.vx + Math.sin(el * 3 + p.ph) * 30 * dpr) * dt; p.y += p.vy * dt; p.a += p.va * dt;
      if (p.y > H + 30) { conf.splice(i, 1); continue; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.abs(Math.cos(p.a * 1.7)) + 0.15); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
    g.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t += dt; if (s.t > s.life) { sparks.splice(i, 1); continue; }
      s.vx *= 0.985; s.vy = s.vy * 0.985 + 90 * dpr * dt; const px = s.x, py = s.y; s.x += s.vx * dt; s.y += s.vy * dt; const k = 1 - s.t / s.life;
      g.strokeStyle = s.c; g.globalAlpha = k; g.lineWidth = 2.4 * dpr; g.beginPath(); g.moveTo(px, py); g.lineTo(s.x, s.y); g.stroke(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
}
// la grada en pie: un rugido que crece y aplausos (ruido filtrado), y la fanfarria encima
function cheers(sound) {
  try {
    sound?.fanfare?.();
    const ctx = sound?.ctx, out = sound?.sfx; if (!ctx || !out) return;
    const len = 5.5, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate, env = Math.min(1, t / 0.6) * Math.min(1, (len - t) / 1.6); d[i] = (Math.random() * 2 - 1) * env * (0.55 + 0.45 * (Math.random() < 0.02 ? 1 : 0)); }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
    const gn = ctx.createGain(); gn.gain.value = 0.35; src.connect(bp); bp.connect(gn); gn.connect(out); src.start();
    for (let i = 0; i < 40; i++) sound.noiseBurst?.(0.03, 2200 + Math.random() * 1500, 1.5, 0.12, out, 0.4 + Math.random() * 4);   // palmas sueltas
  } catch (e) { }
}

export function showChampion({ kind = 'pelota', title, kicker, name = '', sub = '', score = '', sound = null, button = '¡Zorionak!' } = {}) {
  if (window.__autoWin) return Promise.resolve();
  if (!document.getElementById('champ-css')) { const st = document.createElement('style'); st.id = 'champ-css'; st.textContent = CSS; document.head.appendChild(st); }
  const colors = kind === 'futbol' ? ['#d6001c', '#ffffff', '#0a2a6b', '#ffd23a'] : ['#c8222a', '#ffffff', '#ffd23a', '#2f7d4a'];
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'champ';
    o.innerHTML = `<div class="ch-rays"></div><canvas></canvas><div class="ch-box">${kind === 'futbol' ? COPA : TXAPELA}
      <div class="ch-kick">${esc(kicker || (kind === 'futbol' ? 'Liga Navarra' : 'Torneo de mano'))}</div>
      <h1 class="ch-title">${esc(title || (kind === 'futbol' ? '¡Campeones!' : '¡Txapeldun!'))}</h1>
      ${name ? `<div class="ch-name">${esc(name)}</div>` : ''}${sub ? `<div class="ch-sub">${esc(sub)}</div>` : ''}${score ? `<div class="ch-score">${esc(score)}</div>` : ''}
      <button class="ch-btn">${esc(button)}</button></div>`;
    document.body.appendChild(o);
    const stop = party(o.querySelector('canvas'), colors); cheers(sound);
    // segunda tanda de fuegos y rugido al aparecer el título
    setTimeout(() => sound?.ui?.('coin'), 1150);
    const b = o.querySelector('.ch-btn'); let ok = false; setTimeout(() => { ok = true; b.focus({ preventScroll: true }); }, 2600);
    const done = () => { if (!ok) return; ok = false; removeEventListener('keydown', k, true); o.classList.add('out'); setTimeout(() => { stop(); o.remove(); res(); }, 500); };
    const k = (e) => { if (['enter', ' ', 'e', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopImmediatePropagation(); done(); } };
    addEventListener('keydown', k, true); b.onclick = done;
  });
}
