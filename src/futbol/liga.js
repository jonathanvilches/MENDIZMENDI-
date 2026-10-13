// Liga Navarra (como el modo carrera de los juegos de fútbol): juegas con el club de tu pueblo contra los clubes de tu zona (grupo
// Norte o Sur), todos contra todos a una vuelta (siete jornadas). Tu partido lo juegas tú; los demás de la jornada se
// simulan según la media de cada club. Clasificación con puntos, goles y diferencia; al final, el campeón.
// La temporada se guarda en localStorage ('mendimendiz-liga-v1'), una por club.
import { clubImg } from '../ui/escudoImg.js';
import { jugadorBusto, jugadorDuo, bustoSrc } from './jugadorFig.js';
import { CLUBS, clubById } from './clubs.js';
import { TEAMS } from './rules.js';

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

// ---------------------------------------------------------------- pantallas (como en los juegos de fútbol)
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// la equipación en pequeño: camiseta con su dibujo, pantalón y medias
export function kitSvg(id, size = 44) { return kitSvgOf(CLUBS[id], size, 'k' + id); }
/** El emblema del equipo (src/ui/escudoImg.js) en el mismo hueco que su camiseta; si no lo tiene, la camiseta. */
export const crest = (id, size = 44) => clubImg(id) ? `<img class="lg-kit lg-em" src="${clubImg(id)}" width="${Math.round(size * 0.75)}" height="${size}" alt="">` : kitSvg(id, size);
/** La camiseta, el pantalón y las medias de un equipo (c: { shirt, shirt2, pattern, shorts, socks }) en SVG. */
export function kitSvgOf(c, size = 44, key = 'kit') {
  const s2 = c.shirt2 || c.shirt, uid = key.replace(/[^a-z0-9]/gi, '') + Math.random().toString(36).slice(2, 6);
  const fill = c.pattern === 'rayas' ? `url(#${uid})` : c.shirt;
  const defs = c.pattern === 'rayas' ? `<defs><pattern id="${uid}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="8" fill="${c.shirt}"/><rect x="4" width="4" height="8" fill="${s2}"/></pattern></defs>` : '';
  const band = c.pattern === 'banda' ? `<path d="M12 8 L36 34 L36 40 L12 14 Z" fill="${s2}"/>` : '';
  return `<svg class="lg-kit" viewBox="0 0 48 64" width="${size * 0.75}" height="${size}">${defs}<path d="M14 4 L22 2 Q24 6 26 2 L34 4 L44 12 L38 20 L35 17 L35 40 L13 40 L13 17 L10 20 L4 12 Z" fill="${fill}" stroke="#1a1426" stroke-width="1.6" stroke-linejoin="round"/>${band}<path d="M13 41 L35 41 L36 50 L26 50 L24 46 L22 50 L12 50 Z" fill="${c.shorts}" stroke="#1a1426" stroke-width="1.6" stroke-linejoin="round"/><rect x="14" y="51" width="7" height="10" rx="2" fill="${c.socks}" stroke="#1a1426" stroke-width="1.4"/><rect x="27" y="51" width="7" height="10" rx="2" fill="${c.socks}" stroke="#1a1426" stroke-width="1.4"/></svg>`;
}
const CSS = `
.lg-root{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 8px) calc(env(safe-area-inset-right,0px) + 8px) calc(env(safe-area-inset-bottom,0px) + 8px) calc(env(safe-area-inset-left,0px) + 8px);font-family:Nunito,system-ui,sans-serif;color:#fff;animation:lgIn .25s}
@keyframes lgIn{from{opacity:0}to{opacity:1}}
/* (la tarjeta, como un rótulo de retransmisión: cristal morado, esquinas cortadas y una raya fucsia arriba) */
.lg-card{position:relative;width:min(900px,100%);max-height:100%;overflow:auto;display:grid;gap:12px;grid-template-columns:1fr;padding:16px 20px;border-radius:4px;background:linear-gradient(180deg,rgba(49,16,107,.62),rgba(12,4,30,.9));border:1px solid rgba(201,178,255,.2);box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)}
.lg-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:var(--cta);box-shadow:var(--glow)}
.lg-card>*{animation:gx-in .42s cubic-bezier(.2,.9,.3,1.15) both}.lg-card>:nth-child(2){animation-delay:.05s}.lg-card>:nth-child(3){animation-delay:.1s}.lg-card>:nth-child(n+4){animation-delay:.15s}
.lg-head{display:flex;align-items:center;gap:12px}.lg-head h2{margin:0;font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.5)}.lg-head small{display:block;color:var(--rosa);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
.lg-head .lg-ovr{margin-left:auto;text-align:center;background:var(--cta);color:#fff;border-radius:4px;padding:4px 12px;font:400 var(--fs-2xl)/1 var(--f-display);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);box-shadow:var(--glow)}.lg-ovr small{color:#fff!important;font:800 var(--fs-xs)/1 var(--f-cond)!important;letter-spacing:.1em!important}
.lg-next{position:relative;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px;border-radius:4px;background:linear-gradient(90deg,rgba(91,75,255,.4),rgba(255,255,255,.04) 42%,rgba(255,255,255,.04) 58%,rgba(255,46,136,.4));text-align:center;overflow:hidden}
.lg-next.con-j{grid-template-columns:auto minmax(0,1fr) auto minmax(0,1fr) auto;gap:4px;padding-top:0;padding-bottom:0}
/* (con los jugadores a los lados, cada línea del centro y el nombre de cada club en una sola línea: si no, «Jornada 1 de 7» se partía
   en dos; el sitio va en dos líneas, «en casa» y «El Sadar», para que el centro sea estrecho) */
.lg-next.con-j .lg-vs small{white-space:nowrap;letter-spacing:.04em;line-height:1.15}.lg-next.con-j b,.lg-next.con-j em{white-space:nowrap}
.lg-next .lg-jf{display:block;align-self:stretch;width:75px;height:auto;min-height:100px;object-fit:contain;object-position:50% 100%;-webkit-mask-image:linear-gradient(180deg,#000 78%,transparent);mask-image:linear-gradient(180deg,#000 78%,transparent)}.lg-next .lg-jf.r{transform:scaleX(-1)}
.lg-next .lg-t{display:flex;flex-direction:column;align-items:center;gap:4px}.lg-next b{font:400 var(--fs-xl)/1.1 var(--f-display);text-transform:uppercase}.lg-next em{font:600 var(--fs-sm)/1.15 var(--f-cond);font-style:normal;letter-spacing:.04em;text-transform:uppercase;color:var(--lila)}
.lg-vs{font:400 var(--fs-3xl)/1 var(--f-display);background:linear-gradient(180deg,#fff,var(--rosa));-webkit-background-clip:text;background-clip:text;color:transparent;animation:gx-pop .5s cubic-bezier(.2,1.5,.4,1) .2s both}.lg-vs small{display:block;font:800 var(--fs-xs)/1.3 var(--f-cond);color:var(--lila);-webkit-text-fill-color:var(--lila);letter-spacing:.1em}
.lg-table{width:100%;border-collapse:collapse;font-size:var(--fs-sm)}.lg-table th{font-size:var(--fs-xs);color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em;padding:4px 4px;text-align:center}
.lg-table td{padding:4px 4px;text-align:center;border-top:1px solid rgba(255,255,255,.08)}.lg-table td.n{text-align:left;font-weight:800;white-space:nowrap}.lg-em{object-fit:contain;object-position:50% 50%;flex:none}.lg-table td.n img.lg-dot{display:inline-block;width:18px;height:20px;object-fit:contain;margin:-4px 6px -4px 0;vertical-align:middle}.lg-table td.n i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:-1px;border:1px solid rgba(0,0,0,.4)}
/* (la columna del puesto, del ancho de la camiseta de la cabecera, y el nombre del club con su mismo hueco: el club empieza justo donde empieza el título) */
.lg-table tr>:first-child{width:36px;padding-left:0;padding-right:0}.lg-table tr>:nth-child(2){padding-left:12px}
.lg-table tr.me td{background:rgba(255,155,216,.16)}.lg-table tr.me td.n{color:#ff9bd8}.lg-table td.pts{font-weight:900}
.lg-res{display:grid;gap:4px;font-size:var(--fs-sm)}.lg-res div{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;padding:4px 8px;border-radius:10px;background:rgba(255,255,255,.05)}.lg-res div.me{background:rgba(255,155,216,.16)}.lg-res span:first-child{text-align:right}.lg-res b{min-width:42px;text-align:center}
.lg-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
/* botones de acción al pie (como en todo el juego): salir a la izquierda y la acción principal a la derecha, donde está el
   pulgar de las acciones; en dos filas, la principal abajo y a todo lo ancho */
.lg-foot>[data-a="exit"]{order:-1}.lg-foot>.lg-btn.go{order:2}.lg-btns>.lg-btn:only-child{grid-column:1/-1}
.lg-btn{position:relative;overflow:hidden;border:1px solid rgba(201,178,255,.3);border-radius:4px;padding:12px 20px;min-height:50px;font:800 var(--fs-md)/1.15 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;color:#fff;background:rgba(255,255,255,.07);cursor:pointer;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.lg-btn.go{border:0;background:var(--cta);color:#fff;font:400 var(--fs-xl)/1 var(--f-display);box-shadow:var(--glow)}.lg-btn.go::after{content:'';position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-150%) skewX(-20deg);animation:gx-sweep 3.2s ease-in-out .6s infinite;pointer-events:none}
.lg-btn:active{transform:translateY(1px) scale(.98)}
.lg-note{font-size:var(--fs-xs);color:#a99cc9;margin:0}.lg-head small+h2{margin-top:var(--t-mt)}.lg-head h2:not(:last-child){margin-bottom:var(--t-mb)}.lg-head .lg-note{display:block}
/* elegir rival: solo se desplaza la lista; la cabecera y «Volver» quedan siempre a la vista */
.lg-card.lg-pick{grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden}.lg-card.lg-pick>.lg-list{overflow:auto;min-height:0;overscroll-behavior:contain;padding:2px}.lg-list.more{-webkit-mask-image:linear-gradient(180deg,#000 82%,transparent);mask-image:linear-gradient(180deg,#000 82%,transparent)}
.lg-how{font-size:var(--fs-sm);line-height:1.45;color:#e6def7;margin:0;padding:8px 12px;border-radius:12px;background:rgba(255,155,216,.08);border:1px solid rgba(255,155,216,.25)}.lg-how b{color:#ff9bd8}
.lg-table td.dg{color:#cbbcf0;font-variant-numeric:tabular-nums}
.lg-rv{display:flex;align-items:center;gap:8px;text-align:left;min-width:0;padding:8px 8px}.lg-rv>span{min-width:0;flex:1}.lg-rv b,.lg-rv small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lg-rv b{font-size:var(--fs-sm)}.lg-rv small{font:700 var(--fs-xs) Nunito,sans-serif;opacity:.75}
/* (en el móvil en vertical no caben los jugadores a los lados del próximo partido: se quedan los nombres) */
@media (max-width:560px){.lg-next .lg-jf{display:none}.lg-next.con-j{grid-template-columns:1fr auto 1fr;padding:12px}}
@media (max-width:560px){.lg-card{padding:16px 12px;gap:8px}.lg-head h2{font-size:var(--fs-xl)}.lg-table .x{display:none}.lg-table{font-size:var(--fs-sm)}.lg-table td{padding:8px 4px}.lg-table th{padding:4px}.lg-btns{grid-template-columns:1fr 1fr}.lg-btns .lg-btn.go{grid-column:1/-1}}
.lg-champ{text-align:center;padding:8px;border-radius:16px;background:linear-gradient(180deg,rgba(255,155,216,.25),rgba(255,155,216,.05))}.lg-champ b{font:400 var(--fs-xl) 'MZ Display',Nunito,sans-serif;color:#ff9bd8}
@media (orientation:landscape) and (max-height:520px){
.lg-root{padding:8px}.lg-card{gap:8px 12px;padding:8px 16px}.lg-adapt{display:none}
.lg-card.lg-two{grid-template-columns:1fr 1.15fr;grid-auto-rows:min-content;align-items:start}
.lg-card.lg-two>.lg-head{grid-column:1/-1}
.lg-card.lg-two>.lg-next,.lg-card.lg-two>.lg-how,.lg-card.lg-two>.lg-res,.lg-card.lg-two>.lg-champ,.lg-card.lg-two>.lg-btns,.lg-card.lg-two>.lg-note{grid-column:1}
.lg-card.lg-two>.lg-table,.lg-card.lg-two>.tq-bracket{grid-column:2;grid-row:2/span 4;align-self:start}
.lg-card.lg-two>.lg-btns{grid-template-columns:1fr 1fr}.lg-card.lg-two>.lg-btns .lg-btn.go{grid-column:1/-1}
/* con solo dos botones (jugar o viajar, y salir) van en la misma fila: así cabe todo sin desplazar, también en euskera */
.lg-card.lg-two>.lg-btns:has(>.lg-btn:nth-child(2):last-child){grid-template-columns:1.7fr 1fr}.lg-card.lg-two>.lg-btns:has(>.lg-btn:nth-child(2):last-child)>.lg-btn.go{grid-column:auto}
.lg-table{font-size:var(--fs-xs)}.lg-table td{padding:2px}.lg-table th{padding:4px 2px}.lg-head{gap:8px}.lg-head .lg-kit{width:27px;height:36px}.lg-head h2{font-size:var(--fs-lg)}.lg-head small{font-size:var(--fs-xs)}
.lg-next{padding:8px 8px}.lg-next .lg-kit{display:none}.lg-next .lg-jf{width:60px;min-height:80px}.lg-next b{font-size:var(--fs-sm)}.lg-vs{font-size:var(--fs-xl)}
.lg-how{font-size:var(--fs-xs);line-height:1.45;padding:4px 8px}.lg-btn{min-height:44px;padding:8px 20px}.lg-btn.go{font-size:var(--fs-lg)}
.lg-rv{padding:4px 8px;gap:8px}.lg-rv .lg-kit{width:21px;height:28px}
}
/* portadas de equipo: la pareja del autor de cada equipo (el chico y la chica con su equipación); en el archivo único, su
   camiseta dibujada. El menú del club va en losas, como el de pelota; elegir club o rival, en cartas que se pasan de lado */
.lg-card.eq-menu{grid-template-rows:auto minmax(0,1fr) auto}
.eq-tiles{display:grid;grid-auto-flow:column;grid-template-columns:1.3fr;grid-auto-columns:1fr;gap:12px;min-height:0}
.eq-tile,.eq-team{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;gap:2px;min-width:0;border:1px solid rgba(201,178,255,.25);border-radius:4px;color:#fff;text-align:left;cursor:pointer;font:inherit;background:linear-gradient(160deg,var(--t1,#5b4bff),var(--t2,#120a40) 75%);transition:transform .15s,border-color .15s}
.eq-tile{min-height:220px;padding:12px 22px;clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)}
.eq-tile::before,.eq-team::before{content:'';position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(125deg,transparent 0 14px,rgba(255,255,255,.035) 14px 15px)}
.eq-tile::after{content:'';position:absolute;top:-10%;bottom:-10%;left:0;width:40%;z-index:2;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:translateX(-160%) skewX(-18deg);animation:gx-sweep 6s ease-in-out var(--d,0s) infinite;pointer-events:none}
.eq-tile:active,.eq-team:active{transform:scale(.97)}.eq-tile:hover,.eq-team:hover{border-color:var(--rosa)}
.eq-tile:focus-visible,.eq-team:focus-visible{outline:3px solid #fff;outline-offset:-3px}
/* (la portada arriba, apoyada abajo y entera dentro de su caja, y el texto debajo: nunca se pisan; una sola imagen) */
.eq-tile .art,.eq-team .art{flex:1 1 0;min-height:0;position:relative;pointer-events:none}.eq-tile .art{margin:0 -8px 8px}
.eq-tile .art>img,.eq-tile .art>svg,.eq-team .art>img,.eq-team .art>svg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.eq-tile .art.trio>*{left:50%;width:auto;height:94%;top:auto;bottom:0;transform:translateX(-50%);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(180deg,#000 82%,transparent);mask-image:linear-gradient(180deg,#000 82%,transparent)}
.eq-tile .art.trio>:nth-child(1){transform:translateX(-96%) scale(.84)}.eq-tile .art.trio>:nth-child(2){z-index:1}.eq-tile .art.trio>:nth-child(3){transform:translateX(-4%) scale(.84)}
.eq-tile .k,.eq-team .k{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa);text-shadow:0 1px 3px rgba(0,0,0,.8)}
.eq-tile b{font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.55)}
.eq-tile small,.eq-team small{font:600 var(--fs-sm)/1.2 var(--f-cond);color:#ece4ff;text-shadow:0 1px 3px rgba(0,0,0,.9)}
.eq-tile.main{--t1:#ff2bd6;--t2:#3a0b6b}.eq-tile.pair{--t1:#7b2ff7;--t2:#160636}.eq-tile.free{--t1:#5b4bff;--t2:#120a40}.eq-tile.col{--t1:#c21cff;--t2:#2a0638}
.eq-foot{display:flex;justify-content:flex-start}.eq-foot .lg-btn{min-width:144px}
.lg-card.eq-pick,.lg-card.eq-menu{width:min(1100px,100%)}
.eq-teams{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(144px,168px);gap:8px;overflow-x:auto;overflow-y:hidden;overscroll-behavior:contain;scroll-snap-type:x proximity;min-height:0;padding:2px;scrollbar-width:none}
.eq-teams::-webkit-scrollbar{display:none}
.eq-teams.mr{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent)}.eq-teams.ml{-webkit-mask-image:linear-gradient(90deg,transparent,#000 40px);mask-image:linear-gradient(90deg,transparent,#000 40px)}.eq-teams.ml.mr{-webkit-mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent)}
.eq-team{min-height:240px;padding:8px 20px 12px;scroll-snap-align:start;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
.eq-team.on{--t1:#ff2bd6;--t2:#3a0b6b;border-color:var(--rosa)}
.eq-team .art{margin:32px -4px 8px}
.eq-team .em{position:absolute;top:8px;left:12px;width:24px;height:28px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
.eq-team .ovr{position:absolute;top:8px;right:12px;text-align:center;font:400 var(--fs-lg)/1 var(--f-display);text-shadow:0 2px 0 rgba(7,2,15,.5)}.eq-team .ovr small{display:block;font:800 var(--fs-xs)/1 var(--f-cond);letter-spacing:.08em;color:var(--lila);text-shadow:none}
.eq-team b{font:400 var(--fs-lg)/1.05 var(--f-display);text-transform:uppercase;white-space:nowrap;text-shadow:0 3px 0 rgba(7,2,15,.55)}
.eq-team small{min-height:2.4em}
/* (el campeón de la liga, con su pareja al lado) */
.lg-champ.con-d{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;text-align:left}.lg-champ .duo{display:block;height:112px;width:auto;filter:drop-shadow(0 6px 12px rgba(0,0,0,.5))}
@media (orientation:portrait) and (max-width:700px){
.lg-card.eq-menu{grid-template-rows:none}.eq-tiles{grid-auto-flow:row;grid-template-columns:1fr 1fr;grid-auto-columns:auto}.eq-tile.main,.eq-tiles>.eq-tile:last-child:nth-child(even){grid-column:1/-1}.eq-tile{min-height:200px}.eq-tile .art{min-height:112px}.eq-tile.main .art{min-height:150px}.eq-tile b{font-size:var(--fs-xl)}
.eq-teams{grid-auto-flow:row;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-columns:auto;overflow-x:hidden;overflow-y:auto;scroll-snap-type:none}.eq-team{min-height:212px}
.eq-teams.mr,.eq-teams.ml{-webkit-mask-image:none;mask-image:none}.eq-teams.mb{-webkit-mask-image:linear-gradient(180deg,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(180deg,#000 calc(100% - 40px),transparent)}
}
@media (orientation:landscape) and (max-height:520px){
.lg-card.eq-menu,.lg-card.eq-pick{height:100%}.eq-tile{min-height:0;padding:8px 12px}.eq-tile b{font-size:var(--fs-xl)}.eq-tile .art{margin-bottom:4px}
.eq-teams{grid-auto-columns:clamp(128px,18vw,160px)}.eq-team{min-height:0;padding:8px 18px 10px}.eq-team .art{margin-top:28px}.lg-champ .duo{height:84px}
}
/* (en los móviles más estrechos, las losas iguales y el título algo menor: «Lagunartekoa» cabe entero) */
@media (orientation:landscape) and (max-width:720px){.eq-tiles{grid-template-columns:1fr}.eq-tile b{font-size:var(--fs-lg)}}
/* (muy poca altura: sin el grupo encima del nombre, para que la portada no se quede pequeña) */
@media (orientation:landscape) and (max-height:380px){.eq-team .k,.eq-team small,.lg-card.eq-pick .lg-head .lg-note{display:none}}
/* (en pantallas altas, como el iPad tumbado, la portada con su altura: no se queda diminuta encima del texto) */
@media (min-height:561px) and (orientation:landscape){.eq-tile .art{min-height:clamp(150px,26vh,240px)}.eq-team{min-height:clamp(240px,40vh,320px)}}
/* muy poca altura (iPhone con la barra de Safari): la explicación en dos líneas y los botones siempre a la vista */
/* (la explicación de la liga, plegada en dos líneas: en el móvil tumbado cabe todo sin desplazar; mientras está plegada, sin
   relleno abajo, que dejaba asomar el principio de la línea siguiente) */
@media (orientation:landscape) and (max-height:400px){.lg-root .lg-how.vm-clamp{--vm-lines:2!important}.lg-root .lg-how.vm-clamp:not(.vm-open){padding-bottom:0}}
@media (orientation:landscape) and (max-height:380px){.lg-card{gap:4px 12px;padding:8px 16px}.lg-next{padding:4px 8px}.lg-next .lg-jf{width:54px;min-height:72px}.lg-vs{font-size:var(--fs-xl)}.lg-btn{min-height:44px}}
`;
function panel(html) {
  if (!document.getElementById('lg-css')) { const st = document.createElement('style'); st.id = 'lg-css'; st.textContent = CSS; document.head.appendChild(st); }
  const r = document.createElement('div'); r.className = 'lg-root gx-bg'; r.innerHTML = `<div class="lg-card">${html}</div>`; document.body.appendChild(r);
  // (con clasificación o cuadro, en el móvil tumbado va a dos columnas: lo demás a la izquierda y la tabla a la derecha)
  if (r.querySelector('.lg-table, .tq-bracket')) r.firstElementChild.classList.add('lg-two');
  // listas que se desplazan: un degradado abajo avisa de que hay más (en el móvil tumbado no se veían los últimos clubes)
  for (const L of r.querySelectorAll('.lg-list')) { const upd = () => L.classList.toggle('more', L.scrollHeight - L.scrollTop - L.clientHeight > 6); L.addEventListener('scroll', upd, { passive: true }); requestAnimationFrame(upd); }
  return r;
}
// (en el móvil, solo PJ · DG · Pts; las demás columnas se ven en pantallas anchas)
function tableHtml(S) {
  return `<table class="lg-table"><tr><th></th><th style="text-align:left">Club</th><th>PJ</th><th class="x">G</th><th class="x">E</th><th class="x">P</th><th class="x">GF</th><th class="x">GC</th><th>DG</th><th>Pts</th></tr>${table(S).map((t, i) => {
    const c = CLUBS[t.id], dg = t.gf - t.gc; return `<tr class="${t.id === S.club ? 'me' : ''}"><td>${i + 1}</td><td class="n">${clubImg(t.id) ? `<img class="lg-dot" src="${clubImg(t.id)}" alt="">` : `<i style="background:${c.shirt}"></i>`}${esc(c.name)}</td><td>${t.pj}</td><td class="x">${t.g}</td><td class="x">${t.e}</td><td class="x">${t.p}</td><td class="x">${t.gf}</td><td class="x">${t.gc}</td><td class="dg">${dg > 0 ? '+' + dg : dg}</td><td class="pts">${t.pts}</td></tr>`; }).join('')}</table>`;
}
// cómo funciona (solo al empezar la temporada, para no repetirlo en cada jornada)
const HOW = '<p class="lg-how"><b>Cómo funciona:</b> siete jornadas, todos contra todos con los clubes de tu grupo. Tus partidos los juegas tú (o los simulas); los demás se simulan solos. Todos los partidos se juegan en El Sadar. Tres puntos por victoria y uno por empate.</p>';
function head(S, sub) {
  const c = CLUBS[S.club];
  return `<div class="lg-head">${crest(S.club, 48)}<div><small>${esc(sub)}</small><h2>${esc(c.name)}</h2><span class="lg-note">${esc(c.town)} · Liga Navarra, grupo ${c.group === 'norte' ? 'Norte' : 'Sur'}${S.titles ? ` · ${S.titles} ${S.titles === 1 ? 'título' : 'títulos'}` : ''}</span></div><div class="lg-ovr">${c.ovr}<small>MEDIA</small></div></div>`;
}
/** Pantalla principal de la liga: próximo partido y clasificación. Devuelve 'play' | 'sim' | 'new' | 'exit'. */
// (todas las jornadas se juegan en El Sadar: se juegan desde donde estés, sin viajar)
export function ligaPanel(S) {
  return new Promise(res => {
    const m = nextMatch(S), c = CLUBS[S.club];
    let mid;
    if (m) {
      const H = CLUBS[m.h], A = CLUBS[m.a], home = m.h === S.club;
      // (en la web, el busto del jugador de cada club a los lados, sin texto encima; en el archivo único no hay imagen)
      const fh = jugadorBusto(m.h, 'lg-jf'), fa = jugadorBusto(m.a, 'lg-jf r');
      mid = `<div class="lg-next${fh && fa ? ' con-j' : ''}">${fh && fa ? fh : ''}<div class="lg-t">${crest(m.h, 52)}<b>${esc(H.name)}</b><em>Media ${H.ovr}</em></div><div class="lg-vs">VS<small>JORNADA ${m.j + 1} DE ${S.rounds.length}</small><small>${home ? 'EN CASA' : 'FUERA'}</small><small>EL SADAR</small></div><div class="lg-t">${crest(m.a, 52)}<b>${esc(A.name)}</b><em>Media ${A.ovr}</em></div>${fh && fa ? fa : ''}</div>`;
    } else {
      const ch = CLUBS[S.champion], d = jugadorDuo(S.champion);
      // (en la web, la pareja del club campeón al lado)
      mid = `<div class="lg-champ${d ? ' con-d' : ''}">${d}<div><small>CAMPEÓN DE LA LIGA NAVARRA</small><br><b>${esc(ch.name)}</b><br>${S.champion === S.club ? '¡Sois campeones! Aupa ' + esc(c.town) + '!' : 'La próxima temporada, a por el título.'}</div></div>`;
    }
    const adapt = Object.values(CLUBS).some(x => x.adapt) ? '<p class="lg-note lg-adapt">Equipos con el nombre de cada pueblo o valle, sin nombres ni escudos de clubes de verdad.</p>' : '';
    const play = '<button class="lg-btn go" data-a="play">¡A jugar!</button>';
    const r = panel(`${head(S, m ? `Temporada ${S.year}` : 'Fin de temporada')}${mid}${m && S.j === 0 ? HOW : ''}${tableHtml(S)}
      <div class="lg-btns lg-foot">${m ? `${play}<button class="lg-btn" data-a="sim">Simular partido</button>` : '<button class="lg-btn go" data-a="new">Nueva temporada</button>'}<button class="lg-btn" data-a="exit">Salir</button></div>${adapt}`);
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
// las portadas de equipo: la pareja del autor (el chico y la chica con su equipación) en la web y, en el archivo único, la
// camiseta dibujada del equipo (un club o uno de los equipos sin club: Iruña, el visitante, el pueblo, los vecinos)
const teamArt = (id) => jugadorDuo(id) || ((CLUBS[id] || TEAMS[id]) ? kitSvgOf(CLUBS[id] || TEAMS[id], 120, 'ta' + id) : '');
// tres jugadores de clubes distintos, en abanico: sus bustos o sus camisetas
const trioArt = (ids) => ids.every(k => bustoSrc(k)) ? ids.map(k => `<img src="${bustoSrc(k)}" alt="" draggable="false">`).join('') : ids.map(k => kitSvgOf(CLUBS[k], 120, 'tt' + k)).join('');
/** Menú del club: liga, amistoso, partido o salir, en losas con la portada de cada equipo, como el menú de pelota.
 *  items: [[id, título, texto, rótulo?]] (el rótulo, encima del título; si no se da, uno según la opción) */
export function clubPanel(clubId, items, sub = 'Tu club') {
  return new Promise(res => {
    const S = season(clubId), C = CLUBS[clubId], day = Math.floor(Date.now() / 864e5);
    const others = Object.keys(CLUBS).filter(k => k !== clubId), away = others.filter(k => CLUBS[k].group !== C?.group);
    const pick = (L, i) => L[(day + i) % L.length];
    // (cada opción con su equipo: la liga, el tuyo; el amistoso, uno del otro grupo, que cambia cada día; el partido
    // rápido, Iruña; el del sello, los vecinos; cambiar de club, tres jugadores de otros clubes)
    const ART = { liga: [clubId, 'main'], amistoso: [pick(away.length ? away : others, 0), 'pair'], sadar: ['osasuna', 'free'], sala: ['vecinos', 'free'], club: [null, 'col'] };
    const KICK = { liga: S.j < S.rounds.length ? `Jornada ${S.j + 1} de ${S.rounds.length}` : 'Nueva temporada', amistoso: 'Tú eliges rival', sadar: 'En El Sadar', sala: 'En El Sadar', club: 'Tu club' };
    const tiles = items.filter(([id]) => id !== 'exit').map(([id, t, x, k], i) => {
      const [team, tone] = ART[id] || [clubId, 'free'];
      const art = id === 'club' ? `<span class="art trio">${trioArt([pick(others, 3), pick(others, 10), pick(others, 17)])}</span>` : `<span class="art">${teamArt(team)}</span>`;
      return `<button class="eq-tile ${tone}" data-a="${id}" style="--d:${(0.2 + i * 0.6).toFixed(1)}s">${art}<span class="k">${esc(k || KICK[id] || '')}</span><b>${esc(t)}</b>${x ? `<small>${esc(x)}</small>` : ''}</button>`;
    }).join('');
    const exit = items.find(([id]) => id === 'exit');
    const r = panel(`${head(S, sub)}<div class="eq-tiles">${tiles}</div>${exit ? `<div class="eq-foot"><button class="lg-btn" data-a="exit">${esc(exit[1] || 'Salir')}</button></div>` : ''}`);
    r.firstElementChild.classList.add('eq-menu');
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
// las cartas de los clubes para elegir: la portada del equipo, su escudo, su media, el grupo, el nombre y el pueblo (o
// su campo, si el club se llama como el pueblo); por grupos y por nombre
const byGroup = (ids) => ids.slice().sort((a, b) => (CLUBS[a].group || '').localeCompare(CLUBS[b].group || '') || CLUBS[a].name.localeCompare(CLUBS[b].name));
function teamCards(ids, cur) {
  return ids.map(k => {
    const c = CLUBS[k], em = clubImg(k), where = c.town && c.town !== c.name ? c.town : c.field ? `Campo de ${c.field}` : '';
    return `<button class="eq-team${k === cur ? ' on' : ''}" data-a="${k}" aria-label="${esc(c.name)}"><span class="art">${teamArt(k)}</span>${em ? `<img class="em" src="${em}" alt="">` : ''}<span class="ovr">${c.ovr}<small>MEDIA</small></span><span class="k">Grupo ${c.group === 'norte' ? 'Norte' : 'Sur'}</span><b>${esc(c.name)}</b><small>${esc(where)}</small></button>`;
  }).join('');
}
// la tira de cartas: se pasa de lado (en el móvil de pie, hacia abajo), con un degradado en el borde si hay más; la rueda
// del ratón también la mueve de lado; empieza en el club elegido
function teamPicker(top, ids, cur, back = 'Volver') {
  return new Promise(res => {
    const r = panel(`${top}<div class="eq-teams">${teamCards(ids, cur)}</div><div class="eq-foot"><button class="lg-btn" data-a="">${esc(back)}</button></div>`);
    r.firstElementChild.classList.add('lg-pick', 'eq-pick');
    const L = r.querySelector('.eq-teams');
    const upd = () => { const x = L.scrollWidth - L.clientWidth > 4; L.classList.toggle('mr', x && L.scrollWidth - L.scrollLeft - L.clientWidth > 6); L.classList.toggle('ml', x && L.scrollLeft > 6); L.classList.toggle('mb', !x && L.scrollHeight - L.scrollTop - L.clientHeight > 6); };
    L.addEventListener('scroll', upd, { passive: true });
    L.addEventListener('wheel', (e) => { if (L.scrollWidth > L.clientWidth + 4 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { L.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    requestAnimationFrame(() => { const on = L.querySelector('.on'); if (on) { L.scrollLeft = Math.max(0, on.offsetLeft - (L.clientWidth - on.offsetWidth) / 2); L.scrollTop = Math.max(0, on.offsetTop - (L.clientHeight - on.offsetHeight) / 2); } upd(); });
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a || null); });
  });
}
/** Elegir rival para un amistoso (todos los clubes). */
export function rivalPanel(clubId) {
  return teamPicker(head(season(clubId), 'Amistoso: elige rival'), byGroup(Object.keys(CLUBS).filter(k => k !== clubId)), null);
}
/** Elegir tu club (campeonato desde el menú): todos los clubes, por grupos. cur: el que tenías. Devuelve su id o null. */
export function clubPick(cur = null) {
  return teamPicker('<div class="lg-head"><div><small>Campeonato de fútbol</small><h2>Elige tu club</h2><span class="lg-note">Con él juegas la Liga Navarra y los amistosos</span></div></div>', byGroup(Object.keys(CLUBS)), cur);
}
export { clubById, panel as lgPanel, esc as lgEsc };
