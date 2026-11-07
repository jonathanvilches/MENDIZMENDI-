// Para repintar la costura de una textura con hileras (tejas, pizarras, adoquines, tablas): la textura recortada (el mejor
// recorte de textura-enlosable.cjs) a 1024, desplazada media textura para que sus bordes, que no casan, queden en una cruz
// en el centro, y la máscara de esa cruz (blanco: lo que se repinta). Higgsfield repinta solo la cruz (Nano Banana con
// máscara) y los bordes de la imagen resultante, que eran el centro de la original, empalman solos.
// uso, desde la raíz: node tools/textura-cruz.cjs <entrada.png> <recorte WxH+X+Y> <desplazada.png> <mascara.png> [ancho de la cruz=0.12]
// Y, con la repintada de vuelta, la junta: de la repintada solo la cruz (con su color igualado al de alrededor y un fundido
// suave en sus orillas) y todo lo demás de la desplazada, tal cual, porque el modelo a veces retoca también lo de fuera.
// uso: node tools/textura-cruz.cjs --junta <desplazada.png> <repintada.png> <salida.webp> [ancho de la cruz=0.12] [calidad=86]
const s = require(process.cwd() + '/node_modules/sharp');

async function cruz([inp, rec, outImg, outMask, anA = '0.12']) {
  const [, w, h, x, y] = rec.match(/(\d+)x(\d+)\+(\d+)\+(\d+)/).map(Number), S = 1024, an = Math.round(S * +anA);
  const base = await s(inp).removeAlpha().extract({ left: x, top: y, width: w, height: h }).resize(S, S, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const H = S / 2;
  // (las cuatro cuartas cambiadas de sitio: lo de las esquinas, al centro)
  const q = (l, t) => s(base).extract({ left: l, top: t, width: H, height: H }).png().toBuffer();
  await s({ create: { width: S, height: S, channels: 3, background: '#000' } }).composite([
    { input: await q(H, H), left: 0, top: 0 }, { input: await q(0, H), left: H, top: 0 },
    { input: await q(H, 0), left: 0, top: H }, { input: await q(0, 0), left: H, top: H }]).png().toFile(outImg);
  const cruz = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#000"/><rect x="${H - an / 2}" y="0" width="${an}" height="${S}" fill="#fff"/><rect x="0" y="${H - an / 2}" width="${S}" height="${an}" fill="#fff"/></svg>`);
  await s(cruz).png().toFile(outMask);
  console.log('hecho', outImg, outMask);
}

async function junta([desp, rep, outp, anA = '0.12', qA = '86']) {
  const S = 1024, an = S * +anA, H = S / 2;
  const raw = (f) => s(f).removeAlpha().resize(S, S, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  const a = await raw(desp), b = await raw(rep);
  // (peso de la repintada: 1 en el centro de la cruz, 0 fuera, con un fundido en el 35 % de cada orilla)
  const pe = (d) => { const t = Math.min(1, Math.max(0, (an / 2 - Math.abs(d)) / (an * 0.35))); return t * t * (3 - 2 * t); };
  const peso = (x, y) => Math.max(pe(x + 0.5 - H), pe(y + 0.5 - H));
  // (el color: media y contraste de la repintada igualados a los de la desplazada en un anillo junto a la cruz)
  const ma = [0, 0, 0], mb = [0, 0, 0], va = [0, 0, 0], vb = [0, 0, 0]; let n = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = Math.abs(x + 0.5 - H), dy = Math.abs(y + 0.5 - H), dm = Math.min(dx, dy);
    if (dm < an / 2 || dm > an * 1.5) continue;
    const i = (y * S + x) * 3; n++;
    for (let c = 0; c < 3; c++) { ma[c] += a[i + c]; mb[c] += b[i + c]; va[c] += a[i + c] ** 2; vb[c] += b[i + c] ** 2; }
  }
  const k = [0, 1, 2].map(c => { const m1 = ma[c] / n, m2 = mb[c] / n, s1 = Math.sqrt(va[c] / n - m1 * m1), s2 = Math.sqrt(vb[c] / n - m2 * m2) || 1; return [m1, m2, s1 / s2]; });
  const out = Buffer.alloc(S * S * 3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 3, w = peso(x, y);
    for (let c = 0; c < 3; c++) {
      const [m1, m2, f] = k[c], v = m1 + (b[i + c] - m2) * f;
      out[i + c] = Math.max(0, Math.min(255, Math.round(a[i + c] * (1 - w) + v * w)));
    }
  }
  await s(out, { raw: { width: S, height: S, channels: 3 } }).resize(512, 512, { kernel: 'lanczos3' }).webp({ quality: +qA, effort: 6 }).toFile(outp);
  console.log('junta', outp, 'color', k.map(([m1, m2, f]) => `${(m1 - m2).toFixed(1)}/${f.toFixed(2)}`).join(' '));
}

const args = process.argv.slice(2);
(args[0] === '--junta' ? junta(args.slice(1)) : cruz(args)).catch(e => { console.error(e); process.exit(1); });
