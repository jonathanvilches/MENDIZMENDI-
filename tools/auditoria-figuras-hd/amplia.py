# Amplía al doble los fotogramas RGBA crudos de una figura animada con realesr-animevideov3 (x4 y luego reducida a x2,
# más nítido que ampliar a x2 directamente). El color y la transparencia pasan los dos por la red; los fotogramas
# repetidos (la animación va de ida y vuelta) se amplían una sola vez.
import sys, json, hashlib, numpy as np, onnxruntime as ort
inp, out, w, h, n, model = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
raw = np.fromfile(inp, np.uint8).reshape(n, h, w, 4)
so = ort.SessionOptions(); so.intra_op_num_threads = 4
s = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
def red(x):  # x: (3, h, w) float 0..1 -> (3, 4h, 4w)
    return s.run(None, {'input': np.ascontiguousarray(x[None], np.float32)})[0][0]
def baja(y):  # (c, 4h, 4w) -> (c, 2h, 2w), media de 2x2
    c, H, W = y.shape; return y.reshape(c, H // 2, 2, W // 2, 2).mean((2, 4))
def sangra(c, a, pasos=12):
    c = c.copy(); m = (a > 0.6).astype(np.float32)
    for _ in range(pasos):
        acc = np.zeros_like(c); w = np.zeros_like(m)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            acc += np.roll(np.roll(c * m[..., None], dy, 0), dx, 1); w += np.roll(np.roll(m, dy, 0), dx, 1)
        nuevo = (m == 0) & (w > 0)
        c[nuevo] = acc[nuevo] / w[nuevo][:, None]; m = np.maximum(m, nuevo.astype(np.float32))
    if (m == 0).any(): c[m == 0] = c[m > 0].mean(0)
    return c
hecho = {}; res = np.zeros((n, h * 2, w * 2, 4), np.uint8)
for i in range(n):
    k = hashlib.md5(raw[i].tobytes()).hexdigest()
    if k not in hecho:
        f = raw[i].astype(np.float32) / 255; a = f[..., 3]
        # (el color del borde, extendido hacia fuera por donde es transparente: así la red no mezcla el fondo con la
        # figura y el contorno no sale oscuro ni claro; la transparencia, aparte)
        rgb = sangra(f[..., :3], a)
        y = np.clip(baja(red(rgb.transpose(2, 0, 1))), 0, 1)
        ya = np.clip(baja(red(np.repeat(a[None], 3, 0))).mean(0), 0, 1)
        col = y.transpose(1, 2, 0); col = np.where(ya[..., None] < 0.02, 0, col)
        hecho[k] = (np.dstack([col, ya[..., None]]) * 255 + 0.5).astype(np.uint8)
        print(f'{i + 1}/{n}', flush=True)
    res[i] = hecho[k]
res.tofile(out); print(json.dumps({'unicos': len(hecho), 'n': n}))
