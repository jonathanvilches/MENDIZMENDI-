// Las piezas del pueblo que un campeonato no necesita (runtime.load con soloFronton, desde main.js al elegir un
// campeonato de pelota): en lugar del terreno, el agua, los árboles, los animales, el humo de las chimeneas y las
// farolas, unas vacías con lo mismo que se les pide cada imagen. En el campeonato solo se carga el frontón: el pueblo
// entero, levantado para luego recortarlo, era lo que hacía perder la imagen al iPhone al entrar (Elizondo y Tafalla,
// octubre de 2026)
const nada = () => { };
export const vacio = {
  terrain: () => ({ update: nada, outer: null, lodDist: 0, dispose: nada }),
  water: () => ({ update: nada, dispose: nada }),
  nature: () => ({ update: nada, partido: nada, campeonato: nada, group: { visible: false }, flowers: null, bosqueLejos: [], fijo: true, sinLejos: true, shadowDist: 0, lodDist: 0, dispose: nada }),
  fauna: () => ({ animals: [], wild: [], vultures: [], dog: null, bfMesh: null, visDist: 0, wet: 0, farView: false, update: nada, add: () => null, observables: () => [], dispose: nada }),
  smoke: () => ({ update: nada, dispose: nada }),
  lights: () => ({ update: nada, lampK: 0, dispose: nada }),
};
