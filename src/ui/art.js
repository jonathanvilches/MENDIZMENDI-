// Arte propio generado por el juego: sellos de pasaporte y paisajes ilustrados de cada comarca.
import { ICONS, withDefs } from './icons.js';
import COMARCAS from '../data/comarcas.json';

const url = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s+/g, ' ')).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27');
const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const shade = (hex, k) => { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return '#' + [16, 8, 0].map(s => f((n >> s) & 255).toString(16).padStart(2, '0')).join(''); };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Símbolo de cada comarca en su sello
const EMBLEM = { bidasoa: 'fish', 'larraun-leitzaldea': 'axe', sakana: 'mask', pamplona: 'bull', pirineo: 'peak', prepirineo: 'gorge', sanguesa: 'castle', 'tierra-estella': 'bridge', 'valdizarbe-novenera': 'camino', 'zona-media': 'grapes', 'ribera-alta': 'pepper', ribera: 'artichoke' };

// Sello circular dentado, con texto en arco y emblema en el centro
export function stampURL(comarcaId, town = null, emblem = null) {
  return memo('s' + comarcaId + (town || '') + (emblem || ''), () => {
    const c = COMARCAS.find(x => x.id === comarcaId) || { name: 'Navarra', color: '#6d3b5c' };
    const col = c.color, dark = shade(col, -0.45), light = shade(col, 0.55);
    const top = 'MENDIMENDIZ', bottom = (town || c.name).toUpperCase();
    const ek = emblem || EMBLEM[comarcaId]; const ic = withDefs(ICONS[ek] ? ek : 'star');
    const teeth = Array.from({ length: 36 }, (_, i) => { const a = i / 36 * Math.PI * 2; return `${(100 + Math.cos(a) * 96).toFixed(1)},${(100 + Math.sin(a) * 96).toFixed(1)} ${(100 + Math.cos(a + Math.PI / 36) * 90).toFixed(1)},${(100 + Math.sin(a + Math.PI / 36) * 90).toFixed(1)}`; }).join(' ');
    const fs = bottom.length > 16 ? 11 : bottom.length > 11 ? 13 : 15;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">
      <defs><radialGradient id="bg" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${col}"/></radialGradient>
      <path id="ta" d="M36 100a64 64 0 0 1 128 0"/><path id="ba" d="M28 100a72 72 0 0 0 144 0"/></defs>
      <polygon points="${teeth}" fill="${dark}"/>
      <circle cx="100" cy="100" r="86" fill="url(#bg)" stroke="#fff8e8" stroke-width="4"/>
      <circle cx="100" cy="100" r="74" fill="none" stroke="#fff8e8" stroke-width="2" stroke-dasharray="3 4" opacity=".8"/>
      <circle cx="100" cy="100" r="47" fill="#fff8e8" stroke="${dark}" stroke-width="3"/>
      <text font-family="Nunito, Arial, sans-serif" font-weight="900" font-size="14" fill="#fff8e8" letter-spacing="3"><textPath href="#ta" startOffset="50%" text-anchor="middle">${top}</textPath></text>
      <text font-family="Nunito, Arial, sans-serif" font-weight="900" font-size="${fs}" fill="#fff8e8" letter-spacing="1.5"><textPath href="#ba" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">${esc(bottom)}</textPath></text>
      <g transform="translate(66 66) scale(1.06)">${ic}</g>
      ${[-1, 1].map(s => `<path d="M${100 + s * 80} 100l3 6 6 1-5 4 1 7-5-3-5 3 1-7-5-4 6-1z" fill="#fff3b0" stroke="${dark}" stroke-width="1"/>`).join('')}
    </svg>`;
    return url(svg);
  });
}

// Tonos de paisaje por tipo de comarca (cielo, colinas, árboles), usados por el diorama del mapa
export const TONES = {
  atlantic: { sky: ['#8fd0f0', '#e8f6ff'], hills: ['#2f6b3a', '#3f8a48', '#5aa854', '#7cc262'], trees: '#1f5a2e', peak: null, sun: '#fff3c0' },
  green: { sky: ['#9cd4f2', '#eaf7ff'], hills: ['#6a7a8a', '#4a8a4a', '#6aaa55', '#8cc46a'], trees: '#2f6a32', peak: '#dcd7cf', sun: '#fff3c0' },
  alpine: { sky: ['#6fb4e8', '#dff1ff'], hills: ['#5a6a80', '#2f7a4a', '#4a9a55', '#6ab862'], trees: '#1c4a30', peak: '#ffffff', sun: '#ffffff' },
  basin: { sky: ['#f6b07a', '#ffe6c2'], hills: ['#8a6a7a', '#7a9a5a', '#a0b86a', '#c2cc7a'], trees: '#4a6a3a', peak: null, sun: '#fff0b0' },
  drygreen: { sky: ['#9ccff0', '#f2f8ff'], hills: ['#b08a5a', '#8aa058', '#a8b868', '#c4c47a'], trees: '#4a6a32', peak: null, sun: '#fff3c0' },
  transition: { sky: ['#a8d6f0', '#fff4de'], hills: ['#9a8a6a', '#a4a060', '#c0b870', '#d8c884'], trees: '#5a6a3a', peak: null, sun: '#ffe9a0' },
  mediterranean: { sky: ['#f0c07a', '#fff0d0'], hills: ['#a07a5a', '#b89a5a', '#cdb46a', '#e0c882'], trees: '#6a7a3a', peak: null, sun: '#fff0b0' },
  ribera: { sky: ['#f2a86a', '#ffe8c0'], hills: ['#c8a070', '#d8b27a', '#e2c488', '#8ab05a'], trees: '#5a7a32', peak: null, sun: '#fff3c0', mesa: true },
};
