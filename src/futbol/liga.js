// Liga Navarra (como el modo carrera del FIFA): juegas con el club de tu pueblo contra los clubes de tu zona (grupo
// Norte o Sur), todos contra todos a una vuelta (siete jornadas). Tu partido lo juegas tú; los demás de la jornada se
// simulan según la media de cada club. Clasificación con puntos, goles y diferencia; al final, el campeón.
// La temporada se guarda en localStorage ('mendimendiz-liga-v1'), una por club.
import { CLUBS, clubById } from './clubs.js';

const KEY = 'mendimendiz-liga-v1';
const N_TEAMS = 8;

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* sin guardado */ } }
function rng(seed) { let s = seed | 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

// los siete rivales: los clubes del mismo grupo más cercanos en la lista (que va de norte a sur y de oeste a este)
function rivalsOf(id) {
  const ids = Object.keys(CLUBS), g = CLUBS[id].group;
  const same = ids.filter(k => k !== id && CLUBS[k].group === g), i = ids.indexOf(id);
  same.sort((a, b) => Math.abs(ids.indexOf(a) - i) - Math.abs(ids.indexOf(b) - i));
  const out = same.slice(0, N_TEAMS - 1);
  for (const k of ids) if (out.length < N_TEAMS - 1 && k !== id && !out.includes(k)) out.push(k);   // (por si un grupo se queda corto)
  return out;
}
// calendario de todos contra todos (método del círculo); en cada jornada, quién juega en casa
function schedule(teams) {
  const n = teams.length, arr = teams.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; pairs.push((r + i) % 2 ? [b, a] : [a, b]); }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

/** La temporada del club (la crea si no existe). */
export function season(club) {
  const all = load();
  if (!all[club] || !all[club].rounds) {
    const teams = [club, ...rivalsOf(club)];
    all[club] = { club, year: 1, teams, rounds: schedule(teams).map(p => p.map(([h, a]) => ({ h, a, g: null }))), j: 0, champion: null, titles: all[club]?.titles || 0 };
    save(all);
  }
  return all[club];
}
export function saveSeason(S) { const all = load(); all[S.club] = S; save(all); }
export function newSeason(club) { const all = load(), t = all[club]?.titles || 0, y = (all[club]?.year || 0) + 1; delete all[club]; save(all); const S = season(club); S.titles = t; S.year = y; saveSeason(S); return S; }

/** Tu próximo partido: { h, a, j } (o null si la liga ha terminado). */
export function nextMatch(S) {
  if (S.j >= S.rounds.length) return null;
  const m = S.rounds[S.j].find(x => x.h === S.club || x.a === S.club);
  return { ...m, j: S.j };
}
// resultado simulado: goles de Poisson según la diferencia de media (el de casa, un poco mejor)
function simulate(h, a, rnd) {
  const d = (CLUBS[h].ovr - CLUBS[a].ovr) / 14;
  const pois = (l) => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= rnd(); } while (p > L); return k - 1; };
  return [pois(1.35 * Math.exp(d * 0.5) * 1.08), pois(1.35 * Math.exp(-d * 0.5) * 0.95)];
}
/** Apunta tu resultado (goles de tu club y del rival), simula el resto de la jornada y avanza. Devuelve la jornada. */
export function playRound(S, mine, theirs) {
  const R = S.rounds[S.j], rnd = rng(S.year * 1000 + S.j * 37 + S.club.length);
  for (const m of R) {
    if (mine == null) m.g = simulate(m.h, m.a, rnd);   // (también el tuyo, si lo simulas)
    else if (m.h === S.club) m.g = [mine, theirs];
    else if (m.a === S.club) m.g = [theirs, mine];
    else m.g = simulate(m.h, m.a, rnd);
  }
  S.j++;
  if (S.j >= S.rounds.length) { const t = table(S); S.champion = t[0].id; if (S.champion === S.club) S.titles = (S.titles || 0) + 1; }
  saveSeason(S);
  return R;
}
/** Clasificación: puntos, diferencia de goles y goles a favor. */
export function table(S) {
  const T = Object.fromEntries(S.teams.map(id => [id, { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }]));
  for (const R of S.rounds) for (const m of R) {
    if (!m.g) continue; const [x, y] = m.g, H = T[m.h], A = T[m.a];
    H.pj++; A.pj++; H.gf += x; H.gc += y; A.gf += y; A.gc += x;
    if (x > y) { H.g++; A.p++; H.pts += 3; } else if (x < y) { A.g++; H.p++; A.pts += 3; } else { H.e++; A.e++; H.pts++; A.pts++; }
  }
  return Object.values(T).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || CLUBS[b.id].ovr - CLUBS[a.id].ovr);
}
/** Dificultad de la IA rival según la diferencia de media. */
export function levelFor(mine, rival) { const d = CLUBS[rival].ovr - CLUBS[mine].ovr; return d > 4 ? 'dificil' : d < -4 ? 'facil' : 'normal'; }

