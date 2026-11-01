// Los montes que el mapa del inicio enseña además de los de la colección (src/data/mountains.json), en las comarcas
// que tienen pocos: las cimas con nombre de OpenStreetMap (de Overture, tools/relieve/cimas-overture.py) que más
// destacan, lo que suben sobre lo más bajo a 1,5 km a la redonda con el relieve de verdad (teselas «terrarium» de AWS,
// nivel 12), al menos 120 m; dentro de Navarra con un kilómetro de margen (nada de Aragón, Álava o Gipuzkoa), a más de
// 4 km entre sí y de los de la colección, y como mucho seis por comarca.
// Uso: node tools/relieve/montes-mapa.mjs <cimas de Overture .json> <carpeta para las teselas> > src/data/montes-mapa.js
import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('sharp');
const [CIMAS, TESELAS] = process.argv.slice(2);
const R0 = new URL('../../src/data/', import.meta.url);
const M = JSON.parse(readFileSync(new URL('mountains.json', R0), 'utf8')), COM = JSON.parse(readFileSync(new URL('comarcas.json', R0), 'utf8'));
const OSM = JSON.parse(readFileSync(CIMAS, 'utf8')).filter(o => o.k === 'peak' && o.n);
const POCOS = 6, MIN_REL = 120, MAX = 6;
const mapaXY = (lat, lon) => [19 + (lon + 2.52) / 1.80 * 709, 17 + (43.325 - lat) / 1.43 * 765];
const polys = COM.map(c => ({ id: c.id, P: c.path.split(/Z/i).map(s => [...s.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map(m => [+m[1], +m[2]])).filter(p => p.length > 2) }));
const dentro = (P, x, y) => { let r = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) r = !r; } return r; };
const comarca = (lat, lon) => { const [x, y] = mapaXY(lat, lon); return polys.find(c => c.P.some(P => dentro(P, x, y)))?.id; };
const km = (a, b, c, d) => Math.hypot((c - a) * 111.32, (d - b) * 111.32 * Math.cos(a * Math.PI / 180));
const paso = (lat, lon, dkm, ang) => [lat + Math.cos(ang) * dkm / 111.32, lon + Math.sin(ang) * dkm / (111.32 * Math.cos(lat * Math.PI / 180))];
const Z = 12, N = 2 ** Z, tile = new Map();
async function alt(lat, lon) {
  const fx = (lon + 180) / 360 * N, la = lat * Math.PI / 180, fy = (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * N, tx = Math.floor(fx), ty = Math.floor(fy), k = `${tx}-${ty}`;
  if (!tile.has(k)) { const f = `${TESELAS}/${Z}-${k}.png`; if (!existsSync(f)) execFileSync('curl', ['-sS', '--fail', '--max-time', '60', '-o', f, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`]); const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true }); tile.set(k, { data, ch: info.channels }); }
  const t = tile.get(k), o = (Math.min(255, Math.floor((fy - ty) * 256)) * 256 + Math.min(255, Math.floor((fx - tx) * 256))) * t.ch; return t.data[o] * 256 + t.data[o + 1] + t.data[o + 2] / 256 - 32768;
}
// (los nombres que no dicen cuál es: «Alto», «Cerro», «Vértice…»)
const GENERICO = /^(alto|cerro|cabezo|monte|pico|pe[ñn]a|v[ée]rtice.*|punta|loma|cota|la cruz|el alto|mirador|alto de la cruz)$/i;
const cuantos = {}; for (const m of M) cuantos[m.region] = (cuantos[m.region] || 0) + 1;
const por = {};
for (const o of OSM) {
  const c = comarca(o.lat, o.lon); if (!c || (cuantos[c] || 0) >= POCOS) continue;
  if (GENERICO.test(o.n.trim()) || /\d/.test(o.n)) continue;
  if (M.some(m => km(m.lat, m.lon, o.lat, o.lon) < 4)) continue;
  if (![0, 1, 2, 3, 4, 5, 6, 7].every(a => comarca(...paso(o.lat, o.lon, 1, a * Math.PI / 4)))) continue;
  (por[c] ||= []).push(o);
}
const out = [];
for (const [c, L] of Object.entries(por).sort()) {
  for (const o of L) { o.h0 = await alt(o.lat, o.lon); let mn = 1e9; for (let a = 0; a < 16; a++) mn = Math.min(mn, await alt(...paso(o.lat, o.lon, 1.5, a * Math.PI / 8))); o.rel = o.h0 - mn; }
  const el = [];
  for (const o of L.filter(o => o.rel >= MIN_REL).sort((a, b) => b.rel - a.rel)) { if (el.length >= MAX) break; if (!el.some(e => km(e.lat, e.lon, o.lat, o.lon) < 4)) el.push(o); }
  for (const o of el) out.push({ n: o.n.trim(), h: Math.round(o.h ?? o.h0), lat: +o.lat.toFixed(5), lon: +o.lon.toFixed(5), c });
}
console.log(`// Los montes que el mapa del inicio enseña además de los de la colección (mountains.json), en las comarcas que tienen
// pocos. Los elige tools/relieve/montes-mapa.mjs: cimas con nombre de OpenStreetMap que destacan sobre su entorno.
// © OpenStreetMap contributors, Overture Maps Foundation (ODbL 1.0): una base de datos derivada, con la misma licencia.
// [{ n: nombre, h: altura en m, lat, lon, c: comarca }]
export const MONTES_MAPA = ${JSON.stringify(out)};`);
