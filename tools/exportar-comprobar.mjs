// Comprueba cada .glb exportado con el validador oficial de Khronos (gltf-validator, el de los que hacen el formato glTF):
// si un archivo tiene errores, Unity (glTFast), Godot o Blender pueden no abrirlo bien. Escribe exportar/comprobacion.json
// con los errores y avisos de cada uno, y dice cuántos están bien. Uso:  node tools/exportar-comprobar.mjs [carpeta]
import fs from 'node:fs';
import path from 'node:path';
import validator from 'gltf-validator';
const raiz = process.argv[2] || 'exportar';
const anda = (d, L = []) => { if (!fs.existsSync(d)) return L; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) anda(p, L); else if (/\.glb$/i.test(e.name)) L.push(p); } return L; };
const L = anda(raiz), res = [];
for (const f of L) {
  try {
    const r = await validator.validateBytes(new Uint8Array(fs.readFileSync(f)), { maxIssues: 50, writeTimestamp: false, ignoredIssues: ['UNUSED_OBJECT'] });
    const n = r.issues;
    res.push({ archivo: path.relative(raiz, f), mb: +(fs.statSync(f).size / 1048576).toFixed(1), errores: n.numErrors, avisos: n.numWarnings,
      problemas: n.messages.filter(m => m.severity <= 1).slice(0, 8).map(m => `${m.severity ? 'aviso' : 'error'} ${m.code}: ${m.message.slice(0, 120)}`) });
  } catch (e) { res.push({ archivo: path.relative(raiz, f), errores: 1, problemas: [String(e.message || e).slice(0, 160)] }); }
}
const mal = res.filter(r => r.errores);
fs.writeFileSync(path.join(raiz, 'comprobacion.json'), JSON.stringify({ comprobado: new Date().toISOString().slice(0, 10), total: res.length, conErrores: mal.length, archivos: res }, null, 1));
console.log(`${res.length - mal.length} de ${res.length} modelos sin errores${mal.length ? '; con errores: ' + mal.map(r => `${r.archivo} (${r.problemas[0]})`).slice(0, 6).join(' · ') : ''}`);
