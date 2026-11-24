// Los originales, en su máxima calidad, para otro motor: lo que el juego usa está comprimido para la web (modelos con
// texturas WebP y sin mapas de relieve, sonidos en MP3), y los archivos de partida son mejores. Este script los reúne,
// quita los repetidos, los ordena por tipo y apunta en exportar/originales/catalogo.json de qué archivo del juego es cada uno:
//   personajes/   los modelos de Meshy con su esqueleto y todas sus animaciones (GLB o FBX, texturas PNG de 2048)
//   animaciones/  cada animación de Meshy suelta (con la malla) y, juntas en un solo .glb por personaje, las de un mismo
//                 cuerpo (<personaje>-animaciones.glb: p. ej. el explorador con sus 8 movimientos y sus 3 texturas PBR)
//   modelos/      otros modelos (caballo, árboles…) y paquetes de Unity (.unitypackage)
//   sonido/       los paquetes de sonidos (Envato), descomprimidos: WAV o MP3 de partida
//   musica/       la música y las locuciones grabadas por el autor
//   imagenes/     las panorámicas y portadas de bosque (paquetes HERRIZHERRI-*.zip), descomprimidas
// De dónde: lab/ref (los originales de Meshy que no van en GitHub) y las carpetas que se le digan (p. ej. donde se guarden los
// archivos descargados de Meshy, Envato, Higgsfield y ElevenLabs). Las capturas y grabaciones de pantalla no se copian.
// Uso:  node tools/exportar-originales.mjs [carpeta…]     (destino: exportar/originales, o DESTINO=…)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const out = process.env.DESTINO || 'exportar/originales', PY = process.env.PY || 'python3';
const fuentes = [...process.argv.slice(2), 'lab/ref'].filter(d => fs.existsSync(d));   // (primero las descargas, con su nombre de origen)
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const anda = (d, L = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) anda(p, L); else if (!e.name.startsWith('.')) L.push(p); } return L; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const limpio = (n) => n.replace(/^[0-9a-f]{8}-/, '');   // (las subidas llevan delante 8 cifras propias)
// cómo es un modelo: vértices, huesos, texturas y animaciones (para emparejarlo con el del juego por su malla)
const mira = async (f) => { try { const r = (await io.read(f)).getRoot(); let v = 0; for (const m of r.listMeshes()) for (const p of m.listPrimitives()) v += p.getAttribute('POSITION')?.getCount() || 0;
  return { vertices: v, huesos: r.listSkins()[0]?.listJoints().length || 0, texturas: r.listTextures().map(t => t.getSize()?.join('×') || '?'), animaciones: r.listAnimations().map(a => a.getName()) }; } catch (e) { return { error: String(e.message || e).slice(0, 100) }; } };
