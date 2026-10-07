// Dibujo de los escudos oficiales de Navarra (src/data/armas-navarra.js) a partir de su blasón, con el estilo del juego:
// particiones (también cuarteles partidos dentro de otro), borduras (lisa, con cadenas, aspas, billetes o componada),
// timbre (corona o yelmo) y una figura sencilla para cada mueble. stone: tallado en piedra, con los esmaltes en rayas.
import { charge, moreCharge, shieldPath, crown, helmet, rim, hatch, TINCT, STONE, STONE_HI, STONE_LO, DARK } from './heraldry.js';

// colores de las figuras «de su color» (al natural)
const NAT = { leaf: '#3f7d3a', leaf2: '#2f6430', trunk: '#6b4a2e', fur: '#8a5a32', grey: '#77736c', skin: '#b07a52', rock: '#8d8273', bread: '#c98d45', glass: '#2f5b2f', cheese: '#efd9a0', steel: '#b8bec6', cloak: '#b3202a' };

function zonesOf(part) {
  switch (part) {
    case 'partido': return [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]];
    case 'cortado': return [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]];
    case 'cuartelado': return [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
    case 'terciado-faja': return [[0, 0, 1, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 1 / 3]];
    case 'terciado-palo': return [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]];
    default: return [[0, 0, 1, 1]];
  }
}
function partLines(g, part, X, Y, W, H) {
  g.beginPath();
  if (part === 'partido' || part === 'cuartelado') { g.moveTo(X + W / 2, Y); g.lineTo(X + W / 2, Y + H); }
  if (part === 'cortado' || part === 'cuartelado') { g.moveTo(X, Y + H / 2); g.lineTo(X + W, Y + H / 2); }
  if (part === 'terciado-faja') for (const k of [1, 2]) { g.moveTo(X, Y + H * k / 3); g.lineTo(X + W, Y + H * k / 3); }
  if (part === 'terciado-palo') for (const k of [1, 2]) { g.moveTo(X + W * k / 3, Y); g.lineTo(X + W * k / 3, Y + H); }
  g.stroke();
}