// ---------------------------------------------------------------- pantallas (estilo FIFA)
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// la equipación en pequeño: camiseta con su dibujo, pantalón y medias
export function kitSvg(id, size = 44) {
  const c = CLUBS[id], s2 = c.shirt2 || c.shirt, uid = 'k' + id + Math.random().toString(36).slice(2, 6);
  const fill = c.pattern === 'rayas' ? `url(#${uid})` : c.shirt;
  const defs = c.pattern === 'rayas' ? `<defs><pattern id="${uid}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="8" fill="${c.shirt}"/><rect x="4" width="4" height="8" fill="${s2}"/></pattern></defs>` : '';
  const band = c.pattern === 'banda' ? `<path d="M12 8 L36 34 L36 40 L12 14 Z" fill="${s2}"/>` : '';
  return `<svg class="lg-kit" viewBox="0 0 48 64" width="${size * 0.75}" height="${size}">${defs}<path d="M14 4 L22 2 Q24 6 26 2 L34 4 L44 12 L38 20 L35 17 L35 40 L13 40 L13 17 L10 20 L4 12 Z" fill="${fill}" stroke="#1a1426" stroke-width="1.6" stroke-linejoin="round"/>${band}<path d="M13 41 L35 41 L36 50 L26 50 L24 46 L22 50 L12 50 Z" fill="${c.shorts}" stroke="#1a1426" stroke-width="1.6" stroke-linejoin="round"/><rect x="14" y="51" width="7" height="10" rx="2" fill="${c.socks}" stroke="#1a1426" stroke-width="1.4"/><rect x="27" y="51" width="7" height="10" rx="2" fill="${c.socks}" stroke="#1a1426" stroke-width="1.4"/></svg>`;
}
const CSS = `
.lg-root{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 10px) 10px calc(env(safe-area-inset-bottom,0px) + 10px);background:radial-gradient(circle at 50% 0%,#2a1460,#0d0820 70%);font-family:Nunito,system-ui,sans-serif;color:#fff;animation:lgIn .25s}
@keyframes lgIn{from{opacity:0}to{opacity:1}}
.lg-card{width:min(860px,100%);max-height:100%;overflow:auto;display:grid;gap:12px;grid-template-columns:1fr;padding:16px;border-radius:22px;background:linear-gradient(180deg,rgba(60,30,130,.55),rgba(20,10,45,.9));border:1px solid rgba(190,160,255,.3);box-shadow:0 30px 80px rgba(0,0,0,.6)}
.lg-head{display:flex;align-items:center;gap:12px}.lg-head h2{margin:0;font:400 26px 'Lilita One',Nunito,sans-serif;line-height:1}.lg-head small{display:block;color:#ffd84a;font-weight:900;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.lg-head .lg-ovr{margin-left:auto;text-align:center;background:linear-gradient(180deg,#ffe98a,#e0b020);color:#2a1a00;border-radius:12px;padding:4px 10px;font:900 22px Nunito,sans-serif;line-height:1}.lg-ovr small{color:#5a3a00!important;font-size:9px!important}
.lg-next{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px;border-radius:16px;background:rgba(255,255,255,.07);text-align:center}
.lg-next .lg-t{display:flex;flex-direction:column;align-items:center;gap:4px}.lg-next b{font-size:15px;line-height:1.1}.lg-next em{font-style:normal;font-size:12px;color:#cbbcf0}
.lg-vs{font:400 28px 'Lilita One',Nunito,sans-serif;color:#ffd84a}.lg-vs small{display:block;font:800 11px Nunito,sans-serif;color:#cbbcf0;letter-spacing:.06em}
.lg-table{width:100%;border-collapse:collapse;font-size:13px}.lg-table th{font-size:10px;color:#cbbcf0;text-transform:uppercase;letter-spacing:.06em;padding:4px 3px;text-align:center}
.lg-table td{padding:5px 3px;text-align:center;border-top:1px solid rgba(255,255,255,.08)}.lg-table td.n{text-align:left;font-weight:800;white-space:nowrap}.lg-table td.n i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px;border:1px solid rgba(0,0,0,.4)}
.lg-table tr.me td{background:rgba(255,216,74,.16)}.lg-table tr.me td.n{color:#ffd84a}.lg-table td.pts{font-weight:900}
.lg-res{display:grid;gap:4px;font-size:13px}.lg-res div{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;padding:5px 8px;border-radius:10px;background:rgba(255,255,255,.05)}.lg-res div.me{background:rgba(255,216,74,.16)}.lg-res span:first-child{text-align:right}.lg-res b{min-width:42px;text-align:center}
.lg-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.lg-btn{border:0;border-radius:14px;padding:12px;min-height:50px;font:800 15px Nunito,sans-serif;color:#fff;background:rgba(255,255,255,.12);cursor:pointer}.lg-btn.go{background:linear-gradient(180deg,#fff38f,#ffd700 55%,#f0b000);color:#2a1a00;font:400 20px 'Lilita One',Nunito,sans-serif;box-shadow:0 4px 0 #a86f00}
.lg-note{font-size:11px;color:#a99cc9;margin:0}
.lg-champ{text-align:center;padding:10px;border-radius:16px;background:linear-gradient(180deg,rgba(255,216,74,.25),rgba(255,216,74,.05))}.lg-champ b{font:400 26px 'Lilita One',Nunito,sans-serif;color:#ffd84a}
@media (orientation:landscape) and (max-height:520px){.lg-card{grid-template-columns:1.1fr 1fr;align-items:start}.lg-card>.lg-head,.lg-card>.lg-btns,.lg-card>.lg-note{grid-column:1/-1}.lg-table{font-size:12px}.lg-table td{padding:3px 2px}}
`;
function panel(html) {
  if (!document.getElementById('lg-css')) { const st = document.createElement('style'); st.id = 'lg-css'; st.textContent = CSS; document.head.appendChild(st); }
  const r = document.createElement('div'); r.className = 'lg-root'; r.innerHTML = `<div class="lg-card">${html}</div>`; document.body.appendChild(r);
  return r;
}
function tableHtml(S) {
  return `<table class="lg-table"><tr><th></th><th style="text-align:left">Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>Pts</th></tr>${table(S).map((t, i) => {
    const c = CLUBS[t.id]; return `<tr class="${t.id === S.club ? 'me' : ''}"><td>${i + 1}</td><td class="n"><i style="background:${c.shirt}"></i>${esc(c.name)}</td><td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td><td>${t.gf}</td><td>${t.gc}</td><td class="pts">${t.pts}</td></tr>`; }).join('')}</table>`;
}
function head(S, sub) {
  const c = CLUBS[S.club];
  return `<div class="lg-head">${kitSvg(S.club, 48)}<div><small>${esc(sub)}</small><h2>${esc(c.name)}</h2><span class="lg-note">${esc(c.town)} · Liga Navarra, grupo ${c.group === 'norte' ? 'Norte' : 'Sur'}${S.titles ? ` · ${S.titles} ${S.titles === 1 ? 'título' : 'títulos'}` : ''}</span></div><div class="lg-ovr">${c.ovr}<small>MEDIA</small></div></div>`;
}
/** Pantalla principal de la liga: próximo partido y clasificación. Devuelve 'play' | 'sim' | 'new' | 'exit'. */
// here: el club del pueblo en el que estás (cada jornada se juega en el campo del de casa: si no estás allí, hay que viajar)
export function ligaPanel(S, here = undefined) {
  return new Promise(res => {
    const m = nextMatch(S), c = CLUBS[S.club], away = m && here !== undefined && here !== m.h;
    let mid;
    if (m) {
      const H = CLUBS[m.h], A = CLUBS[m.a], home = m.h === S.club, rival = home ? m.a : m.h;
      mid = `<div class="lg-next"><div class="lg-t">${kitSvg(m.h, 52)}<b>${esc(H.name)}</b><em>Media ${H.ovr}</em></div><div class="lg-vs">VS<small>JORNADA ${m.j + 1} DE ${S.rounds.length}</small><small>${esc(home ? (c.field ? 'Campo de ' + c.field : 'En casa') : (CLUBS[rival].field ? 'Campo de ' + CLUBS[rival].field : 'Fuera de casa'))}</small></div><div class="lg-t">${kitSvg(m.a, 52)}<b>${esc(A.name)}</b><em>Media ${A.ovr}</em></div></div>`;
    } else {
      const ch = CLUBS[S.champion];
      mid = `<div class="lg-champ"><small>CAMPEÓN DE LA LIGA NAVARRA</small><br><b>${esc(ch.name)}</b><br>${S.champion === S.club ? '¡Sois campeones! Aupa ' + esc(c.town) + '!' : 'La próxima temporada, a por el título.'}</div>`;
    }
    const adapt = Object.values(CLUBS).some(x => x.adapt) ? '<p class="lg-note">Clubes y colores de las fichas de los clubes navarros. Pirineo, Aurrera Leitza y CD Xota: adaptación (colores del juego).</p>' : '';
    const play = away ? `<button class="lg-btn go" data-a="travel">Viajar a ${esc(CLUBS[m.h].town)}</button>` : '<button class="lg-btn go" data-a="play">¡A jugar!</button>';
    const r = panel(`${head(S, m ? `Temporada ${S.year}` : 'Fin de temporada')}${mid}${tableHtml(S)}
      <div class="lg-btns">${m ? `${play}<button class="lg-btn" data-a="sim">Simular partido</button>` : '<button class="lg-btn go" data-a="new">Nueva temporada</button>'}<button class="lg-btn" data-a="exit">Salir</button></div>${away ? `<p class="lg-note">La jornada se juega en el campo del ${esc(CLUBS[m.h].name)}: viaja a ${esc(CLUBS[m.h].town)} (en el mapa) y habla con su entrenador.</p>` : ''}${adapt}`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
/** Resultados de la jornada y clasificación. */
export function roundPanel(S, R, j) {
  return new Promise(res => {
    const rows = R.map(m => `<div class="${m.h === S.club || m.a === S.club ? 'me' : ''}"><span>${esc(CLUBS[m.h].name)}</span><b>${m.g[0]} - ${m.g[1]}</b><span>${esc(CLUBS[m.a].name)}</span></div>`).join('');
    const r = panel(`${head(S, `Resultados · jornada ${j + 1}`)}<div class="lg-res">${rows}</div>${tableHtml(S)}<div class="lg-btns"><button class="lg-btn go" data-a="ok">Continuar</button></div>`);
    r.addEventListener('click', (e) => { if (!e.target.closest('[data-a]')) return; r.remove(); res(); });
  });
}
/** Menú del club en el pueblo: liga, amistoso, fútbol sala o salir. items: [[id, texto, sub]] */
export function clubPanel(clubId, items, sub = 'Tu club') {
  return new Promise(res => {
    const S = season(clubId);
    const r = panel(`${head(S, sub)}<div class="lg-btns">${items.map(([id, t, s], i) => `<button class="lg-btn ${i === 0 ? 'go' : ''}" data-a="${id}">${esc(t)}${s ? `<br><small style="font:700 11px Nunito,sans-serif;opacity:.8">${esc(s)}</small>` : ''}</button>`).join('')}</div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
/** Elegir rival para un amistoso (todos los clubes). */
export function rivalPanel(clubId) {
  return new Promise(res => {
    const S = season(clubId);
    const list = Object.keys(CLUBS).filter(k => k !== clubId).map(k => `<button class="lg-btn" data-a="${k}" style="display:flex;align-items:center;gap:8px;text-align:left">${kitSvg(k, 34)}<span>${esc(CLUBS[k].name)}<br><small style="font-weight:700;opacity:.75">${esc(CLUBS[k].town)} · media ${CLUBS[k].ovr}</small></span></button>`).join('');
    const r = panel(`${head(S, 'Amistoso: elige rival')}<div class="lg-btns">${list}</div><div class="lg-btns"><button class="lg-btn" data-a="">Volver</button></div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a || null); });
  });
}
export { clubById, panel as lgPanel, esc as lgEsc };