// los del juego, por su número de vértices
const JUEGO = new Map();
for (const f of anda('src/assets').filter(f => /\.glb$/i.test(f) && !/meshy-1024|meshy\/lod/.test(f))) { const x = await mira(f); if (x.vertices) { if (!JUEGO.has(x.vertices)) JUEGO.set(x.vertices, []); JUEGO.get(x.vertices).push(f); } }
const clase = (n, f = '') => {
  if (/\/ancianos\//.test(f) && /\.glb$/i.test(n)) return 'personajes';
  if (/\/meshy-nuevo\//.test(f) && /\.glb$/i.test(n)) return 'animaciones';
  if (/^image\.(png|jpe?g)$|ScreenRecording|\.(mov)$/i.test(n) || /^(image|captura)/i.test(n)) return null;
  if (/^Meshy_AI_Animation_.*\.glb$/i.test(n)) return 'animaciones';
  if (/^Meshy_AI_.*\.(glb|fbx)$/i.test(n)) return 'personajes';
  if (/\.(glb|gltf|fbx|obj|blend|unitypackage)$/i.test(n)) return 'modelos';
  if (/^HERRIZHERRI-.*\.zip$/i.test(n)) return 'imagenes';
  if (/\.zip$/i.test(n)) return 'sonido';
  if (/^(Martin|Mel|Florews|dragons)/i.test(n) && /\.(mp3|wav|m4a)$/i.test(n)) return 'musica';
  if (/\.(mp3|wav|m4a|ogg)$/i.test(n)) return /freesound|sheep|cow|bird/i.test(n) ? 'sonido' : 'musica';
  return null;
};
const cat = [], vistos = new Set();
fs.mkdirSync(out, { recursive: true });
for (const f of fuentes.flatMap(d => anda(d))) {
  const n = limpio(path.basename(f)), k = clase(n, f); if (!k) continue;
  const h = sha(f); if (vistos.has(h)) continue; vistos.add(h);
  const e = { tipo: k, de: n, sha256: h.slice(0, 16), mb: +(fs.statSync(f).size / 1048576).toFixed(1) };
  if (/\.zip$/i.test(n)) {   // (los paquetes, descomprimidos en su carpeta: sonido/<paquete>/…, imagenes/<paquete>/…)
    const dir = path.join(out, k, n.replace(/-\d{4}-\d\d-\d\d-\d\d-\d\d-\d\d-utc/i, '').replace(/\.zip$/i, ''));
    fs.mkdirSync(dir, { recursive: true });
    const lista = execFileSync(PY, ['-I', '-c', `import sys, zipfile
z = zipfile.ZipFile(sys.argv[1]); n = 0
for m in z.infolist():
    if m.is_dir() or m.filename.startswith('__MACOSX') or m.filename.split('/')[-1].startswith('.'): continue
    z.extract(m, sys.argv[2]); n += 1
print(n)`, f, dir]).toString().trim();
    Object.assign(e, { carpeta: path.relative(out, dir), archivos: +lista });
  } else {
    let nom = n.replace(/(_rigged)?_\d{8}_animated_mixamo/i, '').replace(/^Meshy_AI_(Animation_)?/i, '').replace(/_withSkin/i, '');
    const dst = path.join(out, k, nom);
    if (fs.existsSync(dst)) { const ext = path.extname(nom); nom = path.basename(nom, ext) + '-' + h.slice(0, 6) + ext; }
    fs.mkdirSync(path.dirname(path.join(out, k, nom)), { recursive: true }); fs.copyFileSync(f, path.join(out, k, nom));
    e.archivo = path.relative(out, path.join(out, k, nom));
    if (/\.glb$/i.test(n)) { Object.assign(e, await mira(f)); if (e.vertices && JUEGO.has(e.vertices)) e.juego = JUEGO.get(e.vertices); }
  }
  cat.push(e);
}
// las animaciones sueltas de un mismo cuerpo, juntas en un solo modelo (el esqueleto y la malla del primero, con sus
// texturas; de los demás, solo la animación, con el nombre del archivo: Walking, Running, Talk_Passionately…)
const grupos = new Map(); for (const e of cat.filter(e => e.tipo === 'animaciones' && e.vertices)) { const k = e.vertices + '/' + e.huesos; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e); }
for (const L of grupos.values()) {
  if (L.length < 2) continue;
  const juego = L.find(e => e.juego)?.juego?.[0], nom = juego ? path.basename(juego, '.glb') : 'cuerpo-' + L[0].vertices;
  const base = await io.read(path.join(out, L[0].archivo)), R = base.getRoot(), buf = R.listBuffers()[0];
  const porNombre = new Map(R.listNodes().map(x => [x.getName(), x]));
  const clip = (e) => path.basename(e.archivo, '.glb').replace(/-[0-9a-f]{6}$/, '');
  R.listAnimations().forEach(a => a.setName(clip(L[0])));
  for (const e of L.slice(1)) {
    const d = await io.read(path.join(out, e.archivo));
    for (const a of d.getRoot().listAnimations()) {
      const na = base.createAnimation(clip(e));
      for (const ch of a.listChannels()) {
        const s = ch.getSampler(), t = porNombre.get(ch.getTargetNode()?.getName()); if (!t || !s) continue;
        const cp = (acc) => base.createAccessor().setType(acc.getType()).setArray(acc.getArray().slice()).setBuffer(buf);
        const ns = base.createAnimationSampler().setInput(cp(s.getInput())).setOutput(cp(s.getOutput())).setInterpolation(s.getInterpolation());
        na.addSampler(ns).addChannel(base.createAnimationChannel().setTargetNode(t).setTargetPath(ch.getTargetPath()).setSampler(ns));
      }
    }
  }
  const dst = path.join(out, 'animaciones', nom + '-animaciones.glb'); await io.write(dst, base);
  cat.push({ tipo: 'animaciones', archivo: path.relative(out, dst), de: L.map(e => e.de), juntas: L.length, ...(await mira(dst)), juego: juego ? [juego] : undefined });
}
const porTipo = {}; for (const e of cat) { porTipo[e.tipo] ||= { n: 0, mb: 0 }; porTipo[e.tipo].n++; porTipo[e.tipo].mb = +(porTipo[e.tipo].mb + (e.mb || 0)).toFixed(1); }
fs.writeFileSync(path.join(out, 'catalogo.json'), JSON.stringify({ exportado: new Date().toISOString().slice(0, 10), fuentes: fuentes.map(d => d.startsWith('/') ? '(carpeta de archivos subidos)' : d), resumen: porTipo, archivos: cat }, null, 1));
console.log(Object.entries(porTipo).map(([k, v]) => `${k} ${v.n}`).join(' · '), '→', out, `· emparejados con el juego: ${cat.filter(e => e.juego).length}`);
