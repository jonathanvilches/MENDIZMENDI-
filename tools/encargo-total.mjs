// Encargo total de imágenes: todo lo que el juego enseña sin una imagen del autor, en un solo archivo de texto con las
// instrucciones y un prompt por imagen, para pegarlo en una herramienta de imágenes (ChatGPT u otra). Lo saca de los datos
// del juego cargados en el servidor de pruebas (así usa las mismas tablas que el juego: qué tiene imagen y qué no):
//  · escudos de las casas sin imagen (src/data/blasones.js, con su blasón), oficios sin escudo y escudos municipales que falten
//  · personajes de Navarra sin ilustración (src/data/personajes.js; las escenas, de tools/encargo-personajes.py)
//  · cuentos y leyendas sin ilustración propia (src/data/cuentos.js), figuras de leyenda y carnaval, tradiciones, cimas de
//    las misiones de montaña, fauna y láminas que falten; las láminas de prioridad 1 para regenerar con más calidad
//  · iconos que no son del autor (renders del juego o dibujos 2D de siempre) e instrumentos sin original grande
//  · si se le da la carpeta del paquete de revisión del autor, también sus escudos señalados para corregir
// Uso: node tools/encargo-total.mjs <salida.md> [carpeta del paquete de escudos]   (URL=http://127.0.0.1:5173/)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const [,, out = 'MENDIMENDIZ-encargo-total.md', paquete = ''] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(URL + '?skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 }).catch(() => {});
const inv = await p.evaluate(async () => {
  const mod = (u) => import(u);
  const [pers, cue, fig, fau, flo, ofi, ins, lamd, lev, bla, arm, lam, esc, fai, figi, ic3, ics, mon, com] = await Promise.all([
    mod('/src/data/personajes.js'), mod('/src/data/cuentos.js'), mod('/src/data/figuras.js'), mod('/src/data/fauna.js'), mod('/src/data/flora.js'),
    mod('/src/data/oficios.js'), mod('/src/data/instrumentos.js'), mod('/src/data/laminas.js'), mod('/src/data/levels.js'), mod('/src/data/blasones.js'),
    mod('/src/data/armas-navarra.js'), mod('/src/ui/laminas.js'), mod('/src/ui/escudoImg.js'), mod('/src/ui/faunaImg.js'), mod('/src/ui/figuras.js'),
    mod('/src/ui/icon3d.js'), mod('/src/ui/icons.js'), mod('/src/data/mountains.json'), mod('/src/data/comarcas.json')]);
  const LEVELS = lev.LEVELS, MOUNTAINS = mon.default || mon, COMARCAS = com.default || com;
  const townOf = (id) => Object.entries(pers.FIGURE_TOWNS).find(([, ids]) => ids.includes(id))?.[0] || null;
  return {
    personajes: Object.entries(pers.PERSONAJES).map(([id, x]) => ({ id, name: x.name, eu: x.eu, years: x.years, kicker: x.kicker, women: !!x.women, town: townOf(id), intro: String(x.pages?.[0] || '').slice(0, 280), has: /\/personajes\//.test(lam.personajeUrl(id) || '') })),   // (solo su ilustración propia; Sancho y las golondrinas llevan una lámina prestada)
    leyendas: cue.CUENTOS.map(c => ({ id: c.id, title: c.title, kind: c.kind, place: c.place, towns: c.towns, intro: String((c.parts || [])[0] || '').slice(0, 300), clave: String((c.parts || [])[2] || '').slice(0, 220), has: !!(lam.leyendaUrl(c.id, true) && lam.leyendaUrl(c.id, true) !== lam.laminaUrl(lamd.CUENTO_LAMINA[c.id])) })),
    figuras: fig.FIGURAS.map(f => ({ id: f.id, kind: f.kind, name: f.name, eu: f.eu, where: f.where, who: String(f.who || '').slice(0, 260), wear: f.wear, has: /\/ilus\//.test(figi.figuraImg(f.id) || '') })),   // (solo cuenta la ilustración del autor, no el render del traje)
    cimas: LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'summit' && m.peak).map(m => ({ town: l.id, townName: l.name, id: m.peak }))).map(x => { const m = MOUNTAINS.find(y => y.id === x.id) || {}; return { ...x, name: m.name || x.id, altName: m.altName || '', zone: m.zone || '', altitude: m.altitude || '', tag: m.tag || '', intro: String(m.intro || '').slice(0, 240), has: !!lam.cimaUrl(x.id) }; }),
    tradiciones: LEVELS.flatMap(l => (l.missions || []).filter(m => m.ilus || ['tradition', 'dance', 'feria'].includes(m.type)).map(m => { const strs = Object.entries(m).filter(([k, v]) => typeof v === 'string' && !['type', 'kind', 'ilus', 'character'].includes(k)).map(([, v]) => v); const title = m.title || m.name || m.dance || m.label || ''; return { town: l.id, townName: l.name, type: m.type, kind: m.kind || '', title, ilus: m.ilus || null, text: strs.filter(v => v !== title).sort((a, b) => b.length - a.length)[0]?.slice(0, 240) || '', has: !!(m.ilus && lam.tradicionUrl(m.ilus)) }; })),
    fauna: Object.entries(fau.FAUNA).map(([id, f]) => ({ id, name: f.name, eu: f.eu, sci: f.sci, kind: f.kind, has: !!fai.faunaImg(id) })),
    flora: Object.entries(flo.FLORA).map(([id, f]) => ({ id, name: f.name, eu: f.eu || '', sci: f.sci || '', kind: f.kind || '' })),
    oficios: Object.entries(ofi.OFICIOS).map(([id, o]) => ({ id, name: o.name, intro: String(o.intro || '').slice(0, 200), has: !!esc.oficioImg(id) })),
    instrumentos: ins.INSTRUMENTOS.map(i => ({ id: i.id, name: i.name, eu: i.eu, icon: i.icon, what: String(i.what || '').slice(0, 220) })),
    laminas: lamd.LAMINAS.map(l => ({ id: l.id, title: l.title, kind: l.kind, town: l.town || '', comarca: l.comarca || '', group: l.group || '', cover: !!l.cover, has: !!lam.laminaUrl(l.id) })),
    iconos: [...new Set([...Object.keys(ics.ICONS), ...ic3.ICON3D_NAMES()])].map(n => ({ n, baked: !!ic3.icon3DReady(n), url: String(ic3.icon3DReady(n) || ''), d3: ic3.has3D(n) })),
    casas: LEVELS.flatMap(l => Array.from({ length: 8 }, (_, i) => { const A = bla.houseArms(l, i); return { town: l.id, townName: l.name, comarca: l.comarca, n: i + 1, house: A.house, century: A.century, blazon: bla.blazon(A), has: !!esc.casaImg(l.id, i) }; })),
    municipales: arm.ARMAS.map(a => ({ id: a.id, name: a.name, kind: a.kind, blazon: a.blazon, has: !!esc.armsImg(a.id) })),
    pendientes: arm.PENDIENTES.map(x => ({ name: x.name, note: x.note || '' })),
    comarcas: Object.fromEntries(COMARCAS.map(c => [c.id, c.name])),
    towns: LEVELS.map(l => ({ id: l.id, name: l.name, comarca: l.comarca })),
  };
});
await b.close();
if (errs.length) console.log('errores de página:', errs.join(' | '));

// ---- lo que no viene de los datos: las escenas ya escritas de los personajes y la lista de iconos del autor
const ESCENA = {};
for (const m of readFileSync('tools/encargo-personajes.py', 'utf8').matchAll(/^\s+'([a-z]+)': \('((?:[^'\\]|\\.)*)', '(?:[^'\\]|\\.)*'\)/gm)) ESCENA[m[1]] = m[2].replace(/\\'/g, "'");
const AUTOR = new Set([...(readFileSync('src/assets/icons3d/LICENSE_iconos-autor.txt', 'utf8').match(/^Lista: (.*)$/m)?.[1] || '').split(' '), 'boot', 'fullscreen', 'globe', 'info', 'key', 'mute', 'retry', 'search', 'sound']);
const FUTBOL = new Set(['shoot', 'pass', 'through', 'sprint', 'swap', 'tackle', 'slide', 'cross', 'header', 'lob', 'pause', 'formation', 'sub', 'card', 'whistle', 'gk', 'keeper', 'corner']);
const HUGE = new Set(existsSync('src/assets/icons3d/1024') ? readdirSync('src/assets/icons3d/1024').map(f => f.replace('.webp', '')) : []);
let corregir = [];
if (paquete && existsSync(join(paquete, 'inventario-completo.json'))) {
  const invp = JSON.parse(readFileSync(join(paquete, 'inventario-completo.json'), 'utf8'));
  corregir = invp.filter(e => e.estado === 'corregir').map(e => ({ tipo: e.tipo, id: e.id, nombre: e.nombre, nota: e.observacion || '', blason: e.blason || '' }));
}

// ---- el texto
const tn = Object.fromEntries(inv.towns.map(t => [t.id, t.name])), cn = inv.comarcas;
const sitio = (town, comarca) => town ? `${tn[town] || town}${inv.towns.find(t => t.id === town)?.comarca ? ' (' + (cn[inv.towns.find(t => t.id === town).comarca] || '') + ')' : ''}` : comarca ? `comarca de ${cn[comarca] || comarca}` : 'Navarra';
const esc = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const hoy = new Date().toISOString().slice(0, 10);
const casasSin = inv.casas.filter(c => !c.has), persSin = inv.personajes.filter(x => !x.has), leySin = inv.leyendas.filter(x => !x.has);
const figSin = inv.figuras.filter(x => !x.has), cimSin = inv.cimas.filter(x => !x.has), tradSin = inv.tradiciones.filter(x => !x.has && (x.ilus || x.type !== 'carnival'));
const fauSin = inv.fauna.filter(x => !x.has), ofiSin = inv.oficios.filter(x => !x.has), munSin = inv.municipales.filter(x => !x.has), lamSin = inv.laminas.filter(x => !x.has);
const lamPrio = inv.laminas.filter(l => l.has && (l.cover || l.kind === 'deporte' || (l.kind === 'paisaje' && l.comarca)));
// (un mismo archivo con dos nombres, como lechuza y owl, es una imagen: si alguno de sus nombres es del autor, es del autor)
const porUrl = new Map(); for (const i of inv.iconos) if (i.baked) { if (!porUrl.has(i.url)) porUrl.set(i.url, []); porUrl.get(i.url).push(i.n); }
const icoRender = [...porUrl.values()].filter(ns => !ns.some(n => AUTOR.has(n) || FUTBOL.has(n))).map(ns => ns.sort((a, b) => (a.startsWith('_') ? 1 : 0) - (b.startsWith('_') ? 1 : 0) || a.localeCompare(b))).sort((a, b) => a[0].localeCompare(b[0]));
const ico3D = inv.iconos.filter(i => !i.baked && i.d3 && !AUTOR.has(i.n) && !FUTBOL.has(i.n)).map(i => i.n).sort();
const ico2D = inv.iconos.filter(i => !i.baked && !i.d3 && !AUTOR.has(i.n) && !FUTBOL.has(i.n)).map(i => i.n).sort();
const instSin = inv.instrumentos.filter(i => !HUGE.has(i.icon));
const total = casasSin.length + ofiSin.length + munSin.length + persSin.length + leySin.length + figSin.length + tradSin.length + cimSin.length + fauSin.length + lamSin.length + icoRender.length + ico3D.length + instSin.length;

const EXPLORADOR = 'el explorador del juego: un niño de unos diez años, pelo castaño rizado, camisa caqui con bolsillos, pantalón corto, mochila y botas de monte (el mismo de todas las láminas); si la escena pide a la exploradora, una niña de la misma edad con coleta castaña y la misma ropa';
const ESTILO_LAMINA = 'Ilustración 3D tipo película de animación (sin fotorrealismo), luz suave y cálida, colores vivos, mucho detalle. Apaisada 16:9, al mayor tamaño que dé la herramienta (ideal 2560 × 1440; mínimo 1536 × 864). Lo importante en el 60 % central (los lados se recortan en el móvil). Sin texto, sin letras, sin marcas de agua, sin bordes.';
const ESTILO_ESCUDO = 'Escudo heráldico en volumen, como la serie de octubre de 2026 del juego: campo con relieve suave, borde de piedra o metal biselado, esmaltes puros (gules = rojo, azur = azul, sinople = verde, sable = negro, oro = amarillo dorado, plata = blanco perla), figuras con sombra ligera, luz desde arriba a la izquierda. Cuadrado 1254 × 1254, fondo transparente (PNG), el escudo centrado y ocupando el 85 % del alto. Sin texto, sin lema, sin fondo.';
const ESTILO_ICONO = 'Icono 3D de la familia única del juego: un solo objeto, centrado, vista tres cuartos un poco desde arriba, formas redondeadas, colores vivos, un brillo suave, sin fondo (PNG transparente), 1024 × 1024, el objeto ocupando el 89 % del cuadro. Sin texto.';
const L = [];
L.push(`# Herrizherri · encargo de imágenes (${hoy})`, '');
L.push(`Todo lo que el juego enseña hoy sin una imagen tuya, en un solo archivo: ${total} imágenes. Cada apartado lleva su estilo y, debajo, un prompt por imagen con el nombre exacto del archivo. Pega el bloque de estilo del apartado y luego los prompts de uno en uno o de pocos en pocos.`, '');
L.push('## Cómo entregarlas', '',
  '- PNG (o WebP con calidad 90 o más; nada de JPEG), con el nombre de archivo que dice cada prompt. Con ese nombre entran en el juego sin tocar nada más.',
  '- Escudos e iconos: cuadrados, fondo transparente. Láminas, personajes, leyendas, cimas y tradiciones: apaisadas 16:9.',
  '- Nada de texto, letras ni marcas de agua dentro de la imagen. Nada que imite marcas, escudos de clubes reales ni personajes de otros videojuegos.',
  '- Mándalo en uno o varios zip; yo saco las medidas que usa el juego (web, archivo único y ligero).', '');
L.push('## Orden que te recomiendo', '',
  `1. Escudos de las casas (${casasSin.length}): es lo que más se ve en los pueblos y hoy sale con el dibujo tallado del juego.`,
  `2. Personajes de Navarra (${persSin.length}) y figuras de leyenda y carnaval (${figSin.length}): fichas que ahora llevan una lámina prestada o un render del juego.`,
  `3. Tradiciones (${tradSin.length}), iconos que no son tuyos (${icoRender.length + ico3D.length}), el instrumento que falta (${instSin.length}) y el resto.`, '');

// 1) escudos de las casas
L.push(`## 1. Escudos de las casas (${casasSin.length})`, '', '**Estilo (pégalo una vez):** ' + ESTILO_ESCUDO + ' Timbre: yelmo de acero de perfil con lambrequines de los colores del campo, salvo que el blasón diga otra cosa. En las casas del Baztan, el ajedrezado es plata y sable.', '');
const porPueblo = new Map(); for (const c of casasSin) { if (!porPueblo.has(c.town)) porPueblo.set(c.town, []); porPueblo.get(c.town).push(c); }
for (const [town, cs] of [...porPueblo.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
  L.push(`### ${tn[town] || town} (${cs.length})`, '');
  for (const c of cs) L.push(`- **${town}-${c.n}.png** · Casa ${esc(c.house)}, siglo ${esc(c.century)}. Escudo de la casa ${esc(c.house)} de ${tn[town] || town}: ${esc(c.blazon)}`);
  L.push('');
}
if (ofiSin.length || munSin.length) {
  L.push(`## 1b. Otros escudos que faltan (${ofiSin.length + munSin.length})`, '', '**Estilo:** el mismo del apartado 1. Los de oficio no llevan yelmo: solo el escudo con la herramienta o el producto del oficio, y una cinta lisa sin texto debajo.', '');
  for (const o of ofiSin) L.push(`- **${o.id}.png** · Escudo del oficio de ${esc(o.name).toLowerCase()}: ${esc(o.intro)}`);
  for (const m of munSin) L.push(`- **${m.id}.png** · Escudo municipal de ${esc(m.name)}: ${esc(m.blazon)}`);
  L.push('');
}
// 2) personajes
L.push(`## 2. Personajes de Navarra (${persSin.length})`, '', '**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' Retrato narrativo: la persona en su mundo, de cuerpo entero o tres cuartos, reconocible y amable, con la ropa de su época; sin caricatura y sin copiar ninguna foto concreta. Para las figuras colectivas, un grupo de tres o cuatro personas en su trabajo.', '');
for (const x of persSin) L.push(`- **${x.id}.png** · ${esc(x.name)} (${esc(x.years)}; ${esc(x.kicker)}; ${x.town ? 'en el juego, en ' + (tn[x.town] || x.town) : 'Navarra'}). ${esc(ESCENA[x.id] || x.intro)}.`);
L.push('');
// 3) leyendas
L.push(`## 3. Cuentos y leyendas (${leySin.length})`, '');
if (!leySin.length) L.push(`Los ${inv.leyendas.length} cuentos y leyendas del libro ya llevan tu ilustración (la serie «leyendas» de octubre). No falta ninguna; las figuras que salen en ellas van en el apartado 4.`, '');
else { L.push('**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' Escena de cuento, de noche o al atardecer cuando la historia lo pide, con misterio pero sin miedo: es para niños. Sin sangre ni violencia explícita. El paisaje real del sitio (sierra, foz, río, pueblo) reconocible.', ''); for (const c of leySin) L.push(`- **${c.id}.png** · «${esc(c.title)}» (${c.kind === 'historia' ? 'historia real' : 'leyenda'}; ${esc(c.place)}; en ${c.towns.map(t => tn[t] || t).join(' y ')}). El momento clave: ${esc(c.clave || c.intro)}`); L.push(''); }
// 4) figuras
L.push(`## 4. Figuras de leyenda y carnaval (${figSin.length})`, '');
if (!figSin.length) L.push('Las doce figuras ya tienen su imagen tuya (lamia, basajaun, tartalo, sorgina, Roldán, joaldun, momotxorro, cascabobo, irasko, paloki, zipotero y el coronel Lagunero). No falta ninguna.', '');
else { L.push('Hoy salen con un render del traje hecho por el propio juego: con tu ilustración, la tarjeta y la ficha pasan a verse apaisadas.', '', '**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' La figura de cuerpo entero, de pie, en su sitio de Navarra, con el traje exacto que se describe; de noche las de leyenda, de día y con gente alrededor las de carnaval.', ''); for (const f of figSin) L.push(`- **${f.id}.png** · ${esc(f.name)} (${f.kind}; ${esc(f.where)}). ${esc(f.who)} Viste: ${esc(f.wear)}`); L.push(''); }
// 5) tradiciones
L.push(`## 5. Tradiciones, bailes y ferias (${tradSin.length})`, '');
if (!tradSin.length) L.push('Las cuatro tradiciones con misión propia ya tienen su ilustración. No falta ninguna.', '');
else { L.push('**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' ' + EXPLORADOR.charAt(0).toUpperCase() + EXPLORADOR.slice(1) + ', mirando la tradición desde un lado, nunca en el centro.', ''); for (const t of tradSin) L.push(`- **${(t.ilus || (t.town + '-' + t.type))}.png** · «${esc(t.title)}» (${t.type === 'dance' ? 'baile' : t.type === 'feria' ? 'feria' : 'tradición'}; ${tn[t.town] || t.town}). ${esc(t.text)}`); L.push(''); }
// 6) cimas
L.push(`## 6. Cimas de las misiones de montaña (${cimSin.length})`, '');
if (!cimSin.length) L.push(`Las ${inv.cimas.length} cimas con misión ya tienen su escena. No falta ninguna.`, '');
else { L.push('**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' ' + EXPLORADOR.charAt(0).toUpperCase() + EXPLORADOR.slice(1) + ' subiendo por la ladera, abajo y pequeño; la forma real de la montaña reconocible; el buzón de cumbre arriba.', ''); for (const c of cimSin) L.push(`- **${c.id}.png** · ${esc(c.name)}${c.altName ? ' (' + esc(c.altName) + ')' : ''}, ${c.altitude} m, ${esc(c.zone)}; ${esc(c.tag)}. ${esc(c.intro)}`); L.push(''); }
// 7) fauna
L.push(`## 7. Fauna (${fauSin.length})`, '');
if (!fauSin.length) L.push(`Los ${inv.fauna.length} animales del cuaderno ya tienen tu ilustración. No falta ninguno.`, '');
else { L.push('**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' El animal entero, de perfil tres cuartos, en su hábitat de Navarra, con la anatomía real de la especie.', ''); for (const f of fauSin) L.push(`- **${f.id}.png** · ${esc(f.name)} (${esc(f.eu)}; ${esc(f.sci)}; ${esc(f.kind)}).`); L.push(''); }
// 8) láminas
L.push(`## 8. Láminas que faltan (${lamSin.length})`, '');
if (!lamSin.length) L.push('Todas las láminas definidas en el juego tienen imagen.', '');
else { L.push('**Estilo (pégalo una vez):** ' + ESTILO_LAMINA + ' ' + EXPLORADOR.charAt(0).toUpperCase() + EXPLORADOR.slice(1) + ', abajo y con los pies dentro del encuadre.', ''); for (const l of lamSin) L.push(`- **${l.id}.png** · «${esc(l.title)}» (${l.kind}; ${sitio(l.town, l.comarca)}).`); L.push(''); }
L.push(`### 8b. Láminas para regenerar con más calidad, prioridad 1 (${lamPrio.length})`, '', 'Estas existen a 1280 × 720 y se ven blandas en pantallas grandes. No es otra idea: es la misma escena con más resolución y detalle. Si la herramienta acepta una imagen de referencia, adjunta la actual (te la mando en el paquete de portadas) y pide: «Regenera la imagen adjunta con la misma composición, los mismos personajes, colores, luz y estilo, en 16:9 al mayor tamaño posible y con mucho más detalle y nitidez. Sin texto ni marcas».', '');
for (const l of lamPrio) L.push(`- **${l.id}.png** · «${esc(l.title)}» (${l.kind}; ${sitio(l.town, l.comarca)})`);
L.push('');
// 9) iconos
L.push(`## 9. Iconos que no son tuyos (${icoRender.length + ico3D.length})`, '', '**Estilo (pégalo una vez):** ' + ESTILO_ICONO + ' Misma familia que tus 182 iconos: mismo grosor de formas, misma luz, misma paleta.', '');
if (icoRender.length) { L.push(`Renders del propio juego que conviene sustituir (${icoRender.length}):`, ''); for (const ns of icoRender) L.push(`- **${ns[0].replace(/^_/, '')}.png** · icono de «${ns.map(n => n.replace(/^_/, '')).join('» / «')}».`); L.push(''); }
if (ico3D.length) { L.push(`Modelos 3D sencillos que el juego dibuja al vuelo (${ico3D.length}):`, ''); for (const n of ico3D) L.push(`- **${n}.png** · icono de «${n}».`); L.push(''); }
if (ico2D.length) L.push(`Los ${ico2D.length} símbolos planos de la interfaz (flechas, aspas, marcas: ${ico2D.slice(0, 12).join(', ')}…) se quedan como trazo de interfaz: no hace falta ilustrarlos.`, '');
// 10) instrumentos
L.push(`## 10. Instrumentos sin original grande (${instSin.length})`, '');
if (!instSin.length) L.push('Los ocho instrumentos tienen su imagen a 1254. No falta ninguno.', '');
else { L.push('**Estilo:** el mismo que los otros siete instrumentos que me mandaste (icono 3D de la familia, fondo transparente, 1254 × 1254).', ''); for (const i of instSin) L.push(`- **${i.icon}.png** · ${esc(i.name)} (${esc(i.eu)}). ${esc(i.what)}`); L.push(''); }
// 11) correcciones
if (corregir.length) {
  L.push(`## 11. Escudos que tú mismo señalaste para corregir (${corregir.length})`, '', 'Están en el juego tal como los mandaste. Si los rehaces, mismo estilo del apartado 1 y el mismo nombre de archivo.', '');
  for (const c of corregir) L.push(`- **${c.id}.png** (${c.tipo}; ${esc(c.nombre)}) · ${esc(c.nota)}${c.blason ? ' Blasón: ' + esc(c.blason) : ''}`);
  L.push('');
}
// 12) flora, opcional
L.push(`## 12. Opcional: flora en tu estilo (${inv.flora.length})`, '', 'Las plantas llevan hoy fotos reales con licencia libre, que funcionan bien para identificarlas. Solo si quieres unificar el estilo con el resto del juego: una ilustración por especie, la planta entera y una hoja o flor de cerca, fondo claro liso, 1536 × 1536. Nombres de archivo: el id de cada una.', '');
L.push(inv.flora.map(f => `${f.id} (${esc(f.name)}${f.sci ? ', ' + esc(f.sci) : ''})`).join(' · '), '');
if (inv.pendientes.length) L.push(`## Nota: escudos municipales por comprobar (${inv.pendientes.length})`, '', 'Estos no se dibujan porque no hemos podido confirmar el blasón en una fuente fiable. No los generes hasta tener la fuente:', '', ...inv.pendientes.map(x => `- ${esc(x.name)}${x.note ? ': ' + esc(x.note) : ''}`), '');
writeFileSync(out, L.join('\n'));
console.log(JSON.stringify({ salida: out, total, casas: casasSin.length, oficios: ofiSin.length, municipales: munSin.length, personajes: persSin.length, leyendas: leySin.length, figuras: figSin.length, tradiciones: tradSin.length, cimas: cimSin.length, fauna: fauSin.length, laminas: lamSin.length, laminasPrio1: lamPrio.length, iconosRender: icoRender.length, iconos3D: ico3D.length, iconos2D: ico2D.length, instrumentos: instSin.length, corregir: corregir.length }));
