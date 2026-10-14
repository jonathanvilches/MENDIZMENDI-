# Retoques de la cara en la vista frontal (2048 px): cejas finas y arqueadas en lugar de las gruesas, raya y pestañas en
# el párpado de arriba y un poco de color en el labio. Escribe cara-nueva.png (color) y cara-mascara.png (dónde cambia).
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
d = sys.argv[1]
src = Image.open(f'{d}/cara-color.png').convert('RGB'); A = np.asarray(src).astype(np.float32); N = A.shape[0]
dark = (A[..., 0] < 120) & (A[..., 1] < 80) & (A[..., 2] < 70)
# 1. máscara de las cejas viejas: en cada columna, el tramo oscuro que cae en la franja de la ceja y no baja del pelo
old = np.zeros(dark.shape, bool)
for x0, x1 in ((575, 834), (1162, 1472)):
    for x in range(x0, x1):
        col = dark[900:1180, x]; y = 0
        while y < 280:
            if col[y]:
                s = y
                while y < 280 and col[y]: y += 1
                if s > 8 and y + 900 > 990: old[900 + s:900 + y, x] = True
            y += 1
m = Image.fromarray(old.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(4))
M_old = np.asarray(m).astype(np.float32) / 255
# 2. piel debajo: la media de la piel de alrededor (sin pelo ni ojos), por convolución normalizada
skin = (~dark) & (A.sum(-1) > 450) & (M_old < 0.05)
w = skin.astype(np.float32)
def caja(a, r, ax):
    c = np.cumsum(np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(2)], mode='edge'), axis=ax)
    return (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
def blur(a, r):   # (tres pasadas de caja en cada eje: casi una gaussiana)
    k = max(1, int(r * 0.58)); a = a.astype(np.float32)
    for _ in range(3): a = caja(caja(a, k, 0), k, 1)
    return a
def media(r):
    num = np.stack([blur((A[..., c] * w).astype(np.float32), r) for c in range(3)], -1); den = blur(w, r)[..., None]
    return num / np.maximum(den, 1e-6), den
f1, d1 = media(24); f2, d2 = media(90)   # (cerca, la piel de al lado; en medio de la ceja vieja, la de más lejos)
k = np.clip(d1 / 0.35, 0, 1); fill = f1 * k + f2 * (1 - k)
B = A * (1 - M_old[..., None]) + fill * M_old[..., None]
# 3. cejas nuevas: trazo que adelgaza hacia la cola, dibujado a 4x y reducido (bordes suaves)
browc = np.median(A[old], axis=0) if old.any() else np.array([70, 38, 28.])
browc = np.array([64, 27, 12.])   # (castaño del pelo, algo más claro que él: con la luz del juego, marrón y no negro)
S4 = 4; lay = Image.new('L', (N * S4, N * S4), 0); dr = ImageDraw.Draw(lay)
def trazo(pts, w0, w1):
    import math
    P = []
    for i in range(len(pts) - 1):
        for t in np.linspace(0, 1, 24, endpoint=False):
            P.append(((1 - t) * pts[i][0] + t * pts[i + 1][0], (1 - t) * pts[i][1] + t * pts[i + 1][1]))
    P.append(pts[-1])
    for i, (x, y) in enumerate(P):
        k = i / (len(P) - 1); r = (w0 + (w1 - w0) * (k ** 1.3)) / 2 * S4
        dr.ellipse((x * S4 - r, y * S4 - r, x * S4 + r, y * S4 + r), fill=255)
trazo([(830, 1008), (792, 993), (748, 987), (702, 995), (658, 1016), (622, 1047), (600, 1078)], 40, 11)
trazo([(1180, 1007), (1222, 991), (1268, 985), (1314, 992), (1358, 1010), (1398, 1037), (1430, 1068), (1452, 1096)], 40, 11)
brow = np.asarray(lay.resize((N, N), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.6)), np.float32) / 255 * 0.92
B = B * (1 - brow[..., None]) + browc * brow[..., None]
# 4. raya del párpado y pestañas: sobre el borde de arriba del blanco del ojo, más gruesa hacia fuera, con un rabillo
lay = Image.new('L', (N * S4, N * S4), 0); dr = ImageDraw.Draw(lay)
white = (A[..., 0] > 185) & (A[..., 1] > 185) & (A[..., 2] > 185) & (np.abs(A[..., 0] - A[..., 2]) < 30)
for x0, x1, fuera in ((612, 852, -1), (1186, 1440, 1)):
    tops = []
    for x in range(x0, x1, 4):
        ys = np.where(white[1150:1330, x])[0]
        if len(ys): tops.append((x, ys.min() + 1150))
    tops.sort(key=lambda p: p[0] * fuera)               # de dentro (nariz) a fuera
    n = len(tops)
    for i, (x, y) in enumerate(tops):
        k = i / (n - 1); r = (5 + 11 * k ** 1.6) / 2 * S4
        dr.ellipse((x * S4 - r, (y - 7 - k * 3) * S4 - r, x * S4 + r, (y - 7 - k * 3) * S4 + r), fill=255)
    (xo, yo) = tops[-1]
    trazo([(xo, yo - 10), (xo + fuera * 16, yo - 24), (xo + fuera * 30, yo - 40)], 15, 4)          # rabillo
    for j, kk in enumerate((0.62, 0.78, 0.92)):                                                    # tres pestañas
        x, y = tops[int(kk * (n - 1))]
        trazo([(x, y - 12), (x + fuera * 9, y - 26), (x + fuera * 20, y - 36)], 8, 3)
lash = np.asarray(lay.resize((N, N), Image.LANCZOS), np.float32) / 255
B = B * (1 - lash[..., None]) + np.array([38, 22, 20.]) * lash[..., None]
# 5. labio: un rosa suave debajo de la sonrisa
yy, xx = np.mgrid[0:N, 0:N]
lip = np.exp(-(((xx - 1006) / 82.0) ** 2 + ((yy - 1688) / 17.0) ** 2) * 1.6) * 0.32
B = B * (1 - lip[..., None]) + np.array([214, 104, 118.]) * lip[..., None]
Image.fromarray((M_old * 255).astype(np.uint8)).save(f'{d}/cara-cejas-viejas.png')
mask = np.clip(np.maximum.reduce([M_old, brow, lash, lip * 3]), 0, 1)
Image.fromarray(np.clip(B, 0, 255).astype(np.uint8)).save(f'{d}/cara-nueva.png')
Image.fromarray((mask * 255).astype(np.uint8)).save(f'{d}/cara-mascara.png')
Image.fromarray(np.clip(B, 0, 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(f'{d}/cara-nueva-1k.png')
print('cejas viejas', int(old.sum()), 'px; color ceja', browc.round())