// ---------------------------------------------------------------- figuras
// cada figura en coordenadas de -0.5 a 0.5 por s (su alto), centrada en (cx, cy)
function glyph(g, c, cx, cy, s, col, stone, o = {}) {
  const ln = stone ? STONE_LO : DARK, nat = (k) => stone ? STONE_HI : (col || NAT[k]);
  g.lineWidth = Math.max(1.2, s * 0.025); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ln;
  const X = (x) => cx + x * s, Y = (y) => cy + y * s;
  const P = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); };
  const C = (x, y, r, fill, stroke = true) => { g.beginPath(); g.arc(X(x), Y(y), r * s, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) g.stroke(); };
  const E = (x, y, rx, ry, rot, fill) => { g.beginPath(); g.ellipse(X(x), Y(y), rx * s, ry * s, rot || 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); g.stroke(); };
  const L = (pts, w, stroke) => { g.save(); g.lineWidth = w * s; g.strokeStyle = stroke; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.restore(); };
  // cuadrúpedo genérico de perfil, mirando a la diestra (a la izquierda de quien mira)
  const beast = (fill, { neck = 0.1, legs = 0.3, tail = 'down', head = 'dog' } = {}) => {
    P([[-0.34, -0.06], [-0.2, -0.12], [0.24, -0.12], [0.34, -0.06], [0.34, 0.06], [0.3, 0.1], [0.3, legs], [0.23, legs], [0.21, 0.1], [0.08, 0.1], [0.08, legs], [0.01, legs], [0, 0.1], [-0.18, 0.1], [-0.19, legs], [-0.26, legs], [-0.27, 0.08], [-0.3, 0.04]], fill);
    if (head === 'dog') P([[-0.3, -0.04], [-0.36, -0.1 - neck], [-0.34, -0.22 - neck], [-0.3, -0.16 - neck], [-0.42, -0.14 - neck], [-0.54, -0.1 - neck], [-0.5, -0.05 - neck], [-0.38, -0.04 - neck], [-0.26, -0.08]], fill);
    if (tail === 'down') L([[0.33, -0.05], [0.45, 0.06], [0.48, 0.2]], 0.05, fill);
    if (tail === 'up') L([[0.33, -0.06], [0.44, -0.2], [0.42, -0.3]], 0.05, fill);
  };
  switch (c) {
    case 'lion': return charge(g, 'lion', cx, cy, s, col || '#e2b43c');
    case 'castle': {
      charge(g, 'castle', cx, cy, s, col || NAT.rock);
      if (o.flags) for (const x of [-0.31, 0.38]) { L([[x, -0.14], [x, -0.42]], 0.02, ln); P([[x, -0.42], [x + 0.14, -0.38], [x, -0.33]], stone ? STONE_HI : TINCT.plata); }
      return;
    }
    case 'tower': return charge(g, 'tower', cx, cy, s, col);
    case 'bridge': return charge(g, 'bridge', cx, cy, s, col);
    case 'star8': return charge(g, 'star', cx, cy, s, col);
    case 'oak': return charge(g, 'oak', cx, cy, s, col || NAT.leaf);
    case 'wolf': return moreCharge(g, 'wolf', cx, cy, s, col || NAT.grey, stone);
    case 'crescent': return moreCharge(g, 'crescent', cx, cy, s, col, stone);
    case 'crescentRev': { g.save(); g.translate(cx, cy); g.rotate(Math.PI); moreCharge(g, 'crescent', 0, 0, s, col, stone); g.restore(); return; }
    case 'crown': return crown(g, cx, cy + 0.2 * s, s * 1.2);
    case 'star': case 'star6': {
      const n = c === 'star6' ? 6 : 5; g.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = (i % 2 ? 0.2 : 0.48) * s; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); return;
    }
    case 'tree': case 'holm': case 'olive': case 'beech': case 'oakUprooted': case 'juniper': {
      const leaf = nat('leaf'), trunk = stone ? STONE_HI : NAT.trunk;
      if (c === 'juniper') { P([[-0.05, 0.46], [0.05, 0.46], [0.04, 0.3], [-0.04, 0.3]], trunk); for (const [y, w] of [[0.32, 0.3], [0.12, 0.25], [-0.08, 0.2], [-0.26, 0.13]]) P([[-w, y], [w, y], [0, y - 0.3]], leaf); for (const [x, y] of [[-0.1, 0.18], [0.08, 0.02], [-0.04, -0.14]]) C(x, y, 0.03, stone ? STONE_LO : '#3b4f8a', false); return; }
      P([[-0.06, 0.42], [0.06, 0.42], [0.05, 0.05], [-0.05, 0.05]], trunk);
      if (c === 'oakUprooted') for (const a of [-0.25, -0.1, 0.1, 0.25]) L([[0, 0.42], [a, 0.5]], 0.03, trunk);
      if (c === 'beech') { E(0, -0.12, 0.22, 0.34, 0, leaf); return; }
      if (c === 'holm') { for (const [x, y, r] of [[0, -0.12, 0.24], [-0.2, 0, 0.17], [0.2, 0, 0.17], [0, -0.3, 0.16]]) C(x, y, r, leaf); if (o.ground !== false) P([[-0.4, 0.5], [0.4, 0.5], [0.3, 0.42], [-0.3, 0.42]], leaf); return; }
      for (const [x, y, r] of [[0, -0.12, 0.26], [-0.2, 0.02, 0.18], [0.2, 0.02, 0.18], [-0.12, -0.28, 0.15], [0.13, -0.27, 0.15]]) C(x, y, r, leaf);
      if (c === 'olive') { for (const [x, y] of [[-0.1, -0.05], [0.12, -0.14], [0.04, 0.06], [-0.16, -0.2]]) C(x, y, 0.03, stone ? STONE_LO : '#4a4a2a', false); crown(g, cx, cy - 0.4 * s, s * 0.42); }
      return;
    }
    case 'boar': {
      const f = col || '#3a3028';
      P([[-0.4, 0.0], [-0.3, -0.12], [-0.1, -0.2], [0.2, -0.18], [0.36, -0.06], [0.38, 0.06], [0.32, 0.1], [0.3, 0.28], [0.23, 0.28], [0.21, 0.12], [0.06, 0.12], [0.05, 0.28], [-0.02, 0.28], [-0.04, 0.1], [-0.16, 0.08], [-0.17, 0.28], [-0.24, 0.28], [-0.26, 0.06], [-0.4, 0.06], [-0.5, 0.04], [-0.5, -0.02]], f);
      L([[-0.48, 0.0], [-0.42, -0.06]], 0.025, stone ? STONE_HI : '#f1efe6');
      for (let i = 0; i < 6; i++) L([[-0.22 + i * 0.07, -0.18], [-0.2 + i * 0.07, -0.25]], 0.02, f);
      L([[0.37, 0.0], [0.45, 0.06]], 0.02, f);
      return;
    }
    case 'stag': {
      const f = col || NAT.fur; beast(f, { neck: 0.12, legs: 0.34, tail: 'none' });
      const ant = stone ? STONE_HI : (o.antler || (col === TINCT.plata ? TINCT.oro : f));
      L([[-0.36, -0.26], [-0.3, -0.44], [-0.2, -0.52]], 0.025, ant); L([[-0.32, -0.38], [-0.4, -0.48]], 0.025, ant); L([[-0.28, -0.46], [-0.24, -0.58]], 0.025, ant);
      return;
    }
    case 'greyhound': { beast(col, { neck: 0.12, legs: 0.32, tail: 'up' }); return; }
    case 'lamb': {
      const f = col || '#f1efe6';
      for (const [x, y] of [[-0.18, -0.08], [-0.02, -0.12], [0.14, -0.08], [-0.1, 0.02], [0.08, 0.02], [0.22, -0.02]]) C(x, y, 0.12, f);
      for (const x of [-0.16, -0.04, 0.12, 0.22]) L([[x, 0.08], [x, 0.3]], 0.04, stone ? STONE_LO : '#3a2a1c');
      E(-0.32, -0.12, 0.1, 0.08, -0.3, f);
      return;
    }
    case 'wolfLamb': {
      moreCharge(g, 'wolf', cx + 0.06 * s, cy + 0.04 * s, s * 0.95, col || '#26221f', stone);
      glyph(g, 'lamb', cx - 0.36 * s, cy + 0.0 * s, s * 0.42, stone ? STONE_HI : TINCT.plata, stone);
      return;
    }
    case 'lionsAffronted': {
      for (const sgn of [-1, 1]) {
        g.save(); g.translate(cx + sgn * 0.2 * s, cy); g.scale(-sgn, 1);
        const f = col; const p = [[-0.08, 0.42], [-0.02, 0.1], [-0.12, -0.08], [-0.06, -0.3], [0.04, -0.36], [0.12, -0.3], [0.1, -0.2], [0.18, -0.24], [0.2, -0.16], [0.08, -0.06], [0.12, 0.14], [0.06, 0.42]];
        g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s))); g.closePath(); g.fillStyle = f; g.fill(); g.stroke();
        g.beginPath(); g.arc(0.02 * s, -0.34 * s, 0.09 * s, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = f; g.lineWidth = 0.04 * s; g.beginPath(); g.moveTo(-0.08 * s, 0.1 * s); g.quadraticCurveTo(-0.24 * s, 0.0, -0.18 * s, -0.2 * s); g.stroke();
        g.restore(); g.strokeStyle = ln; g.lineWidth = Math.max(1.2, s * 0.025);
      }
      return;
    }
    case 'eagle': case 'eagleClosed': {
      const f = col || '#26221f';
      if (c === 'eagle') { P([[0, -0.2], [-0.18, -0.14], [-0.44, -0.3], [-0.46, -0.06], [-0.3, 0.06], [-0.12, 0.04], [-0.1, 0.26], [-0.2, 0.42], [0, 0.32], [0.2, 0.42], [0.1, 0.26], [0.12, 0.04], [0.3, 0.06], [0.46, -0.06], [0.44, -0.3], [0.18, -0.14]], f); }
      else P([[-0.04, -0.16], [-0.16, -0.04], [-0.18, 0.2], [-0.08, 0.36], [0.02, 0.42], [0.06, 0.3], [0.16, 0.14], [0.12, -0.08]], f);
      C(c === 'eagle' ? 0 : -0.06, -0.28, 0.09, f);
      P([[c === 'eagle' ? -0.08 : -0.14, -0.3], [c === 'eagle' ? -0.18 : -0.24, -0.26], [c === 'eagle' ? -0.08 : -0.14, -0.24]], stone ? STONE_HI : TINCT.oro);
      if (c === 'eagleClosed') L([[-0.2, 0.42], [0.24, 0.42]], 0.03, stone ? STONE_HI : NAT.trunk);
      return;
    }
    case 'moorHead': {
      C(0, 0.06, 0.26, stone ? STONE_HI : NAT.skin);
      g.beginPath(); g.arc(X(0), Y(0.04), 0.27 * s, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(X(0.2), Y(-0.06)); g.lineTo(X(-0.2), Y(-0.06)); g.closePath(); g.fillStyle = stone ? STONE : '#f1efe6'; g.fill(); g.stroke();
      crown(g, cx, cy - 0.14 * s, s * 0.5);
      return;
    }
    case 'rocks': case 'twoPeaks': {
      const f = col || NAT.rock, pk = c === 'twoPeaks' ? [[-0.2, 0.36, 0.26, 0.7], [0.2, 0.36, 0.26, 0.7]] : [[-0.26, 0.4, 0.2, 0.5], [0, 0.4, 0.24, 0.7], [0.26, 0.4, 0.2, 0.5]];
      for (const [x, y, w, h] of pk) P([[x - w, y], [x - w * 0.4, y - h * 0.8], [x, y - h], [x + w * 0.5, y - h * 0.7], [x + w, y]], f);
      return;
    }
    case 'bust': {
      P([[-0.36, 0.48], [-0.32, 0.18], [-0.12, 0.08], [0.12, 0.08], [0.32, 0.18], [0.36, 0.48]], col);
      C(0, -0.08, 0.17, col);
      P([[-0.17, -0.06], [0.17, -0.06], [0.17, 0.02], [-0.17, 0.02]], stone ? STONE_LO : '#3a3f47');
      crown(g, cx, cy - 0.24 * s, s * 0.42);
      return;
    }
    case 'arrowheads': { for (const [x, y] of [[-0.18, -0.1], [0.18, -0.1], [0, 0.22]]) P([[x, y - 0.24], [x + 0.1, y + 0.02], [x + 0.03, y + 0.02], [x + 0.03, y + 0.16], [x - 0.03, y + 0.16], [x - 0.03, y + 0.02], [x - 0.1, y + 0.02]], col); return; }
    case 'cloudCross': {
      for (const [x, y, r] of [[-0.3, 0.3, 0.12], [-0.12, 0.26, 0.15], [0.08, 0.28, 0.15], [0.28, 0.3, 0.12]]) C(x, y, r, stone ? STONE_HI : '#e9eef3');
      P([[-0.05, -0.42], [0.05, -0.42], [0.05, -0.2], [0.2, -0.2], [0.2, -0.1], [0.05, -0.1], [0.05, 0.2], [-0.05, 0.2], [-0.05, -0.1], [-0.2, -0.1], [-0.2, -0.2], [-0.05, -0.2]], col);
      return;
    }
    case 'cross': { P([[-0.08, -0.45], [0.08, -0.45], [0.08, -0.12], [0.36, -0.12], [0.36, 0.04], [0.08, 0.04], [0.08, 0.45], [-0.08, 0.45], [-0.08, 0.04], [-0.36, 0.04], [-0.36, -0.12], [-0.08, -0.12]], col); return; }
    case 'abarca': { E(0, 0.1, 0.42, 0.2, 0, col); L([[-0.2, -0.05], [0.0, -0.3], [0.2, -0.05]], 0.05, stone ? STONE_LO : TINCT.gules); return; }
    case 'bread': { E(0, 0, 0.45, 0.28, 0, stone ? STONE_HI : NAT.bread); for (const x of [-0.18, 0, 0.18]) L([[x - 0.06, -0.12], [x + 0.06, 0.1]], 0.025, ln); return; }
    case 'bottle': { P([[-0.12, 0.45], [0.12, 0.45], [0.12, -0.05], [0.05, -0.18], [0.05, -0.42], [-0.05, -0.42], [-0.05, -0.18], [-0.12, -0.05]], stone ? STONE_HI : NAT.glass); return; }
    case 'cheese': { P([[-0.42, 0.25], [0.42, 0.25], [0.42, -0.05], [-0.42, -0.05]], stone ? STONE_HI : NAT.cheese); E(0, -0.05, 0.42, 0.12, 0, stone ? STONE_HI : '#f6e7b8'); P([[0.02, -0.06], [0.08, -0.06], [0.14, -0.48], [0.06, -0.48]], stone ? STONE_HI : NAT.steel); L([[0.1, -0.42], [0.12, -0.6]], 0.06, stone ? STONE_LO : NAT.trunk); return; }
    case 'fleur': {
      P([[0, -0.46], [0.1, -0.24], [0.06, 0.04], [-0.06, 0.04], [-0.1, -0.24]], col);
      P([[0.06, 0.0], [0.3, -0.22], [0.42, -0.06], [0.3, 0.08], [0.06, 0.1]], col); P([[-0.06, 0.0], [-0.3, -0.22], [-0.42, -0.06], [-0.3, 0.08], [-0.06, 0.1]], col);
      P([[-0.2, 0.08], [0.2, 0.08], [0.2, 0.16], [-0.2, 0.16]], col); P([[-0.05, 0.16], [0.05, 0.16], [0.08, 0.42], [-0.08, 0.42]], col);
      return;
    }
    case 'bells5': {
      for (const [x, y] of [[-0.26, -0.24], [0.26, -0.24], [0, 0], [-0.26, 0.24], [0.26, 0.24]]) { P([[x - 0.07, y - 0.1], [x + 0.07, y - 0.1], [x + 0.13, y + 0.1], [x - 0.13, y + 0.1]], col); C(x, y + 0.13, 0.03, col); }
      return;
    }
    case 'wheat': {
      for (const a of [-0.35, 0, 0.35]) {
        g.save(); g.translate(cx, cy + 0.42 * s); g.rotate(a);
        g.strokeStyle = col; g.lineWidth = 0.035 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -0.8 * s); g.stroke(); g.strokeStyle = ln; g.lineWidth = Math.max(1, 0.015 * s);
        for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(sg * 0.05 * s, (-0.5 - i * 0.07) * s, 0.04 * s, 0.07 * s, sg * 0.4, 0, 7); g.fillStyle = col; g.fill(); g.stroke(); }
        g.restore();
      }
      L([[-0.14, 0.22], [0.14, 0.22]], 0.05, stone ? STONE_LO : TINCT.gules);
      return;
    }
    case 'sun': {
      g.beginPath(); for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, r = (i % 2 ? 0.3 : 0.48) * s; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fillStyle = col; g.fill(); g.stroke();
      C(0, 0, 0.24, col); return;
    }
    case 'rockOak': {
      glyph(g, 'rocks', cx + 0.12 * s, cy + 0.02 * s, s * 0.9, stone ? STONE_HI : NAT.rock, stone);
      glyph(g, 'oak', cx - 0.2 * s, cy + 0.04 * s, s * 0.75, stone ? STONE_HI : NAT.leaf, stone);
      return;
    }
    case 'crozierBird': {
      L([[0.02, 0.48], [0.02, -0.2]], 0.07, col);
      g.save(); g.strokeStyle = col; g.lineWidth = 0.07 * s; g.beginPath(); g.moveTo(X(0.02), Y(-0.2)); g.bezierCurveTo(X(0.02), Y(-0.5), X(-0.3), Y(-0.5), X(-0.26), Y(-0.28)); g.bezierCurveTo(X(-0.22), Y(-0.16), X(-0.08), Y(-0.2), X(-0.1), Y(-0.3)); g.stroke(); g.restore();
      E(0.14, -0.08, 0.1, 0.06, -0.2, stone ? STONE_HI : TINCT.plata); C(0.22, -0.13, 0.045, stone ? STONE_HI : TINCT.plata); P([[0.26, -0.14], [0.31, -0.12], [0.26, -0.11]], stone ? STONE_HI : TINCT.oro);
      return;
    }
    case 'arches3': { for (let i = 0; i < 3; i++) { const y = -0.3 + i * 0.3; g.beginPath(); g.moveTo(X(-0.3), Y(y + 0.12)); g.lineTo(X(-0.3), Y(y)); g.arc(X(0), Y(y), 0.3 * s, Math.PI, 0); g.lineTo(X(0.3), Y(y + 0.12)); g.lineTo(X(0.2), Y(y + 0.12)); g.lineTo(X(0.2), Y(y)); g.arc(X(0), Y(y), 0.2 * s, 0, Math.PI, true); g.lineTo(X(-0.2), Y(y + 0.12)); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); } return; }
    case 'inscription': {
      for (let i = 0; i < 4; i++) P([[-0.4, -0.4 + i * 0.22], [0.4, -0.4 + i * 0.22], [0.4, -0.3 + i * 0.22], [-0.4, -0.3 + i * 0.22]], col);
      g.fillStyle = stone ? STONE_LO : '#1f2d55'; g.font = `700 ${Math.max(5, s * 0.08)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      ['MINICIA', 'AVNIA', 'SEGON', 'H·S·E'].forEach((t, i) => g.fillText(t, X(0), Y(-0.35 + i * 0.22)));
      return;
    }
    case 'balanceSword': {
      L([[0, -0.45], [0, 0.4]], 0.06, stone ? STONE_HI : TINCT.plata); P([[-0.14, -0.3], [0.14, -0.3], [0.14, -0.26], [-0.14, -0.26]], col); P([[-0.04, -0.45], [0.04, -0.45], [0.04, -0.34], [-0.04, -0.34]], col);
      L([[-0.4, -0.1], [0.4, -0.1]], 0.04, col);
      for (const x of [-0.36, 0.36]) { L([[x, -0.1], [x - 0.12, 0.16]], 0.015, col); L([[x, -0.1], [x + 0.12, 0.16]], 0.015, col); g.beginPath(); g.arc(X(x), Y(0.16), 0.13 * s, 0, Math.PI); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); }
      return;
    }
    case 'cannons': {
      for (const a of [0.7, -0.7]) { g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = col; g.beginPath(); g.moveTo(-0.07 * s, -0.46 * s); g.lineTo(0.07 * s, -0.46 * s); g.lineTo(0.1 * s, 0.36 * s); g.arc(0, 0.38 * s, 0.1 * s, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); g.restore(); }
      return;
    }
    case 'bombs': { for (const [x, y] of [[-0.12, -0.12], [0.12, -0.12], [-0.24, 0.12], [0, 0.12], [0.24, 0.12]]) { C(x, y, 0.1, col); L([[x + 0.05, y - 0.08], [x + 0.1, y - 0.16]], 0.02, col); } return; }
    case 'rider': {
      // caballo blanco, jinete con capa roja que corta con la espada, y un pobre con muleta a la siniestra
      const horse = stone ? STONE_HI : '#f1efe6';
      P([[-0.4, -0.02], [-0.28, -0.06], [0.1, -0.06], [0.2, 0.02], [0.2, 0.08], [0.16, 0.1], [0.17, 0.36], [0.11, 0.36], [0.1, 0.12], [-0.02, 0.12], [-0.04, 0.36], [-0.1, 0.36], [-0.12, 0.12], [-0.22, 0.1], [-0.26, 0.36], [-0.32, 0.36], [-0.32, 0.08]], horse);
      P([[-0.38, -0.02], [-0.44, -0.2], [-0.5, -0.24], [-0.58, -0.16], [-0.52, -0.12], [-0.44, -0.06]], horse);
      P([[-0.1, -0.06], [-0.14, -0.3], [-0.04, -0.34], [0.02, -0.06]], stone ? STONE_HI : NAT.steel); C(-0.09, -0.4, 0.06, stone ? STONE_HI : NAT.skin);
      P([[-0.02, -0.3], [0.32, -0.12], [0.3, 0.06], [0.02, -0.12]], stone ? STONE_HI : NAT.cloak);
      L([[-0.04, -0.28], [0.22, -0.44]], 0.02, stone ? STONE_HI : NAT.steel);
      P([[0.38, -0.12], [0.44, -0.12], [0.44, 0.36], [0.38, 0.36]], stone ? STONE_HI : '#7a6a58'); C(0.41, -0.18, 0.05, stone ? STONE_HI : NAT.skin);
      L([[0.48, -0.08], [0.5, 0.36]], 0.02, stone ? STONE_HI : NAT.trunk);
      return;
    }
    case 'letters': {
      g.fillStyle = col; g.font = `900 ${Math.max(6, s * 0.36)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = Math.max(1, s * 0.012); g.strokeText(o.text || '', cx, cy); g.fillText(o.text || '', cx, cy); return;
    }
    case 'swordsCrowned': {
      for (const x of [-0.16, 0.16]) { P([[x - 0.035, 0.3], [x + 0.035, 0.3], [x + 0.03, -0.3], [x, -0.36], [x - 0.03, -0.3]], stone ? STONE_HI : TINCT.plata); P([[x - 0.12, 0.3], [x + 0.12, 0.3], [x + 0.12, 0.35], [x - 0.12, 0.35]], stone ? STONE_HI : TINCT.oro); P([[x - 0.03, 0.35], [x + 0.03, 0.35], [x + 0.03, 0.46], [x - 0.03, 0.46]], stone ? STONE_HI : TINCT.oro); crown(g, cx + x * s, cy - 0.34 * s, s * 0.22); }
      return;
    }
    case 'locomotive': {
      const f = stone ? STONE_HI : '#2b2b2b';
      P([[-0.42, 0.18], [0.3, 0.18], [0.3, -0.06], [0.42, -0.06], [0.42, -0.34], [0.12, -0.34], [0.12, -0.06], [-0.24, -0.06], [-0.24, -0.22], [-0.32, -0.22], [-0.32, -0.06], [-0.42, -0.06]], f);
      for (const x of [-0.28, 0.0, 0.28]) C(x, 0.24, 0.1, stone ? STONE_HI : '#8a1f1f');
      C(-0.28, -0.32, 0.06, stone ? STONE_HI : '#d6d6d6', false);
      return;
    }
    case 'figure': case 'angel': case 'virgin': {
      const robe = stone ? STONE_HI : c === 'virgin' ? '#1f4f9a' : c === 'angel' ? '#f1efe6' : '#7a6a58';
      P([[-0.16, 0.46], [0.16, 0.46], [0.08, -0.12], [-0.08, -0.12]], robe); C(0, -0.22, 0.09, stone ? STONE_HI : NAT.skin);
      if (c === 'angel') for (const sg of [-1, 1]) P([[sg * 0.06, -0.06], [sg * 0.34, -0.3], [sg * 0.3, 0.1]], stone ? STONE_HI : TINCT.oro);
      if (c === 'virgin') { crown(g, cx, cy - 0.28 * s, s * 0.22); P([[-0.12, -0.14], [0.12, -0.14], [0.2, 0.46], [-0.2, 0.46]], robe); }
      if (c === 'figure') L([[0.14, -0.1], [0.24, 0.46]], 0.025, stone ? STONE_HI : NAT.steel);
      return;
    }
    case 'dove': case 'bird': {
      const f = col || (stone ? STONE_HI : TINCT.plata);
      E(0, 0.04, 0.26, 0.13, -0.1, f); C(-0.24, -0.06, 0.09, f); P([[-0.32, -0.08], [-0.42, -0.04], [-0.32, -0.02]], stone ? STONE_HI : TINCT.oro);
      P([[-0.04, -0.02], [0.18, -0.36], [0.24, -0.02]], f); P([[0.22, 0.04], [0.42, -0.04], [0.42, 0.14]], f);
      return;
    }
    case 'grapes': return charge(g, 'grapes', cx, cy, s, stone ? STONE_HI : '#5a2a5e');
    case 'castleWall': {
      const f = col; P([[-0.46, 0.3], [0.46, 0.3], [0.46, 0.0], [-0.46, 0.0]], f);
      for (let i = 0; i < 6; i++) P([[-0.46 + i * 0.16, 0.0], [-0.38 + i * 0.16, 0.0], [-0.38 + i * 0.16, -0.08], [-0.46 + i * 0.16, -0.08]], f);
      P([[0.06, 0.0], [0.3, 0.0], [0.3, -0.4], [0.06, -0.4]], f); for (const x of [0.06, 0.15, 0.24]) P([[x, -0.4], [x + 0.06, -0.4], [x + 0.06, -0.48], [x, -0.48]], f);
      g.fillStyle = ln; g.fillRect(X(0.15), Y(-0.28), 0.05 * s, 0.12 * s);
      return;
    }
    case 'bridgeTowers': {
      col = col || (stone ? STONE_HI : '#b9ad96');
      charge(g, 'bridge', cx, cy + 0.12 * s, s, col);
      for (const [x, h] of [[-0.3, 0.3], [0, 0.42], [0.3, 0.3]]) {
        P([[x - 0.08, 0.12], [x + 0.08, 0.12], [x + 0.08, 0.12 - h], [x - 0.08, 0.12 - h]], col);
        for (const d of [-0.08, -0.01, 0.06]) P([[x + d, 0.12 - h], [x + d + 0.04, 0.12 - h], [x + d + 0.04, 0.06 - h], [x + d, 0.06 - h]], col);
        P([[x - 0.025, 0.04 - h * 0.5], [x + 0.025, 0.04 - h * 0.5], [x + 0.025, 0.1 - h * 0.5], [x - 0.025, 0.1 - h * 0.5]], stone ? STONE_LO : TINCT.gules);
      }
      return;
    }
  }
}

