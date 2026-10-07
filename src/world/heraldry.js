// Escudos de los pueblos dibujados para el juego: versiones propias inspiradas en cada localidad (no copias),
// con corona real encima y, en muchos, la bordura con las cadenas de Navarra.
// shieldSpec(def) elige campo, bordura y figura; drawShield(g, cx, top, h, spec) lo pinta en un canvas 2D.

const FIELDS = ['#1f4f9a', '#b3202a', '#2f7d4a', '#1f4f9a', '#b3202a'];
const GOLD = '#e2b43c', SILVER = '#f3f1ea', DARK = '#3a2a1c';

function hash(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

export function shieldSpec(def) {
  const id = def.id || 'pueblo', h = hash(id), kinds = (def.landmarks || []).map(l => l.kind), name = (def.name || '').toLowerCase();
  const spec = { field: FIELDS[h % FIELDS.length], chains: h % 3 !== 1, bordure: '#b3202a', charge: 'tower', tint: GOLD };
  if (id === 'pamplona') return { field: '#1f4f9a', chains: true, bordure: '#b3202a', charge: 'lion', tint: SILVER };
  if (id === 'estella') return { field: '#b3202a', chains: false, bordure: '#1f4f9a', charge: 'star', tint: GOLD };
  if (kinds.includes('castle') || def.relief === 'hilltop') spec.charge = 'castle';
  else if (kinds.includes('bridge') || name.includes('puente') || def.river?.bigBridge) spec.charge = 'bridge';
  else if (def.family === 'pyrenean') spec.charge = 'fir';
  else if (def.family === 'atlantic') spec.charge = 'oak';
  else if (def.family === 'ribera') spec.charge = 'grapes';
  else if (def.family === 'central') spec.charge = h % 2 ? 'grapes' : 'tower';
  if (spec.field === '#b3202a') spec.bordure = '#1f4f9a';
  if (['oak', 'fir', 'grapes'].includes(spec.charge)) spec.tint = spec.charge === 'grapes' ? '#6b2f6b' : '#2f6b34';
  if (spec.field === '#2f7d4a' && spec.tint === '#2f6b34') spec.field = '#e9d9a8';
  return spec;
}

function shieldPath(g, x0, y0, w, h) {
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h * 0.55);
  g.bezierCurveTo(x0 + w, y0 + h * 0.86, x0 + w * 0.76, y0 + h, x0 + w / 2, y0 + h);
  g.bezierCurveTo(x0 + w * 0.24, y0 + h, x0, y0 + h * 0.86, x0, y0 + h * 0.55); g.closePath();
}
// punto del contorno interior (para las cadenas): t ∈ [0, 1) recorre el escudo
function rim(x0, y0, w, h, t) {
  const top = w, side = h * 0.55, curve = Math.PI * 0.5 * (w / 2 + h * 0.45) * 0.95, L = top + 2 * side + 2 * curve;
  let s = t * L;
  if (s < top) return [x0 + s, y0, 0];
  s -= top; if (s < side) return [x0 + w, y0 + s, Math.PI / 2];
  s -= side;
  if (s < 2 * curve) { const a = s / (2 * curve) * Math.PI; return [x0 + w / 2 + Math.cos(a) * w / 2, y0 + h * 0.55 + Math.sin(a) * h * 0.45, a + Math.PI / 2]; }
  s -= 2 * curve; return [x0, y0 + h * 0.55 - s, -Math.PI / 2];
}

