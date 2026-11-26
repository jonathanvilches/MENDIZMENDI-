// Saca los fotogramas de un WebP animado en RGBA crudo (uno detrás de otro) y dice medidas y retardos.
const sharp = require('sharp'), fs = require('fs');
(async () => { const [, , IN, OUT] = process.argv;
  const m = await sharp(IN, { animated: true }).metadata();
  const { data, info } = await sharp(IN, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  fs.writeFileSync(OUT, data);
  console.log(JSON.stringify({ w: info.width, h: m.pageHeight, n: m.pages, delay: m.delay, loop: m.loop }));
})();
