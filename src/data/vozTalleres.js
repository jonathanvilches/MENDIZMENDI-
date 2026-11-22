// La voz de los talleres de los oficios (game/talleres.js y ui/tallerPaso.js): cada tarjeta del maestro (la presentación
// del oficio, cada herramienta y cada paso que se explica) con su audio. El autor, 22 nov 2026: «Quería los talleres».
// Los audios, en public/talleres/voz/<oficio>-<clave>.mp3 (claves: intro, h0, h1… las herramientas y p0, p1… los pasos;
// los pasos de pregunta no tienen tarjeta y no llevan voz). Un oficio suena solo cuando está en CON_VOZ (sus audios ya
// grabados); el texto que se graba es exactamente el de guionTaller, el mismo que se lee en la tarjeta. Solo en castellano.
import { OFICIOS } from './oficios.js';

export const CON_VOZ = new Set([]);
export const vozTaller = (kind, key) => (CON_VOZ.has(kind) ? `./talleres/voz/${kind}-${key}.mp3` : null);
export function guionTaller(kind) {
  const of = OFICIOS[kind]; if (!of) return [];
  return [{ key: 'intro', text: of.intro }, ...of.tools.map(([es, , what], k) => ({ key: 'h' + k, text: `${es}: ${what}.` })),
    ...of.steps.map((s, i) => (s.game === 'choice' ? null : { key: 'p' + i, text: s.text })).filter(Boolean)];
}
