// «Ventajas Herrizherri»: de los sellos, las insignias y los certificados del juego a los bonos de los comercios
// (data/comercios.js). Los certificados: uno por comarca, al sellar todos sus pueblos, y el de Navarra, con todos. Un bono
// se saca de una oferta ya ganada, vale un mes, se enseña en caja (código y QR) y el comercio lo canjea con su clave en el
// propio móvil; después, hasta pasado un mes no se puede sacar otro de la misma oferta. Todo se guarda en la partida, en
// este dispositivo: sin cuentas ni datos de nadie. (Para que un bono no se pueda repetir borrando la partida hará falta un
// servidor que los apunte: VENTAJAS-COMERCIOS.md, «Fase 2».)
import { profile, saveProfile, townProgress, comarcaProgress, comarcaDone, stampCount, BADGES } from './profile.js';
import { LEVELS, levelById } from '../data/levels.js';
import COMARCAS from '../data/comarcas.json';
import { COMERCIOS, EJEMPLOS, PIN_EJEMPLO } from '../data/comercios.js';

const DIA = 86400000;
/** Los comercios que se ven: los de verdad; si aún no hay ninguno, los ejemplos */
export const comercios = () => (COMERCIOS.length ? COMERCIOS : EJEMPLOS);
export const sonEjemplos = () => !COMERCIOS.length;
export const comercioById = (id) => comercios().find(c => c.id === id);
const nombrePueblo = (id) => (levelById(id)?.name || id).split(' / ')[0];
const nombreComarca = (id) => COMARCAS.find(c => c.id === id)?.name || id;

// ---------- los certificados ----------
/** Los certificados: los de las comarcas con pueblos y el de Navarra; cada uno con hecho, su fecha y lo que lleva */
export function certificados(p = profile()) {
  const C = COMARCAS.filter(c => LEVELS.some(l => l.comarca === c.id)).map(c => { const pr = comarcaProgress(p, c.id); return { id: c.id, n: `Certificado de ${c.name}`, comarca: c, hecho: comarcaDone(p, c.id), lleva: [pr.stamps, pr.towns] }; });
  const total = LEVELS.length, sellos = stampCount(p);
  C.push({ id: 'navarra', n: 'Certificado de Navarra', hecho: sellos >= total, lleva: [sellos, total] });
  // (la fecha en que se consiguió, la primera vez que se ve hecho)
  const F = p.certs ||= {}; let nuevo = false;
  for (const c of C) { if (c.hecho && !F[c.id]) { F[c.id] = Date.now(); nuevo = true; } c.fecha = F[c.id] || null; }
  if (nuevo) saveProfile();
  return C;
}

// ---------- lo que pide cada oferta ----------
/** ¿Se cumple? y cómo se consigue: { ok, txt, lleva: [hecho, total] } */
export function requisito(req, p = profile()) {
  if (req.sello) { const l = levelById(req.sello), t = l ? townProgress(p, l) : { done: 0, total: 1, stamp: false };
    return { ok: t.stamp, txt: `El sello de ${nombrePueblo(req.sello)}`, como: `Completa las misiones de ${nombrePueblo(req.sello)}`, lleva: [t.done, t.total] }; }
  if (req.comarca) { const pr = comarcaProgress(p, req.comarca);
    return { ok: comarcaDone(p, req.comarca), txt: `El certificado de ${nombreComarca(req.comarca)}`, como: `Sella todos los pueblos de ${nombreComarca(req.comarca)}`, lleva: [pr.stamps, pr.towns] }; }
  if (req.navarra) { const s = stampCount(p);
    return { ok: s >= LEVELS.length, txt: 'El certificado de Navarra', como: 'Sella todos los pueblos del juego', lleva: [s, LEVELS.length] }; }
  if (req.insignia) { const b = BADGES.find(x => x.id === req.insignia), ok = (p.badges || []).includes(req.insignia);
    return { ok, txt: `La insignia ${b?.name || req.insignia}`, como: b?.text || '', lleva: [ok ? 1 : 0, 1] }; }
  if (req.sellos) { const s = stampCount(p);
    return { ok: s >= req.sellos, txt: `${req.sellos} sellos`, como: `Consigue ${req.sellos} sellos de cualquier pueblo`, lleva: [Math.min(s, req.sellos), req.sellos] }; }
  return { ok: false, txt: '', como: '', lleva: [0, 1] };
}

// ---------- los bonos ----------
const bonos = (p) => (p.bonos ||= []);
/** El bono de una oferta que está en juego: sin usar y sin caducar (o null) */
export function bonoActivo(com, of, p = profile(), ahora = Date.now()) { return bonos(p).find(b => b.com === com && b.of === of && !b.usado && b.hasta > ahora) || null; }
/** El estado de una oferta: 'bloqueada' (falta el requisito), 'espera' (usado hace poco: hasta cuándo), 'activa' (con su
 *  bono) o 'lista' (se puede sacar) */