// figuras que llenan su zona (piezas)
function piece(g, c, X, Y, W, H, col, stone, ch) {
  const ln = stone ? STONE_LO : DARK;
  if (c === 'checky') { const n = 6, cw = W / n, chh = H / Math.max(4, Math.round(n * H / W)); for (let a = 0; a < n; a++) for (let b = 0; b * chh < H; b++) if ((a + b) % 2) { g.fillStyle = col; g.fillRect(X + a * cw, Y + b * chh, cw + 0.5, chh + 0.5); if (stone) hatch(g, ch.t, X + a * cw, Y + b * chh, cw, chh, Math.max(3, W * 0.05)); } return true; }
  if (c === 'pales4') { const pw = W / 9; for (let i = 0; i < 4; i++) { g.fillStyle = col; g.fillRect(X + pw * (1 + i * 2), Y, pw, H); if (stone) hatch(g, ch.t, X + pw * (1 + i * 2), Y, pw, H, Math.max(3, W * 0.04)); } return true; }
  if (c === 'bends2') { g.save(); g.translate(X + W / 2, Y + H / 2); g.rotate(Math.atan2(H, W)); const L = Math.hypot(W, H), bw = Math.min(W, H) * 0.14; for (const o of [-0.18, 0.18]) { g.fillStyle = col; g.fillRect(-L / 2, o * Math.min(W, H) * 1.3 - bw / 2, L, bw); g.strokeStyle = ln; g.lineWidth = 1.5; g.strokeRect(-L / 2, o * Math.min(W, H) * 1.3 - bw / 2, L, bw); } g.restore(); return true; }
  if (c === 'waves') { const y0 = Y + H * 0.78; for (let k = 0; k < 3; k++) { g.fillStyle = stone ? (k % 2 ? STONE : STONE_HI) : (k % 2 ? TINCT.azur : TINCT.plata); g.beginPath(); const yy = y0 + k * H * 0.075; g.moveTo(X, Y + H); g.lineTo(X, yy); for (let i = 0; i <= 12; i++) g.lineTo(X + W * i / 12, yy + (i % 2 ? -1 : 1) * H * 0.02); g.lineTo(X + W, Y + H); g.closePath(); g.fill(); } return true; }
  if (c === 'pales5') { const pw = W / 11; for (let i = 0; i < 5; i++) { g.fillStyle = col; g.fillRect(X + pw * (1 + i * 2), Y, pw, H); } return true; }
  if (c === 'bendlets3') { g.save(); g.translate(X + W / 2, Y + H / 2); g.rotate(Math.atan2(H, W)); const L = Math.hypot(W, H), bw = Math.min(W, H) * 0.08; for (const o of [-0.3, 0, 0.3]) { g.fillStyle = col; g.fillRect(-L / 2, o * Math.min(W, H) - bw / 2, L, bw); g.strokeStyle = ln; g.lineWidth = 1.2; g.strokeRect(-L / 2, o * Math.min(W, H) - bw / 2, L, bw); } g.restore(); return true; }
  if (c === 'fessChequy') { const y0 = Y + H * 0.42, fh = H * 0.18, n = 8, cw = W / n; for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) { g.fillStyle = stone ? ((i + r) % 2 ? STONE_LO : STONE_HI) : ((i + r) % 2 ? TINCT.sable : TINCT.oro); g.fillRect(X + i * cw, y0 + r * fh / 2, cw + 0.5, fh / 2 + 0.5); } g.strokeStyle = ln; g.lineWidth = 1.5; g.strokeRect(X - 2, y0, W + 4, fh); return true; }
  if (c === 'point') { g.fillStyle = col; g.fillRect(X, Y + H * 0.72, W, H * 0.28); g.strokeStyle = ln; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, Y + H * 0.72); g.lineTo(X + W, Y + H * 0.72); g.stroke(); return true; }
  if (c === 'escutcheon') {
    // escusón ovalado en el centro (el «abismo») con su propia figura
    const ex = X + W / 2, ey = Y + H * 0.5, rx = W * 0.2, ry = H * 0.17;
    g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, 7); g.fillStyle = stone ? STONE : TINCT[ch.f]; g.fill(); g.strokeStyle = ln; g.lineWidth = 2; g.stroke();
    glyph(g, ch.inner, ex, ey, Math.min(rx, ry) * 1.6, null, stone); return true;
  }
  if (c === 'mound') { g.fillStyle = col; g.beginPath(); g.moveTo(X, Y + H); g.lineTo(X, Y + H * 0.84); g.quadraticCurveTo(X + W / 2, Y + H * 0.74, X + W, Y + H * 0.84); g.lineTo(X + W, Y + H); g.closePath(); g.fill(); g.strokeStyle = ln; g.stroke(); return true; }
  if (c === 'cadenas' || c === 'saltireChains') {
    // eslabones a lo largo de las líneas: orla, cruz y aspa (o solo el aspa), con la esmeralda en el centro
    const cx = X + W / 2, cy = Y + H / 2, m = Math.min(W, H) * 0.1, lw = Math.max(1.5, Math.min(W, H) * 0.035);
    const seg = (x1, y1, x2, y2) => { const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(d / (Math.min(W, H) * 0.07))), a = Math.atan2(y2 - y1, x2 - x1); for (let i = 0; i <= n; i++) { const t = i / n; g.save(); g.translate(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); g.rotate(a); g.beginPath(); g.ellipse(0, 0, Math.min(W, H) * 0.04, Math.min(W, H) * 0.022, i % 2 ? 0 : Math.PI / 2, 0, 7); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); g.restore(); } };
    if (c === 'cadenas') { seg(X + m, Y + m, X + W - m, Y + m); seg(X + W - m, Y + m, X + W - m, Y + H * 0.62); seg(X + m, Y + m, X + m, Y + H * 0.62); seg(X + m, Y + H * 0.62, cx, Y + H - m); seg(X + W - m, Y + H * 0.62, cx, Y + H - m); seg(cx, Y + m, cx, Y + H - m); seg(X + m, cy, X + W - m, cy); }
    seg(X + m, Y + m, X + W - m, Y + H - m * 1.6); seg(X + W - m, Y + m, X + m, Y + H - m * 1.6);
    if (c === 'cadenas') { g.beginPath(); g.arc(cx, cy, Math.min(W, H) * 0.07, 0, 7); g.fillStyle = stone ? STONE_HI : '#1d8a4a'; g.fill(); g.strokeStyle = ln; g.lineWidth = 1.5; g.stroke(); }
    return true;
  }
  return false;
}

