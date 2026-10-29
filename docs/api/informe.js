// El informe en directo del juego servido desde Vercel (src/util/informe.js): lo que llega se escribe en los registros
// del proyecto, de donde Claude lo lee. No se guarda en ningún otro sitio. (Va en public/ para que la compilación lo copie
// a docs/api, que Vercel sirve como función; en GitHub Pages es un archivo más, que no se usa.)
// (también lo manda la web de GitHub Pages, desde otro dominio: se le deja con CORS)
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const cuerpo = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  console.log('INFORME ' + cuerpo.slice(0, 20000));
  res.status(204).end();
};
