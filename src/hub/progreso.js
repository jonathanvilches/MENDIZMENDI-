// TU PROGRESO: el panel de control de la partida (hub.js s_progreso). El autor, 20 de noviembre de 2026: «Quiero que el
// dashboard sea un dashboard muy tecnológico, con anillos que se rellenan con animaciones, que se vea nuestro progreso
// como explorador, nuestro progreso como pelotari, cómo va nuestro equipo de fútbol, los rankings, que sea un panel de
// control estilo como estamos generando también las demás animaciones».
// Tres módulos con anillos concéntricos (explorador, pelotari y fútbol), cada uno con su leyenda de cifras; las
// clasificaciones (la liga de tu club y el ranking de pelotaris de tus campeonatos); las doce comarcas, cada una con su
// anillo; y lo que llevas reunido. Los anillos se llenan al entrar, uno detrás de otro (progresoVivo), las cifras suben
// desde cero (contadores de ui/motion.js, data-cuenta) y una marca recorre el borde de cada esfera, como un radar.
// Los campeonatos y la liga se leen de su guardado ('herrizherri-torneo-v1', 'herrizherri-liga-v1',
// 'herrizherri-futbol-v1') sin cargar torneo.js ni liga.js, que pesan y el menú carga solo al jugar.
import COMARCAS from '../data/comarcas.json';
import { CLUBS } from '../futbol/clubs.js';
import { stampImg } from '../assets.js';
import { iconSVG } from '../ui/icons.js';
import { avatarPortrait } from '../ui/portraits.js';
import { profile, levelOf, rankOf, comarcaProgress, comarcaTowns, navarraProgress, BADGES, checkBadges } from '../game/profile.js';
import { tuPelotari, tusCualidades, CUALIDADES } from '../game/pelotariProgreso.js';
import { esc } from '../util/html.js';
import { reducido } from '../ui/motion.js';

const I = (n, s = 24) => iconSVG(n, s);
const lee = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const pc = (a, b) => (b > 0 ? Math.max(0, Math.min(1, a / b)) : 0);

// ---------- los datos ----------
/** Tu liga de fútbol: la temporada con más jornadas jugadas, su tabla y tu sitio en ella (o null si no has empezado ninguna). */
function tuLiga() {
  const todas = Object.values(lee('herrizherri-liga-v1', {}) || {}).filter(S => S?.rounds?.length && CLUBS[S.club]);
  if (!todas.length) return null;
  const S = todas.sort((a, b) => (b.j || 0) - (a.j || 0))[0];
  const T = Object.fromEntries(S.teams.map(id => [id, { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }]));
  for (const R of S.rounds) for (const m of R) {
    if (!m.g) continue; const [x, y] = m.g, H = T[m.h], A = T[m.a]; if (!H || !A) continue;
    H.pj++; A.pj++; H.gf += x; H.gc += y; A.gf += y; A.gc += x;
    if (x > y) { H.g++; A.p++; H.pts += 3; } else if (x < y) { A.g++; H.p++; A.pts += 3; } else { H.e++; A.e++; H.pts++; A.pts++; }
  }
  const tabla = Object.values(T).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || (CLUBS[b.id]?.ovr || 0) - (CLUBS[a.id]?.ovr || 0));
  return { S, tabla, pos: tabla.findIndex(r => r.id === S.club) + 1, jornadas: S.rounds.length, titulos: S.titles || 0 };
}
/** El ranking de pelotaris de tus campeonatos: ganados, perdidos y tantos de todos los partidos jugados en ellos. */
function rankingPelota() {
  const fila = new Map(); let txapelas = 0, campeonatos = 0;
  for (const T of Object.values(lee('herrizherri-torneo-v1', {}) || {})) {
    if (!T?.players?.length) continue; campeonatos++; txapelas += T.txapelas || 0;
    for (const P of T.past || []) for (const m of P.matches || []) {
      if (!m?.s) continue;
      for (const [i, j, k] of [[m.a, 0, 1], [m.b, 1, 0]]) {
        const pl = T.players[i]; if (!pl) continue;
        const key = pl.you ? '·tú' : `${pl.name}|${pl.town}`, r = fila.get(key) || { name: pl.you ? (profile().name || 'Tú') : pl.name, town: pl.town, you: !!pl.you, g: 0, p: 0, tf: 0, tc: 0 };
        r.tf += m.s[j]; r.tc += m.s[k]; m.s[j] > m.s[k] ? r.g++ : r.p++; fila.set(key, r);
      }
    }
  }
  const lista = [...fila.values()].sort((a, b) => b.g - a.g || (b.tf - b.tc) - (a.tf - a.tc) || b.tf - a.tf || a.p - b.p);
  return { lista, pos: lista.findIndex(r => r.you) + 1, txapelas, campeonatos };
}

