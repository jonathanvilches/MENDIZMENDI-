// Perfil del jugador: progreso por pueblo, comarca y Navarra; XP, cartas, insignias y ajustes.
import { LEVELS } from '../data/levels.js';
import { CAST } from '../data/cast.js';
import COMARCAS from '../data/comarcas.json';

const KEY = 'mendimendiz-perfil-v1';
const fresh = () => ({
  v: 1, name: '', avatar: 'sanfermin', xp: 0, created: Date.now(),
  towns: {},          // id → { done: {índice: true}, stamp: false, visits: n, best: {} }
  cards: [],          // cartas de saber (ids)
  species: [],        // especies observadas
  peaks: [],          // cimas marcadas como subidas
  badges: [],         // insignias ganadas
  seen: {},           // avisos ya mostrados
  settings: { music: true, volume: 0.8, quality: null, timeSpeed: 1 },
});

export const LEVEL_XP = (lv) => 120 * lv * (lv + 1) / 2;   // XP total necesaria para alcanzar el nivel lv+1
export function levelOf(xp) { let lv = 0; while (xp >= LEVEL_XP(lv + 1)) lv++; return { lv: lv + 1, cur: xp - LEVEL_XP(lv), need: LEVEL_XP(lv + 1) - LEVEL_XP(lv) }; }
export const RANKS = ['Txiki explorador', 'Caminante', 'Montañero', 'Guía del valle', 'Pastor de cumbres', 'Sabio de Navarra', 'Leyenda de Navarra'];
export const rankOf = (lv) => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 2))];

// Insignias: se calculan a partir del progreso
export const BADGES = [
  { id: 'first-town', name: 'Primer sello', text: 'Completa tu primer pueblo.', icon: 'stamp', test: p => stampCount(p) >= 1 },
  { id: 'five-towns', name: 'Viajero', text: 'Sella cinco pueblos.', icon: 'map', test: p => stampCount(p) >= 5 },
  { id: 'ten-towns', name: 'Trotamundos navarro', text: 'Sella diez pueblos.', icon: 'compass', test: p => stampCount(p) >= 10 },
  { id: 'all-towns', name: 'Navarra entera', text: 'Sella todos los pueblos del juego.', icon: 'trophy', test: p => stampCount(p) >= LEVELS.length },
  { id: 'comarca', name: 'Comarca completa', text: 'Completa todos los pueblos de una comarca.', icon: 'shield', test: p => COMARCAS.some(c => comarcaDone(p, c.id)) },
  { id: 'dancer', name: 'Dantzari', text: 'Supera una danza tradicional.', icon: 'dance', test: p => missionTypeDone(p, 'dance') >= 1 },
  { id: 'carnival', name: 'Rey del carnaval', text: 'Encuentra personajes de tres carnavales.', icon: 'mask', test: p => missionTypeDone(p, 'carnival') >= 3 },
  { id: 'farmer', name: 'Manos de huerta', text: 'Termina tres cosechas.', icon: 'basket', test: p => missionTypeDone(p, 'harvest') >= 3 },
  { id: 'shepherd', name: 'Pastor', text: 'Lleva rebaños al redil dos veces.', icon: 'sheep', test: p => missionTypeDone(p, 'herd') >= 2 },
  { id: 'crafts', name: 'Maestro de oficios', text: 'Aprende tres oficios antiguos.', icon: 'anvil', test: p => missionTypeDone(p, 'trade') >= 3 },
  { id: 'legends', name: 'Guardián de leyendas', text: 'Descubre tres leyendas.', icon: 'legend', test: p => missionTypeDone(p, 'legend') >= 3 },
  { id: 'architect', name: 'Ojo de arquitecto', text: 'Visita diez iglesias y monumentos.', icon: 'church', test: p => missionTypeDone(p, 'visit') >= 10 },
  { id: 'sage', name: 'Sabio del concejo', text: 'Acierta diez preguntas de los sabios.', icon: 'quiz', test: p => missionTypeDone(p, 'quiz') >= 10 },
  { id: 'runner', name: 'Pies ligeros', text: 'Gana tres carreras.', icon: 'running', test: p => missionTypeDone(p, 'race') >= 3 },
  { id: 'naturalist', name: 'Naturalista', text: 'Observa diez especies distintas.', icon: 'binoculars', test: p => p.species.length >= 10 },
  { id: 'collector', name: 'Coleccionista', text: 'Reúne treinta cartas.', icon: 'book', test: p => p.cards.length >= 30 },
  { id: 'heraldist', name: 'Heraldista', text: 'Lee cinco escudos de las fachadas.', icon: 'shield', test: p => p.cards.filter(c => c.startsWith('escudo:')).length >= 5 },
  { id: 'armorial', name: 'Armorial de Navarra', text: 'Lee el escudo oficial de cinco pueblos o valles.', icon: 'shield', test: p => p.cards.filter(c => c.startsWith('armas:')).length >= 5 },
  { id: 'peaks', name: 'Cumbres', text: 'Corona cinco cimas en las misiones de montaña.', icon: 'peak', test: p => p.peaks.length >= 5 },
];

