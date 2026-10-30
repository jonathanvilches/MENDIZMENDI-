// La pantalla de carga con los textos de cada pueblo y cada consejo: ¿se corta algo (puntos suspensivos), se monta una cosa
// encima de otra o se sale de la pantalla? Rellena el #loading de verdad del juego (servidor de desarrollo, 5173) con la
// descripción de cada pueblo, cada consejo y cada «¿Sabías que…?» de la pelota y la pasaka, en varios tamaños.
// Uso: node tools/carga-textos.mjs  (TAMS=844x390,667x375,… ; LNG=eu en euskera)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const arr = (name) => { const m = src.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`)); return eval(m[1]); };
const obj = (name) => { const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`)); return eval('(' + m[1] + ')'); };
const TIPS = arr('TIPS').concat([src.match(/const TIP_TOQUE = '([^']+)'/)[1]]), PEL = obj('DATOS_PELOTA'), PAS = obj('DATOS_PASAKA');
const TAMS = (process.env.TAMS || '844x390,667x375,932x430,1280x720').split(',');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const malos = [];
for (const tam of TAMS) {
  const [W, H] = tam.split('x').map(Number), movil = W < 1000;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: movil, hasTouch: movil });
  await p.addInitScript((LNG) => { localStorage.setItem('herrizherri-lang', LNG); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); }, process.env.LNG || 'es');
  await p.goto('http://127.0.0.1:5173/?q=low', { timeout: 300000 });
  await p.waitForFunction(() => window.__hub?.visible && window.__ready, null, { timeout: 300000 });
  const r = await p.evaluate(async ({ TIPS, PEL, PAS }) => {
    const { LEVELS } = await import('/src/data/levels.js'), { default: COMARCAS } = await import('/src/data/comarcas.json');
    const L = document.getElementById('loading'); L.classList.remove('hidden', 'entra', 'ld-min', 'no-pic'); L.style.opacity = 1;
    const $ = (s) => L.querySelector(s), corta = (e) => e && e.scrollHeight > e.clientHeight + 2;
    const caja = (s) => $(s)?.getBoundingClientRect(), choca = (a, b) => a && b && a.width && b.width && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    const fuera = (s) => { const r = caja(s); return r && r.width && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < -1 || r.left < -1); };
    const out = [];
    const mira = (que, nombre, intro, tip, k, nms) => {
      $('.ld-name').textContent = nombre; $('.ld-intro').textContent = intro; $('.tip').textContent = tip; $('.ld-k').textContent = k; $('.ld-pic figcaption').textContent = 'El puente de la Cárcel de Estella';
      $('.ld-ms').innerHTML = nms ? `<span>${nms} misiones te esperan</span><div>${'<i class="ico" style="display:inline-block;width:34px;height:34px"></i>'.repeat(nms)}</div>` : '';
      void L.offsetWidth;
      const fallos = [];
      if (corta($('.ld-intro'))) fallos.push('descripción cortada');
      if (corta($('.tip'))) fallos.push('consejo cortado');
      if ($('.ld-name').scrollWidth > $('.ld-name').clientWidth + 2) fallos.push('nombre cortado');
      if (choca(caja('.ld-txt'), caja('.ld-prog'))) fallos.push('el texto pisa la barra');
      if (choca(caja('.ld-txt'), caja('.ld-tip'))) fallos.push('el texto pisa el consejo');
      if (choca(caja('.ld-tip'), caja('.ld-pic figcaption'))) fallos.push('el consejo pisa el nombre de la lámina');
      if (choca(caja('.ld-txt'), caja('.ld-pic figcaption'))) fallos.push('el texto pisa el nombre de la lámina');
      if (choca(caja('.ld-prog'), caja('.ld-pic figcaption'))) fallos.push('la barra pisa el nombre de la lámina');
      const ar = caja('.ld-head'); if (ar && ar.top < 8) fallos.push('el nombre sube hasta arriba del todo');
      for (const s of ['.ld-txt', '.ld-tip', '.ld-prog', '.ld-pic figcaption']) if (fuera(s)) fallos.push(s + ' se sale de la pantalla');
      if (fallos.length) out.push(`${que}: ${fallos.join(', ')}`);
    };
    const largo = TIPS.reduce((a, t) => t.length > a.length ? t : a, '');
    for (const l of LEVELS) mira(l.id, l.name.split(' /')[0], l.intro || '', largo, 'Comarca · ' + (COMARCAS.find(c => c.id === l.comarca)?.name || ''), (l.missions || []).length);
    const lv = LEVELS.find(l => l.id === 'pamplona');
    for (const t of TIPS) mira('consejo «' + t.slice(0, 30) + '…»', 'Pamplona', lv.intro, t, 'Comarca · Comarca de Pamplona', 10);
    for (const t of (localStorage.getItem('herrizherri-lang') === 'eu' ? [...PEL.eu, ...PAS.eu] : [...PEL.es, ...PAS.es])) mira('dato «' + t.slice(0, 30) + '…»', 'Pelota a mano · Puente la Reina', '', t, 'Comarca · Valdizarbe-Novenera', 0);
    return out;
  }, { TIPS, PEL, PAS });
  console.log(`${tam}: ${r.length ? r.length + ' problemas' : 'todo bien'}`); r.forEach(x => console.log('   ', x)); malos.push(...r.map(x => tam + ' ' + x));
  await p.close();
}
await b.close();
process.exit(malos.length ? 1 : 0);
