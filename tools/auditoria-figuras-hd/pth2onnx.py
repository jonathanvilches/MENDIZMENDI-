# Lee los pesos de realesr-animevideov3.pth (formato zip de PyTorch) sin PyTorch y con un deserializador restringido
# (solo reconstruye tensores: nada de código arbitrario), y arma la red SRVGGNetCompact en ONNX.
import sys, zipfile, pickle, numpy as np, onnx
from onnx import helper, numpy_helper, TensorProto
src, dst = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(src); pref = z.namelist()[0].split('/')[0]
DT = {'FloatStorage': np.float32, 'HalfStorage': np.float16}
def rebuild(storage, off, size, stride, *a):
    arr, = [storage]; n = int(np.prod(size)) if size else 1
    return np.lib.stride_tricks.as_strided(arr[off:], shape=size, strides=[s * arr.itemsize for s in stride]).copy() if size else arr[off:off+1].copy()
class Storage:
    def __init__(self, name): self.name = name
class U(pickle.Unpickler):
    def find_class(self, mod, name):
        if (mod, name) == ('torch._utils', '_rebuild_tensor_v2'): return rebuild
        if (mod, name) == ('collections', 'OrderedDict'): import collections; return collections.OrderedDict
        if mod == 'torch' and name in DT: return Storage(name)
        raise pickle.UnpicklingError(f'no permitido: {mod}.{name}')
    def persistent_load(self, pid):
        _, st, key, loc, numel = pid
        return np.frombuffer(z.read(f'{pref}/data/{key}'), dtype=DT[st.name])[:numel]
sd = U(z.open(f'{pref}/data.pkl')).load()
if 'params' in sd: sd = sd['params']
keys = list(sd.keys()); print(len(keys), keys[:4], keys[-3:])
nodes, inits = [], []
def T(name, a): inits.append(numpy_helper.from_array(a.astype(np.float32), name)); return name
x = 'input'; i = 0; idx = sorted({int(k.split('.')[1]) for k in keys})
cur = x
for j in idx:
    w = sd[f'body.{j}.weight']
    if w.ndim == 4:
        out = f'c{j}'; nodes.append(helper.make_node('Conv', [cur, T(f'w{j}', w), T(f'b{j}', sd[f'body.{j}.bias'])], [out], pads=[1, 1, 1, 1], kernel_shape=[3, 3])); cur = out
    else:
        out = f'p{j}'; nodes.append(helper.make_node('PRelu', [cur, T(f'a{j}', w.reshape(-1, 1, 1))], [out])); cur = out
nodes.append(helper.make_node('DepthToSpace', [cur], ['ps'], blocksize=4, mode='CRD'))
nodes.append(helper.make_node('Resize', ['input', '', T('sc', np.array([1, 1, 4, 4], np.float32))], ['up'], mode='nearest'))
nodes.append(helper.make_node('Add', ['ps', 'up'], ['output']))
g = helper.make_graph(nodes, 'srvgg', [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, None, None])], [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, None, None])], inits)
m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)]); onnx.checker.check_model(m); onnx.save(m, dst); print('ok', dst)