// ---------- las piezas ----------
// una esfera de anillos concéntricos: aros [{ f (0 a 1), c (color o url del degradado) }], de fuera adentro, con las
// marcas del borde, la marca que la recorre y la cifra del centro, sola (sin palabra debajo: con los anillos llenos chocaba
// con ellos; el autor, 21 nov 2026, «que se dé por hecho que es el progreso de Navarra y no pongas Navarra»)
const R0 = 52, PASO = 11;
function esfera(aros, centro, id) {
  const marcas = Array.from({ length: 60 }, (_, i) => { const a = i / 60 * Math.PI * 2, r1 = 59, r2 = i % 5 ? 61 : 63.5;
    return `<line x1="${(64 + Math.sin(a) * r1).toFixed(2)}" y1="${(64 - Math.cos(a) * r1).toFixed(2)}" x2="${(64 + Math.sin(a) * r2).toFixed(2)}" y2="${(64 - Math.cos(a) * r2).toFixed(2)}"/>`; }).join('');
  const anillos = aros.map((a, i) => { const r = R0 - i * PASO, L = 2 * Math.PI * r;
    return `<circle class="pg-pista" cx="64" cy="64" r="${r}"/><circle class="pg-aro" cx="64" cy="64" r="${r}" style="--L:${L.toFixed(2)};--off:${(L * (1 - a.f)).toFixed(2)};--i:${i};stroke:${a.c}"/>`; }).join('');
  return `<div class="pg-esf"><svg viewBox="0 0 128 128" aria-hidden="true">
      <defs><linearGradient id="pgG${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ac8"/><stop offset="1" stop-color="#b54bff"/></linearGradient></defs>
      <g class="pg-marcas">${marcas}</g><g class="pg-radar"><path d="M64 1.5 A62.5 62.5 0 0 1 96.6 10.5" /></g>
      <g transform="rotate(-90 64 64)">${anillos}</g></svg>
    <div class="pg-cen"><b data-cuenta>${centro}</b></div></div>`;
}
const dato = (c, t, v, de) => `<li style="--c:${c}"><i></i><span>${t}</span><b data-cuenta>${v}${de != null ? `<em>/${de}</em>` : ''}</b></li>`;
const modulo = (cls, kicker, chip, titulo, cuerpo, ir) => `<article class="pg-mod ${cls}"${ir ? ` data-go="${ir}" role="button" tabindex="0"` : ''}>
    <header><small class="pg-k">${kicker}</small>${chip ? `<span class="pg-chip">${chip}</span>` : ''}</header><h3>${titulo}</h3>${cuerpo}</article>`;

const C1 = 'url(#pgG{id})', C2 = '#7f8cff', C3 = '#3fd6c4', C4 = '#ffc457';

