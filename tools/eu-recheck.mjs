// Repasa una lista de textos con el traductor actual (incluidas las plantillas) y deja los que siguen en castellano.
// Uso: node tools/eu-recheck.mjs entrada.json salida.json   (servidor en 5173)
import { chromium } from 'playwright-core'; import { readFileSync, writeFileSync } from 'fs';
const [,, inp, outp] = process.argv; const L = JSON.parse(readFileSync(inp, 'utf8'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(); await p.addInitScript(() => localStorage.setItem('mendimendiz-lang', 'eu'));
await p.goto('http://127.0.0.1:5173/?eufaltan', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
const r = await p.evaluate(async (L) => { const { tr } = await import('/src/i18n.js'); window.__euMiss.clear(); for (const s of L) tr(s); return [...window.__euMiss]; }, L);
const ES=/\b(de|del|la|las|el|los|y|en|con|para|por|que|un|una|se|su|sus|al|es|son|lo|muy|más|tu|tus|te|no|qué|cómo|hay|ya|pero|como)\b/i;
const out = process.env.ALL ? r : r.filter(s => /[a-záéíóúñ]{2}/i.test(s) && (ES.test(s) || /[ñ¿¡]|ción\b/i.test(s)));
writeFileSync(outp, JSON.stringify(out, null, 1)); console.log(L.length, '→', out.length, out.join(' ').split(/\s+/).length, 'palabras'); await b.close();
