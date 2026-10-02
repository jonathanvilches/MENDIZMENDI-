import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Dos compilaciones:
//  · normal (npx vite build): un solo archivo con todo dentro (dist/index.html → MENDIMENDIZ-jugar.html), para ordenador
//  · web (WEB=1 npx vite build): la que se publica en docs/ para jugar desde el navegador, sobre todo en el móvil. La
//    página es pequeña y cada modelo, textura o sonido es un archivo aparte que solo se descarga cuando hace falta y
//    queda guardado (caché del navegador y de la app instalada): menos memoria, arranque rápido y juego sin conexión.
const WEB = !!process.env.WEB;
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
  // el service worker, con el nombre de su caché sacado de los archivos de esta versión
  generateBundle(_, bundle) {
    const v = createHash('sha1').update(Object.keys(bundle).sort().join()).digest('hex').slice(0, 10);
    this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });   // GitHub Pages sirve los archivos tal cual
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync('src/web/sw.js', 'utf8').replace('__VERSION__', v) });
  },
};

export default defineConfig({
  base: './',
  plugins: WEB ? [app] : [viteSingleFile()],
  define: { __WEB__: JSON.stringify(WEB) },
  build: WEB
    ? { target: 'es2020', outDir: 'docs', emptyOutDir: true, assetsInlineLimit: 2048, chunkSizeWarningLimit: 5000, copyPublicDir: true }
    : { target: 'es2020', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000, copyPublicDir: false },
});
