import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { splashLinks } from './src/web/splash.js';

// Dos compilaciones:
//  · normal (npx vite build): un solo archivo con todo dentro (dist/index.html → MENDIMENDIZ-jugar.html), para ordenador
//  · web (WEB=1 npx vite build): la que se publica en docs/ para jugar desde el navegador, sobre todo en el móvil. La
//    página es pequeña y cada modelo, textura o sonido es un archivo aparte que solo se descarga cuando hace falta y
//    queda guardado (caché del navegador y de la app instalada): menos memoria, arranque rápido y juego sin conexión.
const WEB = !!process.env.WEB;
// las fotos de la flora, las láminas y los animales de la fauna: grandes en la web y en el servidor de pruebas; más ligeras
// en el archivo único (los animales: 1280 px en la web y 512 en el archivo único; las miniaturas, de 256 en los dos)
// (los escudos: los de 512 en todas partes y, en la web, los de 1024 para la ficha; los emblemas de los equipos, de 512 en
// la web y de 256 en el archivo único)
// (las leyendas: en la web, las de 768 para el libro y las de 1536 para el relato; en el archivo único, solo las de 640)
// (las cimas: en la web, las de 1024 para las tarjetas y las de 1536 para el buzón de cumbre; en el archivo único, solo las
// de 320, porque las grandes no caben en sus 30 MB)
// (los personajes de Navarra: en la web, los de 1536; en el archivo único, los de 320)
// (las tradiciones: en la web, las de 1536; en el archivo único, las de 320)
// (los iconos 3D: en la web, los de 192 px; en el archivo único, los de 128 de src/assets/icons3d/128)
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
const glbGzip = { name: 'glb-gzip', enforce: 'pre', load(id) {
  if (!/\.glb\?url$/.test(id)) return;
  return `export default ${JSON.stringify('data:application/gzip;base64,' + gzipSync(readFileSync(id.replace(/\?url$/, '')), { level: 9 }).toString('base64'))}`;
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
  const gz = gzipSync(Buffer.from(code), { level: 9 }).toString('base64');
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
    // la lista de las imágenes grandes de esta versión, para el archivo único (src/web/hd.js): «grupo/id» → sus tamaños
    // [ancho, archivo en assets/], del más pequeño al más grande, para que elija el justo según lo que ocupe en pantalla
    const HD = [[/laminas\/web\/([^/]+)\.webp$/, 'laminas', 1280], [/laminas\/grande\/([^/]+)\.webp$/, 'laminas', 2560], [/leyendas\/2560\/([^/]+)\.webp$/, 'leyendas', 2560], [/cimas\/2560\/([^/]+)\.webp$/, 'cimas', 2560], [/personajes\/2560\/([^/]+)\.webp$/, 'personajes', 2560], [/tradiciones\/2560\/([^/]+)\.webp$/, 'tradiciones', 2560], [/leyendas\/768\/([^/]+)\.webp$/, 'leyendas', 768], [/leyendas\/1536\/([^/]+)\.webp$/, 'leyendas', 1536],
      [/cimas\/1024\/([^/]+)\.webp$/, 'cimas', 1024], [/cimas\/1536\/([^/]+)\.webp$/, 'cimas', 1536], [/personajes\/1536\/([^/]+)\.webp$/, 'personajes', 1536],
      [/tradiciones\/1536\/([^/]+)\.webp$/, 'tradiciones', 1536], [/fauna\/512\/([^/]+)\.webp$/, 'fauna', 512], [/fauna\/1280\/([^/]+)\.webp$/, 'fauna', 1280],
      [/flora\/web\/([^/]+)\.webp$/, 'flora', 720], [/icons3d\/([^/]+)\.webp$/, 'iconos', 192], [/heraldica\/1024\/([^/]+)\.webp$/, 'escudos', 1024],
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

export default defineConfig({
  base: './',
  resolve: { alias: { '@jugadores': fileURLToPath(new URL(`./src/assets/jugadores/${FOTOS}`, import.meta.url)), '@pelotaris': fileURLToPath(new URL(`./src/assets/pelotaris/${FOTOS}`, import.meta.url)), '@sellos': fileURLToPath(new URL(`./src/assets/sellos/${FOTOS}`, import.meta.url)), '@retratos': fileURLToPath(new URL(`./src/assets/meshy/portraits/${FOTOS}`, import.meta.url)), '@flora-fotos': fileURLToPath(new URL(`./src/assets/flora/${FOTOS}`, import.meta.url)), '@laminas': fileURLToPath(new URL(`./src/assets/laminas/${FOTOS}`, import.meta.url)), '@laminas-big': fileURLToPath(new URL(`./src/assets/laminas/${FOTOS === 'web' ? 'grande' : FOTOS}`, import.meta.url)), '@fauna-big': fileURLToPath(new URL(`./src/assets/fauna/${FOTOS === 'web' ? 1280 : 512}`, import.meta.url)), '@fauna-small': fileURLToPath(new URL(`./src/assets/fauna/${FOTOS === 'web' ? 512 : 256}`, import.meta.url)), '@escudos': fileURLToPath(new URL('./src/assets/escudos/heraldica/512', import.meta.url)), '@escudos-big': fileURLToPath(new URL(`./src/assets/escudos/heraldica/${FOTOS === 'web' ? 1024 : 512}`, import.meta.url)), '@emblemas': fileURLToPath(new URL(`./src/assets/escudos/equipos/${FOTOS === 'web' ? 512 : 256}`, import.meta.url)), '@leyendas': fileURLToPath(new URL(`./src/assets/leyendas/${FOTOS === 'web' ? 768 : 640}`, import.meta.url)), '@leyendas-hd': fileURLToPath(new URL(`./src/assets/leyendas/${FOTOS === 'web' ? 2560 : 640}`, import.meta.url)), '@leyendas-big': fileURLToPath(new URL(`./src/assets/leyendas/${FOTOS === 'web' ? 1536 : 640}`, import.meta.url)), '@cimas': fileURLToPath(new URL(`./src/assets/cimas/${FOTOS === 'web' ? 1024 : 320}`, import.meta.url)), '@cimas-hd': fileURLToPath(new URL(`./src/assets/cimas/${FOTOS === 'web' ? 2560 : 320}`, import.meta.url)), '@cimas-big': fileURLToPath(new URL(`./src/assets/cimas/${FOTOS === 'web' ? 1536 : 320}`, import.meta.url)), '@personajes': fileURLToPath(new URL(`./src/assets/personajes/${FOTOS === 'web' ? 1536 : 320}`, import.meta.url)), '@personajes-hd': fileURLToPath(new URL(`./src/assets/personajes/${FOTOS === 'web' ? 2560 : 320}`, import.meta.url)), '@tradiciones': fileURLToPath(new URL(`./src/assets/tradiciones/${FOTOS === 'web' ? 1536 : 320}`, import.meta.url)), '@tradiciones-hd': fileURLToPath(new URL(`./src/assets/tradiciones/${FOTOS === 'web' ? 2560 : 320}`, import.meta.url)), '@icons3d': fileURLToPath(new URL(`./src/assets/icons3d${FOTOS === 'web' ? '' : '/128'}`, import.meta.url)), '@meshy-full': fileURLToPath(new URL(MESHY_FULL, import.meta.url)), '@chicas': fileURLToPath(new URL(CHICAS, import.meta.url)) } },
  plugins: WEB ? [sinRedir, app] : MINI ? [sinRedir, glbGzip, viteSingleFile(), jsGzip] : [sinRedir, viteSingleFile()],
  define: { __WEB__: JSON.stringify(WEB) },
  build: WEB
    ? { target: 'es2020', outDir: 'docs', emptyOutDir: true, assetsInlineLimit: 2048, chunkSizeWarningLimit: 5000, copyPublicDir: true,
      // three.js en su propio archivo: no cambia entre versiones del juego, así que el móvil lo guarda y no lo vuelve a
      // descargar en cada actualización (solo baja el código del juego, que es lo que cambia)
      rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] } } } }
    : { target: 'es2020', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000, copyPublicDir: false },
});
