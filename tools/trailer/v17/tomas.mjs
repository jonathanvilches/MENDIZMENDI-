// Las tomas nuevas del tráiler v17. El autor, del v16: «no dejas hablar bien a los vecinos». Las charlas, de frente al
// vecino (J.cara, como la de Joxemari del v11) y tan largas como su frase grabada: Maite con su «¡Kaixo! Soy Maite. ¡Ongi
// etorri a Otsagabia!» (la del v15 miraba al cartel del pueblo mientras ella hablaba) y Kike con su «¡Aupa! Soy Kike.
// ¿Juegas a pelota?», que da paso a la pelota.
import { AYUDA } from '../v8/tomas.mjs';
export { AYUDA };
const OT = 'town=otsagabia-ochagavia&q=high&skipintro=1&weather=clear';
const cara = (quien, hora, seg, frase, o = {}) => ({
  url: `?${OT}&t=${hora}`, seg, fps: 24, antes: 60, espera: 16000,
  prep: eval(`() => {
    const J = window.__j, a = J.G.npcs?.${quien}; if (!a) throw new Error('sin ${quien}'); J.limpia(); a.frozen = true; a.state = 'idle';
    J.hacia(a, ${o.lejos ?? 2.4}); J.teclas([]); J.cara(a, { d: ${o.d ?? 2.5}, s: ${o.s ?? 0.7} }); J.G.ui.hudVisible?.(true);
    J.charla(a, { habla: 0.1, para: ${seg + 1}, frases: [${JSON.stringify(frase)}] });
  }`),
});
export const TOMAS = {
  cMaite: cara('maite', 10.8, 4.2, '¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!'),
  cKike: cara('kike', 17.2, 4.0, '¡Aupa! Soy Kike. ¿Juegas a pelota?', { lejos: 3.4, d: 2.2, s: 0.6 }),
};
