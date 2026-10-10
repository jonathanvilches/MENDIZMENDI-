import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Dos compilaciones:
//  · normal (npx vite build): un solo archivo con todo dentro (dist/index.html → MENDIMENDIZ-jugar.html), para ordenador
//  · web (WEB=1 npx vite build): la que se publica en docs/ para jugar desde el navegador, sobre todo en el móvil. La
//    página es pequeña y cada modelo, textura o sonido es un archivo aparte que solo se descarga cuando hace falta y
//    queda guardado (caché del navegador y de la app instalada): menos memoria, arranque rápido y juego sin conexión.
const WEB = !!process.env.WEB;
// las fotos de la flora y las láminas: grandes en la web y en el servidor de pruebas; más ligeras en el archivo único
const FOTOS = WEB || !process.argv.includes('build') ? 'web' : 'mini';
// la redirección a docs/ de index.html solo sirve sin compilar (GitHub Pages desde la raíz): fuera al compilar
const sinRedir = { name: 'sin-redireccion', transformIndexHtml: (html) => html.replace(/<!-- en GitHub Pages[\s\S]*?<script id="ir-a-docs">[\s\S]*?<\/script>\n?/, '') };
// en la web: la app se puede instalar (añadir a la pantalla de inicio) y abre a pantalla completa
const app = {
  name: 'app-instalable',
  transformIndexHtml: (html) => html.replace('</head>', `<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mendimendiz">
</head>`),
  // el service worker, con el nombre de su caché sacado de los archivos de esta versión y la lista de esos archivos
  generateBundle(_, bundle) {
    const v = createHash('sha1').update(Object.keys(bundle).sort().join()).digest('hex').slice(0, 10);
    this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });   // GitHub Pages sirve los archivos tal cual
    const files = Object.keys(bundle).filter(f => f.startsWith('assets/')).map(f => f.slice(7));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync('src/web/sw.js', 'utf8').replace('__VERSION__', v).replace('__FILES__', JSON.stringify(files)) });
  },
};

export default defineConfig({
  base: './',
  resolve: { alias: { '@flora-fotos': fileURLToPath(new URL(`./src/assets/flora/${FOTOS}`, import.meta.url)), '@laminas': fileURLToPath(new URL(`./src/assets/laminas/${FOTOS}`, import.meta.url)) } },
  plugins: WEB ? [sinRedir, app] : [sinRedir, viteSingleFile()],
  define: { __WEB__: JSON.stringify(WEB) },
  build: WEB
    ? { target: 'es2020', outDir: 'docs', emptyOutDir: true, assetsInlineLimit: 2048, chunkSizeWarningLimit: 5000, copyPublicDir: true,
      // three.js en su propio archivo: no cambia entre versiones del juego, así que el móvil lo guarda y no lo vuelve a
      // descargar en cada actualización (solo baja el código del juego, que es lo que cambia)
      rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] } } } }
    : { target: 'es2020', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000, copyPublicDir: false },
});