function drawZone(g, Q, X, Y, W, H, stone, depth) {
  g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip();
  g.fillStyle = stone ? STONE : TINCT[Q.f]; g.fillRect(X, Y, W, H);
  if (stone) hatch(g, Q.f, X, Y, W, H, Math.max(3, Math.min(W, H) * 0.06));
  if (Q.sub) {
    const zs = zonesOf(Q.sub.part);
    Q.sub.q.forEach((q, i) => { const [zx, zy, zw, zh] = zs[i]; drawZone(g, q, X + zx * W, Y + zy * H, zw * W, zh * H, stone, depth + 1); });
    g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(1.2, Math.min(W, H) * 0.02); partLines(g, Q.sub.part, X, Y, W, H);
  }
  let iX = X, iY = Y, iW = W, iH = H;
  if (Q.bordura) { const b = Math.min(W, H) * 0.12; bordureRect(g, Q.bordura, X, Y, W, H, b, stone); iX += b; iY += b; iW -= 2 * b; iH -= 2 * b; }
  for (const ch of Q.ch || []) {
    const col = stone ? STONE_HI : ch.t === 'natural' ? null : TINCT[ch.t];
    if (piece(g, ch.c, iX, iY, iW, iH, stone ? STONE_LO : col, stone, ch)) continue;
    const [ax, ay] = ch.at || [0.5, 0.52], s = Math.min(iW, iH) * (ch.s || 0.75), n = ch.n || 1;
    if (n === 2) for (const dy of [-0.26, 0.26]) glyph(g, ch.c, iX + ax * iW, iY + (ay + dy * 0.9) * iH, s * 0.55, col, stone, ch);
    else glyph(g, ch.c, iX + ax * iW, iY + ay * iH, s, col, stone, ch);
  }
  g.restore();
}
// bordura de un cuartel (rectangular)
function bordureRect(g, B, X, Y, W, H, b, stone) {
  g.save(); g.beginPath(); g.rect(X, Y, W, H); g.rect(X + b, Y + b, W - 2 * b, H - 2 * b); g.fillStyle = stone ? STONE : TINCT[B.t]; g.fill('evenodd');
  if (B.c === 'aspas') { const n = B.n || 8, pts = []; for (let i = 0; i < n; i++) { const t = i / n, per = 2 * (W + H) - 8 * b; let d = t * per; const w2 = W - b, h2 = H - b; if (d < w2) pts.push([X + b / 2 + d, Y + b / 2]); else if ((d -= w2) < h2) pts.push([X + W - b / 2, Y + b / 2 + d]); else if ((d -= h2) < w2) pts.push([X + W - b / 2 - d, Y + H - b / 2]); else pts.push([X + b / 2, Y + H - b / 2 - (d - w2)]); } for (const [x, y] of pts) aspa(g, x, y, b * 0.7, stone ? STONE_HI : TINCT[B.ct || 'oro'], stone); }
  g.restore();
}
function aspa(g, x, y, s, col, stone) { g.save(); g.translate(x, y); g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = s * 0.34; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-s / 2, -s / 2); g.lineTo(s / 2, s / 2); g.moveTo(s / 2, -s / 2); g.lineTo(-s / 2, s / 2); g.stroke(); g.strokeStyle = col; g.lineWidth = s * 0.22; g.stroke(); g.restore(); }

