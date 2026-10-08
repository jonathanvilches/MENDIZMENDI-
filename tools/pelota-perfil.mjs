// Pelota: cada pelotari juega como dice su ficha. Con un golpe preferido (cortada, dos paredes, gancho a la izquierda,
// dejada o largo), el rival lo usa bastante más que uno sin preferencias. Y la ficha lo cuenta. Sin gráficos.
// Uso: node tools/pelota-perfil.mjs
import { PelotaGame } from '../src/pelota/game.js';
import { pelotariStats, profileHtml, SHOTS } from '../src/pelota/rules.js';

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const kindOf = (e) => e.shot === 'cortada' ? 'cortada' : e.shot === 'dosparedes' ? 'dosparedes' : (e.shot === 'pared' || e.shot === 'gancho') ? 'gancho' : e.shot === 'dejada' ? 'dejada' : (e.shot === 'largo' || e.shot === 'rebote') ? 'largo' : 'otro';
function shares(style) {
  const n = {}; let tot = 0;
  for (let k = 0; k < 5; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, rivalStats: { fuerza: 3, agilidad: 3, velocidad: 3, style }, seed: 104729 * (k + 51) + 3 });
    g.start(); let t = 0;
    while (g.phase !== 'end' && t < 900) { for (const e of g.update(1 / 30, {})) if (e.type === 'hit' && e.who === 'rival' && !g.rally?.serve) { const x = kindOf(e); n[x] = (n[x] || 0) + 1; tot++; } t += 1 / 30; }
  }
  const o = {}; for (const k of [...SHOTS, 'otro']) o[k] = (n[k] || 0) / Math.max(1, tot); return o;
}
console.log('1. cada golpe preferido se nota');
const none = shares(null);
console.log('   sin preferencias:', Object.entries(none).map(([k, v]) => `${k} ${(v * 100).toFixed(0)} %`).join(', '));
for (const k of SHOTS) {
  const st = Object.fromEntries(SHOTS.map(x => [x, x === k ? 3 : 0]));
  const s = shares(st);
  console.log(`   le gusta ${k}: ${(s[k] * 100).toFixed(0)} % de sus golpes (sin preferencias, ${(none[k] * 100).toFixed(0)} %)`);
  ok(s[k] > none[k] + 0.08, `el que tiene ${k} de golpe preferido lo juega bastante más`);
}
console.log('2. la ficha lo cuenta');
const st = pelotariStats('Mikel Leitza', 2), html = profileHtml('Mikel', st, 'es'), top = SHOTS.filter(k => st.style[k] === 3)[0];
console.log('   ', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
ok(/Corre .*Potencia .*Manos /.test(html.replace(/<[^>]+>/g, '')), 'dice cuánto corre, cuánto pega y cómo son sus manos');
ok(top && html.includes('★★★') && html.includes('¡Cuidado'), `enseña su golpe preferido (${top}) y avisa de él`);
const eu = profileHtml('Mikel', st, 'eu');
ok(/Korrika .*Indarra .*Eskuak /.test(eu.replace(/<[^>]+>/g, '')) && eu.includes('Kontuz'), 'y en euskera');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
