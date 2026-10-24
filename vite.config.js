import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { splashLinks } from './src/web/splash.js';

// Dos compilaciones:
//  · normal (npx vite build): un solo archivo con todo dentro (dist/index.html → HERRIZHERRI-jugar.html), para ordenador
//  · web (WEB=1 npx vite build): la que se publica en docs/ para jugar desde el navegador, sobre todo en el móvil. La
//    página es pequeña y cada modelo, textura o sonido es un archivo aparte que solo se descarga cuando hace falta y
//    queda guardado (caché del navegador y de la app instalada): menos memoria, arranque rápido y juego sin conexión.
// ARTEFACTO=1 npx vite build: la web, pero para publicarla como artefacto de Claude (dist-artefacto/, tools/artefacto.mjs).
// Un artefacto admite como mucho 511 archivos y la web tiene casi 1.800 (cada imagen en dos o tres tamaños): aquí cada
// imagen grande va una sola vez (las láminas, a 2560; leyendas y cimas, a 2560) y las pequeñas y repetidas (iconos,
// escudos, sellos, la copia de 640 de cada lámina…) van dentro del código, en bloques aparte de menos de 16 MB
const AF = !!process.env.ARTEFACTO;
const WEB = !!process.env.WEB || AF;
// las fotos de la flora, las láminas y los animales de la fauna: grandes en la web y en el servidor de pruebas; más ligeras
// en el archivo único (los animales: 1280 px en la web y 512 en el archivo único; las miniaturas, de 256 en los dos)
// (los escudos: los de 512 en todas partes y, en la web, los de 1024 para la ficha; las casas y los oficios, de 512 en la web, de 192 en el ligero y de 96 en el archivo único,
// que no tiene sitio para más (con conexión suben a los de la web); los emblemas de los equipos, de 512 en la web y de 256 en el archivo único)
// (las leyendas: en la web, las de 768 para el libro y las de 1536 para el relato; en el archivo único, solo las de 640)
// (las cimas: en la web, las de 1024 para las tarjetas y las de 1536 para el buzón de cumbre; en el archivo único, solo las
// de 320, porque las grandes no caben en sus 30 MB)
// (los personajes de Navarra: en la web, los de 1536; en el archivo único, los de 320)
// (las tradiciones: en la web, las de 1536; en el archivo único, las de 320)
// (los iconos 3D: en la web, los de 256 px de src/assets/icons3d/256 (y los de 512 y 1024 para cuando se ven grandes); en el
// archivo único, los de 128 de icons3d/128. Los escudos del armorial:
// en la web los de 512 y 1024; en el archivo único los de 256 (la serie de octubre de 2026 a 512 pesa 2,7 MB y no cabe), que
// con conexión suben a 512 o 1024 por src/web/hd.js)
// (los pelotaris del autor: en la web, los de 512 en azul y en rojo; en el archivo único, los de 256 en rojo y la
// camiseta azul suelta, que se pone encima; en la web, además, los de 1024 para la pantalla VS; los sellos de comarca: 512
// en la web y 176 en el archivo único)
// (los jugadores de fútbol del autor: solo en la web, a 1024; en el archivo único, las camisetas dibujadas)
// (el retrato grande de los personajes para el perfil, de 512 × 768: solo en la web, en src/assets/meshy/portraits/web)
// (MINI=1 con el servidor de pruebas: carga lo mismo que el archivo único, para probarlo)
const FOTOS = WEB || (!process.argv.includes('build') && !process.env.MINI) ? 'web' : 'mini';
// en el archivo único (el que se abre en el móvil con Sitecase), los modelos 3D van comprimidos con gzip (casi un
// tercio menos) y los personajes de Meshy con la textura a 1024 px (tools/meshy-textura.mjs); src/util/glb.js los
// descomprime al cargarlos. La web y el servidor de pruebas siguen con los modelos tal cual y la textura de 2048 px
const MINI = FOTOS === 'mini';
// LIGERO=1 npx vite build: archivo único aún más pequeño (unos 6 MB menos) con los personajes de Meshy en su versión
// ligera (src/assets/meshy/lod: un tercio de triángulos y textura de 512 px), para visores que no abren el normal
const MESHY_FULL = MINI ? (process.env.LIGERO ? './src/assets/meshy/lod' : './src/assets/meshy-1024') : './src/assets/meshy';
// (las chicas: lo que cambia de cada modelo, a la misma resolución que el modelo de esa versión: src/actors/chicas.js)
const CHICAS = MINI ? (process.env.LIGERO ? './src/assets/chicas/lod' : './src/assets/chicas/1024') : './src/assets/chicas/web';
// (y las láminas a 1024 en vez de 640, tools/laminas-movil.mjs: en el móvil tumbado, sin conexión, la portada a todo el ancho
// se veía borrosa; con los personajes sencillos caben, y en el archivo único completo no)
const LAMINAS = MINI && process.env.LIGERO ? 'movil' : FOTOS;
// (el gzip lo hace zopfli, @gfx/zopfli: el mismo formato, pero alrededor de un 1 % más pequeño, y en el archivo único cada
// KB cuenta. Tarda, así que cada resultado se guarda por el hash de lo comprimido en node_modules/.cache/zopfli y las
// compilaciones siguientes lo reutilizan; si zopfli faltara, el gzip normal al máximo)
const ZCACHE = './node_modules/.cache/zopfli';
async function gzipMejor(buf) {
  const f = `${ZCACHE}/${createHash('sha1').update(buf).digest('hex')}.gz`;
  if (existsSync(f)) return readFileSync(f);
  let out;
  try { const { gzipAsync } = await import('@gfx/zopfli'); out = Buffer.from(await gzipAsync(buf, { numiterations: 15 })); } catch (e) { out = gzipSync(buf, { level: 9 }); }
  mkdirSync(ZCACHE, { recursive: true }); writeFileSync(f, out); return out;
}
// (también los parches de las chicas: src/util/glb.js bytesDe los descomprime igual)
const glbGzip = { name: 'glb-gzip', enforce: 'pre', async load(id) {
  if (!/\.(glb|parche)\?url$/.test(id)) return;
  return `export default ${JSON.stringify('data:application/gzip;base64,' + (await gzipMejor(readFileSync(id.replace(/\?url$/, '')))).toString('base64'))}`;
} };
// En el archivo único, además, el código del juego va comprimido con gzip (un tercio de lo que ocupa: deja sitio dentro
// de los 30 MB de Sitecase). Solo el código: las imágenes, sonidos y modelos que lleva dentro ya van comprimidos y en
// base64 no ganarían nada, así que se sacan aparte (cada «data:…» del código pasa a ser __hzD[n], y sus textos van en
// un bloque de texto). Al abrirlo, un cargador pequeño lo descomprime con el fflate de three.js (el mismo que abre los
// modelos 3D del archivo único) y lo ejecuta como el módulo que era
const jsGzip = { name: 'js-gzip', enforce: 'post', async writeBundle(out) {
  const f = join(out.dir, 'index.html'); let html = readFileSync(f, 'utf8');
  const re = /<script type="module" crossorigin>([\s\S]*?)<\/script>\n?/, m = html.match(re); if (!m) return;
  // (los «data:…» se buscan en el árbol del código: solo los textos sueltos, no los que van dentro de otro texto o de
  // una plantilla con más cosas, ni los que hacen de nombre de una propiedad)
  const src = m[1], datos = [], cortes = [], { parseAst } = await import('rolldown/parseAst');
  const walk = (n, padre) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) walk(x, padre); return; }
    // (el minificador los escribe entre comillas o como plantilla sin nada dentro: `data:…`)
    const v = n.type === 'Literal' ? n.value : n.type === 'TemplateLiteral' && !n.expressions.length && padre?.type !== 'TaggedTemplateExpression' ? n.quasis[0]?.value.cooked : null;
    if (typeof v === 'string' && /^data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+$/.test(v) && !(padre?.type === 'Property' && padre.key === n && !padre.computed) && !/^(Import|Export)/.test(padre?.type || '')) { cortes.push({ start: n.start, end: n.end, value: v }); return; }
    for (const k in n) if (k !== 'type' && n[k] && typeof n[k] === 'object') walk(n[k], n);
  };
  walk(parseAst(src), null);
  let code = '', at = 0;
  for (const n of cortes.sort((a, b) => a.start - b.start)) { code += src.slice(at, n.start) + `__hzD[${datos.length}]`; datos.push(n.value); at = n.end; }
  code += src.slice(at);
  const { rolldown } = await import('rolldown');
  const b = await rolldown({ input: 'cargador', logLevel: 'silent', plugins: [{ name: 'cargador', resolveId: (id) => (id === 'cargador' ? id : null), load: (id) => (id !== 'cargador' ? null : `
    import { gunzipSync } from 'three/examples/jsm/libs/fflate.module.js';
    const el = (id) => document.getElementById(id), z = atob(el('hz-codigo').textContent), u = new Uint8Array(z.length);
    for (let i = 0; i < z.length; i++) u[i] = z.charCodeAt(i);
    window.__hzD = el('hz-datos').textContent.split('\\n');
    const s = document.createElement('script'); s.type = 'module'; s.textContent = new TextDecoder().decode(gunzipSync(u));
    el('hz-codigo').remove(); el('hz-datos').remove(); document.body.appendChild(s);`) }] });
  const cargador = (await b.generate({ format: 'iife', minify: true })).output[0].code.trim();
  const gz = (await gzipMejor(Buffer.from(code))).toString('base64');
  html = html.replace(re, () => '');
  const fin = html.lastIndexOf('</body>');
  html = html.slice(0, fin) + `<script type="text/plain" id="hz-datos">${datos.join('\n')}</script>\n<script type="text/plain" id="hz-codigo">${gz}</script>\n<script id="hz-cargador">${cargador}</script>\n` + html.slice(fin);
  writeFileSync(f, html);
  console.log(`código comprimido: ${(src.length / 1e6).toFixed(2)} MB → ${((gz.length + datos.join('\n').length) / 1e6).toFixed(2)} MB (${datos.length} datos aparte, cargador de ${cargador.length} bytes)`);
} };
// la redirección a docs/ de index.html solo sirve sin compilar (GitHub Pages desde la raíz): fuera al compilar
const sinRedir = { name: 'sin-redireccion', transformIndexHtml: (html) => html.replace(/<!-- en GitHub Pages[\s\S]*?<script id="ir-a-docs">[\s\S]*?<\/script>\n?/, '') };
// en la web: la app se puede instalar (añadir a la pantalla de inicio) y abre a pantalla completa, con su icono y, en el
// iPhone y el iPad, su pantalla de arranque (public/splash, tools/app-iconos.mjs)
const app = {
  name: 'app-instalable',
  transformIndexHtml: (html) => html.replace('</head>', `<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./icon-180.png">
${splashLinks()}
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Herrizherri">
</head>`),
  // el service worker, con el nombre de su caché sacado de los archivos de esta versión y la lista de esos archivos
  generateBundle(_, bundle) {
    const v = createHash('sha1').update(Object.keys(bundle).sort().join()).digest('hex').slice(0, 10);
    this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });   // GitHub Pages sirve los archivos tal cual
    const files = Object.keys(bundle).filter(f => f.startsWith('assets/')).map(f => f.slice(7));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync('src/web/sw.js', 'utf8').replace('__VERSION__', v).replace('__FILES__', JSON.stringify(files)) });
    // (y la lista con el tamaño de cada uno, para «Descargar el juego entero»: src/web/todo.js)
    const tam = (b) => (b.type === 'chunk' ? Buffer.byteLength(b.code) : typeof b.source === 'string' ? Buffer.byteLength(b.source) : b.source.length);
    this.emitFile({ type: 'asset', fileName: 'todo.json', source: JSON.stringify({ files, bytes: files.map(f => tam(bundle['assets/' + f])) }) });
    // la lista de las imágenes grandes de esta versión, para el archivo único (src/web/hd.js): «grupo/id» → sus tamaños
    // [ancho, archivo en assets/], del más pequeño al más grande, para que elija el justo según lo que ocupe en pantalla
    const HD = [[/laminas\/web\/([^/]+)\.webp$/, 'laminas', 1280], [/laminas\/grande\/([^/]+)\.webp$/, 'laminas', 2560], [/figuras\/web\/([^/]+)\.webp$/, 'figuras', 768], [/figuras\/ilus\/web\/([^/]+)\.webp$/, 'figuras-ilus', 1280], [/leyendas\/2560\/([^/]+)\.webp$/, 'leyendas', 2560], [/cimas\/2560\/([^/]+)\.webp$/, 'cimas', 2560], [/personajes\/2560\/([^/]+)\.webp$/, 'personajes', 2560], [/tradiciones\/2560\/([^/]+)\.webp$/, 'tradiciones', 2560], [/leyendas\/768\/([^/]+)\.webp$/, 'leyendas', 768], [/leyendas\/1536\/([^/]+)\.webp$/, 'leyendas', 1536],
      [/cimas\/1024\/([^/]+)\.webp$/, 'cimas', 1024], [/cimas\/1536\/([^/]+)\.webp$/, 'cimas', 1536], [/personajes\/1536\/([^/]+)\.webp$/, 'personajes', 1536],
      [/tradiciones\/1536\/([^/]+)\.webp$/, 'tradiciones', 1536], [/fauna\/512\/([^/]+)\.webp$/, 'fauna', 512], [/fauna\/1280\/([^/]+)\.webp$/, 'fauna', 1280],
      [/flora\/web\/([^/]+)\.webp$/, 'flora', 720], [/icons3d\/256\/([^/]+)\.webp$/, 'iconos', 256], [/icons3d\/512\/([^/]+)\.webp$/, 'iconos', 512], [/icons3d\/1024\/([^/]+)\.webp$/, 'iconos', 1024], [/escudos\/casas\/1024\/([^/]+)\.webp$/, 'escudos-casas', 1024], [/escudos\/oficios\/1024\/([^/]+)\.webp$/, 'escudos-oficios', 1024], [/heraldica\/512\/([^/]+)\.webp$/, 'escudos', 512], [/heraldica\/1024\/([^/]+)\.webp$/, 'escudos', 1024], [/escudos\/casas\/512\/([^/]+)\.webp$/, 'escudos-casas', 512], [/escudos\/oficios\/512\/([^/]+)\.webp$/, 'escudos-oficios', 512],
      [/equipos\/512\/([^/]+)\.webp$/, 'emblemas', 512], [/sellos\/web\/([^/]+)\.webp$/, 'sellos', 512],
      [/pelotaris\/web\/rojo\/([^/]+)\.webp$/, 'pelotari-rojo', 512], [/pelotaris\/web\/vs\/rojo\/([^/]+)\.webp$/, 'pelotari-rojo', 1024],
      [/pelotaris\/web\/azul\/([^/]+)\.webp$/, 'pelotari-azul', 512], [/pelotaris\/web\/vs\/azul\/([^/]+)\.webp$/, 'pelotari-azul', 1024],
      [/portraits\/web\/([^/]+)_hero\.webp$/, 'retratos', 512, (id) => id + '_full']];
    const hd = {};
    for (const [f, a] of Object.entries(bundle)) for (const o of a.originalFileNames || []) for (const [re, k, w, as] of HD) {
      const m = o.match(re); if (!m || (k === 'laminas' && m[1].endsWith('-s'))) continue;
      // (el retrato grande de la web, «hero», ocupa el sitio del de cuerpo entero del archivo único)
      const e = hd[k + '/' + (as ? as(m[1]) : m[1])] ||= []; if (!e.some(x => x[1] === f)) e.push([w, f]);
    }
    for (const e of Object.values(hd)) e.sort((x, y) => x[0] - y[0]);
    this.emitFile({ type: 'asset', fileName: 'hd.json', source: JSON.stringify(hd) });
  },
};