function crown(g, cx, y, w) {
  const h = w * 0.34;
  g.fillStyle = GOLD; g.strokeStyle = DARK; g.lineWidth = Math.max(1.5, w * 0.018);
  g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx + w / 2, y); g.lineTo(cx + w * 0.44, y - h * 0.34); g.lineTo(cx - w * 0.44, y - h * 0.34); g.closePath(); g.fill(); g.stroke();
  for (let i = 0; i < 5; i++) {
    const x = cx - w * 0.4 + i * w * 0.2, t = i === 2 ? h : h * 0.72;
    g.beginPath(); g.moveTo(x - w * 0.05, y - h * 0.34); g.quadraticCurveTo(x, y - t * 0.8, x, y - t); g.quadraticCurveTo(x, y - t * 0.8, x + w * 0.05, y - h * 0.34); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, y - t - w * 0.03, w * 0.035, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  g.beginPath(); g.moveTo(cx, y - h - w * 0.06); g.lineTo(cx, y - h - w * 0.18); g.moveTo(cx - w * 0.05, y - h - w * 0.13); g.lineTo(cx + w * 0.05, y - h - w * 0.13); g.lineWidth = w * 0.03; g.strokeStyle = GOLD; g.stroke();
  g.fillStyle = '#b3202a'; for (const dx of [-0.25, 0, 0.25]) { g.beginPath(); g.arc(cx + dx * w, y - h * 0.17, w * 0.035, 0, Math.PI * 2); g.fill(); }
}

