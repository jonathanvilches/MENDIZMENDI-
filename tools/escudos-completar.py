# Completa la punta de los escudos con acabado que llegan cortados por abajo (src/assets/escudos/heraldica).
# Los 24 que llevan corona o yelmo encima tienen el escudo más abajo que los demás y su punta se sale del cuadro de
# 1024 px: así venían ya en el ZIP del autor. Todos son la misma plantilla de escudo, así que la forma de la punta se
# toma de uno entero (se mide cuánto está desplazado comparando los dos perfiles) y lo que hay dentro se continúa
# siguiendo la curva: cada punto que falta toma el color del punto que está a la misma distancia del borde, del mismo
# lado, en la fila simétrica respecto al corte (así siguen el marco, el bisel y la bordura, y el campo en el centro).
# Luego todo (timbre y escudo) se encaja en el cuadro de 1024 con aire arriba y abajo, y se hace el de 512.
# Los originales se guardan en tools/escudos-cortados/ (no se borran).
# Uso: python3 -I tools/escudos-completar.py <carpeta heraldica> <carpeta de copia>
import os, sys, shutil
import numpy as np
from PIL import Image

root, backup = sys.argv[1], sys.argv[2]
big, small = os.path.join(root, '1024'), os.path.join(root, '512')
TPL = 'aezkoa.webp'   # un escudo entero, sin timbre: su silueta es la plantilla
T = np.array(Image.open(os.path.join(big, TPL)).convert('RGBA')).astype(np.float32)
Ta = T[:, :, 3]
H = W = 1024

def edges(alpha, y):
    xs = np.where(alpha[y] > 128)[0]
    return (xs[0], xs[-1]) if len(xs) else (None, None)

def profile(alpha):
    out = np.zeros(alpha.shape[0])
    for y in range(alpha.shape[0]):
        l, r = edges(alpha, y)
        out[y] = 0 if l is None else r - l
    return out

pT = profile(Ta)
bottomT = int(np.where(pT > 0)[0][-1])
done = 0
os.makedirs(os.path.join(backup, '1024'), exist_ok=True); os.makedirs(os.path.join(backup, '512'), exist_ok=True)
for f in sorted(os.listdir(big)):
    if not f.endswith('.webp'): continue
    C = np.array(Image.open(os.path.join(big, f)).convert('RGBA')).astype(np.float32)
    Ca = C[:, :, 3]
    if not (Ca[H - 1] > 24).any(): continue          # (entero: no se toca)
    for s in ('1024', '512'):
        dst = os.path.join(backup, s, f)
        if not os.path.exists(dst): shutil.copy2(os.path.join(root, s, f), dst)
    pC = profile(Ca)
    # desplazamiento de este escudo respecto a la plantilla (el que mejor casa los perfiles en la parte visible de abajo)
    ys = np.arange(700, H)
    d = min(range(0, 400), key=lambda k: np.abs(pC[ys] - pT[ys - k]).mean() if (ys - k).min() >= 0 else 1e9)
    newH = bottomT + d + 40                              # (hasta la punta, con aire para la sombra)
    E = np.zeros((newH, W, 4), np.float32); E[:H] = C
    cut = H - 1
    for y in range(H, newH):
        ty = y - d                                        # la fila de la plantilla que le corresponde
        if ty >= H: break
        lt, rt = edges(Ta, ty)
        sy = max(0, 2 * cut - y)                          # la fila simétrica respecto al corte
        ls, rs = edges(Ca, sy)
        row = np.zeros((W, 4), np.float32)
        a = Ta[ty]
        for x in np.where(a > 0)[0]:
            if lt is not None and lt <= x <= rt and ls is not None:
                dl, dr = x - lt, rt - x
                xs = ls + dl if dl <= dr else rs - dr
                xs = int(min(max(xs, 0), W - 1))
                px = C[sy, xs].copy(); px[3] = a[x] if a[x] < 250 else C[sy, xs, 3]
                row[x] = px
            else:
                row[x] = T[ty, x]                         # (el borde suave y la sombra, de la plantilla)
        E[y] = row
    # encajar timbre y escudo en el cuadro de 1024, centrado y con el mismo aire de arriba y abajo
    ea = E[:, :, 3]
    rows = np.where((ea > 24).any(axis=1))[0]; cols = np.where((ea > 24).any(axis=0))[0]
    y0, y1, x0, x1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    crop = Image.fromarray(np.clip(E[y0:y1, x0:x1], 0, 255).astype(np.uint8), 'RGBA')
    m = 28
    k = min((H - 2 * m) / crop.height, (W - 2 * m) / crop.width, 1.0)
    crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(crop, ((W - crop.width) // 2, (H - crop.height) // 2), crop)
    out.save(os.path.join(big, f), 'WEBP', quality=92, method=6)
    # (el de 512 va también en el archivo único: con la calidad justa para que pese como el original)
    out.resize((512, 512), Image.LANCZOS).save(os.path.join(small, f), 'WEBP', quality=84, method=6, alpha_quality=90)
    done += 1
    print(f, 'desplazado', d, 'px; faltaban', bottomT + d - (H - 1), 'px; escala', round(k, 3))
print('completados', done)