/** Escudo oficial A (de ARMAS) con su timbre: cx centro, top arriba del timbre, w ancho del escudo. */
export function drawOfficial(g, cx, top, w, A, { stone = false } = {}) {
  const sh = w * 1.18, hy = A.timbre ? w * 0.3 : w * 0.04, x0 = cx - w / 2, y0 = top + hy;
  g.save();
  g.fillStyle = 'rgba(0,0,0,.22)'; shieldPath(g, x0 + w * 0.025, y0 + w * 0.035, w, sh); g.fill();
  if (A.timbre === 'yelmo') helmet(g, cx, top + w * 0.12, w * 0.8, stone);
  // bordura del escudo entero
  const B = A.bordura, b = B ? w * 0.11 : 0;
  g.save(); shieldPath(g, x0, y0, w, sh); g.clip();
  if (B) { g.fillStyle = stone ? STONE : TINCT[B.t]; g.fillRect(x0, y0, w, sh); if (stone) hatch(g, B.t, x0, y0, w, sh, Math.max(3, w * 0.035)); }
  g.save(); if (B) { shieldPath(g, x0 + b, y0 + b, w - 2 * b, sh - 2 * b); g.clip(); }
  const zs = zonesOf(A.part), IX = x0 + b, IY = y0 + b, IW = w - 2 * b, IH = sh - 2 * b;
  A.q.forEach((q, i) => { const [zx, zy, zw, zh] = zs[i]; drawZone(g, q, IX + zx * IW, IY + zy * IH, zw * IW, zh * IH, stone, 0); });
  g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(1.5, w * 0.016); partLines(g, A.part, IX, IY, IW, IH);
  if (A.over) piece(g, A.over.c, IX, IY, IW, IH, null, stone, A.over);   // escusón sobre el todo
  g.restore();
  if (B) {
    g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(1.2, w * 0.012); shieldPath(g, x0 + b, y0 + b, w - 2 * b, sh - 2 * b); g.stroke();
    if (B.c === 'cadenas') { const n = 30; g.strokeStyle = stone ? STONE_HI : TINCT.oro; g.lineWidth = Math.max(1.5, w * 0.018); for (let i = 0; i < n; i++) { const [x, y, a] = rim(x0 + b / 2, y0 + b / 2, w - b, sh - b, i / n); g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, w * 0.04, w * 0.022, i % 2 ? 0 : Math.PI / 2, 0, Math.PI * 2); g.stroke(); g.restore(); } }
    if (B.c === 'aspas') for (let i = 0; i < (B.n || 8); i++) { const [x, y] = rim(x0 + b / 2, y0 + b / 2, w - b, sh - b, (i + 0.5) / (B.n || 8)); aspa(g, x, y, b * 0.7, stone ? STONE_HI : TINCT[B.ct || 'oro'], stone); }
    if (B.c === 'billetes') for (let i = 0; i < (B.n || 6); i++) { const [x, y, a] = rim(x0 + b / 2, y0 + b / 2, w - b, sh - b, (i + 0.5) / (B.n || 6)); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = stone ? STONE_HI : TINCT[B.ct || 'gules']; g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = 1.2; g.fillRect(-b * 0.22, -b * 0.36, b * 0.44, b * 0.72); g.strokeRect(-b * 0.22, -b * 0.36, b * 0.44, b * 0.72); g.restore(); }
    if (B.c === 'componada') { g.save(); g.setLineDash([w * 0.09, w * 0.09]); g.strokeStyle = stone ? STONE_LO : TINCT[B.t2 || 'azur']; g.lineWidth = b; shieldPath(g, x0 + b / 2, y0 + b / 2, w - b, sh - b); g.stroke(); g.restore(); }
  }
  g.restore();
  g.strokeStyle = stone ? STONE_LO : DARK; g.lineWidth = Math.max(2.5, w * 0.03); shieldPath(g, x0, y0, w, sh); g.stroke();
  if (A.timbre === 'corona') crown(g, cx, y0 + w * 0.01, w * 0.72);
  g.restore();
}
/** Alto total del dibujo (timbre incluido) para un ancho w. */
export function officialHeight(w, A) { return (A.timbre ? w * 0.3 : w * 0.04) + w * 1.18 + w * 0.05; }