function charge(g, kind, cx, cy, s, col) {
  g.fillStyle = col; g.strokeStyle = DARK; g.lineWidth = Math.max(1.5, s * 0.025); g.lineJoin = 'round';
  const P = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x * s, cy + y * s) : g.moveTo(cx + x * s, cy + y * s))); g.closePath(); g.fill(); g.stroke(); };
  switch (kind) {
    case 'castle': {
      P([[-0.45, 0.42], [0.45, 0.42], [0.45, -0.05], [0.25, -0.05], [0.25, -0.3], [-0.25, -0.3], [-0.25, -0.05], [-0.45, -0.05]]);
      for (const x of [-0.45, -0.2, 0.05, 0.3]) P([[x, -0.05], [x + 0.12, -0.05], [x + 0.12, -0.14], [x, -0.14]]);
      for (const x of [-0.25, -0.05, 0.13]) P([[x, -0.3], [x + 0.11, -0.3], [x + 0.11, -0.4], [x, -0.4]]);
      g.fillStyle = DARK; g.beginPath(); g.moveTo(cx - 0.1 * s, cy + 0.42 * s); g.lineTo(cx - 0.1 * s, cy + 0.2 * s); g.arc(cx, cy + 0.2 * s, 0.1 * s, Math.PI, 0); g.lineTo(cx + 0.1 * s, cy + 0.42 * s); g.fill();
      for (const x of [-0.33, 0.33]) g.fillRect(cx + x * s - 0.025 * s, cy + 0.05 * s, 0.05 * s, 0.12 * s);
      break;
    }
    case 'tower': {
      P([[-0.24, 0.45], [0.24, 0.45], [0.2, -0.3], [-0.2, -0.3]]);
      for (const x of [-0.24, -0.06, 0.12]) P([[x, -0.3], [x + 0.12, -0.3], [x + 0.12, -0.42], [x, -0.42]]);
      g.fillStyle = DARK; g.beginPath(); g.arc(cx, cy + 0.3 * s, 0.08 * s, Math.PI, 0); g.lineTo(cx + 0.08 * s, cy + 0.45 * s); g.lineTo(cx - 0.08 * s, cy + 0.45 * s); g.fill();
      g.fillRect(cx - 0.03 * s, cy - 0.12 * s, 0.06 * s, 0.14 * s);
      break;
    }
    case 'bridge': {
      g.beginPath(); g.moveTo(cx - 0.5 * s, cy + 0.1 * s); g.lineTo(cx + 0.5 * s, cy + 0.1 * s); g.lineTo(cx + 0.5 * s, cy + 0.3 * s);
      for (const x of [0.3, -0.1]) { g.lineTo(cx + (x + 0.12) * s, cy + 0.3 * s); g.arc(cx + x * s, cy + 0.3 * s, 0.12 * s, 0, Math.PI, true); }
      g.lineTo(cx - 0.5 * s, cy + 0.3 * s); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = SILVER; g.lineWidth = s * 0.035;
      for (const y of [0.4, 0.48]) { g.beginPath(); for (let i = 0; i <= 10; i++) { const x = -0.45 + i * 0.09; g[i ? 'lineTo' : 'moveTo'](cx + x * s, cy + (y + (i % 2 ? 0.025 : -0.025)) * s); } g.stroke(); }
      // pretil con almenillas y una torrecilla en el centro, como los puentes medievales de Navarra
      for (let i = 0; i < 7; i++) P([[-0.46 + i * 0.14, 0.1], [-0.38 + i * 0.14, 0.1], [-0.38 + i * 0.14, 0.02], [-0.46 + i * 0.14, 0.02]]);
      P([[-0.12, 0.1], [0.12, 0.1], [0.12, -0.28], [-0.12, -0.28]]);
      for (const x of [-0.12, -0.02, 0.08]) P([[x, -0.28], [x + 0.06, -0.28], [x + 0.06, -0.36], [x, -0.36]]);
      g.fillStyle = DARK; g.beginPath(); g.arc(cx, cy + 0.02 * s, 0.05 * s, Math.PI, 0); g.lineTo(cx + 0.05 * s, cy + 0.1 * s); g.lineTo(cx - 0.05 * s, cy + 0.1 * s); g.fill();
      break;
    }
    case 'fir': {
      g.fillStyle = '#6b4a2e'; g.fillRect(cx - 0.05 * s, cy + 0.3 * s, 0.1 * s, 0.16 * s); g.strokeRect(cx - 0.05 * s, cy + 0.3 * s, 0.1 * s, 0.16 * s);
      g.fillStyle = col;
      for (const [y, w] of [[0.32, 0.4], [0.1, 0.32], [-0.1, 0.24]]) P([[-w, y], [w, y], [0, y - 0.32]]);
      break;
    }
    case 'oak': {
      g.fillStyle = '#6b4a2e'; P([[-0.07, 0.46], [0.07, 0.46], [0.05, 0.08], [-0.05, 0.08]]);
      g.fillStyle = col;
      for (const [x, y, r] of [[0, -0.12, 0.26], [-0.2, 0.02, 0.19], [0.2, 0.02, 0.19], [-0.12, -0.28, 0.16], [0.13, -0.27, 0.16]]) { g.beginPath(); g.arc(cx + x * s, cy + y * s, r * s, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.fillStyle = GOLD; for (const [x, y] of [[-0.1, -0.05], [0.12, -0.12], [0.02, 0.08]]) { g.beginPath(); g.ellipse(cx + x * s, cy + y * s, 0.035 * s, 0.05 * s, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'grapes': {
      g.fillStyle = '#3f7a34'; P([[0, -0.3], [0.28, -0.42], [0.2, -0.2], [0.34, -0.12], [0.08, -0.14]]);
      g.strokeStyle = '#6b4a2e'; g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(cx, cy - 0.2 * s); g.lineTo(cx - 0.04 * s, cy - 0.42 * s); g.stroke();
      g.fillStyle = col; g.strokeStyle = DARK; g.lineWidth = Math.max(1.5, s * 0.02);
      const rows = [[-0.2, 4], [-0.06, 3], [0.08, 3], [0.22, 2], [0.35, 1]];
      for (const [y, n] of rows) for (let i = 0; i < n; i++) { g.beginPath(); g.arc(cx + (i - (n - 1) / 2) * 0.13 * s, cy + y * s, 0.075 * s, 0, Math.PI * 2); g.fill(); g.stroke(); }
      break;
    }
    case 'star': {
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * Math.PI / 8, r = (i % 2 ? 0.2 : 0.46) * s; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke();
      break;
    }
    case 'lion': {
      // león pasante, de perfil y mirando a la izquierda (a la diestra del escudo)
      g.beginPath();
      g.moveTo(cx - 0.3 * s, cy - 0.08 * s);
      g.bezierCurveTo(cx - 0.1 * s, cy - 0.16 * s, cx + 0.2 * s, cy - 0.12 * s, cx + 0.32 * s, cy - 0.04 * s);
      g.lineTo(cx + 0.34 * s, cy + 0.1 * s); g.lineTo(cx + 0.36 * s, cy + 0.34 * s); g.lineTo(cx + 0.27 * s, cy + 0.34 * s); g.lineTo(cx + 0.25 * s, cy + 0.14 * s);
      g.lineTo(cx + 0.14 * s, cy + 0.14 * s); g.lineTo(cx + 0.12 * s, cy + 0.34 * s); g.lineTo(cx + 0.04 * s, cy + 0.34 * s); g.lineTo(cx + 0.04 * s, cy + 0.12 * s);
      g.lineTo(cx - 0.14 * s, cy + 0.12 * s); g.lineTo(cx - 0.16 * s, cy + 0.34 * s); g.lineTo(cx - 0.24 * s, cy + 0.34 * s); g.lineTo(cx - 0.24 * s, cy + 0.1 * s);
      g.lineTo(cx - 0.3 * s, cy + 0.18 * s); g.lineTo(cx - 0.38 * s, cy + 0.34 * s); g.lineTo(cx - 0.44 * s, cy + 0.32 * s); g.lineTo(cx - 0.36 * s, cy + 0.1 * s);
      g.closePath(); g.fill(); g.stroke();
      // melena en mechones y cabeza
      g.beginPath();
      for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = (i % 2 ? 0.13 : 0.2) * s; g.lineTo(cx - 0.3 * s + Math.cos(a) * r, cy - 0.15 * s + Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(cx - 0.34 * s, cy - 0.17 * s, 0.1 * s, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 0.4 * s, cy - 0.22 * s); g.lineTo(cx - 0.52 * s, cy - 0.16 * s); g.lineTo(cx - 0.43 * s, cy - 0.1 * s); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#b3202a'; g.beginPath(); g.moveTo(cx - 0.5 * s, cy - 0.13 * s); g.lineTo(cx - 0.58 * s, cy - 0.1 * s); g.lineTo(cx - 0.5 * s, cy - 0.09 * s); g.fill();
      g.fillStyle = DARK; g.beginPath(); g.arc(cx - 0.39 * s, cy - 0.2 * s, 0.02 * s, 0, Math.PI * 2); g.fill();
      // cola alzada
      g.strokeStyle = col; g.lineWidth = s * 0.045; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx + 0.32 * s, cy - 0.04 * s); g.bezierCurveTo(cx + 0.5 * s, cy - 0.1 * s, cx + 0.42 * s, cy - 0.34 * s, cx + 0.5 * s, cy - 0.4 * s); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(cx + 0.5 * s, cy - 0.42 * s, 0.05 * s, 0, Math.PI * 2); g.fill();
      break;
    }
  }
}

// escudo con corona: cx centro, top borde de arriba de la corona, h altura total
export function drawShield(g, cx, top, h, spec) {
  const ch = h * 0.2, sh = h - ch, w = sh * 0.82, x0 = cx - w / 2, y0 = top + ch;
  g.save();
  g.fillStyle = 'rgba(0,0,0,.25)'; shieldPath(g, x0 + h * 0.015, y0 + h * 0.02, w, sh); g.fill();
  g.fillStyle = spec.chains ? spec.bordure : GOLD; shieldPath(g, x0, y0, w, sh); g.fill();
  const b = w * 0.1;
  g.fillStyle = spec.field; shieldPath(g, x0 + b, y0 + b, w - 2 * b, sh - 2 * b); g.fill();
  if (spec.chains) {
    g.strokeStyle = GOLD; g.lineWidth = Math.max(1.5, w * 0.018);
    const n = 30;
    for (let i = 0; i < n; i++) {
      const [x, y, a] = rim(x0 + b / 2, y0 + b / 2, w - b, sh - b, i / n);
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, w * 0.04, w * 0.022, i % 2 ? 0 : Math.PI / 2, 0, Math.PI * 2); g.stroke(); g.restore();
    }
  }
  g.lineWidth = Math.max(2, w * 0.025); g.strokeStyle = DARK; shieldPath(g, x0, y0, w, sh); g.stroke();
  charge(g, spec.charge, cx, y0 + sh * 0.47, (w - 2 * b) * 0.95, spec.tint);
  crown(g, cx, y0 + h * 0.005, w * 0.78);
  g.restore();
}

// ---------------------------------------------------------------- escudos de casa (para leerlos)
// Armas de una casa (de src/data/blasones.js): partición, un cuartel por zona con su campo y su figura, y el yelmo con
// lambrequines encima. stone: tallado en piedra, sin color, con los esmaltes marcados en rayas y puntos (Petra Sancta)
const TINCT = { oro: '#e2b43c', plata: '#f1efe6', gules: '#b3202a', azur: '#1f4f9a', sinople: '#2f7d4a', sable: '#26221f' };
const STONE = '#b9a98a', STONE_HI = '#d3c4a3', STONE_LO = '#7d6e55';
function hatch(g, kind, x0, y0, w, h, step) {
  g.save(); g.strokeStyle = STONE_LO; g.fillStyle = STONE_LO; g.lineWidth = Math.max(1, step * 0.18);
  if (kind === 'oro') { for (let y = y0 + step / 2; y < y0 + h; y += step) for (let x = x0 + step / 2 + ((y / step | 0) % 2) * step / 2; x < x0 + w; x += step) { g.beginPath(); g.arc(x, y, step * 0.13, 0, 7); g.fill(); } }
  const lines = (dx, dy) => { g.beginPath(); const L = w + h; for (let t = -L; t < L; t += step) { g.moveTo(x0 + t, y0); g.lineTo(x0 + t + dx * L, y0 + dy * L); } g.stroke(); };
  if (kind === 'gules' || kind === 'sable') { g.beginPath(); for (let x = x0; x < x0 + w; x += step) { g.moveTo(x, y0); g.lineTo(x, y0 + h); } g.stroke(); }
  if (kind === 'azur' || kind === 'sable') { g.beginPath(); for (let y = y0; y < y0 + h; y += step) { g.moveTo(x0, y); g.lineTo(x0 + w, y); } g.stroke(); }
  if (kind === 'sinople') lines(1, 1);
  g.restore();
}
function moreCharge(g, kind, cx, cy, s, col, stone) {
  g.fillStyle = col; g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(1.2, s * 0.025); g.lineJoin = 'round';
  if (kind === 'wolf') {
    // lobo pasante, mirando a la diestra del escudo (a la izquierda de quien mira)
    g.beginPath();
    g.moveTo(cx - 0.42 * s, cy - 0.12 * s); g.lineTo(cx - 0.3 * s, cy - 0.2 * s); g.lineTo(cx - 0.26 * s, cy - 0.3 * s); g.lineTo(cx - 0.2 * s, cy - 0.18 * s);
    g.bezierCurveTo(cx - 0.05 * s, cy - 0.16 * s, cx + 0.2 * s, cy - 0.16 * s, cx + 0.32 * s, cy - 0.06 * s);
    g.quadraticCurveTo(cx + 0.48 * s, cy - 0.04 * s, cx + 0.52 * s, cy + 0.12 * s); g.lineTo(cx + 0.44 * s, cy + 0.06 * s);
    g.lineTo(cx + 0.34 * s, cy + 0.08 * s); g.lineTo(cx + 0.36 * s, cy + 0.3 * s); g.lineTo(cx + 0.28 * s, cy + 0.3 * s); g.lineTo(cx + 0.25 * s, cy + 0.12 * s);
    g.lineTo(cx + 0.1 * s, cy + 0.12 * s); g.lineTo(cx + 0.12 * s, cy + 0.3 * s); g.lineTo(cx + 0.04 * s, cy + 0.3 * s); g.lineTo(cx + 0.02 * s, cy + 0.1 * s);
    g.lineTo(cx - 0.16 * s, cy + 0.08 * s); g.lineTo(cx - 0.16 * s, cy + 0.3 * s); g.lineTo(cx - 0.24 * s, cy + 0.3 * s); g.lineTo(cx - 0.25 * s, cy + 0.04 * s);
    g.lineTo(cx - 0.3 * s, cy - 0.04 * s); g.lineTo(cx - 0.46 * s, cy - 0.04 * s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = stone ? STONE_LO : DARK; g.beginPath(); g.arc(cx - 0.33 * s, cy - 0.12 * s, 0.018 * s, 0, 7); g.fill();
  } else if (kind === 'crescent') {
    g.beginPath(); g.arc(cx, cy + 0.02 * s, 0.32 * s, 0, Math.PI * 2); g.arc(cx, cy - 0.1 * s, 0.26 * s, 0, Math.PI * 2, true); g.fill('evenodd'); g.stroke();
  } else if (kind === 'panelas') {
    const heart = (x, y, k) => { g.beginPath(); g.moveTo(x, y + 0.16 * k); g.bezierCurveTo(x - 0.22 * k, y - 0.02 * k, x - 0.1 * k, y - 0.2 * k, x, y - 0.08 * k); g.bezierCurveTo(x + 0.1 * k, y - 0.2 * k, x + 0.22 * k, y - 0.02 * k, x, y + 0.16 * k); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y + 0.16 * k); g.lineTo(x, y + 0.26 * k); g.stroke(); };
    for (const [x, y] of [[-0.2, -0.15], [0.2, -0.15], [0, 0.18]]) heart(cx + x * s, cy + y * s, s * 0.9);
  } else charge(g, kind, cx, cy, s, col);
}
// casco de perfil con los lambrequines (hojas) cayendo a los lados
function helmet(g, cx, y, w, stone) {
  const col = stone ? STONE_HI : '#c9ccd1', dark = stone ? STONE_LO : '#4a4f57', leaf = stone ? STONE : '#b3202a', leaf2 = stone ? STONE_HI : '#e2b43c';
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? leaf2 : leaf; g.strokeStyle = dark; g.lineWidth = Math.max(1, w * 0.012);
    const x0 = cx + s * w * (0.12 + i * 0.1), y0 = y + w * (0.08 + i * 0.1);
    g.beginPath(); g.moveTo(cx + s * w * 0.05, y + w * 0.02); g.quadraticCurveTo(x0 + s * w * 0.18, y0 - w * 0.08, x0 + s * w * 0.12, y0 + w * 0.12);
    g.quadraticCurveTo(x0 + s * w * 0.02, y0 + w * 0.06, x0 - s * w * 0.04, y0 + w * 0.14); g.quadraticCurveTo(x0, y0 + w * 0.02, cx + s * w * 0.05, y + w * 0.08); g.closePath(); g.fill(); g.stroke();
  }
  g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = Math.max(1.2, w * 0.015);
  g.beginPath(); g.moveTo(cx - w * 0.1, y + w * 0.14); g.quadraticCurveTo(cx - w * 0.14, y - w * 0.06, cx, y - w * 0.1); g.quadraticCurveTo(cx + w * 0.14, y - w * 0.06, cx + w * 0.11, y + w * 0.14); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(cx - w * 0.09, y + w * (0.02 + i * 0.018 + 0.03)); g.lineTo(cx + w * 0.09, y + w * (0.02 + i * 0.018 + 0.03)); } g.stroke();
}
/** Pinta las armas de una casa: cx centro, top arriba del yelmo, w ancho del escudo. */
export function drawArms(g, cx, top, w, A, { stone = false } = {}) {
  const sh = w * 1.18, hy = w * 0.34, x0 = cx - w / 2, y0 = top + hy, col = (t) => stone ? STONE_HI : TINCT[t];
  g.save();
  if (stone) { g.fillStyle = 'rgba(0,0,0,.22)'; shieldPath(g, x0 + w * 0.03, y0 + w * 0.04, w, sh); g.fill(); }
  helmet(g, cx, top + w * 0.14, w * 0.9, stone);
  // zonas de cada cuartel
  const zones = A.part === 'entero' ? [[0, 0, 1, 1]] : A.part === 'partido' ? [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] : A.part === 'cortado' ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
  g.save(); shieldPath(g, x0, y0, w, sh); g.clip();
  A.q.forEach((x, i) => {
    const [zx, zy, zw, zh] = zones[i], X = x0 + zx * w, Y = y0 + zy * sh, W = zw * w, H = zh * sh;
    g.fillStyle = stone ? STONE : TINCT[x.f]; g.fillRect(X, Y, W, H);
    if (x.c === 'chequy') {
      const n = 6, cw = W / n, chh = H / n;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if ((a + b) % 2) { g.fillStyle = stone ? STONE_LO : TINCT[x.t]; g.fillRect(X + a * cw, Y + b * chh, cw + 0.5, chh + 0.5); if (stone) hatch(g, x.t, X + a * cw, Y + b * chh, cw, chh, Math.max(3, w * 0.03)); }
      return;
    }
    if (stone) hatch(g, x.f, X, Y, W, H, Math.max(3, w * 0.035));
    const s = Math.min(W, H) * (A.part === 'entero' ? 0.62 : 0.78), ccx = X + W / 2, ccy = Y + H * (zy > 0 ? 0.42 : 0.52);
    if (x.c === 'bend') { g.save(); g.translate(ccx, ccy); g.rotate(Math.atan2(H, W)); g.fillStyle = col(x.t); g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(1.2, w * 0.012); g.fillRect(-W, -Math.min(W, H) * 0.12, 2 * W, Math.min(W, H) * 0.24); g.strokeRect(-W, -Math.min(W, H) * 0.12, 2 * W, Math.min(W, H) * 0.24); if (stone) { g.restore(); } else g.restore(); return; }
    const k = x.n || 1;
    if (k === 1 || x.c === 'panelas') moreCharge(g, x.c, ccx, ccy, s, col(x.t), stone);
    else { const pos = k === 2 ? [[0, -0.22], [0, 0.22]] : [[-0.22, -0.2], [0.22, -0.2], [0, 0.22]]; for (const [dx, dy] of pos) moreCharge(g, x.c, ccx + dx * s, ccy + dy * s, s * 0.5, col(x.t), stone); }
  });
  g.restore();
  // líneas de partición y borde (en piedra, en relieve)
  g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(2, w * 0.02);
  g.beginPath();
  if (A.part === 'partido' || A.part === 'cuartelado') { g.moveTo(cx, y0); g.lineTo(cx, y0 + sh); }
  if (A.part === 'cortado' || A.part === 'cuartelado') { g.moveTo(x0, y0 + sh / 2); g.lineTo(x0 + w, y0 + sh / 2); }
  g.stroke();
  g.lineWidth = Math.max(3, w * 0.035); shieldPath(g, x0, y0, w, sh); g.stroke();
  if (stone) { g.strokeStyle = STONE_HI; g.lineWidth = Math.max(1, w * 0.01); shieldPath(g, x0 + w * 0.012, y0 + w * 0.012, w - w * 0.024, sh - w * 0.024); g.stroke(); }
  g.restore();
}
// (para los escudos oficiales de src/world/armas.js)
export { charge, moreCharge, shieldPath, crown, helmet, rim, hatch, TINCT, STONE, STONE_HI, STONE_LO, GOLD, SILVER, DARK };
