// Une a una clase los métodos de otras: así una clase muy grande (el pueblo, game/townGame.js) se reparte en varios
// archivos por temas, y cada método sigue siendo de la clase, con su this, como si estuviera escrito en ella
export function mezcla(Clase, ...partes) {
  for (const P of partes) for (const k of Object.getOwnPropertyNames(P.prototype)) {
    if (k === 'constructor') continue;
    if (Object.prototype.hasOwnProperty.call(Clase.prototype, k)) throw new Error(`mezcla: ${k} ya está en ${Clase.name}`);
    Object.defineProperty(Clase.prototype, k, Object.getOwnPropertyDescriptor(P.prototype, k));
  }
}