export function estado(c, o, p = profile(), ahora = Date.now()) {
  const r = requisito(o.req, p); if (!r.ok) return { k: 'bloqueada', r };
  const b = bonoActivo(c.id, o.id, p, ahora); if (b) return { k: 'activa', r, b };
  const ult = bonos(p).filter(b => b.com === c.id && b.of === o.id && b.usado).sort((a, b) => b.usado - a.usado)[0];
  if (ult && ult.usado + (o.cada ?? 30) * DIA > ahora) return { k: 'espera', r, hasta: ult.usado + (o.cada ?? 30) * DIA };
  return { k: 'lista', r };
}
/** Todas las ofertas, con su comercio y su estado (filtro: { town } o { comarca }) */
export function ofertas(filtro = {}, p = profile()) {
  const out = [];
  for (const c of comercios()) {
    const l = levelById(c.town); if (filtro.town && c.town !== filtro.town) continue; if (filtro.comarca && l?.comarca !== filtro.comarca) continue;
    for (const o of c.ofertas) out.push({ c, o, l, ...estado(c, o, p) });
  }
  return out;
}
// (el código: HZ, el comercio y seis letras sin las que se confunden, con una de control al final)
const ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function codigo(com) {
  const r = new Uint8Array(6); (globalThis.crypto?.getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 256; }));
  const s = [...r].map(x => ABC[x % 32]).join(''), base = `HZ-${com}-${s}`;
  let k = 0; for (const ch of base) k = (k * 31 + ch.charCodeAt(0)) % 32;
  return `${base}${ABC[k]}`;
}
/** Comprueba la letra de control de un código (para quien lo teclea a mano en caja) */
export function codigoValido(cod) { const s = String(cod || '').toUpperCase().trim(), base = s.slice(0, -1); let k = 0; for (const ch of base) k = (k * 31 + ch.charCodeAt(0)) % 32; return /^HZ-[A-Z0-9]+-[2-9A-Z]{7}$/.test(s) && ABC[k] === s.slice(-1); }
/** Saca el bono de una oferta lista; devuelve el bono (o null si no se puede) */
export function sacaBono(comId, ofId, p = profile()) {
  const c = comercioById(comId), o = c?.ofertas.find(x => x.id === ofId); if (!c || !o) return null;
  const e = estado(c, o, p); if (e.k === 'activa') return e.b; if (e.k !== 'lista') return null;
  const ahora = Date.now(), b = { id: `${c.id}-${o.id}-${ahora.toString(36)}`, com: c.id, of: o.id, cod: codigo(c.id), desde: ahora, hasta: ahora + (o.dias ?? 30) * DIA, usado: 0, ejemplo: !!c.ejemplo };
  bonos(p).push(b); saveProfile(); return b;
}
async function huella(txt) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}
/** El comercio canjea el bono con su clave: true si la clave es la suya y el bono vale */
export async function canjea(bonoId, clave, p = profile()) {
  const b = bonos(p).find(x => x.id === bonoId), c = b && comercioById(b.com); if (!b || !c || b.usado || b.hasta < Date.now()) return false;
  const k = String(clave || '').trim(); if (!k) return false;
  const ok = c.ejemplo ? k === PIN_EJEMPLO : c.pin && (await huella(`${c.id}:${k}`)) === c.pin;
  if (!ok) return false;
  b.usado = Date.now(); saveProfile(); return true;
}
/** Los bonos que se ven en «Tus bonos»: los activos y los usados o caducados de los últimos 60 días */
export function misBonos(p = profile(), ahora = Date.now()) {
  return bonos(p).filter(b => comercioById(b.com) && (!b.usado && b.hasta > ahora || Math.max(b.usado, b.hasta) > ahora - 60 * DIA)).sort((a, b) => b.desde - a.desde)
    .map(b => { const c = comercioById(b.com), o = c.ofertas.find(x => x.id === b.of); return { b, c, o, k: b.usado ? 'usado' : b.hasta <= ahora ? 'caducado' : 'activo' }; });
}
/** Las ofertas ganadas que aún no se han visto (para el aviso del menú); vistas() las da por vistas */
export function nuevas(p = profile()) { const V = new Set(p.vtVistas || []); return ofertas({}, p).filter(x => x.k === 'lista' && !V.has(x.c.id + ':' + x.o.id)); }
export function vistas(p = profile()) { p.vtVistas = [...new Set([...(p.vtVistas || []), ...ofertas({}, p).filter(x => x.k !== 'bloqueada').map(x => x.c.id + ':' + x.o.id)])]; saveProfile(); }
export { nombrePueblo, nombreComarca, DIA };