// (las láminas del artefacto: <id>.webp es la de 2560 y <id>-s.webp la copia de 640, enlaces a las de siempre, así las
// dos búsquedas de src/ui/laminas.js dan con el mismo archivo y va una sola vez)
if (AF) {
  const D = './src/assets/laminas/artefacto';
  mkdirSync(D, { recursive: true });
  for (const f of readdirSync('./src/assets/laminas/grande')) if (f.endsWith('.webp') && !existsSync(`${D}/${f}`)) symlinkSync(`../grande/${f}`, `${D}/${f}`);
  for (const f of readdirSync('./src/assets/laminas/web')) if (f.endsWith('-s.webp') && !existsSync(`${D}/${f}`)) symlinkSync(`../web/${f}`, `${D}/${f}`);
  // (los personajes, las tradiciones y las leyendas en grande: la de 2560 de cada una y, si no la hay, la de 1536; de las
  // leyendas, solo las de 2560: las demás se ven en grande con la de 768, que va dentro del código, y así el artefacto no
  // pasa de sus 511 archivos)
  for (const t of ['personajes', 'tradiciones', 'leyendas']) {
    const A = `./src/assets/${t}/artefacto`; mkdirSync(A, { recursive: true });
    for (const g of t === 'leyendas' ? ['2560'] : ['2560', '1536']) for (const f of readdirSync(`./src/assets/${t}/${g}`)) if (f.endsWith('.webp') && !existsSync(`${A}/${f}`)) symlinkSync(`../${g}/${f}`, `${A}/${f}`);
  }
}
const afDir = (d) => fileURLToPath(new URL(`./src/assets/${d}`, import.meta.url));
const afAlias = (a) => !AF ? a : { ...a,
  '@laminas': afDir('laminas/artefacto'), '@laminas-big': afDir('laminas/artefacto'),
  '@leyendas-big': afDir('leyendas/artefacto'), '@cimas-big': afDir('cimas/2560'),
  '@escudos-big': afDir('escudos/heraldica/512'), '@escudos-casas-big': afDir('escudos/casas/none'), '@escudos-oficios-big': afDir('escudos/oficios/none'),
  'three/examples/jsm/libs/meshopt_decoder.module.js': fileURLToPath(new URL('./src/web/meshopt-sin.js', import.meta.url)),
  '@icons3d-big': afDir('icons3d/none'), '@personajes': afDir('personajes/artefacto'), '@tradiciones': afDir('tradiciones/artefacto') };
