// Los vídeos de la isla de cada comarca en el mapa del inicio (public/videos/islas/<comarca>.mp4): la tierra se resquebraja
// con polvo y piedras, se desprende y sube hasta ser la isla flotante; debajo queda el cráter de tierra oscura con su lago,
// las cascadas caen y el cielo pasa a azul. Hechos en Higgsfield (MiniMax H3 Max) con el primer y el último fotograma sacados
// del propio mapa (tools/islas/fotogramas.mjs; ARQUITECTURA.md, «Vídeo de la isla»), así que empiezan y acaban como el 3D. Cada uno lleva la cámara con que se sacaron sus fotogramas (x, z, d,
// yaw, pitch: la del mapa a 1280 × 720) y su proporción (ar): el vídeo sale algo recortado de lado (1,75 en vez de 16:9).
// (el de Pamplona, en pausa desde el 14 de noviembre de 2026: se hizo con el mapa de antes, y desde entonces han cambiado el
// suelo de alrededor, el cielo y, sobre todo, la forma de la isla, que ya no tiene los bordes rectos. Con él puesto, el
// fundido al 3D enseñaba dos islas distintas. Se guarda aquí, con su cámara, para volver a hacerlo cuando el autor dé el
// visto bueno al aspecto nuevo; el archivo sigue en public/videos/islas)
export const VIDEOS_ISLA = {};
export const VIDEOS_ISLA_EN_PAUSA = {
  pamplona: { x: -3.425, z: -13.35, d: 27.217, yaw: 0, pitch: 0.3, ar: 1.75 },
};
