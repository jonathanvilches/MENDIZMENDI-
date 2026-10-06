# Acabado de portada (aire de videojuego) para las fotos de tools/comarcakey.mjs: más contraste y color, luz dorada de
# atardecer con brillo en lo claro (bloom), un halo de sol, viñeta y nitidez. Guarda la grande (1280×720) y la pequeña
# de las tarjetas (480×270) en src/assets/portadas.
# Uso: python3 tools/comarcakey.py [comarca …]
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = '/tmp/comarcakey', 'src/assets/portadas'

def finish(im):
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    H, W = a.shape[:2]
    # color: saturación y una curva en S suave (sombras más hondas, luces más vivas)
    l = a.mean(2, keepdims=True)
    a = l + (a - l) * 1.28
    a = np.clip(a, 0, 1)
    a = a + 0.18 * a * (1 - a) * (2 * a - 1) * 2.2
    # luces cálidas y sombras algo frías (como en las portadas de los juegos)
    l = a.mean(2, keepdims=True)
    warm = np.array([1.06, 1.0, 0.9], np.float32); cool = np.array([0.92, 0.97, 1.08], np.float32)
    a = a * (cool + (warm - cool) * np.clip(l * 1.4 - 0.15, 0, 1))
    # bloom: lo más claro, difuminado y sumado en pantalla
    bright = np.clip((a - 0.62) / 0.38, 0, 1) * a
    b = np.asarray(Image.fromarray((bright * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(W / 60)), np.float32) / 255
    a = 1 - (1 - a) * (1 - b * 0.55)
    # halo de sol arriba (luz dorada que entra por el horizonte)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx, sy = W * 0.78, H * 0.02
    r = np.hypot((xx - sx) / W, (yy - sy) / H * 0.9)
    glow = np.exp(-(r / 0.42) ** 2)[..., None] * np.array([1.0, 0.72, 0.38], np.float32) * 0.42
    a = 1 - (1 - a) * (1 - glow)
    # viñeta
    v = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.55) / (H * 0.62))
    a = a * (1 - 0.42 * np.clip(v - 0.55, 0, 1) ** 1.4)[..., None]
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return out.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))

names = sys.argv[1:] or [os.path.basename(f)[:-4] for f in sorted(glob.glob(SRC + '/*.png'))]
for n in names:
    im = finish(Image.open(f'{SRC}/{n}.png'))
    big = im.resize((1280, 720), Image.LANCZOS); big.save(f'{OUT}/{n}.webp', 'WEBP', quality=72, method=6)
    im.resize((480, 270), Image.LANCZOS).save(f'{OUT}/{n}-s.webp', 'WEBP', quality=74, method=6)
    print(n, os.path.getsize(f'{OUT}/{n}.webp') // 1024, 'KB', os.path.getsize(f'{OUT}/{n}-s.webp') // 1024, 'KB')