// (lo que va dentro del código en el artefacto: las imágenes pequeñas que se repiten mucho, y las fuentes)
const AF_DENTRO = /[\\/]src[\\/]assets[\\/](icons3d[\\/]256|escudos[\\/](heraldica|equipos|casas|oficios)[\\/]512|laminas[\\/]web[\\/][^\\/]+-s\.webp|fauna[\\/]512|leyendas[\\/]768|cimas[\\/]1024|sellos[\\/]web|meshy[\\/]portraits|figuras[\\/]web|jugadores[\\/]web[\\/](busto[\\/]|duo-s[\\/]|[^\\/]+\.webp$)|pelotaris[\\/]web[\\/](azul|rojo))[\\/]?/;
const afInline = (file) => (/\.woff2$/.test(file) || AF_DENTRO.test(file) ? true : undefined);
// (cada grupo de imágenes de dentro, en su propio archivo de código: ninguno pasa de los 16 MB que admite un artefacto)
const AF_GRUPOS = [['img-laminas', /laminas[\\/]web[\\/]/], ['img-iconos', /icons3d[\\/]/],
  // (los escudos de casa, aparte y en dos: con los 192 no caben en un solo bloque)
  ['img-casas-1', /escudos[\\/]casas[\\/][^\\/]+[\\/][a-l]/], ['img-casas-2', /escudos[\\/]casas[\\/]/], ['img-escudos', /escudos[\\/]/], ['img-jugadores', /jugadores[\\/]/],
  ['img-pelotaris', /pelotaris[\\/]/], ['img-varias', /(fauna|leyendas|cimas|sellos|portraits|figuras)[\\/]/]].map(([name, test]) => ({ name, test }));
