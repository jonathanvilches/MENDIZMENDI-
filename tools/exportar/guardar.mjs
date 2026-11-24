// (lo usan tools/exportar-pueblo.mjs y tools/exportar-mapa.mjs, desde Node: traer de la página el .glb ya hecho y guardar
// los sombreadores del juego, cada uno una vez aunque salga en muchas escenas)
import fs from 'node:fs';
import path from 'node:path';

/** Los bytes de window[nombre] (Uint8Array) de la página, a trozos de 8 MB en base64 (un .glb de pueblo pasa de 100 MB). */
export async function traeBytes(p, nombre) {
  const n = await p.evaluate((k) => window[k].length, nombre), partes = [];
  for (let i = 0; i < n; i += 8 << 20) partes.push(Buffer.from(await p.evaluate(([k, a, z]) => { let s = ''; const u = window[k].subarray(a, z);
    for (let j = 0; j < u.length; j += 0x8000) s += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000)); return btoa(s); }, [nombre, i, Math.min(n, i + (8 << 20))]), 'base64'));
  return Buffer.concat(partes);
}

/** sombreadores/<id>-<nombre>.vert y .frag, y sombreadores/indice.json: de cada uno, qué tipo es, sus valores y en qué escenas sale. */
export function guardaSombreadores(dir, lista, escena) {
  fs.mkdirSync(dir, { recursive: true });
  const fi = path.join(dir, 'indice.json'), I = fs.existsSync(fi) ? JSON.parse(fs.readFileSync(fi, 'utf8')) : {};
  for (const s of lista) {
    const base = s.id + (s.nombre ? '-' + s.nombre.replace(/[^\w-]+/g, '_').slice(0, 40) : '');
    fs.writeFileSync(path.join(dir, base + '.vert'), s.vertexShader); fs.writeFileSync(path.join(dir, base + '.frag'), s.fragmentShader);
    const e = I[s.id] ||= { archivos: [base + '.vert', base + '.frag'], nombre: s.nombre, tipo: s.tipo, base: s.base, defines: s.defines, uniformes: s.uniformes, escenas: {} };
    e.escenas[escena] = s.usos;
  }
  fs.writeFileSync(fi, JSON.stringify(I, null, 1));
  return lista.length;
}
