// Los vídeos de la isla de cada comarca en el mapa del inicio (public/videos/islas/<comarca>.mp4): la tierra se resquebraja
// con polvo y piedras, se desprende y sube hasta ser la isla flotante; debajo queda el cráter de tierra oscura con su lago,
// las cascadas caen y el cielo pasa a azul. Hechos en Higgsfield (MiniMax H3 Max) con el primer y el último fotograma sacados
// del propio mapa (tools/islas/fotogramas.mjs; ARQUITECTURA.md, «Vídeo de la isla»), así que empiezan y acaban como el 3D. Cada uno lleva la cámara con que se sacaron sus fotogramas (x, z, d,
// yaw, pitch: la del mapa a 1280 × 720) y su proporción (ar): el vídeo sale algo recortado de lado (1,75 en vez de 16:9).
export const VIDEOS_ISLA = {
  pamplona: { x: -3.425, z: -13.35, d: 33.085, yaw: 0, pitch: 0.3, ar: 1.75 },
};