// (en el artefacto no hay app instalable ni service worker: el visor de Claude no los deja. Tampoco se cuenta con
// WebAssembly, que el descompresor meshopt necesita: los modelos y los parches de las chicas van ya descomprimidos, y
// el descompresor es src/web/meshopt-sin.js. La cuantización de los modelos se queda: three.js la lee sin ayuda)
const parcheCrudo = (buf, dec) => {
  const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset), jl = dv.getUint32(4, true);
  const cab = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + jl))); let at = 8 + jl;
  const partes = cab.tiras.map(([len, n, s, f]) => { const out = new Uint8Array(n * s); if (n) dec.decodeVertexBuffer(out, n, s, b.subarray(at, at + len), f || undefined); at += len + ((4 - len % 4) % 4); return out; });
  const j = new TextEncoder().encode(JSON.stringify({ ...cab, crudo: true, tiras: cab.tiras.map(([, n, s]) => [n * s, n, s, 0]) }));
  const pad = (n) => (4 - n % 4) % 4, total = 8 + j.length + partes.reduce((a, x) => a + x.length + pad(x.length), 0);
  const o = new Uint8Array(total), ov = new DataView(o.buffer); ov.setUint32(0, 0x32434843, true); ov.setUint32(4, j.length, true); o.set(j, 8);
  let k = 8 + j.length; for (const x of partes) { o.set(x, k); k += x.length + pad(x.length); }
  return o;
};
const artefacto = { name: 'artefacto', async generateBundle(_, bundle) {
  const { NodeIO } = await import('@gltf-transform/core'), { ALL_EXTENSIONS } = await import('@gltf-transform/extensions'), { MeshoptDecoder } = await import('meshoptimizer');
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  let n = 0, antes = 0, despues = 0; const renombres = [];
  for (const [k, a] of Object.entries(bundle)) {
    if (a.type !== 'asset' || !/\.(glb|parche)$/.test(a.fileName)) continue;
    antes += a.source.length;
    if (a.fileName.endsWith('.parche')) a.source = parcheCrudo(a.source, MeshoptDecoder);
    else {
      const doc = await io.readBinary(new Uint8Array(a.source)); let tenia = false;
      for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') { e.dispose(); tenia = true; }
      if (tenia) a.source = await io.writeBinary(doc);
    }
    // (el visor no sirve .glb ni .parche: van como texto, el gzip en base64, y src/util/glb.js lo deshace al cargarlos)
    const viejo = a.fileName, nuevo = viejo + '.txt', texto = gzipSync(Buffer.from(a.source), { level: 9 }).toString('base64');
    delete bundle[k]; this.emitFile({ type: 'asset', fileName: nuevo, source: texto });
    renombres.push([viejo.split('/').pop(), nuevo.split('/').pop()]);
    despues += texto.length; n++;
  }
  for (const c of Object.values(bundle)) if (c.type === 'chunk') for (const [v, w] of renombres) c.code = c.code.split(v).join(w);
  console.log(`artefacto: ${n} modelos y parches sin meshopt y como texto, ${(antes / 1e6).toFixed(1)} → ${(despues / 1e6).toFixed(1)} MB`);
  this.emitFile({ type: 'asset', fileName: 'artefacto.json', source: JSON.stringify(Object.fromEntries(Object.entries(bundle).map(([f, a]) => [f, a.originalFileNames || []]))) });
} };