/** El panel entero, en HTML. */
export function progresoHTML(cabeza) {
  const p = profile(), L = levelOf(p.xp), N = navarraProgress(p), CC = COMARCAS.filter(c => comarcaTowns(c.id).length);
  const PR = CC.map(c => ({ c, r: comarcaProgress(p, c.id) })), md = PR.reduce((a, x) => a + x.r.done, 0), mt = PR.reduce((a, x) => a + x.r.total, 0);
  checkBadges();
  const P = tuPelotari(), Q = tusCualidades(), qm = CUALIDADES.reduce((a, k) => a + Q[k], 0) / CUALIDADES.length;
  const F = (() => { try { return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, ...(lee('herrizherri-futbol-v1', {}) || {}) }; } catch (e) { return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 }; } })();
  const LG = tuLiga(), RK = rankingPelota();
  const navPct = Math.round(pc(N.stamps, N.towns) * 100);
  const col = (s, id) => s.replace('{id}', id);

  const explorador = modulo('pg-m-exp', 'Explorador', `Nivel ${L.lv}`, esc(rankOf(L.lv)),
    `<div class="pg-cuerpo">${esfera([{ f: pc(N.stamps, N.towns), c: col(C1, 'e') }, { f: pc(md, mt), c: C2 }, { f: pc(L.cur, L.need), c: C3 }], navPct + '<em>%</em>', 'e')}
      <ul class="pg-ley">${dato(col('#ff7ac8', ''), 'Sellos de pueblo', N.stamps, N.towns)}${dato(C2, 'Misiones', md, mt)}${dato(C3, 'Experiencia', L.cur, L.need)}${dato(C4, 'Comarcas', N.comarcas, N.comarcasTotal)}</ul></div>`, 'passport');
  const pelotari = modulo('pg-m-pel', 'Pelotari', `Nivel ${P.n}`, P.partidos ? `${P.ganados} ${P.ganados === 1 ? 'partido ganado' : 'partidos ganados'}` : 'Aún sin partidos',
    `<div class="pg-cuerpo">${esfera([{ f: pc(P.en, P.falta), c: col(C1, 'p') }, { f: pc(P.ganados, P.partidos), c: C2 }, { f: pc(qm - 3, 2), c: C3 }], P.n, 'p')}
      <ul class="pg-ley pg-q">${CUALIDADES.map((k, i) => `<li style="--c:${[ '#ff7ac8', C2, C3, C4][i]}"><span>${{ fuerza: 'Fuerza', velocidad: 'Velocidad', agilidad: 'Agilidad', precision: 'Precisión' }[k]}</span><b data-cuenta>${Math.round(40 + (Q[k] - 1) * 14.75)}</b><u><i style="--f:${pc(Q[k] - 1, 4).toFixed(3)}"></i></u></li>`).join('')}</ul></div>`, 'sports');
  const futbol = modulo('pg-m-fut', 'Fútbol', LG ? esc(CLUBS[LG.S.club]?.name || '') : (F.played ? 'Amistosos' : 'Sin club'), LG ? `${LG.pos}.º en la liga` : F.played ? `${F.played} ${F.played === 1 ? 'partido' : 'partidos'}` : 'Elige tu club',
    `<div class="pg-cuerpo">${esfera([{ f: LG ? pc(LG.S.j || 0, LG.jornadas) : 0, c: col(C1, 'f') }, { f: pc(F.won, F.played), c: C2 }, { f: pc(F.gf, F.gf + F.ga), c: C3 }], LG ? LG.pos + '<em>.º</em>' : F.won, 'f')}
      <ul class="pg-ley">${LG ? dato('#ff7ac8', 'Jornada', LG.S.j || 0, LG.jornadas) : dato('#ff7ac8', 'Partidos', F.played)}${dato(C2, 'Ganados', F.won, F.played || null)}${dato(C3, 'Goles a favor', F.gf)}${dato(C4, LG ? 'Ligas ganadas' : 'Goles en contra', LG ? LG.titulos : F.ga)}</ul></div>`, 'sports');

  // las clasificaciones
  const liga = LG ? `<ol class="pg-tabla">${LG.tabla.slice(0, 6).map((r, i) => `<li class="${r.id === LG.S.club ? 'tu' : ''}"><b>${i + 1}</b><span>${esc(CLUBS[r.id]?.name || r.id)}</span><small>${r.pj} PJ</small><em data-cuenta>${r.pts}</em></li>`).join('')}
      ${LG.pos > 6 ? `<li class="tu"><b>${LG.pos}</b><span>${esc(CLUBS[LG.S.club]?.name || '')}</span><small>${LG.tabla[LG.pos - 1].pj} PJ</small><em>${LG.tabla[LG.pos - 1].pts}</em></li>` : ''}</ol>`
    : `<p class="pg-vacio">${I('balon', 26)}<span>Elige tu club en Torneos y juega la liga: aquí verás la clasificación.</span></p>`;
  const top = RK.lista.slice(0, 6), yo = RK.pos > 6 ? RK.lista[RK.pos - 1] : null;
  const pelota = RK.lista.length ? `<ol class="pg-tabla">${top.map((r, i) => `<li class="${r.you ? 'tu' : ''}"><b>${i + 1}</b><span>${esc(r.name)}</span><small>${r.g}-${r.p}</small><em data-cuenta>${r.tf - r.tc > 0 ? '+' : ''}${r.tf - r.tc}</em></li>`).join('')}
      ${yo ? `<li class="tu"><b>${RK.pos}</b><span>${esc(yo.name)}</span><small>${yo.g}-${yo.p}</small><em>${yo.tf - yo.tc > 0 ? '+' : ''}${yo.tf - yo.tc}</em></li>` : ''}</ol>`
    : `<p class="pg-vacio">${I('pelota', 26)}<span>Juega un campeonato de pelota: los pelotaris contra los que juegues entrarán en el ranking.</span></p>`;

  const anilloC = (f) => { const L2 = 2 * Math.PI * 15; return `<svg class="pg-mini" viewBox="0 0 40 40" aria-hidden="true"><circle class="pg-pista" cx="20" cy="20" r="15"/><circle class="pg-aro" cx="20" cy="20" r="15" transform="rotate(-90 20 20)" style="--L:${L2.toFixed(2)};--off:${(L2 * (1 - f)).toFixed(2)};--i:0;stroke:#ff7ac8"/></svg>`; };

  return `${cabeza('Tu partida · Panel de control', 'medal', 'Tu progreso')}
    <div class="pg-panel">
      <section class="pg-yo"><span class="pg-av" style="--xp:${pc(L.cur, L.need).toFixed(3)}"><img src="${avatarPortrait(p.avatar)}" alt=""></span>
        <div><small class="pg-k">Tu partida</small><b>${esc(p.name || 'Aventurero')}</b><small class="pg-r">${esc(rankOf(L.lv))} · nivel ${L.lv}</small></div>
        <ul class="pg-sum"><li><b data-cuenta>${p.badges.length}</b><small>Insignias</small></li><li><b data-cuenta>${(p.cards || []).length}</b><small>Descubiertas</small></li><li><b data-cuenta>${RK.txapelas || p.txapelas || 0}</b><small>${(RK.txapelas || p.txapelas || 0) === 1 ? 'Txapela' : 'Txapelas'}</small></li><li><b data-cuenta>${navPct}%</b><small>Navarra</small></li></ul></section>
      <section class="pg-mods">${explorador}${pelotari}${futbol}</section>
      <section class="pg-rank">
        <article class="pg-mod pg-r-lg"><header><small class="pg-k">Clasificación</small><span class="pg-chip">${LG ? `Temporada ${LG.S.year || 1}` : 'Liga'}</span></header><h3>${LG ? esc(CLUBS[LG.S.club]?.name || 'Tu liga') : 'Liga de fútbol'}</h3>${liga}</article>
        <article class="pg-mod pg-r-pl"><header><small class="pg-k">Ranking</small><span class="pg-chip">${RK.campeonatos ? `${RK.campeonatos} ${RK.campeonatos === 1 ? 'campeonato' : 'campeonatos'}` : 'Pelota'}</span></header><h3>${RK.pos ? `Puesto ${RK.pos}.º de ${RK.lista.length}` : 'Pelotaris'}</h3>${pelota}</article>
      </section>
      <h2 class="pg-h">${I('map', 22)} Comarcas</h2>
      <section class="pg-com">${PR.map(({ c, r }) => { const hecha = r.towns && r.stamps >= r.towns, f = pc(r.done + r.stamps, r.total + r.towns);
        return `<button type="button" class="pg-c${hecha ? ' ok' : ''}${r.stamps ? '' : ' cero'}" data-comarca="${c.id}"><span class="pg-ci">${anilloC(f)}<img src="${stampImg(c.id)}" alt="" loading="lazy" decoding="async"></span>
          <span><b>${esc(c.name.replace(/^Comarca de /, ''))}</b><small>${r.stamps}/${r.towns} sellos · ${r.done}/${r.total} misiones</small></span><em>${Math.round(f * 100)}%</em></button>`; }).join('')}</section>
    </div>`;
}

/** Pone en marcha las animaciones del panel ya pintado: los anillos se llenan, uno detrás de otro. */
export function progresoVivo(raiz) {
  const pan = raiz?.querySelector('.pg-panel'); if (!pan) return;
  if (reducido()) { pan.classList.add('vivo', 'quieto'); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => pan.classList.add('vivo')));
}
