// Tu propio personaje: eliges el cuerpo, la piel, el pelo, la ropa y los complementos. Se guarda en el perfil (P.mio)
// y se usa en todo el juego como un avatar más (id 'mio'): en los pueblos, la pelota, el fútbol y el encierro.

// cuerpos (los seis personajes nuevos); female: lleva falda por defecto y cuenta como chica en los minijuegos
export const MIO_BASES = [
  { id: 'Rogue_Hooded', name: 'Chico' }, { id: 'Rogue', name: 'Chica' }, { id: 'Ranger', name: 'Joven' },
  { id: 'Mage', name: 'Moza', female: true }, { id: 'Knight', name: 'Mozo' }, { id: 'Barbarian', name: 'Fuerte' },
];
export const MIO_FEMALE = new Set(['Rogue', 'Mage']);
export const SKINS = ['#f6d7bd', '#efc4a2', '#e2ad86', '#cf9468', '#b07a52', '#8d5a3a', '#6a4028'];
export const HAIRS = ['#1d1612', '#3a2418', '#6b4a2e', '#9a5a2a', '#c9772f', '#e2c46a', '#dcd7cf', '#2a3a5a'];
export const CLOTH = ['#f6f3ec', '#e8e0cc', '#c8102e', '#d42f2f', '#e8743a', '#f2c230', '#3ca05a', '#2b5a3a', '#3a8fd6', '#1e3a8a', '#8a5ad6', '#6a2854', '#8a6a44', '#5c4e40', '#3a3530', '#1d1d22'];
export const HATS = [
  { id: 'none', name: 'Nada' }, { id: 'beret', name: 'Txapela' }, { id: 'wool', name: 'Gorro de lana' },
  { id: 'straw', name: 'Sombrero de paja' }, { id: 'cachirulo', name: 'Pañuelo' },
];

/** Personaje de partida (o al azar con rnd). */
export function defaultMio(rnd) {
  const r = rnd || (() => 0), pick = (a, d) => rnd ? a[Math.floor(r() * a.length)] : d;
  const base = pick(MIO_BASES, MIO_BASES[0]).id;
  return {
    base, skin: pick(SKINS, SKINS[1]), hair: pick(HAIRS, HAIRS[1]), longHair: rnd ? r() < 0.4 : false,
    hat: pick(HATS, HATS[1]).id, hatColor: pick(['#1d1d22', '#c8102e', '#2b5a3a', '#1e3a8a'], '#1d1d22'),
    shirt: pick(CLOTH, '#f6f3ec'), pants: pick(CLOTH, '#3a3530'), shoes: pick(['#4a2f1c', '#1d1d22', '#efe4cc', '#6b3f24'], '#4a2f1c'), accent: pick(CLOTH, '#c8102e'),
    scarf: rnd ? (r() < 0.6 ? pick(CLOTH) : null) : '#c8102e', sash: rnd ? (r() < 0.5 ? pick(CLOTH) : null) : '#c8102e',
    skirt: MIO_FEMALE.has(base) && (!rnd || r() < 0.6) ? pick(CLOTH, '#1e3a8a') : null, apron: false, fur: false,
  };
}

/** Traje (para applyOutfit) a partir de lo que has elegido. */
export function mioOutfit(c) {
  const key = JSON.stringify(c), h = [...key].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);   // huella de todo lo elegido (para la caché de texturas)
  const O = { id: 'mio-' + h.toString(36) + key.length, shirt: c.shirt, pants: c.pants, shoes: c.shoes, accent: c.accent, skin: c.skin, hair: c.hair, hood: c.hair };
  if (c.longHair) { O.hairLong = c.hair; O.hairLen = 1.1; }
  if (c.hat === 'beret') O.beret = c.hatColor;
  else if (c.hat === 'wool') O.wool = c.hatColor;
  else if (c.hat === 'straw') O.straw = '#e2c27a';
  else if (c.hat === 'cachirulo') O.cachirulo = c.hatColor;
  if (c.scarf) O.scarf = c.scarf;
  if (c.sash) O.sash = c.sash;
  if (c.skirt) { O.skirt = c.skirt; if (c.apron) O.apron = '#f4f1ea'; }
  if (c.fur) { O.fur = '#d8c8a2'; O.furLen = 0.42; O.furW = 0.86; }
  return O;
}