// la página del mando del móvil (public/mando/index.html) usa el mismo saludo que el juego (src/mando/senal.js): la web lo
// publica a su lado y el servidor de pruebas lo da tal cual
const mandoSenal = { name: 'mando-senal',
  configureServer(server) { server.middlewares.use((req, res, next) => { if (!(req.url || '').split('?')[0].endsWith('/mando/senal.js')) return next(); res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache'); res.end(readFileSync('src/mando/senal.js')); }); },
  generateBundle() { if (WEB) this.emitFile({ type: 'asset', fileName: 'mando/senal.js', source: readFileSync('src/mando/senal.js', 'utf8') }); } };

export default defineConfig({
  base: './',
  resolve: { alias: afAlias({ '@jugadores': fileURLToPath(new URL(`./src/assets/jugadores/${FOTOS}`, import.meta.url)), '@pelotaris': fileURLToPath(new URL(`./src/assets/pelotaris/${FOTOS}`, import.meta.url)), '@sellos': fileURLToPath(new URL(`./src/assets/sellos/${FOTOS}`, import.meta.url)), '@retratos': fileURLToPath(new URL(`./src/assets/meshy/portraits/${FOTOS}`, import.meta.url)), '@flora-fotos': fileURLToPath(new URL(`./src/assets/flora/${FOTOS}`, import.meta.url)), '@laminas': fileURLToPath(new URL(`./src/assets/laminas/${LAMINAS}`, import.meta.url)), '@figuras': fileURLToPath(new URL(`./src/assets/figuras/${FOTOS}`, import.meta.url)), '@figuras-ilus': fileURLToPath(new URL(`./src/assets/figuras/ilus/${FOTOS}`, import.meta.url)), '@laminas-big': fileURLToPath(new URL(`./src/assets/laminas/${FOTOS === 'web' ? 'grande' : LAMINAS}`, import.meta.url)), '@fauna-big': fileURLToPath(new URL(`./src/assets/fauna/${FOTOS === 'web' ? 1280 : 512}`, import.meta.url)), '@fauna-small': fileURLToPath(new URL(`./src/assets/fauna/512`, import.meta.url)), '@escudos': fileURLToPath(new URL(`./src/assets/escudos/heraldica/${FOTOS === 'web' ? 512 : 256}`, import.meta.url)), '@escudos-big': fileURLToPath(new URL(`./src/assets/escudos/heraldica/${FOTOS === 'web' ? 1024 : 256}`, import.meta.url)), '@emblemas': fileURLToPath(new URL(`./src/assets/escudos/equipos/${FOTOS === 'web' ? 512 : 256}`, import.meta.url)), '@escudos-casas': fileURLToPath(new URL(`./src/assets/escudos/casas/${FOTOS === 'web' ? 512 : process.env.LIGERO ? 192 : 96}`, import.meta.url)), '@escudos-casas-big': fileURLToPath(new URL(`./src/assets/escudos/casas/${FOTOS === 'web' ? 1024 : 'none'}`, import.meta.url)), '@escudos-oficios-big': fileURLToPath(new URL(`./src/assets/escudos/oficios/${FOTOS === 'web' ? 1024 : 'none'}`, import.meta.url)), '@escudos-oficios': fileURLToPath(new URL(`./src/assets/escudos/oficios/${FOTOS === 'web' ? 512 : process.env.LIGERO ? 192 : 96}`, import.meta.url)), '@leyendas': fileURLToPath(new URL(`./src/assets/leyendas/${FOTOS === 'web' ? 768 : 640}`, import.meta.url)), '@leyendas-hd': fileURLToPath(new URL(`./src/assets/leyendas/${FOTOS === 'web' ? 2560 : 640}`, import.meta.url)), '@leyendas-big': fileURLToPath(new URL(`./src/assets/leyendas/${FOTOS === 'web' ? 1536 : 640}`, import.meta.url)), '@cimas': fileURLToPath(new URL(`./src/assets/cimas/${FOTOS === 'web' ? 1024 : 320}`, import.meta.url)), '@cimas-hd': fileURLToPath(new URL(`./src/assets/cimas/${FOTOS === 'web' ? 2560 : 320}`, import.meta.url)), '@cimas-big': fileURLToPath(new URL(`./src/assets/cimas/${FOTOS === 'web' ? 1536 : 320}`, import.meta.url)), '@personajes': fileURLToPath(new URL(`./src/assets/personajes/${FOTOS === 'web' ? 1536 : 320}`, import.meta.url)), '@personajes-hd': fileURLToPath(new URL(`./src/assets/personajes/${FOTOS === 'web' ? 2560 : 320}`, import.meta.url)), '@tradiciones': fileURLToPath(new URL(`./src/assets/tradiciones/${FOTOS === 'web' ? 1536 : 320}`, import.meta.url)), '@tradiciones-hd': fileURLToPath(new URL(`./src/assets/tradiciones/${FOTOS === 'web' ? 2560 : 320}`, import.meta.url)), '@icons3d': fileURLToPath(new URL(`./src/assets/icons3d/${FOTOS === 'web' ? 256 : 128}`, import.meta.url)), '@icons3d-big': fileURLToPath(new URL(`./src/assets/icons3d/${FOTOS === 'web' ? '512' : 'none'}`, import.meta.url)), '@icons3d-huge': fileURLToPath(new URL(`./src/assets/icons3d/${FOTOS === 'web' ? '1024' : 'none'}`, import.meta.url)), '@meshy-full': fileURLToPath(new URL(MESHY_FULL, import.meta.url)), '@chicas': fileURLToPath(new URL(CHICAS, import.meta.url)) }) },
  plugins: AF ? [sinRedir, artefacto] : WEB ? [sinRedir, app, mandoSenal] : MINI ? [sinRedir, glbGzip, viteSingleFile(), jsGzip] : [sinRedir, mandoSenal, viteSingleFile()],
  // (__HDMAP__: en los archivos únicos, la lista de imágenes grandes de la web compilada justo antes (docs/hd.json), para no
  // tener que pedirla: src/web/hd.js)
  // (__AF__: el artefacto de claude.ai, que no se puede instalar ni hablar con el servidor del mando: allí se manda a la web)
  define: { __WEB__: JSON.stringify(WEB), __AF__: JSON.stringify(AF), __HDMAP__: !WEB && process.argv.includes('build') && existsSync('docs/hd.json') ? readFileSync('docs/hd.json', 'utf8') : 'null' },
  build: AF
    ? { target: 'es2020', outDir: 'dist-artefacto', emptyOutDir: true, assetsInlineLimit: afInline, chunkSizeWarningLimit: 20000, copyPublicDir: false,
      rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }, ...AF_GRUPOS] } } } }
    : WEB
    ? { target: 'es2020', outDir: 'docs', emptyOutDir: true, assetsInlineLimit: 2048, chunkSizeWarningLimit: 5000, copyPublicDir: true,
      // three.js en su propio archivo: no cambia entre versiones del juego, así que el móvil lo guarda y no lo vuelve a
      // descargar en cada actualización (solo baja el código del juego, que es lo que cambia)
      rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] } } } }
    : { target: 'es2020', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000, copyPublicDir: false },
});
