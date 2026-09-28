// Convierte dist/index.html en el archivo del artefacto (sin doctype/html/head/body)
import fs from 'fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const links = (head.match(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g) || []).join('\n');
const styles = (head.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');
const scripts = (head.match(/<script[\s\S]*?<\/script>/g) || []).join('\n');
const out = `${title}\n<meta name="theme-color" content="#1e1830">\n${links}\n${styles}\n${body.trim()}\n${scripts}\n`;
fs.mkdirSync('artifact', { recursive: true });
fs.writeFileSync('artifact/mendimendiz.html', out);
console.log('artifact/mendimendiz.html', (out.length / 1024 / 1024).toFixed(2), 'MB');