let P = null;
export function profile() {
  if (P) return P;
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) P = Object.assign(fresh(), s, { settings: Object.assign(fresh().settings, s.settings) }); } catch (e) { }
  P ||= fresh();
  // solo los seis personajes importados: si el guardado tenía otro (Beñat, Nerea, Haritz…), pasa al primero
  if (!CAST.some(c => c.id === P.avatar)) P.avatar = CAST[0].id;
  // solo se eligen los personajes nuevos: quien llevaba uno de los antiguos (o el explorador) pasa al sanferminero
  if (!CAST.some(c => c.id === P.avatar)) P.avatar = CAST[0]?.id || 'sanfermin';
  return P;
}
import { missionSlots, edadDe } from '../data/edad.js';
export function saveProfile() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } }
export function resetProfile() { const keep = { name: P?.name, avatar: P?.avatar, settings: P?.settings }; P = Object.assign(fresh(), keep); saveProfile(); }

export const townState = (p, id) => (p.towns[id] ||= { done: {}, stamp: false, visits: 0 });
export function townProgress(p, lv) {
  if (lv.special === 'salazar') { const s = salazarState(); const n = 9, d = s ? Object.values(s.quests || {}).filter(q => q.state === 'done').length : 0; return { done: Math.min(n, d), total: n, stamp: !!s?.done || !!p.towns[lv.id]?.stamp }; }
  const t = p.towns[lv.id], slots = missionSlots(lv, edadDe(p));
  const total = slots.length;
  const done = t ? slots.filter(x => t.done[x.si]).length : 0;
  return { done, total, stamp: !!t?.stamp };
}
export function stampCount(p) { return LEVELS.filter(l => townProgress(p, l).stamp).length; }
export function comarcaTowns(id) { return LEVELS.filter(l => l.comarca === id); }
export function comarcaProgress(p, id) {
  const ts = comarcaTowns(id);
  if (!ts.length) return { done: 0, total: 0, stamps: 0, pct: 0 };
  let done = 0, total = 0, stamps = 0;
  for (const l of ts) { const pr = townProgress(p, l); done += pr.done; total += pr.total; if (pr.stamp) stamps++; }
  return { done, total, stamps, towns: ts.length, pct: total ? done / total : 0 };
}
export function comarcaDone(p, id) { const c = comarcaProgress(p, id); return c.towns > 0 && c.stamps === c.towns; }
export function navarraProgress(p) {
  let st = 0; for (const l of LEVELS) if (townProgress(p, l).stamp) st++;
  return { stamps: st, towns: LEVELS.length, comarcas: COMARCAS.filter(c => comarcaDone(p, c.id)).length, comarcasTotal: COMARCAS.filter(c => comarcaTowns(c.id).length).length };
}
export function missionTypeDone(p, type) {
  let n = 0;
  for (const l of LEVELS) { const t = p.towns[l.id]; if (!t || !l.missions) continue; l.missions.forEach((m, i) => { if (t.done[i] && m.type === type) n++; }); }
  if (type === 'quiz') n += Object.values(p.towns).reduce((a, t) => a + (t.quizOk || 0), 0) - Object.values(p.towns).filter(t => t.quizOk).length;
  return n;
}
export function salazarState() { try { return JSON.parse(localStorage.getItem('mendimendiz-salazar-v2')); } catch (e) { return null; } }

// Añade XP y devuelve las insignias nuevas
export function addXP(n) { const p = profile(); const before = levelOf(p.xp).lv; p.xp += n; return levelOf(p.xp).lv > before; }
export function checkBadges() {
  const p = profile(), fresh = [];
  for (const b of BADGES) if (!p.badges.includes(b.id) && b.test(p)) { p.badges.push(b.id); fresh.push(b); }
  return fresh;
}
// cat: el saber de Navarra al que pertenece la carta (producto, arquitectura, escudos…: ver data/saberes.js)
export function addCard(id, cat) { const p = profile(); if (cat) (p.cardCat ||= {})[id] = cat; if (p.cards.includes(id)) return false; p.cards.push(id); return true; }
