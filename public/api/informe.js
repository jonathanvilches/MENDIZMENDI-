// El informe en directo del juego servido desde Vercel (src/util/informe.js): lo que llega se escribe en los registros
// del proyecto, de donde Claude lo lee. No se guarda en ningún otro sitio. (Va en public/ para que la compilación lo copie
// a docs/api, que Vercel sirve como función; en GitHub Pages es un archivo más, que no se usa.)
// Solo lo manda quien lo ha encendido en el juego (Ajustes › Diagnóstico) y nunca lleva nombres ni partidas. Aquí, además:
// solo se acepta desde la web del juego (CORS con su dirección, no con cualquiera), solo JSON con la forma del informe (lo
// que pase de 20 000 letras se corta), y sin saltos de línea ni caracteres de control, para que nadie pueda colar líneas falsas
// en los registros.
const PERMITIDOS = /^https:\/\/(jonathanvilches\.github\.io|herrizherri(-[a-z0-9-]+)?\.vercel\.app)$/i;
const MAX = 20000;
module.exports = (req, res) => {
  const origen = String(req.headers.origin || '');
  if (PERMITIDOS.test(origen)) { res.setHeader('Access-Control-Allow-Origin', origen); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }
  // (desde otro sitio, no: el navegador ya lo frena por CORS, y lo que llega sin navegador con otro origen tampoco vale)
  if (origen && !PERMITIDOS.test(origen)) { res.status(403).end(); return; }
  let d = req.body;
  if (typeof d === 'string') { if (d.length > MAX * 10) { res.status(413).end(); return; } try { d = JSON.parse(d); } catch (e) { res.status(400).end(); return; } }
  if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.id !== 'string' || !/^[\w-]{10,60}$/.test(d.id)) { res.status(400).end(); return; }
  // (lo largo se corta, como antes: lo que el juego ya ha mandado no lo vuelve a mandar)
  console.log('INFORME ' + JSON.stringify(d).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').slice(0, MAX));
  res.status(204).end();
};
