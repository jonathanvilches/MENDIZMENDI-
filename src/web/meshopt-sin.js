// En el artefacto de Claude, en lugar de three/examples/jsm/libs/meshopt_decoder.module.js (vite.config.js, ARTEFACTO=1).
// Ese descompresor compila WebAssembly al cargarse, y el visor de artefactos puede no dejarlo; allí los modelos y los
// parches de las chicas van ya descomprimidos desde la compilación, así que no hace falta.
const no = () => { throw new Error('esta versión no lleva el descompresor meshopt'); };
export const MeshoptDecoder = {
  supported: false,
  ready: Promise.resolve(),
  useWorkers() {},
  decodeVertexBuffer: no, decodeIndexBuffer: no, decodeIndexSequence: no, decodeGltfBuffer: no,
  decodeGltfBufferAsync: () => Promise.reject(new Error('esta versión no lleva el descompresor meshopt')),
};
