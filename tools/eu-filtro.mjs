// Filtra /tmp/eu-faltan.json: se queda con lo que de verdad está en castellano (no lo ya traducido, ni números,
// ni nombres propios sueltos). Uso: node tools/eu-filtro.mjs [salida.json]
import { readFileSync, writeFileSync } from 'fs';
const { EU_EXACT } = await import('../src/data/eu.js');
const done = new Set(Object.values(EU_EXACT).map(s => String(s).trim()));
const ES = /\b(de|del|la|las|el|los|y|en|con|para|por|que|un|una|unos|se|su|sus|al|es|son|lo|muy|más|tu|tus|te|no|sí|qué|cómo|cuando|hay|ya|pero|como|o|a)\b/i;
const d = JSON.parse(readFileSync('/tmp/eu-faltan.json', 'utf8'));
const out = d.filter(x => { const s = x.s; if (done.has(s)) return false; if (!/[a-záéíóúñ]{2}/i.test(s)) return false;
  return ES.test(s) || /[ñ¿¡]|ción\b|ciones\b|dad\b/i.test(s) || /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+$/.test(s) && /[áéíóúñ]/.test(s); });
writeFileSync(process.argv[2] || '/tmp/eu-es.json', JSON.stringify(out.map(x => x.s), null, 1));
console.log('total', d.length, '→ en castellano', out.length);
