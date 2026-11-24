// El sonido, los vídeos, las letras y las láminas del juego, listos para otro motor (ver PORTAR.md):
//   exportar/sonido/   cada .mp3 de src/assets y public, con la misma ruta (voces, música, efectos, ambientes)
//   exportar/video/    cada .mp4 (portadas animadas de las comarcas, el frontón, las islas…)
//   exportar/fuentes/  las letras del juego en .ttf, que es lo que lee Unity (TextMeshPro): se sacan de los .woff2 de los
//                      @font-face de los .css (Barlow, Barlow Condensed, Nunito, Lilita One; licencia OFL)
//   exportar/web/      las láminas interactivas (public/anatomia) tal cual, con sus imágenes
//   exportar/medios.json  qué hay, cuánto ocupa y de dónde sale cada cosa
// Las letras se convierten con fontTools de Python (pip install fonttools brotli); si no está, se copian los .woff2 y se avisa.
// Uso:  node tools/exportar-medios.mjs [carpeta]     (por defecto exportar)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const out = process.argv[2] || 'exportar', PY = process.env.PY || 'python3';
const anda = (d, re, L = []) => { if (!fs.existsSync(d)) return L; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) anda(p, re, L); else if (re.test(e.name)) L.push(p); } return L; };
const copia = (f, dst) => { fs.mkdirSync(path.dirname(dst), { recursive: true }); if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(f).size) fs.copyFileSync(f, dst); return fs.statSync(dst).size; };
const sitio = (f) => f.startsWith('src/assets/') ? f.slice(11) : f;   // (src/assets/voz/… → voz/…; public/videos/… se queda)
const res = { sonido: [], video: [], fuentes: [], web: [] };
for (const f of [...anda('src/assets', /\.(mp3|ogg|wav|m4a)$/i), ...anda('public', /\.(mp3|ogg|wav|m4a)$/i)]) res.sonido.push({ de: f, kb: Math.round(copia(f, path.join(out, 'sonido', sitio(f))) / 1024) });
for (const f of [...anda('src/assets', /\.(mp4|webm|mov)$/i), ...anda('public', /\.(mp4|webm|mov)$/i)]) res.video.push({ de: f, kb: Math.round(copia(f, path.join(out, 'video', sitio(f))) / 1024) });
for (const f of anda('public/anatomia', /./)) res.web.push({ de: f, kb: Math.round(copia(f, path.join(out, 'web', path.relative('public', f))) / 1024) });
// las letras: cada url(...woff2) de un @font-face, con su familia, su peso y su estilo
let hayPy = true; try { execFileSync(PY, ['-c', 'import fontTools, brotli'], { stdio: 'ignore' }); } catch (e) { hayPy = false; }
const visto = new Set();
for (const css of anda('src', /\.css$/)) {
  const txt = fs.readFileSync(css, 'utf8');
  for (const m of txt.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const b = m[1], fam = /font-family:\s*'([^']+)'/.exec(b)?.[1], u = /url\('([^']+\.woff2)'\)/.exec(b)?.[1];
    if (!fam || !u) continue;
    const src = path.normalize(path.join(path.dirname(css), u)); if (!fs.existsSync(src) || visto.has(src)) continue; visto.add(src);
    const base = path.basename(src, '.woff2'), dst = path.join(out, 'fuentes', base + (hayPy ? '.ttf' : '.woff2'));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (hayPy) execFileSync(PY, ['-c', 'import sys; from fontTools.ttLib import TTFont; f = TTFont(sys.argv[1]); f.flavor = None; f.save(sys.argv[2])', src, dst]);
    else fs.copyFileSync(src, dst);
    res.fuentes.push({ familia: fam, peso: /font-weight:\s*([^;]+);/.exec(b)?.[1].trim(), estilo: /font-style:\s*([^;]+);/.exec(b)?.[1].trim(), de: src, archivo: path.relative(out, dst), css });
  }
}
const lic = 'node_modules/@fontsource/barlow/LICENSE'; if (fs.existsSync(lic)) copia(lic, path.join(out, 'fuentes', 'LICENCIA-OFL.txt'));
const mb = (L) => +(L.reduce((n, x) => n + (x.kb || 0), 0) / 1024).toFixed(1);
fs.writeFileSync(path.join(out, 'medios.json'), JSON.stringify({ exportado: new Date().toISOString().slice(0, 10), resumen: { sonido: [res.sonido.length, mb(res.sonido) + ' MB'], video: [res.video.length, mb(res.video) + ' MB'], fuentes: res.fuentes.length, web: [res.web.length, mb(res.web) + ' MB'] }, ...res }, null, 1));
console.log(`sonido ${res.sonido.length} (${mb(res.sonido)} MB) · vídeo ${res.video.length} (${mb(res.video)} MB) · letras ${res.fuentes.length}${hayPy ? ' en .ttf' : ' en .woff2 (sin fontTools)'} · láminas ${res.web.length} → ${out}`);
