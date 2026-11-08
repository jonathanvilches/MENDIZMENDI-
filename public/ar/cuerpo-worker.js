// La detección del cuerpo de la pelota en casa (src/pelota/camaraCuerpo.js), fuera del hilo de la página: así el partido
// no se para mientras se mira cada imagen de la cámara. MediaPipe Tasks Vision 0.10.21 de Google (Apache 2.0): en
// vision_bundle.js, la copia tal cual de node_modules/@mediapipe/tasks-vision/vision_bundle.cjs, cargada como en un
// trabajador clásico (importScripts); el motor (wasm/) y el modelo, los mismos de public/ar.
var exports = {};
importScripts('vision_bundle.js');
var V = exports, pl = null;
onmessage = async function (e) {
  var m = e.data;
  if (m.tipo === 'inicia') {
    try {
      var fs = await V.FilesetResolver.forVisionTasks(m.wasm), del = 'GPU';
      var op = function (d) { return { baseOptions: { modelAssetPath: m.modelo, delegate: d }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 }; };
      try { pl = await V.PoseLandmarker.createFromOptions(fs, op('GPU')); } catch (x) { del = 'CPU'; pl = await V.PoseLandmarker.createFromOptions(fs, op('CPU')); }
      postMessage({ tipo: 'listo', delegado: del });
    } catch (x) { postMessage({ tipo: 'error', error: String((x && x.message) || x) }); }
  } else if (m.tipo === 'imagen') {
    // (una imagen que lleva esperando más de un cuarto de segundo ya no sirve: se salta, sin mirarla)
    if (Date.now() - m.d > 250) { try { m.img.close(); } catch (x) { /* nada */ } postMessage({ tipo: 'saltada' }); return; }
    var lms = null;
    try { var r = pl.detectForVideo(m.img, m.ts); lms = (r.landmarks && r.landmarks[0]) || null; } catch (x) { /* una imagen que no se pudo leer */ }
    try { m.img.close(); } catch (x) { /* nada */ }
    postMessage({ tipo: 'puntos', lms: lms, t: m.t });
  } else if (m.tipo === 'cierra') {
    try { if (pl) pl.close(); } catch (x) { /* nada */ }
    close();
  }
};
